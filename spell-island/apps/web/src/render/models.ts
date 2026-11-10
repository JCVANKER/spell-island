// Models by key: the 3D asset when it is loaded (render/assets.ts), otherwise a small procedural stand-in.
// Procedural pieces are kept for scenery that is built from parameters (trees, fences, houses, hills…),
// for the word stars and for food that has no asset yet. All models face +Z with their feet at y = 0.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mat, leafTintable, setLeaf } from './materials';
import { assetModel, hasAsset, type Model } from './assets';

export type { Model };

// ---------- helpers ----------
const G = {
  sphere: new THREE.SphereGeometry(1, 24, 16),
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
  cone: new THREE.ConeGeometry(1, 1, 16),
};
type V3 = [number, number, number];
function mesh(geo: THREE.BufferGeometry, m: THREE.Material, pos: V3 = [0, 0, 0], scale: V3 | number = 1, rot: V3 = [0, 0, 0]): THREE.Mesh {
  const o = new THREE.Mesh(geo, m);
  o.position.set(...pos);
  if (typeof scale === 'number') o.scale.setScalar(scale); else o.scale.set(...scale);
  o.rotation.set(...rot);
  o.castShadow = true; o.receiveShadow = true;
  return o;
}
export const sph = (m: THREE.Material, pos: V3, s: V3 | number, rot?: V3) => mesh(G.sphere, m, pos, s, rot);
export const box = (m: THREE.Material, pos: V3, s: V3, rot?: V3) => mesh(G.box, m, pos, s, rot);
export const cyl = (m: THREE.Material, pos: V3, s: V3, rot?: V3) => mesh(G.cyl, m, pos, s, rot);
export const cone = (m: THREE.Material, pos: V3, s: V3, rot?: V3) => mesh(G.cone, m, pos, s, rot);
const group = (...c: THREE.Object3D[]) => { const g = new THREE.Group(); c.forEach((x) => g.add(x)); return g; };

// shared scenery materials (one per look, so hundreds of trees cost a handful of materials)
const LEAF = new Map<string, THREE.MeshStandardMaterial>();
const leafMat = (c: string) => LEAF.get(c) || (LEAF.set(c, mat(c, { color2: new THREE.Color(c).multiplyScalar(0.78).getStyle(), scale: 2 })), LEAF.get(c)!);
const BARK = mat('#7a5434', { color2: '#5f4128', scale: 1 });

// ---------- scenery ----------
/** a scenery tree from the AI model (leaves recolourable by season magic); null if it isn't loaded */
function assetTree(id: string, scale: number, leaf?: string): Model | null {
  const m = assetModel(id, { height: (id === 'pine' ? 4.5 : 4.2) * scale, share: !leaf });
  if (!m) return null;
  const mats = (m.parts.mats as THREE.MeshStandardMaterial[]).map(leafTintable);
  if (leaf) mats.forEach((x) => setLeaf(x, leaf));
  m.parts.leaf = mats;
  return m;
}
export function roundTree(scale = 1, leaf?: string): Model {
  const a = assetTree('round_tree', scale, leaf);
  if (a) return a;
  const lm = leafMat(leaf || '#5fa84e');
  const root = group(cyl(BARK, [0, 1.0 * scale, 0], [0.22 * scale, 2.0 * scale, 0.22 * scale]));
  for (const [x, y, z, r] of [[0, 2.6, 0, 1.25], [0.7, 2.2, 0.3, 0.85], [-0.6, 2.3, -0.3, 0.9], [0.1, 3.2, -0.2, 0.8]]) root.add(sph(lm, [x * scale, y * scale, z * scale], r * scale));
  const ph = Math.random() * 6;
  return { root, height: 3.8 * scale, parts: { leaf: lm }, update: (t) => { root.rotation.z = Math.sin(t * 0.8 + ph) * 0.012; } };
}
export function pine(scale = 1, color = '#3f7f4a'): Model {
  const a = assetTree('pine', scale);
  if (a) return a;
  const lm = leafMat(color);
  const root = group(cyl(BARK, [0, 0.5 * scale, 0], [0.16 * scale, 1 * scale, 0.16 * scale]));
  for (let i = 0; i < 3; i++) root.add(cone(lm, [0, (1.3 + i * 0.85) * scale, 0], [(1.2 - i * 0.3) * scale, 1.4 * scale, (1.2 - i * 0.3) * scale]));
  return { root, height: 4 * scale, parts: { leaf: lm } };
}
const FENCE = new Map<string, THREE.MeshStandardMaterial>();
export function fence(len: number, color = '#c8a070'): THREE.Group {
  const m = FENCE.get(color) || (FENCE.set(color, mat(color, { color2: new THREE.Color(color).multiplyScalar(0.85).getStyle(), scale: 0.6 })), FENCE.get(color)!);
  const g = new THREE.Group();
  for (let x = -len / 2; x <= len / 2 + 0.01; x += 1.2) g.add(box(m, [x, 0.5, 0], [0.12, 1, 0.12]));
  g.add(box(m, [0, 0.75, 0], [len, 0.08, 0.06]), box(m, [0, 0.4, 0], [len, 0.08, 0.06]));
  return g;
}
export function house(w = 4, h = 3.2, wall = '#f2e6cf', roof = '#c8553d'): Model {
  const blue = new THREE.Color(roof).getHSL({ h: 0, s: 0, l: 0 }).h > 0.45;
  const a = assetModel(blue ? 'cottage_blue' : 'cottage', { height: (h + w * 0.35) * 1.1, share: true });
  if (a) return a;
  const root = group(box(mat(wall, { color2: new THREE.Color(wall).multiplyScalar(0.92).getStyle(), scale: 1.5 }), [0, h / 2, 0], [w, h, w * 0.8]));
  root.add(mesh(new THREE.ConeGeometry(w * 0.78, h * 0.6, 4), mat(roof, { roughness: 0.7 }), [0, h + h * 0.3, 0], 1, [0, Math.PI / 4, 0]));
  root.add(box(mat('#7b5a3e'), [0, 0.7, w * 0.4 + 0.02], [0.8, 1.4, 0.05]), box(mat('#bfe0f7', { emissive: '#ffe9b0', emissiveIntensity: 0.25, roughness: 0.2 }), [w * 0.28, h * 0.6, w * 0.4 + 0.02], [0.7, 0.6, 0.05]));
  return { root, height: h * 1.6, parts: {} };
}
export function mountain(r = 20, h = 14, color = '#7f9f6a', snow = false): THREE.Group {
  const g = new THREE.Group();
  const m = mesh(new THREE.ConeGeometry(r, h, 9, 3), mat(color, { color2: new THREE.Color(color).multiplyScalar(0.82).getStyle(), scale: 6, flat: true }), [0, h / 2 - 0.5, 0]);
  m.castShadow = false;
  g.add(m);
  if (snow) g.add(mesh(new THREE.ConeGeometry(r * 0.32, h * 0.32, 9), mat('#f4f6fb', { roughness: 0.6, flat: true }), [0, h * 0.84, 0]));
  return g;
}
const CLOUD = mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 1 });
export function cloud(scale = 1): THREE.Group {
  const g = group(sph(CLOUD, [0, 0, 0], [2.2 * scale, 1.2 * scale, 1.4 * scale]), sph(CLOUD, [1.8 * scale, -0.2 * scale, 0], [1.5 * scale, 1 * scale, 1.2 * scale]), sph(CLOUD, [-1.7 * scale, -0.3 * scale, 0.2], [1.4 * scale, 0.9 * scale, 1.1 * scale]));
  g.traverse((o) => { o.castShadow = false; });
  return g;
}
const ROCK = mat('#a89a86', { color2: '#857868', scale: 0.8, flat: true });
export function rock(scale = 1): THREE.Object3D {
  const a = assetModel('rock', { height: scale * 0.9, share: true });
  if (a) { a.root.scale.x = a.root.scale.z = 1.4; return a.root; }
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 0.82 + Math.sin(p.getX(i) * 4.1 + p.getZ(i) * 2.3) * 0.12; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.7, p.getZ(i) * k); }
  geo.computeVertexNormals();
  const m = mesh(geo, ROCK, [0, scale * 0.35, 0], scale);
  return m;
}

/** a field of grass tufts (one instanced mesh) */
export function grassField(count: number, radius: number, color = '#78b85a', avoid: { x: number; z: number; r: number }[] = []): THREE.Object3D {
  // a tuft: three thin blades leaning out
  const blades = [0, 1, 2].map((k) => { const b = new THREE.ConeGeometry(0.025, 0.32 + k * 0.05, 3); b.translate(0, 0.16, 0); b.rotateZ((k - 1) * 0.4); b.rotateY(k * 2.1); return b; });
  const geo = mergeGeometries(blades)!;
  const im = new THREE.InstancedMesh(geo, mat(color, { roughness: 1 }), count);
  const d = new THREE.Object3D();
  let n = 0;
  for (let i = 0; i < count * 3 && n < count; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * radius, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (avoid.some((o) => Math.hypot(o.x - x, o.z - z) < o.r)) continue;
    d.position.set(x, 0, z); d.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * 6, (Math.random() - 0.5) * 0.5); d.scale.setScalar(0.6 + Math.random() * 0.9);
    d.updateMatrix(); im.setMatrixAt(n++, d.matrix);
  }
  im.count = n;
  im.receiveShadow = true;
  return im;
}

export function lampPost(): Model {
  const metal = mat('#3b3b46', { metalness: 0.6, roughness: 0.45 });
  const glass = mat('#fff4c8', { emissive: '#ffcf6b', emissiveIntensity: 0, roughness: 0.2 });
  const root = group(cyl(metal, [0, 1.4, 0], [0.08, 2.8, 0.08]), box(glass, [0, 3.0, 0], [0.45, 0.55, 0.45]), cone(metal, [0, 3.45, 0], [0.4, 0.35, 0.4]), cyl(metal, [0, 0.06, 0], [0.3, 0.12, 0.3]));
  return { root, height: 3.6, parts: { glass } };
}

export function bookshelf(w = 3.2, h = 5): THREE.Group {
  const wood = mat('#6b4f3a', { color2: '#5a4030', scale: 1 });
  const g = new THREE.Group();
  g.add(box(wood, [0, h / 2, 0], [w, h, 0.25]), box(wood, [-w / 2, h / 2, 0.4], [0.15, h, 0.9]), box(wood, [w / 2, h / 2, 0.4], [0.15, h, 0.9]));
  const cols = ['#a8443a', '#3f6aa8', '#5f8f4e', '#d9a23a', '#7a4f9a', '#c46f4a', '#4f7f8a', '#8a5a7a'].map((c) => mat(c, { roughness: 0.7 }));
  for (let s = 0; s < Math.floor(h / 1.1); s++) {
    const y = 0.15 + s * 1.1;
    g.add(box(wood, [0, y, 0.4], [w, 0.1, 0.9]));
    for (let x = -w / 2 + 0.2, k = s * 3; x < w / 2 - 0.3; k++) {
      const bw = 0.15 + ((k * 37) % 7) * 0.025, bh = 0.6 + ((k * 13) % 5) * 0.07;
      g.add(box(cols[k % cols.length], [x + bw / 2, y + 0.05 + bh / 2, 0.42], [bw, bh, 0.62], [0, 0, (k * 7) % 5 === 0 ? 0.15 : 0]));
      x += bw + 0.02;
    }
  }
  return g;
}

// ---------- food (conjured, carried, eaten): the asset food_<kind> if there is one ----------
const FOOD_LOOK: Record<string, [string, string, number]> = {
  apple: ['#d8343a', 'sphere', 0.22], banana: ['#f2d23c', 'banana', 0.3], orange: ['#f08a24', 'sphere', 0.22], pear: ['#b5d45a', 'pear', 0.24],
  watermelon: ['#3f8f3a', 'big', 0.45], grapes: ['#7a3f9a', 'grapes', 0.25], durian: ['#b8a24a', 'spiky', 0.35], strawberry: ['#e23b4a', 'cone', 0.16],
  peach: ['#f5a38a', 'sphere', 0.22], lemon: ['#f4e04a', 'sphere', 0.18], mango: ['#f3b13a', 'pear', 0.22], cake: ['#f7d6e0', 'cake', 0.4],
  'ice cream': ['#fbe3ec', 'icecream', 0.3], pizza: ['#f0b85a', 'pizza', 0.45], bread: ['#d9a35f', 'bread', 0.3], candy: ['#ff6fb5', 'sphere', 0.14],
  cookie: ['#c98b4a', 'disc', 0.2], carrot: ['#f07a24', 'cone', 0.3], egg: ['#fff6e6', 'egg', 0.18], hamburger: ['#d9963f', 'burger', 0.3],
  'hot dog': ['#c8603a', 'bread', 0.3], noodles: ['#f6e2a8', 'bowl', 0.3], rice: ['#ffffff', 'bowl', 0.3],
};
export function food(kind: string): Model {
  const asset = assetModel(`food_${kind.replace(/\s+/g, '_')}`) || (kind === 'cake' ? assetModel('cake') : null);
  if (asset) return asset;
  const [c, shape, r] = FOOD_LOOK[kind] || ['#f2c94c', 'sphere', 0.2];
  const m = mat(c, { roughness: 0.45 });
  const root = new THREE.Group();
  switch (shape) {
    case 'banana': root.add(mesh(new THREE.TorusGeometry(r, r * 0.25, 8, 16, Math.PI * 0.8), m, [0, r * 0.5, 0], 1, [0, 0, Math.PI * 1.1])); break;
    case 'pear': root.add(sph(m, [0, r, 0], [r, r * 1.2, r]), sph(m, [0, r * 2, 0], r * 0.6)); break;
    case 'big': root.add(sph(m, [0, r, 0], [r * 1.3, r, r])); break;
    case 'grapes': for (let i = 0; i < 9; i++) root.add(sph(m, [Math.sin(i * 2) * r * 0.5, r * 1.6 - Math.floor(i / 3) * r * 0.45, Math.cos(i * 2) * r * 0.5], r * 0.3)); break;
    case 'spiky': root.add(mesh(new THREE.IcosahedronGeometry(r, 0), m, [0, r, 0], [1, 1.2, 1])); break;
    case 'cone': root.add(cone(m, [0, r, 0], [r * 0.7, r * 1.6, r * 0.7], [Math.PI, 0, 0])); break;
    case 'cake': root.add(cyl(mat('#ffffff'), [0, 0.02, 0], [r * 1.3, 0.04, r * 1.3]), cyl(m, [0, r * 0.45, 0], [r, r * 0.8, r]), cyl(mat('#e2486a'), [0, r * 0.88, 0], [r * 1.02, 0.06, r * 1.02]), sph(mat('#ffcc44', { emissive: '#ffb020' }), [0, r * 1.25, 0], 0.05)); break;
    case 'icecream': root.add(cone(mat('#d9a35f'), [0, r * 0.6, 0], [r * 0.5, r * 1.2, r * 0.5], [Math.PI, 0, 0]), sph(m, [0, r * 1.35, 0], r * 0.55)); break;
    case 'pizza': root.add(cyl(m, [0, 0.04, 0], [r, 0.06, r]), ...[0, 1, 2, 3, 4].map((i) => cyl(mat('#c8343a'), [Math.sin(i * 1.3) * r * 0.5, 0.08, Math.cos(i * 1.3) * r * 0.5], [r * 0.15, 0.02, r * 0.15]))); break;
    case 'bread': root.add(sph(m, [0, r * 0.4, 0], [r * 1.4, r * 0.6, r * 0.8])); break;
    case 'disc': root.add(cyl(m, [0, 0.03, 0], [r, 0.05, r])); break;
    case 'egg': root.add(sph(m, [0, r, 0], [r * 0.8, r, r * 0.8])); break;
    case 'burger': root.add(sph(mat('#d9963f'), [0, r * 0.9, 0], [r, r * 0.45, r]), cyl(mat('#6b3a24'), [0, r * 0.5, 0], [r * 0.95, r * 0.2, r * 0.95]), cyl(mat('#7da454'), [0, r * 0.65, 0], [r, 0.04, r]), cyl(mat('#d9963f'), [0, r * 0.2, 0], [r, r * 0.25, r])); break;
    case 'bowl': root.add(sph(mat('#f4f1ea'), [0, r * 0.4, 0], [r, r * 0.6, r]), cyl(m, [0, r * 0.75, 0], [r * 0.9, 0.05, r * 0.9])); break;
    default: root.add(sph(m, [0, r, 0], r));
  }
  return { root, height: r * 2.2, parts: { mats: [m] } };
}

// ---------- word stars ----------
const STAR_GEO = (() => {
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.2 : 0.46; if (i) sh.lineTo(Math.cos(a) * r, Math.sin(a) * r); else sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 2 });
  g.center();
  return g;
})();
let GLOW: THREE.Texture | null = null;
function glowTexture() {
  if (GLOW) return GLOW;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!, grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,240,190,0.85)'); grd.addColorStop(0.4, 'rgba(255,220,120,0.35)'); grd.addColorStop(1, 'rgba(255,220,120,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  GLOW = new THREE.CanvasTexture(c); GLOW.colorSpace = THREE.SRGBColorSpace;
  return GLOW;
}
/** a floating golden star the child collects by saying its word (pink for whole sentences) */
export function wordStar(params: { sentence?: boolean } = {}): Model {
  const big = !!params.sentence, col = big ? '#ff9fcf' : '#ffcf3f';
  const star = new THREE.Mesh(STAR_GEO, mat(col, { metalness: 0.75, roughness: 0.25, emissive: col, emissiveIntensity: 0.45 }));
  star.scale.setScalar(big ? 1.25 : 0.95);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(big ? 2.1 : 1.6);
  const float = group(halo, star);
  float.position.y = 1.4;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 40), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03;
  const root = group(float, ring);
  const ph = Math.random() * 6;
  return {
    root, height: 1.6, parts: {},
    update: (t) => { float.position.y = 1.4 + Math.sin(t * 2 + ph) * 0.16; star.rotation.y = t * 1.8 + ph; ring.scale.setScalar(1 + Math.sin(t * 2 + ph) * 0.1); (ring.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(t * 2 + ph) * 0.15; },
  };
}

// ---------- stand-ins ----------
export function portalFallback(color = '#7fc8ff'): Model {
  const stone = mat('#9a978e', { color2: '#7f7c74', scale: 1 });
  const glow = mat(color, { emissive: color, emissiveIntensity: 1.2, opacity: 0.85, side: THREE.DoubleSide });
  const disc = mesh(new THREE.CircleGeometry(1, 32), glow, [0, 1.5, 0], [0.95, 1.4, 1]);
  const root = group(box(stone, [-1.2, 1.5, 0], [0.5, 3, 0.6]), box(stone, [1.2, 1.5, 0], [0.5, 3, 0.6]), box(stone, [0, 3.1, 0], [3, 0.5, 0.7]), disc);
  return { root, height: 3.4, parts: { mats: [glow] }, update: (t) => { disc.rotation.z = t; glow.emissiveIntensity = 1 + Math.sin(t * 2) * 0.3; } };
}
export function placeholder(color = '#c9a0dc', h = 1.2): Model {
  return { root: group(sph(mat(color), [0, h / 2, 0], [h * 0.35, h / 2, h * 0.35])), height: h, parts: {} };
}

/** Model for a key: the 3D asset when loaded, a procedural stand-in otherwise. */
export function buildModel(key: string, params: Record<string, any> = {}): Model {
  if (hasAsset(key) && !params.procedural) {
    const m = assetModel(key, params.h ? { height: params.h } : undefined);
    if (m) return m;
  }
  switch (key) {
    case 'lamp_post': return lampPost();
    case 'round_tree': return roundTree(params.scale || 1, params.leaf);
    case 'pine': return pine(params.scale || 1);
    case 'house': return house(params.w, params.hh, params.wall, params.roof);
    case 'portal_arch': return portalFallback(params.color);
    case 'word_star': return wordStar(params);
    case 'none': return { root: new THREE.Group(), height: 0, parts: {} };
  }
  if (key.startsWith('food:')) return food(key.slice(5));
  return placeholder(params.color, params.h || 1.2);
}
