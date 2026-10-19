// Item bases, affixes, rarity and stat-appropriate generation.
import { RNG } from '../core/rng.js';

export const SLOTS = ['head', 'chest', 'legs', 'hands', 'feet', 'mainHand', 'offHand', 'ring1', 'ring2', 'amulet'];
export const SLOT_LABEL = {
  head: 'Head', chest: 'Torso', legs: 'Legs', hands: 'Gauntlets', feet: 'Boots',
  mainHand: 'Weapon', offHand: 'Off-hand', ring1: 'Ring', ring2: 'Ring', amulet: 'Amulet',
};
export const RARITY = [
  { id: 'common', name: 'Common', color: '#cfc7b6', affixes: 0, weight: 60 },
  { id: 'magic', name: 'Magic', color: '#6fa8dc', affixes: 1, weight: 26 },
  { id: 'rare', name: 'Rare', color: '#f0d060', affixes: 2, weight: 11 },
  { id: 'legend', name: 'Legendary', color: '#f08a2c', affixes: 2, weight: 3 },
];

// ---- weapon archetypes -------------------------------------------------------
const W = (type, dmgMin, dmgMax, speed) => ({ type, dmgMin, dmgMax, speed });

export const BASES = [
  // ---- weapons
  { id: 'shortsword', name: 'Short Sword', slot: 'mainHand', gfx: 'sword', lvl: 1, req: { str: 5 }, weapon: W('sword', 3, 6, 1.5), classes: null, w: 10 },
  { id: 'longsword', name: 'Long Sword', slot: 'mainHand', gfx: 'sword', lvl: 4, req: { str: 12 }, weapon: W('sword', 6, 11, 1.3), classes: null, w: 12 },
  { id: 'battleaxe', name: 'Battle Axe', slot: 'mainHand', gfx: 'axe', lvl: 6, req: { str: 20 }, weapon: W('axe', 10, 18, 1.0), classes: ['warrior'], w: 10 },
  { id: 'warhammer', name: 'War Hammer', slot: 'mainHand', gfx: 'mace', lvl: 8, req: { str: 24 }, weapon: W('mace', 13, 22, 0.85), classes: ['warrior'], w: 9 },
  { id: 'greatsword', name: 'Great Sword', slot: 'mainHand', gfx: 'sword', lvl: 12, req: { str: 32 }, weapon: W('sword', 18, 30, 0.95), classes: ['warrior'], w: 8 },
  { id: 'dagger', name: 'Bone Dagger', slot: 'mainHand', gfx: 'dagger', lvl: 1, req: {}, weapon: W('dagger', 2, 4, 2.1), classes: null, w: 10 },
  { id: 'shortbow', name: 'Short Bow', slot: 'mainHand', gfx: 'bow', lvl: 1, req: { dex: 8 }, weapon: W('bow', 4, 8, 1.35), classes: ['ranger'], w: 10 },
  { id: 'longbow', name: 'Long Bow', slot: 'mainHand', gfx: 'bow', lvl: 7, req: { dex: 18 }, weapon: W('bow', 9, 16, 1.15), classes: ['ranger'], w: 10 },
  { id: 'warbow', name: 'Composite War Bow', slot: 'mainHand', gfx: 'bow', lvl: 14, req: { dex: 30 }, weapon: W('bow', 17, 28, 1.05), classes: ['ranger'], w: 8 },
  { id: 'wand', name: 'Yew Wand', slot: 'mainHand', gfx: 'staff', lvl: 1, req: { int: 8 }, weapon: W('staff', 3, 6, 1.6), classes: ['mage'], w: 10 },
  { id: 'staff', name: 'Oak Staff', slot: 'mainHand', gfx: 'staff', lvl: 6, req: { int: 16 }, weapon: W('staff', 7, 13, 1.25), classes: ['mage'], w: 10 },
  { id: 'runestaff', name: 'Runed Staff', slot: 'mainHand', gfx: 'staff', lvl: 13, req: { int: 28 }, weapon: W('staff', 15, 25, 1.15), classes: ['mage'], w: 8 },

  // ---- shields / offhand
  { id: 'buckler', name: 'Buckler', slot: 'offHand', gfx: 'shield', lvl: 1, req: { str: 5 }, armor: 3, block: 22, classes: null, w: 10 },
  { id: 'kiteshield', name: 'Kite Shield', slot: 'offHand', gfx: 'shield', lvl: 5, req: { str: 14 }, armor: 8, block: 28, classes: null, w: 10 },
  { id: 'towershield', name: 'Tower Shield', slot: 'offHand', gfx: 'shield', lvl: 11, req: { str: 26 }, armor: 16, block: 34, classes: ['warrior'], w: 8 },
  { id: 'tomeshield', name: 'Warded Tome', slot: 'offHand', gfx: 'tome', lvl: 6, req: { int: 16 }, armor: 6, block: 18, classes: ['mage'], w: 8 },
  { id: 'quiver', name: 'Hunter\'s Quiver', slot: 'offHand', gfx: 'quiver', lvl: 3, req: { dex: 10 }, armor: 2, block: 8, classes: ['ranger'], w: 8 },

  // ---- armor
  { id: 'leathercap', name: 'Leather Cap', slot: 'head', gfx: 'helm', lvl: 1, req: {}, armor: 4, classes: null, w: 10 },
  { id: 'ironhelm', name: 'Iron Helm', slot: 'head', gfx: 'helm', lvl: 6, req: { str: 12 }, armor: 11, classes: null, w: 10 },
  { id: 'circlet', name: 'Silver Circlet', slot: 'head', gfx: 'circlet', lvl: 4, req: { int: 12 }, armor: 5, classes: null, w: 9 },
  { id: 'leathervest', name: 'Leather Vest', slot: 'chest', gfx: 'chest', lvl: 1, req: {}, armor: 8, classes: null, w: 10 },
  { id: 'studded', name: 'Studded Leather', slot: 'chest', gfx: 'chest', lvl: 5, req: { dex: 10 }, armor: 15, classes: null, w: 10 },
  { id: 'chainmail', name: 'Chain Mail', slot: 'chest', gfx: 'chest', lvl: 9, req: { str: 18 }, armor: 24, classes: null, w: 10 },
  { id: 'plate', name: 'Gothic Plate', slot: 'chest', gfx: 'chest', lvl: 16, req: { str: 30 }, armor: 38, classes: ['warrior'], w: 7 },
  { id: 'robe', name: 'Arcane Robe', slot: 'chest', gfx: 'robe', lvl: 4, req: { int: 14 }, armor: 10, classes: null, w: 9 },
  { id: 'chaosrobe', name: 'Robe of Embers', slot: 'chest', gfx: 'robe', lvl: 14, req: { int: 28 }, armor: 20, classes: null, w: 7 },
  { id: 'leggings', name: 'Leather Leggings', slot: 'legs', gfx: 'legs', lvl: 1, req: {}, armor: 5, classes: null, w: 10 },
  { id: 'heavygreaves', name: 'Iron Greaves', slot: 'legs', gfx: 'legs', lvl: 8, req: { str: 16 }, armor: 15, classes: null, w: 10 },
  { id: 'gauntlets', name: 'Work Gloves', slot: 'hands', gfx: 'gloves', lvl: 1, req: {}, armor: 2, classes: null, w: 10 },
  { id: 'warfists', name: 'War Fists', slot: 'hands', gfx: 'gloves', lvl: 7, req: { str: 12 }, armor: 6, classes: null, w: 9 },
  { id: 'boots', name: 'Traveler\'s Boots', slot: 'feet', gfx: 'boots', lvl: 1, req: {}, armor: 3, classes: null, w: 10 },
  { id: 'sabatons', name: 'Steel Sabatons', slot: 'feet', gfx: 'boots', lvl: 9, req: { str: 14 }, armor: 8, classes: null, w: 9 },

  // ---- jewelry
  { id: 'ringcopper', name: 'Copper Ring', slot: 'ring1', gfx: 'ring', lvl: 1, req: {}, classes: null, w: 10 },
  { id: 'ringsilver', name: 'Silver Band', slot: 'ring1', gfx: 'ring', lvl: 8, req: {}, classes: null, w: 9 },
  { id: 'ringgold', name: 'Golden Signet', slot: 'ring1', gfx: 'ring', lvl: 15, req: {}, classes: null, w: 7 },
  { id: 'amuletbone', name: 'Bone Charm', slot: 'amulet', gfx: 'amulet', lvl: 2, req: {}, classes: null, w: 10 },
  { id: 'amuletgem', name: 'Gemsoul Amulet', slot: 'amulet', gfx: 'amulet', lvl: 12, req: {}, classes: null, w: 7 },
];
// ring1/ring2 share bases; normalise at generation time
export const basesForSlot = (slot) => BASES.filter((b) => (b.slot === slot || (slot.startsWith('ring') && b.slot === 'ring1')));

// ---- affixes -----------------------------------------------------------------
// tag: which item kinds accept it. val(ilvl) -> magnitude. tier used for weighting.
const A = (id, name, where, kind, modFn, tier = 1) => ({ id, name, where, kind, modFn, tier });
export const AFFIXES = [
  A('str', 'of the Bear', 'stat', 'suffix', (l) => ({ str: 1 + Math.round(l / 5) }), 1),
  A('dex', 'of the Fox', 'stat', 'suffix', (l) => ({ dex: 1 + Math.round(l / 5) }), 1),
  A('int', 'of the Owl', 'stat', 'suffix', (l) => ({ int: 1 + Math.round(l / 5) }), 1),
  A('vit', 'of the Ox', 'stat', 'suffix', (l) => ({ vit: 1 + Math.round(l / 4) }), 1),
  A('all', 'of the Ancients', 'stat', 'suffix', (l) => ({ str: Math.ceil(l / 9), dex: Math.ceil(l / 9), int: Math.ceil(l / 9), vit: Math.ceil(l / 9) }), 3),
  A('hp', 'of Life', 'stat', 'suffix', (l) => ({ hp: 6 + l * 1.6 }), 1),
  A('mana', 'of the Blue Flame', 'stat', 'suffix', (l) => ({ mana: 5 + l * 1.1 }), 1),
  A('armor2', 'of Iron', 'armor', 'suffix', (l) => ({ armor: 2 + l * 0.8 }), 1),
  A('armorPct', 'of the Bulwark', 'armor', 'suffix', (l) => ({ armorPct: 5 + Math.round(l / 3) }), 2),
  A('dmgPct', 'of Slaying', 'weapon', 'suffix', (l) => ({ dmgPct: 8 + Math.round(l / 2) }), 2),
  A('dmgFlat', 'of Cruelty', 'weapon', 'suffix', (l) => ({ dmgFlat: 1 + Math.round(l / 4) }), 1),
  A('crit', 'of the Hunter', 'stat', 'suffix', (l) => ({ crit: 2 + Math.round(l / 8) }), 2),
  A('block', 'of the Ward', 'shield', 'suffix', (l) => ({ block: 3 + Math.round(l / 7) }), 2),
  A('spd', 'of the Wind', 'stat', 'suffix', (l) => ({ moveSpeed: 2 + Math.round(l / 10) }), 2),
  A('ls', 'of the Leech', 'stat', 'suffix', (l) => ({ lifeSteal: 1 + Math.round(l / 12) }), 3),
  A('thorns', 'of Thorns', 'stat', 'suffix', (l) => ({ thorns: 1 + Math.round(l / 6) }), 2),
  A('xp', 'of Study', 'stat', 'suffix', (l) => ({ xpGain: 3 + Math.round(l / 6) }), 2),
  A('regen', 'of Recovery', 'stat', 'suffix', (l) => ({ hpRegen: 1 + Math.round(l / 9) }), 1),
  A('spell', 'of Embers', 'weapon', 'suffix', (l) => ({ spellPower: 4 + Math.round(l * 0.9) }), 2),

  A('p_str', 'Stalwart', 'stat', 'prefix', (l) => ({ str: 1 + Math.round(l / 5) }), 1),
  A('p_dex', 'Nimble', 'stat', 'prefix', (l) => ({ dex: 1 + Math.round(l / 5) }), 1),
  A('p_int', 'Arcane', 'stat', 'prefix', (l) => ({ int: 1 + Math.round(l / 5) }), 1),
  A('p_vit', 'Hale', 'stat', 'prefix', (l) => ({ vit: 1 + Math.round(l / 4) }), 1),
  A('p_heavy', 'Heavy', 'armor', 'prefix', (l) => ({ armor: 3 + l * 0.9 }), 1),
  A('p_sharp', 'Sharp', 'weapon', 'prefix', (l) => ({ dmgFlat: 2 + Math.round(l / 3) }), 1),
  A('p_deadly', 'Deadly', 'weapon', 'prefix', (l) => ({ crit: 3 + Math.round(l / 7) }), 2),
  A('p_swift', 'Swift', 'any', 'prefix', (l) => ({ atkSpeed: 3 + Math.round(l / 9) }), 2),
  A('p_warm', 'Warm', 'stat', 'prefix', (l) => ({ hp: 4 + l }), 1),
  A('p_ward', 'Warding', 'shield', 'prefix', (l) => ({ block: 4 + Math.round(l / 6), armor: 2 + l * 0.4 }), 2),
];

// ---- legendary uniques -------------------------------------------------------
export const UNIQUES = [
  { id: 'emberfall', name: 'Emberfall\'s Wrath', mod: { dmgPct: 45, hpRegen: 3 }, text: '+45% damage, +3 life per hit' },
  { id: 'oathkeeper', name: 'Oathkeeper', mod: { block: 20, armorPct: 35 }, text: '+20% block, +35% armour' },
  { id: 'nightfang', name: 'Nightfang', mod: { crit: 18, lifeSteal: 5 }, text: '+18% critical, +5% life steal' },
  { id: 'stormcall', name: 'Stormcaller', mod: { spellPower: 40, mana: 40 }, text: '+40 spell power, +40 mana' },
  { id: 'greedsong', name: 'Greedsong', mod: { goldFind: 60, xpGain: 20 }, text: '+60% gold, +20% experience' },
  { id: 'ghostwalk', name: 'Ghostwalk', mod: { dodge: 12, moveSpeed: 12 }, text: '+12% dodge, +12% speed' },
  { id: 'bonewall', name: 'Bonewall', mod: { armorPct: 60, thorns: 12 }, text: '+60% armour, 12 thorns' },
];

// ---- generation --------------------------------------------------------------
let uid = 1;
export function generateItem(rng, ilvl, opts = {}) {
  ilvl = Math.max(1, Math.round(ilvl));
  const slot = opts.slot && opts.slot !== 'any' ? opts.slot : null;
  let pool = slot ? basesForSlot(slot) : BASES;
  if (opts.baseId) { const b = BASES.find((x) => x.id === opts.baseId); if (b) pool = [b]; }
  if (opts.classId) pool = pool.filter((b) => !b.classes || b.classes.includes(opts.classId));
  pool = pool.filter((b) => b.lvl <= ilvl + 2);
  if (!pool.length) pool = BASES.filter((b) => b.lvl <= ilvl + 2);
  if (!pool.length) pool = [BASES[0]];
  const base = rng.weighted(pool.map((b) => [b, 1 + (b.lvl >= ilvl - 6 ? 2.2 : 0)]));

  let rarityIdx = rng.weighted(RARITY.map((r, i) => [i, r.weight * (opts.rarityBoost ? (i >= 2 ? 3 : 1) : 1)]));
  if (opts.rarity !== undefined) rarityIdx = opts.rarity;
  const rarity = RARITY[rarityIdx];

  const item = {
    uid: uid++,
    base: base.id,
    slot: base.slot === 'ring1' && opts.slot === 'ring2' ? 'ring2' : base.slot,
    ilvl,
    rarity: rarityIdx,
    name: base.name,
    gfx: base.gfx,
    mods: {},
  };
  if (base.weapon) item.weapon = { ...base.weapon };
  if (base.armor) item.armorBase = base.armor;
  if (base.block) item.blockBase = base.block;
  item.req = { ...base.req };
  // requirements scale with item level
  for (const k of ['str', 'dex', 'int']) {
    const scale = Math.max(0, ilvl - base.lvl);
    if (scale > 0 && (base.req[k] !== undefined || scale > 6)) {
      item.req[k] = (item.req[k] || 0) + Math.floor(scale * (k === 'str' ? 0.7 : 0.5));
    }
  }

  const nAffix = rarity.affixes + (rarityIdx === 3 ? rng.int(0, 1) : 0);
  const used = new Set();
  for (let i = 0; i < nAffix; i++) {
    const cands = AFFIXES.filter((a) =>
      !used.has(a.id) &&
      (a.where === 'any' ||
        (a.where === 'weapon' && base.weapon) ||
        (a.where === 'armor' && (base.armor || base.block)) ||
        (a.where === 'shield' && base.block) ||
        (a.where === 'stat')));
    if (!cands.length) break;
    const a = rng.weighted(cands.map((c) => [c, c.tier === 1 ? 3 : c.tier === 2 ? 2 : 1]));
    used.add(a.id);
    const m = a.modFn(ilvl);
    for (const k in m) item.mods[k] = (item.mods[k] || 0) + m[k];
    if (a.kind === 'prefix') item.prefix = (item.prefix ? item.prefix + ', ' : '') + a.name;
    else item.suffix = (item.suffix ? item.suffix + ', ' : '') + a.name;
  }
  if (rarityIdx === 3) {
    const u = rng.pick(UNIQUES);
    item.unique = u.id;
    item.displayName = u.name;
    for (const k in u.mod) item.mods[k] = (item.mods[k] || 0) + u.mod[k];
  }
  item.title = item.displayName || base.name;
  item.value = itemValue(item);
  return item;
}

// Aggregate the effective stats of an item.
export function itemStats(item) {
  const base = BASES.find((b) => b.id === item.base);
  const s = {
    dmgMin: item.weapon ? item.weapon.dmgMin : 0,
    dmgMax: item.weapon ? item.weapon.dmgMax : 0,
    speed: item.weapon ? item.weapon.speed : 0,
    armor: item.armorBase || 0,
    block: item.blockBase || 0,
  };
  const m = item.mods || {};
  s.dmgMin += m.dmgFlat || 0; s.dmgMax += m.dmgFlat || 0;
  if (m.dmgPct) { s.dmgMin = Math.round(s.dmgMin * (1 + m.dmgPct / 100)); s.dmgMax = Math.round(s.dmgMax * (1 + m.dmgPct / 100)); }
  s.armor += m.armor || 0;
  if (m.armorPct) s.armor = Math.round(s.armor * (1 + m.armorPct / 100));
  s.block += m.block || 0;
  s.mods = m;
  return s;
}

export function itemValue(item) {
  const base = BASES.find((b) => b.id === item.base);
  let v = 8 + item.ilvl * 3;
  const m = item.mods || {};
  for (const k in m) v += (m[k] || 0) * (k === 'crit' || k === 'lifeSteal' || k === 'dodge' ? 6 : 3);
  v *= [1, 1.6, 2.6, 5][item.rarity || 0];
  v *= (base && base.weapon ? 1.3 : 1);
  return Math.max(5, Math.round(v));
}

export function itemScore(item) {
  const s = itemStats(item);
  return Math.round(s.dmgMax * (item.weapon ? 2 : 0) + s.armor * 1.2 + s.block * 1.5 +
    Object.values(item.mods || {}).reduce((a, b) => a + b, 0) * 2 + item.ilvl * 2);
}

export function canEquip(item, p) {
  const req = item.req || {};
  if (req.str && p.attrs.str < req.str) return { ok: false, why: `requires ${req.str} STR` };
  if (req.dex && p.attrs.dex < req.dex) return { ok: false, why: `requires ${req.dex} DEX` };
  if (req.int && p.attrs.int < req.int) return { ok: false, why: `requires ${req.int} INT` };
  const base = BASES.find((b) => b.id === item.base);
  if (base && base.classes && !base.classes.includes(p.classId)) return { ok: false, why: `${p.className} cannot use this` };
  return { ok: true };
}

export const CONSUMABLES = {
  hp: { id: 'hp', name: 'Healing Draught', gfx: 'flask', price: 25, kind: 'potion', effect: { hp: 60 } },
  mp: { id: 'mp', name: 'Mana Draught', gfx: 'flask', price: 30, kind: 'potion', effect: { mana: 45 } },
  st: { id: 'st', name: 'Stamina Draught', gfx: 'flask', price: 20, kind: 'potion', effect: { stamina: 60 } },
  torch: { id: 'torch', name: 'Pitch Torch', gfx: 'torch', price: 40, kind: 'charm', effect: { light: 1 } },
};

export function makeItem(baseId, ilvl = 1, rarity = 0, seed = baseId) {
  return generateItem(new RNG(RNG.hash(seed + ':' + baseId)), ilvl, { baseId, rarity });
}

export function itemDisplayName(item) { return item.displayName || item.title || (BASES.find((b) => b.id === item.base) || {}).name; }
export function randomItem(seedStr, ilvl, opts) { return generateItem(new RNG(RNG.hash(seedStr)), ilvl, opts); }
