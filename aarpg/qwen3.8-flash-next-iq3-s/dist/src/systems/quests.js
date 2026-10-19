// Quest state machine.
import { QUESTS, QUEST_LIST } from '../data/quests.js';
import { NPCS } from '../data/npcs.js';
import { generateItem } from '../data/items.js';
import { ALL_MONSTERS } from '../data/monsters.js';
import { RNG } from '../core/rng.js';

export class QuestSystem {
  constructor(game) { this.game = game; }

  st(id) {
    if (!this.game.progress.quests[id]) this.game.progress.quests[id] = { status: 'offer', progress: 0 };
    return this.game.progress.quests[id];
  }

  mainDone(id) {
    const q = QUESTS[id];
    if (!q || !q.next) return true;
    return this.st(q.next).status === 'done';
  }

  available(npcId) {
    const lvl = this.game.player.level;
    const out = [];
    for (const q of QUEST_LIST) {
      if (q.giver !== npcId) continue;
      const s = this.st(q.id);
      if (s.status === 'done' || s.status === 'active' || s.status === 'ready') continue;
      if (lvl < q.level) continue;
      if (q.main) {
        // main chain: only offer the first unfinished main quest
        const prev = QUEST_LIST.find((x) => x.next === q.id);
        if (prev && this.st(prev.id).status !== 'done') continue;
      }
      out.push(q);
    }
    return out;
  }

  // What this NPC currently wants to talk about.
  stateFor(npc) {
    const talkable = QUEST_LIST.filter((q) => q.giver === npc.def.id);
    for (const q of talkable) {
      const s = this.st(q.id);
      if (s.status === 'ready') return { quest: q, status: 'ready' };
    }
    for (const q of talkable) {
      const s = this.st(q.id);
      if (s.status === 'active') return { quest: q, status: 'active', progress: s.progress };
    }
    const off = this.available(npc.def.id);
    if (off.length) return { quest: off[0], status: 'offer' };
    return null;
  }

  accept(id) {
    const s = this.st(id);
    s.status = 'active';
    s.progress = 0;
    this.game.log('Quest accepted: ' + QUESTS[id].name, 'sys');
    this.game.ui.toast('Quest: ' + QUESTS[id].name);
    this.game.saveGame();
  }

  complete(id) {
    const q = QUESTS[id];
    const s = this.st(id);
    s.status = 'done';
    const p = this.game.player.state;
    p.gold += q.reward.gold;
    this.game.stats.goldFound += q.reward.gold;
    const levels = this.game.gainXp(q.reward.xp);
    if (q.reward.item) {
      const rng = new RNG(RNG.hash(id + this.game.runSeed));
      const it = generateItem(rng, q.reward.item.ilvl, {
        slot: q.reward.item.slot,
        rarity: q.reward.item.rarity != null ? q.reward.item.rarity : (q.main ? 2 : 1),
        classId: p.classId,
      });
      if (!this.game.items.addToInventory(it)) this.game.spawnItem(it, this.game.player.x, this.game.player.z, { pop: true });
      else this.game.log(`Received ${it.displayName}`, 'loot');
    }
    this.game.log(`Quest complete: ${q.name} (+${q.reward.gold}g, +${q.reward.xp}xp)`, 'good');
    this.game.ui.toast('Quest complete: ' + q.name);
    this.game.saveGame();
    if (q.main && !q.next) this.game.victory();
    return levels;
  }

  onKill(monsterId, area) {
    for (const id in this.game.progress.quests) {
      const q = QUESTS[id];
      const s = this.game.progress.quests[id];
      if (s.status !== 'active') continue;
      const o = q.objective;
      if (o.type === 'killBoss') {
        if (o.target === monsterId) { s.status = 'ready'; this.game.log(`${q.name}: objective complete`, 'good'); }
        continue;
      }
      if (o.target !== monsterId) continue;
      if (o.area && o.area !== area) continue;
      s.progress++;
      if (o.type === 'killCount' && s.progress >= o.count) { s.status = 'ready'; this.game.log(`${q.name}: objective complete`, 'good'); }
    }
  }

  onChest(area) {
    for (const id in this.game.progress.quests) {
      const q = QUESTS[id];
      const s = this.game.progress.quests[id];
      if (s.status !== 'active') continue;
      const o = q.objective;
      if (o.type !== 'chest') continue;
      if (o.area && o.area !== area) continue;
      s.progress++;
      if (s.progress >= (o.count || 1)) { s.status = 'ready'; this.game.log(`${q.name}: objective complete`, 'good'); }
    }
  }

  trackerHtml() {
    let html = '';
    let hinted = false;
    for (const q of QUEST_LIST) {
      const s = this.st(q.id);
      if (s.status === 'done') { html += `<div class="q done">✓ ${q.name}</div>`; continue; }
      if (s.status === 'offer') {
        // only tease the next step of the main chain, once
        if (hinted || !q.main) continue;
        const prev = QUEST_LIST.find((x) => x.next === q.id);
        if (prev && this.st(prev.id).status !== 'done') continue;
        if (this.game.player.level < q.level) continue;
        const npc = NPCS.find((n) => n.id === q.giver);
        html += `<div class="q dim"><b>${q.name}</b>ask ${npc ? npc.name : 'the folk of town'}</div>`;
        hinted = true;
        continue;
      }
      let obj = '';
      if (q.objective.type === 'killCount') obj = `${Math.min(s.progress, q.objective.count)}/${q.objective.count}`;
      else if (q.objective.type === 'chest') obj = `${Math.min(s.progress, q.objective.count || 1)}/${q.objective.count || 1}`;
      else obj = s.status === 'ready' ? 'Return to town' : 'Slay ' + bossName(q.objective.target);
      html += `<div class="q"><b>${q.name}</b>${obj}</div>`;
    }
    return html || '<div class="q">No quests. Talk to people in town.</div>';
  }
}

function bossName(id) {
  return (ALL_MONSTERS[id] && ALL_MONSTERS[id].name) || id;
}
