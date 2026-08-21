import * as THREE from 'three';

/** Cel-shading gradient (hard steps) — keep bright for cartoon punch */
export function createToonGradient() {
  const data = new Uint8Array([
    140, 140, 140, 255,
    200, 200, 200, 255,
    255, 255, 255, 255,
  ]);
  const t = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

export function toonMat(color, gradientMap, opts = {}) {
  return new THREE.MeshToonMaterial({
    color,
    gradientMap,
    ...opts,
  });
}

const outlineMatCache = new Map();

function getOutlineMat(color = 0x000000) {
  if (!outlineMatCache.has(color)) {
    const mat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.BackSide,
    });
    // Shared across all outlines — mark so fade/hit code never mutates opacity.
    mat.userData.isOutlineMat = true;
    outlineMatCache.set(color, mat);
  }
  return outlineMatCache.get(color);
}

/** Restore shared outline mats if something accidentally faded them. */
export function ensureOutlineMaterials() {
  for (const mat of outlineMatCache.values()) {
    mat.transparent = false;
    mat.opacity = 1;
    mat.visible = true;
    mat.depthWrite = true;
  }
}

/**
 * Inverse-hull outline — matches the video's thick comic outlines.
 */
export function addOutline(mesh, scale = 1.08, color = 0x000000) {
  if (!mesh.isMesh || !mesh.geometry) return null;
  const outline = new THREE.Mesh(mesh.geometry, getOutlineMat(color));
  outline.scale.setScalar(scale);
  outline.renderOrder = -1;
  outline.userData.isOutline = true;
  mesh.add(outline);
  return outline;
}

export function addOutlineRecursive(root, scale = 1.07) {
  root.traverse((obj) => {
    if (obj.isMesh && !obj.userData.isOutline && !obj.userData.skipOutline) {
      addOutline(obj, scale);
    }
  });
}

/** Simple seeded noise for water / parcel shapes */
export function hash2(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
