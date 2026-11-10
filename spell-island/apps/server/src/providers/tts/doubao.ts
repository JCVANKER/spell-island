// Doubao (Volcengine) Seed-TTS 2.0 — HTTP unidirectional streaming.
// The response is newline-delimited JSON; each line carries a base64 audio chunk in `data`.
import { randomUUID } from 'node:crypto';
import { CONFIG } from '../../config';
import type { VoiceSpec } from '@spell/shared';

export async function synthesizeStream(text: string, spec: VoiceSpec, onChunk: (buf: Buffer) => void): Promise<Buffer> {
  if (!CONFIG.speechKey) throw new Error('DOUBAO_SPEECH_API_KEY is not set');
  const reqParams: any = {
    text,
    speaker: spec.voice,
    audio_params: { format: 'mp3', sample_rate: 24000, speech_rate: spec.speed || 0 },
  };
  if (spec.ctx) reqParams.additions = JSON.stringify({ context_texts: [spec.ctx] });
  const resourceId = spec.voice.startsWith('S_') || spec.voice.startsWith('ICL_') ? 'seed-icl-2.0' : CONFIG.ttsResource;
  const res = await fetch(CONFIG.ttsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': CONFIG.speechKey,
      'X-Api-Resource-Id': resourceId,
      'X-Api-Request-Id': randomUUID(),
    },
    body: JSON.stringify({ user: { uid: 'lumi-game' }, req_params: reqParams }),
  });
  if (!res.ok || !res.body) {
    const msg = await res.text().catch(() => '');
    throw new Error(`Doubao TTS HTTP ${res.status}: ${msg.slice(0, 300)}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  const parts: Buffer[] = [];
  const handleLine = (line: string) => {
    const t = line.trim();
    if (!t) return;
    let d: any;
    try { d = JSON.parse(t); } catch { return; }
    if (d.data) {
      const b = Buffer.from(d.data, 'base64');
      parts.push(b);
      onChunk(b);
    } else if (d.code && d.code !== 0 && d.code !== 20000000) {
      throw new Error(`Doubao TTS error ${d.code}: ${d.message || ''}`);
    }
  };
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });
    let i: number;
    while ((i = pending.indexOf('\n')) >= 0) {
      handleLine(pending.slice(0, i));
      pending = pending.slice(i + 1);
    }
  }
  handleLine(pending);
  const all = Buffer.concat(parts);
  if (!all.length) throw new Error('Doubao TTS returned no audio');
  return all;
}
