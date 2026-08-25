/** Apply persisted loadout into a fresh run state */

import { getFishDef } from './fishCatalog.js?v=34b';
import { equipFish, SLOT_ORDER } from './slots.js?v=39b';
import { deepLedgerBonusBait, equippedTalents } from './meta.js?v=35l';

const RUN_START_BAIT = 20;

function baitKindFromKey(key) {
  if (key === 'baitCrude') return 'crude';
  if (key === 'baitFresh') return 'fresh';
  if (key === 'baitScale') return 'scale';
  if (key === 'baitAbyss') return 'abyss';
  return null;
}

/**
 * Apply meta.loadout onto boat + mutable run state.
 * Mutates state.fishHold, state.slots, state.inventory and boat mounts.
 */
export function applyLoadoutToRun(boat, state, meta, gradientMap) {
  const lo = meta.loadout || {};
  const bag = Array.isArray(lo.supplies?.bag) ? lo.supplies.bag : [];
  const baitBag = [];
  let plank = 0;
  let repair = 0;
  let paste = 0;
  for (const slot of bag) {
    if (!slot) continue;
    const key = typeof slot === 'string' ? slot : slot.key;
    const n = typeof slot === 'string' ? 1 : Math.max(1, slot.n | 0);
    const kind = baitKindFromKey(key);
    if (kind) {
      for (let i = 0; i < n; i++) baitBag.push(kind);
    } else if (key === 'plank') plank += n;
    else if (key === 'repair') repair += n;
    else if (key === 'paste') paste += n;
  }
  const giftKind = 'crude';
  for (let i = 0; i < RUN_START_BAIT; i++) baitBag.push(giftKind);
  const bonusCrude = deepLedgerBonusBait(meta, equippedTalents(meta));
  for (let i = 0; i < bonusCrude; i++) baitBag.push('crude');

  state.inventory = {
    baitBag,
    bait: baitBag.length,
    baitKind: baitBag[0] || giftKind,
    plank,
    repair,
    paste,
    relics: [],
  };

  // Clear mounts
  Object.keys(boat.userData.mounts || {}).forEach((k) => {
    const m = boat.userData.mounts[k];
    while (m.children.length) m.remove(m.children[0]);
  });
  state.slots = { bow: null, stern: null, sideL: null, sideR: null, keel: null, sail: null };

  for (const slot of SLOT_ORDER) {
    const f = lo.slots?.[slot];
    if (!f?.defId) continue;
    const item = {
      kind: 'fish',
      defId: f.defId,
      name: f.name || getFishDef(f.defId).name,
      rarity: f.rarity || getFishDef(f.defId).rarity,
      category: f.category || getFishDef(f.defId).category,
      color: f.color ?? getFishDef(f.defId).color,
      slot: getFishDef(f.defId).slot,
      vitality: f.vitality ?? 100,
      eat: f.eat || null,
    };
    equipFish(boat, state.slots, item, slot, gradientMap);
  }

  state.fishHold = (lo.cargo || []).map((f) => ({
    kind: 'fish',
    defId: f.defId,
    name: f.name || getFishDef(f.defId).name,
    rarity: f.rarity || getFishDef(f.defId).rarity,
    category: f.category || getFishDef(f.defId).category,
    color: f.color ?? getFishDef(f.defId).color,
    slot: getFishDef(f.defId).slot,
    vitality: f.vitality ?? 100,
    eat: f.eat || null,
  }));

  let equipped = 0;
  for (const slot of SLOT_ORDER) {
    if (state.slots[slot]) equipped++;
  }
  state.mods = equipped;

  // Ensure at least one food if empty
  if (state.fishHold.length === 0 && equipped === 0) {
    state.fishHold.push({
      kind: 'fish', defId: 'food', name: '食物鱼', rarity: 1,
      category: 'food', color: 0x4ecdc4, vitality: 100, slot: null, eat: { heal: 20 },
    });
  }
}

/** Collect run fish (hold + slots) for warehouse deposit */
export function collectRunFish(state) {
  const out = [];
  for (const f of state.fishHold || []) out.push({ ...f });
  for (const slot of Object.keys(state.slots || {})) {
    const f = state.slots[slot];
    if (f) out.push({ ...f, slot: f.slot || slot });
  }
  return out;
}
