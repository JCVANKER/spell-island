// The microphone, as a magic crystal ball (in the spirit of a voice-assistant orb):
// a live WebGL shader of flowing colour clouds inside a glass sphere, floating on its own.
// The clouds breathe while it waits, swirl and shiver with the child's voice while listening,
// turn gold-violet and pulse with Milo's voice while he talks, and spin while thinking.
import type { MicState } from './hud';

const VERT = `attribute vec2 p; varying vec2 uv; void main(){ uv = p; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `precision highp float;
varying vec2 uv;
uniform float uTime, uAmp, uSpin, uDim;
uniform vec3 uA, uB, uC;
// --- 3D simplex-ish value noise
vec3 hash3(vec3 p){ p = vec3(dot(p,vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6))); return fract(sin(p)*43758.5453)*2.0-1.0; }
float noise(vec3 p){
  vec3 i = floor(p), f = fract(p); vec3 u = f*f*(3.0-2.0*f);
  return mix(mix(mix(dot(hash3(i+vec3(0,0,0)),f-vec3(0,0,0)), dot(hash3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),
                 mix(dot(hash3(i+vec3(0,1,0)),f-vec3(0,1,0)), dot(hash3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
             mix(mix(dot(hash3(i+vec3(0,0,1)),f-vec3(0,0,1)), dot(hash3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),
                 mix(dot(hash3(i+vec3(0,1,1)),f-vec3(0,1,1)), dot(hash3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z);
}
float fbm(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a*noise(p); p = p*2.03 + vec3(1.7,9.2,3.1); a *= 0.5; } return s; }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c,-s,s,c); }
void main(){
  float r = length(uv);
  float edge = 0.01;
  if (r > 1.0) discard;
  vec3 n = vec3(uv, sqrt(max(0.0, 1.0 - r*r)));
  // inside: look *into* the ball — sample a little deeper towards the centre (fake refraction)
  vec3 q = vec3(uv * (0.85 + 0.25*(1.0 - n.z)), n.z * 0.6) * 0.8;
  q.xy = rot(uTime*0.15 + uSpin) * q.xy;
  float t = uTime * (0.16 + uAmp*0.3);
  vec3 w = vec3(fbm(q*1.6 + vec3(0,0,t)), fbm(q*1.6 + vec3(5.2,1.3,-t)), 0.0);
  float jit = uAmp * 0.08 * noise(vec3(uv*5.0, uTime*3.0)); // a soft ripple while the child talks
  float f = fbm(q*2.2 + w*(1.4 + uAmp*0.8) + vec3(0.0, t*0.7, t*0.4)) + jit;
  float g = fbm(q*3.1 - w*1.1 + vec3(t*0.5, 0.0, -t*0.3));
  vec3 col = mix(uA, uB, smoothstep(-0.35, 0.45, f));
  col = mix(col, uC, smoothstep(-0.12, 0.32, g) * 0.8);
  // soft bright cloud cores
  col += mix(vec3(1.0), uC, 0.35) * pow(smoothstep(0.1, 0.6, f + g*0.5), 2.0) * (0.5 + uAmp*0.7);
  // twinkling motes of magic
  vec3 sp = q*9.0 + vec3(0.0, uTime*0.6, 0.0);
  float star = pow(max(0.0, noise(sp)), 9.0) * 90.0 * (0.4 + uAmp);
  col += vec3(1.0, 0.95, 0.8) * star;
  // glass: darker towards the rim (thickness), bright fresnel ring, two speculars
  float fres = pow(1.0 - n.z, 2.6);
  col *= 0.86 + 0.22*n.z;
  col = mix(col, vec3(0.9, 0.96, 1.0), fres*0.45);
  vec3 L = normalize(vec3(-0.45, 0.6, 0.85));
  float spec = pow(max(0.0, dot(reflect(-L, n), vec3(0,0,1))), 60.0);
  float spec2 = pow(max(0.0, dot(reflect(-normalize(vec3(0.55,-0.4,0.75)), n), vec3(0,0,1))), 22.0);
  col += vec3(1.0) * spec * 1.25 + vec3(0.8,0.9,1.0) * spec2 * 0.25;
  // a soft window-shaped highlight like a real crystal ball
  vec2 hp = (uv - vec2(-0.36, 0.42)) * vec2(1.0, 1.6);
  col += vec3(1.0) * smoothstep(0.34, 0.0, length(hp)) * 0.42;
  col = mix(col, vec3(dot(col, vec3(0.3,0.59,0.11))), uDim * 0.75) * (1.0 - uDim*0.35);
  float a = smoothstep(1.0, 1.0 - 0.02 - edge, r);
  gl_FragColor = vec4(col * a, a);
}`;

type Pal = [number[], number[], number[]];
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const PALETTES: Record<string, Pal> = {
  armed: [hex('#1f6bff'), hex('#62c8ff'), hex('#ffffff')], // calm sky-blue clouds: "I'm listening"
  listening: [hex('#1d63f5'), hex('#54d2ff'), hex('#f2fbff')], // the same sky, a little brighter: the child is talking
  hush: [hex('#1f6bff'), hex('#62c8ff'), hex('#ffffff')], // someone else is talking: stay calm, unchanged
  thinking: [hex('#1f6bff'), hex('#62c8ff'), hex('#ffffff')],
  idle: [hex('#2f4f9a'), hex('#79a6e6'), hex('#dfeaff')],
  disabled: [hex('#3a3f4c'), hex('#7d8496'), hex('#c4c8d0')],
};
const GLOW: Record<string, string> = { armed: '#6ec9ff', listening: '#7fd8ff', hush: '#6ec9ff', thinking: '#6ec9ff', idle: '#6f8fc7', disabled: '#666' };

export class Orb {
  root = document.createElement('div');
  private canvas = document.createElement('canvas');
  private gl: WebGLRenderingContext | null;
  private prog: WebGLProgram | null = null;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private state: MicState = 'idle';
  private cur: Pal = PALETTES.idle.map((c) => [...c]) as Pal;
  private amp = 0;
  private mic = 0;
  private voice = 0;
  private spin = 0;
  private dim = 0.4;
  private t0 = performance.now();

  constructor() {
    this.root.className = 'orb';
    this.canvas.className = 'orb-ball';
    this.canvas.width = this.canvas.height = 240;
    const halo = document.createElement('div'); halo.className = 'orb-halo';
    this.root.append(halo, this.canvas);
    this.gl = this.canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true });
    if (this.gl) this.init(this.gl); else this.root.classList.add('no-gl');
    const loop = () => { this.frame(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  private init(gl: WebGLRenderingContext) {
    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn('orb shader', gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn('orb link', gl.getProgramInfoLog(p)); this.root.classList.add('no-gl'); return; }
    this.prog = p;
    gl.useProgram(p);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const k of ['uTime', 'uAmp', 'uSpin', 'uDim', 'uA', 'uB', 'uC']) this.u[k] = gl.getUniformLocation(p, k);
    gl.clearColor(0, 0, 0, 0);
  }

  setState(s: MicState) { this.state = s; this.root.dataset.state = s; this.root.style.setProperty('--glow', GLOW[s] || GLOW.idle); }
  /** mic loudness (0..1) and the current speaker's loudness (0..1) */
  setLevels(mic: number, voice: number) { this.mic = mic; this.voice = voice; }

  private frame() {
    const s = this.state;
    // only the child's own voice moves it, and gently
    const target = s === 'listening' ? Math.min(0.6, this.mic * 0.9) : s === 'armed' ? 0.04 : 0;
    // fast attack, slower release: it *jumps* with each syllable
    this.amp += (target - this.amp) * (target > this.amp ? 0.08 : 0.04);
    this.spin += 0.0015 + this.amp * 0.003;
    this.dim += ((s === 'disabled' ? 0.6 : s === 'idle' ? 0.3 : 0) - this.dim) * 0.08;
    const pal = PALETTES[s] || PALETTES.idle;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) this.cur[i][j] += (pal[i][j] - this.cur[i][j]) * 0.02;
    this.canvas.style.transform = `scale(${1 + this.amp * 0.035})`;
    this.root.style.setProperty('--amp', this.amp.toFixed(3));
    const gl = this.gl;
    if (!gl || !this.prog) return;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(this.u.uTime, (performance.now() - this.t0) / 1000);
    gl.uniform1f(this.u.uAmp, this.amp);
    gl.uniform1f(this.u.uSpin, this.spin);
    gl.uniform1f(this.u.uDim, this.dim);
    gl.uniform3fv(this.u.uA, this.cur[0]);
    gl.uniform3fv(this.u.uB, this.cur[1]);
    gl.uniform3fv(this.u.uC, this.cur[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
