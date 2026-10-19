// Enemies + AI. Attacks are telegraphed so parries are possible.
import { Actor } from './actor.js';
import { buildWeapon, buildShieldMesh, disposeTree } from './meshes.js';
import { angleTo, clamp, dist, lerp } from '../core/math.js';
import { sfx } from '../core/audio.js';

const B = () => window.BABYLON;

export class Enemy extends Actor {
  constructor(game, def, x, z, opts = {}) {
    super(game, {
      x, z, shape: def.shape, color: def.color, scale: def.scale, radius: def.radius,
      rigOpts: { crown: def.crown, helm: def.tier >= 3 ? '#5a5a62' : null },
    });
    this.def = def;
    this.name = def.name;
    this.level = def.level;
    this.tier = def.tier || 1;
    this.boss = !!def.boss;
    this.maxHp = def.hp;
    this.hp = def.hp;
    this.ai = 'sleep';
    this.spawnX = x; this.spawnZ = z;
    this.attackCd = Math.random() * 1.5;
    this.windup = 0;
    this.windupTotal = 0;
    this.telegraph = null;
    this.patrolTarget = null;
    this.patrolTimer = Math.random() * 3;
    this.staggered = 0;
    this.slowed = 0;
    this.rooted = 0;
    this.burning = 0; this.burnDps = 0; this.poisoned = 0; this.poisonDps = 0;
    this.hitFlash = 0;
    this.summonCd = def.summons ? 6 : 0;
    this.deathT = 0;
    this.elite = !!opts.elite;
    if (this.elite) {
      this.maxHp = Math.round(this.maxHp * 2.4); this.hp = this.maxHp;
      this.rig.root.scaling.set(1.25, 1.25, 1.25);
      this.def = { ...def, dmg: [Math.round(def.dmg[0] * 1.4), Math.round(def.dmg[1] * 1.4)], xp: Math.round(def.xp * 2.6), gold: [def.gold[0] * 2, def.gold[1] * 2], drop: Math.min(1, (def.drop || 0.3) * 2.4) };
      this.eliteAura = new (B()).MeshBuilder.CreateTorus('aura', { diameter: 2.4, thickness: 0.12, tessellation: 12 }, this.scene);
      this.eliteAura.material = game.matCache('#c04ae0', true);
      this.eliteAura.parent = this.root;
      this.eliteAura.position.y = 0.1;
    }
    if (def.weapon) {
      const w = buildWeapon(this.scene, def.weapon, '#9a9aa2', 0.95, this.rig.handR);
      this.gear = [w];
    }
    if (this.boss) {
      this.hpBarBg = null;
      const glow = new (B()).MeshBuilder.CreateDisc('bossglow', { radius: this.radius * 3, tessellation: 16 }, this.scene);
      glow.rotation.x = Math.PI / 2;
      glow.material = game.matCache('#8a2020', true);
      glow.parent = this.root;
      glow.position.y = 0.03;
      this.bossGlow = glow;
    }
  }

  get speed() {
    let s = this.def.speed;
    if (this.slowed > 0) s *= 0.55;
    if (this.rooted > 0) s = 0;
    return s;
  }

  aggroRange() { return this.def.aggro * (this.boss ? 1.4 : 1); }

  update(dt, player) {
    if (this.dead) {
      this.deathT += dt;
      if (this.deathT > 0.9) this.setVisible(Math.max(0, 1 - (this.deathT - 0.9) / 1.2));
      if (this.deathT > 2.2) this.removed = true;
      this.animate(dt);
      return;
    }

    // damage over time
    this.attackCd = Math.max(0, this.attackCd - dt);
    if (this.burning > 0) { this.burning -= dt; this.hp -= this.burnDps * dt; if (this.hp <= 0) { this.die('burn'); return; } }
    if (this.poisoned > 0) { this.poisoned -= dt; this.hp -= this.poisonDps * dt; if (this.hp <= 0) { this.die('poison'); return; } }
    if (this.slowed > 0) this.slowed -= dt;
    if (this.rooted > 0) this.rooted -= dt;

    if (this.staggered > 0) {
      this.staggered -= dt;
      this.clearTelegraph();
      if (this.staggered <= 0) { this.ai = 'chase'; this.setState('idle'); }
      else this.setState('stagger');
      this.animate(dt);
      return;
    }

    if (this.anim === 'attack' || this.anim === 'cast') {
      if (!this.attackResolved) {
        this.windup -= dt;
        if (this.windup <= 0) {
          this.resolveAttack(player);
          this.attackResolved = true;
          this.recover = this.recoverDur || 0.35;
          this.attackCd = this.def.atkCd * (0.85 + Math.random() * 0.3);
        }
      } else {
        this.recover -= dt;
        if (this.recover <= 0) this.setState('idle');
      }
      this.animate(dt);
      return;
    }

    const d = dist(this.x, this.z, player.x, player.z);
    const aggro = this.aggroRange();

    if (this.ai === 'sleep' || this.ai === 'patrol') {
      if (d < aggro && !player.dead) { this.ai = 'chase'; this.game.fx.aggro(this); }
      else {
        this.patrolTimer -= dt;
        if (this.patrolTimer <= 0) {
          this.patrolTimer = 3 + Math.random() * 4;
          const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 4;
          this.patrolTarget = [this.spawnX + Math.cos(a) * r, this.spawnZ + Math.sin(a) * r];
        }
        if (this.patrolTarget) this.steer(this.patrolTarget[0], this.patrolTarget[1], dt, 0.45);
        else this.setState('idle');
        this.animate(dt);
        return;
      }
    }

    if (player.dead) { this.ai = 'patrol'; this.patrolTarget = null; this.setState('idle'); this.animate(dt); return; }

    // leash
    if (dist(this.x, this.z, this.spawnX, this.spawnZ) > (this.boss ? 40 : 34)) {
      this.ai = 'patrol';
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.3 * dt);
      this.setPos(this.spawnX, this.spawnZ);
    }

    const range = this.def.atkRange + this.radius + player.radius;
    const keepAway = this.def.keepAway;

    if (keepAway && d < keepAway * 0.7) {
      // back off
      const a = angleTo(player.x, player.z, this.x, this.z);
      this.steerDir(Math.sin(a), Math.cos(a), dt, 0.9);
      this.faceTo(angleTo(this.x, this.z, player.x, player.z), 8, dt);
    } else if (d > range) {
      this.steer(player.x, player.z, dt, 1);
    } else {
      this.faceTo(angleTo(this.x, this.z, player.x, player.z), 9, dt);
      this.moveSpeed = 0;
      if (this.attackCd <= 0) this.beginAttack(player);
      else this.setState('idle');
    }

    // specials
    if (this.def.lunge && this.attackCd <= 0 && d > range && d < this.def.lunge + range) this.lunge(player);
    if (this.def.blink && this.attackCd <= 0 && Math.random() < 0.006) this.blinkNear(player);
    if (this.def.summons && this.summonCd > 0) this.summonCd -= dt;
    if (this.def.summons && this.summonCd <= 0 && this.hp < this.maxHp * 0.75) {
      this.summonCd = 11;
      this.game.spawnSummons(this, this.def.summons, 3);
      this.game.fx.summonBurst(this.x, this.z);
      sfx('spell');
    }
    if (this.def.slam && this.attackCd <= 0 && d > range && d < 6 && Math.random() < 0.01) this.slamAttack(player);

    this.animate(dt);
  }

  steer(tx, tz, dt, mul = 1) {
    const a = angleTo(this.x, this.z, tx, tz);
    this.faceTo(a, 7, dt);
    this.steerDir(Math.sin(a), Math.cos(a), dt, mul);
  }

  steerDir(dx, dz, dt, mul = 1) {
    const s = this.speed * mul;
    if (s <= 0) { this.setState('idle'); return; }
    // simple obstacle avoidance: probe ahead, slide if blocked
    let ax = dx, az = dz;
    const g = this.game.world.grid;
    const probe = 1.1;
    if (g.solidAt(this.x + ax * probe, this.z + az * probe)) {
      const alt1 = [dz, -dx], alt2 = [-dz, dx];
      const o1 = g.solidAt(this.x + alt1[0] * probe, this.z + alt1[1] * probe) ? 1e9 : 1;
      const o2 = g.solidAt(this.x + alt2[0] * probe, this.z + alt2[1] * probe) ? 1e9 : 1;
      const pick = o1 <= o2 ? alt1 : alt2;
      ax = pick[0] * 0.9 + dx * 0.35; az = pick[1] * 0.9 + dz * 0.35;
    }
    const moved = this.move(ax * s * dt, az * s * dt);
    this.moveSpeed = moved ? s : 0;
    this.setState(moved ? 'run' : 'idle');
  }

  beginAttack(player) {
    this.windupTotal = this.def.windup;
    this.windup = this.def.windup;
    this.attackResolved = false;
    this.recoverDur = 0.3 + (this.def.windup || 0.5) * 0.4;
    this.setState(this.def.ranged ? 'cast' : 'attack');
    this.attackTargetX = player.x; this.attackTargetZ = player.z;
    const col = this.def.ranged ? '#4a90d9' : '#e0503a';
    this.telegraph = this.game.fx.telegraph(this, this.def.atkRange + 1.2, col, this.def.windup);
    if (this.def.breath) this.telegraph = this.game.fx.telegraph(this, 7, '#e0803a', this.def.windup, true);
  }

  resolveAttack(player) {
    this.clearTelegraph();
    if (this.slamPending) {
      this.slamPending = false;
      this.game.fx.slam(this.x, this.z, 5.5);
      this.game.combat.playerHit(this, rand2(this.def.dmg), { source: 'slam', radius: 5.5 });
      sfx('fire');
      return;
    }
    if (this.def.ranged) {
      const kind = this.def.ranged;
      this.game.proj.fireEnemy(this, player.x, player.z, kind, this.def.projSpeed || 14);
      sfx('spell');
      return;
    }
    const d = dist(this.x, this.z, player.x, player.z);
    const reach = this.def.atkRange + this.radius + player.radius + 0.5;
    if (d > reach) return;
    const a = angleTo(this.x, this.z, player.x, player.z);
    if (Math.abs(angleDiffLocal(a, this.facing)) > 1.0) return;
    if (this.def.breath) {
      this.game.combat.playerHit(this, rand2(this.def.dmg), { cone: 1.1, reach: 7, element: 'fire', source: 'breath' });
      this.game.fx.cone(this.x, this.z, this.facing, 7, '#f0803a');
      sfx('fire');
    } else {
      this.game.combat.playerHit(this, rand2(this.def.dmg), { source: 'melee' });
      this.game.fx.swing(this.x, this.z, this.facing, reach, '#e0503a');
      sfx('swing');
    }
    if (this.def.poison) { player.poisoned = 3; player.poisonDps = this.def.poison; }
  }

  clearTelegraph() {
    if (this.telegraph) { this.game.fx.clearTelegraph(this.telegraph); this.telegraph = null; }
  }

  slamAttack(player) {
    this.windupTotal = 0.9; this.windup = 0.9;
    this.attackResolved = false;
    this.recoverDur = 0.5;
    this.setState('attack');
    this.slamPending = true;
    this.telegraph = this.game.fx.telegraphCircle(this, 5.5, '#e0a03a', 0.9);
    this.attackCd = this.def.atkCd;
  }

  lunge(player) {
    const a = angleTo(this.x, this.z, player.x, player.z);
    this.lungeDir = [Math.sin(a), Math.cos(a)];
    this.lungeT = 0.35;
    this.faceTo(a, 20, 1);
    const step = () => {
      if (this.dead || this.removed || this.lungeT <= 0) return;
      this.move(this.lungeDir[0] * 12 * 0.033, this.lungeDir[1] * 12 * 0.033);
      this.lungeT -= 0.033;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  blinkNear(player) {
    const a = Math.random() * Math.PI * 2;
    const r = 2.5 + Math.random() * 2;
    const tx = player.x + Math.cos(a) * r, tz = player.z + Math.sin(a) * r;
    if (this.game.world.grid.solidAt(tx, tz)) return;
    this.game.fx.blink(this.x, this.z, '#9fc8e8');
    this.setPos(tx, tz);
    this.game.fx.blink(tx, tz, '#9fc8e8');
    sfx('portal');
  }

  die(cause) {
    if (this.dead) return;
    this.dead = true;
    this.hp = 0;
    this.clearTelegraph();
    this.setState('die');
    this.stateT = 0;
    sfx(this.boss ? 'roar' : 'squelch');
    if (this.boss) sfx('die');
    this.game.onEnemyDeath(this, cause);
  }

  dispose() {
    this.clearTelegraph();
    if (this.gear) for (const g of this.gear) disposeTree(g);
    if (this.eliteAura) this.eliteAura.dispose();
    if (this.bossGlow) this.bossGlow.dispose();
    super.dispose();
  }
}

function angleDiffLocal(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
function rand2(range) { return range[0] + Math.random() * (range[1] - range[0]); }
