// Zone content: hand-authored maps, procedural overworld, exits, spawns.
import { U } from './util.js';
import { ITEMS } from './items.js';

export const ZONES = {};

// ---------- grid legend ----------
// '#' wall/building   'T' tree/hedge   'r' rock   'W' lava   '~' deep water (solid)
// 'x' shallow water (walkable)  'X' crate/barrel  '+' path  ',' flowers  '.' floor
// 'S' player spawn  'E' exit  'N' npc  'F' fountain  'L' lever  'P' pedestal
// 'C' chest  'B' brazier  'g' goblin 's' skeleton 'w' wolf 'c' cultist 'R' rat
// 'G' golem 'T'... (tree) 'b' boss  'm' merchant-guard  'D' door (walkable)
export function normMap(rows) {
  let w = 0; for (const r of rows) w = Math.max(w, r.length);
  const out = rows.map((r) => (r + '.'.repeat(w - r.length)).slice(0, w));
  return { rows: out, w, h: out.length };
}

// ================= TOWN: Riverton =================
const TOWN_MAP = [
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  'T..................................T',
  'T...######....######....######.....T',
  'T...#....#....#....#....#....#.....T',
  'T...#....#....#....#....#....#.....T',
  'T...######....######....######.....T',
  'T....N..........N..........N.......T',
  'T..................................T',
  'T..................................T',
  'T....######..............######....T',
  'T....#....#..............#....#....T',
  'T....#....#....F.........#....#....T',
  'T....#....#..............#....#....T',
  'T....######..............######....T',
  'T....N...................N.........T',
  'T..................................T',
  'T...####................####.......T',
  'T...#..#................#..#.......T',
  'T...#..#................#..#.......T',
  'T...####................####.......T',
  'T..................................T',
  'T....TT....TT......TT....TT........T',
  'T..................................T',
  'T..................................T',
  'T..................................T',
  'T....TT..................TT........T',
  'T..................................T',
  'T.................EE...............T',
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
];

export const TOWN_NPCS = [
  { npc: 'smith', name: 'Aldric the Smith', shop: 'weapons', x: 5, y: 6, color: '#b5743a',
    lines: ['Steel and honest prices. Take what you need.', 'A good edge is worth more than a strong arm.', 'Bring me coin and I will bring you blades.'] },
  { npc: 'armorer', name: 'Pella Ironside', shop: 'armor', x: 16, y: 6, color: '#7d8894',
    lines: ['Dents are only honest after a fight.', 'Plate, mail, or leather — pick your own trade.', 'I mend more than I sell.'] },
  { npc: 'alchemist', name: 'Vessily Croak', shop: 'potions', x: 27, y: 6, color: '#7b4ea2',
    lines: ['Tinctures, salves, and one bad joke.', 'Ask me what is in the red bottle. Never.', 'Emberwater mends. Frostwater chills.'] },
  { npc: 'general', name: 'Bram the Peddler', shop: 'goods', x: 5, y: 14, color: '#c9a24a',
    lines: ['Rations, rope, and locked purses.', 'Everything here is cheap and a little bit wrong.', 'Coin for a riddle, coin for a riddle.'] },
  { npc: 'warden', name: 'The Warden of Gates', shop: null, x: 26, y: 14, color: '#3f6b58',
    lines: ['The gate south is open. The world beyond is not kind.', 'Three doors scar the land. Only one opens at a time.', 'Come back when you have outlived something.'] },
];

// ================= OVERWORLD (procedural) =================
export const OW = { w: 64, h: 52 };
export const OW_POI = [
  { id: 'warren', name: 'Goblin Warren', x: 12, y: 10, r: 5, kind: 'dungeon', zone: 'warren', glyph: 'D' },
  { id: 'ruins', name: 'Sunken Ruins', x: 48, y: 9, r: 5, kind: 'dungeon', zone: 'ruins', glyph: 'D' },
  { id: 'keep', name: 'Ember Keep', x: 50, y: 40, r: 5, kind: 'dungeon', zone: 'keep', glyph: 'D' },
  { id: 'throne', name: 'Throne of Cinders', x: 12, y: 42, r: 5, kind: 'dungeon', zone: 'throne', glyph: 'D' },
  { id: 'camp1', name: 'Ridgecamp', x: 30, y: 14, r: 4, kind: 'camp' },
  { id: 'camp2', name: 'Mudflat Camp', x: 20, y: 30, r: 4, kind: 'camp' },
  { id: 'camp3', name: 'Ashen Camp', x: 40, y: 27, r: 4, kind: 'camp' },
  { id: 'grove', name: 'Whisper Grove', x: 33, y: 44, r: 4, kind: 'grove' },
  { id: 'shrine', name: 'Old Shrine', x: 5, y: 26, r: 3, kind: 'shrine' },
];

export function buildOverworld() {
  const rng = new U.Rng(90210);
  const w = OW.w, h = OW.h;
  const g = [];
  for (let y = 0; y < h; y++) {
    let row = [];
    for (let x = 0; x < w; x++) {
      const edge = Math.min(x, y, w - 1 - x, h - 1 - y);
      if (edge <= 1) row.push('~');
      else if (edge <= 3 && rng.next() < 0.6) row.push('~');
      else row.push(rng.next() < 0.10 ? ',' : '.');
    }
    g.push(row);
  }
  // tree bands + rock outcrops
  for (let i = 0; i < 26; i++) {
    const cx = rng.int(4, w - 5), cy = rng.int(4, h - 5);
    const kind = rng.next() < 0.72 ? 'T' : 'r';
    const rad = rng.range(1.6, 4.2);
    for (let y = Math.floor(cy - rad); y <= cy + rad; y++)
      for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
        if (x < 3 || y < 3 || x >= w - 3 || y >= h - 3) continue;
        if (Math.hypot(x - cx, y - cy) < rad && rng.next() < 0.72) g[y][x] = kind;
      }
  }
  // ponds
  for (let i = 0; i < 7; i++) {
    const cx = rng.int(8, w - 9), cy = rng.int(8, h - 9), rad = rng.range(2.2, 5.5);
    for (let y = Math.floor(cy - rad); y <= cy + rad; y++)
      for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
        if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) continue;
        if (Math.hypot(x - cx, y - cy) < rad) g[y][x] = rng.next() < 0.55 ? '~' : 'x';
      }
  }
  // roads: connect POI centers with L-shaped paths
  const pts = OW_POI.map((p) => [p.x, p.y]);
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    carve(g, a[0], a[1], b[0], a[1]);
    carve(g, b[0], a[1], b[0], b[1]);
  }
  // POI clearings
  for (const p of OW_POI) {
    const r = p.r || 4;
    for (let y = p.y - r; y <= p.y + r; y++)
      for (let x = p.x - r; x <= p.x + r; x++) {
        if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) continue;
        if (Math.hypot(x - p.x, y - p.y) <= r) g[y][x] = (p.kind === 'shrine' ? '+' : rng.next() < 0.2 ? ',' : '.');
      }
  }
  // town gate at south-center
  const gx = (w >> 1), gy = h - 3;
  for (let y = gy - 4; y <= gy; y++) for (let x = gx - 3; x <= gx + 3; x++) g[y][x] = '+';
  for (let y = h - 2; y < h; y++) g[y][gx] = '+';
  return { grid: g, w, h };
}
function carve(g, x0, y0, x1, y1) {
  const stepX = Math.sign(x1 - x0), stepY = Math.sign(y1 - y0);
  let x = x0, y = y0;
  for (;;) {
    if (y > 1 && y < g.length - 2 && x > 1 && x < g[0].length - 2) g[y][x] = '+';
    if (x === x1 && y === y1) break;
    if (x !== x1) x += stepX; else if (y !== y1) y += stepY;
  }
}

// ================= DUNGEONS (hand authored) =================
const WARREN_MAP = [
  '##################################',
  '#................................#',
  '#..#####...#######....######.....#',
  '#..#S...#...#.....#...#....#..b..#',
  '#..#....#...#.rr..#...#.gg.#.....#',
  '#..#....D...#.....D...#....#.....#',
  '#..#....#...#.....#...######.....#',
  '#..#####...#######...............#',
  '#................................#',
  '#....C.........C.................#',
  '#..rr....#####....rr....####.....#',
  '#........#...#..........#..#.....#',
  '#........#.gg#..........#.ss.#...#',
  '#........#...D..........#....#...#',
  '#........#...#..........#..C.#...#',
  '#........#####..........#....#...#',
  '#.................................#',
  '#...RRR.......BB.......RRR.........#',
  '#.................................#',
  '#..####...####...####...####.......#',
  '#..#..#...#..#...#..#...#..#.......#',
  '#..#.C#...#gg#...#.s#...#.G#.......#',
  '#..#..#...#..#...#..#...#..#.......#',
  '#..####...####...####...####.......#',
  '#..................................#',
  '##################################',
];

const RUINS_MAP = [
  '##################################',
  '#................................#',
  '#..xxxxxxx....####....xxxxxxx....#',
  '#..x..S...x...#..#....x..C..x....#',
  '#..x......x...#L.#....x......x...#',
  '#..xxxxxxx....#..#....xxxxxxx....#',
  '#.............####...............#',
  '#....ss....D........D.....cc.....#',
  '#....ss...................cc.....#',
  '#..#####....######....#####......#',
  '#..#...#....#....#....#...#......#',
  '#..#.C.#....#.ss.#....#.C.#......#',
  '#..#...D....#....D....#...#......#',
  '#..#...#....#....#....#...#......#',
  '#..#####....######....#####......#',
  '#................................#',
  '#...xxxxxxxxxxxxxxxxxxxxxxxx.....#',
  '#...x..cc..................ss..x.#',
  '#...x..........................x.#',
  '#...x....xxxxxx....xxxxxx....xx..#',
  '#...x....x....x....x....x........#',
  '#...x....x.C..x....x.b..x........#',
  '#...x....x....x....x....x........#',
  '#...x....xxxxxx....xxxxxx........#',
  '#...xxxxxx.......................#',
  '#................................#',
  '##################################',
];

const KEEP_MAP = [
  '##################################',
  '#................................#',
  '#..WWWWW....######....WWWWW......#',
  '#..W...WW...#....#....W...WW.....#',
  '#..W.S.WW...#.cc.#....W.C.WW.....#',
  '#..W...WW...#....#....W...WW.....#',
  '#..WWWWW....######....WWWWW......#',
  '#................#...............#',
  '#....GG......####D####.....cc....#',
  '#............#......#...........#',
  '#..#####.....#.GGGG.#....#####...#',
  '#..#...#.....#......#....#...#...#',
  '#..#.C.#.....#......#....#.C.#...#',
  '#..#...D.....#..BB..#....#...#...#',
  '#..#...#.....#......#....#...#...#',
  '#..#####.....#######.....#####...#',
  '#................................#',
  '#...WWWWWWWWWWWWWWWWWWWWWWW......#',
  '#...W.....................W......#',
  '#...W...WWWWWW...WWWWWW...W......#',
  '#...W...W....W...W....W...W......#',
  '#...W...W.cc.W...W.GG.W...W...b..#',
  '#...W...W....W...W....W...W......#',
  '#...W...WWWWWW...WWWWWW...W......#',
  '#...W.....................W......#',
  '#...WWWWWWWWWWWWWWWWWWWWWWW......#',
  '#................................#',
  '##################################',
];

const THRONE_MAP = [
  '################################',
  '#..............................#',
  '#..WWWWWWWWWWWWWWWWWWWWWWWW...#',
  '#..W......................W...#',
  '#..W...WWWWWWWWWWWWWWWW...W...#',
  '#..W...W..............W...W...#',
  '#..W...W....S.........W...W...#',
  '#..W...W..............W...W...#',
  '#..W...W....C....C....W...W...#',
  '#..W...W..............W...W...#',
  '#..W...W..............W...W...#',
  '#..W...W......b.......W...W...#',
  '#..W...W..............W...W...#',
  '#..W...W..............W...W...#',
  '#..W...WWWWWWWWWWWWWWWW...W...#',
  '#..W......................W...#',
  '#..WWWWWWWWWWWWWWWWWWWWWWWW...#',
  '#.............................#',
  '################################',
];

export const MAPS = { warren: WARREN_MAP, ruins: RUINS_MAP, keep: KEEP_MAP, throne: THRONE_MAP };

// ---------- zone metadata ----------
export const ZONE_DEFS = {
  town: {
    name: 'Riverton', kind: 'town', map: TOWN_MAP, spawn: [17, 26],
    ambience: { clear: [0.36, 0.46, 0.62], fog: [0.55, 0.62, 0.72], fogStart: 40, fogEnd: 190, fogDensity: 0, sun: [0.5, -0.7, 0.35], sunColor: [1, 0.93, 0.78], hemi: [0.55, 0.58, 0.66], ground: [0.4, 0.37, 0.29] },
    music: 'town',
    exits: [{ x: 17, y: 28, to: 'overworld', toSpawn: [32, 46], label: 'South Gate' },
      { x: 18, y: 28, to: 'overworld', toSpawn: [32, 46], label: 'South Gate' }],
    npcs: TOWN_NPCS,
    props: [{ kind: 'fountain', x: 19, y: 11 }, { kind: 'brazier', x: 12, y: 8 }, { kind: 'brazier', x: 24, y: 8 },
      { kind: 'brazier', x: 12, y: 18 }, { kind: 'brazier', x: 24, y: 18 }, { kind: 'board', x: 15, y: 24 },
      { kind: 'barrel', x: 9, y: 9 }, { kind: 'barrel', x: 28, y: 9 }, { kind: 'barrel', x: 9, y: 21 },
      { kind: 'crate', x: 20, y: 22 }, { kind: 'crate', x: 13, y: 15 }],
    chests: [],
    enemies: [],
  },
  overworld: {
    name: 'The Green Reach', kind: 'overworld', procedural: true, spawn: [32, 46],
    ambience: { clear: [0.28, 0.42, 0.66], fog: [0.62, 0.72, 0.86], fogStart: 60, fogEnd: 260, fogDensity: 0, sun: [0.45, -0.8, 0.3], sunColor: [1, 0.95, 0.82], hemi: [0.5, 0.55, 0.68], ground: [0.28, 0.44, 0.24] },
    music: 'over',
    exits: [{ x: 32, y: 49, to: 'town', toSpawn: [17, 27], label: 'Riverton Gate' }],
    chests: [{ x: 33, y: 44, il: 6, rarity: 'rare', label: 'Grove Chest' },
      { x: 5, y: 26, il: 3, rarity: 'uncommon', label: 'Shrine Chest' },
      { x: 12, y: 14, il: 5, rarity: 'rare', label: 'Warren Cache' }],
    enemies: [],
    poi: OW_POI,
  },
  warren: {
    name: 'Goblin Warren', kind: 'dungeon', map: WARREN_MAP, spawn: [4, 3], il: 4,
    ambience: { clear: [0.08, 0.09, 0.12], fog: [0.13, 0.14, 0.18], fogStart: 13, fogEnd: 92, fogDensity: 0, sun: [0.4, -0.75, 0.45], sunColor: [0.66, 0.64, 0.7], hemi: [0.46, 0.46, 0.52], ground: [0.42, 0.37, 0.29] },
    music: 'dungeon',
    exits: [{ x: 4, y: 3, to: 'overworld', toSpawn: [12, 13], label: 'Warren Mouth' }],
    boss: { kind: 'ogre', x: 29, y: 3, name: 'Gutripper, the Ogre of the Warren', il: 8, key: 'goblinIdol', keyName: 'Goblin Idol' },
    chests: [],
    enemies: [],
  },
  ruins: {
    name: 'Sunken Ruins', kind: 'dungeon', map: RUINS_MAP, spawn: [4, 3], il: 9,
    ambience: { clear: [0.09, 0.13, 0.16], fog: [0.17, 0.21, 0.25], fogStart: 14, fogEnd: 100, fogDensity: 0, sun: [0.35, -0.7, 0.5], sunColor: [0.72, 0.82, 0.86], hemi: [0.5, 0.56, 0.6], ground: [0.32, 0.4, 0.4] },
    music: 'dungeon',
    exits: [{ x: 4, y: 3, to: 'overworld', toSpawn: [48, 12], label: 'Ruins Stair' }],
    boss: { kind: 'choir', x: 21, y: 21, name: 'The Drowned Choir', il: 14, key: 'tideSigil', keyName: 'Tide Sigil' },
    chests: [],
    enemies: [],
    lever: { x: 15, y: 4, unlocks: 'ruinsDoor' },
  },
  keep: {
    name: 'Ember Keep', kind: 'dungeon', map: KEEP_MAP, spawn: [4, 3], il: 15,
    ambience: { clear: [0.15, 0.08, 0.06], fog: [0.22, 0.12, 0.09], fogStart: 14, fogEnd: 100, fogDensity: 0, sun: [0.4, -0.7, 0.4], sunColor: [0.9, 0.62, 0.5], hemi: [0.52, 0.42, 0.38], ground: [0.44, 0.32, 0.26] },
    music: 'dungeon',
    exits: [{ x: 4, y: 3, to: 'overworld', toSpawn: [50, 37], label: 'Keep Gate' }],
    boss: { kind: 'cinderlord', x: 28, y: 21, name: 'Cinderlord Vezzan', il: 22, key: 'emberCrown', keyName: 'Ember Crown' },
    chests: [],
    enemies: [],
  },
  throne: {
    name: 'Throne of Cinders', kind: 'lair', map: THRONE_MAP, spawn: [12, 6], il: 24,
    ambience: { clear: [0.13, 0.06, 0.05], fog: [0.19, 0.09, 0.08], fogStart: 13, fogEnd: 90, fogDensity: 0, sun: [0.35, -0.75, 0.4], sunColor: [0.95, 0.55, 0.45], hemi: [0.48, 0.36, 0.34], ground: [0.38, 0.25, 0.22] },
    music: 'boss',
    exits: [{ x: 12, y: 6, to: 'overworld', toSpawn: [12, 45], label: 'Throne Stair' }],
    boss: { kind: 'final', x: 16, y: 11, name: 'The Cinderlord, Who Waits on the Throne', il: 30, final: true },
    chests: [],
    enemies: [],
  },
};

// ---------- enemy letters in maps ----------
export const LETTER_ENEMY = { g: 'goblin', s: 'skeleton', w: 'wolf', c: 'cultist', R: 'rat', G: 'golem', b: 'boss', m: 'guard' };
export const LETTER_PROP = { C: 'chest', B: 'brazier', L: 'lever', F: 'fountain', D: 'door' };

export function parseMap(zoneId) {
  const def = ZONE_DEFS[zoneId];
  let grid, w, h;
  if (def.procedural) {
    const ow = buildOverworld();
    grid = ow.grid; w = ow.w; h = ow.h;
  } else {
    const m = normMap(def.map);
    grid = m.rows; w = m.w; h = m.h;
  }
  const enemies = [], props = [], chests = [];
  if (grid.length && typeof grid[0] === 'string') grid = grid.map((r) => r.split(''));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = grid[y][x];
      if (ch === 'S') { grid[y][x] = '.'; }
      else if (LETTER_ENEMY[ch]) { enemies.push({ kind: LETTER_ENEMY[ch], x, y }); grid[y][x] = '.'; }
      else if (ch === 'C') { chests.push({ x, y, il: def.il || 4 }); grid[y][x] = '.'; }
      else if (ch === 'B') { props.push({ kind: 'brazier', x, y }); grid[y][x] = '.'; }
      else if (ch === 'L') { props.push({ kind: 'lever', x, y }); grid[y][x] = '.'; }
      else if (ch === 'F') { props.push({ kind: 'fountain', x, y }); grid[y][x] = '.'; }
      else if (ch === 'D') { props.push({ kind: 'door', x, y }); grid[y][x] = '.'; }
    }
  }
  // boss from def
  if (def.boss) enemies.push({ kind: def.boss.kind, x: def.boss.x, y: def.boss.y, boss: true, name: def.boss.name, il: def.boss.il });
  // overworld POI + camps
  if (def.procedural) {
    for (const p of def.poi) {
      if (p.kind === 'camp') {
        const n = 4;
        for (let i = 0; i < n; i++) enemies.push({ kind: p.x < 25 ? 'goblin' : p.x < 40 ? 'wolf' : 'cultist', x: p.x + (i % 3) - 1, y: p.y + Math.floor(i / 3) });
        chests.push({ x: p.x + 2, y: p.y, il: 5 + (p.x % 7) });
      }
    }
  }
  return { grid, w, h, enemies, props, chests };
}

export const Z = { ZONE_DEFS, MAPS, normMap, parseMap, OW, OW_POI, TOWN_NPCS, LETTER_ENEMY, LETTER_PROP, buildOverworld };
