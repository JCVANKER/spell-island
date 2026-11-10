// What spells do to things: float, change colour, grow / shrink, spin, light up, open, appear (food,
// trees, falling fruit), weather and seasons, move things around, clouds, fog, storms, butterflies,
// picture rain, whirlwinds, shooting stars. Animations run per frame on the entity's `fx` state.
import * as THREE from 'three';
import type { World } from './world';
import type { Entity, BuiltScene } from '../render/scenes';
import * as Mdl from '../render/models';
import { materialsOf, rememberLook, setLeaf } from '../render/materials';
import { sfx } from '../voice/speaker';
import { cloudMesh, glyph } from '../render/fx';

const COLOR_HEX: Record<string, string> = {
  red: '#e2373f', orange: '#f28a26', yellow: '#f5d327', green: '#4cbf4f', blue: '#3f86e8', purple: '#9b59d0', pink: '#ff8fc4',
  brown: '#9a6436', black: '#3a3a44', white: '#ffffff', grey: '#a8a8b0', gold: '#f2c14c', silver: '#d8dce6',
};

const SEASON: Record<string, { leaf: string; ground: string; sky: [string, string]; fx: string }> = {
  spring: { leaf: '#8fd46a', ground: '#8cd06e', sky: ['#8fc8f2', '#f2f8ff'], fx: 'petals' },
  summer: { leaf: '#3f9a3e', ground: '#6cbc54', sky: ['#5fb0f0', '#e8f6ff'], fx: 'none' },
  autumn: { leaf: '#e08a2a', ground: '#c8b060', sky: ['#a8c4e0', '#f6ead6'], fx: 'leaves' },
  winter: { leaf: '#e8eef6', ground: '#eef2f8', sky: ['#b8c8dc', '#eef2f8'], fx: 'snowy' },
};
const WEATHER: Record<string, { sky: [string, string]; fx: string; light: number }> = {
  sunny: { sky: ['#5fb0f0', '#e8f6ff'], fx: 'none', light: 1.0 },
  cloudy: { sky: ['#9aa8b8', '#d8dee6'], fx: 'none', light: 0.75 },
  rainy: { sky: ['#6f7f92', '#b8c2cc'], fx: 'rainy', light: 0.6 },
  snowy: { sky: ['#b8c8dc', '#eef2f8'], fx: 'snowy', light: 0.85 },
  windy: { sky: ['#8fbde0', '#e6eef6'], fx: 'windy', light: 0.95 },
  foggy: { sky: ['#c3c9d1', '#e4e7ec'], fx: 'mist', light: 0.7 },
  stormy: { sky: ['#3d4553', '#7a8592'], fx: 'rainy', light: 0.42 },
};
/** picture rain: glyph + colours */
const SHOWER: Record<string, [string, string[]]> = {
  stars: ['star', ['#ffe066', '#fff3b0', '#ffd23f']], hearts: ['heart', ['#ff6f9a', '#ff9ec0', '#ff4f7b']],
  flowers: ['flower', ['#ff9ad5', '#ffffff', '#c9a0ff', '#ffd36b']], snowflakes: ['flake', ['#ffffff', '#dff4ff']],
  leaves: ['leaf', ['#e08a2a', '#d4572a', '#f2c14c', '#8fbf4a']], notes: ['note', ['#ff6fb5', '#6fc3ff', '#ffd23f', '#8ee07a']],
  candy: ['candy', ['#ff6f9a', '#6fc3ff', '#ffd23f', '#8ee07a', '#c58bff']],
};

const materials = (root: THREE.Object3D) => materialsOf(root).map((m) => { const b = rememberLook(m) as any; if (b.rough === undefined) { b.rough = m.roughness; b.metal = m.metalness; } return m; });
const METAL: Record<string, [number, number]> = { gold: [0.9, 0.28], silver: [0.95, 0.22] };

export class Magic {
  weather = 'sunny';
  season = 'summer';
  constructor(private world: World, private built: () => BuiltScene | null) {}

  levitate(e: Entity) { e.fx.liftT = 5; sfx('magic'); this.world.fx.burst(this.top(e), '#bfe8ff', 40); }
  spin(e: Entity, secs = 3) { e.fx.spin = secs; }

  tint(e: Entity, color: string) {
    if (color === 'rainbow') { this.rainbowTint(e); return; }
    e.fx.rainbow = false;
    if (e.fx.frozen) this.melt(e, true);
    const hex = COLOR_HEX[color] || color;
    for (const m of materials(e.model.root)) {
      // painted (textured) models are multiplied by the colour: keep a little of the painting showing
      const tinted = new THREE.Color(hex);
      if (m.map && !m.userData.procedural) tinted.lerp(new THREE.Color('#ffffff'), 0.2);
      m.color.copy(tinted);
      const metal = METAL[color], b = m.userData.base;
      m.metalness = metal ? metal[0] : b.metal; m.roughness = metal ? metal[1] : b.rough;
    }
    e.fx.tint = color;
    this.world.fx.burst(this.top(e), hex, 50);
    sfx('magic');
  }

  resize(e: Entity, factor: number) {
    e.fx.scaleTarget = THREE.MathUtils.clamp(e.fx.scaleTarget * factor, 0.2, 4.2);
    this.world.fx.burst(this.top(e), factor > 1 ? '#ffd36b' : '#bfe8ff', 40);
    sfx('magic');
  }

  light(e: Entity, on = true) {
    e.fx.lit = on;
    const glass = e.model.parts.glass as THREE.MeshStandardMaterial | undefined;
    const target = glass ? [glass] : materials(e.model.root);
    for (const m of target) { m.emissive.set('#ffc66a'); m.emissiveIntensity = on ? (glass ? 2.2 : 0.6) : 0; }
    if (on) this.world.fx.burst(this.top(e), '#ffe9a0', 60, { up: 1 });
    sfx(on ? 'magic' : 'pop');
  }

  open(e: Entity) {
    e.fx.open = true;
    if (e.model.parts.open) e.model.parts.open();
    else e.fx.spin = 0.6;
    this.world.fx.burst(this.top(e), '#ffe27a', 50);
    sfx('magic');
  }

  heal(e: Entity) {
    e.mood = 'happy';
    this.world.fx.burst(this.top(e), '#8fffa8', 60, { up: 1.5 });
    sfx('feather');
  }

  bonk(e: Entity) {
    e.fx.spin = 0.25;
    e.fx.liftT = Math.max(e.fx.liftT, 0); // tiny hop handled by squash
    (e as any).__bonk = 0.5;
    this.world.fx.burst(this.top(e), '#ffe14d', 10, { stars: true, speed: 2.5, up: 2 });
    sfx('oops');
  }

  sparkle(at: THREE.Vector3, color = '#ffe27a') { this.world.fx.burst(at, color, 60); sfx('magic'); }

  setWeather(kind: string) {
    const w = WEATHER[kind]; if (!w) return;
    this.weather = kind;
    const b = this.built(); if (!b) return;
    b.setSky(w.sky[0], w.sky[1]);
    this.world.fx.setWeather(w.fx, this.world.hero.pos);
    this.world.setLight(w.light);
    // fog rolls in (outdoors); any other weather clears it
    const fog = this.world.scene.fog as THREE.Fog | null;
    if (fog) { this.fogTo = kind === 'foggy' ? [6, 38] : [60, 210]; fog.color.set(kind === 'foggy' ? '#dfe3e8' : kind === 'stormy' ? '#6d7684' : b.mood.fog); this.ensureFogHook(fog); }
    if (kind === 'stormy') this.storm();
    sfx(kind === 'stormy' ? 'thunder' : 'magic');
  }

  private fogTo: [number, number] = [60, 210];
  private fogHook: ((t: number, dt: number) => void) | null = null;
  private ensureFogHook(fog: THREE.Fog) {
    if (this.fogHook) return;
    this.fogHook = (_t, dt) => {
      const k = Math.min(1, dt * 2);
      fog.near += (this.fogTo[0] - fog.near) * k; fog.far += (this.fogTo[1] - fog.far) * k;
      if (Math.abs(fog.far - this.fogTo[1]) < 0.5) { fog.near = this.fogTo[0]; fog.far = this.fogTo[1]; this.world.hooks.delete(this.fogHook!); this.fogHook = null; }
    };
    this.world.hooks.add(this.fogHook);
  }

  /** thunder and lightning while the weather is stormy */
  private storm() {
    let next = 1.2;
    const hook = (_t: number, dt: number) => {
      if (this.weather !== 'stormy' || !this.built()) { this.world.hooks.delete(hook); return; }
      next -= dt;
      if (next > 0) return;
      next = 3 + Math.random() * 4;
      this.lightning();
    };
    this.world.hooks.add(hook);
  }
  private lightning() {
    const b = this.built(); if (!b) return;
    const h = this.world.hero.pos, f = this.world.hero.forwardVec(), side = (Math.random() - 0.5) * 50;
    const base = new THREE.Vector3(h.x + f.x * 45 + f.z * side, 0, h.z + f.z * 45 - f.x * side);
    const pts: THREE.Vector3[] = [];
    for (let i = 0, x = 0, z = 0; i <= 9; i++) { pts.push(new THREE.Vector3(base.x + x, 42 - i * 4.7, base.z + z)); x += (Math.random() - 0.5) * 5; z += (Math.random() - 0.5) * 5; }
    const bolt = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: '#f4f8ff', transparent: true });
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], c = pts[i + 1], len = a.distanceTo(c);
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, len, 5), m);
      seg.position.copy(a).add(c).multiplyScalar(0.5);
      seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.clone().sub(a).normalize());
      bolt.add(seg);
    }
    b.group.add(bolt);
    const back = () => this.world.setLight(this.night ? 0.3 : WEATHER[this.weather]?.light ?? 1, this.night ? '#a8b2e6' : '#ffffff');
    this.world.setLight(2.6, '#e6eeff');
    setTimeout(back, 70); setTimeout(() => this.world.setLight(2, '#e6eeff'), 140); setTimeout(back, 210);
    setTimeout(() => { b.group.remove(bolt); bolt.children.forEach((c) => (c as THREE.Mesh).geometry.dispose()); m.dispose(); }, 260);
    setTimeout(() => sfx('thunder'), 450);
  }

  setSeason(kind: string) {
    const s = SEASON[kind]; if (!s) return;
    this.season = kind;
    const b = this.built(); if (!b) return;
    for (const m of b.leaves) setLeaf(m, s.leaf, kind === 'summer' ? 0 : 1);
    if (b.ground) b.ground.color.set(s.ground);
    b.setSky(s.sky[0], s.sky[1]);
    this.world.fx.setWeather(s.fx, this.world.hero.pos);
    sfx('magic');
  }

  top(e: Entity): THREE.Vector3 {
    const p = e.model.root.position.clone();
    p.y += (e.model.height || 1.2) * e.model.root.scale.y * 0.8 + 0.3;
    return p;
  }

  // ------------------------------------------------------------------ magic v2: things come alive
  dance(e: Entity, secs = 6) { this.wake(e); e.fx.dance = secs; this.world.fx.burst(this.top(e), '#ffd1f0', 30); sfx('magic'); }
  hop(e: Entity, secs = 3) { this.wake(e); e.fx.hop = secs; sfx('magic'); }
  shake(e: Entity, secs = 2.5) { e.fx.shake = secs; sfx('magic'); }
  sing(e: Entity, secs = 6) { this.wake(e); e.fx.sing = secs; sfx('magic'); }
  nap(e: Entity, secs = 9) { e.fx.dance = 0; e.fx.hop = 0; e.fx.nap = secs; sfx('feather'); }
  wake(e: Entity) { e.fx.nap = 0; if (e.fx.frozen) this.melt(e, true); }
  glow(e: Entity) {
    e.fx.glow = true;
    for (const m of materials(e.model.root)) m.emissive.set('#fff1b0');
    this.world.fx.burst(this.top(e), '#fff1a0', 60, { up: 1 });
    sfx('magic');
  }
  freeze(e: Entity) {
    e.fx.dance = 0; e.fx.hop = 0; e.fx.sing = 0; e.fx.scurry = 0; e.fx.nap = 0; e.fx.rainbow = false;
    e.fx.frozen = true;
    for (const m of materials(e.model.root)) {
      m.userData.preIce = m.color.clone();
      m.color.lerp(new THREE.Color('#bfe9ff'), 0.7);
      m.emissive.set('#cfefff'); m.emissiveIntensity = 0.25;
      m.roughness = 0.15; m.metalness = 0.2;
    }
    this.world.fx.burst(this.top(e), '#dff4ff', 40, { glyph: 'flake', size: 0.4, speed: 2.5 });
    sfx('magic');
  }
  melt(e: Entity, quiet = false) {
    if (!e.fx.frozen) return;
    e.fx.frozen = false;
    for (const m of materials(e.model.root)) { if (m.userData.preIce) m.color.copy(m.userData.preIce); m.emissiveIntensity = e.fx.glow || e.fx.lit ? 0.6 : 0; m.roughness = 0.8; m.metalness = 0; }
    if (!quiet) { this.world.fx.burst(this.top(e), '#9fd8ff', 30, { glyph: 'drop', size: 0.3 }); sfx('pop'); }
  }
  vanish(e: Entity) {
    e.fx.vanished = true;
    this.world.fx.burst(this.top(e).setY(e.model.root.position.y + 0.6), '#cfefff', 40, { speed: 1.2, up: 1.2, gravity: -0.3, life: 1.8 });
    sfx('feather');
  }
  appear(e: Entity) {
    e.fx.vanished = false;
    e.model.root.visible = true;
    this.world.fx.burst(this.top(e), '#ffe27a', 50);
    sfx('magic');
  }
  rainbowTint(e: Entity) { e.fx.rainbow = true; e.fx.tint = 'rainbow'; this.world.fx.burst(this.top(e), '#ff9ad5', 60); sfx('magic'); }
  emote(e: Entity, kind: string) {
    e.fx.emote = kind; e.fx.emoteT = 4;
    if (kind === 'happy') { e.mood = 'happy'; e.fx.hop = Math.max(e.fx.hop || 0, 1.2); }
    if (kind === 'surprised') { e.fx.hop = Math.max(e.fx.hop || 0, 0.4); this.world.fx.burst(this.top(e), '#ffd23f', 1, { glyph: 'bang', size: 1.2, speed: 0.2, up: 1.2, gravity: 0.5, life: 1.6 }); }
    if (kind === 'angry') e.fx.shake = 1.5;
    sfx(kind === 'sad' ? 'oops' : 'magic');
  }
  scurry(e: Entity, secs = 6) { this.wake(e); e.fx.scurry = secs; e.fx.scurryTo = undefined; sfx('magic'); }

  /** per-frame animation of enchanted things */
  animate(e: Entity, t: number, dt: number) {
    const f = e.fx;
    const r = e.model.root;
    if ((e as any).__sx) { r.position.x -= (e as any).__sx; (e as any).__sx = 0; }
    const off = (e as any).__off as THREE.Vector2 | undefined;
    if (off) { r.position.x -= off.x; r.position.z -= off.y; off.set(0, 0); }
    if (f.moveTo) this.stepMove(e, t, dt);
    if (f.cloud) this.stepCloud(e, t, dt);
    const s0 = r.scale.x || 1;
    if (f.liftT > 0) { f.liftT -= dt; f.lift += (3.2 - f.lift) * Math.min(1, dt * 2.5); }
    else if (f.lift > 0.001) f.lift += (0 - f.lift) * Math.min(1, dt * 3);
    const bonk = (e as any).__bonk || 0;
    if (bonk > 0) (e as any).__bonk = bonk - dt;
    const tick = (k: 'dance' | 'hop' | 'shake' | 'sing' | 'nap' | 'scurry' | 'emoteT') => { if ((f[k] || 0) > 0) f[k] = Math.max(0, (f[k] as number) - dt); return (f[k] || 0) > 0; };
    const dancing = tick('dance'), hopping = tick('hop'), shaking = tick('shake'), singing = tick('sing'), napping = tick('nap'), scurrying = tick('scurry');
    tick('emoteT');
    f.fxT = (f.fxT || 0) - dt;
    const puff = f.fxT <= 0;
    if (puff) f.fxT = 0.45;
    const top = () => this.top(e);
    // walking: scurry around its spot, then trot back
    if (!scurrying && f.scurryTo) { f.scurryTo = undefined; (e as any).__return = true; }
    if (scurrying && !f.frozen) {
      const p = r.position;
      if (!f.scurryTo || Math.hypot(f.scurryTo.x - p.x, f.scurryTo.z - p.z) < 0.4) { const a = Math.random() * Math.PI * 2, d = 1.5 + Math.random() * 3; f.scurryTo = f.base.clone().add(new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d)); }
      const dx = f.scurryTo.x - p.x, dz = f.scurryTo.z - p.z, d = Math.hypot(dx, dz);
      p.x += (dx / d) * dt * 4; p.z += (dz / d) * dt * 4; r.rotation.y = Math.atan2(dx, dz);
    } else if ((e as any).__return && !f.follow) {
      // trot back home after running around
      const p = r.position; const dx = f.base.x - p.x, dz = f.base.z - p.z, d = Math.hypot(dx, dz);
      if (d > 0.05) { const k = Math.min(d, dt * 3); p.x += (dx / d) * k; p.z += (dz / d) * k; r.rotation.y = Math.atan2(dx, dz); } else (e as any).__return = false;
    }
    let y = 0, rz = 0, rx = 0, sx = 0;
    if (!f.frozen) {
      if (dancing) { y += Math.abs(Math.sin(t * 7)) * 0.35 * s0; rz = Math.sin(t * 3.5) * 0.28; r.rotation.y += Math.sin(t * 3.5 + 1) * dt * 2.2; if (puff) this.world.fx.burst(top(), ['#ff6fb5', '#6fc3ff', '#ffd23f', '#8ee07a'][Math.floor(t * 3) % 4], 1, { glyph: 'note', size: 0.55, speed: 0.6, up: 1.4, gravity: 0.2, life: 1.8 }); }
      if (hopping) y += Math.abs(Math.sin(t * 6.5)) * 1.0 * Math.min(1.5, s0);
      if (singing && puff) this.world.fx.burst(top(), ['#ff6fb5', '#6fc3ff', '#ffd23f'][Math.floor(t * 2) % 3], 1, { glyph: 'note', size: 0.6, speed: 0.5, up: 1.5, gravity: 0.2, life: 2 });
      if (singing) rz += Math.sin(t * 2.5) * 0.08;
      if (napping) { rz += 0.35; if (puff && Math.floor(t * 2.2) % 2 === 0) this.world.fx.burst(top(), '#cfe3ff', 1, { glyph: 'zzz', size: 0.6, speed: 0.3, up: 1, gravity: 0, life: 2 }); }
    }
    if (shaking) sx = Math.sin(t * 45) * 0.07;
    if ((f.emoteT || 0) > 0 && puff) {
      const k = f.emote;
      if (k === 'happy') this.world.fx.burst(top(), '#ff6f9a', 1, { glyph: 'heart', size: 0.55, speed: 0.5, up: 1.4, gravity: 0.2, life: 1.8 });
      if (k === 'sad') this.world.fx.burst(top(), '#6fb8ff', 2, { glyph: 'drop', size: 0.3, speed: 0.8, up: 0.2, gravity: 3, life: 1 });
      if (k === 'angry') this.world.fx.burst(top(), '#ff5a3c', 2, { glyph: 'puff', size: 0.6, speed: 0.8, up: 1.2, gravity: -0.3, life: 1 });
    }
    if (f.glow) for (const m of materials(r)) m.emissiveIntensity = 0.45 + Math.sin(t * 4) * 0.25;
    if (f.rainbow && !f.frozen) { const c = new THREE.Color().setHSL((t * 0.25) % 1, 0.75, 0.6); for (const m of materials(r)) m.color.copy(c); }
    const baseY = (e.def.pos[1] || 0);
    if (!f.follow) r.position.y = baseY + f.lift + (f.lift > 0.05 ? Math.sin(t * 2.4) * 0.15 : 0) + y;
    if (sx) { r.position.x += sx; (e as any).__sx = sx; }
    if (f.lift > 0.05) { r.rotation.z = Math.sin(t * 3) * 0.12; }
    else if (rz || rx) { r.rotation.z += (rz - r.rotation.z) * Math.min(1, dt * 8); }
    else if (!f.spin) r.rotation.z *= 0.9;
    if (f.spin > 0 && !f.frozen) { f.spin -= dt; r.rotation.y += dt * 8; }
    const sq = bonk > 0 ? 1 - Math.sin((bonk / 0.5) * Math.PI) * 0.25 : 1;
    const cur = r.scale.x;
    const want = f.scaleTarget;
    const sc = cur + (want - cur) * Math.min(1, dt * (f.vanished ? 6 : 3));
    r.scale.set(sc, sc * sq, sc);
    this.stepFade(e, t, dt);
  }

  /** see-through while vanishing / appearing; hidden once fully gone */
  private stepFade(e: Entity, t: number, dt: number) {
    const f = e.fx, want = f.vanished ? 0 : 1;
    const cur = f.fade ?? 1;
    if (cur === want && want === 1) return;
    const k = cur + (want - cur) * Math.min(1, dt * 3);
    f.fade = Math.abs(k - want) < 0.01 ? want : k;
    const see = f.fade < 1;
    for (const m of materials(e.model.root)) { m.transparent = see; m.opacity = f.fade; m.depthWrite = f.fade > 0.6; }
    e.model.root.visible = f.fade > 0.02;
    if (see && f.fade > 0.05 && Math.random() < dt * 8) this.world.fx.burst(this.top(e).setY(e.model.root.position.y + Math.random() * (e.model.height || 1)), '#dff4ff', 2, { speed: 0.6, up: 0.6, gravity: 0, life: 1, size: 0.25 });
  }

  // ------------------------------------------------------------------ magic v2: the sky
  private stars: THREE.Points | null = null;
  private rainbowArc: THREE.Mesh | null = null;
  night = false;

  setNight(on: boolean) {
    const b = this.built(); if (!b) return;
    this.night = on;
    if (on) {
      b.setSky('#0d1640', '#3a3f7a');
      if (b.sky) b.sky.uniforms.uStars.value = 1;
      this.world.setLight(0.3, '#a8b2e6');
      this.world.hemi.color.set('#3a4a8a');
      if (this.world.scene.fog) (this.world.scene.fog as THREE.Fog).color.set('#1c2350');
      if (!this.stars) {
        const n = 700, pos = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, el = 0.15 + Math.random() * 1.3, R = 300; pos.set([Math.cos(a) * Math.cos(el) * R, Math.sin(el) * R, Math.sin(a) * Math.cos(el) * R], i * 3); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        this.stars = new THREE.Points(g, new THREE.PointsMaterial({ color: '#fff6d8', size: 2.2, sizeAttenuation: false, transparent: true, depthWrite: false }));
        // a big friendly moon
        const moon = new THREE.Mesh(new THREE.SphereGeometry(14, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff3c4' }));
        moon.position.set(-120, 150, -200); this.stars.add(moon);
      }
      b.group.add(this.stars);
      for (const e of this.world.entities.values()) if ((e.def.can || []).includes('light') && !e.fx.lit) this.light(e, true);
    } else {
      if (this.stars) b.group.remove(this.stars);
      if (b.sky) b.sky.uniforms.uStars.value = 0;
      this.world.hemi.color.set(b.mood.skyBottom);
      if (this.world.scene.fog) (this.world.scene.fog as THREE.Fog).color.set(b.mood.fog);
      this.setWeather(this.weather);
      this.world.setLight(WEATHER[this.weather]?.light ?? 1);
    }
    sfx('magic');
  }

  rainbow() {
    const b = this.built(); if (!b) return;
    if (this.rainbowArc) b.group.remove(this.rainbowArc);
    const cols = ['#ff4d4d', '#ff9a3c', '#ffe14d', '#5fd35f', '#4da6ff', '#7a5cff', '#c45cff'];
    const grp = new THREE.Group();
    cols.forEach((c, i) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(22 - i * 0.9, 0.45, 8, 96, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false }));
      grp.add(m);
    });
    const h = this.world.hero.pos, fwd = this.world.hero.forwardVec();
    grp.position.set(h.x + fwd.x * 34, -9, h.z + fwd.z * 34);
    grp.rotation.y = Math.atan2(fwd.x, fwd.z);
    const arc = grp as unknown as THREE.Mesh;
    this.rainbowArc = arc;
    b.group.add(grp);
    let t = 0;
    const hook = (_t: number, dt: number) => {
      t += dt;
      const o = t < 2 ? t / 2 : t > 22 ? Math.max(0, 1 - (t - 22) / 3) : 1;
      grp.children.forEach((m) => (((m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = o * 0.75));
      if (t > 25) { b.group.remove(grp); this.world.hooks.delete(hook); if (this.rainbowArc === arc) this.rainbowArc = null; }
    };
    this.world.hooks.add(hook);
    sfx('magic');
  }

  /** rockets whistle up from the ground and burst into rings of sparks */
  fireworks() {
    const h = this.world.hero.pos, fwd = this.world.hero.forwardVec();
    const cols = ['#ff5a7a', '#ffd23f', '#6fc3ff', '#8ee07a', '#c58bff', '#ff9a3c', '#ffffff'];
    for (let i = 0; i < 9; i++) {
      setTimeout(() => {
        if (!this.built()) return;
        const from = new THREE.Vector3(h.x + fwd.x * 13 + (Math.random() - 0.5) * 14, 0.2, h.z + fwd.z * 13 + (Math.random() - 0.5) * 14);
        const top = from.clone().setY(9 + Math.random() * 5), p = from.clone();
        const c1 = cols[i % cols.length], c2 = cols[(i + 3) % cols.length];
        let t = 0, sparkT = 0;
        const hook = (_t: number, dt: number) => {
          t += dt; sparkT -= dt;
          p.lerpVectors(from, top, Math.min(1, 1 - (1 - t / 1.1) ** 2));
          if (sparkT <= 0) { sparkT = 0.03; this.world.fx.burst(p, '#ffe9b0', 2, { speed: 0.4, up: -1, gravity: 2, life: 0.5, size: 0.3 }); }
          if (t >= 1.1) {
            this.world.hooks.delete(hook);
            this.world.fx.burst(top, c1, 150, { speed: 7, up: 0.4, gravity: 1.3, size: 0.7, life: 2.4 });
            this.world.fx.burst(top, c2, 60, { speed: 3.2, up: 0.3, gravity: 1, size: 0.55, life: 1.8 });
            this.world.fx.burst(top, '#ffffff', 1, { glyph: 'puff', size: 7, speed: 0, up: 0, gravity: 0, life: 0.35 });
            sfx('boom');
          }
        };
        this.world.hooks.add(hook);
        sfx('whoosh');
      }, i * 480);
    }
  }

  bubbles() {
    const b = this.built(); if (!b) return;
    const h = this.world.hero.pos;
    const mat = new THREE.MeshBasicMaterial({ color: '#cfefff', transparent: true, opacity: 0.35, depthWrite: false });
    const list: { m: THREE.Mesh; v: number; ph: number }[] = [];
    for (let i = 0; i < 40; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.15 + Math.random() * 0.25, 12, 8), mat);
      m.position.set(h.x + (Math.random() - 0.5) * 8, Math.random() * 1.5, h.z + (Math.random() - 0.5) * 8);
      b.group.add(m); list.push({ m, v: 0.6 + Math.random() * 0.9, ph: Math.random() * 6 });
    }
    let t = 0;
    const hook = (tt: number, dt: number) => {
      t += dt;
      for (const x of list) { x.m.position.y += x.v * dt; x.m.position.x += Math.sin(tt * 1.5 + x.ph) * dt * 0.4; }
      mat.opacity = t > 8 ? Math.max(0, 0.35 * (1 - (t - 8) / 2)) : 0.35;
      if (t > 10) { list.forEach((x) => b.group.remove(x.m)); this.world.hooks.delete(hook); }
    };
    this.world.hooks.add(hook);
    sfx('feather');
  }

  // ------------------------------------------------------------------ magic v3: move, clouds, sky shows
  /** left / right as the child sees it on screen (camera space), forward = away from the camera */
  move(e: Entity, dir: string) {
    const f = new THREE.Vector3(); this.world.camera.getWorldDirection(f); f.y = 0; f.normalize();
    const right = new THREE.Vector3(-f.z, 0, f.x);
    const d = dir === 'left' ? right.negate() : dir === 'right' ? right : dir === 'back' ? f.negate() : f;
    const step = Math.max(3.5, (e.def.radius || 0.6) * 2.5 + 2);
    const to = e.model.root.position.clone().addScaledVector(d, step);
    const B = ((this.built()?.bounds as number) || 40) - 3, L = Math.hypot(to.x, to.z);
    if (L > B) to.multiplyScalar(B / L);
    e.fx.moveTo = to.setY(e.model.root.position.y);
    this.dust(e);
    sfx('whoosh');
  }
  private dust(e: Entity) { const p = e.model.root.position; this.world.fx.burst(new THREE.Vector3(p.x, 0.3, p.z), '#efe6d2', 16, { glyph: 'puff', size: 1 + (e.def.radius || 0.5), speed: 1.6, up: 0.3, gravity: -0.2, life: 1.2 }); }
  private stepMove(e: Entity, t: number, dt: number) {
    const f = e.fx, r = e.model.root, to = f.moveTo!;
    const dx = to.x - r.position.x, dz = to.z - r.position.z, d = Math.hypot(dx, dz);
    if (d < 0.04) {
      r.position.x = to.x; r.position.z = to.z; f.moveTo = undefined;
      f.base.set(to.x, f.base.y, to.z); e.def.pos = [to.x, e.def.pos[1] || 0, to.z];
      r.rotation.x = 0; this.dust(e); sfx('pop');
      return;
    }
    const k = Math.min(d, dt * Math.max(3, d * 2.5));
    r.position.x += (dx / d) * k; r.position.z += (dz / d) * k;
    r.rotation.x = Math.sin(t * 14) * 0.05; // a little wobble while it slides
  }

  /** a fluffy cloud scoops the thing up, floats it around, then sets it down */
  cloudRide(e: Entity, secs = 10) {
    this.wake(e);
    let c = (e as any).__cloudMesh as THREE.Group | undefined;
    if (!c) { c = cloudMesh(Math.max(0.8, (e.def.radius || 0.5) * 1.6 + 0.4)); (e as any).__cloudMesh = c; this.built()?.group.add(c); }
    c.userData.k = 0;
    e.fx.cloud = secs;
    e.fx.liftT = secs;
    if (!(e as any).__off) (e as any).__off = new THREE.Vector2();
    this.world.fx.burst(e.model.root.position.clone().setY(0.4), '#ffffff', 20, { glyph: 'puff', size: 1.4, speed: 1.4, up: 0.3, gravity: -0.3, life: 1.4 });
    sfx('feather');
  }
  private stepCloud(e: Entity, t: number, dt: number) {
    const f = e.fx, r = e.model.root, c = (e as any).__cloudMesh as THREE.Group, off = (e as any).__off as THREE.Vector2;
    f.cloud = Math.max(0, f.cloud! - dt);
    const end = f.cloud < 1.2;
    c.userData.k = Math.min(1, c.userData.k + dt * 2) * (end ? Math.min(1, f.cloud! / 1.2) : 1);
    const k = c.userData.k;
    // drift in a lazy loop around its spot
    off.set(Math.sin(t * 0.7) * 2.2 * k, Math.sin(t * 0.5 + 1) * 1.6 * k);
    r.position.x += off.x; r.position.z += off.y;
    c.position.set(r.position.x, Math.max(0.1, f.lift - 0.25) + (e.def.pos[1] || 0), r.position.z);
    c.scale.setScalar(Math.max(0.01, k));
    (c.userData.mat as THREE.MeshStandardMaterial).opacity = k;
    if (!f.cloud) { f.cloud = undefined; c.parent?.remove(c); (c.userData.mat as THREE.Material).dispose(); (e as any).__cloudMesh = undefined; }
  }

  /** a flutter of butterflies around the wizard */
  butterflies(n = 18, secs = 18) {
    const b = this.built(); if (!b) return;
    const h = this.world.hero.pos;
    const cols = ['#ff8fc4', '#ffd23f', '#6fc3ff', '#b58bff', '#ff9a3c', '#8ee07a'];
    const wing = new THREE.PlaneGeometry(0.36, 0.36).translate(0.18, 0, 0);
    const list: { g: THREE.Group; l: THREE.Mesh; r: THREE.Mesh; ph: number; rad: number; hgt: number; sp: number }[] = [];
    for (let i = 0; i < n; i++) {
      const m = new THREE.MeshBasicMaterial({ map: glyph('wing'), color: cols[i % cols.length], transparent: true, side: THREE.DoubleSide, depthWrite: false });
      const g = new THREE.Group(), l = new THREE.Mesh(wing, m), r = new THREE.Mesh(wing, m);
      r.rotation.y = Math.PI;
      g.add(l, r); g.position.copy(h); b.group.add(g);
      list.push({ g, l, r, ph: Math.random() * 6.3, rad: 1.5 + Math.random() * 4, hgt: 0.8 + Math.random() * 2.6, sp: 0.4 + Math.random() * 0.5 });
    }
    let t = 0;
    const hook = (tt: number, dt: number) => {
      t += dt;
      const c = this.world.hero.pos, leave = Math.max(0, t - (secs - 3));
      for (const x of list) {
        const a = x.ph + tt * x.sp, prev = x.g.position.clone();
        x.g.position.set(c.x + Math.cos(a) * x.rad + Math.sin(tt * 1.7 + x.ph) * 0.5, x.hgt + Math.sin(tt * 2.3 + x.ph) * 0.4 + leave * leave * 3, c.z + Math.sin(a) * x.rad);
        x.g.rotation.y = Math.atan2(x.g.position.x - prev.x, x.g.position.z - prev.z) - Math.PI / 2;
        const flap = 0.2 + Math.abs(Math.sin(tt * 16 + x.ph)) * 1.1;
        x.l.rotation.x = Math.PI / 2; x.r.rotation.x = Math.PI / 2;
        x.l.rotation.y = -flap; x.r.rotation.y = Math.PI + flap;
      }
      if (t > secs || !this.built()) { list.forEach((x) => { b.group.remove(x.g); (x.l.material as THREE.Material).dispose(); }); wing.dispose(); this.world.hooks.delete(hook); }
    };
    this.world.hooks.add(hook);
    sfx('feather');
  }

  /** stars, hearts, flowers, snowflakes, leaves, notes or candy fall from the sky */
  shower(kind: string) {
    const s = SHOWER[kind] || SHOWER.stars;
    this.world.fx.shower(s[0], s[1], this.world.hero.pos);
    sfx('feather');
  }

  /** a friendly whirlwind spins in front of the wizard; small things nearby twirl */
  whirlwind(secs = 7) {
    const b = this.built(); if (!b) return;
    const h = this.world.hero.pos, f = this.world.hero.forwardVec();
    const c0 = new THREE.Vector3(h.x + f.x * 5, 0, h.z + f.z * 5), c = c0.clone();
    const n = 520, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), seed = new Float32Array(n * 3), cc = new THREE.Color();
    const cols = ['#ffffff', '#dfe8f0', '#9fd06a', '#e0a040', '#cfe6ff'];
    for (let i = 0; i < n; i++) { seed.set([Math.random() * 6.3, Math.random() * 6, 0.6 + Math.random() * 0.8], i * 3); cc.set(cols[i % cols.length]); col.set([cc.r, cc.g, cc.b], i * 3); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ map: glyph('leaf'), size: 0.32, vertexColors: true, transparent: true, depthWrite: false, alphaTest: 0.02 });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    b.group.add(pts);
    let t = 0, hit = new Set<string>();
    const hook = (tt: number, dt: number) => {
      t += dt;
      c.set(c0.x + Math.sin(t * 0.9) * 2.5, 0, c0.z + Math.sin(t * 0.6) * 2.5);
      const grow = Math.min(1, t / 0.8) * Math.min(1, (secs - t) / 1.2);
      for (let i = 0; i < n; i++) {
        const hh = (seed[i * 3 + 1] + t * 1.6 * seed[i * 3 + 2]) % 6, a = seed[i * 3] + tt * (7 - hh * 0.7);
        const rad = (0.25 + hh * 0.42) * grow;
        pos.set([c.x + Math.cos(a) * rad, hh * grow, c.z + Math.sin(a) * rad], i * 3);
      }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = Math.max(0, grow);
      for (const e of this.world.entities.values()) {
        if (hit.has(e.id) || e.hidden || e.portal || (e.def.radius || 0) > 1.4 || e.def.params?.star) continue;
        const p = e.model.root.position;
        if (Math.hypot(p.x - c.x, p.z - c.z) < 3) { hit.add(e.id); this.spin(e, 1.6); e.fx.hop = Math.max(e.fx.hop || 0, 1); }
      }
      if (t > secs || !this.built()) { b.group.remove(pts); geo.dispose(); mat.dispose(); this.world.hooks.delete(hook); }
    };
    this.world.hooks.add(hook);
    sfx('whoosh'); setTimeout(() => sfx('whoosh'), 1600); setTimeout(() => sfx('whoosh'), 3400);
  }

  /** bright streaks across the sky (best at night) */
  shootingStars(n = 7) {
    const b = this.built(); if (!b) return;
    for (let s = 0; s < n; s++) setTimeout(() => {
      if (!this.built()) return;
      const h = this.world.hero.pos, f = this.world.hero.forwardVec(), ang = Math.atan2(f.x, f.z) + (Math.random() - 0.5) * 1.6;
      const start = new THREE.Vector3(h.x + Math.sin(ang) * 90, 48 + Math.random() * 22, h.z + Math.cos(ang) * 90);
      const side = Math.random() < 0.5 ? 1 : -1, vel = new THREE.Vector3(Math.cos(ang) * 55 * side, -14 - Math.random() * 8, -Math.sin(ang) * 55 * side);
      const N = 30, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { pos.set([start.x, start.y, start.z], i * 3); const k = (1 - i / N) ** 1.6; col.set([k, k * 0.95, k * 0.8], i * 3); }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: glyph('puff'), size: 2.4, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      pts.frustumCulled = false;
      b.group.add(pts);
      const head = start.clone(); let t = 0;
      const hook = (_t: number, dt: number) => {
        t += dt; head.addScaledVector(vel, dt);
        pos.copyWithin(3, 0, (N - 1) * 3); pos.set([head.x, head.y, head.z], 0);
        geo.attributes.position.needsUpdate = true;
        (pts.material as THREE.PointsMaterial).opacity = Math.min(1, (1.8 - t) * 2);
        if (t > 1.8) { b.group.remove(pts); geo.dispose(); (pts.material as THREE.Material).dispose(); this.world.hooks.delete(hook); }
      };
      this.world.hooks.add(hook);
      sfx('chime');
    }, s * 650 + Math.random() * 300);
  }

  /** conjure a food / fruit in front of the hero (returns its model) */
  makeFood(kind: string, at: THREE.Vector3): Mdl.Model {
    const m = Mdl.buildModel(`food:${kind}`);
    m.root.position.copy(at);
    m.root.scale.setScalar(0.01);
    this.world.fx.burst(at.clone().setY(at.y + 0.5), '#ffd1f0', 50);
    sfx('magic');
    return m;
  }
}
