/** Full fish catalog by slot + rarity with abilities and side effects */

export const RARITY = {
  1: { stars: 1, label: '普通', cycle: 2.0, green: 0.6, hits: 1, decayPerMin: 5 },
  2: { stars: 2, label: '稀有', cycle: 1.2, green: 0.4, hits: 2, decayPerMin: 4 },
  3: { stars: 3, label: '史诗', cycle: 0.7, green: 0.25, hits: 3, decayPerMin: 3 },
  4: { stars: 4, label: '史诗+', cycle: 0.68, green: 0.20, hits: 4, decayPerMin: 2.5 },
  5: { stars: 5, label: '传说', cycle: 0.68, green: 0.20, hits: 5, decayPerMin: 1.5 },
  6: { stars: 6, label: '隐藏六星', cycle: 0.50, green: 0.12, hits: 6, decayPerMin: 1.0 },
};

/** Zone rarity weights: [★, ★★, ★★★, ★★★★, ★★★★★, 隐藏] — locked tiers stay 0 */
export const ZONE_RARITY_WEIGHTS = [
  [78, 18, 3, 1, 0, 0],   // 0 浅滩
  [64, 26, 8, 2, 0, 0],   // 1 藻林
  [50, 32, 13, 5, 0, 0],  // 2 雾区
  [34, 30, 20, 12, 4, 0], // 3 裂口
  [24, 30, 22, 14, 8, 2], // 4 海沟
];

/** Additive bait deltas; locked (base 0) tiers stay 0 and leftover dumps onto highest unlocked 2–4★ */
export const BAIT_DELTAS = {
  crude: [0, 0, 0, 0, 0, 0],
  fresh: [-8, 5, 3, 0, 0, 0],
  scale: [-16, -4, 2, 8, 6, 4],
  abyss: [-18, -10, 0, 10, 14, 4],
};

export const BAIT_KINDS = {
  crude: { id: 'crude', name: '粗饵', key: 'baitCrude', desc: '星级权重不变。抛竿耗 1。' },
  fresh: { id: 'fresh', name: '鲜饵', key: 'baitFresh', desc: '抛竿耗 1。权重 ★−8 / ★★+5 / ★★★+3。本图没有的星仍为 0。' },
  scale: { id: 'scale', name: '亮鳞饵', key: 'baitScale', desc: '抛竿耗 1。权重 ★−16 / ★★−4 / ★★★+2 / ★★★★+8 / 五星+6 / 隐藏+4。未解锁星的加分拨到本图最高的 2–4 星。' },
  abyss: { id: 'abyss', name: '深渊饵', key: 'baitAbyss', desc: '抛竿耗 1。权重 ★−18 / ★★−10 / ★★★0 / ★★★★+10 / 五星+14 / 隐藏+4。未解锁星的加分拨到本图最高的 2–4 星。' },
};

export function zoneRarityWeights(zoneIndex, baitKind = 'crude') {
  const zi = Math.max(0, Math.min(zoneIndex | 0, ZONE_RARITY_WEIGHTS.length - 1));
  const base = ZONE_RARITY_WEIGHTS[zi];
  const d = BAIT_DELTAS[baitKind] || BAIT_DELTAS.crude;
  const w = base.map((v, i) => (v <= 0 ? 0 : Math.max(0, v + (d[i] || 0))));
  let leftover = 0;
  for (let i = 0; i < 6; i++) {
    if (base[i] <= 0 && (d[i] || 0) > 0) leftover += d[i];
  }
  if (leftover) {
    for (let i = 3; i >= 1; i--) {
      if (base[i] > 0) {
        w[i] += leftover;
        break;
      }
    }
  }
  return w;
}

/** Map-locked ★★★★★ pools — only rolled when pickRarityTier returns 5 */
export const ZONE_LEGEND_POOLS = {
  3: ['thunderCore', 'magAnchor', 'voltSpine', 'ionVeil', 'flashSail'],
  4: ['magmaMaw', 'heatPump', 'tarWhip', 'obsidianHeart', 'abyssShell'],
};

export const ZONE_HIDDEN_POOLS = {
  4: ['facelessFang', 'corpseSpear'],
};

export const FISH_CATALOG = {
  food: {
    id: 'food', name: '食物鱼', slot: null, rarity: 1, color: 0x4ecdc4, category: 'food',
    desc: '吃掉：回 10 / 20 / 30 耐久，或短加速。',
    eat: { heal: 20 },
  },
  glue: { id: 'glue', name: '胶水鱼', slot: null, rarity: 1, color: 0xffe066, category: 'food',
    desc: '修船 +15 耐久。', eat: { heal: 15, glue: true } },

  dullSnout: { id: 'dullSnout', name: '钝吻', slot: 'bow', rarity: 1, color: 0xc8b090, category: 'weapon', family: 'rift',
    desc: '船头钝击，略增撞击。',
    effect: { ramMul: 1.15, ramDmg: 8 }, side: {} },
  puffer: { id: 'puffer', name: '刺豚', slot: 'bow', rarity: 1, color: 0xd4a574, category: 'weapon', family: 'shell',
    desc: '刺多、船变钝，掉头快。',
    effect: { ramMul: 1.5, ramDmg: 12 }, side: { speedMul: 0.85, turnMul: 1.3 } },
  shortSword: { id: 'shortSword', name: '短剑', slot: 'bow', rarity: 2, color: 0x6a7a8a, category: 'weapon', family: 'rift',
    desc: '短突进，瞬间不好转向。',
    effect: { dash: 3, ramDmg: 16 }, side: { lockSteer: 0.3 } },
  swordfish: { id: 'swordfish', name: '剑鱼', slot: 'bow', rarity: 2, color: 0x3a5a7a, category: 'weapon', family: 'gale',
    desc: '更长突进，锁舵更久。',
    effect: { dash: 5, ramDmg: 22 }, side: { lockSteer: 0.5 } },
  icefish: { id: 'icefish', name: '冰鱼', slot: 'bow', rarity: 3, color: 0xb8e8ff, category: 'weapon', family: 'tide',
    desc: '撞冻结怪，船会打滑。',
    effect: { freeze: 1.5, ramDmg: 14 }, side: { slip: true } },
  dragonhead: { id: 'dragonhead', name: '龙首鱼', slot: 'bow', rarity: 4, color: 0x9aa4b2, category: 'weapon', family: 'gale',
    desc: '船头放冲击波。',
    effect: { shockwave: true, shockDmg: 36, cd: 15, iFrame: 3 }, side: {} },

  paddleWheel: { id: 'paddleWheel', name: '水轮', slot: 'stern', rarity: 1, color: 0x5a9aaa, category: 'engine', family: 'drive',
    desc: '慢慢自己推。',
    effect: { autoThrust: 3 }, side: {} },
  spiral: { id: 'spiral', name: '螺旋鱼', slot: 'stern', rarity: 2, color: 0x2a8a8a, category: 'engine', family: 'drive',
    desc: '推得快，底磨。',
    effect: { autoThrust: 7 }, side: { frictionDps: 2 / 60 } },
  gillDrum: { id: 'gillDrum', name: '鼓鳃', slot: 'stern', rarity: 2, color: 0xd08070, category: 'engine', family: 'drive',
    desc: '猛蹬一下。',
    effect: { burst: 1 }, side: { blur: 0.35 } },
  octopus: { id: 'octopus', name: '章鱼', slot: 'stern', rarity: 2, color: 0xc45a5a, category: 'engine', family: 'ink',
    desc: '猛蹬两下。',
    effect: { burst: 2 }, side: { blur: 0.8 } },
  jellyfish: { id: 'jellyfish', name: '水母', slot: 'stern', rarity: 3, color: 0x8ec8e8, category: 'engine', family: 'tide',
    desc: '漂住，不用划。',
    effect: { hover: 3 }, side: { noPaddle: true } },
  voidEel: { id: 'voidEel', name: '虚空鳗', slot: 'stern', rarity: 4, color: 0x4a2a6a, category: 'engine', family: 'tide',
    desc: '短时间穿模。',
    effect: { phase: 3 }, side: {} },

  needleMouth: { id: 'needleMouth', name: '针口', slot: 'sideL', rarity: 1, color: 0x7a8a6a, category: 'weapon', family: 'ink',
    desc: '慢射小弹。',
    effect: { autoShot: true, shotDmg: 6, shotCd: 1.6, range: 7 }, side: {} },
  ink: { id: 'ink', name: '喷墨鱼', slot: 'sideL', rarity: 1, color: 0x5a4a6a, category: 'weapon', family: 'ink',
    desc: '要装填墨水。',
    effect: { autoShot: true, shotDmg: 10, shotCd: 1.2, range: 8 }, side: { reloadEvery: 10 } },
  spikeScale: { id: 'spikeScale', name: '刺鳞', slot: 'sideL', rarity: 2, color: 0x3a6a50, category: 'weapon', family: 'ink',
    desc: '伤害更高的自动射击。',
    effect: { autoShot: true, shotDmg: 14, shotCd: 1.4, range: 8 }, side: {} },
  crab: { id: 'crab', name: '螃蟹', slot: 'sideL', rarity: 2, color: 0xe03030, category: 'weapon', family: 'shell',
    desc: '钳住近怪。',
    effect: { grab: true, grabDmg: 24 }, side: { shake: true } },
  seaSnake: { id: 'seaSnake', name: '海蛇', slot: 'sideL', rarity: 3, color: 0x6ab0d4, category: 'weapon', family: 'ink',
    desc: '抽一下要休息一会儿。',
    effect: { whip: true, whipDmg: 30 }, side: { recovery: 1 } },
  lobster: { id: 'lobster', name: '巨钳龙虾', slot: 'sideL', rarity: 4, color: 0xb02020, category: 'weapon', family: 'shell',
    desc: '蓄满再碾。',
    effect: { chargeCrush: 2, crushDmg: 42 }, side: {} },

  thinShell: { id: 'thinShell', name: '薄壳', slot: 'sideR', rarity: 1, color: 0xc8c0b0, category: 'defense', family: 'shell',
    desc: '一点点挡。',
    effect: { block: 0.5 }, side: {} },
  shell: { id: 'shell', name: '贝壳鱼', slot: 'sideR', rarity: 1, color: 0xa88868, category: 'defense', family: 'shell',
    desc: '更挡，船沉。',
    effect: { block: 1 }, side: { weight: 1.15 } },
  grouper: { id: 'grouper', name: '石斑', slot: 'sideR', rarity: 2, color: 0x6a7058, category: 'defense', family: 'shell',
    desc: '更沉。',
    effect: { block: 1 }, side: { weight: 1.28 } },
  stingray: { id: 'stingray', name: '刺鳐', slot: 'sideR', rarity: 2, color: 0x4a4a5a, category: 'defense', family: 'shell',
    desc: '挨打回敬一半。',
    effect: { reflect: 0.5, cd: 3 }, side: {} },
  coral: { id: 'coral', name: '珊瑚虫', slot: 'sideR', rarity: 3, color: 0xe05030, category: 'defense', family: 'shell',
    desc: '短时砌墙，船慢。',
    effect: { wallHits: 3, wallTime: 5 }, side: { speedMul: 0.8 } },
  mirrorJelly: { id: 'mirrorJelly', name: '镜面水母', slot: 'sideR', rarity: 4, color: 0xd8eef8, category: 'defense', family: 'tide',
    desc: '弹回去。',
    effect: { reflectRanged: true }, side: {} },

  mossCoat: { id: 'mossCoat', name: '苔衣', slot: 'keel', rarity: 1, color: 0x4a7a50, category: 'utility', family: 'tide',
    desc: '略抗锈。',
    effect: { corrosionMul: 0.85 }, side: {} },
  barnacle: { id: 'barnacle', name: '藤壶', slot: 'keel', rarity: 2, color: 0x8a8a8a, category: 'utility', family: 'tide',
    desc: '很抗锈，起步慢。',
    effect: { corrosionMul: 0.6 }, side: { accelMul: 0.8 } },
  bounce: { id: 'bounce', name: '弹跳鱼', slot: 'keel', rarity: 2, color: 0x3a7ac8, category: 'utility', family: 'tide',
    desc: '能跳，可能掉槽。',
    effect: { jump: true }, side: { loosenChance: 0.1 } },
  dive: { id: 'dive', name: '潜游鱼', slot: 'keel', rarity: 3, color: 0x2a5a9a, category: 'utility', family: 'tide',
    desc: '潜一下躲视线。',
    effect: { dive: 3 }, side: { hideSurface: true } },
  leyline: { id: 'leyline', name: '地脉鱼', slot: 'keel', rarity: 4, color: 0x4a3a28, category: 'utility', family: 'rift',
    desc: '震怪也震货。',
    effect: { quake: true }, side: { scatterLoot: true } },

  clothFin: { id: 'clothFin', name: '布鳍', slot: 'sail', rarity: 1, color: 0x8aa0c8, category: 'sense', family: 'drive',
    desc: '顺风快一点。',
    effect: { tailwind: 1.12 }, side: { headwind: 0.94 } },
  sailfish: { id: 'sailfish', name: '旗鱼', slot: 'sail', rarity: 1, color: 0x2a4a8a, category: 'sense', family: 'drive',
    desc: '顺风更快，逆风更惨。',
    effect: { tailwind: 1.3 }, side: { headwind: 0.85 } },
  radar: { id: 'radar', name: '雷达鱼', slot: 'sail', rarity: 2, color: 0x5a6a50, category: 'sense', family: 'ink',
    desc: '看远处，别吵到怪。',
    effect: { scan: 30 }, side: { wakeSleepers: true } },
  storm: { id: 'storm', name: '风暴鱼', slot: 'sail', rarity: 3, color: 0x2a3a6a, category: 'sense', family: 'gale',
    desc: '借风暴，看不清。',
    effect: { storm: 5 }, side: { blur: 0.5 } },
  chrono: { id: 'chrono', name: '时序鱼', slot: 'sail', rarity: 4, color: 0xd4a020, category: 'sense', family: 'gale',
    desc: '短时放慢四周。',
    effect: { slowMo: 3 }, side: {} },

  thunderCore: { id: 'thunderCore', name: '雷核鱼', slot: 'bow', rarity: 5, color: 0x7ad8ff, category: 'weapon', family: 'gale',
    desc: '裂口传说。链式雷。',
    effect: { chainZap: true, chainDmg: 30 }, side: { chainCd: true } },
  magAnchor: { id: 'magAnchor', name: '磁锚鳗', slot: 'stern', rarity: 5, color: 0x3a6a9a, category: 'engine', family: 'drive',
    desc: '裂口传说，清近身。',
    effect: { shoveWrap: true }, side: { hitch: true } },
  voltSpine: { id: 'voltSpine', name: '电棘', slot: 'sideL', rarity: 5, color: 0xc8f060, category: 'weapon', family: 'gale',
    desc: '裂口传说。直线穿。',
    effect: { pierce: 2, pierceDmg: 34 }, side: { chargeGap: true } },
  ionVeil: { id: 'ionVeil', name: '离子膜', slot: 'sideR', rarity: 5, color: 0xa8fff0, category: 'defense', family: 'gale',
    desc: '裂口传说。化伤为速。',
    effect: { convertHit: true }, side: { rearmCd: true } },
  flashSail: { id: 'flashSail', name: '闪回帆', slot: 'sail', rarity: 5, color: 0xe8d060, category: 'sense', family: 'gale',
    desc: '裂口传说。闪回去。',
    effect: { rewind: 2 }, side: { disorient: true } },

  magmaMaw: { id: 'magmaMaw', name: '熔喉鱼', slot: 'bow', rarity: 5, color: 0xff6030, category: 'weapon', family: 'rift',
    desc: '海沟传说。航迹驱怪。',
    effect: { heatTrail: true, trailDps: 8 }, side: { selfCorrosion: true } },
  heatPump: { id: 'heatPump', name: '热泵鱼', slot: 'stern', rarity: 5, color: 0xe04820, category: 'engine', family: 'rift',
    desc: '海沟传说，痛了就冲。',
    effect: { painThrust: true }, side: { heatCorrosion: true } },
  tarWhip: { id: 'tarWhip', name: '焦油鞭', slot: 'sideL', rarity: 5, color: 0x2a1810, category: 'weapon', family: 'ink',
    desc: '海沟传说。根须锁。',
    effect: { root: true, rootDmg: 18 }, side: { drag: true } },
  obsidianHeart: { id: 'obsidianHeart', name: '黑曜心', slot: 'sideR', rarity: 5, color: 0x1a0a18, category: 'defense', family: 'shell',
    desc: '海沟传说。存再炸。',
    effect: { storeBurst: true }, side: { breakArmor: true } },
  abyssShell: { id: 'abyssShell', name: '沉渊壳', slot: 'keel', rarity: 5, color: 0x3a2060, category: 'utility', family: 'shell',
    desc: '海沟传说。保命一次。',
    effect: { onceImmunity: true }, side: { spent: true } },

  facelessFang: { id: 'facelessFang', name: '无面齿', slot: 'bow', rarity: 6, color: 0x2a1810, category: 'weapon', family: 'rift',
    desc: '仅海沟隐藏。',
    effect: { shockwave: true, shockDmg: 55, freeze: 0.8, cd: 8, iFrame: 1, ramDmg: 55 }, side: {} },
  corpseSpear: { id: 'corpseSpear', name: '沉尸矛', slot: 'sideL', rarity: 6, color: 0x3a3048, category: 'weapon', family: 'rift',
    desc: '仅海沟隐藏。',
    effect: { pierce: 3, pierceDmg: 48, chargeCrush: 1.8 }, side: {} },
};

const SLOT_POOLS = {
  bow: ['dullSnout', 'puffer', 'shortSword', 'swordfish', 'icefish', 'dragonhead'],
  stern: ['paddleWheel', 'spiral', 'gillDrum', 'octopus', 'jellyfish', 'voidEel'],
  sideL: ['needleMouth', 'ink', 'spikeScale', 'crab', 'seaSnake', 'lobster'],
  sideR: ['thinShell', 'shell', 'grouper', 'stingray', 'coral', 'mirrorJelly'],
  keel: ['mossCoat', 'barnacle', 'bounce', 'dive', 'leyline'],
  sail: ['clothFin', 'sailfish', 'radar', 'storm', 'chrono'],
};

/** snack weights 4 / 2 / 2 / 1, glue ~ 1/4 of snack pile */
const FOOD_ROLLS = [
  { w: 4, eat: { heal: 10 } },
  { w: 2, eat: { heal: 20 } },
  { w: 2, eat: { haste: 10 } },
  { w: 1, eat: { heal: 30 } },
];

export function getFishDef(id) {
  return FISH_CATALOG[id] || FISH_CATALOG.food;
}

export function listFishIds() {
  return Object.keys(FISH_CATALOG);
}

export function shopBuyCost(def) {
  if (!def) return 0;
  if (def.rarity === 1) return 12;
  if (def.rarity === 2) return 25;
  if (def.rarity === 3) return 50;
  return 0;
}

export function listShopBuyFishIds() {
  return Object.keys(FISH_CATALOG).filter((id) => {
    const d = FISH_CATALOG[id];
    return d.rarity >= 1 && d.rarity <= 3;
  });
}

function pickRarityTier(zoneIndex, baitKind = 'crude') {
  const w = zoneRarityWeights(zoneIndex, baitKind);
  const map = [1, 2, 3, 4, 5, 6];
  const total = w.reduce((a, b) => a + b, 0) || 1;
  let r = Math.random() * total;
  for (let i = 0; i < w.length; i++) {
    r -= w[i];
    if (r <= 0) return map[i];
  }
  return 1;
}

function rollFoodEat() {
  const total = FOOD_ROLLS.reduce((a, x) => a + x.w, 0);
  let r = Math.random() * total;
  for (const row of FOOD_ROLLS) {
    r -= row.w;
    if (r <= 0) return { ...row.eat };
  }
  return { heal: 10 };
}

export function pickFishForZone(zoneIndex, baitKind = 'crude') {
  const zi = Math.max(0, zoneIndex | 0);
  const foodChance = Math.max(0.12, 0.4 - zi * 0.06);
  if (Math.random() < foodChance) {
    if (Math.random() < 0.2) return makeCaught('glue');
    return makeCaught('food', { eat: rollFoodEat() });
  }
  let rarity = pickRarityTier(zi, baitKind);
  if (rarity === 6) {
    const pool = ZONE_HIDDEN_POOLS[zi] || [];
    if (pool.length) {
      return makeCaught(pool[Math.floor(Math.random() * pool.length)]);
    }
    rarity = 5;
  }
  if (rarity === 5) {
    const pool = ZONE_LEGEND_POOLS[zi] || [];
    if (pool.length) {
      return makeCaught(pool[Math.floor(Math.random() * pool.length)]);
    }
    rarity = 4;
  }
  const slots = Object.keys(SLOT_POOLS);
  const slot = slots[Math.floor(Math.random() * slots.length)];
  const candidates = SLOT_POOLS[slot].filter((id) => FISH_CATALOG[id].rarity === rarity);
  const fallback = SLOT_POOLS[slot];
  const id = (candidates.length ? candidates : fallback)[Math.floor(Math.random() * (candidates.length || fallback.length))];
  return makeCaught(id);
}

export function foodEatKey(eat) {
  if (!eat) return 'h20';
  if (eat.glue) return 'glue';
  if ((eat.haste | 0) > 0) return `haste${eat.haste | 0}`;
  if ((eat.heal | 0) > 0) return `h${eat.heal | 0}`;
  return 'h20';
}

export function foodEatColor(eat) {
  if (!eat) return 0x4ecdc4;
  if (eat.glue) return 0xffe066;
  if ((eat.haste | 0) > 0) return 0xe8d060;
  const h = eat.heal | 0;
  if (h === 10) return 0x7ad4a0;
  if (h === 30) return 0x3aa0c8;
  return 0x4ecdc4;
}

function makeCaught(id, extra = {}) {
  const def = getFishDef(id);
  const eat = extra.eat || def.eat || null;
  return {
    kind: 'fish',
    defId: id,
    name: def.name,
    slot: def.slot,
    category: def.category,
    rarity: def.rarity,
    color: id === 'food' ? foodEatColor(eat) : def.color,
    vitality: 100,
    eat,
  };
}

export function qteForFish(defId) {
  const def = getFishDef(defId);
  const r = RARITY[def.rarity] || RARITY[1];
  return {
    cycle: r.cycle,
    green: r.green,
    hits: r.hits,
    speed: 1 / r.cycle,
  };
}

export function rarityStars(rarity) {
  const n = Math.max(1, Math.min(6, rarity | 0));
  if (n >= 6) return '隐藏六星';
  return '★'.repeat(n);
}

export const FAMILIES = {
  shell: { id: 'shell', name: '\u58f3\u7532', color: '#c8b090', tip: '\u683c\u6321 +1' },
  ink: { id: 'ink', name: '\u58a8\u96fe', color: '#8a6aaa', tip: '\u5c04\u7a0b \u00d71.15' },
  drive: { id: 'drive', name: '\u8f6e\u673a', color: '#3ab0a0', tip: '\u63a8\u529b \u00d71.15' },
  gale: { id: 'gale', name: '\u5e06\u96f7', color: '#7ec8ff', tip: '\u8f6c\u5411 \u00d71.10' },
  tide: { id: 'tide', name: '\u5bd2\u6f5c', color: '#8ec8e8', tip: '\u8150\u8680 \u00d70.88' },
  rift: { id: 'rift', name: '\u9ab8\u9707', color: '#6a4058', tip: '\u649e\u51fb\u4f24 \u00d71.12' },
};

export function familyOf(defOrId) {
  const def = typeof defOrId === 'string' ? FISH_CATALOG[defOrId] : defOrId;
  if (!def || !def.family) return null;
  return FAMILIES[def.family] || null;
}

export function familyLabel(defOrId) {
  const f = familyOf(defOrId);
  return f ? f.name : '';
}

/** Active family resonances: same family on >=2 equipped slot fish. */
export function activeFamilies(slotsState) {
  const counts = Object.create(null);
  for (const s of Object.values(slotsState || {})) {
    if (!s || !s.defId) continue;
    const fam = getFishDef(s.defId).family;
    if (!fam) continue;
    counts[fam] = (counts[fam] || 0) + 1;
  }
  return Object.keys(FAMILIES).filter((id) => (counts[id] || 0) >= 2).map((id) => ({
    ...FAMILIES[id],
    count: counts[id],
  }));
}
