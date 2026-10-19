// Enemy roster, rigs, AI, telegraphed attacks.
import { S } from './state.js';
import { U } from './util.js';
import { R } from './rig.js';
import { F } from './fx.js';

const B = window.BABYLON;
export const EN = {};

export const KINDS = {
  goblin: {
    hp: 26, dmg: 7, armor: 8, speed: 2.9, r: 0.55, scale: 0.82, range: 1.9, windup: 0.55, recover: 0.5,
    color: '#6d8f4a', accent: '#8a5a34', weapon: 'sword', shield: false,
    ai: 'skirmish', xp: 14, arc: 1.5, lunge: 0,
    name: 'Goblin',
  },
  rat: {
    hp: 12, dmg: 4, armor: 3, speed: 3.6, r: 0.42, scale: 0.6, range: 1.5, windup: 0.35, recover: 0.35,
    color: '#7a6a5c', accent: '#4a3f38', quad: true, ai: 'swarm', xp: 7, arc: 1.2, lunge: 0,
    name: 'Plague Rat',
  },
  wolf: {
    hp: 34, dmg: 10, armor: 10, speed: 3.9, r: 0.6, scale: 1.0, range: 2.1, windup: 0.42, recover: 0.6,
    color: '#7d8590', accent: '#3c4048', quad: true, ai: 'lunge', xp: 22, arc: 1.1, lunge: 5.5,
    name: 'Grey Wolf',
  },
  skeleton: {
    hp: 40, dmg: 11, armor: 16, speed: 2.6, r: 0.58, scale: 1.0, range: 2.1, windup: 0.7, recover: 0.62,
    color: '#c9c4b2', accent: '#5a4a3a', weapon: 'sword', shield: true, ai: 'defender', xp: 26, arc: 1.6, lunge: 0,
    name: 'Rattlebone',
  },
  cultist: {
    hp: 36, dmg: 13, armor: 10, speed: 2.2, r: 0.6, scale: 1.02, range: 12, windup: 0.85, recover: 0.9,
    color: '#6a3f7a', accent: '#c0a63a', weapon: 'wand', ai: 'caster', xp: 30, arc: 0.6, lunge: 0, projectile: 'ember',
    name: 'Hooded Cultist',
  },
  golem: {
    hp: 95, dmg: 20, armor: 30, speed: 1.7, r: 0.95, scale: 1.55, range: 3.0, windup: 1.15, recover: 1.0,
    color: '#6b6560', accent: '#3f5a3a', weapon: 'none', ai: 'brute', xp: 60, arc: 2.2, lunge: 0, knock: 1,
    name: 'Stone Golem',
  },
  ogre: {
    hp: 320, dmg: 24, armor: 34, speed: 2.3, r: 1.15, scale: 1.8, range: 3.4, windup: 0.95, recover: 0.9,
    color: '#8a7a4a', accent: '#a03a2a', weapon: 'axe', ai: 'boss_ogre', xp: 420, arc: 2.6, lunge: 0, boss: true,
    name: 'Ogre',
  },
  choir: {
    hp: 420, dmg: 22, armor: 40, speed: 2.1, r: 1.0, scale: 1.7, range: 14, windup: 1.0, recover: 1.0,
    color: '#3f7a8a', accent: '#9ad6e0', weapon: 'staff', ai: 'boss_choir', xp: 620, arc: 1.0, lunge: 0, boss: true, projectile: 'frost',
    name: 'Drowned Choir',
  },
  cinderlord: {
    hp: 620, dmg: 30, armor: 60, speed: 2.4, r: 1.1, scale: 1.9, range: 3.6, windup: 0.9, recover: 0.85,
    color: '#8a3a2a', accent: '#ff8a2a', weapon: 'spear', ai: 'boss_cinder', xp: 900, arc: 2.8, lunge: 0, boss: true,
    name: 'Cinderlord',
  },
  final: {
    hp: 950, dmg: 36, armor: 80, speed: 2.6, r: 1.2, scale: 2.15, range: 4.0, windup: 0.85, recover: 0.8,
    color: '#5a2a3a', accent: '#ffb02a', weapon: 'spear', ai: 'boss_final', xp: 1800, arc: 3.0, lunge: 0, boss: true,
    name: 'The Cinderlord',
  },
  guard: {
    hp: 60, dmg: 12, armor: 22, speed: 2.8, r: 0.6, scale: 1.0, range: 2.2, windup: 0.6, recover: 0.55,
    color: '#4a5a6a', accent: '#c9a24a', weapon: 'spear', shield: true, ai: 'defender', xp: 40, arc: 1.5, lunge: 0,
    name: 'Gate Guard',
  },
};

export function makeEnemy(z, kind, x, zz, il, boss) {
  const k = KINDS[kind];
  if (!k) return null;
  const lvl = Math.max(1, il);
  const hpScale = 1 + (lvl - 1) * 0.22;
  const dmgScale = 1 + (lvl - 1) * 0.16;
  const bossMul = boss ? 3.2 : 1;
  const name = z.id + '_en_' + Math.round(x * 10) + '_' + Math.round(zz * 10);
  let rig;
  const spec = { scale: k.scale, colors: { body: k.color, accent: k.accent, skin: k.color, metal: '#8b939d', trim: k.accent }, weapon: k.weapon, shield: k.shield, gem: k.color };
  if (k.quad) rig = R.buildQuadruped(S.scene, name, spec);
  else rig = R.buildHumanoid(S.scene, name, spec);
  rig.root.position = new B.Vector3(x, 0, zz);
  const e = {
    kind, name: k.name, rig, root: rig.root,
    quad: !!k.quad,
    x, z: zz, y: 0, r: k.r * k.scale,
    hp: Math.round(k.hp * hpScale * bossMul), hpMax: Math.round(k.hp * hpScale * bossMul),
    dmg: k.dmg * dmgScale * (boss ? 1.35 : 1), armor: k.armor + lvl * 2 + (boss ? 12 : 0), level: lvl,
    speed: k.speed * (boss ? 1.08 : 1), range: k.range + (boss ? 0.35 : 0), windup: k.windup, recover: k.recover, arc: k.arc,
    state: 'idle', t: 0, prog: 0, facing: 0, cooldown: 0, stagger: 0, dead: false,
    xp: Math.round(k.xp * (1 + lvl * 0.12) * (boss ? 5 : 1)),
    boss: !!boss, label: boss ? (z.def.boss?.name || k.name) : k.name,
    ai: k.ai, projectile: k.projectile, knock: k.knock || 0,
    telegraph: null, hitFlash: 0, blocking: k.shield || k.ai === 'defender', blockT: 0,
    summonCd: 0, phase: 0,
    hpBar: null,
  };
  return e;
}

export function updateEnemy(e, dt, px, pz) {
  if (e.dead) return;
  const dist = U.d2(e.x, e.z, px, pz);
  const toPlayer = U.heading(px - e.x, pz - e.z);
  e.t += dt;
  e.cooldown = Math.max(0, e.cooldown - dt);
  e.blockT = Math.max(0, e.blockT - dt);

  if (e.stagger > 0) {
    e.stagger -= dt;
    e.state = 'hurt';
    e.prog = U.approach(e.prog, 1, dt * 4);
    setAnim(e, 'hurt', e.prog);
    return;
  }
  e.prog = 0;

  switch (e.state) {
    case 'idle':
    case 'approach': {
      setAnim(e, dist < e.range * 1.6 ? 'idle' : 'walk', 0);
      const want = e.range * 0.85;
      if (dist > want) {
        move(e, dt, px, pz);
        e.state = 'approach';
      } else {
        e.state = 'windup';
        e.prog = 0;
        e.telegraph = F.ring(e.x, e.z, e.range * 0.9, e.boss ? '#ff3a2a' : '#ff5a3a', e.windup, { growTo: e.range * 1.05 });
      }
      break;
    }
    case 'windup': {
      e.prog = Math.min(1, e.prog + dt / e.windup);
      setAnim(e, 'attack', e.prog * 0.45);
      if (e.prog >= 1) { e.state = 'strike'; e.prog = 0; }
      break;
    }
    case 'strike': {
      e.prog = Math.min(1, e.prog + dt / 0.16);
      setAnim(e, 'attack', 0.45 + 0.3 * e.prog);
      if (!e.struck && e.prog > 0.3) {
        e.struck = true;
        e.onStrike && e.onStrike(e);
      }
      if (e.prog >= 1) { e.state = 'recover'; e.prog = 0; e.struck = false; }
      break;
    }
    case 'recover': {
      e.prog = Math.min(1, e.prog + dt / e.recover);
      setAnim(e, 'idle', 0);
      if (e.prog >= 1) { e.state = 'idle'; e.cooldown = 0.5 + Math.random() * 0.7; }
      break;
    }
    case 'cast': {
      e.prog = Math.min(1, e.prog + dt / e.windup);
      setAnim(e, 'cast', e.prog);
      if (e.prog >= 1 && !e.castDone) { e.castDone = true; e.onCast && e.onCast(e); }
      if (e.prog >= 1.4) { e.state = 'idle'; e.castDone = false; e.cooldown = 1.2; }
      break;
    }
    case 'retreat': {
      e.prog += dt;
      moveAway(e, dt, px, pz);
      setAnim(e, 'run', 0);
      if (e.prog > 0.7) { e.state = 'idle'; e.prog = 0; }
      break;
    }
    default: e.state = 'idle';
  }
  e.root.position.x = e.x; e.root.position.z = e.z;
  e.root.rotation.y = e.facing;
}

export function setFacing(e, px, pz) { e.facing = U.heading(px - e.x, pz - e.z); }

export function move(e, dt, tx, tz) {
  const [dx, dz] = U.norm2(tx - e.x, tz - e.z);
  const step = e.speed * dt;
  const nx = e.x + dx * step, nz = e.z + dz * step;
  const out = U.resolveCircle(nx, nz, e.r, S.solidRef, S.tmp.enemyPos || (S.tmp.enemyPos = {}));
  e.x = out.x; e.z = out.z;
  e.facing = U.heading(dx, dz);
}

export function moveAway(e, dt, tx, tz) {
  const [dx, dz] = U.norm2(e.x - tx, e.z - tz);
  const nx = e.x + dx * e.speed * dt, nz = e.z + dz * e.speed * dt;
  const out = U.resolveCircle(nx, nz, e.r, S.solidRef, S.tmp.enemyPos || (S.tmp.enemyPos = {}));
  e.x = out.x; e.z = out.z;
  e.facing = U.heading(tx - e.x, tz - e.z);
}

export function setAnim(e, act, prog) {
  if (e.quad) R.poseQuadruped(e.rig, e.t, e.speed, act, prog);
  else R.pose(e.rig, act, prog, { t: e.t });
}

export function damageEnemy(e, amount, opts) {
  if (e.dead) return 0;
  e.hp -= amount;
  e.hitFlash = 0.14;
  if (opts?.stagger) e.stagger = Math.max(e.stagger, opts.stagger);
  if (opts?.knock) {
    const [dx, dz] = opts.knock;
    const out = U.resolveCircle(e.x + dx, e.z + dz, e.r, S.solidRef, S.tmp.knock || (S.tmp.knock = {}));
    e.x = out.x; e.z = out.z;
  }
  if (e.hp <= 0) killEnemy(e, opts?.byPlayer);
  return amount;
}

export function killEnemy(e, byPlayer) {
  e.dead = true;
  e.state = 'die';
  e.prog = 0;
  e.deathT = 0;
  F.burst(e.x, 0.9, e.z, e.boss ? '#ff8a2a' : '#c94b3a', e.boss ? 26 : 12, { spread: e.boss ? 4 : 2, up: 3 });
  if (e.rig) {
    for (const m of e.rig.mats) {
      m.emissiveColor = new B.Color3(0.05, 0.05, 0.05);
    }
  }
}

export function flashEnemy(e) {
  if (!e.rig) return;
  if (e.hitFlash > 0) {
    e.hitFlash -= S.dt;
    for (const m of e.rig.mats) m.emissiveColor = new B.Color3(0.7, 0.7, 0.7);
  } else if (e.dead) {
    for (const m of e.rig.mats) m.emissiveColor = new B.Color3(0.02, 0.02, 0.02);
  } else {
    for (const m of e.rig.mats) m.emissiveColor = new B.Color3(0, 0, 0);
  }
}

export function updateCorpse(e, dt) {
  if (!e.dead) return;
  e.deathT += dt;
  e.prog = Math.min(1, e.prog + dt * 1.6);
  setAnim(e, 'die', e.prog);
  if (e.deathT > 2.2) e.gone = true;
}

export const E = { KINDS, makeEnemy, updateEnemy, damageEnemy, killEnemy, setAnim, setFacing, move, moveAway, flashEnemy, updateCorpse };
