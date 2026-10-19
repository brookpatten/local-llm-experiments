// Local save slot.
const KEY = 'emberfall_save_v1';
const SKEY = 'emberfall_settings_v1';

export const DEFAULT_SETTINGS = { volume: 0.35, muted: false, dmgNums: true, shake: true, music: true };

export function readSettings() {
  try {
    const s = localStorage.getItem(SKEY);
    return s ? Object.assign({}, DEFAULT_SETTINGS, JSON.parse(s)) : { ...DEFAULT_SETTINGS };
  } catch (e) { return { ...DEFAULT_SETTINGS }; }
}

export function writeSettings(o) {
  try { localStorage.setItem(SKEY, JSON.stringify(o)); return true; } catch (e) { return false; }
}

export function hasSave() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } }
export function writeSave(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); return true; } catch (e) { return false; } }
export function readSave() { try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
export function wipeSave() { try { localStorage.removeItem(KEY); return true; } catch (e) { return false; } }
