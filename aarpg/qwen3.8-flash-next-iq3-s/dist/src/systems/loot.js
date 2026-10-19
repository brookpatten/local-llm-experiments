// Loot generation, drops, inventory helpers, shop stock.
import { generateItem, CONSUMABLES, RARITY, BASES, itemScore } from '../data/items.js';
import { RNG } from '../core/rng.js';
import { Pickup } from '../entities/pickup.js';

export class ItemSystem {
  constructor(game) {
    this.game = game;
    this.rng = new RNG((Math.random() * 1e9) | 0);
  }

  consumableEffect(id) { const c = CONSUMABLES[id]; return c ? c.effect : null; }

  makeItem(ilvl, opts = {}) { return generateItem(this.rng, ilvl, opts); }

  spawnItem(item, x, z, opts = {}) {
    const p = new Pickup(this.game, 'item', item, x + (Math.random() - 0.5) * 0.6, z + (Math.random() - 0.5) * 0.6, opts);
    this.game.pickups.push(p);
    return p;
  }

  spawnGold(amount, x, z, opts = {}) {
    const coins = Math.min(5, 1 + Math.floor(Math.log10(Math.max(1, amount)) * 1.4));
    const per = Math.max(1, Math.round(amount / coins));
    for (let i = 0; i < coins; i++) {
      this.game.pickups.push(new Pickup(this.game, 'gold', per, x + (Math.random() - 0.5) * 1.2, z + (Math.random() - 0.5) * 1.2, opts));
    }
  }

  // Roll drops for a killed monster.
  dropForMonster(m) {
    const ilvl = m.level + this.rng.int(-1, 2);
    const dropChance = (m.def.drop || 0.25) * (m.elite ? 1.6 : 1);
    const gold = this.rng.int(m.def.gold[0], m.def.gold[1]) * (m.elite ? 2 : 1);
    if (gold > 0) this.spawnGold(gold, m.x, m.z, { pop: true, life: 300 });

    if (m.boss) {
      const n = 2 + this.rng.int(0, 2);
      for (let i = 0; i < n; i++) {
        const it = this.makeItem(ilvl + this.rng.int(0, 3), { rarity: this.rng.weighted([[1, 20], [2, 45], [3, 35]]), classId: this.game.player.state.classId, rarityBoost: true });
        this.spawnItem(it, m.x, m.z, { pop: true, life: 300 });
      }
      this.game.log(`${m.name} is dead.`, 'good');
      return;
    }
    if (this.rng.chance(dropChance)) {
      const it = this.makeItem(ilvl, { classId: this.game.player.state.classId, rarityBoost: m.elite ? 1 : 0 });
      this.spawnItem(it, m.x, m.z, { pop: true, life: 300 });
    }
    if (m.elite) {
      const it = this.makeItem(ilvl + 2, { classId: this.game.player.state.classId, rarity: this.rng.weighted([[2, 50], [3, 50]]) });
      this.spawnItem(it, m.x, m.z, { pop: true, life: 300 });
    }
    // potions occasionally
    if (this.rng.chance(0.12)) {
      const p = this.game.pickups;
      p.push(new Pickup(this.game, 'item', consumableItem(this.rng.chance(0.6) ? 'hp' : 'mp'), m.x, m.z, { pop: true, life: 40 }));
    }
  }

  chestLoot(x, z, ilvl, quality = 0) {
    const n = 1 + this.rng.int(0, 1) + (quality ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const it = this.makeItem(ilvl + this.rng.int(0, 2), {
        classId: this.game.player.state.classId,
        rarity: quality ? this.rng.weighted([[1, 25], [2, 45], [3, 30]]) : undefined,
        rarityBoost: quality,
      });
      this.spawnItem(it, x, z, { pop: true });
    }
    this.spawnGold(this.rng.int(20, 80) * ilvl, x, z, { pop: true });
  }

  addToInventory(item) {
    const inv = this.game.player.state.inventory;
    if (inv.length >= 50) return false;
    inv.push(item);
    this.game.ui.inventoryDirty = true;
    return true;
  }

  // Rotating shop stock, deterministic per shop+level.
  shopStock(shopId, playerLevel, slots) {
    const seed = 'shop:' + shopId + ':' + Math.floor(playerLevel / 2);
    const rng = new RNG(RNG.hash(seed));
    const items = [];
    const ilvl = Math.max(2, playerLevel + 2);
    const list = slots && slots.length ? slots : ['mainHand', 'offHand', 'head', 'chest', 'legs', 'hands', 'feet', 'ring1', 'amulet'];
    for (let i = 0; i < 12; i++) {
      const slot = rng.pick(list);
      items.push(generateItem(rng, ilvl + rng.int(-2, 3), { slot, classId: this.game.player.state.classId }));
    }
    items.sort((a, b) => itemScore(b) - itemScore(a));
    return items;
  }
}

export function consumableItem(id) {
  const c = CONSUMABLES[id];
  return { uid: 'c' + Math.random().toString(36).slice(2, 8), base: 'consumable_' + id, slot: 'belt', gfx: c.gfx, rarity: 0, ilvl: 1, name: c.name, title: c.name, displayName: c.name, consumable: id, value: c.price, mods: {}, req: {} };
}
