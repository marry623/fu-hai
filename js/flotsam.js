import * as THREE from 'three';
import { addOutline, toonMat, hash2 } from './stylekit.js';
import { rollSalvageTyped } from './salvageTables.js?v=35d';

/**
 * Floating salvage: black package / barrel / drift bottle
 */
export function createFlotsamField(gradientMap, count = 26) {
  const root = new THREE.Group();
  root.name = 'flotsam';
  const list = [];

  for (let i = 0; i < count; i++) {
    const typeRoll = hash2(i, 1);
    let type = 'package';
    if (typeRoll > 0.66) type = 'barrel';
    else if (typeRoll > 0.33) type = 'bottle';

    const obj = createFlotsam(gradientMap, i, type);
    placeFlotsam(obj, i);
    root.add(obj);
    list.push(obj);
  }

  return { root, list };
}

function facet(color, gm, opts = {}) {
  return toonMat(color, gm, { flatShading: true, ...opts });
}

function createFlotsam(gradientMap, id, type) {
  const g = new THREE.Group();
  g.name = `flotsam_${id}`;
  g.userData.id = id;
  g.userData.type = type;
  g.userData.collected = false;
  g.userData.bob = Math.random() * Math.PI * 2;

  if (type === 'package') {
    buildBlackPackage(g, gradientMap);
    g.scale.setScalar(2.85);
  } else if (type === 'barrel') {
    buildBarrel(g, gradientMap);
    g.scale.setScalar(1.375);
  } else {
    buildDriftBottle(g, gradientMap);
    g.scale.setScalar(1.3);
  }

  return g;
}

/** Faceted black parcel with cross cord + knot */
function buildBlackPackage(g, gm) {
  const black = facet(0x141416, gm);
  const shade = facet(0x2a2a30, gm);
  const cord = facet(0x3a3a42, gm);

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.78, 0.88, 1, 1, 1), black);
  body.position.y = 0.42;
  body.rotation.y = 0.4;
  body.rotation.z = 0.05;
  g.add(body);
  addOutline(body, 1.06);

  for (const [x, y, z, s] of [
    [0.52, 0.62, 0.35, 0.16], [-0.5, 0.6, -0.32, 0.14],
    [0.45, 0.18, -0.4, 0.13], [-0.48, 0.2, 0.38, 0.15],
    [0.1, 0.78, 0.05, 0.11],
  ]) {
    const chip = new THREE.Mesh(new THREE.TetrahedronGeometry(s, 0), shade);
    chip.position.set(x * 0.75, y, z * 0.75);
    chip.rotation.set(x + y, y + z, z);
    g.add(chip);
    addOutline(chip, 1.12);
  }

  const bandA = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.07, 0.1), cord);
  bandA.position.set(0, 0.62, 0);
  bandA.rotation.y = 0.4;
  g.add(bandA);
  addOutline(bandA, 1.1);

  const bandB = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 1.05), cord);
  bandB.position.set(0, 0.63, 0);
  bandB.rotation.y = 0.4;
  g.add(bandB);
  addOutline(bandB, 1.1);

  const sideA = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.82, 0.09), cord);
  sideA.position.set(0.58, 0.42, 0);
  sideA.rotation.y = 0.4;
  g.add(sideA);

  const sideB = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.82, 0.09), cord);
  sideB.position.set(-0.58, 0.42, 0);
  sideB.rotation.y = 0.4;
  g.add(sideB);

  const knot = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), cord);
  knot.position.set(0.04, 0.76, 0.04);
  knot.rotation.y = 0.6;
  g.add(knot);
  addOutline(knot, 1.18);

  const knot2 = new THREE.Mesh(new THREE.TetrahedronGeometry(0.11, 0), shade);
  knot2.position.set(-0.1, 0.72, -0.06);
  g.add(knot2);
}

/** Wood barrel with hoops */
function buildBarrel(g, gm) {
  const wood = toonMat(0xa05a28, gm, { flatShading: true });
  const woodDark = toonMat(0x7a4420, gm, { flatShading: true });
  const iron = toonMat(0x222226, gm, { flatShading: true });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.62, 1.05, 8), wood);
  body.position.y = 0.55;
  body.rotation.z = Math.PI / 2;
  g.add(body);
  addOutline(body, 1.08);

  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.08, 8), woodDark);
  lid.position.set(0.52, 0.55, 0);
  lid.rotation.z = Math.PI / 2;
  g.add(lid);
  addOutline(lid, 1.1);

  for (const t of [-0.28, 0, 0.28]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.055, 4, 10), iron);
    band.position.set(t, 0.55, 0);
    band.rotation.y = Math.PI / 2;
    g.add(band);
    addOutline(band, 1.12);
  }
}

/** Glass drift bottle with parchment + cork (lying on side) */
function buildDriftBottle(g, gm) {
  const glass = new THREE.MeshToonMaterial({
    color: 0x9adce0,
    gradientMap: gm,
    transparent: true,
    opacity: 0.5,
    flatShading: true,
    depthWrite: false,
  });
  const glassDeep = facet(0x5eb0b8, gm);
  const cork = facet(0x8a5a32, gm);
  const paper = facet(0xe8d4a8, gm);
  const cord = facet(0x6a4428, gm);

  const bottle = new THREE.Group();
  bottle.rotation.z = -1.05;
  bottle.rotation.y = 0.35;
  bottle.position.set(0.05, 0.55, 0);
  g.add(bottle);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.95, 7), glass);
  body.position.y = 0;
  bottle.add(body);
  addOutline(body, 1.07);

  const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.28, 0.22, 6), glass);
  shoulder.position.y = 0.55;
  bottle.add(shoulder);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.32, 6), glassDeep);
  neck.position.y = 0.8;
  bottle.add(neck);
  addOutline(neck, 1.1);

  const corkMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.18, 6), cork);
  corkMesh.position.y = 1.05;
  bottle.add(corkMesh);
  addOutline(corkMesh, 1.14);

  const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.55, 6), paper);
  scroll.rotation.z = Math.PI / 2;
  scroll.position.set(0.02, -0.05, 0);
  bottle.add(scroll);
  addOutline(scroll, 1.08);

  for (const x of [-0.12, 0.12]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.018, 4, 8), cord);
    band.rotation.y = Math.PI / 2;
    band.position.set(x, -0.05, 0);
    bottle.add(band);
  }

  const shine = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 5, 4),
    new THREE.MeshBasicMaterial({
      color: 0xe8fffc,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    })
  );
  shine.position.set(0.16, 0.12, 0.18);
  shine.userData.skipOutline = true;
  bottle.add(shine);
}

function placeFlotsam(obj, i) {
  const z = 30 + hash2(i, 7) * 200;
  const x = (hash2(i, 3) - 0.5) * 50;
  obj.position.set(x, 0, z);
  obj.visible = true;
  obj.userData.collected = false;
}

export function updateFlotsam(list, time) {
  for (const p of list) {
    if (!p.visible || p.userData.collected) continue;
    p.position.y = 0.25 + Math.sin(time * 1.5 + p.userData.bob) * 0.18;
    p.rotation.y += 0.003;
  }
}

export function findNearestFlotsam(list, pos, radius = 7) {
  let best = null;
  let bestD = radius;
  for (const p of list) {
    if (!p.visible || p.userData.collected) continue;
    const d = typeof pos.distanceTo === 'function'
      ? pos.distanceTo(p.position)
      : Math.hypot(p.position.x - pos.x, p.position.z - pos.z);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best ? { item: best, dist: bestD } : null;
}

export function respawnFlotsam(obj, index) {
  placeFlotsam(obj, index + (Date.now() % 1000));
  obj.userData.collected = false;
  obj.visible = true;
}

/**
 * Resolve salvage outcome by flotsam type + zone.
 * @returns {{ type: string, ... }}
 */
export function rollSalvage(flotsamType, zoneId = 0) {
  return rollSalvageTyped(flotsamType, zoneId);
}
