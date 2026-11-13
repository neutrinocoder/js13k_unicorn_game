// Procedural Web Audio: sound effects, and a soundtrack for every land that is composed as it plays.
// Each land has its own key, tempo, chords, instruments, drum pattern and a written melody. The
// music is built in sections (A A B A), brings its layers in one at a time, and plays harder when
// foes are hunting you.
let ac = null, master, musicBus, sfxBus, verbIn, echoIn, echoDelay, noiseBuf, timer = null;
let theme = null, pending = 'title', nextTime = 0, step = 0, seed = 7, chord = 0, heat = 0, heatTo = 0;
export let muted = false;
try { muted = localStorage.getItem('ua.muted') === '1'; } catch (e) {}

const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const mtof = n => 440 * Math.pow(2, (n - 69) / 12);

let hushed = false;
export function setMuted(m) {
  muted = m;
  if (master) master.gain.setTargetAtTime(m || hushed ? 0 : 0.9, ac.currentTime, 0.05);
  try { localStorage.setItem('ua.muted', m ? '1' : '0'); } catch (e) {}
}

// Silence everything for a while (an advert is playing), without changing the player's own setting.
export function hush(on) {
  hushed = on;
  if (master) master.gain.setTargetAtTime(on || muted ? 0 : 0.9, ac.currentTime, 0.05);
}

// How hard the music should play: 0 when all is calm, 1 in the thick of a fight.
export function setHeat(v) { heatTo = Math.max(0, Math.min(1, v)); }

export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain();
  master.gain.value = muted || hushed ? 0 : 0.9;
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
  // a large, soft hall
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
  // an echo in time with the music, growing duller with every repeat
  echoIn = ac.createGain();
  echoDelay = ac.createDelay(1.5);
  echoDelay.delayTime.value = 0.33;
  const fb = ac.createGain(), damp = ac.createBiquadFilter(), echoOut = ac.createGain();
  fb.gain.value = 0.36;
  damp.type = 'lowpass';
  damp.frequency.value = 2200;
  echoOut.gain.value = 0.32;
  echoIn.connect(echoDelay);
  echoDelay.connect(damp);
  damp.connect(fb);
  fb.connect(echoDelay);
  damp.connect(echoOut);
  echoOut.connect(master);
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  nextTime = ac.currentTime + 0.1;
  timer = setInterval(schedule, 40);
}

// Send a finished voice to its bus, the hall and the echo, placed left or right.
function route(gn, dest, verb, echo, pan) {
  let out = gn;
  if (pan && ac.createStereoPanner) {
    const pn = ac.createStereoPanner();
    pn.pan.value = Math.max(-1, Math.min(1, pan));
    gn.connect(pn);
    out = pn;
  }
  out.connect(dest);
  if (verb) { const s = ac.createGain(); s.gain.value = verb; out.connect(s); s.connect(verbIn); }
  if (echo) { const s = ac.createGain(); s.gain.value = echo; out.connect(s); s.connect(echoIn); }
}

// One oscillator note. By default it is plucked (it dies away from the start); with sus it holds
// and then lets go. vib adds a singing wobble; sweep opens the filter as the note sounds.
function tone({ type = 'sine', f = 440, f2 = 0, t = ac.currentTime, d = 0.2, g = 0.2, a = 0.005, dest = sfxBus, verb = 0, echo = 0, pan = 0, filter = 0, q = 1, detune = 0, sus = 0, rel = 0.08, vib = 0, sweep = 0 }) {
  const o = ac.createOscillator(), gn = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + d);
  o.detune.value = detune;
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.linearRampToValueAtTime(g, t + Math.min(a, d * 0.5));
  if (sus) {
    const r = Math.min(rel, d * 0.5);
    gn.gain.setValueAtTime(g, t + d - r);
    gn.gain.linearRampToValueAtTime(0.0001, t + d);
  } else gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  if (vib) {
    const l = ac.createOscillator(), lg = ac.createGain();
    l.frequency.value = 5.4;
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(f * vib, t + Math.min(0.25, d * 0.6));
    l.connect(lg);
    lg.connect(o.frequency);
    l.start(t);
    l.stop(t + d + 0.05);
  }
  let node = o;
  if (filter) {
    const fl = ac.createBiquadFilter();
    fl.type = 'lowpass';
    fl.Q.value = q;
    if (sweep) {
      fl.frequency.setValueAtTime(filter * sweep, t);
      fl.frequency.linearRampToValueAtTime(filter, t + Math.min(d * 0.5, 0.6));
      fl.frequency.linearRampToValueAtTime(filter * Math.max(sweep, 0.6), t + d);
    } else fl.frequency.value = filter;
    o.connect(fl);
    node = fl;
  }
  node.connect(gn);
  route(gn, dest, verb, echo, pan);
  o.start(t);
  o.stop(t + d + 0.05);
}

function noise({ t = ac.currentTime, d = 0.2, g = 0.2, type = 'bandpass', f = 1000, f2 = 0, q = 1, dest = sfxBus, verb = 0, echo = 0, pan = 0, a = 0 }) {
  const s = ac.createBufferSource();
  s.buffer = noiseBuf;
  const fl = ac.createBiquadFilter();
  fl.type = type;
  fl.frequency.setValueAtTime(f, t);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + d);
  fl.Q.value = q;
  const gn = ac.createGain();
  if (a) { gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(g, t + a); }
  else gn.gain.setValueAtTime(g, t);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(fl);
  fl.connect(gn);
  route(gn, dest, verb, echo, pan);
  s.start(t, Math.random() * 1.5);
  s.stop(t + d + 0.05);
}

// ---------- Sound effects ----------
// A note of the chord the music is on right now, so pickups and kills ring in tune with it.
const inKey = (k, oct = 2) => (theme ? mtof(deg(theme, chord + k, oct)) : mtof(74 + [0, 3, 7, 10, 12, 15, 19][((k % 7) + 7) % 7]));
const lastPlayed = {};
let gemRun = 0, gemAt = 0, foot = 0;

export function sfx(name, v = 1) {
  if (!ac || muted) return;
  const now = ac.currentTime;
  if (lastPlayed[name] && now - lastPlayed[name] < 0.035) return;
  lastPlayed[name] = now;
  const p = 1 + (Math.random() - 0.5) * 0.1, side = (Math.random() - 0.5) * 0.5;
  switch (name) {
    // ---- moving about
    case 'jump':
      tone({ f: 300 * p, f2: 640 * p, d: 0.13, g: 0.09 });
      noise({ f: 1400, d: 0.05, g: 0.03, type: 'highpass' });
      break;
    case 'djump':
      tone({ type: 'triangle', f: 520 * p, f2: 1040 * p, d: 0.17, g: 0.085, verb: 0.3 });
      tone({ f: inKey(4, 3), t: now + 0.04, d: 0.16, g: 0.03, verb: 0.6 });
      break;
    case 'land':
      noise({ f: 260, d: 0.08, g: 0.1 * v, type: 'lowpass' });
      tone({ f: 120, f2: 55, d: 0.1, g: 0.09 * v });
      break;
    case 'step':
      foot ^= 1;
      noise({ f: foot ? 430 : 560, d: 0.035, g: 0.028, type: 'lowpass', pan: foot ? -0.15 : 0.15 });
      break;
    case 'dash':
      noise({ f: 380, f2: 3000, d: 0.2, g: 0.16, q: 0.7 });
      tone({ type: 'sawtooth', f: 240, f2: 70, d: 0.18, g: 0.05, filter: 900 });
      break;
    // ---- weapons
    case 'whip':
      noise({ f: 700, f2: 5200, d: 0.15, g: 0.14, q: 3, pan: side });
      noise({ t: now + 0.085, f: 5200, d: 0.045, g: 0.13, type: 'highpass' });
      tone({ type: 'sawtooth', f: 560 * p, f2: 240, d: 0.12, g: 0.035, filter: 2600 });
      break;
    case 'swing':
      // a blade through the air: v is how light it is (lower for the heavy ones)
      noise({ f: 1300 * v, f2: 3900 * v, d: 0.14, g: 0.14, q: 1.6, pan: side });
      tone({ f: 2700 * v * p, f2: 1700 * v, d: 0.2, g: 0.016, verb: 0.5 });
      break;
    case 'heavy':
      noise({ f: 520, f2: 130, d: 0.24, g: 0.2, type: 'lowpass' });
      tone({ f: 150 * p, f2: 52, d: 0.22, g: 0.17 });
      break;
    case 'stab':
      noise({ f: 2300, f2: 5400, d: 0.07, g: 0.12, q: 2, pan: side });
      tone({ type: 'triangle', f: 880 * p * v, f2: 1500 * v, d: 0.06, g: 0.03 });
      break;
    case 'bow':
      tone({ type: 'square', f: 230 * p, f2: 105, d: 0.1, g: 0.07, filter: 1500 });
      tone({ type: 'triangle', f: 920 * p, f2: 460, d: 0.07, g: 0.03 });
      noise({ t: now + 0.02, f: 2600, f2: 5200, d: 0.13, g: 0.05, type: 'highpass' });
      break;
    case 'wind':
      noise({ f: 480, f2: 2000, d: 0.3, g: 0.13, q: 0.8, a: 0.04, pan: side * 2 });
      noise({ f: 3200, f2: 6000, d: 0.16, g: 0.035, type: 'highpass' });
      break;
    case 'ice':
      tone({ f: 2400 * p, d: 0.11, g: 0.03, verb: 0.6, pan: side });
      tone({ f: 3350 * p, t: now + 0.015, d: 0.09, g: 0.022, verb: 0.6 });
      noise({ f: 6500, d: 0.04, g: 0.05, type: 'highpass' });
      break;
    case 'flame':
      noise({ f: 300, f2: 1600, d: 0.32, g: 0.14, a: 0.03 });
      tone({ type: 'sawtooth', f: 150 * p, f2: 62, d: 0.26, g: 0.05, filter: 520 });
      break;
    case 'zap':
      tone({ type: 'sawtooth', f: 1900 * p, f2: 180, d: 0.13, g: 0.06, filter: 5200 });
      noise({ f: 4200, d: 0.09, g: 0.11, type: 'highpass' });
      tone({ type: 'square', f: 86, d: 0.14, g: 0.07, filter: 380 });
      break;
    case 'soul':
      tone({ f: inKey(0, 2), f2: inKey(2, 2), d: 0.34, g: 0.035, verb: 0.8, vib: 0.02, pan: side });
      tone({ f: inKey(4, 2), t: now + 0.03, d: 0.3, g: 0.02, verb: 0.8 });
      break;
    case 'lob':
      tone({ f: 520 * p, f2: 240, d: 0.15, g: 0.05 });
      noise({ f: 900, f2: 300, d: 0.12, g: 0.05, type: 'lowpass' });
      break;
    case 'star':
      tone({ f: inKey([0, 2, 4, 7][Math.floor(Math.random() * 4)], 3), d: 0.1, g: 0.032, verb: 0.3 });
      break;
    case 'beam':
      tone({ type: 'sawtooth', f: 190 * p, d: 0.11, g: 0.024, filter: 1300 });
      tone({ f: 1500 + Math.random() * 700, d: 0.09, g: 0.008, verb: 0.4 });
      break;
    case 'blast':
      tone({ type: 'sawtooth', f: 240, f2: 50, d: 0.35, g: 0.18, filter: 1600 });
      noise({ f: 700, f2: 120, d: 0.35, g: 0.22, type: 'lowpass' });
      tone({ f: 880, f2: 220, d: 0.25, g: 0.07, verb: 0.4 });
      tone({ f: 70, f2: 30, d: 0.3, g: 0.16 });
      break;
    case 'boom':
      noise({ f: 900, f2: 60, d: 0.6, g: 0.3 * v, type: 'lowpass' });
      tone({ f: 90, f2: 28, d: 0.55, g: 0.28 * v });
      // debris pattering down afterwards
      for (let i = 0; i < 3; i++) noise({ t: now + 0.16 + i * 0.07 + Math.random() * 0.04, f: 1400 + Math.random() * 1600, d: 0.05, g: 0.04 * v, pan: Math.random() - 0.5 });
      break;
    // ---- hits
    case 'hit':
      tone({ type: 'square', f: 230 * p, f2: 90, d: 0.09, g: 0.07, filter: 1800 });
      noise({ f: 2200, d: 0.05, g: 0.09, pan: side });
      break;
    case 'kill':
      // two rising notes of the chord the music is on, and a puff
      tone({ type: 'triangle', f: inKey(0, 2), d: 0.16, g: 0.06, verb: 0.4 });
      tone({ type: 'triangle', f: inKey(4, 2), t: now + 0.07, d: 0.22, g: 0.06, verb: 0.5, echo: 0.3 });
      noise({ f: 1300, f2: 300, d: 0.25, g: 0.1 });
      break;
    case 'clang':
      tone({ type: 'square', f: 1250 * p, f2: 900, d: 0.16, g: 0.04, verb: 0.4, filter: 3200 });
      tone({ f: 2960 * p, d: 0.2, g: 0.012, verb: 0.6 });
      noise({ f: 2600, d: 0.07, g: 0.09, type: 'bandpass' });
      break;
    case 'hurt':
      tone({ type: 'sawtooth', f: 330, f2: 90, d: 0.3, g: 0.14, filter: 1400 });
      tone({ type: 'sawtooth', f: 349, f2: 96, d: 0.3, g: 0.07, filter: 1400 });
      tone({ f: 100, f2: 40, d: 0.18, g: 0.16 });
      break;
    // ---- treasure
    case 'gem': {
      // gems picked up in a run climb the scale
      gemRun = now - gemAt < 0.5 ? Math.min(gemRun + 1, 11) : 0;
      gemAt = now;
      const f = inKey(gemRun, 2) * (v < 0.8 ? 0.5 : 1);
      tone({ f, d: 0.09, g: 0.055 });
      tone({ f: f * 1.5, t: now + 0.05, d: 0.15, g: 0.04, verb: 0.4, echo: 0.2 });
      break;
    }
    case 'chest':
      [0, 2, 4, 7, 9].forEach((n, i) => tone({ type: 'triangle', f: inKey(n, 2), t: now + i * 0.07, d: 0.5, g: 0.065, verb: 0.5, echo: 0.25, pan: -0.4 + i * 0.2 }));
      noise({ t: now + 0.3, f: 7000, d: 0.5, g: 0.02, type: 'highpass', a: 0.1 });
      break;
    case 'loot': {
      // a found weapon: the finer it is, the longer and brighter the flourish (v is its rarity, 0 to 4)
      const n = 2 + Math.round(v);
      for (let i = 0; i < n; i++) tone({ type: v >= 3 ? 'triangle' : 'sine', f: inKey([0, 2, 4, 7, 9, 11][i], v >= 2 ? 3 : 2), t: now + i * 0.06, d: 0.3 + v * 0.12, g: 0.06, verb: 0.4 + v * 0.1, echo: v >= 2 ? 0.3 : 0 });
      if (v >= 3) {
        noise({ t: now + 0.1, f: 6000, d: 0.9, g: 0.03, type: 'highpass', a: 0.2, verb: 0.5 });
        tone({ f: inKey(0, 0), d: 1.6, g: 0.1, verb: 0.8 });
      }
      break;
    }
    case 'merge':
      tone({ f: 380, f2: 1700, d: 0.36, g: 0.06, verb: 0.4 });
      [4, 7, 9, 11].forEach((n, i) => tone({ type: 'triangle', f: inKey(n, 3), t: now + 0.26 + i * 0.05, d: 0.4, g: 0.05, verb: 0.7, echo: 0.3 }));
      noise({ f: 2000, f2: 9000, d: 0.4, g: 0.04, type: 'highpass', a: 0.25 });
      tone({ f: 110, f2: 55, t: now + 0.26, d: 0.3, g: 0.12 });
      break;
    case 'equip':
      tone({ type: 'square', f: 980 * p, f2: 720, d: 0.09, g: 0.03, filter: 2600, verb: 0.3 });
      noise({ f: 3200, d: 0.04, g: 0.06 });
      break;
    case 'buy':
      tone({ f: 1870, d: 0.07, g: 0.05 });
      tone({ f: 2490, t: now + 0.045, d: 0.2, g: 0.045, verb: 0.4 });
      [0, 4, 7].forEach((n, i) => tone({ f: inKey(n, 2), t: now + 0.09 + i * 0.06, d: 0.32, g: 0.06, verb: 0.5 }));
      break;
    case 'deny':
      tone({ type: 'square', f: 160, d: 0.14, g: 0.05, filter: 900 });
      tone({ type: 'square', f: 120, t: now + 0.1, d: 0.2, g: 0.05, filter: 900 });
      break;
    case 'heal':
      [0, 2, 4].forEach((n, i) => tone({ f: inKey(n, 3), t: now + i * 0.08, d: 0.5, g: 0.055, verb: 0.6, echo: 0.25 }));
      noise({ f: 5000, f2: 9000, d: 0.5, g: 0.015, type: 'highpass', a: 0.15 });
      break;
    // ---- magic and the world
    case 'shrine':
      [0, 4, 7, 9, 11].forEach((n, i) => {
        const f = inKey(n, 1);
        tone({ f, t: now + i * 0.09, d: 1.8, g: 0.05, verb: 0.9, pan: -0.5 + i * 0.25 });
        tone({ f: f * 3.01, t: now + i * 0.09, d: 0.6, g: 0.012, verb: 0.9 });
      });
      break;
    case 'bubble': for (let i = 0; i < 6; i++) tone({ f: 400 + i * 120, f2: 900 + i * 150, t: now + i * 0.04, d: 0.12, g: 0.045, verb: 0.4, pan: -0.5 + i * 0.2 }); break;
    case 'roar':
      // two low voices beating against each other, over a growl
      tone({ type: 'sawtooth', f: 108, f2: 48, d: 1.25, g: 0.14, filter: 700, q: 4 });
      tone({ type: 'sawtooth', f: 115, f2: 52, d: 1.25, g: 0.14, filter: 760, q: 4 });
      tone({ f: 55, f2: 30, d: 1.1, g: 0.2 });
      noise({ f: 320, f2: 90, d: 1.2, g: 0.2, type: 'lowpass', verb: 0.4 });
      break;
    case 'bolt':
      noise({ f: 3200, f2: 200, d: 0.5, g: 0.26, type: 'highpass' });
      tone({ type: 'square', f: 60, d: 0.3, g: 0.1, filter: 400 });
      // thunder rolling away
      noise({ t: now + 0.12, f: 220, f2: 60, d: 1.3, g: 0.13, type: 'lowpass', verb: 0.6, a: 0.05 });
      break;
    case 'fire':
      noise({ f: 500, f2: 1400, d: 0.26, g: 0.1, type: 'bandpass' });
      for (let i = 0; i < 2; i++) noise({ t: now + 0.05 + i * 0.07, f: 2600, d: 0.03, g: 0.035, type: 'highpass' });
      break;
    case 'shoot':
      tone({ type: 'triangle', f: 420 * p, f2: 180, d: 0.14, g: 0.05, pan: side });
      noise({ f: 1500, d: 0.04, g: 0.03 });
      break;
    case 'warn':
      tone({ f: 880, d: 0.1, g: 0.04 });
      tone({ f: 880, t: now + 0.13, d: 0.1, g: 0.04 });
      break;
    case 'ui':
      tone({ f: 1180, d: 0.045, g: 0.03 });
      tone({ f: 1570, t: now + 0.03, d: 0.06, g: 0.022 });
      break;
    case 'break':
      for (let i = 0; i < 3; i++) noise({ t: now + i * 0.045, f: 760 - i * 150, f2: 180, d: 0.14, g: 0.12 - i * 0.025, type: 'lowpass', pan: Math.random() - 0.5 });
      break;
    case 'portal':
      [0, 2, 4, 6, 8].forEach((n, i) => tone({ type: 'triangle', f: inKey(n, 1), t: now + i * 0.12, d: 1.4, g: 0.055, verb: 1, echo: 0.3, vib: 0.01 }));
      noise({ f: 300, f2: 2400, d: 1.2, g: 0.04, a: 0.5, verb: 0.6 });
      break;
    case 'seal':
      [0, 2, 4, 6, 7, 9, 11].forEach((n, i) => tone({ type: 'triangle', f: inKey(n, 1), t: now + i * 0.1, d: 1.9, g: 0.065, verb: 1, echo: 0.3, pan: -0.6 + i * 0.2 }));
      tone({ f: inKey(0, -1), d: 2.4, g: 0.14, verb: 0.8 });
      noise({ t: now + 0.5, f: 6000, d: 1.4, g: 0.025, type: 'highpass', a: 0.3 });
      break;
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

// prog and progB are the chords of the A and B sections, one a bar. mA and mB are the melodies:
// two bars each, one character for every sixteenth note. A digit starts a note that many steps
// of the scale above the chord's root, "-" holds it, "." is silence.
const THEMES = {
  title: { root: 50, scale: 'dor', tempo: 76, prog: [0, 5, 3, 4], progB: [3, 4, 0, 0], pad: 'warm', bass: 'root', arp: 'harp', arpPat: 'updown', arpRate: 2, lead: 'flute', oct: 2, drums: 'none',
    mA: ['4-----2-0---....', '2---4---7-------'], mB: ['7---6-4-....2---', '4-----------....'] },
  limbo: { root: 50, scale: 'dor', tempo: 88, prog: [0, 3, 5, 4], progB: [5, 4, 3, 4], pad: 'warm', bass: 'root', arp: 'pluck', arpPat: 'broken', arpRate: 2, lead: 'bell', oct: 2, drums: 'soft',
    mA: ['4---2-0-....2-4-', '5---4-2-0-------'], mB: ['7---5-4-..2-4-5-', '4-------........'] },
  lust: { root: 53, scale: 'harm', tempo: 98, swing: 0.12, prog: [0, 5, 6, 4], progB: [3, 6, 0, 4], pad: 'choir', bass: 'octave', arp: 'harp', arpPat: 'up', arpRate: 1, lead: 'flute', oct: 2, drums: 'soft',
    mA: ['4-5-4-2-0---4---', '5-6-5-4-2-------'], mB: ['7-----5-4-5-7---', '9---7---5-------'] },
  gluttony: { root: 45, scale: 'phryg', tempo: 74, swing: 0.2, prog: [0, 1, 5, 0], progB: [5, 1, 0, 0], pad: 'dark', bass: 'drone', arp: 'square', arpPat: 'alberti', arpRate: 2, lead: 'brass', oct: 0, drums: 'half',
    mA: ['0-....1-0-......', '0-....3-1-0-----'], mB: ['4---3-1-0-......', '1---0-----------'] },
  heresy: { root: 48, scale: 'harm', tempo: 108, prog: [0, 6, 5, 4], progB: [3, 4, 5, 4], pad: 'dark', bass: 'gallop', arp: 'pluck', arpPat: 'updown', arpRate: 1, lead: 'brass', oct: 1, drums: 'drive',
    mA: ['0-0-4-0-5-4-2-0-', '6-5-4-2-4-------'], mB: ['7-7-5-7-9-7-5-4-', '5-4-2-4-0-------'] },
  treachery: { root: 52, scale: 'minor', tempo: 66, prog: [0, 5, 2, 6], progB: [3, 2, 0, 4], pad: 'glass', bass: 'drone', arp: 'bell', arpPat: 'up', arpRate: 4, lead: 'bell', oct: 2, drums: 'heart',
    mA: ['4-------....2---', '0-----------....'], mB: ['7-------5---4---', '2---------------'] },
  abyss: { root: 43, scale: 'phryg', tempo: 120, prog: [0, 1, 0, 6], progB: [5, 6, 0, 1], pad: 'dark', bass: 'pulse', arp: 'pluck', arpPat: 'broken', arpRate: 1, lead: 'organ', oct: 1, drums: 'war',
    mA: ['0---..0-1---..0-', '3---1---0-------'], mB: ['7---..7-8---..7-', '5---3---1-0-----'] },
  boss: { root: 45, scale: 'harm', tempo: 132, prog: [0, 5, 1, 4], progB: [3, 4, 5, 4], pad: 'dark', bass: 'gallop', arp: 'pluck', arpPat: 'updown', arpRate: 1, lead: 'brass', oct: 1, drums: 'rock',
    mA: ['0-.0-.4-5-.4-.2-', '0-.0-.6-5-4-2-4-'], mB: ['7-.7-.9-7-.5-.4-', '5-4-2-4-5-7-9---'] },
  victory: { root: 55, scale: 'lyd', tempo: 84, prog: [0, 4, 5, 3], progB: [5, 3, 0, 4], pad: 'warm', bass: 'root', arp: 'harp', arpPat: 'up', arpRate: 2, lead: 'flute', oct: 2, drums: 'soft',
    mA: ['0-2-4---7---4---', '5---4-2-4-------'], mB: ['7---9---7-5-4---', '2-4-5-7---------'] },
  olympus: { root: 57, scale: 'lyd', tempo: 92, prog: [0, 4, 1, 5], progB: [5, 4, 3, 4], pad: 'choir', bass: 'root', arp: 'harp', arpPat: 'broken', arpRate: 2, lead: 'brass', oct: 1, drums: 'march',
    mA: ['0---4---7-5-4---', '3---4---2-------'], mB: ['7---5-7-9-------', '7-5-4-2-0-------'] },
  gold: { root: 59, scale: 'lyd', tempo: 100, swing: 0.1, prog: [0, 4, 5, 1], progB: [5, 4, 0, 4], pad: 'warm', bass: 'octave', arp: 'harp', arpPat: 'updown', arpRate: 1, lead: 'flute', oct: 2, drums: 'soft',
    mA: ['4-7-4-2-4-7-9-7-', '5-4-2-4-0-------'], mB: ['9-7-5-7-4-5-2-4-', '0-2-4-7---------'] },
  silver: { root: 55, scale: 'dor', tempo: 96, prog: [0, 6, 3, 4], progB: [3, 4, 0, 6], pad: 'organ', bass: 'pulse', arp: 'square', arpPat: 'updown', arpRate: 2, lead: 'brass', oct: 1, drums: 'march',
    mA: ['0---0-0-4---2---', '0---0-0-5---4---'], mB: ['7---7-7-5---4---', '2---4---0-------'] },
  mist: { root: 54, scale: 'lyd', tempo: 72, prog: [0, 3, 1, 4], progB: [5, 3, 0, 0], pad: 'glass', bass: 'drone', arp: 'bell', arpPat: 'up', arpRate: 4, lead: 'flute', oct: 2, drums: 'none',
    mA: ['4-----------2---', '7-----------5---'], mB: ['9-------7---5---', '4---------------'] },
  zeus: { root: 50, scale: 'harm', tempo: 140, prog: [0, 6, 5, 1], progB: [3, 4, 5, 4], pad: 'choir', bass: 'gallop', arp: 'pluck', arpPat: 'updown', arpRate: 1, lead: 'organ', oct: 1, drums: 'rock',
    mA: ['0-0-0-7-6-7-4-..', '0-0-0-9-7-6-7---'], mB: ['9-7-6-7-9-7-6-4-', '5-4-2-4-0-------'] },
  prelude: { root: 52, scale: 'lyd', tempo: 70, prog: [0, 4, 3, 5], progB: [5, 4, 0, 0], pad: 'choir', bass: 'drone', arp: 'harp', arpPat: 'up', arpRate: 2, lead: 'flute', oct: 2, drums: 'none',
    mA: ['0---2---4---7---', '5-------4-------'], mB: ['7---5---4---2---', '0---------------'] },
  fall: { root: 45, scale: 'phryg', tempo: 64, prog: [0, 1, 6, 0], progB: [5, 1, 0, 0], pad: 'dark', bass: 'drone', arp: 'bell', arpPat: 'up', arpRate: 4, lead: 'choir', oct: 1, drums: 'heart',
    mA: ['7-------5---4---', '1-------0-------'], mB: ['4---3---1-------', '0---------------'] },
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
      const was = theme;
      theme = { name: pending, ...THEMES[pending] };
      step = 0;
      // the echo keeps time with the new tune: three sixteenths behind
      echoDelay.delayTime.setTargetAtTime(Math.min(1.4, (60 / theme.tempo) * 0.75), nextTime, 0.05);
      if (was && !muted) arrive(theme, nextTime);
    }
    heat += (heatTo - heat) * 0.08;
    if (theme && !muted) playStep(theme, step, nextTime);
    nextTime += 60 / (theme ? theme.tempo : 90) / 4;
    step++;
  }
}

// Crossing into a new land: a swell and a low bell on its home note.
function arrive(th, t) {
  noise({ t, f: 500, f2: 5000, d: 1.4, g: 0.035, type: 'bandpass', a: 0.9, dest: musicBus, verb: 0.6 });
  tone({ f: mtof(deg(th, 0, 0)), t, d: 2.6, g: 0.05, dest: musicBus, verb: 0.9 });
  tone({ f: mtof(deg(th, 0, 0)) * 3.01, t, d: 0.9, g: 0.012, dest: musicBus, verb: 0.9 });
}

// ---- instruments
function voice(inst, f, t, d, g, pan = 0) {
  const M = musicBus;
  switch (inst) {
    case 'harp':
      tone({ type: 'triangle', f, t, d: Math.max(d, 0.5), g, dest: M, filter: 3200, verb: 0.5, echo: 0.3, pan });
      break;
    case 'pluck':
      tone({ type: 'sawtooth', f, t, d: Math.max(d, 0.22), g: g * 0.7, dest: M, filter: 2400, sweep: 2.2, q: 3, verb: 0.3, echo: 0.3, pan });
      break;
    case 'square':
      tone({ type: 'square', f, t, d: Math.max(d, 0.2), g: g * 0.5, dest: M, filter: 2200, verb: 0.4, echo: 0.25, pan });
      break;
    case 'bell':
      tone({ f, t, d: Math.max(d, 1.1), g, dest: M, verb: 0.8, echo: 0.35, pan });
      tone({ f: f * 3.01, t, d: 0.5, g: g * 0.28, dest: M, verb: 0.8, pan });
      tone({ f: f * 4.2, t, d: 0.2, g: g * 0.12, dest: M, pan });
      break;
    case 'flute':
      tone({ f, t, d, g: g * 1.2, a: 0.05, sus: 1, rel: 0.12, vib: 0.006, dest: M, verb: 0.6, echo: 0.2, pan });
      tone({ type: 'triangle', f: f * 2, t, d, g: g * 0.12, a: 0.08, sus: 1, rel: 0.12, dest: M, verb: 0.6, pan });
      noise({ t, f: f * 2, d: Math.min(d, 0.12), g: g * 0.12, q: 2, dest: M });
      break;
    case 'brass':
      tone({ type: 'sawtooth', f, t, d, g: g * 0.8, a: 0.04, sus: 1, rel: 0.1, dest: M, filter: 2000, sweep: 0.35, q: 1.5, verb: 0.5, pan, detune: -5 });
      tone({ type: 'sawtooth', f, t, d, g: g * 0.5, a: 0.05, sus: 1, rel: 0.1, dest: M, filter: 1500, sweep: 0.35, verb: 0.5, pan, detune: 6 });
      break;
    case 'organ':
      tone({ type: 'square', f, t, d, g: g * 0.45, a: 0.02, sus: 1, rel: 0.06, dest: M, filter: 2400, verb: 0.5, pan });
      tone({ f: f * 2, t, d, g: g * 0.35, a: 0.02, sus: 1, rel: 0.06, dest: M, verb: 0.5, pan });
      tone({ f: f / 2, t, d, g: g * 0.4, a: 0.02, sus: 1, rel: 0.06, dest: M, pan });
      break;
    case 'choir':
      for (const dt of [-9, 8]) tone({ type: 'sawtooth', f, t, d, g: g * 0.6, a: 0.16, sus: 1, rel: 0.25, vib: 0.004, dest: M, filter: 1250, q: 4, verb: 0.8, pan: pan + dt / 30, detune: dt });
      break;
  }
}

function pad(th, d, t, len) {
  const M = musicBus;
  [0, 2, 4].forEach((k, i) => {
    const f = mtof(deg(th, d + k, 0)), pan = (i - 1) * 0.5, L = len * 1.06;
    if (th.pad === 'choir') {
      for (const dt of [-8, 8]) tone({ type: 'sawtooth', f, t, d: L, g: 0.012, a: 0.7, sus: 1, rel: 0.9, dest: M, filter: 1150, q: 3.5, verb: 0.8, detune: dt, pan });
    } else if (th.pad === 'glass') {
      tone({ f, t, d: L, g: 0.03, a: 0.5, sus: 1, rel: 1, dest: M, verb: 0.9, pan });
      tone({ f: f * 2, t, d: L, g: 0.009, a: 0.9, sus: 1, rel: 1, dest: M, verb: 0.9, pan: -pan });
    } else if (th.pad === 'organ') {
      tone({ type: 'square', f, t, d: L, g: 0.01, a: 0.25, sus: 1, rel: 0.5, dest: M, filter: 1300, verb: 0.6, pan });
      tone({ f: f / 2, t, d: L, g: 0.018, a: 0.25, sus: 1, rel: 0.5, dest: M, pan });
    } else {
      const cut = th.pad === 'dark' ? 560 : 950;
      for (const dt of [-7, 7]) tone({ type: 'sawtooth', f, t, d: L, g: 0.013, a: 0.5, sus: 1, rel: 0.8, dest: M, filter: cut, sweep: 0.55, verb: 0.6, detune: dt, pan });
    }
  });
}

const BASS = {
  root: 'x.....x...x.....', pulse: 'x.x.x.x.x.x.x.x.', octave: 'x.X.x.X.x.X.x.X.', drone: 'L...............', gallop: 'x..xx..xx..xx..x',
};
function bass(th, d, b, t, stepLen) {
  const c = BASS[th.bass][b];
  if (c === '.') return;
  const f = mtof(deg(th, d, c === 'X' ? 0 : -1)), long = c === 'L';
  tone({ type: 'triangle', f, t, d: long ? stepLen * 15 : 0.34, g: long ? 0.085 : 0.1, a: long ? 0.08 : 0.005, sus: long ? 1 : 0, rel: 0.4, dest: musicBus, filter: 620 });
  if (!long) tone({ type: 'sawtooth', f, t, d: 0.2, g: 0.03, dest: musicBus, filter: 900, sweep: 2, q: 2 });
}

const ARPS = { up: [0, 2, 4, 7], updown: [0, 2, 4, 7, 4, 2, 0, 2], broken: [0, 4, 2, 7, 4, 9, 7, 4], alberti: [0, 4, 2, 4] };

// kick, snare, hat, tom: "x" plays, "o" plays softly
const DRUMS = {
  heart: { k: 'x.......o.......' },
  soft: { k: 'x.......x.......', h: '..x...x...x...x.', s: '....o.......o...' },
  half: { k: 'x.........x.....', s: '........x.......', h: 'x...x...x...x...' },
  drive: { k: 'x.....x.x.....x.', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  march: { k: 'x...x...x...x...', s: '..oo..x...oo..x.', h: '................' },
  war: { k: 'x.......x.......', t: 'x..x..x.x..x..xx', s: '............x...' },
  rock: { k: 'x..x..x.x..x..x.', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx' },
};
function kit(c, kind, t, g, pan = 0) {
  if (c !== 'x' && c !== 'o') return;
  const v = (c === 'o' ? 0.5 : 1) * g, M = musicBus;
  if (kind === 'k') { tone({ f: 125, f2: 40, t, d: 0.26, g: 0.2 * v, dest: M }); noise({ t, f: 2500, d: 0.015, g: 0.03 * v, dest: M }); }
  else if (kind === 's') { noise({ t, f: 1900, d: 0.16, g: 0.075 * v, dest: M, verb: 0.3 }); tone({ type: 'triangle', f: 190, f2: 120, t, d: 0.1, g: 0.05 * v, dest: M }); }
  else if (kind === 'h') noise({ t, f: 8200, d: 0.035, g: 0.02 * v, type: 'highpass', dest: M, pan });
  else if (kind === 't') tone({ f: 150, f2: 78, t, d: 0.22, g: 0.13 * v, dest: M, verb: 0.3, pan });
}

function playStep(th, s, t) {
  const bar = Math.floor(s / 16), b = s % 16, stepLen = 60 / th.tempo / 4;
  // sixteen bars to a round, in four sections: A A B A
  const round = Math.floor(bar / 16), lb = bar % 16, section = Math.floor(lb / 4), inB = section === 2;
  const d = (inB ? th.progB : th.prog)[lb % 4];
  chord = d;
  const first = round === 0;                      // the first time round, the layers arrive one by one
  const hush = !first && round % 4 === 3 && section === 0;   // now and then, four quiet bars
  const tt = t + (b % 2 ? (th.swing || 0) * stepLen : 0);

  if (b === 0) pad(th, d, t, stepLen * 16);
  if (!hush && (!first || lb >= 2)) bass(th, d, b, tt, stepLen);

  // the arpeggio, an octave higher when the fight is on
  if (b % th.arpRate === 0 && (!first || lb >= 4)) {
    const pat = ARPS[th.arpPat], k = pat[(b / th.arpRate) % pat.length];
    voice(th.arp, mtof(deg(th, d + k, heat > 0.6 && !inB ? 2 : 1)), tt, stepLen * th.arpRate * 0.9, 0.03, b % 4 < 2 ? -0.35 : 0.35);
  }

  // the tune: silent for the first eight bars, harmonised a third above on every other round
  if (!first || lb >= 8) {
    const line = (inB ? th.mB : th.mA)[lb % 2], c = line[b];
    if (c >= '0' && c <= '9') {
      let n = 1;
      while (b + n < 16 && line[b + n] === '-') n++;
      const k = +c, len = stepLen * n * 0.95;
      voice(th.lead, mtof(deg(th, d + k, th.oct)), tt, len, 0.042);
      if (round % 2 === 1 && !hush) voice(th.lead, mtof(deg(th, d + k + 2, th.oct)), tt, len, 0.018, 0.4);
    }
  }

  // drums: in from the fifth bar, louder in a fight, with a roll into every new section
  const D = DRUMS[th.drums];
  if (D && !hush && (!first || lb >= 4)) {
    const g = 0.6 + 0.4 * heat;
    const roll = lb % 4 === 3 && b >= 12 && (D.s || D.t);
    if (roll) kit('x', D.t ? 't' : 's', tt, g * (0.5 + (b - 12) * 0.17), (b - 13.5) * 0.3);
    else {
      for (const kind in D) kit(D[kind][b], kind, tt, g, kind === 'h' ? 0.3 : kind === 't' ? (b % 8 < 4 ? -0.4 : 0.4) : 0);
      // quick extra hats when it is heated
      if (heat > 0.55 && D.h && b % 2 === 1 && D.h[b] === '.') kit('o', 'h', tt, g, -0.3);
    }
    if (lb % 4 === 0 && b === 0 && !first) noise({ t, f: 5200, d: 1.3, g: 0.035 * g, type: 'highpass', dest: musicBus, verb: 0.5 });
  }
}

// DEV:BEGIN
// For tests: run every sound effect and many bars of every tune, to shake out mistakes.
export function selfTest(bars = 40) {
  if (!ac) return 'no audio';
  let steps = 0;
  const names = ['jump', 'djump', 'land', 'step', 'dash', 'whip', 'swing', 'heavy', 'stab', 'bow', 'wind', 'ice', 'flame', 'zap', 'soul', 'lob', 'star', 'beam', 'blast', 'boom', 'hit', 'kill', 'clang', 'hurt', 'gem', 'chest', 'loot', 'merge', 'equip', 'buy', 'deny', 'heal', 'shrine', 'bubble', 'roar', 'bolt', 'fire', 'shoot', 'warn', 'ui', 'break', 'portal', 'seal'];
  for (const n of names) { delete lastPlayed[n]; sfx(n, n === 'loot' ? 4 : 1); }
  const keep = theme, keepHeat = heat;
  for (const name in THEMES) {
    theme = { name, ...THEMES[name] };
    for (let s = 0; s < bars * 16; s++) { heat = (s >> 8) % 2; playStep(theme, s + (s > bars * 8 ? 16 * 40 : 0), ac.currentTime + 30 + s * 0.01); steps++; }
    arrive(theme, ac.currentTime + 30);
  }
  theme = keep;
  heat = keepHeat;
  return `${names.length} sounds, ${Object.keys(THEMES).length} tunes, ${steps} steps`;
}
// DEV:END
