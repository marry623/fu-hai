import * as THREE from 'three';
import { addOutline, toonMat } from './stylekit.js';

const SLOT_KEYS = ['bow', 'stern', 'sideL', 'sideR', 'keel', 'sail'];
/** Bump when hull/sail mesh layout changes so setBoatVariant rebuilds same boatId. */
export const HULL_REV = 'sail-v3';

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

  // Captain — low-poly chibi girl (concept match)
  const captain = makeChibiCaptain(gradientMap);
  captain.position.set(0.05, 0.48, 0.4);
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

  return root;
}

/** Swap hull/sail look in-place (keeps captain, mounts, oars). */
export function setBoatVariant(boat, boatId) {
  const id = boatId || 'raft';
  if (!boat?.userData?.hullGroup) return boat;
  if (boat.userData.boatId === id && boat.userData.hullRev === HULL_REV) return boat;
  const gm = boat.userData.gradientMap;
  const hull = boat.userData.hullGroup;
  while (hull.children.length) {
    const c = hull.children[0];
    hull.remove(c);
    c.traverse((o) => {
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
  if (boatId === 'heavyRaft') buildHeavyRaftHull(hull, root, gm);
  else if (boatId === 'chargeBoat') buildChargeBoatHull(hull, root, gm);
  else buildRaftHull(hull, root, gm); // 木筏 / 低阶船
}

/** 木筏 = 低阶船：单桅三角帆 + 甲板木箱（无旗） */
function buildRaftHull(hull, root, gm) {
  const wood = toonMat(0x9a6a3a, gm, { flatShading: true });
  const woodDark = toonMat(0x6a4420, gm, { flatShading: true });
  const woodDeep = toonMat(0x4a2e14, gm, { flatShading: true });
  const sailMat = new THREE.MeshToonMaterial({
    color: 0xf5f0e4, gradientMap: gm, side: THREE.DoubleSide, flatShading: true,
  });
  const crate = toonMat(0x7a5028, gm, { flatShading: true });

  // Tapered hull (bow = -Z)
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.58, 3.6, 1, 1, 1), wood);
  body.position.set(0, 0.06, 0.15);
  add(hull, body, 1.04);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.2, 5), woodDark);
  bow.rotation.x = Math.PI / 2;
  bow.position.set(0, 0.08, -2.05);
  bow.scale.set(1, 1.05, 0.72);
  add(hull, bow, 1.05);
  for (const side of [-1, 1]) {
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 3.2), woodDeep);
    gun.position.set(side * 0.74, 0.38, 0.12);
    gun.rotation.z = side * -0.1;
    add(hull, gun, 1.08);
  }
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 3.1), wood);
  deck.position.set(0, 0.38, 0.15);
  add(hull, deck, 1.05);
  const stern = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.55, 0.2), woodDark);
  stern.position.set(0, 0.12, 2.0);
  add(hull, stern, 1.06);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 3.8, 6), woodDeep);
  mast.position.set(0, 2.3, -0.05);
  add(hull, mast, 1.07);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 2.1, 5), woodDeep);
  boom.rotation.z = Math.PI / 2;
  boom.position.set(0.45, 1.55, 0.05);
  add(hull, boom, 1.1);

  const sail = makeFacetedSail(sailMat);
  sail.scale.set(0.85, 0.88, 0.85);
  // Faceted sail local peak ~3.15 → hang high on mast (mast top ≈ 4.2)
  sail.position.set(0.06, 1.55, -0.02);
  sail.rotation.x = 0.18;
  hull.add(sail);
  root.userData.sailMesh = sail;

  // Deck crates
  const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.42), crate);
  c1.position.set(-0.32, 0.6, 1.05);
  add(hull, c1, 1.08);
  const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.34), woodDark);
  c2.position.set(0.35, 0.56, 1.25);
  add(hull, c2, 1.08);
}

/** Thin rectangular sail in X–Y plane; slight aft lean (still reads from top-down). */
function makeRectSail(mat, width, height) {
  const s = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.06, 1, 1, 1), mat);
  return s;
}

/** Mild tilt — large tilt made sails look parked on the deck. */
const SAIL_TILT_X = 0.2;

function placeTiltedSail(mesh, x, y, z, tiltX = SAIL_TILT_X) {
  mesh.position.set(x, y, z);
  mesh.rotation.x = tiltX;
  return mesh;
}

/** Sail center Y so the cloth hangs on the upper mast (top near mast tip). */
function sailCenterY(mastBaseY, mastH, sailH) {
  const mastTop = mastBaseY + mastH;
  return mastTop - sailH * 0.42;
}

/** 重筏：双桅 + 两张长方形帆 */
function buildHeavyRaftHull(hull, root, gm) {
  const wood = toonMat(0x6a4528, gm, { flatShading: true });
  const woodDark = toonMat(0x4a3018, gm, { flatShading: true });
  const trim = toonMat(0x2f6bb8, gm, { flatShading: true });
  const sailMat = new THREE.MeshToonMaterial({
    color: 0xf4f0e6, gradientMap: gm, side: THREE.DoubleSide, flatShading: true,
  });
  const stripe = toonMat(0x2f6bb8, gm, { flatShading: true });
  const mastC = toonMat(0x3e2a16, gm, { flatShading: true });
  const cabinC = toonMat(0x8a5c30, gm, { flatShading: true });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.72, 4.5, 1, 1, 1), wood);
  body.position.set(0, 0.08, 0.1);
  add(hull, body, 1.04);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.35, 5), woodDark);
  bow.rotation.x = Math.PI / 2;
  bow.position.set(0, 0.1, -2.55);
  bow.scale.set(1, 1, 0.7);
  add(hull, bow, 1.05);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.16, 4.55), trim);
  rail.position.set(0, 0.5, 0.1);
  add(hull, rail, 1.05);
  for (const side of [-1, 1]) {
    const sideBlue = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 4.0), trim);
    sideBlue.position.set(side * 1.0, 0.28, 0.1);
    add(hull, sideBlue, 1.08);
  }
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.1, 3.9), wood);
  deck.position.set(0, 0.48, 0.1);
  add(hull, deck, 1.05);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 1.0), cabinC);
  cabin.position.set(0, 0.88, 1.65);
  add(hull, cabin, 1.05);
  const cabinRoof = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 1.1), woodDark);
  cabinRoof.position.set(0, 1.25, 1.65);
  add(hull, cabinRoof, 1.08);

  const sails = new THREE.Group();
  hull.add(sails);
  const mastZs = [-0.85, 0.65];
  const mastBase = 0.55;
  mastZs.forEach((z, i) => {
    const mh = i === 0 ? 4.0 : 3.5;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, mh, 6), mastC);
    mast.position.set(0, mastBase + mh * 0.5, z);
    add(hull, mast, 1.07);

    const sw = i === 0 ? 1.85 : 1.55;
    const sh = i === 0 ? 2.4 : 2.05;
    const cy = sailCenterY(mastBase, mh, sh);
    // Boom across lower third of sail
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 1.9, 5), mastC);
    boom.rotation.z = Math.PI / 2;
    boom.position.set(0.55, cy - sh * 0.28, z);
    add(hull, boom, 1.1);

    const s = makeRectSail(sailMat, sw, sh);
    placeTiltedSail(s, sw * 0.5 + 0.05, cy, z);
    add(sails, s, 1.02);
    // Blue vertical stripe on sail face
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.28, sh * 0.92, 0.08), stripe);
    placeTiltedSail(st, sw * 0.5 + 0.08, cy, z + 0.02);
    add(sails, st, 1.02);
  });
  root.userData.sailMesh = sails;

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.42, 8), cabinC);
  barrel.position.set(0.55, 0.72, 0.35);
  add(hull, barrel, 1.08);
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 0.38), woodDark);
  crate.position.set(-0.5, 0.7, 0.5);
  add(hull, crate, 1.08);
}

/** 冲锋船：三桅 + 三张长方形紫帆 */
function buildChargeBoatHull(hull, root, gm) {
  const hullC = toonMat(0x1c1220, gm, { flatShading: true });
  const purple = toonMat(0x4a2068, gm, { flatShading: true });
  const gold = toonMat(0xd4a020, gm, { flatShading: true });
  const sailMat = new THREE.MeshToonMaterial({
    color: 0x5a2a7a, gradientMap: gm, side: THREE.DoubleSide, flatShading: true,
  });
  const mastC = toonMat(0x2a1c14, gm, { flatShading: true });
  const window = toonMat(0xffe08a, gm, { flatShading: true });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.85, 4.8, 1, 1, 1), hullC);
  body.position.set(0, 0.12, 0.1);
  add(hull, body, 1.04);
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 4.2), purple);
    panel.position.set(side * 1.05, 0.35, 0.1);
    add(hull, panel, 1.07);
  }
  const goldRail = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.12, 4.85), gold);
  goldRail.position.set(0, 0.58, 0.1);
  add(hull, goldRail, 1.05);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.1, 4.3), hullC);
  deck.position.set(0, 0.55, 0.1);
  add(hull, deck, 1.05);

  const stern1 = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.85, 1.15), purple);
  stern1.position.set(0, 0.95, 1.9);
  add(hull, stern1, 1.04);
  const stern2 = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.55, 0.85), hullC);
  stern2.position.set(0, 1.55, 2.0);
  add(hull, stern2, 1.05);
  const sternGold = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 1.2), gold);
  sternGold.position.set(0, 1.4, 1.9);
  add(hull, sternGold, 1.08);
  for (const [sx, sy] of [[-0.35, 1.0], [0.35, 1.0], [-0.35, 1.25], [0.35, 1.25]]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.06), window);
    w.position.set(sx, sy, 2.5);
    add(hull, w, 1.2);
  }
  for (const side of [-1, 1]) {
    const lan = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 4), window);
    lan.position.set(side * 0.7, 1.7, 2.15);
    add(hull, lan, 1.15);
  }

  const figure = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.95, 5), gold);
  figure.rotation.x = Math.PI / 2;
  figure.position.set(0, 0.45, -2.7);
  add(hull, figure, 1.08);
  const jaw = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 4), gold);
  jaw.rotation.x = Math.PI / 2;
  jaw.position.set(0, 0.28, -3.15);
  add(hull, jaw, 1.12);

  const sails = new THREE.Group();
  hull.add(sails);
  const mastBase = 0.6;
  const masts = [
    { z: -1.15, h: 4.0, sw: 1.7, sh: 2.15 },
    { z: 0.05, h: 4.3, sw: 1.85, sh: 2.35 },
    { z: 1.2, h: 3.6, sw: 1.55, sh: 1.95 },
  ];
  masts.forEach((m) => {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, m.h, 6), mastC);
    mast.position.set(0, mastBase + m.h * 0.5, m.z);
    add(hull, mast, 1.06);

    const cy = sailCenterY(mastBase, m.h, m.sh);
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, m.sw + 0.15, 5), mastC);
    boom.rotation.z = Math.PI / 2;
    boom.position.set(m.sw * 0.45, cy - m.sh * 0.28, m.z);
    add(hull, boom, 1.1);

    const s = makeRectSail(sailMat, m.sw, m.sh);
    placeTiltedSail(s, m.sw * 0.5 + 0.05, cy, m.z);
    add(sails, s, 1.02);
    const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), gold);
    placeTiltedSail(crest, m.sw * 0.5 + 0.08, cy + m.sh * 0.12, m.z + 0.05);
    add(sails, crest, 1.15);
  });
  root.userData.sailMesh = sails;
}

function add(parent, mesh, outlineScale = 1.08) {
  parent.add(mesh);
  addOutline(mesh, outlineScale);
  return mesh;
}

/** Faceted toon mat for chibi captain */
function facetMat(color, gm) {
  return toonMat(color, gm, { flatShading: true });
}

/**
 * Low-poly chibi girl: big head, brown hair + cream bow,
 * cream blouse, long peach skirt to the feet, brown shoes.
 */
function makeChibiCaptain(gm) {
  const g = new THREE.Group();
  g.name = 'chibiCaptain';

  const skin = facetMat(0xffd5bc, gm);
  const hair = facetMat(0x4a3428, gm);
  const hairDark = facetMat(0x3a281c, gm);
  const cream = facetMat(0xf3ebe0, gm);
  const bow = facetMat(0xf0e6d4, gm);
  const skirt = facetMat(0xe8b4a4, gm);
  const shoe = facetMat(0x3a2818, gm);
  const eyeWhite = facetMat(0xfff8f0, gm);
  const eyeIris = facetMat(0x5c3a28, gm);
  const lip = facetMat(0xe89088, gm);

  // —— Feet (shoes peek under long skirt) ——
  for (const side of [-1, 1]) {
    const shoeM = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.2, 1, 1, 1), shoe);
    shoeM.position.set(side * 0.11, 0.04, 0.02);
    add(g, shoeM, 1.12);
  }

  // —— Skirt to the floor: truncated cone — thicker waist, wider hem (not a sharp tip)
  // CylinderGeometry(radiusTop, radiusBottom, height) — top=waist, bottom=hem
  const skirtMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, 0.78, 8), skirt);
  skirtMesh.position.y = 0.42; // hem ~0.03, waist ~0.81
  add(g, skirtMesh, 1.05);
  const skirtWaist = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.1, 6), skirt);
  skirtWaist.position.y = 0.84;
  add(g, skirtWaist, 1.08);

  // —— Torso / blouse ——
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.32, 6), cream);
  torso.position.y = 0.95;
  add(g, torso, 1.07);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 4, 8), cream);
  collar.position.y = 1.12;
  collar.rotation.x = Math.PI / 2;
  add(g, collar, 1.15);
  const neckBow = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 4), bow);
  neckBow.position.set(0, 1.09, 0.13);
  neckBow.rotation.x = Math.PI / 2;
  add(g, neckBow, 1.2);

  // Arms
  for (const side of [-1, 1]) {
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.22, 5), cream);
    upper.position.set(side * 0.22, 0.96, 0);
    upper.rotation.z = side * 0.35;
    add(g, upper, 1.12);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 5, 4), skin);
    hand.position.set(side * 0.3, 0.82, 0.02);
    add(g, hand, 1.15);
  }

  // —— Head (oversized chibi) ——
  const head = new THREE.Group();
  head.position.y = 1.38;
  g.add(head);

  const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), skin);
  skull.scale.set(0.95, 1.05, 0.9);
  add(head, skull, 1.05);

  // Eyes
  for (const side of [-1, 1]) {
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), eyeWhite);
    white.position.set(side * 0.09, 0.02, 0.22);
    white.scale.set(1, 1.15, 0.6);
    add(head, white, 1.2);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.038, 5, 4), eyeIris);
    iris.position.set(side * 0.09, 0.015, 0.27);
    add(head, iris, 1.25);
    const highlight = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 3), facetMat(0xffffff, gm));
    highlight.position.set(side * 0.075, 0.035, 0.3);
    head.add(highlight);
  }

  // Mouth (small open)
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), lip);
  mouth.position.set(0, -0.08, 0.24);
  mouth.scale.set(1.1, 0.7, 0.5);
  add(head, mouth, 1.2);

  // Hair dome
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 7, 5), hair);
  hairCap.position.y = 0.06;
  hairCap.scale.set(1.05, 0.95, 1.0);
  add(head, hairCap, 1.04);

  // Bangs
  for (let i = -2; i <= 2; i++) {
    const bang = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 4), hair);
    bang.position.set(i * 0.07, 0.12, 0.22);
    bang.rotation.x = 0.9;
    bang.rotation.z = i * 0.12;
    add(head, bang, 1.15);
  }

  // Long side / back hair
  for (const side of [-1, 1]) {
    const sideHair = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.55, 5), hair);
    sideHair.position.set(side * 0.22, -0.15, -0.05);
    sideHair.rotation.z = side * 0.25;
    sideHair.rotation.x = 0.15;
    add(head, sideHair, 1.06);
  }
  const backHair = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 6), hairDark);
  backHair.position.set(0, -0.25, -0.18);
  backHair.rotation.x = -0.2;
  add(head, backHair, 1.05);
  // Wave tips
  for (const [sx, sy] of [[-0.18, -0.55], [0.16, -0.6], [0, -0.7]]) {
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 5, 4), hair);
    tip.position.set(sx, sy, -0.12);
    tip.scale.set(1.2, 0.7, 0.9);
    add(head, tip, 1.1);
  }

  // Cream bow on right side of head (viewer left ≈ character right)
  const bowL = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 4), bow);
  bowL.position.set(-0.26, 0.12, 0.05);
  bowL.rotation.z = 0.9;
  add(head, bowL, 1.18);
  const bowR = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 4), bow);
  bowR.position.set(-0.22, 0.08, 0.08);
  bowR.rotation.z = -0.7;
  add(head, bowR, 1.18);
  const bowKnot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), bow);
  bowKnot.position.set(-0.24, 0.1, 0.08);
  add(head, bowKnot, 1.2);

  // Face slightly toward bow / camera
  g.rotation.y = 0.35;
  g.scale.setScalar(0.92);
  return g;
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
