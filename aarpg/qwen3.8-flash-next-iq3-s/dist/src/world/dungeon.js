// Procedural dungeons: rooms + corridors, walls built from the grid, spawners.
import { Grid } from './grid.js';
import { mergeByMaterial } from './merge.js';
import { box, buildProp, mat, cyl } from '../entities/meshes.js';
import { BIOMES } from '../data/dungeons.js';
import { RNG } from '../core/rng.js';
import { clamp } from '../core/math.js';

const B = () => window.BABYLON;
const WALL_H = 4.2;

export function buildDungeon(game, def) {
  const scene = game.scene;
  const biome = BIOMES[def.biome];
  const rng = new RNG(hashSeed(def.id + ':' + (game.runSeed || 0)));
  const N = def.grid || 64;
  const half = N / 2;

  const grid = new Grid(N, N, 1, -half, -half);
  grid.fill(1);

  // ---- rooms ---------------------------------------------------------------
  const rooms = [];
  const attempts = def.rooms * 6;
  for (let i = 0; i < attempts && rooms.length < def.rooms; i++) {
    const w = rng.int(7, 13), d = rng.int(7, 13);
    const cx = rng.int(4, N - w - 4), cz = rng.int(4, N - d - 4);
    const r = { x: cx, z: cz, w, d, cx: cx + w / 2, cz: cz + d / 2 };
    let overlap = false;
    for (const o of rooms) {
      if (r.x - 2 < o.x + o.w && r.x + r.w + 2 > o.x && r.z - 2 < o.z + o.d && r.z + r.d + 2 > o.z) { overlap = true; break; }
    }
    if (overlap) continue;
    rooms.push(r);
  }
  if (rooms.length < 3) return buildFallback(game, def);
  const toWorld = (gx, gz) => [grid.originX + gx + 0.5, grid.originZ + gz + 0.5];
  const carveRoom = (r) => grid.carveCells(r.x, r.z, r.x + r.w - 1, r.z + r.d - 1, 0);
  rooms.forEach(carveRoom);

  // connect room i to i-1 (plus a couple of loops)
  const corridor = (a, b) => {
    let x0 = Math.floor(a.cx), z0 = Math.floor(a.cz);
    const x1 = Math.floor(b.cx), z1 = Math.floor(b.cz);
    const step = (x, z) => grid.carveCells(x - 1, z - 1, x + 1, z + 1, 0);
    while (x0 !== x1) { step(x0, z0); x0 += Math.sign(x1 - x0); }
    while (z0 !== z1) { step(x0, z0); z0 += Math.sign(z1 - z0); }
    step(x1, z1);
  };
  for (let i = 1; i < rooms.length; i++) corridor(rooms[i - 1], rooms[i]);
  for (let i = 0; i < 2; i++) {
    const a = rng.pick(rooms), b = rng.pick(rooms);
    if (a !== b) corridor(a, b);
  }

  const entranceRoom = rooms[0];
  let bossRoom = rooms[rooms.length - 1], best = -1;
  for (const r of rooms) {
    const d = Math.hypot(r.cx - entranceRoom.cx, r.cz - entranceRoom.cz);
    if (d > best) { best = d; bossRoom = r; }
  }

  // ---- world object --------------------------------------------------------
  const world = {
    id: def.id,
    name: def.name,
    biome,
    biomeId: def.biome,
    def,
    scene,
    root: new (B()).TransformNode('world_' + def.id, scene),
    grid,
    heightAt: () => 0,
    lights: [],
    exits: [],
    rooms,
    entranceRoom,
    bossRoom,
    spawnPoints: [],
    staticMeshes: [],
    indoor: def.biome !== 'forest',
    dispose() {
      for (const l of this.lights) l.dispose();
      try { this.root.dispose(); } catch (e) { /* ignore */ }
      for (const m of this.merged || []) { try { m.dispose(); } catch (e) { /* ignore */ } }
    },
    blockCircle(x, z, r) { grid.blockCircle(x, z, r); },
    blockRect(x0, z0, x1, z1) { grid.blockRect(x0, z0, x1, z1); },
  };

  const staticMeshes = world.staticMeshes;
  const open = (gx, gz) => grid.get(gx, gz) === 0;

  // ---- floors, ceilings, walls (run-merged boxes) --------------------------
  const floorMat = mat(scene, biome.floor);
  const floor2Mat = mat(scene, biome.floor2);
  const ceilMat = mat(scene, biome.wall);
  const wallMat = mat(scene, biome.wall);

  const addRun = (x0, x1, z0, z1, y, h, material, list) => {
    const w = x1 - x0 + 1, d = z1 - z0 + 1;
    const cx = grid.originX + x0 + w / 2, cz = grid.originZ + z0 + d / 2;
    const m = (B()).MeshBuilder.CreateBox('run', { width: w, height: h, depth: d }, scene);
    m.position.set(cx, y + h / 2, cz);
    m.material = material;
    m.parent = world.root;
    m.isPickable = false;
    list.push(m);
    return m;
  };

  // floor + ceiling runs
  for (let gz = 0; gz < grid.h; gz++) {
    let run = null;
    for (let gx = 0; gx <= grid.w; gx++) {
      if (open(gx, gz)) { run = run === null ? gx : run; }
      else if (run !== null) {
        addRun(run, gx - 1, gz, gz, -0.2, 0.2, ((gz + run) % 2) ? floorMat : floor2Mat, staticMeshes);
        run = null;
      }
    }
  }

  // wall runs on all four faces
  const wallBoxes = [];
  const wallRun = (fixed, from, to, dir) => {
    // dir: 0 = -z neighbour, 1 = +z neighbour, 2 = -x neighbour, 3 = +x neighbour
    let run = null;
    for (let v = from; v <= to + 1; v++) {
      const gx = dir < 2 ? v : fixed, gz = dir < 2 ? fixed : v;
      const ng = dir === 0 ? [gx, gz - 1] : dir === 1 ? [gx, gz + 1] : dir === 2 ? [gx - 1, gz] : [gx + 1, gz];
      const blocked = !open(ng[0], ng[1]);
      if (open(gx, gz) && blocked) run = run === null ? v : run;
      else if (run !== null) {
        const a = run, b = v - 1;
        // the box is placed in the *blocked* cell so it never intrudes on walkable space
        if (dir === 0) addRun(a, b, gz - 1, gz - 1, 0, WALL_H, wallMat, wallBoxes);
        else if (dir === 1) addRun(a, b, gz + 1, gz + 1, 0, WALL_H, wallMat, wallBoxes);
        else if (dir === 2) addRun(gx - 1, gx - 1, a, b, 0, WALL_H, wallMat, wallBoxes);
        else addRun(gx + 1, gx + 1, a, b, 0, WALL_H, wallMat, wallBoxes);
        run = null;
      }
    }
  };
  for (let gz = 0; gz < grid.h; gz++) { wallRun(gz, 0, grid.w - 1, 0); wallRun(gz, 0, grid.w - 1, 1); }
  for (let gx = 0; gx < grid.w; gx++) { wallRun(gx, 0, grid.h - 1, 2); wallRun(gx, 0, grid.h - 1, 3); }
  staticMeshes.push(...wallBoxes);

  // ---- props ---------------------------------------------------------------
  const propCells = [];
  for (let gz = 1; gz < grid.h - 1; gz++) {
    for (let gx = 1; gx < grid.w - 1; gx++) {
      if (!open(gx, gz)) continue;
      const blockedNb = [[0, -1], [0, 1], [-1, 0], [1, 0]].filter(([dx, dz]) => !open(gx + dx, gz + dz));
      if (blockedNb.length) propCells.push({ gx, gz, nb: blockedNb });
    }
  }
  const torchCells = rng.shuffle(propCells.slice()).slice(0, 26);
  for (const c of torchCells) {
    const [x, z] = toWorld(c.gx, c.gz);
    const t = buildProp(scene, 'torch', biome.prop, 1, world.root);
    t.position.set(x, 0, z);
    staticMeshes.push(...t.getChildMeshes());
    if (world.lights.length < 18) {
      const l = game.makeLight(def.biome === 'forge' ? '#ff7030' : '#ffb060', 13, 1.35);
      l.position.set(x, 2.2, z);
      world.lights.push(l);
    }
  }
  for (const r of rooms) {
    const n = rng.int(1, 3);
    for (let i = 0; i < n; i++) {
      const x = grid.originX + rng.int(r.x + 1, r.x + r.w - 2) + 0.5;
      const z = grid.originZ + rng.int(r.z + 1, r.z + r.d - 2) + 0.5;
      const kind = rng.pick(biome.props);
      const p = buildProp(scene, kind, biome.prop, 0.9 + rng.next() * 0.4, world.root);
      p.position.set(x, 0, z);
      p.rotation.y = rng.next() * 6.28;
      staticMeshes.push(...p.getChildMeshes());
      if (kind === 'pillars' || kind === 'statue') grid.blockCircle(x, z, 0.8);
    }
  }

  // ---- chests, shrines, spawners ------------------------------------------
  const chestCount = 2 + Math.floor(rooms.length / 3);
  world.chests = [];
  for (let i = 0; i < chestCount; i++) {
    const r = rng.pick(rooms.filter((r2) => r2 !== entranceRoom));
    const x = grid.originX + rng.int(r.x + 1, r.x + r.w - 2) + 0.5;
    const z = grid.originZ + rng.int(r.z + 1, r.z + r.d - 2) + 0.5;
    world.chests.push({ x, z, quality: rng.chance(0.3) ? 1 : 0 });
  }
  world.shrines = [];
  for (let i = 0; i < 2; i++) {
    const r = rng.pick(rooms);
    const x = grid.originX + Math.floor(r.cx) + 0.5, z = grid.originZ + Math.floor(r.cz) + 0.5;
    world.shrines.push({ x, z });
  }

  const spawnCells = [];
  for (const r of rooms) {
    if (r === entranceRoom) continue;
    for (let gz = r.z + 1; gz < r.z + r.d - 1; gz += 2) {
      for (let gx = r.x + 1; gx < r.x + r.w - 1; gx += 2) {
        if (open(gx, gz)) spawnCells.push(toWorld(gx, gz));
      }
    }
  }
  const total = Math.round((def.rooms * 2.4) * (def.density || 0.6) * 2.2);
  world.spawnPoints = rng.shuffle(spawnCells.slice()).slice(0, Math.max(6, total));
  world.bossPoint = toWorld(Math.floor(bossRoom.cx), Math.floor(bossRoom.cz));

  const ex = grid.originX + entranceRoom.cx + 0.5, ez = grid.originZ + entranceRoom.cz + 0.5;
  world.spawn = { x: ex, z: ez + 2 };
  world.exits.push({ x: ex, z: ez, radius: 2.2, dungeonId: 'overworld', label: 'Leave ' + def.name, leave: true });

  // entrance platform marker
  const pad = (B()).MeshBuilder.CreateDisc('pad', { radius: 2.2, tessellation: 16 }, scene);
  pad.rotation.x = Math.PI / 2;
  pad.material = mat(scene, def.biome === 'forge' ? '#e0603a' : '#7fd0e8', { emissive: '#3a7a90', alpha: 0.5 });
  pad.position.set(ex, 0.06, ez);
  pad.parent = world.root;
  pad.isPickable = false;
  world.portalPad = pad;

  world.merged = mergeByMaterial(staticMeshes);
  world.staticMeshes = world.merged;
  return world;
}

function buildFallback(game, def) {
  // one big hall - should basically never happen, but keeps the game alive
  const scene = game.scene;
  const biome = BIOMES[def.biome];
  const N = 40, half = N / 2;
  const grid = new Grid(N, N, 1, -half, -half);
  grid.fill(1);
  grid.carveRect(4, 4, N - 5, N - 5, 0);
  const world = {
    id: def.id, name: def.name, biome, biomeId: def.biome, def, scene,
    root: new (B()).TransformNode('world_' + def.id, scene),
    grid, heightAt: () => 0, lights: [], exits: [], rooms: [{ x: 4, z: 4, w: N - 8, d: N - 8, cx: N / 2, cz: N / 2 }],
    spawnPoints: [], chests: [], shrines: [], indoor: true,
    spawn: { x: 0, z: 6 },
    bossPoint: { x: 0, z: -10 },
    dispose() { for (const l of this.lights) l.dispose(); try { this.root.dispose(); } catch (e) { /* ignore */ } },
    blockCircle(x, z, r) { grid.blockCircle(x, z, r); },
    blockRect(x0, z0, x1, z1) { grid.blockRect(x0, z0, x1, z1); },
  };
  const floor = box(scene, { w: N - 8, h: 0.2, d: N - 8, y: -0.1, color: biome.floor, parent: world.root });
  const walls = [];
  for (const [x, z, w, d] of [[0, -half + 4, N - 8, 1], [0, half - 4, N - 8, 1], [-half + 4, 0, 1, N - 8], [half - 4, 0, 1, N - 8]]) {
    walls.push(box(scene, { w, h: WALL_H, d, y: WALL_H / 2, x, z, color: biome.wall, parent: world.root }));
  }
  world.merged = [floor, ...walls];
  world.exits.push({ x: 0, z: 0, radius: 2.2, dungeonId: 'overworld', label: 'Leave', leave: true });
  for (let gz = -14; gz <= 14; gz += 3) for (let gx = -14; gx <= 14; gx += 3) world.spawnPoints.push([gx, gz]);
  return world;
}

function hashSeed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
