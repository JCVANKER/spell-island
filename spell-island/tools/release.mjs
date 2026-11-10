#!/usr/bin/env node
// One command to ship 咒语岛.
//   node tools/release.mjs --version 1.0.3 --note "新增…"            → hot update only (code, levels, voices, models)
//   node tools/release.mjs --version 1.1.0 --full --note "…"         → also new Mac DMG + Android APK (app shell changed)
//   add --min-shell 1.1.0 when the new web code needs the new shell (older apps then wait for the installer)
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };
const notes = args.flatMap((a, i) => (a === '--note' ? ['--note', JSON.stringify(args[i + 1])] : []));
const version = opt('version');
const full = args.includes('--full');
if (!version || !/^\d+\.\d+\.\d+$/.test(version) || !notes.length) { console.error('usage: --version X.Y.Z --note "…" [--full] [--min-shell X.Y.Z]'); process.exit(1); }
const sh = (c, cwd = root, env = {}) => execSync(c, { cwd, stdio: 'inherit', env: { ...process.env, ...env } });
const setJson = (p, f) => { const j = JSON.parse(fs.readFileSync(p, 'utf8')); f(j); fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n'); };
const [a, b, c] = version.split('.').map(Number);
const code = a * 10000 + b * 100 + c;

// versions everywhere
for (const p of ['apps/desktop/package.json', 'apps/desktop/app/package.json', 'apps/mobile/package.json']) setJson(path.join(root, p), (j) => { j.version = version; });
const gradle = path.join(root, 'apps/mobile/android/app/build.gradle');
fs.writeFileSync(gradle, fs.readFileSync(gradle, 'utf8').replace(/versionCode \d+/, `versionCode ${code}`).replace(/versionName "[^"]+"/, `versionName "${version}"`));
const dmgSh = path.join(root, 'apps/desktop/make-dmg.sh');
fs.writeFileSync(dmgSh, fs.readFileSync(dmgSh, 'utf8').replace(/-\d+\.\d+\.\d+-arm64\.dmg/, `-${version}-arm64.dmg`));

const minShell = opt('min-shell') ? ` --min-shell ${opt('min-shell')}` : '';
if (full) {
  sh('node build.mjs', path.join(root, 'apps/desktop'));          // web build + manifest + Electron app
  sh('bash make-dmg.sh', path.join(root, 'apps/desktop'));
  sh('node build.mjs', path.join(root, 'apps/mobile'), { REUSE_WEB: '1', ANDROID_HOME: process.env.ANDROID_HOME || '/opt/android-sdk' });
  const dmg = path.join(root, `apps/desktop/release/咒语岛-${version}-arm64.dmg`);
  const apk = path.join(root, `apps/mobile/release/咒语岛-${version}.apk`);
  sh(`node tools/publish-update.mjs --version ${version} --web apps/web/dist --mac "${dmg}" --android "${apk}" --android-code ${code}${minShell} ${notes.join(' ')}`);
} else {
  sh('npx vite build', path.join(root, 'apps/web'));
  sh(`node tools/publish-update.mjs --version ${version} --web apps/web/dist${minShell} ${notes.join(' ')}`);
}
