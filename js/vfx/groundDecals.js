/**
 * Pooled water-surface decals (MIT) adapted from
 * LinearAbiltyCastingThreeJS GroundDecals — FROST / ARC / SCORCH / SHOCKWAVE.
 */
import {
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  AdditiveBlending,
  NormalBlending,
  Color,
  Vector3,
  Group,
} from 'three';

export const DecalType = Object.freeze({
  SCORCH: 0,
  SHOCKWAVE: 3,
  FROST: 6,
  ARC: 7,
});

const NOISE = /* glsl */ `
float hash11(float p){p=fract(p*0.1031);p*=p+33.33;p*=p+p;return fract(p);}
vec2 hash21(float p){vec3 p3=fract(vec3(p)*vec3(0.1031,0.1030,0.0973));p3+=dot(p3,p3.yzx+33.33);return fract((p3.xx+p3.yz)*p3.zy);}
vec3 mod289v3(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289v4(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute289(vec4 x){return mod289v4(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt4(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289v3(i);
  vec4 p=permute289(permute289(permute289(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt4(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float snoise01(vec3 p){return snoise(p)*0.5+0.5;}
float fbm3(vec3 p){float v=0.0;float a=0.5;for(int i=0;i<3;i++){v+=a*snoise(p);p*=2.02;a*=0.5;}return v;}
float ridged(vec3 p){float v=0.0;float a=0.5;for(int i=0;i<4;i++){v+=a*(1.0-abs(snoise(p)));p*=2.06;a*=0.5;}return v;}
vec2 voronoi2(vec2 p){vec2 n=floor(p);vec2 f=fract(p);float minDist=8.0;float id=0.0;
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 g=vec2(float(i),float(j));vec2 o=hash21(dot(n+g,vec2(7.13,113.17)));vec2 r=g+o-f;float d=dot(r,r);if(d<minDist){minDist=d;id=hash11(dot(n+g,vec2(31.7,57.1)));}}
  return vec2(sqrt(minDist),id);}
`;

const DECAL_VERTEX = /* glsl */ `
uniform vec3 uLightDir;
varying vec2 vUv;
varying vec3 vLight;
void main() {
  vUv = uv;
  vec3 ax = normalize(modelMatrix[0].xyz);
  vec3 ay = normalize(modelMatrix[1].xyz);
  vec3 az = normalize(modelMatrix[2].xyz);
  vLight = normalize(vec3(dot(uLightDir, ax), dot(uLightDir, ay), -dot(uLightDir, az)));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const DECAL_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uAge;
uniform float uSeed;
uniform float uIntensity;
uniform float uWidth;
uniform float uRadius;
uniform vec3 uColorA;
uniform vec3 uColorB;
varying vec2 vUv;
varying vec3 vLight;
${NOISE}
float snowDepth(vec2 q, float seed, float sharpness) {
  float drift = fbm3(vec3(q * 0.85, seed)) * 0.5 + 0.5;
  vec2 cell = voronoi2(q * (1.4 + sharpness * 0.9) + seed * 7.0);
  float slabs = smoothstep(0.0, 0.55, cell.x) * 0.30 + cell.y * 0.12;
  float grain = snoise01(vec3(q * (7.0 + sharpness * 5.0), seed * 3.0)) * 0.15;
  return drift * 0.60 + slabs + grain;
}
void main() {
  vec2 c = (vUv - 0.5) * 2.0;
  float d = length(c);
  if (d > 1.0) discard;
  float alpha = 0.0;
  vec3 color = uColorA;
  float fadeOut = 1.0 - smoothstep(0.55, 1.0, uAge);

#if DECAL == 0
  float n = fbm3(vec3(c * 2.4, uSeed * 13.0));
  float burn = smoothstep(1.0, 0.15, d + n * 0.45);
  float embers = pow(max(0.0, snoise(vec3(c * 6.0, uSeed * 9.0 + uTime * 0.35))), 4.0);
  alpha = burn * (0.85 * fadeOut);
  color = mix(uColorA, uColorB, embers * (1.0 - uAge));
  color += embers * uColorB * 2.5 * (1.0 - smoothstep(0.0, 0.6, uAge));

#elif DECAL == 3
  float radius = mix(0.0, 1.0, pow(uAge, 0.55));
  float ring = smoothstep(uWidth, 0.0, abs(d - radius));
  alpha = ring * (1.0 - uAge) * 0.9;
  color = mix(uColorA, uColorB, ring);

#elif DECAL == 6
  float seed = uSeed * 37.0;
  float sharp = clamp(uWidth, 0.05, 4.0);
  vec2 q = c * max(0.35, uRadius);
  vec2 warp = vec2(fbm3(vec3(q * 0.55, seed)), fbm3(vec3(q * 0.55, seed + 5.7))) * 0.45;
  float lobes = fbm3(vec3(q * 0.8 + warp, seed + 13.0));
  float grow = pow(uAge, 0.30);
  float reach = d * (1.0 - lobes * 0.40);
  float cover = smoothstep(grow, grow - 0.38, reach);
  if (cover < 0.004) discard;
  float e = 0.16;
  float h = snowDepth(q, seed, sharp);
  float hx = snowDepth(q + vec2(e, 0.0), seed, sharp);
  float hy = snowDepth(q + vec2(0.0, e), seed, sharp);
  vec3 nrm = normalize(vec3((h - hx) / e * 0.30, 1.0, (h - hy) / e * 0.30));
  float lambert = clamp(dot(nrm, normalize(vLight)), 0.0, 1.0);
  float shade = 0.36 + 0.64 * pow(lambert, 0.8);
  float lie = smoothstep(0.10, 0.52, cover * (0.34 + 0.78 * h));
  alpha = lie * fadeOut * 0.95;
  color = mix(uColorB * 0.55, mix(uColorA, vec3(1.0), 0.45), shade);
  float glint = smoothstep(0.90, 1.0, snoise01(vec3(q * 9.0, floor(uTime * 7.0) * 0.37 + seed)));
  color += glint * pow(lambert, 2.0) * 1.5 * (1.0 - smoothstep(0.0, 0.7, uAge));
  float lip = smoothstep(0.10, 0.0, abs(reach - grow)) * (1.0 - smoothstep(0.0, 0.5, uAge));
  color = mix(color, mix(uColorB, vec3(1.0), 0.6), lip * 0.55);
  alpha = clamp(alpha + lip * cover * 0.25 * fadeOut, 0.0, 1.0);

#else
  float filWarp = fbm3(vec3(c * 1.7, uSeed * 3.0)) * 0.5;
  float fil = ridged(vec3(c * (2.4 + uWidth * 4.0) + filWarp, uSeed * 11.0));
  float veins = smoothstep(0.70, 0.96, fil);
  float growA = pow(uAge, 0.35);
  float edge = d + fbm3(vec3(c * 2.2, uSeed * 5.0)) * 0.25;
  float front = smoothstep(growA, growA * 0.15, edge);
  float hot = veins * front * (1.0 - smoothstep(0.0, 0.45, uAge));
  alpha = clamp(veins * front * 1.1, 0.0, 1.0) * fadeOut;
  color = mix(uColorA, uColorB, clamp(veins * 1.4, 0.0, 1.0));
  color += uColorB * hot * 1.8;
#endif

  alpha *= uIntensity;
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(color, alpha);
}
`;

const DEFAULTS = {
  [DecalType.SCORCH]: { a: 0x1a100c, b: 0xff6a22 },
  [DecalType.SHOCKWAVE]: { a: 0xffffff, b: 0xa8d8ff },
  [DecalType.FROST]: { a: 0xf2fbff, b: 0x4f9ad8 },
  [DecalType.ARC]: { a: 0x081018, b: 0x7ad0ff },
};

function toColor(value, fallback) {
  if (value == null) return new Color(fallback);
  return value instanceof Color ? value : new Color(value);
}

export function createDecalSystem(parent, { height = 1.15 } = {}) {
  const group = new Group();
  group.name = 'GroundDecals';
  parent.add(group);
  const geometry = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const pools = new Map();
  const active = [];

  function createDecal(type) {
    const additive = type === DecalType.SHOCKWAVE || type === DecalType.ARC;
    const def = DEFAULTS[type] || DEFAULTS[DecalType.SCORCH];
    const material = new ShaderMaterial({
      defines: { DECAL: type },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: additive ? AdditiveBlending : NormalBlending,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
      uniforms: {
        uTime: { value: 0 },
        uAge: { value: 0 },
        uSeed: { value: Math.random() },
        uIntensity: { value: 1 },
        uWidth: { value: 0.12 },
        uRadius: { value: 1 },
        uColorA: { value: new Color(def.a) },
        uColorB: { value: new Color(def.b) },
        uLightDir: { value: new Vector3(0.35, 0.82, 0.42) },
      },
      vertexShader: DECAL_VERTEX,
      fragmentShader: DECAL_FRAGMENT,
    });
    const mesh = new Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = additive ? 8 : 6;
    mesh.visible = false;
    return { mesh, material, type, age: 0, life: 1, radius: 1, growth: 0 };
  }

  function poolFor(type) {
    let pool = pools.get(type);
    if (!pool) {
      pool = [];
      pools.set(type, pool);
    }
    return pool;
  }

  function spawn(type, x, z, options = {}) {
    const pool = poolFor(type);
    const decal = pool.pop() || createDecal(type);
    const u = decal.material.uniforms;
    const def = DEFAULTS[type] || DEFAULTS[DecalType.SCORCH];
    decal.age = 0;
    decal.life = Math.max(0.05, options.life ?? 2);
    decal.radius = options.radius ?? 2;
    decal.growth = options.growth ?? 0;
    u.uAge.value = 0;
    u.uTime.value = 0;
    u.uSeed.value = Math.random();
    u.uIntensity.value = options.intensity ?? 1;
    u.uWidth.value = options.width ?? 0.12;
    u.uRadius.value = decal.radius;
    u.uColorA.value.copy(toColor(options.colorA, def.a));
    u.uColorB.value.copy(toColor(options.colorB, def.b));
    decal.mesh.position.set(x, options.height ?? height, z);
    decal.mesh.rotation.y = Math.random() * Math.PI * 2;
    decal.mesh.scale.setScalar(decal.radius * 2);
    decal.mesh.visible = true;
    group.add(decal.mesh);
    active.push(decal);
    return decal;
  }

  function update(dt) {
    for (let i = active.length - 1; i >= 0; i--) {
      const decal = active[i];
      decal.age += dt;
      const t = decal.age / decal.life;
      const u = decal.material.uniforms;
      u.uAge.value = t;
      u.uTime.value = decal.age;
      if (decal.growth !== 0) {
        decal.mesh.scale.setScalar(decal.radius * 2 * (1 + decal.growth * t));
      }
      if (t >= 1) {
        decal.mesh.visible = false;
        group.remove(decal.mesh);
        active.splice(i, 1);
        poolFor(decal.type).push(decal);
      }
    }
  }

  function clear() {
    for (const decal of active) {
      decal.mesh.visible = false;
      group.remove(decal.mesh);
      poolFor(decal.type).push(decal);
    }
    active.length = 0;
  }

  function dispose() {
    clear();
    geometry.dispose();
    for (const pool of pools.values()) {
      for (const decal of pool) decal.material.dispose();
    }
    pools.clear();
    group.parent?.remove(group);
  }

  return { spawn, update, clear, dispose, group };
}
