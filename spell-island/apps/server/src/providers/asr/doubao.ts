// Doubao (Volcengine) streaming speech recognition — Seed ASR 2.0, v3 binary WebSocket protocol.
// Audio: 16 kHz, 16-bit, mono PCM. English + Chinese mixed speech is supported by the model.
import WebSocket from 'ws';
import { gzipSync, gunzipSync } from 'node:zlib';
import { randomUUID } from 'node:crypto';
import { CONFIG } from '../../config';

const MSG_FULL_CLIENT = 0b0001;
const MSG_AUDIO_ONLY = 0b0010;
const MSG_FULL_SERVER = 0b1001;
const MSG_ERROR = 0b1111;

function header(type: number, flags: number, serialization: number, compression: number): Buffer {
  return Buffer.from([0x11, (type << 4) | flags, (serialization << 4) | compression, 0x00]);
}

function frame(type: number, flags: number, serialization: number, payload: Buffer): Buffer {
  const gz = gzipSync(payload);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(gz.length);
  return Buffer.concat([header(type, flags, serialization, 1), size, gz]);
}

export interface AsrContext { hotwords?: string[]; dialog?: string[] }
/** request.corpus.context for Doubao: hotwords (≤100 tokens on the streaming endpoint) or dialog context (≤20 turns) */
export function corpusContext(c?: AsrContext): string | undefined {
  if (!c) return undefined;
  const hot = (c.hotwords || []).map((w) => String(w).slice(0, 40)).filter(Boolean).slice(0, 40);
  const dia = (c.dialog || []).map((t) => String(t).slice(0, 200)).filter(Boolean).slice(0, 20);
  if (dia.length) return JSON.stringify({ context_type: 'dialog_ctx', context_data: dia.map((text) => ({ text })) });
  if (hot.length) return JSON.stringify({ hotwords: hot.map((word) => ({ word })) });
  return undefined;
}

export interface AsrEvents {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (err: string) => void;
}

/** One utterance (press-to-talk) = one session. */
export class DoubaoAsrSession {
  private ws: WebSocket;
  private open = false;
  private queue: Buffer[] = [];
  private ended = false;
  private finished = false;
  private lastText = '';
  private finalTimer: NodeJS.Timeout | null = null;

  /** `context`: what the recognizer should expect (hotwords and/or the last lines of the conversation) */
  constructor(private ev: AsrEvents, private context?: AsrContext) {
    if (!CONFIG.speechKey) throw new Error('DOUBAO_SPEECH_API_KEY is not set');
    this.ws = new WebSocket(CONFIG.asrUrl, {
      headers: {
        'X-Api-Key': CONFIG.speechKey,
        'X-Api-Resource-Id': CONFIG.asrResource,
        'X-Api-Request-Id': randomUUID(),
        'X-Api-Connect-Id': randomUUID(),
      },
      handshakeTimeout: 8000,
    });
    this.ws.on('open', () => {
      const req = {
        user: { uid: 'lumi-game' },
        audio: { format: 'pcm', rate: 16000, bits: 16, channel: 1, codec: 'raw' },
        request: { model_name: 'bigmodel', enable_punc: true, enable_itn: true, result_type: 'full', show_utterances: false } as any,
      };
      const ctx = corpusContext(this.context);
      if (ctx) req.request.corpus = { context: ctx };
      this.ws.send(frame(MSG_FULL_CLIENT, 0, 1, Buffer.from(JSON.stringify(req))));
      this.open = true;
      for (const q of this.queue) this.sendAudio(q, false);
      this.queue = [];
      if (this.ended) this.sendAudio(Buffer.alloc(0), true);
    });
    this.ws.on('message', (data: Buffer) => this.onMessage(data));
    this.ws.on('unexpected-response', (_req, res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => this.fail(`ASR handshake ${res.statusCode}: ${body.slice(0, 200)}`));
    });
    this.ws.on('error', (e) => this.fail(String(e?.message || e)));
    this.ws.on('close', () => { if (!this.finished && this.ended) this.finish(); });
  }

  private sendAudio(pcm: Buffer, last: boolean) {
    if (this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(frame(MSG_AUDIO_ONLY, last ? 0b0010 : 0, 0, pcm));
  }

  push(pcm: Buffer) {
    if (this.ended || this.finished) return;
    if (!this.open) this.queue.push(pcm);
    else this.sendAudio(pcm, false);
  }

  end() {
    if (this.ended) return;
    this.ended = true;
    if (this.open) this.sendAudio(Buffer.alloc(0), true);
    // Safety net: if the server never sends a final packet, use what we have.
    this.finalTimer = setTimeout(() => this.finish(), 3500);
  }

  cancel() {
    this.finished = true;
    if (this.finalTimer) clearTimeout(this.finalTimer);
    try { this.ws.close(); } catch { /* ignore */ }
  }

  private onMessage(data: Buffer) {
    if (data.length < 4) return;
    const type = data[1] >> 4;
    const flags = data[1] & 0x0f;
    const compression = data[2] & 0x0f;
    let o = 4;
    if (type === MSG_ERROR) {
      const code = data.readUInt32BE(4);
      const size = data.readUInt32BE(8);
      let msg = data.subarray(12, 12 + size);
      try { if (compression === 1) msg = gunzipSync(msg); } catch { /* ignore */ }
      this.fail(`ASR error ${code}: ${msg.toString('utf8').slice(0, 200)}`);
      return;
    }
    if (type !== MSG_FULL_SERVER) return;
    if (flags & 0b0001) o += 4; // sequence number present
    const size = data.readUInt32BE(o);
    o += 4;
    let payload = data.subarray(o, o + size);
    try { if (compression === 1 && payload.length) payload = gunzipSync(payload); } catch { return; }
    let j: any = {};
    try { j = payload.length ? JSON.parse(payload.toString('utf8')) : {}; } catch { return; }
    const text = (j?.result?.text || '').trim();
    if (text && text !== this.lastText) {
      this.lastText = text;
      this.ev.onPartial(text);
    }
    if (flags & 0b0010) this.finish();
  }

  private finish() {
    if (this.finished) return;
    this.finished = true;
    if (this.finalTimer) clearTimeout(this.finalTimer);
    this.ev.onFinal(this.lastText);
    try { this.ws.close(); } catch { /* ignore */ }
  }

  private fail(msg: string) {
    if (this.finished) return;
    this.finished = true;
    if (this.finalTimer) clearTimeout(this.finalTimer);
    this.ev.onError(msg);
    try { this.ws.close(); } catch { /* ignore */ }
  }
}
