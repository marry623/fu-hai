import * as THREE from 'three';
import { addOutline, toonMat } from './stylekit.js';

function mesh(geo, color, gm, outline = 1.06) {
  const m = new THREE.Mesh(geo, toonMat(color, gm, { flatShading: true }));
  if (outline) addOutline(m, outline);
  return m;
}

function hash2(x, z) {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

export function jitterRockGeo(radius, seed, shoulder = false) {
  const geo = new THREE.IcosahedronGeometry(radius, shoulder ? 0 : 1);
  const pos = geo.attributes.position;
  const squash = shoulder ? 0.62 : 0.74;
  const xScale = 1.12 + seed * 0.28;
  const zScale = 0.86 + (1 - seed) * 0.24;
  const chipA = seed * Math.PI * 2;
  const chipX = Math.cos(chipA);
  const chipZ = Math.sin(chipA);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const side = (x * chipX + z * chipZ) / radius;
    const top = Math.max(0, y / radius);
    const bottom = Math.max(0, -y / radius);
    const chip = Math.max(0, side - 0.38) * (shoulder ? 0.18 : 0.34);
    const ledge = Math.max(0, Math.sin((x - z) * 7.5)) * 0.035 * radius;
    pos.setXYZ(
      i,
      (x * xScale - chipX * chip * radius) * (1 + top * 0.07 - bottom * 0.10),
      Math.max(y * squash - bottom * 0.11 * radius + ledge, -radius * 0.30),
      (z * zScale - chipZ * chip * radius) * (1 + top * 0.04 - bottom * 0.08)
    );
  }
  geo.computeVertexNormals();
  return geo;
}

export function jitterRockCluster(gm, color, radius, seed) {
  const g = new THREE.Group();
  const main = mesh(jitterRockGeo(radius, seed, false), color, gm, 1.05);
  main.position.y = radius * 0.28;
  g.add(main);
  for (let i = 0; i < 2; i++) {
    const a = seed * Math.PI * 2 + i * Math.PI * 0.82;
    const chipR = radius * (0.46 + hash2(seed, i) * 0.18);
    const chip = mesh(jitterRockGeo(chipR, seed + i * 0.17, true), color, gm, 1.05);
    chip.position.set(Math.cos(a) * radius * 0.74, radius * 0.12, Math.sin(a) * radius * 0.62);
    chip.rotation.y = a;
    g.add(chip);
  }
  return g;
}

function coralFan(gm, accent) {
  const g = new THREE.Group();
  const base = mesh(new THREE.CylinderGeometry(0.35, 0.55, 0.5, 5), 0x9b6f4a, gm, 1.05);
  base.position.y = 0.2;
  g.add(base);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const arm = mesh(new THREE.ConeGeometry(0.22, 1.4, 4), accent, gm, 1.08);
    arm.position.set(Math.cos(a) * 0.25, 0.9, Math.sin(a) * 0.25);
    arm.rotation.z = Math.cos(a) * 0.55;
    arm.rotation.x = Math.sin(a) * 0.55;
    g.add(arm);
  }
  return g;
}

function brainCoral(gm, accent) {
  const g = new THREE.Group();
  const bulb = mesh(new THREE.SphereGeometry(0.7, 5, 4), accent, gm, 1.06);
  bulb.position.y = 0.55;
  bulb.scale.set(1.15, 0.75, 1.1);
  g.add(bulb);
  return g;
}

function seaweed(gm) {
  const g = new THREE.Group();
  const mat = toonMat(0x3a8a6a, gm, { flatShading: true, side: THREE.DoubleSide });
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 1.8), mat);
    blade.position.set((i - 1) * 0.18, 0.9, 0);
    blade.rotation.y = i * 0.7;
    addOutline(blade, 1.04);
    g.add(blade);
  }
  return g;
}

function limestone(gm) {
  const rock = mesh(new THREE.IcosahedronGeometry(0.7, 0), 0xf0c98a, gm, 1.05);
  rock.position.y = 0.35;
  rock.scale.set(1.2, 0.7, 1);
  return rock;
}

function kelpBladeGeo() {
  const geo = new THREE.PlaneGeometry(0.55, 6.5, 1, 6);
  geo.translate(0, 3.25, 0);
  return geo;
}

function makeKelpField(gm, points, underside) {
  const n = Math.min(220, points.length * 8);
  if (n <= 0) return null;
  const geo = kelpBladeGeo();
  const mat = toonMat(underside, gm, { flatShading: true, side: THREE.DoubleSide });
  const inst = new THREE.InstancedMesh(geo, mat, n);
  inst.frustumCulled = false;
  const dummy = new THREE.Object3D();
  const seeds = [];
  let i = 0;
  for (const p of points) {
    const bunch = 8;
    for (let k = 0; k < bunch && i < n; k++, i++) {
      const ang = Math.random() * Math.PI * 2;
      const d = Math.random() * (p.r * 0.85);
      dummy.position.set(p.x + Math.cos(ang) * d, 0, p.z + Math.sin(ang) * d);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.15);
      const h = 0.7 + Math.random() * 0.8;
      dummy.scale.set(0.8 + Math.random() * 0.5, h, 1);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      seeds.push({
        x: dummy.position.x,
        z: dummy.position.z,
        yaw: dummy.rotation.y,
        lean: dummy.rotation.z,
        sx: dummy.scale.x,
        h,
      });
    }
  }
  inst.count = i;
  inst.instanceMatrix.needsUpdate = true;
  inst.userData.kelp = { dummy, seeds, n: i };
  inst.userData.skipOutline = true;
  return inst;
}

function wreckPiece(gm, stone, lamp) {
  const g = new THREE.Group();
  const mast = mesh(new THREE.CylinderGeometry(0.18, 0.28, 5.2, 5), stone, gm, 1.05);
  mast.position.set(0, 1.4, 0);
  mast.rotation.z = 0.35;
  g.add(mast);
  const hull = mesh(new THREE.BoxGeometry(2.4, 0.7, 1.1), 0x4a3a28, gm, 1.05);
  hull.position.set(0.2, 0.25, 0);
  hull.rotation.set(0.2, 0.4, 0.15);
  g.add(hull);
  const lantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 6, 5),
    new THREE.MeshBasicMaterial({ color: lamp })
  );
  lantern.position.set(0.4, 3.2, 0.1);
  lantern.userData.skipOutline = true;
  g.add(lantern);
  return g;
}

function spire(gm, stone, accent) {
  const g = new THREE.Group();
  const spike = mesh(new THREE.ConeGeometry(0.55, 5.5, 5), stone, gm, 1.05);
  spike.position.y = 2.4;
  g.add(spike);
  const vein = mesh(new THREE.BoxGeometry(0.12, 3.2, 0.12), accent, gm, 1.1);
  vein.position.set(0.15, 2.2, 0);
  g.add(vein);
  return g;
}

function deadTree(gm, stone) {
  const g = new THREE.Group();
  const trunk = mesh(new THREE.CylinderGeometry(0.18, 0.32, 4.2, 5), stone, gm, 1.05);
  trunk.position.y = 2.0;
  trunk.rotation.z = 0.12;
  g.add(trunk);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const arm = mesh(new THREE.ConeGeometry(0.12, 1.8, 4), stone, gm, 1.06);
    arm.position.set(Math.cos(a) * 0.4, 3.4, Math.sin(a) * 0.4);
    arm.rotation.z = Math.cos(a) * 0.9;
    arm.rotation.x = Math.sin(a) * 0.9;
    g.add(arm);
  }
  return g;
}

function lavaVent(gm, stone, accent) {
  const g = new THREE.Group();
  const rock = mesh(new THREE.DodecahedronGeometry(1.1, 0), stone, gm, 1.05);
  rock.position.y = 0.45;
  g.add(rock);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 6, 4),
    new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.85 })
  );
  glow.position.y = 0.7;
  glow.userData.skipOutline = true;
  glow.userData.ventGlow = true;
  g.add(glow);
  const steam = mesh(new THREE.ConeGeometry(0.35, 1.6, 4), 0xf0d0c0, gm, 0);
  steam.material.transparent = true;
  steam.material.opacity = 0.25;
  steam.position.y = 1.8;
  steam.userData.ventSteam = true;
  g.add(steam);
  return g;
}

function dandelion(gm) {
  const g = new THREE.Group();
  const stem = mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.7, 4), 0x3a5a28, gm, 0);
  stem.position.y = 0.35;
  g.add(stem);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 6, 5),
    new THREE.MeshBasicMaterial({ color: 0xfff8ee })
  );
  head.position.y = 0.78;
  head.userData.skipOutline = true;
  g.add(head);
  return g;
}

function makeLeafPlateGeo() {
  const geo = new THREE.PlaneGeometry(0.46, 0.68, 1, 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = (y + 0.34) / 0.68;
    const w = Math.pow(Math.max(0.05, t), 0.62) * (1 - t * 0.12);
    pos.setX(i, pos.getX(i) * w);
    pos.setZ(i, 0.05 * Math.sin(t * Math.PI));
  }
  geo.translate(0, -0.34, 0);
  geo.computeVertexNormals();
  return geo;
}

function orientShingle(dummy, nx, ny, nz, shingleLift) {
  const up = new THREE.Vector3(0, 1, 0);
  const normal = new THREE.Vector3(nx, ny, nz).normalize();
  const tangentDown = up.clone().sub(normal.clone().multiplyScalar(up.dot(normal)));
  if (tangentDown.lengthSq() < 1e-6) tangentDown.set(0, 0, 1);
  tangentDown.normalize().multiplyScalar(-1);
  const faceNormal = normal.clone().addScaledVector(tangentDown, shingleLift).normalize();
  const yAxis = tangentDown.clone().multiplyScalar(-1);
  const xAxis = yAxis.clone().cross(faceNormal).normalize();
  dummy.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, faceNormal));
}

function scatterLeafballGrove(group, islands, gm) {
  const trees = [];
  for (const isl of islands) {
    const n = 3 + (isl.r > 18 ? 2 : isl.r > 14 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + hash2(isl.x, isl.z) * 1.7;
      const d = isl.r * (0.18 + (i % 3) * 0.16);
      trees.push({
        x: isl.x + Math.cos(a) * d,
        z: isl.z + Math.sin(a) * d,
        s: 0.85 + hash2(isl.x + i, isl.z) * 0.55,
        yaw: a,
      });
    }
  }
  if (!trees.length) return;

  const leafGeo = makeLeafPlateGeo();
  const leafMats = [
    toonMat(0x9a6d24, gm, { flatShading: true, side: THREE.DoubleSide }),
    toonMat(0xc49a3d, gm, { flatShading: true, side: THREE.DoubleSide }),
    toonMat(0xf1c86b, gm, { flatShading: true, side: THREE.DoubleSide }),
  ];
  const rows = [
    { count: 8, phi: 0.38, mat: 0 },
    { count: 12, phi: 0.58, mat: 1 },
    { count: 14, phi: 0.78, mat: 1 },
    { count: 12, phi: 0.98, mat: 2 },
    { count: 8, phi: 1.16, mat: 2 },
    { count: 5, phi: 1.32, mat: 0 },
  ];
  const buckets = leafMats.map(() => []);
  const dummy = new THREE.Object3D();
  const trunkDummy = new THREE.Object3D();

  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.42, 2.4, 7);
  trunkGeo.translate(0, 1.2, 0);
  const trunkMat = toonMat(0x8a5a2c, gm, { flatShading: true });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length);
  trunks.frustumCulled = false;
  trunks.userData.skipOutline = true;

  const shadowGeo = new THREE.CircleGeometry(1.8, 8);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x5a3a18,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  const shadows = new THREE.InstancedMesh(shadowGeo, shadowMat, trees.length);
  shadows.frustumCulled = false;
  shadows.userData.skipOutline = true;

  trees.forEach((t, ti) => {
    const canopyY = 3.9 * t.s;
    const rad = 4.2 * t.s;
    trunkDummy.position.set(t.x, 0, t.z);
    trunkDummy.rotation.set(0, t.yaw, 0.04);
    trunkDummy.scale.set(t.s * 1.15, t.s * 1.6, t.s * 1.15);
    trunkDummy.updateMatrix();
    trunks.setMatrixAt(ti, trunkDummy.matrix);

    dummy.position.set(t.x, 0.04, t.z);
    dummy.rotation.set(-Math.PI / 2, 0, 0);
    dummy.scale.set(t.s * 1.1, t.s * 1.1, 1);
    dummy.updateMatrix();
    shadows.setMatrixAt(ti, dummy.matrix);

    for (const row of rows) {
      for (let i = 0; i < row.count; i++) {
        const a = (i / row.count) * Math.PI * 2 + t.yaw + row.phi * 0.15;
        const nx = Math.sin(row.phi) * Math.cos(a);
        const ny = Math.cos(row.phi);
        const nz = Math.sin(row.phi) * Math.sin(a);
        dummy.position.set(t.x + nx * rad, canopyY + ny * rad * 0.72, t.z + nz * rad);
        orientShingle(dummy, nx, ny, nz, 0.12);
        dummy.scale.setScalar(t.s * (0.85 + (i % 3) * 0.08));
        dummy.updateMatrix();
        buckets[row.mat].push(dummy.matrix.clone());
      }
    }
  });

  trunks.instanceMatrix.needsUpdate = true;
  shadows.instanceMatrix.needsUpdate = true;
  group.add(shadows);
  group.add(trunks);

  buckets.forEach((mats, bi) => {
    if (!mats.length) return;
    const inst = new THREE.InstancedMesh(leafGeo, leafMats[bi], mats.length);
    inst.frustumCulled = false;
    inst.userData.skipOutline = true;
    mats.forEach((m, i) => inst.setMatrixAt(i, m));
    inst.instanceMatrix.needsUpdate = true;
    group.add(inst);
  });
}

function scatterGoldenGrass(group, islands, gm) {
  let n = 0;
  for (const isl of islands) n += Math.min(90, Math.floor(isl.r * 3.2));
  n = Math.min(1200, n);
  if (n <= 0) return;
  const geo = new THREE.ConeGeometry(0.07, 0.55, 3);
  geo.translate(0, 0.28, 0);
  const mat = toonMat(0x8b5a2b, gm, { flatShading: true });
  const inst = new THREE.InstancedMesh(geo, mat, n);
  inst.frustumCulled = false;
  inst.userData.skipOutline = true;
  const dummy = new THREE.Object3D();
  let i = 0;
  for (const isl of islands) {
    const local = Math.min(90, Math.floor(isl.r * 3.2));
    for (let k = 0; k < local && i < n; k++, i++) {
      const a = hash2(isl.x + k, isl.z) * Math.PI * 2;
      const d = Math.sqrt(hash2(k, isl.z)) * isl.r * 0.88;
      dummy.position.set(isl.x + Math.cos(a) * d, isl.r * 0.28 + 0.12, isl.z + Math.sin(a) * d);
      dummy.rotation.set((hash2(k, 1) - 0.5) * 0.25, a, (hash2(k, 2) - 0.5) * 0.25);
      dummy.scale.setScalar(0.7 + hash2(k, 3) * 0.7);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
  }
  inst.count = i;
  inst.instanceMatrix.needsUpdate = true;
  group.add(inst);
}

export function scatterBiomeDecor(root, map, biome, gm) {
  const group = new THREE.Group();
  group.name = 'biomeDecor';
  if ((map.id | 0) === 0) {
    root.add(group);
    return group;
  }
  const skin = biome.reefSkin;
  const reefs = map.reefs || [];
  const islands = map.islands || [];

  if (skin === 'coral') {
    for (const r of reefs) {
      const n = 4 + (r.r > 14 ? 2 : 0);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r.x * 0.01;
        const d = r.r * (0.22 + (i % 4) * 0.16);
        const piece = i % 3 === 1 ? brainCoral(gm, biome.accent) : coralFan(gm, biome.accent);
        piece.position.set(r.x + Math.cos(a) * d, 0, r.z + Math.sin(a) * d);
        piece.scale.setScalar(0.85 + (i % 3) * 0.28);
        group.add(piece);
      }
      const weed = seaweed(gm);
      weed.position.set(r.x + r.r * 0.2, 0, r.z - r.r * 0.15);
      group.add(weed);
      const lime = limestone(gm);
      lime.position.set(r.x, 0, r.z);
      group.add(lime);
      const rock = jitterRockCluster(gm, 0xf0c98a, r.r * 0.22, hash2(r.x, r.z));
      rock.position.set(r.x - r.r * 0.25, 0, r.z + r.r * 0.1);
      group.add(rock);
    }
    for (const isl of islands) {
      const n = 3;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const piece = i % 2 ? brainCoral(gm, biome.accent) : coralFan(gm, biome.accent);
        piece.position.set(isl.x + Math.cos(a) * isl.r * 0.45, 0, isl.z + Math.sin(a) * isl.r * 0.45);
        piece.scale.setScalar(0.9);
        group.add(piece);
      }
    }
  }

  if (skin === 'kelp') {
    const pts = [...reefs, ...islands.map((isl) => ({ x: isl.x, z: isl.z, r: isl.r * 0.7 }))];
    const field = makeKelpField(gm, pts, 0x3a5a40);
    if (field) group.add(field);
    for (const isl of islands) {
      const rock = jitterRockCluster(gm, 0x3a5a40, isl.r * 0.18, hash2(isl.x, isl.z));
      rock.position.set(isl.x, 0, isl.z);
      group.add(rock);
    }
  }

  if (skin === 'grove') {
    scatterLeafballGrove(group, islands, gm);
    scatterGoldenGrass(group, islands, gm);
    for (const isl of islands) {
      const rock = jitterRockCluster(gm, 0x5a3a18, 1.1 + hash2(isl.x, isl.z) * 0.6, hash2(isl.x, isl.z));
      rock.position.set(isl.x + isl.r * 0.35, 0, isl.z - isl.r * 0.2);
      group.add(rock);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        const d = dandelion(gm);
        d.position.set(isl.x + Math.cos(a) * isl.r * 0.55, isl.r * 0.24, isl.z + Math.sin(a) * isl.r * 0.55);
        d.scale.setScalar(1.4);
        group.add(d);
      }
    }
    reefs.slice(0, 2).forEach((r) => {
      const w = wreckPiece(gm, biome.lighthouseStone, biome.lighthouseLamp);
      w.position.set(r.x, 0, r.z);
      w.rotation.y = r.x * 0.02;
      w.scale.setScalar(0.85);
      group.add(w);
    });
  }

  if (skin === 'spire') {
    for (const r of reefs) {
      const n = 3 + (r.r > 14 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const s = spire(gm, biome.lighthouseStone, biome.accent);
        s.position.set(r.x + Math.cos(a) * r.r * 0.4, 0, r.z + Math.sin(a) * r.r * 0.4);
        s.scale.setScalar(0.7 + i * 0.22);
        group.add(s);
      }
      const dead = deadTree(gm, biome.lighthouseStone);
      dead.position.set(r.x, 0, r.z);
      group.add(dead);
    }
    for (const isl of islands) {
      const dead = deadTree(gm, biome.lighthouseStone);
      dead.position.set(isl.x + isl.r * 0.2, 0, isl.z);
      dead.scale.setScalar(1.3);
      group.add(dead);
      const rock = jitterRockCluster(gm, biome.lighthouseStone, isl.r * 0.2, hash2(isl.x, isl.z));
      rock.position.set(isl.x - isl.r * 0.3, 0, isl.z + isl.r * 0.15);
      group.add(rock);
    }
  }

  if (skin === 'vent') {
    for (const r of reefs) {
      const v = lavaVent(gm, biome.lighthouseStone, biome.accent);
      v.position.set(r.x, 0, r.z);
      group.add(v);
      const rock = jitterRockCluster(gm, biome.lighthouseStone, r.r * 0.28, hash2(r.x, r.z));
      rock.position.set(r.x + r.r * 0.35, 0, r.z);
      group.add(rock);
    }
    for (const isl of islands) {
      const v = lavaVent(gm, biome.lighthouseStone, biome.accent);
      v.position.set(isl.x, 0, isl.z);
      v.scale.setScalar(1.4);
      group.add(v);
    }
  }

  root.add(group);
  return group;
}

export function updateBiomeDecor(root, time) {
  if (!root) return;
  root.traverse((o) => {
    const kelp = o.userData?.kelp;
    if (kelp) {
      const dummy = kelp.dummy;
      for (let i = 0; i < kelp.n; i++) {
        const s = kelp.seeds[i];
        dummy.position.set(s.x, 0, s.z);
        dummy.rotation.set(0, s.yaw, s.lean + Math.sin(time * 1.15 + i * 0.37) * 0.12);
        dummy.scale.set(s.sx, s.h, 1);
        dummy.updateMatrix();
        o.setMatrixAt(i, dummy.matrix);
      }
      o.instanceMatrix.needsUpdate = true;
    }
    if (o.userData?.ventGlow) {
      const s = 0.85 + Math.sin(time * 3.2 + o.position.x) * 0.18;
      o.scale.setScalar(s);
    }
    if (o.userData?.ventSteam) {
      o.material.opacity = 0.12 + Math.sin(time * 2.4 + o.position.z) * 0.1;
      o.position.y = 1.6 + Math.sin(time * 1.6) * 0.15;
    }
  });
}
