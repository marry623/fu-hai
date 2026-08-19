import * as THREE from 'three';

const RADIUS = 90;
const MAX = 520;

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

  function seed(i, cx, cz) {
    const use = (altKind && (i % 3 === 0)) ? altKind : kind;
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() * RADIUS;
    const s = slots[i];
    s.x = cx + Math.cos(a) * d;
    s.z = cz + Math.sin(a) * d;
    if (use === 'rain') {
      s.y = 4 + Math.random() * 22;
      s.vy = -(8.5 + Math.random() * 3.5);
      s.vx = -1.2;
      s.vz = 0.4;
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

  function setPreset(biome) {
    kind = biome?.particle || 'none';
    altKind = biome?.particleAlt || null;
    flash = !!biome?.flash;
    live = kind === 'none' ? 0 : Math.min(MAX, biome.particleCount || 120);
    color.setHex(biome?.particleColor ?? 0xffffff);
    altColor.setHex(biome?.sun ?? 0xffe8a0);
    mat.size = kind === 'rain' ? 0.22 : kind === 'bubble' ? 0.38 : 0.4;
    mat.opacity = kind === 'rain' ? 0.55 : 0.82;
    mat.blending = (kind === 'cinder' || kind === 'spark' || kind === 'bubble' || altKind === 'spark')
      ? THREE.AdditiveBlending
      : THREE.NormalBlending;
    points.visible = live > 0;
    geo.setDrawRange(0, live);
    flashLight.intensity = 0;
    flashT = 3.5 + Math.random() * 4;
    flashAge = 0;
    for (let i = 0; i < live; i++) seed(i, 0, 0);
  }

  function update(dt, boatPos) {
    if (!points.visible || live <= 0) {
      flashLight.intensity *= Math.max(0, 1 - dt * 8);
      return;
    }
    const cx = boatPos?.x || 0;
    const cz = boatPos?.z || 0;
    const t = performance.now() * 0.001;
    for (let i = 0; i < live; i++) {
      const s = slots[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      if (kind === 'pollen' || s.kind === 'pollen') {
        s.x += Math.sin(t * 0.7 + i) * 0.4 * dt;
        s.y += Math.sin(t * 1.1 + i * 0.3) * 0.25 * dt;
      }
      const k = s.kind || kind;
      if (k === 'bubble' && s.y > 8) seed(i, cx, cz);
      if (k === 'rain' && s.y < 0.1) seed(i, cx, cz);
      if ((k === 'cinder' || k === 'spark') && s.y > 14) seed(i, cx, cz);
      if (k === 'pollen' && s.y > 12) seed(i, cx, cz);
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

    flashLight.position.set(cx + 12, 42, cz - 8);
    if (flash) {
      flashT -= dt;
      if (flashT <= 0) {
        flashAge = 0.28;
        flashT = 4 + Math.random() * 4;
      }
      if (flashAge > 0) {
        flashAge -= dt;
        flashLight.intensity = 18 * Math.max(0, flashAge / 0.28);
      } else {
        flashLight.intensity = 0;
      }
    }
  }

  function hide() {
    points.visible = false;
    flashLight.intensity = 0;
    kind = 'none';
    live = 0;
  }

  return { root: group, setPreset, update, hide };
}
