// Lights, fog, sky dome, clouds.
import { mat, shade } from '../entities/meshes.js';

const B = () => window.BABYLON;

export function setupEnvironment(scene, biome, opts = {}) {
  const b = biome;
  scene.fogMode = (B()).Scene.FOGMODE_EXP2;
  scene.fogColor = (B()).Color3.FromHexString(b.fog);
  scene.fogDensity = b.fogDensity;
  scene.clearColor = (B()).Color4.FromHexString(b.fog + 'ff');

  const hemi = new (B()).HemisphericLight('hemi', new (B()).Vector3(0, 1, 0), scene);
  hemi.intensity = opts.hemi ?? 0.55;
  hemi.diffuse = (B()).Color3.FromHexString(b.ambient);
  hemi.groundColor = (B()).Color3.FromHexString(shade(b.floor, 0.6));
  hemi.specular = new (B()).Color3(0.05, 0.05, 0.05);

  const dir = new (B()).DirectionalLight('sun', new (B()).Vector3(-0.4, -1, -0.35), scene);
  dir.intensity = opts.sun ?? 0.85;
  dir.diffuse = (B()).Color3.FromHexString(b.sun);
  dir.specular = new (B()).Color3(0.08, 0.08, 0.08);
  dir.position = new (B()).Vector3(60, 120, 60);

  const sky = (B()).MeshBuilder.CreateSphere('sky', { diameter: 230, segments: 6, sideOrientation: (B()).Mesh.BACKSIDE }, scene);
  const skyMat = new (B()).StandardMaterial('skyMat', scene);
  skyMat.maxSimultaneousLights = 2;
  skyMat.disableLighting = true;
  skyMat.emissiveColor = (B()).Color3.FromHexString(shade(b.fog, opts.indoor ? 1.35 : 3.4));
  skyMat.specularColor = new (B()).Color3(0, 0, 0);
  sky.material = skyMat;
  sky.applyFog = false;
  sky.isPickable = false;
  sky.infiniteDistance = true;

  const clouds = [];
  if (opts.clouds) {
    const cloudMat = mat(scene, '#e8eef2', { alpha: 0.55 });
    for (let i = 0; i < 14; i++) {
      const c = (B()).MeshBuilder.CreateDisc('cloud' + i, { radius: 6 + Math.random() * 10, tessellation: 5 }, scene);
      c.rotation.x = Math.PI / 2;
      c.position.set((Math.random() - 0.5) * 220, 34 + Math.random() * 14, (Math.random() - 0.5) * 220);
      c.material = cloudMat;
      c.isPickable = false;
      c.applyFog = false;
      c.freezeWorldMatrix();
      clouds.push(c);
    }
  }
  return { hemi, dir, sky, clouds };
}

export function makePointLight(scene, color, range = 12, intensity = 1.2) {
  const l = new (B()).PointLight('pl', new (B()).Vector3(0, 3, 0), scene);
  l.diffuse = (B()).Color3.FromHexString(color);
  l.specular = new (B()).Color3(0.1, 0.1, 0.1);
  l.range = range;
  l.intensity = intensity;
  l.shadowEnabled = false;
  return l;
}
