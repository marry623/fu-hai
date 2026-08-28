/** In-run fish synthesis: odds preview + roll. Output ignores map pools. */

import { spawnFishOfRarity } from './fishCatalog.js?v=41c';

const TIER = {
  2: { down: 0.12, same: 0.78, up: 0.10 },
  3: { down: 0.08, same: 0.70, up: 0.22 },
  4: { down: 0.05, same: 0.58, up: 0.37 },
};

const HIDDEN_N = { 2: 0.003, 3: 0.008, 4: 0.015 };
const MATCH_MOVE = 0.08;
const HIDDEN_CAP = 0.15;

function fishRarity(f) {
  return Math.max(1, Math.min(6, (f?.rarity | 0) || 1));
}

export function fmtCraftPct(x) {
  const p = Math.max(0, Number(x) * 100);
  if (p < 10) {
    const s = p.toFixed(1).replace(/\.0$/, '');
    return `${s}%`;
  }
  return `${Math.round(p)}%`;
}

export function previewCraftOdds(fishes) {
  const list = (fishes || []).filter(Boolean);
  const n = list.length;
  if (n < 2 || n > 4) return null;
  const rarities = list.map(fishRarity);
  const R = Math.max(...rarities);
  const atMax = rarities.filter((r) => r === R).length;
  const base = TIER[n];
  let down = base.down;
  let same = base.same;
  let up = base.up;
  if (atMax >= 2) {
    const move = Math.min(MATCH_MOVE, same);
    same -= move;
    up += move;
  }
  let hidden = HIDDEN_N[n];
  if (R >= 6) hidden += 0.08;
  else if (R >= 5) hidden += 0.05;
  else if (R >= 4) hidden += 0.02;
  hidden = Math.min(HIDDEN_CAP, hidden);
  return {
    n,
    R,
    down,
    same,
    up,
    hidden,
    rarityDown: Math.max(1, Math.min(5, R - 1)),
    raritySame: Math.max(1, Math.min(5, R)),
    rarityUp: Math.max(1, Math.min(5, R + 1)),
  };
}

export function rollCraft(fishes, rng = Math.random) {
  const odds = previewCraftOdds(fishes);
  if (!odds) return { ok: false, reason: 'need-2' };
  if (rng() < odds.hidden) {
    return { ok: true, fish: spawnFishOfRarity(6), hidden: true, rarity: 6 };
  }
  const t = rng();
  let rarity = odds.raritySame;
  if (t < odds.down) rarity = odds.rarityDown;
  else if (t >= odds.down + odds.same) rarity = odds.rarityUp;
  return { ok: true, fish: spawnFishOfRarity(rarity), hidden: false, rarity };
}
