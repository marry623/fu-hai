/**
 * Procedural helpers ported (MIT) from LinearAbiltyCastingThreeJS /
 * ThreeJSVFX-Demo (chirovisuals / achrefelouafi).
 */
import {
  BufferGeometry,
  BufferAttribute,
  Float32BufferAttribute,
  InstancedBufferGeometry,
  InstancedBufferAttribute,
  IcosahedronGeometry,
  Sphere,
  Vector3,
} from '../../vendor/three/three.module.js';

export const TAU = Math.PI * 2;

export function hash11(p) {
  let n = Math.sin(p * 127.1) * 43758.5453;
  return n - Math.floor(n);
}

function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

const RING_HEIGHTS = [0, 0.22, 0.5, 0.75, 0.92];

function profileRadius(t, taper) {
  return taper + (1 - taper) * (1 - t) ** 1.15;
}

export function createCrystalGeometry({
  seed = 1,
  sides = 6,
  taper = 0.13,
  roughness = 0.28,
  bend = 0.22,
} = {}) {
  const facets = Math.max(3, Math.round(sides));
  const tipRadius = Math.min(0.9, Math.max(0.01, taper));
  const bendAngle = hash11(seed * 1.77) * TAU;
  const bendX = Math.cos(bendAngle);
  const bendZ = Math.sin(bendAngle);
  const axisOffset = (t) => bend * 0.5 * t ** 1.6;

  const angles = [];
  for (let i = 0; i < facets; i++) {
    const jitter = (hash11(seed * 3.13 + i * 7.7) - 0.5) * (TAU / facets) * 0.55 * roughness * 3;
    angles.push((i / facets) * TAU + jitter);
  }

  const rings = RING_HEIGHTS.map((t, ringIndex) => {
    const baseR = profileRadius(t, tipRadius) * 0.5;
    const drift = axisOffset(t);
    const y = t + (hash11(seed * 5.9 + ringIndex * 2.3) - 0.5) * 0.06 * roughness * (t > 0 ? 1 : 0);
    return angles.map((angle, i) => {
      const wobble = 1 + (hash11(seed * 11.1 + ringIndex * 13.7 + i * 3.9) - 0.5) * roughness * 1.3 * (0.35 + 0.65 * t);
      const r = Math.max(0.002, baseR * wobble);
      return [Math.cos(angle) * r + bendX * drift, y, Math.sin(angle) * r + bendZ * drift];
    });
  });

  const apexDrift = axisOffset(1);
  const apex = [
    bendX * apexDrift + (hash11(seed * 17.3) - 0.5) * 0.09 * roughness,
    1,
    bendZ * apexDrift + (hash11(seed * 19.7) - 0.5) * 0.09 * roughness,
  ];
  const floorCentre = [0, 0, 0];
  const positions = [];
  const push = (p) => positions.push(p[0], p[1], p[2]);

  for (let ring = 0; ring < rings.length - 1; ring++) {
    const lower = rings[ring];
    const upper = rings[ring + 1];
    for (let i = 0; i < facets; i++) {
      const j = (i + 1) % facets;
      push(lower[i]); push(lower[j]); push(upper[i]);
      push(lower[j]); push(upper[j]); push(upper[i]);
    }
  }
  const top = rings[rings.length - 1];
  const base = rings[0];
  for (let i = 0; i < facets; i++) {
    const j = (i + 1) % facets;
    push(top[i]); push(top[j]); push(apex);
    push(floorCentre); push(base[j]); push(base[i]);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function lattice(ix, iy, iz, seed) {
  return hash11(ix * 127.1 + iy * 311.7 + iz * 74.7 + seed * 19.19);
}

function valueNoise3(x, y, z, seed) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);
  const c000 = lattice(ix, iy, iz, seed);
  const c100 = lattice(ix + 1, iy, iz, seed);
  const c010 = lattice(ix, iy + 1, iz, seed);
  const c110 = lattice(ix + 1, iy + 1, iz, seed);
  const c001 = lattice(ix, iy, iz + 1, seed);
  const c101 = lattice(ix + 1, iy, iz + 1, seed);
  const c011 = lattice(ix, iy + 1, iz + 1, seed);
  const c111 = lattice(ix + 1, iy + 1, iz + 1, seed);
  const x00 = c000 + (c100 - c000) * ux;
  const x10 = c010 + (c110 - c010) * ux;
  const x01 = c001 + (c101 - c001) * ux;
  const x11 = c011 + (c111 - c011) * ux;
  const y0 = x00 + (x10 - x00) * uy;
  const y1 = x01 + (x11 - x01) * uy;
  return y0 + (y1 - y0) * uz;
}

function fbmValue(x, y, z, seed, octaves) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * (valueNoise3(x * frequency, y * frequency, z * frequency, seed + i * 7.7) * 2 - 1);
    frequency *= 2.03;
    amplitude *= 0.5;
  }
  return value;
}

export function createAsteroidGeometry({
  seed = 1,
  detail = 2,
  lumpiness = 0.26,
  noiseScale = 1.5,
  roughness = 0.16,
  cuts = 7,
  cutDepth = 0.2,
  craters = 5,
  craterDepth = 0.18,
  craterSize = 0.5,
} = {}) {
  const geometry = new IcosahedronGeometry(1, clamp(Math.round(detail), 0, 3)).toNonIndexed();
  const array = geometry.attributes.position.array;
  const direction = (a, b) => {
    const phi = Math.acos(2 * hash11(a) - 1);
    const theta = hash11(b) * TAU;
    const sinPhi = Math.sin(phi);
    return { x: sinPhi * Math.cos(theta), y: Math.cos(phi), z: sinPhi * Math.sin(theta) };
  };
  const planes = [];
  for (let i = 0; i < Math.max(0, Math.round(cuts)); i++) {
    const n = direction(seed * 2.3 + i * 9.1, seed * 5.7 + i * 4.3);
    n.offset = 1 - cutDepth * (0.35 + 0.9 * hash11(seed * 13.1 + i * 6.7));
    planes.push(n);
  }
  const bowls = [];
  for (let i = 0; i < Math.max(0, Math.round(craters)); i++) {
    const c = direction(seed * 3.1 + i * 12.9, seed * 7.7 + i * 5.3);
    c.radius = Math.max(0.08, craterSize * (0.45 + 0.8 * hash11(seed * 11.3 + i * 3.7)));
    c.depth = craterDepth * (0.5 + hash11(seed * 17.9 + i * 2.1));
    bowls.push(c);
  }
  for (let i = 0; i < array.length; i += 3) {
    const x = array[i];
    const y = array[i + 1];
    const z = array[i + 2];
    let radius = 1;
    radius += fbmValue(x * noiseScale, y * noiseScale, z * noiseScale, seed, 3) * lumpiness;
    radius += fbmValue(x * noiseScale * 4.3, y * noiseScale * 4.3, z * noiseScale * 4.3, seed + 31.7, 2) * roughness * 0.5;
    for (const bowl of bowls) {
      const angle = Math.acos(clamp(x * bowl.x + y * bowl.y + z * bowl.z, -1, 1));
      const q = angle / bowl.radius;
      if (q >= 1.4) continue;
      radius -= bowl.depth * Math.max(0, 1 - q * q);
      radius += bowl.depth * 0.5 * smoothstep(0.72, 1.0, q) * (1 - smoothstep(1.0, 1.4, q));
    }
    radius = Math.max(0.35, radius);
    let px = x * radius;
    let py = y * radius;
    let pz = z * radius;
    for (const plane of planes) {
      const along = px * plane.x + py * plane.y + pz * plane.z;
      const over = along - plane.offset;
      if (over <= 0) continue;
      px -= plane.x * over;
      py -= plane.y * over;
      pz -= plane.z * over;
    }
    array[i] = px;
    array[i + 1] = py;
    array[i + 2] = pz;
  }
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function createBoltRibbonGeometry(nodes = 64, strands = 12) {
  const steps = Math.max(2, Math.round(nodes));
  const count = Math.max(1, Math.round(strands));
  const positions = new Float32Array(steps * 2 * 3);
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const o = i * 6;
    positions[o + 0] = t;
    positions[o + 1] = -1;
    positions[o + 3] = t;
    positions[o + 4] = 1;
  }
  const indices = new Uint16Array((steps - 1) * 6);
  for (let i = 0; i < steps - 1; i++) {
    const a = i * 2;
    const o = i * 6;
    indices[o + 0] = a;
    indices[o + 1] = a + 1;
    indices[o + 2] = a + 2;
    indices[o + 3] = a + 1;
    indices[o + 4] = a + 3;
    indices[o + 5] = a + 2;
  }
  const strandIndex = new Float32Array(count);
  for (let i = 0; i < count; i++) strandIndex[i] = i;
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aStrand', new InstancedBufferAttribute(strandIndex, 1));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.instanceCount = count;
  geometry.boundingSphere = new Sphere(new Vector3(), 1e4);
  return geometry;
}

/** Swept tapered wing in local XZ. Side +1 = right. */
export function createPhoenixWingGeometry(side = 1) {
  const s = side >= 0 ? 1 : -1;
  const points = [
    [0, 0, 0.34],
    [0.2 * s, 0, 0.52],
    [0.62 * s, 0, 0.25],
    [1 * s, 0, -0.08],
    [0.74 * s, 0, -0.46],
    [0.34 * s, 0, -0.62],
    [0.08 * s, 0, -0.4],
  ];
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(points.flat(), 3));
  geometry.setAttribute(
    'uv',
    new Float32BufferAttribute(points.map(([x, , z]) => [Math.abs(x), z + 0.62]).flat(), 2),
  );
  geometry.setIndex([0, 1, 2, 0, 2, 6, 2, 3, 4, 2, 4, 5, 2, 5, 6]);
  geometry.computeVertexNormals();
  return geometry;
}

/** Parameter-space beam tube: position = (t, a, 0). */
export function createBeamTubeGeometry(nodes = 64, sides = 22) {
  const steps = Math.max(2, Math.round(nodes));
  const facets = Math.max(3, Math.round(sides));
  const columns = facets + 1;
  const positions = new Float32Array(steps * columns * 3);
  let v = 0;
  for (let i = 0; i < steps; i++) {
    const tt = i / (steps - 1);
    for (let j = 0; j < columns; j++) {
      positions[v++] = tt;
      positions[v++] = j / facets;
      positions[v++] = 0;
    }
  }
  const indices = new Uint16Array((steps - 1) * facets * 6);
  let k = 0;
  for (let i = 0; i < steps - 1; i++) {
    for (let j = 0; j < facets; j++) {
      const a = i * columns + j;
      const b = a + columns;
      indices[k++] = a;
      indices[k++] = b;
      indices[k++] = a + 1;
      indices[k++] = b;
      indices[k++] = b + 1;
      indices[k++] = a + 1;
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.boundingSphere = new Sphere(new Vector3(), 1e4);
  return geometry;
}

/** Instanced shock discs: position = (band, a, 0). */
export function createBeamRingGeometry(rings = 10, segments = 36) {
  const count = Math.max(1, Math.round(rings));
  const facets = Math.max(6, Math.round(segments));
  const columns = facets + 1;
  const positions = new Float32Array(2 * columns * 3);
  let v = 0;
  for (let band = 0; band < 2; band++) {
    for (let j = 0; j < columns; j++) {
      positions[v++] = band;
      positions[v++] = j / facets;
      positions[v++] = 0;
    }
  }
  const indices = new Uint16Array(facets * 6);
  let k = 0;
  for (let j = 0; j < facets; j++) {
    const a = j;
    const b = columns + j;
    indices[k++] = a;
    indices[k++] = b;
    indices[k++] = a + 1;
    indices[k++] = b;
    indices[k++] = b + 1;
    indices[k++] = a + 1;
  }
  const ringIndex = new Float32Array(count);
  for (let i = 0; i < count; i++) ringIndex[i] = i;
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aRing', new InstancedBufferAttribute(ringIndex, 1));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.instanceCount = count;
  geometry.boundingSphere = new Sphere(new Vector3(), 1e4);
  return geometry;
}
