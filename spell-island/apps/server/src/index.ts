import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import fs from 'node:fs';
import path from 'node:path';
import { CONFIG } from './config';
import { ttsKey, voiceFor, VOICES, type BrainContext } from '@spell/shared';
import { synthesizeStream } from './providers/tts/doubao';
import { DoubaoAsrSession } from './providers/asr/doubao';
import { getLlm } from './providers/llm';
import { Updater } from './updater';
import { spellBrain, npcReply, judgeAnswer, coachReply, companionAnswer } from './brains/spell';

const app = Fastify({ logger: { level: process.env.LOG_LEVEL || 'warn' }, bodyLimit: 1_000_000 });
await app.register(websocket, { options: { maxPayload: 1_000_000 } });

// ---------------- health ----------------
app.get('/api/health', async () => ({
  ok: true,
  asr: !!CONFIG.speechKey,
  tts: !!CONFIG.speechKey,
  llm: getLlm()?.name || null,
  brainMode: CONFIG.brainMode,
}));

// ---------------- TTS (Doubao Seed-TTS 2.0, streamed + cached) ----------------
const inflight = new Map<string, Promise<Buffer>>();

function cachedFile(key: string): string | null {
  for (const dir of [...(process.env.SPELL_UPDATE_DIR ? [path.join(process.env.SPELL_UPDATE_DIR, 'web', 'voice')] : []), CONFIG.pregenDir, CONFIG.ttsCacheDir]) {
    const f = path.join(dir, `${key}.mp3`);
    if (fs.existsSync(f)) return f;
  }
  return null;
}

app.get('/api/tts', async (req, reply) => {
  const q = req.query as { role?: string; text?: string };
  const role = q.role && VOICES[q.role] ? q.role : 'wizard';
  const text = String(q.text || '').trim().slice(0, 400);
  if (!text) return reply.code(400).send({ error: 'text required' });
  const key = ttsKey(role, text);
  const hit = cachedFile(key);
  reply.header('Cache-Control', 'public, max-age=31536000, immutable');
  if (hit) return reply.type('audio/mpeg').send(fs.createReadStream(hit));

  const pending = inflight.get(key);
  if (pending) {
    const buf = await pending;
    return reply.type('audio/mpeg').send(buf);
  }
  // Stream chunks to the browser as they arrive so playback starts quickly.
  reply.hijack();
  const raw = reply.raw;
  raw.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000, immutable', 'Transfer-Encoding': 'chunked' });
  const p = synthesizeStream(text, voiceFor(role), (chunk) => { try { raw.write(chunk); } catch { /* client gone */ } });
  inflight.set(key, p);
  try {
    const buf = await p;
    fs.writeFile(path.join(CONFIG.ttsCacheDir, `${key}.mp3`), buf, () => {});
  } catch (e: any) {
    app.log.warn({ err: e?.message, role, text: text.slice(0, 80) }, 'tts failed');
  } finally {
    inflight.delete(key);
    try { raw.end(); } catch { /* ignore */ }
  }
});

// ---------------- Brain ----------------
app.post('/api/brain', async (req) => {
  const body = req.body as { text: string; ctx: BrainContext };
  const t0 = Date.now();
  const out = await spellBrain(String(body?.text || '').slice(0, 300), body.ctx);
  if (process.env.LOG_LEVEL === 'info') app.log.info({ said: body?.text, actions: out.actions, src: out.source, ms: Date.now() - t0 }, 'brain');
  return out;
});

app.post('/api/npc', async (req) => {
  const b = req.body as { text: string; npc: any; grade: number; history: any[] };
  return { line: await npcReply(String(b?.text || '').slice(0, 300), b.npc || {}, Number(b.grade) || 4, Array.isArray(b.history) ? b.history : []) };
});

app.post('/api/judge', async (req) => {
  const b = req.body as any;
  const r = await judgeAnswer({ question: String(b?.question || '').slice(0, 300), criteria: String(b?.criteria || '').slice(0, 400), answer: String(b?.answer || '').slice(0, 300), grade: Number(b?.grade) || 4 });
  return r || { ok: false, unavailable: true };
});

// The companion in the corner phrases a Socratic hint with the LLM; the client falls back to rules.
app.post('/api/coach', async (req) => ({ line: await coachReply(req.body || {}) }));
// The child spoke Chinese: the companion answers (Milo only understands English).
app.post('/api/companion', async (req) => { const b = (req.body || {}) as any; return { line: await companionAnswer({ ...b, text: String(b.text || '').slice(0, 300) }) }; });

// ---------------- ASR (Doubao streaming) over WebSocket ----------------
// Client protocol: JSON {type:"start"} → binary PCM16 16 kHz chunks → JSON {type:"end"}
// Server replies: {type:"partial", text} … {type:"final", text} | {type:"error", message}
app.register(async (f) => {
  f.get('/ws/asr', { websocket: true }, (socket) => {
    let session: DoubaoAsrSession | null = null;
    const send = (o: any) => { try { socket.send(JSON.stringify(o)); } catch { /* ignore */ } };
    socket.on('message', (data: Buffer, isBinary: boolean) => {
      if (isBinary) { session?.push(Buffer.from(data)); return; }
      let msg: any;
      try { msg = JSON.parse(data.toString()); } catch { return; }
      if (msg.type === 'start') {
        session?.cancel();
        try {
          session = new DoubaoAsrSession({
            onPartial: (text) => send({ type: 'partial', text }),
            onFinal: (text) => send({ type: 'final', text }),
            onError: (message) => send({ type: 'error', message }),
          }, msg.context && typeof msg.context === 'object' ? { dialog: Array.isArray(msg.context.dialog) ? msg.context.dialog : undefined, hotwords: Array.isArray(msg.context.hotwords) ? msg.context.hotwords : undefined } : undefined);
        } catch (e: any) {
          send({ type: 'error', message: e?.message || 'asr unavailable' });
        }
      } else if (msg.type === 'end') {
        session?.end();
      } else if (msg.type === 'cancel') {
        session?.cancel();
        session = null;
      }
    });
    socket.on('close', () => session?.cancel());
  });
});

// ---------------- Auto-update (Mac app) ----------------
// The desktop shell sets SPELL_UPDATE_DIR; the web files are then served through a link the updater can switch.
const updater = process.env.SPELL_UPDATE_DIR && process.env.NODE_ENV === 'production' && fs.existsSync(CONFIG.webDist)
  ? new Updater({ dir: process.env.SPELL_UPDATE_DIR, bundledWeb: CONFIG.webDist, shell: process.env.SPELL_SHELL_VERSION || '0.0.0', url: process.env.SPELL_UPDATE_URL || 'https://106.55.2.170/spell-island', token: process.env.SPELL_APP_TOKEN || '' })
  : null;
app.get('/api/update/status', async () => updater?.status || { enabled: false });
app.post('/api/update/check', async () => (updater ? await updater.check() : { enabled: false }));
app.post('/api/update/apply', async () => ({ ok: updater?.apply() || false }));
app.post('/api/update/installer', async () => { if (!updater) return { ok: false }; updater.installer(); return { ok: true }; });
updater?.start();

// ---------------- Static web build (production) ----------------
if (fs.existsSync(CONFIG.webDist) && process.env.NODE_ENV === 'production') {
  // wildcard: files are looked up per request, so a switched update link takes effect immediately
  await app.register(fastifyStatic, { root: updater ? updater.link : CONFIG.webDist, prefix: '/', wildcard: true });
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api') || req.url.startsWith('/ws')) return reply.code(404).send({ error: 'not found' });
    return reply.sendFile('index.html');
  });
}

app.listen({ port: CONFIG.port, host: CONFIG.host }).then(() => {
  const llm = getLlm();
  const web = fs.existsSync(CONFIG.webDist) && process.env.NODE_ENV === 'production' ? `  打开 http://127.0.0.1:${CONFIG.port}` : '  打开 http://127.0.0.1:5173';
  console.log(`\n🪄 咒语岛后端已启动 :${CONFIG.port}  豆包语音: ${CONFIG.speechKey ? '已配置' : '缺少 DOUBAO_SPEECH_API_KEY'}  大模型: ${llm ? llm.name : '未配置（规则大脑）'}  模式: ${CONFIG.brainMode}\n${web}\n`);
});
