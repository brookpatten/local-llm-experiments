// Damage resolution both ways, including block / parry / dodge / i-frames.
import { angleTo, dist, clamp } from '../core/math.js';
import { armorReduction } from './progression.js';
import { sfx } from '../core/audio.js';

export class CombatSystem {
  constructor(game) { this.game = game; }

  roll(range) {
    if (Array.isArray(range)) return range[0] + Math.random() * (range[1] - range[0]);
    return range;
  }

  // ---- player -> enemy -----------------------------------------------------
  hitEnemy(attacker, enemy, dmgRange, opts = {}) {
    if (!enemy || enemy.dead) return 0;
    const st = attacker.state ? attacker.state.stats : attacker.stats;
    let dmg = this.roll(dmgRange);
    let crit = false;
    const critChance = opts.noCrit ? 0 : (st.crit || 0);
    if (Math.random() * 100 < critChance) { crit = true; dmg *= st.critMult || 2; }
    if (enemy.staggered > 0) dmg *= 1.6;
    if (opts.element) dmg *= 1 + (opts.element === 'fire' ? 0.05 : 0);
    const red = armorReduction(enemy.def.armor || 0, attacker.level || 1);
    dmg = Math.max(1, dmg * (1 - red));
    if (enemy.def.ethereal) dmg *= 1 - enemy.def.ethereal;
    dmg = Math.round(dmg);
    enemy.hp -= dmg;
    enemy.punch = 1;
    enemy.lean = 0.1;

    this.game.ui.floatText(enemy.x, enemy.y + (enemy.rig.scale || 1) * 1.6, enemy.z, String(dmg), crit ? '#ffd24a' : '#ffffff', crit ? 'crit' : 'dmg');
    this.game.fx.hitSpark(enemy.x, enemy.y + 1, enemy.z, crit ? '#ffd24a' : '#ff8a6a');
    if (crit) sfx('crit'); else sfx('hit');

    if (opts.knockback && !enemy.def.knockbackResist) {
      const a = angleTo(attacker.x, attacker.z, enemy.x, enemy.z);
      enemy.move(Math.sin(a) * opts.knockback, Math.cos(a) * opts.knockback);
    }
    if (opts.stagger) this.staggerEnemy(enemy, opts.stagger);
    if (opts.stun) this.staggerEnemy(enemy, opts.stun);
    if (opts.slow) { enemy.slowed = Math.max(enemy.slowed, opts.slow); }
    if (opts.burn) { enemy.burning = Math.max(enemy.burning, opts.burn.dur); enemy.burnDps = Math.max(enemy.burnDps, opts.burn.dps); }
    if (opts.poison) { enemy.poisoned = Math.max(enemy.poisoned, opts.poison.dur); enemy.poisonDps = Math.max(enemy.poisonDps, opts.poison.dps); }
    if (opts.root) enemy.rooted = Math.max(enemy.rooted, opts.root);

    if (st.lifeSteal && attacker.state) {
      const heal = dmg * st.lifeSteal / 100;
      if (heal > 0.5) { attacker.hp = Math.min(attacker.state.stats.maxHp, attacker.hp + heal); }
    }
    if (enemy.hp <= 0) enemy.die(opts.cause || 'combat');
    this.game.stats.damageDealt = (this.game.stats.damageDealt || 0) + dmg;
    return dmg;
  }

  staggerEnemy(enemy, dur) {
    if (!enemy || enemy.dead) return;
    const resist = enemy.def.staggerResist || 0;
    const d = dur * (1 - resist);
    if (d <= 0) return;
    enemy.staggered = Math.max(enemy.staggered, d);
    enemy.clearTelegraph();
    enemy.setState('stagger');
    this.game.ui.floatText(enemy.x, enemy.y + 2.4, enemy.z, 'STAGGER', '#9fe0ff', 'small');
  }

  // cone sweep used by melee attacks and some skills. Returns number of hits.
  sweepMelee(attacker, reach, coneHalf, mult = 1, opts = {}) {
    const list = opts.enemies || this.game.enemies;
    let hits = 0;
    for (const e of list) {
      if (e.dead) continue;
      const d = dist(attacker.x, attacker.z, e.x, e.z);
      if (d > reach + e.radius) continue;
      const a = angleTo(attacker.x, attacker.z, e.x, e.z);
      let diff = ((a - attacker.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      if (Math.abs(diff) > coneHalf) continue;
      const st = attacker.state ? attacker.state.stats : attacker.stats;
      const dmgRange = opts.dmgOverride || [st.dmgMin * mult, st.dmgMax * mult];
      this.hitEnemy(attacker, e, dmgRange, opts);
      hits++;
    }
    return hits;
  }

  // ---- enemy -> player -----------------------------------------------------
  playerHit(source, dmgRange, opts = {}) {
    const p = this.game.player;
    const st = p.state.stats;
    if (p.dead) return 0;

    if (p.iframes > 0) {
      this.game.ui.floatText(p.x, p.y + 2.1, p.z, 'EVADE', '#8fd0ff', 'small');
      return 0;
    }
    if (Math.random() * 100 < (st.dodge || 0)) {
      this.game.ui.floatText(p.x, p.y + 2.1, p.z, 'DODGE', '#a0e0a0', 'small');
      sfx('roll');
      return 0;
    }

    let dmg = this.roll(dmgRange);
    const lvl = source && source.level ? source.level : 1;

    // parry
    if (p.parryReady && (opts.source !== 'slam')) {
      this.parry(source, p);
      return -1;
    }
    // block
    let blocked = false;
    if (p.blocking && st.canBlock && opts.source !== 'slam') {
      if (Math.random() * 100 < st.blockChance) {
        blocked = true;
        dmg *= 0.3;
        p.stamina = Math.max(0, p.stamina - 12);
        this.game.ui.floatText(p.x, p.y + 2.1, p.z, 'BLOCK', '#cfd8e8', 'small');
        this.game.fx.blockSpark(p);
        sfx('block');
      } else {
        p.stamina = Math.max(0, p.stamina - 18);
        this.game.ui.floatText(p.x, p.y + 2.1, p.z, 'GUARD BROKEN', '#e0a060', 'small');
        sfx('block');
      }
    }

    const red = armorReduction(st.armor, lvl);
    dmg *= (1 - red);
    dmg *= st.dmgTakenMul;

    if (st.manaShield > 0 && p.mana > 0) {
      const absorb = dmg * st.manaShield / 100;
      const take = Math.min(p.mana, absorb);
      p.mana -= take;
      dmg -= take;
      if (take > 1) this.game.ui.floatText(p.x, p.y + 2.4, p.z, '-' + Math.round(take), '#7fb6e8', 'small');
    }

    dmg = Math.max(1, Math.round(dmg));
    p.hp -= dmg;
    p.punch = 1;
    p.lean = 0.12;
    this.game.ui.floatText(p.x, p.y + 1.9, p.z, String(dmg), '#ff6a5a', 'dmg');
    this.game.ui.dmgFlash(clamp(dmg / Math.max(1, st.maxHp), 0.05, 0.6));
    this.game.fx.hitSpark(p.x, p.y + 1.2, p.z, '#ff5a4a');
    this.game.cam.shake(clamp(dmg / Math.max(1, st.maxHp) * 2.2, 0.05, 0.5));
    sfx('hurt');

    // thorns
    if (st.thorns > 0 && source && source.hp !== undefined && source.def) {
      const t = Math.round(st.thorns * (1 + st.mainAttr * 0.02));
      source.hp -= t;
      this.game.ui.floatText(source.x, source.y + 1.8, source.z, String(t), '#b8e0a0', 'small');
      if (source.hp <= 0) source.die('thorns');
    }

    if (p.hp <= 0) p.die();
    const dmgTakenMul = 1 - clamp((st.dmgTaken || 0) / 100, -0.6, 0.85);
    dmg = Math.max(1, Math.round(dmg * dmgTakenMul));
    this.game.stats.damageTaken = (this.game.stats.damageTaken || 0) + dmg;
    return dmg;
  }

  parry(source, p) {
    sfx('parry');
    this.game.ui.parryFlash();
    this.game.ui.floatText(p.x, p.y + 2.3, p.z, 'PARRY!', '#ffe6a0', 'big');
    this.game.fx.parryRing(p);
    this.game.cam.shake(0.35);
    p.stamina = Math.min(p.state.stats.maxStamina, p.stamina + 14);
    p.blockStart = this.game.time - 0.12; // small window to chain parries
    if (source && source.def) {
      this.staggerEnemy(source, 1.3);
      const reflect = Math.round(4 + p.state.stats.dmgMax * 0.25);
      source.hp -= reflect;
      this.game.ui.floatText(source.x, source.y + 2.0, source.z, String(reflect), '#ffe6a0', 'small');
      if (source.hp <= 0) source.die('parry');
    }
    this.game.stats.parrys++;
    this.game.log('Parried!', 'good');
  }
}
