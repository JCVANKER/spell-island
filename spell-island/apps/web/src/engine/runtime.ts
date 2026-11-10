// One loaded world (Spell Island or a lesson world): things, NPCs, quests, the wizard's actions and magic.
// The brain only interprets speech; everything that happens is decided and validated here.
import * as THREE from 'three';
import {
  ruleBrain, lemmas, hasCJK, isUnsafe, asksPersonalInfo, matchGroups, readScore, pickOption, normalize, W, fillW, FRUITS, FOODS, REACT, SHAPES,
  type LessonWorld, type ThingDef, type NpcDef, type QuestDef, type BrainContext, type BrainOutput, type BrainAction, type PerceivedThing,
} from '@spell/shared';
import type { World } from './world';
import type { Hud } from '../ui/hud';
import { Speaker, sfx } from '../voice/speaker';
import { api } from '../api';
import { buildEnvironment, placeEntity, type BuiltScene, type Entity } from '../render/scenes';
import * as Mdl from '../render/models';
import { materialsOf } from '../render/materials';
import { store } from '../state/save';
import { Magic } from './magic';
import { Coach, type CoachHost } from './coach';
import type { CompanionView } from '../ui/companion';
import { groupOf, type Group, type SpellBook } from '../ui/spellbook';

interface Line { who: string; text: string; zh?: string }
export interface PortalInfo { id: string; title: string; titleZh: string; grade: string; color: string }
/** a spell of this world's book, with the action it stands for (so any way of saying it ticks it) */
interface BookSpell { say: string; zh: string; group: Group; sig: string; target?: string }

export interface RuntimeOpts {
  portals?: PortalInfo[];
  onEnter: (worldId: string) => void;
  onHome: () => void;
  onWorldDone: (w: LessonWorld) => void;
  tutorial?: TutorialStep[];
}

/** what the companion says when the child spoke Chinese and we know the English (pre-generated per companion) */
/** "这是什么？" "我要去哪里呀" — a question for the companion, not a command for Milo */
export function isChineseQuestion(t: string): boolean {
  const s = t.replace(/[\s。！!，,]+$/g, '');
  if (/^(让|把|去|变|长|点亮|打|跳|飞|骑|给|拿|开|吃|叫)/.test(s)) return false;
  return /[吗呢？?]$|什么|哪|怎么|为什么|为啥|多少|几个|谁|咋/.test(s);
}
/** single distinctive words of a lesson's name, so "Go to the herb hut" / "Go to Lost Town" / "castle" still find the portal */
export function portalWords(title: string): string[] {
  const words = title.toLowerCase().replace(/&/g, ' ').replace(/'s\b/g, '').split(/\s+/).filter((w) => w.length >= 3 && !['the', 'town', 'four', 'found', 'and'].includes(w));
  const pairs = words.slice(1).map((w, i) => `${words[i]} ${w}`);
  return [...words, ...pairs];
}
/** the companion, when the words didn't come through (short on purpose; pre-recorded) */
export const NOT_HEARD = ['没听清，再说一遍吧～', '嗯？再说一次？', '我没听清哦，大声一点再说一遍～'];
export const NOT_HEARD_BOOK = '试试念咒语表上的咒语吧～';
export const CN_TEACH = ['我听懂啦！Milo 只听得懂英语，跟他说：“{t}”', '好主意！用英语说：“{t}”，Milo 就会照做。'];

const STAR_FILLER = new Set(['the', 'a', 'an', 'it', 'is', 'this', 'that', 'what', 'its', 'i', 'say', 'word', 'star', 'okay', 'ok', 'yes', 'oh', 'wow', 'look', 'hello', 'hi']);
const COMMAND_VERBS = new Set(['make', 'go', 'turn', 'give', 'put', 'open', 'light', 'let', 'fly', 'walk', 'run', 'pick', 'take', 'grow', 'freeze', 'melt', 'hit', 'read', 'talk', 'eat', 'come', 'jump', 'dance', 'sing', 'shake', 'into', 'more', 'two', 'three']);

export interface TutorialStep { say: string[]; hint: string[]; goal: string }

const ANSWER_KINDS = new Set(['speak', 'listen', 'read', 'choose']);

export class Runtime implements CoachHost {
  built: BuiltScene;
  magic: Magic;
  coach: Coach;
  grade: number;
  history: { who: string; text: string }[] = [];
  active: { q: QuestDef; tries: number; stage: 'talk' | 'answer' | 'goal' } | null = null;
  childTurn: () => boolean = () => false;
  private queue: string[] = [];
  private processing = false;
  private sayChain: Promise<void> = Promise.resolve();
  private disposed = false;
  private hook: (t: number, dt: number) => void;
  private lastTarget: string | null = null;
  private conjured = 0;
  private tut: { steps: TutorialStep[]; i: number } | null = null;
  private idleT = 0;
  private nudged = '';
  private spells: BookSpell[] = [];
  private bookT = 0;

  constructor(public data: LessonWorld, private world: World, private hud: Hud, private speaker: Speaker, private companion: CompanionView | null, private opts: RuntimeOpts) {
    this.grade = data.gradeNum;
    const env = buildEnvironment(data.scene, { bounds: (data as any).bounds, decor: (data as any).decor });
    this.built = env;
    const entities = new Map<string, Entity>();
    for (const t of data.things) entities.set(t.id, placeEntity(t, false));
    for (const n of data.npcs) entities.set(n.id, placeEntity(n, true));
    // word stars: key words / sentences floating around — say them to collect
    for (const ws of data.words || []) {
      if (store.hasStar(data.id, ws.id)) continue;
      const sentence = ws.say.split(/\s+/).length > 3;
      const def: ThingDef = { id: ws.id, name: ws.say, zh: ws.zh, model: 'word_star', pos: [ws.pos[0], 0, ws.pos[1]], radius: 0, label: true, hidden: !!ws.hidden, params: { star: true, sentence } };
      entities.set(ws.id, placeEntity(def, false));
    }
    // portals on Spell Island: a ring of magic arches, one per lesson world
    (opts.portals || []).forEach((p, i, arr) => {
      const a = Math.PI + ((i - (arr.length - 1) / 2) / arr.length) * Math.PI * 1.7;
      const pos: [number, number, number] = [Math.sin(a) * 24.5, 0, Math.cos(a) * 24.5];
      const def: ThingDef = { id: `portal_${p.id}`, name: p.title, zh: `${p.grade} · ${p.titleZh}`, aliases: [p.titleZh, p.title.toLowerCase().replace(/^the /, ''), ...portalWords(p.title)], model: 'portal_arch', pos, rot: Math.atan2(-pos[0], -pos[2]), radius: 1.6, label: true, params: { color: p.color, h: 3.4 } };
      const e = placeEntity(def, false);
      e.portal = p.id;
      entities.set(def.id, e);
    });
    world.load({ ...env, entities });
    this.magic = new Magic(world, () => this.built);
    this.coach = new Coach(this);
    const hero = world.hero;
    hero.place(data.spawn.pos[0], data.spawn.pos[2], data.spawn.rot);
    hero.setFlying(false); hero.setInvisible(false); hero.hold(null, null); hero.running = false;
    world.snapCamera(env.indoor ? 6.5 : 7.5, env.indoor ? 3.6 : 4.2);
    world.fx.setWeather('none');
    world.setLight(1);
    this.refreshMarkers();
    this.hook = (t, dt) => this.tick(t, dt);
    world.hooks.add(this.hook);
    world.onTap = (id) => this.onTap(id);
    speaker.onSpeak = (role, on) => { if (role === 'wizard') hero.talking = on; };
    if (opts.tutorial) this.tut = { steps: opts.tutorial, i: 0 };
    this.initBook();
  }

  // ------------------------------------------------------------------ the spell book (咒语表)
  private get book(): SpellBook | null { return this.hud.book || null; }
  /** an action as a key: same spell however it was said ("Make the panda fly" / "Panda, fly up") */
  private sigOf(a: BrainAction) { return [a.type, a.target ? this.ent(a.target)?.def.name || a.target : '', a.value || ''].join('|'); }
  private initBook() {
    const ctx = this.buildCtx(), got = store.spellsOf(this.data.id);
    for (const idea of this.data.spellIdeas || []) {
      const a = ruleBrain(idea.say, ctx).actions[0];
      if (a) this.spells.push({ say: idea.say, zh: idea.zh, group: groupOf(a.type), sig: this.sigOf(a), target: a.target });
    }
    const portals = (this.opts.portals || []).map((p) => ({ title: p.title, zh: p.titleZh, grade: p.grade, color: p.color, done: store.data.badges.includes(p.id) }));
    this.book?.setWorld({ title: this.data.title, titleZh: this.data.titleZh, patterns: this.data.patterns || [], entries: this.spells.map((x) => ({ say: x.say, zh: x.zh, group: x.group, cast: got.includes(x.say) })), portals });
    this.book?.showDock(!this.tut);
    this.suggestSpells();
  }
  /** after an action: tick the book's spells it matches */
  private bookCast(a: BrainAction) {
    const sig = this.sigOf(a);
    for (const x of this.spells) if (x.sig === sig) {
      const first = !store.spellsOf(this.data.id).includes(x.say);
      store.addSpell(this.data.id, x.say);
      this.book?.markCast(x.say);
      if (first) { const n = store.spellsOf(this.data.id).length; this.hud.toast(`新咒语 ${n} / ${this.spells.length}`, '📖'); }
    }
    this.suggestSpells();
  }
  /** the corner scroll: spells not cast yet that fit right here (things nearby), kept steady while still good */
  private suggestSpells() {
    if (!this.book || !this.spells.length) return;
    const hp = this.world.hero.pos, got = store.spellsOf(this.data.id);
    const dist = (x: BookSpell) => { const e = x.target ? this.ent(x.target) : null; return e ? (e.hidden ? 99 : e.model.root.position.distanceTo(hp)) : 12; };
    const fits = (x: BookSpell) => !got.includes(x.say) && dist(x) < 20;
    const keep = this.shownSpells.filter((say) => { const x = this.spells.find((s) => s.say === say); return x && fits(x); });
    const more = this.spells.filter((x) => fits(x) && !keep.includes(x.say)).sort((a, b) => dist(a) - dist(b));
    const pick = [...keep, ...more.map((x) => x.say)];
    // everything here is cast already: show spells to try again, so the scroll is never empty
    if (pick.length < 3) pick.push(...this.spells.filter((x) => !pick.includes(x.say) && dist(x) < 20).map((x) => x.say));
    this.shownSpells = pick.slice(0, 3);
    this.book.suggest(this.shownSpells);
  }
  private shownSpells: string[] = [];

  /** recognition context, newest first: the last lines said to the child, the answer being asked for, the spells on screen,
   *  then the rest of this world's book and places (the recognizer then hears "Granny Herb's Hut", not "Granny Herbs. Hot.") */
  asrContext(): string[] {
    const out: string[] = [];
    const add = (t?: string) => { const x = (t || '').trim(); if (x && !out.includes(x) && out.length < 20) out.push(x); };
    for (const h of this.history.slice(-4).reverse()) if (h.who !== 'child') add(h.text);
    const a = this.active;
    if (a) { add(a.q.prompt); a.q.model.slice(0, 3).forEach(add); }
    this.shownSpells.forEach(add);
    (this.opts.portals || []).forEach((p) => add(`Go to ${p.title}!`));
    this.spells.forEach((x) => add(x.say));
    (this.data.patterns || []).forEach(add);
    return out;
  }
  /** the first visit of a world opens the book once (after the welcome) */
  private autoOpenBook() {
    if (this.disposed || !this.book || store.data.bookSeen?.includes(this.data.id)) return;
    (store.data.bookSeen ||= []).push(this.data.id); store.save();
    this.book.open();
  }

  async start(firstTime: boolean) {
    if (this.tut) {
      this.world.hero.sleep();
      await this.runTutorialStep();
      return;
    }
    this.updateStars();
    if (firstTime && this.data.intro.length) await this.companionSay(this.data.intro.join(''));
    this.hud.setQuests(this.questLog());
    this.autoOpenBook();
  }

  /** everything the world map needs */
  mapInfo() {
    const d: any = this.data;
    const decor: any[] = d.decor || [];
    const h = this.world.hero;
    return {
      title: d.title, titleZh: d.titleZh, bounds: d.bounds || this.built.bounds,
      zones: d.zones || [],
      paths: decor.filter((x) => x.k === 'path').map((x) => x.pts),
      water: decor.filter((x) => x.k === 'pond').map((x) => ({ x: x.at[0], z: x.at[1], r: x.r, sx: x.sx })),
      npcs: [...this.world.entities.values()].filter((e) => e.isNpc && !e.hidden).map((e) => ({ x: e.model.root.position.x, z: e.model.root.position.z, name: e.def.name, mark: this.world.markers.get(e.id) === '!' })),
      stars: this.stars().map((e) => ({ x: e.model.root.position.x, z: e.model.root.position.z, sentence: !!e.def.params?.sentence })),
      hero: { x: h.pos.x, z: h.pos.z, heading: h.heading },
      starsGot: store.starCount(this.data.id), starsTotal: (d.words || []).length,
    };
  }

  private updateStars(pop = false) { this.hud.setStars(store.starCount(this.data.id), (this.data.words || []).length, pop); }

  dispose() {
    this.hud.setStars(0, 0);
    this.disposed = true;
    this.world.hooks.delete(this.hook);
    this.world.onTap = null;
    this.speaker.onSpeak = null;
    this.speaker.stop();
    this.hud.hidePanels();
  }

  ent(id: string | undefined | null) { return id ? this.world.entities.get(id) : undefined; }
  npc(id: string) { return this.data.npcs.find((n) => n.id === id); }
  nameOf(id: string) { const e = this.ent(id); return e ? e.def.name : id; }

  // ------------------------------------------------------------------ speech output
  private roleFor(who: string): string {
    if (who === 'wizard' || who === 'narrator') return who;
    if (who === 'star') return 'narrator';
    if (who === 'companion') return store.data.companion || 'owl';
    return this.npc(who)?.voice || 'man';
  }

  say(lines: Line[]): Promise<void> {
    // signs and other things can't talk: Milo reads out their part
    lines = lines.map((l) => (l.who === 'wizard' || l.who === 'narrator' || l.who === 'star' || l.who === 'companion' || this.npc(l.who) ? l : { ...l, who: 'wizard' }));
    for (const l of lines) this.speaker.prefetch(this.roleFor(l.who), l.text);
    const prev = this.sayChain;
    let release!: () => void;
    this.sayChain = new Promise<void>((r) => (release = r));
    return prev.then(async () => {
      try {
        for (const l of lines) {
          if (this.disposed) break;
          const e = this.ent(l.who);
          if (e) e.talk = true;
          if (l.who === 'companion') {
            this.companion?.say(l.text);
            await this.speaker.say(this.roleFor('companion'), l.text);
            this.companion?.done();
          } else {
            // a listening test must not print its own answer: the text appears only after two wrong tries
            const shown = l.who === 'narrator' && (this.active?.tries || 0) < 2 ? '👂 仔细听……（听完说出 A、B 或 C）' : l.text;
            this.hud.showLine(l.who === 'wizard' ? 'Milo' : l.who === 'narrator' ? '🎧 Listening' : l.who === 'star' ? 'Word Star · 单词星' : this.nameOf(l.who), shown, l.zh);
            if (l.who === 'wizard') this.history.push({ who: 'wizard', text: l.text });
            else if (l.who !== 'narrator' && l.who !== 'star') this.history.push({ who: this.nameOf(l.who), text: l.text });
            await this.speaker.say(this.roleFor(l.who), l.text);
          }
          if (e) e.talk = false;
          await new Promise((r) => setTimeout(r, 160));
        }
        this.hud.lineDone();
      } finally { release(); }
    });
  }

  /** The child spoke Chinese. The companion answers (in its own voice), with the English sentence to try. */
  private async chineseHelp(text: string) {
    this.coach.heard('ok');
    const a = this.active;
    const giverZh = a ? (this.npc(a.q.giver)?.zh || this.ent(a.q.giver)?.def.zh || '') : '';
    let teach: string | null = null;
    let line: string | null = null;
    if (a && a.stage === 'answer' && (a.q.kind === 'speak' || a.q.kind === 'write') && a.q.model[0]) {
      teach = a.q.model[0];
      line = a.q.kind === 'speak' ? `意思对啦！用英语回答${giverZh || '他'}：“${teach}”` : `意思对啦！用英文把它写下来：“${teach}”`;
    } else if (!isChineseQuestion(text)) {
      const out = await api.brain(text, this.buildCtx(), false); // rules first (instant), the model only if needed
      if (this.disposed) return;
      if (out.understood && out.actions.length && out.teach) {
        teach = out.teach;
        line = CN_TEACH[Math.floor(Math.random() * CN_TEACH.length)].replace('{t}', teach);
      }
    }
    if (!line) {
      const near = [...this.world.entities.values()].filter((e) => !e.hidden && !e.portal).sort((x, y) => x.model.root.position.distanceTo(this.world.hero.pos) - y.model.root.position.distanceTo(this.world.hero.pos)).slice(0, 12).map((e) => e.def.name);
      line = await api.companion({ text, companion: store.data.companion || 'owl', grade: this.grade, world: this.data.titleZh, quest: (() => { const q = a?.q || this.data.quests.find((x) => !store.isDone(this.data.id, x.id) && (!x.needs || store.isDone(this.data.id, x.needs))); return q ? { titleZh: `${q.titleZh}（找${this.npc(q.giver)?.zh || this.ent(q.giver)?.def.zh || this.nameOf(q.giver)}）`, prompt: q.prompt, model: q.model } : null; })(), things: near, teach, transcript: this.history.slice(-6) });
      if (this.disposed) return;
      if (!line) line = `我在呢！Milo 只听得懂英语，试试对他说：“Go to the ${near[0] || 'tree'}!”`;
      const m = line.match(/“([A-Za-z][^”]*)”/);
      if (m) teach = m[1];
    }
    if (teach) { this.hud.showRecast(teach); this.hud.setHints([teach]); }
    await this.companionSay(line);
  }

  wizardSay(text: string) { return text ? this.say([{ who: 'wizard', text }]) : Promise.resolve(); }
  companionSay(text: string) { return this.say([{ who: 'companion', text }]); }

  // ------------------------------------------------------------------ CoachHost
  activeQuest() { return this.active ? { q: this.active.q, giverName: this.nameOf(this.active.q.giver) } : null; }
  idle() { return !this.processing && !this.disposed && !this.world.hero.busy; }
  transcript() { return this.history.slice(-8); }
  showHints(cards: string[]) { this.hud.setHints(cards); }
  spellIdea() {
    const ideas = this.data.spellIdeas || [];
    if (!ideas.length) return null;
    const hp = this.world.hero.pos;
    const near = ideas.filter((i) => !i.near || (this.ent(i.near) && this.ent(i.near)!.model.root.position.distanceTo(hp) < 16));
    const pool = near.length ? near : ideas;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ------------------------------------------------------------------ quests
  /** leave the current task for later (no penalty) */
  private pauseActive() {
    const a = this.active;
    if (!a) return;
    const g = this.ent(a.q.giver);
    if (g) { g.fx.follow = false; if (g.mood === 'moving') g.mood = undefined; }
    this.active = null;
    this.hud.hidePanels();
    this.hud.setHints([]);
    this.refreshMarkers();
  }
  private available(npcId: string): QuestDef | null {
    for (const q of this.data.quests) {
      if (q.giver !== npcId || store.isDone(this.data.id, q.id)) continue;
      if (q.needs && !store.isDone(this.data.id, q.needs)) continue;
      return q;
    }
    return null;
  }

  questLog() {
    return this.data.quests.map((q) => ({ id: q.id, skill: q.skill, title: q.titleZh, giver: this.nameOf(q.giver), done: store.isDone(this.data.id, q.id), active: this.active?.q.id === q.id }));
  }

  refreshMarkers() {
    this.world.markers.clear();
    for (const q of this.data.quests) {
      if (store.isDone(this.data.id, q.id)) continue;
      if (q.needs && !store.isDone(this.data.id, q.needs)) continue;
      if (!this.world.markers.has(q.giver)) this.world.markers.set(q.giver, this.active?.q.id === q.id ? '…' : '!');
    }
    if (this.active) this.world.markers.set(this.active.q.giver, '…');
    this.hud.setQuests(this.questLog());
  }

  async startQuest(q: QuestDef) {
    this.active = { q, tries: 0, stage: 'talk' };
    this.refreshMarkers();
    const giver = q.giver;
    await this.say(q.intro.map((text) => ({ who: giver, text })));
    if (q.tipZh) await this.companionSay(q.tipZh);
    await this.presentQuest();
  }

  /** (Re)show the task: ask the question, play the listening, show the card / writing box. */
  async presentQuest() {
    const a = this.active;
    if (!a || this.disposed) return;
    const q = a.q;
    const giver = q.giver;
    switch (q.kind) {
      case 'speak':
        a.stage = 'answer';
        if (q.prompt) await this.say([{ who: giver, text: q.prompt }]);
        this.hud.setHints(this.grade <= 4 ? q.model : [], undefined);
        break;
      case 'listen':
        a.stage = 'answer';
        await this.playListening();
        break;
      case 'read':
        a.stage = 'answer';
        this.hud.showRead(q.passage || '', q.readAloud ? '大声读出卡片上的句子' : q.prompt || '', q.options);
        if (q.prompt && !q.readAloud) await this.say([{ who: giver, text: q.prompt }]);
        break;
      case 'choose':
        a.stage = 'answer';
        if (q.prompt) await this.say([{ who: giver, text: q.prompt }]);
        this.hud.showChoices(q.prompt || '', q.options || [], (i) => this.answerChoice(i));
        break;
      case 'write':
        a.stage = 'answer';
        if (q.prompt) await this.say([{ who: giver, text: q.prompt }]);
        this.hud.showWrite(q.prompt || '', q.titleZh, (text) => this.answerWrite(text));
        break;
      case 'magic': case 'do': case 'guide':
        a.stage = 'goal';
        if (q.prompt) await this.say([{ who: giver, text: q.prompt }]);
        if (q.kind === 'guide') { const e = this.ent(giver); if (e) e.fx.follow = true; }
        else if ([...this.seen].some((ev) => this.goalHit(q.goal, ev))) { await this.say([{ who: giver, text: 'Oh! You already did it!' }]); await this.succeed(q); break; }
        this.hud.setHints(q.model);
        break;
    }
  }

  async playListening() {
    const q = this.active?.q;
    if (!q) return;
    this.hud.hidePanels();
    if (q.prompt) await this.say([{ who: q.giver, text: q.prompt }]);
    const video = (q as any).video as string | undefined;
    if (video) this.hud.showVideo(`./video/${video}`);
    await this.say([{ who: 'narrator', text: q.audio || '' }]);
    this.hud.hideVideo();
    if (this.active?.q !== q) return;
    this.hud.showChoices(q.prompt || 'Choose the answer.', q.options || [], (i) => this.answerChoice(i), () => this.playListening());
  }

  private async succeed(q: QuestDef, said?: string) {
    const giver = this.ent(q.giver);
    this.active = null;
    store.markDone(this.data.id, q.id);
    this.hud.hidePanels();
    this.hud.setHints([]);
    sfx('feather');
    if (giver) { this.world.fx.burst(this.magic.top(giver), '#ffe27a', 70); giver.fx.follow = false; giver.mood = 'happy'; setTimeout(() => { if (giver) giver.mood = undefined; }, 4000); }
    this.hud.toast(`获得魔法水晶 💎  ${q.titleZh}`, '💎');
    this.hud.setCrystals(store.data.crystals, store.data.badges.length);
    this.refreshMarkers();
    await this.say(q.done.map((text) => ({ who: q.giver, text })));
    void said;
    await this.coach.solved();
    // world finished?
    if (this.data.quests.every((x) => store.isDone(this.data.id, x.id))) { this.opts.onWorldDone(this.data); return; }
    // the same person has another task: carry straight on, like a real conversation
    const next = this.available(q.giver);
    if (next && !this.active && !this.disposed) { await new Promise((r) => setTimeout(r, 700)); if (!this.active && !this.disposed) await this.startQuest(next); }
  }

  private async fail(q: QuestDef, line?: string) {
    if (!this.active) return;
    this.active.tries++;
    sfx('oops');
    this.coach.heard('unclear');
    await this.say([{ who: q.giver, text: line || q.retry || 'Hmm, not quite. Let\'s try again!' }]);
    if (this.active?.q.kind === 'speak' && this.active.tries >= 2) this.hud.setHints(q.model);
  }

  async answerChoice(i: number) {
    const a = this.active;
    if (!a || a.q.answer === undefined) return;
    if (i === a.q.answer) { this.hud.markChoice(i, true); await this.succeed(a.q); }
    else { this.hud.markChoice(i, false); await this.fail(a.q, a.q.retry || 'Not this one. Listen again and try another one!'); }
  }

  async answerWrite(text: string) {
    const a = this.active;
    if (!a || a.q.kind !== 'write') return;
    this.history.push({ who: 'child', text: `(写) ${text}` });
    const ok = matchGroups(text, a.q.accept) || a.q.model.some((m) => normalize(m) === normalize(text));
    if (ok) { this.hud.writeResult(true); await this.succeed(a.q, text); return; }
    if (a.q.judge && api.health?.llm) {
      const j = await api.judge({ question: a.q.prompt || a.q.titleZh, criteria: a.q.judge, answer: text, grade: this.grade });
      if (j?.ok) { this.hud.writeResult(true); await this.succeed(a.q, text); return; }
      this.hud.writeResult(false);
      await this.fail(a.q, j?.feedback);
      return;
    }
    this.hud.writeResult(false);
    await this.fail(a.q);
  }

  /** returns true if the utterance was taken as an answer to the active question */
  private async answerSpoken(text: string): Promise<boolean> {
    const a = this.active;
    if (!a || a.stage !== 'answer') return false;
    const q = a.q;
    const lem = lemmas(text);
    if ((q.kind === 'listen') && lem.some((w) => ['again', 'repeat', 'once'].includes(w))) { await this.playListening(); return true; }
    if (q.kind === 'listen' || q.kind === 'choose' || (q.kind === 'read' && q.options)) {
      const i = pickOption(text, q.options || []);
      if (i < 0) return false;
      await this.answerChoice(i);
      return true;
    }
    if (q.kind === 'read' && q.readAloud) {
      const s = readScore(text, q.passage || '');
      if (s >= 0.6) { this.hud.toast(`读得真好！${Math.round(s * 100)} 分`, '📖'); await this.succeed(q, text); return true; }
      if (s >= 0.25) { await this.fail(q, 'Good try! Read the whole sentence, slowly.'); return true; }
      return false;
    }
    if (q.kind === 'speak') {
      if (matchGroups(text, q.accept)) { await this.succeed(q, text); return true; }
      if (q.judge && api.health?.llm && lem.length >= 2) {
        const j = await api.judge({ question: q.prompt || '', criteria: q.judge, answer: text, grade: this.grade });
        if (j?.ok) { await this.succeed(q, text); return true; }
        if (j) { await this.fail(q, j.feedback); return true; }
      }
      return false;
    }
    return false;
  }

  /** magic / do / guide goals: called with an event string after every action */
  private seen = new Set<string>();
  private goalHit(goal: string | undefined, ev: string) {
    return !!goal && goal.split('|').some((g) => {
      const gp = g.split(':'), ep = ev.split(':');
      return gp.length <= ep.length && gp.every((p, i) => p === '*' || p === ep[i]);
    });
  }
  private async event(ev: string) {
    if (this.tut) { await this.tutorialEvent(ev); }
    this.seen.add(ev);
    const a = this.active;
    if (a) {
      if (a.stage === 'goal' && this.goalHit(a.q.goal, ev)) await this.succeed(a.q);
      return;
    }
    // the child did the magic before anyone asked for it: still counts!
    const q = this.data.quests.find((x) => (x.kind === 'magic' || x.kind === 'do') && !store.isDone(this.data.id, x.id) && (!x.needs || store.isDone(this.data.id, x.needs)) && this.goalHit(x.goal, ev));
    if (q) { this.active = { q, tries: 0, stage: 'goal' }; await this.succeed(q); }
  }

  // ------------------------------------------------------------------ tutorial (Spell Island)
  private async runTutorialStep() {
    const t = this.tut;
    if (!t) return;
    const s = t.steps[t.i];
    if (!s) { this.tut = null; store.data.tutorialDone = true; store.save(); this.hud.setHints([]); this.book?.showDock(true); this.autoOpenBook(); return; }
    await this.companionSay(s.say.join(''));
    this.hud.setHints(s.hint);
    this.hud.setTutorial(t.i, t.steps.length, s.hint[0]);
  }

  private async tutorialEvent(ev: string) {
    const t = this.tut;
    if (!t) return;
    const s = t.steps[t.i];
    if (!s) return;
    const ok = s.goal.split('|').some((g) => { const gp = g.split(':'), ep = ev.split(':'); return gp.every((p, i) => p === '*' || p === ep[i]); });
    if (!ok) return;
    t.i++;
    sfx('chime');
    if (t.i >= t.steps.length) { this.hud.setTutorial(-1, 0, ''); }
    await new Promise((r) => setTimeout(r, 900));
    await this.runTutorialStep();
  }

  // ------------------------------------------------------------------ input
  onTap(id: string) {
    if (id === 'hero') { this.world.hero.doJump(); sfx('pop'); return; }
    const e = this.ent(id);
    if (!e) return;
    sfx('pop');
    if (e.portal) { this.handleUtterance(`go to the ${e.def.name}`); return; }
    this.speaker.say('wizard', e.def.name.replace(/^./, (c) => c.toUpperCase()) + '!');
  }

  handleUtterance(text: string) {
    this.queue.push(text);
    if (!this.processing) this.drain();
  }

  private async drain() {
    this.processing = true;
    while (this.queue.length && !this.disposed) {
      const t = this.queue.shift()!;
      try { await this.process(t); } catch (e) { console.error(e); }
    }
    this.processing = false;
  }

  buildCtx(): BrainContext {
    const hp = this.world.hero.pos;
    const things: PerceivedThing[] = [];
    for (const e of this.world.entities.values()) {
      if (e.hidden || e.def.params?.star) continue;
      things.push({ id: e.id, name: e.def.name, zh: e.def.zh || (e.portal ? undefined : undefined), aliases: e.def.aliases || [], tags: e.def.tags || [], color: e.fx.tint || e.def.color, kind: e.portal ? 'portal' : e.isNpc ? 'npc' : 'thing', distance: e.model.root.position.distanceTo(hp), can: (e.def.can as string[]) || [] });
    }
    const a = this.active;
    return {
      worldId: this.data.id, grade: this.grade, things, holding: this.world.hero.carryId, flying: this.world.hero.flying,
      history: this.history.slice(-6), activeQuest: a ? { kind: a.q.kind, prompt: a.q.prompt, giver: a.q.giver } : null, lastTarget: this.lastTarget,
    };
  }

  private async process(raw: string) {
    const text = raw.trim();
    this.idleT = 0;
    if (!text) return;
    this.hud.showChild(text, true);
    this.history.push({ who: 'child', text });
    if (isUnsafe(text)) { await this.wizardSay('Hmm, let\'s use kind words! Where shall we go?'); return; }
    if (asksPersonalInfo(text)) { await this.wizardSay('That\'s a secret! Let\'s keep exploring!'); return; }
    const zh = hasCJK(text);
    if (!zh) store.addWords(lemmas(text).filter((w) => (this.data.vocab || []).some((v) => lemmas(v).includes(w))));

    // 1. an answer to the open question?
    if (await this.answerSpoken(text)) return;

    // 2. a word star nearby? saying its word / sentence collects it
    if (!zh) { const r = await this.tryStar(text); if (r === 'done') return; }

    // 2b. Chinese: Milo only understands English, so the companion answers and shows the English to say
    if (zh) { await this.chineseHelp(text); return; }

    // 3. a command / spell
    const out = await api.brain(text, this.buildCtx(), zh);
    if (this.disposed) return;
    if (out.understood && out.actions.length) {
      this.coach.heard(zh ? 'zh' : 'ok'); this.misses = 0;
      if (out.teach || (zh && this.grade >= 3)) this.hud.showRecast(out.teach || null);
      if (out.say) this.wizardSay(out.say);
      await this.run(out.actions);
      return;
    }
    if (out.understood && out.say) { this.coach.heard('ok'); await this.wizardSay(out.say); return; }

    // 3. still the open question? (speak: wrong answer)
    if (this.active?.stage === 'answer' && this.active.q.kind === 'speak') { await this.fail(this.active.q); return; }

    // 4. free chat with a nearby NPC
    const near = [...this.world.entities.values()].filter((e) => e.isNpc && !e.hidden).sort((a, b) => a.model.root.position.distanceTo(this.world.hero.pos) - b.model.root.position.distanceTo(this.world.hero.pos))[0];
    if (near && near.model.root.position.distanceTo(this.world.hero.pos) < 6 && api.health?.llm) {
      const n = this.npc(near.id)!;
      const line = await api.npc(text, { name: n.name, persona: n.persona, knows: n.knows }, this.grade, this.history.slice(-6));
      if (line) { this.coach.heard('ok'); await this.say([{ who: n.id, text: line }]); return; }
    }
    await this.notHeard();
  }

  /** didn't get it: one short line from the companion (Milo stays quiet); every third miss points at the spell book */
  private misses = 0;
  private async notHeard() {
    const n = ++this.misses;
    const pet = store.data.settings.companion && !!store.data.companion;
    if (!pet) { await this.wizardSay(W.unclear[0]); return; }
    if (n % 3 === 0 && this.shownSpells.length) { this.hud.setHints(this.shownSpells.slice(0, 2)); await this.companionSay(NOT_HEARD_BOOK); return; }
    await this.companionSay(NOT_HEARD[n % NOT_HEARD.length]);
  }

  // ------------------------------------------------------------------ actions
  async run(actions: BrainAction[]) {
    for (const a of actions) {
      if (this.disposed) return;
      if (a.target) this.lastTarget = a.target;
      await this.act(a);
      this.bookCast(a);
    }
  }

  private front(dist = 1.6): THREE.Vector3 {
    const h = this.world.hero;
    return h.pos.clone().addScaledVector(h.forwardVec(), dist).setY(0);
  }

  private async castAt(e: Entity | undefined, color = '#ffe27a') {
    const h = this.world.hero;
    if (e) await h.faceToward(e.model.root.position);
    const cast = h.doAct('cast');
    await new Promise((r) => setTimeout(r, 350));
    if (e) await this.world.fx.trail(h.staffTip(), this.magic.top(e), color);
    await cast;
  }

  private async goTo(e: Entity, arrive?: number) {
    const h = this.world.hero;
    const want = arrive ?? (e.def.radius || 0.6) + 1.3;
    let r = await h.walkTo(e.model.root.position, { arrive: want, excludeId: e.id });
    // things tucked under / on furniture: close enough to reach with the staff counts as there
    if ((r === 'blocked' || r === 'edge') && e.model.root.position.distanceTo(h.pos) < want + 2.4) { await h.faceToward(e.model.root.position); r = 'arrived'; }
    if (r === 'blocked') await this.wizardSay('Hmm, I can\'t get there. Can you tell me the way?');
    return r;
  }

  private async act(a: BrainAction) {
    const h = this.world.hero;
    const e = this.ent(a.target);
    switch (a.type) {
      case 'wake': await h.wake(); this.event('wake'); break;
      case 'sleep': h.sleep(); setTimeout(() => h.wake(), 2500); break;
      case 'stop': h.stop(); this.event('stop'); break;
      case 'run': h.running = true; this.event('run'); break;
      case 'walk': h.running = false; break;
      case 'forward': h.walkForward(6).then(() => this.checkPlaces()); this.event('forward'); break;
      case 'back': h.walkForward(-3); break;
      case 'come': if (h.mode === 'sleep') await h.wake(); h.face(h.heading + Math.PI).then(() => h.walkForward(3)); break;
      case 'turn_left': await h.turn(Math.PI / 2); this.event('turn:left'); break;
      case 'turn_right': await h.turn(-Math.PI / 2); this.event('turn:right'); break;
      case 'turn_around': await h.turn(Math.PI); break;
      case 'jump': await h.doJump(); this.event('jump'); break;
      case 'dance': if (e) { await this.castAt(e, '#ffd1f0'); this.magic.dance(e); this.spelled(e, 'dance'); } else { await h.doAct('dance'); this.event('dance'); } break;
      case 'wave': await h.doAct('wave'); break;
      case 'broom_on': {
        const cloud = a.value === 'cloud';
        if (cloud) { await this.castAt(undefined, '#ffffff'); this.world.fx.burst(h.pos.clone().setY(0.4), '#ffffff', 24, { glyph: 'puff', size: 1.4, speed: 1.6, up: 0.4, gravity: -0.3, life: 1.4 }); sfx('feather'); }
        h.setFlying(true, cloud ? 'cloud' : 'broom'); this.magic.sparkle(h.pos.clone().setY(1), '#bfe8ff'); this.event(cloud ? 'cloud' : 'broom'); break;
      }
      case 'broom_off': h.setFlying(false); break;
      case 'invisible': await this.castAt(undefined, '#9fd8ff'); h.setInvisible(true); this.event('invisible'); setTimeout(() => h.setInvisible(false), 12000); break;
      case 'visible': h.setInvisible(false); break;
      case 'walk_to': {
        if (!e) break;
        if (e.portal) { await this.enterPortal(e); break; }
        const far = e.model.root.position.distanceTo(h.pos) > 16 && !h.running;
        if (far) h.running = true; // big worlds: hurry over long distances
        const r = await this.goTo(e);
        if (far) h.running = false;
        if (r === 'arrived') { this.event(`reach:${e.id}`); if (e.isNpc) await this.talkTo(e); }
        break;
      }
      case 'enter': if (e?.portal) await this.enterPortal(e); break;
      case 'go_home': this.opts.onHome(); break;
      case 'talk_to': {
        if (!e) break;
        if (e.model.root.position.distanceTo(h.pos) > 3.2) { const r = await this.goTo(e); if (r !== 'arrived') break; }
        await this.talkTo(e);
        break;
      }
      case 'look_at': if (e) { await h.faceToward(e.model.root.position); if (e.def.text) await this.readThing(e); } break;
      case 'read': if (e) { if (e.model.root.position.distanceTo(h.pos) > 3.5) await this.goTo(e); await this.readThing(e); } break;
      case 'pick_up': {
        if (!e || e.isNpc || e.portal) { if (e?.isNpc) await this.wizardSay('I can\'t pick up a friend! Let\'s say hello instead.'); break; }
        if ((e.def.radius || 0) > 1.6 && !(e.def.can || []).includes('pick')) { await this.wizardSay(`The ${e.def.name} is too big for me!`); break; }
        if (e.model.root.position.distanceTo(h.pos) > 2.6) { const r = await this.goTo(e, 1.6); if (r !== 'arrived') break; }
        if (h.carryId) this.putDown();
        this.world.current?.group.remove(e.model.root);
        e.model.root.scale.setScalar(Math.min(1, 0.9 / Math.max(0.4, e.model.height)));
        h.hold(e.model.root, e.id);
        e.hidden = true;
        sfx('pop');
        this.event(`pick:${e.id}`);
        break;
      }
      case 'drop': this.putDown(); break;
      case 'put': {
        const dest = this.ent(a.target2);
        const itemId = a.target || h.carryId;
        if (!dest || !itemId) break;
        if (h.carryId !== itemId) await this.act({ type: 'pick_up', target: itemId });
        if (h.carryId !== itemId) break;
        if (dest.model.root.position.distanceTo(h.pos) > 2.4) { const r = await this.goTo(dest); if (r !== 'arrived') break; }
        const item = this.putDown(dest, a.value || 'on');
        if (item) this.event(`put:${item.id}:${dest.id}:${a.value || 'on'}`);
        break;
      }
      case 'give': {
        const to = this.ent(a.target2) || [...this.world.entities.values()].filter((x) => x.isNpc).sort((x, y) => x.model.root.position.distanceTo(h.pos) - y.model.root.position.distanceTo(h.pos))[0];
        let itemId: string | undefined = a.target || (a.value ? this.nearest((x) => x.def.name === a.value)?.id : undefined) || h.carryId || undefined;
        if (!itemId && a.value && FOODS.includes(a.value)) { await this.castAt(undefined, '#ffd36b'); this.conjure(a.value, this.front(1.4)); itemId = this.lastTarget || undefined; }
        if (!to || !itemId) break;
        if (h.carryId !== itemId) await this.act({ type: 'pick_up', target: itemId });
        if (h.carryId !== itemId) break;
        if (to.model.root.position.distanceTo(h.pos) > 2.6) { const r = await this.goTo(to); if (r !== 'arrived') break; }
        const item = this.ent(itemId);
        h.hold(null, null);
        if (item) { item.hidden = true; this.world.current?.group.remove(item.model.root); }
        this.magic.sparkle(this.magic.top(to), '#ffd1f0');
        to.mood = 'happy';
        this.event(`give:${itemId}:${to.id}`);
        if (!this.active || this.active.q.giver !== to.id) await this.say([{ who: to.id, text: 'Oh! Thank you so much!' }]);
        break;
      }
      case 'eat': {
        let food = e && (e.def.can || []).includes('eat') ? e : h.carryId ? this.ent(h.carryId) : undefined;
        if (!food) food = [...this.world.entities.values()].filter((x) => !x.hidden && (x.def.can || []).includes('eat')).sort((x, y) => x.model.root.position.distanceTo(h.pos) - y.model.root.position.distanceTo(h.pos))[0];
        if (!food) { await this.wizardSay(W.eatNone[0]); break; }
        if (h.carryId !== food.id) await this.act({ type: 'pick_up', target: food.id });
        await h.doAct('eat');
        h.hold(null, null);
        food.hidden = true;
        sfx('pop');
        this.event(`eat:${food.def.name}`);
        break;
      }
      case 'hit': {
        if (!e) break;
        if (e.portal) break;
        if (e.model.root.position.distanceTo(h.pos) > 2.2) { const r = await this.goTo(e, 1.5); if (r !== 'arrived') break; }
        await h.faceToward(e.model.root.position);
        const bonk = h.doAct('bonk');
        await new Promise((r) => setTimeout(r, 300));
        this.magic.bonk(e);
        await bonk;
        this.event(`hit:${e.id}`);
        if (e.isNpc) await this.say([{ who: e.id, text: e.def.ouch || 'Ouch! Hey, that tickles! Why did you do that?' }]);
        break;
      }
      // ---- spells on things ----
      case 'light': case 'dark': {
        const t = e || this.nearest((x) => (x.def.can || []).includes('light'));
        if (!t) { await this.wizardSay('There is no lamp here!'); break; }
        await this.castAt(t, '#ffe9a0');
        this.magic.light(t, a.type === 'light');
        this.spelled(t, a.type);
        break;
      }
      case 'open': case 'close': {
        const t = e || this.nearest((x) => (x.def.can || []).includes('open'));
        if (!t) break;
        await this.castAt(t);
        if (a.type === 'open') this.magic.open(t);
        this.spelled(t, a.type);
        break;
      }
      case 'levitate': if (e) { await this.castAt(e, '#bfe8ff'); this.magic.levitate(e); this.spelled(e, 'fly'); } break;
      case 'tint': if (e && a.value) { await this.castAt(e, '#ff9ad5'); this.magic.tint(e, a.value); this.spelled(e, `tint:${a.value}`, 'tint'); } break;
      case 'grow_size': if (e) { await this.castAt(e); this.magic.resize(e, a.value === 'giant' ? 2.6 : 1.8); this.spelled(e, 'big'); } break;
      case 'shrink': if (e) { await this.castAt(e, '#bfe8ff'); this.magic.resize(e, a.value === 'tiny' ? 0.35 : 0.55); this.spelled(e, 'small'); } break;
      case 'spin': if (e) { await this.castAt(e); this.magic.spin(e, 3); this.spelled(e, 'spin'); } break;
      // ---- magic v2 ----
      case 'hop': if (e) { await this.castAt(e); this.magic.hop(e); this.spelled(e, 'hop'); } break;
      case 'shake': if (e) { await this.castAt(e); this.magic.shake(e); this.spelled(e, 'shake'); } break;
      case 'nap': if (e) { await this.castAt(e, '#cfe3ff'); this.magic.nap(e); this.spelled(e, 'nap'); } break;
      case 'sing': if (e) { await this.castAt(e, '#ffd1f0'); this.magic.sing(e); this.spelled(e, 'sing'); } break;
      case 'glow': if (e) { await this.castAt(e, '#fff1a0'); this.magic.glow(e); this.spelled(e, 'glow'); } break;
      case 'freeze': if (e) { await this.castAt(e, '#cfefff'); this.magic.freeze(e); this.spelled(e, 'freeze'); } break;
      case 'melt': if (e) { await this.castAt(e, '#ffb36b'); this.magic.melt(e); this.spelled(e, 'melt'); } break;
      case 'vanish': if (e && !e.portal) { await this.castAt(e, '#ffffff'); this.magic.vanish(e); this.spelled(e, 'vanish'); } break;
      case 'appear': {
        const list = e ? [e] : [...this.world.entities.values()].filter((x) => x.fx.vanished);
        if (!list.length) break;
        await this.castAt(list[0], '#ffe27a');
        for (const x of list) { this.magic.appear(x); this.spelled(x, 'appear'); }
        break;
      }
      case 'emote': if (e) { await this.castAt(e, '#ffd1f0'); this.magic.emote(e, a.value || 'happy'); this.spelled(e, a.value || 'happy', 'emote'); } break;
      case 'scurry': if (e) { await this.castAt(e); this.magic.scurry(e); this.spelled(e, 'scurry'); } break;
      case 'summon': if (e && !e.portal) { await this.castAt(e, '#bfe8ff'); await this.summon(e); } break;
      case 'clone': if (e && !e.portal) { await this.castAt(e, '#ffd1f0'); this.cloneThing(e, a.count || 3); this.spelled(e, 'clone'); } break;
      case 'transform': if (e && a.value && !e.portal) { await this.castAt(e, '#c58bff'); this.transform(e, a.value); this.spelled(e, `into:${a.value}`, 'transform'); } break;
      case 'restore': if (e) { await this.castAt(e, '#ffe27a'); this.restore(e); this.spelled(e, 'restore'); } break;
      case 'night': await this.castAt(undefined, '#9fb8ff'); this.magic.setNight(true); this.event('night'); break;
      case 'day': await this.castAt(undefined, '#ffe27a'); this.magic.setNight(false); this.event('day'); break;
      case 'rainbow': await this.castAt(undefined, '#ff9ad5'); this.magic.rainbow(); this.event('rainbow'); break;
      case 'fireworks': await this.castAt(undefined, '#ffd23f'); this.magic.fireworks(); this.event('fireworks'); break;
      case 'bubbles': await this.castAt(undefined, '#cfefff'); this.magic.bubbles(); this.event('bubbles'); break;
      // magic v3
      case 'move': if (e && !e.portal) { await this.castAt(e, '#bfe8ff'); this.magic.move(e, a.value || 'left'); this.spelled(e, 'move'); } break;
      case 'cloud_ride': if (e && !e.portal) { await this.castAt(e, '#ffffff'); this.magic.cloudRide(e); this.spelled(e, 'cloud'); } break;
      case 'shower': await this.castAt(undefined, '#ffe27a'); this.magic.shower(a.value || 'stars'); this.event(`shower:${a.value || 'stars'}`); break;
      case 'butterflies': await this.castAt(undefined, '#ff9ad5'); this.magic.butterflies(); this.event('butterflies'); break;
      case 'whirlwind': await this.castAt(undefined, '#dfe8f0'); this.magic.whirlwind(); this.event('whirlwind'); break;
      case 'shooting_stars': await this.castAt(undefined, '#fff3b0'); this.magic.shootingStars(); this.event('shooting_stars'); break;
      case 'hero_size': await this.castAt(undefined, a.value === 'small' ? '#bfe8ff' : '#ffd36b'); h.sizeTarget = a.value === 'big' ? 1.8 : a.value === 'small' ? 0.5 : 1; this.magic.sparkle(h.pos.clone().setY(1.2)); this.event(`me:${a.value}`); break;
      case 'everyone': await this.castAt(undefined, '#ffd1f0'); this.everyone(a.value || 'dance'); this.event(`everyone:${a.value || 'dance'}`); break;
      case 'heal': { const t = e || this.nearest((x) => x.isNpc); if (t) { await this.castAt(t, '#8fffa8'); this.magic.heal(t); this.spelled(t, 'heal'); } break; }
      case 'sparkle': await this.castAt(undefined); this.magic.sparkle(this.front(1).setY(1.5)); break;
      case 'weather': if (a.value) { await this.castAt(undefined, '#bfe8ff'); this.magic.setWeather(a.value); this.event(`weather:${a.value}`); } break;
      case 'season': if (a.value) { await this.castAt(undefined, '#ffd1a0'); this.magic.setSeason(a.value); this.event(`season:${a.value}`); } break;
      case 'conjure': if (a.value) {
        await this.castAt(undefined, '#ffd1f0');
        const n = Math.max(1, Math.min(5, a.count || 1));
        const gap = SHAPES[a.value] ? 1.3 : 0.7, dist = SHAPES[a.value] ? 2.4 : 1.4;
        for (let i = 0; i < n; i++) { const off = n === 1 ? 0 : (i - (n - 1) / 2) * gap; const p = this.front(dist); const side = new THREE.Vector3(-this.world.hero.forwardVec().z, 0, this.world.hero.forwardVec().x); this.conjure(a.value, p.addScaledVector(side, off)); }
        this.event(`conjure:${a.value}`);
      } break;
      case 'grow_tree': { await this.castAt(undefined, '#9fe28a'); this.growTree(this.front(3.5), a.value === 'flower'); this.event(`grow:${a.value || 'tree'}`); break; }
      case 'fruit_rain': if (a.value) { await this.castAt(undefined, '#ffe27a'); this.fruitRain(a.value); this.event(`fruit_rain:${a.value}`); } break;
    }
  }


  /** one spell on everyone near: friends, animals and things (not buildings) */
  private everyone(kind: string) {
    const hp = this.world.hero.pos;
    const list = [...this.world.entities.values()]
      .filter((e) => !e.hidden && !e.portal && !e.def.params?.star && !e.fx.vanished && (e.def.radius || 0) <= 2.2 && e.model.root.position.distanceTo(hp) < 20)
      .sort((a, b) => a.model.root.position.distanceTo(hp) - b.model.root.position.distanceTo(hp)).slice(0, 12);
    const m = this.magic;
    list.forEach((e, i) => setTimeout(() => {
      if (this.disposed) return;
      if (kind === 'dance') m.dance(e); else if (kind === 'sing') m.sing(e); else if (kind === 'hop') m.hop(e); else if (kind === 'nap') m.nap(e);
      else if (kind === 'happy') m.emote(e, 'happy'); else if (kind === 'levitate') m.levitate(e); else if (kind === 'spin') m.spin(e, 3);
      else if (kind === 'freeze') m.freeze(e); else if (kind === 'shake') m.shake(e); else m.tint(e, kind);
    }, i * 90));
    if (kind === 'dance' || kind === 'sing') m.shower('notes');
  }

  /** a spell landed on a thing: quest events, secrets it was hiding, and what it says back */
  private spelled(e: Entity, ev: string, react = ev) {
    const id = e.copyOf || e.id;
    this.event(`${ev.split(':')[0] === 'tint' ? `tint:${id}:${ev.split(':')[1]}` : ev.startsWith('into:') ? `into:${id}:${ev.slice(5)}` : `${ev}:${id}`}`);
    this.event(`spell:${id}`);
    this.revealFrom(e, ev.split(':')[0]);
    const voiced = e.isNpc || !!e.def.params?.voice;
    const line = REACT[react];
    if (voiced && line && !e.copyOf && !(this.active && this.active.q.giver === e.id)) {
      const who = e.isNpc ? e.id : null;
      setTimeout(() => { if (who) this.say([{ who, text: line }]); else this.voiceThing(e, line); }, 500);
    }
  }

  /** things that speak without being NPCs (animals with a voice in params) */
  private voiceThing(e: Entity, text: string) {
    const v = e.def.params?.voice as string | undefined;
    if (!v) return;
    e.talk = true;
    this.speaker.say(v, text).finally(() => (e.talk = false));
  }

  /** a thing hiding a secret (word star, chest...) shows it when the right spell lands */
  private revealFrom(e: Entity, ev: string) {
    const def = e.def;
    if (!def.reveal?.length || (e as any).__revealed) return;
    const on = def.revealOn || 'open';
    if (on !== 'any' && on !== ev) return;
    (e as any).__revealed = true;
    for (const rid of def.reveal) {
      const r = this.ent(rid);
      if (!r || !r.hidden) continue;
      r.hidden = false;
      r.model.root.visible = true;
      this.world.current?.group.add(r.model.root);
      r.fx.scaleTarget = r.def.scale || 1; r.model.root.scale.setScalar(0.05);
      this.magic.sparkle(this.magic.top(r), '#ffe27a');
    }
    sfx('magic');
  }

  private async summon(e: Entity) {
    const h = this.world.hero;
    e.fx.summon = true;
    const r = e.model.root;
    await new Promise<void>((done) => {
      const hook = (_t: number, dt: number) => {
        const dx = h.pos.x - r.position.x, dz = h.pos.z - r.position.z, d = Math.hypot(dx, dz);
        if (d < 1.8 || this.disposed) { this.world.hooks.delete(hook); done(); return; }
        const k = Math.min(d - 1.7, dt * (d > 10 ? 8 : 4));
        r.position.x += (dx / d) * k; r.position.z += (dz / d) * k; r.rotation.y = Math.atan2(dx, dz);
      };
      this.world.hooks.add(hook);
    });
    e.fx.summon = false;
    e.fx.base.copy(r.position);
    e.def.pos = [r.position.x, e.def.pos[1] || 0, r.position.z];
    this.spelled(e, 'summon');
  }

  private clones = 0;
  private cloneThing(e: Entity, n: number) {
    n = Math.min(n - 1, 4, 14 - this.clones);
    const base = e.model.root.position;
    for (let i = 0; i < n; i++) {
      const m = Mdl.buildModel(e.def.model, e.def.params || {});
      const a = (i / Math.max(1, n)) * Math.PI * 2 + 0.6, rr = 1.4 + (e.def.radius || 0.5) * 1.6;
      const p = new THREE.Vector3(base.x + Math.cos(a) * rr, e.def.pos[1] || 0, base.z + Math.sin(a) * rr);
      m.root.position.copy(p); m.root.rotation.y = e.model.root.rotation.y + (Math.random() - 0.5);
      m.root.scale.setScalar(0.05);
      const id = `${e.id}__copy${++this.clones}`;
      const def: ThingDef = { ...e.def, id, pos: [p.x, p.y, p.z], label: false, radius: 0, reveal: undefined, hidden: false };
      const c: Entity = { id, def, model: m, isNpc: false, talk: false, hidden: false, copyOf: e.id, fx: { lift: 0, liftT: 0, spin: 0, scale: e.fx.scaleTarget, scaleTarget: e.fx.scaleTarget, lit: false, open: false, base: p.clone() } };
      this.world.current?.group.add(m.root);
      this.world.entities.set(id, c);
      if (e.fx.tint) this.magic.tint(c, e.fx.tint);
      this.magic.sparkle(p.clone().setY(1), '#ffd1f0');
    }
  }

  private transform(e: Entity, shape: string) {
    const key = SHAPES[shape] || (FOODS.includes(shape) ? `food:${shape}` : null);
    if (!key) return;
    const now = Mdl.buildModel(key, {});
    const old = e.model;
    if (!e.orig) e.orig = old;
    const r = old.root;
    now.root.position.copy(r.position); now.root.rotation.y = r.rotation.y;
    now.root.scale.setScalar(0.05);
    const parent = r.parent || this.world.current?.group;
    parent?.add(now.root);
    if (old !== e.orig) parent?.remove(old.root); else old.root.visible = false;
    e.model = now;
    e.fx.scaleTarget = key.startsWith('food:') ? Math.max(2.2, (old.height || 1) * 1.6) : Math.max(0.6, Math.min(2, e.def.scale || 1));
    e.fx.rainbow = false; e.fx.frozen = false; e.fx.glow = false;
    (e as any).__shape = shape;
    this.world.fx.burst(this.magic.top(e), '#c58bff', 70);
    this.world.fx.burst(r.position.clone().setY(0.6), '#ffffff', 18, { glyph: 'puff', size: 1.6, speed: 1.8, up: 0.6, gravity: -0.4, life: 1.3 });
    sfx('magic');
  }

  private restore(e: Entity) {
    if (e.orig && e.model !== e.orig) {
      const cur = e.model;
      cur.root.parent?.remove(cur.root);
      e.model = e.orig; e.orig = undefined;
      e.model.root.visible = true;
      e.model.root.position.copy(cur.root.position);
      (e as any).__shape = undefined;
    }
    // colours, size and spells back to normal
    for (const m of materialsOf(e.model.root)) { const b = m.userData.base; if (b) { m.color.copy(b.color); m.emissive.copy(b.emissive); m.emissiveIntensity = b.ei; if (b.rough !== undefined) { m.roughness = b.rough; m.metalness = b.metal; } } }
    Object.assign(e.fx, { tint: undefined, rainbow: false, frozen: false, glow: false, dance: 0, hop: 0, sing: 0, nap: 0, shake: 0, scurry: 0, vanished: false, scaleTarget: e.def.scale || 1 });
    this.magic.sparkle(this.magic.top(e), '#ffe27a');
  }

  // ------------------------------------------------------------------ word stars, zones, chatter
  private stars(): Entity[] { return [...this.world.entities.values()].filter((e) => e.def.params?.star && !e.hidden && !(e as any).__got); }

  /** 'done' = the child just said a star's words (nothing else to do); 'also' = collected inside a longer command */
  private async tryStar(text: string): Promise<'done' | 'also' | 'no'> {
    const hp = this.world.hero.pos;
    const said = lemmas(text);
    const near = this.stars().filter((e) => e.model.root.position.distanceTo(hp) < 9).sort((a, b) => a.model.root.position.distanceTo(hp) - b.model.root.position.distanceTo(hp));
    for (const e of near) {
      const want = lemmas(e.def.name).filter((w) => w !== 'the' && w !== 'a');
      const long = want.length > 3;
      const ok = long ? readScore(text, e.def.name) >= 0.72 : want.length > 0 && want.every((w) => said.includes(w));
      if (!ok) continue;
      this.collectStar(e);
      const extra = said.filter((w) => !want.includes(w) && !STAR_FILLER.has(w));
      const short = extra.length <= 1 && !said.some((w) => COMMAND_VERBS.has(w));
      if (short) { await this.say([{ who: 'star', text: e.def.name, zh: e.def.zh }]); await this.wizardSay('Yes! A word star for you!'); return 'done'; }
      return 'also';
    }
    return 'no';
  }

  private collectStar(e: Entity) {
    (e as any).__got = true;
    store.addStar(this.data.id, e.id);
    this.coach.heard('ok');
    this.magic.sparkle(this.magic.top(e), '#ffd76a');
    this.world.fx.burst(this.magic.top(e), '#ffd76a', 24, { stars: true, speed: 3, up: 3 });
    e.fx.scaleTarget = 0.001; e.fx.vanished = true;
    setTimeout(() => { e.hidden = true; }, 700);
    sfx('magic');
    this.updateStars(true);
    const left = this.stars().length;
    if (left === 0 && (this.data.words || []).length) setTimeout(() => this.companionSay(`太厉害了！这里的 ${(this.data.words || []).length} 颗单词星全部收集完啦！`), 1800);
  }

  private zoneNow = '';
  private chatterAt = new Map<string, number>();
  private starSeen = new Set<string>();
  private explore(t: number) {
    const hp = this.world.hero.pos;
    // zone title cards
    const z = (this.data.zones || []).find((zz) => Math.hypot(hp.x - zz.pos[0], hp.z - zz.pos[1]) < zz.r);
    if (z && z.id !== this.zoneNow) { this.zoneNow = z.id; this.hud.showZone(z.name, z.zh); }
    else if (!z && this.zoneNow) this.zoneNow = '';
    if (this.processing || !this.idle() || this.speaker.speaking || performance.now() - ((this.speaker as any).quietSince || 0) < 2500) return;
    // a star sings its word the first time the wizard comes close
    for (const e of this.stars()) {
      if (this.starSeen.has(e.id) || e.model.root.position.distanceTo(hp) > 4.5) continue;
      this.starSeen.add(e.id);
      this.say([{ who: 'star', text: e.def.name, zh: e.def.zh }]);
      this.hud.toast(`说出来就能收集：${e.def.name}`, 'star');
      return;
    }
    // people and animals chat as you pass by (key sentences of the lesson)
    for (const e of this.world.entities.values()) {
      const lines = e.def.chatter;
      if (!lines?.length || e.hidden || e.talk) continue;
      if (e.model.root.position.distanceTo(hp) > 5) continue;
      if (t - (this.chatterAt.get(e.id) ?? -1e9) < 40) continue;
      if (this.active && this.active.q.giver === e.id) continue;
      this.chatterAt.set(e.id, t);
      const line = lines[Math.floor(Math.random() * lines.length)];
      if (e.isNpc) this.say([{ who: e.id, text: line }]); else if (e.def.params?.voice) this.voiceThing(e, line);
      return;
    }
  }

  private nearest(f: (e: Entity) => boolean): Entity | undefined {
    const hp = this.world.hero.pos;
    return [...this.world.entities.values()].filter((e) => !e.hidden && f(e)).sort((a, b) => a.model.root.position.distanceTo(hp) - b.model.root.position.distanceTo(hp))[0];
  }

  /** put the carried thing down (in front, or on / in / under another thing) */
  private putDown(dest?: Entity, prep = 'on'): Entity | undefined {
    const h = this.world.hero;
    const id = h.carryId;
    if (!id) return undefined;
    const e = this.ent(id);
    h.hold(null, null);
    if (!e) return undefined;
    const root = e.model.root;
    root.scale.setScalar(e.fx.scaleTarget);
    let pos = this.front(1.2);
    if (dest) {
      const d = dest.model.root.position;
      const top = (dest.model.height || 1) * dest.model.root.scale.y;
      pos = new THREE.Vector3(d.x, prep === 'on' ? top * 0.95 : prep === 'in' ? top * 0.5 : 0, d.z);
      if (prep === 'under') pos.y = 0;
      if (prep === 'behind' || prep === 'next to' || prep === 'near') pos = d.clone().add(new THREE.Vector3(1.1, 0, 0));
    }
    root.position.copy(pos);
    e.def.pos = [pos.x, pos.y, pos.z];
    e.fx.base.copy(pos);
    this.world.current?.group.add(root);
    e.hidden = false;
    (e as any).__on = dest ? `${prep}:${dest.id}` : null;
    sfx('pop');
    return e;
  }

  conjure(kind: string, at: THREE.Vector3) {
    // animals are the real models (a duck is a duck), food comes out of the food cupboard
    const animal = SHAPES[kind];
    const m = animal ? Mdl.buildModel(animal, {}) : this.magic.makeFood(kind, at);
    if (animal) { m.root.position.copy(at); m.root.rotation.y = Math.atan2(this.world.hero.pos.x - at.x, this.world.hero.pos.z - at.z); m.root.scale.setScalar(0.01); this.magic.sparkle(at.clone().setY(1), '#ffd1f0'); }
    const id = `magic_${kind.replace(/\s+/g, '_')}_${++this.conjured}`;
    const def: ThingDef = { id, name: kind, model: animal || `food:${kind}`, pos: [at.x, 0, at.z], radius: 0, can: animal ? ['fly', 'pick'] : ['eat', 'pick', 'fly'], label: true };
    const e: Entity = { id, def, model: m, isNpc: false, talk: false, hidden: false, fx: { lift: 0, liftT: 0, spin: 0, scale: 1, scaleTarget: 1, lit: false, open: false, base: at.clone() } };
    this.world.current?.group.add(m.root);
    this.world.entities.set(id, e);
    this.lastTarget = id;
  }

  growTree(at: THREE.Vector3, flower = false) {
    const id = `magic_tree_${++this.conjured}`;
    const m = flower ? Mdl.buildModel('flowers') : Mdl.buildModel('fruit_tree');
    m.root.position.copy(at);
    m.root.scale.setScalar(0.05);
    const def: ThingDef = { id, name: flower ? 'flowers' : 'magic tree', aliases: flower ? ['flower'] : ['tree', 'new tree', 'fruit tree'], model: 'fruit_tree', pos: [at.x, 0, at.z], radius: flower ? 0 : 1, can: ['grow'], label: true };
    const e: Entity = { id, def, model: m, isNpc: false, talk: false, hidden: false, fx: { lift: 0, liftT: 0, spin: 0, scale: 0.05, scaleTarget: 1, lit: false, open: false, base: at.clone() } };
    this.world.current?.group.add(m.root);
    this.world.entities.set(id, e);
    this.magic.sparkle(at.clone().setY(1), '#9fe28a');
    this.lastTarget = id;
  }

  fruitRain(kind: string) {
    if (!FRUITS.includes(kind) && kind !== 'cake') kind = 'apple';
    const tree = this.nearest((x) => x.id.startsWith('magic_tree') || /tree/.test(x.def.model));
    const c = tree && tree.model.root.position.distanceTo(this.world.hero.pos) < 12 ? tree.model.root.position.clone() : this.front(3);
    const drops: { m: Mdl.Model; v: THREE.Vector3; y: number }[] = [];
    for (let i = 0; i < 9; i++) {
      const m = Mdl.buildModel(`food:${kind}`);
      const p = c.clone().add(new THREE.Vector3((Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 4));
      m.root.position.set(p.x, 4 + Math.random() * 3, p.z);
      this.world.current?.group.add(m.root);
      drops.push({ m, v: new THREE.Vector3(0, 0, 0), y: m.root.position.y });
    }
    const tick = (_t: number, dt: number) => {
      let alive = false;
      for (const d of drops) {
        const r = d.m.root;
        if (r.position.y > 0.01 || Math.abs(d.v.y) > 0.3) {
          alive = true;
          d.v.y -= 12 * dt;
          r.position.y += d.v.y * dt;
          if (r.position.y < 0) { r.position.y = 0; d.v.y = -d.v.y * 0.35; if (Math.abs(d.v.y) < 0.6) d.v.y = 0; }
        }
      }
      if (!alive) {
        this.world.hooks.delete(tick);
        // 3 of them stay as real things you can pick up and eat; the rest melt into sparkles
        drops.forEach((d, i) => {
          if (i >= 3) { this.world.current?.group.remove(d.m.root); return; }
          const id = `magic_${kind}_${++this.conjured}`;
          const pos = d.m.root.position;
          const def: ThingDef = { id, name: kind, model: `food:${kind}`, pos: [pos.x, 0, pos.z], radius: 0, can: ['eat', 'pick', 'fly'], label: i === 0 };
          this.world.entities.set(id, { id, def, model: d.m, isNpc: false, talk: false, hidden: false, fx: { lift: 0, liftT: 0, spin: 0, scale: 1, scaleTarget: 1, lit: false, open: false, base: pos.clone() } });
        });
      }
    };
    this.world.hooks.add(tick);
    sfx('magic');
  }

  private async readThing(e: Entity) {
    const a = this.active;
    if (a && a.q.kind === 'read' && a.q.giver === e.id) { await this.presentQuest(); return; }
    const q0 = this.available(e.id);
    if (q0 && q0.kind === 'read' && this.active?.q.id !== q0.id) { this.pauseActive(); await this.startQuest(q0); return; } // the child reads it, not Milo
    if (e.def.text) {
      this.hud.showRead(e.def.text, '', undefined);
      await this.say([{ who: 'wizard', text: e.def.text }]);
      setTimeout(() => this.hud.hideRead(), 6000);
      this.event(`read:${e.id}`);
    }
    const q = this.available(e.id);
    if (q && !this.active) await this.startQuest(q);
  }

  private async talkTo(e: Entity) {
    const h = this.world.hero;
    await h.faceToward(e.model.root.position);
    const lp = h.pos;
    if (e.isNpc && !e.fx.follow) e.model.root.rotation.y = Math.atan2(lp.x - e.model.root.position.x, lp.z - e.model.root.position.z);
    this.event(`talk:${e.id}`);
    if (this.active) {
      if (this.active.q.giver === e.id) { await this.presentQuest(); return; }
      // talking to someone else about the active quest (do / give / guide) is handled by events
    }
    const q = this.available(e.id);
    // the child can always switch to someone else's task; the unfinished one simply waits
    if (q) { this.pauseActive(); await this.startQuest(q); return; }
    const n = this.npc(e.id);
    if (!n) return;
    const done = this.data.quests.filter((x) => x.giver === e.id).every((x) => store.isDone(this.data.id, x.id));
    const lines = done && n.idle?.length ? n.idle : [n.greet];
    await this.say([{ who: e.id, text: lines[Math.floor(Math.random() * lines.length)] }]);
  }

  private async enterPortal(e: Entity) {
    const h = this.world.hero, wasRunning = h.running;
    h.running = true; // hurry to the portal
    const r = await this.goTo(e, 1.8);
    h.running = wasRunning;
    if (r !== 'arrived' && e.model.root.position.distanceTo(this.world.hero.pos) > 4) return;
    this.magic.sparkle(this.magic.top(e), '#9fd8ff');
    this.event(`enter:${e.portal}`);
    if (this.tut) return; // the tutorial ends at the portal; main enters the world
    this.opts.onEnter(e.portal!);
  }

  /** walking forward past places (guide quests, "go straight") */
  private checkPlaces() {
    for (const e of this.world.entities.values()) if (!e.hidden && e.model.root.position.distanceTo(this.world.hero.pos) < (e.def.radius || 1) + 2) this.event(`reach:${e.id}`);
  }

  // ------------------------------------------------------------------ per frame
  private tick(t: number, dt: number) {
    if (this.disposed) return;
    const h = this.world.hero;
    if ((this.bookT += dt) > 2) { this.bookT = 0; this.suggestSpells(); }
    for (const e of this.world.entities.values()) {
      if (e.hidden) continue;
      this.magic.animate(e, t, dt);
      if (e.fx.follow) {
        const p = e.model.root.position;
        const dx = h.pos.x - p.x, dz = h.pos.z - p.z, d = Math.hypot(dx, dz);
        if (d > 2.6) { const sp = Math.min(3.4, d - 2.4) * dt * 1.6; p.x += (dx / d) * sp; p.z += (dz / d) * sp; e.model.root.rotation.y = Math.atan2(dx, dz); e.mood = 'moving'; }
        else if (e.mood === 'moving') e.mood = undefined;
        const q = this.active?.q;
        if (q?.kind === 'guide' && q.to) {
          const dest = this.ent(q.to);
          if (dest) {
            // the follower trails ~2.5 m behind the wizard, so count it once the group has got there
            const dp = dest.model.root.position, r = dest.def.radius || 1;
            const fol = Math.hypot(dp.x - p.x, dp.z - p.z), me = Math.hypot(dp.x - h.pos.x, dp.z - h.pos.z);
            if (fol < r + 5.5 || (me < r + 3 && fol < r + 8)) { e.fx.follow = false; e.mood = undefined; this.succeed(q); }
          }
        }
      }
    }
    this.explore(t);
    // quiet companion nudge + tutor ladder
    const turn = this.childTurn();
    if (turn && this.idle()) {
      this.idleT += dt;
      const f = this.active?.q.id || 'free';
      if (this.idleT > 10 && this.nudged !== f && this.active) {
        this.nudged = f; this.idleT = 0;
        const q = this.active.q;
        if (q.kind === 'speak' && q.prompt) this.say([{ who: q.giver, text: q.prompt }]);
        else if (q.kind === 'magic' || q.kind === 'do' || q.kind === 'guide') this.hud.setHints(q.model);
      }
    } else this.idleT = 0;
    this.coach.tick(turn);
  }
}
