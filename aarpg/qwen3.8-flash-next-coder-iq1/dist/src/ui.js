// DOM UI: HUD, panels (inventory / character / shops / quests), minimap, dialogs.
import { S } from './state.js';
import { U } from './util.js';
import { ITEMS as IT } from './items.js';
import { C } from './classes.js';
import { STATS as ST } from './stats.js';

export const UI = {};

export let dom = {};
export const MAX_LOG = 6;

export function css() {
  const st = document.createElement('style');
  st.textContent = `
  *{box-sizing:border-box}
  #ui{position:fixed;inset:0;pointer-events:none;z-index:50;font-family:system-ui,'Segoe UI',sans-serif;}
  .panel{position:absolute;pointer-events:auto;background:rgba(14,16,20,.93);border:1px solid #4a4436;border-radius:6px;color:#e8e2d2;font-size:13px;line-height:1.35;box-shadow:0 6px 18px rgba(0,0,0,.6)}
  .panel h2{color:#d9c48a;font-size:15px;letter-spacing:.06em;margin:10px 12px 4px}
  .dim{color:#9a9280}.hi{color:#f0e6c8}.bad{color:#e06a52}.good{color:#78c07a}.gold{color:#e8c469}
  .bar{position:relative;height:14px;background:#1b1e24;border:1px solid #3a3f48;border-radius:3px;overflow:hidden}
  .bar>i{position:absolute;inset:0;transform-origin:left center}
  #hud{position:absolute;left:16px;top:14px;width:250px}
  .hpbar{position:relative;height:16px;background:#1b1e24;border:1px solid #3a3f48;border-radius:3px;overflow:hidden;margin:2px 0}
  .hpbar>i{position:absolute;left:0;top:0;bottom:0}
  #skills{position:absolute;left:0;right:0;bottom:16px;display:flex;gap:8px;justify-content:center;align-items:center}
  .sk{width:52px;height:52px;border-radius:8px;background:rgba(20,22,28,.9);border:1px solid #55503f;color:#e8e2d2;font-size:11px;text-align:center;line-height:1.1;position:relative;overflow:hidden}
  .sk>i{position:absolute;left:0;top:0;bottom:0;background:rgba(0,0,0,.62)}
  .sk.on{border-color:#c9a24a}
  .sk.off{opacity:.45}
  #log{position:absolute;left:16px;bottom:96px;width:420px;color:#d8cfb8;font-size:13px}
  .line{display:block;margin:0 0 3px}
  #toast{position:absolute;left:0;right:0;top:16%;text-align:center;color:#f0e6c8;font-size:22px;letter-spacing:.05em;text-shadow:0 2 6 rgba(0,0,0,.8)}
  #minimap{position:absolute;right:16px;top:14px;width:180px;height:150px;background:rgba(8,10,14,.75);border:1px solid #4a4436;border-radius:4px}
  #bag{position:absolute;left:16px;top:120px;width:330px;max-height:60vh;overflow:auto}
  #char{position:absolute;right:210px;top:14px;width:300px;max-height:80vh;overflow:auto}
  #shop{position:absolute;left:0;right:0;top:0;bottom:0;display:none}
  #title{position:absolute;left:0;right:0;top:0;bottom:0;display:none}
  #end{position:absolute;left:0;right:0;top:0;bottom:0;display:none}
  .btn{display:inline-block;padding:6px 12px;background:#2a2e36;border:1px solid #6a6046;border-radius:4px;color:#e8e2d2;cursor:pointer;font-size:13px}
  .btn:hover{background:#3a3f48}
  .row{display:block;margin:4px 0}
  .item{display:block;margin:5px 0;padding:4px 8px;background:rgba(30,32,38,.8);border:1px solid #3f3a2e;border-radius:4px;cursor:pointer}
  .item:hover{background:rgba(48,46,40,.9)}
  .rar{font-size:11px;letter-spacing:.08em}
  #hint{position:absolute;left:0;right:0;bottom:74px;text-align:center;color:#c9c0a8;font-size:13px}
  `;
  document.head.appendChild(st);
}

export function build() {
  css();
  const ui = document.createElement('div');
  ui.id = 'ui';
  document.body.appendChild(ui);
  dom.ui = ui;
  dom.hud = mk('div', 'hud');
  dom.hud.innerHTML = '<div class="hpbar"><i style="width:100%;background:linear-gradient(#e05a4a,#8a2a22)"></i></div>' +
    '<div class="hpbar"><i style="width:100%;background:linear-gradient(#6ac0e8,#2a6a8a)"></i></div>' +
    '<div class="hpbar"><i style="width:100%;background:linear-gradient(#e8c469,#8a6a2a)"></i></div>' +
    '<div class="hpbar"><i style="width:100%;background:linear-gradient(#78c07a,#2a6a3a)"></i></div>' +
    '<div class="dim" style="font-size:11px">Lv 1 · 0 XP</div>';
  dom.bars = [dom.hud.querySelector('div:nth-of-type(1)'), dom.hud.querySelector('div:nth-of-type(2)'), dom.hud.querySelector('div:nth-of-type(3)'), dom.hud.querySelector('div:nth-of-type(4)')];
  dom.xpLabel = dom.hud.querySelector('.dim');
  dom.skills = mk('div', 'skills');
  dom.log = mk('div', 'log');
  dom.toast = mk('div', 'toast');
  dom.hint = mk('div', 'hint');
  dom.bag = mk('div', 'bag');
  dom.char = mk('div', 'char');
  dom.shop = mk('div', 'shop');
  dom.title = mk('div', 'title');
  dom.end = mk('div', 'end');
  dom.minimap = document.createElement('canvas');
  dom.minimap.id = 'minimap';
  dom.minimap.width = 180; dom.minimap.height = 150;
  dom.mmCtx = dom.minimap.getContext('2d');
  ui.appendChild(dom.minimap);
  for (const k of ['hud', 'skills', 'log', 'toast', 'hint', 'bag', 'char', 'shop', 'title', 'end']) ui.appendChild(dom[k]);
  dom.logLines = [];
  return dom;
}
function mk(tag, id) { const d = document.createElement(tag); d.id = id; return d; }

export function skillBar(cls) {
  dom.skills.innerHTML = '';
  const list = C.hotSkills(cls);
  dom.skEls = [];
  for (const sk of list) {
    const el = document.createElement('div');
    el.className = 'sk';
    const inner = document.createElement('i');
    el.appendChild(inner);
    el.dataset.key = sk.key;
    el.textContent = sk.name;
    dom.skills.appendChild(el);
    dom.skEls.push({ sk, el, inner });
  }
}

export function updateHud(p, s) {
  if (!dom.bars) return;
  const hp = Math.max(0, p.hp) / s.maxHp;
  const mn = Math.max(0, p.mana) / s.maxMana;
  const gd = Math.max(0, p.stamina) / s.maxStamina;
  const xp = p.level >= ST.MAX_LEVEL ? 1 : Math.min(1, p.xp / ST.xpForLevel(p.level));
  const w = [hp * 100, mn * 100, gd * 100, xp * 100];
  for (let i = 0; i < 4; i++) {
    const bar = dom.bars[i];
    if (!bar) continue;
    bar.firstElementChild.style.width = w[i] + '%';
  }
  if (dom.xpLabel) dom.xpLabel.textContent = 'Lv ' + p.level + ' · ' + p.xp + '/' + ST.xpForLevel(p.level) + ' XP · ' + p.gold + 'g';
  if (dom.skEls) {
    for (const r of dom.skEls) {
      const cd = S.player.cooldowns[r.sk.id] || 0;
      const k = Math.min(1, cd / r.sk.cd);
      r.inner.style.width = (k * 100) + '%';
      r.inner.style.left = '0';
      const unlocked = (S.player.skillRanks?.[r.sk.id] || 0) > 0 && S.player.level >= r.sk.unlock;
      r.el.className = 'sk' + (unlocked ? (cd > 0 ? '' : ' on') : ' off');
    }
  }
}

export function log(msg, cls) {
  const el = document.createElement('div');
  el.className = 'line';
  if (cls) el.style.color = cls === 'good' ? '#78c07a' : cls === 'bad' ? '#e06a52' : cls === 'gold' ? '#e8c469' : null;
  el.textContent = msg;
  dom.log.appendChild(el);
  dom.logLines.push(el);
  while (dom.logLines.length > MAX_LOG) { const old = dom.logLines.shift(); old.remove(); }
  dom.log.style.opacity = '1';
  dom.logFade = 6;
}

export function toast(msg, ttl) {
  dom.toast.textContent = msg;
  dom.toast.style.opacity = '1';
  dom.toastTtl = ttl || 3.2;
}

export function fadeUi(dt) {
  if (dom.logFade > 0) { dom.logFade -= dt; if (dom.logFade <= 0) dom.log.style.opacity = '0.25'; }
  if (dom.toastTtl > 0) { dom.toastTtl -= dt; if (dom.toastTtl <= 0) dom.toast.style.opacity = '0'; }
  if (dom.hintTtl > 0) { dom.hintTtl -= dt; if (dom.hintTtl <= 0) dom.hint.style.opacity = '0'; }
}
export function hint(msg, ttl) { dom.hint.textContent = msg; dom.hint.style.opacity = '1'; dom.hintTtl = ttl || 4; }

// ---------- minimap ----------
export function drawMinimap(z, px, pz) {
  const ctx = dom.mmCtx;
  if (!ctx || !z) return;
  const scale = 2.4;
  const cxp = px / S.cell, czp = pz / S.cell;
  ctx.clearRect(0, 0, 180, 150);
  const half = { x: 180 / 2 / scale, z: 150 / 2 / scale };
  const x0 = Math.floor(cxp - half.x) - 1, x1 = Math.ceil(cxp + half.x) + 1;
  const y0 = Math.floor(czp - half.z) - 1, y1 = Math.ceil(czp + half.z) + 1;
  for (let gy = y0; gy <= y1; gy++) {
    for (let gx = x0; gx <= x1; gx++) {
      if (gx < 0 || gy < 0 || gx >= z.w || gy >= z.h) continue;
      const ch = z.grid[gy][gx];
      let col = null;
      if (ch === '#') col = '#3a3733';
      else if (ch === 'T') col = '#25401f';
      else if (ch === 'r') col = '#4a463f';
      else if (ch === '~') col = '#1d3a55';
      else if (ch === 'W') col = '#7a2a15';
      else if (ch === 'x') col = '#2a5570';
      else if (ch === '+') col = '#4f4a3c';
      else if (ch === 'D') col = '#5a3a22';
      else col = '#2f3a28';
      const sx = (gx - cxp + half.x) * scale, sy = (gy - czp + half.z) * scale;
      ctx.fillStyle = col;
      ctx.fillRect(sx, sy, scale + 0.5, scale + 0.5);
    }
  }
  for (const e of z.enemies) {
    if (e.dead) continue;
    const sx = (e.x / S.cell - cxp + half.x) * scale, sy = (e.z / S.cell - czp + half.z) * scale;
    if (sx < 0 || sy < 0 || sx > 180 || sy > 150) continue;
    ctx.fillStyle = e.boss ? '#ff5a3a' : '#c94b3a';
    ctx.beginPath(); ctx.arc(sx, sy, e.boss ? 3.5 : 2, 0, 6.283); ctx.fill();
  }
  for (const c of z.chests) { if (c.opened) continue; const sx = (c.x / S.cell - cxp + half.x) * scale, sy = (c.z / S.cell - czp + half.z) * scale; ctx.fillStyle = '#e8c469'; ctx.fillRect(sx - 2, sy - 2, 4, 4); }
  for (const ex of z.exits) { const sx = (ex.x / S.cell - cxp + half.x) * scale, sy = (ex.z / S.cell - czp + half.z) * scale; ctx.fillStyle = '#6ad0ff'; ctx.fillRect(sx - 2.5, sy - 2.5, 5, 5); }
  ctx.fillStyle = '#f4f0dc';
  ctx.beginPath(); ctx.arc(90, 75, 3, 0, 6.283); ctx.fill();
  ctx.strokeStyle = 'rgba(240,230,200,.5)';
  ctx.beginPath(); ctx.moveTo(90, 75);
  ctx.lineTo(90 + Math.sin(S.p?.facing || 0) * 9, 75 + Math.cos(S.p?.facing || 0) * 9);
  ctx.stroke();
}

// ---------- inventory ----------
export function renderBag() {
  const p = S.player;
  let html = '<h2>Pack</h2>';
  for (const slot in p.equip) {
    const it = p.equip[slot];
    if (!it) continue;
    html += '<div class="item" data-slot="' + slot + '"><span class="rar" style="color:' + it.color + '">' + it.rarity + '</span> <b>' + it.name + '</b> <span class="dim">' + slot + '</span></div>';
  }
  const n = p.bag.length;
  html += '<div class="dim">Bag ' + n + '/24</div>';
  for (let i = 0; i < n; i++) {
    const it = p.bag[i];
    html += '<div class="item" data-bag="' + i + '" style="border-color:' + it.color + '44"><span class="rar" style="color:' + it.color + '">' + it.rarity + '</span> <b>' + it.name + '</b> <span class="dim">' + it.slot + ' · il' + it.il + '</span></div>';
  }
  dom.bag.innerHTML = html;
  dom.bag.style.display = 'block';
}

export function renderChar() {
  const p = S.player, s = p.stats;
  let html = '<h2>' + C.CLASS_META[p.cls].name + ' · Level ' + p.level + '</h2>';
  html += '<div class="row dim">STR ' + s.str + ' · DEX ' + s.dex + ' · INT ' + s.int + ' · VIT ' + s.vit + '</div>';
  html += '<div class="row dim">Life ' + Math.max(0, Math.round(p.hp)) + '/' + s.maxHp + ' · Mana ' + Math.max(0, Math.round(p.mana)) + '/' + s.maxMana + ' · Stamina ' + Math.max(0, Math.round(p.stamina)) + '/' + s.maxStamina + '</div>';
  html += '<div class="row dim">Armor ' + s.armor + ' · Block ' + Math.round(s.block * 100) + '% · Parry ' + Math.round(s.parryWindow * 100) + '% · Crit ' + Math.round(s.crit) + '% · Dodge ' + Math.round(s.dodge) + '%</div>';
  html += '<div class="row dim">Damage ' + Math.round(ST.attackPower(p, s)) + ' · Move ' + Math.round(s.moveSpeed * 100) + '% · Lifesteal ' + Math.round(s.lifesteal * 100) + '%</div>';
  html += '<div class="row gold">Points: ' + p.attrPoints + ' attributes · ' + p.skillPoints + ' skills</div>';
  html += '<div class="row dim">Kills ' + p.kills + ' · Deaths ' + p.deaths + ' · Gold ' + p.gold + '</div>';
  html += '<h2 class="dim">Skills</h2>';
  for (const sk of C.SKILLS[p.cls]) {
    const rk = p.skillRanks?.[sk.id] || 0;
    const can = p.level >= sk.unlock;
    html += '<div class="row ' + (rk ? 'hi' : can ? 'gold' : 'dim') + '">' + (sk.key || '·') + ' · ' + sk.name + ' · rank ' + rk + '/' + sk.maxRank + (can && !rk ? ' (ready)' : '') + '</div>';
  }
  html += '<div class="row"><span class="btn" data-act="attr">Spend attribute</span> <span class="btn" data-act="skill">Spend skill</span></div>';
  dom.char.innerHTML = html;
  dom.char.style.display = 'block';
}

// ---------- shops ----------
export function renderShop(stock, title, npcName) {
  let html = '<h2>' + title + '</h2><div class="dim">' + npcName + ': “Stocked for the season. Nothing here is cheap.”</div>';
  for (let i = 0; i < stock.length; i++) {
    const it = stock[i];
    html += '<div class="item" data-buy="' + i + '" style="border-color:' + it.color + '55"><span class="rar" style="color:' + it.color + '">' + it.rarity + '</span> <b>' + it.name + '</b> <span class="dim">' + it.slot + '</span><br><span class="dim">' + IT.itemTooltip(it).split('\n').slice(1).join(' · ') + '</span> <span class="gold">' + it.value + 'g</span></div>';
  }
  html += '<div class="row"><span class="btn" data-act="close">Leave</span></div>';
  dom.shop.innerHTML = html;
  dom.shop.style.display = 'block';
}

export const UI_EXPORTS = { css, build, skillBar, updateHud, log, toast, hint, fadeUi, drawMinimap, renderBag, renderChar, renderShop, dom };

UI.css = css; UI.build = build; UI.skillBar = skillBar; UI.updateHud = updateHud;
UI.log = log; UI.toast = toast; UI.fadeUi = fadeUi; UI.hint = hint; UI.drawMinimap = drawMinimap;
UI.renderBag = renderBag; UI.renderChar = renderChar; UI.renderShop = renderShop;
Object.defineProperty(UI, 'dom', { get: () => dom, configurable: true });
