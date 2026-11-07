// Olympian boss artwork: Apollo, Lord of the Sun, and Athena, the Grey-Eyed Strategist.
// Same contract as bossart.js: origin at the boss's feet, facing +x, m = mood().
import { TAU, cl, sm, pulse, ell, expr, gaze } from './bossart.js';
import { flame, eye, glow, lightning, strand, limb } from './art.js';
import { shade, rgba, lerp } from './util.js';

const F2 = fl => c => (fl ? '#fff' : c);

// An arm from shoulder s to hand h, bending at the elbow by `bend` (+ = elbow drops below the line).
function arm(ctx, s, h, bend, w, skin, outline, cuff) {
  const mx = (s[0] + h[0]) / 2, my = (s[1] + h[1]) / 2, dx = h[0] - s[0], dy = h[1] - s[1], d = Math.hypot(dx, dy) || 1;
  const el = [mx - (dy / d) * bend, my + (dx / d) * bend];
  limb(ctx, [s, el, h], w, skin, outline);
  if (cuff) {
    const a = Math.atan2(h[1] - el[1], h[0] - el[0]);
    ctx.save();
    ctx.translate(lerp(el[0], h[0], 0.62), lerp(el[1], h[1], 0.62));
    ctx.rotate(a);
    ctx.fillStyle = cuff;
    ctx.strokeStyle = 'rgba(70,40,0,.7)';
    ctx.lineWidth = 0.8;
    ctx.fillRect(-3.5, -w / 2 - 0.6, 7, w + 1.2);
    ctx.strokeRect(-3.5, -w / 2 - 0.6, 7, w + 1.2);
    ctx.restore();
  }
  return el;
}

// Rising motes of light around a figure.
function motes(ctx, t, n, rx, ry, cy, col, a, speed = 30) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let q = 0; q < n; q++) {
    const f = (t * speed / 100 + q * 0.173) % 1, x = Math.sin(q * 12.9898) * rx + Math.sin(t * 1.5 + q) * 5, y = cy + ry - f * ry * 2;
    ctx.fillStyle = rgba(col, a * Math.sin(f * Math.PI));
    ctx.beginPath(); ctx.arc(x, y, 1 + (q % 3) * 0.6, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// =====================================================================================
// APOLLO — Lord of the Sun. A radiant, arrogant young god with a blazing sun-disc halo,
// golden curls, a laurel crown, a golden bow, and a body that trails away into sunfire.
// =====================================================================================

// The sun disc behind his head: two counter-rotating crowns of rays, a molten disc and an
// engraved ring. White-hot when he is enraged; eclipsed by a black moon as he dies.
function sunHalo(ctx, x, y, R, t, hot, flare, dying, fl, cast) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 0, 0, R * (2.6 + flare * 0.8), hot ? '#fff3c8' : '#ffb43a', (0.34 + flare * 0.2) * (1 - dying * 0.8));
  for (const [dir, n, len, w, col] of [[1, 18, 1.95, 0.09, hot ? '#ffffff' : '#ffd34a'], [-1, 12, 1.5, 0.14, hot ? '#fff6d0' : '#ff9a1a']]) {
    ctx.save();
    ctx.rotate(t * (0.25 + (cast ? 0.6 : 0)) * dir);
    const rg = ctx.createRadialGradient(0, 0, R * 0.8, 0, 0, R * len * (1 + flare * 0.35));
    rg.addColorStop(0, rgba(col, 0.9 * (1 - dying)));
    rg.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = rg;
    ctx.beginPath();
    for (let q = 0; q < n; q++) {
      const a = (q / n) * TAU, fk = 0.75 + 0.25 * Math.sin(t * 6 + q * 2.1), r1 = R * 0.86, r2 = R * len * fk * (1 + flare * 0.35) * (q % 2 ? 0.78 : 1);
      ctx.moveTo(Math.cos(a - w) * r1, Math.sin(a - w) * r1);
      ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      ctx.lineTo(Math.cos(a + w) * r1, Math.sin(a + w) * r1);
    }
    ctx.fill();
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over';
  const dg = ctx.createRadialGradient(-R * 0.25, -R * 0.25, R * 0.1, 0, 0, R);
  dg.addColorStop(0, fl ? '#fff' : '#ffffff');
  dg.addColorStop(0.35, fl ? '#fff' : hot ? '#fffbe8' : '#fff0a0');
  dg.addColorStop(0.8, fl ? '#fff' : hot ? '#ffe9a0' : '#ffb830');
  dg.addColorStop(1, fl ? '#fff' : hot ? '#ffd36a' : '#e0741a');
  ctx.globalAlpha *= 0.92;
  ctx.fillStyle = dg;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
  ctx.globalAlpha /= 0.92;
  // engraved ring with a meander of dots
  ctx.strokeStyle = fl ? '#fff' : 'rgba(150,70,0,.55)';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(0, 0, R * 0.8, 0, TAU); ctx.stroke();
  ctx.fillStyle = fl ? '#fff' : 'rgba(150,70,0,.5)';
  for (let q = 0; q < 20; q++) {
    const a = (q / 20) * TAU + t * 0.4;
    ctx.beginPath(); ctx.arc(Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9, 0.9, 0, TAU); ctx.fill();
  }
  // eclipse: a black moon slides across the sun as he dies
  if (dying > 0) {
    const ex = R * 2.1 * (1 - sm(dying * 1.4));
    ctx.fillStyle = '#120804';
    ctx.beginPath(); ctx.arc(ex, -ex * 0.15, R * 0.98, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba('#fff2c0', 0.6 * (1 - dying));
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ex, -ex * 0.15, R * 1.02, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}

// A golden recurve bow held at the grip (0,0), aiming along +x; draw pulls the string back.
function bow(ctx, draw, fl, glowA, t) {
  const L = 30;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(70,35,0,.85)';
  ctx.lineWidth = 5;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(-3, -L);
    ctx.quadraticCurveTo(1, -L * 0.85, 4, -L * 0.6);
    ctx.quadraticCurveTo(10, -L * 0.25, 0, 0);
    ctx.quadraticCurveTo(10, L * 0.25, 4, L * 0.6);
    ctx.quadraticCurveTo(1, L * 0.85, -3, L);
  };
  path(); ctx.stroke();
  const g = ctx.createLinearGradient(0, -L, 0, L);
  g.addColorStop(0, fl ? '#fff' : '#fff1a8');
  g.addColorStop(0.5, fl ? '#fff' : '#e0a028');
  g.addColorStop(1, fl ? '#fff' : '#fff1a8');
  ctx.strokeStyle = g;
  ctx.lineWidth = 3;
  path(); ctx.stroke();
  // string
  const sx = -3 - draw * 26;
  ctx.strokeStyle = fl ? '#fff' : rgba('#fff6d0', 0.9);
  ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(-3, -L); ctx.lineTo(sx, 0); ctx.lineTo(-3, L); ctx.stroke();
  // sun gem at the grip
  eye(ctx, 2, 0, 2.2, '#ffd34a', '#ffffff', 2.5 + glowA * 2);
  // a nocked arrow of light
  if (draw > 0.08) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const ag = ctx.createLinearGradient(sx, 0, 20, 0);
    ag.addColorStop(0, rgba('#ffd34a', 0.2));
    ag.addColorStop(1, rgba('#ffffff', 0.95));
    ctx.strokeStyle = ag;
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(20, 0); ctx.stroke();
    glow(ctx, 20, 0, 9 + draw * 8 + Math.sin(t * 30), '#ffd34a', 0.8 * draw);
    ctx.restore();
  }
}

// A small golden lyre held at its base.
function lyre(ctx, fl, t) {
  const gold = fl ? '#fff' : '#f2c14e';
  ctx.strokeStyle = 'rgba(80,40,0,.8)';
  ctx.lineWidth = 4;
  const frame = () => { ctx.beginPath(); ctx.moveTo(-7, -22); ctx.quadraticCurveTo(-11, -8, -3, 0); ctx.lineTo(3, 0); ctx.quadraticCurveTo(11, -8, 7, -22); };
  frame(); ctx.stroke();
  ctx.strokeStyle = gold;
  ctx.lineWidth = 2.4;
  frame(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-8, -20); ctx.lineTo(8, -20); ctx.stroke();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let q = 0; q < 4; q++) {
    const x = -4.5 + q * 3, v = Math.sin(t * 40 + q * 1.7) * 0.7;
    ctx.strokeStyle = rgba('#fff6c0', 0.85);
    ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(x, -20); ctx.quadraticCurveTo(x + v, -10, x * 0.6, -1); ctx.stroke();
  }
  ctx.restore();
}

function apolloLips(ctx, e, fl, hot) {
  const o = e.open, g = e.grin || 0;
  if (o < 0.15) {
    ctx.strokeStyle = fl ? '#fff' : '#8a3a1a';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(5.5, -53.6 + g * 0.3);
    ctx.quadraticCurveTo(8.5, -53 + (e.brow > 0.5 ? 0.6 : -0.2), 11, -54.4 - g * 1.4);
    ctx.stroke();
    // the faint arrogant dimple at the raised corner
    ctx.beginPath(); ctx.arc(11.4, -55.2 - g * 1.4, 0.7, 0, TAU); ctx.stroke();
    return;
  }
  const w = 2.4 + o * 1.4, h = 0.7 + o * 3.4;
  ctx.fillStyle = fl ? '#fff' : '#3a0e04';
  ctx.strokeStyle = fl ? '#fff' : '#8a3a1a';
  ctx.lineWidth = 0.9;
  ell(ctx, 8.6, -54, w, h); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fffbea';
  ctx.fillRect(8.6 - w * 0.75, -54 - h + 0.2, w * 1.5, Math.min(1.3, h * 0.4));
  if (o > 0.5) glow(ctx, 8.6, -53.5, 4 + o * 6, hot ? '#ffffff' : '#ffb43a', (o - 0.5) * 1.3);
}

export function apollo(ctx, b, t, fl, m) {
  const F = F2(fl);
  const st = b.st, k = m.k, enr = m.enr, intro = sm(m.intro), dying = m.dying, roar = Math.sin(m.roar * Math.PI);
  const gust = st === 'gust', bolts = st === 'bolts', summon = st === 'summon', orbs = st === 'orbs';
  const dive = st === 'dive' ? (b.stT < 0.8 ? 1 : sm(k / 0.38)) : 0;
  const cast = (bolts || summon || gust) && !dying;
  const hot = enr || roar > 0.4;
  const GOLD = hot ? '#fff2a0' : '#ffd34a';
  const SUNF = hot ? ['#ffd36a', '#fff2b0', '#ffffff'] : ['#ff7a1a', '#ffc23a', '#fff2b0'];
  const wdir = gust ? (b.gdir || 1) * (b.face || 1) : 0;
  const wind = gust ? 1 : 0;

  // Bow: drawn before each volley (elapsed 0..0.2 and 0.2..0.8), loosed with a snap.
  let draw = 0, loose = 0;
  if (orbs) {
    const el = 1.4 - b.stT;
    if (el < 0.2) draw = sm(el / 0.2);
    else if (el < 0.8) { const p = (el - 0.2) / 0.6; loose = p < 0.2 ? 1 - p / 0.2 : 0; draw = p < 0.2 ? 0 : sm((p - 0.2) / 0.8); }
    else { const p = (el - 0.8) / 0.6; loose = p < 0.25 ? 1 - p / 0.25 : 0; draw = 0; }
  }

  ctx.translate(0, -b.h / 2);
  const bob = Math.sin(t * 1.7) * 3.5 * (1 - dying);
  ctx.translate(0, bob - (1 - intro) * 70 + dying * dying * 40);
  glow(ctx, 0, -24, 170 * (0.4 + intro * 0.6), GOLD, (0.22 + roar * 0.2 + (enr ? 0.1 : 0) + dive * 0.25) * (1 - dying * 0.8));
  if (intro < 1) {
    // a pillar of sunlight carries him down
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pg = ctx.createLinearGradient(-30, 0, 30, 0);
    pg.addColorStop(0, 'rgba(255,210,90,0)');
    pg.addColorStop(0.5, rgba('#fff6c8', 0.55 * (1 - intro)));
    pg.addColorStop(1, 'rgba(255,210,90,0)');
    ctx.fillStyle = pg;
    ctx.fillRect(-34, -420, 68, 500);
    ctx.restore();
  }

  // Pose and expression per state
  let e = { open: 0.05, brow: 0.15, lid: 0.28, tilt: -0.06, grin: 0.75 };
  let fh = [26 + Math.sin(t * 1.4) * 2, -18 + Math.sin(t * 1.9) * 2], bh = [-18, -14 + Math.sin(t * 1.6) * 2];
  let bowAt = 'hand', bowA = -0.15, fBend = 4, bBend = -4, lean = 0, handFire = 0;
  if (bolts) {
    const w = sm(k * 3);
    e = { open: 0.35, brow: 0.6, lid: 0.1, tilt: -0.15 * w, grin: 0.2 };
    bh = [lerp(-18, -6, w), lerp(-14, -106, w)]; bBend = 6; fh = [28, -20]; handFire = w;
  } else if (gust) {
    e = { open: 0.8, brow: 0.75, lid: 0.3, tilt: 0.02, grin: 0 };
    const sh = Math.sin(t * 22) * 1.5;
    fh = [42 + sh, -44]; bh = [36 - sh, -32]; fBend = -3; bBend = 4; bowAt = 'back'; handFire = 1;
  } else if (orbs) {
    e = { open: loose * 0.4, brow: 0.45, lid: 0.35 + draw * 0.15, tilt: m.ly * 0.08, grin: 0.35 };
    fh = [40, -42 + m.ly * 12]; bh = [lerp(30, 2, draw) - loose * 4, -42 + m.ly * 10 + loose * 2]; fBend = 0; bBend = 5; bowA = Math.atan2(m.ly, Math.max(0.3, m.lx)) * 0.5;
  } else if (summon) {
    const w = sm(k * 3);
    e = { open: 0.3, brow: -0.3, lid: 0, tilt: -0.1, grin: 1 };
    bh = [lerp(-18, -8, w), lerp(-14, -88, w)]; fh = [lerp(26, 34, w), lerp(-18, -60, w)]; bBend = 6; fBend = -6; bowAt = 'back'; handFire = w * 0.6;
  } else if (st === 'dive') {
    e = { open: 0.9 * dive, brow: 1, lid: 0.08, tilt: 0.25 * dive, grin: 0.2 };
    fh = [lerp(26, -8, dive), lerp(-18, -26, dive)]; bh = [lerp(-18, -30, dive), lerp(-14, -22, dive)]; lean = dive * 0.6; bowAt = 'back';
  }
  if (intro < 1) {
    e = { open: 0.05, brow: -0.2, lid: 1 - sm((intro - 0.55) / 0.35), tilt: -0.2 * (1 - intro), grin: 0.4 };
    const w = sm(intro * 1.5);
    fh = [lerp(14, 36, w), lerp(-10, -52, w)]; bh = [lerp(-12, -30, w), lerp(-10, -48, w)];
  }
  if (enr && !dying) { e.grin = Math.max(0, (e.grin || 0) - 0.6); e.brow = Math.min(1, e.brow + 0.3); }
  e = expr(m, e);
  if (dying) { fh = [fh[0] - dying * 6, fh[1] + dying * 34]; bh = [bh[0], bh[1] + dying * 34]; lean = -dying * 0.35; }
  const wl = gust ? wdir : 0;

  ctx.save();
  ctx.rotate(lean + wl * 0.06);

  // Sunfire lower body: tongues of flame licking downward (or streaming back in a dive)
  const fireK = (0.55 + intro * 0.45) * (1 - dying * 0.85) * (enr ? 1.3 : 1) * (1 + roar * 0.4);
  ctx.save();
  ctx.translate(0, 26);
  if (dive) ctx.rotate(dive * 1.0);
  if (gust) ctx.transform(1, 0, -wdir * 0.45, 1, 0, 0);
  ctx.scale(1, -1);
  flame(ctx, 0, 0, 52, (78 + dive * 70) * fireK, t, SUNF, 3, 6);
  flame(ctx, 0, 6, 30, (50 + dive * 50) * fireK, t * 1.3, ['#ffc23a', '#fff2b0', '#ffffff'], 7, 4);
  ctx.restore();
  if (dive > 0.3) {
    // comet tail streaming behind
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let q = 1; q < 9; q++) {
      const u = q / 8;
      ctx.fillStyle = rgba(q % 2 ? '#ffd34a' : '#fff6c0', 0.35 * (1 - u) * dive);
      ctx.beginPath(); ctx.arc(-u * 120, -20 + Math.sin(t * 20 + q) * 3 + u * 30, 22 * (1 - u * 0.7), 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // Himation cloak: white with a gold border, flowing behind and whipping in the solar wind
  {
    const fx = gust ? wdir * 26 : 0, dv = dive * 20, flt = Math.sin(t * 2.3) * 4;
    const cl1 = new Path2D();
    cl1.moveTo(-12, -44);
    cl1.bezierCurveTo(-30 - dv + fx * 0.3, -34, -40 - dv + fx + flt, -4, -34 - dv * 1.6 + fx * 1.4 + flt, 26 + Math.sin(t * 3) * 5);
    cl1.quadraticCurveTo(-22 - dv + fx, 18 + Math.sin(t * 3.4) * 4, -14 + fx * 0.6, 22);
    cl1.quadraticCurveTo(-8, -4, -4, -36);
    cl1.closePath();
    const cg = ctx.createLinearGradient(-30, -40, -20, 26);
    cg.addColorStop(0, F('#fffaf0'));
    cg.addColorStop(1, F('#e8d6b0'));
    ctx.fillStyle = cg;
    ctx.strokeStyle = F('#d9a52a');
    ctx.lineWidth = 2;
    ctx.fill(cl1);
    ctx.stroke(cl1);
    ctx.strokeStyle = 'rgba(120,90,40,.3)';
    ctx.lineWidth = 1;
    for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.moveTo(-12 - q * 3, -36); ctx.quadraticCurveTo(-26 - q * 4 - dv + fx * 0.5, -6, -22 - q * 5 - dv + fx + flt * 0.6, 16); ctx.stroke(); }
  }
  // Bow slung across his back
  if (bowAt === 'back') {
    ctx.save();
    ctx.translate(-6, -30);
    ctx.rotate(0.6);
    bow(ctx, 0, fl, 0, t);
    ctx.restore();
  }

  // Sun-disc halo behind the head
  const hx = 3, hy = -62;
  if (intro > 0.05) sunHalo(ctx, hx - 4, hy - 2, 25 * (0.3 + 0.7 * intro), t, hot, (roar + (gust ? 0.7 : 0) + (bolts ? 0.4 : 0) + handFire * 0.3) * (1 - dying), dying, fl, cast);

  // Back arm (drawn behind the body)
  const skin = F('#f3cf9e'), skinD = 'rgba(110,60,20,.6)';
  if (!orbs) arm(ctx, [-10, -42], bh, bBend, 5, skin, skinD, F('#e7b33a'));

  // Chiton skirt with a gold meander hem, fading into fire
  {
    const sw = gust ? wdir * 10 : 0;
    const sk = new Path2D();
    sk.moveTo(-13, -8);
    sk.lineTo(13, -8);
    for (let q = 0; q <= 6; q++) {
      const u = q / 6, x = lerp(22, -22, u) + sw * (1 - Math.abs(u - 0.5)) - dive * 10, y = 32 + Math.sin(t * 4 + q * 1.3) * 3 + (q % 2) * 4;
      sk.lineTo(x, y);
    }
    sk.closePath();
    const sg = ctx.createLinearGradient(0, -8, 0, 38);
    sg.addColorStop(0, F('#fffdf6'));
    sg.addColorStop(0.65, F('#f2e2be'));
    sg.addColorStop(1, fl ? '#fff' : 'rgba(255,200,90,.4)');
    ctx.fillStyle = sg;
    ctx.strokeStyle = 'rgba(120,80,20,.55)';
    ctx.lineWidth = 1.4;
    ctx.fill(sk);
    ctx.stroke(sk);
    ctx.strokeStyle = 'rgba(140,100,40,.35)';
    ctx.lineWidth = 1;
    for (let q = 0; q < 4; q++) { ctx.beginPath(); ctx.moveTo(-8 + q * 5.5, -6); ctx.quadraticCurveTo(-10 + q * 7 + sw * 0.4, 12, -14 + q * 9 + sw * 0.8 - dive * 6, 30); ctx.stroke(); }
    // gold hem band
    ctx.strokeStyle = F('#e0a028');
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let q = 0; q <= 6; q++) { const u = q / 6, x = lerp(20, -20, u) + sw * (1 - Math.abs(u - 0.5)) - dive * 10, y = 28 + Math.sin(t * 4 + q * 1.3) * 3 + (q % 2) * 4; q ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    // armoured pteruges at the waist
    for (let q = 0; q < 7; q++) {
      const x = -12 + q * 4;
      const pg = ctx.createLinearGradient(x, -8, x, 6);
      pg.addColorStop(0, F('#f6cf5a'));
      pg.addColorStop(1, F('#a8641a'));
      ctx.fillStyle = pg;
      ctx.strokeStyle = 'rgba(80,40,0,.7)';
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.rect(x - 1.8, -8, 3.6, 12 + (q % 2) * 2); ctx.fill(); ctx.stroke();
    }
  }

  // Muscled golden cuirass
  {
    const cu = new Path2D();
    cu.moveTo(-13, -45);
    cu.quadraticCurveTo(0, -50, 14, -45);
    cu.quadraticCurveTo(17, -28, 12, -8);
    cu.quadraticCurveTo(0, -4, -12, -8);
    cu.quadraticCurveTo(-16, -28, -13, -45);
    cu.closePath();
    const g = ctx.createLinearGradient(-14, -48, 14, -8);
    g.addColorStop(0, F('#fff4c0'));
    g.addColorStop(0.35, F('#f2c14e'));
    g.addColorStop(0.75, F('#b8781e'));
    g.addColorStop(1, F('#7a4410'));
    ctx.fillStyle = g;
    ctx.strokeStyle = 'rgba(70,35,0,.85)';
    ctx.lineWidth = 1.6;
    ctx.fill(cu);
    ctx.stroke(cu);
    ctx.strokeStyle = 'rgba(90,45,0,.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-9, -36); ctx.quadraticCurveTo(-3, -32, 1, -36); ctx.quadraticCurveTo(6, -32, 11, -36);
    ctx.moveTo(1, -34); ctx.lineTo(1, -10);
    ctx.moveTo(-6, -24); ctx.lineTo(8, -24); ctx.moveTo(-6, -17); ctx.lineTo(8, -17);
    ctx.stroke();
    ctx.strokeStyle = F('#fffbe0');
    ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(-11, -44); ctx.quadraticCurveTo(0, -48, 12, -44); ctx.stroke();
    // sun medallion that pulses
    const beat = pulse(t, enr ? 8 : 3, 0.85, 1.15);
    glow(ctx, 2, -40, 12 * beat, GOLD, 0.7);
    eye(ctx, 2, -40, 2.4 * beat, '#ffd34a', '#ffffff', 2.5);
    // shoulder pauldron (front)
    ctx.fillStyle = F('#e7b33a');
    ctx.strokeStyle = 'rgba(70,35,0,.8)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(12, -43, 6.5, 4.5, 0.4, 0, TAU); ctx.fill(); ctx.stroke();
  }

  // While drawing the bow, the string arm crosses in front of his chest
  if (orbs) arm(ctx, [-6, -43], bh, -6, 5, skin, skinD, F('#e7b33a'));
  // Front arm, holding the bow
  arm(ctx, [11, -42], fh, fBend, 5.2, skin, skinD, F('#e7b33a'));
  if (bowAt === 'hand') {
    ctx.save();
    ctx.translate(fh[0], fh[1]);
    ctx.rotate(orbs ? bowA : -0.2 + Math.sin(t * 1.4) * 0.05);
    bow(ctx, orbs ? draw : 0, fl, orbs ? draw : 0, t);
    ctx.restore();
  }
  // Glowing hands when he calls on the sun
  for (const [h, a] of [[bh, handFire], [fh, gust ? 1 : summon ? handFire : 0]]) {
    if (a <= 0.02) continue;
    glow(ctx, h[0], h[1], 26 + a * 14 + Math.sin(t * 25) * 2, GOLD, 0.7 * a);
    eye(ctx, h[0], h[1], 2.4 + a * 1.5, '#fff6c0', '#ffffff', 3);
  }
  if (bolts && handFire > 0.5) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const bg = ctx.createLinearGradient(bh[0] - 8, 0, bh[0] + 8, 0);
    bg.addColorStop(0, 'rgba(255,200,80,0)');
    bg.addColorStop(0.5, rgba('#fff6c8', 0.75 * handFire));
    bg.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(bh[0] - 9, bh[1] - 380, 18, 380);
    ctx.restore();
  }
  if (summon) {
    ctx.save();
    ctx.translate(bh[0], bh[1] + 4);
    ctx.rotate(-0.15);
    lyre(ctx, fl, t);
    ctx.restore();
    // floating notes of light
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba('#fff2a0', 0.85);
    ctx.font = '700 11px serif';
    for (let q = 0; q < 5; q++) {
      const f = (t * 0.8 + q * 0.2) % 1;
      ctx.globalAlpha = Math.sin(f * Math.PI);
      ctx.fillText(q % 2 ? '♪' : '♫', bh[0] - 10 + Math.sin(f * 6 + q) * 14 + q * 5, bh[1] - 22 - f * 40);
    }
    ctx.restore();
  }
  // arrow of light just loosed
  if (loose > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const a = bowA, ox = fh[0], oy = fh[1], d = 20 + (1 - loose) * 90;
    ctx.strokeStyle = rgba('#fff6c0', loose);
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ox + Math.cos(a) * (d - 40), oy + Math.sin(a) * (d - 40)); ctx.lineTo(ox + Math.cos(a) * d, oy + Math.sin(a) * d); ctx.stroke();
    glow(ctx, ox + 8, oy, 22, '#ffd34a', 0.6 * loose);
    ctx.restore();
  }

  // Head group: curls, face and laurel turn together
  ctx.save();
  ctx.translate(3, -49);
  ctx.rotate(e.tilt + m.ly * 0.07 + (dying ? dying * 0.4 : 0));
  ctx.translate(-3, 49);
  // neck
  ctx.fillStyle = skin;
  ctx.fillRect(-1, -52, 8, 8);
  const hairBack = (dive ? 7 : 0) + (gust ? -wdir * 5 : 0);
  // golden curls behind the face
  const CURL = [[-6, -76], [-10, -70], [-11, -63], [-9, -56], [-4, -79], [2, -80], [8, -78], [-13, -66], [-7, -51], [-12, -57]];
  CURL.forEach(([x, y], i) => {
    const bx = x - hairBack * (1 - (y + 80) / 40) + Math.sin(t * 2 + i) * 0.6, by = y + Math.cos(t * 2.4 + i) * 0.6 + dying * 3;
    const r = 4.4 - (i % 3) * 0.5;
    const cg = ctx.createRadialGradient(bx - 1.2, by - 1.2, 0.5, bx, by, r);
    cg.addColorStop(0, F('#fff3b0'));
    cg.addColorStop(0.6, F('#e8b03a'));
    cg.addColorStop(1, F('#a8641a'));
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(110,60,10,.6)';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(bx + 0.4, by + 0.3, r * 0.5, 0.5, 4.4); ctx.stroke();
  });
  // face
  ctx.fillStyle = skin;
  ctx.strokeStyle = 'rgba(110,60,20,.7)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-6, -59);
  ctx.quadraticCurveTo(-7, -73, 3, -74);
  ctx.quadraticCurveTo(12, -74, 12, -64);
  ctx.lineTo(14.2, -60);
  ctx.lineTo(12.4, -58.6);
  ctx.quadraticCurveTo(12.6, -52, 9, -49.6);
  ctx.quadraticCurveTo(3, -48, -2, -51);
  ctx.quadraticCurveTo(-6, -54, -6, -59);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // jaw shading and sun-warm cheek
  ctx.fillStyle = 'rgba(160,80,20,.18)';
  ctx.beginPath(); ctx.moveTo(-5, -57); ctx.quadraticCurveTo(0, -50, 8, -50); ctx.quadraticCurveTo(1, -53, -2, -60); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,140,80,.28)';
  ctx.beginPath(); ctx.arc(8, -57, 2.4, 0, TAU); ctx.fill();
  const EYE = hot ? '#ffffff' : '#ffcf3a';
  gaze(ctx, 8.4, -63.2, 2.1, EYE, m, e, { skin, nx: 1, browCol: '#a8641a', browW: 1.4, look: 0.3, core: hot ? '#fff6c0' : '#ffffff', halo: hot ? 5 : 3.5 });
  gaze(ctx, 2.2, -63.2, 1.8, EYE, m, e, { skin, nx: 1, browCol: '#a8641a', browW: 1.3, look: 0.3, core: hot ? '#fff6c0' : '#ffffff', halo: hot ? 5 : 3.5 });
  // nose line
  ctx.strokeStyle = 'rgba(120,60,20,.55)';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(11, -62); ctx.lineTo(12.6, -59); ctx.stroke();
  apolloLips(ctx, e, fl, hot);
  // front curls framing the face
  for (const [x, y, r] of [[-3, -72, 4.4], [4, -75, 4], [10, -73, 3.4], [-6, -64, 3.6]]) {
    ctx.fillStyle = F('#f2c14e');
    ctx.beginPath(); ctx.arc(x - hairBack * 0.3, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(110,60,10,.55)';
    ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.arc(x - hairBack * 0.3 + 0.3, y + 0.3, r * 0.5, 0.6, 4.6); ctx.stroke();
  }
  // golden laurel crown
  ctx.save();
  ctx.translate(2, -70);
  ctx.rotate(-0.12);
  for (let q = 0; q < 9; q++) {
    const u = q / 8, x = lerp(-11, 12, u), y = Math.sin(u * Math.PI) * -2.5;
    for (const s of [-1, 1]) {
      ctx.fillStyle = F(q % 2 ? '#ffe27a' : '#d9a52a');
      ctx.strokeStyle = 'rgba(90,50,0,.6)';
      ctx.lineWidth = 0.5;
      ell(ctx, x, y + s * 1.8, 2.6, 1.1, s * 0.7 - 0.2);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
  glow(ctx, 3, -70, 14, GOLD, 0.25);
  ctx.restore(); // head
  ctx.restore(); // lean

  // Drifting motes of sunlight
  motes(ctx, t, 12, 46, 60, -20, GOLD, 0.8 * (1 - dying) * intro);
  if (dying > 0) motes(ctx, t * 2, 18, 70 + dying * 60, 90, -20, '#fff2c0', dying * (1 - dying) * 2, 80);
}

// =====================================================================================
// ATHENA — the Grey-Eyed Strategist. A stern warrior-goddess in silver and gold, crested
// helmet pushed up, blue peplos and cape, the snake-haired Aegis, a long spear and her owl.
// =====================================================================================

// The Aegis: a round shield bearing the Gorgon's face. `wake` opens her eyes; `flash` blazes.
function aegis(ctx, R, t, wake, flash, fl, enr) {
  const F = F2(fl);
  // rim
  const rg = ctx.createLinearGradient(-R, -R, R, R);
  rg.addColorStop(0, F('#fff2b0'));
  rg.addColorStop(0.5, F('#d9a52a'));
  rg.addColorStop(1, F('#7a4a10'));
  ctx.fillStyle = rg;
  ctx.strokeStyle = 'rgba(40,24,0,.85)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill(); ctx.stroke();
  // silver field
  const sg = ctx.createRadialGradient(-R * 0.3, -R * 0.3, 2, 0, 0, R * 0.86);
  sg.addColorStop(0, F('#f2f6ff'));
  sg.addColorStop(0.6, F('#a8b8d0'));
  sg.addColorStop(1, F('#5a6a86'));
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.arc(0, 0, R * 0.84, 0, TAU); ctx.fill();
  // studs around the rim
  ctx.fillStyle = F('#fff6d0');
  for (let q = 0; q < 12; q++) { const a = (q / 12) * TAU; ctx.beginPath(); ctx.arc(Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92, 1, 0, TAU); ctx.fill(); }
  // writhing snakes of the Gorgon's hair
  for (let q = 0; q < 13; q++) {
    const a = (q / 13) * TAU - Math.PI / 2 + 0.12, pts = [];
    for (let s = 0; s <= 6; s++) {
      const u = s / 6, r = R * (0.3 + u * 0.48), w = Math.sin(t * (4 + wake * 7) + q * 1.7 - u * 5) * 0.32 * u;
      pts.push([Math.cos(a + w) * r, Math.sin(a + w) * r]);
    }
    strand(ctx, pts, 4.2, 2, 'rgba(10,25,10,.9)');
    strand(ctx, pts, 3, 1.2, F(q % 2 ? '#4a8a3a' : '#2e6a2a'));
    const [sx, sy] = pts[6], [px, py] = pts[5], ha = Math.atan2(sy - py, sx - px);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(ha);
    ctx.fillStyle = F('#5a9a40');
    ctx.strokeStyle = 'rgba(10,25,10,.9)';
    ctx.lineWidth = 0.6;
    ell(ctx, 1, 0, 2.2, 1.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = wake > 0.3 ? '#ff4a2a' : '#e8d040';
    ctx.fillRect(1.4, -0.9, 0.7, 0.7);
    if (wake > 0.4 && Math.sin(t * 9 + q) > 0) { ctx.strokeStyle = '#ff3a5a'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(3, 0); ctx.lineTo(5, 0); ctx.lineTo(5.8, -0.6); ctx.moveTo(5, 0); ctx.lineTo(5.8, 0.6); ctx.stroke(); }
    ctx.restore();
  }
  // the Gorgon's face, cast in bronze
  const fg = ctx.createRadialGradient(-R * 0.1, -R * 0.1, 1, 0, 0, R * 0.42);
  fg.addColorStop(0, F('#f0d890'));
  fg.addColorStop(0.7, F('#b8883a'));
  fg.addColorStop(1, F('#6a4a14'));
  ctx.fillStyle = fg;
  ctx.strokeStyle = 'rgba(40,24,0,.9)';
  ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.ellipse(0, 1, R * 0.34, R * 0.4, 0, 0, TAU); ctx.fill(); ctx.stroke();
  // brows, eyes (open as she wakes), snarl with fangs
  const EYC = enr ? '#ff5a3a' : '#9fffe0';
  for (const s of [-1, 1]) {
    const ex = s * R * 0.12, ey = -R * 0.04;
    ctx.strokeStyle = 'rgba(20,30,20,.9)';
    ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(ex - s * R * 0.11, ey - R * 0.12); ctx.lineTo(ex + s * R * 0.08, ey - R * 0.06); ctx.stroke();
    ctx.fillStyle = 'rgba(30,15,0,.7)';
    ell(ctx, ex, ey, R * 0.09, R * 0.06); ctx.fill();
    eye(ctx, ex, ey, R * 0.05 * (0.6 + wake * 0.8), wake > 0.1 ? EYC : '#c8a040', '#ffffff', 2 + wake * 2 + flash * 4);
  }
  const mo = 0.15 + wake * 0.6;
  ctx.fillStyle = F('#2a0a0a');
  ctx.beginPath(); ctx.ellipse(0, R * 0.2, R * 0.12, R * 0.04 + mo * R * 0.08, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff6e6';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * R * 0.06, R * 0.16); ctx.lineTo(s * R * 0.05, R * 0.24 + mo * 2); ctx.lineTo(s * R * 0.02, R * 0.16); ctx.fill(); }
  if (flash > 0.02) {
    glow(ctx, 0, 0, R * (1.6 + flash * 1.4), enr ? '#ff7a5a' : '#bff6ff', 0.6 * flash);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba('#ffffff', 0.7 * flash);
    ctx.lineWidth = 1.2;
    for (let q = 0; q < 12; q++) {
      const a = (q / 12) * TAU + t * 0.7;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 1.05, Math.sin(a) * R * 1.05); ctx.lineTo(Math.cos(a) * R * (1.4 + flash), Math.sin(a) * R * (1.4 + flash)); ctx.stroke();
    }
    ctx.restore();
  }
  // specular sheen
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  ctx.beginPath(); ctx.ellipse(-R * 0.4, -R * 0.45, R * 0.22, R * 0.1, -0.7, 0, TAU); ctx.fill();
}

// The owl. Head turns toward the look direction; wings open by `flap`.
function owl(ctx, t, m, flap, fl, screech, seed = 0) {
  const F = F2(fl);
  // wings
  for (const s of [-1, 1]) {
    const open = flap, beat = Math.sin(t * 22 + seed) * open;
    ctx.save();
    ctx.translate(s * 2, -5);
    ctx.rotate(s * (0.35 + open * 1.1 + beat * 0.5));
    const wg = ctx.createLinearGradient(0, 0, 0, 14);
    wg.addColorStop(0, F('#f4f0e8'));
    wg.addColorStop(1, F('#b8ac98'));
    ctx.fillStyle = wg;
    ctx.strokeStyle = 'rgba(60,50,40,.7)';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * 6, 4, s * 3 * (1 + open), 13 + open * 3); ctx.quadraticCurveTo(-s * 1, 8, 0, 0); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(90,70,50,.5)';
    for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.moveTo(s * (1 + q), 4 + q * 2); ctx.lineTo(s * (2.5 + q) * (1 + open * 0.5), 9 + q * 2); ctx.stroke(); }
    ctx.restore();
  }
  // body
  const bg = ctx.createLinearGradient(0, -10, 0, 4);
  bg.addColorStop(0, F('#ffffff'));
  bg.addColorStop(1, F('#d8cdb8'));
  ctx.fillStyle = bg;
  ctx.strokeStyle = 'rgba(60,50,40,.75)';
  ctx.lineWidth = 0.9;
  ell(ctx, 0, -4, 4.6, 6.2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(110,90,60,.45)';
  ctx.lineWidth = 0.6;
  for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.arc(0, -4 + q * 2.2, 2.4 - q * 0.3, 0.4, Math.PI - 0.4); ctx.stroke(); }
  // head turning toward the player
  ctx.save();
  ctx.translate(0, -11);
  const turn = cl(m.lx, -1, 1);
  ctx.rotate(m.ly * 0.25 + (screech ? Math.sin(t * 30) * 0.08 : 0));
  ctx.fillStyle = F('#fbf8f2');
  ctx.strokeStyle = 'rgba(60,50,40,.75)';
  ell(ctx, 0, 0, 4.6, 4); ctx.fill(); ctx.stroke();
  // ear tufts
  ctx.fillStyle = F('#e8dcc8');
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 2.5, -3); ctx.lineTo(s * 4.4, -6.5); ctx.lineTo(s * 4.2, -2); ctx.fill(); }
  // facial disc and eyes
  const ox = turn * 1.4;
  const blink = Math.max(0, Math.sin(t * 0.9 + seed * 3) - 0.96) * 25;
  for (const s of [-1, 1]) {
    const ex = ox + s * 1.8;
    ctx.fillStyle = 'rgba(200,180,150,.5)';
    ctx.beginPath(); ctx.arc(ex, 0, 1.9, 0, TAU); ctx.fill();
    if (blink > 0.5) { ctx.strokeStyle = 'rgba(60,40,20,.9)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(ex - 1.2, 0); ctx.lineTo(ex + 1.2, 0); ctx.stroke(); }
    else eye(ctx, ex, 0, screech ? 1.5 : 1.2, '#ffb820', '#1a0a00', 2.4);
  }
  ctx.fillStyle = F('#c89a3a');
  ctx.beginPath(); ctx.moveTo(ox - 0.7, 1); ctx.lineTo(ox, 2.8 + (screech ? 1 : 0)); ctx.lineTo(ox + 0.7, 1); ctx.fill();
  if (screech) {
    ctx.fillStyle = '#3a1a0a';
    ctx.beginPath(); ctx.ellipse(ox, 2.6, 0.9, 0.9, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
  // talons
  ctx.strokeStyle = F('#a08040');
  ctx.lineWidth = 0.9;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 1.4, 1.8); ctx.lineTo(s * 1.8, 3.2); ctx.stroke(); }
}

export function athena(ctx, b, t, fl, m) {
  const F = F2(fl);
  const st = b.st, k = m.k, enr = m.enr, intro = sm(m.intro), dying = m.dying, roar = Math.sin(m.roar * Math.PI);
  const ring = st === 'ring', meteors = st === 'meteors', pillars = st === 'pillars', chase = st === 'chase';
  const attack = (ring || meteors || pillars || chase) && !dying;
  const BLUE = enr ? '#e8f6ff' : '#9fd0ff', STEEL = '#c8d4e8';
  ctx.translate(0, -b.h / 2);
  const bob = Math.sin(t * 1.3) * 3 * (1 - dying);
  ctx.translate(0, bob - (1 - intro) * 50 + dying * dying * 50);

  // Pose and expression per state.
  // sh = shield hand (front), sp = spear hand (back); spear angle sa (0 = pointing +x, -PI/2 = up).
  let e = { open: 0.02, brow: 0.45, lid: 0.18, tilt: 0 };
  let shH = [24, -30 + Math.sin(t * 1.5) * 1.5], spH = [-18, -24], sa = -1.48, spearOut = 0, shieldUp = 0, wake = 0, flash = 0, lean = 0, owlFlap = 0;
  if (ring) {
    // shield raised square to the front; the Gorgon wakes and flashes with each pulse
    const w = sm(k * 3.5), pulseN = ((1.6 - b.stT) % 0.45) / 0.45;
    shH = [lerp(24, 30, w), lerp(-30, -48, w)]; shieldUp = w; wake = w; flash = w * Math.max(0, 1 - pulseN * 3);
    e = { open: 0.35, brow: 0.8, lid: 0.12, tilt: -0.05 }; owlFlap = 0.6;
  } else if (meteors) {
    const w = sm(k * 3);
    spH = [lerp(-18, -4, w), lerp(-24, -96, w)]; sa = lerp(-1.48, -1.7, w); spearOut = w;
    e = { open: 0.5, brow: 0.6, lid: 0.05, tilt: -0.22 * w }; owlFlap = 0.8 * w;
  } else if (pillars) {
    const up = k < 0.45 ? sm(k / 0.3) : 1 - sm((k - 0.45) / 0.12), down = k >= 0.45 ? sm((k - 0.45) / 0.12) : 0;
    spH = [lerp(-14, -6, up) + down * 26, lerp(-24, -92, up) + down * 14]; sa = lerp(-1.48, -1.62, up) + down * 2.95; spearOut = Math.max(up, down);
    e = { open: down ? 0.8 : 0.2, brow: 0.9, lid: 0.1, tilt: -0.12 * up + 0.15 * down }; lean = down * 0.12; owlFlap = down;
  } else if (chase) {
    const jab = Math.max(0, Math.sin(t * 7)) ** 3;
    sa = Math.atan2(m.ly, Math.max(0.35, m.lx)) * 0.7; spH = [8 + jab * 12, -32 + m.ly * 10]; spearOut = 1;
    shH = [16, -34]; e = { open: 0.15 + jab * 0.5, brow: 1, lid: 0.25, tilt: 0.1 }; lean = 0.22; owlFlap = 0.4 + jab * 0.6;
  }
  if (intro < 1) {
    e = { open: 0, brow: 0.2, lid: 1 - sm((intro - 0.5) / 0.35), tilt: 0.15 * (1 - intro) };
    shH = [20, -26]; flash = intro > 0.6 && intro < 0.95 ? Math.sin(((intro - 0.6) / 0.35) * Math.PI) : 0; wake = flash;
  }
  e = expr(m, e);
  const screech = (roar > 0.3 || (enr && attack && Math.sin(t * 4) > 0.6)) && !dying;
  if (enr) { flash = Math.max(flash, 0.25 + pulse(t, 5, 0, 0.2)); wake = Math.max(wake, 0.6); }
  if (dying) { shH = [shH[0] - dying * 8, shH[1] + dying * 40]; spH = [spH[0], spH[1] + dying * 30]; lean = -dying * 0.3; wake = 0; flash = 0; }
  const rage = enr ? 1 : 0;

  // Holy light beneath her feet
  {
    const la = (0.5 + intro * 0.5) * (1 - dying);
    glow(ctx, 0, 62, 70, BLUE, 0.5 * la);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let q = 0; q < 7; q++) {
      const a = Math.PI / 2 + (q - 3) * 0.28 + Math.sin(t * 2 + q) * 0.05, L = 40 + Math.sin(t * 3 + q * 2) * 10;
      const g = ctx.createLinearGradient(0, 62, Math.cos(a) * L, 62 + Math.sin(a) * L);
      g.addColorStop(0, rgba('#ffffff', 0.5 * la));
      g.addColorStop(1, rgba(BLUE, 0));
      ctx.strokeStyle = g;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, 60); ctx.lineTo(Math.cos(a) * L, 60 + Math.sin(a) * L); ctx.stroke();
    }
    ctx.restore();
    glow(ctx, 0, -10, 150 * (0.5 + intro * 0.5), BLUE, (0.16 + roar * 0.2 + rage * 0.08) * (1 - dying));
  }

  ctx.save();
  ctx.rotate(lean);

  // Cape: deep blue with a gold edge, streaming behind
  {
    const flt = Math.sin(t * 2.1) * 5, ch = chase ? 18 : 0;
    const cp = new Path2D();
    cp.moveTo(-10, -46);
    cp.bezierCurveTo(-30 - ch, -34, -38 - ch + flt, 10, -30 - ch * 1.4 + flt, 56 + Math.sin(t * 2.7) * 5);
    for (let q = 1; q <= 4; q++) cp.lineTo(-30 - ch * 1.4 + flt + q * 6, 56 + Math.sin(t * 2.7 + q) * 5 - (q % 2) * 6);
    cp.quadraticCurveTo(-8, 10, 2, -44);
    cp.closePath();
    const cg = ctx.createLinearGradient(-30, -40, -10, 56);
    cg.addColorStop(0, F('#2a4a8a'));
    cg.addColorStop(1, F('#101c40'));
    ctx.fillStyle = cg;
    ctx.strokeStyle = F('#d9a52a');
    ctx.lineWidth = 1.6;
    ctx.fill(cp);
    ctx.stroke(cp);
    ctx.strokeStyle = 'rgba(160,200,255,.18)';
    ctx.lineWidth = 1.2;
    for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.moveTo(-10 - q * 4, -36); ctx.quadraticCurveTo(-26 - q * 4 - ch + flt * 0.5, 8, -22 - q * 4 - ch * 1.2 + flt, 48); ctx.stroke(); }
  }

  // The long spear (behind her when held upright)
  const spearLen = 150;
  const drawSpear = () => {
    ctx.save();
    ctx.translate(spH[0], spH[1]);
    ctx.rotate(sa);
    // shaft
    ctx.strokeStyle = 'rgba(30,20,10,.85)';
    ctx.lineWidth = 4.6;
    ctx.beginPath(); ctx.moveTo(-spearLen * 0.38, 0); ctx.lineTo(spearLen * 0.55, 0); ctx.stroke();
    ctx.strokeStyle = F('#8a5a2a');
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(-spearLen * 0.38, 0); ctx.lineTo(spearLen * 0.55, 0); ctx.stroke();
    ctx.strokeStyle = F('#d9a52a');
    ctx.lineWidth = 3.2;
    for (const x of [-spearLen * 0.36, spearLen * 0.2, spearLen * 0.53]) { ctx.beginPath(); ctx.moveTo(x - 1.5, 0); ctx.lineTo(x + 1.5, 0); ctx.stroke(); }
    // leaf-shaped head of shining steel
    const L0 = spearLen * 0.55;
    const hg = ctx.createLinearGradient(L0, -5, L0, 5);
    hg.addColorStop(0, F('#ffffff'));
    hg.addColorStop(0.5, F('#b8c8e0'));
    hg.addColorStop(1, F('#6a7a96'));
    ctx.fillStyle = hg;
    ctx.strokeStyle = 'rgba(20,30,50,.85)';
    ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(L0, 0); ctx.quadraticCurveTo(L0 + 8, -6, L0 + 26, 0); ctx.quadraticCurveTo(L0 + 8, 6, L0, 0); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(L0 + 2, 0); ctx.lineTo(L0 + 22, 0); ctx.stroke();
    // butt spike
    ctx.fillStyle = F('#b8c8e0');
    ctx.beginPath(); ctx.moveTo(-spearLen * 0.38, -2); ctx.lineTo(-spearLen * 0.38 - 8, 0); ctx.lineTo(-spearLen * 0.38, 2); ctx.fill();
    // the head blazes when she commands with it
    if (spearOut > 0.05) {
      glow(ctx, L0 + 14, 0, 22 + spearOut * 18 + Math.sin(t * 20) * 2, BLUE, 0.75 * spearOut);
      eye(ctx, L0 + 18, 0, 2 + spearOut, '#ffffff', '#ffffff', 2.5);
      if ((meteors || pillars) && Math.random() < 0.5) lightning(ctx, L0 + 22, 0, L0 + 22 + 30 + Math.random() * 40, (Math.random() - 0.5) * 30, '#cfe8ff', 1.2, 5, 8);
    }
    ctx.restore();
  };
  const spearBehind = !chase && !(pillars && sa > 0.5);
  if (spearBehind) drawSpear();

  // Back arm (spear hand)
  const skin = F('#f0d8c8'), skinD = 'rgba(80,50,50,.6)';
  arm(ctx, [-10, -42], spH, -5, 4.8, skin, skinD, F('#d9a52a'));
  // spear hand fist
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(spH[0], spH[1], 3.2, 0, TAU); ctx.fill();

  // Peplos: a long blue gown, hem rippling above the light
  {
    const sk = new Path2D();
    sk.moveTo(-12, -10);
    sk.lineTo(12, -10);
    for (let q = 0; q <= 8; q++) {
      const u = q / 8, x = lerp(22, -24, u) - (chase ? u * 10 : 0), y = 58 + Math.sin(t * 3 + q * 1.1) * 3 + (q % 2) * 3;
      sk.lineTo(x, y);
    }
    sk.closePath();
    const sg = ctx.createLinearGradient(0, -10, 0, 60);
    sg.addColorStop(0, F('#5a86d0'));
    sg.addColorStop(0.6, F('#2a4a8a'));
    sg.addColorStop(1, F('#1a2c5a'));
    ctx.fillStyle = sg;
    ctx.strokeStyle = 'rgba(10,20,40,.8)';
    ctx.lineWidth = 1.5;
    ctx.fill(sk);
    ctx.stroke(sk);
    ctx.strokeStyle = 'rgba(180,210,255,.25)';
    ctx.lineWidth = 1.1;
    for (let q = 0; q < 5; q++) { ctx.beginPath(); ctx.moveTo(-8 + q * 4.5, -8); ctx.quadraticCurveTo(-10 + q * 6 + Math.sin(t * 2 + q) * 2, 24, -16 + q * 9 - (chase ? 6 : 0), 54); ctx.stroke(); }
    // gold key-pattern hem
    ctx.strokeStyle = F('#e0b040');
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let q = 0; q <= 8; q++) { const u = q / 8, x = lerp(21, -23, u) - (chase ? u * 10 : 0), y = 54 + Math.sin(t * 3 + q * 1.1) * 3 + (q % 2) * 3; q ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    // armoured strips over the hips
    for (let q = 0; q < 7; q++) {
      const x = -12 + q * 4;
      const pg = ctx.createLinearGradient(x, -10, x, 8);
      pg.addColorStop(0, F('#e8eef8'));
      pg.addColorStop(1, F('#6a7a96'));
      ctx.fillStyle = pg;
      ctx.strokeStyle = 'rgba(20,30,50,.75)';
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.rect(x - 1.8, -10, 3.6, 14 + (q % 2) * 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = F('#d9a52a');
      ctx.fillRect(x - 1.8, 2 + (q % 2) * 3, 3.6, 2);
    }
  }

  // Silver cuirass with gold trim and a gorgon brooch
  {
    const cu = new Path2D();
    cu.moveTo(-12, -46);
    cu.quadraticCurveTo(0, -51, 13, -46);
    cu.quadraticCurveTo(15, -28, 11, -10);
    cu.quadraticCurveTo(0, -7, -11, -10);
    cu.quadraticCurveTo(-15, -28, -12, -46);
    cu.closePath();
    const g = ctx.createLinearGradient(-12, -50, 12, -10);
    g.addColorStop(0, F('#ffffff'));
    g.addColorStop(0.4, F('#c8d4e8'));
    g.addColorStop(0.8, F('#7a8aa8'));
    g.addColorStop(1, F('#4a5a76'));
    ctx.fillStyle = g;
    ctx.strokeStyle = 'rgba(20,30,50,.85)';
    ctx.lineWidth = 1.6;
    ctx.fill(cu);
    ctx.stroke(cu);
    ctx.strokeStyle = F('#d9a52a');
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-11, -44); ctx.quadraticCurveTo(0, -48.5, 12, -44); ctx.moveTo(-10, -12); ctx.quadraticCurveTo(0, -9, 10, -12); ctx.stroke();
    ctx.strokeStyle = 'rgba(30,40,60,.45)';
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(-8, -36); ctx.quadraticCurveTo(-2, -31, 1, -35); ctx.quadraticCurveTo(5, -31, 10, -36); ctx.moveTo(1, -33); ctx.lineTo(1, -13); ctx.stroke();
    // belt
    ctx.fillStyle = F('#d9a52a');
    ctx.fillRect(-11, -14, 22, 3);
    // brooch: tiny gorgon whose eyes echo the shield
    ctx.fillStyle = F('#e8c24a');
    ctx.beginPath(); ctx.arc(1, -38, 3.4, 0, TAU); ctx.fill();
    eye(ctx, 1, -38, 1.3, enr ? '#ff7a5a' : BLUE, '#ffffff', 2 + flash * 3);
    // front pauldron
    ctx.fillStyle = F('#dce4f2');
    ctx.strokeStyle = 'rgba(20,30,50,.8)';
    ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.ellipse(11, -44, 6.5, 4.4, 0.4, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = F('#d9a52a');
    ctx.beginPath(); ctx.ellipse(11, -44, 4.6, 2.8, 0.4, 0, TAU); ctx.stroke();
  }

  // The owl on her back shoulder (it swoops in during her entrance, flies off as she dies)
  {
    let ox = -9, oy = -50;
    if (intro < 1) { const w = sm((intro - 0.15) / 0.7); ox = lerp(-120, -9, w) + Math.sin(intro * 9) * 10 * (1 - w); oy = lerp(-170, -50, w); owlFlap = Math.max(owlFlap, 1 - w * 0.8); }
    if (dying) { ox = lerp(-9, -150, sm(dying)); oy = lerp(-50, -200, sm(dying)); owlFlap = 1; }
    if (dying < 0.98) {
      ctx.save();
      ctx.translate(ox, oy + Math.sin(t * 3) * 0.6);
      ctx.scale(1.35, 1.35);
      owl(ctx, t, m, Math.max(owlFlap, roar), fl, screech || (intro < 0.6));
      ctx.restore();
    }
  }

  if (!spearBehind) drawSpear();

  // Head group: hair, face and crested helmet
  ctx.save();
  ctx.translate(2, -50);
  ctx.rotate(e.tilt + m.ly * 0.06 + dying * 0.35);
  ctx.translate(-2, 50);
  ctx.fillStyle = skin;
  ctx.fillRect(-2, -53, 7, 7);
  // dark hair falling from beneath the helmet
  for (let i = 0; i < 7; i++) {
    const pts = [];
    for (let s = 0; s <= 6; s++) {
      const u = s / 6;
      pts.push([-5 - u * (8 + i * 1.6) - (chase ? u * 8 : 0) + Math.sin(t * 2 + i) * 1.2 * u, -66 + u * (18 + i * 2.6) + Math.sin(t * 2.8 + i - u * 4) * 1.5 * u]);
    }
    strand(ctx, pts, 4, 1.2, F(i % 3 === 0 ? '#5a3a2a' : '#2a1a14'));
  }
  // face
  ctx.fillStyle = skin;
  ctx.strokeStyle = 'rgba(80,50,50,.7)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-5, -60);
  ctx.quadraticCurveTo(-6, -72, 3, -73);
  ctx.quadraticCurveTo(11, -73, 11, -64);
  ctx.lineTo(13, -60.6);
  ctx.lineTo(11.4, -59.4);
  ctx.quadraticCurveTo(11.4, -53, 8, -50.8);
  ctx.quadraticCurveTo(2, -49.6, -2, -52.5);
  ctx.quadraticCurveTo(-5, -55, -5, -60);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(120,70,80,.16)';
  ctx.beginPath(); ctx.moveTo(-4, -58); ctx.quadraticCurveTo(1, -51, 8, -51); ctx.quadraticCurveTo(1, -54, -1.5, -61); ctx.closePath(); ctx.fill();
  const EYE = enr ? '#ffffff' : '#bfe6ff';
  gaze(ctx, 7.8, -63.6, 2, EYE, m, e, { skin, nx: 1, browCol: '#2a1a14', browW: 1.4, look: 0.3, core: '#ffffff', halo: enr ? 5 : 3.5, pupilCol: 'rgba(40,60,90,.85)' });
  gaze(ctx, 1.8, -63.6, 1.7, EYE, m, e, { skin, nx: 1, browCol: '#2a1a14', browW: 1.3, look: 0.3, core: '#ffffff', halo: enr ? 5 : 3.5, pupilCol: 'rgba(40,60,90,.85)' });
  ctx.strokeStyle = 'rgba(100,60,60,.5)';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(10.3, -62.5); ctx.lineTo(12, -59.6); ctx.stroke();
  // mouth: a stern line, a command, or a battle cry
  if (e.open < 0.15) {
    ctx.strokeStyle = F('#7a3a3a');
    ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(5.6, -54.4); ctx.quadraticCurveTo(8, -54 + e.brow * 0.6, 10.6, -54.6); ctx.stroke();
  } else {
    const w = 2.2 + e.open * 1.2, h = 0.6 + e.open * 3.2;
    ctx.fillStyle = '#2a0a0a';
    ctx.strokeStyle = '#7a3a3a';
    ctx.lineWidth = 0.9;
    ell(ctx, 8.2, -54.4, w, h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fffbea';
    ctx.fillRect(8.2 - w * 0.7, -54.4 - h + 0.2, w * 1.4, Math.min(1.2, h * 0.4));
  }
  // Crested Attic helmet pushed up on her brow
  {
    const hg = ctx.createLinearGradient(-6, -82, 12, -64);
    hg.addColorStop(0, F('#ffffff'));
    hg.addColorStop(0.45, F('#c8d4e8'));
    hg.addColorStop(1, F('#5a6a86'));
    ctx.fillStyle = hg;
    ctx.strokeStyle = 'rgba(20,30,50,.9)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-7, -66);
    ctx.quadraticCurveTo(-9, -82, 3, -83);
    ctx.quadraticCurveTo(14, -83, 15, -71);
    ctx.lineTo(16.5, -68.5);
    ctx.lineTo(11, -68);
    ctx.quadraticCurveTo(3, -69, -1, -66.5);
    ctx.lineTo(-3, -60);
    ctx.lineTo(-7, -61);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = F('#d9a52a');
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-6, -68); ctx.quadraticCurveTo(4, -71.5, 15.5, -69.5); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ell(ctx, 1, -79, 4, 1.4, -0.2); ctx.fill();
    // tall horsehair crest that sways and flares with rage
    const cH = 11 + roar * 5 + rage * 3;
    for (let q = 0; q < 14; q++) {
      const u = q / 13, a = lerp(-2.3, -0.5, u), bx = 3 + Math.cos(a) * 11, by = -77 + Math.sin(a) * 9;
      const sway = Math.sin(t * 3 + u * 4) * 2 - (chase ? 4 : 0);
      ctx.strokeStyle = F(q % 3 ? '#2a5ab0' : '#5a8ae0');
      ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx - 3 + sway * 0.5, by - cH * 0.6, bx - 7 + sway - u * 4, by - cH * (0.8 + Math.sin(u * Math.PI) * 0.5)); ctx.stroke();
    }
    ctx.fillStyle = F('#d9a52a');
    ctx.beginPath(); ctx.ellipse(3, -83, 9, 2.2, -0.1, Math.PI, TAU); ctx.fill();
  }
  ctx.restore(); // head

  // Front arm and the Aegis
  arm(ctx, [10, -42], shH, 5, 5, skin, skinD, F('#d9a52a'));
  ctx.save();
  ctx.translate(shH[0] + 4, shH[1] + 2);
  ctx.rotate(-0.1 + shieldUp * 0.1 + Math.sin(t * 1.5) * 0.03);
  ctx.scale(0.62 + shieldUp * 0.38, 1);
  aegis(ctx, 22, t, wake, flash, fl, enr);
  ctx.restore();
  ctx.restore(); // lean

  // Feathers drifting around her; a shower of them as she falls
  motes(ctx, t, 8, 44, 60, -10, BLUE, 0.7 * (1 - dying) * intro);
  if (dying > 0) {
    for (let q = 0; q < 10; q++) {
      const f = (dying + q * 0.1) % 1, x = Math.sin(q * 7.3) * 50 + Math.sin(t * 2 + q) * 8, y = -80 + f * 140;
      ctx.fillStyle = rgba('#f4f0e8', (1 - dying) * 0.9);
      ell(ctx, x, y, 3.4, 1.2, Math.sin(t * 3 + q)); ctx.fill();
    }
  }
}
