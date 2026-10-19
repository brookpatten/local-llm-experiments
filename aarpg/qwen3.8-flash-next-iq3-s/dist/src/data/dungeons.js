// Dungeon definitions + biome art.
export const BIOMES = {
  cave: {
    floor: '#4a4238', floor2: '#3b342c', wall: '#5a5044', prop: '#6a5f4e',
    fog: '#241d15', fogDensity: 0.018, ambient: '#8a785c', sun: '#d8b888',
    props: ['stalagmite', 'mushroom', 'rubble', 'bones'],
  },
  crypt: {
    floor: '#3a3a40', floor2: '#2e2e34', wall: '#4a4a52', prop: '#8a8a94',
    fog: '#1b1e28', fogDensity: 0.02, ambient: '#78849c', sun: '#a8c0dc',
    props: ['tombstone', 'statue', 'rubble', 'bones', 'candelabra'],
  },
  forest: {
    floor: '#3d5230', floor2: '#334527', wall: '#2c3a22', prop: '#4f7a3a',
    fog: '#2c3a22', fogDensity: 0.0085, ambient: '#8aa874', sun: '#e8e8b8',
    props: ['tree', 'bush', 'log', 'mushroom', 'rubble'],
  },
  tower: {
    floor: '#4c4650', floor2: '#3e3942', wall: '#5c5562', prop: '#7a6f88',
    fog: '#221e2e', fogDensity: 0.016, ambient: '#8874a4', sun: '#c8b8e8',
    props: ['bookshelf', 'brazier', 'pillars', 'rubble'],
  },
  ice: {
    floor: '#5a7280', floor2: '#4a606c', wall: '#6a8898', prop: '#9fc0d0',
    fog: '#2a3a44', fogDensity: 0.014, ambient: '#8aa8c0', sun: '#e0f0ff',
    props: ['icicle', 'iceblock', 'rubble', 'bones'],
  },
  forge: {
    floor: '#3e2e28', floor2: '#332420', wall: '#4e3a30', prop: '#8a4a2a',
    fog: '#33190f', fogDensity: 0.016, ambient: '#a86840', sun: '#f09858',
    props: ['anvil', 'chain', 'rubble', 'brazier', 'bones'],
  },
};

export const OVERWORLD = {
  id: 'overworld', name: 'The Vale of Emberfall', biome: 'forest',
  size: 240, townAt: { x: 0, z: 0 },
  monsters: ['wolf', 'bandit', 'goblin', 'spider'],
  camps: [
    { x: -52, z: 44, monsters: ['goblin', 'gobarcher'], count: 7, name: 'Goblin Camp' },
    { x: 66, z: -38, monsters: ['bandit', 'bandit', 'shaman'], count: 8, name: 'Bandit Holdout' },
    { x: -70, z: -66, monsters: ['skeleton', 'zombie'], count: 9, name: 'Broken Graveyard' },
    { x: 84, z: 70, monsters: ['spider', 'wraith'], count: 8, name: 'Weaver Hollow' },
  ],
};

export const DUNGEONS = [
  {
    id: 'warrens', name: 'The Howling Warrens', biome: 'cave', tier: 1, level: [2, 6],
    pos: { x: 34, z: 46 }, entrance: 'cave', monsters: ['goblin', 'gobarcher', 'wolf'],
    boss: 'goblinking', rooms: 9, grid: 64, density: 0.55, quest: 'q_warrens',
    blurb: 'Gnawing in the dark. Barely worth a sword-swing — until they took the caravans.',
  },
  {
    id: 'barrow', name: 'The Sunken Barrow', biome: 'crypt', tier: 2, level: [7, 12],
    pos: { x: -58, z: -30 }, entrance: 'crypt', monsters: ['skeleton', 'zombie', 'spider', 'shaman'],
    boss: 'bonetyrant', rooms: 10, grid: 68, density: 0.55, quest: 'q_barrow',
    blurb: 'The old kings were buried here. Someone dug them up again.',
  },
  {
    id: 'grove', name: 'The Whispering Grove', biome: 'forest', tier: 3, level: [12, 17],
    pos: { x: -20, z: 78 }, entrance: 'grove', monsters: ['spider', 'wraith', 'bandit', 'shaman'],
    boss: 'hollowqueen', rooms: 11, grid: 72, density: 0.6, quest: 'q_grove',
    blurb: 'The trees lean in to listen. Travellers stop coming back.',
  },
  {
    id: 'spire', name: 'The Pale Spire', biome: 'tower', tier: 4, level: [18, 24],
    pos: { x: 78, z: -74 }, entrance: 'tower', monsters: ['wraith', 'golem', 'icecaller', 'shaman'],
    boss: 'frostwyrm', rooms: 12, grid: 72, density: 0.6, quest: 'q_spire',
    blurb: 'A wizard\'s tower that froze from the inside out.',
  },
  {
    id: 'deepforge', name: 'The Deepforge', biome: 'forge', tier: 5, level: [26, 34],
    pos: { x: -96, z: 62 }, entrance: 'forge', monsters: ['emberfiend', 'golem', 'warden', 'icecaller'],
    boss: 'emberlord', rooms: 13, grid: 76, density: 0.62, quest: 'q_forge',
    blurb: 'Where the Ember Wards were forged. Something down there wants them unmade.',
  },
];

export const DUNGEON_BY_ID = Object.fromEntries(DUNGEONS.map((d) => [d.id, d]));
