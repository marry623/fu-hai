import * as THREE from 'three';
import {
  cloneHullGlb,
  ensureAllHullGlbsLoading,
  ensureHullGlbLoading,
  onHullGlbReady,
  hullUpscale,
} from './hullGlb.js?v=43k';
import { addOutline, toonMat } from './stylekit.js';

const SLOT_KEYS = ['bow', 'stern', 'sideL', 'sideR', 'keel', 'sail'];
/** Bump when hull/sail mesh layout changes so setBoatVariant rebuilds same boatId. */
export const HULL_REV = 'hull-glb-v12';

/**
 * Rowlock mount + oar size per hull, in authored hull units (before hullUpscale).
 * Hull AABBs are useless here: masts, yards and rigging swamp the box, and the GLBs
 * use generic mesh names, so these are measured off the hull body of each model.
 */
const OAR_MOUNT = {
  raft: { x: 1.05, y: 0.6, z: 0.25, scale: 1 },
  heavyRaft: { x: 1.12, y: 0.77, z: 0.54, scale: 0.96 },
  chargeBoat: { x: 1.42, y: 1.12, z: 0.15, scale: 1.19 },
};

/** Fallback mounts (pre-GLB / unknown hull). */
const DEFAULT_MOUNTS = {
  bow: [0, 0.65, -3.1],
  stern: [0, 0.35, 4.2],
  sideL: [-1.15, 0.7, 0],
  sideR: [1.15, 0.7, 0],
  keel: [0, -0.5, 0.15],
  sail: [1.0, 2.8, 0.1],
};

const hullBoats = new Set();

ensureAllHullGlbsLoading();
onHullGlbReady(() => refreshHullBoats());

/**
 * Low-poly player boat. boatId: raft | heavyRaft | chargeBoat
 */
export function createBoat(gradientMap, boatId = 'raft') {
  const root = new THREE.Group();
  root.name = 'playerSailboat';
  root.userData.boatId = boatId || 'raft';
  root.userData.hullRev = HULL_REV;
  root.userData.gradientMap = gradientMap;

  const hullGroup = new THREE.Group();
  hullGroup.name = 'hullVisual';
  root.add(hullGroup);
  root.userData.hullGroup = hullGroup;
  buildHullVisual(hullGroup, root, gradientMap, root.userData.boatId);

  const leftOar = makeOar(gradientMap, -1);
  root.add(leftOar);
  root.userData.leftOar = leftOar;
  const rightOar = makeOar(gradientMap, 1);
  root.add(rightOar);
  root.userData.rightOar = rightOar;
  layoutOars(root);

  const rodArm = new THREE.Group();
  const rodMat = toonMat(0x8b5a2b, gradientMap);
  const rodSegments = [];
  const lengths = [0.72, 0.7, 0.64];
  const radii = [[0.042, 0.052], [0.03, 0.042], [0.018, 0.03]];
  let rodParent = rodArm;
  for (let i = 0; i < lengths.length; i++) {
    const pivot = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(radii[i][0], radii[i][1], lengths[i], 5),
      rodMat
    );
    pole.position.y = lengths[i] * 0.5;
    pivot.add(pole);
    addOutline(pole, 1.2);
    rodParent.add(pivot);
    rodSegments.push(pivot);
    const next = new THREE.Group();
    next.position.y = lengths[i];
    pivot.add(next);
    rodParent = next;
  }
  const rodTip = new THREE.Object3D();
  rodTip.position.set(0, 0.03, 0);
  rodParent.add(rodTip);
  rodArm.position.set(0.9, 0.5, -0.9);
  rodArm.rotation.z = -0.4;
  rodArm.userData.restRot = { x: 0, y: 0, z: -0.4 };
  rodArm.userData.segments = rodSegments;
  rodArm.visible = false;
  root.add(rodArm);
  root.userData.rodArm = rodArm;
  root.userData.rodTip = rodTip;

  const cargoHold = new THREE.Group();
  cargoHold.position.set(0, 0.65, 0);
  root.add(cargoHold);
  root.userData.cargoHold = cargoHold;

  const mounts = {};
  for (const k of SLOT_KEYS) {
    mounts[k] = new THREE.Group();
    root.add(mounts[k]);
  }
  root.userData.mounts = mounts;
  layoutSlotMounts(root);
  root.userData.slots = Object.fromEntries(SLOT_KEYS.map((k) => [k, null]));
  root.userData.bobPhase = Math.random() * Math.PI * 2;

  hullBoats.add(root);
  return root;
}

/** Place slot mounts outside the current hull AABB (boat-local). */
export function layoutSlotMounts(boat) {
  const mounts = boat?.userData?.mounts;
  if (!mounts) return;
  const extents = readHullExtents(boat);
  if (!extents) {
    for (const k of SLOT_KEYS) {
      const p = DEFAULT_MOUNTS[k];
      mounts[k].position.set(p[0], p[1], p[2]);
    }
    return;
  }
  const { minX, maxX, minY, maxY, minZ, maxZ } = extents;
  const beam = Math.max(0.8, (maxX - minX) * 0.5);
  const deckY = Math.min(maxY * 0.35, 0.85);
  mounts.bow.position.set(0, deckY, minZ - 0.35);
  // Aft of the transom so stern fish hang in water, not on the cockpit floor.
  mounts.stern.position.set(0, 0.28, maxZ + 0.55);
  mounts.sideL.position.set(minX - 0.2, deckY + 0.05, (minZ + maxZ) * 0.15);
  mounts.sideR.position.set(maxX + 0.2, deckY + 0.05, (minZ + maxZ) * 0.15);
  mounts.keel.position.set(0, minY - 0.15, (minZ + maxZ) * 0.05);
  mounts.sail.position.set(beam * 0.55, Math.max(2.4, maxY * 0.72), (minZ + maxZ) * 0.05);
}

/** Sit the oars on the hull side and scale them with the hull (boat-local). */
export function layoutOars(boat) {
  const oars = [boat?.userData?.leftOar, boat?.userData?.rightOar].filter(Boolean);
  if (!oars.length) return;
  const id = boat.userData.boatId || 'raft';
  const m = OAR_MOUNT[id] || OAR_MOUNT.raft;
  const up = hullUpscale(id);
  const s = m.scale * up;
  for (const oar of oars) {
    const side = oar.userData.oarSide || 1;
    oar.position.set(side * m.x * up, m.y * up, m.z * up);
    oar.scale.setScalar(s);
    oar.userData.oarScale = s;
    oar.userData.restZ = null;
    oar.userData.restY = null;
  }
}

function readHullExtents(boat) {
  const hull = boat.userData?.hullGroup;
  if (!hull) return null;
  for (const child of hull.children) {
    const e = child.userData?.hullExtents;
    if (e) return e;
  }
  if (!hull.children.length) return null;
  hull.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(hull);
  if (box.isEmpty()) return null;
  return {
    minX: box.min.x, maxX: box.max.x,
    minY: box.min.y, maxY: box.max.y,
    minZ: box.min.z, maxZ: box.max.z,
  };
}

/** Swap hull/sail look in-place (keeps mounts, oars). */
export function setBoatVariant(boat, boatId) {
  const id = boatId || 'raft';
  if (!boat?.userData?.hullGroup) return boat;
  if (boat.userData.boatId === id && boat.userData.hullRev === HULL_REV) return boat;
  const gm = boat.userData.gradientMap;
  const hull = boat.userData.hullGroup;
  while (hull.children.length) {
    const c = hull.children[0];
    hull.remove(c);
    if (c.userData?.hullGlb) continue;
    c.traverse((o) => {
      if (o.userData?.hullGlbShared) return;
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
        else o.material.dispose?.();
      }
    });
  }
  boat.userData.sailMesh = null;
  boat.userData.boatId = id;
  buildHullVisual(hull, boat, gm, id);
  layoutSlotMounts(boat);
  layoutOars(boat);
  boat.userData.hullRev = HULL_REV;
  return boat;
}

function buildHullVisual(hull, root, gm, boatId) {
  const id = boatId || 'raft';
  ensureHullGlbLoading(id);
  root.userData.sailMesh = null;
  const model = cloneHullGlb(id);
  if (!model) return;
  hull.add(model);
  let sail = null;
  model.traverse((o) => {
    if (!sail && o.name && /sail/i.test(o.name)) sail = o;
  });
  root.userData.sailMesh = sail;
}

function refreshHullBoats() {
  for (const boat of hullBoats) {
    if (!boat.userData.hullGroup) continue;
    boat.userData.hullRev = '';
    setBoatVariant(boat, boat.userData.boatId || 'raft');
  }
}

function add(parent, mesh, outlineScale = 1.08) {
  parent.add(mesh);
  addOutline(mesh, outlineScale);
  return mesh;
}

function clearOarChildren(oar) {
  while (oar.children.length) {
    const c = oar.children[0];
    oar.remove(c);
    c.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
        else o.material.dispose?.();
      }
    });
  }
}

function fillOarVisual(oar, gradientMap, side) {
  clearOarChildren(oar);
  // Shaft and blade share one arm so the blade always sits on the shaft tip.
  const arm = new THREE.Group();
  arm.position.set(side * 0.2, -0.3, 0.45);
  arm.rotation.z = side * 0.4;
  arm.rotation.x = 0.45;
  oar.add(arm);
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 2.1, 5),
    toonMat(0x7a4a22, gradientMap)
  );
  arm.add(shaft);
  addOutline(shaft, 1.15);
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.42, 0.28),
    toonMat(0x9a6030, gradientMap)
  );
  blade.position.y = -1.22;
  arm.add(blade);
  addOutline(blade, 1.12);
}

function makeOar(gradientMap, side) {
  const g = new THREE.Group();
  g.userData.oarSide = side;
  fillOarVisual(g, gradientMap, side);
  return g;
}

export { SLOT_KEYS, hullUpscale };

export function setOarStroke(boat, side, amount) {
  const oar = side < 0 ? boat.userData.leftOar : boat.userData.rightOar;
  if (!oar) return;
  if (oar.userData.restZ == null) {
    oar.userData.restZ = oar.position.z;
    oar.userData.restY = oar.position.y;
  }
  const a = Math.max(0, Math.min(1, amount));
  const s = oar.userData.oarScale || 1;
  oar.rotation.x = -a * 0.9;
  oar.rotation.z = side * a * 0.14;
  oar.position.z = oar.userData.restZ + (-0.28 + a * 0.72) * s;
  oar.position.y = oar.userData.restY - a * 0.1 * s;
  const sail = boat.userData.sailMesh;
  if (sail) sail.rotation.y = -0.12 + a * 0.06 * side;
}

/** Resting waterline height — water waves crest ~1m, keep hull mostly above. */
export const BOAT_WATERLINE_Y = 0.72;

export function setHullDamageVisual(boat, durability, max = 100) {
  const t = durability / max;
  boat.rotation.z = (1 - t) * 0.12 * Math.sin(performance.now() * 0.002);
  const sink = t < 0.3 ? -0.2 : t < 0.6 ? -0.08 : 0;
  boat.position.y = BOAT_WATERLINE_Y + sink;
}

export function setRodCastPose(boat, t) {
  const rod = boat.userData.rodArm;
  if (!rod) return;
  rod.visible = true;
  for (const seg of rod.userData.segments || []) seg.rotation.set(0, 0, 0);
  const u = Math.max(0, Math.min(1, t));
  rod.rotation.x = -0.55 + u * 1.15;
  rod.rotation.z = -0.55 + u * 0.25;
  rod.rotation.y = -0.15 + u * 0.35;
}

export function setRodWaitPose(boat) {
  const rod = boat.userData.rodArm;
  if (!rod) return;
  rod.visible = true;
  for (const seg of rod.userData.segments || []) seg.rotation.set(0, 0, 0);
  rod.rotation.x = 0.35;
  rod.rotation.y = 0.15;
  rod.rotation.z = -0.35;
}

/** k: 0 = just bit, 1 = initial strike settled; bend persists through QTE. */
export function setRodBitePose(boat, k, time = 0) {
  setRodWaitPose(boat);
  const rod = boat.userData.rodArm;
  if (!rod) return;
  const punch = (1 - Math.max(0, Math.min(1, k))) ** 2;
  rod.rotation.x += 1.18 * punch + Math.sin(time * 15) * 0.08;
  rod.rotation.y += Math.sin(time * 11) * 0.045;
  rod.rotation.z -= 0.28 * punch + Math.cos(time * 13) * 0.06;
  const segs = rod.userData.segments || [];
  for (let i = 0; i < segs.length; i++) {
    const tipWeight = (i + 1) / segs.length;
    segs[i].rotation.x = (0.14 + punch * 0.2) * tipWeight
      + Math.sin(time * (17 + i * 2) + i) * 0.045 * tipWeight;
    segs[i].rotation.z = Math.cos(time * (12 + i) + i) * 0.035 * tipWeight;
  }
}

export function resetRodPose(boat) {
  const rod = boat.userData.rodArm;
  if (rod) {
    const r = rod.userData.restRot || { x: 0, y: 0, z: -0.4 };
    rod.rotation.set(r.x, r.y, r.z);
    rod.visible = false;
  }
}

export function createWakeSystem(scene) {
  const shards = [];
  const geo = new THREE.OctahedronGeometry(0.28, 0);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  function spawn(pos, vel, intensity = 1) {
    const burst = intensity >= 1.5;
    const n = burst ? Math.floor(10 + intensity * 6) : Math.floor(1 + intensity * 3);
    const scatter = burst ? 2.6 : 1.2;
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(geo, mat.clone());
      m.position.copy(pos);
      m.position.x += (Math.random() - 0.5) * scatter;
      m.position.y = 0.1 + Math.random() * (burst ? 0.55 : 0.3);
      m.position.z += (Math.random() - 0.5) * scatter;
      m.scale.setScalar(0.35 + Math.random() * 0.6 * Math.min(2.4, intensity));
      scene.add(m);
      shards.push({
        mesh: m,
        life: 0.5 + Math.random() * (burst ? 0.55 : 0.4),
        max: burst ? 1.15 : 0.9,
        vx: -vel.x * 0.2 + (Math.random() - 0.5) * (burst ? 2.8 : 1),
        vz: -vel.z * 0.2 + (Math.random() - 0.5) * (burst ? 2.8 : 1),
        vy: burst ? 1.6 + Math.random() * 2.4 : 0.6 + Math.random(),
      });
    }
  }

  function update(dt) {
    for (let i = shards.length - 1; i >= 0; i--) {
      const s = shards[i];
      s.life -= dt;
      s.mesh.position.x += s.vx * dt;
      s.mesh.position.z += s.vz * dt;
      s.mesh.position.y += s.vy * dt;
      s.vy -= 4 * dt;
      s.mesh.material.transparent = true;
      s.mesh.material.opacity = Math.max(0, s.life / s.max);
      if (s.life <= 0) {
        scene.remove(s.mesh);
        s.mesh.material.dispose();
        shards.splice(i, 1);
      }
    }
  }

  return { spawn, update };
}

/** Expanding white rings at a splash point (cast land / bite). */
export function createSplashRings(scene) {
  const rings = [];
  const geo = new THREE.RingGeometry(0.18, 0.38, 16);

  function spawn(x, z, strength = 1) {
    const n = 3;
    for (let i = 0; i < n; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.72 * strength,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, 0.06, z);
      mesh.scale.setScalar(0.35 + i * 0.12);
      mesh.userData.skipOutline = true;
      scene.add(mesh);
      rings.push({
        mesh,
        age: -i * 0.05,
        life: 0.48 + i * 0.12,
        grow: 5.5 + i * 1.4,
        startOp: 0.72 * strength,
      });
    }
  }

  function update(dt) {
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.age += dt;
      if (r.age < 0) continue;
      const u = Math.min(1, r.age / r.life);
      r.mesh.scale.setScalar(0.4 + u * r.grow);
      r.mesh.material.opacity = r.startOp * (1 - u);
      if (u >= 1) {
        scene.remove(r.mesh);
        r.mesh.material.dispose();
        rings.splice(i, 1);
      }
    }
  }

  return { spawn, update };
}
