// Endless cave systems: rooms of every size joined by snaking tunnels, with side passages that
// wander off and dead-end in little treasure nooks.
// The world is cut into square blocks. Each block is laid out on its own from a seed: rooms
// first, then a tree of winding tunnels linking them (plus the odd loop), then dead-end spurs.
// Neighbouring blocks agree on where the doors between them are, so the caves run on forever,
// and any part of the world can be built on demand.
import { hash2, mulberry } from './util.js';

export const C_AIR = 0, C_WALL = 1, C_PLAT = 2;

// anchors: [tx, ty] spots (on a passage floor row - 1) that must open into the caves,
// such as the end of a road or the corridor outside a boss's door.
export function makeCaves(seed, o = {}) {
  const B = o.B || 64, rooms = o.rooms || [6, 9], roomW = o.roomW || [7, 18], roomH = o.roomH || [5, 11];
  const spurs = o.spurs || [4, 7], anchors = o.anchors || [];
  const cache = new Map();
  let lastK = '', last = null;
  const doorR = (bx, by) => 8 + Math.floor(hash2(bx, by, seed + 1) * (B - 18));
  const doorD = (bx, by) => 8 + Math.floor(hash2(bx, by, seed + 2) * (B - 16));

  function gen(bx, by) {
    const rng = mulberry(Math.floor(hash2(bx, by, seed) * 2 ** 31));
    const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
    const g = new Uint8Array(B * B).fill(C_WALL), spots = [];
    const lo = 3, hi = B - 4;
    const dig = (x, y) => { if (x >= 0 && x < B && y >= 0 && y < B) g[y * B + x] = C_AIR; };
    // a passage cut 3 wide and 4 tall: (x, y) is just above its floor
    const brush = (x, y) => { for (let j = y - 3; j <= y; j++) for (let i = x - 1; i <= x + 1; i++) dig(i, j); };

    // --- rooms: halls, caverns and little chambers, scattered without touching
    const R = [];
    const want = ri(rooms[0], rooms[1]);
    for (let tries = 0; tries < 60 && R.length < want; tries++) {
      const w = ri(roomW[0], roomW[1]), h = ri(roomH[0], roomH[1]);
      const x = ri(lo + 1, hi - w), y = ri(lo + 4, hi - h);
      if (R.some(r => x < r.x + r.w + 5 && x + w + 5 > r.x && y < r.y + r.h + 5 && y + h + 5 > r.y)) continue;
      R.push({ x, y, w, h, cx: x + (w >> 1), fy: y + h - 1 });
    }
    for (const r of R) {
      // a ragged ceiling, so no two rooms look alike
      for (let i = r.x; i < r.x + r.w; i++) {
        const top = r.y + (rng() < 0.3 ? 1 : 0) - (rng() < 0.3 ? 1 : 0) - (i > r.x + 1 && i < r.x + r.w - 2 && rng() < 0.15 ? 2 : 0);
        for (let j = Math.max(1, top); j <= r.fy; j++) dig(i, j);
      }
      // floating ledges in the taller rooms
      if (r.h >= 8 && r.w >= 9) {
        const ly = r.fy - 4, w = ri(3, Math.min(6, r.w - 6)), lx = ri(r.x + 3, r.x + r.w - 3 - w);
        for (let i = lx; i < lx + w; i++) g[ly * B + i] = C_PLAT;
      }
    }

    // --- winding tunnels between points: wobbly waypoints, then a staggered walk between them
    function tunnel(ax, ay, tx, ty, edge) {
      const d = Math.hypot(tx - ax, ty - ay) || 1, n = Math.max(1, Math.round(d / 9));
      const nx = -(ty - ay) / d, ny = (tx - ax) / d, pts = [[ax, ay]];
      for (let i = 1; i < n; i++) {
        const k = i / n, off = (rng() - 0.5) * Math.min(16, d * 0.6);
        pts.push([
          Math.round(Math.min(hi, Math.max(lo, ax + (tx - ax) * k + nx * off))),
          Math.round(Math.min(hi, Math.max(lo + 3, ay + (ty - ay) * k + ny * off))),
        ]);
      }
      pts.push([tx, ty]);
      for (let p = 1; p < pts.length; p++) {
        let [x, y] = pts[p - 1];
        const [ex, ey] = pts[p];
        brush(x, y);
        while (x !== ex || y !== ey) {
          const dx = ex - x, dy = ey - y;
          if (dy === 0 || (dx !== 0 && rng() < Math.abs(dx) / (Math.abs(dx) + Math.abs(dy) * 0.8))) x += Math.sign(dx);
          else y += Math.sign(dy);
          brush(x, y);
          // now and then the passage swells into a small pocket
          if (!edge && rng() < 0.025) for (let j = y - 5; j <= y; j++) for (let i = x - 3; i <= x + 3; i++) if (i > 1 && i < B - 2 && j > 1 && j < B - 2) dig(i, j);
        }
      }
    }
    const roomPt = r => [Math.min(hi, Math.max(lo, r.cx + ri(-(r.w >> 2), r.w >> 2))), r.fy];

    // --- a tree of tunnels joining every room (sideways links are cheaper than climbs)
    const cost = (a, b) => Math.abs(a.cx - b.cx) + Math.abs(a.fy - b.fy) * 1.6;
    const inTree = [0];
    while (R.length && inTree.length < R.length) {
      let best = null;
      for (const i of inTree) for (let j = 0; j < R.length; j++) {
        if (inTree.includes(j)) continue;
        const c = cost(R[i], R[j]);
        if (!best || c < best[2]) best = [i, j, c];
      }
      inTree.push(best[1]);
      tunnel(...roomPt(R[best[0]]), ...roomPt(R[best[1]]));
    }
    // one or two shortcuts, so it is not always one long dead-end-riddled line
    for (let k = ri(1, 2); k > 0 && R.length > 3; k--) {
      const a = R[ri(0, R.length - 1)], b = R[ri(0, R.length - 1)];
      if (a !== b) tunnel(...roomPt(a), ...roomPt(b));
    }

    // --- doors to the four neighbouring blocks, each reached by its own winding tunnel
    const nearest = (x, y) => R.reduce((m, r) => (!m || Math.hypot(r.cx - x, r.fy - y) < Math.hypot(m.cx - x, m.fy - y) ? r : m), null);
    const doors = [
      [0, doorR(bx - 1, by), 4, doorR(bx - 1, by)],
      [B - 1, doorR(bx, by), B - 5, doorR(bx, by)],
      [doorD(bx, by - 1), 3, doorD(bx, by - 1), 6],
      [doorD(bx, by), B - 2, doorD(bx, by), B - 7],
    ];
    for (const [x, y, ix, iy] of doors) {
      tunnel(x, y, ix, iy, true);
      const r = nearest(ix, iy);
      if (r) tunnel(ix, iy, ...roomPt(r));
    }
    // a ledge across the bottom door, so a climb from below has somewhere to land
    { const x = doorD(bx, by); for (let i = x - 1; i <= x + 1; i++) g[(B - 1) * B + i] = C_PLAT; }
    // the top door is open sky for the shaft from the block above to drop into
    { const x = doorD(bx, by - 1); for (let i = x - 1; i <= x + 1; i++) for (let j = 0; j < 4; j++) dig(i, j); }
    // forced openings: roads and boss corridors that must break into the caves
    for (const [ax, ay] of anchors) {
      // the anchor belongs to whichever block holds the middle of its passage, not its floor
      if (Math.floor(ax / B) !== bx || Math.floor((ay - 2) / B) !== by) continue;
      const lx = ax - bx * B, ly = ay - by * B;
      const r = nearest(lx, ly);
      if (r) tunnel(lx, ly, ...roomPt(r), true);
    }

    // --- dead ends: side passages that wander off and stop, often with treasure at the end
    for (let k = ri(spurs[0], spurs[1]); k > 0 && R.length; k--) {
      const r = R[ri(0, R.length - 1)], [sx, sy] = roomPt(r);
      const a = rng() * Math.PI * 2, len = ri(10, 24);
      const ex = Math.round(Math.min(hi - 2, Math.max(lo + 2, sx + Math.cos(a) * len)));
      const ey = Math.round(Math.min(hi - 2, Math.max(lo + 4, sy + Math.sin(a) * len * 0.7)));
      tunnel(sx, sy, ex, ey);
      // a little nook at the end
      for (let j = ey - 4; j <= ey; j++) for (let i = ex - 2; i <= ex + 2; i++) if (i > 1 && i < B - 2 && j > 1 && j < B - 2) dig(i, j);
      spots.push([ex, ey]);
    }

    // --- ledges up the walls of every climb, never more than 5 tiles apart. Only near walls, so
    // wide rooms stay open instead of turning into stacked floors.
    // A ledge also goes out in open air when the space keeps rising well above it (a shaft out of
    // a room's ceiling), so every climb can be made with plain jumps.
    const up = new Uint8Array(B * B);
    for (let x = 0; x < B; x++) for (let y = 0; y < B; y++) up[y * B + x] = g[y * B + x] === C_AIR ? (y ? up[(y - 1) * B + x] : 4) + 1 : 0;
    for (let x = 1; x < B - 1; x++) {
      let d = 0;
      for (let y = B - 1; y >= 0; y--) {
        const i = y * B + x;
        if (g[i] !== C_AIR) { d = 0; continue; }
        d++;
        if (d >= 5 && y > 0) {
          const nearWall = g[i - 1] === C_WALL || g[i + 1] === C_WALL || (x > 1 && g[i - 2] === C_WALL) || (x < B - 2 && g[i + 2] === C_WALL);
          if (nearWall || up[i] >= 11) { g[i] = C_PLAT; d = 0; }
        }
      }
    }
    // treasure spots sit on the floor
    for (const s of spots) while (s[1] < B - 1 && g[(s[1] + 1) * B + s[0]] === C_AIR) s[1]++;
    return { g, spots, rooms: R };
  }

  function block(bx, by) {
    const k = bx + ',' + by;
    if (k === lastK) return last;
    let b = cache.get(k);
    if (!b) {
      if (cache.size > 400) cache.clear();
      b = gen(bx, by);
      cache.set(k, b);
    }
    lastK = k;
    last = b;
    return b;
  }
  const tile = (tx, ty) => {
    const bx = Math.floor(tx / B), by = Math.floor(ty / B);
    return block(bx, by).g[(ty - by * B) * B + (tx - bx * B)];
  };
  // treasure spots (in world tiles) of the block holding this tile
  const spotsAt = (bx, by) => block(bx, by).spots.map(([x, y]) => [bx * B + x, by * B + y]);
  return { seed, B, tile, spotsAt, block };
}
