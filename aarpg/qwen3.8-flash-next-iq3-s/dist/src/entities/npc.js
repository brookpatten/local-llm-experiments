// Town NPCs: static actors with idle animation + interaction radius.
import { Actor } from './actor.js';
import { buildWeapon, buildShieldMesh, buildProp } from './meshes.js';

const MODEL_GEAR = {
  captain: { weapon: 'sword', shield: true },
  guard: { weapon: 'spear', shield: true },
  smith: { weapon: 'mace' },
  armorer: {},
  mage: { weapon: 'staff' },
  taverner: {},
};

export class Npc extends Actor {
  constructor(game, def) {
    super(game, {
      x: def.x, z: def.z, shape: 'humanoid', color: def.color, scale: 1.02, radius: 0.45,
      facing: def.face || 0,
      rigOpts: { helm: def.model === 'guard' ? '#5a5a62' : null },
    });
    this.def = def;
    this.name = def.name;
    this.role = def.role;
    this.interactRadius = 2.8;
    this.gear = [];
    const g = MODEL_GEAR[def.model] || {};
    if (g.weapon) this.gear.push(buildWeapon(this.scene, g.weapon, '#9a9aa2', 0.95, this.rig.handR));
    if (g.shield) {
      const s = buildShieldMesh(this.scene, '#6a5a42', 0.95, this.rig.handL);
      s.rotation.y = Math.PI / 2;
      s.position.z = -0.1;
      this.gear.push(s);
    }
    this.prop = null;
    if (def.model === 'smith') this.prop = buildProp(this.scene, 'anvil', '#5a5a5a', 1, null);
    if (def.model === 'taverner') this.prop = buildProp(this.scene, 'barrel', '#6a4a2a', 1, null);
    if (this.prop) {
      this.prop.parent = this.root;
      this.prop.position.set(1.5, 0, -0.9);
    }
    this.facing = def.face || 0;
    this.sync();
  }

  update(dt) {
    this.setState('idle');
    this.animate(dt);
  }
}
