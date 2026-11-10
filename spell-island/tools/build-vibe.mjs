// Self-contained production package: one Node service, no desktop/mobile shells or credentials.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'apps/desktop/package.json'));
const { build } = require('esbuild');
const dest = path.join(root, 'deployment/artifacts');
const stage = path.join(dest, 'stage');
fs.mkdirSync(dest, { recursive: true });
fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(stage);
execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
  cwd: path.join(root, 'apps/web'), stdio: 'inherit',
});
await build({
  entryPoints: [path.join(root, 'apps/server/src/index.ts')],
  outfile: path.join(stage, 'apps/server/src/index.mjs'),
  bundle: true, platform: 'node', format: 'esm', target: 'node22',
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  logLevel: 'warning',
});
fs.cpSync(path.join(root, 'apps/web/dist'), path.join(stage, 'apps/web/dist'), { recursive: true });
fs.cpSync(path.join(root, 'content'), path.join(stage, 'content'), { recursive: true });
fs.writeFileSync(path.join(stage, 'start.mjs'), `import os from 'node:os';
import path from 'node:path';
process.env.NODE_ENV = 'production';
process.env.PORT ||= '5000';
process.env.HOST = '0.0.0.0';
// Synthesized speech is a disposable cache, not user data; no PVC is required.
process.env.LUMI_CACHE_DIR ||= path.join(os.tmpdir(), 'spell-island-tts');
process.env.LUMI_PREGEN_DIR ||= path.resolve('apps/web/dist/voice');
delete process.env.SPELL_UPDATE_DIR;
await import('./apps/server/src/index.mjs');
`);
fs.writeFileSync(path.join(stage, 'package.json'), JSON.stringify({
  name: 'spell-island', version: '1.3.1', private: true, type: 'module',
  description: 'Spell Island: single Node.js web/API/WebSocket service',
  scripts: { build: 'node build.mjs', start: 'node start.mjs' }, engines: { node: '>=22' },
}, null, 2) + '\n');
fs.writeFileSync(path.join(stage, 'package-lock.json'), JSON.stringify({
  name: 'spell-island', version: '1.3.1', lockfileVersion: 3, requires: true,
  packages: { '': { name: 'spell-island', version: '1.3.1', engines: { node: '>=22' } } },
}, null, 2) + '\n');
fs.writeFileSync(path.join(stage, 'build.mjs'), `import fs from 'node:fs';
for (const file of ['start.mjs', 'apps/server/src/index.mjs', 'apps/web/dist/index.html', 'content/island.json']) {
  if (!fs.existsSync(file)) throw new Error('Missing production file: ' + file);
}
fs.mkdirSync('node_modules', { recursive: true });
console.log('Prebuilt production files verified');
`);
fs.copyFileSync(path.join(root, 'deployment/README.md'), path.join(stage, 'README.md'));
// Fail closed if a local credential has accidentally reached a compiled or copied file.
const secrets = fs.existsSync(path.join(root, '.env'))
  ? fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)
    .filter(l => /^(ARK_API_KEY|DOUBAO_SPEECH_API_KEY|DEEPSEEK_API_KEY)=/.test(l))
    .map(l => l.slice(l.indexOf('=') + 1).trim()).filter(v => v.length > 8)
  : [];
let files = 0;
function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) scan(p);
    else {
      files++;
      const bytes = fs.readFileSync(p);
      if (secrets.some(s => bytes.includes(Buffer.from(s)))) throw Error('Credential detected in deployment package');
    }
  }
}
scan(stage);
const zip = path.join(dest, 'spell-island-vibe.zip');
fs.rmSync(zip, { force: true });
execFileSync('/usr/bin/zip', ['-q', '-r', zip, '.'], { cwd: stage });
const report = { files, credentialMatches: 0, bytes: fs.statSync(zip).size,
  sha256: crypto.createHash('sha256').update(fs.readFileSync(zip)).digest('hex'),
  component: { name: 'web', type: 'node', start: 'npm start', port: 5000,
    host: '0.0.0.0', health: '/api/health', persistent_paths: [], websocket: '/ws/asr' },
};
fs.writeFileSync(path.join(dest, 'package-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
