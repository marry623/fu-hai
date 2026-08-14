import * as THREE from 'three';
import { addOutline, toonMat, hash2 } from './stylekit.js';

/**
 * Floating salvage: package / barrel / bubble
 */
export function createFlotsamField(gradientMap, count = 26) {
  const root = new THREE.Group();
  root.name = 'flotsam';
  const list = [];

  for (let i = 0; i < count; i++) {
    const typeRoll = hash2(i, 1);
    let type = 'package';
    if (typeRoll > 0.66) type = 'barrel';
    else if (typeRoll > 0.33) type = 'bubble';

    const obj = createFlotsam(gradientMap, i, type);
    placeFlotsam(obj, i);
    root.add(obj);
    list.push(obj);
  }

  return { root, list };
}

function createFlotsam(gradientMap, id, type) {
  const g = new THREE.Group();
  g.name = `flotsam_${id}`;
  g.userData.id = id;
  g.userData.type = type;
  g.userData.collected = false;
  g.userData.bob = Math.random() * Math.PI * 2;

  if (type === 'package') {
    const black = toonMat(0x140812, gradientMap);
    black.emissive = new THREE.Color(0x2a0840);
    black.emissiveIntensity = 0.3;
    const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 0), black);
    body.position.y = 0.4;
    g.add(body);
    addOutline(body, 1.1);
    const aura = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1.1, 8),
      new THREE.MeshBasicMaterial({
        color: 0x8b2cff,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    aura.rotation.x = -Math.PI / 2;
    aura.position.y = 0.05;
    aura.userData.skipOutline = true;
    aura.userData.isAura = true;
    g.add(aura);
  } else if (type === 'barrel') {
    const wood = toonMat(0xa05a28, gradientMap);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.9, 8), wood);
    body.position.y = 0.5;
    body.rotation.z = Math.PI / 2;
    g.add(body);
    addOutline(body, 1.08);
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.56, 0.06, 4, 10),
      toonMat(0x222222, gradientMap)
    );
    band.position.y = 0.5;
    band.rotation.y = Math.PI / 2;
    g.add(band);
    addOutline(band, 1.15);
  } else {
    // glowing bubble
    const bub = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.55, 0),
      new THREE.MeshBasicMaterial({
        color: 0x7dffef,
        transparent: true,
        opacity: 0.65,
      })
    );
    bub.position.y = 0.55;
    g.add(bub);
    addOutline(bub, 1.12);
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.75, 6, 5),
      new THREE.MeshBasicMaterial({
        color: 0x4dffd0,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
      })
    );
    glow.position.y = 0.55;
    glow.userData.skipOutline = true;
    g.add(glow);
  }

  return g;
}

function placeFlotsam(obj, i) {
  const z = 30 + hash2(i, 7) * 200;
  const x = (hash2(i, 3) - 0.5) * 50;
  obj.position.set(x, 0, z);
  obj.visible = true;
  obj.userData.collected = false;
}

export function updateFlotsam(list, time) {
  for (const p of list) {
    if (!p.visible || p.userData.collected) continue;
    p.position.y = 0.2 + Math.sin(time * 1.5 + p.userData.bob) * 0.15;
    p.rotation.y += 0.003;
    const aura = p.children.find((c) => c.userData.isAura);
    if (aura) {
      aura.material.opacity = 0.28 + Math.sin(time * 3 + p.userData.bob) * 0.12;
    }
  }
}

export function findNearestFlotsam(list, pos, radius = 7) {
  let best = null;
  let bestD = radius;
  for (const p of list) {
    if (!p.visible || p.userData.collected) continue;
    const d = pos.distanceTo(p.position);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best ? { item: best, dist: bestD } : null;
}

export function respawnFlotsam(obj, index) {
  placeFlotsam(obj, index + (Date.now() % 1000));
  obj.userData.collected = false;
  obj.visible = true;
}

/**
 * Resolve salvage outcome.
 * @returns {{ type: 'supply'|'trap'|'event', supply?: string, amount?: number, event?: object }}
 */
export function rollSalvage(flotsamType) {
  const r = Math.random();
  // bubbles lean event, barrels lean supply, packages lean trap/supply
  let trapW = 0.18;
  let eventW = 0.18;
  if (flotsamType === 'bubble') {
    eventW = 0.35;
    trapW = 0.1;
  }
  if (flotsamType === 'barrel') {
    trapW = 0.08;
    eventW = 0.12;
  }
  if (flotsamType === 'package') {
    trapW = 0.28;
  }

  if (r < trapW) {
    return { type: 'trap', damage: 20 };
  }
  if (r < trapW + eventW) {
    return {
      type: 'event',
      event: {
        title: '漂流瓶',
        a: { label: '收下修理包', key: 'repair' },
        b: { label: '换取鱼饵×2', key: 'bait' },
      },
    };
  }

  const supplies = [
    { supply: 'plank', name: '木板', amount: 1 },
    { supply: 'bait', name: '鱼饵', amount: 1 + Math.floor(Math.random() * 2) },
    { supply: 'repair', name: '修理包', amount: 1 },
  ];
  const s = supplies[Math.floor(Math.random() * supplies.length)];
  return { type: 'supply', ...s };
}
