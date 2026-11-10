// Environments: Spell Island (the hub) and the lesson worlds. A scene key sets the mood (ground, sky, light,
// fog); the layout itself — paths, ponds, trees, houses, benches… — comes from the world file's `decor`.
import * as THREE from 'three';
import type { ThingDef, NpcDef } from '@spell/shared';
import { mat, skyMaterial, worldUV, edgeMask, type SkyMaterial } from './materials';
import * as Mdl from './models';

export interface Entity {
  id: string;
  def: ThingDef | NpcDef;
  model: Mdl.Model;
  isNpc: boolean;
  talk: boolean;
  mood?: string;
  hidden: boolean;
  /** world id for portals */
  portal?: string;
  /** magic state */
  fx: { lift: number; liftT: number; spin: number; scale: number; scaleTarget: number; lit: boolean; tint?: string; open: boolean; base: THREE.Vector3; follow?: boolean;
    dance?: number; hop?: number; shake?: number; nap?: number; sing?: number; glow?: boolean; frozen?: boolean; rainbow?: boolean; vanished?: boolean;
    scurry?: number; scurryTo?: THREE.Vector3; summon?: boolean; emoteT?: number; emote?: string; fxT?: number;
    moveTo?: THREE.Vector3; cloud?: number; fade?: number };
  /** the real model while it is turned into something else */
  orig?: Mdl.Model;
  /** a copy made by "Make three ducks!" */
  copyOf?: string;
}

export interface Obstacle { id: string; x: number; z: number; r: number }

/** the mood of a scene: colours of ground / sky / fog and where the sun is */
export interface Mood { ground: [string, string]; skyTop: string; skyBottom: string; fog: string; sun: THREE.Vector3; sunColor: string; sunIntensity: number }

export interface BuiltScene {
  group: THREE.Group;
  bounds: number;
  decor: Obstacle[];
  indoor: boolean;
  update: (t: number, dt: number) => void;
  mood: Mood;
  /** materials that change with the seasons */
  leaves: THREE.MeshStandardMaterial[];
  ground: THREE.MeshStandardMaterial | null;
  sky: SkyMaterial | null;
  setSky: (top: string, bottom: string) => void;
}

const MOODS: Record<string, Partial<Mood>> = {
  island: { ground: ['#86c464', '#4f8f40'], fog: '#d6ecfa' },
  zoo: { ground: ['#8cc766', '#5a9a48'] },
  market: { ground: ['#e3d3ab', '#c9b48a'], fog: '#f2e6d0', skyBottom: '#f7ecd8', sunColor: '#fff0d6' },
  classroom: { ground: ['#c99a6a', '#b0835a'], fog: '#f2e8d8' },
  weather_town: { ground: ['#90c86c', '#5f9c4c'] },
  park: { ground: ['#84c262', '#4f8f40'] },
  valley: { ground: ['#8cc766', '#58984a'] },
  town: { ground: ['#90c86c', '#5f9c4c'] },
  club: { ground: ['#8cc766', '#5a9a48'], fog: '#f0e6d8', skyBottom: '#f6eadc' },
  herb: { ground: ['#7cb85e', '#4a8a3c'], fog: '#dfeedd', skyBottom: '#e6f2e2' },
  castle: { ground: ['#90c86c', '#5f9c4c'], fog: '#e4e0ea', skyBottom: '#ecebf4' },
};
const BASE_MOOD: Mood = { ground: ['#86c96a', '#6bb054'], skyTop: '#4f9fe6', skyBottom: '#dcecfb', fog: '#cfe3f3', sun: new THREE.Vector3(0.55, 0.9, 0.4), sunColor: '#fff1dc', sunIntensity: 2.0 };

function disc(r: number, m: THREE.Material, y: number, x = 0, z = 0): THREE.Mesh {
  const base = new THREE.CircleGeometry(r, 72);
  base.setAttribute('uv1', base.getAttribute('uv').clone()); // 0..1 for the soft edge mask
  const geo = worldUV(base);
  const o = new THREE.Mesh(geo, m);
  o.rotation.x = -Math.PI / 2; o.position.set(x, y, z);
  o.receiveShadow = true;
  return o;
}

// water: a gently moving, glossy surface
const waterMat = () => mat('#5fb2e0', { roughness: 0.08, metalness: 0.1, color2: '#8fd0f0', scale: 3, opacity: 0.92, depthWrite: false });

export interface DecorItemBase { at: [number, number] }
export type DecorItem =
  | { k: 'tree' | 'pine'; at: [number, number]; s?: number; leaf?: string }
  | { k: 'grove'; at: [number, number]; r: number; n: number; kind?: 'tree' | 'pine' | 'mix'; s?: number }
  | { k: 'model'; m: string; at: [number, number]; rot?: number; s?: number; solid?: number; h?: number }
  | { k: 'path'; pts: [number, number][]; w?: number; color?: string }
  | { k: 'plaza'; at: [number, number]; r: number; color?: string }
  | { k: 'pond'; at: [number, number]; r: number; sx?: number }
  | { k: 'fence'; from: [number, number]; to: [number, number]; color?: string }
  | { k: 'house'; at: [number, number]; rot?: number; w?: number; h?: number; wall?: string; roof?: string }
  | { k: 'mountain'; at: [number, number]; r: number; h: number; snow?: boolean; color?: string }
  | { k: 'rock'; at: [number, number]; s?: number }
  | { k: 'meadow'; at: [number, number]; r: number; n?: number }
  | { k: 'lamp'; at: [number, number] }
  | { k: 'wall'; from: [number, number]; to: [number, number]; h?: number; color?: string }
  | { k: 'tower'; at: [number, number]; r?: number; h?: number; roof?: string }
  | { k: 'shelf'; at: [number, number]; rot?: number; w?: number; h?: number };

export interface EnvOpts { bounds?: number; decor?: DecorItem[] }

export function buildEnvironment(key: string, envOpts: EnvOpts = {}): BuiltScene {
  const g = new THREE.Group();
  const decor: Obstacle[] = [];
  const updates: ((t: number, dt: number) => void)[] = [];
  const leaves = new Set<THREE.MeshStandardMaterial>();
  const mood: Mood = { ...BASE_MOOD, ...(MOODS[key] || {}) };
  const indoor = key === 'classroom';
  let bounds = envOpts.bounds || (key === 'island' ? 50 : 40);
  const rnd = (() => { let s = 1234; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })(); // stable layout

  // sky
  let sky: SkyMaterial | null = null;
  if (!indoor) {
    sky = skyMaterial(mood.skyTop, mood.skyBottom);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 16), sky);
    dome.renderOrder = -10;
    g.add(dome);
    updates.push((t) => { sky!.uniforms.uTime.value = t; });
  }
  const setSky = (top: string, bottom: string) => { if (sky) { sky.uniforms.uTop.value.set(top); sky.uniforms.uBottom.value.set(bottom); } };

  // ground
  let groundMat: THREE.MeshStandardMaterial | null = null;
  if (indoor) {
    const R = bounds * 1.2, H = Math.max(9, bounds * 0.55);
    groundMat = mat(mood.ground[0], { color2: mood.ground[1], scale: 1.2, roughness: 0.6 });
    const floor = new THREE.Mesh(worldUV(new THREE.PlaneGeometry(R * 2, R * 2)), groundMat);
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
    const room = new THREE.Mesh(new THREE.BoxGeometry(R * 2, H, R * 2), mat('#f6efe0', { color2: '#ebdfc8', scale: 3, side: THREE.BackSide, roughness: 0.95 }));
    room.position.y = H / 2; room.receiveShadow = true; g.add(room);
    const winM = mat('#cfeaff', { emissive: '#eaf6ff', emissiveIntensity: 1.1, roughness: 0.1 });
    const nWin = Math.max(3, Math.round(R / 4));
    for (let i = 0; i < nWin; i++) for (const side of [1, -1]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3), winM);
      w.position.set(-R + (2 * R * (i + 0.5)) / nWin, 4.5, side * (R - 0.05)); w.rotation.y = side > 0 ? Math.PI : 0; g.add(w);
    }
  } else {
    groundMat = mat(mood.ground[0], { color2: mood.ground[1], scale: 7, roughness: 0.95 });
    g.add(disc(bounds + 60, groundMat, 0));
  }
  if (key === 'island') {
    // the hub floats in the sky: cliffs below, the sea far down, a stone ring path, little islands around
    g.add(disc(600, waterMat(), -12));
    const cliff = new THREE.Mesh(new THREE.CylinderGeometry(bounds + 6, bounds - 10, 16, 64, 1, true), mat('#a88b6a', { color2: '#7f6448', scale: 3, flat: true }));
    cliff.position.y = -8.02; g.add(cliff);
    const ring = new THREE.Mesh(worldUV(new THREE.RingGeometry(23, 26, 96)), mat('#ddcda6', { color2: '#c2ae86', scale: 1.2 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; ring.receiveShadow = true; g.add(ring);
    g.add(Mdl.grassField(1600, bounds, '#6fae52', [{ x: 0, z: 0, r: 9 }, { x: 0, z: -30, r: 9 }]));
    for (const [x, z, s] of [[-14, 10, 1.1], [16, 12, 1.2], [-18, -16, 1], [20, -10, 0.9], [-36, 4, 1.3], [37, -4, 1.2], [8, 38, 1.1], [-10, 40, 1], [30, 30, 1.2], [-32, 30, 1.1], [-40, -24, 1.2], [40, -26, 1]] as [number, number, number][]) addTree(x, z, s, rnd() > 0.5 ? 'pine' : 'round');
    for (let i = 0; i < 4; i++) { const isl = new THREE.Mesh(new THREE.CylinderGeometry(9, 4, 8, 12), mat('#7cc464', { flat: true })); isl.position.set(Math.cos(i * 1.7) * 140, 18 + i * 6, Math.sin(i * 1.7) * 140); g.add(isl); }
  }

  function addTree(x: number, z: number, s = 1, kind: 'round' | 'pine' = 'round', leaf?: string) {
    const t = kind === 'pine' ? Mdl.pine(s) : Mdl.roundTree(s, leaf);
    t.root.position.set(x, 0, z); t.root.rotation.y = x * 0.7;
    g.add(t.root);
    for (const m of [].concat(t.parts.leaf || [])) leaves.add(m);
    if (t.update) updates.push((tt, dt) => t.update!(tt, dt, { talk: false }));
    decor.push({ id: 'tree', x, z, r: 0.8 * s });
  }

  // ---- decor from the world file
  const flowerCols = ['#ff6f91', '#ffd23f', '#ffffff', '#c58bff', '#ff9a3c', '#6fc3ff'];
  // ground decals: noisy dirt with a ragged, dithered edge (alphaHash needs no sorting)
  const pathMats = new Map<string, THREE.MeshStandardMaterial>();
  const pathMat = (c: string, kind: 'strip' | 'disc' = 'disc') => {
    const key = c + kind;
    if (!pathMats.has(key)) {
      const m = mat(c, { color2: new THREE.Color(c).multiplyScalar(0.86).getStyle(), scale: 1.4, roughness: 0.95 });
      m.alphaMap = edgeMask(kind); m.alphaHash = true;
      pathMats.set(key, m);
    }
    return pathMats.get(key)!;
  };
  for (const d of envOpts.decor || []) {
    switch (d.k) {
      case 'tree': case 'pine': addTree(d.at[0], d.at[1], d.s || 1, d.k === 'pine' ? 'pine' : 'round', d.leaf); break;
      case 'grove': for (let i = 0; i < d.n; i++) { const a = (i / d.n) * Math.PI * 2 + Math.sin(i * 7.3) * 0.6, r = d.r * Math.sqrt((i * 0.618) % 1 + 0.05); addTree(d.at[0] + Math.cos(a) * r, d.at[1] + Math.sin(a) * r, (d.s || 1) * (0.8 + ((i * 37) % 10) / 20), d.kind === 'pine' ? 'pine' : d.kind === 'tree' ? 'round' : i % 2 ? 'pine' : 'round'); } break;
      case 'model': {
        const m = Mdl.buildModel(d.m, d.h ? { h: d.h } : {});
        m.root.position.set(d.at[0], 0, d.at[1]); m.root.rotation.y = d.rot || 0; if (d.s) m.root.scale.setScalar(d.s);
        g.add(m.root); if (m.update) updates.push((t, dt) => m.update!(t, dt, { talk: false }));
        if (d.solid) decor.push({ id: d.m, x: d.at[0], z: d.at[1], r: d.solid });
        break;
      }
      case 'path': {
        const w = d.w || 3.2, col = d.color || '#e2cf9e', pm = pathMat(col, 'strip'), dm = pathMat(col);
        g.add(disc(w / 2, dm, 0.026, d.pts[0][0], d.pts[0][1]));
        for (let i = 0; i < d.pts.length - 1; i++) {
          const [x1, z1] = d.pts[i], [x2, z2] = d.pts[i + 1], len = Math.hypot(x2 - x1, z2 - z1);
          const pg = new THREE.PlaneGeometry(w, len);
          const uv = pg.getAttribute('uv'), uv1 = uv.clone();
          for (let k = 0; k < uv1.count; k++) uv1.setY(k, uv.getY(k) * len / w); // mask tiles along the path
          pg.setAttribute('uv1', uv1);
          const seg = new THREE.Mesh(worldUV(pg), pm);
          seg.rotation.x = -Math.PI / 2; seg.rotation.z = -Math.atan2(x2 - x1, z2 - z1);
          seg.position.set((x1 + x2) / 2, 0.025 + i * 0.0005, (z1 + z2) / 2); seg.receiveShadow = true; g.add(seg);
          g.add(disc(w / 2, dm, 0.026, x2, z2));
        }
        break;
      }
      case 'plaza': g.add(disc(d.r, pathMat(d.color || '#d9c9a3'), 0.022, d.at[0], d.at[1])); break;
      case 'pond': {
        const wm = waterMat();
        const w = disc(d.r, wm, 0.04, d.at[0], d.at[1]); w.scale.x = d.sx || 1; g.add(w);
        updates.push((t) => { if (wm.map) wm.map.offset.set(t * 0.01, t * 0.006); });
        const rim = new THREE.Mesh(new THREE.TorusGeometry(d.r * 1.04, 0.22, 6, 48), mat('#b8a888', { flat: true }));
        rim.rotation.x = -Math.PI / 2; rim.scale.x = d.sx || 1; rim.position.set(d.at[0], 0.05, d.at[1]); g.add(rim);
        decor.push({ id: 'pond', x: d.at[0], z: d.at[1], r: d.r * 0.85 });
        break;
      }
      case 'fence': { const [x1, z1] = d.from, [x2, z2] = d.to; const f = Mdl.fence(Math.hypot(x2 - x1, z2 - z1), d.color); f.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2); f.rotation.y = -Math.atan2(z2 - z1, x2 - x1); g.add(f); break; }
      case 'house': { const h = Mdl.house(d.w || 5, d.h || 3.6, d.wall || '#f6e0c2', d.roof || '#c8553d'); h.root.position.set(d.at[0], 0, d.at[1]); h.root.rotation.y = d.rot || 0; g.add(h.root); decor.push({ id: 'house', x: d.at[0], z: d.at[1], r: (d.w || 5) * 0.62 }); break; }
      case 'mountain': { const m = Mdl.mountain(d.r, d.h, d.color || '#86a870', !!d.snow); m.position.set(d.at[0], 0, d.at[1]); g.add(m); if (Math.hypot(d.at[0], d.at[1]) < bounds + d.r) decor.push({ id: 'hill', x: d.at[0], z: d.at[1], r: d.r * 0.8 }); break; }
      case 'rock': { const r = Mdl.rock(d.s || 1); r.position.x = d.at[0]; r.position.z = d.at[1]; r.rotation.y = d.at[0] * 1.7; g.add(r); decor.push({ id: 'rock', x: d.at[0], z: d.at[1], r: (d.s || 1) * 0.8 }); break; }
      case 'wall': {
        const [x1, z1] = d.from, [x2, z2] = d.to, len = Math.hypot(x2 - x1, z2 - z1), h = d.h || 4.5;
        const stone = mat(d.color || '#bdb6aa', { color2: '#9c9488', scale: 1.2 });
        const w = new THREE.Group();
        w.add(Mdl.box(stone, [0, h / 2, 0], [len, h, 1.2]));
        for (let x = -len / 2 + 0.5; x <= len / 2 - 0.4; x += 1.6) w.add(Mdl.box(stone, [x, h + 0.4, 0], [0.8, 0.8, 1.2]));
        w.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2); w.rotation.y = -Math.atan2(z2 - z1, x2 - x1); g.add(w);
        break;
      }
      case 'tower': {
        const r = d.r || 2.2, h = d.h || 9;
        g.add(Mdl.cyl(mat('#bdb6aa', { color2: '#9c9488', scale: 1.2 }), [d.at[0], h / 2, d.at[1]], [r, h, r]), Mdl.cone(mat(d.roof || '#4f6fb8', { roughness: 0.6 }), [d.at[0], h + 1.5, d.at[1]], [r * 1.2, 3, r * 1.2]));
        decor.push({ id: 'tower', x: d.at[0], z: d.at[1], r: r + 0.3 });
        break;
      }
      case 'shelf': { const sh = Mdl.bookshelf(d.w || 4, d.h || 3.2); sh.position.set(d.at[0], 0, d.at[1]); sh.rotation.y = d.rot || 0; g.add(sh); decor.push({ id: 'shelf', x: d.at[0], z: d.at[1], r: (d.w || 4) / 2 }); break; }
      case 'lamp': { const l = Mdl.buildModel('lamp_post'); l.root.position.set(d.at[0], 0, d.at[1]); g.add(l.root); break; }
      case 'meadow': {
        const n = d.n || 60, geo = new THREE.SphereGeometry(0.075, 6, 4), per = Math.ceil(n / flowerCols.length);
        flowerCols.forEach((c, ci) => {
          const im = new THREE.InstancedMesh(geo, mat(c, { emissive: c, emissiveIntensity: 0.15 }), per);
          const o = new THREE.Object3D(); let k = 0;
          for (let i = ci; i < n; i += flowerCols.length) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * d.r; o.position.set(d.at[0] + Math.cos(a) * r, 0.16, d.at[1] + Math.sin(a) * r); o.scale.set(1, 0.6, 1); o.updateMatrix(); im.setMatrixAt(k++, o.matrix); }
          im.count = k; g.add(im);
        });
        break;
      }
    }
  }

  if (!indoor) {
    // clouds drifting high up
    for (let i = 0; i < 12; i++) {
      const c = Mdl.cloud(1.5 + rnd() * 2), a = rnd() * Math.PI * 2, r = 60 + rnd() * 80, sp = 0.5 + rnd();
      c.position.set(Math.cos(a) * r, 40 + rnd() * 20, Math.sin(a) * r);
      g.add(c); updates.push((t) => { c.position.x += Math.sin(t * 0.05 + i) * 0.01 * sp; });
    }
    // grass tufts around the edges of lesson worlds (the island has its own)
    if (key !== 'island') {
      const gf = Mdl.grassField(2200, bounds + 8, new THREE.Color(mood.ground[1]).multiplyScalar(0.8).getStyle(), [{ x: 0, z: 0, r: 6 }]);
      g.add(gf); leaves.add((gf as THREE.Mesh).material as THREE.MeshStandardMaterial); // grass follows the season too
    }
    // butterflies over the grass, birds circling high up
    const wingGeo = new THREE.CircleGeometry(0.16, 8);
    const flies = Array.from({ length: 14 }, (_, i) => {
      const m = new THREE.MeshBasicMaterial({ color: flowerCols[i % flowerCols.length], side: THREE.DoubleSide });
      const o = new THREE.Group(), l = new THREE.Mesh(wingGeo, m), r = new THREE.Mesh(wingGeo, m);
      l.position.x = -0.12; r.position.x = 0.12; o.add(l, r); g.add(o);
      const a = rnd() * Math.PI * 2, rr = 4 + rnd() * (bounds - 6);
      return { o, l, r, c: new THREE.Vector3(Math.cos(a) * rr, 0.8 + rnd() * 1.2, Math.sin(a) * rr), ph: rnd() * 10, sp: 0.4 + rnd() * 0.5 };
    });
    const birdM = new THREE.MeshBasicMaterial({ color: '#4a4f63', side: THREE.DoubleSide });
    const birds = Array.from({ length: 6 }, (_, i) => {
      const o = new THREE.Group(), w1 = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.18), birdM), w2 = w1.clone();
      w1.position.x = -0.42; w2.position.x = 0.42; o.add(w1, w2); g.add(o);
      return { o, w1, w2, ph: (i / 6) * Math.PI * 2, r: 30 + (i % 3) * 8, h: 22 + (i % 2) * 5 };
    });
    updates.push((t) => {
      for (const f of flies) {
        const tt = t * f.sp + f.ph;
        f.o.position.set(f.c.x + Math.sin(tt) * 2.2, f.c.y + Math.sin(tt * 2.3) * 0.4, f.c.z + Math.cos(tt * 0.8) * 2.2);
        f.o.rotation.y = tt + Math.PI / 2;
        const flap = Math.sin(t * 18 + f.ph) * 0.9; f.l.rotation.y = flap; f.r.rotation.y = -flap;
      }
      for (const b of birds) {
        const a = t * 0.12 + b.ph;
        b.o.position.set(Math.cos(a) * b.r, b.h + Math.sin(t * 0.5 + b.ph) * 1.5, Math.sin(a) * b.r); b.o.rotation.y = -a;
        const fl = Math.sin(t * 6 + b.ph) * 0.5; b.w1.rotation.z = fl; b.w2.rotation.z = -fl;
      }
    });
    // soft hills on the horizon
    if (key !== 'island') {
      const hill = new THREE.Color(mood.ground[1]).lerp(new THREE.Color(mood.fog), 0.35).getStyle();
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + 0.2, R = bounds + 38 + (i % 3) * 8; const m = Mdl.mountain(14 + (i % 4) * 4, 8 + (i % 3) * 4, hill); m.position.set(Math.cos(a) * R, -0.5, Math.sin(a) * R); g.add(m); }
    }
  }

  return { group: g, bounds, decor, indoor, mood, leaves: [...leaves], ground: groundMat, sky, setSky, update: (t, dt) => updates.forEach((u) => u(t, dt)) };
}

export function placeEntity(def: ThingDef | NpcDef, isNpc: boolean): Entity {
  const model = Mdl.buildModel(def.model, def.params || {});
  model.root.position.set(def.pos[0], def.pos[1] || 0, def.pos[2]);
  model.root.rotation.y = def.rot || 0;
  if (def.scale) model.root.scale.setScalar(def.scale);
  return {
    id: def.id, def, model, isNpc, talk: false, hidden: !!def.hidden,
    fx: { lift: 0, liftT: 0, spin: 0, scale: def.scale || 1, scaleTarget: def.scale || 1, lit: false, open: false, base: model.root.position.clone() },
  };
}
