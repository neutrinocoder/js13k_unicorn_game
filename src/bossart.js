// Boss artwork. Each function draws in local space: origin at the boss's feet, facing +x.
// Every boss gets a mood (see mood()) built from what it is doing: where the player is,
// how far into its current attack it is, whether it was just hit, is roaring or dying.
import { flame, eye, glow, lightning, strand, limb, teeth } from './art.js';
import { shade, rgba, clamp, lerp } from './util.js';

const TAU = Math.PI * 2;
const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const sm = k => { k = cl(k); return k * k * (3 - 2 * k); };
const pulse = (t, f, a = 0, b = 1) => a + (b - a) * (0.5 + 0.5 * Math.sin(t * f));

function ell(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
}

// ---------- Mood and expressions ----------
// dx, dy: the player's offset from the boss centre, in facing space (+x = the way the boss faces).
export function mood(b, t, dx, dy) {
  const d = Math.hypot(dx, dy) || 1;
  const bp = (t * 0.9 + (b.seed || 0)) % 4.7;
  const k = b.stDur > 0 ? cl(1 - b.stT / b.stDur) : 1;
  return {
    lx: dx / d, ly: dy / d, dist: d, k,
    hurt: cl((b.hurtT || 0) / 0.35),
    roar: cl((b.roarT || 0) / 1.1),
    dying: b.dieAt != null ? cl((t - b.dieAt) / 1.0) : 0,
    enr: b.phase > 1,
    blink: bp < 0.16 ? Math.sin((bp / 0.16) * Math.PI) : 0,
    intro: b.st === 'intro' ? k : 1,
  };
}

// Merge a state's expression with the overlays every boss shares: a flinch when hit, a roar at
// a phase change, and eyes closing as it dies.
function expr(m, base) {
  const e = { open: 0.2, brow: 0.2, lid: 0, tilt: 0, ...base };
  const h = m.hurt * m.hurt, r = Math.sin(m.roar * Math.PI);
  e.open = cl(e.open * (1 - r) + h * 0.45 + r);
  e.brow = cl(e.brow + h * 0.6 + r * 0.9, -1, 1);
  e.lid = cl(e.lid * (1 - r) + h * 0.7 + m.dying * m.dying);
  e.tilt += -r * 0.5 + h * 0.14 + m.dying * 0.55;
  e.roar = r;
  return e;
}

// An expressive eye: glowing iris, a pupil that follows the player, lids that squint or blink,
// and a brow that slants with anger. nx says which way the nose is (+1 = toward +x).
function gaze(ctx, x, y, r, col, m, e, o = {}) {
  const { skin = '#000', nx = 1, browW = r * 0.7, browCol = skin, core = '#fff', halo = 3.5, pupil = 0.42, look = 0.38, brow = true } = o;
  const lid = cl(Math.max(e.lid, m.blink * (1 - m.dying)));
  eye(ctx, x, y, r, col, core, halo);
  const px = x + m.lx * r * look, py = y + m.ly * r * look;
  ctx.fillStyle = o.pupilCol || 'rgba(0,0,0,.82)';
  ctx.beginPath(); ctx.arc(px, py, r * pupil, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.beginPath(); ctx.arc(px - r * 0.28, py - r * 0.3, r * 0.17, 0, TAU); ctx.fill();
  if (lid > 0.03) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r * 1.15, 0, TAU); ctx.clip();
    ctx.fillStyle = skin;
    ctx.translate(x, y);
    ctx.rotate(e.brow * 0.3 * nx);
    ctx.fillRect(-r * 2, -r * 2, r * 4, lid * r * 2.3);
    ctx.fillRect(-r * 2, r * 1.25 - lid * r * 0.75, r * 4, r * 2);
    ctx.restore();
  }
  if (brow) {
    ctx.strokeStyle = browCol;
    ctx.lineWidth = browW;
    ctx.lineCap = 'round';
    const raise = Math.max(0, -e.brow) * r * 0.6;
    ctx.beginPath();
    ctx.moveTo(x - nx * r * 1.4, y - r * 1.55 - raise - e.brow * r * 0.3);
    ctx.lineTo(x + nx * r * 1.3, y - r * 1.5 - raise + e.brow * r * 0.75);
    ctx.stroke();
  }
}

// Four clawed fingers from a wrist point, spread open or curled into a fist.
function claws(ctx, x, y, dirX, dirY, len, open, col, w = 2) {
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  const nx = -dirY, ny = dirX;
  for (let k = 0; k < 4; k++) {
    const u = (k - 1.5) / 1.5, spread = u * (0.25 + open * 0.55);
    const ex = x + (dirX * Math.cos(spread) - dirY * Math.sin(spread)) * len * (0.8 + open * 0.3) + nx * u * 2;
    const ey = y + (dirY * Math.cos(spread) + dirX * Math.sin(spread)) * len * (0.8 + open * 0.3) + ny * u * 2;
    ctx.beginPath();
    ctx.moveTo(x + nx * u * 2, y + ny * u * 2);
    ctx.quadraticCurveTo((x + ex) / 2 + nx * u * 2, (y + ey) / 2 + ny * u * 2, ex + (1 - open) * -dirX * len * 0.4, ey + (1 - open) * -dirY * len * 0.4);
    ctx.stroke();
  }
}

// ---------- Cerberus: three-headed hound of the pit, wreathed in acid fire ----------
// A huge, muscular hellhound: horned wolf heads on thick collared necks with broken chains,
// a spined back crowned in green fire, glowing acid cracks and a living serpent for a tail.
// Each head has its own temper: the watcher (top) looks around, the alpha (middle) leads the
// attacks, and the mad one (bottom) pants, snaps and lolls its tongue.

// A filled tube along a list of points, tapering from w0 to w1. Returns the edge points.
function tube(ctx, pts, w0, w1, fill, outline, lw = 2.5) {
  const L = [], R = [], n = pts.length - 1;
  for (let i = 0; i <= n; i++) {
    const a = pts[Math.max(0, i - 1)], c = pts[Math.min(n, i + 1)];
    let tx = c[0] - a[0], ty = c[1] - a[1];
    const d = Math.hypot(tx, ty) || 1;
    tx /= d; ty /= d;
    const w = (w0 + (w1 - w0) * (i / n)) / 2;
    L.push([pts[i][0] + ty * w, pts[i][1] - tx * w]);
    R.push([pts[i][0] - ty * w, pts[i][1] + tx * w]);
  }
  ctx.beginPath();
  L.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  const e = pts[n], ea = Math.atan2(e[1] - pts[n - 1][1], e[0] - pts[n - 1][0]);
  ctx.arc(e[0], e[1], w1 / 2, ea - Math.PI / 2, ea + Math.PI / 2);
  for (let i = n; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath();
  if (outline) { ctx.strokeStyle = outline; ctx.lineWidth = lw; ctx.stroke(); }
  ctx.fillStyle = fill;
  ctx.fill();
  return { L, R };
}

function bez(p0, p1, p2, n = 10) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, v = 1 - u;
    out.push([v * v * p0[0] + 2 * v * u * p1[0] + u * u * p2[0], v * v * p0[1] + 2 * v * u * p1[1] + u * u * p2[1]]);
  }
  return out;
}

// A tapered, curving horn from (x, y), heading a0 and bending by curl along its length.
function hornC(ctx, x, y, len, a0, curl, w, c0, c1) {
  const pts = [[x, y]];
  let px = x, py = y;
  for (let i = 1; i <= 9; i++) {
    const a = a0 + curl * (i / 9);
    px += Math.cos(a) * len / 9; py += Math.sin(a) * len / 9;
    pts.push([px, py]);
  }
  const g = ctx.createLinearGradient(x, y, px, py);
  g.addColorStop(0, c0);
  g.addColorStop(1, c1);
  const { L, R } = tube(ctx, pts, w, 0.6, g, 'rgba(0,0,0,.7)', 1.4);
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.lineWidth = 0.8;
  for (let i = 1; i < 7; i += 1) { ctx.beginPath(); ctx.moveTo(L[i][0], L[i][1]); ctx.lineTo(R[i][0], R[i][1]); ctx.stroke(); }
}

function houndHead(ctx, hx, hy, s, ang, e, t, fl, dim, seed, m, P) {
  const F = c => (fl ? '#fff' : c);
  const fur = F(shade('#262b1e', dim)), furL = F(shade('#4b583a', dim)), dark = F('#080a05'), rim = F(shade('#8fb35a', dim));
  const open = e.open, snarl = cl((e.brow - 0.35) / 0.65);
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(ang + e.tilt);
  ctx.scale(s, s);
  // far horn, then the ear (pricked when alert, pinned flat when snarling)
  hornC(ctx, -2, -13, 24, -2.45, 1.35, 6, F(shade('#1a1612', dim)), F(shade('#9a8f78', dim - 0.15)));
  ctx.save();
  ctx.translate(-6, -14);
  ctx.rotate(-0.5 + e.ear * 1.1 + Math.sin(t * 11 + seed) * 0.05 * (1 - e.ear));
  ctx.fillStyle = dark;
  ctx.beginPath(); ctx.moveTo(2, 3); ctx.lineTo(-12, -22); ctx.lineTo(8, -4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = F('#4a1a28');
  ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(-8, -15); ctx.lineTo(5, -3); ctx.closePath(); ctx.fill();
  ctx.restore();
  // cheek ruff behind the jaw
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(-14, -6);
  for (let q = 0; q < 5; q++) { ctx.lineTo(-24 + q * 2.5, 2 + q * 3.2); ctx.lineTo(-13 + q * 3, 1 + q * 2.6); }
  ctx.lineTo(2, 12); ctx.closePath(); ctx.fill();
  // lower jaw
  ctx.save();
  ctx.translate(6, 5);
  ctx.rotate(open * 0.62);
  ctx.fillStyle = fur;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-4, -1); ctx.lineTo(35, -1); ctx.quadraticCurveTo(37, 5, 31, 7); ctx.lineTo(2, 11); ctx.quadraticCurveTo(-6, 8, -4, -1); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = F('#4a0610');
  ctx.beginPath(); ctx.moveTo(0, -0.5); ctx.lineTo(33, -0.3); ctx.lineTo(28, 3.5); ctx.lineTo(2, 4); ctx.closePath(); ctx.fill();
  if (e.tongue > 0.05) {
    const tl = 8 + e.tongue * 18, wag = Math.sin(t * 9 + seed) * 2.2 * e.tongue;
    ctx.fillStyle = F('#d8446e');
    ctx.beginPath();
    ctx.moveTo(10, 0.5);
    ctx.quadraticCurveTo(15 + tl * 0.5, -1 + wag, 13 + tl, 3 + e.tongue * 8 + wag);
    ctx.quadraticCurveTo(15 + tl * 0.5, 6, 10, 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(110,10,40,.6)';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(12, 2.5); ctx.lineTo(12 + tl * 0.8, 3 + e.tongue * 6 + wag * 0.8); ctx.stroke();
  }
  teeth(ctx, 8, -0.4, 32, -0.4, 7, 4, false);
  ctx.fillStyle = '#fff6e6';
  ctx.beginPath(); ctx.moveTo(27, 0); ctx.lineTo(28.5, -8 - snarl * 2); ctx.lineTo(30.5, 0); ctx.fill();
  ctx.restore();
  // throat glow, building before a spit
  if (open > 0.3 || e.throat > 0) glow(ctx, 22, 5, 15 + e.throat * 18, P.acid, 0.3 * open + e.throat * 0.75);
  // near horn
  hornC(ctx, 2, -11, 30, -2.7, 1.55, 7.5, F(shade('#231d16', dim)), F(shade('#d8ccb0', dim)));
  // skull
  const g = ctx.createLinearGradient(0, -22, 0, 10);
  g.addColorStop(0, furL);
  g.addColorStop(0.55, fur);
  g.addColorStop(1, F(shade('#141810', dim)));
  ctx.fillStyle = g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-16, -2);
  ctx.quadraticCurveTo(-16, -17, -4, -19);
  ctx.quadraticCurveTo(9, -21, 17, -14);
  ctx.quadraticCurveTo(20, -11, 26, -10.5);
  ctx.lineTo(44, -7.5);
  ctx.quadraticCurveTo(50, -6, 49, -1);
  ctx.quadraticCurveTo(48, 3.5, 42, 3.5);
  ctx.lineTo(14, 5.5);
  ctx.quadraticCurveTo(2, 13, -8, 10);
  ctx.quadraticCurveTo(-15, 8, -16, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // rim light along the crown and muzzle
  ctx.strokeStyle = rgba(rim, 0.55);
  ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(-12, -14); ctx.quadraticCurveTo(-4, -19.5, 8, -19); ctx.quadraticCurveTo(15, -17, 18, -13.5); ctx.moveTo(27, -10); ctx.lineTo(43, -7.2); ctx.stroke();
  // curled lip bares the gums when snarling
  if (snarl > 0) {
    ctx.fillStyle = F('#4a0610');
    ctx.beginPath(); ctx.moveTo(16, 5); ctx.quadraticCurveTo(29, 1.5 - snarl * 5, 43, 2.6); ctx.lineTo(43, 4); ctx.closePath(); ctx.fill();
  }
  teeth(ctx, 14, 5.2 - snarl * 1.3, 42, 3.4, 8, 4.6 + snarl, true);
  ctx.fillStyle = '#fff6e6';
  ctx.beginPath(); ctx.moveTo(34, 3.6); ctx.lineTo(35.6, 13 + snarl * 2.5); ctx.lineTo(37.8, 3.2); ctx.fill();
  // nose
  ctx.fillStyle = dark;
  ell(ctx, 46.5, -4.5, 3.4, 2.6); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ell(ctx, 46, -5.6, 1.4, 0.8); ctx.fill();
  // snarl wrinkles deepen with the brow
  ctx.strokeStyle = `rgba(0,0,0,${0.3 + cl(e.brow) * 0.5})`;
  ctx.lineWidth = 0.8 + cl(e.brow) * 1.2;
  for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.moveTo(26 + q * 4, -9 + q * 0.4); ctx.quadraticCurveTo(28 + q * 4, -5.5, 26 + q * 4, -2); ctx.stroke(); }
  // deep eye socket, brow ridge, and the eye
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ell(ctx, 15, -9.5, 6, 4.2, 0.15); ctx.fill();
  if (P.scar) {
    ctx.strokeStyle = F('#a86a6a');
    ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(9, -19); ctx.lineTo(14, -12); ctx.moveTo(16, -7.5); ctx.lineTo(21, 0); ctx.stroke();
  }
  gaze(ctx, 15, -9.5, 3.3, P.eye, m, e, { skin: fur, nx: 1, browCol: dark, browW: 2.6 });
  // eye flare streaking back when it charges or rages
  if (P.trail > 0.05) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const tg = ctx.createLinearGradient(15, -10, -10, -14);
    tg.addColorStop(0, rgba(P.eye, 0.85 * P.trail));
    tg.addColorStop(1, rgba(P.eye, 0));
    ctx.strokeStyle = tg;
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(16, -10); ctx.quadraticCurveTo(4, -13 + Math.sin(t * 9 + seed), -12, -15); ctx.stroke();
    ctx.restore();
  }
  // acid breath curling from the jaws
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let q = 0; q < 3; q++) {
    const f = (t * 0.7 + q / 3 + seed * 0.37) % 1;
    ctx.fillStyle = rgba(P.acid, (1 - f) * (0.12 + open * 0.22));
    ell(ctx, 44 + f * 14 + Math.sin(f * 6 + seed) * 3, 2 - f * 16, 2 + f * 6, 1.6 + f * 4); ctx.fill();
  }
  ctx.restore();
  // acid drool
  if (open > 0.4 || e.throat > 0.3) {
    ctx.strokeStyle = rgba(P.acid, 0.8);
    ctx.lineWidth = 1.6;
    const dr = 8 + Math.sin(t * 5 + seed) * 4 + e.throat * 6;
    ctx.beginPath(); ctx.moveTo(26, 6); ctx.lineTo(27, 6 + dr); ctx.stroke();
    ctx.fillStyle = '#e4ffb0';
    ell(ctx, 27, 7 + dr, 1.6, 2.2); ctx.fill();
  }
  ctx.restore();
}

// A broken chain swinging from a collar.
function chain(ctx, x, y, a, n, fl) {
  const dx = Math.cos(a), dy = Math.sin(a);
  ctx.lineWidth = 2;
  for (let j = 0; j < n; j++) {
    const cx = x + dx * (j * 6.5 + 3), cy = y + dy * (j * 6.5 + 3);
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.lineWidth = 3.4;
    ell(ctx, cx, cy, j % 2 ? 4.4 : 4.2, j % 2 ? 1 : 2.6, a); ctx.stroke();
    ctx.strokeStyle = fl ? '#fff' : j % 2 ? '#8a8494' : '#a8a2b4';
    ctx.lineWidth = 1.8;
    ell(ctx, cx, cy, j % 2 ? 4.4 : 4.2, j % 2 ? 1 : 2.6, a); ctx.stroke();
  }
}

// Spiked iron collar across a neck at point p, with the neck's direction a and width w.
function collar(ctx, p, a, w, fl, t) {
  ctx.save();
  ctx.translate(p[0], p[1]);
  ctx.rotate(a);
  const g = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
  g.addColorStop(0, fl ? '#fff' : '#6e6878');
  g.addColorStop(0.4, fl ? '#fff' : '#3a3540');
  g.addColorStop(1, fl ? '#fff' : '#1c1a20');
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(0,0,0,.7)';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.rect(-4.5, -w / 2 - 3, 9, w + 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = fl ? '#fff' : '#cfc9db';
  for (const sy of [-1, 1]) {
    for (let q = 0; q < (sy < 0 ? 3 : 1); q++) {
      const ox = (q - (sy < 0 ? 1 : 0)) * 3.5;
      ctx.beginPath(); ctx.moveTo(ox - 2.4, sy * (w / 2 + 3)); ctx.lineTo(ox + 0.5, sy * (w / 2 + 12)); ctx.lineTo(ox + 2.4, sy * (w / 2 + 3)); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  ctx.fillStyle = fl ? '#fff' : '#9ef06a';
  for (let q = -1; q <= 1; q++) { ctx.beginPath(); ctx.arc(0, q * w * 0.3, 1.2, 0, TAU); ctx.fill(); }
  ctx.restore();
}

export function cerberus(ctx, b, t, fl, m) {
  const F = c => (fl ? '#fff' : c);
  const st = b.st, k = m.k, run = Math.abs(b.vx) > 30, air = !b.ground;
  const windup = st === 'charge' && b.stT > 0, charging = st === 'charge' && b.stT <= 0;
  const spitPh = st === 'spit' ? ((1.6 - b.stT) / 0.4) % 1 : 0;
  const intro = m.intro, roar = Math.sin(m.roar * Math.PI), dying = m.dying;
  const howl = intro < 1 ? sm((intro - 0.2) / 0.4) * (1 - sm((intro - 0.85) / 0.15)) : 0;
  const crouch = windup ? sm(k * 1.5) : st === 'leap' && !air && b.n === 0 ? 0.5 : intro < 1 ? 0.6 * (1 - sm(intro * 2)) : dying * 0.9;
  const stretch = charging ? 1 : 0;
  const ph = t * (run ? 15 : 2.5);
  const fur = F('#2a3120'), furL = F('#56663f'), furD = F('#10140b'), rim = F('#a8d46c'), bone = F('#ddd2b6');
  const EYE = m.enr ? '#ffc020' : '#c6ff4a';
  const ACID = m.enr ? ['#7aff3a', '#e4ff6b', '#ffffe8'] : ['#2aff5a', '#b6ff6b', '#f4ffd0'];
  const acid = m.enr ? '#e4ff6b' : '#b6ff6b';
  const heat = cl(1 + roar * 0.9 + (charging ? 0.35 : 0) + (m.enr ? 0.25 : 0) + howl * 0.4 - dying * 0.9, 0.05, 2.4);

  // Head expressions
  const base = { open: 0.22 + pulse(t, 2.5, -0.1, 0.1), brow: 0.3, lid: 0.05, ear: 0.3, tongue: 0, throat: 0, tilt: 0 };
  const snapC = Math.pow(Math.max(0, Math.sin(t * 1.7 + 1)), 12);
  let A = { ...base, brow: 0.15, ear: 0 }, B = { ...base, brow: 0.55 }, C = { ...base, open: 0.4 + Math.sin(t * 7) * 0.15 + snapC * 0.5, tongue: 0.8 * (1 - snapC), lid: 0.18, brow: snapC * 0.8 };
  C.tilt += Math.sin(t * 23) * 0.025 - snapC * 0.15;
  let mA = { ...m, lx: lerp(m.lx, Math.sin(t * 0.7), 0.45), ly: lerp(m.ly, Math.cos(t * 0.5) * 0.4, 0.45) };
  if (howl > 0) for (const e of [A, B, C]) { e.tilt -= howl * 0.8; e.open = Math.max(e.open, howl * 0.95); e.lid = Math.max(e.lid, howl * 0.6); e.tongue = 0; e.ear = 0.6; }
  if (windup) {
    const w = sm(k * 1.4);
    for (const e of [A, B, C]) { e.ear = 1; e.brow = 0.6 + w * 0.4; e.lid = 0.45 * w; e.open = 0.12; e.tongue = 0; e.tilt -= 0.28 * w; }
    mA = m;
  }
  if (charging) for (const e of [A, B, C]) { e.open = 0.95; e.ear = 1; e.brow = 0.9; e.tilt += 0.12; e.tongue = 0; e.lid = 0.1; }
  if (st === 'leap') for (const e of [A, B, C]) { e.open = 0.8; e.tilt -= air ? 0.4 : 0.1; e.ear = 0.2; e.tongue = 0; e.brow = 0.5; }
  let spitFwd = 0;
  if (st === 'spit') {
    const back = spitPh < 0.5 ? Math.sin(spitPh * Math.PI) : 0, fwd = spitPh >= 0.5 ? Math.sin((spitPh - 0.5) * 2 * Math.PI) : 0;
    spitFwd = fwd - back * 0.6;
    for (const e of [A, B, C]) { e.tilt += -0.32 * back + 0.22 * fwd; e.open = spitPh < 0.5 ? 0.25 + back * 0.2 : 1; e.throat = spitPh < 0.5 ? spitPh * 2 : 1 - (spitPh - 0.5) * 2; e.ear = 0.8; e.brow = 0.7; e.tongue = 0; e.lid = back * 0.4; }
    mA = m;
  }
  if (m.hurt > 0.3) for (const e of [A, B, C]) e.ear = 1;
  A = expr(m, A); B = expr(m, B); C = expr(m, C);
  C.lid = Math.max(C.lid, 0.5 * pulse(t, 1.3) * (1 - roar));
  const trail = charging ? 1 : m.enr ? 0.55 : roar * 0.8;

  // the ground under it smoulders
  if (heat > 1.1) glow(ctx, -8, -6, 90, acid, (heat - 1.1) * 0.25);
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ell(ctx, -8, 0, 96 + stretch * 12, 10); ctx.fill();
  ctx.save();
  ctx.translate(-12, 0);
  // rear up on the hind legs to howl; pitch with the leap
  if (howl > 0) { ctx.translate(-62, 0); ctx.rotate(-howl * 0.2); ctx.translate(62, 0); }
  if (air) { ctx.translate(0, -60); ctx.rotate(clamp((b.vy || 0) / 2600, -0.22, 0.22)); ctx.translate(0, 60); }
  if (charging) ctx.rotate(0.04);
  ctx.scale(1 + stretch * 0.08, 1 - crouch * 0.14 - stretch * 0.04);
  if (dying) ctx.rotate(dying * 0.08);
  const rearing = howl > 0.2;

  // serpent tail: lashes faster when excited, hangs limp when dying
  const excite = charging || windup ? 2.2 : m.enr ? 1.5 : 1;
  const tp = [];
  for (let i = 0; i <= 14; i++) {
    const u = i / 14, wv = Math.sin(t * 3 * excite - u * 6) * 9 * u * (1 - dying);
    tp.push([-80 - Math.sin(u * Math.PI * 0.85) * 44 + u * 18 + wv * 0.5, -76 - u * 52 + wv * 0.4 + dying * u * u * 70 + (charging ? u * u * 18 : 0)]);
  }
  const tg = ctx.createLinearGradient(-80, -76, -100, -130);
  tg.addColorStop(0, fur);
  tg.addColorStop(1, F('#3d5a2a'));
  const tE = tube(ctx, tp, 17, 7, tg, 'rgba(0,0,0,.8)', 2.6);
  ctx.strokeStyle = rgba(rim, 0.45);
  ctx.lineWidth = 1.4;
  ctx.beginPath(); tE.L.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.4)';
  ctx.lineWidth = 1;
  for (let i = 2; i < 13; i++) { ctx.beginPath(); ctx.moveTo(tE.L[i][0], tE.L[i][1]); ctx.quadraticCurveTo(tp[i + 1][0], tp[i + 1][1], tE.R[i][0], tE.R[i][1]); ctx.stroke(); }
  // the serpent's head: a hooded viper that hisses at the player
  {
    const [sx, sy] = tp[14], [px, py] = tp[12];
    const sa = Math.atan2(sy - py, sx - px) * 0.5 + (-0.5 + m.ly * 0.3) * 0.5;
    const hiss = Math.max(0, Math.sin(t * 2.3 + 2)) ** 3 * (1 - dying);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(sa);
    ctx.scale(1.5, 1.5);
    ctx.fillStyle = F('#2c4220');
    ctx.strokeStyle = 'rgba(0,0,0,.75)';
    ctx.lineWidth = 1.5;
    ell(ctx, -3, 0, 7, 12 + hiss * 2); ctx.fill(); ctx.stroke();
    eye(ctx, -4, -6, 1.6, acid, '#fff', 2);
    eye(ctx, -4, 6, 1.6, acid, '#fff', 2);
    ctx.save();
    ctx.translate(4, 1.5);
    ctx.rotate(0.15 + hiss * 0.6);
    ctx.fillStyle = F('#2c4220');
    ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(14, 0.5); ctx.lineTo(12, 3.5); ctx.lineTo(-1, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    if (hiss > 0.2 || (t * 1.7) % 1 < 0.25) {
      ctx.strokeStyle = F('#ff3a5a');
      ctx.lineWidth = 1.1;
      const fl2 = Math.sin(t * 40) * 1.5;
      ctx.beginPath(); ctx.moveTo(16, 1); ctx.lineTo(23, 1 + fl2); ctx.lineTo(27, -1 + fl2); ctx.moveTo(23, 1 + fl2); ctx.lineTo(27, 3 + fl2); ctx.stroke();
    }
    ctx.fillStyle = F('#3d5a2a');
    ctx.beginPath(); ctx.moveTo(-4, -5); ctx.quadraticCurveTo(8, -6, 17, -1); ctx.lineTo(16, 1.5); ctx.lineTo(-2, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff6e6';
    ctx.beginPath(); ctx.moveTo(12, 1); ctx.lineTo(13, 5 + hiss * 3); ctx.lineTo(14.5, 1); ctx.fill();
    eye(ctx, 7, -2.6, 1.5, EYE, '#fff', 2.5);
    ctx.restore();
  }

  // legs: a gallop, a crouch, rearing, or stretched out in the air
  const paw = (x, y, near) => {
    ctx.fillStyle = near ? fur : furD;
    ctx.strokeStyle = 'rgba(0,0,0,.7)';
    ctx.lineWidth = 1.5;
    ell(ctx, x + 4, y - 4, 10, 5.5); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = bone;
    ctx.lineWidth = 2.6;
    for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.moveTo(x + 8 + q * 2, y - 5 + q * 1.5); ctx.quadraticCurveTo(x + 16 + q * 2, y - 6 + q * 2, x + 17 + q * 2.5, y + 1); ctx.stroke(); }
    if (heat > 1.2 && near) flame(ctx, x + 6, y, 18, 16 * (heat - 1), t, ACID, x, 3);
  };
  const seg = (pts, ws, col) => {
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,.7)';
    for (let i = 1; i < pts.length; i++) { ctx.lineWidth = ws[i - 1] + 3; ctx.beginPath(); ctx.moveTo(...pts[i - 1]); ctx.lineTo(...pts[i]); ctx.stroke(); }
    ctx.strokeStyle = col;
    for (let i = 1; i < pts.length; i++) { ctx.lineWidth = ws[i - 1]; ctx.beginPath(); ctx.moveTo(...pts[i - 1]); ctx.lineTo(...pts[i]); ctx.stroke(); }
  };
  const fore = (x, p, near) => {
    let s = Math.sin(p), lift = Math.max(0, Math.cos(p)) * 10;
    if (air) { s = 1.2; lift = 10; }
    if (rearing) { s = 0.8 + Math.sin(t * 9 + x) * 0.5; lift = 18 + Math.cos(t * 9 + x) * 6; }
    const bend = crouch * 10;
    const pts = [[x, -76], [x + 4 + s * 8 - bend, -46], [x + 6 + s * 16 - bend * 0.3, -16 - lift * 0.6], [x + 10 + s * 20, -lift]];
    seg(pts, [20, 15, 12], near ? fur : furD);
    paw(pts[3][0], pts[3][1] + 2, near);
  };
  const hind = (x, p, near) => {
    let s = Math.sin(p), lift = Math.max(0, Math.cos(p)) * 10;
    if (air) { s = -1.2; lift = 8; }
    const bend = crouch * 12;
    const pts = [[x, -80], [x + 16 + s * 8, -50 + bend * 0.4], [x - 8 + s * 12 - bend, -24 - lift * 0.5], [x + 2 + s * 18, -lift]];
    seg(pts, [26, 17, 12], near ? fur : furD);
    paw(pts[3][0], pts[3][1] + 2, near);
  };
  hind(-50, ph + 0.6, false);
  fore(38, ph + Math.PI + 0.6, false);

  // acid fire along the spine, streaming back when it charges
  ctx.save();
  if (charging) ctx.transform(1, 0, -0.45, 1, 0, 0);
  for (let q = 0; q < 8; q++) {
    const u = q / 7, x = -66 + u * 116, y = -98 - Math.sin(u * Math.PI) * 6 - (u > 0.7 ? (u - 0.7) * 40 : 0);
    flame(ctx, x, y + 2, 30, (44 + (q % 2) * 16 + (u > 0.7 ? 20 : 0)) * heat, t, ACID, q * 1.7, 3);
  }
  ctx.restore();

  // body: deep chest, high shoulders, a tucked waist and heavy haunches
  const br = Math.sin(t * 2.2) * (windup ? 3 : 1.5) + (rearing ? 2 : 0);
  const body = new Path2D();
  body.moveTo(-86, -70);
  body.bezierCurveTo(-90, -92 - br, -74, -102 - br, -56, -100 - br);
  body.bezierCurveTo(-36, -98 - br, -20, -92 - br, 0, -96 - br);
  body.bezierCurveTo(18, -100 - br, 34, -114 - br, 56, -110 - br);
  body.bezierCurveTo(74, -106, 82, -86, 78, -66);
  body.bezierCurveTo(74, -50, 62, -42, 48, -42);
  body.bezierCurveTo(30, -42, 12, -52, -8, -54);
  body.bezierCurveTo(-30, -56, -50, -50, -66, -48);
  body.bezierCurveTo(-80, -50, -86, -60, -86, -70);
  body.closePath();
  ctx.strokeStyle = 'rgba(0,0,0,.8)';
  ctx.lineWidth = 4;
  ctx.stroke(body);
  const g = ctx.createLinearGradient(0, -114, 0, -42);
  g.addColorStop(0, furL);
  g.addColorStop(0.45, fur);
  g.addColorStop(1, furD);
  ctx.fillStyle = g;
  ctx.fill(body);
  ctx.save();
  ctx.clip(body);
  // muscle shading: shoulder and haunch
  for (const [x, y, r] of [[46, -88, 30], [-62, -82, 28]]) {
    const mg = ctx.createRadialGradient(x - 6, y - 10, 2, x, y, r);
    mg.addColorStop(0, fl ? 'rgba(255,255,255,0)' : 'rgba(150,190,100,.28)');
    mg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mg;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.strokeStyle = 'rgba(0,0,0,.4)';
  ctx.lineWidth = 2;
  for (let q = 0; q < 4; q++) { ctx.beginPath(); ctx.moveTo(-6 + q * 10, -92 + q * 0.5); ctx.quadraticCurveTo(-2 + q * 10, -70, -8 + q * 10, -52); ctx.stroke(); }
  ctx.beginPath(); ctx.arc(-60, -78, 22, -2.4, 0.6); ctx.stroke();
  ctx.beginPath(); ctx.arc(46, -84, 20, -1.2, 2.2); ctx.stroke();
  ctx.restore();
  // rim light across the back
  ctx.strokeStyle = rgba(rim, 0.5);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-84, -82);
  ctx.bezierCurveTo(-78, -98 - br, -68, -101 - br, -56, -100 - br);
  ctx.bezierCurveTo(-36, -98 - br, -20, -92 - br, 0, -96 - br);
  ctx.bezierCurveTo(18, -100 - br, 34, -114 - br, 56, -110 - br);
  ctx.stroke();
  // shaggy fur along the chest and belly
  ctx.fillStyle = furD;
  ctx.beginPath();
  for (let q = 0; q < 9; q++) {
    const x = 70 - q * 7, y = q < 4 ? -46 + (q === 0 ? -6 : 0) : -48 - (q - 4) * 1.5, l = 9 + (q % 2) * 5;
    ctx.moveTo(x + 4, y - 4); ctx.lineTo(x - 1, y + l); ctx.lineTo(x - 4, y - 4);
  }
  ctx.fill();
  // glowing acid cracks, racing when enraged
  const vp = (0.55 + Math.sin(t * (m.enr ? 7 : 3)) * 0.3) * heat;
  const CR = [[[-80, -74], [-68, -82], [-60, -72], [-48, -80], [-38, -70]], [[-60, -72], [-58, -60]], [[-22, -86], [-10, -76], [4, -84], [18, -74]], [[4, -84], [8, -94]], [[28, -98], [40, -88], [56, -96], [68, -82]], [[40, -88], [38, -72], [50, -62]]];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [w, a] of [[5 + heat * 2, 0.22], [1.6, 0.9]]) {
    ctx.strokeStyle = rgba(w > 3 ? acid : '#f4ffd0', cl(vp * a));
    ctx.lineWidth = w;
    ctx.beginPath();
    for (const c of CR) c.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
  ctx.restore();
  // bone spines down the back
  const SP = [[-74, -97, 10], [-60, -101, 13], [-44, -99, 14], [-28, -95, 13], [-12, -96, 14], [4, -99, 16], [20, -105, 18], [36, -111, 19]];
  for (const [x, y0, h] of SP) {
    const y = y0 - br, hh = h * (1 + roar * 0.3);
    const sg = ctx.createLinearGradient(x, y, x - 6, y - hh);
    sg.addColorStop(0, F('#3a3226'));
    sg.addColorStop(1, bone);
    ctx.fillStyle = sg;
    ctx.strokeStyle = 'rgba(0,0,0,.75)';
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(x - 5, y + 3); ctx.quadraticCurveTo(x - 3, y - hh * 0.6, x - 7, y - hh); ctx.quadraticCurveTo(x + 1, y - hh * 0.5, x + 5, y + 3); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // near hind leg and its heavy thigh
  hind(-66, ph, true);
  {
    const tg2 = ctx.createLinearGradient(-70, -100, -60, -52);
    tg2.addColorStop(0, furL);
    tg2.addColorStop(0.5, fur);
    tg2.addColorStop(1, rgba(fl ? '#ffffff' : '#2a3120', 0));
    const th = new Path2D();
    th.moveTo(-84, -76);
    th.bezierCurveTo(-86, -98, -60, -104, -46, -90);
    th.bezierCurveTo(-38, -80, -42, -62, -50, -52);
    th.bezierCurveTo(-60, -50, -74, -56, -84, -76);
    ctx.fillStyle = tg2;
    ctx.fill(th);
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-46, -90); ctx.bezierCurveTo(-38, -80, -42, -62, -50, -52); ctx.stroke();
    ctx.strokeStyle = rgba(rim, 0.45);
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-82, -84); ctx.bezierCurveTo(-78, -98, -60, -102, -48, -92); ctx.stroke();
  }

  // three heads on thick collared necks: pulled back in a wind-up, thrust forward in a charge
  const hx = windup ? -12 * sm(k * 1.4) : charging ? 16 : spitFwd * 8;
  const hy = windup ? 6 : charging ? 4 : 0;
  const swing = Math.PI / 2 + Math.sin(t * 2.6) * 0.3 - (charging ? 0.9 : 0) - clamp((b.vx || 0) * 0.0008, -0.6, 0.6);
  const HEADS = [
    { e: A, mm: mA, base: [36, -100], head: [70 + Math.sin(t * 1.3) * 3, -128 + Math.sin(t * 2 + 1) * 3], s: 1.22, ang: -0.38 + Math.sin(t * 2 + 1) * 0.06, dim: -0.25, seed: 1, w: [30, 22] },
    { e: B, mm: m, base: [50, -88], head: [94, -100 + Math.sin(t * 2.2) * 2], s: 1.36, ang: -0.06 + Math.sin(t * 2.2) * 0.05, dim: 0, seed: 2, w: [34, 24], scar: true },
    { e: C, mm: m, base: [50, -70], head: [84 + Math.sin(t * 23) * 0.8, -66 + Math.sin(t * 1.8 + 2) * 3], s: 1.18, ang: 0.3 + Math.sin(t * 1.8 + 2) * 0.06, dim: -0.1, seed: 3, w: [30, 21] },
  ];
  HEADS.forEach((H, i) => {
    if (i === 1) {
      // near foreleg sits between the far head and the near two
      fore(52, ph + Math.PI, true);
      const sg = ctx.createLinearGradient(46, -104, 50, -58);
      sg.addColorStop(0, furL);
      sg.addColorStop(0.55, fur);
      sg.addColorStop(1, rgba(fl ? '#ffffff' : '#2a3120', 0));
      ctx.fillStyle = sg;
      ell(ctx, 50, -82, 17, 24, -0.25); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.5)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(50, -82, 17, 24, -0.25, -0.3, 1.4); ctx.stroke();
    }
    const end = [H.head[0] + hx, H.head[1] + hy];
    const mid = [(H.base[0] + end[0]) / 2 - 6, (H.base[1] + end[1]) / 2 - 10];
    const pts = bez(H.base, mid, end, 10);
    const ng = ctx.createLinearGradient(H.base[0], H.base[1] - 10, end[0], end[1] + 10);
    ng.addColorStop(0, F(shade('#2c3422', H.dim)));
    ng.addColorStop(1, F(shade('#1c2116', H.dim)));
    const ne = tube(ctx, pts, H.w[0], H.w[1], ng, 'rgba(0,0,0,.8)', 3);
    // mane bristling along the top of the neck
    ctx.fillStyle = F(shade('#0e120a', H.dim));
    ctx.beginPath();
    for (let q = 1; q < 9; q++) {
      const [x, y] = ne.L[q], [x2, y2] = ne.L[q + 1], l = 7 + (q % 2) * 4 + roar * 4;
      ctx.moveTo(x, y); ctx.lineTo(x - 5, y - l); ctx.lineTo(x2, y2);
    }
    ctx.fill();
    ctx.strokeStyle = rgba(rim, 0.4);
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ne.L.slice(1, 9).forEach(([x, y], q) => (q ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    const ci = 4, ca = Math.atan2(pts[ci + 1][1] - pts[ci - 1][1], pts[ci + 1][0] - pts[ci - 1][0]);
    collar(ctx, pts[ci], ca, H.w[0] * 0.85, fl, t);
    const cb = [pts[ci][0] - Math.sin(ca) * -H.w[0] * 0.48, pts[ci][1] + Math.cos(ca) * H.w[0] * 0.48];
    if (i > 0) chain(ctx, cb[0], cb[1], swing + i * 0.2, i === 1 ? 5 : 4, fl);
    houndHead(ctx, end[0] - 2, end[1], H.s, H.ang, H.e, t, fl, H.dim, H.seed, H.mm, { eye: EYE, acid, trail, scar: H.scar });
  });
  // embers drifting up off the fire
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let q = 0; q < 10; q++) {
    const f = (t * 0.45 + q * 0.137) % 1, x = -70 + ((q * 47) % 130) + Math.sin(t * 2 + q) * 6;
    ctx.fillStyle = rgba(q % 3 ? acid : '#ffffe0', (1 - f) * 0.8 * cl(heat));
    ctx.fillRect(x, -104 - f * 70, 2, 2);
  }
  ctx.restore();
  if (st === 'spit') glow(ctx, 130, -90, 70, acid, 0.3);
  if (roar > 0 || howl > 0) glow(ctx, 96, -100, 130, acid, Math.max(roar, howl) * 0.4);
  ctx.restore();
}

// ---------- Semiramis: Queen of the Endless Storm ----------
// Blade-feathered wings, a storm vortex for a body, a halo of thorns and black horns.
function stormWing(ctx, s, upper, t, flap, enr, fl, W) {
  const N = upper ? 10 : 7, L0 = (upper ? 128 : 82) * W.len;
  const sweep = s > 0 ? -1.3 * W.sweep : 0.25 * W.sweep;
  const base = (upper ? -0.3 + flap * 0.14 : 0.42 + flap * 0.08) + W.raise + sweep + W.droop, fan = (upper ? 1.15 : 0.85) * W.spread;
  const edge = enr ? '#ff3a6a' : '#ff6fd8';
  for (let i = N - 1; i >= 0; i--) {
    const k = i / (N - 1), a = base + (upper ? -k : k) * fan * (upper ? 0.85 : 0.9) + (upper ? 0 : -0.2);
    const len = L0 * (upper ? 1 - 0.4 * k : 0.95 - 0.35 * k) * (1 + Math.sin(t * 3 + i) * 0.02);
    const dx = Math.cos(a) * s, dy = Math.sin(a), nx = -dy, ny = dx * s;
    const rx = s * 6, ry = -36 + (upper ? 0 : 10);
    const tx = rx + dx * len, ty = ry + dy * len, w = 6.5 - k * 1.5;
    const g = ctx.createLinearGradient(rx, ry, tx, ty);
    g.addColorStop(0, fl ? '#fff' : '#1c0626');
    g.addColorStop(0.65, fl ? '#fff' : '#4a1260');
    g.addColorStop(1, fl ? '#fff' : edge);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(rx + nx * w * 0.4 * s, ry + ny * w * 0.4);
    ctx.quadraticCurveTo(rx + dx * len * 0.55 + nx * w * s, ry + dy * len * 0.55 + ny * w, tx, ty);
    ctx.quadraticCurveTo(rx + dx * len * 0.6 - nx * w * 0.5 * s, ry + dy * len * 0.6 - ny * w * 0.5, rx - nx * w * 0.3 * s, ry - ny * w * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(edge, 0.55);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(rx + dx * len * 0.45, ry + dy * len * 0.45);
    ctx.quadraticCurveTo(rx + dx * len * 0.75 + nx * w * 0.6 * s, ry + dy * len * 0.75 + ny * w * 0.6, tx, ty);
    ctx.stroke();
    ctx.restore();
    if (upper && i % 3 === 0) glow(ctx, tx, ty, 10, edge, 0.5 * W.len);
  }
  if (Math.random() < 0.12 * W.len) {
    const a = base + (upper ? -0.3 : 0.3), len = L0 * 0.8;
    lightning(ctx, s * 6, -36, s * 6 + Math.cos(a) * s * len, -36 + Math.sin(a) * len, '#ffb0f0', 1.2, 6, 10);
  }
}

// Her mouth: a smirk, parted lips, a grin with fangs, or a scream.
function stormLips(ctx, e, fl, enr) {
  const open = e.open, grin = e.grin || 0;
  if (open < 0.15) {
    ctx.fillStyle = '#6a0a3a';
    ctx.beginPath();
    ctx.moveTo(-0.5, -51.5); ctx.quadraticCurveTo(3, -50 - grin * 1.5, 6.5, -52 - grin); ctx.quadraticCurveTo(3, -49, -0.5, -51.5);
    ctx.fill();
    return;
  }
  ctx.fillStyle = '#2a0412';
  ctx.strokeStyle = '#6a0a3a';
  ctx.lineWidth = 1;
  const w = 3.2 + grin * 1.2, h = 1 + open * 4.5;
  ell(ctx, 3, -50.5, w, h); ctx.fill(); ctx.stroke();
  if (open > 0.3) {
    ctx.fillStyle = '#fff6e6';
    for (const fx of [1, 5]) { ctx.beginPath(); ctx.moveTo(fx - 0.8, -50.5 - h + 0.5); ctx.lineTo(fx, -50.5 - h + 2.2 + (enr ? 0.8 : 0)); ctx.lineTo(fx + 0.8, -50.5 - h + 0.5); ctx.fill(); }
  }
  if (open > 0.6) glow(ctx, 3, -50, 7, enr ? '#ff3a6a' : '#ff6fd8', (open - 0.6) * 1.2);
}

export function storm(ctx, b, t, fl, m) {
  ctx.translate(0, -b.h / 2);
  const st = b.st, k = m.k, enr = m.enr, intro = sm(m.intro), dying = m.dying, roar = Math.sin(m.roar * Math.PI);
  const cast = st === 'bolts' || st === 'orbs' || st === 'summon' || st === 'gust', gust = st === 'gust';
  const dive = st === 'dive' && b.n > 0 && b.stT < 0.8 ? 1 : st === 'dive' ? sm(k / 0.4) : 0;
  const PINK = enr ? '#ff3a6a' : '#ff4fd8', EYE = enr ? '#ff2a3a' : '#ffd6ff';
  const flapF = gust ? 5 : 2.2, flap = Math.sin(t * flapF) * (gust ? 1.8 : 1);
  glow(ctx, 0, -14, 200 * intro, PINK, (enr ? 0.32 : 0.24) + roar * 0.2);

  // Expression and pose per state
  let e = { open: 0.05, brow: 0.1, lid: 0.15, tilt: 0.05, grin: 0.4 };
  const W = { len: intro, spread: 1, raise: 0, sweep: 0, droop: dying * 0.9 };
  let lh = [-22 + Math.sin(t * 1.6) * 2, -22 + Math.sin(t * 2) * 2], rh = [30, -34 + Math.sin(t * 1.8) * 3], lean = 0;
  if (st === 'bolts') { e = { open: 0.3, brow: 0.7, lid: 0.35, tilt: -0.12, grin: 0 }; W.spread = 1.15; W.len = 1.1; W.raise = -0.25; lh = [-30, -86]; rh = [34, -82]; }
  else if (st === 'orbs') { e = { open: 0.55, brow: 0.5, lid: 0.2, tilt: 0.02, grin: 1 }; W.spread = 1.1; W.raise = -0.15; lh = [-30, -62]; rh = [34, -56]; }
  else if (gust) { e = { open: 0.75, brow: 0.3, lid: 0.55, tilt: -0.05, grin: 0 }; W.spread = 1.25; lh = [-40, -40 + flap * 6]; rh = [42, -38 + flap * 6]; }
  else if (st === 'summon') { e = { open: 0.3, brow: -0.4, lid: 0, tilt: -0.08, grin: 0.8 }; W.raise = -0.4; W.spread = 1.1; lh = [-26, -30]; rh = [30, -96]; }
  else if (st === 'dive') { e = { open: dive, brow: 0.9, lid: 0.1, tilt: 0.3 * dive, grin: 0.3 }; W.sweep = dive; W.len = 1 + dive * 0.1; lean = dive * 0.45; lh = [8 + dive * 40, -40 - dive * 10]; rh = [20 + dive * 40, -44 - dive * 6]; }
  if (intro < 1) { e.lid = Math.max(e.lid, 1 - intro); e.brow = -0.3; e.open = 0.1; lh = [-14, -28]; rh = [16, -30]; }
  e = expr(m, e);
  if (dying) { e.tilt += dying * 0.3; W.spread = 1 - dying * 0.5; lh = [lh[0], lh[1] + dying * 40]; rh = [rh[0], rh[1] + dying * 50]; }
  const castNow = cast && !dying;

  ctx.save();
  ctx.rotate(lean * (m.ly > 0 ? 1 : 0.5));

  // Storm vortex for a lower body
  const spread = (gust ? 1.5 : 1) * (1 - dying * 0.7) * (0.4 + intro * 0.6);
  const funnel = new Path2D();
  funnel.moveTo(-16, -6);
  for (let q = 0; q <= 10; q++) { const u = q / 10; funnel.lineTo(-(16 + u * 54 * spread) + Math.sin(t * 3 + u * 6) * 6 * u, -6 + u * 104); }
  for (let q = 10; q >= 0; q--) { const u = q / 10; funnel.lineTo(16 + u * 54 * spread + Math.sin(t * 3.4 + u * 6 + 2) * 6 * u, -6 + u * 104); }
  funnel.closePath();
  const fg = ctx.createLinearGradient(0, -6, 0, 100);
  fg.addColorStop(0, fl ? '#fff' : '#3a0c4a');
  fg.addColorStop(0.6, fl ? '#fff' : 'rgba(40,8,52,.75)');
  fg.addColorStop(1, 'rgba(40,8,52,0)');
  ctx.fillStyle = fg;
  ctx.fill(funnel);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let q = 0; q < 9; q++) {
    const u = q / 8, y = 2 + u * 92, rx = (20 + u * 54) * spread, a0 = t * (3 + u * 2 + (gust ? 4 : 0)) + q * 1.3;
    ctx.strokeStyle = rgba(q % 3 ? '#c45cff' : PINK, 0.35 * (1 - u * 0.6));
    ctx.lineWidth = 2.5 - u;
    ctx.beginPath();
    ctx.ellipse(Math.sin(t * 2 + q) * 4 * u, y, rx, 6 + u * 5, 0, a0 % TAU, (a0 % TAU) + 2.2);
    ctx.stroke();
  }
  ctx.restore();
  if (Math.random() < (enr ? 0.5 : 0.3) * (1 - dying)) lightning(ctx, (Math.random() - 0.5) * 50, 10 + Math.random() * 20, (Math.random() - 0.5) * 110, 70 + Math.random() * 30, '#ff9ae8', 1.2, 6, 12);

  // Wings: two pairs, back pair first
  for (const s of [-1, 1]) stormWing(ctx, s, false, t, flap, enr, fl, W);
  for (const s of [-1, 1]) stormWing(ctx, s, true, t, flap, enr, fl, W);

  // Halo of thorns: spins faster as she casts, shatters as she dies
  if (dying < 0.9) {
    ctx.save();
    ctx.translate(0, -64 - dying * 30);
    ctx.rotate(t * (0.4 + (cast ? 1.6 : 0)));
    ctx.globalAlpha = (1 - dying) * intro;
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba('#ffd34a', 0.8);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 26 + dying * 40, 0, TAU); ctx.stroke();
    ctx.fillStyle = rgba(PINK, 0.85);
    for (let q = 0; q < 14; q++) {
      const a = (q * TAU) / 14, r1 = 26 + dying * 40, r2 = r1 + (q % 2 ? 9 : 15) + roar * 8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.08) * r1, Math.sin(a - 0.08) * r1);
      ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      ctx.lineTo(Math.cos(a + 0.08) * r1, Math.sin(a + 0.08) * r1);
      ctx.fill();
    }
    ctx.restore();
    glow(ctx, 0, -64, 46, '#ffd34a', 0.25 * (1 - dying));
  }

  // Gown and veils flowing into the vortex
  const skirt = new Path2D();
  skirt.moveTo(-10, -14);
  skirt.lineTo(10, -14);
  for (let q = 0; q <= 6; q++) skirt.lineTo(30 - q * 10, 40 + Math.sin(t * 4 + q) * 6 + (q % 2) * 8);
  skirt.closePath();
  const sg = ctx.createLinearGradient(0, -14, 0, 50);
  sg.addColorStop(0, fl ? '#fff' : '#5a0a5a');
  sg.addColorStop(1, 'rgba(90,10,90,0)');
  ctx.fillStyle = sg;
  ctx.fill(skirt);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rgba(PINK, 0.12);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 8, -30);
    ctx.quadraticCurveTo(s * 40 + Math.sin(t * 2) * 8, 0, s * 26 + Math.sin(t * 2.5) * 12, 50);
    ctx.lineTo(s * 4, 20);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Corset armour with gold filigree and a heart gem that beats faster as she weakens
  ctx.fillStyle = fl ? '#fff' : '#1c0420';
  ctx.strokeStyle = '#f2c14e';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-12, -42); ctx.quadraticCurveTo(0, -47, 12, -42); ctx.lineTo(9, -14); ctx.quadraticCurveTo(0, -10, -9, -14); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-8, -38); ctx.quadraticCurveTo(-2, -30, -6, -18); ctx.moveTo(8, -38); ctx.quadraticCurveTo(2, -30, 6, -18);
  ctx.stroke();
  const beat = pulse(t, enr ? 9 : 4, 0.8, 1.15);
  ctx.save();
  ctx.translate(0, -29); ctx.scale(beat, beat); ctx.translate(0, 29);
  ctx.fillStyle = fl ? '#fff' : PINK;
  ctx.beginPath(); ctx.moveTo(0, -24); ctx.bezierCurveTo(-6, -29, -4, -35, 0, -31); ctx.bezierCurveTo(4, -35, 6, -29, 0, -24); ctx.fill();
  ctx.restore();
  glow(ctx, 0, -29, 14 * beat, PINK, 0.8);
  ctx.fillStyle = '#f2c14e';
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(s * 9, -43); ctx.quadraticCurveTo(s * 18, -48, s * 19, -40); ctx.lineTo(s * 24, -46); ctx.lineTo(s * 17, -36); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = '#f2c14e';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(0, -46, 6, 0.3, Math.PI - 0.3); ctx.stroke();
  eye(ctx, 0, -40.5, 1.4, PINK, '#fff', 3);

  // Arms, with lightning dancing between her hands when she casts
  const skin = fl ? '#fff' : '#f4d8e8';
  limb(ctx, [[-11, -40], [(-11 + lh[0]) / 2 - 8, (-40 + lh[1]) / 2 + (castNow ? -6 : 4)], lh], 4.2, skin, 'rgba(60,20,60,.6)');
  limb(ctx, [[11, -40], [(11 + rh[0]) / 2 + 6, (-40 + rh[1]) / 2 + (castNow ? -8 : 4)], rh], 4.2, skin, 'rgba(60,20,60,.6)');
  ctx.fillStyle = '#f2c14e';
  for (const [hx, hy] of [lh, rh]) ctx.fillRect(hx - 3, hy + 4, 6, 3);
  for (const [hx, hy] of [lh, rh]) {
    glow(ctx, hx, hy, castNow ? 34 : 18, '#ffb0f0', (castNow ? 0.75 : 0.5) * (1 - dying));
    eye(ctx, hx, hy, castNow ? 4.5 + Math.sin(t * 30) : 2.6, '#ffd6ff', '#ffffff', 2);
  }
  if (castNow) {
    lightning(ctx, lh[0], lh[1], rh[0], rh[1], '#ffd6ff', 1.6, 9, 16);
    if (Math.random() < 0.6) lightning(ctx, rh[0], rh[1], rh[0] + (Math.random() - 0.5) * 50, rh[1] - 70 - Math.random() * 50, '#ffd6ff', 1.4, 6, 12);
    if (Math.random() < 0.6) lightning(ctx, lh[0], lh[1], lh[0] + (Math.random() - 0.5) * 50, lh[1] - 70 - Math.random() * 50, '#ffd6ff', 1.4, 6, 12);
  } else if (Math.random() < 0.3 * (1 - dying)) lightning(ctx, rh[0], rh[1], rh[0] + 14, rh[1] + 18, '#ffd6ff', 1, 4, 6);

  // Head group: hair, face, horns and circlet turn together
  ctx.save();
  ctx.translate(1, -46);
  ctx.rotate(e.tilt + m.lx * 0.04 + m.ly * 0.06);
  ctx.translate(-1, 46);
  // Long hair streaming in the storm wind
  for (let i = 0; i < 11; i++) {
    const pts = [];
    for (let s = 0; s <= 8; s++) {
      const u = s / 8;
      pts.push([-1 - u * (34 + i * 5) * (dive ? 1.3 : 1) + Math.sin(t * 2.2 + i) * 3, -64 + u * (22 + i * 6 + dying * 30) + Math.sin(t * 3.6 + i * 0.8 - u * 5) * u * 11]);
    }
    strand(ctx, pts, 5.5, 1.4, fl ? '#fff' : i % 4 === 0 ? '#c42a8a' : i % 2 ? '#2a0832' : '#4a0e50');
  }
  // Face
  ctx.fillStyle = skin;
  ctx.strokeStyle = 'rgba(60,20,60,.65)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-8, -56); ctx.quadraticCurveTo(-9, -69, 1, -70); ctx.quadraticCurveTo(11, -69, 9.5, -57); ctx.quadraticCurveTo(6, -46, 1, -45.5); ctx.quadraticCurveTo(-5, -47, -8, -56); ctx.closePath();
  ctx.fill(); ctx.stroke();
  // cheek flush and brow
  ctx.fillStyle = 'rgba(255,120,190,.3)';
  ctx.beginPath(); ctx.arc(6.5, -55, 2.2, 0, TAU); ctx.fill();
  gaze(ctx, 5, -59.5, 1.7, EYE, m, e, { skin, nx: 1, browCol: '#2a0a2a', browW: 1.3, look: 0.3 });
  gaze(ctx, -2.5, -59.5, 1.5, EYE, m, e, { skin, nx: 1, browCol: '#2a0a2a', browW: 1.3, look: 0.3 });
  stormLips(ctx, e, fl, enr);
  eye(ctx, -6.5, -52, 1.2, PINK, '#fff', 3);
  // Horns of black glass with glowing tips, and a gold circlet
  for (const s of [-1, 1]) {
    const bx = s * 6 + 1, tipX = s * 26 + 1, tipY = -96;
    const hg = ctx.createLinearGradient(bx, -68, tipX, tipY);
    hg.addColorStop(0, fl ? '#fff' : '#0e0412');
    hg.addColorStop(1, fl ? '#fff' : '#4a1250');
    ctx.fillStyle = hg;
    ctx.strokeStyle = 'rgba(255,110,210,.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx - s * 3, -67);
    ctx.bezierCurveTo(bx + s * 2, -84, tipX - s * 14, -86, tipX, tipY);
    ctx.bezierCurveTo(tipX - s * 10, -82, bx + s * 8, -78, bx + s * 4, -66);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    eye(ctx, tipX, tipY, 2 + roar, PINK, '#ffffff', 4);
  }
  ctx.fillStyle = fl ? '#fff' : '#f2c14e';
  ctx.strokeStyle = '#8a5a10';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-8, -66); ctx.lineTo(-6, -73); ctx.lineTo(-2.5, -68); ctx.lineTo(1, -78); ctx.lineTo(4.5, -68); ctx.lineTo(8, -73); ctx.lineTo(10, -66); ctx.closePath();
  ctx.fill(); ctx.stroke();
  eye(ctx, 1, -71, 1.8, PINK, '#fff', 3.5);
  ctx.restore();
  ctx.restore();

  // Orbiting petals and sparks, scattering as she dies
  for (let i = 0; i < 14; i++) {
    const a = t * (1.4 + (i % 3) * 0.3) + (i * TAU) / 14, rr = (86 + (i % 3) * 14) * (1 + dying * 3), x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.36 - 10;
    if (i % 4 === 0) glow(ctx, x, y, 8, PINK, 0.7 * (1 - dying));
    else {
      ctx.fillStyle = i % 3 ? '#ff8ad8' : '#ffd1f0';
      ell(ctx, x, y, 6, 2.4, a + t); ctx.fill();
    }
  }
}

// ---------- Farinata: a lich rising from a sarcophagus of fire ----------
export function heretic(ctx, b, t, fl, m) {
  const F = c => (fl ? '#fff' : c);
  const st = b.st, k = m.k, intro = sm(m.intro), dying = m.dying, roar = Math.sin(m.roar * Math.PI);
  const FIRE = m.enr ? ['#ff2a00', '#ffb01a', '#fffbe0'] : ['#ff2a00', '#ff9a1a', '#fff3a0'];
  const BONE = F('#d8c8a8'), BONE_D = F('#9a8a6a');
  ctx.translate(0, -b.h / 2 + Math.sin(t * 2) * 4 * (1 - dying));
  const heat = (1 + roar * 0.8 + (m.enr ? 0.25 : 0)) * (1 - dying * 0.9);

  // Pose and expression per state
  let e = { open: 0.12 + pulse(t, 5, 0, 0.08), brow: 0.4, lid: 0.1, tilt: 0 };
  let lh = [-38 + Math.sin(t * 1.3) * 3, -36 + Math.sin(t * 1.7) * 4], rh = [38 + Math.sin(t * 1.5) * 3, -36 + Math.sin(t * 1.9) * 4];
  let claw = 0.5, heart = 0.3, flare = 0.3, lean = 0, rattle = 0;
  if (st === 'ring') { const w = sm(k * 2); lh = [-30 - w * 28, -40 - w * 18]; rh = [30 + w * 28, -40 - w * 18]; claw = 1; heart = 1; flare = 0.8; e = { open: 0.6, brow: 0.6, lid: 0.2, tilt: -0.1 }; }
  else if (st === 'meteors') { const w = sm(k * 3); lh = [-30, -30 + w * 6]; rh = [26 + w * 20, -40 - w * 72]; claw = 1; flare = 1; heart = 0.6; e = { open: 0.5, brow: 0.5, lid: 0, tilt: -0.38 * w }; }
  else if (st === 'pillars') {
    const up = sm(k / 0.45), slam = sm((k - 0.45) / 0.12);
    lh = [-30 - up * 4, -40 - up * 64 + slam * 94]; rh = [30 + up * 4, -40 - up * 64 + slam * 94];
    claw = 1 - slam * 0.7; lean = slam * 0.22; heart = 0.5 + slam * 0.5; flare = 0.5 + slam;
    e = { open: slam * 0.9, brow: 0.9, lid: 0.3 * up, tilt: -0.2 * up + slam * 0.35 };
  } else if (st === 'chase') {
    const w = sm(k * 2.5), jit = Math.sin(t * 27) * 2;
    lh = [-10 + w * 58 + jit, -40 - w * 14]; rh = [20 + w * 48 - jit, -52 - w * 8 + jit];
    claw = 1; lean = w * 0.32; heart = 1; flare = 1.2; rattle = w;
    e = { open: 0.85 + Math.sin(t * 19) * 0.12, brow: 0.9, lid: 0.15, tilt: 0.2 * w };
  }
  if (intro < 1) { const w = 1 - intro; lh = [-20, -30 + w * 30]; rh = [20, -30 + w * 30]; claw = 0; e = { open: w * 0.8, brow: 0.2, lid: w, tilt: -0.4 * w }; flare = 0.2 + (1 - w); heart = 1 - w; }
  e = expr(m, e);
  rattle = Math.max(rattle, m.hurt, roar * 0.7);
  if (dying) { lh = [lh[0], lh[1] + dying * 60]; rh = [rh[0], rh[1] + dying * 60]; claw = 0; heart = 1 - dying; flare = 1 - dying; }

  glow(ctx, 0, -20, 160, '#ff6a1a', 0.3 * heat);
  flame(ctx, 0, 30, 170, 200 * heat * (0.4 + intro * 0.6) + (st !== 'idle' ? 40 : 0), t, FIRE, 1, 7);
  // hanging chains swing with his movement
  const chainSw = Math.sin(t * 1.3) * 10 + lean * 30;
  ctx.strokeStyle = F('#5a4a44');
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  for (const s of [-1, 1]) {
    const sw = chainSw * (s > 0 ? 1 : 0.7);
    ctx.beginPath(); ctx.moveTo(s * 50, -10); ctx.quadraticCurveTo(s * 70 + sw, -90, s * 60 + sw * 2, -200); ctx.stroke();
  }
  ctx.setLineDash([]);

  // The lich: sinks into the sarcophagus before his entrance and when slain
  ctx.save();
  ctx.translate(0, (1 - intro) * 92 + dying * dying * 96);
  ctx.rotate(lean);
  ctx.translate(Math.sin(t * 43) * rattle * 1.5, Math.cos(t * 37) * rattle);
  // tattered robe, strips flapping up in the fire's draft
  ctx.fillStyle = F('#1a0c0a');
  ctx.beginPath();
  ctx.moveTo(-24, 0); ctx.quadraticCurveTo(-28, -40, -14, -58); ctx.lineTo(14, -58); ctx.quadraticCurveTo(28, -40, 24, 0); ctx.closePath();
  ctx.fill();
  for (let q = 0; q < 6; q++) {
    const x = -20 + q * 8, len = 10 + (q % 3) * 7, sw = Math.sin(t * 6 + q * 1.3) * 5;
    ctx.beginPath(); ctx.moveTo(x - 3, -4); ctx.lineTo(x + sw, len); ctx.lineTo(x + 3, -4); ctx.closePath(); ctx.fill();
  }
  // spine and ribs over a beating ember heart
  ctx.strokeStyle = BONE;
  ctx.lineWidth = 2;
  for (let q = 0; q < 4; q++) { ctx.beginPath(); ctx.moveTo(-10, -48 + q * 7); ctx.quadraticCurveTo(0, -43 + q * 7, 10, -48 + q * 7); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(0, -56); ctx.lineTo(0, -20); ctx.stroke();
  ctx.fillStyle = BONE_D;
  for (let q = 0; q < 5; q++) { ell(ctx, 0, -54 + q * 8, 2.4, 2); ctx.fill(); }
  const hb = pulse(t, m.enr ? 8 : 4.5, 0.75, 1.1) * (0.6 + heart * 0.6);
  glow(ctx, 0, -38, 22 * hb, '#ff8a1a', 0.5 * hb + roar * 0.4);
  ctx.fillStyle = `rgba(255,${160 + heart * 60},60,${0.6 + heart * 0.4})`;
  ell(ctx, 0, -38, 4 * hb, 5 * hb); ctx.fill();
  // arms with long clawed hands
  for (const [sx, h] of [[-1, lh], [1, rh]]) {
    const sh = [sx * 14, -52], el = [(sh[0] + h[0]) / 2 + sx * 8, (sh[1] + h[1]) / 2 + 8];
    limb(ctx, [sh, el, h], 3.4, BONE, 'rgba(0,0,0,.6)');
    const dx = h[0] - el[0], dy = h[1] - el[1], d = Math.hypot(dx, dy) || 1;
    claws(ctx, h[0], h[1], dx / d, dy / d, 11, claw, BONE, 1.8);
    if (flare > 0.4 || st === 'ring' || st === 'chase') flame(ctx, h[0], h[1] + 4, 16, (20 + flare * 22) * heat, t, FIRE, h[0], 3);
  }
  // skull: cranium, a jaw that drops open, eye sockets burning
  ctx.save();
  ctx.translate(0, -60);
  ctx.rotate(e.tilt + m.lx * 0.1 * (st === 'chase' ? 0 : 1) + m.ly * 0.15);
  ctx.scale(1.28, 1.28);
  ctx.translate(0, 60);
  const g = ctx.createRadialGradient(-3, -74, 2, 0, -70, 14);
  g.addColorStop(0, '#fffaf0');
  g.addColorStop(1, '#a89878');
  // jaw
  ctx.save();
  ctx.translate(-7, -63);
  ctx.rotate(e.open * 0.55);
  ctx.fillStyle = F('#c8b898');
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(2, 7); ctx.lineTo(13, 8); ctx.lineTo(15, 1); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff6e6';
  for (let q = 0; q < 4; q++) ctx.fillRect(3 + q * 2.8, 0.5, 1.8, 2.4);
  if (e.open > 0.35) glow(ctx, 7, 2, 10, '#ff9a1a', (e.open - 0.35) * 0.9);
  ctx.restore();
  ctx.fillStyle = F(g);
  ctx.strokeStyle = 'rgba(0,0,0,.45)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-11, -66); ctx.quadraticCurveTo(-13, -84, 0, -85); ctx.quadraticCurveTo(13, -84, 11, -66); ctx.lineTo(7, -62); ctx.lineTo(-7, -62); ctx.closePath(); ctx.fill(); ctx.stroke();
  // cracks
  ctx.strokeStyle = 'rgba(60,30,10,.6)';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-6, -84); ctx.lineTo(-4, -78); ctx.lineTo(-7, -74); ctx.moveTo(8, -80); ctx.lineTo(6, -75); ctx.stroke();
  ctx.fillStyle = '#1a0806';
  ell(ctx, -4.5, -72, 3.6, 4 + e.brow); ctx.fill();
  ell(ctx, 4.5, -72, 3.6, 4 + e.brow); ctx.fill();
  // brow bone slants with anger
  ctx.strokeStyle = F('#b8a888');
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-9, -77 - e.brow * 0.5); ctx.lineTo(-1, -76 + e.brow * 1.8); ctx.moveTo(9, -77 - e.brow * 0.5); ctx.lineTo(1, -76 + e.brow * 1.8); ctx.stroke();
  // eye fire, flaring with intent, guttering as he dies
  const ef = (0.6 + flare * 0.6) * (1 - e.lid * 0.8) * (1 - dying);
  for (const ex of [-4.5, 4.5]) {
    if (ef > 0.05) flame(ctx, ex + m.lx * 1.2, -70 + m.ly, 7, 16 * ef, t, FIRE, ex * 3, 2);
    eye(ctx, ex + m.lx * 1.2, -71.5 + m.ly * 0.8, 1.7 * (0.5 + ef * 0.5), '#ffb347', '#ffffff', 4.5);
  }
  for (let q = 0; q < 4; q++) ctx.fillRect(-5 + q * 2.8, -64.5, 1.8, 2.4);
  flame(ctx, 0, -82, 30, (34 + roar * 24) * heat, t, FIRE, 9, 5);
  ctx.restore();
  ctx.restore();

  // sarcophagus front
  const sg = ctx.createLinearGradient(-56, 0, 56, 0);
  sg.addColorStop(0, F('#2a1a16'));
  sg.addColorStop(0.5, F('#5a3c30'));
  sg.addColorStop(1, F('#2a1a16'));
  ctx.fillStyle = sg;
  ctx.strokeStyle = 'rgba(0,0,0,.7)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-56, -8); ctx.lineTo(56, -8); ctx.lineTo(48, 46); ctx.lineTo(-48, 46); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#8a6a4a';
  ctx.lineWidth = 2;
  ctx.strokeRect(-44, -1, 88, 40);
  ctx.fillStyle = '#3a2620';
  ell(ctx, 0, 16, 9, 8); ctx.fill();
  ctx.fillStyle = '#ff9a1a';
  ell(ctx, -3, 15, 2, 2); ctx.fill();
  ell(ctx, 3, 15, 2, 2); ctx.fill();
  const pl = 0.5 + Math.sin(t * 4) * 0.4;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(255,150,40,${(0.5 + pl * 0.5) * heat})`;
  for (let q = 0; q < 9; q++) {
    const x = -40 + q * 10;
    ctx.fillRect(x, 3, 2, 6); ctx.fillRect(x - 2, 5, 6, 2);
    ctx.fillRect(x + 1, 30, 2, 6);
  }
  ctx.strokeStyle = `rgba(255,120,30,${(0.6 + pl * 0.4) * heat})`;
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-30, -6); ctx.lineTo(-24, 10); ctx.lineTo(-30, 24); ctx.moveTo(26, 44); ctx.lineTo(32, 30); ctx.lineTo(24, 18); ctx.stroke();
  ctx.restore();
  // lid: blasted off during the entrance, floats above, slams back when he is slain
  const lidK = sm(intro * 1.4) * (1 - sm((dying - 0.3) / 0.6));
  ctx.save();
  ctx.translate(lerp(0, -30, lidK), lerp(-14, -96, lidK) + Math.sin(t * 1.5) * 4 * lidK);
  ctx.rotate(lerp(0, -0.45, lidK) + Math.sin(t * 1.5) * 0.08 * lidK);
  ctx.fillStyle = F('#4a2e24');
  ctx.strokeStyle = 'rgba(0,0,0,.7)';
  ctx.fillRect(-60, -7, 120, 14);
  ctx.strokeRect(-60, -7, 120, 14);
  ctx.fillStyle = `rgba(255,150,40,${0.5 + pl * 0.5})`;
  for (let q = 0; q < 8; q++) ctx.fillRect(-52 + q * 14, -2, 6, 3);
  ctx.restore();
  flame(ctx, 0, 48, 130, 46 * heat, t, FIRE, 5, 7);
}

// ---------- Ephialtes: a chained giant of living ice ----------
function iceCluster(ctx, x, y, s, t, fl) {
  for (let q = 0; q < 5; q++) {
    const a = -Math.PI / 2 + (q - 2) * 0.42, len = s * (18 + ((q * 7) % 5) * 5), w = s * (5 + (q % 2) * 2);
    const tx = x + Math.cos(a) * len, ty = y + Math.sin(a) * len;
    const g = ctx.createLinearGradient(x, y, tx, ty);
    g.addColorStop(0, fl ? '#fff' : '#5aa8d8');
    g.addColorStop(1, '#f4fdff');
    ctx.fillStyle = g;
    ctx.strokeStyle = 'rgba(20,60,100,.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - Math.sin(a) * w, y + Math.cos(a) * w);
    ctx.lineTo(tx, ty);
    ctx.lineTo(x + Math.sin(a) * w, y - Math.cos(a) * w);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  glow(ctx, x, y - 14 * s, 30 * s, '#a8ecff', 0.25 + Math.sin(t * 2) * 0.08);
}

export function titan(ctx, b, t, fl, m) {
  const F = c => (fl ? '#fff' : c);
  const skin = F('#57789e'), skinL = F('#86a8cc'), skinD = F('#2a3f5a');
  const st = b.st, k = m.k, intro = sm(m.intro), dying = m.dying, roar = Math.sin(m.roar * Math.PI);
  const walking = st === 'walk', wp = t * 7, walk = walking ? Math.sin(wp) : 0;
  const breathSt = st === 'breath', breathing = breathSt && k > 0.17;
  const stompUp = st === 'stomp' ? sm(k / 0.45) * (1 - sm((k - 0.45) / 0.1)) : 0, stompDown = st === 'stomp' ? sm((k - 0.45) / 0.1) : 0;
  const throwPh = st === 'shards' ? ((k * 1.6 + 0.25) / 0.45) % 1 : 0;
  const cold = m.enr ? '#dffaff' : '#a8ecff';

  // Pose and expression per state
  let e = { open: 0.05, brow: 0.55, lid: 0.25, tilt: 0 };
  let hands = [[-86, -92 + Math.sin(t * 1.4) * 3], [96, -92 + Math.sin(t * 1.7) * 3]], fist = [0.1, 0.1];
  let legLift = 0, crouch = 0, lean = 0, chest = pulse(t, 1.6, 0, 1) * 0.02, twist = 0;
  if (st === 'stomp') {
    legLift = stompUp * 70; lean = -stompUp * 0.12 + stompDown * 0.1; crouch = stompDown * 0.1;
    hands = [[-70 - stompUp * 10, -92 - stompUp * 150 + stompDown * 40], [80 + stompUp * 10, -92 - stompUp * 150 + stompDown * 40]];
    fist = [1, 1]; chest = stompUp * 0.06;
    e = { open: stompUp * 0.9 + stompDown * 0.5, brow: 0.9, lid: 0.2 + stompDown * 0.5, tilt: -stompUp * 0.3 + stompDown * 0.25 };
  } else if (st === 'shards') {
    const cock = throwPh < 0.35 ? 1 - sm(throwPh / 0.35) : sm((throwPh - 0.35) / 0.5);
    hands = [[-86, -92 - (1 - cock) * 10], [lerp(130, 0, cock), lerp(-150, -230, cock)]];
    fist = [0.8, 1 - cock * 0.7]; twist = -0.08 + cock * 0.14; lean = (1 - cock) * 0.1;
    e = { open: 0.2, brow: 0.8, lid: 0.4, tilt: -0.1 + cock * 0.05 };
  } else if (breathSt) {
    const inhale = 1 - sm(k / 0.17);
    chest = inhale * 0.07 + (1 - inhale) * 0.01; lean = (1 - inhale) * 0.08;
    hands = [[-96, -112 - inhale * 20], [106, -112 - inhale * 20]]; fist = [0.6, 0.6];
    e = { open: inhale * 0.3 + (1 - inhale), brow: 0.6, lid: 0.3 + (1 - inhale) * 0.3, tilt: -0.1 * inhale + m.ly * 0.3 };
  } else if (walking) {
    hands = [[-86 + walk * 26, -92 - Math.max(0, walk) * 10], [96 - walk * 26, -92 - Math.max(0, -walk) * 10]]; fist = [0.8, 0.8];
    e = { open: 0.1, brow: 0.7, lid: 0.3, tilt: 0 };
  }
  if (intro < 1) { e = { open: cl((intro - 0.6) / 0.25) * 0.8, brow: 0.3, lid: 1 - sm((intro - 0.55) / 0.2), tilt: 0.5 * (1 - sm((intro - 0.4) / 0.4)) }; hands = [[-70, -40], [80, -40]]; fist = [1, 1]; }
  e = expr(m, e);
  if (dying) { lean = dying * 0.35; crouch = dying * 0.12; hands = [[hands[0][0], hands[0][1] + dying * 70], [hands[1][0], hands[1][1] + dying * 70]]; }
  const rise = 0.58 + 0.42 * intro;

  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ell(ctx, 0, 0, 90, 9); ctx.fill();
  ctx.save();
  ctx.scale(1, rise * (1 - crouch));
  ctx.rotate(lean);
  ctx.translate(Math.sin(t * 41) * m.hurt * 2, 0);
  const bob = walking ? Math.abs(Math.cos(wp)) * 6 : 0;
  // legs with ice boots
  for (const s of [-1, 1]) {
    const lift = s > 0 ? legLift : 0, sw = walk * s * 18, kneeUp = walking ? Math.max(0, Math.sin(wp + (s > 0 ? 0 : Math.PI))) * 14 : 0;
    const fx = s * 30 + sw * 1.2, fy = -20 - lift - kneeUp * 0.6;
    limb(ctx, [[s * 28, -92 - bob], [s * 30 + sw * 0.5 + lift * 0.4, -46 - lift * 0.6 - kneeUp], [fx, fy]], 25, s > 0 ? skin : skinD, 'rgba(10,20,40,.7)');
    ctx.fillStyle = 'rgba(200,240,255,.85)';
    ctx.strokeStyle = 'rgba(40,90,140,.7)';
    ctx.beginPath(); ctx.moveTo(fx - 24, fy + 20); ctx.lineTo(fx - 20, fy - 6); ctx.lineTo(fx + 6, fy - 10); ctx.lineTo(fx + 26, fy + 20); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.translate(0, -bob);
  // loincloth of frozen hide
  ctx.fillStyle = F('#3a4a5a');
  ctx.beginPath(); ctx.moveTo(-44, -96); ctx.lineTo(44, -96); ctx.lineTo(30 + walk * 6, -62); ctx.lineTo(10, -70); ctx.lineTo(-6 + walk * 4, -58); ctx.lineTo(-24, -70); ctx.lineTo(-38 + walk * 6, -62); ctx.closePath(); ctx.fill();
  // torso, swelling with each breath
  ctx.save();
  ctx.translate(0, -94);
  ctx.scale(1 + chest, 1 + chest * 0.6);
  ctx.rotate(twist);
  ctx.translate(0, 94);
  const torso = new Path2D();
  torso.moveTo(-62, -182);
  torso.quadraticCurveTo(0, -204, 62, -182);
  torso.quadraticCurveTo(60, -130, 42, -94);
  torso.lineTo(-42, -94);
  torso.quadraticCurveTo(-60, -130, -62, -182);
  torso.closePath();
  ctx.strokeStyle = 'rgba(10,20,40,.7)';
  ctx.lineWidth = 4;
  ctx.stroke(torso);
  const g = ctx.createLinearGradient(-60, -200, 50, -94);
  g.addColorStop(0, skinL);
  g.addColorStop(0.6, skin);
  g.addColorStop(1, skinD);
  ctx.fillStyle = g;
  ctx.fill(torso);
  ctx.strokeStyle = 'rgba(10,20,40,.35)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-40, -168); ctx.quadraticCurveTo(-20, -150, 0, -164); ctx.quadraticCurveTo(20, -150, 40, -168);
  ctx.moveTo(0, -160); ctx.lineTo(0, -100);
  for (let q = 0; q < 3; q++) { ctx.moveTo(-18, -140 + q * 14); ctx.lineTo(18, -140 + q * 14); }
  ctx.stroke();
  // glowing frost cracks: brighter when enraged, blazing white as he shatters
  const pl = 0.5 + Math.sin(t * (m.enr ? 5 : 2.4)) * 0.35;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(${140 + dying * 115},${230 + dying * 25},255,${0.4 + pl * 0.5 + roar * 0.4 + dying})`;
  ctx.lineWidth = 2 + roar * 2 + dying * 4;
  ctx.beginPath();
  ctx.moveTo(-48, -176); ctx.lineTo(-36, -150); ctx.lineTo(-44, -128); ctx.lineTo(-30, -108);
  ctx.moveTo(30, -186); ctx.lineTo(40, -160); ctx.lineTo(28, -140);
  if (m.enr || dying) { ctx.moveTo(-10, -190); ctx.lineTo(-4, -170); ctx.lineTo(-14, -150); ctx.moveTo(12, -130); ctx.lineTo(22, -112); }
  ctx.stroke();
  ctx.restore();
  // chains across the chest: taut until he snaps them in his entrance
  const snapped = intro > 0.55;
  ctx.strokeStyle = F('#a0a8b4');
  ctx.lineWidth = 4;
  ctx.setLineDash([9, 5]);
  ctx.beginPath();
  if (snapped) { ctx.moveTo(-58, -176); ctx.lineTo(40, -100); ctx.moveTo(58, -176); ctx.lineTo(-40, -100); }
  else { ctx.moveTo(-58, -176); ctx.lineTo(0, -140); ctx.lineTo(58, -176); ctx.moveTo(-50, -120); ctx.lineTo(50, -120); }
  ctx.stroke();
  ctx.setLineDash([]);
  if (intro > 0.55 && intro < 0.75) glow(ctx, 0, -140, 90, '#ffffff', (0.75 - intro) * 4);
  ctx.restore();
  // arms with shackles and broken chains
  for (const s of [-1, 1]) {
    const [hx, hy] = s > 0 ? hands[1] : hands[0], fs = s > 0 ? fist[1] : fist[0];
    const sh = [s * 60, -172], el = [(sh[0] + hx) / 2 + s * 20, (sh[1] + hy) / 2 + 14 - (hy < -150 ? 30 : 0)];
    limb(ctx, [sh, el, [hx, hy]], 26, s > 0 ? skin : skinD, 'rgba(10,20,40,.7)');
    ctx.fillStyle = F('#5a6270');
    ctx.strokeStyle = '#a0a8b4';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(hx - s * 2, hy - 14, 15, 8, 0.3 * s, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(hx, hy - 10); ctx.quadraticCurveTo(hx + s * 14 + Math.sin(t * 3 + s) * 8 - walk * 10, hy + 20, hx + s * 6 + Math.sin(t * 2.6 + s) * 14 - walk * 16, hy + 44); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = s > 0 ? skin : skinD;
    ctx.strokeStyle = 'rgba(10,20,40,.7)';
    ell(ctx, hx, hy + 4, 16 - fs * 2, 14 - fs * 2); ctx.fill(); ctx.stroke();
    // knuckles when the fist is clenched
    ctx.strokeStyle = 'rgba(10,20,40,.5)';
    ctx.lineWidth = 2;
    for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.arc(hx - 6 + q * 6, hy + 1 - fs * 3, 3, Math.PI, TAU); ctx.stroke(); }
    iceCluster(ctx, hx, hy - 4, 0.6, t, fl);
  }
  // shoulder ice
  iceCluster(ctx, -56, -184, 1.2, t, fl);
  iceCluster(ctx, 56, -186, 1.3, t, fl);
  // head group: turns toward the player, thrown back in a roar
  ctx.save();
  ctx.translate(12, -190);
  ctx.rotate(e.tilt + m.lx * 0.05 + m.ly * 0.14);
  ctx.translate(-12, 190);
  ctx.fillStyle = skin;
  ctx.strokeStyle = 'rgba(10,20,40,.7)';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-14, -194); ctx.quadraticCurveTo(-16, -232, 12, -234); ctx.quadraticCurveTo(38, -232, 36, -200); ctx.quadraticCurveTo(30, -186, 12, -186); ctx.quadraticCurveTo(-8, -186, -14, -194); ctx.closePath(); ctx.fill(); ctx.stroke();
  // heavy brow ridge
  ctx.fillStyle = skinD;
  ctx.beginPath(); ctx.moveTo(-4, -217 + e.brow * 2); ctx.lineTo(36, -215 + e.brow * 3); ctx.lineTo(34, -208); ctx.lineTo(-2, -209); ctx.closePath(); ctx.fill();
  gaze(ctx, 16, -211, 3, cold, m, e, { skin, nx: 1, browCol: skinD, browW: 3 });
  gaze(ctx, 29, -211, 2.6, cold, m, e, { skin, nx: 1, browCol: skinD, browW: 3 });
  // mouth: gritted teeth, or a gaping maw pouring frost
  const open = e.open;
  ctx.fillStyle = '#0a1420';
  ell(ctx, 22, -196 + open * 3, 9 + open * 2, 2.5 + open * 7); ctx.fill();
  if (open > 0.2) {
    teeth(ctx, 14, -198, 30, -198, 5, 2.5 + open * 1.5, true);
    teeth(ctx, 15, -194 + open * 9, 29, -194 + open * 9, 4, 2 + open, false);
  } else {
    ctx.fillStyle = '#e8f6ff';
    for (let q = 0; q < 5; q++) ctx.fillRect(14.5 + q * 3.2, -197.5, 2.2, 3);
  }
  if (breathing || open > 0.7) glow(ctx, 30, -196, 40 + open * 30, '#bff3ff', 0.4 + open * 0.4);
  if (breathing) {
    ctx.save();
    ctx.translate(30, -194);
    ctx.rotate(Math.atan2(m.ly, Math.max(0.2, m.lx)));
    const cg = ctx.createLinearGradient(0, 0, 90, 0);
    cg.addColorStop(0, 'rgba(220,250,255,.8)');
    cg.addColorStop(1, 'rgba(180,240,255,0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(90, -34 + Math.sin(t * 20) * 4); ctx.lineTo(90, 34 + Math.cos(t * 17) * 4); ctx.lineTo(0, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // icicle beard, chattering when he roars
  for (let q = 0; q < 7; q++) {
    const x = 6 + q * 5, len = 12 + ((q * 5) % 7) * 3, jig = Math.sin(t * 40 + q) * roar * 2;
    const ig = ctx.createLinearGradient(0, -190, 0, -190 + len);
    ig.addColorStop(0, '#9fd4f5');
    ig.addColorStop(1, '#ffffff');
    ctx.fillStyle = ig;
    ctx.beginPath(); ctx.moveTo(x - 3, -190 + open * 8); ctx.lineTo(x + jig, -190 + len + open * 8); ctx.lineTo(x + 3, -190 + open * 8); ctx.fill();
  }
  // crown of ice spikes, growing with his fury
  for (let q = 0; q < 5; q++) {
    const x = -6 + q * 9, h = (16 + (q === 2 ? 14 : (q % 2) * 6)) * (1 + roar * 0.6 + (m.enr ? 0.25 : 0));
    const ig = ctx.createLinearGradient(0, -230, 0, -230 - h);
    ig.addColorStop(0, '#6ab8e8');
    ig.addColorStop(1, '#ffffff');
    ctx.fillStyle = ig;
    ctx.beginPath(); ctx.moveTo(x - 4, -228); ctx.lineTo(x + 1, -228 - h); ctx.lineTo(x + 5, -228); ctx.fill();
  }
  glow(ctx, 14, -246, 40, cold, 0.25 + roar * 0.4);
  ctx.restore();
  ctx.restore();
  if (dying > 0.5) glow(ctx, 0, -120, 200 * (dying - 0.5), '#ffffff', (dying - 0.5) * 1.2);
}

// ---------- Hades: Lord of the Dead, crowned in blue fire ----------
export function hades(ctx, b, t, fl, m) {
  const F = c => (fl ? '#fff' : c);
  const st = b.st, k = m.k, intro = sm(m.intro), dying = m.dying, roar = Math.sin(m.roar * Math.PI);
  const rage = b.phase >= 3, cast = st !== 'idle' && st !== 'intro';
  ctx.translate(0, -b.h / 2 + Math.sin(t * 1.6) * 5 * (1 - dying));
  const HAIR = rage ? ['#ff2a00', '#ff8a1a', '#fff3a0'] : ['#1a4aff', '#5fd8ff', '#e8fbff'];
  const EYE = rage ? '#ffb020' : '#ff2a3a';
  // the cloak wraps him before a teleport and unfurls after it
  const wrap = st === 'teleport' ? (k < 0.4 ? sm(k / 0.4) : 1 - sm((k - 0.4) / 0.3)) : 0;
  const vxl = (b.vx || 0) * (b.face || 1);

  // Pose and expression per state
  let e = { open: 0.05, brow: 0.3, lid: 0.3, tilt: 0.02 };
  let rh = [70 + Math.sin(t * 1.3) * 3, -42 + Math.sin(t * 1.8) * 4], fingers = 0.3, bident = { a: -0.08, lift: 0, spin: 0 }, lean = 0;
  if (st === 'ring') { const w = sm(k * 3); rh = [60 + w * 14, -50 - w * 50]; fingers = 1; bident = { a: 0, lift: 60 * w, spin: w }; e = { open: 0.35, brow: 0.7, lid: 0.15, tilt: -0.05 }; }
  else if (st === 'laser') { const w = sm(k / 0.23); rh = [66 + w * 16, -60 - w * 20]; fingers = 0.9; e = { open: 0.1, brow: 1, lid: 0.35 + w * 0.2, tilt: 0 }; }
  else if (st === 'summon') { const w = sm(k * 3); rh = [40 + w * 20, -60 - w * 60]; fingers = 1; bident = { a: -0.08, lift: 0, spin: 0 }; e = { open: 0.4, brow: -0.3, lid: 0, tilt: -0.1 }; }
  else if (st === 'bolts') { const w = sm(k * 4); rh = [60, -80 - w * 50]; fingers = 1; bident = { a: -0.4 * w, lift: 20 * w, spin: 0 }; e = { open: 0.5, brow: 0.8, lid: 0.2, tilt: -0.15 }; }
  else if (st === 'meteors') { const w = sm(k * 3); rh = [50 + w * 10, -90 - w * 60]; fingers = 1; bident = { a: -0.6 * w, lift: 40 * w, spin: 0 }; e = { open: 0.6, brow: 0.6, lid: 0.1, tilt: -0.4 * w }; }
  else if (st === 'teleport') { rh = [40 - wrap * 30, -50 + wrap * 10]; fingers = 0; e = { open: 0.05, brow: 0.5, lid: 0.4 + wrap * 0.6, tilt: 0.1 * wrap }; }
  if (intro < 1) { e = { open: 0, brow: 0.2, lid: 1 - sm((intro - 0.6) / 0.3), tilt: 0.3 * (1 - intro) }; rh = [36, -30]; fingers = 0; }
  e = expr(m, e);
  if (rage && e.open < 0.3 && !dying) e.open = 0.3 + pulse(t, 6, 0, 0.1);
  if (dying) { rh = [rh[0] - dying * 20, rh[1] + dying * 70]; fingers = 0; bident.a += dying * 1.2; lean = dying * 0.25; }
  const seen = (1 - wrap) * intro;

  glow(ctx, 0, -20, 190 * (0.5 + seen * 0.5), rage ? '#ff3a2a' : '#4a7bff', 0.28 + roar * 0.25);
  // orbiting souls: faster and redder in his fury, fleeing as he falls, gathering as he appears
  const soulR = 110 * (1 + dying * 3.5 + (1 - intro) * 2.5);
  for (let i = 0; i < 7; i++) {
    const a = t * (rage ? 1.8 : 0.9) + (i * TAU) / 7, x = Math.cos(a) * soulR, y = Math.sin(a) * soulR * 0.48 - 10;
    glow(ctx, x, y, 18, rage ? '#ff9a6a' : '#9fe8ff', 0.55 * (1 - dying));
    ctx.fillStyle = 'rgba(220,250,255,.75)';
    ell(ctx, x, y, 5, 6 + Math.sin(t * 6 + i) * 1.5); ctx.fill();
    ctx.fillStyle = 'rgba(10,30,50,.8)';
    ell(ctx, x - 1.8, y - 1, 1, 1.4); ctx.fill();
    ell(ctx, x + 1.8, y - 1, 1, 1.4); ctx.fill();
    ell(ctx, x, y + 2.4, 1.2, 1.6 + (rage ? 1.2 : 0)); ctx.fill();
  }
  ctx.save();
  ctx.globalAlpha = Math.max(0.08, seen) * (1 - dying * 0.6);
  ctx.scale(1 - wrap * 0.35 - (1 - intro) * 0.3 - dying * 0.2, 1 - (1 - intro) * 0.1 - dying * 0.1);
  ctx.rotate(lean);
  ctx.translate(Math.sin(t * 47) * m.hurt * 2, 0);
  // cloak: billows behind him as he moves, wraps around him as he vanishes
  const trail = clamp(-vxl * 0.05, -20, 20), wrapIn = wrap * 40;
  const cloak = new Path2D();
  cloak.moveTo(-30 + wrapIn * 0.4, -56);
  cloak.bezierCurveTo(-70 + trail + wrapIn, -30, -86 + trail * 1.5 + wrapIn, 20, -78 + trail * 2 + wrapIn, 86);
  for (let q = 0; q <= 10; q++) cloak.lineTo(-78 + q * 15.6 + trail * 2 * (1 - q / 10) + wrapIn * (1 - q / 5), 86 + Math.sin(t * 4 + q) * 8 + (q % 2) * 12);
  cloak.bezierCurveTo(86 - wrapIn, 20, 70 - wrapIn, -30, 30 - wrapIn * 0.4, -56);
  cloak.closePath();
  const cg = ctx.createLinearGradient(0, -60, 0, 90);
  cg.addColorStop(0, F('#2a0a20'));
  cg.addColorStop(1, F('#050208'));
  ctx.fillStyle = cg;
  ctx.fill(cloak);
  ctx.strokeStyle = F('#7a1020');
  ctx.lineWidth = 3;
  ctx.stroke(cloak);
  // left arm holding the bident, raised or spun overhead when he casts
  const bh = [-46, -40 - bident.lift];
  limb(ctx, [[-34, -50], [-50, -46 - bident.lift * 0.6], bh], 9, F('#1a0c1a'), 'rgba(0,0,0,.6)');
  ctx.save();
  ctx.translate(bh[0], bh[1]);
  ctx.rotate(bident.a + bident.spin * t * 16);
  if (bident.spin > 0) glow(ctx, 0, -60, 120 * bident.spin, HAIR[1], 0.3 * bident.spin);
  ctx.strokeStyle = F('#2a2430');
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(0, 120); ctx.lineTo(0, -110); ctx.stroke();
  ctx.strokeStyle = F('#c9a24a');
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, -80); ctx.lineTo(-14, -94); ctx.lineTo(-14, -130); ctx.moveTo(0, -80); ctx.lineTo(14, -94); ctx.lineTo(14, -130); ctx.stroke();
  eye(ctx, -14, -132, 3 + (cast ? 1.5 : 0), HAIR[1], '#fff', 5);
  eye(ctx, 14, -132, 3 + (cast ? 1.5 : 0), HAIR[1], '#fff', 5);
  if (cast) lightning(ctx, -14, -132, 14, -132, HAIR[1], 1.2, 5, 8);
  ctx.restore();
  ctx.strokeStyle = '#e8e0d0';
  ctx.lineWidth = 2;
  for (let q = 0; q < 4; q++) { ctx.beginPath(); ctx.moveTo(bh[0], bh[1]); ctx.lineTo(bh[0] - 4 + (q - 1.5) * 3, bh[1] - 9); ctx.stroke(); }
  // robe and armour
  ctx.fillStyle = F('#120a14');
  ctx.beginPath(); ctx.moveTo(-24, -54); ctx.lineTo(24, -54); ctx.lineTo(40, 70); ctx.lineTo(-40, 70); ctx.closePath(); ctx.fill();
  const ag = ctx.createLinearGradient(-24, -60, 24, -10);
  ag.addColorStop(0, F('#4a4458'));
  ag.addColorStop(1, F('#18141e'));
  ctx.fillStyle = ag;
  ctx.strokeStyle = '#c9a24a';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-24, -56); ctx.lineTo(24, -56); ctx.lineTo(20, -12); ctx.lineTo(0, -2); ctx.lineTo(-20, -12); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -52); ctx.lineTo(0, -6); ctx.stroke();
  ctx.fillStyle = '#e8e0d0';
  ell(ctx, 0, -6, 6, 5.5); ctx.fill();
  eye(ctx, -2, -7, 1, EYE, '#fff', 3);
  eye(ctx, 2, -7, 1, EYE, '#fff', 3);
  // skull pauldrons
  for (const s of [-1, 1]) {
    ctx.fillStyle = F('#d8d0c0');
    ctx.strokeStyle = '#4a3a2a';
    ctx.lineWidth = 1.5;
    ell(ctx, s * 30, -56, 15, 12, 0.3 * s); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1a0a10';
    ell(ctx, s * 30 - 5, -58, 3.4, 4); ctx.fill();
    ell(ctx, s * 30 + 5, -58, 3.4, 4); ctx.fill();
    eye(ctx, s * 30 - 5, -58, 1.3, EYE, '#fff', 3);
    eye(ctx, s * 30 + 5, -58, 1.3, EYE, '#fff', 3);
    ctx.fillStyle = '#c9a24a';
    for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.moveTo(s * (22 + q * 7), -66); ctx.lineTo(s * (24 + q * 7), -80 - (q === 1 ? 5 : 0)); ctx.lineTo(s * (27 + q * 7), -66); ctx.fill(); }
  }
  // casting arm with a skeletal hand
  const el = [(34 + rh[0]) / 2 + 10, (-50 + rh[1]) / 2 + (rh[1] < -80 ? -10 : 12)];
  limb(ctx, [[34, -50], el, rh], 9, F('#1a0c1a'), 'rgba(0,0,0,.6)');
  const dx = rh[0] - el[0], dy = rh[1] - el[1], d = Math.hypot(dx, dy) || 1;
  claws(ctx, rh[0], rh[1], dx / d, dy / d, 13, fingers, '#e8e0d0', 2);
  if (cast && !dying) {
    flame(ctx, rh[0] + dx / d * 6, rh[1] + dy / d * 6 + 8, 22, 34 + roar * 20, t, HAIR, 4, 4);
    glow(ctx, rh[0] + dx / d * 8, rh[1] + dy / d * 8, 40, HAIR[1], 0.6);
  }
  // head group
  ctx.save();
  ctx.translate(0, -66);
  ctx.rotate(e.tilt + m.lx * 0.05 + m.ly * 0.12);
  ctx.translate(0, 66);
  const fg = ctx.createLinearGradient(0, -100, 0, -62);
  fg.addColorStop(0, F('#c8d2e4'));
  fg.addColorStop(1, F('#7a86a0'));
  const skin = F('#9aa4bc');
  ctx.fillStyle = fg;
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-14, -84); ctx.quadraticCurveTo(-15, -100, 0, -101); ctx.quadraticCurveTo(15, -100, 14, -84); ctx.quadraticCurveTo(10, -66, 0, -62); ctx.quadraticCurveTo(-10, -66, -14, -84); ctx.closePath(); ctx.fill(); ctx.stroke();
  // gaunt cheeks
  ctx.strokeStyle = 'rgba(20,10,30,.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-10, -78); ctx.quadraticCurveTo(-8, -70, -4, -67); ctx.moveTo(10, -78); ctx.quadraticCurveTo(8, -70, 4, -67); ctx.stroke();
  const laserW = st === 'laser' ? 1 + sm(k / 0.23) * 1.2 : 0;
  gaze(ctx, -5.5, -84, 2.2 + laserW * 0.6, EYE, m, e, { skin, nx: 1, browCol: '#1a0a14', browW: 2.2 });
  gaze(ctx, 5.5, -84, 2.2 + laserW * 0.6, EYE, m, e, { skin, nx: 1, browCol: '#1a0a14', browW: 2.2 });
  if (laserW) for (const ex of [-5.5, 5.5]) glow(ctx, ex, -84, 14 * laserW, '#ff3a4a', 0.5 * laserW);
  // mouth: a thin cruel line, a bared grin, or a roar
  const open = e.open;
  if (open < 0.2) {
    ctx.strokeStyle = '#1a0a14';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-6, -72); ctx.quadraticCurveTo(0, -70 - (e.brow > 0.6 ? 2 : 0), 6, -72 + (rage ? -1 : 0)); ctx.stroke();
  } else {
    ctx.fillStyle = '#1a0a14';
    ell(ctx, 0, -70 + open * 2, 6 + open, 1.5 + open * 5); ctx.fill();
    teeth(ctx, -5, -71.5 - open, 5, -71.5 - open, 5, 1.8 + open, true);
    teeth(ctx, -4, -68.5 + open * 6, 4, -68.5 + open * 6, 4, 1.4 + open, false);
    if (open > 0.6) glow(ctx, 0, -70, 10, HAIR[1], (open - 0.6) * 1.5);
  }
  // hair of fire and a dark crown
  flame(ctx, 0, -94, 54, (80 + (rage ? 30 : 0) + roar * 40) * (1 - dying * 0.8), t, HAIR, 3, 7);
  ctx.fillStyle = F('#3a2a10');
  ctx.strokeStyle = '#c9a24a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-15, -96); ctx.lineTo(-12, -112); ctx.lineTo(-6, -100); ctx.lineTo(0, -118); ctx.lineTo(6, -100); ctx.lineTo(12, -112); ctx.lineTo(15, -96); ctx.closePath();
  ctx.fill(); ctx.stroke();
  eye(ctx, 0, -104, 2, EYE, '#fff', 3);
  ctx.restore();
  ctx.restore();
  if (wrap > 0.6) glow(ctx, 0, -20, 90, HAIR[1], (wrap - 0.6) * 1.5);
}
