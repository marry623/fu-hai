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
    desc: '碎木尖刺海胆。靠近会迫使船体加速磨损，宜绕行或远程击沉。',
    zones: [0],
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
    desc: '成群附着的普通藤壶，会封印一个改装槽。用弯刀近战刮除。',
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
    desc: '长吻锯齿鲨。撞击会让船身倾斜并推移舱内物资。',
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
    desc: '巨钳拖刀蟹。夹住一侧船桨，船只只能打转直到挣脱或击杀。',
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
    desc: '散发颠倒孢子。命中后 5 秒内左右划桨键对调。',
    zones: [1, 4],
  },
  ghostHook: {
    id: 'ghostHook',
    name: '幽灵钩爪手',
    kind: 'wrap',
    rarity: 3,
    color: 0x7ab0c8,
    tag: '钩拽',
    skill: 'hookGear',
    skillLabel: '钩拽鱼装 · QTE 抢回',
    desc: '雾中钩爪。钩住船上鱼装时需在 QTE 中抢回，失败则丢失一件。',
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
    desc: '会爬上船偷饵料与木板。击杀可追回被盗物资。',
    zones: [2],
  },
  inkJelly: {
    id: 'inkJelly',
    name: '喷墨水母',
    kind: 'ranged',
    rarity: 2,
    color: 0x1a1228,
    tag: '遮目',
    skill: 'inkBlind',
    skillLabel: '挡屏遮视线与 QTE 绿区',
    desc: '喷出墨雾遮挡视野，并缩小钓鱼 QTE 绿区。',
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
    desc: '脊上金刺招雷。命中后短时瘫痪船帆槽的引擎类鱼效果。',
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
    desc: '戴眼罩的虚空章鱼。闪现上船偷走一件改装鱼后下潜逃离。',
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
    desc: '巨鲸掀浪。船体剧烈晃动，打断钓鱼 QTE 并可能掀飞携带物资。',
    zones: [3, 4],
  },
  trenchWorm: {
    id: 'trenchWorm',
    name: '吞噬海沟虫',
    kind: 'suction',
    rarity: 4,
    color: 0x4a2060,
    tag: '强吸',
    skill: 'suctionKill',
    skillLabel: '前方强吸力 · 未全速即秒杀',
    desc: '海沟巨虫张开环齿。正前方强力吸附，船速不够会被一口吞掉。',
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
    desc: '熔岩质藤壶高温锁死槽位。用冰霜类效果或强力撞击震飞。',
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
    desc: '巨口鲨会撞击船体。保持距离，用喷墨或冲撞解决。',
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
    desc: '冰霜海蛇，会向船只吐出冰霜弹。保持距离，用喷墨或斩裂解决。',
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
    desc: '触手海怪会缠绕船只腐蚀船体。近战斩断或跳跃摆脱。',
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
