/** Full-screen scratch reveal for single black-market appraisal. */

const THRESHOLD = 0.38;
const BRUSH = 55;

let root = null;
let canvas = null;
let ctx = null;
let faceEl = null;
let hintEl = null;
let skipBtn = null;
let closeBtn = null;
let onDoneCb = null;
let painting = false;
let revealed = false;
let totalPx = 0;
let clearedPx = 0;
let sampleStep = 4;

function ensureDom() {
  if (root) return;
  root = document.getElementById('hub-bm-scratch');
  if (!root) {
    root = document.createElement('div');
    root.id = 'hub-bm-scratch';
    root.className = 'hub-bm-scratch hidden';
    root.innerHTML = `
      <div class="hub-bm-scratch-card">
        <div class="hub-bm-scratch-face" id="hub-bm-scratch-face"></div>
        <canvas id="hub-bm-scratch-canvas" class="hub-bm-scratch-canvas"></canvas>
      </div>
      <p class="hub-bm-scratch-hint" id="hub-bm-scratch-hint">擦开涂层揭晓宝物</p>
      <div class="hub-bm-scratch-acts">
        <button type="button" class="bp-btn bright" id="hub-bm-scratch-skip">直接揭开</button>
        <button type="button" class="bp-btn ghost" id="hub-bm-scratch-close">完成</button>
      </div>`;
    document.body.appendChild(root);
  }
  canvas = root.querySelector('#hub-bm-scratch-canvas');
  faceEl = root.querySelector('#hub-bm-scratch-face');
  hintEl = root.querySelector('#hub-bm-scratch-hint');
  skipBtn = root.querySelector('#hub-bm-scratch-skip');
  closeBtn = root.querySelector('#hub-bm-scratch-close');
  ctx = canvas.getContext('2d', { willReadFrequently: true });

  const ptr = (e) => {
    if (revealed || !painting) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    eraseAt(x, y);
  };

  canvas.addEventListener('pointerdown', (e) => {
    if (revealed) return;
    painting = true;
    canvas.setPointerCapture?.(e.pointerId);
    ptr(e);
  });
  canvas.addEventListener('pointermove', ptr);
  canvas.addEventListener('pointerup', () => { painting = false; });
  canvas.addEventListener('pointercancel', () => { painting = false; });

  skipBtn?.addEventListener('click', () => finishReveal());
  closeBtn?.addEventListener('click', () => closeScratch());
  root.addEventListener('click', (e) => {
    if (e.target === root && revealed) closeScratch();
  });
}

function fillCoat() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.globalCompositeOperation = 'source-over';
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#3a3540');
  g.addColorStop(0.5, '#2a2430');
  g.addColorStop(1, '#1a1620');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.fillRect(x, y, 2 + Math.random() * 8, 2 + Math.random() * 8);
  }
  ctx.fillStyle = 'rgba(200,190,170,0.35)';
  ctx.font = `bold ${Math.floor(w * 0.12)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', w / 2, h / 2);

  totalPx = 0;
  clearedPx = 0;
  const data = ctx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < data.length; i += 4 * sampleStep) {
    if (data[i] > 8) totalPx++;
  }
}

function eraseAt(x, y) {
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(x, y, BRUSH * (canvas.width / 280), 0, Math.PI * 2);
  ctx.fill();
  sampleCleared();
}

function sampleCleared() {
  if (revealed || totalPx <= 0) return;
  const w = canvas.width;
  const h = canvas.height;
  const data = ctx.getImageData(0, 0, w, h).data;
  let opaque = 0;
  for (let i = 3; i < data.length; i += 4 * sampleStep) {
    if (data[i] > 8) opaque++;
  }
  const cleared = 1 - opaque / totalPx;
  if (hintEl) {
    hintEl.textContent = cleared < THRESHOLD
      ? `继续擦 · ${Math.min(99, Math.floor(cleared / THRESHOLD * 100))}%`
      : '揭晓中…';
  }
  if (cleared >= THRESHOLD) finishReveal();
}

function finishReveal() {
  if (revealed) return;
  revealed = true;
  painting = false;
  if (canvas) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    canvas.style.pointerEvents = 'none';
  }
  root?.classList.add('is-revealed');
  if (hintEl) hintEl.textContent = '鉴定完成';
  if (skipBtn) skipBtn.classList.add('hidden');
  if (closeBtn) closeBtn.classList.remove('hidden');
  const cb = onDoneCb;
  onDoneCb = null;
  cb?.();
}

function closeScratch() {
  if (!revealed) finishReveal();
  root?.classList.add('hidden');
  root?.classList.remove('is-revealed');
  painting = false;
  document.removeEventListener('keydown', onEsc, true);
}

function onEsc(e) {
  if (e.key !== 'Escape') return;
  e.preventDefault();
  e.stopPropagation();
  closeScratch();
}

/**
 * @param {{ faceHtml: string, title?: string, onDone?: () => void }} opts
 */
export function openAppraiseScratch(opts) {
  ensureDom();
  revealed = false;
  painting = false;
  onDoneCb = typeof opts.onDone === 'function' ? opts.onDone : null;

  const size = Math.min(420, Math.floor(window.innerWidth * 0.8));
  canvas.width = size;
  canvas.height = size;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  canvas.style.pointerEvents = '';

  if (faceEl) faceEl.innerHTML = opts.faceHtml || '';
  if (hintEl) hintEl.textContent = '擦开涂层揭晓宝物';
  if (skipBtn) skipBtn.classList.remove('hidden');
  if (closeBtn) closeBtn.classList.add('hidden');

  fillCoat();
  root.classList.remove('hidden', 'is-revealed');
  document.addEventListener('keydown', onEsc, true);
}

export function closeAppraiseScratch() {
  closeScratch();
}
