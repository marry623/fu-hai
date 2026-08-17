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
    chargeBoat: false,
    cursedBoat: false,
    fishmongerEye: false,
    ghostWake: false,
    weaponHarpoon: true,
    weaponKnife: false,
    weaponSling: false,
  },
  bestDistance: 0,
  codex: {},
  monsterCodex: {},
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
    monsterCodex: { ...(data.monsterCodex || {}) },
    warehouse: {
      fish: Array.isArray(data.warehouse?.fish) ? data.warehouse.fish : [],
      supplies: {
        bait: data.warehouse?.supplies?.bait ?? DEFAULT.warehouse.supplies.bait,
        plank: data.warehouse?.supplies?.plank ?? DEFAULT.warehouse.supplies.plank,
        repair: data.warehouse?.supplies?.repair ?? DEFAULT.warehouse.supplies.repair,
      },
    },
    loadout: {
      boatId: (() => {
        const id = data.loadout?.boatId || 'raft';
        if (id === 'cursedBoat' || id === 'lightBoat') return 'raft';
        return id;
      })(),
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
  const m = { ...meta, unlocks: { ...meta.unlocks }, codex: { ...meta.codex }, monsterCodex: { ...(meta.monsterCodex || {}) } };
  const neu = [];
  for (const id of defIds) {
    if (!id || m.codex[id]) continue;
    m.codex[id] = true;
    neu.push(id);
  }
  if (neu.length) saveMeta(m);
  return { meta: m, newIds: neu };
}

/** Discover monsters into bestiary */
export function discoverMonster(meta, monsterIds) {
  const m = {
    ...meta,
    unlocks: { ...meta.unlocks },
    codex: { ...(meta.codex || {}) },
    monsterCodex: { ...(meta.monsterCodex || {}) },
  };
  const neu = [];
  for (const id of monsterIds) {
    if (!id || m.monsterCodex[id]) continue;
    m.monsterCodex[id] = true;
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
    monsterCodex: { ...(meta.monsterCodex || {}) },
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

export const SHOP_TABS = [
  { id: 'sell', name: '出售鱼类' },
  { id: 'hull', name: '船体型号' },
  { id: 'supply', name: '物资' },
  { id: 'weapon', name: '武器' },
  { id: 'talent', name: '局外天赋' },
];

/** Sell price in fragments by rarity */
export function fishSellPrice(fish) {
  if (!fish) return 0;
  if (fish.defId === 'food' || fish.category === 'food') return 1;
  const table = { 1: 2, 2: 5, 3: 10, 5: 20 };
  return table[fish.rarity] ?? 2;
}

export const SHOP_HULLS = [
  { id: 'heavyRaft', name: '重筏', cost: 10, tone: '#3a6aaa', desc: '中阶 · 耐久 120 · 推力 −15%' },
  { id: 'chargeBoat', name: '冲锋船', cost: 14, tone: '#6a2a8a', desc: '高阶 · 耐久 95 · 推力 +40%' },
];

export const SHOP_SUPPLIES = [
  { id: 'bait', name: '鱼饵', cost: 2, amount: 3, tone: '#4ecdc4', desc: '购买 ×3，放入仓库' },
  { id: 'plank', name: '木板', cost: 3, amount: 1, tone: '#c4a06a', desc: '购买 ×1，放入仓库' },
  { id: 'repair', name: '修补剂', cost: 4, amount: 1, tone: '#6a9ac4', desc: '购买 ×1，放入仓库' },
];

export const SHOP_WEAPONS = [
  { id: 'weaponHarpoon', name: '鱼叉', cost: 5, tone: '#5a7a8a', desc: '远程点射，默认可用' },
  { id: 'weaponKnife', name: '刀', cost: 6, tone: '#9aa4b2', desc: '近身斩断缠绕触手' },
  { id: 'weaponSling', name: '投石', cost: 6, tone: '#8a6a48', desc: '短距投掷骚扰' },
];

export const SHOP_TALENTS = [
  { id: 'fishmongerEye', name: '鱼贩子的眼睛', cost: 12, tone: '#c45c1a', desc: '钓鱼绿区判定 +20%' },
  { id: 'cursedBoat', name: '怪谈低语', cost: 14, tone: '#6a2a8a', desc: '出港时随机获得一条怪鱼' },
  { id: 'ghostWake', name: '鬼影航迹', cost: 10, tone: '#3a5a7a', desc: '开局腐蚀抗性略增（预留）' },
];

/** Flat unlock catalog (hull / weapon / talent) */
export const SHOP = [
  ...SHOP_HULLS,
  ...SHOP_WEAPONS,
  ...SHOP_TALENTS,
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
    return { ok: false, meta, msg: meta.unlocks[shopId] ? '已拥有' : '碎片不足或无法购买' };
  }
  const m = {
    ...meta,
    unlocks: { ...meta.unlocks, [shopId]: true },
    fragments: meta.fragments - item.cost,
  };
  saveMeta(m);
  return { ok: true, meta: m, msg: `解锁 ${item.name}` };
}

export function buySupply(meta, supplyId) {
  const item = SHOP_SUPPLIES.find((s) => s.id === supplyId);
  if (!item) return { ok: false, meta, msg: '无效物资' };
  if (meta.fragments < item.cost) return { ok: false, meta, msg: '碎片不足' };
  const supplies = { ...(meta.warehouse?.supplies || { bait: 0, plank: 0, repair: 0 }) };
  supplies[item.id] = (supplies[item.id] || 0) + item.amount;
  const m = {
    ...meta,
    fragments: meta.fragments - item.cost,
    warehouse: { ...meta.warehouse, supplies },
  };
  saveMeta(m);
  return { ok: true, meta: m, msg: `购入 ${item.name} ×${item.amount}` };
}

export function sellWarehouseFish(meta, warehouseIndex) {
  const list = [...(meta.warehouse?.fish || [])];
  const fish = list[warehouseIndex];
  if (!fish) return { ok: false, meta, msg: '无效鱼类' };
  const price = fishSellPrice(fish);
  list.splice(warehouseIndex, 1);
  const m = {
    ...meta,
    fragments: (meta.fragments || 0) + price,
    warehouse: { ...meta.warehouse, fish: list },
  };
  saveMeta(m);
  return { ok: true, meta: m, msg: `售出 ${fish.name} +${price} 碎片`, price };
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
  if (selected === 'chargeBoat' && unlocks.chargeBoat) return 95;
  return 100;
}

export function thrustMulForBoat(selected, unlocks) {
  if (selected === 'heavyRaft' && unlocks.heavyRaft) return 0.85;
  if (selected === 'chargeBoat' && unlocks.chargeBoat) return 1.4;
  return 1;
}

export function hasWeaponUnlock(meta, weaponIndex) {
  const ids = ['weaponHarpoon', 'weaponKnife', 'weaponSling'];
  const id = ids[weaponIndex];
  if (!id) return false;
  if (id === 'weaponHarpoon') return meta.unlocks?.weaponHarpoon !== false;
  return !!meta.unlocks?.[id];
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
