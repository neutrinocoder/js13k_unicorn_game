// The unicorn: movement, weapons and drawing.
import { G } from './state.js';
import { T, tileAt, ORE, CRYSTAL, BIOMES, BIOME_LIST } from './world.js';
import { moveBody, touchWall, onPlatform, hazardTouch, rayLength } from './physics.js';
import { held, tapped, mouse } from './input.js';
import { clamp, rand, angDiff, RAINBOW, pick, rgba } from './util.js';
import { burst, part, ring, shake, floater } from './fx.js';
import { sfx } from './audio.js';
import { stats, ownsWeapon, WEAPONS, worn } from './items.js';
import { hurtPlayer, damageEnemy, shoot, breakTile } from './combat.js';

export function makePlayer(x, y) {
  const p = {
    x, y, w: 30, h: 34, vx: 0, vy: 0, face: 1, ground: false, jumps: 0, coyote: 0, jbuf: 0, rising: false,
    dashT: 0, dashCd: 0, dashDir: 1, inv: 0, hp: 5, shield: 0, ctrlLock: 0, wallDir: 0, dropT: 0,
    whipT: 0, whipAng: 0, whipCd: 0, whipSide: 1, combo: 0, lastWhip: -9, blastCd: 0, starCd: 0, atkBuf: 0, altBuf: 0,
    armour: 0, armT: 0, healT: 0, energy: 100, beaming: false, beamLen: 0, beamTick: 0, aegis: 0, wing: 200, flying: false, flapT: 0, bombCd: 0,
    charge: 0, slow: 0, gliding: false, runPhase: 0, sx: 1, sy: 1, ax: 1, ay: 0, stepT: 0, dead: false, tail: [],
  };
  for (let i = 0; i < 12; i++) p.tail.push({ x: x, y: y + 10, px: x, py: y + 10 });
  return p;
}

const WHIP_T = 0.17, WHIP_CD = 0.2, SCALE = 1.1;

// World position of the horn tip, used for the beam and the horn light.
export function hornTip(p) {
  return { x: p.x + p.w / 2 + p.face * 32 * SCALE * p.sx, y: p.y + p.h - 80 * SCALE * p.sy };
}

export function updatePlayer(dt) {
  const p = G.player, S = stats(), B = BIOMES[BIOME_LIST[G.biome]];
  if (p.dead) return;
  p.inv -= dt; p.dashCd -= dt; p.ctrlLock -= dt; p.whipCd -= dt; p.blastCd -= dt; p.starCd -= dt; p.bombCd -= dt;
  p.shield -= dt; p.slow -= dt; p.dropT -= dt; p.whipT -= dt;
  // the Aegis recharges after blocking a hit
  if (S.aegis && p.aegis > 0) { p.aegis -= dt; if (p.aegis <= 0) { sfx('bubble', 0.5); ring(p.x + p.w / 2, p.y + p.h / 2, 50, '#ffe14a', 0.4, 5); } }
  if (p.hp > S.maxHp) p.hp = S.maxHp;
  // armour refills a pip at a time once you have kept out of harm's way for a while
  if (p.armour > S.armour) p.armour = S.armour;
  p.armT -= dt;
  if (S.armour && p.armour < S.armour && p.armT <= 0) {
    p.armour = Math.min(S.armour, Math.floor(p.armour) + 1);
    p.armT = S.armourRegen;
    const A = worn();
    ring(p.x + p.w / 2, p.y + p.h / 2 - 10, 40, A ? A.look.trim : '#ffffff', 0.35, 3);
    sfx('clang', 0.4);
  }
  // White Marble Raiment: slow healing
  if (S.heal && p.hp < S.maxHp) {
    p.healT += dt;
    if (p.healT >= S.heal) {
      p.healT = 0;
      p.hp++;
      floater(p.x + p.w / 2, p.y - 10, '+1 ♥', '#ff8aa6', 16);
      sfx('heal', 0.5);
    }
  } else p.healT = 0;

  const L = held('KeyA', 'ArrowLeft'), R = held('KeyD', 'ArrowRight'), U = held('KeyW', 'ArrowUp'), D = held('KeyS', 'ArrowDown');
  const jumpP = tapped('KeyW', 'ArrowUp', 'Space'), jumpH = held('KeyW', 'ArrowUp', 'Space');
  let dir = (R ? 1 : 0) - (L ? 1 : 0);
  if (p.ctrlLock > 0) dir = 0;

  // Aim: mouse when it has been used, otherwise facing / up / down.
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2 - 6;
  if (mouse.used && mouse.inside) {
    const wx = G.cam.x + mouse.x / G.scale, wy = G.cam.y + mouse.y / G.scale;
    const dx = wx - cx, dy = wy - cy, d = Math.hypot(dx, dy) || 1;
    p.ax = dx / d; p.ay = dy / d;
  } else {
    p.ax = p.face; p.ay = 0;
    if (U) { p.ax = 0; p.ay = -1; }
    else if (D && !p.ground) { p.ax = 0; p.ay = 1; }
  }
  if (dir) p.face = dir;

  // Developer flight: move freely in every direction and pass through walls.
  const devF = G.save.dev || {};
  if (devF.fly) {
    const sp = (held('ShiftLeft', 'ShiftRight') ? 1800 : 900) * (devF.speed || 1);
    const fy = (D ? 1 : 0) - (U || held('Space') ? 1 : 0), l = Math.hypot(dir, fy) || 1;
    p.vx += ((dir / l) * sp - p.vx) * Math.min(1, 10 * dt);
    p.vy += ((fy / l) * sp - p.vy) * Math.min(1, 10 * dt);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.ground = false;
    p.gliding = true;
    p.dashT = 0;
    p.wallDir = 0;
    p.runPhase += dt * 6;
    if (Math.random() < 0.5) part({ x: cx - p.face * 16, y: cy + 4, vx: -p.vx * 0.2, vy: -p.vy * 0.2, life: 0.5, size: 3, color: pick(RAINBOW), add: true });
  } else {
    // Horizontal movement
    const ice = B.ice && p.ground && !S.grip;
    const top = (p.slow > 0 ? 300 : 540) * S.speed * ((G.save.dev && G.save.dev.speed) || 1);
    if (p.dashT > 0) {
      p.dashT -= dt;
      p.vx = p.dashDir * 1100;
      p.vy = 0;
      if (Math.random() < 0.9) part({ x: cx - p.dashDir * 10, y: cy + rand(-10, 10), vx: -p.dashDir * 60, life: 0.3, size: 5, color: pick(RAINBOW), add: true });
    } else {
      const acc = p.ground ? (ice ? 2.5 : 16) : 9;
      const wind = B.wind && !S.noWind ? G.windForce * 0.3 : 0;
      p.vx += (dir * top + wind - p.vx) * Math.min(1, acc * dt);
    }

    // Gravity, walls and gliding
    const wasGround = p.ground;
    if (p.dashT <= 0) p.vy = Math.min(p.vy + 2000 * dt, 1100);
    p.wallDir = 0;
    if (!p.ground && p.vy > 0 && dir && touchWall(p, dir)) {
      p.wallDir = dir;
      p.vy = Math.min(p.vy, 150);
      if (Math.random() < 0.3) part({ x: dir > 0 ? p.x + p.w : p.x, y: p.y + p.h, vx: 0, vy: -30, life: 0.3, size: 2, color: '#d8d0ef' });
    }
    p.gliding = false;
    // Flight: hold Jump in the air to beat your wings and climb. It burns wing energy, which
    // refills on the ground, and walls still stop you (normal collisions below).
    p.flying = false;
    if (p.wing > S.flyMax) p.wing = S.flyMax;
    if (S.fly && !p.ground && jumpH && !p.wallDir && p.vy > -300 && p.wing > 0 && p.dashT <= 0) {
      p.flying = true;
      p.vy = Math.max(p.vy - 3400 * dt, -440);
      p.wing = Math.max(0, p.wing - 34 * dt);
      p.flapT -= dt;
      if (p.flapT <= 0) { p.flapT = 0.24; sfx('dash', 0.25); }
      if (Math.random() < 0.6) part({ x: cx - p.face * 10 + rand(-8, 8), y: p.y + p.h - 6, vx: rand(-40, 40), vy: rand(60, 160), life: 0.5, size: rand(2, 3.5), color: pick(['#ffffff', '#ffe9a8', ...RAINBOW]), add: true });
    } else if (p.ground) p.wing = Math.min(S.flyMax, p.wing + S.flyRegen * dt);
    if (!p.flying && S.glide && !p.ground && jumpH && p.vy > 60 && !p.wallDir) {
      p.vy = Math.min(p.vy, 115);
      p.gliding = true;
    }

    // Jumping
    if (p.ground) { p.coyote = 0.1; p.jumps = S.jumps - 1; } else p.coyote -= dt;
    p.jbuf = jumpP ? 0.13 : p.jbuf - dt;
    if (tapped('KeyS', 'ArrowDown') && p.ground && onPlatform(p)) { p.dropT = 0.22; p.ground = false; }
    if (p.jbuf > 0 && p.dropT <= 0) {
      const wl = touchWall(p, -1), wr = touchWall(p, 1);
      if (p.coyote > 0) {
        p.vy = -900; p.coyote = 0; p.jbuf = 0; p.rising = true;
        p.sx = 0.8; p.sy = 1.25;
        sfx('jump');
        for (let i = 0; i < 8; i++) part({ x: cx + rand(-12, 12), y: p.y + p.h, vx: rand(-80, 80), vy: rand(-60, -10), life: 0.4, size: 3, color: '#cfc4e6', drag: 3 });
      } else if (!p.ground && (wl || wr)) {
        const w = wl ? -1 : 1;
        p.vy = -820; p.vx = -w * 470; p.ctrlLock = 0.14; p.face = -w; p.jbuf = 0; p.rising = true;
        sfx('jump');
        burst(w > 0 ? p.x + p.w : p.x, cy, 8, '#e6dcff', 140);
      } else if (p.jumps > 0) {
        p.jumps--; p.vy = -830; p.jbuf = 0; p.rising = true;
        p.sx = 0.85; p.sy = 1.2;
        sfx('djump');
        ring(cx, p.y + p.h, 34, pick(RAINBOW), 0.35, 5);
        for (let i = 0; i < 7; i++) part({ x: cx, y: p.y + p.h, vx: Math.cos(i) * 150, vy: 60 + Math.sin(i) * 40, life: 0.35, size: 3, color: RAINBOW[i], add: true });
      }
    }
    if (!jumpH && p.rising && p.vy < 0 && p.dashT <= 0) { p.vy *= 0.5; p.rising = false; }
    if (p.vy >= 0) p.rising = false;

    // Dash
    if (tapped('KeyC', 'ShiftLeft', 'ShiftRight', 'KeyL') && p.dashCd <= 0) {
      p.dashT = 0.16; p.dashCd = S.dashCd; p.dashDir = dir || p.face; p.inv = Math.max(p.inv, S.dashInv);
      sfx('dash');
      ring(cx, cy, 30, '#ffffff', 0.25, 4);
    }

    const vyBefore = p.vy;
    moveBody(p, dt, p.dropT > 0);
    if (p.ground && !wasGround && vyBefore > 300) {
      sfx('land', Math.min(1, vyBefore / 900));
      p.sx = 1.25; p.sy = 0.8;
      for (let i = 0; i < 10; i++) part({ x: cx + rand(-14, 14), y: p.y + p.h, vx: rand(-140, 140), vy: rand(-80, -10), life: 0.45, size: rand(2, 4), color: '#cfc4e6', drag: 3 });
    }
    p.sx += (1 - p.sx) * Math.min(1, 12 * dt);
    p.sy += (1 - p.sy) * Math.min(1, 12 * dt);
    p.runPhase += dt * Math.abs(p.vx) * 0.036;
    if (p.ground && Math.abs(p.vx) > 80) {
      p.stepT -= dt;
      if (p.stepT < 0) {
        p.stepT = 0.2;
        sfx('step');
        if (Math.abs(p.vx) > 250) part({ x: cx - p.face * 12, y: p.y + p.h - 2, vx: -p.face * 40, vy: -30, life: 0.5, size: 2.5, color: pick(RAINBOW), add: true });
      }
    }
    if (Math.random() < 0.12) {
      const h = hornTip(p);
      part({ x: h.x + rand(-3, 3), y: h.y + rand(-3, 3), vx: rand(-15, 15), vy: rand(-30, -5), life: 0.7, size: rand(1.5, 2.6), color: pick(['#fff6c2', '#ffffff', '#ffd1f0']), add: true, shape: 'star', vr: 4 });
    }

    // Hazards
    const hz = hazardTouch(p);
    if (hz && p.inv <= 0 && !S.hazSafe(B.haz)) {
      hurtPlayer(1, cx + p.vx * 0.1);
      p.vy = -620;
    }
  }

  // Weapon selection
  const NW = WEAPONS.length;
  for (let i = 0; i < NW; i++) if (tapped('Digit' + (i + 1)) && ownsWeapon(i)) selectWeapon(i);
  if (tapped('KeyQ') || mouse.wheel) {
    const step = mouse.wheel < 0 ? -1 : 1;
    let w = G.save.weapon;
    for (let k = 0; k < NW; k++) { w = (w + step + NW) % NW; if (ownsWeapon(w)) break; }
    selectWeapon(w);
  }
  if (tapped('KeyG') && ownsWeapon(4)) fireBomb(p, S);

  // Attacks. A press during a cooldown is remembered briefly, so no click is lost.
  const weapon = WEAPONS[G.save.weapon].id;
  if (mouse.pressed || tapped('KeyJ', 'KeyK', 'KeyZ')) p.atkBuf = 0.3; else p.atkBuf -= dt;
  if (mouse.rpressed || tapped('KeyX', 'KeyI')) p.altBuf = 0.3; else p.altBuf -= dt;
  const atk = mouse.down || held('KeyJ', 'KeyK', 'KeyZ') || p.atkBuf > 0;
  const alt = mouse.rdown || held('KeyX', 'KeyI') || p.altBuf > 0;
  if ((atk || alt) && !dir && mouse.used && mouse.inside) p.face = p.ax < 0 ? -1 : 1;
  p.beaming = false;
  if (alt) { if (fireBlast(p, S)) p.altBuf = 0; }
  else if (atk) {
    let fired = false;
    if (weapon === 'whip') fired = fireWhip(p, S, dir);
    else if (weapon === 'blast') fired = fireBlast(p, S);
    else if (weapon === 'stars') fired = fireStar(p, S);
    else if (weapon === 'beam') fired = fireBeam(p, S, dt);
    else if (weapon === 'bomb') fired = fireBomb(p, S);
    if (fired) p.atkBuf = 0;
  }
  if (!p.beaming) p.energy = Math.min(100, p.energy + 28 * dt);

  // Bubbles and potions
  p.charge = Math.min(S.bubbleT, p.charge + dt);
  if (tapped('KeyB', 'KeyF') && p.charge >= S.bubbleT) bubblePower(p);
  if (tapped('KeyH')) {
    if (G.save.potions > 0 && p.hp < S.maxHp) {
      G.save.potions--;
      p.hp = Math.min(S.maxHp, p.hp + S.potion);
      sfx('heal');
      burst(cx, cy, 20, ['#ffe28a', '#ffffff'], 160, { add: true, g: -100 });
      floater(cx, p.y - 10, '+' + S.potion + ' ♥', '#ff8aa6', 20);
    } else sfx('deny');
  }

  // Dash damage
  if (p.dashT > 0 && S.hooves) {
    for (const e of G.enemies) if (!e.dead && !e.dashHit && overlaps(p, e)) { damageEnemy(e, 4 + G.save.up.tail, p.dashDir, 300); e.dashHit = 0.3; }
  }
  for (const e of G.enemies) if (e.dashHit) e.dashHit = Math.max(0, e.dashHit - dt) || 0;

  updateTail(p, dt);
}

const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function selectWeapon(i) {
  if (G.save.weapon !== i) { G.save.weapon = i; sfx('ui'); }
}

function targets() {
  return G.boss && !G.boss.dead && !G.boss.hidden ? [...G.enemies, G.boss] : G.enemies;
}

function fireWhip(p, S, dir) {
  if (p.whipCd > 0) return false;
  p.combo = G.t - p.lastWhip < 0.5 ? (p.combo + 1) % 3 : 0;
  p.lastWhip = G.t;
  const finisher = p.combo === 2;
  p.whipCd = finisher ? 0.3 : WHIP_CD;
  p.whipT = WHIP_T;
  p.whipAng = Math.atan2(p.ay, p.ax);
  p.whipSide = (p.combo % 2 ? -1 : 1) * (p.ax < 0 ? -1 : 1);
  p.whipFin = finisher;
  sfx('whip');
  if (p.ground && !dir) p.vx += p.ax * 110;
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2 - 4, reach = S.reach * (finisher ? 1.15 : 1);
  let hit = false;
  for (const e of targets()) {
    if (e.dead) continue;
    const ex = clamp(cx, e.x, e.x + e.w), ey = clamp(cy, e.y, e.y + e.h);
    const d = Math.hypot(ex - cx, ey - cy);
    const a = Math.atan2(e.y + e.h / 2 - cy, e.x + e.w / 2 - cx);
    if (d < reach && (d < 34 || Math.abs(angDiff(p.whipAng, a)) < 1.2)) {
      damageEnemy(e, S.whipDmg * (finisher ? 1.6 : 1), Math.sign(e.x + e.w / 2 - cx), finisher ? 420 : 260);
      burst(clamp(cx + Math.cos(p.whipAng) * 40, e.x, e.x + e.w), clamp(cy + Math.sin(p.whipAng) * 40, e.y, e.y + e.h), 8, RAINBOW, 260, { add: true, g: 0 });
      hit = true;
    }
  }
  // Break ore and crystals along the swing
  for (let k = -2; k <= 2; k++) {
    const a = p.whipAng + k * 0.35;
    for (let d = 16; d < reach; d += 14) {
      const tx = Math.floor((cx + Math.cos(a) * d) / T), ty = Math.floor((cy + Math.sin(a) * d) / T);
      const t = tileAt(tx, ty);
      if (t === ORE || t === CRYSTAL) { breakTile(tx, ty); break; }
      if (t === 1 || t === 4) break;
    }
  }
  // Pop bubbles for a bounce
  for (const b of G.bubbles) {
    if (Math.hypot(b.x - cx, b.y - cy) < reach && Math.abs(angDiff(p.whipAng, Math.atan2(b.y - cy, b.x - cx))) < 1.2) b.pop = true;
  }
  if (hit) {
    G.hitstop = Math.max(G.hitstop, finisher ? 0.07 : 0.035);
    shake(finisher ? 6 : 3);
    if (p.ay > 0.6 && !p.ground) { p.vy = -720; p.jumps = Math.max(p.jumps, 1); }
  }
  return true;
}

function fireBlast(p, S) {
  if (p.blastCd > 0) return false;
  p.blastCd = S.blastCd;
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2 - 6;
  shoot({ x: cx + p.ax * 22, y: cy + p.ay * 22, vx: p.ax * 1050, vy: p.ay * 1050, r: 9, dmg: S.blastDmg, team: 'player', kind: 'blast', color: '#ffffff', trail: RAINBOW, life: 0.9, radius: 85 });
  p.vx -= p.ax * 320;
  p.vy = clamp(p.vy - p.ay * 680, -820, 820);
  if (p.ay > 0.5) p.jumps = Math.max(p.jumps, 1);
  shake(5);
  sfx('blast');
  ring(cx + p.ax * 26, cy + p.ay * 26, 26, '#ffffff', 0.2, 5);
  for (let i = 0; i < 12; i++) part({ x: cx + p.ax * 24, y: cy + p.ay * 24, vx: p.ax * rand(100, 400) + rand(-80, 80), vy: p.ay * rand(100, 400) + rand(-80, 80), life: 0.3, size: 4, color: pick(RAINBOW), add: true });
  return true;
}

function fireStar(p, S) {
  if (p.starCd > 0) return false;
  p.starCd = 0.11;
  const h = hornTip(p), a0 = Math.atan2(p.ay, p.ax);
  for (let i = 0; i < S.stars; i++) {
    const a = a0 + (S.stars > 1 ? (i / (S.stars - 1) - 0.5) * 0.5 : 0) + rand(-0.12, 0.12);
    shoot({ x: h.x, y: h.y, vx: Math.cos(a) * 760, vy: Math.sin(a) * 760, r: 6, dmg: S.starDmg, team: 'player', kind: 'star', color: pick(['#ffe14a', '#ff9ad6', '#8fe8ff']), homing: true, life: 1.3, trail: '#fff2a8' });
  }
  sfx('star');
  return true;
}

function fireBeam(p, S, dt) {
  if (p.energy <= 0) return false;
  p.beaming = true;
  p.energy = Math.max(0, p.energy - S.beamDrain * dt);
  const h = hornTip(p), ox = h.x, oy = h.y;
  const len = rayLength(ox, oy, p.ax, p.ay, 560);
  p.beamLen = len;
  p.beamTick -= dt;
  if (p.beamTick <= 0) {
    p.beamTick = 0.08;
    sfx('beam');
    for (const e of targets()) {
      if (e.dead) continue;
      const ex = e.x + e.w / 2 - ox, ey = e.y + e.h / 2 - oy, along = ex * p.ax + ey * p.ay;
      if (along < 0 || along > len) continue;
      const side = Math.abs(ex * p.ay - ey * p.ax);
      if (side < Math.max(e.w, e.h) / 2 + 10) damageEnemy(e, S.beamDmg, Math.sign(p.ax), 60);
    }
    const tx = Math.floor((ox + p.ax * (len + 6)) / T), ty = Math.floor((oy + p.ay * (len + 6)) / T);
    const t = tileAt(tx, ty);
    if (t === ORE || t === CRYSTAL) breakTile(tx, ty);
  }
  if (Math.random() < 0.6) part({ x: ox + p.ax * len, y: oy + p.ay * len, vx: rand(-120, 120), vy: rand(-120, 120), life: 0.25, size: 3, color: pick(RAINBOW), add: true });
  return true;
}

// A bomb lobbed toward your aim; it bursts on whatever it touches, or when its fuse runs out.
function fireBomb(p, S) {
  if (p.bombCd > 0) return false;
  p.bombCd = S.bombCd;
  const h = hornTip(p), sp = 660;
  shoot({ x: h.x, y: h.y, vx: p.ax * sp + p.vx * 0.3, vy: p.ay * sp - 240, g: 1300, r: 9, dmg: S.bombDmg, team: 'player', kind: 'bomb', color: '#ffb347', life: 1.3, radius: S.bombR, trail: ['#ffb347', '#ffe36b'] });
  sfx('whip');
  return true;
}

function bubblePower(p) {
  p.charge = 0;
  p.shield = 2.4;
  sfx('bubble');
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  ring(cx, cy, 260, '#bff3ff', 0.5, 10);
  for (const e of G.enemies) {
    if (!e.dead && Math.hypot(e.x + e.w / 2 - cx, e.y + e.h / 2 - cy) < 280) { e.trap = 3.5; e.vx = 0; e.vy = 0; }
  }
  for (let i = 0; i < 4; i++) G.bubbles.push({ x: cx + (i - 1.5) * 70, y: cy - 30 - (i % 2) * 40, r: 22, t: 0, life: 8 });
}

export function updateBubbles(dt) {
  const p = G.player;
  for (let i = G.bubbles.length - 1; i >= 0; i--) {
    const b = G.bubbles[i];
    b.t += dt;
    b.y -= 14 * dt;
    b.x += Math.sin(b.t * 2 + i) * 10 * dt;
    if (p.vy > 0 && Math.abs(p.x + p.w / 2 - b.x) < b.r + 10 && p.y + p.h > b.y - b.r && p.y + p.h < b.y + 6) {
      p.vy = -950; p.jumps = Math.max(p.jumps, 1); b.pop = true;
      sfx('djump');
    }
    if (b.pop || b.t > b.life) {
      burst(b.x, b.y, 12, ['#bff3ff', '#ffffff'], 160, { add: true, g: 0 });
      G.bubbles.splice(i, 1);
    }
  }
}

// ---------- Tail chain ----------
function tailAnchor(p) {
  return { x: p.x + p.w / 2 - p.face * 19 * p.sx, y: p.y + p.h - 27 * p.sy };
}

export function updateTail(p, dt) {
  const f = p.face, an = tailAnchor(p), ax = an.x, ay = an.y;
  const N = p.tail.length;
  if (p.whipT > 0) {
    const S = stats(), u = 1 - p.whipT / WHIP_T, reach = S.reach * (p.whipFin ? 1.15 : 1);
    const sweep = (1.0 - 2.0 * u) * (p.whipSide || 1);
    for (let i = 0; i < N; i++) {
      const k = i / (N - 1), a = p.whipAng - sweep * (1 - k * 0.55);
      const r = reach * k * (0.65 + 0.35 * Math.sin(Math.PI * Math.min(1, u * 1.4)));
      const pt = p.tail[i];
      pt.px = pt.x; pt.py = pt.y;
      pt.x = ax + Math.cos(a) * r;
      pt.y = ay + Math.sin(a) * r;
    }
    return;
  }
  const seg = 5.4;
  p.tail[0].x = ax; p.tail[0].y = ay; p.tail[0].px = ax; p.tail[0].py = ay;
  for (let i = 1; i < N; i++) {
    const pt = p.tail[i];
    const vx = (pt.x - pt.px) * 0.82, vy = (pt.y - pt.py) * 0.82;
    pt.px = pt.x; pt.py = pt.y;
    pt.x += vx - f * 30 * dt + Math.sin(G.t * 6 - i * 0.7) * 0.5;
    pt.y += vy + 0.3 - (p.vy < 0 ? 0 : 0);
    const prev = p.tail[i - 1], dx = pt.x - prev.x, dy = pt.y - prev.y, d = Math.hypot(dx, dy) || 1;
    pt.x = prev.x + (dx / d) * seg;
    pt.y = prev.y + (dy / d) * seg;
  }
  if (Math.random() < 0.2) {
    const tip = p.tail[N - 1];
    part({ x: tip.x, y: tip.y, vx: rand(-20, 20), vy: rand(-20, 20), life: 0.6, size: rand(1.4, 2.4), color: pick(RAINBOW), add: true, shape: 'star', vr: 3 });
  }
}

// ---------- Drawing helpers ----------
const OUT = '#33264d';
const GOLD = ['#fff6c4', '#f4c24a', '#9c6414'];

function goldGrad(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, GOLD[0]);
  g.addColorStop(0.5, GOLD[1]);
  g.addColorStop(1, GOLD[2]);
  return g;
}

// The worn armour's metal (gold when wearing none).
let METAL = GOLD;
function metalGrad(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, METAL[0]);
  g.addColorStop(0.5, METAL[1]);
  g.addColorStop(1, METAL[2]);
  return g;
}

// The emblem of each land, embossed on the armour's barding.
function motif(ctx, kind, x, y, col, dark) {
  ctx.fillStyle = col;
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  switch (kind) {
    case 'moon': case 'crescent':
      ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.moveTo(x + 4.1, y - 0.9); ctx.arc(x + 1.5, y - 0.9, 2.6, 0, Math.PI * 2);
      ctx.fill('evenodd');
      return;
    case 'heart':
      ctx.moveTo(x, y + 3); ctx.bezierCurveTo(x - 4.5, y - 0.5, x - 2, y - 4, x, y - 1.5); ctx.bezierCurveTo(x + 2, y - 4, x + 4.5, y - 0.5, x, y + 3);
      ctx.fill();
      return;
    case 'scales':
      for (let i = 0; i < 3; i++) { ctx.moveTo(x - 4 + i * 3 + 1.6, y + (i % 2) * 2); ctx.arc(x - 4 + i * 3, y + (i % 2) * 2, 1.6, 0, Math.PI); }
      ctx.stroke();
      return;
    case 'flame':
      ctx.moveTo(x, y - 4.5); ctx.quadraticCurveTo(x + 3.5, y, x + 2, y + 2.5); ctx.quadraticCurveTo(x, y + 4, x - 2, y + 2.5); ctx.quadraticCurveTo(x - 3, y, x, y - 4.5);
      ctx.fill();
      return;
    case 'flake':
      for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; ctx.moveTo(x - Math.cos(a) * 3.6, y - Math.sin(a) * 3.6); ctx.lineTo(x + Math.cos(a) * 3.6, y + Math.sin(a) * 3.6); }
      ctx.stroke();
      return;
    case 'skull':
      ctx.arc(x, y - 0.6, 3, 0, Math.PI * 2); ctx.rect(x - 1.8, y + 1, 3.6, 2.2); ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.arc(x - 1.1, y - 0.6, 0.9, 0, Math.PI * 2); ctx.arc(x + 1.1, y - 0.6, 0.9, 0, Math.PI * 2); ctx.fill();
      return;
    case 'laurel':
      ctx.arc(x, y + 1, 3.6, Math.PI * 0.95, Math.PI * 0.2, true); ctx.stroke();
      for (let i = 0; i < 4; i++) { const a = Math.PI * (0.95 - i * 0.25); ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 3.6, y + 1 + Math.sin(a) * 3.6, 1.4, 0.7, a + 1.2, 0, Math.PI * 2); ctx.fill(); }
      return;
    case 'sun':
      ctx.arc(x, y, 2.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.moveTo(x + Math.cos(a) * 3, y + Math.sin(a) * 3); ctx.lineTo(x + Math.cos(a) * 4.6, y + Math.sin(a) * 4.6); }
      ctx.stroke();
      return;
    case 'cloud':
      ctx.arc(x - 2, y + 0.8, 1.9, 0, Math.PI * 2); ctx.arc(x + 0.4, y - 0.6, 2.4, 0, Math.PI * 2); ctx.arc(x + 2.6, y + 1, 1.7, 0, Math.PI * 2);
      ctx.fill();
      return;
    case 'bolt':
      ctx.moveTo(x + 1.2, y - 4.5); ctx.lineTo(x - 2.2, y + 0.6); ctx.lineTo(x, y + 0.6); ctx.lineTo(x - 1.2, y + 4.5); ctx.lineTo(x + 2.4, y - 0.8); ctx.lineTo(x + 0.2, y - 0.8); ctx.closePath();
      ctx.fill();
      return;
  }
}

// Barding: a plate over the back, in the colours and emblem of the armour's land.
function barding(ctx, L) {
  const plate = new Path2D();
  plate.moveTo(-18.6, -24);
  plate.bezierCurveTo(-19.8, -34.5, -9, -36, 0, -34);
  plate.bezierCurveTo(4, -33.4, 7, -35.6, 10.4, -35.6);
  plate.lineTo(11.2, -27.5);
  plate.bezierCurveTo(4, -21, -6, -20, -13, -21);
  plate.bezierCurveTo(-16, -21.4, -18, -22.4, -18.6, -24);
  plate.closePath();
  if (L.spikes) {
    // a ridge of spikes along the spine
    ctx.fillStyle = metalGrad(ctx, 0, -41, 0, -33);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    for (const [x, y] of [[-13, -32], [-6.5, -34.6], [0.5, -34.2]]) {
      ctx.beginPath(); ctx.moveTo(x - 2.4, y + 1); ctx.lineTo(x - 0.6, y - 5.5); ctx.lineTo(x + 2.4, y + 0.6); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
  }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.2;
  ctx.stroke(plate);
  ctx.fillStyle = metalGrad(ctx, 0, -36, 0, -20);
  ctx.fill(plate);
  // plate seams and a shine along the top
  ctx.save();
  ctx.clip(plate);
  ctx.strokeStyle = 'rgba(0,0,0,.25)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-9, -36); ctx.lineTo(-10.5, -20); ctx.moveTo(3.5, -36); ctx.lineTo(2.5, -20); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-17, -28); ctx.bezierCurveTo(-16, -33, -8, -34.5, 0, -32.6); ctx.stroke();
  ctx.restore();
  // trim and rivets along the lower edge
  ctx.strokeStyle = L.trim;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(11, -27.8); ctx.bezierCurveTo(4, -21.6, -6, -20.6, -13, -21.6); ctx.bezierCurveTo(-16, -22, -17.6, -22.8, -18, -24); ctx.stroke();
  ctx.fillStyle = L.trim;
  for (const [x, y] of [[-14, -23.4], [-7, -22.4], [0, -22.7], [6.4, -24.6]]) { ctx.beginPath(); ctx.arc(x, y, 0.85, 0, Math.PI * 2); ctx.fill(); }
  motif(ctx, L.motif, -3.2, -28.4, L.trim, L.metal[2]);
}

// A stroke that tapers from w0 to w1 along a polyline.
function taper(ctx, pts, w0, w1, color) {
  ctx.strokeStyle = color;
  for (let i = 1; i < pts.length; i++) {
    const k = (i - 1) / Math.max(1, pts.length - 2);
    ctx.lineWidth = w0 + (w1 - w0) * k;
    ctx.beginPath();
    ctx.moveTo(pts[i - 1][0], pts[i - 1][1]);
    ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
}

function sparkle(ctx, x, y, s, a) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 ? s * 0.22 : s, ang = (i * Math.PI) / 4;
    ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawTail(ctx, p) {
  const N = p.tail.length, pts = p.tail;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const whip = p.whipT > 0;
  const ribbons = [];
  for (let c = 0; c < RAINBOW.length; c++) {
    const line = [];
    for (let i = 0; i < N; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      const k = i / (N - 1), off = (c - 3) * (whip ? 2.1 : 1.75) * (1 - k * 0.5) + Math.sin(G.t * 7 + k * 5 + c) * k * k * 1.2;
      line.push([pts[i].x - (dy / d) * off, pts[i].y + (dx / d) * off]);
    }
    ribbons.push(line);
  }
  // soft glow underneath
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = whip ? 0.45 : 0.22;
  ribbons.forEach((l, c) => taper(ctx, l, 7, 2.5, RAINBOW[c]));
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ribbons.forEach((l, c) => taper(ctx, l, whip ? 3.6 : 3.1, 1.1, RAINBOW[c]));
  // white sheen on the top ribbon
  ctx.globalAlpha = 0.5;
  taper(ctx, ribbons[0].map(([x, y]) => [x, y - 0.6]), 1.1, 0.3, '#ffffff');
  ctx.globalAlpha = 1;

  if (whip) {
    const S = stats(), u = 1 - p.whipT / WHIP_T, cx = p.x + p.w / 2, cy = p.y + p.h / 2 - 4;
    const R = S.reach * (p.whipFin ? 1.15 : 1), k = Math.min(1, u * 1.8), span = 2.3;
    const side = p.whipSide || 1, a0 = p.whipAng - (span / 2) * side;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let c = 0; c < 7; c++) {
      ctx.strokeStyle = RAINBOW[c];
      ctx.globalAlpha = 0.75 * (1 - u * 0.8);
      ctx.lineWidth = p.whipFin ? 5 : 4;
      ctx.beginPath();
      ctx.arc(cx, cy, R * (0.58 + c * 0.065), a0, a0 + span * k * side, side < 0);
      ctx.stroke();
    }
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = 0.9 * (1 - u);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.98, a0, a0 + span * k * side, side < 0);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}

// ---------- The unicorn ----------
export function drawUnicorn(ctx, p, t) {
  const f = p.face, run = Math.min(1, Math.abs(p.vx) / 420), air = !p.ground;
  const up = (G.save && G.save.up) || {};
  const blink = p.inv > 0 && !p.dashT && Math.floor(t * 20) % 2;
  const A = G.save ? worn() : null, L = A && A.look;
  METAL = L ? L.metal : GOLD;

  // Soft aura
  const acx = p.x + p.w / 2, acy = p.y + p.h - 34;
  ctx.globalCompositeOperation = 'lighter';
  const ag = ctx.createRadialGradient(acx, acy, 4, acx, acy, 70);
  ag.addColorStop(0, `rgba(255,215,250,${p.dashT > 0 ? 0.5 : 0.16})`);
  ag.addColorStop(1, 'rgba(255,200,255,0)');
  ctx.fillStyle = ag;
  ctx.fillRect(acx - 70, acy - 70, 140, 140);
  if (L && L.glow) {
    // enchanted armour glows with the light of its land
    const gg = ctx.createRadialGradient(acx, acy + 4, 4, acx, acy + 4, 56);
    gg.addColorStop(0, rgba(L.glow, 0.22 + Math.sin(t * 3) * 0.06));
    gg.addColorStop(1, rgba(L.glow, 0));
    ctx.fillStyle = gg;
    ctx.fillRect(acx - 60, acy - 56, 120, 120);
  }
  ctx.globalCompositeOperation = 'source-over';

  if (blink) ctx.globalAlpha = 0.45;
  drawTail(ctx, p);

  ctx.save();
  ctx.translate(p.x + p.w / 2, p.y + p.h);
  ctx.scale(f * p.sx * SCALE, p.sy * SCALE);
  const bob = air ? 0 : run > 0.08 ? Math.abs(Math.sin(p.runPhase)) * 2.2 * run : Math.sin(t * 2.2) * 0.5;
  ctx.translate(0, -bob);
  if (air) ctx.rotate(clamp(p.vy / 1500, -0.2, 0.22));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Legs: a four-beat gallop, tucked on the way up, reaching on the way down.
  const leg = (hx, ph, front, near) => {
    const hy = -17;
    let kx, ky, fx, fy;
    if (air) {
      if (p.vy < 0) { kx = hx + (front ? 8 : -5); ky = hy + 6; fx = hx + (front ? 3 : -13); fy = hy + 12; }
      else { kx = hx + (front ? 5 : -4); ky = hy + 8; fx = hx + (front ? 10 : -8); fy = hy + 16; }
    } else if (run > 0.08) {
      const s = Math.sin(ph), c = Math.max(0, Math.cos(ph)), st = 9 * run;
      fx = hx + s * st; fy = -c * 7 * run;
      kx = hx + s * st * 0.45 + (front ? 4 : -4) * c * run; ky = hy * 0.5 - c * 3 * run;
    } else {
      fx = hx + (front ? 1 : -1); fy = 0; kx = hx + (front ? 1.8 : -1.8); ky = hy * 0.5;
    }
    const col = near ? '#ffffff' : '#c8bce3';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = near ? 7.4 : 6.8;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy - 2); ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = near ? 5 : 4.4;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy - 2); ctx.stroke();
    if (L) {
      // greaves from the knee down
      const gx = kx + (fx - kx) * 0.62, gy = ky + (fy - 2 - ky) * 0.62;
      ctx.strokeStyle = OUT;
      ctx.lineWidth = near ? 7.2 : 6.4;
      ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(gx, gy); ctx.stroke();
      ctx.strokeStyle = near ? L.metal[1] : L.metal[2];
      ctx.lineWidth = near ? 5 : 4.4;
      ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(gx, gy); ctx.stroke();
      ctx.fillStyle = L.trim;
      ctx.beginPath(); ctx.arc(kx, ky, near ? 2.2 : 1.8, 0, Math.PI * 2); ctx.fill();
    }
    // hoof
    ctx.fillStyle = metalGrad(ctx, fx, fy - 5, fx, fy);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(fx - 3.2, fy - 4.5); ctx.lineTo(fx + 3.4, fy - 4.5); ctx.lineTo(fx + 4.2, fy); ctx.lineTo(fx - 3.6, fy); ctx.closePath();
    ctx.fill(); ctx.stroke();
    if (up.hooves) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,200,80,.35)';
      ctx.beginPath(); ctx.arc(fx, fy - 2, 5, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  };
  const ph = p.runPhase;
  leg(-8, ph + 0.55, false, false);
  leg(14, ph + Math.PI + 0.55, true, false);

  // Far wing
  if (up.wings || up.fly) wing(ctx, p, t, false);

  // Body, neck and head share one outline so the joins are seamless.
  const body = new Path2D();
  body.moveTo(-18, -24);
  body.bezierCurveTo(-19, -33, -9, -34, 0, -32);
  body.bezierCurveTo(6, -31, 10, -34, 13, -34);
  body.bezierCurveTo(21, -33, 23, -21, 18, -15);
  body.bezierCurveTo(11, -11, -6, -11, -12, -14);
  body.bezierCurveTo(-17, -15, -20, -19, -18, -24);
  body.closePath();
  const neck = new Path2D();
  neck.moveTo(7, -31);
  neck.bezierCurveTo(9, -42, 12, -50, 17, -55);
  neck.lineTo(25, -48);
  neck.bezierCurveTo(22, -40, 22, -30, 20, -19);
  neck.closePath();
  const head = new Path2D();
  head.moveTo(16, -56);
  head.bezierCurveTo(20, -60, 27, -58, 30, -53);
  head.bezierCurveTo(33, -49, 36, -46, 36.5, -42.5);
  head.bezierCurveTo(37, -38.5, 32, -37, 28.5, -38);
  head.bezierCurveTo(25, -39, 23, -42, 21, -44);
  head.bezierCurveTo(18, -46, 15, -51, 16, -56);
  head.closePath();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3.2;
  ctx.stroke(body); ctx.stroke(neck); ctx.stroke(head);
  const coat = ctx.createLinearGradient(0, -60, 0, -11);
  coat.addColorStop(0, '#ffffff');
  coat.addColorStop(0.55, '#f7f3ff');
  coat.addColorStop(1, '#d4c6f0');
  ctx.fillStyle = coat;
  ctx.fill(body); ctx.fill(neck); ctx.fill(head);
  // pearly sheen
  const sheen = ctx.createLinearGradient(-18, -34, 22, -14);
  sheen.addColorStop(0, 'rgba(255,190,235,.22)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(160,215,255,.25)');
  ctx.fillStyle = sheen;
  ctx.fill(body);
  ctx.fillStyle = 'rgba(110,80,170,.16)';
  ctx.beginPath(); ctx.ellipse(-1, -14.5, 14, 3.2, 0, 0, Math.PI * 2); ctx.fill();

  if (L) barding(ctx, L);

  // Breastplate (Olympian gold, or the worn armour's metal)
  ctx.fillStyle = metalGrad(ctx, 12, -34, 22, -16);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(11, -33); ctx.bezierCurveTo(16, -33, 20.5, -28, 19.5, -18); ctx.lineTo(15, -17);
  ctx.bezierCurveTo(16, -24, 14, -29, 9, -30.5); ctx.closePath();
  ctx.fill(); ctx.stroke();
  const gem = ctx.createRadialGradient(16.5, -25.5, 0.5, 16.5, -25, 3);
  gem.addColorStop(0, '#ffffff');
  gem.addColorStop(0.4, L ? L.gem : RAINBOW[((Math.floor(t * 2) % 7) + 7) % 7]);
  gem.addColorStop(1, '#3a1a6a');
  ctx.fillStyle = gem;
  ctx.beginPath(); ctx.arc(16.5, -25, 2.6, 0, Math.PI * 2); ctx.fill();

  // Near legs
  leg(-12, ph, false, true);
  leg(10, ph + Math.PI, true, true);

  // Muzzle, nostril, mouth
  ctx.fillStyle = 'rgba(255,200,225,.75)';
  ctx.beginPath(); ctx.ellipse(33.2, -40.8, 3.6, 2.4, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6a4a7a';
  ctx.beginPath(); ctx.ellipse(34.8, -42.2, 1, 0.7, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8a6a8a';
  ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(30.5, -38.6); ctx.quadraticCurveTo(32, -38, 33.5, -38.8); ctx.stroke();
  // Cheek blush
  ctx.fillStyle = 'rgba(255,150,200,.35)';
  ctx.beginPath(); ctx.arc(26, -44, 2.6, 0, Math.PI * 2); ctx.fill();

  // Ear (flicks now and then)
  ctx.save();
  ctx.translate(19, -56);
  ctx.rotate(t % 5.3 < 0.18 ? -0.35 : 0);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-2.5, 1); ctx.quadraticCurveTo(-2, -7, 0, -10); ctx.quadraticCurveTo(3, -5, 3.5, 1); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffc1dc';
  ctx.beginPath(); ctx.moveTo(-1, 0); ctx.quadraticCurveTo(-0.6, -5, 0.2, -7); ctx.quadraticCurveTo(1.8, -4, 2, 0); ctx.closePath(); ctx.fill();
  ctx.restore();

  // Golden head guard
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 4.6;
  ctx.beginPath(); ctx.moveTo(20, -58.5); ctx.quadraticCurveTo(27, -57.5, 31.5, -50.5); ctx.stroke();
  ctx.strokeStyle = metalGrad(ctx, 20, -60, 30, -50);
  ctx.lineWidth = 2.8;
  ctx.beginPath(); ctx.moveTo(20, -58.5); ctx.quadraticCurveTo(27, -57.5, 31.5, -50.5); ctx.stroke();

  // Eye: big, bright, with a blink every few seconds
  const shut = t % 4.3 < 0.12;
  if (shut) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(23.2, -49.5); ctx.quadraticCurveTo(25.5, -48, 28, -49.6); ctx.stroke();
  } else {
    const ig = ctx.createLinearGradient(0, -53, 0, -46.5);
    ig.addColorStop(0, '#1a0c2e');
    ig.addColorStop(0.6, '#5b2d9a');
    ig.addColorStop(1, '#c58cff');
    ctx.fillStyle = ig;
    ctx.beginPath(); ctx.ellipse(25.6, -49.8, 2.6, 3.3, -0.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(26.4, -51.2, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(24.8, -48.4, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(22.6, -52.2); ctx.quadraticCurveTo(25.5, -54.2, 28.6, -52.2); ctx.lineTo(29.6, -53.4); ctx.stroke();
  }

  // Mane: tapered rainbow locks that stream with speed and fall
  const fall = air ? clamp(p.vy / 900, -0.4, 0.9) : 0;
  const locks = [];
  const sweep = 0.5 + run * 0.6 + (air ? 0.2 : 0), droop = 0.8 - run * 0.5;
  for (let i = 0; i < 7; i++) {
    const k = i / 6, rx = 17.5 - k * 10, ry = -56.5 + k * 22;
    const L = 15 + (i % 2) * 3 - i * 0.3 + run * 6;
    const pts = [];
    for (let s = 0; s <= 6; s++) {
      const u = s / 6;
      pts.push([
        rx - u * L * sweep - u * u * 2.5,
        ry + u * L * droop + Math.sin(t * 6 + i * 0.9 - u * 4) * u * 2.2 - u * L * fall * 0.8,
      ]);
    }
    locks.push(pts);
  }
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = (blink ? 0.45 : 1) * 0.3;
  locks.forEach((l, i) => taper(ctx, l, 8, 2, RAINBOW[i]));
  ctx.globalAlpha = blink ? 0.45 : 1;
  ctx.globalCompositeOperation = 'source-over';
  locks.forEach((l, i) => taper(ctx, l, 4.4, 0.9, RAINBOW[i]));
  // forelock
  for (let i = 0; i < 2; i++) {
    const pts = [[19, -58], [23, -59 + i * 2], [27 - i * 2, -56 + i * 2 + Math.sin(t * 5 + i) * 0.8]];
    taper(ctx, pts, 3.4, 1, RAINBOW[i * 5]);
  }

  // The armour's plume streams back from the helm
  if (L) {
    for (let i = 0; i < 3; i++) {
      const w = Math.sin(t * 7 + i * 1.3) * 1.2 - run * 1.5, lift = air ? clamp(-p.vy / 600, -1, 1) * 2 : 0;
      const pts = [[19.5, -59.5], [15 - i, -65 + i * 1.5 + w * 0.4 - lift], [9 - i * 2 - run * 3, -67 + i * 2.4 + w - lift], [3 - i * 2.5 - run * 6, -65 + i * 3 + w * 1.6 - lift * 1.5]];
      taper(ctx, pts, 4.6 - i * 0.8, 0.8, i === 1 ? L.trim : L.plume);
    }
  }

  // Horn: spiralled gold with a glowing tip
  ctx.fillStyle = goldGrad(ctx, 21, -58, 32, -80);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(20.6, -58); ctx.lineTo(32, -80); ctx.lineTo(25.4, -59.2); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(140,80,10,.65)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 4; k++) {
    const u = 0.15 + k * 0.2, x0 = 20.6 + (32 - 20.6) * u, y0 = -58 + (-80 + 58) * u, x1 = 25.4 + (32 - 25.4) * u, y1 = -59.2 + (-80 + 59.2) * u;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1 + 1.5); ctx.stroke();
  }
  const pulse = 0.7 + Math.sin(t * 4) * 0.3;
  ctx.globalCompositeOperation = 'lighter';
  const hg = ctx.createRadialGradient(32, -80, 0, 32, -80, 14 * pulse + 4);
  hg.addColorStop(0, 'rgba(255,255,230,.95)');
  hg.addColorStop(0.35, 'rgba(255,210,120,.45)');
  hg.addColorStop(1, 'rgba(255,180,220,0)');
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.arc(32, -80, 14 * pulse + 4, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  sparkle(ctx, 32, -80, 4 + pulse * 2.5, t * 1.5);

  // Near wing
  if (up.wings || up.fly) wing(ctx, p, t, true);
  ctx.restore();
  ctx.globalAlpha = 1;

  // Shield bubble
  if (G.save.up.aegis > 0 && p.aegis <= 0) {
    // a faint golden ring while the Aegis Shield is ready to block
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2 - 14;
    ctx.strokeStyle = `rgba(255,225,74,${0.35 + Math.sin(t * 4) * 0.12})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, 48, 0, Math.PI * 2); ctx.stroke();
  }
  if (p.shield > 0) {
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2 - 14;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(cx, cy, 24, cx, cy, 54);
    g.addColorStop(0, 'rgba(150,230,255,0)');
    g.addColorStop(0.85, 'rgba(150,230,255,.25)');
    g.addColorStop(1, 'rgba(255,255,255,.6)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, 54, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  // Beam from the horn
  if (p.beaming) {
    const h = hornTip(p), ox = h.x, oy = h.y, ex = ox + p.ax * p.beamLen, ey = oy + p.ay * p.beamLen;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let c = 0; c < 7; c++) {
      ctx.strokeStyle = RAINBOW[c];
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 3;
      const off = (c - 3) * 2.4 + Math.sin(t * 40 + c) * 1.2;
      ctx.beginPath();
      ctx.moveTo(ox - p.ay * off, oy + p.ax * off);
      ctx.lineTo(ex - p.ay * off, ey + p.ax * off);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}

function wing(ctx, p, t, near) {
  if (!near) return;
  const spread = p.flying ? 1.05 : p.gliding ? 1 : !p.ground ? 0.6 : 0;
  const flap = p.flying ? Math.sin(t * 24) * 0.6 : p.gliding ? Math.sin(t * 9) * 0.18 : !p.ground ? Math.sin(t * 14) * 0.25 : Math.sin(t * 2) * 0.03;
  ctx.save();
  ctx.translate(4, -31);
  ctx.rotate(-0.12 - spread * 1.1 + flap);
  const L = 21 + spread * 15, n = 5;
  const path = new Path2D();
  path.moveTo(2, 1);
  path.quadraticCurveTo(-L * 0.35, -10 - spread * 4, -L, -5 - spread * 3);
  for (let k = 0; k < n; k++) {
    const x0 = -L + (k / n) * (L + 2), x1 = -L + ((k + 1) / n) * (L + 2);
    path.quadraticCurveTo((x0 + x1) / 2 - 1.5, 5 + (n - k) * 0.5, x1, 1);
  }
  path.closePath();
  const g = ctx.createLinearGradient(0, -8, -L, 4);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.6, '#e6deff');
  g.addColorStop(1, '#bfe3ff');
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.6;
  ctx.stroke(path);
  ctx.fillStyle = g;
  ctx.fill(path);
  ctx.strokeStyle = 'rgba(110,90,170,.35)';
  ctx.lineWidth = 0.9;
  for (let k = 1; k < n; k++) {
    const x = -L + (k / n) * (L + 2);
    ctx.beginPath(); ctx.moveTo(x, 1); ctx.lineTo(x + 4, -4 - spread * 2); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(0, -1); ctx.quadraticCurveTo(-L * 0.35, -8 - spread * 4, -L * 0.85, -5 - spread * 3); ctx.stroke();
  ctx.restore();
}

export function drawBubbles(ctx) {
  for (const b of G.bubbles) {
    const fade = Math.min(1, (b.life - b.t) * 2);
    ctx.globalAlpha = fade;
    const g = ctx.createRadialGradient(b.x - 6, b.y - 6, 2, b.x, b.y, b.r);
    g.addColorStop(0, 'rgba(255,255,255,.7)');
    g.addColorStop(0.4, 'rgba(180,240,255,.12)');
    g.addColorStop(1, 'rgba(160,220,255,.5)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,250,255,.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
