// Microphone capture → 16 kHz 16-bit mono PCM chunks (what Doubao streaming ASR expects).

const WORKLET = `
class PcmCapture extends AudioWorkletProcessor {
  constructor(){ super(); this.buf = []; this.len = 0; this.ratio = sampleRate / 16000; this.acc = 0; this.accN = 0; this.pos = 0; this.ss = 0; this.sn = 0; }
  process(inputs){
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      const s = ch[i]; this.ss += s*s; this.sn++;
      this.acc += s; this.accN++;
      this.pos += 1;
      if (this.pos >= this.ratio) { this.pos -= this.ratio; this.buf.push(this.acc / this.accN); this.acc = 0; this.accN = 0; }
    }
    if (this.buf.length >= 1600) { // 100 ms
      const out = new Int16Array(this.buf.length);
      for (let i = 0; i < this.buf.length; i++) { const v = Math.max(-1, Math.min(1, this.buf[i] * 1.6)); out[i] = v < 0 ? v * 0x8000 : v * 0x7fff; }
      this.port.postMessage({ pcm: out.buffer, rms: Math.sqrt(this.ss / Math.max(1, this.sn)) }, [out.buffer]);
      this.buf = []; this.ss = 0; this.sn = 0;
    }
    return true;
  }
}
registerProcessor('pcm-capture', PcmCapture);
`;

export class Mic {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;
  private src: MediaStreamAudioSourceNode | null = null;
  private onChunk: ((pcm: ArrayBuffer) => void) | null = null;
  /** Every 100 ms chunk with its loudness, while the mic is open (used by the hands-free listener). */
  onFrame: ((pcm: ArrayBuffer, rms: number) => void) | null = null;
  level = 0;
  ready = false;

  async init(): Promise<boolean> {
    if (this.ready) return true;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
      this.ctx = new AudioContext();
      const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
      await this.ctx.audioWorklet.addModule(url);
      this.src = this.ctx.createMediaStreamSource(this.stream);
      this.node = new AudioWorkletNode(this.ctx, 'pcm-capture');
      this.node.port.onmessage = (e) => {
        this.level = this.level * 0.6 + (e.data.rms || 0) * 0.4;
        this.onFrame?.(e.data.pcm, e.data.rms || 0);
        this.onChunk?.(e.data.pcm);
      };
      this.src.connect(this.node);
      // keep the graph pulling without making sound
      const mute = this.ctx.createGain(); mute.gain.value = 0;
      this.node.connect(mute).connect(this.ctx.destination);
      this.ready = true;
      if (this.ctx.state === 'suspended') await this.ctx.resume().catch(() => {});
      return true;
    } catch (e) {
      console.warn('mic init failed', e);
      return false;
    }
  }

  async start(onChunk: (pcm: ArrayBuffer) => void) {
    if (!(await this.init())) throw new Error('mic');
    if (this.ctx!.state === 'suspended') await this.ctx!.resume();
    this.onChunk = onChunk;
  }

  stop() { this.onChunk = null; this.level = 0; }
}
