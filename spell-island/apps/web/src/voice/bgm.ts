// Quiet background music: gapless loops through Web Audio, crossfaded between worlds,
// and out of the microphone's way: soft while it is the child's turn (so a quiet voice still stands out and the
// first word isn't masked), silent while the child is actually talking, dipped under the characters' lines.
export type Track = 'island' | 'meadow' | 'cozy';
/** idle = nobody's turn · talk = a character speaks · turn = mic open, waiting for the child · mic = the child is talking */
export type Duck = 'idle' | 'talk' | 'turn' | 'mic';
const LEVEL: Record<Duck, number> = { idle: 0.09, talk: 0.03, turn: 0.03, mic: 0 };

export class Bgm {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<Track, Promise<AudioBuffer | null>>();
  private cur: { track: Track; src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private want: Track | null = null;
  enabled = true;
  private level = 0;

  /** must be called from a user gesture once */
  unlock() {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
      if (this.want) this.play(this.want);
    } catch { this.ctx = null; }
  }

  private load(t: Track): Promise<AudioBuffer | null> {
    let p = this.buffers.get(t);
    if (!p) {
      p = fetch(`./music/${t}.ogg`).then((r) => r.arrayBuffer()).then((a) => this.ctx!.decodeAudioData(a)).catch(() => null);
      this.buffers.set(t, p);
    }
    return p;
  }

  async play(t: Track) {
    this.want = t;
    if (!this.ctx || !this.master) return;
    if (this.cur?.track === t) { this.cur.gain.gain.setTargetAtTime(1, this.ctx.currentTime, 1.2); return; }
    const buf = await this.load(t);
    if (!buf || this.want !== t || this.cur?.track === t) return;
    const now = this.ctx.currentTime;
    const old = this.cur;
    if (old) { old.gain.gain.setTargetAtTime(0, now, 0.6); setTimeout(() => { try { old.src.stop(); } catch { /* */ } }, 3000); }
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const gain = this.ctx.createGain();
    gain.gain.value = 0; gain.gain.setTargetAtTime(1, now, 1.2);
    src.connect(gain).connect(this.master);
    src.start();
    this.cur = { track: t, src, gain };
  }

  /** dip for the portal transition */
  fadeOut() { if (this.cur && this.ctx) this.cur.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4); }

  /** called every frame with who has the floor */
  tick(mode: Duck) {
    if (!this.ctx || !this.master) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    const target = this.enabled ? LEVEL[mode] : 0;
    if (Math.abs(target - this.level) < 0.001) return;
    const down = target < this.level;
    this.level = target;
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, down ? (mode === 'mic' ? 0.03 : 0.1) : 1.2);
  }
}

export function trackFor(worldId: string, scene: string): Track {
  if (worldId === 'island') return 'island';
  return ['classroom', 'herb', 'castle', 'club'].includes(scene) ? 'cozy' : 'meadow';
}
