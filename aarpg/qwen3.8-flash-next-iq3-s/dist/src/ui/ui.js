// HUD: orbs, bars, skill bar, float text, minimap, tooltip, log.
import { SKILLS } from '../data/skills.js';
import { xpToNext } from '../systems/progression.js';
import { itemDisplayName, RARITY, itemValue, SLOT_LABEL } from '../data/items.js';
import { itemIcon } from './icons.js';
import { clamp } from '../core/math.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(game) {
    this.game = game;
    this.el = {
      hp: $('hpText'), mp: $('mpText'),
      hpOrb: document.querySelector('#orbHealth .orb-fill'),
      mpOrb: document.querySelector('#orbMana .orb-fill'),
      stam: $('staminaFill'),
      xpFill: $('xpBarFill'), xpText: $('xpText'), points: $('pointBadge'),
      gold: $('goldText'),
      skillBar: $('skillBar'), beltBar: $('beltBar'),
      log: $('logFeed'), minimap: $('minimap'), area: $('areaName'),
      quests: $('questTracker'), interact: $('interactPrompt'), toast: $('toastCenter'),
      parryFlash: $('parryFlash'), dmgFlash: $('dmgFlash'),
      bossBar: $('bossBar'), bossName: $('bossName'), bossFill: $('bossFill'),
      tooltip: $('tooltip'), levelUp: $('levelUpBanner'),
    };
    this.mctx = this.el.minimap.getContext('2d');
    this.floats = [];
    this.inventoryDirty = true;
    this.skillDirty = true;
    this.buffIcons = {};
    this.buffRow = document.createElement('div');
    this.buffRow.style.cssText = 'position:absolute;left:18px;bottom:350px;display:flex;gap:4px';
    $('hud').appendChild(this.buffRow);
    this.buildSkillBar();
    this.buildBelt();
    this.logTimers = [];
  }

  // ---- bars ---------------------------------------------------------------
  update(dt) {
    const p = this.game.player;
    if (!p) return;
    const s = p.state.stats;
    this.el.hp.textContent = Math.max(0, Math.round(p.hp)) + '/' + Math.round(s.maxHp);
    this.el.mp.textContent = Math.max(0, Math.round(p.mana)) + '/' + Math.round(s.maxMana);
    this.el.hpOrb.style.height = clamp(p.hp / s.maxHp * 100, 0, 100) + '%';
    this.el.mpOrb.style.height = clamp(p.mana / s.maxMana * 100, 0, 100) + '%';
    this.el.stam.style.width = clamp(p.stamina / s.maxStamina * 100, 0, 100) + '%';
    const need = xpToNext(p.state.level);
    this.el.xpFill.style.width = clamp(p.state.xp / need * 100, 0, 100) + '%';
    this.el.xpText.textContent = `Level ${p.state.level} — ${Math.round(p.state.xp)} / ${need} xp`;
    // nudge the player to spend what they earned
    const fs = p.state.freeSkills, fa = p.state.freeAttrs;
    if (fs || fa) {
      const bits = [];
      if (fs) bits.push(`${fs} skill point${fs === 1 ? '' : 's'}`);
      if (fa) bits.push(`${fa} attribute point${fa === 1 ? '' : 's'}`);
      this.el.points.textContent = '✦ ' + bits.join(' • ') + (fs ? ' — press K' : ' — press Tab');
      this.el.points.classList.remove('hidden');
      this.el.points.onclick = () => this.game.panels.open(fs ? 'skills' : 'character');
    } else this.el.points.classList.add('hidden');
    this.el.gold.textContent = p.state.gold;

    // skill cooldown masks
    for (const id in this.skillSlots) {
      const slot = this.skillSlots[id];
      const cd = p.cooldowns[id] || 0;
      const max = SKILLS[id].cd || 1;
      const rank = p.skillRank(id);
      slot.classList.toggle('locked', !rank);
      slot.classList.toggle('cool', cd > 0);
      const mask = slot.querySelector('.cdmask');
      const txt = slot.querySelector('.cdtxt');
      if (cd > 0) { mask.style.display = 'block'; mask.style.height = (cd / max * 100) + '%'; txt.textContent = cd.toFixed(1); }
      else { mask.style.display = 'none'; txt.textContent = ''; }
    }
    // belt counts
    for (let i = 0; i < 5; i++) {
      const slot = this.beltSlots[i];
      const b = p.state.belt[i];
      slot.querySelector('.cnt').textContent = b ? b.count : '';
      slot.classList.toggle('locked', !b);
    }
    this.drawMinimap();
    this.updateFloats();
    const bo = this.game.boss;
    const boDist = bo && this.game.player ? Math.hypot(bo.x - this.game.player.x, bo.z - this.game.player.z) : 999;
    if (bo && !bo.dead && (boDist < 26 || bo.state === 'attack' || bo.hp < bo.maxHp)) {
      this.el.bossBar.classList.remove('hidden');
      this.el.bossName.textContent = this.game.boss.name + '  —  lvl ' + this.game.boss.level;
      this.el.bossFill.style.width = clamp(this.game.boss.hp / this.game.boss.maxHp * 100, 0, 100) + '%';
    } else this.el.bossBar.classList.add('hidden');
  }

  buildSkillBar() {
    this.skillSlots = {};
    const bar = this.el.skillBar;
    bar.innerHTML = '';
    const p = this.game.player.state;
    const list = Object.keys(SKILLS).filter((k) => SKILLS[k].class === p.classId && SKILLS[k].kind === 'active');
    list.slice(0, 6).forEach((id, i) => {
      const s = SKILLS[id];
      const d = document.createElement('div');
      d.className = 'slot';
      d.dataset.skill = id;
      d.innerHTML = `<span class="key">${i + 1}</span><div class="ico">${itemIcon(s.icon || 'spell')}</div><div class="cdmask"></div><div class="cdtxt"></div>`;
      d.onclick = () => this.game.castSkillAtCursor(id);
      d.onmouseenter = (e) => this.showSkillTip(e, id);
      d.onmouseleave = () => this.hideTip();
      bar.appendChild(d);
      this.skillSlots[id] = d;
    });
  }

  buildBelt() {
    this.beltSlots = [];
    const bar = this.el.beltBar;
    bar.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const d = document.createElement('div');
      d.className = 'slot';
      d.innerHTML = `<span class="key">${i === 0 ? 'A' : i === 1 ? 'S' : i + 1}</span><div class="ico">${itemIcon('flask')}</div><span class="cnt"></span>`;
      d.onclick = () => this.game.player.drink(i);
      bar.appendChild(d);
      this.beltSlots.push(d);
    }
  }

  refreshBeltIcons() {
    for (let i = 0; i < 5; i++) {
      const b = this.game.player.state.belt[i];
      const ico = this.beltSlots[i].querySelector('.ico');
      ico.innerHTML = b ? itemIcon(b.id === 'hp' || b.id === 'mp' || b.id === 'st' ? 'flask' : 'torch') : '';
      this.beltSlots[i].classList.toggle('locked', !b);
    }
  }

  // ---- float text ----------------------------------------------------------
  floatText(x, y, z, text, color, kind = 'dmg') {
    if (this.floats.length > 40) return;
    // "damage numbers" off: keep the words (PARRY!, STAGGER), drop the figures
    const s = this.game.settings;
    if (s && s.dmgNums === false && /^[-+]?[\d,.]/.test(String(text))) return;
    const d = document.createElement('div');
    d.textContent = text;
    d.style.cssText = `position:absolute;pointer-events:none;font-weight:700;text-shadow:0 2px 3px #000;color:${color};` +
      `font-size:${kind === 'big' ? 22 : kind === 'small' ? 11 : 15}px;left:0;top:0;transition:none`;
    $('hud').appendChild(d);
    this.floats.push({ el: d, x, y, z, t: 0, life: kind === 'small' ? 0.9 : 1.15, dx: (Math.random() - 0.5) * 26 });
  }

  updateFloats() {
    const scene = this.game.scene;
    const engine = scene.getEngine();
    const vp = scene.activeCamera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    const B = window.BABYLON;
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.t += this.game.dt;
      const k = f.t / f.life;
      if (k >= 1) { f.el.remove(); this.floats.splice(i, 1); continue; }
      const p = B.Vector3.Project(new B.Vector3(f.x, f.y + k * 1.1, f.z), B.Matrix.Identity(), scene.getTransformMatrix(), vp);
      if (p.z < 0 || p.z > 1) { f.el.style.display = 'none'; continue; }
      f.el.style.display = 'block';
      f.el.style.transform = `translate(${p.x + f.dx * k}px, ${p.y}px)`;
      f.el.style.opacity = String(1 - k * k);
    }
  }

  // ---- log / toast ---------------------------------------------------------
  log(msg, cls = '') {
    const d = document.createElement('div');
    d.className = cls;
    d.textContent = msg;
    this.el.log.appendChild(d);
    while (this.el.log.childNodes.length > 7) this.el.log.removeChild(this.el.log.firstChild);
    setTimeout(() => { if (d.parentNode) d.style.opacity = '0.45'; }, 6000);
    setTimeout(() => { if (d.parentNode) d.remove(); }, 14000);
  }

  toast(msg, ms = 2200) {
    this.el.toast.textContent = msg;
    this.el.toast.classList.remove('hidden');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => this.el.toast.classList.add('hidden'), ms);
  }

  levelUp(text) {
    this.el.levelUp.textContent = text;
    this.el.levelUp.classList.remove('hidden');
    clearTimeout(this._luT);
    this._luT = setTimeout(() => this.el.levelUp.classList.add('hidden'), 2600);
  }

  showInteract(text) { this.el.interact.textContent = text; this.el.interact.classList.remove('hidden'); }
  hideInteract() { this.el.interact.classList.add('hidden'); }

  dmgFlash(i) {
    this.el.dmgFlash.classList.remove('hidden');
    this.el.dmgFlash.style.opacity = String(clamp(i, 0.1, 0.9));
    clearTimeout(this._dfT);
    this._dfT = setTimeout(() => this.el.dmgFlash.classList.add('hidden'), 160);
  }

  parryFlash() {
    this.el.parryFlash.classList.remove('hidden');
    this.el.parryFlash.style.opacity = '1';
    clearTimeout(this._pfT);
    this._pfT = setTimeout(() => this.el.parryFlash.classList.add('hidden'), 180);
  }

  goldBump() {
    this.el.gold.style.color = '#fff2b0';
    clearTimeout(this._gbT);
    this._gbT = setTimeout(() => { this.el.gold.style.color = ''; }, 250);
  }

  flashItem() {
    this.el.gold.parentElement.style.outline = '1px solid #d9b56a';
    clearTimeout(this._fiT);
    this._fiT = setTimeout(() => { this.el.gold.parentElement.style.outline = ''; }, 300);
  }

  addBuffIcon(id, dur) {
    if (this.buffIcons[id]) { this.buffIcons[id].t = dur; return; }
    const d = document.createElement('div');
    d.style.cssText = 'width:34px;height:34px;background:rgba(20,18,15,.85);border:1px solid #8a7328;border-radius:4px;display:flex;align-items:center;justify-content:center';
    d.innerHTML = itemIcon(SKILLS[id] ? SKILLS[id].icon || 'spell' : 'spell');
    this.buffRow.appendChild(d);
    this.buffIcons[id] = { el: d, t: dur };
  }

  removeBuffIcon(id) {
    const b = this.buffIcons[id];
    if (b) { b.el.remove(); delete this.buffIcons[id]; }
  }

  // ---- tooltip -------------------------------------------------------------
  showTip(e, html) {
    const t = this.el.tooltip;
    t.innerHTML = html;
    t.classList.remove('hidden');
    const pad = 14;
    const w = t.offsetWidth, h = t.offsetHeight;
    let x = e.clientX + pad, y = e.clientY + pad;
    if (x + w > window.innerWidth - 8) x = e.clientX - w - pad;
    if (y + h > window.innerHeight - 8) y = window.innerHeight - h - 8;
    t.style.left = x + 'px';
    t.style.top = y + 'px';
  }

  hideTip() { this.el.tooltip.classList.add('hidden'); }

  showSkillTip(e, id) {
    const s = SKILLS[id];
    const rank = Math.max(1, this.game.player.skillRank(id));
    this.showTip(e, `<div class="t-name">${s.name}</div><div class="t-sub">${s.kind} • rank ${rank}/${s.maxRank}</div>` +
      `<div>${typeof s.desc === 'function' ? s.desc(rank) : s.desc || ''}</div>` + (s.mana ? `<hr><div class="t-mod">${s.mana} mana</div>` : '') +
      (s.stam ? `<div class="t-mod">${s.stam} stamina</div>` : '') +
      (s.cd ? `<div class="t-mod">${s.cd}s cooldown</div>` : ''));
  }

  itemTip(item, extra = '') {
    const r = RARITY[item.rarity || 0];
    const name = itemDisplayName(item);
    let html = `<div class="t-name r-${r.key}">${name}</div><div class="t-sub">${SLOT_LABEL[item.slot] || item.slot} • Item Level ${item.ilvl || 1}${item.rarity ? ' • ' + r.name : ''}</div>`;
    const st = item.stats || {};
    if (st.armor) html += `<div>Armour: <b>${st.armor}</b></div>`;
    if (st.block) html += `<div>Chance to Block: <b>${st.block}%</b></div>`;
    if (item.weapon) html += `<div>Damage: <b>${st.dmgMin} - ${st.dmgMax}</b> &nbsp; Speed: <b>${st.speed}</b></div>`;
    if (item.mods) for (const k in item.mods) html += `<div class="t-mod">+${item.mods[k]} ${k.replace(/([A-Z])/g, ' $1').toLowerCase()}</div>`;
    if (item.desc) html += `<hr><div class="t-mod" style="color:#e0a050">${item.desc}</div>`;
    if (item.req) {
      const p = this.game.player.state.attrs;
      for (const k in item.req) if (p[k] < item.req[k]) html += `<div class="t-req">Requires ${k.toUpperCase()} ${item.req[k]}</div>`;
    }
    if (item.consumable) html += `<div class="t-mod">${describeConsumable(item.consumable)}</div>`;
    html += `<hr><div class="t-price">${itemValue(item)} gold</div>${extra}`;
    return html;
  }

  // ---- minimap -------------------------------------------------------------
  drawMinimap() {
    if (!this.game.world) return;
    const ctx = this.mctx;
    const W = this.el.minimap.width, H = this.el.minimap.height, R = 30, sc = W / (R * 2);
    ctx.clearRect(0, 0, W, H);
    const indoor = !!this.game.world.indoor;
    ctx.fillStyle = indoor ? 'rgba(12,11,10,0.75)' : 'rgba(24,38,22,0.8)';
    ctx.fillRect(0, 0, W, H);
    const p = this.game.player;
    const g = this.game.world.grid;
    // walls
    const [pcx, pcz] = g.cellOf(p.x, p.z);
    const rc = R;
    ctx.fillStyle = 'rgba(150,140,120,0.55)';
    for (let dz = -rc; dz <= rc; dz++) {
      for (let dx = -rc; dx <= rc; dx++) {
        const cx = pcx + dx, cz = pcz + dz;
        if (!g.inBounds(cx, cz)) continue;
        const v = g.get(cx, cz);
        if (v === 0) continue;
        const [wx, wz] = g.center(cx, cz);
        const sx = W / 2 + (wx - p.x) * sc, sy = H / 2 + (wz - p.z) * sc;
        if (sx < -4 || sy < -4 || sx > W + 4 || sy > H + 4) continue;
        ctx.fillStyle = v === 2 ? 'rgba(40,90,140,0.7)' : (indoor ? 'rgba(150,140,120,0.5)' : 'rgba(96,110,78,0.75)');
        ctx.fillRect(sx - sc / 2, sy - sc / 2, sc + 0.6, sc + 0.6);
      }
    }
    const dot = (x, z, color, size = 3) => {
      const sx = W / 2 + (x - p.x) * sc, sy = H / 2 + (z - p.z) * sc;
      if (sx < 0 || sy < 0 || sx > W || sy > H) return;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(sx, sy, size, 0, 6.3); ctx.fill();
    };
    for (const e of this.game.enemies) {
      if (e.dead || e.removed) continue;
      if (Math.hypot(e.x - p.x, e.z - p.z) > R) continue;
      dot(e.x, e.z, e.boss ? '#ff4040' : e.elite ? '#c060e0' : '#d05040', e.boss ? 5 : 3);
    }
    for (const it of this.game.pickups) {
      if (it.removed || Math.hypot(it.x - p.x, it.z - p.z) > R) continue;
      dot(it.x, it.z, it.kind === 'gold' ? '#ffd24a' : ['#cfc7b6', '#6fa8dc', '#f0d060', '#f08a2c'][it.payload && it.payload.rarity || 0], 2.5);
    }
    for (const ex of this.game.world.exits) dot(ex.x, ex.z, '#7fd0e8', 4);
    for (const n of (this.game.npcs || [])) dot(n.x, n.z, '#e8e0c8', 3);
    for (const c of (this.game.world.chests || [])) dot(c.x, c.z, c.opened ? '#666' : '#d9b56a', 3.5);
    for (const s of (this.game.world.shrines || [])) dot(s.x, s.z, '#8fd08a', 3.5);
    // player arrow
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-p.facing);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(4, 5); ctx.lineTo(0, 2.5); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

function describeConsumable(id) {
  if (id === 'hp') return 'Restores 60 health';
  if (id === 'mp') return 'Restores 45 mana';
  if (id === 'st') return 'Restores 60 stamina';
  return '';
}
