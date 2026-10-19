// Player controller: Diablo-style click-to-move/attack, block+parry, roll, skills.
import { Actor } from './actor.js';
import { buildWeapon, buildShieldMesh, disposeTree } from './meshes.js';
import { angleTo, clamp, dist, lerp } from '../core/math.js';
import { SKILLS } from '../data/skills.js';
import { CLASSES } from '../data/classes.js';
import { recompute } from '../systems/progression.js';
import { sfx } from '../core/audio.js';

const B = () => window.BABYLON;

export class Player extends Actor {
  constructor(game, state) {
    const cls = CLASSES[state.classId];
    super(game, {
      x: 0, z: 0, shape: 'humanoid', color: cls.color, scale: 1.05, radius: 0.45,
      rigOpts: { helm: null },
    });
    this.state = state; // serialisable character state
    this.hp = 1; this.mana = 0; this.stamina = 0;
    this.cooldowns = {};
    this.buffs = [];
    this.blocking = false;
    this.blockStart = -99;
    this.parryFlashT = 0;
    this.rollCd = 0;
    this.attackCd = 0;
    this.gcd = 0;
    this.moveTarget = null;
    this.movePath = null;
    this.pathIdx = 0;
    this.pathTimer = 0;
    this.attackTarget = null;
    this.pendingHit = null;
    this.iframes = 0;
    this.gearNodes = [];
    this.shieldGlow = null;
    this.refreshGear();
    this.resyncVitals();
  }

  get def() { return this.state.stats; }
  get level() { return this.state.level; }

  resyncVitals() {
    recompute(this.state, this.buffs);
    const s = this.state.stats;
    this.maxHp = s.maxHp; this.maxMana = s.maxMana; this.maxStamina = s.maxStamina;
    if (this.hp <= 0 || this.hp === 1) this.hp = s.maxHp;
    if (this.mana === 0) this.mana = s.maxMana;
    if (this.stamina === 0) this.stamina = s.maxStamina;
    this.hp = clamp(this.hp, 0, s.maxHp);
    this.mana = clamp(this.mana, 0, s.maxMana);
    this.stamina = clamp(this.stamina, 0, s.maxStamina);
  }

  refreshGear() {
    for (const n of this.gearNodes) disposeTree(n);
    this.gearNodes = [];
    const eq = this.state.equipment;
    const main = eq.mainHand;
    const off = eq.offHand;
    if (main) {
      const kind = main.weapon ? main.weapon.type : 'sword';
      const w = buildWeapon(this.scene, kind, gearColor(main.rarity), 1.0, this.rig.handR);
      this.gearNodes.push(w);
      this.weaponKind = kind;
      this.twoHanded = ['axe', 'mace', 'staff'].includes(kind) && !off;
    } else this.weaponKind = null;
    if (off) {
      if (off.gfx === 'shield' || off.blockBase) {
        const s = buildShieldMesh(this.scene, gearColor(off.rarity), 1.0, this.rig.handL);
        s.rotation.y = Math.PI / 2;
        s.position.z = -0.15;
        this.gearNodes.push(s);
        this.hasShield = true;
      } else {
        const s = buildWeapon(this.scene, off.gfx === 'tome' ? 'wand' : off.gfx, gearColor(off.rarity), 0.8, this.rig.handL);
        this.gearNodes.push(s);
        this.hasShield = false;
      }
    } else this.hasShield = false;

    const helm = eq.head;
    if (helm && this.rig.head) {
      const h = new (B()).TransformNode('helmvis', this.scene);
      h.parent = this.rig.head;
      const c = gearColor(helm.rarity);
      if (helm.gfx === 'circlet') {
        const ring = new (B()).MeshBuilder.CreateTorus('cr', { diameter: 0.46, thickness: 0.07, tessellation: 8 }, this.scene);
        ring.position.y = 0.16; ring.material = this.game.matCache(c); ring.parent = h;
      } else {
        const b = new (B()).MeshBuilder.CreateBox('hb', { width: 0.44, height: 0.24, depth: 0.44 }, this.scene);
        b.position.y = 0.14; b.material = this.game.matCache(c); b.parent = h;
        const plume = new (B()).MeshBuilder.CreateBox('hp2', { width: 0.08, height: 0.26, depth: 0.08 }, this.scene);
        plume.position.y = 0.34; plume.material = this.game.matCache('#8a3a2a'); plume.parent = h;
      }
      this.gearNodes.push(h);
    }
    // chest colour band
    const chest = eq.chest;
    if (chest && this.rig.torso) {
      const t = new (B()).TransformNode('cvis', this.scene);
      t.parent = this.rig.torso;
      const b = new (B()).MeshBuilder.CreateBox('cb', { width: 0.68, height: 0.3, depth: 0.42 }, this.scene);
      b.position.y = 0.12; b.material = this.game.matCache(gearColor(chest.rarity)); b.parent = t;
      this.gearNodes.push(t);
    }
    for (const n of this.gearNodes) for (const m of n.getChildMeshes()) m.isPickable = false;
  }

  // ---- orders --------------------------------------------------------------
  orderMove(x, z) {
    this.attackTarget = null;
    this.moveTarget = { x, z };
    this.pathTimer = 0;
    this.movePath = null;
    this.game.logOnce && this.game.logOnce('move');
  }

  orderAttack(actor) {
    this.attackTarget = actor;
    this.moveTarget = null;
  }

  clearOrders() { this.moveTarget = null; this.movePath = null; this.attackTarget = null; }

  // ---- roll ----------------------------------------------------------------
  tryRoll(dirX, dirZ) {
    if (this.rollCd > 0 || this.dead || this.anim === 'roll') return false;
    const cost = this.state.stats.rollCost;
    if (this.stamina < cost * 0.5) return false;
    this.stamina = Math.max(0, this.stamina - cost);
    let dx = dirX, dz = dirZ;
    if (!dx && !dz) { dx = Math.sin(this.facing); dz = Math.cos(this.facing); }
    const len = Math.hypot(dx, dz) || 1;
    this.rollDir = [dx / len, dz / len];
    this.facing = Math.atan2(this.rollDir[0], this.rollDir[1]);
    this.rollSpeed = 13;
    this.rollDur = 0.45;
    this.setState('roll');
    this.rollCd = 0.85;
    this.iframes = 0.35;
    sfx('roll');
    this.game.fx.dust(this.x, this.z, 6);
    return true;
  }

  setBlocking(on) {
    if (on && !this.state.stats.canBlock) return;
    if (on === this.blocking) return;
    this.blocking = on;
    if (on) {
      this.blockStart = this.game.time;
      if (this.anim !== 'roll' && this.anim !== 'attack') this.setState('block');
    } else if (this.anim === 'block') this.setState('idle');
  }

  get parryReady() {
    return this.blocking && (this.game.time - this.blockStart) <= this.state.stats.parryWindow;
  }

  // ---- skills --------------------------------------------------------------
  skillRank(id) { return this.state.skills[id] || 0; }

  canCast(id) {
    const rank = this.skillRank(id);
    if (!rank) return { ok: false, why: 'not learned' };
    const s = SKILLS[id];
    if (!s) return { ok: false, why: 'unknown' };
    if ((this.cooldowns[id] || 0) > 0) return { ok: false, why: 'cooldown' };
    if (this.gcd > 0) return { ok: false, why: 'cooldown' };
    if (s.mana && this.mana < s.mana) return { ok: false, why: 'not enough mana' };
    if (s.stam && this.stamina < s.stam) return { ok: false, why: 'not enough stamina' };
    if (this.anim === 'roll' || this.dead) return { ok: false, why: 'busy' };
    return { ok: true };
  }

  // ---- update --------------------------------------------------------------
  update(dt, input) {
    if (this.dead) { this.animate(dt); return; }
    const st = this.state.stats;

    this.attackCd = Math.max(0, this.attackCd - dt);
    this.rollCd = Math.max(0, this.rollCd - dt);
    this.gcd = Math.max(0, this.gcd - dt);
    this.iframes = Math.max(0, this.iframes - dt);
    this.parryFlashT = Math.max(0, this.parryFlashT - dt);
    for (const id in this.cooldowns) this.cooldowns[id] = Math.max(0, this.cooldowns[id] - dt);

    // buffs
    for (let i = this.buffs.length - 1; i >= 0; i--) {
      const b = this.buffs[i];
      b.t -= dt;
      if (b.t <= 0) { this.buffs.splice(i, 1); this.game.ui.removeBuffIcon(b.id); recompute(this.state, this.buffs); }
    }

    // regen
    this.stamina = Math.min(st.maxStamina, this.stamina + st.staminaRegen * dt * (this.blocking ? 0.35 : 1));
    this.mana = Math.min(st.maxMana, this.mana + st.manaRegen * dt);
    if (this.hp > 0) this.hp = Math.min(st.maxHp, this.hp + st.hpRegen * dt);

    // state machine
    if (this.anim === 'roll') {
      const moved = this.move(this.rollDir[0] * this.rollSpeed * dt, this.rollDir[1] * this.rollSpeed * dt);
      this.rollSpeed = Math.max(4, this.rollSpeed - 16 * dt);
      if (this.stateT >= this.rollDur) { this.setState(this.blocking ? 'block' : 'idle'); this.game.fx.dust(this.x, this.z, 4); }
      if (!moved) this.rollSpeed = Math.max(2, this.rollSpeed - 20 * dt);
      this.animate(dt);
      return;
    }

    if (this.anim === 'attack' || this.anim === 'cast') {
      if (this.pendingHit && this.stateT >= this.hitAt) {
        const h = this.pendingHit; this.pendingHit = null;
        h.fn();
      }
      if (this.stateT >= this.attackDur) this.setState(this.blocking ? 'block' : 'idle');
      this.animate(dt);
      return;
    }

    if (this.anim === 'stagger') {
      if (this.stateT >= 0.4) this.setState('idle');
      this.animate(dt);
      return;
    }

    // blocking locks movement to a slow shuffle
    if (this.blocking && !this.attackTarget) {
      this.setState('block');
    }

    // follow orders
    let dx = 0, dz = 0, speed = 0;
    let target = null;
    if (this.attackTarget) {
      if (this.attackTarget.dead || this.attackTarget.removed) this.attackTarget = null;
      else target = this.attackTarget;
    }
    if (target) {
      const d = dist(this.x, this.z, target.x, target.z);
      const reach = this.meleeReach();
      const ranged = this.weaponKind === 'bow';
      const wantRange = ranged ? Math.min(12, reach) : reach * 0.8;
      if (d > wantRange) { this.moveTarget = { x: target.x, z: target.z }; }
      else {
        this.moveTarget = null; this.movePath = null;
        if (this.attackCd <= 0) this.meleeAttack(target);
      }
    }

    if (this.moveTarget) {
      this.pathTimer -= dt;
      if (!this.movePath || this.pathTimer <= 0) {
        this.pathTimer = 0.35;
        const path = this.game.world.grid.findPath(this.x, this.z, this.moveTarget.x, this.moveTarget.z, 3000);
        this.movePath = path && path.length ? path : [[this.moveTarget.x, this.moveTarget.z]];
        this.pathIdx = 0;
      }
      const wp = this.movePath && this.movePath[this.pathIdx];
      if (wp) {
        const d = dist(this.x, this.z, wp[0], wp[1]);
        if (d < 0.35) {
          this.pathIdx++;
          if (!this.movePath || this.pathIdx >= this.movePath.length) {
            const dd = dist(this.x, this.z, this.moveTarget.x, this.moveTarget.z);
            if (dd < 0.6) this.moveTarget = null;
            else { this.movePath = [[this.moveTarget.x, this.moveTarget.z]]; this.pathIdx = 0; }
          }
        } else {
          const a = angleTo(this.x, this.z, wp[0], wp[1]);
          const mul = this.blocking ? 0.55 : 1;
          speed = 4.6 * st.moveSpeed * mul;
          dx = Math.sin(a) * speed * dt; dz = Math.cos(a) * speed * dt;
          this.faceTo(a, 14, dt);
        }
      }
    }

    if (dx || dz) {
      this.move(dx, dz);
      if (this.anim !== 'block') this.setState(this.blocking ? 'block' : 'run');
    } else if (this.anim === 'run' || this.anim === 'walk') {
      this.setState(this.blocking ? 'block' : 'idle');
    }
    this.moveSpeed = (dx || dz) ? speed : 0;
    this.animate(dt);
  }

  meleeReach() {
    const w = this.state.stats.weaponType;
    return (w === 'bow' ? 12 : w === 'staff' ? 3.0 : w === 'axe' || w === 'mace' ? 2.6 : 2.3);
  }

  // ---- attack --------------------------------------------------------------
  meleeAttack(target) {
    const st = this.state.stats;
    this.attackCd = 1 / Math.max(0.4, st.attackRate);
    const ranged = st.weaponType === 'bow';
    this.setState(ranged ? 'cast' : 'attack');
    this.attackDur = ranged ? 0.42 : 0.42;
    this.hitAt = 0.19;
    const tx = target ? target.x : this.x + Math.sin(this.facing) * 3;
    const tz = target ? target.z : this.z + Math.cos(this.facing) * 3;
    this.faceTo(angleTo(this.x, this.z, tx, tz), 20, 1);
    this.pendingHit = {
      fn: () => {
        if (ranged) {
          this.game.proj.fireArrow(this, tx, tz, 1);
          sfx('bow');
        } else {
          const hitAny = this.game.combat.sweepMelee(this, this.meleeReach() + 0.6, 1.15, 1.0);
          sfx(st.weaponType === 'staff' ? 'spell' : st.weaponType === 'axe' || st.weaponType === 'mace' ? 'thunk' : 'swing');
          this.game.fx.swing(this.x, this.z, this.facing, this.meleeReach() + 0.6, gearColor(0));
          if (hitAny) { sfx('hit'); }
        }
      },
    };
  }

  drink(beltIndex) {
    const slot = this.state.belt[beltIndex];
    if (!slot || slot.count <= 0) return false;
    const eff = this.game.items.consumableEffect(slot.id);
    if (!eff) return false;
    let used = false;
    if (eff.hp && this.hp < this.state.stats.maxHp) { this.hp = Math.min(this.state.stats.maxHp, this.hp + eff.hp); used = true; }
    if (eff.mana && this.mana < this.state.stats.maxMana) { this.mana = Math.min(this.state.stats.maxMana, this.mana + eff.mana); used = true; }
    if (eff.stamina && this.stamina < this.state.stats.maxStamina) { this.stamina = Math.min(this.state.stats.maxStamina, this.stamina + eff.stamina); used = true; }
    if (!used) return false;
    slot.count--;
    if (slot.count <= 0) this.state.belt[beltIndex] = null;
    sfx('loot');
    this.game.fx.potion(this);
    return true;
  }

  die() {
    this.dead = true;
    this.hp = 0;
    this.clearOrders();
    this.setState('die');
    sfx('die');
  }
}

export function gearColor(rarity) {
  return ['#b8b2a4', '#5f8fbf', '#d8b840', '#e07a2c'][rarity || 0];
}
