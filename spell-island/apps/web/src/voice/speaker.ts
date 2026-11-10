// Plays Doubao TTS lines. Pre-generated lines are static files (/voice/<key>.mp3, instant);
// anything else is streamed from the server (/api/tts); browser speech is the last fallback.
import { DIRECT, directTtsUrl } from '../native/direct';
import { ttsKey, voiceFor } from '@spell/shared';
import { appUrl } from '../urls';

function silentWav(): string {
  const n = 1600, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o: number, str: string) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  let bin = ''; const bytes = new Uint8Array(buf); for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(bin);
}

export class Speaker {
  private manifest = new Set<string>();
  private audio = new Audio();
  private resolveCur: (() => void) | null = null;
  private token = 0;
  rate = 1;
  serverOk = true;
  muted = false;
  onSpeak: ((role: string, speaking: boolean) => void) | null = null;
  /** True while a line is playing; `quietSince` = when the last line ended (hands-free mic waits for silence). */
  speaking = false;
  quietSince = 0;
  role = '';
  private analyser: AnalyserNode | null = null;
  private abuf: Uint8Array<ArrayBuffer> | null = null;

  /** Loudness of what is playing right now (0..1), for the teacher's lip-sync. */
  level(): number {
    if (!this.speaking) return 0;
    try {
      this.initAnalyser();
      this.analyser!.getByteTimeDomainData(this.abuf!);
      let s = 0;
      for (let i = 0; i < this.abuf!.length; i++) { const v = (this.abuf![i] - 128) / 128; s += v * v; }
      return Math.min(1, Math.sqrt(s / this.abuf!.length) * 4);
    } catch { return 0.3 + Math.random() * 0.4; }
  }

  private initAnalyser() {
    if (this.analyser) return;
    const c = ctx();
    const src = c.createMediaElementSource(this.audio);
    this.analyser = c.createAnalyser();
    this.analyser.fftSize = 512;
    src.connect(this.analyser).connect(c.destination);
    this.abuf = new Uint8Array(this.analyser.fftSize);
  }

  async loadManifest() {
    try {
      const r = await fetch(appUrl('/voice/manifest.json'));
      if (r.ok) { const j = await r.json(); (j.keys || []).forEach((k: string) => this.manifest.add(k)); }
    } catch { /* no pregen voices */ }
  }

  /** Must be called from a user gesture once (iOS/Safari autoplay rules). */
  unlock() {
    try { this.initAnalyser(); } catch { /* lip-sync falls back to random */ }
    try {
      this.audio.src = silentWav();
      this.audio.play().catch(() => {});
    } catch { /* ignore */ }
    try { speechSynthesis.getVoices(); } catch { /* ignore */ }
  }

  urlFor(role: string, text: string): string {
    const key = ttsKey(role, text);
    if (this.manifest.has(key)) return appUrl(`/voice/${key}.mp3`);
    return appUrl(`/api/tts?role=${encodeURIComponent(role)}&text=${encodeURIComponent(text)}`);
  }

  isCached(role: string, text: string) { return this.manifest.has(ttsKey(role, text)); }

  /** Warm the server/browser cache for a line we will say soon. */
  prefetch(role: string, text: string) {
    if (!text || this.isCached(role, text) || !this.serverOk) return;
    if (DIRECT) { directTtsUrl(role, text).catch(() => {}); return; }
    fetch(this.urlFor(role, text)).catch(() => {});
  }

  stop() {
    this.token++;
    try { this.audio.pause(); } catch { /* ignore */ }
    try { speechSynthesis.cancel(); } catch { /* ignore */ }
    const r = this.resolveCur; this.resolveCur = null; r?.();
  }

  say(role: string, text: string): Promise<void> {
    this.stop();
    const my = ++this.token;
    if (this.muted || !text.trim()) {
      this.speaking = true;
      return new Promise((r) => setTimeout(() => { this.speaking = false; this.quietSince = performance.now(); r(); }, Math.min(2500, 300 + text.length * 45)));
    }
    return new Promise<void>((resolve) => {
      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        if (this.resolveCur === done) this.resolveCur = null;
        this.speaking = false;
        this.quietSince = performance.now();
        this.onSpeak?.(role, false);
        resolve();
      };
      this.resolveCur = done;
      const a = this.audio;
      a.onended = done;
      a.onerror = () => { if (my === this.token) this.fallback(role, text).then(done); else done(); };
      this.speaking = true;
      this.role = role;
      this.onSpeak?.(role, true);
      const start = (src: string) => {
        if (my !== this.token) { done(); return; }
        a.src = src;
        a.playbackRate = this.rate;
        (a as any).preservesPitch = true;
        a.play().catch(() => { if (my === this.token) this.fallback(role, text).then(done); else done(); });
      };
      // phone app: lines that were not pre-generated are synthesised by the app itself
      if (DIRECT && !this.isCached(role, text)) directTtsUrl(role, text).then(start, () => { if (my === this.token) this.fallback(role, text).then(done); else done(); });
      else start(this.urlFor(role, text));
      // safety timeout
      setTimeout(() => { if (my === this.token && !finished && a.paused) done(); }, 15000 + text.length * 120);
    });
  }

  private fallback(role: string, text: string): Promise<void> {
    return new Promise((resolve) => {
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
        u.rate = 0.9 * this.rate;
        u.pitch = voiceFor(role).pitch ?? 1;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        speechSynthesis.speak(u);
        setTimeout(resolve, 2000 + text.length * 90);
      } catch {
        setTimeout(resolve, 1000 + text.length * 50);
      }
    });
  }
}

// ---------- tiny synth for UI sound effects (no files needed) ----------
let actx: AudioContext | null = null;
function ctx() { if (!actx) actx = new AudioContext(); if (actx.state === 'suspended') actx.resume(); return actx; }

let noiseBuf: AudioBuffer | null = null;
/** filtered noise: firework booms, thunder, whooshes */
function noise(kind: 'boom' | 'thunder' | 'whoosh') {
  const c = ctx(), now = c.currentTime;
  if (!noiseBuf) { noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const src = c.createBufferSource(); src.buffer = noiseBuf;
  const f = c.createBiquadFilter(), g = c.createGain();
  const [type, f0, f1, vol, dur] = ({ boom: ['lowpass', 900, 120, 0.35, 0.9], thunder: ['lowpass', 500, 80, 0.45, 2.2], whoosh: ['bandpass', 400, 2200, 0.12, 0.7] } as const)[kind];
  f.type = type; f.frequency.setValueAtTime(f0, now); f.frequency.exponentialRampToValueAtTime(f1, now + dur);
  g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(vol, now + (kind === 'whoosh' ? 0.25 : 0.02)); g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(now); src.stop(now + dur + 0.1);
}

export function sfx(kind: 'chime' | 'magic' | 'warn' | 'pop' | 'feather' | 'oops' | 'tick' | 'listen' | 'boom' | 'thunder' | 'whoosh') {
  try {
    if (kind === 'boom' || kind === 'thunder' || kind === 'whoosh') { noise(kind); return; }
    const c = ctx();
    const now = c.currentTime;
    const notes: Record<string, [number, number, number][]> = {
      chime: [[880, 0, 0.25], [1320, 0.08, 0.3]],
      magic: [[523, 0, 0.3], [659, 0.1, 0.3], [784, 0.2, 0.3], [1047, 0.3, 0.6], [1319, 0.42, 0.7]],
      warn: [[440, 0, 0.18], [370, 0.2, 0.25]],
      pop: [[660, 0, 0.08]],
      feather: [[784, 0, 0.4], [988, 0.15, 0.4], [1175, 0.3, 0.5], [1568, 0.45, 0.9]],
      oops: [[392, 0, 0.15], [330, 0.12, 0.3]],
      tick: [[1200, 0, 0.03]],
      listen: [[988, 0, 0.12], [1319, 0.07, 0.18]],
    };
    for (const [f, t, d] of notes[kind]) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = kind === 'warn' || kind === 'oops' ? 'triangle' : 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0, now + t);
      g.gain.linearRampToValueAtTime(kind === 'tick' ? 0.05 : kind === 'listen' ? 0.06 : 0.12, now + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + d);
      o.connect(g).connect(c.destination);
      o.start(now + t);
      o.stop(now + t + d + 0.05);
    }
  } catch { /* ignore */ }
}
