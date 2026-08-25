import * as THREE from 'three';
import { GLTFLoader } from '../vendor/three/GLTFLoader.js';
import { toonMat } from './stylekit.js';

const PROP_CONFIG = {
  zone0Coral: { url: './models/coral-zone0.glb?v=1' },
  zone0Rock: { url: './models/rock-zone0.glb?v=1' },
  zone0CoralB: { url: './models/coral-zone0-b.glb?v=1' },
  zone0RockB: { url: './models/rock-zone0-b.glb?v=1' },
  zone0CoralC: { url: './models/coral-zone0-c.glb?v=1' },
  zone0CoralD: { url: './models/coral-zone0-d.glb?v=1' },
  zone0RockC: { url: './models/rock-zone0-c.glb?v=1' },
  zone0CoralE: { url: './models/coral-zone0-e.glb?v=1' },
  zone0CoralF: { url: './models/coral-zone0-f.glb?v=1' },
  zone0CoralG: { url: './models/coral-zone0-g.glb?v=1' },
  zone0CoralH: { url: './models/coral-zone0-h.glb?v=1' },
  zone1Stone1: { url: './models/zone1-stone1.glb?v=4' },
  zone1Stone2: { url: './models/zone1-stone2.glb?v=4' },
  zone1Stone3: { url: './models/zone1-stone3.glb?v=4' },
  zone1Stone4: { url: './models/zone1-stone4.glb?v=3' },
  zone1Stone5: { url: './models/zone1-stone5.glb?v=3' },
  zone1Decor1: { url: './models/zone1-decor1.glb?v=4' },
  zone1Decor2: { url: './models/zone1-decor2.glb?v=4' },
  zone1Decor3: { url: './models/zone1-decor3.glb?v=4' },
  zone1Decor4: { url: './models/zone1-decor4.glb?v=4' },
  zone1Decor5: { url: './models/zone1-decor5.glb?v=4' },
  zone0Nc02: { url: './models/zone0-decor-nc02.glb?v=1' },
  zone0Noc002: { url: './models/zone0-noc002.glb?v=1' },
  zone0Surf01: { url: './models/zone0-surf01.glb?v=1' },
  zone0Surf02: { url: './models/zone0-surf02.glb?v=1' },
  zone0Surf03: { url: './models/zone0-surf03.glb?v=1' },
  zone0Surf04: { url: './models/zone0-surf04.glb?v=1' },
  zone0Surf05: { url: './models/zone0-surf05.glb?v=1' },
  zone0Surf06: { url: './models/zone0-surf06.glb?v=1' },
  zone0RockNew1: { url: './models/zone0-rock-new1.glb?v=1', basic: true, fallbackColor: 0x8a7a60 },
  zone0RockNew2: { url: './models/zone0-rock-new2.glb?v=1', basic: true, fallbackColor: 0x7a8a70 },
  zone0RockNew3: { url: './models/zone0-rock-new3.glb?v=1', basic: true, fallbackColor: 0x909080 },
  zone2S1: { url: './models/zone2-s1.glb?v=2', basic: true, fallbackColor: 0x9a8870 },
  zone2S2: { url: './models/zone2-s2.glb?v=2', basic: true, fallbackColor: 0xb09a80 },
  zone2S3: { url: './models/zone2-s3.glb?v=2', basic: true, fallbackColor: 0x8a7860 },
  zone2S4: { url: './models/zone2-s4.glb?v=2', basic: true, fallbackColor: 0xa08870 },
  zone2S5: { url: './models/zone2-s5.glb?v=2', basic: true, fallbackColor: 0xb4956a },
  zone2S6: { url: './models/zone2-s6.glb?v=2', basic: true, fallbackColor: 0x9a8060 },
  zone2C1: { url: './models/zone2-c1.glb?v=2', basic: true, fallbackColor: 0xc49a3d },
  zone2C2: { url: './models/zone2-c2.glb?v=2', basic: true, fallbackColor: 0xb8860b },
  zone2C3: { url: './models/zone2-c3.glb?v=2', basic: true, fallbackColor: 0xd4a56a },
  zone2C4: { url: './models/zone2-c4.glb?v=2', basic: true, fallbackColor: 0xa07840 },
  zone3S11: { url: './models/zone3-s11.glb?v=1', basic: true, fallbackColor: 0x4a4258 },
  zone3S12: { url: './models/zone3-s12.glb?v=1', basic: true, fallbackColor: 0x3e3a4c },
  zone3S13: { url: './models/zone3-s13.glb?v=1', basic: true, fallbackColor: 0x544e62 },
  zone3S14: { url: './models/zone3-s14.glb?v=1', basic: true, fallbackColor: 0x2e2c3a },
  zone3S15: { url: './models/zone3-s15.glb?v=1', basic: true, fallbackColor: 0x5c5470 },
  zone3S16: { url: './models/zone3-s16.glb?v=1', basic: true, fallbackColor: 0x484060 },
  zone3S17: { url: './models/zone3-s17.glb?v=1', basic: true, fallbackColor: 0x403a52 },
  zone3C11: { url: './models/zone3-c11.glb?v=1', basic: true, fallbackColor: 0x2a2438 },
  zone3C12: { url: './models/zone3-c12.glb?v=1', basic: true, fallbackColor: 0x3a3050 },
  zone3C13: { url: './models/zone3-c13.glb?v=1', basic: true, fallbackColor: 0x302844 },
  zone4S22: { url: './models/zone3-s22.glb?v=1', basic: true, fallbackColor: 0x352820 },
  zone4S23: { url: './models/zone3-s23.glb?v=1', basic: true, fallbackColor: 0x2a2018 },
  zone4S24: { url: './models/zone3-s24.glb?v=1', basic: true, fallbackColor: 0x402e20 },
  zone4S25: { url: './models/zone3-s25.glb?v=1', basic: true, fallbackColor: 0x201810 },
  zone4S26: { url: './models/zone3-s26.glb?v=1', basic: true, fallbackColor: 0x3a2420 },
  zone4C21: { url: './models/zone3-c21.glb?v=1', basic: true, fallbackColor: 0x160508 },
  zone4C22: { url: './models/zone3-c22.glb?v=1', basic: true, fallbackColor: 0x896240 },
  zone4C23: { url: './models/zone3-c23.glb?v=1', basic: true, fallbackColor: 0x71553d },
  zone4C24: { url: './models/zone3-c24.glb?v=1', basic: true, fallbackColor: 0xff2220 },
};

const templates = {};
const started = new Set();
const readyListeners = new Set();

const ZONE_PROP_IDS = {
  [-1]: [
    'zone0Coral', 'zone0Rock', 'zone0CoralB', 'zone0RockB', 'zone0CoralC', 'zone0CoralD',
    'zone0RockC', 'zone0CoralE', 'zone0CoralF', 'zone0CoralG', 'zone0CoralH',
    'zone0Nc02', 'zone0Noc002', 'zone0Surf01', 'zone0Surf02', 'zone0Surf03',
    'zone0Surf04', 'zone0Surf05', 'zone0Surf06',
    'zone0RockNew1', 'zone0RockNew2', 'zone0RockNew3',
  ],
  0: [
    'zone0Coral', 'zone0Rock', 'zone0CoralB', 'zone0RockB', 'zone0CoralC', 'zone0CoralD',
    'zone0RockC', 'zone0CoralE', 'zone0CoralF', 'zone0CoralG', 'zone0CoralH',
    'zone0Nc02', 'zone0Noc002', 'zone0Surf01', 'zone0Surf02', 'zone0Surf03',
    'zone0Surf04', 'zone0Surf05', 'zone0Surf06',
    'zone0RockNew1', 'zone0RockNew2', 'zone0RockNew3',
  ],
  1: [
    'zone1Stone1', 'zone1Stone2', 'zone1Stone3', 'zone1Stone4', 'zone1Stone5',
    'zone1Decor1', 'zone1Decor2', 'zone1Decor3', 'zone1Decor4', 'zone1Decor5',
  ],
  2: [
    'zone2S1', 'zone2S2', 'zone2S3', 'zone2S4', 'zone2S5', 'zone2S6',
    'zone2C1', 'zone2C2', 'zone2C3', 'zone2C4',
  ],
  3: [
    'zone3S11', 'zone3S12', 'zone3S13', 'zone3S14', 'zone3S15', 'zone3S16', 'zone3S17',
    'zone3C11', 'zone3C12', 'zone3C13',
  ],
  4: [
    'zone4S22', 'zone4S23', 'zone4S24', 'zone4S25', 'zone4S26',
    'zone4C21', 'zone4C22', 'zone4C23', 'zone4C24',
  ],
};

export function propIdsForZone(zoneId) {
  return ZONE_PROP_IDS[zoneId | 0] || null;
}

export function areZonePropsReady(zoneId) {
  const ids = propIdsForZone(zoneId);
  if (!ids || !ids.length) return true;
  return ids.every((id) => !!templates[id]);
}

export function ensureZonePropGlbsLoading(zoneId) {
  const ids = propIdsForZone(zoneId);
  if (!ids) {
    ensureAllPropGlbsLoading();
    return;
  }
  for (const id of ids) ensurePropGlbLoading(id);
}

export function isPropGlbReady(id) {
  return !!templates[id];
}

export function onPropGlbReady(cb) {
  readyListeners.add(cb);
  for (const id of Object.keys(templates)) cb(id);
  return () => readyListeners.delete(cb);
}

export function ensureAllPropGlbsLoading() {
  for (const id of Object.keys(PROP_CONFIG)) ensurePropGlbLoading(id);
}

export function ensurePropGlbLoading(id) {
  const cfg = PROP_CONFIG[id];
  if (!cfg || started.has(id)) return;
  started.add(id);
  const loader = new GLTFLoader();
  loader.load(
    cfg.url,
    (gltf) => {
      if (cfg.basic) toBasicMat(gltf.scene, cfg.fallbackColor);
      templates[id] = bakeGltfScene(gltf.scene);
      for (const fn of readyListeners) fn(id);
    },
    undefined,
    (err) => console.error(`prop GLB load failed (${id}):`, err),
  );
}

export function clonePropGlb(id) {
  const tpl = templates[id];
  if (!tpl) return null;
  const model = tpl.clone(true);
  model.userData.propGlb = true;
  model.traverse((o) => {
    if (o.isMesh) o.userData.propGlbShared = true;
  });
  return model;
}

/** GLB shader exports often have no in-browser textures — use game toon colors. */
const _matCache = new Map();
export function styleCoralProp(root, color, gradientMap) {
  const key = `${color}_${gradientMap?.uuid ?? ''}`;
  root.traverse((o) => {
    if (!o.isMesh || o.userData.isOutline) return;
    if (o.material?.map) return;
    let mat = _matCache.get(key);
    if (!mat) {
      mat = toonMat(color, gradientMap, { flatShading: true, side: THREE.DoubleSide });
      _matCache.set(key, mat);
    }
    o.material = mat;
  });
}

/** Clone a GLTFLoader-parsed material (or array), preserving original PBR properties. */
function cloneMat(mat) {
  if (!mat) return new THREE.MeshStandardMaterial();
  if (Array.isArray(mat)) return mat.map(cloneMat);
  const cloned = mat.clone();
  if (!cloned.side) cloned.side = THREE.DoubleSide;
  return cloned;
}

/** Rewrite all mesh materials to MeshLambertMaterial (diffuse shading — shows 3D edges).
 *  Textures and alpha are preserved. Colorless meshes get the zone's fallback hue. */
function toBasicMat(source, fallbackHex) {
  const fallback = new THREE.Color(fallbackHex ?? 0x9a9080);
  source.traverse((o) => {
    if (!o.isMesh) return;
    const mat = o.material;
    const tex = mat?.map || null;
    // No texture → always use zone fallback regardless of model's default vertex color
    const bc = tex
      ? (mat?.color?.clone() || new THREE.Color(1, 1, 1))
      : fallback.clone();
    o.material = new THREE.MeshLambertMaterial({
      map: tex || null,
      color: bc,
      side: THREE.DoubleSide,
      transparent: mat?.transparent || false,
      alphaTest: tex ? Math.max(mat?.alphaTest || 0, 0.5) : 0,
    });
  });
}

function bakeGltfScene(source) {
  const root = new THREE.Group();
  root.name = 'propGlbRoot';
  source.updateMatrixWorld(true);

  source.traverse((o) => {
    if (!o.isMesh) return;
    const geo = o.geometry.clone();
    geo.applyMatrix4(o.matrixWorld);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, cloneMat(o.material));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  });

  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  root.userData.baseSize = Math.max(size.x, size.y, size.z, 1e-6);
  root.userData.baseSizeXZ = Math.max(size.x, size.z, 1e-6);
  root.position.x -= (box.min.x + box.max.x) * 0.5;
  root.position.z -= (box.min.z + box.max.z) * 0.5;
  root.position.y -= box.min.y;
  return root;
}

ensureAllPropGlbsLoading();