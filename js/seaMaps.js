/** Five sea maps — large irregular navigable regions + 3 lighthouses each
 *  Rule: every lighthouse is ≥500m from spawn.
 */

/** @typedef {{ x:number, z:number }} Pt */

function ring(cx, cz, rx, rz, n = 14, jitter = 0.18) {
  /** @type {Pt[]} */
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const j = 1 + Math.sin(i * 2.7 + cx) * jitter;
    pts.push({
      x: cx + Math.cos(a) * rx * j,
      z: cz + Math.sin(a) * rz * j,
    });
  }
  return pts;
}

function boundsOf(pts) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
  }
  return { minX, maxX, minZ, maxZ };
}

function makeSea({
  id, name, water, fog, sky, minimap,
  corrosionMul, feature, unlockHint,
  cx, cz, rx, rz, rot = 0, n = 16, jitter = 0.2,
  lh, reefs, islands, spawns, spawn,
}) {
  let navigable = ring(cx, cz, rx, rz, n, jitter);
  if (rot) {
    const c = Math.cos(rot), s = Math.sin(rot);
    navigable = navigable.map((p) => ({
      x: cx + (p.x - cx) * c - (p.z - cz) * s,
      z: cz + (p.x - cx) * s + (p.z - cz) * c,
    }));
  }
  const b = boundsOf(navigable);
  return {
    id, name, water, fog, sky, minimap,
    corrosionMul, feature, unlockHint,
    navigable,
    reefs: reefs || [],
    islands: islands || [],
    lighthouses: lh,
    spawnPoints: spawns,
    spawn,
    bounds: b,
  };
}

/** Point-in-polygon (xz) */
export function pointInPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, zi = poly[i].z;
    const xj = poly[j].x, zj = poly[j].z;
    const intersect = ((zi > z) !== (zj > z))
      && (x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Push point back into polygon if outside */
export function constrainToPoly(x, z, poly) {
  if (pointInPoly(x, z, poly)) return { x, z, hit: false };
  let bestD = Infinity;
  let best = { x, z };
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const abx = b.x - a.x, abz = b.z - a.z;
    const len2 = abx * abx + abz * abz || 1;
    let t = ((x - a.x) * abx + (z - a.z) * abz) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = a.x + abx * t;
    const pz = a.z + abz * t;
    const d = (px - x) ** 2 + (pz - z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = { x: px, z: pz };
    }
  }
  let cx = 0, cz = 0;
  for (const p of poly) { cx += p.x; cz += p.z; }
  cx /= poly.length; cz /= poly.length;
  const dx = cx - best.x, dz = cz - best.z;
  const len = Math.hypot(dx, dz) || 1;
  return { x: best.x + (dx / len) * 1.5, z: best.z + (dz / len) * 1.5, hit: true };
}

/**
 * Large seas (~1.4–1.8km across). Spawn at south; three lighthouses ≥500m away.
 * Distances checked: hypot(lh - spawn) >= 500 for every entry below.
 */
export const SEA_MAPS = [
  makeSea({
    id: 0, name: '珊瑚浅滩',
    water: 0x3cf5e6, fog: 0xa5d8ff, sky: 0x7dd3fc, minimap: '#0d5a62',
    corrosionMul: 1, feature: 'none', unlockHint: '初始海域',
    cx: 0, cz: 620, rx: 780, rz: 720, n: 18, jitter: 0.16,
    spawn: { x: 0, z: 0, yaw: 0 },
    lh: [
      { x: -520, z: 380, id: 'lh0' }, // ~644m
      { x: 540, z: 420, id: 'lh1' },  // ~684m
      { x: 30, z: 1050, id: 'lh2' },  // ~1050m
    ],
    reefs: [
      { x: -180, z: 220, r: 18 }, { x: 220, z: 480, r: 16 }, { x: 40, z: 360, r: 14 },
      { x: -320, z: 700, r: 20 }, { x: 360, z: 260, r: 15 }, { x: 160, z: 820, r: 17 },
      { x: -100, z: 560, r: 12 },
    ],
    islands: [
      { x: -140, z: 640, r: 28 }, { x: 280, z: 760, r: 22 }, { x: 80, z: 280, r: 18 },
    ],
    spawns: [
      { x: -280, z: 300, kind: 'ram' }, { x: 320, z: 280, kind: 'ram' },
      { x: -160, z: 780, kind: 'ram' }, { x: 200, z: 520, kind: 'ranged' },
      { x: -420, z: 500, kind: 'ranged' }, { x: 120, z: 200, kind: 'wrap' },
      { x: 400, z: 700, kind: 'wrap' }, { x: -60, z: 480, kind: 'ram' },
      { x: 60, z: 600, kind: 'plank' }, { x: 240, z: 360, kind: 'plank' },
      { x: -360, z: 640, kind: 'plank' }, { x: 100, z: 900, kind: 'ram' },
    ],
  }),
  makeSea({
    id: 1, name: '缠绕藻林',
    water: 0x34d399, fog: 0x6ee7b7, sky: 0x86efac, minimap: '#0d4a38',
    corrosionMul: 1.1, feature: 'current', unlockHint: '航行归航解锁',
    cx: 40, cz: 640, rx: 760, rz: 740, rot: 0.22, n: 17, jitter: 0.18,
    spawn: { x: 20, z: 10, yaw: 0.1 },
    lh: [
      { x: -480, z: 360, id: 'lh0' }, // ~610m
      { x: 560, z: 480, id: 'lh1' },  // ~717m
      { x: 60, z: 1100, id: 'lh2' },  // ~1091m
    ],
    reefs: [
      { x: 40, z: 300, r: 22 }, { x: -260, z: 580, r: 18 }, { x: 300, z: 420, r: 16 },
      { x: 180, z: 820, r: 19 }, { x: -400, z: 240, r: 14 }, { x: -80, z: 700, r: 15 },
    ],
    islands: [
      { x: 200, z: 640, r: 26 }, { x: -200, z: 880, r: 20 }, { x: 80, z: 400, r: 16 },
    ],
    spawns: [
      { x: -340, z: 340, kind: 'ram' }, { x: 380, z: 360, kind: 'ram' },
      { x: 80, z: 720, kind: 'ram' }, { x: -200, z: 560, kind: 'ranged' },
      { x: 360, z: 800, kind: 'ranged' }, { x: 40, z: 240, kind: 'wrap' },
      { x: 440, z: 560, kind: 'wrap' }, { x: -300, z: 780, kind: 'ram' },
      { x: 140, z: 480, kind: 'plank' }, { x: -120, z: 640, kind: 'plank' },
      { x: 220, z: 960, kind: 'ram' },
    ],
  }),
  makeSea({
    id: 2, name: '沉船雾区',
    water: 0xd4a017, fog: 0xfde68a, sky: 0xfcd34d, minimap: '#5a4010',
    corrosionMul: 1.2, feature: 'fog', unlockHint: '航行归航解锁',
    cx: -20, cz: 600, rx: 800, rz: 700, rot: -0.18, n: 18, jitter: 0.15,
    spawn: { x: -10, z: -10, yaw: 0 },
    lh: [
      { x: -560, z: 340, id: 'lh0' }, // ~645m
      { x: 520, z: 300, id: 'lh1' },  // ~609m
      { x: 40, z: 1020, id: 'lh2' },  // ~1031m
    ],
    reefs: [
      { x: -160, z: 380, r: 24 }, { x: 240, z: 560, r: 18 }, { x: -320, z: 700, r: 16 },
      { x: 400, z: 780, r: 22 }, { x: 20, z: 200, r: 14 }, { x: 120, z: 880, r: 15 },
    ],
    islands: [
      { x: -240, z: 540, r: 30 }, { x: 300, z: 460, r: 22 }, { x: -40, z: 760, r: 18 },
    ],
    spawns: [
      { x: -380, z: 280, kind: 'ram' }, { x: 320, z: 240, kind: 'ram' },
      { x: 20, z: 700, kind: 'ram' }, { x: -160, z: 900, kind: 'ranged' },
      { x: 380, z: 560, kind: 'ranged' }, { x: 120, z: 380, kind: 'wrap' },
      { x: -420, z: 620, kind: 'wrap' }, { x: 200, z: 820, kind: 'ram' },
      { x: -80, z: 480, kind: 'plank' }, { x: 260, z: 360, kind: 'plank' },
      { x: -200, z: 280, kind: 'plank' },
    ],
  }),
  makeSea({
    id: 3, name: '雷暴裂口',
    water: 0x6366f1, fog: 0x8b5cf6, sky: 0xa78bfa, minimap: '#2a1a4a',
    corrosionMul: 1.4, feature: 'lightning', unlockHint: '航行归航解锁',
    cx: 0, cz: 660, rx: 740, rz: 780, rot: 0.35, n: 16, jitter: 0.2,
    spawn: { x: 0, z: 5, yaw: 0 },
    lh: [
      { x: -460, z: 520, id: 'lh0' }, // ~695m
      { x: 500, z: 480, id: 'lh1' },  // ~694m
      { x: -20, z: 1120, id: 'lh2' }, // ~1115m
    ],
    reefs: [
      { x: 80, z: 380, r: 20 }, { x: -300, z: 400, r: 18 }, { x: 320, z: 780, r: 24 },
      { x: -160, z: 880, r: 16 }, { x: 200, z: 240, r: 15 }, { x: -40, z: 600, r: 14 },
    ],
    islands: [
      { x: 40, z: 720, r: 26 }, { x: -360, z: 760, r: 20 }, { x: 280, z: 540, r: 17 },
    ],
    spawns: [
      { x: -260, z: 420, kind: 'ram' }, { x: 340, z: 400, kind: 'ram' },
      { x: 40, z: 960, kind: 'ram' }, { x: -380, z: 700, kind: 'ranged' },
      { x: 300, z: 700, kind: 'ranged' }, { x: 20, z: 300, kind: 'wrap' },
      { x: 240, z: 560, kind: 'wrap' }, { x: -200, z: 600, kind: 'ram' },
      { x: 120, z: 680, kind: 'plank' }, { x: -120, z: 360, kind: 'plank' },
      { x: 60, z: 820, kind: 'ram' },
    ],
  }),
  makeSea({
    id: 4, name: '熔岩海沟',
    water: 0xb91c1c, fog: 0x7f1d1d, sky: 0xf87171, minimap: '#4a1010',
    corrosionMul: 3, feature: 'heat', unlockHint: '航行归航解锁',
    cx: 30, cz: 630, rx: 770, rz: 730, rot: -0.28, n: 17, jitter: 0.17,
    spawn: { x: 15, z: 0, yaw: -0.1 },
    lh: [
      { x: -500, z: 400, id: 'lh0' }, // ~647m
      { x: 540, z: 460, id: 'lh1' },  // ~699m
      { x: 40, z: 1080, id: 'lh2' },  // ~1080m
    ],
    reefs: [
      { x: -120, z: 340, r: 24 }, { x: 280, z: 540, r: 20 }, { x: -340, z: 700, r: 18 },
      { x: 160, z: 880, r: 17 }, { x: 400, z: 280, r: 16 }, { x: -40, z: 580, r: 14 },
    ],
    islands: [
      { x: -200, z: 580, r: 28 }, { x: 340, z: 740, r: 22 }, { x: 80, z: 420, r: 18 },
    ],
    spawns: [
      { x: -300, z: 300, kind: 'ram' }, { x: 380, z: 360, kind: 'ram' },
      { x: 20, z: 800, kind: 'ram' }, { x: -240, z: 900, kind: 'ranged' },
      { x: 320, z: 680, kind: 'ranged' }, { x: 100, z: 260, kind: 'wrap' },
      { x: -420, z: 540, kind: 'wrap' }, { x: 200, z: 480, kind: 'ram' },
      { x: -40, z: 560, kind: 'plank' }, { x: 240, z: 320, kind: 'plank' },
      { x: -100, z: 720, kind: 'plank' },
    ],
  }),
];

/** Tiny safe tutorial sea — before formal zone 0 */
export const TUTORIAL_MAP = makeSea({
  id: -1,
  name: '练习湾',
  water: 0x7ee8f0,
  fog: 0xc8eef8,
  sky: 0xb8e4f5,
  minimap: '#1a6a72',
  corrosionMul: 0,
  feature: 'tutorial',
  unlockHint: '新手安全教学',
  cx: 0,
  cz: 70,
  rx: 135,
  rz: 125,
  n: 12,
  jitter: 0.08,
  spawn: { x: 0, z: 10, yaw: 0 },
  lh: [{ x: 0, z: 72, id: 'tut-lh' }],
  reefs: [],
  islands: [{ x: -42, z: 48, r: 10 }],
  spawns: [],
});

/** Lighthouse evacuate ring (all maps) */
export const EVAC_RADIUS = 22;
export const EVAC_HOLD = 5;

export function getSeaMap(id) {
  const n = id | 0;
  if (n === -1) return TUTORIAL_MAP;
  return SEA_MAPS[Math.max(0, Math.min(SEA_MAPS.length - 1, n))];
}
