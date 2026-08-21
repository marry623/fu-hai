/** Meta progression via localStorage — hub / warehouse / codex / zones */

import { getFishDef, shopBuyCost, BAIT_KINDS } from './fishCatalog.js?v=34b';
import {
  APPRAISE_COST,
  RELIC_CARRY_CAP,
  getRelicDef,
  rollSellPrice,
  sealedSellPrice,
  trimRelicCarry,
} from './salvageTables.js?v=35d';

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
  },
  bestDistance: 0,
  codex: {},
  monsterCodex: {},
  warehouse: {
    fish: [
      { defId: 'food', name: '食物鱼', rarity: 1, category: 'food', color: 0x4ecdc4, vitality: 100, slot: null, eat: { heal: 20 } },
      { defId: 'food', name: '食物鱼', rarity: 1, category: 'food', color: 0x4ecdc4, vitality: 100, slot: null, eat: { heal: 20 } },
    ],
    supplies: { baitCrude: 0, baitFresh: 3, baitScale: 0, baitAbyss: 0, plank: 1, repair: 1, paste: 0 },
    relics: [],
  },
  relicCodex: {},
  loadout: {
    boatId: 'raft',
    slots: EMPTY_SLOTS(),
    cargo: [],
    supplies: {
      bag: ['baitFresh', 'baitFresh', 'baitFresh', 'plank', 'repair', null, null, null],
      baitKind: 'fresh',
    },
    skills: ['skillFrost', 'skillStorm', 'skillMeteor'],
  },
  skillLevels: { skillFrost: 1, skillStorm: 1, skillMeteor: 1 },
  talentLevels: {},
  unlockedZones: [0],
  tutorialDone: false,
  hubIntroDone: false,
  hullRepair: 100, // prep-time hull % stored as absolute max fill preference
};

function emptySupplies() {
  return { baitCrude: 0, baitFresh: 0, baitScale: 0, baitAbyss: 0, plank: 0, repair: 0, paste: 0 };
}

function normalizeSupplies(raw = {}) {
  const s = { ...emptySupplies(), ...(raw || {}) };
  if ((raw.bait | 0) > 0 && !(raw.baitFresh | 0) && !(raw.baitCrude | 0)) {
    s.baitFresh = raw.bait | 0;
  }
  delete s.bait;
  return s;
}

export const LOADOUT_BAG_SIZE = 8;
export const LOADOUT_STACK_MAX = 50;
export const RUN_START_BAIT = 20;

function emptyBag() {
  return Array(LOADOUT_BAG_SIZE).fill(null);
}

function isSupplyKey(key) {
  return key === 'plank' || key === 'repair' || key === 'paste' || !!supplyKindFromKey(key);
}

function bagSlotKey(slot) {
  if (!slot) return null;
  if (typeof slot === 'string') return isSupplyKey(slot) ? slot : null;
  return isSupplyKey(slot.key) ? slot.key : null;
}

function bagSlotCount(slot) {
  if (!slot) return 0;
  if (typeof slot === 'string') return 1;
  const n = slot.n | 0;
  return n > 0 ? n : 1;
}

function compactLoadoutBag(rawList) {
  const bag = emptyBag();
  for (const slot of rawList || []) {
    const key = bagSlotKey(slot);
    if (!key) continue;
    let left = Math.min(LOADOUT_STACK_MAX * LOADOUT_BAG_SIZE, bagSlotCount(slot));
    while (left > 0) {
      let i = bag.findIndex((s) => s && s.key === key && s.n < LOADOUT_STACK_MAX);
      if (i < 0) i = bag.findIndex((s) => !s);
      if (i < 0) break;
      if (!bag[i]) bag[i] = { key, n: 0 };
      const take = Math.min(left, LOADOUT_STACK_MAX - bag[i].n);
      bag[i].n += take;
      left -= take;
    }
  }
  return bag;
}

export function tallyLoadoutBag(bag) {
  let bait = 0;
  let plank = 0;
  let repair = 0;
  let paste = 0;
  let baitKind = 'fresh';
  for (const slot of bag || []) {
    const key = bagSlotKey(slot);
    if (!key) continue;
    const n = bagSlotCount(slot);
    const kind = supplyKindFromKey(key);
    if (kind) {
      bait += n;
      baitKind = kind;
    } else if (key === 'plank') plank += n;
    else if (key === 'repair') repair += n;
    else if (key === 'paste') paste += n;
  }
  return { bait, plank, repair, paste, baitKind };
}

function normalizeLoadoutSupplies(raw = {}) {
  const preferred = BAIT_KINDS[raw.baitKind] ? raw.baitKind : 'fresh';
  let bag;
  if (Array.isArray(raw.bag)) {
    bag = compactLoadoutBag(raw.bag);
  } else {
    const units = [];
    const baitKey = BAIT_KINDS[preferred].key;
    for (let n = 0; n < (raw.bait | 0); n++) units.push(baitKey);
    for (let n = 0; n < (raw.plank | 0); n++) units.push('plank');
    for (let n = 0; n < (raw.repair | 0); n++) units.push('repair');
    for (let n = 0; n < (raw.paste | 0); n++) units.push('paste');
    bag = compactLoadoutBag(units);
  }
  const t = tallyLoadoutBag(bag);
  return {
    bag,
    baitKind: t.bait ? t.baitKind : preferred,
    bait: t.bait,
    plank: t.plank,
    repair: t.repair,
    paste: t.paste,
  };
}

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
      supplies: normalizeSupplies(data.warehouse?.supplies),
      relics: Array.isArray(data.warehouse?.relics) ? data.warehouse.relics : [],
    },
    relicCodex: { ...(data.relicCodex || {}) },
    loadout: {
      boatId: (() => {
        const id = data.loadout?.boatId || 'raft';
        if (id === 'cursedBoat' || id === 'lightBoat') return 'raft';
        return id;
      })(),
      slots: { ...EMPTY_SLOTS(), ...(data.loadout?.slots || {}) },
      cargo: Array.isArray(data.loadout?.cargo) ? data.loadout.cargo : [],
      supplies: normalizeLoadoutSupplies(data.loadout?.supplies),
      skills: Array.isArray(data.loadout?.skills) ? data.loadout.skills : [],
    },
    skillLevels: { skillFrost: 1, skillStorm: 1, skillMeteor: 1, ...(data.skillLevels || {}) },
    talentLevels: { ...(data.talentLevels || {}) },
    unlockedZones: Array.isArray(data.unlockedZones) && data.unlockedZones.length
      ? [...new Set(data.unlockedZones.filter((z) => (z | 0) >= 0))].sort((a, b) => a - b)
      : [0],
    tutorialDone: !!data.tutorialDone,
    hubIntroDone: !!data.hubIntroDone,
    econV2: ECON_V2,
  };
  if ((data.econV2 | 0) < ECON_V2) {
    m.fragments = (m.fragments || 0) * 10;
  }
  m.loadout.boatId = clampBoatId(m.unlocks, m.loadout.boatId);
  m.loadout.skills = normalizeSkills(m.unlocks, m.loadout.skills);
  delete m.unlocks.weaponHarpoon;
  delete m.unlocks.weaponKnife;
  delete m.unlocks.weaponSling;
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
  relicsToStore = null,
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
      relics: [...(meta.warehouse?.relics || [])],
    },
    relicCodex: { ...(meta.relicCodex || {}) },
    unlockedZones: [...(meta.unlockedZones || [0])],
    tutorialDone: !!meta.tutorialDone,
    hubIntroDone: !!meta.hubIntroDone,
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
  // Sink pays 0 fragments so wrecking cannot farm the return formula.
  const base = 40 + Math.floor(distance / 15) + Math.floor(kills / 3) * 10 + newFishCount * 10;
  const gain = success ? base : 0;
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
    const w = normalizeSupplies(m.warehouse.supplies);
    if (Array.isArray(suppliesToStore.baitBag) && suppliesToStore.baitBag.length) {
      for (const kind of suppliesToStore.baitBag) {
        const key = BAIT_KINDS[kind]?.key;
        if (key) w[key] = (w[key] | 0) + 1;
      }
    } else {
      const kind = BAIT_KINDS[suppliesToStore.baitKind] ? suppliesToStore.baitKind : 'fresh';
      const baitKey = BAIT_KINDS[kind].key;
      w[baitKey] = (w[baitKey] | 0) + (suppliesToStore.bait | 0);
    }
    w.plank = (w.plank | 0) + (suppliesToStore.plank | 0);
    w.repair = (w.repair | 0) + (suppliesToStore.repair | 0);
    w.paste = (w.paste | 0) + (suppliesToStore.paste | 0);
    m.warehouse.supplies = w;
  }

  if (success && Array.isArray(relicsToStore) && relicsToStore.length) {
    const { list: kept } = trimRelicCarry(relicsToStore, RELIC_CARRY_CAP);
    for (const r of kept) {
      if (!r) continue;
      m.warehouse.relics.push({
        uid: r.uid || `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        defId: r.defId,
        tier: r.tier | 0,
        hidden: !!r.hidden,
        sealed: r.sealed !== false,
        sellPrice: r.sellPrice | 0,
      });
    }
  }

  // Unlock the next sea only after a successful return from this one
  if (success) {
    const cur = startZone | 0;
    if (cur >= 0) {
      const next = cur + 1;
      if (next < 5 && !m.unlockedZones.includes(next)) m.unlockedZones.push(next);
    }
  }
  m.unlockedZones = [...new Set(m.unlockedZones.filter((z) => (z | 0) >= 0))].sort((a, b) => a - b);

  saveMeta(m);
  return { meta: m, gain, success, lostHull };
}

export const SHOP_TABS = [
  { id: 'sell', name: '出售' },
  { id: 'hull', name: '船体型号' },
  { id: 'supply', name: '物资' },
  { id: 'weapon', name: '技能牌' },
  { id: 'talent', name: '局外天赋' },
];

/** Sell price in fragments by rarity — side income, not better than a good return. */
export function fishSellPrice(fish) {
  if (!fish) return 0;
  if (fish.defId === 'food' || fish.defId === 'glue' || fish.category === 'food') return 10;
  const table = { 1: 10, 2: 20, 3: 40, 4: 70, 5: 120, 6: 200 };
  return table[fish.rarity] ?? 10;
}

export const SHOP_HULLS = [
  { id: 'heavyRaft', name: '重筏', cost: 180, tone: '#3a6aaa', desc: '中阶。更耐，更钝。沉船丢失，需重买。耐久 120 · 推力 ×0.85。' },
  { id: 'chargeBoat', name: '冲锋船', cost: 280, tone: '#6a2a8a', desc: '高阶。更快更脆。沉船丢失，需重买。耐久 95 · 推力 ×1.40。' },
];

export const SHOP_SUPPLIES = [
  { id: 'baitCrude', zone: 'bait', name: '粗饵', cost: 12, amount: 4, tone: '#8aa090', desc: '星级权重不变。抛竿耗 1。×4 入仓。' },
  { id: 'baitFresh', zone: 'bait', name: '鲜饵', cost: 20, amount: 3, tone: '#4ecdc4', desc: '抛竿耗 1。×3 入仓。权重 ★−8 / ★★+5 / ★★★+3。本图没有的星仍为 0。' },
  { id: 'baitScale', zone: 'bait', name: '亮鳞饵', cost: 50, amount: 3, tone: '#d4c060', desc: '抛竿耗 1。×3 入仓。权重 ★−16 / ★★−4 / ★★★+2 / ★★★★+8 / 五星+6 / 隐藏+4。未解锁星的加分拨到本图最高的 2–4 星。' },
  { id: 'baitAbyss', zone: 'bait', name: '深渊饵', cost: 90, amount: 2, tone: '#6a40a0', desc: '抛竿耗 1。×2 入仓。权重 ★−18 / ★★−10 / ★★★0 / ★★★★+10 / 五星+14 / 隐藏+4。未解锁星的加分拨到本图最高的 2–4 星。' },
  { id: 'plank', zone: 'repair', name: '木板', cost: 40, amount: 1, tone: '#c4a06a', desc: '占背包 1 格。×1 入仓。R +15 耐久。' },
  { id: 'repair', zone: 'repair', name: '修补剂', cost: 60, amount: 1, tone: '#6a9ac4', desc: '可与龙骨膏同带。×1 入仓。+25 耐久。' },
  { id: 'paste', zone: 'repair', name: '龙骨膏', cost: 110, amount: 1, tone: '#c45c1a', desc: '大修。×1 入仓。+45 耐久。' },
];

export const SHOP_WEAPONS = [
  { id: 'skillFrost', name: '霜矛', cost: 0, tone: '#b8e8ff', desc: '' },
  { id: 'skillStorm', name: '雷矛', cost: 0, tone: '#7ad8ff', desc: '' },
  { id: 'skillMeteor', name: '陨石', cost: 0, tone: '#ff6030', desc: '' },
  { id: 'skillVoid', name: '虚空裂缝', cost: 80, tone: '#66e0ff', desc: '' },
  { id: 'skillPhoenix', name: '炎凤', cost: 90, tone: '#ff7a20', desc: '' },
  { id: 'skillSingularity', name: '引力奇点', cost: 110, tone: '#a060ff', desc: '' },
  { id: 'skillWorldroot', name: '根茎绽放', cost: 90, tone: '#5adf40', desc: '' },
  { id: 'skillBeam', name: '光束炮', cost: 120, tone: '#7ab8ff', desc: '' },
  { id: 'skillSnare', name: '电磁陷阱', cost: 85, tone: '#8a7cff', desc: '' },
  { id: 'skillGlacier', name: '冰封王冠', cost: 130, tone: '#c8f0ff', desc: '' },
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
  { id: 'fishmongerEye', name: '鱼贩子的眼睛', cost: 160, tone: '#c45c1a', desc: '永久。钓鱼绿区 +20% / +32% / +45%。' },
  { id: 'cursedBoat', name: '怪谈低语', cost: 180, tone: '#6a2a8a', desc: '永久。每航次随机一条怪鱼。升级不另写数字。' },
  { id: 'ghostWake', name: '鬼影航迹', cost: 140, tone: '#3a5a7a', desc: '永久。腐蚀 ×0.82 / ×0.70 / ×0.58。' },
];

/** Flat unlock catalog (hull / weapon / talent) */
export const SHOP = [
  ...SHOP_HULLS,
  ...SHOP_WEAPONS,
  ...SHOP_TALENTS,
];

export const ZONE_TICKET_COST = [
  0, // 0 浅滩免费
  5,
  12,
  20,
  30,
];
export const ZONE_UNLOCK_COST = ZONE_TICKET_COST;

export function canDepartZone(meta, zoneId) {
  const id = zoneId | 0;
  if (id === -1) return { ok: true };
  if (!meta?.tutorialDone) {
    return { ok: false, msg: '\u9700\u5148\u5b8c\u6210\u7ec3\u4e60\u6e7e\u5f52\u822a' };
  }
  if (!(meta.unlockedZones || [0]).includes(id)) {
    return { ok: false, msg: '\u9700\u5148\u901a\u5173\u4e0a\u4e00\u4e2a\u6d77\u57df' };
  }
  return { ok: true };
}

export function zoneTicketCost(zoneId) {
  const id = zoneId | 0;
  if (id === -1) return 0;
  if (id < 0 || id >= ZONE_TICKET_COST.length) return null;
  return ZONE_TICKET_COST[id] | 0;
}

export function chargeZoneTicket(meta, zoneId) {
  const id = zoneId | 0;
  if (id === -1) return { ok: true, meta, cost: 0 };
  const gate = canDepartZone(meta, id);
  if (!gate.ok) return { ok: false, meta, msg: gate.msg };
  const cost = zoneTicketCost(id);
  if (cost == null) return { ok: false, meta, msg: '\u65e0\u6548\u6d77\u57df' };
  if (cost <= 0) return { ok: true, meta, cost: 0 };
  if ((meta.fragments | 0) < cost) {
    return { ok: false, meta, msg: `\u95e8\u7968 ${cost} \u788e\u7247\uff0c\u4f59\u989d\u4e0d\u8db3` };
  }
  const m = { ...meta, fragments: (meta.fragments | 0) - cost };
  saveMeta(m);
  return { ok: true, meta: m, cost, msg: `\u95e8\u7968 \u2212${cost}` };
}

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
    talentLevels: SHOP_TALENTS.some((t) => t.id === shopId)
      ? { ...(meta.talentLevels || {}), [shopId]: Math.max(1, meta.talentLevels?.[shopId] | 0) }
      : meta.talentLevels,
    skillLevels: SHOP_WEAPONS.some((w) => w.id === shopId)
      ? { ...(meta.skillLevels || {}), [shopId]: Math.max(1, meta.skillLevels?.[shopId] | 0) }
      : meta.skillLevels,
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
  const supplies = normalizeSupplies(meta.warehouse?.supplies);
  supplies[item.id] = (supplies[item.id] || 0) + item.amount;
  const m = {
    ...meta,
    fragments: meta.fragments - item.cost,
    warehouse: { ...meta.warehouse, supplies },
  };
  saveMeta(m);
  return { ok: true, meta: m, msg: `购入 ${item.name} ×${item.amount}` };
}

export function buyWarehouseFish(meta, defId) {
  const def = getFishDef(defId);
  const cost = shopBuyCost(def);
  if (!cost || def.rarity > 3) return { ok: false, meta, msg: '此鱼不可购' };
  if (meta.fragments < cost) return { ok: false, meta, msg: '海图碎片不足' };
  const item = {
    defId: def.id,
    name: def.name,
    rarity: def.rarity,
    category: def.category,
    color: def.id === 'food' ? 0x4ecdc4 : def.color,
    vitality: 100,
    slot: def.slot,
    eat: def.eat || (def.id === 'food' ? { heal: 20 } : null),
  };
  const m = {
    ...meta,
    fragments: meta.fragments - cost,
    warehouse: { ...meta.warehouse, fish: [...(meta.warehouse?.fish || []), item] },
  };
  saveMeta(m);
  return { ok: true, meta: m, msg: `购入 ${def.name} −${cost}` };
}

export function skillLevel(meta, shopId) {
  if (!ownsSkill(meta?.unlocks, shopId)) return 0;
  const n = meta?.skillLevels?.[shopId] | 0;
  return Math.max(1, Math.min(3, n || 1));
}

export function talentLevel(meta, id) {
  if (!meta?.unlocks?.[id]) return 0;
  const n = meta?.talentLevels?.[id] | 0;
  return Math.max(1, Math.min(3, n || 1));
}

export function skillUpgradeCost(shopId, fromLevel) {
  const free = FREE_SKILLS.includes(shopId);
  if (fromLevel === 1) return free ? 40 : 70;
  if (fromLevel === 2) return free ? 80 : 120;
  return 0;
}

export function talentUpgradeCost(fromLevel) {
  if (fromLevel === 1) return 90;
  if (fromLevel === 2) return 140;
  return 0;
}

export function upgradeSkill(meta, shopId) {
  if (!ownsSkill(meta.unlocks, shopId)) return { ok: false, meta, msg: '尚未学会' };
  const lv = skillLevel(meta, shopId);
  if (lv >= 3) return { ok: false, meta, msg: '已满级' };
  const cost = skillUpgradeCost(shopId, lv);
  if (meta.fragments < cost) return { ok: false, meta, msg: '海图碎片不足' };
  const m = {
    ...meta,
    fragments: meta.fragments - cost,
    skillLevels: { ...(meta.skillLevels || {}), [shopId]: lv + 1 },
  };
  saveMeta(m);
  return { ok: true, meta: m, msg: `${SHOP_WEAPONS.find((w) => w.id === shopId)?.name || '技能'} → ${lv + 1} 级` };
}

export function upgradeTalent(meta, id) {
  if (!meta.unlocks?.[id]) return { ok: false, meta, msg: '尚未学会' };
  const lv = talentLevel(meta, id);
  if (lv >= 3) return { ok: false, meta, msg: '已满级' };
  const cost = talentUpgradeCost(lv);
  if (meta.fragments < cost) return { ok: false, meta, msg: '海图碎片不足' };
  const m = {
    ...meta,
    fragments: meta.fragments - cost,
    talentLevels: { ...(meta.talentLevels || {}), [id]: lv + 1 },
  };
  saveMeta(m);
  return { ok: true, meta: m, msg: `${SHOP_TALENTS.find((t) => t.id === id)?.name || '天赋'} → ${lv + 1} 级` };
}

export const SKILL_LEVEL_STATS = {
  ice: { dmg: [16, 22, 29], cd: [1.2, 1.1, 1.0], stun: [1.6, 1.9, 2.2] },
  thunder: { dmg: [28, 39, 50], cd: [1.5, 1.4, 1.3] },
  meteor: { dmg: [40, 56, 72], cd: [3.5, 3.25, 3.0], radius: [5.5, 6.25, 7] },
  void: { dmg: [26, 36, 47], cd: [2.8, 2.6, 2.4] },
  phoenix: { dmg: [32, 45, 58], cd: [3.2, 2.95, 2.7] },
  singularity: { dmg: [38, 53, 68], cd: [5.0, 4.6, 4.2], radius: [5, 5.75, 6.5] },
  worldroot: { dmg: [20, 28, 36], cd: [4.2, 3.9, 3.6] },
  beam: { dmg: [22, 31, 40], cd: [4.5, 4.15, 3.8] },
  snare: { dmg: [18, 25, 32], cd: [3.8, 3.5, 3.2], radius: [4, 4.5, 5] },
  glacier: { dmg: [16, 22, 29], cd: [5.5, 5.1, 4.7] },
};

export function scaledSkillCard(baseCard, shopId, level) {
  const vfx = skillShopToVfx(shopId);
  const row = SKILL_LEVEL_STATS[vfx];
  const i = Math.max(0, Math.min(2, (level | 0) - 1));
  if (!baseCard) return baseCard;
  if (!row) return { ...baseCard };
  return {
    ...baseCard,
    dmg: row.dmg?.[i] ?? baseCard.dmg,
    cd: row.cd?.[i] ?? baseCard.cd,
    radius: row.radius?.[i] ?? baseCard.radius,
    stun: row.stun?.[i] ?? baseCard.stun,
  };
}

const SKILL_SHOP_BLURB = {
  skillFrost: { range: 24, line: '直线冻结并可斩缠绕', extra: (row) => '冻结 ' + row.stun.join('/') + ' 秒' },
  skillStorm: { range: 26, pierce: 2, line: '直线穿刺并斩缠绕' },
  skillMeteor: { range: 16, line: '落点爆炸并解缠' },
  skillVoid: { range: 22, pierce: 2, line: '直线穿刺并斩缠绕' },
  skillPhoenix: { range: 26, pierce: 2, line: '直线穿刺并解缠' },
  skillSingularity: { range: 20, line: '落点爆炸并推开缠绕' },
  skillWorldroot: { range: 20, radius: 4, line: '落点爆炸，最近目标定身 2.4 秒' },
  skillBeam: { range: 28, pierce: 4, line: '直线灼穿并斩缠绕' },
  skillSnare: { range: 18, line: '落点范围爆炸' },
  skillGlacier: { range: 18, radius: 5, line: '落点爆炸并解缠，圈内冻结 1.8 秒' },
};

export function skillShopDesc(shopId) {
  const item = SHOP_WEAPONS.find((w) => w.id === shopId);
  const vfx = skillShopToVfx(shopId);
  const row = SKILL_LEVEL_STATS[vfx];
  const b = SKILL_SHOP_BLURB[shopId] || { range: 20, line: '技能' };
  const prefix = item && item.cost <= 0 ? '出航自带。' : '';
  const bits = [];
  if (row && row.dmg) bits.push('伤害 ' + row.dmg.join('/'));
  if (row && row.cd) bits.push('冷却 ' + row.cd.join('/') + ' 秒');
  bits.push('射程 ' + b.range);
  if (row && row.radius) bits.push('半径 ' + row.radius.join('/'));
  else if (b.radius) bits.push('半径 ' + b.radius);
  if (b.pierce) bits.push('穿刺 ' + b.pierce);
  if (typeof b.extra === 'function' && row) bits.push(b.extra(row));
  return prefix + b.line + '。数字为 1/2/3 级。' + bits.join(' · ') + '。';
}

for (const w of SHOP_WEAPONS) w.desc = skillShopDesc(w.id);

export function fishmongerGreenMul(meta) {
  const lv = talentLevel(meta, 'fishmongerEye');
  return [1, 1.2, 1.32, 1.45][lv] || 1;
}

export function ghostWakeCorrMul(meta) {
  const lv = talentLevel(meta, 'ghostWake');
  return [1, 0.82, 0.7, 0.58][lv] || 1;
}

export function baitStock(supplies, kind) {
  const key = BAIT_KINDS[kind]?.key;
  if (!key) return 0;
  return normalizeSupplies(supplies)[key] | 0;
}

export function totalBait(supplies) {
  const s = normalizeSupplies(supplies);
  return (s.baitCrude | 0) + (s.baitFresh | 0) + (s.baitScale | 0) + (s.baitAbyss | 0);
}

export function setLoadoutBaitKind(meta, kind) {
  if (!BAIT_KINDS[kind]) return meta;
  return saveLoadout(meta, {
    ...meta.loadout,
    supplies: { ...normalizeLoadoutSupplies(meta.loadout?.supplies), baitKind: kind },
  });
}

export function loadoutSuppliesPacked(raw) {
  const s = normalizeLoadoutSupplies(raw);
  return (s.bag || []).some(Boolean);
}

function supplyKindFromKey(key) {
  return Object.keys(BAIT_KINDS).find((k) => BAIT_KINDS[k].key === key) || null;
}

export function packSupply(meta, key) {
  const w = normalizeSupplies(meta.warehouse?.supplies);
  const lo = normalizeLoadoutSupplies(meta.loadout?.supplies);
  if (!isSupplyKey(key)) return { ok: false, meta, msg: '\u65e0\u6548\u7269\u8d44' };
  if ((w[key] | 0) <= 0) return { ok: false, meta, msg: '\u4ed3\u5e93\u6ca1\u6709' };
  let idx = lo.bag.findIndex((slot) => slot && slot.key === key && slot.n < LOADOUT_STACK_MAX);
  if (idx < 0) idx = lo.bag.findIndex((slot) => !slot);
  if (idx < 0) return { ok: false, meta, msg: '\u80cc\u5305\u5df2\u6ee1\uff088\u683c\uff09' };
  w[key] -= 1;
  if (!lo.bag[idx]) lo.bag[idx] = { key, n: 0 };
  lo.bag[idx].n += 1;
  const next = normalizeLoadoutSupplies({ bag: lo.bag, baitKind: lo.baitKind });
  const m = {
    ...meta,
    warehouse: { ...meta.warehouse, supplies: w },
    loadout: { ...meta.loadout, supplies: next },
  };
  saveMeta(m);
  return { ok: true, meta: m, msg: '\u5df2\u88c5\u5165\u80cc\u5305' };
}

export function unpackSupply(meta, keyOrIndex) {
  const w = normalizeSupplies(meta.warehouse?.supplies);
  const lo = normalizeLoadoutSupplies(meta.loadout?.supplies);
  let idx = -1;
  if (typeof keyOrIndex === 'number' || /^\d+$/.test(String(keyOrIndex))) {
    idx = Number(keyOrIndex);
    if (idx < 0 || idx >= LOADOUT_BAG_SIZE || !lo.bag[idx]) {
      return { ok: false, meta, msg: '\u8be5\u683c\u662f\u7a7a\u7684' };
    }
  } else {
    idx = -1;
    for (let i = lo.bag.length - 1; i >= 0; i--) {
      if (lo.bag[i] && lo.bag[i].key === keyOrIndex) { idx = i; break; }
    }
    if (idx < 0) return { ok: false, meta, msg: '\u80cc\u5305\u6ca1\u6709' };
  }
  const slot = lo.bag[idx];
  const key = bagSlotKey(slot);
  if (!isSupplyKey(key)) return { ok: false, meta, msg: '\u65e0\u6548\u7269\u8d44' };
  w[key] = (w[key] | 0) + 1;
  if (bagSlotCount(slot) <= 1) lo.bag[idx] = null;
  else lo.bag[idx] = { key, n: bagSlotCount(slot) - 1 };
  const next = normalizeLoadoutSupplies({ bag: lo.bag, baitKind: lo.baitKind });
  const m = {
    ...meta,
    warehouse: { ...meta.warehouse, supplies: w },
    loadout: { ...meta.loadout, supplies: next },
  };
  saveMeta(m);
  return { ok: true, meta: m, msg: '\u5df2\u653e\u56de\u4ed3\u5e93' };
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


/** Sell every warehouse fish with rarity strictly below `belowRarity` (default: under 4★). */
export function sellWarehouseFishBelowRarity(meta, belowRarity = 4) {
  const list = meta.warehouse?.fish || [];
  const keep = [];
  let gained = 0;
  let count = 0;
  for (const fish of list) {
    if (!fish) continue;
    const r = fish.rarity | 0;
    if (r > 0 && r < (belowRarity | 0)) {
      gained += fishSellPrice(fish);
      count += 1;
    } else {
      keep.push(fish);
    }
  }
  if (!count) return { ok: false, meta, msg: '没有4星以下的鱼', count: 0, price: 0 };
  const m = {
    ...meta,
    fragments: (meta.fragments || 0) + gained,
    warehouse: { ...meta.warehouse, fish: keep },
  };
  saveMeta(m);
  return {
    ok: true,
    meta: m,
    count,
    price: gained,
    msg: `一键出售 ${count} 条 · +${gained} 海图碎片`,
  };
}


export function discoverRelic(meta, defId) {
  if (!defId || !getRelicDef(defId)) return { ok: false, meta, neu: false };
  if (meta.relicCodex?.[defId]) return { ok: true, meta, neu: false };
  const m = {
    ...meta,
    relicCodex: { ...(meta.relicCodex || {}), [defId]: true },
  };
  saveMeta(m);
  return { ok: true, meta: m, neu: true };
}

export function appraiseRelic(meta, warehouseIndex) {
  const list = [...(meta.warehouse?.relics || [])];
  const item = list[warehouseIndex];
  if (!item) return { ok: false, meta, msg: '无效宝物' };
  if (!item.sealed) return { ok: false, meta, msg: '已经鉴定过了' };
  const cost = APPRAISE_COST;
  if ((meta.fragments | 0) < cost) return { ok: false, meta, msg: `碎片不足（需要 ${cost}）` };
  const def = getRelicDef(item.defId);
  if (!def) return { ok: false, meta, msg: '未知宝物' };
  const sellPrice = rollSellPrice(def.sellMin, def.sellMax);
  list[warehouseIndex] = {
    ...item,
    sealed: false,
    sellPrice,
    tier: def.tier,
    hidden: !!def.hidden,
  };
  let m = {
    ...meta,
    fragments: (meta.fragments | 0) - cost,
    warehouse: { ...meta.warehouse, relics: list },
    relicCodex: { ...(meta.relicCodex || {}) },
  };
  const disc = discoverRelic(m, item.defId);
  m = disc.meta;
  saveMeta(m);
  return {
    ok: true,
    meta: m,
    msg: `鉴定为「${def.name}」· 估值 ${sellPrice}`,
    relic: list[warehouseIndex],
    def,
    neu: disc.neu,
  };
}

export function sellWarehouseRelic(meta, warehouseIndex) {
  const list = [...(meta.warehouse?.relics || [])];
  const item = list[warehouseIndex];
  if (!item) return { ok: false, meta, msg: '无效宝物' };
  let price;
  let label;
  if (item.sealed) {
    price = item.sellPrice > 0 ? item.sellPrice : sealedSellPrice();
    label = '黑色包裹';
  } else {
    const def = getRelicDef(item.defId);
    price = item.sellPrice > 0
      ? item.sellPrice
      : (def ? rollSellPrice(def.sellMin, def.sellMax) : 20);
    label = def?.name || '宝物';
  }
  list.splice(warehouseIndex, 1);
  const m = {
    ...meta,
    fragments: (meta.fragments | 0) + price,
    warehouse: { ...meta.warehouse, relics: list },
  };
  saveMeta(m);
  return { ok: true, meta: m, msg: `售出 ${label} +${price} 海图碎片`, price };
}

/** Sell every warehouse relic with tier strictly below `belowTier` (default: under T3). */
export function sellWarehouseRelicsBelowTier(meta, belowTier = 3) {
  const list = meta.warehouse?.relics || [];
  const keep = [];
  let gained = 0;
  let count = 0;
  const limit = belowTier | 0;
  for (const item of list) {
    if (!item) continue;
    const def = item.sealed ? null : getRelicDef(item.defId);
    const tier = (item.tier | 0) || (def?.tier | 0) || 1;
    if (tier > 0 && tier < limit) {
      gained += relicSellPreview(item);
      count += 1;
    } else {
      keep.push(item);
    }
  }
  if (!count) return { ok: false, meta, msg: '没有 T3 以下的宝物', count: 0, price: 0 };
  const m = {
    ...meta,
    fragments: (meta.fragments || 0) + gained,
    warehouse: { ...meta.warehouse, relics: keep },
  };
  saveMeta(m);
  return {
    ok: true,
    meta: m,
    count,
    price: gained,
    msg: `一键出售 ${count} 件 · +${gained} 海图碎片`,
  };
}

export function relicSellPreview(item) {
  if (!item) return 0;
  if (item.sealed) return item.sellPrice > 0 ? item.sellPrice : 20;
  if (item.sellPrice > 0) return item.sellPrice;
  const def = getRelicDef(item.defId);
  if (!def) return 20;
  return Math.floor((def.sellMin + def.sellMax) / 2);
}

export function tryUnlockZone(meta, zoneId) {
  return { ok: false, meta, msg: '\u6d77\u57df\u9700\u901a\u5173\u4e0a\u4e00\u5173\u89e3\u9501' };
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
  const w = normalizeSupplies(meta.warehouse.supplies);
  const lo = normalizeLoadoutSupplies(meta.loadout?.supplies);
  const preferred = BAIT_KINDS[lo.baitKind] ? lo.baitKind : 'fresh';
  const order = [
    BAIT_KINDS[preferred].key,
    ...Object.keys(BAIT_KINDS).filter((k) => k !== preferred).map((k) => BAIT_KINDS[k].key),
    'plank',
    'repair',
    'paste',
  ];
  for (let i = 0; i < LOADOUT_BAG_SIZE; i++) {
    const key = order.find((k) => (w[k] | 0) > 0);
    if (!key) break;
    let slot = lo.bag.find((s) => s && s.key === key && s.n < LOADOUT_STACK_MAX);
    if (!slot) {
      const empty = lo.bag.findIndex((s) => !s);
      if (empty < 0) break;
      lo.bag[empty] = { key, n: 0 };
      slot = lo.bag[empty];
    }
    const take = Math.min(w[key] | 0, LOADOUT_STACK_MAX - slot.n);
    if (take <= 0) continue;
    slot.n += take;
    w[key] -= take;
  }
  const next = normalizeLoadoutSupplies({ bag: lo.bag, baitKind: preferred });
  const m = {
    ...meta,
    warehouse: { ...meta.warehouse, supplies: w },
    loadout: { ...meta.loadout, supplies: next },
  };
  saveMeta(m);
  return m;
}

/** After fish are applied to the run, clear loadout so they are not duplicated */
export function consumeLoadoutOnDepart(meta) {
  const kind = BAIT_KINDS[meta.loadout?.supplies?.baitKind] ? meta.loadout.supplies.baitKind : 'fresh';
  const m = {
    ...meta,
    loadout: {
      ...meta.loadout,
      slots: emptySlots(),
      cargo: [],
      supplies: normalizeLoadoutSupplies({ bag: emptyBag(), baitKind: kind }),
    },
  };
  saveMeta(m);
  return m;
}
