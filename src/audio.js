// Procedural Web Audio: sound effects, and background music for every land that is put together
// as it plays from a big beat, a bass line and arpeggios (see Music, below). It plays in sections
// (A A B A), brings its layers in one at a time, and plays harder when foes are hunting you.
let ac = null, master, musicBus, pumpBus, sfxBus, verbIn, echoIn, echoDelay, noiseBuf, timer = null;
let theme = null, pending = 'title', nextTime = 0, step = 0, seed = 7, chord = null, chordKey = 0, heat = 0, heatTo = 0;
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
  pumpBus = ac.createGain();
  pumpBus.connect(musicBus);
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
function inKey(k, oct = 2) {
  if (!chord) return mtof(74 + [0, 3, 7, 10, 12, 15, 19][((k % 7) + 7) % 7]);
  const sc = SCALE7[chord.q];
  return mtof(chord.midi + chordKey + sc[((k % 7) + 7) % 7] + 12 * (Math.floor(k / 7) + oct));
}
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
// Background music made of three things only: a big beat, a bass line and arpeggios. There is no
// lead instrument and nothing shrill. The small tunes live inside the arpeggio and bass riffs.
// Every land plays its own order of the same family of chords (A, C, D and G; A minor below
// ground, and A major, with its C sharp, in the brighter places), at its own speed, with its own
// riffs and its own drum pattern.
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
// The notes a riff may use over each kind of chord, in semitones above its root:
// r root, t third, f fifth, o octave, and two colour notes a and b (a pentatonic scale in all).
const TONES = {
  maj: { r: 0, t: 4, f: 7, o: 12, a: 2, b: 9 },
  min: { r: 0, t: 3, f: 7, o: 12, a: 5, b: 10 },
  sus: { r: 0, t: 5, f: 7, o: 12, a: 2, b: 10 },
};
const SCALE7 = { maj: [0, 2, 4, 5, 7, 9, 11], min: [0, 2, 3, 5, 7, 8, 10], sus: [0, 2, 5, 5, 7, 9, 10] };
function parseChord(name) {
  const m = /^([A-G]#?)(m|sus)?$/.exec(name);
  let midi = 36 + NOTE[m[1]];
  if (midi > 51) midi -= 12;                 // roots sit between E2 and D#3
  return { midi, q: m[2] === 'm' ? 'min' : m[2] === 'sus' ? 'sus' : 'maj' };
}

// A and B are the chords of the two sections, one a bar. Riffs are one bar of sixteenth notes:
// a letter (see TONES) starts a note, a capital plays it an octave up, "-" holds it, "." is silence.
// arp holds the riffs for the A sections (they alternate) and, last, the one for the B section.
const THEMES = {
  title: { tempo: 84, A: ['Am', 'C', 'D', 'G'], B: ['D', 'C', 'G', 'A'], voice: 'soft', drums: 'soft',
    arp: ['r.f.o.f.T.f.o.f.', 'r.f.o.f.b.f.o.f.', 'o.f.t.f.a.f.t.f.'], arp2: ['f.......t.......', 'a.......t.......'],
    bass: ['r.....r...r.....', 'r.....r...o.....'] },
  prelude: { tempo: 76, A: ['A', 'D', 'A', 'G'], B: ['D', 'A', 'G', 'A'], voice: 'soft', drums: 'heart',
    arp: ['r.t.f.o.f.t.f.o.', 'r.t.f.b.o.b.f.t.', 'o.f.t.f.a.f.t.f.'], arp2: ['f.......a.......'],
    bass: ['r-------------..', 'r-------o-----..'] },
  fall: { tempo: 70, key: -5, A: ['Am', 'G', 'C', 'D'], B: ['C', 'D', 'Am', 'Am'], voice: 'soft', drums: 'heart',
    arp: ['o...f...t...f...', 'b...f...a...r...', 'o...b...f...a...'], arp2: null,
    bass: ['r-------------..', 'r-------------..'] },
  victory: { tempo: 96, A: ['A', 'C', 'D', 'G'], B: ['D', 'G', 'A', 'A'], voice: 'pluck', drums: 'four', stab: '..x...x...x...x.',
    arp: ['rtfotfrtfotfrtfo', 'r.fo.f.to.f.b.f.', 'o.b.f.a.t.a.f.b.'], arp2: ['f...t...a...t...'],
    bass: ['r.o.r.o.r.o.r.o.', 'r.o.r.o.r.o.b.f.'] },
  limbo: { tempo: 92, A: ['Am', 'C', 'D', 'G'], B: ['Am', 'G', 'D', 'C'], voice: 'pluck', drums: 'boom',
    arp: ['r.fo.f.to.f.b.f.', 'r.f.o.f.T.f.o.f.', 'o.b.f.a.t.a.f.b.'], arp2: ['....f.t.....a.r.', '....t.f.....b.o.'],
    bass: ['r..r..r.r..r..f.', 'r.....o.r...b.f.'] },
  lust: { tempo: 104, swing: 0.12, A: ['Am', 'D', 'C', 'G'], B: ['C', 'D', 'Am', 'A'], voice: 'pluck', drums: 'four', stab: '..x...x...x...x.',
    arp: ['rtfotfrtfotfrtfo', 'rfofTfofrfofbfof', 'o.f.t.f.a.f.t.f.'], arp2: ['f...t...a...t...'],
    bass: ['r.o.r.o.r.o.r.o.', 'r.r.o.r.r.o.r.b.'] },
  gluttony: { tempo: 80, swing: 0.2, A: ['Am', 'C', 'G', 'D'], B: ['D', 'C', 'Am', 'G'], voice: 'pulse', drums: 'half',
    arp: ['r..f..o.r..f..T.', 'r..f..b.r..f..a.', 'o..b..f.o..b..a.'], arp2: ['....f.......t...'],
    bass: ['r.....r..rr...f.', 'r...r..or...r.b.'] },
  heresy: { tempo: 116, A: ['Am', 'G', 'C', 'D'], B: ['C', 'D', 'G', 'A'], voice: 'pluck', drums: 'rock', stab: 'x.....x.....x...',
    arp: ['rr.frr.orr.frr.T', 'rfofTfofrfofbfof', 'o.f.t.f.a.f.t.f.'], arp2: ['f...t...a...t...'],
    bass: ['r..rr..rr..rr..r', 'r.r.r.r.r.r.o.b.'] },
  treachery: { tempo: 76, key: -5, A: ['Am', 'G', 'C', 'D'], B: ['C', 'G', 'D', 'Am'], voice: 'soft', drums: 'half',
    arp: ['r...f...o...f...', 'r...f...b...a...', 'o...b...f...a...'], arp2: ['..f...T...f...o.', '..t...f...a...f.'],
    bass: ['r-------r-----f-', 'r-------o-----b-'] },
  abyss: { tempo: 124, A: ['Am', 'C', 'D', 'C'], B: ['G', 'D', 'C', 'A'], voice: 'pluck', drums: 'tribal',
    arp: ['rfofTfofrfofbfof', 'r.fo.f.to.f.b.f.', 'rr.frr.orr.frr.T'], arp2: ['o.....b.f.....a.'],
    bass: ['r.r.r.r.r.r.r.r.', 'r.r.o.r.r.o.r.b.'] },
  boss: { tempo: 136, A: ['Am', 'C', 'D', 'G'], B: ['C', 'D', 'C', 'D'], turn: 'G', voice: 'pluck', drums: 'drive', stab: 'x..x..x.....x...',
    arp: ['rtfotfrtfotfrtfo', 'rfofTfofrfofbfof', 'rr.frr.orr.frr.T'], arp2: ['f.t.a.t.f.t.a.r.'],
    bass: ['r..rr..rr..rr..r', 'rr.or.r.rr.or.fb'] },
  olympus: { tempo: 96, A: ['A', 'C', 'D', 'G'], B: ['D', 'G', 'A', 'G'], voice: 'soft', drums: 'march',
    arp: ['r.t.f.o.f.t.f.o.', 'r.t.f.b.o.b.f.t.', 'o.f.t.f.a.f.t.f.'], arp2: ['..f...t...a...t.'],
    bass: ['r.....r...r.f...', 'r...o...r...b...'] },
  gold: { tempo: 108, swing: 0.1, A: ['A', 'D', 'C', 'G'], B: ['C', 'G', 'D', 'A'], voice: 'pluck', drums: 'four', stab: '..x...x...x...x.',
    arp: ['rtfotfrtfotfrtfo', 'r.fo.f.to.f.b.f.', 'o.b.f.a.t.a.f.b.'], arp2: ['f...t...a...t...'],
    bass: ['r.o.r.o.r.o.r.o.', 'r..r..o.r..r..b.'] },
  silver: { tempo: 100, A: ['A', 'G', 'C', 'D'], B: ['D', 'C', 'G', 'A'], voice: 'pulse', drums: 'break',
    arp: ['rr.frr.orr.frr.T', 'r..f..o.r..f..T.', 'r.f.o.f.b.f.o.f.'], arp2: ['....f.t.....a.r.'],
    bass: ['r.r.r.r.r.r.r.r.', 'r..r..r.r..r..f.'] },
  mist: { tempo: 78, key: -5, A: ['A', 'D', 'G', 'D'], B: ['C', 'G', 'D', 'A'], voice: 'soft', drums: 'heart',
    arp: ['r...f...o...f...', 'r...t...f...b...', 'o...b...f...a...'], arp2: ['..f...T...f...o.'],
    bass: ['r-------------..', 'r-------o-----..'] },
  zeus: { tempo: 144, A: ['A', 'C', 'D', 'G'], B: ['G', 'D', 'C', 'A'], voice: 'pluck', drums: 'drive', stab: 'x..x..x.....x...',
    arp: ['rfofTfofrfofbfof', 'rtfotfrtfotfrtfo', 'rr.frr.orr.frr.T'], arp2: ['o.b.f.a.t.a.f.b.'],
    bass: ['r..rr..rr..rr..r', 'rr.or.r.rr.or.fb'] },
};
for (const name in THEMES) {
  const th = THEMES[name];
  th.Ac = th.A.map(parseChord);
  th.Bc = th.B.map(parseChord);
  th.turnC = th.turn ? parseChord(th.turn) : null;
}

export function setTheme(name) { pending = name; }

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

// Crossing into a new land: a soft swell and a low note on its first chord.
function arrive(th, t) {
  noise({ t, f: 400, f2: 2400, d: 1.2, g: 0.03, type: 'bandpass', a: 0.8, dest: musicBus, verb: 0.5 });
  tone({ f: mtof(th.Ac[0].midi + (th.key || 0)), t, d: 2, g: 0.07, dest: musicBus, verb: 0.6 });
}

// ---- instruments: all of them plucked, low-passed and kept out of the high registers
function pitch(ch, key, c, oct) {
  const up = c >= 'A' && c <= 'Z';
  return ch.midi + key + TONES[ch.q][c.toLowerCase()] + 12 * (oct + (up ? 1 : 0));
}
// The note a riff starts on this step, and how many steps it lasts; null when it is silent.
function riffAt(riff, b) {
  const c = riff[b];
  if (!c || c === '.' || c === '-') return null;
  let n = 1;
  while (b + n < 16 && riff[b + n] === '-') n++;
  return [c, n];
}
function pluck(kind, midi, t, d, g, pan = 0) {
  while (midi > 81) midi -= 12;              // nothing above the A over the stave
  const f = mtof(midi), M = pumpBus;
  if (kind === 'pluck') tone({ type: 'sawtooth', f, t, d: Math.max(d, 0.2), g: g * 0.75, dest: M, filter: 1700, sweep: 2, q: 3, verb: 0.3, echo: 0.3, pan });
  else if (kind === 'pulse') tone({ type: 'square', f, t, d: Math.max(d, 0.2), g: g * 0.42, dest: M, filter: 1300, sweep: 1.8, q: 2, verb: 0.3, echo: 0.25, pan });
  else {
    tone({ type: 'triangle', f, t, d: Math.max(d, 0.3), g, dest: M, filter: 1400, verb: 0.4, echo: 0.3, pan });
    tone({ f, t, d: Math.max(d, 0.3), g: g * 0.5, dest: M, pan });
  }
}
function bassNote(midi, t, d, long) {
  const f = mtof(midi), M = pumpBus;
  tone({ type: 'triangle', f, t, d: long ? d : 0.34, g: long ? 0.09 : 0.11, a: long ? 0.06 : 0.005, sus: long ? 1 : 0, rel: 0.3, dest: M, filter: 620 });
  tone({ f, t, d: long ? d : 0.3, g: 0.06, a: 0.005, sus: long ? 1 : 0, rel: 0.3, dest: M });
  if (!long) tone({ type: 'sawtooth', f, t, d: 0.2, g: 0.032, dest: M, filter: 900, sweep: 2, q: 2 });
}

// ---- the kit. k kick, s snare, c clap, h and o closed and open hat, t and T toms, p a wood knock.
// "x" plays, "o" plays softly.
const KINDS = ['k', 's', 'c', 'h', 'o', 't', 'T', 'p'];
const DRUMS = {
  heart: { gentle: 1, k: 'x.......x..o....', h: '..o...o...o...o.', p: '....o.......o...' },
  soft: { gentle: 1, k: 'x.......x.x.....', c: '........x.......', h: '..o...o...o...o.', p: '......o.......o.' },
  half: { k: 'x.........x..x..', s: '........x.......', h: 'x...x...x...x.x.', p: '..o...o...o...o.' },
  boom: { k: 'x......x..x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.xo', p: '.........o......' },
  four: { k: 'x...x...x...x...', c: '....x.......x...', h: 'x.o.x.o.x.o.x.o.', o: '..x...x...x...x.' },
  rock: { k: 'x.....x.x.....x.', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', o: '..............x.' },
  break: { k: 'x..x......x..x..', s: '....x..o.o..x...', h: 'x.x.x.x.x.x.x.x.' },
  march: { k: 'x...x...x...x...', s: '..oo..x...oo..xo', h: 'x.x.x.x.x.x.x.x.' },
  tribal: { k: 'x...x...x...x...', c: '....x.......x...', t: 'x..x..x.x..x..xx', T: '......x.......x.', h: '..o...o...o...o.' },
  drive: { k: 'x.x...x.x.x...x.', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx', o: '......x.......x.' },
};
function kit(kind, c, t, g, pan = 0) {
  if (c !== 'x' && c !== 'o') return;
  const v = (c === 'o' ? 0.5 : 1) * g, M = musicBus;
  switch (kind) {
    case 'k':
      // a deep, round kick, and everything else ducks under it for a moment
      tone({ f: 150, f2: 42, t, d: 0.32, g: 0.34 * v, dest: M });
      tone({ type: 'triangle', f: 92, f2: 46, t, d: 0.12, g: 0.13 * v, dest: M });
      noise({ t, f: 2600, d: 0.012, g: 0.045 * v, dest: M });
      pumpBus.gain.setValueAtTime(1 - 0.42 * v, t);
      pumpBus.gain.linearRampToValueAtTime(1, t + 0.19);
      break;
    case 's':
      noise({ t, f: 1700, q: 0.8, d: 0.18, g: 0.11 * v, dest: M, verb: 0.25 });
      tone({ type: 'triangle', f: 200, f2: 130, t, d: 0.1, g: 0.08 * v, dest: M });
      break;
    case 'c':
      for (let i = 0; i < 3; i++) noise({ t: t + i * 0.011, f: 1300, q: 1.2, d: 0.1, g: 0.06 * v, dest: M, verb: 0.3 });
      break;
    case 'h': noise({ t, f: 7000, d: 0.03, g: 0.017 * v, type: 'highpass', dest: M, pan }); break;
    case 'o': noise({ t, f: 6000, d: 0.15, g: 0.015 * v, type: 'highpass', dest: M, pan }); break;
    case 't': tone({ f: 130, f2: 70, t, d: 0.24, g: 0.17 * v, dest: M, verb: 0.25, pan }); break;
    case 'T': tone({ f: 190, f2: 105, t, d: 0.2, g: 0.15 * v, dest: M, verb: 0.25, pan }); break;
    case 'p':
      tone({ type: 'triangle', f: 640, f2: 420, t, d: 0.045, g: 0.035 * v, dest: M, verb: 0.3, pan });
      break;
  }
}

function playStep(th, s, t) {
  const bar = Math.floor(s / 16), b = s % 16, stepLen = 60 / th.tempo / 4, key = th.key || 0;
  // sixteen bars to a round, in four sections: A A B A
  const round = Math.floor(bar / 16), lb = bar % 16, section = lb >> 2, inB = section === 2;
  const ch = lb === 15 && th.turnC ? th.turnC : (inB ? th.Bc : th.Ac)[lb % 4];
  chord = ch;
  chordKey = key;
  const first = round === 0;                                  // the first time round, the layers arrive one by one
  const calm = !first && round % 4 === 3 && section === 0;    // now and then, four bars with the beat stripped back
  const tt = t + (b % 2 ? (th.swing || 0) * stepLen : 0);
  const hot = heat > 0.5;

  // the arpeggio: two riffs take turns in the A sections, a third plays in the B section
  const riff = inB ? th.arp[2] : th.arp[(lb + section + round) % 2];
  const n1 = riffAt(riff, b);
  if (n1) pluck(th.voice, pitch(ch, key, n1[0], 1), tt, stepLen * n1[1] * 0.9, 0.034, b % 4 < 2 ? -0.3 : 0.3);

  // a second, quieter voice answers it with a small tune of its own
  if (th.arp2 && (hot || (first ? lb >= 8 : section > 0))) {
    const n2 = riffAt(th.arp2[lb % th.arp2.length], b);
    if (n2) pluck(th.voice === 'soft' ? 'pluck' : 'soft', pitch(ch, key, n2[0], th.voice === 'soft' ? 1 : 2), tt, stepLen * n2[1] * 0.9, 0.022, b % 8 < 4 ? 0.4 : -0.4);
  }

  // short chords on the off-beats, where a tune has them
  if (th.stab && th.stab[b] === 'x' && !calm && (!first || lb >= 4)) {
    for (const c of ['r', 't', 'f']) tone({ type: 'sawtooth', f: mtof(pitch(ch, key, c, 1)), t: tt, d: 0.16, g: 0.016, dest: pumpBus, filter: 1100, sweep: 1.8, verb: 0.3, pan: c === 't' ? 0.3 : c === 'f' ? -0.3 : 0 });
  }

  // the bass line
  if (!calm && (!first || lb >= 2)) {
    const nb = riffAt(th.bass[inB ? 1 : 0], b);
    if (nb) bassNote(pitch(ch, key, nb[0], 0), tt, stepLen * nb[1], nb[1] >= 4);
  }

  // the beat: hats alone for two bars, then everything, louder in a fight, with a roll into every new section
  const D = DRUMS[th.drums], g = 0.75 + 0.25 * heat;
  const roll = !D.gentle && lb % 4 === 3 && b >= 12 && (!first || lb >= 4);
  for (const kind of KINDS) {
    if (!D[kind]) continue;
    const big = kind !== 'h' && kind !== 'o' && kind !== 'p';
    if (big && ((first && lb < 2) || roll || (calm && kind !== 'c'))) continue;
    kit(kind, D[kind][b], tt, g, kind === 'h' || kind === 'o' ? 0.25 : kind === 't' ? -0.35 : kind === 'T' ? 0.35 : 0);
  }
  if (roll) kit(b === 15 ? 'T' : b % 2 ? 't' : 's', 'x', tt, g * (0.55 + (b - 12) * 0.15), (b - 13.5) * 0.3);
  // quick extra hats and a knock when it is heated
  if (hot && !D.gentle && b % 2 === 1 && !(D.h && D.h[b] !== '.')) kit('h', 'o', tt, g, -0.25);
  if (hot && !D.gentle && (b === 3 || b === 11) && !D.p) kit('p', 'o', tt, g, 0.3);
  // a soft wash marks each new section
  if (lb % 4 === 0 && b === 0 && !first && !D.gentle) noise({ t, f: 3200, q: 0.6, d: 1.1, g: 0.03 * g, dest: musicBus, verb: 0.5 });
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
