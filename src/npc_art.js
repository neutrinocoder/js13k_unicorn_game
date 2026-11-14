// The people you talk to and trade with: Virgil the guide, Iris of the rainbow, Charon the
// ferryman who keeps the shop below, Hermes who keeps the one above, and the pedlars at their
// carts. Each is drawn facing +x with its feet (or the ground beneath it) at (0, 0).
import { flame, eye, glow, limb } from './art.js';
import { RAINBOW, mix, TAU } from './util.js';

const OUT = 'rgba(20,14,40,.6)';

// A lantern hanging at (x, y): a small cage with a flame in it.
function lantern(ctx, x, y, t, cols, frame = '#c9a24a') {
  glow(ctx, x, y, 26, cols[1], 0.5 + Math.sin(t * 5 + x) * 0.06);
  ctx.fillStyle = 'rgba(200,240,255,.22)';
  ctx.fillRect(x - 4, y - 7, 8, 13);
  flame(ctx, x, y + 5, 5, 10, t, cols, x * 0.1, 3);
  ctx.strokeStyle = frame;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 4.5, y - 7, 9, 13);
  ctx.fillStyle = frame;
  ctx.fillRect(x - 5.5, y - 9.5, 11, 2.5);
  ctx.fillRect(x - 5.5, y + 6, 11, 2.5);
}

// ---------- Virgil: the shade of a poet, crowned with gold laurel ----------
// A long indigo cloak whose hem dissolves into mist, an ivory toga with a crimson sash, a white
// beard, an open book that glows, and a tall staff with a lantern of cold fire.
export function virgil(ctx, t) {
  const bob = Math.sin(t * 1.4) * 2, sway = Math.sin(t * 1.1) * 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // he does not quite touch the ground: pale mist pools where his feet would be
  glow(ctx, 0, -3, 36, '#b9a8ff', 0.3);
  // the staff, crooked at the top, and its lantern
  limb(ctx, [[19, 0], [20, -60 + bob], [18, -92 + bob], [23, -101 + bob], [30, -98 + bob]], 3, '#6a4a30');
  const lx = 30 + sway, ly = -82 + bob;
  ctx.strokeStyle = '#c9a24a';
  ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(30, -98 + bob); ctx.lineTo(lx, ly - 9); ctx.stroke();
  lantern(ctx, lx, ly, t, ['#3aa8ff', '#9fe8ff', '#ffffff']);
  // the cloak, its ragged hem fading away
  const cg = ctx.createLinearGradient(0, -70, 0, 4);
  cg.addColorStop(0, '#453884');
  cg.addColorStop(0.65, '#2a2058');
  cg.addColorStop(1, 'rgba(42,32,88,0)');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.moveTo(-9, -60 + bob);
  ctx.quadraticCurveTo(-25, -40 + bob, -23 - sway, 2);
  for (let k = 0; k <= 8; k++) ctx.lineTo(-22 + k * 5.5 - sway * (1 - k / 8), 2 + (k % 2 ? -5 : 0) + Math.sin(t * 2 + k) * 1.2);
  ctx.quadraticCurveTo(25, -40 + bob, 9, -60 + bob);
  ctx.closePath();
  ctx.fill();
  // the toga beneath it, in soft folds
  const tg = ctx.createLinearGradient(0, -58, 0, 0);
  tg.addColorStop(0, '#f6f0e2');
  tg.addColorStop(0.7, '#cfc6dc');
  tg.addColorStop(1, 'rgba(190,180,220,0)');
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(-8, -58 + bob); ctx.quadraticCurveTo(-13, -30 + bob, -11, -1); ctx.lineTo(11, -1); ctx.quadraticCurveTo(13, -30 + bob, 8, -58 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,80,130,.4)';
  ctx.lineWidth = 1;
  for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(k * 4, -46 + bob); ctx.quadraticCurveTo(k * 6 + 1, -26, k * 7, -8); ctx.stroke(); }
  // a crimson sash from shoulder to hip, edged with gold and pinned with a gold clasp
  ctx.fillStyle = '#b3243c';
  ctx.beginPath(); ctx.moveTo(-8, -57 + bob); ctx.lineTo(-2, -58 + bob); ctx.lineTo(12, -27 + bob); ctx.lineTo(9, -19 + bob); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#f0cf7a';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-2, -58 + bob); ctx.lineTo(12, -27 + bob); ctx.stroke();
  ctx.fillStyle = '#ffd34a';
  ctx.beginPath(); ctx.arc(-6, -56 + bob, 2.4, 0, TAU); ctx.fill();
  // one arm out to the staff
  limb(ctx, [[6, -52 + bob], [14, -45 + bob], [19, -50 + bob]], 4.5, '#453884', OUT);
  ctx.fillStyle = '#ecd8c4';
  ctx.beginPath(); ctx.arc(19.5, -51 + bob, 2.6, 0, TAU); ctx.fill();
  // the other holds an open book, and the words in it shine
  limb(ctx, [[-5, -50 + bob], [-10, -40 + bob], [-3, -35 + bob]], 4.5, '#453884', OUT);
  ctx.save();
  ctx.translate(3, -37 + bob);
  ctx.rotate(-0.15);
  ctx.fillStyle = '#6a3a22';
  ctx.fillRect(-8.5, -1, 17, 3);
  ctx.fillStyle = '#fff6dc';
  ctx.beginPath(); ctx.moveTo(-7.5, -1); ctx.quadraticCurveTo(-4, -4.8, 0, -1.6); ctx.quadraticCurveTo(4, -4.8, 7.5, -1); ctx.lineTo(7.5, 0); ctx.lineTo(-7.5, 0); ctx.closePath(); ctx.fill();
  ctx.restore();
  glow(ctx, 3, -41 + bob, 13, '#ffe9a0', 0.38 + Math.sin(t * 3) * 0.1);
  // head
  ctx.fillStyle = '#ecd8c4';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(1, -67 + bob, 7.5, 8.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
  // white hair behind, and a full white beard
  ctx.fillStyle = '#f4f2fa';
  ctx.beginPath(); ctx.moveTo(-6.5, -71 + bob); ctx.quadraticCurveTo(-11, -62 + bob, -6, -55 + bob); ctx.lineTo(-3, -62 + bob); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-3.5, -64 + bob); ctx.quadraticCurveTo(1, -61 + bob, 8.4, -64.5 + bob); ctx.quadraticCurveTo(9, -54 + bob, 3.5, -48 + bob); ctx.quadraticCurveTo(-3, -54 + bob, -3.5, -64 + bob);
  ctx.fill();
  // a stern white brow, an eye lit from within, a Roman nose
  ctx.strokeStyle = '#f4f2fa';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(2, -71 + bob); ctx.lineTo(7.5, -69.6 + bob); ctx.stroke();
  eye(ctx, 5, -67.8 + bob, 1, '#7fd8ff', '#ffffff', 1.9);
  ctx.strokeStyle = 'rgba(120,80,60,.65)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(8, -68.4 + bob); ctx.lineTo(9.8, -64.6 + bob); ctx.lineTo(7.6, -64.2 + bob); ctx.stroke();
  // the laurel wreath, in gold
  glow(ctx, 1, -75 + bob, 13, '#ffe14a', 0.28);
  ctx.fillStyle = '#ffd34a';
  ctx.strokeStyle = '#b8862a';
  ctx.lineWidth = 0.6;
  for (let k = 0; k < 7; k++) {
    const a = Math.PI * (1.04 + k * 0.135);
    ctx.beginPath(); ctx.ellipse(1 + Math.cos(a) * 8, -67.5 + bob + Math.sin(a) * 8.8, 3.3, 1.6, a + 1.2, 0, TAU); ctx.fill(); ctx.stroke();
  }
}

// ---------- Iris: the rainbow that runs between the worlds ----------
// She hovers. Wings of light, each feather a colour of the rainbow; hair and sashes that stream
// out behind her in the same colours; a white gown that trails away to a wisp; a gold circlet
// and a gold pitcher.
export function iris(ctx, t) {
  const flap = Math.sin(t * 2.4) * 0.14, sway = Math.sin(t * 1.3);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  glow(ctx, 0, -40, 64, '#ffd1f0', 0.22);
  // a wing: a fan of seven long feathers, white at the root and one colour each at the tip
  const wing = (rot, alpha, size) => {
    ctx.save();
    ctx.translate(-4, -50);
    ctx.rotate(rot);
    ctx.scale(size, size);
    ctx.globalAlpha = alpha;
    for (let k = 6; k >= 0; k--) {
      const len = 52 - Math.abs(k - 2) * 4.5;
      ctx.save();
      ctx.rotate(-0.5 + k * 0.19);
      const g = ctx.createLinearGradient(0, 0, -len, 0);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.45, mix('#ffffff', RAINBOW[k], 0.6));
      g.addColorStop(1, RAINBOW[k]);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -2.5);
      ctx.quadraticCurveTo(-len * 0.55, -7, -len, 0);
      ctx.quadraticCurveTo(-len * 0.55, 4.5, 0, 2.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };
  wing(0.62 + flap, 0.5, 0.9);
  // three sashes streaming out behind
  ctx.lineWidth = 3;
  for (let r = 0; r < 3; r++) {
    ctx.strokeStyle = RAINBOW[[0, 3, 5][r]];
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    for (let k = 0; k <= 10; k++) {
      const x = -6 - k * 5, y = -38 + r * 5 + k * 1.3 + Math.sin(t * 3 + k * 0.6 + r) * (0.6 + k * 0.5);
      if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // the gown: white at the shoulder, blushing to rose, trailing off to a wisp behind her
  const g = ctx.createLinearGradient(0, -60, 0, 6);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.55, '#dcebff');
  g.addColorStop(1, 'rgba(255,190,235,.25)');
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(120,90,160,.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-7, -58);
  ctx.quadraticCurveTo(-13, -40, -15, -16);
  ctx.quadraticCurveTo(-17, -4, -24 - sway * 3, 6);
  ctx.quadraticCurveTo(-8, 2, 2, -4);
  ctx.quadraticCurveTo(12, -8, 13, -22);
  ctx.quadraticCurveTo(12, -42, 7, -58);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(k * 4, -36); ctx.quadraticCurveTo(k * 6 - 2, -20, k * 7 - 6, -4); ctx.stroke(); }
  // gold at the neck and the waist
  ctx.fillStyle = '#ffd34a';
  ctx.beginPath(); ctx.moveTo(-7, -58); ctx.lineTo(7, -58); ctx.lineTo(0, -51); ctx.closePath(); ctx.fill();
  ctx.fillRect(-10.5, -41, 21, 3);
  ctx.fillStyle = '#ff8ad8';
  ctx.beginPath(); ctx.arc(0, -39.5, 2.2, 0, TAU); ctx.fill();
  // the near wing, over her back
  wing(0.3 + flap * 1.2, 0.9, 1);
  // long hair in every colour, streaming back
  ctx.lineWidth = 3.2;
  for (let k = 0; k < 7; k++) {
    ctx.strokeStyle = RAINBOW[k];
    ctx.beginPath();
    ctx.moveTo(-2, -75 + k * 1.2);
    ctx.quadraticCurveTo(-13, -76 + k * 2.4 + Math.sin(t * 3 + k) * 1.5, -22 - k * 1.5, -64 + k * 3.2 + Math.sin(t * 2.6 + k * 0.8) * 3);
    ctx.stroke();
  }
  // head
  ctx.fillStyle = '#f8e0cc';
  ctx.strokeStyle = 'rgba(120,70,90,.5)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(1, -67, 7.6, 8.6, 0, 0, TAU); ctx.fill(); ctx.stroke();
  // a fringe of hair, an eye with a long lash, a smile, a blush
  ctx.fillStyle = RAINBOW[5];
  ctx.beginPath(); ctx.ellipse(-0.5, -72, 8.2, 5.4, -0.25, Math.PI * 0.95, TAU * 0.99); ctx.fill();
  ctx.fillStyle = '#3a2a6a';
  ctx.beginPath(); ctx.ellipse(4.6, -67.4, 1.2, 1.7, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#3a2a6a';
  ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(3.4, -69.4); ctx.lineTo(6.8, -70.2); ctx.stroke();
  ctx.strokeStyle = '#c0506a';
  ctx.beginPath(); ctx.moveTo(4, -62.6); ctx.quadraticCurveTo(6, -61.4, 7.6, -63); ctx.stroke();
  ctx.fillStyle = 'rgba(255,120,160,.4)';
  ctx.beginPath(); ctx.arc(3, -64.2, 1.8, 0, TAU); ctx.fill();
  // a gold circlet with a small wing at the temple
  ctx.strokeStyle = '#ffd34a';
  ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.arc(1, -67, 8.2, Math.PI * 1.12, Math.PI * 1.9); ctx.stroke();
  ctx.fillStyle = '#ffffff';
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(-6 - k * 1.5, -74 - k * 2.2, 5 - k, 1.6, 0.7 + k * 0.15 + flap, 0, TAU); ctx.fill(); }
  // the rainbow itself, arching over her head
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 7; k++) {
    ctx.strokeStyle = RAINBOW[k];
    ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.arc(1, -68, 16 + k * 1.5, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // her arm, and the gold pitcher she pours the rainbow from
  limb(ctx, [[5, -52], [11, -44], [14, -38]], 3.4, '#f8e0cc', 'rgba(120,70,90,.45)');
  ctx.save();
  ctx.translate(15, -33);
  ctx.rotate(0.5);
  const pg = ctx.createLinearGradient(-5, 0, 5, 0);
  pg.addColorStop(0, '#b8862a');
  pg.addColorStop(0.45, '#fff0b0');
  pg.addColorStop(1, '#c99a2a');
  ctx.fillStyle = pg;
  ctx.strokeStyle = 'rgba(90,60,10,.6)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-2, -9); ctx.lineTo(2, -9); ctx.quadraticCurveTo(1.2, -5, 5, -1); ctx.quadraticCurveTo(6, 6, 0, 7); ctx.quadraticCurveTo(-6, 6, -5, -1); ctx.quadraticCurveTo(-1.2, -5, -2, -9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath(); ctx.arc(-5.6, -3, 3, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
  ctx.restore();
  glow(ctx, 15, -33, 12, '#fff0b0', 0.3);
}

// ---------- Charon: the ferryman of the dead, who keeps the shop below ----------
// A skull deep in a tattered hood, its sockets burning cold blue; a bony hand flipping the coin
// he is owed; his oar at his side with a soul-lantern hung from it. Drawn behind a counter, so
// only what is above y = -28 shows.
export function charon(ctx, t) {
  const bob = Math.sin(t * 1.5) * 2, sway = Math.sin(t * 1.7) * 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // the oar, and the lantern swinging from it
  limb(ctx, [[30, -10], [44, -100]], 4, '#6a4a30');
  ctx.fillStyle = '#7a5636';
  ctx.strokeStyle = 'rgba(0,0,0,.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(46, -111, 6.5, 15, 0.15, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#8a8fa0';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(40, -76); ctx.lineTo(50 + sway, -62); ctx.stroke();
  lantern(ctx, 50 + sway, -53, t, ['#1a6aff', '#5fe8ff', '#ffffff'], '#8a8fa0');
  // cloak and hood
  const g = ctx.createLinearGradient(0, -90, 0, -20);
  g.addColorStop(0, '#2a3e56');
  g.addColorStop(1, '#0a0e16');
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(0,0,0,.7)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-28, -22);
  ctx.quadraticCurveTo(-31, -50 + bob, -15, -63 + bob);
  ctx.quadraticCurveTo(-15, -86 + bob, 2, -91 + bob);
  ctx.quadraticCurveTo(17, -86 + bob, 15, -63 + bob);
  ctx.quadraticCurveTo(31, -50 + bob, 28, -22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // a tattered mantle across the shoulders
  ctx.fillStyle = '#34506c';
  for (let k = 0; k < 7; k++) {
    const x = -24 + k * 8, y = -57 + bob + Math.abs(k - 3) * 2.6;
    ctx.beginPath(); ctx.moveTo(x - 4.6, y); ctx.lineTo(x + 4.6, y); ctx.lineTo(x + Math.sin(t * 2 + k), y + 11 + (k % 2) * 4); ctx.closePath(); ctx.fill();
  }
  // the dark inside the hood, and the skull in it
  ctx.fillStyle = '#04060a';
  ctx.beginPath(); ctx.ellipse(0.5, -69 + bob, 10, 12, 0, 0, TAU); ctx.fill();
  const sk = ctx.createLinearGradient(0, -78 + bob, 0, -58 + bob);
  sk.addColorStop(0, '#f0ead8');
  sk.addColorStop(1, '#a8a08a');
  ctx.fillStyle = sk;
  ctx.beginPath(); ctx.ellipse(0.5, -71 + bob, 7, 7.4, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-4.2, -67 + bob); ctx.lineTo(5.2, -67 + bob); ctx.lineTo(4, -59.5 + bob); ctx.lineTo(-3, -59.5 + bob); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#04060a';
  ctx.beginPath(); ctx.ellipse(-2.6, -71 + bob, 2.3, 2.7, 0.15, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(3.6, -71 + bob, 2.3, 2.7, -0.15, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0.5, -68 + bob); ctx.lineTo(-0.6, -65.6 + bob); ctx.lineTo(1.6, -65.6 + bob); ctx.fill();
  ctx.strokeStyle = '#04060a';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-3.2, -63 + bob); ctx.lineTo(4.2, -63 + bob);
  for (const x of [-1.8, -0.3, 1.2, 2.7]) { ctx.moveTo(x, -64.4 + bob); ctx.lineTo(x, -61.6 + bob); }
  ctx.stroke();
  eye(ctx, -2.6, -71 + bob, 1.3, '#5fe8ff', '#ffffff', 3.4);
  eye(ctx, 3.6, -71 + bob, 1.3, '#5fe8ff', '#ffffff', 3.4);
  // a bony hand over the counter, flipping the coin every soul owes him
  ctx.strokeStyle = '#d9d3c0';
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  for (let k = 0; k < 4; k++) { ctx.moveTo(-21 + k * 2.6, -33); ctx.lineTo(-22 + k * 3, -39 - (k === 1 || k === 2 ? 1.5 : 0)); }
  ctx.moveTo(-12.5, -33.5); ctx.lineTo(-10, -37);
  ctx.stroke();
  limb(ctx, [[-22, -30], [-13, -30]], 3.2, '#d9d3c0', 'rgba(0,0,0,.5)');
  const flip = (t * 0.9) % 1, cy = -42 - Math.sin(flip * Math.PI) * 30;
  glow(ctx, -17, cy, 9, '#ffd34a', 0.5);
  ctx.fillStyle = '#ffd34a';
  ctx.strokeStyle = '#a8761c';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.ellipse(-17, cy, 3.8, 3.8 * Math.abs(Math.cos(flip * Math.PI * 4)) + 0.7, 0, 0, TAU); ctx.fill(); ctx.stroke();
}

// ---------- Hermes: messenger of the gods, who keeps the shop above ----------
// A winged traveller's hat over gold curls, a grin, a red cloak pinned at one shoulder, three
// gems kept in the air with one hand, and the caduceus (two snakes and a pair of wings) beside him.
export function hermes(ctx, t) {
  const bob = Math.sin(t * 1.5) * 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // the caduceus
  glow(ctx, 40, -104, 20, '#ffe9a0', 0.4);
  limb(ctx, [[32, -10], [40, -104]], 3, '#e8c060', 'rgba(90,60,10,.6)');
  for (const [col, ph] of [['#6fd06a', 0], ['#ffd34a', Math.PI]]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let k = 0; k <= 16; k++) { const u = k / 16, y = -30 - u * 66, x = 33.7 + u * 5.6 + Math.sin(u * 9 + ph + t * 1.5) * 4.2 * (1 - u * 0.4); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(120,110,160,.6)';
  ctx.lineWidth = 0.7;
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(40 + s * (7 + k * 2), -103 - k * 2.6, 8 - k * 1.6, 2.4, s * (-0.45 - k * 0.12) + Math.sin(t * 7) * 0.1 * s, 0, TAU); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = '#fff0b0';
  ctx.beginPath(); ctx.arc(40, -108, 3.4, 0, TAU); ctx.fill();
  // the red cloak falling behind one shoulder
  ctx.fillStyle = '#b3243c';
  ctx.strokeStyle = 'rgba(60,10,20,.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-6, -60 + bob); ctx.quadraticCurveTo(-26, -56 + bob, -27 + Math.sin(t * 2) * 1.5, -22); ctx.lineTo(-10, -22); ctx.quadraticCurveTo(-12, -44 + bob, -6, -60 + bob);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // a white tunic over broad shoulders
  const g = ctx.createLinearGradient(0, -62, 0, -22);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#d8d2e6');
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(80,70,120,.5)';
  ctx.beginPath();
  ctx.moveTo(-18, -22); ctx.quadraticCurveTo(-20, -52 + bob, -9, -61 + bob); ctx.lineTo(9, -61 + bob); ctx.quadraticCurveTo(20, -52 + bob, 18, -22);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // the cloak's fold across the chest, with a gold brooch
  ctx.fillStyle = '#cf2f4a';
  ctx.beginPath(); ctx.moveTo(-10, -60 + bob); ctx.lineTo(-3, -61 + bob); ctx.lineTo(16, -34 + bob); ctx.lineTo(14, -26 + bob); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#f0cf7a';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-3, -61 + bob); ctx.lineTo(16, -34 + bob); ctx.stroke();
  ctx.fillStyle = '#ffd34a';
  ctx.beginPath(); ctx.arc(-8, -58 + bob, 2.8, 0, TAU); ctx.fill();
  // neck and head
  ctx.fillStyle = '#f2d2b4';
  ctx.fillRect(-3, -66 + bob, 6, 6);
  ctx.strokeStyle = 'rgba(110,70,50,.55)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(0, -73 + bob, 8.4, 9.2, 0, 0, TAU); ctx.fill(); ctx.stroke();
  // gold curls under the hat
  ctx.fillStyle = '#f0b83a';
  for (const [x, y] of [[-7.5, -74], [-8.4, -70], [-6, -78], [7.5, -75], [8.2, -71]]) { ctx.beginPath(); ctx.arc(x, y + bob, 2.6, 0, TAU); ctx.fill(); }
  // a cocked brow, bright eyes, a grin
  ctx.strokeStyle = '#8a5a1a';
  ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(-5.4, -76.4 + bob); ctx.lineTo(-1.6, -76 + bob); ctx.moveTo(1.8, -77 + bob); ctx.lineTo(5.6, -78 + bob); ctx.stroke();
  ctx.fillStyle = '#2a4a8a';
  ctx.beginPath(); ctx.arc(-3.3, -73.6 + bob, 1.4, 0, TAU); ctx.arc(3.6, -73.8 + bob, 1.4, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(-2.9, -74 + bob, 0.5, 0, TAU); ctx.arc(4, -74.2 + bob, 0.5, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#8a3a2a';
  ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(-3.4, -68.6 + bob); ctx.quadraticCurveTo(1, -65.4 + bob, 4.8, -69.6 + bob); ctx.stroke();
  // the traveller's hat: a gold dome and brim, and two beating wings
  ctx.fillStyle = '#e8c060';
  ctx.strokeStyle = 'rgba(90,60,10,.6)';
  ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.ellipse(0, -80 + bob, 8.6, 6.4, 0, Math.PI, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -80 + bob, 13, 2.6, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(120,110,160,.6)';
  ctx.lineWidth = 0.7;
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(s * (10 + k * 2.4), -84 - k * 3 + bob, 8.5 - k * 1.8, 2.5, s * (-0.55 - k * 0.14) + Math.sin(t * 8) * 0.16 * s, 0, TAU); ctx.fill(); ctx.stroke(); }
  // one hand up, keeping three gems in the air
  limb(ctx, [[-13, -52 + bob], [-21, -42], [-19, -36]], 3.6, '#f2d2b4', 'rgba(110,70,50,.5)');
  for (let k = 0; k < 3; k++) {
    const u = (t * 0.8 + k / 3) % 1, x = -19 + (u - 0.5) * 16, y = -40 - Math.sin(u * Math.PI) * 30, col = ['#ff6fb5', '#5fd8ff', '#ffd34a'][k];
    glow(ctx, x, y, 8, col, 0.45);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + 3.2, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 3.2, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + 1.4, y - 0.6); ctx.lineTo(x - 1.4, y - 0.6); ctx.closePath(); ctx.fill();
  }
}

// ---------- A pedlar at a cart ----------
// A small trader under a great pointed hat with a lantern dangling from its tip, eyes glowing in
// its shadow, a red scarf, and a bottle of something bright held up for sale. Sits on a cart
// whose top is at y = -34.
export function pedlar(ctx, t) {
  const bob = Math.sin(t * 1.6) * 1.5, sway = Math.sin(t * 2.1) * 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // a round cloaked body
  const g = ctx.createLinearGradient(0, -62, 0, -34);
  g.addColorStop(0, '#4a3a78');
  g.addColorStop(1, '#1e1636');
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(-15, -34); ctx.quadraticCurveTo(-16, -58 + bob, 0, -60 + bob); ctx.quadraticCurveTo(16, -58 + bob, 15, -34); ctx.closePath(); ctx.fill(); ctx.stroke();
  // the scarf, one end flying
  ctx.fillStyle = '#c0392b';
  ctx.beginPath(); ctx.ellipse(0, -50 + bob, 10.5, 3.6, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-8, -50 + bob); ctx.quadraticCurveTo(-15, -46 + bob, -17 - sway, -38); ctx.lineTo(-12 - sway, -39); ctx.quadraticCurveTo(-10, -45 + bob, -5, -48 + bob); ctx.fill();
  // the face is all shadow and two bright eyes
  ctx.fillStyle = '#0a0612';
  ctx.beginPath(); ctx.ellipse(0, -57 + bob, 8.5, 5.5, 0, 0, TAU); ctx.fill();
  eye(ctx, -3.2, -57 + bob, 1.5, '#ffd34a', '#ffffff', 3);
  eye(ctx, 3.2, -57 + bob, 1.5, '#ffd34a', '#ffffff', 3);
  // the hat: a wide brim, a tall crooked cone, a gold band with a star
  ctx.fillStyle = '#3a2a66';
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.beginPath(); ctx.ellipse(0, -61 + bob, 17, 4, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-9, -62 + bob); ctx.quadraticCurveTo(-4, -78 + bob, 4, -84 + bob); ctx.quadraticCurveTo(10, -88 + bob, 15, -83 + bob); ctx.quadraticCurveTo(9, -80 + bob, 9, -62 + bob); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e8c26a';
  ctx.beginPath(); ctx.moveTo(-9, -62.5 + bob); ctx.lineTo(9, -62.5 + bob); ctx.lineTo(8.8, -66 + bob); ctx.lineTo(-8, -66 + bob); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff3b0';
  ctx.beginPath();
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 1.2 : 2.8; ctx.lineTo(Math.cos(a) * r, -70.5 + bob + Math.sin(a) * r); }
  ctx.closePath(); ctx.fill();
  // the little lantern on the hat's tip
  ctx.strokeStyle = '#c9a24a';
  ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(15, -83 + bob); ctx.lineTo(17 + sway * 0.6, -76 + bob); ctx.stroke();
  glow(ctx, 17 + sway * 0.6, -73 + bob, 12, '#ffcf6a', 0.6);
  ctx.fillStyle = '#ffe9a0';
  ctx.beginPath(); ctx.arc(17 + sway * 0.6, -73 + bob, 2.6, 0, TAU); ctx.fill();
  // a hand holding up a bottle
  limb(ctx, [[10, -46 + bob], [17, -48 + bob], [19, -54 + bob]], 3.2, '#4a3a78', 'rgba(0,0,0,.55)');
  const col = RAINBOW[Math.floor(t * 0.5) % 7];
  glow(ctx, 19.5, -60 + bob, 11, col, 0.5);
  ctx.fillStyle = col;
  ctx.strokeStyle = 'rgba(255,255,255,.7)';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(19.5, -59 + bob, 3.6, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e8e0f0';
  ctx.fillRect(18.3, -66 + bob, 2.4, 4);
  ctx.fillStyle = '#8a5a2a';
  ctx.fillRect(18, -67.5 + bob, 3, 1.8);
}
