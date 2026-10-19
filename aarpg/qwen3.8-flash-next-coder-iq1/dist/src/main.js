// Boot, input, camera, main loop, AI glue, loot, transitions, save.
import { S } from './state.js';
import { U } from './util.js';
import { Z } from './zones.js';
import { WORLD as W } from './world.js';
import { T } from './terrain.js';
import { R } from './rig.js';
import { F } from './fx.js';
import { E } from './enemies.js';
import { PL } from './player.js';
import { UI } from './ui.js';
import { ITEMS as IT } from './items.js';
import { C } from './classes.js';
import { STATS as ST } from './stats.js';

const B = window.BABYLON;
export const MAIN = {};

export let canvas = null;
export const input = { keys: {}, pressed: {}, mx: 0, mz: 0, simMX: 0, simMZ: 0, simOn: false, aimX: null, aimY: null, lmb: false, rmb: false, lmbPressed: false, rmbPressed: false };
export const cam = { x: 0, z: 0, dist: 26, height: 21, yaw: -0.7854, pitch: 0, d: 26, h: 21 };
export let running = false;
export let frame = 0;

// ---------------------------------------------------------------- boot
export function boot() {
  canvas = document.getElementById('game');
  if (!canvas) return;
  S.canvas = canvas;
  S.engine = new B.Engine(canvas);
  S.scene = new B.Scene(S.engine);
  S.scene.clearColor = new B.Color4(0.04, 0.05, 0.07, 1);
  S.rng = new U.Rng(0x51ed);
  S.tmp = {};
  UI.build();
  F.initFx();
  S.camera = new B.FreeCamera('cam', new B.Vector3(0, cam.height, 0), S.scene);
  S.camera.near = 0.6;
  S.camera.far = 420;
  S.camera.fov = 0.95;
  bindInput();
  bindUiClicks();
  S.mode = 'title';
  showTitle();
  lastNow = (window.performance ? performance.now() : Date.now());
  running = true;
  requestAnimationFrame(loop);
}

export function showTitle() {
  const t = UI.dom.title;
  for (const k of ['hud', 'skills', 'minimap']) if (UI.dom[k]) UI.dom[k].style.display = 'none';
  t.style.display = 'block';
  t.style.pointerEvents = 'auto';
  t.innerHTML =
    '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">' +
    '<div style="max-width:780px;padding:26px 34px;background:rgba(10,12,16,.88);border:1px solid #4a4436;border-radius:8px">' +
    '<h2 style="color:#d9c48a;font-size:30px;margin:12px 0 6px">EMBERGLADE</h2>' +
    '<div class="dim" style="font-size:14px">A low-poly action RPG. Block, parry, roll. Take what the dark leaves behind.</div>' +
    '<div style="margin:16px 0 4px;font-size:15px">Choose your class</div>' +
    '<div style="display:flex;gap:14px;flex-wrap:wrap">' +
    C.CLASS_LIST.map((id) => {
      const m = C.CLASS_META[id];
      return '<div class="btn" data-pick="' + id + '" style="border:1px solid ' + m.color + ';border-radius:6px;padding:10px 14px;cursor:pointer">' +
        '<b style="color:' + m.color + '">' + m.name + '</b>' +
        '<div class="dim" style="font-size:12px">' + m.blurb + '</div>' +
        '<div class="dim" style="font-size:11px">Primary ' + m.primary.toUpperCase() + ' · ' + C.hotSkills(id).map((x) => x.name).join(', ') + '</div></div>';
    }).join('') + '</div>' +
    '<div class="dim" style="margin-top:18px;font-size:12px">Move: WASD or Left-Click · Attack: Left-Click · Roll: Space · Hold Shift to Block (time it to Parry) · Skills 1-6 · Interact: E · Pack I · Character C · Quest Q · Save F5 · Pause Esc</div>' +
    '</div></div>';
}

export function pickClass(id) {
  if (!C.CLASS_LIST.includes(id)) return false;
  UI.dom.title.style.display = 'none';
  UI.dom.title.style.pointerEvents = 'none';
  startGame(id);
  return true;
}

export function startGame(cls) {
  UI.dom.title.style.display = 'none';
  UI.dom.title.style.pointerEvents = 'none';
  for (const k of ['hud', 'skills', 'minimap']) if (UI.dom[k]) UI.dom[k].style.display = '';
  const pair = PL.newController(cls);
  const p = pair.p;
  p.skillRanks = {};
  for (const sk of C.hotSkills(cls)) p.skillRanks[sk.id] = 1;
  p.skillPoints = 2;
  p.cooldowns = {};
  for (const g of C.CLASS_META[cls].startGear) {
    const it = IT.genItem(S.rng, 1, g.slot, 'common', cls);
    if (it) { it.name = g.name; p.equip[g.slot] = it; }
  }
  ST.recomputeGear(p);
  ST.recalcStats(p);
  p.hp = p.stats.maxHp; p.stamina = p.stats.maxStamina; p.mana = p.stats.maxMana;
  S.quest = { keys: {}, unlocked: { town: true, overworld: true }, cleared: {}, log: [] };
  S.save.any = true;
  PL.buildPlayerRig(cls, p.equip);
  UI.skillBar(cls);
  enterZone('town');
  S.mode = 'play';
  UI.log('Welcome to Riverton.', 'gold');
  UI.log('The Warden of Gates stands by the south gate.', 'dim');
  UI.hint('Press E near things to interact.', 8);
  return pair;
}

// ---------------------------------------------------------------- zones
export function enterZone(id) {
  const z = W.enterZone(id);
  const sp = z.spawn;
  PL.P.x = W.worldOf(sp[0]);
  PL.P.z = W.worldOf(sp[1]);
  PL.P.state = 'idle';
  PL.P.dead = false;
  S.deathT = 0;
  if (PL.P.rig) { PL.P.rig.root.position.x = PL.P.x; PL.P.rig.root.position.z = PL.P.z; }
  S.solidRef = W.solidAt;
  S.loot = []; S.projectiles = []; S.traps = []; S.walls = [];
  S.enemies = z.enemies; S.npcs = z.npcs; S.chests = z.chests; S.props = z.props;
  cam.x = PL.P.x + Math.sin(cam.yaw) * cam.dist;
  cam.z = PL.P.z + Math.cos(cam.yaw) * cam.dist;
  U.refreshCamCache();
  return z;
}

// ---------------------------------------------------------------- input
export function bindInput() {
  window.addEventListener('keydown', (e) => {
    const k = normKey(e.key);
    if (!input.keys[k]) input.pressed[k] = true;
    input.keys[k] = true;
  });
  window.addEventListener('keyup', (e) => { input.keys[normKey(e.key)] = false; });
  window.addEventListener('mousemove', (e) => { input.aimX = e.clientX; input.aimY = e.clientY; });
  window.addEventListener('mousedown', (e) => {
    if (e.button === 0) { input.lmb = true; input.lmbPressed = true; }
    if (e.button === 2) { input.rmb = true; input.rmbPressed = true; }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) input.lmb = false;
    if (e.button === 2) input.rmb = false;
  });
  window.addEventListener('contextmenu', (e) => e.preventDefault());
}
export function normKey(k) {
  if (k === ' ') return 'space';
  if (k === 'Shift') return 'shift';
  if (k && k.length > 1) return k.toLowerCase();
  return (k || '').toLowerCase();
}
export function held(k) { return !!input.keys[k]; }
export function tapped(k) { const v = !!input.pressed[k]; input.pressed[k] = false; return v; }
export function clearTaps() { input.pressed = {}; }

// ---------------------------------------------------------------- ui clicks
export function bindUiClicks() {
  document.addEventListener('click', (ev) => {
    const t = ev.target;
    if (t.dataset.pick) { pickClass(t.dataset.pick); return; }
    if (t.dataset.again) { location.reload(); return; }
    if (t.dataset.buy) { buyItem(Number(t.dataset.buy)); return; }
    if (t.dataset.act === 'attr') { autoSpendAttr(); return; }
    if (t.dataset.act === 'skill') { autoSpendSkill(); return; }
    if (t.dataset.act === 'close') { closePanels(); return; }
  });
}

// ---------------------------------------------------------------- loop
export function renderFrame() {
  const e = S.engine;
  if (!e) return;
  try { S.scene.render(); return; } catch (err) { /* fall through */ }
  try { e._renderFrame(); } catch (err2) {}
}

export let lastNow = 0;
export function loop() {
  if (!running) return;
  const now = (window.performance ? performance.now() : Date.now());
  let dt = (now - lastNow) / 1000;
  lastNow = now;
  if (!(dt > 0)) dt = 0.016;
  if (dt > 0.05) dt = 0.05;
  S.dt = dt;
  S.time += dt;
  S.frame++;
  if (S.mode === 'play') step(dt);
  renderFrame();
  requestAnimationFrame(loop);
}

export function step(dt) {
  const P = PL.P;
  if (!P) return;

  if (tapped('escape')) { S.paused = !S.paused; UI.log(S.paused ? 'Paused.' : 'Resumed.', 'dim'); }
  if (S.paused) return;

  // cooldowns
  for (const k in S.player.cooldowns) { if (S.player.cooldowns[k] > 0) S.player.cooldowns[k] = Math.max(0, S.player.cooldowns[k] - dt); }

  // ---- movement intent
  let mx = 0, mz = 0;
  if (held('a') || held('arrowleft')) mx -= 1;
  if (held('d') || held('arrowright')) mx += 1;
  if (held('w') || held('arrowup')) mz -= 1;
  if (held('s') || held('arrowdown')) mz += 1;
  if (mx === 0 && mz === 0 && input.simOn) { mx = input.simMX; mz = input.simMZ; }
  if (mx === 0 && mz === 0 && input.lmb && !nearEnemy(3.2)) {
    const g = U.screenToGround(input.aimX, input.aimY, 0);
    if (g) {
      const dx = g[0] - P.x, dz = g[1] - P.z;
      const l = Math.hypot(dx, dz);
      if (l > 1.4) { mx = dx / l; mz = dz / l; }
    }
  }
  input.mx = mx; input.mz = mz;

  PL.setBlock(held('shift'));

  // ---- attack (click held or tapped)
  const wantAttack = input.lmbPressed || (input.lmb && P.state === 'idle' && nearEnemy(3.2));
  input.lmbPressed = false;
  if (wantAttack) PL.tryAttack(input);

  if (tapped('space')) PL.doRoll(input);

  // ---- skills
  const sig = C.CLASS_META[S.player.cls].signature;
  if (tapped('rmb')) PL.useSkill(sig, input);
  for (const k of ['1', '2', '3', '4', '5', '6']) {
    if (tapped(k)) {
      const sk = C.hotSkills(S.player.cls).find((x) => String(x.key) === k);
      if (sk) PL.useSkill(sk.id, input);
    }
  }

  PL.updatePlayer(dt, input);
  aiUpdate(dt);
  processNewKills();
  PL.updateProjectiles(dt);
  processNewKills();
  updateTraps(dt);
  updateWalls(dt);
  updateBurn(dt);
  cleanupEnemies(dt);
  interact();
  pickupLoot(dt);
  updateCamera(dt);
  menus();
  UI.updateHud(S.player, S.player.stats);
  UI.drawMinimap(S.zone, PL.P.x, PL.P.z);
  UI.fadeUi(dt);
  F.updateFx(dt);
  F.projectTexts();
  checkDeath();
}

export function nearEnemy(range) {
  const P = PL.P;
  for (const e of S.enemies) {
    if (e.dead) continue;
    if (U.d2sq(P.x, P.z, e.x, e.z) < range * range) return true;
  }
  return false;
}

// ---------------------------------------------------------------- AI
export function aiUpdate(dt) {
  const P = PL.P;
  if (!P) return;
  for (const e of S.enemies) {
    if (e.gone) continue;
    if (e.dead) { E.updateCorpse(e, dt); continue; }
    if (e.slowT > 0) { e.slowT -= dt; e.speed = E.KINDS[e.kind].speed * (1 - (e.slowed || 0)); } else { e.speed = E.KINDS[e.kind].speed; }
    const d = U.d2(P.x, P.z, e.x, e.z);
    const aggro = e.boss ? 70 : 26;
    if (d > aggro) {
      if (e.state !== 'idle') { e.state = 'idle'; e.prog = 0; }
      E.setAnim(e, 'idle', 0);
      continue;
    }
    if (e.boss) enemySpecial(e, dt);
    if (e.stagger > 0) { e.stagger -= dt; e.state = 'hurt'; e.prog = 0; E.setAnim(e, 'hurt', 0); continue; }

    if (e.state === 'idle' && e.cooldown <= 0) {
      const ranged = !!e.projectile && d > e.range * 0.5 && d < e.range * 1.1;
      if (ranged) {
        e.state = 'cast';
        e.prog = 0;
        e.onCast = (en) => {
          const [dx, dz] = U.norm2(PL.P.x - en.x, PL.P.z - en.z);
          S.projectiles.push({
            x: en.x, z: en.z, y: 1.4, dx, dz, speed: 16, ttl: 2.4,
            dmg: ST.enemyAttackPower(en, S.player.level) * 0.85,
            color: en.projectile === 'frost' ? '#7ad6ff' : '#ff7a2a',
            fromPlayer: false, r: 0.42,
          });
        };
      } else if (d <= e.range * 1.05) {
        e.state = 'windup';
        e.prog = 0;
        e.onStrike = (en) => {
          const dd = U.d2(PL.P.x, PL.P.z, en.x, en.z);
          const a = U.heading(PL.P.x - en.x, PL.P.z - en.z);
          if (dd <= en.range + PL.P.r + 0.3 && Math.abs(U.angleDelta(en.facing, a)) < en.arc * 0.7) {
            const raw = ST.enemyAttackPower(en, S.player.level);
            const dmg = PL.playerTakeDamage(raw, en, { knock: en.knock });
            if (dmg > 0 && en.knock) {
              const [kx, kz] = U.norm2(PL.P.x - en.x, PL.P.z - en.z);
              const out = U.resolveCircle(PL.P.x + kx * 1.7, PL.P.z + kz * 1.7, PL.P.r, S.solidRef, S.tmp.ppos || (S.tmp.ppos = {}));
              PL.P.x = out.x; PL.P.z = out.z;
            }
          } else {
            F.slash(en.x + Math.sin(en.facing) * en.range * 0.6, 1.1, en.z + Math.cos(en.facing) * en.range * 0.6, en.facing, en.range, '#f4e8d0', 0.16);
          }
        };
      } else {
        e.state = 'approach';
      }
    }
    if (e.state === 'approach') {
      const a = U.heading(P.x - e.x, P.z - e.z) + (e.t % 2 < 1 ? 0.32 : -0.32);
      E.move(e, dt, e.x + Math.sin(a) * 5, e.z + Math.cos(a) * 5);
      E.setAnim(e, 'run', 0);
    }
    E.updateEnemy(e, dt, P.x, P.z);
    if (e.state !== 'windup' && e.state !== 'strike' && e.state !== 'cast') E.setFacing(e, P.x, P.z);
    E.flashEnemy(e);
    separate(e);
  }
}

export function separate(e) {
  for (const o of S.enemies) {
    if (o === e || o.dead || o.gone) continue;
    const dx = e.x - o.x, dz = e.z - o.z;
    const min = e.r + o.r;
    const dd = dx * dx + dz * dz;
    if (dd < min * min && dd > 1e-6) {
      const d = Math.sqrt(dd);
      const push = (min - d) * 0.5;
      const out = U.resolveCircle(e.x + (dx / d) * push, e.z + (dz / d) * push, e.r, S.solidRef, S.tmp.sep || (S.tmp.sep = {}));
      e.x = out.x; e.z = out.z;
    }
  }
}

export function cleanupEnemies(dt) {
  if (!S.enemies.some((e) => e.gone)) return;
  S.enemies = S.enemies.filter((e) => !e.gone);
  if (S.zone) S.zone.enemies = S.enemies;
}

// boss telegraphed specials
export function enemySpecial(e, dt) {
  e.specialCd = (e.specialCd == null ? 4.5 : e.specialCd - dt);
  if (e.specialCd > 0) return;
  e.specialCd = 7.5;
  const P = PL.P;
  const roll = S.rng.next();
  const pow = ST.enemyAttackPower(e, S.player.level);
  if (roll < 0.42) {
    const tx = P.x, tz = P.z, r = 4.4;
    F.ring(tx, tz, r, '#ff4a2a', 1.2, { growTo: r });
    F.text(tx, 3, tz, 'MOVE!', '#ff6a4a', 1.2);
    const t0 = S.time;
    setTimeout(() => {
      if (S.mode !== 'play') return;
      F.burst(tx, 0.6, tz, '#ff6a2a', 24, { spread: r, up: 3.4 });
      F.shake(0.7);
      if (U.d2(PL.P.x, PL.P.z, tx, tz) < r && PL.P.invuln <= 0) PL.playerTakeDamage(pow * 1.15, e, {});
      for (const en of S.enemies) {
        if (en.dead || en === e) continue;
        if (U.d2(tx, tz, en.x, en.z) < r) E.damageEnemy(en, Math.round(pow * 0.4), {});
      }
    }, 1200);
  } else if (roll < 0.72) {
    const [dx, dz] = U.norm2(P.x - e.x, P.z - e.z);
    for (let i = 0; i < 24; i++) {
      e.x += dx * 0.75; e.z += dz * 0.75;
      const out = U.resolveCircle(e.x, e.z, e.r, S.solidRef, S.tmp.chg || (S.tmp.chg = {}));
      e.x = out.x; e.z = out.z;
      if (U.d2(e.x, e.z, PL.P.x, PL.P.z) < e.r + PL.P.r + 0.5) {
        PL.playerTakeDamage(pow * 1.3, e, {});
        break;
      }
    }
    F.shake(0.6);
  } else {
    const z = S.zone;
    const kind = z.id === 'warren' ? 'goblin' : z.id === 'ruins' ? 'skeleton' : z.id === 'keep' ? 'cultist' : 'skeleton';
    let made = 0;
    for (let i = 0; i < 3; i++) {
      const a = S.rng.next() * Math.PI * 2, dd = 4 + S.rng.next() * 5;
      const ex = e.x + Math.sin(a) * dd, ez = e.z + Math.cos(a) * dd;
      if (W.solidAt(Math.floor(ex / S.cell), Math.floor(ez / S.cell))) continue;
      const ne = E.makeEnemy(z, kind, ex, ez, Math.max(1, e.level - 3), false);
      if (ne) { S.enemies.push(ne); z.enemies.push(ne); made++; }
    }
    if (made) UI.log('The ' + (e.name || 'boss') + ' calls its kin.', 'bad');
  }
}

// ---------------------------------------------------------------- kill rewards
export function processNewKills() {
  const p = S.player;
  for (const e of S.enemies) {
    if (!e.dead || e.rewarded) continue;
    e.rewarded = true;
    const roll = IT.lootRoll(S.rng, e.level, p, { itemChance: e.boss ? 1 : 0.22, guaranteed: e.boss ? [{ slot: 'mainHand', rarity: 'epic' }, { slot: 'chest', rarity: 'rare' }] : null });
    p.gold += roll.gold;
    p.kills++;
    const xp = e.xp;
    F.text(e.x, 2.6, e.z, '+' + xp + ' XP', '#b6e0a0', 1.2);
    const res = ST.grantXp(p, xp);
    if (res && res.length) levelUp(res);
    for (const it of roll.items) spawnGroundLoot(e.x, e.z, it);
    if (e.boss) bossDeath(e);
  }
}

export function spawnGroundLoot(x, z, it) {
  const gx = x + (S.rng.next() - 0.5) * 2.6;
  const gz = z + (S.rng.next() - 0.5) * 2.6;
  const n = (S.lootN = (S.lootN || 0) + 1);
  const m = B.MeshBuilder.CreateBox('loot' + n, { size: 0.5 }, S.scene);
  m.position = new B.Vector3(gx, 0.6, gz);
  const mm = new B.StandardMaterial('lootm' + n, S.scene);
  const c = U.hexToRgb(it.color);
  mm.diffuseColor = new B.Color3(c[0], c[1], c[2]);
  mm.emissiveColor = new B.Color3(c[0] * 0.8, c[1] * 0.8, c[2] * 0.8);
  m.material = mm;
  const l = { x: gx, z: gz, it, mesh: m, m, bob: S.rng.next() * 6 };
  S.loot.push(l);
  return l;
}

export function pickupLoot(dt) {
  const P = PL.P;
  for (const l of S.loot) {
    l.mesh.position.y = 0.55 + Math.sin(S.time * 2.6 + l.bob) * 0.13;
    l.mesh.rotation.y += dt * 1.8;
    if (l.taken) continue;
    if (U.d2sq(P.x, P.z, l.x, l.z) > 3.2) continue;
    l.taken = true;
    takeItem(l.it);
    l.mesh.dispose();
  }
  S.loot = S.loot.filter((x) => !x.taken);
}

export function takeItem(it) {
  const p = S.player;
  const slot = it.slot;
  const cur = p.equip[slot];
  const ns = IT.scoreItem(it);
  const cs = cur ? IT.scoreItem(cur) : -999;
  if (cs < 0 || ns > cs * 1.05) {
    if (cur) { p.bag.push(cur); trimBag(p); }
    p.equip[slot] = it;
    ST.recomputeGear(p);
    ST.recalcStats(p);
    if (slot === 'mainHand' || slot === 'offHand' || slot === 'head' || slot === 'chest') PL.buildPlayerRig(S.player.cls, p.equip);
    UI.log('Equipped ' + it.name, 'good');
    UI.toast(it.name, 1.6);
  } else if (p.bag.length < 26) {
    p.bag.push(it);
    UI.log('Picked up ' + it.name, 'dim');
  } else {
    p.gold += Math.round(it.value * 0.35);
    UI.log('Bag full — sold ' + it.name, 'gold');
  }
  return true;
}
export function trimBag(p) {
  while (p.bag.length > 26) {
    let wi = 0, ws = 1e9;
    for (let i = 0; i < p.bag.length; i++) { const s = IT.scoreItem(p.bag[i]); if (s < ws) { ws = s; wi = i; } }
    const it = p.bag.splice(wi, 1)[0];
    p.gold += Math.round(it.value * 0.35);
  }
}

export function levelUp(levels) {
  const p = S.player;
  const arr = Array.isArray(levels) ? levels : [levels];
  for (const lv of arr) {
    UI.toast('Level ' + lv, 2.8);
    F.ring(PL.P.x, PL.P.z, 4, '#ffe9a0', 0.9, { growTo: 5.2 });
    F.burst(PL.P.x, 1, PL.P.z, '#ffe9a0', 22, { spread: 2.2, up: 4.2 });
  }
  const s = p.stats;
  p.hp = s.maxHp; p.stamina = s.maxStamina; p.mana = s.maxMana;
  UI.renderChar();
}

export function bossDeath(e) {
  const z = S.zone;
  const bd = z.def.boss;
  if (bd && bd.key) {
    S.quest.keys[bd.key] = true;
    UI.toast(bd.keyName || bd.key, 3.4);
    UI.log('You take the ' + (bd.keyName || bd.key) + '.', 'gold');
    const next = { goblinIdol: 'ruins', tideSigil: 'keep', emberCrown: 'throne' }[bd.key];
    if (next) { S.quest.unlocked[next] = true; UI.log('The way to ' + Z.ZONE_DEFS[next].name + ' is unsealed.', 'gold'); }
  }
  S.quest.cleared[z.id] = true;
  if (bd && bd.final) { S.mode = 'victory'; showEnd(true); }
}

// ---------------------------------------------------------------- hazards
export function updateTraps(dt) {
  for (const tr of S.traps) {
    tr.ttl -= dt;
    if (tr.ttl <= 0) { tr.dead = true; continue; }
    if (!tr.armed) continue;
    for (const e of S.enemies) {
      if (e.dead) continue;
      if (U.d2sq(tr.x, tr.z, e.x, e.z) >= (tr.r + e.r) * (tr.r + e.r)) continue;
      if (tr.kind === 'snare') {
        e.rooted = 2.4 + tr.rank * 0.5;
        e.state = 'hurt'; e.prog = 0;
        F.text(e.x, 2, e.z, 'ROOTED', '#c9a24a', 1.1);
        F.ring(tr.x, tr.z, tr.r, '#c9a24a', 0.4);
      } else {
        const dmg = Math.round(ST.attackPower(S.player, S.player.stats) * (1.3 + tr.rank * 0.3));
        F.ring(tr.x, tr.z, 3.8, '#ff8a2a', 0.45, { growTo: 4 });
        F.burst(tr.x, 0.8, tr.z, '#ff8a2a', 26, { spread: 3.8, up: 3.2 });
        F.shake(0.7);
        for (const o of S.enemies) {
          if (o.dead) continue;
          if (U.d2(tr.x, tr.z, o.x, o.z) > 4) continue;
          E.damageEnemy(o, dmg, { stagger: 0.4 });
          F.text(o.x, 2.1, o.z, dmg, '#ff8a2a', 0.9);
        }
        tr.dead = true;
      }
      break;
    }
  }
  S.traps = S.traps.filter((x) => !x.dead);
}

export function wallSolid(gx, gz) {
  if (W.solidAt(gx, gz)) return true;
  for (const wl of S.walls) {
    const cx = Math.floor(wl.x / S.cell), cz = Math.floor(wl.z / S.cell);
    if (Math.abs(gx - cx) <= 1 && Math.abs(gz - cz) <= 1) return true;
  }
  return false;
}

export function updateWalls(dt) {
  for (const wl of S.walls) {
    wl.ttl -= dt;
    if (wl.ttl <= 0) { wl.dead = true; if (wl.mesh) wl.mesh.dispose(); continue; }
    if (!wl.mesh) {
      const m = B.MeshBuilder.CreateBox('icewall' + Math.round(wl.x), { w: 6, h: 3.2, d: 1.1 }, S.scene);
      m.position = new B.Vector3(wl.x, 1.6, wl.z);
      m.rotation.y = wl.yaw || 0;
      const mm = new B.StandardMaterial('icem' + Math.round(wl.x), S.scene);
      mm.diffuseColor = new B.Color3(0.55, 0.8, 1);
      mm.emissiveColor = new B.Color3(0.16, 0.3, 0.45);
      mm.alpha = 0.85;
      m.material = mm;
      wl.mesh = m;
    }
    for (const e of S.enemies) {
      if (e.dead) continue;
      if (U.d2sq(wl.x, wl.z, e.x, e.z) > 16) continue;
      const out = U.resolveCircle(e.x, e.z, e.r, wallSolid, S.tmp.wall || (S.tmp.wall = {}));
      e.x = out.x; e.z = out.z;
      e.slowed = 0.45; e.slowT = 1.2;
    }
  }
  S.walls = S.walls.filter((x) => !x.dead);
}

export function updateBurn(dt) {
  for (const e of S.enemies) {
    if (e.dead || !(e.burn > 0)) continue;
    e.burnT = (e.burnT || 0) - dt;
    if (e.burnT > 0) continue;
    e.burnT = 0.7;
    const dmg = Math.max(1, Math.round(e.burn));
    E.damageEnemy(e, dmg, {});
    F.text(e.x, 2.2, e.z, dmg, '#ff7a2a', 0.7);
    F.burst(e.x, 1.1, e.z, '#ff7a2a', 3, { spread: 0.9, up: 1.8, size: 0.1 });
    e.burn -= 0.7;
  }
}

// ---------------------------------------------------------------- interaction
export function interact() {
  const P = PL.P;
  const near = (ox, oz, r) => U.d2sq(P.x, P.z, ox, oz) < r * r;

  // zone exits
  for (const ex of S.zone.exits) {
    if (!near(ex.x, ex.z, 3.4)) continue;
    const to = ex.to;
    if (!S.quest.unlocked[to]) { UI.hint(Z.ZONE_DEFS[to].name + ' is sealed. Find the key that opens it.', 5); continue; }
    UI.hint('Press E for ' + (ex.label || Z.ZONE_DEFS[to].name), 4);
    if (!tapped('e')) continue;
    UI.log('Entering ' + Z.ZONE_DEFS[to].name + '…', 'gold');
    enterZone(to);
    return;
  }

  // overworld dungeon mouths
  if (S.zoneId === 'overworld') {
    for (const poi of Z.OW_POI) {
      if (poi.kind !== 'dungeon') continue;
      const px = W.worldOf(poi.x), pz = W.worldOf(poi.y);
      if (!near(px, pz, 5)) continue;
      if (!S.quest.unlocked[poi.zone]) { UI.hint(poi.name + ' is sealed — slay the previous lair first.', 5); continue; }
      UI.hint('Press E to enter ' + poi.name, 4);
      if (tapped('e')) { UI.log('Entering ' + poi.name, 'gold'); enterZone(poi.zone); return; }
    }
  }

  // npcs / shops
  for (const n of S.npcs) {
    if (!near(n.x, n.z, 3.6)) continue;
    if (n.rig) R.pose(n.rig, 'idle', 0, { t: S.time });
    UI.hint('Press E to speak with ' + n.name, 4);
    if (tapped('e')) { openShop(n); return; }
  }

  // chests
  for (const c of S.chests) {
    if (c.opened || !near(c.x, c.z, 3.2)) continue;
    UI.hint('Press E to open the chest', 3);
    if (!tapped('e')) continue;
    c.opened = true;
    if (c.rig && c.rig.meshes[1]) { c.rig.meshes[1].position.y += 0.55; c.rig.meshes[1].rotation.x = -0.95; }
    const il = c.il || S.zone.def.il || 4;
    const roll = IT.lootRoll(S.rng, il, S.player, { itemChance: 0.55, guaranteed: [{ slot: null, rarity: null }] });
    S.player.gold += roll.gold;
    F.text(c.x, 2.4, c.z, '+' + roll.gold + ' gold', '#e8c469', 1.5);
    const n = 1 + Math.floor(S.rng.next() * 2);
    for (let i = 0; i < n; i++) spawnGroundLoot(c.x, c.z, IT.genItem(S.rng, il, pickSlot(), null, S.player.cls));
    UI.log('The chest yields its contents.', 'gold');
    return;
  }

  // props
  for (const pr of S.props) {
    if (!near(pr.x, pr.z, 3.2)) continue;
    if (pr.kind === 'fountain') {
      UI.hint('Press E to drink', 3);
      if (tapped('e')) {
        const healed = ST.heal(S.player, S.player.stats, S.player.stats.maxHp * 0.45);
        S.player.mana = S.player.stats.maxMana;
        S.player.stamina = S.player.stats.maxStamina;
        F.text(pr.x, 2.6, pr.z, '+' + healed, '#78c07a', 1.3);
        UI.log('You drink from the fountain.', 'good');
        return;
      }
    } else if (pr.kind === 'lever') {
      UI.hint('Press E to pull the lever', 3);
      if (tapped('e')) {
        S.quest.lever = true;
        S.zone.doorOpen = true;
        if (pr.arm) pr.arm.rotation.x = -0.7;
        for (const d of S.props) if (d.kind === 'door' && !d.open) {
          d.open = true;
          if (d.rig && d.rig.meshes[0]) d.rig.meshes[0].position.x -= 3.4;
        }
        UI.log('The door grinds open.', 'gold');
        F.shake(0.6);
        return;
      }
    } else if (pr.kind === 'board') {
      UI.hint('Press E to read', 3);
      if (tapped('e')) { UI.log('A weathered board: “Riverton — pop. 400. Mind the wolves.”', 'dim'); return; }
    } else if ((pr.kind === 'crate' || pr.kind === 'barrel') && input.lmb && !pr.smashed) {
      pr.smashed = true;
      if (pr.rig) for (const mm of pr.rig.meshes) { mm.position.y -= 0.35; mm.rotation.z += 0.55; }
      F.burst(pr.x, 0.7, pr.z, '#8a6a3a', 9, { spread: 1.3, up: 2.2 });
      const g = 3 + Math.floor(S.rng.next() * 9);
      S.player.gold += g;
      F.text(pr.x, 1.9, pr.z, '+' + g + 'g', '#e8c469', 1.1);
      if (S.rng.chance(0.22)) spawnGroundLoot(pr.x, pr.z, IT.genItem(S.rng, S.zone.def.il || 4, pickSlot(), 'uncommon', S.player.cls));
    }
  }
}

export function pickSlot() {
  const slots = ['head', 'chest', 'legs', 'feet', 'hands', 'offHand', 'mainHand', 'ring', 'amulet'];
  return slots[Math.floor(S.rng.next() * slots.length)];
}

// ---------------------------------------------------------------- shops
export function openShop(npc) {
  const p = S.player;
  const il = Math.max(2, p.level + 2);
  const stock = [];
  const kind = npc.shop || 'goods';
  for (let i = 0; i < 6; i++) {
    let slot;
    if (kind === 'weapons') slot = 'mainHand';
    else if (kind === 'armor') slot = (['head', 'chest', 'legs', 'feet', 'hands', 'offHand'])[Math.floor(S.rng.next() * 6)];
    else if (kind === 'goods') slot = (['ring', 'amulet', 'feet'])[Math.floor(S.rng.next() * 3)];
    else slot = (['ring', 'amulet', 'chest'])[Math.floor(S.rng.next() * 3)];
    const rar = kind === 'potions' ? (S.rng.next() < 0.5 ? 'rare' : 'uncommon') : null;
    stock.push(IT.genItem(S.rng, il + Math.floor(S.rng.next() * 4), slot, rar, p.cls));
  }
  if (kind === 'potions') {
    for (let i = 0; i < 3; i++) {
      stock.push({ slot: 'consumable', name: ['Emberwater', 'Frostwater', 'Stone Tonic'][i], rarity: 'uncommon', color: '#63cf5e', value: 40 + i * 30, bonus: {}, potion: i, il });
    }
  }
  npc.stock = stock;
  UI.renderShop(stock, shopTitle(kind), npc.name);
}

export function buyItem(i) {
  const n = S.npcs.find((x) => x.stock && x.stock[i]);
  if (!n) return;
  const it = n.stock[i];
  if (!it) return;
  const p = S.player;
  if (it.potion != null) {
    if (p.gold < it.value) { UI.log('Not enough gold.', 'bad'); return; }
    p.gold -= it.value;
    const healed = ST.heal(p, p.stats, p.stats.maxHp * (0.35 + it.potion * 0.12));
    F.text(PL.P.x, 2.6, PL.P.z, '+' + healed, '#63cf5e', 1.4);
    UI.log('You quaff ' + it.name + '.', 'good');
    return;
  }
  if (p.gold < it.value) { UI.log('Not enough gold for ' + it.name + '.', 'bad'); return; }
  p.gold -= it.value;
  n.stock[i] = null;
  takeItem(it);
  UI.log('Bought ' + it.name + '.', 'gold');
}

export function shopTitle(kind) {
  return kind === 'weapons' ? 'Aldric’s Forge' : kind === 'armor' ? 'Ironside Armory' : kind === 'potions' ? 'Croak’s Tinctures' : kind === 'goods' ? 'Peddler’s Stall' : 'Riverton';
}

export function closePanels() {
  for (const k of ['bag', 'char', 'shop']) {
    if (UI.dom[k]) { UI.dom[k].style.display = 'none'; UI.dom[k].style.pointerEvents = 'none'; }
  }
}

// ---------------------------------------------------------------- menus
export function menus() {
  if (tapped('i')) { UI.renderBag(); UI.dom.bag.style.display = 'block'; UI.dom.bag.style.pointerEvents = 'auto'; }
  if (tapped('c')) { UI.renderChar(); UI.dom.char.style.display = 'block'; UI.dom.char.style.pointerEvents = 'auto'; }
  if (tapped('q')) { renderQuest(); }
  if (tapped('f5')) { saveGame(); }
}

export function renderQuest() {
  const q = S.quest;
  let html = '<h2>Journal</h2>';
  html += '<div class="dim">Keys and tokens you carry:</div>';
  const keyNames = { goblinIdol: 'Goblin Idol', tideSigil: 'Tide Sigil', emberCrown: 'Ember Crown' };
  for (const k in keyNames) if (q.keys[k]) html += '<div class="row" style="color:#e8c469">' + keyNames[k] + '</div>';
  if (!Object.keys(q.keys).length) html += '<div class="dim" style="font-size:12px">none yet</div>';
  html += '<div class="dim">Lairs you have cleared:</div>';
  for (const id in q.cleared) if (q.cleared[id]) html += '<div class="row" style="color:#78c07a">' + Z.ZONE_DEFS[id].name + '</div>';
  html += '<div class="row"><span class="btn" data-act="close">Close</span></div>';
  UI.dom.log.innerHTML = html;
  UI.log('Journal updated.', 'dim');
}

// ---------------------------------------------------------------- attributes / skills
export function autoSpendAttr(which) {
  const p = S.player;
  const prim = C.CLASS_META[p.cls].primary;
  const order = [prim, 'vit', 'str', 'dex', 'int'].filter(Boolean);
  let k = order[0];
  for (const o of order) if (p.attr[o] < p.attr[k]) k = o;
  if (p.attrPoints <= 0) { UI.log('No attribute points left.', 'bad'); return false; }
  if (p.attrPoints <= 0) { UI.log('No attribute points left.', 'bad'); return false; }
  p.attr[k] += 1;
  p.attrPoints--;
  ST.recomputeGear(p);
  ST.recalcStats(p);
  UI.log('+' + (which || k).toUpperCase(), 'good');
  UI.renderChar();
  return true;
}
export function autoSpendSkill(id) {
  const p = S.player;
  let def = id ? C.SKILLS[p.cls].find((x) => x.id === id) : null;
  if (!def) def = C.SKILLS[p.cls].find((x) => p.level >= x.unlock && (p.skillRanks?.[x.id] || 0) < x.maxRank);
  if (!def) { UI.log('Nothing left to improve.', 'bad'); return false; }
  if (p.skillPoints <= 0) { UI.log('No skill points left.', 'bad'); return false; }
  const cur = p.skillRanks?.[def.id] || 0;
  if (p.level < def.unlock || cur >= def.maxRank) { UI.log(def.name + ' cannot be improved yet.', 'bad'); return false; }
  p.skillRanks[def.id] = cur + 1;
  p.skillPoints--;
  UI.log(def.name + ' → rank ' + (cur + 1), 'good');
  UI.renderChar();
  return true;
}

// ---------------------------------------------------------------- camera
export function updateCamera(dt) {
  const P = PL.P;
  if (!P) return;
  // pull the camera in when it would sit inside geometry (Diablo-style camera collision)
  const solid = S.solidRef || W.solidAt;
  let d = cam.dist;
  // pull in only when the camera would sit outside the zone (keeps the view inside the map)
  for (let s = 9; s >= 6; s--) {
    const t = s / 9;
    const cx = P.x + Math.sin(cam.yaw) * cam.dist * t;
    const cz = P.z + Math.cos(cam.yaw) * cam.dist * t;
    const gx = Math.floor(cx / S.cell), gz = Math.floor(cz / S.cell);
    if (gx < 0 || gz < 0 || gx >= S.gw || gz >= S.gh) continue;
    d = cam.dist * t;
    break;
  }
  if (d < 17) d = 17;
  cam.d = d;
  const tx = P.x + Math.sin(cam.yaw) * d;
  const tz = P.z + Math.cos(cam.yaw) * d;
  const k = Math.min(1, dt * 6);
  cam.x = U.lerp(cam.x, tx, k);
  cam.z = U.lerp(cam.z, tz, k);
  const hTarget = cam.height * (d / cam.dist);
  cam.h = U.lerp(cam.h || cam.height, hTarget, k);
  const sh = F.pool.shake;
  const shx = sh > 0 ? (S.rng.next() - 0.5) * sh * 2.4 : 0;
  const shy = sh > 0 ? (S.rng.next() - 0.5) * sh * 2.4 : 0;
  const c = S.camera;
  c.position.x = cam.x + shx;
  c.position.y = cam.h + shy;
  c.position.z = cam.z;
  const dx = P.x - c.position.x, dy = -c.position.y + 1.1, dz = P.z - c.position.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  c.rotation.y = Math.atan2(dx, dz);
  c.rotation.x = -Math.asin(dy / len);
  U.refreshCamCache();
}

// ---------------------------------------------------------------- end states
export function checkDeath() {
  if (S.mode !== 'play') return;
  if (!PL.P.dead) { S.deathT = 0; return; }
  S.deathT = (S.deathT || 0) + S.dt;
  if (S.deathT > 2.4) { S.mode = 'dead'; showEnd(false); }
}

export function showEnd(win) {
  const e = UI.dom.end;
  const p = S.player;
  e.style.display = 'block';
  e.style.pointerEvents = 'auto';
  e.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">' +
    '<div style="max-width:720px;padding:26px 32px;background:rgba(10,12,16,.9);border:1px solid #4a4436;border-radius:8px">' +
    '<h2 style="color:' + (win ? '#e8c469' : '#e06a52') + ';font-size:26px;margin:8px">' + (win ? 'The Cinderlord is undone' : 'You died in ' + (S.zone ? S.zone.name : 'the dark')) + '</h2>' +
    '<div class="dim">' + (win ? 'Emberglade is quiet. For now.' : 'Something took the last of your light.') + '</div>' +
    '<div class="row dim">' + C.CLASS_META[p.cls].name + ' · Level ' + p.level + ' · ' + p.kills + ' kills · ' + p.gold + ' gold · ' + p.deaths + ' deaths</div>' +
    '<div class="row" style="margin-top:14px"><span class="btn" data-again="1">Play again</span></div></div></div>';
  UI.log(win ? 'Victory.' : 'You died.', win ? 'gold' : 'bad');
}

// ---------------------------------------------------------------- save
export function saveGame() {
  try {
    const p = S.player;
    const data = {
      cls: p.cls, level: p.level, xp: p.xp, gold: p.gold, attr: p.attr, attrPoints: p.attrPoints,
      skillPoints: p.skillPoints, skillRanks: p.skillRanks, equip: p.equip, bag: p.bag,
      kills: p.kills, deaths: p.deaths, quest: S.quest, zoneId: S.zoneId,
    };
    localStorage.setItem('emberglade_save', JSON.stringify(data));
    UI.log('Progress saved.', 'good');
    return true;
  } catch (err) { UI.log('Save failed.', 'bad'); return false; }
}
export function loadGame() {
  try {
    const raw = localStorage.getItem('emberglade_save');
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
export function applySave(data) {
  if (!data || !data.cls) return false;
  const pair = PL.newController(data.cls);
  const p = pair.p;
  p.level = data.level || 1;
  p.xp = data.xp || 0;
  p.gold = data.gold || 0;
  p.kills = data.kills || 0;
  p.deaths = data.deaths || 0;
  for (const k of ['str', 'dex', 'int', 'vit']) p.attr[k] = (data.attr && data.attr[k]) || p.attr[k];
  p.attrPoints = data.attrPoints || 0;
  p.skillPoints = data.skillPoints || 0;
  p.skillRanks = data.skillRanks || {};
  p.equip = data.equip || p.equip;
  p.bag = data.bag || [];
  S.quest = data.quest || S.quest;
  ST.recomputeGear(p);
  ST.recalcStats(p);
  p.hp = p.stats.maxHp; p.stamina = p.stats.maxStamina; p.mana = p.stats.maxMana;
  PL.buildPlayerRig(p.cls, p.equip);
  UI.skillBar(p.cls);
  enterZone(data.zoneId && S.quest.unlocked[data.zoneId] ? data.zoneId : 'town');
  S.mode = 'play';
  UI.log('Saved adventurer restored.', 'gold');
  return true;
}

export const MAIN_EXPORTS = { boot, pickClass, startGame, enterZone, loop, step, showTitle, showEnd, saveGame, loadGame, applySave, openShop, buyItem, takeItem, autoSpendAttr, autoSpendSkill, input, cam, simulate, tickManual, state: S, EN: E, PL: PL, UI: UI, C: C, IT: IT, Z: Z };

// ---------------------------------------------------------------- headless hooks
export let renderSkip = 0;

export function tickManual(dt) {
  S.dt = dt;
  S.time += dt;
  S.frame++;
  if (S.mode === 'play' && !S.paused) step(dt);
  if (renderSkip > 0) renderSkip--; else renderFrame();
}

export function simulate(frames, cls, opts) {
  const o = opts || {};
  running = false; // stop the rAF loop; we drive ticks manually
  if (!S.engine) boot();
  if (S.mode === 'title') startGame(cls || 'warrior');
  if (o.zone && S.zoneId !== o.zone) enterZone(o.zone);
  if (o.god) PL.P.god = true;
  if (o.strong) {
    ST.grantXp(S.player, 1e6);
    if (o.gear) {
      const pl = S.player;
      for (const slot of ['head', 'chest', 'legs', 'feet', 'hands', 'offHand', 'mainHand', 'ring', 'amulet']) pl.equip[slot] = IT.genItem(S.rng, pl.level + 4, slot, 'epic', pl.cls);
      ST.recomputeGear(pl);
    }
    ST.recalcStats(S.player);
  }
  const huntBoss = !!o.hunt;
  const errs = [];
  const P = PL.P;
  let lastD = -1;
  for (let i = 0; i < frames; i++) {
    try {
      let best = null, bd = 1e9;
      for (const e of S.enemies) {
        if (e.dead) continue;
        const d = U.d2sq(P.x, P.z, e.x, e.z);
        if (huntBoss && e.boss) { best = e; bd = d; break; }
        if (d < bd) { bd = d; best = e; }
      }
      lastD = best ? Math.sqrt(bd) : -1;
      if (best) {
        const dx = best.x - P.x, dz = best.z - P.z;
        const l = Math.hypot(dx, dz) || 1;
        input.simMX = dx / l; input.simMZ = dz / l; input.simOn = bd > 2.6;
        input.lmb = bd < 12;
        input.lmbPressed = bd < 11;
        if (i % 90 === 0) input.pressed['space'] = true;
        if (i % 150 === 0) input.pressed['1'] = true;
        if (i % 260 === 0) input.pressed['2'] = true;
        if (i % 200 === 0) input.pressed['rmb'] = true;
      } else {
        input.simMX = Math.sin(i * 0.05); input.simMZ = Math.cos(i * 0.05); input.simOn = true;
        input.lmb = false;
      }
      input.aimX = null; input.aimY = null;
      if (i % 45 === 0 && i > 300) {
        if (S.player.attrPoints > 0) autoSpendAttr();
        if (S.player.skillPoints > 0) autoSpendSkill();
      }
      tickManual(1 / 60);
      renderSkip = 2;
    } catch (err) {
      errs.push((err && err.message ? err.message : String(err)) + '@' + i);
      if (errs.length > 6) break;
    }
  }
  renderSkip = 0; renderFrame();
  const p = S.player;
  return {
    cls: p.cls, level: p.level, hp: Math.round(p.hp), maxHp: Math.round(p.stats.maxHp),
    gold: p.gold, kills: p.kills, xp: p.xp, attrPoints: p.attrPoints, skillPoints: p.skillPoints,
    quest: { keys: Object.keys(S.quest.keys || {}), unlocked: Object.keys(S.quest.unlocked || {}), cleared: Object.keys(S.quest.cleared || {}) },
    boss: (() => { const b = S.enemies.find((x) => x.boss); return b ? b.kind + ':' + Math.round(b.hp) + '/' + Math.round(b.hpMax) : 'none'; })(),
    zone: S.zoneId, enemies: S.enemies.filter((e) => !e.dead && !e.gone).length,
    enemiesTotal: S.enemies.length, loot: S.loot.length, projectiles: S.projectiles.length,
    mode: S.mode, dead: PL.P.dead, paused: S.paused, time: Math.round(S.time * 10) / 10,
    nearest: Math.round(lastD * 10) / 10, pstate: PL.P.state, stamina: Math.round(PL.P.stamina),
    atkCount: S.player.attacks || 0, hits: S.player.hits || 0,
    enemyHp: S.enemies.slice(0, 6).map((e) => e.kind + ':' + Math.round(e.hp) + '@' + (Math.round(U.d2(P.x, P.z, e.x, e.z) * 10) / 10) + (e.blocking ? 'B' : '') + (e.state ? ':' + e.state : '')),
    equip: Object.keys(p.equip).map((k) => k + '=' + (p.equip[k] ? p.equip[k].name + '/' + p.equip[k].rarity : 'none')),
    bag: p.bag.length, stats: { armor: p.stats.armor, dmg: Math.round(ST.attackPower(p, p.stats)), crit: p.stats.crit, block: Math.round(p.stats.block * 100) },
    meshes: S.scene.meshes.length, camPos: [Math.round(S.camera.position.x), Math.round(S.camera.position.y), Math.round(S.camera.position.z)],
    camRot: [Math.round(S.camera.rotation.x * 100) / 100, Math.round(S.camera.rotation.y * 100) / 100],
    px: Math.round(P.x * 10) / 10, pz: Math.round(P.z * 10) / 10, lights: S.scene.lights.length,
    camD: [Math.round(cam.d * 10) / 10, Math.round(cam.h * 10) / 10],
    solidAround: (() => { const out = []; const gx = Math.floor(PL.P.x / S.cell), gy = Math.floor(PL.P.z / S.cell); for (let dy = -2; dy <= 2; dy++) { let row = ''; for (let dx = -2; dx <= 2; dx++) { row += (S.solidRef || W.solidAt)(gx + dx, gy + dy) ? '#' : '.'; } out.push(row); } return out; })(),
    camProbe: (() => { const c = S.camera; return [Math.round(c.position.x), Math.round(c.position.y), Math.round(c.position.z), Math.round(c.rotation.x * 100) / 100, Math.round(c.rotation.y * 100) / 100, c.fov, c.zoom, cam.x, cam.z, cam.dist, cam.height]; })(),
    renderProbe: (() => { const sc = S.scene; const has = typeof sc.render === 'function'; let msg = 'none'; try { sc.render(); msg = 'ok'; } catch (e) { msg = String(e && e.message || e); } return [has, msg, typeof S.engine._renderFrame === 'function', S.engine.getDeltaTime()]; })(),
    rigMesh: (() => { const r = PL.P.rig; if (!r) return 'none'; const out = []; for (let k = 0; k < r.meshes.length; k++) { const m = r.meshes[k]; if (m.isVisible === false) continue; const ap = m.getAbsolutePosition(); out.push([m.name, ap ? Math.round(ap.x * 10) / 10 : null, ap ? Math.round(ap.y * 10) / 10 : null, ap ? Math.round(ap.z * 10) / 10 : null, m.visibility, m.material ? 1 : 0]); if (out.length >= 5) break; } return out; })(),
    rigInfo: (() => { const out = []; const r = PL.P.rig; if (r && r.root) { out.push(['root', Math.round(r.root.position.x), Math.round(r.root.position.z), (() => { const a = r.root.getAbsolutePosition(); return [Math.round(a.x), Math.round(a.z)]; })(), Math.round(PL.P.x), Math.round(PL.P.z)]); } for (const e of S.enemies) { if (e.rig && e.rig.root) { out.push(['enemy:' + e.kind, Math.round(e.x), Math.round(e.z), (() => { const a = e.rig.root.getAbsolutePosition(); return [Math.round(a.x), Math.round(a.z)]; })(), e.rig.meshes.length]); break; } } return out; })(),
    errs,
  };
}

// ---------------------------------------------------------------- autostart
window.__ERRS__ = [];
window.addEventListener('error', (e) => { try { window.__ERRS__.push((e.message || 'error') + ' @' + (e.filename || '') + ':' + (e.lineno || '')); } catch (_) {} });
window.addEventListener('unhandledrejection', (e) => { try { window.__ERRS__.push('unhandled: ' + e.reason); } catch (_) {} });

function autoStart() {
  try {
    window.MAIN = MAIN_EXPORTS;
    boot();
    window.__READY__ = true;
  } catch (e) {
    try { window.__ERRS__.push('boot: ' + (e && e.stack ? e.stack : (e && e.message ? e.message : String(e)))); } catch (_) {}
    window.__READY__ = true;
  }
}
if (document.readyState === 'complete' || document.readyState === 'interactive') autoStart();
else document.addEventListener('DOMContentLoaded', autoStart);
