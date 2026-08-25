/**
 * In-run HUD zone palettes — retint classic neon HUD tokens on #hud.
 * --panel + --ink-on-panel keep contrast: light panel → dark ink, dark panel → light ink.
 */

/** @typedef {{ name: string, vars: Record<string, string> }} HudTheme */

/** @type {Record<number, HudTheme>} */
export const HUD_THEMES = {
  [-1]: {
    name: 'practice',
    vars: {
      '--panel': 'rgba(232, 248, 250, 0.92)',
      '--border': '#5ec8d4',
      '--mint': '#2a9aaa',
      '--pink': '#e87a8c',
      '--pink-hot': '#d45a70',
      '--gold': '#c49a3d',
      '--teal': '#3ab8c4',
      '--teal-dark': '#1a7a88',
      '--ink-on-panel': '#1a3038',
      '--ink-muted': 'rgba(26, 48, 56, 0.72)',
    },
  },
  0: {
    name: 'coral',
    vars: {
      '--panel': 'rgba(255, 248, 236, 0.92)',
      '--border': '#ff8aa8',
      '--mint': '#3aa8b8',
      '--pink': '#ff6b9d',
      '--pink-hot': '#f04a7a',
      '--gold': '#e8b84a',
      '--teal': '#4ec8d4',
      '--teal-dark': '#2a8a98',
      '--ink-on-panel': '#1a3038',
      '--ink-muted': 'rgba(26, 48, 56, 0.72)',
    },
  },
  1: {
    name: 'kelp',
    vars: {
      '--panel': 'rgba(10, 16, 12, 0.88)',
      '--border': '#8fd96a',
      '--mint': '#b8f080',
      '--pink': '#f0a04a',
      '--pink-hot': '#e08830',
      '--gold': '#ffe08a',
      '--teal': '#6ecf7a',
      '--teal-dark': '#3a8a48',
      '--ink-on-panel': '#f2f8f0',
      '--ink-muted': 'rgba(242, 248, 240, 0.75)',
    },
  },
  2: {
    name: 'wreck',
    vars: {
      '--panel': 'rgba(18, 12, 8, 0.9)',
      '--border': '#e8c060',
      '--mint': '#f0d890',
      '--pink': '#d4a060',
      '--pink-hot': '#c48840',
      '--gold': '#ffe29a',
      '--teal': '#d4b06a',
      '--teal-dark': '#8a6828',
      '--ink-on-panel': '#fff6e8',
      '--ink-muted': 'rgba(255, 246, 232, 0.75)',
    },
  },
  3: {
    name: 'rift',
    vars: {
      '--panel': 'rgba(10, 8, 18, 0.9)',
      '--border': '#a78bfa',
      '--mint': '#c4b5fd',
      '--pink': '#c084fc',
      '--pink-hot': '#a855f7',
      '--gold': '#fde68a',
      '--teal': '#818cf8',
      '--teal-dark': '#4f46e5',
      '--ink-on-panel': '#f0ecff',
      '--ink-muted': 'rgba(240, 236, 255, 0.75)',
    },
  },
  4: {
    name: 'trench',
    vars: {
      '--panel': 'rgba(16, 8, 8, 0.9)',
      '--border': '#ff8a4a',
      '--mint': '#ffb088',
      '--pink': '#ff6b4a',
      '--pink-hot': '#ff4428',
      '--gold': '#ffd27a',
      '--teal': '#ff9a5c',
      '--teal-dark': '#c45a28',
      '--ink-on-panel': '#fff0e8',
      '--ink-muted': 'rgba(255, 240, 232, 0.75)',
    },
  },
};

/**
 * @param {number} zoneId
 * @param {HTMLElement | null} [hudEl]
 */
export function applyHudTheme(zoneId, hudEl = document.getElementById('hud')) {
  if (!hudEl) return;
  const id = zoneId | 0;
  const theme = HUD_THEMES[id] || HUD_THEMES[0];
  hudEl.dataset.biome = theme.name;
  for (const [key, value] of Object.entries(theme.vars)) {
    hudEl.style.setProperty(key, value);
  }
  const pink = theme.vars['--pink'];
  const border = theme.vars['--border'];
  if (pink) hudEl.style.setProperty('--dusk-pink', pink);
  if (border) hudEl.style.setProperty('--dusk-orange', border);
}
