// Drawing: parallax backgrounds, the tile world, objects, lighting and the HUD.
import { G } from './state.js';
import { T, CS, CPX, getChunk, chunkCanvas, chunkMini, BIOMES, BIOME_LIST, SITES, LANDMARKS, levelAt, HEAVEN_LVL, drawLiquids, GODS } from './world.js';
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
import { hash2, rand, mix, rgba, shade, RAINBOW, clamp, TAU, pick } from './util.js';
import { drawParts, drawFloaters } from './fx.js';
import { drawProjs, drawPickups, heartPath, starPath } from './combat.js';
import { drawAngel, drawBubbles, hornTip } from './player.js';
import { drawEnemy } from './enemies.js';
import { drawBoss, drawBossBar } from './bosses.js';
import { stats, WEAPONS, ownsWeapon, worn, ARMOURS, armourKnown } from './items.js';
import { devLabel } from './dev.js';
import { objective, sealCount, sigilCount, interactLabel } from './main.js';
import { lightning, EMIT, drawEmissive } from './art.js';

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
  EMIT.list.length = 0;
  EMIT.on = true;

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
    if (e.type === 'wisp' || e.type === 'seraph' || e.type === 'ophan') lights.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, r: 110, c: e.type === 'seraph' ? '#ffb347' : e.accent, a: 0.5 });
    else lights.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, r: 46 + e.w, c: e.accent, a: 0.3 });
  }
  drawBoss(ctx, G.t);
  if (G.boss && !G.boss.dead) lights.push({ x: G.boss.x + G.boss.w / 2, y: G.boss.y + G.boss.h / 2, r: 420, c: G.boss.accent, a: 0.6 });
  const p = G.player;
  if (p && !p.dead) {
    drawAngel(ctx, p, G.t);
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
  EMIT.on = false;
  drawFloaters(ctx);
  ctx.restore();

  // Lighting
  drawLighting(ctx, lights, bg, shx, shy);
  drawEmissive(ctx, clamp(bg.dark * 1.7, 0.2, 1));

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
  const hv = bg.heaven || 0;
  if (hv > 0.01) drawHeaven(ctx, bg, hv);
  for (const L of layers) {
    if (hv > 0.99) break;
    ctx.save();
    ctx.globalAlpha = 1 - hv;
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
  if (hv > 0.01) drawHeavenClouds(ctx, bg, hv);
  if (blobCache.size > 1500) blobCache.clear();
}

// Olympus: a sun with slow rays (or, on the summit, a storm), distant temples and banks of cloud.
function drawHeaven(ctx, bg, hv) {
  const { W, H } = G;
  ctx.save();
  ctx.globalAlpha = hv;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, bg.sky0);
  g.addColorStop(1, bg.sky1);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const sun = bg.sun || 0, storm = bg.storm || 0;
  if (sun > 0.01) {
    const sx = W * 0.78, sy = H * 0.2;
    ctx.globalCompositeOperation = 'lighter';
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(G.t * 0.03);
    for (let i = 0; i < 14; i++) {
      ctx.rotate(TAU / 14);
      const rg = ctx.createLinearGradient(0, 0, H, 0);
      rg.addColorStop(0, `rgba(255,240,190,${0.16 * sun})`);
      rg.addColorStop(1, 'rgba(255,240,190,0)');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(H, -H * 0.09); ctx.lineTo(H, H * 0.09); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, H * 0.35);
    sg.addColorStop(0, `rgba(255,255,240,${sun})`);
    sg.addColorStop(0.12, `rgba(255,246,200,${0.8 * sun})`);
    sg.addColorStop(1, 'rgba(255,230,160,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(sx - H * 0.35, sy - H * 0.35, H * 0.7, H * 0.7);
    ctx.globalCompositeOperation = 'source-over';
  }
  const moon = bg.moon || 0;
  if (moon > 0.01) {
    // the Silver Peaks lie under a night of stars and a silver crescent
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 90; i++) {
      const x = ((hash2(i, 0, 401) * W - G.cam.x * 0.005) % W + W) % W, y = hash2(i, 1, 402) * H * 0.75;
      ctx.globalAlpha = hv * moon * (0.35 + 0.5 * Math.abs(Math.sin(G.t * (0.6 + hash2(i, 2, 403)) + i)));
      ctx.fillRect(x, y, 1.6, 1.6);
    }
    ctx.globalAlpha = hv;
  }
  if (storm > 0.01 && Math.random() < 0.012 * storm) {
    G.skyFlash = 1;
    const x = Math.random() * W;
    lightning(ctx, x, 0, x + (Math.random() - 0.5) * 300, H * 0.6, '#dfe6ff', 2.5, 12, 50);
  }
  if (G.skyFlash > 0) {
    ctx.fillStyle = `rgba(220,230,255,${G.skyFlash * 0.25 * storm})`;
    ctx.fillRect(0, 0, W, H);
    G.skyFlash = Math.max(0, G.skyFlash - 0.08);
  }
  // distant temples on far-off cloud islands
  ctx.save();
  ctx.scale(G.scale, G.scale);
  const p = 0.04, ox = G.cam.x * p, oy = G.cam.y * p, cell = 900;
  ctx.translate(-ox, -oy);
  const i0 = Math.floor(ox / cell) - 1, i1 = Math.floor((ox + W / G.scale) / cell) + 1;
  ctx.fillStyle = mix(bg.far, bg.sky1, 0.35);
  for (let i = i0; i <= i1; i++) {
    if (hash2(i, 0, 61) < 0.45) continue;
    const x = (i + hash2(i, 1, 62)) * cell, y = (H / G.scale) * 0.55 + oy + (hash2(i, 2, 63) - 0.5) * 120, w = 140 + hash2(i, 3, 64) * 120;
    ctx.fillRect(x - w / 2 - 14, y, w + 28, 10);
    for (let c = 0; c < 6; c++) ctx.fillRect(x - w / 2 + (c / 5) * (w - 12), y - 70, 12, 70);
    ctx.fillRect(x - w / 2 - 8, y - 84, w + 16, 14);
    ctx.beginPath(); ctx.moveTo(x - w / 2 - 12, y - 84); ctx.lineTo(x, y - 120); ctx.lineTo(x + w / 2 + 12, y - 84); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y + 18, w * 0.9, 26, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

const cloudCache = new Map();
function cloudPath(seed, i, j, cell) {
  const key = seed + ':' + i + ':' + j;
  if (cloudCache.has(key)) return cloudCache.get(key);
  let path = null;
  if (hash2(i, j, seed * 17 + 3) > 0.35) {
    path = new Path2D();
    const cx = (i + 0.5 + (hash2(i, j, seed + 50) - 0.5) * 0.6) * cell, cy = (j + 0.5 + (hash2(i, j, seed + 51) - 0.5) * 0.4) * cell;
    const w = cell * (0.45 + 0.4 * hash2(i, j, seed + 52)), n = 7;
    for (let k = 0; k < n; k++) {
      const u = k / (n - 1), r = w * (0.12 + 0.1 * Math.sin(u * Math.PI)) * (0.8 + 0.4 * hash2(i * 7 + k, j, seed + 53));
      const x = cx - w / 2 + u * w, y = cy - Math.sin(u * Math.PI) * w * 0.1;
      path.moveTo(x + r, y);
      path.arc(x, y, r, 0, TAU);
    }
    path.rect(cx - w / 2, cy, w, w * 0.12);
  }
  cloudCache.set(key, path);
  if (cloudCache.size > 1200) cloudCache.clear();
  return path;
}

// The silver crescent of the Silver Peaks, drawn in front of the far clouds so it shines through.
function drawMoon(ctx, bg, hv) {
  const { W, H } = G, moon = (bg.moon || 0) * hv;
  if (moon < 0.01) return;
  ctx.save();
  ctx.globalAlpha = moon;
  const mx = W * 0.24, my = H * 0.2, mr = H * 0.07;
  ctx.globalCompositeOperation = 'lighter';
  const mg = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 4);
  mg.addColorStop(0, 'rgba(200,215,255,.35)');
  mg.addColorStop(1, 'rgba(200,215,255,0)');
  ctx.fillStyle = mg;
  ctx.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#f4f7ff';
  ctx.shadowColor = 'rgba(210,225,255,.9)';
  ctx.shadowBlur = mr * 0.6;
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, TAU);
  ctx.moveTo(mx + mr * 0.5 + mr * 0.82, my - mr * 0.28);
  ctx.arc(mx + mr * 0.5, my - mr * 0.28, mr * 0.82, 0, TAU);
  ctx.fill('evenodd');
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawHeavenClouds(ctx, bg, hv) {
  const { W, H, scale } = G;
  const layers = [
    { p: 0.06, cell: 820, seed: 1, col: mix(bg.far, '#ffffff', 0.3), a: 0.55 },
    { p: 0.14, cell: 640, seed: 2, col: mix(bg.far, '#ffffff', 0.55), a: 0.7 },
    { p: 0.28, cell: 500, seed: 3, col: mix(bg.mid, '#ffffff', 0.7), a: 0.8 },
  ];
  for (const L of layers) {
    ctx.save();
    ctx.globalAlpha = hv * L.a;
    ctx.scale(scale, scale);
    const drift = G.t * 6 * L.p * 10, ox = G.cam.x * L.p + drift, oy = G.cam.y * L.p;
    ctx.translate(-ox, -oy);
    const i0 = Math.floor(ox / L.cell) - 1, i1 = Math.floor((ox + W / scale) / L.cell) + 1;
    const j0 = Math.floor(oy / L.cell) - 1, j1 = Math.floor((oy + H / scale) / L.cell) + 1;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const path = cloudPath(L.seed, i, j, L.cell);
      if (!path) continue;
      ctx.fillStyle = shade(L.col, -0.12);
      ctx.save(); ctx.translate(0, 10); ctx.fill(path); ctx.restore();
      ctx.fillStyle = L.col;
      ctx.fill(path);
    }
    ctx.restore();
  }
  drawMoon(ctx, bg, hv);
  // the Cloudlands: a soft veil of mist over everything far away
  const mist = (bg.mist || 0) * hv;
  if (mist > 0.01) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgba(bg.fog, 0.18 * mist));
    g.addColorStop(0.6, rgba(bg.fog, 0.32 * mist));
    g.addColorStop(1, rgba('#ffffff', 0.45 * mist));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
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
    case 'armourer': drawArmourer(ctx, o, t, lights); break;
    case 'npc': if (o.id === 'iris') drawIris(ctx, o, t, lights); else drawVirgil(ctx, o, t, lights); break;
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
      if (o.id === 'portal_down') {
        drawSwirl(ctx, o.x, o.y - 70, 40, t, ['#ff3b4a', '#8a1020', '#c9baff']);
        lights.push({ x: o.x, y: o.y - 70, r: 220, c: '#ff6a7a', a: 0.6 });
        break;
      }
      if (o.id === 'portal_zeus' ? !S.bosses.zeus : !S.bosses.hades) break;
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

// An armourer's forge: a smithy with a roaring furnace, an anvil, the smith at work, and a stand
// showing off each armour that can be forged here in turn.
function drawArmourer(ctx, o, t, lights) {
  ctx.save();
  ctx.translate(o.x, o.y);
  const oly = !!o.oly;
  // walls, roof and chimney
  ctx.fillStyle = oly ? '#d8d0bc' : '#2b2433';
  ctx.fillRect(-100, -120, 200, 120);
  ctx.fillStyle = oly ? '#efe8d6' : '#3a3046';
  for (let j = 0; j < 5; j++) for (let i = 0; i < 4; i++) ctx.fillRect(-98 + i * 50 + (j % 2) * 25, -118 + j * 24, 46, 20);
  ctx.fillStyle = oly ? '#9aa6c8' : '#1d1824';
  ctx.fillRect(48, -176, 30, 60);
  ctx.fillStyle = oly ? '#b8c2de' : '#2a2232';
  ctx.fillRect(44, -182, 38, 10);
  ctx.fillStyle = oly ? '#5a6aa8' : '#4a1e1a';
  ctx.beginPath(); ctx.moveTo(-116, -118); ctx.lineTo(0, -160); ctx.lineTo(116, -118); ctx.closePath(); ctx.fill();
  // smoke from the chimney
  for (let k = 0; k < 4; k++) {
    const u = ((t * 0.35 + k / 4) % 1), r = 8 + u * 18;
    ctx.fillStyle = `rgba(${oly ? '255,255,255' : '90,80,90'},${0.35 * (1 - u)})`;
    ctx.beginPath(); ctx.arc(63 + Math.sin(t + k * 2) * 6 + u * 14, -186 - u * 90, r, 0, TAU); ctx.fill();
  }
  // the furnace: an arch of fire
  const fl = 0.8 + Math.sin(t * 9) * 0.1 + Math.sin(t * 23) * 0.06;
  ctx.fillStyle = '#120a0a';
  ctx.beginPath(); ctx.moveTo(-82, -6); ctx.lineTo(-82, -60); ctx.arc(-52, -60, 30, Math.PI, 0); ctx.lineTo(-22, -6); ctx.closePath(); ctx.fill();
  const fg = ctx.createRadialGradient(-52, -30, 4, -52, -30, 40);
  fg.addColorStop(0, `rgba(255,240,170,${fl})`);
  fg.addColorStop(0.4, `rgba(255,140,40,${fl})`);
  fg.addColorStop(1, 'rgba(160,30,10,0.2)');
  ctx.fillStyle = fg;
  ctx.beginPath(); ctx.moveTo(-76, -6); ctx.lineTo(-76, -58); ctx.arc(-52, -58, 24, Math.PI, 0); ctx.lineTo(-28, -6); ctx.closePath(); ctx.fill();
  lights.push({ x: o.x - 52, y: o.y - 34, r: 230 + fl * 30, c: '#ff8a2a', a: 0.85 });
  // the armour stand cycles through every suit this forge can make
  const list = ARMOURS.filter(armourKnown), A = list[Math.floor(t / 3) % list.length];
  if (A) {
    const [m0, m1, m2] = A.look.metal;
    ctx.strokeStyle = '#5a3a22'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(62, -2); ctx.lineTo(62, -58); ctx.moveTo(48, -2); ctx.lineTo(76, -2); ctx.stroke();
    const g = ctx.createLinearGradient(0, -82, 0, -46);
    g.addColorStop(0, m0); g.addColorStop(0.5, m1); g.addColorStop(1, m2);
    ctx.fillStyle = g;
    ctx.strokeStyle = '#1a1424'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(44, -50); ctx.quadraticCurveTo(42, -80, 62, -82); ctx.quadraticCurveTo(82, -80, 80, -50); ctx.quadraticCurveTo(62, -42, 44, -50); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = A.look.trim; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(46, -53); ctx.quadraticCurveTo(62, -46, 78, -53); ctx.stroke();
    ctx.fillStyle = A.look.gem;
    ctx.beginPath(); ctx.arc(62, -66, 3.4, 0, TAU); ctx.fill();
    ctx.fillStyle = A.look.plume;
    ctx.beginPath(); ctx.ellipse(62, -88, 4, 9, Math.sin(t * 2) * 0.2, 0, TAU); ctx.fill();
    if (A.look.glow) lights.push({ x: o.x + 62, y: o.y - 64, r: 90, c: A.look.glow, a: 0.5 });
  }
  // anvil
  ctx.fillStyle = '#3a3a46';
  ctx.fillRect(-6, -22, 12, 22);
  ctx.beginPath(); ctx.moveTo(-26, -30); ctx.lineTo(22, -30); ctx.quadraticCurveTo(30, -30, 32, -24); ctx.lineTo(-20, -22); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6a6a7a'; ctx.fillRect(-24, -31, 44, 2);
  // the smith: a cyclops below, Hephaestus above, hammering away
  const beat = (t * 1.6) % 1, swing = beat < 0.25 ? -1.4 + beat * 6 : 0.1 - (beat - 0.25) * 2;
  if (beat > 0.24 && beat < 0.3 && Math.random() < 0.5) for (let k = 0; k < 3; k++) part({ x: o.x + 4, y: o.y - 32, vx: rand(-120, 120), vy: rand(-220, -80), g: 600, life: 0.5, size: rand(1.2, 2.2), color: pick(['#ffe36b', '#ff9a3a']), add: true });
  ctx.fillStyle = oly ? '#7a5a3a' : '#6a4a6a';
  ctx.beginPath(); ctx.moveTo(-6, -32); ctx.quadraticCurveTo(-10, -78, 16, -80); ctx.quadraticCurveTo(38, -78, 34, -32); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#4a2e1c';
  ctx.fillRect(-2, -58, 32, 26);
  ctx.fillStyle = oly ? '#e8b890' : '#8a9ac0';
  ctx.beginPath(); ctx.arc(14, -90, 12, 0, TAU); ctx.fill();
  if (oly) {
    // Hephaestus: curly beard and a smith's cap
    ctx.fillStyle = '#5a3a22';
    ctx.beginPath(); ctx.arc(14, -84, 11, 0.1, Math.PI - 0.1); ctx.fill();
    ctx.fillStyle = '#8a2a1a';
    ctx.beginPath(); ctx.ellipse(14, -100, 12, 6, 0, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = '#2a1d3a';
    ctx.beginPath(); ctx.arc(10, -92, 1.5, 0, TAU); ctx.arc(18, -92, 1.5, 0, TAU); ctx.fill();
  } else {
    // Brontes the cyclops: one great eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(14, -92, 5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff6a1a';
    ctx.beginPath(); ctx.arc(15, -92, 2.4, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3a2a4a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(8, -84); ctx.quadraticCurveTo(14, -81, 20, -84); ctx.stroke();
  }
  // hammer arm
  ctx.save();
  ctx.translate(2, -62);
  ctx.rotate(swing);
  ctx.strokeStyle = oly ? '#e8b890' : '#8a9ac0'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-4, 24); ctx.stroke();
  ctx.strokeStyle = '#6a4a30'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-4, 24); ctx.lineTo(-4, 40); ctx.stroke();
  ctx.fillStyle = '#4a4a56';
  ctx.fillRect(-12, 36, 16, 9);
  ctx.restore();
  // sign
  ctx.fillStyle = oly ? '#3a4a8a' : '#2a1a10';
  ctx.fillRect(-92, -152, 184, 30);
  ctx.strokeStyle = '#e8c26a';
  ctx.lineWidth = 2;
  ctx.strokeRect(-88, -148, 176, 22);
  ctx.fillStyle = '#ffe9b0';
  ctx.font = '700 15px Cinzel, serif';
  ctx.textAlign = 'center';
  ctx.fillText(o.name, 0, -132);
  ctx.restore();
}

function drawShop(ctx, o, t, lights) {
  ctx.save();
  ctx.translate(o.x, o.y);
  const oly = !!o.oly;
  if (o.main) {
    // stone base and pillars (white marble in Olympus)
    ctx.fillStyle = oly ? '#d8d0bc' : '#2e2840';
    ctx.fillRect(-130, -150, 260, 150);
    ctx.fillStyle = oly ? '#f2ecdc' : '#3d3556';
    for (let i = 0; i < 5; i++) for (let j = 0; j < 6; j++) ctx.fillRect(-128 + i * 52 + (j % 2) * 26, -148 + j * 25, 48, 21);
    ctx.fillStyle = oly ? '#b8a878' : '#1a1626';
    ctx.fillRect(-90, -110, 180, 110);
    // warm interior
    const ig = ctx.createLinearGradient(0, -110, 0, 0);
    ig.addColorStop(0, oly ? '#ffe9b0' : '#5a2a1a');
    ig.addColorStop(1, oly ? '#c99a4a' : '#2a120a');
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
    const bob = Math.sin(t * 1.5) * 2;
    if (oly) {
      // Hermes, messenger of the gods: winged helmet and his snake-twined staff
      ctx.fillStyle = '#f4f0e6';
      ctx.beginPath(); ctx.moveTo(-20, -24); ctx.quadraticCurveTo(-20, -58 + bob, 0, -62 + bob); ctx.quadraticCurveTo(20, -58 + bob, 20, -24); ctx.fill();
      ctx.fillStyle = '#c0392b';
      ctx.beginPath(); ctx.moveTo(-16, -56 + bob); ctx.lineTo(14, -30 + bob); ctx.lineTo(18, -40 + bob); ctx.lineTo(-8, -60 + bob); ctx.fill();
      ctx.fillStyle = '#f0d0b0';
      ctx.beginPath(); ctx.ellipse(0, -70 + bob, 9, 10, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#d8b04a';
      ctx.beginPath(); ctx.ellipse(0, -77 + bob, 11, 6, 0, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff';
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * 12, -80 + bob, 8, 3, sx * -0.6 + Math.sin(t * 8) * 0.15, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#2a1d3a';
      ctx.beginPath(); ctx.arc(-3, -70 + bob, 1.4, 0, TAU); ctx.arc(4, -70 + bob, 1.4, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#d8b04a';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(32, -10); ctx.lineTo(40, -104); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(40 + sx * 8, -106, 7, 2.5, sx * -0.5, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = '#6aa84f';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let k = 0; k <= 12; k++) { const y = -14 - k * 7, x = 32 + (k / 12) * 8 + Math.sin(k * 1.4) * 4; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    } else {
      // Charon
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
    }
    // counter
    ctx.fillStyle = '#5a3a22';
    ctx.fillRect(-96, -28, 192, 28);
    ctx.fillStyle = '#7a5232';
    ctx.fillRect(-100, -32, 200, 6);
    // awning
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i % 2 ? '#e8c26a' : oly ? '#3a6ad8' : '#6a2a8a';
      ctx.beginPath();
      ctx.moveTo(-140 + i * 28, -150); ctx.lineTo(-112 + i * 28, -150); ctx.lineTo(-112 + i * 28, -128); ctx.quadraticCurveTo(-126 + i * 28, -118, -140 + i * 28, -128);
      ctx.fill();
    }
    // sign
    ctx.fillStyle = oly ? '#3a4a8a' : '#2a1a10';
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

const SEAL_COLS = { cerberus: '#b6ff6b', storm: '#ff8ad8', heretic: '#ffb347', titan: '#a8ecff', ares: '#ff5a3a', apollo: '#ffd34a', athena: '#9fd0ff', poseidon: '#3ad8ff', zeus: '#fff27a' };
function drawGate(ctx, o, t, lights) {
  const S = G.save, oly = !!o.oly, n = oly ? sigilCount() : sealCount(), open = n >= 4;
  ctx.save();
  ctx.translate(o.x, o.y);
  // pillars and arch
  const sg = ctx.createLinearGradient(-130, 0, 130, 0);
  sg.addColorStop(0, oly ? '#b89a4a' : '#2a2438');
  sg.addColorStop(0.5, oly ? '#fff0b0' : '#4a4262');
  sg.addColorStop(1, oly ? '#9a7a30' : '#221d30');
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
  ctx.fillStyle = open ? (oly ? '#2a3a7a' : '#2a0408') : oly ? '#1a2048' : '#0a0712';
  ctx.fillRect(-90, -290, 180, 290);
  if (open) {
    drawSwirl(ctx, 0, -150, 110, t, oly ? ['#fff27a', '#8ad8ff', '#ffffff', '#3a4aa0'] : ['#ff3b4a', '#ff9a2e', '#ffffff', '#8a1020']);
    if (oly && Math.random() < 0.08) lightning(ctx, rand(-80, 80), -280, rand(-60, 60), -20, '#fff6b0', 2, 8, 20);
  } else {
    ctx.strokeStyle = oly ? '#c9a84a' : '#3a3050';
    ctx.lineWidth = 6;
    for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(k * 26, 0); ctx.lineTo(k * 26, -290); ctx.stroke(); }
  }
  ctx.restore();
  // inscription
  ctx.fillStyle = oly ? '#fff6c4' : '#c9baff';
  ctx.font = '700 12px Cinzel, serif';
  ctx.textAlign = 'center';
  ctx.fillText(oly ? 'THE GATE OF THE THUNDERER' : 'ABANDON ALL HOPE', 0, -318);
  // sockets
  (oly ? GODS : SITES.slice(0, 4)).forEach((s, i) => {
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
  if (open) lights.push({ x: o.x, y: o.y - 150, r: 360, c: oly ? '#fff27a' : '#ff3b4a', a: 0.9 });
}

// Iris, goddess of the rainbow: a guide waiting in Olympus, with wings of every colour.
function drawIris(ctx, o, t, lights) {
  const bob = Math.sin(t * 1.6) * 3;
  ctx.save();
  ctx.translate(o.x, o.y - 6 + bob);
  const face = G.player && G.player.x < o.x ? -1 : 1;
  ctx.scale(face, 1);
  // rainbow wings, gently beating
  const flap = Math.sin(t * 2.4) * 0.12;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(-4, -54);
    ctx.rotate(side * (0.25 + flap) - 0.2);
    for (let k = 0; k < 7; k++) {
      ctx.fillStyle = RAINBOW[k];
      ctx.globalAlpha = side < 0 ? 0.55 : 0.85;
      ctx.beginPath();
      ctx.ellipse(-22 - k * 2, -6 - k * 5, 30 - k * 2, 6, -0.6 - k * 0.12, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // robe
  const g = ctx.createLinearGradient(0, -64, 0, 0);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.5, '#d8e8ff');
  g.addColorStop(1, '#ffd1f0');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-18, 0); ctx.quadraticCurveTo(-16, -40, -8, -58); ctx.lineTo(8, -58); ctx.quadraticCurveTo(16, -40, 18, 0);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(120,90,160,.4)';
  ctx.lineWidth = 1;
  for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(k * 6, -50); ctx.quadraticCurveTo(k * 8, -24, k * 10, -2); ctx.stroke(); }
  ctx.fillStyle = '#ffd34a';
  ctx.fillRect(-9, -40, 18, 3);
  // head, hair and a rainbow halo
  ctx.fillStyle = '#f6dcc6';
  ctx.beginPath(); ctx.ellipse(1, -67, 8, 9, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#6a3a7a';
  ctx.beginPath(); ctx.ellipse(-2, -71, 9, 7, -0.3, Math.PI, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-9, -70); ctx.quadraticCurveTo(-14, -56, -8, -48); ctx.lineTo(-5, -62); ctx.fill();
  ctx.fillStyle = '#2a1d3a';
  ctx.fillRect(4, -68, 2, 2);
  for (let k = 0; k < 7; k++) {
    ctx.strokeStyle = RAINBOW[k];
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(1, -70, 14 + k * 1.6, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  }
  // a pitcher of rainbow water
  ctx.fillStyle = '#e8c070';
  ctx.beginPath(); ctx.ellipse(13, -32, 5, 7, 0, 0, TAU); ctx.fill();
  ctx.restore();
  if (Math.random() < 0.3) part({ x: o.x + 14 + rand(-3, 3), y: o.y - 34 + bob, vx: rand(-10, 10), vy: rand(20, 60), life: 0.9, size: 2, color: RAINBOW[Math.floor(Math.random() * 7)], add: true });
  lights.push({ x: o.x, y: o.y - 50, r: 180, c: '#ffe8ff', a: 0.7 });
  if (!G.save.irisTalked && Math.floor(t * 2) % 2) {
    ctx.fillStyle = '#ffe14a';
    ctx.font = '900 26px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', o.x, o.y - 100 + bob);
  }
}

function drawFountain(ctx, o, t, lights) {
  const oly = !!o.oly;
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.fillStyle = oly ? '#e6dfcc' : '#4a4262';
  ctx.beginPath(); ctx.ellipse(0, -10, 60, 14, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = oly ? '#ffd76a' : '#2a3a6a';
  ctx.beginPath(); ctx.ellipse(0, -14, 52, 9, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = oly ? '#f4efe2' : '#5a5278';
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
  const y = n.y - (n.type === 'shop' && n.main ? 210 : n.type === 'armourer' ? 190 : n.type === 'gate' ? 340 : n.type === 'npc' ? 104 : 96) + Math.sin(G.t * 4) * 3;
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
  // armour pips, after the hearts; the next one fills in as it recharges
  const A = worn();
  if (A && S.armour) {
    const x0 = 30 + S.maxHp * 30 + 6, [c0, c1, c2] = A.look.metal;
    for (let i = 0; i < S.armour; i++) {
      ctx.save();
      ctx.translate(x0 + i * 26, 30);
      const sh = new Path2D('M0 -11 L10 -7 L9 3 Q6 10 0 12 Q-6 10 -9 3 L-10 -7 Z');
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fill(sh);
      const full = i < Math.floor(p.armour), next = i === Math.floor(p.armour) && p.armT < S.armourRegen;
      if (full || next) {
        const g = ctx.createLinearGradient(0, -11, 0, 12);
        g.addColorStop(0, c0); g.addColorStop(0.5, c1); g.addColorStop(1, c2);
        ctx.fillStyle = g;
        if (next) {
          ctx.save();
          ctx.globalAlpha = 0.6;
          const k = clamp(1 - p.armT / S.armourRegen, 0, 1);
          ctx.beginPath(); ctx.rect(-12, 12 - 24 * k, 24, 24 * k); ctx.clip();
          ctx.fill(sh);
          ctx.restore();
        } else ctx.fill(sh);
      }
      ctx.lineWidth = 2;
      ctx.strokeStyle = full ? A.look.trim : 'rgba(255,255,255,.45)';
      ctx.stroke(sh);
      ctx.restore();
    }
  }
  // gems and potions
  ctx.font = '800 20px Nunito, sans-serif';
  ctx.textAlign = 'left';
  gemIcon(ctx, 30, 66, 9);
  hudText(ctx, save.dev && save.dev.infGems ? '∞' : save.gems.toLocaleString(), 46, 73);
  const dl = devLabel();
  if (dl) { ctx.font = '900 13px Nunito, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(10,6,20,.7)'; roundRect(ctx, 22, 146, ctx.measureText(dl).width + 16, 22, 6); ctx.fill(); ctx.fillStyle = '#7dffb0'; ctx.fillText(dl, 30, 161); ctx.font = '800 20px Nunito, sans-serif'; }
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
  (save.bosses.hades ? GODS : SITES.slice(0, 4)).forEach((s, i) => {
    const x = 34 + i * 24, y = 132;
    ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU);
    ctx.fillStyle = save.bosses[s.id] ? SEAL_COLS[s.id] : 'rgba(0,0,0,.45)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // weapons
  const by = H - 74;
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
    const cd = w.id === 'blast' ? p.blastCd / S.blastCd : w.id === 'bomb' && own ? p.bombCd / S.bombCd : 0;
    if (cd > 0) {
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      const k = clamp(cd, 0, 1);
      ctx.fillRect(x + 2, by + 50 - 48 * k, 46, 48 * k);
    }
  });
  // bubble charge
  const bx = 24 + WEAPONS.length * 58 + 30, byc = by + 25, k = clamp(p.charge / S.bubbleT, 0, 1);
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
  if (S.fly) {
    // wing energy for flight
    const fy = by - (save.up.beam ? 30 : 16), k = clamp(p.wing / S.flyMax, 0, 1);
    ctx.fillStyle = 'rgba(10,6,20,.6)';
    ctx.fillRect(24, fy, 222, 8);
    const g = ctx.createLinearGradient(24, 0, 246, 0);
    g.addColorStop(0, '#fff6c4');
    g.addColorStop(1, '#ffc23a');
    ctx.fillStyle = k < 0.2 && Math.floor(G.t * 6) % 2 ? '#ff6a4a' : g;
    ctx.fillRect(24, fy, 222 * k, 8);
    ctx.font = '800 11px Nunito, sans-serif';
    ctx.textAlign = 'left';
    hudText(ctx, '🪽', 250, fy + 9);
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
    ['#4a1580', '#7a2ad0', '#a64dff', '#d07aff', '#ff6ad5', '#f2d6ff'].forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(-4, 8, 10 + i * 2, -1.9, -0.2); ctx.stroke(); });
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
  } else if (id === 'bomb') {
    ctx.fillStyle = '#4a3a5e';
    ctx.strokeStyle = '#ffb347';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-2, 3, 11, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#c9a070';
    ctx.beginPath(); ctx.moveTo(4, -6); ctx.quadraticCurveTo(10, -12, 8, -15); ctx.stroke();
    ctx.fillStyle = '#ffe36b';
    ctx.beginPath(); ctx.arc(8, -15, 3.5, 0, TAU); ctx.fill();
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
    const col = l.type === 'shop' ? '#ffd34a' : l.type === 'armourer' ? '#ff9a4a' : l.type === 'shrine' ? '#8fe8ff' : l.type === 'gate' ? '#ff4a5a' : null;
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
  const lv = B.heaven ? HEAVEN_LVL : levelAt(Math.round(ptx), Math.round(pty));
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
    if (i === 4 || i === 9 || (s.god && !G.save.oly)) return;
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
    if (l.type === 'armourer') { ctx.fillStyle = '#ff9a4a'; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill(); }
    if (l.type === 'gate') { ctx.fillStyle = l.oly ? '#fff27a' : '#ff4a5a'; ctx.fillRect(x - 6, y - 8, 12, 12); ctx.font = '700 12px Cinzel, serif'; hudTextSmall(ctx, l.oly ? 'Gate of the Thunderer' : 'The Gate', x, y - 14, l.oly ? '#fff6c4' : '#ff8a9a'); }
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
  hudTextSmall(ctx, BIOMES[BIOME_LIST[G.biome]].heaven ? 'Map of Olympus' : 'Map of the Underworld', W / 2, 46, '#f3e7ff');
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
