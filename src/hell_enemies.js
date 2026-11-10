// The underworld's creatures, drawn in detail: demons, bone widows, hell bats, flaming skulls,
// bile maws and hell knights. Each is drawn facing right with its feet at (0, 0).
// Every land dresses them differently: ghostly in Limbo, wind-torn in Lust, slime-dripping in
// Gluttony, burning in Heresy and frozen over in Treachery.
import { BIOME_LIST } from './world.js';
import { shade, mix, rgba, rand, clamp, TAU } from './util.js';
import { part } from './fx.js';
import { flame, eye, glow, limb, horn, teeth } from './art.js';

const WHITE = { body: '#ffffff', dark: '#ffffff', light: '#ffffff', wing: '#ffffff', bone: '#ffffff', metal: '#ffffff', metalL: '#ffffff', metalD: '#ffffff' };

export function pal(e, base, k) {
  if (e.flash > 0) return WHITE;
  const body = mix(e.tint, base, k);
  return {
    body, dark: shade(body, -0.6), light: shade(body, 0.32), wing: shade(body, -0.35), bone: '#efe2c8',
    metal: mix('#2c2836', e.tint, 0.12), metalL: mix('#77708a', e.tint, 0.15), metalD: '#14111a',
  };
}

// a point on the creature, in world space (for particles)
const W = (e, x, y) => ({ x: e.x + e.w / 2 + x * e.face, y: e.y + e.h + y });
const lit = e => e.flash <= 0;

// ---------- the dress of each land ----------
function crystal(ctx, x, y, a, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  const g = ctx.createLinearGradient(0, 0, 0, -s);
  g.addColorStop(0, '#3f7cc4');
  g.addColorStop(1, '#f0fbff');
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(16,36,80,.65)';
  ctx.lineWidth = 0.8;
  for (const [ox, h, w] of [[-2.4, 0.65, 1.5], [2.3, 0.55, 1.4], [0, 1, 2]]) {
    ctx.beginPath();
    ctx.moveTo(ox - w, 0);
    ctx.lineTo(ox - w * 0.7, -s * h * 0.7);
    ctx.lineTo(ox, -s * h);
    ctx.lineTo(ox + w * 0.7, -s * h * 0.7);
    ctx.lineTo(ox + w, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

// L: { tops: [[x, y, angle]] on the creature's back, drips: [[x, y]] under its belly, core: [x, y, r] }
function dress(ctx, e, L, front) {
  if (!lit(e)) return;
  const t = e.t, [cx, cy, r] = L.core;
  switch (BIOME_LIST[e.biome]) {
    case 'limbo': {
      if (!front) glow(ctx, cx, cy, r * 1.9, '#9b7bff', 0.2 + Math.sin(t * 2) * 0.06);
      else if (Math.random() < 0.14) part({ ...W(e, cx + rand(-r, r) * 0.7, cy + rand(-r, r) * 0.5), vx: rand(-12, 12), vy: rand(-45, -20), life: 1.2, size: rand(1.4, 2.4), color: Math.random() < 0.5 ? '#cdbbff' : '#8a6bd6', add: true });
      break;
    }
    case 'lust': {
      if (!front) break;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 1.3;
      for (let i = 0; i < 2; i++) {
        const a = t * 3.4 + i * Math.PI;
        ctx.strokeStyle = rgba(i ? '#ffc4ec' : '#ff7ad0', 0.5);
        ctx.beginPath();
        ctx.ellipse(cx, cy, r * 1.25, r * 0.5, -0.25, a, a + 2.1);
        ctx.stroke();
      }
      ctx.restore();
      if (Math.random() < 0.05) part({ ...W(e, cx, cy), vx: rand(-60, 60), vy: rand(-40, 10), life: 1.1, size: 2.6, color: '#ff8ad8', shape: 'petal', vr: rand(-6, 6), rot: rand(0, 6) });
      break;
    }
    case 'gluttony': {
      if (!front) break;
      ctx.fillStyle = 'rgba(166,255,90,.78)';
      for (let i = 0; i < L.drips.length; i++) {
        const [x, y] = L.drips[i], k = (t * 0.9 + i * 0.37) % 1, len = 1.5 + k * 6;
        ctx.beginPath();
        ctx.moveTo(x - 1.5, y);
        ctx.quadraticCurveTo(x - 1.1, y + len * 0.7, x, y + len);
        ctx.quadraticCurveTo(x + 1.1, y + len * 0.7, x + 1.5, y);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y + len, 1.2 + k * 0.8, 0, TAU);
        ctx.fill();
      }
      if (Math.random() < 0.05) {
        const [x, y] = L.drips[Math.floor(Math.random() * L.drips.length)];
        part({ ...W(e, x, y + 6), vx: e.vx * 0.2, vy: 30, g: 700, life: 0.7, size: 1.8, color: '#b6ff6b' });
      }
      break;
    }
    case 'heresy': {
      if (!front) for (const [x, y] of L.tops) flame(ctx, x, y + 3, 9, 15, t, ['#ff3a0a', '#ff9a1a', '#fff2a0'], x * 3, 2);
      else if (Math.random() < 0.16) part({ ...W(e, cx + rand(-r, r) * 0.6, cy - r * 0.4), vx: rand(-20, 20), vy: rand(-110, -50), life: rand(0.5, 0.9), size: rand(1.2, 2.2), color: Math.random() < 0.5 ? '#ffd34a' : '#ff6a1a', add: true });
      break;
    }
    case 'treachery': {
      if (!front) break;
      for (const [x, y, a] of L.tops) crystal(ctx, x, y, a, 8);
      if (Math.random() < 0.05) part({ ...W(e, cx + rand(-r, r), cy + rand(-r, r) * 0.6), vx: 0, vy: -10, life: 0.6, size: 2.2, color: '#e8fbff', shape: 'star', vr: 3, add: true });
      break;
    }
  }
}

// A torn, bat-like membrane wing pointing backwards (towards -x), with glowing veins.
function wing(ctx, e, C, x, y, s, rot, fill, veins = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  const g = ctx.createLinearGradient(0, 0, -30, -8);
  g.addColorStop(0, shade(fill, -0.25));
  g.addColorStop(1, shade(fill, 0.22));
  ctx.fillStyle = g;
  ctx.strokeStyle = C.dark;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-8, -12);
  ctx.lineTo(-14, -16);
  ctx.lineTo(-31, -13);
  ctx.quadraticCurveTo(-25, -9, -29, -2);
  ctx.quadraticCurveTo(-23, -3, -21, 4);
  ctx.quadraticCurveTo(-15, 0, -9, 6);
  ctx.quadraticCurveTo(-5, 1, 0, 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // a tear in the membrane
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.beginPath();
  ctx.moveTo(-20, -7); ctx.lineTo(-23, -5); ctx.lineTo(-21, -3); ctx.closePath();
  ctx.fill();
  // finger bones
  ctx.strokeStyle = C.dark;
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(-8, -12); ctx.lineTo(-14, -16);
  ctx.moveTo(-14, -16); ctx.lineTo(-31, -13);
  ctx.moveTo(-14, -16); ctx.lineTo(-29, -2);
  ctx.moveTo(-14, -16); ctx.lineTo(-21, 4);
  ctx.stroke();
  if (lit(e) && veins) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(e.accent, 0.4 * veins);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-14, -16); ctx.lineTo(-30, -12);
    ctx.moveTo(-14, -16); ctx.lineTo(-28, -2.5);
    ctx.moveTo(-14, -16); ctx.lineTo(-21, 3);
    ctx.moveTo(-10, -13); ctx.quadraticCurveTo(-16, -6, -13, 1);
    ctx.stroke();
    ctx.restore();
  }
  // the thumb claw
  ctx.fillStyle = C.bone;
  ctx.beginPath(); ctx.moveTo(-14, -16); ctx.lineTo(-12.5, -21); ctx.lineTo(-11.6, -16.4); ctx.fill();
  ctx.restore();
}

export const HELL = {
  // A winged demon: torn wings, goat legs, swept-back horns, a spiked tail and a red-hot trident.
  imp(ctx, e) {
    const C = pal(e, '#c4243a', 0.55), air = !e.ground, run = Math.min(1, Math.abs(e.vx) / 120), ph = e.t * 15;
    const flap = Math.sin(e.t * (air ? 22 : 4));
    const L = { tops: [[-5, -26, -0.7], [1, -29, -0.2]], drips: [[-3, -12], [4, -13], [9, -26]], core: [1, -20, 14] };
    dress(ctx, e, L, false);
    ctx.translate(0, -(air ? 0 : Math.abs(Math.sin(ph)) * run * 1.5));
    wing(ctx, e, C, -2, -23, 0.95, -0.55 - flap * 0.45, shade(C.wing, -0.3), 0.7);
    wing(ctx, e, C, 0, -22, 1.05, -0.2 - flap * 0.5, C.wing);
    // spiked tail with a glowing barb
    const tw = Math.sin(e.t * 4) * 4;
    const tp = [[-4, -12], [-12, -9], [-19, -13 + tw * 0.5], [-23, -20 + tw], [-22, -26 + tw]];
    limb(ctx, tp, 2.3, C.dark, 'rgba(0,0,0,.6)');
    ctx.fillStyle = C.bone;
    for (const [x, y] of [tp[1], tp[2], tp[3]]) { ctx.beginPath(); ctx.moveTo(x - 1.5, y); ctx.lineTo(x - 0.5, y - 3.5); ctx.lineTo(x + 1.2, y - 0.4); ctx.fill(); }
    const [bx, by] = tp[4];
    ctx.fillStyle = lit(e) ? e.accent : '#fff';
    ctx.beginPath(); ctx.moveTo(bx, by - 6); ctx.lineTo(bx - 3.5, by + 1); ctx.lineTo(bx, by - 1); ctx.lineTo(bx + 3.5, by + 1); ctx.closePath(); ctx.fill();
    if (lit(e)) glow(ctx, bx, by - 2, 8, e.accent, 0.45);
    // goat legs with hooves
    for (const s of [-1, 1]) {
      const sw = air ? -0.4 : Math.sin(ph + (s > 0 ? Math.PI : 0)) * run;
      const col = s > 0 ? C.body : C.wing;
      const hip = [s * 3 - 1, -13], knee = [s * 3 + 4 + sw * 3, -8], ank = [s * 3 - 1.5 + sw * 4, -3.5], hoof = [s * 3 + 1 + sw * 5, -0.5];
      limb(ctx, [hip, knee], 4.6, col);
      limb(ctx, [knee, ank, hoof], 3, col);
      ctx.fillStyle = C.metalD;
      ctx.beginPath(); ctx.moveTo(hoof[0] - 2.4, 0); ctx.lineTo(hoof[0] - 1.6, -2.6); ctx.lineTo(hoof[0] + 2, -2.6); ctx.lineTo(hoof[0] + 3, 0); ctx.closePath(); ctx.fill();
    }
    // lean torso, broad at the shoulder
    const g = ctx.createLinearGradient(-6, -28, 6, -11);
    g.addColorStop(0, C.light);
    g.addColorStop(1, C.dark);
    ctx.fillStyle = g;
    ctx.strokeStyle = C.dark;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-4, -12);
    ctx.quadraticCurveTo(-10, -20, -7, -26);
    ctx.quadraticCurveTo(1, -30, 10, -25);
    ctx.quadraticCurveTo(8, -18, 4, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.3)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) { ctx.moveTo(-3, -22 + k * 3); ctx.quadraticCurveTo(1, -20.5 + k * 3, 5, -22 + k * 3); }
    ctx.stroke();
    // burning sigil on the chest
    if (lit(e)) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(e.accent, 0.75 + Math.sin(e.t * 5) * 0.2);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(2, -23.5, 2.6, 0, TAU);
      ctx.moveTo(-0.3, -25); ctx.lineTo(4.3, -25); ctx.lineTo(2, -21); ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
    // bone spike on the shoulder
    ctx.fillStyle = C.bone;
    ctx.beginPath(); ctx.moveTo(-5, -26); ctx.lineTo(-9, -31); ctx.lineTo(-2, -27.5); ctx.fill();
    // arm and red-hot trident
    const jab = Math.max(0, Math.sin(e.t * 3)) ** 6 * 4, a = -1.05 + Math.sin(e.t * 2) * 0.08;
    const hx = 13 + jab, hy = -20;
    const dx = Math.cos(a), dy = Math.sin(a);
    ctx.strokeStyle = C.metalD;
    ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(hx - dx * 11, hy - dy * 11); ctx.lineTo(hx + dx * 15, hy + dy * 15); ctx.stroke();
    ctx.strokeStyle = C.metalL;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(hx - dx * 10, hy - dy * 10); ctx.lineTo(hx + dx * 14, hy + dy * 14); ctx.stroke();
    ctx.save();
    ctx.translate(hx + dx * 15, hy + dy * 15);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = lit(e) ? mix(e.accent, '#ffffff', 0.35) : '#fff';
    ctx.strokeStyle = C.metalD;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.lineTo(4, -2);
    ctx.lineTo(4.6, -6.5); ctx.lineTo(3, -3); ctx.lineTo(1, -3);
    ctx.lineTo(0, -9); ctx.lineTo(-1, -3); ctx.lineTo(-3, -3);
    ctx.lineTo(-4.6, -6.5); ctx.lineTo(-4, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    if (lit(e)) glow(ctx, hx + dx * 19, hy + dy * 19, 9, e.accent, 0.4);
    limb(ctx, [[5, -24], [9, -19], [hx, hy]], 2.8, C.body);
    ctx.fillStyle = C.dark;
    ctx.beginPath(); ctx.arc(hx, hy, 2, 0, TAU); ctx.fill();
    // head: angular, pointed ear, big swept-back horns, a wicked grin
    ctx.fillStyle = C.body;
    ctx.strokeStyle = C.dark;
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-1, -32); ctx.lineTo(-7, -36); ctx.lineTo(-2.5, -29.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    horn(ctx, 1.5, -34.5, 13, 9, 2.7, -1, C.bone);
    const hg = ctx.createLinearGradient(0, -37, 0, -25);
    hg.addColorStop(0, C.light);
    hg.addColorStop(1, C.body);
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.moveTo(-1, -33);
    ctx.quadraticCurveTo(4, -38.5, 9.5, -34);
    ctx.lineTo(12.5, -29);
    ctx.quadraticCurveTo(11.5, -26, 7.5, -25.5);
    ctx.lineTo(3, -26);
    ctx.quadraticCurveTo(-1.5, -28, -1, -33);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    horn(ctx, 6, -36, 11, 6, 2.3, -1, C.bone);
    ctx.fillStyle = '#1a0606';
    ctx.beginPath(); ctx.moveTo(5, -28); ctx.quadraticCurveTo(9, -26.4, 12.2, -28.4); ctx.lineTo(11.6, -27); ctx.quadraticCurveTo(8.5, -25.2, 5.4, -27.4); ctx.fill();
    teeth(ctx, 5.6, -27.8, 12, -28.2, 4, 1.8);
    ctx.strokeStyle = C.dark;
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(5.5, -33.8); ctx.lineTo(11, -31.4); ctx.stroke();
    eye(ctx, 8.6, -31.4, 1.4, '#ffe14a', '#fff', 2.6);
    dress(ctx, e, L, true);
  },

  // A bone widow: an armoured spider with a glowing skull on its back, spiked legs and dripping fangs.
  spider(ctx, e) {
    const C = pal(e, '#2a1626', 0.6), hanging = e.state === 'hang' || e.state === 'drop';
    const run = hanging ? 0 : Math.min(1, Math.abs(e.vx) / 150), ph = e.t * 18;
    const L = { tops: [[-14, -19, -0.6], [-7, -21, 0.1]], drips: [[-14, -5], [-6, -4], [3, -5]], core: [-4, -12, 16] };
    dress(ctx, e, L, false);
    const legs = far => {
      for (let i = 0; i < 4; i++) {
        const hipX = 3 + (i - 1.5) * 1.6 + (far ? 1 : 0), hipY = -10;
        const dir = i < 2 ? 1 : -1, outer = i === 0 || i === 3, reach = outer ? 21 : 14;
        const step = Math.sin(ph + i * 1.7 + (far ? Math.PI : 0)) * run, lift = Math.max(0, step);
        let kx, ky, ax, ay, fx, fy;
        if (hanging) { kx = hipX + dir * (outer ? 9 : 6); ky = hipY - 9; ax = hipX + dir * (outer ? 10 : 7); ay = hipY - 2; fx = hipX + dir * 6; fy = hipY + 3; }
        else {
          fx = hipX + dir * reach + step * 5; fy = -lift * 4;
          kx = hipX + dir * reach * 0.38 + step * 2; ky = hipY - (outer ? 10 : 8) - lift * 2;
          ax = hipX + dir * reach * 0.82 + step * 4.5; ay = -4.5 - lift * 4;
        }
        const col = far ? C.dark : C.body, ol = 'rgba(0,0,0,.7)';
        limb(ctx, [[hipX, hipY], [kx, ky]], far ? 2 : 2.5, col, ol);
        limb(ctx, [[kx, ky], [ax, ay]], far ? 1.5 : 1.9, col, ol);
        limb(ctx, [[ax, ay], [fx, fy]], far ? 0.9 : 1.1, far ? C.dark : shade(C.bone, -0.15), ol);
        // jointed knees with a little spike
        ctx.fillStyle = far ? C.dark : C.light;
        ctx.beginPath(); ctx.arc(kx, ky, far ? 1.2 : 1.5, 0, TAU); ctx.fill();
        if (!far) { ctx.beginPath(); ctx.moveTo(kx - 1, ky - 0.5); ctx.lineTo(kx - dir * 0.8, ky - 3.4); ctx.lineTo(kx + 1, ky - 0.5); ctx.fill(); }
      }
    };
    legs(true);
    // abdomen: banded chitin
    const g = ctx.createRadialGradient(-12, -18, 2, -9, -12, 14);
    g.addColorStop(0, C.light);
    g.addColorStop(0.5, C.body);
    g.addColorStop(1, C.dark);
    ctx.fillStyle = g;
    ctx.strokeStyle = 'rgba(0,0,0,.75)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(-9, -12, 12.5, 9.5, -0.15, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 1;
    for (const k of [-4, 1]) { ctx.beginPath(); ctx.ellipse(-9 + k, -12, 9, 8.5, -0.15, -1.3, 1.3); ctx.stroke(); }
    // spine ridge
    ctx.fillStyle = C.bone;
    for (let k = 0; k < 5; k++) {
      const a = -2.7 + k * 0.42, x = -9 + Math.cos(a) * 12, y = -12 + Math.sin(a) * 9.2;
      ctx.beginPath(); ctx.moveTo(x - 1.3, y + 0.5); ctx.lineTo(x + Math.cos(a) * 3.5, y + Math.sin(a) * 3.5); ctx.lineTo(x + 1.3, y + 0.5); ctx.fill();
    }
    // the glowing skull mark
    const pulse = 0.6 + Math.sin(e.t * 4) * 0.4;
    if (lit(e)) glow(ctx, -10, -13, 15, e.accent, 0.3 * pulse);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.55 + pulse * 0.4;
    ctx.fillStyle = lit(e) ? e.accent : '#fff';
    ctx.beginPath(); ctx.arc(-10, -14.5, 3.8, 0, TAU); ctx.fill();
    ctx.fillRect(-12.3, -12.2, 4.6, 3.4);
    ctx.restore();
    ctx.fillStyle = 'rgba(10,0,10,.9)';
    ctx.beginPath(); ctx.arc(-11.6, -14.6, 1.1, 0, TAU); ctx.arc(-8.4, -14.6, 1.1, 0, TAU); ctx.fill();
    ctx.fillRect(-11, -11.2, 0.8, 2); ctx.fillRect(-9.6, -11.2, 0.8, 2);
    legs(false);
    // armoured head with a pair of horns
    const hg = ctx.createLinearGradient(2, -17, 8, -5);
    hg.addColorStop(0, C.light);
    hg.addColorStop(1, C.dark);
    ctx.fillStyle = hg;
    ctx.strokeStyle = 'rgba(0,0,0,.75)';
    ctx.beginPath(); ctx.ellipse(6, -10, 7.8, 6.2, 0.05, 0, TAU); ctx.fill(); ctx.stroke();
    horn(ctx, 4, -15, 5, -2, 1.3, -1, C.bone);
    horn(ctx, 8, -15.5, 5, -2.5, 1.3, 1, C.bone);
    // clicking fangs, wet with venom
    const bite = Math.max(0, Math.sin(e.t * 9)) * 1.6;
    ctx.fillStyle = C.bone;
    for (const [fx, s] of [[9.5, -1], [12.5, 1]]) {
      const ox = s * bite;
      ctx.beginPath(); ctx.moveTo(fx - 1.6, -7); ctx.quadraticCurveTo(fx + 2 + ox, -4, fx + ox * 0.6, -0.8); ctx.lineTo(fx - 0.7, -6.4); ctx.fill();
    }
    if (lit(e)) {
      glow(ctx, 11, -1, 5, e.accent, 0.5);
      if (Math.random() < 0.03) part({ ...W(e, 11, -1), vx: 0, vy: 20, g: 600, life: 0.6, size: 1.5, color: e.accent, add: true });
    }
    // eight eyes
    ctx.fillStyle = lit(e) ? '#ff6a78' : '#fff';
    for (const [x, y, r] of [[7.6, -14], [10.8, -14.9], [13.4, -13.6], [6.4, -11.6], [8.4, -10.1], [11.4, -9.6]]) { ctx.beginPath(); ctx.arc(x, y, r || 0.75, 0, TAU); ctx.fill(); }
    eye(ctx, 9.6, -12.2, 1.6, '#ff2a3a', '#ffe0e0', 2.4);
    eye(ctx, 12.4, -11.3, 1.35, '#ff2a3a', '#ffe0e0', 2.4);
    dress(ctx, e, L, true);
  },

  // A hell bat: torn glowing wings, great ears, a snarling snout and dangling talons.
  bat(ctx, e) {
    const C = pal(e, '#3a1020', 0.6), flap = Math.sin(e.t * 20);
    const L = { tops: [[-3, -6, -0.4], [3, -6, 0.4]], drips: [[-2, 8], [2, 8]], core: [0, 0, 12] };
    ctx.translate(0, -10);
    dress(ctx, e, L, false);
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.scale(-s, 1);
      wing(ctx, e, C, -3, 1, 0.85, -0.15 + flap * 0.6, s > 0 ? C.wing : shade(C.wing, -0.2));
      ctx.restore();
    }
    // talons
    ctx.strokeStyle = C.bone;
    ctx.lineWidth = 1.2;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 2.5, 7); ctx.lineTo(s * 3, 11); ctx.moveTo(s * 3, 11); ctx.lineTo(s * 4.6, 12.5); ctx.moveTo(s * 3, 11); ctx.lineTo(s * 1.8, 12.8);
      ctx.stroke();
    }
    // furry body
    const g = ctx.createRadialGradient(-1, -3, 1, 0, 0, 10);
    g.addColorStop(0, C.light);
    g.addColorStop(1, C.dark);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0.5, 7.5, 9, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = C.dark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k < 9; k++) { const a = 0.4 + k * 0.33; ctx.moveTo(Math.cos(a) * 7, 0.5 + Math.sin(a) * 8.5); ctx.lineTo(Math.cos(a) * 8.8, 0.5 + Math.sin(a) * 10.4); }
    ctx.stroke();
    // big ears with a glowing inside
    for (const s of [-1, 1]) {
      ctx.fillStyle = C.body;
      ctx.strokeStyle = C.dark;
      ctx.beginPath(); ctx.moveTo(s * 2, -6); ctx.quadraticCurveTo(s * 9, -12, s * 7, -17); ctx.quadraticCurveTo(s * 4, -12, s * 0.5, -7); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = lit(e) ? rgba(e.accent, 0.65) : '#fff';
      ctx.beginPath(); ctx.moveTo(s * 2.4, -7); ctx.quadraticCurveTo(s * 7, -11, s * 6.4, -14.5); ctx.quadraticCurveTo(s * 4, -11, s * 1.6, -7.6); ctx.closePath(); ctx.fill();
    }
    // snout, snarl and fangs
    ctx.fillStyle = shade(C.body, -0.2);
    ctx.beginPath(); ctx.moveTo(-2.5, -1); ctx.lineTo(0, -4.5); ctx.lineTo(2.5, -1); ctx.lineTo(0, 1.5); ctx.closePath(); ctx.fill();
    const snarl = 1.6 + Math.max(0, Math.sin(e.t * 7)) * 1.2;
    ctx.fillStyle = '#1a0606';
    ctx.beginPath(); ctx.ellipse(0, 3.6, 3.8, snarl, 0, 0, TAU); ctx.fill();
    teeth(ctx, -3, 2.4, 3, 2.4, 4, 2.2);
    teeth(ctx, -2.5, 3.6 + snarl, 2.5, 3.6 + snarl, 3, 1.5, false);
    ctx.strokeStyle = C.dark;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-4.8, -4.6); ctx.lineTo(-1.2, -2.8); ctx.moveTo(4.8, -4.6); ctx.lineTo(1.2, -2.8); ctx.stroke();
    eye(ctx, -2.6, -2.4, 1.4, '#ff3a3a', '#fff', 2.6);
    eye(ctx, 2.6, -2.4, 1.4, '#ff3a3a', '#fff', 2.6);
    if (lit(e) && Math.random() < 0.1) part({ ...W(e, rand(-10, 10), -10), vx: -e.vx * 0.2, vy: rand(10, 30), life: 0.5, size: 1.4, color: e.accent, add: true });
    dress(ctx, e, L, true);
  },

  // A horned, cracked skull wreathed in fire, trailing flame as it flies, with embers circling it.
  wisp(ctx, e) {
    const C = pal(e, '#efe2c8', 0.85), chatter = Math.max(0, Math.sin(e.t * 16)) * 2.5;
    const L = { tops: [[-5, -10, -0.5], [5, -10, 0.5]], drips: [[-4, 8], [4, 8]], core: [0, -2, 13] };
    ctx.translate(0, -13 + Math.sin(e.t * 3) * 2);
    dress(ctx, e, L, false);
    const lean = clamp(Math.hypot(e.vx, e.vy) / 160, 0, 0.9);
    const hot = lit(e) ? e.accent : '#ffffff';
    ctx.save();
    ctx.rotate(-lean);
    flame(ctx, 0, 6, 22, 40, e.t, [hot, shade(hot, 0.4), '#ffffff'], e.level, 4);
    flame(ctx, -1, -6, 16, 26, e.t * 1.3, [hot, shade(hot, 0.5), '#ffffff'], e.level + 9, 3);
    ctx.restore();
    glow(ctx, 0, -2, 26, hot, 0.35);
    // embers circling behind
    const orbit = front => {
      for (let k = 0; k < 3; k++) {
        const a = e.t * 2.6 + k * 2.09, z = Math.sin(a);
        if ((z > 0) !== front) continue;
        const x = Math.cos(a) * 16, y = -2 + z * 5 + Math.sin(e.t * 4 + k) * 2;
        glow(ctx, x, y, 6, hot, 0.6);
        ctx.fillStyle = '#fff6d0';
        ctx.beginPath(); ctx.arc(x, y, 1.4, 0, TAU); ctx.fill();
      }
    };
    orbit(false);
    horn(ctx, -6.5, -8, 9, 5, 2.2, -1, C.bone);
    horn(ctx, 6.5, -8, 9, 5, 2.2, 1, C.bone);
    const bone = lit(e) ? '#f1e6cf' : '#ffffff';
    const g = ctx.createRadialGradient(-3, -7, 1, 0, -2, 13);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, shade(bone, -0.3));
    ctx.fillStyle = g;
    ctx.strokeStyle = 'rgba(60,40,30,.75)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-9, 1);
    ctx.quadraticCurveTo(-11.5, -12, 0, -12.5);
    ctx.quadraticCurveTo(11.5, -12, 9, 1);
    ctx.quadraticCurveTo(8.5, 3.5, 6, 4);
    ctx.lineTo(-6, 4);
    ctx.quadraticCurveTo(-8.5, 3.5, -9, 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // jaw
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-6, 4 + chatter); ctx.lineTo(6, 4 + chatter); ctx.lineTo(4.5, 8.5 + chatter); ctx.lineTo(-4.5, 8.5 + chatter); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a1410';
    for (let k = 0; k < 4; k++) { ctx.fillRect(-4.5 + k * 2.6, 3.4, 1.6, 1.6); ctx.fillRect(-4 + k * 2.4, 4.6 + chatter, 1.5, 1.4); }
    // cracks with fire glowing through
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = lit(e) ? rgba(e.accent, 0.85) : '#fff';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(1.5, -12.3); ctx.lineTo(3.2, -9); ctx.lineTo(2.2, -7); ctx.lineTo(3.6, -5.5);
    ctx.moveTo(-5, -10.5); ctx.lineTo(-4, -8); ctx.lineTo(-6, -6.5);
    ctx.stroke();
    ctx.restore();
    // sockets with fire for eyes, and the nose
    ctx.fillStyle = '#1a0a0a';
    ctx.beginPath(); ctx.ellipse(-3.8, -3, 3.1, 3.5, 0.2, 0, TAU); ctx.ellipse(3.8, -3, 3.1, 3.5, -0.2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-1.4, 2.6); ctx.lineTo(1.4, 2.6); ctx.closePath(); ctx.fill();
    flame(ctx, -3.7, -2, 5, 11, e.t * 1.4, [hot, shade(hot, 0.5), '#ffffff'], 3, 1);
    flame(ctx, 3.9, -2, 5, 11, e.t * 1.4, [hot, shade(hot, 0.5), '#ffffff'], 7, 1);
    eye(ctx, -3.6, -2.6, 1.3, hot, '#ffffff', 4);
    eye(ctx, 4, -2.6, 1.3, hot, '#ffffff', 4);
    orbit(true);
    dress(ctx, e, L, true);
  },

  // A bile maw: a bloated demon toad. Bile sloshes in its see-through belly, its pustules glow,
  // and its jaw splits wide when it spits.
  spitter(ctx, e) {
    const C = pal(e, '#4a5a22', 0.5), charge = e.cd < 0.5 ? 1 - Math.max(0, e.cd) / 0.5 : 0;
    const spit = e.t2 > 0, puff = spit ? 1.12 : 1 + Math.sin(e.t * 3) * 0.03 + charge * 0.06;
    const L = { tops: [[-11, -20, -0.7], [-3, -24, -0.1], [6, -22, 0.4]], drips: [[-12, -2], [-4, -1], [14, -10]], core: [0, -12, 17] };
    dress(ctx, e, L, false);
    limb(ctx, [[-10, -6], [-18, -11], [-15, 0]], 5.5, C.wing);
    ctx.fillStyle = C.wing;
    ctx.beginPath(); ctx.ellipse(-14, -0.5, 4, 1.6, 0, 0, TAU); ctx.fill();
    // bone spines down the back
    ctx.fillStyle = C.bone;
    for (let k = 0; k < 5; k++) {
      const a = -2.9 + k * 0.38, x = -1 + Math.cos(a) * 17, y = -4 + Math.sin(a) * 20 * puff;
      ctx.beginPath(); ctx.moveTo(x - 1.8, y + 1); ctx.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5); ctx.lineTo(x + 1.8, y + 1); ctx.fill();
    }
    // body
    const g = ctx.createRadialGradient(-4, -20, 3, 0, -10, 23);
    g.addColorStop(0, C.light);
    g.addColorStop(0.55, C.body);
    g.addColorStop(1, C.dark);
    ctx.fillStyle = g;
    ctx.strokeStyle = 'rgba(0,0,0,.65)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-17, -2);
    ctx.quadraticCurveTo(-20 * puff, -23 * puff, -2, -25 * puff);
    ctx.quadraticCurveTo(16 * puff, -25 * puff, 17, -9);
    ctx.quadraticCurveTo(14, -1, 4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // see-through belly full of sloshing bile
    ctx.save();
    ctx.beginPath(); ctx.ellipse(-1, -7, 11 * puff, 6.5 * puff, -0.05, 0, TAU); ctx.clip();
    ctx.fillStyle = 'rgba(10,20,6,.7)';
    ctx.fillRect(-14, -16, 28, 18);
    const lvl = -8 + Math.sin(e.t * 3.2) * 1.2;
    const bg = ctx.createLinearGradient(0, lvl - 2, 0, 0);
    bg.addColorStop(0, lit(e) ? shade(e.accent, 0.4) : '#fff');
    bg.addColorStop(1, lit(e) ? shade(e.accent, -0.35) : '#fff');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(-14, 2);
    ctx.lineTo(-14, lvl);
    for (let x = -14; x <= 14; x += 4) ctx.lineTo(x, lvl + Math.sin(x * 0.5 + e.t * 6) * 1.2);
    ctx.lineTo(14, 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    for (let k = 0; k < 3; k++) { const by = -1 - ((e.t * 4 + k * 0.33) % 1) * 7; ctx.beginPath(); ctx.arc(-6 + k * 5, by, 0.9, 0, TAU); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(-1, -7, 11 * puff, 6.5 * puff, -0.05, 0, TAU); ctx.stroke();
    if (lit(e)) glow(ctx, -1, -6, 16, e.accent, 0.22 + charge * 0.2);
    // glowing pustules
    for (const [x, y, r] of [[-11, -16, 2.4], [-5, -21, 1.8], [-14, -9, 1.9], [3, -19, 1.5], [9, -15, 1.3]]) {
      ctx.fillStyle = shade(C.body, 0.25);
      ctx.beginPath(); ctx.arc(x, y * puff, r + 0.6, 0, TAU); ctx.fill();
      ctx.fillStyle = lit(e) ? mix(e.accent, '#ffffff', 0.3) : '#fff';
      ctx.beginPath(); ctx.arc(x, y * puff, r * 0.6, 0, TAU); ctx.fill();
    }
    // front leg with claws
    limb(ctx, [[9, -6], [13, -3], [11, 0]], 4.2, C.wing);
    ctx.strokeStyle = C.bone;
    ctx.lineWidth = 1;
    ctx.beginPath(); for (let k = 0; k < 3; k++) { ctx.moveTo(11 + k, 0); ctx.lineTo(13 + k * 1.4, 0.5); } ctx.stroke();
    // the maw
    const open = spit ? 7 : charge * 4.5;
    const my = -14 * puff;
    if (open > 0.5) {
      ctx.fillStyle = '#1a0806';
      ctx.beginPath(); ctx.moveTo(3, my); ctx.quadraticCurveTo(12, my - open * 0.4, 18.5, my - open * 0.5); ctx.lineTo(18, my + open * 0.6); ctx.quadraticCurveTo(11, my + open * 0.8, 3, my); ctx.fill();
      if (lit(e)) glow(ctx, 13, my, 10 + open, e.accent, 0.35);
      ctx.fillStyle = '#b8404a';
      ctx.beginPath(); ctx.ellipse(11, my + open * 0.35, 4.5, 1.4, 0.1, 0, TAU); ctx.fill();
      teeth(ctx, 6, my - open * 0.2, 17.5, my - open * 0.45, 5, 2.4);
      teeth(ctx, 6, my + open * 0.3, 17, my + open * 0.55, 4, 2, false);
    } else {
      ctx.strokeStyle = '#1a0a06';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(3, my); ctx.quadraticCurveTo(11, -11, 17.5, -13); ctx.stroke();
      teeth(ctx, 5, my + 0.5, 16, -12.8, 5, 2.4);
    }
    // drool
    if (lit(e)) {
      const dl = 3 + ((e.t * 0.8) % 1) * 6;
      ctx.strokeStyle = rgba(e.accent, 0.8);
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(15, -12); ctx.quadraticCurveTo(15.5, -12 + dl * 0.6, 15, -12 + dl); ctx.stroke();
      ctx.fillStyle = rgba(e.accent, 0.9);
      ctx.beginPath(); ctx.arc(15, -12 + dl, 1.3, 0, TAU); ctx.fill();
    }
    horn(ctx, -8, -22 * puff, 10, -5, 2.6, -1, C.bone);
    horn(ctx, 2, -24 * puff, 9, -3, 2.3, -1, C.bone);
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(4, -21.5 * puff); ctx.lineTo(13, -18.5 * puff); ctx.stroke();
    eye(ctx, 6.5, -19.5 * puff, 2.1, '#ffe14a', '#fff', 2.2);
    eye(ctx, 11.5, -17 * puff, 1.6, '#ffe14a', '#fff', 2.2);
    eye(ctx, 1.5, -20.5 * puff, 1.2, '#ffe14a', '#fff', 2.2);
    if (Math.random() < 0.05) part({ ...W(e, 14, -12), vx: 0, vy: 40, g: 400, life: 0.6, size: 2, color: e.accent });
    dress(ctx, e, L, true);
  },

  // A hell knight: a horned great helm with a burning visor, a tattered cape, spiked plate with
  // molten seams, and a huge jagged cleaver that it raises before it charges.
  brute(ctx, e) {
    const C = pal(e, '#5a1a14', 0.45), charge = e.state === 'charge', wind = e.state === 'wind';
    const heat = charge ? 1 : wind ? 0.7 + Math.sin(e.t * 30) * 0.3 : 0.35 + Math.sin(e.t * 3) * 0.1;
    const moving = Math.abs(e.vx) > 20 ? 1 : 0, step = Math.sin(e.t * (charge ? 20 : 8)) * moving;
    const L = { tops: [[-12, -46, -0.9], [-5, -51, -0.4], [21, -49, 0.7]], drips: [[-8, -15], [0, -15], [10, -15]], core: [2, -32, 26] };
    const hot = `rgba(255,${(120 + heat * 100) | 0},40,${0.35 + heat * 0.6})`;
    dress(ctx, e, L, false);
    if (charge) ctx.rotate(0.15);
    // tattered cape
    const wave = e.t * (moving ? 9 : 3), cl = charge ? 1.4 : 1;
    ctx.fillStyle = lit(e) ? shade(C.body, -0.45) : '#fff';
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-6, -50);
    ctx.quadraticCurveTo(-18 * cl, -40, -22 * cl + Math.sin(wave) * 3, -10);
    for (let k = 0; k <= 5; k++) {
      const x = -22 * cl + Math.sin(wave) * 3 + k * (16 * cl) / 5, y = -10 + (k % 2 ? -5 : 2) + Math.sin(wave + k) * 2;
      ctx.lineTo(x, y);
    }
    ctx.quadraticCurveTo(-4, -30, 2, -48);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // the far arm
    limb(ctx, [[-8, -44], [-14, -32], [-10, -24]], 7, C.wing);
    // armoured legs
    for (const s of [-1, 1]) {
      const sw = step * s, col = s > 0 ? C.body : C.wing;
      const knee = [s * 9 + sw * 5 + 2, -11], foot = [s * 9 + sw * 7, -1];
      limb(ctx, [[s * 8, -21], knee, foot], 8, col);
      ctx.fillStyle = s > 0 ? C.metal : C.metalD;
      ctx.strokeStyle = C.metalL;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(knee[0] - 4, knee[1] - 2); ctx.lineTo(knee[0] + 5, knee[1] - 3); ctx.lineTo(foot[0] + 4, foot[1] - 4); ctx.lineTo(foot[0] - 4, foot[1] - 4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(foot[0] - 6, 0); ctx.lineTo(foot[0] - 5, -5); ctx.lineTo(foot[0] + 5, -5); ctx.lineTo(foot[0] + 8, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.metalL;
      ctx.beginPath(); ctx.moveTo(knee[0] + 3, knee[1] - 3); ctx.lineTo(knee[0] + 8, knee[1] - 4); ctx.lineTo(knee[0] + 3, knee[1] + 1); ctx.fill();
    }
    // torso
    const g = ctx.createLinearGradient(-20, -52, 20, -18);
    g.addColorStop(0, C.light);
    g.addColorStop(1, C.dark);
    ctx.fillStyle = g;
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-13, -18);
    ctx.quadraticCurveTo(-23, -38, -15, -50);
    ctx.quadraticCurveTo(0, -58, 18, -48);
    ctx.quadraticCurveTo(23, -32, 12, -18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // breastplate with molten seams and a burning rune
    const mg = ctx.createLinearGradient(-10, -48, 14, -22);
    mg.addColorStop(0, C.metalL);
    mg.addColorStop(0.45, C.metal);
    mg.addColorStop(1, C.metalD);
    ctx.fillStyle = mg;
    ctx.strokeStyle = C.metalD;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-11, -47); ctx.lineTo(14, -48); ctx.lineTo(16, -31); ctx.lineTo(2, -21); ctx.lineTo(-12, -31); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = lit(e) ? hot : '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-11, -47); ctx.lineTo(-12, -31); ctx.lineTo(2, -21); ctx.lineTo(16, -31);
    ctx.moveTo(-9, -40); ctx.lineTo(-4, -36); ctx.lineTo(-7, -30);
    ctx.moveTo(11, -44); ctx.lineTo(8, -39); ctx.lineTo(12, -34);
    ctx.stroke();
    ctx.strokeStyle = lit(e) ? rgba(e.accent, 0.7 + heat * 0.3) : '#fff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(2, -43); ctx.lineTo(2, -28); ctx.moveTo(-2.5, -39); ctx.lineTo(2, -35); ctx.lineTo(6.5, -39); ctx.moveTo(-2, -31); ctx.lineTo(6, -31);
    ctx.stroke();
    ctx.restore();
    if (lit(e)) glow(ctx, 2, -35, 12 + heat * 6, e.accent, 0.25 + heat * 0.25);
    // tassets
    ctx.fillStyle = C.metal;
    ctx.strokeStyle = C.metalL;
    ctx.lineWidth = 1;
    for (const x of [-9, 0, 9]) { ctx.beginPath(); ctx.moveTo(x - 4.5, -22); ctx.lineTo(x + 4.5, -22); ctx.lineTo(x + 3.5, -15); ctx.lineTo(x - 3.5, -15); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    // the cleaver: resting, raised high to wind up, or thrust ahead in the charge
    const tgt = charge ? [25, -33, -0.08] : wind ? [7, -54, -2.25] : [23, -27 + step * 2, 0.85];
    if (e.swA === undefined) { e.swX = tgt[0]; e.swY = tgt[1]; e.swA = tgt[2]; }
    e.swX += (tgt[0] - e.swX) * 0.3; e.swY += (tgt[1] - e.swY) * 0.3; e.swA += (tgt[2] - e.swA) * 0.3;
    const hx = e.swX, hy = e.swY;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(e.swA);
    if (charge && lit(e)) flame(ctx, 18, 0, 34, 16, e.t * 2, ['#ff3a0a', '#ff9a1a', '#fff2a0'], 5, 4);
    ctx.fillStyle = C.metalD;
    ctx.fillRect(-9, -2, 10, 4);
    ctx.fillStyle = C.metalL;
    ctx.beginPath(); ctx.arc(-10, 0, 2.6, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(1, -8); ctx.lineTo(4, -3); ctx.lineTo(4, 3); ctx.lineTo(1, 8); ctx.lineTo(3, 0); ctx.closePath(); ctx.fill();
    const bl = ctx.createLinearGradient(0, -6, 0, 6);
    bl.addColorStop(0, C.metalL);
    bl.addColorStop(0.6, C.metal);
    bl.addColorStop(1, C.metalD);
    ctx.fillStyle = bl;
    ctx.strokeStyle = C.metalD;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(4, -4.5);
    for (let k = 0; k < 5; k++) { ctx.lineTo(9 + k * 6, -5 - (k % 2) * 2.5); ctx.lineTo(12 + k * 6, -4); }
    ctx.lineTo(40, -6);
    ctx.lineTo(42, 1);
    ctx.quadraticCurveTo(26, 6.5, 4, 4.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = lit(e) ? hot : '#fff';
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(6, 4); ctx.quadraticCurveTo(26, 5.8, 41.5, 0.8); ctx.stroke();
    ctx.restore();
    ctx.restore();
    // the sword arm
    limb(ctx, [[13, -44], [22, -36 + (wind ? -6 : 0)], [hx, hy]], 8, C.body);
    ctx.fillStyle = C.metalD;
    ctx.strokeStyle = C.metalL;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(hx, hy, 3.6, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.metalL;
    for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.arc(hx + 2.6, hy + k * 2, 0.9, 0, TAU); ctx.fill(); }
    // spiked pauldron
    ctx.fillStyle = C.metal;
    ctx.strokeStyle = C.metalL;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(12, -47, 11, 7, -0.3, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(13, -44, 9, 5, -0.3, 0, Math.PI); ctx.stroke();
    ctx.fillStyle = C.metalL;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(5 + k * 5, -51); ctx.lineTo(7 + k * 5, -61 - (k === 1 ? 4 : 0)); ctx.lineTo(9.5 + k * 5, -51); ctx.fill(); }
    // great helm with bull horns and a burning visor
    const hg2 = ctx.createLinearGradient(3, -68, 18, -52);
    hg2.addColorStop(0, C.metalL);
    hg2.addColorStop(1, C.metalD);
    ctx.fillStyle = hg2;
    ctx.strokeStyle = C.metalD;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(2, -52); ctx.lineTo(1, -62); ctx.quadraticCurveTo(9, -70, 18, -64); ctx.lineTo(20, -55); ctx.lineTo(15, -51); ctx.closePath();
    ctx.fill();
    ctx.stroke();
    horn(ctx, 4, -64, 16, -11, 3.8, -1, C.bone);
    horn(ctx, 14, -65, 14, 5, 3.4, 1, C.bone);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = lit(e) ? `rgba(255,${(160 + heat * 80) | 0},60,${0.7 + heat * 0.3})` : '#fff';
    ctx.fillRect(8, -61, 11, 2.2);
    ctx.fillRect(14.4, -61, 2.2, 7);
    ctx.restore();
    eye(ctx, 17, -60, 1.5 + heat * 0.7, '#ffd34a', '#fff', 3.6);
    if (heat > 0.6 && Math.random() < 0.4) part({ ...W(e, 16, -58), vx: e.face * 20, vy: -60, life: 0.6, size: 4, grow: 1.5, color: 'rgba(200,200,200,.25)' });
    if (charge && Math.random() < 0.5) part({ ...W(e, 30, -30), vx: -e.face * 60, vy: rand(-60, -20), life: 0.4, size: rand(1.5, 2.5), color: '#ffb347', add: true });
    dress(ctx, e, L, true);
  },
};
