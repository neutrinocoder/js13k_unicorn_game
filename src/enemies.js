// Regular enemies: demons, spiders, hell bats, flaming skulls, bile maws and hell knights in the
// underworld; angels, cherubs, seraphim and ophanim guarding the heavens.
import { G } from './state.js';
import { BIOMES, BIOME_LIST } from './world.js';
import { moveBody, groundAhead } from './physics.js';
import { rand, clamp, shade, overlap, TAU } from './util.js';
import { part, shake, HOOKS } from './fx.js';
import { sfx } from './audio.js';
import { hurtPlayer, shoot } from './combat.js';
import { HELL } from './hell_enemies.js';
import * as HEAVEN from './heaven_enemies.js';

// Internal ids stay the same so old saves and spawn tables keep working.
// imp = demon, bat = hell bat, wisp = flaming skull, spitter = bile maw, brute = hell knight.
export const ETYPES = {
  imp: { hp: 6, w: 24, h: 30, dmg: 1, gem: 3, fly: 0 },
  spider: { hp: 7, w: 32, h: 20, dmg: 1, gem: 3, fly: 0 },
  bat: { hp: 3, w: 28, h: 18, dmg: 1, gem: 2, fly: 1 },
  wisp: { hp: 5, w: 26, h: 26, dmg: 1, gem: 3, fly: 1, ghost: 1 },
  spitter: { hp: 9, w: 34, h: 26, dmg: 1, gem: 4, fly: 0 },
  brute: { hp: 15, w: 46, h: 52, dmg: 2, gem: 8, fly: 0 },
  // the heavens
  angel: { hp: 13, w: 36, h: 56, dmg: 1, gem: 6, fly: 0 },
  cherub: { hp: 4, w: 28, h: 24, dmg: 1, gem: 3, fly: 1 },
  seraph: { hp: 8, w: 34, h: 34, dmg: 1, gem: 5, fly: 1, ghost: 1 },
  ophan: { hp: 9, w: 36, h: 36, dmg: 1, gem: 5, fly: 1 },
};

export function makeEnemy(type, x, y, level, biome, hang = false) {
  const d = ETYPES[type], B = BIOMES[BIOME_LIST[biome]], m = 1 + (type === 'spider' ? 0.45 : 0.3) * (level - 1);
  const e = {
    type, x: x - d.w / 2, y: y - d.h, w: d.w, h: d.h, vx: 0, vy: 0, hp: d.hp * m, max: d.hp * m,
    dmg: d.dmg + Math.floor((level - 1) / (type === 'spider' ? 4 : 7)), level, gem: d.gem, fly: d.fly, ghost: d.ghost,
    tint: B.tint, accent: B.accent, face: 1, t: rand(0, 10), cd: rand(0.5, 2), t2: 0, flash: 0, trap: 0, state: 'idle', ground: false, biome,
  };
  if (type === 'ophan') { e.homeY = e.y - 40; e.y = e.homeY; }
  if (type === 'spider') {
    e.state = hang ? 'hang' : 'hunt';
    e.anchorY = y;
    e.homeX = x;
    if (hang) e.y = y + 26;
  }
  return e;
}

// Walking enemies only turn once the player is clearly off to one side, and slow to a stop as
// they get underneath. Without this, a player straight above or below makes them flip direction
// every frame and shake left and right. Returns the speed to move at in the facing direction.
const shotDmg = e => Math.max(1, e.dmg - 1);

function chase(e, dx, speed) {
  const dz = e.w * 0.5 + 16;
  if (dx > dz) e.face = 1;
  else if (dx < -dz) e.face = -1;
  return Math.sign(dx) === e.face ? speed * clamp((Math.abs(dx) - 4) / dz, 0, 1) : 0;
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
  // a "!" pops up the moment a foe first spots you
  e.alertT = Math.max(0, (e.alertT || 0) - dt);
  if (aware && !e.alerted && e.state !== 'hang') { e.alerted = 1; e.alertT = 0.8; }
  else if (d > 900) e.alerted = 0;
  const wander = speed => {
    if (e.hitWall || (e.ground && !groundAhead(e, e.face))) e.face *= -1;
    e.vx = e.face * speed;
  };
  switch (e.type) {
    case 'imp': {
      if (aware) {
        e.vx += (e.face * chase(e, dx, 135 + e.level * 4) - e.vx) * Math.min(1, 6 * dt);
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
          e.vx += (e.face * chase(e, dx, 190 + e.level * 5) - e.vx) * Math.min(1, 7 * dt);
          if (e.ground && e.cd < 0 && Math.abs(dx) < 280 && Math.abs(dy) < 170) { e.vy = -560; e.vx = clamp(dx * 2.4, -480, 480); e.cd = 1.4; }
          else if (e.ground && e.hitWall && e.cd < 0) { e.vy = -640; e.cd = 0.6; }
        } else wander(70);
        e.vy = Math.min(e.vy + 1800 * dt, 900);
        moveBody(e, dt);
      }
      break;
    }
    case 'brute':
    case 'angel': {
      if (e.state === 'wind') {
        e.vx *= 0.85;
        chase(e, dx, 0);
        if (Math.random() < 0.5) part({ x: cx + rand(-20, 20), y: e.y + e.h, vy: -40, life: 0.4, size: 3, color: e.type === 'angel' ? '#fff6c4' : '#ccc', add: e.type === 'angel' });
        if (e.t2 <= 0) { e.state = 'charge'; e.t2 = 1; }
      } else if (e.state === 'charge') {
        e.vx = e.face * (e.type === 'angel' ? 800 : 640);
        if (Math.random() < 0.7) part({ x: cx - e.face * 20, y: e.y + e.h - 4, vx: -e.face * 80, vy: -30, life: 0.4, size: 4, color: e.accent, add: true });
        if (e.hitWall) { e.state = 'idle'; e.cd = e.type === 'angel' ? 0.6 : 1.1; shake(6); sfx('land'); }
        else if (e.t2 <= 0) { e.state = 'idle'; e.cd = e.type === 'angel' ? 0.5 : 0.9; }
      } else {
        if (aware) {
          const angel = e.type === 'angel';
          e.vx += (e.face * chase(e, dx, angel ? 215 : 165) - e.vx) * Math.min(1, 5 * dt);
          if (angel && e.ground && e.cd < 0 && dy < -110 && Math.abs(dx) < 340) {
            // spread the wings and leap up at a player above
            e.vy = -1000; e.vx = clamp(dx * 1.6, -420, 420); e.cd = 1.3;
            for (let i = 0; i < 10; i++) part({ x: cx + rand(-18, 18), y: e.y + e.h - 6, vx: rand(-120, 120), vy: rand(-40, 60), life: 0.7, size: 3, color: '#ffffff', add: true });
            sfx('dash', 0.5);
          }
          if (e.cd < 0 && Math.abs(dy) < 120 && Math.abs(dx) > 40 && Math.abs(dx) < 600) { e.state = 'wind'; e.t2 = angel ? 0.32 : 0.45; }
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
      if (aware) chase(e, dx, 0);
      if (aware && e.cd < 0 && d < 600) {
        e.cd = Math.max(2.2, 3.4 - e.level * 0.05);
        e.t2 = 0.25;
        const tt = clamp(d / 430, 0.6, 1.3), g = 900;
        shoot({ x: cx + e.face * 10, y: e.y + 6, vx: dx / tt, vy: (dy - 0.5 * g * tt * tt) / tt, g, r: 7, dmg: e.dmg, color: e.accent, kind: 'glob', trail: e.tint });
        sfx('shoot');
      }
      break;
    }
    case 'bat':
    case 'cherub': {
      if (e.type === 'cherub' && aware && e.cd < 0 && d < 560) {
        e.cd = rand(1.6, 2.4);
        e.t2 = 0.3;
        const a0 = Math.atan2(dy, dx);
        for (let i = -1; i <= 1; i++) {
          const a = a0 + i * 0.22;
          shoot({ x: cx + e.face * 8, y: cy, vx: Math.cos(a) * 470, vy: Math.sin(a) * 470, r: 5, dmg: shotDmg(e), color: '#ff8ad8', kind: 'shard', tip: '#ffe9f6', life: 2.5 });
        }
        sfx('shoot');
      }
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
    case 'wisp':
    case 'seraph': {
      if (e.type === 'seraph' && aware && e.cd < 0 && d < 500) {
        e.cd = rand(2.5, 3.3);
        e.t2 = 0.3;
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2 + e.t;
          shoot({ x: cx, y: cy, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, r: 6, dmg: shotDmg(e), color: '#ffb347', kind: 'orb', ghost: true, life: 2.6, trail: '#ff7a2a' });
        }
        sfx('fire');
      }
      if (aware) {
        const s = (e.type === 'seraph' ? 120 : 80) + e.level * 2;
        e.vx += ((dx / d) * s - e.vx) * 1.4 * dt;
        e.vy += ((dy / d) * s - e.vy) * 1.4 * dt;
        if (e.type === 'wisp' && e.level >= 5 && e.cd < 0 && d < 420) {
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
      if (e.type === 'wisp' && Math.random() < 0.6) part({ x: cx + rand(-7, 7), y: cy - 6 + rand(-5, 5), vx: -e.vx * 0.4, vy: -e.vy * 0.3 - 40, life: 0.5, size: rand(3, 5), color: Math.random() < 0.5 ? e.accent : '#ffffff', add: true });
      if (e.type === 'seraph' && Math.random() < 0.35) part({ x: cx + rand(-14, 14), y: cy + rand(-10, 10), vx: rand(-20, 20), vy: rand(-80, -30), life: 0.6, size: rand(2, 4), color: Math.random() < 0.5 ? '#ffb347' : '#fff6c4', add: true });
      break;
    }
    case 'ophan': {
      // a wheel of eyes hanging in the air, firing bolts of light at whoever comes near
      e.vx *= 0.9;
      e.y = e.homeY + Math.sin(e.t * 1.6) * 6;
      if (aware) chase(e, dx, 0);
      if (aware && e.cd < 0 && d < 660) {
        e.cd = rand(1.7, 2.2);
        e.t2 = 0.25;
        const a0 = Math.atan2(dy, dx);
        for (let i = -1; i <= 1; i++) {
          const a = a0 + i * 0.16;
          shoot({ x: cx + e.face * 10, y: cy, vx: Math.cos(a) * 430, vy: Math.sin(a) * 430, r: 7, dmg: shotDmg(e), color: '#fff2a8', kind: 'orb', life: 3, trail: '#ffe28a' });
        }
        sfx('shoot');
      }
      break;
    }
  }
  if (!e.fly) { if (e.ground && !e.wasG) e.land = 1; e.wasG = e.ground; }
  e.land = Math.max(0, (e.land || 0) - dt * 5);
  if (!p.dead && p.dashT <= 0 && overlap(e, p)) hurtPlayer(e.dmg, cx);
}

// ---------- Drawing ----------
const DRAW = { ...HELL, ...HEAVEN };

export function drawEnemy(ctx, e, t) {
  const hang = e.type === 'spider' && (e.state === 'hang' || e.state === 'drop');
  // a soft shadow on the ground
  if (!e.fly && e.ground && !hang) {
    ctx.fillStyle = 'rgba(0,0,0,.33)';
    ctx.beginPath();
    ctx.ellipse(e.x + e.w / 2, e.y + e.h - 0.5, e.w * 0.6, 3.4, 0, 0, TAU);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(e.x + e.w / 2, e.y + e.h);
  if (hang) {
    // silk thread back up to the ceiling
    ctx.strokeStyle = 'rgba(235,235,255,.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -e.h * 0.6);
    ctx.lineTo(0, e.anchorY - (e.y + e.h));
    ctx.stroke();
  }
  // squash when struck or landing
  const sq = Math.max(e.flash > 0 ? e.flash / 0.12 : 0, e.land || 0);
  if (sq > 0) ctx.scale(1 + sq * 0.16, 1 - sq * 0.13);
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
  if (e.alertT > 0) {
    const k = e.alertT / 0.8, pop = k > 0.85 ? 1 + (k - 0.85) * 5 : 1, x = e.x + e.w / 2, y = e.y - 18 - (1 - k) * 6;
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 3);
    ctx.font = `900 ${Math.round(18 * pop)}px Nunito, sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,.75)';
    ctx.strokeText('!', x, y);
    ctx.fillStyle = e.accent || '#ff4a6a';
    ctx.fillText('!', x, y);
    ctx.restore();
  }
  if (e.hp < e.max) {
    const w = Math.max(28, e.w), x = e.x + e.w / 2 - w / 2, y = e.y - 12;
    if (e.shown === undefined || e.shown < e.hp) e.shown = e.hp;
    e.shown += (e.hp - e.shown) * 0.12;
    ctx.fillStyle = 'rgba(0,0,0,.65)';
    ctx.fillRect(x - 1, y - 1, w + 2, 6);
    ctx.fillStyle = '#fff2c4';
    ctx.fillRect(x, y, w * Math.max(0, e.shown / e.max), 4);
    ctx.fillStyle = '#ff4a6a';
    ctx.fillRect(x, y, w * Math.max(0, e.hp / e.max), 4);
  }
}

// When a foe falls: its silhouette flares white and swells away, bits of it scatter and its
// soul rises.
function deathFx(e) {
  const fx = e.x + e.w / 2, fy = e.y + e.h, cx = fx, cy = e.y + e.h / 2;
  const ghost = { ...e, flash: 1, dead: false };
  G.effects.push({
    t: 0, dur: 0.32,
    draw(ctx) {
      const k = this.t / this.dur, s = 1 + k * 0.6;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (1 - k) * 0.85;
      ctx.translate(fx, fy - e.h / 2);
      ctx.scale(e.face * s, s);
      ctx.translate(0, e.h / 2);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      DRAW[e.type](ctx, ghost, G.t);
      ctx.restore();
    },
  });
  const dark = shade(e.tint, -0.45);
  for (let i = 0; i < 7; i++) part({ x: cx + rand(-8, 8), y: cy + rand(-8, 8), vx: rand(-170, 170), vy: rand(-340, -120), g: 950, drag: 0.5, life: rand(0.6, 1), size: rand(2, 3.6), color: Math.random() < 0.5 ? dark : e.tint, shape: 'petal', rot: rand(0, 6), vr: rand(-14, 14) });
  for (let i = 0; i < 3; i++) part({ x: cx + rand(-5, 5), y: cy, vx: rand(-15, 15), vy: rand(-90, -50), life: rand(1, 1.4), size: rand(4, 6), grow: 1.2, color: e.accent, add: true });
}
HOOKS.kill = deathFx;
