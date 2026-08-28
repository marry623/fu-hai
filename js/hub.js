/** Hub UI — backpack desk; 整备=3D船, 出港=海域地图, 仓库=格子 */

import { ZONES } from './zones.js?v=31y';
import { SLOT_ORDER, SLOT_LABELS, ramCdForRarity } from './slots.js?v=39b';
import { getFishDef, FISH_CATALOG, RARITY, listShopBuyFishIds, shopBuyCost, BAIT_KINDS, rarityStars, familyOf, familyLabel } from './fishCatalog.js?v=34b';
import { getFishPortrait } from './fishPortrait.js?v=31c';
import { getItemPortrait } from './itemPortrait.js?v=37a';
import { getRelicPortrait, relicFaceHtml } from './relicPortrait.js?v=35c';
import { listMonsterIds, getMonsterDef } from './monsterCatalog.js?v=31g';
import { getMonsterPortrait } from './monsterPortrait.js?v=41e';
import {
  SHOP_TABS,
  SHOP_HULLS,
  SHOP_SUPPLIES,
  SHOP_WEAPONS,
  SHOP_TALENTS,
  HULL_NAMES,
  fishSellPrice,
  tryUnlock,
  buySupply,
  buySupplyQty,
  buyWarehouseFish,
  upgradeSkill,
  upgradeTalent,
  skillLevel,
  talentLevel,
  skillUpgradeCost,
  talentUpgradeCost,
  sellWarehouseFish,
  sellWarehouseFishBelowRarity,
  sellWarehouseRelic,
  sellWarehouseRelicsBelowTier,
  appraiseRelic,
  appraiseRelicsBatch,
  relicSellPreview,
  hubFeedFish,
  craftWarehouseFish,
  equipFromWarehouse,
  unequipToWarehouse,
  moveWarehouseToLoadoutCargo,
  returnCargoToWarehouse,
  saveLoadout,
  equippedSkills,
  cycleSkillSlot,
  equippedTalents,
  cycleTalentSlot,
  ownedTalentIds,
  totalBait,
  baitStock,
  setLoadoutBaitKind,
  packSupply,
  packSupplyQty,
  bagRoomForSupply,
  unpackSupply,
  LOADOUT_BAG_SIZE,
  zoneTicketCost,
  canDepartZone,
} from './meta.js?v=43m';
import { previewCraftOdds, fmtCraftPct } from './fishCraft.js?v=41c';
import { HUB_SPOTS } from './hubIsland.js?v=43l';
import { renderManualHtml } from './hubManual.js?v=41f';
import * as sfx from './audio.js?v=33f';
import {
  APPRAISE_COST,
  listRelicIds,
  getRelicDef,
  tierLabel,
} from './salvageTables.js?v=35e';
import { openAppraiseScratch } from './appraiseReveal.js?v=39n';

const TAB_TITLES = {
  prep: '整备',
  warehouse: '仓库',
  depart: '出港',
  shop: '商店',
  blackmarket: '黑市',
  codex: '图鉴',
  library: '图书馆',
};

const SHIP_TABS = new Set(['prep', 'warehouse', 'depart']);
const CLIP_KEYS = ['prep', 'warehouse', 'depart', 'shop', 'blackmarket', 'codex', 'library'];
const FEATURE_LABELS = {
  none: '初始海域',
  current: '水流会推船',
  fog: '能见度低',
  lightning: '雨与闪光',
  heat: '腐蚀极快',
  tutorial: '安全教学',
};

/** Left 1–3 / Right 4–6 — avoids crossing leader lines */
const CALLOUT_LAYOUT = {
  bow:   { x: 12, y: 26, n: 1, side: 'L' },
  sideL: { x: 12, y: 54, n: 2, side: 'L' },
  keel:  { x: 12, y: 82, n: 3, side: 'L' },
  sail:  { x: 78, y: 14, n: 4, side: 'R' },
  sideR: { x: 78, y: 48, n: 5, side: 'R' },
  stern: { x: 78, y: 82, n: 6, side: 'R' },
};

function listFishIds() {
  return Object.keys(FISH_CATALOG);
}

/**
 * @param {object} deps
 */
export function createHub(deps) {
  const root = document.getElementById('hub-overlay');
  const els = {
    frags: document.getElementById('hub-frags'),
    best: document.getElementById('hub-best'),
    drawerFrags: document.getElementById('hub-drawer-frags'),
    drawerBest: document.getElementById('hub-drawer-best'),
    matMeta: document.getElementById('hub-mat-meta'),
    zones: document.getElementById('hub-zones'),
    boats: document.getElementById('hub-boats'),
    cargo: document.getElementById('hub-cargo'),
    warehouse: document.getElementById('hub-warehouse'),
    supplies: document.getElementById('hub-supplies'),
    shop: document.getElementById('hub-shop'),
    prepSlots: document.getElementById('hub-prep-slots'),
    backpack: document.getElementById('hub-backpack'),
    departSummary: document.getElementById('hub-depart-summary'),
    codex: document.getElementById('hub-codex'),
    codexSwitch: document.getElementById('codex-switch'),
    codexList: document.getElementById('codex-list'),
    codexPortrait: document.getElementById('codex-portrait'),
    codexSerial: document.getElementById('codex-serial'),
    codexName: document.getElementById('codex-name'),
    codexTag: document.getElementById('codex-tag'),
    codexDesc: document.getElementById('codex-desc'),
    centerCodex: document.getElementById('hub-center-codex'),
    boatStage: document.getElementById('hub-boat-stage'),
    callouts: document.getElementById('hub-callouts'),
    calloutLines: document.getElementById('hub-callout-lines'),
    mapStage: document.getElementById('hub-map-stage'),
    mapCanvas: document.getElementById('hub-map-canvas'),
    warehouseStage: document.getElementById('hub-warehouse-stage'),
    shopStage: document.getElementById('hub-shop-stage'),
    blackmarketStage: document.getElementById('hub-blackmarket-stage'),
    blackmarket: document.getElementById('hub-blackmarket'),
    bmDetail: document.getElementById('hub-bm-detail'),
    libraryStage: document.getElementById('hub-library-stage'),
    libraryBody: document.getElementById('hub-library-body'),
    shipTabs: [...document.querySelectorAll('.hub-ship-tab')],
    codexTabsWrap: document.getElementById('codex-switch'),
    clipPanels: {
      prep: document.getElementById('hub-fs-left-prep'),
      warehouse: document.getElementById('hub-fs-left-warehouse'),
      depart: document.getElementById('hub-fs-left-depart'),
      shop: document.getElementById('hub-fs-left-shop'),
      blackmarket: document.getElementById('hub-fs-left-blackmarket'),
      codex: document.getElementById('hub-fs-left-codex'),
      library: document.getElementById('hub-fs-left-library'),
    },
    markers: document.getElementById('hub-markers'),
    drawer: document.getElementById('hub-drawer'),
    drawerCard: document.querySelector('.hub-drawer-card'),
    drawerTitle: document.getElementById('hub-drawer-title'),
    mat: document.getElementById('hub-fs-center'),
    btnClose: document.getElementById('hub-drawer-close'),
    btnDepart: document.getElementById('btn-depart'),
  };

  let tab = 'depart';
  let drawerOpen = false;
  let selectedCodexId = null;
  let codexTab = 'fish';
  let selectedMonsterId = null;
  let shopTab = 'sell';
  let shopSellTab = 'fish';
  let bmSelected = -1;
  let shopSupplyZone = 'bait';
  let warehouseTab = 'fish';
  let hubCraftSlots = [null, null, null, null];
  let hubCraftPreview = null;
  let hubCraftPreviewTimer = 0;
  /** Prep callout bind picker: target slot id, or null when closed */
  let bindPickSlot = null;
  /** Warehouse qty dialog: { mode:'buy'|'pack', id } or null */
  let whQtyDlg = null;
  let shopDetail = null;

  if (els.libraryBody) els.libraryBody.innerHTML = renderManualHtml();

  if (els.markers) {
    els.markers.innerHTML = HUB_SPOTS.map((s) => `
      <button type="button" class="hub-marker" data-hub-spot="${s.id}" style="--spot:${s.color}">
        <strong>${s.label}</strong>
        <span>${s.sub}</span>
      </button>
    `).join('');
    els.markers.querySelectorAll('[data-hub-spot]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openSpot(btn.dataset.hubSpot);
      });
    });
  }

  function isShipTab(id = tab) {
    return SHIP_TABS.has(id);
  }

  function show() {
    root?.classList.remove('hidden');
    const meta = deps.getMeta();
    if (!meta?.tutorialDone) deps.setStartZone?.(-1);
    closeDrawer();
    render();
    deps.onHubShow?.();
  }

  function hide() {
    root?.classList.add('hidden');
    closeDrawer();
    deps.onHubHide?.();
  }

  function openSpot(id) {
    const wasDrawer = drawerOpen;
    setTab(id);
    openDrawer();
    if (wasDrawer) sfx.uiClick();
    else sfx.uiOpen();
    deps.onSpotOpen?.(id);
  }

  function openDrawer() {
    drawerOpen = true;
    els.drawer?.classList.remove('hidden');
    root?.classList.add('drawer-open');
    refreshCenter();
  }

  function closeDrawer() {
    const was = drawerOpen;
    closeSlotBindPicker();
    closeWhBuyPop();
    drawerOpen = false;
    els.drawer?.classList.add('hidden');
    root?.classList.remove('drawer-open');
    els.drawer?.classList.remove('is-boat-view');
    deps.boatPreview?.setVisible(false);
    deps.onSpotOpen?.(null);
    if (was) sfx.uiClose();
  }

  function setTab(id) {
    closeSlotBindPicker();
    closeWhBuyPop();
    tab = id;
    const ship = isShipTab(id);
    const showBoat = id === 'prep';
    const showMap = id === 'depart';

    CLIP_KEYS.forEach((k) => {
      els.clipPanels[k]?.classList.toggle('hidden', k !== id);
    });

    els.shipTabs.forEach((b) => {
      b.classList.toggle('hidden', !ship && id !== 'shop');
      b.classList.toggle('active', b.dataset.hubNav === id);
    });
    if (id === 'shop' || id === 'blackmarket' || id === 'codex' || id === 'library') {
      els.shipTabs.forEach((b) => b.classList.add('hidden'));
    }
    els.codexTabsWrap?.classList.toggle('hidden', id !== 'codex');

    els.boatStage?.classList.toggle('hidden', !showBoat);
    els.mapStage?.classList.toggle('hidden', !showMap);
    els.warehouseStage?.classList.toggle('hidden', id !== 'warehouse');
    els.centerCodex?.classList.toggle('hidden', id !== 'codex');
    els.shopStage?.classList.toggle('hidden', id !== 'shop');
    els.blackmarketStage?.classList.toggle('hidden', id !== 'blackmarket');
    els.libraryStage?.classList.toggle('hidden', id !== 'library');

    els.drawer?.classList.toggle('is-boat-view', drawerOpen && showBoat);
    els.drawerCard?.classList.toggle('is-ship', ship);
    els.drawerCard?.classList.toggle('is-catalog', id === 'shop' || id === 'blackmarket' || id === 'codex');
    els.drawerCard?.classList.toggle('is-library', id === 'library');
    els.drawerCard?.classList.remove('hub-sea-gold');
    els.mat?.classList.toggle('is-boat', showBoat);

    if (els.drawerTitle) {
      if (id === 'codex') {
        els.drawerTitle.textContent = codexTab === 'monster' ? '怪物图鉴'
          : codexTab === 'relic' ? '宝物图鉴' : '鱼种图鉴';
      } else {
        els.drawerTitle.textContent = TAB_TITLES[id] || id;
      }
    }
    if (els.matMeta) {
      els.matMeta.textContent = id === 'prep'
        ? '配装预览'
        : id === 'warehouse'
          ? (warehouseTab === 'craft' ? '合成台' : warehouseTab === 'relics' ? '宝物' : '鱼获')
            : id === 'depart'
            ? '海域全貌'
            : id === 'library'
              ? '手册'
              : (id === 'codex' ? '图鉴' : id === 'blackmarket' ? '鉴宝' : '商店');
    }

    els.markers?.querySelectorAll('[data-hub-spot]').forEach((m) => {
      const spot = m.dataset.hubSpot;
      m.classList.toggle('active', drawerOpen && spot === id);
    });

    render();
    refreshCenter();
  }

  function refreshCenter() {
    const preview = deps.boatPreview;
    const showBoat = drawerOpen && tab === 'prep';
    els.drawer?.classList.toggle('is-boat-view', showBoat);
    els.mat?.classList.toggle('is-boat', showBoat);
    preview?.setVisible(!!showBoat);
    if (showBoat) {
      preview?.syncLoadout?.(deps.getMeta());
      renderCallouts(deps.getMeta());
    } else if (els.calloutLines) {
      els.calloutLines.innerHTML = '';
    }
    if (drawerOpen && tab === 'depart') {
      requestAnimationFrame(() => deps.drawHubMap?.(els.mapCanvas));
    }
  }

  function stars(n) {
    return '★'.repeat(Math.max(1, Math.min(5, n || 1)));
  }

  function render() {
    const meta = deps.getMeta();
    if (els.frags) els.frags.textContent = String(meta.fragments);
    if (els.best) els.best.textContent = `${meta.bestDistance || 0}m`;
    if (els.drawerFrags) els.drawerFrags.textContent = String(meta.fragments);
    if (els.drawerBest) els.drawerBest.textContent = `${meta.bestDistance || 0}m`;

    const hint = root?.querySelector('.hub-island-hint');
    if (hint) {
      hint.textContent = meta.tutorialDone
        ? '点击建筑进入功能 · 港口出港 · 轮轴整备 · 市集商店 · 黑市鉴宝 · 属性图鉴 · 图书馆教程'
        : '先完成练习湾归航才能出浅滩。可先看市集、仓库、整备与图书馆。';
    }
    renderDepartSummary(meta);
    ensureWarehouseChrome();
    renderLoadoutBackpack(meta, els.backpack);
    renderLoadoutBackpack(meta, document.getElementById('hub-wh-backpack'));
    renderZones(meta);
    renderCargo(meta);
    renderWarehouse(meta);
    renderShop(meta);
    renderBlackMarket(meta);
    renderCodex(meta);
    if (drawerOpen && tab === 'prep') renderCallouts(meta);
  }

  function ensureWarehouseChrome() {
    if (els.warehouseStage && !els.warehouseStage.querySelector('#hub-wh-tabs') && els.warehouse) {
      const nav = document.createElement('div');
      nav.id = 'hub-wh-tabs';
      nav.className = 'hub-shop-tabs';
      els.warehouseStage.insertBefore(nav, els.warehouse);
    }
    const panel = els.clipPanels.warehouse;
    if (panel && !panel.querySelector('#hub-wh-backpack')) {
      panel.replaceChildren();
      const h = document.createElement('h3');
      h.className = 'hub-clip-h';
      h.textContent = '携带背包';
      const list = document.createElement('div');
      list.id = 'hub-wh-backpack';
      list.className = 'hub-backpack-list';
      list.setAttribute('aria-label', '携带物资与改装');
      panel.append(h, list);
    }
  }

  function ensureWhQtyPop() {
    if (!els.warehouseStage) return null;
    let pop = els.warehouseStage.querySelector('#hub-wh-buy-pop');
    if (!pop) {
      pop = document.createElement('div');
      pop.id = 'hub-wh-buy-pop';
      pop.className = 'hub-wh-buy-pop hidden';
      pop.setAttribute('role', 'dialog');
      els.warehouseStage.appendChild(pop);
    }
    return pop;
  }

  function closeWhBuyPop() {
    whQtyDlg = null;
    const pop = els.warehouseStage?.querySelector('#hub-wh-buy-pop');
    if (pop) {
      pop.classList.add('hidden');
      pop.innerHTML = '';
      pop.removeAttribute('aria-label');
    }
  }

  function clampInt(v, lo, hi) {
    const n = Number(v);
    if (!Number.isFinite(n)) return lo;
    return Math.max(lo, Math.min(hi, Math.round(n)));
  }

  function wireWhQtyControls(pop, max, onChange) {
    const range = pop.querySelector('[data-wh-qty-range]');
    const num = pop.querySelector('[data-wh-qty-num]');
    const sync = (raw, from) => {
      const v = clampInt(raw, 1, max);
      if (range) range.value = String(v);
      if (num && from !== 'num') num.value = String(v);
      if (num && from === 'num') num.value = String(v);
      onChange(v);
      return v;
    };
    range?.addEventListener('input', () => sync(range.value, 'range'));
    num?.addEventListener('input', () => sync(num.value, 'num'));
    num?.addEventListener('change', () => sync(num.value, 'num'));
    sync(1, 'init');
  }

  function openWhBuyPop(supplyId) {
    const item = SHOP_SUPPLIES.find((s) => s.id === supplyId);
    const pop = ensureWhQtyPop();
    if (!item || !pop) return;
    const meta = deps.getMeta();
    const frags = meta.fragments | 0;
    const maxPacks = Math.max(0, Math.min(99, Math.floor(frags / item.cost)));
    if (maxPacks <= 0) {
      deps.toast('海图碎片不足');
      sfx.uiDeny();
      return;
    }
    whQtyDlg = { mode: 'buy', id: supplyId };
    pop.setAttribute('aria-label', `购买${item.name}`);
    pop.classList.remove('hidden');
    const paint = (packs) => {
      const totalCost = item.cost * packs;
      const units = item.amount * packs;
      const priceEl = pop.querySelector('[data-wh-qty-price]');
      const bodyEl = pop.querySelector('[data-wh-qty-body]');
      const go = pop.querySelector('[data-wh-buy-confirm]');
      if (priceEl) priceEl.textContent = `${totalCost} 海图碎片 · 入手 ×${units} · 余额 ${frags}`;
      if (bodyEl) {
        bodyEl.textContent = `每份 ${item.cost} 碎片 → ×${item.amount}。购入后尽量装入携带背包。`;
      }
      if (go) {
        go.disabled = packs < 1 || totalCost > frags;
        go.textContent = go.disabled ? '碎片不足' : `购买 ${packs} 份并装入`;
      }
    };
    pop.innerHTML = `
      <div class="hub-wh-buy-head">
        <strong>购买 ${item.name}</strong>
        <button type="button" class="hub-slot-bind-close" data-wh-buy-close aria-label="关闭">×</button>
      </div>
      <p class="hub-wh-buy-body" data-wh-qty-body></p>
      <div class="hub-wh-qty">
        <label class="hub-wh-qty-label">份数</label>
        <input type="range" class="hub-wh-qty-range" data-wh-qty-range min="1" max="${maxPacks}" value="1" />
        <input type="number" class="hub-wh-qty-num" data-wh-qty-num min="1" max="${maxPacks}" value="1" inputmode="numeric" />
      </div>
      <p class="hub-wh-buy-price" data-wh-qty-price></p>
      <div class="hub-wh-buy-acts">
        <button type="button" class="bp-btn dim" data-wh-buy-close>取消</button>
        <button type="button" class="bp-btn bright" data-wh-buy-confirm>购买并装入</button>
      </div>
    `;
    wireWhQtyControls(pop, maxPacks, paint);
    pop.querySelectorAll('[data-wh-buy-close]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        sfx.uiClose();
        closeWhBuyPop();
      });
    });
    pop.querySelector('[data-wh-buy-confirm]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!whQtyDlg || whQtyDlg.mode !== 'buy') return;
      const id = whQtyDlg.id;
      const packs = clampInt(pop.querySelector('[data-wh-qty-num]')?.value, 1, maxPacks);
      const shopItem = SHOP_SUPPLIES.find((s) => s.id === id);
      const bought = buySupplyQty(deps.getMeta(), id, packs);
      if (!bought.ok) {
        deps.toast(bought.msg);
        sfx.uiDeny();
        return;
      }
      sfx.uiConfirm();
      const room = bagRoomForSupply(bought.meta, id);
      const toPack = Math.min(bought.amount | 0, room);
      if (toPack > 0) {
        const packed = packSupplyQty(bought.meta, id, toPack);
        deps.setMeta(packed.meta);
        deps.toast(`${shopItem?.name || '物资'} 购入 ×${bought.amount}，装入 ${packed.moved}`);
        sfx.uiEquip();
      } else {
        deps.setMeta(bought.meta);
        deps.toast(`${bought.msg}（背包已满，留在仓库）`);
      }
      closeWhBuyPop();
      render();
    });
  }

  function openWhPackPop(supplyId) {
    const item = SHOP_SUPPLIES.find((s) => s.id === supplyId);
    const pop = ensureWhQtyPop();
    if (!item || !pop) return;
    const meta = deps.getMeta();
    const stock = (meta.warehouse?.supplies?.[supplyId] | 0);
    const room = bagRoomForSupply(meta, supplyId);
    const max = Math.min(stock, room);
    if (stock <= 0) {
      openWhBuyPop(supplyId);
      return;
    }
    if (max <= 0) {
      deps.toast('背包已满（8格）');
      sfx.uiDeny();
      return;
    }
    whQtyDlg = { mode: 'pack', id: supplyId };
    pop.setAttribute('aria-label', `携带${item.name}`);
    pop.classList.remove('hidden');
    const paint = (qty) => {
      const priceEl = pop.querySelector('[data-wh-qty-price]');
      const go = pop.querySelector('[data-wh-pack-confirm]');
      if (priceEl) priceEl.textContent = `将装入 ${qty} · 仓库余 ${stock} · 背包还可装 ${room}`;
      if (go) go.textContent = `携带 ${qty}`;
    };
    pop.innerHTML = `
      <div class="hub-wh-buy-head">
        <strong>携带 ${item.name}</strong>
        <button type="button" class="hub-slot-bind-close" data-wh-buy-close aria-label="关闭">×</button>
      </div>
      <p class="hub-wh-buy-body">从仓库装入携带背包，可一次携带多个。</p>
      <div class="hub-wh-qty">
        <label class="hub-wh-qty-label">数量</label>
        <input type="range" class="hub-wh-qty-range" data-wh-qty-range min="1" max="${max}" value="1" />
        <input type="number" class="hub-wh-qty-num" data-wh-qty-num min="1" max="${max}" value="1" inputmode="numeric" />
      </div>
      <p class="hub-wh-buy-price" data-wh-qty-price></p>
      <div class="hub-wh-buy-acts">
        <button type="button" class="bp-btn dim" data-wh-buy-close>取消</button>
        <button type="button" class="bp-btn bright" data-wh-pack-confirm>携带</button>
      </div>
    `;
    wireWhQtyControls(pop, max, paint);
    pop.querySelectorAll('[data-wh-buy-close]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        sfx.uiClose();
        closeWhBuyPop();
      });
    });
    pop.querySelector('[data-wh-pack-confirm]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!whQtyDlg || whQtyDlg.mode !== 'pack') return;
      const id = whQtyDlg.id;
      const qty = clampInt(pop.querySelector('[data-wh-qty-num]')?.value, 1, max);
      const packed = packSupplyQty(deps.getMeta(), id, qty);
      deps.toast(packed.msg);
      if (!packed.ok) {
        sfx.uiDeny();
        return;
      }
      sfx.uiEquip();
      deps.setMeta(packed.meta);
      closeWhBuyPop();
      render();
    });
  }

  function ensureSlotBindPop() {
    if (!els.boatStage) return null;
    let pop = els.boatStage.querySelector('#hub-slot-bind-pop');
    if (!pop) {
      pop = document.createElement('div');
      pop.id = 'hub-slot-bind-pop';
      pop.className = 'hub-slot-bind-pop hidden';
      pop.setAttribute('role', 'dialog');
      pop.setAttribute('aria-label', '选择绑定鱼');
      els.boatStage.appendChild(pop);
    }
    return pop;
  }

  function closeSlotBindPicker() {
    bindPickSlot = null;
    const pop = els.boatStage?.querySelector('#hub-slot-bind-pop');
    if (pop) {
      pop.classList.add('hidden');
      pop.innerHTML = '';
    }
    els.callouts?.querySelectorAll('.hub-callout.selected').forEach((el) => {
      el.classList.remove('selected');
    });
  }

  function positionSlotBindPop(pop, anchorBtn) {
    if (!els.boatStage || !pop || !anchorBtn) return;
    const stage = els.boatStage.getBoundingClientRect();
    const btn = anchorBtn.getBoundingClientRect();
    const side = CALLOUT_LAYOUT[bindPickSlot]?.side || 'L';
    const popW = Math.min(220, Math.max(160, stage.width * 0.38));
    pop.style.width = `${popW}px`;

    let left = side === 'L'
      ? btn.right - stage.left + 8
      : btn.left - stage.left - popW - 8;
    let top = btn.top - stage.top - 4;
    left = Math.max(8, Math.min(left, stage.width - popW - 8));
    top = Math.max(8, Math.min(top, stage.height - 120));
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  }

  function renderSlotBindPicker(meta, anchorBtn) {
    const pop = ensureSlotBindPop();
    if (!pop || !bindPickSlot) return;
    const slot = bindPickSlot;
    const label = SLOT_LABELS[slot] || slot;
    const fish = meta.warehouse?.fish || [];
    const matches = [];
    fish.forEach((f, i) => {
      const def = getFishDef(f.defId);
      if (def?.slot === slot) matches.push({ f, i, def });
    });

    const cells = matches.map(({ f, i, def }) => {
      let thumb = '';
      try {
        thumb = `<img class="bp-thumb-fish" src="${getFishPortrait(f.defId, f)}" alt="" draggable="false" />`;
      } catch (_) {
        thumb = '<div class="bp-thumb-blob" style="background:#4a90a4"></div>';
      }
      const fam = familyOf(f.defId);
      const famChip = fam
        ? `<span class="bp-family-chip fam-${fam.id}" style="--fam:${fam.color}">${fam.name}</span>`
        : '';
      return `<button type="button" class="hub-slot-bind-cell" data-bind-eq="${i}">
        ${famChip}
        <div class="bp-polaroid hub-slot-bind-polaroid">
          <div class="bp-thumb">${thumb}</div>
          <div class="bp-cell-name">${f.name}</div>
          <div class="bp-rarity-bar r${def.rarity || 1}"></div>
        </div>
      </button>`;
    }).join('');

    const body = matches.length
      ? `<div class="hub-slot-bind-grid">${cells}</div>`
      : `<p class="hub-slot-bind-empty">仓库暂无适合${label}的鱼</p>`;

    pop.innerHTML = `<div class="hub-slot-bind-head">
        <strong>绑到 · ${label}</strong>
        <button type="button" class="hub-slot-bind-close" aria-label="关闭">×</button>
      </div>${body}`;
    pop.classList.remove('hidden');
    positionSlotBindPop(pop, anchorBtn);

    pop.querySelector('.hub-slot-bind-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeSlotBindPicker();
    });
    pop.querySelectorAll('[data-bind-eq]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.dataset.bindEq);
        const r = equipFromWarehouse(deps.getMeta(), idx, slot);
        deps.toast(r.msg || (r.ok ? '已绑槽' : '失败'));
        if (r.ok) {
          sfx.uiEquip();
          deps.setMeta(r.meta);
          closeSlotBindPicker();
          render();
          refreshCenter();
        } else {
          sfx.uiDeny();
        }
      });
    });
  }

  function openSlotBindPicker(slot, anchorBtn) {
    if (bindPickSlot === slot) {
      closeSlotBindPicker();
      return;
    }
    bindPickSlot = slot;
    els.callouts?.querySelectorAll('.hub-callout.selected').forEach((el) => {
      el.classList.remove('selected');
    });
    anchorBtn?.classList.add('selected');
    sfx.uiClick();
    renderSlotBindPicker(deps.getMeta(), anchorBtn);
  }

  function renderCallouts(meta) {
    if (!els.callouts) return;
    const slots = meta.loadout?.slots || {};
    els.callouts.innerHTML = SLOT_ORDER.map((slot) => {
      const lay = CALLOUT_LAYOUT[slot] || { x: 50, y: 50, n: 0 };
      const f = slots[slot];
      const empty = !f?.defId;
      const status = empty ? '可绑' : '已绑';
      const sel = bindPickSlot === slot ? ' selected' : '';
      return `<button type="button" class="hub-callout${empty ? ' empty' : ' filled'}${sel}" data-slot="${slot}"
        style="left:${lay.x}%;top:${lay.y}%">
        <span class="hub-callout-cap">${status} · ${SLOT_LABELS[slot]}</span>
        <span class="hub-callout-face" data-face-slot="${slot}">${empty ? '?' : ''}</span>
        <span class="hub-callout-name">${empty ? '可绑' : f.name}</span>
      </button>`;
    }).join('');

    els.callouts.querySelectorAll('[data-face-slot]').forEach((face) => {
      const slot = face.dataset.faceSlot;
      const f = slots[slot];
      if (!f?.defId) return;
      try {
        const img = document.createElement('img');
        img.src = getFishPortrait(f.defId, f);
        img.alt = '';
        img.draggable = false;
        face.replaceChildren(img);
      } catch (_) {
        face.textContent = '·';
      }
    });

    els.callouts.querySelectorAll('[data-slot]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const slot = btn.dataset.slot;
        const f = (deps.getMeta().loadout?.slots || {})[slot];
        if (!f) {
          openSlotBindPicker(slot, btn);
          return;
        }
        closeSlotBindPicker();
        const r = unequipToWarehouse(deps.getMeta(), slot);
        deps.toast(r.msg || (r.ok ? '已卸下' : '失败'));
        if (r.ok) {
          sfx.uiEquip();
          deps.setMeta(r.meta);
          render();
          refreshCenter();
        } else {
          sfx.uiDeny();
        }
      });
    });

    if (bindPickSlot) {
      const anchor = els.callouts.querySelector(`[data-slot="${bindPickSlot}"]`);
      if (anchor && !(slots[bindPickSlot]?.defId)) {
        renderSlotBindPicker(meta, anchor);
      } else if (slots[bindPickSlot]?.defId) {
        closeSlotBindPicker();
      }
    }
  }

  /** Elbow polylines from callout boxes to projected mounts */
  function syncCallouts() {
    if (!drawerOpen || tab !== 'prep' || !els.calloutLines || !els.boatStage || !deps.boatPreview) return;
    const cam = deps.getCamera?.();
    const mounts = cam ? deps.boatPreview.projectMounts?.(cam) : null;
    if (!mounts) return;

    const stage = els.boatStage.getBoundingClientRect();
    if (stage.width < 8 || stage.height < 8) return;
    const overlay = root?.getBoundingClientRect?.() || stage;

    const lines = [];
    for (const slot of SLOT_ORDER) {
      const m = mounts[slot];
      const lay = CALLOUT_LAYOUT[slot];
      if (!m || !lay || m.behind) continue;
      const mountX = ((m.x * overlay.width + overlay.left - stage.left) / stage.width) * 100;
      const mountY = ((m.y * overlay.height + overlay.top - stage.top) / stage.height) * 100;
      const midX = lay.side === 'L'
        ? Math.min(46, (lay.x + mountX) * 0.5 + 8)
        : Math.max(54, (lay.x + mountX) * 0.5 - 8);
      lines.push(
        `<polyline fill="none" points="${lay.x},${lay.y} ${midX},${lay.y} ${midX},${mountY} ${mountX},${mountY}" />`,
      );
      lines.push(`<circle cx="${mountX}" cy="${mountY}" r="0.85" />`);
    }
    els.calloutLines.setAttribute('viewBox', '0 0 100 100');
    els.calloutLines.innerHTML = lines.join('');
  }

  function renderDepartSummary(meta) {
    if (!els.departSummary) return;
    const boatId = deps.getBoat();
    const boatName = HULL_NAMES[boatId === 'lightBoat' ? 'raft' : boatId] || boatId;
    const zone = ZONES.find((z) => z.id === deps.getStartZone()) || ZONES[0];
    const slots = meta.loadout?.slots || {};
    const filled = SLOT_ORDER.filter((s) => slots[s]).length;
    els.departSummary.innerHTML = `
      <div class="hub-fs-stat"><span>船型</span><strong>${boatName}</strong></div>
      <div class="hub-fs-stat"><span>海域</span><strong>${zone?.name || '—'}</strong></div>
      <div class="hub-fs-stat"><span>配装</span><strong>${filled}/${SLOT_ORDER.length}</strong></div>
      <div class="hub-fs-stat"><span>携带</span><strong>${(meta.loadout?.cargo || []).length}</strong></div>
      <div class="hub-fs-stat"><span>门票</span><strong>${(() => {
        const c = zoneTicketCost(deps.getStartZone());
        return c > 0 ? `${c} 碎片` : '免费';
      })()}</strong></div>
    `;
  }

  function fishFaceHtml(f, fallback = '?') {
    if (!f?.defId) return `<span class="hub-bp-q">${fallback}</span>`;
    try {
      return `<img src="${getFishPortrait(f.defId, f)}" alt="" draggable="false" />`;
    } catch (_) {
      return `<span class="hub-bp-q">${fallback}</span>`;
    }
  }

  function renderLoadoutBackpack(meta, root) {
    if (!root) return;
    const slots = meta.loadout?.slots || {};
    const lo = meta.loadout?.supplies || {};
    const bag = Array.isArray(lo.bag) ? lo.bag : [];
    const cargo = meta.loadout?.cargo || [];
    const labels = {
      baitCrude: BAIT_KINDS.crude.name,
      baitFresh: BAIT_KINDS.fresh.name,
      baitScale: BAIT_KINDS.scale.name,
      baitAbyss: BAIT_KINDS.abyss.name,
      plank: '木板',
      repair: '修补剂',
      paste: '龙骨膏',
    };

    const supplyCards = [];
    for (let i = 0; i < LOADOUT_BAG_SIZE; i++) {
      const slot = bag[i];
      const key = slot && (typeof slot === 'string' ? slot : slot.key);
      const n = slot ? (typeof slot === 'string' ? 1 : Math.max(1, slot.n | 0)) : 0;
      if (key) {
        let face = '<span class="hub-bp-q">?</span>';
        try {
          face = `<img src="${getItemPortrait(key)}" alt="" draggable="false" />`;
        } catch (_) { /* keep ? */ }
        supplyCards.push(`
          <button type="button" class="hub-bp-card" data-kind="supply" data-unpack="${i}">
            <div class="hub-bp-card-face">${face}</div>
            <div class="hub-bp-card-cap">${labels[key] || key}<span>×${n} · 卸</span></div>
          </button>`);
      } else {
        supplyCards.push(`
          <div class="hub-bp-card empty" data-kind="supply">
            <div class="hub-bp-card-face"><span class="hub-bp-q">?</span></div>
            <div class="hub-bp-card-cap">物资<span>空</span></div>
          </div>`);
      }
    }

    const modCards = SLOT_ORDER.map((slot, idx) => {
      const f = slots[slot];
      return `
        <div class="hub-bp-card${f ? '' : ' empty'}" data-kind="slot">
          <div class="hub-bp-card-face">${fishFaceHtml(f, '鱼')}</div>
          <div class="hub-bp-card-cap">${idx + 1}. ${SLOT_LABELS[slot]}<span>${f ? f.name : '空'}</span></div>
        </div>`;
    }).join('');

    const equipped = equippedSkills(meta);
    const skillSlotCards = equipped.map((sid, i) => {
      const item = SHOP_WEAPONS.find((w) => w.id === sid);
      const name = item?.name || sid;
      let face = '<span class="hub-bp-q">技</span>';
      try {
        face = `<img src="${getItemPortrait(sid)}" alt="" draggable="false" />`;
      } catch (_) { /* keep */ }
      return `
        <button type="button" class="hub-bp-card" data-kind="skill" data-skill-slot="${i}">
          <div class="hub-bp-card-face">${face}</div>
          <div class="hub-bp-card-cap">${i + 1}. ${name}<span>出港技能</span></div>
        </button>`;
    });

    const talentEquipped = equippedTalents(meta);
    const talentSlotCards = talentEquipped.map((tid, i) => {
      if (!tid) {
        return `
          <button type="button" class="hub-bp-card empty" data-kind="talent" data-talent-slot="${i}">
            <div class="hub-bp-card-face"><span class="hub-bp-q">?</span></div>
            <div class="hub-bp-card-cap">${i + 1}. 空<span>局外天赋</span></div>
          </button>`;
      }
      const item = SHOP_TALENTS.find((t) => t.id === tid);
      const name = item?.name || tid;
      let face = '<span class="hub-bp-q">赋</span>';
      try {
        face = `<img src="${getItemPortrait(tid)}" alt="" draggable="false" />`;
      } catch (_) { /* keep */ }
      return `
        <button type="button" class="hub-bp-card" data-kind="talent" data-talent-slot="${i}">
          <div class="hub-bp-card-face">${face}</div>
          <div class="hub-bp-card-cap">${i + 1}. ${name}<span>出港天赋</span></div>
        </button>`;
    });

    const cargoCards = [];
    for (let i = 0; i < 8; i++) {
      const f = cargo[i];
      if (f) {
        cargoCards.push(`
          <button type="button" class="hub-bp-card" data-kind="cargo" data-uncargo="${i}">
            <div class="hub-bp-card-face">${fishFaceHtml(f, '鱼')}</div>
            <div class="hub-bp-card-cap">${f.name}<span>卸</span></div>
          </button>`);
      } else {
        cargoCards.push(`
          <div class="hub-bp-card empty" data-kind="cargo">
            <div class="hub-bp-card-face"><span class="hub-bp-q">?</span></div>
            <div class="hub-bp-card-cap">携带<span>空</span></div>
          </div>`);
      }
    }

    const boats = [
      { id: 'raft', name: HULL_NAMES.raft, need: true },
      { id: 'heavyRaft', name: HULL_NAMES.heavyRaft, need: !!meta.unlocks.heavyRaft },
      { id: 'chargeBoat', name: HULL_NAMES.chargeBoat, need: !!meta.unlocks.chargeBoat },
    ];
    const curBoat = deps.getBoat() === 'lightBoat' ? 'raft' : deps.getBoat();
    const boatBtns = boats.map((b) => `
      <button type="button" class="hub-chip ${curBoat === b.id ? 'selected' : ''}"
        data-boat="${b.id}" ${b.need ? '' : 'disabled'}>${b.name}${b.need ? '' : ' ·需买'}</button>
    `).join('');

    root.innerHTML = `
      <h3 class="hub-clip-h">船型</h3>
      <div class="hub-boats hub-prep-boats">${boatBtns}</div>
      <p class="hub-bp-sec">物资</p>
      <div class="hub-bp-grid">${supplyCards.join('')}</div>
      <p class="hub-bp-sec">改装</p>
      <div class="hub-bp-grid">${modCards}</div>
      <p class="hub-bp-sec">技能牌 · 点按切换</p>
      <div class="hub-bp-grid">${skillSlotCards.join('')}</div>
      <p class="hub-bp-sec">局外天赋 · 点按切换</p>
      <div class="hub-bp-grid">${talentSlotCards.join('')}</div>
      <p class="hub-bp-sec">携带</p>
      <div class="hub-bp-grid">${cargoCards.join('')}</div>`;

    root.querySelectorAll('[data-boat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.boat;
        sfx.uiClick();
        deps.setBoat(id);
        const m = saveLoadout(deps.getMeta(), { ...deps.getMeta().loadout, boatId: id });
        deps.setMeta(m);
        deps.boatPreview?.syncLoadout?.(m);
        render();
        refreshCenter();
      });
    });
    root.querySelectorAll('[data-skill-slot]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const slot = Number(btn.dataset.skillSlot);
        sfx.uiClick();
        const m = cycleSkillSlot(deps.getMeta(), slot);
        deps.setMeta(m);
        render();
      });
    });
    root.querySelectorAll('[data-talent-slot]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const slot = Number(btn.dataset.talentSlot);
        if (!ownedTalentIds(deps.getMeta().unlocks).length) {
          sfx.uiDeny();
          deps.toast('市集购买局外天赋后再装配');
          return;
        }
        sfx.uiClick();
        const m = cycleTalentSlot(deps.getMeta(), slot);
        deps.setMeta(m);
        render();
      });
    });
    root.querySelectorAll('[data-unpack]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const r = unpackSupply(deps.getMeta(), btn.dataset.unpack);
        deps.toast(r.msg);
        if (r.ok) {
          sfx.uiEquip();
          deps.setMeta(r.meta);
          render();
        } else {
          sfx.uiDeny();
        }
      });
    });
    root.querySelectorAll('[data-uncargo]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const r = returnCargoToWarehouse(deps.getMeta(), Number(btn.dataset.uncargo));
        deps.toast(r.ok ? '已放回仓库' : (r.msg || '失败'));
        if (r.ok) {
          sfx.uiEquip();
          deps.setMeta(r.meta);
          render();
        } else {
          sfx.uiDeny();
        }
      });
    });
  }

  function renderPrepSlots(meta) {
    if (!els.prepSlots) return;
    const slots = meta.loadout?.slots || {};
    els.prepSlots.innerHTML = SLOT_ORDER.map((s) => {
      const f = slots[s];
      return `<div class="hub-fs-stat"><span>${SLOT_LABELS[s]}</span><strong>${f ? f.name : '空'}</strong></div>`;
    }).join('');
  }

  function renderZones(meta) {
    if (!els.zones) return;
    const start = deps.getStartZone();
    els.zones.innerHTML = ZONES.map((z) => {
      const unlocked = canDepartZone(meta, z.id).ok;
      const selected = start === z.id;
      return `<div class="hub-zone ${selected ? 'selected' : ''} ${unlocked ? '' : 'locked'}">
        <button type="button" class="hub-zone-pick" data-pick-zone="${z.id}" ${unlocked ? '' : 'disabled'}>
          <strong><span class="hub-zone-swatch" style="background:${z.color || '#2ec4b6'}"></span>${z.name}</strong>
          <span>${(() => {
            if (!unlocked) {
              if (z.id === -1) return z.unlockHint || '';
              if (!meta.tutorialDone) return '\u5148\u5b8c\u6210\u7ec3\u4e60\u6e7e\u5f52\u822a';
              return '\u901a\u5173\u4e0a\u5173\u89e3\u9501';
            }
            const feat = FEATURE_LABELS[z.feature] || z.unlockHint || '';
            const cost = zoneTicketCost(z.id);
            if (cost > 0) return feat ? `${feat} \u00b7 \u95e8\u7968 ${cost}` : `\u95e8\u7968 ${cost} \u788e\u7247`;
            return feat;
          })()}</span>
        </button>
      </div>`;
    }).join('');

    els.zones.querySelectorAll('[data-pick-zone]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = Number(btn.dataset.pickZone);
        if (!canDepartZone(meta, id).ok) {
          sfx.uiDeny();
          return;
        }
        sfx.uiClick();
        deps.setStartZone(id);
        render();
        deps.drawHubMap?.(els.mapCanvas);
      });
    });
  }

  function renderBoats() {
    /* boat pick moved to prep backpack */
  }

  function renderCargo(meta) {
    if (!els.cargo) return;
    const cargo = meta.loadout?.cargo || [];
    if (!cargo.length) {
      els.cargo.innerHTML = '<p class="hub-empty">未携带 — 在仓库点「携带」</p>';
      return;
    }
    els.cargo.innerHTML = cargo.map((f, i) => `
      <div class="hub-wh-row">
        <span>${f.name} <small>活${Math.floor(f.vitality ?? 100)}</small></span>
        <button type="button" class="bp-btn dim" data-uncargo="${i}">放回</button>
      </div>
    `).join('');
    els.cargo.querySelectorAll('[data-uncargo]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const r = returnCargoToWarehouse(meta, Number(btn.dataset.uncargo));
        if (r.ok) {
          sfx.uiEquip();
          deps.setMeta(r.meta);
          render();
        } else {
          sfx.uiDeny();
        }
      });
    });
  }

  function pruneHubCraftSlots(fish) {
    const next = [null, null, null, null];
    (hubCraftSlots || []).forEach((i, k) => {
      if (k < 4 && i != null && fish[i]) next[k] = i;
    });
    hubCraftSlots = next;
  }

  function hubCraftThumb(fish, emptyLabel) {
    if (!fish) {
      const mark = emptyLabel === '+' || emptyLabel === '?' ? emptyLabel : '';
      return `<div class="bp-polaroid"><div class="bp-thumb${mark ? ' bp-thumb-plus' : ''}">${mark}</div><div class="bp-cell-name">${emptyLabel || '—'}</div></div>`;
    }
    let thumb = '';
    try {
      thumb = `<img class="bp-thumb-fish" src="${getFishPortrait(fish.defId, fish)}" alt="" draggable="false" />`;
    } catch (_) {
      thumb = '<div class="bp-thumb-blob" style="background:#4a90a4"></div>';
    }
    const fam = familyOf(fish.defId);
    const famChip = fam
      ? `<span class="bp-family-chip fam-${fam.id}" style="--fam:${fam.color}">${fam.name}</span>`
      : '';
    const rarity = fish.rarity || getFishDef(fish.defId)?.rarity || 1;
    return `${famChip}<div class="bp-polaroid"><div class="bp-thumb">${thumb}</div><div class="bp-cell-name">${fish.name}</div><div class="bp-rarity-bar r${rarity}"></div></div>`;
  }

  function doHubCraft() {
    pruneHubCraftSlots(deps.getMeta().warehouse?.fish || []);
    const indices = [...new Set(hubCraftSlots.filter((i) => i != null))];
    const r = craftWarehouseFish(deps.getMeta(), indices);
    if (!r.ok) {
      deps.toast(r.msg || '放入 2–4 条鱼获');
      sfx.uiDeny();
      return;
    }
    hubCraftSlots = [null, null, null, null];
    hubCraftPreview = r.fish;
    clearTimeout(hubCraftPreviewTimer);
    hubCraftPreviewTimer = setTimeout(() => {
      hubCraftPreview = null;
      if (warehouseTab === 'craft') render();
    }, 800);
    sfx.fishCatch();
    if (r.newIds?.length) deps.toast(`合成新鱼种！${r.fish.name}`);
    else if (r.hidden) deps.toast(`合成隐藏！${r.fish.name}`);
    else deps.toast(`合成 ${r.fish.name}（${rarityStars(r.rarity)}）`);
    deps.setMeta(r.meta);
    render();
  }

  /** Craft tab borrows the clip panel as the material source. */
  function renderHubCraftBag(fish) {
    const panel = els.clipPanels.warehouse;
    if (!panel) return;
    const used = new Set(hubCraftSlots.filter((i) => i != null));
    panel.replaceChildren();
    const h = document.createElement('h3');
    h.className = 'hub-clip-h';
    h.textContent = '背包';
    const hint = document.createElement('p');
    hint.className = 'hub-fs-blurb';
    hint.textContent = '仓库鱼获 · 点击放入材料槽';
    const grid = document.createElement('div');
    grid.className = 'hub-craft-bag';
    const pickable = fish.map((f, i) => ({ f, i })).filter((row) => !used.has(row.i));
    const cells = Math.max(6, Math.ceil((pickable.length + 1) / 2) * 2);
    for (let p = 0; p < cells; p++) {
      const row = pickable[p];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bp-cell' + (row ? '' : ' empty');
      btn.innerHTML = `<span class="bp-tape top"></span>${hubCraftThumb(row ? row.f : null, '—')}`;
      if (row) {
        btn.addEventListener('click', () => {
          sfx.uiClick();
          const empty = hubCraftSlots.findIndex((x) => x == null);
          if (empty < 0) {
            deps.toast('四个槽已满');
            sfx.uiDeny();
            return;
          }
          hubCraftSlots[empty] = row.i;
          render();
        });
      }
      grid.appendChild(btn);
    }
    panel.append(h, hint, grid);
  }

  function renderWarehouseCraft(meta) {
    const fish = meta.warehouse?.fish || [];
    pruneHubCraftSlots(fish);
    els.warehouse.className = 'bp-craft';
    els.warehouse.replaceChildren();

    const board = document.createElement('div');
    board.className = 'bp-craft-board';
    const matCol = document.createElement('div');
    matCol.className = 'bp-craft-col';
    const matLabel = document.createElement('span');
    matLabel.className = 'bp-craft-label';
    matLabel.textContent = '材料 2–4';
    matCol.appendChild(matLabel);
    const slotsWrap = document.createElement('div');
    slotsWrap.className = 'bp-craft-slots';
    for (let s = 0; s < 4; s++) {
      const idx = hubCraftSlots[s];
      const f = idx == null ? null : fish[idx];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bp-cell' + (f ? '' : ' empty');
      btn.innerHTML = `<span class="bp-tape top"></span>${hubCraftThumb(f, '+')}`;
      btn.addEventListener('click', () => {
        sfx.uiClick();
        if (f) {
          hubCraftSlots[s] = null;
          render();
          return;
        }
        deps.toast('点右侧背包放入');
      });
      slotsWrap.appendChild(btn);
    }
    matCol.appendChild(slotsWrap);
    board.appendChild(matCol);

    const arrow = document.createElement('div');
    arrow.className = 'bp-craft-arrow';
    arrow.textContent = '→';
    board.appendChild(arrow);

    const outCol = document.createElement('div');
    outCol.className = 'bp-craft-col';
    const outLabel = document.createElement('span');
    outLabel.className = 'bp-craft-label';
    outLabel.textContent = '产物';
    outCol.appendChild(outLabel);
    const previewWrap = document.createElement('div');
    previewWrap.className = 'bp-craft-preview';
    const previewBtn = document.createElement('button');
    previewBtn.type = 'button';
    previewBtn.className = 'bp-cell' + (hubCraftPreview ? ' flash' : ' empty');
    previewBtn.innerHTML = `<span class="bp-tape top"></span>${hubCraftThumb(hubCraftPreview, '?')}`;
    previewWrap.appendChild(previewBtn);
    outCol.appendChild(previewWrap);
    board.appendChild(outCol);
    els.warehouse.appendChild(board);

    const mats = hubCraftSlots.map((i) => (i == null ? null : fish[i])).filter(Boolean);
    const odds = previewCraftOdds(mats);
    const n = mats.length;
    const info = document.createElement('p');
    info.className = 'bp-craft-odds';
    info.textContent = odds
      ? `${n} / 4 · 最高 ${rarityStars(odds.R)} · 降 1 阶 ${fmtCraftPct(odds.down)} · 同阶 ${fmtCraftPct(odds.same)} · 升 1 阶 ${fmtCraftPct(odds.up)} · 隐藏六星 ${fmtCraftPct(odds.hidden)}`
      : `${n} / 4 · 从右侧背包放入 2–4 条鱼获，产物从全图鉴抽取`;
    els.warehouse.appendChild(info);

    const acts = document.createElement('div');
    acts.className = 'bp-craft-acts';
    const craftBtn = document.createElement('button');
    craftBtn.type = 'button';
    craftBtn.className = 'bp-btn bright';
    craftBtn.textContent = '合成';
    craftBtn.disabled = n < 2;
    craftBtn.addEventListener('click', doHubCraft);
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'bp-btn dim';
    clearBtn.textContent = '清空';
    clearBtn.disabled = n < 1;
    clearBtn.addEventListener('click', () => {
      sfx.uiClick();
      hubCraftSlots = [null, null, null, null];
      render();
    });
    acts.append(craftBtn, clearBtn);
    els.warehouse.appendChild(acts);

    renderHubCraftBag(fish);
  }

  function renderWarehouse(meta) {
    if (!els.warehouse) return;
    if (els.matMeta && tab === 'warehouse') {
      els.matMeta.textContent = warehouseTab === 'craft' ? '合成台'
        : warehouseTab === 'relics' ? '宝物'
          : warehouseTab === 'bait' ? '鱼饵'
            : warehouseTab === 'repair' ? '修补'
              : '鱼获';
    }
    const emptyWarehouseCell = (actCount) => {
      const spacers = Array.from({ length: actCount }, () =>
        '<span class="bp-btn dim hub-wh-act-spacer" aria-hidden="true">&nbsp;</span>'
      ).join('');
      return `<button type="button" class="bp-cell empty"><span class="bp-tape top"></span><div class="bp-polaroid"><div class="bp-thumb"></div><div class="bp-cell-name">—</div><div class="bp-rarity-bar r1"></div><div class="hub-wh-acts-inline">${spacers}</div></div></button>`;
    };
    const nav = els.warehouseStage?.querySelector('#hub-wh-tabs');
    if (nav) {
      nav.innerHTML = [
        { id: 'bait', name: '鱼饵' },
        { id: 'repair', name: '修补' },
        { id: 'fish', name: '鱼类' },
        { id: 'relics', name: '宝物' },
        { id: 'craft', name: '合成' },
      ].map((z) => `<button type="button" class="hub-shop-tab${warehouseTab === z.id ? ' active' : ''}" data-wh-tab="${z.id}">${z.name}</button>`).join('');
      nav.querySelectorAll('[data-wh-tab]').forEach((btn) => {
        btn.addEventListener('click', () => {
          sfx.uiClick();
          closeWhBuyPop();
          warehouseTab = btn.dataset.whTab;
          render();
        });
      });
    }

    if (warehouseTab === 'craft') {
      renderWarehouseCraft(meta);
      return;
    }

    els.warehouse.className = 'bp-grid hub-wh-grid';

    if (warehouseTab === 'bait' || warehouseTab === 'repair') {
      const stock = meta.warehouse?.supplies || {};
      const items = SHOP_SUPPLIES.filter((s) => s.zone === warehouseTab);
      const cells = items.map((item) => {
        const n = stock[item.id] | 0;
        let thumb = '';
        try {
          thumb = `<img class="bp-thumb-fish" src="${getItemPortrait(item.id)}" alt="" draggable="false" />`;
        } catch (_) {
          thumb = `<div class="bp-thumb-blob" style="background:${item.tone || '#4a90a4'}"></div>`;
        }
        const act = `
              <button type="button" class="bp-btn dim" data-pack="${item.id}">装 ×${n}</button>
              <button type="button" class="bp-btn bright" data-wh-buy="${item.id}">购</button>`;
        return `<div class="bp-cell hub-wh-cell">
          <span class="bp-tape top"></span>
          <div class="bp-polaroid">
            <div class="bp-thumb">${thumb}</div>
            <div class="bp-cell-name">${item.name}</div>
            <div class="bp-rarity-bar r1"></div>
            <div class="hub-wh-acts-inline">
              ${act}
            </div>
          </div>
        </div>`;
      });
      while (cells.length < 20) cells.push(emptyWarehouseCell(2));
      els.warehouse.innerHTML = cells.join('');
      els.warehouse.querySelectorAll('[data-pack]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          sfx.uiOpen();
          openWhPackPop(btn.dataset.pack);
        });
      });
      els.warehouse.querySelectorAll('[data-wh-buy]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          sfx.uiOpen();
          openWhBuyPop(btn.dataset.whBuy);
        });
      });
      return;
    }

    if (warehouseTab === 'relics') {
      const relics = meta.warehouse?.relics || [];
      if (!relics.length) {
        els.warehouse.innerHTML = '<p class="hub-empty">暂无宝物 · 出海捞黑色包裹并归航</p>';
        return;
      }
      const cells = relics.map((item, i) => {
        const def = item.sealed ? null : getRelicDef(item.defId);
        const title = item.sealed ? '黑色包裹' : (def?.name || '宝物');
        const price = relicSellPreview(item);
        const sub = item.sealed
          ? `未鉴定 · 可卖 ${price}`
          : `${tierLabel(def?.tier || item.tier, def?.hidden || item.hidden)} · 售 ${price}`;
        return `<div class="bp-cell hub-wh-cell">
          <span class="bp-tape top"></span>
          <div class="bp-polaroid">
            <div class="bp-thumb">${relicFaceHtml(item)}</div>
            <div class="bp-cell-name">${title}</div>
            <div class="bp-rarity-bar r${Math.min(5, item.tier || 1)}"></div>
            <div class="hub-wh-acts-inline">
              <button type="button" class="bp-btn dim" data-sell-relic="${i}">出售 ${price}</button>
            </div>
            <span class="hub-fs-blurb" style="font-size:10px">${sub}</span>
          </div>
        </div>`;
      });
      els.warehouse.innerHTML = cells.join('');
      els.warehouse.querySelectorAll('[data-sell-relic]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = Number(btn.dataset.sellRelic);
          const r = sellWarehouseRelic(deps.getMeta(), idx);
          deps.toast(r.msg);
          if (r.ok) {
            sfx.uiSell();
            deps.setMeta(r.meta);
            render();
          } else sfx.uiDeny();
        });
      });
      return;
    }

    const fish = meta.warehouse?.fish || [];
    const boundSlots = meta.loadout?.slots || {};
    const cells = fish.map((f, i) => {
      const def = getFishDef(f.defId);
      const slot = def.slot;
      const occupied = !!(slot && boundSlots[slot]?.defId);
      let thumb = '';
      try {
        thumb = `<img class="bp-thumb-fish" src="${getFishPortrait(f.defId, f)}" alt="" draggable="false" />`;
      } catch (_) {
        thumb = `<div class="bp-thumb-blob" style="background:#4a90a4"></div>`;
      }
      const badge = slot
        ? `<span class="bp-slot-badge${occupied ? ' occupied' : ''}">${occupied ? '已占' : '可绑'}·${SLOT_LABELS[slot] || slot}</span>`
        : '';
      const fam = familyOf(f.defId);
      const famChip = fam
        ? `<span class="bp-family-chip fam-${fam.id}" style="--fam:${fam.color}">${fam.name}</span>`
        : '';
      return `<div class="bp-cell hub-wh-cell" data-wh="${i}">
        <span class="bp-tape top"></span>
        ${famChip}
        <div class="bp-polaroid">
          ${badge}
          <div class="bp-thumb">${thumb}</div>
          <div class="bp-cell-name">${f.name}</div>
          <div class="bp-rarity-bar r${def.rarity || 1}"></div>
          <div class="hub-wh-acts-inline">
            ${slot ? `<button type="button" class="bp-btn dim" data-eq="${i}" data-slot="${slot}">绑</button>` : ''}
            <button type="button" class="bp-btn dim" data-cargo="${i}">带</button>
            <button type="button" class="bp-btn dim" data-feed="${i}">喂</button>
            ${slot ? '' : '<span class="bp-btn dim hub-wh-act-spacer" aria-hidden="true">&nbsp;</span>'}
          </div>
        </div>
      </div>`;
    });
    while (cells.length < 20) cells.push(emptyWarehouseCell(3));
    els.warehouse.innerHTML = cells.join('');

    els.warehouse.querySelectorAll('[data-eq]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const r = equipFromWarehouse(meta, Number(btn.dataset.eq), btn.dataset.slot);
        deps.toast(r.msg || (r.ok ? '已绑槽' : '失败'));
        if (r.ok) {
          sfx.uiEquip();
          deps.setMeta(r.meta);
          render();
        } else {
          sfx.uiDeny();
        }
      });
    });
    els.warehouse.querySelectorAll('[data-cargo]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const r = moveWarehouseToLoadoutCargo(meta, Number(btn.dataset.cargo));
        deps.toast(r.msg || (r.ok ? '已加入携带' : '失败'));
        if (r.ok) {
          sfx.uiEquip();
          deps.setMeta(r.meta);
          render();
        } else {
          sfx.uiDeny();
        }
      });
    });
    els.warehouse.querySelectorAll('[data-feed]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const r = hubFeedFish(meta, Number(btn.dataset.feed));
        deps.toast(r.msg);
        if (r.ok) {
          sfx.uiEquip();
          deps.setMeta(r.meta);
          render();
        } else {
          sfx.uiDeny();
        }
      });
    });
  }

  function renderSupplies(meta) {
    if (!els.supplies) return;
    const s = meta.warehouse?.supplies || {};
    const lo = meta.loadout?.supplies || {};
    const kind = lo.baitKind || 'fresh';
    const kindName = BAIT_KINDS[kind]?.name || '鲜饵';
    const nKind = baitStock(s, kind);
    els.supplies.innerHTML = `
      <p>仓库：${BAIT_KINDS.crude.name} ${s.baitCrude || 0} · ${BAIT_KINDS.fresh.name} ${s.baitFresh || s.bait || 0} · ${BAIT_KINDS.scale.name} ${s.baitScale || 0} · ${BAIT_KINDS.abyss.name} ${s.baitAbyss || 0}</p>
      <p>修补：木板 ${s.plank || 0} · 剂 ${s.repair || 0} · 膏 ${s.paste || 0} · 饵合计 ${totalBait(s)}</p>
      <p>出港带：${kindName} ${Math.min(3, nKind)} · 木板 ${Math.min(1, s.plank || 0)} · ${s.paste ? '膏' : '剂'} ${Math.min(1, (s.paste || s.repair || 0))}</p>
      <p class="muted">点下方饵种可设为本航携带种类。剂和膏出港只带一种。</p>
      <p>${Object.keys(BAIT_KINDS).map((k) =>
        `<button type="button" class="hub-shop-tab${kind === k ? ' active' : ''}" data-bait-kind="${k}">${BAIT_KINDS[k].name}</button>`
      ).join(' ')}</p>
    `;
    els.supplies.querySelectorAll('[data-bait-kind]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sfx.uiClick();
        const m = setLoadoutBaitKind(deps.getMeta(), btn.dataset.baitKind);
        deps.setMeta(m);
        render();
      });
    });
  }

  function shopCardHtml({ key, title, sub, tone, owned, disabled, faceHtml, itemId }) {
    const cls = [
      'hub-shop-card',
      owned ? 'owned' : '',
      disabled ? 'disabled' : '',
    ].filter(Boolean).join(' ');
    let face = faceHtml;
    if (!face && itemId) {
      try {
        face = `<img src="${getItemPortrait(itemId)}" alt="" draggable="false" />`;
      } catch (_) { face = null; }
    }
    if (!face) {
      face = `<span class="hub-shop-swatch" style="background:${tone || '#5a6570'}"></span>`;
    }
    return `<button type="button" class="${cls}" data-shop-key="${key}" ${disabled && !owned ? 'disabled' : ''}>
      <span class="hub-shop-card-face">${face}</span>
      <span class="hub-shop-card-cap">${title}<span>${sub}</span></span>
    </button>`;
  }

  function renderShopDetail(meta) {
    const panel = els.clipPanels.shop;
    if (!panel) return;
    const tabMeta = SHOP_TABS.find((t) => t.id === shopTab);
    const blurb = {
      sell: '卖掉仓库鱼或宝物换碎片。未鉴定包裹也可先卖。',
      hull: '帆船免费。重筏 / 冲锋船买的是一艘在港船，沉了要重买。',
      supply: '饵和修理剂入仓库，出港再装进 8 格背包。1–3 星鱼可直购。',
      weapon: '学会永久。出航带 3 张。可升到 3 级。',
      talent: '永久。可升到 3 级。',
    }[shopTab] || '';
    let detail = `<h3 class="hub-clip-h">${tabMeta?.name || '商店'}</h3>
      <p class="hub-fs-blurb">${blurb}</p>
      <p class="hub-fs-blurb">海图碎片 <strong>${meta.fragments || 0}</strong></p>`;
    if (shopDetail) {
      const isSupply = shopDetail.act === 'supply';
      let qtyBlock = '';
      if (isSupply && shopDetail.actId) {
        const supplyItem = SHOP_SUPPLIES.find((s) => s.id === shopDetail.actId);
        const frags = meta.fragments | 0;
        const maxPacks = supplyItem
          ? Math.max(0, Math.min(99, Math.floor(frags / supplyItem.cost)))
          : 0;
        const dis = maxPacks < 1 ? 'disabled' : '';
        qtyBlock = `
          <div class="hub-shop-qty">
            <label class="hub-shop-qty-label">份数</label>
            <input type="range" class="hub-shop-qty-range" data-wh-qty-range
                   min="1" max="${Math.max(1, maxPacks)}" value="1" ${dis}/>
            <input type="number" class="hub-shop-qty-num" data-wh-qty-num
                   min="1" max="${Math.max(1, maxPacks)}" value="1"
                   inputmode="numeric" ${dis}/>
          </div>
          <p class="hub-shop-qty-price" data-shop-qty-price></p>`;
      }
      const actBtn = shopDetail.act
        ? `<button type="button" class="bp-btn bright hub-shop-act" data-shop-act="${shopDetail.act}" data-shop-act-id="${shopDetail.actId}">${shopDetail.actLabel}</button>`
        : '';
      detail += `<div class="hub-shop-detail">
        <strong>${shopDetail.title}</strong>
        <p>${shopDetail.desc || ''}</p>
        <p class="hub-shop-detail-price">${shopDetail.priceLine || ''}</p>
        ${qtyBlock}
        ${actBtn}
      </div>`;
    } else {
      detail += `<p class="hub-fs-blurb muted">选中卡片查看说明</p>`;
    }
    panel.innerHTML = detail;
    if (shopDetail?.act === 'supply' && shopDetail.actId) {
      const supplyItem = SHOP_SUPPLIES.find((s) => s.id === shopDetail.actId);
      const frags = meta.fragments | 0;
      const maxPacks = supplyItem
        ? Math.max(0, Math.min(99, Math.floor(frags / supplyItem.cost)))
        : 0;
      const paintQty = (qty) => {
        const cost = (supplyItem?.cost || 0) * qty;
        const units = (supplyItem?.amount || 0) * qty;
        const priceEl = panel.querySelector('[data-shop-qty-price]');
        const btn = panel.querySelector('[data-shop-act]');
        if (priceEl) priceEl.textContent = `${cost} 碎片 · 入手 ×${units} · 余额 ${frags}`;
        if (btn) {
          btn.disabled = maxPacks < 1 || cost > frags;
          btn.textContent = maxPacks < 1 ? '碎片不足' : `购入 ${qty} 份`;
        }
      };
      wireWhQtyControls(panel, Math.max(1, maxPacks), paintQty);
    }
    panel.querySelector('[data-shop-act]')?.addEventListener('click', () => {
      const act = shopDetail?.act;
      const actId = shopDetail?.actId;
      if (!act) return;
      if (act === 'sell') {
        const idx = Number(actId);
        const fish = deps.getMeta().warehouse?.fish?.[idx];
        const r = sellWarehouseFish(deps.getMeta(), idx);
        deps.toast(r.msg);
        if (r.ok) {
          sfx.uiSell();
          shopDetail = {
            title: fish?.name || '已售出',
            desc: '已换成海图碎片',
            priceLine: `+${r.price} 海图碎片`,
          };
          deps.setMeta(r.meta);
          render();
        } else {
          sfx.uiDeny();
        }
        return;
      }
      if (act === 'sellBelow') {
        const below = Number(actId) || 4;
        const r = sellWarehouseFishBelowRarity(deps.getMeta(), below);
        deps.toast(r.msg);
        if (r.ok) {
          sfx.uiSell();
          shopDetail = {
            title: '一键出售完成',
            desc: `已卖掉 ${r.count} 条低星鱼`,
            priceLine: `+${r.price} 海图碎片`,
          };
          deps.setMeta(r.meta);
          render();
        } else {
          sfx.uiDeny();
        }
        return;
      }
      if (act === 'sellRelicBelow') {
        const below = Number(actId) || 3;
        const r = sellWarehouseRelicsBelowTier(deps.getMeta(), below);
        deps.toast(r.msg);
        if (r.ok) {
          sfx.uiSell();
          shopDetail = {
            title: '一键出售完成',
            desc: `已卖掉 ${r.count} 件（已鉴定 T${below} 以下）`,
            priceLine: `+${r.price} 海图碎片`,
          };
          deps.setMeta(r.meta);
          render();
        } else {
          sfx.uiDeny();
        }
        return;
      }
      if (act === 'sellRelic') {
        const idx = Number(actId);
        const r = sellWarehouseRelic(deps.getMeta(), idx);
        deps.toast(r.msg);
        if (r.ok) {
          sfx.uiSell();
          shopDetail = {
            title: '已售出',
            desc: '宝物换成海图碎片',
            priceLine: `+${r.price} 海图碎片`,
          };
          deps.setMeta(r.meta);
          render();
        } else sfx.uiDeny();
        return;
      }
      if (act === 'supply') {
        const qtyNum = panel.querySelector('[data-wh-qty-num]');
        const qty = clampInt(qtyNum?.value || '1', 1, 99);
        const r = buySupplyQty(deps.getMeta(), actId, qty);
        deps.toast(r.msg);
        if (r.ok) {
          sfx.uiBuy();
          deps.setMeta(r.meta);
          render();
        } else {
          sfx.uiDeny();
        }
        return;
      }
      if (act === 'buyFish') {
        const r = buyWarehouseFish(deps.getMeta(), actId);
        deps.toast(r.msg);
        if (r.ok) {
          sfx.uiBuy();
          deps.setMeta(r.meta);
          render();
        } else {
          sfx.uiDeny();
        }
        return;
      }
      if (act === 'upgradeSkill') {
        const r = upgradeSkill(deps.getMeta(), actId);
        deps.toast(r.msg);
        if (r.ok) {
          sfx.uiBuy();
          deps.setMeta(r.meta);
          render();
        } else {
          sfx.uiDeny();
        }
        return;
      }
      if (act === 'upgradeTalent') {
        const r = upgradeTalent(deps.getMeta(), actId);
        deps.toast(r.msg);
        if (r.ok) {
          sfx.uiBuy();
          deps.setMeta(r.meta);
          render();
        } else {
          sfx.uiDeny();
        }
        return;
      }
      if (act === 'buy') {
        const r = tryUnlock(deps.getMeta(), actId);
        deps.toast(r.msg);
        if (r.ok) {
          sfx.uiBuy();
          shopDetail = { ...shopDetail, act: null, priceLine: '已入手' };
          deps.setMeta(r.meta);
          if (SHOP_HULLS.some((h) => h.id === actId)) {
            deps.setBoat(actId);
            deps.boatPreview?.syncLoadout?.(r.meta);
          }
          render();
        } else {
          sfx.uiDeny();
        }
      }
    });
  }

  function renderShop(meta) {
    if (!els.shop) return;
    const tabs = SHOP_TABS.map((t) => `
      <button type="button" class="hub-shop-tab${shopTab === t.id ? ' active' : ''}" data-shop-tab="${t.id}">${t.name}</button>
    `).join('');

    let cards = '';
    if (shopTab === 'sell') {
      const sellSub = ['fish', 'relics'].map((z) => {
        const label = z === 'fish' ? '鱼类' : '宝物';
        return `<button type="button" class="hub-shop-tab${shopSellTab === z ? ' active' : ''}" data-sell-zone="${z}">${label}</button>`;
      }).join('');
      if (shopSellTab === 'relics') {
        const relics = meta.warehouse?.relics || [];
        const bulkBar = `<div class="hub-shop-bulk">
          <button type="button" class="bp-btn bright hub-shop-bulk-btn" data-sell-relic-below="3">一键出售 T3 以下</button>
          <span class="hub-shop-bulk-hint">保留已鉴定 T3 / 隐藏 / 未鉴定包裹</span>
        </div>`;
        if (!relics.length) {
          cards = `<div class="hub-shop-subtabs">${sellSub}</div>${bulkBar}<p class="hub-empty">仓库暂无宝物可售</p>`;
        } else {
          cards = `<div class="hub-shop-subtabs">${sellSub}</div>${bulkBar}` + relics.map((item, i) => {
            const def = item.sealed ? null : getRelicDef(item.defId);
            const title = item.sealed ? '黑色包裹' : (def?.name || '宝物');
            const price = relicSellPreview(item);
            return shopCardHtml({
              key: `sellrelic:${i}`,
              title,
              sub: `售价 ${price}`,
              tone: '#2a2430',
              faceHtml: relicFaceHtml(item),
            });
          }).join('');
        }
      } else {
        const fish = meta.warehouse?.fish || [];
        const bulkBar = `<div class="hub-shop-bulk">
          <button type="button" class="bp-btn bright hub-shop-bulk-btn" data-sell-below="4">一键出售4星以下</button>
          <span class="hub-shop-bulk-hint">保留 ★★★★ 及以上</span>
        </div>`;
        if (!fish.length) {
          cards = `<div class="hub-shop-subtabs">${sellSub}</div>${bulkBar}<p class="hub-empty">仓库暂无鱼获可售</p>`;
        } else {
          cards = `<div class="hub-shop-subtabs">${sellSub}</div>${bulkBar}` + fish.map((f, i) => {
            const price = fishSellPrice(f);
            return shopCardHtml({
              key: `sell:${i}`,
              title: f.name,
              sub: `售价 ${price}`,
              tone: `#${(f.color >>> 0).toString(16).padStart(6, '0')}`,
              faceHtml: '',
            });
          }).join('');
        }
      }
    } else if (shopTab === 'hull') {
      cards = SHOP_HULLS.map((item) => {
        const owned = !!meta.unlocks[item.id];
        return shopCardHtml({
          key: `buy:${item.id}`,
          title: item.name,
          sub: owned ? '在港 · 沉船丢失' : `${item.cost} 海图碎片`,
          tone: item.tone,
          itemId: item.id,
          owned,
          disabled: owned,
        });
      }).join('');
    } else if (shopTab === 'supply') {
      const sub = ['bait', 'repair', 'fish'].map((z) => {
        const label = z === 'bait' ? '鱼饵' : z === 'repair' ? '修补' : '鱼类';
        return `<button type="button" class="hub-shop-tab${shopSupplyZone === z ? ' active' : ''}" data-supply-zone="${z}">${label}</button>`;
      }).join('');
      if (shopSupplyZone === 'fish') {
        cards = listShopBuyFishIds().map((id) => {
          const def = getFishDef(id);
          const cost = shopBuyCost(def);
          return shopCardHtml({
            key: `fish:${id}`,
            title: def.name,
            sub: `${rarityStars(def.rarity)}${familyLabel(def) ? ` · ${familyLabel(def)}` : ''} · ${cost}`,
            tone: `#${(def.color >>> 0).toString(16).padStart(6, '0')}`,
            itemId: id,
          });
        }).join('');
      } else {
        cards = SHOP_SUPPLIES.filter((item) => item.zone === shopSupplyZone).map((item) => shopCardHtml({
          key: `supply:${item.id}`,
          title: item.name,
          sub: `${item.cost} · ×${item.amount}`,
          tone: item.tone,
          itemId: item.id,
        })).join('');
      }
      cards = `<div class="hub-shop-subtabs">${sub}</div>${cards}`;
    } else if (shopTab === 'weapon') {
      cards = SHOP_WEAPONS.map((item) => {
        const owned = item.cost <= 0 || !!meta.unlocks[item.id];
        const lv = owned ? skillLevel(meta, item.id) : 0;
        let sub;
        if (!owned) sub = `${item.cost} 海图碎片`;
        else if (lv >= 3) sub = 'Lv.3 满级';
        else sub = `Lv.${lv} · 升${lv + 1} ${skillUpgradeCost(item.id, lv)}`;
        return shopCardHtml({
          key: `buy:${item.id}`,
          title: item.name,
          sub,
          tone: item.tone,
          itemId: item.id,
          owned,
        });
      }).join('');
    } else if (shopTab === 'talent') {
      cards = SHOP_TALENTS.map((item) => {
        const owned = !!meta.unlocks[item.id];
        const lv = owned ? talentLevel(meta, item.id) : 0;
        let sub;
        if (!owned) sub = `${item.cost} 海图碎片`;
        else if (lv >= 3) sub = 'Lv.3 满级';
        else sub = `Lv.${lv} · 升${lv + 1} ${talentUpgradeCost(lv)}`;
        return shopCardHtml({
          key: `buy:${item.id}`,
          title: item.name,
          sub,
          tone: item.tone,
          itemId: item.id,
          owned,
        });
      }).join('');
    }

    els.shop.innerHTML = `
      <div class="hub-shop-tabs">${tabs}</div>
      <div class="hub-shop-grid">${cards}</div>`;

    els.shop.querySelectorAll('[data-shop-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sfx.uiClick();
        shopTab = btn.dataset.shopTab;
        shopDetail = null;
        renderShop(meta);
      });
    });
    els.shop.querySelectorAll('[data-supply-zone]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        sfx.uiClick();
        shopSupplyZone = btn.dataset.supplyZone;
        shopDetail = null;
        renderShop(meta);
      });
    });
    els.shop.querySelectorAll('[data-sell-zone]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        sfx.uiClick();
        shopSellTab = btn.dataset.sellZone;
        shopDetail = null;
        renderShop(meta);
      });
    });
    els.shop.querySelectorAll('[data-sell-below]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const below = Number(btn.dataset.sellBelow) || 4;
        const low = (deps.getMeta().warehouse?.fish || []).filter((f) => (f?.rarity | 0) > 0 && (f.rarity | 0) < below);
        if (!low.length) {
          sfx.uiDeny();
          deps.toast('没有4星以下的鱼');
          return;
        }
        const total = low.reduce((s, f) => s + fishSellPrice(f), 0);
        shopDetail = {
          title: '一键出售4星以下',
          desc: `将卖掉仓库里全部 ★～★★★ 鱼（共 ${low.length} 条），保留四星及以上。`,
          priceLine: `预计 +${total} 海图碎片`,
          act: 'sellBelow',
          actId: String(below),
          actLabel: '确认一键出售',
        };
        sfx.uiClick();
        renderShopDetail(deps.getMeta());
      });
    });
    els.shop.querySelectorAll('[data-sell-relic-below]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const below = Number(btn.dataset.sellRelicBelow) || 3;
        const low = (deps.getMeta().warehouse?.relics || []).filter((item) => {
          if (!item) return false;
          if (item.sealed) return false;
          const def = getRelicDef(item.defId);
          if (item.hidden || def?.hidden) return false;
          const tier = (item.tier | 0) || (def?.tier | 0) || 1;
          return tier > 0 && tier < below;
        });
        if (!low.length) {
          sfx.uiDeny();
          deps.toast('没有可一键出售的宝物');
          return;
        }
        const total = low.reduce((s, item) => s + relicSellPreview(item), 0);
        shopDetail = {
          title: '一键出售 T3 以下',
          desc: `将卖掉仓库里全部已鉴定的 T1/T2 宝物（共 ${low.length} 件），保留已鉴定 T3+、隐藏级与所有未鉴定包裹。`,
          priceLine: `预计 +${total} 海图碎片`,
          act: 'sellRelicBelow',
          actId: String(below),
          actLabel: '确认一键出售',
        };
        sfx.uiClick();
        renderShopDetail(deps.getMeta());
      });
    });

    const catalog = [...SHOP_HULLS, ...SHOP_SUPPLIES, ...SHOP_WEAPONS, ...SHOP_TALENTS];
    els.shop.querySelectorAll('[data-shop-key]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sfx.uiClick();
        const key = btn.dataset.shopKey || '';
        if (key.startsWith('sell:')) {
          const idx = Number(key.slice(5));
          const fish = meta.warehouse?.fish?.[idx];
          if (!fish) return;
          shopDetail = {
            title: fish.name,
            desc: `稀有度 ${rarityStars(fish.rarity || 1)} · 卖掉仓库鱼换碎片。卖价低于买价。`,
            priceLine: `售价 ${fishSellPrice(fish)} 海图碎片`,
            act: 'sell',
            actId: String(idx),
            actLabel: '确认出售',
          };
          renderShopDetail(deps.getMeta());
          return;
        }
        if (key.startsWith('sellrelic:')) {
          const idx = Number(key.slice(10));
          const item = meta.warehouse?.relics?.[idx];
          if (!item) return;
          const def = item.sealed ? null : getRelicDef(item.defId);
          const title = item.sealed ? '黑色包裹' : (def?.name || '宝物');
          const price = relicSellPreview(item);
          const desc = item.sealed
            ? '未鉴定包裹，可直接出售换碎片。'
            : `${tierLabel(def?.tier || item.tier, def?.hidden || item.hidden)} · ${def?.blurb || '鉴定宝物'}`;
          shopDetail = {
            title,
            desc,
            priceLine: `售价 ${price} 海图碎片`,
            act: 'sellRelic',
            actId: String(idx),
            actLabel: '确认出售',
          };
          renderShopDetail(deps.getMeta());
          return;
        }
        if (key.startsWith('supply:')) {
          const id = key.slice(7);
          const item = SHOP_SUPPLIES.find((s) => s.id === id);
          shopDetail = item
            ? {
              title: item.name,
              desc: item.desc,
              priceLine: `${item.cost} 海图碎片`,
              act: meta.fragments >= item.cost ? 'supply' : null,
              actId: id,
              actLabel: '购入',
            }
            : null;
          renderShopDetail(meta);
          return;
        }
        if (key.startsWith('fish:')) {
          const id = key.slice(5);
          const def = getFishDef(id);
          const cost = shopBuyCost(def);
          shopDetail = {
            title: def.name,
            desc: `${rarityStars(def.rarity)} · 进仓库，可绑槽或再卖掉（会亏差价）。4 星以上只能钓。`,
            priceLine: `${cost} 海图碎片（卖价 ${fishSellPrice({ defId: def.id, rarity: def.rarity, category: def.category })}）`,
            act: meta.fragments >= cost ? 'buyFish' : null,
            actId: id,
            actLabel: '购入',
          };
          renderShopDetail(meta);
          return;
        }
        if (key.startsWith('buy:')) {
          const id = key.slice(4);
          const item = catalog.find((s) => s.id === id);
          const weapon = SHOP_WEAPONS.find((w) => w.id === id);
          const talent = SHOP_TALENTS.find((t) => t.id === id);
          const isFreeSkill = !!weapon && weapon.cost <= 0;
          const owned = !!meta.unlocks[id] || isFreeSkill;
          let priceLine;
          let act = null;
          let actLabel = '学习';
          if (SHOP_HULLS.some((h) => h.id === id)) {
            priceLine = owned ? '已在港' : `${item.cost} 海图碎片`;
            act = (!owned && meta.fragments >= item.cost) ? 'buy' : null;
            actLabel = '购入船体';
          } else if (weapon) {
            const lv = owned ? skillLevel(meta, id) : 0;
            if (!owned) {
              priceLine = `${item.cost} 海图碎片学会`;
              act = meta.fragments >= item.cost ? 'buy' : null;
              actLabel = '学习';
            } else if (lv >= 3) {
              priceLine = 'Lv.3 满级';
            } else {
              const cost = skillUpgradeCost(id, lv);
              priceLine = `Lv.${lv} → ${lv + 1} · ${cost} 海图碎片`;
              act = meta.fragments >= cost ? 'upgradeSkill' : null;
              actLabel = `升到 ${lv + 1} 级`;
            }
          } else if (talent) {
            const lv = owned ? talentLevel(meta, id) : 0;
            if (!owned) {
              priceLine = `${item.cost} 海图碎片学会`;
              act = meta.fragments >= item.cost ? 'buy' : null;
              actLabel = '学习';
            } else if (lv >= 3) {
              priceLine = 'Lv.3 满级';
            } else {
              const cost = talentUpgradeCost(lv);
              priceLine = `Lv.${lv} → ${lv + 1} · ${cost} 海图碎片`;
              act = meta.fragments >= cost ? 'upgradeTalent' : null;
              actLabel = `升到 ${lv + 1} 级`;
            }
          } else {
            priceLine = owned ? '已入手' : `${item.cost} 海图碎片`;
            act = (!owned && meta.fragments >= item.cost) ? 'buy' : null;
          }
          shopDetail = item
            ? {
              title: item.name,
              desc: item.desc,
              priceLine: isFreeSkill && !owned ? '出航自带' : priceLine,
              act,
              actId: id,
              actLabel,
            }
            : null;
          renderShopDetail(meta);
        }
      });
    });

    // Fill fish portraits for sell cards
    if (shopTab === 'sell') {
      (meta.warehouse?.fish || []).forEach((f, i) => {
        const face = els.shop.querySelector(`[data-shop-key="sell:${i}"] .hub-shop-card-face`);
        if (!face || !f?.defId) return;
        try {
          const img = document.createElement('img');
          img.src = getFishPortrait(f.defId, f);
          img.alt = '';
          img.draggable = false;
          face.replaceChildren(img);
        } catch (_) { /* keep swatch */ }
      });
    }
    if (shopTab === 'supply' && shopSupplyZone === 'fish') {
      listShopBuyFishIds().forEach((id) => {
        const face = els.shop.querySelector(`[data-shop-key="fish:${id}"] .hub-shop-card-face`);
        if (!face) return;
        try {
          const img = document.createElement('img');
          img.src = getFishPortrait(id);
          img.alt = '';
          img.draggable = false;
          face.replaceChildren(img);
        } catch (_) { /* keep swatch */ }
      });
    }

    renderShopDetail(meta);
  }


  function showBmResult(r) {
    if (!els.bmDetail || !r?.def) return;
    els.bmDetail.innerHTML = `
      <div class="hub-bm-result">
        <div class="hub-bm-result-face">${relicFaceHtml(r.relic)}</div>
        <div class="hub-bm-result-body">
          <strong>${r.def.name}</strong>
          <p>${tierLabel(r.def.tier, r.def.hidden)} · ${r.def.museum}</p>
          <p>${r.def.blurb}</p>
          <p class="hub-shop-detail-price">估值 ${r.relic.sellPrice}（${r.def.sellMin}–${r.def.sellMax}）</p>
        </div>
      </div>`;
  }

  /** In-game confirm card — replaces native window.confirm inside the hub. */
  function openHubConfirm({ title, lines = [], confirmLabel = '确认', cancelLabel = '取消', onConfirm }) {
    document.getElementById('hub-confirm')?.remove();
    const host = document.getElementById('hub-bm-batch')?.parentElement || document.body;
    const wrap = document.createElement('div');
    wrap.id = 'hub-confirm';
    wrap.className = 'hub-bm-batch hub-confirm';
    wrap.innerHTML = `
      <div class="hub-bm-batch-panel">
        <h3 class="hub-bm-batch-title">${title}</h3>
        <div class="hub-confirm-body">${lines.map((l) => `<p>${l}</p>`).join('')}</div>
        <div class="hub-confirm-acts">
          <button type="button" class="bp-btn bright" data-confirm-ok>${confirmLabel}</button>
          <button type="button" class="bp-btn ghost" data-confirm-cancel>${cancelLabel}</button>
        </div>
      </div>`;
    host.appendChild(wrap);
    const close = () => {
      document.removeEventListener('keydown', onKey, true);
      wrap.remove();
    };
    function onKey(e) {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      sfx.uiClick();
      close();
    }
    document.addEventListener('keydown', onKey, true);
    wrap.querySelector('[data-confirm-ok]')?.addEventListener('click', () => {
      sfx.uiClick();
      close();
      onConfirm?.();
    });
    wrap.querySelector('[data-confirm-cancel]')?.addEventListener('click', () => {
      sfx.uiClick();
      close();
    });
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap) close();
    });
    wrap.querySelector('[data-confirm-ok]')?.focus();
  }

  function showBmBatchResults(results, msg) {
    const panel = document.getElementById('hub-bm-batch');
    const list = document.getElementById('hub-bm-batch-list');
    const closeBtn = document.getElementById('hub-bm-batch-close');
    if (!panel || !list) return;
    list.innerHTML = results.map((row) => `
      <div class="hub-bm-batch-row">
        <div class="hub-bm-batch-face">${relicFaceHtml(row.relic)}</div>
        <div class="hub-bm-batch-body">
          <strong>${row.def.name}${row.neu ? ' · 新' : ''}</strong>
          <span>${tierLabel(row.def.tier, row.def.hidden)} · 估值 ${row.relic.sellPrice}</span>
        </div>
      </div>`).join('') || `<p class="hub-empty">${msg || '无结果'}</p>`;
    panel.classList.remove('hidden');
    const close = () => panel.classList.add('hidden');
    closeBtn.onclick = close;
    panel.onclick = (e) => { if (e.target === panel) close(); };
  }

  function renderBlackMarket(meta) {
    if (!els.blackmarket) return;
    const relics = meta.warehouse?.relics || [];
    const sealed = relics
      .map((item, i) => ({ item, i }))
      .filter((x) => x.item?.sealed);
    const bal = meta.fragments | 0;
    const canOpen = Math.min(sealed.length, Math.floor(bal / APPRAISE_COST));
    const batchCost = canOpen * APPRAISE_COST;
    let cards;
    if (!sealed.length) {
      cards = '<p class="hub-empty">没有未鉴定的黑色包裹。出海捞包裹并成功归航后再来。</p>';
    } else {
      cards = sealed.map(({ item, i }) => shopCardHtml({
        key: `appraise:${i}`,
        title: '黑色包裹',
        sub: `鉴定 ${APPRAISE_COST}`,
        tone: '#2a2430',
        faceHtml: relicFaceHtml(item),
      })).join('');
    }
    const batchLabel = canOpen > 0
      ? `一键鉴宝 · ${canOpen}×${APPRAISE_COST}`
      : (sealed.length ? '一键鉴宝 · 碎片不足' : '一键鉴宝');
    els.blackmarket.innerHTML = `
      <div class="hub-shop-tabs"><span class="hub-shop-tab active">鉴宝</span></div>
      <p class="hub-fs-blurb">每件 ${APPRAISE_COST} 碎片 · 单开刮擦 · 可一键</p>
      <div class="hub-bm-toolbar">
        <button type="button" class="bp-btn bright hub-bm-batch-btn" data-bm-batch
          ${canOpen > 0 ? '' : 'disabled'}>${batchLabel}</button>
      </div>
      <div class="hub-shop-grid">${cards}</div>`;

    els.blackmarket.querySelector('[data-bm-batch]')?.addEventListener('click', () => {
      if (canOpen <= 0) {
        sfx.uiDeny();
        deps.toast(sealed.length ? `碎片不足（需要 ${APPRAISE_COST}）` : '没有未鉴定的包裹');
        return;
      }
      sfx.uiClick();
      openHubConfirm({
        title: '一键鉴定',
        lines: [
          `鉴定 ${canOpen} 件黑色包裹？`,
          `费用 ${batchCost} 海图碎片 · 余额 ${bal}`,
        ],
        confirmLabel: `确认 · ${batchCost} 碎片`,
        onConfirm: () => {
          const r = appraiseRelicsBatch(deps.getMeta());
          deps.toast(r.msg);
          if (!r.ok) {
            sfx.uiDeny();
            return;
          }
          sfx.uiBuy();
          deps.setMeta(r.meta);
          showBmBatchResults(r.results, r.msg);
          if (els.bmDetail) {
            els.bmDetail.innerHTML = `<strong>一键鉴定</strong><p>${r.msg}</p>`;
          }
          render();
        },
      });
    });

    els.blackmarket.querySelectorAll('[data-shop-key]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sfx.uiClick();
        const key = btn.dataset.shopKey || '';
        if (!key.startsWith('appraise:')) return;
        const idx = Number(key.slice(9));
        bmSelected = idx;
        const item = deps.getMeta().warehouse?.relics?.[idx];
        if (!item) return;
        if (els.bmDetail) {
          els.bmDetail.innerHTML = `
            <strong>黑色包裹</strong>
            <p>花费 ${APPRAISE_COST} 海图碎片后刮开涂层揭晓。物品仍留在仓库。</p>
            <p class="hub-shop-detail-price">费用 ${APPRAISE_COST} · 余额 ${deps.getMeta().fragments || 0}</p>
            <button type="button" class="bp-btn bright hub-shop-act" data-bm-appraise="${idx}">开始鉴定</button>`;
          els.bmDetail.querySelector('[data-bm-appraise]')?.addEventListener('click', () => {
            const r = appraiseRelic(deps.getMeta(), idx);
            deps.toast(r.msg);
            if (!r.ok) {
              sfx.uiDeny();
              return;
            }
            sfx.uiBuy();
            deps.setMeta(r.meta);
            render();
            openAppraiseScratch({
              faceHtml: relicFaceHtml(r.relic),
              onDone: () => {
                showBmResult(r);
              },
            });
            if (els.bmDetail) {
              els.bmDetail.innerHTML = `
                <strong>鉴定中…</strong>
                <p>擦开涂层揭晓宝物。也可点「直接揭开」。</p>`;
            }
          });
        }
      });
    });
  }

  function renderCodex(meta) {
    if (!els.codexList) return;
    if (els.drawerTitle && tab === 'codex') {
      els.drawerTitle.textContent = codexTab === 'monster' ? '怪物图鉴'
        : codexTab === 'relic' ? '宝物图鉴' : '鱼种图鉴';
    }
    els.codexSwitch?.querySelectorAll('[data-codex-tab]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.codexTab === codexTab);
      btn.onclick = () => {
        sfx.uiClick();
        codexTab = btn.dataset.codexTab;
        renderCodex(meta);
      };
    });
    if (codexTab === 'monster') renderMonsterCodex(meta);
    else if (codexTab === 'relic') renderRelicCodex(meta);
    else renderFishCodex(meta);
  }

  function renderRelicCodex(meta) {
    const unlocked = meta.relicCodex || {};
    const all = listRelicIds();
    const found = all.filter((id) => unlocked[id]).length;
    els.codexList.innerHTML = `
      <p class="codex-progress">已鉴定 ${found} / ${all.length}</p>
      <div class="codex-grid">
        ${all.map((id) => {
          const open = !!unlocked[id];
          const d = getRelicDef(id);
          const sel = selectedCodexId === id ? ' selected' : '';
          const hid = d?.hidden ? ' relic-hidden' : '';
          return `<button type="button" class="codex-entry polaroid${sel}${open ? '' : ' locked'}${hid}" data-codex="${id}">
            <span class="codex-entry-face">${open ? `<img src="${getRelicPortrait(id)}" alt="" draggable="false" />` : '?'}</span>
            <span class="codex-entry-name">${open ? d.name : '？？？'}</span>
          </button>`;
        }).join('')}
      </div>`;
    els.codexList.querySelectorAll('[data-codex]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sfx.uiClick();
        selectedCodexId = btn.dataset.codex;
        renderCodex(meta);
      });
    });
    if (!selectedCodexId || !all.includes(selectedCodexId)) {
      selectedCodexId = all.find((id) => unlocked[id]) || all[0] || null;
    }
    fillRelicDossier(meta, selectedCodexId);
  }

  function fillRelicDossier(meta, id) {
    const unlocked = meta.relicCodex || {};
    const open = !!unlocked[id];
    const d = getRelicDef(id);
    if (els.codexSerial) els.codexSerial.textContent = open && d ? `No. ${listRelicIds().indexOf(id) + 1}` : 'No. —';
    if (els.codexName) els.codexName.textContent = open && d ? d.name : '未鉴定';
    if (els.codexTag) {
      els.codexTag.textContent = open && d
        ? `${tierLabel(d.tier, d.hidden)} · ${d.museum}`
        : '黑市鉴定后解锁';
    }
    if (els.codexDesc) {
      els.codexDesc.textContent = open && d
        ? `${d.blurb} 售价约 ${d.sellMin}–${d.sellMax}。`
        : '出海捞黑色包裹，归航后在黑市花费 20 碎片鉴定。';
    }
    if (els.codexPortrait) {
      if (open) {
        els.codexPortrait.innerHTML = `<img src="${getRelicPortrait(id)}" alt="" draggable="false" style="width:78%;height:78%;margin:auto;display:block;object-fit:contain;" />`;
      } else {
        els.codexPortrait.innerHTML = '<span class="codex-q">?</span>';
      }
    }
  }


  function renderFishCodex(meta) {
    const unlocked = meta.codex || {};
    const all = listFishIds();
    const found = all.filter((id) => unlocked[id]).length;
    els.codexList.innerHTML = `
      <p class="codex-progress">已发现 ${found} / ${all.length}</p>
      <div class="codex-grid">
        ${all.map((id) => {
          const open = !!unlocked[id];
          const d = getFishDef(id);
          const sel = selectedCodexId === id ? ' selected' : '';
      const fam = open ? familyOf(id) : null;
          const famHtml = fam
            ? `<span class="codex-entry-fam" style="--fam:${fam.color}">${fam.name}</span>`
            : '';
          return `<button type="button" class="codex-entry polaroid${sel}${open ? '' : ' locked'}" data-codex="${id}">
            <span class="codex-entry-face">${open ? '' : '?'}</span>
            ${famHtml}
            <span class="codex-entry-name">${open ? d.name : (d.rarity >= 6 ? '？？？' : d.name)}</span>
          </button>`;
        }).join('')}
      </div>`;
    els.codexList.querySelectorAll('.codex-entry:not(.locked)').forEach((btn) => {
      const id = btn.dataset.codex;
      const face = btn.querySelector('.codex-entry-face');
      if (!face) return;
      try {
        const img = document.createElement('img');
        img.src = getFishPortrait(id);
        img.alt = '';
        img.draggable = false;
        face.replaceChildren(img);
      } catch (_) { face.textContent = '·'; }
    });
    els.codexList.querySelectorAll('[data-codex]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sfx.uiClick();
        selectedCodexId = btn.dataset.codex;
        renderCodex(meta);
      });
    });
    if (!selectedCodexId || !all.includes(selectedCodexId)) {
      selectedCodexId = all.find((id) => unlocked[id]) || all[0] || null;
    }
    fillFishDossier(meta, selectedCodexId);
  }

  function renderMonsterCodex(meta) {
    const unlocked = meta.monsterCodex || {};
    const all = listMonsterIds();
    const found = all.filter((id) => unlocked[id]).length;
    els.codexList.innerHTML = `
      <p class="codex-progress">已遭遇 ${found} / ${all.length}</p>
      <div class="codex-grid">
        ${all.map((id) => {
          const open = !!unlocked[id];
          const d = getMonsterDef(id);
          const sel = selectedMonsterId === id ? ' selected' : '';
          return `<button type="button" class="codex-entry polaroid${sel}${open ? '' : ' locked'}" data-monster="${id}">
            <span class="codex-entry-face">${open ? '' : '?'}</span>
            <span class="codex-entry-name">${open ? d.name : '？？？'}</span>
          </button>`;
        }).join('')}
      </div>`;
    els.codexList.querySelectorAll('.codex-entry:not(.locked)').forEach((btn) => {
      const id = btn.dataset.monster;
      const face = btn.querySelector('.codex-entry-face');
      if (!face) return;
      try {
        const img = document.createElement('img');
        img.src = getMonsterPortrait(id);
        img.alt = '';
        img.draggable = false;
        face.replaceChildren(img);
      } catch (_) { face.textContent = '·'; }
    });
    els.codexList.querySelectorAll('[data-monster]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sfx.uiClick();
        selectedMonsterId = btn.dataset.monster;
        renderCodex(meta);
      });
    });
    if (!selectedMonsterId || !all.includes(selectedMonsterId)) {
      selectedMonsterId = all.find((id) => unlocked[id]) || all[0] || null;
    }
    fillMonsterDossier(meta, selectedMonsterId);
  }

  function fillFishDossier(meta, id) {
    if (!id || !els.codexName) return;
    const unlocked = !!(meta.codex || {})[id];
    const def = getFishDef(id);
    const rarity = RARITY[def.rarity] || RARITY[1];
    const idx = listFishIds().indexOf(id) + 1;
    if (els.codexSerial) els.codexSerial.textContent = unlocked ? `No. ${String(1000 + idx).padStart(4, '0')}` : 'No. ????';
    if (els.codexName) els.codexName.textContent = unlocked
      ? def.name
      : ((def.rarity | 0) >= 6 ? '？？？' : '未记载物种');
    if (els.codexTag) {
      const slot = def.slot ? SLOT_LABELS[def.slot] : '\u6d88\u8017';
      const fam = unlocked ? familyLabel(def) : '';
      els.codexTag.textContent = unlocked
        ? `${rarity.label} \u00b7 ${catLabel(def.category)} \u00b7 ${slot}${fam ? ` \u00b7 ${fam}` : ''}`
        : '\u5c1a\u672a\u53d1\u73b0';
    }
    if (els.codexDesc) {
      els.codexDesc.textContent = unlocked
        ? fishCodexBody(def)
        : '出海钓到后记载';
    }
    if (els.codexPortrait) {
      els.codexPortrait.classList.toggle('locked', !unlocked);
      const fam = unlocked ? familyOf(id) : null;
      const chip = fam
        ? `<span class="codex-family-chip" style="--fam:${fam.color}">${fam.name}</span>`
        : '';
      els.codexPortrait.innerHTML = unlocked
        ? `${chip}<img src="${getFishPortrait(id)}" alt="" draggable="false" />`
        : '<span class="codex-q">?</span>';
    }
  }

  function fillMonsterDossier(meta, id) {
    if (!id || !els.codexName) return;
    const unlocked = !!(meta.monsterCodex || {})[id];
    const def = getMonsterDef(id);
    const idx = listMonsterIds().indexOf(id) + 1;
    if (els.codexSerial) els.codexSerial.textContent = unlocked ? `No. M${String(100 + idx)}` : 'No. M??';
    if (els.codexName) els.codexName.textContent = unlocked ? def.name : '未知海怪';
    if (els.codexTag) {
      els.codexTag.textContent = unlocked ? `${def.tag} · 威胁${'★'.repeat(Math.min(5, def.rarity || 1))}` : '尚未遭遇';
    }
    if (els.codexDesc) {
      els.codexDesc.textContent = unlocked
        ? def.desc
        : '击沉或斩断后记载。';
    }
    if (els.codexPortrait) {
      els.codexPortrait.classList.toggle('locked', !unlocked);
      els.codexPortrait.innerHTML = unlocked
        ? `<img src="${getMonsterPortrait(id)}" alt="" draggable="false" />`
        : '<span class="codex-q">?</span>';
    }
  }

  function fishCodexBody(def) {
    const fx = codexBlurb(def);
    const lore = def.desc || '';
    return [fx, lore].filter(Boolean).join('\n');
  }

  function catLabel(cat) {
    return ({ food: '消耗', weapon: '武器', engine: '动力', defense: '防御', utility: '机能', sense: '感知' })[cat] || '杂项';
  }

  function codexBlurb(def) {
    const e = def.effect || {};
    const s = def.side || {};
    const bits = [];
    if (e.ramMul) bits.push(`\u51b2\u649e \u00d7${e.ramMul}`);
    if (e.ramDmg) bits.push(`\u4f24 ${e.ramDmg}`);
    if (e.ramMul || e.ramDmg) bits.push(`\u649e\u51fb\u51b7\u5374 ${ramCdForRarity(def.rarity)}s`);
    const fam = familyOf(def);
    if (fam) bits.unshift(`\u65cf\uff1a${fam.name}（${fam.tip}\uff0c\u540c\u65cf\u53cc\u88c5\u5171\u9e23）`);
    if (e.dash) bits.push(`\u51b2\u523a ${e.dash}m`);
    if (e.freeze) bits.push(`\u51bb ${e.freeze}s`);
    if (e.shockwave) bits.push(e.shockDmg ? `冲击波伤 ${e.shockDmg}` : '冲击波');
    if (e.cd) bits.push(`CD ${e.cd}`);
    if (e.iFrame) bits.push(`无敌 ${e.iFrame}s`);
    if (e.autoThrust) bits.push(`持续推力 ${e.autoThrust}`);
    if (e.burst) bits.push(`爆发推 ${e.burst} 段`);
    if (e.hover) bits.push(`悬停 ${e.hover}s`);
    if (e.phase) bits.push(`相位 ${e.phase}s`);
    if (e.autoShot) bits.push(`自动射 ${e.shotDmg}，CD ${e.shotCd}，距 ${e.range}`);
    if (e.grab) bits.push(`抓取伤 ${e.grabDmg}`);
    if (e.whip) bits.push(`鞭抽伤 ${e.whipDmg}`);
    if (e.chargeCrush) bits.push(`蓄力碾 ${e.chargeCrush}s${e.crushDmg ? `，伤 ${e.crushDmg}` : ''}`);
    if (e.block) bits.push(`格挡 ${e.block}`);
    if (e.reflect) bits.push(`反伤 ${Math.round(e.reflect * 100)}%`);
    if (e.wallHits) bits.push(`墙 ${e.wallHits} 次 / ${e.wallTime}s`);
    if (e.reflectRanged) bits.push('反射远程弹');
    if (e.corrosionMul) bits.push(`腐蚀 ×${e.corrosionMul}`);
    if (e.jump) bits.push('可跳');
    if (e.dive) bits.push(`下潜 ${e.dive}s`);
    if (e.quake) bits.push('地震');
    if (e.tailwind) bits.push(`顺风 ×${e.tailwind}`);
    if (e.scan) bits.push(`扫描 ${e.scan}m`);
    if (e.storm) bits.push(`风暴 ${e.storm}s`);
    if (e.slowMo) bits.push(`慢动作 ${e.slowMo}s`);
    if (e.chainZap) bits.push(`击杀后雷跳第二只，伤 ${e.chainDmg}`);
    if (e.shoveWrap) bits.push('周期性弹开缠绕和漂浮物');
    if (e.pierce) bits.push(`穿刺最多 ${e.pierce} 只，伤 ${e.pierceDmg}`);
    if (e.convertHit) bits.push('下次船体伤变短加速（该次不掉血）');
    if (e.rewind) bits.push(`Q：回到约 ${e.rewind}s 前位置`);
    if (e.heatTrail) bits.push(`身后灼迹 DPS ${e.trailDps}`);
    if (e.painThrust) bits.push('受伤转短推力');
    if (e.root) bits.push(`定身近怪，伤 ${e.rootDmg}`);
    if (e.storeBurst) bits.push('吸伤，满了范围爆');
    if (e.onceImmunity) bits.push('本航次一次免疫海沟虫秒杀与强控');
    if (s.speedMul) bits.push(`速 ×${s.speedMul}`);
    if (s.turnMul) bits.push(`转向 ×${s.turnMul}`);
    if (s.lockSteer) bits.push(`锁舵 ${s.lockSteer}s`);
    if (s.slip) bits.push('甲板打滑');
    if (s.frictionDps) bits.push('摩擦伤 2/分');
    if (s.blur) bits.push(`视野糊 ${s.blur}s`);
    if (s.noPaddle) bits.push('期间不能划桨');
    if (s.reloadEvery) bits.push(`每 ${s.reloadEvery}s 要换弹`);
    if (s.shake) bits.push('镜头晃');
    if (s.recovery) bits.push(`收招 ${s.recovery}s`);
    if (s.weight) bits.push(`重量 ×${s.weight}`);
    if (s.accelMul) bits.push(`加速 ×${s.accelMul}`);
    if (s.loosenChance) bits.push('10% 松绑');
    if (s.hideSurface) bits.push('水面隐身');
    if (s.scatterLoot) bits.push('打散附近打捞物');
    if (s.headwind) bits.push(`逆风 ×${s.headwind}`);
    if (s.wakeSleepers) bits.push('吵醒沉睡怪');
    if (s.chainCd) bits.push('有内置 CD');
    if (s.hitch) bits.push('偶发顿船');
    if (s.chargeGap) bits.push('要充能间隔');
    if (s.rearmCd) bits.push('要重新充能');
    if (s.disorient) bits.push('随后短暂迷航');
    if (s.selfCorrosion) bits.push('自身腐蚀加快');
    if (s.heatCorrosion) bits.push('加速时腐蚀加快');
    if (s.drag) bits.push('定身时船略慢');
    if (s.breakArmor) bits.push('爆完短破防');
    if (s.spent) bits.push('用过即耗');
    return bits.join(' · ');
  }

  function syncMarkers() {
    if (!els.markers || !deps.projectAnchor) return;
    els.markers.querySelectorAll('[data-hub-spot]').forEach((btn) => {
      const p = deps.projectAnchor(btn.dataset.hubSpot);
      if (!p || p.behind) {
        btn.style.opacity = '0';
        btn.style.pointerEvents = 'none';
        return;
      }
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
      btn.style.left = `${p.x * 100}%`;
      btn.style.top = `${p.y * 100}%`;
      const spot = btn.dataset.hubSpot;
      const active = drawerOpen && spot === tab;
      btn.classList.toggle('active', active);
    });
  }

  els.btnClose?.addEventListener('click', () => closeDrawer());
  els.btnDepart?.addEventListener('click', () => {
    sfx.uiConfirm();
    deps.onDepart();
  });
  els.shipTabs.forEach((btn) => {
    btn.addEventListener('click', () => openSpot(btn.dataset.hubNav));
  });

  document.addEventListener('pointerdown', (e) => {
    if (!bindPickSlot) return;
    const pop = els.boatStage?.querySelector('#hub-slot-bind-pop');
    if (pop && pop.contains(e.target)) return;
    if (e.target.closest?.('.hub-callout')) return;
    closeSlotBindPicker();
  }, true);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (bindPickSlot) closeSlotBindPicker();
    if (whQtyDlg) closeWhBuyPop();
  });

  return {
    show,
    hide,
    render,
    openSpot,
    closeDrawer,
    syncMarkers,
    syncCallouts,
    refreshBoatPreview: refreshCenter,
    get tab() { return tab; },
    get drawerOpen() { return drawerOpen; },
    get shipUiOpen() { return drawerOpen && tab === 'prep'; },
  };
}
