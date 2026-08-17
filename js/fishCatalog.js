/** Full fish catalog by slot + rarity with abilities and side effects */

export const RARITY = {
  1: { stars: 1, label: '普通', cycle: 2.0, green: 0.6, hits: 1, decayPerMin: 5 },
  2: { stars: 2, label: '稀有', cycle: 1.2, green: 0.4, hits: 2, decayPerMin: 4 },
  3: { stars: 3, label: '史诗', cycle: 0.7, green: 0.25, hits: 3, decayPerMin: 3 },
  5: { stars: 5, label: '传说', cycle: 0.4, green: 0.15, hits: 4, decayPerMin: 2 },
};

/** Zone rarity weights: [★, ★★, ★★★, ★★★★★] */
export const ZONE_RARITY_WEIGHTS = [
  [70, 25, 4, 1],   // 0 浅蓝
  [55, 32, 11, 2],  // 1 翠绿
  [40, 35, 20, 5],  // 2 琥珀
  [25, 32, 30, 13], // 3 深紫
  [15, 25, 35, 25], // 4 暗红
];

export const FISH_CATALOG = {
  // Food / special
  food: { id: 'food', name: '食物鱼', slot: null, rarity: 1, color: 0x4ecdc4, category: 'food', desc: '吃掉 +20耐久 或 +10s加速' },
  glue: { id: 'glue', name: '胶水鱼', slot: null, rarity: 1, color: 0xffe066, category: 'food', desc: '修船 +15耐久' },

  // Bow ★~★★★★★
  puffer: { id: 'puffer', name: '刺豚', slot: 'bow', rarity: 1, color: 0xd4a574, category: 'weapon',
    effect: { ramMul: 1.5 }, side: { speedMul: 0.85, turnMul: 1.3 } },
  swordfish: { id: 'swordfish', name: '剑鱼', slot: 'bow', rarity: 2, color: 0x3a5a7a, category: 'weapon',
    effect: { dash: 5 }, side: { lockSteer: 0.5 } },
  icefish: { id: 'icefish', name: '冰鱼', slot: 'bow', rarity: 3, color: 0xb8e8ff, category: 'weapon',
    effect: { freeze: 3 }, side: { slip: true } },
  dragonhead: { id: 'dragonhead', name: '龙首鱼', slot: 'bow', rarity: 5, color: 0x9aa4b2, category: 'weapon',
    effect: { shockwave: true, cd: 15, iFrame: 3 }, side: {} },

  // Stern
  spiral: { id: 'spiral', name: '螺旋鱼', slot: 'stern', rarity: 1, color: 0x2a8a8a, category: 'engine',
    effect: { autoThrust: 7 }, side: { frictionDps: 2 / 60 } },
  octopus: { id: 'octopus', name: '章鱼', slot: 'stern', rarity: 2, color: 0xc45a5a, category: 'engine',
    effect: { burst: 2 }, side: { blur: 0.8 } },
  jellyfish: { id: 'jellyfish', name: '水母', slot: 'stern', rarity: 3, color: 0x8ec8e8, category: 'engine',
    effect: { hover: 5 }, side: { noPaddle: true } },
  voidEel: { id: 'voidEel', name: '虚空鳗', slot: 'stern', rarity: 5, color: 0x4a2a6a, category: 'engine',
    effect: { phase: 3 }, side: {} },

  // Side L weapon
  ink: { id: 'ink', name: '喷墨鱼', slot: 'sideL', rarity: 1, color: 0x5a4a6a, category: 'weapon',
    effect: { autoShot: true, range: 8 }, side: { reloadEvery: 10 } },
  crab: { id: 'crab', name: '螃蟹', slot: 'sideL', rarity: 2, color: 0xe03030, category: 'weapon',
    effect: { grab: true }, side: { shake: true } },
  seaSnake: { id: 'seaSnake', name: '海蛇', slot: 'sideL', rarity: 3, color: 0x6ab0d4, category: 'weapon',
    effect: { whip: true }, side: { recovery: 1 } },
  lobster: { id: 'lobster', name: '巨钳龙虾', slot: 'sideL', rarity: 5, color: 0xb02020, category: 'weapon',
    effect: { chargeCrush: 2 }, side: {} },

  // Side R defense
  shell: { id: 'shell', name: '贝壳鱼', slot: 'sideR', rarity: 1, color: 0xa88868, category: 'defense',
    effect: { block: 1 }, side: { weight: 1.15 } },
  stingray: { id: 'stingray', name: '刺鳐', slot: 'sideR', rarity: 2, color: 0x4a4a5a, category: 'defense',
    effect: { reflect: 0.5, cd: 3 }, side: {} },
  coral: { id: 'coral', name: '珊瑚虫', slot: 'sideR', rarity: 3, color: 0xe05030, category: 'defense',
    effect: { wallHits: 3, wallTime: 5 }, side: { speedMul: 0.8 } },
  mirrorJelly: { id: 'mirrorJelly', name: '镜面水母', slot: 'sideR', rarity: 5, color: 0xd8eef8, category: 'defense',
    effect: { reflectRanged: true }, side: {} },

  // Keel
  barnacle: { id: 'barnacle', name: '藤壶', slot: 'keel', rarity: 1, color: 0x8a8a8a, category: 'utility',
    effect: { corrosionMul: 0.6 }, side: { accelMul: 0.8 } },
  bounce: { id: 'bounce', name: '弹跳鱼', slot: 'keel', rarity: 2, color: 0x3a7ac8, category: 'utility',
    effect: { jump: true }, side: { loosenChance: 0.1 } },
  dive: { id: 'dive', name: '潜游鱼', slot: 'keel', rarity: 3, color: 0x2a5a9a, category: 'utility',
    effect: { dive: 3 }, side: { hideSurface: true } },
  leyline: { id: 'leyline', name: '地脉鱼', slot: 'keel', rarity: 5, color: 0x4a3a28, category: 'utility',
    effect: { quake: true }, side: { scatterLoot: true } },

  // Sail
  sailfish: { id: 'sailfish', name: '旗鱼', slot: 'sail', rarity: 1, color: 0x2a4a8a, category: 'sense',
    effect: { tailwind: 1.3 }, side: { headwind: 0.85 } },
  radar: { id: 'radar', name: '雷达鱼', slot: 'sail', rarity: 2, color: 0x5a6a50, category: 'sense',
    effect: { scan: 30 }, side: { wakeSleepers: true } },
  storm: { id: 'storm', name: '风暴鱼', slot: 'sail', rarity: 3, color: 0x2a3a6a, category: 'sense',
    effect: { storm: 5 }, side: { blur: 0.5 } },
  chrono: { id: 'chrono', name: '时序鱼', slot: 'sail', rarity: 5, color: 0xd4a020, category: 'sense',
    effect: { slowMo: 3 }, side: {} },
};

const SLOT_POOLS = {
  bow: ['puffer', 'swordfish', 'icefish', 'dragonhead'],
  stern: ['spiral', 'octopus', 'jellyfish', 'voidEel'],
  sideL: ['ink', 'crab', 'seaSnake', 'lobster'],
  sideR: ['shell', 'stingray', 'coral', 'mirrorJelly'],
  keel: ['barnacle', 'bounce', 'dive', 'leyline'],
  sail: ['sailfish', 'radar', 'storm', 'chrono'],
};

const FOOD_POOL = ['food', 'food', 'food', 'glue'];

export function getFishDef(id) {
  return FISH_CATALOG[id] || FISH_CATALOG.food;
}

/** All catalog ids in stable order */
export function listFishIds() {
  return Object.keys(FISH_CATALOG);
}

function pickRarityTier(zoneIndex) {
  const w = ZONE_RARITY_WEIGHTS[Math.min(zoneIndex, ZONE_RARITY_WEIGHTS.length - 1)];
  const map = [1, 2, 3, 5];
  const total = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < w.length; i++) {
    r -= w[i];
    if (r <= 0) return map[i];
  }
  return 1;
}

export function pickFishForZone(zoneIndex) {
  // 35% food in shallow, less deeper
  const foodChance = Math.max(0.12, 0.4 - zoneIndex * 0.06);
  if (Math.random() < foodChance) {
    const id = FOOD_POOL[Math.floor(Math.random() * FOOD_POOL.length)];
    return makeCaught(id);
  }
  const rarity = pickRarityTier(zoneIndex);
  const slots = Object.keys(SLOT_POOLS);
  const slot = slots[Math.floor(Math.random() * slots.length)];
  const candidates = SLOT_POOLS[slot].filter((id) => FISH_CATALOG[id].rarity === rarity);
  const fallback = SLOT_POOLS[slot];
  const id = (candidates.length ? candidates : fallback)[Math.floor(Math.random() * (candidates.length || fallback.length))];
  return makeCaught(id);
}

function makeCaught(id) {
  const def = getFishDef(id);
  return {
    kind: 'fish',
    defId: id,
    name: def.name,
    slot: def.slot,
    category: def.category,
    rarity: def.rarity,
    color: def.color,
    vitality: 100,
  };
}

export function qteForFish(defId) {
  const def = getFishDef(defId);
  const r = RARITY[def.rarity] || RARITY[1];
  return {
    cycle: r.cycle,
    green: r.green,
    hits: r.hits,
    speed: 1 / r.cycle, // pointer full traverse per cycle (0→1→0 roughly)
  };
}

/** Adjacent pairs for synergy */
export const ADJACENCY = {
  bow: ['sail', 'sideL', 'sideR', 'keel'],
  stern: ['keel', 'sideL', 'sideR'],
  sideL: ['bow', 'keel', 'sail', 'stern'],
  sideR: ['bow', 'keel', 'sail', 'stern'],
  keel: ['bow', 'stern', 'sideL', 'sideR'],
  sail: ['bow', 'sideL', 'sideR'],
};

export const COMBOS = [
  { id: 'cruise', name: '巡航套', needs: [['spiral', 'sailfish']], bonus: { thrustMul: 1.25 } },
  { id: 'ramwall', name: '重装破锋', needs: [['puffer', 'shell']], bonus: { ramMul: 1.2, block: 1 } },
  { id: 'inkscan', name: '猎手标记', needs: [['ink', 'radar']], bonus: { rangeMul: 1.4 } },
  { id: 'jumpdive', name: '深潜跃', needs: [['bounce', 'dive']], bonus: { jumpSafe: true } },
  { id: 'stormsail', name: '风暴旗', needs: [['storm', 'sailfish']], bonus: { stormBoost: true } },
  { id: 'icebarn', name: '冰甲底', needs: [['icefish', 'barnacle']], bonus: { corrosionMul: 0.5 } },
  { id: 'crabshell', name: '钳盾', needs: [['crab', 'shell']], bonus: { grabBlock: true } },
  { id: 'octopush', name: '墨涌', needs: [['octopus', 'ink']], bonus: { burstInk: true } },
  { id: 'chronohover', name: '时停浮', needs: [['chrono', 'jellyfish']], bonus: { slowHover: true } },
  { id: 'dragonquake', name: '龙震', needs: [['dragonhead', 'leyline']], bonus: { megaShock: true } },
];

export function activeCombos(slotsState) {
  const ids = new Set(
    Object.values(slotsState).filter(Boolean).map((s) => s.defId)
  );
  return COMBOS.filter((c) =>
    c.needs.some((pair) => pair.every((id) => ids.has(id)))
  );
}
