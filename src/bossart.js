// Boss artwork. Each function draws in local space: origin at the boss's feet, facing +x.
import { flame, eye, glow, lightning, strand, limb, horn, teeth } from './art.js';
import { shade, rgba } from './util.js';

const TAU = Math.PI * 2;

function ell(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
}

// ---------- Cerberus: three-headed hound of the pit, wreathed in acid fire ----------
function cerberusHead(ctx, hx, hy, s, ang, open, t, fl, dim, seed) {
  const fur = fl ? '#fff' : shade('#36412a', dim), furL = fl ? '#fff' : shade('#5a6b3e', dim), dark = fl ? '#fff' : '#0c1008';
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(ang);
  ctx.scale(s, s);
  // ear swept back
  ctx.fillStyle = dark;
  ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(-22, -30); ctx.lineTo(-2, -16); ctx.closePath(); ctx.fill();
  // lower jaw (opens)
  ctx.save();
  ctx.translate(6, 3);
  ctx.rotate(open * 0.55);
  ctx.fillStyle = fur;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(30, 1); ctx.quadraticCurveTo(32, 6, 26, 8); ctx.lineTo(2, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#5a0a12';
  ctx.beginPath(); ctx.moveTo(3, 0.5); ctx.lineTo(28, 1.5); ctx.lineTo(24, 4.5); ctx.lineTo(4, 4); ctx.closePath(); ctx.fill();
  teeth(ctx, 6, 1, 28, 1.5, 6, 4, false);
  ctx.restore();
  // mouth interior glow
  if (open > 0.45) glow(ctx, 22, 6, 18, '#b6ff6b', 0.45 * open);
  // skull
  const g = ctx.createLinearGradient(0, -20, 0, 6);
  g.addColorStop(0, furL);
  g.addColorStop(1, fur);
  ctx.fillStyle = g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-14, -4);
  ctx.quadraticCurveTo(-12, -20, 4, -18);
  ctx.quadraticCurveTo(14, -16, 20, -10);
  ctx.lineTo(36, -7);
  ctx.quadraticCurveTo(42, -5, 39, 1);
  ctx.lineTo(8, 4);
  ctx.quadraticCurveTo(-8, 8, -14, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  teeth(ctx, 10, 3.2, 36, 0.8, 7, 4.5, true);
  // fangs
  ctx.fillStyle = '#fff6e6';
  ctx.beginPath(); ctx.moveTo(30, 1); ctx.lineTo(31.5, 10); ctx.lineTo(33.5, 0.6); ctx.fill();
  // brow ridge and nose
  ctx.fillStyle = dark;
  ctx.beginPath(); ctx.moveTo(6, -15); ctx.lineTo(20, -11); ctx.lineTo(8, -10); ctx.closePath(); ctx.fill();
  ell(ctx, 38.5, -4.5, 3, 2.2); ctx.fill();
  // snarl wrinkles
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(22 + k * 4, -8 + k * 0.4); ctx.quadraticCurveTo(24 + k * 4, -5, 22 + k * 4, -2); ctx.stroke(); }
  eye(ctx, 13, -10, 2.6, '#c6ff4a', '#ffffff', 4);
  // acid drool
  if (open > 0.4) {
    ctx.strokeStyle = 'rgba(182,255,107,.8)';
    ctx.lineWidth = 1.6;
    const dr = 8 + Math.sin(t * 5 + seed) * 4;
    ctx.beginPath(); ctx.moveTo(24, 4); ctx.lineTo(25, 4 + dr); ctx.stroke();
    ctx.fillStyle = '#d6ff9a';
    ell(ctx, 25, 5 + dr, 1.6, 2.2); ctx.fill();
  }
  ctx.restore();
}

export function cerberus(ctx, b, t, fl) {
  const run = Math.abs(b.vx) > 30, ph = t * (run ? 15 : 2.5), air = !b.ground;
  const open = b.st === 'spit' ? 0.75 + Math.sin(t * 18) * 0.15 : b.st === 'charge' ? 0.85 : 0.25 + Math.sin(t * 2.5) * 0.12;
  const fur = fl ? '#fff' : '#2c3522', furL = fl ? '#fff' : '#4e5e36', furD = fl ? '#fff' : '#12170c';
  const ACID = ['#2aff5a', '#b6ff6b', '#f4ffd0'];
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ell(ctx, 0, 0, 92, 9); ctx.fill();
  // serpent tail
  const tw = Math.sin(t * 3) * 12;
  const tail = [[-80, -62], [-104, -66], [-118, -88 + tw * 0.4], [-112, -112 + tw], [-126, -128 + tw]];
  strand(ctx, tail, 13, 6, furD);
  strand(ctx, tail, 10, 4, furL);
  ctx.fillStyle = furL;
  ell(ctx, -130, -131 + tw, 9, 6, -0.4); ctx.fill();
  eye(ctx, -133, -134 + tw, 1.6, '#c6ff4a', '#fff', 3);
  ctx.strokeStyle = '#ff3a5a';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-138, -128 + tw); ctx.lineTo(-146, -126 + tw + Math.sin(t * 20) * 2); ctx.stroke();
  // legs
  const leg = (x, p, near) => {
    const s = air ? 0.4 : Math.sin(p), lift = air ? 6 : Math.max(0, Math.cos(p)) * 8;
    const col = near ? fur : furD;
    limb(ctx, [[x, -62], [x + s * 10 + 6, -36], [x + s * 14 - 2, -14 - lift * 0.5], [x + s * 18, -lift]], near ? 17 : 15, col, 'rgba(0,0,0,.7)');
    ctx.strokeStyle = fl ? '#fff' : '#efe2c8';
    ctx.lineWidth = 2.2;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x + s * 18 + 4, -lift - 2); ctx.quadraticCurveTo(x + s * 18 + 10 + k * 2, -lift - 2 + k * 2, x + s * 18 + 10 + k * 3, -lift + 2); ctx.stroke(); }
  };
  leg(-56, ph + 0.6, false);
  leg(44, ph + Math.PI + 0.6, false);
  // body
  const body = new Path2D();
  body.moveTo(-86, -58);
  body.bezierCurveTo(-92, -92, -52, -108, -12, -104);
  body.bezierCurveTo(20, -102, 46, -120, 72, -106);
  body.bezierCurveTo(94, -90, 88, -58, 66, -46);
  body.bezierCurveTo(40, -36, -10, -40, -42, -40);
  body.bezierCurveTo(-70, -40, -84, -46, -86, -58);
  body.closePath();
  ctx.strokeStyle = 'rgba(0,0,0,.75)';
  ctx.lineWidth = 4;
  ctx.stroke(body);
  const g = ctx.createLinearGradient(0, -112, 0, -40);
  g.addColorStop(0, furL);
  g.addColorStop(0.5, fur);
  g.addColorStop(1, furD);
  ctx.fillStyle = g;
  ctx.fill(body);
  // ribs and muscle
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.lineWidth = 2;
  for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(-30 + k * 14, -90 + k); ctx.quadraticCurveTo(-26 + k * 14, -66, -32 + k * 14, -46); ctx.stroke(); }
  // glowing acid veins
  const pulse = 0.55 + Math.sin(t * 3) * 0.3;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(150,255,90,${pulse})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-70, -60); ctx.lineTo(-52, -72); ctx.lineTo(-40, -62); ctx.lineTo(-20, -76); ctx.lineTo(0, -64);
  ctx.moveTo(10, -82); ctx.lineTo(28, -70); ctx.lineTo(44, -84); ctx.lineTo(62, -72);
  ctx.stroke();
  ctx.restore();
  // mane of acid fire along the back
  for (let k = 0; k < 7; k++) {
    const u = k / 6, x = -60 + u * 130, y = -100 - Math.sin(u * Math.PI) * 10 + (u > 0.75 ? -8 : 0);
    flame(ctx, x, y + 6, 30, 34 + (k % 2) * 10, t, ACID, k * 1.7, 3);
  }
  // spiked collar
  ctx.fillStyle = fl ? '#fff' : '#4a3a22';
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(58, -80, 12, 32, 0.25, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = fl ? '#fff' : '#c9c3d9';
  for (let k = 0; k < 6; k++) {
    const a = -1.4 + k * 0.55, x = 58 + Math.cos(a) * 13, y = -80 + Math.sin(a) * 31;
    ctx.beginPath(); ctx.moveTo(x - 3, y - 3); ctx.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 6); ctx.lineTo(x + 3, y + 3); ctx.fill();
  }
  // near legs
  leg(-70, ph, true);
  leg(56, ph + Math.PI, true);
  // three heads
  cerberusHead(ctx, 68, -120, 1.3, -0.35 + Math.sin(t * 2 + 1) * 0.06, open * 0.9, t, fl, -0.25, 1);
  cerberusHead(ctx, 84, -92, 1.45, -0.05 + Math.sin(t * 2.2) * 0.06, open, t, fl, 0, 2);
  cerberusHead(ctx, 70, -62, 1.25, 0.3 + Math.sin(t * 1.8 + 2) * 0.06, open * 0.95, t, fl, -0.12, 3);
  if (b.st === 'spit') glow(ctx, 120, -88, 70, '#b6ff6b', 0.3);
}

// ---------- Semiramis: Queen of the Endless Storm ----------
// Blade-feathered wings, a storm vortex for a body, a halo of thorns and black horns.
function stormWing(ctx, s, upper, t, flap, enr, fl) {
  const N = upper ? 10 : 7, L0 = upper ? 128 : 82;
  const base = upper ? -0.3 + flap * 0.14 : 0.42 + flap * 0.08, fan = upper ? 1.15 : 0.85;
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
    if (upper && i % 3 === 0) glow(ctx, tx, ty, 10, edge, 0.5);
  }
  if (Math.random() < 0.12) {
    const a = base + (upper ? -0.3 : 0.3), len = L0 * 0.8;
    lightning(ctx, s * 6, -36, s * 6 + Math.cos(a) * s * len, -36 + Math.sin(a) * len, '#ffb0f0', 1.2, 6, 10);
  }
}

export function storm(ctx, b, t, fl) {
  ctx.translate(0, -b.h / 2);
  const enr = b.phase > 1, cast = b.st === 'bolts' || b.st === 'orbs' || b.st === 'summon' || b.st === 'gust', gust = b.st === 'gust';
  const PINK = enr ? '#ff3a6a' : '#ff4fd8', EYE = enr ? '#ff2a3a' : '#ffd6ff';
  const flap = Math.sin(t * 2.2);
  glow(ctx, 0, -14, 200, PINK, enr ? 0.32 : 0.24);

  // Storm vortex for a lower body
  const spread = gust ? 1.5 : 1;
  const funnel = new Path2D();
  funnel.moveTo(-16, -6);
  for (let k = 0; k <= 10; k++) { const u = k / 10; funnel.lineTo(-(16 + u * 54 * spread) + Math.sin(t * 3 + u * 6) * 6 * u, -6 + u * 104); }
  for (let k = 10; k >= 0; k--) { const u = k / 10; funnel.lineTo(16 + u * 54 * spread + Math.sin(t * 3.4 + u * 6 + 2) * 6 * u, -6 + u * 104); }
  funnel.closePath();
  const fg = ctx.createLinearGradient(0, -6, 0, 100);
  fg.addColorStop(0, fl ? '#fff' : '#3a0c4a');
  fg.addColorStop(0.6, fl ? '#fff' : 'rgba(40,8,52,.75)');
  fg.addColorStop(1, 'rgba(40,8,52,0)');
  ctx.fillStyle = fg;
  ctx.fill(funnel);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 9; k++) {
    const u = k / 8, y = 2 + u * 92, rx = (20 + u * 54) * spread, a0 = t * (3 + u * 2) + k * 1.3;
    ctx.strokeStyle = rgba(k % 3 ? '#c45cff' : PINK, 0.35 * (1 - u * 0.6));
    ctx.lineWidth = 2.5 - u;
    ctx.beginPath();
    ctx.ellipse(Math.sin(t * 2 + k) * 4 * u, y, rx, 6 + u * 5, 0, a0 % TAU, (a0 % TAU) + 2.2);
    ctx.stroke();
  }
  ctx.restore();
  if (Math.random() < (enr ? 0.5 : 0.3)) lightning(ctx, (Math.random() - 0.5) * 50, 10 + Math.random() * 20, (Math.random() - 0.5) * 110, 70 + Math.random() * 30, '#ff9ae8', 1.2, 6, 12);

  // Wings: two pairs, back pair first
  for (const s of [-1, 1]) stormWing(ctx, s, false, t, flap, enr, fl);
  for (const s of [-1, 1]) stormWing(ctx, s, true, t, flap, enr, fl);

  // Halo of thorns
  ctx.save();
  ctx.translate(0, -64);
  ctx.rotate(t * 0.4);
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba('#ffd34a', 0.8);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 26, 0, TAU); ctx.stroke();
  ctx.fillStyle = rgba(PINK, 0.85);
  for (let k = 0; k < 14; k++) {
    const a = (k * TAU) / 14, r1 = 26, r2 = 26 + (k % 2 ? 9 : 15);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - 0.08) * r1, Math.sin(a - 0.08) * r1);
    ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    ctx.lineTo(Math.cos(a + 0.08) * r1, Math.sin(a + 0.08) * r1);
    ctx.fill();
  }
  ctx.restore();
  glow(ctx, 0, -64, 46, '#ffd34a', 0.25);

  // Long hair streaming in the storm wind
  for (let i = 0; i < 11; i++) {
    const pts = [];
    for (let s = 0; s <= 8; s++) {
      const u = s / 8;
      pts.push([-1 - u * (34 + i * 5) + Math.sin(t * 2.2 + i) * 3, -64 + u * (22 + i * 6) + Math.sin(t * 3.6 + i * 0.8 - u * 5) * u * 11]);
    }
    strand(ctx, pts, 5.5, 1.4, fl ? '#fff' : i % 4 === 0 ? '#c42a8a' : i % 2 ? '#2a0832' : '#4a0e50');
  }

  // Gown and veils flowing into the vortex
  const skirt = new Path2D();
  skirt.moveTo(-10, -14);
  skirt.lineTo(10, -14);
  for (let k = 0; k <= 6; k++) skirt.lineTo(30 - k * 10, 40 + Math.sin(t * 4 + k) * 6 + (k % 2) * 8);
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

  // Corset armour with gold filigree and a heart gem
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
  ctx.fillStyle = fl ? '#fff' : PINK;
  ctx.beginPath(); ctx.moveTo(0, -24); ctx.bezierCurveTo(-6, -29, -4, -35, 0, -31); ctx.bezierCurveTo(4, -35, 6, -29, 0, -24); ctx.fill();
  glow(ctx, 0, -29, 14, PINK, 0.8);
  ctx.fillStyle = '#f2c14e';
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(s * 9, -43); ctx.quadraticCurveTo(s * 18, -48, s * 19, -40); ctx.lineTo(s * 24, -46); ctx.lineTo(s * 17, -36); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = '#f2c14e';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(0, -46, 6, 0.3, Math.PI - 0.3); ctx.stroke();
  eye(ctx, 0, -40.5, 1.4, PINK, '#fff', 3);

  // Arms: raised in a storm of lightning when casting
  const skin = fl ? '#fff' : '#f4d8e8';
  const ra = cast ? 1 : 0;
  const lh = cast ? [-30, -62 - ra * 24] : [-22, -22], rh = cast ? [34, -56 - ra * 26] : [30, -34];
  limb(ctx, [[-11, -40], [-22, -44 - ra * 14], lh], 4.2, skin, 'rgba(60,20,60,.6)');
  limb(ctx, [[11, -40], [24, -40 - ra * 16], rh], 4.2, skin, 'rgba(60,20,60,.6)');
  ctx.fillStyle = '#f2c14e';
  for (const [hx, hy] of [lh, rh]) ctx.fillRect(hx - 3, hy + 4, 6, 3);
  for (const [hx, hy] of [lh, rh]) {
    glow(ctx, hx, hy, cast ? 34 : 18, '#ffb0f0', cast ? 0.75 : 0.5);
    eye(ctx, hx, hy, cast ? 4.5 + Math.sin(t * 30) : 2.6, '#ffd6ff', '#ffffff', 2);
  }
  if (cast) {
    lightning(ctx, lh[0], lh[1], rh[0], rh[1], '#ffd6ff', 1.6, 9, 16);
    if (Math.random() < 0.6) lightning(ctx, rh[0], rh[1], rh[0] + (Math.random() - 0.5) * 50, rh[1] - 70 - Math.random() * 50, '#ffd6ff', 1.4, 6, 12);
    if (Math.random() < 0.6) lightning(ctx, lh[0], lh[1], lh[0] + (Math.random() - 0.5) * 50, lh[1] - 70 - Math.random() * 50, '#ffd6ff', 1.4, 6, 12);
  } else if (Math.random() < 0.3) lightning(ctx, rh[0], rh[1], rh[0] + 14, rh[1] + 18, '#ffd6ff', 1, 4, 6);

  // Face
  ctx.fillStyle = skin;
  ctx.strokeStyle = 'rgba(60,20,60,.65)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-8, -56); ctx.quadraticCurveTo(-9, -69, 1, -70); ctx.quadraticCurveTo(11, -69, 9.5, -57); ctx.quadraticCurveTo(6, -46, 1, -45.5); ctx.quadraticCurveTo(-5, -47, -8, -56); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#2a0a2a';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-5, -62); ctx.lineTo(-0.5, -60.5); ctx.moveTo(8, -62.5); ctx.lineTo(3, -60.5); ctx.stroke();
  eye(ctx, 5, -59, 1.6, EYE, '#ffffff', 4);
  eye(ctx, -2.5, -59, 1.4, EYE, '#ffffff', 4);
  ctx.fillStyle = '#6a0a3a';
  ctx.beginPath(); ctx.moveTo(-0.5, -51.5); ctx.quadraticCurveTo(3, -50, 6.5, -52); ctx.quadraticCurveTo(3, -49, -0.5, -51.5); ctx.fill();
  ctx.fillStyle = 'rgba(255,120,190,.3)';
  ctx.beginPath(); ctx.arc(6.5, -55, 2.2, 0, TAU); ctx.fill();
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
    eye(ctx, tipX, tipY, 2, PINK, '#ffffff', 4);
  }
  ctx.fillStyle = fl ? '#fff' : '#f2c14e';
  ctx.strokeStyle = '#8a5a10';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-8, -66); ctx.lineTo(-6, -73); ctx.lineTo(-2.5, -68); ctx.lineTo(1, -78); ctx.lineTo(4.5, -68); ctx.lineTo(8, -73); ctx.lineTo(10, -66); ctx.closePath();
  ctx.fill(); ctx.stroke();
  eye(ctx, 1, -71, 1.8, PINK, '#fff', 3.5);

  // Orbiting petals and sparks
  for (let i = 0; i < 14; i++) {
    const a = t * (1.4 + (i % 3) * 0.3) + (i * TAU) / 14, rr = 86 + (i % 3) * 14, x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.36 - 10;
    if (i % 4 === 0) glow(ctx, x, y, 8, PINK, 0.7);
    else {
      ctx.fillStyle = i % 3 ? '#ff8ad8' : '#ffd1f0';
      ell(ctx, x, y, 6, 2.4, a + t); ctx.fill();
    }
  }
}

// ---------- Farinata: a lich rising from a sarcophagus of fire ----------
export function heretic(ctx, b, t, fl) {
  ctx.translate(0, -b.h / 2 + Math.sin(t * 2) * 4);
  const cast = b.st === 'ring' || b.st === 'pillars' || b.st === 'meteors';
  const FIRE = ['#ff2a00', '#ff9a1a', '#fff3a0'];
  glow(ctx, 0, -20, 160, '#ff6a1a', 0.3);
  // great fire behind
  flame(ctx, 0, 30, 170, 200 + (cast ? 40 : 0), t, FIRE, 1, 7);
  // hanging chains
  ctx.strokeStyle = fl ? '#fff' : '#5a4a44';
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  for (const s of [-1, 1]) {
    const sw = Math.sin(t * 1.3 + s) * 10;
    ctx.beginPath(); ctx.moveTo(s * 50, -10); ctx.quadraticCurveTo(s * 70 + sw, -90, s * 60 + sw * 2, -200); ctx.stroke();
  }
  ctx.setLineDash([]);
  // lich: robe, ribs, skull with a crown of fire
  ctx.fillStyle = fl ? '#fff' : '#1a0c0a';
  ctx.beginPath();
  ctx.moveTo(-24, 0); ctx.quadraticCurveTo(-28, -40, -14, -58); ctx.lineTo(14, -58); ctx.quadraticCurveTo(28, -40, 24, 0); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = fl ? '#fff' : '#d8c8a8';
  ctx.lineWidth = 2;
  for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-10, -48 + k * 7); ctx.quadraticCurveTo(0, -44 + k * 7, 10, -48 + k * 7); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(0, -54); ctx.lineTo(0, -22); ctx.stroke();
  // arms raised when casting
  const ra = cast ? 1 : 0;
  limb(ctx, [[-14, -52], [-34, -46 - ra * 24], [-44, -60 - ra * 34]], 3.4, fl ? '#fff' : '#d8c8a8', 'rgba(0,0,0,.6)');
  limb(ctx, [[14, -52], [34, -46 - ra * 24], [44, -60 - ra * 34]], 3.4, fl ? '#fff' : '#d8c8a8', 'rgba(0,0,0,.6)');
  for (const hx of [-44, 44]) {
    const hy = -60 - ra * 34;
    flame(ctx, hx, hy + 6, 16, 26 + ra * 14, t, FIRE, hx, 3);
  }
  // skull
  const g = ctx.createRadialGradient(-3, -74, 2, 0, -70, 14);
  g.addColorStop(0, '#fffaf0');
  g.addColorStop(1, '#a89878');
  ctx.fillStyle = fl ? '#fff' : g;
  ctx.beginPath(); ctx.moveTo(-11, -66); ctx.quadraticCurveTo(-13, -84, 0, -85); ctx.quadraticCurveTo(13, -84, 11, -66); ctx.lineTo(7, -60); ctx.lineTo(-7, -60); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#1a0806';
  ell(ctx, -4.5, -72, 3.5, 4); ctx.fill();
  ell(ctx, 4.5, -72, 3.5, 4); ctx.fill();
  eye(ctx, -4.5, -71.5, 1.7, '#ffb347', '#ffffff', 4.5);
  eye(ctx, 4.5, -71.5, 1.7, '#ffb347', '#ffffff', 4.5);
  for (let k = 0; k < 4; k++) ctx.fillRect(-5 + k * 2.8, -62.5, 1.8, 2.4);
  flame(ctx, 0, -82, 30, 34, t, FIRE, 9, 5);
  // sarcophagus front
  const sg = ctx.createLinearGradient(-56, 0, 56, 0);
  sg.addColorStop(0, fl ? '#fff' : '#2a1a16');
  sg.addColorStop(0.5, fl ? '#fff' : '#5a3c30');
  sg.addColorStop(1, fl ? '#fff' : '#2a1a16');
  ctx.fillStyle = sg;
  ctx.strokeStyle = 'rgba(0,0,0,.7)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-56, -8); ctx.lineTo(56, -8); ctx.lineTo(48, 46); ctx.lineTo(-48, 46); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#8a6a4a';
  ctx.lineWidth = 2;
  ctx.strokeRect(-44, -1, 88, 40);
  // carved skull emblem
  ctx.fillStyle = '#3a2620';
  ell(ctx, 0, 16, 9, 8); ctx.fill();
  ctx.fillStyle = '#ff9a1a';
  ell(ctx, -3, 15, 2, 2); ctx.fill();
  ell(ctx, 3, 15, 2, 2); ctx.fill();
  // glowing runes and cracks
  const pulse = 0.5 + Math.sin(t * 4) * 0.4;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(255,150,40,${0.5 + pulse * 0.5})`;
  for (let k = 0; k < 9; k++) {
    const x = -40 + k * 10;
    ctx.fillRect(x, 3, 2, 6); ctx.fillRect(x - 2, 5, 6, 2);
    ctx.fillRect(x + 1, 30, 2, 6);
  }
  ctx.strokeStyle = `rgba(255,120,30,${0.6 + pulse * 0.4})`;
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-30, -6); ctx.lineTo(-24, 10); ctx.lineTo(-30, 24); ctx.moveTo(26, 44); ctx.lineTo(32, 30); ctx.lineTo(24, 18); ctx.stroke();
  ctx.restore();
  // lid floating above
  ctx.save();
  ctx.translate(-30, -96);
  ctx.rotate(-0.45 + Math.sin(t * 1.5) * 0.08);
  ctx.fillStyle = fl ? '#fff' : '#4a2e24';
  ctx.strokeStyle = 'rgba(0,0,0,.7)';
  ctx.fillRect(-60, -7, 120, 14);
  ctx.strokeRect(-60, -7, 120, 14);
  ctx.fillStyle = `rgba(255,150,40,${0.5 + pulse * 0.5})`;
  for (let k = 0; k < 8; k++) ctx.fillRect(-52 + k * 14, -2, 6, 3);
  ctx.restore();
  flame(ctx, 0, 48, 130, 46, t, FIRE, 5, 7);
}

// ---------- Ephialtes: a chained giant of living ice ----------
function iceCluster(ctx, x, y, s, t, fl) {
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k - 2) * 0.42, len = s * (18 + ((k * 7) % 5) * 5), w = s * (5 + (k % 2) * 2);
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

export function titan(ctx, b, t, fl) {
  const skin = fl ? '#fff' : '#57789e', skinL = fl ? '#fff' : '#86a8cc', skinD = fl ? '#fff' : '#2a3f5a';
  const walk = b.st === 'walk' ? Math.sin(t * 7) : 0, stomp = b.st === 'stomp' && b.stT > 0.7 ? 1 : 0, breath = b.st === 'breath';
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ell(ctx, 0, 0, 90, 9); ctx.fill();
  // legs with ice boots
  for (const s of [-1, 1]) {
    const lift = s > 0 ? stomp * 40 : 0, sw = walk * s * 14;
    limb(ctx, [[s * 28, -92], [s * 30 + sw, -46 - lift * 0.6], [s * 30 + sw * 1.2, -20 - lift]], 25, s > 0 ? skin : skinD, 'rgba(10,20,40,.7)');
    ctx.fillStyle = 'rgba(200,240,255,.85)';
    ctx.strokeStyle = 'rgba(40,90,140,.7)';
    ctx.beginPath(); ctx.moveTo(s * 30 + sw * 1.2 - 24, -lift); ctx.lineTo(s * 30 + sw * 1.2 - 20, -26 - lift); ctx.lineTo(s * 30 + sw * 1.2 + 6, -30 - lift); ctx.lineTo(s * 30 + sw * 1.2 + 26, -lift); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // loincloth of frozen hide
  ctx.fillStyle = fl ? '#fff' : '#3a4a5a';
  ctx.beginPath(); ctx.moveTo(-44, -96); ctx.lineTo(44, -96); ctx.lineTo(30, -62); ctx.lineTo(10, -70); ctx.lineTo(-6, -58); ctx.lineTo(-24, -70); ctx.lineTo(-38, -62); ctx.closePath(); ctx.fill();
  // torso
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
  // muscles
  ctx.strokeStyle = 'rgba(10,20,40,.35)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-40, -168); ctx.quadraticCurveTo(-20, -150, 0, -164); ctx.quadraticCurveTo(20, -150, 40, -168);
  ctx.moveTo(0, -160); ctx.lineTo(0, -100);
  for (let k = 0; k < 3; k++) { ctx.moveTo(-18, -140 + k * 14); ctx.lineTo(18, -140 + k * 14); }
  ctx.stroke();
  // glowing frost cracks
  const pulse = 0.5 + Math.sin(t * 2.4) * 0.35;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(140,230,255,${0.4 + pulse * 0.5})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-48, -176); ctx.lineTo(-36, -150); ctx.lineTo(-44, -128); ctx.lineTo(-30, -108);
  ctx.moveTo(30, -186); ctx.lineTo(40, -160); ctx.lineTo(28, -140);
  ctx.stroke();
  ctx.restore();
  // chains across the chest
  ctx.strokeStyle = fl ? '#fff' : '#a0a8b4';
  ctx.lineWidth = 4;
  ctx.setLineDash([9, 5]);
  ctx.beginPath(); ctx.moveTo(-58, -176); ctx.lineTo(40, -100); ctx.moveTo(58, -176); ctx.lineTo(-40, -100); ctx.stroke();
  ctx.setLineDash([]);
  // arms with shackles and broken chains
  const lift = stomp ? 40 : b.st === 'shards' ? 22 : 0;
  for (const s of [-1, 1]) {
    const hx = s * 86 + (s > 0 ? 10 : 0), hy = -92 - lift * (s > 0 ? 1.6 : 1.2);
    limb(ctx, [[s * 60, -172], [s * 84, -130 - lift], [hx, hy]], 26, s > 0 ? skin : skinD, 'rgba(10,20,40,.7)');
    ctx.fillStyle = fl ? '#fff' : '#5a6270';
    ctx.strokeStyle = '#a0a8b4';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(hx - s * 2, hy - 14, 15, 8, 0.3 * s, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(hx, hy - 10); ctx.quadraticCurveTo(hx + s * 14 + Math.sin(t * 3 + s) * 8, hy + 20, hx + s * 6 + Math.sin(t * 2.6 + s) * 14, hy + 44); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = s > 0 ? skin : skinD;
    ctx.strokeStyle = 'rgba(10,20,40,.7)';
    ell(ctx, hx, hy + 4, 16, 14); ctx.fill(); ctx.stroke();
    iceCluster(ctx, hx, hy - 4, 0.6, t, fl);
  }
  // shoulder ice
  iceCluster(ctx, -56, -184, 1.2, t, fl);
  iceCluster(ctx, 56, -186, 1.3, t, fl);
  // head
  ctx.fillStyle = skin;
  ctx.strokeStyle = 'rgba(10,20,40,.7)';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-14, -194); ctx.quadraticCurveTo(-16, -232, 12, -234); ctx.quadraticCurveTo(38, -232, 36, -200); ctx.quadraticCurveTo(30, -186, 12, -186); ctx.quadraticCurveTo(-8, -186, -14, -194); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = skinD;
  ctx.beginPath(); ctx.moveTo(-4, -216); ctx.lineTo(36, -214); ctx.lineTo(34, -208); ctx.lineTo(-2, -209); ctx.closePath(); ctx.fill();
  eye(ctx, 16, -211, 3, '#a8ecff', '#ffffff', 4);
  eye(ctx, 29, -211, 2.6, '#a8ecff', '#ffffff', 4);
  // mouth and icicle beard
  ctx.fillStyle = '#0a1420';
  ell(ctx, 22, -196, 9, breath ? 7 : 2.5); ctx.fill();
  if (breath) glow(ctx, 30, -196, 60, '#bff3ff', 0.7);
  for (let k = 0; k < 7; k++) {
    const x = 6 + k * 5, len = 12 + ((k * 5) % 7) * 3;
    const ig = ctx.createLinearGradient(0, -190, 0, -190 + len);
    ig.addColorStop(0, '#9fd4f5');
    ig.addColorStop(1, '#ffffff');
    ctx.fillStyle = ig;
    ctx.beginPath(); ctx.moveTo(x - 3, -190); ctx.lineTo(x, -190 + len); ctx.lineTo(x + 3, -190); ctx.fill();
  }
  // crown of ice spikes
  for (let k = 0; k < 5; k++) {
    const x = -6 + k * 9, h = 16 + (k === 2 ? 14 : (k % 2) * 6);
    const ig = ctx.createLinearGradient(0, -230, 0, -230 - h);
    ig.addColorStop(0, '#6ab8e8');
    ig.addColorStop(1, '#ffffff');
    ctx.fillStyle = ig;
    ctx.beginPath(); ctx.moveTo(x - 4, -228); ctx.lineTo(x + 1, -228 - h); ctx.lineTo(x + 5, -228); ctx.fill();
  }
  glow(ctx, 14, -246, 40, '#a8ecff', 0.25);
}

// ---------- Hades: Lord of the Dead, crowned in blue fire ----------
export function hades(ctx, b, t, fl) {
  ctx.translate(0, -b.h / 2 + Math.sin(t * 1.6) * 5);
  const rage = b.phase >= 3, cast = b.st !== 'idle' && b.st !== 'intro';
  const HAIR = rage ? ['#ff2a00', '#ff8a1a', '#fff3a0'] : ['#1a4aff', '#5fd8ff', '#e8fbff'];
  glow(ctx, 0, -20, 190, rage ? '#ff3a2a' : '#4a7bff', 0.28);
  // orbiting souls
  for (let i = 0; i < 7; i++) {
    const a = t * 0.9 + (i * TAU) / 7, x = Math.cos(a) * 110, y = Math.sin(a) * 52 - 10;
    glow(ctx, x, y, 18, '#9fe8ff', 0.55);
    ctx.fillStyle = 'rgba(220,250,255,.75)';
    ell(ctx, x, y, 5, 6); ctx.fill();
    ctx.fillStyle = 'rgba(10,30,50,.8)';
    ell(ctx, x - 1.8, y - 1, 1, 1.4); ctx.fill();
    ell(ctx, x + 1.8, y - 1, 1, 1.4); ctx.fill();
    ell(ctx, x, y + 2.4, 1.2, 1.6); ctx.fill();
  }
  // cloak
  const cloak = new Path2D();
  cloak.moveTo(-30, -56);
  cloak.bezierCurveTo(-70, -30, -86, 20, -78, 86);
  for (let k = 0; k <= 10; k++) cloak.lineTo(-78 + k * 15.6, 86 + Math.sin(t * 4 + k) * 8 + (k % 2) * 12);
  cloak.bezierCurveTo(86, 20, 70, -30, 30, -56);
  cloak.closePath();
  const cg = ctx.createLinearGradient(0, -60, 0, 90);
  cg.addColorStop(0, fl ? '#fff' : '#2a0a20');
  cg.addColorStop(1, fl ? '#fff' : '#050208');
  ctx.fillStyle = cg;
  ctx.fill(cloak);
  ctx.strokeStyle = fl ? '#fff' : '#7a1020';
  ctx.lineWidth = 3;
  ctx.stroke(cloak);
  // bident
  ctx.save();
  ctx.rotate(-0.08);
  ctx.strokeStyle = fl ? '#fff' : '#2a2430';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-50, 80); ctx.lineTo(-50, -150); ctx.stroke();
  ctx.strokeStyle = fl ? '#fff' : '#c9a24a';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-50, -120); ctx.lineTo(-64, -134); ctx.lineTo(-64, -170); ctx.moveTo(-50, -120); ctx.lineTo(-36, -134); ctx.lineTo(-36, -170); ctx.stroke();
  eye(ctx, -64, -172, 3, HAIR[1], '#fff', 5);
  eye(ctx, -36, -172, 3, HAIR[1], '#fff', 5);
  ctx.restore();
  // robe and armour
  ctx.fillStyle = fl ? '#fff' : '#120a14';
  ctx.beginPath(); ctx.moveTo(-24, -54); ctx.lineTo(24, -54); ctx.lineTo(40, 70); ctx.lineTo(-40, 70); ctx.closePath(); ctx.fill();
  const ag = ctx.createLinearGradient(-24, -60, 24, -10);
  ag.addColorStop(0, fl ? '#fff' : '#4a4458');
  ag.addColorStop(1, fl ? '#fff' : '#18141e');
  ctx.fillStyle = ag;
  ctx.strokeStyle = '#c9a24a';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-24, -56); ctx.lineTo(24, -56); ctx.lineTo(20, -12); ctx.lineTo(0, -2); ctx.lineTo(-20, -12); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -52); ctx.lineTo(0, -6); ctx.stroke();
  // skull buckle
  ctx.fillStyle = '#e8e0d0';
  ell(ctx, 0, -6, 6, 5.5); ctx.fill();
  eye(ctx, -2, -7, 1, '#ff2a3a', '#fff', 3);
  eye(ctx, 2, -7, 1, '#ff2a3a', '#fff', 3);
  // skull pauldrons
  for (const s of [-1, 1]) {
    ctx.fillStyle = fl ? '#fff' : '#d8d0c0';
    ctx.strokeStyle = '#4a3a2a';
    ctx.lineWidth = 1.5;
    ell(ctx, s * 30, -56, 15, 12, 0.3 * s); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1a0a10';
    ell(ctx, s * 30 - 5, -58, 3.4, 4); ctx.fill();
    ell(ctx, s * 30 + 5, -58, 3.4, 4); ctx.fill();
    eye(ctx, s * 30 - 5, -58, 1.3, '#ff3a2a', '#fff', 3);
    eye(ctx, s * 30 + 5, -58, 1.3, '#ff3a2a', '#fff', 3);
    ctx.fillStyle = '#c9a24a';
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(s * (22 + k * 7), -66); ctx.lineTo(s * (24 + k * 7), -80 - (k === 1 ? 5 : 0)); ctx.lineTo(s * (27 + k * 7), -66); ctx.fill(); }
  }
  // casting arm
  const ra = cast ? 1 : 0;
  limb(ctx, [[34, -50], [56, -34 - ra * 24], [70, -38 - ra * 40]], 9, fl ? '#fff' : '#1a0c1a', 'rgba(0,0,0,.6)');
  ctx.strokeStyle = '#e8e0d0';
  ctx.lineWidth = 2;
  for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(70, -38 - ra * 40); ctx.lineTo(74 + (k - 1.5) * 4, -50 - ra * 40); ctx.stroke(); }
  if (cast) {
    flame(ctx, 74, -46 - ra * 40, 22, 34, t, HAIR, 4, 4);
    glow(ctx, 74, -56 - ra * 40, 40, HAIR[1], 0.6);
  }
  // head
  const fg = ctx.createLinearGradient(0, -100, 0, -62);
  fg.addColorStop(0, fl ? '#fff' : '#c8d2e4');
  fg.addColorStop(1, fl ? '#fff' : '#7a86a0');
  ctx.fillStyle = fg;
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-14, -84); ctx.quadraticCurveTo(-15, -100, 0, -101); ctx.quadraticCurveTo(15, -100, 14, -84); ctx.quadraticCurveTo(10, -66, 0, -62); ctx.quadraticCurveTo(-10, -66, -14, -84); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#1a0a14';
  ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(-11, -90); ctx.lineTo(-2, -86); ctx.moveTo(11, -90); ctx.lineTo(2, -86); ctx.stroke();
  eye(ctx, -5.5, -84, 2.2, '#ff2a3a', '#fff', 4);
  eye(ctx, 5.5, -84, 2.2, '#ff2a3a', '#fff', 4);
  ctx.fillStyle = '#1a0a14';
  ctx.beginPath(); ctx.moveTo(-7, -72); ctx.quadraticCurveTo(0, -67, 7, -72); ctx.lineTo(5, -70); ctx.quadraticCurveTo(0, -68, -5, -70); ctx.closePath(); ctx.fill();
  teeth(ctx, -5, -71.5, 5, -71.5, 4, 1.8);
  // hair of fire and a dark crown
  flame(ctx, 0, -94, 54, 80 + (rage ? 30 : 0), t, HAIR, 3, 7);
  ctx.fillStyle = fl ? '#fff' : '#3a2a10';
  ctx.strokeStyle = '#c9a24a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-15, -96); ctx.lineTo(-12, -112); ctx.lineTo(-6, -100); ctx.lineTo(0, -118); ctx.lineTo(6, -100); ctx.lineTo(12, -112); ctx.lineTo(15, -96); ctx.closePath();
  ctx.fill(); ctx.stroke();
  eye(ctx, 0, -104, 2, '#ff2a3a', '#fff', 3);
}
