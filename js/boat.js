import * as THREE from 'three';
import { addOutline, toonMat } from './stylekit.js';

const SLOT_KEYS = ['bow', 'stern', 'sideL', 'sideR', 'keel', 'sail'];

/**
 * Low-poly sailboat matched to concept: dark hull, cream sail.
 */
export function createBoat(gradientMap) {
  const root = new THREE.Group();
  root.name = 'playerSailboat';

  const wood = toonMat(0x8a5528, gradientMap);
  const woodDark = toonMat(0x5c3514, gradientMap);
  const woodDeep = toonMat(0x4a2a10, gradientMap);
  const woodLight = toonMat(0xa86a38, gradientMap);
  const sailMat = new THREE.MeshToonMaterial({
    color: 0xf2e6d0,
    gradientMap,
    side: THREE.DoubleSide,
  });
  const metal = toonMat(0xb8c0c8, gradientMap);
  const rope = toonMat(0x2a1c10, gradientMap);
  const skin = toonMat(0xffb08a, gradientMap);
  const cloth = toonMat(0x3a6ad4, gradientMap);

  // —— Hull: wedge (bow = -Z) ——
  const hullMesh = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.7, 4.2), wood);
  hullMesh.position.set(0, 0.05, 0.15);
  add(root, hullMesh, 1.045);

  // Bow point
  const bow = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.5, 5), woodDark);
  bow.rotation.x = Math.PI / 2;
  bow.position.set(0, 0.08, -2.55);
  bow.scale.set(1, 1.05, 0.75);
  add(root, bow, 1.05);

  // Side flares (gunwales)
  for (const side of [-1, 1]) {
    const sidePlank = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 3.9), woodDeep);
    sidePlank.position.set(side * 0.88, 0.42, 0.1);
    sidePlank.rotation.z = side * -0.12;
    add(root, sidePlank, 1.08);
  }

  // Deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.1, 3.7), woodLight);
  deck.position.set(0, 0.42, 0.15);
  add(root, deck, 1.06);

  // Keel
  const keel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.28, 3.8), woodDeep);
  keel.position.set(0, -0.38, 0.1);
  add(root, keel, 1.1);

  // Stern board + metal tip
  const stern = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.75, 0.22), woodDark);
  stern.position.set(0, 0.15, 2.3);
  add(root, stern, 1.06);
  const sternMetal = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.28), metal);
  sternMetal.position.set(0, 0.35, 2.5);
  add(root, sternMetal, 1.15);

  // Bowsprit + silver tip
  const sprit = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 1.35), woodDeep);
  sprit.position.set(0, 0.48, -3.35);
  sprit.rotation.x = -0.18;
  add(root, sprit, 1.12);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.4, 5), metal);
  tip.rotation.x = Math.PI / 2;
  tip.position.set(0, 0.6, -4.05);
  add(root, tip, 1.18);

  // Mast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.4, 6), woodDeep);
  mast.position.set(0, 2.65, -0.15);
  add(root, mast, 1.08);

  // Boom (bottom of sail)
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 2.6, 5), woodDeep);
  boom.rotation.z = Math.PI / 2;
  boom.rotation.y = 0.08;
  boom.position.set(0.55, 0.95, 0.05);
  add(root, boom, 1.12);

  // Faceted triangular sail (solid volume, no outline black face)
  const sail = makeFacetedSail(sailMat);
  sail.position.set(0.08, 1.05, -0.05);
  root.add(sail);
  root.userData.sailMesh = sail;

  // Rigging
  addRig(root, rope, new THREE.Vector3(0, 4.7, -0.15), new THREE.Vector3(0, 0.55, -3.7));
  addRig(root, rope, new THREE.Vector3(0, 4.7, -0.15), new THREE.Vector3(0, 0.55, 2.25));
  addRig(root, rope, new THREE.Vector3(0, 4.7, -0.15), new THREE.Vector3(0.85, 1.0, 0.3));
  addRig(root, rope, new THREE.Vector3(0, 4.7, -0.15), new THREE.Vector3(-0.85, 1.0, 0.3));

  // Crate
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.48, 0.55), woodDark);
  crate.position.set(-0.4, 0.72, 1.15);
  add(root, crate, 1.08);
  const brace = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.06), woodDeep);
  brace.position.set(-0.4, 0.88, 1.15);
  brace.rotation.y = Math.PI / 4;
  add(root, brace, 1.15);

  // Two barrels
  for (const [bx, bz] of [[0.45, 1.2], [0.55, 1.65]]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.42, 8), wood);
    barrel.position.set(bx, 0.7, bz);
    add(root, barrel, 1.08);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.03, 4, 10), woodDeep);
    band.rotation.x = Math.PI / 2;
    band.position.copy(barrel.position);
    root.add(band);
  }

  // Small deck block near mast
  const block = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.28), toonMat(0x6a6a6a, gradientMap));
  block.position.set(0.35, 0.58, -0.35);
  add(root, block, 1.12);

  // Captain
  const captain = new THREE.Group();
  captain.position.set(0.1, 0.55, 0.35);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.28, 3, 6), cloth);
  body.position.y = 0.42;
  captain.add(body);
  addOutline(body, 1.1);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 5), skin);
  head.position.y = 0.8;
  captain.add(head);
  addOutline(head, 1.1);
  root.add(captain);
  root.userData.captain = captain;

  // Oars
  const leftOar = makeOar(gradientMap, -1);
  leftOar.position.set(-1.05, 0.6, 0.25);
  root.add(leftOar);
  root.userData.leftOar = leftOar;
  const rightOar = makeOar(gradientMap, 1);
  rightOar.position.set(1.05, 0.6, 0.25);
  root.add(rightOar);
  root.userData.rightOar = rightOar;

  // Rod + tip marker for fishing line
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
  cargoHold.position.set(0, 0.65, -0.5);
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
  root.userData.gradientMap = gradientMap;

  return root;
}

function add(parent, mesh, outlineScale = 1.08) {
  parent.add(mesh);
  addOutline(mesh, outlineScale);
  return mesh;
}

/** Cream low-poly sail with thickness — no inverse-hull (avoids black sail bug) */
function makeFacetedSail(mat) {
  const g = new THREE.Group();
  // Mast edge at x=0, boom along +X, peak at top
  const panels = [
    // main face facets (slight fold)
    [
      [0, 0, 0], [0, 3.15, 0], [1.05, 1.4, 0.08],
    ],
    [
      [0, 3.15, 0], [1.85, 0.12, 0], [1.05, 1.4, 0.08],
    ],
    [
      [0, 0, 0], [1.05, 1.4, 0.08], [1.85, 0.12, 0],
    ],
  ];
  panels.forEach((tri) => {
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array(tri.flat());
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);
    g.add(m);
  });
  // thin back panels (offset -Z)
  panels.forEach((tri) => {
    const back = tri.map(([x, y, z]) => [x, y, z - 0.06]);
    // reverse winding
    const rev = [back[0], back[2], back[1]];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(rev.flat()), 3));
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, mat));
  });
  g.rotation.y = -0.12;
  return g;
}

function addRig(root, mat, a, b) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, len, 4), mat);
  line.position.copy(mid);
  line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  root.add(line);
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
  oar.rotation.x = -amount * 0.7;
  const sail = boat.userData.sailMesh;
  if (sail) sail.rotation.y = -0.12 + amount * 0.06 * side;
}

/** Resting waterline height — water waves crest ~1m, keep hull mostly above. */
export const BOAT_WATERLINE_Y = 0.72;

export function setHullDamageVisual(boat, durability, max = 100) {
  const t = durability / max;
  boat.rotation.z = (1 - t) * 0.12 * Math.sin(performance.now() * 0.002);
  const sink = t < 0.3 ? -0.2 : t < 0.6 ? -0.08 : 0;
  boat.position.y = BOAT_WATERLINE_Y + sink;
}

/** Cast pose: t 0→1 swing from rear to forward. */
export function setRodCastPose(boat, t) {
  const rod = boat.userData.rodArm;
  const cap = boat.userData.captain;
  if (!rod) return;
  rod.visible = true;
  const u = Math.max(0, Math.min(1, t));
  // backswing → forward whip
  rod.rotation.x = -0.55 + u * 1.15;
  rod.rotation.z = -0.55 + u * 0.25;
  rod.rotation.y = -0.15 + u * 0.35;
  if (cap) {
    cap.rotation.y = -0.35 + u * 0.55;
    cap.rotation.x = -0.08 + u * 0.12;
  }
}

export function setRodWaitPose(boat) {
  const rod = boat.userData.rodArm;
  const cap = boat.userData.captain;
  if (!rod) return;
  rod.visible = true;
  rod.rotation.x = 0.35;
  rod.rotation.y = 0.15;
  rod.rotation.z = -0.35;
  if (cap) {
    cap.rotation.y = 0.2;
    cap.rotation.x = -0.05;
  }
}

export function resetRodPose(boat) {
  const rod = boat.userData.rodArm;
  const cap = boat.userData.captain;
  if (rod) {
    const r = rod.userData.restRot || { x: 0, y: 0, z: -0.4 };
    rod.rotation.set(r.x, r.y, r.z);
    rod.visible = false;
  }
  if (cap) {
    cap.rotation.x = 0;
    cap.rotation.y = 0;
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
