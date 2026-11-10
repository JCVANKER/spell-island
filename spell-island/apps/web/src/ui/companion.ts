// The 3D companion in the bottom-right corner (Animoji / FaceRig style): its own little renderer,
// bobbing and tilting its head with the loudness of its voice, leaning in while the child talks.
// Also the "pick your companion" screen with all five side by side.
import * as THREE from 'three';
import { COMPANIONS } from '@spell/shared';
import { assetModel } from '../render/assets';
import { buildModel } from '../render/models';
import type { Speaker } from '../voice/speaker';
import { el, esc } from './hud';
import { ICON } from './icons';

/** a small studio light rig for the companion portraits */
function studio(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const key = new THREE.DirectionalLight('#fff4e6', 2.4); key.position.set(2, 3, 4);
  const rim = new THREE.DirectionalLight('#bfe0ff', 1.4); rim.position.set(-3, 2, -2);
  scene.add(key, rim, new THREE.HemisphereLight('#eaf4ff', '#7a6a5a', 1.1));
}

export interface CompanionHandlers { onHelp: () => void; onClose: () => void }

function modelFor(id: string): THREE.Object3D {
  const m = assetModel(id);
  if (m) return m.root;
  return buildModel(id, { color: '#c9a0dc', h: 1 }).root;
}

export class CompanionView {
  root = el('div', 'companion');
  private canvas = el('canvas', 'cp-canvas') as HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  private holder = new THREE.Group();
  private model: THREE.Object3D | null = null;
  private bubble = el('div', 'cp-bubble');
  private nameTag = el('div', 'cp-name');
  private hideTimer = 0;
  private listening = false;
  private happyUntil = 0;
  private id = '';
  private visible = false;
  private smooth = 0;

  constructor(parent: HTMLElement, private speaker: Speaker, h: CompanionHandlers) {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
    studio(this.renderer, this.scene);
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.setSize(170, 170, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera.position.set(0, 0.75, 3.4);
    this.camera.lookAt(0, 0.5, 0);
    this.scene.add(this.holder);
    const face = el('div', 'cp-face');
    face.append(this.canvas, this.nameTag);
    const help = el('button', 'cp-help', `${ICON.help}<span>求助</span>`);
    const close = el('button', 'cp-close', ICON.close);
    this.root.append(this.bubble, face, help, close);
    parent.appendChild(this.root);
    help.addEventListener('click', (e) => { e.stopPropagation(); h.onHelp(); });
    face.addEventListener('click', () => h.onHelp());
    close.addEventListener('click', (e) => { e.stopPropagation(); h.onClose(); });
    this.show(false);
    const loop = (t: number) => { this.frame(t); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  setCompanion(id: string) {
    if (id === this.id) return;
    this.id = id;
    if (this.model) this.holder.remove(this.model);
    this.model = modelFor(id);
    this.holder.add(this.model);
    const c = COMPANIONS.find((x) => x.id === id);
    this.nameTag.textContent = c ? c.name : '';
  }

  show(on: boolean) { this.visible = on; this.root.style.display = on ? '' : 'none'; }

  say(text: string) {
    clearTimeout(this.hideTimer);
    // short English phrases stay on one line; long ones may wrap (but evenly)
    this.bubble.innerHTML = esc(text).replace(/“([^”]+)”/g, (_m, q: string) => `<b class="en${q.length > 26 ? ' wrap' : ''}">“${q}”</b>`);
    this.bubble.classList.add('on');
  }
  done(delay = 7000) { clearTimeout(this.hideTimer); if (delay <= 0) { this.bubble.classList.remove('on'); return; } this.hideTimer = window.setTimeout(() => this.bubble.classList.remove('on'), delay); }
  happy(seconds = 2.5) { this.happyUntil = performance.now() + seconds * 1000; }
  setListening(on: boolean) { this.listening = on; this.root.classList.toggle('listening', on); }

  private frame(t: number) {
    if (!this.visible || !this.model) return;
    const talking = this.speaker.speaking && this.speaker.role === this.id;
    const lv = talking ? this.speaker.level() : 0;
    this.smooth += (lv - this.smooth) * 0.35;
    const s = t / 1000;
    const happy = t < this.happyUntil;
    // FaceRig-ish motion: nod and tilt with the voice, sway while idle, lean in when listening, hop when happy
    const nod = talking ? this.smooth * 0.22 + Math.sin(s * 9) * 0.05 * this.smooth : this.listening ? 0.1 + Math.sin(s * 2.6) * 0.04 : Math.sin(s * 1.1) * 0.03;
    const tilt = talking ? Math.sin(s * 3.1) * 0.12 : Math.sin(s * 0.7) * 0.06;
    const turn = talking ? Math.sin(s * 1.7) * 0.25 : Math.sin(s * 0.45) * 0.35;
    const hop = happy ? Math.abs(Math.sin(s * 9)) * 0.18 : talking ? this.smooth * 0.06 : 0;
    const sq = 1 + (talking ? this.smooth * 0.08 : Math.sin(s * 2.2) * 0.015);
    this.holder.rotation.set(nod, turn, tilt);
    this.holder.position.y = hop;
    this.holder.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    this.renderer.render(this.scene, this.camera);
  }
}

/** "Choose your companion": five models side by side, click one or say its name. */
export class CompanionPicker {
  root = el('div', 'overlay picker');
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 2, 0.1, 100);
  private items: { id: string; g: THREE.Group }[] = [];
  private hover = -1;
  private raf = 0;
  private picked = false;

  constructor(parent: HTMLElement, private onPick: (id: string) => void) {
    const canvas = el('canvas', 'pk-canvas') as HTMLCanvasElement;
    this.root.innerHTML = `<div class="pk-box"><div class="kicker">Companion</div><h2>选一个小伙伴陪你冒险</h2><p class="sub">点一下，或者直接说出它的名字，比如<span class="en">“团团”</span>、<span class="en">“Hoot”</span></p></div>`;
    const box = this.root.querySelector('.pk-box')!;
    box.appendChild(canvas);
    const names = el('div', 'pk-names');
    names.innerHTML = COMPANIONS.map((c, i) => `<button data-i="${i}"><b>${c.name}</b><small>${c.en}</small><span>${c.desc}</span></button>`).join('');
    box.appendChild(names);
    parent.appendChild(this.root);
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    studio(this.renderer, this.scene);
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    const W = Math.min(900, window.innerWidth - 40), H = Math.round(W * 0.38);
    this.renderer.setSize(W, H, false);
    this.camera.aspect = W / H; this.camera.updateProjectionMatrix();
    this.camera.position.set(0, 1.3, 9.5); this.camera.lookAt(0, 0.55, 0);
    COMPANIONS.forEach((c, i) => {
      const g = new THREE.Group();
      g.add(modelFor(c.id));
      g.position.x = (i - 2) * 2.3;
      this.scene.add(g);
      this.items.push({ id: c.id, g });
    });
    names.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => this.pick(+(b as HTMLElement).dataset.i!));
      b.addEventListener('pointerenter', () => (this.hover = +(b as HTMLElement).dataset.i!));
    });
    canvas.addEventListener('pointermove', (e) => { const r = canvas.getBoundingClientRect(); this.hover = Math.max(0, Math.min(4, Math.floor(((e.clientX - r.left) / r.width) * 5))); });
    canvas.addEventListener('click', () => { if (this.hover >= 0) this.pick(this.hover); });
    const loop = (t: number) => {
      const s = t / 1000;
      this.items.forEach((it, i) => {
        const on = i === this.hover;
        it.g.rotation.y = Math.sin(s * 0.8 + i) * 0.5 + (on ? Math.sin(s * 4) * 0.3 : 0);
        it.g.position.y = on ? Math.abs(Math.sin(s * 6)) * 0.25 : Math.sin(s * 2 + i) * 0.03;
        const sc = on ? 1.18 : 1; it.g.scale.setScalar(it.g.scale.x + (sc - it.g.scale.x) * 0.2);
      });
      this.renderer.render(this.scene, this.camera);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  /** voice: "团团" / "red panda" / "the owl" */
  tryVoice(text: string): boolean {
    const t = text.toLowerCase();
    const keys: [number, RegExp][] = [[0, /owl|hoot|猫头鹰|咕咕/], [1, /panda|momo|熊猫|团团/], [2, /capy|capybara|水豚|卡皮/], [3, /dragon|ember|火龙|龙|焰焰/], [4, /penguin|pebble|企鹅|啾啾/]];
    for (const [i, re] of keys) if (re.test(t)) { this.pick(i); return true; }
    return false;
  }

  private pick(i: number) {
    if (this.picked) return;
    this.picked = true;
    this.hover = i;
    setTimeout(() => { cancelAnimationFrame(this.raf); this.renderer.dispose(); this.root.remove(); this.onPick(COMPANIONS[i].id); }, 700);
  }
}
