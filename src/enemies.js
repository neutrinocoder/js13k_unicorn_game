// Regular enemies. Every land has creatures of its own (see BIOMES in world.js):
// demons, hell bats and a few bone widows in Limbo; gorgers and bile maws in Gluttony; harpies and
// hell bats in Lust; bone widows and hell knights in Treachery; demons and flaming skulls in Heresy.
// Above: angels and ophanim in the Citadel, cherubs and seraphim in the Golden Fields, stormlings
// and nereids in the Cloudlands, Spartans and war wheels in the Silver Peaks.
import { G } from './state.js';
import { BIOMES, BIOME_LIST } from './world.js';
import { moveBody, groundAhead, onPlatform } from './physics.js';
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
  grub: { hp: 8, w: 36, h: 22, dmg: 1, gem: 3, fly: 0 },       // gorger
  harpy: { hp: 5, w: 34, h: 30, dmg: 1, gem: 4, fly: 1 },
  // the heavens
  angel: { hp: 13, w: 36, h: 56, dmg: 1, gem: 6, fly: 0 },
  cherub: { hp: 4, w: 28, h: 24, dmg: 1, gem: 3, fly: 1 },
  seraph: { hp: 8, w: 34, h: 34, dmg: 1, gem: 5, fly: 1, ghost: 1 },
  ophan: { hp: 9, w: 36, h: 36, dmg: 1, gem: 5, fly: 1 },
  // cousins of the four above: the same body and habits (`like`) in other colours, a little
  // tougher, each with an attack of its own. A foe made from one has the type it is like and
  // carries its own name in `variant`.
  spartan: { like: 'angel', hp: 16, gem: 8 },
  stormling: { like: 'cherub', hp: 5, gem: 4 },
  nereid: { like: 'seraph', hp: 9, gem: 6 },
  warwheel: { like: 'ophan', hp: 12, gem: 7 },
};

export function makeEnemy(type, x, y, level, biome, hang = false) {
  // foes grow tougher with danger, and a quarter faster in the underworld than in heaven
  const own = ETYPES[type], variant = own.like ? type : null;
  if (variant) type = own.like;
  const d = { ...ETYPES[type], ...own }, B = BIOMES[BIOME_LIST[biome]], m = 1 + (type === 'spider' ? 0.45 : 0.3) * (B.heaven ? 1 : 1.25) * (level - 1);
  const e = {
    type, x: x - d.w / 2, y: y - d.h, w: d.w, h: d.h, vx: 0, vy: 0, hp: d.hp * m, max: d.hp * m,
    dmg: d.dmg + Math.floor((level - 1) / (type === 'spider' ? 4 : 7)), level, gem: d.gem, fly: d.fly, ghost: d.ghost,
    variant, tint: B.tint, accent: B.accent, face: 1, t: rand(0, 10), cd: rand(0.5, 2), t2: 0, flash: 0, trap: 0, state: 'idle', ground: false, biome,
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
  // chilled foes move and think at half speed
  if (e.chill > 0) { e.chill -= dt; dt *= 0.5; }
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
  const aware = d < (e.type === 'spider' ? 820 : 720) && !p.dead;
  // a "!" pops up the moment a foe first spots you
  e.alertT = Math.max(0, (e.alertT || 0) - dt);
  if (aware && !e.alerted && e.state !== 'hang') { e.alerted = 1; e.alertT = 0.8; }
  else if (d > 900) e.alerted = 0;
  const wander = speed => {
    if (e.hitWall || (e.ground && !groundAhead(e, e.face))) e.face *= -1;
    e.vx = e.face * speed;
  };
  // The player is below (more than a couple of tiles): a walking foe drops through the platform
  // it stands on, or keeps going until it walks off the nearest ledge.
  const below = dy > 56;
  e.dropT = Math.max(0, (e.dropT || 0) - dt);
  const descend = speed => {
    if (!e.ground || !below) return;
    if (onPlatform(e)) { if (Math.abs(dx) < 280) e.dropT = 0.3; }
    else if (Math.abs(dx) < e.w * 0.5 + 24) { if (e.hitWall) e.face *= -1; e.vx = e.face * speed; }
  };
  // How hard to jump to reach a player standing above: enough to clear the height, up to about 8 tiles.
  const leapUp = () => -Math.min(1000, Math.sqrt(3600 * (50 - dy)));
  // A gap in the floor between it and a player who is not below: leap across.
  const gap = () => e.ground && e.cd < 0 && !below && Math.abs(dx) > 60 && !groundAhead(e, e.face);
  switch (e.type) {
    case 'imp': {
      if (aware) {
        e.vx += (e.face * chase(e, dx, 165 + e.level * 5) - e.vx) * Math.min(1, 6 * dt);
        descend(150);
        // close enough to strike: a quick lunge at the player
        if (e.ground && e.cd < 0 && Math.abs(dx) < 170 && Math.abs(dy) < 70) { e.vy = -340; e.vx = Math.sign(dx) * 520; e.cd = 0.8; }
        else if (e.ground && e.cd < 0 && dy < -50 && Math.abs(dx) < 300) { e.vy = leapUp(); e.cd = 0.7; }
        else if (e.ground && e.cd < 0 && (e.hitWall || gap())) { e.vy = -700; e.cd = 0.7; }
      } else wander(60);
      e.vy = Math.min(e.vy + 1800 * dt, 900);
      moveBody(e, dt, e.dropT > 0);
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
          e.vx += (e.face * chase(e, dx, 215 + e.level * 5) - e.vx) * Math.min(1, 7 * dt);
          descend(170);
          // a high leap at a player on a platform above, or a pounce at one on the same level
          if (e.ground && e.cd < 0 && dy < -60 && Math.abs(dx) < 320) { e.vy = leapUp(); e.vx = clamp(dx * 2, -420, 420); e.cd = 0.9; }
          else if (e.ground && e.cd < 0 && Math.abs(dx) < 300 && Math.abs(dy) < 170) { e.vy = -560; e.vx = clamp(dx * 2.4, -500, 500); e.cd = 1; }
          else if (e.ground && e.cd < 0 && (e.hitWall || gap())) { e.vy = -640; e.vx = e.face * 300; e.cd = 0.5; }
        } else wander(70);
        e.vy = Math.min(e.vy + 1800 * dt, 900);
        moveBody(e, dt, e.dropT > 0);
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
        if (e.hitWall) { e.state = 'idle'; e.cd = e.type === 'angel' ? 0.45 : 0.7; shake(6); sfx('land'); }
        else if (e.t2 <= 0) { e.state = 'idle'; e.cd = e.type === 'angel' ? 0.35 : 0.5; }
      } else {
        if (aware) {
          const angel = e.type === 'angel';
          e.vx += (e.face * chase(e, dx, angel ? 240 : 195) - e.vx) * Math.min(1, 5 * dt);
          descend(angel ? 200 : 160);
          // a knight heaves itself up at a player standing above
          if (!angel && e.ground && e.cd < 0 && dy < -80 && Math.abs(dx) < 280) { e.vy = leapUp(); e.vx = clamp(dx * 1.5, -320, 320); e.cd = 0.9; }
          if (angel && e.ground && e.cd < 0 && dy < -110 && Math.abs(dx) < 340) {
            // spread the wings and leap up at a player above
            e.vy = -1000; e.vx = clamp(dx * 1.6, -420, 420); e.cd = 1.3;
            for (let i = 0; i < 10; i++) part({ x: cx + rand(-18, 18), y: e.y + e.h - 6, vx: rand(-120, 120), vy: rand(-40, 60), life: 0.7, size: 3, color: '#ffffff', add: true });
            sfx('dash', 0.5);
          }
          // a Spartan casts a spear first, from further off than it could charge
          e.castCd = (e.castCd || 0) - dt;
          if (e.variant === 'spartan' && e.cd < 0 && e.castCd < 0 && d > 240 && d < 700) {
            e.castCd = rand(2.2, 3); e.cd = 0.55;
            shoot({ x: cx + e.face * 14, y: e.y + 18, vx: (dx / d) * 640, vy: (dy / d) * 640, r: 6, dmg: shotDmg(e), color: '#ff5a3a', kind: 'shard', tip: '#ffe0d0', life: 2.2 });
            sfx('stab', 0.5);
          } else if (e.cd < 0 && Math.abs(dy) < 120 && Math.abs(dx) > 40 && Math.abs(dx) < 640) { e.state = 'wind'; e.t2 = angel ? 0.28 : 0.36; }
          if (e.ground && e.cd < 0 && (e.hitWall || gap())) { e.vy = -620; e.vx = e.face * 280; e.cd = 0.5; }
        } else wander(45);
      }
      e.vy = Math.min(e.vy + 1800 * dt, 900);
      moveBody(e, dt, e.dropT > 0 && e.state === 'idle');
      break;
    }
    case 'grub': {
      // a gorger drags itself after you, slow but stubborn, and rears up to bite when it is close
      if (aware) {
        e.vx += (e.face * chase(e, dx, 85 + e.level * 4) - e.vx) * Math.min(1, 5 * dt);
        descend(80);
        if (e.ground && e.cd < 0 && Math.abs(dx) < 130 && Math.abs(dy) < 70) { e.vy = -300; e.vx = Math.sign(dx) * 380; e.cd = 1.4; e.t2 = 0.35; }
        else if (e.ground && e.cd < 0 && dy < -50 && Math.abs(dx) < 220) { e.vy = leapUp() * 0.85; e.cd = 1.2; }
        else if (e.ground && e.cd < 0 && (e.hitWall || gap())) { e.vy = -560; e.vx = e.face * 200; e.cd = 0.9; }
      } else wander(35);
      e.vy = Math.min(e.vy + 1800 * dt, 900);
      moveBody(e, dt, e.dropT > 0);
      break;
    }
    case 'harpy': {
      // a harpy hangs in the air above and to one side of you, screeches, then stoops
      if (e.state === 'aim') {
        e.vx *= 0.86; e.vy *= 0.86;
        e.face = dx < 0 ? -1 : 1;
        if (e.t2 <= 0) {
          const sp = 540 + e.level * 8;
          e.state = 'dive'; e.t2 = 0.8; e.dvx = (dx / d) * sp; e.dvy = (dy / d) * sp;
          sfx('wind', 0.5);
        }
      } else if (e.state === 'dive') {
        e.vx += (e.dvx - e.vx) * Math.min(1, 9 * dt);
        e.vy += (e.dvy - e.vy) * Math.min(1, 9 * dt);
        e.face = e.dvx < 0 ? -1 : 1;
        if (Math.random() < 0.6) part({ x: cx - e.vx * 0.03, y: cy - e.vy * 0.03, vx: rand(-20, 20), vy: rand(-20, 20), life: 0.35, size: rand(2, 3.5), color: e.accent, add: true });
        if (e.t2 <= 0 || e.hitWall || e.ground) { e.state = 'idle'; e.cd = rand(1.5, 2.3); e.side = -(e.side || 1); e.vy = -160; }
      } else if (aware) {
        if (!e.side) e.side = Math.random() < 0.5 ? -1 : 1;
        const tx = dx + e.side * 180 + Math.sin(e.t * 1.7) * 40, ty = dy - 175 + Math.cos(e.t * 2.3) * 25, l = Math.hypot(tx, ty) || 1;
        const s = (190 + e.level * 4) * Math.min(1, l / 70);
        e.vx += ((tx / l) * s - e.vx) * 3 * dt;
        e.vy += ((ty / l) * s - e.vy) * 3 * dt;
        e.face = dx < 0 ? -1 : 1;
        if (e.cd < 0 && d < 430 && dy > 40) { e.state = 'aim'; e.t2 = 0.34; e.alertT = 0.34; }
      } else {
        e.vx = Math.sin(e.t) * 40;
        e.vy = Math.cos(e.t * 1.3) * 30;
        e.face = e.vx < 0 ? -1 : 1;
      }
      moveBody(e, dt);
      break;
    }
    case 'spitter': {
      e.vx *= 0.8;
      e.vy = Math.min(e.vy + 1800 * dt, 900);
      moveBody(e, dt);
      if (aware) chase(e, dx, 0);
      if (aware && e.cd < 0 && d < 680) {
        e.cd = Math.max(1.5, 2.6 - e.level * 0.05);
        e.t2 = 0.25;
        const tt = clamp(d / 430, 0.6, 1.3), g = 900;
        shoot({ x: cx + e.face * 10, y: e.y + 6, vx: dx / tt, vy: (dy - 0.5 * g * tt * tt) / tt, g, r: 7, dmg: e.dmg, color: e.accent, kind: 'glob', trail: e.tint });
        sfx('shoot');
      }
      break;
    }
    case 'bat':
    case 'cherub': {
      if (e.variant === 'stormling' && aware && e.cd < 0 && d < 600) {
        // a stormling looses one fast bolt of sea-light at a time, and often
        e.cd = rand(0.8, 1.15);
        e.t2 = 0.3;
        shoot({ x: cx + e.face * 8, y: cy, vx: (dx / d) * 600, vy: (dy / d) * 600, r: 6, dmg: shotDmg(e), color: '#7fd8ff', kind: 'orb', life: 2.2, trail: '#3a9bff' });
        sfx('shoot');
      } else if (e.type === 'cherub' && aware && e.cd < 0 && d < 560) {
        e.cd = rand(1.2, 1.9);
        e.t2 = 0.3;
        const a0 = Math.atan2(dy, dx);
        for (let i = -1; i <= 1; i++) {
          const a = a0 + i * 0.22;
          shoot({ x: cx + e.face * 8, y: cy, vx: Math.cos(a) * 470, vy: Math.sin(a) * 470, r: 5, dmg: shotDmg(e), color: '#ff8ad8', kind: 'shard', tip: '#ffe9f6', life: 2.5 });
        }
        sfx('shoot');
      }
      if (aware) {
        const s = 205 + e.level * 4;
        const tx = dx + Math.sin(e.t * 2.6) * 70, ty = dy - 30 + Math.cos(e.t * 3.4) * 60, l = Math.hypot(tx, ty) || 1;
        e.vx += ((tx / l) * s - e.vx) * 3.2 * dt;
        e.vy += ((ty / l) * s - e.vy) * 3.2 * dt;
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
      if (e.variant === 'nereid' && aware && e.cd < 0 && d < 560) {
        // a nereid sends three slow bolts of cold fire straight at you, and walls do not stop them
        e.cd = rand(1.6, 2.2);
        e.t2 = 0.3;
        const a0 = Math.atan2(dy, dx);
        for (let i = -1; i <= 1; i++) shoot({ x: cx, y: cy, vx: Math.cos(a0 + i * 0.3) * 250, vy: Math.sin(a0 + i * 0.3) * 250, r: 6, dmg: shotDmg(e), color: '#7fd8ff', kind: 'orb', ghost: true, life: 3, trail: '#3a7bff' });
        sfx('ice', 0.6);
      } else if (e.type === 'seraph' && aware && e.cd < 0 && d < 500) {
        e.cd = rand(2, 2.7);
        e.t2 = 0.3;
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2 + e.t;
          shoot({ x: cx, y: cy, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, r: 6, dmg: shotDmg(e), color: '#ffb347', kind: 'orb', ghost: true, life: 2.6, trail: '#ff7a2a' });
        }
        sfx('fire');
      }
      if (aware) {
        const s = (e.type === 'seraph' ? 145 : 110) + e.level * 2;
        e.vx += ((dx / d) * s - e.vx) * 1.9 * dt;
        e.vy += ((dy / d) * s - e.vy) * 1.9 * dt;
        if (e.type === 'wisp' && e.level >= 3 && e.cd < 0 && d < 460) {
          e.cd = 3;
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
      if (e.type === 'seraph' && Math.random() < 0.35) part({ x: cx + rand(-14, 14), y: cy + rand(-10, 10), vx: rand(-20, 20), vy: rand(-80, -30), life: 0.6, size: rand(2, 4), color: Math.random() < 0.5 ? (e.variant ? '#5fc8ff' : '#ffb347') : (e.variant ? '#e8fbff' : '#fff6c4'), add: true });
      break;
    }
    case 'ophan': {
      // a wheel of eyes hanging in the air, firing bolts of light at whoever comes near
      e.vx *= 0.9;
      e.y = e.homeY + Math.sin(e.t * 1.6) * 6;
      if (aware) chase(e, dx, 0);
      if (aware && e.cd < 0 && d < 660) {
        // a war wheel fires a wide fan of five, less often
        const war = e.variant === 'warwheel', n = war ? 2 : 1;
        e.cd = war ? rand(1.8, 2.3) : rand(1.3, 1.8);
        e.t2 = 0.25;
        const a0 = Math.atan2(dy, dx);
        for (let i = -n; i <= n; i++) {
          const a = a0 + i * (war ? 0.2 : 0.16);
          shoot({ x: cx + e.face * 10, y: cy, vx: Math.cos(a) * (war ? 390 : 430), vy: Math.sin(a) * (war ? 390 : 430), r: 7, dmg: shotDmg(e), color: war ? '#ff8a5a' : '#fff2a8', kind: 'orb', life: 3, trail: war ? '#ff4a2a' : '#ffe28a' });
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
  // a gorger bursts: two gobs of bile fly out to either side
  if (e.type === 'grub' && !G.player.dead) {
    for (const dir of [-1, 1]) shoot({ x: e.x + e.w / 2, y: e.y + 4, vx: dir * rand(150, 190), vy: -420, g: 900, r: 6, dmg: 1, color: e.accent, kind: 'glob', trail: e.tint, life: 2 });
  }
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
