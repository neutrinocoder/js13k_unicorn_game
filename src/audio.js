// Procedural Web Audio: sound effects plus a generative soundtrack per region.
let ac = null, master, musicBus, sfxBus, verbIn, noiseBuf, timer = null;
let theme = null, pending = 'title', nextTime = 0, step = 0, seed = 7;
export let muted = false;
try { muted = localStorage.getItem('ua.muted') === '1'; } catch (e) {}

const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const mtof = n => 440 * Math.pow(2, (n - 69) / 12);

export function setMuted(m) {
  muted = m;
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ac.currentTime, 0.05);
  try { localStorage.setItem('ua.muted', m ? '1' : '0'); } catch (e) {}
}

export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain();
  master.gain.value = muted ? 0 : 0.9;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  master.connect(comp);
  comp.connect(ac.destination);
  musicBus = ac.createGain();
  musicBus.gain.value = 0.5;
  musicBus.connect(master);
  sfxBus = ac.createGain();
  sfxBus.gain.value = 0.8;
  sfxBus.connect(master);
  const conv = ac.createConvolver();
  const len = ac.sampleRate * 2.6, ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  conv.buffer = ir;
  verbIn = ac.createGain();
  verbIn.gain.value = 0.4;
  const wet = ac.createGain();
  wet.gain.value = 0.5;
  verbIn.connect(conv);
  conv.connect(wet);
  wet.connect(master);
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  nextTime = ac.currentTime + 0.1;
  timer = setInterval(schedule, 40);
}

function tone({ type = 'sine', f = 440, f2 = 0, t = ac.currentTime, d = 0.2, g = 0.2, a = 0.005, dest = sfxBus, verb = 0, filter = 0, q = 1, detune = 0 }) {
  const o = ac.createOscillator(), gn = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + d);
  o.detune.value = detune;
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.linearRampToValueAtTime(g, t + a);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  let node = o;
  if (filter) {
    const fl = ac.createBiquadFilter();
    fl.type = 'lowpass';
    fl.frequency.value = filter;
    fl.Q.value = q;
    o.connect(fl);
    node = fl;
  }
  node.connect(gn);
  gn.connect(dest);
  if (verb) {
    const s = ac.createGain();
    s.gain.value = verb;
    gn.connect(s);
    s.connect(verbIn);
  }
  o.start(t);
  o.stop(t + d + 0.05);
}

function noise({ t = ac.currentTime, d = 0.2, g = 0.2, type = 'bandpass', f = 1000, f2 = 0, q = 1, dest = sfxBus, verb = 0 }) {
  const s = ac.createBufferSource();
  s.buffer = noiseBuf;
  const fl = ac.createBiquadFilter();
  fl.type = type;
  fl.frequency.setValueAtTime(f, t);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + d);
  fl.Q.value = q;
  const gn = ac.createGain();
  gn.gain.setValueAtTime(g, t);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(fl);
  fl.connect(gn);
  gn.connect(dest);
  if (verb) {
    const v = ac.createGain();
    v.gain.value = verb;
    gn.connect(v);
    v.connect(verbIn);
  }
  s.start(t, Math.random() * 1.5);
  s.stop(t + d + 0.05);
}

const lastPlayed = {};
export function sfx(name, v = 1) {
  if (!ac || muted) return;
  const now = ac.currentTime;
  if (lastPlayed[name] && now - lastPlayed[name] < 0.035) return;
  lastPlayed[name] = now;
  const p = 1 + (Math.random() - 0.5) * 0.1;
  switch (name) {
    case 'jump': tone({ f: 320 * p, f2: 640 * p, d: 0.12, g: 0.1 }); break;
    case 'djump': tone({ type: 'triangle', f: 520 * p, f2: 980 * p, d: 0.16, g: 0.09, verb: 0.3 }); break;
    case 'land': noise({ f: 260, d: 0.07, g: 0.1 * v, type: 'lowpass' }); break;
    case 'step': noise({ f: 520, d: 0.03, g: 0.025, type: 'lowpass' }); break;
    case 'whip':
      noise({ f: 900, f2: 4200, d: 0.16, g: 0.16, q: 2 });
      tone({ type: 'sawtooth', f: 560 * p, f2: 260, d: 0.12, g: 0.04, filter: 2600 });
      break;
    case 'blast':
      tone({ type: 'sawtooth', f: 240, f2: 50, d: 0.35, g: 0.18, filter: 1600 });
      noise({ f: 700, f2: 120, d: 0.35, g: 0.22, type: 'lowpass' });
      tone({ f: 880, f2: 220, d: 0.25, g: 0.07, verb: 0.4 });
      break;
    case 'boom':
      noise({ f: 900, f2: 60, d: 0.6, g: 0.3 * v, type: 'lowpass' });
      tone({ f: 90, f2: 30, d: 0.5, g: 0.28 * v });
      break;
    case 'hit':
      tone({ type: 'square', f: 230 * p, f2: 90, d: 0.09, g: 0.07, filter: 1800 });
      noise({ f: 2200, d: 0.05, g: 0.09 });
      break;
    case 'kill':
      tone({ type: 'triangle', f: 620 * p, f2: 1240, d: 0.15, g: 0.07, verb: 0.3 });
      noise({ f: 1300, f2: 300, d: 0.25, g: 0.11 });
      break;
    case 'hurt': tone({ type: 'sawtooth', f: 330, f2: 90, d: 0.3, g: 0.15, filter: 1400 }); break;
    case 'gem':
      tone({ f: 1320 * p * v, d: 0.08, g: 0.06 });
      tone({ f: 1980 * p * v, t: now + 0.05, d: 0.14, g: 0.045, verb: 0.4 });
      break;
    case 'chest': [0, 4, 7, 12, 16].forEach((n, i) => tone({ type: 'triangle', f: mtof(72 + n), t: now + i * 0.07, d: 0.45, g: 0.07, verb: 0.5 })); break;
    case 'buy': [0, 7, 12, 19].forEach((n, i) => tone({ f: mtof(76 + n), t: now + i * 0.06, d: 0.32, g: 0.08, verb: 0.5 })); break;
    case 'deny':
      tone({ type: 'square', f: 160, d: 0.14, g: 0.05, filter: 900 });
      tone({ type: 'square', f: 120, t: now + 0.1, d: 0.2, g: 0.05, filter: 900 });
      break;
    case 'dash': noise({ f: 400, f2: 2600, d: 0.18, g: 0.16, q: 0.7 }); break;
    case 'shrine': [0, 7, 12, 16, 19].forEach((n, i) => tone({ f: mtof(60 + n), t: now + i * 0.09, d: 1.6, g: 0.05, verb: 0.9 })); break;
    case 'star': tone({ f: 1700 * p, f2: 900, d: 0.08, g: 0.035 }); break;
    case 'beam': tone({ type: 'sawtooth', f: 190 * p, d: 0.1, g: 0.025, filter: 1300 }); break;
    case 'bubble': for (let i = 0; i < 6; i++) tone({ f: 400 + i * 120, f2: 900 + i * 150, t: now + i * 0.04, d: 0.12, g: 0.045, verb: 0.4 }); break;
    case 'roar':
      tone({ type: 'sawtooth', f: 110, f2: 50, d: 1.2, g: 0.2, filter: 700, q: 4 });
      noise({ f: 320, f2: 90, d: 1.2, g: 0.2, type: 'lowpass' });
      break;
    case 'bolt':
      noise({ f: 3200, f2: 200, d: 0.5, g: 0.26, type: 'highpass' });
      tone({ type: 'square', f: 60, d: 0.3, g: 0.1, filter: 400 });
      break;
    case 'fire': noise({ f: 500, f2: 1400, d: 0.25, g: 0.1, type: 'bandpass' }); break;
    case 'shoot': tone({ type: 'triangle', f: 420 * p, f2: 180, d: 0.14, g: 0.05 }); break;
    case 'warn': tone({ f: 880, d: 0.1, g: 0.04 }); break;
    case 'heal': [0, 4, 7].forEach((n, i) => tone({ f: mtof(79 + n), t: now + i * 0.08, d: 0.5, g: 0.06, verb: 0.5 })); break;
    case 'ui': tone({ f: 900, d: 0.05, g: 0.035 }); break;
    case 'break': noise({ f: 700, f2: 200, d: 0.2, g: 0.16, type: 'lowpass' }); break;
    case 'portal': [0, 3, 7, 10, 14].forEach((n, i) => tone({ type: 'triangle', f: mtof(55 + n), t: now + i * 0.12, d: 1.4, g: 0.06, verb: 1 })); break;
    case 'seal': [0, 4, 7, 11, 14, 19, 24].forEach((n, i) => tone({ type: 'triangle', f: mtof(62 + n), t: now + i * 0.1, d: 1.8, g: 0.07, verb: 1 })); break;
  }
}

// ---------- Music ----------
const SC = {
  dor: [0, 2, 3, 5, 7, 9, 10],
  minor: [0, 2, 3, 5, 7, 8, 10],
  phryg: [0, 1, 3, 5, 7, 8, 10],
  harm: [0, 2, 3, 5, 7, 8, 11],
  lyd: [0, 2, 4, 6, 7, 9, 11],
};
const THEMES = {
  title: { root: 50, scale: 'dor', tempo: 76, prog: [0, 5, 3, 4], arp: 'sine', pad: 'sawtooth', bass: 1, drums: 0, mel: 0.35 },
  limbo: { root: 50, scale: 'dor', tempo: 88, prog: [0, 3, 5, 4], arp: 'triangle', pad: 'sawtooth', bass: 1, drums: 1, mel: 0.3 },
  lust: { root: 53, scale: 'harm', tempo: 98, prog: [0, 5, 6, 4], arp: 'sine', pad: 'triangle', bass: 1, drums: 1, mel: 0.4 },
  gluttony: { root: 45, scale: 'phryg', tempo: 74, prog: [0, 1, 5, 0], arp: 'square', pad: 'sawtooth', bass: 1, drums: 1, mel: 0.25 },
  heresy: { root: 48, scale: 'harm', tempo: 108, prog: [0, 6, 5, 4], arp: 'sawtooth', pad: 'sawtooth', bass: 1, drums: 2, mel: 0.3 },
  treachery: { root: 52, scale: 'minor', tempo: 66, prog: [0, 5, 2, 6], arp: 'sine', pad: 'triangle', bass: 1, drums: 0, mel: 0.45 },
  abyss: { root: 43, scale: 'phryg', tempo: 120, prog: [0, 1, 0, 6], arp: 'sawtooth', pad: 'sawtooth', bass: 1, drums: 2, mel: 0.3 },
  boss: { root: 45, scale: 'harm', tempo: 132, prog: [0, 5, 1, 4], arp: 'sawtooth', pad: 'sawtooth', bass: 1, drums: 2, mel: 0.2 },
  victory: { root: 55, scale: 'lyd', tempo: 84, prog: [0, 4, 5, 3], arp: 'sine', pad: 'triangle', bass: 1, drums: 0, mel: 0.5 },
};

export function setTheme(name) { pending = name; }

function deg(th, d, oct = 0) {
  const s = SC[th.scale], n = s.length, o = Math.floor(d / n);
  return th.root + s[((d % n) + n) % n] + 12 * (o + oct);
}

function schedule() {
  if (!ac || ac.state !== 'running') return;
  if (nextTime < ac.currentTime - 0.1) nextTime = ac.currentTime + 0.05;
  while (nextTime < ac.currentTime + 0.25) {
    if (step % 16 === 0 && pending && (!theme || pending !== theme.name)) {
      theme = { name: pending, ...THEMES[pending] };
      step = 0;
    }
    if (theme && !muted) playStep(theme, step, nextTime);
    nextTime += 60 / (theme ? theme.tempo : 90) / 4;
    step++;
  }
}

const ARP = [0, 2, 4, 7, 4, 2, 0, 2];
function playStep(th, s, t) {
  const bar = Math.floor(s / 16) % th.prog.length, d = th.prog[bar], b = s % 16, barLen = (60 / th.tempo) * 4;
  const M = musicBus;
  if (b === 0) {
    [0, 2, 4].forEach(k => tone({ type: th.pad, f: mtof(deg(th, d + k, 0)), t, d: barLen * 1.05, g: 0.022, a: 0.5, dest: M, filter: 900, verb: 0.6, detune: (k - 1) * 7 }));
  }
  if (th.bass && (b === 0 || b === 6 || b === 10)) tone({ type: 'triangle', f: mtof(deg(th, d, -1)), t, d: 0.4, g: 0.1, dest: M, filter: 600 });
  if (th.arp && b % 2 === 0) {
    const k = ARP[(b / 2) % 8];
    tone({ type: th.arp, f: mtof(deg(th, d + k, 1)), t, d: 0.22, g: th.arp === 'sine' ? 0.04 : 0.022, dest: M, filter: 2800, verb: 0.5 });
  }
  if (b % 4 === 0 && rnd() < th.mel) {
    const k = [0, 1, 2, 3, 4, 5, 7][Math.floor(rnd() * 7)];
    tone({ f: mtof(deg(th, d + k, 2)), t, d: 0.7, g: 0.03, dest: M, verb: 0.8 });
  }
  if (th.drums) {
    if (b === 0 || b === 8 || (th.drums > 1 && b === 11)) tone({ f: 120, f2: 40, t, d: 0.25, g: 0.2, dest: M });
    if (b % 4 === 2) noise({ t, f: 8000, d: 0.04, g: 0.022, type: 'highpass', dest: M });
    if (th.drums > 1 && (b === 4 || b === 12)) noise({ t, f: 1800, d: 0.15, g: 0.07, dest: M });
  }
}
