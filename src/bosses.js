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
    vx: 0, vy: 0, hp: site.hp, max: site.hp, face: left ? -1 : 1, t: 0, st: 'intro', stT: 1.6, last: '', phase: 1,
    flash: 0, dead: false, ground: false, tint: B.tint, accent: B.accent, ax0, ax1, ay0, ay1, level: 10, n: 0, out: 0,
  };
  G.boss = boss;
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

function setState(b, st, time) { b.st = st; b.stT = time; b.n = 0; b.sub = 0; }

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
          ctx.strokeStyle = `rgba(255,255,255,${k})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          let yy = top, xx = x;
          ctx.moveTo(xx, yy);
          while (yy < bottom) { yy += 30; xx = x + rand(-w / 3, w / 3); ctx.lineTo(xx, yy); }
          ctx.stroke();
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
  b.t += dt; b.stT -= dt; b.flash -= dt;
  const hpK = b.hp / b.max;
  const newPhase = b.id === 'hades' ? (hpK < 0.25 ? 3 : hpK < 0.6 ? 2 : 1) : hpK < 0.5 ? 2 : 1;
  if (newPhase > b.phase) {
    b.phase = newPhase;
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
            const hx = cxOf(b) + b.face * (60 + h * 4), hy = b.y + 18 + h * 12;
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
  if (!b || b.dead && !b.fading) return;
  const fl = b.flash > 0;
  ctx.save();
  ctx.translate(cxOf(b), b.y + b.h);
  ctx.scale(b.face, 1);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  DRAW[b.id](ctx, b, t, fl);
  ctx.restore();
}

const DRAW = {
  cerberus(ctx, b, t, fl) {
    const run = Math.abs(b.vx) > 30, step = run ? Math.sin(t * 16) : 0;
    const fur = fl ? '#fff' : '#3c4a2c', furL = fl ? '#fff' : '#5c6e40', dark = fl ? '#fff' : '#1c2414';
    // legs
    ctx.strokeStyle = dark;
    ctx.lineWidth = 14;
    for (const [x, s] of [[-58, 1], [-38, -1], [38, 1], [58, -1]]) {
      ctx.beginPath(); ctx.moveTo(x, -50); ctx.lineTo(x + step * s * 10, -22); ctx.lineTo(x + step * s * 14, 0); ctx.stroke();
    }
    // tail (serpent)
    ctx.strokeStyle = furL;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(-80, -66);
    ctx.bezierCurveTo(-110, -80, -100, -120 + Math.sin(t * 3) * 10, -126, -112);
    ctx.stroke();
    ctx.fillStyle = '#b6ff6b';
    ctx.beginPath(); ctx.arc(-127, -113, 6, 0, Math.PI * 2); ctx.fill();
    // body
    const g = ctx.createLinearGradient(0, -100, 0, -40);
    g.addColorStop(0, furL);
    g.addColorStop(1, fur);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(-8, -66, 82, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    // spikes along the back
    ctx.fillStyle = dark;
    for (let i = 0; i < 7; i++) {
      const x = -70 + i * 20;
      ctx.beginPath(); ctx.moveTo(x - 6, -94 + Math.abs(i - 3) * 2); ctx.lineTo(x, -112 + Math.abs(i - 3) * 3); ctx.lineTo(x + 6, -94 + Math.abs(i - 3) * 2); ctx.fill();
    }
    // three heads
    const open = b.st === 'spit' || b.st === 'charge' ? 1 : 0.3 + Math.sin(t * 4) * 0.2;
    for (let h = 0; h < 3; h++) {
      const hx = 58 + h * 10, hy = -98 + h * 22 + Math.sin(t * 3 + h) * 3;
      ctx.fillStyle = h === 1 ? furL : fur;
      ctx.beginPath(); ctx.ellipse(hx - 12, hy + 10, 18, 14, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(hx, hy, 20, 15, 0.1, 0, Math.PI * 2); ctx.fill();
      // jaw
      ctx.beginPath();
      ctx.moveTo(hx + 4, hy + 4);
      ctx.lineTo(hx + 36, hy + 2);
      ctx.lineTo(hx + 34, hy - 8);
      ctx.fill();
      ctx.save();
      ctx.translate(hx + 6, hy + 8);
      ctx.rotate(0.35 * open);
      ctx.fillRect(0, 0, 28, 7);
      ctx.fillStyle = '#f2e6d0';
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(6 + k * 6, 0); ctx.lineTo(9 + k * 6, -5); ctx.lineTo(12 + k * 6, 0); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = '#b6ff6b';
      ctx.beginPath(); ctx.ellipse(hx + 6, hy - 5, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.moveTo(hx - 10, hy - 10); ctx.lineTo(hx - 6, hy - 28); ctx.lineTo(hx + 2, hy - 12); ctx.fill();
      // collar
      ctx.strokeStyle = '#8a6a3a';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(hx - 18, hy + 14, 12, -0.8, 1.6); ctx.stroke();
    }
  },
  storm(ctx, b, t, fl) {
    ctx.translate(0, -b.h / 2);
    const aura = ctx.createRadialGradient(0, -10, 10, 0, -10, 110);
    aura.addColorStop(0, 'rgba(255,140,220,.35)');
    aura.addColorStop(1, 'rgba(255,140,220,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, -10, 110, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = t * 1.8 + (i * Math.PI) / 4;
      ctx.fillStyle = i % 2 ? '#ff8ad8' : '#ffd1f0';
      ctx.beginPath(); ctx.ellipse(Math.cos(a) * 70, Math.sin(a) * 30 - 10, 6, 3, a, 0, Math.PI * 2); ctx.fill();
    }
    // hair
    ctx.strokeStyle = fl ? '#fff' : '#2a0a2a';
    ctx.lineWidth = 6;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(-4, -44);
      ctx.bezierCurveTo(-30 - i * 6, -40 + i * 4, -40 - i * 8, -10 + Math.sin(t * 3 + i) * 10, -60 - i * 6, 0 + i * 6 + Math.sin(t * 4 + i) * 8);
      ctx.stroke();
    }
    // dress
    const g = ctx.createLinearGradient(0, -20, 0, 60);
    g.addColorStop(0, fl ? '#fff' : '#9a2a8a');
    g.addColorStop(1, fl ? '#fff' : '#3a0a3a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-12, -20);
    ctx.lineTo(12, -20);
    ctx.lineTo(36, 50);
    for (let i = 0; i <= 6; i++) ctx.lineTo(36 - i * 12, 50 + Math.sin(t * 6 + i) * 6 + (i % 2) * 6);
    ctx.closePath();
    ctx.fill();
    // torso and arms
    ctx.fillStyle = fl ? '#fff' : '#f0c8d8';
    ctx.beginPath(); ctx.ellipse(0, -28, 11, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = fl ? '#fff' : '#f0c8d8';
    ctx.lineWidth = 5;
    const raise = b.st === 'bolts' || b.st === 'orbs' ? 1 : 0;
    ctx.beginPath(); ctx.moveTo(-9, -34); ctx.lineTo(-24, -40 - raise * 20); ctx.lineTo(-28, -56 - raise * 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(9, -34); ctx.lineTo(26, -36 - raise * 22); ctx.lineTo(32, -52 - raise * 22); ctx.stroke();
    // head
    ctx.fillStyle = fl ? '#fff' : '#f6d6e2';
    ctx.beginPath(); ctx.ellipse(2, -50, 9, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff2a8a';
    ctx.fillRect(4, -52, 4, 2);
    ctx.fillStyle = '#ffd34a';
    ctx.beginPath();
    ctx.moveTo(-8, -58); ctx.lineTo(-6, -70); ctx.lineTo(-2, -62); ctx.lineTo(2, -74); ctx.lineTo(6, -62); ctx.lineTo(10, -70); ctx.lineTo(11, -58);
    ctx.closePath(); ctx.fill();
    if (raise) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,200,255,.8)';
      ctx.beginPath(); ctx.arc(-28, -76, 7 + Math.sin(t * 30) * 2, 0, Math.PI * 2); ctx.arc(32, -74, 7 + Math.cos(t * 30) * 2, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  },
  heretic(ctx, b, t, fl) {
    ctx.translate(0, -b.h / 2 + Math.sin(t * 2) * 4);
    ctx.globalCompositeOperation = 'lighter';
    const aura = ctx.createRadialGradient(0, 0, 10, 0, 0, 120);
    aura.addColorStop(0, 'rgba(255,140,40,.5)');
    aura.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, 0, 120, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // sarcophagus
    const g = ctx.createLinearGradient(-50, 0, 50, 0);
    g.addColorStop(0, fl ? '#fff' : '#3a2018');
    g.addColorStop(0.5, fl ? '#fff' : '#6a3a2a');
    g.addColorStop(1, fl ? '#fff' : '#3a2018');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-46, -10); ctx.lineTo(46, -10); ctx.lineTo(40, 44); ctx.lineTo(-40, 44); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffae4a';
    ctx.lineWidth = 2;
    ctx.strokeRect(-36, -2, 72, 38);
    ctx.fillStyle = '#ffae4a';
    ctx.font = '700 14px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText('✝ ✝ ✝', 0, 24);
    // figure rising
    ctx.fillStyle = fl ? '#fff' : '#2a1410';
    ctx.beginPath();
    ctx.moveTo(-20, -10); ctx.quadraticCurveTo(-24, -50, -10, -62); ctx.lineTo(10, -62); ctx.quadraticCurveTo(24, -50, 20, -10);
    ctx.fill();
    ctx.beginPath(); ctx.arc(0, -70, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe36b';
    ctx.beginPath(); ctx.ellipse(-4, -72, 2.5, 2, 0, 0, Math.PI * 2); ctx.ellipse(5, -72, 2.5, 2, 0, 0, Math.PI * 2); ctx.fill();
    // lid tilted
    ctx.save();
    ctx.translate(-46, -12);
    ctx.rotate(-0.5 + Math.sin(t * 1.5) * 0.06);
    ctx.fillStyle = fl ? '#fff' : '#4a2a1e';
    ctx.fillRect(-10, -8, 100, 10);
    ctx.restore();
    // flames
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const x = -42 + i * 14, h = 26 + Math.sin(t * 9 + i * 1.7) * 10;
      const fg = ctx.createLinearGradient(0, -10 - h, 0, -10);
      fg.addColorStop(0, 'rgba(255,220,100,0)');
      fg.addColorStop(1, 'rgba(255,120,30,.9)');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.moveTo(x - 7, -10); ctx.quadraticCurveTo(x, -10 - h * 1.3, x + 7, -10); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  },
  titan(ctx, b, t, fl) {
    const skin = fl ? '#fff' : '#5a7fa8', skinD = fl ? '#fff' : '#33506e', ice = 'rgba(200,240,255,.75)';
    const walk = b.st === 'walk' ? Math.sin(t * 7) : 0, stomp = b.st === 'stomp' && b.stT > 0.7 ? 1 : 0;
    // legs
    ctx.strokeStyle = skinD;
    ctx.lineWidth = 30;
    ctx.beginPath(); ctx.moveTo(-28, -90); ctx.lineTo(-30 + walk * 14, -40); ctx.lineTo(-30 + walk * 18, -10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(28, -90); ctx.lineTo(30 - walk * 14, -40 - stomp * 30); ctx.lineTo(30 - walk * 18, -10 - stomp * 40); ctx.stroke();
    // ice boots
    ctx.fillStyle = ice;
    ctx.fillRect(-50 + walk * 18, -24, 40, 24);
    ctx.fillRect(12 - walk * 18, -24 - stomp * 40, 40, 24);
    // torso
    const g = ctx.createLinearGradient(-60, -200, 60, -90);
    g.addColorStop(0, fl ? '#fff' : '#7aa3cc');
    g.addColorStop(1, skin);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-60, -180); ctx.quadraticCurveTo(0, -200, 60, -180); ctx.lineTo(40, -86); ctx.lineTo(-40, -86); ctx.closePath();
    ctx.fill();
    // chains
    ctx.strokeStyle = '#9aa0aa';
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 5]);
    ctx.beginPath(); ctx.moveTo(-58, -170); ctx.lineTo(40, -100); ctx.moveTo(58, -170); ctx.lineTo(-40, -100); ctx.stroke();
    ctx.setLineDash([]);
    // arms
    ctx.strokeStyle = skin;
    ctx.lineWidth = 24;
    const lift = b.st === 'stomp' && b.stT > 0.7 ? 40 : b.st === 'shards' ? 20 : 0;
    ctx.beginPath(); ctx.moveTo(-58, -170); ctx.lineTo(-80, -120 - lift); ctx.lineTo(-70, -80 - lift * 1.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(58, -170); ctx.lineTo(84, -130 - lift); ctx.lineTo(96, -96 - lift * 1.6); ctx.stroke();
    // shoulder ice
    ctx.fillStyle = ice;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 40, -184); ctx.lineTo(s * 56, -214); ctx.lineTo(s * 66, -186); ctx.lineTo(s * 76, -204); ctx.lineTo(s * 76, -168); ctx.closePath(); ctx.fill();
    }
    // head
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.ellipse(10, -200, 24, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8fbff';
    ctx.beginPath(); ctx.moveTo(-10, -216); ctx.lineTo(-4, -238); ctx.lineTo(6, -218); ctx.lineTo(14, -242); ctx.lineTo(22, -218); ctx.lineTo(32, -234); ctx.lineTo(34, -210); ctx.closePath(); ctx.fill();
    ctx.fillStyle = b.st === 'breath' ? '#ffffff' : '#a8ecff';
    ctx.beginPath(); ctx.ellipse(16, -204, 5, 3, 0, 0, Math.PI * 2); ctx.ellipse(28, -204, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a2a3a';
    ctx.beginPath(); ctx.ellipse(24, -188, 9, b.st === 'breath' ? 7 : 3, 0, 0, Math.PI * 2); ctx.fill();
  },
  hades(ctx, b, t, fl) {
    ctx.translate(0, -b.h / 2 + Math.sin(t * 1.6) * 5);
    ctx.globalCompositeOperation = 'lighter';
    const aura = ctx.createRadialGradient(0, -20, 10, 0, -20, 170);
    aura.addColorStop(0, 'rgba(80,160,255,.45)');
    aura.addColorStop(1, 'rgba(255,40,80,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, -20, 170, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // robe
    const g = ctx.createLinearGradient(0, -60, 0, 80);
    g.addColorStop(0, fl ? '#fff' : '#2a1030');
    g.addColorStop(1, fl ? '#fff' : '#0a0410');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-26, -50); ctx.lineTo(26, -50); ctx.lineTo(52, 70);
    for (let i = 0; i <= 8; i++) ctx.lineTo(52 - i * 13, 70 + Math.sin(t * 5 + i) * 7 + (i % 2) * 8);
    ctx.closePath();
    ctx.fill();
    // pauldrons
    ctx.fillStyle = fl ? '#fff' : '#3a3a48';
    ctx.beginPath(); ctx.ellipse(-28, -48, 16, 10, -0.3, 0, Math.PI * 2); ctx.ellipse(28, -48, 16, 10, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff4a5a';
    ctx.beginPath(); ctx.arc(-28, -50, 3, 0, Math.PI * 2); ctx.arc(28, -50, 3, 0, Math.PI * 2); ctx.fill();
    // arms and skeletal hands
    ctx.strokeStyle = fl ? '#fff' : '#2a1030';
    ctx.lineWidth = 12;
    const cast = b.st !== 'idle' && b.st !== 'intro' ? 1 : 0;
    ctx.beginPath(); ctx.moveTo(-34, -44); ctx.lineTo(-56, -20 - cast * 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(34, -44); ctx.lineTo(60, -24 - cast * 34); ctx.stroke();
    ctx.strokeStyle = '#e8e0d0';
    ctx.lineWidth = 2;
    for (const [hx, hy] of [[-56, -20 - cast * 30], [60, -24 - cast * 34]]) for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + (k - 1.5) * 4, hy - 10); ctx.stroke(); }
    // head
    ctx.fillStyle = fl ? '#fff' : '#cfd6e6';
    ctx.beginPath(); ctx.ellipse(0, -72, 15, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a0a14';
    ctx.beginPath(); ctx.moveTo(-15, -60); ctx.quadraticCurveTo(0, -46, 15, -60); ctx.lineTo(10, -64); ctx.quadraticCurveTo(0, -56, -10, -64); ctx.fill();
    ctx.fillStyle = '#ff2a3a';
    ctx.beginPath(); ctx.ellipse(-5, -74, 3.5, 2.5, 0.2, 0, Math.PI * 2); ctx.ellipse(6, -74, 3.5, 2.5, -0.2, 0, Math.PI * 2); ctx.fill();
    // crown of blue flame
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) {
      const x = -20 + i * 5, h = 22 + Math.sin(t * 10 + i * 1.3) * 8 + (4 - Math.abs(i - 4)) * 4;
      const fg = ctx.createLinearGradient(0, -86 - h, 0, -84);
      fg.addColorStop(0, 'rgba(120,200,255,0)');
      fg.addColorStop(1, 'rgba(60,140,255,.95)');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.moveTo(x - 5, -84); ctx.quadraticCurveTo(x, -84 - h * 1.4, x + 5, -84); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffd34a';
    ctx.beginPath(); ctx.moveTo(-14, -86); ctx.lineTo(-10, -98); ctx.lineTo(-4, -88); ctx.lineTo(0, -102); ctx.lineTo(4, -88); ctx.lineTo(10, -98); ctx.lineTo(14, -86); ctx.closePath(); ctx.fill();
  },
};

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
