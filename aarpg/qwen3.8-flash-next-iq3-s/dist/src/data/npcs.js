// Town NPCs: placement, role, shop, dialogue.
export const NPCS = [
  {
    id: 'alda', name: 'Marshal Alda', role: 'garrison', model: 'captain', color: '#8a3a2e',
    heal: true,
    x: 6, z: -10, face: 0,
    greet: 'You look like someone who can hold a line. Good. The Vale is dying by inches.',
    lines: [
      'Five dungeons ring this valley and every one of them has gotten bolder since the Wards went out.',
      'Clear the Warrens first. Everything else is downstream of that.',
      'Parry, don\'t just block. Raise the shield a heartbeat before the blow lands — that\'s a stagger, and a stagger is a free kill.',
    ],
  },
  {
    id: 'bram', name: 'Bram Ironside', role: 'shop_weapons', model: 'smith', color: '#6a4a2a',
    stock: { slots: ['mainHand', 'offHand'], consumables: ['st'] },
    x: -16, z: -6, face: Math.PI / 2,
    greet: 'Steel\'s cheap. Good steel isn\'t. Have a look.',
    lines: [
      'Every blade I sell has been swung at something. That\'s worth a few coins.',
      'Two-handers hit like a cart avalanche. But you can\'t block with them, so mind your rolls.',
    ],
  },
  {
    id: 'yenna', name: 'Yenna Threadbare', role: 'shop_armor', model: 'armorer', color: '#3a5a6a',
    stock: { slots: ['head', 'chest', 'legs', 'hands', 'feet', 'offHand', 'ring1', 'amulet'] },
    x: 16, z: -6, face: -Math.PI / 2,
    greet: 'Armour! Buy it before you need it, which is the only time nobody does.',
    lines: [
      'Plate is heavy and heavy is honest — it tells you the truth about your Strength.',
      'Shields are the only armour that fights back. Get one with good block and learn the window.',
    ],
  },
  {
    id: 'corvin', name: 'Corvin', role: 'shop_potions', model: 'mage', color: '#4a3a7a',
    stock: { consumables: ['hp', 'mp', 'st', 'torch'] },
    x: -16, z: 12, face: Math.PI / 2,
    greet: 'Draughts, charms, and things that glow for no reason I will disclose.',
    lines: [
      'Bind potions to A and S. You will only remember that when you are dying.',
      'Stamina runs out faster than mana. Drink, or stop rolling through everything.',
    ],
  },
  {
    id: 'hobbes', name: 'Old Hobbes', role: 'tavern', model: 'taverner', color: '#6a5a3a',
    heal: true,
    x: 14, z: 14, face: -Math.PI / 2,
    greet: 'Ale\'s warm, news is free. Sit anywhere that isn\'t that corner.',
    lines: [
      'They say the Deepforge is where the Wards were hammered. Something down there remembers the forge-fires.',
      'Wraiths phase. Half their hits go through you — that\'s not a bug in the world, that\'s just wraiths.',
      'The Hollow Queen used to be a singer. Still is, in a way.',
    ],
  },
  {
    id: 'fenric', name: 'Fenric of the Gate', role: 'guard', model: 'guard', color: '#4a4a5a',
    x: 0, z: 26, face: 0,
    greet: 'Gate\'s open. World\'s not. Choose your direction carefully.',
    lines: [
      'Dungeon entrances are marked on your map. Press M.',
      'If you die in a dungeon you wake here in town. You keep your gear; you lose the walk back.',
    ],
  },
];
export const NPC_BY_ID = Object.fromEntries(NPCS.map((n) => [n.id, n]));

export const SHOP_STOCK = {
  shop_weapons: { slots: ['mainHand', 'offHand'], kinds: ['weapon', 'shield'], tag: 'Weapons & Shields' },
  shop_armor: { slots: ['head', 'chest', 'legs', 'hands', 'feet', 'ring1', 'ring2', 'amulet'], kinds: ['armor', 'jewelry'], tag: 'Armour & Trinkets' },
  shop_potions: { consumables: true, slots: [], tag: 'Draughts & Charms' },
};
