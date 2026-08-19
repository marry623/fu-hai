import { getFishDef, activeCombos, RARITY, ADJACENCY } from './fishCatalog.js?v=31u';
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

  const combos = activeCombos(slotsState);
  const covered = prev ? `（覆盖 ${prev.name}）` : '';
  const comboMsg = combos.length ? ` · 联动：${combos.map((c) => c.name).join('、')}` : '';
  return { ok: true, slot: useSlot, msg: `${fishItem.name} → ${SLOT_LABELS[useSlot]}${covered}${comboMsg}` };
}

function orientForSlot(mesh, slot) {
  if (slot === 'bow') mesh.rotation.y = Math.PI / 2;
  if (slot === 'stern') { mesh.rotation.y = -Math.PI / 2; mesh.rotation.z = Math.PI / 2; }
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
    blockFrac: 0,
    hasBounce: false,
    hasPuffer: false,
    hasSpiral: false,
    hasSailfish: false,
    hasRadar: false,
    hasBarnacle: false,
    combos: activeCombos(slotsState),
  };

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

  for (const c of b.combos) {
    if (c.bonus.thrustMul) b.thrustMul *= c.bonus.thrustMul;
    if (c.bonus.ramMul) b.ramMul *= c.bonus.ramMul;
    if (c.bonus.block) b.block += c.bonus.block;
    if (c.bonus.corrosionMul) b.corrosionMul *= c.bonus.corrosionMul;
  }

  return b;
}

export function syncDeckFish(boat, fishHold, gradientMap) {
  const hold = boat.userData.cargoHold;
  while (hold.children.length) hold.remove(hold.children[0]);
  fishHold.slice(0, 8).forEach((f, i) => {
    const m = createFishMesh(f.defId, gradientMap, 0.45, f.defId === 'food' ? f.color : null);
    m.position.set(((i % 3) - 1) * 0.55, Math.floor(i / 3) * 0.35, (Math.floor(i / 3) % 2) * 0.2);
    m.rotation.y = i * 0.4;
    hold.add(m);
  });
}
