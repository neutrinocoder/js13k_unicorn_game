// The hero, a fallen dark angel: movement, weapons and drawing.
import { G } from './state.js';
import { T, tileAt, ORE, CRYSTAL, BIOMES, BIOME_LIST } from './world.js';
import { moveBody, touchWall, onPlatform, hazardTouch, rayLength } from './physics.js';
import { held, tapped, mouse } from './input.js';
import { clamp, rand, angDiff, pick, rgba, mix } from './util.js';
import { eye } from './art.js';

// The dark angel's shadow-fire, used where the unicorn had its rainbow.
const RAINBOW = ['#2a0b45', '#4a1580', '#7a2ad0', '#a64dff', '#d07aff', '#ff6ad5', '#f2d6ff'];
import { burst, part, ring, shake, floater } from './fx.js';
import { sfx } from './audio.js';
import { stats, worn } from './items.js';
import { hurtPlayer, damageEnemy, shoot, breakTile, afflict, explode } from './combat.js';
import { arms, current, slotArm, SLOTS, STARTER, palOf, drawArm, shortName, rarityOf } from './weapons.js';

export function makePlayer(x, y) {
  const p = {
    x, y, w: 30, h: 34, vx: 0, vy: 0, face: 1, ground: false, jumps: 0, coyote: 0, jbuf: 0, rising: false,
    dashT: 0, dashCd: 0, dashDir: 1, inv: 0, hp: 5, shield: 0, ctrlLock: 0, wallDir: 0, dropT: 0,
    whipT: 0, whipAng: 0, whipCd: 0, whipSide: 1, whipDur: 0.17, whipR: 125, whipArc: 1.2, aimT: 0, shotCd: 0, combo: 0, lastWhip: -9, blastCd: 0, starCd: 0, atkBuf: 0, altBuf: 0,
    armour: 0, armT: 0, healT: 0, energy: 100, beaming: false, beamLen: 0, beamTick: 0, aegis: 0, wing: 200, flying: false, flapT: 0, bombCd: 0,
    charge: 0, slow: 0, gliding: false, runPhase: 0, sx: 1, sy: 1, ax: 1, ay: 0, stepT: 0, dead: false, tail: [],
  };
  for (let i = 0; i < 12; i++) p.tail.push({ x: x, y: y + 10, px: x, py: y + 10 });
  return p;
}

const WHIP_T = 0.17, WHIP_CD = 0.2, SCALE = 1.25;

// World position of the angel's lash hand, where the beam and the lash come from.
export function hornTip(p) {
  const [hx, hy] = pose(p, G.t).hand;
  return { x: p.x + p.w / 2 + p.face * hx * SCALE * p.sx, y: p.y + p.h + hy * SCALE * p.sy };
}

export function updatePlayer(dt) {
  const p = G.player, S = stats(), B = BIOMES[BIOME_LIST[G.biome]];
  if (p.dead) return;
  p.inv -= dt; p.dashCd -= dt; p.ctrlLock -= dt; p.whipCd -= dt; p.blastCd -= dt; p.starCd -= dt; p.bombCd -= dt;
  p.shield -= dt; p.slow -= dt; p.dropT -= dt; p.whipT -= dt; p.aimT -= dt; p.shotCd -= dt;
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

  // Weapon selection: the three you carry (1 2 3, or Q and the wheel to step through them)
  for (let i = 0; i < SLOTS; i++) if (tapped('Digit' + (i + 1)) && slotArm(i)) selectSlot(i);
  if (tapped('KeyQ') || mouse.wheel) {
    const step = mouse.wheel < 0 ? -1 : 1;
    let w = arms().cur;
    for (let k = 0; k < SLOTS; k++) { w = (w + step + SLOTS) % SLOTS; if (slotArm(w)) break; }
    if (slotArm(w)) selectSlot(w);
  }
  if (tapped('KeyG') && S.hasBombs) fireBomb(p, S);

  // Attacks. A press during a cooldown is remembered briefly, so no click is lost.
  const W = current(), kind = W.def.kind;
  if (mouse.pressed || tapped('KeyJ', 'KeyK', 'KeyZ')) p.atkBuf = 0.3; else p.atkBuf -= dt;
  if (mouse.rpressed || tapped('KeyX', 'KeyI')) p.altBuf = 0.3; else p.altBuf -= dt;
  const atk = mouse.down || held('KeyJ', 'KeyK', 'KeyZ') || p.atkBuf > 0;
  const alt = mouse.rdown || held('KeyX', 'KeyI') || p.altBuf > 0;
  if ((atk || alt) && !dir && mouse.used && mouse.inside) p.face = p.ax < 0 ? -1 : 1;
  p.beaming = false;
  if (alt) { if (fireBlast(p, S)) p.altBuf = 0; }
  else if (atk) {
    const fired = kind === 'shot' ? fireShot(p, S, W) : kind === 'beam' ? fireBeam(p, S, dt, W) : kind === 'lob' ? fireLob(p, S, W) : fireMelee(p, S, dir, W);
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

function selectSlot(i) {
  const A = arms();
  if (A.cur === i) return;
  A.cur = i;
  sfx('ui');
  const W = current(), p = G.player;
  floater(p.x + p.w / 2, p.y - 16, shortName(W.def), rarityOf(W.def).col, 14);
}

function targets() {
  return G.boss && !G.boss.dead && !G.boss.hidden ? [...G.enemies, G.boss] : G.enemies;
}

// The wielder's bonus to a weapon's damage: shop upgrades, boss powers, armour and the weapon's stars.
const bonus = (S, W) => S.wdmg * (1 + 0.25 * (W.lv - 1));

// Whips, swords, axes, spears and the rest: a swing through an arc in front of you.
function fireMelee(p, S, dir, W) {
  if (p.whipCd > 0) return false;
  const def = W.def, mul = bonus(S, W), pal = palOf(def);
  p.combo = G.t - p.lastWhip < Math.max(0.5, def.cd * 2) ? (p.combo + 1) % 3 : 0;
  p.lastWhip = G.t;
  const finisher = p.combo === 2;
  p.whipCd = def.cd * (finisher ? 1.5 : 1);
  p.whipDur = clamp(def.cd * 0.85, 0.11, 0.26);
  p.whipT = p.whipDur;
  p.whipAng = Math.atan2(p.ay, p.ax);
  p.whipSide = (p.combo % 2 ? -1 : 1) * (p.ax < 0 ? -1 : 1);
  p.whipFin = finisher;
  sfx('whip');
  if (p.ground && !dir) p.vx += p.ax * 110;
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2 - 4;
  const reach = def.reach * S.reachK * (finisher ? 1.15 : 1), arc = def.arc || 1.2, dmg = def.dmg * mul * (finisher ? 1.6 : 1);
  p.whipR = reach;
  p.whipArc = arc;
  let hit = false, boomAt = null;
  for (const e of targets()) {
    if (e.dead) continue;
    const ex = clamp(cx, e.x, e.x + e.w), ey = clamp(cy, e.y, e.y + e.h);
    const d = Math.hypot(ex - cx, ey - cy);
    const a = Math.atan2(e.y + e.h / 2 - cy, e.x + e.w / 2 - cx);
    if (d < reach && (d < 34 || Math.abs(angDiff(p.whipAng, a)) < arc)) {
      damageEnemy(e, dmg, Math.sign(e.x + e.w / 2 - cx), (def.kb || 260) * (finisher ? 1.6 : 1));
      afflict(e, def.fx, mul);
      burst(clamp(cx + Math.cos(p.whipAng) * 40, e.x, e.x + e.w), clamp(cy + Math.sin(p.whipAng) * 40, e.y, e.y + e.h), 8, pal, 260, { add: true, g: 0 });
      if (!boomAt) boomAt = [e.x + e.w / 2, e.y + e.h / 2];
      hit = true;
    }
  }
  // a blow that bursts, and a swing that throws a crescent ahead of it
  if (def.boom && boomAt) explode(boomAt[0], boomAt[1], def.boom, dmg * 0.5, 'player', false, { cols: pal, fx: def.fx, mul, soft: 1 });
  if (def.wave) shoot({ x: cx + p.ax * 34, y: cy + p.ay * 34, vx: p.ax * def.wave.speed, vy: p.ay * def.wave.speed, r: 15, dmg: dmg * def.wave.dmg, team: 'player', kind: 'wave', color: def.glow, life: def.wave.life, pierce: 99, fx: def.fx, mul, kb: 160 });
  // Break ore and crystals along the swing
  for (let k = -2; k <= 2; k++) {
    const a = p.whipAng + k * arc * 0.3;
    for (let d = 16; d < reach; d += 14) {
      const tx = Math.floor((cx + Math.cos(a) * d) / T), ty = Math.floor((cy + Math.sin(a) * d) / T);
      const t = tileAt(tx, ty);
      if (t === ORE || t === CRYSTAL) { breakTile(tx, ty); break; }
      if (t === 1 || t === 4) break;
    }
  }
  // Pop bubbles for a bounce
  for (const b of G.bubbles) {
    if (Math.hypot(b.x - cx, b.y - cy) < reach && Math.abs(angDiff(p.whipAng, Math.atan2(b.y - cy, b.x - cx))) < arc) b.pop = true;
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

const SHOT_SFX = { star: 'star', bolt: 'bolt', fire: 'shoot', shard: 'star', arrow: 'whip', wind: 'whip' };

// Bows, wands, staffs and fans: one or more shots toward your aim.
function fireShot(p, S, W) {
  if (p.shotCd > 0) return false;
  const def = W.def, mul = bonus(S, W), base = def.n || 1, n = base + S.extraShots;
  p.shotCd = def.cd;
  p.aimT = 0.24;
  p.whipAng = Math.atan2(p.ay, p.ax);
  const h = hornTip(p), step = base > 1 ? def.spread / (base - 1) : 0.14, j = def.jitter || 0;
  for (let i = 0; i < n; i++) {
    const a = p.whipAng + (i - (n - 1) / 2) * step + rand(-j, j);
    shoot({
      x: h.x, y: h.y, vx: Math.cos(a) * def.speed, vy: Math.sin(a) * def.speed, r: def.r, dmg: def.dmg * mul, team: 'player', kind: def.pkind,
      color: def.pkind === 'star' ? pick(['#ffe14a', '#ff9ad6', '#8fe8ff']) : def.glow, tip: def.col[0], homing: !!def.homing, life: def.life,
      trail: def.pkind === 'arrow' || def.pkind === 'wind' ? null : def.pkind === 'star' ? '#fff2a8' : def.col[1],
      pierce: def.pierce || 0, fx: def.fx, mul, chain: def.chain, boom: def.boom, cols: palOf(def), kb: def.kb,
    });
  }
  sfx(SHOT_SFX[def.pkind] || 'star', def.pkind === 'bolt' ? 0.5 : 1);
  return true;
}

// A beam that burns through everything in its path, for as long as there is energy.
function fireBeam(p, S, dt, W) {
  if (p.energy <= 0) return false;
  const def = W.def, mul = bonus(S, W);
  p.beaming = true;
  p.aimT = 0.1;
  p.whipAng = Math.atan2(p.ay, p.ax);
  p.energy = Math.max(0, p.energy - def.drain * S.drainK * dt);
  const h = hornTip(p), ox = h.x, oy = h.y;
  const len = rayLength(ox, oy, p.ax, p.ay, 560);
  p.beamLen = len;
  p.beamTick -= dt;
  if (p.beamTick <= 0) {
    p.beamTick = def.cd;
    sfx('beam');
    for (const e of targets()) {
      if (e.dead) continue;
      const ex = e.x + e.w / 2 - ox, ey = e.y + e.h / 2 - oy, along = ex * p.ax + ey * p.ay;
      if (along < 0 || along > len) continue;
      const side = Math.abs(ex * p.ay - ey * p.ax);
      if (side < Math.max(e.w, e.h) / 2 + 10) { damageEnemy(e, def.dmg * mul * S.beamK, Math.sign(p.ax), 60); afflict(e, def.fx, mul); }
    }
    const tx = Math.floor((ox + p.ax * (len + 6)) / T), ty = Math.floor((oy + p.ay * (len + 6)) / T);
    const t = tileAt(tx, ty);
    if (t === ORE || t === CRYSTAL) breakTile(tx, ty);
  }
  if (Math.random() < 0.6) part({ x: ox + p.ax * len, y: oy + p.ay * len, vx: rand(-120, 120), vy: rand(-120, 120), life: 0.25, size: 3, color: pick(palOf(def)), add: true });
  return true;
}

// Flasks: lobbed in an arc, bursting where they land.
function fireLob(p, S, W) {
  if (p.shotCd > 0) return false;
  const def = W.def, mul = bonus(S, W), h = hornTip(p), sp = 640;
  p.shotCd = def.cd;
  p.aimT = 0.24;
  p.whipAng = Math.atan2(p.ay, p.ax);
  shoot({ x: h.x, y: h.y, vx: p.ax * sp + p.vx * 0.3, vy: p.ay * sp - 230, g: 1300, r: 8, dmg: def.dmg * mul, team: 'player', kind: 'flask', color: def.glow, life: 1.4, boom: def.boom, cols: palOf(def), fx: def.fx, mul, trail: def.col[1] });
  sfx('whip');
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
  return hornTip(p);
}

export function updateTail(p, dt) {
  const f = p.face, an = tailAnchor(p), ax = an.x, ay = an.y;
  const N = p.tail.length;
  if (p.whipT > 0) {
    const u = 1 - p.whipT / p.whipDur, reach = p.whipR;
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
    pt.x += vx - f * 26 * dt + Math.sin(G.t * 6 - i * 0.7) * 0.5;
    pt.y += vy - 0.12 + Math.cos(G.t * 4 - i * 0.6) * 0.25;
    const prev = p.tail[i - 1], dx = pt.x - prev.x, dy = pt.y - prev.y, d = Math.hypot(dx, dy) || 1;
    pt.x = prev.x + (dx / d) * seg;
    pt.y = prev.y + (dy / d) * seg;
  }
  const W = wield(p);
  if (Math.random() < 0.2 && !(p.holy > 0.5) && W.def.kind === 'lash') {
    const tip = p.tail[N - 1];
    part({ x: tip.x, y: tip.y, vx: rand(-20, 20), vy: rand(-20, 20), life: 0.6, size: rand(1.4, 2.4), color: pick(palOf(W.def)), add: true, shape: 'star', vr: 3 });
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
const STEEL = ['#d6d0e6', '#6a6282', '#221d30'];
let METAL = STEEL;
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

// The weapon this angel holds. Puppets in cutscenes (bare) always carry the Shadow Lash.
const BARE = { def: STARTER, lv: 1, key: 'lash:1' };
const wield = p => (p.bare ? BARE : current());
// The angle each kind of weapon is carried at when it is not in use (0 = pointing ahead).
const REST = { sword: -1.0, great: -1.15, dagger: -0.5, club: -0.9, hammer: -1.1, axe: -1.0, scythe: -1.25, spear: -1.3, trident: -1.3, glaive: -1.3, bow: 0.15, wand: -0.7, staff: -1.4, fan: -0.8, flask: -0.4, bolt: -0.6 };

export function drawTail(ctx, p) {
  const N = p.tail.length, pts = p.tail, W = wield(p), RAINBOW = palOf(W.def);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const whip = p.whipT > 0;
  if (W.def.kind === 'lash') drawLash(ctx, p, RAINBOW, whip);
  if (whip) {
    const u = 1 - p.whipT / p.whipDur, cx = p.x + p.w / 2, cy = p.y + p.h / 2 - 4;
    const R = p.whipR, k = Math.min(1, u * 1.8), span = Math.min(2.9, (p.whipArc || 1.2) * 1.9);
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

function drawLash(ctx, p, RAINBOW, whip) {
  const N = p.tail.length, pts = p.tail;
  const ribbons = [];
  for (let c = 0; c < RAINBOW.length; c++) {
    const line = [];
    for (let i = 0; i < N; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      const k = i / (N - 1), off = (c - 3) * (whip ? 2.1 : 0.9) * (1 - k * 0.5) + Math.sin(G.t * 7 + k * 5 + c) * k * k * 1.2;
      line.push([pts[i].x - (dy / d) * off, pts[i].y + (dx / d) * off]);
    }
    ribbons.push(line);
  }
  // soft glow underneath
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = whip ? 0.45 : 0.22;
  ribbons.forEach((l, c) => taper(ctx, l, whip ? 7 : 4.5, 2, RAINBOW[c]));
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ribbons.forEach((l, c) => taper(ctx, l, whip ? 3.6 : 1.9, 0.6, RAINBOW[c]));
  // white sheen on the top ribbon
  ctx.globalAlpha = 0.5;
  taper(ctx, ribbons[0].map(([x, y]) => [x, y - 0.6]), 1.1, 0.3, '#ffffff');
  ctx.globalAlpha = 1;
}

// ---------- The dark angel ----------
// Colours of the angel: dark (k = 0, fallen) through to holy (k = 1, as it was in Olympus).
const DARK_C = {
  wDark: '#120a1c', wDarkF: '#08050e', wMid: '#3a2456', wMidF: '#24163a', wEdge: '#a676ff', wEdgeF: '#6a4a9a',
  cov: '#2a1a40', covF: '#170e26', coat: '#140c1e', coatL: '#3a2a52', cloth: '#2a1e3c', clothF: '#160f22',
  armF: '#120c1c', arm: '#241932', boot: '#1a1224', bootF: '#0e0a16', belt: '#0c0812',
  hair: '#efeaf8', hair2: '#bdb3d6', eye: '#c45cff', socket: '#1a0c2e', trim: '#b06aff', spark: '#a64dff',
};
const HOLY_C = {
  wDark: '#d6cfe8', wDarkF: '#b4accb', wMid: '#ffffff', wMidF: '#e4def0', wEdge: '#ffe9a8', wEdgeF: '#e2cd92',
  cov: '#f6f2fc', covF: '#cfc7df', coat: '#f2eefa', coatL: '#ffffff', cloth: '#ece6f6', clothF: '#c6bed8',
  armF: '#cdc4de', arm: '#efe9f8', boot: '#c89a3a', bootF: '#9a7428', belt: '#c89a3a',
  hair: '#fff3c4', hair2: '#f0c25a', eye: '#5ab8ff', socket: '#1a2a4e', trim: '#f4c24a', spark: '#ffe28a',
};
function angelColours(k) {
  const c = { k };
  for (const key in DARK_C) c[key] = k <= 0 ? DARK_C[key] : k >= 1 ? HOLY_C[key] : mix(DARK_C[key], HOLY_C[key], k);
  c.quill = rgba(mix('#a676ff', '#e8c870', k), 0.35);
  c.gleam = rgba(mix('#be82ff', '#fff6d0', k), 0.6);
  c.gleamF = rgba(mix('#9664dc', '#f0e0b0', k), 0.35);
  c.lining = rgba(mix('#6e28aa', '#f4c24a', k), 0.5);
  c.hairGlow = rgba(mix('#b06aff', '#ffe28a', k), 0.45);
  return c;
}
let HC = angelColours(0);

// Where the shoulder and the lash hand are, in the angel's own space (facing right, feet at 0, 0).
// Shared by the drawing and by the lash, so the lash always leaves the hand.
function pose(p, t) {
  const run = Math.min(1, Math.abs(p.vx) / 420), air = !p.ground;
  const bob = air ? 0 : run > 0.08 ? Math.abs(Math.sin(p.runPhase)) * 1.8 * run : Math.sin(t * 2.2) * 0.5;
  const lean = run * 2.5, sh = [0.5 + lean, -37 - bob];
  let hand;
  if (p.whipT > 0 || p.aimT > 0 || p.beaming) {
    const la = p.face > 0 ? p.whipAng : Math.PI - p.whipAng;
    hand = [sh[0] + Math.cos(la) * 11, sh[1] + 2 + Math.sin(la) * 11];
  } else {
    const a = -Math.sin(p.runPhase) * run;
    hand = [sh[0] + 6.5 + a * 5, sh[1] + 10 - Math.abs(a) * 2 - (air ? 3 : 0)];
  }
  return { run, air, bob, lean, sh, hand };
}

function limb2(ctx, pts, w, col) {
  ctx.strokeStyle = OUT;
  ctx.lineWidth = w + 2.2;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.stroke();
}

function glowDot(ctx, x, y, r, col, a) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

// A broken ring of black thorns, burning violet, turning slowly over the head.
function halo(ctx, x, y, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.28);
  ctx.scale(1, 0.32);
  const k = HC.k, a0 = ctx.globalAlpha;
  if (k > 0) {
    // the golden halo of an angel in good standing
    glowDot(ctx, 0, 0, 18, '#ffe28a', 0.5 * k);
    ctx.globalAlpha = a0 * k;
    ctx.strokeStyle = '#c8901a';
    ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.arc(0, 0, 8.5, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#fff3b0';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, 0, 8.5, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = a0 * (1 - k);
  }
  if (k >= 1) { ctx.restore(); return; }
  glowDot(ctx, 0, 0, 16, HC.spark, 0.35 + Math.sin(t * 2.5) * 0.08);
  const spin = t * 0.8;
  for (let k = 0; k < 5; k++) {
    const a0 = spin + (k / 5) * Math.PI * 2, a1 = a0 + 0.95;
    ctx.strokeStyle = 'rgba(166,77,255,.55)';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, 8.5, a0, a1); ctx.stroke();
    ctx.strokeStyle = '#1a0a26';
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(0, 0, 8.5, a0, a1); ctx.stroke();
    // a thorn at the end of each piece
    const tx = Math.cos(a1) * 8.5, ty = Math.sin(a1) * 8.5;
    ctx.fillStyle = '#1a0a26';
    ctx.beginPath(); ctx.moveTo(tx - 1.4, ty); ctx.lineTo(Math.cos(a1) * 13, Math.sin(a1) * 13); ctx.lineTo(tx + 1.4, ty); ctx.fill();
  }
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(230,190,255,.8)';
  ctx.lineWidth = 0.9;
  for (let k = 0; k < 5; k++) { const a0 = spin + (k / 5) * Math.PI * 2; ctx.beginPath(); ctx.arc(0, 0, 8.5, a0 + 0.1, a0 + 0.8); ctx.stroke(); }
  ctx.restore();
}

// A great feathered wing, black shading to violet. Its arm runs along -x from the root and its
// feathers hang towards +y, sweeping back towards the tip; `ang` turns the whole wing.
function angelWing(ctx, x, y, ang, len, spread, near, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  const fold = 1 - spread, n = 9;
  const armY = u => -Math.sin(u * Math.PI) * len * 0.16;
  const dark = near ? HC.wDark : HC.wDarkF, mid = near ? HC.wMid : HC.wMidF, edge = near ? HC.wEdge : HC.wEdgeF;
  // primaries and secondaries, drawn tip first so the inner ones lie on top
  for (let k = n - 1; k >= 0; k--) {
    const u = k / (n - 1), bx = -len * (0.12 + u * 0.88), by = armY(0.12 + u * 0.88);
    // spread, the feathers fan back from the arm; folded, they hang straight down the back
    const d = (Math.PI / 2 + 0.35 + u * 1.05) * spread + (0.45 + u * 0.25) * fold + Math.sin(t * 3 + k) * 0.02;
    const fl = len * ((0.42 + u * 0.42) * spread + (0.7 + u * 0.95) * fold), fw = len * (0.075 + fold * 0.015);
    const ex = bx + Math.cos(d) * fl, ey = by + Math.sin(d) * fl, nx = -Math.sin(d) * fw, ny = Math.cos(d) * fw;
    const g = ctx.createLinearGradient(bx, by, ex, ey);
    g.addColorStop(0, dark);
    g.addColorStop(0.7, mid);
    g.addColorStop(1, edge);
    ctx.fillStyle = g;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx + nx, by + ny);
    ctx.quadraticCurveTo(bx + (ex - bx) * 0.6 + nx * 1.3, by + (ey - by) * 0.6 + ny * 1.3, ex, ey);
    ctx.quadraticCurveTo(bx + (ex - bx) * 0.6 - nx * 0.8, by + (ey - by) * 0.6 - ny * 0.8, bx - nx, by - ny);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // a quill down the middle
    ctx.strokeStyle = HC.quill;
    ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + (ex - bx) * 0.85, by + (ey - by) * 0.85); ctx.stroke();
  }
  // coverts over the arm, scalloped
  const cov = new Path2D();
  cov.moveTo(2, -1);
  for (let s = 0; s <= 10; s++) { const u = s / 10; cov.lineTo(-len * u, armY(u) - 1.8); }
  for (let s = 10; s >= 0; s--) {
    const u = s / 10, depth = len * (0.12 + 0.12 * Math.sin(u * Math.PI)) * (1 - u * 0.5);
    cov.quadraticCurveTo(-len * (u + 0.05), armY(u) + depth * 1.25, -len * u, armY(u) + depth);
  }
  cov.closePath();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.6;
  ctx.stroke(cov);
  const cg = ctx.createLinearGradient(0, -6, -len, 6);
  cg.addColorStop(0, near ? HC.cov : HC.covF);
  cg.addColorStop(1, dark);
  ctx.fillStyle = cg;
  ctx.fill(cov);
  // a violet gleam along the leading edge
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = near ? HC.gleam : HC.gleamF;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let s = 0; s <= 10; s++) { const u = s / 10; if (s) ctx.lineTo(-len * u, armY(u) - 1.6); else ctx.moveTo(0, -1.6); }
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

export function drawAngel(ctx, p, t) {
  const f = p.face, run = Math.min(1, Math.abs(p.vx) / 420), air = !p.ground;
  const up = (G.save && G.save.up) || {};
  const blink = p.inv > 0 && !p.dashT && Math.floor(t * 20) % 2;
  const A = G.save ? worn() : null, L = A && A.look;
  const holy = clamp(p.holy || 0, 0, 1);
  HC = angelColours(holy);
  METAL = L ? L.metal : holy > 0.5 ? GOLD : STEEL;

  // Soft aura
  const acx = p.x + p.w / 2, acy = p.y + p.h - 34;
  ctx.globalCompositeOperation = 'lighter';
  const ag = ctx.createRadialGradient(acx, acy, 4, acx, acy, 70);
  ag.addColorStop(0, rgba(mix('#aa5aff', '#ffe6a0', holy), p.dashT > 0 ? 0.5 : 0.16 + holy * 0.14));
  ag.addColorStop(1, rgba(mix('#7828c8', '#ffd890', holy), 0));
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
  if (holy < 1) { const a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * (1 - holy); drawTail(ctx, p); ctx.globalAlpha = a0; }

  ctx.save();
  ctx.translate(p.x + p.w / 2, p.y + p.h);
  ctx.scale(f * p.sx * SCALE, p.sy * SCALE);
  const Q = pose(p, t), { sh, hand } = Q, bob = Q.bob;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const trim = L ? L.trim : HC.trim, gemC = L ? L.gem : HC.eye;
  const ph = p.runPhase, wave = t * (run > 0.1 ? 11 : 3);
  const fall = air ? clamp(p.vy / 900, -0.5, 0.9) : 0;

  // Wings: folded down the back on the ground, half open in the air, spread wide in flight
  const spread = p.flying ? 1 : p.gliding ? 0.9 : air ? 0.45 : 0;
  const flap = p.flying ? Math.sin(t * 22) * 0.55 : p.gliding ? Math.sin(t * 8) * 0.1 : air ? Math.sin(t * 12) * 0.15 : Math.sin(t * 2) * 0.03;
  const wx = sh[0] - 3, wy = sh[1] + 2;
  angelWing(ctx, wx - 2, wy - 0.5, 1.27 - spread * 0.12 - flap * 0.8, 20 + spread * 16, spread, false, t);

  // the far arm, swinging opposite the near one
  const fa = Math.sin(ph) * run;
  const fe = [sh[0] - 1 - fa * 3, sh[1] + 8], fh = [sh[0] + 1 - fa * 7, sh[1] + 15];
  limb2(ctx, [[sh[0] - 1, sh[1] + 1], fe, fh], 3.6, HC.armF);
  ctx.fillStyle = metalGrad(ctx, fh[0] - 2, fh[1] - 2, fh[0] + 2, fh[1] + 2);
  ctx.beginPath(); ctx.arc(fh[0], fh[1], 2, 0, Math.PI * 2); ctx.fill();

  // the long coat behind, tattered and streaming
  const flow = run * 7 + (air ? 3 : 0);
  ctx.fillStyle = HC.coat;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-4.5, -21 - bob);
  ctx.quadraticCurveTo(-8 - flow * 0.4, -14, -10 - flow + Math.sin(wave) * 1.2, -3 - fall * 4);
  for (let k = 0; k <= 4; k++) ctx.lineTo(-10 - flow + Math.sin(wave + k) * 1.2 + k * (6 + flow * 0.2), (k % 2 ? -6 : -1) - fall * 4 * (1 - k / 4) + Math.sin(wave * 1.3 + k) * 0.8);
  ctx.lineTo(3, -8);
  ctx.lineTo(3, -21 - bob);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = L ? rgba(L.plume, 0.55) : HC.lining;
  ctx.beginPath();
  ctx.moveTo(-4, -19 - bob);
  ctx.quadraticCurveTo(-7 - flow * 0.4, -13, -8.5 - flow, -4.5 - fall * 4);
  ctx.lineTo(-5 - flow * 0.6, -5);
  ctx.quadraticCurveTo(-4, -12, -2, -19 - bob);
  ctx.fill();

  // legs: a striding run, knees up when rising
  const leg = (hx, lph, near) => {
    const hy = -19 - bob;
    let kx, ky, fx, fy;
    if (air) {
      if (p.vy < 0) { kx = hx + (near ? 6 : 3); ky = -13; fx = hx + (near ? 2 : -3); fy = -5; }
      else { kx = hx + (near ? 4 : 1); ky = -10; fx = hx + (near ? 1 : -3); fy = -1.5; }
    } else if (run > 0.08) {
      const s = Math.sin(lph), c = Math.max(0, Math.cos(lph));
      fx = hx + s * 9 * run; fy = -c * 6 * run;
      kx = hx + s * 5 * run + 2.5 * run + 1; ky = -10 - c * 3 * run;
    } else { fx = hx + (near ? 1.5 : -1.5); fy = 0; kx = hx + (near ? 2 : 0); ky = -10; }
    const cloth = near ? HC.cloth : HC.clothF;
    limb2(ctx, [[hx, hy], [kx, ky]], near ? 5 : 4.4, cloth);
    // greave and boot in the armour's metal
    limb2(ctx, [[kx, ky], [fx, fy - 2]], near ? 4.2 : 3.8, near ? METAL[1] : METAL[2]);
    ctx.fillStyle = trim;
    ctx.beginPath(); ctx.arc(kx, ky, near ? 1.8 : 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = near ? HC.boot : HC.bootF;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(fx - 2.6, fy - 3.6); ctx.lineTo(fx + 2, fy - 3.6); ctx.lineTo(fx + 5, fy - 0.6); ctx.lineTo(fx + 5, fy); ctx.lineTo(fx - 2.8, fy); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = metalGrad(ctx, fx, fy - 4, fx + 5, fy);
    ctx.beginPath(); ctx.moveTo(fx + 1.5, fy - 3.4); ctx.lineTo(fx + 5, fy - 0.6); ctx.lineTo(fx + 5, fy); ctx.lineTo(fx + 1.5, fy); ctx.closePath(); ctx.fill();
    if (up.hooves) glowDot(ctx, fx + 1, fy - 1.5, 6, HC.eye, 0.4);
  };
  leg(-1.5, ph + Math.PI, false);

  // torso: a dark coat with a breastplate in the worn armour's metal
  const tx = Q.lean;
  const torso = new Path2D();
  torso.moveTo(-5, -19 - bob);
  torso.bezierCurveTo(-6.8, -25, -6.8 + tx * 0.5, -33, -5.2 + tx, -38.5 - bob);
  torso.lineTo(5.6 + tx, -38.8 - bob);
  torso.bezierCurveTo(7.2 + tx, -33, 6.5, -25, 4.8, -19 - bob);
  torso.closePath();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.6;
  ctx.stroke(torso);
  const cg = ctx.createLinearGradient(-6, -38, 6, -19);
  cg.addColorStop(0, HC.coatL);
  cg.addColorStop(1, HC.coat);
  ctx.fillStyle = cg;
  ctx.fill(torso);
  const plate = new Path2D();
  plate.moveTo(-4.4 + tx, -37.8 - bob);
  plate.lineTo(5.4 + tx, -37.8 - bob);
  plate.bezierCurveTo(6.4 + tx * 0.6, -32, 5.6, -28, 0.8 + tx * 0.3, -24.8 - bob);
  plate.bezierCurveTo(-3.4, -27.5, -4.8, -31, -4.4 + tx, -37.8 - bob);
  plate.closePath();
  ctx.fillStyle = metalGrad(ctx, -4, -38, 6, -25);
  ctx.fill(plate);
  ctx.strokeStyle = trim;
  ctx.lineWidth = 1.1;
  ctx.stroke(plate);
  ctx.save();
  ctx.clip(plate);
  ctx.strokeStyle = 'rgba(255,255,255,.45)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-3.5 + tx, -36.5 - bob); ctx.quadraticCurveTo(0 + tx, -35 - bob, 4.5 + tx, -36.6 - bob); ctx.stroke();
  ctx.restore();
  if (L) motif(ctx, L.motif, 0.8 + tx * 0.6, -30.5 - bob, L.trim, L.metal[2]);
  const gx = 0.6 + tx, gy = L ? -35.2 - bob : -31.5 - bob;
  const gem = ctx.createRadialGradient(gx - 0.5, gy - 0.6, 0.3, gx, gy, 2.2);
  gem.addColorStop(0, '#ffffff');
  gem.addColorStop(0.45, gemC);
  gem.addColorStop(1, '#1a0a2a');
  ctx.fillStyle = gem;
  ctx.beginPath(); ctx.arc(gx, gy, L ? 1.7 : 2.2, 0, Math.PI * 2); ctx.fill();
  glowDot(ctx, gx, gy, 6, gemC, 0.35 + Math.sin(t * 3) * 0.1);
  // belt
  ctx.fillStyle = HC.belt;
  ctx.fillRect(-5.4, -22.5 - bob, 10.6, 2.4);
  ctx.fillStyle = metalGrad(ctx, 0, -23, 0, -20);
  ctx.fillRect(-0.6, -23 - bob, 3, 3.2);

  leg(1.5, ph, true);

  // head: pale, sharp-featured, with burning violet eyes
  const hc = [sh[0] + 1.6, -45.2 - bob];
  ctx.fillStyle = '#d9cfe6';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(sh[0] - 1, sh[1] - 1); ctx.lineTo(hc[0] - 1, hc[1] + 3); ctx.lineTo(hc[0] + 2, hc[1] + 3); ctx.lineTo(sh[0] + 3, sh[1] - 1); ctx.closePath(); ctx.stroke(); ctx.fill();

  // the dark halo, a broken crown of thorns and violet fire
  halo(ctx, hc[0] - 2.5, hc[1] - 8.5, t);

  // hair: long silver locks streaming back with speed and fall
  const locks = [];
  for (let i = 0; i < 6; i++) {
    const k = i / 5, rx = hc[0] - 1 - k * 2.5, ry = hc[1] - 4.5 + k * 6.5;
    const len = 13 + (i % 2) * 3 + run * 7 - k * 2, sweep = 0.75 + run * 0.4, droop = 0.65 - run * 0.4;
    const pts = [];
    for (let s = 0; s <= 5; s++) {
      const u = s / 5;
      pts.push([rx - u * len * sweep, ry + u * len * droop + Math.sin(t * 6 + i * 1.1 - u * 4) * u * 1.8 - u * len * fall * 0.7]);
    }
    locks.push(pts);
  }
  locks.forEach((l, i) => taper(ctx, l, 4.6, 1, i % 2 ? HC.hair2 : HC.hair));
  ctx.globalCompositeOperation = 'lighter';
  locks.forEach(l => taper(ctx, l.slice(3), 1.6, 0.6, HC.hairGlow));
  ctx.globalCompositeOperation = 'source-over';

  const face = new Path2D();
  face.moveTo(hc[0] - 4.6, hc[1] - 1);
  face.bezierCurveTo(hc[0] - 4.8, hc[1] - 6.4, hc[0] + 3.4, hc[1] - 7, hc[0] + 4.8, hc[1] - 2.2);
  face.lineTo(hc[0] + 5.6, hc[1] + 0.4);
  face.lineTo(hc[0] + 4.6, hc[1] + 1.2);
  face.bezierCurveTo(hc[0] + 4.4, hc[1] + 3.6, hc[0] + 2.2, hc[1] + 5.4, hc[0] + 0.6, hc[1] + 5.2);
  face.bezierCurveTo(hc[0] - 2.6, hc[1] + 4.6, hc[0] - 4.4, hc[1] + 2.6, hc[0] - 4.6, hc[1] - 1);
  face.closePath();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.2;
  ctx.stroke(face);
  const sk = ctx.createLinearGradient(hc[0] - 4, hc[1] - 6, hc[0] + 4, hc[1] + 5);
  sk.addColorStop(0, '#f4eefa');
  sk.addColorStop(1, '#b9abd0');
  ctx.fillStyle = sk;
  ctx.fill(face);
  // fringe over the brow
  ctx.fillStyle = HC.hair;
  ctx.strokeStyle = 'rgba(51,38,77,.6)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(hc[0] - 5, hc[1] - 0.5);
  ctx.bezierCurveTo(hc[0] - 5.4, hc[1] - 7.4, hc[0] + 3.6, hc[1] - 8.4, hc[0] + 5.2, hc[1] - 2.6);
  ctx.lineTo(hc[0] + 2.2, hc[1] - 3.6);
  ctx.lineTo(hc[0] + 1, hc[1] - 1.8);
  ctx.lineTo(hc[0] - 0.6, hc[1] - 3.8);
  ctx.lineTo(hc[0] - 2.6, hc[1] + 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // circlet in the armour's metal, with its gem
  ctx.strokeStyle = metalGrad(ctx, hc[0] - 4, hc[1] - 4, hc[0] + 4, hc[1] - 2);
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(hc[0] - 4.8, hc[1] - 2.2); ctx.quadraticCurveTo(hc[0], hc[1] - 5.6, hc[0] + 4.6, hc[1] - 3.4); ctx.stroke();
  ctx.fillStyle = gemC;
  ctx.beginPath(); ctx.moveTo(hc[0] + 2.6, hc[1] - 6.2); ctx.lineTo(hc[0] + 3.6, hc[1] - 4.4); ctx.lineTo(hc[0] + 2.6, hc[1] - 3.2); ctx.lineTo(hc[0] + 1.6, hc[1] - 4.4); ctx.closePath(); ctx.fill();
  // eye: a stern brow and a burning iris (closed for a blink now and then)
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(hc[0] + 0.6, hc[1] - 2); ctx.lineTo(hc[0] + 4.4, hc[1] - 1.2); ctx.stroke();
  if (t % 4.3 < 0.12) {
    ctx.beginPath(); ctx.moveTo(hc[0] + 1.2, hc[1] - 0.2); ctx.lineTo(hc[0] + 3.8, hc[1] + 0.2); ctx.stroke();
  } else {
    ctx.fillStyle = HC.socket;
    ctx.beginPath(); ctx.ellipse(hc[0] + 2.6, hc[1] - 0.1, 1.5, 1.1, 0.1, 0, Math.PI * 2); ctx.fill();
    eye(ctx, hc[0] + 2.9, hc[1] - 0.1, 0.85, HC.eye, '#ffffff', 3.2);
  }
  ctx.strokeStyle = 'rgba(80,50,110,.6)';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(hc[0] + 1.8, hc[1] + 3.4); ctx.lineTo(hc[0] + 3.6, hc[1] + 3.1); ctx.stroke();
  // the armour's plume streams back from the circlet
  if (L) {
    for (let i = 0; i < 3; i++) {
      const w = Math.sin(t * 7 + i * 1.3) * 1.2 - run * 1.5, lift = air ? clamp(-p.vy / 600, -1, 1) * 2 : 0;
      const pts = [[hc[0] - 1, hc[1] - 6], [hc[0] - 5 - i, hc[1] - 10 + i * 1.5 + w * 0.4 - lift], [hc[0] - 10 - i * 2 - run * 3, hc[1] - 11 + i * 2.4 + w - lift], [hc[0] - 16 - i * 2.5 - run * 6, hc[1] - 9 + i * 3 + w * 1.6 - lift * 1.5]];
      taper(ctx, pts, 3.8 - i * 0.7, 0.7, i === 1 ? L.trim : L.plume);
    }
  }

  // the near wing, over the back
  angelWing(ctx, wx, wy, 1.12 - spread * 0.12 - flap, 22 + spread * 17, spread, true, t);

  // pauldron, spiked when the armour is
  ctx.save();
  ctx.translate(sh[0] - 0.5, sh[1] + 1.5);
  ctx.rotate(-0.2);
  if (L && L.spikes) {
    ctx.fillStyle = metalGrad(ctx, 0, -9, 0, 0);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1;
    for (const x of [-3, 0.5, 4]) { ctx.beginPath(); ctx.moveTo(x - 1.6, -2.5); ctx.lineTo(x - 0.4, -8.5 + Math.abs(x) * 0.4); ctx.lineTo(x + 1.6, -2.5); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  }
  ctx.fillStyle = metalGrad(ctx, -5, -4, 5, 4);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.ellipse(0, 0, 6, 4, 0, Math.PI, Math.PI * 2.1); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = trim;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(0, 0.3, 5.4, 3.2, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  ctx.restore();

  // the weapon in the near hand (a lash is drawn apart, as a ribbon of fire)
  const W = wield(p);
  if (W.def.kind !== 'lash' && holy < 0.5) {
    let wa = null;
    if (p.whipT > 0) wa = p.whipAng - (1 - 2 * (1 - p.whipT / p.whipDur)) * (p.whipSide || 1) * Math.min(1.25, p.whipArc || 1.2);
    else if (p.aimT > 0 || p.beaming) wa = Math.atan2(p.ay, p.ax);
    ctx.save();
    ctx.translate(hand[0], hand[1]);
    ctx.rotate(wa == null ? REST[W.def.shape] : f > 0 ? wa : Math.PI - wa);
    drawArm(ctx, W.def, 1);
    ctx.restore();
  }

  // the near arm
  const el = [(sh[0] + hand[0]) / 2 - 1.5, (sh[1] + hand[1]) / 2 + 2.5];
  limb2(ctx, [[sh[0], sh[1] + 1], el, hand], 3.9, HC.arm);
  limb2(ctx, [el, hand], 3.4, METAL[1]);
  ctx.fillStyle = metalGrad(ctx, hand[0] - 2.5, hand[1] - 2.5, hand[0] + 2.5, hand[1] + 2.5);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.arc(hand[0], hand[1], 2.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  glowDot(ctx, hand[0], hand[1], 7, HC.spark, 0.35 + Math.sin(t * 5) * 0.1);
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
    const h = hornTip(p), ox = h.x, oy = h.y, ex = ox + p.ax * p.beamLen, ey = oy + p.ay * p.beamLen, RAINBOW = palOf(wield(p).def);
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
