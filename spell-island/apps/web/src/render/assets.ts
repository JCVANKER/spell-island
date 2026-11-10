// 3D assets: every model in models/manifest.json is downloaded and parsed once at start-up (the loading
// screen shows the progress), then instanced from memory — entering a world never waits for the network.
// Models may be skinned with animation clips (idle / walk / run / jump…): they get an AnimationMixer.
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { materialsOf } from './materials';

export interface Model {
  root: THREE.Group;
  height: number;
  /** per-frame animation; `talk` while speaking, `mood` from the game (moving, happy, sad…) */
  update?: (t: number, dt: number, s: { talk: boolean; mood?: string }) => void;
  /** named parts other code may use (mats = every lit material, anim = pivot for procedural motion) */
  parts: Record<string, any>;
  /** skeletal animation: play a clip by name (idle, walk, run, jump, …); returns false if it doesn't exist */
  play?: (name: string, opts?: { once?: boolean; fade?: number; speed?: number }) => boolean;
}

export interface AssetInfo {
  file: string;
  /** height in metres */
  h: number;
  /** turn the model so it faces +Z */
  yaw?: number;
  /** plants sway a little */
  wobble?: number;
  /** casts a shadow (default true) */
  shadow?: number | boolean;
  /** a creature: breathes and bobs when it talks (when it has no skeleton) */
  alive?: boolean;
}

interface Template { scene: THREE.Object3D; info: AssetInfo; clips: THREE.AnimationClip[]; skinned: boolean; scale: number; offset: THREE.Vector3 }

const templates = new Map<string, Template>();
const BASE = './models/';
export const hasAsset = (id: string) => templates.has(id);

let renderer: THREE.WebGLRenderer | null = null;
/** the renderer is needed to pick the right GPU texture format for KTX2 */
export function useRenderer(r: THREE.WebGLRenderer) { renderer = r; }

function makeLoader(): GLTFLoader {
  const l = new GLTFLoader();
  l.setMeshoptDecoder(MeshoptDecoder);
  if (renderer) l.setKTX2Loader(new KTX2Loader().setTranscoderPath('./basis/').detectSupport(renderer));
  return l;
}

const bytes = new Map<string, ArrayBuffer>();
let manifest: Record<string, AssetInfo> = {};
let loader: GLTFLoader | null = null;

/** Download every model file once (the loading screen shows the progress); parsing happens per world. */
export async function preloadAssets(onProgress?: (done: number, total: number) => void): Promise<void> {
  if (new URLSearchParams(location.search).has('nomodels')) return;
  try { manifest = await (await fetch(BASE + 'manifest.json')).json(); } catch { return; }
  const ids = Object.keys(manifest);
  let done = 0, next = 0;
  const worker = async () => {
    while (next < ids.length) {
      const id = ids[next++];
      try { const r = await fetch(BASE + manifest[id].file); if (r.ok) bytes.set(id, await r.arrayBuffer()); }
      catch (e) { console.warn('[assets] download failed', id, e); }
      onProgress?.(++done, ids.length);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
}

/** Parse the models a world needs (in parallel, from memory). Already parsed ones are kept. */
export async function prepareAssets(ids: Iterable<string>): Promise<void> {
  loader ||= makeLoader();
  const todo = [...new Set(ids)].filter((id) => !templates.has(id) && bytes.has(id));
  await Promise.all(todo.map(async (id) => {
    try { templates.set(id, makeTemplate(await loader!.parseAsync(bytes.get(id)!, BASE), manifest[id])); }
    catch (e) { console.warn('[assets] parse failed', id, e); }
  }));
}

/** every model key in the manifest that matches (e.g. all food) */
export const assetIds = (pred: (id: string) => boolean = () => true) => Object.keys(manifest).filter(pred);

function makeTemplate(gltf: GLTF, info: AssetInfo): Template {
  const scene = gltf.scene;
  let skinned = false;
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    if ((m as THREE.SkinnedMesh).isSkinnedMesh) skinned = true;
    m.castShadow = info.shadow !== false && info.shadow !== 0;
    m.receiveShadow = true;
    for (const mm of Array.isArray(m.material) ? m.material : [m.material]) {
      const s = mm as THREE.MeshStandardMaterial;
      if (s.map) s.map.anisotropy = 4;
      // AI textures already carry their lighting: keep them matte, no mirror-like spots
      if (s.isMeshStandardMaterial && !s.roughnessMap) s.roughness = Math.max(s.roughness, 0.7);
    }
  });
  if (info.yaw) scene.rotation.y += info.yaw;
  scene.updateMatrixWorld(true);
  // normalise: feet on the ground, centred, exactly info.h tall (applied on a wrapper, so skins stay intact)
  const box = new THREE.Box3().setFromObject(scene, true);
  const size = box.getSize(new THREE.Vector3());
  const scale = info.h / Math.max(size.y, 1e-3);
  const c = box.getCenter(new THREE.Vector3());
  const offset = new THREE.Vector3(-c.x, -box.min.y, -c.z);
  return { scene, info, clips: gltf.animations || [], skinned, scale, offset };
}

/** A fresh instance with its own materials (so spells can recolour just this one). */
export function assetModel(id: string, opts: { height?: number; share?: boolean } = {}): Model | null {
  const t = templates.get(id);
  if (!t) return null;
  const body = t.skinned ? cloneSkinned(t.scene) : t.scene.clone(true);
  // own materials so spells can recolour one instance (scenery shares them: fewer programs, less memory)
  if (!opts.share) body.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) m.material = Array.isArray(m.material) ? m.material.map((x) => x.clone()) : m.material.clone();
  });
  const norm = new THREE.Group();
  norm.scale.setScalar(t.scale);
  norm.position.copy(t.offset).multiplyScalar(t.scale);
  norm.add(body);
  const anim = new THREE.Group(); // procedural motion pivots at the feet
  anim.add(norm);
  const k = opts.height ? opts.height / t.info.h : 1;
  anim.scale.setScalar(k);
  const root = new THREE.Group();
  root.add(anim);
  const h = t.info.h * k;
  const mats = materialsOf(body);

  // skeletal clips
  let mixer: THREE.AnimationMixer | null = null;
  const actions = new Map<string, THREE.AnimationAction>();
  let current: THREE.AnimationAction | null = null;
  if (t.clips.length) {
    mixer = new THREE.AnimationMixer(body);
    for (const c of t.clips) actions.set(clipName(c.name), mixer.clipAction(c));
  }
  const play: Model['play'] = (name, o = {}) => {
    const a = actions.get(name);
    if (!a) return false;
    if (a === current && !o.once) return true;
    a.reset();
    a.setLoop(o.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    a.clampWhenFinished = !!o.once;
    a.timeScale = o.speed ?? 1;
    a.play();
    if (current && current !== a) current.crossFadeTo(a, o.fade ?? 0.25, false); else if (!current) a.fadeIn(o.fade ?? 0.25);
    current = a;
    return true;
  };
  if (mixer) play('idle'); // (walk-only animals stand in their bind pose until they move)

  const phase = Math.random() * 10;
  const { alive, wobble } = t.info;
  let hop = 0, gaitClip = '';
  const update: Model['update'] = (time, dt, s) => {
    const tt = time + phase;
    if (mixer) {
      // skeletal: pick the clip from the mood, add a small talking nod on top
      const want = s.mood === 'moving' && actions.has('walk') ? 'walk' : 'idle';
      if (want !== gaitClip) { gaitClip = want; if (!play(want) && current) { current.fadeOut(0.3); current = null; } }
      mixer.update(dt);
      if (!current) { const b = 1 + Math.sin(tt * 2.1) * 0.012; anim.scale.set(k, k * b, k); } // no idle clip: breathe
      anim.rotation.x = s.talk ? Math.sin(tt * 9) * 0.03 : anim.rotation.x * 0.9;
      if (s.mood === 'happy') { hop += dt * 7; anim.position.y = Math.abs(Math.sin(hop)) * 0.05 * h; } else anim.position.y *= 0.85;
      return;
    }
    if (wobble) { anim.rotation.z = Math.sin(tt * 1.3) * wobble * 0.05; anim.rotation.x = Math.cos(tt * 1.1) * wobble * 0.03; return; }
    if (!alive) return;
    let sy = 1 + Math.sin(tt * 2.1) * 0.012, rx = 0, rz = 0, y = 0;
    switch (s.mood) {
      case 'sad': rx = 0.07; sy -= 0.02; break;
      case 'sleepy': sy = 1 + Math.sin(tt * 0.9) * 0.025; rz = Math.sin(tt * 0.45) * 0.02; break;
      case 'happy': case 'excited': hop += dt * 7; y = Math.abs(Math.sin(hop)) * 0.06 * h; break;
      case 'moving': hop += dt * 10; y = Math.abs(Math.sin(hop)) * 0.025 * h; rz = Math.sin(hop) * 0.015; break;
    }
    if (s.talk) { rx += Math.sin(tt * 9) * 0.025; y += Math.abs(Math.sin(tt * 9)) * 0.012 * h; }
    anim.rotation.x += (rx - anim.rotation.x) * Math.min(1, dt * 6);
    anim.rotation.z = rz;
    anim.position.y = y;
    anim.scale.set(k * (1 - (sy - 1) * 0.5), k * sy, k * (1 - (sy - 1) * 0.5));
  };
  return { root, height: h, parts: { mats, anim, body, mixer }, update: mixer || wobble || alive ? update : undefined, play: mixer ? play : undefined };
}

/** "Armature|walk_cycle" / "preset:walk" / "Walk" → "walk" */
function clipName(n: string): string {
  const s = n.toLowerCase().replace(/^.*[|:]/, '');
  for (const k of ['idle', 'walk', 'run', 'jump', 'turn', 'hurt', 'fall', 'climb', 'slash', 'shoot', 'dance', 'wave']) if (s.includes(k)) return k;
  return s;
}
