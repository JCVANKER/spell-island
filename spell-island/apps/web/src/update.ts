// In-game update notices. The heavy lifting happens elsewhere:
//  - Mac: the bundled server downloads new builds in the background (/api/update/*)
//  - Android: the native SpellNative plugin downloads and switches builds
// Here we only decide when to show “新内容已就绪” / “有新版本安装包” and what tapping it does.
import { appUrl } from './urls';
import { CapacitorHttp } from '@capacitor/core';
import { DIRECT, SpellNative, nativeConfig } from './native/direct';

export interface UpdateView {
  platform: 'mac' | 'android' | 'none';
  version: string; build: string; shell: string;
  state: 'idle' | 'checking' | 'downloading' | 'ready' | 'uptodate' | 'error';
  progress: number;
  ready: { version: string; notes: string[] } | null;
  installer: { version: string; notes: string[]; state: string; progress: number } | null;
  error?: string;
}

const cmp = (a: string, b: string) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); return 0; };

export class Updates {
  view: UpdateView = { platform: 'none', version: '', build: '', shell: '', state: 'idle', progress: 0, ready: null, installer: null };
  onChange: ((v: UpdateView) => void) | null = null;
  private androidReadyDir: string | null = null;
  private latest: any = null;

  async init() {
    if (DIRECT) {
      this.view.platform = 'android';
      this.view.shell = nativeConfig?.shellVersion || '';
      try { const m = await fetch(appUrl('/update-manifest.json')).then((r) => r.json()); this.view.version = m.version; this.view.build = m.build; } catch { this.view.version = this.view.shell; }
      SpellNative.addListener('progress', (e) => {
        if (e.progress !== undefined) { this.view.progress = e.progress; this.emit(); }
        if (e.apkProgress !== undefined && this.view.installer) { this.view.installer.progress = e.apkProgress; this.emit(); }
      }).catch(() => {});
      this.check(); // right away: the app may have been closed for days
      setInterval(() => this.check(), 2 * 3600 * 1000);
      this.onResume();
      return;
    }
    try {
      const s = await fetch(appUrl('/api/update/status')).then((r) => r.json());
      if (!s.enabled) return;
      this.view.platform = 'mac';
      this.fromMac(s);
      this.check();
      const tick = () => { this.poll(); setTimeout(tick, this.view.state === 'checking' || this.view.state === 'downloading' ? 1500 : 20000); };
      setTimeout(tick, 1500);
      this.onResume();
    } catch { /* dev server or plain web */ }
  }

  /** coming back to the app (phones keep it in the background for days): look again, at most every 10 minutes */
  private lastCheck = 0;
  private onResume() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || performance.now() - this.lastCheck < 600000) return;
      this.check();
    });
  }

  private emit() { this.onChange?.(this.view); }

  private fromMac(s: any) {
    Object.assign(this.view, { version: s.version, build: s.build, shell: s.shell, state: s.state, progress: s.progress, error: s.error, ready: s.ready ? { version: s.ready.version, notes: s.ready.notes || [] } : null, installer: s.installer });
    this.emit();
  }
  private async poll() { try { this.fromMac(await fetch(appUrl('/api/update/status')).then((r) => r.json())); } catch { /* */ } }

  /** “检查更新” */
  async check() {
    this.lastCheck = performance.now();
    if (this.view.platform === 'mac') { if (this.view.state === 'downloading') return; this.view.state = 'checking'; this.emit(); try { this.fromMac(await fetch(appUrl('/api/update/check'), { method: 'POST' }).then((r) => r.json())); } catch { /* */ } return; }
    if (this.view.platform !== 'android' || !nativeConfig) return;
    const v = this.view;
    if (v.state === 'downloading' || v.state === 'ready') return;
    v.state = 'checking'; v.error = undefined; this.emit();
    try {
      this.latest = await this.getLatest();
      const L = this.latest;
      if (L.android && Number(L.android.versionCode || 0) > Number(nativeConfig.versionCode || 0)) {
        v.installer = { version: L.android.version, notes: L.notes || [], state: 'available', progress: 0 };
      }
      const w = L.web;
      if (w && w.build !== v.build && cmp(w.version, v.version) >= 0 && cmp(v.shell, w.minShell || '0') >= 0) {
        v.state = 'downloading'; v.progress = 0; this.emit();
        const r = await SpellNative.downloadUpdate({ url: nativeConfig.updateUrl, token: nativeConfig.appToken, manifest: w.manifest });
        this.androidReadyDir = r.dir;
        v.ready = { version: w.version, notes: L.notes || [] };
        v.state = 'ready';
      } else v.state = 'uptodate';
    } catch (e: any) { v.state = 'error'; v.error = String(e?.message || e).slice(0, 160); }
    this.emit();
  }

  private async getLatest() {
    const c = nativeConfig!;
    const bases = [c.updateUrl, c.updateUrl.replace(/^https:/, 'http:')];
    let last: unknown;
    for (const b of bases) {
      try {
        const r = await CapacitorHttp.get({ url: `${b}/latest.json`, headers: { 'X-Spell-App': c.appToken }, connectTimeout: 8000, readTimeout: 10000 });
        if (r.status !== 200) throw new Error('HTTP ' + r.status);
        return typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
      } catch (e) { last = e; }
    }
    throw last;
  }

  /** tap “立即更新”: switch to the new build (the game reloads; progress and settings are kept) */
  async apply() {
    if (this.view.platform === 'mac') {
      const r = await fetch(appUrl('/api/update/apply'), { method: 'POST' }).then((x) => x.json()).catch(() => ({ ok: false }));
      if (r.ok) location.reload();
      return;
    }
    if (this.view.platform === 'android' && this.androidReadyDir) await SpellNative.applyUpdate({ dir: this.androidReadyDir });
  }

  /** tap “下载新版本”: a new app shell */
  async installer() {
    const inst = this.view.installer;
    if (!inst) return;
    if (this.view.platform === 'mac') { inst.state = 'downloading'; this.emit(); await fetch(appUrl('/api/update/installer'), { method: 'POST' }).catch(() => {}); return; }
    if (this.view.platform === 'android' && nativeConfig && this.latest?.android) {
      inst.state = 'downloading'; this.emit();
      try { await SpellNative.installApk({ url: nativeConfig.updateUrl, token: nativeConfig.appToken, apk: this.latest.android.url, sha256: this.latest.android.sha256 }); inst.state = 'opened'; }
      catch (e: any) { inst.state = 'error'; this.view.error = String(e?.message || e); }
      this.emit();
    }
  }
}
