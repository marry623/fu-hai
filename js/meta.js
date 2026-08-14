/** Meta progression via localStorage — hub / warehouse / codex / zones */

const KEY = 'fuhai_meta_v1';

const EMPTY_SLOTS = () => ({
  bow: null, stern: null, sideL: null, sideR: null, keel: null, sail: null,
});

const DEFAULT = {
  fragments: 0,
  unlocks: {
    raft: true,
    lightBoat: false,
    heavyRaft: false,
    cursedBoat: false,
    fishmongerEye: false,
  },
  bestDistance: 0,
  codex: {},
  warehouse: {
    fish: [
      { defId: 'food', name: '食物鱼', rarity: 1, category: 'food', color: 0x4ecdc4, vitality: 100, slot: null },
      { defId: 'food', name: '食物鱼', rarity: 1, category: 'food', color: 0x4ecdc4, vitality: 100, slot: null },
    ],
    supplies: { bait: 6, plank: 2, repair: 2 },
  },
  loadout: {
    boatId: 'raft',
    slots: EMPTY_SLOTS(),
    cargo: [],
    supplies: { bait: 3, plank: 1, repair: 1 },
  },
  unlockedZones: [0],
  hullRepair: 100, // prep-time hull % stored as absolute max fill preference
};

export function emptySlots() {
  return EMPTY_SLOTS();
}

export function loadMeta() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return cloneDefault();
    const data = JSON.parse(raw);
    return normalizeMeta(data);
  } catch {
    return cloneDefault();
  }
}

function cloneDefault() {
  return normalizeMeta(JSON.parse(JSON.stringify(DEFAULT)));
}

function normalizeMeta(data) {
  const m = {
    ...DEFAULT,
    ...data,
    unlocks: { ...DEFAULT.unlocks, ...(data.unlocks || {}) },
    codex: { ...(data.codex || {}) },
    warehouse: {
      fish: Array.isArray(data.warehouse?.fish) ? data.warehouse.fish : [],
      supplies: {
        bait: data.warehouse?.supplies?.bait ?? DEFAULT.warehouse.supplies.bait,
        plank: data.warehouse?.supplies?.plank ?? DEFAULT.warehouse.supplies.plank,
        repair: data.warehouse?.supplies?.repair ?? DEFAULT.warehouse.supplies.repair,
      },
    },
    loadout: {
      boatId: data.loadout?.boatId || 'raft',
      slots: { ...EMPTY_SLOTS(), ...(data.loadout?.slots || {}) },
      cargo: Array.isArray(data.loadout?.cargo) ? data.loadout.cargo : [],
      supplies: {
        bait: data.loadout?.supplies?.bait ?? 3,
        plank: data.loadout?.supplies?.plank ?? 1,
        repair: data.loadout?.supplies?.repair ?? 1,
      },
    },
    unlockedZones: Array.isArray(data.unlockedZones) && data.unlockedZones.length
      ? [...new Set(data.unlockedZones)].sort((a, b) => a - b)
      : [0],
  };
  return m;
}

export function saveMeta(meta) {
  localStorage.setItem(KEY, JSON.stringify(meta));
}

/** Discover fish species into codex; returns newly discovered ids */
export function discoverFish(meta, defIds) {
  const m = { ...meta, unlocks: { ...meta.unlocks }, codex: { ...meta.codex } };
  const neu = [];
  for (const id of defIds) {
    if (!id || m.codex[id]) continue;
    m.codex[id] = true;
    neu.push(id);
  }
  if (neu.length) saveMeta(m);
  return { meta: m, newIds: neu };
}

/**
 * Settle a run.
 * @param {'return'|'sink'} outcome
 */
export function settleRun(meta, {
  distance, mods, kills, newFishCount = 0,
  outcome = 'sink',
  fishToStore = [],
  suppliesToStore = null,
  startZone = 0,
}) {
  const m = {
    ...meta,
    unlocks: { ...meta.unlocks },
    codex: { ...meta.codex },
    warehouse: {
      fish: [...(meta.warehouse?.fish || [])],
      supplies: { ...(meta.warehouse?.supplies || { bait: 0, plank: 0, repair: 0 }) },
    },
    unlockedZones: [...(meta.unlockedZones || [0])],
  };

  const success = outcome === 'return';
  const base = Math.floor(distance / 200) + mods + Math.floor(kills / 2) + newFishCount * 2;
  const gain = Math.max(success ? 2 : 1, success ? base : Math.max(1, Math.floor(base * 0.45)));
  m.fragments += gain;
  m.bestDistance = Math.max(m.bestDistance || 0, distance);

  // Warehouse fish: full on return, none on sink (discourage sink-farming)
  if (success && fishToStore.length) {
    for (const f of fishToStore) {
      m.warehouse.fish.push({
        defId: f.defId,
        name: f.name,
        rarity: f.rarity,
        category: f.category,
        color: f.color,
        vitality: Math.max(5, Math.min(100, Math.floor(f.vitality ?? 100))),
        slot: f.slot ?? null,
      });
    }
  }

  if (success && suppliesToStore) {
    m.warehouse.supplies.bait += suppliesToStore.bait || 0;
    m.warehouse.supplies.plank += suppliesToStore.plank || 0;
    m.warehouse.supplies.repair += suppliesToStore.repair || 0;
  }

  // Unlock next zone by distance milestones OR successful return from current sea
  const zoneUnlockAt = [0, 400, 900, 1600, 2500];
  for (let i = 0; i < zoneUnlockAt.length; i++) {
    if (distance >= zoneUnlockAt[i] && !m.unlockedZones.includes(i)) {
      m.unlockedZones.push(i);
    }
  }
  if (success) {
    const next = (startZone | 0) + 1;
    if (next < 5 && !m.unlockedZones.includes(next)) m.unlockedZones.push(next);
  }
  m.unlockedZones.sort((a, b) => a - b);

  saveMeta(m);
  return { meta: m, gain, success };
}

export const SHOP = [
  { id: 'lightBoat', name: '轻舟', cost: 8, desc: '快，耐久上限 80' },
  { id: 'heavyRaft', name: '重筏', cost: 10, desc: '慢，耐久上限 120' },
  { id: 'cursedBoat', name: '怪谈船', cost: 14, desc: '开局随机怪鱼' },
  { id: 'fishmongerEye', name: '鱼贩子的眼睛', cost: 12, desc: '钓鱼绿区 +20%' },
];

export const ZONE_UNLOCK_COST = [
  null, // 0 free
  5,
  12,
  20,
  30,
];

export function tryUnlock(meta, shopId) {
  const item = SHOP.find((s) => s.id === shopId);
  if (!item || meta.unlocks[shopId] || meta.fragments < item.cost) {
    return { ok: false, meta, msg: '无法购买' };
  }
  const m = {
    ...meta,
    unlocks: { ...meta.unlocks, [shopId]: true },
    fragments: meta.fragments - item.cost,
  };
  saveMeta(m);
  return { ok: true, meta: m, msg: `解锁 ${item.name}` };
}

export function tryUnlockZone(meta, zoneId) {
  if (meta.unlockedZones.includes(zoneId)) return { ok: false, meta, msg: '已解锁' };
  const cost = ZONE_UNLOCK_COST[zoneId];
  if (cost == null) return { ok: false, meta, msg: '无效海域' };
  // need previous zone unlocked
  if (zoneId > 0 && !meta.unlockedZones.includes(zoneId - 1)) {
    return { ok: false, meta, msg: '需先解锁上一海域' };
  }
  if (meta.fragments < cost) return { ok: false, meta, msg: '碎片不足' };
  const m = {
    ...meta,
    fragments: meta.fragments - cost,
    unlockedZones: [...meta.unlockedZones, zoneId].sort((a, b) => a - b),
  };
  saveMeta(m);
  return { ok: true, meta: m, msg: '海域已解锁' };
}

export function hullMaxForBoat(unlocks, selected) {
  if (selected === 'heavyRaft' && unlocks.heavyRaft) return 120;
  if (selected === 'lightBoat' && unlocks.lightBoat) return 80;
  return 100;
}

export function thrustMulForBoat(selected, unlocks) {
  if (selected === 'lightBoat' && unlocks.lightBoat) return 1.2;
  if (selected === 'heavyRaft' && unlocks.heavyRaft) return 0.85;
  return 1;
}

/** Spend fragments to repair "prep hull" marker / grant repair kits into warehouse */
export function hubRepairHull(meta, cost = 2) {
  if (meta.fragments < cost) return { ok: false, meta, msg: '碎片不足' };
  const m = {
    ...meta,
    fragments: meta.fragments - cost,
    warehouse: {
      ...meta.warehouse,
      supplies: {
        ...meta.warehouse.supplies,
        repair: (meta.warehouse.supplies.repair || 0) + 1,
      },
    },
  };
  saveMeta(m);
  return { ok: true, meta: m, msg: '获得修补剂 ×1' };
}

export function hubFeedFish(meta, warehouseIndex, amount = 30) {
  const list = [...(meta.warehouse?.fish || [])];
  const target = list[warehouseIndex];
  if (!target) return { ok: false, meta, msg: '无效鱼类' };
  const foodIdx = list.findIndex(
    (f, i) => i !== warehouseIndex && (f.defId === 'food' || f.category === 'food')
  );
  if (foodIdx < 0) return { ok: false, meta, msg: '仓库没有食物鱼可投喂' };
  const next = list.filter((_, i) => i !== foodIdx);
  const idx = foodIdx < warehouseIndex ? warehouseIndex - 1 : warehouseIndex;
  next[idx] = {
    ...next[idx],
    vitality: Math.min(100, (next[idx].vitality || 0) + amount),
  };
  const m = {
    ...meta,
    warehouse: { ...meta.warehouse, fish: next },
  };
  saveMeta(m);
  return { ok: true, meta: m, msg: `投喂成功 +${amount} 活性` };
}

export function saveLoadout(meta, loadout) {
  const m = { ...meta, loadout: { ...meta.loadout, ...loadout } };
  saveMeta(m);
  return m;
}

export function moveWarehouseToLoadoutCargo(meta, warehouseIndex) {
  const f = meta.warehouse.fish[warehouseIndex];
  if (!f) return { ok: false, meta };
  const cargo = [...(meta.loadout.cargo || [])];
  if (cargo.length >= 8) return { ok: false, meta, msg: '携带已满' };
  cargo.push(f);
  const fish = meta.warehouse.fish.filter((_, i) => i !== warehouseIndex);
  const m = {
    ...meta,
    warehouse: { ...meta.warehouse, fish },
    loadout: { ...meta.loadout, cargo },
  };
  saveMeta(m);
  return { ok: true, meta: m };
}

export function returnCargoToWarehouse(meta, cargoIndex) {
  const cargo = [...(meta.loadout?.cargo || [])];
  const f = cargo[cargoIndex];
  if (!f) return { ok: false, meta };
  cargo.splice(cargoIndex, 1);
  const m = {
    ...meta,
    warehouse: {
      ...meta.warehouse,
      fish: [...meta.warehouse.fish, f],
    },
    loadout: { ...meta.loadout, cargo },
  };
  saveMeta(m);
  return { ok: true, meta: m };
}

export function equipFromWarehouse(meta, warehouseIndex, slot) {
  const f = meta.warehouse.fish[warehouseIndex];
  if (!f) return { ok: false, meta, msg: '无效' };
  if (f.slot && f.slot !== slot) return { ok: false, meta, msg: '槽位不符' };
  if (!f.slot && f.category === 'food') return { ok: false, meta, msg: '食物鱼不能绑槽' };
  const useSlot = f.slot || slot;
  const slots = { ...meta.loadout.slots };
  const prev = slots[useSlot];
  slots[useSlot] = { ...f, vitality: f.vitality ?? 100 };
  let fish = meta.warehouse.fish.filter((_, i) => i !== warehouseIndex);
  if (prev) fish.push(prev);
  const m = {
    ...meta,
    warehouse: { ...meta.warehouse, fish },
    loadout: { ...meta.loadout, slots },
  };
  saveMeta(m);
  return { ok: true, meta: m };
}

export function unequipToWarehouse(meta, slot) {
  const cur = meta.loadout.slots?.[slot];
  if (!cur) return { ok: false, meta };
  const slots = { ...meta.loadout.slots, [slot]: null };
  const fish = [...meta.warehouse.fish, cur];
  const m = {
    ...meta,
    warehouse: { ...meta.warehouse, fish },
    loadout: { ...meta.loadout, slots },
  };
  saveMeta(m);
  return { ok: true, meta: m };
}

/** Pull supplies from warehouse into loadout for departure */
export function syncLoadoutSuppliesFromWarehouse(meta) {
  const w = meta.warehouse.supplies;
  const take = {
    bait: Math.min(3, w.bait || 0),
    plank: Math.min(1, w.plank || 0),
    repair: Math.min(1, w.repair || 0),
  };
  const m = {
    ...meta,
    warehouse: {
      ...meta.warehouse,
      supplies: {
        bait: (w.bait || 0) - take.bait,
        plank: (w.plank || 0) - take.plank,
        repair: (w.repair || 0) - take.repair,
      },
    },
    loadout: { ...meta.loadout, supplies: take },
  };
  saveMeta(m);
  return m;
}

/** After fish are applied to the run, clear loadout so they are not duplicated */
export function consumeLoadoutOnDepart(meta) {
  const m = {
    ...meta,
    loadout: {
      ...meta.loadout,
      slots: emptySlots(),
      cargo: [],
      supplies: { bait: 0, plank: 0, repair: 0 },
    },
  };
  saveMeta(m);
  return m;
}
