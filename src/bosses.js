// Boss fights: Cerberus, Semiramis, Farinata, Ephialtes and Hades in the underworld, then the gods of
// Olympus (Ares, Apollo, Athena, Poseidon) and Zeus himself.
import { G } from './state.js';
import { T, BIOMES, BIOME_LIST, SITES, HEAVEN_LVL } from './world.js';
import { moveBody } from './physics.js';
import { rand, pick, clamp, shade, overlap, RAINBOW } from './util.js';
import { burst, part, ring, shake, floater } from './fx.js';
import { sfx, setTheme } from './audio.js';
import { hurtPlayer as hurtP, shoot as shootP, dropGems } from './combat.js';
import { makeEnemy } from './enemies.js';
import { announce, onBossDefeated } from './main.js';
import * as BART from './bossart.js';
import * as GART from './godart.js';
import { lightning } from './art.js';

const ART = { ...BART, ...GART };
// The gods of Olympus hit one point harder with every attack than the underworld's wardens,
// and any boss in its final fury hits one point harder still.
const bonus = () => (G.boss ? (G.boss.heaven ? 1 : 0) + (G.boss.phase >= 3 ? 1 : 0) : 0);
const shoot = o => shootP({ ...o, dmg: (o.dmg || 1) + bonus() });
const hurtPlayer = (n, x) => hurtP(n + bonus(), x);
const SIZES = {
  cerberus: [170, 104], storm: [80, 120], heretic: [110, 92], titan: [150, 220], hades: [110, 160],
  ares: [96, 150], apollo: [90, 130], athena: [96, 140], poseidon: [150, 210], zeus: [130, 190],
};
const FLYING = { storm: 1, heretic: 1, hades: 1, apollo: 1, athena: 1, zeus: 1 };
// The gods fight with the underworld bosses' battle plans, in their own colours and weapons.
const AI = { ares: 'cerberus', apollo: 'storm', athena: 'heretic', poseidon: 'titan', zeus: 'hades' };
const PAL = {
  cerberus: { main: '#b6ff6b', trail: '#6fae3a', rock: '#9a8f6a', proj: 'glob', col: 'acid', mouths: [[100, -140], [134, -98], [114, -54]] },
  ares: { main: '#ff5a3a', trail: '#ff9a3a', rock: '#c9b48a', proj: 'spear', col: 'war', mouths: [[40, -150], [40, -150], [40, -150]] },
  storm: { main: '#ff8ad8', alt: '#c45cff', col: 'bolt', streak: 'rgba(255,200,240,.6)', minion: 'bat' },
  apollo: { main: '#ffd34a', alt: '#ff9a1a', col: 'sun', streak: 'rgba(255,230,150,.65)', minion: 'cherub' },
  heretic: { main: '#ff8a1a', trail: '#ff5a1f', met: '#ff6a1a', metTrail: ['#ffe36b', '#ff6a1a'], col: 'fire', fx: ['#ffe36b', '#ff8a1a', '#ff4a1a'], spear: 0 },
  athena: { main: '#9fd0ff', trail: '#5a8aff', met: '#dfefff', metTrail: ['#ffffff', '#9fd0ff'], col: 'holy', fx: ['#ffffff', '#9fd0ff', '#5a8aff'], spear: 1 },
  titan: { main: '#a8ecff', shard: '#e8fbff', breath: '#bff3ff', col: 'ice', freeze: true },
  poseidon: { main: '#3ad8ff', shard: '#b8f6ff', breath: '#6fe0ff', col: 'water', freeze: false },
  hades: { main: '#5fd8ff', alt: '#ff4a5a', trail: '#3a7bff', fx: ['#5fd8ff', '#3a7bff', '#ffffff'], met: '#5fd8ff', metTrail: ['#ffffff', '#5fd8ff'], laser: ['255,50,70', '255,220,220'], minions: ['imp', 'wisp'] },
  zeus: { main: '#fff27a', alt: '#8ad8ff', trail: '#ffe14a', fx: ['#fff27a', '#8ad8ff', '#ffffff'], met: '#fff27a', metTrail: ['#ffffff', '#8ad8ff'], laser: ['255,230,90', '255,255,230'], minions: ['cherub', 'seraph', 'angel'] },
};
// Telegraph and strike colours for each kind of column attack.
const COLK = {
  bolt: { warn: '255,60,80', glow: '255,160,230', burst: ['#ffffff', '#ff8ad8'], bolt: '#ffb0f0', dmg: 1, sfx: 'bolt' },
  fire: { warn: '255,60,80', glow: '255,140,40', burst: ['#ffe36b', '#ff6a1a'], dmg: 2, sfx: 'fire' },
  ice: { warn: '255,220,255', glow: '170,230,255', burst: ['#e8fbff', '#9fd4f5'], dmg: 1, sfx: 'bolt' },
  sun: { warn: '255,190,60', glow: '255,205,90', burst: ['#fff6c4', '#ffd34a'], dmg: 1, sfx: 'fire' },
  holy: { warn: '170,210,255', glow: '190,225,255', burst: ['#ffffff', '#9fd0ff'], dmg: 2, sfx: 'bolt' },
  water: { warn: '60,190,255', glow: '90,220,255', burst: ['#e0fbff', '#3ad8ff'], dmg: 1, sfx: 'boom' },
  acid: { warn: '160,255,90', glow: '180,255,110', burst: ['#eaffc4', '#b6ff6b'], dmg: 1, sfx: 'boom' },
  war: { warn: '255,90,60', glow: '255,140,70', burst: ['#ffe0c0', '#ff5a3a'], dmg: 2, sfx: 'boom' },
  zap: { warn: '255,230,90', glow: '255,245,170', burst: ['#ffffff', '#fff27a'], bolt: '#fff6b0', dmg: 1, sfx: 'bolt' },
};

export function spawnBoss(site) {
  const [w, h] = SIZES[site.id], B = BIOMES[site.biome];
  const ax0 = (site.tx - site.w / 2) * T, ax1 = (site.tx + site.w / 2 + 1) * T;
  const ay0 = (site.ty - site.h / 2) * T, ay1 = (site.ty + site.h / 2 + 1) * T;
  const p = G.player, left = p.x < (ax0 + ax1) / 2;
  const boss = {
    boss: true, site, id: site.id, ai: AI[site.id] || site.id, pal: PAL[site.id], name: site.name, title: site.title, w, h,
    x: left ? ax1 - w - 120 : ax0 + 120, y: FLYING[site.id] ? ay0 + 120 : ay1 - h - 4,
    vx: 0, vy: 0, hp: site.hp, max: site.hp, face: left ? -1 : 1, t: 0, st: 'intro', stT: 1.6, stDur: 1.6, last: '', phase: 1,
    flash: 0, hurtT: 0, roarT: 0, seed: Math.random() * 5, dead: false, ground: false, tint: B.tint, accent: B.accent, ax0, ax1, ay0, ay1, level: 10, n: 0, out: 0,
  };
  // the gods start the fight already at full fury, and grow fiercer still when wounded
  boss.heaven = !!(site.god || site.id === 'zeus');
  if (boss.heaven) boss.phase = 2;
  G.boss = boss;
  const ENTRY = { storm: '#ffb0f0', zeus: '#fff6b0', apollo: '#ffe9a0' };
  if (ENTRY[site.id]) {
    // A dramatic entrance: lightning (or sunfire) crashing around them for a moment (no damage).
    G.effects.push({
      t: 0, dur: site.id === 'zeus' ? 2 : 1.4,
      draw(ctx) {
        if (Math.random() < 0.55) lightning(ctx, cxOf(boss) + rand(-260, 260), boss.ay0, cxOf(boss) + rand(-50, 50), cyOf(boss), ENTRY[site.id], 3, 12, 34);
      },
    });
    sfx('bolt');
  }
  sfx('roar');
  shake(14);
  setTheme('boss');
  announce(site.name, site.title, 3.5);
}

const cxOf = b => b.x + b.w / 2, cyOf = b => b.y + b.h / 2;
const pcx = () => G.player.x + G.player.w / 2, pcy = () => G.player.y + G.player.h / 2;

function choose(b, list) {
  const opts = list.filter(s => s !== b.last);
  const s = pick(opts.length ? opts : list);
  b.last = s;
  return s;
}

function setState(b, st, time) { b.st = st; b.stT = time; b.stDur = time; b.n = 0; b.sub = 0; }

// Telegraphed column strike (lightning, fire pillar, icicle).
// quiet: part of a big volley, so only the first column of it makes a sound.
function column(x, w, delay, kind, top, bottom, quiet) {
  const K = COLK[kind] || COLK.bolt;
  if (!quiet) sfx('warn');
  G.effects.push({
    t: 0, dur: delay + 0.45, x, w, kind, hit: false,
    update() {
      if (this.t >= delay && !this.struck) {
        this.struck = true;
        if (!quiet) { sfx(K.sfx); shake(6); }
        burst(x, bottom, quiet ? 8 : 14, K.burst, 300, { add: true });
      }
      if (this.t >= delay && this.t < delay + 0.3 && !this.hit) {
        const p = G.player;
        if (Math.abs(p.x + p.w / 2 - x) < w / 2 + p.w / 2 - 4 && p.y + p.h > top && p.y < bottom) { this.hit = true; hurtPlayer(K.dmg, x); }
      }
    },
    draw(ctx) {
      if (this.t < delay) {
        const k = this.t / delay;
        ctx.fillStyle = `rgba(${K.warn},${0.08 + 0.12 * k + (Math.floor(this.t * 14) % 2) * 0.05})`;
        ctx.fillRect(x - w / 2, top, w, bottom - top);
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        ctx.fillRect(x - w / 2, bottom - 3, w, 3);
      } else {
        const k = 1 - (this.t - delay) / 0.45;
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
        const c = K.glow;
        g.addColorStop(0, `rgba(${c},0)`);
        g.addColorStop(0.5, `rgba(255,255,255,${k})`);
        g.addColorStop(1, `rgba(${c},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x - w / 2 - 10, top, w + 20, bottom - top);
        if (K.bolt) {
          // A forked bolt with branches, fading out after the strike.
          ctx.globalAlpha = k;
          lightning(ctx, x, top, x + rand(-10, 10), bottom, K.bolt, 4, Math.max(6, Math.round((bottom - top) / 40)), w * 0.7);
          for (let i = 0; i < 3; i++) {
            const by = top + (bottom - top) * rand(0.2, 0.7);
            lightning(ctx, x + rand(-8, 8), by, x + rand(-90, 90), by + rand(60, 140), K.bolt, 1.5, 5, 18);
          }
          ctx.globalAlpha = 1;
        }
        ctx.globalCompositeOperation = 'source-over';
      }
    },
  });
}

function radial(b, n, speed, off, color, kind = 'orb', extra = {}) {
  for (let i = 0; i < n; i++) {
    const a = off + (i / n) * Math.PI * 2;
    shoot({ x: cxOf(b), y: cyOf(b), vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 8, dmg: 1, color, kind, ghost: true, life: 5, ...extra });
  }
}

function aimed(b, n, spread, speed, color, kind = 'orb', extra = {}, ox = cxOf(b), oy = cyOf(b)) {
  const a0 = Math.atan2(pcy() - oy, pcx() - ox);
  for (let i = 0; i < n; i++) {
    const a = a0 + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0);
    shoot({ x: ox, y: oy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 7, dmg: 1, color, kind, ghost: true, life: 5, ...extra });
  }
}

function floorWave(b, dir, color, sp = 420) {
  shoot({ x: cxOf(b) + dir * b.w * 0.4, y: b.ay1 - 18, vx: dir * sp, vy: 0, r: 16, dmg: 2, color, kind: 'wave', ghost: true, life: 2.4, trail: color });
}

function summon(b, type, n) {
  if (G.enemies.length > 50 || G.enemies.filter(e => e.summoned && !e.dead).length > 8) return;
  for (let i = 0; i < n; i++) {
    const lvl = b.heaven ? HEAVEN_LVL : b.id === 'hades' ? 10 : 7;
    const e = makeEnemy(type, rand(b.ax0 + 100, b.ax1 - 100), b.ay0 + 120, lvl, BIOME_LIST.indexOf(b.site.biome));
    e.summoned = true;
    G.enemies.push(e);
    burst(e.x + e.w / 2, e.y + e.h / 2, 16, b.accent, 200, { add: true });
  }
}

function laser(b, a0, sweep, dur) {
  sfx('warn');
  G.effects.push({
    t: 0, dur: dur + 0.8, a: a0,
    update(dt) {
      if (b.dead || G.boss !== b) { this.dead = true; return; }
      if (this.t > 0.8) {
        this.a += (sweep / dur) * dt;
        if (Math.random() < 0.1) sfx('beam');
        const p = G.player, ox = cxOf(b), oy = cyOf(b) - 20, dx = Math.cos(this.a), dy = Math.sin(this.a);
        const ex = pcx() - ox, ey = pcy() - oy, along = ex * dx + ey * dy, side = Math.abs(ex * dy - ey * dx);
        if (along > 0 && side < 22) hurtPlayer(2, ox);
      }
    },
    draw(ctx) {
      const ox = cxOf(b), oy = cyOf(b) - 20, L = 1600, ex = ox + Math.cos(this.a) * L, ey = oy + Math.sin(this.a) * L;
      ctx.globalCompositeOperation = 'lighter';
      const [c0, c1] = b.pal.laser;
      if (this.t < 0.8) {
        ctx.strokeStyle = `rgba(${c0},${0.3 + (Math.floor(this.t * 16) % 2) * 0.3})`;
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = `rgba(${c0},.55)`;
        ctx.lineWidth = 34;
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = `rgba(${c1},.95)`;
        ctx.lineWidth = 10;
        if (b.id === 'zeus') lightning(ctx, ox, oy, ex, ey, '#ffffff', 2.5, 30, 26);
      }
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    },
  });
}

function hoverTo(b, tx, ty, dt, k = 2) {
  b.vx += ((tx - cxOf(b)) * k - b.vx) * Math.min(1, 3 * dt);
  b.vy += ((ty - cyOf(b)) * k - b.vy) * Math.min(1, 3 * dt);
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.x = clamp(b.x, b.ax0 + 10, b.ax1 - b.w - 10);
  b.y = clamp(b.y, b.ay0 + 10, b.ay1 - b.h - 10);
}

// Arms of shots wheeling out from the boss like a pinwheel.
function spiralArms(b, arms, speed, colors, extra = {}) {
  const a0 = b.t * 2.4 * (b.spin || 1);
  for (let k = 0; k < arms; k++) {
    const a = a0 + (k / arms) * Math.PI * 2;
    shoot({ x: cxOf(b), y: cyOf(b), vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 7, dmg: 1, color: colors[k % colors.length], kind: 'orb', ghost: true, life: 5, ...extra });
  }
}

// Strikes across the whole arena with one safe gap, which the player has to reach in time.
function curtain(b, kind, gapX, delay, w = 90) {
  const n = Math.floor((b.ax1 - b.ax0 - 40) / w);
  let first = true;
  for (let i = 0; i < n; i++) {
    const x = b.ax0 + 20 + w / 2 + i * w;
    if (Math.abs(x - gapX) < w * 1.4) continue;
    column(x, w - 6, delay, kind, b.ay0, b.ay1, !first);
    first = false;
  }
}

// The same, but marching from one wall to the other.
function sweep(b, kind, fromLeft, gapX, w = 70) {
  const n = Math.floor((b.ax1 - b.ax0 - 40) / w);
  let first = true;
  for (let i = 0; i < n; i++) {
    const x = b.ax0 + 20 + w / 2 + (fromLeft ? i : n - 1 - i) * w;
    if (Math.abs(x - gapX) < w * 1.6) continue;
    column(x, w - 4, 0.8 + i * 0.06, kind, b.ay0, b.ay1, !first);
    first = false;
  }
}

// Orbs flung out across the arena, where they hang glowing before firing at the player one by one.
function hangOrbs(b, n, color, sp) {
  for (let i = 0; i < n; i++) {
    const x = rand(b.ax0 + 80, b.ax1 - 80), y = rand(b.ay0 + 60, b.ay0 + (b.ay1 - b.ay0) * 0.55);
    shoot({ x: cxOf(b), y: cyOf(b), vx: (x - cxOf(b)) * 4, vy: (y - cyOf(b)) * 4, r: 9, dmg: 1, color, kind: 'orb', ghost: true, life: 7, hang: 1.1 + i * 0.13, hangSp: sp, trail: color });
  }
}

// A rolling wall of water or ice along the floor, tall enough that it has to be jumped.
function tide(b, x, dir, color, sp = 340) {
  for (let k = 0; k < 3; k++) shoot({ x, y: b.ay1 - 18 - k * 30, vx: dir * sp, vy: 0, r: k ? 13 : 16, dmg: 2, color, kind: k ? 'orb' : 'wave', ghost: true, life: 8, trail: color });
}

// New attacks borrow the pose of an older one, so the artwork knows how to move.
const POSE = { burrow: 'leap', cyclone: 'orbs', curtain: 'bolts', spiral: 'ring', sweep: 'pillars', hang: 'meteors', quake: 'stomp', tide: 'breath', blink: 'teleport', cross: 'laser' };
// Moves fast enough to leave glowing afterimages.
const DASH = { charge: 1, dive: 1, leap: 1, chase: 1, blink: 1, teleport: 1, walk: 1 };

// Pick the next attack. Combos (charges, leaps, dives) chain more times the angrier the boss gets.
function next(b, pool, durs) {
  const s = choose(b, pool);
  setState(b, s, durs[s]);
  b.chain = b.phase - 1 + (b.heaven ? 1 : 0);
  b.spin = Math.random() < 0.5 ? 1 : -1;
  return s;
}

export function updateBoss(dt) {
  const b = G.boss;
  if (!b || b.dead) return;
  const p = G.player;
  b.t += dt; b.stT -= dt; b.flash -= dt; b.hurtT -= dt; b.roarT -= dt;
  const hpK = b.hp / b.max;
  // Every boss has three phases: enraged at 75%, final fury at 45% (the gods start enraged).
  const newPhase = b.heaven ? (hpK < 0.55 ? 3 : 2) : hpK < 0.45 ? 3 : hpK < 0.75 ? 2 : 1;
  const P = b.pal;
  if (newPhase > b.phase) {
    b.phase = newPhase;
    b.roarT = 1.1;
    sfx('roar');
    shake(18);
    ring(cxOf(b), cyOf(b), 200, b.accent, 0.6, 10);
    ring(cxOf(b), cyOf(b), 320, '#ffffff', 0.8, 6);
    floater(cxOf(b), b.y - 20, b.phase === 3 ? 'FINAL FURY' : 'ENRAGED', '#ff5a6a', 28);
    // a burst of rage that sprays shots in every direction
    if (!b.hidden) radial(b, 14 + b.phase * 4, 250, Math.random(), b.accent, 'orb', { trail: b.accent });
    b.haz = 1.5;
  }
  // how long it rests between attacks: less the angrier it is, and never for long
  const fast = (b.phase >= 3 ? 0.4 : b.phase === 2 ? 0.55 : 0.75) * (b.heaven ? 0.85 : 1);
  const mid = (b.ax0 + b.ax1) / 2, dx = pcx() - cxOf(b);
  const ox = cxOf(b), oy = cyOf(b);

  switch (b.ai) {
    case 'cerberus': {
      if (b.st === 'intro' || b.st === 'idle') {
        b.vx *= 0.85;
        b.face = dx < 0 ? -1 : 1;
        if (b.stT <= 0) {
          const pool = ['charge', 'leap', 'spit'];
          if (b.phase >= 2) pool.push('burrow', 'spit');
          if (b.phase >= 3) pool.push('burrow', 'charge');
          // a charge crosses the whole arena, so it bounces back at most once (twice for a god)
          if (next(b, pool, { charge: 0.6, leap: 0, spit: 1.6, burrow: 2.2 }) === 'charge') b.chain = Math.min(b.chain, b.heaven ? 2 : 1);
        }
      } else if (b.st === 'charge') {
        if (b.stT > 0) { b.vx = 0; if (Math.random() < 0.5) part({ x: cxOf(b) - b.face * 60, y: b.y + b.h, vx: -b.face * 100, vy: -50, life: 0.4, size: 4, color: '#8a8a6a' }); }
        else {
          b.vx = b.face * (560 + (b.phase - 1) * 120);
          if (b.hitWall) {
            shake(16); sfx('boom');
            const nr = b.chain > 0 ? 4 : 6 + b.phase * 2;
            for (let i = 0; i < nr; i++) shoot({ x: rand(b.ax0 + 60, b.ax1 - 60), y: b.ay0 + 30, vx: 0, vy: rand(100, 200), g: 700, r: 10, dmg: 1, color: P.rock, kind: 'rock', life: 3 });
            // bounce off the wall and charge straight back
            if (b.chain > 0) { b.chain--; b.face = -b.face; b.vx = 0; b.stT = b.stDur = 0.3; }
            else setState(b, 'idle', 1.1 * fast);
          }
        }
      } else if (b.st === 'leap') {
        if (b.n === 0) { b.n = 1; b.vy = -1050; b.vx = clamp(dx / 1.1, -700, 700); b.face = dx < 0 ? -1 : 1; b.air = 0; }
        b.air += dt;
        if (b.ground && b.air > 0.2) {
          shake(18); sfx('boom');
          floorWave(b, -1, P.main); floorWave(b, 1, P.main);
          burst(cxOf(b), b.y + b.h, 30, [P.rock, P.main], 300);
          b.vx = 0;
          // when angry it lands and leaps again at once
          if (b.chain > 0) { const c = b.chain - 1; setState(b, 'leap', 0); b.chain = c; }
          else setState(b, 'idle', 0.9 * fast);
        }
      } else if (b.st === 'spit') {
        b.vx *= 0.8;
        b.face = dx < 0 ? -1 : 1;
        const vol = Math.floor((1.6 - b.stT) / 0.4);
        if (vol > b.n && b.n < (b.phase >= 3 ? 4 : 3)) {
          b.n++;
          const n = b.phase > 1 ? 5 : 3;
          for (let h = 0; h < 3; h++) {
            const hx = cxOf(b) + b.face * P.mouths[h][0], hy = b.y + b.h + P.mouths[h][1];
            const tt = 0.9, gx = pcx() - hx + rand(-60, 60) + (h - 1) * 80, gy = pcy() - hy;
            shoot({ x: hx, y: hy, vx: gx / tt, vy: (gy - 0.5 * 900 * tt * tt) / tt, g: 900, r: 9, dmg: 1, color: P.main, kind: P.proj, life: 4, trail: P.trail });
          }
          if (n > 3) aimed(b, 2, 0.6, 360, P.main);
          sfx('shoot');
        }
        if (b.stT <= 0) setState(b, 'idle', 0.8 * fast);
      } else if (b.st === 'burrow') {
        // dig down out of sight, follow the player from underground, then burst up beneath them
        if (b.n === 0) { b.n = 1; b.vx = 0; shake(12); sfx('boom'); burst(cxOf(b), b.y + b.h, 34, [P.rock, P.main], 340); ring(cxOf(b), b.y + b.h, 120, P.main, 0.4, 8); }
        if (b.n === 1 && b.stT < b.stDur - 0.3) { b.n = 2; b.hidden = true; b.mx = cxOf(b); b.y = b.ay1 + 800; }
        if (b.n >= 2) {
          if (b.n === 2) b.mx += clamp(pcx() - b.mx, -560 * dt, 560 * dt);
          if (Math.random() < 0.7) part({ x: b.mx + rand(-50, 50), y: b.ay1 - 4, vx: rand(-80, 80), vy: rand(-280, -80), life: 0.5, size: rand(3, 6), color: pick([P.rock, P.main]), g: 700 });
          if (b.n === 2 && b.stT < 0.6) {
            b.n = 3;
            b.mx = clamp(b.mx, b.ax0 + b.w / 2 + 20, b.ax1 - b.w / 2 - 20);
            column(b.mx, b.w * 0.7, 0.55, P.col, b.ay1 - 360, b.ay1);
            shake(8);
          }
          if (b.n === 3 && b.stT <= 0) {
            b.hidden = false;
            b.x = b.mx - b.w / 2; b.y = b.ay1 - b.h - 4; b.vx = 0; b.face = dx < 0 ? -1 : 1;
            shake(24); sfx('boom'); sfx('roar');
            burst(b.mx, b.ay1, 40, [P.rock, P.main, '#ffffff'], 420);
            ring(b.mx, b.ay1 - 20, 160, P.main, 0.5, 10);
            for (let i = 0; i < 8 + b.phase * 2; i++) shoot({ x: b.mx + rand(-40, 40), y: b.ay1 - 40, vx: rand(-420, 420), vy: rand(-900, -500), g: 1100, r: 9, dmg: 1, color: P.rock, kind: 'rock', life: 3, ghost: true });
            setState(b, 'leap', 0); b.n = 1; b.air = 0; b.chain = 0; b.vy = -1150;
          }
        }
      }
      if (!b.hidden) {
        b.vy = Math.min(b.vy + 2200 * dt, 1200);
        moveBody(b, dt, true);
      }
      break;
    }
    case 'storm': {
      const hx = mid + Math.sin(b.t * 0.5) * (b.ax1 - b.ax0) * 0.32, hy = b.ay0 + 200 + Math.sin(b.t * 1.3) * 50;
      if (b.st === 'dive') {
        if (b.n === 0) { b.n = 1; const d = Math.hypot(pcx() - cxOf(b), pcy() - cyOf(b)) || 1, sp = 720 + b.phase * 60; b.dvx = (pcx() - cxOf(b)) / d * sp; b.dvy = (pcy() - cyOf(b)) / d * sp; }
        if (b.stT < 0.8) {
          b.x += b.dvx * dt; b.y += b.dvy * dt;
          b.x = clamp(b.x, b.ax0 + 10, b.ax1 - b.w - 10); b.y = clamp(b.y, b.ay0 + 10, b.ay1 - b.h - 10);
          if (Math.random() < 0.8) part({ x: cxOf(b), y: cyOf(b), vx: rand(-50, 50), vy: rand(-50, 50), life: 0.5, size: 6, color: P.main, add: true });
        }
        // when angry it turns and dives again, re-aimed at wherever the player went
        if (b.stT <= 0) {
          if (b.chain > 0) { const c = b.chain - 1; setState(b, 'dive', 1.0); b.chain = c; aimed(b, 5, 1.0, 320, P.alt); }
          else setState(b, 'idle', 0.7 * fast);
        }
      } else if (b.st === 'cyclone') hoverTo(b, mid, b.ay0 + 280, dt);
      else hoverTo(b, hx, hy, dt);
      b.face = dx < 0 ? -1 : 1;
      if (b.st === 'intro' || b.st === 'idle') {
        if (b.stT <= 0) {
          const pool = ['bolts', 'gust', 'dive', 'orbs'];
          if (b.phase >= 2) pool.push('summon', 'cyclone', 'curtain');
          if (b.phase >= 3) pool.push('cyclone', 'curtain', 'dive');
          next(b, pool, { bolts: 1.8, gust: 2.6, dive: 1.3, orbs: 1.4, summon: 1, cyclone: 2.8, curtain: 2.8 });
        }
      } else if (b.st === 'bolts') {
        const want = b.phase >= 3 ? 11 : b.phase > 1 ? 8 : 5;
        if (b.n < want && b.stT < 1.8 - b.n * 0.13) {
          const x = b.n % 3 === 0 ? pcx() : rand(b.ax0 + 60, b.ax1 - 60);
          column(x, 70, 0.85, P.col, b.ay0, b.ay1);
          b.n++;
        }
        if (b.stT <= 0) setState(b, 'idle', 0.6 * fast);
      } else if (b.st === 'gust') {
        if (b.n === 0) { b.n = 1; b.gdir = pcx() < mid ? -1 : 1; sfx('dash'); }
        G.windForce = b.gdir * 1300;
        if (Math.random() < 0.6) part({ x: b.gdir > 0 ? b.ax0 : b.ax1, y: rand(b.ay0, b.ay1), vx: b.gdir * 900, vy: 0, life: 1.4, size: 3, color: P.streak, shape: 'streak' });
        if (Math.random() < dt * (3 + b.phase * 2)) shoot({ x: b.gdir > 0 ? b.ax0 + 30 : b.ax1 - 30, y: rand(b.ay0 + 60, b.ay1 - 40), vx: b.gdir * 380, vy: 0, r: 7, dmg: 1, color: P.main, kind: 'orb', ghost: true, life: 5 });
        if (b.stT <= 0) { G.windForce = 0; setState(b, 'idle', 0.6 * fast); }
      } else if (b.st === 'orbs') {
        if (b.stT < 1.2 && b.n === 0) { b.n = 1; aimed(b, 7, 1.2, 330, P.main); sfx('shoot'); }
        if (b.stT < 0.6 && b.n === 1 && b.phase > 1) { b.n = 2; aimed(b, 9, 1.6, 300, P.alt, 'orb', { accel: 0.5 }); sfx('shoot'); }
        if (b.stT < 0.2 && b.n === 2 && b.phase > 2) { b.n = 3; radial(b, 16, 260, Math.random(), P.main); sfx('shoot'); }
        if (b.stT <= 0) setState(b, 'idle', 0.6 * fast);
      } else if (b.st === 'summon') {
        if (b.n === 0) { b.n = 1; summon(b, P.minion, 2 + b.phase); }
        if (b.stT <= 0) setState(b, 'idle', 0.5);
      } else if (b.st === 'cyclone') {
        // a whirling storm of shots from the middle of the arena
        b.sub -= dt;
        if (b.stT < b.stDur - 0.5 && b.stT > 0.3 && b.sub <= 0) {
          b.sub = 0.1;
          spiralArms(b, b.phase >= 3 ? 4 : 3, 230, [P.main, P.alt]);
          if (b.n++ % 3 === 0) sfx('shoot');
        }
        if (b.stT <= 0) setState(b, 'idle', 0.7 * fast);
      } else if (b.st === 'curtain') {
        // the whole sky comes down, twice, with one gap each time
        if (b.n === 0) { b.n = 1; b.gap = clamp(pcx() + rand(-300, 300), b.ax0 + 150, b.ax1 - 150); curtain(b, P.col, b.gap, 1.25); }
        if (b.n === 1 && b.stT < 1.5) { b.n = 2; curtain(b, P.col, clamp(b.gap + (b.gap < mid ? 1 : -1) * rand(240, 400), b.ax0 + 150, b.ax1 - 150), 1.3); }
        if (b.stT <= 0) setState(b, 'idle', 0.6 * fast);
      }
      break;
    }
    case 'heretic': {
      const still = b.st === 'spiral' || b.st === 'hang';
      const hx = b.st === 'chase' ? pcx() : still ? mid : mid + Math.sin(b.t * 0.4) * (b.ax1 - b.ax0) * 0.3;
      const hy = b.st === 'chase' ? pcy() - 160 : b.ay0 + 210 + Math.sin(b.t) * 30;
      hoverTo(b, hx, hy, dt, b.st === 'chase' ? 1.4 + b.phase * 0.2 : 2);
      b.face = dx < 0 ? -1 : 1;
      if (Math.random() < 0.6) part({ x: cxOf(b) + rand(-40, 40), y: b.y + rand(0, 30), vx: rand(-20, 20), vy: rand(-140, -60), life: rand(0.4, 0.9), size: rand(3, 7), color: pick(P.fx), add: true });
      if (b.st === 'intro' || b.st === 'idle') {
        if (b.stT <= 0) {
          const pool = ['ring', 'meteors', 'pillars', 'chase'];
          if (b.phase >= 2) pool.push('spiral', 'sweep');
          if (b.phase >= 3) pool.push('hang', 'spiral', 'sweep');
          next(b, pool, { ring: 1.6, meteors: 2.2, pillars: 1.8, chase: 2.6, spiral: 2.6, sweep: 2.4, hang: 2.6 });
        }
      } else if (b.st === 'ring') {
        const want = b.phase + 1;
        if (b.n < want && b.stT < 1.6 - b.n * 0.4) { radial(b, b.phase > 1 ? 18 : 14, 240, b.n * 0.2, P.main, 'orb', { trail: P.trail, curve: b.n % 2 ? 0.35 : -0.35 }); b.n++; sfx('fire'); }
        if (b.stT <= 0) setState(b, 'idle', 0.7 * fast);
      } else if (b.st === 'meteors') {
        const want = b.phase >= 3 ? 16 : b.phase > 1 ? 12 : 8;
        if (b.n < want && b.stT < 2.2 - b.n * 0.12) {
          const x = b.n % 3 === 0 ? pcx() : rand(b.ax0 + 40, b.ax1 - 40);
          shoot({ x, y: b.ay0 + 20, vx: rand(-40, 40), vy: 200, g: 500, r: 12, dmg: 2, color: P.met, kind: P.spear ? 'spear' : 'meteor', life: 4, trail: P.metTrail, ghost: !!P.spear });
          b.n++;
        }
        if (b.stT <= 0) setState(b, 'idle', 0.7 * fast);
      } else if (b.st === 'pillars') {
        if (b.n === 0) {
          b.n = 1;
          const k = b.phase >= 3 ? 8 : b.phase > 1 ? 6 : 4;
          for (let i = 0; i < k; i++) column(i === 0 ? pcx() : rand(b.ax0 + 60, b.ax1 - 60), 64, 0.9 + i * 0.12, P.col, b.ay1 - 300, b.ay1);
        }
        if (b.stT <= 0) setState(b, 'idle', 0.8 * fast);
      } else if (b.st === 'chase') {
        b.sub -= dt;
        if (b.sub <= 0) { b.sub = 0.3 * fast; shoot({ x: cxOf(b), y: b.y + b.h, vx: rand(-60, 60), vy: 120, g: 600, r: 8, dmg: 1, color: P.main, kind: 'orb', life: 3, trail: P.trail }); }
        if (b.stT <= 0) setState(b, 'idle', 0.6 * fast);
      } else if (b.st === 'spiral') {
        // curling arms of fire that wind out across the arena
        b.sub -= dt;
        if (b.stT > 0.3 && b.sub <= 0) {
          b.sub = 0.08;
          spiralArms(b, b.phase >= 3 ? 3 : 2, 200, [P.main, P.trail], { curve: 0.5 * b.spin });
          if (b.n++ % 3 === 0) sfx('fire');
        }
        if (b.stT <= 0) setState(b, 'idle', 0.7 * fast);
      } else if (b.st === 'sweep') {
        // a wall of pillars marches across the arena; only one gap to hide in
        if (b.n === 0) { b.n = 1; sweep(b, P.col, pcx() > mid, clamp(pcx() + rand(-260, 260), b.ax0 + 120, b.ax1 - 120)); }
        if (b.stT <= 0) setState(b, 'idle', 0.6 * fast);
      } else if (b.st === 'hang') {
        if (b.n === 0) { b.n = 1; hangOrbs(b, b.phase >= 3 ? 12 : 9, P.main, 440); sfx('portal'); ring(cxOf(b), cyOf(b), 160, P.main, 0.5, 8); }
        if (b.stT <= 0) setState(b, 'idle', 0.6 * fast);
      }
      break;
    }
    case 'titan': {
      b.vx *= 0.9;
      if (b.st === 'intro' || b.st === 'idle') {
        b.face = dx < 0 ? -1 : 1;
        if (b.stT <= 0) {
          const pool = ['stomp', 'shards', 'breath', 'walk'];
          if (b.phase >= 2) pool.push('quake', 'tide');
          if (b.phase >= 3) pool.push('quake', 'tide', 'shards');
          next(b, pool, { stomp: 1.4, shards: 1.6, breath: 1.8, walk: 2, quake: 2.1, tide: 1.7 });
        }
      } else if (b.st === 'stomp') {
        if (b.stT < 0.7 && b.n === 0) {
          b.n = 1;
          shake(22); sfx('boom');
          floorWave(b, -1, P.main); floorWave(b, 1, P.main);
          const k = b.phase >= 3 ? 15 : b.phase > 1 ? 12 : 8;
          for (let i = 0; i < k; i++) column(i === 0 ? pcx() : rand(b.ax0 + 50, b.ax1 - 50), 40, 0.7 + i * 0.07, P.col, b.ay0, b.ay1, i > 0);
        }
        if (b.stT <= 0) setState(b, 'idle', 0.7 * fast);
      } else if (b.st === 'shards') {
        const want = b.phase >= 3 ? 4 : b.phase > 1 ? 3 : 2;
        if (b.n < want && b.stT < 1.4 - b.n * 0.35) { aimed(b, 9, 1.3, 430, P.shard, 'shard', { tip: P.shard }, cxOf(b) + b.face * 40, b.y + 40); b.n++; sfx('shoot'); }
        if (b.stT <= 0) setState(b, 'idle', 0.7 * fast);
      } else if (b.st === 'breath') {
        b.sub -= dt;
        if (b.stT < 1.5 && b.sub <= 0) {
          b.sub = b.phase >= 3 ? 0.045 : 0.06;
          const ox = cxOf(b) + b.face * 50, oy = b.y + 50, a = Math.atan2(pcy() - oy, pcx() - ox) + rand(-0.35, 0.35), s = rand(260, 380);
          shoot({ x: ox, y: oy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 7, dmg: 1, color: P.breath, kind: 'orb', ghost: true, life: 2.2, freeze: P.freeze });
          if (Math.random() < 0.3) sfx('dash');
        }
        if (b.stT <= 0) setState(b, 'idle', 0.7 * fast);
      } else if (b.st === 'walk') {
        const target = cxOf(b) < mid ? b.ax1 - b.w / 2 - 60 : b.ax0 + b.w / 2 + 60;
        b.face = target > cxOf(b) ? 1 : -1;
        b.vx = b.face * (260 + b.phase * 40);
        if (Math.floor(b.t * 2.5) !== Math.floor((b.t - dt) * 2.5)) {
          shake(7); sfx('land');
          // every heavy step shakes something loose from the ceiling
          if (b.phase > 1) shoot({ x: pcx() + rand(-120, 120), y: b.ay0 + 24, vx: 0, vy: 60, g: 900, r: 9, dmg: 1, color: P.shard, kind: 'shard', tip: P.shard, life: 3 });
        }
        if (Math.abs(target - cxOf(b)) < 30 || b.stT <= 0 || b.hitWall) setState(b, 'idle', 0.4);
      } else if (b.st === 'quake') {
        // three stomps in a row: fast and slow shockwaves to hop over, and the ceiling falling in
        const marks = [1.8, 1.2, 0.6];
        if (b.n < 3 && b.stT < marks[b.n]) {
          b.n++;
          shake(20); sfx('boom');
          const sp = b.n === 2 ? 290 : 470;
          floorWave(b, -1, P.main, sp); floorWave(b, 1, P.main, sp);
          for (let i = 0; i < 3 + b.phase; i++) shoot({ x: i === 0 ? pcx() : rand(b.ax0 + 50, b.ax1 - 50), y: b.ay0 + 24, vx: 0, vy: 60, g: 900, r: 9, dmg: 1, color: P.shard, kind: 'shard', tip: P.shard, life: 3 });
          burst(cxOf(b), b.y + b.h, 24, [P.main, '#ffffff'], 300);
          ring(cxOf(b), b.y + b.h, 140, P.main, 0.4, 8);
        }
        if (b.stT <= 0) setState(b, 'idle', 0.8 * fast);
      } else if (b.st === 'tide') {
        // a great rolling wave; when furious, a second one rolls in from the far wall
        if (b.n === 0 && b.stT < 1.1) { b.n = 1; b.tdir = pcx() > cxOf(b) ? 1 : -1; tide(b, cxOf(b) + b.tdir * b.w * 0.5, b.tdir, P.breath); shake(12); sfx('boom'); }
        if (b.n === 1 && b.phase >= 3 && b.stT < 0.2) { b.n = 2; tide(b, b.tdir > 0 ? b.ax1 - 30 : b.ax0 + 30, -b.tdir, P.main, 300); sfx('boom'); }
        if (b.stT <= 0) setState(b, 'idle', 0.7 * fast);
      }
      b.vy = Math.min(b.vy + 2200 * dt, 1200);
      moveBody(b, dt, true);
      break;
    }
    case 'hades': {
      const hx = mid + Math.sin(b.t * 0.35) * (b.ax1 - b.ax0) * 0.3, hy = b.ay0 + 230 + Math.sin(b.t * 0.9) * 40;
      if (b.st !== 'teleport' && b.st !== 'blink') hoverTo(b, hx, hy, dt, 1.6);
      b.face = dx < 0 ? -1 : 1;
      if (Math.random() < 0.7) part({ x: cxOf(b) + rand(-30, 30), y: b.y + rand(0, 20), vx: rand(-20, 20), vy: rand(-160, -60), life: rand(0.4, 0.8), size: rand(3, 7), color: pick(P.fx), add: true });
      if (b.st === 'intro' || b.st === 'idle') {
        if (b.stT <= 0) {
          const pool = ['ring', 'laser', 'summon'];
          if (b.phase >= 2) pool.push('bolts', 'teleport', 'laser', 'blink', 'spiral');
          if (b.phase >= 3) pool.push('meteors', 'ring', 'cross', 'hang', 'cross');
          next(b, pool, { ring: 1.8, laser: 3.4, summon: 1, bolts: 1.8, teleport: 1, meteors: 2.2, blink: 1.9, spiral: 2.6, cross: 3.6, hang: 2.6 });
        }
      } else if (b.st === 'ring') {
        const want = b.phase + 1;
        if (b.n < want && b.stT < 1.8 - b.n * 0.4) { radial(b, 16 + b.phase * 2, 230 + b.phase * 20, b.n * 0.3, b.n % 2 ? P.main : P.alt, 'orb', { trail: P.trail, curve: b.phase >= 3 ? (b.n % 2 ? 0.4 : -0.4) : 0 }); b.n++; sfx('fire'); }
        if (b.stT <= 0) setState(b, 'idle', 0.7 * fast);
      } else if (b.st === 'laser') {
        if (b.n === 0) {
          b.n = 1;
          const a = Math.atan2(pcy() - cyOf(b), pcx() - cxOf(b)), dir = Math.random() < 0.5 ? 1 : -1;
          laser(b, a - dir * 0.9, dir * 2.0, 2.2);
          if (b.phase >= 3) laser(b, a + Math.PI + dir * 0.9, -dir * 2.0, 2.2);
        }
        if (b.stT <= 0) setState(b, 'idle', 0.6 * fast);
      } else if (b.st === 'summon') {
        if (b.n === 0) { b.n = 1; summon(b, pick(P.minions), 2 + b.phase); }
        if (b.stT <= 0) setState(b, 'idle', 0.6);
      } else if (b.st === 'bolts') {
        const want = 6 + b.phase * 2;
        if (b.n < want && b.stT < 1.8 - b.n * 0.11) { column(b.n % 3 === 0 ? pcx() : rand(b.ax0 + 60, b.ax1 - 60), 70, 0.85, b.id === 'zeus' ? 'zap' : 'bolt', b.ay0, b.ay1); b.n++; }
        if (b.stT <= 0) setState(b, 'idle', 0.6 * fast);
      } else if (b.st === 'teleport') {
        if (b.n === 0 && b.stT < 0.6) {
          b.n = 1;
          burst(cxOf(b), cyOf(b), 30, [P.main, '#ffffff'], 300, { add: true });
          b.x = (cxOf(b) < mid ? b.ax1 - 300 : b.ax0 + 300) - b.w / 2;
          b.y = b.ay0 + 160;
          b.vx = b.vy = 0;
          burst(cxOf(b), cyOf(b), 30, [P.main, '#ffffff'], 300, { add: true });
          sfx('portal');
          aimed(b, 5, 0.8, 380, P.main);
        }
        if (b.stT <= 0) setState(b, 'idle', 0.5);
      } else if (b.st === 'meteors') {
        if (b.n < 14 && b.stT < 2.2 - b.n * 0.12) {
          shoot({ x: b.n % 3 === 0 ? pcx() : rand(b.ax0 + 40, b.ax1 - 40), y: b.ay0 + 20, vx: rand(-40, 40), vy: 220, g: 520, r: 12, dmg: 2, color: P.met, kind: 'meteor', life: 4, trail: P.metTrail });
          b.n++;
        }
        if (b.stT <= 0) setState(b, 'idle', 0.7 * fast);
      } else if (b.st === 'blink') {
        // three quick jumps around the arena, firing from each spot
        const marks = [1.6, 1.1, 0.6];
        if (b.n < 3 && b.stT < marks[b.n]) {
          b.n++;
          burst(cxOf(b), cyOf(b), 24, [P.main, '#ffffff'], 300, { add: true });
          b.x = rand(b.ax0 + 120, b.ax1 - 120 - b.w); b.y = rand(b.ay0 + 60, b.ay0 + 260); b.vx = b.vy = 0;
          burst(cxOf(b), cyOf(b), 24, [P.main, '#ffffff'], 300, { add: true });
          ring(cxOf(b), cyOf(b), 100, P.main, 0.3, 6);
          sfx('portal');
          aimed(b, 3 + b.phase, 0.7, 400, P.main);
          radial(b, 8, 200, b.n * 0.4, P.alt);
        }
        if (b.stT <= 0) setState(b, 'idle', 0.6 * fast);
      } else if (b.st === 'spiral') {
        b.sub -= dt;
        if (b.stT > 0.3 && b.sub <= 0) {
          b.sub = 0.085;
          spiralArms(b, 3, 210, [P.main, P.alt], { curve: 0.4 * b.spin, trail: P.trail });
          if (b.n++ % 3 === 0) sfx('fire');
        }
        if (b.stT <= 0) setState(b, 'idle', 0.7 * fast);
      } else if (b.st === 'cross') {
        // four beams in a cross, turning together; stand in the gaps between them
        if (b.n === 0) {
          b.n = 1;
          const a = Math.random() * Math.PI, dir = Math.random() < 0.5 ? 1 : -1;
          for (let k = 0; k < 4; k++) laser(b, a + k * Math.PI / 2, dir * 1.0, 2.4);
        }
        if (b.stT <= 0) setState(b, 'idle', 0.6 * fast);
      } else if (b.st === 'hang') {
        if (b.n === 0) { b.n = 1; hangOrbs(b, 12, P.main, 460); sfx('portal'); ring(cxOf(b), cyOf(b), 180, P.main, 0.5, 8); }
        if (b.stT <= 0) setState(b, 'idle', 0.6 * fast);
      }
      break;
    }
  }
  if (b.ai === 'storm' && b.st !== 'gust') G.windForce = 0;
  if (!p.dead && !b.hidden && overlap(b, p) && p.dashT <= 0) hurtPlayer(2, cxOf(b));

  // Final fury: the arena itself turns on the player, striking wherever they stand.
  if (b.phase >= 3 && !b.hidden) {
    b.haz = (b.haz ?? 1.5) - dt;
    if (b.haz <= 0) { b.haz = b.heaven ? 2.6 : 3.4; column(pcx(), 84, 0.95, P.col || (b.id === 'zeus' ? 'zap' : 'bolt'), b.ay0, b.ay1); }
    if (Math.random() < 0.5) part({ x: cxOf(b) + rand(-b.w / 2, b.w / 2), y: b.y + b.h * rand(0.2, 1), vx: rand(-30, 30), vy: rand(-220, -90), life: rand(0.5, 1), size: rand(3, 6), color: b.accent, add: true });
  }
  // glowing afterimages trail behind fast moves
  const mv = Math.hypot(cxOf(b) - ox, cyOf(b) - oy) / Math.max(dt, 1e-3);
  if (DASH[b.st] && mv > 320 && !b.hidden) {
    b.ghT = (b.ghT || 0) - dt;
    if (b.ghT <= 0) { b.ghT = 0.035; (b.ghosts = b.ghosts || []).push({ x: cxOf(b), y: cyOf(b), t: G.t }); }
  }
  if (b.ghosts && b.ghosts.length) b.ghosts = b.ghosts.filter(g => G.t - g.t < 0.3);

  // Reset if the player leaves the arena.
  const inside = pcx() > b.ax0 - 40 && pcx() < b.ax1 + 40 && pcy() > b.ay0 - 40 && pcy() < b.ay1 + 60;
  b.out = inside ? 0 : b.out + dt;
  if (b.out > 4 || p.dead) {
    G.boss = null;
    G.windForce = 0;
    G.effects.length = 0;
    for (const e of G.enemies) if (e.summoned) e.dead = true;
  }
}

export function bossDefeated(b) {
  b.dead = true;
  b.dieAt = G.t;
  G.windForce = 0;
  const cx = cxOf(b), cy = cyOf(b);
  sfx('roar');
  shake(26);
  G.hitstop = 0.25;
  for (let i = 0; i < 6; i++) setTimeout(() => {
    burst(cx + rand(-60, 60), cy + rand(-60, 60), 40, [b.accent, b.tint, '#ffffff', ...RAINBOW], 520, { add: true, g: 120 });
    ring(cx, cy, 120 + i * 50, i % 2 ? '#ffffff' : b.accent, 0.6, 10);
    sfx('boom');
  }, i * 180);
  dropGems(cx, cy, b.id === 'zeus' ? 1000 : b.id === 'hades' ? 600 : b.site.god ? 320 : 220);
  for (const e of G.enemies) if (e.summoned) e.dead = true;
  G.effects.length = 0;
  setTimeout(() => { if (G.boss === b) G.boss = null; onBossDefeated(b); }, 1300);
}

// ---------- Drawing ----------
export function drawBoss(ctx, t) {
  const b = G.boss;
  if (!b || b.hidden) return;
  // Glowing afterimages behind fast moves, and a pulsing aura of rage once enraged.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const R = Math.max(b.w, b.h) * 0.6;
  for (const g of b.ghosts || []) {
    ctx.globalAlpha = Math.max(0, 1 - (t - g.t) / 0.3) * 0.45;
    glow(ctx, g.x, g.y, R, b.accent);
  }
  if (b.phase > 1 && !b.dead) {
    const pulse = 0.5 + 0.5 * Math.sin(t * (b.phase >= 3 ? 9 : 5));
    ctx.globalAlpha = (b.phase >= 3 ? 0.5 : 0.28) * (0.7 + 0.3 * pulse);
    glow(ctx, cxOf(b), cyOf(b), R * (1.25 + 0.15 * pulse), b.phase >= 3 ? '#ff3a4a' : b.accent);
  }
  ctx.restore();
  // New attacks borrow an older attack's pose while the artwork is drawn.
  const realSt = b.st;
  b.st = POSE[realSt] || realSt;
  // The mood: where the player is (in facing space), how far into the attack, hurt, roaring, dying.
  const m = ART.mood(b, t, (pcx() - cxOf(b)) * b.face, pcy() - cyOf(b));
  const fl = b.flash > 0 || (b.dead && m.dying < 0.12);
  ctx.save();
  ctx.translate(cxOf(b), b.y + b.h);
  ctx.scale(b.face, 1);
  if (m.hurt) ctx.translate(-m.hurt * m.hurt * 8, 0);
  if (b.dead) {
    ctx.translate((Math.random() - 0.5) * 12 * (1 - m.dying), 0);
    ctx.globalAlpha = 1 - m.dying * m.dying;
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ART[b.id](ctx, b, t, fl, m);
  ctx.restore();
  b.st = realSt;
}

function glow(ctx, x, y, r, col) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// Projectile shape for floor waves and rocks.
export function drawBossBar(ctx, W, H) {
  const b = G.boss;
  if (!b || b.dead) return;
  const w = Math.min(640, W - 80), x = (W - w) / 2, y = H - 54;
  ctx.fillStyle = 'rgba(8,4,14,.75)';
  ctx.fillRect(x - 4, y - 24, w + 8, 40);
  ctx.font = '700 16px Cinzel, serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f3e7ff';
  ctx.fillText(b.name.toUpperCase() + '  ·  ' + b.title, W / 2, y - 6);
  ctx.fillStyle = '#2a1424';
  ctx.fillRect(x, y, w, 10);
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, '#ff2a4a');
  g.addColorStop(1, b.accent);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w * Math.max(0, b.hp / b.max), 10);
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.strokeRect(x - 0.5, y - 0.5, w + 1, 11);
}
