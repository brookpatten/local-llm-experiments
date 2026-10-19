// Keyboard + mouse state. Movement/attack intents are consumed by the player controller.
const keys = new Set();
const pressed = new Map(); // edge-triggered: key -> frame it was pressed on
let frameNo = 0;
const EDGE_TTL = 4; // frames an unconsumed key press stays live
export const mouse = { x: 0, y: 0, down: false, rdown: false, wheel: 0, overCanvas: false, clicked: false, rclicked: false };

let canvas = null;
let onKeyDown = null;

export function initInput(cv, onKey) {
  canvas = cv;
  onKeyDown = onKey;
  window.addEventListener('keydown', (e) => {
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    const k = norm(e);
    if (!keys.has(k)) pressed.set(k, frameNo);
    keys.add(k);
    if (onKey) onKey(k, e);
    if (['Tab', 'Space', 'F1', 'F5'].includes(e.code) || e.code === 'Tab') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { keys.delete(norm(e)); });
  window.addEventListener('blur', () => { keys.clear(); mouse.down = false; mouse.rdown = false; });

  cv.addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.overCanvas = true; });
  cv.addEventListener('pointerdown', (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.overCanvas = true;
    if (e.button === 0) { mouse.down = true; mouse.clicked = true; }
    if (e.button === 2) { mouse.rdown = true; mouse.rclicked = true; }
    e.preventDefault();
  });
  window.addEventListener('pointerup', (e) => {
    if (e.button === 0) mouse.down = false;
    if (e.button === 2) mouse.rdown = false;
  });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  cv.addEventListener('wheel', (e) => { mouse.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
}

function norm(e) { return e.code; } // e.g. 'KeyA', 'Space', 'Digit1'

export const isDown = (k) => keys.has(k);
export function wasPressed(k) {
  const f = pressed.get(k);
  if (f === undefined) return false;
  pressed.delete(k);
  return frameNo - f <= EDGE_TTL;
}
export function isPressed(k) { return pressed.has(k); }
export function consumeMouse() { const w = mouse.wheel; mouse.wheel = 0; return w; }
export function consumeClick() { const c = mouse.clicked; mouse.clicked = false; return c; }
export function consumeRClick() { const c = mouse.rclicked; mouse.rclicked = false; return c; }
export function endFrame() {
  frameNo++;
  for (const [k, f] of pressed) if (frameNo - f > EDGE_TTL) pressed.delete(k);
}
export function clearAll() { keys.clear(); pressed.clear(); mouse.down = false; mouse.rdown = false; }
