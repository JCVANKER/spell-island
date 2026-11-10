// Milo, the little wizard: movement controller + procedural animation for the AI-generated model.
// Walk / run / jump / turn, ride the broom, go invisible, carry things, bonk with the staff, cast, eat.
import * as THREE from 'three';
import { assetModel, type Model } from '../render/assets';
import { mat, materialsOf } from '../render/materials';
import * as Mdl from '../render/models';
import { cloudMesh } from '../render/fx';
/** wand tip relative to the right hand (body space, metres) */
const TIP = new THREE.Vector3(0, 0.1, 0.12);

export type Mode = 'idle' | 'walk' | 'jump' | 'turn' | 'sleep' | 'act';
export interface Obstacle { id: string; x: number; z: number; r: number }

interface WalkJob {
  target: THREE.Vector3; arrive: number; speed: number; excludeId?: string;
  done: (r: 'arrived' | 'blocked' | 'stopped' | 'edge') => void; best: number; stuckT: number; forward?: boolean;
}

function angleDiff(a: number, b: number) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

export class Hero {
  root = new THREE.Group();
  pos = new THREE.Vector3();
  heading = Math.PI;
  mode: Mode = 'idle';
  boundsR = 40;
  obstacles: () => Obstacle[] = () => [];
  running = false;
  flying = false;
  invisible = false;
  talking = false;
  carrying: THREE.Object3D | null = null;
  carryId: string | null = null;
  private body = new THREE.Group(); // animated
  private model: THREE.Object3D | null = null;
  private skin: Model | null = null; // the animated asset (skeletal clips when it has them)
  private mats: THREE.MeshStandardMaterial[] = [];
  private broom = new THREE.Group();
  private cloud = cloudMesh(0.85); // the magic cloud he can ride instead of the broom
  private size = 1; // "Make me big!"
  sizeTarget = 1;
  private hand = new THREE.Group(); // where carried things go
  private staffGlow: THREE.Mesh;
  private wandHand: THREE.Object3D | null = null;
  private walk: WalkJob | null = null;
  private turnTo: number | null = null;
  private turnDone: (() => void) | null = null;
  private jump = { t: 0, dur: 0.6, h: 0.9, done: null as null | (() => void) };
  private act: { kind: 'bonk' | 'cast' | 'eat' | 'wave' | 'dance' | 'stretch'; t: number; dur: number; done: (() => void) | null } | null = null;
  private gait = 0;
  private yaw = Math.PI;
  private fly = 0; // 0..1 broom height blend
  private fade = 1;
  private wasGhost = false;

  constructor() {
    this.root.add(this.body);
    // fallback body until the model loads (a little robed wizard made of primitives)
    const robe = mat('#3f5fae'), skin = mat('#f6d3b3'), hat = mat('#2b3f86');
    const fb = new THREE.Group();
    fb.add(Mdl.cone(robe, [0, 0.55, 0], [0.42, 1.1, 0.42]), Mdl.sph(skin, [0, 1.25, 0], 0.3), Mdl.cone(hat, [0, 1.75, 0], [0.34, 0.7, 0.34]));
    this.model = fb;
    this.body.add(fb);
    this.hand.position.set(0.35, 1.0, 0.35);
    this.body.add(this.hand);
    this.staffGlow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff2a8' }));
    this.staffGlow.position.set(-0.42, 1.55, 0.18);
    this.staffGlow.visible = false;
    this.body.add(this.staffGlow);
    this.broom.visible = false;
    this.cloud.visible = false;
    this.root.add(this.broom, this.cloud);
  }

  /** Swap in the AI models once loaded. */
  upgrade() {
    const m = assetModel('wizard');
    if (m) {
      if (this.model) this.body.remove(this.model);
      this.skin = m;
      this.model = m.root;
      this.mats = m.parts.mats;
      this.body.add(this.model);
      this.staffGlow.position.set(0.55, 1.45, 0.15); // the crystal on top of the staff (model holds it in its right hand)
      this.wandHand = m.root.getObjectByName('R_Hand') || null; // rigged model: the wand moves with the hand
    } else this.mats = materialsOf(this.body);
    const b = assetModel('broom', { height: 0.45 });
    if (b) {
      this.broom.clear();
      const g = b.parts.anim as THREE.Object3D; // (keeps the height scaling)
      g.rotation.y = Math.PI / 2;
      this.broom.add(g);
    } else if (!this.broom.children.length) {
      this.broom.add(Mdl.cyl(mat('#8a5a3a'), [0, 0, 0], [0.05, 1.8, 0.05], [Math.PI / 2, 0, 0]), Mdl.cone(mat('#e8c46a'), [0, 0, -0.95], [0.22, 0.5, 0.22], [-Math.PI / 2, 0, 0]));
    }
  }

  place(x: number, z: number, heading: number) {
    this.pos.set(x, 0, z);
    this.heading = heading; this.yaw = heading;
    this.cancelAll();
    this.size = this.sizeTarget = 1; this.root.scale.setScalar(1);
    this.root.position.copy(this.pos);
    this.root.rotation.y = this.yaw;
  }

  forwardVec(h = this.heading) { return new THREE.Vector3(Math.sin(h), 0, Math.cos(h)); }
  get moving() { return this.mode === 'walk' || this.mode === 'jump'; }
  get busy() { return this.mode !== 'idle' && this.mode !== 'sleep'; }

  // ---------- commands ----------
  cancelAll() {
    const w = this.walk; this.walk = null; if (w) w.done('stopped');
    if (this.turnDone) { const d = this.turnDone; this.turnDone = null; d(); }
    this.turnTo = null;
    if (this.mode !== 'sleep') this.mode = 'idle';
  }
  stop() { this.cancelAll(); this.running = false; }

  speed() { return (this.flying ? 6.5 : this.running ? 5.2 : 2.9); }

  walkTo(target: THREE.Vector3, opts: { arrive?: number; excludeId?: string } = {}): Promise<'arrived' | 'blocked' | 'stopped' | 'edge'> {
    this.cancelAll();
    if (this.mode === 'sleep') this.mode = 'idle';
    return new Promise((resolve) => {
      this.walk = { target: target.clone(), arrive: opts.arrive ?? 1.4, speed: 0, excludeId: opts.excludeId, done: resolve, best: Infinity, stuckT: 0 };
      this.mode = 'walk';
    });
  }

  walkForward(dist: number) {
    const p = this.walkTo(this.pos.clone().addScaledVector(this.forwardVec(), dist), { arrive: 0.4 });
    if (this.walk) this.walk.forward = true;
    return p;
  }

  face(angle: number): Promise<void> {
    this.cancelAll();
    return new Promise((res) => { this.turnTo = angle; this.turnDone = res; this.mode = 'turn'; });
  }
  turn(delta: number) { return this.face(this.heading + delta); }
  faceToward(p: THREE.Vector3) { return this.face(Math.atan2(p.x - this.pos.x, p.z - this.pos.z)); }

  doJump(): Promise<void> {
    this.cancelAll();
    this.jump = { t: 0, dur: this.flying ? 0.8 : 0.65, h: this.flying ? 1.2 : 1.0, done: null };
    this.mode = 'jump';
    return new Promise((res) => (this.jump.done = res));
  }

  doAct(kind: 'bonk' | 'cast' | 'eat' | 'wave' | 'dance' | 'stretch', dur?: number): Promise<void> {
    if (this.mode === 'walk' || this.mode === 'turn') this.cancelAll();
    const d = dur ?? { bonk: 0.7, cast: 1.0, eat: 1.8, wave: 1.2, dance: 3.0, stretch: 2.0 }[kind];
    return new Promise((res) => { this.act = { kind, t: 0, dur: d, done: res }; if (this.mode === 'idle' || this.mode === 'sleep') this.mode = 'act'; });
  }

  sleep() { this.cancelAll(); this.mode = 'sleep'; }
  wake() { if (this.mode === 'sleep') { this.mode = 'idle'; return this.doAct('stretch'); } return Promise.resolve(); }

  setFlying(on: boolean, ride: 'broom' | 'cloud' = 'broom') { this.flying = on; this.broom.visible = on && ride === 'broom'; this.cloud.visible = on && ride === 'cloud'; }
  setInvisible(on: boolean) { this.invisible = on; }

  hold(obj: THREE.Object3D | null, id: string | null) {
    if (this.carrying) this.hand.remove(this.carrying);
    this.carrying = obj; this.carryId = id;
    if (obj) { obj.position.set(0, 0, 0); obj.rotation.set(0, 0, 0); this.hand.add(obj); }
  }

  /** world position of the staff crystal (spells fly from here) */
  staffTip(): THREE.Vector3 { return this.staffGlow.getWorldPosition(new THREE.Vector3()); }

  // ---------- per frame ----------
  update(dt: number, t: number) {
    if (this.mode === 'turn' && this.turnTo !== null) {
      const d = angleDiff(this.heading, this.turnTo);
      this.heading += Math.sign(d) * Math.min(Math.abs(d), dt * 4);
      this.gait += dt * 6;
      if (Math.abs(d) < 0.02) { this.heading = this.turnTo; this.turnTo = null; this.mode = 'idle'; const f = this.turnDone; this.turnDone = null; f?.(); }
    } else if (this.mode === 'walk' && this.walk) this.stepWalk(dt);
    else if (this.mode === 'jump') {
      const j = this.jump; j.t += dt / j.dur;
      const k = Math.min(1, j.t);
      this.pos.y = 4 * j.h * k * (1 - k);
      if (k >= 1) { this.pos.y = 0; this.mode = 'idle'; const f = j.done; j.done = null; f?.(); }
    }
    if (this.act) {
      this.act.t += dt;
      if (this.act.t >= this.act.dur) { const f = this.act.done; this.act = null; if (this.mode === 'act') this.mode = 'idle'; f?.(); }
    }
    const r = Math.hypot(this.pos.x, this.pos.z);
    if (r > this.boundsR) { this.pos.x *= this.boundsR / r; this.pos.z *= this.boundsR / r; if (this.walk) this.finish('edge'); }
    this.animate(dt, t);
    this.root.position.copy(this.pos);
    this.root.rotation.y = this.yaw;
  }

  private stepWalk(dt: number) {
    const w = this.walk!;
    const to = new THREE.Vector3(w.target.x - this.pos.x, 0, w.target.z - this.pos.z);
    const dist = to.length();
    if (dist <= w.arrive) return this.finish('arrived');
    const dir = to.clone().divideScalar(dist || 1);
    const steer = dir.clone();
    if (!this.flying) for (const ob of this.obstacles()) {
      if (ob.r <= 0 || ob.id === w.excludeId) continue;
      const R = ob.r + 0.6;
      const rel = new THREE.Vector3(ob.x - this.pos.x, 0, ob.z - this.pos.z);
      const dd = rel.length();
      if (dd < R + 1.2) steer.addScaledVector(rel.clone().normalize(), -((R + 1.2 - dd) / 1.2) * 1.6);
      const along = rel.dot(dir);
      if (along > 0 && along < Math.min(dist, 5)) {
        const perp = rel.clone().addScaledVector(dir, -along);
        const pl = perp.length();
        if (pl < R) steer.addScaledVector(pl > 0.01 ? perp.clone().multiplyScalar(-1 / pl) : new THREE.Vector3(dir.z, 0, -dir.x), ((R - pl) / R) * 1.5);
      }
    }
    const desired = Math.atan2(steer.x, steer.z);
    const d = angleDiff(this.heading, desired);
    this.heading += Math.sign(d) * Math.min(Math.abs(d), dt * 6);
    const sp = this.speed() * (0.35 + 0.65 * Math.max(0, Math.cos(d)));
    this.pos.addScaledVector(this.forwardVec(), sp * dt);
    this.gait += dt * sp * 3;
    if (dist < w.best - 0.05) { w.best = dist; w.stuckT = 0; } else w.stuckT += dt;
    if (w.stuckT > (w.forward ? 1.0 : 2.5)) this.finish(w.forward ? 'arrived' : 'blocked');
  }

  private finish(r: 'arrived' | 'blocked' | 'stopped' | 'edge') {
    const w = this.walk; this.walk = null; this.mode = 'idle'; w?.done(r);
  }

  private animate(dt: number, t: number) {
    this.yaw += angleDiff(this.yaw, this.heading) * Math.min(1, dt * 12);
    const moving = this.mode === 'walk' || this.mode === 'turn';
    this.fly += ((this.flying ? 1 : 0) - this.fly) * Math.min(1, dt * 3);
    const hover = this.fly * (2.2 + Math.sin(t * 2) * 0.15);
    let y = hover, rx = 0, rz = 0, ry = 0, sy = 1;
    if (this.flying) { rx = moving ? 0.25 : 0.05; rz = Math.sin(t * 1.5) * 0.06; }
    else if (moving) { y += Math.abs(Math.sin(this.gait)) * (this.running ? 0.14 : 0.09); rz = Math.sin(this.gait) * 0.08; rx = this.running ? 0.15 : 0.06; }
    else if (this.mode === 'sleep') { rz = 1.35; y = 0.25; sy = 1 + Math.sin(t * 1.2) * 0.02; }
    else { sy = 1 + Math.sin(t * 2.2) * 0.015; if (this.talking) rx = Math.sin(t * 9) * 0.03; }
    if (this.mode === 'jump') { sy = 1.06; rx = -0.08; }
    if (this.act) {
      const k = this.act.t / this.act.dur;
      switch (this.act.kind) {
        case 'bonk': rx = Math.sin(Math.min(1, k * 1.6) * Math.PI) * 0.45; break;
        case 'cast': rx = -Math.sin(k * Math.PI) * 0.18; y += Math.sin(k * Math.PI) * 0.15; break;
        case 'eat': rx = 0.12 + Math.abs(Math.sin(t * 9)) * 0.08; break;
        case 'wave': rz = Math.sin(t * 10) * 0.12; break;
        case 'dance': ry = k * Math.PI * 4; y += Math.abs(Math.sin(t * 8)) * 0.2; break;
        case 'stretch': sy = 1 + Math.sin(k * Math.PI) * 0.12; break;
      }
    }
    // skeletal clips (when the model has them) carry the body; the procedural motion stays light on top
    if (this.skin?.play) {
      const clip = this.flying ? 'idle' : this.mode === 'jump' ? 'jump' : moving ? (this.running ? 'run' : 'walk') : this.act?.kind === 'dance' ? 'dance' : this.act?.kind === 'wave' ? 'wave' : 'idle';
      if (!this.skin.play(clip)) this.skin.play(clip === 'run' ? 'walk' : 'idle');
      (this.skin.parts.mixer as THREE.AnimationMixer).update(dt * (moving && !this.running ? Math.min(1.4, this.speed() / 2.9) : 1));
      if (moving && !this.flying) { y = hover; rz = 0; rx = this.running ? 0.04 : 0; }
      if (this.mode === 'jump' && this.skin.play('jump')) sy = 1;
    }
    this.staffGlow.visible = !!this.act && (this.act.kind === 'cast');
    if (this.wandHand) {
      const v = this.wandHand.getWorldPosition(new THREE.Vector3());
      this.staffGlow.position.copy(this.body.worldToLocal(v)).add(TIP);
    }
    if (this.staffGlow.visible) this.staffGlow.scale.setScalar(1 + Math.sin(t * 30) * 0.3);
    this.body.position.y = y;
    this.body.rotation.set(rx, ry, rz);
    this.body.scale.set(1 - (sy - 1) * 0.5, sy, 1 - (sy - 1) * 0.5);
    this.broom.position.set(0, hover + 0.35, 0);
    this.broom.rotation.set(rx * 0.5, 0, rz);
    this.cloud.position.set(0, hover - 0.05, 0);
    this.cloud.rotation.set(0, t * 0.3, rz * 0.5);
    if (Math.abs(this.size - this.sizeTarget) > 0.001) { this.size += (this.sizeTarget - this.size) * Math.min(1, dt * 3); this.root.scale.setScalar(this.size); }
    // invisibility: fade to a faint shimmer
    this.fade += ((this.invisible ? 0.12 : 1) - this.fade) * Math.min(1, dt * 4);
    const ghost = this.fade < 0.99;
    for (const m of this.mats) {
      if (m.transparent !== ghost) { m.transparent = ghost; m.needsUpdate = true; }
      m.opacity = this.fade;
      m.depthWrite = this.fade > 0.5;
      m.emissive.set('#9fd8ff');
      m.emissiveIntensity = this.invisible ? 0.3 + Math.sin(t * 6) * 0.15 : 0;
    }
    if (ghost !== this.wasGhost) { this.wasGhost = ghost; this.body.traverse((o) => { o.castShadow = !ghost; }); }
  }
}
