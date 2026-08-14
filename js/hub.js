/** Hub UI — island markers + drawer panels for each building */

import { ZONES } from './zones.js';
import { SLOT_ORDER, SLOT_LABELS } from './slots.js';
import { getFishDef } from './fishCatalog.js';
import {
  SHOP,
  ZONE_UNLOCK_COST,
  tryUnlock,
  tryUnlockZone,
  hubRepairHull,
  hubFeedFish,
  equipFromWarehouse,
  unequipToWarehouse,
  moveWarehouseToLoadoutCargo,
  returnCargoToWarehouse,
  saveLoadout,
} from './meta.js';
import { HUB_SPOTS } from './hubIsland.js';

const TAB_TITLES = {
  depart: '出港 · 港口码头',
  prep: '整备 · 船坞工棚',
  shop: '商店 · 海岛市集',
  codex: '图鉴 · 鱼种展馆',
};

/**
 * @param {object} deps
 */
export function createHub(deps) {
  const root = document.getElementById('hub-overlay');
  const els = {
    frags: document.getElementById('hub-frags'),
    best: document.getElementById('hub-best'),
    zones: document.getElementById('hub-zones'),
    boats: document.getElementById('hub-boats'),
    slots: document.getElementById('hub-slots'),
    cargo: document.getElementById('hub-cargo'),
    warehouse: document.getElementById('hub-warehouse'),
    supplies: document.getElementById('hub-supplies'),
    shop: document.getElementById('hub-shop'),
    codex: document.getElementById('hub-codex'),
    markers: document.getElementById('hub-markers'),
    drawer: document.getElementById('hub-drawer'),
    drawerTitle: document.getElementById('hub-drawer-title'),
    btnClose: document.getElementById('hub-drawer-close'),
    tabBtns: [...document.querySelectorAll('[data-hub-tab]')],
    panels: {
      depart: document.getElementById('hub-panel-depart'),
      prep: document.getElementById('hub-panel-prep'),
      shop: document.getElementById('hub-panel-shop'),
      codex: document.getElementById('hub-panel-codex'),
    },
    btnDepart: document.getElementById('btn-depart'),
    btnRepair: document.getElementById('btn-hub-repair'),
  };

  let tab = 'depart';
  let drawerOpen = false;

  // Build floating markers once
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
  }

  function closeDrawer() {
    drawerOpen = false;
    els.drawer?.classList.add('hidden');
    root?.classList.remove('drawer-open');
    deps.onSpotOpen?.(null);
  }

  function setTab(id) {
    tab = id;
    els.tabBtns.forEach((b) => b.classList.toggle('active', b.dataset.hubTab === id));
    Object.entries(els.panels).forEach(([k, el]) => {
      el?.classList.toggle('hidden', k !== id);
    });
    if (els.drawerTitle) els.drawerTitle.textContent = TAB_TITLES[id] || id;
    els.markers?.querySelectorAll('[data-hub-spot]').forEach((m) => {
      m.classList.toggle('active', m.dataset.hubSpot === id && drawerOpen);
    });
    render();
  }

  function render() {
    const meta = deps.getMeta();
    if (els.frags) els.frags.textContent = String(meta.fragments);
    if (els.best) els.best.textContent = `${meta.bestDistance || 0}m`;

    renderZones(meta);
    renderBoats(meta);
    renderSlots(meta);
    renderCargo(meta);
    renderWarehouse(meta);
    renderSupplies(meta);
    renderShop(meta);
    renderCodex(meta);
  }

  function renderZones(meta) {
    if (!els.zones) return;
    const start = deps.getStartZone();
    els.zones.innerHTML = ZONES.map((z) => {
      const unlocked = (meta.unlockedZones || [0]).includes(z.id);
      const selected = start === z.id;
      const cost = ZONE_UNLOCK_COST[z.id];
      let action = '';
      if (!unlocked && cost != null) {
        action = `<button type="button" class="hub-mini" data-unlock-zone="${z.id}">解锁 ${cost}碎片</button>`;
      }
      return `<div class="hub-zone ${selected ? 'selected' : ''} ${unlocked ? '' : 'locked'}">
        <button type="button" class="hub-zone-pick" data-pick-zone="${z.id}" ${unlocked ? '' : 'disabled'}>
          <strong><span class="hub-zone-swatch" style="background:${z.color}"></span>${z.name}</strong>
          <span>${unlocked ? (selected ? '本局目标 · 已选' : '已解锁') : z.unlockHint}</span>
        </button>
        ${action}
      </div>`;
    }).join('');

    els.zones.querySelectorAll('[data-pick-zone]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = Number(btn.dataset.pickZone);
        if (!(meta.unlockedZones || []).includes(id)) return;
        deps.setStartZone(id);
        render();
      });
    });
    els.zones.querySelectorAll('[data-unlock-zone]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = Number(btn.dataset.unlockZone);
        const r = tryUnlockZone(meta, id);
        deps.toast(r.msg);
        if (r.ok) {
          deps.setMeta(r.meta);
          deps.setStartZone(id);
          render();
        }
      });
    });
  }

  function renderBoats(meta) {
    if (!els.boats) return;
    const boats = [
      { id: 'raft', name: '木筏', need: true },
      { id: 'lightBoat', name: '轻舟', need: meta.unlocks.lightBoat },
      { id: 'heavyRaft', name: '重筏', need: meta.unlocks.heavyRaft },
      { id: 'cursedBoat', name: '怪谈船', need: meta.unlocks.cursedBoat },
    ];
    const cur = deps.getBoat();
    els.boats.innerHTML = boats.map((b) => `
      <button type="button" class="hub-chip ${cur === b.id ? 'selected' : ''}"
        data-boat="${b.id}" ${b.need ? '' : 'disabled'}>${b.name}${b.need ? '' : ' 🔒'}</button>
    `).join('');
    els.boats.querySelectorAll('[data-boat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.boat;
        deps.setBoat(id);
        const m = saveLoadout(meta, { ...meta.loadout, boatId: id });
        deps.setMeta(m);
        render();
      });
    });
  }

  function renderSlots(meta) {
    if (!els.slots) return;
    const slots = meta.loadout?.slots || {};
    els.slots.innerHTML = SLOT_ORDER.map((s) => {
      const f = slots[s];
      return `<div class="hub-slot-row">
        <span class="hub-slot-lab">${SLOT_LABELS[s]}</span>
        <span class="hub-slot-fish">${f ? `${f.name} · 活${Math.floor(f.vitality ?? 100)}` : '空'}</span>
        ${f ? `<button type="button" class="hub-mini" data-unequip="${s}">卸下</button>` : ''}
      </div>`;
    }).join('');
    els.slots.querySelectorAll('[data-unequip]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const r = unequipToWarehouse(meta, btn.dataset.unequip);
        if (r.ok) { deps.setMeta(r.meta); render(); }
      });
    });
  }

  function renderCargo(meta) {
    if (!els.cargo) return;
    const cargo = meta.loadout?.cargo || [];
    if (!cargo.length) {
      els.cargo.innerHTML = '<p class="hub-empty">未携带 — 在整备里点「携带」</p>';
      return;
    }
    els.cargo.innerHTML = cargo.map((f, i) => `
      <div class="hub-wh-row">
        <span>${f.name} <small>活${Math.floor(f.vitality ?? 100)}</small></span>
        <button type="button" class="hub-mini" data-uncargo="${i}">放回仓库</button>
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
    if (!fish.length) {
      els.warehouse.innerHTML = '<p class="hub-empty">仓库空空如也 — 归航后入库</p>';
      return;
    }
    els.warehouse.innerHTML = fish.map((f, i) => {
      const def = getFishDef(f.defId);
      const slot = def.slot;
      return `<div class="hub-wh-row">
        <span>${f.name} <small>活${Math.floor(f.vitality ?? 100)}</small></span>
        <div class="hub-wh-acts">
          ${slot ? `<button type="button" class="hub-mini" data-eq="${i}" data-slot="${slot}">绑${SLOT_LABELS[slot] || slot}</button>` : ''}
          <button type="button" class="hub-mini" data-cargo="${i}">携带</button>
          <button type="button" class="hub-mini" data-feed="${i}">投喂</button>
        </div>
      </div>`;
    }).join('');

    els.warehouse.querySelectorAll('[data-eq]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const r = equipFromWarehouse(meta, Number(btn.dataset.eq), btn.dataset.slot);
        deps.toast(r.msg || (r.ok ? '已绑槽' : '失败'));
        if (r.ok) { deps.setMeta(r.meta); render(); }
      });
    });
    els.warehouse.querySelectorAll('[data-cargo]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const r = moveWarehouseToLoadoutCargo(meta, Number(btn.dataset.cargo));
        deps.toast(r.msg || (r.ok ? '已加入携带' : '失败'));
        if (r.ok) { deps.setMeta(r.meta); render(); }
      });
    });
    els.warehouse.querySelectorAll('[data-feed]').forEach((btn) => {
      btn.addEventListener('click', () => {
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
      <p>出港将自动携带：饵 ${Math.min(3, s.bait || 0)} · 木板 ${Math.min(1, s.plank || 0)} · 修补 ${Math.min(1, s.repair || 0)}</p>
      <p class="muted">当前预设携带：饵 ${lo.bait ?? 0} · 木板 ${lo.plank ?? 0} · 修补 ${lo.repair ?? 0}</p>
    `;
  }

  function renderShop(meta) {
    if (!els.shop) return;
    els.shop.innerHTML = SHOP.map((item) => {
      const owned = !!meta.unlocks[item.id];
      return `<div class="hub-shop-row">
        <div><strong>${item.name}</strong><span>${item.desc}</span></div>
        <button type="button" class="hub-mini" data-buy="${item.id}"
          ${owned || meta.fragments < item.cost ? 'disabled' : ''}>
          ${owned ? '已拥有' : `${item.cost} 碎片`}
        </button>
      </div>`;
    }).join('');
    els.shop.querySelectorAll('[data-buy]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const r = tryUnlock(meta, btn.dataset.buy);
        deps.toast(r.msg);
        if (r.ok) { deps.setMeta(r.meta); render(); }
      });
    });
  }

  function renderCodex(meta) {
    if (!els.codex) return;
    const ids = Object.keys(meta.codex || {});
    els.codex.innerHTML = ids.length
      ? `<p>已发现 ${ids.length} 种</p><div class="hub-codex-grid">${ids.map((id) => {
        const d = getFishDef(id);
        return `<span class="hub-codex-chip">${d.name}</span>`;
      }).join('')}</div>`
      : '<p class="hub-empty">图鉴空 — 出海发现新鱼种</p>';
  }

  /** Project 3D anchors to screen for markers */
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
      btn.classList.toggle('active', btn.dataset.hubSpot === tab && drawerOpen);
    });
  }

  els.tabBtns.forEach((b) => b.addEventListener('click', () => {
    setTab(b.dataset.hubTab);
    openDrawer();
    deps.onSpotOpen?.(b.dataset.hubTab);
  }));
  els.btnClose?.addEventListener('click', () => closeDrawer());
  els.btnDepart?.addEventListener('click', () => deps.onDepart());
  els.btnRepair?.addEventListener('click', () => {
    const r = hubRepairHull(deps.getMeta(), 2);
    deps.toast(r.msg);
    if (r.ok) { deps.setMeta(r.meta); render(); }
  });

  return {
    show,
    hide,
    render,
    openSpot,
    closeDrawer,
    syncMarkers,
    get tab() { return tab; },
    get drawerOpen() { return drawerOpen; },
  };
}
