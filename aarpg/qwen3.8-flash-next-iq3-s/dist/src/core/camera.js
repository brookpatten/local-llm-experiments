// Diablo-style follow camera with shake, zoom and orbit.
const B = () => window.BABYLON;

export class CameraRig {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.cam = new (B()).TargetCamera('cam', new (B()).Vector3(0, 18, -20), this.scene);
    this.cam.minZ = 0.5;
    this.cam.maxZ = 260;
    this.cam.fov = 0.85;
    this.scene.activeCamera = this.cam;
    this.radius = 24;
    this.pitch = 0.72;      // radians above horizon
    this.yaw = 0;           // orbit offset around the player
    this.targetYaw = 0;
    this.target = new (B()).Vector3(0, 0, 0);
    this.shakeAmt = 0;
    this.snap = true;
  }

  shake(a) {
    const s = this.game.settings;
    if (s && s.shake === false) return;
    this.shakeAmt = Math.min(1.2, this.shakeAmt + a);
  }

  zoom(d) { this.radius = Math.max(15, Math.min(38, this.radius + d * 2)); }

  orbit(d) { this.targetYaw += d; }

  update(dt, player) {
    const gy = this.game.world ? this.game.world.heightAt(player.x, player.z) : 0;
    const want = new (B()).Vector3(player.x, gy + 1.1, player.z);
    if (this.snap) { this.target.copyFrom(want); this.snap = false; }
    else {
      const k = 1 - Math.pow(0.0009, dt);
      this.target.x += (want.x - this.target.x) * k;
      this.target.y += (want.y - this.target.y) * k;
      this.target.z += (want.z - this.target.z) * k;
    }
    this.yaw += (this.targetYaw - this.yaw) * Math.min(1, dt * 6);
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 2.6);
    const sx = (Math.random() - 0.5) * this.shakeAmt * 1.4;
    const sy = (Math.random() - 0.5) * this.shakeAmt * 1.4;
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const ox = Math.sin(this.yaw) * cp * this.radius;
    const oz = Math.cos(this.yaw) * cp * this.radius;
    const oy = sp * this.radius;
    this.cam.position.set(this.target.x + ox + sx, this.target.y + oy + sy, this.target.z + oz + sx);
    this.cam.setTarget(new (B()).Vector3(this.target.x, this.target.y + 0.6, this.target.z));
  }

  // Screen point -> ground point (x,z). Returns null if nothing hit.
  pickGround(clientX, clientY) {
    const scene = this.scene;
    const pick = scene.pick(clientX, clientY, (m) => m.isPickable && m.isEnabled() && !m._isActor);
    if (pick && pick.hit) {
      const p = pick.pickedPoint;
      return { x: p.x, z: p.z };
    }
    const ray = scene.createPickingRay(clientX, clientY, (B()).Matrix.Identity(), this.cam);
    if (Math.abs(ray.direction.y) < 1e-4) return null;
    const t = -ray.origin.y / ray.direction.y;
    if (t < 0) return null;
    return { x: ray.origin.x + ray.direction.x * t, z: ray.origin.z + ray.direction.z * t };
  }
}
