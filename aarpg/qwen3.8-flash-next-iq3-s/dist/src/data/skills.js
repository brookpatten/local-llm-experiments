// Class-specific skills. `type` is interpreted by src/systems/skills.js
export const SKILLS = {
  // ---------------- WARRIOR ----------------
  cleave: {
    id: 'cleave', name: 'Cleave', type: 'meleeCone', class: 'warrior', kind: 'active', maxRank: 3,
    reqLevel: [1, 8, 18], icon: 'cleave', stam: 12, cd: 3.2, range: 3.4, cone: 1.5, scale: 1.1, base: 4,
    desc: (r) => `Sweep your weapon through a wide arc, hitting every foe within ${3.4}m for ${pct(110 + 25 * (r - 1))} of weapon damage.`,
  },
  charge: {
    id: 'charge', name: 'Savage Charge', type: 'charge', class: 'warrior', kind: 'active', maxRank: 3,
    reqLevel: [4, 14, 26], icon: 'charge', stam: 22, cd: 8, range: 11, scale: 0.9, base: 6, stun: 1.1,
    desc: (r) => `Rocket forward, knocking down and stunning the first enemy struck for ${pct(90 + 25 * (r - 1))} weapon damage.`,
  },
  whirlwind: {
    id: 'whirlwind', name: 'Whirlwind', type: 'whirl', class: 'warrior', kind: 'active', maxRank: 3,
    reqLevel: [8, 18, 30], icon: 'whirl', stam: 30, cd: 10, range: 4.2, scale: 0.75, base: 5, ticks: 4,
    desc: (r) => `Spin in a deadly circle for 1.4s, striking all nearby enemies ${4} times at ${pct(75 + 20 * (r - 1))} weapon damage each.`,
  },
  shieldwall: {
    id: 'shieldwall', name: 'Shield Wall', type: 'buff', class: 'warrior', kind: 'active', maxRank: 3,
    reqLevel: [6, 16, 28], icon: 'wall', mana: 20, cd: 16, duration: 8,
    buff: { armorPct: 25 + 10 * 0, block: 15, dmgTaken: -20 },
    desc: (r) => `Brace behind your shield for 8s: +${25 + 10 * (r - 1)}% armour, +15% block, take ${20 + 5 * (r - 1)}% less damage.`,
  },
  slam: {
    id: 'slam', name: 'Earth Shatter', type: 'groundSlam', class: 'warrior', kind: 'active', maxRank: 3,
    reqLevel: [10, 22, 34], icon: 'slam', stam: 28, cd: 9, range: 5.5, radius: 5.5, scale: 1.3, base: 10, stun: 1.4,
    desc: (r) => `Smash the ground, stunning enemies within ${5.5}m for 1.4s and dealing ${pct(130 + 30 * (r - 1))} weapon damage.`,
  },
  execute: {
    id: 'execute', name: 'Execute', type: 'execute', class: 'warrior', kind: 'active', maxRank: 3,
    reqLevel: [14, 26, 38], icon: 'execute', stam: 25, cd: 7, range: 3.6, scale: 2.2, base: 15,
    desc: (r) => `A brutal lunge that deals ${pct(220 + 60 * (r - 1))} weapon damage — triple damage to wounded foes below 25% life.`,
  },
  w_mastery: { id: 'w_mastery', name: 'Weapon Mastery', type: 'passive', class: 'warrior', kind: 'passive', maxRank: 5, reqLevel: [2, 10, 18, 26, 34], icon: 'sword', passive: { dmgPct: 6 }, desc: (r) => `+${6 * r}% damage with all weapons. Rank ${r}.` },
  w_hide: { id: 'w_hide', name: 'Iron Hide', type: 'passive', class: 'warrior', kind: 'passive', maxRank: 5, reqLevel: [3, 12, 21, 30, 38], icon: 'shield', passive: { armorPct: 8, hp: 12 }, desc: (r) => `+${8 * r}% armour and +${12 * r} life. Rank ${r}.` },
  w_shield: { id: 'w_shield', name: 'Shield Mastery', type: 'passive', class: 'warrior', kind: 'passive', maxRank: 3, reqLevel: [5, 17, 29], icon: 'wall', passive: { block: 8, parryWindow: 0.05 }, desc: (r) => `+${8 * r}% block chance and a longer parry window. Rank ${r}.` },

  // ---------------- RANGER ----------------
  doubleshot: {
    id: 'doubleshot', name: 'Double Shot', type: 'shot', class: 'ranger', kind: 'active', maxRank: 3,
    reqLevel: [1, 8, 18], icon: 'bow', stam: 14, cd: 3, range: 18, scale: 0.85, base: 3, count: 2, spread: 0.06,
    desc: (r) => `Loose two arrows at once, each dealing ${pct(85 + 20 * (r - 1))} weapon damage.`,
  },
  volley: {
    id: 'volley', name: 'Arrow Volley', type: 'volley', class: 'ranger', kind: 'active', maxRank: 3,
    reqLevel: [4, 14, 26], icon: 'volley', stam: 22, cd: 8, range: 16, radius: 4.5, scale: 0.7, base: 4, count: 7,
    desc: (r) => `Rain ${7} arrows into the targeted area, each dealing ${pct(70 + 18 * (r - 1))} weapon damage.`,
  },
  rollshot: {
    id: 'rollshot', name: 'Blink Shot', type: 'blinkShot', class: 'ranger', kind: 'active', maxRank: 3,
    reqLevel: [6, 16, 28], icon: 'roll', stam: 18, cd: 6, range: 8, shootRange: 16, scale: 0.9, base: 4,
    desc: (r) => `Hop backwards away from your target (brief i-frames) and fire a shot for ${pct(90 + 25 * (r - 1))} weapon damage.`,
  },
  snare: {
    id: 'snare', name: 'Snare Trap', type: 'trap', class: 'ranger', kind: 'active', maxRank: 3,
    reqLevel: [8, 20, 32], icon: 'trap', stam: 20, cd: 11, range: 10, radius: 3.2, scale: 0.5, base: 3, duration: 4,
    desc: (r) => `Drop a trap that roots and damages up to 4 enemies for ${pct(50 + 15 * (r - 1))} weapon damage over ${4}s.`,
  },
  pierce: {
    id: 'pierce', name: 'Piercing Arrow', type: 'pierce', class: 'ranger', kind: 'active', maxRank: 3,
    reqLevel: [11, 23, 35], icon: 'pierce', stam: 24, cd: 8, range: 24, scale: 1.4, base: 8,
    desc: (r) => `A heavy arrow that punches through every enemy in a line for ${pct(140 + 40 * (r - 1))} weapon damage.`,
  },
  steadyaim: {
    id: 'steadyaim', name: 'Steady Aim', type: 'buff', class: 'ranger', kind: 'active', maxRank: 3,
    reqLevel: [5, 15, 27], icon: 'aim', mana: 0, stam: 15, cd: 14, duration: 9,
    buff: { crit: 25, dmgPct: 12 },
    desc: (r) => `Steady your bow for 9s: +${25 + 5 * (r - 1)}% critical chance and +${12 + 6 * (r - 1)}% damage.`,
  },
  r_deadeye: { id: 'r_deadeye', name: 'Deadeye', type: 'passive', class: 'ranger', kind: 'passive', maxRank: 5, reqLevel: [2, 10, 18, 26, 34], icon: 'aim', passive: { crit: 4 }, desc: (r) => `+${4 * r}% critical chance. Rank ${r}.` },
  r_swift: { id: 'r_swift', name: 'Swift Foot', type: 'passive', class: 'ranger', kind: 'passive', maxRank: 5, reqLevel: [3, 12, 21, 30, 38], icon: 'boots', passive: { moveSpeed: 4, stamina: 6 }, desc: (r) => `+${4 * r}% movement speed and +${6 * r} stamina. Rank ${r}.` },
  r_evasion: { id: 'r_evasion', name: 'Evasion', type: 'passive', class: 'ranger', kind: 'passive', maxRank: 3, reqLevel: [5, 17, 29], icon: 'roll', passive: { dodge: 5, rollCost: 4 }, desc: (r) => `+${5 * r}% chance to dodge attacks, cheaper rolls. Rank ${r}.` },

  // ---------------- MAGE ----------------
  firebolt: {
    id: 'firebolt', name: 'Firebolt', type: 'bolt', class: 'mage', kind: 'active', maxRank: 3,
    reqLevel: [1, 8, 18], icon: 'bolt', mana: 8, cd: 0.55, range: 18, scale: 0.9, base: 7, element: 'fire',
    desc: (r) => `Hurl a bolt of flame that detonates on impact for ${dmg(7 + 4 * (r - 1))} + ${pct(90 + 25 * (r - 1))} spell power.`,
  },
  frostnova: {
    id: 'frostnova', name: 'Frost Nova', type: 'nova', class: 'mage', kind: 'active', maxRank: 3,
    reqLevel: [3, 13, 25], icon: 'nova', mana: 22, cd: 9, radius: 7, scale: 0.8, base: 6, element: 'frost', slow: 3.5,
    desc: (r) => `A ring of ice: ${dmg(6 + 4 * (r - 1))} + ${pct(80 + 22 * (r - 1))} spell power and a ${3.5}s slow to all within ${7}m.`,
  },
  chain: {
    id: 'chain', name: 'Chain Lightning', type: 'chain', class: 'mage', kind: 'active', maxRank: 3,
    reqLevel: [6, 16, 28], icon: 'chain', mana: 18, cd: 5, range: 15, jumps: 4, scale: 0.75, base: 5, element: 'shock',
    desc: (r) => `Lightning arcs between up to ${4} enemies for ${dmg(5 + 3 * (r - 1))} + ${pct(75 + 20 * (r - 1))} spell power each.`,
  },
  blink: {
    id: 'blink', name: 'Blink', type: 'blink', class: 'mage', kind: 'active', maxRank: 2,
    reqLevel: [8, 24], icon: 'roll', mana: 15, cd: 5, range: 9,
    desc: (r) => `Teleport up to ${9}m through anything, leaving a burst of frost that slows nearby foes.`,
  },
  firewall: {
    id: 'firewall', name: 'Fire Wall', type: 'wall', class: 'mage', kind: 'active', maxRank: 3,
    reqLevel: [11, 23, 35], icon: 'wall', mana: 26, cd: 12, range: 12, radius: 4.5, duration: 6, scale: 0.35, base: 3, element: 'fire',
    desc: (r) => `Ignite the ground for ${6}s, burning enemies for ${dmg(3 + 2 * (r - 1))} + ${pct(35 + 12 * (r - 1))} spell power per tick.`,
  },
  meteor: {
    id: 'meteor', name: 'Meteor', type: 'meteor', class: 'mage', kind: 'active', maxRank: 3,
    reqLevel: [14, 26, 38], icon: 'meteor', mana: 40, cd: 14, range: 16, radius: 5.5, scale: 1.8, base: 18, element: 'fire',
    desc: (r) => `Call down a meteor at the cursor: ${dmg(18 + 10 * (r - 1))} + ${pct(180 + 50 * (r - 1))} spell power in a ${5.5}m blast.`,
  },
  m_focus: { id: 'm_focus', name: 'Arcane Focus', type: 'passive', class: 'mage', kind: 'passive', maxRank: 5, reqLevel: [2, 10, 18, 26, 34], icon: 'bolt', passive: { mana: 15, manaRegen: 1 }, desc: (r) => `+${15 * r} mana and +${r} mana regeneration. Rank ${r}.` },
  m_element: { id: 'm_element', name: 'Elemental Power', type: 'passive', class: 'mage', kind: 'passive', maxRank: 5, reqLevel: [3, 11, 19, 27, 35], icon: 'meteor', passive: { spellPct: 8 }, desc: (r) => `+${8 * r}% spell damage. Rank ${r}.` },
  m_shield: { id: 'm_shield', name: 'Mana Shield', type: 'passive', class: 'mage', kind: 'passive', maxRank: 3, reqLevel: [5, 17, 29], icon: 'shield', passive: { manaShield: 25 }, desc: (r) => `${25 * r}% of incoming damage is absorbed by mana. Rank ${r}.` },
};

function pct(n) { return n + '%'; }
function dmg(n) { return n; }
export const SKILL_LIST = Object.values(SKILLS);
export const skillsForClass = (cls) => SKILL_LIST.filter((s) => s.class === cls);
