/** Five sea maps — modest 0.6 scale for denser painterly biomes.
 *  Collision still uses island/reef discs. Shoals are visual-only.
 *  Gameplay: corrosionMul, feature, spawn kinds/counts, EVAC unchanged.
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
  lh, reefs, islands, spawns, spawn, shoals,
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
    shoals: shoals || [],
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
 * Seas scaled ~0.6 from the 1.4–1.8km originals. Spawn at south;
 * lighthouses ~300–650m from spawn. Island/reef collision radii are discs.
 */
export const SEA_MAPS = [
  makeSea({
    id: 0, name: '珊瑚浅滩',
    water: 0x5fc6cf, fog: 0xa8d6dc, sky: 0xcdeef2, minimap: '#0d5a62',
    corrosionMul: 1, feature: 'none', unlockHint: '初始海域',
    cx: 0, cz: 372, rx: 468, rz: 432, n: 18, jitter: 0.16,
    spawn: { x: 0, z: 0, yaw: 0 },
    lh: [
      { x: -312, z: 228, id: 'lh0' },
      { x: 324, z: 252, id: 'lh1' },
      { x: 18, z: 630, id: 'lh2' },
    ],
    reefs: [
      { x: -108, z: 132, r: 15 }, { x: 132, z: 288, r: 14 }, { x: 24, z: 216, r: 12 },
      { x: -192, z: 420, r: 17 }, { x: 216, z: 156, r: 13 }, { x: 96, z: 492, r: 14 },
      { x: -60, z: 336, r: 10 }, { x: 180, z: 216, r: 12 }, { x: -216, z: 288, r: 13 },
      { x: 48, z: 408, r: 11 },
    ],
    islands: [
      { x: -84, z: 384, r: 24, shape: 'round' },
      { x: 168, z: 456, r: 19, shape: 'oblong' },
      { x: 48, z: 168, r: 15, shape: 'kidney' },
      { x: -240, z: 240, r: 17, shape: 'oblong' },
      { x: 252, z: 348, r: 15, shape: 'round' },
      { x: 0, z: 300, r: 14, shape: 'kidney' },
      { x: 120, z: 120, r: 12, shape: 'round' },
    ],
    shoals: [
      { x: 90, z: 240, rx: 22, rz: 8, yaw: 0.4 },
      { x: -150, z: 180, rx: 18, rz: 7, yaw: -0.3 },
      { x: 40, z: 450, rx: 20, rz: 6, yaw: 0.8 },
    ],
    spawns: [
      { x: -168, z: 180, kind: 'ram' }, { x: 192, z: 168, kind: 'ram' },
      { x: -96, z: 468, kind: 'ram' }, { x: 120, z: 312, kind: 'ranged' },
      { x: -252, z: 300, kind: 'ranged' }, { x: 72, z: 120, kind: 'wrap' },
      { x: 240, z: 420, kind: 'wrap' }, { x: -36, z: 288, kind: 'ram' },
      { x: 36, z: 360, kind: 'plank' }, { x: 144, z: 216, kind: 'plank' },
      { x: -216, z: 384, kind: 'plank' }, { x: 60, z: 540, kind: 'ram' },
    ],
  }),
  makeSea({
    id: 1, name: '缠绕藻林',
    water: 0x3aa878, fog: 0xb6c9a3, sky: 0xd8e2c6, minimap: '#0d4a38',
    corrosionMul: 1.1, feature: 'current', unlockHint: '航行归航解锁',
    cx: 24, cz: 384, rx: 456, rz: 444, rot: 0.22, n: 17, jitter: 0.18,
    spawn: { x: 12, z: 6, yaw: 0.1 },
    lh: [
      { x: -288, z: 216, id: 'lh0' },
      { x: 336, z: 288, id: 'lh1' },
      { x: 36, z: 660, id: 'lh2' },
    ],
    reefs: [
      { x: 24, z: 180, r: 19 }, { x: -156, z: 348, r: 15 }, { x: 180, z: 252, r: 14 },
      { x: 108, z: 492, r: 16 }, { x: -240, z: 144, r: 12 }, { x: -48, z: 420, r: 13 },
      { x: 90, z: 330, r: 11 }, { x: -120, z: 240, r: 12 },
    ],
    islands: [
      { x: 120, z: 384, r: 22, shape: 'oblong' },
      { x: -120, z: 528, r: 17, shape: 'round' },
      { x: 48, z: 240, r: 14, shape: 'kidney' },
      { x: -216, z: 300, r: 16, shape: 'round' },
      { x: 216, z: 420, r: 15, shape: 'oblong' },
      { x: 0, z: 468, r: 13, shape: 'kidney' },
    ],
    shoals: [
      { x: 60, z: 150, rx: 20, rz: 7, yaw: 0.5 },
      { x: -90, z: 390, rx: 16, rz: 6, yaw: -0.6 },
    ],
    spawns: [
      { x: -204, z: 204, kind: 'ram' }, { x: 228, z: 216, kind: 'ram' },
      { x: 48, z: 432, kind: 'ram' }, { x: -120, z: 336, kind: 'ranged' },
      { x: 216, z: 480, kind: 'ranged' }, { x: 24, z: 144, kind: 'wrap' },
      { x: 264, z: 336, kind: 'wrap' }, { x: -180, z: 468, kind: 'ram' },
      { x: 84, z: 288, kind: 'plank' }, { x: -72, z: 384, kind: 'plank' },
      { x: 132, z: 576, kind: 'ram' },
    ],
  }),
  makeSea({
    id: 2, name: '沉船雾区',
    water: 0xc4a05a, fog: 0xe7c08a, sky: 0xfbe9c0, minimap: '#8a6020',
    corrosionMul: 1.2, feature: 'fog', unlockHint: '航行归航解锁',
    cx: -12, cz: 360, rx: 480, rz: 420, rot: -0.18, n: 18, jitter: 0.15,
    spawn: { x: -6, z: -6, yaw: 0 },
    lh: [
      { x: -336, z: 204, id: 'lh0' },
      { x: 312, z: 180, id: 'lh1' },
      { x: 24, z: 612, id: 'lh2' },
    ],
    reefs: [
      { x: -96, z: 228, r: 20 }, { x: 144, z: 336, r: 15 }, { x: -192, z: 420, r: 14 },
      { x: 240, z: 468, r: 19 }, { x: 12, z: 120, r: 12 }, { x: 72, z: 528, r: 13 },
      { x: -48, z: 300, r: 11 }, { x: 180, z: 216, r: 12 },
    ],
    islands: [
      { x: -144, z: 324, r: 26, shape: 'oblong' },
      { x: 180, z: 276, r: 19, shape: 'round' },
      { x: -24, z: 456, r: 15, shape: 'kidney' },
      { x: 96, z: 168, r: 16, shape: 'round' },
      { x: -240, z: 216, r: 17, shape: 'kidney' },
      { x: 216, z: 390, r: 14, shape: 'oblong' },
      { x: 36, z: 360, r: 18, shape: 'round' },
    ],
    shoals: [
      { x: 48, z: 210, rx: 24, rz: 8, yaw: 0.35 },
      { x: -120, z: 150, rx: 18, rz: 7, yaw: -0.5 },
      { x: 150, z: 480, rx: 20, rz: 6, yaw: 0.9 },
    ],
    spawns: [
      { x: -228, z: 168, kind: 'ram' }, { x: 192, z: 144, kind: 'ram' },
      { x: 12, z: 420, kind: 'ram' }, { x: -96, z: 540, kind: 'ranged' },
      { x: 228, z: 336, kind: 'ranged' }, { x: 72, z: 228, kind: 'wrap' },
      { x: -252, z: 372, kind: 'wrap' }, { x: 120, z: 492, kind: 'ram' },
      { x: -48, z: 288, kind: 'plank' }, { x: 156, z: 216, kind: 'plank' },
      { x: -120, z: 168, kind: 'plank' },
    ],
  }),
  makeSea({
    id: 3, name: '雷暴裂口',
    water: 0x241e50, fog: 0x1a1628, sky: 0x0e0c18, minimap: '#1a1238',
    corrosionMul: 1.4, feature: 'lightning', unlockHint: '航行归航解锁',
    cx: 0, cz: 396, rx: 444, rz: 468, rot: 0.35, n: 16, jitter: 0.2,
    spawn: { x: 0, z: 3, yaw: 0 },
    lh: [
      { x: -276, z: 312, id: 'lh0' },
      { x: 300, z: 288, id: 'lh1' },
      { x: -12, z: 672, id: 'lh2' },
    ],
    reefs: [
      { x: 48, z: 228, r: 17 }, { x: -180, z: 240, r: 15 }, { x: 192, z: 468, r: 20 },
      { x: -96, z: 528, r: 14 }, { x: 120, z: 144, r: 13 }, { x: -24, z: 360, r: 12 },
      { x: 84, z: 330, r: 11 }, { x: -150, z: 390, r: 13 },
    ],
    islands: [
      { x: 24, z: 432, r: 22, shape: 'kidney' },
      { x: -216, z: 456, r: 17, shape: 'oblong' },
      { x: 168, z: 324, r: 14, shape: 'round' },
      { x: 90, z: 180, r: 15, shape: 'round' },
      { x: -120, z: 300, r: 16, shape: 'oblong' },
      { x: 36, z: 540, r: 13, shape: 'kidney' },
    ],
    shoals: [
      { x: -60, z: 180, rx: 16, rz: 6, yaw: 0.2 },
      { x: 120, z: 420, rx: 14, rz: 5, yaw: -0.4 },
    ],
    spawns: [
      { x: -156, z: 252, kind: 'ram' }, { x: 204, z: 240, kind: 'ram' },
      { x: 24, z: 576, kind: 'ram' }, { x: -228, z: 420, kind: 'ranged' },
      { x: 180, z: 420, kind: 'ranged' }, { x: 12, z: 180, kind: 'wrap' },
      { x: 144, z: 336, kind: 'wrap' }, { x: -120, z: 360, kind: 'ram' },
      { x: 72, z: 408, kind: 'plank' }, { x: -72, z: 216, kind: 'plank' },
      { x: 36, z: 492, kind: 'ram' },
    ],
  }),
  makeSea({
    id: 4, name: '熔岩海沟',
    water: 0x4a1818, fog: 0x1a0e10, sky: 0x1a0f10, minimap: '#4a1010',
    corrosionMul: 3, feature: 'heat', unlockHint: '航行归航解锁',
    cx: 18, cz: 378, rx: 462, rz: 438, rot: -0.28, n: 17, jitter: 0.17,
    spawn: { x: 9, z: 0, yaw: -0.1 },
    lh: [
      { x: -300, z: 240, id: 'lh0' },
      { x: 324, z: 276, id: 'lh1' },
      { x: 24, z: 648, id: 'lh2' },
    ],
    reefs: [
      { x: -72, z: 204, r: 20 }, { x: 168, z: 324, r: 17 }, { x: -204, z: 420, r: 15 },
      { x: 96, z: 528, r: 14 }, { x: 240, z: 168, r: 14 }, { x: -24, z: 348, r: 12 },
      { x: 60, z: 270, r: 11 }, { x: -150, z: 300, r: 13 },
    ],
    islands: [
      { x: -120, z: 348, r: 24, shape: 'oblong' },
      { x: 204, z: 444, r: 19, shape: 'kidney' },
      { x: 48, z: 252, r: 15, shape: 'round' },
      { x: -216, z: 216, r: 16, shape: 'round' },
      { x: 132, z: 180, r: 14, shape: 'oblong' },
      { x: 0, z: 480, r: 17, shape: 'kidney' },
    ],
    shoals: [
      { x: 30, z: 150, rx: 18, rz: 7, yaw: 0.55 },
      { x: -90, z: 420, rx: 16, rz: 6, yaw: -0.2 },
    ],
    spawns: [
      { x: -180, z: 180, kind: 'ram' }, { x: 228, z: 216, kind: 'ram' },
      { x: 12, z: 480, kind: 'ram' }, { x: -144, z: 540, kind: 'ranged' },
      { x: 192, z: 408, kind: 'ranged' }, { x: 60, z: 156, kind: 'wrap' },
      { x: -252, z: 324, kind: 'wrap' }, { x: 120, z: 288, kind: 'ram' },
      { x: -24, z: 336, kind: 'plank' }, { x: 144, z: 192, kind: 'plank' },
      { x: -60, z: 432, kind: 'plank' },
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
  islands: [{ x: -42, z: 48, r: 10, shape: 'round' }],
  shoals: [{ x: 28, z: 36, rx: 12, rz: 5, yaw: 0.4 }],
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
