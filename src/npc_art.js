// The people you talk to and trade with: Virgil the guide, Iris of the rainbow, Charon the
// ferryman who keeps the shop below, Hermes who keeps the one above, and the pedlars at their
// carts. Each is drawn facing +x with its feet (or the ground beneath it) at (0, 0). The two
// guides move a little as they wait; the three who keep shop stand quite still.
import { flame, eye, glow, limb } from './art.js';
import { RAINBOW, mix, rgba, TAU } from './util.js';

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

// A four-pointed glint of light at (x, y).
function glint(ctx, x, y, r, col = '#ffffff') {
  ctx.fillStyle = col;
  ctx.beginPath();
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, d = k % 2 ? r * 0.22 : r; ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); }
  ctx.closePath();
  ctx.fill();
}

// A cut gem at (x, y), s from its middle to its point.
function gem(ctx, x, y, s, col) {
  glow(ctx, x, y, s * 2.4, col, 0.5);
  ctx.fillStyle = col;
  ctx.strokeStyle = 'rgba(20,20,60,.6)';
  ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.8, y - s * 0.2); ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.8, y - s * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.8, y - s * 0.2); ctx.lineTo(x - s * 0.8, y - s * 0.2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,40,.22)';
  ctx.beginPath(); ctx.moveTo(x, y + s); ctx.lineTo(x + s * 0.8, y - s * 0.2); ctx.lineTo(x, y - s * 0.2); ctx.closePath(); ctx.fill();
}

// One long feather from the origin along +x: a pointed leaf with a line down its middle.
function feather(ctx, len, w, fill, ink) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(0, -w * 0.4);
  ctx.quadraticCurveTo(len * 0.6, -w * 0.8, len, 0);
  ctx.quadraticCurveTo(len * 0.62, w * 0.75, 0, w * 0.4);
  ctx.closePath();
  ctx.fill();
  if (ink) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(len * 0.12, 0); ctx.lineTo(len * 0.9, 0); ctx.stroke();
  }
}

// ---------- Iris: the rainbow that runs between the worlds ----------
// She hovers, toes pointed. Great white wings whose feather tips run through the colours of the
// rainbow; long hair the colours of a sunset, streaming back; a white gown with gold at the neck,
// waist and arm; a rainbow sash flying from her waist; and the gold pitcher she pours the rainbow
// from. She stands in bright sky, so everything is outlined in violet ink rather than lit by glow.
const IRIS_INK = 'rgba(78,54,150,.6)';
const WING = [[1, 150, 44], [1, 136, 56], [0.95, 124, 66], [0.88, 114, 70], [0.8, 107, 68], [0.66, 102, 60], [0.52, 99, 50], [0.38, 96, 40], [0.24, 94, 31], [0.1, 92, 22]];
export function iris(ctx, t) {
  const flap = Math.sin(t * 2.4) * 0.09, sway = Math.sin(t * 1.3);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  glow(ctx, 0, -52, 60, '#fff2fb', 0.2);
  // A wing rises from the shoulder to a peak behind the head, and its long feathers sweep down
  // and back from there. Each feather is white at the root and one soft colour at the tip.
  const bone = u => [-4 * 2 * u * (1 - u) - 22 * u * u, -30 * 2 * u * (1 - u) - 42 * u * u];
  const wing = (rot, alpha, size) => {
    ctx.save();
    ctx.translate(-5, -52);
    ctx.rotate(rot);
    ctx.scale(size, size);
    ctx.globalAlpha = alpha;
    WING.forEach(([u, a, len], k) => {
      const [x, y] = bone(u), tip = mix('#ffffff', RAINBOW[Math.min(6, Math.floor(k * 0.7))], 0.62);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a * Math.PI / 180 + Math.sin(t * 2.4 - k * 0.3) * 0.02);
      const g = ctx.createLinearGradient(0, 0, len, 0);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.5, '#ffffff');
      g.addColorStop(1, tip);
      feather(ctx, len, 8.5, g, IRIS_INK);
      ctx.restore();
    });
    // a row of small white feathers over their roots, and the arm of the wing along the top
    for (let k = 8; k >= 0; k--) {
      const [x, y] = bone(k / 8);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((100 + k * 4) * Math.PI / 180);
      feather(ctx, 15 + k, 7, '#ffffff', 'rgba(78,54,150,.4)');
      ctx.restore();
    }
    ctx.strokeStyle = IRIS_INK;
    ctx.lineWidth = 4.6;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-4, -30, -22, -42); ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-4, -30, -22, -42); ctx.stroke();
    ctx.restore();
  };
  wing(-0.34 + flap, 0.6, 0.9);
  // the rainbow sash, flying back from her waist: seven bands side by side
  ctx.lineWidth = 2;
  for (let j = 0; j < 7; j++) {
    ctx.strokeStyle = RAINBOW[j];
    ctx.beginPath();
    for (let k = 0; k <= 11; k++) {
      const x = -5 - k * 5.6, y = -40 + k * 2.3 + Math.sin(t * 2.6 - k * 0.55) * (0.4 + k * 0.42) + (j - 3) * (1.6 - k * 0.07);
      if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  // the far arm, under the pitcher
  limb(ctx, [[3, -54], [6, -45], [10, -39]], 3.2, '#e9c4ae', IRIS_INK);
  // her feet, toes pointed at the ground she does not touch
  ctx.fillStyle = '#f8dcc6';
  ctx.strokeStyle = IRIS_INK;
  ctx.lineWidth = 0.9;
  for (const [x, y] of [[2.6, -3.4], [6.4, -5.6]]) { ctx.beginPath(); ctx.ellipse(x, y, 1.7, 4, -0.3, 0, TAU); ctx.fill(); ctx.stroke(); }
  // the gown: narrow at the waist, the skirt flowing down and away behind her
  const g = ctx.createLinearGradient(0, -58, -6, 4);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.5, '#eaf4ff');
  g.addColorStop(0.85, '#cfe0ff');
  g.addColorStop(1, '#d8c2ff');
  ctx.fillStyle = g;
  ctx.strokeStyle = IRIS_INK;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-6.5, -58);
  ctx.quadraticCurveTo(-8.5, -50, -5.5, -42);
  ctx.quadraticCurveTo(-11, -30, -13, -16);
  ctx.quadraticCurveTo(-15, -4, -25 - sway * 3, 5);
  ctx.quadraticCurveTo(-10, 1, -1, -6);
  ctx.quadraticCurveTo(7, -9, 10, -12);
  ctx.quadraticCurveTo(11, -30, 6, -42);
  ctx.quadraticCurveTo(9, -50, 6.5, -58);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(78,54,150,.3)';
  for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(k * 3, -38); ctx.quadraticCurveTo(k * 5 - 2, -22, k * 6 - 7 - sway, -5); ctx.stroke(); }
  // gold at the neck and the waist, and a gold hem
  ctx.fillStyle = '#ffcf3f';
  ctx.strokeStyle = 'rgba(140,90,10,.7)';
  ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(-6.5, -58); ctx.lineTo(6.5, -58); ctx.lineTo(0.5, -51); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-6.4, -44); ctx.lineTo(6.6, -44); ctx.lineTo(6.2, -40.6); ctx.lineTo(-6, -40.6); ctx.closePath(); ctx.fill(); ctx.stroke();
  gem(ctx, 0.3, -42.3, 2.3, '#ff5fb0');
  ctx.strokeStyle = '#ffcf3f';
  ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(-23 - sway * 3, 4); ctx.quadraticCurveTo(-10, 0.4, -1, -6.4); ctx.quadraticCurveTo(6, -9.2, 9.6, -12); ctx.stroke();
  // the near wing, over her back
  wing(0.02 + flap * 1.2, 1, 1);
  // Her head, drawn a little large. Long hair blows back from it in one soft mass that ends in
  // four curling locks: indigo at the crown, through violet and rose to gold at the tips.
  ctx.save();
  ctx.translate(2, -60);
  ctx.scale(1.14, 1.14);
  ctx.translate(-2, 60);
  const w1 = Math.sin(t * 2.2) * 0.3, wv = k => Math.sin(t * 2.2 - k * 0.8) * 2;
  const hg = ctx.createLinearGradient(2, -76, -32, -44);
  hg.addColorStop(0, '#4a34b8');
  hg.addColorStop(0.32, '#a348e0');
  hg.addColorStop(0.7, '#ff6aa6');
  hg.addColorStop(1, '#ffc258');
  ctx.fillStyle = hg;
  ctx.strokeStyle = 'rgba(50,30,110,.6)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(3, -78.4);
  ctx.bezierCurveTo(-8, -82, -17, -78, -25, -71 + wv(0));
  ctx.quadraticCurveTo(-30, -67 + wv(0), -34, -66 + wv(1));
  ctx.quadraticCurveTo(-29, -63 + wv(1), -26, -59 + wv(1));
  ctx.quadraticCurveTo(-31, -56 + wv(2), -33, -52 + wv(2));
  ctx.quadraticCurveTo(-27, -52 + wv(2), -23, -49 + wv(2));
  ctx.quadraticCurveTo(-26, -45 + wv(3), -27, -40 + wv(3));
  ctx.quadraticCurveTo(-21, -43 + wv(3), -17, -45 + wv(3));
  ctx.quadraticCurveTo(-17, -40, -18, -36 + wv(4));
  ctx.quadraticCurveTo(-11, -44, -4, -60);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.38)';
  ctx.lineWidth = 0.8;
  for (const [k, x, y] of [[0, -29, -65], [1, -28, -54], [2, -23, -43], [3, -15, -40]]) { ctx.beginPath(); ctx.moveTo(-4, -75 + k * 4.5); ctx.quadraticCurveTo(-15, -77 + k * 6.5, x, y + wv(k + 1)); ctx.stroke(); }
  // neck and head
  ctx.fillStyle = '#f8dcc6';
  ctx.strokeStyle = IRIS_INK;
  ctx.lineWidth = 1;
  ctx.fillRect(-1.6, -62, 5, 6);
  ctx.beginPath();
  ctx.moveTo(-4.6, -71);
  ctx.quadraticCurveTo(-4, -78, 3, -77.6);
  ctx.quadraticCurveTo(9.6, -77, 9.8, -69.5);
  ctx.quadraticCurveTo(10.6, -66.4, 9, -63.4);
  ctx.quadraticCurveTo(6.4, -59, 2.4, -59.6);
  ctx.quadraticCurveTo(-3.6, -61, -4.6, -71);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // two bright eyes under long lashes, a brow, a small nose, a smile, a blush
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(3.6, -68.2, 1.9, 2.1, 0, 0, TAU); ctx.ellipse(8.2, -68.4, 1.1, 1.9, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#7a3fe0';
  ctx.beginPath(); ctx.ellipse(4.1, -68, 1.3, 1.7, 0, 0, TAU); ctx.ellipse(8.5, -68.2, 0.8, 1.5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2a1650';
  ctx.beginPath(); ctx.arc(4.3, -67.9, 0.7, 0, TAU); ctx.arc(8.6, -68.1, 0.5, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(3.7, -68.8, 0.5, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#2a1650';
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  ctx.moveTo(1.3, -69.2); ctx.quadraticCurveTo(3.6, -70.9, 5.7, -69.5);
  ctx.moveTo(7.2, -69.8); ctx.quadraticCurveTo(8.4, -70.7, 9.4, -69.7);
  ctx.moveTo(1.3, -69.2); ctx.lineTo(0.5, -70);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(74,52,184,.8)';
  ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(1.4, -71.9); ctx.quadraticCurveTo(3.8, -73.5, 6, -72.2); ctx.moveTo(7.5, -72.4); ctx.quadraticCurveTo(8.5, -73.2, 9.5, -72.3); ctx.stroke();
  ctx.strokeStyle = 'rgba(170,100,90,.7)';
  ctx.beginPath(); ctx.moveTo(6.8, -66.6); ctx.lineTo(7.5, -65.2); ctx.stroke();
  ctx.strokeStyle = '#d04a78';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(4.4, -62.9); ctx.quadraticCurveTo(6.2, -61.5, 8.2, -63.2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,110,150,.4)';
  ctx.beginPath(); ctx.arc(2.6, -65, 1.9, 0, TAU); ctx.fill();
  // the hair over her brow, and a lock falling in front of the ear
  const fg = ctx.createLinearGradient(8, -76, -5, -60);
  fg.addColorStop(0, '#5a3fca');
  fg.addColorStop(1, '#b04ae0');
  ctx.fillStyle = fg;
  ctx.strokeStyle = 'rgba(50,30,110,.6)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(10, -72.2);
  ctx.quadraticCurveTo(8, -80, 1, -79.4);
  ctx.quadraticCurveTo(-6.4, -78.6, -5.4, -69);
  ctx.quadraticCurveTo(-5.6, -63, -3.4, -58.6 + w1 * 0.3);
  ctx.quadraticCurveTo(-1.6, -64, -1.2, -69.6);
  ctx.quadraticCurveTo(0, -74.6, 5, -74.6);
  ctx.quadraticCurveTo(8, -74.4, 10, -72.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // a gold circlet with a bright stone, and a small wing at the temple
  ctx.strokeStyle = 'rgba(140,90,10,.7)';
  ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.moveTo(-5.2, -74.6); ctx.quadraticCurveTo(2, -78.8, 9.7, -75.8); ctx.stroke();
  ctx.strokeStyle = '#ffcf3f';
  ctx.lineWidth = 1.7;
  ctx.beginPath(); ctx.moveTo(-5.2, -74.6); ctx.quadraticCurveTo(2, -78.8, 9.7, -75.8); ctx.stroke();
  gem(ctx, 8, -76.6, 2, '#7fe8ff');
  for (let k = 2; k >= 0; k--) {
    ctx.save();
    ctx.translate(-3.6, -76.6);
    ctx.rotate((205 + k * 22) * Math.PI / 180 + flap);
    feather(ctx, 10 - k * 1.6, 3.4, '#ffffff', 'rgba(78,54,150,.5)');
    ctx.restore();
  }
  ctx.restore();
  // the rainbow pours from the pitcher's lip in a falling arc
  ctx.lineWidth = 1.5;
  for (let j = 0; j < 7; j++) {
    const o = (j - 3) * 1.25, pg = ctx.createLinearGradient(0, -32, 0, -2);
    pg.addColorStop(0, RAINBOW[j]);
    pg.addColorStop(0.6, RAINBOW[j]);
    pg.addColorStop(1, rgba(RAINBOW[j], 0));
    ctx.strokeStyle = pg;
    ctx.beginPath(); ctx.moveTo(28.6 + o * 0.3, -32.6); ctx.quadraticCurveTo(34.5 - o * 0.5, -29 + o * 0.5, 33 - o, -2); ctx.stroke();
  }
  // the gold pitcher, tipped right over: a handle, a flared lip, a round belly and a foot
  ctx.save();
  ctx.translate(18, -36.5);
  ctx.rotate(1.85);
  ctx.strokeStyle = 'rgba(100,60,6,.8)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-2.4, -8.8); ctx.quadraticCurveTo(-11, -8.6, -6, 0.6); ctx.stroke();
  ctx.strokeStyle = '#e8b83a';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-2.4, -8.8); ctx.quadraticCurveTo(-11, -8.6, -6, 0.6); ctx.stroke();
  const jg = ctx.createLinearGradient(-7, 0, 7, 0);
  jg.addColorStop(0, '#fff3b8');
  jg.addColorStop(0.45, '#f0c040');
  jg.addColorStop(1, '#a8761c');
  ctx.fillStyle = jg;
  ctx.strokeStyle = 'rgba(100,60,6,.8)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-4, -11.5); ctx.lineTo(4, -11.5);
  ctx.quadraticCurveTo(1.6, -9.5, 2, -6.5);
  ctx.quadraticCurveTo(7.2, -4, 6.4, 1.5);
  ctx.quadraticCurveTo(5.6, 7, 1.6, 8.2);
  ctx.lineTo(2.8, 10.2); ctx.lineTo(-2.8, 10.2); ctx.lineTo(-1.6, 8.2);
  ctx.quadraticCurveTo(-5.6, 7, -6.4, 1.5);
  ctx.quadraticCurveTo(-7.2, -4, -2, -6.5);
  ctx.quadraticCurveTo(-1.6, -9.5, -4, -11.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-6.3, 0.4); ctx.lineTo(6.3, 0.4); ctx.moveTo(-2, -6.5); ctx.lineTo(2, -6.5); ctx.stroke();
  ctx.restore();
  // the near arm reaching out to its handle, with a gold band above the elbow
  limb(ctx, [[5, -55], [14, -49.5], [23, -43.6]], 3.4, '#f8dcc6', IRIS_INK);
  ctx.strokeStyle = 'rgba(140,90,10,.7)';
  ctx.lineWidth = 3.2;
  ctx.beginPath(); ctx.moveTo(8.2, -51.2); ctx.lineTo(9.6, -54.4); ctx.stroke();
  ctx.strokeStyle = '#ffcf3f';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(8.2, -51.2); ctx.lineTo(9.6, -54.4); ctx.stroke();
  ctx.fillStyle = '#f8dcc6';
  ctx.strokeStyle = IRIS_INK;
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(23.6, -43.2, 2.4, 0, TAU); ctx.fill(); ctx.stroke();
}

// ---------- Charon: the ferryman of the dead, who keeps the shop below ----------
// He stands quite still. A skull deep in a great peaked hood, cold fire rising from its sockets;
// a ragged mantle and a chain of the coins the dead have paid him; one bony hand holding up the
// coin he is owed, the other gripping his oar, with a soul-lantern hung from it. Drawn behind a
// counter, so only what is above y = -28 shows.
export function charon(ctx) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const BONE = '#e4dec8';
  // the oar: a long shaft, and a blade with a rune of passage cut into it
  limb(ctx, [[36, -12], [47, -100]], 4.2, '#5a3e2a', 'rgba(0,0,0,.7)');
  ctx.save();
  ctx.translate(48.6, -113);
  ctx.rotate(0.12);
  const og = ctx.createLinearGradient(-8, 0, 8, 0);
  og.addColorStop(0, '#4a3220');
  og.addColorStop(0.5, '#8a6844');
  og.addColorStop(1, '#3e2a1a');
  ctx.fillStyle = og;
  ctx.strokeStyle = 'rgba(0,0,0,.7)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(0, 17); ctx.quadraticCurveTo(-9, 6, -6.5, -12); ctx.quadraticCurveTo(0, -21, 6.5, -12); ctx.quadraticCurveTo(9, 6, 0, 17); ctx.closePath(); ctx.fill(); ctx.stroke();
  glow(ctx, 0, -3, 12, '#5fe8ff', 0.4);
  ctx.strokeStyle = '#9ff2ff';
  ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(0, 8); ctx.moveTo(-3.4, -5); ctx.lineTo(0, -9.5); ctx.lineTo(3.4, -5); ctx.moveTo(-3.4, 2); ctx.lineTo(0, -2.5); ctx.lineTo(3.4, 2); ctx.stroke();
  ctx.restore();
  // the soul-lantern, on a chain from the shaft
  ctx.strokeStyle = '#8a8fa0';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(43.4, -72); ctx.quadraticCurveTo(50, -72, 53, -60.5); ctx.stroke();
  lantern(ctx, 53, -51, 0.7, ['#1a6aff', '#5fe8ff', '#ffffff'], '#8a8fa0');
  // the cloak: broad shoulders under a hood that rises to a point
  const g = ctx.createLinearGradient(0, -100, 0, -22);
  g.addColorStop(0, '#33506a');
  g.addColorStop(0.5, '#1a2a3c');
  g.addColorStop(1, '#070a10');
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(0,0,0,.8)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-37, -22);
  ctx.quadraticCurveTo(-40, -50, -25, -58);
  ctx.quadraticCurveTo(-17, -61, -14.5, -65);
  ctx.quadraticCurveTo(-20, -91, 1, -102);
  ctx.quadraticCurveTo(21, -91, 15.5, -65);
  ctx.quadraticCurveTo(18, -61, 26, -58);
  ctx.quadraticCurveTo(40, -50, 37, -22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // the sleeve of the arm that holds the oar
  ctx.beginPath(); ctx.moveTo(24, -57); ctx.quadraticCurveTo(36, -54, 41.5, -46); ctx.lineTo(39, -37); ctx.quadraticCurveTo(32, -30, 28, -24); ctx.closePath(); ctx.fill(); ctx.stroke();
  // light on the cloth: the lantern's cold blue down one side, a little moonlight down the other
  ctx.strokeStyle = 'rgba(95,232,255,.5)';
  ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(4, -100); ctx.quadraticCurveTo(19, -90, 14.5, -66); ctx.moveTo(27, -57); ctx.quadraticCurveTo(38, -50, 36, -30); ctx.stroke();
  ctx.strokeStyle = 'rgba(150,170,210,.28)';
  ctx.beginPath(); ctx.moveTo(-2, -100); ctx.quadraticCurveTo(-18, -90, -13.5, -66); ctx.stroke();
  // a ragged mantle across the shoulders
  ctx.fillStyle = '#263c54';
  ctx.strokeStyle = 'rgba(0,0,0,.75)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-34, -53);
  ctx.quadraticCurveTo(-20, -62, -13, -63);
  ctx.lineTo(13, -63);
  ctx.quadraticCurveTo(20, -62, 34, -53);
  for (const [x, y] of [[33, -40], [28, -45], [25, -34], [19, -43], [14, -33], [8, -42], [3, -35], [-2, -43], [-8, -34], [-13, -42], [-19, -33], [-24, -44], [-29, -37], [-33, -44]]) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // a chain of the coins the dead have paid him
  ctx.strokeStyle = '#8a6a1c';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-13, -59); ctx.quadraticCurveTo(0, -40, 13, -59); ctx.stroke();
  for (let k = 0; k < 5; k++) {
    const u = (k + 0.5) / 5, x = -13 + 26 * u, y = -59 + 38 * u * (1 - u);
    ctx.fillStyle = '#ffd34a';
    ctx.strokeStyle = '#8a5a10';
    ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.arc(x, y, 2.5, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath(); ctx.arc(x - 0.7, y - 0.7, 0.8, 0, TAU); ctx.fill();
  }
  // the dark inside the hood, and the skull in it
  ctx.fillStyle = '#02040a';
  ctx.beginPath(); ctx.ellipse(0.5, -77, 11.5, 14, 0, 0, TAU); ctx.fill();
  const sk = ctx.createLinearGradient(0, -87, 0, -64);
  sk.addColorStop(0, '#f6f0de');
  sk.addColorStop(1, '#8e8670');
  ctx.fillStyle = sk;
  ctx.beginPath(); ctx.ellipse(0.5, -79.5, 7.8, 7.4, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-6, -77); ctx.lineTo(-4.6, -67.6); ctx.lineTo(-2.4, -64.4); ctx.lineTo(3.4, -64.4); ctx.lineTo(5.6, -67.6); ctx.lineTo(7, -77); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#02040a';
  ctx.beginPath(); ctx.ellipse(-2.8, -78.4, 2.7, 3, 0.35, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(3.8, -78.4, 2.7, 3, -0.35, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0.5, -75.2); ctx.lineTo(-0.9, -72.2); ctx.lineTo(0.5, -72.8); ctx.lineTo(1.9, -72.2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#02040a';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-3.6, -68.6); ctx.lineTo(4.6, -68.6);
  for (const x of [-2.2, -0.6, 1, 2.6]) { ctx.moveTo(x, -70.4); ctx.lineTo(x, -66.8); }
  ctx.moveTo(-5.4, -73); ctx.quadraticCurveTo(-4.4, -71, -4.8, -69);
  ctx.moveTo(6.4, -73); ctx.quadraticCurveTo(5.4, -71, 5.8, -69);
  ctx.stroke();
  // cold fire in the sockets, rising in two still tongues
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, s] of [[-2.8, -1], [3.8, 1]]) {
    const fg = ctx.createLinearGradient(x, -78, x + s * 4, -90);
    fg.addColorStop(0, 'rgba(160,245,255,.9)');
    fg.addColorStop(1, 'rgba(40,140,255,0)');
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.moveTo(x - 1.6, -78.6); ctx.quadraticCurveTo(x + s * 0.4, -85, x + s * 4.6, -90.5); ctx.quadraticCurveTo(x + s * 3, -83, x + 1.6, -78); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  eye(ctx, -2.8, -78.4, 1.5, '#5fe8ff', '#ffffff', 3.6);
  eye(ctx, 3.8, -78.4, 1.5, '#5fe8ff', '#ffffff', 3.6);
  // the hand on the oar: four finger bones wrapped round the shaft
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 3.2;
  ctx.beginPath(); for (let k = 0; k < 4; k++) { ctx.moveTo(37.2 + k * 0.35, -45.5 + k * 2.7); ctx.lineTo(43.4 + k * 0.35, -46.3 + k * 2.7); } ctx.stroke();
  ctx.strokeStyle = BONE;
  ctx.lineWidth = 1.9;
  ctx.beginPath(); for (let k = 0; k < 4; k++) { ctx.moveTo(37.2 + k * 0.35, -45.5 + k * 2.7); ctx.lineTo(43.4 + k * 0.35, -46.3 + k * 2.7); } ctx.stroke();
  // the other arm is raised: a ragged sleeve, two bones of the forearm, and the coin held up
  ctx.fillStyle = '#1a2a3c';
  ctx.strokeStyle = 'rgba(0,0,0,.8)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-22, -56); ctx.quadraticCurveTo(-30, -58, -33.5, -53); ctx.lineTo(-34.5, -45); ctx.lineTo(-31, -48); ctx.lineTo(-29.5, -42); ctx.lineTo(-27, -47); ctx.lineTo(-24, -41); ctx.quadraticCurveTo(-20, -48, -22, -56);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  limb(ctx, [[-29.4, -53], [-29.4, -66]], 1.6, BONE, 'rgba(0,0,0,.6)');
  limb(ctx, [[-26.6, -53], [-27.4, -66]], 1.6, BONE, 'rgba(0,0,0,.6)');
  ctx.fillStyle = BONE;
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.ellipse(-28.4, -68.4, 3.3, 2.7, 0, 0, TAU); ctx.fill(); ctx.stroke();
  limb(ctx, [[-30.4, -69.6], [-33.6, -72.6], [-33, -75.4]], 1.4, BONE, 'rgba(0,0,0,.6)');
  limb(ctx, [[-31, -68], [-34.6, -69.4], [-35, -72]], 1.4, BONE, 'rgba(0,0,0,.6)');
  limb(ctx, [[-30.6, -66.8], [-33.6, -66.4]], 1.4, BONE, 'rgba(0,0,0,.6)');
  glow(ctx, -26, -77, 13, '#ffd34a', 0.55);
  ctx.fillStyle = '#ffd34a';
  ctx.strokeStyle = '#8a5a10';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(-26, -77, 4.6, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#b07a1a';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(-26, -77, 2.8, 0, TAU); ctx.stroke();
  limb(ctx, [[-28, -70.4], [-27.4, -73.4]], 1.5, BONE, 'rgba(0,0,0,.6)');
  limb(ctx, [[-26.6, -69.6], [-24.6, -73.2]], 1.5, BONE, 'rgba(0,0,0,.6)');
  glint(ctx, -23.4, -80, 4.4);
  // and the bones of his other fingers rest on the counter's edge
}

// ---------- Hermes: messenger of the gods, who keeps the shop above ----------
// He stands quite still, with half a smile. A gold helmet with great swept-back wings over gold
// curls; a red cloak thrown back from one shoulder; a white tunic crossed by a satchel strap,
// with a gold guard on the other shoulder; three gems hanging in the air above his open hand;
// and the caduceus (two snakes and a pair of wings) held upright in the other.
export function hermes(ctx) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const SKIN = '#f0cba8', INK = 'rgba(90,50,30,.7)', GOLD_INK = 'rgba(110,70,8,.8)';
  const plume = (x, y, deg, len, w) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(deg * Math.PI / 180);
    feather(ctx, len, w, '#ffffff', 'rgba(70,70,130,.7)');
    ctx.restore();
  };
  // the red cloak, thrown back and spread wide behind him, edged with gold
  const cg = ctx.createLinearGradient(-36, 0, 22, 0);
  cg.addColorStop(0, '#8e1730');
  cg.addColorStop(0.6, '#c92a46');
  cg.addColorStop(1, '#8e1730');
  ctx.fillStyle = cg;
  ctx.strokeStyle = 'rgba(60,8,20,.8)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-8, -62);
  ctx.quadraticCurveTo(-24, -64, -38, -50);
  ctx.quadraticCurveTo(-33, -42, -37, -22);
  ctx.lineTo(24, -22);
  ctx.quadraticCurveTo(27, -44, 20, -56);
  ctx.quadraticCurveTo(14, -62, 8, -62);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#f4cf6a';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-10, -61.4); ctx.quadraticCurveTo(-24, -62.4, -36, -50); ctx.quadraticCurveTo(-31, -42, -35, -23); ctx.stroke();
  ctx.strokeStyle = 'rgba(60,8,20,.45)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-22, -56); ctx.quadraticCurveTo(-27, -40, -27, -24); ctx.moveTo(-30, -48); ctx.quadraticCurveTo(-31, -36, -32, -26); ctx.stroke();
  // the caduceus: a gold staff, two snakes twined up it, a pair of wings and a bright ball on top
  limb(ctx, [[33, -20], [38, -104]], 3, '#e8c060', GOLD_INK);
  for (const [col, ph] of [['#3f9e4a', 0], ['#f4cf4a', Math.PI]]) {
    ctx.strokeStyle = 'rgba(20,40,20,.6)';
    for (const lw of [3, 1.9]) {
      ctx.lineWidth = lw;
      ctx.beginPath();
      for (let k = 0; k <= 18; k++) { const u = k / 18, y = -56 - u * 40, x = 35.2 + u * 2.4 + Math.sin(u * 9 + ph) * 4.6 * (1 - u * 0.45); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.stroke();
      ctx.strokeStyle = col;
    }
    const hx = 37.6 + Math.sin(9 + ph) * 2.5;
    ctx.fillStyle = col;
    ctx.strokeStyle = 'rgba(20,40,20,.6)';
    ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.ellipse(hx, -97, 2.2, 1.7, 0, 0, TAU); ctx.fill(); ctx.stroke();
  }
  for (const s of [-1, 1]) for (let k = 2; k >= 0; k--) plume(38 + s * 2.5, -103 - k * 0.6, s > 0 ? -18 - k * 20 : 198 + k * 20, 15 - k * 3, 5);
  glow(ctx, 38, -109, 13, '#fff0b0', 0.5);
  ctx.fillStyle = '#ffe9a0';
  ctx.strokeStyle = GOLD_INK;
  ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.arc(38, -109, 3.8, 0, TAU); ctx.fill(); ctx.stroke();
  glint(ctx, 39.4, -110.6, 3.2);
  // a white tunic over broad shoulders
  const g = ctx.createLinearGradient(-18, 0, 18, 0);
  g.addColorStop(0, '#dcdcf0');
  g.addColorStop(0.45, '#ffffff');
  g.addColorStop(1, '#cfcfe6');
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(60,50,110,.7)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-18, -22); ctx.quadraticCurveTo(-21, -52, -10, -62); ctx.lineTo(10, -62); ctx.quadraticCurveTo(21, -52, 18, -22);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(60,50,110,.3)';
  ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(-4, -54); ctx.quadraticCurveTo(-6, -40, -5, -24); ctx.moveTo(5, -50); ctx.quadraticCurveTo(8, -38, 7, -24); ctx.stroke();
  // the strap of his satchel across the chest, studded with gold
  ctx.strokeStyle = 'rgba(40,20,8,.8)';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-9, -61); ctx.lineTo(16, -26); ctx.stroke();
  ctx.strokeStyle = '#7a4a26';
  ctx.lineWidth = 3.6;
  ctx.beginPath(); ctx.moveTo(-9, -61); ctx.lineTo(16, -26); ctx.stroke();
  ctx.fillStyle = '#ffd34a';
  for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(-6 + k * 5, -56.8 + k * 7, 1.1, 0, TAU); ctx.fill(); }
  // the cloak's collar round the neck, pinned with a winged brooch
  ctx.fillStyle = '#c92a46';
  ctx.strokeStyle = 'rgba(60,8,20,.8)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-11, -61); ctx.quadraticCurveTo(0, -52, 11, -61); ctx.lineTo(9, -65); ctx.quadraticCurveTo(0, -58, -9, -65); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffd34a';
  ctx.strokeStyle = GOLD_INK;
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(9, -60.4, 3, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff3b0';
  ctx.beginPath(); ctx.arc(8.2, -61.2, 1, 0, TAU); ctx.fill();
  // the arm of the open hand, and a gold guard on that shoulder
  limb(ctx, [[-15, -54], [-26, -47], [-32, -41]], 4, SKIN, INK);
  const sg = ctx.createLinearGradient(-22, -62, -8, -52);
  sg.addColorStop(0, '#fff0a8');
  sg.addColorStop(1, '#c08a1c');
  ctx.fillStyle = sg;
  ctx.strokeStyle = GOLD_INK;
  ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(-21.5, -51); ctx.quadraticCurveTo(-21, -63, -9.5, -63.4); ctx.quadraticCurveTo(-8, -56, -11, -51.5); ctx.quadraticCurveTo(-16, -49, -21.5, -51); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-19.6, -54.6); ctx.quadraticCurveTo(-15, -52.6, -10.4, -55.4); ctx.stroke();
  // neck and head: a strong jaw
  ctx.fillStyle = SKIN;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.fillRect(-3.4, -67, 6.8, 6);
  ctx.beginPath();
  ctx.moveTo(-8, -76);
  ctx.quadraticCurveTo(-8.6, -68.6, -5.6, -65.4);
  ctx.quadraticCurveTo(0, -61.6, 5.6, -65.4);
  ctx.quadraticCurveTo(8.6, -68.6, 8, -76);
  ctx.quadraticCurveTo(8, -84, 0, -84);
  ctx.quadraticCurveTo(-8, -84, -8, -76);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // gold curls round the face
  ctx.fillStyle = '#f0b83a';
  ctx.strokeStyle = 'rgba(130,80,10,.7)';
  ctx.lineWidth = 0.7;
  for (const [x, y] of [[-8.2, -75.6], [-8.8, -71.4], [-7, -78.6], [8.2, -75.6], [8.8, -71.4], [7, -78.6], [-3.6, -79.4], [0.4, -80], [4.2, -79.4]]) { ctx.beginPath(); ctx.arc(x, y, 2.5, 0, TAU); ctx.fill(); ctx.stroke(); }
  // one brow cocked, bright eyes, a straight nose, half a smile
  ctx.strokeStyle = '#7a4a14';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-5.6, -76); ctx.lineTo(-1.6, -75.2); ctx.moveTo(1.6, -76); ctx.quadraticCurveTo(3.8, -78, 6, -77); ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(-3.4, -73, 1.9, 1.5, 0, 0, TAU); ctx.ellipse(3.6, -73.4, 1.9, 1.5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2a5ab0';
  ctx.beginPath(); ctx.arc(-3, -73, 1.3, 0, TAU); ctx.arc(4, -73.4, 1.3, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(-2.6, -73.5, 0.45, 0, TAU); ctx.arc(4.4, -73.9, 0.45, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(150,90,60,.7)';
  ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(0.4, -73); ctx.lineTo(1.2, -69.6); ctx.lineTo(-0.2, -69.4); ctx.stroke();
  ctx.strokeStyle = '#8a3a2a';
  ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(-3, -66.8); ctx.quadraticCurveTo(1, -65.4, 4.6, -68.2); ctx.stroke();
  // the helmet: a gold cap with a ridge and a band, and a great white wing swept back each side
  for (const s of [-1, 1]) for (let k = 3; k >= 0; k--) plume(s * 7.4, -82.4 - k * 0.8, s > 0 ? -12 - k * 17 : 192 + k * 17, 19 - k * 3.4, 5.6);
  const hg = ctx.createLinearGradient(-9, -92, 9, -80);
  hg.addColorStop(0, '#fff3b0');
  hg.addColorStop(0.5, '#e8b83a');
  hg.addColorStop(1, '#a8761c');
  ctx.fillStyle = hg;
  ctx.strokeStyle = GOLD_INK;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-9.4, -80.4); ctx.quadraticCurveTo(-9.6, -92.4, 0, -92.4); ctx.quadraticCurveTo(9.6, -92.4, 9.4, -80.4); ctx.quadraticCurveTo(0, -83.4, -9.4, -80.4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -92.4); ctx.lineTo(0, -82.6); ctx.stroke();
  ctx.strokeStyle = '#fff3b0';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-8.6, -81.6); ctx.quadraticCurveTo(0, -84.6, 8.6, -81.6); ctx.stroke();
  for (const s of [-1, 1]) { ctx.fillStyle = '#ffd34a'; ctx.strokeStyle = GOLD_INK; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(s * 8.2, -82, 2.2, 0, TAU); ctx.fill(); ctx.stroke(); }
  // the arm that holds the caduceus, with a gold bracer
  limb(ctx, [[14, -55], [25, -45], [35, -52]], 4, SKIN, INK);
  ctx.strokeStyle = GOLD_INK;
  ctx.lineWidth = 5.4;
  ctx.beginPath(); ctx.moveTo(27, -46.4); ctx.lineTo(31.6, -49.6); ctx.stroke();
  ctx.strokeStyle = '#f4cf4a';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(27, -46.4); ctx.lineTo(31.6, -49.6); ctx.stroke();
  ctx.fillStyle = SKIN;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.ellipse(35.4, -52.4, 3.2, 3.8, 0.1, 0, TAU); ctx.fill(); ctx.stroke();
  // the other hand open, and three gems hanging still in the air above it
  ctx.fillStyle = SKIN;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.ellipse(-32.8, -39.6, 4.2, 2.4, -0.15, 0, TAU); ctx.fill(); ctx.stroke();
  for (const [x, y, col, s] of [[-42, -52, '#5fd8ff', 4.4], [-33, -63, '#ffe14a', 5.2], [-24.6, -52, '#7dffb0', 4.4]]) {
    gem(ctx, x, y, s, col);
    glint(ctx, x + s * 0.7, y - s * 0.9, 2.6);
  }
}

// ---------- A pedlar at a cart ----------
// A masked wanderer, quite still: a wide straw hat with charms hung from its brim, a pale fox
// mask with burning eyes in its shadow, a dark travelling cloak and a long red scarf, a flask
// of something bright held up for sale, and more wares set out on the cart either side. Sits on
// a cart whose top is at y = -34.
export function pedlar(ctx) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const flask = (x, y, r, col) => {
    glow(ctx, x, y, r * 3, col, 0.5);
    ctx.fillStyle = 'rgba(230,240,255,.85)';
    ctx.strokeStyle = 'rgba(10,10,30,.7)';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.rect(x - r * 0.3, y - r * 1.9, r * 0.6, r); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8a5a2a';
    ctx.fillRect(x - r * 0.38, y - r * 2.3, r * 0.76, r * 0.5);
  };
  // wares on the cart: a small open chest of gems one side, two flasks the other
  ctx.fillStyle = '#6a4424';
  ctx.strokeStyle = 'rgba(0,0,0,.7)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.rect(-33, -42, 13, 8); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-33, -42); ctx.lineTo(-31.5, -49); ctx.lineTo(-18.5, -49); ctx.lineTo(-20, -42); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e8c26a';
  ctx.fillRect(-27.6, -41, 2.2, 3);
  gem(ctx, -29.4, -44, 2.2, '#5fd8ff');
  gem(ctx, -25.6, -44.6, 2.4, '#ff6fb5');
  gem(ctx, -22.4, -43.8, 2, '#ffe14a');
  flask(24, -38.4, 3.6, '#ff6fb5');
  flask(31, -37.8, 3, '#ffb347');
  // the travelling cloak: a dark bell with a gold-stitched hem
  const g = ctx.createLinearGradient(0, -58, 0, -34);
  g.addColorStop(0, '#2c4470');
  g.addColorStop(1, '#0e1628');
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(0,0,0,.75)';
  ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(-17, -34); ctx.quadraticCurveTo(-17, -52, -8, -56); ctx.lineTo(8, -56); ctx.quadraticCurveTo(17, -52, 17, -34); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#e8c26a';
  ctx.lineWidth = 0.9;
  ctx.beginPath(); for (let k = 0; k < 8; k++) { ctx.moveTo(-15 + k * 4, -35.6); ctx.lineTo(-13 + k * 4, -38.4); ctx.lineTo(-11 + k * 4, -35.6); } ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.moveTo(-6, -50); ctx.quadraticCurveTo(-8, -44, -8, -40); ctx.moveTo(5, -48); ctx.quadraticCurveTo(7, -43, 7, -40); ctx.stroke();
  // the long red scarf, one end hanging down the front with a fringe
  ctx.fillStyle = '#c8362c';
  ctx.strokeStyle = 'rgba(60,8,8,.75)';
  ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(-8, -51); ctx.quadraticCurveTo(-13, -46, -11.4, -39.6); ctx.lineTo(-6, -39.6); ctx.quadraticCurveTo(-7, -46, -3, -50); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -52.6, 10.6, 3.8, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#e8c26a';
  ctx.lineWidth = 0.9;
  ctx.beginPath(); for (let k = 0; k < 4; k++) { ctx.moveTo(-10.6 + k * 1.5, -39.4); ctx.lineTo(-10.8 + k * 1.5, -36.8); } ctx.stroke();
  // the hood, and the pale mask in it: a fox's narrow face with red marks
  ctx.fillStyle = '#080a14';
  ctx.beginPath(); ctx.ellipse(0, -59.4, 9.4, 7.6, 0, 0, TAU); ctx.fill();
  const mg = ctx.createLinearGradient(0, -65, 0, -52);
  mg.addColorStop(0, '#b8b0a0');
  mg.addColorStop(0.5, '#f6f0e0');
  mg.addColorStop(1, '#d8cfba');
  ctx.fillStyle = mg;
  ctx.strokeStyle = 'rgba(0,0,0,.7)';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-6.6, -63); ctx.quadraticCurveTo(0, -66, 6.6, -63); ctx.quadraticCurveTo(6.4, -57, 0, -52.4); ctx.quadraticCurveTo(-6.4, -57, -6.6, -63); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#c8362c';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-5, -58.6); ctx.lineTo(-2.6, -57.4); ctx.moveTo(5, -58.6); ctx.lineTo(2.6, -57.4); ctx.moveTo(0, -56); ctx.lineTo(0, -54); ctx.stroke();
  // eyes: two slanted slits, burning
  ctx.strokeStyle = '#1a0a04';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-5.2, -61.4); ctx.lineTo(-1.6, -60.2); ctx.moveTo(5.2, -61.4); ctx.lineTo(1.6, -60.2); ctx.stroke();
  eye(ctx, -3.4, -60.8, 1.1, '#ffb020', '#fff3b0', 3.2);
  eye(ctx, 3.4, -60.8, 1.1, '#ffb020', '#fff3b0', 3.2);
  // the brim's shadow across the top of the mask
  ctx.fillStyle = 'rgba(8,6,14,.45)';
  ctx.beginPath(); ctx.ellipse(0, -64.4, 8, 3.2, 0, 0, TAU); ctx.fill();
  // the hat: a wide shallow cone of straw, darker to one side, with a red cord round it
  const sg = ctx.createLinearGradient(-22, 0, 22, 0);
  sg.addColorStop(0, '#f0d08a');
  sg.addColorStop(0.5, '#d8b060');
  sg.addColorStop(1, '#8e6a2c');
  ctx.fillStyle = sg;
  ctx.strokeStyle = 'rgba(40,24,4,.8)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-22, -66); ctx.quadraticCurveTo(-8, -73.6, 0, -81.2); ctx.quadraticCurveTo(8, -73.6, 22, -66); ctx.quadraticCurveTo(0, -61, -22, -66); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(90,60,14,.5)';
  ctx.lineWidth = 0.7;
  ctx.beginPath(); for (const x of [-16, -10, -4, 4, 10, 16]) { ctx.moveTo(0, -80.6); ctx.lineTo(x, -64.2 - Math.abs(x) * 0.07); } ctx.stroke();
  ctx.strokeStyle = '#c8362c';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-6.4, -74.8); ctx.quadraticCurveTo(0, -72.2, 6.4, -74.8); ctx.stroke();
  // a charm hung from the brim: a crystal on a thread
  ctx.strokeStyle = 'rgba(20,10,4,.8)';
  ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(-18.6, -65.4); ctx.lineTo(-18.6, -59.2); ctx.stroke();
  gem(ctx, -18.6, -56.6, 2.6, '#7fe8ff');
  // a gloved hand holding up a flask
  limb(ctx, [[9, -49], [16, -48], [21, -53.6]], 3.4, '#2c4470', 'rgba(0,0,0,.7)');
  flask(21.8, -58.8, 3.6, '#5fe8c0');
  ctx.fillStyle = '#e8c26a';
  ctx.strokeStyle = 'rgba(0,0,0,.7)';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(21.2, -54.4, 2.3, 0, TAU); ctx.fill(); ctx.stroke();
}
