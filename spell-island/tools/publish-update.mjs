#!/usr/bin/env node
// Publish a 咒语岛 release to the update server (Tencent Cloud Lighthouse).
// Uploads only files the server doesn't have yet (content-addressed), then switches latest.json last.
//
//   node tools/publish-update.mjs --version 1.0.2 --web apps/desktop/app/web \
//        [--mac release.dmg --android release.apk --android-code 3] [--min-shell 1.0.2] \
//        --note "新增了…" [--note "修复了…"] [--server http://106.55.2.170/spell-island] [--dry]
//
// Keys: .update-key (JSON {"publish": "<hmac key>", "app": "<download token>"}) — never commit or share it.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const opts = (k) => args.flatMap((a, i) => (a === '--' + k ? [args[i + 1]] : []));
const DRY = args.includes('--dry');
const SERVER = (opt('server', 'http://106.55.2.170/spell-island')).replace(/\/$/, '');
const version = opt('version');
const webDir = opt('web');
if (!version || !webDir) { console.error('usage: --version X.Y.Z --web <dir> [--mac f.dmg] [--android f.apk --android-code N] --note "..."'); process.exit(1); }
const keys = JSON.parse(fs.readFileSync(path.join(ROOT, '.update-key'), 'utf8'));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const shaFile = (f) => new Promise((res) => { const h = crypto.createHash('sha256'); fs.createReadStream(f).on('data', (c) => h.update(c)).on('end', () => res(h.digest('hex'))); });

async function call(method, rel, body, bodySha) {
  const p = new URL(SERVER + rel).pathname;
  const t = String(Math.floor(Date.now() / 1000));
  const bs = bodySha || sha(body || Buffer.alloc(0));
  const sig = crypto.createHmac('sha256', keys.publish).update(`${method}\n${p}\n${t}\n${bs}`).digest('hex');
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch(SERVER + rel, { method, body, duplex: 'half', headers: { 'X-Spell-Time': t, 'X-Body-Sha256': bs, 'X-Spell-Sig': sig, 'Content-Type': 'application/octet-stream' } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(`${method} ${rel}: HTTP ${r.status} ${JSON.stringify(j)}`);
      return j;
    } catch (e) {
      if (attempt >= 3 || /HTTP 4\d\d/.test(String(e))) throw e;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

// 1. the web bundle → manifest
const files = {};
const walk = (d) => { for (const n of fs.readdirSync(d)) { const f = path.join(d, n); const st = fs.statSync(f); if (st.isDirectory()) walk(f); else { const rel = path.relative(webDir, f).split(path.sep).join('/'); if (rel !== 'update-manifest.json') files[rel] = f; } } };
walk(webDir);
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
const build = `${version}-${stamp}`;
const manifest = { app: 'spell-island', build, version, minShell: opt('min-shell', '1.0.2'), files: {} }; // raise only when a release needs a newer app shell
let total = 0;
for (const [rel, f] of Object.entries(files)) { const b = fs.readFileSync(f); manifest.files[rel] = [sha(b), b.length]; total += b.length; }
// same files as a manifest already written for this version (e.g. baked into the installers)? keep its build id
try {
  const old = JSON.parse(fs.readFileSync(path.join(webDir, 'update-manifest.json'), 'utf8'));
  const same = old.version === version && Object.keys(old.files).length === Object.keys(manifest.files).length && Object.entries(manifest.files).every(([k, v]) => old.files[k]?.[0] === v[0]);
  if (same) { manifest.build = old.build; manifest.minShell = old.minShell; }
} catch { /* none yet */ }
// the bundle carries its own manifest, so the app knows which files it already has
fs.writeFileSync(path.join(webDir, 'update-manifest.json'), JSON.stringify(manifest));
console.log(`web ${manifest.build}: ${Object.keys(manifest.files).length} files, ${(total / 1e6).toFixed(1)} MB`);
if (DRY) process.exit(0);

// 2. upload only what the server doesn't have
const hashes = [...new Set(Object.values(manifest.files).map((v) => v[0]))];
const missing = new Set();
for (let i = 0; i < hashes.length; i += 2000) (await call('POST', '/api/has', Buffer.from(JSON.stringify({ hashes: hashes.slice(i, i + 2000) })))).missing.forEach((h) => missing.add(h));
const byHash = new Map(Object.entries(manifest.files).map(([rel, v]) => [v[0], files[rel]]));
let done = 0, bytes = 0;
const queue = [...missing];
await Promise.all(Array.from({ length: 6 }, async () => {
  while (queue.length) {
    const h = queue.shift(); const b = fs.readFileSync(byHash.get(h));
    await call('PUT', `/api/blob/${h}`, b, h); done++; bytes += b.length;
    if (done % 100 === 0) console.log(`  uploaded ${done}/${missing.size}`);
  }
}));
console.log(`uploaded ${done} new files (${(bytes / 1e6).toFixed(1)} MB); ${hashes.length - done} already on the server`);
const mbuf = Buffer.from(JSON.stringify(manifest));
await call('PUT', `/api/file/web/${manifest.build}.json`, mbuf);


// 3. go live with the web part right away (installers can take long to upload from far away)
const latest = { app: 'spell-island', version, published: new Date().toISOString(), notes: opts('note'), web: { build: manifest.build, version, minShell: manifest.minShell, manifest: `web/${manifest.build}.json` } };
const prev = await fetch(SERVER + '/latest.json', { headers: { 'X-Spell-App': keys.app } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
for (const k of ['mac', 'android']) if (prev?.[k]) latest[k] = prev[k];   // keep the previous installers listed meanwhile
await call('PUT', '/api/latest', Buffer.from(JSON.stringify(latest)));
console.log(`${version}（${manifest.build}）已上线`);

// 4. installers (optional): 4 MB content-addressed parts, uploaded like blobs (parallel, and a rerun resumes
//    where it stopped), then glued on the server and checked against the whole-file hash
const PART = 4 << 20;
// --installer-version: the installers' own version when it differs from the web version (e.g. re-uploading 1.0.2 shells)
const instVer = opt('installer-version', version);
async function installer(kind, f) {
  if (!f) return;
  const name = kind === 'mac' ? `spell-island-${instVer}-arm64.dmg` : `spell-island-${instVer}.apk`;
  const size = fs.statSync(f).size;
  const fd = fs.openSync(f, 'r');
  const readPart = (i) => { const n = Math.min(PART, size - i * PART); const b = Buffer.alloc(n); fs.readSync(fd, b, 0, n, i * PART); return b; };
  const count = Math.ceil(size / PART);
  const whole = crypto.createHash('sha256'); const parts = [];
  for (let i = 0; i < count; i++) { const b = readPart(i); whole.update(b); parts.push(sha(b)); }
  const h = whole.digest('hex');
  const miss = new Set((await call('POST', '/api/has', Buffer.from(JSON.stringify({ hashes: [...new Set(parts)] })))).missing);
  const todo = parts.map((x, i) => [x, i]).filter(([x], i, a) => miss.has(x) && a.findIndex(([y]) => y === x) === i);
  console.log(`uploading ${kind} installer ${(size / 1e6).toFixed(0)} MB: ${todo.length}/${count} parts to send`);
  let sent = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (todo.length) {
      const [x, i] = todo.shift();
      for (let k = 1; ; k++) {
        try { await call('PUT', `/api/blob/${x}`, readPart(i), x); break; }
        catch (e) { if (k >= 6) throw e; await new Promise((r) => setTimeout(r, 5000 * k)); }
      }
      if (++sent % 10 === 0) console.log(`  ${kind}: ${sent} parts sent`);
    }
  }));
  fs.closeSync(fd);
  await call('POST', '/api/join', Buffer.from(JSON.stringify({ rel: `installers/${name}`, parts, sha256: h })));
  latest[kind] = { version: instVer, url: `installers/${name}`, sha256: h, size, ...(kind === 'android' ? { versionCode: Number(opt('android-code', '0')) } : {}) };
  console.log(`${kind} installer on the server`);
}
await installer('android', opt('android'));
await installer('mac', opt('mac'));
if (opt('mac') || opt('android')) await call('PUT', '/api/latest', Buffer.from(JSON.stringify(latest)));

// 5. tidy up old releases (keep this one and the previous)
const keep = [manifest.build, prev?.web?.build].filter(Boolean);
const pr = await call('POST', '/api/prune', Buffer.from(JSON.stringify({ keep })));
console.log(`完成。${version}（${manifest.build}）已发布；清理旧文件 ${pr.removed} 个`);
