import * as THREE from '../vendor/three/three.module.js';
import { GLTFLoader } from '../vendor/three/GLTFLoader.js';
import { addOutline, toonMat } from './stylekit.js';

export function createDuskSky() {
  const geo = new THREE.SphereGeometry(1100, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uHorizon: { value: new THREE.Color(0xff9e47) },
      uZenith: { value: new THREE.Color(0x293385) },
      uGlow: { value: new THREE.Color(0xffd173) },
      uExp: { value: 1.5 },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uHorizon;
      uniform vec3 uZenith;
      uniform vec3 uGlow;
      uniform float uExp;
      varying vec3 vDir;
      void main() {
        float t = clamp(vDir.y + 0.05, 0.0, 1.0);
        t = pow(t, uExp);
        vec3 col = mix(uHorizon, uZenith, t);
        float sunBand = exp(-pow((vDir.y - 0.02) * 5.5, 2.0));
        col = mix(col, uGlow, sunBand * 0.35);
        col = floor(col * 8.0 + 0.5) / 8.0;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(geo, mat);
  sky.name = 'duskSky';
  sky.renderOrder = -100;
  sky.frustumCulled = false;
  const baseHorizon = new THREE.Color(0xff9e47);
  const baseZenith = new THREE.Color(0x293385);
  const baseGlow = new THREE.Color(0xffd173);
  const flashCol = new THREE.Color(0xe8f0ff);
  sky.userData.setBiome = (biome) => {
    mat.uniforms.uHorizon.value.setHex(biome.horizon);
    mat.uniforms.uZenith.value.setHex(biome.zenith);
    mat.uniforms.uGlow.value.setHex(biome.sun);
    mat.uniforms.uExp.value = biome.id === 2 ? 1.15 : biome.id >= 3 ? 1.35 : 1.55;
    baseHorizon.copy(mat.uniforms.uHorizon.value);
    baseZenith.copy(mat.uniforms.uZenith.value);
    baseGlow.copy(mat.uniforms.uGlow.value);
  };
  /** k 0..1 — lightning wash on the sky dome. */
  sky.userData.applyFlash = (k) => {
    const t = Math.max(0, Math.min(1, k));
    mat.uniforms.uGlow.value.copy(baseGlow).lerp(flashCol, t);
    mat.uniforms.uHorizon.value.copy(baseHorizon).lerp(flashCol, t * 0.5);
    mat.uniforms.uZenith.value.copy(baseZenith).lerp(flashCol, t * 0.22);
  };
  sky.userData.follow = (pos) => {
    sky.position.x = pos.x;
    sky.position.z = pos.z;
  };
  return sky;
}

export function createClouds(gradientMap) {
  const root = new THREE.Group();
  root.name = 'worldClouds';

  const cloudUrls = [
    './models/claude_cloud1.glb?v=1',
    './models/claude_cloud2.glb?v=1',
    './models/claude_cloud3.glb?v=1',
  ];
  const templates = [];
  const loader = new GLTFLoader();

  for (const url of cloudUrls) {
    loader.load(
      url,
      (gltf) => {
        const tpl = bakeCloudTemplate(gltf.scene, gradientMap);
        templates.push(tpl);
        // fill pending placeholders
        for (const slot of root.children) {
          if (slot.userData.pending) {
            const cloud = tpl.clone(true);
            cloud.position.copy(slot.position);
            cloud.userData.baseY = slot.userData.baseY;
            cloud.userData.baseScale = slot.userData.baseScale;
            cloud.rotation.y = slot.userData.rotY;
            cloud.scale.setScalar(slot.userData.baseScale);
            slot.parent.add(cloud);
            slot.parent.remove(slot);
          }
        }
      },
      undefined,
      (err) => console.error('cloud GLB load failed:', err),
    );
  }

  const positions = [
    [-80, 42, -120], [40, 48, -160], [120, 38, -90],
    [-140, 50, -40], [20, 55, 140], [-60, 44, 160],
    [160, 46, 60], [-180, 52, 100], [90, 40, -200],
    [-30, 58, -250], [200, 45, -150], [-220, 48, -180],
    [70, 50, 220], [-250, 44, 40], [240, 52, 90],
    [-100, 36, 240], [30, 60, -40], [-160, 42, -280],
    [280, 46, -60], [-40, 54, 280],
  ];

  for (let i = 0; i < positions.length; i++) {
    const [x, y, z] = positions[i];
    const baseScale = 0.8 + Math.random() * 1.4;
    const rotY = Math.random() * Math.PI;
    const tplIdx = i % 3;

    if (templates[tplIdx]) {
      const cloud = templates[tplIdx].clone(true);
      cloud.position.set(x, y, z);
      cloud.userData.baseY = y;
      cloud.userData.baseScale = baseScale;
      cloud.rotation.y = rotY;
      cloud.scale.setScalar(baseScale);
      root.add(cloud);
    } else {
      // placeholder slot — will be filled when GLB arrives
      const slot = new THREE.Group();
      slot.position.set(x, y, z);
      slot.userData.pending = true;
      slot.userData.baseY = y;
      slot.userData.baseScale = baseScale;
      slot.userData.rotY = rotY;
      root.add(slot);
    }
  }

  root.userData.setBiome = (biome) => {
    const n = Math.max(0, Math.min(positions.length, biome.cloudCount ?? 12));
    let visIdx = 0;
    root.children.forEach((cloud) => {
      cloud.visible = visIdx < n;
      if (cloud.visible) visIdx++;
      cloud.position.y = biome.cloudY ?? cloud.userData.baseY;
      cloud.scale.setScalar((cloud.userData.baseScale || 1) * (biome.cloudScale ?? 1));
      tintCloud(cloud, biome.cloudTint, biome.cloudShade);
    });
  };
  root.userData.follow = (pos) => {
    root.position.x = pos.x;
    root.position.z = pos.z;
  };
  return root;
}

function tintCloud(cloud, tint, shade) {
  cloud.traverse((m) => {
    if (!m.isMesh || m.userData.isOutline || !m.material?.color) return;
    m.material.color.setHex(tint);
  });
}

function bakeCloudTemplate(source, gradientMap) {
  const root = new THREE.Group();
  source.updateMatrixWorld(true);

  source.traverse((o) => {
    if (!o.isMesh) return;
    const geo = o.geometry.clone();
    geo.applyMatrix4(o.matrixWorld);
    geo.computeVertexNormals();
    const mat = toonMat(0xfff5e8, gradientMap, { flatShading: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.cloudLayer = 'top';
    root.add(mesh);
  });

  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const baseSize = Math.max(size.x, size.y, size.z, 1e-6);
  root.userData.baseSize = baseSize;

  // center and ground
  root.position.x -= (box.min.x + box.max.x) * 0.5;
  root.position.z -= (box.min.z + box.max.z) * 0.5;
  root.position.y -= box.min.y;

  // normalize to ~12-unit size
  const norm = 12 / baseSize;
  root.scale.setScalar(norm);

  return root;
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
    transparent: true,
    opacity: 0.78,
    depthWrite: true,
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
    colors[i * 3] = 0.14;
    colors[i * 3 + 1] = 0.72;
    colors[i * 3 + 2] = 0.68;
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
      0.12 + crest * 0.18 + dusk * 0.06,
      0.70 + crest * 0.08,
      0.66 + crest * 0.05 - dusk * 0.04
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
