// Regular foes of the heavens: armoured angels, cheeky cherubs, six-winged seraphim and the
// ophanim (wheels within wheels, covered in eyes). Each draws at the enemy's feet, facing +x.
import { flame, eye, glow, limb } from './art.js';
import { shade, rgba, clamp, lerp } from './util.js';

const TAU = Math.PI * 2;
const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const OUT = 'rgba(40,30,70,.75)';

// One colour lookup per creature: everything turns white during a hit flash.
const pal = (e, cols) => (e.flash > 0 ? new Proxy(cols, { get: () => '#ffffff' }) : cols);

// A feathered wing: a fan of long feathers from a root point, plus a covert patch at the shoulder.
function wing(ctx, x, y, len, ang, spread, n, fill, edge, cover = fill) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1;
  for (let i = n - 1; i >= 0; i--) {
    const u = n > 1 ? i / (n - 1) : 0, a = (u - 0.5) * spread, L = len * (1 - 0.42 * u);
    ctx.save();
    ctx.rotate(a);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(0, -len * 0.05);
    ctx.quadraticCurveTo(L * 0.55, -len * 0.13, L, 0);
    ctx.quadraticCurveTo(L * 0.55, len * 0.1, 0, len * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = cover;
  ctx.beginPath();
  ctx.ellipse(len * 0.24, 0, len * 0.28, len * 0.14, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function halo(ctx, x, y, rx, C, t, a = 1) {
  glow(ctx, x, y, rx * 2.2, '#ffe28a', 0.35 * a);
  ctx.strokeStyle = C.haloD;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.3, 0, 0, TAU); ctx.stroke();
  ctx.strokeStyle = C.halo;
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.3, 0, 0, TAU); ctx.stroke();
}

// ---------- Angel: an armoured warrior of heaven with a flaming sword ----------
export function angel(ctx, e, t) {
  const C = pal(e, {
    wingF: '#d6dcf2', wingN: '#ffffff', wingE: '#8f98c4', cover: '#eef1fb', steel: '#d9deea', steelD: '#8a93ad', gold: '#f2c14e', goldD: '#a8761c',
    robe: '#fbf8ff', robeD: '#c9c6e0', skin: '#f1d3bd', halo: '#fff2a8', haloD: '#c99a2a', blade: '#fffbe6',
  });
  const T = e.t, charge = e.state === 'charge', wind = e.state === 'wind', air = !e.ground;
  const moving = Math.abs(e.vx) > 20;
  const step = moving && !air ? Math.sin(T * (charge ? 22 : 11)) : 0;
  const wk = wind ? cl(1 - e.t2 / 0.45) : 0;
  const bob = Math.abs(step) * 1.4;
  const hot = charge ? 1 : wk;

  if (charge) {
    // streaks of light behind the lunge
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 4; k++) {
      const y = -12 - k * 11 + Math.sin(T * 30 + k) * 2, L = 34 + ((k * 13 + Math.floor(T * 20)) % 3) * 8;
      const g = ctx.createLinearGradient(-10, y, -10 - L, y);
      g.addColorStop(0, 'rgba(255,240,180,.55)');
      g.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-8, y); ctx.lineTo(-8 - L, y); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.save();
  if (charge) ctx.rotate(0.22);
  else if (wind) ctx.rotate(-0.1 * wk);
  ctx.translate(0, -bob);
  glow(ctx, 0, -32, 40, '#fff2c0', 0.18 + hot * 0.2);

  // wings: slow beats when walking, flared in the wind-up, swept back in the charge, beating in the air
  const flap = air ? Math.sin(T * 9) * 0.4 : Math.sin(T * 3) * 0.12;
  const wa = charge ? -2.85 : lerp(-2.25 + flap, -1.85, wk);
  const ws = charge ? 0.7 : lerp(1.0, 1.35, wk);
  wing(ctx, -4, -38, 30, wa + 0.18, ws, 6, C.wingF, C.wingE, C.wingF);
  wing(ctx, -2, -37, 33, wa - 0.12, ws, 6, C.wingN, C.wingE, C.cover);

  // far arm (behind the body)
  limb(ctx, [[-2, -35], [-6, -28], [-7, -22]], 4.5, C.steelD, OUT);
  // legs
  const leg = (x, s, col) => {
    const knee = air ? [x + 5, -11] : [x + s * 5, -10];
    const foot = air ? [x + 1, -3] : [x + s * 7, 0];
    limb(ctx, [[x, -20], knee, foot], 5, col, OUT);
    ctx.fillStyle = C.gold;
    ctx.beginPath(); ctx.ellipse(foot[0] + 2, foot[1] - 1, 3.6, 1.8, 0, 0, TAU); ctx.fill();
  };
  leg(-2, -step, C.steelD);
  leg(2, step, C.steel);
  // robe and pteruges
  ctx.fillStyle = C.robe;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-8, -25); ctx.lineTo(8, -25); ctx.lineTo(10 + (charge ? -3 : 0), -10 + Math.sin(T * 6) * 0.6); ctx.lineTo(-11, -10); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.robeD;
  ctx.fillRect(-10, -12, 20, 2);
  ctx.fillStyle = C.gold;
  for (let k = 0; k < 5; k++) { ctx.fillRect(-8 + k * 3.6, -25, 2.6, 7); }
  // cuirass
  const cg = ctx.createLinearGradient(-8, -40, 8, -24);
  cg.addColorStop(0, e.flash > 0 ? '#fff' : '#ffffff');
  cg.addColorStop(0.45, C.steel);
  cg.addColorStop(1, C.steelD);
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.moveTo(-7, -39); ctx.quadraticCurveTo(0, -42, 8, -39); ctx.lineTo(7, -25); ctx.quadraticCurveTo(0, -23, -7, -25); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.strokeStyle = C.goldD;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, -39); ctx.lineTo(0.5, -27); ctx.moveTo(-5, -33); ctx.quadraticCurveTo(-1, -31, 0, -33); ctx.moveTo(6, -33); ctx.quadraticCurveTo(2, -31, 1, -33); ctx.stroke();
  ctx.fillStyle = C.gold;
  ctx.fillRect(-7, -26, 15, 2.4);
  ctx.beginPath(); ctx.arc(0.5, -35, 1.8, 0, TAU); ctx.fill();
  // head: a closed helm with a T-slit of light and little wings at the temples
  ctx.fillStyle = C.steel;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(1, -45, 6.2, 7, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath(); ctx.ellipse(-1, -48, 2.4, 3, -0.4, 0, TAU); ctx.fill();
  ctx.fillStyle = C.gold;
  ctx.beginPath(); ctx.moveTo(-3, -51); ctx.lineTo(-10, -56 - Math.sin(T * 3) * 1); ctx.lineTo(-8, -52); ctx.lineTo(-11, -52); ctx.lineTo(-4, -48); ctx.closePath(); ctx.fill();
  const eyeCol = hot > 0.2 ? '#ffb347' : '#fff6c0';
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 5, -45, 7 + hot * 5, eyeCol, 0.6 + hot * 0.4);
  ctx.restore();
  ctx.fillStyle = e.flash > 0 ? '#fff' : eyeCol;
  ctx.fillRect(1.5, -46.4, 6.5, 1.8);
  ctx.fillRect(4.6, -46, 1.6, 6);
  halo(ctx, 0, -55 + Math.sin(T * 2.4) * 1.2, 7, C, t, 1);

  // the near arm and the flaming sword
  let hand, sa;
  if (charge) { hand = [15, -30]; sa = 0.05; }
  else if (air) { hand = [6, -47]; sa = -1.55; }
  else {
    const idleH = [9, -26 + step], idleA = -0.95 + Math.sin(T * 2) * 0.05;
    hand = [lerp(idleH[0], -7, wk), lerp(idleH[1], -50, wk)];
    sa = lerp(idleA, -2.55, wk);
  }
  limb(ctx, [[2, -36], [(2 + hand[0]) / 2 + 2, (-36 + hand[1]) / 2 + 2], hand], 4.5, C.steel, OUT);
  ctx.save();
  ctx.translate(hand[0], hand[1]);
  ctx.rotate(sa);
  const L = 27, fl = 0.75 + Math.sin(T * 23) * 0.15 + Math.sin(T * 37) * 0.1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const bg = ctx.createLinearGradient(0, 0, L, 0);
  bg.addColorStop(0, rgba('#ff9a2e', 0.2));
  bg.addColorStop(0.5, rgba('#ffb347', 0.55 * fl + hot * 0.2));
  bg.addColorStop(1, rgba('#ff6a1a', 0));
  ctx.strokeStyle = bg;
  ctx.lineWidth = 7 + hot * 3;
  ctx.beginPath(); ctx.moveTo(3, 0); ctx.lineTo(L + 4, 0); ctx.stroke();
  for (let k = 0; k < 4; k++) {
    const x = 7 + k * 6, h = (3 + ((k * 7 + Math.floor(T * 18)) % 4)) * fl;
    ctx.fillStyle = rgba(k % 2 ? '#ffd34a' : '#ff8a1a', 0.7);
    ctx.beginPath(); ctx.moveTo(x - 2, -1); ctx.quadraticCurveTo(x + 1, -h, x - 1 - (charge ? 3 : 0), -h - 2); ctx.quadraticCurveTo(x + 3, -h * 0.4, x + 2, -1); ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = C.blade;
  ctx.strokeStyle = 'rgba(150,110,40,.7)';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(3, -1.6); ctx.lineTo(L, -0.8); ctx.lineTo(L + 4, 0); ctx.lineTo(L, 0.8); ctx.lineTo(3, 1.6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.gold;
  ctx.fillRect(1.5, -4.5, 2.4, 9);
  ctx.fillStyle = C.goldD;
  ctx.fillRect(-3, -1.2, 4.6, 2.4);
  ctx.restore();
  ctx.restore();
}

// ---------- Cherub: a chubby, cheeky little archer with a heart-tipped arrow ----------
export function cherub(ctx, e, t) {
  const C = pal(e, {
    skin: '#ffd9c6', skinD: '#e8a890', blush: '#ff8aa8', curl: '#f6c64a', curlD: '#c9902a', wingF: '#e2e6f8', wingN: '#ffffff', wingE: '#c7a8d8',
    cloth: '#ffc1dc', bow: '#f2c14e', bowD: '#a8761c', halo: '#fff2a8', haloD: '#c99a2a', eye: '#ff4a7a', brow: '#8a4a2a',
  });
  const T = e.t, aim = e.cd < 0.4 && e.t2 <= 0, shot = e.t2 > 0;
  const bob = Math.sin(T * 6) * 1.5;
  ctx.save();
  ctx.translate(0, -12 + bob);
  ctx.rotate(clamp((e.vx || 0) / 500, -0.3, 0.3));
  const fl = Math.sin(T * 34) * 0.6;
  wing(ctx, -3, 1, 12, -2.4 + fl, 0.9, 4, C.wingF, C.wingE);
  // dangling legs
  limb(ctx, [[-3, 4], [-4, 8], [-2, 10]], 3.4, C.skinD, 'rgba(120,60,50,.5)');
  limb(ctx, [[2, 4], [3, 8], [5, 9]], 3.4, C.skin, 'rgba(120,60,50,.5)');
  // round body and sash
  const bg = ctx.createRadialGradient(-2, -1, 1, 0, 1, 8);
  bg.addColorStop(0, e.flash > 0 ? '#fff' : '#fff0e6');
  bg.addColorStop(1, C.skin);
  ctx.fillStyle = bg;
  ctx.strokeStyle = 'rgba(140,70,60,.6)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(0, 1, 7, 6.4, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.cloth;
  ctx.beginPath(); ctx.moveTo(-6, -3); ctx.quadraticCurveTo(0, 1, 6, 5); ctx.lineTo(5, 7); ctx.quadraticCurveTo(-1, 3, -7, 0); ctx.closePath(); ctx.fill();
  wing(ctx, -2, 0, 13, -2.2 - fl, 0.9, 4, C.wingN, C.wingE);
  // head, curls and face
  ctx.fillStyle = C.skin;
  ctx.strokeStyle = 'rgba(140,70,60,.6)';
  ctx.beginPath(); ctx.arc(2, -6, 6.6, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.curl;
  for (const [x, y, r] of [[-3, -9, 2.6], [-1, -11.5, 2.6], [2, -12.6, 2.6], [5, -11.6, 2.3], [-4, -5.5, 2.3], [7, -9.5, 1.8]]) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  ctx.strokeStyle = C.curlD;
  ctx.lineWidth = 0.8;
  for (const [x, y] of [[-3, -9], [2, -12.6], [-4, -5.5]]) { ctx.beginPath(); ctx.arc(x, y, 1.2, 0, 4); ctx.stroke(); }
  ctx.fillStyle = rgba(C.blush, 0.6);
  ctx.beginPath(); ctx.arc(6.4, -3.6, 1.8, 0, TAU); ctx.fill();
  eye(ctx, 4.2, -6.4, 1.15, C.eye, '#fff', 2.2);
  eye(ctx, 7.4, -6.2, 1.0, C.eye, '#fff', 2.2);
  ctx.strokeStyle = C.brow;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(2.8, -9.4); ctx.lineTo(5.4, -8.2); ctx.moveTo(6.6, -8.3); ctx.lineTo(8.6, -9.2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(5, -2.6); ctx.quadraticCurveTo(6.6, -1.6, 8, -3.2); ctx.stroke();
  halo(ctx, 2, -15.5 + Math.sin(T * 3) * 0.8, 5, C, t, 0.8);
  // the bow: drawn back while aiming, string twanging just after a shot
  const hx = 10, hy = 0;
  const pull = aim ? 1 - cl(e.cd / 0.4) : 0;
  limb(ctx, [[3, -1], [hx, hy]], 2.6, C.skin, 'rgba(140,70,60,.5)');
  ctx.strokeStyle = C.bowD;
  ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.arc(hx - 3, hy, 7, -1.1, 1.1); ctx.stroke();
  ctx.strokeStyle = C.bow;
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(hx - 3, hy, 7, -1.1, 1.1); ctx.stroke();
  const tx = hx - 3 + Math.cos(-1.1) * 7, ty = hy + Math.sin(-1.1) * 7, by = hy - Math.sin(-1.1) * 7;
  const sx = tx - pull * 6 + (shot ? Math.sin(T * 80) * 1.2 * e.t2 / 0.3 : 0);
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(sx, hy); ctx.lineTo(tx, by); ctx.stroke();
  if (aim) {
    ctx.strokeStyle = '#c9902a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx, hy); ctx.lineTo(hx + 8, hy); ctx.stroke();
    ctx.fillStyle = e.flash > 0 ? '#fff' : '#ff4a7a';
    ctx.beginPath(); ctx.arc(hx + 8.5, hy - 1, 1.4, 0, TAU); ctx.arc(hx + 8.5, hy + 1, 1.4, 0, TAU); ctx.moveTo(hx + 8, hy - 2); ctx.lineTo(hx + 12, hy); ctx.lineTo(hx + 8, hy + 2); ctx.fill();
    glow(ctx, hx + 9, hy, 6, '#ff8ab8', 0.5 * pull);
  }
  if (shot) glow(ctx, hx + 6, hy, 10, '#ffe28a', 0.6 * e.t2 / 0.3);
  ctx.restore();
}

// ---------- Seraph: six burning wings around a blazing core with one great eye ----------
export function seraph(ctx, e, t) {
  const W = e.flash > 0;
  const T = e.t, fire = e.t2 > 0 ? e.t2 / 0.3 : 0;
  const F = W ? ['#ffffff', '#ffffff', '#ffffff'] : ['#ff5a1a', '#ffb347', '#fff2b0'];
  ctx.save();
  ctx.translate(0, -17 + Math.sin(T * 1.8) * 2);
  const S = 1 + fire * 0.18;
  ctx.scale(S, S);
  glow(ctx, 0, 0, 46, '#ffb347', 0.3 + fire * 0.35);
  flame(ctx, 0, 4, 22, 30 + fire * 18, t, F, e.x * 0.01, 4);
  // a fiery feather: gold at the root burning to red at the tip
  const feather = (ang, len, n, spread, alpha = 1, off = 0) => {
    ctx.save();
    ctx.rotate(ang);
    ctx.translate(off, 0);
    ctx.globalAlpha *= alpha;
    for (let i = n - 1; i >= 0; i--) {
      const u = n > 1 ? i / (n - 1) : 0, a = (u - 0.5) * spread, L = len * (1 - 0.3 * Math.abs(u - 0.3));
      ctx.save();
      ctx.rotate(a);
      const g = ctx.createLinearGradient(0, 0, L, 0);
      g.addColorStop(0, W ? '#fff' : '#fff6d0');
      g.addColorStop(0.55, W ? '#fff' : '#ffb347');
      g.addColorStop(1, W ? '#fff' : '#e8401a');
      ctx.fillStyle = g;
      ctx.strokeStyle = W ? '#fff' : 'rgba(120,30,10,.6)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -1.6);
      ctx.quadraticCurveTo(L * 0.6, -len * 0.16, L, 0);
      ctx.quadraticCurveTo(L * 0.6, len * 0.12, 0, 1.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  };
  const flap = Math.sin(T * 4) * 0.22, br = Math.sin(T * 2) * 0.06;
  // flight pair, spread wide, with an eye on each
  feather(-0.3 + flap, 28, 5, 0.9, 1, 3);
  feather(Math.PI + 0.3 - flap, 28, 5, 0.9, 1, 3);
  for (const s of [-1, 1]) {
    const a = s > 0 ? -0.3 + flap : Math.PI + 0.3 - flap;
    const ex = Math.cos(a) * 17, ey = Math.sin(a) * 17 - 1;
    eye(ctx, ex, ey, 1.6, W ? '#fff' : '#ff8a1a', '#fff', 2.6);
  }
  // the core and its single great eye, looking ahead
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 11 + fire * 4);
  core.addColorStop(0, '#ffffff');
  core.addColorStop(0.5, W ? '#fff' : '#ffe9a0');
  core.addColorStop(1, rgba(W ? '#ffffff' : '#ff9a2e', 0));
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.arc(0, 0, 11 + fire * 4, 0, TAU); ctx.fill();
  const blink = (T * 0.7 + e.x * 0.003) % 3.2 < 0.12 ? 0.15 : 1;
  ctx.fillStyle = '#fffaf0';
  ctx.strokeStyle = W ? '#fff' : '#b8641a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-6, 0); ctx.quadraticCurveTo(0, -4.4 * blink, 6, 0); ctx.quadraticCurveTo(0, 4.4 * blink, -6, 0); ctx.closePath();
  ctx.fill(); ctx.stroke();
  if (blink > 0.5) {
    ctx.fillStyle = W ? '#fff' : fire > 0 ? '#ff3a1a' : '#ff8a1a';
    ctx.beginPath(); ctx.arc(1.4, 0, 2.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a0a04';
    ctx.beginPath(); ctx.arc(1.9, 0, 1.2, 0, TAU); ctx.fill();
  }
  // the pairs veiling its face and its feet
  feather(-1.2 + br, 18, 4, 0.6, 0.95, 7);
  feather(-1.94 - br, 18, 4, 0.6, 0.95, 7);
  feather(1.15 - br, 16, 4, 0.6, 0.95, 7);
  feather(1.99 + br, 16, 4, 0.6, 0.95, 7);
  if (fire > 0) glow(ctx, 0, 0, 36, '#fff2b0', 0.5 * fire);
  ctx.restore();
}

// ---------- Ophan: a wheel within a wheel, its rims full of eyes ----------
export function ophan(ctx, e, t) {
  const W = e.flash > 0, T = e.t;
  const charging = e.cd < 0.5 && e.t2 <= 0, fired = e.t2 > 0 ? e.t2 / 0.3 : 0;
  const chargeK = charging ? 1 - cl(e.cd / 0.5) : 0;
  const R = 15, spin = T * (1.2 + chargeK * 3.5) + e.x * 0.002;
  ctx.save();
  ctx.translate(0, -18 + Math.sin(T * 2.2) * 2.5);
  if (fired) ctx.translate(-fired * 3, 0);
  glow(ctx, 0, 0, 42, '#ffe28a', 0.25 + chargeK * 0.35 + fired * 0.4);
  // small wings at the sides
  const fl = Math.sin(T * 7) * 0.3;
  wing(ctx, -6, -2, 13, -2.6 + fl, 0.8, 4, W ? '#fff' : '#eef1fb', W ? '#fff' : '#a8a0c8');
  wing(ctx, 6, -2, 13, -0.55 - fl, 0.8, 4, W ? '#fff' : '#ffffff', W ? '#fff' : '#a8a0c8');
  // two rings on different axes, split into back and front halves for depth
  const ring = (kind, a) => {
    const pts = [];
    for (let i = 0; i <= 28; i++) {
      const s = (i / 28) * TAU;
      let x, y, z;
      if (kind === 0) { x = R * Math.cos(s); y = R * Math.sin(s); z = 0; }
      else { x = 0; y = R * Math.cos(s); z = R * Math.sin(s); }
      const x1 = x * Math.cos(a) + z * Math.sin(a), z1 = -x * Math.sin(a) + z * Math.cos(a);
      const tb = 0.35, y1 = y * Math.cos(tb) - z1 * Math.sin(tb), z2 = y * Math.sin(tb) + z1 * Math.cos(tb);
      pts.push([x1, y1, z2, s]);
    }
    return pts;
  };
  const A = ring(0, spin), B = ring(1, spin * 0.8 + 1.2);
  const rim = (pts, front) => {
    for (const [col, w] of [[OUT, 4.6], [W ? '#fff' : '#c99a2a', 3.4], [W ? '#fff' : '#ffe28a', 1.6]]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1], p1 = pts[i];
        if ((p0[2] + p1[2] >= 0) !== front) continue;
        ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]);
      }
      ctx.stroke();
    }
  };
  const eyes = (pts, front, seed) => {
    for (let k = 0; k < 7; k++) {
      const p = pts[Math.round((k / 7) * 28)];
      if ((p[2] >= 0) !== front) continue;
      const d = 0.6 + 0.4 * cl((p[2] / R + 1) / 2), r = 2.2 * d;
      const open = ((T * 0.9 + k * 0.53 + seed) % 2.6) < 0.13 ? 0.15 : 1;
      ctx.fillStyle = W ? '#fff' : front ? '#fffaf0' : '#d8d0c0';
      ctx.strokeStyle = 'rgba(80,50,20,.7)';
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.ellipse(p[0], p[1], r * 1.3, r * open, 0, 0, TAU); ctx.fill(); ctx.stroke();
      if (open > 0.5) {
        ctx.fillStyle = W ? '#fff' : '#3a8ad8';
        ctx.beginPath(); ctx.arc(p[0] + r * 0.45, p[1], r * 0.62, 0, TAU); ctx.fill();
        ctx.fillStyle = '#0a0a18';
        ctx.beginPath(); ctx.arc(p[0] + r * 0.6, p[1], r * 0.3, 0, TAU); ctx.fill();
      }
    }
  };
  rim(A, false); rim(B, false); eyes(A, false, 0); eyes(B, false, 1.3);
  // the burning core, swelling as it charges a bolt
  const cr = 6 + chargeK * 4 + fired * 5;
  const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, cr * 2);
  cg.addColorStop(0, '#ffffff');
  cg.addColorStop(0.35, W ? '#fff' : '#fff6c4');
  cg.addColorStop(1, rgba(W ? '#ffffff' : '#ffd34a', 0));
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.arc(0, 0, cr * 2, 0, TAU); ctx.fill();
  if (charging) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,240,180,${0.5 * chargeK})`;
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 5; k++) {
      const a = k * 1.3 + T * 6, r0 = 26 - chargeK * 14;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * (r0 - 6), Math.sin(a) * (r0 - 6)); ctx.stroke();
    }
    ctx.restore();
  }
  rim(A, true); rim(B, true); eyes(A, true, 0); eyes(B, true, 1.3);
  if (fired) glow(ctx, 10, 0, 22, '#ffffff', 0.7 * fired);
  ctx.restore();
}
