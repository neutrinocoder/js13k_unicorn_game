// On-screen controls for phones and tablets: a thumb-stick on the left, buttons on the right.
// The buttons press the same keys the keyboard does, so the rest of the game needs no changes.
// Attacks aim themselves at the nearest foe; push the stick firmly up or down to aim by hand.
import { G } from './state.js';
import { keys, pressed } from './input.js';

let root = null, cb = { onKey() {}, label() { return ''; }, bombs() { return false; } };
const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const mine = new Set();   // keys held down by touch right now

function setKey(code, on) {
  if (on) {
    mine.add(code);
    if (!keys[code]) { keys[code] = true; pressed[code] = true; cb.onKey(code); }
  } else if (mine.has(code)) {
    mine.delete(code);
    keys[code] = false;
  }
}
function releaseAll() {
  for (const code of [...mine]) setKey(code, false);
  stick.id = null;
  stick.x = stick.y = 0;
  if (root) {
    root.querySelector('.t-base').classList.remove('on');
    for (const el of root.querySelectorAll('.t-btn.on')) el.classList.remove('on');
  }
}

// Where the hero should aim on a touch screen: [x, y], a unit vector.
export function touchAim(p, cx, cy) {
  const m = Math.hypot(stick.x, stick.y);
  // the stick pushed firmly up or down: aim by hand (to blast straight down, say)
  if (m > 0.5 && Math.abs(stick.y) > 0.62 * m) return [stick.x / m, stick.y / m];
  // otherwise at the nearest foe within reach
  let best = null, bd = 540;
  const list = G.boss && !G.boss.dead && !G.boss.hidden ? [...G.enemies, G.boss] : G.enemies;
  for (const e of list) {
    if (e.dead) continue;
    const d = Math.hypot(e.x + e.w / 2 - cx, e.y + e.h / 2 - cy);
    if (d < bd) { bd = d; best = e; }
  }
  if (best) return [(best.x + best.w / 2 - cx) / (bd || 1), (best.y + best.h / 2 - cy) / (bd || 1)];
  if (m > 0.4) return Math.abs(stick.y) < 0.45 * m ? [Math.sign(stick.x) || p.face, 0] : [stick.x / m, stick.y / m];
  return [p.face, 0];
}

// Wording for a touch screen: the messages written for a keyboard name keys that are not there.
const WORDS = [
  [/Press R to open your arsenal/g, 'Tap the ⚔ button at the top to open your arsenal'],
  [/Press R to/g, 'Tap the ⚔ button at the top to'],
  [/Press R\b/g, 'Tap the ⚔ button at the top'],
  [/Press M to open your map, and click/g, 'Tap the map button at the top, then tap'],
  [/Press G to throw one at any time/g, 'Tap the bomb button to throw one'],
  [/Right-click fires your blast whatever weapon is in your hand\. Blast downward/g, 'The blast button fires whatever weapon is in your hand. Push the stick down and blast'],
  [/click, and it will blast/g, 'tap attack, and it will blast'],
  [/Hold Jump/g, 'Hold the jump button'],
  [/\bclick\b/g, 'tap'],
  [/\bClick\b/g, 'Tap'],
];
export function touchText(s) {
  if (!G.touch || typeof s !== 'string') return s;
  for (const [a, b] of WORDS) s = s.replace(a, b);
  return s;
}

const el = (tag, cls, html = '') => { const e = document.createElement(tag); e.className = cls; e.innerHTML = html; return e; };

function button(cls, code, glyph, caption) {
  const b = el('div', 't-btn ' + cls, `<b>${glyph}</b>${caption ? `<small>${caption}</small>` : ''}`);
  const down = e => {
    e.preventDefault();
    if (b.setPointerCapture) { try { b.setPointerCapture(e.pointerId); } catch (err) {} }
    b.classList.add('on');
    setKey(code, true);
  };
  const up = () => { b.classList.remove('on'); setKey(code, false); };
  b.addEventListener('pointerdown', down);
  b.addEventListener('pointerup', up);
  b.addEventListener('pointercancel', up);
  b.addEventListener('lostpointercapture', up);
  return b;
}

function build() {
  root = el('div', 'hidden');
  root.id = 'touch';
  // the stick: it appears wherever the left thumb lands
  const zone = el('div', 't-stick t-play'), base = el('div', 't-base', '<i></i>');
  zone.appendChild(base);
  const move = e => {
    if (e.pointerId !== stick.id) return;
    const R = Math.max(40, Math.min(innerWidth, innerHeight) * 0.13);
    let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx *= R / d; dy *= R / d; }
    stick.x = dx / R;
    stick.y = dy / R;
    base.firstChild.style.transform = `translate(${dx}px, ${dy}px)`;
    setKey('KeyA', stick.x < -0.3);
    setKey('KeyD', stick.x > 0.3);
    setKey('KeyS', stick.y > 0.6);
  };
  const end = e => {
    if (e.pointerId !== stick.id) return;
    stick.id = null;
    stick.x = stick.y = 0;
    base.classList.remove('on');
    base.firstChild.style.transform = '';
    setKey('KeyA', false); setKey('KeyD', false); setKey('KeyS', false);
  };
  zone.addEventListener('pointerdown', e => {
    if (stick.id !== null) return;
    e.preventDefault();
    stick.id = e.pointerId;
    stick.ox = e.clientX;
    stick.oy = e.clientY;
    try { zone.setPointerCapture(e.pointerId); } catch (err) {}
    base.style.left = e.clientX + 'px';
    base.style.top = e.clientY + 'px';
    base.classList.add('on');
  });
  zone.addEventListener('pointermove', move);
  zone.addEventListener('pointerup', end);
  zone.addEventListener('pointercancel', end);
  root.appendChild(zone);

  // play buttons, bottom right
  const play = [
    ['t-jump', 'Space', '▲', 'Jump'], ['t-atk', 'KeyJ', '⚔', 'Attack'], ['t-dash', 'ShiftLeft', '➤', 'Dash'], ['t-blast', 'KeyX', '✸', 'Blast'],
    ['t-bubble', 'KeyB', '◯', 'Bubble'], ['t-swap', 'KeyQ', '⇄', 'Swap'], ['t-potion', 'KeyH', '♥', 'Heal'], ['t-bomb', 'KeyG', '●', 'Bomb'],
    ['t-use', 'KeyE', '', ''],
    // and along the top
    ['t-pause', 'Escape', '❚❚', ''], ['t-map', 'KeyM', '◈', 'Map'], ['t-bag', 'KeyR', '⚔', 'Weapons'],
  ];
  for (const [cls, code, glyph, cap] of play) root.appendChild(button(cls + ' t-play', code, glyph, cap));
  // on the map: zoom and close
  const zoom = k => () => { G.map.zoom = Math.max(0.25, Math.min(8, G.map.zoom * k)); };
  const zin = el('div', 't-btn t-zin t-mapui', '<b>+</b>'), zout = el('div', 't-btn t-zout t-mapui', '<b>−</b>');
  zin.addEventListener('pointerdown', zoom(1.35));
  zout.addEventListener('pointerdown', zoom(1 / 1.35));
  root.appendChild(zin);
  root.appendChild(zout);
  root.appendChild(button('t-close t-mapui', 'KeyM', '✕', 'Close'));
  // in a cutscene: skip it
  root.appendChild(button('t-skip t-cut', 'Escape', 'Skip ▸', ''));
  document.getElementById('ui').appendChild(root);
}

export function initTouch(callbacks) {
  cb = callbacks;
  build();
  // a finger on the glass switches touch controls on; a real mouse moving switches them off
  const on = () => { G.touch = true; };
  if (window.matchMedia && matchMedia('(pointer: coarse)').matches) on();
  addEventListener('touchstart', on, { passive: true });
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && (e.movementX || e.movementY)) G.touch = false; });
  // no double-tap zoom, no long-press menu
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('contextmenu', e => { if (G.touch) e.preventDefault(); });
}

let shown = null, was = false;
export function updateTouch() {
  if (!root) return;
  if (G.touch !== was) { was = G.touch; document.body.classList.toggle('touch', G.touch); }
  const play = G.scene === 'play' && G.player && !G.player.dead;
  const scene = !G.touch ? null : play ? 'play' : G.scene === 'map' ? 'map' : G.scene === 'cutscene' ? 'cutscene' : null;
  if (scene !== shown) {
    shown = scene;
    releaseAll();
    root.classList.toggle('hidden', !scene);
    root.dataset.scene = scene || '';
  }
  if (scene !== 'play') return;
  // the "use" button appears only beside something to use, and says what it will do
  const label = cb.label();
  const use = root.querySelector('.t-use');
  if (use.dataset.label !== label) {
    use.dataset.label = label;
    use.firstChild.textContent = label;
    use.classList.toggle('gone', !label);
  }
  root.querySelector('.t-bomb').classList.toggle('gone', !cb.bombs());
}
