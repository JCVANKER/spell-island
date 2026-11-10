// The spell book (咒语表): every world's spells, built from the lesson's own words and sentence patterns.
// A small scroll in the corner suggests a few spells that fit right here; the full book lists them all
// (on Spell Island it opens with the portal map: "Go to …"). Reading a spell out loud casts it, and it
// gets a tick. Tapping only plays how it sounds: the child still has to say it.
import { el, esc } from './hud';
import { ICON } from './icons';

export type Group = 'colour' | 'shape' | 'move' | 'alive' | 'sky' | 'magic';
export interface SpellEntry { say: string; zh: string; group: Group; cast: boolean }
export interface PortalEntry { title: string; zh: string; grade: string; color: string; done: boolean }
export interface BookWorld { title: string; titleZh: string; patterns: string[]; entries: SpellEntry[]; portals?: PortalEntry[] }

const svg = (body: string) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const GROUP: Record<Group, { zh: string; en: string; icon: string }> = {
  colour: { zh: '变颜色', en: 'Colours', icon: svg('<path d="M12 3.5c-4.9 0-8.5 3.6-8.5 8 0 4 3.1 7 6.6 7 1.4 0 1.9-.9 1.9-1.8 0-1.3-1-1.6-1-2.7 0-1 .8-1.6 1.9-1.6h2.3c2.9 0 5.3-2 5.3-4.8 0-2.6-3.3-4.1-8.5-4.1z"/><circle cx="7.8" cy="11" r="1"/><circle cx="10.5" cy="7.6" r="1"/><circle cx="15" cy="7.8" r="1"/>') },
  shape: { zh: '变身 · 变大变小', en: 'Change', icon: svg('<path d="m4 20 10.5-10.5"/><path d="m13 8 3 3"/><path d="M17 3.5v3M15.5 5h3M20 9.5v2M19 10.5h2M10 3.8v1.8M9.1 4.7h1.8"/>') },
  move: { zh: '飞起来 · 挪一挪', en: 'Move & Fly', icon: svg('<path d="M20 4c-6.5.4-11.6 4.8-13.5 12.5"/><path d="M20 4c-.6 5.8-4.4 10.3-11 11.6"/><path d="M4 20l2.5-3.5"/>') },
  alive: { zh: '动起来', en: 'Come alive', icon: svg('<path d="M9 18.5V6l10-2v12"/><circle cx="6.5" cy="18.5" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>') },
  sky: { zh: '天空与天气', en: 'Sky & Weather', icon: svg('<path d="M7.5 18.5h9.5a3.5 3.5 0 0 0 .4-7A5.5 5.5 0 0 0 7 10.5a4 4 0 0 0 .5 8z"/><path d="M16 4.5v1.3M20.3 6.3l-.9.9M21.8 10.5h-1.3"/>') },
  magic: { zh: '神奇魔法', en: 'Wonders', icon: ICON.spark },
};
const ORDER: Group[] = ['colour', 'shape', 'move', 'alive', 'sky', 'magic'];

export class SpellBook {
  private dock = el('div', 'spell-dock glass');
  private modal = el('div', 'spell-book');
  private w: BookWorld | null = null;
  private shown: string[] = [];
  private collapsed = false;
  isOpen = false;

  constructor(parent: HTMLElement, private hear: (text: string) => void) {
    try { this.collapsed = localStorage.getItem('spell-dock-collapsed') === '1'; } catch { /* private mode */ }
    parent.append(this.dock, this.modal);
    this.dock.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('.sd-all')) { this.open(); return; }
      if (t.closest('.sd-head')) { this.collapsed = !this.collapsed; try { localStorage.setItem('spell-dock-collapsed', this.collapsed ? '1' : '0'); } catch { /* ignore */ } this.renderDock(); return; }
      const it = t.closest('[data-say]') as HTMLElement | null;
      if (it) this.tapped(it);
    });
    this.modal.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('.sb-close') || t === this.modal) { this.close(); return; }
      const it = t.closest('[data-say]') as HTMLElement | null;
      if (it) this.tapped(it);
    });
    this.dock.style.display = 'none';
  }

  private tapped(it: HTMLElement) {
    it.classList.remove('heard'); void it.offsetWidth; it.classList.add('heard');
    this.hear(it.dataset.say!);
  }

  setWorld(w: BookWorld | null) {
    this.w = w; this.shown = [];
    this.close();
    this.renderDock();
  }

  /** the few spells the scroll shows right now */
  suggest(says: string[]) {
    if (says.join('|') === this.shown.join('|')) return;
    this.shown = says;
    this.renderDock();
  }

  showDock(on: boolean) { this.dock.style.display = on && this.w ? '' : 'none'; }

  /** a spell from the book was cast: tick it (and close the book so the child sees the magic) */
  markCast(say: string) {
    const e = this.w?.entries.find((x) => x.say === say);
    if (!e) return;
    const first = !e.cast;
    e.cast = true;
    for (const node of [this.dock, this.modal]) node.querySelectorAll(`[data-say="${CSS.escape(say)}"]`).forEach((n) => { n.classList.add('cast', 'just'); setTimeout(() => n.classList.remove('just'), 1400); });
    this.updateCounts();
    if (this.isOpen) setTimeout(() => this.close(), 700);
    return first;
  }

  private counts() { const all = this.w?.entries || []; return [all.filter((e) => e.cast).length, all.length]; }
  private updateCounts() {
    const [n, t] = this.counts();
    this.dock.querySelectorAll('.sd-n').forEach((x) => (x.textContent = `${n}/${t}`));
    this.modal.querySelectorAll('.sb-n').forEach((x) => (x.textContent = `${n} / ${t}`));
    this.modal.querySelectorAll('.sb-prog i').forEach((x) => ((x as HTMLElement).style.width = `${t ? Math.round((n / t) * 100) : 0}%`));
  }

  private card(e: SpellEntry, cls: string) {
    return `<button class="${cls} ${e.cast ? 'cast' : ''}" data-say="${esc(e.say)}"><i class="g">${GROUP[e.group].icon}</i><b>${esc(e.say)}</b><span>${esc(e.zh)}</span><em class="ok">${ICON.check}</em><em class="ear">${ICON.sound}</em></button>`;
  }

  private renderDock() {
    const w = this.w;
    if (!w) { this.dock.innerHTML = ''; return; }
    const [n, t] = this.counts();
    const items = this.shown.map((s) => w.entries.find((e) => e.say === s)).filter(Boolean) as SpellEntry[];
    this.dock.classList.toggle('collapsed', this.collapsed);
    this.dock.innerHTML = `<div class="sd-head"><span class="sd-ic">${ICON.book}</span><b>咒语表</b><small>Spell Book</small><span class="sd-n">${n}/${t}</span><button class="sd-all">全部</button></div>` +
      (this.collapsed ? '' : `<div class="sd-list">${items.map((e) => this.card(e, 'sd-item')).join('')}</div><div class="sd-tip">看着咒语，大声念出来</div>`);
  }

  open() {
    const w = this.w;
    if (!w) return;
    const [n, t] = this.counts();
    const groups = ORDER.map((g) => [g, w.entries.filter((e) => e.group === g)] as const).filter(([, l]) => l.length);
    this.modal.innerHTML = `<div class="sb-panel glass">
      <header><div class="sb-kicker">Spell Book · 咒语表</div><h2>${esc(w.titleZh)}的咒语</h2>
        <div class="sb-meta"><div class="sb-prog"><i style="width:${t ? Math.round((n / t) * 100) : 0}%"></i></div><span>已施展 <b class="sb-n">${n} / ${t}</b></span></div>
        <button class="sb-close" aria-label="关闭">${ICON.close}</button></header>
      <div class="sb-body">
        <p class="sb-how">看着咒语<b>大声念出来</b>，Milo 就会施魔法。不会读？点一下先听一听。</p>
        ${w.portals?.length ? `<section><h3>${ICON.map}<span>传送门 · 去上课</span><small>Go to …</small></h3><div class="sb-portals">${w.portals.map((p) => `<button class="sb-portal ${p.done ? 'done' : ''}" style="--c:${p.color}" data-say="${esc(`Go to ${p.title}!`)}"><small>${esc(p.grade)}</small><b>${esc(p.title)}</b><span>${esc(p.zh)}</span><em>Go to ${esc(p.title)}!</em>${p.done ? `<i class="medal">${ICON.check}</i>` : ''}</button>`).join('')}</div></section>` : ''}
        ${w.patterns.length && !w.portals?.length ? `<section><h3>${ICON.book}<span>本课句型</span><small>Patterns</small></h3><div class="sb-patterns">${w.patterns.map((p) => `<button data-say="${esc(p)}">${ICON.sound}<span>${esc(p)}</span></button>`).join('')}</div></section>` : ''}
        ${groups.map(([g, l]) => `<section><h3>${GROUP[g].icon}<span>${GROUP[g].zh}</span><small>${GROUP[g].en}</small></h3><div class="sb-grid">${l.map((e) => this.card(e, 'sb-card')).join('')}</div></section>`).join('')}
      </div></div>`;
    this.modal.classList.add('on');
    this.isOpen = true;
  }

  close() { this.modal.classList.remove('on'); this.isOpen = false; }
}

/** which page of the book an action belongs on */
export function groupOf(type: string): Group {
  if (type === 'tint') return 'colour';
  if (['transform', 'clone', 'conjure', 'grow_size', 'shrink', 'hero_size', 'restore'].includes(type)) return 'shape';
  if (['move', 'levitate', 'cloud_ride', 'broom_on', 'summon', 'spin'].includes(type)) return 'move';
  if (['dance', 'sing', 'hop', 'shake', 'nap', 'emote', 'everyone', 'scurry'].includes(type)) return 'alive';
  if (['weather', 'season', 'night', 'day', 'rainbow', 'fireworks', 'bubbles', 'butterflies', 'shower', 'whirlwind', 'shooting_stars', 'fruit_rain', 'grow_tree'].includes(type)) return 'sky';
  return 'magic';
}
