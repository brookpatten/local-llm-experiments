// Projectiles: arrows, enemy hexes, spells.
import { mat, disposeTree } from './meshes.js';
import { angleTo, dist, clamp } from '../core/math.js';
import { sfx } from '../core/audio.js';

const B = () => window.BABYLON;

const LOOKS = {
  arrow: { color: '#d8cfae', len: 0.9, r: 0.05, emissive: null, trail: '#cfc7b6' },
  stone: { color: '#8a8a8a', len: 0.3, r: 0.16, emissive: null, trail: '#8a8a8a' },
  hex: { color: '#b060e0', len: 0.4, r: 0.18, emissive: '#6a2a90', trail: '#b060e0' },
  ice: { color: '#8fd0f0', len: 0.4, r: 0.18, emissive: '#2a6a90', trail: '#8fd0f0' },
  fire: { color: '#f0803a', len: 0.4, r: 0.2, emissive: '#a03810', trail: '#f0803a' },
  bolt: { color: '#f0a040', len: 0.5, r: 0.2, emissive: '#b05010', trail: '#f0a040' },
};

class Projectile {
  constructor(sys, opts) {
    this.sys = sys;
    this.kind = opts.kind;
    const look = LOOKS[opts.kind] || LOOKS.arrow;
    this.from = opts.from;
    this.side = opts.side; // 'player' | 'enemy'
    this.x = opts.x; this.z = opts.z; this.y = opts.y ?? 1.1;
    this.a = opts.angle;
    this.speed = opts.speed;
    this.dmg = opts.dmg;
    this.life = opts.life || 3;
    this.pierce = opts.pierce || 0;
    this.hits = new Set();
    this.homing = opts.homing || 0;
    this.radius = opts.radius || look.r + 0.25;
    this.onHit = opts.onHit;
    this.element = opts.element;
    this.aoe = opts.aoe || 0;
    this.age = 0;

    const g = new (B()).TransformNode('proj', sys.scene);
    if (opts.kind === 'arrow') {
      const shaft = (B()).MeshBuilder.CreateCylinder('shaft', { diameter: 0.06, height: 0.9, tessellation: 4 }, sys.scene);
      shaft.rotation.x = Math.PI / 2;
      shaft.material = mat(sys.scene, look.color);
      shaft.parent = g;
      const tip = (B()).MeshBuilder.CreateCylinder('tip', { diameterTop: 0, diameterBottom: 0.1, height: 0.18, tessellation: 4 }, sys.scene);
      tip.rotation.x = -Math.PI / 2; tip.position.z = 0.5;
      tip.material = mat(sys.scene, '#b8b8c0');
      tip.parent = g;
      const fin = (B()).MeshBuilder.CreateBox('fin', { width: 0.18, height: 0.02, depth: 0.2 }, sys.scene);
      fin.position.z = -0.4; fin.material = mat(sys.scene, '#8a3a2a'); fin.parent = g;
    } else {
      const s = (B()).MeshBuilder.CreateSphere('p', { diameter: look.r * 2, segments: 2 }, sys.scene);
      s.material = mat(sys.scene, look.color, { emissive: look.emissive });
      s.parent = g;
      const glow = (B()).MeshBuilder.CreateSphere('g', { diameter: look.r * 3.4, segments: 2 }, sys.scene);
      glow.material = mat(sys.scene, look.trail, { alpha: 0.22, emissive: look.trail });
      glow.parent = g;
    }
    this.node = g;
    this.trailTimer = 0;
  }

  update(dt, game) {
    this.life -= dt;
    this.age += dt;
    if (this.life <= 0) { this.dead = true; return; }
    if (this.homing) {
      const t = game.nearestEnemy(this.x, this.z, 9, this.hits);
      if (t) {
        const want = angleTo(this.x, this.z, t.x, t.z);
        let d = ((want - this.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        this.a += clamp(d, -this.homing * dt, this.homing * dt);
      }
    }
    const dx = Math.sin(this.a) * this.speed * dt;
    const dz = Math.cos(this.a) * this.speed * dt;
    this.x += dx; this.z += dz;
    const gy = game.world.heightAt(this.x, this.z);
    this.y = gy + 1.0 + Math.sin(this.life * 3) * 0.05;
    this.node.position.set(this.x, this.y, this.z);
    this.node.rotation.y = this.a;

    // do not let a shot die at the muzzle: standing flush against a wall, tree
    // or prop used to swallow arrows and spells the instant they were fired
    if (this.age > 0.08 && game.world.grid.solidAt(this.x, this.z)) { this.impact(game); return; }

    // collision
    if (this.side === 'player') {
      for (const e of game.enemies) {
        if (e.dead || this.hits.has(e)) continue;
        if (dist(this.x, this.z, e.x, e.z) < e.radius + this.radius) { this.hits.add(e); this.hitEnemy(e, game); if (!this.pierce) { this.impact(game, e); return; } }
      }
    } else {
      const p = game.player;
      if (!p.dead && dist(this.x, this.z, p.x, p.z) < p.radius + this.radius + 0.15) { this.hitPlayer(game); this.impact(game); return; }
    }
  }

  hitEnemy(e, game) {
    game.combat.hitEnemy(this.from, e, this.dmg, { element: this.element, source: 'projectile' });
    if (this.onHit) this.onHit(e, game);
  }

  hitPlayer(game) {
    game.combat.playerHit(this.from, this.dmg, { source: 'projectile', element: this.element });
    if (this.onHit) this.onHit(null, game);
  }

  impact(game, target) {
    this.dead = true;
    const look = LOOKS[this.kind] || LOOKS.arrow;
    game.fx.impact(this.x, this.y, this.z, look.trail, this.aoe || 0.5);
    if (this.aoe > 0.6) {
      for (const e of game.enemies) {
        if (e.dead || this.hits.has(e)) continue;
        if (dist(this.x, this.z, e.x, e.z) < this.aoe) { this.hits.add(e); game.combat.hitEnemy(this.from, e, scale(this.dmg, 0.6), { element: this.element }); }
      }
    }
  }

  dispose() { disposeTree(this.node); }
}

export class ProjectileSystem {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.list = [];
  }

  spawn(opts) { const p = new Projectile(this, opts); this.list.push(p); return p; }

  fireArrow(shooter, tx, tz, mult = 1, opts = {}) {
    const a = angleTo(shooter.x, shooter.z, tx, tz);
    const dmg = opts.dmgOverride || scale(gameDmg(shooter), mult);
    return this.spawn({
      kind: 'arrow', from: shooter, side: 'player', x: shooter.x + Math.sin(a) * 0.6, z: shooter.z + Math.cos(a) * 0.6,
      y: shooter.y + 1.1, angle: a, speed: 26, dmg, life: opts.life || 1.6, pierce: opts.pierce || 0, radius: 0.4,
      element: opts.element, onHit: opts.onHit,
    });
  }

  fireEnemy(shooter, tx, tz, kind, speed) {
    const a = angleTo(shooter.x, shooter.z, tx, tz);
    const dmg = [shooter.def.dmg[0], shooter.def.dmg[1]];
    return this.spawn({
      kind, from: shooter, side: 'enemy', x: shooter.x + Math.sin(a) * 0.6, z: shooter.z + Math.cos(a) * 0.6,
      y: shooter.y + 1.2, angle: a, speed, dmg, life: 3.2, radius: 0.4,
    });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.update(dt, this.game);
      if (p.dead) { p.dispose(); this.list.splice(i, 1); }
    }
  }

  clear() { for (const p of this.list) p.dispose(); this.list = []; }
}

function gameDmg(a) {
  const st = a.state ? a.state.stats : a.stats;
  const base = (st.dmgMin + st.dmgMax) / 2;
  return [base * 0.85, base * 1.15];
}

// Damage is always a [min, max] pair, so scaling has to map both ends.
function scale(d, f) {
  return Array.isArray(d) ? [d[0] * f, d[1] * f] : [d * f, d * f];
}
