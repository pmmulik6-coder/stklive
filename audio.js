'use strict';

// Procedural WebAudio engine: layered satisfying SFX + a soft generative lofi loop. No audio files needed.
const SFX = (() => {
  let ctx = null;
  let master, sfxBus, musicBus, reverbIn, noiseBuf;
  let musicOn = true;
  let timer = null;
  let nextT = 0;
  let step = 0;
  let intensity = 0;
  let targetIntensity = 0;
  let keyShift = 0;
  let fireNodes = null;

  const PENT = [0, 2, 4, 7, 9];
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function impulse(sec, decay) {
    const len = (ctx.sampleRate * sec) | 0;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function init() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }

    master = ctx.createGain();
    master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 20;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    master.connect(comp);
    comp.connect(ctx.destination);

    sfxBus = ctx.createGain();
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.5;
    sfxBus.connect(master);
    musicBus.connect(master);

    const conv = ctx.createConvolver();
    conv.buffer = impulse(2.0, 2.4);
    reverbIn = ctx.createGain();
    reverbIn.gain.value = 0.35;
    reverbIn.connect(conv);
    conv.connect(master);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    timer = setInterval(sched, 80);
    return ctx;
  }

  function resume() {
    init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx ? ctx.state : 'none';
  }

  const ok = () => ctx && ctx.state === 'running';

  function tone(freq, t, dur, o = {}) {
    const { type = 'sine', vol = 0.2, attack = 0.004, slide = null, wet = 0.3, bus = sfxBus, lp = null } = o;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lp;
      osc.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(bus);
    if (wet > 0) {
      const w = ctx.createGain();
      w.gain.value = wet;
      g.connect(w);
      w.connect(reverbIn);
    }
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function noise(t, dur, o = {}) {
    const { vol = 0.1, type = 'bandpass', f0 = 2000, f1 = null, q = 1, wet = 0.2, bus = sfxBus } = o;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.01, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(bus);
    if (wet > 0) {
      const w = ctx.createGain();
      w.gain.value = wet;
      g.connect(w);
      w.connect(reverbIn);
    }
    src.start(t, Math.random() * 0.8);
    src.stop(t + dur + 0.05);
  }

  // ---------- sound effects ----------
  function smash(combo, fire) {
    if (!ok()) return;
    const t = ctx.currentTime;
    const i = Math.max(0, combo - 1) % 28;
    const idx = i < 15 ? i : 28 - i; // ping-pong over 3 octaves of pentatonic
    const semis = PENT[idx % 5] + 12 * Math.floor(idx / 5);
    const f = midi(60 + keyShift + semis);
    tone(f, t, 0.3, { vol: 0.2, attack: 0.002, wet: 0.38 });
    tone(f * 2, t, 0.15, { vol: 0.07, wet: 0.4 });
    tone(f * 3.01, t, 0.08, { type: 'triangle', vol: 0.03, wet: 0.3 });
    tone(150, t, 0.09, { vol: 0.2, slide: 55, wet: 0 });
    noise(t, 0.04, { vol: 0.07, type: 'highpass', f0: 5000, q: 0.7, wet: 0.1 });
    if (fire) {
      noise(t, 0.12, { vol: 0.06, type: 'bandpass', f0: 1800, f1: 600, q: 1.2 });
      tone(f / 2, t, 0.2, { type: 'sawtooth', vol: 0.04, lp: 900 });
    }
  }

  function bounce() {
    if (!ok()) return;
    const t = ctx.currentTime;
    tone(190, t, 0.14, { vol: 0.22, slide: 70, wet: 0.1 });
    noise(t, 0.05, { vol: 0.06, type: 'lowpass', f0: 900, wet: 0.05 });
  }

  function ignite() {
    if (!ok()) return;
    const t = ctx.currentTime;
    noise(t, 0.55, { vol: 0.22, type: 'bandpass', f0: 300, f1: 3200, q: 0.9, wet: 0.4 });
    [60, 64, 67, 72].forEach((n, i) => tone(midi(n + keyShift + 12), t + i * 0.06, 0.7, { type: 'triangle', vol: 0.12, wet: 0.5 }));
    tone(90, t, 0.5, { vol: 0.32, slide: 38, wet: 0 });
  }

  function extinguish() {
    if (!ok()) return;
    const t = ctx.currentTime;
    noise(t, 0.35, { vol: 0.1, type: 'bandpass', f0: 2500, f1: 250, q: 1, wet: 0.3 });
    tone(400, t, 0.3, { vol: 0.08, slide: 120, wet: 0.3 });
  }

  function fire(on) {
    if (!ok()) return;
    const t = ctx.currentTime;
    if (on && !fireNodes) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 260;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.07, t + 0.3);
      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      o1.type = o2.type = 'sawtooth';
      o1.frequency.value = 55;
      o2.frequency.value = 55.6;
      o1.connect(lp);
      o2.connect(lp);
      lp.connect(g);
      g.connect(sfxBus);
      o1.start(t);
      o2.start(t);
      fireNodes = { g, o1, o2 };
    } else if (!on && fireNodes) {
      const { g, o1, o2 } = fireNodes;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o1.stop(t + 0.4);
      o2.stop(t + 0.4);
      fireNodes = null;
    }
  }

  function gem(k) {
    if (!ok()) return;
    const t = ctx.currentTime;
    const f = midi(88 + keyShift + PENT[k % 5]);
    tone(f, t, 0.55, { vol: 0.12, wet: 0.55 });
    tone(f * 1.5, t + 0.04, 0.45, { vol: 0.07, wet: 0.55 });
    tone(f * 2.01, t, 0.2, { vol: 0.03, wet: 0.4 });
  }

  function levelComplete() {
    if (!ok()) return;
    const t = ctx.currentTime;
    [72, 76, 79, 84, 88, 91].forEach((n, i) => {
      const tt = t + i * 0.085;
      tone(midi(n + keyShift), tt, 1.0, { type: 'triangle', vol: 0.14, wet: 0.55 });
      tone(midi(n + 12 + keyShift), tt, 0.6, { vol: 0.05, wet: 0.6 });
    });
    tone(70, t, 0.6, { vol: 0.3, slide: 35, wet: 0 });
    noise(t, 1.2, { vol: 0.05, type: 'highpass', f0: 6000, q: 0.5, wet: 0.6 });
  }

  function mission() {
    if (!ok()) return;
    const t = ctx.currentTime;
    [79, 83, 86, 91].forEach((n, i) => tone(midi(n + keyShift), t + i * 0.07, 0.7, { vol: 0.12, wet: 0.6 }));
    noise(t, 0.6, { vol: 0.04, type: 'highpass', f0: 7000, wet: 0.6 });
  }

  function milestone(tier) {
    if (!ok()) return;
    const t = ctx.currentTime;
    noise(t, 0.35, { vol: 0.12, type: 'bandpass', f0: 400, f1: 3000, q: 1, wet: 0.4 });
    const base = 60 + keyShift + Math.min(tier, 5) * 2;
    [0, 4, 7].forEach((s, i) => tone(midi(base + 12 + s), t + 0.12 + i * 0.03, 0.8, { type: 'triangle', vol: 0.1, wet: 0.5 }));
    tone(midi(base), t + 0.12, 0.5, { vol: 0.18, wet: 0.2 });
  }

  function die() {
    if (!ok()) return;
    const t = ctx.currentTime;
    tone(120, t, 0.55, { vol: 0.42, slide: 38, wet: 0.1 });
    tone(220, t, 0.7, { type: 'sawtooth', vol: 0.12, slide: 70, lp: 700, wet: 0.3 });
    noise(t, 0.4, { vol: 0.12, type: 'lowpass', f0: 1200, f1: 200, wet: 0.3 });
  }

  function countdown(n) {
    if (!ok()) return;
    const t = ctx.currentTime;
    if (n > 0) {
      tone(660, t, 0.2, { vol: 0.15, wet: 0.3 });
    } else {
      [84, 88, 91].forEach((m, i) => tone(midi(m + keyShift), t + i * 0.04, 0.5, { type: 'triangle', vol: 0.13, wet: 0.5 }));
      noise(t, 0.3, { vol: 0.08, type: 'bandpass', f0: 500, f1: 4000, q: 1, wet: 0.4 });
    }
  }

  function unlock() {
    if (!ok()) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 9; i++) {
      tone(midi(72 + keyShift + PENT[i % 5] + 12 * Math.floor(i / 5)), t + i * 0.06, 0.8, { vol: 0.1, wet: 0.6 });
    }
  }

  function boss() {
    if (!ok()) return;
    const t = ctx.currentTime;
    tone(55, t, 1.4, { type: 'sawtooth', vol: 0.16, lp: 500, slide: 50, wet: 0.2 });
    tone(82.4, t + 0.1, 1.2, { type: 'sawtooth', vol: 0.1, lp: 500, wet: 0.2 });
    noise(t, 1.0, { vol: 0.12, type: 'bandpass', f0: 200, f1: 1800, q: 1.2, wet: 0.4 });
  }

  // ---------- generative music ----------
  const PROG = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]];
  const ARP = [0, 2, 1, 3, 2, 1, 3, 2];

  function playStep(s, t) {
    const ch = PROG[Math.floor(s / 8) % 4];
    const st = s % 8;
    const sh = keyShift;
    const mb = { bus: musicBus };
    if (st === 0) {
      ch.slice(0, 3).forEach((n) => tone(midi(n + sh), t, 2.6, { type: 'triangle', vol: 0.035, attack: 0.5, wet: 0.5, lp: 1400, ...mb }));
      tone(midi(ch[0] - 12 + sh), t, 1.2, { vol: 0.16, attack: 0.01, wet: 0.1, ...mb });
    }
    if (st === 4) tone(midi(ch[0] - 12 + sh), t, 0.8, { vol: 0.1, attack: 0.01, wet: 0.1, ...mb });
    if (st === 0 || st === 4) tone(120, t, 0.14, { vol: 0.18, slide: 45, wet: 0, ...mb });
    if (intensity > 0.25 && st % 2 === 1) noise(t, 0.04, { vol: 0.02 + intensity * 0.025, type: 'highpass', f0: 7000, wet: 0.05, ...mb });
    if (Math.random() < 0.82) {
      const n = ch[ARP[st] % ch.length] + 12 + sh;
      tone(midi(n), t, 0.35, { type: 'triangle', vol: 0.045 + intensity * 0.035, attack: 0.005, wet: 0.5, ...mb });
      if (intensity > 0.6 && st % 2 === 0) tone(midi(n + 12), t, 0.25, { type: 'sine', vol: 0.03, wet: 0.5, ...mb });
    }
    if (st === 6 && Math.random() < 0.4) {
      tone(midi(72 + sh + PENT[Math.floor(Math.random() * 5)] + (Math.random() < 0.5 ? 12 : 0)), t, 0.9, { vol: 0.05, wet: 0.7, ...mb });
    }
  }

  function sched() {
    if (!ok() || !musicOn) return;
    intensity += (targetIntensity - intensity) * 0.08;
    if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05;
    while (nextT < ctx.currentTime + 0.3) {
      playStep(step, nextT);
      nextT += 0.3 - 0.05 * intensity;
      step++;
    }
  }

  function setMusic(on) {
    musicOn = on;
    if (ctx) musicBus.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.3);
  }

  return {
    init,
    resume,
    state: () => (ctx ? ctx.state : 'none'),
    smash, bounce, ignite, extinguish, fire, gem, levelComplete, mission, milestone, die, countdown, unlock, boss,
    setMusic,
    // Lower the music while the host speaks.
    // While the host speaks: music almost off, game effects well below her voice.
    duck: (on) => {
      if (!ctx) return;
      musicBus.gain.setTargetAtTime(on ? 0.06 : (musicOn ? 0.5 : 0), ctx.currentTime, 0.15);
      sfxBus.gain.setTargetAtTime(on ? 0.3 : 1, ctx.currentTime, 0.12);
    },
    // Overall game loudness (live mode keeps the game under the host's voice).
    setMaster: (v) => { if (init()) master.gain.value = v; },
    toggleMusic: () => { setMusic(!musicOn); return musicOn; },
    setIntensity: (v) => { targetIntensity = Math.max(0, Math.min(1, v)); },
    setKey: (level) => { keyShift = [0, 2, -2, 3, 5, -1, 7, -4][level % 8]; },
  };
})();
