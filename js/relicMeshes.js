import * as THREE from '../vendor/three/three.module.js';
import { addOutline, toonMat } from './stylekit.js';

/** Low-poly relic meshes: sealed black package vs opened treasures. */

function mat(color, gm, opts = {}) {
  return toonMat(color, gm, { flatShading: true, ...opts });
}

function add(g, mesh, outline = 1.1) {
  g.add(mesh);
  addOutline(mesh, outline);
  return mesh;
}

/** Sealed — same silhouette as sea flotsam black package */
function meshBlackPackage(gm) {
  const g = new THREE.Group();
  const black = mat(0x141416, gm);
  const shade = mat(0x2a2a30, gm);
  const cord = mat(0x3a3a42, gm);

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.78, 0.88, 1, 1, 1), black);
  body.position.y = 0.42;
  body.rotation.y = 0.4;
  body.rotation.z = 0.05;
  add(g, body, 1.06);

  for (const [x, y, z, s] of [
    [0.52, 0.62, 0.35, 0.16], [-0.5, 0.6, -0.32, 0.14],
    [0.45, 0.18, -0.4, 0.13], [-0.48, 0.2, 0.38, 0.15],
    [0.1, 0.78, 0.05, 0.11],
  ]) {
    const chip = new THREE.Mesh(new THREE.TetrahedronGeometry(s, 0), shade);
    chip.position.set(x * 0.75, y, z * 0.75);
    chip.rotation.set(x + y, y + z, z);
    add(g, chip, 1.12);
  }

  const bandA = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.07, 0.1), cord);
  bandA.position.set(0, 0.62, 0);
  bandA.rotation.y = 0.4;
  add(g, bandA, 1.1);

  const bandB = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 1.05), cord);
  bandB.position.set(0, 0.63, 0);
  bandB.rotation.y = 0.4;
  add(g, bandB, 1.1);

  const knot = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), cord);
  knot.position.set(0.04, 0.76, 0.04);
  knot.rotation.y = 0.6;
  add(g, knot, 1.18);
  return g;
}

function meshCoin(gm, face = 0xc8a050, edge = 0x8a6a28) {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 12), mat(face, gm));
  disc.rotation.x = Math.PI / 2;
  add(g, disc, 1.12);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 5, 14), mat(edge, gm));
  rim.rotation.x = Math.PI / 2;
  add(g, rim, 1.15);
  const hole = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.12), mat(0x1a1810, gm));
  add(g, hole, 1.05);
  g.rotation.set(0.55, 0.35, 0.2);
  return g;
}

function meshScarab(gm) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), mat(0x3a8a5a, gm));
  body.scale.set(1.1, 0.7, 1.35);
  add(g, body);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.35), mat(0x2a6a48, gm));
  wing.position.set(0, 0.12, -0.05);
  add(g, wing, 1.08);
  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.22, 2, 4), mat(0x1a4030, gm));
    leg.position.set(sx * 0.28, -0.08, 0.05);
    leg.rotation.z = sx * 0.6;
    add(g, leg, 1.15);
  }
  g.rotation.set(0.4, 0.5, 0);
  return g;
}

function meshOilLamp(gm) {
  const g = new THREE.Group();
  const clay = mat(0xb88858, gm);
  const pot = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), clay);
  pot.scale.set(1.2, 0.75, 1);
  pot.position.y = 0.1;
  add(g, pot);
  const spout = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 6), clay);
  spout.rotation.z = -Math.PI / 2;
  spout.position.set(0.38, 0.12, 0);
  add(g, spout, 1.12);
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 5), mat(0xe8d080, gm));
  wick.position.set(0.52, 0.18, 0);
  add(g, wick, 1.2);
  g.rotation.set(0.25, -0.4, 0.1);
  return g;
}

function meshGlassBead(gm, a = 0x5ab0c8, b = 0xc86080) {
  const g = new THREE.Group();
  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), mat(a, gm, { transparent: true, opacity: 0.85 }));
  add(g, bead, 1.08);
  const swirl = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 5, 10), mat(b, gm));
  swirl.rotation.y = 0.8;
  add(g, swirl, 1.15);
  g.rotation.set(0.3, 0.5, 0.2);
  return g;
}

function meshShard(gm, colors = [0xd4a040, 0x4aaa60, 0xc87040]) {
  const g = new THREE.Group();
  colors.forEach((c, i) => {
    const s = new THREE.Mesh(new THREE.TetrahedronGeometry(0.28 - i * 0.04, 0), mat(c, gm));
    s.position.set((i - 1) * 0.18, 0.05 + i * 0.04, (i % 2) * 0.1);
    s.rotation.set(i * 0.4, i * 0.7, 0.2);
    add(g, s, 1.12);
  });
  g.rotation.set(0.35, 0.4, 0);
  return g;
}

function meshPorcelainRim(gm) {
  const g = new THREE.Group();
  const white = mat(0xe8e4dc, gm);
  const blue = mat(0x2a5a98, gm);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.07, 5, 16, Math.PI * 1.35), white);
  rim.rotation.x = 0.9;
  add(g, rim, 1.12);
  const paint = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 4, 12, Math.PI * 0.9), blue);
  paint.rotation.x = 0.9;
  paint.position.y = 0.02;
  add(g, paint, 1.15);
  g.rotation.set(0.2, 0.3, 0.15);
  return g;
}

function meshMirrorArc(gm) {
  const g = new THREE.Group();
  const bronze = mat(0x5a8a58, gm);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 5, 16, Math.PI * 1.1), bronze);
  arc.rotation.x = 0.85;
  add(g, arc, 1.12);
  const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 8), mat(0x3a6040, gm));
  boss.rotation.x = Math.PI / 2;
  add(g, boss, 1.15);
  g.rotation.set(0.3, -0.4, 0.1);
  return g;
}

function meshOraclePage(gm) {
  const g = new THREE.Group();
  const page = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.04), mat(0xe8dcc0, gm));
  add(g, page, 1.08);
  for (let i = 0; i < 4; i++) {
    const stroke = new THREE.Mesh(new THREE.BoxGeometry(0.08 + (i % 2) * 0.12, 0.04, 0.05), mat(0x2a2218, gm));
    stroke.position.set(-0.15 + (i % 2) * 0.25, 0.25 - i * 0.18, 0.03);
    add(g, stroke, 1.05);
  }
  g.rotation.set(0.2, 0.35, -0.1);
  return g;
}

function meshJadeTube(gm) {
  const g = new THREE.Group();
  const jade = mat(0x4aaa78, gm);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.7, 8), jade);
  tube.rotation.z = Math.PI / 2;
  add(g, tube, 1.12);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 4, 10), mat(0x2a6850, gm));
  ring.rotation.y = Math.PI / 2;
  add(g, ring, 1.15);
  g.rotation.set(0.4, 0.5, 0.2);
  return g;
}

function meshKoban(gm) {
  const g = new THREE.Group();
  const gold = mat(0xe8c040, gm);
  const oval = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), gold);
  oval.scale.set(1.35, 0.18, 0.85);
  add(g, oval, 1.12);
  const stamp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.22), mat(0xb89020, gm));
  stamp.position.y = 0.08;
  add(g, stamp, 1.1);
  g.rotation.set(0.7, 0.2, 0.15);
  return g;
}

function meshTile(gm, glaze = 0x2a4a98) {
  const g = new THREE.Group();
  const tile = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.7), mat(glaze, gm));
  add(g, tile, 1.1);
  const pattern = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.35), mat(0xe8d080, gm));
  pattern.position.y = 0.08;
  pattern.rotation.y = Math.PI / 4;
  add(g, pattern, 1.12);
  g.rotation.set(0.55, 0.4, 0.1);
  return g;
}

function meshArmRing(gm) {
  const g = new THREE.Group();
  const silver = mat(0xb8c0c8, gm);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.08, 6, 16, Math.PI * 1.4), silver);
  ring.rotation.x = 0.6;
  add(g, ring, 1.12);
  const twist = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.035, 4, 14, Math.PI * 1.4), mat(0x8a949c, gm));
  twist.rotation.x = 0.6;
  twist.position.y = 0.04;
  add(g, twist, 1.15);
  g.rotation.set(0.3, 0.5, 0);
  return g;
}

function meshStele(gm, face = 0x8a8878) {
  const g = new THREE.Group();
  const slab = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.95, 0.14), mat(face, gm));
  add(g, slab, 1.1);
  for (let i = 0; i < 5; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.02), mat(0x3a3830, gm));
    line.position.set(0, 0.28 - i * 0.14, 0.08);
    add(g, line, 1.05);
  }
  g.rotation.set(0.15, 0.45, 0);
  return g;
}

function meshScribe(gm) {
  const g = new THREE.Group();
  const skin = mat(0xc4a070, gm);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.35), skin);
  torso.position.y = 0.25;
  add(g, torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 6), skin);
  head.position.y = 0.52;
  add(g, head, 1.12);
  const lap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.4), mat(0xe8d8b0, gm));
  lap.position.y = 0.05;
  add(g, lap, 1.08);
  g.rotation.set(0.2, 0.5, 0);
  return g;
}

function meshCeladon(gm) {
  return meshShard(gm, [0x8ab8a0, 0x6a9880, 0xa8c8b0]);
}

function meshCloisonne(gm) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.1, 0.5), mat(0x1a4060, gm));
  add(g, base, 1.1);
  const wire = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 4, 10), mat(0xd4b040, gm));
  wire.rotation.x = Math.PI / 2;
  wire.position.y = 0.08;
  add(g, wire, 1.15);
  const petal = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), mat(0xc04060, gm));
  petal.position.set(0, 0.12, 0);
  add(g, petal, 1.12);
  g.rotation.set(0.5, 0.35, 0.1);
  return g;
}

function meshLangyao(gm) {
  return meshShard(gm, [0xa01828, 0xc03040, 0x701018]);
}

function meshOwlCoin(gm) {
  const g = meshCoin(gm, 0xc0c4c8, 0x787878);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 5), mat(0x2a2a28, gm));
  beak.position.set(0.12, 0.06, 0.05);
  beak.rotation.z = -0.8;
  add(g, beak, 1.15);
  return g;
}

function meshArmorPlate(gm) {
  const g = new THREE.Group();
  const clay = mat(0xb89068, gm);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.18), clay);
      p.position.set((c - 1) * 0.22, 0.05 + r * 0.02, (r - 1) * 0.16);
      add(g, p, 1.08);
    }
  }
  g.rotation.set(0.55, 0.3, 0.1);
  return g;
}

function meshSilkScrap(gm) {
  const g = new THREE.Group();
  const silk = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.65), mat(0xe8d8b8, gm));
  silk.rotation.x = -0.9;
  add(g, silk, 1.05);
  const ink = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.08), mat(0x2a2218, gm));
  ink.position.set(-0.1, 0.08, 0.05);
  add(g, ink, 1.05);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.1, 4), mat(0x5a4030, gm));
  roof.position.set(0.18, 0.12, 0);
  add(g, roof, 1.1);
  g.rotation.set(0.2, 0.4, 0);
  return g;
}

function meshJinOuCup(gm) {
  const g = new THREE.Group();
  const gold = mat(0xe8c040, gm);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.35, 8), gold);
  cup.position.y = 0.2;
  add(g, cup, 1.12);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 4, 8, Math.PI), gold);
    ear.position.set(sx * 0.3, 0.28, 0);
    ear.rotation.y = sx > 0 ? 0 : Math.PI;
    add(g, ear, 1.15);
  }
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), mat(0x40a060, gm));
  gem.position.y = 0.42;
  add(g, gem, 1.18);
  g.rotation.set(0.2, 0.45, 0);
  return g;
}

function meshVenusArm(gm) {
  const g = new THREE.Group();
  const marble = mat(0xe8e4dc, gm);
  const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.45, 4, 6), marble);
  upper.rotation.z = 0.5;
  upper.position.set(-0.05, 0.25, 0);
  add(g, upper, 1.1);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), marble);
  hand.position.set(0.18, 0.05, 0.05);
  add(g, hand, 1.12);
  g.rotation.set(0.25, 0.4, 0);
  return g;
}

function meshWingFeather(gm) {
  const g = new THREE.Group();
  const marble = mat(0xd8d4cc, gm);
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.55 - i * 0.05, 5), marble);
    f.position.set(i * 0.08 - 0.15, 0.1 + i * 0.04, i * 0.04);
    f.rotation.z = -0.4 - i * 0.08;
    f.rotation.x = 0.3;
    add(g, f, 1.1);
  }
  g.rotation.set(0.3, 0.5, 0.1);
  return g;
}

function meshJadeCabbage(gm) {
  const g = new THREE.Group();
  const leaf = mat(0x5aaa60, gm);
  const white = mat(0xd8e8d0, gm);
  const core = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 7), white);
  core.position.y = 0.2;
  add(g, core, 1.08);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5), leaf);
    l.scale.set(1.2, 0.35, 0.7);
    l.position.set(Math.cos(a) * 0.22, 0.35, Math.sin(a) * 0.18);
    l.rotation.y = a;
    add(g, l, 1.1);
  }
  const bug = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), mat(0x3a8040, gm));
  bug.position.set(0.2, 0.55, 0.1);
  add(g, bug, 1.15);
  g.rotation.set(0.15, 0.4, 0);
  return g;
}

function meshTutMask(gm) {
  const g = new THREE.Group();
  const gold = mat(0xe8c040, gm);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), gold);
  face.scale.set(0.9, 1.05, 0.75);
  face.position.y = 0.2;
  add(g, face, 1.1);
  const beard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.1), mat(0x2a5a98, gm));
  beard.position.set(0, -0.05, 0.22);
  add(g, beard, 1.12);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), mat(0x1a1810, gm));
    eye.position.set(sx * 0.14, 0.28, 0.26);
    add(g, eye, 1.05);
  }
  const nemes = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.45), mat(0xc8a028, gm));
  nemes.position.set(0, 0.48, -0.05);
  add(g, nemes, 1.08);
  g.rotation.set(0.15, 0.35, 0);
  return g;
}

const BUILDERS = {
  blackPackage: meshBlackPackage,
  wuzhuCoin: (gm) => meshCoin(gm),
  scarabAmulet: meshScarab,
  greekOilLamp: meshOilLamp,
  romanGlassBead: (gm) => meshGlassBead(gm),
  sancaiShard: (gm) => meshShard(gm),
  bluePorcelainRim: meshPorcelainRim,
  bronzeMirrorArc: meshMirrorArc,
  oracleBoneRub: meshOraclePage,
  mayaJadeBead: meshJadeTube,
  edoKobanChip: meshKoban,
  persianGlazeTile: (gm) => meshTile(gm, 0x2a4a98),
  vikingArmRing: meshArmRing,
  rosettaRubbing: (gm) => meshStele(gm, 0x9a9078),
  hammurabiClay: (gm) => meshStele(gm, 0xa08058),
  seatedScribeFig: meshScribe,
  ruCeladonChip: meshCeladon,
  cloisonneLotus: meshCloisonne,
  langyaoRedShard: meshLangyao,
  athenaOwlCoin: meshOwlCoin,
  terracottaArmor: meshArmorPlate,
  qingmingSilkScrap: meshSilkScrap,
  jinOuCupEcho: meshJinOuCup,
  venusArmCast: meshVenusArm,
  samothraceFeather: meshWingFeather,
  jadeCabbageEcho: meshJadeCabbage,
  tutMaskFoil: meshTutMask,
};

/**
 * @param {string} id — relic defId or 'blackPackage'
 * @param {THREE.Texture} gradientMap
 */
export function createRelicMesh(id, gradientMap) {
  const fn = BUILDERS[id] || meshBlackPackage;
  return fn(gradientMap);
}

export function listRelicMeshIds() {
  return Object.keys(BUILDERS);
}
