// Playable classes: attributes, growth, starting kit, skill list.
import { makeItem, BASES } from './items.js';

export const CLASSES = {
  warrior: {
    id: 'warrior', name: 'Warrior', role: 'Steel & Shield',
    color: '#c0503a', accent: '#e0a060',
    desc: 'A bulwark of the realm. Blocks and parries with the best of them, wades into the pack and never dies first.',
    base: { str: 14, dex: 8, int: 5, vit: 14 },
    growth: { str: 3, dex: 1, int: 1, vit: 2 },
    prof: ['sword', 'axe', 'mace', 'dagger'],
    gear: [['longsword', 0], ['kiteshield', 0], ['leathercap', 0], ['chainmail', 0], ['leggings', 0], ['boots', 0]],
    skills: ['cleave', 'charge', 'whirlwind', 'shieldwall', 'slam', 'execute', 'w_mastery', 'w_hide', 'w_shield'],
    stats: 'STR 14 · VIT 14 · heavy armour · shield parry',
  },
  ranger: {
    id: 'ranger', name: 'Ranger', role: 'Bow & Blade',
    color: '#4f8f4a', accent: '#9fd08a',
    desc: 'Death from a distance. Kites with rolls, plants traps and turns critical hits into a science.',
    base: { str: 8, dex: 15, int: 7, vit: 10 },
    growth: { str: 1, dex: 3, int: 1, vit: 2 },
    prof: ['bow', 'dagger', 'sword'],
    gear: [['shortbow', 0], ['quiver', 0], ['leathercap', 0], ['studded', 0], ['leggings', 0], ['boots', 0]],
    skills: ['doubleshot', 'volley', 'rollshot', 'snare', 'pierce', 'steadyaim', 'r_deadeye', 'r_swift', 'r_evasion'],
    stats: 'DEX 15 · ranged · dodge & traps',
  },
  mage: {
    id: 'mage', name: 'Mage', role: 'Ember & Frost',
    color: '#3f6fb0', accent: '#7fb6e8',
    desc: 'Fragile, furious. Blinks through danger and answers every problem with a larger explosion.',
    base: { str: 5, dex: 7, int: 16, vit: 9 },
    growth: { str: 1, dex: 1, int: 3, vit: 2 },
    prof: ['staff', 'wand'],
    gear: [['staff', 0], ['tomeshield', 0], ['circlet', 0], ['robe', 0], ['leggings', 0], ['boots', 0]],
    skills: ['firebolt', 'frostnova', 'chain', 'blink', 'firewall', 'meteor', 'm_focus', 'm_element', 'm_shield'],
    stats: 'INT 16 · spells · blink teleport',
  },
};
export const CLASS_LIST = Object.values(CLASSES);

export function startingKit(classId) {
  const c = CLASSES[classId];
  const eq = {};
  for (const [baseId, rarity] of c.gear) {
    const b = BASES.find((x) => x.id === baseId);
    const it = makeItem(baseId, Math.max(1, b ? b.lvl : 1), rarity, classId);
    eq[it.slot] = it;
  }
  return eq;
}
