/** Zone table — palette + meta; geometry lives in seaMaps.js */

import { SEA_MAPS, TUTORIAL_MAP, getSeaMap } from './seaMaps.js?v=29m';

function zoneFromMap(m) {
  return {
    id: m.id,
    name: m.name,
    color: '#' + (m.sky >>> 0).toString(16).padStart(6, '0'),
    water: m.water,
    fog: m.fog,
    sky: m.sky,
    minimap: m.minimap,
    corrosionMul: m.corrosionMul,
    feature: m.feature,
    unlockHint: m.unlockHint,
  };
}

export const TUTORIAL_ZONE = zoneFromMap(TUTORIAL_MAP);

/** Practice bay first, then formal seas 0–4 */
export const ZONES = [TUTORIAL_ZONE, ...SEA_MAPS.map(zoneFromMap)];

/** Locked zone for a run — ignore distance banding */
export function getZoneForRun(startZone) {
  const id = startZone | 0;
  return ZONES.find((z) => z.id === id) || TUTORIAL_ZONE;
}

/** @deprecated use getZoneForRun — kept for any leftover imports */
export function zoneIndexFromDistance(_meters, startZone = 0) {
  return Math.max(0, Math.min(SEA_MAPS.length - 1, startZone | 0));
}

export function getZone(_meters, startZone = 0) {
  return getZoneForRun(startZone);
}

export function nextCheckpoint(meters) {
  return Math.ceil((meters + 0.01) / 1000) * 1000;
}

export function isZoneUnlocked(meta, zoneId) {
  if ((zoneId | 0) === -1) return true;
  return (meta.unlockedZones || [0]).includes(zoneId);
}

export { getSeaMap, TUTORIAL_MAP };
