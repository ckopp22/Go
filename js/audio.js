// Procedural Web Audio sound effects. Nothing is created or played while sound is off.
let ctx = null;
let master = null;
let noiseBuf = null;
let enabled = true;

function noiseBuffer() {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

// Oscillator with a frequency glide and a quick fade-out.
function tone(type, f0, f1, dur, vol, delay = 0) {
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// Filtered noise burst whose filter sweeps from f0 to f1.
function noise(filter, f0, f1, dur, vol, delay = 0) {
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  src.buffer = noiseBuffer();
  f.type = filter;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

const SOUNDS = {
  whoosh(dir) {
    const [a, b] = { up: [400, 1600], down: [1600, 400], left: [1000, 600], right: [600, 1000] }[dir];
    noise('bandpass', a, b, 0.18, 0.3);
  },
  ping() {
    tone('sine', 880, 880, 0.25, 0.2);
    tone('sine', 1320, 1320, 0.3, 0.16, 0.08);
  },
  crash() {
    tone('sine', 140, 40, 0.4, 0.7);
    noise('lowpass', 1500, 150, 0.5, 0.6);
    for (let i = 0; i < 4; i++) noise('highpass', 3000, 1500, 0.05, 0.25, 0.06 + i * 0.07 + Math.random() * 0.03);
  },
  star() {
    tone('sine', 1320, 1320, 0.12, 0.15);
    tone('sine', 1760, 1760, 0.2, 0.14, 0.07);
    tone('triangle', 2640, 2640, 0.15, 0.06, 0.12);
  },
  tap() {
    tone('sine', 600, 500, 0.06, 0.15);
  },
  highscore() {
    [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.22, 0.2, i * 0.11));
  },
};

// Call from a user gesture (iOS needs this) to create or resume the AudioContext.
export function unlock() {
  if (!enabled) return;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state !== 'running') ctx.resume();
}

export function setEnabled(on) {
  enabled = on;
  if (!on && ctx) ctx.suspend();
}

export function play(name, arg) {
  if (!enabled || !ctx || ctx.state !== 'running') return;
  SOUNDS[name](arg);
}
