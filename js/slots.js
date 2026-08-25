import { getFishDef, activeFamilies, RARITY } from './fishCatalog.js?v=34b';
import { createFishMesh, setFishVitalityVisual, animateFishMesh } from './fishMeshes.js?v=31c';

export const SLOT_LABELS = {
  bow: '船头', stern: '船尾', sideL: '左舷', sideR: '右舷', keel: '船底', sail: '船帆',
};
export const SLOT_ORDER = ['bow', 'stern', 'sideL', 'sideR', 'keel', 'sail'];

export function equipFish(boat, slotsState, fishItem, preferredSlot, gradientMap) {
  const def = getFishDef(fishItem.defId);
  if (!def.slot) {
    return { ok: false, msg: '食物/胶水鱼请食用或修理，不能改装' };
  }
  // 专属槽：只能绑到图鉴规定的位置
  if (preferredSlot && preferredSlot !== def.slot) {
    return { ok: false, msg: `${def.name} 只能绑到${SLOT_LABELS[def.slot]}，不能放在${SLOT_LABELS[preferredSlot] || preferredSlot}` };
  }
  const useSlot = def.slot;

  const prev = slotsState[useSlot];
  clearMount(boat, useSlot);

  slotsState[useSlot] = {
    defId: fishItem.defId,
    name: fishItem.name,
    rarity: fishItem.rarity || def.rarity,
    vitality: fishItem.vitality ?? 100,
  };
  boat.userData.slots[useSlot] = slotsState[useSlot];

  const mesh = createFishMesh(fishItem.defId, gradientMap, 0.85, fishItem.defId === 'food' ? fishItem.color : null);
  orientForSlot(mesh, useSlot);
  boat.userData.mounts[useSlot].add(mesh);
  boat.userData.mounts[useSlot].userData.fishMesh = mesh;

  const families = activeFamilies(slotsState);
  const covered = prev ? `（覆盖 ${prev.name}）` : '';
  const famMsg = families.length
    ? ` · \u5171\u9e23\uff1a${families.map((f) => f.name).join('\u3001')}`
    : '';
  return { ok: true, slot: useSlot, msg: `${fishItem.name} \u2192 ${SLOT_LABELS[useSlot]}${covered}${famMsg}` };
}

function orientForSlot(mesh, slot) {
  // Fish meshes face +X; bow=-Z, stern=+Z.
  if (slot === 'bow') mesh.rotation.y = Math.PI / 2;
  // Face aft; keep upright (old z=π/2 laid fish onto the deck).
  if (slot === 'stern') mesh.rotation.y = -Math.PI / 2;
  if (slot === 'sideL') mesh.rotation.y = Math.PI;
  if (slot === 'keel') mesh.rotation.z = Math.PI;
  if (slot === 'sail') mesh.position.y = 0.3;
}

function clearMount(boat, slot) {
  const mount = boat.userData.mounts[slot];
  while (mount.children.length) mount.remove(mount.children[0]);
  mount.userData.fishMesh = null;
}

export function updateSlotsVitality(slotsState, boat, dt, gradientMap) {
  const dropped = [];
  for (const slot of SLOT_ORDER) {
    const s = slotsState[slot];
    if (!s) continue;
    const def = getFishDef(s.defId);
    const rare = RARITY[def.rarity] || RARITY[1];
    s.vitality -= (rare.decayPerMin / 60) * dt;
    const mesh = boat.userData.mounts[slot]?.userData?.fishMesh;
    if (mesh) {
      setFishVitalityVisual(mesh, s.vitality);
      animateFishMesh(mesh, dt);
    }
    if (s.vitality <= 0) {
      clearMount(boat, slot);
      slotsState[slot] = null;
      boat.userData.slots[slot] = null;
      dropped.push(s.name);
    }
  }
  return dropped;
}

export function spendVitality(slotsState, defId, amount = 10) {
  for (const slot of SLOT_ORDER) {
    const s = slotsState[slot];
    if (s && s.defId === defId) {
      s.vitality = Math.max(0, s.vitality - amount);
      return true;
    }
  }
  return false;
}

export function feedSlot(slotsState, slot, amount = 30) {
  const s = slotsState[slot];
  if (!s || s.vitality >= 30) return false;
  s.vitality = Math.min(100, s.vitality + amount);
  return true;
}

export function effectMultiplier(slotsState, slot) {
  const s = slotsState[slot];
  if (!s) return 0;
  if (s.vitality < 20) return 0.3;
  if (s.vitality < 50) return 0.7;
  return 1;
}

export function sideEffectMul(slotsState, slot) {
  const s = slotsState[slot];
  if (!s) return 1;
  return s.vitality < 20 ? 2 : 1;
}

/** Bow ram pulse cooldown by fish rarity — higher stars slightly shorter, all ~3s */
export const RAM_CD_BY_RARITY = {
  1: 3.4,
  2: 3.2,
  3: 3.0,
  4: 2.8,
  5: 2.6,
  6: 2.4,
};

export function ramCdForRarity(rarity) {
  const r = Math.max(1, Math.min(6, (rarity | 0) || 1));
  return RAM_CD_BY_RARITY[r] ?? 3.0;
}

export function computeBonuses(slotsState) {
  const b = {
    autoThrust: 0,
    thrustMul: 1,
    turnMul: 1,
    speedMul: 1,
    ramMul: 1,
    corrosionMul: 1,
    accelMul: 1,
    block: 0,
    hasInk: false,
    shotDmg: 10,
    shotCd: 1.2,
    shotRange: 8,
    hasRam: false,
    ramDmg: 12,
    ramCd: 3.4,
    blockFrac: 0,
    hasBounce: false,
    hasPuffer: false,
    hasSpiral: false,
    hasSailfish: false,
    hasRadar: false,
    hasBarnacle: false,
    families: activeFamilies(slotsState),
    combos: [],
  };
  b.combos = b.families;

  for (const slot of SLOT_ORDER) {
    const s = slotsState[slot];
    if (!s) continue;
    const def = getFishDef(s.defId);
    if (!def) continue;
    const em = effectMultiplier(slotsState, slot);
    const sm = sideEffectMul(slotsState, slot);
    if (def.effect?.autoThrust) b.autoThrust += def.effect.autoThrust * em;
    if (def.effect?.ramMul) b.ramMul *= 1 + (def.effect.ramMul - 1) * em;
    if (def.effect?.corrosionMul) b.corrosionMul *= def.effect.corrosionMul * em + (1 - em);
    if (def.effect?.block) {
      if (def.effect.block >= 1) b.block += Math.floor(def.effect.block * em);
      else b.blockFrac = Math.max(b.blockFrac, def.effect.block * em);
    }
    if (def.effect?.autoShot) {
      b.hasInk = true;
      b.shotDmg = def.effect.shotDmg || 10;
      b.shotCd = def.effect.shotCd || 1.2;
      b.shotRange = def.effect.range || 8;
    }
    if (def.effect?.ramMul || def.effect?.ramDmg) {
      b.hasRam = true;
      b.ramDmg = def.effect.ramDmg || 12;
      if (slot === 'bow') b.ramCd = ramCdForRarity(def.rarity || s.rarity || 1);
    }
    if (def.effect?.jump) b.hasBounce = true;
    if (def.side?.speedMul) b.speedMul *= Math.pow(def.side.speedMul, sm > 1 ? 1.5 : 1);
    if (def.side?.turnMul) b.turnMul *= def.side.turnMul;
    if (def.side?.weight) b.thrustMul /= def.side.weight;
    if (def.side?.frictionDps) b.frictionDps = (b.frictionDps || 0) + def.side.frictionDps * sm;
    if (def.side?.accelMul) b.accelMul *= def.side.accelMul;
    if (b.hasRam) b.hasPuffer = true;
    if (s.defId === 'spiral') b.hasSpiral = true;
    if (s.defId === 'sailfish') b.hasSailfish = true;
    if (s.defId === 'radar') b.hasRadar = true;
    if (s.defId === 'barnacle') b.hasBarnacle = true;
  }

  for (const f of b.families) {
    if (f.id === 'shell') b.block += 1;
    if (f.id === 'ink') b.shotRange *= 1.15;
    if (f.id === 'drive') b.thrustMul *= 1.15;
    if (f.id === 'gale') b.turnMul *= 1.10;
    if (f.id === 'tide') b.corrosionMul *= 0.88;
    if (f.id === 'rift') b.ramDmg = (b.ramDmg || 12) * 1.12;
  }

  return b;
}

export function syncDeckFish(boat, fishHold, gradientMap) {
  const hold = boat.userData.cargoHold;
  while (hold.children.length) hold.remove(hold.children[0]);
  // Slots alternate forward/aft so small catches spread evenly across the deck.
  // Cockpit visible range: Z≈0.3 (cabin companionway) to Z≈2.5 (stern).
  // Each pair: [x, z].
  const slots = [
    [-0.22,  0.5], [ 0.22,  1.8],
    [ 0.22,  0.5], [-0.22,  1.8],
    [-0.22,  1.0], [ 0.22,  2.1],
    [ 0.22,  1.0], [-0.22,  2.1],
  ];
  fishHold.slice(0, 8).forEach((f, i) => {
    const m = createFishMesh(f.defId, gradientMap, 0.45, f.defId === 'food' ? f.color : null);
    const [x, z] = slots[i];
    m.position.set(x, 0.25, z);
    m.rotation.y = i * 0.9;
    hold.add(m);
  });
}
