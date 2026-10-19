// Low-poly procedural art. Everything in the game is built from boxes, cylinders,
// spheres and extruded polygons — no external assets.
const B = () => window.BABYLON;

const matCache = new Map();
export function mat(scene, hex, opts = {}) {
  const key = hex + '|' + (opts.emissive ? 'e' : '') + '|' + (opts.alpha !== undefined ? opts.alpha : 1) + '|' + (opts.spec ? 's' : '') + '|' + (opts.backFaceCulling === false ? 'nc' : '');
  if (matCache.has(key)) return matCache.get(key);
  const m = new (B()).StandardMaterial('m_' + key.replace(/[^a-z0-9]/gi, ''), scene);
  m.maxSimultaneousLights = 6;
  m.diffuseColor = (B()).Color3.FromHexString(hex);
  m.specularColor = opts.spec ? new (B()).Color3(0.35, 0.35, 0.35) : new (B()).Color3(0.02, 0.02, 0.02);
  m.emissiveColor = opts.emissive ? (B()).Color3.FromHexString(opts.emissive) : new (B()).Color3(0, 0, 0);
  if (opts.alpha !== undefined) { m.alpha = opts.alpha; m.needAlphaBlending = () => true; }
  m.backFaceCulling = opts.backFaceCulling !== false;
  matCache.set(key, m);
  return m;
}

export function shade(hex, f) {
  const c = (B()).Color3.FromHexString(hex);
  const r = Math.min(1, c.r * f), g = Math.min(1, c.g * f), b = Math.min(1, c.b * f);
  return (B()).Color3.FromInts(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)).toHexString();
}

function setMat(mesh, m) { mesh.material = m; return mesh; }

export function box(scene, { w = 1, h = 1, d = 1, x = 0, y = 0, z = 0, color = '#888', parent, rx = 0, ry = 0, rz = 0, name = 'bx', emissive, alpha }) {
  const m = (B()).MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  setMat(m, mat(scene, color, { emissive, alpha }));
  if (parent) m.parent = parent;
  return m;
}

export function cyl(scene, { d = 1, h = 1, x = 0, y = 0, z = 0, tess = 6, color = '#888', parent, rx = 0, ry = 0, rz = 0, name = 'cy', emissive, alpha }) {
  const m = (B()).MeshBuilder.CreateCylinder(name, { diameter: d, height: h, tessellation: tess }, scene);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  setMat(m, mat(scene, color, { emissive, alpha }));
  if (parent) m.parent = parent;
  return m;
}

export function sph(scene, { d = 1, x = 0, y = 0, z = 0, seg = 6, color = '#888', parent, name = 'sp', emissive, alpha }) {
  const m = (B()).MeshBuilder.CreateSphere(name, { diameter: d, segments: Math.max(2, seg) }, scene);
  m.position.set(x, y, z);
  setMat(m, mat(scene, color, { emissive, alpha }));
  if (parent) m.parent = parent;
  return m;
}

export function cone(scene, { d = 1, h = 1, x = 0, y = 0, z = 0, tess = 5, color = '#888', parent, name = 'cn', emissive, alpha }) {
  const m = (B()).MeshBuilder.CreateCylinder(name, { diameterTop: 0, diameterBottom: d, height: h, tessellation: tess }, scene);
  m.position.set(x, y, z);
  setMat(m, mat(scene, color, { emissive, alpha }));
  if (parent) m.parent = parent;
  return m;
}

export function prism(scene, { points, depth, color, parent, name = 'pr', x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, emissive, alpha }) {
  // Extrude a 2D polygon (in its local XY plane) along +Z. Built by hand so it
  // does not depend on builder APIs that changed between Babylon versions.
  const n = points.length;
  const positions = [], normals = [], uvs = [], indices = [];
  const push = (px, py, pz) => { positions.push(px, py, pz); normals.push(0, 1, 0); };
  for (let i = 0; i < n; i++) { uvs.push(points[i][0], points[i][1]); push(points[i][0], points[i][1], 0); }
  for (let i = 1; i < n - 1; i++) indices.push(0, i, i + 1);
  const back = positions.length / 3;
  for (let i = 0; i < n; i++) { uvs.push(points[i][0], points[i][1]); push(points[i][0], points[i][1], depth); }
  for (let i = 1; i < n - 1; i++) indices.push(back, back + i + 1, back + i);
  for (let i = 0; i < n; i++) {
    const a = points[i], b = points[(i + 1) % n];
    const s = positions.length / 3;
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    push(a[0], a[1], 0); push(b[0], b[1], 0); push(b[0], b[1], depth); push(a[0], a[1], depth);
    indices.push(s, s + 1, s + 2, s, s + 2, s + 3);
  }
  const m = new (B()).Mesh(name, scene);
  m.setVerticesData((B()).VertexBuffer.PositionKind, positions);
  m.setVerticesData((B()).VertexBuffer.NormalKind, normals);
  m.setVerticesData((B()).VertexBuffer.UVKind, uvs);
  m.setIndices(indices);
  const nd = new Float32Array(positions.length);
  (B()).VertexData.ComputeNormals(positions, indices, nd);
  m.updateVerticesData((B()).VertexBuffer.NormalKind, nd);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  setMat(m, mat(scene, color, { alpha, emissive, backFaceCulling: false }));
  if (parent) m.parent = parent;
  return m;
}

export function groundDisc(scene, radius, color, parent) {
  const m = (B()).MeshBuilder.CreateDisc('disc', { radius, tessellation: 8 }, scene);
  m.rotation.x = Math.PI / 2;
  setMat(m, mat(scene, color));
  if (parent) m.parent = parent;
  return m;
}

// Flat triangle-fan wedge lying in the XZ plane, centred on +Z (facing 0).
export function wedgeMesh(scene, { radius = 3, half = 0.8, seg = 12, color = '#fff', alpha = 0.35, emissive, name = 'wedge' }) {
  const positions = [0, 0, 0];
  const normals = [0, 1, 0];
  const uvs = [0.5, 0.5];
  for (let i = 0; i <= seg; i++) {
    const a = -half + (2 * half) * (i / seg);
    const x = Math.sin(a) * radius, z = Math.cos(a) * radius;
    positions.push(x, 0.02, z);
    normals.push(0, 1, 0);
    uvs.push(0.5 + Math.sin(a) * 0.5, 0.5 + Math.cos(a) * 0.5);
  }
  const indices = [];
  for (let i = 1; i < seg + 1; i++) indices.push(0, i, i + 1);
  const m = new (B()).Mesh(name, scene);
  m.setVerticesData((B()).VertexBuffer.PositionKind, positions);
  m.setVerticesData((B()).VertexBuffer.NormalKind, normals);
  m.setVerticesData((B()).VertexBuffer.UVKind, uvs);
  m.setIndices(indices);
  setMat(m, mat(scene, color, { alpha, emissive: emissive || color }));
  m.isPickable = false;
  return m;
}

// Flat ring (annulus) in the XZ plane.
export function ringMesh(scene, { radius = 2, thickness = 0.15, seg = 24, color = '#fff', alpha = 0.4, emissive, name = 'ring' }) {
  const t = (B()).MeshBuilder.CreateTorus(name, { diameter: radius * 2, thickness, tessellation: seg }, scene);
  setMat(t, mat(scene, color, { alpha, emissive: emissive || color }));
  t.isPickable = false;
  return t;
}

// ---------------------------------------------------------------------------
// Actor rigs. A rig is a TransformNode root plus limb pivots that Actor.animate
// rotates. Shapes are chunky and polygonal on purpose.
// ---------------------------------------------------------------------------
export function buildRig(scene, shape, color, scale = 1, opts = {}) {
  const root = new (B()).TransformNode('rig', scene);
  const parts = { root, meshes: [], shape };
  const c = color, cd = shade(color, 0.65), cl = shade(color, 1.25);
  const S = scale;

  const add = (m) => { parts.meshes.push(m); return m; };

  if (shape === 'wolf' || shape === 'spider' || shape === 'wyrm') {
    const body = add(box(scene, { w: 0.7 * S, h: 0.55 * S, d: 1.15 * S, y: 0.62 * S, color: c, parent: root, name: 'body' }));
    parts.body = body;
    const head = new (B()).TransformNode('head', scene);
    head.position.set(0, 0.68 * S, 0.62 * S); head.parent = root;
    add(box(scene, { w: 0.45 * S, h: 0.4 * S, d: 0.5 * S, color: cl, parent: head, name: 'head' }));
    add(box(scene, { w: 0.2 * S, h: 0.16 * S, d: 0.22 * S, z: 0.3 * S, y: -0.06 * S, color: cd, parent: head, name: 'snout' }));
    if (shape === 'wolf') {
      add(cone(scene, { d: 0.16 * S, h: 0.28 * S, x: -0.14 * S, y: 0.26 * S, color: cd, parent: head }));
      add(cone(scene, { d: 0.16 * S, h: 0.28 * S, x: 0.14 * S, y: 0.26 * S, color: cd, parent: head }));
      add(box(scene, { w: 0.12 * S, h: 0.1 * S, d: 0.6 * S, z: -0.8 * S, y: 0.72 * S, color: cd, parent: root, rx: 0.5, name: 'tail' }));
    }
    parts.head = head;
    const legPos = shape === 'spider'
      ? [[-0.35, 0.35], [0.35, 0.35], [-0.4, 0], [0.4, 0], [-0.35, -0.35], [0.35, -0.35]]
      : [[-0.24, 0.42], [0.24, 0.42], [-0.24, -0.42], [0.24, -0.42]];
    parts.legs = legPos.map(([x, z], i) => {
      const p = new (B()).TransformNode('leg' + i, scene);
      p.position.set(x * S, 0.55 * S, z * S); p.parent = root;
      add(box(scene, { w: 0.14 * S, h: 0.6 * S, d: 0.14 * S, y: -0.3 * S, color: cd, parent: p, name: 'leg' + i }));
      return p;
    });
    if (shape === 'spider') {
      add(sph(scene, { d: 0.55 * S, z: -0.55 * S, y: 0.6 * S, color: shade(c, 0.8), parent: root, seg: 4 }));
      add(box(scene, { w: 0.08 * S, h: 0.06 * S, d: 0.3 * S, x: -0.12 * S, y: -0.1 * S, z: 0.9 * S, color: '#e8e8e8', parent: head }));
      add(box(scene, { w: 0.08 * S, h: 0.06 * S, d: 0.3 * S, x: 0.12 * S, y: -0.1 * S, z: 0.9 * S, color: '#e8e8e8', parent: head }));
    }
    if (shape === 'wyrm') {
      let prev = head; let py = 0.68, pz = 0.62;
      parts.tailSegs = [];
      for (let i = 0; i < 5; i++) {
        const t = new (B()).TransformNode('seg' + i, scene);
        t.parent = prev;
        t.position.set(0, 0, -1.0 * S);
        add(box(scene, { w: (0.62 - i * 0.08) * S, h: (0.5 - i * 0.06) * S, d: 1.0 * S, color: i % 2 ? cd : c, parent: t, name: 'seg' + i }));
        if (i === 2) {
          add(cone(scene, { d: 0.3 * S, h: 0.7 * S, y: 0.45 * S, color: '#cfe8f8', parent: t }));
        }
        prev = t; parts.tailSegs.push(t);
      }
      add(cone(scene, { d: 0.22 * S, h: 0.5 * S, x: -0.28 * S, y: 0.3 * S, z: 0.1 * S, color: '#dfe8f0', parent: head }));
      add(cone(scene, { d: 0.22 * S, h: 0.5 * S, x: 0.28 * S, y: 0.3 * S, z: 0.1 * S, color: '#dfe8f0', parent: head }));
    }
  } else {
    // ---- biped family (humanoid, goblinoid, skeleton, zombie, wraith, golem, fiend)
    const torsoH = shape === 'golem' ? 0.9 : 0.75;
    const torso = add(box(scene, { w: 0.62 * S, h: torsoH * S, d: 0.36 * S, y: (0.62 + torsoH / 2) * S, color: c, parent: root, name: 'torso' }));
    parts.torso = torso;
    if (shape === 'humanoid' || shape === 'captain' || shape === 'guard' || shape === 'smith' || shape === 'mage' || shape === 'taverner' || shape === 'armorer') {
      add(box(scene, { w: 0.66 * S, h: 0.18 * S, d: 0.4 * S, y: (0.6 + torsoH) * S, color: cd, parent: root, name: 'belt' }));
    }
    if (shape === 'zombie' || shape === 'skeleton') {
      add(box(scene, { w: 0.2 * S, h: 0.5 * S, d: 0.1 * S, x: -0.14 * S, y: (0.7 + torsoH / 2) * S, z: 0.2 * S, color: shade(c, 0.8), parent: root, name: 'ribs' }));
      add(box(scene, { w: 0.2 * S, h: 0.5 * S, d: 0.1 * S, x: 0.14 * S, y: (0.7 + torsoH / 2) * S, z: 0.2 * S, color: shade(c, 0.8), parent: root, name: 'ribs2' }));
    }
    if (shape === 'fiend') {
      add(box(scene, { w: 0.5 * S, h: 0.5 * S, d: 0.5 * S, y: (0.6 + torsoH) * S, color: '#7a2010', parent: root, ry: Math.PI / 4, name: 'spikes' }));
    }

    const headNode = new (B()).TransformNode('head', scene);
    headNode.position.set(0, (0.62 + torsoH + 0.16) * S, 0); headNode.parent = root;
    const headSize = shape === 'goblinoid' ? 0.34 : shape === 'golem' ? 0.42 : 0.36;
    add(box(scene, { w: headSize * S, h: headSize * S, d: headSize * S, color: shape === 'skeleton' ? '#e8e2cc' : cl, parent: headNode, name: 'head' }));
    if (shape === 'goblinoid') {
      add(cone(scene, { d: 0.1 * S, h: 0.22 * S, x: -0.2 * S, y: 0.1 * S, color: cl, parent: headNode, rz: 0.6 }));
      add(cone(scene, { d: 0.1 * S, h: 0.22 * S, x: 0.2 * S, y: 0.1 * S, color: cl, parent: headNode, rz: -0.6 }));
      add(box(scene, { w: 0.16 * S, h: 0.08 * S, d: 0.06 * S, x: -0.08 * S, y: 0.02 * S, z: -0.18 * S, color: '#ff5030', parent: headNode, emissive: '#ff5030', name: 'eyeL' }));
      add(box(scene, { w: 0.16 * S, h: 0.08 * S, d: 0.06 * S, x: 0.08 * S, y: 0.02 * S, z: -0.18 * S, color: '#ff5030', parent: headNode, emissive: '#ff5030', name: 'eyeR' }));
    } else if (shape === 'wraith') {
      add(box(scene, { w: 0.3 * S, h: 0.1 * S, d: 0.05 * S, x: 0, y: 0.04 * S, z: -0.19 * S, color: '#cfe8ff', parent: headNode, emissive: '#6fb0e0' }));
    } else if (shape !== 'skeleton') {
      add(box(scene, { w: 0.1 * S, h: 0.06 * S, d: 0.05 * S, x: -0.08 * S, y: 0.03 * S, z: -0.19 * S, color: '#1a1a1a', parent: headNode }));
      add(box(scene, { w: 0.1 * S, h: 0.06 * S, d: 0.05 * S, x: 0.08 * S, y: 0.03 * S, z: -0.19 * S, color: '#1a1a1a', parent: headNode }));
    } else {
      add(box(scene, { w: 0.08 * S, h: 0.07 * S, d: 0.05 * S, x: -0.08 * S, y: 0.03 * S, z: -0.18 * S, color: '#20201c', parent: headNode }));
      add(box(scene, { w: 0.08 * S, h: 0.07 * S, d: 0.05 * S, x: 0.08 * S, y: 0.03 * S, z: -0.18 * S, color: '#20201c', parent: headNode }));
    }
    if (opts.helm) {
      add(box(scene, { w: 0.42 * S, h: 0.2 * S, d: 0.42 * S, y: 0.1 * S, color: opts.helm, parent: headNode, name: 'helm' }));
      add(box(scene, { w: 0.1 * S, h: 0.3 * S, d: 0.1 * S, y: 0.28 * S, color: shade(opts.helm, 0.8), parent: headNode }));
    }
    if (opts.hat) add(cone(scene, { d: 0.55 * S, h: 0.5 * S, y: 0.32 * S, color: opts.hat, parent: headNode, tess: 6 }));
    if (opts.crown) add(box(scene, { w: 0.46 * S, h: 0.14 * S, d: 0.46 * S, y: 0.24 * S, color: '#d9b56a', parent: headNode, emissive: '#5a4415', name: 'crown' }));
    parts.head = headNode;

    const armY = (0.58 + torsoH) * S;
    const mkArm = (side) => {
      const p = new (B()).TransformNode('arm' + side, scene);
      p.position.set(side * (0.34 + 0.09) * S, armY, 0); p.parent = root;
      add(box(scene, { w: 0.16 * S, h: 0.62 * S, d: 0.16 * S, y: -0.31 * S, color: shape === 'skeleton' ? '#e0dac4' : cd, parent: p, name: 'arm' + side }));
      return p;
    };
    parts.armL = mkArm(-1);
    parts.armR = mkArm(1);

    const mkLeg = (side) => {
      const p = new (B()).TransformNode('leg' + side, scene);
      p.position.set(side * 0.17 * S, 0.62 * S, 0); p.parent = root;
      add(box(scene, { w: 0.18 * S, h: 0.62 * S, d: 0.18 * S, y: -0.31 * S, color: shape === 'skeleton' ? '#e0dac4' : shade(c, 0.5), parent: p, name: 'leg' + side }));
      return p;
    };
    parts.legL = mkLeg(-1);
    parts.legR = mkLeg(1);

    if (shape === 'wraith') {
      // no legs below the hem: make it float, add a tattered skirt
      parts.legL.setEnabled(false); parts.legR.setEnabled(false);
      add(cone(scene, { d: 0.8 * S, h: 0.9 * S, y: 0.35 * S, color: shade(c, 0.7), parent: root, tess: 6, alpha: 0.85, name: 'skirt' }));
    }
    if (shape === 'golem') {
      add(box(scene, { w: 0.3 * S, h: 0.3 * S, d: 0.1 * S, y: (0.7 + torsoH / 2) * S, z: -0.22 * S, color: '#8fd0e0', parent: root, emissive: '#2a6a80', name: 'rune' }));
    }
  }

  // weapon / shield attach points
  parts.handR = new (B()).TransformNode('handR', scene);
  parts.handR.parent = parts.armR || parts.root;
  parts.handR.position.set(0, -0.58 * S, -0.05 * S);
  parts.handL = new (B()).TransformNode('handL', scene);
  parts.handL.parent = parts.armL || parts.root;
  parts.handL.position.set(0, -0.58 * S, -0.05 * S);
  parts.scale = S;
  return parts;
}

// ---- held gear -------------------------------------------------------------
export function buildWeapon(scene, kind, color = '#c8c8d0', scale = 1, parent) {
  const g = new (B()).TransformNode('wpn', scene);
  g.parent = parent;
  const S = scale;
  const steel = color, wood = '#6a4a2a';
  switch (kind) {
    case 'sword':
      box(scene, { w: 0.08 * S, h: 1.15 * S, d: 0.16 * S, y: 0.62 * S, color: steel, parent: g });
      box(scene, { w: 0.34 * S, h: 0.08 * S, d: 0.12 * S, y: 0.05 * S, color: '#8a7030', parent: g });
      box(scene, { w: 0.1 * S, h: 0.22 * S, d: 0.1 * S, y: -0.1 * S, color: wood, parent: g });
      break;
    case 'axe':
      box(scene, { w: 0.09 * S, h: 1.1 * S, d: 0.09 * S, y: 0.5 * S, color: wood, parent: g });
      box(scene, { w: 0.42 * S, h: 0.42 * S, d: 0.12 * S, x: 0.24 * S, y: 0.95 * S, color: steel, parent: g });
      break;
    case 'mace':
      box(scene, { w: 0.1 * S, h: 1.0 * S, d: 0.1 * S, y: 0.5 * S, color: wood, parent: g });
      box(scene, { w: 0.34 * S, h: 0.34 * S, d: 0.34 * S, y: 1.05 * S, color: steel, parent: g, ry: Math.PI / 4 });
      break;
    case 'dagger':
      box(scene, { w: 0.07 * S, h: 0.45 * S, d: 0.12 * S, y: 0.28 * S, color: steel, parent: g });
      box(scene, { w: 0.18 * S, h: 0.06 * S, d: 0.1 * S, y: 0.04 * S, color: '#8a7030', parent: g });
      break;
    case 'bow':
      prism(scene, { points: [[-0.05, -0.7], [0.28, -0.45], [0.4, 0], [0.28, 0.45], [-0.05, 0.7], [0.05, 0]], depth: 0.06 * S, color: wood, parent: g, rx: Math.PI / 2, ry: 0, rz: 0 });
      box(scene, { w: 0.02 * S, h: 1.35 * S, d: 0.02 * S, x: 0.02 * S, color: '#d8d0b8', parent: g });
      break;
    case 'staff':
      cyl(scene, { d: 0.1 * S, h: 1.5 * S, y: 0.7 * S, color: wood, parent: g, tess: 5 });
      sph(scene, { d: 0.26 * S, y: 1.5 * S, color: '#7fd0e8', parent: g, seg: 4, emissive: '#2a6a80' });
      break;
    case 'wand':
      cyl(scene, { d: 0.07 * S, h: 0.7 * S, y: 0.35 * S, color: wood, parent: g, tess: 5 });
      sph(scene, { d: 0.16 * S, y: 0.75 * S, color: '#e8a040', parent: g, seg: 4, emissive: '#804010' });
      break;
    case 'spear':
      cyl(scene, { d: 0.08 * S, h: 1.8 * S, y: 0.9 * S, color: wood, parent: g, tess: 5 });
      cone(scene, { d: 0.16 * S, h: 0.4 * S, y: 1.95 * S, color: steel, parent: g, tess: 4 });
      break;
    default:
      box(scene, { w: 0.1 * S, h: 0.9 * S, d: 0.1 * S, y: 0.45 * S, color: steel, parent: g });
  }
  g.rotation.z = -Math.PI / 4;
  return g;
}

export function buildShieldMesh(scene, color = '#7a5a3a', scale = 1, parent) {
  const g = new (B()).TransformNode('shd', scene);
  g.parent = parent;
  const S = scale;
  prism(scene, { points: [[-0.3, 0.35], [0.3, 0.35], [0.32, -0.1], [0, -0.45], [-0.32, -0.1]], depth: 0.08 * S, color, parent: g, rx: Math.PI / 2 });
  box(scene, { w: 0.08 * S, h: 0.08 * S, d: 0.5 * S, z: -0.1 * S, color: '#c8c8d0', parent: g });
  return g;
}

// ---- props -----------------------------------------------------------------
export function buildProp(scene, kind, color, scale = 1, parent) {
  const g = new (B()).TransformNode('prop_' + kind, scene);
  g.parent = parent || null;
  const S = scale;
  switch (kind) {
    case 'tree': {
      cyl(scene, { d: 0.4 * S, h: 2.4 * S, y: 1.2 * S, color: '#5a3f26', parent: g, tess: 5 });
      for (let i = 0; i < 3; i++) {
        cone(scene, { d: (2.6 - i * 0.6) * S, h: (1.6 - i * 0.2) * S, y: (2.2 + i * 0.9) * S, color: shade(color, 1 - i * 0.08), parent: g, tess: 6 });
      }
      break;
    }
    case 'pine': {
      cyl(scene, { d: 0.3 * S, h: 1.4 * S, y: 0.7 * S, color: '#4a3420', parent: g, tess: 5 });
      cone(scene, { d: 2.0 * S, h: 3.4 * S, y: 2.6 * S, color, parent: g, tess: 6 });
      break;
    }
    case 'bush': {
      sph(scene, { d: 1.1 * S, y: 0.45 * S, color, parent: g, seg: 2 });
      sph(scene, { d: 0.8 * S, x: 0.5 * S, y: 0.35 * S, color: shade(color, 0.85), parent: g, seg: 2 });
      break;
    }
    case 'rock': {
      sph(scene, { d: 1.2 * S, y: 0.4 * S, color, parent: g, seg: 1 });
      sph(scene, { d: 0.7 * S, x: 0.6 * S, y: 0.25 * S, color: shade(color, 0.85), parent: g, seg: 1 });
      break;
    }
    case 'boulder': {
      sph(scene, { d: 2.6 * S, y: 0.9 * S, color, parent: g, seg: 2 });
      sph(scene, { d: 1.4 * S, x: 1.3 * S, y: 0.5 * S, color: shade(color, 0.9), parent: g, seg: 1 });
      break;
    }
    case 'stalagmite': {
      cone(scene, { d: 0.7 * S, h: 2.2 * S, y: 1.1 * S, color, parent: g, tess: 5 });
      cone(scene, { d: 0.5 * S, h: 1.2 * S, x: 0.6 * S, y: 0.6 * S, color: shade(color, 0.85), parent: g, tess: 5 });
      break;
    }
    case 'icicle': {
      cone(scene, { d: 0.6 * S, h: 2.4 * S, y: 1.2 * S, color, parent: g, tess: 4, alpha: 0.9 });
      break;
    }
    case 'iceblock': {
      box(scene, { w: 1.4 * S, h: 1.6 * S, d: 1.2 * S, y: 0.8 * S, color, parent: g, ry: 0.4, alpha: 0.85 });
      break;
    }
    case 'mushroom': {
      cyl(scene, { d: 0.18 * S, h: 0.5 * S, y: 0.25 * S, color: '#d8d0b8', parent: g, tess: 5 });
      sph(scene, { d: 0.6 * S, y: 0.55 * S, color, parent: g, seg: 3 });
      break;
    }
    case 'tombstone': {
      box(scene, { w: 0.8 * S, h: 1.3 * S, d: 0.2 * S, y: 0.65 * S, color, parent: g, rz: 0.08 });
      box(scene, { w: 0.9 * S, h: 0.2 * S, d: 0.4 * S, y: 0.1 * S, color: shade(color, 0.7), parent: g });
      break;
    }
    case 'statue': {
      box(scene, { w: 0.9 * S, h: 0.4 * S, d: 0.9 * S, y: 0.2 * S, color: shade(color, 0.7), parent: g });
      box(scene, { w: 0.5 * S, h: 1.8 * S, d: 0.4 * S, y: 1.3 * S, color, parent: g });
      box(scene, { w: 0.35 * S, h: 0.4 * S, d: 0.35 * S, y: 2.4 * S, color, parent: g });
      box(scene, { w: 1.4 * S, h: 0.16 * S, d: 0.16 * S, y: 1.8 * S, color, parent: g });
      break;
    }
    case 'pillars': {
      for (let i = 0; i < 2; i++) cyl(scene, { d: 0.7 * S, h: 3.4 * S, x: (i ? 1.6 : -1.6) * S, y: 1.7 * S, color, parent: g, tess: 6 });
      break;
    }
    case 'bookshelf': {
      box(scene, { w: 1.6 * S, h: 2.6 * S, d: 0.4 * S, y: 1.3 * S, color: '#4a3420', parent: g });
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        box(scene, { w: 0.35 * S, h: 0.5 * S, d: 0.3 * S, x: (-0.5 + j * 0.5) * S, y: (0.6 + i * 0.75) * S, z: -0.1 * S, color: ['#8a3a2a', '#3a5a7a', '#5a7a3a'][(i + j) % 3], parent: g });
      }
      break;
    }
    case 'brazier': {
      cyl(scene, { d: 0.5 * S, h: 1.2 * S, y: 0.6 * S, color: '#3a3a3a', parent: g, tess: 6 });
      cyl(scene, { d: 0.9 * S, h: 0.3 * S, y: 1.3 * S, color: '#4a4a4a', parent: g, tess: 6 });
      sph(scene, { d: 0.6 * S, y: 1.55 * S, color: '#e8702a', parent: g, seg: 3, emissive: '#a03810' });
      break;
    }
    case 'anvil': {
      box(scene, { w: 1.4 * S, h: 0.5 * S, d: 0.7 * S, y: 0.85 * S, color, parent: g });
      box(scene, { w: 0.5 * S, h: 0.5 * S, d: 0.5 * S, y: 0.35 * S, color: shade(color, 0.7), parent: g });
      break;
    }
    case 'chain': {
      for (let i = 0; i < 4; i++) cyl(scene, { d: 0.3 * S, h: 0.12 * S, y: 2.4 * S - i * 0.42 * S, color, parent: g, tess: 6, rx: i % 2 ? Math.PI / 2 : 0 });
      break;
    }
    case 'log': {
      cyl(scene, { d: 0.6 * S, h: 2.2 * S, y: 0.3 * S, z: 0, color, parent: g, tess: 6, rz: Math.PI / 2 });
      break;
    }
    case 'bones': {
      for (let i = 0; i < 4; i++) {
        cyl(scene, { d: 0.1 * S, h: 0.6 * S, x: (i - 1.5) * 0.4 * S, z: (i % 2 ? 0.3 : -0.2) * S, y: 0.06 * S, color, parent: g, tess: 4, rz: Math.PI / 2, ry: i });
      }
      sph(scene, { d: 0.34 * S, x: 0.7 * S, y: 0.18 * S, color, parent: g, seg: 3 });
      break;
    }
    case 'rubble': {
      for (let i = 0; i < 4; i++) box(scene, { w: (0.4 + i * 0.15) * S, h: (0.3 + i * 0.1) * S, d: (0.4 + i * 0.1) * S, x: (i - 1.5) * 0.5 * S, z: (i % 2 ? 0.3 : -0.3) * S, y: 0.18 * S, color: shade(color, 1 - i * 0.06), parent: g, ry: i });
      break;
    }
    case 'candelabra': {
      cyl(scene, { d: 0.14 * S, h: 1.8 * S, y: 0.9 * S, color: '#4a4a4a', parent: g, tess: 5 });
      for (let i = -1; i <= 1; i++) {
        box(scene, { w: 0.1 * S, h: 0.5 * S, d: 0.1 * S, x: i * 0.35 * S, y: 1.7 * S, color: '#d8d0b8', parent: g });
        sph(scene, { d: 0.16 * S, x: i * 0.35 * S, y: 2.0 * S, color: '#f0c050', parent: g, seg: 2, emissive: '#a06818' });
      }
      break;
    }
    case 'crate': {
      box(scene, { w: 1.1 * S, h: 1.1 * S, d: 1.1 * S, y: 0.55 * S, color, parent: g });
      box(scene, { w: 1.15 * S, h: 0.12 * S, d: 1.15 * S, y: 0.55 * S, color: shade(color, 0.7), parent: g });
      break;
    }
    case 'barrel': {
      cyl(scene, { d: 0.9 * S, h: 1.1 * S, y: 0.55 * S, color, parent: g, tess: 8 });
      cyl(scene, { d: 0.95 * S, h: 0.1 * S, y: 0.8 * S, color: '#5a5a5a', parent: g, tess: 8 });
      break;
    }
    case 'banner': {
      cyl(scene, { d: 0.12 * S, h: 4 * S, y: 2 * S, color: '#4a3420', parent: g, tess: 5 });
      box(scene, { w: 1.2 * S, h: 2 * S, d: 0.06 * S, x: 0.65 * S, y: 2.8 * S, color, parent: g });
      break;
    }
    case 'campfire': {
      for (let i = 0; i < 5; i++) {
        box(scene, { w: 0.12 * S, h: 1.1 * S, d: 0.12 * S, y: 0.3 * S, x: Math.cos(i) * 0.3 * S, z: Math.sin(i) * 0.3 * S, color: '#4a3420', parent: g, rz: 1.1, ry: i * 1.2 });
      }
      sph(scene, { d: 0.8 * S, y: 0.55 * S, color: '#f08030', parent: g, seg: 3, emissive: '#b04010' });
      break;
    }
    case 'well': {
      cyl(scene, { d: 2.2 * S, h: 1.1 * S, y: 0.55 * S, color: '#6a6258', parent: g, tess: 8 });
      cyl(scene, { d: 1.7 * S, h: 0.2 * S, y: 1.1 * S, color: '#2a3a4a', parent: g, tess: 8 });
      box(scene, { w: 0.16 * S, h: 2.2 * S, d: 0.16 * S, x: -0.9 * S, y: 1.6 * S, color: '#4a3420', parent: g });
      box(scene, { w: 0.16 * S, h: 2.2 * S, d: 0.16 * S, x: 0.9 * S, y: 1.6 * S, color: '#4a3420', parent: g });
      box(scene, { w: 2.4 * S, h: 0.15 * S, d: 1.6 * S, y: 2.8 * S, color: '#6a3a2a', parent: g });
      break;
    }
    case 'signpost': {
      box(scene, { w: 0.14 * S, h: 2.2 * S, d: 0.14 * S, y: 1.1 * S, color: '#4a3420', parent: g });
      box(scene, { w: 1.4 * S, h: 0.4 * S, d: 0.1 * S, x: 0.5 * S, y: 1.9 * S, color: '#8a6a3a', parent: g });
      break;
    }
    case 'fence': {
      for (let i = -1; i <= 1; i++) box(scene, { w: 0.14 * S, h: 1.2 * S, d: 0.14 * S, x: i * 1.2 * S, y: 0.6 * S, color: '#5a4228', parent: g });
      box(scene, { w: 2.6 * S, h: 0.12 * S, d: 0.1 * S, y: 0.85 * S, color: '#6a4f30', parent: g });
      break;
    }
    case 'torch': {
      box(scene, { w: 0.12 * S, h: 1.4 * S, d: 0.12 * S, y: 0.7 * S, color: '#4a3420', parent: g });
      box(scene, { w: 0.3 * S, h: 0.35 * S, d: 0.3 * S, y: 1.5 * S, color: '#ffb060', parent: g, emissive: '#c06020' });
      break;
    }
    case 'shrine': {
      box(scene, { w: 1.2 * S, h: 0.9 * S, d: 1.2 * S, y: 0.45 * S, color: '#6a6258', parent: g });
      box(scene, { w: 0.8 * S, h: 0.2 * S, d: 0.8 * S, y: 1.0 * S, color: '#8a8a94', parent: g });
      sph(scene, { d: 0.5 * S, y: 1.4 * S, color: '#8fd08a', parent: g, seg: 3, emissive: '#3a8a4a' });
      break;
    }
    default:
      box(scene, { w: 1 * S, h: 1 * S, d: 1 * S, y: 0.5 * S, color, parent: g });
  }
  return g;
}

// ---- buildings -------------------------------------------------------------
export function buildBuilding(scene, { w = 8, d = 8, h = 4, wall = '#8a7a62', roof = '#6a3a2a', x = 0, z = 0, ry = 0, door = true, parent, name = 'bld', tower = false }) {
  const g = new (B()).TransformNode(name, scene);
  g.position.set(x, 0, z); g.rotation.y = ry;
  if (parent) g.parent = parent;
  box(scene, { w, h, d, y: h / 2, color: wall, parent: g, name: name + '_wall' });
  if (tower) {
    cyl(scene, { d: w * 1.05, h: h * 1.4, y: h * 0.7, color: wall, parent: g, tess: 8 });
    cone(scene, { d: w * 1.2, h: h * 0.7, y: h * 1.7, color: roof, parent: g, tess: 8 });
  } else {
    // gable roof: two slanted slabs plus triangular ends
    const rise = Math.max(1.2, w * 0.22);
    const eave = d / 2 + 0.45;
    const slope = Math.hypot(eave, rise);
    const phi = Math.atan2(rise, eave);
    box(scene, { w: w + 0.9, h: 0.28, d: slope, y: h + rise / 2, z: eave / 2, color: roof, parent: g, rx: phi });
    box(scene, { w: w + 0.9, h: 0.28, d: slope, y: h + rise / 2, z: -eave / 2, color: shade(roof, 0.82), parent: g, rx: -phi });
    box(scene, { w: w + 0.9, h: 0.3, d: 0.35, y: h + rise, color: shade(roof, 1.15), parent: g });
    prism(scene, { points: [[-w / 2, 0], [w / 2, 0], [0, rise]], depth: 0.25, color: shade(wall, 0.9), parent: g, x: 0, y: h, z: -d / 2 - 0.24 });
    prism(scene, { points: [[-w / 2, 0], [w / 2, 0], [0, rise]], depth: 0.25, color: shade(wall, 0.9), parent: g, x: 0, y: h, z: d / 2 - 0.01 });
  }
  if (door) {
    box(scene, { w: 1.6, h: 2.6, d: 0.3, y: 1.3, z: -d / 2 - 0.05, color: '#3a2a1a', parent: g, name: name + '_door' });
  }
  // windows glow a little
  for (let i = -1; i <= 1; i += 2) {
    box(scene, { w: 1, h: 1, d: 0.2, x: i * (w / 4), y: h * 0.6, z: -d / 2 - 0.05, color: '#e8b050', parent: g, emissive: '#8a5a10' });
  }
  return g;
}

export function buildChest(scene, color = '#6a4a2a', scale = 1, parent) {
  const g = new (B()).TransformNode('chest', scene);
  if (parent) g.parent = parent;
  const S = scale;
  box(scene, { w: 1.3 * S, h: 0.7 * S, d: 0.9 * S, y: 0.35 * S, color, parent: g });
  const lid = box(scene, { w: 1.3 * S, h: 0.4 * S, d: 0.9 * S, y: 0.9 * S, color: shade(color, 1.2), parent: g, name: 'lid' });
  box(scene, { w: 0.2 * S, h: 0.3 * S, d: 0.1 * S, y: 0.7 * S, z: -0.5 * S, color: '#d9b56a', parent: g, emissive: '#5a4415' });
  g.userData = { lid };
  return g;
}

export function buildPortal(scene, color = '#7fd0e8', scale = 1, parent) {
  const g = new (B()).TransformNode('portal', scene);
  if (parent) g.parent = parent;
  const S = scale;
  const ring = cyl(scene, { d: 3 * S, h: 0.25 * S, y: 0.12 * S, color, parent: g, tess: 12, emissive: shade(color, 0.6) });
  const disc = cyl(scene, { d: 2.6 * S, h: 0.1 * S, y: 0.2 * S, color, parent: g, tess: 12, alpha: 0.55, emissive: color });
  const archL = box(scene, { w: 0.35 * S, h: 3.4 * S, d: 0.35 * S, x: -1.5 * S, y: 1.7 * S, color: '#5a5248', parent: g });
  const archR = box(scene, { w: 0.35 * S, h: 3.4 * S, d: 0.35 * S, x: 1.5 * S, y: 1.7 * S, color: '#5a5248', parent: g });
  const beam = cyl(scene, { d: 2.4 * S, h: 3.4 * S, y: 1.8 * S, color, parent: g, tess: 10, alpha: 0.3, emissive: color });
  g.userData = { ring, disc, beam, archL, archR };
  return g;
}

// Small 3D icon for a ground item drop.
export function buildItemMesh(scene, gfx, color = '#c8c8d0', scale = 1, parent) {
  const g = new (B()).TransformNode('itm', scene);
  if (parent) g.parent = parent;
  const S = scale;
  switch (gfx) {
    case 'sword': case 'dagger': buildWeapon(scene, gfx, color, S * 0.8, g); break;
    case 'axe': case 'mace': case 'bow': case 'staff': buildWeapon(scene, gfx, color, S * 0.8, g); break;
    case 'shield': buildShieldMesh(scene, color, S * 0.8, g); break;
    case 'tome': box(scene, { w: 0.7 * S, h: 0.16 * S, d: 0.9 * S, y: 0.1 * S, color: '#7a3a3a', parent: g }); break;
    case 'quiver': cyl(scene, { d: 0.35 * S, h: 0.9 * S, y: 0.45 * S, color: '#6a4a2a', parent: g, tess: 6 }); break;
    case 'helm': sph(scene, { d: 0.6 * S, y: 0.3 * S, color, parent: g, seg: 3 }); break;
    case 'circlet': cyl(scene, { d: 0.55 * S, h: 0.12 * S, y: 0.3 * S, color, parent: g, tess: 8 }); break;
    case 'chest': case 'robe': box(scene, { w: 0.7 * S, h: 0.8 * S, d: 0.35 * S, y: 0.4 * S, color, parent: g }); break;
    case 'legs': box(scene, { w: 0.55 * S, h: 0.7 * S, d: 0.3 * S, y: 0.35 * S, color, parent: g }); break;
    case 'boots': box(scene, { w: 0.4 * S, h: 0.55 * S, d: 0.4 * S, y: 0.28 * S, color, parent: g }); break;
    case 'gloves': box(scene, { w: 0.45 * S, h: 0.45 * S, d: 0.25 * S, y: 0.25 * S, color, parent: g }); break;
    case 'ring': cyl(scene, { d: 0.4 * S, h: 0.1 * S, y: 0.2 * S, color, parent: g, tess: 8 }); break;
    case 'amulet': sph(scene, { d: 0.35 * S, y: 0.3 * S, color, parent: g, seg: 3, emissive: shade(color, 0.4) }); break;
    case 'flask': cyl(scene, { d: 0.3 * S, h: 0.5 * S, y: 0.25 * S, color: '#4a90d9', parent: g, tess: 6, emissive: '#123a63' }); break;
    case 'coin': cyl(scene, { d: 0.35 * S, h: 0.08 * S, y: 0.06 * S, color: '#e0b040', parent: g, tess: 8, emissive: '#6a4a10' }); break;
    default: box(scene, { w: 0.4 * S, h: 0.4 * S, d: 0.4 * S, y: 0.2 * S, color, parent: g });
  }
  return g;
}

export function blobShadow(scene, radius, parent, y = 0.02) {
  const m = (B()).MeshBuilder.CreateDisc('blob', { radius, tessellation: 10 }, scene);
  m.rotation.x = Math.PI / 2;
  m.position.y = y;
  const mm = mat(scene, '#000000', { alpha: 0.32 });
  m.material = mm;
  m.isPickable = false;
  if (parent) m.parent = parent;
  return m;
}

export function disposeTree(node) {
  if (!node) return;
  if (node.meshes) for (const m of node.meshes) { try { m.dispose(); } catch (e) { /* ignore */ } }
  if (node.getChildMeshes) for (const m of node.getChildMeshes()) { try { m.dispose(); } catch (e) { /* ignore */ } }
  try { node.dispose(); } catch (e) { /* ignore */ }
}
