/** Load / clear irregular sea geometry; boat constraint; water tint */

import * as THREE from 'three';
import { addOutline, toonMat } from './stylekit.js';
import { getSeaMap, constrainToPoly, pointInPoly } from './seaMaps.js';

function M(geo, color, gradientMap, outline = 1.05) {
  const m = new THREE.Mesh(geo, toonMat(color, gradientMap));
  if (outline) addOutline(m, outline);
  return m;
}

function makeLighthouse(gm) {
  const g = new THREE.Group();
  // Built at ~3× original dimensions so the tower reads from far away
  const S = 3;
  const base = M(new THREE.CylinderGeometry(1.4 * S, 1.6 * S, 0.8 * S, 6), 0x4a5568, gm, 1.04);
  base.position.y = 0.4 * S;
  g.add(base);
  const stripes = [
    [0xf5f0e6, 1.0], [0xe85d4c, 0.92], [0xf5f0e6, 0.85],
    [0xe85d4c, 0.78], [0xf5f0e6, 0.72],
  ];
  let y = 0.8 * S;
  for (const [col, r] of stripes) {
    const ring = M(new THREE.CylinderGeometry(r * 0.92 * S, r * S, 1.5 * S, 8), col, gm, 1.04);
    ring.position.y = y + 0.75 * S;
    g.add(ring);
    y += 1.45 * S;
  }
  const cap = M(new THREE.ConeGeometry(0.95 * S, 1.0 * S, 8), 0xe85d4c, gm, 1.06);
  cap.position.y = y + 0.6 * S;
  g.add(cap);

  // Bright beacon orb (always-on, unlit) — guides player from long range
  const beaconY = y + 0.35 * S;
  const lightCore = new THREE.Mesh(
    new THREE.SphereGeometry(1.35 * S, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff4a8 })
  );
  lightCore.position.y = beaconY;
  lightCore.userData.skipOutline = true;
  g.add(lightCore);

  const lightHalo = new THREE.Mesh(
    new THREE.SphereGeometry(2.2 * S, 10, 8),
    new THREE.MeshBasicMaterial({
      color: 0xffe066,
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
      color: 0xfff0a0,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  beam.position.y = beaconY + 27 * S;
  beam.userData.skipOutline = true;
  g.add(beam);

  const point = new THREE.PointLight(0xffe8a0, 4.5, 900, 1.4);
  point.position.y = beaconY;
  g.add(point);

  g.userData.beacon = { core: lightCore, halo: lightHalo, beam, point };
  g.userData.beaconY = beaconY;
  return g;
}

function beachRing(poly, gradientMap) {
  const g = new THREE.Group();
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const mx = (a.x + b.x) / 2;
    const mz = (a.z + b.z) / 2;
    const sand = M(new THREE.CylinderGeometry(16, 20, 0.8, 6), 0xe8d5a3, gradientMap, 1.02);
    sand.position.set(mx, -0.15, mz);
    g.add(sand);
    // Outer shelf between vertices for continuous shoreline
    const sand2 = M(new THREE.CylinderGeometry(12, 14, 0.6, 6), 0xe8d5a3, gradientMap, 1.02);
    sand2.position.set(a.x, -0.2, a.z);
    g.add(sand2);
  }
  return g;
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
  /** @type {THREE.Object3D[]} */
  let lighthouses = [];

  function reset() {
    while (root.children.length) {
      const c = root.children[0];
      root.remove(c);
    }
    lighthouses = [];
    current = null;
  }

  function load(zoneId, scene, gradientMap, water) {
    reset();
    if (!root.parent) scene.add(root);
    const map = getSeaMap(zoneId);
    current = map;

    // Apply palette
    scene.background.set(map.sky);
    scene.fog.color.set(map.fog);
    // Large seas: keep distant beacons readable
    scene.fog.near = map.feature === 'fog' ? 120 : 220;
    scene.fog.far = map.feature === 'fog' ? 520 : 980;
    setWaterColor(water, map.water);

    root.add(beachRing(map.navigable, gradientMap));

    for (const isl of map.islands) {
      const sand = M(new THREE.CylinderGeometry(isl.r, isl.r * 1.15, 0.8, 7), 0xf0e0c0, gradientMap, 1.03);
      sand.position.set(isl.x, 0.2, isl.z);
      root.add(sand);
      const grass = M(new THREE.CylinderGeometry(isl.r * 0.7, isl.r * 0.85, 0.5, 6), 0x5cb85c, gradientMap, 1.04);
      grass.position.set(isl.x, 0.7, isl.z);
      root.add(grass);
    }

    for (const r of map.reefs) {
      for (let i = 0; i < 3; i++) {
        const rock = M(new THREE.DodecahedronGeometry(r.r * (0.35 + i * 0.15), 0), 0x6b7a88, gradientMap, 1.05);
        rock.position.set(
          r.x + (Math.random() - 0.5) * r.r,
          0.2 + Math.random() * 0.4,
          r.z + (Math.random() - 0.5) * r.r
        );
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        root.add(rock);
      }
    }

    lighthouses = [];
    for (const lh of map.lighthouses) {
      const mesh = makeLighthouse(gradientMap);
      mesh.position.set(lh.x, 0, lh.z);
      mesh.userData.checkpoint = lh.id;
      mesh.userData.lhId = lh.id;
      mesh.userData.claimed = false;
      mesh.userData.isLighthouse = true;
      root.add(mesh);
      lighthouses.push(mesh);
    }

    return map;
  }

  function constrainBoat(paddleState) {
    if (!current) return false;
    const r = constrainToPoly(paddleState.x, paddleState.z, current.navigable);
    // Also keep clear of island discs
    let x = r.x, z = r.z;
    let hit = r.hit;
    for (const isl of current.islands) {
      const dx = x - isl.x, dz = z - isl.z;
      const d = Math.hypot(dx, dz);
      if (d < isl.r + 2) {
        const len = d || 1;
        x = isl.x + (dx / len) * (isl.r + 2.2);
        z = isl.z + (dz / len) * (isl.r + 2.2);
        hit = true;
      }
    }
    for (const reef of current.reefs) {
      const dx = x - reef.x, dz = z - reef.z;
      const d = Math.hypot(dx, dz);
      if (d < reef.r + 1.5) {
        const len = d || 1;
        x = reef.x + (dx / len) * (reef.r + 1.8);
        z = reef.z + (dz / len) * (reef.r + 1.8);
        hit = true;
      }
    }
    paddleState.x = x;
    paddleState.z = z;
    return hit;
  }

  /** Place vortices densely across navigable water */
  function scatterProps(vortexList, flotsamList) {
    if (!current) return;
    const poly = current.navigable;
    const b = current.bounds;
    const bw = Math.max(1, b.maxX - b.minX);
    const bh = Math.max(1, b.maxZ - b.minZ);

    const placeRandom = (obj, i, salt, minSpawn = 14) => {
      for (let attempt = 0; attempt < 40; attempt++) {
        const x = b.minX + Math.random() * bw;
        const z = b.minZ + Math.random() * bh;
        if (!pointInPoly(x, z, poly)) continue;
        let ok = true;
        for (const isl of current.islands) {
          if (Math.hypot(x - isl.x, z - isl.z) < isl.r + 3) { ok = false; break; }
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

  return {
    root,
    load,
    reset,
    constrainBoat,
    scatterProps,
    updateBeacons,
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
