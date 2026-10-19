// Uniform grid for collision + A* pathfinding.
const SOLID = 1, WATER = 2;

class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(v) { const a = this.a; a.push(v); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][1] <= a[i][1]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a; const top = a[0]; const last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let s = i; if (l < a.length && a[l][1] < a[s][1]) s = l; if (r < a.length && a[r][1] < a[s][1]) s = r; if (s === i) break; [a[s], a[i]] = [a[i], a[s]]; i = s; } } return top; }
}

export class Grid {
  constructor(w, h, cell = 1, ox = 0, oz = 0) {
    this.w = w; this.h = h; this.cell = cell; this.ox = ox; this.oz = oz;
    this.data = new Uint8Array(w * h);
  }
  idx(cx, cz) { return cz * this.w + cx; }
  inBounds(cx, cz) { return cx >= 0 && cz >= 0 && cx < this.w && cz < this.h; }
  cellOf(x, z) { return [Math.floor((x - this.ox) / this.cell), Math.floor((z - this.oz) / this.cell)]; }
  center(cx, cz) { return [this.ox + (cx + 0.5) * this.cell, this.oz + (cz + 0.5) * this.cell]; }
  set(cx, cz, v) { if (this.inBounds(cx, cz)) this.data[this.idx(cx, cz)] = v; }
  fill(v) { this.data.fill(v); }
  get originX() { return this.ox; }
  get originZ() { return this.oz; }
  // index-space variants (used by the dungeon generator)
  carveCells(x0, z0, x1, z1, v = 0) {
    for (let cz = Math.min(z0, z1); cz <= Math.max(z0, z1); cz++) for (let cx = Math.min(x0, x1); cx <= Math.max(x0, x1); cx++) this.set(cx, cz, v);
  }
  get(cx, cz) { return this.inBounds(cx, cz) ? this.data[this.idx(cx, cz)] : SOLID; }
  solidAtCell(cx, cz) { return this.get(cx, cz) !== 0; }
  solidAt(x, z) { const [cx, cz] = this.cellOf(x, z); return this.solidAtCell(cx, cz); }
  waterAt(x, z) { const [cx, cz] = this.cellOf(x, z); return this.get(cx, cz) === WATER; }

  carveCircle(x, z, r, v = 0) {
    const [cx0, cz0] = this.cellOf(x, z);
    const rc = Math.ceil(r / this.cell);
    for (let dz = -rc; dz <= rc; dz++) for (let dx = -rc; dx <= rc; dx++) {
      const cx = cx0 + dx, cz = cz0 + dz;
      const [wx, wz] = this.center(cx, cz);
      if ((wx - x) ** 2 + (wz - z) ** 2 <= r * r) this.set(cx, cz, v);
    }
  }
  blockCircle(x, z, r, v = SOLID) { this.carveCircle(x, z, r, v); }
  blockRect(x0, z0, x1, z1, v = SOLID) {
    const [a, b] = this.cellOf(x0, z0), [c, d] = this.cellOf(x1, z1);
    for (let cz = Math.min(b, d); cz <= Math.max(b, d); cz++) for (let cx = Math.min(a, c); cx <= Math.max(a, c); cx++) this.set(cx, cz, v);
  }
  carveRect(x0, z0, x1, z1, v = 0) { this.blockRect(x0, z0, x1, z1, v); }

  // Circle-vs-grid resolution: push a point out of solid cells.
  resolve(x, z, r) {
    let px = x, pz = z;
    const [cx0, cz0] = this.cellOf(px, pz);
    const rc = Math.ceil(r / this.cell);
    for (let dz = -rc; dz <= rc; dz++) for (let dx = -rc; dx <= rc; dx++) {
      const cx = cx0 + dx, cz = cz0 + dz;
      if (!this.solidAtCell(cx, cz)) continue;
      const [bx, bz] = this.center(cx, cz);
      const half = this.cell / 2;
      const nx = Math.max(bx - half, Math.min(px, bx + half));
      const nz = Math.max(bz - half, Math.min(pz, bz + half));
      let ddx = px - nx, ddz = pz - nz;
      let d2 = ddx * ddx + ddz * ddz;
      if (d2 >= r * r || d2 === 0) {
        if (d2 === 0) { // deep inside: push along smallest axis
          const ox = bx - px, oz = bz - pz;
          if (Math.abs(ox) > Math.abs(oz)) px = bx - Math.sign(ox || 1) * (half + r);
          else pz = bz - Math.sign(oz || 1) * (half + r);
        }
        continue;
      }
      const d = Math.sqrt(d2);
      const push = (r - d) / d;
      px += ddx * push; pz += ddz * push;
    }
    return [px, pz];
  }

  lineClear(x0, z0, x1, z1) {
    const dx = x1 - x0, dz = z1 - z0;
    const steps = Math.ceil(Math.hypot(dx, dz) / (this.cell * 0.6));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (this.solidAt(x0 + dx * t, z0 + dz * t)) return false;
    }
    return true;
  }

  // A* over the grid. Returns array of [x,z] world points (excluding start).
  findPath(sx, sz, tx, tz, maxNodes = 4000) {
    const [scx, scz] = this.cellOf(sx, sz);
    const [tcx, tcz] = this.cellOf(tx, tz);
    if (!this.inBounds(scx, scz) || !this.inBounds(tcx, tcz)) return null;
    if (this.solidAtCell(tcx, tcz)) {
      // nudge target to nearest open cell
      let found = null, best = 1e9;
      for (let dz = -3; dz <= 3 && !found; dz++) for (let dx = -3; dx <= 3; dx++) {
        const cx = tcx + dx, cz = tcz + dz;
        if (!this.inBounds(cx, cz) || this.solidAtCell(cx, cz)) continue;
        const d = dx * dx + dz * dz;
        if (d < best) { best = d; found = [cx, cz]; }
      }
      if (!found) return null;
      return this._astar(scx, scz, found[0], found[1], maxNodes);
    }
    return this._astar(scx, scz, tcx, tcz, maxNodes);
  }

  _astar(scx, scz, tcx, tcz, maxNodes) {
    if (scx === tcx && scz === tcz) return [];
    const W = this.w;
    const g = new Float32Array(W * this.h).fill(Infinity);
    const came = new Int32Array(W * this.h).fill(-1);
    const closed = new Uint8Array(W * this.h);
    const start = this.idx(scx, scz), goal = this.idx(tcx, tcz);
    g[start] = 0;
    const open = new MinHeap();
    const h = (cx, cz) => { const dx = Math.abs(cx - tcx), dz = Math.abs(cz - tcz); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
    open.push([start, h(scx, scz)]);
    let visited = 0;
    const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    while (open.size) {
      const [cur] = open.pop();
      if (cur === goal) return this._reconstruct(came, cur);
      if (closed[cur]) continue;
      closed[cur] = 1;
      if (++visited > maxNodes) return this._reconstruct(came, cur);
      const cx = cur % W, cz = (cur / W) | 0;
      for (const [dx, dz, cost] of NB) {
        const nx = cx + dx, nz = cz + dz;
        if (!this.inBounds(nx, nz)) continue;
        const ni = this.idx(nx, nz);
        if (closed[ni] || this.solidAtCell(nx, nz)) continue;
        if (dx && dz && (this.solidAtCell(cx + dx, cz) || this.solidAtCell(cx, cz + dz))) continue; // no corner cutting
        const ng = g[cur] + cost;
        if (ng < g[ni]) { g[ni] = ng; came[ni] = cur; open.push([ni, ng + h(nx, nz)]); }
      }
    }
    return null;
  }

  _reconstruct(came, end) {
    const cells = [];
    let cur = end;
    while (cur !== -1) { cells.push(cur); cur = came[cur]; }
    cells.reverse();
    return cells.slice(1).map((i) => this.center(i % this.w, (i / this.w) | 0));
  }
}
