// The town of Emberfall: walls, buildings, plaza, shops.
import { box, buildBuilding, buildProp, mat, cyl, cone } from '../entities/meshes.js';
import { NPCS } from '../data/npcs.js';

const B = () => window.BABYLON;

export const TOWN = { x: 0, z: 0, r: 30 };

export function buildTown(game, world) {
  const scene = game.scene;
  const root = new (B()).TransformNode('town', scene);
  root.parent = world.root;
  const wallColor = '#7a6f5c', roofColor = '#6a3a2a';

  // ---- town wall ring (with a gate to the south) ---------------------------
  const seg = (x, z, w, d) => {
    const h = 4.5;
    const m = box(scene, { w, h, d, x, y: h / 2, z, color: wallColor, parent: root, name: 'wall' });
    m.freezeWorldMatrix();
    world.blockRect(x - w / 2, z - d / 2, x + w / 2, z + d / 2);
    // crenellations
    for (let i = -w / 2; i <= w / 2 - 1; i += 2) {
      const c = box(scene, { w: 1, h: 0.8, d, x: x + i + 0.5, y: h + 0.4, z, color: '#8a7f6a', parent: root });
      c.freezeWorldMatrix();
    }
  };
  const R = TOWN.r;
  // north wall (z = -R), south wall split for the gate
  seg(0, -R, R * 2, 1.6);
  seg(-R * 0.75 - 4, R, R * 0.5 - 8, 1.6);
  seg(R * 0.75 + 4, R, R * 0.5 - 8, 1.6);
  seg(-R, 0, 1.6, R * 2);
  seg(R, 0, 1.6, R * 2);
  // gate towers
  for (const sx of [-7, 7]) {
    const t = buildBuilding(scene, { w: 5, d: 5, h: 7, wall: wallColor, roof: roofColor, x: sx, z: R, parent: root, tower: true, door: false, name: 'gate' + sx });
    world.blockCircle(sx, R, 3.4);
  }
  // gate arch
  const arch = box(scene, { w: 12, h: 1.2, d: 1.6, x: 0, y: 5.2, z: R, color: '#8a7f6a', parent: root });
  arch.freezeWorldMatrix();

  // ---- buildings -----------------------------------------------------------
  const buildings = [
    { id: 'b_smith', name: 'Blacksmith', x: -18, z: -8, w: 9, d: 8, h: 4.5, ry: Math.PI / 2, roof: '#5a3a2a' },
    { id: 'b_armor', name: 'Armoury', x: 18, z: -8, w: 9, d: 8, h: 4.5, ry: -Math.PI / 2, roof: '#4a4a5a' },
    { id: 'b_ala', name: 'Alchemist', x: -18, z: 14, w: 8, d: 8, h: 4, ry: Math.PI / 2, roof: '#3a4a5a' },
    { id: 'b_tavern', name: 'The Ember Tankard', x: 18, z: 15, w: 11, d: 9, h: 5, ry: -Math.PI / 2, roof: '#6a4a2a' },
    { id: 'b_garrison', name: 'Garrison', x: 0, z: -20, w: 12, d: 9, h: 5.5, ry: 0, roof: '#6a3a2a' },
    { id: 'b_house1', name: 'Cottage', x: -8, z: 4, w: 6, d: 6, h: 3.5, ry: 0.2 },
    { id: 'b_house2', name: 'Cottage', x: 9, z: 3, w: 6, d: 6, h: 3.5, ry: -0.3 },
    { id: 'b_house3', name: 'Cottage', x: -6, z: 21, w: 6, d: 6, h: 3.5, ry: 0.6 },
    { id: 'b_store', name: 'Storehouse', x: 7, z: -16, w: 7, d: 6, h: 4, ry: 0.1 },
  ];
  for (const b of buildings) {
    const node = buildBuilding(scene, {
      w: b.w, d: b.d, h: b.h, wall: '#8a7a62', roof: b.roof || roofColor,
      x: b.x, z: b.z, ry: b.ry, parent: root, name: b.id,
    });
    world.blockCircle(b.x, b.z, Math.max(b.w, b.d) * 0.62);
    for (const m of node.getChildMeshes()) m.freezeWorldMatrix();
  }

  // ---- plaza ---------------------------------------------------------------
  const plaza = (B()).MeshBuilder.CreateDisc('plaza', { radius: 11, tessellation: 12 }, scene);
  plaza.rotation.x = Math.PI / 2;
  plaza.material = mat(scene, '#8a7a5e');
  plaza.position.set(0, world.heightAt(0, 0) + 0.04, 0);
  plaza.parent = root;
  plaza.isPickable = false;
  world.blockCircle(0, 0, 1.6);

  const well = buildProp(scene, 'well', '#6a6258', 1.1, root);
  well.position.set(0, world.heightAt(0, 0), 0);
  world.blockCircle(0, 0, 1.8);

  for (const [bx, bz] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) {
    const b = buildProp(scene, 'brazier', '#8a4a2a', 1, root);
    b.position.set(bx, world.heightAt(bx, bz), bz);
    const l = game.makeLight('#ffb060', 10, 0.9);
    l.parent = b;
    l.position.set(0, 1.8, 0);
    world.lights.push(l);
  }

  for (const [sx, sz, ry] of [[-12, 26, 0.3], [12, 26, -0.3]]) {
    const bn = buildProp(scene, 'banner', '#8a3a2a', 1, root);
    bn.position.set(sx, world.heightAt(sx, sz), sz);
    bn.rotation.y = ry;
  }

  // crates/barrels for clutter
  for (const [cx, cz, k] of [[-14, -3, 'crate'], [-13, -4, 'barrel'], [14, -3, 'crate'], [15, -4, 'barrel'], [-14, 10, 'barrel'], [14, 10, 'crate'], [2, -18, 'crate']]) {
    const p = buildProp(scene, k, '#6a4a2a', 1, root);
    p.position.set(cx, world.heightAt(cx, cz), cz);
    p.rotation.y = Math.random() * 3;
  }

  // signposts pointing to dungeons
  for (const d of game.dungeonDefs) {
    const a = Math.atan2(d.pos.x, d.pos.z);
    const sx = Math.sin(a) * (R - 4), sz = Math.cos(a) * (R - 4);
    const sp = buildProp(scene, 'signpost', '#8a6a3a', 1, root);
    sp.position.set(sx, world.heightAt(sx, sz), sz);
    sp.rotation.y = a;
  }

  return { root, npcs: NPCS };
}
