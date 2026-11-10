// Damage, projectiles, explosions and pickups.
import { G } from './state.js';
import { T, tileAt, setTile, isSolid, ROCK, ORE, CRYSTAL, BRICK, isSpecial } from './world.js';
import { rand, clamp, RAINBOW, overlap, pick } from './util.js';
import { burst, part, floater, shake, ring, HOOKS } from './fx.js';
import { sfx } from './audio.js';
import { stats, worn } from './items.js';
import { lightning } from './art.js';
import { bossDefeated } from './bosses.js';
import { onPlayerDeath, toast } from './main.js';

const fmt = n => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10).toString();

// Thunderer's Aegis: lightning leaps from your armour to every foe nearby.
function thunder(cx, cy) {
  const S = stats(), R = 300, dmg = 6 * S.whipDmg / 2;
  const list = G.boss && !G.boss.dead && !G.boss.hidden ? [...G.enemies, G.boss] : G.enemies;
  const hit = list.filter(e => !e.dead && Math.hypot(e.x + e.w / 2 - cx, e.y + e.h / 2 - cy) < R).slice(0, 8);
  for (const e of hit) damageEnemy(e, dmg, Math.sign(e.x + e.w / 2 - cx));
  const pts = hit.map(e => [e.x + e.w / 2, e.y + e.h / 2]);
  if (!pts.length) for (let i = 0; i < 4; i++) { const a = rand(0, Math.PI * 2); pts.push([cx + Math.cos(a) * 140, cy + Math.sin(a) * 140]); }
  G.effects.push({
    t: 0, dur: 0.35,
    draw(ctx) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1 - this.t / this.dur;
      for (const [x, y] of pts) lightning(ctx, cx, cy, x, y, '#dfe6ff', 2.5, 7, 16);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    },
  });
  ring(cx, cy, 90, '#a8b8ff', 0.3, 5);
  shake(8);
  sfx('bolt');
}

export function hurtPlayer(n, sx, kb = 1) {
  const p = G.player;
  if (!p || p.dead || p.inv > 0 || G.scene !== 'play' || (G.save.dev && G.save.dev.god)) return false;
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  if (p.shield > 0) {
    burst(cx, cy, 10, '#bff3ff', 200, { add: true });
    p.inv = 0.4;
    return false;
  }
  const S = stats();
  if (S.aegis && p.aegis <= 0) {
    // the Aegis Shield takes the whole blow, then needs time to recharge
    p.aegis = S.aegisCd;
    p.inv = 1;
    ring(cx, cy, 70, '#ffe14a', 0.4, 8);
    burst(cx, cy, 18, ['#ffe14a', '#ffffff'], 260, { add: true });
    floater(cx, p.y - 6, 'BLOCKED', '#ffe14a', 18);
    sfx('bubble');
    return false;
  }
  // Mistweave: now and then a blow passes straight through you
  if (S.dodge && Math.random() < S.dodge) {
    p.inv = 0.6;
    burst(cx, cy, 16, ['#ffffff', '#cfe0ee'], 180, { g: -60, size: 5 });
    floater(cx, p.y - 6, 'MIST', '#cfe8ff', 18);
    return false;
  }
  // Armour takes what it can before your hearts do
  if (p.armour >= 1) {
    const soak = Math.min(n, Math.floor(p.armour)), A = worn(), col = A ? A.look.metal : ['#ffffff', '#cccccc'];
    p.armour -= soak;
    n -= soak;
    p.armT = 4 + S.armourRegen;
    burst(cx, cy, 12, [col[0], col[1], '#ffffff'], 240);
    if (S.zap) thunder(cx, cy);
    if (n <= 0) {
      p.inv = 1.1;
      p.vy = -300 * kb;
      p.vx = (cx < sx ? -1 : 1) * 220 * kb;
      p.ctrlLock = 0.12;
      shake(6);
      G.hitstop = 0.04;
      sfx('clang');
      floater(cx, p.y - 6, p.armour < 1 ? 'ARMOUR BROKEN' : '-' + soak + ' ⛨', p.armour < 1 ? '#ffb3c0' : col[0], 18);
      return true;
    }
  }
  p.armT = 4 + S.armourRegen;
  p.hp -= n;
  p.inv = 1.5;
  p.vy = -380 * kb;
  p.vx = (cx < sx ? -1 : 1) * 300 * kb;
  p.ctrlLock = 0.18;
  p.dashT = 0;
  shake(12);
  G.flash = 0.3;
  G.hitstop = 0.07;
  sfx('hurt');
  floater(cx, p.y - 6, '-' + n, '#ff5a6a', 20);
  burst(cx, cy, 14, ['#ff3d5a', '#ffffff'], 260);
  if (p.hp <= 0 && G.save.up.phoenix > 0) {
    // the Phoenix Feather burns away and you rise again
    G.save.up.phoenix = 0;
    p.hp = S.maxHp;
    p.inv = 2.5;
    ring(cx, cy, 220, '#ff8a1a', 0.7, 12);
    burst(cx, cy, 60, ['#ffe36b', '#ff8a1a', '#ff4a1a', '#ffffff'], 460, { add: true, g: -200 });
    floater(cx, p.y - 10, 'REBORN!', '#ffb347', 26);
    sfx('heal');
  }
  if (p.hp <= 0) onPlayerDeath();
  return true;
}

export function damageEnemy(e, n, dir = 0, kb = 220) {
  if (e.dead) return;
  if (e.trap > 0) n *= 1.5;
  e.hp -= n;
  e.flash = 0.12;
  if (e.boss) e.hurtT = 0.35;
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  if (!e.boss) {
    e.vx += dir * kb;
    if (!e.fly) e.vy -= kb * 0.45;
  }
  floater(cx, e.y - 4, fmt(n), n >= 6 ? '#ffe14a' : '#ffffff', n >= 6 ? 20 : 16);
  burst(cx, cy, 6, [e.tint || '#fff', '#ffffff'], 200);
  // bright sparks thrown the way the blow travelled
  for (let i = 0; i < 5; i++) {
    const a = (dir ? (dir > 0 ? 0 : Math.PI) : rand(0, Math.PI * 2)) + rand(-0.7, 0.7), sp = rand(260, 520);
    part({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 4, life: rand(0.12, 0.22), size: rand(2.5, 4), color: '#fff3c8', shape: 'streak', add: true });
  }
  sfx('hit');
  if (e.hp <= 0) {
    if (e.boss) bossDefeated(e);
    else killEnemy(e);
  }
}

export function killEnemy(e) {
  e.dead = true;
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  burst(cx, cy, 26, [e.tint, e.accent, '#ffffff'], 340, { add: true });
  ring(cx, cy, 60, e.accent || '#fff');
  ring(cx, cy, 34, '#ffffff', 0.25, 6);
  if (HOOKS.kill) HOOKS.kill(e);
  shake(5);
  sfx('kill');
  const S = stats();
  dropGems(cx, cy, Math.round(e.gem * (0.6 + e.level * 0.5) * rand(1, 1.5) * S.gemK));
  if (S.ichor) {
    // the Chalice of Ichor heals you after enough foes fall
    G.save.ichorN = (G.save.ichorN || 0) + 1;
    const p = G.player;
    if (G.save.ichorN >= S.ichor && p && !p.dead) {
      G.save.ichorN = 0;
      if (p.hp < S.maxHp) { p.hp++; floater(p.x + p.w / 2, p.y - 10, '+1 ♥', '#ff8aa6', 18); sfx('heal'); }
    }
  }
  if (Math.random() < 0.16) G.pickups.push({ kind: 'heart', x: cx, y: cy, vx: rand(-80, 80), vy: -300, t: 0 });
  if (e.spawn) { e.spawn.deadAt = G.t; e.spawn.ent = null; }
  G.save.stats.kills++;
}

export function dropGems(x, y, total) {
  let pieces = 0;
  while (total > 0 && pieces < 18) {
    const v = total >= 25 ? 25 : total >= 5 ? 5 : 1;
    total -= v;
    pieces++;
    G.pickups.push({ kind: 'gem', val: v, x, y, vx: rand(-170, 170), vy: rand(-460, -200), t: 0, spin: rand(0, 6) });
  }
  if (total > 0) G.pickups.push({ kind: 'gem', val: total, x, y, vx: rand(-100, 100), vy: -400, t: 0, spin: 0 });
}

export function shoot(o) {
  G.projs.push({ x: 0, y: 0, vx: 0, vy: 0, r: 6, dmg: 1, team: 'enemy', g: 0, life: 4, color: '#ff7a2a', kind: 'orb', ghost: false, t: 0, ...o });
}

export function breakTile(tx, ty, quiet) {
  const t = tileAt(tx, ty);
  if (!(t === ROCK || t === ORE || t === CRYSTAL)) return false;
  setTile(tx, ty, 0);
  const x = tx * T + 16, y = ty * T + 16;
  burst(x, y, 6, ['#6a5f80', '#3a3348'], 160, { shape: 'sq' });
  if (t === ORE) {
    dropGems(x, y, Math.round(4 + Math.hypot(tx, ty) / 30));
    burst(x, y, 10, ['#ffd34a', '#fff6c4'], 200, { add: true });
    sfx('break');
  } else if (t === CRYSTAL) {
    dropGems(x, y, Math.round(10 + Math.hypot(tx, ty) / 20));
    burst(x, y, 14, ['#ffffff', '#c9baff'], 240, { add: true });
    sfx('chest');
  } else if (!quiet) sfx('break');
  return true;
}

export function explode(x, y, r, dmg, team, dig) {
  shake(team === 'player' ? 7 : 9);
  sfx('boom', 0.7);
  burst(x, y, 30, team === 'player' ? RAINBOW : ['#ffb347', '#ff5a1f', '#ffe36b'], 380, { add: true, g: 100 });
  for (let i = 0; i < 8; i++) part({ x, y, vx: rand(-60, 60), vy: rand(-60, 60), life: rand(0.5, 0.9), size: rand(8, 14), color: 'rgba(60,50,70,.5)', grow: 2, drag: 2 });
  ring(x, y, r * 1.2, team === 'player' ? '#ffffff' : '#ffb347', 0.35, 8);
  if (team === 'player') {
    for (const e of G.enemies) {
      const d = Math.hypot(e.x + e.w / 2 - x, e.y + e.h / 2 - y);
      if (!e.dead && d < r + e.w / 2) damageEnemy(e, dmg * (d < r * 0.5 ? 1 : 0.7), Math.sign(e.x + e.w / 2 - x), 380);
    }
    const B = G.boss;
    if (B && !B.dead && Math.hypot(B.x + B.w / 2 - x, B.y + B.h / 2 - y) < r + Math.max(B.w, B.h) / 2) damageEnemy(B, dmg);
    if (dig) {
      const rr = Math.ceil(r / T);
      const ctx = Math.floor(x / T), cty = Math.floor(y / T);
      for (let j = -rr; j <= rr; j++) for (let i = -rr; i <= rr; i++) {
        if (Math.hypot(i, j) * T <= r * 0.75) {
          const tx = ctx + i, ty = cty + j, t = tileAt(tx, ty);
          if ((t === ROCK || t === ORE || t === CRYSTAL) && !(t === ROCK && isSpecial(tx, ty) && Math.abs(tx) < 52 && ty >= -44 && ty <= 18)) breakTile(tx, ty, true);
        }
      }
    }
  } else {
    const p = G.player;
    if (Math.hypot(p.x + p.w / 2 - x, p.y + p.h / 2 - y) < r + 12) hurtPlayer(dmg, x);
  }
}

export function updateProjs(dt) {
  const p = G.player;
  for (let i = G.projs.length - 1; i >= 0; i--) {
    const b = G.projs[i];
    b.t += dt;
    b.life -= dt;
    if (b.homing) {
      let best = null, bd = 420;
      const targets = G.boss && !G.boss.dead && !G.boss.hidden ? [...G.enemies, G.boss] : G.enemies;
      for (const e of targets) {
        if (e.dead) continue;
        const d = Math.hypot(e.x + e.w / 2 - b.x, e.y + e.h / 2 - b.y);
        if (d < bd) { bd = d; best = e; }
      }
      if (best) {
        const dx = best.x + best.w / 2 - b.x, dy = best.y + best.h / 2 - b.y, d = Math.hypot(dx, dy) || 1, sp = Math.hypot(b.vx, b.vy);
        b.vx += (dx / d * sp - b.vx) * Math.min(1, 7 * dt);
        b.vy += (dy / d * sp - b.vy) * Math.min(1, 7 * dt);
      }
    }
    // boss tricks: shots that bend as they fly, shots that speed up, and orbs that hang in the
    // air until their moment comes and then fire straight at the player
    if (b.curve) {
      const a = b.curve * dt, c = Math.cos(a), s = Math.sin(a), vx = b.vx;
      b.vx = vx * c - b.vy * s;
      b.vy = vx * s + b.vy * c;
    }
    if (b.accel) { const k = 1 + b.accel * dt; b.vx *= k; b.vy *= k; }
    if (b.hang != null) {
      if (b.t < b.hang) { b.vx *= 1 - Math.min(1, 4 * dt); b.vy *= 1 - Math.min(1, 4 * dt); }
      else {
        const dx = p.x + p.w / 2 - b.x, dy = p.y + p.h / 2 - b.y, d = Math.hypot(dx, dy) || 1;
        b.vx = dx / d * b.hangSp; b.vy = dy / d * b.hangSp;
        b.hang = null;
        burst(b.x, b.y, 5, b.color, 160, { add: true });
      }
    }
    b.vy += b.g * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.trail && Math.random() < 0.8) part({ x: b.x, y: b.y, vx: rand(-20, 20), vy: rand(-20, 20), life: 0.3, size: b.r * 0.7, color: Array.isArray(b.trail) ? pick(b.trail) : b.trail, add: true });
    let dead = b.life <= 0;
    if (!dead && !b.ghost && isSolid(tileAt(Math.floor(b.x / T), Math.floor(b.y / T)))) dead = true;
    if (!dead) {
      if (b.team === 'enemy') {
        if (!p.dead && Math.abs(p.x + p.w / 2 - b.x) < p.w / 2 + b.r - 3 && Math.abs(p.y + p.h / 2 - b.y) < p.h / 2 + b.r - 3) {
          if (b.freeze) p.slow = 2.2;
          hurtPlayer(b.dmg, b.x - b.vx * 0.05);
          dead = true;
        }
      } else {
        const list = G.boss && !G.boss.dead && !G.boss.hidden ? [...G.enemies, G.boss] : G.enemies;
        for (const e of list) {
          if (e.dead) continue;
          if (b.x > e.x - b.r && b.x < e.x + e.w + b.r && b.y > e.y - b.r && b.y < e.y + e.h + b.r) {
            if (b.kind === 'blast' || b.kind === 'bomb') { dead = true; break; }
            damageEnemy(e, b.dmg, Math.sign(b.vx), 120);
            dead = true;
            break;
          }
        }
      }
    }
    if (dead) {
      if (b.kind === 'blast') explode(b.x, b.y, b.radius || 85, b.dmg, 'player', true);
      else if (b.kind === 'bomb') { explode(b.x, b.y, b.radius || 115, b.dmg, 'player', true); ring(b.x, b.y, (b.radius || 115) * 0.8, '#ffb347', 0.4, 10); shake(10); }
      else if (b.kind === 'meteor') explode(b.x, b.y, 60, b.dmg, 'enemy');
      else burst(b.x, b.y, 6, b.color, 140, { add: true });
      G.projs.splice(i, 1);
    }
  }
}

export function drawProjs(ctx) {
  ctx.globalCompositeOperation = 'lighter';
  for (const b of G.projs) {
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 2.6);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.3, b.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 2.6, 0, Math.PI * 2);
    ctx.fill();
    if (b.kind === 'star') {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.t * 12);
      ctx.fillStyle = '#fff';
      starPath(ctx, b.r * 1.3, b.r * 0.55);
      ctx.fill();
      ctx.restore();
    } else if (b.kind === 'shard') {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(Math.atan2(b.vy, b.vx));
      ctx.fillStyle = b.tip || '#e8fbff';
      ctx.beginPath();
      ctx.moveTo(b.r * 2, 0);
      ctx.lineTo(-b.r, -b.r * 0.6);
      ctx.lineTo(-b.r, b.r * 0.6);
      ctx.fill();
      ctx.restore();
    } else if (b.kind === 'bomb') {
      // a round black bomb with a fizzing fuse
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.globalCompositeOperation = 'source-over';
      ctx.rotate(b.t * 8);
      ctx.fillStyle = '#1c1626';
      ctx.strokeStyle = '#ffb347';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.beginPath(); ctx.arc(-b.r * 0.35, -b.r * 0.35, b.r * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#8a6a4a';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -b.r); ctx.quadraticCurveTo(4, -b.r - 6, 2, -b.r - 9); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = Math.floor(b.t * 20) % 2 ? '#fff6c4' : '#ff9a2e';
      ctx.beginPath(); ctx.arc(2, -b.r - 9, 3 + Math.random() * 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (b.kind === 'spear') {
      // a thrown spear of war, pointing where it flies
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(Math.atan2(b.vy, b.vx));
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#5a3418';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-b.r * 5, 0); ctx.lineTo(b.r * 1.2, 0); ctx.stroke();
      ctx.fillStyle = '#ffcf7a';
      ctx.strokeStyle = '#6a3a10';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(b.r * 3, 0); ctx.lineTo(b.r * 0.8, -b.r * 0.7); ctx.lineTo(b.r * 1.1, 0); ctx.lineTo(b.r * 0.8, b.r * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

export function starPath(ctx, R, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2, rr = i % 2 ? r : R;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
}

const GEM_COL = { 1: '#ff6fb5', 5: '#5fd8ff', 25: '#ffd34a' };
export function updatePickups(dt) {
  const p = G.player, S = stats(), px = p.x + p.w / 2, py = p.y + p.h / 2;
  for (let i = G.pickups.length - 1; i >= 0; i--) {
    const g = G.pickups[i];
    g.t += dt;
    const dx = px - g.x, dy = py - g.y, d = Math.hypot(dx, dy);
    if (g.t > 0.35 && d < S.magnet && !p.dead) {
      const pull = 1400 * (1 - d / (S.magnet + 1)) + 300;
      g.vx += (dx / d) * pull * dt * 3;
      g.vy += (dy / d) * pull * dt * 3;
      g.vx *= 0.9;
      g.vy *= 0.9;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
    } else {
      g.vy = Math.min(g.vy + 1100 * dt, 700);
      g.x += g.vx * dt;
      if (isSolid(tileAt(Math.floor(g.x / T), Math.floor(g.y / T)))) { g.x -= g.vx * dt; g.vx *= -0.5; }
      g.y += g.vy * dt;
      if (isSolid(tileAt(Math.floor(g.x / T), Math.floor((g.y + 5) / T)))) {
        g.y = Math.floor((g.y + 5) / T) * T - 5;
        g.vy *= -0.35;
        g.vx *= 0.75;
      }
    }
    if (g.t > 0.25 && d < 26 && !p.dead) {
      if (g.kind === 'gem') {
        G.save.gems += g.val;
        G.save.stats.gemsEarned += g.val;
        sfx('gem', g.val >= 25 ? 0.75 : g.val >= 5 ? 0.88 : 1);
        floater(g.x, g.y - 10, '+' + g.val, GEM_COL[g.val] || '#fff', 13);
      } else if (g.kind === 'heart') {
        if (p.hp < S.maxHp) { p.hp = Math.min(S.maxHp, p.hp + 1); sfx('heal'); floater(g.x, g.y - 10, '+1 ♥', '#ff5a7a', 16); }
        else { G.save.gems += 5; sfx('gem'); floater(g.x, g.y - 10, '+5', '#ff6fb5', 13); }
      }
      burst(g.x, g.y, 5, GEM_COL[g.val] || '#ff5a7a', 120, { add: true, g: 0 });
      G.pickups.splice(i, 1);
      continue;
    }
    if (g.t > 60) G.pickups.splice(i, 1);
  }
}

export function drawPickups(ctx) {
  for (const g of G.pickups) {
    const bob = Math.sin(g.t * 5 + (g.spin || 0)) * 2;
    if (g.kind === 'gem') {
      const col = GEM_COL[g.val] || '#ffd34a', s = g.val >= 25 ? 9 : g.val >= 5 ? 7 : 5.5;
      ctx.save();
      ctx.translate(g.x, g.y - 4 + bob);
      ctx.scale(Math.cos(g.t * 4 + (g.spin || 0)) * 0.4 + 0.75, 1);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.8, -s * 0.2);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.8, -s * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.35, -s * 0.2);
      ctx.lineTo(0, 0);
      ctx.lineTo(-s * 0.35, -s * 0.2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(g.x, g.y - 6 + bob);
      heartPath(ctx, 8);
      ctx.fillStyle = '#ff4a6e';
      ctx.fill();
      ctx.restore();
    }
  }
}

export function heartPath(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.9);
  ctx.bezierCurveTo(-s * 1.4, -s * 0.1, -s * 0.7, -s * 1.15, 0, -s * 0.45);
  ctx.bezierCurveTo(s * 0.7, -s * 1.15, s * 1.4, -s * 0.1, 0, s * 0.9);
  ctx.closePath();
}
