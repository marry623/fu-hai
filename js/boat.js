import * as THREE from 'three';
import {
  cloneHullGlb,
  ensureAllHullGlbsLoading,
  ensureHullGlbLoading,
  onHullGlbReady,
} from './hullGlb.js?v=36g';
import { addOutline, toonMat } from './stylekit.js';

const SLOT_KEYS = ['bow', 'stern', 'sideL', 'sideR', 'keel', 'sail'];
/** Bump when hull/sail mesh layout changes so setBoatVariant rebuilds same boatId. */
export const HULL_REV = 'hull-glb-v10';

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
  leftOar.position.set(-1.05, 0.6, 0.25);
  root.add(leftOar);
  root.userData.leftOar = leftOar;
  const rightOar = makeOar(gradientMap, 1);
  rightOar.position.set(1.05, 0.6, 0.25);
  root.add(rightOar);
  root.userData.rightOar = rightOar;

  const rodArm = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.04, 2.0, 5),
    toonMat(0x8b5a2b, gradientMap)
  );
  pole.position.y = 1.0;
  rodArm.add(pole);
  addOutline(pole, 1.2);
  const rodTip = new THREE.Object3D();
  rodTip.position.set(0, 2.05, 0);
  rodArm.add(rodTip);
  rodArm.position.set(0.9, 0.5, -0.9);
  rodArm.rotation.z = -0.4;
  rodArm.userData.restRot = { x: 0, y: 0, z: -0.4 };
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
  mounts.bow.position.set(0, 0.65, -3.1);
  mounts.stern.position.set(0, 0.5, 2.55);
  mounts.sideL.position.set(-1.15, 0.7, 0);
  mounts.sideR.position.set(1.15, 0.7, 0);
  mounts.keel.position.set(0, -0.5, 0.15);
  mounts.sail.position.set(1.0, 2.8, 0.1);
  root.userData.mounts = mounts;
  root.userData.slots = Object.fromEntries(SLOT_KEYS.map((k) => [k, null]));
  root.userData.bobPhase = Math.random() * Math.PI * 2;

  hullBoats.add(root);
  return root;
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
  buildHullVisual(hull, boat, gm, id);
  boat.userData.boatId = id;
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

function makeOar(gradientMap, side) {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 2.1, 5),
    toonMat(0x7a4a22, gradientMap)
  );
  shaft.rotation.z = side * 0.4;
  shaft.rotation.x = 0.45;
  shaft.position.set(side * 0.2, -0.3, 0.45);
  g.add(shaft);
  addOutline(shaft, 1.15);
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.42, 0.28),
    toonMat(0x9a6030, gradientMap)
  );
  blade.position.set(side * 0.42, -1.05, 1.2);
  blade.rotation.x = 0.5;
  g.add(blade);
  addOutline(blade, 1.12);
  return g;
}

export { SLOT_KEYS };

export function setOarStroke(boat, side, amount) {
  const oar = side < 0 ? boat.userData.leftOar : boat.userData.rightOar;
  if (!oar) return;
  if (oar.userData.restZ == null) {
    oar.userData.restZ = oar.position.z;
    oar.userData.restY = oar.position.y;
  }
  const a = Math.max(0, Math.min(1, amount));
  oar.rotation.x = -a * 0.9;
  oar.rotation.z = side * a * 0.14;
  oar.position.z = oar.userData.restZ - 0.28 + a * 0.72;
  oar.position.y = oar.userData.restY - a * 0.1;
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
  const u = Math.max(0, Math.min(1, t));
  rod.rotation.x = -0.55 + u * 1.15;
  rod.rotation.z = -0.55 + u * 0.25;
  rod.rotation.y = -0.15 + u * 0.35;
}

export function setRodWaitPose(boat) {
  const rod = boat.userData.rodArm;
  if (!rod) return;
  rod.visible = true;
  rod.rotation.x = 0.35;
  rod.rotation.y = 0.15;
  rod.rotation.z = -0.35;
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
    const n = Math.floor(1 + intensity * 3);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(geo, mat.clone());
      m.position.copy(pos);
      m.position.x += (Math.random() - 0.5) * 1.2;
      m.position.y = 0.1 + Math.random() * 0.3;
      m.position.z += (Math.random() - 0.5) * 1.2;
      m.scale.setScalar(0.35 + Math.random() * 0.6 * intensity);
      scene.add(m);
      shards.push({
        mesh: m,
        life: 0.5 + Math.random() * 0.4,
        max: 0.9,
        vx: -vel.x * 0.2 + (Math.random() - 0.5),
        vz: -vel.z * 0.2 + (Math.random() - 0.5),
        vy: 0.6 + Math.random(),
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
