// Small deterministic value-noise for terrain.
import { RNG } from '../core/rng.js';

export function makeNoise(seed) {
  const rng = new RNG(seed);
  const size = 256;
  const table = new Float32Array(size * size);
  for (let i = 0; i < table.length; i++) table[i] = rng.next();
  const at = (x, y) => {
    x = ((x % size) + size) % size;
    y = ((y % size) + size) % size;
    return table[y * size + x];
  };
  const smooth = (t) => t * t * (3 - 2 * t);
  return function noise(x, y, scale = 0.05, amp = 1, oct = 3) {
    let v = 0, a = amp, f = scale, norm = 0;
    for (let o = 0; o < oct; o++) {
      const sx = x * f, sy = y * f;
      const x0 = Math.floor(sx), y0 = Math.floor(sy);
      const tx = smooth(sx - x0), ty = smooth(sy - y0);
      const v00 = at(x0, y0), v10 = at(x0 + 1, y0), v01 = at(x0, y0 + 1), v11 = at(x0 + 1, y0 + 1);
      const vx = v00 + (v10 - v00) * tx;
      const vy = v01 + (v11 - v01) * tx;
      v += (vx + (vy - vx) * ty) * a;
      norm += a;
      a *= 0.5; f *= 2.1;
    }
    return (v / norm) * 2 - 1; // -1..1
  };
}
