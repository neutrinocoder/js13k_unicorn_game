// Particles, floating text and screen shake.
import { G } from './state.js';
import { rand, pick } from './util.js';

// Late-bound callbacks, so low-level modules can trigger effects defined higher up.
export const HOOKS = { kill: null };

export function part(o) {
  if (G.parts.length > 2200) return;
  const p = { x: 0, y: 0, vx: 0, vy: 0, life: 0.6, size: 3, color: '#fff', g: 0, drag: 0, add: false, shape: 'c', rot: 0, vr: 0, grow: 0, ...o };
  p.max = p.life;
  G.parts.push(p);
}

export function burst(x, y, n, color, speed = 220, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), s = speed * rand(0.25, 1);
    part({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.3, 0.75), size: rand(2, 4.5), color: Array.isArray(color) ? pick(color) : color, g: 300, drag: 2, ...o });
  }
}

export function ring(x, y, r, color, life = 0.4, width = 4) {
  G.effects.push({
    t: 0, dur: life,
    draw(ctx) {
      const k = this.t / this.dur;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = color;
      ctx.globalAlpha = 1 - k;
      ctx.lineWidth = width * (1 - k) + 1;
      ctx.beginPath();
      ctx.arc(x, y, r * (0.3 + k * 0.9), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    },
  });
}

export function floater(x, y, text, color = '#fff', size = 16) {
  G.floaters.push({ x: x + rand(-6, 6), y, text, color, size, t: 0 });
}

export function shake(a) { G.cam.shake = Math.max(G.cam.shake, a); }

export function updateFx(dt) {
  const P = G.parts;
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    p.life -= dt;
    if (p.life <= 0) { P[i] = P[P.length - 1]; P.pop(); continue; }
    p.vy += p.g * dt;
    if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
  }
  for (let i = G.floaters.length - 1; i >= 0; i--) {
    const f = G.floaters[i];
    f.t += dt;
    f.y -= 40 * dt;
    if (f.t > 0.9) G.floaters.splice(i, 1);
  }
  for (let i = G.effects.length - 1; i >= 0; i--) {
    const e = G.effects[i];
    e.t += dt;
    if (e.update) e.update(dt);
    if (e.t >= e.dur || e.dead) G.effects.splice(i, 1);
  }
}

export function drawParts(ctx, additive) {
  ctx.globalCompositeOperation = additive ? 'lighter' : 'source-over';
  for (const p of G.parts) {
    if (!!p.add !== additive) continue;
    const k = p.life / p.max;
    ctx.globalAlpha = Math.min(1, k * 1.6);
    ctx.fillStyle = p.color;
    const s = p.size * (p.grow ? 1 + (1 - k) * p.grow : 0.4 + k * 0.6);
    if (p.shape === 'c') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === 'streak') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = s * 0.6;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
      ctx.stroke();
    } else if (p.shape === 'petal') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 1.4, s * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (p.shape === 'star') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillRect(-s, -s * 0.25, s * 2, s * 0.5);
      ctx.fillRect(-s * 0.25, -s, s * 0.5, s * 2);
      ctx.restore();
    } else {
      ctx.fillRect(p.x - s, p.y - s, s * 2, s * 2);
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

export function drawFloaters(ctx) {
  ctx.textAlign = 'center';
  for (const f of G.floaters) {
    const k = f.t / 0.9;
    ctx.globalAlpha = 1 - k * k;
    const pop = f.t < 0.12 ? 1 + (1 - f.t / 0.12) * 0.55 : 1;
    ctx.font = `800 ${Math.round(f.size * pop)}px Nunito, sans-serif`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,.7)';
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}
