import * as THREE from 'three';
import { addOutline, toonMat } from './stylekit.js';
import { pointInPoly, EVAC_RADIUS, EVAC_HOLD, TUTORIAL_BEATS } from './seaMaps.js?v=32y';
import { pickMonsterForZone, getMonsterDef, monstersForZone, monsterHp, hullTouchDamage, hullShotDamage, wrapDps, wrapCountForZone } from './monsterCatalog.js?v=39d';
import { createCombatMonster, createMonsterMesh, syncHpBar, tickHitFlash, tickDeathAnim, finishDeathAnim } from './monsterMeshes.js?v=41e';

export { createMonsterMesh, EVAC_RADIUS, EVAC_HOLD };

const C = {
  shark: 0x2a3a5a,
  sharkFin: 0x6a2030,
  sharkMouth: 0x5a2030,
  sharkEye: 0xffe566,
  serpent: 0x4a6a7a,
  serpentBelly: 0x8aa0a8,
  serpentSpine: 0x7a3aa8,
  serpentEye: 0xffe566,
  ice: 0x9ad8ff,
  iceCore: 0xe8f6ff,
  kraken: 0x5a2a8a,
  krakenDark: 0x3a1860,
  krakenEye: 0xffe566,
  splash: 0xb8e8f8,
  splashWhite: 0xe8f8ff,
};

/**
 * Hazards: ram / wrap / ranged + planks + external lighthouses
 * Territory AI: patrol anchors, limited chasers, no full swarm.
 */
export function createHazards(gradientMap, scene, hitFx = null) {
  const root = new THREE.Group();
  scene.add(root);
  const enemies = [];
  const wraps = [];
  const planks = [];
  const shots = [];
  const inkShots = [];
  /** Shared opts for the next damage batch (from / dir / element). */
  let hitOpts = {};
  function setHitOpts(o = {}) {
    hitOpts = o || {};
  }
  /** @type {any[]} */
  let spawnPoints = [];
  /** @type {THREE.Object3D[]} */
  let lighthouses = [];
  /** @type {THREE.Mesh|null} */
  let tutMonsterRing = null;
  /** @type {{ active:boolean, remain:number, dwell:number, lhId:string|null, x:number, z:number }} */
  let evacStatus = { active: false, remain: EVAC_HOLD, dwell: 0, lhId: null, x: 0, z: 0 };

  function getEvacStatus() {
    return evacStatus;
  }

  const AGRO_RANGE = 22;
  const DROP_RANGE = 32;
  const PATROL_R = 14;
  const MAX_CHASERS = 6;
  const RANGED_SHOT = 19;
  const ACTIVE_DIST = 160;

  function ensureEnemies(n, zoneId = 0) {
    const pool = monstersForZone(zoneId);
    if (!pool.length) return;
    while (enemies.length < n) {
      const catalogId = pickMonsterForZone(zoneId, enemies.length) || pool[0];
      const e = createCombatMonster(catalogId, gradientMap, enemies.length);
      e.visible = false;
      e.userData.anchor = null;
      e.userData.chasing = false;
      e.userData.patrolT = Math.random() * 10;
      root.add(e);
      enemies.push(e);
    }
  }

  function ensureWraps(n, zoneId = 0) {
    const wrapPool = monstersForZone(zoneId).filter((id) => getMonsterDef(id).kind === 'wrap');
    if (!wrapPool.length || n <= 0) return;
    while (wraps.length < n) {
      const catalogId = wrapPool[wraps.length % wrapPool.length];
      const w = createCombatMonster(catalogId, gradientMap, wraps.length);
      w.visible = false;
      w.userData.active = false;
      w.userData.cd = 4;
      w.userData.anchor = null;
      w.userData.kind = 'wrap';
      root.add(w);
      wraps.push(w);
    }
  }

  for (let i = 0; i < 8; i++) {
    const catalogId = pickMonsterForZone(0, i);
    const e = createCombatMonster(catalogId, gradientMap, i);
    e.visible = false;
    e.userData.anchor = null;
    e.userData.chasing = false;
    e.userData.patrolT = Math.random() * 10;
    root.add(e);
    enemies.push(e);
  }
  for (let i = 0; i < 4; i++) {
    const w = createCombatMonster(['barnacle', 'voidOctopus', 'ghostHook', 'lavaBarnacle'][i], gradientMap, i);
    w.visible = false;
    w.userData.active = false;
    w.userData.cd = 4;
    w.userData.anchor = null;
    w.userData.kind = 'wrap';
    root.add(w);
    wraps.push(w);
  }
  for (let i = 0; i < 8; i++) {
    const p = makePlank(gradientMap, i);
    p.visible = false;
    p.userData.anchor = null;
    root.add(p);
    planks.push(p);
  }

  function assignToAnchor(obj, anchor) {
    obj.userData.anchor = anchor;
    obj.position.set(anchor.x, 0, anchor.z);
    obj.visible = true;
    obj.userData.chasing = false;
    obj.userData.hitCd = 0;
    const cap = monsterHp(obj.userData.catalogId);
    obj.userData.hp = cap;
    obj.userData.maxHp = cap;
    if (obj.userData.shotCd != null) obj.userData.shotCd = 1 + Math.random();
  }

  function nearestAnchor(kind, from) {
    let best = null;
    let bestD = Infinity;
    for (const sp of spawnPoints) {
      if (kind && sp.kind !== kind && !(kind === 'enemy' && (sp.kind === 'ram' || sp.kind === 'ranged' || sp.kind === 'static' || sp.kind === 'suction'))) continue;
      if (kind === 'enemy' && sp.kind !== 'ram' && sp.kind !== 'ranged' && sp.kind !== 'static' && sp.kind !== 'suction') continue;
      const d = Math.hypot(sp.x - from.x, sp.z - from.z);
      if (d < bestD) { bestD = d; best = sp; }
    }
    return best;
  }

  function setSpawnLayout(points, lhMeshes = []) {
    spawnPoints = points || [];
    lighthouses = lhMeshes || [];
    for (const lh of lighthouses) lh.userData.claimed = false;

    const ramPts = spawnPoints.filter((p) => p.kind === 'ram');
    const rangedPts = spawnPoints.filter((p) => p.kind === 'ranged');
    const wrapPts = spawnPoints.filter((p) => p.kind === 'wrap');
    const plankPts = spawnPoints.filter((p) => p.kind === 'plank');

    let ri = 0, rgi = 0;
    for (const e of enemies) {
      const want = e.userData.kind === 'ranged' ? 'ranged' : 'ram';
      const pool = want === 'ranged' ? rangedPts : ramPts;
      const fallback = spawnPoints.filter((p) => p.kind === 'ram' || p.kind === 'ranged');
      const list = pool.length ? pool : fallback;
      if (!list.length) {
        e.visible = false;
        e.userData.anchor = null;
        continue;
      }
      const idx = want === 'ranged' ? (rgi++ % list.length) : (ri++ % list.length);
      if (idx < list.length) assignToAnchor(e, list[idx]);
      const distSpawn = Math.hypot(e.position.x, e.position.z + 20);
      e.visible = distSpawn > 25 || Math.random() > 0.4;
      e.userData.respawnAt = 0;
    }

    wraps.forEach((w, i) => {
      const a = wrapPts[i % Math.max(1, wrapPts.length)] || spawnPoints[i % Math.max(1, spawnPoints.length)];
      if (!a) { w.visible = false; return; }
      w.userData.anchor = a;
      w.position.set(a.x, 0, a.z);
      w.visible = false;
      w.userData.active = false;
      w.userData.cd = 3 + i * 2;
    });

    planks.forEach((p, i) => {
      const a = plankPts[i % Math.max(1, plankPts.length)] || spawnPoints[(i + 3) % Math.max(1, spawnPoints.length)];
      if (!a) { p.visible = false; return; }
      assignToAnchor(p, a);
      p.position.x += (Math.random() - 0.5) * 8;
      p.position.z += (Math.random() - 0.5) * 8;
    });
  }

  /**
   * Scatter monsters across the whole navigable sea (not tied to fish schools).
   * Count ≈ 2× water circles; min spacing so spots only have 1–2, never piles.
   * Killed monsters stay dead (no respawn).
   */
  function spawnScattered(opts = {}) {
    const {
      count = 24,
      map = null,
      mapPoints = [],
      lhMeshes = [],
      spawn = { x: 0, z: 0 },
      zoneId = 0,
    } = opts;

    lighthouses = lhMeshes || [];
    for (const lh of lighthouses) lh.userData.claimed = false;

    const poly = map?.navigable;
    const b = map?.bounds;
    const islands = map?.islands || [];
    const spawnPt = map?.spawn || spawn;
    const zid = map?.id != null ? map.id : zoneId;
    const poolAll = monstersForZone(zid);
    const combatPool = poolAll.filter((id) => getMonsterDef(id).kind !== 'wrap');
    const pool = combatPool.length ? combatPool : poolAll;
    const enemyAnchors = [];

    // Practice bay: one fixed basic monster near spawn
    if (zid === -1 && count > 0 && pool.length) {
      const catalogId = pool[0];
      const def = getMonsterDef(catalogId);
      enemyAnchors.push({
        x: TUTORIAL_BEATS.monster.x,
        z: TUTORIAL_BEATS.monster.z,
        kind: def.kind === 'ranged' ? 'ranged' : def.kind === 'suction' ? 'suction' : def.kind === 'static' ? 'static' : 'ram',
        catalogId,
      });
    } else if (poly && b) {
      const bw = Math.max(1, b.maxX - b.minX);
      const bh = Math.max(1, b.maxZ - b.minZ);
      const area = bw * bh;
      const minSep = Math.max(32, Math.min(52, Math.sqrt(area / Math.max(1, count)) * 0.72));
      const minSep2 = minSep * minSep;
      const pairSep2 = (minSep * 0.45) ** 2;
      const maxAttempts = Math.min(count * 24, 2400);

      for (let attempt = 0; attempt < maxAttempts && enemyAnchors.length < count; attempt++) {
        const x = b.minX + Math.random() * bw;
        const z = b.minZ + Math.random() * bh;
        if (!pointInPoly(x, z, poly)) continue;
        if (Math.hypot(x - spawnPt.x, z - spawnPt.z) < 30) continue;
        let nearIsland = false;
        for (const isl of islands) {
          if (Math.hypot(x - isl.x, z - isl.z) < isl.r + 4) { nearIsland = true; break; }
        }
        if (nearIsland) continue;

        let tooClose = false;
        let nearCount = 0;
        for (const a of enemyAnchors) {
          const d2 = (a.x - x) ** 2 + (a.z - z) ** 2;
          if (d2 < pairSep2) { tooClose = true; break; }
          if (d2 < minSep2) nearCount++;
        }
        if (tooClose || nearCount >= 2) continue;
        if (!pool.length) break;

        const catalogId = pool[enemyAnchors.length % pool.length];
        const def = getMonsterDef(catalogId);
        enemyAnchors.push({
          x,
          z,
          kind: def.kind === 'ranged' ? 'ranged' : def.kind === 'suction' ? 'suction' : def.kind === 'static' ? 'static' : 'ram',
          catalogId,
        });
      }
    }

    const plankPts = (mapPoints || []).filter((p) => p.kind === 'plank');
    const mapWraps = (mapPoints || []).filter((p) => p.kind === 'wrap');
    spawnPoints = [...enemyAnchors, ...mapWraps, ...plankPts];

    // Rebuild enemy pool for this zone so meshes match catalog
    for (const e of enemies) root.remove(e);
    enemies.length = 0;
    // Practice-bay only marker: drop it on every layout so it cannot survive
    // into a formal run (root is reused across runs).
    if (tutMonsterRing) {
      root.remove(tutMonsterRing);
      tutMonsterRing.geometry.dispose();
      tutMonsterRing.material.dispose();
      tutMonsterRing = null;
    }
    // Pool of combat meshes capped — anchors can be denser but we do not build
    // one heavy mesh per anchor (old Math.max(anchors, …) created 500+ monsters).
    const wantEnemies = enemyAnchors.length > 0
      ? Math.min(enemyAnchors.length, Math.max(12, Math.min(140, count || 24)))
      : 0;
    ensureEnemies(wantEnemies, zid);
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (i >= enemyAnchors.length) {
        e.visible = false;
        e.userData.anchor = null;
        e.userData.chasing = false;
        e.userData.dead = true;
        e.userData.respawnIn = 0;
        continue;
      }
      const a = enemyAnchors[i];
      // Swap mesh if catalog mismatch
      if (e.userData.catalogId !== a.catalogId) {
        root.remove(e);
        const neu = createCombatMonster(a.catalogId, gradientMap, i);
        neu.userData.anchor = null;
        neu.userData.chasing = false;
        neu.userData.patrolT = Math.random() * 10;
        root.add(neu);
        enemies[i] = neu;
      }
      assignToAnchor(enemies[i], a);
      enemies[i].userData.catalogId = a.catalogId;
      enemies[i].userData.kind = a.kind;
      enemies[i].userData.dead = false;
      enemies[i].userData.respawnIn = 0;
      enemies[i].userData.chasing = false;
      enemies[i].userData.tutLocked = zid === -1;
      enemies[i].visible = false;
      enemies[i].scale.setScalar(zid === -1 && i === 0 ? 1.35 : 1);
      if (zid === -1 && i === 0) {
        tutMonsterRing = new THREE.Mesh(
          new THREE.RingGeometry(5.5, 9, 32),
          new THREE.MeshBasicMaterial({
            color: 0xff6b4a,
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide,
            depthWrite: false,
          })
        );
        tutMonsterRing.rotation.x = -Math.PI / 2;
        tutMonsterRing.position.set(a.x, 0.12, a.z);
        tutMonsterRing.visible = false;
        tutMonsterRing.userData.skipOutline = true;
        root.add(tutMonsterRing);
      }
    }

    for (const w of wraps) root.remove(w);
    wraps.length = 0;
    const wrapIds = monstersForZone(zid).filter((id) => getMonsterDef(id).kind === 'wrap');
    const wrapN = wrapIds.length ? wrapCountForZone(zid) : 0;
    for (let i = 0; i < wrapN; i++) {
      const catalogId = wrapIds.length ? wrapIds[i % wrapIds.length] : 'barnacle';
      const w = createCombatMonster(catalogId, gradientMap, i);
      w.visible = false;
      w.userData.active = false;
      w.userData.cd = 2.5 + (i % 5);
      w.userData.kind = 'wrap';
      w.userData.catalogId = catalogId;
      const a = mapWraps[i % Math.max(1, mapWraps.length)] || enemyAnchors[(i * 7) % Math.max(1, enemyAnchors.length)];
      if (a) {
        w.userData.anchor = a;
        w.position.set(a.x + (Math.random() - 0.5) * 14, 0, a.z + (Math.random() - 0.5) * 14);
      }
      root.add(w);
      wraps.push(w);
    }

    planks.forEach((p, i) => {
      const a = plankPts[i % Math.max(1, plankPts.length)] || enemyAnchors[(i * 5) % Math.max(1, enemyAnchors.length)];
      if (!a) { p.visible = false; return; }
      assignToAnchor(p, a);
      p.position.x += (Math.random() - 0.5) * 10;
      p.position.z += (Math.random() - 0.5) * 10;
      p.userData.dead = false;
    });
  }

  /** @deprecated use spawnScattered */
  function spawnAroundVortices(vortexList, mapPoints = [], lhMeshes = [], spawn = { x: 0, z: 0 }) {
    spawnScattered({
      count: Math.max(8, (vortexList?.length || 12) * 2),
      map: null,
      mapPoints,
      lhMeshes,
      spawn,
    });
  }

  function returnToAnchor(obj) {
    const a = obj.userData.anchor;
    if (!a) return;
    obj.userData.chasing = false;
    const dx = a.x - obj.position.x;
    const dz = a.z - obj.position.z;
    const d = Math.hypot(dx, dz) || 1;
    if (d > PATROL_R + 4) {
      obj.position.x += (dx / d) * 8 * 0.016; // will be overwritten in update with dt
    }
  }

  function update(dt, time, boatPos, opts = {}) {
    const {
      onHit,
      onMonsterHit,
      addPlank,
      hasSucker,
      boatJumping,
      onCheckpoint,
      onEvacuate,
      boatSpeed = 0,
      boatYaw = 0,
      blockEvac = false,
      onEvacBlocked,
    } = opts;

    const evacRadiusFor = (lh) => lh.userData.evacRadius ?? EVAC_RADIUS;

    // Count current chasers
    let chasers = enemies.filter((e) => e.visible && e.userData.chasing).length;

    for (const e of enemies) {
      if (e.userData.tutLocked) {
        e.visible = false;
        e.userData.chasing = false;
        continue;
      }
      if (e.userData.dying) {
        if (tickDeathAnim(e, dt)) {
          finishDeathAnim(e);
          e.visible = false;
          e.userData.dead = true;
          e.userData.chasing = false;
          e.userData.respawnIn = 0;
          e.userData.hp = e.userData.maxHp ?? monsterHp(e.userData.catalogId || e.userData.kind);
          syncHpBar(e, null);
        }
        continue;
      }
      if (e.userData.dead) continue;
      if (e.userData.respawnIn != null && e.userData.respawnIn > 0) {
        e.userData.respawnIn -= dt;
        if (e.userData.respawnIn <= 0) {
          e.userData.respawnIn = 0;
          e.visible = true;
          if (e.userData.anchor) {
            e.position.x = e.userData.anchor.x;
            e.position.z = e.userData.anchor.z;
          }
        }
        continue;
      }
      if (!e.visible && !(e.userData.respawnIn > 0)) {
        const ax0 = e.userData.anchor?.x;
        const az0 = e.userData.anchor?.z;
        if (ax0 != null) {
          const d0 = Math.hypot(ax0 - boatPos.x, az0 - boatPos.z);
          if (d0 < ACTIVE_DIST && !(e.userData.respawnIn > 0)) {
            e.visible = true;
            opts.onEncounter?.(e.userData.catalogId);
          }
        }
      }
      if (!e.visible) continue;
      const dBoatQuick = Math.hypot(e.position.x - boatPos.x, e.position.z - boatPos.z);
      if (dBoatQuick > ACTIVE_DIST) {
        e.visible = false;
        e.userData.chasing = false;
        continue;
      }
      if ((e.userData.stunUntil || 0) > time || (e.userData.rootUntil || 0) > time) {
        e.userData.chasing = false;
        e.position.y = 0.2 + Math.sin(time * 8) * 0.05;
        if ((e.userData.stunUntil || 0) > time) e.rotation.z = Math.sin(time * 20) * 0.25;
        else e.rotation.z = 0;
        if (e.userData.hitCd > 0) e.userData.hitCd -= dt;
        continue;
      }
      e.userData.phase = (e.userData.phase || 0) + dt;
      e.userData.patrolT = (e.userData.patrolT || 0) + dt;

      const ax = e.userData.anchor?.x ?? e.position.x;
      const az = e.userData.anchor?.z ?? e.position.z;
      const dBoat = Math.hypot(e.position.x - boatPos.x, e.position.z - boatPos.z);
      const dHome = Math.hypot(e.position.x - ax, e.position.z - az);
      const kind = e.userData.kind || 'ram';
      const catalogId = e.userData.catalogId || 'sawShark';
      const def = getMonsterDef(catalogId);

      // Static urchin: no chase, proximity skill
      if (kind === 'static') {
        e.position.x = ax;
        e.position.z = az;
        e.rotation.y = time * 0.4;
        e.position.y = 0.2 + Math.sin(time * 2 + e.userData.bob) * 0.08;
        if (dBoat < 5.5) {
          onMonsterHit?.(catalogId, def.skill || 'accelDrain', { dt, continuous: true });
        }
        if (e.userData.hitCd > 0) e.userData.hitCd -= dt;
        continue;
      }

      // Suction worm: pull boat if in forward cone; kill if too slow
      if (kind === 'suction') {
        e.position.y = 0.4 + Math.sin(time * 1.5 + e.userData.bob) * 0.15;
        const toBoatX = boatPos.x - e.position.x;
        const toBoatZ = boatPos.z - e.position.z;
        const facing = Math.atan2(toBoatX, toBoatZ);
        e.rotation.y = facing;
        if (dBoat < 28 && dBoat > 2.5) {
          const pull = Math.max(0, 1 - dBoat / 28) * 14 * dt;
          opts.onSuctionPull?.(Math.sin(facing) * pull, Math.cos(facing) * pull);
        }
        if (dBoat < 6.5 && (!e.userData.hitCd || e.userData.hitCd <= 0)) {
          e.userData.hitCd = 1.8;
          onMonsterHit?.(catalogId, 'suctionKill', { boatSpeed });
          opts.onEncounter?.(catalogId);
        }
        if (e.userData.hitCd > 0) e.userData.hitCd -= dt;
        continue;
      }

      if (e.userData.chasing) {
        if (dBoat > DROP_RANGE || dHome > PATROL_R * 2.2) {
          e.userData.chasing = false;
          chasers = Math.max(0, chasers - 1);
        }
      } else if (dBoat < AGRO_RANGE && chasers < MAX_CHASERS && dHome < PATROL_R + 6) {
        e.userData.chasing = true;
        chasers++;
        opts.onEncounter?.(catalogId);
      }

      if (e.userData.chasing) {
        const ang = Math.atan2(boatPos.x - e.position.x, boatPos.z - e.position.z);
        const spd = (catalogId === 'waveWhale' ? 5.2 : catalogId === 'thiefOtter' ? 8.5 : 7)
          * ((e.userData.slowUntil || 0) > time ? 0.32 : 1);
        e.position.x += Math.sin(ang) * spd * dt;
        e.position.z += Math.cos(ang) * spd * dt;
        e.rotation.y = ang;
      } else {
        const ang = e.userData.patrolT * 0.7;
        const tx = ax + Math.cos(ang) * (PATROL_R * 0.55);
        const tz = az + Math.sin(ang) * (PATROL_R * 0.55);
        e.position.x += (tx - e.position.x) * 1.2 * dt;
        e.position.z += (tz - e.position.z) * 1.2 * dt;
        e.rotation.y = Math.atan2(tx - e.position.x, tz - e.position.z);
      }

      if (kind === 'ram') {
        e.rotation.x = Math.sin(time * 2.2 + e.userData.bob) * 0.06;
        e.position.y = 0.15 + Math.sin(time * 3 + e.userData.bob) * 0.2;
      } else {
        e.rotation.x = 0;
        e.position.y = 0.15 + Math.sin(time * 2 + e.userData.bob) * 0.15;
        const neck = e.userData.neck;
        if (neck) neck.rotation.x = Math.sin(time * 1.8 + e.userData.bob) * 0.12;
      }

      const d = dBoat;
      const hitR = kind === 'ram' ? (catalogId === 'waveWhale' ? 4.2 : 2.8) : 2.4;
      if (d < hitR && (!e.userData.hitCd || e.userData.hitCd <= 0)) {
        e.userData.hitCd = catalogId === 'waveWhale' ? 2.2 : 1.4;
        const skill = def.skill || 'tiltPush';
        const dmg = hullTouchDamage(catalogId, kind);
        onHit?.(dmg, def.name + (skill === 'tiltPush' ? '撞击' : '冲击'));
        onMonsterHit?.(catalogId, skill, { boatYaw, boatSpeed });
        opts.onEncounter?.(catalogId);
      }
      if (e.userData.hitCd > 0) e.userData.hitCd -= dt;

      if (kind === 'ranged' && e.userData.shotCd <= 0 && d < RANGED_SHOT && e.userData.chasing) {
        e.userData.shotCd = catalogId === 'inkJelly' ? 2.2 : 2.8;
        e.updateMatrixWorld(true);
        const muzzle = e.userData.muzzle;
        const from = muzzle
          ? new THREE.Vector3().setFromMatrixPosition(muzzle.matrixWorld)
          : e.position.clone().add(new THREE.Vector3(0, 2.2, 0));
        if (catalogId === 'inkJelly') fireInkBolt(from, boatPos, catalogId);
        else fireIce(from, boatPos, catalogId);
        opts.onEncounter?.(catalogId);
      }
      if (e.userData.shotCd > 0) e.userData.shotCd -= dt;
    }

    for (const w of wraps) {
      if (w.userData.dying) {
        if (tickDeathAnim(w, dt)) {
          finishDeathAnim(w);
          w.userData.active = false;
          w.visible = false;
          w.userData.cd = 8;
          w.userData.hp = w.userData.maxHp ?? monsterHp(w.userData.catalogId);
          if (w.userData.anchor) {
            w.position.x = w.userData.anchor.x;
            w.position.z = w.userData.anchor.z;
          }
          syncHpBar(w, null);
        }
        continue;
      }
      w.userData.cd -= dt;
      const ax = w.userData.anchor?.x ?? w.position.x;
      const az = w.userData.anchor?.z ?? w.position.z;
      if (!w.userData.active) {
        w.position.x = ax;
        w.position.z = az;
      }
      const d = Math.hypot(w.position.x - boatPos.x, w.position.z - boatPos.z);
      const wId = w.userData.catalogId || 'voidOctopus';
      const wDef = getMonsterDef(wId);
      if (!w.userData.active && w.userData.cd <= 0 && d < 18) {
        w.userData.active = true;
        w.visible = true;
        w.userData.life = wId === 'ghostHook' ? 5 : 4;
        const cap = monsterHp(wId);
        w.userData.hp = cap;
        w.userData.maxHp = cap;
        w.position.x = boatPos.x;
        w.position.z = boatPos.z;
        opts.onEncounter?.(wId);
        // Instant skill proc on latch
        if (wId === 'ghostHook' || wId === 'voidOctopus' || wId === 'barnacle' || wId === 'lavaBarnacle') {
          onMonsterHit?.(wId, wDef.skill, { latch: true });
        }
      }
      if (w.userData.active) {
        w.position.x = boatPos.x + Math.sin(time * 4) * 1.2;
        w.position.z = boatPos.z;
        w.rotation.y = time * 1.5;
        const arms = w.userData.arms || [];
        arms.forEach((arm, i) => {
          arm.rotation.z = Math.sin(time * 3 + i) * 0.25;
          arm.rotation.x = 0.2 + Math.sin(time * 2.4 + i * 0.7) * 0.15;
        });
        w.userData.life -= dt;
        if (!boatJumping) {
          onHit?.(wrapDps(wId) * dt, wDef.name + '缠绕');
          if (wId === 'barnacle' || wId === 'lavaBarnacle') {
            onMonsterHit?.(wId, wDef.skill, { continuous: true, dt });
          }
        }
        if (opts.cutWrap && d < 5) {
          w.userData.cutCd = (w.userData.cutCd || 0) - dt;
          if (w.userData.cutCd <= 0) {
            damageWrap(w, 28, opts.onKill, { from: boatPos });
            w.userData.cutCd = 0.4;
          }
        }
        if (w.userData.active && w.userData.life <= 0) {
          w.userData.active = false;
          w.visible = false;
          w.userData.cd = 12;
          if (w.userData.anchor) {
            w.position.x = w.userData.anchor.x;
            w.position.z = w.userData.anchor.z;
          }
        }
      }
    }

    for (const p of planks) {
      if (!p.visible) continue;
      p.position.y = 0.15 + Math.sin(time * 2 + p.userData.bob) * 0.1;
      let d = Math.hypot(p.position.x - boatPos.x, p.position.z - boatPos.z);
      if (hasSucker && d < 14) {
        p.position.x += (boatPos.x - p.position.x) * 4 * dt;
        p.position.z += (boatPos.z - p.position.z) * 4 * dt;
        d = Math.hypot(p.position.x - boatPos.x, p.position.z - boatPos.z);
      }
      if (d < 3.2) {
        p.visible = false;
        addPlank?.(1);
        const anchor = p.userData.anchor;
        setTimeout(() => {
          p.visible = true;
          if (anchor) {
            p.position.x = anchor.x + (Math.random() - 0.5) * 10;
            p.position.z = anchor.z + (Math.random() - 0.5) * 10;
          }
        }, 8000);
      }
    }

    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.life -= dt;
      s.mesh.position.x += s.vx * dt;
      s.mesh.position.z += s.vz * dt;
      s.mesh.rotation.x += dt * 4;
      s.mesh.rotation.y += dt * 3;
      const d = Math.hypot(s.mesh.position.x - boatPos.x, s.mesh.position.z - boatPos.z);
      if (d < 2.2) {
        const sid = s.catalogId || 'lightningSnake';
        const sDef = getMonsterDef(sid);
        onHit?.(hullShotDamage(sid), sDef.name + '命中');
        onMonsterHit?.(sid, sDef.skill || 'disableEngine', {});
        s.life = 0;
      }
      if (s.life <= 0) {
        root.remove(s.mesh);
        shots.splice(i, 1);
      }
    }

    for (let i = inkShots.length - 1; i >= 0; i--) {
      const s = inkShots[i];
      s.life -= dt;
      s.mesh.position.x += s.vx * dt;
      s.mesh.position.z += s.vz * dt;
      if (s.fromMonster) {
        const d = Math.hypot(s.mesh.position.x - boatPos.x, s.mesh.position.z - boatPos.z);
        if (d < 2.4) {
          onHit?.(hullShotDamage(s.catalogId || 'inkJelly'), '喷墨命中');
          onMonsterHit?.(s.catalogId || 'inkJelly', 'inkBlind', {});
          s.life = 0;
        }
      } else {
        for (const e of enemies) {
          if (!e.visible) continue;
          if (Math.hypot(s.mesh.position.x - e.position.x, s.mesh.position.z - e.position.z) < 2.2) {
            damageEnemy(e, s.dmg || 10, opts.onKill, { from: s.mesh.position });
            s.life = 0;
            break;
          }
        }
      }
      if (s.life <= 0) {
        root.remove(s.mesh);
        inkShots.splice(i, 1);
      }
    }

    // Lighthouse evacuate: stay in ring for EVAC_HOLD seconds
    let bestIn = null;
    let bestD = Infinity;
    if (blockEvac) {
      for (const lh of lighthouses) lh.userData.evacDwell = 0;
      evacStatus = { active: false, remain: EVAC_HOLD, dwell: 0, lhId: null, x: 0, z: 0 };
      for (const lh of lighthouses) {
        if (!lh.visible) continue;
        const d = Math.hypot(lh.position.x - boatPos.x, lh.position.z - boatPos.z);
        if (d < evacRadiusFor(lh)) onEvacBlocked?.();
        break;
      }
    } else {
      for (const lh of lighthouses) {
        if (lh.userData.claimed || !lh.visible) {
          if (lh.userData.evacDwell) lh.userData.evacDwell = 0;
          continue;
        }
        const d = Math.hypot(lh.position.x - boatPos.x, lh.position.z - boatPos.z);
        const r = evacRadiusFor(lh);
        if (d < r) {
          if (d < bestD) {
            bestD = d;
            bestIn = lh;
          }
        } else {
          lh.userData.evacDwell = 0;
        }
      }

      if (bestIn) {
        bestIn.userData.evacDwell = (bestIn.userData.evacDwell || 0) + dt;
        const dwell = bestIn.userData.evacDwell;
        evacStatus = {
          active: true,
          dwell,
          remain: Math.max(0, EVAC_HOLD - dwell),
          lhId: bestIn.userData.lhId || bestIn.userData.checkpoint || null,
          x: bestIn.position.x,
          z: bestIn.position.z,
        };
        if (dwell >= EVAC_HOLD) {
          bestIn.userData.claimed = true;
          bestIn.userData.evacDwell = 0;
          evacStatus = { active: false, remain: EVAC_HOLD, dwell: 0, lhId: null, x: 0, z: 0 };
          onEvacuate?.(bestIn.userData.lhId || bestIn.userData.checkpoint);
        }
      } else {
        evacStatus = { active: false, remain: EVAC_HOLD, dwell: 0, lhId: null, x: 0, z: 0 };
      }
    }

    for (const e of enemies) {
      syncHpBar(e, boatPos);
      tickHitFlash(e);
    }
    for (const w of wraps) {
      syncHpBar(w, boatPos);
      tickHitFlash(w);
    }
  }

  function fireIce(from, to, catalogId = 'lightningSnake') {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const len = Math.hypot(dx, dz) || 1;
    const bolt = new THREE.Group();
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), toonMat(C.ice, gradientMap));
    bolt.add(core);
    addOutline(core, 1.12);
    for (let i = 0; i < 4; i++) {
      const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.18, 0), toonMat(C.iceCore, gradientMap));
      shard.position.set(-0.35 - i * 0.18, (i % 2) * 0.12, ((i % 3) - 1) * 0.1);
      bolt.add(shard);
      addOutline(shard, 1.2);
    }
    bolt.position.copy(from);
    bolt.position.y = Math.max(1.2, from.y);
    root.add(bolt);
    shots.push({ mesh: bolt, life: 2.2, vx: (dx / len) * 18, vz: (dz / len) * 18, catalogId });
  }

  function fireInkBolt(from, to, catalogId = 'inkJelly') {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const len = Math.hypot(dx, dz) || 1;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.4, 5, 4), toonMat(0x1a0a28, gradientMap));
    mesh.position.set(from.x, Math.max(0.8, from.y), from.z);
    root.add(mesh);
    addOutline(mesh, 1.15);
    inkShots.push({
      mesh,
      life: 2.0,
      vx: (dx / len) * 16,
      vz: (dz / len) * 16,
      fromMonster: true,
      catalogId,
    });
  }

  function shootInk(from, target, gm, dmg = 10) {
    if (!target) return;
    const dx = target.position.x - from.x;
    const dz = target.position.z - from.z;
    const len = Math.hypot(dx, dz) || 1;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.32, 5, 4), toonMat(0x1a0a28, gm));
    mesh.position.set(from.x, 0.7, from.z);
    root.add(mesh);
    addOutline(mesh, 1.15);
    inkShots.push({ mesh, life: 1.6, vx: (dx / len) * 28, vz: (dz / len) * 28, dmg });
  }

  function nearestEnemy(pos, max = 40) {
    let best = null;
    let bestD = max;
    for (const e of enemies) {
      if (!e.visible || e.userData.dead || e.userData.dying) continue;
      const d = Math.hypot(e.position.x - pos.x, e.position.z - pos.z);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  /** Deal one ram pulse; returns number of enemies hit (damaged or killed). */
  function ramKill(pos, speed, mul, onKill, dmg) {
    if (speed < 8) return 0;
    const amount = dmg ?? 12 * (mul || 1);
    let n = 0;
    for (const e of enemies) {
      if (!e.visible || e.userData.dead || e.userData.dying) continue;
      if (Math.hypot(e.position.x - pos.x, e.position.z - pos.z) < 3.5 * mul) {
        damageEnemy(e, amount, onKill, { from: pos });
        n++;
      }
    }
    return n;
  }

  function reactHit(target, amount, killed, opts = {}) {
    if (!target || !hitFx?.pulse) return;
    const quiet = !!opts.quiet;
    const now = performance.now();
    if (quiet && now - (target.userData.lastHitFxAt || 0) < 120) return;
    target.userData.lastHitFxAt = now;
    hitFx.pulse(target, {
      amount,
      killed,
      quiet,
      from: opts.from ?? hitOpts.from,
      dir: opts.dir ?? hitOpts.dir,
      element: opts.element ?? hitOpts.element,
      kind: opts.kind ?? target.userData.kind,
      intensity: opts.intensity ?? 1,
    });
  }

  function deathIntensityFor(mesh) {
    const hp = mesh.userData.maxHp || 80;
    if (hp <= 40) return 0.85;
    if (hp <= 100) return 1;
    return 1.25;
  }

  function damageEnemy(e, amount, onKill, opts = {}) {
    if (!e || !e.visible || e.userData.dead || e.userData.dying) return false;
    const cap = e.userData.maxHp ?? monsterHp(e.userData.catalogId || e.userData.kind);
    if (e.userData.hp == null) e.userData.hp = cap;
    const dealt = Math.max(0, amount);
    e.userData.hp -= dealt;
    if (e.userData.hp > 0) {
      syncHpBar(e, null);
      reactHit(e, dealt, false, opts);
      return false;
    }
    // Count immediately; delay hide for death VFX
    e.userData.dead = true;
    e.userData.chasing = false;
    e.userData.dying = true;
    e.userData.hp = 0;
    syncHpBar(e, null);
    reactHit(e, dealt, true, {
      ...opts,
      kind: e.userData.kind,
      intensity: deathIntensityFor(e),
    });
    onKill?.(e.userData.catalogId || e.userData.kind || 'kill');
    return true;
  }

  function damageWrap(w, amount, onKill, opts = {}) {
    if (!w?.userData.active || w.userData.dying) return false;
    const cap = w.userData.maxHp ?? monsterHp(w.userData.catalogId);
    if (w.userData.hp == null) w.userData.hp = cap;
    const dealt = Math.max(0, amount);
    w.userData.hp -= dealt;
    if (w.userData.hp > 0) {
      syncHpBar(w, null);
      reactHit(w, dealt, false, opts);
      return false;
    }
    w.userData.dying = true;
    w.userData.active = false;
    w.userData.hp = 0;
    syncHpBar(w, null);
    reactHit(w, dealt, true, {
      ...opts,
      kind: w.userData.kind || 'wrap',
      intensity: deathIntensityFor(w),
    });
    onKill?.(w.userData.catalogId || 'wrap');
    return true;
  }

  function killEnemy(e, onKill) {
    return damageEnemy(e, 9999, onKill);
  }

  function stunEnemy(e, untilTime) {
    if (!e || !e.visible) return;
    e.userData.stunUntil = untilTime;
    e.userData.chasing = false;
  }

  function rootNearest(pos, duration, clockTime, max = 16, dmg = 0, onKill = null) {
    const e = nearestEnemy(pos, max);
    if (!e) return null;
    e.userData.rootUntil = clockTime + duration;
    e.userData.chasing = false;
    if (dmg) damageEnemy(e, dmg, onKill, { from: pos });
    return e;
  }

  function pierceLine(origin, yaw, maxDist, maxHits, onKill, dmg) {
    const dirX = Math.sin(yaw);
    const dirZ = Math.cos(yaw);
    const amount = dmg ?? 9999;
    const scored = [];
    for (const e of enemies) {
      if (!e.visible || e.userData.dead || e.userData.dying) continue;
      const dx = e.position.x - origin.x;
      const dz = e.position.z - origin.z;
      const proj = dx * dirX + dz * dirZ;
      if (proj < -1.2 || proj > maxDist + 3.2) continue;
      const perp = Math.abs(dx * dirZ - dz * dirX);
      if (perp < 3.6) scored.push({ e, proj });
    }
    scored.sort((a, b) => a.proj - b.proj);
    const hits = [];
    const killed = [];
    const hitO = { from: origin, dir: { x: dirX, z: dirZ } };
    for (const s of scored.slice(0, maxHits)) {
      hits.push(s.e);
      if (damageEnemy(s.e, amount, onKill, hitO)) killed.push(s.e);
    }
    hits.killed = killed.length;
    return hits;
  }

  function blastRadius(pos, r, onKill, dmg) {
    const amount = dmg ?? 9999;
    let n = 0;
    const hitO = { from: pos };
    for (const e of enemies) {
      if (!e.visible || e.userData.dead || e.userData.dying) continue;
      if (Math.hypot(e.position.x - pos.x, e.position.z - pos.z) < r) {
        if (damageEnemy(e, amount, onKill, hitO)) n++;
      }
    }
    return n;
  }

  function shoveWraps(boatPos, dist = 12) {
    let n = 0;
    for (const w of wraps) {
      if (!w.userData.active) continue;
      const d = Math.hypot(w.position.x - boatPos.x, w.position.z - boatPos.z);
      if (d < dist) {
        w.userData.active = false;
        w.visible = false;
        w.userData.cd = 7;
        n++;
      }
    }
    return n;
  }

  function disperseNearPoints(points, radius, clockTime, dps = 0, dt = 0, onKill = null) {
    let n = 0;
    for (const e of enemies) {
      if (!e.visible || e.userData.dead) continue;
      for (const p of points) {
        if (Math.hypot(e.position.x - p.x, e.position.z - p.z) < radius) {
          e.userData.chasing = false;
          e.userData.slowUntil = clockTime + 1.8;
          if (dps && dt) damageEnemy(e, dps * dt, onKill, { quiet: true, from: p });
          n++;
          break;
        }
      }
    }
    return n;
  }

  function affectAlongLine(origin, yaw, maxDist, width, fn) {
    const dirX = Math.sin(yaw);
    const dirZ = Math.cos(yaw);
    let n = 0;
    for (const e of enemies) {
      if (!e.visible || e.userData.dead) continue;
      const dx = e.position.x - origin.x;
      const dz = e.position.z - origin.z;
      const proj = dx * dirX + dz * dirZ;
      if (proj < -1.2 || proj > maxDist + 3.2) continue;
      const perp = Math.abs(dx * dirZ - dz * dirX);
      if (perp < width) {
        fn(e);
        n++;
      }
    }
    return n;
  }

  function stunAlongLine(origin, yaw, maxDist, duration, clockTime, width = 3.2, dmg = 0, onKill = null, once = null) {
    const dirX = Math.sin(yaw);
    const dirZ = Math.cos(yaw);
    const hitO = { from: origin, dir: { x: dirX, z: dirZ } };
    return affectAlongLine(origin, yaw, maxDist, width, (e) => {
      e.userData.stunUntil = clockTime + duration;
      e.userData.chasing = false;
      if (dmg) {
        if (once) {
          if (once.has(e)) return;
          once.add(e);
        }
        damageEnemy(e, dmg, onKill, hitO);
      }
    });
  }

  function stunInRadius(pos, r, duration, clockTime) {
    let n = 0;
    for (const e of enemies) {
      if (!e.visible || e.userData.dead) continue;
      if (Math.hypot(e.position.x - pos.x, e.position.z - pos.z) < r) {
        e.userData.stunUntil = clockTime + duration;
        e.userData.chasing = false;
        n++;
      }
    }
    return n;
  }

  function cutWrapsAlongLine(origin, yaw, maxDist, width = 4, dmg = 16, once = null) {
    const dirX = Math.sin(yaw);
    const dirZ = Math.cos(yaw);
    let n = 0;
    const ids = [];
    for (const w of wraps) {
      if (!w.userData.active) continue;
      if (once?.has(w)) continue;
      const dx = w.position.x - origin.x;
      const dz = w.position.z - origin.z;
      const proj = dx * dirX + dz * dirZ;
      if (proj < -1 || proj > maxDist + 3.2) continue;
      const perp = Math.abs(dx * dirZ - dz * dirX);
      if (perp < width) {
        once?.add(w);
        if (damageWrap(w, dmg, null, { from: origin, dir: { x: dirX, z: dirZ } })) {
          n++;
          ids.push(w.userData.catalogId || 'voidOctopus');
        }
      }
    }
    return { n, ids };
  }

  function cutWrapsInRadius(pos, dist = 8, dmg = 40) {
    let n = 0;
    const ids = [];
    for (const w of wraps) {
      if (!w.userData.active) continue;
      if (Math.hypot(w.position.x - pos.x, w.position.z - pos.z) < dist) {
        if (damageWrap(w, dmg, null, { from: pos })) {
          n++;
          ids.push(w.userData.catalogId || 'voidOctopus');
        }
      }
    }
    return { n, ids };
  }

  function cutNearestWrap(pos, dmg = 40) {
    for (const w of wraps) {
      if (!w.userData.active) continue;
      if (Math.hypot(w.position.x - pos.x, w.position.z - pos.z) < 5) {
        if (damageWrap(w, dmg, null, { from: pos })) {
          return { cut: true, kind: 'wrap', catalogId: w.userData.catalogId || 'voidOctopus' };
        }
        return { cut: false, kind: 'wrap', catalogId: w.userData.catalogId || 'voidOctopus' };
      }
    }
    return null;
  }

  function setTutorialReveal(step, dismissed = false) {
    const unlock = (step | 0) >= 4;
    for (const e of enemies) {
      e.userData.tutLocked = !unlock;
      if (!unlock) {
        e.visible = false;
        e.userData.chasing = false;
      }
    }
    if (tutMonsterRing) tutMonsterRing.visible = unlock && !dismissed;
  }

  return {
    root, enemies, wraps, planks,
    get lighthouses() { return lighthouses; },
    update, shootInk, nearestEnemy, ramKill, cutNearestWrap, setSpawnLayout, spawnScattered, spawnAroundVortices,
    setTutorialReveal, setHitOpts,
    stunEnemy, rootNearest, pierceLine, blastRadius, shoveWraps, disperseNearPoints,
    stunAlongLine, cutWrapsAlongLine, cutWrapsInRadius, stunInRadius,
    getEvacStatus,
  };
}

function addPart(g, mesh, outlineScale = 1.08) {
  g.add(mesh);
  addOutline(mesh, outlineScale);
  return mesh;
}

function addSplash(g, gm, scale = 1) {
  const splash = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const shard = new THREE.Mesh(
      new THREE.ConeGeometry(0.35 * scale, 0.9 * scale, 4),
      toonMat(i % 2 ? C.splashWhite : C.splash, gm)
    );
    const a = (i / 8) * Math.PI * 2;
    shard.position.set(Math.cos(a) * 1.1 * scale, 0.2, Math.sin(a) * 1.1 * scale);
    shard.rotation.z = Math.cos(a) * 0.8;
    shard.rotation.x = Math.sin(a) * 0.8;
    addPart(splash, shard, 1.15);
  }
  g.add(splash);
  return splash;
}

function makeWreckShip(gm, scale = 1) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 1.6), toonMat(0x8a5a30, gm));
  addPart(g, hull, 1.1);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.7, 5), toonMat(0x7a4a28, gm));
  bow.rotation.x = -Math.PI / 2;
  bow.position.z = -1.0;
  addPart(g, bow, 1.12);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.8, 5), toonMat(0x5a3a18, gm));
  mast.position.y = 1.0;
  addPart(g, mast, 1.15);
  const sail = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.2, 3), toonMat(0xf0e8d8, gm));
  sail.rotation.z = Math.PI / 2;
  sail.scale.set(0.15, 1, 1);
  sail.position.set(0.25, 1.1, 0.1);
  addPart(g, sail, 1.08);
  g.scale.setScalar(scale);
  return g;
}

function makeShark(gm) {
  const g = new THREE.Group();
  const bodyRoot = new THREE.Group();
  g.add(bodyRoot);

  const body = new THREE.Mesh(new THREE.ConeGeometry(1.7, 4.5, 6), toonMat(C.shark, gm));
  body.rotation.x = -Math.PI / 2;
  body.position.set(0, 0.2, 0);
  addPart(bodyRoot, body, 1.05);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.6, 5), toonMat(C.shark, gm));
  tail.rotation.x = Math.PI / 2;
  tail.position.set(0, -0.8, -2.4);
  addPart(bodyRoot, tail, 1.05);

  const upper = new THREE.Mesh(new THREE.ConeGeometry(1.35, 1.7, 6), toonMat(C.shark, gm));
  upper.rotation.x = -Math.PI / 2;
  upper.position.set(0, 0.45, 2.5);
  addPart(bodyRoot, upper, 1.06);

  const lower = new THREE.Mesh(new THREE.ConeGeometry(1.15, 1.35, 6), toonMat(C.sharkMouth, gm));
  lower.rotation.x = -Math.PI / 2;
  lower.position.set(0, -0.55, 2.3);
  addPart(bodyRoot, lower, 1.06);

  const cavity = new THREE.Mesh(new THREE.SphereGeometry(0.85, 6, 4), toonMat(0x7a2030, gm));
  cavity.scale.set(1, 0.7, 0.95);
  cavity.position.set(0, 0, 2.0);
  addPart(bodyRoot, cavity, 1.08);

  for (let i = 0; i < 14; i++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 4), toonMat(0xf8f4ec, gm));
    const a = (i / 14) * Math.PI * 2;
    tooth.position.set(Math.cos(a) * 0.95, Math.sin(a) * 0.65, 3.0);
    tooth.rotation.x = -Math.PI / 2;
    addPart(bodyRoot, tooth, 1.22);
  }

  for (let i = 0; i < 5; i++) {
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.05, 4), toonMat(C.sharkFin, gm));
    fin.position.set(0, 1.25, 0.3 - i * 0.65);
    addPart(bodyRoot, fin, 1.1);
  }

  for (const side of [-1, 1]) {
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.6, 4), toonMat(C.shark, gm));
    fin.position.set(side * 1.6, -0.15, 0.3);
    fin.rotation.z = side * 1.05;
    addPart(bodyRoot, fin, 1.08);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.2, 5, 4), toonMat(C.sharkEye, gm));
    eye.position.set(side * 0.9, 0.55, 1.55);
    addPart(bodyRoot, eye, 1.2);
  }

  const wreck = makeWreckShip(gm, 0.85);
  wreck.position.set(0, 0.1, 2.7);
  wreck.rotation.set(0.4, 0.3, 0.55);
  bodyRoot.add(wreck);

  for (let i = 0; i < 5; i++) {
    const chip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.35), toonMat(0xa07040, gm));
    chip.position.set((i - 2) * 0.35, 1.2 + (i % 2) * 0.4, 2.2);
    chip.rotation.set(0.2 * i, 0.3 * i, 0.1 * i);
    addPart(bodyRoot, chip, 1.2);
  }

  addSplash(g, gm, 1.6);
  bodyRoot.rotation.x = -0.75;
  bodyRoot.position.y = 2.6;
  return g;
}

function makeSerpent(gm) {
  const g = new THREE.Group();
  const neck = new THREE.Group();
  g.add(neck);
  g.userData.neck = neck;

  const hump = new THREE.Mesh(new THREE.SphereGeometry(1.35, 6, 5), toonMat(C.serpent, gm));
  hump.scale.set(1.25, 0.75, 1.5);
  hump.position.set(0, 0.55, -2.6);
  addPart(g, hump, 1.05);

  const segs = [
    [0, 1.1, -0.7, 1.15],
    [0, 2.5, 0.15, 1.0],
    [0, 3.9, 0.7, 0.88],
    [0, 5.1, 1.15, 0.75],
  ];
  segs.forEach(([x, y, z, r]) => {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 5), toonMat(C.serpent, gm));
    seg.scale.set(1, 1.15, 1.2);
    seg.position.set(x, y, z);
    addPart(neck, seg, 1.05);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(r * 0.72, 5, 4), toonMat(C.serpentBelly, gm));
    belly.position.set(x, y - r * 0.4, z + 0.2);
    addPart(neck, belly, 1.1);
    for (let k = 0; k < 2; k++) {
      const spine = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), toonMat(C.serpentSpine, gm));
      spine.position.set(x + (k - 0.5) * 0.15, y + r * 0.75, z - 0.25);
      spine.scale.set(0.6, 1.2, 0.6);
      addPart(neck, spine, 1.18);
    }
  });

  const head = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.5, 5), toonMat(C.serpent, gm));
  head.rotation.x = -Math.PI / 2;
  head.position.set(0, 5.7, 1.7);
  addPart(neck, head, 1.06);

  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.55, 4), toonMat(C.serpentSpine, gm));
    horn.position.set(side * 0.4, 6.25, 1.25);
    horn.rotation.z = side * 0.35;
    addPart(neck, horn, 1.18);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.18, 5, 4), toonMat(C.serpentEye, gm));
    eye.position.set(side * 0.38, 5.75, 2.0);
    addPart(neck, eye, 1.22);
  }

  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), toonMat(C.ice, gm));
  orb.position.set(0, 5.7, 2.55);
  addPart(neck, orb, 1.15);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 5.7, 2.7);
  neck.add(muzzle);
  g.userData.muzzle = muzzle;

  addSplash(g, gm, 1.35);
  return g;
}

function makeEnemy(gm, id) {
  const kind = id % 3 === 2 ? 'ranged' : 'ram';
  const g = kind === 'ranged' ? makeSerpent(gm) : makeShark(gm);
  g.userData.id = id;
  g.userData.kind = kind;
  g.userData.phase = 0;
  g.userData.bob = Math.random() * 10;
  g.userData.shotCd = 0.8 + Math.random();
  g.userData.hitCd = 0;
  g.scale.setScalar(kind === 'ram' ? 0.72 : 0.68);
  return g;
}

function makeKraken(gm, id) {
  const g = new THREE.Group();
  g.userData.id = id;
  g.userData.arms = [];

  const head = new THREE.Mesh(new THREE.SphereGeometry(1.9, 7, 6), toonMat(C.kraken, gm));
  head.scale.set(1.25, 1.1, 1.2);
  head.position.y = 2.5;
  addPart(g, head, 1.05);

  const mantle = new THREE.Mesh(new THREE.SphereGeometry(1.1, 6, 5), toonMat(C.krakenDark, gm));
  mantle.scale.set(1.15, 0.75, 1);
  mantle.position.set(0, 3.55, -0.25);
  addPart(g, mantle, 1.06);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.48, 6, 5), toonMat(C.krakenEye, gm));
    eye.position.set(side * 0.7, 2.55, 1.45);
    addPart(g, eye, 1.12);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.18, 5, 4), toonMat(0x1a1020, gm));
    pupil.position.set(side * 0.7, 2.55, 1.85);
    g.add(pupil);
  }

  const wreck = makeWreckShip(gm, 1.05);
  wreck.position.set(0.2, 1.4, 0.3);
  wreck.rotation.set(0.25, 0.6, 0.35);
  g.add(wreck);

  for (let i = 0; i < 8; i++) {
    const arm = new THREE.Group();
    const a = (i / 8) * Math.PI * 2;
    arm.position.set(Math.cos(a) * 1.0, 1.15, Math.sin(a) * 1.0);
    arm.rotation.y = a + Math.PI * 0.5;
    arm.rotation.z = 0.95;
    let y = 0;
    for (let s = 0; s < 6; s++) {
      const r = 0.48 - s * 0.055;
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(r * 0.7, r, 0.8, 5),
        toonMat(s % 2 ? C.krakenDark : C.kraken, gm)
      );
      const curl = s * 0.32;
      seg.position.set(Math.sin(curl) * 0.4, y, Math.cos(curl) * 0.25 + s * 0.1);
      seg.rotation.x = 0.5 + s * 0.16;
      addPart(arm, seg, 1.07);
      if (s > 0 && s < 5) {
        const suck = new THREE.Mesh(new THREE.SphereGeometry(0.1, 4, 3), toonMat(0x8a5ab0, gm));
        suck.position.set(Math.sin(curl) * 0.4, y - 0.2, Math.cos(curl) * 0.25 + s * 0.1 + 0.25);
        arm.add(suck);
      }
      y += 0.65;
    }
    g.add(arm);
    g.userData.arms.push(arm);
  }

  addSplash(g, gm, 1.5);
  g.scale.setScalar(0.72);
  return g;
}

function makePlank(gm, id) {
  const g = new THREE.Group();
  g.userData.id = id;
  g.userData.bob = Math.random() * 8;
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.35), toonMat(0xb07840, gm));
  b.position.y = 0.15;
  g.add(b);
  addOutline(b, 1.12);
  return g;
}

function makeLighthouse(gm) {
  const g = new THREE.Group();
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 10, 6), toonMat(0xe8e0d0, gm));
  tower.position.y = 5;
  g.add(tower);
  addOutline(tower, 1.05);
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.7, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffe066 }));
  light.position.y = 10.5;
  g.add(light);
  addOutline(light, 1.1);
  return g;
}

function placeAhead(obj, zBase, spread = 40) {
  obj.position.set((Math.random() - 0.5) * spread, 0, zBase + Math.random() * 20);
}
