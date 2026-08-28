/** Salvage loot tables: bottle events, barrel supplies, relics by zone */

export const APPRAISE_COST = 20;
export const SEALED_SELL_MIN = 20;
export const SEALED_SELL_MAX = 20;
/** Per-run carry: only the most recently picked packages return to warehouse. */
export const RELIC_CARRY_CAP = 8;

/** [T1, T2, T3, hidden] — normalize at roll time */
export const ZONE_RELIC_WEIGHTS = [
  [78, 19, 3, 0],
  [65, 28, 7, 0],
  [124, 56, 19, 1],
  [45, 34, 19, 2],
  [32, 36, 27, 5],
];

export const BOTTLE_EVENTS = [
  {
    id: 'note_repair',
    toast: '瓶中夹着修补剂 ×1',
    effect: { kind: 'supply', supply: 'repair', amount: 1 },
  },
  {
    id: 'note_plank',
    toast: '瓶塞换成了一小截木板',
    effect: { kind: 'supply', supply: 'plank', amount: 1 },
  },
  {
    id: 'note_bait',
    toast: '瓶底有鱼饵 ×2',
    effect: { kind: 'bait', amount: 2 },
  },
  {
    id: 'note_fresh',
    toast: '瓶中裹着鲜饵 ×1',
    effect: { kind: 'bait', amount: 1, baitKind: 'fresh' },
  },
  {
    id: 'note_heal',
    toast: '喝下瓶中淡水，耐久 +12',
    effect: { kind: 'heal', amount: 12 },
  },
  {
    id: 'note_sting',
    toast: '瓶口扎手，耐久 −8',
    effect: { kind: 'damage', amount: 8 },
  },
  {
    id: 'note_paste',
    toast: '稀罕：瓶中有龙骨膏 ×1',
    effect: { kind: 'supply', supply: 'paste', amount: 1 },
  },
  {
    id: 'note_nothing',
    toast: '纸条湿透，什么也读不出',
    effect: { kind: 'nothing' },
  },
  {
    id: 'note_bait3',
    toast: '瓶里塞满粗饵 ×3',
    effect: { kind: 'bait', amount: 3, baitKind: 'crude' },
  },
  {
    id: 'note_map',
    toast: '旧航线涂鸦——你觉得心里有底了',
    effect: { kind: 'nothing' },
  },
];

/** Weighted barrel loot (weight, entry) */
export const BARREL_LOOT = [
  { weight: 28, supply: 'plank', name: '木板', amount: 1 },
  { weight: 22, supply: 'bait', name: '鱼饵', amount: 1, baitKind: 'crude' },
  { weight: 18, supply: 'bait', name: '鱼饵', amount: 2, baitKind: 'fresh' },
  { weight: 18, supply: 'repair', name: '修补剂', amount: 1 },
  { weight: 8, supply: 'paste', name: '龙骨膏', amount: 1 },
  { weight: 6, supply: 'bait', name: '亮鳞饵', amount: 1, baitKind: 'scale' },
];

export const RELIC_CATALOG = {
  wuzhuCoin: {
    id: 'wuzhuCoin', tier: 1, name: '五铢残币', museum: '中国国家博物馆',
    realRef: '汉五铢钱', blurb: '边缘磨损的五铢残币，钱文依稀可辨。', sellMin: 6, sellMax: 24,
  },
  scarabAmulet: {
    id: 'scarabAmulet', tier: 1, name: '圣甲虫釉护符', museum: '大英博物馆埃及部',
    realRef: '古埃及圣甲虫护符', blurb: '釉面开裂的甲虫护符，腹面有细线铭文残痕。', sellMin: 6, sellMax: 24,
  },
  greekOilLamp: {
    id: 'greekOilLamp', tier: 1, name: '希腊陶油灯嘴', museum: '大英博物馆 / 卢浮宫',
    realRef: '希腊罗马油灯', blurb: '陶灯嘴残段，烟炱仍嵌在胎土里。', sellMin: 6, sellMax: 24,
  },
  romanGlassBead: {
    id: 'romanGlassBead', tier: 1, name: '罗马搅胎玻璃珠', museum: '大英博物馆罗马部',
    realRef: '罗马搅胎玻璃珠', blurb: '半透明搅胎珠，海盐蚀出细纹。', sellMin: 6, sellMax: 24,
  },
  sancaiShard: {
    id: 'sancaiShard', tier: 1, name: '唐三彩碎釉片', museum: '陕西历史博物馆',
    realRef: '唐三彩釉面残片', blurb: '黄绿釉交织的三彩片，断面见化妆土。', sellMin: 6, sellMax: 24,
  },
  bluePorcelainRim: {
    id: 'bluePorcelainRim', tier: 1, name: '青花口沿残片', museum: '故宫博物院 / 大英亚洲部',
    realRef: '元明出口青花', blurb: '口沿残片上留有一截缠枝青花。', sellMin: 6, sellMax: 24,
  },
  bronzeMirrorArc: {
    id: 'bronzeMirrorArc', tier: 1, name: '铜镜弦纹残弧', museum: '上海博物馆 / 故宫',
    realRef: '汉唐铜镜', blurb: '弦纹铜镜残弧，绿锈成层。', sellMin: 6, sellMax: 24,
  },
  oracleBoneRub: {
    id: 'oracleBoneRub', tier: 1, name: '甲骨拓墨残页', museum: '国家图书馆 / 殷墟博物馆',
    realRef: '商代甲骨拓片', blurb: '拓墨残页上可辨几个卜辞残笔。', sellMin: 6, sellMax: 24,
  },
  mayaJadeBead: {
    id: 'mayaJadeBead', tier: 1, name: '玛雅青玉管珠', museum: '大都会艺术博物馆 / 大英博物馆',
    realRef: '中美洲玉管珠', blurb: '青玉管珠钻孔光滑，海磨后仍冷。', sellMin: 6, sellMax: 24,
  },
  edoKobanChip: {
    id: 'edoKobanChip', tier: 1, name: '江户小判箔屑', museum: '东京国立博物馆',
    realRef: '江户小判金币', blurb: '椭圆金箔屑，形制像极了小判。', sellMin: 6, sellMax: 24,
  },
  persianGlazeTile: {
    id: 'persianGlazeTile', tier: 1, name: '波斯釉砖碎角', museum: '卢浮宫伊斯兰艺术部',
    realRef: '伊斯兰釉面砖', blurb: '钴蓝釉砖碎角，几何纹只剩一角。', sellMin: 6, sellMax: 24,
  },
  vikingArmRing: {
    id: 'vikingArmRing', tier: 1, name: '维京银臂环断片', museum: '丹麦国家博物馆 / 大英博物馆',
    realRef: '维京绞丝银臂环', blurb: '绞丝银环断片，断口新鲜。', sellMin: 6, sellMax: 24,
  },
  rosettaRubbing: {
    id: 'rosettaRubbing', tier: 2, name: '罗塞塔碑拓残页', museum: '大英博物馆',
    realRef: '罗塞塔石碑', blurb: '拓页可辨希腊文栏残笔，排布对照石碑铭文。', sellMin: 28, sellMax: 55,
  },
  hammurabiClay: {
    id: 'hammurabiClay', tier: 2, name: '汉谟拉比法典泥摹', museum: '卢浮宫',
    realRef: '汉谟拉比法典石碑', blurb: '泥摹楔形字列，像是法典碑身局部。', sellMin: 28, sellMax: 55,
  },
  seatedScribeFig: {
    id: 'seatedScribeFig', tier: 2, name: '坐姿书吏小像摹', museum: '卢浮宫埃及部',
    realRef: '坐姿书吏像', blurb: '盘腿书吏小像摹形，眼窝仍嵌白料。', sellMin: 28, sellMax: 55,
  },
  ruCeladonChip: {
    id: 'ruCeladonChip', tier: 2, name: '汝窑天青釉片', museum: '故宫博物院',
    realRef: '汝窑天青釉', blurb: '天青开片细若鱼鳞，触手温润。', sellMin: 28, sellMax: 55,
  },
  cloisonneLotus: {
    id: 'cloisonneLotus', tier: 2, name: '掐丝珐琅缠枝残片', museum: '故宫博物院',
    realRef: '掐丝珐琅缠枝莲', blurb: '掐丝勾出缠枝莲，釉面有海蚀麻点。', sellMin: 28, sellMax: 55,
  },
  langyaoRedShard: {
    id: 'langyaoRedShard', tier: 2, name: '郎窑红釉瓶片', museum: '故宫博物院',
    realRef: '郎窑红釉器', blurb: '郎红流釉残片，红如初凝的牛血。', sellMin: 28, sellMax: 55,
  },
  athenaOwlCoin: {
    id: 'athenaOwlCoin', tier: 2, name: '雅典娜猫头鹰银币', museum: '大英博物馆钱币部',
    realRef: '雅典四德拉克马', blurb: '正面猫头鹰轮廓仍清晰，银光发暗。', sellMin: 28, sellMax: 55,
  },
  terracottaArmor: {
    id: 'terracottaArmor', tier: 2, name: '秦俑甲片摹形', museum: '秦始皇帝陵博物院',
    realRef: '兵马俑铠甲', blurb: '甲片摹形带钉孔，陶色如新出土。', sellMin: 28, sellMax: 55,
  },
  qingmingSilkScrap: {
    id: 'qingmingSilkScrap', tier: 3, name: '上河图绢本残绢', museum: '故宫博物院',
    realRef: '清明上河图', blurb: '绢本残角上有屋脊与舟影，笔意仿上河图。', sellMin: 60, sellMax: 100,
  },
  jinOuCupEcho: {
    id: 'jinOuCupEcho', tier: 3, name: '金瓯永固杯仿影', museum: '故宫博物院',
    realRef: '乾隆金瓯永固杯', blurb: '杯耳仿影金光未尽，像极了金瓯永固。', sellMin: 60, sellMax: 100,
  },
  venusArmCast: {
    id: 'venusArmCast', tier: 3, name: '米洛维纳斯臂石膏摹', museum: '卢浮宫',
    realRef: '米洛的维纳斯', blurb: '断臂石膏摹段，肌理仍古典。', sellMin: 60, sellMax: 100,
  },
  samothraceFeather: {
    id: 'samothraceFeather', tier: 3, name: '胜利女神翼羽残摹', museum: '卢浮宫',
    realRef: '萨莫色雷斯的胜利女神', blurb: '翼羽残摹迎风张起，石粉微亮。', sellMin: 60, sellMax: 100,
  },
  jadeCabbageEcho: {
    id: 'jadeCabbageEcho', tier: 4, hidden: true, name: '翠玉白菜仿影', museum: '台北故宫博物院',
    realRef: '清翠玉白菜', blurb: '菜叶筋脉与螽斯轮廓可辨——隐藏级仿影。', sellMin: 500, sellMax: 1000,
  },
  tutMaskFoil: {
    id: 'tutMaskFoil', tier: 4, hidden: true, name: '图坦金面箔摹', museum: '埃及博物馆 / 大埃及博物馆',
    realRef: '图坦卡蒙金棺面具', blurb: '金箔摹面额纹深峻，隐藏级压舱货。', sellMin: 500, sellMax: 1000,
  },
};

export const RELIC_IDS = Object.keys(RELIC_CATALOG);

export function getRelicDef(id) {
  return RELIC_CATALOG[id] || null;
}

export function listRelicIds() {
  return RELIC_IDS.slice();
}

export function relicsByTier(tier) {
  return RELIC_IDS.filter((id) => RELIC_CATALOG[id].tier === tier);
}

export function relicsHidden() {
  return RELIC_IDS.filter((id) => RELIC_CATALOG[id].hidden);
}

function weightedPick(entries, weightFn) {
  let total = 0;
  for (const e of entries) total += weightFn(e);
  if (total <= 0) return entries[0] || null;
  let r = Math.random() * total;
  for (const e of entries) {
    r -= weightFn(e);
    if (r <= 0) return e;
  }
  return entries[entries.length - 1];
}

export function rollSellPrice(min, max) {
  const a = Math.min(min, max) | 0;
  const b = Math.max(min, max) | 0;
  return a + Math.floor(Math.random() * (b - a + 1));
}

export function sealedSellPrice() {
  return APPRAISE_COST;
}

/** Keep only the most recently picked packages (tail). Returns dropped count. */
export function trimRelicCarry(list, cap = RELIC_CARRY_CAP) {
  const arr = Array.isArray(list) ? list : [];
  const limit = Math.max(0, cap | 0);
  if (arr.length <= limit) return { list: arr, dropped: 0 };
  const dropped = arr.length - limit;
  return { list: arr.slice(-limit), dropped };
}

export function rollRelicForZone(zoneId) {
  const zi = Math.max(0, Math.min(4, zoneId | 0));
  const w = ZONE_RELIC_WEIGHTS[zi] || ZONE_RELIC_WEIGHTS[0];
  const tiers = [
    { tier: 1, weight: w[0] },
    { tier: 2, weight: w[1] },
    { tier: 3, weight: w[2] },
    { tier: 4, weight: w[3] },
  ].filter((t) => t.weight > 0);
  const picked = weightedPick(tiers, (t) => t.weight) || { tier: 1 };
  const pool = picked.tier === 4 ? relicsHidden() : relicsByTier(picked.tier);
  const defId = pool[Math.floor(Math.random() * pool.length)] || 'wuzhuCoin';
  const def = RELIC_CATALOG[defId];
  return {
    uid: `r_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`,
    defId,
    tier: def.tier,
    hidden: !!def.hidden,
    sealed: true,
  };
}

export function pickBottleEvent() {
  return BOTTLE_EVENTS[Math.floor(Math.random() * BOTTLE_EVENTS.length)];
}

export function pickBarrelLoot() {
  const e = weightedPick(BARREL_LOOT, (x) => x.weight);
  return {
    type: 'supply',
    supply: e.supply,
    name: e.name,
    amount: e.amount,
    baitKind: e.baitKind,
  };
}

/**
 * @param {string} flotsamType
 * @param {number} [zoneId]
 */
export function rollSalvageTyped(flotsamType, zoneId = 0) {
  const type = flotsamType === 'bubble' ? 'bottle' : flotsamType;

  if (type === 'bottle') {
    if (Math.random() < 0.08) {
      return { type: 'trap', damage: 12, flavor: '瓶中怪味刺鼻' };
    }
    return { type: 'bottleEvent', event: pickBottleEvent() };
  }

  if (type === 'barrel') {
    if (Math.random() < 0.05) {
      return { type: 'trap', damage: 15, flavor: '木桶暗钉扎手' };
    }
    return pickBarrelLoot();
  }

  if (type === 'package') {
    if (Math.random() < 0.28) {
      return { type: 'trap', damage: 20, flavor: '箱型海性' };
    }
    return { type: 'relic', relic: rollRelicForZone(zoneId) };
  }

  // fallback
  return pickBarrelLoot();
}

export function tierLabel(tier, hidden) {
  if (hidden || tier >= 4) return '隐藏';
  if (tier === 3) return 'T3';
  if (tier === 2) return 'T2';
  return 'T1';
}
