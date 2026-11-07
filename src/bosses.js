// Boss fights: Cerberus, Semiramis, Farinata, Ephialtes and Hades.
import { G } from './state.js';
import { T, BIOMES, SITES } from './world.js';
import { moveBody } from './physics.js';
import { rand, pick, clamp, shade, overlap, RAINBOW } from './util.js';
import { burst, part, ring, shake, floater } from './fx.js';
import { sfx, setTheme } from './audio.js';
import { hurtPlayer, shoot, dropGems } from './combat.js';
import { makeEnemy } from './enemies.js';
import { announce, onBossDefeated } from './main.js';
import * as ART from './bossart.js';
import { lightning } from './art.js';

const SIZES = { cerberus: [170, 104], storm: [80, 120], heretic: [110, 92], titan: [150, 220], hades: [110, 160] };
const FLYING = { storm: 1, heretic: 1, hades: 1 };

export function spawnBoss(site) {
  const [w, h] = SIZES[site.id], B = BIOMES[site.biome];
  const ax0 = (site.tx - site.w / 2) * T, ax1 = (site.tx + site.w / 2 + 1) * T;
  const ay0 = (site.ty - site.h / 2) * T, ay1 = (site.ty + site.h / 2 + 1) * T;
  const p = G.player, left = p.x < (ax0 + ax1) / 2;
  const boss = {
    boss: true, site, id: site.id, name: site.name, title: site.title, w, h,
    x: left ? ax1 - w - 120 : ax0 + 120, y: FLYING[site.id] ? ay0 + 120 : ay1 - h - 4,
    vx: 0, vy: 0, hp: site.hp, max: site.hp, face: left ? -1 : 1, t: 0, st: 'intro', stT: 1.6, stDur: 1.6, last: '', phase: 1,
    flash: 0, hurtT: 0, roarT: 0, seed: Math.random() * 5, dead: false, ground: false, tint: B.tint, accent: B.accent, ax0, ax1, ay0, ay1, level: 10, n: 0, out: 0,
  };
  G.boss = boss;
  if (site.id === 'storm') {
    // Her entrance: a storm of lightning around her for a moment (no damage).
    G.effects.push({
      t: 0, dur: 1.4,
      draw(ctx) {
        if (Math.random() < 0.55) lightning(ctx, cxOf(boss) + rand(-260, 260), boss.ay0, cxOf(boss) + rand(-50, 50), cyOf(boss), '#ffb0f0', 3, 12, 34);
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
function column(x, w, delay, kind, top, bottom) {
  sfx('warn');
  G.effects.push({
    t: 0, dur: delay + 0.45, x, w, kind, hit: false,
    update() {
      if (this.t >= delay && !this.struck) {
        this.struck = true;
        sfx(kind === 'fire' ? 'fire' : 'bolt');
        shake(6);
        burst(x, bottom, 14, kind === 'ice' ? ['#e8fbff', '#9fd4f5'] : kind === 'fire' ? ['#ffe36b', '#ff6a1a'] : ['#ffffff', '#ff8ad8'], 300, { add: true });
      }
      if (this.t >= delay && this.t < delay + 0.3 && !this.hit) {
        const p = G.player;
        if (Math.abs(p.x + p.w / 2 - x) < w / 2 + p.w / 2 - 4 && p.y + p.h > top && p.y < bottom) { this.hit = true; hurtPlayer(kind === 'fire' ? 2 : 1, x); }
      }
    },
    draw(ctx) {
      if (this.t < delay) {
        const k = this.t / delay;
        ctx.fillStyle = `rgba(255,${kind === 'ice' ? 220 : 60},${kind === 'ice' ? 255 : 80},${0.08 + 0.12 * k + (Math.floor(this.t * 14) % 2) * 0.05})`;
        ctx.fillRect(x - w / 2, top, w, bottom - top);
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        ctx.fillRect(x - w / 2, bottom - 3, w, 3);
      } else {
        const k = 1 - (this.t - delay) / 0.45;
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
        const c = kind === 'fire' ? '255,140,40' : kind === 'ice' ? '170,230,255' : '255,160,230';
        g.addColorStop(0, `rgba(${c},0)`);
        g.addColorStop(0.5, `rgba(255,255,255,${k})`);
        g.addColorStop(1, `rgba(${c},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x - w / 2 - 10, top, w + 20, bottom - top);
        if (kind === 'bolt') {
          // A forked bolt with branches, fading out after the strike.
          ctx.globalAlpha = k;
          lightning(ctx, x, top, x + rand(-10, 10), bottom, '#ffb0f0', 4, Math.max(6, Math.round((bottom - top) / 40)), w * 0.7);
          for (let i = 0; i < 3; i++) {
            const by = top + (bottom - top) * rand(0.2, 0.7);
            lightning(ctx, x + rand(-8, 8), by, x + rand(-90, 90), by + rand(60, 140), '#ffb0f0', 1.5, 5, 18);
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

function floorWave(b, dir, color) {
  shoot({ x: cxOf(b) + dir * b.w * 0.4, y: b.ay1 - 18, vx: dir * 420, vy: 0, r: 16, dmg: 2, color, kind: 'wave', ghost: true, life: 2.4, trail: color });
}

function summon(b, type, n) {
  if (G.enemies.length > 30) return;
  for (let i = 0; i < n; i++) {
    const e = makeEnemy(type, rand(b.ax0 + 100, b.ax1 - 100), b.ay0 + 120, b.id === 'hades' ? 10 : 7, ['limbo', 'lust', 'gluttony', 'heresy', 'treachery', 'abyss'].indexOf(b.site.biome));
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
      if (this.t < 0.8) {
        ctx.strokeStyle = `rgba(255,60,80,${0.3 + (Math.floor(this.t * 16) % 2) * 0.3})`;
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = 'rgba(255,50,70,.55)';
        ctx.lineWidth = 34;
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,220,220,.95)';
        ctx.lineWidth = 10;
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

export function updateBoss(dt) {
  const b = G.boss;
  if (!b || b.dead) return;
  const p = G.player;
  b.t += dt; b.stT -= dt; b.flash -= dt; b.hurtT -= dt; b.roarT -= dt;
  const hpK = b.hp / b.max;
  const newPhase = b.id === 'hades' ? (hpK < 0.25 ? 3 : hpK < 0.6 ? 2 : 1) : hpK < 0.5 ? 2 : 1;
  if (newPhase > b.phase) {
    b.phase = newPhase;
    b.roarT = 1.1;
    sfx('roar');
    shake(14);
    ring(cxOf(b), cyOf(b), 200, b.accent, 0.6, 10);
    floater(cxOf(b), b.y - 20, b.phase === 3 ? 'FINAL FURY' : 'ENRAGED', '#ff5a6a', 24);
  }
  const fast = b.phase > 1 ? 0.75 : 1;
  const mid = (b.ax0 + b.ax1) / 2, dx = pcx() - cxOf(b);

  switch (b.id) {
    case 'cerberus': {
      if (b.st === 'intro' || b.st === 'idle') {
        b.vx *= 0.85;
        b.face = dx < 0 ? -1 : 1;
        if (b.stT <= 0) {
          const s = choose(b, b.phase > 1 ? ['charge', 'leap', 'spit', 'spit'] : ['charge', 'leap', 'spit']);
          setState(b, s, s === 'charge' ? 0.6 : s === 'leap' ? 0 : 1.6);
        }
      } else if (b.st === 'charge') {
        if (b.stT > 0) { b.vx = 0; if (Math.random() < 0.5) part({ x: cxOf(b) - b.face * 60, y: b.y + b.h, vx: -b.face * 100, vy: -50, life: 0.4, size: 4, color: '#8a8a6a' }); }
        else {
          b.vx = b.face * (560 + (b.phase - 1) * 120);
          if (b.hitWall) {
            shake(16); sfx('boom');
            for (let i = 0; i < 6 + b.phase * 2; i++) shoot({ x: rand(b.ax0 + 60, b.ax1 - 60), y: b.ay0 + 30, vx: 0, vy: rand(100, 200), g: 700, r: 10, dmg: 1, color: '#9a8f6a', kind: 'rock', life: 3 });
            setState(b, 'idle', 1.1 * fast);
          }
        }
      } else if (b.st === 'leap') {
        if (b.n === 0) { b.n = 1; b.vy = -1050; b.vx = clamp(dx / 1.1, -700, 700); b.face = dx < 0 ? -1 : 1; b.air = 0; }
        b.air += dt;
        if (b.ground && b.air > 0.2) {
          shake(18); sfx('boom');
          floorWave(b, -1, '#b6ff6b'); floorWave(b, 1, '#b6ff6b');
          burst(cxOf(b), b.y + b.h, 30, ['#9a8f6a', '#b6ff6b'], 300);
          b.vx = 0;
          setState(b, 'idle', 0.9 * fast);
        }
      } else if (b.st === 'spit') {
        b.vx *= 0.8;
        b.face = dx < 0 ? -1 : 1;
        const vol = Math.floor((1.6 - b.stT) / 0.4);
        if (vol > b.n && b.n < 3) {
          b.n++;
          const n = b.phase > 1 ? 5 : 3;
          for (let h = 0; h < 3; h++) {
            const MOUTH = [[100, -140], [134, -98], [114, -54]], hx = cxOf(b) + b.face * MOUTH[h][0], hy = b.y + b.h + MOUTH[h][1];
            const tt = 0.9, gx = pcx() - hx + rand(-60, 60) + (h - 1) * 80, gy = pcy() - hy;
            shoot({ x: hx, y: hy, vx: gx / tt, vy: (gy - 0.5 * 900 * tt * tt) / tt, g: 900, r: 9, dmg: 1, color: '#b6ff6b', kind: 'glob', life: 4, trail: '#6fae3a' });
          }
          if (n > 3) aimed(b, 2, 0.6, 360, '#b6ff6b');
          sfx('shoot');
        }
        if (b.stT <= 0) setState(b, 'idle', 0.8 * fast);
      }
      b.vy = Math.min(b.vy + 2200 * dt, 1200);
      moveBody(b, dt, true);
      break;
    }
    case 'storm': {
      const hx = mid + Math.sin(b.t * 0.5) * (b.ax1 - b.ax0) * 0.32, hy = b.ay0 + 200 + Math.sin(b.t * 1.3) * 50;
      if (b.st === 'dive') {
        if (b.n === 0) { b.n = 1; const d = Math.hypot(pcx() - cxOf(b), pcy() - cyOf(b)) || 1; b.dvx = (pcx() - cxOf(b)) / d * 720; b.dvy = (pcy() - cyOf(b)) / d * 720; }
        if (b.stT < 0.8) {
          b.x += b.dvx * dt; b.y += b.dvy * dt;
          b.x = clamp(b.x, b.ax0 + 10, b.ax1 - b.w - 10); b.y = clamp(b.y, b.ay0 + 10, b.ay1 - b.h - 10);
          if (Math.random() < 0.8) part({ x: cxOf(b), y: cyOf(b), vx: rand(-50, 50), vy: rand(-50, 50), life: 0.5, size: 6, color: '#ff8ad8', add: true });
        }
        if (b.stT <= 0) setState(b, 'idle', 0.7 * fast);
      } else {
        hoverTo(b, hx, hy, dt);
      }
      b.face = dx < 0 ? -1 : 1;
      if (b.st === 'intro' || b.st === 'idle') {
        if (b.stT <= 0) {
          const s = choose(b, b.phase > 1 ? ['bolts', 'gust', 'dive', 'orbs', 'summon', 'bolts'] : ['bolts', 'gust', 'dive', 'orbs']);
          setState(b, s, { bolts: 1.8, gust: 2.6, dive: 1.3, orbs: 1.4, summon: 1 }[s]);
        }
      } else if (b.st === 'bolts') {
        const want = b.phase > 1 ? 8 : 5;
        if (b.n < want && b.stT < 1.8 - b.n * 0.14) {
          const x = b.n === 0 ? pcx() : rand(b.ax0 + 60, b.ax1 - 60);
          column(x, 70, 0.85, 'bolt', b.ay0, b.ay1);
          b.n++;
        }
        if (b.stT <= 0) setState(b, 'idle', 0.6 * fast);
      } else if (b.st === 'gust') {
        if (b.n === 0) { b.n = 1; b.gdir = pcx() < mid ? -1 : 1; sfx('dash'); }
        G.windForce = b.gdir * 1300;
        if (Math.random() < 0.6) part({ x: b.gdir > 0 ? b.ax0 : b.ax1, y: rand(b.ay0, b.ay1), vx: b.gdir * 900, vy: 0, life: 1.4, size: 3, color: 'rgba(255,200,240,.6)', shape: 'streak' });
        if (Math.random() < dt * 4) shoot({ x: b.gdir > 0 ? b.ax0 + 30 : b.ax1 - 30, y: rand(b.ay0 + 60, b.ay1 - 40), vx: b.gdir * 380, vy: 0, r: 7, dmg: 1, color: '#ff8ad8', kind: 'orb', ghost: true, life: 5 });
        if (b.stT <= 0) { G.windForce = 0; setState(b, 'idle', 0.6 * fast); }
      } else if (b.st === 'orbs') {
        if (b.stT < 1.2 && b.n === 0) { b.n = 1; aimed(b, 7, 1.2, 330, '#ff8ad8'); sfx('shoot'); }
        if (b.stT < 0.6 && b.n === 1 && b.phase > 1) { b.n = 2; aimed(b, 9, 1.6, 300, '#c45cff'); sfx('shoot'); }
        if (b.stT <= 0) setState(b, 'idle', 0.6 * fast);
      } else if (b.st === 'summon') {
        if (b.n === 0) { b.n = 1; summon(b, 'bat', 3); }
        if (b.stT <= 0) setState(b, 'idle', 0.5);
      }
      break;
    }
    case 'heretic': {
      const hx = b.st === 'chase' ? pcx() : mid + Math.sin(b.t * 0.4) * (b.ax1 - b.ax0) * 0.3;
      const hy = b.st === 'chase' ? pcy() - 160 : b.ay0 + 210 + Math.sin(b.t) * 30;
      hoverTo(b, hx, hy, dt, b.st === 'chase' ? 1.4 : 2);
      b.face = dx < 0 ? -1 : 1;
      if (Math.random() < 0.6) part({ x: cxOf(b) + rand(-40, 40), y: b.y + rand(0, 30), vx: rand(-20, 20), vy: rand(-140, -60), life: rand(0.4, 0.9), size: rand(3, 7), color: pick(['#ffe36b', '#ff8a1a', '#ff4a1a']), add: true });
      if (b.st === 'intro' || b.st === 'idle') {
        if (b.stT <= 0) {
          const s = choose(b, ['ring', 'meteors', 'pillars', 'chase']);
          setState(b, s, { ring: 1.6, meteors: 2.2, pillars: 1.8, chase: 2.6 }[s]);
        }
      } else if (b.st === 'ring') {
        const want = b.phase > 1 ? 3 : 2;
        if (b.n < want && b.stT < 1.6 - b.n * 0.45) { radial(b, b.phase > 1 ? 18 : 14, 240, b.n * 0.2, '#ff8a1a', 'orb', { trail: '#ff5a1f' }); b.n++; sfx('fire'); }
        if (b.stT <= 0) setState(b, 'idle', 0.7 * fast);
      } else if (b.st === 'meteors') {
        const want = b.phase > 1 ? 12 : 8;
        if (b.n < want && b.stT < 2.2 - b.n * 0.15) {
          const x = b.n % 3 === 0 ? pcx() : rand(b.ax0 + 40, b.ax1 - 40);
          shoot({ x, y: b.ay0 + 20, vx: rand(-40, 40), vy: 200, g: 500, r: 12, dmg: 2, color: '#ff6a1a', kind: 'meteor', life: 4, trail: ['#ffe36b', '#ff6a1a'] });
          b.n++;
        }
        if (b.stT <= 0) setState(b, 'idle', 0.7 * fast);
      } else if (b.st === 'pillars') {
        if (b.n === 0) {
          b.n = 1;
          const k = b.phase > 1 ? 6 : 4;
          for (let i = 0; i < k; i++) column(i === 0 ? pcx() : rand(b.ax0 + 60, b.ax1 - 60), 64, 0.9 + i * 0.12, 'fire', b.ay1 - 300, b.ay1);
        }
        if (b.stT <= 0) setState(b, 'idle', 0.8 * fast);
      } else if (b.st === 'chase') {
        b.sub -= dt;
        if (b.sub <= 0) { b.sub = 0.3 * fast; shoot({ x: cxOf(b), y: b.y + b.h, vx: rand(-60, 60), vy: 120, g: 600, r: 8, dmg: 1, color: '#ff8a1a', kind: 'orb', life: 3, trail: '#ff5a1f' }); }
        if (b.stT <= 0) setState(b, 'idle', 0.6 * fast);
      }
      break;
    }
    case 'titan': {
      b.vx *= 0.9;
      if (b.st === 'intro' || b.st === 'idle') {
        b.face = dx < 0 ? -1 : 1;
        if (b.stT <= 0) {
          const s = choose(b, ['stomp', 'shards', 'breath', 'walk']);
          setState(b, s, { stomp: 1.4, shards: 1.6, breath: 1.8, walk: 2 }[s]);
        }
      } else if (b.st === 'stomp') {
        if (b.stT < 0.7 && b.n === 0) {
          b.n = 1;
          shake(22); sfx('boom');
          floorWave(b, -1, '#a8ecff'); floorWave(b, 1, '#a8ecff');
          const k = b.phase > 1 ? 12 : 8;
          for (let i = 0; i < k; i++) column(i === 0 ? pcx() : rand(b.ax0 + 50, b.ax1 - 50), 40, 0.7 + i * 0.07, 'ice', b.ay0, b.ay1);
        }
        if (b.stT <= 0) setState(b, 'idle', 0.7 * fast);
      } else if (b.st === 'shards') {
        const want = b.phase > 1 ? 3 : 2;
        if (b.n < want && b.stT < 1.4 - b.n * 0.45) { aimed(b, 9, 1.3, 430, '#e8fbff', 'shard', {}, cxOf(b) + b.face * 40, b.y + 40); b.n++; sfx('shoot'); }
        if (b.stT <= 0) setState(b, 'idle', 0.7 * fast);
      } else if (b.st === 'breath') {
        b.sub -= dt;
        if (b.stT < 1.5 && b.sub <= 0) {
          b.sub = 0.06;
          const ox = cxOf(b) + b.face * 50, oy = b.y + 50, a = Math.atan2(pcy() - oy, pcx() - ox) + rand(-0.35, 0.35), s = rand(260, 380);
          shoot({ x: ox, y: oy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 7, dmg: 1, color: '#bff3ff', kind: 'orb', ghost: true, life: 2.2, freeze: true });
          if (Math.random() < 0.3) sfx('dash');
        }
        if (b.stT <= 0) setState(b, 'idle', 0.7 * fast);
      } else if (b.st === 'walk') {
        const target = cxOf(b) < mid ? b.ax1 - b.w / 2 - 60 : b.ax0 + b.w / 2 + 60;
        b.face = target > cxOf(b) ? 1 : -1;
        b.vx = b.face * 260;
        if (Math.floor(b.t * 2.5) !== Math.floor((b.t - dt) * 2.5)) { shake(7); sfx('land'); }
        if (Math.abs(target - cxOf(b)) < 30 || b.stT <= 0 || b.hitWall) setState(b, 'idle', 0.4);
      }
      b.vy = Math.min(b.vy + 2200 * dt, 1200);
      moveBody(b, dt, true);
      break;
    }
    case 'hades': {
      const hx = mid + Math.sin(b.t * 0.35) * (b.ax1 - b.ax0) * 0.3, hy = b.ay0 + 230 + Math.sin(b.t * 0.9) * 40;
      if (b.st !== 'teleport') hoverTo(b, hx, hy, dt, 1.6);
      b.face = dx < 0 ? -1 : 1;
      if (Math.random() < 0.7) part({ x: cxOf(b) + rand(-30, 30), y: b.y + rand(0, 20), vx: rand(-20, 20), vy: rand(-160, -60), life: rand(0.4, 0.8), size: rand(3, 7), color: pick(['#5fd8ff', '#3a7bff', '#ffffff']), add: true });
      if (b.st === 'intro' || b.st === 'idle') {
        if (b.stT <= 0) {
          const pool = ['ring', 'laser', 'summon'];
          if (b.phase >= 2) pool.push('bolts', 'teleport', 'laser');
          if (b.phase >= 3) pool.push('meteors', 'ring');
          const s = choose(b, pool);
          setState(b, s, { ring: 1.8, laser: 3.4, summon: 1, bolts: 1.8, teleport: 1, meteors: 2.2 }[s]);
        }
      } else if (b.st === 'ring') {
        const want = b.phase + 1;
        if (b.n < want && b.stT < 1.8 - b.n * 0.4) { radial(b, 16 + b.phase * 2, 230 + b.phase * 20, b.n * 0.3, b.n % 2 ? '#5fd8ff' : '#ff4a5a', 'orb', { trail: '#3a7bff' }); b.n++; sfx('fire'); }
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
        if (b.n === 0) { b.n = 1; summon(b, pick(['imp', 'wisp']), 2 + b.phase); }
        if (b.stT <= 0) setState(b, 'idle', 0.6);
      } else if (b.st === 'bolts') {
        const want = 6 + b.phase * 2;
        if (b.n < want && b.stT < 1.8 - b.n * 0.11) { column(b.n === 0 ? pcx() : rand(b.ax0 + 60, b.ax1 - 60), 70, 0.85, 'bolt', b.ay0, b.ay1); b.n++; }
        if (b.stT <= 0) setState(b, 'idle', 0.6 * fast);
      } else if (b.st === 'teleport') {
        if (b.n === 0 && b.stT < 0.6) {
          b.n = 1;
          burst(cxOf(b), cyOf(b), 30, ['#5fd8ff', '#ffffff'], 300, { add: true });
          b.x = (cxOf(b) < mid ? b.ax1 - 300 : b.ax0 + 300) - b.w / 2;
          b.y = b.ay0 + 160;
          b.vx = b.vy = 0;
          burst(cxOf(b), cyOf(b), 30, ['#5fd8ff', '#ffffff'], 300, { add: true });
          sfx('portal');
          aimed(b, 5, 0.8, 380, '#5fd8ff');
        }
        if (b.stT <= 0) setState(b, 'idle', 0.5);
      } else if (b.st === 'meteors') {
        if (b.n < 14 && b.stT < 2.2 - b.n * 0.12) {
          shoot({ x: b.n % 3 === 0 ? pcx() : rand(b.ax0 + 40, b.ax1 - 40), y: b.ay0 + 20, vx: rand(-40, 40), vy: 220, g: 520, r: 12, dmg: 2, color: '#5fd8ff', kind: 'meteor', life: 4, trail: ['#ffffff', '#5fd8ff'] });
          b.n++;
        }
        if (b.stT <= 0) setState(b, 'idle', 0.7 * fast);
      }
      break;
    }
  }
  if (b.id === 'storm' && b.st !== 'gust') G.windForce = 0;
  if (!p.dead && overlap(b, p) && p.dashT <= 0) hurtPlayer(2, cxOf(b));

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
  dropGems(cx, cy, b.id === 'hades' ? 600 : 220);
  for (const e of G.enemies) if (e.summoned) e.dead = true;
  G.effects.length = 0;
  setTimeout(() => { if (G.boss === b) G.boss = null; onBossDefeated(b); }, 1300);
}

// ---------- Drawing ----------
export function drawBoss(ctx, t) {
  const b = G.boss;
  if (!b) return;
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
