// In-game HUD: quest log, subtitles, mic status, hint cards, and the task panels
import { Orb } from './orb';
import { ICON, toastIcon } from './icons';
import type { SpellBook } from './spellbook';
// (listening / choose cards, reading card, writing box, video window).

export interface HudHandlers {
  onMicDown: () => void;
  onMicUp: () => void;
  onMicTap: () => void;
  onText: (text: string) => void;
  onCard: (text: string) => void;
  onButton: (name: 'home' | 'labels' | 'companion' | 'settings' | 'map' | 'book') => void;
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}
export function esc(s: string) { return (s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!)); }

export type MicState = 'idle' | 'armed' | 'listening' | 'thinking' | 'hush' | 'disabled';
const SKILL_COLOR: Record<string, string> = { 听: '#3f86e8', 说: '#e9a23b', 读: '#4cbf4f', 写: '#9b59d0' };

export class Hud {
  root: HTMLElement;
  book?: SpellBook;
  handsFree = false;
  private quest = el('div', 'quest-log glass');
  private crystals = el('div', 'crystals');
  private buttons = el('div', 'top-buttons');
  private sub = el('div', 'subtitle');
  private child = el('div', 'child-bubble');
  private recast = el('div', 'recast');
  private hints = el('div', 'hints');
  private mic = el('button', 'mic');
  private orb = new Orb();
  private micLabel = el('div', 'mic-label');
  private toastBox = el('div', 'toasts');
  private textRow = el('form', 'text-row');
  private textIn = el('input', 'text-in') as HTMLInputElement;
  private panel = el('div', 'task-panel glass');
  private read = el('div', 'read-card glass');
  private video = el('div', 'video-win');
  private tut = el('div', 'tut-bar');
  private upd = el('div', 'upd-bar');
  private updHidden = '';
  private micState: MicState = 'idle';
  private pressed = false;
  private hideSubTimer = 0;
  private hintTimer = 0;

  constructor(parent: HTMLElement, private h: HudHandlers) {
    this.root = el('div', 'hud');
    parent.appendChild(this.root);
    this.buttons.innerHTML = `
      <button data-b="home" title="回咒语岛" aria-label="回咒语岛">${ICON.home}</button>
      <button data-b="book" title="咒语表" aria-label="咒语表">${ICON.book}</button>
      <button data-b="map" title="课文地图" aria-label="课文地图">${ICON.map}</button>
      <button data-b="labels" title="单词标签" aria-label="单词标签">${ICON.labels}</button>
      <button data-b="companion" title="小伙伴" aria-label="小伙伴">${ICON.companion}</button>
      <button data-b="settings" title="设置" aria-label="设置">${ICON.settings}</button>`;
    this.buttons.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest('button')?.getAttribute('data-b'); if (b) h.onButton(b as any); });
    this.mic.appendChild(this.orb.root);
    this.mic.setAttribute('aria-label', '麦克风');
    const micWrap = el('div', 'mic-wrap');
    micWrap.append(this.mic, this.micLabel);
    const down = (e: Event) => {
      e.preventDefault();
      if (this.handsFree) { if (this.micState === 'hush') { this.toast('先听他说完，马上就轮到你啦', '👂'); return; } h.onMicTap(); return; }
      if (this.micState === 'disabled' || this.micState === 'hush' || this.pressed) return;
      this.pressed = true; h.onMicDown();
    };
    const up = (e: Event) => { e.preventDefault(); if (this.handsFree || !this.pressed) return; this.pressed = false; h.onMicUp(); };
    this.mic.addEventListener('pointerdown', down);
    this.mic.addEventListener('pointerup', up);
    this.mic.addEventListener('pointerleave', up);
    this.mic.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => { if (e.code === 'Space' && !(document.activeElement instanceof HTMLInputElement) && !e.repeat && this.root.style.display !== 'none') down(e); });
    window.addEventListener('keyup', (e) => { if (e.code === 'Space' && !(document.activeElement instanceof HTMLInputElement)) up(e); });
    this.textIn.placeholder = '打字说话（调试用）：输入英文后回车';
    this.textIn.autocomplete = 'off';
    this.textRow.append(this.textIn);
    this.textRow.addEventListener('submit', (e) => { e.preventDefault(); const v = this.textIn.value.trim(); if (v) { h.onText(v); this.textIn.value = ''; } });
    this.hints.addEventListener('click', (e) => { const c = (e.target as HTMLElement).closest('.hint-card') as HTMLElement | null; if (c?.dataset.text) h.onCard(c.dataset.text); });
    const bottom = el('div', 'bottom');
    bottom.append(this.recast, this.sub, this.child, this.hints, micWrap, this.textRow);
    this.panel.style.display = 'none';
    this.read.style.display = 'none';
    this.video.style.display = 'none';
    this.root.append(this.quest, this.crystals, this.buttons, this.tut, this.upd, this.video, this.read, this.panel, bottom, this.toastBox);
    this.tut.style.display = 'none';
    this.setMic('idle');
  }

  show(on: boolean) { this.root.style.display = on ? '' : 'none'; }
  setButtons(names: string[]) { this.buttons.querySelectorAll('button').forEach((b) => { (b as HTMLElement).style.display = names.includes(b.getAttribute('data-b')!) ? '' : 'none'; }); }

  private lastQuests: { id: string; skill: string; title: string; giver: string; done: boolean; active: boolean }[] = [];
  setWorldTitle(title: string, zh: string, grade = '') { this.quest.dataset.title = title; this.quest.dataset.zh = zh; this.quest.dataset.grade = grade; this.setQuests([]); }

  setQuests(list: { id: string; skill: string; title: string; giver: string; done: boolean; active: boolean }[]) {
    this.lastQuests = list;
    const t = this.quest.dataset.title || '', zh = this.quest.dataset.zh || '', grade = this.quest.dataset.grade || '';
    const n = list.filter((q) => q.done).length;
    if (!this.quest.dataset.wired) { this.quest.dataset.wired = '1'; this.quest.addEventListener('click', () => this.quest.classList.toggle('open')); }
    const nextIdx = list.findIndex((q) => q.active) >= 0 ? list.findIndex((q) => q.active) : list.findIndex((q) => !q.done);
    this.quest.innerHTML = `<div class="q-head"><div class="q-top"><span class="q-book">${esc(t)}</span><span class="q-grade">${esc(grade)}</span></div><div class="q-zh">${esc(zh)}</div>` +
      (list.length ? `<div class="q-pips">${list.map((q) => `<i class="${q.done ? 'done' : q.active ? 'now' : ''}"></i>`).join('')}<span>${n} / ${list.length}</span></div>` : '') + `</div>` +
      (list.length ? '' : `<div class="q-empty">说 <span class="en">Go to …</span> 走进任意一道传送门</div>`) +
      `<div class="q-list">` + list.map((q, i) => `<div class="q-item ${q.done ? 'done' : ''} ${q.active ? 'active' : ''} ${i === nextIdx ? 'next' : ''}"><i style="--sk:${SKILL_COLOR[q.skill] || '#888'}">${q.skill}</i><span>${esc(q.title)}</span><small>${q.done ? ICON.check : esc(q.giver)}</small></div>`).join('') + `</div>`;
  }

  private starsView = '';
  setCrystals(n: number, badges: number) { this.crystals.innerHTML = `${this.starsView}<span title="魔法水晶">${ICON.gem}<b>${n}</b></span><span title="课文徽章"><img src="./ui/medal.webp" alt=""/><b>${badges}</b></span>`; this.lastCrystals = [n, badges]; }
  private lastCrystals: [number, number] = [0, 0];
  /** word stars of this world: got / total (hidden on the island) */
  setStars(got: number, total: number, pop = false) {
    this.starsView = total ? `<span class="stars ${pop ? 'pop' : ''}" title="单词星">${ICON.star}<b>${got}/${total}</b></span>` : '';
    this.setCrystals(...this.lastCrystals);
  }
  /** a title card when walking into a named place */
  showZone(name: string, zh: string) {
    let z = this.root.querySelector('.zone-card') as HTMLElement | null;
    if (!z) { z = el('div', 'zone-card'); this.root.appendChild(z); }
    z.innerHTML = `<i></i><b>${esc(name)}</b><small>${esc(zh)}</small><i></i>`;
    z.classList.remove('on'); void z.offsetWidth; z.classList.add('on');
    clearTimeout((z as any).__t); (z as any).__t = setTimeout(() => z!.classList.remove('on'), 2600);
  }

  setTutorial(i: number, n: number, hint: string) {
    if (i < 0) { this.tut.style.display = 'none'; return; }
    this.tut.style.display = '';
    this.tut.innerHTML = `<b>魔法入门 ${i + 1} / ${n}</b><i></i>试着说<span class="en">${esc(hint)}</span>`;
  }

  showLine(name: string, text: string, zh?: string) {
    clearTimeout(this.hideSubTimer);
    const who = name.replace(/^🎧\s*/, '');
    this.sub.innerHTML = `<span class="who ${name === 'Milo' ? 'milo' : ''}">${esc(who)}</span><span class="say">${esc(text).replace(/^👂\s*/, '')}</span>${zh ? `<span class="zh">${esc(zh)}</span>` : ''}`;
    this.sub.classList.add('on');
  }
  lineDone(delay = 2600) { clearTimeout(this.hideSubTimer); this.hideSubTimer = window.setTimeout(() => this.sub.classList.remove('on'), delay); }

  showChild(text: string, final = false) {
    if (!text) { this.child.classList.remove('on'); return; }
    this.child.innerHTML = `<span class="me">你</span><span class="t">${esc(text)}</span>${final ? '' : '<span class="dots">…</span>'}`;
    this.child.classList.add('on');
  }

  showRecast(text: string | null) {
    if (!text) { this.recast.classList.remove('on'); return; }
    this.recast.innerHTML = `<span class="tag">英语这样说</span><span class="en">${esc(text)}</span>`;
    this.recast.classList.add('on');
    setTimeout(() => this.recast.classList.remove('on'), 7000);
  }

  setHints(cards: string[], starter?: string) {
    clearTimeout(this.hintTimer);
    if (!cards.length && !starter) { this.hints.innerHTML = ''; this.hints.classList.remove('on'); return; }
    this.hints.innerHTML = (starter ? `<div class="starter">${esc(starter)}</div>` : '') + cards.map((c) => `<button class="hint-card" data-text="${esc(c)}">${ICON.sound}<span>${esc(c)}</span></button>`).join('');
    this.hints.classList.add('on');
    this.hintTimer = window.setTimeout(() => this.hints.classList.remove('on'), 30000);
  }

  // ---------- task panels ----------
  showChoices(prompt: string, options: string[], onPick: (i: number) => void, onReplay?: () => void) {
    this.panel.style.display = '';
    this.panel.innerHTML = `<div class="tp-kicker">${onReplay ? '听力' : '选择'}</div><div class="tp-title">${esc(prompt)}</div><div class="tp-opts">${options.map((o, i) => `<button class="opt" data-i="${i}"><b><em>${'ABCD'[i]}</em></b><span>${esc(o)}</span></button>`).join('')}</div>` +
      `<div class="tp-foot"><span>说出 A、B、C，或者点一下</span>${onReplay ? `<button class="replay">${ICON.replay}再听一遍</button>` : ''}</div>`;
    this.panel.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => onPick(+(b as HTMLElement).dataset.i!)));
    this.panel.querySelector('.replay')?.addEventListener('click', () => onReplay?.());
  }
  markChoice(i: number, ok: boolean) {
    const b = this.panel.querySelector(`.opt[data-i="${i}"]`);
    b?.classList.add(ok ? 'right' : 'wrong');
    if (!ok) setTimeout(() => b?.classList.remove('wrong'), 1200);
  }

  showWrite(prompt: string, zh: string, onSubmit: (t: string) => void) {
    this.panel.style.display = '';
    this.panel.innerHTML = `<div class="tp-kicker">书写</div><div class="tp-title">${esc(prompt)}</div><div class="tp-zh">${esc(zh)}</div><form class="tp-write"><input class="tp-in" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="用英文写在这里"/><button>${ICON.pen}<span>写好了</span></button></form>`;
    const form = this.panel.querySelector('form')!;
    const inp = this.panel.querySelector('.tp-in') as HTMLInputElement;
    form.addEventListener('submit', (e) => { e.preventDefault(); const v = inp.value.trim(); if (v) onSubmit(v); });
    setTimeout(() => inp.focus(), 100);
  }
  writeResult(ok: boolean) {
    const inp = this.panel.querySelector('.tp-in') as HTMLInputElement | null;
    if (!inp) return;
    inp.classList.add(ok ? 'right' : 'wrong');
    setTimeout(() => inp.classList.remove('wrong'), 1200);
  }

  showRead(text: string, prompt: string, options?: string[]) {
    this.read.style.display = '';
    this.read.innerHTML = `<div class="tp-kicker">阅读</div><div class="rc-text">${esc(text).split('\n').map((l) => `<p>${l}</p>`).join('')}</div>${prompt ? `<div class="rc-prompt">${esc(prompt)}</div>` : ''}` +
      (options ? `<div class="tp-opts">${options.map((o, i) => `<button class="opt" data-i="${i}"><b><em>${'ABCD'[i]}</em></b><span>${esc(o)}</span></button>`).join('')}</div>` : '');
    if (options) this.read.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => this.h.onText('ABCD'[+(b as HTMLElement).dataset.i!])));
  }
  hideRead() { this.read.style.display = 'none'; }

  showVideo(url: string) {
    this.video.style.display = '';
    this.video.innerHTML = `<video src="${url}" autoplay muted loop playsinline></video><div class="vw-tag">${ICON.ear}仔细听</div>`;
  }
  hideVideo() { this.video.style.display = 'none'; this.video.innerHTML = ''; }

  hidePanels() { this.panel.style.display = 'none'; this.panel.innerHTML = ''; this.hideRead(); this.hideVideo(); }

  // ---------- mic ----------
  setMic(state: MicState) {
    this.micState = state;
    this.mic.className = 'mic ' + state + (this.handsFree ? ' hf' : '');
    const hf = this.handsFree;
    this.micLabel.textContent = {
      idle: hf ? '麦克风休息中' : '按住说话 · 空格键',
      armed: '水晶球在听 · 直接说英语',
      listening: hf ? '在听… 说完自动发送' : '在听… 松开发送',
      thinking: '小魔法师在想…',
      hush: '先听他说完',
      disabled: '请稍等…',
    }[state];
    this.micLabel.classList.toggle('your-turn', state === 'armed');
    this.orb.setState(state);
  }
  /** mic loudness and the loudness of whoever is talking in the game */
  setLevelMeter(level: number, voice = 0) { this.orb.setLevels(Math.min(1, level * 6), voice); }

  toast(text: string, icon = '✨') {
    const t = el('div', 'toast glass', `<span class="ti">${toastIcon(icon)}</span><span>${esc(text.replace(/\s*💎\s*/g, ' '))}</span>`);
    this.toastBox.appendChild(t);
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3200);
  }

  /** the small “update ready” notice under the counters */
  setUpdate(v: { ready: { version: string; notes: string[] } | null; installer: { version: string; notes: string[]; state: string; progress: number } | null; state: string; progress: number }, on: { apply: () => void; installer: () => void }) {
    let html = '', key = '';
    if (v.installer && v.installer.state !== 'opened') {
      key = 'i' + v.installer.version;
      const busy = v.installer.state === 'downloading';
      html = `<span class="ub-dot"></span><b>新版本 ${esc(v.installer.version)}</b><span class="ub-note">${esc(v.installer.notes[0] || '需要重新安装一次')}</span>` +
        (busy ? `<span class="ub-prog"><i style="width:${Math.round(v.installer.progress * 100)}%"></i></span>` : `<button class="ub-go" data-a="installer">下载安装</button>`) + `<button class="ub-x" data-a="later">${ICON.close}</button>`;
    } else if (v.ready) {
      key = 'r' + v.ready.version;
      html = `<span class="ub-dot"></span><b>新版本 ${esc(v.ready.version)} 准备好啦</b><span class="ub-note">${esc(v.ready.notes[0] || '')}</span><button class="ub-go" data-a="apply">马上更新</button><button class="ub-x" data-a="later">${ICON.close}</button>`;
    } else if (v.state === 'downloading') {
      key = 'd';
      html = `<span class="ub-dot"></span><b>正在下载新版本</b><span class="ub-prog"><i style="width:${Math.round(v.progress * 100)}%"></i></span><span class="ub-pct">${Math.round(v.progress * 100)}%</span>`;
    }
    if (!html || key === this.updHidden) { this.upd.classList.remove('on'); return; }
    this.upd.classList.toggle('big', !!v.ready);
    if (this.upd.dataset.html !== html) {
      this.upd.dataset.html = html; this.upd.innerHTML = html;
      this.upd.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
        const a = (b as HTMLElement).dataset.a;
        if (a === 'apply') on.apply(); else if (a === 'installer') on.installer(); else { this.updHidden = key; this.upd.classList.remove('on'); }
      }));
    }
    this.upd.classList.add('on');
  }

  textInput(on: boolean) { this.textRow.style.display = on ? '' : 'none'; }
}
