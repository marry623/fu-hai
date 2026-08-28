/**
 * audio.js — file-based BGM + UI/game SFX (浮骸)
 * Assets under /audio/
 */

const BGM_FILES = {
  hub: 'audio/bgm_hub.mp3',
  cover: 'audio/bgm_hub.mp3',
  tutorial: 'audio/bgm_zone_tutorial.mp3',
  0: 'audio/bgm_zone_0_coral.mp3',
  1: 'audio/bgm_zone_1_jungle.mp3',
  2: 'audio/bgm_zone_2_fog.mp3',
  3: 'audio/bgm_zone_3_storm.mp3',
  4: 'audio/bgm_zone_4_lava.mp3',
};

const SFX_FILES = {
  uiClick: 'audio/ui_click.ogg',
  uiConfirm: 'audio/ui_confirm.ogg',
  uiOpen: 'audio/ui_open.ogg',
  uiClose: 'audio/ui_close.ogg',
  uiBuy: 'audio/ui_buy.ogg',
  uiSell: 'audio/ui_sell.ogg',
  uiDeny: 'audio/ui_deny.ogg',
  uiEquip: 'audio/ui_equip.ogg',
  paddle: 'audio/sfx_paddle.mp3',
  fishCast: 'audio/sfx_fish_cast.mp3',
  fishBite: 'audio/sfx_fish_bite.ogg',
  fishCatch: 'audio/sfx_fish_catch.ogg',
  fishMiss: 'audio/sfx_fish_miss.ogg',
  collect: 'audio/sfx_collect.ogg',
  rewardPickup: 'audio/sfx_reward_pickup.mp3',
  repair: 'audio/sfx_repair.ogg',
  skill: 'audio/sfx_skill.mp3',
  ramHit: 'audio/sfx_ram_hit.mp3',
  monsterHit: 'audio/sfx_monster_hit.mp3',
  monsterKill: 'audio/sfx_monster_kill.mp3',
  evacuate: 'audio/sfx_evacuate.mp3',
  sink: 'audio/sfx_sink.mp3',
};

/** Quiet bed */
const BGM_VOLUME = 0.22;
const SFX_VOLUME = 0.55;

let _enabled = true;
let _theme = null;
let _pending = null;
let _el = null;
let _fadeTimer = 0;
let _unlocked = false;
const _sfxLast = new Map();
let _gestureHooked = false;

function hookGestureUnlock() {
  if (_gestureHooked || typeof document === 'undefined') return;
  _gestureHooked = true;
  const kick = () => {
    _unlocked = true;
  };
  document.addEventListener('pointerdown', kick, { capture: true });
  document.addEventListener('keydown', kick, { capture: true });
}
hookGestureUnlock();

function resolveKey(zoneOrKey) {
  if (zoneOrKey === 'hub' || zoneOrKey === 'cover') return zoneOrKey === 'cover' ? 'cover' : 'hub';
  if (zoneOrKey === 'tutorial') return 'tutorial';
  const z = zoneOrKey | 0;
  if (z === -1) return 'tutorial';
  if (z >= 0 && z <= 4) return String(z);
  return 'hub';
}

function ensureEl() {
  if (_el) return _el;
  _el = new Audio();
  _el.loop = true;
  _el.preload = 'none';
  _el.volume = 0;
  return _el;
}

function clearFade() {
  if (_fadeTimer) {
    clearInterval(_fadeTimer);
    _fadeTimer = 0;
  }
}

function fadeTo(target, ms = 700) {
  const el = ensureEl();
  clearFade();
  const start = el.volume;
  const t0 = performance.now();
  _fadeTimer = setInterval(() => {
    const u = Math.min(1, (performance.now() - t0) / ms);
    el.volume = Math.max(0, Math.min(1, start + (target - start) * u));
    if (u >= 1) {
      clearFade();
      if (target <= 0.001) {
        try { el.pause(); } catch (_) {}
      }
    }
  }, 40);
}

function playTheme(key) {
  const src = BGM_FILES[key] || BGM_FILES.hub;
  const el = ensureEl();
  const nextVol = _enabled ? BGM_VOLUME : 0;

  const startTrack = () => {
    try {
      if (el.getAttribute('data-src') !== src) {
        el.src = src;
        el.setAttribute('data-src', src);
        el.load();
      }
      el.loop = true;
      if (!_enabled) {
        el.pause();
        el.volume = 0;
        return;
      }
      const go = () => {
        el.volume = 0;
        const p = el.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
        fadeTo(nextVol, 900);
      };
      if (el.readyState >= 2) go();
      else el.addEventListener('canplay', go, { once: true });
    } catch (_) {}
  };

  try {
    if (!_el.paused && el.volume > 0.01 && el.getAttribute('data-src') && el.getAttribute('data-src') !== src) {
      fadeTo(0, 400);
      setTimeout(startTrack, 420);
    } else {
      startTrack();
    }
  } catch (_) {
    startTrack();
  }
}

/**
 * @param {'hub'|'cover'|'tutorial'|number} zoneOrKey
 */
export function setBgmTheme(zoneOrKey) {
  const key = resolveKey(zoneOrKey);
  _pending = key;
  if (!_unlocked) return;
  if (_theme === key && _el && !_el.paused) return;
  _theme = key;
  playTheme(key);
}

export function unlockAudio() {
  _unlocked = true;
  try {
    ensureEl();
  } catch (_) {}
  const key = _pending || _theme || 'cover';
  _theme = null;
  setBgmTheme(key === '0' || key === '1' || key === '2' || key === '3' || key === '4'
    ? Number(key)
    : key);
}

function playSfx(id, { gapMs = 60 } = {}) {
  if (!_enabled) return;
  // Any intentional SFX call counts as unlock (must stay sync with user gesture)
  _unlocked = true;
  const src = SFX_FILES[id];
  if (!src) return;
  const now = performance.now();
  if (now - (_sfxLast.get(id) || 0) < gapMs) return;
  _sfxLast.set(id, now);
  try {
    // Fresh Audio() each time — cloneNode often fails silently on OGG
    const node = new Audio(src);
    node.volume = SFX_VOLUME;
    const p = node.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch (_) {}
}

export function uiClick() { playSfx('uiClick', { gapMs: 40 }); }
export function uiConfirm() { playSfx('uiConfirm', { gapMs: 60 }); }
export function uiOpen() { playSfx('uiOpen', { gapMs: 60 }); }
export function uiClose() { playSfx('uiClose', { gapMs: 60 }); }
export function uiBuy() { playSfx('uiBuy', { gapMs: 70 }); }
export function uiSell() { playSfx('uiSell', { gapMs: 70 }); }
export function uiDeny() { playSfx('uiDeny', { gapMs: 80 }); }
export function uiEquip() { playSfx('uiEquip', { gapMs: 60 }); }

export function paddle(opts = {}) {
  const combo = opts.combo | 0;
  playSfx('paddle', { gapMs: combo >= 4 ? 90 : 160 });
}
export function fishCast() { playSfx('fishCast', { gapMs: 120 }); }
export function fishBite() { playSfx('fishBite', { gapMs: 100 }); }
export function fishCatch() { playSfx('fishCatch', { gapMs: 100 }); }
export function fishMiss() { playSfx('fishMiss', { gapMs: 80 }); }
export function collect() { playSfx('collect', { gapMs: 80 }); }
export function rewardPickup() { playSfx('rewardPickup', { gapMs: 180 }); }
export function repair() { playSfx('repair', { gapMs: 80 }); }
export function skill() { playSfx('skill', { gapMs: 80 }); }
export function ramHit() { playSfx('ramHit', { gapMs: 90 }); }
export function monsterHit() { playSfx('monsterHit', { gapMs: 80 }); }
export function monsterKill() { playSfx('monsterKill', { gapMs: 100 }); }
export function evacuateSuccess() { playSfx('evacuate', { gapMs: 200 }); }
export function sinkSound() { playSfx('sink', { gapMs: 300 }); }

export function setEnabled(on) {
  _enabled = !!on;
  if (!_unlocked) return;
  try {
    if (!_enabled) fadeTo(0, 300);
    else if (_pending || _theme) {
      const keep = _pending || _theme;
      _theme = null;
      setBgmTheme(keep === '0' || keep === '1' || keep === '2' || keep === '3' || keep === '4'
        ? Number(keep)
        : keep);
    }
  } catch (_) {}
}

export function isEnabled() {
  return _enabled;
}

export function setBgmVolume(v) {
  const vol = Math.max(0, Math.min(0.5, v));
  if (_el && _enabled && !_el.paused) _el.volume = vol;
}

export function getBgmTheme() {
  return _theme || _pending;
}
