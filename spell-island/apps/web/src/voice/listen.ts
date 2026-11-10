// Hands-free turn-taking: nobody has to press a button.
// - While a character is talking the mic is closed (the child can't cut the story off, and the
//   speakers don't leak into the recognizer).
// - As soon as everyone is quiet, the mic opens ("your turn" chime + indicator).
// - A tiny local voice-activity detector waits for the child to actually start talking; only then a
//   Doubao streaming session is opened (with ~0.6 s of audio from just before, so the first word isn't
//   lost). After ~0.8 s of silence the utterance is sent. Silence costs nothing.
import type { Asr } from './asr';
import type { Speaker } from './speaker';
import { sfx } from './speaker';

export type ListenState = 'off' | 'waiting' | 'armed' | 'capturing' | 'finishing';

export interface ListenerHooks {
  /** Is it OK for the child to talk right now? (a level, the library or the recap is active, no menu open) */
  allowed: () => boolean;
  onState: (s: ListenState) => void;
  onPartial: (t: string) => void;
  onText: (t: string) => void;
}

const FRAME_MS = 100;

export class Listener {
  state: ListenState = 'off';
  enabled = true;
  /** set false when the server ASR isn't available (hands-free needs streaming recognition) */
  available = true;
  private floor = 0.004;
  private loud = 0;
  private silent = 0;
  private voiced = 0;
  private frames = 0;
  private ring: ArrayBuffer[] = [];
  private queue: ArrayBuffer[] | null = null;
  private timer = 0;
  private forced = false;
  private announced = false;
  private holdUntil = 0;
  /** extra hold (e.g. while the brain/LLM is thinking) */
  hold(ms: number) { this.holdUntil = Math.max(this.holdUntil, performance.now() + ms); }

  constructor(private asr: Asr, private speaker: Speaker, private h: ListenerHooks) {}

  async start() {
    const ok = await this.asr.mic.init();
    if (!ok) { this.available = false; return false; }
    this.asr.mic.onFrame = (pcm, rms) => this.frame(pcm, rms);
    this.timer = window.setInterval(() => this.tick(), 120);
    return true;
  }

  get busy() { return this.state === 'capturing' || this.state === 'finishing'; }

  private set(s: ListenState) {
    if (this.state === s) return;
    this.state = s;
    this.h.onState(s);
  }

  /** Called often: opens/closes the mic depending on who is talking. */
  private tick() {
    if (!this.enabled || !this.available) { if (this.state === 'armed' || this.state === 'waiting') this.set('off'); return; }
    if (this.busy) {
      // a character started talking in the middle of the child's sentence: send what we have
      if (this.speaker.speaking && this.state === 'capturing') this.finish();
      return;
    }
    const quietFor = performance.now() - this.speaker.quietSince;
    const canTalk = this.h.allowed() && !this.speaker.speaking && document.visibilityState === 'visible';
    if (!canTalk) { this.announced = false; this.set(this.h.allowed() ? 'waiting' : 'off'); return; }
    if (quietFor < 450 || performance.now() < this.holdUntil) { this.set('waiting'); return; }
    if (this.state !== 'armed') {
      this.loud = 0;
      if (!this.announced) { sfx('listen'); this.announced = true; }
      this.set('armed');
    }
  }

  /** Mic button in hands-free mode: start right now (for very quiet voices) or send now. */
  tap() {
    if (this.state === 'armed') { this.forced = true; this.beginCapture(); }
    else if (this.state === 'capturing') this.finish();
  }

  /** Stop listening for this turn (e.g. typed text was sent). */
  cancel() {
    if (this.busy) this.asr.cancel();
    this.queue = null;
    this.set('off');
  }

  private frame(pcm: ArrayBuffer, rms: number) {
    this.ring.push(pcm);
    if (this.ring.length > 6) this.ring.shift(); // 0.6 s before the trigger, so the first word is never clipped
    if (this.state === 'armed' || this.state === 'waiting' || this.state === 'off') {
      // adaptive noise floor (rises slowly, falls fast)
      this.floor = rms < this.floor ? this.floor * 0.7 + rms * 0.3 : this.floor * 0.985 + rms * 0.015;
    }
    const thr = Math.max(0.009, this.floor * 2.5); // sensitive enough for a quiet child a little away from the device
    if (this.state === 'armed') {
      if (rms > thr) { if (++this.loud >= 2) this.beginCapture(); } else this.loud = 0;
      return;
    }
    if (this.state !== 'capturing') return;
    if (this.queue) this.queue.push(pcm); else this.asr.push(pcm);
    this.frames++;
    if (rms > thr * 0.7) { this.voiced++; this.silent = 0; } else this.silent++;
    const long = this.frames * FRAME_MS > 12000;
    if ((this.voiced >= 3 && this.silent * FRAME_MS >= 800) || long) this.finish();
    else if (this.voiced < 3 && this.silent * FRAME_MS >= (this.forced ? 4000 : 1200)) this.abort(); // a cough / a bump
  }

  private async beginCapture() {
    this.set('capturing');
    this.frames = 0; this.silent = 0; this.voiced = this.forced ? 0 : 2;
    this.queue = [...this.ring];
    this.h.onPartial('');
    const ok = await this.asr.beginStream((t) => this.h.onPartial(t));
    if (!ok) { this.available = false; this.queue = null; this.set('off'); return; }
    const q = this.queue || [];
    this.queue = null;
    for (const p of q) this.asr.push(p);
    if (this.state !== 'capturing' && this.state !== 'finishing') this.asr.cancel();
  }

  private abort() {
    this.asr.cancel();
    this.queue = null;
    this.forced = false;
    this.announced = true; // no second chime for a false start
    this.set('waiting');
  }

  private async finish() {
    if (this.state !== 'capturing') return;
    this.set('finishing');
    this.forced = false;
    // wait for the session to be open before closing it
    for (let i = 0; i < 30 && this.queue; i++) await new Promise((r) => setTimeout(r, 50));
    const text = (await this.asr.end()).trim();
    this.announced = false;
    if (text) this.hold(1500); // give Lumi a moment to answer before the mic re-opens
    this.set('off');
    if (text) this.h.onText(text);
  }
}
