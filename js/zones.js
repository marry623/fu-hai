/** Zone table — palette + meta; geometry lives in seaMaps.js */

import { SEA_MAPS, getSeaMap } from './seaMaps.js';

export const ZONES = SEA_MAPS.map((m) => ({
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
}));

/** Locked zone for a run — ignore distance banding */
export function getZoneForRun(startZone) {
  return ZONES[Math.max(0, Math.min(ZONES.length - 1, startZone | 0))];
}

/** @deprecated use getZoneForRun — kept for any leftover imports */
export function zoneIndexFromDistance(_meters, startZone = 0) {
  return Math.max(0, Math.min(ZONES.length - 1, startZone | 0));
}

export function getZone(_meters, startZone = 0) {
  return getZoneForRun(startZone);
}

export function nextCheckpoint(meters) {
  return Math.ceil((meters + 0.01) / 1000) * 1000;
}

export function isZoneUnlocked(meta, zoneId) {
  return (meta.unlockedZones || [0]).includes(zoneId);
}

export { getSeaMap };
