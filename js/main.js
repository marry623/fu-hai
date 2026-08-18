import * as THREE from 'three';
import { createToonGradient, clamp } from './stylekit.js';
import {
  createDuskSky, createSun, createClouds, createWater, updateWater,
  createFoamRings,
} from './world.js';
import { createBoat, createWakeSystem, setOarStroke, setBoatVariant, BOAT_WATERLINE_Y, setRodCastPose, setRodWaitPose, resetRodPose } from './boat.js?v=29n';
import { createPaddleController } from './paddle.js?v=29n';
import { createHull, updateCorrosion, damageHull, repairHull } from './hull.js?v=16c';
import {
  createFlotsamField, updateFlotsam, findNearestFlotsam, respawnFlotsam, rollSalvage,
} from './flotsam.js?v=29e';
import {
  createVortexField, updateVortices, findNearestVortex, createFishingController, CAST_AIM_DIST, tintVortexField, VORTEX_COUNT,
} from './fishing.js?v=29q';
import { createHazards } from './hazards.js?v=29r';
import {
  equipFish, updateSlotsVitality, computeBonuses, syncDeckFish,
  SLOT_ORDER, SLOT_LABELS, feedSlot,
} from './slots.js?v=29q';
import { getFishDef, pickFishForZone, RARITY } from './fishCatalog.js?v=29q';
import { createFishMesh } from './fishMeshes.js?v=29q';
import { getFishPortrait } from './fishPortrait.js?v=29q';
import { getItemPortrait } from './itemPortrait.js?v=29r';
import { getSeaMap, EVAC_HOLD } from './seaMaps.js?v=29m';
import { getZone } from './zones.js?v=29m';
import {
  loadMeta, settleRun, hullMaxForBoat, thrustMulForBoat, hasWeaponUnlock,
  discoverFish, discoverMonster, syncLoadoutSuppliesFromWarehouse, consumeLoadoutOnDepart,
  clampBoatId, HULL_NAMES, equippedSkills, skillShopToVfx,
} from './meta.js?v=29s';
import { applyLoadoutToRun, collectRunFish } from './loadout.js?v=16c';
import { createHub } from './hub.js?v=29s';
import { createCoverScene } from './coverScene.js?v=28m';
import { createHubIsland } from './hubIsland.js?v=28k';
import { createHubBoatPreview } from './hubBoatPreview.js?v=29q';
import { createSeaWorld, updateWaterFollow, setWaterColor } from './seaWorld.js?v=29l';
import { getMonsterDef, resolveMonsterId, monstersForZone } from './monsterCatalog.js?v=29q';
import { createSkillVfx, SKILL_CARDS } from './vfx/skillVfx.js?v=30a';
import * as sfx from './audio.js?v=29y';

const canvas = document.getElementById('c');
const minimapCtx = document.getElementById('minimap').getContext('2d');

const ui = {
  speed: document.getElementById('speed-value'),
  hpFill: document.getElementById('hp-fill'),
  hpText: document.getElementById('hp-text'),
  invText: document.getElementById('inv-text'),
  comboText: document.getElementById('combo-text'),
  zoneName: document.getElementById('zone-name'),
  fragCount: document.getElementById('frag-count'),
  runDist: document.getElementById('run-dist'),
  toast: document.getElementById('toast'),
  prompt: document.getElementById('prompt'),
  evacCountdown: document.getElementById('evac-countdown'),
  tutGuide: document.getElementById('tut-guide'),
  tutGuideStep: document.getElementById('tut-guide-step'),
  tutGuideTitle: document.getElementById('tut-guide-title'),
  tutGuideBody: document.getElementById('tut-guide-body'),
  tutGuideNext: document.getElementById('tut-guide-next'),
  comboHint: document.getElementById('combo-hint'),
  qte: document.getElementById('qte'),
  qteGreen: document.getElementById('qte-green'),
  qtePointer: document.getElementById('qte-pointer'),
  qteHits: document.getElementById('qte-hits'),
  btnFish: document.getElementById('btn-fish'),
  btnFishCn: document.getElementById('btn-fish-cn'),
  btnSalvage: document.getElementById('btn-salvage'),
  title: document.getElementById('hub-overlay'),
  btnStart: null,
  backpack: document.getElementById('backpack'),
  bpGrid: document.getElementById('bp-grid'),
  bpMatTitle: document.getElementById('bp-mat-title'),
  fishCount: document.getElementById('fish-count'),
  bpEmpty: document.getElementById('bp-empty'),
  bpDetail: document.getElementById('bp-detail'),
  bpName: document.getElementById('bp-name'),
  bpSerial: document.getElementById('bp-serial'),
  bpSwatch: document.getElementById('bp-swatch'),
  bpRibbon: document.getElementById('bp-ribbon'),
  bpTagline: document.getElementById('bp-tagline'),
  bpDesc: document.getElementById('bp-desc'),
  bpMeta: document.getElementById('bp-meta'),
  bpSlotPick: document.getElementById('bp-slot-pick'),
  bpSlotRow: document.getElementById('bp-slot-row'),
  btnCloseBp: document.getElementById('bp-close'),
  btnBackpack: document.getElementById('btn-backpack'),
  btnDiscard: document.getElementById('btn-discard'),
  btnUse: document.getElementById('btn-use'),
  btnEat: document.getElementById('btn-eat'),
  btnEquip: document.getElementById('btn-equip'),
  btnFeed: document.getElementById('btn-feed'),
  eventModal: document.getElementById('event-modal'),
  eventTitle: document.getElementById('event-title'),
  eventDesc: document.getElementById('event-desc'),
  eventA: document.getElementById('event-a'),
  eventB: document.getElementById('event-b'),
  sinkModal: document.getElementById('sink-modal'),
  sinkStats: document.getElementById('sink-stats'),
  btnRetry: document.getElementById('btn-retry'),
  btnCheckpoint: document.getElementById('btn-checkpoint'),
  lighthouseModal: document.getElementById('lighthouse-modal'),
  seaMapModal: document.getElementById('sea-map-modal'),
  seaMapCanvas: document.getElementById('sea-map-canvas'),
  btnLhReturn: document.getElementById('btn-lh-return'),
  btnLhContinue: document.getElementById('btn-lh-continue'),
  settleModal: document.getElementById('settle-modal'),
  settleTitle: document.getElementById('settle-title'),
  settleStats: document.getElementById('settle-stats'),
  btnSettleHub: document.getElementById('btn-settle-hub'),
  cover: document.getElementById('cover-overlay'),
  btnCoverStart: document.getElementById('btn-cover-start'),
  btnCoverTutorial: document.getElementById('btn-cover-tutorial'),
  btnCoverQuit: document.getElementById('btn-cover-quit'),
  coverTutorial: document.getElementById('cover-tutorial'),
  btnTutorialClose: document.getElementById('btn-tutorial-close'),
  hud: document.getElementById('hud'),
  oarL: document.getElementById('oar-l'),
  oarR: document.getElementById('oar-r'),
};

let meta = loadMeta();
let selectedBoat = clampBoatId(meta.unlocks, meta.loadout?.boatId || 'raft');
let startZone = meta.unlockedZones?.[0] ?? 0;
let phase = 'cover'; // cover | hub | run | settle
let pendingCheckpoint = 0;
let runNewFish = 0;
/** @type {ReturnType<typeof createHub> | null} */
let hub = null;

const state = {
  started: false,
  inventory: { bait: 3, plank: 1, repair: 1 },
  fishHold: [],
  selectedFish: -1,
  selectedSlot: 'bow',
  slots: { bow: null, stern: null, sideL: null, sideR: null, keel: null, sail: null },
  weapon: 0,
  /** Shop skill ids snapshotted at depart — in-run casts must not reread hub loadout. */
  runSkills: null,
  toastTimer: 0,
  shellBlocks: 0,
  speedBuffUntil: 0,
  jumpUntil: 0,
  invulnUntil: 0,
  inkCd: 0,
  inkShots: 0,
  pendingEvent: null,
  lighthouseOpen: false,
  seaMapOpen: false,
  fishPanelOpen: false,
  backpackTab: 'catch',
  selectedSupply: null,
  runDistance: 0,
  maxZ: 0,
  checkpoint: 0,
  checkpointUsed: false,
  kills: 0,
  mods: 0,
  zone: 0,
  captainLocal: new THREE.Vector3(0, 0.45, 0.6),
};

/** Runtime monster status effects */
const monsterFx = {
  scrambleUntil: 0,
  lockOarUntil: 0,
  lockSide: null,
  inkUntil: 0,
  engineDisableUntil: 0,
  tiltUntil: 0,
  tiltAmt: 0,
  shakeUntil: 0,
  sealedSlot: null,
  heatSeal: false,
  stolen: null, // { bait, plank } recoverable
  hookPending: false,
};

/** Equipped ★★★★★ runtime (reset each voyage) */
const legendFx = {
  posHist: [],
  magCd: 0,
  chainCd: 0,
  voltCd: 0,
  ionArmed: true,
  ionCd: 0,
  flashCd: 0,
  trail: [],
  trailAcc: 0,
  tarCd: 0,
  tarDragUntil: 0,
  obsidianStore: 0,
  obsidianBreakUntil: 0,
  abyssUsed: false,
  abyssLockUntil: 0,
  heatPumpUntil: 0,
  hitchUntil: 0,
};

const skillCdUntil = [0, 0, 0];
let _prevLeftPulled = false;
let _prevRightPulled = false;

function equippedRunCard(slot) {
  const skills = (state.started && Array.isArray(state.runSkills) && state.runSkills.length)
    ? state.runSkills
    : equippedSkills(meta);
  const shopId = skills[slot] || skills[0];
  const vfxId = skillShopToVfx(shopId);
  return SKILL_CARDS.find((c) => c.id === vfxId) || SKILL_CARDS[0];
}

function refreshWeaponChips() {
  document.querySelectorAll('.weapon-chip').forEach((el) => {
    const w = Number(el.dataset.w);
    const card = equippedRunCard(w);
    el.textContent = `${w + 1} ${card.name}`;
  });
}


function slotHas(id) {
  return Object.values(state.slots).some((s) => s?.defId === id);
}

function resetLegendFx() {
  legendFx.posHist.length = 0;
  legendFx.magCd = 0;
  legendFx.chainCd = 0;
  legendFx.voltCd = 0;
  legendFx.ionArmed = true;
  legendFx.ionCd = 0;
  legendFx.flashCd = 0;
  legendFx.trail.length = 0;
  legendFx.trailAcc = 0;
  legendFx.tarCd = 0;
  legendFx.tarDragUntil = 0;
  legendFx.obsidianStore = 0;
  legendFx.obsidianBreakUntil = 0;
  legendFx.abyssUsed = false;
  legendFx.abyssLockUntil = 0;
  legendFx.heatPumpUntil = 0;
  legendFx.hitchUntil = 0;
}

let inkOverlayEl = null;
function ensureInkOverlay() {
  if (inkOverlayEl) return inkOverlayEl;
  inkOverlayEl = document.createElement('div');
  inkOverlayEl.id = 'ink-blind-overlay';
  inkOverlayEl.className = 'hidden';
  document.body.appendChild(inkOverlayEl);
  return inkOverlayEl;
}

function registerMonster(id) {
  if (tut.active) return; // practice bay does not write codex
  const rid = resolveMonsterId(id);
  if (!rid) return;
  const disc = discoverMonster(meta, [rid]);
  meta = disc.meta;
  if (disc.newIds?.length) showToast(`图鉴收录：${getMonsterDef(rid).name}`);
}

function stealRandomSlotFish(label) {
  const filled = SLOT_ORDER.filter((s) => state.slots[s] && !monsterFx.sealedSlot);
  if (!filled.length) {
    showToast(`${label}：船上无鱼装可偷`);
    return null;
  }
  const slot = filled[(Math.random() * filled.length) | 0];
  const fish = state.slots[slot];
  state.slots[slot] = null;
  refreshSlots();
  showToast(`${label}偷走了${SLOT_LABELS[slot]}的${fish.name}`);
  return fish;
}

function sealASlot(heat = false) {
  if (monsterFx.sealedSlot) return;
  const filled = SLOT_ORDER.filter((s) => state.slots[s]);
  const pool = filled.length ? filled : SLOT_ORDER.slice();
  const slot = pool[(Math.random() * pool.length) | 0];
  monsterFx.sealedSlot = slot;
  monsterFx.heatSeal = heat;
  showToast(heat ? `熔岩藤壶高温锁死「${SLOT_LABELS[slot]}」` : `藤壶封印了「${SLOT_LABELS[slot]}」槽`);
}

function applyMonsterSkill(catalogId, skill, ctx = {}) {
  const def = getMonsterDef(catalogId);
  const t = now();

  switch (skill) {
    case 'accelDrain': {
      const rate = (ctx.dt || 0.016) * 9;
      applyDamage(rate, '碎木海胆加速磨损', true);
      break;
    }
    case 'sealSlot':
      if (ctx.latch || !ctx.continuous) sealASlot(false);
      break;
    case 'heatSeal':
      if (ctx.latch || !ctx.continuous) sealASlot(true);
      break;
    case 'tiltPush': {
      monsterFx.tiltUntil = t + 2.2;
      monsterFx.tiltAmt = (Math.random() > 0.5 ? 1 : -1) * 0.35;
      // Push loose supplies overboard chance
      if (state.inventory.bait > 0 && Math.random() < 0.35) {
        state.inventory.bait--;
        showToast('锯齿鲨撞倾 · 饵料落水');
        updateInv();
      } else if (state.inventory.plank > 0 && Math.random() < 0.25) {
        state.inventory.plank--;
        showToast('锯齿鲨撞倾 · 木板落水');
        updateInv();
      } else {
        showToast('锯齿鲨撞倾船身');
      }
      break;
    }
    case 'lockOar': {
      monsterFx.lockOarUntil = t + 4.5;
      monsterFx.lockSide = Math.random() > 0.5 ? 'left' : 'right';
      paddle.setLockedOar(monsterFx.lockSide);
      showToast(monsterFx.lockSide === 'left' ? '拖刀蟹锁死左桨！' : '拖刀蟹锁死右桨！');
      break;
    }
    case 'scrambleKeys': {
      monsterFx.scrambleUntil = t + 5;
      paddle.setScramble(true);
      showToast('孢子混乱：WASD / 划桨键对调 5 秒');
      break;
    }
    case 'hookGear': {
      if (monsterFx.hookPending) break;
      monsterFx.hookPending = true;
      const fish = stealRandomSlotFish('幽灵钩爪');
      if (!fish) { monsterFx.hookPending = false; break; }
      state.pendingEvent = {
        title: '钩爪抢夺',
        desc: `幽灵钩爪拽走了「${fish.name}」！快速反应抢回？`,
        a: {
          label: '抢回',
          key: 'hook_reclaim',
          fish,
        },
        b: { label: '放弃', key: 'hook_lose' },
      };
      ui.eventTitle.textContent = state.pendingEvent.title;
      ui.eventDesc.textContent = state.pendingEvent.desc;
      ui.eventA.textContent = state.pendingEvent.a.label;
      ui.eventB.textContent = state.pendingEvent.b.label;
      ui.eventModal.classList.remove('hidden');
      break;
    }
    case 'stealSupply': {
      const take = { bait: 0, plank: 0 };
      if (state.inventory.bait > 0) {
        take.bait = Math.min(2, state.inventory.bait);
        state.inventory.bait -= take.bait;
      }
      if (state.inventory.plank > 0 && Math.random() < 0.5) {
        take.plank = 1;
        state.inventory.plank--;
      }
      if (take.bait || take.plank) {
        monsterFx.stolen = take;
        updateInv();
        showToast(`偷吃獭爬船偷走物资（击杀可追回）`);
      } else {
        showToast('偷吃獭扑空了');
      }
      break;
    }
    case 'inkBlind': {
      monsterFx.inkUntil = t + 4.5;
      ensureInkOverlay().classList.remove('hidden');
      fishing.shrinkGreen?.(0.55);
      showToast('墨雾遮目 · QTE 绿区缩小');
      break;
    }
    case 'disableEngine': {
      monsterFx.engineDisableUntil = t + 5;
      showToast('避雷针海蛇引雷 · 引擎鱼瘫痪');
      break;
    }
    case 'blinkSteal': {
      stealRandomSlotFish('虚空盗贼章鱼');
      break;
    }
    case 'shakeBoat': {
      monsterFx.shakeUntil = t + 2.8;
      monsterFx.tiltUntil = t + 2.8;
      monsterFx.tiltAmt = 0.55;
      if (fishing.interrupt?.()) {
        hideFishingFx();
        showToast('撼浪鲸打断钓鱼！');
      }
      if (state.inventory.bait > 0 && Math.random() < 0.45) {
        state.inventory.bait = Math.max(0, state.inventory.bait - 1);
        showToast('物资被掀飞');
        updateInv();
      } else {
        showToast('深海撼浪鲸掀船！');
      }
      break;
    }
    case 'suctionKill': {
      const spd = ctx.boatSpeed || 0;
      if (spd < 12) {
        if (slotHas('abyssShell') && !legendFx.abyssUsed) {
          legendFx.abyssUsed = true;
          legendFx.abyssLockUntil = now() + 3;
          showToast('沉渊壳挡下一口！本航失效');
          break;
        }
        applyDamage(999, '吞噬海沟虫一口吞没');
      } else {
        applyDamage(8, '海沟虫吸力擦伤');
        showToast('全速挣脱强吸！');
      }
      break;
    }
    default:
      break;
  }
}

function openPendingEvent() {
  const ev = state.pendingEvent;
  if (!ev || !ui.eventModal) return;
  ui.eventTitle.textContent = ev.title;
  ui.eventDesc.textContent = ev.desc || '';
  ui.eventA.textContent = ev.a?.label || '确定';
  ui.eventB.textContent = ev.b?.label || '取消';
  ui.eventModal.classList.remove('hidden');
}

function tickMonsterFx(dt) {
  const t = now();
  if (monsterFx.scrambleUntil && t >= monsterFx.scrambleUntil) {
    monsterFx.scrambleUntil = 0;
    paddle.setScramble(false);
    showToast('孢子效果结束');
  }
  if (monsterFx.lockOarUntil && t >= monsterFx.lockOarUntil) {
    monsterFx.lockOarUntil = 0;
    monsterFx.lockSide = null;
    paddle.setLockedOar(null);
    showToast('船桨挣脱');
  }
  if (monsterFx.inkUntil && t >= monsterFx.inkUntil) {
    monsterFx.inkUntil = 0;
    ensureInkOverlay().classList.add('hidden');
  }
  if (monsterFx.heatSeal) {
    const icy = SLOT_ORDER.some((s) => {
      const f = state.slots[s];
      return f && getFishDef(f.defId)?.effect?.freeze;
    });
    if (icy) {
      monsterFx.sealedSlot = null;
      monsterFx.heatSeal = false;
      showToast('冰冻震开熔岩藤壶');
    }
  }
  if (!(monsterFx.tiltUntil && t < monsterFx.tiltUntil)) {
    monsterFx.tiltAmt = 0;
  }
}

function resetMonsterFx() {
  monsterFx.scrambleUntil = 0;
  monsterFx.lockOarUntil = 0;
  monsterFx.lockSide = null;
  monsterFx.inkUntil = 0;
  monsterFx.engineDisableUntil = 0;
  monsterFx.tiltUntil = 0;
  monsterFx.tiltAmt = 0;
  monsterFx.shakeUntil = 0;
  monsterFx.sealedSlot = null;
  monsterFx.heatSeal = false;
  monsterFx.stolen = null;
  monsterFx.hookPending = false;
  paddle.setScramble(false);
  paddle.setLockedOar(null);
  ensureInkOverlay().classList.add('hidden');
  resetLegendFx();
}

const paddle = createPaddleController();
let hull = createHull(100);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xa5d8ff, 120, 420);
scene.background = new THREE.Color(0x7dd3fc);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.5, 2200);
const gradientMap = createToonGradient();

scene.add(new THREE.HemisphereLight(0xffe8d0, 0x2ecfc4, 1.1));
const sun = new THREE.DirectionalLight(0xffd2a0, 1.1);
sun.position.set(-80, 50, -120);
scene.add(sun);
scene.add(new THREE.AmbientLight(0xfff0e8, 0.35));

scene.add(createDuskSky());
const duskSun = createSun();
scene.add(duskSun);
const worldClouds = createClouds(gradientMap);
scene.add(worldClouds);
const water = createWater();
scene.add(water);
const foam = createFoamRings();
scene.add(foam);

const boat = createBoat(gradientMap, selectedBoat);
scene.add(boat);
const wake = createWakeSystem(scene);

/** Aim ring + bobber + fishing line */
const aimRing = new THREE.Mesh(
  new THREE.RingGeometry(0.55, 0.85, 24),
  new THREE.MeshBasicMaterial({
    color: 0x7ec8d8,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
);
aimRing.rotation.x = -Math.PI / 2;
aimRing.position.y = 0.12;
aimRing.userData.skipOutline = true;
scene.add(aimRing);

const bobberMesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.18, 8, 6),
  new THREE.MeshBasicMaterial({ color: 0xe85d4c })
);
bobberMesh.position.y = 0.2;
bobberMesh.visible = false;
bobberMesh.userData.skipOutline = true;
scene.add(bobberMesh);

const fishLinePositions = new Float32Array(6);
const fishLineGeo = new THREE.BufferGeometry();
fishLineGeo.setAttribute('position', new THREE.BufferAttribute(fishLinePositions, 3));
const fishLine = new THREE.Line(
  fishLineGeo,
  new THREE.LineBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.85 })
);
fishLine.visible = false;
fishLine.frustumCulled = false;
scene.add(fishLine);

const tipWorld = new THREE.Vector3();
const bobberWorld = new THREE.Vector3();

function aimPointFromBoat() {
  const yaw = paddle.state.yaw;
  return {
    x: paddle.state.x + Math.sin(yaw) * CAST_AIM_DIST,
    z: paddle.state.z + Math.cos(yaw) * CAST_AIM_DIST,
  };
}

function setFishLine(ax, ay, az, bx, by, bz) {
  fishLinePositions[0] = ax; fishLinePositions[1] = ay; fishLinePositions[2] = az;
  fishLinePositions[3] = bx; fishLinePositions[4] = by; fishLinePositions[5] = bz;
  fishLineGeo.attributes.position.needsUpdate = true;
  fishLine.visible = true;
}

function hideFishingFx() {
  bobberMesh.visible = false;
  fishLine.visible = false;
  resetRodPose(boat);
}

function updateAimPreview() {
  if (phase !== 'play' || hull.sunk) {
    aimRing.visible = false;
    return;
  }
  const ph = fishing.phase;
  if (ph === 'idle') {
    const a = aimPointFromBoat();
    aimRing.visible = true;
    aimRing.position.x = a.x;
    aimRing.position.z = a.z;
    aimRing.material.opacity = 0.45 + Math.sin(performance.now() * 0.004) * 0.12;
  } else if (ph === 'cast' || ph === 'wait' || ph === 'qte') {
    aimRing.visible = true;
    aimRing.position.x = fishing.bobber.x;
    aimRing.position.z = fishing.bobber.z;
    aimRing.material.opacity = ph === 'wait' && fishing.nearVortex ? 0.75 : 0.4;
  } else {
    aimRing.visible = false;
  }
}

const { root: flotRoot, list: flotsam } = createFlotsamField(gradientMap, 22);
scene.add(flotRoot);
const { root: vRoot, list: vortices } = createVortexField(gradientMap, VORTEX_COUNT);
scene.add(vRoot);
const hazards = createHazards(gradientMap, scene);
const skillVfx = createSkillVfx({ scene });
const skillRay = new THREE.Raycaster();
const skillPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const skillHit = new THREE.Vector3();
const skillNdc = new THREE.Vector2();
const skillPointer = { x: 0, y: 0, has: false };

function mouseOnWater() {
  if (!skillPointer.has) return null;
  skillNdc.x = (skillPointer.x / innerWidth) * 2 - 1;
  skillNdc.y = -(skillPointer.y / innerHeight) * 2 + 1;
  skillRay.setFromCamera(skillNdc, camera);
  return skillRay.ray.intersectPlane(skillPlane, skillHit) ? skillHit : null;
}

const seaWorld = createSeaWorld();
scene.add(seaWorld.root);

const coverScene = createCoverScene(gradientMap);
scene.add(coverScene.root);
const hubIsland = createHubIsland(gradientMap);
const hubBoatPreview = createHubBoatPreview(scene, gradientMap);
hubBoatPreview.setVisible(false);
scene.add(hubIsland.root);

const playVisuals = [water, foam, boat, flotRoot, vRoot, hazards.root, skillVfx.root, seaWorld.root, worldClouds, duskSun, aimRing, bobberMesh, fishLine];
const duskBits = [];
scene.traverse((o) => {
  if (o.name === 'duskSky') duskBits.push(o);
});

const hubRay = new THREE.Raycaster();
const hubPointer = new THREE.Vector2();
const hubProj = new THREE.Vector3();

function setWorldMode(mode) {
  // mode: 'cover' | 'hub' | 'play'
  phase = mode === 'play' ? phase : mode;
  if (mode === 'cover') phase = 'cover';
  if (mode === 'hub') phase = 'hub';

  coverScene.setActive(mode === 'cover');
  hubIsland.setActive(mode === 'hub');
  playVisuals.forEach((o) => { if (o) o.visible = mode === 'play'; });
  duskBits.forEach((o) => { o.visible = mode === 'play'; });

  if (ui.cover) ui.cover.classList.toggle('hidden', mode !== 'cover');
  if (ui.hud) ui.hud.classList.toggle('hidden', mode !== 'play');

  if (mode === 'cover') {
    scene.background.set(0xb8dff5);
    scene.fog.near = 80;
    scene.fog.far = 220;
    scene.fog.color.set(0xc5e8f8);
  } else if (mode === 'hub') {
    scene.background.set(0xb8dff5);
    scene.fog.near = 70;
    scene.fog.far = 200;
    scene.fog.color.set(0xc5e8f8);
  } else {
    scene.fog.near = 120;
    scene.fog.far = 420;
  }
}

function setCoverMode(on) {
  if (on) setWorldMode('cover');
  else if (phase === 'cover') setWorldMode('hub');
}

function projectHubAnchor(id) {
  const a = hubIsland.anchors[id];
  if (!a) return null;
  a.getWorldPosition(hubProj);
  hubProj.project(camera);
  return {
    x: (hubProj.x + 1) / 2,
    y: 1 - (hubProj.y + 1) / 2,
    behind: hubProj.z > 1,
  };
}

function pickHubBuilding(clientX, clientY) {
  if (phase !== 'hub' || !hubIsland.root.visible) return null;
  const rect = canvas.getBoundingClientRect();
  hubPointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  hubPointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  hubRay.setFromCamera(hubPointer, camera);
  const hits = hubRay.intersectObjects(hubIsland.hits, true);
  if (!hits.length) return null;
  let o = hits[0].object;
  while (o && !o.userData.hubId) o = o.parent;
  return o?.userData.hubId || null;
}

const tmp = new THREE.Vector3();
const vel = new THREE.Vector3();
let camInit = false;
let wakeAcc = 0;
let edgeToastAt = 0;
let lastBoatX = 0;
let lastBoatZ = 0;
const clock = new THREE.Clock();

function now() { return performance.now() / 1000; }
function boatPos() {
  return {
    x: paddle.state.x, y: 0, z: paddle.state.z,
    distanceTo(p) { return Math.hypot(this.x - p.x, this.z - p.z); },
  };
}

function showToast(msg, ms = 1800) {
  // During click-through tutorial cards, suppress noisy toasts
  if (tut.active && !tut.dismissed) return;
  ui.toast.textContent = msg;
  ui.toast.classList.remove('hidden');
  state.toastTimer = ms / 1000;
}
function setPrompt(el, msg) {
  if (!el) return;
  if (!msg) { el.classList.add('hidden'); return; }
  el.textContent = msg;
  el.classList.remove('hidden');
}

/** Practice bay — click-through narration cards */
const TUT_STEPS = [
  {
    title: '划桨',
    body: '按 A / D 交替划桨前进；同时按住 A + D 可直行。',
    btn: '下一步',
  },
  {
    title: '钓鱼',
    body: '靠近水面光圈，空格抛竿；指针停在绿区再空格收竿。',
    btn: '下一步',
  },
  {
    title: '打捞',
    body: '靠近漂流物（木桶 / 箱子 / 漂流瓶），按 E 打捞物资。',
    btn: '下一步',
  },
  {
    title: '改装',
    body: '按 Tab 打开背包，把鱼绑到船头、船尾或侧舷等船槽。鱼提供技能与组合加成，不同鱼可装位置不同。',
    btn: '下一步',
  },
  {
    title: '打怪',
    body: '按 1 霜矛、2 雷矛、3 陨石。把鼠标移到海面上会出现预选区，左键在光标处施放。靠近尖刺会磨损船身。',
    btn: '下一步',
  },
  {
    title: '归航',
    body: `驶入灯塔周围的绿圈，停留满 ${EVAC_HOLD} 秒即可回基地。教学关物资不会带出。`,
    btn: '开始练习',
  },
];

const tut = {
  active: false,
  step: 0, // 0..4 cards; after dismiss keep active for LH prompt
  dismissed: false,
};

function hideTutGuide() {
  ui.tutGuide?.classList.add('hidden');
}

function renderTutGuide() {
  if (!tut.active || tut.dismissed || !ui.tutGuide) {
    hideTutGuide();
    return;
  }
  const s = TUT_STEPS[tut.step];
  if (!s) {
    hideTutGuide();
    return;
  }
  if (ui.tutGuideStep) ui.tutGuideStep.textContent = `${tut.step + 1} / ${TUT_STEPS.length}`;
  if (ui.tutGuideTitle) ui.tutGuideTitle.textContent = s.title;
  if (ui.tutGuideBody) ui.tutGuideBody.textContent = s.body;
  if (ui.tutGuideNext) ui.tutGuideNext.textContent = s.btn;
  ui.tutGuide.classList.remove('hidden');
  setPrompt(ui.prompt, '');
}

function resetTutorialGuide() {
  tut.active = (startZone | 0) === -1;
  tut.step = 0;
  tut.dismissed = false;
  if (tut.active) renderTutGuide();
  else hideTutGuide();
}

function onTutGuideNext() {
  if (!tut.active || tut.dismissed) return;
  if (tut.step < TUT_STEPS.length - 1) {
    tut.step += 1;
    renderTutGuide();
    return;
  }
  tut.dismissed = true;
  hideTutGuide();
  setPrompt(ui.prompt, `驶入灯塔绿圈，停留 ${EVAC_HOLD} 秒归航`);
}

function tickTutorialGuide(_dt) {
  if (!tut.active) return;
  if (!tut.dismissed) {
    // Card owns the UI; keep prompt clear
    setPrompt(ui.prompt, '');
    return;
  }
  const ev = hazards.getEvacStatus?.();
  if (ev?.active) {
    setPrompt(ui.prompt, `灯塔归航圈 · 再停留 ${ev.remain.toFixed(1)} 秒`);
  } else {
    setPrompt(ui.prompt, `驶入灯塔绿圈，停留 ${EVAC_HOLD} 秒归航`);
  }
}

function updateEvacHud() {
  const ev = hazards.getEvacStatus?.();
  const el = ui.evacCountdown;
  if (!el) return;
  if (ev?.active) {
    el.textContent = `归航 ${ev.remain.toFixed(1)}`;
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
  // Highlight active lighthouse ring
  for (const lh of seaWorld.getLighthouses() || []) {
    const on = !!(ev?.active && lh.userData.lhId === ev.lhId);
    seaWorld.setEvacRingActive?.(lh, on);
  }
}

function bonuses() {
  const b = computeBonuses(state.slots);
  if (monsterFx.sealedSlot && state.slots[monsterFx.sealedSlot]) {
    // Sealed slot contributes no bonus
    const sealed = { ...state.slots, [monsterFx.sealedSlot]: null };
    return computeBonuses(sealed);
  }
  return b;
}

function applyDamage(amount, reason, quiet = false) {
  if (now() < state.invulnUntil || hull.sunk) return;
  const t = now();
  if (slotHas('ionVeil') && legendFx.ionArmed && amount < 80) {
    legendFx.ionArmed = false;
    legendFx.ionCd = t + 5;
    state.speedBuffUntil = Math.max(state.speedBuffUntil, t + 2.2);
    if (!quiet) showToast('离子膜：伤害转为加速');
    return;
  }
  if (slotHas('obsidianHeart') && amount < 80 && t >= legendFx.obsidianBreakUntil) {
    legendFx.obsidianStore += amount;
    if (!quiet) showToast(`黑曜心蓄能 ${Math.min(22, legendFx.obsidianStore | 0)}/22`);
    if (legendFx.obsidianStore >= 22) {
      const n = hazards.blastRadius(boatPos(), 9, (id) => {
        state.kills++;
        registerMonster(id);
      });
      legendFx.obsidianStore = 0;
      legendFx.obsidianBreakUntil = t + 2.5;
      showToast(n ? `黑曜心爆发 · 击破 ${n}` : '黑曜心爆发 · 破防');
    }
    return;
  }
  const b = bonuses();
  if (b.block > 0 || state.shellBlocks > 0) {
    state.shellBlocks = Math.max(0, (state.shellBlocks || b.block) - 1);
    if (state.slots.sideR?.defId === 'shell') state.slots.sideR = null;
    if (!quiet) showToast('贝壳挡下攻击！');
    refreshSlots();
    return;
  }
  let dmg = amount;
  if (t < legendFx.obsidianBreakUntil) dmg *= 1.5;
  damageHull(hull, dmg);
  if (!quiet && amount >= 2) sfx.damage();
  if (slotHas('heatPump')) {
    legendFx.heatPumpUntil = t + 1.9;
    if (!quiet && amount >= 2) showToast('热泵：伤转推力');
  }
  if (!quiet && amount >= 2) showToast(`${reason} −${Math.round(dmg)}`);
  updateHp();
  if (hull.sunk) onSink();
}

function updateHp() {
  ui.hpFill.style.width = `${(hull.durability / hull.maxDurability) * 100}%`;
  ui.hpText.textContent = String(Math.round(hull.durability));
}
function updateInv() {
  const i = state.inventory;
  if (ui.invText) {
    ui.invText.textContent = tut.active
      ? `饵∞ · 板${i.plank} · 剂${i.repair}`
      : `饵${i.bait} · 板${i.plank} · 剂${i.repair}`;
  }
  if (state.fishPanelOpen && state.backpackTab === 'supplies') renderBackpack();
}

const fishing = createFishingController({
  toast: showToast,
  onPhase(ph) {
    if (ph === 'qte') {
      ui.qte.classList.remove('hidden');
      ui.btnFishCn.textContent = '收竿';
      sfx.fishBite();
    } else if (ph === 'wait' || ph === 'cast') {
      ui.qte.classList.add('hidden');
      ui.btnFishCn.textContent = '等待';
    } else {
      ui.qte.classList.add('hidden');
      ui.btnFishCn.textContent = '抛竿';
    }
  },
  onQte(p, c, w) {
    ui.qteGreen.style.left = `${(c - w / 2) * 100}%`;
    ui.qteGreen.style.width = `${w * 100}%`;
    ui.qtePointer.style.left = `${p * 100}%`;
  },
  onRod(on) {
    if (!on) hideFishingFx();
    else if (boat.userData.rodArm) boat.userData.rodArm.visible = true;
  },
  onCastStart(aim) {
    setRodCastPose(boat, 0);
    bobberMesh.visible = false;
    fishLine.visible = true;
  },
  onCastProgress(u, aim) {
    setRodCastPose(boat, u);
    if (boat.userData.rodTip) boat.userData.rodTip.getWorldPosition(tipWorld);
    else tipWorld.set(paddle.state.x + 0.9, boat.position.y + 2.2, paddle.state.z - 0.9);
    const bx = tipWorld.x + (aim.x - tipWorld.x) * u;
    const bz = tipWorld.z + (aim.z - tipWorld.z) * u;
    const by = tipWorld.y + (0.25 - tipWorld.y) * u + Math.sin(u * Math.PI) * 2.4;
    bobberWorld.set(bx, by, bz);
    setFishLine(tipWorld.x, tipWorld.y, tipWorld.z, bx, by, bz);
  },
  onCastLand(bob) {
    setRodWaitPose(boat);
    bobberMesh.visible = true;
    bobberMesh.position.set(bob.x, 0.22, bob.z);
  },
  onWaitTick(bob, near) {
    setRodWaitPose(boat);
    bobberMesh.visible = true;
    bobberMesh.position.set(bob.x, 0.18 + Math.sin(performance.now() * 0.008) * 0.06, bob.z);
    if (boat.userData.rodTip) boat.userData.rodTip.getWorldPosition(tipWorld);
    setFishLine(tipWorld.x, tipWorld.y, tipWorld.z, bob.x, bobberMesh.position.y, bob.z);
  },
  onFishingEnd() {
    hideFishingFx();
  },
  onCatch(fish) {
    state.fishHold.push(fish);
    sfx.fishCatch(fish.rarity);
    state.selectedFish = state.fishHold.length - 1;
    syncDeckFish(boat, state.fishHold, gradientMap);
    showCatchLift(fish);
    if (tut.active) {
      showToast(`钓到 ${fish.name}（教学关，不会入库）`);
    } else {
      const disc = discoverFish(meta, [fish.defId]);
      meta = disc.meta;
      if (disc.newIds.length) {
        runNewFish += disc.newIds.length;
        showToast(`新鱼种！${fish.name} 已记入图鉴`);
      } else {
        showToast(`钓到 ${fish.name}（${'★'.repeat(Math.min(5, fish.rarity))}）· Tab 查看`);
      }
    }
    renderFishList();
  },
});

function showCatchLift(fish) {
  const m = createFishMesh(fish.defId, gradientMap, 1.1);
  m.position.set(paddle.state.x + 1, 1.5, paddle.state.z);
  scene.add(m);
  let t = 0;
  const id = setInterval(() => {
    t += 0.05;
    m.position.y = 1.5 + t * 1.2;
    m.rotation.y += 0.1;
    if (t > 1.2) { scene.remove(m); clearInterval(id); }
  }, 40);
}

function onSpace() {
  if (hull.sunk) return;
  if (fishing.phase === 'qte') { fishing.onSpace(); return; }
  if (fishing.phase === 'wait' || fishing.phase === 'cast') return;
  let useBait = true;
  if (tut.active) {
    // Practice bay: unlimited bait
    useBait = true;
  } else {
    useBait = state.inventory.bait > 0;
    if (useBait) {
      state.inventory.bait--;
      updateInv();
    } else {
      showToast('鱼饵不足');
    }
  }
  const greenBonus = meta.unlocks.fishmongerEye ? 1.2 : 1;
  const aim = aimPointFromBoat();
  fishing.tryCast(useBait, state.runDistance, greenBonus, startZone, aim.x, aim.z);
  if (useBait) sfx.fishCast();
  ui.btnFish.classList.add('pressed');
}

function trySalvage() {
  if (hull.sunk || state.pendingEvent) return;
  const hit = findNearestFlotsam(flotsam, boatPos(), 7);
  if (!hit) { showToast('附近没有漂浮物'); return; }
  const obj = hit.item;
  obj.visible = false;
  obj.userData.collected = true;
  const r = rollSalvage(obj.userData.type);
  if (r.type === 'trap') {
    if (tut.active) {
      state.inventory.bait += 1;
      showToast('打捞到鱼饵（教学）');
      updateInv();
    } else {
      applyDamage(20, '箱型海性');
    }
  } else if (r.type === 'event') {
    state.pendingEvent = r.event;
    ui.eventTitle.textContent = r.event.title;
    ui.eventDesc.textContent = '瓶中纸条让你选择…';
    ui.eventA.textContent = r.event.a.label;
    ui.eventB.textContent = r.event.b.label;
    ui.eventModal.classList.remove('hidden');
  } else {
    state.inventory[r.supply] = (state.inventory[r.supply] || 0) + r.amount;
    sfx.collect();
    showToast(`打捞 ${r.name}×${r.amount}`);
    updateInv();
  }
  setTimeout(() => {
    respawnFlotsam(obj, obj.userData.id);
    obj.position.z = paddle.state.z + 40 + Math.random() * 60;
    obj.position.x = (Math.random() - 0.5) * 40;
  }, 8000);
}

function resolveEvent(which) {
  const ev = state.pendingEvent;
  state.pendingEvent = null;
  ui.eventModal.classList.add('hidden');
  if (!ev) return;
  const choice = which === 'a' ? ev.a : ev.b;
  const key = choice?.key;
  if (key === 'hook_reclaim' && choice.fish) {
    state.fishHold.push(choice.fish);
    renderFishList();
    showToast('QTE 成功：鱼装抢回！');
    monsterFx.hookPending = false;
    return;
  }
  if (key === 'hook_lose') {
    showToast('鱼装被钩入雾中…');
    monsterFx.hookPending = false;
    return;
  }
  if (key === 'repair') state.inventory.repair++;
  if (key === 'bait') state.inventory.bait += 2;
  showToast(choice?.label || (which === 'a' ? '选择 A' : '选择 B'));
  updateInv();
}

function hexColor(n) {
  return `#${(n >>> 0).toString(16).padStart(6, '0')}`;
}

function fishBlurb(def) {
  if (def.desc) return def.desc;
  const bits = [];
  const e = def.effect || {};
  const s = def.side || {};
  if (e.ramMul) bits.push(`冲撞×${e.ramMul}`);
  if (e.dash) bits.push(`冲刺 ${e.dash}m`);
  if (e.freeze) bits.push(`冰冻 ${e.freeze}s`);
  if (e.shockwave) bits.push('龙震冲击波');
  if (e.autoThrust) bits.push(`持续推进 ${e.autoThrust}`);
  if (e.burst) bits.push(`爆发推进 ${e.burst}s`);
  if (e.hover) bits.push(`悬浮 ${e.hover}s`);
  if (e.phase) bits.push(`相位 ${e.phase}s`);
  if (e.autoShot) bits.push('自动喷墨');
  if (e.grab) bits.push('钳抓');
  if (e.whip) bits.push('鞭击');
  if (e.chargeCrush) bits.push('蓄力碎击');
  if (e.block) bits.push(`格挡×${e.block}`);
  if (e.reflect) bits.push('反弹');
  if (e.wallHits) bits.push('珊瑚墙');
  if (e.reflectRanged) bits.push('镜面弹反');
  if (e.corrosionMul) bits.push(`腐蚀×${e.corrosionMul}`);
  if (e.jump) bits.push('可跳跃');
  if (e.dive) bits.push(`潜游 ${e.dive}s`);
  if (e.quake) bits.push('地脉震');
  if (e.tailwind) bits.push(`顺风×${e.tailwind}`);
  if (e.scan) bits.push(`扫描 ${e.scan}m`);
  if (e.storm) bits.push(`风暴 ${e.storm}s`);
  if (e.slowMo) bits.push(`时缓 ${e.slowMo}s`);
  if (e.chainZap) bits.push('链式雷击');
  if (e.shoveWrap) bits.push('弹开缠绕');
  if (e.pierce) bits.push(`穿刺×${e.pierce}`);
  if (e.convertHit) bits.push('伤转加速');
  if (e.rewind) bits.push(`闪回 ${e.rewind}s`);
  if (e.heatTrail) bits.push('灼热航迹');
  if (e.painThrust) bits.push('伤转推力');
  if (e.root) bits.push('定身');
  if (e.storeBurst) bits.push('蓄伤爆发');
  if (e.onceImmunity) bits.push('一次免死');
  if (s.speedMul) bits.push(`移速×${s.speedMul}`);
  if (s.turnMul) bits.push(`转向×${s.turnMul}`);
  if (s.weight) bits.push(`负重×${s.weight}`);
  if (s.frictionDps) bits.push('缓慢磨损船体');
  if (s.blur) bits.push('视野模糊');
  if (s.noPaddle) bits.push('无法划桨');
  if (s.lockSteer) bits.push('转向锁定');
  if (s.slip) bits.push('打滑');
  if (s.reloadEvery) bits.push(`需定期补墨`);
  if (s.shake) bits.push('船体震动');
  if (s.recovery) bits.push('恢复延迟');
  if (s.accelMul) bits.push(`加速×${s.accelMul}`);
  if (s.loosenChance) bits.push('偶发松脱');
  if (s.hideSurface) bits.push('水面隐匿');
  if (s.scatterLoot) bits.push('打散浮物');
  if (s.headwind) bits.push(`逆风×${s.headwind}`);
  if (s.wakeSleepers) bits.push('惊醒沉睡者');
  if (s.disorient) bits.push('闪回后迷航');
  if (s.heatCorrosion) bits.push('加速腐蚀');
  if (s.breakArmor) bits.push('爆完破防');
  if (s.selfCorrosion) bits.push('航迹自灼');
  if (s.drag) bits.push('定身时略慢');
  if (s.hitch) bits.push('弹开顿挫');
  return bits.length ? bits.join(' · ') : '海上奇物，绑到对应船槽生效。';
}

function categoryLabel(cat) {
  return ({ food: '消耗', weapon: '武器', engine: '动力', defense: '防御', utility: '机能', sense: '感知' })[cat] || '杂项';
}

function setBackpackOpen(open) {
  state.fishPanelOpen = !!open;
  ui.backpack.classList.toggle('hidden', !open);
  ui.backpack.setAttribute('aria-hidden', open ? 'false' : 'true');
  ui.btnBackpack?.classList.toggle('open', !!open);
  if (open) {
    if (state.backpackTab === 'catch' && state.selectedFish < 0 && state.fishHold.length) {
      state.selectedFish = 0;
    }
    renderBackpack();
  }
}

function toggleBackpack() {
  setBackpackOpen(!state.fishPanelOpen);
}

function tryToggleBackpack() {
  if (!state.started) {
    showToast('先点「开始游戏」，再按 Tab / B 开背包');
    return;
  }
  if (!ui.sinkModal.classList.contains('hidden') || !ui.eventModal.classList.contains('hidden')) {
    return;
  }
  toggleBackpack();
}

function isBagpackKey(e) {
  return e.code === 'Tab' || e.key === 'Tab'
    || e.code === 'KeyB' || e.key === 'b' || e.key === 'B';
}

function renderBackpack() {
  const tab = state.backpackTab;
  document.querySelectorAll('.bp-tab').forEach((el) => {
    el.classList.toggle('active', el.dataset.tab === tab);
  });
  ui.bpMatTitle.textContent = tab === 'catch' ? '鱼获' : tab === 'slots' ? '船槽' : '物资';
  ui.bpGrid.innerHTML = '';
  ui.bpSlotRow.innerHTML = '';

  const selectedDef = tab === 'catch' && state.fishHold[state.selectedFish]
    ? getFishDef(state.fishHold[state.selectedFish].defId)
    : null;
  const exclusiveSlot = selectedDef?.slot || null;
  if (exclusiveSlot) state.selectedSlot = exclusiveSlot;

  SLOT_ORDER.forEach((slot) => {
    const b = document.createElement('button');
    b.type = 'button';
    const allowed = !exclusiveSlot || slot === exclusiveSlot;
    b.className = 'bp-slot-btn'
      + (state.selectedSlot === slot ? ' active' : '')
      + (state.slots[slot] ? ' filled' : '')
      + (exclusiveSlot && slot === exclusiveSlot ? ' exclusive' : '')
      + (!allowed ? ' locked' : '');
    b.textContent = SLOT_LABELS[slot];
    b.disabled = !allowed;
    b.title = allowed
      ? (exclusiveSlot ? `专属槽：${SLOT_LABELS[slot]}` : SLOT_LABELS[slot])
      : `只能绑在${SLOT_LABELS[exclusiveSlot]}`;
    if (allowed) {
      b.onclick = () => {
        state.selectedSlot = slot;
        refreshSlots();
        renderBackpack();
      };
    }
    ui.bpSlotRow.appendChild(b);
  });

  if (tab === 'catch') {
    ui.fishCount.textContent = String(state.fishHold.length);
    const cells = Math.max(20, Math.ceil((state.fishHold.length + 1) / 5) * 5);
    for (let i = 0; i < cells; i++) {
      const f = state.fishHold[i];
      ui.bpGrid.appendChild(makePolaroidCell({
        kind: 'fish',
        index: i,
        item: f,
        selected: i === state.selectedFish && !!f,
        onClick: f ? () => {
          state.selectedFish = i;
          state.selectedSupply = null;
          const d = getFishDef(f.defId);
          if (d.slot) state.selectedSlot = d.slot;
          refreshSlots();
          renderBackpack();
        } : null,
      }));
    }
  } else if (tab === 'slots') {
    ui.fishCount.textContent = String(SLOT_ORDER.filter((s) => state.slots[s]).length);
    SLOT_ORDER.forEach((slot, i) => {
      const f = state.slots[slot];
      ui.bpGrid.appendChild(makePolaroidCell({
        kind: 'slot',
        index: i,
        item: f,
        badge: SLOT_LABELS[slot],
        selected: state.selectedSlot === slot,
        onClick: () => {
          state.selectedSlot = slot;
          state.selectedFish = -1;
          state.selectedSupply = null;
          refreshSlots();
          renderBackpack();
        },
      }));
    });
    for (let i = SLOT_ORDER.length; i < 20; i++) {
      ui.bpGrid.appendChild(makePolaroidCell({ kind: 'empty', index: i }));
    }
  } else {
    const supplies = [
      { id: 'bait', name: '鱼饵', count: state.inventory.bait, color: 0x7dffc0, desc: '抛竿消耗。有饵时更容易钓到高阶鱼。' },
      { id: 'plank', name: '木板', count: state.inventory.plank, color: 0xc48a4a, desc: '按 R 消耗木板，立即修理船体 +15。' },
      { id: 'repair', name: '修补剂', count: state.inventory.repair, color: 0xffd24a, desc: '打捞或漂流瓶获得，可用于应急修复。' },
    ];
    ui.fishCount.textContent = String(supplies.reduce((a, s) => a + s.count, 0));
    supplies.forEach((s, i) => {
      ui.bpGrid.appendChild(makePolaroidCell({
        kind: 'supply',
        index: i,
        item: s,
        selected: state.selectedSupply === s.id,
        onClick: () => {
          state.selectedSupply = s.id;
          state.selectedFish = -1;
          renderBackpack();
        },
      }));
    });
    for (let i = supplies.length; i < 20; i++) {
      ui.bpGrid.appendChild(makePolaroidCell({ kind: 'empty', index: i }));
    }
  }

  renderBackpackDetail();
  syncDeckFish(boat, state.fishHold, gradientMap);
}

function makePolaroidCell({ kind, index, item, selected, onClick, badge }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'bp-cell'
    + (selected ? ' selected' : '')
    + (!item ? ' empty' : '')
    + (kind === 'supply' ? ' bp-supply-card' : '');
  btn.style.setProperty('--tilt', `${((index % 5) - 2) * 0.6}deg`);

  if (!item) {
    btn.innerHTML = `<div class="bp-polaroid"><div class="bp-thumb"></div><div class="bp-cell-name">—</div></div>`;
    return btn;
  }

  const rarity = item.rarity || 1;
  const name = kind === 'supply' ? `${item.name}×${item.count}` : item.name;
  let thumbInner;
  if (kind === 'supply') {
    try {
      const src = getItemPortrait(item.id);
      thumbInner = `<img class="bp-thumb-fish" src="${src}" alt="" draggable="false" />`;
    } catch (_) {
      const color = hexColor(item.color);
      thumbInner = `<div class="bp-thumb-blob" style="background:${color}"></div>`;
    }
  } else if (item.defId) {
    try {
      const src = getFishPortrait(item.defId);
      thumbInner = `<img class="bp-thumb-fish" src="${src}" alt="" draggable="false" />`;
    } catch (_) {
      const color = hexColor(item.color ?? getFishDef(item.defId || 'food').color);
      thumbInner = `<div class="bp-thumb-blob" style="background:${color}"></div>`;
    }
  } else {
    const color = hexColor(item.color ?? 0x7dffc0);
    thumbInner = `<div class="bp-thumb-blob" style="background:${color}"></div>`;
  }
  btn.innerHTML = `
    <span class="bp-tape top"></span>
    ${badge ? `<span class="bp-slot-badge">${badge}</span>` : ''}
    <div class="bp-polaroid">
      <div class="bp-thumb">${thumbInner}</div>
      <div class="bp-cell-name">${name}</div>
      <div class="bp-rarity-bar r${rarity}"></div>
    </div>
    <span class="bp-tape bot"></span>`;
  if (onClick) btn.onclick = onClick;
  return btn;
}

function renderBackpackDetail() {
  const tab = state.backpackTab;
  let show = false;

  if (tab === 'catch' && state.fishHold[state.selectedFish]) {
    show = true;
    const f = state.fishHold[state.selectedFish];
    const def = getFishDef(f.defId);
    const r = RARITY[f.rarity] || RARITY[1];
    fillDetail({
      name: f.name,
      serial: `No. ${String(1000 + (state.selectedFish + 1) * 37 + (f.defId?.length || 0)).slice(0, 4)}`,
      color: f.color ?? def.color,
      defId: f.defId,
      rarity: f.rarity,
      ribbon: r.label,
      tagline: `${categoryLabel(def.category)} · ${'★'.repeat(Math.min(5, f.rarity || 1))}`,
      desc: fishBlurb(def),
      meta: [
        def.slot ? `只能绑在：${SLOT_LABELS[def.slot]}（其他槽位不可用）` : '不可绑槽（食用/修理/投喂）',
        `活性参考：${Math.floor(f.vitality ?? 100)}`,
      ].join('<br>'),
      showSlots: !!def.slot,
      actions: {
        discard: true,
        eat: true,
        equip: !!def.slot,
        feed: def.category === 'food',
        use: false,
      },
    });
  } else if (tab === 'slots' && state.slots[state.selectedSlot]) {
    show = true;
    const f = state.slots[state.selectedSlot];
    const def = getFishDef(f.defId);
    const r = RARITY[f.rarity] || RARITY[1];
    fillDetail({
      name: f.name,
      serial: `槽· ${SLOT_LABELS[state.selectedSlot]}`,
      color: f.color ?? def.color,
      defId: f.defId,
      rarity: f.rarity,
      ribbon: r.label,
      tagline: `已绑定 · ${categoryLabel(def.category)}`,
      desc: fishBlurb(def),
      meta: `活性${Math.floor(f.vitality ?? 0)} / 100<br>力竭后会自动脱落回海里。`,
      showSlots: false,
      actions: { discard: false, eat: false, equip: false, feed: false, use: false },
    });
  } else if (tab === 'supplies' && state.selectedSupply) {
    show = true;
    const map = {
      bait: {
        name: '鱼饵',
        color: 0x7dffc0,
        desc: tut.active ? '练习湾鱼饵不限。' : '抛竿消耗。有饵时更容易钓到高阶鱼。',
        count: tut.active ? '∞' : state.inventory.bait,
      },
      plank: { name: '木板', color: 0xc48a4a, desc: '按 R 消耗木板，立即修理船体 +15。', count: state.inventory.plank },
      repair: { name: '修补剂', color: 0xffd24a, desc: '打捞或漂流瓶获得，可用于应急修复。', count: state.inventory.repair },
    };
    const s = map[state.selectedSupply];
    const canUse = state.selectedSupply === 'plank' || state.selectedSupply === 'repair';
    fillDetail({
      name: s.name,
      serial: `库存 ×${s.count}`,
      color: s.color,
      itemId: state.selectedSupply,
      rarity: 1,
      ribbon: '物资',
      tagline: '航行补给',
      desc: s.desc,
      meta: state.selectedSupply === 'bait'
        ? '抛竿时自动消耗，无需手动使用。'
        : '可在背包直接使用，立即作用于船体。',
      showSlots: false,
      actions: {
        use: canUse && s.count > 0,
        discard: s.count > 0,
        eat: false,
        equip: false,
        feed: false,
      },
    });
  }

  ui.bpEmpty.classList.toggle('hidden', show);
  ui.bpDetail.classList.toggle('hidden', !show);
}

function fillDetail({ name, serial, color, defId, itemId, rarity, ribbon, tagline, desc, meta, showSlots, actions }) {
  ui.bpName.textContent = name;
  ui.bpSerial.textContent = serial;
  ui.bpSwatch.replaceChildren();
  ui.bpSwatch.style.background = '';
  const portraitId = defId || itemId;
  ui.bpSwatch.classList.toggle('is-fish', !!portraitId);
  if (portraitId) {
    try {
      const img = document.createElement('img');
      img.className = 'bp-preview-fish';
      img.src = defId ? getFishPortrait(defId) : getItemPortrait(itemId);
      img.alt = '';
      img.draggable = false;
      ui.bpSwatch.appendChild(img);
    } catch (_) {
      ui.bpSwatch.style.background = hexColor(color);
      ui.bpSwatch.classList.remove('is-fish');
    }
  } else {
    ui.bpSwatch.style.background = hexColor(color);
  }
  ui.bpRibbon.textContent = ribbon;
  ui.bpRibbon.className = `bp-ribbon r${rarity}`;
  ui.bpTagline.textContent = tagline;
  ui.bpDesc.textContent = desc;
  ui.bpMeta.innerHTML = meta;
  ui.bpSlotPick.style.display = showSlots ? '' : 'none';
  const show = {
    use: !!actions.use,
    eat: !!actions.eat,
    equip: !!actions.equip,
    feed: !!actions.feed,
    discard: !!actions.discard,
  };
  ui.btnUse.disabled = !show.use;
  ui.btnEat.disabled = !show.eat;
  ui.btnEquip.disabled = !show.equip;
  ui.btnFeed.disabled = !show.feed;
  ui.btnDiscard.disabled = !show.discard;
  ui.btnUse.style.display = show.use ? '' : 'none';
  ui.btnEat.style.display = show.eat ? '' : 'none';
  ui.btnEquip.style.display = show.equip ? '' : 'none';
  ui.btnFeed.style.display = show.feed ? '' : 'none';
  ui.btnDiscard.style.display = show.discard ? '' : 'none';
}

function renderFishList() {
  if (state.fishPanelOpen) renderBackpack();
  else {
    ui.fishCount.textContent = String(state.fishHold.length);
    syncDeckFish(boat, state.fishHold, gradientMap);
  }
}

function discardFish() {
  if (state.backpackTab === 'supplies') {
    discardSupply();
    return;
  }
  const f = state.fishHold[state.selectedFish];
  if (!f) return showToast('先选鱼');
  state.fishHold.splice(state.selectedFish, 1);
  state.selectedFish = Math.min(state.selectedFish, state.fishHold.length - 1);
  showToast(`丢弃 ${f.name}`);
  renderFishList();
}

function discardSupply() {
  const id = state.selectedSupply;
  if (!id || !(state.inventory[id] > 0)) return showToast('没有可丢弃的物资');
  const names = { bait: '鱼饵', plank: '木板', repair: '修补剂' };
  state.inventory[id]--;
  updateInv();
  showToast(`丢弃 ${names[id] || id}`);
  if (state.inventory[id] <= 0) state.selectedSupply = null;
  renderBackpack();
}

function useSupply() {
  const id = state.selectedSupply;
  if (!id) return showToast('先选物资');
  if (id === 'bait') return showToast('鱼饵在抛竿时自动消耗');
  if (!(state.inventory[id] > 0)) return showToast('库存不足');
  if (id === 'plank') {
    state.inventory.plank--;
    repairHull(hull, 15);
    sfx.repair();
    updateHp();
    updateInv();
    showToast('使用木板：船体 +15');
  } else if (id === 'repair') {
    state.inventory.repair--;
    repairHull(hull, 25);
    sfx.repair();
    updateHp();
    updateInv();
    showToast('使用修补剂：船体 +25');
  }
  if (state.inventory[id] <= 0) state.selectedSupply = null;
  renderBackpack();
}

function eatOrRepair() {
  const f = state.fishHold[state.selectedFish];
  if (!f) return showToast('先选鱼');
  const def = getFishDef(f.defId);
  state.fishHold.splice(state.selectedFish, 1);
  state.selectedFish = -1;
  if (def.id === 'glue' || (def.category === 'food' && Math.random() < 0.35)) {
    repairHull(hull, 15);
    sfx.repair();
    showToast(`${f.name}：修理 +15`);
  } else if (def.category === 'food') {
    if (Math.random() < 0.5) {
      repairHull(hull, 20);
      sfx.repair();
      showToast(`${f.name}：+20 耐久`);
    } else {
      state.speedBuffUntil = now() + 10;
      showToast(`${f.name}：加速 10 秒`);
    }
  } else {
    repairHull(hull, 10);
    sfx.repair();
    showToast(`勉强吃了 ${f.name}… +10`);
  }
  updateHp();
  renderFishList();
}

function doEquip() {
  const f = state.fishHold[state.selectedFish];
  if (!f) return showToast('先选鱼');
  const def = getFishDef(f.defId);
  if (!def.slot) return showToast('此鱼不能绑槽');
  if (monsterFx.sealedSlot === def.slot) return showToast('该槽被藤壶封印，无法改装');
  state.selectedSlot = def.slot;
  refreshSlots();
  const res = equipFish(boat, state.slots, f, def.slot, gradientMap);
  if (!res.ok) return showToast(res.msg);
  state.fishHold.splice(state.selectedFish, 1);
  state.selectedFish = -1;
  state.mods++;
  if (f.defId === 'shell') state.shellBlocks = 1;
  showToast(res.msg);
  renderFishList();
  refreshSlots();
  updateComboHint();
}

function doFeed() {
  const f = state.fishHold[state.selectedFish];
  if (!f || getFishDef(f.defId).category !== 'food') return showToast('需要食物鱼投喂');
  const slot = state.selectedSlot;
  if (!feedSlot(state.slots, slot, 30)) return showToast('该槽无需投喂（活性≥30或空）');
  state.fishHold.splice(state.selectedFish, 1);
  state.selectedFish = -1;
  showToast(`投喂 ${SLOT_LABELS[slot]} +30 活性`);
  renderFishList();
}

function refreshSlots() {
  document.querySelectorAll('.slot-chip[data-slot]').forEach((el) => {
    const s = el.dataset.slot;
    el.classList.toggle('active', s === state.selectedSlot);
    el.classList.toggle('filled', !!state.slots[s]);
    el.classList.toggle('sealed', monsterFx.sealedSlot === s);
    const v = state.slots[s];
    el.title = v ? `${SLOT_LABELS[s]}：${v.name} 活性${Math.floor(v.vitality)}` : SLOT_LABELS[s];
  });
  document.querySelectorAll('.slot-vita-fill').forEach((fill) => {
    const s = fill.dataset.slot;
    const v = state.slots[s];
    const bar = fill.parentElement;
    const pct = v ? Math.max(0, Math.min(100, v.vitality)) : 0;
    fill.style.width = `${pct}%`;
    fill.classList.toggle('low', !!v && pct < 50 && pct >= 20);
    fill.classList.toggle('critical', !!v && pct < 20);
    bar.classList.toggle('empty', !v);
    bar.title = v ? `${v.name} 活性${Math.floor(pct)}/100` : '空槽';
  });
}

function updateComboHint() {
  const b = bonuses();
  if (b.combos.length) setPrompt(ui.comboHint, `联动：${b.combos.map((c) => c.name).join(' · ')}`);
  else setPrompt(ui.comboHint, '');
}

function tryJump() {
  if (!bonuses().hasBounce) return showToast('需要船底弹跳鱼');
  if (now() < state.jumpUntil - 0.5) return;
  state.jumpUntil = now() + 1.0;
  state.invulnUntil = now() + 0.9;
  showToast('弹跳！');
}

function finishRun(outcome) {
  setBackpackOpen(false);
  setSeaMapOpen(false);
  state.started = false;
  tut.active = false;
  tut.dismissed = true;
  hideTutGuide();
  phase = 'settle';
  ui.lighthouseModal?.classList.add('hidden');
  ui.evacCountdown?.classList.add('hidden');
  const dist = Math.floor(state.runDistance);
  const wasTutorial = (startZone | 0) === -1;
  // Practice bay is sandboxed — nothing transfers to warehouse
  const fishToStore = wasTutorial ? [] : (outcome === 'return' ? collectRunFish(state) : []);
  const suppliesToStore = wasTutorial ? null : (outcome === 'return' ? { ...state.inventory } : null);
  const { meta: m, gain, success, lostHull } = settleRun(meta, {
    distance: dist,
    mods: state.mods,
    kills: state.kills,
    newFishCount: wasTutorial ? 0 : runNewFish,
    outcome,
    fishToStore,
    suppliesToStore,
    startZone,
    boatId: selectedBoat,
  });
  meta = m;
  selectedBoat = clampBoatId(meta.unlocks, meta.loadout?.boatId || selectedBoat);
  setBoatVariant(boat, selectedBoat);
  hubBoatPreview?.applyBoatId?.(selectedBoat);
  if (wasTutorial && success) startZone = 0;
  const title = success ? (wasTutorial ? '教学完成 · 归航' : '成功归航') : '沉船结算';
  const storeNote = wasTutorial
    ? (success ? '教学关物资不入库 · 仅标记教程完成' : '教学关沉船 · 不写入仓库')
    : success
      ? `鱼获入库 ${fishToStore.length} · 新鱼种 ${runNewFish}`
      : '沉船未入库活鱼（防刷）';
  const hullNote = lostHull ? ` · ${HULL_NAMES[lostHull] || lostHull}已沉没，需在市集重买` : '';
  const stats = `航行 ${dist} 米 · 改装 ${state.mods} · 击杀 ${state.kills} · 海图碎片 +${gain}${hullNote}
${storeNote}`;
  if (ui.settleTitle) ui.settleTitle.textContent = title;
  if (ui.settleStats) ui.settleStats.textContent = stats;
  ui.sinkStats.textContent = stats;
  if (outcome === 'sink') {
    ui.sinkModal.classList.remove('hidden');
    ui.settleModal?.classList.add('hidden');
  } else {
    ui.settleModal?.classList.remove('hidden');
    ui.sinkModal.classList.add('hidden');
  }
  refreshTitleMeta();
}

function onSink() {
  sfx.sinkSound();
  finishRun('sink');
}

function openHub() {
  phase = 'hub';
  state.started = false;
  camInit = false;
  setSeaMapOpen(false);
  ui.sinkModal.classList.add('hidden');
  ui.settleModal?.classList.add('hidden');
  ui.lighthouseModal?.classList.add('hidden');
  setWorldMode('hub');
  hub?.show();
}

function openCover() {
  phase = 'cover';
  state.started = false;
  hub?.hide();
  ui.sinkModal.classList.add('hidden');
  ui.settleModal?.classList.add('hidden');
  setWorldMode('cover');
}

function startRun(fromCheckpoint = false) {
  setBackpackOpen(false);
  setSeaMapOpen(false);
  hub?.hide();
  setWorldMode('play');
  phase = 'run';
  camInit = false;
  fishing.reset();
  hideFishingFx();
  resetMonsterFx();
  selectedBoat = clampBoatId(meta.unlocks, meta.loadout?.boatId || selectedBoat);
  setBoatVariant(boat, selectedBoat);
  const maxHp = hullMaxForBoat(meta.unlocks, selectedBoat);
  hull = createHull(maxHp);

  const map = getSeaMap(startZone);
  const sp = map.spawn;
  paddle.reset(sp.x, sp.z);
  paddle.state.yaw = sp.yaw || 0;
  lastBoatX = sp.x;
  lastBoatZ = sp.z;

  state.started = true;
  if (!fromCheckpoint) state.runSkills = equippedSkills(meta);
  else if (!Array.isArray(state.runSkills) || !state.runSkills.length) {
    state.runSkills = equippedSkills(meta);
  }
  state.runDistance = fromCheckpoint ? state.runDistance : 0;
  state.maxZ = paddle.state.z;
  state.zone = startZone;
  const isTut = (startZone | 0) === -1;
  if (!fromCheckpoint) {
    state.checkpoint = 0;
    state.checkpointUsed = false;
    state.kills = 0;
    state.mods = 0;
    runNewFish = 0;
    if (isTut) {
      // Sandbox kit — do not sync/consume warehouse loadout
      Object.keys(boat.userData.mounts || {}).forEach((k) => {
        const m = boat.userData.mounts[k];
        while (m.children.length) m.remove(m.children[0]);
      });
      state.slots = { bow: null, stern: null, sideL: null, sideR: null, keel: null, sail: null };
      state.fishHold = [];
      state.inventory = { bait: 99, plank: 1, repair: 1 };
      state.selectedFish = -1;
      syncDeckFish(boat, state.fishHold, gradientMap);
    } else {
      meta = syncLoadoutSuppliesFromWarehouse(meta);
      applyLoadoutToRun(boat, state, meta, gradientMap);
      meta = consumeLoadoutOnDepart(meta);
      if (meta.unlocks.cursedBoat) {
        const f = pickFishForZone(Math.max(1, startZone));
        state.fishHold.push(f);
        const disc = discoverFish(meta, [f.defId]);
        meta = disc.meta;
        if (disc.newIds.length) runNewFish += disc.newIds.length;
      }
    }
  } else {
    state.checkpointUsed = true;
  }
  state.shellBlocks = 0;
  skillCdUntil[0] = skillCdUntil[1] = skillCdUntil[2] = 0;
  refreshWeaponChips();
  skillVfx.clear();
  ui.sinkModal.classList.add('hidden');
  ui.settleModal?.classList.add('hidden');
  ui.lighthouseModal?.classList.add('hidden');

  const loaded = seaWorld.load(startZone, scene, gradientMap, water);
  seaWorld.scatterProps(vortices, flotsam);
  tintVortexField(vortices, loaded.water);
  hazards.spawnScattered({
    count: isTut ? 1 : vortices.length * 4,
    map: loaded,
    mapPoints: loaded.spawnPoints || [],
    lhMeshes: seaWorld.getLighthouses(),
    spawn: loaded.spawn || { x: 0, z: 0 },
  });
  if (isTut && !fromCheckpoint) {
    state.inventory.plank = Math.max(state.inventory.plank, 1);
    updateInv();
  }

  resetTutorialGuide();
  updateHp();
  updateInv();
  renderFishList();
  refreshSlots();
  showToast(
    fromCheckpoint
      ? '从灯塔再次起航'
      : isTut
        ? '练习湾：安全教学 · 按提示学习后驶向灯塔归航'
        : `进入 ${loaded.name} · A/D 划桨 · 灯塔圈内停留 ${EVAC_HOLD} 秒归航`
  );
}

function applyZoneVisual(z) {
  const map = getSeaMap(z.id);
  scene.fog.color.set(map.fog);
  scene.background.set(map.sky);
  scene.fog.near = map.feature === 'fog' ? 120 : 220;
  scene.fog.far = map.feature === 'fog' ? 520 : 980;
  setWaterColor(water, map.water);
  tintVortexField(vortices, map.water);
  ui.zoneName.textContent = z.name;
}

function setSeaMapOpen(open) {
  state.seaMapOpen = !!open;
  ui.seaMapModal?.classList.toggle('hidden', !open);
  if (open) drawSeaMapOverlay();
}

function drawSeaMapOnto(canvas, map, opts = {}) {
  if (!canvas || !map) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const b = map.bounds;
  const pad = opts.pad != null ? opts.pad : 24;
  const fit = opts.fit != null ? opts.fit : 1;
  const bw = b.maxX - b.minX || 1;
  const bh = b.maxZ - b.minZ || 1;
  const scale = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh) * fit;
  const ox = (w - bw * scale) / 2;
  const oy = (h - bh * scale) / 2;
  const tx = (x) => ox + (x - b.minX) * scale;
  const tz = (z) => h - (oy + (z - b.minZ) * scale);

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = opts.bg || 'rgba(8, 18, 28, 0.92)';
  ctx.fillRect(0, 0, w, h);

  const waterHex = '#' + (map.water >>> 0).toString(16).padStart(6, '0');
  ctx.beginPath();
  map.navigable.forEach((p, i) => {
    if (i === 0) ctx.moveTo(tx(p.x), tz(p.z));
    else ctx.lineTo(tx(p.x), tz(p.z));
  });
  ctx.closePath();
  ctx.fillStyle = waterHex;
  ctx.globalAlpha = 0.55;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#6b7a88';
  for (const r of map.reefs) {
    ctx.beginPath();
    ctx.arc(tx(r.x), tz(r.z), Math.max(3, r.r * scale * 0.35), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#c4a574';
  for (const isl of map.islands) {
    ctx.beginPath();
    ctx.arc(tx(isl.x), tz(isl.z), Math.max(4, isl.r * scale * 0.4), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#ffe066';
  ctx.strokeStyle = '#e85d4c';
  for (const lh of map.lighthouses) {
    const x = tx(lh.x);
    const y = tz(lh.z);
    ctx.beginPath();
    ctx.moveTo(x, y - 8);
    ctx.lineTo(x + 6, y + 6);
    ctx.lineTo(x - 6, y + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  if (opts.showBoat) {
    const bx = tx(opts.boatX ?? 0);
    const by = tz(opts.boatZ ?? 0);
    ctx.fillStyle = '#ff6b4a';
    ctx.beginPath();
    ctx.moveTo(bx, by - 7);
    ctx.lineTo(bx + 5, by + 5);
    ctx.lineTo(bx - 5, by + 5);
    ctx.fill();
  }

  ctx.fillStyle = '#e8f4f4';
  ctx.font = '600 18px Fredoka, sans-serif';
  ctx.fillText(map.name, 20, 32);
  ctx.font = '13px Noto Sans SC, sans-serif';
  ctx.fillStyle = '#9ab';
  const mobs = monstersForZone(map.id).map((id) => getMonsterDef(id).name).join(' · ');
  ctx.fillText(opts.hint || (mobs ? `出没：${mobs}` : '灯塔 ×3'), 20, 54);
}

function drawSeaMapOverlay() {
  const canvas = ui.seaMapCanvas;
  const map = seaWorld.getMap() || getSeaMap(startZone);
  drawSeaMapOnto(canvas, map, {
    showBoat: true,
    boatX: paddle.state.x,
    boatZ: paddle.state.z,
    hint: (() => {
      if ((map.id | 0) === -1) return `练习湾 · 灯塔圈内停留 ${EVAC_HOLD} 秒归航 · M 关闭`;
      const mobs = monstersForZone(map.id).map((id) => getMonsterDef(id).name).join(' · ');
      return `出没：${mobs} · 灯塔圈内 ${EVAC_HOLD} 秒归航 · M 关闭`;
    })(),
  });
  if (canvas && map) {
    const ctx = canvas.getContext('2d');
    const b = map.bounds;
    const pad = 24;
    const w = canvas.width;
    const h = canvas.height;
    const bw = b.maxX - b.minX || 1;
    const bh = b.maxZ - b.minZ || 1;
    const scale = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh);
    const ox = (w - bw * scale) / 2;
    const oy = (h - bh * scale) / 2;
    const tx = (x) => ox + (x - b.minX) * scale;
    const tz = (z) => h - (oy + (z - b.minZ) * scale);
    const ev = hazards.getEvacStatus?.();
    if (ev?.active) {
      ctx.fillStyle = '#ffe066';
      ctx.font = 'bold 22px Noto Sans SC, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`归航 ${ev.remain.toFixed(1)}`, tx(ev.x), tz(ev.z) - 14);
      ctx.textAlign = 'left';
    }
    const waterHex = '#' + (map.water >>> 0).toString(16).padStart(6, '0');
    ctx.strokeStyle = waterHex;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.85;
    for (const v of vortices) {
      if (!v.visible) continue;
      ctx.beginPath();
      ctx.arc(tx(v.position.x), tz(v.position.z), 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function drawHubMap(canvas) {
  const map = getSeaMap(startZone);
  if (!canvas || !map) return;
  const rect = canvas.getBoundingClientRect();
  const side = Math.max(280, Math.floor(Math.min(rect.width || 640, rect.height || 640)));
  if (canvas.width !== side || canvas.height !== side) {
    canvas.width = side;
    canvas.height = side;
  }
  drawSeaMapOnto(canvas, map, {
    showBoat: false,
    pad: Math.floor(side * 0.08),
    fit: 0.97,
    bg: '#3a3e42',
    hint: (map.id | 0) === -1
      ? `安全教学 · 灯塔圈内 ${EVAC_HOLD} 秒归航`
      : `出没：${monstersForZone(map.id).map((id) => getMonsterDef(id).name).join(' · ')}`,
  });
}

function refreshTitleMeta() {
  if (ui.fragCount) ui.fragCount.textContent = `海图碎片 ${meta.fragments}`;
}

function updatePrompts() {
  if (tut.active && !tut.dismissed) return; // card owns UI
  const ev = hazards.getEvacStatus?.();
  if (ev?.active) {
    return setPrompt(ui.prompt, `灯塔归航 · 再停留 ${ev.remain.toFixed(1)} 秒`);
  }
  if (tut.active) return; // tickTutorialGuide owns the prompt after cards
  if (fishing.phase === 'qte') return setPrompt(ui.prompt, '空格 — 停在绿色区域');
  if (fishing.phase === 'cast') return setPrompt(ui.prompt, '甩竿…');
  if (fishing.phase === 'wait') {
    return setPrompt(ui.prompt, fishing.nearVortex ? '水圈附近…即将咬钩' : '等待咬钩…把浮漂靠近水圈');
  }
  if (findNearestFlotsam(flotsam, boatPos(), 7)) return setPrompt(ui.prompt, '漂浮物 · E 打捞');
  if (slotHas('flashSail')) return setPrompt(ui.prompt, `鼠标瞄准施放 · Q 闪回 · 灯塔停留 ${EVAC_HOLD} 秒归航`);
  setPrompt(ui.prompt, `鼠标瞄准施放技能 · 灯塔圈内停留 ${EVAC_HOLD} 秒归航`);
}

function drawMinimap() {
  const ctx = minimapCtx;
  const w = 140; const h = 140;
  const map = seaWorld.getMap() || getSeaMap(startZone);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = map.minimap || '#0d3d42';
  ctx.fillRect(0, 0, w, h);
  const scale = 0.045;
  const cx = w / 2; const cy = h / 2;
  // outline snippet of navigable near boat
  if (map.navigable) {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    map.navigable.forEach((p, i) => {
      const mx = cx + (p.x - paddle.state.x) * scale * 0.15;
      const my = cy - (p.z - paddle.state.z) * scale * 0.15;
      if (i === 0) ctx.moveTo(mx, my); else ctx.lineTo(mx, my);
    });
    ctx.closePath();
    ctx.stroke();
  }
  for (const lh of (seaWorld.getLighthouses() || [])) {
    const mx = cx + (lh.position.x - paddle.state.x) * scale;
    const my = cy - (lh.position.z - paddle.state.z) * scale;
    if (mx > 2 && mx < w - 2 && my > 2 && my < h - 2) {
      ctx.fillStyle = lh.userData.claimed ? '#888' : '#ffe066';
      ctx.beginPath();
      ctx.moveTo(mx, my - 5);
      ctx.lineTo(mx + 4, my + 3);
      ctx.lineTo(mx - 4, my + 3);
      ctx.fill();
      const ev = hazards.getEvacStatus?.();
      if (ev?.active && (lh.userData.lhId === ev.lhId || lh.userData.checkpoint === ev.lhId)) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ev.remain.toFixed(1), mx, my - 8);
        ctx.textAlign = 'left';
      }
    }
  }
  for (const v of vortices) {
    const mx = cx + (v.position.x - paddle.state.x) * scale;
    const my = cy - (v.position.z - paddle.state.z) * scale;
    if (mx > 2 && mx < w - 2 && my > 2 && my < h - 2) {
      const waterHex = '#' + ((map.water >>> 0).toString(16).padStart(6, '0'));
      ctx.strokeStyle = waterHex;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(mx, my, 5, 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.fillStyle = '#c48a4a';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 6);
  ctx.lineTo(cx + 5, cy + 5);
  ctx.lineTo(cx - 5, cy + 5);
  ctx.fill();
}

function tryFlashSail() {
  if (!slotHas('flashSail') || !state.started || hull.sunk) return;
  const t = now();
  if (t < legendFx.flashCd) {
    showToast('闪回冷却中');
    return;
  }
  const targetT = t - 2;
  let best = legendFx.posHist[0];
  if (!best) {
    showToast('闪回需要航行片刻');
    return;
  }
  for (const p of legendFx.posHist) {
    if (Math.abs(p.t - targetT) < Math.abs(best.t - targetT)) best = p;
  }
  paddle.state.x = best.x;
  paddle.state.z = best.z;
  paddle.state.yaw = best.yaw;
  legendFx.flashCd = t + 6;
  monsterFx.scrambleUntil = t + 1.2;
  paddle.setScramble(true);
  showToast('闪回！迷航…');
}

function tickLegendSkills(dt, phys, clockT) {
  const t = now();
  legendFx.posHist.push({ t, x: phys.x, z: phys.z, yaw: phys.yaw });
  while (legendFx.posHist.length && t - legendFx.posHist[0].t > 2.4) legendFx.posHist.shift();

  if (slotHas('ionVeil') && !legendFx.ionArmed && t >= legendFx.ionCd) {
    legendFx.ionArmed = true;
  }

  if (slotHas('magAnchor') && t >= legendFx.magCd) {
    const n = hazards.shoveWraps(boatPos(), 11);
    let fN = 0;
    for (const f of flotsam) {
      if (!f.visible) continue;
      const d = Math.hypot(f.position.x - phys.x, f.position.z - phys.z);
      if (d < 10 && d > 0.2) {
        const s = 4 / d;
        f.position.x += (f.position.x - phys.x) * s;
        f.position.z += (f.position.z - phys.z) * s;
        fN++;
      }
    }
    if (n || fN) {
      legendFx.magCd = t + 3.8;
      legendFx.hitchUntil = t + 0.35;
      paddle.state.speed *= 0.55;
      showToast('磁锚弹开！');
    }
  }

  if (slotHas('voltSpine') && t >= legendFx.voltCd && hazards.nearestEnemy(boatPos(), 22)) {
    const hits = hazards.pierceLine(boatPos(), phys.yaw, 22, 2, (id) => {
      state.kills++;
      registerMonster(id);
    });
    legendFx.voltCd = t + 5.2;
    if (hits.length) showToast(`电棘穿刺 ×${hits.length}`);
  }

  if (slotHas('tarWhip') && t >= legendFx.tarCd) {
    const e = hazards.rootNearest(boatPos(), 2.8, clockT, 15);
    if (e) {
      legendFx.tarCd = t + 6.2;
      legendFx.tarDragUntil = t + 2.8;
      showToast('焦油定身！');
    }
  }

  if (slotHas('magmaMaw')) {
    legendFx.trailAcc += dt;
    if (legendFx.trailAcc > 0.12) {
      legendFx.trailAcc = 0;
      legendFx.trail.push({
        x: phys.x - Math.sin(phys.yaw) * 2.2,
        z: phys.z - Math.cos(phys.yaw) * 2.2,
        t,
      });
    }
    while (legendFx.trail.length && t - legendFx.trail[0].t > 2.6) legendFx.trail.shift();
    if (legendFx.trail.length) hazards.disperseNearPoints(legendFx.trail, 2.3, clockT);
  } else {
    legendFx.trail.length = 0;
  }
}

function tick() {
  const dt = Math.min(0.033, clock.getDelta());
  const t = clock.elapsedTime;
  const b = bonuses();

  if (state.started && !hull.sunk && !state.fishPanelOpen && !state.lighthouseOpen && !state.seaMapOpen) {
    const thrustBoat = thrustMulForBoat(selectedBoat, meta.unlocks);
    const buff = now() < state.speedBuffUntil ? 1.3 : 1;
    const engineOk = now() >= (monsterFx.engineDisableUntil || 0);
    const hitch = now() < legendFx.hitchUntil ? 0.45 : 1;
    const drag = now() < legendFx.tarDragUntil ? 0.88 : 1;
    const heatThrust = now() < legendFx.heatPumpUntil ? 12 : 0;
    const phys = paddle.update(dt, now(), {
      thrustMul: b.thrustMul * b.speedMul * b.accelMul * thrustBoat * buff * hitch * drag,
      turnMul: b.turnMul,
      autoThrust: engineOk ? b.autoThrust + heatThrust : 0,
    });

    if (seaWorld.constrainBoat(paddle.state)) {
      phys.x = paddle.state.x;
      phys.z = paddle.state.z;
      if (now() - edgeToastAt > 2) {
        edgeToastAt = now();
        showToast('已到海域边缘');
      }
    }

    // Path length as run distance
    const step = Math.hypot(phys.x - lastBoatX, phys.z - lastBoatZ);
    if (step < 40) state.runDistance += step;
    lastBoatX = phys.x;
    lastBoatZ = phys.z;
    state.maxZ = Math.max(state.maxZ, phys.z);
    ui.runDist.textContent = String(Math.floor(state.runDistance));
    if (ui.comboText) ui.comboText.textContent = `×${phys.combo}`;
    ui.speed.textContent = String(Math.round(phys.speed * 4)).padStart(3, '0');
    const lp = phys.leftPhase > 0.4;
    const rp = phys.rightPhase > 0.4;
    if ((lp && !_prevLeftPulled) || (rp && !_prevRightPulled)) sfx.paddle();
    _prevLeftPulled = lp;
    _prevRightPulled = rp;
    ui.oarL.classList.toggle('pulled', lp);
    ui.oarR.classList.toggle('pulled', rp);
    setOarStroke(boat, -1, phys.leftPhase);
    setOarStroke(boat, 1, phys.rightPhase);

    const zone = getZone(state.runDistance, startZone);
    state.zone = zone.id;

    let corrMul = zone.corrosionMul * b.corrosionMul;
    if (meta.unlocks.ghostWake) corrMul *= 0.82;
    if (slotHas('magmaMaw')) corrMul *= 1.18;
    if (now() < legendFx.heatPumpUntil) corrMul *= 1.7;
    // simulate corrosion rates via scaled dt
    const sailing = phys.sailing;
    const before = hull.durability;
    updateCorrosion(hull, dt * corrMul, sailing);
    if (b.frictionDps) damageHull(hull, b.frictionDps * dt);
    if (zone.feature === 'current') paddle.state.x += Math.sin(t * 0.5) * 4 * dt;
    updateHp();
    if (hull.sunk) onSink();

    let y = BOAT_WATERLINE_Y + Math.sin(t * 2 + boat.userData.bobPhase) * 0.08;
    if (now() < state.jumpUntil) y += Math.sin((1 - (state.jumpUntil - now())) * Math.PI) * 2.8;
    boat.position.set(phys.x, y, phys.z);
    boat.rotation.set(
      0,
      phys.yaw + Math.PI,
      (1 - hull.durability / hull.maxDurability) * 0.15
        + (monsterFx.tiltAmt || 0) * Math.sin((monsterFx.tiltUntil - now()) * 6)
        + (now() < monsterFx.shakeUntil ? Math.sin(t * 22) * 0.18 : 0)
    );

    // captain mouse follow on deck (simple)
    boat.userData.captain.position.x = clamp(state.captainLocal.x, -0.7, 0.7);
    boat.userData.captain.position.z = clamp(state.captainLocal.z, -1.6, 1.8);

    foam.position.set(phys.x, 0.05, phys.z);
    foam.rotation.y = phys.yaw;

    wakeAcc += dt;
    if (phys.speed > 3 && wakeAcc > 0.08) {
      wakeAcc = 0;
      vel.set(Math.sin(phys.yaw) * phys.speed, 0, Math.cos(phys.yaw) * phys.speed);
      tmp.set(phys.x - Math.sin(phys.yaw) * 2, 0.15, phys.z - Math.cos(phys.yaw) * 2);
      wake.spawn(tmp, vel, Math.min(1.2, phys.speed / 14));
    }

    const bobHit = (fishing.phase === 'wait' || fishing.phase === 'cast')
      ? findNearestVortex(vortices, fishing.bobber, 2)
      : null;
    fishing.update(dt, bobHit);
    updateAimPreview();
    if (fishing.phase === 'qte') {
      setRodWaitPose(boat);
      bobberMesh.visible = true;
      const bob = fishing.bobber;
      bobberMesh.position.set(bob.x, 0.18 + Math.sin(performance.now() * 0.012) * 0.1, bob.z);
      if (boat.userData.rodTip) boat.userData.rodTip.getWorldPosition(tipWorld);
      setFishLine(tipWorld.x, tipWorld.y, tipWorld.z, bob.x, bobberMesh.position.y, bob.z);
    }
    const dropped = updateSlotsVitality(state.slots, boat, dt, gradientMap);
    if (dropped.length) showToast(`${dropped.join('、')} 力竭脱落`);
    refreshSlots();

    tickMonsterFx(dt);
    tickLegendSkills(dt, phys, t);
    {
      const card = equippedRunCard(state.weapon);
      const hit = mouseOnWater();
      if (hit) {
        skillVfx.setAim(boatPos(), hit, card.id, card.range, card.radius || 0, dt);
      } else {
        skillVfx.hideAim();
      }
    }

    hazards.update(dt, t, boatPos(), {
      onHit: (a, r) => applyDamage(a, r),
      onMonsterHit: (id, skill, ctx) => applyMonsterSkill(id, skill, ctx),
      onEncounter: () => {},
      onSuctionPull: (dx, dz) => {
        if (now() < legendFx.abyssLockUntil) return;
        paddle.state.x += dx;
        paddle.state.z += dz;
      },
      addPlank: (n) => { state.inventory.plank += n; showToast('获得木板'); updateInv(); },
      hasSucker: state.slots.sideL?.defId === 'sucker' || state.slots.sideR?.defId === 'sucker',
      boatJumping: now() < state.jumpUntil,
      boatSpeed: phys.speed,
      boatYaw: phys.yaw,
      onKill: (id) => {
        state.kills++;
        registerMonster(id);
        if (slotHas('thunderCore') && now() >= legendFx.chainCd) {
          const next = hazards.nearestEnemy(boatPos(), 18);
          if (next) {
            hazards.stunEnemy(next, t + 1.35);
            legendFx.chainCd = now() + 2.8;
            showToast('雷核连锁！');
          }
        }
        if (id === 'thiefOtter' && monsterFx.stolen) {
          state.inventory.bait += monsterFx.stolen.bait || 0;
          state.inventory.plank += monsterFx.stolen.plank || 0;
          monsterFx.stolen = null;
          updateInv();
          showToast('击杀偷吃獭，物资追回！');
        }
        if (monsterFx.sealedSlot && (id === 'barnacle' || id === 'lavaBarnacle')) {
          showToast(`刮除藤壶，「${SLOT_LABELS[monsterFx.sealedSlot]}」解封`);
          monsterFx.sealedSlot = null;
          monsterFx.heatSeal = false;
        }
      },
      onEvacuate: () => {
        if (!state.started || hull.sunk) return;
        repairHull(hull, hull.maxDurability);
        updateHp();
        showToast('灯塔归航！耐久已回满', 2200);
        sfx.evacuateSuccess();
        finishRun('return');
      },
      cutWrap: equippedRunCard(state.weapon).id === 'thunder',
    });

    tickTutorialGuide(dt);
    updateEvacHud();
    if (state.started) {
      if (b.hasInk && state.inkCd <= 0) {
        const tgen = hazards.nearestEnemy(boatPos(), 8 * (b.combos.some((c) => c.id === 'inkscan') ? 1.4 : 1));
        if (tgen) {
          hazards.shootInk(boatPos(), tgen, gradientMap);
          state.inkCd = 1.8;
          state.inkShots++;
          if (state.inkShots >= 10) {
            showToast('喷墨耗尽，空格附近补墨…');
            state.inkShots = 0;
            state.inkCd = 3;
          }
        }
      }
      if (state.inkCd > 0) state.inkCd -= dt;

      if (b.hasPuffer) {
        hazards.ramKill(boatPos(), phys.speed, b.ramMul, (id) => {
          state.kills++;
          registerMonster(id);
          showToast('撞角击沉！');
          if (monsterFx.heatSeal) {
            monsterFx.sealedSlot = null;
            monsterFx.heatSeal = false;
            showToast('撞击震飞熔岩藤壶');
          }
        });
      }
    }

    // Keep flotsam / vortices from drifting too far —soft pull back into map
    if (state.started) {
    const map = seaWorld.getMap();
    if (map) {
      for (const f of flotsam) {
        if (!f.visible) continue;
        const d = Math.hypot(f.position.x - phys.x, f.position.z - phys.z);
        if (d > 90) {
          f.position.x = phys.x + (Math.random() - 0.5) * 50;
          f.position.z = phys.z + 20 + Math.random() * 40;
        }
      }
    }

    // camera — slightly less top-down
    const back = 17.5;
    const desired = tmp.set(
      phys.x - Math.sin(phys.yaw) * back,
      9.4,
      phys.z - Math.cos(phys.yaw) * back
    );
    if (!camInit) { camera.position.copy(desired); camInit = true; }
    else camera.position.lerp(desired, 1 - Math.pow(0.0003, dt));
    camera.lookAt(phys.x, 1.6, phys.z + Math.cos(phys.yaw) * 3);

    if (state.toastTimer > 0) {
      state.toastTimer -= dt;
      if (state.toastTimer <= 0) ui.toast.classList.add('hidden');
    }
    updatePrompts();
    updateComboHint();
    } // state.started after evacuate
  } else if (phase === 'cover') {
    coverScene.update(t);
    const fr = coverScene.cameraFrame(t);
    camera.position.copy(fr.pos);
    camera.lookAt(fr.look);
  } else if (phase === 'hub') {
    hubIsland.update(t);
    hubBoatPreview.update(t);
    const shipUi = !!hub?.shipUiOpen;
    // Keep play-water hidden on island hub — its crest sparkle dazzles; only show for ship prep.
    if (water) water.visible = !!shipUi;
    const fr = shipUi ? hubBoatPreview.cameraFrame(t) : hubIsland.cameraFrame(t);
    camera.position.copy(fr.pos);
    camera.lookAt(fr.look);
    hub?.syncMarkers();
    hub?.syncCallouts();
  } else if (!state.started) {
    camera.position.set(Math.sin(t * 0.2) * 18, 10, 12 + Math.cos(t * 0.2) * 10);
    camera.lookAt(0, 1, 5);
  }

  if (phase === 'play' || phase === 'run' || state.started) {
    updateWaterFollow(water, t, boat.position);
    seaWorld.updateBeacons(t);
  } else if (phase === 'hub' && hub?.shipUiOpen) {
    const waterFocus = hubBoatPreview.boat.position;
    updateWater(water, t, waterFocus);
  }
  if (state.seaMapOpen) drawSeaMapOverlay();
  skillVfx.update(dt);
  updateFlotsam(flotsam, t);
  updateVortices(vortices, t);
  wake.update(dt);
  drawMinimap();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

// Input —capture Tab early (some browsers / IDE webviews steal it otherwise)
window.addEventListener('keydown', (e) => {
  if (isBagpackKey(e)) {
    e.preventDefault();
    e.stopPropagation();
    tryToggleBackpack();
    return;
  }
  if (state.fishPanelOpen) {
    if (e.code === 'Escape' || e.key === 'Escape') { setBackpackOpen(false); return; }
    return;
  }
  if (state.seaMapOpen) {
    if (e.code === 'KeyM' || e.code === 'Escape' || e.key === 'Escape') {
      e.preventDefault();
      setSeaMapOpen(false);
    }
    return;
  }
  if (phase === 'hub' && (e.code === 'Escape' || e.key === 'Escape')) {
    hub?.closeDrawer();
    return;
  }
  if (state.lighthouseOpen) return;
  if (e.code === 'KeyM' && state.started && !hull.sunk) {
    e.preventDefault();
    setSeaMapOpen(true);
    return;
  }
  paddle.setKey(e.code, true);
  if (!state.started) return;
  if (e.code === 'Space') { e.preventDefault(); onSpace(); }
  if (e.code === 'KeyE') trySalvage();
  if (e.code === 'KeyQ') { e.preventDefault(); tryFlashSail(); }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') tryJump();
  const d = e.code.match(/^Digit([1-6])$/);
  if (d) {
    const n = Number(d[1]);
    if (n <= 3) {
      if (!hasWeaponUnlock(meta, n - 1)) {
        showToast('尚未解锁该武器');
        return;
      }
      state.weapon = n - 1;
      document.querySelectorAll('.weapon-chip').forEach((el) => {
        el.classList.toggle('active', Number(el.dataset.w) === state.weapon);
      });
    }
    if (n >= 1 && n <= 6) {
      state.selectedSlot = SLOT_ORDER[n - 1];
      refreshSlots();
    }
  }
}, true);
window.addEventListener('keyup', (e) => {
  paddle.setKey(e.code, false);
  if (e.code === 'Space') ui.btnFish.classList.remove('pressed');
});

canvas.addEventListener('pointermove', (e) => {
  skillPointer.x = e.clientX;
  skillPointer.y = e.clientY;
  skillPointer.has = true;
  if (!state.started || state.fishPanelOpen) return;
  const nx = (e.clientX / innerWidth) * 2 - 1;
  const ny = (e.clientY / innerHeight) * 2 - 1;
  state.captainLocal.x = nx * 0.9;
  state.captainLocal.z = -ny * 1.2;
});
function noteSkillWraps(wraps) {
  wraps.ids.forEach(registerMonster);
  if (!wraps.n) return 0;
  state.kills += wraps.n;
  if (monsterFx.sealedSlot) {
    showToast(`刮除藤壶，「${SLOT_LABELS[monsterFx.sealedSlot]}」解封`);
    monsterFx.sealedSlot = null;
    monsterFx.heatSeal = false;
  }
  return wraps.n;
}

function applySkillHit(card, origin, dir, range, impact, extra = {}) {
  if (!state.started || hull.sunk) return;
  const clockT = clock.elapsedTime;
  const lineYaw = Math.atan2(dir.x, dir.z);
  if (card.id === 'ice') {
    const front = extra.front ?? range;
    const stunned = hazards.stunAlongLine(origin, lineYaw, front, 1.6, clockT, 3.4);
    const wraps = hazards.cutWrapsAlongLine(origin, lineYaw, front, 4.5);
    const wn = noteSkillWraps(wraps);
    if (wn) extra.onWrapToast?.(wn);
    else if (stunned && extra.announceStun) extra.onStunToast?.(stunned);
    return;
  }
  if (card.id === 'thunder' || card.id === 'void' || card.id === 'phoenix' || card.id === 'beam') {
    const pierce = card.id === 'beam' ? 4 : 2;
    const hits = hazards.pierceLine(origin, lineYaw, range, pierce, (id) => {
      state.kills++;
      registerMonster(id);
    });
    const wraps = hazards.cutWrapsAlongLine(origin, lineYaw, range, 4.5);
    const wn = noteSkillWraps(wraps);
    const n = hits.length + wn;
    showToast(n ? `${card.name} ×${n}` : `${card.name}！`);
    return;
  }
  const rad = Math.max(0.5, Number(card.radius) || 5);
  const n = hazards.blastRadius(impact, rad, (id) => {
    state.kills++;
    registerMonster(id);
  });
  const wraps = hazards.cutWrapsInRadius(impact, rad + 1);
  const wn = noteSkillWraps(wraps);
  hazards.shoveWraps(impact, rad + 1);
  showToast(n || wn ? `${card.name} ${n + wn}` : `${card.name}！`);
}

function tryCastSkill() {
  if (!state.started || hull.sunk || state.lighthouseOpen || state.seaMapOpen) return;
  const card = equippedRunCard(state.weapon);
  const t = now();
  if (t < skillCdUntil[state.weapon]) {
    showToast(`${card.name}冷却中`);
    return;
  }
  const origin = boatPos();
  const hit = mouseOnWater();
  if (!hit) {
    showToast('把光标移到海面上');
    return;
  }
  const dx = hit.x - origin.x;
  const dz = hit.z - origin.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 2.2) {
    showToast('太近了');
    return;
  }
  if (dist > card.range + 0.4) {
    showToast('超出施放范围');
    return;
  }
  const dir = { x: dx / dist, z: dz / dist };
  const range = dist;
  const impact = { x: hit.x, z: hit.z };
  sfx.skill(card.id);
  skillCdUntil[state.weapon] = t + card.cd;
  if (card.id === 'ice') {
    let iceAnnounced = false;
    skillVfx.cast(card.id, origin, dir, range, {
      onSweep(front) {
        applySkillHit(card, origin, dir, range, impact, {
          front,
          announceStun: !iceAnnounced,
          onWrapToast(n) {
            iceAnnounced = true;
            showToast(`霜矛冻断缠绕 ×${n}`);
          },
          onStunToast(n) {
            iceAnnounced = true;
            showToast(`霜矛冻结 ×${n}`);
          },
        });
        if (front >= range * 0.98 && !iceAnnounced) {
          iceAnnounced = true;
          showToast('霜矛！');
        }
      },
    });
  } else {
    skillVfx.cast(card.id, origin, dir, range, {
      onImpact: () => applySkillHit(card, origin, dir, range, impact),
    });
  }
}

canvas.addEventListener('pointerdown', (e) => {
  if (!state.started || state.fishPanelOpen || e.button !== 0) return;
  tryCastSkill();
});

ui.btnFish.onclick = () => { if (!state.fishPanelOpen && !state.lighthouseOpen && !state.seaMapOpen) onSpace(); };
ui.btnSalvage.onclick = () => { if (!state.fishPanelOpen && !state.lighthouseOpen && !state.seaMapOpen) trySalvage(); };
ui.btnCloseBp.onclick = () => setBackpackOpen(false);
ui.btnBackpack.onclick = (e) => {
  e.stopPropagation();
  tryToggleBackpack();
};
ui.backpack.addEventListener('click', (e) => {
  if (e.target === ui.backpack) setBackpackOpen(false);
});
canvas.addEventListener('click', () => canvas.focus?.());
canvas.tabIndex = 0;
ui.btnDiscard.onclick = discardFish;
ui.btnUse.onclick = useSupply;
ui.btnEat.onclick = eatOrRepair;
ui.btnEquip.onclick = doEquip;
ui.btnFeed.onclick = doFeed;
document.querySelectorAll('.bp-tab').forEach((el) => {
  el.onclick = () => {
    state.backpackTab = el.dataset.tab;
    state.selectedFish = state.backpackTab === 'catch' && state.fishHold.length
      ? Math.max(0, Math.min(state.selectedFish < 0 ? 0 : state.selectedFish, state.fishHold.length - 1))
      : -1;
    if (state.backpackTab !== 'supplies') state.selectedSupply = null;
    renderBackpack();
  };
});
ui.eventA.onclick = () => resolveEvent('a');
ui.eventB.onclick = () => resolveEvent('b');
ui.btnRetry.onclick = () => openHub();
ui.btnSettleHub?.addEventListener('click', () => openHub());
ui.btnLhContinue?.addEventListener('click', () => {
  state.lighthouseOpen = false;
  ui.lighthouseModal?.classList.add('hidden');
  showToast('继续向深海航行…');
});
ui.btnLhReturn?.addEventListener('click', () => {
  state.lighthouseOpen = false;
  finishRun('return');
});

hub = createHub({
  getMeta: () => meta,
  setMeta: (m) => { meta = m; refreshTitleMeta(); refreshWeaponChips(); },
  getBoat: () => selectedBoat,
  setBoat: (id) => {
    const bid = id === 'lightBoat' ? 'raft' : id;
    selectedBoat = bid;
    setBoatVariant(boat, bid);
    hubBoatPreview?.applyBoatId?.(bid);
  },
  getStartZone: () => startZone,
  setStartZone: (id) => { startZone = id; },
  onDepart: () => startRun(false),
  toast: showToast,
  projectAnchor: projectHubAnchor,
  onSpotOpen: (id) => hubIsland.setHighlight(id),
  onHubShow: () => { hubBoatPreview.setVisible(false); setWorldMode('hub'); },
  onHubHide: () => {},
  boatPreview: hubBoatPreview,
  drawHubMap,
  getCamera: () => camera,
});

ui.btnCoverStart?.addEventListener('click', () => {
  if (!meta.tutorialDone) {
    startZone = -1;
    startRun(false);
    return;
  }
  if ((startZone | 0) === -1) startZone = 0;
  openHub();
});
ui.btnCoverTutorial?.addEventListener('click', () => {
  // Prefer live practice bay over static text panel
  startZone = -1;
  startRun(false);
});
ui.tutGuideNext?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  onTutGuideNext();
});
ui.btnTutorialClose?.addEventListener('click', () => {
  ui.coverTutorial?.classList.add('hidden');
});
ui.btnCoverQuit?.addEventListener('click', () => {
  const card = document.createElement('div');
  card.className = 'cover-quit-msg';
  card.textContent = '感谢游玩「浮骸」— 可以关闭本页了';
  ui.cover?.appendChild(card);
  ui.btnCoverStart.disabled = true;
  ui.btnCoverTutorial.disabled = true;
  ui.btnCoverQuit.disabled = true;
});

canvas.addEventListener('pointerdown', (e) => {
  if (phase !== 'hub') return;
  if (hub?.drawerOpen) return;
  const id = pickHubBuilding(e.clientX, e.clientY);
  if (id) hub?.openSpot(id);
});

document.querySelectorAll('.slot-chip[data-slot]').forEach((el) => {
  el.onclick = () => { state.selectedSlot = el.dataset.slot; refreshSlots(); };
});
document.querySelectorAll('.weapon-chip').forEach((el) => {
  el.onclick = () => {
    const w = Number(el.dataset.w);
    if (!hasWeaponUnlock(meta, w)) {
      showToast('尚未解锁该武器');
      return;
    }
    state.weapon = w;
    document.querySelectorAll('.weapon-chip').forEach((x) => x.classList.toggle('active', x === el));
  };
});
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

document.addEventListener('keydown', (e) => {
  if (!state.started || state.fishPanelOpen || state.lighthouseOpen || state.seaMapOpen) return;
  if (e.code === 'KeyR' && state.inventory.plank > 0) {
    state.inventory.plank--;
    repairHull(hull, 15);
    sfx.repair();
    updateHp(); updateInv();
    showToast('木板修理 +15');
  }
});

{
  const btn = document.createElement('button');
  btn.id = 'sfx-toggle';
  btn.type = 'button';
  btn.textContent = '🔊';
  btn.addEventListener('click', () => {
    sfx.setEnabled(!sfx.isEnabled());
    btn.textContent = sfx.isEnabled() ? '🔊' : '🔇';
    btn.classList.toggle('muted', !sfx.isEnabled());
  });
  document.body.appendChild(btn);
}
applyZoneVisual(getZone(0, startZone));
refreshWeaponChips();
refreshTitleMeta();
updateHp();
updateInv();
refreshSlots();
renderFishList();
setWorldMode('cover');
hub.hide();
{
  const fr = coverScene.cameraFrame(0);
  camera.position.copy(fr.pos);
  camera.lookAt(fr.look);
}
tick();

globalThis.__FU = { paddle, hull, state, fishing, bonuses, startRun, hazards, seaWorld, openHub, openCover, finishRun, meta: () => meta };
