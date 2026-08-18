import * as THREE from 'three';
import { addOutline, toonMat } from './stylekit.js';

/**
 * Low-poly shop / backpack item meshes (supplies, weapons, hulls, talents).
 */

function mat(color, gm, opts = {}) {
  return toonMat(color, gm, { flatShading: true, ...opts });
}

function add(g, mesh, outline = 1.1) {
  g.add(mesh);
  addOutline(mesh, outline);
  return mesh;
}

function wrapBand(g, gm, y, r = 0.12, color = 0xe8dcc0) {
  const band = new THREE.Mesh(new THREE.TorusGeometry(r, 0.028, 5, 8), mat(color, gm));
  band.rotation.x = Math.PI / 2;
  band.position.y = y;
  add(g, band, 1.15);
}

/** —— Supplies —— */
function meshBait(gm) {
  const g = new THREE.Group();
  const worm = mat(0x4a9a5a, gm);
  const hook = mat(0x9aa4b2, gm);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.55, 3, 6), worm);
  body.rotation.z = 0.5;
  body.position.set(0.05, 0.05, 0);
  add(g, body);
  const bump = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 4), worm);
  bump.position.set(-0.18, -0.12, 0.06);
  add(g, bump);
  const h = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 5, 8, Math.PI * 1.2), hook);
  h.rotation.set(0.4, 0.2, -0.6);
  h.position.set(0.28, 0.32, 0);
  add(g, h, 1.18);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 5), hook);
  tip.rotation.z = Math.PI;
  tip.position.set(0.38, 0.18, 0);
  add(g, tip, 1.2);
  return g;
}

function meshPlank(gm) {
  const g = new THREE.Group();
  const wood = mat(0xb88850, gm);
  const dark = mat(0x7a5530, gm);
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.1, 0.28, 1, 1, 1), i % 2 ? dark : wood);
    p.position.set(0, -0.18 + i * 0.12, (i - 1) * 0.06);
    p.rotation.y = (i - 1) * 0.08;
    add(g, p, 1.08);
  }
  return g;
}

function meshRepair(gm) {
  const g = new THREE.Group();
  const glass = mat(0x6a9ac4, gm, { transparent: true, opacity: 0.72 });
  const cork = mat(0xc4a06a, gm);
  const liquid = mat(0xffd24a, gm);
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.55, 6), glass);
  bottle.position.y = 0.1;
  add(g, bottle, 1.1);
  const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.28, 6), liquid);
  fill.position.y = 0.02;
  add(g, fill, 1.05);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.16, 6), glass);
  neck.position.y = 0.42;
  add(g, neck, 1.12);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 6), cork);
  cap.position.y = 0.54;
  add(g, cap, 1.15);
  g.rotation.z = 0.25;
  return g;
}

/** —— Weapons (ref: fish spear / knife / sling) —— */
function meshHarpoon(gm) {
  const g = new THREE.Group();
  const wood = mat(0x6a4a2a, gm);
  const metal = mat(0xb8c0c8, gm);
  const wrap = mat(0xe8dcc0, gm);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 1.55, 6), wood);
  shaft.rotation.z = Math.PI / 2;
  add(g, shaft);
  wrapBand(g, gm, 0, 0.07, 0xe8dcc0);
  const wrapMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.14, 6), wrap);
  wrapMesh.rotation.z = Math.PI / 2;
  wrapMesh.position.x = 0.45;
  add(g, wrapMesh, 1.12);
  const wrap2 = wrapMesh.clone();
  wrap2.position.x = -0.55;
  add(g, wrap2, 1.12);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.32, 5), metal);
  head.rotation.z = -Math.PI / 2;
  head.position.x = 0.88;
  add(g, head, 1.15);
  for (const side of [-1, 1]) {
    const barb = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.18, 4), metal);
    barb.rotation.set(0, 0, side * 0.9 - Math.PI / 2);
    barb.position.set(0.72, side * 0.1, 0);
    add(g, barb, 1.18);
  }
  const pommel = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), metal);
  pommel.position.x = -0.82;
  add(g, pommel, 1.2);
  g.rotation.set(0.2, 0.4, 0.15);
  return g;
}

function meshKnife(gm) {
  const g = new THREE.Group();
  const wood = mat(0x6a4a2a, gm);
  const metal = mat(0xb8c0c8, gm);
  const guard = mat(0xd4c4a0, gm);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.06, 1, 1, 1), metal);
  blade.position.set(0.28, 0.05, 0);
  blade.scale.set(1, 1, 1);
  add(g, blade, 1.1);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.28, 5), metal);
  tip.rotation.z = -Math.PI / 2;
  tip.position.set(0.68, 0.05, 0);
  tip.scale.set(1, 0.55, 0.35);
  add(g, tip, 1.12);
  const cross = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.1), guard);
  cross.position.set(0.02, 0.04, 0);
  add(g, cross, 1.12);
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.12, 6), wood);
    seg.rotation.z = Math.PI / 2;
    seg.position.set(-0.12 - i * 0.12, 0.04, 0);
    add(g, seg, 1.1);
  }
  const pommel = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), metal);
  pommel.position.set(-0.48, 0.04, 0);
  add(g, pommel, 1.18);
  g.rotation.set(0.15, -0.5, 0.35);
  return g;
}

function meshSling(gm) {
  const g = new THREE.Group();
  const wood = mat(0x6a4a2a, gm);
  const wrap = mat(0xe8dcc0, gm);
  const stone = mat(0x9aa0a8, gm);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.55, 6), wood);
  handle.position.y = -0.15;
  add(g, handle);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.42, 6), wood);
    arm.rotation.z = side * 0.55;
    arm.position.set(side * 0.16, 0.28, 0);
    add(g, arm);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.1, 6), wrap);
    tip.rotation.z = side * 0.55;
    tip.position.set(side * 0.28, 0.44, 0);
    add(g, tip, 1.15);
  }
  const pouch = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 4), wrap);
  pouch.scale.set(1.2, 0.7, 0.9);
  pouch.position.set(0, 0.22, 0.12);
  add(g, pouch, 1.12);
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.1, 0), stone);
  rock.position.set(0, 0.24, 0.14);
  add(g, rock, 1.15);
  g.rotation.set(0.1, 0.35, -0.1);
  return g;
}

/** —— Hulls (图2: 低阶木筏 / 中阶重筏 / 高阶冲锋船) —— */
function meshRaft(gm) {
  const g = new THREE.Group();
  const hull = mat(0x9a6a3a, gm);
  const dark = mat(0x6a4420, gm);
  const sail = mat(0xf5f0e4, gm);
  const mast = mat(0x4a2e14, gm);
  const flag = mat(0xd42828, gm);
  const crate = mat(0x7a5028, gm);
  const h = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.26, 0.42, 1, 1, 1), hull);
  h.position.y = 0.05;
  add(g, h);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.38, 5), dark);
  bow.rotation.z = -Math.PI / 2;
  bow.position.set(0.62, 0.05, 0);
  bow.scale.set(1, 0.7, 1);
  add(g, bow);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.95, 5), mast);
  m.position.set(-0.02, 0.55, 0);
  add(g, m);
  const s = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.68, 3), sail);
  s.rotation.set(0, 0, -Math.PI / 2);
  s.position.set(0.14, 0.5, 0);
  s.scale.set(0.35, 1, 1);
  add(g, s, 1.05);
  const f = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.13, 3), flag);
  f.rotation.z = -Math.PI / 2;
  f.position.set(0.06, 1.08, 0);
  add(g, f, 1.15);
  const c = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.14), crate);
  c.position.set(-0.28, 0.22, 0.08);
  add(g, c, 1.1);
  g.rotation.set(0.35, 0.7, 0.05);
  return g;
}

function meshHeavyRaft(gm) {
  const g = new THREE.Group();
  const hull = mat(0x6a4528, gm);
  const trim = mat(0x2f6bb8, gm);
  const sail = mat(0xf4f0e6, gm);
  const stripe = mat(0x2f6bb8, gm);
  const mast = mat(0x3e2a16, gm);
  const wood = mat(0x8a5c30, gm);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.36, 0.58, 1, 1, 1), hull);
  body.position.y = 0.08;
  add(g, body);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.09, 0.62), trim);
  rail.position.y = 0.3;
  add(g, rail, 1.08);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.32, 0.42), wood);
  cabin.position.set(-0.42, 0.4, 0);
  add(g, cabin);
  for (const x of [-0.12, 0.28]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.9, 5), mast);
    m.position.set(x, 0.72, 0);
    add(g, m);
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.58, 0.44), sail);
    s.position.set(x + 0.08, 0.68, 0);
    add(g, s, 1.05);
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.55, 0.1), stripe);
    st.position.set(x + 0.1, 0.68, 0);
    add(g, st, 1.05);
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 3), trim);
    fl.rotation.z = -Math.PI / 2;
    fl.position.set(x + 0.04, 1.2, 0);
    add(g, fl, 1.15);
  }
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 6), wood);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(-0.1, 0.34, 0.18);
  add(g, barrel, 1.1);
  g.rotation.set(0.35, 0.65, 0.05);
  return g;
}

function meshChargeBoat(gm) {
  const g = new THREE.Group();
  const hull = mat(0x1c1220, gm);
  const gold = mat(0xd4a020, gm);
  const purple = mat(0x4a2068, gm);
  const sail = mat(0x5a2a7a, gm);
  const mast = mat(0x2a1c14, gm);
  const window = mat(0xffe08a, gm);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.42, 0.62, 1, 1, 1), hull);
  body.position.y = 0.1;
  add(g, body);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.08, 0.66), gold);
  rail.position.y = 0.34;
  add(g, rail, 1.08);
  const stern = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.5), purple);
  stern.position.set(-0.55, 0.48, 0);
  add(g, stern);
  const w = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.06), window);
  w.position.set(-0.78, 0.52, 0.12);
  add(g, w, 1.2);
  const figure = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.38, 5), gold);
  figure.rotation.z = -Math.PI / 2;
  figure.position.set(0.88, 0.28, 0);
  add(g, figure, 1.1);
  for (let i = 0; i < 3; i++) {
    const x = -0.22 + i * 0.34;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 1.05 - i * 0.08, 5), mast);
    m.position.set(x, 0.88, 0);
    add(g, m);
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.45, 0.34), sail);
    s.position.set(x + 0.07, 0.8, 0);
    add(g, s, 1.04);
    const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), gold);
    crest.position.set(x + 0.1, 0.8, 0.02);
    add(g, crest, 1.2);
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.11, 3), purple);
    fl.rotation.z = -Math.PI / 2;
    fl.position.set(x + 0.04, 1.42 - i * 0.04, 0);
    add(g, fl, 1.15);
  }
  g.rotation.set(0.35, 0.7, 0.05);
  return g;
}

/** —— Talents —— */
function meshFishmongerEye(gm) {
  const g = new THREE.Group();
  const white = mat(0xf0ece4, gm);
  const iris = mat(0xc45c1a, gm);
  const pupil = mat(0x1a1008, gm);
  const lid = mat(0xd4b090, gm);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 6), white);
  add(g, eye);
  const ir = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 5), iris);
  ir.position.z = 0.28;
  add(g, ir, 1.08);
  const p = new THREE.Mesh(new THREE.SphereGeometry(0.09, 5, 4), pupil);
  p.position.z = 0.42;
  add(g, p, 1.15);
  const top = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 5, 10, Math.PI), lid);
  top.rotation.x = Math.PI / 2;
  top.position.y = 0.08;
  add(g, top, 1.1);
  g.rotation.set(0.15, -0.25, 0);
  return g;
}

function meshCursedWhisper(gm) {
  const g = new THREE.Group();
  const ghost = mat(0x6a2a8a, gm, { transparent: true, opacity: 0.85 });
  const glow = mat(0xb88ad4, gm);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.32, 6, 5), ghost);
  skull.scale.set(1, 1.1, 0.9);
  add(g, skull);
  for (const side of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 4, 3), glow);
    e.position.set(side * 0.12, 0.06, 0.26);
    add(g, e, 1.2);
  }
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.16), ghost);
  jaw.position.set(0, -0.22, 0.08);
  add(g, jaw, 1.1);
  const swirl = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 5, 10), glow);
  swirl.rotation.x = 0.8;
  swirl.position.y = -0.05;
  add(g, swirl, 1.15);
  g.rotation.set(0.2, 0.4, 0);
  return g;
}

function meshGhostWake(gm) {
  const g = new THREE.Group();
  const mist = mat(0x3a5a7a, gm, { transparent: true, opacity: 0.8 });
  const foam = mat(0xb8d0e0, gm);
  const hull = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.28), mist);
  hull.position.set(-0.15, 0.05, 0);
  add(g, hull);
  const sail = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 3), mist);
  sail.rotation.z = -Math.PI / 2;
  sail.position.set(-0.05, 0.35, 0);
  sail.scale.set(0.4, 1, 1);
  add(g, sail, 1.08);
  for (let i = 0; i < 4; i++) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.1 + i * 0.02, 5, 4), foam);
    w.scale.set(1.6, 0.35, 1);
    w.position.set(0.25 + i * 0.18, -0.05, (i % 2) * 0.06);
    add(g, w, 1.1);
  }
  g.rotation.set(0.25, 0.55, 0);
  return g;
}

function meshSkillFrost(gm) {
  const g = new THREE.Group();
  const ice = mat(0xb8e8ff, gm);
  const core = mat(0x7ad8ff, gm);
  const spike = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.15, 5), ice);
  spike.rotation.z = -Math.PI / 2;
  spike.position.x = 0.15;
  add(g, spike, 1.1);
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), core);
    s.position.set(-0.15 + i * 0.12, (i % 2) * 0.22 - 0.08, 0.08);
    add(g, s, 1.18);
  }
  g.rotation.set(0.2, 0.45, 0.1);
  return g;
}

function meshSkillStorm(gm) {
  const g = new THREE.Group();
  const bolt = mat(0xa8e8ff, gm);
  const glow = mat(0x4aa8ff, gm);
  const core = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.08), bolt);
  add(g, core, 1.12);
  for (let i = 0; i < 4; i++) {
    const zig = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 0.06), glow);
    zig.position.set(-0.4 + i * 0.28, (i % 2 ? 0.16 : -0.16), 0);
    zig.rotation.z = i % 2 ? 0.7 : -0.7;
    add(g, zig, 1.2);
  }
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 5), bolt);
  ball.position.x = 0.62;
  add(g, ball, 1.15);
  g.rotation.set(0.25, -0.4, 0.2);
  return g;
}

function meshSkillMeteor(gm) {
  const g = new THREE.Group();
  const lava = mat(0xff6030, gm);
  const crack = mat(0xffc060, gm);
  const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), lava);
  add(g, rock);
  const seam = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), crack);
  add(g, seam, 1.15);
  const trail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.7, 5), mat(0xff8040, gm));
  trail.rotation.z = Math.PI / 2;
  trail.position.x = -0.55;
  add(g, trail, 1.12);
  g.rotation.set(0.35, 0.5, -0.15);
  return g;
}

const BUILDERS = {
  bait: meshBait,
  plank: meshPlank,
  repair: meshRepair,
  skillFrost: meshSkillFrost,
  skillStorm: meshSkillStorm,
  skillMeteor: meshSkillMeteor,
  weaponHarpoon: meshSkillFrost,
  weaponKnife: meshSkillStorm,
  weaponSling: meshSkillMeteor,
  raft: meshRaft,
  heavyRaft: meshHeavyRaft,
  chargeBoat: meshChargeBoat,
  fishmongerEye: meshFishmongerEye,
  cursedBoat: meshCursedWhisper,
  ghostWake: meshGhostWake,
};

/**
 * @param {string} id
 * @param {THREE.Texture} gradientMap
 * @returns {THREE.Group}
 */
export function createItemMesh(id, gradientMap) {
  const fn = BUILDERS[id] || meshPlank;
  return fn(gradientMap);
}

export function listItemMeshIds() {
  return Object.keys(BUILDERS);
}
