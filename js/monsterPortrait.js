import * as THREE from 'three';
import { createToonGradient } from './stylekit.js';
import { createMonsterMesh } from './hazards.js?v=20c';

const cache = new Map();
const PORTRAIT_PX = 256;

let renderer = null;
let scene = null;
let camera = null;
let gradientMap = null;
const _box = new THREE.Box3();
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
  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(3, 4, 5);
  scene.add(key);
  gradientMap = createToonGradient();
}

export function getMonsterPortrait(monsterId) {
  const id = monsterId || 'shark';
  const key = `${id}@v1`;
  if (cache.has(key)) return cache.get(key);

  ensure();
  renderer.setSize(PORTRAIT_PX, PORTRAIT_PX, false);
  renderer.setViewport(0, 0, PORTRAIT_PX, PORTRAIT_PX);

  const mesh = createMonsterMesh(id, gradientMap);
  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0.2, -0.55, 0);
  mesh.updateMatrixWorld(true);

  _box.setFromObject(mesh);
  _box.getBoundingSphere(_sphere);
  mesh.position.x -= _sphere.center.x;
  mesh.position.y -= _sphere.center.y;
  mesh.position.z -= _sphere.center.z;
  mesh.updateMatrixWorld(true);

  _box.setFromObject(mesh);
  _box.getBoundingSphere(_sphere);
  const r = Math.max(_sphere.radius, 0.5) * 1.35;
  camera.left = -r;
  camera.right = r;
  camera.top = r;
  camera.bottom = -r;
  camera.position.set(0, 0, 24);
  camera.lookAt(0, 0, 0);
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
