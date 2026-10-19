// The overworld: terrain, lake, forest, town, dungeon entrances, monster camps.
import { Grid } from './grid.js';
import { makeNoise } from './noise.js';
import { mergeByMaterial } from './merge.js';
import { buildTown, TOWN } from './town.js';
import { buildProp, box, cyl, cone, mat, sph } from '../entities/meshes.js';
import { OVERWORLD, DUNGEONS, BIOMES } from '../data/dungeons.js';
import { RNG } from '../core/rng.js';
import { clamp } from '../core/math.js';

const B = () => window.BABYLON;

export function buildOverworld(game) {
  const scene = game.scene;
  const rng = new RNG(1337);
  const noise = makeNoise(90210);
  const size = OVERWORLD.size;
  const half = size / 2;

  const lake = { x: 62, z: 58, r: 26 };

  const heightAt = (x, z) => {
    const d = Math.hypot(x, z);
    const flat = clamp((d - 36) / 26, 0, 1);
    let h = noise(x, z, 0.011, 1, 3) * 5.5 * flat;
    h += noise(x, z, 0.05, 1, 2) * 0.9 * flat;
    // lake basin
    const dl = Math.hypot(x - lake.x, z - lake.z);
    if (dl < lake.r) h -= (1 - dl / lake.r) * 6.5;
    // gentle rise toward the map edge
    const edge = clamp((d - half * 0.7) / (half * 0.3), 0, 1);
    h += edge * 6;
    return h;
  };

  const world = {
    id: 'overworld',
    name: OVERWORLD.name,
    biome: BIOMES.forest,
    scene,
    root: new (B()).TransformNode('world_overworld', scene),
    grid: new Grid(size, size, 1, -half, -half),
    heightAt,
    lights: [],
    exits: [],
    camps: OVERWORLD.camps,
    chests: [],
    shrines: [],
    spawn: { x: 0, z: 20 },
    staticMeshes: [],
    props: [],
    town: null,
    dispose() {
      for (const l of this.lights) l.dispose();
      for (const m of this.staticMeshes) { try { m.dispose(); } catch (e) { /* ignore */ } }
      try { this.root.dispose(); } catch (e) { /* ignore */ }
      if (this.ground) this.ground.dispose();
      if (this.water) this.water.dispose();
    },
    blockCircle(x, z, r) { this.grid.blockCircle(x, z, r); },
    blockRect(x0, z0, x1, z1) { this.grid.blockRect(x0, z0, x1, z1); },
  };

  // ---- terrain mesh --------------------------------------------------------
  const sub = 72;
  const ground = (B()).MeshBuilder.CreateGround('ground', { width: size, height: size, subdivisions: sub }, scene);
  const positions = ground.getPositionData ? ground.getPositionData() : ground.getVerticesData((B()).VertexBuffer.PositionKind);
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], z = positions[i + 2];
    positions[i + 1] = heightAt(x, z);
  }
  ground.updateVerticesData((B()).VertexBuffer.PositionKind, positions);
  const normals = new Float32Array(positions.length);
  (B()).VertexData.ComputeNormals(positions, ground.getIndices(), normals);
  ground.setVerticesData((B()).VertexBuffer.NormalKind, normals);
  // vertex colours: grass / dirt / rock / sand
  const colors = [];
  const cGrass = (B()).Color3.FromHexString('#4f7a3a');
  const cGrass2 = (B()).Color3.FromHexString('#5d8a44');
  const cDirt = (B()).Color3.FromHexString('#6a5a3a');
  const cRock = (B()).Color3.FromHexString('#6a6558');
  const cSand = (B()).Color3.FromHexString('#a89868');
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2];
    const dl = Math.hypot(x - lake.x, z - lake.z);
    let c;
    if (dl < lake.r + 2) c = cSand;
    else if (y > 4.5) c = cRock;
    else {
      const t = noise(x * 1.7, z * 1.7, 0.2, 1, 1);
      c = t > 0 ? cGrass2 : cGrass;
    }
    // paths out of town are trampled
    for (const d of DUNGEONS) {
      const dd = distToSeg(x, z, 0, TOWN.r, d.pos.x, d.pos.z);
      if (dd < 2.6) c = cDirt;
    }
    if (Math.hypot(x, z) < TOWN.r + 1) c = cDirt;
    colors.push(c.r, c.g, c.b, 1);
  }
  ground.setVerticesData((B()).VertexBuffer.ColorKind, colors);
  const gmat = new (B()).StandardMaterial('groundMat', scene);
  gmat.maxSimultaneousLights = 6;
  gmat.diffuseColor = new (B()).Color3(1, 1, 1);
  gmat.specularColor = new (B()).Color3(0.02, 0.02, 0.02);
  gmat.emissiveColor = new (B()).Color3(0, 0, 0);
  gmat.diffuseTexture = null;
  gmat.useVertexColors = true;
  ground.material = gmat;
  ground.receiveShadows = false;
  ground.freezeWorldMatrix();
  world.ground = ground;

  // ---- water ---------------------------------------------------------------
  const water = (B()).MeshBuilder.CreateDisc('water', { radius: lake.r + 1.5, tessellation: 24 }, scene);
  water.rotation.x = Math.PI / 2;
  const wmat = new (B()).StandardMaterial('waterMat', scene);
  wmat.maxSimultaneousLights = 6;
  wmat.diffuseColor = (B()).Color3.FromHexString('#2f5f8e');
  wmat.specularColor = new (B()).Color3(0.4, 0.4, 0.4);
  wmat.emissiveColor = (B()).Color3.FromHexString('#0d2438');
  wmat.alpha = 0.82;
  water.material = wmat;
  water.freezeWorldMatrix();
  water.position.set(lake.x, -1.1, lake.z);
  water.isPickable = false;
  world.water = water;
  world.waterAnim = { node: water, base: -1.1 };
  // block water on the grid
  world.grid.carveCircle(lake.x, lake.z, lake.r + 0.5, 2);

  // ---- town ----------------------------------------------------------------
  const town = buildTown(game, world);
  world.town = town;

  // ---- scenery -------------------------------------------------------------
  const staticMeshes = world.staticMeshes;
  const isBlockedArea = (x, z) => {
    if (Math.hypot(x, z) < TOWN.r + 4) return true;
    if (Math.hypot(x - lake.x, z - lake.z) < lake.r + 3) return true;
    for (const d of DUNGEONS) if (Math.hypot(x - d.pos.x, z - d.pos.z) < 8) return true;
    for (const d of DUNGEONS) if (distToSeg(x, z, 0, TOWN.r, d.pos.x, d.pos.z) < 3.2) return true;
    return false;
  };

  const treeCount = 520;
  for (let i = 0; i < treeCount; i++) {
    const x = (rng.next() - 0.5) * (size - 8), z = (rng.next() - 0.5) * (size - 8);
    if (isBlockedArea(x, z)) continue;
    const h = heightAt(x, z);
    if (h > 5 || h < -0.5) continue;
    const kind = rng.chance(0.55) ? 'pine' : rng.chance(0.6) ? 'tree' : 'bush';
    const col = kind === 'bush' ? '#3f6a34' : (rng.chance(0.5) ? '#3f6a34' : '#4a7a3a');
    const s = 0.8 + rng.next() * 0.7;
    const p = buildProp(scene, kind, col, s, world.root);
    p.position.set(x, h, z);
    p.rotation.y = rng.next() * 6.28;
    staticMeshes.push(...p.getChildMeshes());
    if (kind !== 'bush') world.grid.blockCircle(x, z, 0.55);
  }
  for (let i = 0; i < 160; i++) {
    const x = (rng.next() - 0.5) * (size - 8), z = (rng.next() - 0.5) * (size - 8);
    if (isBlockedArea(x, z)) continue;
    const h = heightAt(x, z);
    const kind = rng.chance(0.4) ? 'boulder' : 'rock';
    const p = buildProp(scene, kind, h > 4 ? '#7a7568' : '#6a6558', 0.7 + rng.next() * 0.8, world.root);
    p.position.set(x, h, z);
    p.rotation.y = rng.next() * 6.28;
    staticMeshes.push(...p.getChildMeshes());
    world.grid.blockCircle(x, z, kind === 'boulder' ? 1.3 : 0.7);
  }
  // fences + camps
  for (const camp of OVERWORLD.camps) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * 6.28;
      const x = camp.x + Math.cos(a) * 7, z = camp.z + Math.sin(a) * 7;
      const f = buildProp(scene, 'fence', '#5a4228', 1, world.root);
      f.position.set(x, heightAt(x, z), z);
      f.rotation.y = a;
      staticMeshes.push(...f.getChildMeshes());
    }
    const cf = buildProp(scene, 'campfire', '#4a3420', 1.2, world.root);
    cf.position.set(camp.x, heightAt(camp.x, camp.z), camp.z);
    staticMeshes.push(...cf.getChildMeshes());
    const l = game.makeLight('#ffb060', 12, 0.8);
    l.position.set(camp.x, heightAt(camp.x, camp.z) + 1.6, camp.z);
    world.lights.push(l);
    for (let i = 0; i < 3; i++) {
      const x = camp.x + (rng.next() - 0.5) * 10, z = camp.z + (rng.next() - 0.5) * 10;
      const c = buildProp(scene, rng.chance(0.5) ? 'crate' : 'barrel', '#6a4a2a', 1, world.root);
      c.position.set(x, heightAt(x, z), z);
      staticMeshes.push(...c.getChildMeshes());
      world.grid.blockCircle(x, z, 0.6);
    }
  }

  // ---- dungeon entrances ---------------------------------------------------
  for (const d of DUNGEONS) {
    const x = d.pos.x, z = d.pos.z, h = heightAt(x, z);
    const node = buildEntrance(scene, d, world.root);
    node.position.set(x, h, z);
    const a = Math.atan2(-x, -z);
    node.rotation.y = a;
    world.exits.push({ x, z, radius: 2.4, dungeonId: d.id, label: d.name, node, def: d });
    world.blockCircle(x, z, 3.2);
    // clear a small approach area
    world.grid.carveCircle(x, z, 4.5, 0);
    staticMeshes.push(...node.getChildMeshes());
    const l = game.makeLight(d.biome === 'forge' ? '#ff6030' : '#8fd0ff', 14, 1.0);
    l.position.set(x, h + 2, z);
    world.lights.push(l);
  }

  world.staticMeshes = mergeByMaterial(staticMeshes);

  return world;
}

function buildEntrance(scene, d, parent) {
  const g = new (B()).TransformNode('entrance_' + d.id, scene);
  g.parent = parent;
  const stone = '#6a6558';
  switch (d.entrance) {
    case 'cave': {
      const mound = sph(scene, { d: 9, y: 1.2, color: '#4a4238', parent: g, seg: 2 });
      mound.scaling.set(1.2, 0.8, 1.2);
      const mouth = box(scene, { w: 3, h: 3.4, d: 3, y: 1.6, z: -1.2, color: '#120f0c', parent: g });
      for (const sx of [-2.2, 2.2]) box(scene, { w: 1.2, h: 3, d: 1.2, x: sx, y: 1.4, color: stone, parent: g, rz: sx > 0 ? 0.15 : -0.15 });
      break;
    }
    case 'crypt': {
      box(scene, { w: 6, h: 4, d: 4, y: 2, color: stone, parent: g });
      box(scene, { w: 2.4, h: 3.2, d: 1, y: 1.6, z: -2.1, color: '#141418', parent: g });
      for (const sx of [-3.4, 3.4]) box(scene, { w: 1, h: 5, d: 1, x: sx, y: 2.5, color: '#7a7568', parent: g });
      const t = buildProp(scene, 'tombstone', '#8a8a94', 1.2, g);
      t.position.set(4.2, 0, -1);
      break;
    }
    case 'grove': {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.3;
        const tr = buildProp(scene, 'tree', '#2f4a24', 1.6, g);
        tr.position.set(Math.cos(a) * 3.4, 0, Math.sin(a) * 3.4);
      }
      const arch = torus(scene, 3.2, 0.5, '#4a5a3a', g);
      arch.position.y = 1.8;
      break;
    }
    case 'tower': {
      cyl(scene, { d: 8, h: 16, y: 8, color: '#5c5562', parent: g, tess: 8 });
      cone(scene, { d: 9, h: 4, y: 17.5, color: '#3a4a6a', parent: g, tess: 8 });
      box(scene, { w: 2.2, h: 3.4, d: 1.2, y: 1.7, z: -4.1, color: '#181820', parent: g });
      for (let i = 0; i < 3; i++) box(scene, { w: 1, h: 1, d: 0.6, y: 5 + i * 3.5, z: -4.1, color: '#e8b050', parent: g, emissive: '#8a5a10' });
      break;
    }
    case 'forge': {
      box(scene, { w: 8, h: 5, d: 6, y: 2.5, color: '#4e3a30', parent: g });
      box(scene, { w: 3, h: 3.6, d: 1.2, y: 1.8, z: -3.1, color: '#2a0f08', parent: g, emissive: '#40100a' });
      cyl(scene, { d: 1.6, h: 6, x: -3, y: 6, color: '#3a2a20', parent: g, tess: 6 });
      cyl(scene, { d: 1.6, h: 6, x: 3, y: 6, color: '#3a2a20', parent: g, tess: 6 });
      break;
    }
    default:
      box(scene, { w: 4, h: 4, d: 4, y: 2, color: stone, parent: g });
  }
  // glow marker
  const marker = cyl(scene, { d: 1.2, h: 6, y: 3, color: '#7fd0e8', parent: g, tess: 8, alpha: 0.18, emissive: '#7fd0e8' });
  marker.isPickable = false;
  g.userData = { marker };
  return g;
}

function torus(scene, d, t, color, parent) {
  const m = new (B()).MeshBuilder.CreateTorus('t', { diameter: d, thickness: t, tessellation: 12 }, scene);
  m.material = mat(scene, color);
  m.parent = parent;
  return m;
}

function distToSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const len2 = dx * dx + dz * dz || 1;
  let t = ((px - ax) * dx + (pz - az) * dz) / len2;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
