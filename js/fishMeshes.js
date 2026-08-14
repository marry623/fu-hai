import * as THREE from 'three';
import { addOutline, toonMat } from './stylekit.js';

/** Reference palette matching the concept sheet */
const C = {
  puffer: 0xd4a574,
  swordfish: 0x3a5a7a,
  icefish: 0xb8e8ff,
  dragonhead: 0x9aa4b2,
  dragonFin: 0xf5c542,
  spiral: 0x2a8a8a,
  octopus: 0xc45a5a,
  jellyfish: 0x8ec8e8,
  voidEel: 0x4a2a6a,
  ink: 0x5a4a6a,
  crab: 0xe03030,
  seaSnake: 0x6ab0d4,
  seaSnakeAlt: 0xf0f4f8,
  lobster: 0xb02020,
  shell: 0xa88868,
  stingray: 0x4a4a5a,
  coral: 0xe05030,
  mirrorJelly: 0xd8eef8,
  barnacle: 0x8a8a8a,
  bounce: 0x3a7ac8,
  dive: 0x2a5a9a,
  diveFin: 0xf0c040,
  leyline: 0x4a3a28,
  leyGlow: 0x40e0c0,
  sailfish: 0x2a4a8a,
  radar: 0x5a6a50,
  radarGlow: 0x40ff40,
  storm: 0x2a3a6a,
  stormBolt: 0xe8f0ff,
  chrono: 0xd4a020,
  chronoBlue: 0x3a6a9a,
  food: 0x4ecdc4,
  glue: 0xffe066,
};

function mat(color, gm) {
  return toonMat(color, gm);
}

function add(g, mesh, outlineScale = 1.1) {
  g.add(mesh);
  addOutline(mesh, outlineScale);
  return mesh;
}

function eyePair(g, gm, x, y, z, s = 0.07) {
  const white = mat(0xffffff, gm);
  const black = mat(0x111111, gm);
  for (const side of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(s, 5, 4), white);
    e.position.set(x, y, side * z);
    add(g, e, 1.2);
    const p = new THREE.Mesh(new THREE.SphereGeometry(s * 0.45, 4, 4), black);
    p.position.set(x + s * 0.5, y, side * z);
    g.add(p);
  }
}

function fishBody(g, gm, color, opts = {}) {
  const {
    len = 0.9, h = 0.45, w = 0.4, nose = 0.35, tail = true,
  } = opts;
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 5), mat(color, gm));
  body.scale.set(len, h, w);
  add(g, body, 1.08);
  if (nose) {
    const n = new THREE.Mesh(new THREE.ConeGeometry(0.12, nose, 5), mat(color, gm));
    n.rotation.z = -Math.PI / 2;
    n.position.x = len * 0.28;
    add(g, n, 1.12);
  }
  if (tail) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.35, 5), mat(color, gm));
    t.rotation.z = Math.PI / 2;
    t.position.x = -len * 0.35;
    add(g, t, 1.12);
  }
  return body;
}

function dorsal(g, gm, color, x, y, h = 0.35) {
  const f = new THREE.Mesh(new THREE.ConeGeometry(0.12, h, 4), mat(color, gm));
  f.position.set(x, y, 0);
  add(g, f, 1.15);
  return f;
}

/** Builders keyed by catalog id */
const BUILDERS = {
  puffer(g, gm) {
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.48, 0), mat(C.puffer, gm));
    add(g, body, 1.08);
    for (let i = 0; i < 14; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 4), mat(0xb89060, gm));
      const phi = Math.acos(2 * (i / 14) - 1);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      spike.position.set(
        Math.sin(phi) * Math.cos(theta) * 0.48,
        Math.sin(phi) * Math.sin(theta) * 0.48,
        Math.cos(phi) * 0.48
      );
      spike.lookAt(0, 0, 0);
      spike.rotateX(Math.PI);
      add(g, spike, 1.25);
    }
    eyePair(g, gm, 0.28, 0.12, 0.28, 0.06);
  },

  swordfish(g, gm) {
    fishBody(g, gm, C.swordfish, { len: 1.1, h: 0.35, w: 0.28, nose: 0 });
    const bill = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.95, 5), mat(0xc0d0e0, gm));
    bill.rotation.z = -Math.PI / 2;
    bill.position.x = 0.85;
    add(g, bill, 1.15);
    dorsal(g, gm, C.swordfish, 0.05, 0.32, 0.28);
    eyePair(g, gm, 0.25, 0.05, 0.18, 0.05);
  },

  icefish(g, gm) {
    const m = mat(C.icefish, gm);
    m.transparent = true;
    m.opacity = 0.92;
    fishBody(g, gm, C.icefish, { len: 0.95, h: 0.4, w: 0.35 });
    dorsal(g, gm, 0xd8f4ff, 0, 0.35, 0.3);
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), mat(0xffffff, gm));
    crystal.position.set(0.15, 0.2, 0);
    add(g, crystal, 1.2);
    eyePair(g, gm, 0.28, 0.06, 0.2, 0.05);
  },

  dragonhead(g, gm) {
    fishBody(g, gm, C.dragonhead, { len: 1.0, h: 0.42, w: 0.38 });
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.28), mat(C.dragonhead, gm));
    jaw.position.set(0.4, -0.08, 0);
    add(g, jaw, 1.12);
    for (const s of [-1, 1]) {
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 4), mat(C.dragonFin, gm));
      fin.position.set(-0.1, 0.05, s * 0.35);
      fin.rotation.x = s * 0.6;
      add(g, fin, 1.15);
    }
    dorsal(g, gm, C.dragonFin, 0, 0.38, 0.32);
    eyePair(g, gm, 0.3, 0.1, 0.22, 0.06);
  },

  spiral(g, gm) {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 6, 5), mat(C.spiral, gm));
    body.scale.set(1.1, 0.7, 0.7);
    body.position.x = 0.15;
    add(g, body, 1.08);
    // coiled spiral tail as stacked torus segments
    const spiralRoot = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.18 - i * 0.02, 0.07, 4, 8),
        mat(C.spiral, gm)
      );
      ring.position.set(-0.25 - i * 0.12, 0, 0);
      ring.rotation.y = Math.PI / 2;
      ring.rotation.z = i * 0.4;
      add(spiralRoot, ring, 1.12);
    }
    g.add(spiralRoot);
    g.userData.spinPart = spiralRoot;
    eyePair(g, gm, 0.35, 0.08, 0.22, 0.055);
  },

  octopus(g, gm) {
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 6, 5), mat(C.octopus, gm));
    head.position.y = 0.15;
    add(g, head, 1.08);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const tent = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.45, 3, 5), mat(C.octopus, gm));
      tent.position.set(Math.cos(a) * 0.25, -0.25, Math.sin(a) * 0.25);
      tent.rotation.z = Math.cos(a) * 0.8;
      tent.rotation.x = Math.sin(a) * 0.8;
      add(g, tent, 1.18);
    }
    eyePair(g, gm, 0.2, 0.25, 0.25, 0.08);
  },

  jellyfish(g, gm) {
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 4), mat(C.jellyfish, gm));
    bell.scale.set(1, 0.65, 1);
    bell.position.y = 0.2;
    add(g, bell, 1.08);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.015, 0.7, 4), mat(0x6ab0d0, gm));
      t.position.set(Math.cos(a) * 0.2, -0.35, Math.sin(a) * 0.2);
      add(g, t, 1.25);
    }
  },

  voidEel(g, gm) {
    const segments = 6;
    for (let i = 0; i < segments; i++) {
      const seg = new THREE.Mesh(new THREE.SphereGeometry(0.14 - i * 0.01, 5, 4), mat(C.voidEel, gm));
      const t = i / (segments - 1);
      seg.position.set(0.5 - t * 1.2, Math.sin(t * Math.PI) * 0.15, 0);
      seg.scale.set(1.3, 0.8, 0.8);
      add(g, seg, 1.12);
    }
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), mat(0xff66aa, gm));
    eye.position.set(0.45, 0.08, 0.1);
    add(g, eye, 1.2);
  },

  ink(g, gm) {
    const mantle = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 6), mat(C.ink, gm));
    mantle.rotation.z = Math.PI / 2;
    mantle.position.x = -0.05;
    add(g, mantle, 1.08);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 5, 4), mat(C.ink, gm));
    head.position.x = 0.35;
    add(g, head, 1.1);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI - Math.PI / 2;
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.35, 2, 4), mat(0x3a2a4a, gm));
      arm.position.set(0.5, Math.sin(a) * 0.15, Math.cos(a) * 0.2);
      arm.rotation.z = -0.8;
      add(g, arm, 1.2);
    }
    eyePair(g, gm, 0.4, 0.08, 0.16, 0.05);
  },

  crab(g, gm) {
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 4), mat(C.crab, gm));
    shell.scale.set(1.3, 0.55, 1.1);
    add(g, shell, 1.08);
    for (const s of [-1, 1]) {
      const claw = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.18), mat(C.crab, gm));
      claw.position.set(0.35, 0.05, s * 0.35);
      add(g, claw, 1.15);
      const pincer = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 4), mat(0xc02020, gm));
      pincer.position.set(0.5, 0.05, s * 0.4);
      pincer.rotation.z = -Math.PI / 2;
      add(g, pincer, 1.2);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI - Math.PI / 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 4), mat(C.crab, gm));
      leg.position.set(Math.cos(a) * 0.15 - 0.1, -0.2, Math.sin(a) * 0.4);
      leg.rotation.z = 0.9;
      add(g, leg, 1.25);
    }
    eyePair(g, gm, 0.25, 0.2, 0.2, 0.05);
  },

  seaSnake(g, gm) {
    for (let i = 0; i < 8; i++) {
      const col = i % 2 === 0 ? C.seaSnake : C.seaSnakeAlt;
      const seg = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 4), mat(col, gm));
      const t = i / 7;
      seg.position.set(0.55 - t * 1.3, Math.sin(t * Math.PI * 2) * 0.12, 0);
      seg.scale.set(1.2, 0.85, 0.85);
      add(g, seg, 1.15);
    }
    eyePair(g, gm, 0.5, 0.05, 0.1, 0.04);
  },

  lobster(g, gm) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 0.35), mat(C.lobster, gm));
    add(g, body, 1.08);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.28), mat(C.lobster, gm));
    tail.position.set(-0.4, -0.02, 0);
    add(g, tail, 1.1);
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.35, 5), mat(C.lobster, gm));
      arm.position.set(0.25, 0.05, s * 0.28);
      arm.rotation.z = -0.5;
      arm.rotation.y = s * 0.4;
      add(g, arm, 1.18);
      const claw = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.2), mat(0x901010, gm));
      claw.position.set(0.48, 0.08, s * 0.38);
      add(g, claw, 1.15);
    }
    eyePair(g, gm, 0.28, 0.15, 0.18, 0.05);
  },

  shell(g, gm) {
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.42, 6, 4), mat(C.shell, gm));
    sh.scale.set(1.15, 0.7, 1.0);
    add(g, sh, 1.08);
    for (let i = 0; i < 4; i++) {
      const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.28 + i * 0.04, 0.035, 4, 10), mat(0x8a7050, gm));
      ridge.rotation.x = Math.PI / 2;
      ridge.position.y = 0.05 + i * 0.04;
      add(g, ridge, 1.2);
    }
    eyePair(g, gm, 0.3, 0.1, 0.25, 0.05);
  },

  stingray(g, gm) {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 4), mat(C.stingray, gm));
    wing.scale.set(1.4, 0.22, 1.5);
    add(g, wing, 1.06);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 0.8, 5), mat(C.stingray, gm));
    tail.rotation.z = Math.PI / 2;
    tail.position.x = -0.7;
    add(g, tail, 1.15);
    const barb = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 4), mat(0x222222, gm));
    barb.position.set(-0.95, 0.05, 0);
    add(g, barb, 1.25);
    eyePair(g, gm, 0.25, 0.08, 0.2, 0.045);
  },

  coral(g, gm) {
    for (let i = 0; i < 5; i++) {
      const branch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.1, 0.45 + Math.random() * 0.2, 5),
        mat(i % 2 ? C.coral : 0xff7040, gm)
      );
      const a = (i / 5) * Math.PI * 2;
      branch.position.set(Math.cos(a) * 0.15, 0.15, Math.sin(a) * 0.15);
      branch.rotation.z = Math.cos(a) * 0.35;
      branch.rotation.x = Math.sin(a) * 0.35;
      add(g, branch, 1.12);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 4), mat(0xff9060, gm));
      tip.position.copy(branch.position);
      tip.position.y += 0.3;
      add(g, tip, 1.2);
    }
  },

  mirrorJelly(g, gm) {
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.42, 6, 4), mat(C.mirrorJelly, gm));
    bell.scale.set(1, 0.6, 1);
    bell.position.y = 0.2;
    add(g, bell, 1.08);
    const shine = new THREE.Mesh(new THREE.CircleGeometry(0.2, 6), mat(0xffffff, gm));
    shine.position.set(0.1, 0.35, 0.25);
    shine.lookAt(2, 2, 2);
    add(g, shine, 1.2);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.012, 0.65, 4), mat(0xc8e4f0, gm));
      t.position.set(Math.cos(a) * 0.18, -0.3, Math.sin(a) * 0.18);
      add(g, t, 1.25);
    }
  },

  barnacle(g, gm) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.55, 6), mat(C.barnacle, gm));
    cone.position.y = 0.1;
    add(g, cone, 1.08);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.12, 6), mat(0x6a6a6a, gm));
    rim.position.y = 0.35;
    add(g, rim, 1.12);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.12, 6), mat(0x222222, gm));
    hole.rotation.x = -Math.PI / 2;
    hole.position.y = 0.42;
    g.add(hole);
  },

  bounce(g, gm) {
    fishBody(g, gm, C.bounce, { len: 0.85, h: 0.35, w: 0.32 });
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.28, 5, 4), mat(C.bounce, gm));
      wing.scale.set(0.9, 0.15, 1.6);
      wing.position.set(0.05, 0.05, s * 0.45);
      wing.rotation.y = s * 0.2;
      add(g, wing, 1.1);
    }
    eyePair(g, gm, 0.28, 0.06, 0.18, 0.05);
  },

  dive(g, gm) {
    fishBody(g, gm, C.dive, { len: 1.0, h: 0.38, w: 0.32 });
    dorsal(g, gm, C.diveFin, 0, 0.35, 0.28);
    const tailFin = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.35, 5), mat(C.diveFin, gm));
    tailFin.rotation.z = Math.PI / 2;
    tailFin.position.x = -0.55;
    add(g, tailFin, 1.12);
    eyePair(g, gm, 0.3, 0.05, 0.18, 0.05);
  },

  leyline(g, gm) {
    fishBody(g, gm, C.leyline, { len: 0.95, h: 0.42, w: 0.4 });
    for (let i = 0; i < 5; i++) {
      const vein = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), mat(C.leyGlow, gm));
      vein.position.set(0.05, -0.1 + i * 0.08, (i % 2) * 0.12 - 0.06);
      vein.rotation.z = (i - 2) * 0.15;
      add(g, vein, 1.2);
    }
    eyePair(g, gm, 0.28, 0.08, 0.2, 0.05);
  },

  sailfish(g, gm) {
    fishBody(g, gm, C.sailfish, { len: 1.05, h: 0.32, w: 0.28, nose: 0 });
    const bill = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.7, 5), mat(0xa0b0c8, gm));
    bill.rotation.z = -Math.PI / 2;
    bill.position.x = 0.75;
    add(g, bill, 1.15);
    // huge sail dorsal
    const sail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.06), mat(C.sailfish, gm));
    sail.position.set(0.05, 0.42, 0);
    add(g, sail, 1.1);
    const sailTip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 4), mat(0x1a3a6a, gm));
    sailTip.position.set(-0.25, 0.55, 0);
    add(g, sailTip, 1.15);
    eyePair(g, gm, 0.28, 0.05, 0.16, 0.045);
  },

  radar(g, gm) {
    fishBody(g, gm, C.radar, { len: 0.9, h: 0.4, w: 0.38 });
    const dish = new THREE.Mesh(new THREE.CircleGeometry(0.28, 10), mat(0x1a2a1a, gm));
    dish.position.set(0.05, 0.15, 0.32);
    add(g, dish, 1.15);
    const grid = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.26, 8), mat(C.radarGlow, gm));
    grid.position.set(0.05, 0.15, 0.33);
    add(g, grid, 1.2);
    const sweep = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.03), mat(C.radarGlow, gm));
    sweep.position.set(0.12, 0.15, 0.34);
    add(g, sweep, 1.25);
    g.userData.spinPart = sweep;
    eyePair(g, gm, 0.28, 0.06, 0.18, 0.05);
  },

  storm(g, gm) {
    fishBody(g, gm, C.storm, { len: 0.95, h: 0.4, w: 0.36 });
    for (let i = 0; i < 4; i++) {
      const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.04), mat(C.stormBolt, gm));
      bolt.position.set(-0.1 + i * 0.12, 0.05, 0.28);
      bolt.rotation.z = 0.4 + i * 0.1;
      add(g, bolt, 1.2);
    }
    dorsal(g, gm, 0x4a5a9a, 0, 0.35, 0.3);
    eyePair(g, gm, 0.28, 0.06, 0.2, 0.05);
  },

  chrono(g, gm) {
    fishBody(g, gm, C.chrono, { len: 0.95, h: 0.4, w: 0.38 });
    const dial = new THREE.Mesh(new THREE.CircleGeometry(0.22, 10), mat(C.chronoBlue, gm));
    dial.position.set(0.05, 0.08, 0.3);
    add(g, dial, 1.15);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.03), mat(0xffe080, gm));
    hand.position.set(0.1, 0.08, 0.32);
    add(g, hand, 1.25);
    g.userData.spinPart = hand;
    for (let i = 0; i < 4; i++) {
      const gear = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 8), mat(0xb8860b, gm));
      const a = (i / 4) * Math.PI * 2;
      gear.position.set(Math.cos(a) * 0.25 - 0.15, Math.sin(a) * 0.2, 0.25);
      gear.rotation.x = Math.PI / 2;
      add(g, gear, 1.2);
    }
    eyePair(g, gm, 0.3, 0.08, 0.2, 0.05);
  },

  food(g, gm) {
    fishBody(g, gm, C.food, { len: 0.8, h: 0.38, w: 0.35 });
    dorsal(g, gm, 0x3aad9a, 0, 0.32, 0.25);
    eyePair(g, gm, 0.25, 0.05, 0.18, 0.05);
  },

  glue(g, gm) {
    fishBody(g, gm, C.glue, { len: 0.8, h: 0.4, w: 0.36 });
    const blob = new THREE.Mesh(new THREE.SphereGeometry(0.15, 5, 4), mat(0xfff0a0, gm));
    blob.position.set(0.1, -0.2, 0);
    add(g, blob, 1.15);
    eyePair(g, gm, 0.25, 0.05, 0.18, 0.05);
  },
};

/**
 * Low-poly fish matching the concept sheet — readable silhouette per species.
 */
export function createFishMesh(fishId, gradientMap, scale = 1) {
  const g = new THREE.Group();
  g.userData.fishId = fishId;
  const builder = BUILDERS[fishId] || BUILDERS.food;
  builder(g, gradientMap);
  g.scale.setScalar(scale);
  g.userData.baseScale = scale;
  // Face +X as "forward" for mounting helpers
  return g;
}

export function setFishVitalityVisual(mesh, vitality) {
  if (!mesh) return;
  const t = Math.max(0, Math.min(1, vitality / 100));
  mesh.traverse((o) => {
    if (o.isMesh && o.material?.color && !o.userData.isOutline) {
      const c = o.material.color;
      if (!o.userData._baseColor) {
        o.userData._baseColor = c.clone();
      }
      const b = o.userData._baseColor;
      const gray = (b.r + b.g + b.b) / 3;
      c.r = b.r * t + gray * (1 - t);
      c.g = b.g * t + gray * (1 - t);
      c.b = b.b * t + gray * (1 - t);
    }
  });
  const breathe = 1 + Math.sin(performance.now() * 0.008) * (0.03 + (1 - t) * 0.05);
  mesh.scale.setScalar((mesh.userData.baseScale || 1) * breathe);
}

export function animateFishMesh(mesh, dt) {
  if (!mesh) return;
  if (mesh.userData.spinPart) {
    mesh.userData.spinPart.rotation.z += dt * 3;
    mesh.userData.spinPart.rotation.y += dt * 2;
  }
}
