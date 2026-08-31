/**
 * Lightweight additive GPU points — mist / glitter / sparks / embers.
 */
import {
  BufferGeometry,
  BufferAttribute,
  Points,
  ShaderMaterial,
  AdditiveBlending,
  Color,
} from 'three';

const MAX = 900;
const _col = new Color();

export function createGpuSparks(parent) {
  const pos = new Float32Array(MAX * 3);
  const col = new Float32Array(MAX * 3);
  const sizes = new Float32Array(MAX);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new BufferAttribute(col, 3));
  geo.setAttribute('aSize', new BufferAttribute(sizes, 1));
  geo.setDrawRange(0, 0);

  const mat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
    toneMapped: false,
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute vec3 aColor;
      varying vec3 vColor;
      void main() {
        vColor = aColor;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = min(72.0, aSize * (220.0 / max(1.2, -mv.z)));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float d = dot(p, p);
        if (d > 1.0) discard;
        float a = exp(-d * 3.4) * (1.0 - d);
        gl_FragColor = vec4(vColor * a, a);
      }
    `,
  });

  const points = new Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 14;
  parent.add(points);

  const slots = [];
  for (let i = 0; i < MAX; i++) {
    slots.push({
      alive: false,
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0, vz: 0,
      life: 0, maxLife: 1,
      size: 8, gravity: 1,
      r: 1, g: 1, b: 1,
    });
  }
  let live = 0;
  let cursor = 0;

  function alloc() {
    for (let n = 0; n < MAX; n++) {
      const i = (cursor + n) % MAX;
      if (!slots[i].alive) {
        cursor = (i + 1) % MAX;
        return slots[i];
      }
    }
    return slots[cursor];
  }

  function emit(count, opts = {}) {
    const n = Math.max(0, Math.round(count));
    if (n <= 0) return;
    _col.set(opts.color ?? 0xffffff);
    const ox = opts.x ?? 0;
    const oy = opts.y ?? 1.4;
    const oz = opts.z ?? 0;
    const spread = opts.spread ?? 0.8;
    const speed = opts.speed ?? 2;
    const speedJ = opts.speedJitter ?? 0.7;
    const life = opts.life ?? 0.7;
    const lifeJ = opts.lifeJitter ?? 0.4;
    const size = opts.size ?? 10;
    const sizeJ = opts.sizeJitter ?? 0.5;
    const gravity = opts.gravity ?? 1;
    const dvx = opts.vx ?? 0;
    const dvy = opts.vy ?? 1;
    const dvz = opts.vz ?? 0;
    const dlen = Math.hypot(dvx, dvy, dvz) || 1;
    const nx = dvx / dlen;
    const ny = dvy / dlen;
    const nz = dvz / dlen;
    const radius = opts.radius ?? 0.25;

    for (let i = 0; i < n; i++) {
      const p = alloc();
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      p.alive = true;
      p.x = ox + Math.cos(a) * r;
      p.y = oy + (Math.random() - 0.4) * radius * 0.5;
      p.z = oz + Math.sin(a) * r;
      const jitter = (Math.random() - 0.5) * spread;
      const j2 = (Math.random() - 0.5) * spread;
      const spd = speed * (1 + (Math.random() - 0.5) * speedJ);
      p.vx = (nx + jitter) * spd;
      p.vy = (ny + Math.random() * spread * 0.6) * spd;
      p.vz = (nz + j2) * spd;
      p.maxLife = Math.max(0.08, life * (1 + (Math.random() - 0.5) * lifeJ));
      p.life = p.maxLife;
      p.size = size * (1 + (Math.random() - 0.5) * sizeJ);
      p.gravity = gravity;
      p.r = _col.r;
      p.g = _col.g;
      p.b = _col.b;
    }
  }

  function update(dt) {
    live = 0;
    for (let i = 0; i < MAX; i++) {
      const p = slots[i];
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }
      p.vy -= 6.5 * p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const fade = Math.max(0, p.life / p.maxLife);
      const i3 = live * 3;
      pos[i3] = p.x;
      pos[i3 + 1] = p.y;
      pos[i3 + 2] = p.z;
      col[i3] = p.r * (0.45 + fade);
      col[i3 + 1] = p.g * (0.45 + fade);
      col[i3 + 2] = p.b * (0.45 + fade);
      sizes[live] = p.size * (0.35 + fade);
      live++;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aColor.needsUpdate = true;
    geo.attributes.aSize.needsUpdate = true;
    geo.setDrawRange(0, live);
    points.visible = live > 0;
  }

  function clear() {
    for (const p of slots) p.alive = false;
    live = 0;
    geo.setDrawRange(0, 0);
    points.visible = false;
  }

  function dispose() {
    clear();
    parent.remove(points);
    geo.dispose();
    mat.dispose();
  }

  return { emit, update, clear, dispose, points };
}
