/** Hub UI — backpack desk; 整备=3D船, 出港=海域地图, 仓库=格子 */

import { ZONES } from './zones.js?v=31y';
import { SLOT_ORDER, SLOT_LABELS } from './slots.js?v=31r';
import { getFishDef, FISH_CATALOG, RARITY, listShopBuyFishIds, shopBuyCost, BAIT_KINDS, rarityStars } from './fishCatalog.js?v=31u';
import { getFishPortrait } from './fishPortrait.js?v=31c';
import { getItemPortrait } from './itemPortrait.js?v=31c';
import { listMonsterIds, getMonsterDef } from './monsterCatalog.js?v=31g';
import { getMonsterPortrait } from './monsterPortrait.js?v=29p';
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
  buyWarehouseFish,
  upgradeSkill,
  upgradeTalent,
  skillLevel,
  talentLevel,
  skillUpgradeCost,
  talentUpgradeCost,
  sellWarehouseFish,
  hubFeedFish,
  equipFromWarehouse,
  unequipToWarehouse,
  moveWarehouseToLoadoutCargo,
  returnCargoToWarehouse,
  saveLoadout,
  equippedSkills,
  cycleSkillSlot,
  totalBait,
  baitStock,
  setLoadoutBaitKind,
  packSupply,
  unpackSupply,
  LOADOUT_BAG_SIZE,
  zoneTicketCost,
  canDepartZone,
} from './meta.js?v=31y';
import { HUB_SPOTS } from './hubIsland.js?v=31q';
import { renderManualHtml } from './hubManual.js?v=31y';

const TAB_TITLES = {
  prep: '整备',
  warehouse: '仓库',
  depart: '出港',
  shop: '商店',
  codex: '图鉴',
  library: '图书馆',
};

const SHIP_TABS = new Set(['prep', 'warehouse', 'depart']);
const CLIP_KEYS = ['prep', 'warehouse', 'depart', 'shop', 'codex', 'library'];
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
  bow: { x: 12, y: 22, n: 1, side: 'L' },
  sideL: { x: 12, y: 48, n: 2, side: 'L' },
  keel: { x: 12, y: 74, n: 3, side: 'L' },
  sail: { x: 88, y: 22, n: 4, side: 'R' },
  sideR: { x: 88, y: 48, n: 5, side: 'R' },
  stern: { x: 88, y: 74, n: 6, side: 'R' },
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
    libraryStage: document.getElementById('hub-library-stage'),
    libraryBody: document.getElementById('hub-library-body'),
    shipTabs: [...document.querySelectorAll('.hub-ship-tab')],
    codexTabsWrap: document.getElementById('codex-switch'),
    clipPanels: {
      prep: document.getElementById('hub-fs-left-prep'),
      warehouse: document.getElementById('hub-fs-left-warehouse'),
      depart: document.getElementById('hub-fs-left-depart'),
      shop: document.getElementById('hub-fs-left-shop'),
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
  let shopSupplyZone = 'bait';
  let warehouseTab = 'fish';
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
    setTab(id);
    openDrawer();
    deps.onSpotOpen?.(id);
  }

  function openDrawer() {
    drawerOpen = true;
    els.drawer?.classList.remove('hidden');
    root?.classList.add('drawer-open');
    refreshCenter();
  }

  function closeDrawer() {
    drawerOpen = false;
    els.drawer?.classList.add('hidden');
    root?.classList.remove('drawer-open');
    els.drawer?.classList.remove('is-boat-view');
    deps.boatPreview?.setVisible(false);
    deps.onSpotOpen?.(null);
  }

  function setTab(id) {
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
    if (id === 'shop' || id === 'codex' || id === 'library') {
      els.shipTabs.forEach((b) => b.classList.add('hidden'));
    }
    els.codexTabsWrap?.classList.toggle('hidden', id !== 'codex');

    els.boatStage?.classList.toggle('hidden', !showBoat);
    els.mapStage?.classList.toggle('hidden', !showMap);
    els.warehouseStage?.classList.toggle('hidden', id !== 'warehouse');
    els.centerCodex?.classList.toggle('hidden', id !== 'codex');
    els.shopStage?.classList.toggle('hidden', id !== 'shop');
    els.libraryStage?.classList.toggle('hidden', id !== 'library');

    els.drawer?.classList.toggle('is-boat-view', drawerOpen && showBoat);
    els.drawerCard?.classList.toggle('is-ship', ship);
    els.drawerCard?.classList.toggle('is-catalog', id === 'shop' || id === 'codex');
    els.drawerCard?.classList.toggle('is-library', id === 'library');
    els.drawerCard?.classList.remove('hub-sea-gold');
    els.mat?.classList.toggle('is-boat', showBoat);

    if (els.drawerTitle) {
      if (id === 'codex') {
        els.drawerTitle.textContent = codexTab === 'monster' ? '怪物图鉴' : '鱼种图鉴';
      } else {
        els.drawerTitle.textContent = TAB_TITLES[id] || id;
      }
    }
    if (els.matMeta) {
      els.matMeta.textContent = id === 'prep'
        ? '配装预览'
        : id === 'warehouse'
          ? '鱼获'
            : id === 'depart'
            ? '海域全貌'
            : id === 'library'
              ? '手册'
              : (id === 'codex' ? '图鉴' : '商店');
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
        ? '\u70b9\u51fb\u5efa\u7b51\u8fdb\u5165\u529f\u80fd \u00b7 \u6e2f\u53e3\u51fa\u6e2f \u00b7 \u8239\u57d9\u6574\u5907 \u00b7 \u5e02\u96c6\u5546\u5e97 \u00b7 \u5c55\u9986\u56fe\u9274 \u00b7 \u56fe\u4e66\u9986\u6559\u7a0b'
        : '\u5148\u5b8c\u6210\u7ec3\u4e60\u6e7e\u5f52\u822a\u624d\u80fd\u51fa\u6d45\u6ee9\u3002\u53ef\u5148\u770b\u5e02\u96c6\u3001\u4ed3\u5e93\u3001\u6574\u5907\u4e0e\u56fe\u4e66\u9986\u3002';
    }
    renderDepartSummary(meta);
    ensureWarehouseChrome();
    renderLoadoutBackpack(meta, els.backpack);
    renderLoadoutBackpack(meta, document.getElementById('hub-wh-backpack'));
    renderZones(meta);
    renderCargo(meta);
    renderWarehouse(meta);
    renderShop(meta);
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

  function renderCallouts(meta) {
    if (!els.callouts) return;
    const slots = meta.loadout?.slots || {};
    els.callouts.innerHTML = SLOT_ORDER.map((slot) => {
      const lay = CALLOUT_LAYOUT[slot] || { x: 50, y: 50, n: 0 };
      const f = slots[slot];
      const empty = !f?.defId;
      const status = empty ? '可绑' : '已绑';
      return `<button type="button" class="hub-callout${empty ? ' empty' : ' filled'}" data-slot="${slot}"
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
          deps.toast(`${SLOT_LABELS[slot]}为空 — 去仓库绑鱼`);
          if (tab !== 'warehouse') setTab('warehouse');
          return;
        }
        const r = unequipToWarehouse(deps.getMeta(), slot);
        deps.toast(r.msg || (r.ok ? '已卸下' : '失败'));
        if (r.ok) {
          deps.setMeta(r.meta);
          render();
          refreshCenter();
        }
      });
    });
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
      { id: 'raft', name: '木筏', need: true },
      { id: 'heavyRaft', name: '重筏', need: !!meta.unlocks.heavyRaft },
      { id: 'chargeBoat', name: '冲锋船', need: !!meta.unlocks.chargeBoat },
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
      <p class="hub-bp-sec">携带</p>
      <div class="hub-bp-grid">${cargoCards.join('')}</div>`;

    root.querySelectorAll('[data-boat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.boat;
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
        const m = cycleSkillSlot(deps.getMeta(), slot);
        deps.setMeta(m);
        render();
      });
    });
    root.querySelectorAll('[data-unpack]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const r = unpackSupply(deps.getMeta(), btn.dataset.unpack);
        deps.toast(r.msg);
        if (r.ok) { deps.setMeta(r.meta); render(); }
      });
    });
    root.querySelectorAll('[data-uncargo]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const r = returnCargoToWarehouse(deps.getMeta(), Number(btn.dataset.uncargo));
        deps.toast(r.ok ? '已放回仓库' : (r.msg || '失败'));
        if (r.ok) { deps.setMeta(r.meta); render(); }
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
        if (!canDepartZone(meta, id).ok) return;
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
        if (r.ok) { deps.setMeta(r.meta); render(); }
      });
    });
  }

  function renderWarehouse(meta) {
    if (!els.warehouse) return;
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
      ].map((z) => `<button type="button" class="hub-shop-tab${warehouseTab === z.id ? ' active' : ''}" data-wh-tab="${z.id}">${z.name}</button>`).join('');
      nav.querySelectorAll('[data-wh-tab]').forEach((btn) => {
        btn.addEventListener('click', () => {
          warehouseTab = btn.dataset.whTab;
          render();
        });
      });
    }

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
        return `<div class="bp-cell hub-wh-cell">
          <span class="bp-tape top"></span>
          <div class="bp-polaroid">
            <div class="bp-thumb">${thumb}</div>
            <div class="bp-cell-name">${item.name}</div>
            <div class="bp-rarity-bar r1"></div>
            <div class="hub-wh-acts-inline">
              <button type="button" class="bp-btn dim" data-pack="${item.id}" ${n ? '' : 'disabled'}>装 ×${n}</button>
            </div>
          </div>
        </div>`;
      });
      while (cells.length < 20) cells.push(emptyWarehouseCell(1));
      els.warehouse.innerHTML = cells.join('');
      els.warehouse.querySelectorAll('[data-pack]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const r = packSupply(deps.getMeta(), btn.dataset.pack);
          deps.toast(r.msg);
          if (r.ok) { deps.setMeta(r.meta); render(); }
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
      return `<div class="bp-cell hub-wh-cell" data-wh="${i}">
        <span class="bp-tape top"></span>
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
        if (r.ok) { deps.setMeta(r.meta); render(); }
      });
    });
    els.warehouse.querySelectorAll('[data-cargo]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const r = moveWarehouseToLoadoutCargo(meta, Number(btn.dataset.cargo));
        deps.toast(r.msg || (r.ok ? '已加入携带' : '失败'));
        if (r.ok) { deps.setMeta(r.meta); render(); }
      });
    });
    els.warehouse.querySelectorAll('[data-feed]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const r = hubFeedFish(meta, Number(btn.dataset.feed));
        deps.toast(r.msg);
        if (r.ok) { deps.setMeta(r.meta); render(); }
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
      sell: '卖掉仓库鱼换碎片。卖价低于买价。',
      hull: '木筏免费。重筏 / 冲锋船买的是一艘在港船，沉了要重买。',
      supply: '饵和修理剂入仓库，出港再装进 8 格背包。1–3 星鱼可直购。',
      weapon: '学会永久。出航带 3 张。可升到 3 级。',
      talent: '永久。可升到 3 级。',
    }[shopTab] || '';
    let detail = `<h3 class="hub-clip-h">${tabMeta?.name || '商店'}</h3>
      <p class="hub-fs-blurb">${blurb}</p>
      <p class="hub-fs-blurb">海图碎片 <strong>${meta.fragments || 0}</strong></p>`;
    if (shopDetail) {
      const actBtn = shopDetail.act
        ? `<button type="button" class="bp-btn bright hub-shop-act" data-shop-act="${shopDetail.act}" data-shop-act-id="${shopDetail.actId}">${shopDetail.actLabel}</button>`
        : '';
      detail += `<div class="hub-shop-detail">
        <strong>${shopDetail.title}</strong>
        <p>${shopDetail.desc || ''}</p>
        <p class="hub-shop-detail-price">${shopDetail.priceLine || ''}</p>
        ${actBtn}
      </div>`;
    } else {
      detail += `<p class="hub-fs-blurb muted">选中卡片查看说明</p>`;
    }
    panel.innerHTML = detail;
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
          shopDetail = {
            title: fish?.name || '已售出',
            desc: '已换成海图碎片',
            priceLine: `+${r.price} 海图碎片`,
          };
          deps.setMeta(r.meta);
          render();
        }
        return;
      }
      if (act === 'supply') {
        const r = buySupply(deps.getMeta(), actId);
        deps.toast(r.msg);
        if (r.ok) { deps.setMeta(r.meta); render(); }
        return;
      }
      if (act === 'buyFish') {
        const r = buyWarehouseFish(deps.getMeta(), actId);
        deps.toast(r.msg);
        if (r.ok) { deps.setMeta(r.meta); render(); }
        return;
      }
      if (act === 'upgradeSkill') {
        const r = upgradeSkill(deps.getMeta(), actId);
        deps.toast(r.msg);
        if (r.ok) { deps.setMeta(r.meta); render(); }
        return;
      }
      if (act === 'upgradeTalent') {
        const r = upgradeTalent(deps.getMeta(), actId);
        deps.toast(r.msg);
        if (r.ok) { deps.setMeta(r.meta); render(); }
        return;
      }
      if (act === 'buy') {
        const r = tryUnlock(deps.getMeta(), actId);
        deps.toast(r.msg);
        if (r.ok) {
          shopDetail = { ...shopDetail, act: null, priceLine: '已入手' };
          deps.setMeta(r.meta);
          if (SHOP_HULLS.some((h) => h.id === actId)) {
            deps.setBoat(actId);
            deps.boatPreview?.syncLoadout?.(r.meta);
          }
          render();
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
      const fish = meta.warehouse?.fish || [];
      if (!fish.length) {
        cards = `<p class="hub-empty">仓库暂无鱼获可售</p>`;
      } else {
        cards = fish.map((f, i) => {
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
            sub: `${rarityStars(def.rarity)} · ${cost}`,
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
        shopTab = btn.dataset.shopTab;
        shopDetail = null;
        renderShop(meta);
      });
    });
    els.shop.querySelectorAll('[data-supply-zone]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        shopSupplyZone = btn.dataset.supplyZone;
        shopDetail = null;
        renderShop(meta);
      });
    });

    const catalog = [...SHOP_HULLS, ...SHOP_SUPPLIES, ...SHOP_WEAPONS, ...SHOP_TALENTS];
    els.shop.querySelectorAll('[data-shop-key]').forEach((btn) => {
      btn.addEventListener('click', () => {
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

  function renderCodex(meta) {
    if (!els.codexList) return;
    if (els.drawerTitle && tab === 'codex') {
      els.drawerTitle.textContent = codexTab === 'monster' ? '怪物图鉴' : '鱼种图鉴';
    }
    els.codexSwitch?.querySelectorAll('[data-codex-tab]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.codexTab === codexTab);
      btn.onclick = () => {
        codexTab = btn.dataset.codexTab;
        renderCodex(meta);
      };
    });
    if (codexTab === 'monster') renderMonsterCodex(meta);
    else renderFishCodex(meta);
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
          return `<button type="button" class="codex-entry polaroid${sel}${open ? '' : ' locked'}" data-codex="${id}">
            <span class="codex-entry-face">${open ? '' : '?'}</span>
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
      const slot = def.slot ? SLOT_LABELS[def.slot] : '消耗';
      els.codexTag.textContent = unlocked
        ? `${rarity.label} · ${catLabel(def.category)} · ${slot}`
        : '尚未发现';
    }
    if (els.codexDesc) {
      els.codexDesc.textContent = unlocked
        ? fishCodexBody(def)
        : '出海钓到后记载';
    }
    if (els.codexPortrait) {
      els.codexPortrait.classList.toggle('locked', !unlocked);
      els.codexPortrait.innerHTML = unlocked
        ? `<img src="${getFishPortrait(id)}" alt="" draggable="false" />`
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
    if (e.ramMul) bits.push(`冲撞 ×${e.ramMul}`);
    if (e.ramDmg) bits.push(`伤 ${e.ramDmg}`);
    if (e.dash) bits.push(`冲刺 ${e.dash}m`);
    if (e.freeze) bits.push(`冻 ${e.freeze}s`);
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
  els.btnDepart?.addEventListener('click', () => deps.onDepart());
  els.shipTabs.forEach((btn) => {
    btn.addEventListener('click', () => openSpot(btn.dataset.hubNav));
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
