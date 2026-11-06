// Keyboard and mouse state. Keys are tracked by KeyboardEvent.code.
export const keys = Object.create(null);
export const pressed = Object.create(null);
export const mouse = { x: 0, y: 0, down: false, pressed: false, rdown: false, rpressed: false, wheel: 0, inside: false, used: false };

const PREVENT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab']);

export function initInput(canvas, onKey) {
  addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (PREVENT.has(e.code) && e.target === document.body) e.preventDefault();
    if (e.repeat) return;
    keys[e.code] = true;
    pressed[e.code] = true;
    onKey && onKey(e.code, e);
  });
  addEventListener('keyup', e => { keys[e.code] = false; });
  addEventListener('blur', () => {
    for (const k in keys) keys[k] = false;
    mouse.down = mouse.rdown = false;
  });
  const pos = e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  };
  canvas.addEventListener('pointermove', e => { pos(e); mouse.inside = true; mouse.used = true; });
  canvas.addEventListener('pointerleave', () => { mouse.inside = false; });
  // Clicks are read from the whole window (not just the canvas), and from both pointer and
  // mouse events, so a click counts whatever keys are held and whatever is drawn on top.
  const onGame = t => t === canvas || t === document.body || t === document.documentElement || (t && t.id === 'ui');
  const down = e => {
    if (!onGame(e.target)) return;
    pos(e);
    mouse.inside = true;
    mouse.used = true;
    if (e.button === 0) { mouse.down = true; mouse.pressed = true; }
    if (e.button === 2) { mouse.rdown = true; mouse.rpressed = true; }
  };
  const up = e => {
    if (e.button === 0) mouse.down = false;
    if (e.button === 2) mouse.rdown = false;
  };
  addEventListener('pointerdown', down);
  addEventListener('mousedown', down);
  addEventListener('pointerup', up);
  addEventListener('mouseup', up);
  addEventListener('pointercancel', () => { mouse.down = mouse.rdown = false; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('wheel', e => { mouse.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
}

export const held = (...codes) => codes.some(k => keys[k]);
export const tapped = (...codes) => codes.some(k => pressed[k]);

export function endFrame() {
  for (const k in pressed) delete pressed[k];
  mouse.pressed = mouse.rpressed = false;
  mouse.wheel = 0;
}
