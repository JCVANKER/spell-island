// Materials: physically based (lit by the sun, the sky and the environment map), with small procedural
// textures for ground, stone and wood so nothing needs to be downloaded for them.
import * as THREE from 'three';

export interface MatOpts {
  map?: THREE.Texture | null;
  /** second colour: a soft noise pattern between `color` and `color2` (ground, rock, wood) */
  color2?: THREE.ColorRepresentation;
  /** size of the pattern in metres */
  scale?: number;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  side?: THREE.Side;
  flat?: boolean;
  depthWrite?: boolean;
}

const noiseCache = new Map<string, THREE.Texture>();

/** a tileable soft-noise texture between two colours */
function noiseTexture(c1: THREE.ColorRepresentation, c2: THREE.ColorRepresentation): THREE.Texture {
  const key = `${new THREE.Color(c1).getHexString()}-${new THREE.Color(c2).getHexString()}`;
  const hit = noiseCache.get(key);
  if (hit) return hit;
  const N = 256, cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const g = cv.getContext('2d')!;
  const img = g.createImageData(N, N);
  // canvas bytes are sRGB: convert the (linear) colours before writing them
  const a = new THREE.Color(c1).convertLinearToSRGB(), b = new THREE.Color(c2).convertLinearToSRGB();
  // value noise on a wrapped lattice → seamless tiling
  const lattice = (s: number) => { const v = new Float32Array(s * s); for (let i = 0; i < v.length; i++) v[i] = Math.random(); return v; };
  const octaves = [[8, 0.55], [16, 0.28], [48, 0.17]].map(([s, w]) => ({ s, w, v: lattice(s) }));
  const sample = (o: { s: number; v: Float32Array }, x: number, y: number) => {
    const fx = (x / N) * o.s, fy = (y / N) * o.s, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
    const at = (i: number, j: number) => o.v[((j % o.s) * o.s) + (i % o.s)];
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    return (at(ix, iy) * (1 - sx) + at(ix + 1, iy) * sx) * (1 - sy) + (at(ix, iy + 1) * (1 - sx) + at(ix + 1, iy + 1) * sx) * sy;
  };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let n = 0;
    for (const o of octaves) n += sample(o, x, y) * o.w;
    const k = THREE.MathUtils.smoothstep(n, 0.3, 0.72);
    const i = (y * N + x) * 4;
    img.data[i] = (a.r + (b.r - a.r) * k) * 255; img.data[i + 1] = (a.g + (b.g - a.g) * k) * 255; img.data[i + 2] = (a.b + (b.b - a.b) * k) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  noiseCache.set(key, t);
  return t;
}

/** A standard lit material. Colours are given in sRGB like everywhere else in the game. */
export function mat(color: THREE.ColorRepresentation, o: MatOpts = {}): THREE.MeshStandardMaterial {
  let map = o.map ?? null;
  let base: THREE.ColorRepresentation = color;
  if (!map && o.color2 !== undefined) {
    // the pattern lives in a grey texture and the colour in material.color, so spells can recolour it
    const a = new THREE.Color(color), b = new THREE.Color(o.color2);
    const [hi, lo] = a.getHSL({ h: 0, s: 0, l: 0 }).l >= b.getHSL({ h: 0, s: 0, l: 0 }).l ? [a, b] : [b, a];
    const ratio = new THREE.Color(Math.min(1, lo.r / Math.max(hi.r, 1e-3)), Math.min(1, lo.g / Math.max(hi.g, 1e-3)), Math.min(1, lo.b / Math.max(hi.b, 1e-3)));
    map = noiseTexture('#ffffff', ratio).clone();
    map.needsUpdate = true;
    const s = 1 / (o.scale ?? 4);
    map.repeat.set(s, s);
    base = hi;
  }
  const m = new THREE.MeshStandardMaterial({
    color: base, map,
    roughness: o.roughness ?? 0.85, metalness: o.metalness ?? 0,
    emissive: o.emissive ?? '#000000', emissiveIntensity: o.emissiveIntensity ?? (o.emissive ? 1 : 0),
    transparent: (o.opacity ?? 1) < 1, opacity: o.opacity ?? 1,
    side: o.side ?? THREE.FrontSide, flatShading: !!o.flat, depthWrite: o.depthWrite ?? true,
  });
  m.userData.procedural = true;
  return m;
}

/** UVs of planar ground pieces are in metres so the noise pattern tiles at a constant size */
export function worldUV(geo: THREE.BufferGeometry, axes: 'xy' | 'xz' = 'xy'): THREE.BufferGeometry {
  const p = geo.attributes.position as THREE.BufferAttribute, uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), axes === 'xy' ? p.getY(i) : p.getZ(i));
  uv.needsUpdate = true;
  return geo;
}

/** every lit material under an object (magic recolours them) */
export function materialsOf(root: THREE.Object3D): THREE.MeshStandardMaterial[] {
  const out: THREE.MeshStandardMaterial[] = [];
  root.traverse((o) => {
    const ms = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!ms) return;
    for (const m of Array.isArray(ms) ? ms : [ms]) if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial && !out.includes(m as THREE.MeshStandardMaterial)) out.push(m as THREE.MeshStandardMaterial);
  });
  return out;
}

/** remember the original look once, so spells can be undone */
export function rememberLook(m: THREE.MeshStandardMaterial) {
  if (!m.userData.base) m.userData.base = { color: m.color.clone(), emissive: m.emissive.clone(), ei: m.emissiveIntensity, map: m.map };
  return m.userData.base as { color: THREE.Color; emissive: THREE.Color; ei: number; map: THREE.Texture | null };
}

// ---------- sky dome: gradient, soft drifting clouds, stars at night ----------
export interface SkyMaterial extends THREE.ShaderMaterial { uniforms: { uTop: { value: THREE.Color }; uBottom: { value: THREE.Color }; uStars: { value: number }; uTime: { value: number } } }

export function skyMaterial(top: THREE.ColorRepresentation, bottom: THREE.ColorRepresentation): SkyMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new THREE.Color(top) }, uBottom: { value: new THREE.Color(bottom) }, uStars: { value: 0 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop; uniform vec3 uBottom; uniform float uStars; uniform float uTime; varying vec3 vDir;
      float h3(vec3 p){ p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
      float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vn(p); p *= 2.03; a *= 0.5; } return s; }
      void main(){
        float h = clamp(vDir.y * 1.15 + 0.12, 0.0, 1.0);
        vec3 col = mix(uBottom, uTop, smoothstep(0.0, 1.0, h));
        vec3 p = vDir * 3.0 + vec3(uTime * 0.006, 0.0, 0.0);
        float c = smoothstep(0.52, 0.8, fbm(p * vec3(1.0, 2.6, 1.0))) * smoothstep(-0.02, 0.22, vDir.y);
        col = mix(col, mix(vec3(1.0), uBottom, 0.25 + 0.3 * fbm(p * 2.0 + 3.0)), c * 0.8 * (1.0 - uStars * 0.7));
        float s = step(0.997, h3(floor(vDir * 220.0))) * smoothstep(0.0, 0.25, vDir.y);
        col += vec3(s) * uStars;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  }) as SkyMaterial;
}

/** Ragged soft edge for ground decals (paths, plazas): 'strip' fades across u (uv1, tiles along v), 'disc' fades radially. */
const edgeCache = new Map<string, THREE.Texture>();
export function edgeMask(kind: 'strip' | 'disc'): THREE.Texture {
  const hit = edgeCache.get(kind);
  if (hit) return hit;
  const N = 128, cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const g = cv.getContext('2d')!, img = g.createImageData(N, N);
  const wob = Array.from({ length: 4 }, () => [Math.random() * 6.28, Math.random() * 6.28]);
  const ragged = (s: number) => wob.reduce((n, [p, q], i) => n + Math.sin(s * 6.283 * (i + 1) + p) * Math.cos(s * 6.283 * (i + 2) + q) / (i + 1.5), 0) * 0.05;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let d: number; // 0 at the centre line, 1 at the edge
    if (kind === 'strip') d = Math.abs(x / (N - 1) - 0.5) * 2 + ragged(y / N);
    else { const dx = x / (N - 1) - 0.5, dy = y / (N - 1) - 0.5; d = Math.hypot(dx, dy) * 2 + ragged(Math.atan2(dy, dx) / 6.283 + 0.5); }
    const a = 1 - THREE.MathUtils.smoothstep(d, 0.84, 0.97) + (Math.random() - 0.5) * 0.08;
    const i = (y * N + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, a * 255)); img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.RepeatWrapping;
  t.channel = 1; // the geometry's own 0..1 UVs (uv1), the colour map uses metres (uv)
  edgeCache.set(kind, t);
  return t;
}

/** Let a textured tree recolour just its leaves (green pixels) — the bark stays. Season magic uses setLeaf(). */
const leafUniforms = new WeakMap<THREE.Material, { uLeaf: { value: THREE.Color }; uLeafAmt: { value: number } }>();
export function leafTintable(m: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  if (leafUniforms.has(m)) return m;
  const u = { uLeaf: { value: new THREE.Color(1, 1, 1) }, uLeafAmt: { value: 0 } };
  leafUniforms.set(m, u);
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', 'uniform vec3 uLeaf; uniform float uLeafAmt;\nvoid main() {')
      .replace('#include <map_fragment>', `#include <map_fragment>
      { float green = smoothstep(0.015, 0.1, diffuseColor.g - max(diffuseColor.r, diffuseColor.b));
        float l = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
        diffuseColor.rgb = mix(diffuseColor.rgb, uLeaf * (0.35 + l * 1.6), green * uLeafAmt); }`);
  };
  m.customProgramCacheKey = () => 'leaf';
  return m;
}
/** recolour leaves; amt 0 = the model's own green */
export function setLeaf(m: THREE.MeshStandardMaterial, color: THREE.ColorRepresentation, amt = 1) {
  const u = leafUniforms.get(m);
  if (u) { u.uLeaf.value.set(color); u.uLeafAmt.value = amt; } else m.color.set(color);
}
