import * as THREE from '../vendor/three/three.module.js';

/** Beat lengths in seconds — kept short so the reward never sits in the sailing view. */
const RISE = 0.12;
const HOLD = 0.18;
const FALL = 0.32;
const TOTAL = RISE + HOLD + FALL;
/** Longest axis every reward is normalized to, so a black package reads like a small fish. */
const DISPLAY_SIZE = 1.1;
const PEAK_SCALE = 1.25;
/** Sideways offset from the boat, measured along the camera right axis. */
const SIDE_OFFSET = 4.8;
const APEX_LIFT = 0.9;

const UP = new THREE.Vector3(0, 1, 0);

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function easeOutCubic(x) {
  const a = 1 - clamp01(x);
  return 1 - a * a * a;
}

function easeInCubic(x) {
  const a = clamp01(x);
  return a * a * a;
}

/**
 * Center the object and rescale it to a fixed on-screen size, returning the wrapper.
 */
function normalize(object) {
  const holder = new THREE.Group();
  holder.add(object);

  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return holder;

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const longest = Math.max(size.x, size.y, size.z);
  const k = longest > 1e-3 ? DISPLAY_SIZE / longest : 1;
  object.position.sub(center);
  holder.scale.setScalar(k);
  return holder;
}

/**
 * Short, non-blocking reward presentation shared by fishing and salvage.
 */
export function createRewardFlight({
  scene,
  camera,
  getTarget,
  addCameraShake,
}) {
  const active = [];
  const target = new THREE.Vector3();
  const right = new THREE.Vector3();
  const offset = new THREE.Vector3();

  /** Apex sits beside the boat along the camera right axis, low over the water. */
  function computeApex(from, out) {
    getTarget(target);
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    right.y = 0;
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    right.normalize();
    offset.set(from.x - target.x, 0, from.z - target.z);
    const side = right.dot(offset) < 0 ? -1 : 1;
    return out
      .copy(target)
      .addScaledVector(right, SIDE_OFFSET * side)
      .setY(target.y + APEX_LIFT);
  }

  function spawn({
    object,
    from,
    danger = false,
    onLand,
  }) {
    if (!object || !from) return false;

    const holder = normalize(object);
    const root = new THREE.Group();
    root.name = 'rewardFlight';
    root.position.set(from.x, Math.max(0.35, from.y ?? 0.35), from.z);
    root.scale.setScalar(0.75);
    root.add(holder);
    scene.add(root);

    const entry = {
      root,
      holder,
      from: root.position.clone(),
      apex: computeApex(root.position, new THREE.Vector3()),
      elapsed: 0,
      danger,
      landed: false,
      onLand,
    };
    active.push(entry);

    addCameraShake?.(0.04, 80);
    return true;
  }

  function remove(entry, invokeLand) {
    if (entry.landed) return;
    entry.landed = true;
    scene.remove(entry.root);
    if (invokeLand) entry.onLand?.();
  }

  function update(dt) {
    for (let i = active.length - 1; i >= 0; i--) {
      const entry = active[i];
      entry.elapsed += Math.max(0, dt);
      const t = entry.elapsed;
      const { root } = entry;

      if (t < RISE) {
        const k = easeOutCubic(t / RISE);
        root.position.lerpVectors(entry.from, entry.apex, k);
        root.scale.set(0.75 + k * 0.5, 0.6 + k * 0.65, 0.75 + k * 0.5);
      } else if (t < RISE + HOLD) {
        const k = (t - RISE) / HOLD;
        root.position.copy(entry.apex);
        root.position.y += Math.sin(k * Math.PI) * 0.22;
        root.scale.setScalar(PEAK_SCALE + Math.sin(k * Math.PI * 2) * 0.05);
      } else {
        const k = clamp01((t - RISE - HOLD) / FALL);
        getTarget(target);
        root.position.lerpVectors(entry.apex, target, easeInCubic(k));
        root.position.y += Math.sin(k * Math.PI) * 0.45;
        root.scale.setScalar(PEAK_SCALE + (0.22 - PEAK_SCALE) * easeOutCubic(k));
      }

      entry.holder.rotateOnWorldAxis(UP, dt * 3.6);

      if (t >= TOTAL) {
        addCameraShake?.(entry.danger ? 0.16 : 0.05, entry.danger ? 170 : 100);
        remove(entry, true);
        active.splice(i, 1);
      }
    }
  }

  function clear() {
    for (const entry of active) remove(entry, false);
    active.length = 0;
  }

  return { spawn, update, clear, get activeCount() { return active.length; } };
}
