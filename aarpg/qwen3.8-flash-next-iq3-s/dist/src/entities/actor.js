// Base actor: rig, procedural animation, movement + collision.
import { buildRig, blobShadow, disposeTree } from './meshes.js';
import { angleDiff, clamp, lerp } from '../core/math.js';

const B = () => window.BABYLON;

export class Actor {
  constructor(game, opts) {
    this.game = game;
    this.scene = game.scene;
    this.x = opts.x || 0; this.z = opts.z || 0;
    this.radius = opts.radius || 0.45;
    this.facing = opts.facing || 0;
    this.dead = false;
    this.removed = false;
    this.anim = 'idle';
    this.animT = 0;
    this.stateT = 0;
    this.moveSpeed = 0;
    this.speedMul = 1;
    this.staggerT = 0;
    this.root = new (B()).TransformNode('actor', this.scene);
    this.rig = buildRig(this.scene, opts.shape, opts.color, opts.scale || 1, opts.rigOpts || {});
    this.rig.root.parent = this.root;
    this.shadow = blobShadow(this.scene, this.radius * 1.15, this.root);
    this.shadow.position.y = 0.02;
    this.y = 0;
    this.bob = 0;
    this.punch = 0;      // hit reaction scale punch
    this.lean = 0;       // knockback / hit lean
    this.fade = 1;
    this.allMeshes = this.rig.meshes || [];
    for (const m of this.allMeshes) { m.isPickable = false; }
    this.setPos(this.x, this.z);
  }

  setPos(x, z) {
    this.x = x; this.z = z;
    this.sync();
  }

  sync() {
    const gy = this.game.world ? this.game.world.heightAt(this.x, this.z) : 0;
    this.y = gy;
    this.root.position.set(this.x, gy + this.bob, this.z);
    this.root.rotation.y = this.facing;
  }

  // Move with grid collision. Returns true if it moved.
  move(dx, dz) {
    if (!dx && !dz) return false;
    const g = this.game.world.grid;
    let nx = this.x + dx, nz = this.z + dz;
    [nx, nz] = g.resolve(nx, nz, this.radius);
    if (Math.abs(nx - this.x) < 1e-5 && Math.abs(nz - this.z) < 1e-5) return false;
    this.x = nx; this.z = nz;
    return true;
  }

  faceTo(angle, rate = 10, dt = 0.016) {
    const d = angleDiff(this.facing, angle);
    this.facing += clamp(d, -rate * dt, rate * dt);
  }

  setState(s) {
    if (this.anim === s) return;
    this.anim = s;
    this.stateT = 0;
    this.animT = 0;
  }

  // ---- procedural animation ------------------------------------------------
  animate(dt) {
    this.stateT += dt;
    this.animT += dt * (this.anim === 'walk' || this.anim === 'run' ? clamp(this.moveSpeed / 3.5, 0.4, 2.2) : 1);
    const r = this.rig;
    const t = this.animT;
    const quad = r.shape === 'wolf' || r.shape === 'spider' || r.shape === 'wyrm';
    let bob = 0;

    if (this.anim === 'walk' || this.anim === 'run') {
      const amp = this.anim === 'run' ? 0.62 : 0.34;
      const s = Math.sin(t * 8);
      const c = Math.cos(t * 8);
      if (quad) {
        if (r.legs) r.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 9 + i * 1.6) * amp; });
        if (r.head) r.head.rotation.x = Math.sin(t * 9) * 0.08;
        bob = Math.abs(Math.sin(t * 9)) * 0.05;
      } else {
        if (r.legL) r.legL.rotation.x = s * amp;
        if (r.legR) r.legR.rotation.x = -s * amp;
        if (r.armL) r.armL.rotation.x = -s * amp * 0.75;
        if (r.armR) r.armR.rotation.x = s * amp * 0.75;
        if (r.torso) r.torso.rotation.y = c * 0.06;
        bob = Math.abs(c) * 0.045;
      }
    } else if (this.anim === 'attack') {
      const p = clamp(this.stateT / (this.attackDur || 0.5), 0, 1);
      const swing = p < 0.45 ? -1.9 * (p / 0.45) : -1.9 + 3.1 * ((p - 0.45) / 0.55);
      if (r.armR) r.armR.rotation.x = swing;
      if (r.armL) r.armL.rotation.x = quad ? 0 : swing * 0.3;
      if (r.torso) r.torso.rotation.y = p < 0.45 ? -0.4 * (p / 0.45) : -0.4 + 0.9 * ((p - 0.45) / 0.55);
      if (r.head) r.head.rotation.x = -0.2 * Math.sin(p * Math.PI);
      bob = Math.sin(p * Math.PI) * 0.06;
    } else if (this.anim === 'cast') {
      const p = clamp(this.stateT / (this.attackDur || 0.6), 0, 1);
      if (r.armR) r.armR.rotation.x = -1.6 * Math.sin(p * Math.PI);
      if (r.armL) r.armL.rotation.x = -1.2 * Math.sin(p * Math.PI);
      if (r.head) r.head.rotation.x = -0.25 * Math.sin(p * Math.PI);
      bob = Math.sin(p * Math.PI) * 0.08;
    } else if (this.anim === 'block') {
      if (r.armL) r.armL.rotation.x = -1.15;
      if (r.armR) r.armR.rotation.x = -0.5;
      if (r.torso) r.torso.rotation.y = -0.25;
      bob = 0;
    } else if (this.anim === 'roll') {
      const p = clamp(this.stateT / (this.rollDur || 0.45), 0, 1);
      this.root.rotation.x = p * Math.PI * 2;
      if (r.legL) r.legL.rotation.x = 1.1;
      if (r.legR) r.legR.rotation.x = 1.1;
      if (r.armL) r.armL.rotation.x = 1.4;
      if (r.armR) r.armR.rotation.x = 1.4;
    } else if (this.anim === 'stagger') {
      const s = Math.sin(this.stateT * 26);
      if (r.torso) r.torso.rotation.z = s * 0.12;
      if (r.head) r.head.rotation.x = 0.3;
      if (r.armL) r.armL.rotation.x = 0.7;
      if (r.armR) r.armR.rotation.x = 0.7;
    } else if (this.anim === 'die') {
      const p = clamp(this.stateT / 0.7, 0, 1);
      this.root.rotation.x = -p * Math.PI * 0.5;
      if (r.legL) r.legL.rotation.x = -0.4 * p;
      if (r.legR) r.legR.rotation.x = 0.3 * p;
      if (r.armR) r.armR.rotation.x = 0.9 * p;
      bob = 0;
    } else { // idle
      const s = Math.sin(t * 2.2);
      if (r.torso) r.torso.rotation.y = s * 0.04;
      if (r.head) r.head.rotation.x = Math.sin(t * 1.4) * 0.05;
      if (r.legL) r.legL.rotation.x = 0;
      if (r.legR) r.legR.rotation.x = 0;
      if (r.armL) r.armL.rotation.x = 0.05 + s * 0.03;
      if (r.armR) r.armR.rotation.x = 0.05 - s * 0.03;
      bob = Math.abs(s) * 0.012;
    }

    if (this.anim !== 'roll') this.root.rotation.x = lerp(this.root.rotation.x, this.anim === 'die' ? this.root.rotation.x : 0, 1 - Math.pow(0.001, dt));
    if (this.anim === 'die') this.root.rotation.x = -clamp(this.stateT / 0.7, 0, 1) * Math.PI * 0.5;

    this.bob = bob + (this.punch > 0 ? Math.sin(this.punch * Math.PI) * 0.12 : 0);
    this.punch = Math.max(0, this.punch - dt * 4);
    const sc = 1 + (this.punch > 0 ? Math.sin(this.punch * Math.PI) * 0.12 : 0);
    this.rig.root.scaling.set(sc, 1 / sc * (1 + this.lean), sc);
    this.lean = lerp(this.lean, 0, 1 - Math.pow(0.002, dt));
    this.y = (this.game.world ? this.game.world.heightAt(this.x, this.z) : 0);
    this.root.position.set(this.x, this.y + bob, this.z);
  }

  setVisible(v) {
    for (const m of this.allMeshes) m.visibility = v;
    if (this.shadow) this.shadow.visibility = v * 0.32;
  }

  dispose() {
    disposeTree(this.root);
    this.removed = true;
  }
}
