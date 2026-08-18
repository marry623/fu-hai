/**
 * audio.js — 程序化合成音效引擎（浮骸）
 *
 * 纯 Web Audio API 合成，零外部音频文件。
 * 所有音效在首次用户交互后惰性初始化。
 */

let _ctx = null;
let _master = null;
let _enabled = true;

// ── 内部工具 ──────────────────────────────────────────────────

function ctx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
    _master = _ctx.createGain();
    _master.gain.value = 0.5;
    _master.connect(_ctx.destination);
    const resume = () => _ctx.state === 'suspended' && _ctx.resume();
    document.addEventListener('pointerdown', resume);
    document.addEventListener('keydown', resume);
  }
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function out() { ctx(); return _master; }

/**
 * @param {{ type?:string, freq:number, freqEnd?:number,
 *           vol?:number, a?:number, d?:number, delay?:number }} opts
 */
function tone({ type = 'sine', freq, freqEnd, vol = 0.2, a = 0.005, d = 0.2, delay = 0 } = {}) {
  if (!_enabled) return;
  const c = ctx();
  const fire = () => {
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    if (freqEnd != null) {
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t + a + d);
    }
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(1e-4, t + a + d);
    o.connect(g);
    g.connect(out());
    o.start(t);
    o.stop(t + a + d + 0.05);
  };
  delay ? setTimeout(fire, delay) : fire();
}

/**
 * @param {{ vol?:number, a?:number, d?:number,
 *           lpFreq?:number, hpFreq?:number,
 *           bpFreq?:number, bpQ?:number, delay?:number }} opts
 */
function white({ vol = 0.2, a = 0.003, d = 0.15,
                 lpFreq, hpFreq, bpFreq, bpQ = 1, delay = 0 } = {}) {
  if (!_enabled) return;
  const c = ctx();
  const fire = () => {
    const dur = a + d + 0.05;
    const sampleRate = c.sampleRate;
    const buf = c.createBuffer(1, Math.ceil(sampleRate * dur), sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    const t = c.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(1e-4, t + a + d);
    src.connect(g);
    let last = g;
    if (lpFreq != null) {
      const f = c.createBiquadFilter(); f.type = 'lowpass';
      f.frequency.value = lpFreq; last.connect(f); last = f;
    }
    if (hpFreq != null) {
      const f = c.createBiquadFilter(); f.type = 'highpass';
      f.frequency.value = hpFreq; last.connect(f); last = f;
    }
    if (bpFreq != null) {
      const f = c.createBiquadFilter(); f.type = 'bandpass';
      f.frequency.value = bpFreq; f.Q.value = bpQ; last.connect(f); last = f;
    }
    last.connect(out());
    src.start(t);
    src.stop(t + dur);
  };
  delay ? setTimeout(fire, delay) : fire();
}

// ── 公开音效 ──────────────────────────────────────────────────

/** 桨击水声；内部限频防止过密 */
export const paddle = (() => {
  let _lastAt = 0;
  return () => {
    if (!_enabled) return;
    const now = performance.now();
    if (now - _lastAt < 160) return;
    _lastAt = now;
    white({ vol: 0.17, a: 0.004, d: 0.11, bpFreq: 250 + Math.random() * 130, bpQ: 0.9 });
    white({ vol: 0.07, a: 0.002, d: 0.05, hpFreq: 2000 + Math.random() * 1000 });
  };
})();

/** 抛竿：线鸣 + 浮漂落水 */
export function fishCast() {
  if (!_enabled) return;
  tone({ type: 'sawtooth', freq: 820, freqEnd: 160, vol: 0.07, a: 0.01, d: 0.18 });
  white({ vol: 0.22, a: 0.003, d: 0.1, bpFreq: 380, bpQ: 1.1, delay: 270 });
}

/** QTE 咬钩提示 */
export function fishBite() {
  if (!_enabled) return;
  tone({ freq: 880, vol: 0.22, a: 0.006, d: 0.28, freqEnd: 660 });
  tone({ freq: 1100, vol: 0.13, a: 0.006, d: 0.16, delay: 75 });
}

/** 钓鱼成功；rarity 1-5 决定音符数量 */
export function fishCatch(rarity = 1) {
  if (!_enabled) return;
  const bases = [440, 550, 660, 880, 1100];
  const n = Math.min(rarity + 1, 5);
  for (let i = 0; i < n; i++) {
    tone({ freq: bases[i % bases.length], vol: 0.15 + i * 0.02, a: 0.01, d: 0.22 + i * 0.04, delay: i * 85 });
  }
}

/** 船体受击 */
export function damage() {
  if (!_enabled) return;
  tone({ freq: 80, freqEnd: 35, vol: 0.42, a: 0.002, d: 0.18 });
  white({ vol: 0.28, a: 0.001, d: 0.12, lpFreq: 280 });
}

/** 修理/回血 */
export function repair() {
  if (!_enabled) return;
  tone({ freq: 660, vol: 0.15, a: 0.01, d: 0.13 });
  tone({ freq: 880, vol: 0.13, a: 0.01, d: 0.11, delay: 115 });
  tone({ freq: 1100, vol: 0.1, a: 0.01, d: 0.09, delay: 225 });
}

/** 打捞成功 */
export function collect() {
  if (!_enabled) return;
  tone({ type: 'triangle', freq: 540, vol: 0.18, a: 0.01, d: 0.18 });
  tone({ type: 'triangle', freq: 760, vol: 0.15, a: 0.01, d: 0.16, delay: 75 });
  tone({ freq: 1020, vol: 0.11, a: 0.01, d: 0.13, delay: 150 });
}

/**
 * 施放技能
 * @param {string} id  VFX card id
 */
export function skill(id) {
  if (!_enabled) return;
  if (id === 'ice') {
    for (let i = 0; i < 4; i++) {
      tone({ type: 'triangle', freq: 1200 + i * 190, vol: 0.11, a: 0.004, d: 0.15, delay: i * 33 });
      white({ vol: 0.07, a: 0.002, d: 0.07, hpFreq: 2600, delay: i * 33 });
    }
  } else if (id === 'thunder') {
    tone({ type: 'sawtooth', freq: 200, freqEnd: 55, vol: 0.28, a: 0.001, d: 0.09 });
    white({ vol: 0.3, a: 0.001, d: 0.1, bpFreq: 1100, bpQ: 0.8 });
    tone({ type: 'sawtooth', freq: 440, freqEnd: 110, vol: 0.14, a: 0.001, d: 0.13, delay: 25 });
  } else if (id === 'void') {
    tone({ freq: 90, freqEnd: 28, vol: 0.32, a: 0.02, d: 0.42 });
    white({ vol: 0.22, a: 0.008, d: 0.28, hpFreq: 2400 });
    tone({ type: 'sawtooth', freq: 620, freqEnd: 140, vol: 0.1, a: 0.004, d: 0.22, delay: 70 });
  } else if (id === 'phoenix') {
    tone({ type: 'sawtooth', freq: 180, freqEnd: 420, vol: 0.2, a: 0.04, d: 0.28 });
    white({ vol: 0.26, a: 0.01, d: 0.32, lpFreq: 900 });
    tone({ type: 'triangle', freq: 520, freqEnd: 180, vol: 0.14, a: 0.01, d: 0.35, delay: 180 });
  } else if (id === 'singularity') {
    tone({ freq: 70, freqEnd: 22, vol: 0.4, a: 0.05, d: 0.7 });
    white({ vol: 0.18, a: 0.02, d: 0.45, lpFreq: 180 });
    tone({ type: 'sine', freq: 240, freqEnd: 40, vol: 0.22, a: 0.002, d: 0.18, delay: 420 });
  } else if (id === 'worldroot') {
    tone({ type: 'triangle', freq: 140, freqEnd: 70, vol: 0.22, a: 0.008, d: 0.18 });
    white({ vol: 0.16, a: 0.006, d: 0.22, bpFreq: 420, bpQ: 0.9 });
    tone({ type: 'triangle', freq: 220, freqEnd: 110, vol: 0.12, a: 0.01, d: 0.2, delay: 90 });
  } else if (id === 'beam') {
    tone({ type: 'sawtooth', freq: 260, freqEnd: 880, vol: 0.16, a: 0.08, d: 0.22 });
    tone({ type: 'sine', freq: 880, freqEnd: 440, vol: 0.12, a: 0.02, d: 0.55, delay: 160 });
    white({ vol: 0.14, a: 0.02, d: 0.4, hpFreq: 1800, delay: 140 });
  } else if (id === 'snare') {
    for (let i = 0; i < 5; i++) {
      tone({ type: 'sawtooth', freq: 380 - i * 40, freqEnd: 90, vol: 0.12, a: 0.001, d: 0.08, delay: i * 42 });
      white({ vol: 0.16, a: 0.001, d: 0.07, bpFreq: 900 + i * 80, bpQ: 1.1, delay: i * 42 });
    }
  } else if (id === 'glacier') {
    for (let i = 0; i < 5; i++) {
      tone({ type: 'triangle', freq: 880 + i * 140, vol: 0.1, a: 0.006, d: 0.22, delay: i * 45 });
    }
    white({ vol: 0.14, a: 0.01, d: 0.35, hpFreq: 1800 });
    tone({ freq: 90, freqEnd: 40, vol: 0.2, a: 0.02, d: 0.4, delay: 80 });
  } else {
    tone({ freq: 55, freqEnd: 26, vol: 0.45, a: 0.002, d: 0.36 });
    white({ vol: 0.38, a: 0.005, d: 0.26, lpFreq: 200 });
    tone({ type: 'triangle', freq: 160, freqEnd: 55, vol: 0.18, a: 0.01, d: 0.3, delay: 80 });
  }
}

/** 灯塔归航成功 */
export function evacuateSuccess() {
  if (!_enabled) return;
  [523, 659, 784, 1047].forEach((f, i) =>
    tone({ freq: f, vol: 0.18 + i * 0.02, a: 0.01, d: 0.3 + i * 0.05, delay: i * 110 })
  );
}

/** 沉船 */
export function sinkSound() {
  if (!_enabled) return;
  tone({ freq: 110, freqEnd: 28, vol: 0.38, a: 0.05, d: 1.2 });
  white({ vol: 0.32, a: 0.05, d: 1.4, lpFreq: 180 });
  tone({ freq: 55, freqEnd: 22, vol: 0.28, a: 0.1, d: 0.9, delay: 300 });
}

/** UI 轻点击 */
export function uiClick() {
  if (!_enabled) return;
  tone({ freq: 440, vol: 0.1, a: 0.003, d: 0.06 });
}

// ── 控制接口 ─────────────────────────────────────────────────

export function setEnabled(on) { _enabled = !!on; }
export function isEnabled() { return _enabled; }
export function setVolume(v) {
  if (!_master) ctx();
  _master.gain.value = Math.max(0, Math.min(1, v));
}