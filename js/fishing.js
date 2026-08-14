import * as THREE from 'three';
import { addOutline, toonMat, hash2 } from './stylekit.js';
import { pickFishForZone, qteForFish } from './fishCatalog.js';
import { zoneIndexFromDistance as zDist } from './zones.js';

export function createVortexField(gradientMap, count = 12) {
  const root = new THREE.Group();
  const list = [];
  for (let i = 0; i < count; i++) {
    const v = createVortex(gradientMap, i);
    const ang = hash2(i, 11) * Math.PI * 2;
    const dist = 25 + hash2(i, 13) * 40 + i * 35;
    v.position.set(Math.sin(ang) * 20, 0, dist);
    root.add(v);
    list.push(v);
  }
  return { root, list };
}

function createVortex(gradientMap, id) {
  const g = new THREE.Group();
  g.userData.id = id;
  g.userData.radius = 10;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3, 0.3, 4, 10), toonMat(0x1a4a5a, gradientMap));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.1;
  g.add(ring);
  addOutline(ring, 1.08);
  const core = new THREE.Mesh(
    new THREE.CircleGeometry(1.1, 8),
    new THREE.MeshBasicMaterial({ color: 0x0a1820, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false })
  );
  core.rotation.x = -Math.PI / 2;
  core.position.y = 0.05;
  core.userData.skipOutline = true;
  g.add(core);
  g.userData.spin = ring;
  return g;
}

export function updateVortices(list, time) {
  for (const v of list) {
    if (v.userData.spin) v.userData.spin.rotation.z = time * 1.5;
    // keep vortices ahead of run — respawn behind boat far ahead
  }
}

export function relocateVortices(list, boatZ) {
  for (const v of list) {
    if (v.position.z < boatZ - 30) {
      v.position.z = boatZ + 40 + Math.random() * 80;
      v.position.x = (Math.random() - 0.5) * 50;
    }
  }
}

export function findNearestVortex(list, pos, pad = 0) {
  let best = null;
  let bestD = Infinity;
  for (const v of list) {
    const d = Math.hypot(pos.x - v.position.x, pos.z - v.position.z);
    if (d < (v.userData.radius || 10) + pad && d < bestD) {
      bestD = d;
      best = v;
    }
  }
  return best ? { vortex: best, dist: bestD } : null;
}

/**
 * Fishing with rarity-based slow QTE + multi-hit.
 */
export function createFishingController(hooks) {
  const st = {
    phase: 'idle',
    timer: 0,
    pointer: 0,
    dir: 1,
    greenCenter: 0.5,
    greenWidth: 0.6,
    speed: 0.5,
    hitsNeeded: 1,
    hitsDone: 0,
    pendingRarityTarget: null,
    depthZone: 0,
  };

  function reset() {
    st.phase = 'idle';
    st.hitsDone = 0;
    hooks.onPhase?.('idle');
  }

  function tryCast(inVortex, hasBait, runDistance, greenBonus = 1, startZone = 0) {
    if (st.phase !== 'idle') return false;
    if (!inVortex) {
      hooks.toast?.('附近没有鱼群漩涡');
      return false;
    }
    st.depthZone = zDist(runDistance, startZone);
    // Preview fish rarity for QTE difficulty — pick fish now
    const fish = pickFishForZone(st.depthZone);
    st.pendingFish = fish;
    const q = qteForFish(fish.defId);
    st.greenWidth = Math.min(0.85, q.green * greenBonus);
    st.speed = (1 / q.cycle) * 0.85; // slow traverse
    st.hitsNeeded = q.hits;
    st.hitsDone = 0;
    st.greenCenter = 0.35 + Math.random() * 0.3;
    st.pointer = 0;
    st.dir = 1;
    st.phase = 'wait';
    st.timer = hasBait ? 0.6 + Math.random() * 0.5 : 1.0 + Math.random() * 0.8;
    hooks.onPhase?.('wait');
    hooks.onRod?.(true);
    return true;
  }

  function onSpace() {
    if (st.phase !== 'qte') return;
    const half = st.greenWidth / 2;
    const hit = st.pointer >= st.greenCenter - half && st.pointer <= st.greenCenter + half;
    if (hit) {
      st.hitsDone += 1;
      hooks.toast?.(`判定 ${st.hitsDone}/${st.hitsNeeded}`);
      st.greenCenter = 0.3 + Math.random() * 0.4;
      st.pointer = 0;
      if (st.hitsDone >= st.hitsNeeded) {
        hooks.onCatch?.(st.pendingFish);
        reset();
        hooks.onRod?.(false);
      }
    } else {
      hooks.toast?.('脱钩了！');
      reset();
      hooks.onRod?.(false);
    }
  }

  function update(dt) {
    if (st.phase === 'wait') {
      st.timer -= dt;
      if (st.timer <= 0) {
        st.phase = 'qte';
        hooks.onPhase?.('qte');
        hooks.toast?.('咬钩！空格停在绿区');
      }
    } else if (st.phase === 'qte') {
      st.pointer += st.dir * st.speed * dt;
      if (st.pointer >= 1) { st.pointer = 1; st.dir = -1; }
      if (st.pointer <= 0) { st.pointer = 0; st.dir = 1; }
      hooks.onQte?.(st.pointer, st.greenCenter, st.greenWidth);
    }
  }

  return {
    get phase() { return st.phase; },
    tryCast,
    onSpace,
    update,
    reset,
    snapToGreen() { st.pointer = st.greenCenter; },
  };
}
