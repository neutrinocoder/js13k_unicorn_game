// Developer console: press ` (backtick) to open, then type a command. Flags live in G.save.dev.
import { G } from './state.js';
import { T, CS, SITES, getChunk, GODS, ZS, OLY } from './world.js';
import { playCutscene } from './cutscene.js';
import { SHOP, stats } from './items.js';
import { keys } from './input.js';
import { sfx } from './audio.js';
import { killEnemy, damageEnemy } from './combat.js';
import { teleport, saveGame } from './main.js';

const $ = id => document.getElementById(id);
const history = [];
let hIndex = 0;

export const dev = () => (G.save && G.save.dev) || {};
export const devOpen = () => !$('devcon').classList.contains('hidden');

function flags() {
  if (!G.save.dev) G.save.dev = { fly: 0, god: 0, infGems: 0, speed: 1 };
  return G.save.dev;
}

function print(text, cls = '') {
  const line = document.createElement('div');
  line.className = cls;
  line.textContent = text;
  $('devlog').appendChild(line);
  $('devlog').scrollTop = 1e9;
}

const onOff = (arg, cur) => (arg === 'on' || arg === '1' ? 1 : arg === 'off' || arg === '0' ? 0 : cur ? 0 : 1);

const PLACES = {
  town: [18, 0], market: [18, 0], gate: [-32, 0],
  cerberus: [SITES[0].tx, SITES[0].ty + SITES[0].h / 2 + 1], gluttony: [SITES[0].tx, SITES[0].ty + SITES[0].h / 2 + 1],
  storm: [SITES[1].tx, SITES[1].ty + SITES[1].h / 2 + 1], semiramis: [SITES[1].tx, SITES[1].ty + SITES[1].h / 2 + 1], lust: [SITES[1].tx, SITES[1].ty + SITES[1].h / 2 + 1],
  heretic: [SITES[2].tx, SITES[2].ty + SITES[2].h / 2 + 1], farinata: [SITES[2].tx, SITES[2].ty + SITES[2].h / 2 + 1], heresy: [SITES[2].tx, SITES[2].ty + SITES[2].h / 2 + 1],
  titan: [SITES[3].tx, SITES[3].ty + SITES[3].h / 2 + 1], ephialtes: [SITES[3].tx, SITES[3].ty + SITES[3].h / 2 + 1], treachery: [SITES[3].tx, SITES[3].ty + SITES[3].h / 2 + 1],
  hades: [SITES[4].tx - 34, SITES[4].ty + SITES[4].h / 2 + 1],
  olympus: [-6, OLY.hub], heaven: [-6, OLY.hub],
  zeus: [ZS.tx - 34, ZS.ty + ZS.h / 2 + 1],
};
for (const g of GODS) PLACES[g.id] = [g.tx, g.ty + g.h / 2 + 1];

const COMMANDS = {
  help: {
    desc: 'list commands',
    run() { for (const [name, c] of Object.entries(COMMANDS)) print(`  ${(name + ' ' + (c.args || '')).padEnd(26)} ${c.desc}`); },
  },
  fly: {
    args: '[on|off]', desc: 'fly freely and pass through walls (WASD or arrows; hold Shift to go fast)',
    run([a]) { const f = flags(); f.fly = onOff(a, f.fly); if (!f.fly && G.player) G.player.vy = 0; return 'fly ' + (f.fly ? 'ON' : 'OFF'); },
  },
  god: {
    args: '[on|off]', desc: 'invincible: no damage from anything',
    run([a]) { const f = flags(); f.god = onOff(a, f.god); return 'god mode ' + (f.god ? 'ON' : 'OFF'); },
  },
  gems: {
    args: '[amount|off]', desc: 'no amount: infinite gems (shopping is free). With a number: add that many',
    run([a]) {
      const f = flags();
      if (a && a !== 'off' && a !== 'on') {
        const n = parseInt(a, 10);
        if (isNaN(n)) return 'usage: gems [amount|off]';
        G.save.gems = Math.max(0, G.save.gems + n);
        return `added ${n} gems (now ${G.save.gems})`;
      }
      f.infGems = a === 'off' ? 0 : 1;
      return 'infinite gems ' + (f.infGems ? 'ON' : 'OFF');
    },
  },
  speed: {
    args: '<multiplier>', desc: 'running and flying speed, e.g. speed 2 (default 1)',
    run([a]) { const n = parseFloat(a); if (!(n > 0 && n <= 10)) return 'usage: speed 0.5 to 10'; flags().speed = n; return 'speed x' + n; },
  },
  tp: {
    args: '<place | x y>', desc: 'teleport: town, gate, cerberus, storm, heretic, titan, hades, or tile x y',
    run(args) {
      let spot = PLACES[(args[0] || '').toLowerCase()];
      if (!spot && args.length >= 2) spot = [parseInt(args[0], 10), parseInt(args[1], 10)];
      if (!spot || spot.some(isNaN)) return 'places: ' + Object.keys(PLACES).join(', ') + '  or tp <x> <y> in tiles';
      teleport((spot[0] + 0.5) * T, spot[1] * T - 4);
      return `teleported to ${spot[0]}, ${spot[1]}`;
    },
  },
  pos: {
    desc: 'show where you are, in tiles',
    run() { const p = G.player; return `x ${Math.round((p.x + p.w / 2) / T)}  y ${Math.round((p.y + p.h) / T)}`; },
  },
  give: {
    args: 'all', desc: 'every upgrade and weapon at full level, plus 3 Ambrosia',
    run() {
      for (const it of SHOP) if (!it.consumable) G.save.up[it.id] = it.max;
      G.save.potions = 3;
      G.player.hp = stats().maxHp;
      return 'all upgrades given';
    },
  },
  heal: { desc: 'restore full health', run() { G.player.hp = stats().maxHp; return 'healed'; } },
  kill: {
    desc: 'defeat every enemy nearby, and the boss',
    run() {
      let n = 0;
      for (const e of G.enemies) if (!e.dead) { killEnemy(e); n++; }
      if (G.boss && !G.boss.dead) { damageEnemy(G.boss, G.boss.hp + 1); n++; }
      return `defeated ${n}`;
    },
  },
  seals: {
    desc: 'claim all four Seals (opens the Gate to Hades)',
    run() { for (const s of SITES.slice(0, 4)) G.save.bosses[s.id] = 1; return 'all four Seals claimed'; },
  },
  sigils: {
    desc: 'claim the four Sigils of Olympus (opens the Gate of the Thunderer)',
    run() { for (const s of GODS) G.save.bosses[s.id] = 1; return 'all four Sigils claimed'; },
  },
  ascend: {
    desc: 'skip to Olympus: count Hades as beaten and unlock the heavens',
    run() {
      const s = G.save;
      for (const x of SITES.slice(0, 5)) s.bosses[x.id] = 1;
      s.won = 1; s.oly = 1; s.talked = 1; s.shrines.oly_hub = 1;
      teleport((-6 + 0.5) * T, OLY.hub * T);
      return 'welcome to Olympus';
    },
  },
  scene: {
    args: '<prelude|ascent|finale>', desc: 'play a story cutscene',
    run([a]) {
      if (!['prelude', 'ascent', 'finale'].includes(a)) return 'scenes: prelude, ascent, finale';
      setTimeout(() => playCutscene(a, () => {}), 50);
      return 'playing ' + a;
    },
  },
  reveal: {
    args: '[radius]', desc: 'reveal the map around you (default 300 tiles)',
    run([a]) {
      const r = Math.min(800, parseInt(a, 10) || 300), p = G.player;
      const pcx = Math.floor((p.x + p.w / 2) / T / CS), pcy = Math.floor((p.y + p.h / 2) / T / CS), rc = Math.ceil(r / CS);
      let n = 0;
      for (let j = -rc; j <= rc; j++) for (let i = -rc; i <= rc; i++) {
        if (i * i + j * j > rc * rc) continue;
        getChunk(pcx + i, pcy + j);
        G.save.explored[pcx + i + ',' + (pcy + j)] = 1;
        n++;
      }
      return `revealed ${n} areas`;
    },
  },
  off: {
    desc: 'turn every cheat off',
    run() { Object.assign(flags(), { fly: 0, god: 0, infGems: 0, speed: 1 }); return 'all cheats off'; },
  },
  clear: { desc: 'clear this console', run() { $('devlog').innerHTML = ''; } },
};

function exec(line) {
  const parts = line.trim().split(/\s+/), name = (parts.shift() || '').toLowerCase();
  if (!name) return;
  print('> ' + line, 'cmd');
  const c = COMMANDS[name];
  if (!c) { print(`unknown command "${name}". Type help`, 'err'); return; }
  if (!G.player && name !== 'help' && name !== 'clear') { print('start or continue a game first', 'err'); return; }
  try {
    const out = c.run(parts);
    if (out) print(out, 'ok');
    sfx('ui');
    saveGame();
  } catch (e) {
    print('error: ' + e.message, 'err');
  }
}

export function toggleDev(force) {
  const open = force ?? !devOpen();
  $('devcon').classList.toggle('hidden', !open);
  for (const k in keys) keys[k] = false;
  if (open) {
    if (!$('devlog').childElementCount) print('Developer console. Type help for commands, Esc or ` to close.', 'ok');
    setTimeout(() => $('devin').focus(), 0);
  } else $('devin').blur();
}

export function initDev() {
  addEventListener('keydown', e => {
    if (e.code === 'Backquote') { e.preventDefault(); e.stopImmediatePropagation(); toggleDev(); }
  }, true);
  const input = $('devin');
  input.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') { const v = input.value; if (v.trim()) { history.push(v); hIndex = history.length; } input.value = ''; exec(v); }
    else if (e.key === 'Escape') toggleDev(false);
    else if (e.key === 'ArrowUp') { hIndex = Math.max(0, hIndex - 1); input.value = history[hIndex] || ''; e.preventDefault(); }
    else if (e.key === 'ArrowDown') { hIndex = Math.min(history.length, hIndex + 1); input.value = history[hIndex] || ''; e.preventDefault(); }
  });
}

// Short label for the HUD when any cheat is on.
export function devLabel() {
  const f = dev(), on = [];
  if (f.fly) on.push('FLY');
  if (f.god) on.push('GOD');
  if (f.infGems) on.push('∞ GEMS');
  if (f.speed && f.speed !== 1) on.push('SPEED x' + f.speed);
  return on.length ? 'DEV: ' + on.join(' · ') : '';
}
