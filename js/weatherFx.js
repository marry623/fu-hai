import * as THREE from '../vendor/three/three.module.js';

const RADIUS = 90;
const MAX = 520;
const POCK_N = 40;
const POCK_RADIUS = 48;
const POCKS_PER_SEC = 16;

function wrapAround(v, c, r) {
  const d = v - c;
  if (d > r) return v - r * 2;
  if (d < -r) return v + r * 2;
  return v;
}

export function createWeatherFx(scene) {
  const group = new THREE.Group();
  group.name = 'weatherFx';
  scene.add(group);

  const pos = new Float32Array(MAX * 3);
  const col = new Float32Array(MAX * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setDrawRange(0, 0);

  const mat = new THREE.PointsMaterial({
    size: 0.45,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 8;
  group.add(points);

  const flashLight = new THREE.PointLight(0xe0eaff, 0, 220, 1.6);
  flashLight.position.set(0, 48, 0);
  group.add(flashLight);

  const pockGeo = new THREE.RingGeometry(0.08, 0.22, 12);
  const pockMat = new THREE.MeshBasicMaterial({
    color: 0xd8e8ff,
    transparent: true,
    opacity: 0.62,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const pocks = new THREE.InstancedMesh(pockGeo, pockMat, POCK_N);
  pocks.frustumCulled = false;
  pocks.renderOrder = 3;
  pocks.userData.skipOutline = true;
  pocks.visible = false;
  group.add(pocks);
  const pockDummy = new THREE.Object3D();
  const pockSlots = [];
  for (let i = 0; i < POCK_N; i++) {
    pockSlots.push({ age: 99, life: 0.32, x: 0, z: 0, grow: 2 });
  }
  let pockCursor = 0;
  let pockAcc = 0;

  const slots = [];
  for (let i = 0; i < MAX; i++) {
    slots.push({
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0, vz: 0,
      r: 1, g: 1, b: 1,
    });
  }

  let kind = 'none';
  let altKind = null;
  let live = 0;
  let flash = false;
  let flashT = 4 + Math.random() * 4;
  let flashAge = 0;
  let color = new THREE.Color(0xffffff);
  let altColor = new THREE.Color(0xffe8a0);
  let duskSky = null;
  const baseBg = new THREE.Color(0x0e0c18);
  const flashBg = new THREE.Color(0xc8d4f0);

  function seed(i, cx, cz) {
    const use = (altKind && (i % 3 === 0)) ? altKind : kind;
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() * RADIUS;
    const s = slots[i];
    s.x = cx + Math.cos(a) * d;
    s.z = cz + Math.sin(a) * d;
    if (use === 'rain') {
      s.y = 4 + Math.random() * 22;
      s.vy = -(10.5 + Math.random() * 4.5);
      s.vx = -1.8;
      s.vz = 0.55;
    } else if (use === 'mist') {
      s.y = 0.25 + Math.random() * 4.2;
      s.vy = 0.04 + Math.random() * 0.1;
      s.vx = 0.28 + Math.random() * 0.22;
      s.vz = (Math.random() - 0.5) * 0.18;
    } else if (use === 'cinder' || use === 'spark') {
      s.y = 0.4 + Math.random() * 8;
      s.vy = use === 'spark' ? 2.4 + Math.random() * 2 : 0.8 + Math.random() * 1.4;
      s.vx = (Math.random() - 0.5) * 1.6;
      s.vz = (Math.random() - 0.5) * 1.6;
    } else if (use === 'bubble') {
      s.y = 0.2 + Math.random() * 3.5;
      s.vy = 0.6 + Math.random() * 0.7;
      s.vx = (Math.random() - 0.5) * 0.3;
      s.vz = (Math.random() - 0.5) * 0.3;
    } else {
      s.y = 1.2 + Math.random() * 7;
      s.vy = 0.15 + Math.random() * 0.25;
      s.vx = 0.4 + Math.random() * 0.4;
      s.vz = (Math.random() - 0.5) * 0.3;
    }
    const c = use === 'spark' ? altColor : color;
    s.r = c.r;
    s.g = c.g;
    s.b = c.b;
    s.kind = use;
  }

  function spawnPock(x, z) {
    const s = pockSlots[pockCursor++ % POCK_N];
    s.age = 0;
    s.life = 0.28 + Math.random() * 0.12;
    s.x = x;
    s.z = z;
    s.grow = 1.6 + Math.random() * 1.4;
  }

  function updatePocks(dt, cx, cz) {
    if (!pocks.visible) return;
    pockAcc += dt * POCKS_PER_SEC;
    while (pockAcc >= 1) {
      pockAcc -= 1;
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * POCK_RADIUS;
      spawnPock(cx + Math.cos(a) * d, cz + Math.sin(a) * d);
    }
    for (let i = 0; i < POCK_N; i++) {
      const s = pockSlots[i];
      s.age += dt;
      const u = s.age / s.life;
      pockDummy.rotation.set(-Math.PI / 2, 0, 0);
      if (u >= 1) {
        pockDummy.position.set(0, -4, 0);
        pockDummy.scale.setScalar(0.001);
      } else {
        pockDummy.position.set(s.x, 0.06, s.z);
        pockDummy.scale.setScalar(0.32 + u * s.grow);
      }
      pockDummy.updateMatrix();
      pocks.setMatrixAt(i, pockDummy.matrix);
    }
    pocks.instanceMatrix.needsUpdate = true;
  }

  function setPreset(biome, skyMesh) {
    duskSky = skyMesh || null;
    kind = biome?.particle || 'none';
    altKind = biome?.particleAlt || null;
    flash = !!biome?.flash;
    live = kind === 'none' ? 0 : Math.min(MAX, biome.particleCount || 120);
    color.setHex(biome?.particleColor ?? 0xffffff);
    altColor.setHex(biome?.sun ?? 0xffe8a0);
    if (biome?.sky != null) baseBg.setHex(biome.sky);
    else if (scene.background?.isColor) baseBg.copy(scene.background);
    mat.size = kind === 'rain' ? 0.16 : kind === 'mist' ? 0.9 : kind === 'bubble' ? 0.38 : 0.4;
    mat.opacity = kind === 'rain' ? 0.5 : kind === 'mist' ? 0.32 : 0.82;
    mat.blending = (kind === 'cinder' || kind === 'spark' || kind === 'bubble' || altKind === 'spark')
      ? THREE.AdditiveBlending
      : THREE.NormalBlending;
    points.visible = live > 0;
    geo.setDrawRange(0, live);
    pocks.visible = kind === 'rain';
    pockAcc = 0;
    for (let i = 0; i < POCK_N; i++) pockSlots[i].age = 99;
    flashLight.intensity = 0;
    flashT = 3.5 + Math.random() * 4;
    flashAge = 0;
    duskSky?.userData.applyFlash?.(0);
    for (let i = 0; i < live; i++) seed(i, 0, 0);
  }

  function updateFlash(dt, cx, cz) {
    flashLight.position.set(cx + 12, 42, cz - 8);
    let k = 0;
    if (flash) {
      flashT -= dt;
      if (flashT <= 0) {
        flashAge = 0.32;
        flashT = 3.4 + Math.random() * 4.2;
      }
      if (flashAge > 0) {
        flashAge -= dt;
        k = Math.max(0, flashAge / 0.32);
        flashLight.intensity = 22 * k;
      } else {
        flashLight.intensity = 0;
      }
    } else {
      flashLight.intensity *= Math.max(0, 1 - dt * 8);
    }
    duskSky?.userData.applyFlash?.(k);
    if (scene.background?.isColor) {
      scene.background.copy(baseBg).lerp(flashBg, k * 0.55);
    }
  }

  function update(dt, boatPos) {
    const cx = boatPos?.x || 0;
    const cz = boatPos?.z || 0;
    updateFlash(dt, cx, cz);
    updatePocks(dt, cx, cz);

    if (!points.visible || live <= 0) return;

    const t = performance.now() * 0.001;
    for (let i = 0; i < live; i++) {
      const s = slots[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      if (kind === 'pollen' || s.kind === 'pollen' || s.kind === 'mist') {
        s.x += Math.sin(t * 0.7 + i) * 0.4 * dt;
        s.y += Math.sin(t * 1.1 + i * 0.3) * 0.25 * dt;
      }
      const k = s.kind || kind;
      if (k === 'bubble' && s.y > 8) seed(i, cx, cz);
      if (k === 'rain' && s.y < 0.1) seed(i, cx, cz);
      if ((k === 'cinder' || k === 'spark') && s.y > 14) seed(i, cx, cz);
      if (k === 'pollen' && s.y > 12) seed(i, cx, cz);
      if (k === 'mist' && s.y > 6.5) seed(i, cx, cz);
      s.x = wrapAround(s.x, cx, RADIUS);
      s.z = wrapAround(s.z, cz, RADIUS);
      pos[i * 3] = s.x;
      pos[i * 3 + 1] = s.y;
      pos[i * 3 + 2] = s.z;
      col[i * 3] = s.r;
      col[i * 3 + 1] = s.g;
      col[i * 3 + 2] = s.b;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  function hide() {
    points.visible = false;
    pocks.visible = false;
    flashLight.intensity = 0;
    kind = 'none';
    live = 0;
    flash = false;
    duskSky?.userData.applyFlash?.(0);
  }

  return { root: group, setPreset, update, hide };
}
