import '@fontsource/cinzel/500.css';
import '@fontsource/cinzel/600.css';
import './ui/style.css';
import { COMPANIONS, SHAPES, type LessonWorld } from '@spell/shared';
import { World } from './engine/world';
import { Runtime, type TutorialStep } from './engine/runtime';
import { Hud } from './ui/hud';
import { SpellBook } from './ui/spellbook';
import { Screens } from './ui/screens';
import { CompanionView, CompanionPicker } from './ui/companion';
import { Speaker, sfx } from './voice/speaker';
import { Asr } from './voice/asr';
import { Listener } from './voice/listen';
import { Bgm, trackFor } from './voice/bgm';
import { Updates } from './update';
import { initDirect } from './native/direct';
import { api } from './api';
import { store } from './state/save';
import { preloadAssets, prepareAssets, assetIds } from './render/assets';
import hubData from '../../../content/island.json';

const worldMods = import.meta.glob('../../../content/worlds/*.json', { eager: true, import: 'default' }) as Record<string, LessonWorld>;
const WORLDS: LessonWorld[] = Object.values(worldMods).sort((a, b) => a.order - b.order);
const HUB = hubData as unknown as LessonWorld & { tutorial: TutorialStep[] };
const PORTAL_COLORS = ['#ffd36b', '#ff9a5a', '#7fc8ff', '#9fe28a', '#c9a0ff', '#ff8fc4', '#6fe0d0', '#ffb347', '#8fffa8', '#b0c4ff'];

store.load();
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const world = new World(canvas, document.getElementById('labels')!);
const speaker = new Speaker();
const bgm = new Bgm();
const updates = new Updates();
const asr = new Asr();
asr.context = () => runtime?.asrContext() || [];
const screens = new Screens(document.getElementById('screens')!);
let runtime: Runtime | null = null;
let picker: CompanionPicker | null = null;
let micActive = false;
let currentId: string | null = null;

const hud = new Hud(document.getElementById('hud')!, {
  onMicDown: () => micDown(),
  onMicUp: () => micUp(),
  onMicTap: () => listener.tap(),
  onText: (t) => route(t),
  onCard: (t) => { speaker.say('wizard', t); },
  onButton: (b) => {
    if (b === 'home') goWorld('island');
    if (b === 'book') { if (hud.book?.isOpen) hud.book.close(); else hud.book?.open(); }
    if (b === 'map') {
      const all = () => screens.map(WORLDS, currentId, (id) => goWorld(id));
      if (runtime && currentId && currentId !== 'island' && (runtime.data as any).zones?.length) screens.worldMap(runtime.mapInfo(), all); else all();
    }
    if (b === 'labels') { world.alwaysLabels = !world.alwaysLabels; hud.toast(world.alwaysLabels ? '显示所有单词标签' : '只显示附近的标签', '🔤'); }
    if (b === 'companion') { store.data.settings.companion = !store.data.settings.companion; store.save(); applySettings(); }
    if (b === 'settings') screens.settings(api.health, { onChange: () => applySettings(), onCompanion: () => pickCompanion(() => applySettings()), onReset: () => location.reload() }, { view: updates.view, check: () => updates.check() });
  },
});
hud.show(false);
hud.book = new SpellBook(hud.root, (t) => speaker.say('narrator', t));

const companion = new CompanionView(document.getElementById('hud')!, speaker, {
  onHelp: () => runtime?.coach.help(),
  onClose: () => { store.data.settings.companion = false; store.save(); applySettings(); hud.toast('小伙伴去休息啦，点右上角的小伙伴按钮可以叫它回来', '🐾'); },
});

const listener = new Listener(asr, speaker, {
  allowed: () => !!runtime && !screens.open,
  onState: (st) => {
    companion.setListening(st === 'capturing');
    hud.setMic(st === 'armed' ? 'armed' : st === 'capturing' ? 'listening' : st === 'finishing' ? 'thinking' : st === 'waiting' ? 'hush' : 'idle');
  },
  onPartial: (t) => hud.showChild(t),
  onText: (t) => route(t),
});
(function meter() { bgm.tick(listener.state === 'capturing' || listener.state === 'finishing' || micActive ? 'mic' : speaker.speaking ? 'talk' : listener.state === 'armed' ? 'turn' : 'idle'); hud.setLevelMeter(listener.state === 'armed' || listener.state === 'capturing' || micActive ? asr.mic.level : 0, speaker.speaking ? speaker.level() : 0); requestAnimationFrame(meter); })();

function applySettings() {
  const s = store.data.settings;
  hud.textInput(s.textInput);
  const hf = s.autoMic && listener.available && asr.serverAsr;
  hud.handsFree = hf;
  listener.enabled = hf;
  hud.setMic('idle');
  speaker.rate = s.voiceRate;
  bgm.enabled = s.bgm !== false;
  if (store.data.companion) companion.setCompanion(store.data.companion);
  companion.show(s.companion && !!runtime && !!store.data.companion);
  hud.setCrystals(store.data.crystals, store.data.badges.length);
}

// ------------------------------------------------------------------ voice input (push-to-talk fallback)
async function micDown() {
  if (micActive) return;
  if (speaker.speaking) { hud.toast('先听他说完，马上就轮到你啦', '👂'); return; }
  micActive = true;
  hud.setMic('listening');
  hud.showChild('');
  sfx('tick');
  const mode = await asr.begin((partial) => hud.showChild(partial));
  if (mode === 'none') { micActive = false; hud.setMic('idle'); hud.toast('麦克风不可用，可以在设置里打开打字输入', '🎙️'); hud.textInput(true); }
}
async function micUp() {
  if (!micActive) return;
  micActive = false;
  hud.setMic('thinking');
  const text = await asr.end();
  route(text);
}

function route(text: string) {
  if (picker && picker.tryVoice(text)) return;
  if (runtime) runtime.handleUtterance(text);
}

// ------------------------------------------------------------------ worlds
function worldById(id: string): LessonWorld | null { return id === 'island' ? HUB : WORLDS.find((w) => w.id === id) || null; }

/** the 3D models a world uses (things, people, scenery) */
function modelsOf(w: LessonWorld): string[] {
  return [...w.things, ...w.npcs].map((t) => t.model).concat(((w as any).decor || []).filter((d: any) => d.k === 'model').map((d: any) => d.m), ['lamp_post', 'round_tree', 'pine', 'rock', 'cottage', 'cottage_blue', 'portal_arch', 'treasure_chest', 'flowers', 'fruit_tree']);
}

async function goWorld(id: string, transition = true) {
  const w = worldById(id);
  if (!w) return;
  screens.clear();
  const load = async () => {
    await prepareAssets(modelsOf(w));
    runtime?.dispose();
    const isHub = id === 'island';
    companion.done(0);
    bgm.play(trackFor(id, w.scene));
    hud.setWorldTitle(w.title, w.titleZh, isHub ? '魔法塔与十道传送门' : w.grade);
    const firstVisit = !(store.data.done[id] || []).length;
    runtime = new Runtime(w, world, hud, speaker, companion, {
      portals: isHub ? WORLDS.map((x, i) => ({ id: x.id, title: x.title, titleZh: x.titleZh, grade: x.grade, color: PORTAL_COLORS[i % PORTAL_COLORS.length] })) : undefined,
      onEnter: (wid) => goWorld(wid),
      onHome: () => goWorld('island'),
      onWorldDone: (lw) => { if (!store.data.badges.includes(lw.id)) { store.data.badges.push(lw.id); store.save(); applySettings(); setTimeout(() => screens.badge(lw, () => {}), 1800); } },
      tutorial: isHub && !store.data.tutorialDone ? HUB.tutorial : undefined,
    });
    runtime.childTurn = () => (listener.enabled ? listener.state === 'armed' : !speaker.speaking && !micActive);
    currentId = id;
    hud.setButtons(isHub ? ['book', 'map', 'labels', 'companion', 'settings'] : ['home', 'book', 'map', 'labels', 'companion', 'settings']);
    applySettings();
    // compile every shader of the new world now, so the first seconds don't stutter
    await world.renderer.compileAsync(world.scene, world.camera).catch(() => {});
    return runtime.start(firstVisit);
  };
  if (transition && currentId !== null) {
    bgm.fadeOut();
    const fx = screens.portal();
    await fx.atWhite;
    const started = load();
    await new Promise((r) => setTimeout(r, 350)); // let the first frame of the new world render behind the white
    fx.reveal();
    setTimeout(() => screens.location(w.title, w.titleZh, id === 'island' ? '魔法塔与十道传送门' : w.grade), 700);
    await started;
  } else {
    const started = load();
    setTimeout(() => screens.location(w.title, w.titleZh, id === 'island' ? '魔法塔与十道传送门' : w.grade), 900);
    await started;
  }
}

function pickCompanion(then: () => void) {
  picker = new CompanionPicker(document.getElementById('screens')!, (id) => {
    picker = null;
    store.data.companion = id;
    store.save();
    companion.setCompanion(id);
    then();
  });
  const say = () => speaker.say('wizard', 'Hi! Who will come with us? Pick a friend!');
  say();
}

async function boot() {
  const loading = document.createElement('div');
  loading.id = 'boot-loading';
  loading.innerHTML = '<div class="bl-title">Spell Island</div><div class="bl-sub">正在打开咒语岛</div><div class="bl-bar"><i></i></div>';
  document.getElementById('screens')!.appendChild(loading);
  await initDirect(); // phone app: keys from the native layer
  // updates: before the game has started (title / loading) a ready update is applied at once; in the game a big notice asks
  const splash = document.createElement('div');
  splash.className = 'upd-splash';
  document.body.appendChild(splash);
  let applying = false;
  updates.onChange = (v) => {
    hud.setUpdate(v, { apply: () => updates.apply(), installer: () => updates.installer() });
    const before = !runtime;
    if (before && v.ready && !applying) { applying = true; splash.innerHTML = `正在更新到 ${v.ready.version}…`; splash.classList.add('on'); updates.apply(); return; }
    splash.classList.toggle('on', before && v.state === 'downloading');
    if (before && v.state === 'downloading') splash.innerHTML = `发现新版本，正在下载 <i><b style="width:${Math.round(v.progress * 100)}%"></b></i> ${Math.round(v.progress * 100)}%`;
    if (!before) splash.classList.remove('on');
  };
  updates.init();
  const [health] = await Promise.all([api.checkHealth(), speaker.loadManifest(), preloadAssets((d, n) => { const b = loading.querySelector('.bl-bar i') as HTMLElement | null; if (b) b.style.width = `${Math.round((d / n) * 100)}%`; })]);
  // models every world can need at any moment: the wizard, companions, food to conjure, things to turn into
  await prepareAssets(['wizard', 'broom', ...COMPANIONS.map((c) => c.id), ...assetIds((x) => x.startsWith('food_')), ...Object.values(SHAPES), ...modelsOf(HUB)]);
  loading.remove();
  speaker.serverOk = !!health;
  asr.serverAsr = !!health?.asr;
  world.hero.upgrade();
  // the island is the background of the title screen
  runtime = null;
  const qs = new URLSearchParams(location.search);
  screens.title(async () => {
    speaker.unlock();
    bgm.unlock();
    if (asr.serverAsr) await listener.start(); else asr.mic.init();
    hud.show(true);
    const go = () => {
      const direct = qs.get('world');
      goWorld(direct && worldById(direct) ? direct : 'island', false);
    };
    if (!store.data.companion) pickCompanion(go); else go();
  }, health);
  applySettings();
}

boot();

(window as any).spell = { hud, world, store, get runtime() { return runtime; }, route, WORLDS, listener, speaker, companion, goWorld, COMPANIONS };
