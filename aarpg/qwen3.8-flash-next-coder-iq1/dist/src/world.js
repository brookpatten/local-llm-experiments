// Zone streaming: build/dispose a zone, exits, chests, doors, levers, pickups.
import { S } from './state.js';
import { U } from './util.js';
import { Z } from './zones.js';
import { T } from './terrain.js';
import { R } from './rig.js';
import { E } from './enemies.js';

const B = window.BABYLON;
export const WORLD = {};

export let zoneState = null;

export function solidAt(gx, gy) {
  const z = zoneState;
  if (!z) return true;
  if (gx < 0 || gy < 0 || gx >= z.w || gy >= z.h) return true;
  const ch = z.grid[gy][gx];
  if (ch === 'D') return !z.doorOpen;
  return T.solidChar(ch);
}
WORLD.solidAt = solidAt;

export function cellOf(x) { return Math.floor(x / S.cell); }
export function worldOf(g) { return g * S.cell + S.cell * 0.5; }

export function enterZone(id) {
  disposeZone();
  const def = Z.ZONE_DEFS[id];
  const parsed = Z.parseMap(id);
  const z = {
    id, def, name: def.name, kind: def.kind,
    grid: parsed.grid, w: parsed.w, h: parsed.h,
    amb: def.ambience,
    exits: def.exits || [],
    spawn: def.spawn,
    doorOpen: id === 'ruins' ? false : true,
    meshes: [], props: [], chests: [], enemies: [], npcs: [],
    cleared: S.quest.cleared[id] === true,
  };
  zoneState = z;
  S.zone = z; S.zoneId = id; S.grid = z.grid; S.gw = z.w; S.gh = z.h;

  // lighting + fog
  const a = z.amb;
  S.scene.clearColor = new B.Color4(a.clear[0], a.clear[1], a.clear[2], 1);
  S.scene.fogMode = 3;
  S.scene.fogColor = new B.Color3(a.fog[0], a.fog[1], a.fog[2]);
  S.scene.fogStart = a.fogStart; S.scene.fogEnd = a.fogEnd;
  S.scene.ambientLight = new B.Color3(Math.min(1, a.hemi[0] + 0.16), Math.min(1, a.hemi[1] + 0.16), Math.min(1, a.hemi[2] + 0.18));
  const dir = new B.DirectionalLight('sun', new B.Vector3(a.sun[0], a.sun[1], a.sun[2]), S.scene);
  dir.color = new B.Color3(a.sunColor[0], a.sunColor[1], a.sunColor[2]);
  dir.intensity = 1.0;
  const hemi = new B.HemisphericLight('hemi', new B.Vector3(0.2, 0.9, 0.35), S.scene);
  hemi.intensity = z.kind === 'town' || z.kind === 'overworld' ? 0.85 : 0.95;
  const fill = new B.DirectionalLight('fill', new B.Vector3(0.62, -0.34, -0.62), S.scene);
  fill.color = new B.Color3(0.55, 0.58, 0.66);
  fill.intensity = z.kind === 'town' || z.kind === 'overworld' ? 0.35 : 0.55;
  S.lights = { dir, hemi, fill };

  // geometry
  for (const m of T.buildZoneMeshes(z)) z.meshes.push(m);
  for (const m of T.makeClutter(z)) z.meshes.push(m);

  // props
  const propDefs = (def.props || []).concat(parsed.props);
  for (const p of propDefs) buildProp(z, p);
  // chests
  const chestDefs = (def.chests || []).concat(parsed.chests);
  for (const c of chestDefs) z.chests.push(makeChest(z, c));
  // npcs
  for (const n of (def.npcs || [])) z.npcs.push(makeNpc(z, n));
  // enemies
  const enemyDefs = parsed.enemies.slice();
  if (def.boss && !z.cleared) enemyDefs.push({ kind: def.boss.kind, x: def.boss.x, y: def.boss.y, boss: true, name: def.boss.name, il: def.boss.il });
  if (!z.cleared) {
    for (const e of enemyDefs) spawnEnemy(z, e);
  }
  // exits markers
  for (const ex of z.exits) buildExitMarker(z, ex);
  return z;
}

export function disposeZone() {
  if (!zoneState) return;
  for (const z of [zoneState]) {
    for (const m of z.meshes) { m.dispose(); }
    for (const p of z.props) if (p.rig) R.disposeRig(p.rig);
    for (const c of z.chests) if (c.rig) R.disposeRig(c.rig);
    for (const n of z.npcs) if (n.rig) R.disposeRig(n.rig);
    for (const e of z.enemies) if (e.rig) R.disposeRig(e.rig);
  }
  zoneState = null;
  S.zone = null; S.zoneId = null; S.grid = null;
  S.enemies = []; S.npcs = []; S.props = []; S.chests = []; S.loot = [];
  if (S.lights) { S.lights.dir.dispose(); S.lights.hemi.dispose(); if (S.lights.fill) S.lights.fill.dispose(); S.lights = null; }
}

// ---------- props ----------
export function buildProp(z, p) {
  const x = worldOf(p.x), zz = worldOf(p.y);
  let rig = null;
  if (p.kind === 'brazier') {
    const stone = R.mat(S.scene, z.id + '_stone' + p.x + '_' + p.y, '#5a5450');
    const base = R.box(S.scene, z.id + '_br_b' + p.x + '_' + p.y, 0.9, 0.5, 0.9, x, 0.25, zz, null, stone);
    const bowl = B.MeshBuilder.CreateCylinder(z.id + '_br_bowl' + p.x + '_' + p.y, { diameterBottom: 0.5, diameterTop: 1.0, height: 0.5, tessellation: 8 }, S.scene);
    bowl.position = new B.Vector3(x, 1.1, zz);
    const fire = R.mat(S.scene, z.id + '_br_fire' + p.x + '_' + p.y, '#ff8a2a', { emissive: '#ff6a1a', unlit: true });
    const flame = B.MeshBuilder.CreateCylinder(z.id + '_br_flame' + p.x + '_' + p.y, { diameterBottom: 0.55, diameterTop: 0.0, height: 1.0, tessellation: 6 }, S.scene);
    flame.position = new B.Vector3(x, 1.7, zz);
    flame.material = fire;
    const light = new B.PointLight(z.id + '_br_l' + p.x + '_' + p.y, new B.Vector3(x, 2.0, zz), S.scene);
    light.color = new B.Color3(1, 0.55, 0.25); light.intensity = 0.9; light.attendanceRange = 16;
    rig = { root: base, meshes: [base, bowl, flame], mats: [stone, fire], light, flame };
    z.meshes.push(base, bowl, flame);
    z.props.push({ kind: 'brazier', x, z: zz, rig, light, flame, gx: p.x, gy: p.y });
  } else if (p.kind === 'fountain') {
    const stone = R.mat(S.scene, z.id + '_fs', '#7d7a72');
    const water = R.mat(S.scene, z.id + '_fw', '#3d7fa8', { emissive: '#12345a' });
    const basin = B.MeshBuilder.CreateCylinder(z.id + '_fb', { diameter: 4.2, height: 0.7, tessellation: 12 }, S.scene);
    basin.position = new B.Vector3(x, 0.35, zz); basin.material = stone;
    const pool = B.MeshBuilder.CreateCylinder(z.id + '_fp', { diameter: 3.6, height: 0.2, tessellation: 12 }, S.scene);
    pool.position = new B.Vector3(x, 0.72, zz); pool.material = water;
    const stem = R.box(S.scene, z.id + '_st', 0.5, 1.6, 0.5, x, 1.4, zz, null, stone);
    const cup = B.MeshBuilder.CreateCylinder(z.id + '_cup', { diameter: 1.6, height: 0.35, tessellation: 10 }, S.scene);
    cup.position = new B.Vector3(x, 2.2, zz); cup.material = stone;
    rig = { root: basin, meshes: [basin, pool, stem, cup], mats: [stone, water] };
    z.meshes.push(basin, pool, stem, cup);
    z.props.push({ kind: 'fountain', x, z: zz, rig, gx: p.x, gy: p.y, use: 'drink' });
  } else if (p.kind === 'crate' || p.kind === 'barrel') {
    const wood = R.mat(S.scene, z.id + '_wd' + p.x + '_' + p.y, p.kind === 'barrel' ? '#6b4a2a' : '#7a5a34');
    const m = p.kind === 'barrel'
      ? B.MeshBuilder.CreateCylinder(z.id + '_bn', { diameter: 1.1, height: 1.2, tessellation: 9 }, S.scene)
      : R.box(S.scene, z.id + '_bx', 1.1, 1.1, 1.1, x, 0.55, zz, null, wood);
    if (p.kind === 'barrel') { m.position = new B.Vector3(x, 0.6, zz); m.material = wood; }
    z.meshes.push(m);
    z.props.push({ kind: p.kind, x, z: zz, rig: { root: m, meshes: [m], mats: [wood] }, gx: p.x, gy: p.y, smash: true });
  } else if (p.kind === 'lever') {
    const stone = R.mat(S.scene, z.id + '_lv', '#6a6560');
    const post = R.box(S.scene, z.id + '_lp', 0.4, 1.2, 0.4, x, 0.6, zz, null, stone);
    const arm = R.box(S.scene, z.id + '_la', 0.16, 1.1, 0.16, x, 1.6, zz, null, R.mat(S.scene, z.id + '_la2', '#a33a2a'));
    arm.rotation.x = 0.6;
    z.meshes.push(post, arm);
    z.props.push({ kind: 'lever', x, z: zz, rig: { root: post, meshes: [post, arm], mats: [stone] }, arm, gx: p.x, gy: p.y, use: 'lever' });
  } else if (p.kind === 'door') {
    const wood = R.mat(S.scene, z.id + '_dr' + p.x + '_' + p.y, '#4a3524');
    const m = R.box(S.scene, z.id + '_dm', 4, 3.4, 0.6, x, 1.7, zz, null, wood);
    z.meshes.push(m);
    z.props.push({ kind: 'door', x, z: zz, rig: { root: m, meshes: [m], mats: [wood] }, gx: p.x, gy: p.y, open: z.doorOpen });
  } else if (p.kind === 'board') {
    const wood = R.mat(S.scene, z.id + '_bd', '#6a4a2c');
    const post = R.box(S.scene, z.id + '_bp', 0.2, 1.6, 0.2, x, 0.8, zz, null, wood);
    const sign = R.box(S.scene, z.id + '_bs', 1.8, 0.7, 0.12, x, 1.5, zz, null, R.mat(S.scene, z.id + '_bs2', '#8a6a3a'));
    z.meshes.push(post, sign);
    z.props.push({ kind: 'board', x, z: zz, rig: { root: post, meshes: [post, sign], mats: [wood] }, gx: p.x, gy: p.y, use: 'read' });
  }
}

// ---------- chests ----------
export function makeChest(z, c) {
  const x = worldOf(c.x), zz = worldOf(c.y);
  const wood = R.mat(S.scene, z.id + '_ch' + c.x + '_' + c.y, '#5a3a22');
  const metal = R.mat(S.scene, z.id + '_chm' + c.x + '_' + c.y, '#9aa0a8', { metal: 0.7 });
  const body = R.box(S.scene, z.id + '_chb', 1.5, 0.9, 1.0, x, 0.45, zz, null, wood);
  const lid = R.box(S.scene, z.id + '_chl', 1.5, 0.34, 1.0, x, 1.05, zz, null, metal);
  const lock = R.box(S.scene, z.id + '_clk', 0.24, 0.3, 0.2, x, 0.85, zz + 0.55, null, metal);
  z.meshes.push(body, lid, lock);
  const ch = { kind: 'chest', x, z: zz, gx: c.x, gy: c.y, il: c.il || (z.def.il || 4), rig: { root: body, meshes: [body, lid, lock], mats: [wood, metal] }, opened: false, label: c.label };
  z.chests.push(ch);
  return ch;
}

// ---------- npcs ----------
export function makeNpc(z, n) {
  const x = worldOf(n.x), zz = worldOf(n.y);
  const spec = { scale: 1.05, colors: { body: n.color, accent: '#d8c9a2', skin: '#d8ab84', metal: '#8b939d', trim: '#3a2f26' }, weapon: n.shop === 'weapons' ? 'sword' : null, shield: n.shop === 'armor', helm: false, cape: true };
  const rig = R.buildHumanoid(S.scene, z.id + '_npc_' + n.x + '_' + n.y, spec);
  rig.root.position = new B.Vector3(x, 0, zz);
  rig.root.rotation.y = 0;
  z.meshes.push(rig.root);
  const o = { kind: 'npc', x, z: zz, gx: n.x, gy: n.y, rig, npc: n, name: n.name, shop: n.shop, lines: n.lines, greet: 0 };
  z.npcs.push(o);
  return o;
}

// ---------- enemies ----------
export function spawnEnemy(z, e) {
  const x = worldOf(e.x), zz = worldOf(e.y);
  const en = E.makeEnemy(z, e.kind, x, zz, (e.il || z.def.il || 4), e.boss);
  if (en) z.enemies.push(en);
  return en;
}

// ---------- exit markers ----------
export function buildExitMarker(z, ex) {
  const x = worldOf(ex.x), zz = worldOf(ex.y);
  const glow = R.mat(S.scene, z.id + '_ex' + ex.x + '_' + ex.y, '#7fd7ff', { emissive: '#2a6a8a', unlit: true });
  const arch = B.MeshBuilder.CreateTorus(z.id + '_exa', { diameter: 3.2, thickness: 0.35, tessellation: 12 }, S.scene);
  arch.position = new B.Vector3(x, 1.6, zz);
  arch.rotation.x = Math.PI / 2;
  arch.material = glow;
  z.meshes.push(arch);
  ex.mesh = arch;
  ex.x = x; ex.z = zz;
}

WORLD.enterZone = enterZone; WORLD.disposeZone = disposeZone; WORLD.solidAt = solidAt;
WORLD.cellOf = cellOf; WORLD.worldOf = worldOf; WORLD.buildProp = buildProp;
WORLD.makeChest = makeChest; WORLD.makeNpc = makeNpc; WORLD.spawnEnemy = spawnEnemy;
WORLD.buildExitMarker = buildExitMarker;
