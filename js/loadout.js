/** Apply persisted loadout into a fresh run state */

import { getFishDef } from './fishCatalog.js';
import { equipFish, SLOT_ORDER } from './slots.js';

/**
 * Apply meta.loadout onto boat + mutable run state.
 * Mutates state.fishHold, state.slots, state.inventory and boat mounts.
 */
export function applyLoadoutToRun(boat, state, meta, gradientMap) {
  const lo = meta.loadout || {};
  state.inventory = {
    bait: lo.supplies?.bait ?? 3,
    plank: lo.supplies?.plank ?? 1,
    repair: lo.supplies?.repair ?? 1,
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
      category: 'food', color: 0x4ecdc4, vitality: 100, slot: null,
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
