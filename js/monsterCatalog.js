/** Monster bestiary entries for hub codex */

export const MONSTER_CATALOG = {
  shark: {
    id: 'shark',
    name: '巨口鲨',
    kind: 'ram',
    rarity: 2,
    color: 0x2a3a5a,
    tag: '冲撞',
    desc: '领地内巡逻的巨口鲨。靠近会追击撞击船体，可用撞角或喷墨击沉。',
  },
  serpent: {
    id: 'serpent',
    name: '冰霜海蛇',
    kind: 'ranged',
    rarity: 3,
    color: 0x4a6a7a,
    tag: '远程',
    desc: '紫脊海蛇，会向船只吐出冰霜弹。保持距离周旋，用喷墨或武器解决。',
  },
  kraken: {
    id: 'kraken',
    name: '触手海怪',
    kind: 'wrap',
    rarity: 4,
    color: 0x5a2a8a,
    tag: '缠绕',
    desc: '沉船旁的触手海怪，会卷住木筏。靠近后用弯刀（武器2）切开触手脱身。',
  },
};

export function listMonsterIds() {
  return Object.keys(MONSTER_CATALOG);
}

export function getMonsterDef(id) {
  return MONSTER_CATALOG[id] || MONSTER_CATALOG.shark;
}

/** Map hazard runtime kind → catalog id */
export function monsterIdFromKind(kind) {
  if (kind === 'ranged') return 'serpent';
  if (kind === 'wrap') return 'kraken';
  return 'shark';
}
