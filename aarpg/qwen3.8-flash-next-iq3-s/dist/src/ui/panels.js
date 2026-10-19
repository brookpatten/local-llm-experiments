// Panels: inventory, character, skills, shop, map, dialogue.
import { SKILLS } from '../data/skills.js';
import { SLOTS, SLOT_LABEL, RARITY, itemDisplayName, itemValue, canEquip } from '../data/items.js';
import { CLASSES } from '../data/classes.js';
import { canLearn, learnSkill, spendAttr, equipItem, unequipItem, armorReduction } from '../systems/progression.js';
import { itemIcon } from './icons.js';
import { sfx } from '../core/audio.js';
import { CONSUMABLES } from '../data/items.js';

const $ = (id) => document.getElementById(id);

export class Panels {
  constructor(game, ui) {
    this.game = game;
    this.ui = ui;
    this.openName = null;
    this.shopNpc = null;
    for (const id of ['inventoryPanel', 'characterPanel', 'skillsPanel', 'shopPanel', 'mapPanel']) {
      $(id).addEventListener('mouseleave', (e) => { if (e.target === $(id)) ui.hideTip(); });
    }
  }

  toggle(name) {
    if (this.openName === name) return this.close();
    this.open(name);
  }

  close() {
    for (const id of ['inventoryPanel', 'characterPanel', 'skillsPanel', 'shopPanel', 'mapPanel']) $(id).classList.add('hidden');
    $('panels').classList.add('hidden');
    this.openName = null;
    this.ui.hideTip();
  }

  open(name) {
    this.close();
    if (!name) return;
    $('panels').classList.remove('hidden');
    $(name + 'Panel').classList.remove('hidden');
    this.openName = name;
    if (name === 'inventory') this.renderInventory();
    if (name === 'character') this.renderCharacter();
    if (name === 'skills') this.renderSkills();
    if (name === 'map') this.renderMap();
    if (name === 'shop' && this.shopNpc) this.renderShop();
  }

  header(title, extra = '') {
    return `<span class="close" data-close="1">✕</span><h2>${title}</h2>${extra}`;
  }

  // ---- inventory -----------------------------------------------------------
  renderInventory() {
    const p = this.game.player.state;
    const el = $('inventoryPanel');
    const dollSlots = [
      ['head', 89, 10], ['amulet', 89, 72], ['chest', 89, 134],
      ['mainHand', 18, 106], ['offHand', 160, 106],
      ['hands', 18, 198], ['legs', 89, 202], ['feet', 89, 264],
      ['ring1', 18, 264], ['ring2', 160, 264],
    ];
    let html = this.header('Inventory', `<div class="inv-head"><div style="font-size:12px;color:#9c8f74">${p.inventory.length}/50 items • ${p.gold} gold</div></div>`);
    html += '<div style="display:flex;gap:14px"><div class="doll">';
    for (const [slot, x, y] of dollSlots) {
      const it = p.equipment[slot];
      html += `<div class="eq ${it ? 'b-r-' + RARITY[it.rarity || 0].key : 'empty'}" data-eq="${slot}" data-hint="${SLOT_LABEL[slot]}" style="left:${x}px;top:${y}px">${it ? itemIcon(it.gfx) : ''}</div>`;
    }
    html += '</div><div style="flex:1">';
    html += '<div class="inv-grid">';
    for (let i = 0; i < 50; i++) {
      const it = p.inventory[i];
      if (!it) { html += '<div class="inv-cell empty"></div>'; continue; }
      html += `<div class="inv-cell b-r-${RARITY[it.rarity || 0].key}" data-inv="${i}">${itemIcon(it.gfx)}${it.consumable ? '<span style="position:absolute;bottom:1px;right:3px;font-size:9px;color:#ffd98a">use</span>' : ''}</div>`;
    }
    html += '</div><div style="margin-top:8px;font-size:11px;color:#8b8270">Click to equip • Right-click to sell • Consumables are used on click</div>';
    html += '</div></div>';
    el.innerHTML = html;

    el.querySelectorAll('[data-inv]').forEach((c) => {
      const i = +c.dataset.inv;
      const it = p.inventory[i];
      c.onmouseenter = (e) => this.ui.showTip(e, this.ui.itemTip(it));
      c.onmousemove = (e) => this.ui.showTip(e, this.ui.itemTip(it));
      c.onmouseleave = () => this.ui.hideTip();
      c.onclick = () => { this.useOrEquip(i); };
      c.oncontextmenu = (e) => { e.preventDefault(); this.sellFromInventory(i); };
    });
    el.querySelectorAll('[data-eq]').forEach((c) => {
      const slot = c.dataset.eq;
      const it = p.equipment[slot];
      if (!it) return;
      c.onmouseenter = (e) => this.ui.showTip(e, this.ui.itemTip(it));
      c.onmousemove = (e) => this.ui.showTip(e, this.ui.itemTip(it));
      c.onmouseleave = () => this.ui.hideTip();
      c.onclick = () => { unequipItem(p, slot); sfx('equip'); this.game.player.refreshGear(); this.renderInventory(); this.ui.inventoryDirty = true; };
    });
    el.querySelector('.close').onclick = () => this.close();
  }

  useOrEquip(invIndex) {
    const p = this.game.player.state;
    const it = p.inventory[invIndex];
    if (!it) return;
    if (it.consumable) {
      const beltIdx = p.belt.findIndex((b) => b && b.id === it.consumable);
      if (beltIdx >= 0) { p.belt[beltIdx].count = Math.min(10, p.belt[beltIdx].count + 1); }
      else {
        const empty = p.belt.findIndex((b) => !b);
        if (empty >= 0) p.belt[empty] = { id: it.consumable, count: 1 };
        else { this.game.log('No free belt slot — drop something first', 'bad'); return; }
      }
      p.inventory.splice(invIndex, 1);
      sfx('loot');
      this.ui.refreshBeltIcons();
      this.renderInventory();
      return;
    }
    const r = equipItem(p, it);
    if (!r.ok) { this.game.log(`Cannot equip: ${r.why}`, 'bad'); sfx('deny'); return; }
    sfx('equip');
    this.game.player.refreshGear();
    this.game.player.resyncVitals();
    this.ui.inventoryDirty = true;
    this.renderInventory();
  }

  sellFromInventory(i) {
    const p = this.game.player.state;
    const it = p.inventory[i];
    if (!it) return;
    const v = itemValue(it);
    p.inventory.splice(i, 1);
    p.gold += v;
    this.game.log(`Sold ${itemDisplayName(it)} for ${v} gold`, 'loot');
    sfx('gold');
    this.ui.goldBump();
    this.renderInventory();
  }

  // ---- character -----------------------------------------------------------
  renderCharacter() {
    const p = this.game.player.state;
    const s = p.stats;
    const cls = CLASSES[p.classId];
    const el = $('characterPanel');
    const row = (k, v) => `<div class="statline"><span>${k}</span><span>${v}</span></div>`;
    let html = this.header(`${cls.name} — Level ${p.level}`);
    html += row('Class', cls.name);
    html += row('Experience', p.level >= 40 ? 'MAX' : Math.round(p.xp) + ' xp');
    html += row('Health', `${Math.round(s.maxHp)}`);
    html += row('Mana', `${Math.round(s.maxMana)}`);
    html += row('Stamina', `${Math.round(s.maxStamina)}`);
    html += row('Weapon damage', `${s.dmgMin} - ${s.dmgMax}`);
    html += row('Attack speed', s.attackRate.toFixed(2) + '/s');
    html += row('Spell power', Math.round(s.spellPower));
    html += row('Armour', s.armor + ` (${Math.round(armorReduction(s.armor, p.level) * 100)}% reduction)`);
    html += row('Block chance', s.blockChance + '%');
    html += row('Crit chance', s.crit.toFixed(1) + '%');
    html += row('Dodge chance', s.dodge.toFixed(1) + '%');
    html += row('Life steal', s.lifeSteal + '%');
    html += row('Thorns', s.thorns);
    html += row('Move speed', '+' + Math.round((s.moveSpeed - 1) * 100) + '%');
    html += '<div class="section-title">Attributes (' + p.freeAttrs + ' unspent)</div>';
    for (const k of ['str', 'dex', 'int', 'vit']) {
      html += `<div class="attr-row"><span>${k.toUpperCase()} — ${attrHint(k)}</span><span>${p.attrs[k]} <button class="plus" data-attr="${k}" ${p.freeAttrs ? '' : 'disabled'}>+</button></span></div>`;
    }
    html += `<div class="section-title">Run stats</div>`;
    const st = this.game.stats;
    html += row('Kills', st.kills) + row('Parries', st.parrys) + row('Deaths', st.deaths) + row('Gold found', st.goldFound)
      + row('Damage dealt', Math.round(st.damageDealt || 0)) + row('Damage taken', Math.round(st.damageTaken || 0));
    el.innerHTML = html;
    el.querySelectorAll('[data-attr]').forEach((b) => {
      b.onclick = () => { spendAttr(p, b.dataset.attr); sfx('equip'); this.renderCharacter(); this.game.player.resyncVitals(); };
    });
    el.querySelector('.close').onclick = () => this.close();
  }

  // ---- skills --------------------------------------------------------------
  renderSkills() {
    const p = this.game.player.state;
    const el = $('skillsPanel');
    const cls = CLASSES[p.classId];
    const ids = Object.keys(SKILLS).filter((k) => SKILLS[k].class === p.classId);
    const act = ids.filter((k) => SKILLS[k].kind === 'active');
    const pas = ids.filter((k) => SKILLS[k].kind === 'passive');
    const points = `${p.freeSkills} skill point${p.freeSkills === 1 ? '' : 's'} unspent • level ${p.level}`
      + (p.freeSkills > 0 ? ' • click a lit card to spend one' : '');
    let html = this.header(`${cls.name} Skills`, `<div style="font-size:12px;color:#9c8f74;margin-bottom:8px">${points}</div>`);
    const card = (id) => {
      const s = SKILLS[id];
      const rank = p.skills[id] || 0;
      const c = canLearn(p, id);
      const need = s.reqLevel[Math.min(rank, s.reqLevel.length - 1)];
      const mastered = rank >= s.maxRank;
      const why = c.ok || mastered ? ''
        : c.why === 'no skill points' ? 'No skill points left'
        : c.why.startsWith('requires') ? `Unlocks at level ${need}` : c.why;
      return `<div class="skill-card ${mastered ? 'max' : ''} ${c.ok ? 'ready' : 'locked'}" data-skill="${id}">
        <div class="rank">${rank}/${s.maxRank}</div>
        <div class="sk-ico">${itemIcon(s.icon)}</div>
        <h4>${s.name}</h4>
        <div class="tag">${s.kind === 'active' ? (s.mana ? s.mana + ' mana' : s.stam ? s.stam + ' stamina' : 'no cost') + (s.cd ? ' • ' + s.cd + 's cd' : '') : 'passive'}</div>
        <p>${typeof s.desc === 'function' ? s.desc(Math.max(1, rank)) : s.desc || ''}</p>
        ${mastered ? '' : `<p style="color:#6fa8dc">Rank ${rank + 1} needs level ${need}</p>`}
        ${c.ok ? `<button class="shop-buy" data-learn="${id}" style="margin-top:6px">Learn</button>` : (why ? `<p class="sk-why">${why}</p>` : '')}
      </div>`;
    };
    html += '<div class="section-title">Active — hotbar 1-6</div><div class="skill-grid">' + act.map(card).join('') + '</div>';
    html += '<div class="section-title">Passive</div><div class="skill-grid">' + pas.map(card).join('') + '</div>';
    el.innerHTML = html;
    el.querySelectorAll('[data-learn]').forEach((b) => {
      b.onclick = (e) => {
        e.stopPropagation();
        const r = learnSkill(p, b.dataset.learn);
        if (r.ok) { sfx('spell'); this.game.log('Learned ' + SKILLS[b.dataset.learn].name, 'good'); this.game.ui.buildSkillBar(); this.renderSkills(); }
        else this.game.log(r.why, 'bad');
      };
    });
    el.querySelector('.close').onclick = () => this.close();
  }

  // ---- shop ----------------------------------------------------------------
  openShop(npc) {
    this.shopNpc = npc;
    this.open('shop');
  }

  renderShop() {
    const npc = this.shopNpc;
    const p = this.game.player.state;
    const el = $('shopPanel');
    const stock = this.game.shopStock(npc);
    let html = this.header(npc.def.name, `<div style="font-size:12px;color:#9c8f74;margin-bottom:8px">${npc.def.role} • your gold: <span style="color:#d9b56a">${p.gold}</span></div>`);
    html += '<div class="shop-cols"><div><div class="section-title">For sale</div><div class="shop-list">';
    stock.forEach((it, i) => {
      html += `<div class="inv-cell b-r-${RARITY[it.rarity || 0].key}" data-buy="${i}">${itemIcon(it.gfx)}<span style="position:absolute;bottom:1px;right:3px;font-size:9px;color:#ffd98a">${itemValue(it)}</span></div>`;
    });
    html += '</div></div><div><div class="section-title">Your goods (right-click to sell)</div><div class="shop-list">';
    p.inventory.forEach((it, i) => {
      html += `<div class="inv-cell b-r-${RARITY[it.rarity || 0].key}" data-sell="${i}">${itemIcon(it.gfx)}<span style="position:absolute;bottom:1px;right:3px;font-size:9px;color:#ffd98a">${itemValue(it)}</span></div>`;
    });
    html += '</div>';
    if (npc.def.stock && npc.def.stock.consumables) {
      html += '<div class="section-title">Supplies</div><div style="display:flex;gap:6px;flex-wrap:wrap">';
      for (const cid of npc.def.stock.consumables) {
        const c = CONSUMABLES[cid];
        html += `<button class="shop-buy" data-buyc="${cid}">${c.name} — ${c.price}g</button>`;
      }
      html += '</div>';
    }
    html += '</div></div>';
    el.innerHTML = html;

    el.querySelectorAll('[data-buy]').forEach((c) => {
      const i = +c.dataset.buy;
      const it = stock[i];
      c.onmouseenter = (e) => this.ui.showTip(e, this.ui.itemTip(it, '<div class="t-price">Click to buy</div>'));
      c.onmousemove = c.onmouseenter;
      c.onmouseleave = () => this.ui.hideTip();
      c.onclick = () => {
        const v = itemValue(it);
        if (p.gold < v) { this.game.log('Not enough gold', 'bad'); return; }
        if (p.inventory.length >= 50) { this.game.log('Pack is full', 'bad'); return; }
        p.gold -= v;
        p.inventory.push(it);
        stock.splice(i, 1);
        sfx('gold');
        this.game.log(`Bought ${itemDisplayName(it)} for ${v} gold`, 'loot');
        this.renderShop();
      };
    });
    el.querySelectorAll('[data-sell]').forEach((c) => {
      const i = +c.dataset.sell;
      const it = p.inventory[i];
      c.onmouseenter = (e) => this.ui.showTip(e, this.ui.itemTip(it, '<div class="t-price">Right-click to sell</div>'));
      c.onmousemove = c.onmouseenter;
      c.onmouseleave = () => this.ui.hideTip();
      c.oncontextmenu = (e) => { e.preventDefault(); this.sellFromInventory(i); this.renderShop(); };
      c.onclick = () => { this.useOrEquip(i); this.renderShop(); };
    });
    el.querySelectorAll('[data-buyc]').forEach((b) => {
      b.onclick = () => {
        const c = CONSUMABLES[b.dataset.buyc];
        if (p.gold < c.price) { this.game.log('Not enough gold', 'bad'); return; }
        const empty = p.belt.findIndex((x) => !x);
        const same = p.belt.findIndex((x) => x && x.id === c.id);
        if (same >= 0) { if (p.belt[same].count >= 10) { this.game.log('Belt slot full', 'bad'); return; } p.belt[same].count++; }
        else if (empty >= 0) p.belt[empty] = { id: c.id, count: 1 };
        else { this.game.log('No free belt slot', 'bad'); return; }
        p.gold -= c.price;
        sfx('gold');
        this.ui.refreshBeltIcons();
        this.renderShop();
      };
    });
    el.querySelector('.close').onclick = () => this.close();
  }

  // ---- map -----------------------------------------------------------------
  renderMap() {
    const el = $('mapPanel');
    const w = this.game.world;
    let html = this.header('Map — ' + w.name);
    if (w.id === 'overworld') {
      html += '<div style="font-size:12px;color:#c8bda4;line-height:1.6">';
      html += '<div class="section-title">Locations</div>';
      html += `• Town of Emberfall (0, 0)<br>`;
      for (const d of this.game.dungeonDefs) {
        const done = this.game.progress.dungeonsCleared.includes(d.id);
        html += `• ${d.name} (${d.pos.x}, ${d.pos.z}) — level ${d.level[0]}-${d.level[1]} ${done ? '<span style="color:#7f7">cleared</span>' : ''}<br>`;
      }
      html += '</div>';
      html += '<canvas id="mapCanvas" width="520" height="360" style="margin-top:10px;background:#100f0d;border:1px solid #3d362a;border-radius:4px"></canvas>';
    } else {
      html += '<div style="font-size:12px;color:#c8bda4">Rooms cleared: ' + this.game.roomsCleared() + '/' + (w.rooms ? w.rooms.length : 0) + '</div>';
      html += '<canvas id="mapCanvas" width="520" height="360" style="margin-top:10px;background:#100f0d;border:1px solid #3d362a;border-radius:4px"></canvas>';
    }
    el.innerHTML = html;
    this.drawMapCanvas();
    el.querySelector('.close').onclick = () => this.close();
  }

  drawMapCanvas() {
    const cv = $('mapCanvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const w = this.game.world;
    const p = this.game.player;
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (w.id === 'overworld') {
      const sc = 1.1;
      const ox = cv.width / 2 - p.x * sc, oz = cv.height / 2 - p.z * sc;
      ctx.fillStyle = '#22301c';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = '#2f5f8e';
      ctx.beginPath(); ctx.arc(62 * sc + ox, 58 * sc + oz, 26 * sc, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#6a5a3a';
      ctx.beginPath(); ctx.arc(ox, oz, 30 * sc, 0, 6.3); ctx.fill();
      for (const d of this.game.dungeonDefs) {
        ctx.fillStyle = '#c04a2a';
        ctx.beginPath(); ctx.arc(d.pos.x * sc + ox, d.pos.z * sc + oz, 6, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#e8dcc0';
        ctx.font = '10px sans-serif';
        ctx.fillText(d.name, d.pos.x * sc + ox + 8, d.pos.z * sc + oz + 3);
      }
      for (const c of (w.camps || [])) {
        ctx.fillStyle = '#8a6a3a';
        ctx.beginPath(); ctx.arc(c.x * sc + ox, c.z * sc + oz, 4, 0, 6.3); ctx.fill();
      }
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(cv.width / 2, cv.height / 2, 4, 0, 6.3); ctx.fill();
    } else {
      const g = w.grid;
      const sc = Math.min(cv.width / g.w, cv.height / g.h);
      const at = (x, z) => [(x - g.ox) / g.cell * sc, (z - g.oz) / g.cell * sc];
      ctx.fillStyle = '#17150f';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = '#463f33';
      for (let cz = 0; cz < g.h; cz++) {
        for (let cx = 0; cx < g.w; cx++) {
          if (g.get(cx, cz) !== 0) continue;
          ctx.fillRect(cx * sc, cz * sc, sc + 0.5, sc + 0.5);
        }
      }
      ctx.strokeStyle = 'rgba(217,181,106,0.45)';
      ctx.lineWidth = 1;
      for (const r of (w.rooms || [])) ctx.strokeRect(r.x * sc, r.z * sc, r.w * sc, r.d * sc);
      const mark = (x, z, color, s = 3) => {
        const [mx, mz] = at(x, z);
        ctx.fillStyle = color;
        ctx.fillRect(mx - s, mz - s, s * 2, s * 2);
      };
      for (const c of (w.chests || [])) mark(c.x, c.z, c.opened ? '#6a6152' : '#d9b56a');
      for (const s of (w.shrines || [])) mark(s.x, s.z, s.used ? '#4d6a4c' : '#7fd08a');
      if (w.portalPad) mark(w.portalPad.x, w.portalPad.z, '#7fd0e8', 4);
      if (w.bossPoint) mark(w.bossPoint.x, w.bossPoint.z, '#a03a2a', 4);
      for (const e of this.game.enemies) {
        if (e.dead || e.removed) continue;
        const [ex, ez] = at(e.x, e.z);
        ctx.fillStyle = e.boss ? '#ff5040' : '#c04a3a';
        ctx.beginPath(); ctx.arc(ex, ez, e.boss ? 4 : 2.2, 0, 6.3); ctx.fill();
      }
      const [px, pz] = at(p.x, p.z);
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(px, pz, 4, 0, 6.3); ctx.fill();
    }
  }

  // ---- dialogue ------------------------------------------------------------
  talk(npc) {
    const el = $('dialogPanel');
    const q = this.game.questStateFor(npc);
    let text = npc.def.lines[Math.floor(Math.random() * npc.def.lines.length)];
    if (q && q.status === 'offer') text = q.quest.desc;
    let opts = [];
    if (q) {
      if (q.status === 'offer') opts.push({ label: `Accept: ${q.quest.name}`, act: 'accept' });
      else if (q.status === 'ready') opts.push({ label: `Claim reward: ${q.quest.name}`, act: 'complete' });
      else if (q.status === 'active') opts.push({ label: 'Still not done.', act: 'close' });
      else if (q.status === 'done' && npc.def.quests && npc.def.quests.length) text = 'Your deeds are remembered.';
    }
    if (npc.def.stock) opts.push({ label: 'Let me see your wares.', act: 'shop' });
    if (npc.def.heal) opts.push({ label: 'Tend my wounds.', act: 'heal' });
    opts.push({ label: 'Farewell.', act: 'close' });

    el.innerHTML = `<div class="who">${npc.def.name}</div><div class="txt">${text}</div><div class="opts">` +
      opts.map((o, i) => `<button data-act="${o.act}" data-i="${i}">${o.label}</button>`).join('') + '</div>';
    el.classList.remove('hidden');
    this.dialogNpc = npc;
    el.querySelectorAll('button').forEach((b) => {
      b.onclick = () => {
        const act = b.dataset.act;
        if (act === 'close') this.closeDialog();
        else if (act === 'shop') { this.closeDialog(); this.openShop(npc); }
        else if (act === 'heal') { this.game.healPlayer(); this.closeDialog(); }
        else if (act === 'accept') { this.game.acceptQuest(q.quest.id); this.closeDialog(); }
        else if (act === 'complete') { this.game.completeQuest(q.quest.id); this.closeDialog(); }
      };
    });
    this.game.ui.dialogOpen = true;
  }

  closeDialog() {
    $('dialogPanel').classList.add('hidden');
    this.game.ui.dialogOpen = false;
  }
}

function attrHint(k) {
  return { str: 'melee damage', dex: 'bows, crit, dodge', int: 'mana and spell power', vit: 'health and stamina' }[k];
}
