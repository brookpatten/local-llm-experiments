// Entry point: engine boot, central game object, world switching, main loop.
import { initInput, isDown, wasPressed, consumeMouse, consumeClick, endFrame, clearAll, mouse } from './core/input.js';
import { CameraRig } from './core/camera.js';
import { sfx, setMuted, isMuted, setVolume, getVolume, startMusic, stopMusic, musicBed } from './core/audio.js';
import { hasSave, readSave, writeSave, wipeSave, readSettings, writeSettings } from './core/save.js';
import { newCharacter, gainXp, recompute, xpToNext, MAX_LEVEL } from './systems/progression.js';
import { CombatSystem } from './systems/combat.js';
import Fx from './systems/fx.js';
import { SkillSystem } from './systems/skills.js';
import { ItemSystem } from './systems/loot.js';
import { QuestSystem } from './systems/quests.js';
import { ProjectileSystem } from './entities/projectile.js';
import { Enemy } from './entities/enemy.js';
import { Npc } from './entities/npc.js';
import { Player } from './entities/player.js';
import { buildOverworld } from './world/overworld.js';
import { buildDungeon } from './world/dungeon.js';
import { setupEnvironment, makePointLight } from './world/env.js';
import { OVERWORLD, DUNGEONS, DUNGEON_BY_ID, BIOMES } from './data/dungeons.js';
import { ALL_MONSTERS, scaleMonster } from './data/monsters.js';
import { CLASSES, CLASS_LIST } from './data/classes.js';
import { NPCS } from './data/npcs.js';
import { SKILLS } from './data/skills.js';
import { buildChest, buildProp, disposeTree } from './entities/meshes.js';
import { UI } from './ui/ui.js';
import { Panels } from './ui/panels.js';
import { RNG } from './core/rng.js';
import { angleTo, dist, clamp } from './core/math.js';

const B = () => window.BABYLON;
const $ = (id) => document.getElementById(id);
const MUTE_PARAM = new URLSearchParams(location.search).get('mute') !== null;

class Game {
  constructor() {
    this.canvas = $('renderCanvas');
    this.engine = new (B()).Engine(this.canvas, true, { stencil: false, adaptToDeviceRatio: false });
    this.scene = new (B()).Scene(this.engine);
    this.scene.autoClear = true;
    this.scene.skipPointerMovePicking = true;
    this.scene.clearColor = new (B()).Color4(0.05, 0.05, 0.06, 1);

    this.time = 0;
    this.dt = 0.016;
    this.world = null;
    this.env = null;
    this.player = null;
    this.enemies = [];
    this.pickups = [];
    this.npcs = [];
    this.boss = null;

    this.proj = new ProjectileSystem(this);
    this.fx = new Fx(this);
    this.combat = new CombatSystem(this);
    this.skills = new SkillSystem(this);
    this.items = new ItemSystem(this);
    this.quests = new QuestSystem(this);
    this.cam = new CameraRig(this);

    this.stats = { kills: 0, parrys: 0, deaths: 0, casts: 0, goldFound: 0, damageDealt: 0, damageTaken: 0 };
    this.input = { mouse };
    this.progress = { quests: {}, dungeonsCleared: [], discovered: [] };
    this.runSeed = (Math.random() * 1e9) | 0;
    this.dungeonDefs = DUNGEONS;

    this._mats = new Map();
    this._logged = new Set();
    this._shops = new Map();
    this.started = false;
    this.paused = false;
    this.dead = false;
    this.saveTimer = 0;
    this.returnPoint = null;
    this.lastAim = { x: 0, z: 0 };
    this.playTime = 0;
    this.settings = readSettings();
    this.won = false;
    this.applySettings();
  }

  // ---- settings ------------------------------------------------------------
  applySettings() {
    const s = this.settings;
    setVolume(s.volume);
    setMuted(!!s.muted || MUTE_PARAM);
    if (!s.music) stopMusic();
  }

  audioProbe() { return musicBed(); }

  saveSettings() { writeSettings(this.settings); }

  // Area-appropriate music bed, swapped only when the situation actually changes.
  musicTick() {
    if (!this.started || !this.settings.music) return;
    let bed = 'wild';
    if (this.world.id !== 'overworld') {
      const b = this.boss;
      const engaged = b && !b.dead && (b.state === 'attack' || b.hp < b.maxHp || dist(this.player.x, this.player.z, b.x, b.z) < 22);
      bed = engaged ? 'boss' : 'dungeon';
    } else if (dist(this.player.x, this.player.z, 0, 0) < 38) {
      bed = 'town';
    }
    if (musicBed() !== bed) startMusic(bed);
  }

  // ---- shared helpers ------------------------------------------------------
  matCache(hex, emissive = false) {
    const key = hex + (emissive ? ':em' : '');
    let m = this._mats.get(key);
    if (!m) {
      m = new (B()).StandardMaterial('cache_' + this._mats.size, this.scene);
      m.diffuseColor = (B()).Color3.FromHexString(hex);
      m.specularColor = new (B()).Color3(0.06, 0.06, 0.06);
      if (emissive) { m.emissiveColor = (B()).Color3.FromHexString(hex); }
      this._mats.set(key, m);
    }
    return m;
  }

  makeLight(color, range = 12, intensity = 1.2) { return makePointLight(this.scene, color, range, intensity); }

  log(msg, cls = '') { if (this.ui) this.ui.log(msg, cls); else console.log('[log]', msg); }
  logOnce(key, msg, cls) { if (this._logged.has(key)) return; this._logged.add(key); if (msg) this.log(msg, cls); }
  toast(m) { if (this.ui) this.ui.toast(m); }

  spawnItem(item, x, z, opts = {}) { return this.items.spawnItem(item, x, z, opts); }

  nearestEnemy(x, z, r = 14, exclude = null) {
    let best = null, bd = r * r;
    for (const e of this.enemies) {
      if (e.dead || e.removed) continue;
      if (exclude && exclude.has && exclude.has(e)) continue;
      const d = (e.x - x) * (e.x - x) + (e.z - z) * (e.z - z);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  enemiesNear(x, z, r) {
    const out = [];
    for (const e of this.enemies) {
      if (e.dead || e.removed) continue;
      if (dist(e.x, e.z, x, z) <= r) out.push(e);
    }
    return out;
  }

  gainXp(amount) {
    const before = this.player.state.level;
    const levels = gainXp(this.player.state, amount);
    if (levels > 0) {
      this.player.resyncVitals();
      this.ui.levelUp(`Level ${this.player.state.level} — ${this.player.state.freeAttrs} attribute points, ${this.player.state.freeSkills} skill point`);
      this.ui.buildSkillBar();
      sfx('levelup');
      this.log(`You are now level ${this.player.state.level}.`, 'good');
      if (this.panels.openName === 'character') this.panels.renderCharacter();
    }
    return levels;
  }

  spawnSummons(boss, monsterId, n = 3) {
    const def = ALL_MONSTERS[monsterId] || ALL_MONSTERS.goblin;
    const rng = this.items.rng;
    for (let i = 0; i < n; i++) {
      const a = rng.next() * Math.PI * 2;
      const d = 2 + rng.next() * 3;
      const x = boss.x + Math.sin(a) * d, z = boss.z + Math.cos(a) * d;
      if (this.world.grid.solidAt(x, z)) continue;
      const e = this.spawnEnemy(def.id, x, z, { level: boss.level, aggro: true });
      if (e) { e.faceTo(angleTo(e.x, e.z, this.player.x, this.player.z), 30, 1); }
    }
    this.fx.summonBurst(boss.x, boss.z);
    this.log(`${boss.name} calls for help.`, 'bad');
  }

  onEnemyDeath(e, cause) {
    this.stats.kills++;
    const xp = Math.round(e.def.xp * (e.elite ? 2.3 : 1));
    if (!this.player.dead) {
      this.ui.floatText(e.x, 1.2, e.z, '+' + xp + ' xp', '#9fd0ff', 'small');
      this.gainXp(xp);
    }
    this.quests.onKill(e.def.id, this.world.id);
    this.items.dropForMonster(e);
    if (e.boss) {
      if (this.boss === e) this.boss = null;
      if (!this.progress.dungeonsCleared.includes(this.world.id)) this.progress.dungeonsCleared.push(this.world.id);
      this.ui.toast(e.name + ' has fallen');
      this.log(`${e.name} has fallen.`, 'good');
      this.saveGame();
    }
  }

  // ---- spawning ------------------------------------------------------------
  spawnEnemy(monsterId, x, z, opts = {}) {
    const base = ALL_MONSTERS[monsterId];
    if (!base) return null;
    let def = base;
    if (opts.level && opts.level !== base.level) def = scaleMonster(base, opts.level);
    const e = new Enemy(this, def, x, z, opts);
    if (opts.aggro) e.ai = 'hunt';
    if (e.boss) this.boss = e;
    this.enemies.push(e);
    return e;
  }

  // ---- world ---------------------------------------------------------------
  clearWorld() {
    for (const e of this.enemies) { try { e.dispose(); } catch (err) { /* ignore */ } }
    for (const n of this.npcs) { try { n.dispose(); } catch (err) { /* ignore */ } }
    for (const p of this.pickups) { if (!p.removed) p.remove(); }
    this.enemies = []; this.npcs = []; this.pickups = []; this.boss = null;
    this.proj.clear();
    this.skills.clear();
    this.fx.clear();
    if (this.world) { try { this.world.dispose(); } catch (e) { console.warn(e); } this.world = null; }
    if (this.env) {
      for (const m of [this.env.sky]) if (m) m.dispose();
      for (const c of this.env.clouds || []) c.dispose();
      if (this.env.hemi) this.env.hemi.dispose();
      if (this.env.dir) this.env.dir.dispose();
      this.env = null;
    }
  }

  loadWorld(id, at) {
    // town UI cannot follow you into a dungeon
    if (this.panels) { this.panels.close(); this.panels.closeDialog(); }
    if (this.ui) this.ui.dialogOpen = false;
    this.clearWorld();
    if (id === 'overworld') this.world = buildOverworld(this);
    else this.world = buildDungeon(this, DUNGEON_BY_ID[id]);

    this.env = setupEnvironment(this.scene, this.world.biome, {
      clouds: id === 'overworld',
      indoor: !!this.world.indoor,
      hemi: this.world.indoor ? 0.54 : 0.66,
      sun: this.world.indoor ? 0.44 : 0.9,
    });

    if (id === 'overworld') this.spawnOverworld();
    else this.spawnDungeon(this.world.def);

    const sp = at || this.world.spawn;
    this.player.setPos(sp.x, sp.z);
    this.player.movePath = null; this.player.moveTarget = null; this.player.attackTarget = null;
    this.player.clearTelegraph && this.player.clearTelegraph();
    this.cam.snap = true;
    this.ui.el.area.textContent = this.world.name;
    this.ui.buildSkillBar();
    this.ui.refreshBeltIcons();
    if (!this.progress.discovered.includes(id)) this.progress.discovered.push(id);
    this.saveGame();
  }

  spawnOverworld() {
    for (const def of NPCS) this.npcs.push(new Npc(this, def));
    const rng = this.items.rng;
    this.spawnAnchors = [];
    for (const camp of OVERWORLD.camps) {
      const lvl = clamp(2 + Math.round(Math.hypot(camp.x, camp.z) / 22), 2, 14);
      this.spawnAnchors.push({ x: camp.x, z: camp.z, monsters: camp.monsters, count: camp.count, lvl });
      for (let i = 0; i < camp.count; i++) {
        const a = rng.next() * Math.PI * 2, d = 2 + rng.next() * 9;
        const x = camp.x + Math.sin(a) * d, z = camp.z + Math.cos(a) * d;
        if (this.world.grid.solidAt(x, z)) continue;
        this.spawnEnemy(rng.pick(camp.monsters), x, z, { level: lvl + rng.int(-1, 1) });
      }
    }
    // a few wanderers on the roads
    for (let i = 0; i < 10; i++) {
      const a = rng.next() * Math.PI * 2, d = 40 + rng.next() * 60;
      const x = Math.sin(a) * d, z = Math.cos(a) * d;
      if (this.world.grid.solidAt(x, z)) continue;
      this.spawnAnchors.push({ x, z, monsters: OVERWORLD.monsters, count: 1, lvl: 1 + rng.int(0, 6) });
      this.spawnEnemy(rng.pick(OVERWORLD.monsters), x, z, { level: 1 + rng.int(0, 6) });
    }
  }

  // Camps refill while the player is elsewhere, so the Vale never runs dry.
  respawnTick(dt) {
    if (this.world.id !== 'overworld' || !this.spawnAnchors) return;
    this.respawnT = (this.respawnT || 0) - dt;
    if (this.respawnT > 0) return;
    this.respawnT = 10;
    const p = this.player;
    const rng = this.items.rng;
    for (const a of this.spawnAnchors) {
      if (Math.hypot(a.x - p.x, a.z - p.z) < 36) continue;
      let live = 0;
      for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - a.x, e.z - a.z) < 18) live++;
      if (live >= Math.ceil(a.count * 0.5)) continue;
      for (let i = live; i < a.count; i++) {
        const ang = rng.next() * Math.PI * 2, d = 2 + rng.next() * 9;
        const x = a.x + Math.sin(ang) * d, z = a.z + Math.cos(ang) * d;
        if (this.world.grid.solidAt(x, z)) continue;
        const e = this.spawnEnemy(rng.pick(a.monsters), x, z, { level: a.lvl + rng.int(-1, 1), aggro: false });
        if (e) e.homeless = true;
      }
    }
  }

  spawnDungeon(def) {
    const rng = this.items.rng;
    const w = this.world;
    const n = w.spawnPoints.length;
    for (let i = 0; i < n; i++) {
      const [x, z] = w.spawnPoints[i];
      const lvl = rng.int(def.level[0], def.level[1]);
      const elite = rng.chance(0.08);
      const e = this.spawnEnemy(rng.pick(def.monsters), x, z, { level: lvl, elite });
      if (e) e.spawnRoom = i;
    }
    for (const c of w.chests) {
      c.opened = false;
      c.node = buildChest(this.scene, c.quality ? '#7a5a2a' : '#5a4228', 1, w.root);
      c.node.position.set(c.x, 0, c.z);
      c.node.rotation.y = rng.next() * 6.28;
      for (const m of c.node.getChildMeshes()) m.isPickable = false;
    }
    for (const s of w.shrines) {
      s.used = false;
      s.node = buildProp(this.scene, 'shrine', BIOMES[def.biome].prop, 1.1, w.root);
      s.node.position.set(s.x, 0, s.z);
      const l = this.makeLight('#7fd08a', 9, 0.9);
      l.position.set(s.x, 2, s.z);
      w.lights.push(l);
    }
    if (def.boss) {
      const [bx, bz] = w.bossPoint;
      const boss = this.spawnEnemy(def.boss, bx, bz, { level: def.level[1] });
      if (boss) { boss.ai = 'sleep'; }
    }
    this.log(def.blurb || def.name, 'sys');
  }

  roomsCleared() {
    const w = this.world;
    if (!w || !w.rooms) return 0;
    let cleared = 0;
    for (const r of w.rooms) {
      const cx = w.grid.originX + r.cx, cz = w.grid.originZ + r.cz;
      let any = false;
      for (const e of this.enemies) {
        if (e.dead || e.removed) continue;
        if (e.x >= cx - r.w / 2 && e.x <= cx + r.w / 2 && e.z >= cz - r.d / 2 && e.z <= cz + r.d / 2) { any = true; break; }
      }
      if (!any) cleared++;
    }
    return cleared;
  }

  // ---- interaction ---------------------------------------------------------
  findInteractable() {
    const p = this.player;
    let best = null, bd = 1e9;
    const consider = (x, z, r, obj) => {
      const d = dist(p.x, p.z, x, z);
      if (d <= r && d < bd) { bd = d; best = obj; }
    };
    for (const n of this.npcs) consider(n.x, n.z, n.interactRadius, { kind: 'npc', label: 'Talk — ' + n.name, npc: n });
    for (const c of (this.world.chests || [])) {
      if (c.opened) continue;
      consider(c.x, c.z, 2.3, { kind: 'chest', label: 'Open chest', chest: c });
    }
    for (const s of (this.world.shrines || [])) {
      if (s.used) continue;
      consider(s.x, s.z, 2.4, { kind: 'shrine', label: 'Touch the shrine', shrine: s });
    }
    for (const ex of this.world.exits) consider(ex.x, ex.z, ex.radius + 0.6, { kind: 'exit', label: ex.label, exit: ex });
    return best;
  }

  interact() {
    const it = this.findInteractable();
    if (!it) return;
    if (it.kind === 'npc') this.panels.talk(it.npc);
    else if (it.kind === 'chest') this.openChest(it.chest);
    else if (it.kind === 'shrine') this.useShrine(it.shrine);
    else if (it.kind === 'exit') this.useExit(it.exit);
  }

  openChest(c) {
    c.opened = true;
    if (c.node && c.node.userData && c.node.userData.lid) {
      const lid = c.node.userData.lid;
      lid.rotation.x = -1.5;
      lid.position.z = -0.3;
    }
    const lvl = this.world.def ? this.world.def.level[1] : 6;
    this.items.chestLoot(c.x, c.z, lvl, c.quality || 0);
    sfx('loot');
    this.quests.onChest(this.world.id);
    this.log('You open the chest.', 'sys');
  }

  useShrine(s) {
    s.used = true;
    const st = this.player.state.stats;
    this.player.hp = st.maxHp;
    this.player.mana = st.maxMana;
    this.player.stamina = st.maxStamina;
    this.fx.ring(s.x, s.z, 2.4, '#8fd08a', 1.2);
    this.fx.pillar(s.x, s.z, '#8fd08a', 1.2);
    sfx('shrine');
    this.log('The shrine fills you with warmth.', 'good');
  }

  useExit(ex) {
    if (ex.leave) {
      const back = { x: ex.fromX != null ? ex.fromX : 0, z: ex.fromZ != null ? ex.fromZ : 20 };
      this.loadWorld('overworld', back);
      return;
    }
    const def = DUNGEON_BY_ID[ex.dungeonId];
    if (!def) return;
    this.returnPoint = { x: ex.x, z: ex.z + 2 };
    this.log('Entering ' + def.name + '…', 'sys');
    sfx('portal');
    this.loadWorld(def.id);
    for (const e of this.world.exits) { e.fromX = this.returnPoint.x; e.fromZ = this.returnPoint.z; }
  }

  healPlayer() {
    const st = this.player.state.stats;
    this.player.hp = st.maxHp;
    this.player.mana = st.maxMana;
    this.player.stamina = st.maxStamina;
    sfx('spell');
    this.log('You are healed.', 'good');
  }

  shopStock(npc) {
    const key = npc.def.id + ':' + Math.floor(this.player.state.level / 2);
    let s = this._shops.get(key);
    if (!s) {
      s = this.items.shopStock(npc.def.id, this.player.state.level, npc.def.stock && npc.def.stock.slots);
      this._shops.set(key, s);
    }
    return s;
  }

  questStateFor(npc) { return this.quests.stateFor(npc); }
  acceptQuest(id) { return this.quests.accept(id); }
  completeQuest(id) { return this.quests.complete(id); }

  // ---- casting -------------------------------------------------------------
  castSkillAtCursor(id) {
    if (!this.started || this.paused || this.player.dead) return;
    const aim = this.cam.pickGround(mouse.x, mouse.y) || { x: this.player.x + Math.sin(this.player.facing) * 5, z: this.player.z + Math.cos(this.player.facing) * 5 };
    const target = this.nearestEnemy(aim.x, aim.z, 3.5);
    if (!this.skills.cast(id, aim.x, aim.z, target)) sfx('deny');
  }

  // ---- save ----------------------------------------------------------------
  saveGame() {
    if (!this.started || !this.player) return false;
    const ok = writeSave({
      v: 1,
      seed: this.runSeed,
      char: this.player.state,
      progress: this.progress,
      stats: this.stats,
      world: { id: this.world.id, x: this.player.x, z: this.player.z },
      time: this.time,
      playTime: this.playTime,
      won: this.won,
    });
    if (ok) this.logOnce('saved:' + Math.floor(this.time / 30), 'Game saved.', 'sys');
    return ok;
  }

  loadGame() {
    const s = readSave();
    if (!s) return false;
    this.runSeed = s.seed || this.runSeed;
    this.progress = s.progress || this.progress;
    this.stats = s.stats || this.stats;
    this.playTime = s.playTime || 0;
    this.won = !!s.won;
    this.startWith(s.char, s.world);
    this.log('Save loaded.', 'sys');
    return true;
  }

  // ---- start / restart -----------------------------------------------------
  startWith(charState, worldInfo) {
    recompute(charState);
    if (!this.player) {
      this.player = new Player(this, charState);
      this.ui = new UI(this);
      this.panels = new Panels(this, this.ui);
      this.bindUi();
    } else {
      this.player.state = charState;
      this.player.resyncVitals();
      this.player.refreshGear();
    }
    this.started = true;
    this.paused = false;
    this.dead = false;
    this.ui.dialogOpen = false;
    $('titleScreen').classList.add('hidden');
    $('deathScreen').classList.add('hidden');
    $('pauseMenu').classList.add('hidden');
    this.loadWorld((worldInfo && worldInfo.id) || 'overworld', worldInfo ? { x: worldInfo.x, z: worldInfo.z } : null);
    this.ui.log('Welcome to ' + this.world.name + '.', 'sys');
    this.ui.refreshBeltIcons();
  }

  newGame(classId) {
    const st = newCharacter(classId);
    const kit = CLASSES[classId];
    // starting skills: first skill of the class is free
    st.skills[kit.skills[0]] = 1;
    recompute(st);
    this.runSeed = (Math.random() * 1e9) | 0;
    this.progress = { quests: {}, dungeonsCleared: [], discovered: [] };
    this.stats = { kills: 0, parrys: 0, deaths: 0, casts: 0, goldFound: 0, damageDealt: 0, damageTaken: 0 };
    this._shops.clear();
    this.startWith(st, null);
    this.log(`You arrive in Emberfall as a ${kit.name}.`, 'sys');
    this.saveGame();
  }

  playerDied() {
    this.stats.deaths++;
    this.dead = true;
    this.paused = true;
    const lost = Math.floor(this.player.state.gold * 0.1);
    this.player.state.gold -= lost;
    $('deathText').textContent = lost > 0
      ? `You left ${lost} gold on the ground. The town healer dragged you back.`
      : 'The town healer dragged you back.';
    $('deathScreen').classList.remove('hidden');
    this.saveGame();
  }

  respawn() {
    this.dead = false;
    this.paused = false;
    $('deathScreen').classList.add('hidden');
    this.player.dead = false;
    this.player.setState('idle');
    this.player.resyncVitals();
    this.loadWorld('overworld', null);
    const st = this.player.state.stats;
    this.player.hp = st.maxHp; this.player.mana = st.maxMana; this.player.stamina = st.maxStamina;
  }

  // End of the main chain: show the epilogue with the run's tally.
  victory() {
    if (this.won) return;
    this.won = true;
    sfx('win');
    const st = this.player.state;
    const mins = Math.floor(this.playTime / 60), secs = Math.floor(this.playTime % 60);
    $('victoryText').textContent =
      `${(CLASSES[st.classId] || {}).name || 'Adventurer'} — level ${st.level}. The Ember Lord is dead; the Wards hold another season.`;
    const rows = [
      ['Time in the Vale', `${mins}m ${String(secs).padStart(2, '0')}s`],
      ['Monsters slain', this.stats.kills],
      ['Parries', this.stats.parrys],
      ['Gold found', this.stats.goldFound],
      ['Damage dealt', Math.round(this.stats.damageDealt)],
      ['Damage taken', Math.round(this.stats.damageTaken)],
      ['Deaths', this.stats.deaths],
      ['Dungeons cleared', `${this.progress.dungeonsCleared.length} / 5`],
    ];
    $('victoryStats').innerHTML = rows.map((r) => `<li><span>${r[0]}</span><b>${r[1]}</b></li>`).join('');
    $('victoryScreen').classList.remove('hidden');
    this.paused = true;
    this.saveGame();
  }

  // ---- input ---------------------------------------------------------------
  handleInput() {
    const p = this.player;
    if (wasPressed('Escape')) {
      if (this.panels.openName) this.panels.close();
      else if (this.ui.dialogOpen) this.panels.closeDialog();
      else this.togglePause();
    }
    if (this.paused) return;
    if (wasPressed('F5')) { this.saveGame(); this.toast('Game saved'); }
    if (wasPressed('Tab')) this.panels.toggle('character');
    if (wasPressed('KeyI')) this.panels.toggle('inventory');
    if (wasPressed('KeyK')) this.panels.toggle('skills');
    if (wasPressed('KeyM')) this.panels.toggle('map');
    if (wasPressed('KeyY')) this.cam.orbit(-0.6);
    if (wasPressed('KeyX')) this.cam.orbit(0.6);
    const wheel = consumeMouse();
    if (wheel) this.cam.zoom(wheel);

    const uiBlocked = this.panels.openName || this.ui.dialogOpen;
    if (wasPressed('KeyE') && !uiBlocked) this.interact();
    if (wasPressed('KeyA')) p.drink(0);
    if (wasPressed('KeyS')) p.drink(1);
    if (wasPressed('Space') && !uiBlocked) {
      const aim = this.cam.pickGround(mouse.x, mouse.y);
      let dx = aim ? aim.x - p.x : 0, dz = aim ? aim.z - p.z : 0;
      if (Math.hypot(dx, dz) < 0.5) { dx = Math.sin(p.facing); dz = Math.cos(p.facing); }
      p.tryRoll(dx, dz);
    }
    for (let i = 0; i < 6; i++) {
      if (wasPressed('Digit' + (i + 1))) {
        const slot = this.ui.skillSlots && Object.keys(this.ui.skillSlots)[i];
        if (slot) this.castSkillAtCursor(slot);
      }
    }

    if (uiBlocked) { p.setBlocking(false); return; }

    // block / parry on right mouse hold
    p.setBlocking(mouse.rdown);

    if (mouse.down || consumeClick()) {
      const g = this.cam.pickGround(mouse.x, mouse.y);
      if (g) {
        this.lastAim = g;
        const e = this.nearestEnemy(g.x, g.z, 1.6);
        if (e) p.orderAttack(e);
        else p.orderMove(g.x, g.z);
      }
    }
  }

  togglePause() {
    if (!this.started) return;
    this.paused = !this.paused;
    $('pauseMenu').classList.toggle('hidden', !this.paused);
    if (this.paused) clearAll();
  }

  bindUi() {
    $('btnResume').onclick = () => this.togglePause();
    $('btnSave').onclick = () => { this.saveGame(); this.toast('Game saved'); };
    $('btnQuit').onclick = () => location.reload();
    $('btnRespawn').onclick = () => this.respawn();
    const keep = $('btnVictoryKeep'), toTitle = $('btnVictoryTitle');
    if (keep) keep.onclick = () => { $('victoryScreen').classList.add('hidden'); this.paused = false; };
    if (toTitle) toTitle.onclick = () => location.reload();
    this.bindSettings();
  }

  bindSettings() {
    const s = this.settings;
    const vol = $('setVolume'), mute = $('setMute'), music = $('setMusic'), dmg = $('setDmg'), shake = $('setShake');
    if (!vol) return;
    vol.value = String(Math.round(s.volume * 100));
    mute.checked = !!s.muted; music.checked = !!s.music; dmg.checked = !!s.dmgNums; shake.checked = !!s.shake;
    vol.oninput = () => { s.volume = (+vol.value) / 100; setVolume(s.volume); this.saveSettings(); };
    mute.onchange = () => { s.muted = mute.checked; this.applySettings(); this.saveSettings(); if (!s.muted) sfx('click'); };
    music.onchange = () => { s.music = music.checked; this.applySettings(); this.saveSettings(); if (s.music && this.started) this.musicTick(); };
    dmg.onchange = () => { s.dmgNums = dmg.checked; this.saveSettings(); };
    shake.onchange = () => { s.shake = shake.checked; this.saveSettings(); };
  }

  // ---- frame ---------------------------------------------------------------
  // Only the handful of point lights nearest the player stay on: keeps the
  // per-mesh light budget honest and the frame time sane.
  cullLights() {
    const w = this.world;
    if (!w || !w.lights || !w.lights.length) return;
    const px = this.player.x, pz = this.player.z;
    const list = w.lights.map((l) => ({ l, d: (l.position.x - px) ** 2 + (l.position.z - pz) ** 2 }));
    list.sort((a, b) => a.d - b.d);
    for (let i = 0; i < list.length; i++) list[i].l.setEnabled(i < 4);
  }

  step(dt) {
    this.time += dt;
    this.playTime += dt;
    this.musicTick();
    this.handleInput();
    if (this.paused) return;

    this.player.update(dt);
    if (this.player.dead && !this.dead) this.playerDied();

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt, this.player);
      if (e.removed) { e.dispose(); this.enemies.splice(i, 1); }
    }
    for (const n of this.npcs) n.update(dt);
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const it = this.pickups[i];
      it.update(dt, this.player);
      if (it.removed) this.pickups.splice(i, 1);
    }
    this.proj.update(dt);
    this.skills.update(dt);
    this.fx.update(dt);
    this.lightT = (this.lightT || 0) - dt;
    if (this.lightT <= 0) { this.lightT = 0.3; this.cullLights(); }
    this.respawnTick(dt);
    this.cam.update(dt, this.player);
    this.ui.update(dt);

    // interact prompt
    const it = this.findInteractable();
    if (it) this.ui.showInteract('[E] ' + it.label);
    else this.ui.hideInteract();

    // quest tracker
    if (this.time - (this._qt || 0) > 0.5) {
      this._qt = this.time;
      this.ui.el.quests.innerHTML = this.quests.trackerHtml();
      if (this.panels.openName === 'map') this.panels.drawMapCanvas();
    }

    // autosave
    this.saveTimer += dt;
    if (this.saveTimer > 25) { this.saveTimer = 0; this.saveGame(); }
  }

  startLoop() {
    this.engine.runRenderLoop(() => {
      const dt = Math.min(0.05, this.engine.getDeltaTime() / 1000);
      this.dt = dt;
      if (this.started) this.step(dt);
      if (this.scene.activeCamera) this.scene.render();
      // edge-triggered key presses live for a few frames, so a key that arrives
      // while we are still rendering is picked up by the next frame instead of
      // being swallowed.
      endFrame();
    });
    window.addEventListener('resize', () => this.engine.resize());
  }
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
function buildTitle(game) {
  const sel = $('classSelect');
  let chosen = 'warrior';
  sel.innerHTML = CLASS_LIST.map((c) => `
    <div class="class-card" data-cls="${c.id}">
      <h3 style="color:${c.accent}">${c.name}</h3>
      <div class="role">${c.role}</div>
      <p>${c.desc}</p>
      <div class="stats">${c.stats}</div>
    </div>`).join('');
  const mark = () => sel.querySelectorAll('.class-card').forEach((el) => el.classList.toggle('sel', el.dataset.cls === chosen));
  sel.querySelectorAll('.class-card').forEach((el) => { el.onclick = () => { chosen = el.dataset.cls; mark(); }; });
  mark();

  const has = hasSave();
  $('btnLoad').classList.toggle('hidden', !has);
  $('btnWipe').classList.toggle('hidden', !has);
  $('btnStart').onclick = () => { sfx('click'); game.newGame(chosen); };
  $('btnLoad').onclick = () => { sfx('click'); if (!game.loadGame()) game.newGame(chosen); };
  $('btnWipe').onclick = () => { wipeSave(); $('btnLoad').classList.add('hidden'); $('btnWipe').classList.add('hidden'); };
}

const game = new Game();
window.GAME = game;
game.audio = { musicBed, startMusic, stopMusic, setVolume, getVolume, setMuted, isMuted };
initInput(game.canvas, (k, e) => {
  if (k === 'KeyM' && game.started) e.preventDefault();
});
buildTitle(game);
game.startLoop();

// headless / automated start
const params = new URLSearchParams(location.search);
if (params.get('auto')) {
  const cls = params.get('auto');
  setTimeout(() => game.newGame(CLASSES[cls] ? cls : 'warrior'), 50);
}
if (params.get('mute') !== null) setMuted(true);

window.addEventListener('keydown', (e) => { if (e.code === 'KeyF1') setMuted(!isMuted()); });
game.ready = true;
