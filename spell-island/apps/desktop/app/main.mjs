// 咒语岛 Spell Island —— Mac 桌面版主进程
// 在本机 127.0.0.1 启动内置后端（豆包语音识别/合成 + 大脑），窗口直接打开游戏。
import { app, BrowserWindow, session, systemPreferences, shell, Menu, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import net from 'node:net';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = 18788; // 固定端口：存档（localStorage）跟着网址走，端口不变进度才不会丢

function portFree(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => s.close(() => resolve(true)));
    s.listen(port, '127.0.0.1');
  });
}

async function health(port) {
  try { const r = await fetch(`http://127.0.0.1:${port}/api/health`); return r.ok; } catch { return false; }
}

async function startServer() {
  const userData = app.getPath('userData');
  fs.mkdirSync(userData, { recursive: true });
  // 用户可编辑的配置：~/Library/Application Support/咒语岛/config.env（首次运行从内置默认复制）
  const envFile = path.join(userData, 'config.env');
  if (!fs.existsSync(envFile)) fs.copyFileSync(path.join(here, 'default.env'), envFile);
  if (!(await portFree(PORT))) {
    if (await health(PORT)) return PORT; // 已经有一个咒语岛在跑
    dialog.showErrorBox('端口被占用', `端口 ${PORT} 被别的程序占用了，请关掉它再打开咒语岛。`);
    app.quit();
    return null;
  }
  Object.assign(process.env, {
    NODE_ENV: 'production',
    HOST: '127.0.0.1',
    PORT: String(PORT),
    LUMI_ENV_FILE: envFile,
    LUMI_WEB_DIST: path.join(here, 'web'),
    LUMI_PREGEN_DIR: path.join(here, 'web', 'voice'),
    LUMI_CACHE_DIR: path.join(userData, 'tts-cache'),
    // auto-update: hot updates of the game files go to userData/updates; the server switches between builds
    SPELL_UPDATE_DIR: path.join(userData, 'updates'),
    SPELL_SHELL_VERSION: app.getVersion(),
    ...(() => { try { const u = JSON.parse(fs.readFileSync(path.join(here, 'update.json'), 'utf8')); return { SPELL_UPDATE_URL: u.url, SPELL_APP_TOKEN: u.token }; } catch { return {}; } })(),
  });
  await import(pathToFileURL(path.join(here, 'server.mjs')).href);
  for (let i = 0; i < 100; i++) { if (await health(PORT)) return PORT; await new Promise((r) => setTimeout(r, 100)); }
  return PORT;
}

function menu(userData) {
  const tpl = [
    { label: '咒语岛', submenu: [
      { role: 'about', label: '关于 咒语岛' },
      { type: 'separator' },
      { label: '打开配置文件（填大模型 Key）', click: () => shell.openPath(path.join(userData, 'config.env')) },
      { label: '打开数据文件夹', click: () => shell.openPath(userData) },
      { label: '检查更新', click: () => fetch(`http://127.0.0.1:${PORT}/api/update/check`, { method: 'POST' }).catch(() => {}) },
      { type: 'separator' },
      { role: 'hide', label: '隐藏' }, { role: 'quit', label: '退出' },
    ] },
    { label: '编辑', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: '视图', submenu: [{ role: 'reload', label: '重新加载' }, { role: 'togglefullscreen', label: '全屏' }, { type: 'separator' }, { role: 'toggleDevTools', label: '开发者工具' }] },
    { role: 'window', label: '窗口', submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'close' }] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(tpl));
}

app.whenReady().then(async () => {
  // 麦克风：只允许本机游戏页面使用
  const local = (url) => url && url.startsWith(`http://127.0.0.1:${PORT}`);
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(['media', 'audioCapture'].includes(perm) && local(wc.getURL())));
  session.defaultSession.setPermissionCheckHandler((wc, perm) => ['media', 'audioCapture'].includes(perm) && (!wc || local(wc.getURL())));
  if (process.platform === 'darwin') {
    try { await systemPreferences.askForMediaAccess('microphone'); } catch { /* 用户可在系统设置里打开 */ }
  }
  menu(app.getPath('userData'));
  const port = await startServer();
  if (!port) return;
  const win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 900, minHeight: 600,
    title: '咒语岛 Spell Island', backgroundColor: '#2a2238',
    webPreferences: { contextIsolation: true, sandbox: true, autoplayPolicy: 'no-user-gesture-required' },
  });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  await win.loadURL(`http://127.0.0.1:${port}/`);
});

app.on('window-all-closed', () => app.quit());
