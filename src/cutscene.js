// Story cutscenes, drawn straight onto the game canvas: the prelude (the unicorn cast out of
// Olympus by Zeus), the ascent back up after Hades falls, and the finale after Zeus is beaten.
import { G } from './state.js';
import { makePlayer, drawUnicorn, updateTail } from './player.js';
import { updateFx, drawParts, part } from './fx.js';
import { glow, lightning } from './art.js';
import { mood } from './bossart.js';
import { zeus as drawZeus } from './godart.js';
import { setTheme, sfx } from './audio.js';
import { rand, pick, clamp, mix, rgba, RAINBOW } from './util.js';

const VW = 1600, VH = 900, TAU = Math.PI * 2;
const sm = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
let cs = null;

// ---------- Public API ----------
export function playCutscene(name, onDone) {
  G.parts.length = 0;
  const pup = makePlayer(0, 0);
  pup.ground = true;
  cs = { name, panels: SCENES[name], i: 0, t: 0, onDone, pup, total: 0, last: G.scene };
  G.scene = 'cutscene';
  enter();
}

export function cutsceneKey(code) {
  if (!cs) return;
  if (code === 'Escape') finish();
  else if (code === 'Space' || code === 'Enter' || code === 'KeyE' || code === 'ArrowRight') next();
}

const canvas = document.getElementById('game');
canvas.addEventListener('pointerdown', () => { if (cs && G.scene === 'cutscene') next(); });

function enter() {
  const P = cs.panels[cs.i];
  cs.t = 0;
  if (P.music) setTheme(P.music);
  if (P.sfx) sfx(P.sfx);
}
function next() {
  if (!cs) return;
  if (cs.t < 0.35) return;
  cs.i++;
  if (cs.i >= cs.panels.length) finish();
  else enter();
}
function finish() {
  const done = cs.onDone;
  cs = null;
  G.parts.length = 0;
  if (G.scene === 'cutscene') G.scene = 'play';
  done && done();
}

export function drawCutscene(ctx, dt) {
  if (!cs) return;
  const P = cs.panels[cs.i];
  cs.t += dt;
  cs.total += dt;
  const k = clamp(cs.t / P.dur, 0, 1), t = cs.total;
  const { W, H } = G, s = Math.min(W / VW, H / VH);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate((W - VW * s) / 2, (H - VH * s) / 2);
  ctx.scale(s, s);
  ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();
  P.draw(ctx, k, t, dt);
  updateFx(dt);
  drawParts(ctx, false);
  drawParts(ctx, true);
  // fade in and out of each panel
  const fade = Math.max(1 - cs.t / 0.6, P.dur - cs.t < 0.6 && !P.hold ? 1 - (P.dur - cs.t) / 0.6 : 0);
  if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${clamp(fade, 0, 1)})`; ctx.fillRect(0, 0, VW, VH); }
  caption(ctx, P.text, cs.t);
  ctx.restore();
  ctx.font = '600 13px Nunito, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.fillText('Space or click: next   ·   Esc: skip', W - 18, H - 16);
  if (cs.t >= P.dur && !P.hold) next();
}

// ---------- Drawing helpers ----------
function caption(ctx, text, t) {
  if (!text) return;
  const a = clamp((t - 0.4) / 0.8, 0, 1);
  ctx.save();
  ctx.globalAlpha = a;
  const g = ctx.createLinearGradient(0, VH - 220, 0, VH);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,.75)');
  ctx.fillStyle = g;
  ctx.fillRect(0, VH - 220, VW, 220);
  ctx.textAlign = 'center';
  ctx.font = '700 38px Cinzel, serif';
  ctx.shadowColor = 'rgba(0,0,0,.9)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#fff3d6';
  const lines = wrap(ctx, text, 1300);
  lines.forEach((l, i) => ctx.fillText(l, VW / 2, VH - 70 - (lines.length - 1 - i) * 50));
  ctx.restore();
}
function wrap(ctx, text, w) {
  const out = [];
  let line = '';
  for (const word of text.split(' ')) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > w && line) { out.push(line); line = word; } else line = test;
  }
  if (line) out.push(line);
  return out;
}

function sky(ctx, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VW, VH);
}

function sun(ctx, x, y, r, t, a = 1, col = '#fff1b0') {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a;
  ctx.translate(x, y);
  ctx.rotate(t * 0.05);
  for (let i = 0; i < 16; i++) {
    ctx.rotate(TAU / 16);
    const g = ctx.createLinearGradient(0, 0, r * 4, 0);
    g.addColorStop(0, rgba(col, 0.35));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 4, -r * 0.35); ctx.lineTo(r * 4, r * 0.35); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  glow(ctx, x, y, r * 3, col, 0.6 * a);
  ctx.fillStyle = rgba('#fffbe8', a);
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

// A soft cumulus cloud made of overlapping puffs, lit from above.
function cloud(ctx, x, y, w, col = '#ffffff', shadeCol = '#c9d4ee', a = 1, seed = 0) {
  ctx.save();
  ctx.globalAlpha = a;
  const n = 7;
  for (const pass of [0, 1]) {
    ctx.fillStyle = pass ? col : shadeCol;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), r = w * (0.13 + 0.09 * Math.sin(u * Math.PI)) * (0.85 + 0.3 * ((Math.sin(seed * 7 + i * 3.1) + 1) / 2));
      ctx.beginPath();
      ctx.arc(x - w / 2 + u * w, y - Math.sin(u * Math.PI) * w * 0.12 - (pass ? 6 : 0), r, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

// A floor of cloud filling the bottom of the frame, with a puffy, slowly drifting top edge.
function cloudFloor(ctx, y, col = '#ffffff', shadeCol = '#d4def2', t = cs ? cs.total : 0) {
  for (const [c, dy] of [[shadeCol, 10], [col, 0]]) {
    ctx.fillStyle = c;
    ctx.fillRect(0, y + 30 + dy, VW, VH);
    ctx.beginPath();
    for (let i = -1; i < 22; i++) {
      const x = i * 80 + ((t * 6) % 80), r = 46 + ((i * 37) % 5) * 9;
      ctx.moveTo(x + r, y + 40 + dy);
      ctx.arc(x, y + 40 + dy - ((i * 13) % 3) * 8, r, 0, TAU);
    }
    ctx.fill();
  }
}

function temple(ctx, x, y, w, h, col = '#f4efe2', a = 1) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x, y);
  const shadeC = mix(col, '#8a8aa8', 0.4);
  ctx.fillStyle = shadeC;
  ctx.fillRect(-w / 2 - 20, -18, w + 40, 18);
  ctx.fillStyle = col;
  ctx.fillRect(-w / 2 - 10, -30, w + 20, 14);
  const cols = 8;
  for (let i = 0; i < cols; i++) {
    const cx = -w / 2 + 12 + (i / (cols - 1)) * (w - 24);
    const g = ctx.createLinearGradient(cx - 10, 0, cx + 10, 0);
    g.addColorStop(0, shadeC); g.addColorStop(0.5, col); g.addColorStop(1, shadeC);
    ctx.fillStyle = g;
    ctx.fillRect(cx - 10, -30 - h, 20, h);
  }
  ctx.fillStyle = col;
  ctx.fillRect(-w / 2 - 14, -h - 50, w + 28, 22);
  ctx.beginPath(); ctx.moveTo(-w / 2 - 20, -h - 50); ctx.lineTo(0, -h - 130); ctx.lineTo(w / 2 + 20, -h - 50); ctx.closePath(); ctx.fill();
  ctx.fillStyle = shadeC;
  ctx.beginPath(); ctx.moveTo(-w / 2 + 10, -h - 56); ctx.lineTo(0, -h - 116); ctx.lineTo(w / 2 - 10, -h - 56); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// The angel as a puppet: the real in-game sprite, posed for the camera.
function unicorn(ctx, x, y, sc, o = {}) {
  const p = cs.pup;
  p.x = -p.w / 2; p.y = -p.h;
  p.face = o.face || 1;
  p.vx = o.run ? 300 * p.face : 0;
  p.vy = o.vy || 0;
  p.ground = !o.air;
  p.runPhase += (o.run ? 0.25 : 0);
  p.inv = 0; p.dashT = o.dash ? 0.1 : 0; p.sx = 1; p.sy = 1;
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(sc, sc);
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  updateTail(p, 1 / 60);
  drawUnicorn(ctx, p, cs.total);
  ctx.restore();
}

// Zeus, drawn with his in-game art at a giant scale.
function zeus(ctx, x, y, sc, st, k, t, o = {}) {
  const b = { id: 'zeus', w: 130, h: 190, st, stT: (1 - k) * 1.8, stDur: 1.8, n: o.n || 0, phase: o.phase || 1, vx: 0, vy: 0, ground: false, hurtT: 0, roarT: o.roar || 0, seed: 2, face: 1, t, dead: !!o.dieAt, dieAt: o.dieAt, sub: 0 };
  const m = mood(b, t, o.lx != null ? o.lx : -300, o.ly != null ? o.ly : 200);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(-sc, sc);
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  drawZeus(ctx, b, t, false, m);
  ctx.restore();
}

function stormSky(ctx, a, t) {
  ctx.save();
  ctx.globalAlpha = a;
  sky(ctx, [[0, '#0e1030'], [0.6, '#2a2458'], [1, '#4a3a6a']]);
  for (let i = 0; i < 9; i++) cloud(ctx, ((i * 233 + t * 18) % 1900) - 150, 90 + (i % 3) * 70, 420, '#4a4a78', '#24244a', 0.9, i);
  ctx.restore();
}

function sparkle(x, y, n = 2, cols = RAINBOW, spread = 40) {
  for (let i = 0; i < n; i++) part({ x: x + rand(-spread, spread), y: y + rand(-spread, spread), vx: rand(-60, 60), vy: rand(-90, -20), life: rand(0.6, 1.4), size: rand(2, 4.5), color: pick(cols), add: true, shape: 'star', vr: 3 });
}

// ---------- The scenes ----------
const SCENES = {
  prelude: [
    {
      dur: 6.5, music: 'prelude',
      text: 'Long ago, on the golden heights of Olympus, a host of angels served the gods.',
      draw(ctx, k, t) {
        sky(ctx, [[0, '#4f86d8'], [0.55, '#a6c6f0'], [1, '#ffd9a8']]);
        sun(ctx, 1250, 180, 60, t);
        for (let i = 0; i < 6; i++) cloud(ctx, ((i * 330 + t * 10) % 2000) - 200, 170 + (i % 2) * 90, 380, '#ffffff', '#dbe4f6', 0.85, i);
        cloudFloor(ctx, 730, '#ffffff', '#d4def2');
        temple(ctx, 560, 700, 520, 220);
        cloud(ctx, 220, 740, 460, '#ffffff', '#cfd9ef', 1, 5);
        unicorn(ctx, 1180, 700, 2.2, { face: -1, alpha: 0.65 });
        unicorn(ctx, 1380, 712, 1.8, { face: -1, alpha: 0.5 });
        unicorn(ctx, 760 + k * 220, 730, 3.4, { face: 1, run: true });
        if (Math.random() < 0.3) sparkle(rand(0, VW), rand(100, 600), 1, ['#ffe28a', '#ffffff']);
      },
    },
    {
      dur: 6.5,
      text: 'But one of them drank too deeply of the light, and grew brighter than the sun itself.',
      draw(ctx, k, t) {
        const b = sm(k);
        sky(ctx, [[0, mix('#4f86d8', '#ffe9b0', b * 0.6)], [1, mix('#ffd9a8', '#ffffff', b * 0.5)]]);
        sun(ctx, 1250, 180, 60, t, 1 - b * 0.7);
        cloudFloor(ctx, 750, '#ffffff', '#d4def2');
        temple(ctx, 360, 720, 420, 180, '#f4efe2', 0.8);
        const x = 820, y = 700;
        sun(ctx, x, y - 70, 30 + b * 60, t * 3, 0.4 + b * 0.6, '#fff6d0');
        for (let i = 0; i < 6; i++) {
          const a = t * 1.6 + (i / 6) * TAU, r = 120 + Math.sin(t * 2 + i) * 20;
          glow(ctx, x + Math.cos(a) * r, y - 70 + Math.sin(a) * r * 0.5, 30, RAINBOW[i], 0.4 + b * 0.4);
        }
        unicorn(ctx, x, y, 3.6, { face: 1, dash: true });
        // the other angels shrink away from the glare
        unicorn(ctx, 1260 + b * 120, 720, 1.8, { face: 1, run: b > 0.2, alpha: 0.6 * (1 - b) });
        if (Math.random() < 0.7) sparkle(x, y - 80, 2, RAINBOW, 90);
      },
    },
    {
      dur: 6, music: 'fall', sfx: 'roar',
      text: 'Zeus, King of the Gods, grew afraid.',
      draw(ctx, k, t) {
        const s = sm(k * 1.5);
        sky(ctx, [[0, '#4f86d8'], [1, '#ffd9a8']]);
        stormSky(ctx, s, t);
        if (Math.random() < 0.06 * s) { lightning(ctx, rand(200, 1400), 0, rand(200, 1400), 500, '#e8eeff', 3, 10, 40); sfx('bolt'); }
        zeus(ctx, 1080, 640 + (1 - s) * 200, 3.2, 'idle', k, t, { alpha: s, lx: -400, ly: 260 });
        cloudFloor(ctx, 770, '#8a8ab0', '#4a4a70');
        unicorn(ctx, 360, 790, 2.4, { face: 1, alpha: 1 });
        glow(ctx, 360, 720, 160, '#fff6d0', 0.5);
      },
    },
    {
      dur: 5.5,
      text: '"No creature shall outshine Olympus," he thundered, and he struck the angel down.',
      draw(ctx, k, t) {
        stormSky(ctx, 1, t);
        const strike = k > 0.45;
        zeus(ctx, 1080, 640, 3.2, k > 0.3 ? 'bolts' : 'idle', k > 0.3 ? (k - 0.3) / 0.7 : k, t, { lx: -400, ly: 260, roar: strike && k < 0.7 ? 0.6 : 0 });
        cloudFloor(ctx, 770, '#8a8ab0', '#4a4a70');
        if (!strike) {
          unicorn(ctx, 360, 790, 2.4, { face: 1 });
          glow(ctx, 360, 720, 160, '#fff6d0', 0.5);
        } else {
          const f = (k - 0.45) / 0.55;
          if (f < 0.25) {
            for (let i = 0; i < 3; i++) lightning(ctx, 1000, 260, 360 + rand(-20, 20), 760, i ? '#bfd8ff' : '#ffffff', 6 - i * 2, 14, 60);
            if (!cs.boom) { cs.boom = 1; sfx('boom'); for (let i = 0; i < 60; i++) sparkle(360, 740, 1, RAINBOW, 60); }
          }
          unicorn(ctx, 360 - f * 120, 790 + f * f * 200, 2.4, { face: 1, air: true, rot: -f * 2.4, alpha: 1 - f * 0.4 });
          if (f < 0.2) { ctx.fillStyle = `rgba(255,255,255,${1 - f / 0.2})`; ctx.fillRect(0, 0, VW, VH); }
        }
      },
    },
    {
      dur: 6.5,
      text: 'Stripped of its light, it fell through the clouds, past the world of mortals, down into the dark...',
      draw(ctx, k, t) {
        const c1 = k < 0.5 ? mix('#2a2458', '#0a0818', k * 2) : mix('#0a0818', '#3a0608', (k - 0.5) * 2);
        const c2 = k < 0.5 ? mix('#6a5a8a', '#140c20', k * 2) : mix('#140c20', '#8a1a0a', (k - 0.5) * 2);
        sky(ctx, [[0, c1], [1, c2]]);
        // clouds and rock rushing upward past the falling unicorn
        for (let i = 0; i < 14; i++) {
          const y = VH + 200 - ((t * 900 + i * 260) % (VH + 600));
          const x = (i * 397) % VW;
          if (k < 0.5) cloud(ctx, x, y, 360, mix('#8a8ab0', '#20203a', k * 2), '#2a2a48', 0.7, i);
          else {
            ctx.fillStyle = mix('#1a0a10', '#4a1008', (k - 0.5) * 2);
            ctx.beginPath(); ctx.moveTo(x - 80, y + 120); ctx.lineTo(x, y - 160); ctx.lineTo(x + 80, y + 120); ctx.fill();
          }
        }
        ctx.strokeStyle = 'rgba(255,255,255,.25)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 30; i++) {
          const x = (i * 53 + Math.sin(i) * 40) % VW, y = (t * 1600 + i * 97) % VH;
          ctx.beginPath(); ctx.moveTo(x, VH - y); ctx.lineTo(x, VH - y - 80); ctx.stroke();
        }
        unicorn(ctx, 800 + Math.sin(t * 1.3) * 60, 420, 2.6, { face: 1, air: true, vy: 800, rot: t * 2.2, alpha: 0.9 });
        if (Math.random() < 0.5) part({ x: 800 + rand(-30, 30), y: 400, vx: rand(-40, 40), vy: rand(-500, -300), life: 0.6, size: rand(2, 4), color: pick(RAINBOW), add: true });
      },
    },
    {
      dur: 6.5, music: 'limbo',
      text: '...all the way down to the realm of Hades. To find the way home, you must first escape the underworld.',
      draw(ctx, k, t) {
        sky(ctx, [[0, '#0d0a1c'], [0.7, '#2b2348'], [1, '#5a1a2a']]);
        ctx.fillStyle = '#1a152d';
        ctx.beginPath(); ctx.moveTo(0, 0);
        for (let x = 0; x <= VW; x += 80) ctx.lineTo(x, 60 + ((x * 37) % 140));
        ctx.lineTo(VW, 0); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, VH);
        for (let x = 0; x <= VW; x += 100) ctx.lineTo(x, 700 - ((x * 53) % 160));
        ctx.lineTo(VW, VH); ctx.fill();
        glow(ctx, 1200, 560, 300, '#ff3b4a', 0.35);
        // the Gate of Hell on the horizon
        ctx.fillStyle = '#0a0712';
        ctx.beginPath(); ctx.moveTo(1080, 640); ctx.lineTo(1080, 440); ctx.arc(1200, 440, 120, Math.PI, 0); ctx.lineTo(1320, 640); ctx.fill();
        ctx.fillStyle = '#ff3b4a';
        ctx.globalAlpha = 0.5 + Math.sin(t * 3) * 0.2;
        ctx.beginPath(); ctx.moveTo(1120, 640); ctx.lineTo(1120, 450); ctx.arc(1200, 450, 80, Math.PI, 0); ctx.lineTo(1280, 640); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#120e1c';
        ctx.fillRect(0, 740, VW, 160);
        const up = sm((k - 0.25) / 0.4);
        unicorn(ctx, 520, 742, 2.6, { face: 1, rot: (1 - up) * -1.4, air: up < 1 });
        glow(ctx, 520, 690, 140, '#fff4d0', 0.25 + up * 0.25);
        if (Math.random() < 0.4) part({ x: rand(0, VW), y: VH, vx: rand(-20, 20), vy: rand(-120, -50), life: 4, size: rand(1.2, 2.6), color: pick(['#ffb347', '#ff6a1a', '#c9baff']), add: true });
      },
    },
  ],

  ascent: [
    {
      dur: 5.5, music: 'prelude', sfx: 'portal',
      text: 'Hades is broken. A stair of light pours down into his throne room, and you step into it.',
      draw(ctx, k, t) {
        sky(ctx, [[0, '#050002'], [1, '#2a0408']]);
        const g = ctx.createLinearGradient(700, 0, 900, 0);
        g.addColorStop(0, 'rgba(255,240,180,0)'); g.addColorStop(0.5, 'rgba(255,245,200,.75)'); g.addColorStop(1, 'rgba(255,240,180,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(760, 0); ctx.lineTo(840, 0); ctx.lineTo(980, 760); ctx.lineTo(620, 760); ctx.fill();
        ctx.fillStyle = '#12040a';
        ctx.fillRect(0, 760, VW, 140);
        unicorn(ctx, 380 + sm(k) * 420, 762, 2.6, { face: 1, run: k < 0.95 });
        if (Math.random() < 0.6) sparkle(800 + rand(-120, 120), rand(80, 740), 1, ['#fff6d0', '#ffe28a', '#ffffff'], 10);
      },
    },
    {
      dur: 6,
      text: 'Up through the rock, past the world of mortals, through the clouds...',
      draw(ctx, k, t) {
        const c1 = k < 0.5 ? mix('#2a0408', '#0a0818', k * 2) : mix('#0a0818', '#4f86d8', (k - 0.5) * 2);
        const c2 = k < 0.5 ? mix('#5a1a0a', '#140c20', k * 2) : mix('#140c20', '#ffd9a8', (k - 0.5) * 2);
        sky(ctx, [[0, c1], [1, c2]]);
        for (let i = 0; i < 14; i++) {
          const y = ((t * 900 + i * 260) % (VH + 600)) - 300, x = (i * 397) % VW;
          if (k > 0.5) cloud(ctx, x, y, 360, '#ffffff', '#d4def2', (k - 0.5) * 2, i);
          else {
            ctx.fillStyle = mix('#4a1008', '#1a0a10', k * 2);
            ctx.beginPath(); ctx.moveTo(x - 80, y - 120); ctx.lineTo(x, y + 160); ctx.lineTo(x + 80, y - 120); ctx.fill();
          }
        }
        glow(ctx, 800, 470, 240, '#fff6d0', 0.6);
        unicorn(ctx, 800 + Math.sin(t * 1.5) * 30, 500, 2.8, { face: 1, air: true, vy: -800, dash: true });
        if (Math.random() < 0.8) part({ x: 800 + rand(-30, 30), y: 520, vx: rand(-40, 40), vy: rand(300, 500), life: 0.8, size: rand(2, 4), color: pick(RAINBOW), add: true });
      },
    },
    {
      dur: 6.5, music: 'olympus',
      text: '...until Olympus shines before you once more. Its gods are waiting, and they are afraid.',
      draw(ctx, k, t) {
        sky(ctx, [[0, '#4f86d8'], [0.6, '#a6c6f0'], [1, '#ffd9a8']]);
        sun(ctx, 300, 160, 50, t);
        for (let i = 0; i < 5; i++) cloud(ctx, ((i * 380 + t * 12) % 2000) - 200, 200 + (i % 2) * 80, 380, '#ffffff', '#dbe4f6', 0.85, i);
        stormSky(ctx, 0.25 + Math.sin(t) * 0.05, t);
        cloudFloor(ctx, 750, '#ffffff', '#d4def2');
        temple(ctx, 820, 740, 700, 260);
        // four watchful glows on the temple roof: the gods
        ['#ff5a3a', '#ffd34a', '#9fd0ff', '#3ad8ff'].forEach((c, i) => glow(ctx, 560 + i * 175, 330, 46, c, 0.55 + Math.sin(t * 3 + i) * 0.2));
        unicorn(ctx, 300 + sm(k) * 200, 770, 2.8, { face: 1, run: k < 0.6 });
      },
    },
  ],

  finale: [
    {
      dur: 6, music: 'victory',
      text: 'The King of the Gods falls, and his thunder rolls away into silence.',
      draw(ctx, k, t) {
        sky(ctx, [[0, mix('#141a3a', '#4f86d8', k)], [1, mix('#463b7c', '#ffd9a8', k)]]);
        stormSky(ctx, 1 - k, t);
        if (cs.t0 == null) cs.t0 = t;
        zeus(ctx, 1000, 700, 3, 'idle', 0, t, { dieAt: cs.t0 + 0.3 });
        cloudFloor(ctx, 780, '#ffffff', '#d4def2');
        unicorn(ctx, 420, 800, 2.6, { face: 1 });
      },
    },
    {
      dur: 7, hold: false,
      text: 'The clouds part, and all of Olympus is bathed in your light. You are the brightest star in the heavens now.',
      draw(ctx, k, t) {
        sky(ctx, [[0, '#4f86d8'], [0.55, '#ffe9b0'], [1, '#ffffff']]);
        for (let i = 0; i < 6; i++) cloud(ctx, ((i * 330 + t * 10) % 2000) - 200, 200 + (i % 2) * 90, 380, '#ffffff', '#dbe4f6', 0.85, i);
        cloudFloor(ctx, 750, '#ffffff', '#d4def2');
        temple(ctx, 800, 720, 720, 260);
        const b = sm(k);
        sun(ctx, 800, 560, 40 + b * 50, t * 2, 0.5 + b * 0.5, '#fff6d0');
        for (let i = 0; i < 7; i++) {
          const a = t * 1.2 + (i / 7) * TAU;
          glow(ctx, 800 + Math.cos(a) * 200, 560 + Math.sin(a) * 90, 40, RAINBOW[i], 0.5);
        }
        unicorn(ctx, 800, 640, 3.2, { face: 1, dash: true });
        if (Math.random() < 0.8) sparkle(800, 560, 2, RAINBOW, 160);
      },
    },
  ],
};
