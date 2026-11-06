// Drawing: parallax backgrounds, the tile world, objects, lighting and the HUD.
import { G } from './state.js';
import { T, CS, CPX, getChunk, chunkCanvas, chunkMini, BIOMES, BIOME_LIST, SITES, LANDMARKS, levelAt, drawLiquids } from './world.js';
import { part } from './fx.js';

// Sparks and fumes thrown up by bubbles popping on lava and acid.
function liquidFx(kind, x, y) {
  if (G.scene !== 'play' && G.scene !== 'title') return;
  if (kind === 'lava') {
    for (let i = 0; i < 4; i++) part({ x, y, vx: rand(-60, 60), vy: rand(-260, -120), g: 700, life: rand(0.5, 0.9), size: rand(1.5, 2.8), color: Math.random() < 0.5 ? '#ffd34a' : '#ff7a1a', add: true });
    part({ x, y: y - 6, vx: rand(-10, 10), vy: rand(-40, -20), life: 1.6, size: 6, grow: 2.5, color: 'rgba(60,30,30,.25)' });
  } else {
    part({ x, y, vx: rand(-15, 15), vy: rand(-50, -25), life: 1.8, size: 5, grow: 2.2, color: 'rgba(170,255,110,.18)', add: true });
    for (let i = 0; i < 3; i++) part({ x, y, vx: rand(-50, 50), vy: rand(-140, -60), g: 500, life: 0.5, size: 1.6, color: '#d6ff9a' });
  }
}
import { hash2, rand, mix, rgba, shade, RAINBOW, clamp, TAU } from './util.js';
import { drawParts, drawFloaters } from './fx.js';
import { drawProjs, drawPickups, heartPath, starPath } from './combat.js';
import { drawUnicorn, drawBubbles, hornTip } from './player.js';
import { drawEnemy } from './enemies.js';
import { drawBoss, drawBossBar } from './bosses.js';
import { stats, WEAPONS, ownsWeapon } from './items.js';
import { objective, sealCount, interactLabel } from './main.js';

let lightCv = null, lctx = null;
const blobCache = new Map();

export function viewRect() {
  const s = G.scale;
  return { x0: G.cam.x, y0: G.cam.y, x1: G.cam.x + G.W / s, y1: G.cam.y + G.H / s };
}

export function render(ctx) {
  const { W, H, scale } = G;
  if (!lightCv) { lightCv = document.createElement('canvas'); lctx = lightCv.getContext('2d'); }
  const bg = G.bg;
  drawBackground(ctx, bg);
  const sh = G.cam.shake, shx = sh ? rand(-sh, sh) : 0, shy = sh ? rand(-sh, sh) : 0;
  const v = viewRect();
  const lights = [];
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-G.cam.x + shx / scale, -G.cam.y + shy / scale);

  // Tiles
  const c0x = Math.floor(v.x0 / CPX), c1x = Math.floor(v.x1 / CPX), c0y = Math.floor(v.y0 / CPX), c1y = Math.floor(v.y1 / CPX);
  let built = 0;
  const objs = [], liquids = [];
  for (let cy = c0y - 1; cy <= c1y + 1; cy++) for (let cx = c0x - 1; cx <= c1x + 1; cx++) {
    const c = getChunk(cx, cy);
    for (const o of c.objects) objs.push(o);
    if (cx < c0x || cx > c1x || cy < c0y || cy > c1y) continue;
    if (!c.canvas || c.dirty) { if (built >= 5 && !c.canvas) continue; built++; }
    ctx.drawImage(chunkCanvas(c), cx * CPX, cy * CPX, CPX + 0.6, CPX + 0.6);
    for (const l of c.lights) lights.push(l);
    if (c.liquids.length) liquids.push(...c.liquids);
  }
  drawLiquids(ctx, liquids, G.t, liquidFx);

  // Objects behind actors
  for (const o of objs) drawObject(ctx, o, G.t, lights);
  drawPickups(ctx);
  for (const e of G.enemies) {
    if (e.dead || e.x > v.x1 + 60 || e.x + e.w < v.x0 - 60 || e.y > v.y1 + 60 || e.y + e.h < v.y0 - 60) continue;
    drawEnemy(ctx, e, G.t);
    if (e.type === 'wisp') lights.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, r: 110, c: e.accent, a: 0.5 });
  }
  drawBoss(ctx, G.t);
  if (G.boss && !G.boss.dead) lights.push({ x: G.boss.x + G.boss.w / 2, y: G.boss.y + G.boss.h / 2, r: 420, c: G.boss.accent, a: 0.6 });
  const p = G.player;
  if (p && !p.dead) {
    drawUnicorn(ctx, p, G.t);
    const S = stats();
    lights.push({ x: p.x + p.w / 2, y: p.y + p.h / 2 - 10, r: S.light, c: '#fff4d0', a: 1 });
    const h = hornTip(p);
    lights.push({ x: h.x, y: h.y, r: 90, c: '#ffe9a0', a: 0.6 });
  }
  drawBubbles(ctx);
  for (const e of G.effects) if (e.draw) e.draw(ctx);
  drawParts(ctx, false);
  drawProjs(ctx);
  for (const b of G.projs) lights.push({ x: b.x, y: b.y, r: b.r * 9, c: b.color, a: 0.45 });
  drawParts(ctx, true);
  drawPrompt(ctx);
  drawFloaters(ctx);
  ctx.restore();

  // Lighting
  drawLighting(ctx, lights, bg, shx, shy);

  // Screen effects
  if (G.flash > 0) {
    ctx.fillStyle = `rgba(255,40,70,${G.flash * 0.6})`;
    ctx.fillRect(0, 0, W, H);
  }
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  if (G.scene !== 'title') drawHUD(ctx);
  if (G.fade > 0) {
    ctx.fillStyle = `rgba(0,0,0,${Math.min(1, G.fade)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// ---------- Background ----------
function drawBackground(ctx, bg) {
  const { W, H, scale } = G;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, bg.sky0);
  g.addColorStop(1, bg.sky1);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const layers = [
    { p: 0.08, cell: 760, col: mix(bg.far, bg.sky1, 0.45), seed: 1, glow: 1 },
    { p: 0.18, cell: 600, col: bg.far, seed: 2 },
    { p: 0.34, cell: 470, col: bg.mid, seed: 3 },
  ];
  for (const L of layers) {
    ctx.save();
    ctx.scale(scale, scale);
    const ox = G.cam.x * L.p, oy = G.cam.y * L.p;
    ctx.translate(-ox, -oy);
    const i0 = Math.floor(ox / L.cell) - 1, i1 = Math.floor((ox + W / scale) / L.cell) + 1;
    const j0 = Math.floor(oy / L.cell) - 1, j1 = Math.floor((oy + H / scale) / L.cell) + 1;
    ctx.fillStyle = L.col;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const path = blob(L, i, j);
      if (path) ctx.fill(path);
      if (L.glow && hash2(i, j, 77) > 0.82) {
        const gx = (i + hash2(i, j, 78)) * L.cell, gy = (j + hash2(i, j, 79)) * L.cell, r = L.cell * 0.5;
        const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
        rg.addColorStop(0, rgba(bg.accent, 0.16));
        rg.addColorStop(1, rgba(bg.accent, 0));
        ctx.fillStyle = rg;
        ctx.fillRect(gx - r, gy - r, r * 2, r * 2);
        ctx.fillStyle = L.col;
      }
    }
    ctx.restore();
    const fog = ctx.createLinearGradient(0, 0, 0, H);
    fog.addColorStop(0, rgba(bg.fog, 0.0));
    fog.addColorStop(1, rgba(bg.fog, 0.12));
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, W, H);
  }
  if (blobCache.size > 1500) blobCache.clear();
}

function blob(L, i, j) {
  const key = L.seed + ':' + i + ':' + j;
  if (blobCache.has(key)) return blobCache.get(key);
  let path = null;
  const h = hash2(i, j, L.seed * 31 + 5);
  if (h > 0.3) {
    path = new Path2D();
    const cx = (i + 0.5 + (hash2(i, j, L.seed + 40) - 0.5) * 0.5) * L.cell;
    const cy = (j + 0.5 + (hash2(i, j, L.seed + 41) - 0.5) * 0.5) * L.cell;
    if (h > 0.8) {
      // A pillar joining floor and ceiling
      const w = L.cell * (0.12 + 0.1 * hash2(i, j, L.seed + 42));
      path.moveTo(cx - w, cy - L.cell);
      for (let k = 0; k <= 8; k++) {
        const y = cy - L.cell + (k / 8) * L.cell * 2, pinch = 1 - Math.sin((k / 8) * Math.PI) * 0.45;
        path.lineTo(cx - w * pinch + (hash2(i, k, L.seed) - 0.5) * 20, y);
      }
      for (let k = 8; k >= 0; k--) {
        const y = cy - L.cell + (k / 8) * L.cell * 2, pinch = 1 - Math.sin((k / 8) * Math.PI) * 0.45;
        path.lineTo(cx + w * pinch + (hash2(k, j, L.seed) - 0.5) * 20, y);
      }
      path.closePath();
    } else {
      const r = L.cell * (0.22 + 0.25 * hash2(i, j, L.seed + 43)), n = 12;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU, rr = r * (0.65 + 0.45 * hash2(i * 13 + k, j, L.seed + 44));
        const px = cx + Math.cos(a) * rr * 1.25, py = cy + Math.sin(a) * rr;
        if (k) path.lineTo(px, py); else path.moveTo(px, py);
      }
      path.closePath();
      // hanging stalactites
      for (let k = 0; k < 3; k++) {
        const sx = cx + (k - 1) * r * 0.5, sy = cy + r * 0.8;
        path.moveTo(sx - 10, sy - 10);
        path.lineTo(sx, sy + r * 0.4 * hash2(i, j + k, L.seed + 45) + 10);
        path.lineTo(sx + 10, sy - 10);
      }
    }
  }
  blobCache.set(key, path);
  return path;
}

// ---------- Lighting ----------
function drawLighting(ctx, lights, bg, shx, shy) {
  const { W, H, scale } = G, D = 3;
  const lw = Math.ceil(W / D), lh = Math.ceil(H / D);
  if (lightCv.width !== lw || lightCv.height !== lh) { lightCv.width = lw; lightCv.height = lh; }
  lctx.globalCompositeOperation = 'source-over';
  lctx.clearRect(0, 0, lw, lh);
  lctx.fillStyle = `rgba(3,1,8,${bg.dark})`;
  lctx.fillRect(0, 0, lw, lh);
  lctx.globalCompositeOperation = 'destination-out';
  const toS = (x, y) => [((x - G.cam.x) * scale + shx) / D, ((y - G.cam.y) * scale + shy) / D];
  for (const l of lights) {
    const fl = l.flick ? 0.82 + 0.18 * Math.sin(G.t * 3.1 + l.x * 0.013) * Math.sin(G.t * 1.7 + l.x * 0.007) : 1;
    const [sx, sy] = toS(l.x, l.y), r = (l.r * scale * fl) / D, a = l.a * fl;
    if (sx < -r || sy < -r || sx > lw + r || sy > lh + r) continue;
    const g = lctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    g.addColorStop(0, `rgba(0,0,0,${a})`);
    g.addColorStop(0.5, `rgba(0,0,0,${a * 0.55})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g;
    lctx.fillRect(sx - r, sy - r, r * 2, r * 2);
  }
  ctx.drawImage(lightCv, 0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  for (const l of lights) {
    if (!l.c || l.r > 600) continue;
    const [sx, sy] = toS(l.x, l.y), r = (l.r * scale * 0.55);
    const x = sx * D, y = sy * D;
    if (x < -r || y < -r || x > W + r || y > H + r) continue;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(l.c.startsWith('#') ? l.c : '#ffffff', 0.13 * l.a));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
}

// ---------- Objects ----------
function drawObject(ctx, o, t, lights) {
  const S = G.save;
  switch (o.type) {
    case 'chest': {
      const open = S.chests[o.id];
      const w = o.big ? 44 : 34, h = o.big ? 30 : 24, gold = o.big ? '#ffd34a' : '#c99a3a', wood = o.big ? '#7a3a8a' : '#6a3f22';
      ctx.save();
      ctx.translate(o.x, o.y);
      if (!open) {
        const pulse = 0.5 + Math.sin(t * 3) * 0.5;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255,210,100,${0.08 + pulse * 0.08})`;
        ctx.beginPath(); ctx.arc(0, -h / 2, w, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.fillStyle = shade(wood, -0.3);
      ctx.fillRect(-w / 2, -h, w, h);
      ctx.fillStyle = wood;
      ctx.fillRect(-w / 2 + 2, -h + 2, w - 4, h - 4);
      ctx.fillStyle = gold;
      ctx.fillRect(-w / 2, -h, 4, h); ctx.fillRect(w / 2 - 4, -h, 4, h); ctx.fillRect(-w / 2, -h * 0.55, w, 3);
      if (open) {
        ctx.fillStyle = shade(wood, -0.45);
        ctx.fillRect(-w / 2, -h - 10, w, 10);
        ctx.fillStyle = 'rgba(0,0,0,.6)';
        ctx.fillRect(-w / 2 + 4, -h, w - 8, 5);
      } else {
        ctx.fillStyle = shade(wood, 0.12);
        ctx.beginPath(); ctx.moveTo(-w / 2, -h); ctx.quadraticCurveTo(0, -h - 14, w / 2, -h); ctx.fill();
        ctx.fillStyle = gold;
        ctx.fillRect(-4, -h * 0.65, 8, 9);
        lights.push({ x: o.x, y: o.y - h, r: 90, c: '#ffd34a', a: 0.4 });
      }
      ctx.restore();
      break;
    }
    case 'shrine': {
      const on = S.shrines[o.id];
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.fillStyle = '#3a3450';
      ctx.fillRect(-20, -10, 40, 10);
      const g = ctx.createLinearGradient(-12, 0, 12, 0);
      g.addColorStop(0, '#4a4266');
      g.addColorStop(0.5, '#7a70a0');
      g.addColorStop(1, '#3a3350');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-12, -10); ctx.lineTo(-9, -62); ctx.lineTo(9, -62); ctx.lineTo(12, -10); ctx.fill();
      ctx.fillStyle = on ? '#bff3ff' : '#5a5078';
      ctx.font = '700 14px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.fillText('Ω', 0, -30);
      const glow = on ? 0.8 + Math.sin(t * 3) * 0.2 : 0.25;
      const og = ctx.createRadialGradient(0, -74, 0, 0, -74, 16);
      og.addColorStop(0, on ? '#ffffff' : '#a090c0');
      og.addColorStop(0.5, on ? '#8fe8ff' : '#5a4a80');
      og.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = glow;
      ctx.fillStyle = og;
      ctx.beginPath(); ctx.arc(0, -74 + Math.sin(t * 2) * 3, 16, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      if (on && Math.random() < 0.15) G.parts.push({ x: o.x + rand(-10, 10), y: o.y - 60, vx: 0, vy: -40, life: 1, max: 1, size: 2, color: '#bff3ff', g: 0, drag: 0, add: true, shape: 'c', rot: 0, vr: 0, grow: 0 });
      ctx.restore();
      lights.push({ x: o.x, y: o.y - 70, r: on ? 240 : 110, c: '#8fe8ff', a: on ? 0.8 : 0.4 });
      break;
    }
    case 'torch': {
      const f = 0.85 + Math.sin(t * 13 + o.x) * 0.1 + Math.sin(t * 7.3) * 0.05;
      ctx.fillStyle = '#3a2a22';
      ctx.fillRect(o.x - 2, o.y - 34, 4, 34);
      ctx.fillStyle = '#5a4030';
      ctx.fillRect(o.x - 6, o.y - 36, 12, 4);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(o.x, o.y - 44, 0, o.x, o.y - 44, 14 * f);
      g.addColorStop(0, '#fff3b0');
      g.addColorStop(0.4, '#ff9a2e');
      g.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(o.x, o.y - 44, 8 * f, 14 * f, 0, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      lights.push({ x: o.x, y: o.y - 44, r: 210 * f, c: '#ff9a2e', a: 0.75 });
      break;
    }
    case 'shop': drawShop(ctx, o, t, lights); break;
    case 'npc': drawVirgil(ctx, o, t, lights); break;
    case 'gate': drawGate(ctx, o, t, lights); break;
    case 'fountain': drawFountain(ctx, o, t, lights); break;
    case 'sign': {
      ctx.fillStyle = '#4a3326';
      ctx.fillRect(o.x - 3, o.y - 46, 6, 46);
      ctx.font = '700 13px Cinzel, serif';
      const w = ctx.measureText(o.text).width + 20;
      ctx.fillStyle = '#6a4a34';
      ctx.fillRect(o.x - w / 2, o.y - 62, w, 22);
      ctx.strokeStyle = '#2a1a10';
      ctx.strokeRect(o.x - w / 2, o.y - 62, w, 22);
      ctx.fillStyle = '#f3e3c3';
      ctx.textAlign = 'center';
      ctx.fillText(o.text, o.x, o.y - 46);
      break;
    }
    case 'portal': {
      if (!S.bosses.hades) break;
      drawSwirl(ctx, o.x, o.y - 70, 46, t, ['#ffffff', '#ffe14a', '#8fe8ff']);
      lights.push({ x: o.x, y: o.y - 70, r: 300, c: '#ffe14a', a: 0.9 });
      break;
    }
  }
}

function drawSwirl(ctx, x, y, r, t, cols) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 18; i++) {
    const a = t * 2 + i * 0.7, rr = r * (0.3 + (i / 18) * 0.7);
    ctx.strokeStyle = cols[i % cols.length];
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, rr, a, a + 1.6);
    ctx.stroke();
  }
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, 'rgba(255,255,255,.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.globalAlpha = 0.5;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawShop(ctx, o, t, lights) {
  ctx.save();
  ctx.translate(o.x, o.y);
  if (o.main) {
    // stone base and pillars
    ctx.fillStyle = '#2e2840';
    ctx.fillRect(-130, -150, 260, 150);
    ctx.fillStyle = '#3d3556';
    for (let i = 0; i < 5; i++) for (let j = 0; j < 6; j++) ctx.fillRect(-128 + i * 52 + (j % 2) * 26, -148 + j * 25, 48, 21);
    ctx.fillStyle = '#1a1626';
    ctx.fillRect(-90, -110, 180, 110);
    // warm interior
    const ig = ctx.createLinearGradient(0, -110, 0, 0);
    ig.addColorStop(0, '#5a2a1a');
    ig.addColorStop(1, '#2a120a');
    ctx.fillStyle = ig;
    ctx.fillRect(-86, -106, 172, 106);
    // shelves of goods
    for (let s = 0; s < 2; s++) {
      ctx.fillStyle = '#4a2a18';
      ctx.fillRect(-80, -94 + s * 28, 160, 4);
      for (let k = 0; k < 9; k++) {
        ctx.fillStyle = RAINBOW[(k + s * 3) % 7];
        ctx.globalAlpha = 0.85;
        ctx.fillRect(-74 + k * 17, -106 + s * 28, 9, 12);
      }
    }
    ctx.globalAlpha = 1;
    // Charon
    const bob = Math.sin(t * 1.5) * 2;
    ctx.fillStyle = '#0e0a14';
    ctx.beginPath();
    ctx.moveTo(-22, -24); ctx.quadraticCurveTo(-24, -70 + bob, 0, -76 + bob); ctx.quadraticCurveTo(24, -70 + bob, 22, -24); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(0, -60 + bob, 10, 11, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8fe8ff';
    ctx.beginPath(); ctx.arc(-4, -62 + bob, 1.8, 0, TAU); ctx.arc(4, -62 + bob, 1.8, 0, TAU); ctx.fill();
    // oar
    ctx.strokeStyle = '#6a4a30';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(30, -10); ctx.lineTo(44, -100); ctx.stroke();
    ctx.fillStyle = '#6a4a30';
    ctx.beginPath(); ctx.ellipse(46, -108, 6, 14, 0.15, 0, TAU); ctx.fill();
    // counter
    ctx.fillStyle = '#5a3a22';
    ctx.fillRect(-96, -28, 192, 28);
    ctx.fillStyle = '#7a5232';
    ctx.fillRect(-100, -32, 200, 6);
    // awning
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i % 2 ? '#e8c26a' : '#6a2a8a';
      ctx.beginPath();
      ctx.moveTo(-140 + i * 28, -150); ctx.lineTo(-112 + i * 28, -150); ctx.lineTo(-112 + i * 28, -128); ctx.quadraticCurveTo(-126 + i * 28, -118, -140 + i * 28, -128);
      ctx.fill();
    }
    // sign
    ctx.fillStyle = '#2a1a10';
    ctx.fillRect(-110, -196, 220, 38);
    ctx.strokeStyle = '#e8c26a';
    ctx.lineWidth = 2;
    ctx.strokeRect(-106, -192, 212, 30);
    ctx.fillStyle = '#ffe9b0';
    ctx.font = '700 18px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText(o.name, 0, -170);
    // lanterns
    for (const lx of [-118, 118]) {
      const sw = Math.sin(t * 2 + lx) * 3;
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(lx, -150); ctx.lineTo(lx + sw, -128); ctx.stroke();
      ctx.fillStyle = '#ffcf6a';
      ctx.beginPath(); ctx.ellipse(lx + sw, -120, 7, 10, 0, 0, TAU); ctx.fill();
      lights.push({ x: o.x + lx + sw, y: o.y - 120, r: 200, c: '#ffb347', a: 0.8 });
    }
    lights.push({ x: o.x, y: o.y - 60, r: 260, c: '#ff9a4a', a: 0.7 });
  } else {
    // a merchant's cart
    ctx.fillStyle = '#4a2e1c';
    ctx.fillRect(-40, -34, 80, 26);
    ctx.fillStyle = '#2a1a10';
    for (const wx of [-26, 26]) { ctx.beginPath(); ctx.arc(wx, -8, 9, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = '#5a3a24';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-36, -34); ctx.lineTo(-36, -84); ctx.moveTo(36, -34); ctx.lineTo(36, -84); ctx.stroke();
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 ? '#e8c26a' : '#3a6a8a';
      ctx.beginPath(); ctx.moveTo(-46 + i * 18.4, -90); ctx.lineTo(-27.6 + i * 18.4, -90); ctx.lineTo(-27.6 + i * 18.4, -76); ctx.quadraticCurveTo(-36.8 + i * 18.4, -70, -46 + i * 18.4, -76); ctx.fill();
    }
    const bob = Math.sin(t * 1.6) * 1.5;
    ctx.fillStyle = '#16101e';
    ctx.beginPath(); ctx.moveTo(-14, -34); ctx.quadraticCurveTo(-14, -64 + bob, 0, -66 + bob); ctx.quadraticCurveTo(14, -64 + bob, 14, -34); ctx.fill();
    ctx.fillStyle = '#ffd34a';
    ctx.beginPath(); ctx.arc(-3, -54 + bob, 1.5, 0, TAU); ctx.arc(3, -54 + bob, 1.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffcf6a';
    ctx.beginPath(); ctx.ellipse(30, -70, 5, 7, 0, 0, TAU); ctx.fill();
    lights.push({ x: o.x + 30, y: o.y - 70, r: 220, c: '#ffb347', a: 0.8 });
  }
  ctx.restore();
}

function drawVirgil(ctx, o, t, lights) {
  const bob = Math.sin(t * 1.4) * 2;
  ctx.save();
  ctx.translate(o.x, o.y);
  const face = G.player && G.player.x < o.x ? -1 : 1;
  ctx.scale(face, 1);
  const g = ctx.createLinearGradient(0, -70, 0, 0);
  g.addColorStop(0, '#d8d0e8');
  g.addColorStop(1, '#8a80a8');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-16, 0); ctx.quadraticCurveTo(-18, -50 + bob, -8, -58 + bob); ctx.lineTo(8, -58 + bob); ctx.quadraticCurveTo(18, -50 + bob, 16, 0);
  ctx.fill();
  ctx.fillStyle = '#c94a5a';
  ctx.beginPath(); ctx.moveTo(-8, -56 + bob); ctx.lineTo(10, -30 + bob); ctx.lineTo(6, -56 + bob); ctx.fill();
  ctx.fillStyle = '#f0d8c0';
  ctx.beginPath(); ctx.ellipse(1, -66 + bob, 8, 9, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#4ea84e';
  for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.ellipse(-7 + k * 3, -73 + bob + Math.abs(k - 2.5) * 0.8, 3, 1.6, k * 0.5, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#2a1d3a';
  ctx.fillRect(4, -68 + bob, 2, 2);
  ctx.fillStyle = '#6a3a22';
  ctx.fillRect(8, -36 + bob, 12, 15);
  ctx.fillStyle = '#f3e3c3';
  ctx.fillRect(9, -35 + bob, 10, 13);
  ctx.restore();
  lights.push({ x: o.x, y: o.y - 50, r: 160, c: '#fff4d0', a: 0.6 });
  if (!G.save.talked && Math.floor(t * 2) % 2) {
    ctx.fillStyle = '#ffe14a';
    ctx.font = '900 26px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', o.x, o.y - 92 + bob);
  }
}

const SEAL_COLS = { cerberus: '#b6ff6b', storm: '#ff8ad8', heretic: '#ffb347', titan: '#a8ecff' };
function drawGate(ctx, o, t, lights) {
  const S = G.save, n = sealCount(), open = n >= 4;
  ctx.save();
  ctx.translate(o.x, o.y);
  // pillars and arch
  const sg = ctx.createLinearGradient(-130, 0, 130, 0);
  sg.addColorStop(0, '#2a2438');
  sg.addColorStop(0.5, '#4a4262');
  sg.addColorStop(1, '#221d30');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.moveTo(-130, 0); ctx.lineTo(-130, -200); ctx.arc(0, -200, 130, Math.PI, 0); ctx.lineTo(130, 0); ctx.lineTo(90, 0);
  ctx.lineTo(90, -200); ctx.arc(0, -200, 90, 0, Math.PI, true); ctx.lineTo(-90, 0); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.08)';
  ctx.lineWidth = 2;
  for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.moveTo(-130, -k * 24); ctx.lineTo(-90, -k * 24); ctx.moveTo(90, -k * 24); ctx.lineTo(130, -k * 24); ctx.stroke(); }
  // inner
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-90, 0); ctx.lineTo(-90, -200); ctx.arc(0, -200, 90, Math.PI, 0); ctx.lineTo(90, 0); ctx.closePath();
  ctx.clip();
  ctx.fillStyle = open ? '#2a0408' : '#0a0712';
  ctx.fillRect(-90, -290, 180, 290);
  if (open) {
    drawSwirl(ctx, 0, -150, 110, t, ['#ff3b4a', '#ff9a2e', '#ffffff', '#8a1020']);
  } else {
    ctx.strokeStyle = '#3a3050';
    ctx.lineWidth = 6;
    for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(k * 26, 0); ctx.lineTo(k * 26, -290); ctx.stroke(); }
  }
  ctx.restore();
  // inscription
  ctx.fillStyle = '#c9baff';
  ctx.font = '700 12px Cinzel, serif';
  ctx.textAlign = 'center';
  ctx.fillText('ABANDON ALL HOPE', 0, -318);
  // sockets
  SITES.slice(0, 4).forEach((s, i) => {
    const a = Math.PI + ((i + 0.5) / 4) * Math.PI, x = Math.cos(a) * 110, y = -200 + Math.sin(a) * 110;
    ctx.fillStyle = '#120e1c';
    ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.fill();
    if (S.bosses[s.id]) {
      ctx.fillStyle = SEAL_COLS[s.id];
      ctx.beginPath(); ctx.arc(x, y, 8 + Math.sin(t * 3 + i) * 1.5, 0, TAU); ctx.fill();
      lights.push({ x: o.x + x, y: o.y + y, r: 120, c: SEAL_COLS[s.id], a: 0.7 });
    }
  });
  ctx.restore();
  if (open) lights.push({ x: o.x, y: o.y - 150, r: 360, c: '#ff3b4a', a: 0.9 });
}

function drawFountain(ctx, o, t, lights) {
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.fillStyle = '#4a4262';
  ctx.beginPath(); ctx.ellipse(0, -10, 60, 14, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2a3a6a';
  ctx.beginPath(); ctx.ellipse(0, -14, 52, 9, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#5a5278';
  ctx.fillRect(-8, -60, 16, 48);
  ctx.beginPath(); ctx.ellipse(0, -60, 24, 6, 0, 0, TAU); ctx.fill();
  ctx.restore();
  if (Math.random() < 0.7) {
    const c = RAINBOW[Math.floor(Math.random() * 7)], a = -Math.PI / 2 + rand(-0.6, 0.6);
    G.parts.push({ x: o.x, y: o.y - 66, vx: Math.cos(a) * 120, vy: Math.sin(a) * 220, life: 1, max: 1, size: 2.5, color: c, g: 500, drag: 0, add: true, shape: 'c', rot: 0, vr: 0, grow: 0 });
  }
  lights.push({ x: o.x, y: o.y - 50, r: 180, c: '#8fe8ff', a: 0.6 });
}

function drawPrompt(ctx) {
  const n = G.near;
  if (!n || G.scene !== 'play') return;
  const label = interactLabel(n);
  if (!label) return;
  const y = n.y - (n.type === 'shop' && n.main ? 210 : n.type === 'gate' ? 340 : n.type === 'npc' ? 104 : 96) + Math.sin(G.t * 4) * 3;
  ctx.font = '800 14px Nunito, sans-serif';
  const text = label, w = ctx.measureText(text).width + 44;
  ctx.fillStyle = 'rgba(10,6,20,.8)';
  roundRect(ctx, n.x - w / 2, y - 18, w, 28, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.25)';
  ctx.stroke();
  ctx.fillStyle = '#ffe14a';
  roundRect(ctx, n.x - w / 2 + 6, y - 13, 20, 18, 4);
  ctx.fill();
  ctx.fillStyle = '#1a1020';
  ctx.textAlign = 'center';
  ctx.fillText('E', n.x - w / 2 + 16, y + 1);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.fillText(text, n.x - w / 2 + 32, y + 1);
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------- HUD ----------
function drawHUD(ctx) {
  const { W, H } = G, p = G.player, S = stats(), save = G.save;
  if (!p) return;
  // hearts
  for (let i = 0; i < S.maxHp; i++) {
    ctx.save();
    ctx.translate(30 + i * 30, 30);
    heartPath(ctx, 11);
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.fill();
    if (i < p.hp) {
      const g = ctx.createLinearGradient(0, -10, 0, 10);
      g.addColorStop(0, '#ff8aa6');
      g.addColorStop(1, '#e0284e');
      ctx.fillStyle = g;
      if (p.hp <= 2 && Math.floor(G.t * 4) % 2) ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.stroke();
    ctx.restore();
  }
  // gems and potions
  ctx.font = '800 20px Nunito, sans-serif';
  ctx.textAlign = 'left';
  gemIcon(ctx, 30, 66, 9);
  hudText(ctx, save.gems.toLocaleString(), 46, 73);
  ctx.save();
  ctx.translate(30, 98);
  ctx.fillStyle = '#e8b04a';
  ctx.beginPath(); ctx.ellipse(0, 2, 8, 9, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#8a5a2a';
  ctx.fillRect(-4, -11, 8, 5);
  ctx.restore();
  ctx.font = '800 16px Nunito, sans-serif';
  hudText(ctx, '×' + save.potions + '  (H)', 46, 105);
  // seals
  SITES.slice(0, 4).forEach((s, i) => {
    const x = 34 + i * 24, y = 132;
    ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU);
    ctx.fillStyle = save.bosses[s.id] ? SEAL_COLS[s.id] : 'rgba(0,0,0,.45)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // weapons
  const by = H - 96;
  WEAPONS.forEach((w, i) => {
    const x = 24 + i * 58, sel = save.weapon === i, own = ownsWeapon(i);
    ctx.fillStyle = sel ? 'rgba(255,225,74,.18)' : 'rgba(10,6,20,.6)';
    roundRect(ctx, x, by, 50, 50, 10);
    ctx.fill();
    ctx.strokeStyle = sel ? '#ffe14a' : 'rgba(255,255,255,.2)';
    ctx.lineWidth = sel ? 2.5 : 1.5;
    ctx.stroke();
    ctx.globalAlpha = own ? 1 : 0.25;
    weaponIcon(ctx, w.id, x + 25, by + 25);
    ctx.globalAlpha = 1;
    ctx.font = '800 11px Nunito, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.textAlign = 'left';
    ctx.fillText(own ? w.key : '🔒', x + 5, by + 14);
    if (w.id === 'blast' && p.blastCd > 0) {
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      const k = clamp(p.blastCd / S.blastCd, 0, 1);
      ctx.fillRect(x + 2, by + 50 - 48 * k, 46, 48 * k);
    }
  });
  // auto-attack badge
  ctx.font = '900 12px Nunito, sans-serif';
  ctx.textAlign = 'left';
  const auto = save.autofire;
  ctx.fillStyle = auto ? 'rgba(255,225,74,.9)' : 'rgba(10,6,20,.6)';
  roundRect(ctx, 24, by + 58, 134, 22, 6);
  ctx.fill();
  ctx.fillStyle = auto ? '#1a1020' : 'rgba(255,255,255,.55)';
  ctx.fillText(auto ? 'V  AUTO-ATTACK ON' : 'V  auto-attack: off', 32, by + 73);
  // bubble charge
  const bx = 24 + 4 * 58 + 30, byc = by + 25, k = clamp(p.charge / S.bubbleT, 0, 1);
  ctx.beginPath(); ctx.arc(bx, byc, 22, 0, TAU);
  ctx.fillStyle = 'rgba(10,6,20,.6)';
  ctx.fill();
  ctx.strokeStyle = k >= 1 ? '#bff3ff' : 'rgba(191,243,255,.5)';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(bx, byc, 20, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
  ctx.fillStyle = k >= 1 ? '#ffffff' : 'rgba(255,255,255,.5)';
  ctx.font = '900 14px Nunito, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('B', bx, byc + 5);
  if (k >= 1 && Math.floor(G.t * 3) % 2) { ctx.strokeStyle = 'rgba(191,243,255,.5)'; ctx.beginPath(); ctx.arc(bx, byc, 26, 0, TAU); ctx.stroke(); }
  if (save.up.beam) {
    ctx.fillStyle = 'rgba(10,6,20,.6)';
    ctx.fillRect(24, by - 16, 222, 8);
    const g = ctx.createLinearGradient(24, 0, 246, 0);
    RAINBOW.forEach((c, i) => g.addColorStop(i / 6, c));
    ctx.fillStyle = g;
    ctx.fillRect(24, by - 16, 222 * (p.energy / 100), 8);
  }

  drawMinimap(ctx);
  drawBossBar(ctx, W, H);

  // Region announcement
  const a = G.announce;
  if (a.t > 0) {
    const alpha = Math.min(1, a.t, (a.dur - a.t) * 2 + 0.01);
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.textAlign = 'center';
    ctx.font = `900 ${Math.min(64, W / 14)}px "Cinzel Decorative", Cinzel, serif`;
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.strokeText(a.title, W / 2, H * 0.28);
    ctx.fillStyle = '#fff3e0';
    ctx.fillText(a.title, W / 2, H * 0.28);
    ctx.font = `700 ${Math.min(22, W / 40)}px Cinzel, serif`;
    ctx.fillStyle = '#d8c8ff';
    ctx.fillText(a.sub, W / 2, H * 0.28 + 36);
    ctx.globalAlpha = 1;
  }
}

function hudText(ctx, text, x, y) {
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x, y);
}

function gemIcon(ctx, x, y, s) {
  ctx.fillStyle = '#ff6fb5';
  ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.85, y - s * 0.2); ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.85, y - s * 0.2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.35, y - s * 0.2); ctx.lineTo(x, y); ctx.lineTo(x - s * 0.35, y - s * 0.2); ctx.fill();
}

export function weaponIcon(ctx, id, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  if (id === 'whip') {
    RAINBOW.forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(-4, 8, 10 + i * 1.8, -1.9, -0.2); ctx.stroke(); });
  } else if (id === 'blast') {
    ctx.fillStyle = '#ffffff';
    starPath(ctx, 14, 6);
    ctx.fill();
    ctx.strokeStyle = '#ff9a2e';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (id === 'stars') {
    ctx.fillStyle = '#ffe14a';
    starPath(ctx, 12, 5);
    ctx.fill();
    ctx.fillStyle = '#ff9ad6';
    ctx.translate(9, 9);
    starPath(ctx, 6, 2.5);
    ctx.fill();
  } else if (id === 'beam') {
    RAINBOW.forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-14, 10 - i * 1.6 + 5); ctx.lineTo(14, -10 - i * 1.6 + 5); ctx.stroke(); });
  }
  ctx.restore();
}

function drawMinimap(ctx) {
  const { W } = G, R = 82, mx = W - R - 22, my = R + 22, ppt = 2;
  const p = G.player, ptx = (p.x + p.w / 2) / T, pty = (p.y + p.h / 2) / T;
  ctx.save();
  ctx.beginPath(); ctx.arc(mx, my, R, 0, TAU);
  ctx.fillStyle = 'rgba(6,3,12,.75)';
  ctx.fill();
  ctx.clip();
  ctx.imageSmoothingEnabled = false;
  const span = R / ppt / CS + 1;
  const pcx = Math.floor(ptx / CS), pcy = Math.floor(pty / CS);
  for (let cy = pcy - Math.ceil(span); cy <= pcy + Math.ceil(span); cy++) for (let cx = pcx - Math.ceil(span); cx <= pcx + Math.ceil(span); cx++) {
    if (!G.save.explored[cx + ',' + cy]) continue;
    const c = G.chunks.get(cx + ',' + cy);
    if (!c) continue;
    ctx.drawImage(chunkMini(c), mx + (cx * CS - ptx) * ppt, my + (cy * CS - pty) * ppt, CS * ppt, CS * ppt);
  }
  ctx.imageSmoothingEnabled = true;
  // landmarks
  for (const l of LANDMARKS) {
    const x = mx + (l.tx - ptx) * ppt, y = my + (l.ty - 1 - pty) * ppt;
    if (Math.hypot(x - mx, y - my) > R) continue;
    if (l.type === 'shrine' && !G.save.shrines[l.id]) continue;
    const col = l.type === 'shop' ? '#ffd34a' : l.type === 'shrine' ? '#8fe8ff' : l.type === 'gate' ? '#ff4a5a' : null;
    if (!col || l.hidden) continue;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, y, 3.5, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(mx, my, 3.5, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(mx, my, R, 0, TAU); ctx.stroke();
  // objective arrow
  const obj = objective();
  if (obj) {
    const dx = obj.tx - ptx, dy = obj.ty - pty, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const ax = mx + Math.cos(a) * (R - 8), ay = my + Math.sin(a) * (R - 8);
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(a);
    ctx.fillStyle = obj.color;
    ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-6, -7); ctx.lineTo(-3, 0); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.font = '700 12px Nunito, sans-serif';
    ctx.textAlign = 'center';
    hudTextSmall(ctx, obj.label + ' · ' + Math.round(d) + 'm', mx, my + R + 34, obj.color);
  }
  const B = BIOMES[BIOME_LIST[G.biome]];
  ctx.font = '700 14px Cinzel, serif';
  ctx.textAlign = 'center';
  const lv = levelAt(Math.round(ptx), Math.round(pty));
  hudTextSmall(ctx, B.name + '  ·  Danger ' + lv, mx, my + R + 18, '#f3e7ff');
  ctx.font = '700 11px Nunito, sans-serif';
  hudTextSmall(ctx, 'M — map', mx, my + R + 50, 'rgba(255,255,255,.5)');
}

function hudTextSmall(ctx, text, x, y, col) {
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,.7)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = col;
  ctx.fillText(text, x, y);
}

// ---------- Full map ----------
export function mapToScreen(tx, ty) {
  const z = G.map.zoom;
  return [G.W / 2 + (tx - G.map.x) * z, G.H / 2 + (ty - G.map.y) * z];
}

export function drawMap(ctx) {
  const { W, H } = G, z = G.map.zoom;
  ctx.fillStyle = 'rgba(6,3,12,.94)';
  ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = false;
  const tx0 = G.map.x - W / 2 / z, ty0 = G.map.y - H / 2 / z, tx1 = G.map.x + W / 2 / z, ty1 = G.map.y + H / 2 / z;
  for (const k in G.save.explored) {
    const [cx, cy] = k.split(',').map(Number);
    if ((cx + 1) * CS < tx0 || cx * CS > tx1 || (cy + 1) * CS < ty0 || cy * CS > ty1) continue;
    const [sx, sy] = mapToScreen(cx * CS, cy * CS);
    ctx.drawImage(chunkMini(getChunk(cx, cy)), sx, sy, CS * z + 0.5, CS * z + 0.5);
  }
  ctx.imageSmoothingEnabled = true;
  // bosses (always shown so the player has goals)
  SITES.forEach((s, i) => {
    if (i === 4) return;
    const [x, y] = mapToScreen(s.tx, s.ty);
    const done = G.save.bosses[s.id];
    ctx.fillStyle = done ? '#7a7a8a' : SEAL_COLS[s.id];
    ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.fill();
    ctx.fillStyle = '#120a18';
    ctx.font = '900 13px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(done ? '✓' : '☠', x, y + 5);
    ctx.font = '700 13px Cinzel, serif';
    hudTextSmall(ctx, s.name, x, y - 18, done ? '#9a9aaa' : '#ffffff');
  });
  for (const l of LANDMARKS) {
    if (l.hidden) continue;
    const [x, y] = mapToScreen(l.tx, l.ty - 1);
    if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue;
    if (l.type === 'shop') { ctx.fillStyle = '#ffd34a'; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill(); }
    if (l.type === 'gate') { ctx.fillStyle = '#ff4a5a'; ctx.fillRect(x - 6, y - 8, 12, 12); ctx.font = '700 12px Cinzel, serif'; hudTextSmall(ctx, 'The Gate', x, y - 14, '#ff8a9a'); }
  }
  // shrines (discovered ones, including random ones)
  for (const id in G.save.shrines) {
    const s = shrinePos(id);
    if (!s) continue;
    const [x, y] = mapToScreen(s.x / T, s.y / T - 1);
    const hover = Math.hypot(x - G.mouseX, y - G.mouseY) < 12;
    ctx.fillStyle = hover ? '#ffffff' : '#8fe8ff';
    ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + 7, y); ctx.lineTo(x, y + 9); ctx.lineTo(x - 7, y); ctx.closePath(); ctx.fill();
    if (hover) { ctx.font = '700 13px Nunito, sans-serif'; hudTextSmall(ctx, 'Travel to ' + (s.name || 'Shrine'), x, y - 16, '#ffffff'); }
  }
  const p = G.player;
  const [px, py] = mapToScreen((p.x + p.w / 2) / T, (p.y + p.h / 2) / T);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(px, py, 6 + Math.sin(G.t * 5) * 1.5, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#ff6fb5';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.font = '900 30px "Cinzel Decorative", Cinzel, serif';
  hudTextSmall(ctx, 'Map of the Underworld', W / 2, 46, '#f3e7ff');
  ctx.font = '700 14px Nunito, sans-serif';
  hudTextSmall(ctx, 'Drag to pan · Wheel to zoom · Click a shrine to travel · M or Esc to close', W / 2, H - 24, 'rgba(255,255,255,.7)');
}

export function shrinePos(id) {
  const l = LANDMARKS.find(l => l.id === id);
  if (l) return l;
  const [k] = id.split(':');
  const [cx, cy] = k.split(',').map(Number);
  if (isNaN(cx)) return null;
  return getChunk(cx, cy).objects.find(o => o.id === id) || null;
}
