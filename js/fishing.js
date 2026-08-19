import * as THREE from 'three';
import { addOutline, toonMat, hash2 } from './stylekit.js';
import { pickFishForZone, qteForFish } from './fishCatalog.js?v=31g';
import { zoneIndexFromDistance as zDist } from './zones.js';

/** Dense fish schools across a large sea */
export const VORTEX_COUNT = 112;

export function createVortexField(gradientMap, count = VORTEX_COUNT) {
  const root = new THREE.Group();
  const list = [];
  for (let i = 0; i < count; i++) {
    const v = createVortex(gradientMap, i);
    const ang = hash2(i, 11) * Math.PI * 2;
    const dist = 30 + hash2(i, 13) * 50 + (i % 12) * 28;
    v.position.set(Math.sin(ang) * 40, 0, dist);
    root.add(v);
    list.push(v);
  }
  return { root, list };
}

function createVortex(gradientMap, id) {
  const g = new THREE.Group();
  g.userData.id = id;
  g.userData.radius = 18;
  g.userData.tintables = [];

  const outer = new THREE.Mesh(
    new THREE.TorusGeometry(8.5, 0.55, 5, 28),
    new THREE.MeshBasicMaterial({ color: 0x3cf5e6, transparent: true, opacity: 0.72, depthWrite: false })
  );
  outer.rotation.x = Math.PI / 2;
  outer.position.y = 0.14;
  outer.userData.skipOutline = true;
  g.add(outer);
  g.userData.tintables.push({ mesh: outer, role: 'outer' });

  const mid = new THREE.Mesh(
    new THREE.TorusGeometry(5.2, 0.42, 4, 22),
    toonMat(0x2ab8a8, gradientMap)
  );
  mid.rotation.x = Math.PI / 2;
  mid.position.y = 0.16;
  g.add(mid);
  addOutline(mid, 1.06);
  g.userData.tintables.push({ mesh: mid, role: 'mid' });
  g.userData.spin = mid;

  const inner = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.32, 4, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false })
  );
  inner.rotation.x = Math.PI / 2;
  inner.position.y = 0.18;
  inner.userData.skipOutline = true;
  g.add(inner);
  g.userData.tintables.push({ mesh: inner, role: 'foam' });

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(4.2, 16),
    new THREE.MeshBasicMaterial({
      color: 0x1a6a62,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.08;
  disc.userData.skipOutline = true;
  g.add(disc);
  g.userData.tintables.push({ mesh: disc, role: 'disc' });

  g.userData.fishBits = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const fish = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.7, 4),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
    );
    fish.rotation.z = Math.PI / 2;
    fish.position.set(Math.cos(a) * 3.4, 0.35, Math.sin(a) * 3.4);
    fish.userData.skipOutline = true;
    fish.userData.orbit = a;
    g.add(fish);
    g.userData.fishBits.push(fish);
    g.userData.tintables.push({ mesh: fish, role: 'fish' });
  }

  return g;
}

/** Tint all schools to the current sea map water color */
export function tintVortexField(list, waterHex) {
  const base = new THREE.Color(waterHex);
  const dark = base.clone().multiplyScalar(0.55);
  const mid = base.clone().lerp(new THREE.Color(0xffffff), 0.12);
  const bright = base.clone().lerp(new THREE.Color(0xffffff), 0.45);
  const foam = base.clone().lerp(new THREE.Color(0xffffff), 0.7);
  for (const v of list) {
    for (const t of v.userData.tintables || []) {
      const mat = t.mesh.material;
      if (!mat?.color) continue;
      if (t.role === 'outer') mat.color.copy(bright);
      else if (t.role === 'mid') mat.color.copy(mid);
      else if (t.role === 'disc') mat.color.copy(dark);
      else if (t.role === 'foam') mat.color.copy(foam);
      else if (t.role === 'fish') mat.color.copy(bright);
    }
  }
}

export function updateVortices(list, time) {
  for (const v of list) {
    if (v.userData.spin) v.userData.spin.rotation.z = time * 1.2;
    const bits = v.userData.fishBits;
    if (!bits) continue;
    for (let i = 0; i < bits.length; i++) {
      const f = bits[i];
      const a = f.userData.orbit + time * 1.6;
      f.position.x = Math.cos(a) * 3.4;
      f.position.z = Math.sin(a) * 3.4;
      f.position.y = 0.28 + Math.sin(time * 3 + i) * 0.12;
      f.rotation.y = -a;
    }
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
    if (v.visible === false) continue;
    const d = Math.hypot(pos.x - v.position.x, pos.z - v.position.z);
    if (d < (v.userData.radius || 18) + pad && d < bestD) {
      bestD = d;
      best = v;
    }
  }
  return best ? { vortex: best, dist: bestD } : null;
}

/** Cast distance ahead of boat (m). */
export const CAST_AIM_DIST = 9;

/**
 * Fishing: cast anywhere → wait; bite only when bobber near vortex.
 */
export function createFishingController(hooks) {
  const st = {
    phase: 'idle',
    timer: 0,
    waitMin: 0,
    waitMax: 0,
    waitElapsed: 0,
    castDur: 0.52,
    castT: 0,
    pointer: 0,
    dir: 1,
    greenCenter: 0.5,
    greenWidth: 0.6,
    speed: 0.5,
    hitsNeeded: 1,
    hitsDone: 0,
    pendingFish: null,
    depthZone: 0,
    aim: { x: 0, z: 0 },
    bobber: { x: 0, z: 0 },
    nearVortex: false,
  };

  function reset() {
    st.phase = 'idle';
    st.hitsDone = 0;
    st.nearVortex = false;
    st.castT = 0;
    st.waitElapsed = 0;
    hooks.onPhase?.('idle');
  }

  function interrupt(reason) {
    if (st.phase !== 'qte' && st.phase !== 'wait' && st.phase !== 'cast') return false;
    reset();
    hooks.onRod?.(false);
    return true;
  }

  function shrinkGreen(factor = 0.55) {
    st.greenWidth = Math.max(0.12, st.greenWidth * factor);
  }

  function tryCast(hasBait, runDistance, greenBonus = 1, startZone = 0, aimX = 0, aimZ = 0, baitKind = 'crude') {
    if (st.phase !== 'idle') return false;
    st.depthZone = zDist(runDistance, startZone);
    const fish = pickFishForZone(st.depthZone, baitKind);
    st.pendingFish = fish;
    const q = qteForFish(fish.defId);
    st.greenWidth = Math.min(0.85, q.green * greenBonus);
    st.speed = (1 / q.cycle) * 0.85;
    st.hitsNeeded = q.hits;
    st.hitsDone = 0;
    st.greenCenter = 0.35 + Math.random() * 0.3;
    st.pointer = 0;
    st.dir = 1;
    st.aim.x = aimX;
    st.aim.z = aimZ;
    st.bobber.x = aimX;
    st.bobber.z = aimZ;
    st.waitMin = hasBait ? 2.0 + Math.random() * 0.8 : 2.4 + Math.random() * 1.1;
    st.waitMax = hasBait ? 8.5 : 10;
    st.waitElapsed = 0;
    st.castDur = 0.52;
    st.castT = 0;
    st.nearVortex = false;
    st.phase = 'cast';
    hooks.onPhase?.('cast');
    hooks.onRod?.(true);
    hooks.onCastStart?.(st.aim);
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
        hooks.onFishingEnd?.();
      }
    } else {
      hooks.toast?.('脱钩了！');
      reset();
      hooks.onRod?.(false);
      hooks.onFishingEnd?.();
    }
  }

  /**
   * @param {number} dt
   * @param {{ x:number, z:number } | null} vortexHit
   */
  function update(dt, vortexHit = null) {
    if (st.phase === 'cast') {
      st.castT += dt;
      const u = Math.min(1, st.castT / st.castDur);
      hooks.onCastProgress?.(u, st.aim);
      if (u >= 1) {
        st.phase = 'wait';
        st.waitElapsed = 0;
        hooks.onPhase?.('wait');
        hooks.onCastLand?.(st.bobber);
      }
      return;
    }

    if (st.phase === 'wait') {
      st.waitElapsed += dt;
      st.nearVortex = !!vortexHit;
      hooks.onWaitTick?.(st.bobber, st.nearVortex, st.waitElapsed);

      const pastMin = st.waitElapsed >= st.waitMin;
      if (pastMin && vortexHit) {
        st.phase = 'qte';
        hooks.onPhase?.('qte');
        hooks.toast?.('咬钩！空格停在绿区');
        return;
      }
      if (st.waitElapsed >= st.waitMax) {
        hooks.toast?.(vortexHit ? '鱼跑了…' : '这里没有鱼群');
        reset();
        hooks.onRod?.(false);
        hooks.onFishingEnd?.();
      }
      return;
    }

    if (st.phase === 'qte') {
      st.pointer += st.dir * st.speed * dt;
      if (st.pointer >= 1) { st.pointer = 1; st.dir = -1; }
      if (st.pointer <= 0) { st.pointer = 0; st.dir = 1; }
      hooks.onQte?.(st.pointer, st.greenCenter, st.greenWidth);
    }
  }

  return {
    get phase() { return st.phase; },
    get aim() { return st.aim; },
    get bobber() { return st.bobber; },
    get castT() { return Math.min(1, st.castT / st.castDur); },
    get nearVortex() { return st.nearVortex; },
    tryCast,
    onSpace,
    update,
    reset() {
      reset();
      hooks.onRod?.(false);
      hooks.onFishingEnd?.();
    },
    interrupt(reason) {
      const ok = interrupt(reason);
      if (ok) hooks.onFishingEnd?.();
      return ok;
    },
    shrinkGreen,
    snapToGreen() { st.pointer = st.greenCenter; },
  };
}
