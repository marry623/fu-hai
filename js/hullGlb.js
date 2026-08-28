import * as THREE from 'three';
import { GLTFLoader } from '../vendor/three/GLTFLoader.js';

export const HULL_GLB_IDS = ['raft', 'heavyRaft', 'chargeBoat'];

/**
 * Heavy raft / charge boat read too small in-run. Hub and backpack previews divide
 * their root scale by the same factor, so only the in-run boat grows.
 */
const HULL_UPSCALE = {
  heavyRaft: 1.3,
  chargeBoat: 1.45,
};

/** How much a hull grew past its authored size — oar mounts follow this. */
export function hullUpscale(boatId) {
  return HULL_UPSCALE[boatId] || 1;
}

const HULL_CONFIG = {
  raft: { url: './models/raft.glb?v=6', targetLength: 7.9 },
  heavyRaft: { url: './models/heavy-raft.glb', targetLength: 8.4 * hullUpscale('heavyRaft') },
  chargeBoat: { url: './models/charge-boat.glb?v=2', targetLength: 10.5 * hullUpscale('chargeBoat') },
};

const templates = {};
const started = new Set();
let portraitRev = 0;
const readyListeners = new Set();

export function isHullGlbId(id) {
  return HULL_GLB_IDS.includes(id);
}

export function hullPortraitRev() {
  return portraitRev;
}

export function onHullGlbReady(cb) {
  readyListeners.add(cb);
  if (HULL_GLB_IDS.every((id) => templates[id])) cb();
  return () => readyListeners.delete(cb);
}

export function ensureAllHullGlbsLoading() {
  for (const id of HULL_GLB_IDS) ensureHullGlbLoading(id);
}

export function ensureHullGlbLoading(boatId) {
  const id = boatId || 'raft';
  const cfg = HULL_CONFIG[id];
  if (!cfg || started.has(id)) return;
  started.add(id);
  const loader = new GLTFLoader();
  loader.load(
    cfg.url,
    (gltf) => {
      templates[id] = normalizeHullScene(gltf.scene, cfg.targetLength);
      portraitRev += 1;
      for (const fn of readyListeners) fn(id);
    },
    undefined,
    (err) => console.error(`hull GLB load failed (${id}):`, err),
  );
}

export function getHullGlbTemplate(boatId) {
  return templates[boatId] || null;
}

/** Clone a normalized hull; marks meshes so shared GLB assets are not disposed. */
export function cloneHullGlb(boatId) {
  const tpl = templates[boatId];
  if (!tpl) return null;
  const model = tpl.clone(true);
  model.userData.hullGlb = true;
  model.traverse((o) => {
    if (o.isMesh) o.userData.hullGlbShared = true;
  });
  return model;
}

function normalizeHullScene(source, targetLength) {
  const root = new THREE.Group();
  root.name = 'hullGlbRoot';
  root.add(source);

  const fit = () => {
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getSize(size);
    return { box, size };
  };

  let { box, size } = fit();
  if (size.x > size.z * 1.05) root.rotation.y = Math.PI / 2;

  ({ box, size } = fit());
  const length = Math.max(size.x, size.z);
  const scale = targetLength / Math.max(length, 1e-6);
  root.scale.setScalar(scale);

  ({ box } = fit());
  root.position.x -= (box.min.x + box.max.x) * 0.5;
  root.position.z -= (box.min.z + box.max.z) * 0.5;
  root.position.y -= box.min.y;
  root.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(root);
  root.userData.hullExtents = {
    minX: box.min.x,
    maxX: box.max.x,
    minY: box.min.y,
    maxY: box.max.y,
    minZ: box.min.z,
    maxZ: box.max.z,
  };
  return root;
}

ensureAllHullGlbsLoading();
