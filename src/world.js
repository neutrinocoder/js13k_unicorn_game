// Endless chunked world: regions in every direction, roads to four boss arenas, and a town at the centre.
import { hash2, vnoise, fbm, mulberry, clamp, mix, shade } from './util.js';
import { G } from './state.js';

export const T = 32, CS = 16, CPX = T * CS;
export const AIR = 0, ROCK = 1, PLAT = 2, HAZ = 3, BRICK = 4, CRYSTAL = 5, ORE = 6, HAZC = 7;
export const isSolid = t => t === ROCK || t === BRICK || t === CRYSTAL || t === ORE;

export const BIOME_LIST = ['limbo', 'lust', 'gluttony', 'heresy', 'treachery', 'abyss'];
export const BIOMES = {
  limbo: {
    name: 'Limbo', sub: 'The First Circle', rock: ['#433c5e', '#5d5484', '#231e36'], top: '#b4a6ee',
    sky: ['#0d0a1c', '#2b2348'], far: '#251e3d', mid: '#1a152d', fog: '#6a58b0', dark: 0.6, accent: '#c9baff',
    haz: 'spikes', part: 'mote', thr: 0.483, tint: '#8a6bd6', enemies: { imp: 3, spider: 3, bat: 2, wisp: 2, spitter: 1, brute: 1 },
  },
  lust: {
    name: 'Lust', sub: 'The Circle of Endless Storms', rock: ['#4d2246', '#713063', '#26102a'], top: '#ff8ad8',
    sky: ['#1c0620', '#5c1550'], far: '#3d0f3a', mid: '#280a27', fog: '#c0388f', dark: 0.55, accent: '#ff8ad8',
    haz: 'thorns', part: 'petal', thr: 0.495, tint: '#e0479e', wind: 1, enemies: { bat: 4, wisp: 3, spider: 2, imp: 2, brute: 1 },
  },
  gluttony: {
    name: 'Gluttony', sub: 'The Circle of Ceaseless Rain', rock: ['#34412b', '#4c5e38', '#182013'], top: '#a6e36b',
    sky: ['#081008', '#213a1c'], far: '#18291a', mid: '#0f1b0f', fog: '#4f8a35', dark: 0.64, accent: '#b6ff6b',
    haz: 'acid', part: 'rain', thr: 0.462, tint: '#6fae3a', enemies: { spider: 4, imp: 3, spitter: 3, brute: 2, bat: 1 },
  },
  heresy: {
    name: 'Heresy', sub: 'The Circle of Burning Tombs', rock: ['#552517', '#7a3820', '#2a0f08'], top: '#ffae4a',
    sky: ['#1a0402', '#6a1a06'], far: '#3a0c05', mid: '#250703', fog: '#c2481a', dark: 0.48, accent: '#ffb347',
    haz: 'lava', part: 'ember', thr: 0.524, tint: '#ff5a1f', enemies: { imp: 4, spitter: 3, wisp: 3, spider: 2, brute: 2 },
  },
  treachery: {
    name: 'Treachery', sub: 'The Frozen Lake of Cocytus', rock: ['#2c3e5c', '#47638c', '#141f35'], top: '#e6f8ff',
    sky: ['#050b18', '#1a3358'], far: '#132744', mid: '#0b182c', fog: '#5a86c0', dark: 0.58, accent: '#a8ecff',
    haz: 'icicle', part: 'snow', thr: 0.47, tint: '#6fc6ff', ice: 1, enemies: { spider: 3, wisp: 3, brute: 3, bat: 2, imp: 1 },
  },
  abyss: {
    name: 'The Throne of Hades', sub: 'Where the Rivers End', rock: ['#2c0c12', '#4a151c', '#12040a'], top: '#ff3b4a',
    sky: ['#050002', '#2a0408'], far: '#1a0306', mid: '#100204', fog: '#a0102a', dark: 0.5, accent: '#ff4a5a',
    haz: 'lava', part: 'ember', thr: 0.5, tint: '#ff2a3a', enemies: {},
  },
};

export const SITES = [
  { id: 'cerberus', name: 'Cerberus', title: 'The Great Worm of Gluttony', biome: 'gluttony', tx: -430, ty: 0, w: 76, h: 30, hp: 170 },
  { id: 'storm', name: 'Semiramis', title: 'Queen of the Endless Storm', biome: 'lust', tx: 430, ty: 0, w: 76, h: 30, hp: 160 },
  { id: 'heretic', name: 'Farinata', title: 'The Burning Tomb', biome: 'heresy', tx: 0, ty: -430, w: 76, h: 30, hp: 185 },
  { id: 'titan', name: 'Ephialtes', title: 'The Giant in the Ice', biome: 'treachery', tx: 0, ty: 430, w: 76, h: 30, hp: 210 },
  { id: 'hades', name: 'Hades', title: 'Lord of the Dead', biome: 'abyss', tx: 0, ty: 3000, w: 84, h: 36, hp: 480 },
];
const HS = SITES[4];
export const OUTPOST_D = 220;
const inRect = (tx, ty, s, pad) => Math.abs(tx - s.tx) <= s.w / 2 + pad && Math.abs(ty - s.ty) <= s.h / 2 + pad;
export const siteAt = (tx, ty, pad = 0) => SITES.find(s => inRect(tx, ty, s, pad));

export const roadH = tx => Math.round((vnoise(tx * 0.018, 0, 77) - 0.5) * 26) - 3;
export function roadV(ty) {
  if (ty < 0) return Math.round((vnoise(0, ty * 0.018, 91) - 0.5) * 22 * clamp((-ty - 30) / 40, 0, 1));
  return 32 + Math.round((vnoise(0, ty * 0.018, 93) - 0.5) * 22 * clamp((ty - 14) / 40, 0, 1));
}

// undefined = not a road. -1 = bridge (platform if the cave is open there).
export function roadTile(tx, ty) {
  const ax = Math.abs(tx);
  if (ax > 48 && ax <= 430) {
    const c = roadH(tx);
    if (ty >= c - 2 && ty <= c + 2) return AIR;
    if (ty === c + 3) return -1;
  }
  if ((ty < -40 && ty >= -430) || (ty > 14 && ty <= 430)) {
    const c = roadV(ty);
    if (tx >= c - 3 && tx <= c + 2) {
      if (Math.abs(ty) === OUTPOST_D) return PLAT;
      if (ty % 4 === 0) return ((Math.floor(ty / 4) & 1) ? tx < c : tx >= c) ? PLAT : AIR;
      return AIR;
    }
  }
  return undefined;
}

export function biomeAt(tx, ty) {
  if (Math.abs(tx - HS.tx) < 140 && Math.abs(ty - HS.ty) < 110) return 5;
  for (let i = 0; i < 4; i++) {
    const s = SITES[i];
    if (inRect(tx, ty, s, 6)) return BIOME_LIST.indexOf(s.biome);
  }
  const d = Math.hypot(tx, ty), j = vnoise(tx * 0.02, ty * 0.02, 3) - 0.5;
  if (d < 100 + j * 40) return 0;
  const a = Math.atan2(ty, tx) + j * 0.7, q = Math.PI / 4;
  if (a > -q && a <= q) return 1;
  if (a > q && a <= 3 * q) return 4;
  if (a > -3 * q && a <= -q) return 3;
  return 2;
}

export const levelAt = (tx, ty) => 1 + Math.floor(Math.hypot(tx, ty) / 55);

function arenaInner(s, dx, dy) {
  const hw = s.w / 2, hh = s.h / 2, ax = Math.abs(dx);
  if (dy === hh - 6 && ax >= hw - 24 && ax <= hw - 11) return PLAT;
  if (dy === hh - 12 && ax <= 9) return PLAT;
  if (dy === hh - 18 && ax >= hw - 30 && ax <= hw - 18) return PLAT;
  return AIR;
}

function arenaTile(s, tx, ty) {
  const dx = tx - s.tx, dy = ty - s.ty, hh = s.h / 2;
  if (Math.abs(dx) <= s.w / 2 && Math.abs(dy) <= hh) return arenaInner(s, dx, dy);
  if (s !== HS) {
    const r = roadTile(tx, ty);
    if (r !== undefined && r !== -1) return dy > hh ? (dy === hh + 1 ? PLAT : AIR) : AIR;
  }
  return BRICK;
}

function townTile(tx, ty) {
  if (ty < 0) {
    if (ty <= -4 && ty % 4 === 0) {
      const cx = (-ty / 4) & 1 ? 6 : -5;
      if (Math.abs(tx - cx) <= 3) return PLAT;
    }
    return AIR;
  }
  if (tx >= 29 && tx <= 34) {
    if (ty > 0 && ty % 4 === 0) return ((Math.floor(ty / 4) & 1) ? tx < 32 : tx >= 32) ? PLAT : AIR;
    return AIR;
  }
  return ty <= 1 ? BRICK : ROCK;
}

function caveTile(tx, ty) {
  const B = BIOMES[BIOME_LIST[biomeAt(tx, ty)]];
  let n = fbm(tx * 0.034, ty * 0.05, 11, 4) + (vnoise(tx * 0.15, ty * 0.15, 23) - 0.5) * 0.14;
  n -= Math.max(0, vnoise(tx * 0.009, ty * 0.009, 99) - 0.62) * 1.1;
  return n > B.thr ? ROCK : AIR;
}

export function baseTile(tx, ty) {
  if (Math.abs(tx - HS.tx) <= HS.w / 2 + 40 && Math.abs(ty - HS.ty) <= HS.h / 2 + 40) {
    return inRect(tx, ty, HS, 4) ? arenaTile(HS, tx, ty) : ROCK;
  }
  for (let i = 0; i < 4; i++) if (inRect(tx, ty, SITES[i], 4)) return arenaTile(SITES[i], tx, ty);
  if (tx >= -48 && tx <= 48 && ty >= -40 && ty <= 14) return townTile(tx, ty);
  const r = roadTile(tx, ty);
  if (r !== undefined) return r === -1 ? (caveTile(tx, ty) === AIR ? PLAT : ROCK) : r;
  return caveTile(tx, ty);
}

// Places where hazards, ore and random enemies should not appear.
export function isSpecial(tx, ty) {
  if (tx >= -52 && tx <= 52 && ty >= -44 && ty <= 18) return true;
  if (Math.abs(tx - HS.tx) <= HS.w / 2 + 42 && Math.abs(ty - HS.ty) <= HS.h / 2 + 42) return true;
  for (let i = 0; i < 4; i++) if (inRect(tx, ty, SITES[i], 7)) return true;
  return roadTile(tx, ty) !== undefined || roadTile(tx, ty - 1) !== undefined || roadTile(tx, ty + 1) !== undefined ||
    roadTile(tx - 1, ty) !== undefined || roadTile(tx + 1, ty) !== undefined;
}

// ---------- Landmarks ----------
export const LANDMARKS = [
  { type: 'gate', id: 'gate', tx: -32, ty: 0 },
  { type: 'shop', id: 'shop_town', tx: -15, ty: 0, name: "Charon's Emporium", main: 1 },
  { type: 'fountain', id: 'fountain', tx: -3, ty: 0 },
  { type: 'npc', id: 'virgil', tx: 8, ty: 0 },
  { type: 'shrine', id: 'town', tx: 18, ty: 0, name: 'Limbo Market' },
  { type: 'sign', id: 'sign_s', tx: 27, ty: 0, text: 'Treachery  ↓' },
  { type: 'sign', id: 'sign_e', tx: 44, ty: 0, text: 'Lust  →' },
  { type: 'sign', id: 'sign_w', tx: -44, ty: 0, text: '←  Gluttony' },
  { type: 'sign', id: 'sign_n', tx: -9, ty: 0, text: 'Heresy  ↑' },
];
for (const [dx, dy, b] of [[1, 0, 'lust'], [-1, 0, 'gluttony'], [0, -1, 'heresy'], [0, 1, 'treachery']]) {
  let tx, ty;
  if (dx) { tx = dx * OUTPOST_D; ty = roadH(tx) + 3; } else { ty = dy * OUTPOST_D; tx = roadV(ty); }
  const name = BIOMES[b].name + ' Outpost';
  const sx = tx - (dx ? 3 : 2), mx = tx + (dx ? 3 : 1);
  LANDMARKS.push({ type: 'shrine', id: 'out_' + b, tx: sx, ty: dx ? roadH(sx) + 3 : ty, name });
  LANDMARKS.push({ type: 'shop', id: 'shop_' + b, tx: mx, ty: dx ? roadH(mx) + 3 : ty, name: 'Wandering Merchant' });
}
LANDMARKS.push({ type: 'portal', id: 'portal_home', tx: HS.tx, ty: HS.ty + HS.h / 2 + 1, hidden: 1 });
for (const l of LANDMARKS) { l.x = (l.tx + 0.5) * T; l.y = l.ty * T; }

// ---------- Chunks ----------
let lastKey = '', lastChunk = null;
export function getChunk(cx, cy) {
  const k = cx + ',' + cy;
  if (k === lastKey) return lastChunk;
  let c = G.chunks.get(k);
  if (!c) { c = genChunk(cx, cy, k); G.chunks.set(k, c); }
  lastKey = k;
  lastChunk = c;
  return c;
}
export function tileAt(tx, ty) {
  const cx = Math.floor(tx / CS), cy = Math.floor(ty / CS);
  return getChunk(cx, cy).tiles[(ty - cy * CS) * CS + (tx - cx * CS)];
}
export const tileAtPx = (x, y) => tileAt(Math.floor(x / T), Math.floor(y / T));

export function setTile(tx, ty, t) {
  const cx = Math.floor(tx / CS), cy = Math.floor(ty / CS), c = getChunk(cx, cy);
  const idx = (ty - cy * CS) * CS + (tx - cx * CS);
  c.tiles[idx] = t;
  c.dirty = true;
  c.mini = null;
  const m = G.save.mods[c.k] || (G.save.mods[c.k] = []);
  if (!m.includes(idx)) m.push(idx);
  for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const n = G.chunks.get(Math.floor((tx + ox) / CS) + ',' + Math.floor((ty + oy) / CS));
    if (n && n !== c) n.dirty = true;
  }
}

function weightedPick(rng, weights) {
  let total = 0;
  for (const k in weights) total += weights[k];
  let r = rng() * total;
  for (const k in weights) { r -= weights[k]; if (r <= 0) return k; }
  return Object.keys(weights)[0];
}

function genChunk(cx, cy, k) {
  const S = CS + 4, raw = new Uint8Array(S * S), x0 = cx * CS - 2, y0 = cy * CS - 2;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) raw[j * S + i] = baseTile(x0 + i, y0 + j);
  const at = (i, j) => raw[(j + 2) * S + (i + 2)];
  const tiles = new Uint8Array(CS * CS), bio = new Uint8Array(CS * CS), spec = new Uint8Array(CS * CS);
  for (let j = 0; j < CS; j++) {
    for (let i = 0; i < CS; i++) {
      const tx = cx * CS + i, ty = cy * CS + j, b = biomeAt(tx, ty), B = BIOMES[BIOME_LIST[b]];
      let t = at(i, j);
      const sp = isSpecial(tx, ty);
      spec[j * CS + i] = sp ? 1 : 0;
      bio[j * CS + i] = b;
      if (!sp) {
        const h = hash2(tx, ty, 7);
        if (t === ROCK) {
          if (at(i - 1, j) === AIR || at(i + 1, j) === AIR || at(i, j - 1) === AIR || at(i, j + 1) === AIR) {
            if (h < 0.016) t = ORE; else if (h < 0.023) t = CRYSTAL;
          }
        } else if (t === AIR) {
          const below = at(i, j + 1), above = at(i, j - 1);
          const pool = B.haz === 'lava' || B.haz === 'acid';
          if (isSolid(below) && below !== CRYSTAL && vnoise(tx * 0.22, ty * 1.3, 13) > (pool ? 0.74 : 0.8)) t = HAZ;
          else if (B.haz === 'icicle' && isSolid(above) && h > 0.94) t = HAZC;
          else if (((ty % 6) + 6) % 6 === 0 && vnoise(tx * 0.25, ty * 0.5, 41) > 0.66 && below === AIR && above === AIR && at(i, j + 2) === AIR) t = PLAT;
        }
      }
      tiles[j * CS + i] = t;
    }
  }
  const mods = G.save && G.save.mods[k];
  if (mods) for (const idx of mods) tiles[idx] = AIR;

  const c = { k, cx, cy, tiles, bio, canvas: null, dirty: true, lights: [], liquids: [], objects: [], spawns: [], mini: null, used: 0 };
  // Landmarks
  for (const l of LANDMARKS) if (Math.floor(l.tx / CS) === cx && Math.floor((l.ty - 1) / CS) === cy) c.objects.push(l);

  // Random content
  const rng = mulberry(Math.floor(hash2(cx, cy, 99) * 2 ** 31));
  const get = (i, j) => (i >= 0 && i < CS && j >= 0 && j < CS ? tiles[j * CS + i] : at(i, j));
  const floor = [], air = [], ceil = [];
  for (let j = 1; j < CS; j++) for (let i = 1; i < CS - 1; i++) {
    const t = get(i, j), below = get(i, j + 1);
    if (t !== AIR || spec[j * CS + i]) continue;
    if ((isSolid(below) || below === PLAT) && get(i, j - 1) === AIR && get(i - 1, j) !== HAZ && get(i + 1, j) !== HAZ) floor.push([i, j]);
    else if (get(i, j - 1) === AIR && below === AIR && get(i - 1, j) === AIR && get(i + 1, j) === AIR) air.push([i, j]);
    if (isSolid(get(i, j - 1)) && below === AIR && get(i, j + 2) === AIR) ceil.push([i, j]);
  }
  const tcx = cx * CS + 8, tcy = cy * CS + 8, dist = Math.hypot(tcx, tcy), lvl = levelAt(tcx, tcy);
  const bi = bio[8 * CS + 8], B = BIOMES[BIOME_LIST[bi]];
  const take = list => (list.length ? list.splice(Math.floor(rng() * list.length), 1)[0] : null);
  const place = (spot, o) => {
    o.x = (cx * CS + spot[0] + 0.5) * T;
    o.y = (cy * CS + spot[1] + 1) * T;
    c.objects.push(o);
    return o;
  };
  if (bi !== 5 && dist > 40) {
    if (rng() < 0.2) { const s = take(floor); if (s) place(s, { type: 'chest', id: k + ':c', level: lvl, big: rng() < 0.15 }); }
    if (rng() < 0.035) { const s = take(floor); if (s) place(s, { type: 'shrine', id: k + ':s', name: B.name + ' Shrine' }); }
    if (rng() < 0.4) { const s = take(floor); if (s) place(s, { type: 'torch', id: k + ':t' }); }
    if (dist > 60) {
      const n = rng() < 0.65 ? 1 + Math.floor(rng() * 1.7) : 0;
      for (let q = 0; q < n; q++) {
        const type = weightedPick(rng, B.enemies);
        const fly = type === 'bat' || type === 'wisp';
        const hang = type === 'spider' && ceil.length && rng() < 0.75;
        const s = take(hang ? ceil : fly ? (air.length ? air : floor) : floor);
        if (!s) continue;
        c.spawns.push({ type, x: (cx * CS + s[0] + 0.5) * T, y: (cy * CS + s[1] + (hang ? 0 : 1)) * T, hang: !!hang, level: lvl, biome: bi, ent: null, deadAt: -999 });
      }
    }
  }
  return c;
}

// ---------- Chunk rendering ----------
let canvasCount = 0;
export function chunkCanvas(c) {
  c.used = G.t;
  if (c.canvas && !c.dirty) return c.canvas;
  if (!c.canvas) {
    if (canvasCount > 90) evict();
    c.canvas = document.createElement('canvas');
    c.canvas.width = c.canvas.height = CPX;
    canvasCount++;
  }
  renderChunk(c);
  return c.canvas;
}
function evict() {
  const list = [...G.chunks.values()].filter(c => c.canvas).sort((a, b) => a.used - b.used);
  for (let i = 0; i < 30 && i < list.length; i++) { list[i].canvas = null; list[i].dirty = true; canvasCount--; }
}

const TOWN_BRICK = ['#4d4566', '#5f567d', '#2e2942'];

function renderChunk(c) {
  const x = c.canvas.getContext('2d');
  x.clearRect(0, 0, CPX, CPX);
  c.lights = [];
  c.liquids = [];
  const get = (i, j) => (i >= 0 && i < CS && j >= 0 && j < CS ? c.tiles[j * CS + i] : tileAt(c.cx * CS + i, c.cy * CS + j));
  for (let j = 0; j < CS; j++) {
    for (let i = 0; i < CS; i++) {
      const t = c.tiles[j * CS + i];
      if (t === AIR) continue;
      const tx = c.cx * CS + i, ty = c.cy * CS + j, B = BIOMES[BIOME_LIST[c.bio[j * CS + i]]];
      const px = i * T, py = j * T, h = hash2(tx, ty, 3), h2 = hash2(tx, ty, 4);
      if (isSolid(t)) {
        const up = !isSolid(get(i, j - 1)), dn = !isSolid(get(i, j + 1)), lf = !isSolid(get(i - 1, j)), rt = !isSolid(get(i + 1, j));
        const edge = up || dn || lf || rt;
        const deep = !edge && isSolid(get(i - 1, j - 1)) && isSolid(get(i + 1, j - 1)) && isSolid(get(i - 1, j + 1)) && isSolid(get(i + 1, j + 1)) &&
          isSolid(get(i, j - 2)) && isSolid(get(i, j + 2)) && isSolid(get(i - 2, j)) && isSolid(get(i + 2, j));
        const pal = t === BRICK ? (c.bio[j * CS + i] === 0 ? TOWN_BRICK : [shade(B.rock[0], -0.1), B.rock[1], B.rock[2]]) : B.rock;
        let col = deep ? pal[2] : edge ? pal[1] : mix(pal[0], pal[2], 0.35);
        x.fillStyle = shade(col, (h - 0.5) * 0.14);
        x.fillRect(px, py, T, T);
        if (t === BRICK) {
          x.fillStyle = 'rgba(0,0,0,.28)';
          const off = (ty & 1) * 16;
          x.fillRect(px, py + 15, T, 2);
          x.fillRect(px + ((off + 8) % 32), py, 2, 15);
          x.fillRect(px + ((off + 24) % 32), py + 17, 2, 15);
          x.fillStyle = 'rgba(255,255,255,.06)';
          x.fillRect(px, py, T, 2);
        } else if (!deep) {
          x.fillStyle = 'rgba(0,0,0,.18)';
          x.fillRect(px + Math.floor(h * 22), py + Math.floor(h2 * 22), 6, 4);
          x.fillRect(px + Math.floor(h2 * 26), py + Math.floor(h * 26), 4, 3);
          x.fillStyle = 'rgba(255,255,255,.07)';
          x.fillRect(px + Math.floor(h * 28), py + Math.floor((1 - h2) * 26), 3, 2);
          if (h > 0.7) {
            x.strokeStyle = 'rgba(0,0,0,.22)';
            x.lineWidth = 1;
            x.beginPath();
            x.moveTo(px + h * 30, py + 2);
            x.lineTo(px + h2 * 20 + 6, py + 16);
            x.lineTo(px + h * 18 + 4, py + 30);
            x.stroke();
          }
        }
        // rounded outer corners
        const R = 9;
        x.save();
        x.globalCompositeOperation = 'destination-out';
        x.beginPath();
        if (up && lf) { x.moveTo(px, py); x.lineTo(px + R, py); x.arc(px + R, py + R, R, -Math.PI / 2, Math.PI, true); x.closePath(); }
        if (up && rt) { x.moveTo(px + T, py); x.lineTo(px + T, py + R); x.arc(px + T - R, py + R, R, 0, -Math.PI / 2, true); x.closePath(); }
        if (dn && lf) { x.moveTo(px, py + T); x.lineTo(px, py + T - R); x.arc(px + R, py + T - R, R, Math.PI, Math.PI / 2, true); x.closePath(); }
        if (dn && rt) { x.moveTo(px + T, py + T); x.lineTo(px + T - R, py + T); x.arc(px + T - R, py + T - R, R, Math.PI / 2, 0, true); x.closePath(); }
        x.fill();
        x.restore();
        if (lf) { x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(px, py + (up ? R : 0), 2, T - (up ? R : 0) - (dn ? R : 0)); }
        if (rt) { x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(px + T - 3, py + (up ? R : 0), 3, T - (up ? R : 0) - (dn ? R : 0)); }
        if (dn) {
          x.fillStyle = 'rgba(0,0,0,.35)';
          x.fillRect(px + (lf ? R : 0), py + T - 4, T - (lf ? R : 0) - (rt ? R : 0), 4);
          if (h2 > 0.72 && t !== BRICK) {
            x.fillStyle = pal[1];
            x.beginPath();
            x.moveTo(px + 8 + h * 10, py + T);
            x.lineTo(px + 12 + h * 10, py + T + 7 + h2 * 8);
            x.lineTo(px + 16 + h * 10, py + T);
            x.fill();
          }
        }
        if (up) drawSurface(x, B, px, py, h, h2, lf, rt, t === BRICK);
        if (t === ORE) drawOre(x, px, py, h, h2);
        if (t === CRYSTAL) {
          drawCrystal(x, B.accent, px, py, h, up, dn);
          c.lights.push({ x: tx * T + 16, y: ty * T + 16, r: 120, c: B.accent, a: 0.5 });
        }
      } else if (t === PLAT) {
        drawPlat(x, B, px, py, h, get(i - 1, j) !== PLAT, get(i + 1, j) !== PLAT, c.bio[j * CS + i] === 0);
      } else if (t === HAZ) {
        if (B.haz === 'lava' || B.haz === 'acid') {
          // Liquids are animated every frame instead of baked into the chunk image.
          const last = c.liquids[c.liquids.length - 1];
          if (last && last.ty === ty && last.tx1 === tx - 1 && last.kind === B.haz) last.tx1 = tx;
          else c.liquids.push({ tx0: tx, tx1: tx, ty, kind: B.haz });
          if (B.haz === 'lava') c.lights.push({ x: tx * T + 16, y: ty * T + 22, r: 120, c: '#ff6a1a', a: 0.6, flick: 1 });
          else c.lights.push({ x: tx * T + 16, y: ty * T + 22, r: 90, c: '#8dff4a', a: 0.45, flick: 1 });
        } else drawHaz(x, B, px, py, h, h2);
      } else if (t === HAZC) {
        drawIcicles(x, px, py, h);
      }
    }
  }
  for (const L of c.liquids) {
    L.capL = tileAt(L.tx0 - 1, L.ty) !== HAZ;
    L.capR = tileAt(L.tx1 + 1, L.ty) !== HAZ;
  }
  c.dirty = false;
}

// ---------- Animated liquids ----------
const LIQ = {
  lava: { stops: [[0, '#fff6c2'], [0.12, '#ffc23a'], [0.45, '#ff5a14'], [1, '#6a0e04']], line: '#fffbe0', glow: '255,140,40', crust: 'rgba(90,14,0,.55)', bub: '#ffe38a' },
  acid: { stops: [[0, 'rgba(235,255,190,.95)'], [0.18, 'rgba(150,245,80,.9)'], [0.6, 'rgba(60,170,40,.9)'], [1, 'rgba(14,70,20,.95)']], line: '#f4ffd8', glow: '150,255,90', crust: 'rgba(230,255,200,.22)', bub: '#e6ffb8' },
};

function surfaceY(x, ty, t, kind) {
  const s = kind === 'lava' ? 1 : 1.6;
  return ty * T + 13 + Math.sin(x * 0.045 + t * 1.8 * s) * 1.7 + Math.sin(x * 0.11 - t * 2.9 * s) * 1.1;
}

export function drawLiquids(ctx, runs, t, emit) {
  for (const L of runs) {
    const C = LIQ[L.kind], x0 = L.tx0 * T + (L.capL ? 2 : 0), x1 = (L.tx1 + 1) * T - (L.capR ? 2 : 0), bot = (L.ty + 1) * T + 9;
    const top = L.ty * T + 10;
    // Body
    const path = new Path2D();
    path.moveTo(x0, bot);
    path.lineTo(x0, surfaceY(x0, L.ty, t, L.kind) + (L.capL ? 2 : 0));
    for (let x = x0 + 4; x < x1; x += 4) path.lineTo(x, surfaceY(x, L.ty, t, L.kind));
    path.lineTo(x1, surfaceY(x1, L.ty, t, L.kind) + (L.capR ? 2 : 0));
    path.lineTo(x1, bot);
    path.closePath();
    const g = ctx.createLinearGradient(0, top, 0, bot);
    for (const [k, c] of C.stops) g.addColorStop(k, c);
    ctx.fillStyle = g;
    ctx.fill(path);
    ctx.save();
    ctx.clip(path);
    // Drifting crust (lava) or caustic ripples (acid)
    ctx.fillStyle = C.crust;
    for (let tx = L.tx0; tx <= L.tx1; tx++) {
      const h = hash2(tx, L.ty, 21), h2 = hash2(tx, L.ty, 22);
      const cx = tx * T + ((h * T + t * (L.kind === 'lava' ? 6 : 14)) % (T + 16)) - 8;
      const cy = L.ty * T + 19 + h2 * 9;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 6 + h * 6, 1.6 + h2 * 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Rising bubbles that pop at the surface
    for (let tx = L.tx0; tx <= L.tx1; tx++) {
      for (let b = 0; b < 2; b++) {
        const h = hash2(tx, L.ty, 30 + b), sp = L.kind === 'lava' ? 0.35 : 0.6;
        const ph = (t * sp + h) % 1, bx = tx * T + 5 + hash2(tx, L.ty, 40 + b) * 22;
        const sy = surfaceY(bx, L.ty, t, L.kind);
        const by = bot - 4 - ph * (bot - 4 - sy);
        const r = 1.4 + h * 2.2;
        if (ph < 0.93) {
          ctx.strokeStyle = C.bub;
          ctx.globalAlpha = 0.75;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(bx + Math.sin(t * 4 + h * 9) * 1.5, by, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        } else if (emit && Math.random() < 0.08) emit(L.kind, bx, sy);
      }
    }
    ctx.restore();
    // Bright surface line, plus a softer glossy band just below it
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 4) {
      const y = surfaceY(x, L.ty, t, L.kind);
      if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.22)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = x0 + 4; x <= x1 - 4; x += 4) {
      const y = surfaceY(x + 9, L.ty, t * 1.3, L.kind) + 4;
      if (x === x0 + 4) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Heat or fume glow above the surface
    ctx.globalCompositeOperation = 'lighter';
    const ga = L.kind === 'lava' ? 0.2 : 0.12;
    for (let tx = L.tx0; tx <= L.tx1; tx++) {
      const gx = tx * T + 16, gy = L.ty * T + 12, r = 38;
      const gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
      gg.addColorStop(0, `rgba(${C.glow},${ga})`);
      gg.addColorStop(1, `rgba(${C.glow},0)`);
      ctx.fillStyle = gg;
      ctx.fillRect(gx - r, gy - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}

function drawSurface(x, B, px, py, h, h2, lf, rt, brick) {
  const a = lf ? 6 : 0, b = rt ? 6 : 0, w = T - a - b;
  if (brick) {
    x.fillStyle = 'rgba(255,255,255,.12)';
    x.fillRect(px + a, py, w, 3);
    return;
  }
  const top = B.top;
  switch (B.part) {
    case 'snow':
      x.fillStyle = '#d9f1ff';
      x.beginPath();
      x.moveTo(px + a, py + 5);
      x.quadraticCurveTo(px + a + w * 0.3, py - 3, px + a + w * 0.55, py + 1);
      x.quadraticCurveTo(px + a + w * 0.8, py - 2, px + T - b, py + 5);
      x.lineTo(px + T - b, py + 7);
      x.lineTo(px + a, py + 7);
      x.fill();
      x.fillStyle = '#ffffff';
      x.fillRect(px + a, py + 1, w, 2);
      if (h > 0.6) { x.fillStyle = '#bfe8ff'; x.fillRect(px + a + h * 20, py + 7, 3, 4 + h2 * 5); }
      break;
    case 'ember':
      x.fillStyle = '#1c0703';
      x.fillRect(px + a, py, w, 5);
      x.fillStyle = top;
      x.fillRect(px + a, py + 3, w, 2);
      if (h > 0.5) { x.fillStyle = '#ffdf7a'; x.fillRect(px + a + h * (w - 4), py + 2, 4, 2); }
      x.strokeStyle = 'rgba(255,120,40,.5)';
      x.lineWidth = 1;
      x.beginPath();
      x.moveTo(px + a + h * 10, py + 5);
      x.lineTo(px + a + h2 * 20, py + 14);
      x.stroke();
      break;
    case 'rain':
      x.fillStyle = shade(top, -0.35);
      x.fillRect(px + a, py, w, 6);
      x.fillStyle = top;
      x.fillRect(px + a, py, w, 3);
      for (let k = 0; k < 2; k++) {
        const dx = px + a + (k ? h : h2) * (w - 5);
        x.beginPath();
        x.ellipse(dx + 2, py + 7 + (k ? h2 : h) * 6, 2.2, 3.5, 0, 0, Math.PI * 2);
        x.fill();
      }
      break;
    default: {
      x.fillStyle = shade(top, -0.4);
      x.fillRect(px + a, py, w, 5);
      x.fillStyle = top;
      x.fillRect(px + a, py, w, 2);
      x.strokeStyle = top;
      x.lineWidth = 1.5;
      x.beginPath();
      for (let k = 0; k < 4; k++) {
        const bx = px + a + ((h * 7 + k * 0.27) % 1) * w;
        const bh = 3 + ((h2 * 13 + k * 0.31) % 1) * 7;
        x.moveTo(bx, py + 1);
        x.lineTo(bx + (k % 2 ? 2 : -2), py - bh);
      }
      x.stroke();
      if (B.part === 'petal' && h > 0.55) {
        x.fillStyle = '#ffd1f0';
        x.beginPath();
        x.arc(px + a + h2 * w, py - 4, 2.5, 0, Math.PI * 2);
        x.fill();
      }
    }
  }
}

function drawOre(x, px, py, h, h2) {
  for (let k = 0; k < 4; k++) {
    const ox = px + 5 + ((h * 9 + k * 0.29) % 1) * 20, oy = py + 5 + ((h2 * 7 + k * 0.37) % 1) * 20, r = 2.5 + ((k + h) % 1) * 2.5;
    x.fillStyle = '#8a5a12';
    x.beginPath();
    x.arc(ox, oy + 1, r, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#ffd34a';
    x.beginPath();
    x.arc(ox, oy, r, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#fff6c4';
    x.fillRect(ox - 1, oy - 1.5, 1.6, 1.6);
  }
}

function drawCrystal(x, col, px, py, h, up, dn) {
  const base = up ? py + 26 : dn ? py + 6 : py + 16;
  const dir = up ? -1 : dn ? 1 : -1;
  for (let k = 0; k < 3; k++) {
    const cx = px + 8 + k * 8 + (h - 0.5) * 4, len = 10 + ((h * 5 + k * 0.4) % 1) * 14, w = 4 + (k % 2) * 2;
    const g = x.createLinearGradient(cx, base, cx, base + dir * len);
    g.addColorStop(0, shade(col, -0.35));
    g.addColorStop(1, shade(col, 0.5));
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(cx - w, base);
    x.lineTo(cx - w * 0.6, base + dir * len * 0.75);
    x.lineTo(cx, base + dir * len);
    x.lineTo(cx + w * 0.6, base + dir * len * 0.75);
    x.lineTo(cx + w, base);
    x.fill();
    x.fillStyle = 'rgba(255,255,255,.55)';
    x.fillRect(cx - 1, base + dir * len * 0.7, 1.5, -dir * len * 0.4);
  }
}

function drawPlat(x, B, px, py, h, le, re, town) {
  const top = town ? '#8c7ab0' : mix(B.top, B.rock[1], 0.55), dark = shade(top, -0.5);
  x.fillStyle = dark;
  x.fillRect(px, py + 2, T, 10);
  x.fillStyle = top;
  x.fillRect(px, py, T, 6);
  x.fillStyle = 'rgba(255,255,255,.25)';
  x.fillRect(px, py, T, 1.5);
  x.fillStyle = 'rgba(0,0,0,.35)';
  x.fillRect(px + 15, py + 1, 2, 10);
  if (le) {
    x.fillStyle = dark;
    x.beginPath();
    x.moveTo(px + 2, py + 12);
    x.lineTo(px + 10, py + 22);
    x.lineTo(px + 14, py + 12);
    x.fill();
  }
  if (re) {
    x.fillStyle = dark;
    x.beginPath();
    x.moveTo(px + 18, py + 12);
    x.lineTo(px + 22, py + 22);
    x.lineTo(px + 30, py + 12);
    x.fill();
  }
}

function drawHaz(x, B, px, py, h, h2) {
  switch (B.haz) {
    case 'lava': {
      const g = x.createLinearGradient(0, py + 14, 0, py + T);
      g.addColorStop(0, '#ffe36b');
      g.addColorStop(0.3, '#ff8a1a');
      g.addColorStop(1, '#a3200a');
      x.fillStyle = g;
      x.fillRect(px, py + 14, T, 18);
      x.fillStyle = '#fff3b0';
      x.fillRect(px, py + 14, T, 2);
      x.fillStyle = 'rgba(80,10,0,.5)';
      x.fillRect(px + h * 20, py + 20 + h2 * 6, 8, 3);
      break;
    }
    case 'acid': {
      x.fillStyle = 'rgba(120,230,60,.85)';
      x.fillRect(px, py + 16, T, 16);
      x.fillStyle = '#d6ff9a';
      x.fillRect(px, py + 16, T, 2);
      x.fillStyle = 'rgba(230,255,200,.6)';
      x.beginPath();
      x.arc(px + 6 + h * 20, py + 24 + h2 * 4, 2.5, 0, Math.PI * 2);
      x.arc(px + 4 + h2 * 22, py + 21, 1.5, 0, Math.PI * 2);
      x.fill();
      break;
    }
    case 'thorns': {
      x.strokeStyle = '#3a0f30';
      x.lineWidth = 4;
      x.beginPath();
      x.moveTo(px, py + 28);
      x.bezierCurveTo(px + 10, py + 10 + h * 8, px + 22, py + 30, px + T, py + 20 + h2 * 6);
      x.stroke();
      x.fillStyle = '#ff6ec7';
      for (let k = 0; k < 5; k++) {
        const tx = px + 3 + k * 6.5, ty = py + 20 + Math.sin(k * 2 + h * 6) * 6;
        x.beginPath();
        x.moveTo(tx - 2, ty);
        x.lineTo(tx, ty - 7);
        x.lineTo(tx + 2, ty);
        x.fill();
      }
      break;
    }
    case 'icicle': {
      for (let k = 0; k < 4; k++) {
        const sx = px + 4 + k * 8, hh = 10 + ((h * 3 + k * 0.3) % 1) * 12;
        const g = x.createLinearGradient(0, py + T - hh, 0, py + T);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(1, '#6fb6e8');
        x.fillStyle = g;
        x.beginPath();
        x.moveTo(sx - 4, py + T);
        x.lineTo(sx, py + T - hh);
        x.lineTo(sx + 4, py + T);
        x.fill();
      }
      break;
    }
    default: {
      for (let k = 0; k < 4; k++) {
        const sx = px + 4 + k * 8;
        const g = x.createLinearGradient(sx - 4, 0, sx + 4, 0);
        g.addColorStop(0, '#5a5470');
        g.addColorStop(0.5, '#e0dbef');
        g.addColorStop(1, '#4a4460');
        x.fillStyle = g;
        x.beginPath();
        x.moveTo(sx - 4, py + T);
        x.lineTo(sx, py + 14);
        x.lineTo(sx + 4, py + T);
        x.fill();
      }
      x.fillStyle = '#2a2638';
      x.fillRect(px, py + T - 3, T, 3);
    }
  }
}

function drawIcicles(x, px, py, h) {
  for (let k = 0; k < 4; k++) {
    const sx = px + 4 + k * 8, hh = 12 + ((h * 5 + k * 0.41) % 1) * 14;
    const g = x.createLinearGradient(0, py, 0, py + hh);
    g.addColorStop(0, '#9fd4f5');
    g.addColorStop(1, '#ffffff');
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(sx - 4, py);
    x.lineTo(sx, py + hh);
    x.lineTo(sx + 4, py);
    x.fill();
  }
}

export function chunkMini(c) {
  if (c.mini) return c.mini;
  const cv = document.createElement('canvas');
  cv.width = cv.height = CS;
  const x = cv.getContext('2d'), img = x.createImageData(CS, CS);
  for (let i = 0; i < CS * CS; i++) {
    const t = c.tiles[i], B = BIOMES[BIOME_LIST[c.bio[i]]];
    let col = null, a = 255;
    if (isSolid(t)) col = t === BRICK ? '#8f86b0' : B.rock[1];
    else if (t === PLAT) col = B.top;
    else if (t === HAZ || t === HAZC) col = '#ff4a4a';
    else { col = B.sky[1]; a = 150; }
    const [r, g, b] = [parseInt(col.slice(1, 3), 16), parseInt(col.slice(3, 5), 16), parseInt(col.slice(5, 7), 16)];
    img.data.set([r, g, b, a], i * 4);
  }
  x.putImageData(img, 0, 0);
  c.mini = cv;
  return cv;
}
