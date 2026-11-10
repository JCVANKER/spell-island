// 组装 Mac 桌面版：构建前端 → 打包后端为单文件 → electron-builder 生成 .app（arm64）
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const appDir = path.join(here, 'app');
const sh = (c, cwd = root) => execSync(c, { cwd, stdio: 'inherit' });

sh('pnpm --filter @spell/web build');
// the bundled game files carry their update manifest (same build id on Mac and Android), so the first hot update
// only downloads what changed
const version = JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf8')).version;
sh(`node tools/publish-update.mjs --version ${version} --web apps/web/dist --dry`);
fs.rmSync(path.join(appDir, 'web'), { recursive: true, force: true });
fs.cpSync(path.join(root, 'apps/web/dist'), path.join(appDir, 'web'), { recursive: true });
await build({
  entryPoints: [path.join(root, 'apps/server/src/index.ts')],
  outfile: path.join(appDir, 'server.mjs'),
  bundle: true, platform: 'node', format: 'esm', target: 'node20',
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  logLevel: 'warning',
});
// 默认配置：豆包语音 Key（用户之后可在菜单「打开配置文件」里改、加大模型 Key）
const env = fs.existsSync(path.join(root, '.env')) ? path.join(root, '.env') : path.join(root, '.env.example');
// 用户决定：方舟（豆包大模型）的 Key 一起打进安装包，小伙伴和小魔法师开箱即用大模型。
// 设 LUMI_STRIP_ARK=1 可打出不带 Key 的版本（给外人分发时用）。
const raw = fs.readFileSync(env, 'utf8');
const out = process.env.LUMI_STRIP_ARK ? raw.split('\n').map((l) => (/^ARK_API_KEY=/.test(l) ? 'ARK_API_KEY=' : l)).join('\n') : raw;
fs.writeFileSync(path.join(appDir, 'default.env'), out);
// auto-update: where to look, and the download token (not the publish key)
const upd = JSON.parse(fs.readFileSync(path.join(root, '.update-key'), 'utf8'));
fs.writeFileSync(path.join(appDir, 'update.json'), JSON.stringify({ url: 'https://106.55.2.170/spell-island', token: upd.app }));
sh('npx electron-builder --mac dir --arm64 --publish never', here);
console.log('done →', path.join(here, 'release'));
