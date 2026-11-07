// Zeus, King of the Gods: the final boss.
// A colossal, furious god whose lower body is a roiling storm cloud. White hair and beard whip in
// the wind and crackle with lightning; he grips the double-ended thunderbolt; his eagle circles him.
// Phase 2 darkens the storm. Phase 3 turns his hair and beard to living lightning and his eyes gold.
import { TAU, cl, sm, pulse, ell, expr, gaze, tube, bez } from './bossart.js';
import { eye, glow, lightning, limb } from './art.js';
import { shade, rgba, lerp } from './util.js';

// Two-bone arm: elbow position for a shoulder at (sx, sy) reaching for (hx, hy).
function ik(sx, sy, hx, hy, l1, l2, bend) {
  const dx = hx - sx, dy = hy - sy, d = Math.min(Math.hypot(dx, dy) || 1, l1 + l2 - 0.5);
  const a = Math.atan2(dy, dx);
  const A = Math.acos(cl((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  return { ex: sx + Math.cos(a + bend * A) * l1, ey: sy + Math.sin(a + bend * A) * l1, hx: sx + Math.cos(a) * d, hy: sy + Math.sin(a) * d };
}

// The thunderbolt: a gold-wrapped grip with jagged blades of light out of both ends.
function thunderbolt(ctx, x, y, ang, L, pw, t, fl, rage) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  const core = rage ? '#fff6c0' : '#ffffff', mid = rage ? '#ffd34a' : '#fff27a', edge = rage ? '#ff9a1a' : '#8ad8ff';
  glow(ctx, 0, 0, L * (0.45 + pw * 0.3), mid, 0.12 + pw * 0.22);
  for (const s of [1, -1]) {
    ctx.save();
    ctx.scale(s, 1);
    const h = L / 2, j = Math.sin(t * 30 + s) * 0.6;
    const blade = new Path2D();
    blade.moveTo(5, -4);
    blade.lineTo(h * 0.35, -1.5 + j);
    blade.lineTo(h * 0.42, -6.5);
    blade.lineTo(h * 0.7, -1 - j);
    blade.lineTo(h * 0.76, -4.5);
    blade.lineTo(h, 0);
    blade.lineTo(h * 0.72, 4.5);
    blade.lineTo(h * 0.66, 1 + j);
    blade.lineTo(h * 0.4, 6.5);
    blade.lineTo(h * 0.32, 1.5 - j);
    blade.lineTo(5, 4);
    blade.closePath();
    // flared side prongs near the tip
    const prong = new Path2D();
    prong.moveTo(h * 0.55, -2); prong.lineTo(h * 0.72, -11); prong.lineTo(h * 0.68, -5); prong.lineTo(h * 0.86, -13); prong.lineTo(h * 0.7, -1); prong.closePath();
    prong.moveTo(h * 0.55, 2); prong.lineTo(h * 0.72, 11); prong.lineTo(h * 0.68, 5); prong.lineTo(h * 0.86, 13); prong.lineTo(h * 0.7, 1); prong.closePath();
    const g = ctx.createLinearGradient(0, -8, 0, 8);
    g.addColorStop(0, fl ? '#fff' : edge);
    g.addColorStop(0.5, fl ? '#fff' : core);
    g.addColorStop(1, fl ? '#fff' : edge);
    ctx.fillStyle = g;
    ctx.strokeStyle = fl ? '#fff' : rgba(mid, 0.95);
    ctx.lineWidth = 1.2;
    ctx.fill(prong); ctx.stroke(prong);
    ctx.fill(blade); ctx.stroke(blade);
    ctx.restore();
  }
  // grip
  ctx.fillStyle = fl ? '#fff' : '#b8862a';
  ctx.strokeStyle = 'rgba(40,20,0,.8)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.rect(-6, -4.5, 12, 9); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = fl ? '#fff' : '#ffe9a0';
  for (let q = -1; q <= 1; q++) { ctx.beginPath(); ctx.moveTo(q * 3.5 - 1, -4.5); ctx.lineTo(q * 3.5 + 1, 4.5); ctx.stroke(); }
  ctx.restore();
  // crackle
  const n = Math.round(1 + pw * 3);
  for (let i = 0; i < n; i++) {
    if (Math.sin(t * 23 + i * 2.1) < 0.2 - pw * 0.6) continue;
    const s = i % 2 ? 1 : -1, tx = x + Math.cos(ang) * s * L * 0.5, ty = y + Math.sin(ang) * s * L * 0.5;
    const a2 = ang + (s < 0 ? Math.PI : 0) + Math.sin(t * 17 + i) * 1.4;
    lightning(ctx, tx, ty, tx + Math.cos(a2) * (16 + pw * 26), ty + Math.sin(a2) * (16 + pw * 26), edge, 1.2, 4, 8);
  }
}

// A hand: fist (open 0) or spread fingers (open 1), pointing along ang.
function hand(ctx, x, y, ang, open, skin, out) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = skin;
  ctx.strokeStyle = out;
  ctx.lineWidth = 1.4;
  ell(ctx, 4, 0, 7.5, 6.5); ctx.fill(); ctx.stroke();
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const u = (i - 1.5) / 1.5, a = u * (0.15 + open * 0.45), len = 3 + open * 8;
    const bx = 9, by = u * 4.2;
    ctx.strokeStyle = out; ctx.lineWidth = 4.6;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a) * len, by + Math.sin(a) * len); ctx.stroke();
    ctx.strokeStyle = skin; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a) * len, by + Math.sin(a) * len); ctx.stroke();
  }
  ctx.strokeStyle = out; ctx.lineWidth = 4.8;
  ctx.beginPath(); ctx.moveTo(3, -5); ctx.lineTo(7 + open * 3, -9 - open * 3); ctx.stroke();
  ctx.strokeStyle = skin; ctx.lineWidth = 3.2;
  ctx.beginPath(); ctx.moveTo(3, -5); ctx.lineTo(7 + open * 3, -9 - open * 3); ctx.stroke();
  ctx.restore();
}

// Zeus's golden eagle. s: size, flap phase, dir: +1 flying toward +x.
function eagle(ctx, x, y, s, flap, dir, fl, cry) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * dir, s);
  const W = 0.35 + Math.sin(flap) * 0.65;
  const wing = F => {
    ctx.fillStyle = F;
    ctx.beginPath();
    ctx.moveTo(-2, -1);
    ctx.quadraticCurveTo(-8, -10 - W * 14, -20, -14 - W * 22);
    for (let q = 0; q < 4; q++) ctx.lineTo(-22 + q * 4, -10 - W * 18 + q * 2 + (q % 2) * 4);
    ctx.quadraticCurveTo(-6, -2, 4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  ctx.strokeStyle = 'rgba(30,15,0,.8)';
  ctx.lineWidth = 1;
  wing(fl ? '#fff' : '#5a3a12');
  // body and tail
  ctx.fillStyle = fl ? '#fff' : '#7a5020';
  ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-22, -3); ctx.lineTo(-22, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ell(ctx, -3, 0, 11, 4.6); ctx.fill(); ctx.stroke();
  // head: white with a golden beak
  ctx.fillStyle = fl ? '#fff' : '#f4f0e6';
  ell(ctx, 8, -1.5, 4.5, 3.8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = fl ? '#fff' : '#ffc23a';
  ctx.beginPath(); ctx.moveTo(11.5, -2.5); ctx.lineTo(16, -0.5 - cry * 1.5); ctx.lineTo(12, 0.4); ctx.closePath(); ctx.fill();
  if (cry > 0.1) { ctx.beginPath(); ctx.moveTo(11.5, 0.5); ctx.lineTo(15, 1.5 + cry * 2); ctx.lineTo(11.5, 1.6); ctx.closePath(); ctx.fill(); }
  eye(ctx, 9.5, -2.6, 0.9, '#ffe14a', '#fff', 3);
  // near wing, lit gold along its edge
  ctx.save();
  ctx.translate(2, 1);
  wing(fl ? '#fff' : '#8a5a1a');
  ctx.strokeStyle = fl ? '#fff' : 'rgba(255,211,74,.8)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-2, -1); ctx.quadraticCurveTo(-8, -10 - W * 14, -20, -14 - W * 22); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

export function zeus(ctx, b, t, fl, m) {
  const F = c => (fl ? '#fff' : c);
  const st = b.st, k = m.k, dying = m.dying, roar = Math.sin(m.roar * Math.PI);
  const ph = b.phase || 1, rage = ph >= 3, dark = ph >= 2;
  const intro = m.intro;
  // Colours that shift with his phase
  const EYE = rage ? '#ffe14a' : '#8ad8ff';
  const ARC = rage ? '#ffd34a' : '#8ad8ff';
  const AURA = rage ? '#ffd34a' : ph >= 2 ? '#7a9aff' : '#8ad8ff';
  const SKIN = F('#efcfa8'), SKIND = F('#b98860'), OUT = 'rgba(40,20,10,.75)';
  const HAIR = F(rage ? '#fff6c8' : '#f4f6ff'), HAIRD = F(rage ? '#ffc23a' : '#a9b4cc');
  const live = 1 - dying;

  // ---------- Pose per state ----------
  let R = [56, -10 + Math.sin(t * 1.7) * 3], L = [-58, -16 + Math.sin(t * 1.4 + 1) * 3];
  let boltA = -1.15 + Math.sin(t * 1.7) * 0.06, openL = 0.75, openR = 0, tiltUp = 0, lean = 0, power = 0.4 + (dark ? 0.2 : 0) + (rage ? 0.3 : 0);
  let e = { open: 0.04, brow: 0.45, lid: 0.12, tilt: 0 };
  let charge = 0, eagleSwoop = 0, cry = 0, wide = 0;
  if (st === 'ring') {
    const w = sm(k * 3.5), pulses = ph + 1, pp = (k * pulses) % 1;
    wide = w;
    R = [lerp(56, 84, w), lerp(-10, -62, w) + Math.sin(pp * Math.PI) * 6];
    L = [lerp(-58, -84, w), lerp(-16, -62, w) + Math.sin(pp * Math.PI) * 6];
    boltA = lerp(-1.15, -0.35, w); openL = 1; power = 1;
    e = { open: 0.75, brow: 0.85, lid: 0, tilt: -0.08 };
  } else if (st === 'laser') {
    charge = sm(k / 0.235);
    const aim = Math.atan2(m.ly, m.lx);
    R = [lerp(56, 34, charge) + Math.cos(aim) * 18, lerp(-10, -24, charge) + Math.sin(aim) * 18];
    L = [lerp(-58, -44, charge), lerp(-16, -36, charge)];
    boltA = lerp(-1.15, aim, charge); openL = 1; power = 0.6 + charge * 0.9; lean = -0.05 * charge;
    e = { open: 0.15 + charge * 0.2, brow: 1, lid: 0, tilt: 0.04 };
  } else if (st === 'summon') {
    const w = sm(k * 3);
    L = [lerp(-58, -34, w), lerp(-16, -122, w)];
    R = [60, -4];
    openL = 1; eagleSwoop = Math.sin(cl(k) * Math.PI); cry = eagleSwoop; power = 0.7;
    e = { open: 0.8 * w, brow: -0.15, lid: 0, tilt: -0.12 * w };
  } else if (st === 'bolts') {
    const w = sm(k * 4);
    R = [lerp(56, 24, w), lerp(-10, -132, w)];
    L = [-60, -32]; openL = 1;
    boltA = lerp(-1.15, -Math.PI / 2, w); power = 0.6 + w * 0.8; tiltUp = 0.28 * w;
    e = { open: 0.55, brow: 0.85, lid: 0.05, tilt: 0 };
  } else if (st === 'meteors') {
    const w = sm(k * 3);
    R = [lerp(56, 30, w), lerp(-10, -126, w)];
    L = [lerp(-58, -32, w), lerp(-16, -126, w)];
    boltA = lerp(-1.15, -Math.PI / 2 + 0.2, w); openL = 1; power = 0.6 + w * 0.8; tiltUp = 0.32 * w;
    e = { open: 0.9, brow: 0.6, lid: 0, tilt: 0 };
  } else if (st === 'teleport') {
    R = [40, -18]; L = [-40, -22]; openL = 0.2;
    e = { open: 0.1, brow: 0.6, lid: 0.5, tilt: 0 };
  }
  if (intro < 1) {
    const ig = sm((intro - 0.5) / 0.25);
    R = [lerp(30, 56, ig), lerp(4, -10, ig)]; L = [lerp(-30, -58, ig), lerp(4, -16, ig)];
    e = { open: ig * 0.6 * (1 - sm((intro - 0.8) / 0.2)), brow: 0.4 + ig * 0.5, lid: 1 - ig, tilt: 0.25 * (1 - ig) };
    power = 0.2 + ig;
  }
  e = expr(m, e);
  if (rage && !dying && e.open < 0.25) e.open = 0.25 + pulse(t, 5, 0, 0.12);
  if (dying) {
    R = [lerp(R[0], 30, dying), lerp(R[1], 30, dying)];
    L = [lerp(L[0], -30, dying), lerp(L[1], 30, dying)];
    boltA += dying * 1.6; openL = 0; power *= 1 - dying; lean += dying * 0.18;
  }
  lean -= m.hurt * m.hurt * 0.09;

  // ---------- Teleport and intro visibility ----------
  let seen = 1;
  if (st === 'teleport') seen = b.n === 0 ? 1 - sm((k - 0.05) / 0.35) : sm((k - 0.42) / 0.4);
  const appear = intro < 1 ? sm((intro - 0.12) / 0.38) : 1;
  seen *= appear;
  const cloudK = (intro < 1 ? sm(intro / 0.55) : 1);

  ctx.save();
  ctx.translate(0, -b.h / 2 + Math.sin(t * 1.4) * 5 * live + dying * dying * 40);

  // the intro strike: a bolt from the heavens that leaves him standing in it
  if (intro < 0.42) {
    const s = 1 - intro / 0.42;
    for (let i = 0; i < 2; i++) lightning(ctx, (i - 0.5) * 30 + Math.sin(t * 40) * 10, -760, 0, 40, '#fff27a', 5 * s + 2, 16, 60);
    glow(ctx, 0, 0, 260 * s + 60, '#ffffff', 0.7 * s);
  }
  // teleport: he leaves and arrives as a bolt of lightning
  if (st === 'teleport' && seen < 0.85) {
    const a = 1 - seen;
    lightning(ctx, 0, -700, Math.sin(t * 50) * 8, 30, ARC, 3 + a * 5, 16, 50);
    glow(ctx, 0, -20, 120 + a * 120, '#ffffff', 0.5 * a);
    for (let i = 0; i < 4; i++) { const ag = t * 9 + i * 1.6; lightning(ctx, 0, -30, Math.cos(ag) * 110 * a, -30 + Math.sin(ag) * 110 * a, ARC, 1.5, 6, 18); }
  }

  // aura and, in his fury, a halo of lightning
  glow(ctx, 0, -40, (230 + roar * 120 + (rage ? 80 : 0)) * (0.4 + 0.6 * seen) * (1 - dying * 0.7), AURA, (0.26 + roar * 0.25 + (rage ? 0.12 : 0) + charge * 0.15) * seen);
  if (rage && seen > 0.2 && live > 0.3) {
    const hr = 46 + Math.sin(t * 3) * 3;
    ctx.save();
    ctx.globalAlpha *= seen * live;
    for (let i = 0; i < 10; i++) {
      const a0 = t * 0.8 + (i / 10) * TAU, a1 = a0 + TAU / 10;
      lightning(ctx, Math.cos(a0) * hr, -72 + Math.sin(a0) * hr, Math.cos(a1) * hr, -72 + Math.sin(a1) * hr, '#ffd34a', 1.4, 4, 7);
    }
    ctx.restore();
  }

  // the eagle: behind him on the far half of its orbit, in front on the near half
  const ea = t * 1.15, eagleFront = Math.sin(ea) > 0;
  let ex = Math.cos(ea) * 128, ey = -70 + Math.sin(ea) * 34, edir = -Math.sign(Math.sin(ea)) || 1;
  if (eagleSwoop > 0) { ex = lerp(ex, L[0] + 4, eagleSwoop); ey = lerp(ey, L[1] - 18, eagleSwoop); edir = 1; }
  if (dying) { ex += dying * dying * 400; ey -= dying * dying * 260; edir = 1; }
  const eScale = 1.1 + (eagleFront ? 0.15 : -0.1) + eagleSwoop * 0.3;
  const drawEagle = () => { if (appear > 0.5) eagle(ctx, ex, ey, eScale, t * (eagleSwoop ? 16 : 9), edir, fl, cry); };
  if (!eagleFront || eagleSwoop) drawEagle();

  // ---------- Storm cloud body ----------
  ctx.save();
  ctx.globalAlpha *= Math.max(0.15, seen) * (1 - dying * 0.85);
  const cTop = F(rage ? '#5a3a6a' : dark ? '#3c4272' : '#5a6a9e'), cBot = F(rage ? '#140818' : dark ? '#0a0d1e' : '#1a2140');
  const PUFFS = [];
  for (let i = 0; i < 16; i++) {
    const u = (i % 8) / 7, row = Math.floor(i / 8);
    const spread = (1 + dying * 1.8) * cloudK;
    const x = (-62 + u * 124 + Math.sin(t * 0.8 + i * 1.7) * 5) * spread * (row ? 0.8 : 1);
    const y = (row ? 58 : 18) + Math.cos(t * 0.7 + i * 1.3) * 4 + (row ? Math.abs(u - 0.5) * -20 : Math.abs(u - 0.5) * 22) + dying * 30 * (row + 1);
    PUFFS.push([x, y, (row ? 22 : 30) + ((i * 7) % 5) * 3 + Math.sin(t * 1.1 + i) * 2]);
  }
  // wisps trailing beneath him
  for (let i = 0; i < 5; i++) {
    const x0 = (i - 2) * 26, sw = Math.sin(t * 1.6 + i * 1.3) * 16;
    const g = ctx.createLinearGradient(0, 60, 0, 160);
    g.addColorStop(0, rgba(fl ? '#ffffff' : '#2a3258', 0.55));
    g.addColorStop(1, rgba(fl ? '#ffffff' : '#2a3258', 0));
    tube(ctx, bez([x0, 66], [x0 + sw, 96], [x0 * 0.6 - sw, 124 + (i % 2) * 14]), 30, 4, g, null);
  }
  const cg = ctx.createLinearGradient(0, -10, 0, 96);
  cg.addColorStop(0, cTop);
  cg.addColorStop(0.55, shade(fl ? '#ffffff' : cTop, -0.35));
  cg.addColorStop(1, cBot);
  const mass = new Path2D();
  for (const [x, y, r] of PUFFS) { mass.moveTo(x + r, y); mass.arc(x, y, r, 0, TAU); }
  // rim light: the mass drawn bright and slightly higher, then the cloud over it
  ctx.save();
  ctx.translate(0, -3);
  ctx.fillStyle = rgba(fl ? '#ffffff' : ARC, 0.55);
  ctx.fill(mass);
  ctx.restore();
  ctx.fillStyle = cg;
  ctx.fill(mass);
  // soft billows inside the mass
  for (const [x, y, r] of PUFFS.slice(8)) {
    const g = ctx.createRadialGradient(x, y - r * 0.6, 1, x, y - r * 0.4, r);
    g.addColorStop(0, rgba(fl ? '#ffffff' : '#9aaee0', 0.18));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  // lightning flickering inside the cloud
  const flick = dark ? 0.78 : 0.88;
  for (let i = 0; i < PUFFS.length - 1; i++) {
    if (Math.sin(t * 9 + i * 2.7) * Math.sin(t * 3.1 + i) < flick - roar * 0.4 || live < 0.2) continue;
    const [x1, y1] = PUFFS[i], [x2, y2] = PUFFS[(i + 3) % PUFFS.length];
    glow(ctx, x1, y1, 50, ARC, 0.45);
    lightning(ctx, x1, y1, x2, y2, ARC, 1.6, 6, 14);
  }
  ctx.restore();

  // ---------- The god ----------
  ctx.save();
  ctx.globalAlpha *= seen;
  const sc = (0.7 + 0.3 * appear) * (1 - dying * 0.08);
  ctx.scale(sc, sc);
  ctx.translate(Math.sin(t * 47) * m.hurt * 2.5, 0);
  ctx.rotate(lean);

  // hair: a great mane streaming back in the storm wind
  const wind = 1 + roar * 0.6 + (st === 'ring' ? 0.4 : 0), HSC = 1.28;
  const headTilt = e.tilt - tiltUp + m.ly * 0.1 + m.lx * 0.04;
  const headX = (x, y) => {
    // rotate a head-space point about the neck so hair follows the head
    const a = headTilt, dx = x * HSC, dy = (y + 54) * HSC;
    return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a) - 54];
  };
  const hairLock = (bx, by, tx, ty, w, i, col, edge) => {
    const s = Math.sin(t * 3.2 + i * 1.1) * 7 * wind, s2 = Math.cos(t * 2.4 + i) * 5 * wind;
    const p0 = headX(bx, by), p2 = [tx - 6 * wind + s2, ty + s], p1 = [(p0[0] + p2[0]) / 2 + s * 0.6, (p0[1] + p2[1]) / 2 - 8 + s2 * 0.5];
    const g = ctx.createLinearGradient(p0[0], p0[1], p2[0], p2[1]);
    g.addColorStop(0, col);
    g.addColorStop(1, edge);
    tube(ctx, bez(p0, p1, p2, 8), w, 1.5, g, OUT, 1.2);
  };
  ctx.save();
  if (rage) ctx.globalCompositeOperation = 'lighter';
  {
    const wv = i => Math.sin(t * 3.2 + i * 1.3) * 5 * wind, wx = -8 * (wind - 1);
    const P = [[10, -88], [2, -97], [-10, -96], [-30 + wx, -92 + wv(0)], [-56 + wx * 1.5, -86 + wv(1)], [-80 + wx * 2, -74 + wv(2)], [-62 + wx * 1.5, -66 + wv(2)],
      [-82 + wx * 2, -54 + wv(3)], [-60 + wx * 1.5, -50 + wv(3)], [-74 + wx * 2, -34 + wv(4)], [-50 + wx, -38 + wv(4)], [-56 + wx, -22 + wv(5)], [-30, -36], [-16, -56], [-12, -72]].map(([x, y]) => headX(x, y));
    const mane = new Path2D();
    mane.moveTo(...P[0]);
    for (let i = 1; i < P.length; i++) {
      const [x0, y0] = P[i - 1], [x1, y1] = P[i];
      mane.quadraticCurveTo((x0 + x1) / 2 + (y1 - y0) * 0.25, (y0 + y1) / 2 - (x1 - x0) * 0.25, x1, y1);
    }
    mane.closePath();
    const g = ctx.createLinearGradient(...headX(0, -96), ...headX(-70, -40));
    g.addColorStop(0, rage ? rgba('#ffffff', 0.9) : HAIR);
    g.addColorStop(1, rage ? rgba('#ffb020', 0.55) : HAIRD);
    ctx.fillStyle = g;
    ctx.fill(mane);
    if (!rage) { ctx.strokeStyle = OUT; ctx.lineWidth = 1.6; ctx.stroke(mane); }
    // flowing lock lines
    ctx.strokeStyle = rage ? rgba('#ffffff', 0.6) : 'rgba(110,120,150,.6)';
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 6; i++) {
      const p0 = headX(-4 - i * 2, -92 + i * 4), p1 = headX(-34 + wx - i * 3, -82 + i * 6 + wv(i)), p2 = headX(-64 + wx * 1.5 - (i % 2) * 8, -66 + i * 8 + wv(i + 1));
      ctx.beginPath(); ctx.moveTo(...p0); ctx.quadraticCurveTo(...p1, ...p2); ctx.stroke();
    }
  }
  for (let i = 0; i < 4; i++) {
    const u = i / 3;
    hairLock(-8 + u * 10, -88 + u * 6, -70 - u * 24 - (i % 2) * 10, -86 + u * 60, 8 - u * 2, i, rage ? rgba('#fff6c8', 0.8) : HAIR, rage ? rgba('#ffb020', 0.3) : HAIRD);
  }
  ctx.restore();
  if (rage && live > 0.3) for (let i = 0; i < 3; i++) if (Math.sin(t * 13 + i * 2) > 0.3) lightning(ctx, -40 - i * 8, -70 + i * 16, -84 - i * 6, -60 + i * 22 + Math.sin(t * 7 + i) * 10, '#ffd34a', 1.3, 5, 10);

  // far (left) arm, behind the body
  const LS = [-32, -46];
  const la = ik(LS[0], LS[1], L[0], L[1], 34, 33, -1);
  const armDraw = (S, a, near) => {
    const sk = ctx.createLinearGradient(S[0], S[1] - 10, a.hx, a.hy + 10);
    sk.addColorStop(0, near ? SKIN : F(shade('#efcfa8', -0.12)));
    sk.addColorStop(1, near ? SKIND : F(shade('#b98860', -0.12)));
    tube(ctx, bez(S, [(S[0] + a.ex) / 2, (S[1] + a.ey) / 2 - 2], [a.ex, a.ey], 6), 27, 17, sk, OUT, 2);
    tube(ctx, bez([a.ex, a.ey], [(a.ex + a.hx) / 2, (a.ey + a.hy) / 2], [a.hx, a.hy], 6), 19, 12, sk, OUT, 2);
    ctx.fillStyle = sk;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ell(ctx, S[0] + (near ? 2 : -2), S[1] + 3, 12, 10, Math.atan2(a.ey - S[1], a.ex - S[0])); ctx.fill();
    // golden bracer
    const bx = lerp(a.ex, a.hx, 0.62), by = lerp(a.ey, a.hy, 0.62), bx2 = lerp(a.ex, a.hx, 0.88), by2 = lerp(a.ey, a.hy, 0.88);
    limb(ctx, [[bx, by], [bx2, by2]], 13, F('#d9a632'), 'rgba(60,30,0,.85)');
    ctx.strokeStyle = F('#fff0b0');
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(bx, by - 4); ctx.lineTo(bx2, by2 - 4); ctx.stroke();
    // bicep highlight
    ctx.strokeStyle = rgba(fl ? '#ffffff' : '#fff6e6', 0.45);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lerp(S[0], a.ex, 0.25), lerp(S[1], a.ey, 0.25) - 5); ctx.lineTo(lerp(S[0], a.ex, 0.7), lerp(S[1], a.ey, 0.7) - 5); ctx.stroke();
  };
  armDraw(LS, la, false);
  const lAng = Math.atan2(la.hy - la.ey, la.hx - la.ex);
  hand(ctx, la.hx, la.hy, lAng, openL, F(shade('#efcfa8', -0.1)), OUT);
  if (live > 0.3 && seen > 0.3) {
    // sparks dancing between his fingers
    if (Math.sin(t * 11) > -0.2 || power > 0.8) lightning(ctx, la.hx + Math.cos(lAng) * 14, la.hy + Math.sin(lAng) * 14, la.hx + Math.cos(lAng + 0.8) * (20 + power * 16), la.hy + Math.sin(lAng + 0.8) * (20 + power * 16), ARC, 1.2, 4, 7);
    glow(ctx, la.hx + Math.cos(lAng) * 10, la.hy + Math.sin(lAng) * 10, 22 + power * 14, ARC, 0.35 + power * 0.2);
  }

  // torso: broad, muscular, lit electric blue along its edges
  const tg = ctx.createLinearGradient(-30, -56, 30, 6);
  tg.addColorStop(0, F('#f6dcb8'));
  tg.addColorStop(0.55, SKIN);
  tg.addColorStop(1, SKIND);
  const torso = new Path2D();
  torso.moveTo(-36, -50);
  torso.quadraticCurveTo(-42, -40, -34, -26);
  torso.quadraticCurveTo(-28, -8, -24, 6);
  torso.lineTo(24, 6);
  torso.quadraticCurveTo(28, -8, 34, -26);
  torso.quadraticCurveTo(42, -40, 36, -50);
  torso.quadraticCurveTo(0, -60, -36, -50);
  torso.closePath();
  ctx.fillStyle = tg;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.2;
  ctx.fill(torso); ctx.stroke(torso);
  ctx.save();
  ctx.clip(torso);
  // pecs, sternum and abs
  ctx.strokeStyle = 'rgba(120,70,40,.45)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-28, -30); ctx.quadraticCurveTo(-14, -22, 0, -30); ctx.quadraticCurveTo(14, -22, 28, -30);
  ctx.moveTo(0, -48); ctx.lineTo(0, 4);
  for (let r = 0; r < 3; r++) { ctx.moveTo(-12, -16 + r * 8); ctx.quadraticCurveTo(-6, -14 + r * 8, -1, -16 + r * 8); ctx.moveTo(1, -16 + r * 8); ctx.quadraticCurveTo(6, -14 + r * 8, 12, -16 + r * 8); }
  ctx.stroke();
  const pg = ctx.createRadialGradient(14, -40, 2, 14, -38, 20);
  pg.addColorStop(0, 'rgba(255,250,235,.4)');
  pg.addColorStop(1, 'rgba(255,250,235,0)');
  ctx.fillStyle = pg;
  ctx.fillRect(-6, -60, 40, 40);
  ctx.restore();
  ctx.strokeStyle = rgba(fl ? '#ffffff' : ARC, 0.65);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(37, -48); ctx.quadraticCurveTo(42, -40, 34, -26); ctx.quadraticCurveTo(28, -8, 24, 6); ctx.stroke();

  // himation: white with a golden meander border, over his left shoulder and across to the right hip
  const band = new Path2D();
  band.moveTo(-46, -50);
  band.quadraticCurveTo(-32, -62, -16, -52);
  band.quadraticCurveTo(4, -28, 29, -1);
  band.lineTo(12, 6);
  band.quadraticCurveTo(-14, -12, -44, -30);
  band.closePath();
  const skirt = new Path2D();
  const sw1 = Math.sin(t * 2.2) * 4, sw2 = Math.sin(t * 2.6 + 1) * 4;
  skirt.moveTo(-28, 1);
  skirt.lineTo(28, 1);
  skirt.quadraticCurveTo(38, 24, 34 + sw1, 50);
  skirt.lineTo(-34 + sw2, 50);
  skirt.quadraticCurveTo(-40, 24, -28, 1);
  skirt.closePath();
  const hg = ctx.createLinearGradient(-40, -50, 30, 50);
  hg.addColorStop(0, F('#ffffff'));
  hg.addColorStop(0.6, F('#e6e9f4'));
  hg.addColorStop(1, F('#9aa2bc'));
  const kg = ctx.createLinearGradient(0, 0, 0, 50);
  kg.addColorStop(0, F('#eef0f8'));
  kg.addColorStop(0.55, rgba(fl ? '#ffffff' : '#aab2cc', 0.9));
  kg.addColorStop(1, rgba(fl ? '#ffffff' : '#3a4470', 0));
  ctx.fillStyle = kg;
  ctx.fill(skirt);
  ctx.fillStyle = hg;
  ctx.strokeStyle = 'rgba(40,40,70,.7)';
  ctx.lineWidth = 2;
  ctx.fill(band); ctx.stroke(band);
  ctx.strokeStyle = 'rgba(80,90,130,.35)';
  ctx.lineWidth = 1.6;
  for (let q = 0; q < 5; q++) { ctx.beginPath(); ctx.moveTo(-22 + q * 11, 8); ctx.quadraticCurveTo(-24 + q * 12 + Math.sin(t * 2 + q) * 2, 24, -26 + q * 13 + (q > 2 ? sw1 : sw2), 36); ctx.stroke(); }
  for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.moveTo(-38 + q * 6, -46 + q * 3); ctx.quadraticCurveTo(-14 + q * 6, -26 + q * 2, 10 + q * 4, -2 + q); ctx.stroke(); }
  // meander border along the diagonal edge
  ctx.strokeStyle = F('#d9a632');
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-16, -52); ctx.quadraticCurveTo(4, -28, 29, -1); ctx.stroke();
  ctx.strokeStyle = 'rgba(90,50,0,.8)';
  ctx.lineWidth = 1;
  for (let q = 0; q < 8; q++) {
    const u = q / 8, x = lerp(-14, 27, u) + Math.sin(u * Math.PI) * -4, y = lerp(-51, -2, u);
    ctx.strokeRect(x - 1.6, y - 1.6, 3.2, 3.2);
  }
  // golden belt
  ctx.fillStyle = F('#d9a632');
  ctx.strokeStyle = 'rgba(60,30,0,.8)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(26, 0); ctx.lineTo(25, 7); ctx.lineTo(-25, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
  // brooch on the shoulder
  ctx.fillStyle = F('#ffd34a');
  ctx.beginPath(); ctx.arc(-30, -48, 6, 0, TAU); ctx.fill(); ctx.stroke();
  eye(ctx, -30, -48, 2.6, ARC, '#fff', 3.5);

  // near (right) arm with the thunderbolt
  const RS = [32, -46];
  const ra = ik(RS[0], RS[1], R[0], R[1], 34, 33, 1);
  armDraw(RS, ra, true);
  const rAng = Math.atan2(ra.hy - ra.ey, ra.hx - ra.ex);
  const gx = ra.hx + Math.cos(rAng) * 6, gy = ra.hy + Math.sin(rAng) * 6;
  thunderbolt(ctx, gx, gy, boltA, 86 + power * 18 + charge * 16, cl(power), t, fl, rage);
  hand(ctx, ra.hx, ra.hy, rAng, openR, SKIN, OUT);
  if (charge > 0) {
    glow(ctx, gx, gy, 30 + charge * 34, '#ffffff', 0.32 * charge);
    for (let i = 0; i < 3; i++) { const a = t * 13 + i * 2.1; lightning(ctx, gx + Math.cos(a) * 60 * (1 - charge * 0.6), gy + Math.sin(a) * 60 * (1 - charge * 0.6), gx, gy, ARC, 1.4, 5, 10); }
  }
  if ((st === 'bolts' || st === 'meteors') && k > 0.15 && live > 0.3) {
    // lightning leaping from the raised thunderbolt to the storm above
    const tx = gx + Math.cos(boltA) * 50, ty = gy + Math.sin(boltA) * 50;
    lightning(ctx, tx, ty, tx + Math.sin(t * 9) * 40, ty - 160, ARC, 2.4, 9, 26);
    glow(ctx, tx, ty, 60, '#fff27a', 0.5);
  }
  if (st === 'ring' && live > 0.3) {
    // thunder-clap arcs between his flung-out hands and his chest
    for (const h of [[ra.hx, ra.hy], [la.hx, la.hy]]) lightning(ctx, h[0], h[1], 0, -30, ARC, 1.6 * wide + 0.4, 7, 18);
    const pp = (k * (ph + 1)) % 1;
    glow(ctx, 0, -28, 60 + pp * 120, '#ffffff', (1 - pp) * 0.5);
  }

  // ---------- Head ----------
  ctx.save();
  ctx.translate(0, -54);
  ctx.rotate(headTilt);
  ctx.scale(HSC, HSC);
  ctx.translate(0, 54);
  // neck
  ctx.fillStyle = SKIND;
  ctx.beginPath(); ctx.rect(-8, -60, 16, 14); ctx.fill();
  // face
  const fg = ctx.createLinearGradient(-10, -92, 12, -56);
  fg.addColorStop(0, F('#f8e2c4'));
  fg.addColorStop(1, SKIND);
  ctx.fillStyle = fg;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-13, -76);
  ctx.quadraticCurveTo(-14, -92, 0, -93);
  ctx.quadraticCurveTo(15, -92, 14, -76);
  ctx.quadraticCurveTo(14, -62, 8, -56);
  ctx.lineTo(-7, -56);
  ctx.quadraticCurveTo(-13, -62, -13, -76);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // ear
  ctx.fillStyle = SKIND;
  ell(ctx, -13, -73, 3, 5); ctx.fill(); ctx.stroke();
  // nose and cheekbones
  ctx.strokeStyle = 'rgba(110,60,30,.6)';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(2, -78); ctx.quadraticCurveTo(5, -71, 4, -67); ctx.quadraticCurveTo(1, -66, -1, -67.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-10, -70); ctx.quadraticCurveTo(-7, -67, -4, -68); ctx.moveTo(12, -70); ctx.quadraticCurveTo(10, -67, 8, -68); ctx.stroke();
  // furrowed brow lines when he's angry
  if (e.brow > 0.5) {
    ctx.strokeStyle = `rgba(110,60,30,${(e.brow - 0.5) * 1.1})`;
    ctx.beginPath(); ctx.moveTo(-6, -88); ctx.quadraticCurveTo(0, -90, 7, -88); ctx.moveTo(-1, -84); ctx.lineTo(0, -80); ctx.moveTo(3, -84); ctx.lineTo(2.5, -80); ctx.stroke();
  }
  // eyes: crackling electric blue, white-hot when charging, gold in his fury
  const er = 2.5 + charge * 0.8 + roar * 0.4;
  const EYES = [-5.5, 6.5];
  for (const x of EYES) {
    ctx.fillStyle = 'rgba(60,30,20,.45)';
    ell(ctx, x, -78, 4.4, 3.4); ctx.fill();
    gaze(ctx, x, -78, er, charge > 0.5 ? '#ffffff' : EYE, m, e, { skin: SKIN, nx: 1, brow: false, halo: 4 + charge * 3, pupilCol: rage ? 'rgba(120,60,0,.6)' : 'rgba(10,30,60,.7)', pupil: 0.35 });
    const ig = intro < 1 ? Math.sin(cl((intro - 0.5) / 0.35) * Math.PI) : 0;
    const eg = (0.35 + charge * 0.6 + roar * 0.4 + ig * 0.9 + (rage ? 0.2 : 0)) * (1 - e.lid * 0.7);
    glow(ctx, x, -78, 10 + charge * 18 + ig * 30 + roar * 12, charge > 0.5 ? '#ffffff' : EYE, eg);
  }
  if (charge > 0.3 || rage) {
    // light streaming from the eyes
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const x of EYES) {
      const g = ctx.createLinearGradient(x, -78, x - 22, -84);
      g.addColorStop(0, rgba(EYE, 0.7 * Math.max(charge, rage ? 0.6 : 0)));
      g.addColorStop(1, rgba(EYE, 0));
      ctx.strokeStyle = g;
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(x, -78); ctx.quadraticCurveTo(x - 10, -82 + Math.sin(t * 8 + x), x - 24, -86); ctx.stroke();
    }
    ctx.restore();
  }
  // great bushy brows
  for (const x of EYES) {
    const s = x < 0 ? -1 : 1, raise = Math.max(0, -e.brow) * 2.5;
    const ox = x + s * 6, oy = -83 - raise - e.brow * 0.8, ix = x - s * 4.5, iy = -82.5 - raise + e.brow * 2.6;
    ctx.strokeStyle = 'rgba(50,40,50,.85)';
    ctx.lineWidth = 4.6;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ix, iy); ctx.stroke();
    ctx.strokeStyle = HAIR;
    ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(ox, oy - 0.4); ctx.lineTo(ix, iy - 0.4); ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + s * 3, oy - 2.5); ctx.stroke();
  }
  // beard: huge, layered, whipping back in the wind
  const open = e.open;
  ctx.save();
  if (rage) ctx.globalCompositeOperation = 'lighter';
  {
    const bw = i => Math.sin(t * 3 + i * 1.7) * 2.5 * wind, drift = -4 * wind;
    const BP = [[-13, -76], [-18, -62], [-21 + drift * 0.4 + bw(0), -46], [-23 + drift * 0.7 + bw(1), -32], [-15 + drift + bw(2), -30], [-13 + drift + bw(2), -18 + open * 4],
      [-5 + drift * 1.2 + bw(3), -26], [-3 + drift * 1.3 + bw(3), -8 + open * 5], [4 + drift + bw(4), -24], [9 + drift + bw(4), -16 + open * 4], [12 + drift * 0.8 + bw(5), -32], [19 + drift * 0.5 + bw(5), -40],
      [19, -56], [15, -74], [10, -67], [2, -63.5 + open], [-7, -67]];
    const beard = new Path2D();
    beard.moveTo(...BP[0]);
    for (let i = 1; i < BP.length; i++) {
      const [x0, y0] = BP[i - 1], [x1, y1] = BP[i];
      beard.quadraticCurveTo((x0 + x1) / 2 + (y1 - y0) * 0.18, (y0 + y1) / 2 - (x1 - x0) * 0.18, x1, y1);
    }
    beard.closePath();
    const g = ctx.createLinearGradient(0, -72, 0, -10);
    g.addColorStop(0, rage ? rgba('#ffffff', 0.95) : HAIR);
    g.addColorStop(1, rage ? rgba('#ffc23a', 0.55) : HAIRD);
    ctx.fillStyle = g;
    ctx.fill(beard);
    if (!rage) { ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke(beard); }
    // curling locks down the beard
    for (let i = 0; i < 7; i++) {
      const x0 = -14 + i * 4.6, tip = BP[[3, 5, 5, 7, 7, 9, 11][i]];
      ctx.strokeStyle = rage ? rgba('#ffffff', 0.5) : i % 2 ? 'rgba(255,255,255,.75)' : 'rgba(110,120,150,.55)';
      ctx.lineWidth = i % 2 ? 1.2 : 1.5;
      ctx.beginPath(); ctx.moveTo(x0, -62); ctx.bezierCurveTo(x0 - 3 + bw(i), -50, x0 + 3 + bw(i + 1), -38, lerp(x0, tip[0], 0.85), lerp(-62, tip[1], 0.85)); ctx.stroke();
    }
  }
  ctx.restore();
  // mouth inside the beard, then the moustache over it
  if (open > 0.12) {
    ctx.fillStyle = 'rgba(30,8,10,.95)';
    ell(ctx, 1, -60 + open * 2.5, 5 + open * 2.5, 1.5 + open * 5); ctx.fill();
    ctx.fillStyle = '#fff8ee';
    ctx.fillRect(-3.5, -61.4, 9, 1.8);
    ctx.fillRect(-2.5, -57.5 + open * 6, 7, 1.5);
    if (open > 0.5) glow(ctx, 1, -59 + open * 2, 14, ARC, (open - 0.5) * 1.2);
  }
  ctx.strokeStyle = 'rgba(60,70,100,.7)';
  ctx.lineWidth = 4.4;
  ctx.beginPath(); ctx.moveTo(-9, -60 - open); ctx.quadraticCurveTo(-2, -66, 1, -64); ctx.quadraticCurveTo(5, -66, 11, -60 - open); ctx.stroke();
  ctx.strokeStyle = HAIR;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-9, -60.5 - open); ctx.quadraticCurveTo(-2, -66.5, 1, -64.5); ctx.quadraticCurveTo(5, -66.5, 11, -60.5 - open); ctx.stroke();
  // static crackling through the beard
  if (live > 0.3 && seen > 0.3) {
    const n = rage ? 3 : dark ? 2 : 1;
    for (let i = 0; i < n; i++) {
      if (Math.sin(t * 15 + i * 2.3) < 0.35 - roar) continue;
      const a = -12 + ((i * 11 + Math.floor(t * 6) * 7) % 24);
      lightning(ctx, a, -54, a - 6 - wind * 4, -24 + (i % 2) * 6, ARC, 1.1, 5, 8);
    }
  }
  // the crown: a golden laurel wreath, or a crown of lightning in his fury
  const crownFall = dying * dying;
  ctx.save();
  ctx.translate(crownFall * 40, crownFall * 220);
  ctx.rotate(crownFall * 2.4);
  ctx.globalAlpha *= 1 - sm((dying - 0.75) / 0.25);
  if (rage) {
    for (let i = 0; i < 7; i++) {
      const u = i / 6, x = -14 + u * 28, y = -88 - Math.sin(u * Math.PI) * 4, h = 14 + Math.sin(u * Math.PI) * 10 + Math.sin(t * 20 + i) * 3;
      lightning(ctx, x, y, x + Math.sin(t * 9 + i) * 3, y - h, '#ffd34a', 1.6, 3, 5);
    }
    glow(ctx, 0, -98, 30, '#ffd34a', 0.5);
  }
  ctx.strokeStyle = F('#b8862a');
  ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(-15, -82); ctx.quadraticCurveTo(0, -94, 15, -82); ctx.stroke();
  for (let i = 0; i < 9; i++) {
    const u = i / 8, x = -15 + u * 30, y = -82 - Math.sin(u * Math.PI) * 9;
    const a = (u - 0.5) * 2.2 + (i % 2 ? 0.7 : -0.7);
    ctx.fillStyle = F(i % 2 ? '#ffd34a' : '#e0a82a');
    ctx.strokeStyle = 'rgba(90,50,0,.8)';
    ctx.lineWidth = 0.9;
    ell(ctx, x + Math.sin(a) * 3, y - Math.cos(a) * 3, 2.2, 5, a); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  ctx.restore(); // head
  ctx.restore(); // the god

  // front billows of the storm wrap around his waist
  ctx.save();
  ctx.globalAlpha *= Math.max(0.15, seen) * (1 - dying * 0.85);
  const front = new Path2D();
  for (let i = 0; i < 6; i++) {
    const u = i / 5, spread = (1 + dying * 1.8) * cloudK;
    const x = (-44 + u * 88 + Math.sin(t * 0.9 + i * 2.1) * 4) * spread, y = 40 + Math.abs(u - 0.5) * 10 + Math.cos(t * 0.8 + i) * 3 + dying * 30, r = 18 + (i % 3) * 4;
    front.moveTo(x + r, y); front.arc(x, y, r, 0, TAU);
  }
  ctx.save();
  ctx.translate(0, -2.5);
  ctx.fillStyle = rgba(fl ? '#ffffff' : ARC, 0.45);
  ctx.fill(front);
  ctx.restore();
  ctx.fillStyle = cg;
  ctx.fill(front);
  ctx.restore();

  if (eagleFront && !eagleSwoop) drawEagle();

  // a darkening storm: arcs leap between his shoulders, hands and the cloud
  if (dark && live > 0.3 && seen > 0.5) {
    const n = rage ? 3 : 2;
    for (let i = 0; i < n; i++) {
      if (Math.sin(t * 7.3 + i * 2.4) < 0.25) continue;
      const sx = i % 2 ? -34 : 34, a = t * 3 + i;
      lightning(ctx, sx, -46, sx * 1.6 + Math.sin(a) * 20, 30 + Math.cos(a) * 10, ARC, 1.3, 7, 16);
    }
  }

  // phase-change roar: lightning bursts out of him in every direction
  if (roar > 0.05 && live > 0.3) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + t * 2, r = 90 + roar * 150;
      lightning(ctx, 0, -40, Math.cos(a) * r, -40 + Math.sin(a) * r, ARC, 2, 8, 20);
    }
  }
  // dying: the last of his lightning bursts out of him and gutters away
  if (dying > 0.05 && dying < 0.7) {
    const s = 1 - dying / 0.7;
    for (let i = 0; i < 5; i++) {
      if (Math.random() > s) continue;
      const a = Math.random() * TAU, r = 60 + Math.random() * 180;
      lightning(ctx, 0, -40, Math.cos(a) * r, -40 + Math.sin(a) * r, ARC, 1.4 + s * 2, 7, 22);
    }
    glow(ctx, 0, -40, 160, '#ffffff', 0.3 * s);
  }
  ctx.restore();
}
