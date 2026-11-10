// Android APK: build the web app with the speech/model keys baked in (direct mode),
// copy it into the Capacitor project, and assemble a signed release APK.
//   node build.mjs              → release/咒语岛-<version>.apk
//   STRIP_ARK=1 node build.mjs  → without the Ark (LLM) key, for sharing with others
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const env = Object.fromEntries(fs.readFileSync(path.join(root, '.env'), 'utf8').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.split('=')[0], l.slice(l.indexOf('=') + 1).trim()]));
const sh = (c, cwd = root, extra = {}) => execSync(c, { cwd, stdio: 'inherit', env: { ...process.env, ...extra } });

// the same web bundle as the Mac app (keyless; hot-updatable). Reuse apps/web/dist if the desktop build just made it.
const version = JSON.parse(fs.readFileSync(path.join(here, 'package.json'), 'utf8')).version;
if (!process.env.REUSE_WEB) sh('npx vite build', path.join(root, 'apps/web'));
sh(`node tools/publish-update.mjs --version ${version} --web apps/web/dist --dry`);
const upd = JSON.parse(fs.readFileSync(path.join(root, '.update-key'), 'utf8'));
// keys and update settings go into the APK's BuildConfig (never into the web files)
Object.assign(process.env, {
  SPELL_SPEECH_KEY: env.DOUBAO_SPEECH_API_KEY || '',
  SPELL_ARK_KEY: process.env.STRIP_ARK ? '' : env.ARK_API_KEY || '',
  SPELL_ARK_MODEL: env.ARK_MODEL || '',
  SPELL_UPDATE_URL: 'https://106.55.2.170/spell-island',
  SPELL_APP_TOKEN: upd.app,
});
sh('npx cap sync android', here);
fs.writeFileSync(path.join(here, 'android/local.properties'), `sdk.dir=${process.env.ANDROID_HOME || '/opt/android-sdk'}\n`);
sh('./gradlew assembleRelease --no-daemon -q', path.join(here, 'android'));
fs.mkdirSync(path.join(here, 'release'), { recursive: true });
const out = path.join(here, 'release', `咒语岛-${version}.apk`);
fs.copyFileSync(path.join(here, 'android/app/build/outputs/apk/release/app-release.apk'), out);
console.log('APK →', out);
