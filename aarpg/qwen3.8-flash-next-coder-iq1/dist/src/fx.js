// Effects: pooled thin-instance particles, telegraph rings, slashes, DOM floaters, shake.
import { S } from './state.js';
import { U } from './util.js';

const B = window.BABYLON;
export const FX = {};

export const MAX_PARTICLES = 110;
export const MAX_RINGS = 26;
export const MAX_SLASHES = 20;
export const MAX_TEXTS = 70;

export let pool = null;

export function initFx() {
  const sc = S.scene;
  pool = { particles: [], rings: [], slashes: [], texts: [], shake: 0, shakeT: 0 };
  pool.pMesh = [];
  pool.pMat = [];
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const geo = B.MeshBuilder.CreateBox('fx_p' + i, { size: 1 }, sc);
    const m = new B.StandardMaterial('fx_pm' + i, sc);
    m.unlit = true;
    m.emissiveColor = new B.Color3(1, 1, 1);
    m.diffuseColor = new B.Color3(0, 0, 0);
    m.specularColor = new B.Color3(0, 0, 0);
    geo.material = m;
    geo.isVisible = false;
    pool.pMesh.push(geo);
    pool.pMat.push(m);
  }
  pool.pAlive = new Uint8Array(MAX_PARTICLES);
  pool.pPos = new Float32Array(MAX_PARTICLES * 3);
  pool.pVel = new Float32Array(MAX_PARTICLES * 3);
  pool.pLife = new Float32Array(MAX_PARTICLES);
  pool.pMax = new Float32Array(MAX_PARTICLES);
  pool.pSize = new Float32Array(MAX_PARTICLES);
  pool.pCol = new Float32Array(MAX_PARTICLES * 3);
  pool.pRot = new Float32Array(MAX_PARTICLES);
  pool.pSpin = new Float32Array(MAX_PARTICLES);
  pool.pIdx = 0;

  for (let i = 0; i < MAX_RINGS; i++) {
    const d = B.MeshBuilder.CreateDisc('fx_ring' + i, { radius: 1, tessellation: 26 }, sc);
    d.rotation.x = Math.PI / 2;
    const mm = new B.StandardMaterial('fx_ringm' + i, sc);
    mm.unlit = true; mm.alpha = 0.4; mm.backFaceCulling = false;
    mm.emissiveColor = new B.Color3(1, 0.2, 0.15); mm.diffuseColor = new B.Color3(0, 0, 0);
    d.material = mm;
    d.isVisible = false;
    pool.rings.push({ mesh: d, mat: mm, life: 0, ttl: 1, r: 1, max: 1, color: [1, 0.2, 0.15] });
  }
  for (let i = 0; i < MAX_SLASHES; i++) {
    const b = B.MeshBuilder.CreateBox('fx_sl' + i, { w: 1, h: 0.12, d: 1 }, sc);
    const mm = new B.StandardMaterial('fx_slm' + i, sc);
    mm.unlit = true; mm.alpha = 0.85;
    mm.emissiveColor = new B.Color3(1, 1, 1); mm.diffuseColor = new B.Color3(0, 0, 0);
    b.material = mm; b.isVisible = false;
    pool.slashes.push({ mesh: b, mat: mm, life: 0, ttl: 0.22, color: [1, 1, 1] });
  }
  // DOM floaters
  let layer = document.getElementById('fxlayer');
  if (!layer) {
    const d = document.createElement('div');
    d.id = 'fxlayer';
    d.style.position = 'fixed'; d.style.left = '0'; d.style.top = '0';
    d.style.pointerEvents = 'none';
    d.style.zIndex = '40';
    document.body.appendChild(d);
    layer = d;
  }
  pool.layer = layer;
  pool.texts = [];
  for (let i = 0; i < MAX_TEXTS; i++) {
    const el = document.createElement('div');
    el.style.position = 'absolute'; el.style.willChange = 'transform,opacity';
    el.style.font = '700 15px system-ui, sans-serif';
    el.style.textShadow = '0 0 3px rgba(0,0,0,.9)';
    el.style.display = 'none';
    layer.appendChild(el);
    pool.texts.push({ el, life: 0, ttl: 1, x: 0, y: 0, z: 0, dy: 0 });
  }
  pool.tIdx = 0;
  return pool;
}

export function spawnParticle(x, y, z, vx, vy, vz, life, size, col, spin) {
  const i = pool.pIdx; pool.pIdx = (pool.pIdx + 1) % MAX_PARTICLES;
  pool.pAlive[i] = 1;
  pool.pPos[i * 3] = x; pool.pPos[i * 3 + 1] = y; pool.pPos[i * 3 + 2] = z;
  pool.pVel[i * 3] = vx; pool.pVel[i * 3 + 1] = vy; pool.pVel[i * 3 + 2] = vz;
  pool.pLife[i] = life; pool.pMax[i] = life;
  pool.pSize[i] = size;
  pool.pCol[i * 3] = col[0]; pool.pCol[i * 3 + 1] = col[1]; pool.pCol[i * 3 + 2] = col[2];
  pool.pRot[i] = 0; pool.pSpin[i] = spin;
  return i;
}

export function burst(x, y, z, colorHex, count, opts) {
  const c = U.hexToRgb(colorHex);
  const spread = opts?.spread ?? 3.2;
  const life = opts?.life ?? 0.42;
  const size = opts?.size ?? 0.16;
  const up = opts?.up ?? 2.4;
  const rng = S.rng;
  for (let i = 0; i < count; i++) {
    const a = rng.next() * Math.PI * 2, r = rng.next() * spread;
    spawnParticle(x, y + 0.2, z, Math.cos(a) * r, rng.next() * up, Math.sin(a) * r, life * (0.6 + rng.next() * 0.7), size * (0.6 + rng.next() * 0.9), c, rng.next() * 6);
  }
}

export function ring(x, z, radius, colorHex, ttl, opts) {
  let best = null;
  for (const r of pool.rings) if (!r.life && !best) best = r;
  if (!best) best = pool.rings[0];
  const c = U.hexToRgb(colorHex);
  best.life = ttl; best.ttl = ttl; best.r = radius; best.max = opts?.growTo ?? radius;
  best.color = c;
  best.mat.emissiveColor = new B.Color3(c[0], c[1], c[2]);
  best.mesh.isVisible = true;
  best.mesh.position.x = x; best.mesh.position.z = z; best.mesh.position.y = 0.06;
  return best;
}

export function slash(x, y, z, yaw, len, colorHex, ttl) {
  let s = null;
  for (const q of pool.slashes) if (!q.life && !s) s = q;
  if (!s) s = pool.slashes[0];
  const c = U.hexToRgb(colorHex);
  s.life = ttl; s.ttl = ttl;
  s.mat.emissiveColor = new B.Color3(c[0], c[1], c[2]);
  s.mesh.isVisible = true;
  s.mesh.position.x = x; s.mesh.position.y = y; s.mesh.position.z = z;
  s.mesh.rotation.y = yaw;
  s.mesh.scaling.x = len; s.mesh.scaling.z = 0.5;
  return s;
}

export function text(x, y, z, str, colorHex, ttl, cls) {
  let t = null;
  for (let k = 0; k < MAX_TEXTS; k++) {
    const i = (pool.tIdx + k) % MAX_TEXTS;
    if (!pool.texts[i].life) { t = pool.texts[i]; pool.tIdx = i; break; }
  }
  if (!t) return null;
  t.life = ttl; t.ttl = ttl; t.x = x; t.y = y; t.z = z; t.dy = 0;
  t.el.textContent = str;
  t.el.style.color = colorHex;
  if (cls) t.el.className = cls;
  return t;
}

export function shake(amt) { pool.shake = Math.max(pool.shake, amt); }

export function updateFx(dt) {
  if (!pool) return;
  // particles
  const P = pool;
  let any = false;
  for (let i = 0; i < MAX_PARTICLES; i++) {
    if (!P.pAlive[i]) { continue; }
    P.pLife[i] -= dt;
    if (P.pLife[i] <= 0) { P.pAlive[i] = 0; continue; }
    const g = 3.4 * dt;
    P.pPos[i * 3] += P.pVel[i * 3] * dt;
    P.pPos[i * 3 + 1] += P.pVel[i * 3 + 1] * dt;
    P.pPos[i * 3 + 2] += P.pVel[i * 3 + 2] * dt;
    P.pVel[i * 3 + 1] -= g;
    if (P.pPos[i * 3 + 1] < 0.05) { P.pPos[i * 3 + 1] = 0.05; P.pVel[i * 3 + 1] = Math.abs(P.pVel[i * 3 + 1]) * 0.3; }
    any = true;
  }
  const mn = P.pMesh, mm = P.pMat;
  for (let i = 0; i < MAX_PARTICLES; i++) {
    if (!P.pAlive[i]) {
      if (mn[i].isVisible) mn[i].isVisible = false;
      continue;
    }
    const s = P.pSize[i] * (0.3 + 0.7 * (P.pLife[i] / (P.pMax[i] || 1)));
    const sc2 = s < 0.02 ? 0.02 : s;
    const mesh = mn[i];
    mesh.position.x = P.pPos[i * 3];
    mesh.position.y = P.pPos[i * 3 + 1];
    mesh.position.z = P.pPos[i * 3 + 2];
    mesh.scaling.x = sc2; mesh.scaling.y = sc2; mesh.scaling.z = sc2;
    mesh.rotation.y = P.pRot[i];
    mesh.isVisible = true;
    const mt = mm[i];
    mt.emissiveColor = new B.Color3(P.pCol[i * 3], P.pCol[i * 3 + 1], P.pCol[i * 3 + 2]);
    P.pRot[i] += P.pSpin[i] * dt;
  }

  for (const r of pool.rings) {
    if (!r.life) { if (r.mesh.isVisible) r.mesh.isVisible = false; continue; }
    r.life -= dt;
    if (r.life <= 0) { r.mesh.isVisible = false; continue; }
    const k = 1 - r.life / r.ttl;
    const rad = r.r + (r.max - r.r) * k;
    r.mesh.scaling.x = rad; r.mesh.scaling.z = rad;
    r.mat.alpha = 0.18 + 0.42 * (1 - k);
  }
  for (const s of pool.slashes) {
    if (!s.life) { if (s.mesh.isVisible) s.mesh.isVisible = false; continue; }
    s.life -= dt;
    if (s.life <= 0) { s.mesh.isVisible = false; continue; }
    const k = 1 - s.life / s.ttl;
    s.mat.alpha = 0.95 * (1 - k);
    s.mesh.scaling.y = 0.6 + 2.2 * k;
  }
  for (const t of pool.texts) {
    if (!t.life) { if (t.el.style.display !== 'none') t.el.style.display = 'none'; continue; }
    t.life -= dt;
    if (t.life <= 0) { t.el.style.display = 'none'; continue; }
    const k = 1 - t.life / t.ttl;
    t.dy = 26 * k - 8 * k * k;
    t._vis = true;
  }
  if (pool.shake > 0) { pool.shake = Math.max(0, pool.shake - dt * 6); }
}

export function projectTexts() {
  if (!pool) return;
  for (const t of pool.texts) {
    if (!t.life) continue;
    const s = U.worldToScreen(t.x, t.y, t.z);
    if (!s) { t.el.style.display = 'none'; continue; }
    const k = 1 - t.life / t.ttl;
    t.el.style.display = 'block';
    t.el.style.transform = 'translate(' + Math.round(s[0]) + 'px,' + Math.round(s[1] - t.dy) + 'px)';
    t.el.style.opacity = String(Math.min(1, (1 - k) * 1.6));
  }
}
FX.projectTexts = projectTexts;

export const F = { initFx, spawnParticle, burst, ring, slash, text, shake, updateFx, projectTexts };
Object.defineProperty(F, 'pool', { get: () => pool, configurable: true });
