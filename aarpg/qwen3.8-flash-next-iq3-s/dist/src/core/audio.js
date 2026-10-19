// Tiny procedural WebAudio SFX + music bank (no assets).
let ctx = null, master = null, musicBus = null, muted = false, volume = 0.35;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : volume;
    master.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = 1;
    musicBus.connect(master);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ type = 'sine', f0 = 440, f1 = f0, dur = 0.15, vol = 0.5, delay = 0, curve = 'exp', dest = null }) {
  const c = ac(); if (!c || muted) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(Math.max(20, f0), t);
  if (f1 !== f0) {
    if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    else o.frequency.linearRampToValueAtTime(Math.max(20, f1), t + dur);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || master);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise({ dur = 0.15, vol = 0.4, delay = 0, hp = 400, lp = 8000, dest = null }) {
  const c = ac(); if (!c || muted) return;
  const t = c.currentTime + delay;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource(); src.buffer = buf;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = (hp + lp) / 2; bp.Q.value = 0.7;
  const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp); bp.connect(g); g.connect(dest || master);
  src.start(t);
}

const bank = {
  swing: () => { noise({ dur: 0.16, vol: 0.25, hp: 900, lp: 5200 }); tone({ type: 'sawtooth', f0: 320, f1: 140, dur: 0.12, vol: 0.08 }); },
  hit: () => { noise({ dur: 0.1, vol: 0.35, hp: 200, lp: 2400 }); tone({ type: 'square', f0: 180, f1: 70, dur: 0.1, vol: 0.16 }); },
  crit: () => { noise({ dur: 0.14, vol: 0.4, hp: 300, lp: 3000 }); tone({ type: 'square', f0: 260, f1: 60, dur: 0.16, vol: 0.2 }); },
  parry: () => { tone({ type: 'triangle', f0: 1800, f1: 900, dur: 0.22, vol: 0.3 }); noise({ dur: 0.18, vol: 0.3, hp: 2500, lp: 9000 }); },
  block: () => { tone({ type: 'square', f0: 240, f1: 120, dur: 0.12, vol: 0.18 }); noise({ dur: 0.08, vol: 0.2, hp: 400, lp: 1500 }); },
  roll: () => { noise({ dur: 0.22, vol: 0.16, hp: 300, lp: 1400 }); },
  hurt: () => { tone({ type: 'sawtooth', f0: 320, f1: 110, dur: 0.22, vol: 0.22 }); },
  die: () => { tone({ type: 'sawtooth', f0: 420, f1: 60, dur: 0.6, vol: 0.25 }); noise({ dur: 0.4, vol: 0.2, hp: 200, lp: 1200 }); },
  coin: () => { tone({ type: 'square', f0: 1200, f1: 1800, dur: 0.06, vol: 0.12 }); tone({ type: 'square', f0: 1600, f1: 2400, dur: 0.07, vol: 0.1, delay: 0.05 }); },
  loot: () => { tone({ type: 'triangle', f0: 700, f1: 1400, dur: 0.18, vol: 0.16 }); },
  rare: () => { [660, 880, 1320].forEach((f, i) => tone({ type: 'triangle', f0: f, f1: f * 1.5, dur: 0.3, vol: 0.14, delay: i * 0.08 })); },
  levelup: () => { [523, 659, 784, 1046].forEach((f, i) => tone({ type: 'triangle', f0: f, f1: f, dur: 0.35, vol: 0.18, delay: i * 0.1 })); },
  spell: () => { tone({ type: 'sine', f0: 900, f1: 220, dur: 0.25, vol: 0.18 }); tone({ type: 'sawtooth', f0: 300, f1: 900, dur: 0.15, vol: 0.08 }); },
  fire: () => { noise({ dur: 0.3, vol: 0.22, hp: 500, lp: 2600 }); tone({ type: 'sine', f0: 160, f1: 60, dur: 0.3, vol: 0.16 }); },
  frost: () => { tone({ type: 'sine', f0: 2200, f1: 700, dur: 0.3, vol: 0.14 }); noise({ dur: 0.2, vol: 0.14, hp: 3000, lp: 9000 }); },
  chest: () => { noise({ dur: 0.25, vol: 0.2, hp: 300, lp: 2000 }); tone({ type: 'square', f0: 180, f1: 320, dur: 0.2, vol: 0.1 }); },
  click: () => { tone({ type: 'square', f0: 900, f1: 600, dur: 0.05, vol: 0.08 }); },
  portal: () => { tone({ type: 'sine', f0: 300, f1: 1400, dur: 0.5, vol: 0.16 }); noise({ dur: 0.5, vol: 0.12, hp: 800, lp: 5000 }); },
  quest: () => { [784, 988, 1175].forEach((f, i) => tone({ type: 'triangle', f0: f, f1: f, dur: 0.25, vol: 0.16, delay: i * 0.09 })); },
  buy: () => { tone({ type: 'square', f0: 700, f1: 1100, dur: 0.08, vol: 0.12 }); tone({ type: 'square', f0: 1100, f1: 1500, dur: 0.08, vol: 0.1, delay: 0.07 }); },
  bow: () => { noise({ dur: 0.09, vol: 0.2, hp: 1400, lp: 6000 }); tone({ type: 'triangle', f0: 620, f1: 300, dur: 0.1, vol: 0.1 }); },
  thunk: () => { noise({ dur: 0.09, vol: 0.24, hp: 700, lp: 2600 }); tone({ type: 'square', f0: 420, f1: 200, dur: 0.07, vol: 0.1 }); },
  squelch: () => { const p = 0.8 + Math.random() * 0.5; tone({ type: 'sawtooth', f0: 260 * p, f1: 70 * p, dur: 0.26, vol: 0.16 }); noise({ dur: 0.2, vol: 0.2, hp: 260, lp: 1600 }); },
  roar: () => {
    tone({ type: 'sawtooth', f0: 90, f1: 62, dur: 1.1, vol: 0.26, curve: 'linear' });
    tone({ type: 'square', f0: 132, f1: 88, dur: 0.9, vol: 0.1 });
    noise({ dur: 0.8, vol: 0.18, hp: 160, lp: 1100 });
  },
  shrine: () => { [523, 659, 784, 1046].forEach((f, i) => tone({ type: 'sine', f0: f, f1: f * 1.02, dur: 0.7, vol: 0.1, delay: i * 0.06 })); },
  equip: () => { noise({ dur: 0.12, vol: 0.22, hp: 1800, lp: 7000 }); tone({ type: 'square', f0: 300, f1: 520, dur: 0.09, vol: 0.1 }); },
  deny: () => { tone({ type: 'square', f0: 200, f1: 130, dur: 0.14, vol: 0.12 }); },
  open: () => { tone({ type: 'triangle', f0: 480, f1: 640, dur: 0.07, vol: 0.07 }); },
  win: () => { [523, 659, 784, 1046, 1318].forEach((f, i) => tone({ type: 'triangle', f0: f, f1: f, dur: 0.6, vol: 0.16, delay: i * 0.16 })); },
};

export function sfx(name) { const f = bank[name] || (name === 'gold' ? bank.coin : null); if (f) { try { f(); } catch (e) { /* ignore */ } } }
export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : volume; }
export function isMuted() { return muted; }
export function setVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  if (master) master.gain.value = muted ? 0 : volume;
}
export function getVolume() { return volume; }

// ---------------------------------------------------------------- music beds
// Each area gets a drone plus a sparse generated melody, so the score never
// loops on an obvious repeat and costs nothing to ship.
const BEDS = {
  town: { root: 110.0, step: 1500, cutoff: 760, drone: 0.055, wave: 'triangle', note: 0.055, chance: 0.75, perc: 0, scale: [0, 3, 5, 7, 10, 12, 15] },
  wild: { root: 73.42, step: 1800, cutoff: 560, drone: 0.050, wave: 'triangle', note: 0.050, chance: 0.60, perc: 0, scale: [0, 2, 3, 5, 7, 10, 12] },
  dungeon: { root: 69.30, step: 1600, cutoff: 400, drone: 0.062, wave: 'sawtooth', note: 0.042, chance: 0.55, perc: 0, scale: [0, 1, 3, 6, 7, 8, 12] },
  boss: { root: 82.41, step: 880, cutoff: 900, drone: 0.070, wave: 'sawtooth', note: 0.058, chance: 0.90, perc: 1, scale: [0, 3, 5, 6, 7, 10, 12] },
};
let music = null;

function fadeOut(m) {
  if (!m) return;
  const c = ac(); if (!c) return;
  try {
    m.g.gain.cancelScheduledValues(c.currentTime);
    m.g.gain.setValueAtTime(Math.max(0.0001, m.g.gain.value), c.currentTime);
    m.g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.1);
  } catch (e) { /* ignore */ }
  clearInterval(m.timer);
  setTimeout(() => {
    for (const o of m.oscs) { try { o.stop(); } catch (e) { /* ignore */ } }
    try { m.lfo.stop(); } catch (e) { /* ignore */ }
    setTimeout(() => { try { m.g.disconnect(); m.lp.disconnect(); } catch (e) { /* ignore */ } }, 400);
  }, 1200);
}

export function startMusic(bed) {
  const c = ac(); if (!c) return;
  if (!bed || bed === 'none') { stopMusic(); return; }
  if (music && music.bed === bed) return;
  try {
    startMusicInner(c, bed);
  } catch (e) { /* audio is a luxury: never break the game */ }
}

function startMusicInner(c, bed) {
  const def = BEDS[bed] || BEDS.wild;
  const old = music; music = null;

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(1, c.currentTime + 1.4);
  g.connect(musicBus);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = def.cutoff; lp.Q.value = 0.6;
  lp.connect(g);

  const oscs = [];
  for (const [mult, det, lvl] of [[1, -7, 1], [1, 8, 0.75], [1.5, 3, 0.45], [2, -3, 0.22]]) {
    const o = c.createOscillator();
    o.type = def.wave; o.frequency.value = def.root * mult; o.detune.value = det;
    const og = c.createGain(); og.gain.value = def.drone * lvl;
    o.connect(og); og.connect(lp); o.start();
    oscs.push(o);
  }
  const lfo = c.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.06;
  const lfoAmt = c.createGain(); lfoAmt.gain.value = def.cutoff * 0.32;
  lfo.connect(lfoAmt); lfoAmt.connect(lp.frequency); lfo.start();

  let tick = 0;
  const timer = setInterval(() => {
    if (muted) return;
    tick++;
    if (Math.random() < def.chance) {
      const deg = def.scale[(Math.random() * def.scale.length) | 0];
      const f = def.root * 2 * Math.pow(2, deg / 12);
      tone({ type: 'triangle', f0: f, f1: f, dur: 0.9, vol: def.note, dest: g });
      if (Math.random() < 0.32) tone({ type: 'sine', f0: f * 1.5, f1: f * 1.5, dur: 0.7, vol: def.note * 0.6, delay: 0.22, dest: g });
    }
    if (def.perc && tick % 2 === 0) noise({ dur: 0.12, vol: 0.09, hp: 90, lp: 420, dest: g });
  }, def.step);

  music = { bed, g, lp, oscs, lfo, timer };
  fadeOut(old);
}

export function stopMusic() {
  if (!music) return;
  const m = music; music = null;
  clearInterval(m.timer);
  try {
    const c = ac();
    m.g.gain.cancelScheduledValues(c.currentTime);
    m.g.gain.setValueAtTime(Math.max(0.0001, m.g.gain.value), c.currentTime);
    m.g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.5);
  } catch (e) { /* ignore */ }
  setTimeout(() => {
    for (const o of m.oscs) { try { o.stop(); } catch (e) { /* ignore */ } }
    try { m.lfo.stop(); } catch (e) { /* ignore */ }
    try { m.g.disconnect(); m.lp.disconnect(); } catch (e) { /* ignore */ }
  }, 700);
}

export function musicBed() { return music ? music.bed : null; }
