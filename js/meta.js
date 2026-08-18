/** Meta progression via localStorage — hub / warehouse / codex / zones */

const KEY = 'fuhai_meta_v1';

const EMPTY_SLOTS = () => ({
  bow: null, stern: null, sideL: null, sideR: null, keel: null, sail: null,
});

/** Persist flag: old saves multiply fragments ×10 once. */
const ECON_V2 = 2;

export const CONSUMABLE_HULLS = ['heavyRaft', 'chargeBoat'];
export const HULL_NAMES = {
  raft: '木筏',
  heavyRaft: '重筏',
  chargeBoat: '冲锋船',
};

export function ownsHull(unlocks, id) {
  if (!id || id === 'raft' || id === 'lightBoat' || id === 'cursedBoat') return true;
  return !!unlocks?.[id];
}

export function clampBoatId(unlocks, boatId) {
  const raw = boatId === 'lightBoat' || boatId === 'cursedBoat' ? 'raft' : (boatId || 'raft');
  return ownsHull(unlocks, raw) ? raw : 'raft';
}

const DEFAULT = {
  fragments: 40,
  econV2: ECON_V2,
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
    skills: ['skillFrost', 'skillStorm', 'skillMeteor'],
  },
  unlockedZones: [0],
  tutorialDone: false,
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
    const migrated = (data.econV2 | 0) < ECON_V2;
    const m = normalizeMeta(data);
    if (migrated) saveMeta(m);
    return m;
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
      skills: Array.isArray(data.loadout?.skills) ? data.loadout.skills : [],
    },
    unlockedZones: Array.isArray(data.unlockedZones) && data.unlockedZones.length
      ? [...new Set(data.unlockedZones.filter((z) => (z | 0) >= 0))].sort((a, b) => a - b)
      : [0],
    tutorialDone: !!data.tutorialDone,
    econV2: ECON_V2,
  };
  if ((data.econV2 | 0) < ECON_V2) {
    m.fragments = (m.fragments || 0) * 10;
  }
  m.loadout.boatId = clampBoatId(m.unlocks, m.loadout.boatId);
  m.loadout.skills = normalizeSkills(m.unlocks, m.loadout.skills);
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
  boatId = 'raft',
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
    tutorialDone: !!meta.tutorialDone,
  };

  const isTutorial = (startZone | 0) === -1;
  const success = outcome === 'return';

  if (isTutorial) {
    if (success) m.tutorialDone = true;
    // Sandbox only — mark done, no warehouse fish/supplies, no fragment farm
    const gain = 0;
    if (!m.unlockedZones.includes(0)) m.unlockedZones.push(0);
    m.unlockedZones.sort((a, b) => a - b);
    saveMeta(m);
    return { meta: m, gain, success, lostHull: null };
  }

  const boat = clampBoatId(meta.unlocks, boatId);
  // Voyage paycheck — distance is the main term; mods no longer pay (was re-equip farmable).
  const base = 40 + Math.floor(distance / 15) + Math.floor(kills / 3) * 10 + newFishCount * 10;
  const gain = success ? base : Math.max(10, Math.floor(base * 0.4));
  m.fragments += gain;
  m.bestDistance = Math.max(m.bestDistance || 0, distance);

  let lostHull = null;
  if (!success && CONSUMABLE_HULLS.includes(boat) && m.unlocks[boat]) {
    m.unlocks[boat] = false;
    lostHull = boat;
  }
  m.loadout = {
    ...m.loadout,
    boatId: clampBoatId(m.unlocks, m.loadout?.boatId || boat),
  };

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
    if (next > 0 && next < 5 && !m.unlockedZones.includes(next)) m.unlockedZones.push(next);
  }
  m.unlockedZones = [...new Set(m.unlockedZones.filter((z) => (z | 0) >= 0))].sort((a, b) => a - b);

  saveMeta(m);
  return { meta: m, gain, success, lostHull };
}

export const SHOP_TABS = [
  { id: 'sell', name: '出售鱼类' },
  { id: 'hull', name: '船体型号' },
  { id: 'supply', name: '物资' },
  { id: 'weapon', name: '技能牌' },
  { id: 'talent', name: '局外天赋' },
];

/** Sell price in fragments by rarity — side income, not better than a good return. */
export function fishSellPrice(fish) {
  if (!fish) return 0;
  if (fish.defId === 'food' || fish.category === 'food') return 10;
  const table = { 1: 10, 2: 20, 3: 40, 4: 70, 5: 120 };
  return table[fish.rarity] ?? 10;
}

export const SHOP_HULLS = [
  { id: 'heavyRaft', name: '重筏', cost: 180, tone: '#3a6aaa', desc: '中阶 · 耐久 120 · 推力 −15%。买的是一艘在港船，沉船后丢失，需重买。木筏始终免费。' },
  { id: 'chargeBoat', name: '冲锋船', cost: 280, tone: '#6a2a8a', desc: '高阶 · 耐久 95 · 推力 +40%。沉船后丢失，需重买。' },
];

export const SHOP_SUPPLIES = [
  { id: 'bait', name: '鱼饵', cost: 20, amount: 3, tone: '#4ecdc4', desc: '购买 ×3，放入仓库。出港最多带 3。' },
  { id: 'plank', name: '木板', cost: 40, amount: 1, tone: '#c4a06a', desc: '购买 ×1，放入仓库。出港最多带 1。' },
  { id: 'repair', name: '修补剂', cost: 60, amount: 1, tone: '#6a9ac4', desc: '购买 ×1，放入仓库。出港最多带 1。' },
];

export const SHOP_WEAPONS = [
  { id: 'skillFrost', name: '霜矛', cost: 0, tone: '#b8e8ff', desc: '出航自带 · 直线冰晶，路径短晕，近处冻断缠绕' },
  { id: 'skillStorm', name: '雷矛', cost: 0, tone: '#7ad8ff', desc: '出航自带 · 电弧穿刺，穿过最多两只' },
  { id: 'skillMeteor', name: '陨石', cost: 0, tone: '#ff6030', desc: '出航自带 · 抛物砸落，范围击杀并解缠' },
  { id: 'skillVoid', name: '虚空裂缝', cost: 80, tone: '#66e0ff', desc: '学会 · 一线裂空，暗核青边，路径割伤' },
  { id: 'skillPhoenix', name: '炎凤', cost: 90, tone: '#ff7a20', desc: '学会 · 火鸟俯冲，撞击烧蚀并解缠' },
  { id: 'skillSingularity', name: '引力奇点', cost: 110, tone: '#a060ff', desc: '学会 · 圈内吸积塌缩，范围击杀' },
  { id: 'skillWorldroot', name: '根茎绽放', cost: 90, tone: '#5adf40', desc: '学会 · 水面生树，圈内定身击杀' },
  { id: 'skillBeam', name: '光束炮', cost: 120, tone: '#7ab8ff', desc: '学会 · 持续光束，直线灼穿' },
  { id: 'skillSnare', name: '电磁陷阱', cost: 85, tone: '#8a7cff', desc: '学会 · 电弧囚笼，圈内滞留击杀' },
  { id: 'skillGlacier', name: '冰封王冠', cost: 130, tone: '#c8f0ff', desc: '学会 · 环刃冰墙，圈内冻结解缠' },
];

export const FREE_SKILLS = ['skillFrost', 'skillStorm', 'skillMeteor'];

export const SKILL_SHOP_TO_VFX = {
  skillFrost: 'ice',
  skillStorm: 'thunder',
  skillMeteor: 'meteor',
  skillVoid: 'void',
  skillPhoenix: 'phoenix',
  skillSingularity: 'singularity',
  skillWorldroot: 'worldroot',
  skillBeam: 'beam',
  skillSnare: 'snare',
  skillGlacier: 'glacier',
};

export function ownsSkill(unlocks, shopId) {
  const item = SHOP_WEAPONS.find((w) => w.id === shopId);
  if (!item) return false;
  if (item.cost <= 0) return true;
  return !!unlocks?.[shopId];
}

export function ownedSkillIds(unlocks) {
  return SHOP_WEAPONS.filter((w) => ownsSkill(unlocks, w.id)).map((w) => w.id);
}

export function normalizeSkills(unlocks, skills) {
  const owned = ownedSkillIds(unlocks);
  const out = [];
  const used = new Set();
  const src = Array.isArray(skills) ? skills : [];
  for (const id of src) {
    if (out.length >= 3) break;
    if (!ownsSkill(unlocks, id) || used.has(id)) continue;
    out.push(id);
    used.add(id);
  }
  for (const id of owned) {
    if (out.length >= 3) break;
    if (used.has(id)) continue;
    out.push(id);
    used.add(id);
  }
  while (out.length < 3) out.push(FREE_SKILLS[out.length] || 'skillFrost');
  return out;
}

export function equippedSkills(meta) {
  return normalizeSkills(meta?.unlocks, meta?.loadout?.skills);
}

export function skillShopToVfx(shopId) {
  return SKILL_SHOP_TO_VFX[shopId] || 'ice';
}

export function cycleSkillSlot(meta, slotIndex) {
  const i = slotIndex | 0;
  if (i < 0 || i > 2) return meta;
  const owned = ownedSkillIds(meta.unlocks);
  const current = equippedSkills(meta);
  const used = new Set(current.filter((_, n) => n !== i));
  const pool = owned.filter((id) => !used.has(id));
  if (!pool.length) return meta;
  const idx = Math.max(0, pool.indexOf(current[i]));
  const next = pool[(idx + 1) % pool.length];
  if (next === current[i]) return meta;
  const skills = [...current];
  skills[i] = next;
  return saveLoadout(meta, { ...meta.loadout, skills });
}

export const SHOP_TALENTS = [
  { id: 'fishmongerEye', name: '鱼贩子的眼睛', cost: 160, tone: '#c45c1a', desc: '永久 · 钓鱼绿区判定 +20%' },
  { id: 'cursedBoat', name: '怪谈低语', cost: 180, tone: '#6a2a8a', desc: '永久 · 每次出港随机获得一条怪鱼' },
  { id: 'ghostWake', name: '鬼影航迹', cost: 140, tone: '#3a5a7a', desc: '永久 · 船体腐蚀减约 18%' },
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
  if (!item || item.cost <= 0) {
    return { ok: false, meta, msg: '无法购买' };
  }
  if (meta.unlocks[shopId] || meta.fragments < item.cost) {
    return { ok: false, meta, msg: meta.unlocks[shopId] ? '已拥有' : '海图碎片不足' };
  }
  const m = {
    ...meta,
    unlocks: { ...meta.unlocks, [shopId]: true },
    fragments: meta.fragments - item.cost,
    loadout: CONSUMABLE_HULLS.includes(shopId)
      ? { ...meta.loadout, boatId: shopId }
      : meta.loadout,
  };
  saveMeta(m);
  const hullNote = CONSUMABLE_HULLS.includes(shopId) ? ' · 沉船后需重买' : '';
  const verb = CONSUMABLE_HULLS.includes(shopId) ? '购入' : '学会';
  return { ok: true, meta: m, msg: `${verb} ${item.name}${hullNote}` };
}

export function buySupply(meta, supplyId) {
  const item = SHOP_SUPPLIES.find((s) => s.id === supplyId);
  if (!item) return { ok: false, meta, msg: '无效物资' };
  if (meta.fragments < item.cost) return { ok: false, meta, msg: '海图碎片不足' };
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
  return { ok: true, meta: m, msg: `售出 ${fish.name} +${price} 海图碎片`, price };
}

export function tryUnlockZone(meta, zoneId) {
  if (meta.unlockedZones.includes(zoneId)) return { ok: false, meta, msg: '已解锁' };
  const cost = ZONE_UNLOCK_COST[zoneId];
  if (cost == null) return { ok: false, meta, msg: '无效海域' };
  // need previous zone unlocked
  if (zoneId > 0 && !meta.unlockedZones.includes(zoneId - 1)) {
    return { ok: false, meta, msg: '需先解锁上一海域' };
  }
  if (meta.fragments < cost) return { ok: false, meta, msg: '海图碎片不足' };
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
  const skills = equippedSkills(meta);
  return weaponIndex >= 0 && weaponIndex < 3 && !!skills[weaponIndex];
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
