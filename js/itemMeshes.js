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

/** —— Supplies —— */
function meshBait(gm, palette = {}) {
  const g = new THREE.Group();
  const worm = mat(palette.worm ?? 0x4a9a5a, gm);
  const hook = mat(palette.hook ?? 0x9aa4b2, gm);
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

function meshRepair(gm, liquidHex = 0xffd24a, glassHex = 0x6a9ac4) {
  const g = new THREE.Group();
  const glass = mat(glassHex, gm, { transparent: true, opacity: 0.72 });
  const cork = mat(0xc4a06a, gm);
  const liquid = mat(liquidHex, gm);
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

function meshPaste(gm) {
  return meshRepair(gm, 0xc45c1a, 0x8a5040);
}

/** —— Hulls (procedural toon shop thumbnails) —— */
function meshRaft(gm) {
  const g = new THREE.Group();
  const wood = mat(0x8a6a42, gm);
  const dark = mat(0x5a4028, gm);
  const rope = mat(0xc4a86a, gm);
  // Log hull — 3 side-by-side cylinders
  for (let i = 0; i < 3; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 1.6, 5), i % 2 ? dark : wood);
    log.rotation.z = Math.PI / 2;
    log.position.set(0, 0, (i - 1) * 0.22);
    add(g, log, 1.1);
  }
  // Cross beams
  for (let i = 0; i < 2; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.6), dark);
    beam.position.set(i ? 0.35 : -0.35, 0.12, 0);
    add(g, beam, 1.12);
  }
  // Rope lashings
  for (const x of [-0.3, 0.3]) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 4, 6), rope);
    r.rotation.y = Math.PI / 2;
    r.position.set(x, 0, 0);
    add(g, r, 1.15);
  }
  g.rotation.set(0.15, 0.5, 0.05);
  return g;
}

function meshHeavyRaft(gm) {
  const g = new THREE.Group();
  const wood = mat(0x6a5a3a, gm);
  const dark = mat(0x4a3a22, gm);
  const rope = mat(0xb89a5a, gm);
  // Thicker log hull — 4 logs, wider
  for (let i = 0; i < 4; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 1.8, 5), i % 2 ? dark : wood);
    log.rotation.z = Math.PI / 2;
    log.position.set(0, 0, (i - 1.5) * 0.24);
    add(g, log, 1.1);
  }
  // Cross beams — 3 heavy beams
  for (let i = 0; i < 3; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.85), dark);
    beam.position.set((i - 1) * 0.5, 0.14, 0);
    add(g, beam, 1.12);
  }
  // Rope lashings
  for (const x of [-0.4, 0.4]) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 4, 6), rope);
    r.rotation.y = Math.PI / 2;
    r.position.set(x, 0, 0);
    add(g, r, 1.15);
  }
  // Small cargo crate
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.35), mat(0x8a7a5a, gm));
  crate.position.set(0.1, 0.3, 0.05);
  crate.rotation.y = 0.3;
  add(g, crate, 1.1);
  g.rotation.set(0.15, 0.5, 0.05);
  return g;
}

function meshChargeBoat(gm) {
  const g = new THREE.Group();
  const hull = mat(0x7a5a3a, gm);
  const deck = mat(0x5a4528, gm);
  const sail = mat(0xe8e0d0, gm);
  const mast = mat(0x4a3a22, gm);
  const accent = mat(0xc45c1a, gm);
  // Hull — stretched box with tapered bow
  const hullMesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 0.55, 3, 1, 1), hull);
  hullMesh.position.y = 0.1;
  add(g, hullMesh, 1.08);
  // Bow taper (cone)
  const bow = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 4), hull);
  bow.rotation.z = -Math.PI / 2;
  bow.position.set(1.0, 0.1, 0);
  bow.scale.set(1, 1, 0.8);
  add(g, bow, 1.1);
  // Stern (flat back)
  const stern = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.35, 0.55), deck);
  stern.position.set(-0.9, 0.15, 0);
  add(g, stern, 1.1);
  // Deck
  const deckMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.5), deck);
  deckMesh.position.y = 0.3;
  add(g, deckMesh, 1.05);
  // Mast
  const mastMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.1, 5), mast);
  mastMesh.position.set(0.2, 0.85, 0);
  add(g, mastMesh, 1.12);
  // Sail — big triangle
  const sailMesh = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.8, 3), sail);
  sailMesh.position.set(0.2, 0.75, 0.05);
  sailMesh.rotation.x = 0.15;
  sailMesh.scale.set(1, 1, 0.15);
  add(g, sailMesh, 1.08);
  // Stripe on sail
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.02), accent);
  stripe.position.set(0.2, 0.72, 0.09);
  add(g, stripe, 1.15);
  // Cabin at stern
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.4), deck);
  cabin.position.set(-0.55, 0.48, 0);
  add(g, cabin, 1.1);
  // Prow ornament (small cone)
  const prow = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 4), accent);
  prow.position.set(1.15, 0.35, 0);
  prow.rotation.z = -Math.PI / 2;
  add(g, prow, 1.15);
  g.rotation.set(0.15, 0.5, 0.05);
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

function meshDriftNose(gm) {
  const g = new THREE.Group();
  const wood = mat(0x5a9aaa, gm);
  const cork = mat(0xc4a06a, gm);
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 6), wood);
  bottle.position.y = 0.1;
  add(g, bottle);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.16, 5), wood);
  neck.position.y = 0.42;
  add(g, neck, 1.1);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.08, 5), cork);
  cap.position.y = 0.52;
  add(g, cap, 1.12);
  const swirl = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 4, 10), mat(0xb8e0e8, gm));
  swirl.rotation.x = Math.PI / 2;
  swirl.position.y = 0.12;
  add(g, swirl, 1.15);
  g.rotation.set(0.3, 0.4, 0.15);
  return g;
}

function meshDeepLedger(gm) {
  const g = new THREE.Group();
  const cover = mat(0x8a7040, gm);
  const page = mat(0xe8dcc0, gm);
  const ink = mat(0x2a2218, gm);
  const book = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.7), cover);
  add(g, book, 1.08);
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.62), page);
  leaf.position.y = 0.08;
  add(g, leaf, 1.05);
  for (let i = 0; i < 3; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.03), ink);
    line.position.set(-0.02, 0.11, 0.15 - i * 0.14);
    add(g, line, 1.05);
  }
  const worm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.22, 3, 5), mat(0x4a9a5a, gm));
  worm.rotation.z = 0.7;
  worm.position.set(0.22, 0.18, -0.1);
  add(g, worm, 1.12);
  g.rotation.set(0.45, 0.35, 0.1);
  return g;
}

function meshRamBlacksmith(gm) {
  const g = new THREE.Group();
  const iron = mat(0xc07040, gm);
  const dark = mat(0x5a4030, gm);
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 5), iron);
  horn.rotation.z = Math.PI / 2;
  horn.position.set(0.15, 0.1, 0);
  add(g, horn, 1.1);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.28), dark);
  base.position.set(-0.15, 0.05, 0);
  add(g, base, 1.08);
  const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), iron);
  rivet.position.set(-0.05, 0.18, 0.12);
  add(g, rivet, 1.15);
  g.rotation.set(0.25, -0.5, 0.1);
  return g;
}

function meshRustReceipt(gm) {
  const g = new THREE.Group();
  const paper = mat(0x6a8a5a, gm);
  const rust = mat(0xa07040, gm);
  const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.04), paper);
  add(g, sheet, 1.08);
  const stamp = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 8), rust);
  stamp.rotation.x = Math.PI / 2;
  stamp.position.set(0.08, -0.12, 0.04);
  add(g, stamp, 1.12);
  const fold = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.05), mat(0x4a6a40, gm));
  fold.position.set(0, 0.32, 0.02);
  add(g, fold, 1.1);
  g.rotation.set(0.2, 0.35, -0.1);
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

function meshSkillVoid(gm) {
  const g = new THREE.Group();
  const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 1.35), mat(0x140428, gm, { transparent: true, opacity: 0.95 }));
  add(g, seam, 1.08);
  const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 1.4), mat(0x44eeff, gm));
  edge.position.x = 0.12;
  add(g, edge, 1.18);
  const blade = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), mat(0x8822cc, gm));
  blade.position.set(0, 0.15, 0.12);
  add(g, blade, 1.16);
  g.rotation.set(0.2, 0.5, 0.1);
  return g;
}

function meshSkillPhoenix(gm) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 6), mat(0xff7a20, gm));
  body.rotation.z = -Math.PI / 2;
  add(g, body, 1.12);
  const wing = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 5), mat(0xffc040, gm));
  wing.rotation.set(0.4, 0, -0.9);
  wing.position.set(-0.05, 0.28, 0);
  add(g, wing, 1.14);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 5), mat(0xfff0c0, gm));
  head.position.set(0.42, 0.08, 0);
  add(g, head, 1.16);
  g.rotation.set(0.25, -0.35, 0.15);
  return g;
}

function meshSkillSingularity(gm) {
  const g = new THREE.Group();
  add(g, new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), mat(0x120018, gm)), 1.08);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 6, 16), mat(0xa060ff, gm));
  ring.rotation.x = 0.7;
  add(g, ring, 1.16);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.04, 6, 14), mat(0xf0c8ff, gm));
  ring2.rotation.y = 0.9;
  add(g, ring2, 1.18);
  g.rotation.set(0.3, 0.4, 0);
  return g;
}

function meshSkillWorldroot(gm) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.9, 6), mat(0x5a3010, gm));
  add(g, trunk);
  for (let i = 0; i < 4; i++) {
    const leaf = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), mat(0x5adf40, gm));
    leaf.position.set(Math.cos(i * 1.6) * 0.28, 0.35 + (i % 2) * 0.18, Math.sin(i * 1.6) * 0.2);
    add(g, leaf, 1.14);
  }
  g.rotation.set(0.15, 0.4, 0);
  return g;
}

function meshSkillBeam(gm) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.35, 8), mat(0xe8f4ff, gm));
  core.rotation.z = Math.PI / 2;
  add(g, core, 1.2);
  const sheath = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.15, 8), mat(0x4488ff, gm, { transparent: true, opacity: 0.7 }));
  sheath.rotation.z = Math.PI / 2;
  add(g, sheath, 1.12);
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 0), mat(0x7ab8ff, gm));
  orb.position.x = -0.7;
  add(g, orb, 1.16);
  g.rotation.set(0.2, -0.3, 0.1);
  return g;
}

function meshSkillSnare(gm) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.045, 6, 14), mat(0x8a7cff, gm));
  ring.rotation.x = Math.PI / 2;
  add(g, ring, 1.14);
  for (let i = 0; i < 4; i++) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.05), mat(0xc8d0ff, gm));
    const a = (i / 4) * Math.PI * 2;
    col.position.set(Math.cos(a) * 0.42, 0.2, Math.sin(a) * 0.42);
    add(g, col, 1.16);
  }
  g.rotation.set(0.25, 0.45, 0);
  return g;
}

function meshSkillGlacier(gm) {
  const g = new THREE.Group();
  const ice = mat(0xc8f0ff, gm);
  for (let i = 0; i < 6; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.55 + (i % 2) * 0.25, 5), ice);
    const a = (i / 6) * Math.PI * 2;
    spike.position.set(Math.cos(a) * 0.32, 0.1, Math.sin(a) * 0.32);
    spike.rotation.z = Math.cos(a) * 0.25;
    add(g, spike, 1.12);
  }
  g.rotation.set(0.2, 0.35, 0);
  return g;
}

const BUILDERS = {
  bait: (gm) => meshBait(gm, { worm: 0x4a9a5a, hook: 0x9aa4b2 }),
  baitCrude: (gm) => meshBait(gm, { worm: 0x8aa090, hook: 0x7a6a58 }),
  baitFresh: (gm) => meshBait(gm, { worm: 0x3aa89a, hook: 0x9aa4b2 }),
  baitScale: (gm) => meshBait(gm, { worm: 0xd4c060, hook: 0xc8b070 }),
  baitAbyss: (gm) => meshBait(gm, { worm: 0x6a40a0, hook: 0x3a2060 }),
  plank: meshPlank,
  repair: meshRepair,
  paste: meshPaste,
  skillFrost: meshSkillFrost,
  skillStorm: meshSkillStorm,
  skillMeteor: meshSkillMeteor,
  skillVoid: meshSkillVoid,
  skillPhoenix: meshSkillPhoenix,
  skillSingularity: meshSkillSingularity,
  skillWorldroot: meshSkillWorldroot,
  skillBeam: meshSkillBeam,
  skillSnare: meshSkillSnare,
  skillGlacier: meshSkillGlacier,
  raft: meshRaft,
  heavyRaft: meshHeavyRaft,
  chargeBoat: meshChargeBoat,
  fishmongerEye: meshFishmongerEye,
  cursedBoat: meshCursedWhisper,
  ghostWake: meshGhostWake,
  driftNose: meshDriftNose,
  deepLedger: meshDeepLedger,
  ramBlacksmith: meshRamBlacksmith,
  rustReceipt: meshRustReceipt,
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
