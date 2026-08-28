/** Cover diorama — red/white lighthouse on a tiny island (flat low-poly) */

import * as THREE from 'three';
import { addOutline, toonMat } from './stylekit.js';

function M(geo, color, gradientMap, outline = 1.05) {
  const m = new THREE.Mesh(geo, toonMat(color, gradientMap));
  if (outline) addOutline(m, outline);
  return m;
}

function lighthouse(gradientMap) {
  const g = new THREE.Group();

  // Stone base
  const base = M(new THREE.CylinderGeometry(2.4, 2.7, 1.1, 6), 0x4a5568, gradientMap, 1.04);
  base.position.y = 0.55;
  g.add(base);

  // Entrance cottage
  const cottage = M(new THREE.BoxGeometry(2.2, 1.6, 1.8), 0xf5f0e6, gradientMap, 1.05);
  cottage.position.set(0, 1.9, 1.5);
  g.add(cottage);
  // Eave sits on the wall top (1.9 + 1.6/2), otherwise the roof swallows the walls.
  const cottageRoof = M(new THREE.ConeGeometry(1.7, 1.25, 4), 0xe85d4c, gradientMap, 1.06);
  cottageRoof.rotation.y = Math.PI / 4;
  cottageRoof.position.set(0, 3.3, 1.5);
  g.add(cottageRoof);
  const door = M(new THREE.BoxGeometry(0.55, 0.95, 0.08), 0xe85d4c, gradientMap, 1.1);
  door.position.set(0, 1.55, 2.42);
  g.add(door);

  // Striped tower (stacked rings)
  const stripes = [
    [0xf5f0e6, 1.15],
    [0xe85d4c, 1.05],
    [0xf5f0e6, 0.95],
    [0xe85d4c, 0.88],
    [0xf5f0e6, 0.8],
    [0xe85d4c, 0.72],
    [0xf5f0e6, 0.66],
  ];
  let y = 1.2;
  for (const [col, r] of stripes) {
    const ring = M(new THREE.CylinderGeometry(r * 0.92, r, 1.15, 10), col, gradientMap, 1.04);
    ring.position.y = y + 0.55;
    g.add(ring);
    // tiny window on white bands
    if (col === 0xf5f0e6) {
      const win = M(new THREE.BoxGeometry(0.22, 0.45, 0.08), 0x2c3a4a, gradientMap, 1.12);
      win.position.set(0, y + 0.55, r * 0.92 + 0.02);
      g.add(win);
    }
    y += 1.12;
  }

  // Lantern gallery
  const deck = M(new THREE.CylinderGeometry(1.05, 1.05, 0.18, 10), 0x3db8a8, gradientMap, 1.06);
  deck.position.y = y + 0.1;
  g.add(deck);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const post = M(new THREE.BoxGeometry(0.08, 0.45, 0.08), 0x2a9a8c, gradientMap, 1.15);
    post.position.set(Math.cos(a) * 0.95, y + 0.4, Math.sin(a) * 0.95);
    g.add(post);
  }
  const rail = M(new THREE.TorusGeometry(0.98, 0.05, 4, 16), 0x3db8a8, gradientMap, 1.1);
  rail.rotation.x = Math.PI / 2;
  rail.position.y = y + 0.55;
  g.add(rail);

  // Lantern room + red cap
  const lantern = M(new THREE.CylinderGeometry(0.55, 0.55, 1.1, 8), 0xfff4c2, gradientMap, 1.06);
  lantern.position.y = y + 1.0;
  g.add(lantern);
  const cap = M(new THREE.ConeGeometry(0.85, 0.9, 8), 0xe85d4c, gradientMap, 1.06);
  cap.position.y = y + 1.85;
  g.add(cap);
  const spire = M(new THREE.CylinderGeometry(0.05, 0.08, 0.55, 5), 0x4a5568, gradientMap, 1.2);
  spire.position.y = y + 2.45;
  g.add(spire);
  const ball = M(new THREE.SphereGeometry(0.12, 6, 6), 0xe85d4c, gradientMap, 1.2);
  ball.position.y = y + 2.75;
  g.add(ball);

  // Soft glow marker (for update)
  g.userData.lantern = lantern;
  return g;
}

function tinySailboat(gradientMap) {
  const g = new THREE.Group();
  const hull = M(new THREE.BoxGeometry(1.6, 0.35, 0.55), 0x2c3a5a, gradientMap, 1.08);
  hull.position.y = 0.15;
  g.add(hull);
  const mast = M(new THREE.CylinderGeometry(0.04, 0.05, 1.6, 5), 0x4a5568, gradientMap, 1.15);
  mast.position.set(0.1, 1.0, 0);
  g.add(mast);
  const sail = M(new THREE.ConeGeometry(0.55, 1.2, 3), 0xf8f4ec, gradientMap, 1.05);
  sail.rotation.z = Math.PI;
  sail.position.set(0.4, 0.95, 0);
  g.add(sail);
  return g;
}

function rock(gradientMap, s = 1) {
  const m = M(new THREE.DodecahedronGeometry(0.55, 0), 0x4a5568, gradientMap, 1.05);
  m.scale.set(s, s * (0.7 + Math.random() * 0.5), s);
  m.rotation.set(Math.random(), Math.random(), Math.random());
  return m;
}

function gull() {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 4), mat);
  g.add(body);
  const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.12), mat);
  wingL.position.set(-0.25, 0.05, 0);
  wingL.rotation.z = 0.25;
  g.add(wingL);
  const wingR = wingL.clone();
  wingR.position.x = 0.25;
  wingR.rotation.z = -0.25;
  g.add(wingR);
  g.userData.skipOutline = true;
  return g;
}

/**
 * @returns {{ root: THREE.Group, update: (t:number)=>void, setActive: (on:boolean)=>void, cameraFrame: (t:number)=>{pos:THREE.Vector3, look:THREE.Vector3} }}
 */
export function createCoverScene(gradientMap) {
  const root = new THREE.Group();
  root.name = 'coverScene';

  // Soft pastel sky
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(280, 24, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `
        varying vec3 vW;
        void main() {
          vW = (modelMatrix * vec4(position,1.0)).xyz;
          gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vW;
        void main() {
          float h = normalize(vW).y;
          vec3 top = vec3(0.55, 0.78, 0.95);
          vec3 mid = vec3(0.72, 0.88, 0.98);
          vec3 hor = vec3(0.88, 0.94, 1.0);
          vec3 col = mix(hor, mid, smoothstep(-0.05, 0.2, h));
          col = mix(col, top, smoothstep(0.15, 0.8, h));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    })
  );
  sky.renderOrder = -50;
  root.add(sky);

  // Calm layered ocean
  const deep = M(new THREE.CircleGeometry(70, 48), 0x5ec8c8, gradientMap, 0);
  deep.rotation.x = -Math.PI / 2;
  deep.position.y = -0.08;
  root.add(deep);

  const midSea = M(new THREE.CircleGeometry(38, 40), 0x7ed8d4, gradientMap, 0);
  midSea.rotation.x = -Math.PI / 2;
  midSea.position.y = -0.04;
  root.add(midSea);

  const near = M(new THREE.CircleGeometry(16, 32), 0xa8ebe6, gradientMap, 0);
  near.rotation.x = -Math.PI / 2;
  near.position.y = -0.01;
  root.add(near);

  // Wide sand spit — lighthouse left, open beach stretches right
  const sand = M(new THREE.CylinderGeometry(6.5, 7.5, 0.7, 8), 0xf0e0c0, gradientMap, 1.03);
  sand.scale.set(2.15, 1, 0.95);
  sand.position.set(1.5, 0.2, 0.5);
  root.add(sand);

  const sandTop = M(new THREE.CylinderGeometry(5.2, 6.0, 0.35, 8), 0xf5ead0, gradientMap, 1.02);
  sandTop.scale.set(2.0, 1, 0.88);
  sandTop.position.set(1.8, 0.55, 0.4);
  root.add(sandTop);

  // Extra beach lobe on the right (fills empty sea, balances lighthouse)
  const sandRight = M(new THREE.CylinderGeometry(4.5, 5.2, 0.55, 7), 0xf2e4c4, gradientMap, 1.03);
  sandRight.scale.set(1.5, 1, 0.85);
  sandRight.position.set(8.5, 0.18, 1.2);
  root.add(sandRight);

  const sandRightTop = M(new THREE.CylinderGeometry(3.4, 4.0, 0.3, 7), 0xf7ecd4, gradientMap, 1.02);
  sandRightTop.scale.set(1.35, 1, 0.8);
  sandRightTop.position.set(8.8, 0.48, 1.0);
  root.add(sandRightTop);

  // Foreground beach tip (toward camera)
  const sandFront = M(new THREE.CylinderGeometry(3.2, 3.8, 0.45, 6), 0xf0e0c0, gradientMap, 1.03);
  sandFront.scale.set(1.3, 1, 0.9);
  sandFront.position.set(4, 0.15, 4.5);
  root.add(sandFront);

  // Coral / scrub accents across the spit
  for (let i = 0; i < 12; i++) {
    const scrub = M(new THREE.DodecahedronGeometry(0.28, 0), 0xe07a4c, gradientMap, 1.1);
    scrub.position.set(-2 + i * 1.15 + Math.random() * 0.4, 0.75, -1.5 + Math.random() * 4);
    scrub.scale.setScalar(0.5 + Math.random() * 0.55);
    root.add(scrub);
  }

  // Rocks — denser on right beach, a few near lighthouse
  const rockSpots = [
    [-5.5, 0.4, 1.8, 1.0], [-4.2, 0.35, -2.0, 0.85], [-6.2, 0.3, -0.5, 1.15],
    [2, 0.35, 3.2, 0.9], [5, 0.4, -1.5, 1.1], [7.5, 0.4, 2.5, 1.25],
    [10, 0.35, 0.2, 1.0], [11.5, 0.3, 2.0, 0.8], [9, 0.4, -1.8, 1.15],
    [3.5, 0.3, 5.5, 0.75], [6.5, 0.35, 4.0, 0.95], [0.5, 0.35, -2.8, 0.7],
  ];
  for (const [x, y, z, s] of rockSpots) {
    const r = rock(gradientMap, s);
    r.position.set(x, y, z);
    root.add(r);
  }

  // Lighthouse — left side of the spit
  const lh = lighthouse(gradientMap);
  lh.position.set(-4.5, 0.55, -0.6);
  lh.scale.setScalar(1.05);
  root.add(lh);

  // Distant sailboat — far right for balance
  const boat = tinySailboat(gradientMap);
  boat.position.set(16, 0.05, -3);
  boat.rotation.y = -0.55;
  root.add(boat);

  // Low horizon clouds (chunky soft blobs, light outline)
  const clouds = [];
  const cloudPos = [
    [-22, 10, -18, 2.4], [8, 12, -28, 3.2], [28, 11, -12, 2.6], [-8, 14, -30, 2.0], [18, 9, 8, 1.8],
  ];
  for (const [x, y, z, s] of cloudPos) {
    const c = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const blob = M(
        new THREE.SphereGeometry(0.9 + (i % 2) * 0.3, 7, 6),
        0xffffff,
        gradientMap,
        1.02
      );
      blob.position.set(i * 0.7 - 1, (i % 2) * 0.25, (i % 3) * 0.15);
      c.add(blob);
    }
    c.position.set(x, y, z);
    c.scale.setScalar(s);
    root.add(c);
    clouds.push(c);
  }

  // Seagulls
  const gulls = [];
  for (let i = 0; i < 5; i++) {
    const bird = gull();
    bird.position.set(-10 + i * 4, 7 + (i % 3), -6 - i);
    root.add(bird);
    gulls.push(bird);
  }

  root.visible = false;
  root.position.set(0, 0, -90);

  function update(t) {
    if (!root.visible) return;
    boat.position.y = 0.05 + Math.sin(t * 1.4) * 0.06;
    boat.rotation.z = Math.sin(t * 1.1) * 0.04;
    if (lh.userData.lantern) {
      const pulse = 0.92 + Math.sin(t * 3) * 0.08;
      lh.userData.lantern.scale.setScalar(pulse);
    }
    clouds.forEach((c, i) => {
      c.position.x += Math.sin(t * 0.12 + i) * 0.003;
    });
    gulls.forEach((b, i) => {
      b.position.y = 7 + (i % 3) + Math.sin(t * 1.5 + i) * 0.4;
      b.position.x += Math.sin(t * 0.3 + i) * 0.01;
      b.rotation.y = Math.sin(t * 0.5 + i) * 0.3;
    });
  }

  function setActive(on) {
    root.visible = on;
  }

  /** Frame: lighthouse on left third, open beach to the right */
  function cameraFrame(t) {
    const ox = root.position.x;
    const oy = root.position.y;
    const oz = root.position.z;
    const sway = Math.sin(t * 0.09) * 0.6;
    return {
      pos: new THREE.Vector3(ox + 2 + sway * 0.25, oy + 7.5, oz + 18 + sway * 0.15),
      look: new THREE.Vector3(ox + 1.5, oy + 4.5, oz),
    };
  }

  return { root, update, setActive, cameraFrame };
}
