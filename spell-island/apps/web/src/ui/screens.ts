// Full-screen overlays: title, lesson map (all open), world-complete badge, settings, portal transition.
import type { LessonWorld } from '@spell/shared';
import { COMPANIONS } from '@spell/shared';
import { el, esc } from './hud';
import { ICON } from './icons';
import { store } from '../state/save';
import type { Health } from '../api';

export interface WorldMapInfo {
  title: string; titleZh: string; bounds: number;
  zones: { name: string; zh: string; pos: [number, number]; r: number }[];
  paths: [number, number][][]; water: { x: number; z: number; r: number; sx?: number }[];
  npcs: { x: number; z: number; name: string; mark: boolean }[];
  stars: { x: number; z: number; sentence: boolean }[];
  hero: { x: number; z: number; heading: number };
  starsGot: number; starsTotal: number;
}

export class Screens {
  constructor(private root: HTMLElement) {}

  clear() { this.root.querySelectorAll('.overlay:not(.picker):not(.portal-fx)').forEach((o) => o.remove()); }
  get open() { return !!this.root.querySelector('.overlay'); }

  private modal(cls: string, html: string, closable = true): HTMLElement {
    const wrap = el('div', 'overlay ' + cls);
    const box = el('div', 'panel glass', html);
    wrap.appendChild(box);
    if (closable) {
      const x = el('button', 'close', ICON.close);
      x.onclick = () => wrap.remove();
      box.appendChild(x);
      wrap.addEventListener('click', (e) => { if (e.target === wrap) wrap.remove(); });
    }
    this.root.appendChild(wrap);
    return wrap;
  }

  title(onStart: () => void, health: Health | null) {
    const status = health
      ? `<span class="ok">豆包语音已连接</span>${health.llm ? `<span class="ok">豆包大模型已连接</span>` : '<span class="dim">规则模式</span>'}`
      : '<span class="warn">未连接后端 · 演示模式</span>';
    const w = el('div', 'overlay title-screen', `
      <video class="title-video" src="./video/title.mp4" autoplay muted loop playsinline></video>
      <div class="title-box">
        <div class="t-en">Spell Island</div>
        <h1>咒语岛</h1>
        <div class="t-rule"><i></i><span></span><i></i></div>
        <p class="tagline"><span>用你的声音指挥小魔法师 Milo</span><br/><span>念出英语咒语，魔法就会发生</span></p>
        <button class="big-btn start"><span>开始冒险</span></button>
        <p class="status">${status}</p>
        <p class="credit">${['需要麦克风', '戴耳机效果更好', '三年级至九年级', '十个课文世界'].map((x) => `<span>${x}</span>`).join('<i>·</i>')}</p>
      </div>`);
    w.querySelector('.start')!.addEventListener('click', () => { w.remove(); onStart(); });
    this.root.appendChild(w);
  }

  map(worlds: LessonWorld[], current: string | null, onPick: (id: string) => void) {
    const html = `<div class="kicker">World Map</div><h3>课文世界地图</h3><p class="sub">全部开放，想去哪课就去哪课。也可以直接说 <span class="en">Go to Rainbow Zoo!</span></p>
      <div class="map-grid">${worlds.map((w) => {
        const n = (store.data.done[w.id] || []).length, t = w.quests.length;
        return `<button class="map-card ${w.id === current ? 'cur' : ''} ${store.data.badges.includes(w.id) ? 'got' : ''}" data-id="${w.id}">
          <span class="mc-grade">${esc(w.grade)}</span><b>${esc(w.title)}</b><i>${esc(w.titleZh)}</i><small>${esc(w.unit.replace(/^Unit · /, ""))}</small>
          <span class="mc-bar"><span style="width:${t ? (n / t) * 100 : 0}%"></span></span><span class="mc-n">${ICON.gem}${n} / ${t}${store.data.badges.includes(w.id) ? ' <img src="./ui/medal.webp" alt="已通关"/>' : ''}</span></button>`;
      }).join('')}
        <button class="map-card home" data-id="island"><span class="mc-grade">中心</span><b>Spell Island</b><i>咒语岛</i><small>魔法塔和传送门</small></button>
      </div>`;
    const m = this.modal('map-modal', html);
    m.querySelectorAll('.map-card').forEach((b) => b.addEventListener('click', () => { m.remove(); onPick((b as HTMLElement).dataset.id!); }));
  }

  /** the map of the world you are in: zones, paths, water, friends (with "!" when they need help), word stars and you */
  worldMap(info: WorldMapInfo, onAllWorlds: () => void) {
    const B = info.bounds + 4, S = 100 / B; // svg units: -100..100
    const P = (x: number, z: number) => `${(x * S).toFixed(1)},${(z * S).toFixed(1)}`;
    const paths = info.paths.map((pts) => `<polyline points="${pts.map(([x, z]) => P(x, z)).join(' ')}" class="wm-path" style="stroke-width:${(3 * S).toFixed(1)}"/>`).join('');
    const water = info.water.map((w) => `<ellipse cx="${(w.x * S).toFixed(1)}" cy="${(w.z * S).toFixed(1)}" rx="${(w.r * S * (w.sx || 1)).toFixed(1)}" ry="${(w.r * S).toFixed(1)}" class="wm-water"/>`).join('');
    const zones = info.zones.map((z) => `<g class="wm-zone"><circle cx="${(z.pos[0] * S).toFixed(1)}" cy="${(z.pos[1] * S).toFixed(1)}" r="${(z.r * S).toFixed(1)}"/><text x="${(z.pos[0] * S).toFixed(1)}" y="${(z.pos[1] * S - 2).toFixed(1)}">${esc(z.name)}</text><text class="zh" x="${(z.pos[0] * S).toFixed(1)}" y="${(z.pos[1] * S + 5).toFixed(1)}">${esc(z.zh)}</text></g>`).join('');
    const stars = info.stars.map((st) => `<path class="wm-star" transform="translate(${P(st.x, st.z)}) scale(${st.sentence ? 1.25 : 1})" d="M0,-3.6 1,-1.1 3.6,-1.1 1.5,0.5 2.3,3.1 0,1.6 -2.3,3.1 -1.5,0.5 -3.6,-1.1 -1,-1.1Z"/>`).join('');
    const npcs = info.npcs.map((n) => `<g class="wm-npc ${n.mark ? 'mk' : ''}" transform="translate(${P(n.x, n.z)})"><circle r="2.6"/>${n.mark ? `<text y="-4.5">!</text>` : ''}<text class="nm" y="7.5">${esc(n.name)}</text></g>`).join('');
    const h = info.hero;
    const hero = `<g class="wm-hero" transform="translate(${P(h.x, h.z)}) rotate(${(-h.heading * 180) / Math.PI + 180})"><path d="M0,-4.5 3.2,3.2 0,1.6 -3.2,3.2Z"/></g>`;
    const html = `<div class="kicker">${esc(info.title)}</div><h3>${esc(info.titleZh)} · 地图</h3>
      <p class="sub">金色星星是还没收集的单词星，<b class="wm-bang">!</b> 表示有人需要帮忙。说 <span class="en">Go to …</span> 就能走过去。</p>
      <svg class="wm" viewBox="-104 -104 208 208"><circle class="wm-ground" r="${(info.bounds * S).toFixed(1)}"/>${water}${paths}${zones}${stars}${npcs}${hero}</svg>
      <div class="wm-foot"><span>${ICON.star} ${info.starsGot} / ${info.starsTotal} 单词星</span><button class="ghost-btn">全部课文世界</button></div>`;
    const m = this.modal('map-modal wmap', html);
    m.querySelector('.ghost-btn')!.addEventListener('click', () => { m.remove(); onAllWorlds(); });
  }

  badge(w: LessonWorld, onClose: () => void) {
    const html = `<img class="badge-big" src="./ui/medal.webp" alt=""/><div class="kicker">World Cleared</div><h3>${esc(w.titleZh)} 通关</h3><p class="sub">${esc(w.title)} · ${esc(w.grade)}</p>
      <div class="words">${w.vocab.slice(0, 14).map((v) => `<span>${esc(v)}</span>`).join('')}</div>
      <div class="kicker">学会的句型</div><div class="patterns">${w.patterns.map((p) => `<div>${esc(p)}</div>`).join('')}</div>
      <button class="big-btn">继续冒险</button>`;
    const m = this.modal('badge-modal', html, false);
    let closed = false;
    const close = () => { if (closed) return; closed = true; m.remove(); onClose(); };
    m.querySelector('.big-btn')!.addEventListener('click', close);
    setTimeout(close, 9000); // never leave the always-on mic blocked
  }

  settings(health: Health | null, cb: { onChange: () => void; onCompanion: () => void; onReset: () => void }, upd?: { view: { platform: string; version: string; build: string; state: string; progress: number; error?: string; ready: unknown }; check: () => void }) {
    const s = store.data.settings;
    const c = COMPANIONS.find((x) => x.id === store.data.companion);
    const html = `<div class="kicker">Settings</div><h3>设置</h3>
      <label class="set-row"><b>自动开麦</b><input type="checkbox" data-k="autoMic" ${s.autoMic ? 'checked' : ''}/><span class="hint">麦克风一直开着，角色说话时自动静音；关掉后改为按住说话</span></label>
      <label class="set-row"><b>小伙伴</b><input type="checkbox" data-k="companion" ${s.companion ? 'checked' : ''}/><span class="hint">右下角的 ${c ? esc(c.name) : '小伙伴'}：提示魔法、卡住时提问引导</span></label>
      <div class="set-row"><b>换小伙伴</b><button data-a="pick">重新选择</button></div>
      <label class="set-row"><b>背景音乐</b><input type="checkbox" data-k="bgm" ${s.bgm !== false ? 'checked' : ''}/><span class="hint">轻柔的背景音乐，有人说话时会自动变小</span></label>
      <label class="set-row"><b>中文提示</b><input type="checkbox" data-k="showZh" ${s.showZh ? 'checked' : ''}/></label>
      <label class="set-row"><b>打字输入框</b><input type="checkbox" data-k="textInput" ${s.textInput ? 'checked' : ''}/><span class="hint">没有麦克风时可以打字</span></label>
      <div class="set-row"><b>语速</b><div class="seg">${[[0.85, '慢'], [0.93, '稍慢'], [1, '正常']].map(([v, n]) => `<button data-rate="${v}" class="${Math.abs(s.voiceRate - (v as number)) < 0.01 ? 'on' : ''}">${n}</button>`).join('')}</div></div>
      <div class="set-row"><b>进度</b><span class="hint">${store.data.crystals} 颗魔法水晶 · ${store.data.badges.length} 枚徽章 · 用过 ${store.data.words.length} 个课文单词</span></div>
      <div class="set-row"><b>服务状态</b><span class="hint">${health ? `语音识别 ${health.asr ? '✅' : '❌'}　语音合成 ${health.tts ? '✅' : '❌'}　大模型 ${health.llm ? '✅ ' + esc(health.llm) : '未配置'}` : '后端未连接'}</span></div>
      ${upd && upd.view.platform !== 'none' ? `<div class="set-row"><b>版本</b><span class="hint">${esc(upd.view.version)}${upd.view.build ? ` · ${esc(upd.view.build)}` : ''} · ${({ checking: '正在检查…', downloading: `正在下载新内容 ${Math.round(upd.view.progress * 100)}%`, ready: '新内容已就绪，点顶部的“立即更新”', uptodate: '已是最新', error: '检查失败，稍后会自动重试', idle: '会自动检查更新' } as Record<string, string>)[upd.view.state] || ''}</span><button data-a="check">检查更新</button></div>` : ''}
      <div class="set-actions"><button data-a="reset" class="danger">重置全部进度</button></div>
      <p class="hint">隐私：不保存孩子的录音，只在本机保存游戏进度。</p>`;
    const w = this.modal('settings-modal', html);
    w.querySelectorAll('input[data-k]').forEach((inp) => inp.addEventListener('change', () => { (s as any)[(inp as HTMLInputElement).dataset.k!] = (inp as HTMLInputElement).checked; store.save(); cb.onChange(); }));
    w.querySelectorAll('[data-rate]').forEach((b) => b.addEventListener('click', () => { s.voiceRate = parseFloat((b as HTMLElement).dataset.rate!); store.save(); w.querySelectorAll('[data-rate]').forEach((x) => x.classList.toggle('on', x === b)); cb.onChange(); }));
    w.querySelector('[data-a=pick]')!.addEventListener('click', () => { w.remove(); cb.onCompanion(); });
    w.querySelector('[data-a=check]')?.addEventListener('click', (e) => { (e.target as HTMLButtonElement).textContent = '检查中…'; upd?.check(); setTimeout(() => { w.remove(); }, 2500); });
    w.querySelector('[data-a=reset]')!.addEventListener('click', () => { if (confirm('确定重置全部进度吗？')) { store.reset(); cb.onReset(); } });
  }

  /** travelling through a portal: a cinematic warp that blooms into white; resolves at the white point.
   *  Call the returned reveal() once the new world is ready to fade from white into it. */
  portal(): { atWhite: Promise<void>; reveal: () => void } {
    const w = el('div', 'overlay portal-fx', `<video src="./video/portal.mp4" autoplay muted playsinline preload="auto"></video><div class="pf-white"></div>`);
    this.root.appendChild(w);
    const v = w.querySelector('video') as HTMLVideoElement;
    const white = w.querySelector('.pf-white') as HTMLElement;
    let done = false;
    const atWhite = new Promise<void>((res) => {
      const fin = () => { if (done) return; done = true; white.classList.add('on'); setTimeout(res, 420); };
      v.addEventListener('timeupdate', () => { if (v.duration && v.currentTime > v.duration - 0.55) fin(); });
      v.addEventListener('ended', fin);
      v.addEventListener('error', () => setTimeout(fin, 600));
      setTimeout(fin, 6500);
    });
    const reveal = () => { w.classList.add('out'); setTimeout(() => w.remove(), 1100); };
    return { atWhite, reveal };
  }

  /** the region name as you arrive, like an open-world game */
  location(title: string, zh: string, grade: string) {
    const c = el('div', 'loc-card', `<div class="lc-grade">${esc(grade)}</div><div class="lc-title">${esc(title)}</div><div class="lc-rule"><i></i><span></span><i></i></div><div class="lc-zh">${esc(zh)}</div>`);
    this.root.appendChild(c);
    requestAnimationFrame(() => c.classList.add('on'));
    setTimeout(() => c.classList.remove('on'), 3600);
    setTimeout(() => c.remove(), 5000);
  }

}
