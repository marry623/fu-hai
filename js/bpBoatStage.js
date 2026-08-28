/** In-run backpack slots tab: 3D boat + 6 callouts (hub prep look). */

import * as THREE from 'three';
import { createToonGradient } from './stylekit.js';
import { createBoat, setBoatVariant, hullUpscale } from './boat.js?v=42h';
import { equipFish, SLOT_ORDER, SLOT_LABELS } from './slots.js?v=39b';
import { getFishDef } from './fishCatalog.js?v=34b';
import { getFishPortrait } from './fishPortrait.js?v=31d';

const CALLOUT_LAYOUT = {
  bow: { x: 12, y: 22, side: 'L' },
  sideL: { x: 12, y: 48, side: 'L' },
  keel: { x: 12, y: 74, side: 'L' },
  sail: { x: 88, y: 22, side: 'R' },
  sideR: { x: 88, y: 48, side: 'R' },
  stern: { x: 88, y: 74, side: 'R' },
};

const _v = new THREE.Vector3();

/**
 * @param {{ mat: HTMLElement, grid: HTMLElement, onSelectSlot: (slot: string) => void }} opts
 */
export function createBpBoatStage(opts) {
  const mat = opts.mat;
  const grid = opts.grid;
  const colNums = mat?.querySelector('.bp-col-nums');

  const stage = document.createElement('div');
  stage.id = 'bp-boat-stage';
  stage.className = 'bp-boat-stage hidden';

  const canvas = document.createElement('canvas');
  canvas.id = 'bp-boat-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'hub-callout-lines');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');

  const callouts = document.createElement('div');
  callouts.className = 'hub-callouts';

  stage.append(canvas, svg, callouts);
  if (grid && grid.parentNode === mat) mat.insertBefore(stage, grid);
  else mat?.appendChild(stage);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 80);
  camera.position.set(11.0, 8.0, 13.5);
  camera.lookAt(0.3, 5.0, -0.4);

  const gm = opts.gradientMap || createToonGradient();
  scene.add(new THREE.AmbientLight(0xffffff, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(4, 8, 5);
  scene.add(key);

  const sea = new THREE.Mesh(
    new THREE.CircleGeometry(18, 24),
    new THREE.MeshToonMaterial({ color: 0x3ec8c0, gradientMap: gm }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = 0.02;
  scene.add(sea);

  /** Big hulls divide by their in-run upscale so the callout stage keeps its old framing. */
  const STAGE_BOAT_SCALE = {
    raft: 1.32,
    heavyRaft: 1.32 / hullUpscale('heavyRaft'),
    chargeBoat: 1.32 / hullUpscale('chargeBoat'),
  };

  const boat = createBoat(gm, 'raft');
  boat.position.set(0, 0.15, 0);
  boat.rotation.y = -Math.PI * 0.35;
  boat.scale.setScalar(STAGE_BOAT_SCALE.raft);
  scene.add(boat);

  const slotsState = Object.fromEntries(SLOT_ORDER.map((k) => [k, null]));
  let active = false;
  let selectedSlot = 'bow';

  function clearAll() {
    for (const slot of SLOT_ORDER) {
      const mount = boat.userData.mounts[slot];
      if (!mount) continue;
      while (mount.children.length) mount.remove(mount.children[0]);
      mount.userData.fishMesh = null;
      slotsState[slot] = null;
      if (boat.userData.slots) boat.userData.slots[slot] = null;
    }
  }

  function sync(slots, boatId, sel) {
    selectedSlot = sel || selectedSlot;
    const bid = boatId || 'raft';
    setBoatVariant(boat, bid);
    boat.scale.setScalar(STAGE_BOAT_SCALE[bid] ?? STAGE_BOAT_SCALE.raft);
    clearAll();
    const src = slots || {};
    for (const slot of SLOT_ORDER) {
      const f = src[slot];
      if (!f?.defId) continue;
      const def = getFishDef(f.defId);
      equipFish(boat, slotsState, {
        kind: 'fish',
        defId: f.defId,
        name: f.name || def.name,
        rarity: f.rarity || def.rarity,
        category: f.category || def.category,
        color: f.color ?? def.color,
        slot: def.slot,
        vitality: f.vitality ?? 100,
      }, slot, gm);
    }
    paintCallouts(src);
  }

  function paintCallouts(slots) {
    const bind = '\u53ef\u7ed1';
    const bound = '\u5df2\u7ed1';
    callouts.innerHTML = SLOT_ORDER.map((slot) => {
      const lay = CALLOUT_LAYOUT[slot];
      const f = slots[slot];
      const empty = !f?.defId;
      const status = empty ? bind : bound;
      const name = empty ? bind : f.name;
      const sel = slot === selectedSlot ? ' selected' : '';
      const kind = empty ? ' empty' : ' filled';
      return `<button type="button" class="hub-callout${kind}${sel}" data-slot="${slot}" style="left:${lay.x}%;top:${lay.y}%">
        <span class="hub-callout-cap">${status} \u00b7 ${SLOT_LABELS[slot] || slot}</span>
        <span class="hub-callout-face" data-face-slot="${slot}">${empty ? '?' : ''}</span>
        <span class="hub-callout-name">${name}</span>
      </button>`;
    }).join('');

    callouts.querySelectorAll('[data-face-slot]').forEach((face) => {
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
        face.textContent = '\u00b7';
      }
    });

    callouts.querySelectorAll('[data-slot]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        opts.onSelectSlot?.(btn.dataset.slot);
      });
    });
  }

  function projectMounts() {
    const out = {};
    for (const slot of SLOT_ORDER) {
      const mount = boat.userData.mounts[slot];
      if (!mount) {
        out[slot] = { x: 0.5, y: 0.5, behind: true };
        continue;
      }
      mount.getWorldPosition(_v);
      _v.project(camera);
      out[slot] = {
        x: (_v.x + 1) / 2,
        y: 1 - (_v.y + 1) / 2,
        behind: _v.z > 1,
      };
    }
    return out;
  }

  function drawLines() {
    const mounts = projectMounts();
    const lines = [];
    for (const slot of SLOT_ORDER) {
      const m = mounts[slot];
      const lay = CALLOUT_LAYOUT[slot];
      if (!m || !lay || m.behind) continue;
      const mountX = m.x * 100;
      const mountY = m.y * 100;
      if (mountX < 4 || mountX > 96 || mountY < 4 || mountY > 96) continue;
      const midX = lay.side === 'L'
        ? Math.min(46, (lay.x + mountX) * 0.5 + 8)
        : Math.max(54, (lay.x + mountX) * 0.5 - 8);
      lines.push(`<polyline fill="none" points="${lay.x},${lay.y} ${midX},${lay.y} ${midX},${mountY} ${mountX},${mountY}" />`);
      lines.push(`<circle cx="${mountX}" cy="${mountY}" r="0.85" />`);
    }
    svg.innerHTML = lines.join('');
  }

  function resize() {
    const w = Math.max(1, stage.clientWidth | 0);
    const h = Math.max(1, stage.clientHeight | 0);
    if (canvas.width !== w || canvas.height !== h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  function setActive(on) {
    active = !!on;
    stage.classList.toggle('hidden', !active);
    mat?.classList.toggle('is-boat', active);
    grid?.classList.toggle('hidden', active);
    colNums?.classList.toggle('hidden', active);
    if (active) {
      resize();
      drawLines();
    }
  }

  function tick(t) {
    if (!active) return;
    resize();
    boat.position.y = 0.15 + Math.sin(t * 1.2) * 0.04;
    boat.rotation.z = Math.sin(t * 0.9) * 0.02;
    renderer.render(scene, camera);
    drawLines();
  }

  return { setActive, sync, tick };
}
