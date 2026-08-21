/** Low-poly monster meshes for combat + bestiary portraits */

import * as THREE from 'three';
import { addOutline, toonMat, ensureOutlineMaterials } from './stylekit.js?v=34a';
import { resolveMonsterId, monsterHp } from './monsterCatalog.js?v=31g';

function addPart(g, mesh, outlineScale = 1.08) {
  g.add(mesh);
  addOutline(mesh, outlineScale);
  return mesh;
}

function splash(g, gm, scale = 1) {
  const splashG = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const shard = new THREE.Mesh(
      new THREE.ConeGeometry(0.28 * scale, 0.7 * scale, 4),
      toonMat(i % 2 ? 0xe8f8ff : 0xb8e8f8, gm)
    );
    const a = (i / 6) * Math.PI * 2;
    shard.position.set(Math.cos(a) * 1.0 * scale, 0.15, Math.sin(a) * 1.0 * scale);
    shard.rotation.z = Math.cos(a) * 0.7;
    addPart(splashG, shard, 1.15);
  }
  g.add(splashG);
}

export function makeWoodUrchin(gm) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 0), toonMat(0x4a3020, gm));
  addPart(g, core, 1.06);
  for (let i = 0; i < 18; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.85, 4), toonMat(i % 2 ? 0x6a4030 : 0x3a2060, gm));
    const phi = Math.acos(2 * (i / 18) - 1);
    const th = Math.PI * (1 + 5 ** 0.5) * i;
    spike.position.set(
      Math.sin(phi) * Math.cos(th) * 0.85,
      Math.cos(phi) * 0.85,
      Math.sin(phi) * Math.sin(th) * 0.85
    );
    spike.lookAt(0, 0, 0);
    spike.rotateX(Math.PI);
    addPart(g, spike, 1.12);
  }
  splash(g, gm, 0.9);
  return g;
}

export function makeBarnacle(gm, lava = false) {
  const g = new THREE.Group();
  const rock = lava ? 0xc45c1a : 0x5a6a58;
  const tip = lava ? 0xff9040 : 0x7a8a70;
  for (let i = 0; i < 5; i++) {
    const vol = new THREE.Mesh(new THREE.ConeGeometry(0.45 - i * 0.04, 0.7, 5), toonMat(rock, gm));
    const a = (i / 5) * Math.PI * 2;
    vol.position.set(Math.cos(a) * 0.55, 0.35, Math.sin(a) * 0.55);
    addPart(g, vol, 1.08);
    const mouth = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.35, 5), toonMat(tip, gm));
    mouth.position.copy(vol.position);
    mouth.position.y += 0.4;
    addPart(g, mouth, 1.12);
  }
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.25, 0.35, 6), toonMat(0x3a4038, gm));
  base.position.y = 0.1;
  addPart(g, base, 1.05);
  if (lava) {
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.25, 5, 4), toonMat(0xffe080, gm));
    glow.position.y = 0.9;
    addPart(g, glow, 1.2);
  }
  return g;
}

export function makeSawShark(gm) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.8, 6), toonMat(0x5a6570, gm));
  body.rotation.x = -Math.PI / 2;
  body.position.z = 0.2;
  addPart(g, body, 1.05);
  const saw = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.35, 1.8), toonMat(0xc0c8d0, gm));
  saw.position.set(0, 0.15, 1.7);
  addPart(g, saw, 1.1);
  for (let i = 0; i < 8; i++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 3), toonMat(0xf0f4f8, gm));
    tooth.position.set(0, 0.28, 1.1 + i * 0.18);
    tooth.rotation.x = -Math.PI / 2;
    addPart(g, tooth, 1.2);
  }
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.9, 4), toonMat(0x4a5560, gm));
  fin.position.set(0, 0.7, 0);
  addPart(g, fin, 1.1);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 4), toonMat(0xffe566, gm));
    eye.position.set(s * 0.35, 0.25, 0.9);
    addPart(g, eye, 1.2);
  }
  splash(g, gm, 1.1);
  return g;
}

export function makeBladeCrab(gm) {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.7, 6, 4), toonMat(0x3a5a38, gm));
  shell.scale.set(1.3, 0.7, 1.1);
  shell.position.y = 0.45;
  addPart(g, shell, 1.06);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.9), toonMat(0x2a4028, gm));
    leg.position.set(s * 0.7, 0.2, 0.1);
    leg.rotation.y = s * 0.4;
    addPart(g, leg, 1.1);
  }
  const claw = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 1.4), toonMat(0xb0b8c0, gm));
  claw.position.set(0.9, 0.45, 0.6);
  claw.rotation.y = -0.5;
  addPart(g, claw, 1.08);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 4), toonMat(0xd0d8e0, gm));
  tip.rotation.x = Math.PI / 2;
  tip.position.set(1.35, 0.45, 1.2);
  addPart(g, tip, 1.15);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 4), toonMat(0xff9040, gm));
  eye.position.set(0.2, 0.7, 0.55);
  addPart(g, eye, 1.2);
  splash(g, gm, 0.85);
  return g;
}

export function makeSporeJelly(gm) {
  const g = new THREE.Group();
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.85, 7, 5), toonMat(0xb890e0, gm));
  bell.scale.set(1.2, 0.7, 1.2);
  bell.position.y = 1.2;
  addPart(g, bell, 1.05);
  for (let i = 0; i < 8; i++) {
    const tent = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 1.6, 4), toonMat(0x8a60c0, gm));
    const a = (i / 8) * Math.PI * 2;
    tent.position.set(Math.cos(a) * 0.45, 0.35, Math.sin(a) * 0.45);
    addPart(g, tent, 1.15);
  }
  for (let i = 0; i < 6; i++) {
    const spore = new THREE.Mesh(new THREE.SphereGeometry(0.1, 4, 3), toonMat(0xd8a0ff, gm));
    spore.position.set((i % 3 - 1) * 0.5, 1.5 + (i % 2) * 0.3, ((i / 3) | 0) * 0.4 - 0.2);
    addPart(g, spore, 1.2);
  }
  return g;
}

export function makeGhostHook(gm) {
  const g = new THREE.Group();
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 2.2, 5), toonMat(0x9ad0e0, gm));
  arm.position.y = 1.2;
  arm.rotation.z = 0.35;
  addPart(g, arm, 1.06);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.35, 5, 4), toonMat(0xb8e0f0, gm));
  hand.position.set(0.5, 0.35, 0);
  addPart(g, hand, 1.08);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.08, 5, 10, Math.PI * 1.3), toonMat(0x2a2a30, gm));
  hook.rotation.y = Math.PI / 2;
  hook.position.set(0.7, 0.1, 0.15);
  addPart(g, hook, 1.12);
  for (let i = 0; i < 4; i++) {
    const weed = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.7, 3), toonMat(0x5a8a70, gm));
    weed.position.set(-0.1 + i * 0.08, 1.8 - i * 0.15, 0.2);
    weed.rotation.z = 0.5;
    addPart(g, weed, 1.15);
  }
  return g;
}

export function makeThiefOtter(gm) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 6, 5), toonMat(0x8a6040, gm));
  body.scale.set(1.1, 0.9, 1.4);
  body.position.y = 0.55;
  addPart(g, body, 1.06);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 5), toonMat(0xa07850, gm));
  head.position.set(0, 0.95, 0.55);
  addPart(g, head, 1.08);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.35, 5, 4), toonMat(0xe8d0b0, gm));
  belly.position.set(0, 0.45, 0.25);
  addPart(g, belly, 1.1);
  const fish = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.55, 4), toonMat(0xff90b0, gm));
  fish.rotation.z = Math.PI / 2;
  fish.position.set(0.35, 0.7, 0.7);
  addPart(g, fish, 1.15);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 4, 3), toonMat(0x1a1008, gm));
    eye.position.set(s * 0.15, 1.0, 0.8);
    addPart(g, eye, 1.2);
  }
  splash(g, gm, 0.7);
  return g;
}

export function makeInkJelly(gm) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.75, 6, 5), toonMat(0x1a1228, gm));
  body.position.y = 0.9;
  addPart(g, body, 1.05);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 5, 4), toonMat(0xffffff, gm));
    eye.position.set(s * 0.28, 1.0, 0.55);
    addPart(g, eye, 1.2);
  }
  for (let i = 0; i < 7; i++) {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.12, 4, 3), toonMat(0x0a0814, gm));
    drop.position.set((i % 3 - 1) * 0.4, 0.2 + (i % 2) * 0.3, ((i / 3) | 0) * 0.35 - 0.2);
    addPart(g, drop, 1.15);
  }
  return g;
}

export function makeLightningSnake(gm) {
  const g = new THREE.Group();
  const neck = new THREE.Group();
  g.add(neck);
  g.userData.neck = neck;
  const segs = [[0, 0.8, -0.5, 0.7], [0, 1.8, 0.1, 0.6], [0, 2.8, 0.5, 0.5], [0, 3.6, 0.9, 0.42]];
  segs.forEach(([x, y, z, r], i) => {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 5), toonMat(0x2a3a6a, gm));
    seg.position.set(x, y, z);
    addPart(neck, seg, 1.05);
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.45, 4), toonMat(0xd4a020, gm));
    spike.position.set(x, y + r * 0.8, z);
    addPart(neck, spike, 1.15);
    if (i === segs.length - 1) {
      const muzzle = new THREE.Object3D();
      muzzle.position.set(0, y, z + 0.6);
      neck.add(muzzle);
      g.userData.muzzle = muzzle;
    }
  });
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.9, 5), toonMat(0x2a3a6a, gm));
  head.rotation.x = -Math.PI / 2;
  head.position.set(0, 3.9, 1.3);
  addPart(neck, head, 1.06);
  for (let i = 0; i < 4; i++) {
    const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), toonMat(0xffe566, gm));
    spark.position.set((i % 2 - 0.5) * 0.4, 2.5 + i * 0.3, 0.3);
    addPart(g, spark, 1.2);
  }
  splash(g, gm, 1.0);
  return g;
}

export function makeVoidOctopus(gm) {
  const g = new THREE.Group();
  g.userData.arms = [];
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.9, 7, 6), toonMat(0x5a2a7a, gm));
  head.position.y = 1.2;
  addPart(g, head, 1.05);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.7, 5), toonMat(0xc02030, gm));
  hat.position.y = 2.0;
  addPart(g, hat, 1.1);
  const patch = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.05), toonMat(0x1a1008, gm));
  patch.position.set(-0.28, 1.3, 0.75);
  addPart(g, patch, 1.2);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 5, 4), toonMat(0xffe566, gm));
  eye.position.set(0.28, 1.3, 0.75);
  addPart(g, eye, 1.2);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.9), toonMat(0xc0c8d0, gm));
  blade.position.set(0.9, 0.8, 0.4);
  addPart(g, blade, 1.12);
  for (let i = 0; i < 6; i++) {
    const arm = new THREE.Group();
    const a = (i / 6) * Math.PI * 2;
    arm.position.set(Math.cos(a) * 0.6, 0.6, Math.sin(a) * 0.6);
    for (let s = 0; s < 4; s++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.12 - s * 0.02, 0.1 - s * 0.02, 0.45, 5), toonMat(0x3a1860, gm));
      seg.position.y = -s * 0.4;
      addPart(arm, seg, 1.1);
    }
    g.add(arm);
    g.userData.arms.push(arm);
  }
  splash(g, gm, 1.0);
  return g;
}

export function makeWaveWhale(gm) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.2, 7, 5), toonMat(0x3a5a8a, gm));
  body.scale.set(1.6, 1.0, 2.4);
  body.position.y = 0.7;
  addPart(g, body, 1.04);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.4, 5), toonMat(0x2a4a7a, gm));
  tail.rotation.x = Math.PI / 2;
  tail.position.set(0, 0.5, -2.2);
  addPart(g, tail, 1.06);
  for (let i = 0; i < 5; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), toonMat(0x6a7078, gm));
    rock.position.set((i - 2) * 0.35, 1.3, -0.2 + i * 0.15);
    addPart(g, rock, 1.12);
  }
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.15, 5, 4), toonMat(0xffe566, gm));
  eye.position.set(0.7, 0.85, 1.5);
  addPart(g, eye, 1.2);
  splash(g, gm, 1.4);
  return g;
}

export function makeTrenchWorm(gm) {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.7 - i * 0.05, 0.75 - i * 0.05, 0.7, 7), toonMat(0x4a2060, gm));
    seg.position.set(0, 0.5 + i * 0.55, -i * 0.15);
    addPart(g, seg, 1.05);
  }
  const maw = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.18, 6, 12), toonMat(0x2a1030, gm));
  maw.rotation.x = Math.PI / 2;
  maw.position.set(0, 3.2, 0.2);
  addPart(g, maw, 1.08);
  for (let i = 0; i < 10; i++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.35, 3), toonMat(0xf0e8e0, gm));
    const a = (i / 10) * Math.PI * 2;
    tooth.position.set(Math.cos(a) * 0.45, 3.2, 0.2 + Math.sin(a) * 0.45);
    tooth.rotation.x = Math.PI;
    addPart(g, tooth, 1.18);
  }
  const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8, 0), toonMat(0x5a5048, gm));
  rubble.position.y = 0.2;
  addPart(g, rubble, 1.05);
  return g;
}

/** Classic 巨口鲨 */
export function makeClassicShark(gm) {
  const g = new THREE.Group();
  const bodyRoot = new THREE.Group();
  g.add(bodyRoot);
  const col = 0x2a3a5a;
  const finC = 0x6a2030;
  const mouthC = 0x5a2030;
  const eyeC = 0xffe566;

  const body = new THREE.Mesh(new THREE.ConeGeometry(1.7, 4.5, 6), toonMat(col, gm));
  body.rotation.x = -Math.PI / 2;
  body.position.set(0, 0.2, 0);
  addPart(bodyRoot, body, 1.05);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.6, 5), toonMat(col, gm));
  tail.rotation.x = Math.PI / 2;
  tail.position.set(0, -0.8, -2.4);
  addPart(bodyRoot, tail, 1.05);

  const upper = new THREE.Mesh(new THREE.ConeGeometry(1.35, 1.7, 6), toonMat(col, gm));
  upper.rotation.x = -Math.PI / 2;
  upper.position.set(0, 0.45, 2.5);
  addPart(bodyRoot, upper, 1.06);

  const lower = new THREE.Mesh(new THREE.ConeGeometry(1.15, 1.35, 6), toonMat(mouthC, gm));
  lower.rotation.x = -Math.PI / 2;
  lower.position.set(0, -0.55, 2.3);
  addPart(bodyRoot, lower, 1.06);

  const cavity = new THREE.Mesh(new THREE.SphereGeometry(0.85, 6, 4), toonMat(0x7a2030, gm));
  cavity.scale.set(1, 0.7, 0.95);
  cavity.position.set(0, 0, 2.0);
  addPart(bodyRoot, cavity, 1.08);

  for (let i = 0; i < 14; i++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 4), toonMat(0xf8f4ec, gm));
    const a = (i / 14) * Math.PI * 2;
    tooth.position.set(Math.cos(a) * 0.95, Math.sin(a) * 0.65, 3.0);
    tooth.rotation.x = -Math.PI / 2;
    addPart(bodyRoot, tooth, 1.22);
  }

  for (let i = 0; i < 5; i++) {
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.05, 4), toonMat(finC, gm));
    fin.position.set(0, 1.25, 0.3 - i * 0.65);
    addPart(bodyRoot, fin, 1.1);
  }

  for (const side of [-1, 1]) {
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.6, 4), toonMat(col, gm));
    fin.position.set(side * 1.6, -0.15, 0.3);
    fin.rotation.z = side * 1.05;
    addPart(bodyRoot, fin, 1.08);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.2, 5, 4), toonMat(eyeC, gm));
    eye.position.set(side * 0.9, 0.55, 1.55);
    addPart(bodyRoot, eye, 1.2);
  }

  splash(g, gm, 1.6);
  bodyRoot.rotation.x = -0.75;
  bodyRoot.position.y = 2.6;
  return g;
}

/** Classic 冰霜海蛇 */
export function makeClassicSerpent(gm) {
  const g = new THREE.Group();
  const neck = new THREE.Group();
  g.add(neck);
  g.userData.neck = neck;
  const col = 0x4a6a7a;
  const belly = 0x8aa0a8;
  const spine = 0x7a3aa8;
  const eyeC = 0xffe566;

  const hump = new THREE.Mesh(new THREE.SphereGeometry(1.35, 6, 5), toonMat(col, gm));
  hump.scale.set(1.25, 0.75, 1.5);
  hump.position.set(0, 0.55, -2.6);
  addPart(g, hump, 1.05);

  const segs = [
    [0, 1.1, -0.7, 1.15],
    [0, 2.5, 0.15, 1.0],
    [0, 3.9, 0.7, 0.88],
    [0, 5.1, 1.15, 0.75],
  ];
  segs.forEach(([x, y, z, r]) => {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 5), toonMat(col, gm));
    seg.scale.set(1, 1.15, 1.2);
    seg.position.set(x, y, z);
    addPart(neck, seg, 1.05);
    const bel = new THREE.Mesh(new THREE.SphereGeometry(r * 0.72, 5, 4), toonMat(belly, gm));
    bel.position.set(x, y - r * 0.4, z + 0.2);
    addPart(neck, bel, 1.1);
    for (let k = 0; k < 2; k++) {
      const sp = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), toonMat(spine, gm));
      sp.position.set(x + (k - 0.5) * 0.15, y + r * 0.75, z - 0.25);
      sp.scale.set(0.6, 1.2, 0.6);
      addPart(neck, sp, 1.18);
    }
  });

  const head = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.5, 5), toonMat(col, gm));
  head.rotation.x = -Math.PI / 2;
  head.position.set(0, 5.7, 1.7);
  addPart(neck, head, 1.06);

  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.55, 4), toonMat(spine, gm));
    horn.position.set(side * 0.4, 6.25, 1.25);
    horn.rotation.z = side * 0.35;
    addPart(neck, horn, 1.18);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.18, 5, 4), toonMat(eyeC, gm));
    eye.position.set(side * 0.38, 5.75, 2.0);
    addPart(neck, eye, 1.22);
  }

  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), toonMat(0x9ad8ff, gm));
  orb.position.set(0, 5.7, 2.55);
  addPart(neck, orb, 1.15);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 5.7, 2.7);
  neck.add(muzzle);
  g.userData.muzzle = muzzle;

  splash(g, gm, 1.35);
  return g;
}

/** Classic 触手海怪 */
export function makeClassicKraken(gm) {
  const g = new THREE.Group();
  g.userData.arms = [];
  const col = 0x5a2a8a;
  const dark = 0x3a1860;
  const eyeC = 0xffe566;

  const head = new THREE.Mesh(new THREE.SphereGeometry(1.9, 7, 6), toonMat(col, gm));
  head.scale.set(1.25, 1.1, 1.2);
  head.position.y = 2.5;
  addPart(g, head, 1.05);

  const mantle = new THREE.Mesh(new THREE.SphereGeometry(1.1, 6, 5), toonMat(dark, gm));
  mantle.scale.set(1.15, 0.75, 1);
  mantle.position.set(0, 3.55, -0.25);
  addPart(g, mantle, 1.06);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.48, 6, 5), toonMat(eyeC, gm));
    eye.position.set(side * 0.7, 2.55, 1.45);
    addPart(g, eye, 1.12);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.18, 5, 4), toonMat(0x1a1020, gm));
    pupil.position.set(side * 0.7, 2.55, 1.85);
    g.add(pupil);
  }

  for (let i = 0; i < 8; i++) {
    const arm = new THREE.Group();
    const a = (i / 8) * Math.PI * 2;
    arm.position.set(Math.cos(a) * 1.0, 1.15, Math.sin(a) * 1.0);
    arm.rotation.y = a + Math.PI * 0.5;
    arm.rotation.z = 0.95;
    let y = 0;
    for (let s = 0; s < 6; s++) {
      const r = 0.48 - s * 0.055;
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(r * 0.7, r, 0.8, 5),
        toonMat(s % 2 ? dark : col, gm)
      );
      const curl = s * 0.32;
      seg.position.set(Math.sin(curl) * 0.4, y, Math.cos(curl) * 0.25 + s * 0.1);
      seg.rotation.x = 0.5 + s * 0.16;
      addPart(arm, seg, 1.07);
      y += 0.65;
    }
    g.add(arm);
    g.userData.arms.push(arm);
  }

  splash(g, gm, 1.5);
  return g;
}

const BUILDERS = {
  woodUrchin: makeWoodUrchin,
  barnacle: (gm) => makeBarnacle(gm, false),
  lavaBarnacle: (gm) => makeBarnacle(gm, true),
  sawShark: makeSawShark,
  bladeCrab: makeBladeCrab,
  sporeJelly: makeSporeJelly,
  ghostHook: makeGhostHook,
  thiefOtter: makeThiefOtter,
  inkJelly: makeInkJelly,
  lightningSnake: makeLightningSnake,
  voidOctopus: makeVoidOctopus,
  waveWhale: makeWaveWhale,
  trenchWorm: makeTrenchWorm,
  shark: makeClassicShark,
  serpent: makeClassicSerpent,
  kraken: makeClassicKraken,
};

/** Base display scales — bumped for in-world readability */
const MESH_SCALE = {
  waveWhale: 0.94,
  trenchWorm: 0.85,
  lightningSnake: 0.94,
  voidOctopus: 1.1,
  sawShark: 1.17,
  woodUrchin: 1.24,
  shark: 0.94,
  serpent: 0.88,
  kraken: 0.72,
  bladeCrab: 1.17,
  sporeJelly: 1.17,
  ghostHook: 1.17,
  thiefOtter: 1.17,
  inkJelly: 1.17,
  barnacle: 1.17,
  lavaBarnacle: 1.17,
};

export function createMonsterMesh(monsterId, gm) {
  const id = resolveMonsterId(monsterId);
  const build = BUILDERS[id] || makeSawShark;
  const g = build(gm);
  g.userData.catalogId = id;
  g.scale.setScalar(MESH_SCALE[id] || 1.17);
  return g;
}

const _hpBox = new THREE.Box3();
const HP_FULL_W = 1.85;
const HP_H = 0.2;

function hpMat(hex, opacity) {
  const m = new THREE.SpriteMaterial({
    color: hex,
    transparent: true,
    opacity,
    depthTest: false,
    depthWrite: false,
    sizeAttenuation: true,
  });
  m.userData.skipOutline = true;
  return m;
}

const HP_MAT_BG = hpMat(0x1a100c, 0.88);
const HP_MAT_OK = hpMat(0x3dcc78, 0.96);
const HP_MAT_MID = hpMat(0xe8c44a, 0.96);
const HP_MAT_LOW = hpMat(0xe85a4a, 0.96);

function attachHpBar(g) {
  g.updateMatrixWorld(true);
  _hpBox.setFromObject(g);
  const top = Math.max(1.4, Number.isFinite(_hpBox.max.y) ? _hpBox.max.y : 1.6);
  const ps = Math.max(0.08, g.scale.y || 1);
  const bar = new THREE.Group();
  bar.name = 'hpBar';
  bar.scale.setScalar(1 / ps);
  bar.position.y = (top + 0.52) / ps;

  const bg = new THREE.Sprite(HP_MAT_BG);
  bg.scale.set(HP_FULL_W + 0.12, HP_H + 0.09, 1);
  bg.center.set(0.5, 0.5);
  bg.renderOrder = 24;
  bg.userData.skipOutline = true;

  const fill = new THREE.Sprite(HP_MAT_OK);
  fill.scale.set(HP_FULL_W, HP_H, 1);
  fill.center.set(0.5, 0.5);
  fill.renderOrder = 25;
  fill.userData.skipOutline = true;

  bar.add(bg);
  bar.add(fill);
  bar.userData.fill = fill;
  bar.userData.fullW = HP_FULL_W;
  g.add(bar);
  g.userData.hpBar = bar;
  syncHpBar(g, null);
}

export function syncHpBar(mesh, boatPos) {
  const bar = mesh?.userData?.hpBar;
  if (!bar) return;
  if (!mesh.visible || mesh.userData.dead || (mesh.userData.kind === 'wrap' && !mesh.userData.active)) {
    bar.visible = false;
    return;
  }
  const cap = Math.max(1, mesh.userData.maxHp || 1);
  const hp = Math.max(0, mesh.userData.hp ?? cap);
  const ratio = Math.max(0, Math.min(1, hp / cap));
  const near = boatPos
    ? Math.hypot(mesh.position.x - boatPos.x, mesh.position.z - boatPos.z) < 26
    : true;
  bar.visible = ratio < 0.999 || near || !!mesh.userData.chasing;
  const fill = bar.userData.fill;
  const w = Math.max(0.06, ratio) * bar.userData.fullW;
  fill.scale.set(w, HP_H, 1);
  fill.material = ratio > 0.55 ? HP_MAT_OK : ratio > 0.28 ? HP_MAT_MID : HP_MAT_LOW;
}

export function createCombatMonster(monsterId, gm, index = 0) {
  const id = resolveMonsterId(monsterId);
  const g = createMonsterMesh(id, gm);
  g.userData.id = index;
  g.userData.catalogId = id;
  g.userData.kind = ({
    woodUrchin: 'static',
    barnacle: 'wrap',
    lavaBarnacle: 'wrap',
    sawShark: 'ram',
    bladeCrab: 'ram',
    sporeJelly: 'ranged',
    ghostHook: 'wrap',
    thiefOtter: 'ram',
    inkJelly: 'ranged',
    lightningSnake: 'ranged',
    voidOctopus: 'wrap',
    waveWhale: 'ram',
    trenchWorm: 'suction',
    shark: 'ram',
    serpent: 'ranged',
    kraken: 'wrap',
  })[id] || 'ram';
  g.userData.phase = 0;
  g.userData.bob = Math.random() * 10;
  g.userData.shotCd = 0.8 + Math.random();
  g.userData.hitCd = 0;
  const cap = monsterHp(id);
  g.userData.hp = cap;
  g.userData.maxHp = cap;
  attachHpBar(g);
  return g;
}

const _flashWhite = new THREE.Color(0xffffff);

/** Brief white flash + scale punch on body mats (skips outline / HP bar). */
export function beginHitFlash(mesh, ms = 160) {
  if (!mesh) return;
  mesh.userData.hitFlashUntil = performance.now() + ms;
  if (mesh.userData.hitBaseScale == null) {
    mesh.userData.hitBaseScale = mesh.scale.x;
  }
  mesh.scale.setScalar(mesh.userData.hitBaseScale * 1.07);
  mesh.traverse((o) => {
    if (!o.isMesh) return;
    if (o.userData.isOutline || o.userData.skipOutline) return;
    if (o.parent?.name === 'hpBar' || o.name === 'hpBar') return;
    const mat = o.material;
    if (!mat?.color || mat.userData?.isHpMat) return;
    if (!mat.userData.hitBaseColor) mat.userData.hitBaseColor = mat.color.clone();
    mat.color.copy(mat.userData.hitBaseColor).lerp(_flashWhite, 0.7);
  });
}

export function tickHitFlash(mesh, now = performance.now()) {
  if (!mesh?.userData?.hitFlashUntil) return;
  if (mesh.userData.dying) return;
  const until = mesh.userData.hitFlashUntil;
  const baseS = mesh.userData.hitBaseScale;
  if (now < until) {
    if (baseS != null) {
      const u = 1 - (until - now) / 180;
      const punch = 1.07 - 0.07 * Math.min(1, Math.max(0, u) * 1.8);
      mesh.scale.setScalar(baseS * punch);
    }
    return;
  }
  mesh.userData.hitFlashUntil = 0;
  if (baseS != null) mesh.scale.setScalar(baseS);
  mesh.traverse((o) => {
    if (!o.isMesh || !o.material?.userData?.hitBaseColor) return;
    o.material.color.copy(o.material.userData.hitBaseColor);
  });
}

/**
 * Start a short death sequence (body visible ~0.55s).
 * @param {THREE.Object3D} mesh
 * @param {{ kind?: string, intensity?: number }} profile
 */
export function beginDeathAnim(mesh, profile = {}) {
  if (!mesh) return;
  const kind = profile.kind || mesh.userData.kind || 'ram';
  const intensity = profile.intensity ?? 1;
  if (mesh.userData.hitBaseScale == null) mesh.userData.hitBaseScale = mesh.scale.x;
  mesh.userData.dying = true;
  mesh.userData.dyingT = 0;
  mesh.userData.dyingDur = 0.52;
  mesh.userData.deathKind = kind;
  mesh.userData.deathIntensity = intensity;
  mesh.userData.deathBaseY = mesh.position.y;
  mesh.userData.deathBaseRotZ = mesh.rotation.z;
  mesh.userData.deathBaseRotX = mesh.rotation.x;
  mesh.userData.hitFlashUntil = performance.now() + 90;
  // Snap bright for freeze beat
  mesh.scale.setScalar(mesh.userData.hitBaseScale * 1.12);
  mesh.traverse((o) => {
    if (!o.isMesh) return;
    if (o.userData.isOutline || o.userData.skipOutline) return;
    if (o.parent?.name === 'hpBar' || o.name === 'hpBar') return;
    const mat = o.material;
    if (!mat) return;
    if (mat.color && !mat.userData.hitBaseColor) mat.userData.hitBaseColor = mat.color.clone();
    if (mat.color) mat.color.copy(mat.userData.hitBaseColor).lerp(_flashWhite, 0.85);
    if (mat.opacity != null) {
      if (mat.userData.deathBaseOp == null) mat.userData.deathBaseOp = mat.opacity;
      mat.transparent = true;
      mat.depthWrite = false;
    }
  });
  const bar = mesh.userData.hpBar;
  if (bar) bar.visible = false;
}

/** @returns {boolean} true when death finished and mesh can be hidden */
export function tickDeathAnim(mesh, dt) {
  if (!mesh?.userData?.dying) return false;
  const dur = mesh.userData.dyingDur || 0.52;
  mesh.userData.dyingT = (mesh.userData.dyingT || 0) + dt;
  const t = Math.min(1, mesh.userData.dyingT / dur);
  const kind = mesh.userData.deathKind || 'ram';
  const baseS = mesh.userData.hitBaseScale ?? 1;
  const baseY = mesh.userData.deathBaseY ?? 0;
  const inten = mesh.userData.deathIntensity ?? 1;

  // 0–0.15 freeze, 0.15–0.7 burst motion, 0.7–1 fade
  const freeze = Math.min(1, t / 0.15);
  const burstU = t < 0.15 ? 0 : Math.min(1, (t - 0.15) / 0.55);
  const fadeU = t < 0.55 ? 0 : Math.min(1, (t - 0.55) / 0.45);

  let sx = 1;
  let sy = 1;
  let sz = 1;
  let yOff = 0;
  let rotZ = mesh.userData.deathBaseRotZ || 0;
  let rotX = mesh.userData.deathBaseRotX || 0;

  if (kind === 'ram') {
    sx = 1.12 - burstU * 0.55;
    sy = 1.12 - burstU * 0.75;
    sz = 1.12 - burstU * 0.4;
    yOff = -burstU * 1.1 * inten;
    rotZ = (mesh.userData.deathBaseRotZ || 0) + burstU * 0.85;
  } else if (kind === 'ranged') {
    const lift = Math.sin(burstU * Math.PI) * 0.85 * inten;
    yOff = lift - fadeU * 0.6;
    sx = 1.1 + burstU * 0.25 - fadeU * 0.9;
    sy = 1.15 + burstU * 0.4 - fadeU * 1.0;
    sz = sx;
  } else if (kind === 'wrap') {
    sx = 1.15 + burstU * 0.45 - fadeU * 1.2;
    sy = 1.15 - burstU * 0.85;
    sz = sx;
    yOff = -burstU * 0.25;
  } else if (kind === 'static') {
    const pop = burstU < 0.35 ? burstU / 0.35 : 1 - (burstU - 0.35) / 0.65;
    sx = 1.12 + pop * 0.55 * inten;
    sy = sx;
    sz = sx;
    yOff = pop * 0.15;
  } else if (kind === 'suction') {
    sx = 1.1 - burstU * 0.35;
    sy = 1.2 + burstU * 0.9 * inten - fadeU * 1.4;
    sz = 1.1 - burstU * 0.35;
    yOff = -burstU * 0.5;
    rotX = (mesh.userData.deathBaseRotX || 0) + burstU * 0.35;
  } else {
    sx = 1.12 - burstU * 0.7;
    sy = sx;
    sz = sx;
    yOff = -burstU * 0.8;
  }

  // Hold freeze scale briefly
  if (freeze < 1 && burstU === 0) {
    sx = sy = sz = 1.12;
  }

  const fadeScale = 1 - fadeU * 0.85;
  mesh.scale.set(baseS * sx * fadeScale, baseS * sy * fadeScale, baseS * sz * fadeScale);
  mesh.position.y = baseY + yOff;
  mesh.rotation.z = rotZ;
  mesh.rotation.x = rotX;

  const op = Math.max(0, 1 - fadeU * 1.05);
  mesh.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    // Shared outline mats — never fade them or every model loses outlines.
    if (o.userData.isOutline || o.userData.skipOutline) return;
    if (o.material.userData?.isOutlineMat) return;
    if (o.parent?.name === 'hpBar' || o.name === 'hpBar') return;
    if (o.material.opacity != null) {
      const base = o.material.userData.deathBaseOp ?? 1;
      o.material.transparent = true;
      o.material.opacity = base * op;
    }
  });

  return t >= 1;
}

/** Reset transform/mats after death so the pool entry can respawn clean. */
export function finishDeathAnim(mesh) {
  if (!mesh) return;
  const baseS = mesh.userData.hitBaseScale ?? mesh.scale.x;
  mesh.userData.dying = false;
  mesh.userData.dyingT = 0;
  mesh.userData.hitFlashUntil = 0;
  mesh.scale.setScalar(baseS);
  if (mesh.userData.deathBaseY != null) mesh.position.y = mesh.userData.deathBaseY;
  mesh.rotation.z = mesh.userData.deathBaseRotZ || 0;
  mesh.rotation.x = mesh.userData.deathBaseRotX || 0;
  mesh.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    if (o.userData.isOutline || o.material.userData?.isOutlineMat) return;
    if (o.material.userData?.hitBaseColor) {
      o.material.color.copy(o.material.userData.hitBaseColor);
    }
    if (o.material.userData?.deathBaseOp != null) {
      o.material.opacity = o.material.userData.deathBaseOp;
      if (o.material.userData.deathBaseOp >= 1) {
        o.material.transparent = false;
        o.material.depthWrite = true;
      }
    }
  });
  ensureOutlineMaterials();
}

function makeDmgTexture(text, kill) {
  const c = document.createElement('canvas');
  c.width = 160;
  c.height = 80;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.font = kill ? 'bold 44px sans-serif' : 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(20,12,8,0.85)';
  ctx.strokeText(text, 80, 40);
  ctx.fillStyle = kill ? '#ffe8a0' : '#fff6e8';
  ctx.fillText(text, 80, 40);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/** Floating damage numbers above monsters (discrete hits only). */
export function createDamageFloats(parent) {
  const root = new THREE.Group();
  root.name = 'dmgFloats';
  parent.add(root);
  const active = [];

  function spawn(x, y, z, amount, kill = false) {
    const n = Math.max(1, Math.round(amount));
    if (n < 1) return;
    const label = kill ? `${n}!` : String(n);
    const tex = makeDmgTexture(label, kill);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    mat.userData.skipOutline = true;
    const spr = new THREE.Sprite(mat);
    spr.position.set(x, y, z);
    spr.scale.set(kill ? 1.35 : 1.05, kill ? 0.68 : 0.52, 1);
    spr.renderOrder = 30;
    spr.userData.skipOutline = true;
    root.add(spr);
    active.push({
      spr,
      life: kill ? 0.75 : 0.58,
      max: kill ? 0.75 : 0.58,
      vy: kill ? 1.35 : 1.1,
    });
  }

  function update(dt) {
    for (let i = active.length - 1; i >= 0; i--) {
      const f = active[i];
      f.life -= dt;
      f.spr.position.y += f.vy * dt;
      f.vy *= 0.98;
      const a = Math.max(0, f.life / f.max);
      f.spr.material.opacity = a;
      if (f.life <= 0) {
        root.remove(f.spr);
        f.spr.material.map?.dispose();
        f.spr.material.dispose();
        active.splice(i, 1);
      }
    }
  }

  return { root, spawn, update };
}
