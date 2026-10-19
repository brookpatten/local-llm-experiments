// Math, RNG, projection helpers. No Babylon dependency except camera objects.
import { S } from './state.js';

export const U = {};

// ---------- RNG ----------
export function hashStr(s) {
  let h = 2166136261 ^ s.length;
  for (let i = 0; i < s.length; i++) { h = (h * 16777619 + s.charCodeAt(i)) | 0; }
  return h ^ (h >>> 13);
}
export function mulberry32(seed) {
  let a = seed | 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = a; t = ((t ^ (t >>> 15)) * (t | 1)) | 0; t ^= t + (((t ^ (t >>> 7)) * (t | 61)) | 0); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export class Rng {
  constructor(seed = 1) { this.f = mulberry32(seed || 1); }
  next() { return this.f(); }
  range(a, b) { return a + this.f() * (b - a); }
  int(a, b) { return a + Math.floor(this.f() * (b - a + 1)); }
  pick(arr) { return arr[Math.floor(this.f() * arr.length)]; }
  chance(p) { return this.f() < p; }
  weighted(items, weights) {
    let tot = 0; for (const w of weights) tot += w;
    let r = this.f() * tot;
    for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  }
}
U.Rng = Rng; U.hashStr = hashStr;

// ---------- scalar math ----------
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (v - a) / (b - a);
export const smoothstep = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
export const easeOut = (t) => { t = clamp01(t); return 1 - (1 - t) * (1 - t); };
export const easeIn = (t) => { t = clamp01(t); return t * t; };
export const easeInOut = (t) => { t = clamp01(t); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
export const easeOutBack = (t) => { const c = 1.70158; t = clamp01(t); return 1 + (c + 1) * Math.pow(t - 1, 3) + c * (t - 1); };
export const approach = (cur, target, rate) => cur < target ? Math.min(cur + rate, target) : Math.max(cur - rate, target);
export const wrapAngle = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
export const angleDelta = (a, b) => wrapAngle(b - a);
export const angleLerp = (a, b, t) => a + angleDelta(a, b) * t;
U.clamp = clamp; U.clamp01 = clamp01; U.lerp = lerp; U.smoothstep = smoothstep;
U.easeOut = easeOut; U.easeIn = easeIn; U.easeInOut = easeInOut; U.easeOutBack = easeOutBack;
U.approach = approach; U.wrapAngle = wrapAngle; U.angleDelta = angleDelta; U.angleLerp = angleLerp;

// ---------- 2D (XZ plane) vector math ----------
export const d2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
export const d2sq = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };
export const norm2 = (x, z) => { const l = Math.hypot(x, z); return l < 1e-9 ? [0, 0] : [x / l, z / l]; };
export const dot2 = (ax, az, bx, bz) => ax * bx + az * bz;
export const cross2 = (ax, az, bx, bz) => ax * bz - az * bx;
export const heading = (x, z) => Math.atan2(x, z); // yaw for Babylon (rotation.y) with forward +Z
export const fwdFromYaw = (yaw) => [Math.sin(yaw), Math.cos(yaw)];
export const rot2 = (x, z, yaw) => { const c = Math.cos(yaw), s = Math.sin(yaw); return [x * c + z * s, -x * s + z * c]; };
U.d2 = d2; U.d2sq = d2sq; U.norm2 = norm2; U.dot2 = dot2; U.cross2 = cross2;
U.heading = heading; U.fwdFromYaw = fwdFromYaw; U.rot2 = rot2;

// ---------- color ----------
export const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  return [parseInt(h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h.slice(0, 2), 16) / 255,
    parseInt(h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h.slice(2, 4), 16) / 255,
    parseInt(h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h.slice(4, 6), 16) / 255];
};
export const mixRgb = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const scaleRgb = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
U.hexToRgb = hexToRgb; U.mixRgb = mixRgb; U.scaleRgb = scaleRgb;

// ---------- camera projection (world -> screen px) ----------
// Uses the camera's own basis vectors so it matches Babylon exactly.
export let _camCache = { pos: null, fwd: null, up: null, right: null, f: 1, aspect: 1, w: 1, h: 1 };
export function refreshCamCache() {
  const cam = S.camera; if (!cam) return;
  const c = _camCache;
  c.pos = cam.position;
  c.fwd = cam.getForwardAxis ? cam.getForwardAxis() : null;
  c.up = cam.up; c.right = cam.right;
  const fov = cam.fov || 0.8;
  c.w = S.canvas ? S.canvas.width : 1;
  c.h = S.canvas ? S.canvas.height : 1;
  c.aspect = c.w / c.h;
  c.f = 1 / Math.tan(fov / 2);
}
export function worldToScreen(x, y, z) {
  const c = _camCache; if (!c.fwd) return null;
  const px = x - c.pos.x, py = y - c.pos.y, pz = z - c.pos.z;
  const f = c.fwd, up = c.up, rt = c.right;
  const zc = px * f.x + py * f.y + pz * f.z;
  if (zc <= 0.05) return null;
  const xc = px * rt.x + py * rt.y + pz * rt.z;
  const yc = px * up.x + py * up.y + pz * up.z;
  const ndcx = (c.f / c.aspect) * xc / zc;
  const ndcy = c.f * yc / zc;
  return [c.w * 0.5 + ndcx * c.w * 0.5, c.h * 0.5 - ndcy * c.h * 0.5, zc];
}
U.worldToScreen = worldToScreen; U.refreshCamCache = refreshCamCache;

// ---------- screen -> ground plane (y = groundY) ----------
export function screenToGround(mx, my, groundY = 0) {
  const B = window.BABYLON; const sc = S.scene;
  if (!sc || !S.camera) return null;
  const r = sc.createPickingRay(mx, my, B.Matrix.Identity(), S.camera);
  if (!r || Math.abs(r.direction.y) < 1e-5) return null;
  const t = (groundY - r.origin.y) / r.direction.y;
  if (t <= 0) return null;
  return [r.origin.x + r.direction.x * t, r.origin.z + r.direction.z * t];
}
U.screenToGround = screenToGround;

// ---------- collision: circle vs grid ----------
// grid[y][x] is a cell code; solid() decides blocking.
export function isSolid(ch) { return ch === '#' || ch === 'T' || ch === 'r' || ch === 'W' || ch === 'D' || ch === 'X'; }
U.isSolid = isSolid;

export function resolveCircle(px, pz, r, solidAt, out) {
  // slide a circle avoiding solid cells; writes corrected position into out {x,z}
  const cell = S.cell;
  let x = px, z = pz;
  for (let pass = 0; pass < 2; pass++) {
    const minX = Math.floor((x - r) / cell), maxX = Math.floor((x + r) / cell);
    const minZ = Math.floor((z - r) / cell), maxZ = Math.floor((z + r) / cell);
    for (let gy = minZ; gy <= maxZ; gy++) {
      for (let gx = minX; gx <= maxX; gx++) {
        if (!solidAt(gx, gy)) continue;
        const bx0 = gx * cell, bz0 = gy * cell;
        const qx = clamp(x, bx0, bx0 + cell), qz = clamp(z, bz0, bz0 + cell);
        let dx = x - qx, dz = z - qz;
        const dd = dx * dx + dz * dz;
        if (dd < r * r) {
          let d = Math.sqrt(dd);
          if (d < 1e-6) { dx = x - (bx0 + cell * 0.5); dz = z - (bz0 + cell * 0.5); d = Math.hypot(dx, dz) || 1; }
          const k = (r - d) / d;
          x += dx * k; z += dz * k;
        }
      }
    }
  }
  out.x = x; out.z = z;
  return out;
}
U.resolveCircle = resolveCircle;

// line of sight across the grid (Bresenham-ish sampling)
export function los(x0, z0, x1, z1, solidAt) {
  const cell = S.cell;
  const dx = x1 - x0, dz = z1 - z0;
  const dist = Math.hypot(dx, dz);
  const steps = Math.ceil(dist / (cell * 0.4));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x0 + dx * t, z = z0 + dz * t;
    if (solidAt(Math.floor(x / cell), Math.floor(z / cell))) return false;
  }
  return true;
}
U.los = los;

// ---------- small caches ----------
export const matCache = new Map();
export const geoCache = new Map();
U.matCache = matCache; U.geoCache = geoCache;

U.d2sq = d2sq; U.screenToGround = screenToGround; U.los = los; U.isSolid = isSolid; U.resolveCircle = resolveCircle;
