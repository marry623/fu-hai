/** Hub UI — backpack desk; 整备=3D船, 出港=海域地图, 仓库=格子 */

import { ZONES } from './zones.js?v=29m';
import { SLOT_ORDER, SLOT_LABELS } from './slots.js';
import { getFishDef, FISH_CATALOG, RARITY } from './fishCatalog.js?v=29q';
import { getFishPortrait } from './fishPortrait.js?v=29q';
import { getItemPortrait } from './itemPortrait.js?v=29r';
import { listMonsterIds, getMonsterDef } from './monsterCatalog.js?v=30b';
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
  sellWarehouseFish,
  hubFeedFish,
  equipFromWarehouse,
  unequipToWarehouse,
  moveWarehouseToLoadoutCargo,
  returnCargoToWarehouse,
  saveLoadout,
  equippedSkills,
  cycleSkillSlot,
} from './meta.js?v=29s';
import { HUB_SPOTS } from './hubIsland.js?v=23h';

const TAB_TITLES = {
  prep: '整备',
  warehouse: '仓库',
  depart: '出港',
  shop: '商店',
  codex: '图鉴',
};

const SHIP_TABS = new Set(['prep', 'warehouse', 'depart']);
const CLIP_KEYS = ['prep', 'warehouse', 'depart', 'shop', 'codex'];
const FEATURE_LABELS = {
  none: '平静海域',
  current: '洋流缠绕',
  fog: '浓雾迷航',
  lightning: '雷暴裂隙',
  heat: '熔岩热流',
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
    shipTabs: [...document.querySelectorAll('.hub-ship-tab')],
    codexTabsWrap: document.getElementById('codex-switch'),
    clipPanels: {
      prep: document.getElementById('hub-fs-left-prep'),
      warehouse: document.getElementById('hub-fs-left-warehouse'),
      depart: document.getElementById('hub-fs-left-depart'),
      shop: document.getElementById('hub-fs-left-shop'),
      codex: document.getElementById('hub-fs-left-codex'),
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
  let shopDetail = null;

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
    if (id === 'shop' || id === 'codex') {
      els.shipTabs.forEach((b) => b.classList.add('hidden'));
    }
    els.codexTabsWrap?.classList.toggle('hidden', id !== 'codex');

    els.boatStage?.classList.toggle('hidden', !showBoat);
    els.mapStage?.classList.toggle('hidden', !showMap);
    els.warehouseStage?.classList.toggle('hidden', id !== 'warehouse');
    els.centerCodex?.classList.toggle('hidden', id !== 'codex');
    els.shopStage?.classList.toggle('hidden', id !== 'shop');

    els.drawer?.classList.toggle('is-boat-view', drawerOpen && showBoat);
    els.drawerCard?.classList.toggle('is-ship', ship);
    els.drawerCard?.classList.toggle('is-catalog', id === 'shop' || id === 'codex');
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

    renderDepartSummary(meta);
    renderPrepBackpack(meta);
    renderZones(meta);
    renderCargo(meta);
    renderWarehouse(meta);
    renderShop(meta);
    renderCodex(meta);
    if (drawerOpen && tab === 'prep') renderCallouts(meta);
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
        img.src = getFishPortrait(f.defId);
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
    `;
  }

  function renderPrepBackpack(meta) {
    if (!els.backpack) return;
    const slots = meta.loadout?.slots || {};
    const s = meta.warehouse?.supplies || {};
    const cargo = meta.loadout?.cargo || [];

    const supplyDefs = [
      { key: 'bait', label: '鱼饵', n: s.bait || 0 },
      { key: 'plank', label: '木板', n: s.plank || 0 },
      { key: 'repair', label: '修补剂', n: s.repair || 0 },
    ];
    const supplyCards = [];
    for (let i = 0; i < 6; i++) {
      const row = supplyDefs[i];
      if (row) {
        const take = row.key === 'bait' ? Math.min(3, row.n) : Math.min(1, row.n);
        let face = '<span class="hub-bp-q">?</span>';
        try {
          face = `<img src="${getItemPortrait(row.key)}" alt="" draggable="false" />`;
        } catch (_) { /* keep ? */ }
        supplyCards.push(`
          <div class="hub-bp-card" data-kind="supply">
            <div class="hub-bp-card-face">${face}</div>
            <div class="hub-bp-card-cap">${row.label}<span>×${row.n} · 带${take}</span></div>
          </div>`);
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
      let face = '<span class="hub-bp-q">?</span>';
      if (f?.defId) {
        try {
          face = `<img src="${getFishPortrait(f.defId)}" alt="" draggable="false" />`;
        } catch (_) {
          face = '<span class="hub-bp-q">鱼</span>';
        }
      }
      return `
        <div class="hub-bp-card${f ? '' : ' empty'}" data-kind="slot">
          <div class="hub-bp-card-face">${face}</div>
          <div class="hub-bp-card-cap">${idx + 1}. ${SLOT_LABELS[slot]}<span>${f ? f.name : '空'}</span></div>
        </div>`;
    }).join('');

    const weapons = [];
    for (const slot of SLOT_ORDER) {
      const f = slots[slot];
      if (!f?.defId) continue;
      try {
        const def = getFishDef(f.defId);
        if (def?.category === 'weapon') weapons.push({ ...f, from: 'slot' });
      } catch (_) { /* skip */ }
    }
    cargo.forEach((f, i) => {
      try {
        const def = getFishDef(f.defId);
        if (def?.category === 'weapon') weapons.push({ ...f, from: 'cargo', cargoIndex: i });
      } catch (_) { /* skip */ }
    });
    const weaponCards = [];
    for (let i = 0; i < 3; i++) {
      const f = weapons[i];
      if (f) {
        let face = '<span class="hub-bp-q">武</span>';
        try {
          face = `<img src="${getFishPortrait(f.defId)}" alt="" draggable="false" />`;
        } catch (_) { /* keep */ }
        weaponCards.push(`
          <div class="hub-bp-card" data-kind="weapon">
            <div class="hub-bp-card-face">${face}</div>
            <div class="hub-bp-card-cap">${f.name}<span>武器</span></div>
          </div>`);
      } else {
        weaponCards.push(`
          <div class="hub-bp-card empty" data-kind="weapon">
            <div class="hub-bp-card-face"><span class="hub-bp-q">?</span></div>
            <div class="hub-bp-card-cap">${i + 1}. 武器<span>空</span></div>
          </div>`);
      }
    }

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

    els.backpack.innerHTML = `
      <h3 class="hub-clip-h">船型</h3>
      <div class="hub-boats hub-prep-boats" id="hub-prep-boats">${boatBtns}</div>
      <p class="hub-bp-sec">物资</p>
      <div class="hub-bp-grid">${supplyCards.join('')}</div>
      <p class="hub-bp-sec">改装</p>
      <div class="hub-bp-grid">${modCards}</div>
      <p class="hub-bp-sec">技能牌 · 点按切换</p>
      <div class="hub-bp-grid">${skillSlotCards.join('')}</div>
      <p class="hub-bp-sec">武器</p>
      <div class="hub-bp-grid">${weaponCards.join('')}</div>`;

    els.backpack.querySelectorAll('[data-boat]').forEach((btn) => {
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
    els.backpack.querySelectorAll('[data-skill-slot]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const slot = Number(btn.dataset.skillSlot);
        const m = cycleSkillSlot(deps.getMeta(), slot);
        deps.setMeta(m);
        render();
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
      const unlocked = z.id === -1 || (meta.unlockedZones || [0]).includes(z.id);
      const selected = start === z.id;
      return `<div class="hub-zone ${selected ? 'selected' : ''} ${unlocked ? '' : 'locked'}">
        <button type="button" class="hub-zone-pick" data-pick-zone="${z.id}" ${unlocked ? '' : 'disabled'}>
          <strong><span class="hub-zone-swatch" style="background:${z.color || '#2ec4b6'}"></span>${z.name}</strong>
          <span>${unlocked
            ? (FEATURE_LABELS[z.feature] || z.unlockHint || '可出航')
            : (z.unlockHint || '航行归航解锁')}</span>
        </button>
      </div>`;
    }).join('');

    els.zones.querySelectorAll('[data-pick-zone]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = Number(btn.dataset.pickZone);
        if (id !== -1 && !(meta.unlockedZones || []).includes(id)) return;
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
    const fish = meta.warehouse?.fish || [];
    const boundSlots = meta.loadout?.slots || {};
    if (!fish.length) {
      els.warehouse.innerHTML = '';
      for (let i = 0; i < 20; i++) {
        els.warehouse.innerHTML += `<button type="button" class="bp-cell empty"><div class="bp-polaroid"><div class="bp-thumb"></div><div class="bp-cell-name">—</div></div></button>`;
      }
      return;
    }
    const cells = fish.map((f, i) => {
      const def = getFishDef(f.defId);
      const slot = def.slot;
      const occupied = !!(slot && boundSlots[slot]?.defId);
      let thumb = '';
      try {
        thumb = `<img class="bp-thumb-fish" src="${getFishPortrait(f.defId)}" alt="" draggable="false" />`;
      } catch (_) {
        thumb = `<div class="bp-thumb-blob" style="background:#4a90a4"></div>`;
      }
      const badge = slot
        ? `<span class="bp-slot-badge${occupied ? ' occupied' : ''}">${occupied ? '已占' : '可绑'}·${SLOT_LABELS[slot] || slot}</span>`
        : '';
      return `<div class="bp-cell hub-wh-cell" data-wh="${i}">
        <span class="bp-tape top"></span>
        ${badge}
        <div class="bp-polaroid">
          <div class="bp-thumb">${thumb}</div>
          <div class="bp-cell-name">${f.name}</div>
          <div class="bp-rarity-bar r${def.rarity || 1}"></div>
        </div>
        <span class="bp-tape bot"></span>
        <div class="hub-wh-acts-inline">
          ${slot ? `<button type="button" class="bp-btn dim" data-eq="${i}" data-slot="${slot}">绑</button>` : ''}
          <button type="button" class="bp-btn dim" data-cargo="${i}">带</button>
          <button type="button" class="bp-btn dim" data-feed="${i}">喂</button>
        </div>
      </div>`;
    });
    while (cells.length < 20) {
      cells.push(`<button type="button" class="bp-cell empty"><div class="bp-polaroid"><div class="bp-thumb"></div><div class="bp-cell-name">—</div></div></button>`);
    }
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
    els.supplies.innerHTML = `
      <p>仓库：饵 ${s.bait || 0} · 木板 ${s.plank || 0} · 修补剂 ${s.repair || 0}</p>
      <p>出港自动带：饵 ${Math.min(3, s.bait || 0)} · 木板 ${Math.min(1, s.plank || 0)} · 修补 ${Math.min(1, s.repair || 0)}</p>
      <p class="muted">预设携带：饵 ${lo.bait ?? 0} · 木板 ${lo.plank ?? 0} · 修补 ${lo.repair ?? 0}</p>
    `;
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
      sell: '先点鱼获，再在左侧确认出售。卖鱼是零钱，主收入来自归航。',
      hull: '买的是一艘在港船。归航带回；沉船丢失，木筏始终免费。',
      supply: '物资进仓库，出港自动带一部分。每次出航都会消耗。',
      weapon: '霜矛、雷矛、陨石出航自带。其余用海图碎片学会；准备界面选出港三张。',
      talent: '永久能力。沉船不会丢掉天赋。',
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
      cards = SHOP_SUPPLIES.map((item) => shopCardHtml({
        key: `supply:${item.id}`,
        title: item.name,
        sub: `${item.cost} 海图碎片 · ×${item.amount}`,
        tone: item.tone,
        itemId: item.id,
      })).join('');
    } else if (shopTab === 'weapon') {
      cards = SHOP_WEAPONS.map((item) => {
        const owned = item.cost <= 0 || !!meta.unlocks[item.id];
        return shopCardHtml({
          key: `buy:${item.id}`,
          title: item.name,
          sub: owned ? (item.cost <= 0 ? '出航自带' : '已学会') : `${item.cost} 海图碎片`,
          tone: item.tone,
          itemId: item.id,
          owned,
        });
      }).join('');
    } else if (shopTab === 'talent') {
      cards = SHOP_TALENTS.map((item) => {
        const owned = !!meta.unlocks[item.id];
        return shopCardHtml({
          key: `buy:${item.id}`,
          title: item.name,
          sub: owned ? '已学会' : `${item.cost} 海图碎片`,
          tone: item.tone,
          itemId: item.id,
          owned,
          disabled: owned,
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
            desc: `稀有度 ${'★'.repeat(Math.min(5, fish.rarity || 1))} · 卖鱼换零钱，主收入仍是归航`,
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
        if (key.startsWith('buy:')) {
          const id = key.slice(4);
          const item = catalog.find((s) => s.id === id);
          const weapon = SHOP_WEAPONS.find((w) => w.id === id);
          const isFreeSkill = !!weapon && weapon.cost <= 0;
          const owned = !!meta.unlocks[id] || isFreeSkill;
          shopDetail = item
            ? {
              title: item.name,
              desc: item.desc,
              priceLine: isFreeSkill
                ? '出航自带'
                : (owned ? (SHOP_HULLS.some((h) => h.id === id) ? '已在港' : '已学会') : `${item.cost} 海图碎片`),
              act: (!isFreeSkill && !owned && meta.fragments >= item.cost) ? 'buy' : null,
              actId: id,
              actLabel: SHOP_HULLS.some((h) => h.id === id) ? '购入船体' : '学习',
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
          img.src = getFishPortrait(f.defId);
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
            <span class="codex-entry-name">${d.name}</span>
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
    if (els.codexName) els.codexName.textContent = unlocked ? def.name : '未记载物种';
    if (els.codexTag) {
      els.codexTag.textContent = unlocked
        ? `${catLabel(def.category)} · ${rarity.label} · ${'★'.repeat(Math.min(5, def.rarity || 1))}`
        : '尚未发现';
    }
    if (els.codexDesc) {
      els.codexDesc.textContent = unlocked
        ? (def.desc || codexBlurb(def))
        : '这片海域里还有未知的鱼影。出海钓到它们后，图鉴才会写下名字与模样。';
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
        ? `${def.skillLabel}。${def.desc}`
        : '击沉或斩断对应海怪后，才会记入怪物图鉴。';
    }
    if (els.codexPortrait) {
      els.codexPortrait.classList.toggle('locked', !unlocked);
      els.codexPortrait.innerHTML = unlocked
        ? `<img src="${getMonsterPortrait(id)}" alt="" draggable="false" />`
        : '<span class="codex-q">?</span>';
    }
  }

  function catLabel(cat) {
    return ({ food: '消耗', weapon: '武器', engine: '动力', defense: '防御', utility: '机能', sense: '感知' })[cat] || '杂项';
  }

  function codexBlurb(def) {
    const e = def.effect || {};
    const bits = [];
    if (e.ramMul) bits.push(`冲撞×${e.ramMul}`);
    if (e.dash) bits.push(`冲刺 ${e.dash}m`);
    if (e.freeze) bits.push(`冰冻 ${e.freeze}s`);
    if (e.autoThrust) bits.push('持续推进');
    if (e.block) bits.push('格挡');
    if (e.tailwind) bits.push('顺风加速');
    if (def.slot) bits.push('专属槽位生效');
    return bits.length ? bits.join(' · ') : '海上奇物，绑到对应船槽后发挥力量。';
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
