/**
 * Family resonance VFX — skill-parity glow on the water under the boat
 * (same plane as foam rings), not mounted on the hull.
 */
import * as THREE from 'three';
import { FAMILIES } from './fishCatalog.js?v=34b';
import { createGpuSparks } from './vfx/gpuSparks.js?v=32p';
import { createBurstSystem, BurstMode } from './vfx/burstSphere.js?v=32p';
import { BOAT_WATERLINE_Y } from './boat.js?v=42i';

const R_ORDER = 11;
/** Boat-local Y for water surface (foam sits at world ~0.05). */
const WATER_Y = 0.05 - BOAT_WATERLINE_Y;

function hex(c) {
  if (typeof c === 'number') return c;
  return parseInt(String(c).replace('#', ''), 16) || 0xffffff;
}

function glowMat(color, opacity = 0.7) {
  return new THREE.MeshBasicMaterial({
    color: hex(color),
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

function mark(obj, order = R_ORDER) {
  obj.userData.skipOutline = true;
  obj.renderOrder = order;
  if (obj.material) obj.material.userData.baseOp = obj.material.opacity;
  return obj;
}

function waterRing(inner, outer, color, opacity, segs = 28) {
  const m = new THREE.Mesh(
    new THREE.RingGeometry(inner, outer, segs),
    glowMat(color, opacity)
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = WATER_Y;
  return mark(m);
}

function waterDisc(r, color, opacity, segs = 24) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(r, segs),
    glowMat(color, opacity)
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = WATER_Y;
  return mark(m);
}

function waterChevron(color, opacity) {
  const g = new THREE.ConeGeometry(0.95, 2.2, 3);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, glowMat(color, opacity));
  m.position.set(0, WATER_Y + 0.02, -2.35);
  m.scale.set(1, 0.12, 1);
  return mark(m);
}

/**
 * @param {THREE.Object3D} boat
 */
export function createFamilyVfx(boat) {
  const root = new THREE.Group();
  root.name = 'familyVfx';
  boat.add(root);
  const sparks = createGpuSparks(root);
  const bursts = createBurstSystem(root);

  const C = {
    shell: FAMILIES.shell.color,
    ink: FAMILIES.ink.color,
    drive: FAMILIES.drive.color,
    gale: FAMILIES.gale.color,
    tide: FAMILIES.tide.color,
    rift: FAMILIES.rift.color,
  };

  /** @type {Record<string, THREE.Group>} */
  const nodes = {};
  /** @type {Record<string, object>} */
  const parts = {};

  // shell — armor aura rings under hull
  {
    const g = new THREE.Group();
    const ringA = waterRing(1.25, 1.65, C.shell, 0.62);
    const ringB = waterRing(1.55, 1.95, C.shell, 0.4);
    const glow = waterDisc(1.35, C.shell, 0.28);
    g.add(ringA, ringB, glow);
    root.add(g);
    nodes.shell = g;
    parts.shell = { rings: [ringA, ringB], glow };
  }

  // ink — wide spinning waist ring + motes on water
  {
    const g = new THREE.Group();
    const ring = waterRing(1.45, 1.9, C.ink, 0.58);
    const glow = waterDisc(1.4, C.ink, 0.26);
    const motes = [];
    for (let i = 0; i < 8; i++) {
      const s = mark(new THREE.Mesh(
        new THREE.OctahedronGeometry(0.2, 0),
        glowMat(C.ink, 0.82)
      ));
      const a = (i / 8) * Math.PI * 2;
      s.position.set(Math.cos(a) * 1.55, WATER_Y + 0.08, Math.sin(a) * 0.75);
      s.scale.set(1, 0.35, 1);
      g.add(s);
      motes.push(s);
    }
    g.add(ring, glow);
    root.add(g);
    nodes.ink = g;
    parts.ink = { ring, glow, motes };
  }

  // drive — stern stacked rings on water
  {
    const g = new THREE.Group();
    const rings = [];
    for (let i = 0; i < 3; i++) {
      const r = waterRing(0.48 + i * 0.34, 0.7 + i * 0.34, C.drive, 0.65 - i * 0.1);
      r.position.set(0, WATER_Y, 1.55 + i * 0.38);
      g.add(r);
      rings.push(r);
    }
    const glow = waterDisc(0.9, C.drive, 0.32);
    glow.position.set(0, WATER_Y, 1.75);
    g.add(glow);
    root.add(g);
    nodes.drive = g;
    parts.drive = { rings, glow };
  }

  // gale — water ring under mast / midship (not on sail)
  {
    const g = new THREE.Group();
    const ring = waterRing(0.55, 0.95, C.gale, 0.72);
    ring.position.set(0, WATER_Y, 0.15);
    const outer = waterRing(1.0, 1.35, C.gale, 0.42);
    outer.position.set(0, WATER_Y, 0.15);
    const glow = waterDisc(0.7, C.gale, 0.35);
    glow.position.set(0, WATER_Y, 0.15);
    g.add(ring, outer, glow);
    root.add(g);
    nodes.gale = g;
    parts.gale = { rings: [ring, outer], glow };
  }

  // tide — breathing ripples under keel
  {
    const g = new THREE.Group();
    const rings = [];
    for (let i = 0; i < 3; i++) {
      const r = waterRing(1.1 + i * 0.4, 1.35 + i * 0.4, C.tide, 0.58 - i * 0.1);
      g.add(r);
      rings.push(r);
    }
    const glow = waterDisc(1.25, C.tide, 0.3);
    g.add(glow);
    root.add(g);
    nodes.tide = g;
    parts.tide = { rings, glow };
  }

  // rift — bow shock ring + flat chevron on water
  {
    const g = new THREE.Group();
    const ring = waterRing(0.7, 1.1, C.rift, 0.65);
    ring.position.set(0, WATER_Y, -1.75);
    const chevron = waterChevron(C.rift, 0.78);
    const glow = waterDisc(0.95, C.rift, 0.32);
    glow.position.set(0, WATER_Y, -1.75);
    g.add(ring, chevron, glow);
    root.add(g);
    nodes.rift = g;
    parts.rift = { ring, chevron, glow };
  }

  for (const g of Object.values(nodes)) g.visible = false;

  const pulseUntil = Object.create(null);
  let tAcc = 0;

  const tips = {
    shell: { x: 0, y: WATER_Y + 0.15, z: 0 },
    ink: { x: 0, y: WATER_Y + 0.15, z: -0.8 },
    drive: { x: 0, y: WATER_Y + 0.15, z: 1.9 },
    gale: { x: 0, y: WATER_Y + 0.15, z: 0.15 },
    tide: { x: 0, y: WATER_Y + 0.15, z: 0 },
    rift: { x: 0, y: WATER_Y + 0.15, z: -2.2 },
  };

  const sparkCol = {
    shell: 0xf0e8d0,
    ink: 0xb090e0,
    drive: 0x5ad4c0,
    gale: 0xa8e8ff,
    tide: 0xb8f0ff,
    rift: 0xd07088,
  };

  function burstAt(id, tip) {
    const { x, y, z } = tip;
    if (id === 'shell') {
      bursts.spawn(BurstMode.STORM, x, y, z, {
        radius: 0.35, endRadius: 2.4, life: 0.55, squash: 0.55, intensity: 0.95,
        colorA: 0xf0e8d0, colorB: 0xd4c4a0, colorC: 0xffffff,
      });
    } else if (id === 'gale') {
      bursts.spawn(BurstMode.STORM, x, y, z, {
        radius: 0.4, endRadius: 2.8, life: 0.65, squash: 0.5, intensity: 1.1,
        colorA: 0x7ec8ff, colorB: 0xc8eeff, colorC: 0xf0ffff,
      });
    } else if (id === 'tide') {
      bursts.spawn(BurstMode.FROST, x, y, z, {
        radius: 0.45, endRadius: 3.0, life: 0.7, squash: 0.48, intensity: 1.05,
        colorA: 0x8ec8e8, colorB: 0xc8eeff, colorC: 0xf4ffff,
      });
    } else if (id === 'rift') {
      bursts.spawn(BurstMode.FIRE, x, y, z, {
        radius: 0.4, endRadius: 2.5, life: 0.6, squash: 0.5, intensity: 1.0,
        colorA: 0xd07088, colorB: 0x904058, colorC: 0x401020,
      });
    }
  }

  function sync(activeIds) {
    const show = new Set((activeIds || []).slice(0, 2));
    for (const id of Object.keys(nodes)) {
      nodes[id].visible = show.has(id);
    }
  }

  function pulse(id, ms = 520) {
    if (!nodes[id]) return;
    nodes[id].visible = true;
    pulseUntil[id] = performance.now() + ms;
    const tip = tips[id] || { x: 0, y: WATER_Y + 0.15, z: 0 };
    const col = sparkCol[id] ?? 0xffffff;
    burstAt(id, tip);
    sparks.emit(32, {
      color: col,
      x: tip.x, y: tip.y, z: tip.z,
      spread: 1.0,
      speed: 2.4,
      life: 0.7,
      size: 26,
      gravity: 0.2,
      radius: 0.7,
      vy: 0.6,
    });
    sparks.emit(18, {
      color: 0xffffff,
      x: tip.x, y: tip.y, z: tip.z,
      spread: 0.7,
      speed: 2.8,
      life: 0.5,
      size: 14,
      gravity: 0.35,
      radius: 0.45,
      vy: 0.4,
    });
    if (id === 'ink') {
      sparks.emit(24, {
        color: col,
        x: tip.x, y: tip.y, z: tip.z,
        vx: 0, vy: 0.2, vz: -1,
        spread: 0.5,
        speed: 2.6,
        life: 0.65,
        size: 22,
        gravity: 0.15,
        radius: 0.5,
      });
    }
    if (id === 'drive') {
      sparks.emit(20, {
        color: col,
        x: tip.x, y: tip.y, z: tip.z,
        vx: 0, vy: 0.2, vz: 1,
        spread: 0.6,
        speed: 2.2,
        life: 0.6,
        size: 20,
        gravity: 0.15,
        radius: 0.55,
      });
    }
  }

  function update(dt, speed = 0) {
    tAcc += dt;
    const now = performance.now();
    sparks.update(dt);
    bursts.update(dt);

    if (nodes.shell.visible) {
      parts.shell.rings?.forEach((r, i) => {
        r.rotation.z = tAcc * (0.35 + i * 0.15);
        r.material.opacity = (r.material.userData.baseOp || 0.5)
          * (0.8 + 0.2 * Math.sin(tAcc * 2.2 + i));
      });
    }

    if (nodes.ink.visible) {
      parts.ink.ring && (parts.ink.ring.rotation.z = -tAcc * 0.75);
      parts.ink.motes?.forEach((s, i) => {
        const a = (i / 8) * Math.PI * 2 + tAcc * 0.95;
        s.position.set(
          Math.cos(a) * 1.55,
          WATER_Y + 0.08 + Math.sin(tAcc * 3 + i) * 0.04,
          Math.sin(a) * 0.75
        );
        s.rotation.y += dt * 2;
      });
    }

    if (nodes.drive.visible) {
      const spin = tAcc * (1.2 + Math.min(2.5, speed * 0.1));
      const boost = 0.75 + Math.min(0.25, speed * 0.02);
      parts.drive.rings?.forEach((r, i) => {
        r.rotation.z = spin * (1 + i * 0.18);
        r.material.opacity = (r.material.userData.baseOp || 0.55) * boost
          * (0.8 + 0.2 * Math.sin(tAcc * 4 + i));
      });
    }

    if (nodes.gale.visible) {
      parts.gale.rings?.forEach((r, i) => {
        r.rotation.z = tAcc * (1.1 + i * 0.35);
        r.material.opacity = (r.material.userData.baseOp || 0.55)
          * (0.7 + 0.3 * Math.sin(tAcc * 4.5 + i));
      });
    }

    if (nodes.tide.visible) {
      parts.tide.rings?.forEach((r, i) => {
        const s = 1 + Math.sin(tAcc * 2.5 + i * 0.9) * 0.1;
        r.scale.set(s, 1, s);
        r.material.opacity = (r.material.userData.baseOp || 0.5)
          * (0.7 + 0.3 * Math.sin(tAcc * 2.3 + i));
      });
    }

    if (nodes.rift.visible) {
      const ch = parts.rift.chevron;
      if (ch) {
        ch.position.z = -2.35 + Math.sin(tAcc * 3.8) * 0.1;
        ch.material.opacity = (ch.material.userData.baseOp || 0.78)
          * (0.75 + 0.25 * Math.sin(tAcc * 4.2));
      }
      if (parts.rift.ring) parts.rift.ring.rotation.z = tAcc * 1.1;
    }

    for (const id of Object.keys(pulseUntil)) {
      const until = pulseUntil[id];
      const node = nodes[id];
      if (!node || !until) continue;
      if (now < until) {
        const k = 1 + 0.65 * Math.sin((until - now) * 0.038);
        node.traverse((o) => {
          if (!o.material || o.material.opacity == null) return;
          const base = o.material.userData.baseOp ?? 0.55;
          o.material.opacity = Math.min(1, base * k);
        });
      } else {
        delete pulseUntil[id];
        node.traverse((o) => {
          if (o.material?.userData.baseOp != null) {
            o.material.opacity = o.material.userData.baseOp;
          }
        });
      }
    }
  }

  return { root, sync, pulse, update };
}
