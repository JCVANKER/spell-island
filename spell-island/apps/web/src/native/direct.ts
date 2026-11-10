// "Direct mode" for the phone app: there is no local server on Android, so the app talks to
// Doubao speech (TTS over HTTP, ASR over a header-authenticated WebSocket) and the Ark model itself.
// HTTP goes through Capacitor's native HTTP (no CORS); the WebSocket through our small native plugin.
// Keys come from the native layer at runtime (BuildConfig), so the web code — which is hot-updated from the
// update server — never contains them.
import { CapacitorHttp, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { gzipSync, gunzipSync, strToU8, strFromU8 } from 'fflate';
import { voiceFor, type JsonLlm, type ChatMessage, type LlmEnv } from '@spell/shared';

export const DIRECT: boolean = !!(window as any).Capacitor?.isNativePlatform?.();
let SPEECH_KEY = '';
let ARK_KEY = '';
let ARK_MODEL = 'doubao-seed-2-1-lite-260915';

export interface NativeConfig { speechKey: string; arkKey: string; arkModel: string; updateUrl: string; appToken: string; shellVersion: string; versionCode: number; basePath: string }
export interface SpellNativePlugin {
  config(): Promise<NativeConfig>;
  downloadUpdate(o: { url: string; token: string; manifest: string }): Promise<{ dir: string; build: string; downloaded: number }>;
  applyUpdate(o: { dir: string }): Promise<void>;
  installApk(o: { url: string; token: string; apk: string; sha256: string }): Promise<void>;
  addListener(ev: 'progress', cb: (e: { progress?: number; apkProgress?: number }) => void): Promise<PluginListenerHandle>;
}
export const SpellNative = registerPlugin<SpellNativePlugin>('SpellNative');
export let nativeConfig: NativeConfig | null = null;

/** read the keys from the app (call once at boot, before anything talks to Doubao) */
export async function initDirect(): Promise<void> {
  if (!DIRECT) return;
  try {
    nativeConfig = await SpellNative.config();
    SPEECH_KEY = nativeConfig.speechKey; ARK_KEY = nativeConfig.arkKey; ARK_MODEL = nativeConfig.arkModel || ARK_MODEL;
  } catch (e) { console.warn('native config unavailable', e); }
}
const ARK_BASE = 'https://ark.cn-beijing.volces.com/api/v3';
const TTS_URL = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional';
const ASR_URL = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async';
const uuid = () => (crypto as any).randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const b64ToU8 = (b: string) => { const s = atob(b); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
const u8ToB64 = (u: Uint8Array) => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };

export const directHealth = () => ({ ok: !!SPEECH_KEY, asr: !!SPEECH_KEY, tts: !!SPEECH_KEY, llm: ARK_KEY ? 'doubao' : null });

// ------------------------------------------------------------------ TTS
const ttsCache = new Map<string, Promise<string>>();
export function directTtsUrl(role: string, text: string): Promise<string> {
  const k = role + '|' + text;
  let p = ttsCache.get(k);
  if (!p) {
    p = synth(role, text).then((mp3) => URL.createObjectURL(new Blob([mp3 as BlobPart], { type: 'audio/mpeg' })));
    p.catch(() => ttsCache.delete(k));
    ttsCache.set(k, p);
  }
  return p;
}
async function synth(role: string, text: string): Promise<Uint8Array> {
  const v = voiceFor(role);
  const rp: any = { text, speaker: v.voice, audio_params: { format: 'mp3', sample_rate: 24000, speech_rate: v.speed || 0 } };
  if (v.ctx) rp.additions = JSON.stringify({ context_texts: [v.ctx] });
  const r = await CapacitorHttp.post({
    url: TTS_URL,
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': SPEECH_KEY, 'X-Api-Resource-Id': 'seed-tts-2.0', 'X-Api-Request-Id': uuid() },
    data: { user: { uid: 'spell-island-app' }, req_params: rp },
    responseType: 'text',
    connectTimeout: 8000, readTimeout: 20000,
  });
  const body = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
  const parts: Uint8Array[] = [];
  for (const line of body.split('\n')) {
    const t = line.trim(); if (!t) continue;
    try { const d = JSON.parse(t); if (d.data) parts.push(b64ToU8(d.data)); } catch { /* skip */ }
  }
  const n = parts.reduce((a, p) => a + p.length, 0);
  if (!n) throw new Error('tts: no audio');
  const out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

// ------------------------------------------------------------------ LLM
const nativeLlm: JsonLlm = {
  name: 'doubao',
  async chatJson(messages: ChatMessage[], opts = {}) {
    const r = await CapacitorHttp.post({
      url: `${ARK_BASE}/chat/completions`,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ARK_KEY}` },
      data: { model: ARK_MODEL, messages, temperature: 0.6, max_tokens: opts.maxTokens ?? 350, response_format: { type: 'json_object' }, stream: false, thinking: { type: 'disabled' } },
      connectTimeout: 5000, readTimeout: opts.timeoutMs ?? 4000,
    });
    const j = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
    const content: string = j?.choices?.[0]?.message?.content || '';
    const m = content.match(/\{[\s\S]*\}/);
    return JSON.parse(m ? m[0] : content);
  },
};
export const directLlmEnv = (): LlmEnv => ({ llm: ARK_KEY ? nativeLlm : null, brainMode: 'hybrid', timeoutMs: 3500 });

// ------------------------------------------------------------------ ASR (Doubao v3 binary protocol over the native socket)
interface NativeWsPlugin {
  connect(o: { id: string; url: string; headers: Record<string, string> }): Promise<void>;
  send(o: { id: string; data: string }): Promise<void>;
  close(o: { id: string }): Promise<void>;
  addListener(ev: 'ws', cb: (e: { id: string; type: 'open' | 'message' | 'closed' | 'error'; data?: string; message?: string }) => void): Promise<PluginListenerHandle>;
}
const NativeWs = registerPlugin<NativeWsPlugin>('NativeWs');

function frame(type: number, flags: number, ser: number, payload: Uint8Array): Uint8Array {
  const gz = gzipSync(payload);
  const out = new Uint8Array(8 + gz.length);
  out.set([0x11, (type << 4) | flags, (ser << 4) | 1, 0]);
  new DataView(out.buffer).setUint32(4, gz.length);
  out.set(gz, 8);
  return out;
}

/** Looks like the browser WebSocket to our server's /ws/asr (JSON start/end/cancel + binary PCM; replies partial/final/error),
 *  so the rest of the app doesn't know the difference. */
export class DirectAsrSocket {
  readyState = 0; // CONNECTING
  binaryType = 'arraybuffer';
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  private id = '';
  private listener: PluginListenerHandle | null = null;
  private session = false;
  private lastText = '';
  private finished = false;
  private finalTimer = 0;
  private ready = false;
  private queue: string[] = [];
  private endPending = false;
  static readonly OPEN = 1;

  constructor() {
    this.readyState = 1; // the app-level socket is "open" at once; each utterance opens its own Doubao connection
    setTimeout(() => this.onopen?.(), 0);
  }

  private emit(o: any) { this.onmessage?.({ data: JSON.stringify(o) }); }

  async send(data: string | ArrayBuffer) {
    if (typeof data === 'string') {
      let m: any; try { m = JSON.parse(data); } catch { return; }
      if (m.type === 'start') await this.start(m.context);
      else if (m.type === 'end') this.end();
      else if (m.type === 'cancel') this.stop();
      return;
    }
    if (!this.session || this.finished) return;
    const f = u8ToB64(frame(0b0010, 0, 0, new Uint8Array(data)));
    if (!this.ready) { this.queue.push(f); return; }
    NativeWs.send({ id: this.id, data: f }).catch(() => {});
  }

  private async start(context?: { dialog?: string[] }) {
    this.stop();
    const dialog = (context?.dialog || []).map((t) => String(t).slice(0, 200)).filter(Boolean).slice(0, 20);
    this.id = uuid();
    this.lastText = '';
    this.finished = false;
    this.session = true;
    this.ready = false;
    this.queue = [];
    this.endPending = false;
    const id = this.id;
    this.listener = await NativeWs.addListener('ws', (e) => {
      if (e.id !== id) return;
      if (e.type === 'open') {
        const req: any = { user: { uid: 'spell-island-app' }, audio: { format: 'pcm', rate: 16000, bits: 16, channel: 1, codec: 'raw' }, request: { model_name: 'bigmodel', enable_punc: true, enable_itn: true, result_type: 'full', show_utterances: false } };
        if (dialog.length) req.request.corpus = { context: JSON.stringify({ context_type: 'dialog_ctx', context_data: dialog.map((text) => ({ text })) }) };
        NativeWs.send({ id, data: u8ToB64(frame(0b0001, 0, 1, strToU8(JSON.stringify(req)))) }).catch(() => {});
        this.ready = true;
        for (const q of this.queue) NativeWs.send({ id, data: q }).catch(() => {});
        this.queue = [];
        if (this.endPending) this.end();
      } else if (e.type === 'message' && e.data) this.onServer(b64ToU8(e.data));
      else if (e.type === 'error') this.fail(e.message || 'asr socket error');
      else if (e.type === 'closed') { if (!this.finished) this.finish(); }
    });
    await NativeWs.connect({ id, url: ASR_URL, headers: { 'X-Api-Key': SPEECH_KEY, 'X-Api-Resource-Id': 'volc.seedasr.sauc.duration', 'X-Api-Request-Id': uuid(), 'X-Api-Connect-Id': uuid() } }).catch((err) => this.fail(String(err)));
  }

  private end() {
    if (!this.session || this.finished) return;
    if (!this.ready) { this.endPending = true; this.finalTimer = window.setTimeout(() => this.finish(), 6000); return; }
    clearTimeout(this.finalTimer);
    NativeWs.send({ id: this.id, data: u8ToB64(frame(0b0010, 0b0010, 0, new Uint8Array(0))) }).catch(() => {});
    this.finalTimer = window.setTimeout(() => this.finish(), 3500);
  }

  private onServer(d: Uint8Array) {
    if (d.length < 4) return;
    const type = d[1] >> 4, flags = d[1] & 0x0f, comp = d[2] & 0x0f;
    const dv = new DataView(d.buffer, d.byteOffset, d.byteLength);
    if (type === 0b1111) {
      const size = dv.getUint32(8);
      let msg = d.subarray(12, 12 + size);
      try { if (comp === 1) msg = gunzipSync(msg); } catch { /* ignore */ }
      this.fail(`asr error ${dv.getUint32(4)}: ${strFromU8(msg).slice(0, 160)}`);
      return;
    }
    if (type !== 0b1001) return;
    let o = 4;
    if (flags & 0b0001) o += 4;
    const size = dv.getUint32(o); o += 4;
    let p = d.subarray(o, o + size);
    try { if (comp === 1 && p.length) p = gunzipSync(p); } catch { return; }
    let j: any = {};
    try { j = p.length ? JSON.parse(strFromU8(p)) : {}; } catch { return; }
    const text = (j?.result?.text || '').trim();
    if (text && text !== this.lastText) { this.lastText = text; this.emit({ type: 'partial', text }); }
    if (flags & 0b0010) this.finish();
  }

  private finish() {
    if (this.finished) return;
    this.finished = true;
    clearTimeout(this.finalTimer);
    this.emit({ type: 'final', text: this.lastText });
    this.stop();
  }
  private fail(msg: string) {
    if (this.finished) return;
    this.finished = true;
    clearTimeout(this.finalTimer);
    this.emit({ type: 'error', message: msg });
    this.stop();
  }
  private stop() {
    if (this.id) NativeWs.close({ id: this.id }).catch(() => {});
    this.listener?.remove(); this.listener = null;
    this.session = false;
  }
  close() { this.stop(); this.readyState = 3; this.onclose?.(); }
}
