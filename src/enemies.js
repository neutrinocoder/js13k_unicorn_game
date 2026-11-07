// Regular enemies: demons, spiders, hell bats, flaming skulls, bile maws and hell knights.
import { G } from './state.js';
import { BIOMES, BIOME_LIST } from './world.js';
import { moveBody, groundAhead } from './physics.js';
import { rand, clamp, shade, mix, overlap } from './util.js';
import { part, shake } from './fx.js';
import { sfx } from './audio.js';
import { hurtPlayer, shoot } from './combat.js';
import { flame, eye, glow, limb, horn, teeth } from './art.js';

// Internal ids stay the same so old saves and spawn tables keep working.
// imp = demon, bat = hell bat, wisp = flaming skull, spitter = bile maw, brute = hell knight.
export const ETYPES = {
  imp: { hp: 6, w: 24, h: 30, dmg: 1, gem: 3, fly: 0 },
  spider: { hp: 7, w: 32, h: 20, dmg: 1, gem: 3, fly: 0 },
  bat: { hp: 3, w: 28, h: 18, dmg: 1, gem: 2, fly: 1 },
  wisp: { hp: 5, w: 26, h: 26, dmg: 1, gem: 3, fly: 1, ghost: 1 },
  spitter: { hp: 9, w: 34, h: 26, dmg: 1, gem: 4, fly: 0 },
  brute: { hp: 26, w: 46, h: 52, dmg: 2, gem: 8, fly: 0 },
};

export function makeEnemy(type, x, y, level, biome, hang = false) {
  const d = ETYPES[type], B = BIOMES[BIOME_LIST[biome]], m = 1 + (type === 'spider' ? 0.45 : 0.3) * (level - 1);
  const e = {
    type, x: x - d.w / 2, y: y - d.h, w: d.w, h: d.h, vx: 0, vy: 0, hp: d.hp * m, max: d.hp * m,
    dmg: d.dmg + Math.floor((level - 1) / (type === 'spider' ? 4 : 7)), level, gem: d.gem, fly: d.fly, ghost: d.ghost,
    tint: B.tint, accent: B.accent, face: 1, t: rand(0, 10), cd: rand(0.5, 2), t2: 0, flash: 0, trap: 0, state: 'idle', ground: false, biome,
  };
  if (type === 'spider') {
    e.state = hang ? 'hang' : 'hunt';
    e.anchorY = y;
    e.homeX = x;
    if (hang) e.y = y + 26;
  }
  return e;
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
  const aware = d < (e.type === 'spider' ? 680 : 540) && !p.dead;
  const wander = speed => {
    if (e.hitWall || (e.ground && !groundAhead(e, e.face))) e.face *= -1;
    e.vx = e.face * speed;
  };
  switch (e.type) {
    case 'imp': {
      if (aware) {
        e.face = dx < 0 ? -1 : 1;
        e.vx += (e.face * (135 + e.level * 4) - e.vx) * Math.min(1, 6 * dt);
        if (e.ground && e.cd < 0 && (e.hitWall || (dy < -50 && Math.abs(dx) < 260) || !groundAhead(e, e.face))) { e.vy = -680; e.cd = 1.2; }
      } else wander(60);
      e.vy = Math.min(e.vy + 1800 * dt, 900);
      moveBody(e, dt);
      break;
    }
    case 'spider': {
      if (e.state === 'hang') {
        e.vx = e.vy = 0;
        e.x = e.homeX - e.w / 2 + Math.sin(e.t * 0.9) * 3;
        e.y = e.anchorY + 22 + Math.sin(e.t * 1.6) * 4;
        if (e.flash > 0 || (aware && dy > -20 && Math.abs(dx) < 210)) { e.state = 'drop'; e.vy = 120; }
      } else if (e.state === 'drop') {
        e.vy = Math.min(e.vy + 1700 * dt, 800);
        e.vx *= 0.9;
        moveBody(e, dt);
        if (e.ground) { e.state = 'hunt'; e.cd = 0.35; sfx('land', 0.4); }
      } else {
        if (aware) {
          e.face = dx < 0 ? -1 : 1;
          e.vx += (e.face * (190 + e.level * 5) - e.vx) * Math.min(1, 7 * dt);
          if (e.ground && e.cd < 0 && Math.abs(dx) < 280 && Math.abs(dy) < 170) { e.vy = -560; e.vx = e.face * 480; e.cd = 1.4; }
          else if (e.ground && e.hitWall && e.cd < 0) { e.vy = -640; e.cd = 0.6; }
        } else wander(70);
        e.vy = Math.min(e.vy + 1800 * dt, 900);
        moveBody(e, dt);
      }
      break;
    }
    case 'brute': {
      if (e.state === 'wind') {
        e.vx *= 0.85;
        if (Math.random() < 0.5) part({ x: cx + rand(-20, 20), y: e.y + e.h, vy: -40, life: 0.4, size: 3, color: '#ccc' });
        if (e.t2 <= 0) { e.state = 'charge'; e.t2 = 0.75; }
      } else if (e.state === 'charge') {
        e.vx = e.face * 420;
        if (Math.random() < 0.6) part({ x: cx - e.face * 20, y: e.y + e.h - 4, vx: -e.face * 80, vy: -30, life: 0.4, size: 4, color: e.accent, add: true });
        if (e.hitWall) { e.state = 'idle'; e.cd = 1.9; shake(6); sfx('land'); }
        else if (e.t2 <= 0) { e.state = 'idle'; e.cd = 2; }
      } else {
        if (aware) {
          e.face = dx < 0 ? -1 : 1;
          e.vx += (e.face * 100 - e.vx) * Math.min(1, 4 * dt);
          if (e.cd < 0 && Math.abs(dy) < 80 && Math.abs(dx) < 420) { e.state = 'wind'; e.t2 = 0.8; }
          if (e.ground && e.hitWall && e.cd < 0) { e.vy = -600; e.cd = 0.6; }
        } else wander(45);
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
      if (aware && e.cd < 0 && d < 600) {
        e.cd = Math.max(2.2, 3.4 - e.level * 0.05);
        e.t2 = 0.25;
        const tt = clamp(d / 430, 0.6, 1.3), g = 900;
        shoot({ x: cx + e.face * 10, y: e.y + 6, vx: dx / tt, vy: (dy - 0.5 * g * tt * tt) / tt, g, r: 7, dmg: e.dmg, color: e.accent, kind: 'glob', trail: e.tint });
        sfx('shoot');
      }
      break;
    }
    case 'bat': {
      if (aware) {
        const s = 175 + e.level * 4;
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
        const s = 80 + e.level * 2;
        e.vx += ((dx / d) * s - e.vx) * 1.4 * dt;
        e.vy += ((dy / d) * s - e.vy) * 1.4 * dt;
        if (e.level >= 5 && e.cd < 0 && d < 420) {
          e.cd = 4.2;
          shoot({ x: cx, y: cy, vx: (dx / d) * 180, vy: (dy / d) * 180, r: 6, dmg: 1, color: e.accent, kind: 'orb', ghost: true, life: 3 });
        }
      } else {
        e.vx *= 0.95;
        e.vy = Math.sin(e.t * 2) * 20;
      }
      e.face = e.vx < 0 ? -1 : 1;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (Math.random() < 0.6) part({ x: cx + rand(-7, 7), y: cy - 6 + rand(-5, 5), vx: -e.vx * 0.4, vy: -e.vy * 0.3 - 40, life: 0.5, size: rand(3, 5), color: Math.random() < 0.5 ? e.accent : '#ffffff', add: true });
      break;
    }
  }
  if (!p.dead && p.dashT <= 0 && overlap(e, p)) hurtPlayer(e.dmg, cx);
}

// ---------- Drawing ----------
const WHITE = { body: '#ffffff', dark: '#ffffff', light: '#ffffff', wing: '#ffffff', bone: '#ffffff' };

function palette(e, base, k) {
  if (e.flash > 0) return WHITE;
  const body = mix(e.tint, base, k);
  return { body, dark: shade(body, -0.55), light: shade(body, 0.3), wing: shade(body, -0.35), bone: '#efe2c8' };
}

export function drawEnemy(ctx, e, t) {
  ctx.save();
  ctx.translate(e.x + e.w / 2, e.y + e.h);
  if (e.type === 'spider' && (e.state === 'hang' || e.state === 'drop')) {
    // silk thread back up to the ceiling
    ctx.strokeStyle = 'rgba(235,235,255,.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -e.h * 0.6);
    ctx.lineTo(0, e.anchorY - (e.y + e.h));
    ctx.stroke();
  }
  ctx.scale(e.face, 1);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  DRAW[e.type](ctx, e, t);
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
    ctx.fillRect(e.x + e.w / 2 - w / 2, e.y - 12, w, 4);
    ctx.fillStyle = '#ff4a6a';
    ctx.fillRect(e.x + e.w / 2 - w / 2, e.y - 12, w * Math.max(0, e.hp / e.max), 4);
  }
}

const DRAW = {
  // Winged demon with goat legs, curled horns and a forked tail.
  imp(ctx, e, t) {
    const C = palette(e, '#c4243a', 0.55), air = !e.ground, run = Math.min(1, Math.abs(e.vx) / 120), ph = e.t * 15;
    const flap = Math.sin(e.t * (air ? 24 : 5));
    // wings
    for (const [s, col] of [[-1, shade(C.wing, -0.25)], [1, C.wing]]) {
      ctx.save();
      ctx.translate(-2, -22);
      ctx.rotate((s < 0 ? -0.35 : 0) - flap * 0.35);
      ctx.fillStyle = col;
      ctx.strokeStyle = C.dark;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-10, -14);
      ctx.lineTo(-22, -10);
      ctx.quadraticCurveTo(-19, -5, -20, -1);
      ctx.quadraticCurveTo(-15, -3, -14, 2);
      ctx.quadraticCurveTo(-9, -1, -6, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath(); ctx.moveTo(-10, -14); ctx.lineTo(-14, 2); ctx.moveTo(-10, -14); ctx.lineTo(-20, -1); ctx.stroke();
      ctx.restore();
    }
    // forked tail
    const tw = Math.sin(e.t * 5) * 4;
    ctx.strokeStyle = C.dark;
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(-6, -11); ctx.bezierCurveTo(-16, -8, -16, -20 + tw, -24, -18 + tw); ctx.stroke();
    ctx.fillStyle = C.dark;
    ctx.beginPath(); ctx.moveTo(-28, -19 + tw); ctx.lineTo(-22, -22 + tw); ctx.lineTo(-23, -15 + tw); ctx.closePath(); ctx.fill();
    // goat legs
    for (const s of [-1, 1]) {
      const sw = air ? 0 : Math.sin(ph + (s > 0 ? Math.PI : 0)) * run;
      limb(ctx, [[s * 3 - 1, -12], [s * 3 + 3 + sw * 3, -7], [s * 3 - 2 + sw * 4, -3], [s * 3 + 1 + sw * 5, 0]], 3.4, s > 0 ? C.body : C.wing);
    }
    // torso
    const g = ctx.createLinearGradient(0, -26, 0, -10);
    g.addColorStop(0, C.light);
    g.addColorStop(1, C.body);
    ctx.fillStyle = g;
    ctx.strokeStyle = C.dark;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-6, -12);
    ctx.quadraticCurveTo(-9, -22, -3, -26);
    ctx.quadraticCurveTo(5, -28, 8, -22);
    ctx.quadraticCurveTo(8, -15, 4, -11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(1, -21); ctx.lineTo(1, -13); ctx.moveTo(-2, -17); ctx.lineTo(4, -17); ctx.stroke();
    // clawed arm reaching forward
    const reach = Math.sin(e.t * 6) * 2;
    limb(ctx, [[5, -22], [11, -18 + reach], [15, -20 + reach]], 2.8, C.body);
    ctx.strokeStyle = C.bone;
    ctx.lineWidth = 1;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(15, -20 + reach); ctx.lineTo(18, -22 + k * 2 + reach); ctx.stroke(); }
    // head
    ctx.fillStyle = C.body;
    ctx.strokeStyle = C.dark;
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(4, -30, 7, 6.2, 0.1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6, -27); ctx.quadraticCurveTo(13, -27, 11, -24); ctx.quadraticCurveTo(7, -23, 3, -25); ctx.fill(); ctx.stroke();
    horn(ctx, 1, -34, 11, -7, 2.4, -1, C.bone);
    horn(ctx, 6, -35, 10, -5, 2.2, -1, C.bone);
    ctx.fillStyle = '#1a0606';
    ctx.beginPath(); ctx.moveTo(4, -26); ctx.quadraticCurveTo(8, -24, 12, -25.5); ctx.lineTo(11, -24.5); ctx.quadraticCurveTo(8, -23.2, 4.5, -25); ctx.fill();
    teeth(ctx, 5, -25.6, 11.5, -25.3, 4, 1.8);
    eye(ctx, 7.5, -31, 1.6, '#ffe14a', '#fff', 3.2);
  },

  // A big-bodied spider with eight jointed legs, a glowing mark and a cluster of eyes.
  spider(ctx, e, t) {
    const C = palette(e, '#2a1626', 0.6), hanging = e.state === 'hang' || e.state === 'drop';
    const run = hanging ? 0 : Math.min(1, Math.abs(e.vx) / 150), ph = e.t * 18;
    const legs = (far) => {
      for (let i = 0; i < 4; i++) {
        const hipX = 4 + (i - 1.5) * 2.6, hipY = -11;
        const dir = i < 2 ? 1 : -1, reach = 13 + Math.abs(i - 1.5) * 6;
        const step = Math.sin(ph + i * 1.7 + (far ? Math.PI : 0)) * run;
        let kx, ky, fx, fy;
        if (hanging) { kx = hipX + dir * 7; ky = hipY - 9; fx = hipX + dir * 5; fy = hipY + 2; }
        else { fx = hipX + dir * reach + step * 5; fy = -Math.max(0, step) * 4; kx = hipX + dir * reach * 0.5 + step * 2; ky = hipY - 12 - Math.abs(i - 1.5) * 1.5 - Math.max(0, step) * 2; }
        limb(ctx, [[hipX, hipY], [kx, ky], [fx, fy]], far ? 1.9 : 2.3, far ? C.dark : C.body, 'rgba(0,0,0,.7)');
      }
    };
    legs(true);
    // abdomen
    const g = ctx.createRadialGradient(-10, -16, 2, -8, -11, 13);
    g.addColorStop(0, C.light);
    g.addColorStop(1, C.dark);
    ctx.fillStyle = g;
    ctx.strokeStyle = 'rgba(0,0,0,.7)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(-9, -12, 11.5, 9, -0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // glowing hourglass mark
    const pulse = 0.6 + Math.sin(e.t * 4) * 0.4;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = e.flash > 0 ? '#fff' : e.accent;
    ctx.globalAlpha = 0.55 + pulse * 0.35;
    ctx.beginPath(); ctx.moveTo(-13, -18); ctx.lineTo(-5, -18); ctx.lineTo(-9, -13); ctx.lineTo(-5, -8); ctx.lineTo(-13, -8); ctx.lineTo(-9, -13); ctx.closePath(); ctx.fill();
    ctx.restore();
    glow(ctx, -9, -13, 14, e.accent, 0.25 * pulse);
    // bristles
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 7; k++) { const a = -2.6 + k * 0.4; ctx.beginPath(); ctx.moveTo(-9 + Math.cos(a) * 11, -12 + Math.sin(a) * 8.5); ctx.lineTo(-9 + Math.cos(a) * 14, -12 + Math.sin(a) * 11); ctx.stroke(); }
    legs(false);
    // head
    ctx.fillStyle = C.body;
    ctx.strokeStyle = 'rgba(0,0,0,.7)';
    ctx.beginPath(); ctx.ellipse(6, -10, 7.5, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // fangs
    ctx.fillStyle = C.bone;
    for (const fx of [9, 12]) { ctx.beginPath(); ctx.moveTo(fx - 1.5, -7); ctx.quadraticCurveTo(fx + 1.5, -4, fx, -1.5); ctx.lineTo(fx - 0.6, -6.6); ctx.fill(); }
    // eye cluster
    for (const [x, y, r] of [[9.5, -12.5, 1.5], [12, -11.5, 1.3], [7.5, -13.8, 1.1], [10.8, -14.6, 1], [13.2, -13.5, 0.9], [6.5, -11.8, 0.9]]) eye(ctx, x, y, r, '#ff2a3a', '#ffd0d0', 2.6);
  },

  // A hell bat: leathery wings with bone fingers, horns and fangs.
  bat(ctx, e, t) {
    const C = palette(e, '#3a1020', 0.6), flap = Math.sin(e.t * 20);
    ctx.translate(0, -10);
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.scale(s, 1);
      ctx.rotate(-flap * 0.5);
      const g = ctx.createLinearGradient(0, 0, 26, 0);
      g.addColorStop(0, C.wing);
      g.addColorStop(1, shade(C.wing, 0.25));
      ctx.fillStyle = g;
      ctx.strokeStyle = C.dark;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(2, -2);
      ctx.lineTo(10, -12);
      ctx.lineTo(26, -9);
      ctx.quadraticCurveTo(23, -4, 25, 0);
      ctx.quadraticCurveTo(19, -1, 17, 4);
      ctx.quadraticCurveTo(12, 1, 9, 6);
      ctx.quadraticCurveTo(6, 2, 2, 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,.45)';
      ctx.beginPath(); ctx.moveTo(10, -12); ctx.lineTo(17, 4); ctx.moveTo(10, -12); ctx.lineTo(25, 0); ctx.moveTo(10, -12); ctx.lineTo(9, 6); ctx.stroke();
      ctx.fillStyle = C.bone;
      ctx.beginPath(); ctx.moveTo(10, -12); ctx.lineTo(9, -16); ctx.lineTo(12, -12.5); ctx.fill();
      ctx.restore();
    }
    const g = ctx.createRadialGradient(0, -2, 1, 0, 0, 9);
    g.addColorStop(0, C.light);
    g.addColorStop(1, C.dark);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, 7, 8.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.body;
    ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(-6, -14); ctx.lineTo(-1.5, -7); ctx.moveTo(5, -5); ctx.lineTo(6, -14); ctx.lineTo(1.5, -7); ctx.fill();
    ctx.fillStyle = '#1a0606';
    ctx.beginPath(); ctx.ellipse(1, 3, 3.5, 2, 0, 0, Math.PI * 2); ctx.fill();
    teeth(ctx, -2, 2.6, 4, 2.6, 3, 2.4);
    eye(ctx, -2.2, -2, 1.5, '#ff3a3a', '#fff', 3);
    eye(ctx, 2.8, -2, 1.5, '#ff3a3a', '#fff', 3);
  },

  // A flaming skull: chattering jaw and burning eye sockets.
  wisp(ctx, e, t) {
    const C = palette(e, '#efe2c8', 0.85), chatter = Math.max(0, Math.sin(e.t * 16)) * 2.5;
    ctx.translate(0, -13 + Math.sin(e.t * 3) * 2);
    flame(ctx, 0, 6, 26, 40, e.t, [e.accent, shade(e.accent, 0.4), '#ffffff'], e.level, 5);
    glow(ctx, 0, -2, 26, e.accent, 0.35);
    const bone = e.flash > 0 ? '#ffffff' : '#f1e6cf';
    const g = ctx.createRadialGradient(-3, -6, 1, 0, -2, 12);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, shade(bone, -0.25));
    ctx.fillStyle = g;
    ctx.strokeStyle = 'rgba(60,40,30,.7)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-9, 2);
    ctx.quadraticCurveTo(-11, -11, 0, -12);
    ctx.quadraticCurveTo(11, -11, 9, 2);
    ctx.lineTo(6, 4);
    ctx.lineTo(-6, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // jaw
    ctx.beginPath();
    ctx.moveTo(-6, 4 + chatter); ctx.lineTo(6, 4 + chatter); ctx.lineTo(4.5, 8 + chatter); ctx.lineTo(-4.5, 8 + chatter); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a1410';
    for (let k = 0; k < 4; k++) { ctx.fillRect(-4.5 + k * 2.6, 3.4, 1.6, 1.6); ctx.fillRect(-4 + k * 2.4, 4.6 + chatter, 1.5, 1.4); }
    // sockets and nose
    ctx.fillStyle = '#1a0a0a';
    ctx.beginPath(); ctx.ellipse(-3.8, -3, 3, 3.4, 0.2, 0, Math.PI * 2); ctx.ellipse(3.8, -3, 3, 3.4, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-1.4, 2.6); ctx.lineTo(1.4, 2.6); ctx.closePath(); ctx.fill();
    eye(ctx, -3.6, -2.6, 1.3, e.accent, '#ffffff', 4);
    eye(ctx, 4, -2.6, 1.3, e.accent, '#ffffff', 4);
    ctx.strokeStyle = 'rgba(60,40,30,.45)';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(2, -11); ctx.lineTo(3.5, -8); ctx.lineTo(2.5, -6.5); ctx.stroke();
  },

  // A bile maw: a squat, horned demon toad with a glowing throat sac.
  spitter(ctx, e, t) {
    const C = palette(e, '#4a5a22', 0.5), charge = e.cd < 0.5 ? 1 - Math.max(0, e.cd) / 0.5 : 0, puff = e.t2 > 0 ? 1.15 : 1 + Math.sin(e.t * 3) * 0.03;
    // back legs
    limb(ctx, [[-10, -6], [-17, -10], [-14, 0]], 5, C.wing);
    limb(ctx, [[8, -6], [12, -3], [10, 0]], 4, C.wing);
    // body
    const g = ctx.createRadialGradient(-2, -20, 3, 0, -10, 22);
    g.addColorStop(0, C.light);
    g.addColorStop(1, C.dark);
    ctx.fillStyle = g;
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-17, -2);
    ctx.quadraticCurveTo(-19 * puff, -22 * puff, -2, -24 * puff);
    ctx.quadraticCurveTo(16 * puff, -24 * puff, 17, -8);
    ctx.quadraticCurveTo(14, -1, 4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // warts
    ctx.fillStyle = shade(C.body, 0.35);
    for (const [x, y, r] of [[-10, -16, 2.2], [-4, -21, 1.6], [-13, -8, 1.8], [2, -18, 1.4], [-7, -11, 1.3]]) { ctx.beginPath(); ctx.arc(x, y * puff, r, 0, Math.PI * 2); ctx.fill(); }
    // glowing throat sac
    const sacR = 6 + charge * 4 + (e.t2 > 0 ? 3 : 0);
    const sg = ctx.createRadialGradient(10, -7, 1, 10, -7, sacR);
    sg.addColorStop(0, '#ffffff');
    sg.addColorStop(0.35, e.flash > 0 ? '#fff' : e.accent);
    sg.addColorStop(1, shade(e.accent, -0.4));
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.ellipse(10, -7, sacR, sacR * 0.75, 0, 0, Math.PI * 2); ctx.fill();
    glow(ctx, 10, -7, sacR * 2.4, e.accent, 0.25 + charge * 0.3);
    // mouth and teeth
    ctx.strokeStyle = '#1a0a06';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(3, -14 * puff); ctx.quadraticCurveTo(11, -11, 17, -13); ctx.stroke();
    teeth(ctx, 5, -13.5 * puff, 16, -12.8, 5, 2.4);
    // horns and eyes
    horn(ctx, -8, -22 * puff, 9, -5, 2.4, -1, C.bone);
    horn(ctx, 2, -23 * puff, 8, -3, 2.2, -1, C.bone);
    eye(ctx, 6, -19 * puff, 2.2, '#ffe14a', '#fff', 2.8);
    eye(ctx, 11, -17 * puff, 1.7, '#ffe14a', '#fff', 2.8);
    eye(ctx, 1.5, -20 * puff, 1.3, '#ffe14a', '#fff', 2.8);
    if (Math.random() < 0.05) part({ x: e.x + e.w / 2 + e.face * 14, y: e.y + e.h - 12, vx: 0, vy: 40, g: 400, life: 0.6, size: 2, color: e.accent });
  },

  // A hell knight: horned, armoured, with molten cracks that blaze when it charges.
  brute(ctx, e, t) {
    const C = palette(e, '#5a1a14', 0.45), charge = e.state === 'charge', wind = e.state === 'wind';
    const heat = charge ? 1 : wind ? 0.7 + Math.sin(e.t * 30) * 0.3 : 0.35 + Math.sin(e.t * 3) * 0.1;
    const step = Math.sin(e.t * (charge ? 20 : 8)) * (Math.abs(e.vx) > 20 ? 1 : 0);
    if (charge) ctx.rotate(0.15);
    const metal = e.flash > 0 ? '#fff' : '#3a3644', metalL = e.flash > 0 ? '#fff' : '#6a6478';
    // legs
    for (const s of [-1, 1]) {
      const sw = step * s;
      limb(ctx, [[s * 9, -20], [s * 9 + sw * 5 + 2, -10], [s * 9 + sw * 7, 0]], 8, s > 0 ? C.body : C.wing);
      ctx.fillStyle = metal;
      ctx.fillRect(s * 9 + sw * 7 - 6, -5, 12, 5);
    }
    // torso
    const g = ctx.createLinearGradient(-20, -50, 20, -18);
    g.addColorStop(0, C.light);
    g.addColorStop(1, C.dark);
    ctx.fillStyle = g;
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-14, -18);
    ctx.quadraticCurveTo(-24, -38, -16, -50);
    ctx.quadraticCurveTo(0, -58, 18, -48);
    ctx.quadraticCurveTo(24, -32, 12, -18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // molten cracks
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,${120 + heat * 100},40,${0.35 + heat * 0.6})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-10, -44); ctx.lineTo(-4, -36); ctx.lineTo(-8, -28); ctx.lineTo(-2, -22);
    ctx.moveTo(8, -46); ctx.lineTo(4, -38); ctx.lineTo(10, -30);
    ctx.stroke();
    ctx.restore();
    // chest plate with rune
    ctx.fillStyle = metal;
    ctx.strokeStyle = metalL;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-8, -46); ctx.lineTo(12, -46); ctx.lineTo(14, -32); ctx.lineTo(2, -24); ctx.lineTo(-10, -32); ctx.closePath(); ctx.fill(); ctx.stroke();
    eye(ctx, 2, -36, 2.4 + heat, e.accent, '#ffffff', 3);
    // spiked pauldron
    ctx.fillStyle = metal;
    ctx.beginPath(); ctx.ellipse(12, -48, 10, 6.5, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = metalL;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(6 + k * 5, -52); ctx.lineTo(8 + k * 5, -60 - (k === 1 ? 3 : 0)); ctx.lineTo(10 + k * 5, -52); ctx.fill(); }
    // arm with claws
    const lift = wind ? -8 : 0;
    limb(ctx, [[14, -44], [24, -32 + lift], [28, -20 + lift + step * 2]], 8, C.body);
    ctx.strokeStyle = C.bone;
    ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(28, -20 + lift); ctx.lineTo(33 + k, -18 + k * 3 + lift); ctx.stroke(); }
    // head
    ctx.fillStyle = C.body;
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(10, -58, 9, 8, 0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = metal;
    ctx.beginPath(); ctx.moveTo(2, -62); ctx.lineTo(19, -63); ctx.lineTo(18, -57); ctx.lineTo(3, -56); ctx.closePath(); ctx.fill();
    horn(ctx, 4, -64, 16, -10, 3.6, -1, C.bone);
    horn(ctx, 14, -65, 13, 4, 3.2, 1, C.bone);
    eye(ctx, 15, -59.5, 1.8 + heat * 0.6, '#ffd34a', '#fff', 3.5);
    ctx.fillStyle = `rgba(255,${120 + heat * 80},40,${0.6 + heat * 0.4})`;
    ctx.fillRect(11, -54, 8, 2);
    teeth(ctx, 11, -54, 19, -54, 3, 2, false);
    if (heat > 0.6 && Math.random() < 0.4) part({ x: e.x + e.w / 2 + e.face * 16, y: e.y + e.h - 58, vx: e.face * 20, vy: -60, life: 0.6, size: 4, grow: 1.5, color: 'rgba(200,200,200,.25)' });
  },
};
