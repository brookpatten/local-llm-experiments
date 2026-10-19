// Grid -> meshes. One custom mesh for floors, one for walls, thin instances for clutter.
import { U } from './util.js';
import { Z } from './zones.js';
import { S } from './state.js';

const B = window.BABYLON;
export const TERRAIN = {};

// ---------- quad soup builder ----------
const MAX_QUADS = 3400;

function qkey(c, levels) {
  const r = Math.round(Math.min(1, Math.max(0, c[0])) * levels);
  const g = Math.round(Math.min(1, Math.max(0, c[1])) * levels);
  const b = Math.round(Math.min(1, Math.max(0, c[2])) * levels);
  return (r << 10) | (g << 5) | b;
}
function qcol(k, levels) {
  return [((k >> 10) & 31) / levels, ((k >> 5) & 31) / levels, (k & 31) / levels];
}
function groupQuads(quads, levels) {
  const m = new Map();
  for (const Q of quads) {
    const k = qkey(Q.c, levels);
    let a = m.get(k);
    if (!a) { a = []; m.set(k, a); }
    a.push(Q);
  }
  return m;
}

export function buildQuads(scene, name, quads, opts) {
  const outMeshes = [];
  if (!quads || !quads.length) return outMeshes;
  let levels = 15;
  let groups = groupQuads(quads, levels);
  if (groups.size > 26) { groups = groupQuads(quads, 7); levels = 7; }
  let gi = 0;
  for (const e2 of groups) {
    const key = e2[0];
    const list = e2[1];
    const cc = qcol(key, levels);
    for (let start = 0; start < list.length; start += MAX_QUADS) {
      const ch = list.slice(start, start + MAX_QUADS);
      const n = ch.length;
      if (!n) continue;
      const pos = new Float32Array(n * 12);
      const nor = new Float32Array(n * 12);
      const idx = new Uint16Array(n * 6);
      for (let q = 0; q < n; q++) {
        const Q = ch[q];
        const o = q * 12;
        for (let v = 0; v < 4; v++) {
          const p = Q.p[v], nn = Q.n ? Q.n[v] : Q.nrm;
          pos[o + v * 3] = p[0]; pos[o + v * 3 + 1] = p[1]; pos[o + v * 3 + 2] = p[2];
          if (nn) { nor[o + v * 3] = nn[0]; nor[o + v * 3 + 1] = nn[1]; nor[o + v * 3 + 2] = nn[2]; }
          else { nor[o + v * 3] = 0; nor[o + v * 3 + 1] = 1; nor[o + v * 3 + 2] = 0; }
        }
        const vi = q * 4;
        idx[q * 6] = vi; idx[q * 6 + 1] = vi + 1; idx[q * 6 + 2] = vi + 2;
        idx[q * 6 + 3] = vi; idx[q * 6 + 4] = vi + 2; idx[q * 6 + 5] = vi + 3;
      }
      const m = new B.Mesh(name + '_' + gi, scene);
      m.setVerticesData('position', pos);
      m.setVerticesData('normal', nor);
      m.setIndices(idx);
      m.refreshBoundingInfo();
      const mt = new B.StandardMaterial(name + '_m' + gi, scene);
      mt.diffuseColor = new B.Color3(cc[0] * 0.55, cc[1] * 0.55, cc[2] * 0.55);
      mt.emissiveColor = new B.Color3(cc[0] * 0.3, cc[1] * 0.3, cc[2] * 0.3);
      mt.roughness = 0.95; mt.metallic = 0;
      mt.specularColor = new B.Color3(0.06, 0.06, 0.06);
      if (opts?.unlit) { mt.emissiveColor = new B.Color3(cc[0] * 0.9, cc[1] * 0.9, cc[2] * 0.9); mt.diffuseColor = new B.Color3(0.05, 0.05, 0.05); mt.specularColor = new B.Color3(0, 0, 0); }
      if (opts?.alpha != null) { mt.alphaMode = B.ALPHABLEND; mt.alpha = opts.alpha; }
      if (opts?.double) mt.backFaceCulling = false;
      m.material = mt;
      outMeshes.push(m);
      gi++;
    }
  }
  return outMeshes;
}
TERRAIN.buildQuads = buildQuads;

// ---------- zone geometry ----------
export function cellChar(zone, gx, gy) {
  if (gx < 0 || gy < 0 || gx >= zone.w || gy >= zone.h) return '#';
  return zone.grid[gy][gx];
}

export function solidChar(ch) {
  return ch === '#' || ch === 'T' || ch === 'r' || ch === 'X' || ch === '~' || ch === 'W';
}
TERRAIN.solidChar = solidChar;

export function buildZoneMeshes(zone) {
  const cell = S.cell;
  const scene = S.scene;
  const amb = zone.amb;
  const floorQ = [], wallQ = [], waterQ = [], lavaQ = [], topQ = [];
  const rng = new U.Rng(U.hashStr(zone.id) ^ 0x9e37);
  const gbase = amb.ground || U.hexToRgb(amb.groundHex || '#4a5a3a');
  for (let gy = 0; gy < zone.h; gy++) {
    for (let gx = 0; gx < zone.w; gx++) {
      const ch = zone.grid[gy][gx];
      const x0 = gx * cell, z0 = gy * cell, x1 = x0 + cell, z1 = z0 + cell;
      if (!solidChar(ch)) {
        // floor quad
        const v = 0.9 + rng.next() * 0.2;
        let c = [gbase[0] * v, gbase[1] * v, gbase[2] * v];
        if (ch === ',') c = [gbase[0] * v * 0.8, gbase[1] * v * 1.25, gbase[2] * v * 0.75];
        if (ch === '+') c = [gbase[0] * v * 1.35 + 0.06, gbase[1] * v * 1.3 + 0.05, gbase[2] * v * 1.15 + 0.02];
        if (ch === 'x') c = [gbase[0] * 0.6, gbase[1] * 0.85, gbase[2] * 1.05];
        floorQ.push({ p: [[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]], nrm: [0, 1, 0], c });
        if (ch === 'x') waterQ.push({ p: [[x0, 0.08, z0], [x1, 0.08, z0], [x1, 0.08, z1], [x0, 0.08, z1]], nrm: [0, 1, 0], c: [0.26, 0.5, 0.68] });
      } else if (ch === '~') {
        waterQ.push({ p: [[x0, -0.1, z0], [x1, -0.1, z0], [x1, -0.1, z1], [x0, -0.1, z1]], nrm: [0, 1, 0], c: [0.26, 0.5, 0.68] });
        floorQ.push({ p: [[x0, -0.24, z0], [x1, -0.24, z0], [x1, -0.24, z1], [x0, -0.24, z1]], nrm: [0, 1, 0], c: [gbase[0] * 0.55, gbase[1] * 0.6, gbase[2] * 0.6] });
      } else if (ch === 'W') {
        lavaQ.push({ p: [[x0, 0.05, z0], [x1, 0.05, z0], [x1, 0.05, z1], [x0, 0.05, z1]], nrm: [0, 1, 0], c: [1, 0.32, 0.1] });
      }
      if (solidChar(ch) && ch !== '~' && ch !== 'W') {
        // wall: emit faces only toward non-solid neighbours
        const hgt = (ch === 'T' ? 0.1 : ch === 'r' ? 0.9 : ch === 'X' ? 1.4 : zone.kind === 'town' && ch === '#' ? 6.2 : 3.6);
        const tone = ch === '#' ? [0.52, 0.47, 0.43] : ch === 'T' ? [0.2, 0.36, 0.22] : ch === 'r' ? [0.5, 0.47, 0.44] : ch === 'X' ? [0.56, 0.4, 0.26] : [0.5, 0.46, 0.42];
        const v = 0.9 + rng.next() * 0.2;
        const c = [tone[0] * v, tone[1] * v, tone[2] * v];
        const yTop = hgt;
        const openN = !solidChar(cellChar(zone, gx, gy - 1));
        const openS = !solidChar(cellChar(zone, gx, gy + 1));
        const openW = !solidChar(cellChar(zone, gx - 1, gy));
        const openE = !solidChar(cellChar(zone, gx + 1, gy));
        if (openN) wallQ.push({ p: [[x0, 0, z0], [x1, 0, z0], [x1, yTop, z0], [x0, yTop, z0]], nrm: [0, 0, -1], c });
        if (openS) wallQ.push({ p: [[x1, 0, z1], [x0, 0, z1], [x0, yTop, z1], [x1, yTop, z1]], nrm: [0, 0, 1], c });
        if (openW) wallQ.push({ p: [[x0, 0, z1], [x0, 0, z0], [x0, yTop, z0], [x0, yTop, z1]], nrm: [-1, 0, 0], c });
        if (openE) wallQ.push({ p: [[x1, 0, z0], [x1, 0, z1], [x1, yTop, z1], [x1, yTop, z0]], nrm: [1, 0, 0], c });
        if (openN || openS || openW || openE) topQ.push({ p: [[x0, yTop, z0], [x1, yTop, z0], [x1, yTop, z1], [x0, yTop, z1]], nrm: [0, 1, 0], c: [tone[0] * v, tone[1] * v, tone[2] * v] });
      }
    }
  }
  const meshes = [];
  // apron: a big darker quad under and beyond the map so the camera never sees void
  {
    const pad = 34;
    const x0 = -pad, z0 = -pad;
    const x1 = zone.w * cell + pad, z1 = zone.h * cell + pad;
    const ac = [gbase[0] * 0.72, gbase[1] * 0.72, gbase[2] * 0.72];
    for (const m of buildQuads(scene, zone.id + '_apron', [{ p: [[x0, -0.22, z0], [x1, -0.22, z0], [x1, -0.22, z1], [x0, -0.22, z1]], nrm: [0, 1, 0], c: ac }], null)) meshes.push(m);
  }
  for (const m of buildQuads(scene, zone.id + '_floor', floorQ)) meshes.push(m);
  for (const m of buildQuads(scene, zone.id + '_wall', wallQ.concat(topQ))) meshes.push(m);
  for (const m of buildQuads(scene, zone.id + '_water', waterQ, { alpha: 0.78, double: true, unlit: true })) meshes.push(m);
  for (const m of buildQuads(scene, zone.id + '_lava', lavaQ, { unlit: true })) meshes.push(m);
  return meshes;
}

// ---------- clutter (real geometry, grouped by colour) ----------
const TAU = Math.PI * 2;

export function addTuft(quads, x, y, z, s, yaw, c) {
  const h = 0.52 * s, r = 0.13 * s;
  for (let i = 0; i < 4; i++) {
    const a0 = yaw + (i / 4) * TAU, a1 = yaw + ((i + 1) / 4) * TAU;
    const am = (a0 + a1) * 0.5;
    quads.push({
      p: [[x + Math.cos(a0) * r, y, z + Math.sin(a0) * r],
          [x + Math.cos(a1) * r, y, z + Math.sin(a1) * r],
          [x, y + h, z],
          [x, y + h, z]],
      nrm: [Math.cos(am) * 0.6, 0.55, Math.sin(am) * 0.6], c
    });
  }
}

export function addRock(quads, x, y, z, s, yaw, c) {  const r = 0.3 * s, h = 0.34 * s;
  for (let i = 0; i < 5; i++) {
    const a0 = yaw + (i / 5) * TAU, a1 = yaw + ((i + 1) / 5) * TAU;
    const am = (a0 + a1) * 0.5;
    quads.push({
      p: [[x + Math.cos(a0) * r, y, z + Math.sin(a0) * r],
          [x + Math.cos(a1) * r, y, z + Math.sin(a1) * r],
          [x + Math.cos(am) * r * 0.35, y + h, z + Math.sin(am) * r * 0.35],
          [x + Math.cos(am) * r * 0.35, y + h, z + Math.sin(am) * r * 0.35]],
      nrm: [Math.cos(am), 0.5, Math.sin(am)], c
    });
  }
}

export function addTree(quads, x, z, s, yaw, bark, leaf) {
  const th = 1.6 * s, tr = 0.22 * s;
  for (let i = 0; i < 4; i++) {
    const a0 = yaw + (i / 4) * TAU, a1 = yaw + ((i + 1) / 4) * TAU;
    const am = (a0 + a1) * 0.5;
    quads.push({
      p: [[x + Math.cos(a0) * tr, 0, z + Math.sin(a0) * tr],
          [x + Math.cos(a1) * tr, 0, z + Math.sin(a1) * tr],
          [x + Math.cos(a1) * tr, th, z + Math.sin(a1) * tr],
          [x + Math.cos(a0) * tr, th, z + Math.sin(a0) * tr]],
      nrm: [Math.cos(am), 0.1, Math.sin(am)], c: bark
    });
  }
  const cy = th + 0.9 * s, cr = 1.15 * s, ch = 1.5 * s;
  for (let i = 0; i < 5; i++) {
    const a0 = yaw + (i / 5) * TAU, a1 = yaw + ((i + 1) / 5) * TAU;
    const am = (a0 + a1) * 0.5;
    quads.push({
      p: [[x + Math.cos(a0) * cr, cy - 0.55 * s, z + Math.sin(a0) * cr],
          [x + Math.cos(a1) * cr, cy - 0.55 * s, z + Math.sin(a1) * cr],
          [x + Math.cos(am) * cr * 0.3, cy + ch * 0.55, z + Math.sin(am) * cr * 0.3],
          [x + Math.cos(am) * cr * 0.3, cy + ch * 0.55, z + Math.sin(am) * cr * 0.3]],
      nrm: [Math.cos(am), 0.55, Math.sin(am)], c: leaf
    });
  }
}

export function makeClutter(zone) {
  const cell = S.cell;
  const rng = new U.Rng(U.hashStr(zone.id) ^ 0x5150);
  const quads = [];
  const over = zone.kind === 'overworld';
  const grassCount = over ? 420 : 150;
  const rockCount = over ? 90 : 40;
  const gTones = over
    ? [[0.3, 0.55, 0.26], [0.36, 0.6, 0.28], [0.24, 0.45, 0.24], [0.42, 0.55, 0.3]]
    : [[0.28, 0.4, 0.28], [0.22, 0.34, 0.26], [0.34, 0.44, 0.28]];
  const rTones = over
    ? [[0.42, 0.4, 0.38], [0.34, 0.33, 0.32], [0.5, 0.46, 0.4]]
    : [[0.4, 0.37, 0.35], [0.3, 0.3, 0.32], [0.46, 0.42, 0.36]];
  const placeOpen = () => {
    for (let tries = 0; tries < 14; tries++) {
      const gx = Math.floor(rng.next() * zone.w), gy = Math.floor(rng.next() * zone.h);
      const ch = cellChar(zone, gx, gy);
      if (solidChar(ch)) continue;
      if (ch === 'x' || ch === '~' || ch === 'W') continue;
      return [gx * cell + cell * 0.5 + (rng.next() - 0.5) * cell * 0.78,
              gy * cell + cell * 0.5 + (rng.next() - 0.5) * cell * 0.78];
    }
    return null;
  };
  for (let i = 0; i < grassCount; i++) {
    const p = placeOpen();
    if (!p) continue;
    const t = gTones[(rng.next() * gTones.length) | 0];
    const tint = 0.78 + rng.next() * 0.42;
    addTuft(quads, p[0], 0, p[1], 0.7 + rng.next() * 0.8, rng.next() * TAU, [t[0] * tint, t[1] * tint, t[2] * tint]);
  }
  for (let i = 0; i < rockCount; i++) {
    const p = placeOpen();
    if (!p) continue;
    const t = rTones[(rng.next() * rTones.length) | 0];
    const tint = 0.8 + rng.next() * 0.36;
    addRock(quads, p[0], 0, p[1], 0.7 + rng.next() * 0.9, rng.next() * TAU, [t[0] * tint, t[1] * tint, t[2] * tint]);
  }
  if (zone.kind === 'overworld') {
    for (let gy = 0; gy < zone.h; gy++) {
      for (let gx = 0; gx < zone.w; gx++) {
        if (cellChar(zone, gx, gy) !== 'T') continue;
        const wx = gx * cell + cell * 0.5 + (rng.next() - 0.5) * cell * 0.35;
        const wz = gy * cell + cell * 0.5 + (rng.next() - 0.5) * cell * 0.35;
        const s = 0.85 + rng.next() * 0.55;
        const lt = rng.next();
        const leaf = [0.16 + lt * 0.12, 0.4 + lt * 0.18, 0.16 + lt * 0.08];
        addTree(quads, wx, wz, s, rng.next() * TAU, [0.3, 0.22, 0.15], leaf);
      }
    }
  }
  if (!quads.length) return [];
  return buildQuads(S.scene, zone.id + '_clutter', quads, null);
}

export const T = { buildQuads, buildZoneMeshes, makeClutter, solidChar, cellChar, MAX_QUADS };
