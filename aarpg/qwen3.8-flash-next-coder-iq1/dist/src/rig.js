// Procedural low-poly humanoid/creature rigs. No skeletal assets - anchors + boxes.
import { U } from './util.js';

export const RIG = {};
const B = window.BABYLON;

// ---------- node (invisible transform box) ----------
export function node(scene, name, px, py, pz, parent) {
  const n = B.MeshBuilder.CreateBox(name, { size: 0.001 }, scene);
  n.isVisible = false;
  n.position = new B.Vector3(px, py, pz);
  if (parent) n.parent = parent;
  return n;
}

export function box(scene, name, w, h, d, px, py, pz, parent, mat) {
  const m = B.MeshBuilder.CreateBox(name, { w, h, d }, scene);
  m.position = new B.Vector3(px, py, pz);
  if (parent) m.parent = parent;
  if (mat) m.material = mat;
  return m;
}

export function mat(scene, name, hex, opts) {
  const m = new B.StandardMaterial(name, scene);
  const c = U.hexToRgb(hex);
  m.diffuseColor = new B.Color3(c[0] * 0.82, c[1] * 0.82, c[2] * 0.82);
  m.roughness = 0.85; m.metallic = 0.05;
  m.specularColor = new B.Color3(0.14, 0.14, 0.16);
  m.specularPower = 24;
  m.emissiveColor = new B.Color3(c[0] * 0.4, c[1] * 0.4, c[2] * 0.4);
  if (opts && opts.emissive) {
    const e = U.hexToRgb(opts.emissive);
    m.emissiveColor = new B.Color3(e[0], e[1], e[2]);
  }
  if (opts && opts.metal) { m.metallic = opts.metal; m.roughness = 0.32; m.specularColor = new B.Color3(0.5, 0.5, 0.55); }
  if (opts && opts.unlit) m.unlit = true;
  return m;
}
RIG.node = node; RIG.box = box; RIG.mat = mat;

// ---------- humanoid rig ----------
// spec: { scale, colors:{body,accent,skin,metal,trim}, weapon:'sword'|'bow'|'staff'|'none', shield:bool, helm:bool, cape:bool }
export function buildHumanoid(scene, name, spec) {
  const sc = spec.scale || 1;
  const cols = spec.colors || {};
  const bodyMat = mat(scene, name + '_body', cols.body || '#6b7a8f');
  const accentMat = mat(scene, name + '_accent', cols.accent || '#9c3f33');
  const skinMat = mat(scene, name + '_skin', cols.skin || '#d8ab84');
  const metalMat = mat(scene, name + '_metal', cols.metal || '#9aa3ad', { metal: 0.8 });
  const trimMat = mat(scene, name + '_trim', cols.trim || cols.accent || '#9c3f33');

  const root = node(scene, name + '_root', 0, 0, 0, null);
  root.scaling = new B.Vector3(sc, sc, sc);
  const r = { root, mats: [bodyMat, accentMat, skinMat, metalMat, trimMat], name };
  r.baseScale = sc;

  r.hips = node(scene, name + '_hips', 0, 0.86 * 1, 0, root);
  r.legL = node(scene, name + '_legL', 0.17, 0.86, 0, r.hips);
  r.legR = node(scene, name + '_legR', -0.17, 0.86, 0, r.hips);
  r.shinL = box(scene, name + '_shinL', 0.22, 0.5, 0.26, 0, -0.25, 0, r.legL, bodyMat);
  r.shinR = box(scene, name + '_shinR', 0.22, 0.5, 0.26, 0, -0.25, 0, r.legR, bodyMat);
  r.bootL = box(scene, name + '_bootL', 0.26, 0.2, 0.36, 0, -0.52, 0.04, r.legL, metalMat);
  r.bootR = box(scene, name + '_bootR', 0.26, 0.2, 0.36, 0, -0.52, 0.04, r.legR, metalMat);

  r.torso = node(scene, name + '_torso', 0, 0.9, 0, r.hips);
  r.chest = box(scene, name + '_chest', 0.68, 0.62, 0.44, 0, 0.31, 0, r.torso, bodyMat);
  r.belt = box(scene, name + '_belt', 0.74, 0.12, 0.48, 0, 0.0, 0, r.torso, trimMat);
  r.head = node(scene, name + '_head', 0, 0.68, 0, r.torso);
  r.skull = box(scene, name + '_skull', 0.32, 0.32, 0.32, 0, 0.16, 0, r.head, skinMat);
  if (spec.helm) {
    r.helm = box(scene, name + '_helm', 0.38, 0.26, 0.38, 0, 0.24, 0, r.head, metalMat);
    r.visor = box(scene, name + '_visor', 0.3, 0.06, 0.06, 0, 0.16, 0.2, r.head, trimMat);
  }
  if (spec.cape) {
    r.cape = box(scene, name + '_cape', 0.6, 0.9, 0.06, 0, 0.16, -0.28, r.torso, accentMat);
  }
  r.armL = node(scene, name + '_armL', 0.44, 0.56, 0, r.torso);
  r.armR = node(scene, name + '_armR', -0.44, 0.56, 0, r.torso);
  r.foreL = box(scene, name + '_foreL', 0.19, 0.5, 0.21, 0, -0.25, 0, r.armL, bodyMat);
  r.foreR = box(scene, name + '_foreR', 0.19, 0.5, 0.21, 0, -0.25, 0, r.armR, bodyMat);
  r.handL = box(scene, name + '_handL', 0.16, 0.14, 0.16, 0, -0.54, 0, r.armL, skinMat);
  r.handR = box(scene, name + '_handR', 0.16, 0.14, 0.16, 0, -0.54, 0, r.armR, skinMat);
  r.shoulderL = box(scene, name + '_pauldronL', 0.26, 0.2, 0.3, 0, -0.02, 0, r.armL, metalMat);
  r.shoulderR = box(scene, name + '_pauldronR', 0.26, 0.2, 0.3, 0, -0.02, 0, r.armR, metalMat);

  // weapon in right hand (hand points down -Y from armR anchor)
  r.weapon = null;
  if (spec.weapon === 'sword') {
    const g = node(scene, name + '_weap', 0, -0.56, 0, r.armR);
    box(scene, name + '_grip', 0.07, 0.16, 0.07, 0, 0.06, 0, g, trimMat);
    box(scene, name + '_guard', 0.22, 0.06, 0.08, 0, 0.16, 0, g, metalMat);
    r.blade = box(scene, name + '_blade', 0.09, 0.9, 0.05, 0, 0.64, 0, g, metalMat);
    r.weapon = g;
  } else if (spec.weapon === 'axe') {
    const g = node(scene, name + '_weap', 0, -0.56, 0, r.armR);
    box(scene, name + '_haft', 0.08, 0.9, 0.08, 0, 0.45, 0, g, trimMat);
    box(scene, name + '_head', 0.34, 0.26, 0.12, 0.16, 0.86, 0, g, metalMat);
    r.weapon = g;
  } else if (spec.weapon === 'bow') {
    const g = node(scene, name + '_weap', 0, -0.56, 0, r.armL);
    box(scene, name + '_limbU', 0.06, 0.5, 0.06, 0, 0.3, 0.1, g, trimMat);
    box(scene, name + '_limbD', 0.06, 0.5, 0.06, 0, -0.2, 0.1, g, trimMat);
    box(scene, name + '_riser', 0.08, 0.16, 0.1, 0, 0.05, 0.12, g, metalMat);
    r.string = box(scene, name + '_string', 0.02, 0.9, 0.02, 0, 0.05, 0.02, g, skinMat);
    r.weapon = g;
  } else if (spec.weapon === 'staff') {
    const g = node(scene, name + '_weap', 0, -0.56, 0, r.armR);
    box(scene, name + '_shaft', 0.08, 1.5, 0.08, 0, 0.6, 0, g, trimMat);
    const gemMat = mat(scene, name + '_gem', spec.gem || '#ff7a3a', { emissive: spec.gem || '#ff7a3a', unlit: true });
    r.gem = box(scene, name + '_gem', 0.2, 0.2, 0.2, 0, 1.42, 0, g, gemMat);
    r.mats.push(gemMat);
    r.weapon = g;
  } else if (spec.weapon === 'spear') {
    const g = node(scene, name + '_weap', 0, -0.56, 0, r.armR);
    box(scene, name + '_haft', 0.07, 1.7, 0.07, 0, 0.7, 0, g, trimMat);
    box(scene, name + '_tip', 0.12, 0.34, 0.12, 0, 1.66, 0, g, metalMat);
    r.weapon = g;
  } else if (spec.weapon === 'wand') {
    const g = node(scene, name + '_weap', 0, -0.56, 0, r.armR);
    box(scene, name + '_wand', 0.05, 0.5, 0.05, 0, 0.2, 0, g, trimMat);
    const gemMat = mat(scene, name + '_gem', spec.gem || '#7ad6ff', { emissive: spec.gem || '#7ad6ff', unlit: true });
    r.gem = box(scene, name + '_gem', 0.14, 0.14, 0.14, 0, 0.48, 0, g, gemMat);
    r.mats.push(gemMat);
    r.weapon = g;
  }

  // shield in left hand
  r.shield = null;
  if (spec.shield) {
    const g = node(scene, name + '_shield', 0, -0.5, 0, r.armL);
    box(scene, name + '_shieldFace', 0.56, 0.7, 0.08, 0, 0.05, 0.14, g, metalMat);
    box(scene, name + '_shieldBoss', 0.18, 0.2, 0.1, 0, 0.05, 0.22, g, trimMat);
    r.shield = g;
  }

  r.parts = [r.root, r.hips, r.torso, r.head, r.legL, r.legR, r.armL, r.armR];
  r.meshes = [];
  collectMeshes(scene, name + '_', r.meshes);
  r.base = snapshot(r);
  return r;
}

export function collectMeshes(scene, prefix, out) {
  for (const m of scene.meshes) if (m.name && m.name.indexOf(prefix) === 0) out.push(m);
  return out;
}

export function snapshot(r) {
  const keys = ['hips', 'torso', 'head', 'legL', 'legR', 'armL', 'armR'];
  const o = {};
  for (const k of keys) {
    const p = r[k];
    o[k] = { x: p.position.x, y: p.position.y, z: p.position.z, rx: p.rotation.x, ry: p.rotation.y, rz: p.rotation.z };
  }
  return o;
}

// ---------- posing ----------
// t = time, st = {act:'idle'|'walk'|'run'|'attack'|'cast'|'hurt'|'block'|'roll'|'die', prog 0..1, dir, speed}
export function pose(r, act, prog, opts) {
  const b = r.base;
  const t = opts?.t || 0;
  const set = (k, rx, ry, rz, dy) => {
    const p = r[k];
    p.rotation.x = rx; p.rotation.y = ry; p.rotation.z = rz;
    if (dy !== undefined) p.position.y = b[k].y + dy;
  };
  const hips = r.hips, torso = r.torso;
  if (act === 'walk' || act === 'run') {
    const f = (act === 'run' ? 0.9 : 0.62);
    const s = Math.sin(t * (act === 'run' ? 11 : 8.5));
    const s2 = Math.sin(t * (act === 'run' ? 11 : 8.5) + Math.PI);
    set('legL', s * f, 0, 0, 0); set('legR', s2 * f, 0, 0, 0);
    set('armL', s2 * f * 0.7, 0, 0.08, 0); set('armR', s * f * 0.7, 0, -0.08, 0);
    hips.position.y = b.hips.y + Math.abs(Math.cos(t * (act === 'run' ? 11 : 8.5))) * 0.05;
    set('torso', 0.04, Math.sin(t * 4) * 0.06, 0, 0);
  } else if (act === 'attack') {
    // prog 0..1: windup (0..0.45) strike (0.45..0.75) recover
    const w = prog < 0.45 ? prog / 0.45 : 1;
    const s = prog < 0.45 ? 0 : prog < 0.75 ? (prog - 0.45) / 0.3 : 1;
    const swing = -1.5 * w + 2.3 * easeOutLocal(s);
    set('armR', swing, 0.3 * w, -0.2 + 0.5 * s, 0);
    set('torso', 0.1 * s, -0.7 * w + 0.9 * s, 0, 0);
    set('armL', -0.5 + 0.4 * s, 0, 0.3, 0);
    hips.position.y = b.hips.y - 0.05 + 0.08 * s;
    set('legL', 0.3 * s, 0, 0, 0); set('legR', -0.25 * s, 0, 0, 0);
  } else if (act === 'cast') {
    const w = Math.sin(prog * Math.PI);
    set('armR', -1.2 * w - 0.2, 0, -0.3, 0);
    set('armL', -0.9 * w, 0, 0.3, 0);
    set('torso', -0.08 * w, 0, 0, 0.03 * w);
  } else if (act === 'block') {
    set('armL', -1.15, 0.35, 0.15, 0);
    set('armR', -0.5, -0.2, -0.25, 0);
    set('torso', 0.06, 0.25, 0, -0.03);
    set('legL', 0.18, 0, 0, 0); set('legR', -0.18, 0, 0, 0);
    hips.position.y = b.hips.y - 0.06;
  } else if (act === 'hurt') {
    const k = 1 - prog;
    set('torso', -0.35 * k, 0.2 * k, 0, 0);
    set('head', -0.3 * k, 0, 0, 0);
    set('armL', -0.9 * k, 0, 0.5 * k, 0); set('armR', -0.9 * k, 0, -0.5 * k, 0);
    hips.position.y = b.hips.y - 0.05 * k;
  } else if (act === 'roll') {
    // handled by root rotation in caller; here tuck limbs
    set('armL', -0.6, 0, 0.4, 0); set('armR', -0.6, 0, -0.4, 0);
    set('legL', 0.9, 0, 0, 0.12); set('legR', 0.9, 0, 0, 0.12);
    set('torso', 0.5, 0, 0, -0.12);
  } else if (act === 'die') {
    const k = easeOutLocal(prog);
    hips.position.y = b.hips.y - 0.62 * k;
    set('torso', 1.2 * k, 0, 0, -0.1 * k);
    set('legL', -0.4 * k, 0, 0.2, 0); set('legR', -0.4 * k, 0, -0.2, 0);
    set('armL', 0.6 * k, 0, 0.7, 0); set('armR', 0.6 * k, 0, -0.7, 0);
    r.root.scaling.y = (r.baseScale || 1) * (1 - 0.25 * k);
  } else {
    // idle
    const s = Math.sin(t * 2.1) * 0.04;
    set('torso', s * 0.4, Math.sin(t * 0.9) * 0.05, 0, 0);
    set('armL', s, 0, 0.1, 0); set('armR', -s, 0, -0.1, 0);
    set('head', 0, Math.sin(t * 0.7) * 0.12, 0, 0);
    hips.position.y = b.hips.y + Math.sin(t * 2.1) * 0.015;
  }
}
function easeOutLocal(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return 1 - (1 - x) * (1 - x); }

export function resetPose(r) {
  const b = r.base;
  for (const k in b) {
    const p = r[k];
    p.rotation.x = b[k].rx; p.rotation.y = b[k].ry; p.rotation.z = b[k].rz;
    p.position.y = b[k].y;
  }
}

// ---------- creature rigs ----------
export function buildQuadruped(scene, name, spec) {
  const sc = spec.scale || 1;
  const cols = spec.colors || {};
  const bodyMat = mat(scene, name + '_body', cols.body || '#5b6b3a');
  const accentMat = mat(scene, name + '_accent', cols.accent || '#2f3a22');
  const root = node(scene, name + '_root', 0, 0, 0, null);
  root.scaling = new B.Vector3(sc, sc, sc);
  const r = { root, mats: [bodyMat, accentMat], name };
  r.body = box(scene, name + '_body', 0.5, 0.42, 0.9, 0, 0.5, 0, root, bodyMat);
  r.neck = node(scene, name + '_neck', 0, 0.56, 0.42, root);
  r.head = box(scene, name + '_head', 0.3, 0.3, 0.36, 0, 0.06, 0.16, r.neck, bodyMat);
  r.jaw = box(scene, name + '_jaw', 0.22, 0.1, 0.3, 0, -0.12, 0.2, r.neck, accentMat);
  r.earL = box(scene, name + '_earL', 0.08, 0.16, 0.08, 0.11, 0.24, 0.06, r.neck, accentMat);
  r.earR = box(scene, name + '_earR', 0.08, 0.16, 0.08, -0.11, 0.24, 0.06, r.neck, accentMat);
  r.tail = box(scene, name + '_tail', 0.1, 0.1, 0.42, 0, 0.6, -0.55, root, accentMat);
  r.fl = node(scene, name + '_fl', 0.2, 0.42, 0.34, root);
  r.fr = node(scene, name + '_fr', -0.2, 0.42, 0.34, root);
  r.bl = node(scene, name + '_bl', 0.2, 0.42, -0.34, root);
  r.br = node(scene, name + '_br', -0.2, 0.42, -0.34, root);
  r.flL = box(scene, name + '_flL', 0.16, 0.42, 0.18, 0, -0.21, 0, r.fl, bodyMat);
  r.frL = box(scene, name + '_frL', 0.16, 0.42, 0.18, 0, -0.21, 0, r.fr, bodyMat);
  r.blL = box(scene, name + '_blL', 0.16, 0.42, 0.18, 0, -0.21, 0, r.bl, bodyMat);
  r.brL = box(scene, name + '_brL', 0.16, 0.42, 0.18, 0, -0.21, 0, r.br, bodyMat);
  r.parts = [r.neck, r.fl, r.fr, r.bl, r.br];
  r.base = { neck: { rx: 0, ry: 0, rz: 0 }, legs: [0, 0, 0, 0] };
  r.meshes = [];
  collectMeshes(scene, name + '_', r.meshes);
  return r;
}

export function poseQuadruped(r, t, speed, act, prog) {
  const f = 0.55;
  const s = Math.sin(t * (speed > 0.1 ? 9 : 2.2));
  const s2 = -s;
  r.fl.rotation.x = s * f; r.fr.rotation.x = s2 * f;
  r.bl.rotation.x = s2 * f; r.br.rotation.x = s * f;
  r.neck.rotation.x = Math.sin(t * 2.2) * 0.05 + (act === 'attack' ? -0.5 * (prog < 0.5 ? prog / 0.5 : 1) : 0);
  r.neck.rotation.y = Math.sin(t * 1.3) * 0.1;
  r.tail.rotation.x = Math.sin(t * 3.1) * 0.18;
  if (act === 'attack') {
    const k = prog < 0.4 ? prog / 0.4 : 1;
    r.neck.rotation.x = -0.9 * k + 1.2 * (prog > 0.4 ? (prog - 0.4) / 0.3 : 0);
  }
}

export function disposeRig(r) {
  for (const m of r.meshes) m.dispose();
  for (const m of r.mats) m.dispose();
  r.root.dispose();
}
RIG.disposeRig = disposeRig;

export const R = { node, box, mat, buildHumanoid, buildQuadruped, pose, poseQuadruped, disposeRig, resetPose, snapshot, collectMeshes };
