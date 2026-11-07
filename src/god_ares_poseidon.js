// Olympian boss artwork: Ares, God of War, and Poseidon, Shaker of the Earth.
// Same contract as bossart.js: origin at the boss's feet, facing +x, fl = hit flash, m = mood.
import { TAU, cl, sm, pulse, ell, expr, gaze, tube } from './bossart.js';
import { flame, eye, glow, lightning } from './art.js';
import { shade, rgba, lerp } from './util.js';

// Two-bone reach: from a root (shoulder/hip) toward a target with segment lengths a and b.
// bend picks which way the joint folds (+1 / -1). Returns [jointX, jointY, endX, endY].
function ik(sx, sy, hx, hy, a, b, bend) {
  const dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy) || 1;
  const dd = Math.min(d, a + b - 0.5);
  const ex = sx + (dx / d) * dd, ey = sy + (dy / d) * dd;
  const al = Math.acos(cl((a * a + dd * dd - b * b) / (2 * a * dd), -1, 1));
  const ang = Math.atan2(dy, dx) + bend * al;
  return [sx + Math.cos(ang) * a, sy + Math.sin(ang) * a, ex, ey];
}

// A muscular two-part limb: root -> joint -> end, with tapering widths.
function limb2(ctx, sx, sy, jx, jy, ex, ey, w0, w1, w2, fill, out = 'rgba(0,0,0,.75)') {
  tube(ctx, [[sx, sy], [(sx + jx) / 2, (sy + jy) / 2], [jx, jy]], w0, w1, fill, out, 2.4);
  tube(ctx, [[jx, jy], [(jx + ex) / 2, (jy + ey) / 2], [ex, ey]], w1, w2, fill, out, 2.4);
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.arc(jx, jy, w1 / 2 - 0.6, 0, TAU); ctx.fill();
}

const lerp2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

// =====================================================================================
// ---------- Ares: God of War ----------
// A towering bronze hoplite with a blood-red crest and cape, a lion-faced shield and a
// spear that reforms in fire after every throw. His eyes burn in the helmet's slits.
// =====================================================================================

function aresShield(ctx, x, y, rot, fl, enr, t, roar) {
  const F = c => (fl ? '#fff' : c);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  // the shield is seen three-quarters on, so it reads as a tall oval
  ctx.fillStyle = 'rgba(0,0,0,.8)';
  ell(ctx, 0, 0, 18.5, 30.5); ctx.fill();
  const g = ctx.createRadialGradient(-5, -10, 2, 0, 0, 30);
  g.addColorStop(0, F('#ffe2a0'));
  g.addColorStop(0.35, F('#d2963e'));
  g.addColorStop(0.8, F('#8a5420'));
  g.addColorStop(1, F('#4a2a10'));
  ctx.fillStyle = g;
  ell(ctx, 0, 0, 17, 29); ctx.fill();
  // raised rim with rivets
  ctx.strokeStyle = F('#5a3412');
  ctx.lineWidth = 3.2;
  ell(ctx, 0, 0, 14.2, 25.5); ctx.stroke();
  ctx.strokeStyle = F('#f4c678');
  ctx.lineWidth = 1;
  ell(ctx, -0.6, -0.8, 15.6, 27.4); ctx.stroke();
  ctx.fillStyle = F('#ffe6b0');
  for (let q = 0; q < 12; q++) { const a = (q / 12) * TAU; ctx.beginPath(); ctx.arc(Math.cos(a) * 15.6, Math.sin(a) * 27.3, 0.9, 0, TAU); ctx.fill(); }
  // crimson field and a snarling lion's head
  ctx.fillStyle = F('#7a1410');
  ell(ctx, 0, 0, 12.4, 22.6); ctx.fill();
  ctx.save();
  ctx.scale(0.62, 1);
  ctx.fillStyle = F('#d8a048');
  ctx.beginPath();
  for (let q = 0; q < 14; q++) {
    const a = (q / 14) * TAU + 0.11, r = q % 2 ? 11 : 15.5;
    const px = Math.cos(a) * r, py = Math.sin(a) * r * 1.05;
    q ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = F('#f0c070');
  ctx.beginPath(); ctx.arc(0, 0.5, 8.6, 0, TAU); ctx.fill();
  ctx.fillStyle = F('#3a0806');
  ctx.beginPath(); ctx.moveTo(-5, 3); ctx.quadraticCurveTo(0, 8 + roar * 3, 5, 3); ctx.quadraticCurveTo(0, 5, -5, 3); ctx.fill();
  ctx.fillStyle = '#fff6e6';
  for (const sx of [-3, 3]) { ctx.beginPath(); ctx.moveTo(sx - 1.2, 3.3); ctx.lineTo(sx, 6.2 + roar); ctx.lineTo(sx + 1.2, 3.3); ctx.fill(); }
  ctx.fillStyle = F('#7a4a18');
  ctx.beginPath(); ctx.moveTo(-2, -1); ctx.lineTo(0, 2.4); ctx.lineTo(2, -1); ctx.fill();
  const ec = enr ? '#fff0b0' : '#ff3a1a';
  eye(ctx, -3.6, -3, 1.5 + (enr ? 0.4 : 0), ec, '#fff', 3 + pulse(t, 5) * 2);
  eye(ctx, 3.6, -3, 1.5 + (enr ? 0.4 : 0), ec, '#fff', 3 + pulse(t, 5) * 2);
  ctx.restore();
  // shine
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = fl ? 'rgba(0,0,0,0)' : 'rgba(255,240,200,.35)';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(0, 0, 11, 21, 0, -2.6, -1.7); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

// The spear: shaft through the hand at angle a, with a leaf-shaped bronze blade.
function aresSpear(ctx, hx, hy, a, back, front, fl, heat, t, alpha = 1) {
  if (alpha <= 0.01) return;
  const F = c => (fl ? '#fff' : c);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(hx, hy);
  ctx.rotate(a);
  ctx.strokeStyle = 'rgba(0,0,0,.8)';
  ctx.lineWidth = 5.2;
  ctx.beginPath(); ctx.moveTo(-back, 0); ctx.lineTo(front, 0); ctx.stroke();
  ctx.strokeStyle = F('#6a3a1c');
  ctx.lineWidth = 3.2;
  ctx.beginPath(); ctx.moveTo(-back, 0); ctx.lineTo(front, 0); ctx.stroke();
  ctx.strokeStyle = F('#a8683a');
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-back, -0.8); ctx.lineTo(front, -0.8); ctx.stroke();
  // butt spike and grip bindings
  ctx.fillStyle = F('#c0883a');
  ctx.beginPath(); ctx.moveTo(-back - 7, 0); ctx.lineTo(-back + 1, -2.6); ctx.lineTo(-back + 1, 2.6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = F('#3a1a0a');
  for (let q = -2; q <= 2; q++) ctx.fillRect(q * 3 - 1, -2.4, 1.6, 4.8);
  // blade
  const bg = ctx.createLinearGradient(front, -5, front, 5);
  bg.addColorStop(0, F('#fff0c0'));
  bg.addColorStop(0.5, F('#e0a048'));
  bg.addColorStop(1, F('#8a5418'));
  ctx.fillStyle = bg;
  ctx.strokeStyle = 'rgba(0,0,0,.75)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(front - 2, 0);
  ctx.quadraticCurveTo(front + 6, -6.5, front + 22, 0);
  ctx.quadraticCurveTo(front + 6, 6.5, front - 2, 0);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = F('#7a4a18');
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(front, 0); ctx.lineTo(front + 19, 0); ctx.stroke();
  if (heat > 0.05) {
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, front + 12, 0, 12 + heat * 8, '#ff6a2a', 0.35 * heat);
  }
  ctx.restore();
}

export function ares(ctx, b, t, fl, m) {
  const F = c => (fl ? '#fff' : c);
  const st = b.st, k = m.k, air = !b.ground, run = Math.abs(b.vx) > 30;
  const windup = st === 'charge' && b.stT > 0, charging = st === 'charge' && b.stT <= 0;
  const intro = m.intro, roar = Math.sin(m.roar * Math.PI), dying = m.dying, enr = m.enr;
  const EYE = enr ? '#fff2c8' : '#ff3a1a';
  const FIRE = enr ? ['#ff8a3a', '#ffe08a', '#ffffff'] : ['#ff2a0a', '#ff8a1a', '#ffe28a'];
  const skin = F('#b8714a'), skinL = F('#e0a074'), skinD = F('#6a3420');
  const bronze = F('#c8893a'), bronzeL = F('#ffd890'), bronzeD = F('#6a3e14');
  const red = F('#b0141a'), redD = F('#5a0608');
  let heat = 0.45 + (enr ? 0.4 : 0) + roar * 0.8 + (charging ? 0.4 : 0) - dying;

  // ---- pose ----
  let crouch = 0, lean = 0, hand = [18, -12], sa = -Math.PI / 2 + 0.06, shield = [30, -24], shRot = 0.05;
  let spearA = 1, spearFirst = false, shout = 0, legs = 'stand', stream = 0;
  const base = { open: 0.12, brow: 0.55, lid: 0.12, tilt: 0 };
  const breathe = Math.sin(t * 2.2);
  hand = [18, -12 + breathe * 1.2];
  if (intro < 1) {
    const i = intro;
    const kneel = 1 - sm((i - 0.3) / 0.3), cry = sm((i - 0.62) / 0.18) * (1 - sm((i - 0.92) / 0.08));
    crouch = kneel;
    lean = kneel * 0.32 - cry * 0.12;
    base.tilt += kneel * 0.45 - cry * 0.35;
    hand = lerp2([26, 6], [6, -86], cry);
    sa = -Math.PI / 2 - cry * 0.35;
    shield = lerp2([26, 26], [28, -62], cry);
    shout = cry;
    base.open = Math.max(base.open, cry);
    base.brow = 0.9;
    heat += cry * 0.8 + (i > 0.45 && i < 0.6 ? 1 : 0);
    if (i > 0.44 && i < 0.62) {
      const f = (i - 0.44) / 0.18;
      glow(ctx, 30, -2, 30 + f * 70, '#ff8a3a', (1 - f) * 0.6);
    }
  } else if (windup) {
    const w = sm(k * 1.6);
    crouch = 0.62 * w;
    lean = 0.18 * w;
    shield = lerp2(shield, [36, -30], w);
    shRot = 0.1;
    hand = lerp2(hand, [10, -54], w);
    sa = lerp(sa, 0.06, w);
    spearFirst = true;
    base.brow = 0.85; base.lid = 0.38 * w; base.open = 0.05;
    legs = 'brace';
    heat += w * 0.4;
  } else if (charging) {
    crouch = 0.25; lean = 0.3;
    shield = [44, -32]; shRot = 0.14;
    hand = [12, -54]; sa = 0.14;
    spearFirst = true;
    stream = 1;
    legs = 'run';
    base.brow = 1; base.open = 0.75; base.lid = 0.2;
  } else if (st === 'leap') {
    if (!air && b.n === 0) {
      crouch = 0.8; lean = 0.2;
      hand = [-12, -40]; sa = -Math.PI / 2 - 0.55;
      shield = [30, -20];
      base.brow = 0.9; base.lid = 0.3;
      legs = 'brace';
    } else if (air) {
      const fall = (b.vy || 0) > 0;
      lean = fall ? 0.22 : -0.1;
      hand = fall ? [16, -86] : [0, -94];
      sa = fall ? 1.15 : -1.0;
      shield = [34, -46]; shRot = -0.2;
      legs = 'tuck';
      stream = 0.6;
      base.open = fall ? 1 : 0.6; base.brow = 1;
      shout = fall ? 1 : 0.5;
    } else {
      crouch = 0.55;
      legs = 'brace';
    }
  } else if (st === 'spit') {
    const ph = ((1.6 - b.stT) / 0.4) % 1, vol = b.n;
    const idleH = [18, -12], back = [-30, -76], fwd = [40, -84];
    if (vol >= 3) {
      const r = sm(ph / 0.7);
      hand = lerp2(fwd, idleH, r);
      sa = lerp(0.1, -Math.PI / 2 + 0.06, r);
      spearA = cl((ph - 0.15) / 0.25);
      lean = 0.14 * (1 - r);
    } else {
      const start = vol > 0 ? fwd : idleH;
      if (ph < 0.5) { const q = sm(ph / 0.5); hand = lerp2(start, back, q); sa = lerp(vol > 0 ? 0.1 : -Math.PI / 2 + 0.06, -0.22, q); lean = lerp(0.12, -0.14, q); }
      else { const q = sm((ph - 0.5) / 0.5); hand = lerp2(back, fwd, q); sa = lerp(-0.22, 0.1, q); lean = lerp(-0.14, 0.14, q); shout = q; }
      spearA = vol > 0 ? cl((ph - 0.12) / 0.22) : 1;
      base.open = ph > 0.75 || (vol > 0 && ph < 0.15) ? 0.9 : 0.2;
      base.brow = 0.9;
    }
    shield = [22, -16]; shRot = -0.15;
    legs = 'brace';
    heat += 0.3;
  } else if (run) {
    legs = 'run';
    lean = 0.12;
    hand = [14, -20];
    sa = -Math.PI / 2 + 0.45;
  }
  if (dying > 0) {
    crouch = Math.max(crouch, sm(dying * 1.4));
    lean = lerp(lean, 0.5, sm(dying));
    sa = lerp(sa, 0.6, sm(dying));
    hand = lerp2(hand, [30, 10], sm(dying));
    shield = lerp2(shield, [26, 30], sm(dying));
    shRot = lerp(shRot, 0.9, sm(dying));
    legs = 'stand';
  }
  const e = expr(m, base);
  heat = cl(heat + e.roar * 0.6, 0, 2.2);
  if (e.roar > 0.2) shout = Math.max(shout, e.roar);

  // ---- aura and shadow ----
  glow(ctx, 0, -70, 110, enr ? '#ffb060' : '#ff3a1a', 0.12 + heat * 0.1);
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ell(ctx, 0, 0, 48 + crouch * 8, 7); ctx.fill();
  if (heat > 0.6) for (const fx of [-16, 14]) flame(ctx, fx, 2, 26, 22 * (heat - 0.4), t, FIRE, fx, 4);

  const hipY = -66 + crouch * 18 + (legs === 'tuck' ? -6 : 0);
  // the fury of war: a mantle of fire behind him, white-hot when enraged
  if (heat > 0.75) {
    const fk = cl(heat - 0.6);
    flame(ctx, -2, hipY - 38, 44, 60 * fk + 16, t, FIRE, 1.3, 5);
    flame(ctx, -16, hipY - 10, 26, 40 * fk + 10, t, FIRE, 4.1, 3);
  }
  // ---- legs ----
  const ph = t * (legs === 'run' ? (charging ? 19 : 13) : 2);
  const legEnd = near => {
    const s = near ? 1 : -1;
    if (legs === 'run') { const p = ph + (near ? 0 : Math.PI); return [Math.sin(p) * 24 + 6, -Math.max(0, Math.cos(p)) * 16]; }
    if (legs === 'tuck') return near ? [14, hipY + 46] : [-16, hipY + 52];
    if (legs === 'brace') return near ? [26, 0] : [-24, 0];
    return near ? [14, 0] : [-12, 0];
  };
  const leg = near => {
    const hx = near ? 4 : -4, [fx, fy] = legEnd(near);
    const [kx, ky] = ik(hx, hipY, fx, fy - 6, 32, 32, -1);
    const sk = near ? skin : F(shade('#b8714a', -0.3));
    tube(ctx, [[hx, hipY], [(hx + kx) / 2, (hipY + ky) / 2], [kx, ky]], 20, 15, sk, 'rgba(0,0,0,.75)', 2.4);
    // bronze greave over the shin
    const gg = ctx.createLinearGradient(kx - 8, 0, kx + 8, 0);
    gg.addColorStop(0, near ? bronzeD : F('#3a2008'));
    gg.addColorStop(0.5, near ? F('#e0a858') : F('#a06a2a'));
    gg.addColorStop(1, near ? bronzeD : F('#3a2008'));
    tube(ctx, [[kx, ky], [(kx + fx) / 2, (ky + fy - 6) / 2], [fx, fy - 6]], 15, 11, gg, 'rgba(0,0,0,.8)', 2.4);
    ctx.fillStyle = near ? bronze : bronzeD;
    ctx.strokeStyle = 'rgba(0,0,0,.7)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(kx, ky, 5.2, 0, TAU); ctx.fill(); ctx.stroke();
    // sandal
    ctx.fillStyle = near ? F('#4a2a14') : F('#2a160a');
    ell(ctx, fx + 4, fy - 3, 9, 3.6); ctx.fill(); ctx.stroke();
  };
  ctx.save();
  // cape and upper body share a frame that leans about the hips
  ctx.translate(0, hipY);
  ctx.rotate(lean);
  // ---- cape ----
  {
    const wv = Math.sin(t * 4) * 4, s = stream;
    const tipX = lerp(-26, -70, s), tipY = lerp(52, -6, s);
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    const cg = ctx.createLinearGradient(-10, -48, tipX, tipY);
    cg.addColorStop(0, red);
    cg.addColorStop(1, redD);
    ctx.fillStyle = cg;
    ctx.strokeStyle = 'rgba(0,0,0,.8)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-8, -48);
    ctx.quadraticCurveTo(-26 - s * 20, -30 + wv, tipX - 4, tipY + wv);
    for (let q = 0; q < 4; q++) ctx.lineTo(tipX + 6 + q * 7 + s * q * 3, tipY + (q % 2 ? -6 : 0) + wv - s * q * 6);
    ctx.quadraticCurveTo(-4 + s * 4, -10, 8, -46);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 1.4;
    for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.moveTo(-6 + q * 3, -44); ctx.quadraticCurveTo(-20 - s * 20 + q * 5, -20 + wv, tipX + 6 + q * 8, tipY + wv - s * q * 5); ctx.stroke(); }
  }
  ctx.restore();
  leg(false);
  leg(true);
  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(lean);
  // ---- leather skirt (pteruges) ----
  for (let q = 0; q < 7; q++) {
    const x = -14 + q * 4.6, sw = (legs === 'run' ? Math.sin(ph + q) * 2 : 0) - stream * 3;
    ctx.fillStyle = q % 2 ? F('#5a1a10') : F('#7a2a18');
    ctx.strokeStyle = 'rgba(0,0,0,.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, -2); ctx.lineTo(x + 4.6, -2); ctx.lineTo(x + 4.2 + sw, 18); ctx.lineTo(x + 0.4 + sw, 18); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = bronzeL;
    ctx.fillRect(x + 1.2 + sw, 15, 2.2, 2);
  }
  // ---- muscled bronze cuirass ----
  const torso = new Path2D();
  torso.moveTo(-14, -1);
  torso.bezierCurveTo(-18, -18, -17, -36, -13, -48);
  torso.quadraticCurveTo(0, -55, 13, -48);
  torso.bezierCurveTo(20, -40, 21, -26, 16, -14);
  torso.quadraticCurveTo(14, -4, 13, -1);
  torso.closePath();
  ctx.strokeStyle = 'rgba(0,0,0,.85)';
  ctx.lineWidth = 3;
  ctx.stroke(torso);
  const tg = ctx.createLinearGradient(-16, -50, 18, -4);
  tg.addColorStop(0, bronzeD);
  tg.addColorStop(0.45, bronzeL);
  tg.addColorStop(0.7, bronze);
  tg.addColorStop(1, bronzeD);
  ctx.fillStyle = tg;
  ctx.fill(torso);
  ctx.strokeStyle = 'rgba(70,30,6,.75)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(1, -44); ctx.quadraticCurveTo(10, -44, 17, -34); ctx.quadraticCurveTo(10, -30, 2, -32); // pec
  ctx.moveTo(4, -26); ctx.lineTo(14, -25); ctx.moveTo(4, -18); ctx.lineTo(14, -17); ctx.moveTo(4, -10); ctx.lineTo(13, -9); // abs
  ctx.moveTo(4, -30); ctx.lineTo(4, -4);
  ctx.stroke();
  ctx.strokeStyle = fl ? '#fff' : 'rgba(255,236,190,.55)';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-12, -46); ctx.quadraticCurveTo(0, -53, 12, -47); ctx.stroke();
  // belt
  ctx.fillStyle = F('#3a1a0c');
  ctx.fillRect(-15, -5, 30, 5);
  ctx.fillStyle = bronzeL;
  ctx.beginPath(); ctx.arc(10, -2.5, 2.4, 0, TAU); ctx.fill();
  // neck
  ctx.fillStyle = skinD;
  ctx.fillRect(-2, -58, 9, 10);

  // ---- head: Corinthian helmet ----
  const hx = 5, hy = -66;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(e.tilt + m.ly * 0.12);
  const crestFl = Math.sin(t * 9) * 1.5 + stream * 10 + shout * 2;
  // horsehair crest
  {
    const cg = ctx.createLinearGradient(0, -30, 0, -8);
    cg.addColorStop(0, F('#ff3a2a'));
    cg.addColorStop(1, red);
    ctx.fillStyle = cg;
    ctx.strokeStyle = 'rgba(0,0,0,.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(9, -11);
    ctx.quadraticCurveTo(8, -30 + roar * -6, -8, -28 - roar * 4);
    ctx.quadraticCurveTo(-24 - crestFl, -24, -34 - crestFl * 1.6, -6 + Math.sin(t * 7) * 3 + stream * 4);
    ctx.quadraticCurveTo(-26 - crestFl, -10, -12, -9);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = F('#ff7a5a');
    ctx.lineWidth = 0.9;
    for (let q = 0; q < 6; q++) {
      ctx.beginPath();
      ctx.moveTo(6 - q * 3, -14 - q * 0.8);
      ctx.quadraticCurveTo(-4 - q * 3, -26 + q * 1.5, -24 - crestFl - q * 1.5, -12 + q * 1.4 + Math.sin(t * 7 + q) * 1.5);
      ctx.stroke();
    }
  }
  // beard and jaw beneath the cheek guards; the jaw drops in a war cry
  const open = e.open;
  ctx.save();
  ctx.translate(4, 7);
  ctx.rotate(open * 0.32);
  ctx.fillStyle = F('#2a140a');
  ctx.strokeStyle = 'rgba(0,0,0,.8)';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(10, 1); ctx.quadraticCurveTo(12, 9, 7, 13); ctx.lineTo(4, 17); ctx.lineTo(1, 12); ctx.lineTo(-3, 14); ctx.quadraticCurveTo(-7, 6, -6, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff6e6';
  for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.moveTo(5 + q * 2, 1.6); ctx.lineTo(6 + q * 2, -1.2); ctx.lineTo(7 + q * 2, 1.6); ctx.fill(); }
  ctx.restore();
  // dark face under the helmet
  ctx.fillStyle = F('#1a0806');
  ell(ctx, 7, 2, 7, 9); ctx.fill();
  if (open > 0.25) {
    ctx.fillStyle = F('#4a0606');
    ell(ctx, 11, 7 + open * 2, 2.6, 1.8 + open * 3); ctx.fill();
    glow(ctx, 11, 8, 8 + open * 6, '#ff5a2a', 0.25 * open * heat);
  }
  // helmet shell
  const hg = ctx.createLinearGradient(-12, -14, 12, 10);
  hg.addColorStop(0, bronzeL);
  hg.addColorStop(0.45, bronze);
  hg.addColorStop(1, bronzeD);
  ctx.fillStyle = hg;
  ctx.strokeStyle = 'rgba(0,0,0,.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-13, 10);
  ctx.quadraticCurveTo(-16, -2, -12, -9);
  ctx.quadraticCurveTo(-4, -17, 7, -13);
  ctx.quadraticCurveTo(13, -10, 14, -4);
  ctx.lineTo(13, -1.5);
  ctx.lineTo(7, -1.8);
  ctx.lineTo(6.5, 1.2);
  ctx.lineTo(12.6, 1);
  ctx.lineTo(14.8, 7.5);
  ctx.lineTo(12.4, 8.6);
  ctx.lineTo(10.4, 6);
  ctx.lineTo(9.6, 13);
  ctx.quadraticCurveTo(3, 14.5, -2, 12);
  ctx.quadraticCurveTo(-8, 14, -13, 10);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // engraved brow line and cheek-guard scroll
  ctx.strokeStyle = 'rgba(60,24,4,.7)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-11, -6); ctx.quadraticCurveTo(0, -10.5, 12, -5); ctx.moveTo(-1, 2); ctx.quadraticCurveTo(-4, 8, 2, 10); ctx.stroke();
  ctx.strokeStyle = fl ? '#fff' : 'rgba(255,240,200,.6)';
  ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(-10, -9); ctx.quadraticCurveTo(-2, -15, 7, -12.5); ctx.stroke();
  // the eye burning in the slit
  ctx.fillStyle = '#100404';
  ctx.beginPath(); ctx.moveTo(6.8, -1.6); ctx.lineTo(13, -1.3); ctx.lineTo(12.6, 0.9); ctx.lineTo(6.6, 1); ctx.closePath(); ctx.fill();
  gaze(ctx, 10, -0.3, 2, EYE, m, e, { skin: bronze, nx: 1, brow: false, look: 0.3, halo: 4 + heat * 2 });
  if (heat > 0.5) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const sg = ctx.createLinearGradient(10, 0, -8, -4);
    sg.addColorStop(0, rgba(EYE, 0.7 * cl(heat - 0.4)));
    sg.addColorStop(1, rgba(EYE, 0));
    ctx.strokeStyle = sg;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(10, -0.3); ctx.quadraticCurveTo(2, -2 + Math.sin(t * 8), -8, -4); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // ---- spear arm (shoulder at -3,-44) ----
  const drawSpearArm = () => {
    const [ex, ey, wx, wy] = ik(-3, -44, hand[0], hand[1], 23, 23, 1);
    limb2(ctx, -3, -44, ex, ey, wx, wy, 16, 13, 10, skin);
    ctx.strokeStyle = 'rgba(60,20,8,.5)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(lerp(-3, ex, 0.3), lerp(-44, ey, 0.3) + 2); ctx.quadraticCurveTo(lerp(-3, ex, 0.6) + 2, lerp(-44, ey, 0.6) + 3, lerp(-3, ex, 0.9), lerp(-44, ey, 0.9) + 1); ctx.stroke();
    ctx.strokeStyle = bronzeL;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(lerp(ex, wx, 0.55), lerp(ey, wy, 0.55)); ctx.lineTo(lerp(ex, wx, 0.85), lerp(ey, wy, 0.85)); ctx.stroke();
    // bronze shoulder guard
    ctx.fillStyle = bronze;
    ctx.strokeStyle = 'rgba(0,0,0,.8)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(-3, -45, 9, 7, -0.3, 0, TAU); ctx.fill(); ctx.stroke();
    aresSpear(ctx, wx, wy, sa, 52, 66, fl, heat, t, spearA);
    if (spearA < 1 && spearA > 0) flame(ctx, wx + Math.cos(sa) * 40, wy + Math.sin(sa) * 40 + 6, 30, 26 * (1 - spearA) + 8, t, FIRE, 3, 4);
    // fist
    ctx.fillStyle = skinL;
    ctx.strokeStyle = 'rgba(0,0,0,.8)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(wx, wy, 5, 0, TAU); ctx.fill(); ctx.stroke();
  };
  const drawShieldArm = () => {
    const [ex, ey, wx, wy] = ik(8, -46, shield[0] - 6, shield[1] + 2, 22, 22, 1);
    limb2(ctx, 8, -46, ex, ey, wx, wy, 15, 12, 10, F(shade('#b8714a', -0.12)));
    aresShield(ctx, shield[0], shield[1], shRot, fl, enr, t, shout);
  };
  if (spearFirst) { drawSpearArm(); drawShieldArm(); } else { drawShieldArm(); drawSpearArm(); }
  ctx.restore();

  // ---- embers of war ----
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let q = 0; q < 12; q++) {
    const f = (t * 0.6 + q * 0.173) % 1, x = -40 + ((q * 37) % 80) + Math.sin(t * 2 + q) * 8;
    ctx.fillStyle = rgba(q % 3 ? FIRE[1] : '#ffffff', (1 - f) * 0.75 * cl(heat));
    ctx.fillRect(x, -10 - f * 150, 2, 2);
  }
  ctx.restore();
  if (shout > 0.3) glow(ctx, 30, -134, 40 + shout * 30, '#ff6a2a', shout * 0.25);
}

// =====================================================================================
// ---------- Poseidon: Shaker of the Earth ----------
// A colossal sea-king: teal skin, a beard and mane of living water, a coral crown, a conch
// pauldron, a scaled kilt hung with kelp, and a golden trident whose tines glow like the deep.
// =====================================================================================

function trident(ctx, hx, hy, a, grip, fl, glowK, t) {
  const F = c => (fl ? '#fff' : c);
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(a);
  // shaft from the butt (-grip) to the head (+L)
  const L = 236 - grip;
  ctx.strokeStyle = 'rgba(0,0,0,.85)';
  ctx.lineWidth = 7.5;
  ctx.beginPath(); ctx.moveTo(-grip, 0); ctx.lineTo(L, 0); ctx.stroke();
  const sg = ctx.createLinearGradient(0, -3, 0, 3);
  sg.addColorStop(0, F('#fff0a8'));
  sg.addColorStop(0.5, F('#d8a83a'));
  sg.addColorStop(1, F('#7a5410'));
  ctx.strokeStyle = sg;
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-grip, 0); ctx.lineTo(L, 0); ctx.stroke();
  // grip wrappings and a pearl pommel
  ctx.fillStyle = F('#1e4a5a');
  for (let q = -3; q <= 3; q++) ctx.fillRect(q * 4 - 1.2, -3.2, 2.4, 6.4);
  ctx.fillStyle = F('#e8fbff');
  ctx.beginPath(); ctx.arc(-grip - 3, 0, 4.2, 0, TAU); ctx.fill();
  // head: a crossbar and three barbed tines
  ctx.translate(L, 0);
  ctx.fillStyle = sg;
  ctx.strokeStyle = 'rgba(0,0,0,.85)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-6, -3); ctx.quadraticCurveTo(0, -16, 6, -17); ctx.lineTo(6, -13); ctx.quadraticCurveTo(3, -10, 4, -3);
  ctx.lineTo(4, 3); ctx.quadraticCurveTo(3, 10, 6, 13); ctx.lineTo(6, 17); ctx.quadraticCurveTo(0, 16, -6, 3); ctx.closePath();
  ctx.fill(); ctx.stroke();
  const tine = (y, len) => {
    ctx.beginPath();
    ctx.moveTo(5, y - 2.4); ctx.lineTo(5 + len, y - 1.2); ctx.lineTo(5 + len + 9, y); ctx.lineTo(5 + len, y + 1.2); ctx.lineTo(5, y + 2.4); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5 + len - 1, y + (y < 0 ? 1 : y > 0 ? -1 : 1.2)); ctx.lineTo(5 + len - 7, y + (y < 0 ? 5 : y > 0 ? -5 : 5)); ctx.lineTo(5 + len - 5, y); ctx.closePath(); ctx.fill();
  };
  tine(-15, 22);
  tine(15, 22);
  tine(0, 34);
  // glowing tips
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, y] of [[36, -15], [48, 0], [36, 15]]) glow(ctx, x, y, 9 + glowK * 12 + Math.sin(t * 6 + y) * 2, '#3ad8ff', 0.35 + glowK * 0.5);
  ctx.restore();
}

// A strand of living water: a tapered tube that sways, with a foam highlight and a drip.
function waterStrand(ctx, pts, w0, w1, fl, t, seed) {
  const g = ctx.createLinearGradient(pts[0][0], pts[0][1], pts[pts.length - 1][0], pts[pts.length - 1][1]);
  g.addColorStop(0, fl ? '#fff' : 'rgba(220,255,255,.95)');
  g.addColorStop(0.5, fl ? '#fff' : 'rgba(90,210,235,.9)');
  g.addColorStop(1, fl ? '#fff' : 'rgba(30,120,170,.55)');
  const E = tube(ctx, pts, w0, w1, g, 'rgba(6,40,60,.55)', 1.4);
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 1;
  ctx.beginPath(); E.L.slice(0, -1).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  const f = (t * 0.8 + seed) % 1, [ex, ey] = pts[pts.length - 1];
  ctx.fillStyle = `rgba(170,240,255,${0.9 * (1 - f)})`;
  ell(ctx, ex, ey + f * 26, 1.6, 2.4); ctx.fill();
}

export function poseidon(ctx, b, t, fl, m) {
  const F = c => (fl ? '#fff' : c);
  const st = b.st, k = m.k, intro = m.intro, roar = Math.sin(m.roar * Math.PI), dying = m.dying, enr = m.enr;
  const storm = enr ? 1 : 0;
  const skin = F(shade('#3a8a86', -storm * 0.22)), skinL = F(shade('#78cfc2', -storm * 0.2)), skinD = F(shade('#14484c', -storm * 0.2));
  const gold = F('#e8b84a'), goldL = F('#fff0a8'), goldD = F('#7a5410');
  const EYE = enr ? '#e8ffff' : '#5ff2ff';
  let power = 0.4 + storm * 0.4 + roar * 0.8;

  // ---- pose ----
  let crouch = 0, lean = 0, tHand = [44, -30], tA = -Math.PI / 2, grip = 120, free = [20, -8], open = 0.15, freeOpen = 0.2;
  let walkK = 0, bob = 0, slam = 0, inhale = 0, jet = 0, sweep = 0, rise = 1;
  const base = { open: 0.15, brow: 0.45, lid: 0.12, tilt: 0 };
  const br = Math.sin(t * 1.8);
  tHand = [54, -32 + br];
  free = [22, -6 + br];
  if (intro < 1) {
    rise = sm(intro / 0.75);
    base.tilt += (1 - rise) * 0.3 - sm((intro - 0.7) / 0.3) * 0.25;
    base.open = sm((intro - 0.65) / 0.25) * 0.9;
    base.brow = 0.8;
    tHand = lerp2([40, -10], [36, -78], sm((intro - 0.5) / 0.4));
    free = lerp2([30, -40], [34, -66], sm((intro - 0.6) / 0.3));
    freeOpen = 1;
    power += 0.6;
  } else if (st === 'stomp') {
    if (k < 0.5) {
      const u = sm(k / 0.5);
      tHand = lerp2(tHand, [30, -112], u);
      free = lerp2(free, [24, -108], u);
      lean = -0.1 * u;
      base.brow = 0.6 + u * 0.4; base.open = 0.2 + u * 0.5;
      power += u * 0.8;
      freeOpen = 0;
    } else {
      const u = sm((k - 0.5) / 0.12);
      slam = 1 - cl((k - 0.5) / 0.4);
      tHand = lerp2([30, -112], [56, -38], u);
      free = lerp2([24, -108], [54, -40], u);
      crouch = 0.55 * u * (0.4 + 0.6 * slam);
      lean = 0.16 * u;
      base.brow = 1; base.open = 0.95 * slam + 0.2;
      freeOpen = 0;
      power += slam;
    }
  } else if (st === 'shards') {
    const ph = ((k * 1.6 + 0.25) / 0.45) % 1, cock = ph < 0.5 ? sm(ph / 0.5) : 1 - sm((ph - 0.5) / 0.3);
    sweep = ph >= 0.5 ? sm((ph - 0.5) / 0.3) : 0;
    free = lerp2([-20, -70], [44, -78], ph < 0.5 ? 1 - cock : sweep);
    freeOpen = 1;
    lean = lerp(-0.08, 0.1, ph < 0.5 ? 0 : sweep);
    base.brow = 0.8; base.open = sweep > 0.2 ? 0.6 : 0.2;
    power += 0.4;
  } else if (st === 'breath') {
    inhale = k < 0.17 ? sm(k / 0.17) : 0;
    jet = k >= 0.17 ? 1 : 0;
    free = jet ? [58 + m.lx * 6, -68 + m.ly * 10] : lerp2(free, [10, -50], inhale);
    freeOpen = 1;
    lean = jet ? 0.1 : -0.06 * inhale;
    base.open = jet ? 0.7 : 0.1; base.brow = 0.9; base.lid = jet ? 0.25 : 0;
    power += jet * 0.6 + inhale * 0.4;
  } else if (st === 'walk' || Math.abs(b.vx) > 30) {
    walkK = 1;
    const p = t * 7;
    bob = Math.abs(Math.sin(p)) * 5;
    tA = -Math.PI / 2 + Math.sin(p) * 0.08;
    tHand = [54 + Math.sin(p) * 6, -32 - bob];
    lean = 0.08;
    base.brow = 0.6;
  }
  if (dying > 0) {
    crouch = Math.max(crouch, sm(dying * 1.3));
    lean = lerp(lean, 0.35, sm(dying));
    tA = lerp(tA, 0.2, sm(dying));
    tHand = lerp2(tHand, [40, 0], sm(dying));
    free = lerp2(free, [30, 10], sm(dying));
  }
  const e = expr(m, base);
  open = e.open;
  power = cl(power + e.roar * 0.6, 0, 2.2);

  // ---- whirlpool at his feet ----
  const wp = 1 + (1 - rise) * 1.2 + storm * 0.3 + slam * 0.6;
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ell(ctx, 0, 0, 80 * wp, 10); ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let q = 0; q < 4; q++) {
    const r = (30 + q * 16) * wp, a0 = t * (2.2 - q * 0.3) + q;
    ctx.strokeStyle = `rgba(90,220,255,${0.35 - q * 0.06})`;
    ctx.lineWidth = 2.5 - q * 0.4;
    ctx.beginPath(); ctx.ellipse(0, -2, r, r * 0.16, 0, a0, a0 + 4.2); ctx.stroke();
  }
  ctx.restore();
  glow(ctx, 0, -100, 150, enr ? '#7ab8ff' : '#3ad8ff', 0.1 + power * 0.08);

  ctx.save();
  if (rise < 1) {
    // he surges up out of the water: clip at the surface and lift him through it
    ctx.beginPath(); ctx.rect(-300, -400, 600, 402); ctx.clip();
    ctx.translate(0, (1 - rise) * 215);
  }
  if (dying > 0) ctx.translate(0, sm(dying) * 26);
  const hipY = -92 + crouch * 26 + bob * 0.5;

  // ---- legs ----
  const lp = t * 7;
  const leg = near => {
    const hx = near ? 8 : -10;
    let fx = near ? 22 : -20, fy = 0;
    if (walkK) { const p = lp + (near ? 0 : Math.PI); fx = Math.sin(p) * 26 + (near ? 6 : -6); fy = -Math.max(0, Math.cos(p)) * 12; }
    if (crouch > 0.3) fx *= 1 + crouch * 0.4;
    const [kx, ky] = ik(hx, hipY, fx, fy - 8, 48, 46, -1);
    const sk = near ? skin : skinD;
    tube(ctx, [[hx, hipY], [(hx + kx) / 2, (hipY + ky) / 2], [kx, ky]], 34, 24, sk, 'rgba(0,0,0,.8)', 2.6);
    tube(ctx, [[kx, ky], [(kx + fx) / 2, (ky + fy - 8) / 2], [fx, fy - 8]], 24, 16, sk, 'rgba(0,0,0,.8)', 2.6);
    ctx.fillStyle = sk;
    ctx.beginPath(); ctx.arc(kx, ky, 11, 0, TAU); ctx.fill();
    // gold anklet and bare foot
    ctx.strokeStyle = near ? gold : goldD;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(fx - 8, fy - 14); ctx.lineTo(fx + 8, fy - 13); ctx.stroke();
    ctx.fillStyle = sk;
    ctx.strokeStyle = 'rgba(0,0,0,.8)';
    ctx.lineWidth = 1.8;
    ell(ctx, fx + 6, fy - 5, 15, 6); ctx.fill(); ctx.stroke();
    // barnacles on the far shin
    if (!near) { ctx.fillStyle = F('#c8d8d0'); for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.arc(lerp(kx, fx, 0.3 + q * 0.18) - 4, lerp(ky, fy, 0.3 + q * 0.18), 2, 0, TAU); ctx.fill(); } }
  };
  leg(false);

  // ---- living-water mane, flowing back behind the body ----
  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(lean);
  const hx0 = 12, hy0 = -106;
  for (let q = 0; q < 7; q++) {
    const w = Math.sin(t * 2.4 + q * 0.9) * 5, len = 56 + (q % 3) * 12 + roar * 22 + storm * 12;
    const sx = hx0 - 10 - q * 3.2, sy = hy0 - 22 + q * 6;
    waterStrand(ctx, [[sx, sy], [sx - 14 - len * 0.15, sy + len * 0.2 + w * 0.4], [sx - 24 - len * 0.25 + w * 0.5, sy + len * 0.6 + w], [sx - 26 - len * 0.3 + w, sy + len + w * 0.6]], 15 - q, 3, fl, t, q * 0.21);
  }
  // free (far) arm behind the torso
  {
    const [ex, ey, wx, wy] = ik(26, -76, free[0], free[1], 40, 38, 1);
    limb2(ctx, 26, -76, ex, ey, wx, wy, 28, 22, 16, skinD);
    ctx.strokeStyle = goldD;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(lerp(ex, wx, 0.6), lerp(ey, wy, 0.6)); ctx.lineTo(lerp(ex, wx, 0.75), lerp(ey, wy, 0.75)); ctx.stroke();
    // hand: open palm with a swirling orb of water, or a fist
    ctx.fillStyle = skin;
    ctx.strokeStyle = 'rgba(0,0,0,.8)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(wx, wy, 9, 0, TAU); ctx.fill(); ctx.stroke();
    if (freeOpen > 0.5) {
      const ax = Math.atan2(wy - ey, wx - ex);
      for (let q = 0; q < 4; q++) {
        const a = ax + (q - 1.5) * 0.32;
        ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.lineWidth = 6.4;
        ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * 14, wy + Math.sin(a) * 14); ctx.stroke();
        ctx.strokeStyle = skin; ctx.lineWidth = 4.2;
        ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * 14, wy + Math.sin(a) * 14); ctx.stroke();
      }
      const orb = 0.35 + inhale * 0.8 + jet * 0.6 + sweep * 0.8 + (st === 'shards' ? 0.4 : 0);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, wx + Math.cos(ax) * 14, wy + Math.sin(ax) * 14, 18 + orb * 18, '#3ad8ff', 0.25 + orb * 0.3);
      for (let q = 0; q < 3; q++) {
        const a0 = t * 6 + q * 2.1;
        ctx.strokeStyle = `rgba(200,250,255,${0.5 * orb})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.ellipse(wx + Math.cos(ax) * 14, wy + Math.sin(ax) * 14, 10 + orb * 6, 5 + orb * 3, a0, 0, 4); ctx.stroke();
      }
      ctx.restore();
      if (jet) {
        // the water jet roaring toward the player
        const jx = wx + Math.cos(ax) * 16, jy = wy + Math.sin(ax) * 16, ja = Math.atan2(m.ly, Math.max(0.2, m.lx));
        ctx.save();
        ctx.translate(jx, jy);
        ctx.rotate(ja - lean);
        ctx.globalCompositeOperation = 'lighter';
        const jg = ctx.createLinearGradient(0, 0, 180, 0);
        jg.addColorStop(0, 'rgba(220,255,255,.75)');
        jg.addColorStop(0.4, 'rgba(60,210,255,.4)');
        jg.addColorStop(1, 'rgba(60,210,255,0)');
        ctx.fillStyle = jg;
        ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(180, -30 + Math.sin(t * 20) * 4); ctx.lineTo(180, 30 + Math.sin(t * 17) * 4); ctx.lineTo(0, 6); ctx.closePath(); ctx.fill();
        for (let q = 0; q < 6; q++) {
          const f = (t * 3 + q / 6) % 1;
          ctx.fillStyle = `rgba(230,255,255,${0.7 * (1 - f)})`;
          ell(ctx, f * 170, Math.sin(q * 3.1 + t * 9) * f * 20, 3 + f * 6, 2 + f * 3); ctx.fill();
        }
        ctx.restore();
      }
    } else {
      ctx.strokeStyle = 'rgba(0,0,0,.45)';
      ctx.lineWidth = 1.2;
      for (let q = -1; q <= 1; q++) { ctx.beginPath(); ctx.arc(wx + 3, wy + q * 3.5, 3, -1.2, 1.2); ctx.stroke(); }
    }
  }
  ctx.restore();
  leg(true);

  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(lean);
  // ---- scaled kilt and kelp ----
  {
    const kg = ctx.createLinearGradient(0, -6, 0, 40);
    kg.addColorStop(0, F('#1e6a62'));
    kg.addColorStop(1, F('#0c3a3a'));
    ctx.fillStyle = kg;
    ctx.strokeStyle = 'rgba(0,0,0,.8)';
    ctx.lineWidth = 2.2;
    const sw = walkK ? Math.sin(lp) * 3 : 0;
    ctx.beginPath(); ctx.moveTo(-30, -6); ctx.lineTo(30, -6); ctx.lineTo(34 + sw, 34); ctx.quadraticCurveTo(0, 42, -34 + sw, 34); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = fl ? '#fff' : 'rgba(150,240,220,.4)';
    ctx.lineWidth = 1.2;
    for (let r = 0; r < 6; r++) for (let q = 0; q < 9; q++) { ctx.beginPath(); ctx.arc(-34 + q * 8 + (r % 2) * 4 + sw * r * 0.15, -2 + r * 7, 4.5, 0.15, Math.PI - 0.15); ctx.stroke(); }
    ctx.restore();
    for (let q = 0; q < 6; q++) {
      const x = -26 + q * 10, w = Math.sin(t * 3 + q) * 4;
      ctx.strokeStyle = F(q % 2 ? '#2f8a3a' : '#4aa83a');
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, 30); ctx.quadraticCurveTo(x + w, 44, x - w * 0.5 + sw, 56 + (q % 3) * 5); ctx.stroke();
    }
  }
  // ---- torso ----
  const torso = new Path2D();
  torso.moveTo(-24, -4);
  torso.bezierCurveTo(-30, -26, -44, -50, -40, -76);
  torso.quadraticCurveTo(-18, -94, 12, -91);
  torso.bezierCurveTo(36, -89, 50, -76, 48, -58);
  torso.bezierCurveTo(46, -44, 34, -34, 30, -22);
  torso.quadraticCurveTo(26, -10, 26, -4);
  torso.closePath();
  ctx.strokeStyle = 'rgba(0,0,0,.85)';
  ctx.lineWidth = 3.2;
  ctx.stroke(torso);
  const tg = ctx.createLinearGradient(-30, -86, 34, -4);
  tg.addColorStop(0, skinD);
  tg.addColorStop(0.4, skinL);
  tg.addColorStop(0.75, skin);
  tg.addColorStop(1, skinD);
  ctx.fillStyle = tg;
  ctx.fill(torso);
  // muscles: pecs, abs, serratus
  ctx.strokeStyle = 'rgba(6,40,40,.6)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(8, -82); ctx.quadraticCurveTo(34, -82, 47, -60); ctx.quadraticCurveTo(28, -52, 10, -58);
  for (let q = 0; q < 3; q++) { ctx.moveTo(12, -46 + q * 11); ctx.quadraticCurveTo(22, -48 + q * 11, 31, -44 + q * 11); }
  ctx.moveTo(12, -56); ctx.lineTo(12, -10);
  ctx.moveTo(-14, -56); ctx.lineTo(-8, -50); ctx.moveTo(-15, -48); ctx.lineTo(-9, -42);
  ctx.stroke();
  // wet sheen
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = fl ? 'rgba(0,0,0,0)' : 'rgba(190,255,250,.32)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-36, -78); ctx.quadraticCurveTo(-10, -93, 24, -88); ctx.moveTo(18, -76); ctx.quadraticCurveTo(34, -74, 42, -64); ctx.stroke();
  ctx.restore();
  // gold belt with a trident medallion
  ctx.fillStyle = gold;
  ctx.strokeStyle = 'rgba(0,0,0,.8)';
  ctx.lineWidth = 1.6;
  ctx.fillRect(-30, -9, 60, 8); ctx.strokeRect(-30, -9, 60, 8);
  ctx.fillStyle = goldL;
  ctx.beginPath(); ctx.arc(14, -5, 6.5, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = F('#1e6a8a');
  ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(14, -1); ctx.lineTo(14, -9); ctx.moveTo(11, -8); ctx.lineTo(11, -5.5); ctx.lineTo(17, -5.5); ctx.lineTo(17, -8); ctx.stroke();

  // ---- head ----
  ctx.save();
  ctx.translate(hx0, hy0);
  ctx.rotate(e.tilt + m.ly * 0.1);
  ctx.scale(1.45, 1.45);
  // neck
  ctx.fillStyle = skinD;
  ctx.fillRect(-10, 8, 18, 14);
  // skull and face
  const fg = ctx.createLinearGradient(-16, -18, 18, 12);
  fg.addColorStop(0, skinL);
  fg.addColorStop(0.6, skin);
  fg.addColorStop(1, skinD);
  ctx.fillStyle = fg;
  ctx.strokeStyle = 'rgba(0,0,0,.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-16, 6);
  ctx.quadraticCurveTo(-20, -14, -4, -19);
  ctx.quadraticCurveTo(12, -21, 16, -9);
  ctx.lineTo(17, -4);
  ctx.lineTo(22, 3);
  ctx.lineTo(19, 5);
  ctx.quadraticCurveTo(18, 12, 12, 14);
  ctx.lineTo(-8, 14);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // coral-and-gold crown
  ctx.fillStyle = gold;
  ctx.beginPath(); ctx.moveTo(-15, -12); ctx.quadraticCurveTo(0, -19, 15, -11); ctx.lineTo(14, -7); ctx.quadraticCurveTo(0, -14, -15, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
  const cr = 1 + roar * 0.35 + storm * 0.15;
  for (let q = 0; q < 5; q++) {
    const x = -12 + q * 6.2, y = -14 - Math.sin((q / 4) * Math.PI) * 2.5, h = (9 + (q % 2) * 6) * cr;
    ctx.fillStyle = q % 2 ? F('#ff6a7a') : goldL;
    ctx.beginPath(); ctx.moveTo(x - 2.2, y); ctx.lineTo(x - 1, y - h * 0.6); ctx.lineTo(x - 3.5, y - h * 0.75); ctx.lineTo(x, y - h); ctx.lineTo(x + 2.2, y); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = F('#eaffff');
  for (const x of [-7, 5]) { ctx.beginPath(); ctx.arc(x, -12, 1.8, 0, TAU); ctx.fill(); }
  glow(ctx, 0, -13, 10, '#bff8ff', 0.4 + power * 0.1);
  // eye, brow of white foam
  ctx.fillStyle = 'rgba(0,0,0,.5)';
  ell(ctx, 10, -4, 5.5, 3.8, 0.1); ctx.fill();
  gaze(ctx, 10.5, -4, 3.3, EYE, m, e, { skin, nx: 1, browCol: F('#eaffff'), browW: 3.2, halo: 4 + power * 2 });
  // mouth inside the beard
  const mo = open;
  if (mo > 0.2) {
    ctx.fillStyle = F('#062a36');
    ell(ctx, 15, 10 + mo * 3, 4.5, 1.5 + mo * 4); ctx.fill();
    ctx.fillStyle = '#fff6e6';
    ctx.fillRect(12, 8.5 + mo * 0.5, 6, 1.6);
    glow(ctx, 15, 11, 10 + mo * 8, '#3ad8ff', 0.2 * mo);
  }
  // beard of living water, cascading down over the chest
  for (let q = 0; q < 6; q++) {
    const w = Math.sin(t * 2.2 + q * 1.1) * 3, sx = -6 + q * 4.6, sy = 10 + mo * 4 + (q === 5 ? -2 : 0);
    const len = 46 + Math.sin(q * 2.3) * 8 + roar * 10;
    waterStrand(ctx, [[sx, sy], [sx + 2 + w * 0.4, sy + len * 0.35], [sx - 3 + w, sy + len * 0.7], [sx - 6 + w * 1.3, sy + len]], 8, 2.4, fl, t, 0.4 + q * 0.17);
  }
  // moustache
  ctx.fillStyle = F('#dffaff');
  ctx.strokeStyle = 'rgba(6,40,60,.6)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(20, 6); ctx.quadraticCurveTo(14, 4, 8, 9); ctx.quadraticCurveTo(6, 15, 2, 17); ctx.quadraticCurveTo(10, 14, 13, 9); ctx.quadraticCurveTo(17, 9, 20, 6); ctx.fill(); ctx.stroke();
  ctx.restore();

  // ---- conch pauldron on the near shoulder ----
  const drawPauldron = () => {
    ctx.save();
    ctx.translate(-14, -80);
    ctx.rotate(-0.2);
    ctx.scale(1.15, 1.15);
    const pg = ctx.createRadialGradient(-3, -5, 2, 0, 0, 20);
    pg.addColorStop(0, F('#fff0e4'));
    pg.addColorStop(0.6, F('#f0b8a0'));
    pg.addColorStop(1, F('#a86a5a'));
    ctx.fillStyle = pg;
    ctx.strokeStyle = 'rgba(0,0,0,.8)';
    ctx.lineWidth = 1.8;
    ell(ctx, 0, 0, 19, 14); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = F('#a85a4a');
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let a = 0; a < 12; a += 0.2) { const r = 1 + a * 1.35; const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.72; a ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = F('#f6d8c8');
    for (let q = 0; q < 5; q++) { const a = -2.6 + q * 0.5; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 16, Math.sin(a) * 11); ctx.lineTo(Math.cos(a) * 24, Math.sin(a) * 17); ctx.lineTo(Math.cos(a + 0.2) * 17, Math.sin(a + 0.2) * 12); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  };
  // ---- trident arm (near) ----
  {
    const [ex, ey, wx, wy] = ik(-12, -74, tHand[0], tHand[1], 40, 38, 1);
    limb2(ctx, -12, -74, ex, ey, wx, wy, 30, 23, 17, skin);
    ctx.strokeStyle = 'rgba(190,255,245,.35)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lerp(-12, ex, 0.2) + 4, lerp(-74, ey, 0.2) - 6); ctx.quadraticCurveTo(lerp(-12, ex, 0.55) + 8, lerp(-74, ey, 0.55) - 4, lerp(-12, ex, 0.9) + 6, lerp(-74, ey, 0.9) - 4); ctx.stroke();
    ctx.strokeStyle = gold;
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(lerp(ex, wx, 0.6), lerp(ey, wy, 0.6)); ctx.lineTo(lerp(ex, wx, 0.78), lerp(ey, wy, 0.78)); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(lerp(ex, wx, 0.6), lerp(ey, wy, 0.6) - 3); ctx.lineTo(lerp(ex, wx, 0.78), lerp(ey, wy, 0.78) - 3); ctx.stroke();
    drawPauldron();
    trident(ctx, wx, wy, tA, grip, fl, power * 0.5 + slam, t);
    if (enr && !fl && ((t * 9) | 0) % 3 !== 1) {
      // storm lightning crackling off the tines
      const L = 236 - grip + 40, lx = wx + Math.cos(tA) * L, ly = wy + Math.sin(tA) * L;
      lightning(ctx, lx, ly, lx + Math.sin(t * 13) * 70, ly + 30 + Math.cos(t * 11) * 40, '#bff8ff', 1.6, 6, 14);
      lightning(ctx, lx, ly, lx - 40 + Math.cos(t * 7) * 30, ly - 20 + Math.sin(t * 9) * 30, '#8ae8ff', 1.2, 5, 10);
    }
    ctx.fillStyle = skinL;
    ctx.strokeStyle = 'rgba(0,0,0,.8)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(wx, wy, 9, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.4)';
    ctx.lineWidth = 1;
    for (let q = -1; q <= 1; q++) { ctx.beginPath(); ctx.moveTo(wx - 5, wy + q * 3.5); ctx.lineTo(wx + 5, wy + q * 3.5); ctx.stroke(); }
    // trident butt strikes the ground in a stomp
    if (slam > 0) {
      const bx = wx - Math.cos(tA) * grip, by = wy - Math.sin(tA) * grip;
      ctx.save();
      ctx.rotate(-lean);
      glow(ctx, bx, by, 40 + slam * 60, '#bff8ff', slam * 0.6);
      ctx.restore();
    }
  }
  ctx.restore();
  ctx.restore();

  // ---- spray, droplets and storm ----
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const sprayN = 10 + storm * 8;
  for (let q = 0; q < sprayN; q++) {
    const f = (t * 0.7 + q * 0.137) % 1, x = -70 + ((q * 53) % 140) + Math.sin(t * 2 + q) * 6;
    ctx.fillStyle = `rgba(${q % 3 ? '120,230,255' : '240,255,255'},${(1 - f) * 0.7})`;
    ell(ctx, x, -4 - f * (60 + storm * 60 + (1 - rise) * 120), 1.6, 2.6); ctx.fill();
  }
  ctx.restore();
  // rising tidal crests around his legs when enraged or slamming
  const crest = storm * 0.6 + slam + (1 - rise);
  if (crest > 0.05) {
    for (const s of [-1, 1]) {
      const x0 = s * 40, h = 26 * crest + Math.sin(t * 5 + s) * 4;
      const cg = ctx.createLinearGradient(0, -h, 0, 0);
      cg.addColorStop(0, 'rgba(230,255,255,.9)');
      cg.addColorStop(1, 'rgba(40,160,220,.5)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(x0 - s * 30, 0);
      ctx.quadraticCurveTo(x0, -h * 1.2, x0 + s * 28, -h * 0.6);
      ctx.quadraticCurveTo(x0 + s * 18, -h * 0.4, x0 + s * 40, 0);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (roar > 0) glow(ctx, 20, -190, 140, '#3ad8ff', roar * 0.35);
  if (dying > 0) glow(ctx, 0, -40, 160, '#bff8ff', (1 - dying) * dying * 1.4);
}
