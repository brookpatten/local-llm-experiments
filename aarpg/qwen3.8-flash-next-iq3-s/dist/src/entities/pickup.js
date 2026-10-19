// Ground loot: gold coins and items. Auto-pickup on contact, rarity beams.
import { buildItemMesh, disposeTree, mat } from './meshes.js';
import { dist } from '../core/math.js';
import { sfx } from '../core/audio.js';

const B = () => window.BABYLON;
const RARITY_COLORS = ['#cfc7b6', '#6fa8dc', '#f0d060', '#f08a2c'];

export class Pickup {
  constructor(game, kind, payload, x, z, opts = {}) {
    this.game = game;
    this.kind = kind; // 'gold' | 'item'
    this.payload = payload;
    this.x = x; this.z = z;
    this.y = 0;
    this.t = Math.random() * 3;
    this.life = opts.life || Infinity;
    this.removed = false;
    this.vy = opts.pop ? 3.2 : 0;
    this.vx = opts.pop ? (Math.random() - 0.5) * 3 : 0;
    this.vz = opts.pop ? (Math.random() - 0.5) * 3 : 0;
    this.magnet = false;
    this.radius = 0.9;

    const color = kind === 'gold' ? '#e0b040' : RARITY_COLORS[(payload.rarity || 0)];
    const gfx = kind === 'gold' ? 'coin' : payload.gfx;
    this.node = buildItemMesh(game.scene, gfx, color, kind === 'gold' ? 1 : 1.1, null);
    this.node.position.set(x, 0.2, z);
    for (const m of this.node.getChildMeshes()) { m.isPickable = true; m.metadata = { pickup: this }; }

    const rarity = kind === 'item' ? (payload.rarity || 0) : 0;
    if (rarity >= 1) {
      const beam = (B()).MeshBuilder.CreateCylinder('beam', { diameter: 0.7, height: 7, tessellation: 8 }, game.scene);
      beam.material = mat(game.scene, color, { alpha: 0.16 + rarity * 0.06, emissive: color });
      beam.position.set(x, 3.5, z);
      beam.isPickable = false;
      this.beam = beam;
    }
    this.color = color;
  }

  update(dt, player) {
    this.t += dt;
    this.life -= dt;
    if (this.life <= 0) { this.remove(); return; }

    if (this.vy !== 0 || this.vx || this.vz) {
      this.vy -= 14 * dt;
      this.x += this.vx * dt; this.z += this.vz * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; this.vx *= 0.4; this.vz *= 0.4; }
      this.vx *= (1 - 3 * dt); this.vz *= (1 - 3 * dt);
    }

    const d = dist(this.x, this.z, player.x, player.z);
    if (!this.magnet && d < 3.2) this.magnet = true;
    if (this.magnet) {
      const speed = Math.max(2, 14 - d * 2);
      const a = Math.atan2(player.x - this.x, player.z - this.z);
      this.x += Math.sin(a) * speed * dt;
      this.z += Math.cos(a) * speed * dt;
      this.y = Math.max(this.y, 0.2);
    }

    const bob = Math.sin(this.t * 2.6) * 0.08 + 0.25;
    this.node.position.set(this.x, this.y + bob, this.z);
    this.node.rotation.y += dt * 1.4;
    if (this.beam) this.beam.position.set(this.x, 3.5, this.z);
    if (this.life < 120 && this.life !== Infinity) {
      // blink out shortly before despawning so the ground does not litter forever
      const on = this.life > 10 || Math.floor(this.life * 5) % 2 === 0;
      this.node.setEnabled(on);
      if (this.beam) this.beam.setEnabled(on);
    }

    if (d < 0.9) this.collect(player);
  }

  collect(player) {
    if (this.removed) return;
    if (this.kind === 'gold') {
      const amount = Math.round(this.payload * (player.state.stats.goldFind || 1));
      player.state.gold += amount;
      this.game.log(`+${amount} gold`, 'loot');
      this.game.ui.goldBump();
      sfx('coin');
      this.game.ui.floatText(this.x, this.y + 1, this.z, '+' + amount, '#ffd870');
    } else {
      const added = this.game.items.addToInventory(this.payload);
      if (!added) {
        this.game.log('Inventory full — sell something first', 'bad');
        return;
      }
      sfx(this.payload.rarity >= 2 ? 'rare' : 'loot');
      this.game.log(`Picked up ${this.payload.displayName || this.payload.title}`, ['normal', 'magic', 'rare', 'legend'][this.payload.rarity]);
      this.game.ui.flashItem(this.payload);
    }
    this.remove();
  }

  remove() {
    this.removed = true;
    disposeTree(this.node);
    if (this.beam) this.beam.dispose();
  }
}
