/** Depart zone puzzle — concept-art basins: jagged seams + low-poly décor */

export const ZONE_PUZZLE_COLORS = [
  { fill: '#4eb6e0', deep: '#1a6f9a', mid: '#7dd3f0', accent: '#ff8ec8', rim: '#2a90c0' },
  { fill: '#2f8f5b', deep: '#145c38', mid: '#4caf75', accent: '#a8e6c0', rim: '#1e7048' },
  { fill: '#c9a04a', deep: '#7a5a18', mid: '#e0bc6a', accent: '#f5e0a0', rim: '#9a7828' },
  { fill: '#6b3fb0', deep: '#3a1c70', mid: '#8b5fd0', accent: '#d4b8ff', rim: '#502890' },
  { fill: '#b83220', deep: '#5a1408', mid: '#e05030', accent: '#ff9040', rim: '#8a2010' },
];

/** Shared jagged seams as point lists [x,y]… — pieces reuse these so edges nest. */
const S01 = [[430,155],[448,178],[432,205],[458,232],[440,262],[462,288],[438,318],[418,342]];
const S12 = [[708,162],[728,188],[708,218],[735,248],[712,282],[738,312],[715,342],[688,362]];
const S03 = [[128,378],[162,398],[198,418],[242,428],[288,418],[328,398],[362,372],[392,348]];
const S13 = [[418,342],[448,358],[482,378],[518,392],[552,398]]; // 1 bottom-left → hub
const S14 = [[552,398],[588,385],[628,362],[662,348],[688,362]]; // hub → 1/2/4
const S24 = [[688,362],[718,382],[755,402],[798,412],[842,398]];
const S34 = [[392,348],[428,368],[472,388],[518,398],[552,398]];

function rev(list) {
  return [...list].reverse();
}
function pathFrom(rings) {
  const flat = rings.flat();
  return `M ${flat[0][0]},${flat[0][1]} ${flat.slice(1).map(([x, y]) => `L ${x},${y}`).join(' ')} Z`;
}

/**
 * Dense organic lobes filling ~920×640 — traced to concept layout (3 top / 2 bottom).
 */
export const ZONE_PUZZLE_PATHS = [
  // 0 珊瑚浅滩 NW
  pathFrom([
    [[55,95],[95,48],[155,35],[230,42],[300,58],[355,88],[395,125],[430,155]],
    S01,
    rev(S03),
    [[128,378],[95,340],[72,285],[58,220],[52,155],[55,95]],
  ]),
  // 1 缠绕藻林 N
  pathFrom([
    S01,
    [[430,155],[480,118],[545,98],[610,105],[660,128],[708,162]],
    S12,
    rev(S14),
    rev(S13),
  ]),
  // 2 沉船雾区 NE
  pathFrom([
    S12,
    [[708,162],[760,128],[825,118],[885,138],[935,175],[955,230],[948,295],[918,350],[875,385],[842,398]],
    rev(S24),
  ]),
  // 3 雷暴裂口 SW
  pathFrom([
    S03,
    S34,
    [[552,398],[530,455],[495,520],[445,575],[375,615],[295,628],[215,608],[150,560],[110,490],[98,430],[128,378]],
  ]),
  // 4 熔岩海沟 SE
  pathFrom([
    S14,
    S24,
    [[842,398],[890,390],[940,425],[952,490],[935,560],[885,620],[815,655],[735,662],[655,635],[595,575],[560,500],[552,398]],
  ]),
];

export const ZONE_PUZZLE_LABELS = [
  { x: 240, y: 210, n: 1 },
  { x: 565, y: 245, n: 2 },
  { x: 825, y: 265, n: 3 },
  { x: 300, y: 505, n: 4 },
  { x: 745, y: 520, n: 5 },
];

function poly(p, fill, stroke, sw = 1.2) {
  return `<polygon points="${p}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
}

function ridgeAlong(seam, inward, col) {
  // Build a thick faceted ridge band beside a seam
  const bands = [];
  for (let i = 0; i < seam.length - 1; i++) {
    const [x1, y1] = seam[i];
    const [x2, y2] = seam[i + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * inward;
    const ny = (dx / len) * inward;
    bands.push(poly(
      `${x1},${y1} ${x2},${y2} ${x2 + nx},${y2 + ny} ${x1 + nx},${y1 + ny}`,
      col.deep,
      col.rim,
      1.2,
    ));
  }
  return bands.join('');
}

function facetWash(ox, oy, w, h, a, b, seed) {
  const out = [];
  const cols = 6;
  const rows = 5;
  const cw = w / cols;
  const ch = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = ox + c * cw;
      const y = oy + r * ch;
      const flip = (r + c + seed) % 2 === 0;
      out.push(poly(
        flip ? `${x},${y} ${x + cw},${y} ${x},${y + ch}` : `${x + cw},${y} ${x + cw},${y + ch} ${x},${y}`,
        a,
        'none',
        0,
      ));
      out.push(poly(
        flip ? `${x + cw},${y} ${x + cw},${y + ch} ${x},${y + ch}` : `${x},${y} ${x},${y + ch} ${x + cw},${y + ch}`,
        b,
        'none',
        0,
      ));
    }
  }
  return `<g opacity="0.28">${out.join('')}</g>`;
}

function décorCoral(c) {
  return `
    <g class="zp-decor">
      ${facetWash(90, 100, 300, 240, c.mid, c.deep, 1)}
      ${ridgeAlong(S01, 10, c)}
      ${ridgeAlong(S03, -10, c)}
      ${poly('175,275 205,205 235,282', c.accent, c.deep, 1.3)}
      ${poly('235,282 268,195 298,290', '#e070c0', c.deep, 1.3)}
      ${poly('145,300 175,235 205,312', '#a8e8ff', c.deep, 1.2)}
      ${poly('285,255 325,215 355,275 315,305', '#ffb0d8', c.deep, 1.3)}
      ${poly('120,330 145,290 175,340', c.mid, c.deep, 1.1)}
      ${poly('300,300 340,270 365,315 325,335', '#d8ecf5', c.deep, 1.1)}
      ${poly('185,345 255,325 270,360 198,375', '#8b5a2b', '#2e1408', 1.6)}
      ${poly('220,325 228,275 245,330', '#c4a06a', '#2e1408', 1.2)}
      ${poly('330,185 352,128 378,195', '#e8f8ff', c.rim, 1.3)}
      ${poly('130,200 148,145 168,210', '#b8f0ff', c.rim, 1.3)}
      ${poly('380,230 402,185 418,242', '#fff8e8', c.rim, 1.1)}
      <circle cx="320" cy="355" r="9" fill="#ff8a5a" stroke="${c.deep}" stroke-width="1.3"/>
      <circle cx="155" cy="350" r="7" fill="#ffd24a" stroke="${c.deep}" stroke-width="1.1"/>
      <circle cx="270" cy="375" r="6" fill="#ff6b8a" stroke="${c.deep}" stroke-width="1"/>
      ${poly('210,195 228,155 248,205', '#ffe0f0', c.deep, 1.1)}
      ${poly('100,260 118,220 138,270', '#7ad0f0', c.deep, 1)}
    </g>`;
}

function décorKelp(c) {
  const vines = [
    [490, 385, 472, 295, 498, 195],
    [530, 392, 548, 300, 525, 205],
    [570, 390, 592, 305, 575, 215],
    [610, 378, 632, 290, 648, 228],
    [650, 365, 668, 285, 685, 245],
    [465, 350, 448, 275, 462, 210],
    [680, 350, 695, 290, 705, 255],
  ];
  return `
    <g class="zp-decor">
      ${facetWash(445, 130, 250, 230, c.mid, c.deep, 2)}
      ${ridgeAlong(S01, -10, c)}
      ${ridgeAlong(S12, 10, c)}
      ${vines.map(([x1, y1, x2, y2, x3, y3]) => `
        <path d="M${x1},${y1} Q${x2},${y2} ${x3},${y3}" fill="none" stroke="${c.accent}" stroke-width="12" stroke-linecap="round" opacity="0.92"/>
        <path d="M${x1},${y1} Q${x2},${y2} ${x3},${y3}" fill="none" stroke="${c.deep}" stroke-width="5" stroke-linecap="round"/>
        ${poly(`${x3 - 8},${y3} ${x3},${y3 - 16} ${x3 + 8},${y3}`, c.mid, c.deep, 1)}
      `).join('')}
      ${poly('520,350 555,325 580,360 540,378', '#3d7a52', c.deep, 1.3)}
      ${poly('595,340 638,312 658,355', '#6ecf90', c.deep, 1.2)}
      ${poly('480,325 508,295 528,335', c.accent, c.deep, 1.1)}
    </g>`;
}

function décorFog(c) {
  return `
    <g class="zp-decor">
      ${facetWash(720, 150, 230, 230, c.mid, c.deep, 3)}
      ${ridgeAlong(S12, -10, c)}
      ${ridgeAlong(S24, 10, c)}
      ${poly('760,340 875,305 905,365 785,385', '#8b5a2b', '#241208', 1.7)}
      ${poly('788,305 798,230 825,312', '#c4a574', '#241208', 1.4)}
      ${poly('835,300 848,205 872,315', '#e8d4a8', '#241208', 1.4)}
      ${poly('815,232 828,188 842,238', '#f5ead0', '#241208', 1.1)}
      ${poly('900,355 922,235 948,362', '#9aa4b0', '#222830', 1.6)}
      ${poly('910,235 938,235 924,205', '#ffe066', '#8a6a10', 1.4)}
      ${poly('735,370 785,355 795,388 745,398', '#6a5a48', '#1a1008', 1.2)}
      ${poly('865,380 918,360 928,395 875,408', '#7a6a55', '#1a1008', 1.2)}
      ${poly('810,375 848,362 858,395', '#a89070', '#1a1008', 1.1)}
      ${poly('745,300 772,288 780,315 752,325', '#5a4030', '#1a1008', 1.1)}
    </g>`;
}

function décorStorm(c) {
  return `
    <g class="zp-decor">
      ${facetWash(120, 390, 300, 220, c.mid, c.deep, 4)}
      ${ridgeAlong(S03, 10, c)}
      ${ridgeAlong(S34, 10, c)}
      <ellipse cx="290" cy="510" rx="68" ry="48" fill="none" stroke="${c.accent}" stroke-width="7"/>
      <ellipse cx="290" cy="510" rx="48" ry="34" fill="none" stroke="${c.mid}" stroke-width="5"/>
      <ellipse cx="290" cy="510" rx="28" ry="20" fill="none" stroke="#c9a8ff" stroke-width="3.5"/>
      <ellipse cx="290" cy="510" rx="12" ry="9" fill="${c.deep}" stroke="#fff" stroke-width="2"/>
      ${poly('190,540 212,425 240,550', c.mid, c.deep, 1.5)}
      ${poly('335,530 358,415 385,545', c.accent, c.deep, 1.5)}
      ${poly('225,565 242,455 268,575', '#9b7ad4', c.deep, 1.4)}
      ${poly('310,568 332,440 355,578', '#5a2a90', c.deep, 1.4)}
      ${poly('155,505 175,448 198,520', '#7a4ec8', c.deep, 1.3)}
      ${poly('385,500 408,442 430,515', '#b898ff', c.deep, 1.3)}
      <path d="M245,415 L275,475 L255,485 L295,560" fill="none" stroke="#f0e8ff" stroke-width="4" stroke-linejoin="round"/>
      <path d="M340,408 L312,470 L332,480 L298,550" fill="none" stroke="#fff" stroke-width="3.2"/>
      <path d="M205,440 L228,485 L215,492 L245,535" fill="none" stroke="#d4b8ff" stroke-width="2.5"/>
    </g>`;
}

function décorLava(c) {
  return `
    <g class="zp-decor">
      ${facetWash(580, 410, 300, 220, '#4a2820', '#2a1410', 5)}
      ${ridgeAlong(S14, -10, c)}
      ${ridgeAlong(S24, -10, c)}
      <path d="M600,490 Q670,518 730,478 Q780,448 850,495" fill="none" stroke="#ff9040" stroke-width="18" stroke-linecap="round"/>
      <path d="M600,490 Q670,518 730,478 Q780,448 850,495" fill="none" stroke="#ffe066" stroke-width="8" stroke-linecap="round"/>
      <path d="M630,550 Q710,575 785,540 Q835,520 890,562" fill="none" stroke="#ff6b2a" stroke-width="13" stroke-linecap="round"/>
      <path d="M630,550 Q710,575 785,540 Q835,520 890,562" fill="none" stroke="#ffd24a" stroke-width="5.5" stroke-linecap="round"/>
      <path d="M670,505 Q715,528 760,510" fill="none" stroke="#ffb040" stroke-width="9" stroke-linecap="round"/>
      ${poly('690,510 718,400 742,520', '#e8dcc8', '#2e1808', 1.6)}
      ${poly('740,515 768,388 795,525', '#f0e6d4', '#2e1808', 1.6)}
      ${poly('790,518 818,405 842,528', '#d8c8b0', '#2e1808', 1.6)}
      ${poly('700,535 845,542 835,568 690,560', '#c4b49a', '#2e1808', 1.4)}
      ${poly('860,510 905,478 925,538 875,555', '#3a3030', '#0e0606', 1.4)}
      ${poly('585,530 630,505 648,560', '#4a3838', '#0e0606', 1.3)}
      ${poly('820,575 875,555 890,595 832,608', '#2a2020', '#0a0404', 1.2)}
      ${poly('640,465 665,445 678,475 650,488', '#6a7078', '#1a1e22', 1.3)}
      <path d="M655,475 Q630,505 648,540" fill="none" stroke="#8a9098" stroke-width="3.5"/>
      <path d="M648,540 Q670,555 690,548" fill="none" stroke="#6a7078" stroke-width="2.5"/>
    </g>`;
}

const DÉCOR = [décorCoral, décorKelp, décorFog, décorStorm, décorLava];

function badge(x, y, n, col, open) {
  const fill = open ? col.deep : '#3a4048';
  const tip = open ? col.rim : '#2a3038';
  return `
    <g class="zp-badge" transform="translate(${x}, ${y})">
      <path d="M0,-32 L30,-12 L19,24 L-19,24 L-30,-12 Z" fill="${fill}" stroke="#fff" stroke-width="3.2"/>
      <path d="M-12,24 L0,40 L12,24 Z" fill="${tip}" stroke="#fff" stroke-width="2.4"/>
      <text x="0" y="9" text-anchor="middle" fill="#fff" font-size="27" font-weight="800"
        font-family="Fredoka, Noto Sans SC, sans-serif">${n}</text>
    </g>`;
}

function label(x, y, name, col, open) {
  const w = Math.max(132, name.length * 16 + 34);
  return `
    <g class="zp-label" transform="translate(${x}, ${y})">
      <rect x="${-w / 2}" y="0" width="${w}" height="34" rx="5"
        fill="rgba(8,14,24,0.88)" stroke="${open ? col.accent : '#889'}" stroke-width="2"/>
      <text x="0" y="23" text-anchor="middle" fill="${open ? '#f5f8fa' : '#b8bcc0'}"
        font-size="15" font-weight="800" font-family="Noto Sans SC, sans-serif">${name}</text>
    </g>`;
}

function rimPath(d, col, open) {
  return `<path class="zp-rim" d="${d}" fill="none" stroke="${open ? col.rim : '#4a5058'}"
    stroke-width="16" stroke-linejoin="round" opacity="0.7"/>`;
}

/**
 * @param {HTMLElement} mount
 * @param {{ zones: Array<{id:number,name:string}>, unlocked: number[], selected: number, onSelect: (id:number)=>void }} opts
 */
export function renderZonePuzzleMap(mount, opts) {
  if (!mount) return;
  const { zones, unlocked, selected, onSelect } = opts;
  const unlockedSet = new Set(unlocked || [0]);

  const pieces = zones.map((z, i) => {
    const col = ZONE_PUZZLE_COLORS[i] || ZONE_PUZZLE_COLORS[0];
    const path = ZONE_PUZZLE_PATHS[i];
    const lab = ZONE_PUZZLE_LABELS[i];
    const open = unlockedSet.has(z.id);
    const sel = selected === z.id;
    const fill = open ? `url(#zp-basin-${i})` : '#5a636c';
    const decor = DÉCOR[i](col);
    return `
      <g class="zp-piece${open ? '' : ' locked'}${sel ? ' selected' : ''}" data-zone="${z.id}"
         role="button" tabindex="0" aria-label="${z.name}${open ? '' : '（未解锁）'}">
        ${rimPath(path, col, open)}
        <path class="zp-fill" d="${path}" fill="${fill}"
          stroke="${open ? col.deep : '#2e343a'}" stroke-width="4" stroke-linejoin="round"/>
        <path class="zp-inner" d="${path}" fill="url(#zp-depth)" opacity="${open ? 0.4 : 0.22}"/>
        <g clip-path="url(#zp-clip-${i})">${decor}</g>
        ${badge(lab.x, lab.y - 8, lab.n, col, open)}
        ${label(lab.x, lab.y + 32, z.name, col, open)}
      </g>`;
  }).join('');

  const defsBasins = ZONE_PUZZLE_COLORS.map((c, i) => `
    <linearGradient id="zp-basin-${i}" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="${c.mid}"/>
      <stop offset="50%" stop-color="${c.fill}"/>
      <stop offset="100%" stop-color="${c.deep}"/>
    </linearGradient>
    <clipPath id="zp-clip-${i}"><path d="${ZONE_PUZZLE_PATHS[i]}"/></clipPath>
  `).join('');

  mount.innerHTML = `
    <svg class="zone-puzzle" viewBox="0 0 1000 720" preserveAspectRatio="xMidYMid meet" aria-label="海域拼图">
      <defs>
        <linearGradient id="zp-sea" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stop-color="#082440"/>
          <stop offset="100%" stop-color="#030f1a"/>
        </linearGradient>
        <linearGradient id="zp-depth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.42"/>
          <stop offset="32%" stop-color="#ffffff" stop-opacity="0"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.48"/>
        </linearGradient>
        <pattern id="zp-facet" width="64" height="56" patternUnits="userSpaceOnUse">
          <path d="M0,56 L32,0 L64,56 Z" fill="rgba(255,255,255,0.04)"/>
          <path d="M0,56 L32,0 L0,0 Z" fill="rgba(0,0,0,0.045)"/>
        </pattern>
        ${defsBasins}
      </defs>
      <rect width="1000" height="720" fill="url(#zp-sea)" rx="14"/>
      <rect width="1000" height="720" fill="url(#zp-facet)" rx="14"/>
      <g class="zp-board">${pieces}</g>
    </svg>`;

  mount.querySelectorAll('.zp-piece').forEach((g) => {
    const id = Number(g.dataset.zone);
    const fire = () => onSelect?.(id);
    g.addEventListener('click', fire);
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fire();
      }
    });
  });
}
