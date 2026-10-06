// SFX + backsound chiptune bersemangat, semuanya disintesis di browser (tanpa file audio).
let ctx = null;
let master = null;
let sfxGain = null;
let bgmGain = null;
const state = { sfx: true, bgm: true };
try {
  const s = JSON.parse(localStorage.getItem('tq_audio') || 'null');
  if (s) Object.assign(state, s);
} catch { /* abaikan */ }

const save = () => { try { localStorage.setItem('tq_audio', JSON.stringify(state)); } catch { /* abaikan */ } };

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createDynamicsCompressor(); // jaga biar tidak pecah
    master.threshold.value = -14;
    master.ratio.value = 6;
    master.connect(ctx.destination);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.5;
    sfxGain.connect(master);
    bgmGain = ctx.createGain();
    bgmGain.gain.value = 0.2;
    bgmGain.connect(master);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(dest, { f, t = 0, d = 0.08, type = 'square', v = 0.25, to = null }) {
  const c = ctx;
  const o = c.createOscillator();
  const g = c.createGain();
  const t0 = c.currentTime + Math.max(0, t);
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + d);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(v, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(g);
  g.connect(dest);
  o.start(t0);
  o.stop(t0 + d + 0.02);
}

let noiseBuf = null;
function noise(dest, { t = 0, d = 0.05, v = 0.15, f = 6000, type = 'highpass' }) {
  const c = ctx;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 0.4, c.sampleRate);
    const a = noiseBuf.getChannelData(0);
    for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  const g = c.createGain();
  const fl = c.createBiquadFilter();
  fl.type = type;
  fl.frequency.value = f;
  const t0 = c.currentTime + Math.max(0, t);
  g.gain.setValueAtTime(v, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  s.connect(fl);
  fl.connect(g);
  g.connect(dest);
  s.start(t0);
  s.stop(t0 + d + 0.02);
}

const play = (fn) => {
  if (!state.sfx) return;
  if (!ensure()) return;
  fn();
};

export const sfx = {
  click: () => play(() => { tone(sfxGain, { f: 520, d: 0.05 }); tone(sfxGain, { f: 780, t: 0.045, d: 0.07 }); }),
  pick: () => play(() => { tone(sfxGain, { f: 392, d: 0.06 }); tone(sfxGain, { f: 587, t: 0.05, d: 0.06 }); tone(sfxGain, { f: 784, t: 0.1, d: 0.09 }); }),
  nav: () => play(() => { [262, 330, 392, 523].forEach((f, i) => tone(sfxGain, { f, t: i * 0.045, d: 0.07 })); }),
  flip: () => play(() => { tone(sfxGain, { f: 300, to: 900, d: 0.14, type: 'triangle', v: 0.3 }); }),
  back: () => play(() => { tone(sfxGain, { f: 523, d: 0.05 }); tone(sfxGain, { f: 330, t: 0.05, d: 0.08 }); }),
  on: () => play(() => { tone(sfxGain, { f: 440, d: 0.06 }); tone(sfxGain, { f: 880, t: 0.06, d: 0.1 }); }),
  off: () => { if (!ensure()) return; tone(sfxGain, { f: 880, d: 0.06 }); tone(sfxGain, { f: 330, t: 0.06, d: 0.1 }); },
  ok: () => play(() => { [523, 659, 784, 1047].forEach((f, i) => tone(sfxGain, { f, t: i * 0.08, d: 0.12 })); tone(sfxGain, { f: 1047, t: 0.34, d: 0.3, v: 0.2 }); }),
  err: () => play(() => { tone(sfxGain, { f: 180, d: 0.18, type: 'sawtooth', v: 0.25 }); tone(sfxGain, { f: 120, t: 0.16, d: 0.24, type: 'sawtooth', v: 0.25 }); }),
  snap: () => play(() => { noise(sfxGain, { d: 0.12, v: 0.4 }); tone(sfxGain, { f: 1200, to: 400, d: 0.1, v: 0.2 }); }),
};

// ---------- BGM: chiptune cepat (152 BPM), 32 bar ≈ 50 detik lalu loop ----------
// A (bar 0-15): bass + drum dulu, lalu arpeggio + hook. B (bar 16-23): reff naik. C (bar 24-31): kembali ke A + build-up.
const BPM = 152;
const STEP = 60 / BPM / 4; // 1/16
const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);

const CH = {
  Am: { r: 45, t: [57, 60, 64] },
  F: { r: 41, t: [53, 57, 60] },
  C: { r: 48, t: [55, 60, 64] },
  G: { r: 43, t: [55, 59, 62] },
};
const PROG = [
  ...['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G'],
  ...['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G'],
  ...['F', 'G', 'C', 'Am', 'F', 'G', 'C', 'C'],
  ...['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'G'],
];
const SC = [69, 72, 74, 76, 79, 81, 84]; // A minor pentatonic
const X = -1;
const HOOK = [
  [3, X, 3, X, 4, X, 3, X, 1, X, 2, X, 3, X, X, X],
  [2, X, 2, X, 3, X, 2, X, 1, X, 0, X, 1, X, X, X],
];
const REFF = [
  [4, X, 5, X, 6, X, 5, 4, 5, X, 4, X, 3, X, 4, X],
  [5, X, 4, X, 3, X, 4, 5, 6, X, X, X, 5, X, 4, X],
];
const ARP = [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 2, 1, 0, 1];

let timer = null;
let nextT = 0;
let step = 0;

function kick(dt, v = 0.55) { tone(bgmGain, { f: 170, to: 42, t: dt, d: 0.13, type: 'sine', v }); }
function snare(dt, v = 0.28) { noise(bgmGain, { t: dt, d: 0.12, v, f: 2200, type: 'bandpass' }); tone(bgmGain, { f: 200, to: 110, t: dt, d: 0.08, type: 'triangle', v: 0.18 }); }
function hat(dt, open = false) { noise(bgmGain, { t: dt, d: open ? 0.14 : 0.03, v: open ? 0.1 : 0.09, f: 8000 }); }

function schedule() {
  while (nextT < ctx.currentTime + 0.25) {
    const n = step;
    const bar = Math.floor(n / 16) % 32;
    const i = n % 16;
    const dt = nextT - ctx.currentTime;
    const ch = CH[PROG[bar]];
    const sec = bar < 8 ? 'a1' : bar < 16 ? 'a2' : bar < 24 ? 'b' : 'c';

    // drum
    if (sec === 'b') { if (i % 4 === 0) kick(dt); } else if (i === 0 || i === 8 || (i === 10 && bar % 2)) kick(dt);
    if (i === 4 || i === 12) snare(dt);
    if (i % 2 === 0) hat(dt, sec === 'b' && i === 14);
    if (sec === 'b' && i === 14) hat(dt, true);
    if (bar === 31 && i >= 8) snare(dt, 0.1 + (i - 8) * 0.03); // roll menuju loop

    // bass 8th: root, root, oktaf, root...
    if (i % 2 === 0) {
      const up = i % 8 === 4 || i % 8 === 6;
      tone(bgmGain, { f: mf(ch.r + (up ? 12 : 0)), t: dt, d: STEP * 1.7, type: 'triangle', v: 0.36 });
      if (sec === 'b' && i % 4 === 0) tone(bgmGain, { f: mf(ch.r), t: dt, d: STEP * 1.2, type: 'square', v: 0.07 });
    }

    // arpeggio 16th
    if (bar >= 4) {
      const top = sec === 'b' ? 24 : 12;
      if (sec === 'b' ? i % 2 === 0 : true) {
        tone(bgmGain, { f: mf(ch.t[ARP[i]] + top), t: dt, d: STEP * 0.9, type: 'square', v: sec === 'b' ? 0.06 : 0.075 });
      }
    }

    // lead hook / reff
    if (sec !== 'a1') {
      const pat = (sec === 'b' ? REFF : HOOK)[bar % 2];
      const k = pat[i];
      if (k !== X) {
        const m = SC[k] + (sec === 'c' ? 0 : 0);
        tone(bgmGain, { f: mf(m), t: dt, d: STEP * 1.8, type: 'square', v: 0.13 });
        tone(bgmGain, { f: mf(m) * 1.006, t: dt, d: STEP * 1.8, type: 'sawtooth', v: 0.045 });
      }
    }

    nextT += STEP;
    step++;
  }
}

function startBgm() {
  if (timer || !state.bgm) return;
  if (!ensure()) return;
  nextT = ctx.currentTime + 0.1;
  timer = setInterval(schedule, 60);
}
function stopBgm() {
  if (timer) clearInterval(timer);
  timer = null;
}

export const audio = {
  get: () => ({ ...state }),
  // panggil dari event klik pertama (browser butuh gesture)
  unlock: () => { if (ensure() && state.bgm) startBgm(); },
  setSfx: (on) => { state.sfx = on; save(); if (on) { ensure(); sfx.on(); } else sfx.off(); },
  setBgm: (on) => {
    state.bgm = on;
    save();
    if (on) { startBgm(); } else stopBgm();
    if (state.sfx) (on ? sfx.on : sfx.off)();
  },
};

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopBgm();
    else if (ctx && state.bgm) startBgm();
  });
}
