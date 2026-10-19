// Merge static meshes by material to keep draw calls low.
const B = () => window.BABYLON;

export function mergeByMaterial(meshes) {
  const groups = new Map();
  for (const m of meshes) {
    if (!m || !m.material) continue;
    const k = m.material.name;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(m);
  }
  const out = [];
  for (const [, list] of groups) {
    if (list.length === 1) { list[0].freezeWorldMatrix(); out.push(list[0]); continue; }
    try {
      const merged = (B()).Mesh.MergeMeshes(list, true, true, undefined, false, false);
      if (merged) {
        const p = list.find((m) => m && m.parent);
        if (p && p.parent) merged.parent = p.parent;
        merged.freezeWorldMatrix();
        out.push(merged);
      }
    } catch (e) {
      for (const m of list) m.freezeWorldMatrix();
      out.push(...list);
    }
  }
  return out;
}
