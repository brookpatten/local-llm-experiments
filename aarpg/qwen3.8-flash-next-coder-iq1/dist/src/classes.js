// Class definitions, skill trees, unlock schedule.
import { STATS } from './stats.js';

export const CLASSES = {};

export const CLASS_LIST = ['warrior', 'ranger', 'mage'];

export const CLASS_META = {
  warrior: {
    name: 'Warrior', title: 'Oathbreaker',
    blurb: 'Iron and discipline. Blocks harder, parries heavier, and answers every mistake with steel.',
    color: '#c94b3a',
    primary: 'str',
    signature: 'cleave',
    armorPref: ['Golemplate', 'Cuirass', 'Warden Aegis', 'Warhammer of Kells'],
    startGear: [
      { slot: 'mainHand', name: 'Chipped Axe' }, { slot: 'offHand', name: 'Wooden Shield' },
      { slot: 'chest', name: 'Chain Vest' }, { slot: 'legs', name: 'Iron Greaves' },
    ],
  },
  ranger: {
    name: 'Ranger', title: 'Longshot Warden',
    blurb: 'Distance and patience. Rolls clean, marks soft spots, and never lets a monster close.',
    color: '#4f9b57',
    primary: 'dex',
    signature: 'volley',
    armorPref: ['Ranger Leggings', 'Boiled Leathers', 'Yew Warbow'],
    startGear: [
      { slot: 'mainHand', name: 'Hunting Bow' }, { slot: 'chest', name: 'Padded Shirt' },
      { slot: 'legs', name: 'Traveler Greaves' }, { slot: 'feet', name: 'Leather Boots' },
    ],
  },
  mage: {
    name: 'Mage', title: 'Emberwright',
    blurb: 'Fire, frost, and arrogance. Fragile, but nothing survives the second volley.',
    color: '#6a5ad6',
    primary: 'int',
    signature: 'fireball',
    armorPref: ['Robe of Embers', 'Runed Circlet', 'Ashwood Staff'],
    startGear: [
      { slot: 'mainHand', name: 'Ashwood Staff' }, { slot: 'chest', name: 'Padded Shirt' },
      { slot: 'head', name: 'Leather Cap' },
    ],
  },
};

// ---------- skills ----------
// kind: 'active' | 'passive'
// group used by the hotbar; `unlock` = level required
export const SKILLS = {
  warrior: [
    { id: 'cleave', name: 'Cleave', kind: 'active', unlock: 1, maxRank: 3, cd: 4.5, cost: { stam: 14 }, key: '1',
      desc: 'Sweep a wide arc in front of you, hitting every enemy in the arc.', hot: true },
    { id: 'whirlwind', name: 'Whirlwind', kind: 'active', unlock: 3, maxRank: 3, cd: 8, cost: { stam: 22 }, key: '2',
      desc: 'Spin 360 degrees. Hitting enemies restores stamina.', hot: true },
    { id: 'leap', name: 'Heroic Leap', kind: 'active', unlock: 5, maxRank: 3, cd: 11, cost: { stam: 20 }, key: '3',
      desc: 'Crash to the cursor, stunning and knocking enemies back.', hot: true },
    { id: 'shieldwall', name: 'Shield Wall', kind: 'active', unlock: 7, maxRank: 3, cd: 22, cost: { stam: 10 }, key: '4',
      desc: 'For 6s your block is unbreakable and you take far less damage.', hot: true },
    { id: 'execute', name: 'Execute', kind: 'active', unlock: 11, maxRank: 3, cd: 9, cost: { stam: 18 }, key: '5',
      desc: 'Attempt to finish a wounded foe. Massive damage below 35% life.', hot: false },
    { id: 'berserker', name: 'Berserker Rage', kind: 'active', unlock: 15, maxRank: 3, cd: 30, cost: {}, key: '6',
      desc: 'For 10s: +damage, +move speed, stamina costs reduced, immune to stagger.', hot: false },
    { id: 'ironhide', name: 'Ironhide', kind: 'passive', unlock: 2, maxRank: 3, desc: '+Armor and +Block chance.' },
    { id: 'toughness', name: 'Toughness', kind: 'passive', unlock: 6, maxRank: 3, desc: '+Life and +Stamina.' },
    { id: 'deflect', name: 'Deflect', kind: 'passive', unlock: 10, maxRank: 3, desc: 'Longer parry window and parries stun.' },
  ],
  ranger: [
    { id: 'volley', name: 'Volley', kind: 'active', unlock: 1, maxRank: 3, cd: 4.5, cost: { stam: 14 }, key: '1',
      desc: 'Loose a fan of arrows at the cursor.', hot: true },
    { id: 'rapidfire', name: 'Rapid Fire', kind: 'active', unlock: 3, maxRank: 3, cd: 12, cost: { stam: 16 }, key: '2',
      desc: 'For 8s your attacks fire twice, faster.', hot: true },
    { id: 'rollingstrike', name: 'Rolling Strike', kind: 'active', unlock: 5, maxRank: 3, cd: 9, cost: { stam: 18 }, key: '3',
      desc: 'Dash through foes, bleeding them. Invulnerable mid-dash.', hot: true },
    { id: 'snare', name: 'Snare Trap', kind: 'active', unlock: 7, maxRank: 3, cd: 14, cost: { stam: 12 }, key: '4',
      desc: 'Drop a trap that roots the next monster to touch it.', hot: true },
    { id: 'explosive', name: 'Explosive Trap', kind: 'active', unlock: 11, maxRank: 3, cd: 16, cost: { stam: 16 }, key: '5',
      desc: 'A trap that detonates for heavy area damage.', hot: false },
    { id: 'evasion', name: 'Evasion', kind: 'active', unlock: 15, maxRank: 3, cd: 24, cost: { stam: 8 }, key: '6',
      desc: 'For 8s: huge dodge, +move speed, roll costs nothing.', hot: false },
    { id: 'hawkseye', name: "Hawk's Eye", kind: 'passive', unlock: 2, maxRank: 3, desc: '+Crit chance and +crit damage.' },
    { id: 'lightfoot', name: 'Lightfoot', kind: 'passive', unlock: 6, maxRank: 3, desc: '+Move speed and +Stamina regen.' },
    { id: 'reflex', name: 'Quick Reflexes', kind: 'passive', unlock: 10, maxRank: 3, desc: 'Rolls gain distance and invulnerability.' },
  ],
  mage: [
    { id: 'fireball', name: 'Fireball', kind: 'active', unlock: 1, maxRank: 3, cd: 3.6, cost: { mana: 16 }, key: '1',
      desc: 'Hurl a slow bolt that explodes and burns.', hot: true },
    { id: 'frostbolt', name: 'Frostbolt', kind: 'active', unlock: 3, maxRank: 3, cd: 4.2, cost: { mana: 14 }, key: '2',
      desc: 'A shard that chills, slowing everything it hits.', hot: true },
    { id: 'chainlight', name: 'Chain Lightning', kind: 'active', unlock: 5, maxRank: 3, cd: 7, cost: { mana: 22 }, key: '3',
      desc: 'Lightning arcs between nearby foes.', hot: true },
    { id: 'blink', name: 'Blink', kind: 'active', unlock: 7, maxRank: 3, cd: 12, cost: { mana: 18 }, key: '4',
      desc: 'Teleport instantly to the cursor.', hot: true },
    { id: 'icewall', name: 'Ice Wall', kind: 'active', unlock: 11, maxRank: 3, cd: 16, cost: { mana: 26 }, key: '5',
      desc: 'Raise a wall of ice that blocks and chills.', hot: false },
    { id: 'arcaneburst', name: 'Arcane Burst', kind: 'active', unlock: 15, maxRank: 3, cd: 20, cost: { mana: 30 }, key: '6',
      desc: 'Detonate a huge burst centered on you and push foes out.', hot: false },
    { id: 'emberwork', name: 'Emberwork', kind: 'passive', unlock: 2, maxRank: 3, desc: '+Spell damage and +Mana.' },
    { id: 'veil', name: 'Arcane Veil', kind: 'passive', unlock: 6, maxRank: 3, desc: '+Mana regen and a little armor.' },
    { id: 'scholar', name: 'Scholar', kind: 'passive', unlock: 10, maxRank: 3, desc: 'Cooldowns run faster and rolls cost mana instead.' },
  ],
};

export function skillsFor(cls) { return SKILLS[cls]; }
export function hotSkills(cls) { return SKILLS[cls].filter((s) => s.hot); }
export function skillById(cls, id) { return SKILLS[cls].find((s) => s.id === id); }

export const C = { CLASS_LIST, CLASS_META, SKILLS, skillsFor, hotSkills, skillById };
