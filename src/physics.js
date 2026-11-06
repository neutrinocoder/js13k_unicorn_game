// Tile collision for any box with x, y, w, h, vx, vy.
import { T, tileAt, isSolid, PLAT, HAZ, HAZC } from './world.js';

export function moveBody(b, dt, drop = false) {
  b.hitWall = 0;
  b.hitCeil = 0;
  b.ground = false;
  let dx = b.vx * dt, dy = b.vy * dt;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 12));
  dx /= steps;
  dy /= steps;
  for (let s = 0; s < steps; s++) {
    if (dx) {
      b.x += dx;
      const top = Math.floor(b.y / T), bot = Math.floor((b.y + b.h - 0.01) / T);
      if (dx > 0) {
        const tx = Math.floor((b.x + b.w) / T);
        for (let ty = top; ty <= bot; ty++) if (isSolid(tileAt(tx, ty))) { b.x = tx * T - b.w - 0.01; b.vx = 0; b.hitWall = 1; dx = 0; break; }
      } else {
        const tx = Math.floor(b.x / T);
        for (let ty = top; ty <= bot; ty++) if (isSolid(tileAt(tx, ty))) { b.x = (tx + 1) * T + 0.01; b.vx = 0; b.hitWall = -1; dx = 0; break; }
      }
    }
    if (dy) {
      const oldBottom = b.y + b.h;
      b.y += dy;
      const l = Math.floor(b.x / T), r = Math.floor((b.x + b.w - 0.01) / T);
      if (dy > 0) {
        const ty = Math.floor((b.y + b.h) / T);
        for (let tx = l; tx <= r; tx++) {
          const t = tileAt(tx, ty);
          if (isSolid(t) || (t === PLAT && !drop && oldBottom <= ty * T + 0.5)) { b.y = ty * T - b.h; b.vy = 0; b.ground = true; dy = 0; break; }
        }
      } else {
        const ty = Math.floor(b.y / T);
        for (let tx = l; tx <= r; tx++) if (isSolid(tileAt(tx, ty))) { b.y = (ty + 1) * T + 0.01; b.vy = 0; b.hitCeil = 1; dy = 0; break; }
      }
    }
  }
}

export function touchWall(b, dir) {
  const tx = Math.floor((dir > 0 ? b.x + b.w + 2 : b.x - 2) / T);
  const top = Math.floor((b.y + 4) / T), bot = Math.floor((b.y + b.h - 6) / T);
  for (let ty = top; ty <= bot; ty++) if (isSolid(tileAt(tx, ty))) return true;
  return false;
}

export function onPlatform(b) {
  const ty = Math.floor((b.y + b.h + 1) / T);
  const l = Math.floor(b.x / T), r = Math.floor((b.x + b.w - 0.01) / T);
  let plat = false;
  for (let tx = l; tx <= r; tx++) {
    const t = tileAt(tx, ty);
    if (isSolid(t)) return false;
    if (t === PLAT) plat = true;
  }
  return plat;
}

export function groundAhead(b, dir) {
  const tx = Math.floor((dir > 0 ? b.x + b.w + 4 : b.x - 4) / T), ty = Math.floor((b.y + b.h + 4) / T);
  const t = tileAt(tx, ty);
  return isSolid(t) || t === PLAT;
}

export function hazardTouch(b) {
  const l = Math.floor(b.x / T), r = Math.floor((b.x + b.w - 0.01) / T);
  const top = Math.floor(b.y / T), bot = Math.floor((b.y + b.h - 0.01) / T);
  for (let ty = top; ty <= bot; ty++) for (let tx = l; tx <= r; tx++) {
    const t = tileAt(tx, ty);
    if (t === HAZ && b.y + b.h > ty * T + 16 && b.x + b.w > tx * T + 4 && b.x < tx * T + T - 4) return t;
    if (t === HAZC && b.y < ty * T + 16 && b.x + b.w > tx * T + 4 && b.x < tx * T + T - 4) return t;
  }
  return 0;
}

// Step along a ray; returns the distance travelled before hitting a solid tile.
export function rayLength(x, y, dx, dy, max) {
  for (let d = 0; d < max; d += 8) if (isSolid(tileAt(Math.floor((x + dx * d) / T), Math.floor((y + dy * d) / T)))) return d;
  return max;
}
