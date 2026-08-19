import * as THREE from 'three';
import { createToonGradient } from './stylekit.js';
import { createFishMesh } from './fishMeshes.js?v=31c';
import { foodEatKey, foodEatColor } from './fishCatalog.js?v=31g';

/** One shared portrait size — CSS scales for thumb vs detail. */
const PORTRAIT_PX = 256;
const cache = new Map();

let renderer = null;
let scene = null;
let camera = null;
let gradientMap = null;
const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _center = new THREE.Vector3();
const _sphere = new THREE.Sphere();

function ensure() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(PORTRAIT_PX, PORTRAIT_PX, false);
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.05, 80);
  const amb = new THREE.AmbientLight(0xffffff, 1.1);
  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(3, 4, 5);
  scene.add(amb, key);
  gradientMap = createToonGradient();
}

function portraitCacheKey(defId, fish) {
  const id = defId || fish?.defId || 'food';
  if (id === 'food') return `food:${foodEatKey(fish?.eat)}@v5`;
  return `${id}@v5`;
}

/**
 * @param {string} defId
 * @param {object} [fish] caught fish (food variants need eat/color)
 * @returns {string} data URL (always PORTRAIT_PX)
 */
export function getFishPortrait(defId, fish) {
  const id = defId || fish?.defId || 'food';
  const key = portraitCacheKey(id, fish);
  if (cache.has(key)) return cache.get(key);

  ensure();
  // Keep buffer size stable — avoids viewport/scissor bugs across sizes
  renderer.setSize(PORTRAIT_PX, PORTRAIT_PX, false);
  renderer.setViewport(0, 0, PORTRAIT_PX, PORTRAIT_PX);
  renderer.setScissorTest(false);

  const foodTint = id === 'food' ? (fish?.color || foodEatColor(fish?.eat)) : null;
  const mesh = createFishMesh(id, gradientMap, 1, foodTint);
  mesh.position.set(0, 0, 0);
  // Fish length is along +X; camera looks from +Z → side profile.
  // Slight yaw/pitch for a readable 3/4 side view (not head-on).
  mesh.rotation.set(0.15, -0.35, 0);
  mesh.updateMatrixWorld(true);

  _box.setFromObject(mesh);
  _box.getBoundingSphere(_sphere);
  mesh.position.x -= _sphere.center.x;
  mesh.position.y -= _sphere.center.y;
  mesh.position.z -= _sphere.center.z;
  mesh.updateMatrixWorld(true);

  _box.setFromObject(mesh);
  _box.getBoundingSphere(_sphere);
  const r = Math.max(_sphere.radius, 0.35) * 1.4;

  camera.left = -r;
  camera.right = r;
  camera.top = r;
  camera.bottom = -r;
  camera.position.set(0, 0, 20);
  camera.lookAt(0, 0, 0);
  camera.up.set(0, 1, 0);
  camera.updateProjectionMatrix();

  scene.add(mesh);
  renderer.clear();
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  scene.remove(mesh);
  mesh.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
      else o.material.dispose?.();
    }
  });

  cache.set(key, url);
  return url;
}

export function clearFishPortraitCache() {
  cache.clear();
}
