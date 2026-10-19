// Transient visual effects: telegraphs, arcs, sparks, dust, rings.
import { mat, wedgeMesh, ringMesh } from '../entities/meshes.js';

const B = () => window.BABYLON;

class Fx {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.items = [];
  }

  _add(node, life, updater) {
    const it = { node, t: 0, life, updater };
    this.items.push(it);
    return it;
  }

  // ---- telegraphs (parented to the actor so they track it) ------------------
  telegraph(actor, reach, color, dur, wide) {
    const w = wedgeMesh(this.scene, {
      radius: reach, half: wide ? 0.95 : 0.55, seg: wide ? 16 : 10,
      color, alpha: 0.3, emissive: color,
    });
    w.parent = actor.root;
    w.position.set(0, 0.06, 0);
    const it = this._add(w, dur, (f, k) => {
      f.node.visibility = 0.25 + 0.55 * k * k;
      f.node.scaling.set(0.6 + 0.4 * k, 1, 0.6 + 0.4 * k);
    });
    it.telegraph = true;
    return it;
  }

  telegraphCircle(actor, radius, color, dur) {
    const r = ringMesh(this.scene, { radius, thickness: 0.25, color, alpha: 0.3, seg: 24 });
    r.parent = actor.root;
    r.position.set(0, 0.07, 0);
    const it = this._add(r, dur, (f, k) => {
      f.node.visibility = 0.25 + 0.6 * k * k;
      f.node.scaling.set(0.5 + 0.5 * k, 1, 0.5 + 0.5 * k);
    });
    it.telegraph = true;
    return it;
  }

  clearTelegraph(it) {
    if (!it || !it.node) return;
    it.node.parent = null;
    it.node.position.y = 0.06;
    it.life = Math.min(it.life, it.t + 0.12);
  }

  // ---- attacks -------------------------------------------------------------
  swing(x, z, facing, reach, color) {
    const w = wedgeMesh(this.scene, { radius: reach, half: 0.7, seg: 12, color, alpha: 0.45 });
    w.position.set(x, 0.07, z);
    w.rotation.y = facing;
    this._add(w, 0.22, (f, k) => {
      f.node.visibility = (1 - k) * 0.6;
      f.node.scaling.set(1 + k * 0.2, 1, 1 + k * 0.2);
    });
  }

  cone(x, z, facing, reach, color) {
    const w = wedgeMesh(this.scene, { radius: reach, half: 0.9, seg: 16, color, alpha: 0.5 });
    w.position.set(x, 0.08, z);
    w.rotation.y = facing;
    this._add(w, 0.45, (f, k) => { f.node.visibility = (1 - k) * 0.7; });
  }

  circle(x, z, radius, color, alpha = 0.25, life = 0.4) {
    const w = wedgeMesh(this.scene, { radius, half: Math.PI, seg: 26, color, alpha });
    w.position.set(x, 0.07, z);
    this._add(w, life, (f, k) => { f.node.visibility = (1 - k) * alpha * 2.2; });
    return w;
  }

  ring(x, z, radius, color, life = 0.5, y = 0.08) {
    const r = ringMesh(this.scene, { radius, thickness: 0.14, color, alpha: 0.7, seg: 22 });
    r.position.set(x, y, z);
    this._add(r, life, (f, k) => {
      f.node.scaling.set(0.3 + k * 0.8, 1, 0.3 + k * 0.8);
      f.node.visibility = (1 - k) * 0.85;
    });
    return r;
  }

  slam(x, z, radius) {
    this.ring(x, z, radius, '#e0a03a', 0.5);
    this.ring(x, z, radius * 0.6, '#ffe0a0', 0.35);
    this.circle(x, z, radius, '#e0a03a', 0.2, 0.35);
    for (let i = 0; i < 10; i++) this.spark(x + (Math.random() - 0.5) * radius, 0.3, z + (Math.random() - 0.5) * radius, '#e0a03a', 0.5);
    this.game.cam.shake(0.5);
  }

  hitSpark(x, y, z, color) { for (let i = 0; i < 4; i++) this.spark(x, y, z, color, 0.28); }

  spark(x, y, z, color, life = 0.3) {
    const s = (B()).MeshBuilder.CreatePlane('spark', { size: 0.22 }, this.scene);
    s.material = mat(this.scene, color, { emissive: color, alpha: 0.9 });
    s.position.set(x, y, z);
    s.billboardMode = (B()).Mesh.BILLBOARDMODE_ALL;
    s.isPickable = false;
    const vx = (Math.random() - 0.5) * 4, vy = 1.5 + Math.random() * 3, vz = (Math.random() - 0.5) * 4;
    let px = x, py = y, pz = z;
    this._add(s, life, (f, k, dt) => {
      px += vx * dt; py += vy * dt; pz += vz * dt;
      f.node.position.set(px, py, pz);
      f.node.visibility = 1 - k;
      f.node.scaling.set(1 - k * 0.6, 1 - k * 0.6, 1);
    });
  }

  impact(x, y, z, color, radius = 0.6) {
    for (let i = 0; i < 5; i++) this.spark(x, y, z, color, 0.3);
    this.ring(x, z, radius, color, 0.28, y);
  }

  dust(x, z, n = 5) {
    for (let i = 0; i < n; i++) {
      const s = (B()).MeshBuilder.CreatePlane('dust', { size: 0.4 }, this.scene);
      s.material = mat(this.scene, '#b8a888', { alpha: 0.4 });
      s.position.set(x + (Math.random() - 0.5) * 0.8, 0.25, z + (Math.random() - 0.5) * 0.8);
      s.billboardMode = (B()).Mesh.BILLBOARDMODE_ALL;
      s.isPickable = false;
      this._add(s, 0.4, (f, k) => { f.node.visibility = (1 - k) * 0.4; f.node.scaling.set(1 + k, 1 + k, 1); });
    }
  }

  blink(x, z, color) { this.ring(x, z, 1.2, color, 0.4); for (let i = 0; i < 8; i++) this.spark(x, 0.5 + Math.random(), z, color, 0.4); }

  summonBurst(x, z) {
    this.ring(x, z, 2.5, '#b060e0', 0.6);
    for (let i = 0; i < 10; i++) this.spark(x + (Math.random() - 0.5) * 2, 0.5, z + (Math.random() - 0.5) * 2, '#b060e0', 0.5);
  }

  parryRing(actor) {
    this.ring(actor.x, actor.z, 2.2, '#ffe6a0', 0.45);
    for (let i = 0; i < 10; i++) this.spark(actor.x, 1 + Math.random(), actor.z, '#ffe6a0', 0.4);
  }

  blockSpark(actor) {
    const fx = actor.x + Math.sin(actor.facing) * 0.8, fz = actor.z + Math.cos(actor.facing) * 0.8;
    for (let i = 0; i < 6; i++) this.spark(fx, 1.2, fz, '#cfd8e8', 0.3);
  }

  potion(actor) { for (let i = 0; i < 8; i++) this.spark(actor.x, 0.6 + Math.random() * 1.4, actor.z, '#6fd06f', 0.5); }

  aggro(actor) {
    const s = (B()).MeshBuilder.CreatePlane('aggro', { size: 0.6 }, this.scene);
    s.material = mat(this.scene, '#ff5040', { emissive: '#ff5040', alpha: 0.9 });
    s.billboardMode = (B()).Mesh.BILLBOARDMODE_ALL;
    s.position.set(actor.x, (actor.rig.scale || 1) * 2.3, actor.z);
    s.isPickable = false;
    this._add(s, 0.7, (f, k, dt) => { f.node.position.y += 0.03; f.node.visibility = 1 - k; });
  }

  beam(x, z, color, life = 0.4, height = 4) {
    const c = (B()).MeshBuilder.CreateCylinder('bm', { diameter: 0.6, height, tessellation: 8 }, this.scene);
    c.material = mat(this.scene, color, { emissive: color, alpha: 0.4 });
    c.position.set(x, height / 2, z);
    c.isPickable = false;
    this._add(c, life, (f, k) => { f.node.visibility = (1 - k) * 0.5; });
  }

  pillar(x, z, color, life = 1.2, radius = 1.2) {
    const c = (B()).MeshBuilder.CreateCylinder('pil', { diameter: radius * 2, height: 3.2, tessellation: 10 }, this.scene);
    c.material = mat(this.scene, color, { emissive: color, alpha: 0.35 });
    c.position.set(x, 1.6, z);
    c.isPickable = false;
    this._add(c, life, (f, k) => { f.node.visibility = (1 - k) * 0.45; f.node.scaling.set(1 + k * 0.3, 1, 1 + k * 0.3); });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const f = this.items[i];
      f.t += dt;
      const k = Math.min(1, f.t / f.life);
      if (f.updater) f.updater(f, k, dt);
      if (f.t >= f.life) {
        try { f.node.dispose(); } catch (e) { /* already gone */ }
        this.items.splice(i, 1);
      }
    }
  }

  clear() {
    for (const f of this.items) { try { f.node.dispose(); } catch (e) { /* ignore */ } }
    this.items = [];
  }
}

export default Fx;
