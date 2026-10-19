// Player controller: movement, attack, block/parry, roll, skills.
import { S } from './state.js';
import { U } from './util.js';
import { R } from './rig.js';
import { F } from './fx.js';
import { STATS as ST } from './stats.js';
import { C } from './classes.js';
import { E } from './enemies.js';

const B = window.BABYLON;
export const PL = {};

export let P = null;

export function newController(cls) {
  const p = ST.newPlayer(cls);
  ST.recomputeGear(p);
  ST.recalcStats(p);
  p.hp = p.stats.maxHp; p.stamina = p.stats.maxStamina; p.mana = p.stats.maxMana;
  const c = {
    x: 0, z: 0, y: 0, r: 0.62, facing: 0,
    state: 'idle', prog: 0, t: 0, anim: 'idle',
    speed: 5.4, rollDist: 6.4, rollT: 0, rollDx: 0, rollDz: 0,
    blocking: false, blockStart: -9, blockHold: 0,
    attackT: 0, attackDur: 0.62, combo: 0, attackYaw: 0, attackRange: 2.4, attackArc: 1.5, attackDone: false,
    hurtT: 0, invuln: 0, dead: false, deathT: 0,
    rig: null, mats: [],
    buffs: {}, cooldowns: {},
    lastHitBy: null, parryTarget: null,
    staminaRegenDelay: 0, manaRegenDelay: 0,
    attackCount: 0, comboWindow: 0,
    dashT: 0, dashDx: 0, dashDz: 0,
    castT: 0, castYaw: 0,
  };
  P = c;
  S.p = c; S.player = p;
  return { p, c };
}

export function buildPlayerRig(cls, gear) {
  const meta = C.CLASS_META[cls];
  const weapon = gear.mainHand ? gear.mainHand.name : null;
  let wtype = null;
  if (weapon) {
    if (/bow/i.test(weapon)) wtype = 'bow';
    else if (/staff|rod/i.test(weapon)) wtype = 'staff';
    else if (/hammer|axe/i.test(weapon)) wtype = 'axe';
    else if (/dagger|blade|sword/i.test(weapon)) wtype = 'sword';
    else wtype = 'sword';
  } else wtype = meta.signature === 'volley' ? 'bow' : meta.signature === 'fireball' ? 'staff' : 'sword';
  const spec = {
    scale: 1.0,
    colors: { body: meta.color, accent: '#d9c9a2', skin: '#d8ab84', metal: '#9aa3ad', trim: '#3a2f26' },
    weapon: wtype, shield: !!gear.offHand, helm: !!gear.head, cape: cls === 'mage',
    gem: cls === 'mage' ? '#ff8a3a' : '#7ad6ff',
  };
  const rig = R.buildHumanoid(S.scene, 'player', spec);
  rig.root.position = new B.Vector3(0, 0, 0);
  P.rig = rig;
  P.mats = rig.mats;
  P.baseScale = spec.scale;
  return rig;
}

export function updatePlayer(dt, input) {
  if (!P) return;
  const p = S.player, s = p.stats;
  P.t += dt;
  P.invuln = Math.max(0, P.invuln - dt);
  P.hurtT = Math.max(0, P.hurtT - dt);
  P.comboWindow = Math.max(0, P.comboWindow - dt);
  if (P.comboWindow <= 0) P.combo = 0;

  // resources
  const regenMult = P.buffs.stamRegen || 1;
  if (P.staminaRegenDelay > 0) P.staminaRegenDelay -= dt; else p.stamina = Math.min(s.maxStamina, p.stamina + s.staminaRegen * dt * regenMult);
  if (P.manaRegenDelay > 0) P.manaRegenDelay -= dt; else p.mana = Math.min(s.maxMana, p.mana + s.manaRegen * dt);
  p.hp = Math.min(s.maxHp, p.hp + s.hpRegen * dt * 0.35);

  // buffs
  for (const k in P.buffs) { P.buffs[k] -= dt; if (P.buffs[k] <= 0) delete P.buffs[k]; }

  if (p.hp <= 0 && !P.dead) { P.dead = true; P.deathT = 0; p.deaths++; }
  if (P.dead) {
    P.deathT += dt;
    P.prog = Math.min(1, P.prog + dt * 1.2);
    R.pose(P.rig, 'die', P.prog, { t: P.t });
    return;
  }

  // roll in progress
  if (P.state === 'roll') {
    P.rollT += dt;
    const dur = 0.46 * (P.buffs.rollLong ? 1.25 : 1);
    const k = Math.min(1, P.rollT / dur);
    const d = P.rollDist * (P.buffs.rollLong ? 1.3 : 1) * U.easeOut(k);
    const nx = P.startX + P.rollDx * d, nz = P.startZ + P.rollDz * d;
    const out = U.resolveCircle(nx, nz, P.r, S.solidRef, S.tmp.ppos || (S.tmp.ppos = {}));
    P.x = out.x; P.z = out.z;
    P.rig.root.rotation.x = k * Math.PI * 2;
    R.pose(P.rig, 'roll', k, { t: P.t });
    if (k >= 1) { P.state = 'idle'; P.rig.root.rotation.x = 0; }
    return;
  }

  // hurt stagger
  if (P.state === 'hurt') {
    P.prog = Math.min(1, P.prog + dt * 3.2);
    R.pose(P.rig, 'hurt', P.prog, { t: P.t });
    if (P.prog >= 1) P.state = 'idle';
    return;
  }

  // attack in progress
  if (P.state === 'attack') {
    P.attackT += dt;
    const k = Math.min(1, P.attackT / P.attackDur);
    R.pose(P.rig, 'attack', k, { t: P.t });
    if (k >= 1) P.state = 'idle';
    return;
  }
  if (P.state === 'cast') {
    P.castT += dt;
    const k = Math.min(1, P.castT / P.castDur);
    R.pose(P.rig, 'cast', k, { t: P.t });
    if (k >= 1) P.state = 'idle';
    return;
  }

  // movement
  let mx = input.mx, mz = input.mz;
  const len = Math.hypot(mx, mz);
  if (len > 0.01) {
    mx /= len; mz /= len;
    let sp = P.speed * s.moveSpeed * (P.buffs.speed || 1);
    if (P.blocking) sp *= 0.55;
    if (P.buffs.slow) sp *= 1 - P.buffs.slow;
    const nx = P.x + mx * sp * dt, nz = P.z + mz * sp * dt;
    const out = U.resolveCircle(nx, nz, P.r, S.solidRef, S.tmp.ppos || (S.tmp.ppos = {}));
    P.x = out.x; P.z = out.z;
    P.facing = U.heading(mx, mz);
    P.anim = sp < 3 ? 'walk' : 'run';
    R.pose(P.rig, P.anim, 0, { t: P.t });
  } else {
    P.anim = P.blocking ? 'block' : 'idle';
    R.pose(P.rig, P.anim, 0, { t: P.t });
  }
  P.rig.root.position.x = P.x;
  P.rig.root.position.z = P.z;
  P.rig.root.rotation.y = P.facing;
  flashPlayer();
}

export function flashPlayer() {
  if (!P || !P.mats) return;
  const hurt = P.hurtT > 0;
  for (const m of P.mats) {
    if (hurt) m.emissiveColor = new B.Color3(0.5, 0.05, 0.05);
    else if (P.buffs.rage) m.emissiveColor = new B.Color3(0.35, 0.08, 0.05);
    else if (P.buffs.mana) m.emissiveColor = new B.Color3(0.1, 0.1, 0.3);
    else m.emissiveColor = new B.Color3(0, 0, 0);
  }
}

// ---------- combat ----------
export function tryAttack(input) {
  if (!P || P.dead || P.state === 'roll' || P.state === 'hurt') return;
  const p = S.player, s = p.stats;
  if (p.stamina < 4) return;
  p.stamina -= 4;
  const aim = aimYaw(input);
  P.facing = aim;
  P.state = 'attack';
  P.attackT = 0;
  const spd = S.player.weapon?.spd || 1.15;
  P.attackDur = 0.66 / spd * (P.buffs.rapid ? 0.55 : 1);
  P.attackYaw = aim;
  P.attackRange = 2.9 + (S.player.mainHand?.wtype === 'two' ? 0.6 : 0) + (s.dex * 0.006);
  P.attackArc = 1.5;
  P.attackDone = false;
  R.pose(P.rig, 'attack', 0, { t: P.t });
  P.rig.root.position.x = P.x; P.rig.root.position.z = P.z; P.rig.root.rotation.y = aim;
  resolveAttack(P.attackRange, P.attackArc, aim, 1.0);
  if (P.buffs.rapid) resolveAttack(P.attackRange, P.attackArc, aim, 0.55);
  P.combo = (P.combo + 1) % 4;
  S.player.attacks = (S.player.attacks || 0) + 1;
  P.comboWindow = 1.4;
}

export function aimYaw(input) {
  if (input.aimX != null) {
    const g = U.screenToGround(input.aimX, input.aimY, 0.6);
    if (g) return U.heading(g[0] - P.x, g[1] - P.z);
  }
  if (input.mx || input.mz) return U.heading(input.mx, input.mz);
  return P.facing;
}

export function resolveAttack(range, arc, yaw, mult, opts) {
  const p = S.player, s = p.stats;
  let hits = 0;
  for (const e of S.enemies) {
    if (e.dead) continue;
    const d = U.d2(P.x, P.z, e.x, e.z);
    if (d > range + e.r) continue;
    const a = U.heading(e.x - P.x, e.z - P.z);
    if (Math.abs(U.angleDelta(yaw, a)) > arc * 0.5) continue;
    // enemy block / parry
    if (e.blocking && e.blockT <= 0 && Math.abs(U.angleDelta(e.facing, U.angleDelta(a, Math.PI))) < 1.1) {
      e.blockT = 0.5;
      F.text(e.x, 1.6, e.z, 'BLOCK', '#cfd6dd', 0.9);
      F.slash(e.x, 1.2, e.z, a, 1.2, '#dfe6ea', 0.16);
      continue;
    }
    const crit = S.rng.next() * 100 < s.crit;
    const base = ST.attackPower(p, s) * mult;
    const res = ST.rollDamage(base, crit, s.critMult, e.armor, p.level, 0.12, S.rng);
    E.damageEnemy(e, res.dmg, { stagger: crit ? 0.35 : 0, knock: [Math.sin(a) * 0.35, Math.cos(a) * 0.35] });
    F.burst(e.x, 1.0, e.z, crit ? '#ffd23a' : '#c94b3a', crit ? 10 : 5, { spread: 1.4, up: 2.4, size: 0.14 });
    F.slash((P.x + e.x) / 2, 1.1, (P.z + e.z) / 2, a, range * 0.8, crit ? '#ffd23a' : '#f2f2f2', 0.18);
    F.text(e.x, 1.9, e.z, (crit ? '' : '') + res.dmg + (crit ? '!' : ''), crit ? '#ffd23a' : '#f4f4f4', 1.0);
    if (crit) F.shake(0.35);
    if (s.lifesteal > 0) ST.heal(p, s, res.dmg * s.lifesteal);
    hits++;
  }
  if (hits) { F.shake(0.12); p.kills += 0; S.player.hits = (S.player.hits || 0) + hits; }
  return hits;
}

// ---------- block / parry ----------
export function setBlock(on) {
  const p = S.player, s = p.stats;
  if (on) {
    if (!P.blocking) { P.blockStart = P.t; P.blockHold = 0; }
    P.blocking = true;
  } else P.blocking = false;
}

export function playerTakeDamage(raw, e, opts) {
  const p = S.player, s = p.stats;
  if (P.god) return 0;
  if (P.dead || P.invuln > 0) {
    if (P.invuln > 0) F.text(P.x, 1.8, P.z, 'EVADE', '#8fe08f', 0.8);
    return 0;
  }
  const facingEnemy = e ? Math.abs(U.angleDelta(P.facing, U.heading(e.x - P.x, e.z - P.z))) < 1.35 : true;
  // parry: block started recently + facing
  const parryWindow = s.parryWindow + (P.buffs.parry ? 0.15 : 0);
  if (P.blocking && (P.t - P.blockStart) < parryWindow && facingEnemy && (s.block > 0 || p.cls === 'warrior')) {
    P.buffs.parryFlash = 0.4;
    if (e) {
      E.damageEnemy(e, Math.round(ST.attackPower(p, s) * 0.35), { stagger: 0.9 });
      e.state = 'recover'; e.prog = 0;
      F.text(e.x, 2.0, e.z, 'PARRY!', '#ffe9a0', 1.1);
      F.slash(e.x, 1.3, e.z, U.heading(e.x - P.x, e.z - P.z), 2.2, '#fff2b0', 0.22);
      F.shake(0.5);
    }
    P.staminaRegenDelay = 0.4;
    return 0;
  }
  if (P.blocking && s.block > 0 && facingEnemy) {
    const absorbed = raw * s.block;
    const rest = raw - absorbed;
    p.stamina -= 6 + rest * 0.25;
    F.text(P.x, 1.8, P.z, 'BLOCK', '#9ec4e8', 0.8);
    if (p.stamina < 0) {
      p.stamina = 0;
      P.buffs.shieldBreak = 0.6;
      F.text(P.x, 2.1, P.z, 'SHIELD BREAK', '#ff6a5a', 1.2);
      F.shake(0.6);
    }
    const dmg = ST.damageToPlayer(p, s, Math.max(1, rest));
    p.hp -= dmg;
    F.burst(P.x, 1.1, P.z, '#9ec4e8', 4, { spread: 1, up: 2 });
    F.shake(0.18);
    return dmg;
  }
  const dmg = ST.damageToPlayer(p, s, raw);
  p.hp -= dmg;
  F.text(P.x, 1.9, P.z, '-' + dmg, '#ff5a4a', 1.1);
  F.burst(P.x, 1.1, P.z, '#c94b3a', 6, { spread: 1.2, up: 2.2 });
  F.shake(0.3 + Math.min(0.5, dmg * 0.004));
  P.hurtT = 0.35;
  if (!P.buffs.rage && !e?.knock) { P.state = 'hurt'; P.prog = 0; }
  if (s.thorns > 0 && e) E.damageEnemy(e, s.thorns, {});
  return dmg;
}

// ---------- roll ----------
export function doRoll(input) {
  if (!P || P.dead || P.state === 'roll') return false;
  const p = S.player, s = p.stats;
  const cost = P.buffs.freeRoll ? 0 : 16;
  if (p.stamina < cost) return false;
  p.stamina -= cost;
  const yaw = (input.mx || input.mz) ? U.heading(input.mx, input.mz) : P.facing;
  P.state = 'roll';
  P.rollT = 0;
  P.startX = P.x; P.startZ = P.z;
  P.rollDx = Math.sin(yaw); P.rollDz = Math.cos(yaw);
  P.invuln = 0.34;
  P.rig.root.position.x = P.x; P.rig.root.position.z = P.z;
  P.rig.root.rotation.y = yaw;
  F.burst(P.x, 0.4, P.z, '#d8d0c0', 6, { spread: 1.4, up: 1.2, size: 0.12 });
  return true;
}

// ---------- skills ----------
export function useSkill(id, input) {
  const p = S.player, s = p.stats;
  const rank = p.skillRanks?.[id] || 1;
  const cd = S.player.cooldowns[id] || 0;
  if (cd > 0) return false;
  const def = C.SKILLS[p.cls].find((x) => x.id === id);
  if (!def) return false;
  if ((p.level < def.unlock) || rank <= 0) return false;
  const cost = def.cost || {};
  const reduce = P.buffs.rage ? 0.5 : 1;
  if (cost.stam && p.stamina < cost.stam * reduce) return false;
  if (cost.mana && p.mana < cost.mana) return false;
  p.stamina -= (cost.stam || 0) * reduce;
  p.mana -= cost.mana || 0;
  P.manaRegenDelay = Math.max(P.manaRegenDelay, cost.mana ? 0.8 : 0);
  P.staminaRegenDelay = Math.max(P.staminaRegenDelay, cost.stam ? 0.6 : 0);
  S.player.cooldowns[id] = def.cd * (P.buffs.cdr ? 0.75 : 1);
  const yaw = aimYaw(input);
  P.facing = yaw;
  const ok = SKILL[id](p, s, rank, yaw, input);
  if (ok) { P.state = 'cast'; P.castT = 0; P.castDur = 0.42; }
  return ok;
}

export const SKILL = {};
SKILL.cleave = (p, s, rank, yaw) => {
  F.slash(P.x + Math.sin(yaw) * 1.6, 1.1, P.z + Math.cos(yaw) * 1.6, yaw, 3.4, '#f0e6c8', 0.22);
  F.ring(P.x, P.z, 3.4, '#f0e6c8', 0.25, { growTo: 3.6 });
  const n = resolveAttack(3.2 + rank * 0.3, 2.4 + rank * 0.3, yaw, 1.15 + rank * 0.12);
  if (!n) F.shake(0.1);
  return true;
};
SKILL.whirlwind = (p, s, rank) => {
  F.ring(P.x, P.z, 3.6, '#f4e8c0', 0.35, { growTo: 3.8 });
  const n = resolveAttack(3.6 + rank * 0.3, Math.PI * 2, P.facing, 0.95 + rank * 0.1);
  if (n) { p.stamina = Math.min(s.maxStamina, p.stamina + 8 * n); }
  return true;
};
SKILL.leap = (p, s, rank, yaw, input) => {
  const g = U.screenToGround(input.aimX, input.aimY, 0);
  if (!g) return false;
  const d = Math.min(14, U.d2(P.x, P.z, g[0], g[1]));
  const [dx, dz] = U.norm2(g[0] - P.x, g[1] - P.z);
  const tx = P.x + dx * d, tz = P.z + dz * d;
  const out = U.resolveCircle(tx, tz, P.r, S.solidRef, S.tmp.ppos || (S.tmp.ppos = {}));
  P.x = out.x; P.z = out.z;
  F.ring(P.x, P.z, 4.2, '#ffb04a', 0.4, { growTo: 4.6 });
  F.shake(0.7);
  for (const e of S.enemies) {
    if (e.dead) continue;
    const dd = U.d2(P.x, P.z, e.x, e.z);
    if (dd < 4.4) {
      const a = U.heading(e.x - P.x, e.z - P.z);
      E.damageEnemy(e, Math.round(ST.attackPower(p, s) * (0.9 + rank * 0.18)), { stagger: 1.1 + rank * 0.2, knock: [Math.sin(a) * 2.2, Math.cos(a) * 2.2] });
      F.text(e.x, 2.0, e.z, 'STUN', '#ffd23a', 0.9);
    }
  }
  F.burst(P.x, 0.6, P.z, '#ffb04a', 18, { spread: 4, up: 3 });
  return true;
};
SKILL.shieldwall = (p, s, rank) => {
  P.buffs.wall = 6 + rank;
  P.buffs.blockBoost = 1;
  F.ring(P.x, P.z, 2.4, '#8fd0ff', 0.5, { growTo: 2.6 });
  return true;
};
SKILL.execute = (p, s, rank, yaw) => {
  let best = null, bd = 99;
  for (const e of S.enemies) {
    if (e.dead) continue;
    const d = U.d2(P.x, P.z, e.x, e.z);
    if (d > 3.4) continue;
    const a = U.heading(e.x - P.x, e.z - P.z);
    if (Math.abs(U.angleDelta(yaw, a)) > 1.2) continue;
    if (e.hp / e.hpMax < 0.35) { if (!best || e.hp < best.hp) best = e; }
  }
  if (!best) { resolveAttack(3.2, 1.6, yaw, 0.8); return true; }
  const dmg = Math.round(ST.attackPower(p, s) * (2.2 + rank * 0.5));
  F.slash(best.x, 1.3, best.z, yaw, 3, '#ff5a4a', 0.25);
  E.damageEnemy(best, dmg, { stagger: 0.5 });
  F.text(best.x, 2.2, best.z, 'EXECUTE', '#ff5a4a', 1.2);
  F.shake(0.6);
  return true;
};
SKILL.berserker = (p, s, rank) => {
  P.buffs.rage = 10 + rank * 2;
  P.buffs.speed = 1.18;
  F.ring(P.x, P.z, 2.2, '#ff4a3a', 0.4, { growTo: 3 });
  for (const k in S.player.cooldowns) S.player.cooldowns[k] *= 0.5;
  return true;
};
SKILL.volley = (p, s, rank, yaw) => {
  const n = 3 + rank;
  for (let i = 0; i < n; i++) {
    const a = yaw + (i - (n - 1) / 2) * 0.16;
    shoot(Math.sin(a), Math.cos(a), 16 + rank * 2, 0.7 + rank * 0.2, '#e8e0c0');
  }
  return true;
};
SKILL.rapidfire = (p, s, rank) => { P.buffs.rapid = 8 + rank * 2; F.ring(P.x, P.z, 2, '#dfe6a0', 0.35, { growTo: 2.4 }); return true; };
SKILL.rollingstrike = (p, s, rank, yaw) => {
  const d = 9 + rank;
  P.state = 'roll'; P.rollT = 0; P.startX = P.x; P.startZ = P.z;
  P.rollDx = Math.sin(yaw); P.rollDz = Math.cos(yaw); P.rollDist = d;
  P.invuln = 0.5;
  for (const e of S.enemies) {
    if (e.dead) continue;
    const along = U.dot2(e.x - P.x, e.z - P.z, Math.sin(yaw), Math.cos(yaw));
    if (along < -1 || along > d + 1) continue;
    const perp = Math.abs(U.cross2(e.x - P.x, e.z - P.z, Math.sin(yaw), Math.cos(yaw)));
    if (perp > 1.6 + e.r) continue;
    E.damageEnemy(e, Math.round(ST.attackPower(p, s) * (1.1 + rank * 0.2)), { stagger: 0.3, knock: [Math.sin(yaw) * 1.2, Math.cos(yaw) * 1.2] });
    F.text(e.x, 2, e.z, 'BLEED', '#c94b3a', 0.9);
  }
  F.slash(P.x + Math.sin(yaw) * 4, 1, P.z + Math.cos(yaw) * 4, yaw, 9, '#f4f0d0', 0.3);
  return true;
};
SKILL.snare = (p, s, rank, yaw, input) => {
  const g = U.screenToGround(input.aimX, input.aimY, 0);
  if (!g) return false;
  const d = Math.min(9, U.d2(P.x, P.z, g[0], g[1]));
  const [dx, dz] = U.norm2(g[0] - P.x, g[1] - P.z);
  const tx = P.x + dx * d, tz = P.z + dz * d;
  S.traps.push({ x: tx, z: tz, r: 1.2, kind: 'snare', ttl: 22, rank, armed: true });
  F.ring(tx, tz, 1.2, '#c9a24a', 0.5, { growTo: 1.3 });
  return true;
};
SKILL.explosive = (p, s, rank, yaw, input) => {
  const g = U.screenToGround(input.aimX, input.aimY, 0);
  if (!g) return false;
  const d = Math.min(11, U.d2(P.x, P.z, g[0], g[1]));
  const [dx, dz] = U.norm2(g[0] - P.x, g[1] - P.z);
  const tx = P.x + dx * d, tz = P.z + dz * d;
  S.traps.push({ x: tx, z: tz, r: 3.4, kind: 'boom', ttl: 22, rank, armed: true });
  F.ring(tx, tz, 1.0, '#ff8a2a', 0.5, { growTo: 1.1 });
  return true;
};
SKILL.evasion = (p, s, rank) => { P.buffs.evasion = 8 + rank * 2; P.buffs.speed = 1.25; P.buffs.freeRoll = 8 + rank * 2; F.ring(P.x, P.z, 2, '#a0e0a0', 0.4, { growTo: 2.6 }); return true; };
SKILL.fireball = (p, s, rank, yaw) => {
  shoot(Math.sin(yaw), Math.cos(yaw), 18, 2.0 + rank * 0.4, '#ff7a2a', { boom: 2.6 + rank * 0.4, burn: true });
  return true;
};
SKILL.frostbolt = (p, s, rank, yaw) => {
  shoot(Math.sin(yaw), Math.cos(yaw), 20, 1.4 + rank * 0.3, '#7ad6ff', { slow: 0.5 + rank * 0.08 });
  return true;
};
SKILL.chainlight = (p, s, rank) => {
  let targets = [];
  for (const e of S.enemies) { if (!e.dead && U.d2(P.x, P.z, e.x, e.z) < 14) targets.push(e); }
  targets.sort((a, b) => U.d2sq(P.x, P.z, a.x, a.z) - U.d2sq(P.x, P.z, b.x, b.z));
  targets = targets.slice(0, 3 + rank);
  let px = P.x, pz = P.z;
  for (const t of targets) {
    F.slash((px + t.x) / 2, 1.4, (pz + t.z) / 2, U.heading(t.x - px, t.z - pz), U.d2(px, pz, t.x, t.z), '#bfe8ff', 0.18);
    E.damageEnemy(t, Math.round(ST.attackPower(p, s) * (0.75 + rank * 0.16)), { stagger: 0.25 });
    F.text(t.x, 2, t.z, Math.round(ST.attackPower(p, s) * (0.75 + rank * 0.16)), '#bfe8ff', 0.9);
    F.burst(t.x, 1.2, t.z, '#bfe8ff', 8, { spread: 1.2, up: 2 });
    px = t.x; pz = t.z;
  }
  F.shake(0.3);
  return targets.length > 0;
};
SKILL.blink = (p, s, rank, yaw, input) => {
  const g = U.screenToGround(input.aimX, input.aimY, 0);
  if (!g) return false;
  const d = Math.min(12, U.d2(P.x, P.z, g[0], g[1]));
  const [dx, dz] = U.norm2(g[0] - P.x, g[1] - P.z);
  const out = U.resolveCircle(P.x + dx * d, P.z + dz * d, P.r, S.solidRef, S.tmp.ppos || (S.tmp.ppos = {}));
  F.burst(P.x, 1, P.z, '#b080ff', 12, { spread: 1, up: 2 });
  P.x = out.x; P.z = out.z;
  P.invuln = 0.25;
  F.burst(P.x, 1, P.z, '#b080ff', 12, { spread: 1, up: 2 });
  return true;
};
SKILL.icewall = (p, s, rank, yaw, input) => {
  const g = U.screenToGround(input.aimX, input.aimY, 0);
  if (!g) return false;
  const d = Math.min(10, U.d2(P.x, P.z, g[0], g[1]));
  const [dx, dz] = U.norm2(g[0] - P.x, g[1] - P.z);
  const tx = P.x + dx * d, tz = P.z + dz * d;
  S.walls.push({ x: tx, z: tz, yaw, ttl: 8 + rank * 2, rank, hp: 60 + rank * 30 });
  F.ring(tx, tz, 3, '#9adfff', 0.6, { growTo: 3.2 });
  return true;
};
SKILL.arcaneburst = (p, s, rank) => {
  F.ring(P.x, P.z, 5.4, '#d8a0ff', 0.5, { growTo: 5.8 });
  F.shake(0.6);
  for (const e of S.enemies) {
    if (e.dead) continue;
    const d = U.d2(P.x, P.z, e.x, e.z);
    if (d > 5.6) continue;
    const a = U.heading(e.x - P.x, e.z - P.z);
    E.damageEnemy(e, Math.round(ST.attackPower(p, s) * (1.2 + rank * 0.25)), { stagger: 0.4, knock: [Math.sin(a) * 2.6, Math.cos(a) * 2.6] });
    F.text(e.x, 2, e.z, Math.round(ST.attackPower(p, s) * (1.2 + rank * 0.25)), '#d8a0ff', 0.9);
  }
  F.burst(P.x, 1, P.z, '#d8a0ff', 26, { spread: 5, up: 3 });
  return true;
};

// ---------- projectiles ----------
export function shoot(dx, dz, range, dmgMult, colorHex, opts) {
  S.projectiles.push({
    x: P.x, z: P.z, y: 1.2, dx, dz, speed: 26, ttl: range / 26,
    dmg: ST.attackPower(S.player, S.player.stats) * dmgMult,
    color: colorHex, opts, fromPlayer: true, r: 0.35,
  });
}

export function updateProjectiles(dt) {
  for (const pr of S.projectiles) {
    pr.ttl -= dt;
    pr.x += pr.dx * pr.speed * dt;
    pr.z += pr.dz * pr.speed * dt;
    if (pr.ttl <= 0) { pr.dead = true; continue; }
    if (S.solidRef(Math.floor(pr.x / S.cell), Math.floor(pr.z / S.cell))) {
      pr.dead = true;
      F.burst(pr.x, 1, pr.z, pr.color, 6, { spread: 1, up: 2 });
      continue;
    }
    if (pr.fromPlayer) {
      for (const e of S.enemies) {
        if (e.dead) continue;
        if (U.d2sq(pr.x, pr.z, e.x, e.z) < (e.r + pr.r) * (e.r + pr.r)) {
          pr.dead = true;
          const crit = S.rng.next() * 100 < S.player.stats.crit;
          const res = ST.rollDamage(pr.dmg, crit, S.player.stats.critMult, e.armor, S.player.level, 0.1, S.rng);
          E.damageEnemy(e, res.dmg, { stagger: 0.2 });
          F.text(e.x, 2, e.z, res.dmg, pr.color, 0.9);
          F.burst(pr.x, 1.1, pr.z, pr.color, 8, { spread: 1.2, up: 2 });
          if (pr.opts?.boom) explode(pr.x, pr.z, pr.opts.boom, pr.dmg * 0.6, pr.color);
          if (pr.opts?.slow) e.slowed = pr.opts.slow, e.slowT = 3;
          if (pr.opts?.burn) e.burn = 3 + S.player.level * 0.1, e.burnT = 4;
          break;
        }
      }
    } else {
      if (P && !P.dead && U.d2sq(pr.x, pr.z, P.x, P.z) < (P.r + pr.r) * (P.r + pr.r)) {
        pr.dead = true;
        playerTakeDamage(pr.dmg, null, {});
      }
    }
  }
  S.projectiles = S.projectiles.filter((x) => !x.dead);
}

export function explode(x, z, radius, dmg, colorHex) {
  F.ring(x, z, radius, colorHex, 0.35, { growTo: radius * 1.1 });
  F.burst(x, 0.8, z, colorHex, 16, { spread: radius, up: 3 });
  F.shake(0.4);
  for (const e of S.enemies) {
    if (e.dead) continue;
    if (U.d2(x, z, e.x, e.z) > radius + e.r) continue;
    E.damageEnemy(e, Math.round(dmg), { stagger: 0.2 });
    F.text(e.x, 2, e.z, Math.round(dmg), colorHex, 0.9);
  }
}

export const PL_EXPORTS = { newController, buildPlayerRig, updatePlayer, tryAttack, doRoll, setBlock, useSkill, resolveAttack, playerTakeDamage, shoot, updateProjectiles, explode, SKILL, aimYaw };

PL.newController = newController; PL.buildPlayerRig = buildPlayerRig; PL.updatePlayer = updatePlayer;
PL.tryAttack = tryAttack; PL.doRoll = doRoll; PL.setBlock = setBlock; PL.useSkill = useSkill;
PL.resolveAttack = resolveAttack; PL.playerTakeDamage = playerTakeDamage; PL.shoot = shoot;
PL.updateProjectiles = updateProjectiles; PL.explode = explode; PL.aimYaw = aimYaw; PL.SKILL = SKILL;
PL.flashPlayer = flashPlayer;
Object.defineProperty(PL, 'P', { get: () => P, configurable: true });
