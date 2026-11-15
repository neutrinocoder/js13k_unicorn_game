// The people you talk to and trade with: Virgil the guide, Iris of the rainbow, Charon the
// ferryman who keeps the shop below, Hermes who keeps the one above, and the pedlars at their
// carts. Each is drawn facing +x with its feet (or the ground beneath it) at (0, 0). The two
// guides move a little as they wait; the three who keep shop stand quite still.
import { flame, eye, glow, limb } from './art.js';
import { RAINBOW, mix, rgba, TAU } from './util.js';
import { angelWing, taper, limb2 } from './player.js';

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
// She is one of the angels of Olympus, and is drawn as they are in the prelude: the same wings,
// the same sharp face in profile, the same long locks streaming back, a circlet, a halo, the
// same dark outline. What sets her apart is the rainbow. Their wings are edged with gold, hers
// with every colour in turn; their hair is gold, hers runs from indigo to gold lock by lock;
// their halo is a gold ring, hers a rainbow one, turning. They wear a soldier's coat, breastplate
// and boots; she wears a white gown and goes barefoot, hovering, and pours the rainbow from a
// gold pitcher while a rainbow sash flies from her waist. She smiles, which they do not.
// Drawn in the angel's own measure (its head is 45 above its feet) and then enlarged.
const INK = '#33264d';
const soft = c => mix('#ffffff', c, 0.88);
const IRIS_C = {
  wDark: '#d6cfe8', wDarkF: '#b4accb', wMid: '#ffffff', wMidF: '#e4def0', wEdge: '#ffffff', wEdgeF: '#e4def0',
  cov: '#f6f2fc', covF: '#cfc7df', quill: 'rgba(150,120,210,.35)', gleam: 'rgba(255,246,255,.6)', gleamF: 'rgba(230,220,250,.35)',
  tips: RAINBOW.map(soft), tipsF: RAINBOW.map(c => mix('#d8d0e8', c, 0.7)),
};
const IRIS_HAIR = ['#4a34b8', '#7a3fd6', '#b048e0', '#ff5fa8', '#ff8a5a', '#ffc04a'];
export function iris(ctx, t) {
  const flap = Math.sin(t * 2.4) * 0.07, sway = Math.sin(t * 1.3);
  ctx.save();
  ctx.scale(1.6, 1.6);
  ctx.translate(0, -2);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  glow(ctx, 0, -30, 40, '#fff0fa', 0.2);
  const sh = [0.5, -37], hc = [sh[0] + 1.6, -45.2], spread = 0.55;
  // the far wing
  angelWing(ctx, sh[0] - 5, sh[1] + 1.5, 1.27 - spread * 0.12 - flap * 0.8, 20 + spread * 16, spread, false, t, IRIS_C);
  // the rainbow sash flying back from her waist: seven ribbons side by side, as the angel's lash is
  for (let c = 0; c < 7; c++) {
    const line = [];
    for (let k = 0; k <= 9; k++) line.push([-3 - k * 3.6, -22.5 + k * 1.5 + Math.sin(t * 2.6 - k * 0.6) * (0.3 + k * 0.3) + (c - 3) * (1.05 - k * 0.06)]);
    taper(ctx, line, 1.5, 0.5, RAINBOW[c]);
  }
  // the far arm, under the pitcher
  limb2(ctx, [[sh[0] - 1, sh[1] + 1], [1.5, -30], [4, -25.5]], 2.6, '#e2c0ae');
  // bare feet, toes pointed at the ground she does not touch
  ctx.fillStyle = '#f4dccb';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.1;
  for (const [x, y] of [[0.6, -1.6], [3.2, -2.8]]) { ctx.beginPath(); ctx.ellipse(x, y, 1.3, 2.8, -0.3, 0, TAU); ctx.fill(); ctx.stroke(); }
  // the skirt of the gown, flowing down and away behind her as the angel's coat does
  const sg = ctx.createLinearGradient(0, -22, -8, 2);
  sg.addColorStop(0, '#ffffff');
  sg.addColorStop(0.6, '#e6eeff');
  sg.addColorStop(1, '#d6c4ff');
  ctx.fillStyle = sg;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-4.6, -21);
  ctx.quadraticCurveTo(-8, -12, -10, -5);
  ctx.quadraticCurveTo(-11.5, -1, -16 - sway * 2, 2.5 + Math.sin(t * 2.6) * 0.8);
  ctx.quadraticCurveTo(-6, 0.5, -0.5, -3.4);
  ctx.quadraticCurveTo(3.4, -5.4, 5.6, -7);
  ctx.quadraticCurveTo(6.4, -15, 4.4, -21);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(51,38,77,.28)';
  ctx.lineWidth = 0.8;
  for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(k * 2.4, -19); ctx.quadraticCurveTo(k * 3.4 - 1.6, -11, k * 4 - 4.6 - sway * 0.6, -3); ctx.stroke(); }
  ctx.strokeStyle = '#f4c24a';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-14.6 - sway * 2, 1.6); ctx.quadraticCurveTo(-6, -0.4, -0.5, -4.2); ctx.quadraticCurveTo(3.2, -6, 5.2, -7.4); ctx.stroke();
  // the bodice, on the angel's own frame but slighter
  const torso = new Path2D();
  torso.moveTo(-4.6, -20);
  torso.bezierCurveTo(-5, -25, -5.8, -33, -4.6, -38.5);
  torso.lineTo(5, -38.8);
  torso.bezierCurveTo(6.4, -33, 5, -25, 4.4, -20);
  torso.closePath();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.stroke(torso);
  const bg = ctx.createLinearGradient(-5, -38, 5, -20);
  bg.addColorStop(0, '#ffffff');
  bg.addColorStop(1, '#e4e0f4');
  ctx.fillStyle = bg;
  ctx.fill(torso);
  // gold at the neck where the angels wear a breastplate, and a gold belt with a stone
  ctx.fillStyle = '#f4c24a';
  ctx.strokeStyle = 'rgba(120,76,10,.8)';
  ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(-4, -38); ctx.lineTo(4.8, -38); ctx.quadraticCurveTo(3.4, -33.4, 0.8, -32); ctx.quadraticCurveTo(-2.6, -33.4, -4, -38); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c89a3a';
  ctx.fillRect(-5, -22.9, 9.8, 2.4);
  gem(ctx, 0.4, -21.7, 1.7, '#ff5fb0');
  // the near wing, over the back; theirs lies over their hair, but her hair streams over hers
  angelWing(ctx, sh[0] - 3, sh[1] + 2, 1.12 - spread * 0.12 - flap, 22 + spread * 17, spread, true, t, IRIS_C);
  // neck and head: the angel's own, in a warmer skin
  ctx.fillStyle = '#ecd2c2';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(sh[0] - 1, sh[1] - 1); ctx.lineTo(hc[0] - 1, hc[1] + 3); ctx.lineTo(hc[0] + 2, hc[1] + 3); ctx.lineTo(sh[0] + 3, sh[1] - 1); ctx.closePath(); ctx.stroke(); ctx.fill();
  // the halo: the angels' ring, but in every colour, turning slowly
  ctx.save();
  ctx.translate(hc[0] - 2.5, hc[1] - 8.5);
  ctx.rotate(-0.28);
  ctx.scale(1, 0.32);
  glow(ctx, 0, 0, 18, '#fff0fa', 0.45);
  ctx.strokeStyle = 'rgba(51,38,77,.75)';
  ctx.lineWidth = 3.4;
  ctx.beginPath(); ctx.arc(0, 0, 8.5, 0, TAU); ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.lineWidth = 2;
  for (let c = 0; c < 7; c++) { ctx.strokeStyle = RAINBOW[c]; ctx.beginPath(); ctx.arc(0, 0, 8.5, t * 0.8 + c * TAU / 7, t * 0.8 + (c + 1) * TAU / 7 + 0.03); ctx.stroke(); }
  ctx.lineCap = 'round';
  ctx.restore();
  // long locks streaming back, as theirs do: indigo at the crown, down through rose to gold
  const locks = [];
  for (let i = 0; i < 6; i++) {
    const k = i / 5, rx = hc[0] - 1 - k * 2.5, ry = hc[1] - 4.5 + k * 6.5, len = 21 + (i % 2) * 4 - k * 4, pts = [];
    for (let q = 0; q <= 6; q++) { const u = q / 6; pts.push([rx - u * len * 0.9, ry + u * len * 0.42 + Math.sin(t * 2.6 + i * 1.1 - u * 4) * u * 2]); }
    locks.push(pts);
  }
  locks.forEach(l => taper(ctx, l, 6.2, 2.2, 'rgba(51,38,77,.7)'));
  locks.forEach((l, i) => taper(ctx, l, 4.6, 1, IRIS_HAIR[i]));
  ctx.globalCompositeOperation = 'lighter';
  locks.forEach(l => taper(ctx, l.slice(4), 1.4, 0.5, 'rgba(255,226,138,.4)'));
  ctx.globalCompositeOperation = 'source-over';
  // the face: the angel's profile
  const face = new Path2D();
  face.moveTo(hc[0] - 4.6, hc[1] - 1);
  face.bezierCurveTo(hc[0] - 4.8, hc[1] - 6.4, hc[0] + 3.4, hc[1] - 7, hc[0] + 4.8, hc[1] - 2.2);
  face.lineTo(hc[0] + 5.6, hc[1] + 0.4);
  face.lineTo(hc[0] + 4.6, hc[1] + 1.2);
  face.bezierCurveTo(hc[0] + 4.4, hc[1] + 3.6, hc[0] + 2.2, hc[1] + 5.4, hc[0] + 0.6, hc[1] + 5.2);
  face.bezierCurveTo(hc[0] - 2.6, hc[1] + 4.6, hc[0] - 4.4, hc[1] + 2.6, hc[0] - 4.6, hc[1] - 1);
  face.closePath();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.stroke(face);
  const sk = ctx.createLinearGradient(hc[0] - 4, hc[1] - 6, hc[0] + 4, hc[1] + 5);
  sk.addColorStop(0, '#fff2e8');
  sk.addColorStop(1, '#e6c2b0');
  ctx.fillStyle = sk;
  ctx.fill(face);
  // the fringe over the brow
  ctx.fillStyle = IRIS_HAIR[0];
  ctx.strokeStyle = 'rgba(51,38,77,.6)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(hc[0] - 5, hc[1] - 0.5);
  ctx.bezierCurveTo(hc[0] - 5.4, hc[1] - 7.4, hc[0] + 3.6, hc[1] - 8.4, hc[0] + 5.2, hc[1] - 2.6);
  ctx.lineTo(hc[0] + 2.2, hc[1] - 3.6);
  ctx.lineTo(hc[0] + 1, hc[1] - 1.8);
  ctx.lineTo(hc[0] - 0.6, hc[1] - 3.8);
  ctx.lineTo(hc[0] - 2.6, hc[1] + 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // a gold circlet with its stone
  ctx.strokeStyle = '#f4c24a';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(hc[0] - 4.8, hc[1] - 2.2); ctx.quadraticCurveTo(hc[0], hc[1] - 5.6, hc[0] + 4.6, hc[1] - 3.4); ctx.stroke();
  ctx.fillStyle = '#7fe8ff';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(hc[0] + 2.6, hc[1] - 6.2); ctx.lineTo(hc[0] + 3.6, hc[1] - 4.4); ctx.lineTo(hc[0] + 2.6, hc[1] - 3.2); ctx.lineTo(hc[0] + 1.6, hc[1] - 4.4); ctx.closePath(); ctx.fill(); ctx.stroke();
  // where they have a stern brow and a burning eye, she has a long lash, a violet eye and a smile
  if (t % 4.7 < 0.12) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hc[0] + 1.2, hc[1] - 0.1); ctx.quadraticCurveTo(hc[0] + 2.6, hc[1] + 0.7, hc[0] + 3.9, hc[1] + 0.1); ctx.stroke();
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(hc[0] + 2.6, hc[1] - 0.1, 1.6, 1.3, 0.1, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8a48e6';
    ctx.beginPath(); ctx.arc(hc[0] + 2.9, hc[1] - 0.1, 1.05, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a1650';
    ctx.beginPath(); ctx.arc(hc[0] + 3.05, hc[1] - 0.1, 0.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(hc[0] + 2.5, hc[1] - 0.55, 0.38, 0, TAU); ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(hc[0] + 0.3, hc[1] - 1.5); ctx.lineTo(hc[0] + 1, hc[1] - 0.9); ctx.quadraticCurveTo(hc[0] + 2.6, hc[1] - 1.9, hc[0] + 4.3, hc[1] - 0.6); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,110,150,.4)';
  ctx.beginPath(); ctx.arc(hc[0] + 1, hc[1] + 2, 1.3, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#c0486e';
  ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(hc[0] + 1.7, hc[1] + 3); ctx.quadraticCurveTo(hc[0] + 2.8, hc[1] + 4.1, hc[0] + 4, hc[1] + 2.8); ctx.stroke();
  // a gold clasp on the shoulder where they wear a pauldron
  ctx.fillStyle = '#f4c24a';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.arc(sh[0] - 0.4, sh[1] + 1.4, 2.5, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff6c4';
  ctx.beginPath(); ctx.arc(sh[0] - 1, sh[1] + 0.8, 0.9, 0, TAU); ctx.fill();
  // the rainbow pours from the pitcher's lip in a falling arc
  for (let c = 0; c < 7; c++) {
    const o = (c - 3) * 0.72, line = [];
    for (let k = 0; k <= 8; k++) { const u = k / 8; line.push([15.6 + o * 0.3 + u * (2 - u) * 1.9 - o * u, -20.4 + u * u * 17.5 + u * 1.5]); }
    ctx.globalAlpha = 0.95;
    taper(ctx, line.slice(0, 7), 1.05, 0.9, RAINBOW[c]);
    ctx.globalAlpha = 0.45;
    taper(ctx, line.slice(6), 0.9, 0.5, RAINBOW[c]);
  }
  ctx.globalAlpha = 1;
  // the gold pitcher, tipped right over: a handle, a flared lip, a round belly and a foot
  ctx.save();
  ctx.translate(9, -23);
  ctx.rotate(1.85);
  ctx.scale(0.62, 0.62);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-2.4, -8.8); ctx.quadraticCurveTo(-11, -8.6, -6, 0.6); ctx.stroke();
  ctx.strokeStyle = '#f4c24a';
  ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(-2.4, -8.8); ctx.quadraticCurveTo(-11, -8.6, -6, 0.6); ctx.stroke();
  const jg = ctx.createLinearGradient(-7, 0, 7, 0);
  jg.addColorStop(0, '#fff6c4');
  jg.addColorStop(0.5, '#f4c24a');
  jg.addColorStop(1, '#9c6414');
  ctx.fillStyle = jg;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
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
  ctx.stroke();
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,76,10,.8)';
  ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(-6.3, 0.4); ctx.lineTo(6.3, 0.4); ctx.moveTo(-2, -6.5); ctx.lineTo(2, -6.5); ctx.stroke();
  ctx.restore();
  // the near arm reaching out to its handle, bare, with a gold band where they wear a vambrace
  const el = [5.6, -30.4], hand = [12.6, -27.2];
  limb2(ctx, [[sh[0], sh[1] + 1], el, hand], 3, '#f4dccb');
  limb2(ctx, [[8, -29.4], [10.2, -28.4]], 3, '#f4c24a');
  ctx.fillStyle = '#f4dccb';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.arc(hand[0], hand[1], 2.1, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.restore();
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
