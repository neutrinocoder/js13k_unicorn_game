// Endless mazes. The world is cut into a grid of cells, and the cells are grouped into blocks.
// Each block is carved into a perfect maze (exactly one path between any two of its cells, so
// every wrong turn ends in a dead end), then joined to the blocks beside it through a door or two.
// Everything is worked out from the tile position alone, so any part of the world can be built on demand.
import { hash2, vnoise, mulberry } from './util.js';

export const M_AIR = 0, M_WALL = 1, M_PLAT = 2;

// CW x CH tiles per cell, with walls two tiles thick; BW x BH cells per block.
export function makeMaze(seed, CW, CH, BW = 6, BH = 6, loops = 0.03) {
  const cache = new Map();
  let lastK = '', lastB = null;

  // One block's maze. Each cell keeps two bits: 1 = open to the cell on its left, 2 = open to the cell above.
  function carve(bx, by) {
    const n = BW * BH, L = new Uint8Array(n), seen = new Uint8Array(n);
    const rng = mulberry(Math.floor(hash2(bx, by, seed) * 2 ** 31));
    const stack = [Math.floor(rng() * n)];
    seen[stack[0]] = 1;
    while (stack.length) {
      const c = stack[stack.length - 1], x = c % BW, y = (c / BW) | 0;
      // sideways passages are twice as likely as shafts, which suits a platformer
      const opts = [];
      if (x > 0 && !seen[c - 1]) opts.push(0, 0);
      if (x < BW - 1 && !seen[c + 1]) opts.push(1, 1);
      if (y > 0 && !seen[c - BW]) opts.push(2);
      if (y < BH - 1 && !seen[c + BW]) opts.push(3);
      if (!opts.length) { stack.pop(); continue; }
      const d = opts[Math.floor(rng() * opts.length)];
      let m;
      if (d === 0) { m = c - 1; L[c] |= 1; }
      else if (d === 1) { m = c + 1; L[m] |= 1; }
      else if (d === 2) { m = c - BW; L[c] |= 2; }
      else { m = c + BW; L[m] |= 2; }
      seen[m] = 1;
      stack.push(m);
    }
    // a rare shortcut, so not every wrong turn means a long walk back
    for (let i = 0; i < n; i++) if (rng() < loops) L[i] |= rng() < 0.65 ? 1 : 2;
    // doors through to the block on the left and the block above (one always, sometimes two)
    L[Math.floor(hash2(bx, by, seed + 1) * BH) * BW] |= 1;
    if (hash2(bx, by, seed + 3) < 0.5) L[Math.floor(hash2(bx, by, seed + 4) * BH) * BW] |= 1;
    L[Math.floor(hash2(bx, by, seed + 2) * BW)] |= 2;
    if (hash2(bx, by, seed + 5) < 0.4) L[Math.floor(hash2(bx, by, seed + 6) * BW)] |= 2;
    return L;
  }

  function block(bx, by) {
    const k = bx + ',' + by;
    if (k === lastK) return lastB;
    let L = cache.get(k);
    if (!L) {
      if (cache.size > 800) cache.clear();
      L = carve(bx, by);
      cache.set(k, L);
    }
    lastK = k;
    lastB = L;
    return L;
  }

  const links = (gx, gy) => {
    const bx = Math.floor(gx / BW), by = Math.floor(gy / BH);
    return block(bx, by)[(gy - by * BH) * BW + (gx - bx * BW)];
  };
  // which ways a cell opens: left, up, right, down
  const exits = (gx, gy) => {
    const me = links(gx, gy);
    return { l: !!(me & 1), u: !!(me & 2), r: !!(links(gx + 1, gy) & 1), d: !!(links(gx, gy + 1) & 2) };
  };
  return { seed, CW, CH, links, exits };
}

// What the maze holds at one tile: a wall, open air, or a one-way ledge.
export function mazeTile(M, tx, ty) {
  const { CW, CH, links, seed } = M;
  const gx = Math.floor(tx / CW), gy = Math.floor(ty / CH), lx = tx - gx * CW, ly = ty - gy * CH;
  const me = links(gx, gy);
  // each cell owns the wall on its left and the floor of the cell above it
  if (lx < 2 && ly < 2) return M_WALL;
  if (lx < 2) return (me & 1) && ly >= 3 ? M_AIR : M_WALL;
  if (ly < 2) {
    // a shaft up into the cell above, capped with a ledge you can stand on or drop through
    if ((me & 2) && lx >= 3 && lx <= CW - 3) return ly === 0 ? M_PLAT : M_AIR;
    return M_WALL;
  }
  // a ledge halfway up, to climb into the shaft above
  if ((me & 2) && ly === (CH + 1) >> 1) {
    if (hash2(gx, gy, seed + 7) < 0.5 ? lx <= 4 : lx >= CW - 3) return M_PLAT;
  }
  // rough rock: lumps along the ceiling, the floor and the closed walls
  const n = vnoise(tx * 0.55, ty * 0.55, seed + 9);
  const shaftBelow = (links(gx, gy + 1) & 2) && lx >= 3 && lx <= CW - 3;
  if (ly === 2 && n > 0.66 && !((me & 2) && lx >= 2 && lx <= CW - 2)) return M_WALL;
  if (ly === CH - 1 && n > 0.8 && !shaftBelow) return M_WALL;
  if (lx === 2 && !(me & 1) && n > 0.7) return M_WALL;
  if (lx === CW - 1 && !(links(gx + 1, gy) & 1) && n > 0.7) return M_WALL;
  return M_AIR;
}
