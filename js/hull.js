/** Hull durability + corrosion + repair */

export function createHull(max = 100) {
  return {
    durability: max,
    maxDurability: max,
    sunk: false,
    kills: 0,
    modsUsed: 0,
  };
}

export function updateCorrosion(hull, dt, sailing) {
  if (hull.sunk) return;
  const rate = sailing ? 0.2 : 0.5;
  hull.durability = Math.max(0, hull.durability - rate * dt);
  if (hull.durability <= 0) hull.sunk = true;
}

export function damageHull(hull, amount) {
  if (hull.sunk) return;
  hull.durability = Math.max(0, hull.durability - amount);
  if (hull.durability <= 0) hull.sunk = true;
}

export function repairHull(hull, amount) {
  if (hull.sunk) return false;
  const before = hull.durability;
  hull.durability = Math.min(hull.maxDurability, hull.durability + amount);
  return hull.durability > before;
}

export function hullStage(hull) {
  const t = hull.durability / hull.maxDurability;
  if (t > 0.6) return 'intact';
  if (t > 0.3) return 'damaged';
  return 'sinking';
}
