// Auto-update for the Mac app (runs inside the bundled server).
//  - hot updates: the web part (code, levels, models, voices) is served from a symlink that points either at the
//    bundled files or at a downloaded build. New builds are assembled next to the current one — unchanged files
//    are hard-linked, only changed ones downloaded and verified — and the link is switched when the child taps “更新”.
//  - installer updates: when a new app shell is published, the DMG is downloaded to ~/Downloads and opened.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

type Manifest = { app: string; build: string; version: string; minShell: string; files: Record<string, [string, number]> };
type Latest = { version: string; notes?: string[]; web: { build: string; version: string; minShell: string; manifest: string }; mac?: { version: string; url: string; sha256: string; size: number } };

export interface UpdateStatus {
  enabled: boolean; platform: 'mac'; shell: string; build: string; version: string;
  state: 'idle' | 'checking' | 'downloading' | 'ready' | 'error' | 'uptodate';
  progress: number; ready: { build: string; version: string; notes: string[] } | null;
  installer: { version: string; notes: string[]; state: 'available' | 'downloading' | 'opened' | 'error'; progress: number } | null;
  error?: string; checkedAt?: number;
}

const cmp = (a: string, b: string) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); return 0; };
const sha = (b: Buffer) => crypto.createHash('sha256').update(b).digest('hex');

export class Updater {
  readonly link: string;
  private dir: string;
  private bases: string[];
  private token: string;
  private shell: string;
  private bundled: string;
  status: UpdateStatus;
  private latest: Latest | null = null;
  private busy = false;

  constructor(opts: { dir: string; bundledWeb: string; shell: string; url: string; token: string }) {
    this.dir = opts.dir; this.bundled = opts.bundledWeb; this.shell = opts.shell; this.token = opts.token;
    const u = opts.url.replace(/\/$/, '');
    this.bases = [u, u.replace(/^https:/, 'http:')].filter((x, i, a) => a.indexOf(x) === i);
    fs.mkdirSync(path.join(this.dir, 'builds'), { recursive: true });
    this.link = path.join(this.dir, 'web');
    // the active build: a downloaded one if it is complete and works with this app shell, else the bundled files
    let active = this.bundled;
    try {
      const cur = JSON.parse(fs.readFileSync(path.join(this.dir, 'current.json'), 'utf8'));
      const m = this.manifestOf(cur.dir);
      const bm = this.manifestOf(this.bundled);
      if (m && cmp(this.shell, m.minShell || '0') >= 0 && (!bm || cmp(m.version, bm.version) >= 0)) active = cur.dir;
    } catch { /* first run */ }
    this.point(active);
    const m = this.manifestOf(active);
    this.status = { enabled: true, platform: 'mac', shell: this.shell, build: m?.build || 'dev', version: m?.version || this.shell, state: 'idle', progress: 0, ready: null, installer: null };
    this.cleanup(active);
  }

  private manifestOf(dir: string): Manifest | null {
    try { return JSON.parse(fs.readFileSync(path.join(dir, 'update-manifest.json'), 'utf8')); } catch { return null; }
  }

  /** atomically repoint the served web directory */
  private point(target: string) {
    const tmp = this.link + '.tmp';
    try { fs.unlinkSync(tmp); } catch { /* */ }
    fs.symlinkSync(target, tmp);
    fs.renameSync(tmp, this.link);
  }

  private cleanup(keep: string) {
    for (const d of fs.readdirSync(path.join(this.dir, 'builds'))) {
      const full = path.join(this.dir, 'builds', d);
      if (full !== keep && !d.startsWith('.')) fs.rmSync(full, { recursive: true, force: true });
    }
  }

  private async get(rel: string, as: 'json' | 'buf'): Promise<any> {
    let last: unknown;
    for (const b of this.bases) {
      try {
        const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), as === 'json' ? 10000 : 120000);
        const r = await fetch(`${b}/${rel}`, { headers: { 'X-Spell-App': this.token }, signal: ctrl.signal });
        clearTimeout(t);
        if (!r.ok) throw new Error(`HTTP ${r.status} ${rel}`);
        return as === 'json' ? await r.json() : Buffer.from(await r.arrayBuffer());
      } catch (e) { last = e; }
    }
    throw last;
  }

  async check(): Promise<UpdateStatus> {
    if (this.busy) return this.status;
    this.busy = true;
    const s = this.status;
    try {
      s.state = 'checking'; s.error = undefined;
      const latest: Latest = await this.get('latest.json', 'json');
      this.latest = latest; s.checkedAt = Date.now();
      // installer (new app shell)
      if (latest.mac && cmp(latest.mac.version, this.shell) > 0 && (!s.installer || s.installer.version !== latest.mac.version)) {
        s.installer = { version: latest.mac.version, notes: latest.notes || [], state: 'available', progress: 0 };
      }
      // hot update
      const w = latest.web;
      const newer = w && w.build !== s.build && w.build !== s.ready?.build && cmp(w.version, s.version) >= 0;
      if (newer && cmp(this.shell, w.minShell || '0') >= 0) await this.download(w, latest.notes || []);
      else if (!s.ready) s.state = 'uptodate';
      else s.state = 'ready';
    } catch (e: any) {
      s.state = 'error'; s.error = String(e?.message || e).slice(0, 200);
    } finally { this.busy = false; }
    return s;
  }

  private async download(w: Latest['web'], notes: string[]) {
    const s = this.status;
    s.state = 'downloading'; s.progress = 0;
    const m: Manifest = await this.get(w.manifest, 'json');
    const curDir = fs.realpathSync(this.link);
    const cur = this.manifestOf(curDir);
    const curByHash = new Map<string, string>();
    for (const [rel, [h]] of Object.entries(cur?.files || {})) curByHash.set(h, path.join(curDir, rel));
    const staging = path.join(this.dir, 'builds', '.staging-' + m.build);
    fs.rmSync(staging, { recursive: true, force: true });
    const entries = Object.entries(m.files);
    const need = entries.filter(([, [h]]) => !curByHash.has(h));
    const totalBytes = need.reduce((a, [, [, n]]) => a + n, 0) || 1;
    let got = 0;
    // unchanged files: hard-link (instant, no extra disk), or copy if linking isn't possible
    for (const [rel, [h]] of entries) {
      const src = curByHash.get(h); if (!src) continue;
      const dst = path.join(staging, rel); fs.mkdirSync(path.dirname(dst), { recursive: true });
      try { fs.linkSync(src, dst); } catch { fs.copyFileSync(src, dst); }
    }
    const queue = [...need];
    await Promise.all(Array.from({ length: 6 }, async () => {
      while (queue.length) {
        const [rel, [h, n]] = queue.shift()!;
        const b: Buffer = await this.get(`web/blobs/${h}`, 'buf');
        if (sha(b) !== h) throw new Error(`hash mismatch: ${rel}`);
        const dst = path.join(staging, rel); fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.writeFileSync(dst, b);
        got += n; s.progress = got / totalBytes;
      }
    }));
    fs.writeFileSync(path.join(staging, 'update-manifest.json'), JSON.stringify(m));
    const final = path.join(this.dir, 'builds', m.build);
    fs.rmSync(final, { recursive: true, force: true });
    fs.renameSync(staging, final);
    s.ready = { build: m.build, version: m.version, notes };
    s.state = 'ready'; s.progress = 1;
  }

  /** switch to the downloaded build (the page reloads right after) */
  apply(): boolean {
    const r = this.status.ready;
    if (!r) return false;
    const dir = path.join(this.dir, 'builds', r.build);
    if (!this.manifestOf(dir)) return false;
    this.point(dir);
    fs.writeFileSync(path.join(this.dir, 'current.json'), JSON.stringify({ build: r.build, dir }));
    Object.assign(this.status, { build: r.build, version: r.version, ready: null, state: 'uptodate', progress: 0 });
    setTimeout(() => this.cleanup(dir), 5000);
    return true;
  }

  /** a new app shell: download the DMG to ~/Downloads and open it */
  async installer(): Promise<boolean> {
    const mac = this.latest?.mac; const inst = this.status.installer;
    if (!mac || !inst || inst.state === 'downloading') return false;
    inst.state = 'downloading'; inst.progress = 0;
    try {
      const dst = path.join(os.homedir(), 'Downloads', `咒语岛-${mac.version}.dmg`);
      let ok = false;
      for (const b of this.bases) {
        try {
          const r = await fetch(`${b}/${mac.url}`, { headers: { 'X-Spell-App': this.token } });
          if (!r.ok || !r.body) throw new Error('HTTP ' + r.status);
          const h = crypto.createHash('sha256'); const out = fs.createWriteStream(dst + '.part'); let n = 0;
          for await (const c of r.body as any) { const buf = Buffer.from(c); h.update(buf); out.write(buf); n += buf.length; inst.progress = n / (mac.size || 1); }
          await new Promise((res) => out.end(res));
          if (h.digest('hex') !== mac.sha256) throw new Error('installer hash mismatch');
          fs.renameSync(dst + '.part', dst); ok = true; break;
        } catch (e) { inst.state = 'error'; this.status.error = String((e as any)?.message || e); }
      }
      if (!ok) return false;
      if (process.platform === 'darwin') spawn('open', [dst], { detached: true, stdio: 'ignore' }).unref();
      inst.state = 'opened'; inst.progress = 1;
      return true;
    } catch { inst.state = 'error'; return false; }
  }

  start() {
    setTimeout(() => this.check(), 8000);
    setInterval(() => this.check(), 2 * 3600 * 1000);
  }
}
