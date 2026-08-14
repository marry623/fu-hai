import * as THREE from 'three';
import { addOutline, toonMat } from './stylekit.js';

export function createDuskSky() {
  const geo = new THREE.SphereGeometry(900, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {},
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: `
      varying vec3 vWorld;
      void main() {
        float h = normalize(vWorld).y;
        // dusk cartoon: warm orange horizon → hot pink/magenta → purple → deep teal zenith
        vec3 zenith = vec3(0.16, 0.20, 0.52);
        vec3 upper = vec3(0.42, 0.22, 0.62);
        vec3 mid = vec3(0.95, 0.35, 0.62);
        vec3 horizon = vec3(1.0, 0.62, 0.28);
        vec3 glow = vec3(1.0, 0.82, 0.45);

        vec3 col = mix(horizon, mid, smoothstep(-0.08, 0.12, h));
        col = mix(col, upper, smoothstep(0.08, 0.38, h));
        col = mix(col, zenith, smoothstep(0.32, 0.92, h));
        float sunBand = exp(-pow((h - 0.02) * 5.5, 2.0));
        col = mix(col, glow, sunBand * 0.55);
        // cartoon posterize — keep vivid blocks
        col = floor(col * 8.0 + 0.5) / 8.0;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(geo, mat);
  sky.name = 'duskSky';
  sky.renderOrder = -100;
  return sky;
}

export function createSun() {
  const group = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(28, 6),
    new THREE.MeshBasicMaterial({ color: 0xffc56b, side: THREE.DoubleSide })
  );
  disc.position.set(-180, 28, -420);
  disc.lookAt(0, 20, 0);
  addOutline(disc, 1.12);
  group.add(disc);

  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(48, 6),
    new THREE.MeshBasicMaterial({
      color: 0xff7a3a,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  glow.position.copy(disc.position);
  glow.lookAt(0, 20, 0);
  glow.userData.skipOutline = true;
  group.add(glow);
  return group;
}

export function createClouds(gradientMap) {
  const root = new THREE.Group();
  const positions = [
    [-80, 42, -120], [40, 48, -160], [120, 38, -90],
    [-140, 50, -40], [20, 55, 140], [-60, 44, 160],
    [160, 46, 60], [-180, 52, 100], [90, 40, -200],
    [-30, 58, -250], [200, 45, -150], [-220, 48, -180],
  ];

  for (const [x, y, z] of positions) {
    const cloud = makeCloud(gradientMap);
    cloud.position.set(x, y, z);
    cloud.rotation.y = Math.random() * Math.PI;
    const s = 0.8 + Math.random() * 1.4;
    cloud.scale.setScalar(s);
    root.add(cloud);
  }
  return root;
}

function makeCloud(gradientMap) {
  const g = new THREE.Group();
  const top = toonMat(0xffe8d4, gradientMap);
  const bot = toonMat(0xd080b8, gradientMap);

  const blobs = [
    [0, 0, 0, 5, 2.2, 4],
    [4, -0.3, 1, 4, 2, 3.5],
    [-4, -0.4, 0.5, 3.8, 1.8, 3.2],
    [1.5, 1.2, -1, 3.2, 1.6, 2.8],
    [-2, 0.8, 1.5, 2.8, 1.4, 2.5],
  ];

  for (let i = 0; i < blobs.length; i++) {
    const [bx, by, bz, sx, sy, sz] = blobs[i];
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 5, 4),
      i < 3 ? top : bot
    );
    mesh.position.set(bx, by, bz);
    mesh.scale.set(sx, sy, sz);
    g.add(mesh);
    addOutline(mesh, 1.09);
  }
  return g;
}

export function createWater() {
  const size = 600;
  const seg = 72;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);

  // Flat cartoon water — bright teal like the reference, with dusk warmth
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    vertexColors: true,
    flatShading: true,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'water';
  mesh.userData.skipOutline = true;

  const pos = geo.attributes.position;
  const base = new Float32Array(pos.count * 3);
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    base[i * 3] = pos.getX(i);
    base[i * 3 + 1] = pos.getY(i);
    base[i * 3 + 2] = pos.getZ(i);
    // bright teal base
    colors[i * 3] = 0.18;
    colors[i * 3 + 1] = 0.88;
    colors[i * 3 + 2] = 0.80;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  mesh.userData.basePositions = base;
  mesh.userData.seg = seg;

  return mesh;
}

export function updateWater(water, time, boatPos) {
  const pos = water.geometry.attributes.position;
  const col = water.geometry.attributes.color;
  const base = water.userData.basePositions;
  const ox = boatPos ? boatPos.x : 0;
  const oz = boatPos ? boatPos.z : 0;

  for (let i = 0; i < pos.count; i++) {
    const x = base[i * 3];
    const z = base[i * 3 + 2];
    const wx = x + ox * 0.02;
    const wz = z + oz * 0.02;
    let y =
      Math.sin(wx * 0.08 + time * 1.2) * 0.35 +
      Math.cos(wz * 0.07 + time * 0.9) * 0.28 +
      Math.sin((wx + wz) * 0.045 + time * 0.7) * 0.45;

    // low-poly faceting: quantize
    y = Math.round(y * 2.2) / 2.2;
    pos.setY(i, y);

    // Facet color: bright teal + warm dusk on crests
    const crest = Math.max(0, y);
    const dusk = 0.5 + 0.5 * Math.sin(time * 0.3 + wx * 0.02);
    col.setXYZ(
      i,
      0.16 + crest * 0.22 + dusk * 0.08,
      0.86 + crest * 0.08,
      0.78 + crest * 0.05 - dusk * 0.04
    );
  }
  pos.needsUpdate = true;
  col.needsUpdate = true;
  water.geometry.computeVertexNormals();
}

export function createFoamRings() {
  const group = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.8 + i * 0.55, 1.05 + i * 0.55, 8),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.55 - i * 0.15,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    ring.userData.skipOutline = true;
    group.add(ring);
  }
  return group;
}

export function createBuoy(gradientMap, color = 0xff3b4a) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.55, 1.1, 3, 6),
    toonMat(color, gradientMap)
  );
  body.position.y = 0.9;
  g.add(body);
  addOutline(body, 1.1);

  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.58, 0.1, 4, 8),
    toonMat(0x222222, gradientMap)
  );
  band.rotation.x = Math.PI / 2;
  band.position.y = 1.0;
  g.add(band);
  addOutline(band, 1.12);

  const flag = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.9, 0.08),
    toonMat(0x1a1a1a, gradientMap)
  );
  flag.position.y = 2.0;
  g.add(flag);
  addOutline(flag, 1.15);

  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.25, 0.4, 5),
    toonMat(0xffd24a, gradientMap)
  );
  tip.position.y = 2.45;
  g.add(tip);
  addOutline(tip, 1.12);

  return g;
}

export function createHomePlatform(gradientMap) {
  const g = new THREE.Group();
  g.name = 'floatingMarket';

  const deck = new THREE.Mesh(
    new THREE.CylinderGeometry(14, 16, 2.2, 8),
    toonMat(0x3a4558, gradientMap)
  );
  deck.position.y = 0.4;
  g.add(deck);
  addOutline(deck, 1.04);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(15, 0.55, 4, 8),
    toonMat(0x1ad4c8, gradientMap)
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.4;
  g.add(rim);
  addOutline(rim, 1.08);

  // market stalls / towers
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2;
    const hut = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 3.5, 3.2),
      toonMat(i % 2 === 0 ? 0xff6b4a : 0x6b5cff, gradientMap)
    );
    hut.position.set(Math.cos(ang) * 7, 2.8, Math.sin(ang) * 7);
    hut.rotation.y = ang;
    g.add(hut);
    addOutline(hut, 1.06);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(2.6, 1.8, 5),
      toonMat(0xffd24a, gradientMap)
    );
    roof.position.copy(hut.position);
    roof.position.y += 2.6;
    g.add(roof);
    addOutline(roof, 1.08);
  }

  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.7, 10, 6),
    toonMat(0xff8a3d, gradientMap)
  );
  beacon.position.y = 6;
  g.add(beacon);
  addOutline(beacon, 1.08);

  const light = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 6, 5),
    new THREE.MeshBasicMaterial({ color: 0xffc56b })
  );
  light.position.y = 12;
  g.add(light);
  addOutline(light, 1.12);

  const label = makeBillboardLabel('浮骸黑市');
  label.position.set(0, 15, 0);
  g.add(label);

  return g;
}

function makeBillboardLabel(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(8,12,18,0.85)';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 8;
  roundRect(ctx, 8, 8, 240, 48, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1ad4c8';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 34);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(12, 3, 1);
  spr.userData.skipOutline = true;
  return spr;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
