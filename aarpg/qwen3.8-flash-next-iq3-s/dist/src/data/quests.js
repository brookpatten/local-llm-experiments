// Quests. Objective types: killBoss, killCount, chest, clear (kill every monster in an area).
export const QUESTS = {
  q_warrens: {
    id: 'q_warrens', name: 'Gnawing in the Dark', giver: 'alda', level: 1, main: true,
    desc: 'Grishnak the Greedy runs the Warrens east of town. Break his war bands and end him.',
    objective: { type: 'killBoss', target: 'goblinking', area: 'warrens' },
    reward: { gold: 220, xp: 260, item: { slot: 'chest', ilvl: 7 } },
    hint: 'The Howling Warrens lie east of the gate.', next: 'q_barrow',
  },
  q_barrow: {
    id: 'q_barrow', name: 'The Sunken Barrow', giver: 'alda', level: 6, main: true,
    desc: 'Something is raising the old kings. Go into the Barrow and put the Bone Tyrant to rest.',
    objective: { type: 'killBoss', target: 'bonetyrant', area: 'barrow' },
    reward: { gold: 600, xp: 700, item: { slot: 'offHand', ilvl: 14 } },
    hint: 'The Sunken Barrow waits in the western fields.', next: 'q_grove',
  },
  q_grove: {
    id: 'q_grove', name: 'The Whispering Grove', giver: 'alda', level: 12, main: true,
    desc: 'The Hollow Queen wears a crown of antlers and steals voices. Find her throne room.',
    objective: { type: 'killBoss', target: 'hollowqueen', area: 'grove' },
    reward: { gold: 1200, xp: 1500, item: { slot: 'amulet', ilvl: 20 } },
    hint: 'The Whispering Grove grows north of the lake.', next: 'q_spire',
  },
  q_spire: {
    id: 'q_spire', name: 'The Pale Spire', giver: 'alda', level: 18, main: true,
    desc: 'Vaelthris froze a wizard\'s tower from the inside out. Melt it.',
    objective: { type: 'killBoss', target: 'frostwyrm', area: 'spire' },
    reward: { gold: 2400, xp: 3000, item: { slot: 'mainHand', ilvl: 27 } },
    hint: 'The Pale Spire stands on the north-east ridge.', next: 'q_forge',
  },
  q_forge: {
    id: 'q_forge', name: 'The Deepforge', giver: 'alda', level: 26, main: true,
    desc: 'Kar Vhoor wants the Ember Wards unmade. Reach the Deepforge and end the Ember Lord.',
    objective: { type: 'killBoss', target: 'emberlord', area: 'deepforge' },
    reward: { gold: 5000, xp: 6000, item: { slot: 'mainHand', ilvl: 36, rarity: 3 } },
    hint: 'The Deepforge yawns open in the western mountains.',
  },
  q_wolves: {
    id: 'q_wolves', name: 'Wolf Season', giver: 'hobbes', level: 1,
    desc: 'Ash wolves drag people off the road. Cull eight of them anywhere in the Vale.',
    objective: { type: 'killCount', target: 'wolf', count: 8 },
    reward: { gold: 140, xp: 180 },
  },
  q_bandits: {
    id: 'q_bandits', name: 'Bounty: Road Bandits', giver: 'fenric', level: 3,
    desc: 'Bandits work the eastern road. Kill six and the gate will sleep easier.',
    objective: { type: 'killCount', target: 'bandit', count: 6 },
    reward: { gold: 260, xp: 300, item: { slot: 'ring1', ilvl: 10 } },
  },
  q_bones: {
    id: 'q_bones', name: 'Restless Bones', giver: 'corvin', level: 6,
    desc: 'Bring me six skulls from the Barrow. For research. Do not ask which research.',
    objective: { type: 'killCount', target: 'skeleton', count: 6, area: 'barrow' },
    reward: { gold: 380, xp: 480, item: { slot: 'hands', ilvl: 13 } },
  },
  q_relic: {
    id: 'q_relic', name: 'The Gilded Reliquary', giver: 'yenna', level: 9,
    desc: 'My mother\'s reliquary is somewhere in the Barrow, in a chest. Bring it home.',
    objective: { type: 'chest', target: 'barrow', count: 2 },
    reward: { gold: 500, xp: 620, item: { slot: 'amulet', ilvl: 16 } },
  },
  q_weavers: {
    id: 'q_weavers', name: 'Weaver Hollow', giver: 'bram', level: 10,
    desc: 'Clear eight Crypt Weavers out of the hollow south-east and I\'ll forge you something sharp.',
    objective: { type: 'killCount', target: 'spider', count: 8 },
    reward: { gold: 620, xp: 760, item: { slot: 'mainHand', ilvl: 18 } },
  },
};
export const QUEST_LIST = Object.values(QUESTS);
export const questsByGiver = (npc) => QUEST_LIST.filter((q) => q.giver === npc);
