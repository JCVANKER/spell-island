// Speech recognition client. Primary: our server's Doubao streaming ASR over WebSocket.
// Fallback: the browser's Web Speech API (if the server is not reachable).
import { Mic } from './mic';
import { DIRECT, DirectAsrSocket } from '../native/direct';
import { appUrl } from '../urls';

export interface Utterance { text: string; source: 'doubao' | 'webspeech' | 'text' }

export class Asr {
  mic = new Mic();
  private ws: WebSocket | null = null;
  private wsReady: Promise<boolean> | null = null;
  private partialCb: ((t: string) => void) | null = null;
  private finalResolve: ((t: string) => void) | null = null;
  private lastPartial = '';
  private recognizing = false;
  serverAsr = true;
  /** what the child is likely to say right now (sentences on screen, the last question…): helps recognition a lot */
  context: () => string[] = () => [];
  private startMsg() { return JSON.stringify({ type: 'start', context: { dialog: this.context().slice(0, 20) } }); }
  private webSpeech: any = null;
  private webText = '';

  private connect(): Promise<boolean> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return Promise.resolve(true);
    if (this.wsReady) return this.wsReady;
    this.wsReady = new Promise((resolve) => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      const ws: WebSocket = DIRECT ? (new DirectAsrSocket() as unknown as WebSocket) : new WebSocket(`${proto}://${location.host}${appUrl('/ws/asr')}`);
      ws.binaryType = 'arraybuffer';
      const timer = setTimeout(() => { resolve(false); this.wsReady = null; }, 4000);
      ws.onopen = () => { clearTimeout(timer); this.ws = ws; resolve(true); };
      ws.onerror = () => { clearTimeout(timer); resolve(false); this.wsReady = null; };
      ws.onclose = () => { this.ws = null; this.wsReady = null; if (this.finalResolve) this.resolveFinal(this.lastPartial); };
      ws.onmessage = (e) => {
        let m: any; try { m = JSON.parse(e.data); } catch { return; }
        if (m.type === 'partial') { this.lastPartial = m.text; this.partialCb?.(m.text); }
        else if (m.type === 'final') this.resolveFinal(m.text || this.lastPartial);
        else if (m.type === 'error') { console.warn('ASR error', m.message); this.resolveFinal(this.lastPartial); }
      };
    });
    return this.wsReady;
  }

  private resolveFinal(t: string) {
    const r = this.finalResolve;
    this.finalResolve = null;
    this.recognizing = false;
    r?.(t || '');
  }

  /** Press: start listening. */
  async begin(onPartial: (t: string) => void): Promise<'doubao' | 'webspeech' | 'none'> {
    this.partialCb = onPartial;
    this.lastPartial = '';
    this.recognizing = true;
    if (this.serverAsr && (await this.connect())) {
      try {
        this.ws!.send(this.startMsg());
        await this.mic.start((pcm) => { if (this.ws?.readyState === WebSocket.OPEN && this.recognizing) this.ws.send(pcm); });
        return 'doubao';
      } catch {
        this.ws?.send(JSON.stringify({ type: 'cancel' }));
      }
    }
    return this.beginWebSpeech(onPartial) ? 'webspeech' : 'none';
  }

  /** Hands-free mode: open a recognition session; the caller pushes PCM chunks itself. */
  async beginStream(onPartial: (t: string) => void): Promise<boolean> {
    this.partialCb = onPartial;
    this.lastPartial = '';
    if (!this.serverAsr || !(await this.connect())) return false;
    try { this.ws!.send(this.startMsg()); this.recognizing = true; return true; } catch { return false; }
  }

  push(pcm: ArrayBuffer) {
    if (this.recognizing && this.ws?.readyState === WebSocket.OPEN) this.ws.send(pcm);
  }

  /** Release: stop and get the final text. */
  async end(): Promise<string> {
    this.mic.stop();
    if (this.webSpeech) {
      const ws = this.webSpeech; this.webSpeech = null;
      return new Promise((res) => {
        let done = false;
        const fin = () => { if (!done) { done = true; res(this.webText); } };
        ws.onend = fin;
        try { ws.stop(); } catch { fin(); }
        setTimeout(fin, 1500);
      });
    }
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) { this.recognizing = false; return this.lastPartial; }
    return new Promise((res) => {
      this.finalResolve = res;
      try { this.ws!.send(JSON.stringify({ type: 'end' })); } catch { this.resolveFinal(this.lastPartial); }
      setTimeout(() => { if (this.finalResolve === res) this.resolveFinal(this.lastPartial); }, 4500);
    });
  }

  cancel() {
    this.mic.stop();
    this.recognizing = false;
    try { this.ws?.send(JSON.stringify({ type: 'cancel' })); } catch { /* ignore */ }
    try { this.webSpeech?.abort(); } catch { /* ignore */ }
    this.webSpeech = null;
    this.finalResolve = null;
  }

  private beginWebSpeech(onPartial: (t: string) => void): boolean {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return false;
    const r = new SR();
    r.lang = 'en-US';
    r.interimResults = true;
    r.continuous = true;
    this.webText = '';
    r.onresult = (e: any) => {
      let txt = '';
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      this.webText = txt.trim();
      onPartial(this.webText);
    };
    r.onerror = () => {};
    try { r.start(); this.webSpeech = r; return true; } catch { return false; }
  }
}
