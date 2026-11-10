// Renderer, third-person camera, post-processing, name labels / quest markers and tap picking.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GradeShader } from '../render/post';
import { useRenderer } from '../render/assets';
import { Hero } from './hero';
import { Fx } from '../render/fx';
import type { BuiltScene, Entity } from '../render/scenes';

const QS = new URLSearchParams(location.search);
const TIME_SCALE = Number(QS.get('speed') || 1); // test helper: ?speed=3
const LOW_GFX = QS.has('lowgfx');
export const IS_MOBILE = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && window.innerWidth < 1100);

export class World {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  composer: EffectComposer;
  post: ShaderPass;
  bloom: UnrealBloomPass | null = null;
  /** sunlight (casts the shadows, follows the wizard) and soft sky light */
  sun = new THREE.DirectionalLight('#fff4e2', 2.0);
  hemi = new THREE.HemisphereLight('#cfe6ff', '#6b7a4a', 0.5);
  private sunBase = 2.0;
  private sunDir = new THREE.Vector3(0.55, 1, 0.4).normalize();
  private lightK = 1;
  /** warm lights for lit lamps near the wizard (a fixed pool, so shaders never recompile) */
  lampLights = Array.from({ length: 4 }, () => new THREE.PointLight('#ffc874', 0, 11, 1.6));
  hero = new Hero();
  fx = new Fx();
  /** quest markers above NPCs: id → '!' (new quest) or '…' (in progress) */
  markers = new Map<string, string>();
  current: BuiltScene | null = null;
  entities = new Map<string, Entity>();
  hooks = new Set<(t: number, dt: number) => void>();
  labelsEl: HTMLElement;
  labelEls = new Map<string, HTMLElement>();
  alwaysLabels = false;
  /** last time the player dragged the camera; auto-follow waits a few seconds after that */
  userOrbitAt = -1e9;
  autoFollow = true;
  tappedUntil = new Map<string, number>();
  onTap: ((id: string) => void) | null = null;
  time = 0;
  private lastHero = new THREE.Vector3();
  private clock = new THREE.Clock();
  private down: { x: number; y: number; t: number } | null = null;
  private raycaster = new THREE.Raycaster();
  paused = false;

  constructor(canvas: HTMLCanvasElement, labelsEl: HTMLElement) {
    this.labelsEl = labelsEl;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(LOW_GFX ? 0.5 : Math.min(window.devicePixelRatio, IS_MOBILE ? 1.5 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping; // keeps the painted colours of the models true
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.shadowMap.enabled = !LOW_GFX;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    useRenderer(this.renderer);
    // image-based light: soft, even reflections on every PBR surface
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.3;
    pmrem.dispose();
    const sz = IS_MOBILE ? 1024 : 2048, S = IS_MOBILE ? 22 : 30;
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(sz, sz);
    Object.assign(this.sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 1, far: 120 });
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun, this.sun.target, this.hemi, ...this.lampLights);
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1200);
    this.camera.position.set(0, 6, 12);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.addEventListener('start', () => (this.userOrbitAt = performance.now()));
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 22;
    this.controls.maxPolarAngle = 1.38;
    this.controls.minPolarAngle = 0.25;
    // HDR pipeline: scene → bloom on bright magic → colour grade → tone mapping + sRGB (+ MSAA on the target)
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: LOW_GFX ? 0 : IS_MOBILE ? 2 : 4 });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    if (!LOW_GFX && !IS_MOBILE) { this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.22, 0.4, 1.15); this.composer.addPass(this.bloom); }
    this.post = new ShaderPass(GradeShader);
    this.composer.addPass(this.post);
    this.composer.addPass(new OutputPass());
    this.scene.add(this.hero.root, this.fx.group);
    window.addEventListener('resize', () => this.resize());
    this.resize();
    canvas.addEventListener('pointerdown', (e) => { this.down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    canvas.addEventListener('pointerup', (e) => {
      if (!this.down) return;
      const moved = Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y);
      if (moved < 8 && performance.now() - this.down.t < 450) this.pick(e.clientX, e.clientY);
      this.down = null;
    });
    this.renderer.setAnimationLoop(() => this.frame());
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom?.resolution.set(w / 2, h / 2);
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 62 : 50;
    // shift the picture down a little so the wizard sits above the subtitles
    this.camera.setViewOffset(w, h, 0, h * 0.12, w, h);
    this.camera.updateProjectionMatrix();
  }

  load(built: BuiltScene & { entities: Map<string, Entity> }) {
    this.unload();
    this.current = built;
    this.scene.add(built.group);
    for (const e of built.entities.values()) {
      built.group.add(e.model.root);
      this.entities.set(e.id, e);
    }
    const m = built.mood;
    this.sunDir.copy(m.sun).normalize();
    this.sun.color.set(m.sunColor);
    this.sunBase = built.indoor ? 1.6 : m.sunIntensity;
    this.hemi.color.set(m.skyBottom); this.hemi.groundColor.set(m.ground[1]);
    this.scene.fog = built.indoor ? null : new THREE.Fog(m.fog, 60, 210);
    this.renderer.setClearColor(m.fog);
    this.setLight(1);
    this.controls.maxDistance = built.indoor ? 10 : 22;
    this.controls.minDistance = built.indoor ? 3.5 : 4;
    this.hero.boundsR = built.bounds;
    this.hero.obstacles = () => {
      const obs: { id: string; x: number; z: number; r: number }[] = [...built.decor];
      for (const e of this.entities.values()) {
        if (e.hidden || !e.def.radius || e.def.radius <= 0) continue;
        const p = e.model.root.position;
        obs.push({ id: e.id, x: p.x, z: p.z, r: e.def.radius });
      }
      return obs;
    };
  }

  unload() {
    if (this.current) this.scene.remove(this.current.group);
    this.current = null;
    this.entities.clear();
    for (const el of this.labelEls.values()) el.remove();
    this.labelEls.clear();
    this.markers.clear();
    this.fx.setWeather('none');
    this.hooks.clear();
  }

  /** Overall brightness (weather): sun, sky light and a gentle grade. */
  setLight(k: number, tint: THREE.ColorRepresentation = '#ffffff') {
    this.lightK = k;
    this.sun.intensity = this.sunBase * k;
    this.hemi.intensity = 0.25 + 0.3 * k;
    this.scene.environmentIntensity = 0.15 + 0.15 * k;
    this.post.uniforms.uTint.value.set(tint).multiplyScalar(0.75 + 0.25 * k);
  }

  /** Put the camera behind the wizard. */
  snapCamera(dist = 10, height = 5.5) {
    const f = this.hero.forwardVec();
    const p = this.hero.pos;
    this.controls.target.set(p.x, 1.2, p.z);
    this.camera.position.set(p.x - f.x * dist, height, p.z - f.z * dist);
    this.lastHero.copy(p);
    this.controls.update();
  }

  private frame() {
    const dt = Math.min(0.1, this.clock.getDelta()) * TIME_SCALE;
    if (this.paused) { this.composer.render(); return; }
    this.time += dt;
    const t = this.time;
    // the sun's shadow box follows the wizard
    // (snapped to whole shadow-map texels, so shadows don't shimmer as he walks)
    const cam = this.sun.shadow.camera, step = (cam.right - cam.left) / this.sun.shadow.mapSize.x * 4;
    const hx = Math.round(this.hero.pos.x / step) * step, hz = Math.round(this.hero.pos.z / step) * step;
    this.sun.position.set(hx + this.sunDir.x * 50, this.sunDir.y * 50, hz + this.sunDir.z * 50);
    this.sun.target.position.set(hx, 0, hz);
    this.hero.update(dt, t);
    // camera follows the wizard but keeps the angle the player chose
    const d = new THREE.Vector3().subVectors(this.hero.pos, this.lastHero);
    d.y = 0;
    this.camera.position.add(d);
    this.controls.target.add(d);
    const ty = 1.2 + this.hero.pos.y * 0.6 + (this.hero.flying ? 2.2 : 0);
    this.controls.target.y += (ty - this.controls.target.y) * Math.min(1, dt * 4);
    this.lastHero.copy(this.hero.pos);
    // Zelda-style: while the wizard walks or turns, swing the camera round behind him
    if (this.autoFollow && performance.now() - this.userOrbitAt > 4000 && (this.hero.busy || this.hero.flying)) {
      const off = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
      const cur = Math.atan2(off.x, off.z);
      const want = this.hero.heading + Math.PI;
      let dlt = want - cur;
      dlt = Math.atan2(Math.sin(dlt), Math.cos(dlt));
      const rot = dlt * Math.min(1, dt * 1.6);
      off.applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
      this.camera.position.copy(this.controls.target).add(off);
    }
    this.controls.update();
    for (const e of this.entities.values()) if (!e.fx.frozen) e.model.update?.(t, dt, { talk: e.talk, mood: e.mood });
    this.current?.update(t, dt);
    for (const h of this.hooks) h(t, dt);
    this.placeLampLights();
    this.fx.update(dt, this.hero.pos);
    this.composer.render();
    this.updateLabels();
  }

  private lampT = 0;
  private placeLampLights() {
    if ((this.lampT += 1) % 15) return;
    const hp = this.hero.pos;
    const lit = [...this.entities.values()].filter((e) => e.fx.lit && !e.hidden).sort((a, b) => a.model.root.position.distanceToSquared(hp) - b.model.root.position.distanceToSquared(hp));
    this.lampLights.forEach((l, i) => {
      const e = lit[i];
      l.intensity = e ? 14 : 0;
      if (e) { const p = e.model.root.position; l.position.set(p.x, (e.model.height || 3) * 0.9, p.z); }
    });
  }

  private updateLabels() {
    const now = performance.now();
    const w = window.innerWidth, h = window.innerHeight;
    for (const e of this.entities.values()) {
      const mk = this.markers.get(e.id) || '';
      const near = e.model.root.position.distanceTo(this.hero.pos) < (e.portal ? 30 : e.def.params?.star ? 18 : 13);
      const show = !e.hidden && e.def.label !== false && (mk || near || this.alwaysLabels || (this.tappedUntil.get(e.id) || 0) > now);
      let el = this.labelEls.get(e.id);
      if (!show) { if (el) el.style.display = 'none'; continue; }
      if (!el) {
        el = document.createElement('div');
        this.labelsEl.appendChild(el);
        this.labelEls.set(e.id, el);
      }
      const html = `${mk ? `<i class="mk ${mk === '!' ? 'new' : 'doing'}">${mk}</i>` : ''}<b>${e.def.name}</b>${e.def.zh ? `<small>${e.def.zh}</small>` : ''}`;
      if ((el as any).__html !== html) { el.innerHTML = html; (el as any).__html = html; el.className = 'world-label' + (e.portal ? ' portal' : '') + (e.isNpc ? ' npc' : '') + (e.def.params?.star ? ' star' + (e.def.params.sentence ? ' sentence' : '') : ''); }
      const p = new THREE.Vector3();
      e.model.root.getWorldPosition(p);
      p.y += (e.model.height || 1) * e.model.root.scale.y + 0.5;
      p.project(this.camera);
      if (p.z > 1 || p.x < -1.2 || p.x > 1.2 || p.y < -1.2 || p.y > 1.2) { el.style.display = 'none'; continue; }
      el.style.display = 'block';
      el.style.transform = `translate(-50%,-100%) translate(${((p.x + 1) / 2) * w}px, ${((1 - p.y) / 2) * h}px)`;
    }
  }

  private pick(x: number, y: number) {
    const ndc = new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const roots = [...this.entities.values()].filter((e) => !e.hidden).map((e) => e.model.root);
    roots.push(this.hero.root);
    const hits = this.raycaster.intersectObjects(roots, true);
    if (!hits.length) return;
    let o: THREE.Object3D | null = hits[0].object;
    while (o) {
      if (o === this.hero.root) { this.onTap?.('hero'); return; }
      for (const e of this.entities.values()) if (e.model.root === o) { this.tappedUntil.set(e.id, performance.now() + 3500); this.onTap?.(e.id); return; }
      o = o.parent;
    }
  }
}
