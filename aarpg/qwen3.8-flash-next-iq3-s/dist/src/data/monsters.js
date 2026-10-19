// Enemy archetypes. `shape` selects a low-poly builder in entities/meshes.js.
export const MONSTERS = {
  goblin: {
    id: 'goblin', name: 'Cave Goblin', level: 2, tier: 1, hp: 26, dmg: [3, 6], armor: 2, speed: 3.6,
    aggro: 11, atkRange: 2.1, windup: 0.55, atkCd: 1.6, xp: 12, gold: [3, 9], shape: 'goblinoid',
    color: '#5c7a3a', scale: 0.82, radius: 0.42, drop: 0.22,
  },
  gobarcher: {
    id: 'gobarcher', name: 'Goblin Slinger', level: 3, tier: 1, hp: 20, dmg: [3, 7], armor: 1, speed: 3.4,
    aggro: 14, atkRange: 12, windup: 0.7, atkCd: 2.2, xp: 15, gold: [4, 11], shape: 'goblinoid',
    color: '#4d6b34', scale: 0.8, radius: 0.4, drop: 0.24, ranged: 'stone', projSpeed: 16, keepAway: 7,
  },
  skeleton: {
    id: 'skeleton', name: 'Rattling Bones', level: 4, tier: 1, hp: 34, dmg: [5, 9], armor: 4, speed: 3.2,
    aggro: 10, atkRange: 2.1, windup: 0.62, atkCd: 1.7, xp: 18, gold: [4, 12], shape: 'skeleton',
    color: '#d8d2bd', scale: 0.95, radius: 0.42, drop: 0.25,
  },
  zombie: {
    id: 'zombie', name: 'Grave Shambler', level: 5, tier: 1, hp: 58, dmg: [7, 11], armor: 3, speed: 2.1,
    aggro: 9, atkRange: 2.2, windup: 0.85, atkCd: 2.1, xp: 22, gold: [5, 14], shape: 'zombie',
    color: '#6b7a52', scale: 1.0, radius: 0.46, drop: 0.25, knockbackResist: 0.5,
  },
  wolf: {
    id: 'wolf', name: 'Ash Wolf', level: 4, tier: 1, hp: 30, dmg: [5, 9], armor: 1, speed: 5.4,
    aggro: 13, atkRange: 2.0, windup: 0.4, atkCd: 1.3, xp: 20, gold: [2, 6], shape: 'wolf',
    color: '#6a5a4a', scale: 0.9, radius: 0.45, drop: 0.2, lunge: 6,
  },
  spider: {
    id: 'spider', name: 'Crypt Weaver', level: 7, tier: 2, hp: 46, dmg: [8, 13], armor: 4, speed: 4.4,
    aggro: 12, atkRange: 2.2, windup: 0.5, atkCd: 1.5, xp: 32, gold: [8, 18], shape: 'spider',
    color: '#3b2f3f', scale: 1.0, radius: 0.55, drop: 0.3, poison: 3,
  },
  bandit: {
    id: 'bandit', name: 'Road Bandit', level: 8, tier: 2, hp: 62, dmg: [10, 16], armor: 8, speed: 4.0,
    aggro: 13, atkRange: 2.3, windup: 0.55, atkCd: 1.5, xp: 40, gold: [14, 34], shape: 'humanoid',
    color: '#7a4a3a', scale: 1.0, radius: 0.44, drop: 0.35, weapon: 'sword',
  },
  shaman: {
    id: 'shaman', name: 'Bone Shaman', level: 10, tier: 2, hp: 58, dmg: [10, 16], armor: 5, speed: 3.0,
    aggro: 16, atkRange: 13, windup: 0.9, atkCd: 2.6, xp: 52, gold: [12, 30], shape: 'humanoid',
    color: '#6a4a7a', scale: 1.0, radius: 0.44, drop: 0.35, ranged: 'hex', projSpeed: 12, keepAway: 9, heal: true,
  },
  wraith: {
    id: 'wraith', name: 'Hollow Wraith', level: 13, tier: 3, hp: 80, dmg: [15, 22], armor: 8, speed: 4.6,
    aggro: 15, atkRange: 2.4, windup: 0.5, atkCd: 1.5, xp: 70, gold: [16, 40], shape: 'wraith',
    color: '#7fa8c8', scale: 1.1, radius: 0.5, drop: 0.4, blink: 7, ethereal: 0.2,
  },
  golem: {
    id: 'golem', name: 'Stone Golem', level: 15, tier: 3, hp: 190, dmg: [22, 32], armor: 22, speed: 2.4,
    aggro: 11, atkRange: 2.8, windup: 1.0, atkCd: 2.4, xp: 110, gold: [25, 60], shape: 'golem',
    color: '#7d7468', scale: 1.5, radius: 0.8, drop: 0.45, knockbackResist: 1, staggerResist: 0.7,
  },
  icecaller: {
    id: 'icecaller', name: 'Ice Caller', level: 18, tier: 4, hp: 130, dmg: [24, 34], armor: 14, speed: 3.2,
    aggro: 18, atkRange: 15, windup: 1.0, atkCd: 2.4, xp: 150, gold: [30, 70], shape: 'humanoid',
    color: '#4a7fa8', scale: 1.15, radius: 0.5, drop: 0.5, ranged: 'ice', projSpeed: 15, keepAway: 11, slow: 3,
  },
  emberfiend: {
    id: 'emberfiend', name: 'Ember Fiend', level: 22, tier: 4, hp: 170, dmg: [30, 44], armor: 18, speed: 4.2,
    aggro: 16, atkRange: 2.6, windup: 0.6, atkCd: 1.4, xp: 210, gold: [40, 90], shape: 'fiend',
    color: '#b0442a', scale: 1.2, radius: 0.6, drop: 0.5, burn: 5,
  },
  warden: {
    id: 'warden', name: 'Rune Warden', level: 26, tier: 5, hp: 320, dmg: [40, 58], armor: 34, speed: 3.0,
    aggro: 14, atkRange: 3.0, windup: 0.9, atkCd: 2.0, xp: 320, gold: [60, 140], shape: 'golem',
    color: '#4a5a6a', scale: 1.7, radius: 0.9, drop: 0.6, knockbackResist: 1, staggerResist: 0.85, slam: true,
  },
};

// ---- bosses --------------------------------------------------------------
export const BOSSES = {
  goblinking: {
    id: 'goblinking', name: 'Grishnak the Greedy', level: 6, tier: 2, boss: true, hp: 320, dmg: [12, 20], armor: 10,
    speed: 3.8, aggro: 18, atkRange: 2.8, windup: 0.7, atkCd: 1.8, xp: 260, gold: [180, 320], shape: 'goblinoid',
    color: '#7a9a3a', scale: 1.6, radius: 0.8, drop: 1.0, summons: 'goblin', slam: true, crown: true,
  },
  bonetyrant: {
    id: 'bonetyrant', name: 'The Bone Tyrant', level: 12, tier: 3, boss: true, hp: 620, dmg: [22, 34], armor: 20,
    speed: 3.2, aggro: 20, atkRange: 3.0, windup: 0.8, atkCd: 1.7, xp: 620, gold: [320, 560], shape: 'skeleton',
    color: '#e8e2cc', scale: 1.9, radius: 0.9, drop: 1.0, summons: 'skeleton', slam: true, crown: true,
  },
  hollowqueen: {
    id: 'hollowqueen', name: 'The Hollow Queen', level: 18, tier: 4, boss: true, hp: 1050, dmg: [34, 50], armor: 26,
    speed: 4.2, aggro: 22, atkRange: 3.2, windup: 0.65, atkCd: 1.5, xp: 1200, gold: [600, 1000], shape: 'wraith',
    color: '#9fc8e8', scale: 2.0, radius: 1.0, drop: 1.0, blink: 9, summons: 'wraith', crown: true,
  },
  frostwyrm: {
    id: 'frostwyrm', name: 'Vaelthris, the Frost Wyrm', level: 25, tier: 5, boss: true, hp: 1800, dmg: [48, 70], armor: 40,
    speed: 3.4, aggro: 24, atkRange: 4.0, windup: 0.9, atkCd: 1.8, xp: 2400, gold: [1100, 1900], shape: 'wyrm',
    color: '#4a8fb0', scale: 2.4, radius: 1.3, drop: 1.0, ranged: 'ice', projSpeed: 20, breath: true, crown: true,
  },
  emberlord: {
    id: 'emberlord', name: 'Kar Vhoor, the Ember Lord', level: 32, tier: 5, boss: true, hp: 3000, dmg: [66, 96], armor: 55,
    speed: 3.6, aggro: 26, atkRange: 4.2, windup: 0.85, atkCd: 1.6, xp: 4200, gold: [2000, 3600], shape: 'fiend',
    color: '#c8502a', scale: 2.6, radius: 1.4, drop: 1.0, ranged: 'fire', projSpeed: 18, breath: true, summons: 'emberfiend', crown: true,
  },
};

export const ALL_MONSTERS = { ...MONSTERS, ...BOSSES };

// Scale an archetype to a target level (dungeons push monster levels up).
export function scaleMonster(def, level) {
  const k = Math.max(1, level) / def.level;
  if (k <= 1.001) return def;
  const hpMul = Math.pow(k, 1.35), dmgMul = Math.pow(k, 1.15);
  return {
    ...def,
    level,
    hp: Math.round(def.hp * hpMul),
    dmg: [Math.round(def.dmg[0] * dmgMul), Math.round(def.dmg[1] * dmgMul)],
    armor: Math.round(def.armor * k),
    xp: Math.round(def.xp * Math.pow(k, 1.1)),
    gold: [Math.round(def.gold[0] * k), Math.round(def.gold[1] * k)],
    scaled: true,
  };
}
