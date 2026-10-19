// Math / vector helpers (Babylon vectors used elsewhere; these are plain 2D ground-space helpers).
export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
export const dist = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));
export function angleTo(ax, ay, bx, by) { return Math.atan2(bx - ax, by - ay); }
export function angleDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU;
  return d;
}
export function approach(cur, target, step) {
  if (cur < target) return Math.min(cur + step, target);
  if (cur > target) return Math.max(cur - step, target);
  return cur;
}
export function smoothstep(t) { return t * t * (3 - 2 * t); }
export function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
export function easeOutBack(t) { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
// Cone test: is (angle) within half-width of facing?
export function inCone(facing, angle, halfWidth) { return Math.abs(angleDiff(facing, angle)) <= halfWidth; }
