// Level, attribute and equipment-derived stats.
import { itemStats, canEquip } from '../data/items.js';
import { SKILLS } from '../data/skills.js';
import { CLASSES, startingKit } from '../data/classes.js';
import { clamp } from '../core/math.js';

export const MAX_LEVEL = 40;
export const POINTS_PER_LEVEL = 5;
export const SKILL_POINTS_PER_LEVEL = 1;

export function xpToNext(level) {
  return Math.round(60 * Math.pow(level, 1.75) + 40 * level);
}

export function newCharacter(classId) {
  const c = CLASSES[classId];
  return {
    classId,
    className: c.name,
    level: 1,
    xp: 0,
    attrs: { ...c.base },
    freeAttrs: 0,
    freeSkills: 1,
    skills: {},
    equipment: startingKit(classId),
    inventory: [],
    belt: [{ id: 'hp', count: 3 }, { id: 'mp', count: 2 }, null, null, null],
    gold: 120,
    stats: {},
  };
}

// Aggregate passives from the skill grid.
export function passiveMods(p) {
  const out = {};
  for (const id in p.skills) {
    const rank = p.skills[id];
    if (!rank) continue;
    const s = SKILLS[id];
    if (!s || s.kind !== 'passive') continue;
    for (const k in s.passive) out[k] = (out[k] || 0) + s.passive[k] * rank;
  }
  return out;
}

export function gearMods(p) {
  const out = {};
  let armor = 0, block = 0, dmgMin = 0, dmgMax = 0, speed = 0, weaponType = null;
  for (const slot in p.equipment) {
    const it = p.equipment[slot];
    if (!it) continue;
    const s = itemStats(it);
    armor += s.armor;
    block += s.block;
    if (it.weapon) { dmgMin += s.dmgMin; dmgMax += s.dmgMax; speed = s.speed; weaponType = it.weapon.type; }
    for (const k in s.mods) out[k] = (out[k] || 0) + s.mods[k];
  }
  return { armor, block, dmgMin, dmgMax, speed, weaponType, mods: out };
}

export function recompute(p, buffs = []) {
  const cls = CLASSES[p.classId];
  const g = gearMods(p);
  const ps = passiveMods(p);
  const buff = {};
  for (const b of buffs) for (const k in b.mods) buff[k] = (buff[k] || 0) + b.mods[k];

  const add = (k) => (g.mods[k] || 0) + (ps[k] || 0) + (buff[k] || 0);

  const str = p.attrs.str, dex = p.attrs.dex, int = p.attrs.int, vit = p.attrs.vit;

  const mainAttr = p.classId === 'warrior' ? str : p.classId === 'ranger' ? dex : int;

  const stats = {};
  stats.maxHp = Math.round(45 + vit * 6 + p.level * 9 + add('hp') + (ps.hp || 0) * 0);
  stats.maxMana = Math.round(25 + int * 4 + p.level * 4 + add('mana'));
  stats.maxStamina = Math.round(70 + vit * 2 + add('stamina'));
  stats.hpRegen = 1 + vit * 0.06 + add('hpRegen') * 0.35;
  stats.manaRegen = 1.2 + int * 0.10 + add('manaRegen');
  stats.staminaRegen = 9 + vit * 0.12 + add('staminaRegen');

  stats.armorBase = g.armor;
  stats.armor = Math.round(g.armor * (1 + (add('armorPct')) / 100));
  stats.blockChance = clamp(g.block + add('block'), 0, 75);
  stats.canBlock = !!p.equipment.offHand;

  stats.dmgMin = g.dmgMin;
  stats.dmgMax = g.dmgMax;
  stats.weaponType = g.weaponType;
  stats.weaponSpeed = g.speed || 1.2;
  stats.attrBonus = 1 + (g.weaponType === 'bow' ? dex * 0.022 : g.weaponType === 'staff' ? int * 0.022 : (str * 0.016 + dex * 0.006));
  const dmgPctAll = add('dmgPct') + (ps.dmgPct || 0);
  stats.dmgMin = Math.round(stats.dmgMin * stats.attrBonus * (1 + dmgPctAll / 100));
  stats.dmgMax = Math.round(stats.dmgMax * stats.attrBonus * (1 + dmgPctAll / 100));
  stats.attackRate = stats.weaponSpeed * (1 + add('atkSpeed') / 100);
  stats.crit = clamp(5 + dex * 0.35 + add('crit'), 0, 85);
  stats.critMult = 2 + mainAttr * 0.01;
  stats.dodge = clamp(add('dodge'), 0, 45);
  stats.lifeSteal = clamp(add('lifeSteal'), 0, 40);
  stats.thorns = add('thorns');
  stats.moveSpeed = 1 + add('moveSpeed') / 100;
  stats.xpGain = 1 + add('xp') / 100;
  stats.goldFind = 1 + add('goldFind') / 100;
  stats.spellPower = Math.round(6 + int * 0.75 + add('spellPower')) * (1 + (add('spellPct') + (ps.spellPct || 0)) / 100);
  stats.manaShield = clamp(add('manaShield'), 0, 75);
  stats.parryWindow = 0.26 + (ps.parryWindow || 0);
  stats.rollCost = 26 - (ps.rollCost || 0);
  stats.mainAttr = mainAttr;

  // damage taken modifier
  stats.dmgTakenMul = clamp(1 + add('dmgTaken') / 100, 0.25, 2);

  p.stats = stats;
  return stats;
}

export function armorReduction(armor, attackerLevel) {
  const eff = armor / (armor + 55 + 12 * attackerLevel);
  return clamp(eff, 0, 0.75);
}

export function gainXp(p, amount) {
  if (p.level >= MAX_LEVEL) return 0;
  let gained = 0;
  p.xp += Math.round(amount * (p.stats.xpGain || 1));
  let levels = 0;
  while (p.level < MAX_LEVEL && p.xp >= xpToNext(p.level)) {
    p.xp -= xpToNext(p.level);
    p.level++;
    p.freeAttrs += POINTS_PER_LEVEL;
    p.freeSkills += SKILL_POINTS_PER_LEVEL;
    levels++;
  }
  if (p.level >= MAX_LEVEL) p.xp = 0;
  gained = levels;
  recompute(p);
  return levels;
}

export function canLearn(p, skillId) {
  const s = SKILLS[skillId];
  if (!s) return { ok: false, why: 'unknown skill' };
  if (s.class !== p.classId) return { ok: false, why: 'not your class' };
  const rank = p.skills[skillId] || 0;
  if (rank >= s.maxRank) return { ok: false, why: 'mastered' };
  if (p.freeSkills <= 0) return { ok: false, why: 'no skill points' };
  const need = s.reqLevel[Math.min(rank, s.reqLevel.length - 1)];
  if (p.level < need) return { ok: false, why: `requires level ${need}` };
  return { ok: true };
}

export function learnSkill(p, skillId) {
  const c = canLearn(p, skillId);
  if (!c.ok) return c;
  p.skills[skillId] = (p.skills[skillId] || 0) + 1;
  p.freeSkills--;
  recompute(p);
  return { ok: true };
}

export function spendAttr(p, attr) {
  if (p.freeAttrs <= 0) return { ok: false };
  p.attrs[attr]++;
  p.freeAttrs--;
  recompute(p);
  return { ok: true };
}

export function equipItem(p, item, log) {
  const ce = canEquip(item, p);
  if (!ce.ok) return ce;
  const slot = item.slot;
  const prev = p.equipment[slot] || null;
  p.equipment[slot] = item;
  const i = p.inventory.indexOf(item);
  if (i >= 0) p.inventory.splice(i, 1);
  if (prev) p.inventory.push(prev);
  recompute(p);
  return { ok: true, swapped: prev };
}

export function unequipItem(p, slot) {
  const it = p.equipment[slot];
  if (!it) return { ok: false };
  p.equipment[slot] = null;
  p.inventory.push(it);
  recompute(p);
  return { ok: true };
}
