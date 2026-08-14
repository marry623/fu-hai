/** 3D hub island — bright pastel look matching the cover lighthouse scene */

import * as THREE from 'three';
import { addOutline, toonMat } from './stylekit.js';

function M(geo, color, gradientMap, outline = 1.05) {
  const m = new THREE.Mesh(geo, toonMat(color, gradientMap));
  if (outline) addOutline(m, outline);
  return m;
}

function tagHit(obj, id) {
  obj.traverse((c) => { c.userData.hubId = id; });
  obj.userData.hubId = id;
  return obj;
}

function palm(gradientMap, s = 1) {
  const g = new THREE.Group();
  const trunk = M(new THREE.CylinderGeometry(0.16, 0.24, 2.3, 5), 0x8b5a2b, gradientMap, 1.1);
  trunk.position.y = 1.15;
  trunk.rotation.z = 0.06;
  g.add(trunk);
  for (let i = 0; i < 6; i++) {
    const f = M(new THREE.ConeGeometry(0.85, 1.5, 4), i % 2 ? 0x4caf50 : 0x3d9e3a, gradientMap, 1.07);
    f.position.set(Math.sin(i * 1.05) * 0.35, 2.35, Math.cos(i * 1.05) * 0.35);
    f.rotation.set(0.9, i * 1.05, 0.1);
    g.add(f);
  }
  g.scale.setScalar(s);
  return g;
}

function rock(gradientMap, s = 1) {
  const m = M(new THREE.DodecahedronGeometry(0.5, 0), 0x6b7a88, gradientMap, 1.05);
  m.scale.set(s, s * (0.65 + Math.random() * 0.45), s);
  m.rotation.set(Math.random(), Math.random(), Math.random());
  return m;
}

function bush(gradientMap, color = 0x5cb85c) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const b = M(new THREE.IcosahedronGeometry(0.35, 0), color, gradientMap, 1.08);
    b.position.set((i - 1) * 0.25, 0.25 + (i % 2) * 0.1, (i % 2) * 0.2);
    b.scale.setScalar(0.7 + Math.random() * 0.4);
    g.add(b);
  }
  return g;
}

function crate(gradientMap) {
  return M(new THREE.BoxGeometry(0.55, 0.55, 0.55), 0xc4a06a, gradientMap, 1.1);
}

function barrel(gradientMap) {
  return M(new THREE.CylinderGeometry(0.32, 0.35, 0.7, 8), 0xb07a45, gradientMap, 1.1);
}

function cloud(gradientMap) {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const b = M(new THREE.SphereGeometry(0.85 + (i % 2) * 0.25, 7, 6), 0xffffff, gradientMap, 1.02);
    b.position.set(i * 0.65 - 0.9, (i % 2) * 0.2, (i % 3) * 0.12);
    g.add(b);
  }
  return g;
}

function gull() {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 4), mat));
  const wL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.1), mat);
  wL.position.set(-0.22, 0.04, 0);
  wL.rotation.z = 0.3;
  g.add(wL);
  const wR = wL.clone();
  wR.position.x = 0.22;
  wR.rotation.z = -0.3;
  g.add(wR);
  return g;
}

/** 出港 — 长码头 + 仓库 + 帆船 */
function buildPort(gradientMap) {
  const g = new THREE.Group();

  // pier planks
  for (let i = 0; i < 7; i++) {
    const plank = M(new THREE.BoxGeometry(1.05, 0.18, 2.4), i % 2 ? 0xb8895a : 0xa67c52, gradientMap, 1.04);
    plank.position.set(-3 + i * 1.05, 0.55, 0);
    g.add(plank);
  }
  for (let i = 0; i < 5; i++) {
    for (const z of [-1.05, 1.05]) {
      const post = M(new THREE.CylinderGeometry(0.12, 0.14, 1.15, 5), 0x7a5230, gradientMap, 1.12);
      post.position.set(-2.5 + i * 1.4, 0.2, z);
      g.add(post);
    }
  }
  // harbor office
  const office = M(new THREE.BoxGeometry(2.4, 1.8, 2.0), 0xf5efe0, gradientMap);
  office.position.set(-2.2, 1.5, -0.1);
  g.add(office);
  const officeRoof = M(new THREE.ConeGeometry(1.9, 1.1, 4), 0x3db8a8, gradientMap, 1.06);
  officeRoof.rotation.y = Math.PI / 4;
  officeRoof.position.set(-2.2, 2.7, -0.1);
  g.add(officeRoof);
  const door = M(new THREE.BoxGeometry(0.55, 1.0, 0.08), 0xe85d4c, gradientMap, 1.12);
  door.position.set(-2.2, 1.15, 0.95);
  g.add(door);
  const win = M(new THREE.BoxGeometry(0.4, 0.45, 0.08), 0x7dd3fc, gradientMap, 1.12);
  win.position.set(-1.4, 1.7, 0.95);
  g.add(win);

  // lantern posts
  for (const x of [0.5, 2.5]) {
    const pole = M(new THREE.CylinderGeometry(0.07, 0.08, 2.0, 5), 0x5a4632, gradientMap, 1.15);
    pole.position.set(x, 1.5, 1.0);
    g.add(pole);
    const lamp = M(new THREE.SphereGeometry(0.2, 6, 6), 0xffe566, gradientMap, 1.15);
    lamp.position.set(x, 2.55, 1.0);
    g.add(lamp);
  }

  // sailboat at pier end
  const hull = M(new THREE.BoxGeometry(2.8, 0.65, 1.1), 0x6b3f1f, gradientMap, 1.07);
  hull.position.set(3.2, 0.35, 2.6);
  g.add(hull);
  const bow = M(new THREE.ConeGeometry(0.6, 1.2, 4), 0x5a3218, gradientMap, 1.07);
  bow.rotation.z = -Math.PI / 2;
  bow.position.set(4.6, 0.4, 2.6);
  g.add(bow);
  const mast = M(new THREE.CylinderGeometry(0.06, 0.08, 2.8, 5), 0x4a2f14, gradientMap, 1.15);
  mast.position.set(3.0, 1.85, 2.6);
  g.add(mast);
  const sail = M(new THREE.ConeGeometry(0.95, 1.9, 3), 0xf8f4ec, gradientMap, 1.04);
  sail.rotation.z = Math.PI;
  sail.position.set(3.55, 1.7, 2.6);
  g.add(sail);
  const flag = M(new THREE.BoxGeometry(0.4, 0.25, 0.05), 0xff6b4a, gradientMap, 1.15);
  flag.position.set(3.2, 3.3, 2.6);
  g.add(flag);

  // crates / rope barrels
  const c1 = crate(gradientMap); c1.position.set(-0.5, 0.9, -0.9); g.add(c1);
  const c2 = crate(gradientMap); c2.position.set(0.2, 0.9, -0.9); g.add(c2);
  const b1 = barrel(gradientMap); b1.position.set(1.2, 0.95, -0.85); g.add(b1);

  // life ring
  const ring = M(new THREE.TorusGeometry(0.35, 0.1, 6, 12), 0xe85d4c, gradientMap, 1.12);
  ring.position.set(-2.2, 2.0, 1.05);
  g.add(ring);

  return tagHit(g, 'depart');
}

/** 整备 — 船坞 + 脚手架 + 干船坞 */
function buildShipyard(gradientMap) {
  const g = new THREE.Group();

  const platform = M(new THREE.BoxGeometry(5.5, 0.3, 4.5), 0xd4b896, gradientMap, 1.04);
  platform.position.y = 0.25;
  g.add(platform);

  // open workshop shed
  const back = M(new THREE.BoxGeometry(4.2, 2.4, 0.25), 0xf0e6d4, gradientMap);
  back.position.set(0, 1.5, -1.6);
  g.add(back);
  const sideL = M(new THREE.BoxGeometry(0.25, 2.4, 2.8), 0xe8dcc8, gradientMap);
  sideL.position.set(-2.0, 1.5, -0.3);
  g.add(sideL);
  const roof = M(new THREE.BoxGeometry(4.8, 0.2, 3.6), 0xe8a04a, gradientMap, 1.05);
  roof.position.set(0, 2.85, -0.4);
  roof.rotation.z = 0.06;
  g.add(roof);
  // roof beams
  for (let i = 0; i < 3; i++) {
    const beam = M(new THREE.BoxGeometry(0.15, 0.15, 3.2), 0x8b5a2b, gradientMap, 1.12);
    beam.position.set(-1.2 + i * 1.2, 2.65, -0.3);
    g.add(beam);
  }

  // boat under repair
  const cradle = M(new THREE.BoxGeometry(3.0, 0.4, 1.4), 0x8b7355, gradientMap);
  cradle.position.set(0.3, 0.6, 1.2);
  g.add(cradle);
  const hull = M(new THREE.BoxGeometry(2.6, 0.9, 1.1), 0x6b4a2e, gradientMap, 1.07);
  hull.position.set(0.3, 1.25, 1.2);
  g.add(hull);
  const rib = M(new THREE.BoxGeometry(0.12, 0.8, 1.0), 0x4a3220, gradientMap, 1.12);
  rib.position.set(0.3, 1.7, 1.2);
  g.add(rib);

  // crane
  const pole = M(new THREE.CylinderGeometry(0.12, 0.14, 4.0, 6), 0x7a8a98, gradientMap, 1.1);
  pole.position.set(2.0, 2.2, 0.5);
  g.add(pole);
  const arm = M(new THREE.BoxGeometry(2.8, 0.18, 0.18), 0x7a8a98, gradientMap, 1.1);
  arm.position.set(0.8, 4.1, 0.5);
  g.add(arm);
  const hook = M(new THREE.BoxGeometry(0.1, 0.8, 0.1), 0x4a5568, gradientMap, 1.15);
  hook.position.set(-0.4, 3.6, 0.5);
  g.add(hook);

  // tools & materials
  const saw = M(new THREE.BoxGeometry(1.2, 0.12, 0.35), 0xa09080, gradientMap, 1.1);
  saw.position.set(-1.4, 0.7, 1.5);
  g.add(saw);
  for (let i = 0; i < 3; i++) {
    const plank = M(new THREE.BoxGeometry(1.6, 0.12, 0.35), 0xc4a06a, gradientMap, 1.1);
    plank.position.set(-1.5, 0.55 + i * 0.15, -0.2 + i * 0.1);
    g.add(plank);
  }
  const b1 = barrel(gradientMap); b1.position.set(1.8, 0.7, -1.0); g.add(b1);
  const c1 = crate(gradientMap); c1.position.set(-1.8, 0.7, 0.8); g.add(c1);

  // hanging cloth
  const cloth = M(new THREE.BoxGeometry(1.4, 1.0, 0.06), 0x7dd3fc, gradientMap, 1.08);
  cloth.position.set(1.5, 1.8, -1.45);
  g.add(cloth);

  return tagHit(g, 'prep');
}

/** 商店 — 彩色市集棚 + 货摊 */
function buildShop(gradientMap) {
  const g = new THREE.Group();

  const floor = M(new THREE.CylinderGeometry(2.8, 3.0, 0.25, 8), 0xe8d5a3, gradientMap, 1.03);
  floor.position.y = 0.2;
  g.add(floor);

  // main stall
  const counter = M(new THREE.BoxGeometry(3.4, 1.0, 1.2), 0xf5ead0, gradientMap);
  counter.position.set(0, 0.85, 0.6);
  g.add(counter);
  for (const x of [-1.5, 1.5]) {
    const post = M(new THREE.CylinderGeometry(0.09, 0.09, 2.8, 5), 0x8b5a2b, gradientMap, 1.12);
    post.position.set(x, 1.6, -0.5);
    g.add(post);
    const post2 = M(new THREE.CylinderGeometry(0.09, 0.09, 2.8, 5), 0x8b5a2b, gradientMap, 1.12);
    post2.position.set(x, 1.6, 1.0);
    g.add(post2);
  }
  // striped awning
  const colors = [0xff6b9d, 0xffe066, 0xff6b9d, 0xffe066, 0xff6b9d];
  for (let i = 0; i < 5; i++) {
    const stripe = M(new THREE.BoxGeometry(0.72, 0.12, 2.6), colors[i], gradientMap, 1.04);
    stripe.position.set(-1.44 + i * 0.72, 2.95, 0.25);
    stripe.rotation.x = -0.2;
    g.add(stripe);
  }

  // goods
  const goods = [0x3ecfba, 0xffe066, 0xe85d4c, 0xa78bfa, 0x7dd3fc, 0xf472b6];
  for (let i = 0; i < 6; i++) {
    const jar = M(new THREE.CylinderGeometry(0.2, 0.24, 0.5, 6), goods[i], gradientMap, 1.12);
    jar.position.set(-1.2 + i * 0.48, 1.55, 0.55);
    g.add(jar);
  }
  // hanging fish / nets
  for (let i = 0; i < 3; i++) {
    const fish = M(new THREE.ConeGeometry(0.2, 0.7, 4), 0x4ecdc4, gradientMap, 1.12);
    fish.rotation.z = Math.PI / 2;
    fish.position.set(-0.8 + i * 0.7, 2.35, 1.15);
    g.add(fish);
  }
  const basket = M(new THREE.CylinderGeometry(0.45, 0.4, 0.4, 8), 0xd4a017, gradientMap, 1.1);
  basket.position.set(-1.6, 0.7, 1.4);
  g.add(basket);
  const fruit = M(new THREE.SphereGeometry(0.18, 6, 6), 0xff6b4a, gradientMap, 1.15);
  fruit.position.set(-1.5, 1.0, 1.4);
  g.add(fruit);

  // side cart
  const cart = M(new THREE.BoxGeometry(1.4, 0.7, 1.0), 0xc4a574, gradientMap);
  cart.position.set(2.4, 0.7, -0.6);
  g.add(cart);
  const wheel = M(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 8), 0x4a3a2a, gradientMap, 1.12);
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(2.4, 0.35, 0.05);
  g.add(wheel);

  const sign = M(new THREE.BoxGeometry(1.6, 0.6, 0.1), 0xffeb70, gradientMap, 1.1);
  sign.position.set(0, 2.2, 1.3);
  g.add(sign);

  return tagHit(g, 'shop');
}

/** 图鉴 — 白墙展馆 + 鱼雕塑 */
function buildCodex(gradientMap) {
  const g = new THREE.Group();

  const body = M(new THREE.BoxGeometry(3.4, 2.6, 3.0), 0xf7f4ff, gradientMap);
  body.position.y = 1.4;
  g.add(body);
  const trim = M(new THREE.BoxGeometry(3.6, 0.25, 3.2), 0xa78bfa, gradientMap, 1.05);
  trim.position.y = 2.75;
  g.add(trim);
  const roof = M(new THREE.ConeGeometry(2.6, 1.5, 4), 0x818cf8, gradientMap, 1.05);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 3.55;
  g.add(roof);

  const door = M(new THREE.BoxGeometry(0.85, 1.4, 0.1), 0x6366f1, gradientMap, 1.1);
  door.position.set(0, 0.95, 1.55);
  g.add(door);
  for (const x of [-1.1, 1.1]) {
    const win = M(new THREE.BoxGeometry(0.55, 0.85, 0.08), 0x7dd3fc, gradientMap, 1.12);
    win.position.set(x, 1.8, 1.52);
    g.add(win);
    const frame = M(new THREE.BoxGeometry(0.65, 0.1, 0.06), 0xffffff, gradientMap, 1.15);
    frame.position.set(x, 2.3, 1.56);
    g.add(frame);
  }
  // columns
  for (const x of [-1.5, 1.5]) {
    const col = M(new THREE.CylinderGeometry(0.18, 0.2, 2.4, 6), 0xe8e0f5, gradientMap, 1.08);
    col.position.set(x, 1.3, 1.7);
    g.add(col);
  }

  // fish fountain
  const ped = M(new THREE.CylinderGeometry(0.55, 0.7, 0.6, 8), 0x94a3b8, gradientMap);
  ped.position.set(2.2, 0.45, 2.0);
  g.add(ped);
  const bowl = M(new THREE.CylinderGeometry(0.9, 0.7, 0.35, 8), 0x7dd3fc, gradientMap, 1.06);
  bowl.position.set(2.2, 0.9, 2.0);
  g.add(bowl);
  const fish = M(new THREE.ConeGeometry(0.4, 1.2, 5), 0x2dd4bf, gradientMap, 1.08);
  fish.rotation.z = Math.PI / 2;
  fish.position.set(2.2, 1.55, 2.0);
  g.add(fish);

  // garden beds
  for (const x of [-2.4, 2.4]) {
    const bed = M(new THREE.BoxGeometry(1.0, 0.35, 1.6), 0xc4a882, gradientMap, 1.08);
    bed.position.set(x, 0.3, 0.2);
    g.add(bed);
    for (let i = 0; i < 3; i++) {
      const fl = M(new THREE.SphereGeometry(0.12, 5, 5), [0xff6b9d, 0xffe066, 0xa78bfa][i], gradientMap, 1.2);
      fl.position.set(x, 0.65, -0.4 + i * 0.45);
      g.add(fl);
    }
  }

  const banner = M(new THREE.BoxGeometry(1.8, 0.45, 0.08), 0xc4b5fd, gradientMap, 1.1);
  banner.position.set(0, 2.9, 1.6);
  g.add(banner);

  return tagHit(g, 'codex');
}

export const HUB_SPOTS = [
  { id: 'depart', label: '出港', sub: '港口码头', color: '#2ec4b6' },
  { id: 'prep', label: '整备', sub: '船坞工棚', color: '#e8a04a' },
  { id: 'shop', label: '商店', sub: '海岛市集', color: '#ff6b9d' },
  { id: 'codex', label: '图鉴', sub: '鱼种展馆', color: '#a78bfa' },
];

export function createHubIsland(gradientMap) {
  const root = new THREE.Group();
  root.name = 'hubIsland';

  // Pastel day sky (same family as cover)
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
  sky.renderOrder = -40;
  root.add(sky);

  // Layered bright water
  const deep = M(new THREE.CircleGeometry(70, 48), 0x5ec8c8, gradientMap, 0);
  deep.rotation.x = -Math.PI / 2;
  deep.position.y = -0.1;
  root.add(deep);
  const midSea = M(new THREE.CircleGeometry(32, 40), 0x7ed8d4, gradientMap, 0);
  midSea.rotation.x = -Math.PI / 2;
  midSea.position.y = -0.05;
  root.add(midSea);
  const near = M(new THREE.CircleGeometry(18, 32), 0xa8ebe6, gradientMap, 0);
  near.rotation.x = -Math.PI / 2;
  near.position.y = -0.02;
  root.add(near);

  for (let i = 0; i < 5; i++) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(7 + i * 4, 7.3 + i * 4, 48),
      new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.14,
        side: THREE.DoubleSide, depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    root.add(ring);
  }

  // Island — sand + grass tiers
  const sand = M(new THREE.CylinderGeometry(13, 14.5, 1.0, 8), 0xf0e0c0, gradientMap, 1.03);
  sand.position.y = 0.35;
  root.add(sand);
  const sandRim = M(new THREE.CylinderGeometry(11.5, 12.5, 0.35, 8), 0xf5ead0, gradientMap, 1.02);
  sandRim.position.y = 0.85;
  root.add(sandRim);
  const grass = M(new THREE.CylinderGeometry(10, 11, 0.6, 8), 0x6bcf6b, gradientMap, 1.03);
  grass.position.y = 1.2;
  root.add(grass);
  const grass2 = M(new THREE.CylinderGeometry(6.5, 7.5, 0.5, 7), 0x5cb85c, gradientMap, 1.03);
  grass2.position.set(-1, 1.55, -1.5);
  root.add(grass2);
  const hill = M(new THREE.ConeGeometry(3.2, 2.4, 6), 0x4caf50, gradientMap, 1.04);
  hill.position.set(1.5, 2.6, -3);
  root.add(hill);
  const hill2 = M(new THREE.ConeGeometry(2.0, 1.5, 5), 0x66bb6a, gradientMap, 1.05);
  hill2.position.set(-4, 2.1, -4);
  root.add(hill2);

  // Stone path ring + spokes
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const stone = M(new THREE.BoxGeometry(0.7, 0.12, 0.55), 0xe0d0b0, gradientMap, 1.05);
    stone.position.set(Math.cos(a) * 4.2, 1.42, Math.sin(a) * 4.2);
    stone.rotation.y = a;
    root.add(stone);
  }
  const spokes = [
    [0, 0, 5.5, 0, 6],
    [-5, 0, 1, 0.9, 5],
    [5, 0, 1, -0.9, 5],
    [0, 0, -5, 0, 5],
  ];
  for (const [x, , z, rot, len] of spokes) {
    const path = M(new THREE.BoxGeometry(len, 0.1, 1.2), 0xe8d9b5, gradientMap, 1.03);
    path.position.set(x * 0.55, 1.4, z * 0.55);
    path.rotation.y = rot;
    root.add(path);
  }

  // Plaza fountain center
  const plaza = M(new THREE.CylinderGeometry(2.2, 2.4, 0.2, 8), 0xf5efe0, gradientMap, 1.04);
  plaza.position.y = 1.45;
  root.add(plaza);
  const fountain = M(new THREE.CylinderGeometry(0.8, 1.0, 0.5, 8), 0x94a3b8, gradientMap);
  fountain.position.y = 1.75;
  root.add(fountain);
  const waterF = M(new THREE.CylinderGeometry(0.95, 0.85, 0.25, 8), 0x7dd3fc, gradientMap, 1.06);
  waterF.position.y = 2.1;
  root.add(waterF);
  const spout = M(new THREE.SphereGeometry(0.25, 6, 6), 0xa8ebe6, gradientMap, 1.15);
  spout.position.y = 2.5;
  root.add(spout);
  root.userData.spout = spout;

  // Buildings
  const port = buildPort(gradientMap);
  port.position.set(0, 1.15, 9.5);
  root.add(port);

  const yard = buildShipyard(gradientMap);
  yard.position.set(-8.5, 1.15, 1.2);
  yard.rotation.y = 0.35;
  root.add(yard);

  const shop = buildShop(gradientMap);
  shop.position.set(8.5, 1.15, 1.5);
  shop.rotation.y = -0.35;
  root.add(shop);

  const codex = buildCodex(gradientMap);
  codex.position.set(0, 1.15, -8.2);
  root.add(codex);

  // Lots of palms
  const palmSpots = [
    [-5, 1.4, 7, 1], [5, 1.4, 7.5, 0.95], [-10, 1.4, -1, 1.15], [10, 1.4, 0, 1],
    [-6, 1.4, -6, 0.9], [6, 1.4, -6.5, 1.05], [-3, 1.4, 4, 0.8], [3.5, 1.4, 3.5, 0.85],
    [-8, 1.4, 5, 0.9], [8.5, 1.4, 5.5, 0.95], [0, 1.9, -4.5, 0.75], [-2, 1.4, -7, 0.85],
    [4, 1.4, -8, 0.9], [-11, 1.3, 3, 1.1], [11, 1.3, 3, 1.05],
  ];
  for (const [x, y, z, s] of palmSpots) {
    const p = palm(gradientMap, s);
    p.position.set(x, y, z);
    root.add(p);
  }

  // Bushes & flowers
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 5 + Math.random() * 5;
    const bu = bush(gradientMap, Math.random() > 0.5 ? 0x5cb85c : 0x81c784);
    bu.position.set(Math.cos(a) * r, 1.4, Math.sin(a) * r);
    root.add(bu);
  }
  for (let i = 0; i < 20; i++) {
    const fl = M(
      new THREE.SphereGeometry(0.14, 5, 5),
      [0xff6b9d, 0xffe066, 0xff8a65, 0xce93d8][i % 4],
      gradientMap,
      1.2
    );
    const a = Math.random() * Math.PI * 2;
    const r = 3 + Math.random() * 7;
    fl.position.set(Math.cos(a) * r, 1.55, Math.sin(a) * r);
    root.add(fl);
  }

  // Shore rocks
  const rockSpots = [
    [-12, 0.4, 6, 1.2], [12, 0.35, 5, 1.4], [-13, 0.3, -4, 1.1], [13, 0.35, -3, 1.3],
    [-7, 0.4, 11, 0.9], [7, 0.35, 11.5, 1.0], [0, 0.3, 13, 1.2], [-10, 0.35, 9, 0.8],
    [10, 0.4, 9, 0.85], [2, 0.3, -12, 1.1], [-4, 0.35, -11, 0.95],
  ];
  for (const [x, y, z, s] of rockSpots) {
    const r = rock(gradientMap, s);
    r.position.set(x, y, z);
    root.add(r);
  }

  // Scattered crates near paths
  for (const [x, z] of [[-3, 6], [3, 6.5], [-6, 3], [6, 3], [-2, -5], [2.5, -5.5]]) {
    const c = crate(gradientMap);
    c.position.set(x, 1.7, z);
    root.add(c);
  }

  // Tiny sailboats offshore
  for (const [x, z, rot] of [[-16, 8, 0.5], [17, 6, -0.8], [-14, -6, 1.2]]) {
    const boat = new THREE.Group();
    const h = M(new THREE.BoxGeometry(1.4, 0.35, 0.5), 0x2c3a5a, gradientMap, 1.1);
    h.position.y = 0.15;
    boat.add(h);
    const m = M(new THREE.CylinderGeometry(0.04, 0.05, 1.4, 5), 0x4a5568, gradientMap, 1.15);
    m.position.y = 0.95;
    boat.add(m);
    const s = M(new THREE.ConeGeometry(0.45, 1.0, 3), 0xf8f4ec, gradientMap, 1.05);
    s.rotation.z = Math.PI;
    s.position.set(0.3, 0.9, 0);
    boat.add(s);
    boat.position.set(x, 0.05, z);
    boat.rotation.y = rot;
    root.add(boat);
  }

  // Clouds
  const clouds = [];
  for (const [x, y, z, s] of [
    [-22, 14, -18, 2.4], [10, 16, -28, 3], [26, 13, -8, 2.2], [-12, 15, -30, 2.6], [20, 12, 12, 1.9],
  ]) {
    const c = cloud(gradientMap);
    c.position.set(x, y, z);
    c.scale.setScalar(s);
    root.add(c);
    clouds.push(c);
  }

  // Gulls
  const gulls = [];
  for (let i = 0; i < 6; i++) {
    const b = gull();
    b.position.set(-8 + i * 3.5, 8 + (i % 3), -4 - i);
    root.add(b);
    gulls.push(b);
  }

  // Soft sun
  const sun = M(new THREE.CircleGeometry(7, 8), 0xffe566, gradientMap, 0);
  sun.position.set(35, 28, -50);
  sun.lookAt(0, 0, 0);
  root.add(sun);

  const anchors = {
    depart: new THREE.Object3D(),
    prep: new THREE.Object3D(),
    shop: new THREE.Object3D(),
    codex: new THREE.Object3D(),
  };
  anchors.depart.position.set(0, 4.8, 9.5);
  anchors.prep.position.set(-8.5, 5.2, 1.2);
  anchors.shop.position.set(8.5, 4.8, 1.5);
  anchors.codex.position.set(0, 5.6, -8.2);
  Object.values(anchors).forEach((a) => root.add(a));

  const hits = [port, yard, shop, codex];

  function setHighlight(id) {
    hits.forEach((h) => {
      h.scale.setScalar(id && h.userData.hubId === id ? 1.05 : 1);
    });
  }

  root.visible = false;
  root.position.set(0, 0, 200);

  function update(t) {
    if (!root.visible) return;
    port.position.y = 1.15 + Math.sin(t * 1.1) * 0.04;
    if (root.userData.spout) {
      root.userData.spout.position.y = 2.5 + Math.sin(t * 4) * 0.08;
    }
    clouds.forEach((c, i) => { c.position.x += Math.sin(t * 0.1 + i) * 0.004; });
    gulls.forEach((b, i) => {
      b.position.y = 8 + (i % 3) + Math.sin(t * 1.4 + i) * 0.45;
      b.position.x += Math.sin(t * 0.25 + i) * 0.012;
    });
  }

  function setActive(on) {
    root.visible = on;
  }

  function cameraFrame(t) {
    const ox = root.position.x;
    const oy = root.position.y;
    const oz = root.position.z;
    const sway = Math.sin(t * 0.12) * 0.6;
    return {
      pos: new THREE.Vector3(ox + 1 + sway * 0.3, oy + 14, oz + 24),
      look: new THREE.Vector3(ox, oy + 2.5, oz + 1),
    };
  }

  return { root, hits, anchors, update, setActive, setHighlight, cameraFrame };
}
