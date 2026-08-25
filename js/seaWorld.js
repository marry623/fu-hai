/** Load / clear irregular sea geometry; boat constraint; water tint */

import * as THREE from 'three';
import { addOutline, toonMat } from './stylekit.js';
import { getSeaMap, constrainToPoly, pointInPoly, EVAC_RADIUS, TUTORIAL_BEATS, TUTORIAL_EVAC_RADIUS } from './seaMaps.js?v=32y';
import { getSeaBiome } from './seaBiomes.js?v=30h';
import { scatterBiomeDecor, updateBiomeDecor } from './biomeDecor.js?v=30j';
import {
  clonePropGlb, ensureAllPropGlbsLoading, ensureZonePropGlbsLoading,
  isPropGlbReady, onPropGlbReady, styleCoralProp, areZonePropsReady, propIdsForZone,
} from './propGlb.js?v=39d';

function M(geo, color, gradientMap, outline = 1.05) {
  const m = new THREE.Mesh(geo, toonMat(color, gradientMap, { flatShading: true }));
  if (outline) addOutline(m, outline);
  return m;
}

function makeLighthouse(gm, biome) {
  const g = new THREE.Group();
  // Built at ~3× original dimensions so the tower reads from far away
  const S = 3;
  const stone = biome?.lighthouseStone ?? 0x4a5568;
  const stripe = biome?.lighthouseStripe ?? 0xe85d4c;
  const lamp = biome?.lighthouseLamp ?? 0xfff4a8;
  const cream = biome?.islandSkin === 'sand' || biome?.islandSkin === 'golden' || biome?.id === -1
    ? 0xfefae0
    : stone;
  const base = M(new THREE.CylinderGeometry(1.4 * S, 1.6 * S, 0.8 * S, 6), stone, gm, 1.04);
  base.position.y = 0.4 * S;
  g.add(base);
  const stripes = [
    [cream, 1.0], [stripe, 0.92], [cream, 0.85],
    [stripe, 0.78], [cream, 0.72],
  ];
  let y = 0.8 * S;
  for (const [col, r] of stripes) {
    const ring = M(new THREE.CylinderGeometry(r * 0.92 * S, r * S, 1.5 * S, 8), col, gm, 1.04);
    ring.position.y = y + 0.75 * S;
    g.add(ring);
    y += 1.45 * S;
  }
  const cap = M(new THREE.ConeGeometry(0.95 * S, 1.0 * S, 8), stripe, gm, 1.06);
  cap.position.y = y + 0.6 * S;
  g.add(cap);

  // Bright beacon orb (always-on, unlit) — guides player from long range
  const beaconY = y + 0.35 * S;
  const lightCore = new THREE.Mesh(
    new THREE.SphereGeometry(1.35 * S, 10, 8),
    new THREE.MeshBasicMaterial({ color: lamp })
  );
  lightCore.position.y = beaconY;
  lightCore.userData.skipOutline = true;
  g.add(lightCore);

  const lightHalo = new THREE.Mesh(
    new THREE.SphereGeometry(2.2 * S, 10, 8),
    new THREE.MeshBasicMaterial({
      color: lamp,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    })
  );
  lightHalo.position.y = beaconY;
  lightHalo.userData.skipOutline = true;
  g.add(lightHalo);

  // Vertical light shaft for distant guidance
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55 * S, 1.8 * S, 55 * S, 8, 1, true),
    new THREE.MeshBasicMaterial({
      color: lamp,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  beam.position.y = beaconY + 27 * S;
  beam.userData.skipOutline = true;
  g.add(beam);

  const point = new THREE.PointLight(lamp, 4.5, 900, 1.4);
  point.position.y = beaconY;
  g.add(point);

  g.userData.beacon = { core: lightCore, halo: lightHalo, beam, point };
  g.userData.beaconY = beaconY;

  // Evacuate ring on water (all maps)
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x7dffc0,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(EVAC_RADIUS * 0.92, EVAC_RADIUS, 48),
    ringMat
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.08;
  ring.userData.skipOutline = true;
  g.add(ring);
  g.userData.evacRing = ring;
  g.userData.evacRingMat = ringMat;

  return g;
}

/** Practice bay only — taller, brighter, gold evac ring; hidden until tutorial step 5 */
function makeTutorialLighthouse(gm) {
  const g = new THREE.Group();
  const S = 3.6;
  const stone = 0x5a6878;
  const stripe = 0xffc857;
  const lamp = 0xfff8c0;
  const cream = 0xfefae0;
  const base = M(new THREE.CylinderGeometry(1.5 * S, 1.7 * S, 0.9 * S, 6), stone, gm, 1.04);
  base.position.y = 0.45 * S;
  g.add(base);
  const stripes = [
    [cream, 1.05], [stripe, 0.98], [cream, 0.9],
    [stripe, 0.84], [cream, 0.78], [stripe, 0.72],
  ];
  let y = 0.9 * S;
  for (const [col, r] of stripes) {
    const ring = M(new THREE.CylinderGeometry(r * 0.92 * S, r * S, 1.55 * S, 8), col, gm, 1.04);
    ring.position.y = y + 0.78 * S;
    g.add(ring);
    y += 1.5 * S;
  }
  const cap = M(new THREE.ConeGeometry(1.05 * S, 1.15 * S, 8), stripe, gm, 1.06);
  cap.position.y = y + 0.65 * S;
  g.add(cap);
  const beaconY = y + 0.4 * S;
  const lightCore = new THREE.Mesh(
    new THREE.SphereGeometry(1.65 * S, 12, 10),
    new THREE.MeshBasicMaterial({ color: lamp })
  );
  lightCore.position.y = beaconY;
  lightCore.userData.skipOutline = true;
  g.add(lightCore);
  const lightHalo = new THREE.Mesh(
    new THREE.SphereGeometry(3.2 * S, 12, 10),
    new THREE.MeshBasicMaterial({ color: lamp, transparent: true, opacity: 0.45, depthWrite: false })
  );
  lightHalo.position.y = beaconY;
  lightHalo.userData.skipOutline = true;
  g.add(lightHalo);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7 * S, 2.4 * S, 70 * S, 8, 1, true),
    new THREE.MeshBasicMaterial({
      color: lamp, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false,
    })
  );
  beam.position.y = beaconY + 34 * S;
  beam.userData.skipOutline = true;
  g.add(beam);
  const point = new THREE.PointLight(lamp, 7, 1200, 1.2);
  point.position.y = beaconY;
  g.add(point);
  g.userData.beacon = { core: lightCore, halo: lightHalo, beam, point };
  g.userData.beaconY = beaconY;
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffe066,
    transparent: true,
    opacity: 0.32,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(TUTORIAL_EVAC_RADIUS * 0.9, TUTORIAL_EVAC_RADIUS, 48),
    ringMat
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.08;
  ring.userData.skipOutline = true;
  g.add(ring);
  g.userData.evacRing = ring;
  g.userData.evacRingMat = ringMat;
  g.userData.isTutorialLh = true;
  g.userData.evacRadius = TUTORIAL_EVAC_RADIUS;
  g.visible = false;
  return g;
}

function beachRing(poly, gradientMap, sandHex = 0xe8d5a3) {
  const g = new THREE.Group();
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const mx = (a.x + b.x) / 2;
    const mz = (a.z + b.z) / 2;
    const sand = M(new THREE.CylinderGeometry(10, 13, 0.7, 6), sandHex, gradientMap, 1.02);
    sand.position.set(mx, -0.15, mz);
    g.add(sand);
    // Outer shelf between vertices for continuous shoreline
    const sand2 = M(new THREE.CylinderGeometry(8, 10, 0.5, 6), sandHex, gradientMap, 1.02);
    sand2.position.set(a.x, -0.2, a.z);
    g.add(sand2);
  }
  return g;
}

function reefColor(biome, i) {
  switch (biome.reefSkin) {
    case 'coral': return i % 2 ? biome.accent : 0xf0c98a;
    case 'kelp': return i % 2 ? 0x3a5a40 : 0x5e7c4a;
    case 'grove': return i % 2 ? 0x5a3a18 : 0x8a5a2c;
    case 'wreck': return i % 2 ? 0x4a3a28 : biome.lighthouseStone;
    case 'spire': return biome.lighthouseStone;
    case 'vent': return biome.lighthouseStone;
    default: return 0x6b7a88;
  }
}

function hash2(x, z) {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Returns true when (x,z) falls inside the tutorial bay's open practice zone.
 * Decorations placed in this zone are skipped so the centre stays completely clear.
 * The bay is roughly an ellipse centred at (0, 50) with semi-axes rx=52, rz=118.
 * We clear the inner 65 % of that ellipse, leaving only the outer rim for props.
 */
function inTutorialClearZone(x, z) {
  const nx = x / 52, nz = (z - 50) / 118;
  return nx * nx + nz * nz < 0.80 * 0.80;
}

/** True when (x,z) overlaps any existing propDisc by more than margin. */
function propHit(discs, x, z, margin) {
  for (const d of discs) {
    if (Math.hypot(x - d.x, z - d.z) < d.r + margin) return true;
  }
  return false;
}

/**
 * XZ disc radius from applied uniform scale + mesh AABB.
 * ~0.52 of long-axis extent: covers most of the footprint without the old
 * hard 8–22m caps that caused air walls / clipping on zone 2–4 stones.
 */
function meshPropDiscR(appliedScale, baseSizeXZ, minR = 2.5) {
  return Math.max(minR, appliedScale * baseSizeXZ * 0.52);
}

/** Island collision radius — oblong mesh stretches to 1.28× on the long axis. */
function islandCollideR(isl) {
  const shape = isl.shape || 'round';
  const mul = shape === 'oblong' ? 1.22 : shape === 'kidney' ? 1.05 : 1;
  return isl.r * mul;
}

function scatterZone0Coral(root, map, biome, gradientMap, propDiscs = null) {
  if (!isPropGlbReady('zone0Coral')) return;
  const tpl = clonePropGlb('zone0Coral');
  if (!tpl) return;
  const baseSize = tpl.userData.baseSize || 6;
  const colors = [biome.accent, 0xff9aae, 0xf4a261, 0xffb88c, biome.lighthouseStone];
  const pts = [];

  for (const r of map.reefs) {
    pts.push({ x: r.x, z: r.z, s: 1.2, reefR: r.r });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + hash2(r.x, r.z) * 0.6;
      pts.push({
        x: r.x + Math.cos(a) * r.r * (0.28 + hash2(i, r.x) * 0.45),
        z: r.z + Math.sin(a) * r.r * (0.28 + hash2(i, r.z) * 0.45),
        s: 0.5 + hash2(r.x + i, r.z) * 0.55,
        reefR: r.r,
      });
    }
  }
  for (const isl of map.islands) {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + hash2(isl.x, isl.z);
      pts.push({
        x: isl.x + Math.cos(a) * isl.r * (0.3 + hash2(i, isl.x) * 0.45),
        z: isl.z + Math.sin(a) * isl.r * (0.3 + hash2(i, isl.z) * 0.45),
        s: 0.45 + hash2(isl.x, i) * 0.6,
        reefR: isl.r * 0.65,
      });
    }
  }

  const isTutCoral = (map.id | 0) === -1;
  for (const pt of pts) {
    if (isTutCoral && inTutorialClearZone(pt.x, pt.z)) continue;
    if (propDiscs && propHit(propDiscs, pt.x, pt.z, 8)) continue;
    const c = tpl.clone(true);
    c.position.set(pt.x, 0, pt.z);
    c.rotation.y = hash2(pt.x, pt.z) * Math.PI * 2;
    const rawSizeMul = 1 + hash2(pt.x, pt.z) * 4;
    const sizeMul = isTutCoral ? Math.min(rawSizeMul, 2.0) : rawSizeMul;
    c.scale.setScalar((3.87 * pt.s * sizeMul) / baseSize);
    const col = colors[Math.floor(hash2(pt.x + pt.z, pt.z) * colors.length) % colors.length];
    styleCoralProp(c, col, gradientMap);
    root.add(c);
    if (propDiscs) propDiscs.push({ x: pt.x, z: pt.z, r: Math.max(1.5, 3.87 * pt.s * sizeMul * 0.28) });
  }
}

function scatterZone0Rocks(root, map, propDiscs = null) {
  if (!isPropGlbReady('zone0Rock')) return;
  const tpl = clonePropGlb('zone0Rock');
  if (!tpl) return;
  const baseSize = tpl.userData.baseSize || 1.68;
  const pts = [];

  for (const r of map.reefs) {
    pts.push({ x: r.x, z: r.z, r: r.r, seed: hash2(r.x, r.z) });
    if (hash2(r.z, r.x) > 0.35) {
      const a = hash2(r.x, 1) * Math.PI * 2;
      pts.push({
        x: r.x + Math.cos(a) * r.r * 0.35,
        z: r.z + Math.sin(a) * r.r * 0.35,
        r: r.r,
        seed: hash2(r.x + 1, r.z),
      });
    }
  }
  for (const isl of map.islands) {
    const a = hash2(isl.x, isl.z) * Math.PI * 2;
    pts.push({
      x: isl.x + Math.cos(a) * isl.r * 0.25,
      z: isl.z + Math.sin(a) * isl.r * 0.25,
      r: isl.r * 0.7,
      seed: hash2(isl.x, isl.z),
    });
  }

  const isTutRock = (map.id | 0) === -1;
  for (const pt of pts) {
    if (isTutRock && inTutorialClearZone(pt.x, pt.z)) continue;
    if (propDiscs && propHit(propDiscs, pt.x, pt.z, 7)) continue;
    const rock = tpl.clone(true);
    rock.position.set(pt.x, 0, pt.z);
    rock.rotation.y = pt.seed * Math.PI * 2;
    const sizeMul = 0.55 + hash2(pt.x, pt.z) * 1.65;
    const base = (pt.r * 0.76 * sizeMul) / baseSize;
    const sx = base * (0.7 + hash2(pt.seed, pt.x) * 0.65);
    const sy = base * (0.55 + hash2(pt.seed, pt.z) * 0.85);
    const sz = base * (0.75 + hash2(pt.x + pt.z, pt.seed) * 0.55);
    rock.scale.set(sx * 0.7, sy * 0.7, sz * 0.7);
    root.add(rock);
    if (propDiscs) {
      const baseXZ = tpl.userData.baseSizeXZ || baseSize;
      const collScale = Math.max(sx, sz) * 0.7;
      propDiscs.push({ x: pt.x, z: pt.z, r: meshPropDiscR(collScale, baseXZ, 2) });
    }
  }
}

function collectExtraZone0Points(map) {
  const pts = [];
  for (const r of map.reefs) {
    for (let i = 0; i < 3; i++) {
      const a = hash2(r.x + 0.31, r.z + i) * Math.PI * 2;
      pts.push({
        x: r.x + Math.cos(a) * r.r * (0.52 + hash2(i, r.z) * 0.38),
        z: r.z + Math.sin(a) * r.r * (0.52 + hash2(i, r.x) * 0.38),
        r: r.r,
        seed: hash2(r.x + i * 1.7, r.z),
      });
    }
  }
  for (let i = 0; i < map.reefs.length; i++) {
    const a = map.reefs[i];
    const b = map.reefs[(i + 3) % map.reefs.length];
    pts.push({
      x: (a.x + b.x) * 0.5 + (hash2(i, a.z) - 0.5) * 36,
      z: (a.z + b.z) * 0.5 + (hash2(a.x, i) - 0.5) * 36,
      r: (a.r + b.r) * 0.38,
      seed: hash2(a.x + b.x, a.z + b.z),
    });
  }
  for (const isl of map.islands) {
    for (let i = 0; i < 3; i++) {
      const a = hash2(isl.x + 2.1, i) * Math.PI * 2;
      pts.push({
        x: isl.x + Math.cos(a) * isl.r * (0.52 + hash2(i, isl.z) * 0.42),
        z: isl.z + Math.sin(a) * isl.r * (0.52 + hash2(i, isl.x) * 0.42),
        r: isl.r * 0.58,
        seed: hash2(isl.x, isl.z + i),
      });
    }
  }
  // Bounds-derived points: skip for tutorial bay — large r values make props 20-40 m tall
  {
    const b = map.bounds;
    if (b) {
      for (let i = 0; i < 28; i++) {
        const hx = hash2(i, 3.7);
        const hz = hash2(i, 9.1);
        pts.push({
          x: b.minX + hx * (b.maxX - b.minX),
          z: b.minZ + hz * (b.maxZ - b.minZ),
          r: 11 + hash2(i, hx) * 9,
          seed: hash2(hx, hz),
        });
      }
    }
  }
  // Tutorial bay: keep only outer-rim points, cap r so props stay small
  if ((map.id | 0) === -1) {
    return pts
      .filter(pt => !inTutorialClearZone(pt.x, pt.z))
      .map(pt => ({ ...pt, r: Math.min(pt.r, 5) }));
  }
  return pts;
}

function scatterZone0ExtraCoral(root, map, biome, gradientMap, propDiscs = null) {
  if (!isPropGlbReady('zone0CoralB')) return;
  const tpl = clonePropGlb('zone0CoralB');
  if (!tpl) return;
  const baseSize = tpl.userData.baseSize || 6;
  const colors = [biome.accent, 0xff9aae, 0xf4a261, 0xffb88c, 0xff6b9d, biome.lighthouseStone];
  const sizeBoost = 1.28;
  const isTut = (map.id | 0) === -1;

  for (const pt of collectExtraZone0Points(map)) {
    if (propDiscs && propHit(propDiscs, pt.x, pt.z, 8)) continue;
    const c = tpl.clone(true);
    c.position.set(pt.x, 0, pt.z);
    c.rotation.y = pt.seed * Math.PI * 2;
    const rawSizeMul = (1.15 + hash2(pt.x, pt.z) * 4.2) * sizeBoost;
    const sizeMul = isTut ? Math.min(rawSizeMul, 1.5) : rawSizeMul;
    const s = 0.55 + hash2(pt.seed, pt.x + pt.z) * 0.65;
    c.scale.setScalar((4.13 * s * sizeMul) / baseSize);
    const col = colors[Math.floor(hash2(pt.x + pt.z, pt.seed) * colors.length) % colors.length];
    styleCoralProp(c, col, gradientMap);
    root.add(c);
    if (propDiscs) propDiscs.push({ x: pt.x, z: pt.z, r: Math.max(1.5, 4.13 * s * sizeMul * 0.28) });
  }
}

function scatterZone0ExtraRocks(root, map, propDiscs = null) {
  if (!isPropGlbReady('zone0RockB')) return;
  const tpl = clonePropGlb('zone0RockB');
  if (!tpl) return;
  const baseSize = tpl.userData.baseSize || 1.68;
  const sizeBoost = 1.3;

  for (const pt of collectExtraZone0Points(map)) {
    if (hash2(pt.seed, pt.x) < 0.42) continue;
    if (propDiscs && propHit(propDiscs, pt.x, pt.z, 8)) continue;
    const rock = tpl.clone(true);
    rock.position.set(pt.x, 0, pt.z);
    rock.rotation.y = pt.seed * Math.PI * 2;
    const sizeMul = (0.65 + hash2(pt.x, pt.z) * 1.75) * sizeBoost;
    const base = (pt.r * 0.82 * sizeMul) / baseSize;
    const sx = base * (0.68 + hash2(pt.seed, pt.x) * 0.72);
    const sy = base * (0.52 + hash2(pt.seed, pt.z) * 0.92);
    const sz = base * (0.72 + hash2(pt.x + pt.z, pt.seed) * 0.58);
    rock.scale.set(sx * 0.7, sy * 0.7, sz * 0.7);
    root.add(rock);
    if (propDiscs) {
      const baseXZ = tpl.userData.baseSizeXZ || baseSize;
      const collScale = Math.max(sx, sz) * 0.7;
      propDiscs.push({ x: pt.x, z: pt.z, r: meshPropDiscR(collScale, baseXZ, 2) });
    }
  }
}

function collectMoreZone0Points(map) {
  const pts = [];
  const reefs = map.reefs || [];
  for (const r of reefs) {
    for (let i = 0; i < 4; i++) {
      const a = hash2(r.x + 5.7, r.z + i * 0.9) * Math.PI * 2;
      pts.push({
        x: r.x + Math.cos(a) * r.r * (0.18 + hash2(i + 9, r.x) * 0.72),
        z: r.z + Math.sin(a) * r.r * (0.18 + hash2(i + 9, r.z) * 0.72),
        r: r.r,
        seed: hash2(r.x * 1.3 + i, r.z * 0.7),
      });
    }
  }
  for (let i = 0; i < reefs.length; i++) {
    const a = reefs[i];
    const b = reefs[(i + 5) % reefs.length];
    const c = reefs[(i + 7) % reefs.length];
    pts.push({
      x: (a.x + b.x + c.x) / 3 + (hash2(i, 11) - 0.5) * 28,
      z: (a.z + b.z + c.z) / 3 + (hash2(11, i) - 0.5) * 28,
      r: (a.r + b.r + c.r) / 3 * 0.42,
      seed: hash2(a.x, c.z),
    });
  }
  for (const isl of map.islands || []) {
    for (let i = 0; i < 4; i++) {
      const a = hash2(isl.x + 7.3, i) * Math.PI * 2;
      pts.push({
        x: isl.x + Math.cos(a) * isl.r * (0.35 + hash2(i + 4, isl.z) * 0.62),
        z: isl.z + Math.sin(a) * isl.r * (0.35 + hash2(i + 4, isl.x) * 0.62),
        r: isl.r * 0.62,
        seed: hash2(isl.x + i, isl.z + 2),
      });
    }
  }
  const nav = map.navigable || [];
  for (let i = 0; i < nav.length; i++) {
    const p = nav[i];
    const p2 = nav[(i + 2) % nav.length];
    pts.push({
      x: (p.x + p2.x) * 0.5,
      z: (p.z + p2.z) * 0.5,
      r: 9 + hash2(i, p.x) * 10,
      seed: hash2(p.x, p.z),
    });
  }
  const bd = map.bounds;
  if (bd) {
    for (let i = 0; i < 34; i++) {
      const hx = hash2(i + 40, 6.2);
      const hz = hash2(i + 40, 13.4);
      pts.push({
        x: bd.minX + hx * (bd.maxX - bd.minX),
        z: bd.minZ + hz * (bd.maxZ - bd.minZ),
        r: 12 + hash2(i + 1, hx) * 10,
        seed: hash2(hx + 2, hz + 1),
      });
    }
  }
  if (map.spawn) {
    for (let i = 0; i < 6; i++) {
      const a = hash2(i, map.spawn.x) * Math.PI * 2;
      const d = 80 + hash2(map.spawn.z, i) * 220;
      pts.push({
        x: map.spawn.x + Math.cos(a) * d,
        z: map.spawn.z + Math.sin(a) * d,
        r: 10 + hash2(i, d) * 8,
        seed: hash2(map.spawn.x + i, map.spawn.z),
      });
    }
  }
  // Tutorial bay: strip any point inside the open practice ellipse; cap r so props stay small
  if ((map.id | 0) === -1) {
    return pts
      .filter(pt => !inTutorialClearZone(pt.x, pt.z))
      .map(pt => ({ ...pt, r: Math.min(pt.r, 5) }));
  }
  return pts;
}

function scatterZone0MoreCoral(root, map, biome, gradientMap, propId, pickFn, sizeBoost = 1.35, propDiscs = null) {
  if (!isPropGlbReady(propId)) return;
  const tpl = clonePropGlb(propId);
  if (!tpl) return;
  const baseSize = tpl.userData.baseSize || 6;
  const colors = [biome.accent, 0xff9aae, 0xf4a261, 0xffb88c, 0xff6b9d, 0xe85d8c, biome.lighthouseStone];
  const isTut = (map.id | 0) === -1;

  for (const pt of collectMoreZone0Points(map)) {
    if (!pickFn(pt)) continue;
    if (propDiscs && propHit(propDiscs, pt.x, pt.z, 8)) continue;
    const c = tpl.clone(true);
    c.position.set(pt.x, 0, pt.z);
    c.rotation.y = pt.seed * Math.PI * 2;
    const rawSizeMul = (1.2 + hash2(pt.x, pt.z) * 4.4) * sizeBoost;
    const sizeMul = isTut ? Math.min(rawSizeMul, 1.5) : rawSizeMul;
    const s = 0.58 + hash2(pt.seed, pt.x + pt.z) * 0.68;
    c.scale.setScalar((4.27 * s * sizeMul) / baseSize);
    const col = colors[Math.floor(hash2(pt.x + pt.z, pt.seed) * colors.length) % colors.length];
    styleCoralProp(c, col, gradientMap);
    root.add(c);
    if (propDiscs) propDiscs.push({ x: pt.x, z: pt.z, r: Math.max(1.5, 4.27 * s * sizeMul * 0.28) });
  }
}

function scatterZone0MoreCoralC(root, map, biome, gradientMap, propDiscs = null) {
  scatterZone0MoreCoral(root, map, biome, gradientMap, 'zone0CoralC',
    (pt) => hash2(pt.seed, pt.x + 1) > 0.48, 0.54, propDiscs); // 2.5× smaller than default 1.35
}

function scatterZone0MoreCoralD(root, map, biome, gradientMap, propDiscs = null) {
  scatterZone0MoreCoral(root, map, biome, gradientMap, 'zone0CoralD',
    (pt) => hash2(pt.seed, pt.z + 2) > 0.48, 0.54, propDiscs); // 2.5× smaller than default 1.35
}

function scatterZone0MoreRocks(root, map, propDiscs = null) {
  if (!isPropGlbReady('zone0RockC')) return;
  const tpl = clonePropGlb('zone0RockC');
  if (!tpl) return;
  const baseSize = tpl.userData.baseSize || 1.68;
  const sizeBoost = 1.36;
  const isTut = (map.id | 0) === -1;

  for (const pt of collectMoreZone0Points(map)) {
    if (hash2(pt.seed + 3, pt.z) < 0.38) continue;
    if (propDiscs && propHit(propDiscs, pt.x, pt.z, 8)) continue;
    const rock = tpl.clone(true);
    rock.position.set(pt.x, 0, pt.z);
    rock.rotation.y = pt.seed * Math.PI * 2;
    const rawSizeMul = (0.7 + hash2(pt.x, pt.z) * 1.8) * sizeBoost;
    const sizeMul = isTut ? Math.min(rawSizeMul, 1.5) : rawSizeMul;
    const base = (pt.r * 0.85 * sizeMul) / baseSize;
    const sx = base * (0.65 + hash2(pt.seed, pt.x) * 0.78);
    const sy = base * (0.5 + hash2(pt.seed, pt.z) * 0.95);
    const sz = base * (0.7 + hash2(pt.x + pt.z, pt.seed) * 0.62);
    rock.scale.set(sx * 0.7, sy * 0.7, sz * 0.7);
    root.add(rock);
    if (propDiscs) {
      const baseXZ = tpl.userData.baseSizeXZ || baseSize;
      const collScale = Math.max(sx, sz) * 0.7;
      propDiscs.push({ x: pt.x, z: pt.z, r: meshPropDiscR(collScale, baseXZ, 2) });
    }
  }
}

// 新石头散布：石头1/石头2/stone001，大尺寸带碰撞
// 允许与珊瑚重叠（不做 propHit），刷新点大量增加
function scatterZone0NewRocks(root, map, propDiscs = null) {
  const propIds = ['zone0RockNew1', 'zone0RockNew2', 'zone0RockNew3'];
  const tpls = propIds
    .filter(id => isPropGlbReady(id))
    .map(id => { const t = clonePropGlb(id); return t ? { tpl: t, baseSize: t.userData.baseSize || 6 } : null; })
    .filter(Boolean);
  if (tpls.length === 0) return;

  const isTut = (map.id | 0) === -1;
  // 降低 hash 阈值 → 点数翻倍，合并两套点集
  const pts = [
    ...collectExtraZone0Points(map).filter(pt => hash2(pt.seed + 7, pt.x + pt.z) > 0.20),
    ...collectMoreZone0Points(map).filter(pt => hash2(pt.seed + 11, pt.x - pt.z) > 0.25),
  ];

  for (const pt of pts) {
    // 不做 propHit，允许在珊瑚旁刷新，少量重叠无妨
    const idx = Math.floor(hash2(pt.x + 13, pt.z + 7) * tpls.length) % tpls.length;
    const { tpl, baseSize } = tpls[idx];
    const rock = tpl.clone(true);
    rock.position.set(pt.x, 0, pt.z);
    rock.rotation.y = hash2(pt.x + 5, pt.z) * Math.PI * 2;
    // 各石头目标尺寸各异：zone0RockNew1 ×10 / zone0RockNew2 ×7 / zone0RockNew3 ×13
    const ROCK_TARGETS = [10, 7, 13];
    const ROCK_RANGES  = [[2.0, 5.5], [1.5, 4.0], [2.5, 7.0]];
    const [rMin, rMax] = ROCK_RANGES[idx];
    const rawSizeMul = rMin + hash2(pt.x, pt.z + 9) * (rMax - rMin);
    const sizeMul = isTut ? Math.min(rawSizeMul, 1.5) : rawSizeMul;
    const s = (sizeMul * ROCK_TARGETS[idx]) / baseSize * 0.7;
    rock.scale.setScalar(s);
    root.add(rock);
    if (propDiscs) {
      const baseXZ = tpl.userData.baseSizeXZ || baseSize;
      propDiscs.push({ x: pt.x, z: pt.z, r: meshPropDiscR(s, baseXZ, 3) });
    }
  }
}

/** 珊瑚3 / 珊瑚4 — placed at ~2.5× smaller than the standard coral scatter */
function scatterZone0SmallCoral(root, map, biome, gradientMap, propId, pickFn, propDiscs = null) {
  if (!isPropGlbReady(propId)) return;
  const tpl = clonePropGlb(propId);
  if (!tpl) return;
  const baseSize = tpl.userData.baseSize || 6;
  const colors = [biome.accent, 0xff9aae, 0xf4a261, 0xffb88c, 0xff6b9d, 0xe85d8c, biome.lighthouseStone];
  const sizeBoost = 0.54; // 1.35 / 2.5 ≈ 0.54 → 2.5× smaller than standard scatter

  for (const pt of collectMoreZone0Points(map)) {
    if (!pickFn(pt)) continue;
    if (propDiscs && propHit(propDiscs, pt.x, pt.z, 7)) continue;
    const c = tpl.clone(true);
    c.position.set(pt.x, 0, pt.z);
    c.rotation.y = pt.seed * Math.PI * 2;
    const sizeMul = (1.2 + hash2(pt.x, pt.z) * 4.4) * sizeBoost;
    const s = 0.58 + hash2(pt.seed, pt.x + pt.z) * 0.68;
    c.scale.setScalar((4.27 * s * sizeMul) / baseSize);
    const col = colors[Math.floor(hash2(pt.x + pt.z, pt.seed) * colors.length) % colors.length];
    styleCoralProp(c, col, gradientMap);
    root.add(c);
    if (propDiscs) propDiscs.push({ x: pt.x, z: pt.z, r: Math.max(1.5, 4.27 * s * sizeMul * 0.28) });
  }
}

function scatterZone0CoralE(root, map, biome, gradientMap, propDiscs = null) {
  scatterZone0SmallCoral(root, map, biome, gradientMap, 'zone0CoralE',
    (pt) => hash2(pt.seed, pt.x + 3) > 0.52, propDiscs);
}

function scatterZone0CoralF(root, map, biome, gradientMap, propDiscs = null) {
  scatterZone0SmallCoral(root, map, biome, gradientMap, 'zone0CoralF',
    (pt) => hash2(pt.seed, pt.z + 5) > 0.52, propDiscs);
}

function scatterZone0CoralG(root, map, biome, gradientMap, propDiscs = null) {
  scatterZone0SmallCoral(root, map, biome, gradientMap, 'zone0CoralG',
    (pt) => hash2(pt.seed, pt.x + 7) > 0.55, propDiscs);
}

function scatterZone0CoralH(root, map, biome, gradientMap, propDiscs = null) {
  scatterZone0SmallCoral(root, map, biome, gradientMap, 'zone0CoralH',
    (pt) => hash2(pt.seed, pt.z + 9) > 0.55, propDiscs);
}

/**
 * 练习湾专用：沿外圈椭圆放置一圈珊瑚。
 * 练习湾 reefs=[] 且两座小岛都在 clear zone 内，导致普通散布函数生成 0 点。
 * 这里直接在椭圆 82%–114% 半径处采样，clear zone 之外的点才放置。
 */
function scatterTutorialRimCoral(root, map, biome, gradientMap, propDiscs = null) {
  if (!isPropGlbReady('zone0CoralB')) return;
  const tpl = clonePropGlb('zone0CoralB');
  if (!tpl) return;
  const baseSize = tpl.userData.baseSize || 6;
  const colors = [biome.accent, 0xff9aae, 0xf4a261, 0xffb88c, 0xff6b9d];
  const rx = 52, rz = 118, cx = 0, cz = 50;
  const N = 22;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + hash2(i, 3.7) * 0.35;
    const dist = 0.82 + hash2(i, 9.1) * 0.32;
    const x = cx + Math.cos(a) * rx * dist;
    const z = cz + Math.sin(a) * rz * dist;
    const nx = x / rx, nz = (z - cz) / rz;
    if (nx * nx + nz * nz < 0.64) continue;
    const c = tpl.clone(true);
    c.position.set(x, 0, z);
    c.rotation.y = hash2(x, z) * Math.PI * 2;
    const sizeMul = 0.52 + hash2(x, z) * 0.78;
    c.scale.setScalar((3.2 * sizeMul) / baseSize);
    const col = colors[Math.floor(hash2(x + z, i) * colors.length) % colors.length];
    styleCoralProp(c, col, gradientMap);
    root.add(c);
    if (propDiscs) propDiscs.push({ x, z, r: Math.max(1.5, 3.2 * sizeMul * 0.28) });
  }
}

/**
 * 珊瑚浅滩专用：填充入口南部(z=30–160)和远北部(z=540–700)两个稀疏区。
 * 现有 reef 全部集中在 z=132–492，导致入口和远北几乎没有珊瑚。
 */
function scatterZone0GapCoral(root, map, biome, gradientMap, propDiscs = null) {
  if (!isPropGlbReady('zone0CoralB')) return;
  const tpl = clonePropGlb('zone0CoralB');
  if (!tpl) return;
  const baseSize = tpl.userData.baseSize || 6;
  const colors = [biome.accent, 0xff9aae, 0xf4a261, 0xffb88c, 0xff6b9d, biome.lighthouseStone];
  const anchors = [
    // 南部入口
    { x: -168, z: 72, r: 14 }, { x: 108, z: 84, r: 13 }, { x: -12, z: 108, r: 12 },
    { x: -228, z: 40, r: 11 }, { x: 192, z: 40, r: 11 }, { x: -72, z: 52, r: 10 }, { x: 84, z: 52, r: 10 },
    { x: -132, z: 124, r: 13 }, { x: 144, z: 136, r: 12 },
    // 北部远区
    { x: -116, z: 560, r: 14 }, { x: 172, z: 572, r: 13 }, { x: 0, z: 608, r: 12 },
    { x: -224, z: 632, r: 11 }, { x: 112, z: 656, r: 11 }, { x: -48, z: 680, r: 10 },
  ];
  for (let i = 0; i < anchors.length; i++) {
    const an = anchors[i];
    for (let j = 0; j < 4; j++) {
      const angle = hash2(i * 7.1 + j, an.x) * Math.PI * 2;
      const d = 0.3 + hash2(i + j * 2.3, an.z) * 0.72;
      const x = an.x + Math.cos(angle) * an.r * d;
      const z = an.z + Math.sin(angle) * an.r * d;
      if (Math.hypot(x, z) < 28) continue;
      const c = tpl.clone(true);
      c.position.set(x, 0, z);
      c.rotation.y = hash2(x, z) * Math.PI * 2;
      const sizeMul = 0.75 + hash2(x, z) * 2.6;
      const s = 0.52 + hash2(i, j) * 0.68;
      c.scale.setScalar((3.67 * s * sizeMul) / baseSize);
      const col = colors[Math.floor(hash2(x + z, i + j) * colors.length) % colors.length];
      styleCoralProp(c, col, gradientMap);
      root.add(c);
      if (propDiscs) propDiscs.push({ x, z, r: Math.max(1.5, 3.67 * s * sizeMul * 0.28) });
    }
  }
}

function scatterZone0SurfDecor(root, map, biome, gradientMap) {
  // surface decorations: seaweed / urchin / shell / anemone / rock / flowers
  // ts 再缩小1倍；数量再减半
  const PROPS = [
    { id: 'zone0Surf02', colors: [biome.accent, 0xff6b8c, 0xe85d8c, 0xff9aae], ts: 1.15, n: 7 },
    { id: 'zone0Surf03', colors: [0xfcbf49, 0xf9c74f, 0xffafcc, 0xfbf0d9], ts: 0.575 },
    { id: 'zone0Surf04', colors: [biome.accent, 0xff9aae, 0xf4a261, 0xffb88c], ts: 0.965 },
    { id: 'zone0Surf05', colors: [0xd4a373, 0xccd5ae, 0xe9c46a, 0xb5838d], ts: 0.77 },
    { id: 'zone0Surf06', colors: [0xffd6ff, 0xe7c6ff, 0xc8b6ff, 0xffcfd2], ts: 1.15, n: 7 },
  ];
  const isTut = (map.id | 0) === -1;
  const a = mapScatterArea(map, 0.57, 0.81);
  const COUNT = 4;
  for (let pi = 0; pi < PROPS.length; pi++) {
    const { id, colors, ts } = PROPS[pi];
    if (!isPropGlbReady(id)) continue;
    const tpl = clonePropGlb(id);
    if (!tpl) continue;
    const baseSize = tpl.userData.baseSize || 3;
    const n = PROPS[pi].n || COUNT;
    for (let i = 0; i < n; i++) {
      const x = a.x0 + hash2(pi * 31.7 + i * 3.71, 11.3 + pi) * (a.x1 - a.x0);
      const z = a.z0 + hash2(pi * 17.3 + i * 7.13, 23.9 + pi) * (a.z1 - a.z0);
      if (isTut ? inTutorialClearZone(x, z) : Math.hypot(x, z) < 38) continue;
      const c = tpl.clone(true);
      c.position.set(x, 0.05, z);
      c.rotation.y = hash2(x + pi, z) * Math.PI * 2;
      c.scale.setScalar((ts + hash2(i + pi, x + z) * ts * 0.6) / baseSize);
      const col = colors[Math.floor(hash2(x + z + pi, i) * colors.length) % colors.length];
      styleCoralProp(c, col, gradientMap);
      root.add(c);
    }
  }
}

function mapScatterArea(map, widthFrac, heightFrac) {
  const b = map.bounds;
  if (!b) return { x0: -265, x1: 265, z0: 25, z1: 725 };
  const cx = (b.minX + b.maxX) * 0.5;
  const cz = (b.minZ + b.maxZ) * 0.5;
  const wx = (b.maxX - b.minX) * widthFrac;
  const wz = (b.maxZ - b.minZ) * heightFrac;
  return { x0: cx - wx * 0.5, x1: cx + wx * 0.5, z0: cz - wz * 0.5, z1: cz + wz * 0.5 };
}

function scatterZone0Nc02(root, map, biome, gradientMap) {
  if (!isPropGlbReady('zone0Nc02')) return;
  const tpl = clonePropGlb('zone0Nc02');
  if (!tpl) return;
  const baseSize = tpl.userData.baseSize || 3;
  const starColors = [biome.accent, 0xff9aae, 0xf4a261, 0xffb88c, 0xff6b8c, 0xe85d8c];
  const isTut = (map.id | 0) === -1;
  const a = mapScatterArea(map, 0.57, 0.81);
  const COUNT = 60;
  for (let i = 0; i < COUNT; i++) {
    const x = a.x0 + hash2(i * 3.71, 11.3) * (a.x1 - a.x0);
    const z = a.z0 + hash2(i * 7.13, 23.9) * (a.z1 - a.z0);
    if (isTut ? inTutorialClearZone(x, z) : Math.hypot(x, z) < 38) continue;
    const c = tpl.clone(true);
    c.position.set(x, 0.05, z);
    c.rotation.y = hash2(x, z) * Math.PI * 2;
    const targetSize = 3 + hash2(i, x + z) * 5;
    c.scale.setScalar(targetSize / baseSize);
    const col = starColors[Math.floor(hash2(x + z, i) * starColors.length) % starColors.length];
    styleCoralProp(c, col, gradientMap);
    root.add(c);
  }
}

function scatterZone0Noc002(root, map, biome, gradientMap) {
  if (!isPropGlbReady('zone0Noc002')) return;
  const tpl = clonePropGlb('zone0Noc002');
  if (!tpl) return;
  // 浅红 + 浅粉配色，水面飘浮氛围装饰
  const flowerColors = [0xffb3ba, 0xff9999, 0xffc2cd, 0xff8080, 0xffd6d8, 0xffacb3];
  const isTut = (map.id | 0) === -1;
  const a = mapScatterArea(map, 0.75, 0.95);
  const COUNT = 640;
  for (let i = 0; i < COUNT; i++) {
    const x = a.x0 + hash2(i * 6.31, 41.7) * (a.x1 - a.x0);
    const z = a.z0 + hash2(i * 11.17, 53.9) * (a.z1 - a.z0);
    if (isTut ? inTutorialClearZone(x, z) : Math.hypot(x, z) < 38) continue;
    const c = tpl.clone(true);
    c.position.set(x, 0, z);
    c.rotation.y = hash2(x + 2.3, z) * Math.PI * 2;
    c.scale.setScalar(1.125 + hash2(i, x + z + 1.7) * 0.75);
    const col = flowerColors[Math.floor(hash2(x + z + 2.1, i) * flowerColors.length) % flowerColors.length];
    styleCoralProp(c, col, gradientMap);
    root.add(c);
  }
}

function scatterZone0Props(root, map, biome, gradientMap) {
  const propDiscs = [];
  scatterZone0Coral(root, map, biome, gradientMap, propDiscs);
  scatterZone0Rocks(root, map, propDiscs);
  scatterZone0ExtraCoral(root, map, biome, gradientMap, propDiscs);
  scatterZone0ExtraRocks(root, map, propDiscs);
  scatterZone0MoreCoralC(root, map, biome, gradientMap, propDiscs);
  scatterZone0MoreCoralD(root, map, biome, gradientMap, propDiscs);
  scatterZone0MoreRocks(root, map, propDiscs);
  scatterZone0NewRocks(root, map, propDiscs);
  scatterZone0CoralE(root, map, biome, gradientMap, propDiscs);
  scatterZone0CoralF(root, map, biome, gradientMap, propDiscs);
  scatterZone0CoralG(root, map, biome, gradientMap, propDiscs);
  scatterZone0CoralH(root, map, biome, gradientMap, propDiscs);
  if ((map.id | 0) === -1) scatterTutorialRimCoral(root, map, biome, gradientMap, propDiscs);
  if ((map.id | 0) === 0) scatterZone0GapCoral(root, map, biome, gradientMap, propDiscs);
  // 纯装饰 scatter 延迟到首帧后——无碰撞，晚一帧出现无感知
  const _decorZid = map.id | 0;
  setTimeout(() => {
    if (_decorZid === 0 || _decorZid === -1) scatterZone0Nc02(root, map, biome, gradientMap);
    if (_decorZid === 0 || _decorZid === -1) scatterZone0SurfDecor(root, map, biome, gradientMap);
    if (_decorZid === 0) scatterZone0Noc002(root, map, biome, gradientMap);
  }, 0);
  return propDiscs;
}

/** Zone 1 (缠绕藻林) — GLB stone models with collision + decor models without collision */
function scatterZone1GlbProps(root, map, biome, gradientMap) {
  const propDiscs = [];

  const stoneIds = ['zone1Stone1', 'zone1Stone2', 'zone1Stone3', 'zone1Stone4', 'zone1Stone5'];
  const decorIds = ['zone1Decor1', 'zone1Decor2', 'zone1Decor3', 'zone1Decor4', 'zone1Decor5'];

  const poly = map.navigable;
  const b = map.bounds;
  const bw = Math.max(1, b.maxX - b.minX);
  const bh = Math.max(1, b.maxZ - b.minZ);
  const spawnX = map.spawn?.x ?? 0;
  const spawnZ = map.spawn?.z ?? 0;
  const lhPositions = (map.lighthouses || []).map(lh => ({ x: lh.x, z: lh.z }));

  const placed = [];
  const minDist = 35;

  function tryPlacePoint(minSpawnDist, minPairDist, salt, minLhDist) {
    salt = salt || 0;
    minLhDist = minLhDist || 0;
    for (let attempt = 0; attempt < 80; attempt++) {
      const x = b.minX + hash2(attempt * 7.3 + salt * 37.2, b.minZ + salt * 0.91) * bw;
      const z = b.minZ + hash2(b.maxX + salt * 1.73, attempt * 3.1 + salt * 19.8) * bh;
      if (!pointInPoly(x, z, poly)) continue;
      if (Math.hypot(x - spawnX, z - spawnZ) < minSpawnDist) continue;
      if (minLhDist > 0) {
        let tooCloseLh = false;
        for (const lh of lhPositions) {
          if (Math.hypot(x - lh.x, z - lh.z) < minLhDist) { tooCloseLh = true; break; }
        }
        if (tooCloseLh) continue;
      }
      let ok = true;
      for (const p of placed) {
        if (Math.hypot(x - p.x, z - p.z) < minPairDist) { ok = false; break; }
      }
      if (!ok) continue;
      placed.push({ x, z });
      return { x, z };
    }
    return null;
  }

  const stoneScaleBoostMap = {
    zone1Stone1: 18,
    zone1Stone2: 30,
    zone1Stone3: 48,
    zone1Stone4: 22,
    zone1Stone5: 22,
  };

  // Entrance corridor axis: spawn → first lighthouse
  let corridorDirX = 0, corridorDirZ = 1;
  if (lhPositions.length > 0) {
    const _cdx = lhPositions[0].x - spawnX;
    const _cdz = lhPositions[0].z - spawnZ;
    const _clen = Math.hypot(_cdx, _cdz) || 1;
    corridorDirX = _cdx / _clen;
    corridorDirZ = _cdz / _clen;
  }

  const stoneCount = 96;
  for (let i = 0; i < stoneCount; i++) {
    const id = stoneIds[i % stoneIds.length];
    if (!isPropGlbReady(id)) continue;
    const pt = tryPlacePoint(150, minDist, i * 1.7, 0);
    if (!pt) continue;
    const _vx = pt.x - spawnX, _vz = pt.z - spawnZ;
    const _along = _vx * corridorDirX + _vz * corridorDirZ;
    const _perp = Math.abs(_vx * corridorDirZ - _vz * corridorDirX);
    if (_along > 0 && _along < 200 && _perp < 80) continue;
    const tpl = clonePropGlb(id);
    if (!tpl) continue;
    const baseSize = tpl.userData.baseSize || 4;
    const baseSizeXZ = tpl.userData.baseSizeXZ || baseSize;
    tpl.position.set(pt.x, 0, pt.z);
    tpl.rotation.y = hash2(pt.x, pt.z) * Math.PI * 2;
    const stoneScaleBoost = stoneScaleBoostMap[id] ?? 11;
    const sizeMul = (0.6 + hash2(pt.x * 1.7, pt.z) * 0.8) * stoneScaleBoost;
    const appliedScale = (2.5 * sizeMul) / baseSize * 0.7;
    tpl.scale.setScalar(appliedScale);
    root.add(tpl);
    propDiscs.push({ x: pt.x, z: pt.z, r: meshPropDiscR(appliedScale, baseSizeXZ, 3) });
  }

  // Decor kept modest — old 3200×clone froze zone entry for seconds.
  const decorCount = 280;
  let decorFailStreak = 0;
  for (let i = 0; i < decorCount; i++) {
    const id = decorIds[i % decorIds.length];
    if (!isPropGlbReady(id)) continue;
    const pt = tryPlacePoint(100, 22, i * 2.3, 25);
    if (!pt) {
      if (++decorFailStreak > 48) break;
      continue;
    }
    decorFailStreak = 0;
    const tpl = clonePropGlb(id);
    if (!tpl) continue;
    const baseSize = tpl.userData.baseSize || 4;
    tpl.position.set(pt.x, 0, pt.z);
    tpl.rotation.y = hash2(pt.x * 0.7, pt.z * 1.3) * Math.PI * 2;
    const decorScaleBoost = 0.5 + hash2(pt.x * 1.1, pt.z * 0.9) * 1.5;
    const sizeMul = (0.6 + hash2(pt.z * 1.4, pt.x * 0.8) * 1.4) * decorScaleBoost;
    tpl.scale.setScalar((4.8 * sizeMul) / baseSize);
    root.add(tpl);
  }

  // Spawn-side decor: forward arc only (120–160 units from spawn).
  const spawnDecorSlots = [];
  for (let si = 0; si < 220 && spawnDecorSlots.length < 48; si++) {
    const angle = hash2(si * 3.7 + 8000, spawnX + si * 0.3) * Math.PI * 2;
    const dist = 120 + hash2(spawnZ + si * 2.1, si * 5.3 + 8000) * 40;
    const sx = spawnX + Math.cos(angle) * dist;
    const sz = spawnZ + Math.sin(angle) * dist;
    if (!pointInPoly(sx, sz, poly)) continue;
    const _vx = sx - spawnX, _vz = sz - spawnZ;
    const _along = _vx * corridorDirX + _vz * corridorDirZ;
    const _perp = Math.abs(_vx * corridorDirZ - _vz * corridorDirX);
    if (_along < 30) continue;
    if (_along > 0 && _along < 200 && _perp < 80) continue;
    let tooClose = false;
    for (const p of placed) { if (Math.hypot(sx - p.x, sz - p.z) < 16) { tooClose = true; break; } }
    if (tooClose) continue;
    placed.push({ x: sx, z: sz });
    spawnDecorSlots.push({ x: sx, z: sz });
  }
  for (let i = 0; i < spawnDecorSlots.length; i++) {
    const pt = spawnDecorSlots[i];
    const id = decorIds[i % decorIds.length];
    if (!isPropGlbReady(id)) continue;
    const tpl = clonePropGlb(id);
    if (!tpl) continue;
    const baseSize = tpl.userData.baseSize || 4;
    tpl.position.set(pt.x, 0, pt.z);
    tpl.rotation.y = hash2(pt.x * 0.7, pt.z * 1.3) * Math.PI * 2;
    const decorScaleBoost = 0.5 + hash2(pt.x * 1.1, pt.z * 0.9) * 1.5;
    const sizeMul = (0.6 + hash2(pt.z * 1.4, pt.x * 0.8) * 1.4) * decorScaleBoost;
    tpl.scale.setScalar((4.8 * sizeMul) / baseSize);
    root.add(tpl);
  }

  return propDiscs;
}

function scatterZone2GlbProps(root, map, biome, gradientMap) {
  const propDiscs = [];

  // s1-s6 = collision props (rocks/stones), c1-c4 = no collision (bushes/ground/mushroom)
  const stoneIds = ['zone2S1', 'zone2S2', 'zone2S3', 'zone2S4', 'zone2S5', 'zone2S6'];
  const decorIds = ['zone2C1', 'zone2C2', 'zone2C3', 'zone2C4'];

  const poly = map.navigable;
  const b = map.bounds;
  const bw = Math.max(1, b.maxX - b.minX);
  const bh = Math.max(1, b.maxZ - b.minZ);
  const spawnX = map.spawn?.x ?? 0;
  const spawnZ = map.spawn?.z ?? 0;
  const lhPositions = (map.lighthouses || []).map(lh => ({ x: lh.x, z: lh.z }));

  const placed = [];
  const minDist = 22;

  function tryPlacePoint(minSpawnDist, minPairDist, salt, minLhDist) {
    salt = salt || 0;
    minLhDist = minLhDist || 0;
    for (let attempt = 0; attempt < 180; attempt++) {
      const x = b.minX + hash2(attempt * 7.3 + salt * 37.2, b.minZ + salt * 0.91) * bw;
      const z = b.minZ + hash2(b.maxX + salt * 1.73, attempt * 3.1 + salt * 19.8) * bh;
      if (!pointInPoly(x, z, poly)) continue;
      if (Math.hypot(x - spawnX, z - spawnZ) < minSpawnDist) continue;
      if (minLhDist > 0) {
        let tooCloseLh = false;
        for (const lh of lhPositions) {
          if (Math.hypot(x - lh.x, z - lh.z) < minLhDist) { tooCloseLh = true; break; }
        }
        if (tooCloseLh) continue;
      }
      let ok = true;
      for (const p of placed) {
        if (Math.hypot(x - p.x, z - p.z) < minPairDist) { ok = false; break; }
      }
      if (!ok) continue;
      placed.push({ x, z });
      return { x, z };
    }
    return null;
  }

  // Visible-size targets (mild 0.9 vs full; load-opt 0.7 was too small)
  const stoneScaleMap = {
    zone2S1: 18,
    zone2S2: 14,
    zone2S3: 22,
    zone2S4: 12,
    zone2S5: 26,
    zone2S6: 18,
  };

  const stoneCount = 120;
  for (let i = 0; i < stoneCount; i++) {
    const id = stoneIds[i % stoneIds.length];
    if (!isPropGlbReady(id)) continue;
    const pt = tryPlacePoint(30, minDist, i * 1.7, 0);
    if (!pt) continue;
    const tpl = clonePropGlb(id);
    if (!tpl) continue;
    const baseSize = tpl.userData.baseSize || 4;
    tpl.position.set(pt.x, 0, pt.z);
    tpl.rotation.y = hash2(pt.x, pt.z) * Math.PI * 2;
    const stoneScaleBoost = stoneScaleMap[id] ?? 36;
    const sizeMul = (0.6 + hash2(pt.x * 1.7, pt.z) * 0.8) * stoneScaleBoost;
    const appliedScale = (2.5 * sizeMul) / baseSize * 0.9;
    tpl.scale.setScalar(appliedScale);
    root.add(tpl);
    const baseSizeXZ = tpl.userData.baseSizeXZ || baseSize;
    propDiscs.push({ x: pt.x, z: pt.z, r: meshPropDiscR(appliedScale, baseSizeXZ, 3) });
  }

  // Decor: 1–3× varied sizes, brownish-yellow tones dominate via fallbackColor in propGlb config
  const decorCount = 200;
  for (let i = 0; i < decorCount; i++) {
    const id = decorIds[i % decorIds.length];
    if (!isPropGlbReady(id)) continue;
    const pt = tryPlacePoint(12, 14, i * 2.3, 18);
    if (!pt) continue;
    const tpl = clonePropGlb(id);
    if (!tpl) continue;
    const baseSize = tpl.userData.baseSize || 4;
    tpl.position.set(pt.x, 0, pt.z);
    tpl.rotation.y = hash2(pt.x * 0.7, pt.z * 1.3) * Math.PI * 2;
    // sizeVariant: 1.0 – 3.0 per piece so no two look the same
    const sizeVariant = 1.0 + hash2(pt.x * 3.1, pt.z * 2.3) * 2.0;
    const sizeMul = (0.6 + hash2(pt.z * 1.4, pt.x * 0.8) * 1.4) * sizeVariant;
    tpl.scale.setScalar((8.0 * sizeMul) / baseSize * 0.9);
    root.add(tpl);
  }

  return propDiscs;
}

function scatterZone3GlbProps(root, map, biome, gradientMap) {
  const propDiscs = [];

  // s11-s17 = collision rocks, c11-c13 = no-collision aquatic decor
  const stoneIds = ['zone3S11', 'zone3S12', 'zone3S13', 'zone3S14', 'zone3S15', 'zone3S16', 'zone3S17'];
  const decorIds = ['zone3C11', 'zone3C12', 'zone3C13'];

  const poly = map.navigable;
  const b = map.bounds;
  const bw = Math.max(1, b.maxX - b.minX);
  const bh = Math.max(1, b.maxZ - b.minZ);
  const spawnX = map.spawn?.x ?? 0;
  const spawnZ = map.spawn?.z ?? 0;
  const lhPositions = (map.lighthouses || []).map(lh => ({ x: lh.x, z: lh.z }));

  const placed = [];
  const minDist = 22;

  function tryPlacePoint(minSpawnDist, minPairDist, salt, minLhDist) {
    salt = salt || 0;
    minLhDist = minLhDist || 0;
    for (let attempt = 0; attempt < 180; attempt++) {
      const x = b.minX + hash2(attempt * 7.3 + salt * 37.2, b.minZ + salt * 0.91) * bw;
      const z = b.minZ + hash2(b.maxX + salt * 1.73, attempt * 3.1 + salt * 19.8) * bh;
      if (!pointInPoly(x, z, poly)) continue;
      if (Math.hypot(x - spawnX, z - spawnZ) < minSpawnDist) continue;
      if (minLhDist > 0) {
        let tooCloseLh = false;
        for (const lh of lhPositions) {
          if (Math.hypot(x - lh.x, z - lh.z) < minLhDist) { tooCloseLh = true; break; }
        }
        if (tooCloseLh) continue;
      }
      let ok = true;
      for (const p of placed) {
        if (Math.hypot(x - p.x, z - p.z) < minPairDist) { ok = false; break; }
      }
      if (!ok) continue;
      placed.push({ x, z });
      return { x, z };
    }
    return null;
  }

  const stoneScaleMap = {
    zone3S11: 16,
    zone3S12: 13,
    zone3S13: 19,
    zone3S14: 8,
    zone3S15: 23,
    zone3S16: 16,
    zone3S17: 21,
  };

  const stoneCount = 120;
  for (let i = 0; i < stoneCount; i++) {
    const id = stoneIds[i % stoneIds.length];
    if (!isPropGlbReady(id)) continue;
    const pt = tryPlacePoint(30, minDist, i * 1.7, 0);
    if (!pt) continue;
    const tpl = clonePropGlb(id);
    if (!tpl) continue;
    const baseSize = tpl.userData.baseSize || 4;
    tpl.position.set(pt.x, 0, pt.z);
    tpl.rotation.y = hash2(pt.x, pt.z) * Math.PI * 2;
    const stoneScaleBoost = stoneScaleMap[id] ?? 36;
    const sizeMul = (0.6 + hash2(pt.x * 1.7, pt.z) * 0.8) * stoneScaleBoost;
    const appliedScale = (2.5 * sizeMul) / baseSize * 0.9;
    tpl.scale.setScalar(appliedScale);
    root.add(tpl);
    const baseSizeXZ = tpl.userData.baseSizeXZ || baseSize;
    propDiscs.push({ x: pt.x, z: pt.z, r: meshPropDiscR(appliedScale, baseSizeXZ, 3) });
  }

  const decorCount = 200;
  for (let i = 0; i < decorCount; i++) {
    const id = decorIds[i % decorIds.length];
    if (!isPropGlbReady(id)) continue;
    const pt = tryPlacePoint(12, 14, i * 2.3 + 500, 18);
    if (!pt) continue;
    const tpl = clonePropGlb(id);
    if (!tpl) continue;
    const baseSize = tpl.userData.baseSize || 4;
    tpl.position.set(pt.x, 0, pt.z);
    tpl.rotation.y = hash2(pt.x * 0.7, pt.z * 1.3) * Math.PI * 2;
    const sizeVariant = 1.0 + hash2(pt.x * 3.1, pt.z * 2.3) * 2.0;
    const sizeMul = (0.6 + hash2(pt.z * 1.4, pt.x * 0.8) * 1.4) * sizeVariant;
    tpl.scale.setScalar((5.33 * sizeMul) / baseSize * 0.9);
    root.add(tpl);
  }

  return propDiscs;
}

function scatterZone4GlbProps(root, map, biome, gradientMap) {
  const propDiscs = [];

  // s22-s26 = collision rocks, c21-c24 = no-collision aquatic decor
  const stoneIds = ['zone4S22', 'zone4S23', 'zone4S24', 'zone4S25', 'zone4S26'];
  const decorIds = ['zone4C21', 'zone4C22', 'zone4C23', 'zone4C24'];

  const poly = map.navigable;
  const b = map.bounds;
  const bw = Math.max(1, b.maxX - b.minX);
  const bh = Math.max(1, b.maxZ - b.minZ);
  const spawnX = map.spawn?.x ?? 0;
  const spawnZ = map.spawn?.z ?? 0;
  const lhPositions = (map.lighthouses || []).map(lh => ({ x: lh.x, z: lh.z }));

  const placed = [];
  const minDist = 22;

  function tryPlacePoint(minSpawnDist, minPairDist, salt, minLhDist) {
    salt = salt || 0;
    minLhDist = minLhDist || 0;
    for (let attempt = 0; attempt < 180; attempt++) {
      const x = b.minX + hash2(attempt * 7.3 + salt * 37.2, b.minZ + salt * 0.91) * bw;
      const z = b.minZ + hash2(b.maxX + salt * 1.73, attempt * 3.1 + salt * 19.8) * bh;
      if (!pointInPoly(x, z, poly)) continue;
      if (Math.hypot(x - spawnX, z - spawnZ) < minSpawnDist) continue;
      if (minLhDist > 0) {
        let tooCloseLh = false;
        for (const lh of lhPositions) {
          if (Math.hypot(x - lh.x, z - lh.z) < minLhDist) { tooCloseLh = true; break; }
        }
        if (tooCloseLh) continue;
      }
      let ok = true;
      for (const p of placed) {
        if (Math.hypot(x - p.x, z - p.z) < minPairDist) { ok = false; break; }
      }
      if (!ok) continue;
      placed.push({ x, z });
      return { x, z };
    }
    return null;
  }

  const stoneScaleMap = {
    zone4S22: 36,
    zone4S23: 36,
    zone4S24: 20,
    zone4S25: 44,
    zone4S26: 52,
  };

  const stoneCount = 96;
  for (let i = 0; i < stoneCount; i++) {
    const id = stoneIds[i % stoneIds.length];
    if (!isPropGlbReady(id)) continue;
    const tpl = clonePropGlb(id);
    if (!tpl) continue;
    const baseSize = tpl.userData.baseSize || 4;
    const pt = tryPlacePoint(30, minDist, i * 1.7, 0);
    if (!pt) continue;
    tpl.position.set(pt.x, 0, pt.z);
    tpl.rotation.y = hash2(pt.x, pt.z) * Math.PI * 2;
    const stoneScaleBoost = stoneScaleMap[id] ?? 36;
    const sizeMul = (0.6 + hash2(pt.x * 1.7, pt.z) * 0.8) * stoneScaleBoost;
    const appliedScale = (2.5 * sizeMul) / baseSize * 0.7;
    tpl.scale.setScalar(appliedScale);
    root.add(tpl);
    const baseSizeXZ = tpl.userData.baseSizeXZ || baseSize;
    propDiscs.push({ x: pt.x, z: pt.z, r: meshPropDiscR(appliedScale, baseSizeXZ, 3) });
  }

  const decorCount = 200;
  for (let i = 0; i < decorCount; i++) {
    const id = decorIds[i % decorIds.length];
    if (!isPropGlbReady(id)) continue;
    const tpl = clonePropGlb(id);
    if (!tpl) continue;
    const baseSize = tpl.userData.baseSize || 4;
    const pt = tryPlacePoint(12, 14, i * 2.3 + 500, 18);
    if (!pt) continue;
    tpl.position.set(pt.x, 0, pt.z);
    tpl.rotation.y = hash2(pt.x * 0.7, pt.z * 1.3) * Math.PI * 2;
    const sizeVariant = 1.0 + hash2(pt.x * 3.1, pt.z * 2.3) * 2.0;
    const sizeMul = (0.6 + hash2(pt.z * 1.4, pt.x * 0.8) * 1.4) * sizeVariant;
    tpl.scale.setScalar((8.0 * sizeMul) / baseSize);
    root.add(tpl);
  }

  return propDiscs;
}

function makeIslandMesh(isl, biome, gm) {
  const r = isl.r;
  const shape = isl.shape || 'round';
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const g0 = new THREE.Color(biome.ground?.[0] ?? biome.beach ?? 0xf8e6c2);
  const g1 = new THREE.Color(biome.ground?.[1] ?? g0);
  const g2 = new THREE.Color(biome.ground?.[2] ?? g1);
  const seed = hash2(isl.x, isl.z);
  let stretchX = 1;
  let stretchZ = 1;
  if (shape === 'oblong') {
    stretchX = 1.28;
    stretchZ = 0.72;
  }
  const yaw = seed * Math.PI * 2;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const nrm = Math.hypot(x, y, z) || 1;
    x /= nrm;
    y /= nrm;
    z /= nrm;
    const noise = 0.1 * Math.sin((x + seed) * 7.1) * Math.cos((z - seed) * 5.3);
    let px = x * (1 + noise) * stretchX;
    let pz = z * (1 + noise) * stretchZ;
    let py = Math.max(-0.12, y * 0.4 + 0.14);
    if (shape === 'kidney') {
      const bite = Math.max(0, px - 0.32);
      px -= bite * 0.58;
    }
    const d = Math.hypot(px, pz) || 1;
    if (d > 0.98) {
      px = (px / d) * 0.98;
      pz = (pz / d) * 0.98;
    }
    const wx = (px * c - pz * s) * r;
    const wz = (px * s + pz * c) * r;
    const wy = py * r * 0.52 + 0.2;
    pos.setXYZ(i, wx, wy, wz);
    const t = Math.max(0, Math.min(1, wy / (r * 0.45)));
    const col = g0.clone().lerp(g1, t).lerp(g2, t * t * 0.4);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = toonMat(0xffffff, gm, { vertexColors: true, flatShading: true });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(isl.x, 0, isl.z);
  addOutline(m, 1.03);
  return m;
}

function makeShoal(s, sandHex, gm) {
  const m = M(new THREE.CylinderGeometry(1, 1.1, 0.32, 8), sandHex, gm, 1.02);
  m.scale.set(s.rx, 1, s.rz);
  m.position.set(s.x, -0.04, s.z);
  m.rotation.y = s.yaw || 0;
  return m;
}

/**
 * @returns {{
 *  root: THREE.Group,
 *  load: (zoneId:number, scene:THREE.Scene, gm:any, water:THREE.Mesh)=>any,
 *  reset: ()=>void,
 *  constrainBoat: (paddleState:any)=>boolean,
 *  getMap: ()=>any,
 *  getLighthouses: ()=>THREE.Object3D[],
 * }}
 */
export function createSeaWorld() {
  const root = new THREE.Group();
  root.name = 'seaWorld';
  let current = null;
  let tutVortices = null;
  let tutFlotsam = null;
  /** @type {THREE.Object3D[]} */
  let lighthouses = [];
  /** @type {THREE.Group|null} */
  let decorRoot = null;

  /** @type {{ zoneId: number, scene: THREE.Scene, gradientMap: any, water: THREE.Mesh }|null} */
  let lastLoadArgs = null;

  function reset() {
    while (root.children.length) {
      const c = root.children[0];
      root.remove(c);
    }
    lighthouses = [];
    decorRoot = null;
    current = null;
  }

  function load(zoneId, scene, gradientMap, water) {
    reset();
    lastLoadArgs = { zoneId, scene, gradientMap, water };
    ensureZonePropGlbsLoading(zoneId);
    if (!root.parent) scene.add(root);
    const map = getSeaMap(zoneId);
    const biome = getSeaBiome(zoneId);
    current = map;

    scene.background.setHex(biome.sky);
    scene.fog.color.setHex(biome.fog);
    scene.fog.near = biome.fogNear;
    scene.fog.far = biome.fogFar;
    setWaterColor(water, biome.water);

    const isZone0 = (zoneId | 0) === 0 || (zoneId | 0) === -1; // tutorial bay uses zone0 rock+coral style
    const isZone1 = (zoneId | 0) === 1; // 缠绕藻林 uses GLB stone + decor models

    const isZone2 = (zoneId | 0) === 2;
    const isZone3 = (zoneId | 0) === 3;
    const isZone4 = (zoneId | 0) === 4;

    if (!isZone2 && !isZone3 && !isZone4) {
      root.add(beachRing(map.navigable, gradientMap, biome.beach));
    }

    // Zones -1..4: only GLB prop stones (no procedural Dodecahedron / island mounds).
    if (isZone2) {
      map._propDiscs = scatterZone2GlbProps(root, map, biome, gradientMap) || [];
    } else if (isZone3) {
      map._propDiscs = scatterZone3GlbProps(root, map, biome, gradientMap) || [];
    } else if (isZone4) {
      map._propDiscs = scatterZone4GlbProps(root, map, biome, gradientMap) || [];
    } else if (isZone1) {
      map._propDiscs = scatterZone1GlbProps(root, map, biome, gradientMap) || [];
    } else if (isZone0) {
      map._propDiscs = scatterZone0Props(root, map, biome, gradientMap) || [];
    } else {
      // Legacy / unknown zones only: beaches, shoals, code islands + reef rocks.
      for (const shoal of map.shoals || []) {
        root.add(makeShoal(shoal, biome.beach, gradientMap));
      }
      for (const isl of map.islands) {
        root.add(makeIslandMesh(isl, biome, gradientMap));
        if (biome.islandSkin === 'lava') {
          const seam = M(new THREE.BoxGeometry(isl.r * 0.7, 0.28, 0.28), biome.accent, gradientMap, 1.08);
          seam.position.set(isl.x, 1.1, isl.z);
          seam.rotation.y = isl.x * 0.02;
          root.add(seam);
        }
      }
      for (const r of map.reefs) {
        const skin = biome.reefSkin;
        for (let i = 0; i < 3; i++) {
          const col = reefColor(biome, i);
          let rock;
          if (skin === 'spire') {
            rock = M(new THREE.ConeGeometry(r.r * (0.22 + i * 0.12), r.r * (0.85 + i * 0.35), 5), col, gradientMap, 1.05);
          } else if (skin === 'vent') {
            rock = M(new THREE.DodecahedronGeometry(r.r * (0.32 + i * 0.14), 0), col, gradientMap, 1.05);
          } else {
            rock = M(new THREE.DodecahedronGeometry(r.r * (0.35 + i * 0.15), 0), col, gradientMap, 1.05);
          }
          rock.position.set(
            r.x + (Math.random() - 0.5) * r.r,
            0.2 + Math.random() * 0.4,
            r.z + (Math.random() - 0.5) * r.r
          );
          rock.rotation.set(Math.random(), Math.random(), Math.random());
          root.add(rock);
        }
      }
    }

    lighthouses = [];
    for (const lh of map.lighthouses) {
      const mesh = (map.id === -1)
        ? makeTutorialLighthouse(gradientMap)
        : makeLighthouse(gradientMap, biome);
      mesh.position.set(lh.x, 0, lh.z);
      mesh.userData.checkpoint = lh.id;
      mesh.userData.lhId = lh.id;
      mesh.userData.claimed = false;
      mesh.userData.isLighthouse = true;
      mesh.userData.evacDwell = 0;
      root.add(mesh);
      lighthouses.push(mesh);
    }

    decorRoot = (isZone0 || isZone1 || isZone2 || isZone3 || isZone4) ? null : scatterBiomeDecor(root, map, biome, gradientMap);

    const propIds = propIdsForZone(zoneId);
    if (propIds && areZonePropsReady(zoneId)) {
      propsReloadKey = `${zoneId | 0}:${propIds.join(',')}`;
    } else {
      propsReloadKey = '';
    }

    return map;
  }

  ensureAllPropGlbsLoading();
  let propsReloadTimer = 0;
  let propsReloadKey = '';
  onPropGlbReady((readyId) => {
    if (!lastLoadArgs) return;
    const zid = lastLoadArgs.zoneId | 0;
    const needed = propIdsForZone(zid);
    // Ignore assets that do not belong to the active zone (prevents ~60 full reloads).
    if (needed && readyId && !needed.includes(readyId)) return;
    if (needed && !areZonePropsReady(zid)) return;
    const key = needed ? `${zid}:${needed.join(',')}` : `${zid}:*`;
    if (key === propsReloadKey) return;
    if (propsReloadTimer) clearTimeout(propsReloadTimer);
    propsReloadTimer = setTimeout(() => {
      propsReloadTimer = 0;
      if (!lastLoadArgs) return;
      const z = lastLoadArgs.zoneId | 0;
      const ids = propIdsForZone(z);
      if (ids && !areZonePropsReady(z)) return;
      const nextKey = ids ? `${z}:${ids.join(',')}` : `${z}:*`;
      if (nextKey === propsReloadKey) return;
      propsReloadKey = nextKey;
      ensureZonePropGlbsLoading(z);
      load(lastLoadArgs.zoneId, lastLoadArgs.scene, lastLoadArgs.gradientMap, lastLoadArgs.water);
    }, 40);
  });

  function constrainBoat(paddleState) {
    if (!current) return false;
    const r = constrainToPoly(paddleState.x, paddleState.z, current.navigable);
    let x = r.x, z = r.z;
    let hit = r.hit;

    // Boat is a point; pads approximate hull extent once discs match mesh AABB.
    const ISLAND_PAD = 1.5;
    const PROP_PAD = 1.6;
    // GLB zones assign _propDiscs (even empty before assets load); map.reefs /
    // islands are placement anchors only — colliding them creates invisible air walls.
    const skipAnchorDiscs = Array.isArray(current._propDiscs);

    // 8-pass push-out for stable multi-stone constraint resolution.
    // Pass 0 also projects out the inward velocity component so the boat slides along
    // the stone surface instead of re-entering on the next frame ("stuck in stone" fix).
    // d<0.01 fallback: eject in current heading (or +x) and zero speed.
    for (let pass = 0; pass < 8; pass++) {
      if (!skipAnchorDiscs && (current.id | 0) !== -1) {
        for (const isl of current.islands || []) {
          const dx = x - isl.x, dz = z - isl.z;
          const d = Math.hypot(dx, dz);
          const target = islandCollideR(isl) + ISLAND_PAD;
          if (d < target) {
            if (d < 0.01) { x = isl.x + target; hit = true; continue; }
            const s = target / d;
            x = isl.x + dx * s; z = isl.z + dz * s;
            hit = true;
          }
        }
      }
      if (!skipAnchorDiscs) {
        for (const reef of current.reefs) {
          const dx = x - reef.x, dz = z - reef.z;
          const d = Math.hypot(dx, dz);
          const target = reef.r + 1.6;
          if (d < target) {
            if (d < 0.01) { x = reef.x + target; hit = true; continue; }
            const s = target / d;
            x = reef.x + dx * s; z = reef.z + dz * s;
            hit = true;
          }
        }
      }
      for (const disc of (current._propDiscs || [])) {
        const dx = x - disc.x, dz = z - disc.z;
        const d = Math.hypot(dx, dz);
        const target = disc.r + PROP_PAD;
        if (d < target) {
          hit = true;
          if (d < 0.01) {
            const ex = paddleState.speed > 0.1 ? Math.sin(paddleState.yaw) : 1;
            const ez = paddleState.speed > 0.1 ? Math.cos(paddleState.yaw) : 0;
            x = disc.x + ex * target; z = disc.z + ez * target;
            paddleState.speed = 0;
            continue;
          }
          const s = target / d;
          x = disc.x + dx * s; z = disc.z + dz * s;
          if (pass === 0) {
            // Remove velocity component pointing into the disc so boat doesn't push back in.
            const nx = dx / d, nz = dz / d;
            const vx = Math.sin(paddleState.yaw) * paddleState.speed;
            const vz = Math.cos(paddleState.yaw) * paddleState.speed;
            const vDotN = vx * nx + vz * nz;
            if (vDotN < 0) {
              const newVx = vx - vDotN * nx;
              const newVz = vz - vDotN * nz;
              paddleState.speed = Math.hypot(newVx, newVz);
              if (paddleState.speed <= 0.1) paddleState.speed = 0;
            }
          }
        }
      }
    }

    paddleState.x = x;
    paddleState.z = z;
    return hit;
  }

  /** Place vortices / flotsam across navigable water */
  function scatterProps(vortexList, flotsamList) {
    if (!current) return;
    const poly = current.navigable;
    const b = current.bounds;
    const bw = Math.max(1, b.maxX - b.minX);
    const bh = Math.max(1, b.maxZ - b.minZ);
    const tutorial = current.feature === 'tutorial' || current.id === -1;

    const placeRandom = (obj, i, salt, minSpawn = 14) => {
      for (let attempt = 0; attempt < 40; attempt++) {
        const x = b.minX + Math.random() * bw;
        const z = b.minZ + Math.random() * bh;
        if (!pointInPoly(x, z, poly)) continue;
        let ok = true;
        if ((current.id | 0) !== 0) {
          for (const isl of current.islands) {
            if (Math.hypot(x - isl.x, z - isl.z) < isl.r + 3) { ok = false; break; }
          }
        }
        if (!ok) continue;
        if (Math.hypot(x - current.spawn.x, z - current.spawn.z) < minSpawn) continue;
        obj.position.set(x, 0, z);
        obj.visible = true;
        if (obj.userData) obj.userData.collected = false;
        return true;
      }
      obj.position.set(
        current.spawn.x + ((i + salt) % 7 - 3) * 10,
        0,
        current.spawn.z + 35 + (i % 5) * 12
      );
      obj.visible = true;
      return false;
    };

    if (tutorial) {
      const beats = TUTORIAL_BEATS;
      vortexList?.forEach((v, i) => {
        if (i === 0) {
          v.position.set(beats.fish.x, 0, beats.fish.z);
          v.visible = false;
        } else {
          v.visible = false;
        }
      });
      const barrel = flotsamList?.find((f) => f.userData?.type === 'barrel')
        || flotsamList?.[0];
      flotsamList?.forEach((f) => { f.visible = false; });
      if (barrel) {
        barrel.position.set(beats.salvage.x, 0, beats.salvage.z);
        barrel.visible = false;
        if (barrel.userData) barrel.userData.collected = false;
      }
      tutVortices = vortexList || null;
      tutFlotsam = barrel ? [barrel] : null;
      return;
    }
    tutVortices = null;
    tutFlotsam = null;

    // Grid + jitter so schools cover the whole sea
    if (vortexList?.length) {
      const n = vortexList.length;
      const cols = Math.ceil(Math.sqrt(n * (bw / bh)));
      const rows = Math.ceil(n / cols);
      let idx = 0;
      for (let r = 0; r < rows && idx < n; r++) {
        for (let c = 0; c < cols && idx < n; c++) {
          const v = vortexList[idx++];
          let placed = false;
          for (let attempt = 0; attempt < 24; attempt++) {
            const jx = (Math.random() - 0.5) * 0.7;
            const jz = (Math.random() - 0.5) * 0.7;
            const x = b.minX + ((c + 0.5 + jx) / cols) * bw;
            const z = b.minZ + ((r + 0.5 + jz) / rows) * bh;
            if (!pointInPoly(x, z, poly)) continue;
            let ok = true;
            for (const isl of current.islands) {
              if (Math.hypot(x - isl.x, z - isl.z) < isl.r + 4) { ok = false; break; }
            }
            if (!ok) continue;
            if (Math.hypot(x - current.spawn.x, z - current.spawn.z) < 12) continue;
            v.position.set(x, 0, z);
            v.visible = true;
            placed = true;
            break;
          }
          if (!placed) placeRandom(v, idx, 3.1, 12);
        }
      }
    }
    flotsamList?.forEach((f, i) => placeRandom(f, i, 7.7, 16));
  }

  function updateBeacons(time) {
    for (const lh of lighthouses) {
      const b = lh.userData.beacon;
      if (!b) continue;
      const pulse = 0.65 + Math.sin(time * 2.4 + lh.position.x * 0.01) * 0.35;
      if (b.halo?.material) b.halo.material.opacity = 0.22 + pulse * 0.28;
      if (b.beam?.material) b.beam.material.opacity = 0.12 + pulse * 0.18;
      if (b.point) b.point.intensity = 3.2 + pulse * 2.8;
      if (b.core) {
        const s = 0.92 + pulse * 0.18;
        b.core.scale.setScalar(s);
      }
    }
  }

  function setEvacRingActive(lh, active) {
    const mat = lh?.userData?.evacRingMat;
    if (!mat) return;
    mat.opacity = active ? 0.55 : 0.28;
    mat.color.setHex(active ? 0xffe066 : 0x7dffc0);
  }

  function setTutorialReveal(step, dismissed = false) {
    const s = step | 0;
    tutVortices?.forEach((v, i) => {
      if (i === 0) v.visible = s >= 1;
      else v.visible = false;
    });
    tutFlotsam?.forEach((f) => {
      if (f.userData?.collected) {
        f.visible = false;
        return;
      }
      f.visible = s >= 2;
    });
    for (const lh of lighthouses) {
      if (!lh.userData.isTutorialLh) continue;
      const show = dismissed && s >= 5;
      lh.visible = show;
      if (lh.userData.evacRing) lh.userData.evacRing.visible = show;
    }
  }

  return {
    root,
    load,
    reset,
    constrainBoat,
    scatterProps,
    setTutorialReveal,
    updateBeacons,
    setEvacRingActive,
    updateDecor: (time) => updateBiomeDecor(decorRoot, time),
    getMap: () => current,
    getLighthouses: () => lighthouses,
  };
}

/** Tint cartoon water vertex colors toward a hex water color */
export function setWaterColor(water, hex) {
  if (!water?.userData) return;
  const c = new THREE.Color(hex);
  water.userData.seaTint = { r: c.r, g: c.g, b: c.b };
}

export function updateWaterFollow(water, time, boatPos) {
  if (!water) return;
  // Keep water plane centered under the boat so we never sail off the mesh
  if (boatPos) {
    water.position.x = boatPos.x;
    water.position.z = boatPos.z;
  }
  const pos = water.geometry.attributes.position;
  const col = water.geometry.attributes.color;
  const base = water.userData.basePositions;
  const tint = water.userData.seaTint || { r: 0.18, g: 0.88, b: 0.80 };
  const ox = boatPos ? boatPos.x : 0;
  const oz = boatPos ? boatPos.z : 0;

  for (let i = 0; i < pos.count; i++) {
    const x = base[i * 3];
    const z = base[i * 3 + 2];
    const wx = x + ox * 0.02;
    const wz = z + oz * 0.02;
    let y =
      Math.sin(wx * 0.08 + time * 1.2) * 0.35 +
      Math.cos(wz * 0.07 + time * 0.9) * 0.28 +
      Math.sin((wx + wz) * 0.045 + time * 0.7) * 0.45;
    y = Math.round(y * 2.2) / 2.2;
    pos.setY(i, y);

    const crest = Math.max(0, y) * 0.15;
    col.setXYZ(
      i,
      Math.min(1, tint.r * 0.85 + crest + 0.05),
      Math.min(1, tint.g * 0.9 + crest),
      Math.min(1, tint.b * 0.9 + crest * 0.5)
    );
  }
  pos.needsUpdate = true;
  col.needsUpdate = true;
}
