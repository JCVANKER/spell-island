// Magic effects: sparkle bursts, star bonks, falling fruit, rain / snow / petals / leaves, spell trails.
import * as THREE from 'three';

const sparkTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.3, 'rgba(255,240,180,0.9)'); grd.addColorStop(1, 'rgba(255,220,120,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();

const starTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffe14d'; g.strokeStyle = '#b8860b'; g.lineWidth = 3;
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 12 : 28; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); }
  g.closePath(); g.fill(); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();

/** little picture particles: music notes, hearts, Zzz, tears, steam, "!" */
function glyphTex(draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!; g.lineJoin = 'round'; g.lineCap = 'round';
  draw(g);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const GLYPH: Record<string, THREE.Texture> = {
  note: glyphTex((g) => { g.fillStyle = '#ffffff'; g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.beginPath(); g.ellipse(22, 46, 11, 8, -0.4, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(31, 44); g.lineTo(31, 10); g.quadraticCurveTo(44, 16, 50, 26); g.stroke(); }),
  heart: glyphTex((g) => { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(32, 54); g.bezierCurveTo(4, 34, 10, 8, 32, 22); g.bezierCurveTo(54, 8, 60, 34, 32, 54); g.fill(); }),
  zzz: glyphTex((g) => { g.fillStyle = '#ffffff'; g.font = 'bold 46px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Z', 32, 34); }),
  drop: glyphTex((g) => { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(32, 8); g.quadraticCurveTo(52, 36, 46, 46); g.arc(32, 44, 14, 0.2, Math.PI - 0.2); g.quadraticCurveTo(12, 36, 32, 8); g.fill(); }),
  puff: glyphTex((g) => { const grd = g.createRadialGradient(32, 32, 4, 32, 32, 30); grd.addColorStop(0, 'rgba(255,255,255,0.95)'); grd.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = grd; g.beginPath(); g.arc(32, 32, 30, 0, Math.PI * 2); g.fill(); }),
  bang: glyphTex((g) => { g.fillStyle = '#ffffff'; g.font = 'bold 54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', 32, 34); }),
  flake: glyphTex((g) => { g.strokeStyle = '#ffffff'; g.lineWidth = 5; for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI; g.beginPath(); g.moveTo(32 + Math.cos(a) * 24, 32 + Math.sin(a) * 24); g.lineTo(32 - Math.cos(a) * 24, 32 - Math.sin(a) * 24); g.stroke(); } }),
  star: glyphTex((g) => { g.fillStyle = '#ffffff'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 11 : 28; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } g.closePath(); g.fill(); }),
  flower: glyphTex((g) => { g.fillStyle = '#ffffff'; for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.beginPath(); g.ellipse(32 + Math.cos(a) * 14, 32 + Math.sin(a) * 14, 12, 9, a, 0, Math.PI * 2); g.fill(); } g.fillStyle = 'rgba(255,220,90,1)'; g.beginPath(); g.arc(32, 32, 8, 0, Math.PI * 2); g.fill(); }),
  leaf: glyphTex((g) => { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(10, 54); g.quadraticCurveTo(6, 10, 54, 8); g.quadraticCurveTo(54, 52, 10, 54); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 3; g.beginPath(); g.moveTo(12, 52); g.lineTo(46, 16); g.stroke(); }),
  wing: glyphTex((g) => { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(2, 34); g.bezierCurveTo(10, 0, 62, -2, 58, 22); g.bezierCurveTo(56, 34, 30, 34, 2, 34); g.fill(); g.beginPath(); g.moveTo(2, 34); g.bezierCurveTo(22, 34, 48, 40, 44, 54); g.bezierCurveTo(40, 64, 14, 58, 2, 34); g.fill(); g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.arc(40, 18, 6, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(28, 48, 4, 0, Math.PI * 2); g.fill(); }),
  candy: glyphTex((g) => { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(32, 32, 14, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(18, 32); g.lineTo(4, 22); g.lineTo(4, 42); g.fill(); g.beginPath(); g.moveTo(46, 32); g.lineTo(60, 22); g.lineTo(60, 42); g.fill(); }),
};
export const glyph = (k: string) => GLYPH[k] || sparkTex;

/** a soft fluffy cloud (shared geometry; one material per cloud so it can fade) */
const puffGeo = new THREE.IcosahedronGeometry(1, 2);
export function cloudMesh(size = 1): THREE.Group {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: '#dfeaff', emissiveIntensity: 0.35, transparent: true, opacity: 1 });
  const puffs: [number, number, number, number][] = [[0, 0, 0, 0.62], [0.55, -0.05, 0.1, 0.48], [-0.55, -0.05, -0.05, 0.5], [0.2, 0.18, -0.35, 0.42], [-0.25, 0.15, 0.35, 0.44], [0.95, -0.12, -0.1, 0.32], [-0.95, -0.12, 0.12, 0.34], [0, -0.16, 0.5, 0.36], [0.05, -0.15, -0.55, 0.34]];
  for (const [x, y, z, r] of puffs) { const s = new THREE.Mesh(puffGeo, m); s.position.set(x * size, y * size, z * size); s.scale.set(r * size, r * size * 0.78, r * size); s.castShadow = true; g.add(s); }
  g.userData.mat = m;
  return g;
}

interface Burst { pts: THREE.Points; vel: Float32Array; life: number; max: number; gravity: number }

export class Fx {
  group = new THREE.Group();
  private bursts: Burst[] = [];
  private weather: THREE.Points | null = null;
  private weatherKind = '';
  private trails: { mesh: THREE.Mesh; from: THREE.Vector3; to: THREE.Vector3; t: number; dur: number; done?: () => void }[] = [];

  /** A burst of glittering sparks (spells), or yellow stars (bonks). */
  burst(at: THREE.Vector3, color = '#ffe27a', count = 40, opts: { stars?: boolean; speed?: number; up?: number; size?: number; glyph?: string; gravity?: number; life?: number } = {}) {
    const pos = new Float32Array(count * 3), vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos.set([at.x, at.y, at.z], i * 3);
      const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI - Math.PI / 2, s = (opts.speed ?? 3) * (0.4 + Math.random() * 0.8);
      vel.set([Math.cos(a) * Math.cos(e) * s, Math.abs(Math.sin(e)) * s + (opts.up ?? 2), Math.sin(a) * Math.cos(e) * s], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const glyph = opts.glyph ? GLYPH[opts.glyph] : null;
    const mat = new THREE.PointsMaterial({ map: glyph || (opts.stars ? starTex : sparkTex), color, size: opts.size ?? (glyph ? 0.5 : opts.stars ? 0.45 : 0.35), transparent: true, depthWrite: false, blending: opts.stars || glyph ? THREE.NormalBlending : THREE.AdditiveBlending });
    const pts = new THREE.Points(geo, mat);
    this.group.add(pts);
    this.bursts.push({ pts, vel, life: 0, max: opts.life ?? 1.4, gravity: opts.gravity ?? (opts.stars ? 5 : 2.5) });
  }

  /** A glowing ball flying from the staff to the target. */
  trail(from: THREE.Vector3, to: THREE.Vector3, color = '#ffe27a', dur = 0.45): Promise<void> {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }));
    m.position.copy(from);
    this.group.add(m);
    return new Promise((res) => this.trails.push({ mesh: m, from: from.clone(), to: to.clone(), t: 0, dur, done: res }));
  }

  setWeather(kind: 'rainy' | 'snowy' | 'windy' | 'petals' | 'leaves' | 'mist' | 'none' | string, center = new THREE.Vector3()) {
    if (this.weather) { this.group.remove(this.weather); this.weather = null; }
    this.weatherKind = kind;
    if (kind === 'none' || kind === 'sunny' || kind === 'cloudy') return;
    const mist = kind === 'mist';
    const n = kind === 'rainy' ? 2600 : kind === 'snowy' ? 1800 : mist ? 220 : 500;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) pos.set([center.x + (Math.random() - 0.5) * 70, mist ? 0.3 + Math.random() * 4 : Math.random() * 30, center.z + (Math.random() - 0.5) * 70], i * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const color = { rainy: '#a8c8ff', snowy: '#ffffff', windy: '#b9d36a', petals: '#ffb7d0', leaves: '#e08a3a', mist: '#eef2f6' }[kind] || '#ffffff';
    const size = { rainy: 0.12, snowy: 0.28, windy: 0.3, petals: 0.3, leaves: 0.34, mist: 7 }[kind] || 0.2;
    const mat = new THREE.PointsMaterial({ color, size, map: kind === 'rainy' ? null : mist ? GLYPH.puff : sparkTex, transparent: true, opacity: kind === 'rainy' ? 0.7 : mist ? 0.32 : 0.95, depthWrite: false });
    this.weather = new THREE.Points(geo, mat);
    this.group.add(this.weather);
  }

  private showers: { pts: THREE.Points; sp: Float32Array; t: number; secs: number; c: THREE.Vector3 }[] = [];
  /** pictures falling from the sky around a point: stars, hearts, flowers, snowflakes, leaves, notes, candy */
  shower(kind: string, colors: string[], c: THREE.Vector3, secs = 8, n = 240) {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), sp = new Float32Array(n), cc = new THREE.Color();
    for (let i = 0; i < n; i++) {
      pos.set([c.x + (Math.random() - 0.5) * 26, 3 + Math.random() * 20, c.z + (Math.random() - 0.5) * 26], i * 3);
      cc.set(colors[i % colors.length]); col.set([cc.r, cc.g, cc.b], i * 3);
      sp[i] = 1.4 + Math.random() * 1.8;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: GLYPH[kind] || starTex, size: kind === 'flake' ? 0.45 : 0.6, vertexColors: true, transparent: true, depthWrite: false, alphaTest: 0.02 }));
    this.group.add(pts);
    this.showers.push({ pts, sp, t: 0, secs, c: c.clone() });
  }

  update(dt: number, follow?: THREE.Vector3) {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.life += dt;
      const p = b.pts.geometry.attributes.position as THREE.BufferAttribute;
      for (let k = 0; k < p.count; k++) {
        b.vel[k * 3 + 1] -= b.gravity * dt;
        p.setXYZ(k, p.getX(k) + b.vel[k * 3] * dt, p.getY(k) + b.vel[k * 3 + 1] * dt, p.getZ(k) + b.vel[k * 3 + 2] * dt);
      }
      p.needsUpdate = true;
      (b.pts.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - b.life / b.max);
      if (b.life > b.max) { this.group.remove(b.pts); b.pts.geometry.dispose(); (b.pts.material as THREE.Material).dispose(); this.bursts.splice(i, 1); }
    }
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const tr = this.trails[i];
      tr.t += dt / tr.dur;
      const k = Math.min(1, tr.t);
      tr.mesh.position.lerpVectors(tr.from, tr.to, k);
      tr.mesh.position.y += Math.sin(k * Math.PI) * 1.2;
      if (k >= 1) { this.group.remove(tr.mesh); this.trails.splice(i, 1); tr.done?.(); }
    }
    for (let i = this.showers.length - 1; i >= 0; i--) {
      const s = this.showers[i];
      s.t += dt;
      const p = s.pts.geometry.attributes.position as THREE.BufferAttribute, now = s.t;
      for (let k = 0; k < p.count; k++) {
        let y = p.getY(k) - s.sp[k] * dt, x = p.getX(k) + Math.sin(now * 1.3 + k) * dt * 0.8;
        if (y < 0.05) { if (now < s.secs - 2) { y = 18 + Math.random() * 6; x = s.c.x + (Math.random() - 0.5) * 26; p.setZ(k, s.c.z + (Math.random() - 0.5) * 26); } else y = -50; }
        p.setXY(k, x, y);
      }
      p.needsUpdate = true;
      if (now > s.secs + 6) { this.group.remove(s.pts); s.pts.geometry.dispose(); (s.pts.material as THREE.Material).dispose(); this.showers.splice(i, 1); }
    }
    if (this.weather) {
      const p = this.weather.geometry.attributes.position as THREE.BufferAttribute;
      if (this.weatherKind === 'mist') { // slow drift that follows the wizard
        const cx = follow?.x ?? 0, cz = follow?.z ?? 0;
        for (let k = 0; k < p.count; k++) { let x = p.getX(k) + dt * 0.6, z = p.getZ(k); if (x > cx + 35) x -= 70; if (x < cx - 35) x += 70; if (z > cz + 35) z -= 70; if (z < cz - 35) z += 70; p.setX(k, x); p.setZ(k, z); }
        p.needsUpdate = true;
        return;
      }
      const fall = { rainy: 22, snowy: 2.2, windy: 1.5, petals: 1.4, leaves: 1.8 }[this.weatherKind] || 2;
      const wind = { windy: 9, petals: 1.5, leaves: 2.5, snowy: 0.6 }[this.weatherKind] || 0;
      const cx = follow?.x ?? 0, cz = follow?.z ?? 0;
      for (let k = 0; k < p.count; k++) {
        let x = p.getX(k) + wind * dt + Math.sin(k + performance.now() * 0.001) * dt * 0.5, y = p.getY(k) - fall * dt, z = p.getZ(k);
        if (y < 0) { y = 28 + Math.random() * 4; x = cx + (Math.random() - 0.5) * 70; z = cz + (Math.random() - 0.5) * 70; }
        if (x > cx + 36) x -= 70;
        p.setXYZ(k, x, y, z);
      }
      p.needsUpdate = true;
    }
  }
}
