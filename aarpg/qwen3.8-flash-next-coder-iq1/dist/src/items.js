// Item tables + stat-appropriate loot generation.
import { U } from './util.js';
import { STATS } from './stats.js';

export const ITEMS = {};

export const SLOTS = ['head', 'chest', 'legs', 'feet', 'hands', 'mainHand', 'offHand', 'ring', 'amulet'];

export const RARITY = [
  { id: 'common', name: 'Common', color: '#c9c9c9', affixes: 0, weight: 46, mult: 1.0 },
  { id: 'uncommon', name: 'Uncommon', color: '#63cf5e', affixes: 1, weight: 27, mult: 1.15 },
  { id: 'rare', name: 'Rare', color: '#3aa6ff', affixes: 2, weight: 16, mult: 1.35 },
  { id: 'epic', name: 'Epic', color: '#b553e0', affixes: 3, weight: 8.5, mult: 1.6 },
  { id: 'legendary', name: 'Legendary', color: '#ff9b2e', affixes: 4, weight: 2.5, mult: 1.95 },
];

// Base item templates. `t` = tier band (1..4) roughly gating where they appear.
export const BASES = {
  head: [
    { n: 'Leather Cap', t: 1, armor: 6, cls: null },
    { n: 'Iron Helm', t: 1, armor: 10, cls: null },
    { n: 'Wolfpelt Hood', t: 2, armor: 16, cls: null },
    { n: 'Steel Coif', t: 2, armor: 24, cls: null },
    { n: 'Runed Circlet', t: 3, armor: 30, cls: 'mage' },
    { n: 'Warden Crown', t: 4, armor: 46, cls: null },
  ],
  chest: [
    { n: 'Padded Shirt', t: 1, armor: 14 },
    { n: 'Chain Vest', t: 1, armor: 22 },
    { n: 'Boiled Leathers', t: 2, armor: 32 },
    { n: 'Cuirass', t: 2, armor: 46 },
    { n: 'Robe of Embers', t: 3, armor: 40, cls: 'mage' },
    { n: 'Golemplate', t: 4, armor: 82 },
  ],
  legs: [
    { n: 'Traveler Greaves', t: 1, armor: 10 },
    { n: 'Iron Greaves', t: 1, armor: 16 },
    { n: 'Ranger Leggings', t: 2, armor: 26 },
    { n: 'Greataegis Legs', t: 3, armor: 44 },
    { n: 'Silk Tassets', t: 3, armor: 34, cls: 'mage' },
  ],
  feet: [
    { n: 'Wooden Clogs', t: 1, armor: 5 },
    { n: 'Leather Boots', t: 1, armor: 9 },
    { n: 'Shod Boots', t: 2, armor: 18 },
    { n: 'Striders', t: 3, armor: 28 },
  ],
  hands: [
    { n: 'Work Gloves', t: 1, armor: 4 },
    { n: 'Gauntlets', t: 1, armor: 8 },
    { n: 'Fistwraps', t: 2, armor: 14 },
    { n: 'Vambraces', t: 3, armor: 24 },
  ],
  offHand: [
    { n: 'Wooden Shield', t: 1, armor: 8, block: 0.22 },
    { n: 'Iron Buckler', t: 1, armor: 12, block: 0.3 },
    { n: 'Oak Bulwark', t: 2, armor: 22, block: 0.38 },
    { n: 'Warden Aegis', t: 3, armor: 38, block: 0.46 },
    { n: 'Aegis of the Deep', t: 4, armor: 60, block: 0.55 },
  ],
  mainHand: [
    { n: 'Rusted Dagger', t: 1, dmg: 7, spd: 1.5, cls: null, wtype: 'one' },
    { n: 'Chipped Axe', t: 1, dmg: 11, spd: 1.05, cls: null, wtype: 'one' },
    { n: 'Worn Spear', t: 1, dmg: 13, spd: 0.9, cls: null, wtype: 'two' },
    { n: 'Iron Shortsword', t: 1, dmg: 12, spd: 1.25, cls: null, wtype: 'one' },
    { n: 'Hunting Bow', t: 1, dmg: 10, spd: 1.35, cls: 'ranger', wtype: 'two' },
    { n: 'Ashwood Staff', t: 1, dmg: 9, spd: 1.0, cls: 'mage', wtype: 'two' },
    { n: 'Steel Broadaxe', t: 2, dmg: 19, spd: 0.95, cls: null, wtype: 'two' },
    { n: 'Fang Chopper', t: 2, dmg: 16, spd: 1.2, cls: null, wtype: 'one' },
    { n: 'Yew Warbow', t: 2, dmg: 18, spd: 1.3, cls: 'ranger', wtype: 'two' },
    { n: 'Runed Rod', t: 2, dmg: 14, spd: 1.1, cls: 'mage', wtype: 'two' },
    { n: 'Warhammer of Kells', t: 3, dmg: 27, spd: 0.85, cls: null, wtype: 'two' },
    { n: "Duelist's Blade", t: 3, dmg: 22, spd: 1.45, cls: null, wtype: 'one' },
    { n: 'Longbow of the Vale', t: 3, dmg: 26, spd: 1.35, cls: 'ranger', wtype: 'two' },
    { n: 'Emberwood Staff', t: 3, dmg: 21, spd: 1.1, cls: 'mage', wtype: 'two' },
    { n: 'Ruinbreaker', t: 4, dmg: 38, spd: 0.9, cls: null, wtype: 'two' },
    { n: 'Nightglass Dagger', t: 4, dmg: 26, spd: 1.7, cls: null, wtype: 'one' },
    { n: "Stormcaller's Rod", t: 4, dmg: 30, spd: 1.15, cls: 'mage', wtype: 'two' },
  ],
  ring: [
    { n: 'Copper Band', t: 1 },
    { n: 'Signet Ring', t: 2 },
    { n: 'Woven Ring', t: 3 },
    { n: 'Deep Seal', t: 4 },
  ],
  amulet: [
    { n: 'Thong Necklace', t: 1 },
    { n: 'Bone Charm', t: 2 },
    { n: 'Glass Pendant', t: 3 },
    { n: 'Sigil Locket', t: 4 },
  ],
};

// Affix pools. `w` = weight, `roll` = [lo,hi] per item level.
export const AFFIX = [
  { k: 'str', w: 10, roll: (il) => [1 + il * 0.35, 2 + il * 0.9] },
  { k: 'dex', w: 10, roll: (il) => [1 + il * 0.35, 2 + il * 0.9] },
  { k: 'int', w: 10, roll: (il) => [1 + il * 0.3, 2 + il * 0.8] },
  { k: 'vit', w: 10, roll: (il) => [1 + il * 0.35, 2 + il * 0.9] },
  { k: 'hp', w: 12, roll: (il) => [3 + il * 1.6, 7 + il * 3.4] },
  { k: 'armor', w: 11, roll: (il) => [2 + il * 0.9, 5 + il * 2.1] },
  { k: 'dmg', w: 11, roll: (il) => [1 + il * 0.5, 3 + il * 1.5] },
  { k: 'crit', w: 8, roll: (il) => [1 + il * 0.18, 2.5 + il * 0.6] },
  { k: 'speed', w: 7, roll: (il) => [0.01 + il * 0.002, 0.03 + il * 0.008] },
  { k: 'lifesteal', w: 6, roll: (il) => [0.01, 0.02 + il * 0.004] },
  { k: 'mana', w: 7, roll: (il) => [4 + il * 1.2, 9 + il * 3] },
  { k: 'manaRegen', w: 6, roll: (il) => [0.3 + il * 0.08, 0.8 + il * 0.25] },
  { k: 'stam', w: 6, roll: (il) => [3 + il * 0.8, 6 + il * 2] },
  { k: 'block', w: 6, roll: (il) => [0.02, 0.05 + il * 0.006] },
  { k: 'parryWindow', w: 4, roll: (il) => [0.01, 0.03 + il * 0.003] },
  { k: 'thorns', w: 5, roll: (il) => [1 + il * 0.3, 3 + il * 1.1] },
  { k: 'goldFind', w: 5, roll: (il) => [0.03, 0.08 + il * 0.012] },
  { k: 'magicFind', w: 4, roll: (il) => [0.02, 0.06 + il * 0.01] },
  { k: 'skillPower', w: 5, roll: (il) => [0.02 + il * 0.003, 0.05 + il * 0.011] },
  { k: 'fireDamage', w: 5, roll: (il) => [1 + il * 0.4, 3 + il * 1.4] },
  { k: 'frostDamage', w: 5, roll: (il) => [1 + il * 0.4, 3 + il * 1.4] },
  { k: 'shockDamage', w: 5, roll: (il) => [1 + il * 0.4, 3 + il * 1.4] },
];
export const AFFIX_LABEL = {
  str: '+Strength', dex: '+Dexterity', int: '+Intelligence', vit: '+Vitality',
  hp: '+Life', armor: '+Armor', dmg: '+Damage', crit: '+Crit %', speed: '+Move %',
  lifesteal: '+Lifesteal %', mana: '+Mana', manaRegen: '+Mana/s', stam: '+Stamina',
  block: '+Block %', parryWindow: '+Parry %', thorns: '+Thorns', goldFind: '+Gold %',
  magicFind: '+Magic %', skillPower: '+Skill %', fireDamage: '+Fire', frostDamage: '+Frost', shockDamage: '+Shock',
};
export const AFFIX_FMT = { speed: 'pct', lifesteal: 'pct', block: 'pct', parryWindow: 'pct', goldFind: 'pct', magicFind: 'pct', skillPower: 'pct' };

export function fmtAffix(k, v) {
  const label = AFFIX_LABEL[k] || k;
  if (AFFIX_FMT[k] === 'pct') return label + ' ' + Math.round(v * 100) + '%';
  return label + ' ' + (Math.round(v * 10) / 10).toString().replace(/\.0$/, '');
}

// ---------- generation ----------
export function tierForLevel(il) { return il >= 22 ? 4 : il >= 14 ? 3 : il >= 6 ? 2 : 1; }

export function pickRarity(rng, magicFind) {
  const boost = 1 + magicFind;
  const weights = RARITY.map((r, i) => r.weight * (i >= 2 ? boost : 1));
  return rng.weighted(RARITY, weights);
}

export function genItem(rng, il, slot, forceRarity, cls) {
  const tier = tierForLevel(il);
  const pool = (BASES[slot] || []).filter((b) => b.t <= tier && (!b.cls || b.cls === cls));
  const pool2 = pool.length ? pool : (BASES[slot] || []).filter((b) => !b.cls);
  if (!pool2.length) return null;
  const base = rng.pick(pool2);
  const rar = forceRarity ? RARITY.find((r) => r.id === forceRarity) : pickRarity(rng, 0);
  const il2 = Math.max(1, il);
  const bonus = {};
  const n = rar.affixes;
  const used = new Set();
  for (let i = 0; i < n; i++) {
    const w = AFFIX.map((a) => (used.has(a.k) ? 0 : a.w));
    const a = rng.weighted(AFFIX, w);
    used.add(a.k);
    const [lo, hi] = a.roll(il2);
    let v = lo + rng.next() * (hi - lo);
    v = Math.round(v * (AFFIX_FMT[a.k] === 'pct' ? 1000 : 10)) / (AFFIX_FMT[a.k] === 'pct' ? 1000 : 10);
    bonus[a.k] = (bonus[a.k] || 0) + v;
  }
  const scale = rar.mult * (1 + (il2 - 1) * 0.11);
  const it = {
    slot, name: base.n, rarity: rar.id, color: rar.color, il: il2,
    armor: base.armor ? Math.round(base.armor * scale) : 0,
    dmg: base.dmg ? Math.round(base.dmg * scale) : 0,
    spd: base.spd || 1,
    wtype: base.wtype || null,
    block: base.block ? Math.min(0.7, base.block + (bonus.block || 0)) : 0,
    bonus,
    value: 0,
  };
  it.value = Math.round((it.armor + it.dmg * 2.2 + il2 * 3) * rar.mult * (1 + Object.keys(bonus).length * 0.22));
  it.label = rar.name + ' ' + base.n;
  return it;
}

// A full loot roll: gold + optional items, scaled to the monster level.
export function lootRoll(rng, ml, player, ctx) {
  const out = { gold: 0, items: [] };
  const goldBase = 6 + ml * 2.4;
  const goldMult = 1 + (player ? player.stats?.goldFind || 0 : 0);
  out.gold = Math.round((goldBase * (0.6 + rng.next() * 0.9)) * goldMult);
  const mf = (player ? player.stats?.magicFind || 0 : 0) + (ctx?.magicFind || 0);
  const chanceItem = (ctx?.itemChance ?? 0.22) * (1 + mf);
  const rolls = 1 + (rng.next() < 0.35 ? 1 : 0);
  for (let i = 0; i < rolls; i++) {
    if (i > 0 && rng.next() > chanceItem * 0.5) break;
    if (rng.next() > chanceItem) continue;
    const slot = rng.pick(['head', 'chest', 'legs', 'feet', 'hands', 'offHand', 'mainHand', 'ring', 'amulet']);
    const it = genItem(rng, ml, slot, null, player ? player.cls : null);
    if (it) out.items.push(it);
  }
  if (ctx?.guaranteed) {
    for (const g of ctx.guaranteed) {
      const it = genItem(rng, ml, g.slot, g.rarity, player ? player.cls : null);
      if (it) out.items.push(it);
    }
  }
  return out;
}

export function itemTooltip(it) {
  const lines = [it.label];
  if (it.armor) lines.push('Armor ' + it.armor);
  if (it.dmg) lines.push('Damage ' + it.dmg + '  Speed ' + it.spd.toFixed(2));
  if (it.block) lines.push('Block ' + Math.round(it.block * 100) + '%');
  for (const k in it.bonus) lines.push(fmtAffix(k, it.bonus[k]));
  lines.push('Item Level ' + it.il);
  return lines.join('\n');
}

export function scoreItem(it) {
  let s = it.il * 4;
  if (it.slot === 'mainHand') s += it.dmg * it.spd * 2.4;
  else s += it.armor * 1.6;
  for (const k in it.bonus) s += it.bonus[k] * (AFFIX_FMT[k] === 'pct' ? 220 : 6);
  s += Object.keys(it.bonus).length * 8;
  return s;
}

export const ITEMS_EXPORTS = { SLOTS, RARITY, BASES, AFFIX, AFFIX_LABEL, genItem, lootRoll, itemTooltip, scoreItem, tierForLevel, pickRarity, fmtAffix };

ITEMS.SLOTS = SLOTS; ITEMS.RARITY = RARITY; ITEMS.BASES = BASES; ITEMS.AFFIX = AFFIX; ITEMS.AFFIX_LABEL = AFFIX_LABEL; ITEMS.AFFIX_FMT = AFFIX_FMT; ITEMS.genItem = genItem; ITEMS.lootRoll = lootRoll; ITEMS.itemTooltip = itemTooltip; ITEMS.scoreItem = scoreItem; ITEMS.tierForLevel = tierForLevel; ITEMS.pickRarity = pickRarity; ITEMS.fmtAffix = fmtAffix;
