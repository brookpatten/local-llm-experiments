// Stat model, XP curve, damage math. Pure logic - unit-testable in node.
export const STATS = {};

// ---------- XP ----------
export function xpForLevel(level) { // xp needed to go from `level` to level+1
  return Math.round(45 * level * level + 95 * level);
}
export const MAX_LEVEL = 30;

// ---------- attribute -> derived ----------
export function derive(p) {
  const a = p.attr, g = p.gearBonus, lv = p.level;
  const s = {};
  s.str = a.str + g.str; s.dex = a.dex + g.dex; s.int = a.int + g.int; s.vit = a.vit + g.vit;
  s.maxHp = Math.round(45 + s.vit * 9 + lv * 7 + g.hp);
  s.maxStamina = Math.round(55 + s.vit * 2 + lv * 4 + g.stam);
  s.maxMana = Math.round(18 + s.int * 7 + lv * 3 + g.mana);
  s.armor = Math.round(gearArmor(p)) + lv * 2;
  s.armorTotal = s.armor;
  s.dodge = Math.min(45, s.dex * 0.28 + g.dodge);
  s.crit = Math.min(75, 3 + s.dex * 0.35 + g.crit);
  s.critMult = 1.5 + g.critMult;
  s.block = g.block;
  s.parryWindow = 0.26 + g.parryWindow;
  s.moveSpeed = 1 + g.speed;
  s.lifesteal = g.lifesteal;
  s.manaRegen = 1.2 + s.int * 0.06 + g.manaRegen;
  s.staminaRegen = 6 + s.vit * 0.05 + g.stamRegen;
  s.hpRegen = 0.6 + s.vit * 0.02 + g.hpRegen;
  s.thorns = g.thorns;
  s.goldFind = g.goldFind;
  s.magicFind = g.magicFind;
  s.skillPower = 1 + g.skillPower;
  return s;
}

// ---------- damage ----------
export function weaponDamage(p) {
  const w = p.weapon;
  if (!w) return 4 + p.attr.str * 0.35;
  return w.dmg;
}
export function attackPower(p, s) {
  const base = weaponDamage(p);
  const classScale = p.cls === 'mage' ? 0.35 : p.cls === 'ranger' ? 0.75 : 1.0;
  const attrScale = p.cls === 'mage' ? s.int : p.cls === 'ranger' ? s.dex : s.str;
  return base * classScale * (1 + attrScale * 0.012) * s.skillPower + p.flatDamage;
}
export function armorReduce(armor, attackerLevel) {
  const k = 70 + attackerLevel * 9;
  return clamp01local(armor / (armor + k));
}
function clamp01local(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

export function rollDamage(base, crit, critMult, targetArmor, attackerLevel, variance = 0.12, rng) {
  const dmg = base * (1 + (rng ? rng.next() * variance * 2 - variance : 0));
  const red = armorReduce(targetArmor, attackerLevel);
  const c = crit ? critMult : 1;
  return { dmg: Math.max(1, Math.round(dmg * (1 - red) * c)), crit };
}

// enemy -> player damage
export function enemyAttackPower(e, level) {
  return e.dmg * (1 + level * 0.09);
}
export function damageToPlayer(p, s, raw, ignoreArmor = false) {
  const red = ignoreArmor ? 0 : armorReduce(s.armorTotal, p.level);
  let dmg = raw * (1 - red);
  return Math.max(1, Math.round(dmg));
}

// ---------- healing / resources ----------
export function heal(p, s, amount) {
  const before = p.hp;
  p.hp = Math.min(s.maxHp, p.hp + Math.round(amount));
  return p.hp - before;
}

// ---------- level ups ----------
export function grantXp(p, amount) {
  let gained = 0;
  p.xp += amount; gained += amount;
  const events = [];
  while (p.level < MAX_LEVEL && p.xp >= xpForLevel(p.level)) {
    p.xp -= xpForLevel(p.level);
    p.level++;
    p.attrPoints += 5;
    p.skillPoints += 1;
    events.push(p.level);
  }
  return { leveled: events, xpGained: gained };
}

// ---------- gear bonus aggregation ----------
export function gearArmor(p) {
  let v = 0;
  for (const slot of Object.keys(p.equip)) { const it = p.equip[slot]; if (it && it.armor) v += it.armor; }
  return v;
}

export const EMPTY_BONUS = { str: 0, dex: 0, int: 0, vit: 0, hp: 0, stam: 0, mana: 0, armor: 0, crit: 0, critMult: 0, dodge: 0, speed: 0, lifesteal: 0, manaRegen: 0, stamRegen: 0, hpRegen: 0, thorns: 0, goldFind: 0, magicFind: 0, block: 0, parryWindow: 0, skillPower: 0, fireDamage: 0, frostDamage: 0, shockDamage: 0 };

export function newPlayer(cls) {
  const base = {
    warrior: { str: 12, dex: 6, int: 3, vit: 12 },
    ranger: { str: 7, dex: 13, int: 5, vit: 9 },
    mage: { str: 4, dex: 7, int: 13, vit: 7 },
  }[cls];
  return {
    cls, level: 1, xp: 0, attr: { ...base }, attrPoints: 0, skillPoints: 2,
    hp: 1, stamina: 1, mana: 1,
    equip: { head: null, chest: null, legs: null, feet: null, hands: null, mainHand: null, offHand: null, ring: null, amulet: null },
    bag: [], gold: 60,
    gearBonus: { ...EMPTY_BONUS },
    flatDamage: 0,
    cooldowns: {},
    kills: 0, deaths: 0,
  };
}

export function recomputeGear(p) {
  const b = { ...EMPTY_BONUS };
  for (const slot in p.equip) {
    const it = p.equip[slot];
    if (!it) continue;
    for (const k in b) if (it.bonus && it.bonus[k]) b[k] += it.bonus[k];
    if (it.block) b.block = Math.min(0.85, b.block + it.block);
  }
  p.gearBonus = b;
  p.weapon = p.equip.mainHand || null;
  p.mainHand = p.equip.mainHand || null;
  p.offHand = p.equip.offHand || null;
  return b;
}

export function recalcStats(p) {
  p.stats = derive(p);
  p.hp = Math.min(p.hp, p.stats.maxHp);
  p.stamina = Math.min(p.stamina, p.stats.maxStamina);
  p.mana = Math.min(p.mana, p.stats.maxMana);
  return p.stats;
}

export const STATS_EXPORTS = { xpForLevel, derive, gearArmor, grantXp, newPlayer, recomputeGear, recalcStats, rollDamage, damageToPlayer, weaponDamage, attackPower, armorReduce, enemyAttackPower, heal, MAX_LEVEL, EMPTY_BONUS };

STATS.xpForLevel = xpForLevel; STATS.derive = derive; STATS.gearArmor = gearArmor; STATS.grantXp = grantXp; STATS.newPlayer = newPlayer; STATS.recomputeGear = recomputeGear; STATS.recalcStats = recalcStats; STATS.rollDamage = rollDamage; STATS.damageToPlayer = damageToPlayer; STATS.weaponDamage = weaponDamage; STATS.attackPower = attackPower; STATS.armorReduce = armorReduce; STATS.enemyAttackPower = enemyAttackPower; STATS.heal = heal; STATS.MAX_LEVEL = MAX_LEVEL; STATS.EMPTY_BONUS = EMPTY_BONUS;
