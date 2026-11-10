// Shared drawing helpers for creatures: fire, glowing eyes, lightning and tapered strands.
import { rgba, shade } from './util.js';

// Layered tongues of fire rising from a base line at y. Colours: [outer, middle, core].
export function flame(ctx, x, y, w, h, t, cols = ['#ff3a0a', '#ff9a1a', '#fff2a0'], seed = 0, n = 5) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let layer = 0; layer < 3; layer++) {
    const lw = w * (1 - layer * 0.28), lh = h * (1 - layer * 0.3);
    for (let k = 0; k < n; k++) {
      const u = n > 1 ? k / (n - 1) - 0.5 : 0;
      const ph = t * (7 + layer) + seed + k * 1.9;
      const hk = lh * (0.55 + 0.3 * Math.sin(ph) + 0.15 * Math.sin(ph * 2.3)) * (1 - Math.abs(u) * 0.6);
      const xk = x + u * lw * 0.8, wk = (lw / n) * 0.9 + 2, sway = Math.sin(ph * 1.3) * wk * 0.6;
      const g = ctx.createLinearGradient(0, y, 0, y - hk);
      g.addColorStop(0, rgba(cols[layer], layer === 2 ? 0.9 : 0.75));
      g.addColorStop(1, rgba(cols[layer], 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(xk - wk, y);
      ctx.quadraticCurveTo(xk - wk * 0.7 + sway * 0.4, y - hk * 0.55, xk + sway, y - hk);
      ctx.quadraticCurveTo(xk + wk * 0.7 + sway * 0.4, y - hk * 0.55, xk + wk, y);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

// Glowing bits (eyes) seen while the world is drawn, remembered in screen pixels so they can be
// drawn again on top of the darkness: eyes shine out of a dark cave.
export const EMIT = { on: false, list: [] };

export function drawEmissive(ctx, k = 1) {
  const L = EMIT.list;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < L.length; i += 4) {
    const x = L[i], y = L[i + 1], r = L[i + 2], c = L[i + 3];
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(c, 0.6 * k));
    g.addColorStop(0.25, rgba(c, 0.3 * k));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
  L.length = 0;
}

// A glowing eye: soft halo plus a bright core.
export function eye(ctx, x, y, r, color, core = '#ffffff', halo = 3) {
  if (EMIT.on && EMIT.list.length < 1200 && color[0] === '#' && color !== '#ffffff') {
    const m = ctx.getTransform();
    EMIT.list.push(m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f, Math.max(2.5, r * halo * 0.75 * Math.hypot(m.a, m.b)), color);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * halo);
  g.addColorStop(0, rgba(color, 0.9));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r * halo, y - r * halo, r * halo * 2, r * halo * 2);
  ctx.restore();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, Math.PI * 2); ctx.fill();
}

// A soft additive glow disc.
export function glow(ctx, x, y, r, color, a = 0.5) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

// Jagged lightning between two points.
export function lightning(ctx, x1, y1, x2, y2, color = '#ffd6ff', width = 2, segs = 8, jitter = 14) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const pts = [[x1, y1]];
  for (let i = 1; i < segs; i++) {
    const u = i / segs;
    pts.push([x1 + (x2 - x1) * u + (Math.random() - 0.5) * jitter, y1 + (y2 - y1) * u + (Math.random() - 0.5) * jitter]);
  }
  pts.push([x2, y2]);
  for (const [w, c] of [[width * 4, rgba(color, 0.25)], [width, '#ffffff']]) {
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
  ctx.restore();
}

// Stroke that tapers along a polyline.
export function strand(ctx, pts, w0, w1, color) {
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  for (let i = 1; i < pts.length; i++) {
    const k = (i - 1) / Math.max(1, pts.length - 2);
    ctx.lineWidth = w0 + (w1 - w0) * k;
    ctx.beginPath();
    ctx.moveTo(pts[i - 1][0], pts[i - 1][1]);
    ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
}

// A two-segment limb drawn as an outlined tapered stroke.
export function limb(ctx, pts, w, color, outline = 'rgba(0,0,0,.55)') {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = outline;
  ctx.lineWidth = w + 2.4;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}

// Vertical gradient helper.
export function vgrad(ctx, y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}

// A curved horn from a base point.
export function horn(ctx, x, y, len, curl, thick, dir = 1, col = '#e8dcc4') {
  const g = ctx.createLinearGradient(x, y, x + dir * len * 0.5, y - len);
  g.addColorStop(0, shade(col, -0.35));
  g.addColorStop(1, '#fffaf0');
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - thick * dir, y);
  ctx.quadraticCurveTo(x - dir * thick * 0.4, y - len * 0.7, x + dir * curl, y - len);
  ctx.quadraticCurveTo(x + dir * thick * 0.6, y - len * 0.55, x + thick * dir, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// Rows of sharp teeth along a jaw line.
export function teeth(ctx, x0, y0, x1, y1, n, size, down = true) {
  ctx.fillStyle = '#fff6e6';
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u, s = size * (1 - Math.abs(u - 0.5) * 0.6);
    ctx.beginPath();
    ctx.moveTo(x - s * 0.5, y);
    ctx.lineTo(x, y + (down ? s : -s));
    ctx.lineTo(x + s * 0.5, y);
    ctx.fill();
  }
}
