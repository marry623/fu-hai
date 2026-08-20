/** Hub boat showcase — loadout preview with mount projections for callouts */

import * as THREE from 'three';
import { createBoat, setBoatVariant, BOAT_WATERLINE_Y } from './boat.js?v=28l';
import { getFishDef } from './fishCatalog.js?v=31u';
import { equipFish, SLOT_ORDER } from './slots.js?v=32d';

const _v = new THREE.Vector3();

/**
 * @param {THREE.Scene} scene
 * @param {THREE.Texture} gradientMap
 */
export function createHubBoatPreview(scene, gradientMap) {
  let boat = createBoat(gradientMap, 'raft');
  boat.name = 'hubShowBoat';
  boat.visible = false;
  boat.position.set(-0.2, BOAT_WATERLINE_Y || 0.72, 16);
  boat.rotation.y = -Math.PI * 0.35;
  boat.scale.setScalar(1.35);
  scene.add(boat);

  /** @type {Record<string, object|null>} */
  let slotsState = Object.fromEntries(SLOT_ORDER.map((k) => [k, null]));

  function clearAll() {
    for (const slot of SLOT_ORDER) {
      const mount = boat.userData.mounts[slot];
      if (!mount) continue;
      while (mount.children.length) mount.remove(mount.children[0]);
      mount.userData.fishMesh = null;
      slotsState[slot] = null;
      boat.userData.slots[slot] = null;
    }
  }

  function applyBoatId(boatId) {
    setBoatVariant(boat, boatId || 'raft');
  }

  /** Sync hull look + 3D fish on mounts from meta.loadout */
  function syncLoadout(meta) {
    applyBoatId(meta?.loadout?.boatId || 'raft');
    clearAll();
    const loSlots = meta?.loadout?.slots || {};
    for (const slot of SLOT_ORDER) {
      const f = loSlots[slot];
      if (!f?.defId) continue;
      const def = getFishDef(f.defId);
      const item = {
        kind: 'fish',
        defId: f.defId,
        name: f.name || def.name,
        rarity: f.rarity || def.rarity,
        category: f.category || def.category,
        color: f.color ?? def.color,
        slot: def.slot,
        vitality: f.vitality ?? 100,
      };
      equipFish(boat, slotsState, item, slot, gradientMap);
    }
  }

  function setVisible(on) {
    boat.visible = !!on;
  }

  function update(t) {
    if (!boat.visible) return;
    boat.position.y = (BOAT_WATERLINE_Y || 0.72) + Math.sin(t * 1.2) * 0.05;
    boat.rotation.z = Math.sin(t * 0.9) * 0.025;
  }

  function cameraFrame(t) {
    const sway = Math.sin(t * 0.15) * 0.25;
    const p = boat.position;
    return {
      pos: new THREE.Vector3(p.x + 7.2 + sway, p.y + 5.4, p.z + 8.8),
      look: new THREE.Vector3(p.x - 0.2, p.y + 1.6, p.z - 0.4),
    };
  }

  function projectMounts(camera) {
    /** @type {Record<string, {x:number,y:number,behind:boolean}>} */
    const out = {};
    for (const slot of SLOT_ORDER) {
      const mount = boat.userData.mounts[slot];
      if (!mount) {
        out[slot] = { x: 0.5, y: 0.5, behind: true };
        continue;
      }
      mount.getWorldPosition(_v);
      _v.project(camera);
      out[slot] = {
        x: (_v.x + 1) / 2,
        y: 1 - (_v.y + 1) / 2,
        behind: _v.z > 1,
      };
    }
    return out;
  }

  return {
    get boat() { return boat; },
    syncLoadout,
    applyBoatId,
    setVisible,
    update,
    cameraFrame,
    projectMounts,
    get slotsState() { return slotsState; },
  };
}
