// Shared mutable game state. Every module imports this object.
export const S = {
  // engine / render
  engine: null, scene: null, canvas: null, camera: null, lights: null,
  // time
  time: 0, dt: 0, frame: 0, fps: 0, paused: false, slowmo: 1,
  // player
  player: null, p: null, // p = shorthand player entity
  // world
  zone: null, zoneId: null, grid: null, cell: 4, gw: 0, gh: 0,
  entities: [], enemies: [], npcs: [], props: [], chests: [], loot: [], projectiles: [], traps: [], walls: [], groundLoot: [],
  // systems
  input: {}, ui: {}, fx: {}, cam: {}, quest: {}, save: {}, debug: {}, solidRef: null,
  // meta
  mode: 'boot', // boot | title | select | play | dead | victory
  startedAt: 0, playTime: 0, deathT: 0, lootN: 0,
  // misc
  seed: 1, rng: null, tmp: {},
};

export function setState(k, v) { S[k] = v; return v; }
