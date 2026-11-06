// Regular enemies: imps, bats, wisps, spitters and brutes.
import { G } from './state.js';
import { BIOMES, BIOME_LIST } from './world.js';
import { moveBody, groundAhead } from './physics.js';
import { rand, clamp, shade, overlap } from './util.js';
import { part, shake } from './fx.js';
import { sfx } from './audio.js';
import { hurtPlayer, shoot } from './combat.js';

export const ETYPES = {
  imp: { hp: 6, w: 24, h: 28, dmg: 1, gem: 3, fly: 0 },
  bat: { hp: 3, w: 28, h: 18, dmg: 1, gem: 2, fly: 1 },
  wisp: { hp: 5, w: 24, h: 24, dmg: 1, gem: 3, fly: 1, ghost: 1 },
  spitter: { hp: 9, w: 32, h: 26, dmg: 1, gem: 4, fly: 0 },
  brute: { hp: 26, w: 46, h: 48, dmg: 2, gem: 8, fly: 0 },
};

export function makeEnemy(type, x, y, level, biome) {
  const d = ETYPES[type], B = BIOMES[BIOME_LIST[biome]], m = 1 + 0.45 * (level - 1);
  return {
    type, x: x - d.w / 2, y: y - d.h, w: d.w, h: d.h, vx: 0, vy: 0, hp: d.hp * m, max: d.hp * m,
    dmg: d.dmg + Math.floor((level - 1) / 4), level, gem: d.gem, fly: d.fly, ghost: d.ghost,
    tint: B.tint, accent: B.accent, face: 1, t: rand(0, 10), cd: rand(0.5, 2), t2: 0, flash: 0, trap: 0, state: 'idle', ground: false, biome,
  };
}

export function updateEnemy(e, dt) {
  const p = G.player;
  e.t += dt; e.flash -= dt; e.cd -= dt; e.t2 -= dt;
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2, px = p.x + p.w / 2, py = p.y + p.h / 2;
  const dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy) || 1;
  if (e.trap > 0) {
    e.trap -= dt;
    e.vx *= 0.9;
    e.y -= 18 * dt;
    e.x += e.vx * dt;
    return;
  }
  const aware = d < 640 && !p.dead;
  switch (e.type) {
    case 'imp': {
      if (aware) {
        e.face = dx < 0 ? -1 : 1;
        e.vx += (e.face * (130 + e.level * 4) - e.vx) * Math.min(1, 6 * dt);
        if (e.ground && e.cd < 0 && (e.hitWall || (dy < -50 && Math.abs(dx) < 240) || !groundAhead(e, e.face))) { e.vy = -640; e.cd = 0.9; }
      } else {
        if (e.hitWall || (e.ground && !groundAhead(e, e.face))) e.face *= -1;
        e.vx = e.face * 55;
      }
      e.vy = Math.min(e.vy + 1800 * dt, 900);
      moveBody(e, dt);
      break;
    }
    case 'brute': {
      if (e.state === 'wind') {
        e.vx *= 0.85;
        if (Math.random() < 0.4) part({ x: cx + rand(-20, 20), y: e.y + e.h, vy: -40, life: 0.4, size: 3, color: '#ccc' });
        if (e.t2 <= 0) { e.state = 'charge'; e.t2 = 0.85; }
      } else if (e.state === 'charge') {
        e.vx = e.face * 470;
        if (e.hitWall) { e.state = 'idle'; e.cd = 1.3; shake(6); sfx('land'); }
        else if (e.t2 <= 0) { e.state = 'idle'; e.cd = 1.4; }
      } else {
        if (aware) {
          e.face = dx < 0 ? -1 : 1;
          e.vx += (e.face * 85 - e.vx) * Math.min(1, 4 * dt);
          if (e.cd < 0 && Math.abs(dy) < 80 && Math.abs(dx) < 400) { e.state = 'wind'; e.t2 = 0.5; }
          if (e.ground && e.hitWall && e.cd < 0) { e.vy = -560; e.cd = 0.6; }
        } else {
          if (e.hitWall || (e.ground && !groundAhead(e, e.face))) e.face *= -1;
          e.vx = e.face * 40;
        }
      }
      e.vy = Math.min(e.vy + 1800 * dt, 900);
      moveBody(e, dt);
      break;
    }
    case 'spitter': {
      e.vx *= 0.8;
      e.vy = Math.min(e.vy + 1800 * dt, 900);
      moveBody(e, dt);
      if (aware) e.face = dx < 0 ? -1 : 1;
      if (aware && e.cd < 0 && d < 580) {
        e.cd = Math.max(1.3, 2.6 - e.level * 0.06);
        e.t2 = 0.25;
        const tt = clamp(d / 430, 0.6, 1.3), g = 900;
        shoot({ x: cx, y: e.y + 4, vx: dx / tt, vy: (dy - 0.5 * g * tt * tt) / tt, g, r: 7, dmg: e.dmg, color: e.accent, kind: 'glob', trail: e.tint });
        sfx('shoot');
      }
      break;
    }
    case 'bat': {
      if (aware) {
        const s = 190 + e.level * 5;
        const tx = dx + Math.sin(e.t * 2.6) * 70, ty = dy - 30 + Math.cos(e.t * 3.4) * 60, l = Math.hypot(tx, ty) || 1;
        e.vx += ((tx / l) * s - e.vx) * 2.6 * dt;
        e.vy += ((ty / l) * s - e.vy) * 2.6 * dt;
      } else {
        e.vx = Math.sin(e.t) * 40;
        e.vy = Math.cos(e.t * 1.3) * 30;
      }
      e.face = e.vx < 0 ? -1 : 1;
      moveBody(e, dt);
      break;
    }
    case 'wisp': {
      if (aware) {
        const s = 80 + e.level * 3;
        e.vx += ((dx / d) * s - e.vx) * 1.4 * dt;
        e.vy += ((dy / d) * s - e.vy) * 1.4 * dt;
        if (e.level >= 3 && e.cd < 0 && d < 460) {
          e.cd = 3.2;
          shoot({ x: cx, y: cy, vx: (dx / d) * 220, vy: (dy / d) * 220, r: 6, dmg: 1, color: e.accent, kind: 'orb', ghost: true, life: 3 });
        }
      } else {
        e.vx *= 0.95;
        e.vy = Math.sin(e.t * 2) * 20;
      }
      e.face = e.vx < 0 ? -1 : 1;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (Math.random() < 0.5) part({ x: cx + rand(-6, 6), y: cy + rand(-6, 6), vx: -e.vx * 0.3, vy: -e.vy * 0.3 - 20, life: 0.5, size: 4, color: e.accent, add: true });
      break;
    }
  }
  if (!p.dead && p.dashT <= 0 && overlap(e, p)) hurtPlayer(e.dmg, cx);
}

// ---------- Drawing ----------
export function drawEnemy(ctx, e, t) {
  ctx.save();
  ctx.translate(e.x + e.w / 2, e.y + e.h);
  ctx.scale(e.face, 1);
  const col = e.flash > 0 ? '#ffffff' : e.tint, dark = e.flash > 0 ? '#ffffff' : shade(e.tint, -0.55), eye = '#ffe066';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (e.type) {
    case 'imp': {
      const step = Math.sin(e.t * 14) * (Math.abs(e.vx) > 20 ? 1 : 0);
      ctx.strokeStyle = dark;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-5, -8); ctx.lineTo(-5 + step * 4, 0);
      ctx.moveTo(5, -8); ctx.lineTo(5 - step * 4, 0);
      ctx.stroke();
      // tail
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8, -12);
      ctx.quadraticCurveTo(-18, -10 + Math.sin(e.t * 5) * 4, -16, -22);
      ctx.stroke();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-16, -26); ctx.lineTo(-19, -20); ctx.lineTo(-13, -21);
      ctx.fill();
      // wings
      ctx.fillStyle = shade(e.tint, -0.3);
      ctx.beginPath();
      ctx.moveTo(-4, -20);
      ctx.lineTo(-16, -30 - Math.sin(e.t * 10) * 3);
      ctx.lineTo(-12, -18);
      ctx.fill();
      const g = ctx.createRadialGradient(0, -18, 2, 0, -14, 14);
      g.addColorStop(0, e.flash > 0 ? '#fff' : shade(e.tint, 0.2));
      g.addColorStop(1, col);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, -15, 11, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2e6d0';
      ctx.beginPath();
      ctx.moveTo(-6, -25); ctx.quadraticCurveTo(-10, -32, -6, -35); ctx.lineTo(-3, -26);
      ctx.moveTo(5, -25); ctx.quadraticCurveTo(9, -32, 6, -35); ctx.lineTo(2, -26);
      ctx.fill();
      ctx.fillStyle = eye;
      ctx.beginPath();
      ctx.ellipse(3, -18, 2.4, 3, 0, 0, Math.PI * 2);
      ctx.ellipse(8.5, -18, 2, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1a0a0a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(1, -10); ctx.lineTo(4, -12); ctx.lineTo(6, -10); ctx.lineTo(9, -12);
      ctx.stroke();
      break;
    }
    case 'bat': {
      const flap = Math.sin(e.t * 18);
      ctx.translate(0, -9);
      ctx.fillStyle = dark;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(s * 10, -14 * flap - 4, s * 20, -8 * flap);
        ctx.lineTo(s * 15, 2);
        ctx.lineTo(s * 10, -1);
        ctx.lineTo(s * 6, 4);
        ctx.fill();
      }
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-5, -5); ctx.lineTo(-4, -12); ctx.lineTo(-1, -6);
      ctx.moveTo(5, -5); ctx.lineTo(4, -12); ctx.lineTo(1, -6);
      ctx.fill();
      ctx.fillStyle = eye;
      ctx.fillRect(-3.5, -2, 2.5, 2.5);
      ctx.fillRect(1, -2, 2.5, 2.5);
      break;
    }
    case 'wisp': {
      ctx.translate(0, -12 + Math.sin(e.t * 3) * 2);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.35, e.flash > 0 ? '#fff' : e.accent);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(20,10,40,.85)';
      ctx.beginPath();
      ctx.ellipse(-4, -2, 2.2, 3.4, 0, 0, Math.PI * 2);
      ctx.ellipse(4, -2, 2.2, 3.4, 0, 0, Math.PI * 2);
      ctx.ellipse(0, 6, 3, 2 + Math.sin(e.t * 4), 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'spitter': {
      const puff = e.t2 > 0 ? 1.15 : 1 + Math.sin(e.t * 3) * 0.03;
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.ellipse(0, -2, 17, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      const g = ctx.createLinearGradient(0, -28, 0, 0);
      g.addColorStop(0, e.flash > 0 ? '#fff' : shade(e.tint, 0.15));
      g.addColorStop(1, col);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-15, 0);
      ctx.quadraticCurveTo(-16 * puff, -24 * puff, 0, -26 * puff);
      ctx.quadraticCurveTo(16 * puff, -24 * puff, 15, 0);
      ctx.fill();
      ctx.fillStyle = '#1a0606';
      ctx.beginPath();
      ctx.ellipse(6, -18 * puff, 6, 4.5 * puff, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = e.accent;
      ctx.beginPath();
      ctx.ellipse(6, -18 * puff, 3, 2, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = eye;
      ctx.beginPath();
      ctx.arc(-4, -16, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.3)';
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(-9 + k * 6, -6 - (k % 2) * 4, 2, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case 'brute': {
      const charge = e.state === 'charge', wind = e.state === 'wind';
      const step = Math.sin(e.t * (charge ? 20 : 8)) * (Math.abs(e.vx) > 20 ? 1 : 0);
      ctx.strokeStyle = dark;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(-10, -16); ctx.lineTo(-10 + step * 6, 0);
      ctx.moveTo(10, -16); ctx.lineTo(10 - step * 6, 0);
      ctx.stroke();
      const g = ctx.createRadialGradient(4, -34, 4, 0, -26, 28);
      g.addColorStop(0, e.flash > 0 ? '#fff' : shade(e.tint, 0.15));
      g.addColorStop(1, col);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(-2, -26, 22, 20, charge ? 0.25 : 0.1, 0, Math.PI * 2);
      ctx.fill();
      // arms
      ctx.strokeStyle = col;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(10, -34); ctx.lineTo(22 + (wind ? -6 : 0), -18 + step * 3);
      ctx.stroke();
      ctx.fillStyle = '#f2e6d0';
      ctx.beginPath();
      ctx.moveTo(22, -14); ctx.lineTo(28, -12); ctx.lineTo(22, -10);
      ctx.fill();
      // head
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(14, -40, 10, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2e6d0';
      ctx.beginPath();
      ctx.moveTo(16, -34); ctx.lineTo(20, -42); ctx.lineTo(21, -34);
      ctx.moveTo(8, -48); ctx.quadraticCurveTo(4, -58, 12, -60); ctx.lineTo(12, -48);
      ctx.fill();
      ctx.fillStyle = wind || charge ? '#ff3030' : eye;
      ctx.beginPath();
      ctx.ellipse(18, -43, 2.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
  if (e.trap > 0) {
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    ctx.fillStyle = 'rgba(170,235,255,.25)';
    ctx.strokeStyle = 'rgba(220,250,255,.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(e.w, e.h) * 0.75 + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  if (e.hp < e.max) {
    const w = Math.max(28, e.w);
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(e.x + e.w / 2 - w / 2, e.y - 10, w, 4);
    ctx.fillStyle = '#ff4a6a';
    ctx.fillRect(e.x + e.w / 2 - w / 2, e.y - 10, w * Math.max(0, e.hp / e.max), 4);
  }
}
