import * as THREE from 'three';
import { createToonGradient, clamp } from './stylekit.js?v=34a';
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
} from './fishing.js?v=33c';
import { createHazards } from './hazards.js?v=32s';
import {
  equipFish, updateSlotsVitality, computeBonuses, syncDeckFish,
  SLOT_ORDER, SLOT_LABELS, feedSlot, ramCdForRarity,
} from './slots.js?v=32e';
import { getFishDef, pickFishForZone, RARITY, rarityStars, BAIT_KINDS, familyOf, familyLabel } from './fishCatalog.js?v=34b';
import { createFamilyVfx } from './familyVfx.js?v=32p';
import { createFishMesh } from './fishMeshes.js?v=31c';
import { beginHitFlash, beginDeathAnim } from './monsterMeshes.js?v=34a';
import { createGpuSparks } from './vfx/gpuSparks.js?v=32s';
import { createBurstSystem, BurstMode } from './vfx/burstSphere.js?v=32s';
import { getFishPortrait } from './fishPortrait.js?v=31c';
import { getItemPortrait } from './itemPortrait.js?v=31c';
import { getSeaMap, EVAC_HOLD, TUTORIAL_BEATS } from './seaMaps.js?v=31y';
import { getZone } from './zones.js?v=31y';
import {
  loadMeta, settleRun, hullMaxForBoat, thrustMulForBoat, hasWeaponUnlock,
  discoverFish, discoverMonster, syncLoadoutSuppliesFromWarehouse, consumeLoadoutOnDepart,
  loadoutSuppliesPacked, clampBoatId, HULL_NAMES, equippedSkills, skillShopToVfx,
  skillLevel, scaledSkillCard, fishmongerGreenMul, ghostWakeCorrMul, talentLevel,
  chargeZoneTicket, canDepartZone, saveMeta,
} from './meta.js?v=31y';
import { applyLoadoutToRun, collectRunFish } from './loadout.js?v=31h';
import { createHub } from './hub.js?v=33f';
import { createCoverScene } from './coverScene.js?v=28m';
import { createHubIsland } from './hubIsland.js?v=31q';
import { createHubBoatPreview } from './hubBoatPreview.js?v=29q';
import { createBpBoatStage } from './bpBoatStage.js?v=31d';
import { createSeaWorld, updateWaterFollow, setWaterColor } from './seaWorld.js?v=31y';
import { getSeaBiome } from './seaBiomes.js?v=30h';
import { createWeatherFx } from './weatherFx.js?v=30h';
import { getMonsterDef, resolveMonsterId, monstersForZone, combatCountForZone } from './monsterCatalog.js?v=31g';
import { createSkillVfx, SKILL_CARDS, AIM_HEAD_EXTRA } from './vfx/skillVfx.js?v=34a';
import { renderManualHtml } from './hubManual.js?v=32j';
import * as sfx from './audio.js?v=33f';

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
  coverManualBody: document.getElementById('cover-manual-body'),
  btnTutorialClose: document.getElementById('btn-tutorial-close'),
  hud: document.getElementById('hud'),
  oarL: document.getElementById('oar-l'),
  oarR: document.getElementById('oar-r'),
};

if (ui.tutGuide && ui.hud) ui.hud.appendChild(ui.tutGuide);

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
  ramCd: 0,
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
  const base = SKILL_CARDS.find((c) => c.id === vfxId) || SKILL_CARDS[0];
  return scaledSkillCard(base, shopId, skillLevel(meta, shopId));
}

function ensureWeaponChipParts(el) {
  if (el.querySelector('.weapon-chip-label')) return;
  el.textContent = '';
  const label = document.createElement('span');
  label.className = 'weapon-chip-label';
  const veil = document.createElement('span');
  veil.className = 'weapon-chip-veil';
  const cd = document.createElement('span');
  cd.className = 'weapon-chip-cd';
  el.append(label, veil, cd);
}

function formatSkillCd(remain) {
  if (remain >= 9.95) return String(Math.ceil(remain));
  return remain.toFixed(1);
}

function updateWeaponCds() {
  document.querySelectorAll('.weapon-chip').forEach((el) => {
    ensureWeaponChipParts(el);
    const w = Number(el.dataset.w);
    const card = equippedRunCard(w);
    const remain = state.started ? Math.max(0, skillCdUntil[w] - now()) : 0;
    const cooling = remain > 0.02;
    el.classList.toggle('cooling', cooling);
    const cdEl = el.querySelector('.weapon-chip-cd');
    const veil = el.querySelector('.weapon-chip-veil');
    if (!cooling) {
      cdEl.textContent = '';
      veil.style.transform = 'scaleY(0)';
      return;
    }
    const total = Math.max(0.01, Number(card.cd) || 1);
    cdEl.textContent = formatSkillCd(remain);
    veil.style.transform = `scaleY(${Math.min(1, remain / total)})`;
  });
}

function refreshWeaponChips() {
  document.querySelectorAll('.weapon-chip').forEach((el) => {
    ensureWeaponChipParts(el);
    const w = Number(el.dataset.w);
    const card = equippedRunCard(w);
    el.querySelector('.weapon-chip-label').textContent = `${w + 1} ${card.name}`;
  });
  updateWeaponCds();
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
        takeBaitFromInventory();
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
        for (let i = 0; i < take.bait; i++) takeBaitFromInventory();
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
        takeBaitFromInventory();
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

const hemiLight = new THREE.HemisphereLight(0xffe8d0, 0x2ecfc4, 1.1);
scene.add(hemiLight);
const sun = new THREE.DirectionalLight(0xffd2a0, 1.1);
sun.position.set(-80, 50, -120);
scene.add(sun);
const ambLight = new THREE.AmbientLight(0xfff0e8, 0.35);
scene.add(ambLight);

const duskSky = createDuskSky();
scene.add(duskSky);
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
const familyVfx = createFamilyVfx(boat);
let lastFamilyKey = '';

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

const hitSparks = createGpuSparks(scene);
const hitBursts = createBurstSystem(scene);
/** Camera shake: amp decays over time (stronger on kill). */
const camShake = { amp: 0, until: 0 };
function addCamShake(amp, ms = 220) {
  camShake.amp = Math.min(0.85, Math.max(camShake.amp, amp));
  camShake.until = Math.max(camShake.until, performance.now() + ms);
}
const monsterHitFx = {
  pulse(target, { amount, killed, quiet, from, dir, element, kind, intensity }) {
    if (!target) return;
    const k = kind || target.userData.kind || 'ram';
    const inten = intensity ?? 1;
    if (killed) {
      beginDeathAnim(target, { kind: k, intensity: inten });
      if (!quiet) sfx.monsterKill();
    } else {
      beginHitFlash(target, 180);
      if (!quiet) sfx.monsterHit();
    }
    const canNudge = !killed && k !== 'wrap' && k !== 'static';
    if (canNudge) {
      let dx = 0;
      let dz = 0;
      if (dir && (dir.x || dir.z)) {
        dx = dir.x;
        dz = dir.z;
      } else if (from) {
        dx = target.position.x - from.x;
        dz = target.position.z - from.z;
      }
      const len = Math.hypot(dx, dz) || 1;
      target.position.x += (dx / len) * 0.55;
      target.position.z += (dz / len) * 0.55;
    }
    const y = (target.position.y || 0) + 1.15;
    const px = target.position.x;
    const pz = target.position.z;
    if (!killed) {
      hitSparks.emit(22, {
        x: px, y, z: pz,
        color: 0xffe8c8,
        size: 24,
        life: 0.55,
        speed: 2.8,
        spread: 1.0,
        gravity: 0.35,
        radius: 0.6,
      });
      if (!quiet) addCamShake(0.12, 110);
      return;
    }

    // Kill: flash→burst→gone (body anim runs in hazards update)
    const mode = element === 'frost'
      ? BurstMode.FROST
      : (element === 'fire' || k === 'suction')
        ? BurstMode.FIRE
        : BurstMode.STORM;
    const endR = (k === 'suction' ? 4.2 : 3.6) * inten;
    hitBursts.spawn(mode, px, y, pz, {
      radius: 0.6 * inten,
      endRadius: endR,
      life: 0.7,
      squash: k === 'ram' ? 0.42 : 0.5,
      intensity: 1.25 * inten,
      opacity: 0.95,
      colorA: k === 'wrap' ? 0xf0e0c8 : undefined,
      colorB: k === 'wrap' ? 0xd4c4a0 : undefined,
    });
    hitSparks.emit(Math.round(36 * inten), {
      x: px, y, z: pz,
      color: k === 'ranged' ? 0xc8e8ff : 0xffe8c8,
      size: 30,
      life: 0.7,
      speed: 3.6,
      spread: 1.15,
      gravity: 0.3,
      radius: 0.9,
    });
    // Aftermath ripple sparks at ~0.35s mark via delayed small burst feel: second pop now (short life)
    hitSparks.emit(Math.round(14 * inten), {
      x: px, y: 0.35, z: pz,
      color: 0xffffff,
      size: 14,
      life: 0.5,
      speed: 2.2,
      spread: 1.2,
      gravity: 0.15,
      radius: 1.1,
      vy: 0.3,
    });
    const shakeAmp = (k === 'suction' ? 0.72 : 0.55) * inten;
    addCamShake(Math.min(0.85, shakeAmp), 380);
  },
};
const hazards = createHazards(gradientMap, scene, monsterHitFx);
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

function createTutMarker() {
  const g = new THREE.Group();
  const dest = new THREE.Group();
  const mat = (hex, opacity = 1) => new THREE.MeshBasicMaterial({
    color: hex, transparent: opacity < 1, opacity, depthWrite: false, side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.4, 7.2, 40), mat(0x7dffc0, 0.95));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.16;
  ring.userData.skipOutline = true;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(3.2, 28), mat(0x7dffc0, 0.28));
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.12;
  disc.userData.skipOutline = true;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 7.5, 8), mat(0xb8ffe0, 0.9));
  pole.position.y = 3.8;
  pole.userData.skipOutline = true;
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.6, 4), mat(0x7dffc0));
  arrow.position.y = 8.4;
  arrow.userData.skipOutline = true;
  dest.add(ring, disc, pole, arrow);

  const path = new THREE.Group();
  const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat(0x5cffb0, 0.32));
  ribbon.rotation.x = -Math.PI / 2;
  ribbon.position.y = 0.1;
  ribbon.userData.skipOutline = true;
  path.add(ribbon);
  const chevrons = [];
  for (let i = 0; i < 18; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(1.05, 2.4, 3), mat(0xa8ffe0, 0.95));
    c.rotation.x = Math.PI / 2;
    c.position.y = 0.35;
    c.userData.skipOutline = true;
    c.visible = false;
    path.add(c);
    chevrons.push(c);
  }
  g.add(dest, path);
  g.userData = { dest, path, ribbon, chevrons, ring };
  g.visible = false;
  scene.add(g);
  return g;
}

const tutMarker = createTutMarker();
const weatherFx = createWeatherFx(scene);

const coverScene = createCoverScene(gradientMap);
scene.add(coverScene.root);
const hubIsland = createHubIsland(gradientMap);
const hubBoatPreview = createHubBoatPreview(scene, gradientMap);
hubBoatPreview.setVisible(false);
scene.add(hubIsland.root);

const bpBoatStage = createBpBoatStage({
  mat: document.querySelector('#backpack .bp-mat'),
  grid: ui.bpGrid,
  gradientMap,
  onSelectSlot: (slot) => {
    state.selectedSlot = slot;
    state.selectedFish = -1;
    state.selectedSupply = null;
    refreshSlots();
    renderBackpack();
  },
});

const playVisuals = [water, foam, boat, flotRoot, vRoot, hazards.root, skillVfx.root, seaWorld.root, worldClouds, duskSun, aimRing, bobberMesh, fishLine, weatherFx.root];
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

  if (mode === 'cover' || mode === 'hub') {
    hemiLight.color.setHex(0xffe8d0);
    hemiLight.groundColor.setHex(0x2ecfc4);
    hemiLight.intensity = 1.1;
    sun.color.setHex(0xffd2a0);
    sun.intensity = 1.1;
    ambLight.color.setHex(0xfff0e8);
    sfx.setBgmTheme(mode === 'cover' ? 'cover' : 'hub');
  }

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
    // Play fog/sky come from applyZoneVisual / seaWorld.load biome packs.
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
    title: '\u5212\u6868',
    body: 'A / D \u4ea4\u66ff\u5212\u3002\u540c\u65f6\u6309\u4f4f\u76f4\u884c\uff0c\u5148\u5f80\u524d\u5f00\u4e00\u6bb5\u3002',
    btn: '\u4e0b\u4e00\u6b65',
    gate: 'paddle',
  },
  {
    title: '\u9493\u9c7c',
    body: '\u9760\u8fd1\u6c34\u5708\uff0c\u7a7a\u683c\u629b\u7aff\u3002\u6307\u9488\u8fdb\u7eff\u533a\u518d\u7a7a\u683c\u3002',
    btn: '\u4e0b\u4e00\u6b65',
    gate: 'fish',
  },
  {
    title: '\u6253\u635e',
    body: '\u9760\u8fd1\u6728\u6876 / \u7bb1\u5b50 / \u74f6\u5b50\uff0c\u6309 E \u6361\u8d77\u4e00\u4ef6\u3002',
    btn: '\u4e0b\u4e00\u6b65',
    gate: 'salvage',
  },
  {
    title: '\u6539\u88c5',
    body: 'Tab \u5f00\u80cc\u5305\uff0c\u628a\u9c7c\u7ed1\u5230\u4e13\u5c5e\u69fd\u3002\u89d2\u6807\u662f\u516d\u65cf\uff1a\u58f3\u7532 / \u58a8\u96fe / \u8f6e\u673a / \u5e06\u96f7 / \u5bd2\u6f5c / \u9ab8\u9707\u3002\u540c\u65cf\u88c5\u5230\u4e0d\u540c\u69fd\u53ef\u5171\u9e23\u3002',
    btn: '\u4e0b\u4e00\u6b65',
    gate: 'equip',
  },
  {
    title: '\u6253\u602a',
    body: '\u6309 1 / 2 / 3 \u5207\u6362\u6280\u80fd\u3002\u79fb\u52a8\u9f20\u6807\u9009\u4e2d\u6d77\u9762\uff0c\u5de6\u952e\u70b9\u51fb\u653b\u51fb\u3002',
    btn: '\u4e0b\u4e00\u6b65',
    gate: 'kill',
  },
  {
    title: '\u5f52\u822a',
    body: `\u5f00\u8fdb\u706f\u5854\u7eff\u5708\uff0c\u505c\u6ee1 ${EVAC_HOLD} \u79d2\u56de\u57fa\u5730\u3002\u672c\u5173\u4e0d\u5e26\u51fa\u7269\u8d44\u3002`,
    btn: '\u53bb\u706f\u5854',
    gate: 'evac',
  },
];

const tut = {
  active: false,
  step: 0,
  dismissed: false,
  gateMet: false,
  salvaged: false,
  evacWarnAt: 0,
};

function tutTargetForStep(step) {
  const s = step | 0;
  if (s <= 1) return TUTORIAL_BEATS.fish;
  if (s === 2) return TUTORIAL_BEATS.salvage;
  if (s === 3) return null;
  if (s === 4) return TUTORIAL_BEATS.monster;
  return TUTORIAL_BEATS.lighthouse;
}

function tutDistToTarget(step = tut.step) {
  const t = tutTargetForStep(step);
  if (!t) return 0;
  return Math.hypot(paddle.state.x - t.x, paddle.state.z - t.z);
}

function tutStepBody(step) {
  const dist = Math.round(tutDistToTarget(step));
  switch (step | 0) {
    case 0:
      return `\u5411\u5317\u5212\u5230\u5149\u6807\u5904\uff08\u7ea6 ${dist} \u7c73\uff09\u00b7 A / D \u4ea4\u66ff\u5212 \u00b7 A / D \u540c\u65f6\u6309\u76f4\u884c`;
    case 1:
      return '\u811a\u4e0b\u6c34\u5708 \u00b7 \u7a7a\u683c\u629b\u7aff\uff0c\u7eff\u533a\u518d\u7a7a\u683c';
    case 2:
      return `\u7ee7\u7eed\u5411\u5317 \u00b7 \u9760\u8fd1\u6f02\u6d6e\u7269\u6309 E\uff08\u7ea6 ${dist} \u7c73\uff09`;
    case 3:
      return '\u6309 Tab \u6253\u5f00\u80cc\u5305 \u00b7 \u7ed1\u5230\u4e13\u5c5e\u69fd \u00b7 \u89d2\u6807\u516d\u65cf\uff0c\u540c\u65cf\u4e0d\u540c\u69fd\u53ef\u5171\u9e23';
    case 4:
      return `\u6309 1 / 2 / 3 \u5207\u6362\u6280\u80fd\u3002\u79fb\u52a8\u9f20\u6807\u9009\u4e2d\u6d77\u9762\uff0c\u5de6\u952e\u70b9\u51fb\u653b\u51fb\uff08\u7ea6 ${dist} \u7c73\uff09`;
    case 5:
      return `\u5411\u5317\u5230\u706f\u5854\u7eff\u5708 \u00b7 \u505c\u6ee1 ${EVAC_HOLD} \u79d2\uff08\u7ea6 ${dist} \u7c73\uff09`;
    default:
      return '';
  }
}

function applyTutorialWorld() {
  if (!tut.active) return;
  seaWorld.setTutorialReveal?.(tut.step, tut.dismissed);
  hazards.setTutorialReveal?.(tut.step, tut.dismissed);
}

function tutHasBindableFish() {
  return state.fishHold.some((f) => !!getFishDef(f.defId)?.slot);
}

function checkTutGate() {
  if (!tut.active || tut.dismissed) return false;
  const gate = TUT_STEPS[tut.step]?.gate;
  const fish = TUTORIAL_BEATS.fish;
  if (gate === 'paddle') {
    return Math.hypot(paddle.state.x - fish.x, paddle.state.z - fish.z) <= 8;
  }
  if (gate === 'fish') return tutHasBindableFish();
  if (gate === 'salvage') return !!tut.salvaged;
  if (gate === 'equip') return (state.mods | 0) >= 1;
  if (gate === 'kill') return (state.kills | 0) >= 1;
  if (gate === 'evac') return true;
  return false;
}

function updateTutMarker(time) {
  const ud = tutMarker.userData;
  if (!tut.active || tut.dismissed || tut.step === 3) {
    tutMarker.visible = false;
    return;
  }
  const target = tutTargetForStep(tut.step);
  if (!target) {
    tutMarker.visible = false;
    return;
  }
  tutMarker.visible = true;
  tutMarker.position.set(0, 0, 0);
  ud.dest.position.set(target.x, 0, target.z);
  const pulse = 0.92 + Math.sin(time * 5) * 0.12;
  ud.dest.scale.setScalar(pulse);
  if (ud.ring?.material) ud.ring.material.opacity = 0.7 + Math.sin(time * 6) * 0.25;

  const ox = paddle.state.x;
  const oz = paddle.state.z;
  const dx = target.x - ox;
  const dz = target.z - oz;
  const dist = Math.hypot(dx, dz);
  const yaw = Math.atan2(dx, dz);
  const ribbon = ud.ribbon;
  if (dist < 4) {
    ribbon.visible = false;
    ud.chevrons.forEach((c) => { c.visible = false; });
    return;
  }
  ribbon.visible = true;
  ribbon.position.set((ox + target.x) * 0.5, 0.1, (oz + target.z) * 0.5);
  ribbon.rotation.set(-Math.PI / 2, yaw, 0);
  ribbon.scale.set(2.6, dist, 1);
  if (ribbon.material) ribbon.material.opacity = 0.22 + Math.sin(time * 4) * 0.08;

  const step = 5.6;
  const start = 3.2;
  const end = dist - 4.5;
  let n = 0;
  for (let d = start; d < end && n < ud.chevrons.length; d += step) {
    const c = ud.chevrons[n++];
    const t = d / dist;
    c.visible = true;
    c.position.set(ox + dx * t, 0.45 + Math.sin(time * 6 + n) * 0.12, oz + dz * t);
    c.rotation.set(-Math.PI / 2, yaw, 0);
    c.scale.setScalar(1.05 + Math.sin(time * 7 + n) * 0.12);
  }
  for (; n < ud.chevrons.length; n++) ud.chevrons[n].visible = false;
}

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
  tut.gateMet = checkTutGate();
  if (ui.tutGuideStep) ui.tutGuideStep.textContent = `${tut.step + 1} / ${TUT_STEPS.length}`;
  if (ui.tutGuideTitle) ui.tutGuideTitle.textContent = s.title;
  if (ui.tutGuideBody) ui.tutGuideBody.textContent = tutStepBody(tut.step);
  if (ui.tutGuideNext) {
    ui.tutGuideNext.textContent = tut.gateMet ? s.btn : '\u5148\u5b8c\u6210\u6b64\u6b65';
    ui.tutGuideNext.disabled = !tut.gateMet;
  }
  ui.tutGuide.classList.remove('hidden');
  setPrompt(ui.prompt, '');
}

function resetTutorialGuide() {
  tut.active = (startZone | 0) === -1;
  tut.step = 0;
  tut.dismissed = false;
  tut.gateMet = false;
  tut.salvaged = false;
  tut.evacWarnAt = 0;
  tutMarker.visible = false;
  applyTutorialWorld();
  if (tut.active) renderTutGuide();
  else hideTutGuide();
}

function onTutGuideNext() {
  if (!tut.active || tut.dismissed) return;
  if (!checkTutGate()) {
    renderTutGuide();
    return;
  }
  if (tut.step < TUT_STEPS.length - 1) {
    tut.step += 1;
    if (tut.step === 3) {
      state.backpackTab = 'catch';
      if (state.fishHold.length) state.selectedFish = 0;
    }
    applyTutorialWorld();
    renderTutGuide();
    return;
  }
  tut.dismissed = true;
  applyTutorialWorld();
  hideTutGuide();
  setPrompt(ui.prompt, `\u5f00\u8fdb\u706f\u5854\u7eff\u5708\uff0c\u505c ${EVAC_HOLD} \u79d2\u5f52\u822a`);
}

function tickTutorialGuide(_dt) {
  if (!tut.active) {
    tutMarker.visible = false;
    return;
  }
  updateTutMarker(performance.now() * 0.001);
  if (!tut.dismissed) {
    const met = checkTutGate();
    if (ui.tutGuideBody) ui.tutGuideBody.textContent = tutStepBody(tut.step);
    if (met !== tut.gateMet) renderTutGuide();
    else if (ui.tutGuideNext) ui.tutGuideNext.disabled = !met;
    setPrompt(ui.prompt, '');
    return;
  }
  const ev = hazards.getEvacStatus?.();
  if (ev?.active) {
    setPrompt(ui.prompt, `\u706f\u5854\u5f52\u822a \u00b7 \u518d\u505c ${ev.remain.toFixed(1)} \u79d2`);
  } else {
    const dist = Math.round(tutDistToTarget(5));
    setPrompt(ui.prompt, `\u5f00\u8fdb\u706f\u5854\u7eff\u5708\uff0c\u505c ${EVAC_HOLD} \u79d2\u5f52\u822a\uff08\u7ea6 ${dist} \u7c73\uff09`);
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
      }, 36);
      legendFx.obsidianStore = 0;
      legendFx.obsidianBreakUntil = t + 2.5;
      showToast(n ? `黑曜心爆发 · 击破 ${n}` : '黑曜心爆发 · 破防');
    }
    return;
  }
  const b = bonuses();
  if (b.block > 0 || state.shellBlocks > 0) {
    state.shellBlocks = Math.max(0, (state.shellBlocks || b.block) - 1);
    if (state.slots.sideR?.defId === 'shell' || state.slots.sideR?.defId === 'grouper') {
      state.slots.sideR = null;
    }
    if (!quiet) {
      showToast('\u683c\u6321\u6321\u4e0b\u653b\u51fb\uff01');
      if ((b.families || []).some((f) => f.id === 'shell')) familyVfx.pulse('shell');
    }
    refreshSlots();
    return;
  }
  let dmg = amount;
  if (b.blockFrac > 0) dmg *= (1 - b.blockFrac);
  if (t < legendFx.obsidianBreakUntil) dmg *= 1.5;
  damageHull(hull, dmg);
  if (slotHas('heatPump')) {
    legendFx.heatPumpUntil = t + 1.9;
    if (!quiet && amount >= 2) showToast('热泵：伤转推力');
  }
  if (!quiet && amount >= 2) showToast(`${reason} −${Math.round(dmg)}`);
  updateHp();
  if (hull.sunk) onSink();
}

function updateHp() {
  if (!Number.isFinite(hull.durability) || !Number.isFinite(hull.maxDurability) || hull.maxDurability <= 0) {
    const max = Number.isFinite(hull.maxDurability) && hull.maxDurability > 0 ? hull.maxDurability : 100;
    hull.durability = max;
    hull.maxDurability = max;
  }
  ui.hpFill.style.width = `${(hull.durability / hull.maxDurability) * 100}%`;
  ui.hpText.textContent = String(Math.round(hull.durability));
}
function updateInv() {
  const i = state.inventory;
  if (ui.invText) {
    ui.invText.textContent = tut.active
      ? `饵∞ · 板${i.plank} · 剂${i.repair}`
      : `饵${i.bait} · 板${i.plank} · ${i.paste ? '膏' : '剂'}${i.paste || i.repair}`;
  }
  if (state.fishPanelOpen && state.backpackTab === 'supplies') renderBackpack();
}

const fishing = createFishingController({
  toast: showToast,
  onMiss() {
    sfx.fishMiss();
  },
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
    if (tut.active && !getFishDef(fish.defId)?.slot) {
      for (let i = 0; i < 12; i++) {
        const t = pickFishForZone(0, 'crude');
        if (getFishDef(t.defId)?.slot) { fish = t; break; }
      }
    }
    state.fishHold.push(fish);
    sfx.fishCatch();
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
        showToast(`钓到 ${fish.name}（${rarityStars(fish.rarity)}）· Tab 查看`);
      }
    }
    renderFishList();
  },
});

function showCatchLift(fish) {
  const m = createFishMesh(fish.defId, gradientMap, 1.1, fish.defId === 'food' ? fish.color : null);
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

function takeBaitFromInventory() {
  const bag = state.inventory.baitBag;
  if (Array.isArray(bag) && bag.length) {
    const used = bag.shift();
    state.inventory.baitKind = bag[0] || used;
    state.inventory.bait = bag.length;
    return used;
  }
  if ((state.inventory.bait | 0) > 0) {
    state.inventory.bait -= 1;
    return state.inventory.baitKind || 'fresh';
  }
  return null;
}

function grantBait(n, kind) {
  const k = kind || state.inventory.baitKind || 'fresh';
  if (!Array.isArray(state.inventory.baitBag)) state.inventory.baitBag = [];
  for (let i = 0; i < n; i++) state.inventory.baitBag.push(k);
  state.inventory.baitKind = state.inventory.baitBag[0] || k;
  state.inventory.bait = state.inventory.baitBag.length;
}

function onSpace() {
  if (hull.sunk) return;
  if (fishing.phase === 'qte') { fishing.onSpace(); return; }
  if (fishing.phase === 'wait' || fishing.phase === 'cast') return;
  let baitKind = 'crude';
  if (tut.active) {
    baitKind = 'crude';
  } else {
    const used = takeBaitFromInventory();
    if (!used) {
      showToast('没有鱼饵，无法抛竿');
      return;
    }
    baitKind = used;
    updateInv();
  }
  const greenBonus = fishmongerGreenMul(meta);
  const aim = aimPointFromBoat();
  fishing.tryCast(true, state.runDistance, greenBonus, startZone, aim.x, aim.z, baitKind);
  sfx.fishCast();
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
  if (tut.active && r.type === 'event') {
    grantBait(1, 'crude');
    showToast('\u6253\u635e\u5230\u9c7c\u9972\uff08\u6559\u5b66\uff09');
    updateInv();
    tut.salvaged = true;
  } else if (r.type === 'trap') {
    if (tut.active) {
      grantBait(1, 'crude');
      showToast('\u6253\u635e\u5230\u9c7c\u9972\uff08\u6559\u5b66\uff09');
      updateInv();
      tut.salvaged = true;
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
    if (r.supply === 'bait') grantBait(r.amount, state.inventory.baitKind || 'fresh');
    else state.inventory[r.supply] = (state.inventory[r.supply] || 0) + r.amount;
    sfx.collect();
    showToast(`打捞 ${r.name}×${r.amount}`);
    updateInv();
    if (tut.active) tut.salvaged = true;
  }
  if (!tut.active) {
    setTimeout(() => {
      respawnFlotsam(obj, obj.userData.id);
      obj.position.z = paddle.state.z + 40 + Math.random() * 60;
      obj.position.x = (Math.random() - 0.5) * 40;
    }, 8000);
  }
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
  if (key === 'bait') grantBait(2, state.inventory.baitKind || 'fresh');
  showToast(choice?.label || (which === 'a' ? '选择 A' : '选择 B'));
  updateInv();
}

function hexColor(n) {
  return `#${(n >>> 0).toString(16).padStart(6, '0')}`;
}

function fishBlurb(def) {
  const bits = [];
  const e = def.effect || {};
  const s = def.side || {};
  const fam = familyOf(def);
  if (fam) bits.push(`\u65cf\uff1a${fam.name}（${fam.tip}）`);
  if (e.ramMul) bits.push(`\u51b2\u649e\u00d7${e.ramMul}`);
  if (e.ramDmg) bits.push(`\u649e\u51fb ${e.ramDmg}`);
  if (e.ramMul || e.ramDmg) bits.push(`\u649e\u51fb\u51b7\u5374 ${ramCdForRarity(def.rarity)}s`);
  if (e.dash) bits.push(`\u51b2\u523a ${e.dash}m`);
  if (e.freeze) bits.push(`\u51b0\u51bb ${e.freeze}s`);
  if (e.shockwave) bits.push(e.shockDmg ? `冲击 ${e.shockDmg}` : '龙震冲击波');
  if (e.autoThrust) bits.push(`持续推进 ${e.autoThrust}`);
  if (e.burst) bits.push(`爆发推进 ${e.burst}s`);
  if (e.hover) bits.push(`悬浮 ${e.hover}s`);
  if (e.phase) bits.push(`相位 ${e.phase}s`);
  if (e.autoShot) bits.push(e.shotDmg ? `点射 ${e.shotDmg}` : '自动喷墨');
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
  const stats = bits.length ? bits.join(' · ') : '';
  if (stats && def.desc) return `${stats}。${def.desc}`;
  return stats || def.desc || '海上奇物，绑到对应船槽生效。';
}

function categoryLabel(cat) {
  return ({ food: '消耗', weapon: '武器', engine: '动力', defense: '防御', utility: '机能', sense: '感知' })[cat] || '杂项';
}

function setBackpackOpen(open) {
  if (!open && tut.active && tut.step === 3 && (state.mods | 0) < 1) {
    showToast('\u5148\u5b8c\u6210\u7ed1\u9c7c\u6539\u88c5');
    sfx.uiDeny();
    return;
  }
  const next = !!open;
  if (next && !state.fishPanelOpen) sfx.uiOpen();
  else if (!next && state.fishPanelOpen) sfx.uiClose();
  state.fishPanelOpen = next;
  ui.backpack.classList.toggle('hidden', !open);
  ui.backpack.setAttribute('aria-hidden', open ? 'false' : 'true');
  ui.btnBackpack?.classList.toggle('open', !!open);
  if (open) {
    if (state.backpackTab === 'catch' && state.selectedFish < 0 && state.fishHold.length) {
      state.selectedFish = 0;
    }
    renderBackpack();
  } else {
    bpBoatStage?.setActive(false);
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
  if (tab !== 'slots') bpBoatStage?.setActive(false);

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
        sfx.uiClick();
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
    bpBoatStage?.setActive(true);
    bpBoatStage?.sync(state.slots, selectedBoat, state.selectedSlot);
  } else {
    const baitKey = BAIT_KINDS[state.inventory.baitKind]?.key || 'baitFresh';
    const baitName = BAIT_KINDS[state.inventory.baitKind]?.name || '鱼饵';
    const supplies = [
      { id: 'bait', portraitId: baitKey, name: baitName, count: state.inventory.bait, color: 0x7dffc0,         desc: tut.active ? '练习湾饵无限，不消耗。' : (BAIT_KINDS[state.inventory.baitKind]?.desc || '抛竿耗 1。') },
      { id: 'plank', name: '木板', count: state.inventory.plank, color: 0xc48a4a, desc: 'R +15 耐久。占背包 1 格。' },
      { id: 'repair', name: '修补剂', count: state.inventory.repair, color: 0xffd24a, desc: '+25 耐久。可与龙骨膏同带。' },
      { id: 'paste', name: '龙骨膏', count: state.inventory.paste || 0, color: 0xc45c1a, desc: '+45 耐久。大修。' },
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
  btn.style.setProperty('--tilt', '0deg');

  if (!item) {
    btn.innerHTML = `<div class="bp-polaroid"><div class="bp-thumb"></div><div class="bp-cell-name">—</div></div>`;
    return btn;
  }

  const rarity = item.rarity || 1;
  const name = kind === 'supply' ? `${item.name}×${item.count}` : item.name;
  let thumbInner;
  if (kind === 'supply') {
    try {
      const src = getItemPortrait(item.portraitId || item.id);
      thumbInner = `<img class="bp-thumb-fish" src="${src}" alt="" draggable="false" />`;
    } catch (_) {
      const color = hexColor(item.color);
      thumbInner = `<div class="bp-thumb-blob" style="background:${color}"></div>`;
    }
  } else if (item.defId) {
    try {
      const src = getFishPortrait(item.defId, item);
      thumbInner = `<img class="bp-thumb-fish" src="${src}" alt="" draggable="false" />`;
    } catch (_) {
      const color = hexColor(item.color ?? getFishDef(item.defId || 'food').color);
      thumbInner = `<div class="bp-thumb-blob" style="background:${color}"></div>`;
    }
  } else {
    const color = hexColor(item.color ?? 0x7dffc0);
    thumbInner = `<div class="bp-thumb-blob" style="background:${color}"></div>`;
  }
  const fam = item.defId ? familyOf(item.defId) : null;
  const familyChip = fam
    ? `<span class="bp-family-chip fam-${fam.id}" style="--fam:${fam.color}">${fam.name}</span>`
    : '';
  btn.innerHTML = `
    <span class="bp-tape top"></span>
    ${badge ? `<span class="bp-slot-badge">${badge}</span>` : ''}
    ${familyChip}
    <div class="bp-polaroid">
      <div class="bp-thumb">${thumbInner}</div>
      <div class="bp-cell-name">${name}</div>
      <div class="bp-rarity-bar r${rarity}"></div>
    </div>`;
  if (onClick) btn.onclick = (e) => { sfx.uiClick(); onClick(e); };
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
      tagline: `${categoryLabel(def.category)} · ${rarityStars(f.rarity || 1)}${familyLabel(def) ? ` · ${familyLabel(def)}` : ''}`,
      desc: fishBlurb(def),
      meta: [
        def.slot ? `只能绑在：${SLOT_LABELS[def.slot]}（其他槽位不可用）` : '不可绑槽（食用/修理/投喂）',
        familyLabel(def) ? `族共鸣：${familyLabel(def)}（同族双装激活）` : '',
        `活性参考：${Math.floor(f.vitality ?? 100)}`,
      ].filter(Boolean).join('<br>'),
      showSlots: !!def.slot,
      fish: f,
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
      tagline: `已绑定 · ${categoryLabel(def.category)}${familyLabel(def) ? ` · ${familyLabel(def)}` : ''}`,
      desc: fishBlurb(def),
      meta: `活性${Math.floor(f.vitality ?? 0)} / 100<br>${familyLabel(def) ? `族：${familyLabel(def)}（同族双装共鸣）<br>` : ''}力竭后会自动脱落回海里。`,
      showSlots: false,
      fish: f,
      actions: { discard: false, eat: false, equip: false, feed: false, use: false },
    });
  } else if (tab === 'supplies' && state.selectedSupply) {
    show = true;
    const map = {
      bait: {
        name: BAIT_KINDS[state.inventory.baitKind]?.name || '鱼饵',
        color: 0x7dffc0,
        desc: tut.active ? '练习湾饵无限，不消耗。' : (BAIT_KINDS[state.inventory.baitKind]?.desc || '抛竿耗 1。'),
        count: tut.active ? '∞' : state.inventory.bait,
      },
      plank: { name: '木板', color: 0xc48a4a, desc: 'R +15 耐久。占背包 1 格。', count: state.inventory.plank },
      repair: { name: '修补剂', color: 0xffd24a, desc: '+25 耐久。可与龙骨膏同带。', count: state.inventory.repair },
      paste: { name: '龙骨膏', color: 0xc45c1a, desc: '+45 耐久。大修。', count: state.inventory.paste || 0 },
    };
    const s = map[state.selectedSupply];
    const canUse = state.selectedSupply === 'plank' || state.selectedSupply === 'repair' || state.selectedSupply === 'paste';
    fillDetail({
      name: s.name,
      serial: `库存 ×${s.count}`,
      color: s.color,
      itemId: state.selectedSupply === 'bait'
        ? (BAIT_KINDS[state.inventory.baitKind]?.key || 'baitFresh')
        : state.selectedSupply,
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

function fillDetail({ name, serial, color, defId, itemId, rarity, ribbon, tagline, desc, meta, showSlots, actions, fish }) {
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
      img.src = defId ? getFishPortrait(defId, fish) : getItemPortrait(itemId);
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
  if (id === 'bait') {
    if (!takeBaitFromInventory()) return showToast('没有可丢弃的物资');
    updateInv();
    showToast('丢弃鱼饵');
    if (state.inventory.bait <= 0) state.selectedSupply = null;
    renderBackpack();
    return;
  }
  if (!id || !(state.inventory[id] > 0)) return showToast('没有可丢弃的物资');
  const names = { bait: '鱼饵', plank: '木板', repair: '修补剂', paste: '龙骨膏' };
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
  } else if (id === 'paste') {
    state.inventory.paste--;
    repairHull(hull, 45);
    sfx.repair();
    updateHp();
    updateInv();
    showToast('使用龙骨膏：船体 +45');
  }
  if (state.inventory[id] <= 0) state.selectedSupply = null;
  renderBackpack();
}

function eatOrRepair() {
  const f = state.fishHold[state.selectedFish];
  if (!f) return showToast('先选鱼');
  const def = getFishDef(f.defId);
  const eat = f.eat || def.eat || {};
  state.fishHold.splice(state.selectedFish, 1);
  state.selectedFish = -1;
  if (def.id === 'glue' || eat.glue) {
    repairHull(hull, eat.heal || 15);
    sfx.repair();
    showToast(`${f.name}：修理 +${eat.heal || 15}`);
  } else if (def.category === 'food') {
    if (eat.haste) {
      state.speedBuffUntil = now() + eat.haste;
      showToast(`${f.name}：加速 ${eat.haste} 秒`);
    } else {
      const heal = eat.heal || 20;
      repairHull(hull, heal);
      sfx.repair();
      showToast(`${f.name}：+${heal} 耐久`);
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
    if (s === 'bow') {
      let cdEl = el.querySelector('.slot-cd');
      if (!cdEl) {
        cdEl = document.createElement('span');
        cdEl.className = 'slot-cd hidden';
        el.appendChild(cdEl);
      }
      const canRam = !!(state.slots.bow && (getFishDef(state.slots.bow.defId)?.effect?.ramMul
        || getFishDef(state.slots.bow.defId)?.effect?.ramDmg));
      const show = state.started && state.ramCd > 0 && canRam;
      if (show) {
        cdEl.textContent = String(Math.ceil(state.ramCd));
        cdEl.classList.remove('hidden');
        el.classList.add('on-cd');
      } else {
        cdEl.classList.add('hidden');
        el.classList.remove('on-cd');
      }
    }
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
  const fams = b.families || [];
  const key = fams.map((f) => f.id).join(',');
  if (key !== lastFamilyKey) {
    const gained = fams.filter((f) => !lastFamilyKey.split(',').includes(f.id));
    lastFamilyKey = key;
    familyVfx.sync(fams.map((f) => f.id));
    for (const f of gained) {
      if (f.id) showToast(`\u5171\u9e23\uff1a${f.name} \u00b7 ${f.tip}`);
    }
  } else {
    familyVfx.sync(fams.map((f) => f.id));
  }
  if (fams.length) setPrompt(ui.comboHint, `\u5171\u9e23\uff1a${fams.map((c) => c.name).join(' \u00b7 ')}`);
  else setPrompt(ui.comboHint, '');
}

function tryJump() {
  if (!bonuses().hasBounce) return showToast('需要船底弹跳鱼');
  if (now() < state.jumpUntil - 0.5) return;
  state.jumpUntil = now() + 1.0;
  state.invulnUntil = now() + 1.0;
  if ((bonuses().families || []).some((f) => f.id === 'tide')) {
    state.invulnUntil = now() + 1.25;
    familyVfx.pulse('tide');
  }
  showToast('弹跳！');
}

function finishRun(outcome) {
  setBackpackOpen(false);
  setSeaMapOpen(false);
  state.started = false;
  tut.active = false;
  tut.dismissed = true;
  tutMarker.visible = false;
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
      : '沉船：海图碎片 0 · 活鱼不入库';
  const hullNote = lostHull ? ` · ${HULL_NAMES[lostHull] || lostHull}已沉没，需在市集重买` : '';
  const stats = `航行 ${dist} 米 · 改装 ${state.mods} · 击杀 ${state.kills} · 海图碎片 +${gain}${hullNote}
${storeNote}`;
  if (ui.settleTitle) ui.settleTitle.textContent = title;
  if (ui.settleStats) ui.settleStats.textContent = stats;
  ui.sinkStats.textContent = stats;
  if (ui.btnRetry) {
    ui.btnRetry.textContent = wasTutorial && !success
      ? '\u56de\u6e2f\u53e3\u770b\u770b'
      : '\u8fd4\u56de\u57fa\u5730';
  }
  if (ui.btnSettleHub) {
    ui.btnSettleHub.textContent = wasTutorial && success
      ? '\u8fdb\u5165\u6e2f\u53e3'
      : '\u8fd4\u56de\u57fa\u5730';
  }
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

function maybeHubIntro() {
  if (!meta.tutorialDone || meta.hubIntroDone) return;
  meta = { ...meta, hubIntroDone: true };
  saveMeta(meta);
  const lines = [
    '\u6574\u5907\uff1a\u7ed1\u9c7c\u3001\u643a\u5e26\u997c\u4e0e\u4fee\u7406',
    '\u4ed3\u5e93\uff1a\u5b58\u9c7c\u4e0e\u7269\u8d44',
    '\u5e02\u96c6\uff1a\u7528\u6d77\u56fe\u788e\u7247\u4e70\u4e1c\u897f',
    '\u51fa\u6e2f\uff1a\u6d45\u6ee9\u514d\u8d39\uff0c\u540e\u7eed\u6d77\u57df\u6bcf\u5c40\u6263\u95e8\u7968',
  ];
  lines.forEach((msg, i) => setTimeout(() => showToast(msg), 450 + i * 2300));
}

function openHub() {
  phase = 'hub';
  state.started = false;
  camInit = false;
  setSeaMapOpen(false);
  ui.sinkModal.classList.add('hidden');
  ui.settleModal?.classList.add('hidden');
  ui.lighthouseModal?.classList.add('hidden');
  if (!meta.tutorialDone) startZone = -1;
  setWorldMode('hub');
  hub?.show();
  maybeHubIntro();
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
  const isTut = (startZone | 0) === -1;
  if (!fromCheckpoint && !isTut) {
    const gate = canDepartZone(meta, startZone);
    if (!gate.ok) {
      showToast(gate.msg);
      startZone = -1;
      return;
    }
    const ticket = chargeZoneTicket(meta, startZone);
    if (!ticket.ok) {
      showToast(ticket.msg);
      return;
    }
    meta = ticket.meta;
    if (ticket.cost > 0) showToast(ticket.msg);
  }
  setBackpackOpen(false);
  setSeaMapOpen(false);
  hub?.hide();
  setWorldMode('play');
  phase = 'run';
  sfx.setBgmTheme(startZone);
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
  if (!fromCheckpoint) {
    state.runSkills = isTut
      ? ['skillFrost', 'skillStorm', 'skillMeteor']
      : equippedSkills(meta);
  } else if (!Array.isArray(state.runSkills) || !state.runSkills.length) {
    state.runSkills = equippedSkills(meta);
  }
  state.runDistance = fromCheckpoint ? state.runDistance : 0;
  state.maxZ = paddle.state.z;
  state.zone = startZone;
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
      state.inventory = {
        baitBag: Array(99).fill('crude'),
        bait: 99,
        baitKind: 'crude',
        plank: 1,
        repair: 1,
        paste: 0,
      };
      state.selectedFish = -1;
      syncDeckFish(boat, state.fishHold, gradientMap);
    } else {
      if (!loadoutSuppliesPacked(meta.loadout?.supplies)) {
        meta = syncLoadoutSuppliesFromWarehouse(meta);
      }
      applyLoadoutToRun(boat, state, meta, gradientMap);
      meta = consumeLoadoutOnDepart(meta);
      if (meta.unlocks.cursedBoat) {
        const lv = talentLevel(meta, 'cursedBoat');
        const baitKind = state.inventory.baitKind || 'fresh';
        const grant = (fish) => {
          state.fishHold.push(fish);
          const disc = discoverFish(meta, [fish.defId]);
          meta = disc.meta;
          if (disc.newIds.length) runNewFish += disc.newIds.length;
        };
        let f = pickFishForZone(Math.max(0, startZone), baitKind);
        if (lv >= 2) {
          const empty = SLOT_ORDER.find((s) => !state.slots[s]);
          if (empty) {
            for (let i = 0; i < 10; i++) {
              const t = pickFishForZone(Math.max(0, startZone), 'scale');
              if (t.slot === empty) { f = t; break; }
            }
          }
        }
        grant(f);
        if (lv >= 3) {
          const extraIds = ['icefish', 'jellyfish', 'seaSnake', 'coral', 'dive', 'storm'];
          const id = extraIds[Math.floor(Math.random() * extraIds.length)];
          const def = getFishDef(id);
          grant({
            kind: 'fish', defId: id, name: def.name, slot: def.slot, category: def.category,
            rarity: def.rarity, color: def.color, vitality: 100,
          });
        }
      }
    }
  } else {
    state.checkpointUsed = true;
  }
  state.shellBlocks = 0;
  state.ramCd = 0;
  lastFamilyKey = '';
  familyVfx.sync([]);
  skillCdUntil[0] = skillCdUntil[1] = skillCdUntil[2] = 0;
  refreshWeaponChips();
  skillVfx.clear();
  ui.sinkModal.classList.add('hidden');
  ui.settleModal?.classList.add('hidden');
  ui.lighthouseModal?.classList.add('hidden');

  const loaded = seaWorld.load(startZone, scene, gradientMap, water);
  seaWorld.scatterProps(vortices, flotsam);
  applyZoneVisual(getZone(0, startZone));
  hazards.spawnScattered({
    count: combatCountForZone(startZone),
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
        ? '练习湾：安全教学'
        : `进入 ${loaded.name} · A/D 划桨 · 灯塔圈内停留 ${EVAC_HOLD} 秒归航`
  );
}

function applyZoneVisual(z) {
  const biome = getSeaBiome(z.id);
  scene.fog.color.setHex(biome.fog);
  scene.background.setHex(biome.sky);
  scene.fog.near = biome.fogNear;
  scene.fog.far = biome.fogFar;
  setWaterColor(water, biome.water);
  tintVortexField(vortices, biome.water);
  hemiLight.color.setHex(biome.hemiSky);
  hemiLight.groundColor.setHex(biome.hemiGround);
  hemiLight.intensity = biome.hemiIntensity;
  sun.color.setHex(biome.sun);
  sun.intensity = biome.sunIntensity;
  ambLight.color.setHex(biome.ambient);
  duskSky.userData.setBiome?.(biome);
  duskSun.userData.setBiome?.(biome);
  worldClouds.userData.setBiome?.(biome);
  weatherFx.setPreset(biome);
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
      if ((map.id | 0) === -1) return `安全教学 · 灯塔绿圈停 ${EVAC_HOLD} 秒归航 · M 关闭`;
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
      ? `安全教学 · 灯塔绿圈停 ${EVAC_HOLD} 秒归航`
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
    return setPrompt(ui.prompt, `灯塔归航 · 再停 ${ev.remain.toFixed(1)} 秒`);
  }
  if (tut.active) return; // tickTutorialGuide owns the prompt after cards
  if (fishing.phase === 'qte') return setPrompt(ui.prompt, '空格 — 停在绿区');
  if (fishing.phase === 'cast') return setPrompt(ui.prompt, '甩竿…');
  if (fishing.phase === 'wait') {
    return setPrompt(ui.prompt, '把浮漂靠近水圈');
  }
  if (findNearestFlotsam(flotsam, boatPos(), 7)) return setPrompt(ui.prompt, 'E 打捞');
  setPrompt(ui.prompt, `开进灯塔绿圈，停 ${EVAC_HOLD} 秒归航`);
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
    if (!lh.visible) continue;
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
  if (tut.active && !tut.dismissed && tut.step !== 3) {
    const target = tutTargetForStep(tut.step);
    if (target) {
      const mx = cx + (target.x - paddle.state.x) * scale;
      const my = cy - (target.z - paddle.state.z) * scale;
      if (mx > 2 && mx < w - 2 && my > 2 && my < h - 2) {
        const pulse = 7 + Math.sin(performance.now() * 0.006) * 2;
        ctx.strokeStyle = '#7dffc0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mx, my, pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(mx - 5, my);
        ctx.lineTo(mx + 5, my);
        ctx.moveTo(mx, my - 5);
        ctx.lineTo(mx, my + 5);
        ctx.stroke();
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
    }, 34);
    legendFx.voltCd = t + 5.2;
    if (hits.killed) showToast(`电棘击沉 ×${hits.killed}`);
    else if (hits.length) showToast(`电棘命中 ×${hits.length}`);
  }

  if (slotHas('tarWhip') && t >= legendFx.tarCd) {
    let tarKilled = false;
    const e = hazards.rootNearest(boatPos(), 2.8, clockT, 15, 18, (id) => {
      tarKilled = true;
      state.kills++;
      registerMonster(id);
    });
    if (e) {
      legendFx.tarCd = t + 6.2;
      legendFx.tarDragUntil = t + 2.8;
      showToast(tarKilled ? '焦油击沉！' : '焦油定身！');
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
    if (legendFx.trail.length) {
      hazards.disperseNearPoints(legendFx.trail, 2.3, clockT, 8, dt, (id) => {
        state.kills++;
        registerMonster(id);
      });
    }
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

    let corrMul = (zone.corrosionMul ?? 1) * (b.corrosionMul ?? 1);
    if (meta.unlocks.ghostWake) corrMul *= ghostWakeCorrMul(meta);
    if (slotHas('magmaMaw')) corrMul *= 1.18;
    if (now() < legendFx.heatPumpUntil) corrMul *= 1.7;
    if (!Number.isFinite(corrMul)) corrMul = 1;
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
    const roll = Number.isFinite(hull.durability) && Number.isFinite(hull.maxDurability) && hull.maxDurability > 0
      ? (1 - hull.durability / hull.maxDurability) * 0.15
      : 0;
    boat.rotation.set(
      0,
      phys.yaw + Math.PI,
      roll
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

    if (state.started) {
      if ((b.hasRam || b.hasPuffer) && state.ramCd <= 0) {
        hazards.setHitOpts?.({ from: boatPos(), element: 'storm' });
        const hits = hazards.ramKill(boatPos(), phys.speed, b.ramMul, (id) => {
          state.kills++;
          registerMonster(id);
          showToast('\u649e\u89d2\u51fb\u6c89\uff01');
          if (monsterFx.heatSeal) {
            monsterFx.sealedSlot = null;
            monsterFx.heatSeal = false;
            showToast('\u649e\u51fb\u9707\u98de\u7194\u5ca9\u85e4\u58f6');
          }
        }, b.ramDmg || 12);
        if (hits > 0) {
          sfx.ramHit();
          state.ramCd = b.ramCd || 3.4;
          if ((b.families || []).some((f) => f.id === 'rift')) familyVfx.pulse('rift');
        }
      }
      if (state.ramCd > 0) state.ramCd -= dt;
    }
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
            legendFx.chainCd = now() + 2.8;
            hazards.stunEnemy(next, t + 1.35);
            const chained = hazards.blastRadius(next.position, 2.4, (id2) => {
              state.kills++;
              registerMonster(id2);
            }, 20);
            showToast(chained ? '雷核连锁击沉！' : '雷核连锁！');
          }
        }
        if (id === 'thiefOtter' && monsterFx.stolen) {
          grantBait(monsterFx.stolen.bait || 0, state.inventory.baitKind || 'fresh');
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
        sfx.evacuateSuccess();
        repairHull(hull, hull.maxDurability);
        updateHp();
        showToast('灯塔归航！耐久已回满', 2200);
        finishRun('return');
      },
      cutWrap: equippedRunCard(state.weapon).id === 'thunder',
      blockEvac: tut.active && !tut.dismissed,
      onEvacBlocked: () => {
        const t = performance.now();
        if (t - tut.evacWarnAt > 2500) {
          tut.evacWarnAt = t;
          showToast('\u5148\u5b8c\u6210\u6559\u5b66\u6b65\u9aa4\u624d\u80fd\u5f52\u822a');
        }
      },
    });

    tickTutorialGuide(dt);
    updateEvacHud();
    if (state.started) {
      if (b.hasInk && state.inkCd <= 0) {
        const range = b.shotRange || 8;
        const tgen = hazards.nearestEnemy(boatPos(), range);
        if (tgen) {
          hazards.shootInk(boatPos(), tgen, gradientMap, b.shotDmg || 10);
          state.inkCd = b.shotCd || 1.2;
          state.inkShots++;
          if ((b.families || []).some((f) => f.id === 'ink')) familyVfx.pulse('ink');
          const reloadEvery = getFishDef(state.slots.sideL?.defId)?.side?.reloadEvery;
          if (reloadEvery && state.inkShots >= reloadEvery) {
            showToast('喷墨耗尽，空格附近补墨…');
            state.inkShots = 0;
            state.inkCd = 3;
          }
        }
      }
      if (state.inkCd > 0) state.inkCd -= dt;
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
    // Hit / kill camera shake (decay)
    if (performance.now() < camShake.until && camShake.amp > 0.01) {
      const k = (camShake.until - performance.now()) / 320;
      const a = camShake.amp * Math.max(0, k);
      camera.position.x += (Math.random() - 0.5) * a * 1.4;
      camera.position.y += (Math.random() - 0.5) * a * 0.9;
      camera.position.z += (Math.random() - 0.5) * a * 1.4;
      camShake.amp *= Math.pow(0.08, dt);
    } else {
      camShake.amp = 0;
    }
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
    seaWorld.updateDecor?.(t);
    weatherFx.update(dt, boat.position);
    duskSky.userData.follow?.(boat.position);
    duskSun.userData.follow?.(boat.position);
    worldClouds.userData.follow?.(boat.position);
  } else if (phase === 'hub' && hub?.shipUiOpen) {
    const waterFocus = hubBoatPreview.boat.position;
    updateWater(water, t, waterFocus);
  }
  if (state.seaMapOpen) drawSeaMapOverlay();
  skillVfx.update(dt);
  hitSparks.update(dt);
  hitBursts.update(dt);
  updateWeaponCds();
  bpBoatStage?.tick(t);
  updateFlotsam(flotsam, t);
  updateVortices(vortices, t);
  wake.update(dt);
  familyVfx.update(dt, paddle.state?.speed || 0);
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
        showToast('没有这张技能牌');
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
  const dmg = Number(card.dmg) || 20;
  const element = card.id === 'ice' || card.id === 'glacier'
    ? 'frost'
    : (card.id === 'meteor' || card.id === 'phoenix' ? 'fire' : 'storm');
  hazards.setHitOpts?.({
    from: origin,
    dir: { x: dir.x, z: dir.z },
    element,
  });
  const onKill = (id) => {
    state.kills++;
    registerMonster(id);
  };
  if (card.id === 'ice') {
    const front = extra.front ?? range;
    let killed = 0;
    const stunned = hazards.stunAlongLine(origin, lineYaw, front, card.stun || 1.6, clockT, 3.8, dmg, (id) => {
      killed++;
      onKill(id);
    }, extra.hitEnemies);
    const wraps = hazards.cutWrapsAlongLine(origin, lineYaw, front, 4.5, dmg, extra.hitWraps);
    const wn = noteSkillWraps(wraps);
    if (wn) extra.onWrapToast?.(wn);
    else if (killed) extra.onKillToast?.(killed);
    else if (stunned && extra.announceStun) extra.onStunToast?.(stunned);
    return;
  }
  if (card.id === 'thunder' || card.id === 'void' || card.id === 'phoenix' || card.id === 'beam') {
    const pierce = card.id === 'beam' ? 4 : 2;
    const hits = hazards.pierceLine(origin, lineYaw, range, pierce, onKill, dmg);
    const wraps = hazards.cutWrapsAlongLine(origin, lineYaw, range, 4.5, dmg);
    const wn = noteSkillWraps(wraps);
    const n = (hits.killed || 0) + wn;
    const toast = n ? `${card.name} 击沉 ×${n}` : hits.length ? `${card.name} 命中` : `${card.name}！`;
    if (n || !extra.note?.toasted) {
      showToast(toast);
      if (extra.note) extra.note.toasted = true;
    }
    return;
  }
  const rad = Math.max(0.5, Number(card.radius) || 5);
    const n = hazards.blastRadius(impact, rad, onKill, dmg);
    const wraps = hazards.cutWrapsInRadius(impact, rad + 1, dmg);
    const wn = noteSkillWraps(wraps);
    hazards.shoveWraps(impact, rad + 1);
    if (card.id === 'worldroot') hazards.rootNearest(impact, 2.4, clockT, rad + 2);
    if (card.id === 'glacier') hazards.stunInRadius(impact, rad, 1.8, clockT);
    const toast = n || wn ? `${card.name} 击沉 ×${n + wn}` : `${card.name}！`;
    if (n || wn || !extra.note?.toasted) {
      showToast(toast);
      if (extra.note) extra.note.toasted = true;
    }
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
    showToast('先鼠标选中海面');
    return;
  }
  const dx = hit.x - origin.x;
  const dz = hit.z - origin.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 2.2) {
    showToast('太近了');
    return;
  }
  if (dist > card.range + AIM_HEAD_EXTRA + 0.4) {
    showToast('超出施放范围');
    return;
  }
  const dir = { x: dx / dist, z: dz / dist };
  const range = dist;
  const impact = { x: hit.x, z: hit.z };
  skillCdUntil[state.weapon] = t + card.cd;
  updateWeaponCds();
  sfx.skill();
  if (card.id === 'ice') {
    let iceAnnounced = false;
    const hitEnemies = new Set();
    const hitWraps = new Set();
    skillVfx.cast(card.id, origin, dir, range, {
      onSweep(front) {
        applySkillHit(card, origin, dir, range, impact, {
          front,
          hitEnemies,
          hitWraps,
          announceStun: !iceAnnounced,
          onWrapToast(n) {
            iceAnnounced = true;
            showToast(`霜矛冻断缠绕 ×${n}`);
          },
          onKillToast(n) {
            iceAnnounced = true;
            showToast(`霜矛击沉 ×${n}`);
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
    const note = { toasted: false };
    skillVfx.cast(card.id, origin, dir, range, {
      onImpact: () => applySkillHit(card, origin, dir, range, impact, { note }),
    });
  }
}

canvas.addEventListener('pointerdown', (e) => {
  if (!state.started || state.fishPanelOpen || e.button !== 0) return;
  tryCastSkill();
});

ui.btnFish.onclick = () => { if (!state.fishPanelOpen && !state.lighthouseOpen && !state.seaMapOpen) { sfx.uiClick(); onSpace(); } };
ui.btnSalvage.onclick = () => { if (!state.fishPanelOpen && !state.lighthouseOpen && !state.seaMapOpen) { sfx.uiClick(); trySalvage(); } };
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
ui.btnDiscard.onclick = () => { sfx.uiClick(); discardFish(); };
ui.btnUse.onclick = () => { sfx.uiClick(); useSupply(); };
ui.btnEat.onclick = () => { sfx.uiClick(); eatOrRepair(); };
ui.btnEquip.onclick = () => { sfx.uiClick(); doEquip(); };
ui.btnFeed.onclick = () => { sfx.uiClick(); doFeed(); };
document.querySelectorAll('.bp-tab').forEach((el) => {
  el.onclick = () => {
    sfx.uiClick();
    state.backpackTab = el.dataset.tab;
    state.selectedFish = state.backpackTab === 'catch' && state.fishHold.length
      ? Math.max(0, Math.min(state.selectedFish < 0 ? 0 : state.selectedFish, state.fishHold.length - 1))
      : -1;
    if (state.backpackTab !== 'supplies') state.selectedSupply = null;
    renderBackpack();
  };
});
ui.eventA.onclick = () => { sfx.uiClick(); resolveEvent('a'); };
ui.eventB.onclick = () => { sfx.uiClick(); resolveEvent('b'); };
ui.btnRetry.onclick = () => { sfx.uiClick(); openHub(); };
ui.btnSettleHub?.addEventListener('click', () => { sfx.uiClick(); openHub(); });
ui.btnLhContinue?.addEventListener('click', () => {
  sfx.uiClick();
  state.lighthouseOpen = false;
  ui.lighthouseModal?.classList.add('hidden');
  showToast('继续向深海航行…');
});
ui.btnLhReturn?.addEventListener('click', () => {
  sfx.uiConfirm();
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
  sfx.unlockAudio();
  sfx.uiConfirm();
  sfx.setBgmTheme('cover');
  if (!meta.tutorialDone) {
    startZone = -1;
    startRun(false);
    return;
  }
  if ((startZone | 0) === -1) startZone = 0;
  openHub();
});
if (ui.coverManualBody) ui.coverManualBody.innerHTML = renderManualHtml();

ui.btnCoverTutorial?.addEventListener('click', () => {
  sfx.unlockAudio();
  sfx.uiOpen();
  sfx.setBgmTheme('cover');
  ui.coverTutorial?.classList.remove('hidden');
});
ui.tutGuideNext?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  sfx.uiClick();
  onTutGuideNext();
});
ui.btnTutorialClose?.addEventListener('click', () => {
  sfx.uiClose();
  ui.coverTutorial?.classList.add('hidden');
});
ui.btnCoverQuit?.addEventListener('click', () => {
  sfx.unlockAudio();
  sfx.uiClick();
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
  if (id) {
    sfx.unlockAudio();
    hub?.openSpot(id);
  }
});

document.querySelectorAll('.slot-chip[data-slot]').forEach((el) => {
  el.onclick = () => { sfx.uiClick(); state.selectedSlot = el.dataset.slot; refreshSlots(); };
});
document.querySelectorAll('.weapon-chip').forEach((el) => {
  el.onclick = () => {
    const w = Number(el.dataset.w);
    if (!hasWeaponUnlock(meta, w)) {
      sfx.uiDeny();
      showToast('没有这张技能牌');
      return;
    }
    sfx.uiClick();
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
