// Skill casting: every active skill in the game resolves here.
import { mat, ringMesh } from '../entities/meshes.js';
import { SKILLS } from '../data/skills.js';
import { angleTo, dist, clamp } from '../core/math.js';
import { sfx } from '../core/audio.js';
import { recompute } from './progression.js';

const B = () => window.BABYLON;

export class SkillSystem {
  constructor(game) {
    this.game = game;
    this.zones = [];   // burning ground, traps
    this.timed = [];   // scheduled impacts
  }

  rank(id) { return this.game.player.skillRank(id); }

  physDmg(s, rank) {
    const st = this.game.player.state.stats;
    const mul = (1 + 0.28 * (rank - 1)) * (s.scale || 1);
    const flat = (s.base || 0) * (2 + this.game.player.level * 0.25);
    return [st.dmgMin * mul + flat, st.dmgMax * mul + flat];
  }

  spellDmg(s, rank) {
    const st = this.game.player.state.stats;
    const mul = (1 + 0.28 * (rank - 1)) * (s.scale || 1);
    const flat = (s.base || 0) * (2 + this.game.player.level * 0.25);
    return [st.spellPower * mul + flat, st.spellPower * mul * 1.25 + flat];
  }

  cast(id, aimX, aimZ, target) {
    const game = this.game;
    const p = game.player;
    const s = SKILLS[id];
    const rank = this.rank(id);
    if (!s || !rank) return false;
    const ok = p.canCast(id);
    if (!ok.ok) { if (ok.why !== 'cooldown' && ok.why !== 'not learned') game.log(cap(ok.why), 'bad'); return false; }
    if (s.mana) p.mana -= s.mana;
    if (s.stam) p.stamina -= s.stam;
    p.cooldowns[id] = s.cd || 1;
    p.gcd = Math.min(0.35, (s.cd || 1) * 0.35);
    game.stats.casts++;

    const a = angleTo(p.x, p.z, aimX, aimZ);
    p.faceTo(a, 20, 1);

    switch (s.type) {
      case 'meleeCone': {
        p.setState('attack'); p.attackDur = 0.5; p.hitAt = 0.2;
        p.pendingHit = { fn: () => {
          const hits = game.combat.sweepMelee(p, s.range, s.cone, 1, {
            dmgOverride: this.physDmg(s, rank), knockback: 0.6,
          });
          game.fx.swing(p.x, p.z, p.facing, s.range, '#e8d8a0');
          sfx('swing');
          if (hits) sfx('hit');
        } };
        break;
      }
      case 'charge': {
        p.setState('run');
        const dir = [Math.sin(a), Math.cos(a)];
        let travelled = 0;
        const step = (dt) => {
          if (p.dead) return false;
          const stepLen = Math.min(14 * dt, s.range - travelled);
          if (stepLen <= 0) return false;
          p.move(dir[0] * stepLen, dir[1] * stepLen);
          travelled += stepLen;
          game.fx.dust(p.x, p.z, 1);
          const hit = game.enemies.find((e) => !e.dead && dist(e.x, e.z, p.x, p.z) < e.radius + p.radius + 0.6);
          if (hit) {
            game.combat.hitEnemy(p, hit, this.physDmg(s, rank), { stun: s.stun, knockback: 1.6 });
            game.fx.slam(hit.x, hit.z, 2);
            sfx('crit');
            p.pendingHit = null;
            return false;
          }
          return true;
        };
        this.timed.push({ t: 0, dur: 1.2, tick: step });
        sfx('roll');
        break;
      }
      case 'whirl': {
        p.setState('attack'); p.attackDur = 1.4; p.hitAt = 99;
        let ticks = s.ticks, acc = 0;
        this.timed.push({
          t: 0, dur: 1.4, tick: (dt) => {
            acc += dt;
            p.root.rotation.y += dt * 12;
            if (acc > 0.32) {
              acc = 0;
              game.fx.ring(p.x, p.z, s.range, '#e8d8a0', 0.3);
              game.combat.sweepMelee(p, s.range, Math.PI, 1, { dmgOverride: this.physDmg(s, rank), noCrit: false });
              sfx('swing');
              ticks--;
            }
            return ticks > 0;
          },
        });
        break;
      }
      case 'buff': {
        p.setState('cast'); p.attackDur = 0.5; p.hitAt = 99;
        p.buffs.push({ id: s.id, mods: s.buff, t: s.duration });
        recompute(p.state, p.buffs);
        game.fx.ring(p.x, p.z, 2.2, s.class === 'warrior' ? '#8fb6e8' : '#ffe6a0', 0.6);
        game.ui.addBuffIcon(s.id, s.duration);
        sfx('spell');
        break;
      }
      case 'groundSlam': {
        p.setState('attack'); p.attackDur = 0.6; p.hitAt = 0.28;
        p.pendingHit = { fn: () => {
          game.fx.slam(p.x, p.z, s.radius);
          for (const e of game.enemies) {
            if (e.dead) continue;
            if (dist(e.x, e.z, p.x, p.z) <= s.radius + e.radius) {
              game.combat.hitEnemy(p, e, this.physDmg(s, rank), { stun: s.stun, knockback: 1.2 });
            }
          }
          sfx('crit');
        } };
        break;
      }
      case 'execute': {
        const tgt = target || game.nearestEnemy(p.x, p.z, s.range + 2);
        if (!tgt) { game.log('No target in reach', 'bad'); p.cooldowns[id] = 0.4; return false; }
        p.setState('attack'); p.attackDur = 0.55; p.hitAt = 0.22;
        p.pendingHit = { fn: () => {
          const dmg = this.physDmg(s, rank);
          const wounded = tgt.hp / tgt.maxHp < 0.25;
          game.combat.hitEnemy(p, tgt, [dmg[0] * (wounded ? 3 : 1), dmg[1] * (wounded ? 3 : 1)], { knockback: 0.4 });
          game.fx.swing(p.x, p.z, p.facing, s.range, '#ff6a4a');
          sfx('crit');
          if (wounded) game.ui.floatText(tgt.x, tgt.y + 2.4, tgt.z, 'EXECUTED', '#ff6a4a', 'big');
        } };
        break;
      }
      case 'shot': {
        p.setState('cast'); p.attackDur = 0.45; p.hitAt = 0.18;
        p.pendingHit = { fn: () => {
          for (let i = 0; i < (s.count || 2); i++) {
            const aa = a + (i - ((s.count || 2) - 1) / 2) * (s.spread || 0.05);
            game.proj.spawn({
              kind: 'arrow', from: p, side: 'player', x: p.x + Math.sin(aa) * 0.6, z: p.z + Math.cos(aa) * 0.6,
              y: p.y + 1.1, angle: aa, speed: 26, dmg: this.physDmg(s, rank), life: 1.6,
            });
          }
          sfx('swing');
        } };
        break;
      }
      case 'volley': {
        p.setState('cast'); p.attackDur = 0.6; p.hitAt = 99;
        const cx = aimX, cz = aimZ;
        let acc = 0, shots = 6;
        game.fx.circle(cx, cz, s.radius, '#e8d8a0', 0.2, 0.6);
        this.timed.push({
          t: 0, dur: 0.7, tick: (dt) => {
            acc += dt;
            if (acc < 0.12) return true;
            acc = 0; shots--;
            const px = cx + (Math.random() - 0.5) * s.radius * 1.6;
            const pz = cz + (Math.random() - 0.5) * s.radius * 1.6;
            const e = game.nearestEnemy(px, pz, 2.2);
            game.fx.impact(px, 0.4, pz, '#e8d8a0', 0.6);
            if (e) game.combat.hitEnemy(p, e, this.physDmg(s, rank), {});
            sfx('swing');
            return shots > 0;
          },
        });
        break;
      }
      case 'blinkShot': {
        const tgt = target || game.nearestEnemy(p.x, p.z, s.range + 6);
        const away = tgt ? angleTo(tgt.x, tgt.z, p.x, p.z) : a;
        const nx = p.x + Math.sin(away) * s.range, nz = p.z + Math.cos(away) * s.range;
        game.fx.blink(p.x, p.z, '#cfe8f8');
        const [rx, rz] = game.world.grid.resolve(nx, nz, p.radius);
        p.setPos(rx, rz);
        p.iframes = 0.35;
        game.fx.blink(rx, rz, '#cfe8f8');
        sfx('portal');
        p.setState('cast'); p.attackDur = 0.4; p.hitAt = 0.15;
        p.pendingHit = { fn: () => {
          const ta = tgt ? angleTo(p.x, p.z, tgt.x, tgt.z) : away;
          game.proj.fireArrow(p, p.x + Math.sin(ta) * 10, p.z + Math.cos(ta) * 10, 1, { dmgOverride: this.physDmg(s, rank) });
          const pr = game.proj.list[game.proj.list.length - 1];
          if (pr) { pr.dmg = this.physDmg(s, rank); }
          sfx('swing');
        } };
        break;
      }
      case 'trap': {
        const z = this.makeZone({ x: aimX, z: aimZ, radius: s.radius, life: s.duration + 3, kind: 'trap', skill: s, rank, game: this.game });
        sfx('chest');
        break;
      }
      case 'pierce': {
        p.setState('cast'); p.attackDur = 0.6; p.hitAt = 0.25;
        p.pendingHit = { fn: () => {
          game.proj.spawn({
            kind: 'arrow', from: p, side: 'player', x: p.x + Math.sin(a) * 0.6, z: p.z + Math.cos(a) * 0.6,
            y: p.y + 1.1, angle: a, speed: 30, dmg: this.physDmg(s, rank), life: 2.2, pierce: 8,
          });
          game.fx.swing(p.x, p.z, a, 4, '#e8d8a0');
          sfx('swing');
        } };
        break;
      }
      case 'bolt': {
        p.setState('cast'); p.attackDur = 0.42; p.hitAt = 0.16;
        p.pendingHit = { fn: () => {
          game.proj.spawn({
            kind: 'bolt', from: p, side: 'player', x: p.x + Math.sin(a) * 0.6, z: p.z + Math.cos(a) * 0.6,
            y: p.y + 1.2, angle: a, speed: 20, dmg: this.spellDmg(s, rank), life: 2.4, homing: 4.5, aoe: 1.6,
            element: s.element, onHit: (e) => { if (e && e.def) { e.burning = 3; e.burnDps = Math.max(e.burnDps, 2 + p.level * 0.3); } },
          });
          sfx('fire');
        } };
        break;
      }
      case 'nova': {
        p.setState('cast'); p.attackDur = 0.55; p.hitAt = 0.2;
        p.pendingHit = { fn: () => {
          game.fx.ring(p.x, p.z, s.radius, '#8fd0f0', 0.6);
          for (const e of game.enemies) {
            if (e.dead) continue;
            if (dist(e.x, e.z, p.x, p.z) <= s.radius + e.radius) {
              game.combat.hitEnemy(p, e, this.spellDmg(s, rank), { slow: s.slow, element: s.element });
            }
          }
          sfx('frost');
        } };
        break;
      }
      case 'chain': {
        p.setState('cast'); p.attackDur = 0.5; p.hitAt = 0.18;
        p.pendingHit = { fn: () => {
          let from = { x: p.x, z: p.z };
          const hitSet = new Set();
          for (let i = 0; i < (s.jumps || 3); i++) {
            const e = game.nearestEnemy(from.x, from.z, s.range, hitSet);
            if (!e) break;
            hitSet.add(e);
            game.fx.beam(e.x, e.z, '#8fd0f0', 0.25, 3);
            game.fx.impact(e.x, e.y + 1, e.z, '#8fd0f0', 0.8);
            game.combat.hitEnemy(p, e, this.spellDmg(s, rank), { element: s.element });
            from = e;
          }
          sfx('spell');
        } };
        break;
      }
      case 'blink': {
        const d = Math.min(s.range, dist(p.x, p.z, aimX, aimZ));
        const aa = angleTo(p.x, p.z, aimX, aimZ);
        const nx = p.x + Math.sin(aa) * d, nz = p.z + Math.cos(aa) * d;
        game.fx.blink(p.x, p.z, '#8fd0f0');
        const [rx, rz] = game.world.grid.resolve(nx, nz, p.radius);
        p.setPos(rx, rz);
        p.iframes = 0.3;
        game.fx.blink(rx, rz, '#8fd0f0');
        game.fx.ring(rx, rz, 3, '#8fd0f0', 0.5);
        for (const e of game.enemies) if (!e.dead && dist(e.x, e.z, rx, rz) < 3) e.slowed = Math.max(e.slowed, 3);
        sfx('portal');
        break;
      }
      case 'wall': {
        this.makeZone({ x: aimX, z: aimZ, radius: s.radius, life: s.duration, kind: 'fire', skill: s, rank, game: this.game });
        sfx('fire');
        break;
      }
      case 'meteor': {
        p.setState('cast'); p.attackDur = 1.0; p.hitAt = 99;
        game.fx.circle(aimX, aimZ, s.radius, '#f0803a', 0.22, 0.9);
        this.timed.push({
          t: 0, dur: 0.9, once: () => {
            game.fx.pillar(aimX, aimZ, '#f0803a', 0.8, s.radius * 0.6);
            game.fx.ring(aimX, aimZ, s.radius, '#ffb04a', 0.7);
            game.fx.slam(aimX, aimZ, s.radius);
            for (const e of game.enemies) {
              if (e.dead) continue;
              if (dist(e.x, e.z, aimX, aimZ) <= s.radius + e.radius) {
                game.combat.hitEnemy(p, e, this.spellDmg(s, rank), { element: 'fire', burn: { dur: 4, dps: 4 + p.level * 0.4 }, knockback: 1.4 });
              }
            }
            game.cam.shake(0.6);
            sfx('fire');
          },
        });
        sfx('spell');
        break;
      }
      default:
        game.log('Skill not implemented: ' + id, 'bad');
        return false;
    }
    return true;
  }

  makeZone(z) {
    const scene = this.game.scene;
    const color = z.kind === 'trap' ? '#b08040' : '#f0603a';
    if (z.kind === 'trap') {
      z.node = ringMesh(scene, { radius: z.radius, thickness: 0.18, color, alpha: 0.5, seg: 18 });
      z.node.position.set(z.x, 0.1, z.z);
    } else {
      z.node = (B()).MeshBuilder.CreateDisc('zone', { radius: z.radius, tessellation: 20 }, scene);
      z.node.rotation.x = Math.PI / 2;
      z.node.material = mat(scene, color, { emissive: color, alpha: 0.3 });
      z.node.position.set(z.x, this.game.world.heightAt(z.x, z.z) + 0.06, z.z);
    }
    z.node.isPickable = false;
    z.t = 0;
    z.acc = 0;
    this.zones.push(z);
    return z;
  }

  update(dt) {
    const game = this.game;
    // scheduled impacts
    for (let i = this.timed.length - 1; i >= 0; i--) {
      const t = this.timed[i];
      t.t += dt;
      if (t.once && !t.done && t.t >= t.dur) { t.done = true; t.once(); }
      if (t.tick) { const keep = t.tick(dt); if (!keep || t.t > t.dur + 2) this.timed.splice(i, 1); }
      else if (t.t >= t.dur) this.timed.splice(i, 1);
    }
    // ground zones
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.t += dt; z.acc += dt;
      if (z.node && z.kind === 'fire') z.node.visibility = 0.25 + Math.sin(z.t * 8) * 0.1;
      if (z.acc >= 0.5) {
        z.acc = 0;
        if (z.kind === 'fire') {
          const s = z.skill, rank = z.rank;
          for (const e of game.enemies) {
            if (e.dead) continue;
            if (dist(e.x, e.z, z.x, z.z) <= z.radius + e.radius) {
              const dmg = this.spellDmg(s, rank);
              game.combat.hitEnemy(game.player, e, [dmg[0] * 0.5, dmg[1] * 0.5], { element: 'fire', burn: { dur: 2, dps: 2 + game.player.level * 0.2 } });
            }
          }
          game.fx.spark(z.x + (Math.random() - 0.5) * z.radius * 1.5, 0.3, z.z + (Math.random() - 0.5) * z.radius * 1.5, '#f0803a', 0.5);
        } else if (z.kind === 'trap') {
          const s = z.skill, rank = z.rank;
          let n = 0;
          for (const e of game.enemies) {
            if (e.dead || n >= 4) continue;
            if (dist(e.x, e.z, z.x, z.z) <= z.radius + e.radius) {
              n++;
              e.rooted = Math.max(e.rooted, s.duration);
              const dmg = this.physDmg(s, rank);
              game.combat.hitEnemy(game.player, e, [dmg[0] * 0.4, dmg[1] * 0.4], { root: s.duration });
            }
          }
          if (n) game.fx.ring(z.x, z.z, z.radius, '#b08040', 0.4);
        }
      }
      if (z.t >= z.life) {
        if (z.node) z.node.dispose();
        this.zones.splice(i, 1);
      }
    }
  }

  clear() {
    for (const z of this.zones) if (z.node) z.node.dispose();
    this.zones = [];
    this.timed = [];
  }
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
