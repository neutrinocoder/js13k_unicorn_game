// Game loop, world streaming, interactions, saving and screens.
import { G, SAVE_KEY, newSave } from './state.js';
import { T, CS, CPX, getChunk, biomeAt, BIOMES, BIOME_LIST, SITES, LANDMARKS } from './world.js';
import { initInput, endFrame, tapped, held, mouse, keys } from './input.js';
import { initAudio, sfx, setTheme, setMuted, muted } from './audio.js';
import { makePlayer, updatePlayer, updateBubbles } from './player.js';
import { makeEnemy, updateEnemy } from './enemies.js';
import { spawnBoss, updateBoss } from './bosses.js';
import { updateProjs, updatePickups, dropGems } from './combat.js';
import { updateFx, part, burst, ring, floater, shake } from './fx.js';
import { render, drawMap, mapToScreen, shrinePos } from './render.js';
import { stats } from './items.js';
import { rand, clamp, mix, pick, RAINBOW } from './util.js';
import { show, hide, isShown, toast as uiToast, openShop, closeShop, openDialog, advanceDialog } from './ui.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);

export const toast = uiToast;

// ---------- Setup ----------
function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  G.W = window.innerWidth;
  G.H = window.innerHeight;
  G.dpr = dpr;
  canvas.width = Math.floor(G.W * dpr);
  canvas.height = Math.floor(G.H * dpr);
  canvas.style.width = G.W + 'px';
  canvas.style.height = G.H + 'px';
  G.scale = Math.max(G.H / 720, G.W / 1600);
}
addEventListener('resize', resize);
resize();

function bgTarget(b) {
  const B = BIOMES[BIOME_LIST[b]];
  return { sky0: B.sky[0], sky1: B.sky[1], far: B.far, mid: B.mid, fog: B.fog, accent: B.accent, dark: B.dark };
}
G.bg = bgTarget(0);

// ---------- Save / load ----------
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && s.v === 1) {
      const base = newSave();
      return { ...base, ...s, up: { ...base.up, ...s.up }, stats: { ...base.stats, ...s.stats } };
    }
  } catch (e) {}
  return null;
}
export function saveGame() {
  if (!G.save || !G.player) return;
  G.save.hp = Math.max(1, G.player.hp);
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.save)); } catch (e) {}
}

function resetWorld() {
  G.chunks.clear();
  G.enemies.length = 0;
  G.projs.length = 0;
  G.parts.length = 0;
  G.pickups.length = 0;
  G.floaters.length = 0;
  G.effects.length = 0;
  G.bubbles.length = 0;
  G.boss = null;
  G.windForce = 0;
}

function startGame(save) {
  resetWorld();
  G.save = save;
  const sp = save.spawn;
  G.player = makePlayer(sp.x - 15, sp.y - 40);
  G.player.hp = clamp(save.hp || 5, 1, stats().maxHp);
  G.cam.x = G.player.x - G.W / G.scale / 2;
  G.cam.y = G.player.y - G.H / G.scale / 2;
  G.biome = biomeAt(Math.floor(G.player.x / T), Math.floor(G.player.y / T));
  G.bg = bgTarget(G.biome);
  G.scene = 'play';
  G.fade = 1;
  setTheme(BIOME_LIST[G.biome]);
  hide('title');
  announce(BIOMES[BIOME_LIST[G.biome]].name, BIOMES[BIOME_LIST[G.biome]].sub, 3);
  if (!save.autoHint) {
    save.autoHint = 1;
    setTimeout(() => { if (G.scene === 'play') toast('Tip: press V for auto-attack, or attack with J while moving.', 5000); }, 5000);
  }
}

// ---------- Announcements ----------
export function announce(title, sub, dur = 3) {
  G.announce = { title, sub, t: dur, dur };
}

// ---------- Objectives ----------
export const sealCount = () => (G.save ? SITES.slice(0, 4).filter(s => G.save.bosses[s.id]).length : 0);
const SEAL_COL = { cerberus: '#b6ff6b', storm: '#ff8ad8', heretic: '#ffb347', titan: '#a8ecff' };

export function objective() {
  const s = G.save, p = G.player;
  if (!s || !p) return null;
  if (!s.talked) return { tx: 8, ty: -1, label: 'Talk to Virgil', color: '#ffe14a' };
  if (s.bosses.hades) return null;
  if (sealCount() >= 4) return { tx: -32, ty: -2, label: 'The Gate', color: '#ff4a5a' };
  const ptx = p.x / T, pty = p.y / T;
  let best = null, bd = Infinity;
  for (const site of SITES.slice(0, 4)) {
    if (s.bosses[site.id]) continue;
    const d = Math.hypot(site.tx - ptx, site.ty - pty);
    if (d < bd) { bd = d; best = site; }
  }
  return best && { tx: best.tx, ty: best.ty, label: best.name, color: SEAL_COL[best.id] };
}

export function interactLabel(o) {
  const s = G.save;
  switch (o.type) {
    case 'chest': return s.chests[o.id] ? null : 'Open';
    case 'shrine': return s.shrines[o.id] ? (s.spawn.id === o.id ? 'Rest' : 'Bind to shrine') : 'Awaken shrine';
    case 'shop': return 'Trade';
    case 'npc': return 'Talk';
    case 'gate': return sealCount() >= 4 ? (s.bosses.hades ? 'The way is open' : 'Descend to Hades') : `Sealed  ${sealCount()}/4`;
    case 'fountain': return 'Drink';
    case 'portal': return s.bosses.hades ? 'Return to Limbo' : null;
  }
  return null;
}

function findNear() {
  const p = G.player, px = p.x + p.w / 2, py = p.y + p.h;
  const cx = Math.floor(px / CPX), cy = Math.floor(py / CPX);
  let best = null, bd = Infinity;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    for (const o of getChunk(cx + i, cy + j).objects) {
      if (!interactLabel(o)) continue;
      const rx = o.type === 'shop' && o.main ? 110 : o.type === 'gate' ? 110 : 46;
      const dx = Math.abs(o.x - px), dy = Math.abs(o.y - py);
      if (dx < rx && dy < 70 && dx < bd) { bd = dx; best = o; }
    }
  }
  return best;
}

// ---------- Interactions ----------
function virgilLines() {
  const s = G.save, n = sealCount();
  if (!s.talked) {
    return [
      'A unicorn of Olympus, down here in the dark? Then the stories are true: Hades has snared one of Zeus\'s own soldiers.',
      'I am Virgil. I have walked these circles before, and I will guide you as far as I can.',
      'Hades sealed the way out with four Seals. Each one is held by a Warden at the far end of a road.',
      'West, in Gluttony, Cerberus gnaws. East, Semiramis rides the storms of Lust. Above burns Farinata in Heresy. Below, Ephialtes lies frozen in Treachery.',
      'Bring all four Seals to the Gate beside this market and the road to Hades will open. Defeat him, and you go home.',
      'Gems spill from every fallen thing and every glittering stone. Charon will trade you anything for them. And wake the shrines you find: they remember you, and you may travel between them.',
      'The roads lead to the Wardens, but the caves around them hide the treasure. Your blast can even break rock. Go well, little star.',
    ];
  }
  if (s.bosses.hades) return ['You did it. The sky remembers you, and so do I.', 'The underworld is still yours to roam, if you wish. There is always more to find.'];
  if (n >= 4) return ['All four Seals! The Gate is listening. Step through it, and face Hades.'];
  const left = SITES.slice(0, 4).filter(x => !s.bosses[x.id]).map(x => x.name);
  const tips = [
    'Hold Jump while falling, once you own Pegasus Wings, to glide across chasms.',
    'Right-click fires your blast whatever weapon is selected. Blast downward to rocket upward.',
    'Bubbles trap nearby enemies; trapped enemies take extra damage. You can bounce on them too.',
    'Danger rises the further you travel from Limbo. So do the rewards.',
    'Lean on a wall while falling to slide, then jump to leap away from it.',
    'Press M to open your map, and click a shrine you have woken to travel there.',
  ];
  return [`${n} of 4 Seals. Still waiting: ${left.join(', ')}.`, pick(tips)];
}

function interact(o) {
  const s = G.save, p = G.player;
  switch (o.type) {
    case 'chest': {
      if (s.chests[o.id]) return;
      s.chests[o.id] = 1;
      const gems = Math.round((16 + o.level * 9) * (o.big ? 3 : 1) * rand(0.85, 1.2));
      dropGems(o.x, o.y - 20, gems);
      if (Math.random() < (o.big ? 0.8 : 0.22) && s.potions < 3) { s.potions++; floater(o.x, o.y - 50, '+1 Ambrosia', '#ffe28a', 18); }
      burst(o.x, o.y - 20, 30, ['#ffd34a', '#fff6c4', ...RAINBOW], 320, { add: true });
      ring(o.x, o.y - 20, 80, '#ffd34a');
      sfx('chest');
      saveGame();
      break;
    }
    case 'shrine': {
      s.shrines[o.id] = 1;
      s.spawn = { x: o.x, y: o.y, id: o.id };
      p.hp = stats().maxHp;
      sfx('shrine');
      ring(o.x, o.y - 70, 200, '#8fe8ff', 0.8, 8);
      burst(o.x, o.y - 70, 40, ['#8fe8ff', '#ffffff'], 300, { add: true, g: -60 });
      toast('Shrine bound. Health restored and progress saved.');
      saveGame();
      break;
    }
    case 'shop': openShop(o, saveGame); break;
    case 'npc': openDialog('Virgil', virgilLines(), () => { if (!s.talked) { s.talked = 1; saveGame(); toast('Follow the arrow on your minimap to a Warden.'); } }); break;
    case 'fountain':
      p.hp = stats().maxHp;
      sfx('heal');
      burst(p.x + p.w / 2, p.y, 20, RAINBOW, 160, { add: true, g: -100 });
      toast('The water of Lethe is sweet here. Health restored.');
      break;
    case 'gate':
      if (sealCount() < 4) { sfx('deny'); toast('The Gate needs four Seals. You have ' + sealCount() + '.'); return; }
      if (s.bosses.hades) { toast('Hades is defeated. The way home is open.'); return; }
      teleport((SITES[4].tx - 34) * T, (SITES[4].ty + SITES[4].h / 2) * T - 60);
      sfx('portal');
      break;
    case 'portal':
      teleport(18 * T, -60);
      sfx('portal');
      break;
  }
}

function teleport(x, y) {
  const p = G.player;
  burst(p.x + p.w / 2, p.y + p.h / 2, 30, RAINBOW, 300, { add: true });
  G.fade = 1.2;
  p.x = x - p.w / 2;
  p.y = y - p.h;
  p.vx = p.vy = 0;
  for (const t of p.tail) { t.x = t.px = p.x; t.y = t.py = p.y + 10; }
  G.enemies.length = 0;
  G.projs.length = 0;
  G.pickups.length = 0;
  G.boss = null;
  G.effects.length = 0;
  G.cam.x = p.x - G.W / G.scale / 2;
  G.cam.y = p.y - G.H / G.scale / 2;
}

// ---------- Death ----------
export function onPlayerDeath() {
  const p = G.player;
  p.dead = true;
  p.hp = 0;
  G.save.stats.deaths++;
  burst(p.x + p.w / 2, p.y + p.h / 2, 60, RAINBOW, 420, { add: true });
  shake(20);
  sfx('roar');
  G.windForce = 0;
  const toll = Math.floor(G.save.gems * 0.2);
  G.save.gems -= toll;
  setTimeout(() => {
    $('death-text').textContent = toll ? `Charon takes his toll: ${toll} gems. You wake at your shrine.` : 'You wake at your shrine.';
    G.scene = 'dead';
    show('death');
  }, 1300);
}

function respawn() {
  hide('death');
  const sp = G.save.spawn, p = G.player;
  G.boss = null;
  G.effects.length = 0;
  G.projs.length = 0;
  G.enemies = G.enemies.filter(e => !e.summoned);
  teleport(sp.x, sp.y - 6);
  p.dead = false;
  p.hp = stats().maxHp;
  p.inv = 2;
  G.scene = 'play';
  saveGame();
}

// ---------- Bosses ----------
export function onBossDefeated(b) {
  const s = G.save;
  s.bosses[b.id] = 1;
  setTheme(BIOME_LIST[G.biome]);
  if (b.id === 'hades') {
    s.won = 1;
    setTheme('victory');
    saveGame();
    setTimeout(() => {
      const st = s.stats;
      $('ending-text').innerHTML = `Hades falls, and his crown of blue fire gutters out. Far above, a crack of daylight opens in the rock, and through it you hear Olympus calling your name.<br><br>` +
        `<b>Time:</b> ${Math.floor(st.time / 60)} min · <b>Foes defeated:</b> ${st.kills} · <b>Gems found:</b> ${st.gemsEarned.toLocaleString()} · <b>Falls:</b> ${st.deaths}<br><br>` +
        `A portal has opened in the throne room. The underworld is still yours to explore.`;
      G.scene = 'ending';
      show('ending');
    }, 2200);
    return;
  }
  sfx('seal');
  announce('Seal of ' + BIOMES[b.site.biome].name, b.name + ' is defeated', 4);
  const n = sealCount();
  toast(n >= 4 ? 'All four Seals! Return to the Gate in Limbo Market.' : `${n} of 4 Seals claimed.`, 4000);
  G.player.hp = stats().maxHp;
  saveGame();
}

// ---------- Update ----------
let spawnT = 0, exploreT = 0, saveT = 0, ambT = 0, lastBiome = -1, lastBiomeT = 0;

function update(dt) {
  const p = G.player;
  G.save.stats.time += dt;
  updatePlayer(dt);
  for (const e of G.enemies) if (!e.dead) updateEnemy(e, dt);
  G.enemies = G.enemies.filter(e => !e.dead);
  updateBoss(dt);
  updateProjs(dt);
  updatePickups(dt);
  updateBubbles(dt);
  updateFx(dt);

  const ptx = Math.floor((p.x + p.w / 2) / T), pty = Math.floor((p.y + p.h / 2) / T);

  // Region changes
  const b = biomeAt(ptx, pty);
  if (b !== G.biome) {
    G.biome = b;
    if (b !== lastBiome && G.t - lastBiomeT > 4) {
      const B = BIOMES[BIOME_LIST[b]];
      announce(B.name, B.sub, 3.2);
      lastBiomeT = G.t;
    }
    lastBiome = b;
    if (!G.boss) setTheme(BIOME_LIST[b]);
  }
  // Blend background colours
  const tgt = bgTarget(G.biome), k = Math.min(1, dt * 1.2);
  const nearTown = Math.hypot(ptx, pty) < 70 ? 0.55 : 1;
  for (const key of ['sky0', 'sky1', 'far', 'mid', 'fog', 'accent']) G.bg[key] = mix(G.bg[key], tgt[key], k);
  G.bg.dark += (tgt.dark * nearTown - G.bg.dark) * k;

  // Wind gusts in Lust
  const B = BIOMES[BIOME_LIST[G.biome]];
  if (B.wind && !G.boss) {
    const g = Math.sin(G.t * 0.45);
    G.windForce = g > 0.55 ? Math.sign(Math.sin(G.t * 0.11) || 1) * 1100 * ((g - 0.55) / 0.45) : 0;
  } else if (!G.boss) G.windForce = 0;

  // Ambient particles
  ambT -= dt;
  if (ambT < 0) {
    ambT = 0.03;
    const vx0 = G.cam.x, vy0 = G.cam.y, vw = G.W / G.scale, vh = G.H / G.scale;
    const x = vx0 + rand(0, vw), y = vy0 + rand(0, vh);
    switch (B.part) {
      case 'mote': part({ x, y, vx: rand(-10, 10), vy: rand(-20, -5), life: 3, size: rand(1, 2.2), color: B.accent, add: true }); break;
      case 'petal': part({ x: x - 200, y: vy0 - 10, vx: rand(60, 140) + G.windForce * 0.3, vy: rand(30, 70), life: 6, size: rand(2, 3.5), color: pick(['#ff8ad8', '#ffd1f0', '#c45cff']), shape: 'petal', vr: rand(-3, 3) }); break;
      case 'rain': for (let i = 0; i < 2; i++) part({ x: vx0 + rand(0, vw), y: vy0 - 10, vx: -40, vy: 900, life: 1, size: 2.2, color: 'rgba(170,255,120,.55)', shape: 'streak' }); break;
      case 'ember': part({ x, y: vy0 + vh + 10, vx: rand(-20, 20), vy: rand(-120, -50), life: 4, size: rand(1.2, 2.6), color: pick(['#ffb347', '#ff6a1a', '#ffe36b']), add: true }); break;
      case 'snow': part({ x, y: vy0 - 10, vx: rand(-30, 10), vy: rand(40, 90), life: 8, size: rand(1.5, 3), color: '#eaf8ff' }); break;
    }
    if (G.windForce) part({ x: G.windForce > 0 ? vx0 : vx0 + vw, y: vy0 + rand(0, vh), vx: G.windForce * 0.9, vy: 0, life: 1.2, size: 2.5, color: 'rgba(255,200,240,.35)', shape: 'streak' });
  }

  // Exploration and spawning
  exploreT -= dt;
  if (exploreT < 0) {
    exploreT = 0.25;
    const pcx = Math.floor((p.x + p.w / 2) / CPX), pcy = Math.floor((p.y + p.h / 2) / CPX);
    for (let j = -1; j <= 1; j++) for (let i = -2; i <= 2; i++) G.save.explored[pcx + i + ',' + (pcy + j)] = 1;
  }
  spawnT -= dt;
  if (spawnT < 0) {
    spawnT = 0.4;
    const pcx = Math.floor((p.x + p.w / 2) / CPX), pcy = Math.floor((p.y + p.h / 2) / CPX), px = p.x + p.w / 2, py = p.y + p.h / 2;
    for (let j = -2; j <= 2; j++) for (let i = -3; i <= 3; i++) {
      for (const sp of getChunk(pcx + i, pcy + j).spawns) {
        if (sp.ent || G.t - sp.deadAt < 90 || G.enemies.length >= 45) continue;
        const d = Math.hypot(sp.x - px, sp.y - py);
        if (d < 560 || d > 1900) continue;
        const e = makeEnemy(sp.type, sp.x, sp.y, sp.level, sp.biome);
        e.spawn = sp;
        sp.ent = e;
        G.enemies.push(e);
      }
    }
    for (const e of G.enemies) {
      if (e.summoned) continue;
      if (Math.hypot(e.x - px, e.y - py) > 2600) { e.dead = true; if (e.spawn) e.spawn.ent = null; }
    }
  }

  // Boss arenas
  if (!G.boss && !p.dead) {
    for (const site of SITES) {
      if (G.save.bosses[site.id]) continue;
      if (Math.abs(ptx - site.tx) <= site.w / 2 - 3 && Math.abs(pty - site.ty) <= site.h / 2) { spawnBoss(site); break; }
    }
  }

  G.near = p.dead ? null : findNear();
  if (G.near && tapped('KeyE', 'Enter')) interact(G.near);

  saveT -= dt;
  if (saveT < 0) { saveT = 15; saveGame(); }

  // Camera
  const tx = p.x + p.w / 2 + p.vx * 0.25 - G.W / G.scale / 2, ty = p.y + p.h / 2 - 30 + Math.max(0, p.vy) * 0.12 - G.H / G.scale / 2;
  G.cam.x += (tx - G.cam.x) * Math.min(1, dt * 6);
  G.cam.y += (ty - G.cam.y) * Math.min(1, dt * 6);
}

// ---------- Main loop ----------
let last = null;
function frame(now) {
  requestAnimationFrame(frame);
  // Time only between animation frames, and never negative.
  if (last === null) last = now;
  const dt = clamp((now - last) / 1000, 0, 0.033);
  last = now;
  let frozen = false;
  try { frozen = step(dt); } catch (e) { console.error(e && e.stack ? e.stack : e); }
  // During a hit freeze-frame, keep this frame's presses so they act once play resumes.
  if (!frozen) endFrame();
}

function step(dt) {
  if (!G.save) G.save = newSave();
  G.t += dt;
  G.cam.shake = Math.max(0, G.cam.shake - dt * 40);
  G.flash = Math.max(0, G.flash - dt);
  G.fade = Math.max(0, G.fade - dt * 1.5);
  if (G.announce.t > 0) G.announce.t -= dt;

  let frozen = false;
  if (G.scene === 'play') {
    if (G.hitstop > 0) { G.hitstop -= dt; updateFx(dt * 0.2); frozen = true; }
    else update(dt);
  } else if (G.scene === 'title') {
    titleUpdate(dt);
  } else if (G.scene === 'dead' || G.scene === 'ending') {
    updateFx(dt);
  }

  ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  render(ctx);
  if (G.scene === 'map') drawMap(ctx);
  return frozen;
}

// A slow drift over Limbo Market behind the title screen.
function titleUpdate(dt) {
  if (!G.save) G.save = newSave();
  if (!G.player) {
    G.player = makePlayer(-4 * T, -34);
    G.player.ground = true;
  }
  const p = G.player;
  p.runPhase += dt * 4;
  G.cam.x = -G.W / G.scale / 2 + Math.sin(G.t * 0.08) * 500;
  G.cam.y = -G.H / G.scale / 2 - 160 + Math.sin(G.t * 0.11) * 60;
  if (Math.random() < 0.4) part({ x: G.cam.x + rand(0, G.W / G.scale), y: G.cam.y + rand(0, G.H / G.scale), vx: rand(-10, 10), vy: rand(-20, -5), life: 3, size: rand(1, 2.2), color: '#c9baff', add: true });
  updateFx(dt);
}

// ---------- Input wiring ----------
function onKey(code) {
  initAudio();
  if (code === 'KeyN') { setMuted(!muted); $('btn-mute').textContent = 'Sound: ' + (muted ? 'Off' : 'On'); toast(muted ? 'Sound off' : 'Sound on', 1200); return; }
  switch (G.scene) {
    case 'play':
      if (code === 'Escape' || code === 'KeyP') pause();
      else if (code === 'KeyM' || code === 'Tab') openMap();
      break;
    case 'map':
      if (code === 'Escape' || code === 'KeyM' || code === 'Tab') closeMap();
      break;
    case 'shop':
      if (code === 'Escape' || code === 'KeyE') closeShop();
      break;
    case 'dialog':
      if (code === 'KeyE' || code === 'Enter' || code === 'Space' || code === 'Escape') advanceDialog();
      break;
    case 'pause':
      if (code === 'Escape' || code === 'KeyP') resume();
      break;
    case 'dead':
      if (code === 'Enter' || code === 'Space') respawn();
      break;
  }
}

function pause() { G.scene = 'pause'; show('pause'); saveGame(); }
function resume() { hide('pause'); hide('controls'); G.scene = 'play'; }

function openMap() {
  const p = G.player;
  G.map.x = (p.x + p.w / 2) / T;
  G.map.y = (p.y + p.h / 2) / T;
  G.scene = 'map';
  sfx('ui');
}
function closeMap() { G.scene = 'play'; }

canvas.addEventListener('pointerdown', e => {
  initAudio();
  if (G.scene !== 'map') return;
  const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  // shrine travel
  if (!G.boss) {
    for (const id in G.save.shrines) {
      const s = shrinePos(id);
      if (!s) continue;
      const [sx, sy] = mapToScreen(s.x / T, s.y / T - 1);
      if (Math.hypot(sx - x, sy - y) < 12) {
        closeMap();
        teleport(s.x, s.y - 6);
        sfx('portal');
        toast('Travelled to ' + (s.name || 'shrine') + '.');
        return;
      }
    }
  }
  G.map.drag = { x, y, mx: G.map.x, my: G.map.y };
});
canvas.addEventListener('pointermove', e => {
  const r = canvas.getBoundingClientRect();
  G.mouseX = e.clientX - r.left;
  G.mouseY = e.clientY - r.top;
  if (G.scene === 'map' && G.map.drag && e.buttons) {
    G.map.x = G.map.drag.mx - (G.mouseX - G.map.drag.x) / G.map.zoom;
    G.map.y = G.map.drag.my - (G.mouseY - G.map.drag.y) / G.map.zoom;
  }
});
addEventListener('pointerup', () => { G.map.drag = null; });
canvas.addEventListener('wheel', e => {
  if (G.scene !== 'map') return;
  G.map.zoom = clamp(G.map.zoom * (e.deltaY > 0 ? 0.85 : 1.18), 0.25, 8);
});

$('dialog').addEventListener('click', () => advanceDialog());
$('shop').querySelector('[data-close]').onclick = () => closeShop();
let confirmNew = 0;
$('btn-new').onclick = () => {
  initAudio();
  if (loadSave() && performance.now() - confirmNew > 3000) {
    confirmNew = performance.now();
    $('btn-new').textContent = 'Click again to overwrite your save';
    setTimeout(() => { $('btn-new').textContent = 'New Journey'; }, 3000);
    return;
  }
  sfx('ui');
  hide('title');
  $('story-text').innerHTML = 'You are one of Zeus\'s divine soldiers, a unicorn of Olympus. Hades dragged you down into the underworld and sealed the way home behind you.<br><br>The circles of Hell stretch out in every direction: storms to the east, endless rain to the west, burning tombs above and frozen ice below.<br><br>Find the four Seals. Open the Gate. Ascend.<br><br><i>“Through me the way into the suffering city.”</i> — Dante, <i>Inferno</i>';
  show('story');
  G.scene = 'story';
};
$('btn-story').onclick = () => {
  hide('story');
  G.player = null;
  startGame(newSave());
};
$('btn-continue').onclick = () => {
  initAudio();
  const s = loadSave();
  if (!s) return;
  G.player = null;
  startGame(s);
};
const openControls = () => { show('controls'); sfx('ui'); };
$('btn-controls').onclick = openControls;
$('btn-pause-controls').onclick = openControls;
document.querySelectorAll('#controls [data-close]').forEach(b => (b.onclick = () => hide('controls')));
$('btn-resume').onclick = resume;
$('btn-pause-map').onclick = () => { hide('pause'); openMap(); };
$('btn-mute').onclick = () => { setMuted(!muted); $('btn-mute').textContent = 'Sound: ' + (muted ? 'Off' : 'On'); };
$('btn-mute').textContent = 'Sound: ' + (muted ? 'Off' : 'On');
$('btn-quit').onclick = () => {
  saveGame();
  hide('pause');
  G.scene = 'title';
  G.player = null;
  G.save = null;
  resetWorld();
  setTheme('title');
  refreshTitle();
  show('title');
};
$('btn-respawn').onclick = respawn;
$('btn-ending').onclick = () => { hide('ending'); G.scene = 'play'; setTheme(BIOME_LIST[G.biome]); };

function refreshTitle() {
  const s = loadSave();
  $('btn-continue').style.display = s ? '' : 'none';
  if (s) $('btn-continue').textContent = `Continue  ·  ${SITES.slice(0, 4).filter(x => s.bosses[x.id]).length}/4 Seals`;
}

initInput(canvas, onKey);
refreshTitle();
document.addEventListener('pointerdown', () => initAudio(), { once: true });
setTheme('title');
requestAnimationFrame(frame);
addEventListener('beforeunload', saveGame);
