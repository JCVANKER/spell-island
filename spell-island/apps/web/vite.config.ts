import { defineConfig } from 'vite';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');
const API = 'http://127.0.0.1:8787'; // 用 127.0.0.1 而不是 localhost：开着 Clash 时也不会绕到代理/IPv6

export default defineConfig(async () => {
  const plugins = [];
  if (process.env.LAN) {
    // 手机通过局域网访问时，麦克风需要 HTTPS
    const ssl = (await import('@vitejs/plugin-basic-ssl')).default;
    plugins.push(ssl());
  }
  return {
    base: process.env.SPELL_BASE_PATH || '/',
    plugins,
    server: {
      port: 5173,
      host: process.env.LAN ? '0.0.0.0' : '127.0.0.1',
      fs: { allow: [ROOT] },
      proxy: {
        '/api': { target: API, changeOrigin: true },
        '/ws': { target: API.replace('http', 'ws'), ws: true },
      },
    },
    build: { target: 'es2020', chunkSizeWarningLimit: 1500 },
  };
});
