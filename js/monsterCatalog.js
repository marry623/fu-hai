/** Monster bestiary — synced with zone spawns & in-run skills */

export const MONSTER_CATALOG = {
  woodUrchin: {
    id: 'woodUrchin',
    name: '碎木海胆',
    kind: 'static',
    rarity: 2,
    color: 0x5a3a28,
    tag: '荆棘',
    skill: 'accelDrain',
    skillLabel: '加速扣耐久',
    desc: '尖刺海胆。别贴，远程打沉。',
    zones: [-1, 0],
  },
  barnacle: {
    id: 'barnacle',
    name: '普通藤壶',
    kind: 'wrap',
    rarity: 2,
    color: 0x4a5a48,
    tag: '附着',
    skill: 'sealSlot',
    skillLabel: '封印槽位 · 近战刮除',
    desc: '爬上船封槽。弯刀近刮。',
    zones: [0, 1],
  },
  sawShark: {
    id: 'sawShark',
    name: '锯齿鲨',
    kind: 'ram',
    rarity: 3,
    color: 0x5a6570,
    tag: '冲撞',
    skill: 'tiltPush',
    skillLabel: '撞倾船身 · 推移物资',
    desc: '长吻撞击会晃舱。',
    zones: [0, 1, 2, 3, 4],
  },
  bladeCrab: {
    id: 'bladeCrab',
    name: '水下拖刀蟹',
    kind: 'ram',
    rarity: 3,
    color: 0x3a5a38,
    tag: '锁桨',
    skill: 'lockOar',
    skillLabel: '锁死单桨 · 船只打转',
    desc: '钳住一侧桨。打死或挣脱。',
    zones: [1],
  },
  sporeJelly: {
    id: 'sporeJelly',
    name: '颠倒孢子水母',
    kind: 'ranged',
    rarity: 3,
    color: 0x9a70c8,
    tag: '混乱',
    skill: 'scrambleKeys',
    skillLabel: '混乱 WASD / 划桨 5 秒',
    desc: '中弹后左右桨对调 5 秒。',
    zones: [1, 4],
  },
  ghostHook: {
    id: 'ghostHook',
    name: '幽灵钩爪手',
    kind: 'wrap',
    rarity: 4,
    color: 0x7ab0c8,
    tag: '钩拽',
    skill: 'hookGear',
    skillLabel: '钩拽鱼装 · QTE 抢回',
    desc: '钩住改装要抢，失败丢一件。',
    zones: [2],
  },
  thiefOtter: {
    id: 'thiefOtter',
    name: '偷吃獭',
    kind: 'ram',
    rarity: 2,
    color: 0x8a6040,
    tag: '偷窃',
    skill: 'stealSupply',
    skillLabel: '爬船偷物资 · 击杀追回',
    desc: '会偷物资。击杀追回。',
    zones: [2],
  },
  inkJelly: {
    id: 'inkJelly',
    name: '喷墨水母',
    kind: 'ranged',
    rarity: 3,
    color: 0x1a1228,
    tag: '遮目',
    skill: 'inkBlind',
    skillLabel: '挡屏遮视线与 QTE 绿区',
    desc: '喷墨遮眼，钓鱼更难。',
    zones: [2],
  },
  lightningSnake: {
    id: 'lightningSnake',
    name: '避雷针海蛇',
    kind: 'ranged',
    rarity: 4,
    color: 0x2a3a6a,
    tag: '引雷',
    skill: 'disableEngine',
    skillLabel: '爬帆引雷 · 瘫痪引擎鱼',
    desc: '脊刺招雷，短时帆槽失效。',
    zones: [0, 1, 2, 3, 4],
  },
  voidOctopus: {
    id: 'voidOctopus',
    name: '虚空盗贼章鱼',
    kind: 'wrap',
    rarity: 4,
    color: 0x5a2a7a,
    tag: '闪窃',
    skill: 'blinkSteal',
    skillLabel: '闪现偷鱼装 · 极速下潜',
    desc: '眨眼上船偷鱼。快打。',
    zones: [0, 1, 2, 3, 4],
  },
  waveWhale: {
    id: 'waveWhale',
    name: '深海撼浪鲸',
    kind: 'ram',
    rarity: 4,
    color: 0x3a5a8a,
    tag: '掀浪',
    skill: 'shakeBoat',
    skillLabel: '掀船晃动 · 打断 QTE · 掀飞物资',
    desc: '巨浪晃船。别在钓鱼时贴它。',
    zones: [3, 4],
  },
  trenchWorm: {
    id: 'trenchWorm',
    name: '吞噬海沟虫',
    kind: 'suction',
    rarity: 5,
    color: 0x4a2060,
    tag: '强吸',
    skill: 'suctionKill',
    skillLabel: '前方强吸力 · 未全速即秒杀',
    desc: '别停在它嘴前。沉渊壳可挡一次。',
    zones: [4],
  },
  lavaBarnacle: {
    id: 'lavaBarnacle',
    name: '熔岩藤壶',
    kind: 'wrap',
    rarity: 4,
    color: 0xc45c1a,
    tag: '灼封',
    skill: 'heatSeal',
    skillLabel: '高温锁槽 · 需冰冻/震飞',
    desc: '霜矛冻、或大力撞下来。',
    zones: [4],
  },
  /** Classic trio — kept as distinct roster entries */
  shark: {
    id: 'shark',
    name: '巨口鲨',
    kind: 'ram',
    rarity: 3,
    color: 0x2a3a5a,
    tag: '冲撞',
    skill: 'tiltPush',
    skillLabel: '撞击船体',
    desc: '经典冲撞鲨。保持距离。',
    zones: [0, 1, 2, 3, 4],
  },
  serpent: {
    id: 'serpent',
    name: '冰霜海蛇',
    kind: 'ranged',
    rarity: 3,
    color: 0x4a6a7a,
    tag: '远程',
    skill: 'frostBolt',
    skillLabel: '吐出冰霜弹',
    desc: '远程冰弹。用技能或冲撞处理。',
    zones: [0, 1, 2, 3, 4],
  },
  kraken: {
    id: 'kraken',
    name: '触手海怪',
    kind: 'wrap',
    rarity: 4,
    color: 0x5a2a8a,
    tag: '缠绕',
    skill: 'wrapCorrode',
    skillLabel: '触手缠绕腐蚀',
    desc: '缠上就刮耐久。斩断、跳跃或霜矛/陨石解。',
    zones: [0, 1, 2, 3, 4],
  },
};

/** Primary roster shown in codex */
export const CODEX_MONSTER_IDS = [
  'shark', 'serpent', 'kraken',
  'woodUrchin', 'barnacle', 'sawShark', 'bladeCrab', 'sporeJelly', 'ghostHook',
  'thiefOtter', 'inkJelly', 'lightningSnake', 'voidOctopus', 'waveWhale',
  'trenchWorm', 'lavaBarnacle',
];

/** Classic trio — present on every sea map */
export const CORE_MONSTERS = ['shark', 'serpent', 'kraken'];

/** zoneId → spawn weight list (zone uniques + classic trio) */
export const ZONE_MONSTER_POOLS = {
  [-1]: ['woodUrchin'],
  0: ['woodUrchin', 'barnacle', 'sawShark', ...CORE_MONSTERS],
  1: ['bladeCrab', 'sporeJelly', 'barnacle', ...CORE_MONSTERS],
  2: ['ghostHook', 'thiefOtter', 'inkJelly', 'sawShark', ...CORE_MONSTERS],
  3: ['lightningSnake', 'voidOctopus', 'waveWhale', ...CORE_MONSTERS],
  4: ['trenchWorm', 'lavaBarnacle', 'sporeJelly', 'waveWhale', ...CORE_MONSTERS],
};

/** Swimming/static combat anchors. Shallow reef is the floor. */
export const ZONE_COMBAT_COUNT = {
  [-1]: 1,
  0: 448,
  1: 540,
  2: 610,
  3: 700,
  4: 800,
};

export const ZONE_WRAP_COUNT = {
  [-1]: 0,
  0: 8,
  1: 10,
  2: 12,
  3: 16,
  4: 20,
};

/** Roster HP — trash can be one-shot by thunder/meteor; elites take many hits. */
export const MONSTER_HP = {
  woodUrchin: 28,
  thiefOtter: 28,
  barnacle: 40,
  sporeJelly: 56,
  inkJelly: 60,
  serpent: 70,
  shark: 80,
  sawShark: 84,
  bladeCrab: 84,
  ghostHook: 100,
  kraken: 120,
  lightningSnake: 130,
  lavaBarnacle: 130,
  voidOctopus: 140,
  waveWhale: 180,
  trenchWorm: 200,
};

export function monsterHp(id) {
  const rid = resolveMonsterId(id);
  return MONSTER_HP[rid] ?? 80;
}

/** Hull damage on ram / melee contact */
export const MONSTER_HULL_TOUCH = {
  shark: 10,
  sawShark: 10,
  bladeCrab: 6,
  thiefOtter: 6,
  waveWhale: 14,
  serpent: 8,
  sporeJelly: 5,
  inkJelly: 5,
  lightningSnake: 6,
  trenchWorm: 8,
};

export const MONSTER_HULL_SHOT = {
  serpent: 6,
  sporeJelly: 4,
  inkJelly: 4,
  lightningSnake: 5,
};

export const MONSTER_WRAP_DPS = {
  kraken: 2.2,
  barnacle: 2.2,
  lavaBarnacle: 2.2,
  ghostHook: 1.6,
  voidOctopus: 1.6,
};

export function hullTouchDamage(id, kind) {
  const rid = resolveMonsterId(id);
  if (MONSTER_HULL_TOUCH[rid] != null) return MONSTER_HULL_TOUCH[rid];
  return kind === 'ram' ? 10 : 8;
}

export function hullShotDamage(id) {
  const rid = resolveMonsterId(id);
  return MONSTER_HULL_SHOT[rid] ?? 6;
}

export function wrapDps(id) {
  const rid = resolveMonsterId(id);
  return MONSTER_WRAP_DPS[rid] ?? 2.2;
}

export function combatCountForZone(zoneId) {
  const z = zoneId | 0;
  if (z === -1) return 1;
  return ZONE_COMBAT_COUNT[z] ?? ZONE_COMBAT_COUNT[0];
}

export function wrapCountForZone(zoneId) {
  const z = zoneId | 0;
  if (z === -1) return 0;
  return ZONE_WRAP_COUNT[z] ?? ZONE_WRAP_COUNT[0];
}

export function listMonsterIds() {
  return CODEX_MONSTER_IDS.slice();
}

export function getMonsterDef(id) {
  const d = MONSTER_CATALOG[id];
  if (!d) return MONSTER_CATALOG.sawShark;
  if (d.aliasOf && MONSTER_CATALOG[d.aliasOf]) return MONSTER_CATALOG[d.aliasOf];
  return d;
}

export function resolveMonsterId(id) {
  const d = MONSTER_CATALOG[id];
  if (!d) return 'sawShark';
  return d.aliasOf || d.id;
}

/** Map hazard runtime kind → catalog id (legacy) */
export function monsterIdFromKind(kind) {
  if (kind === 'ranged') return 'serpent';
  if (kind === 'wrap') return 'kraken';
  if (kind === 'suction') return 'trenchWorm';
  if (kind === 'static') return 'woodUrchin';
  return 'shark';
}

export function pickMonsterForZone(zoneId, index = 0) {
  const pool = ZONE_MONSTER_POOLS[zoneId] ?? ZONE_MONSTER_POOLS[0];
  if (!pool.length) return null;
  return pool[index % pool.length];
}

export function monstersForZone(zoneId) {
  return (ZONE_MONSTER_POOLS[zoneId] ?? ZONE_MONSTER_POOLS[0]).slice();
}
