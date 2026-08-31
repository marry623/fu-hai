/**
 * Expanding impact shells (MIT) adapted from LinearAbiltyCastingThreeJS BurstSphere.
 * Modes: FIRE / FROST / STORM. No scene-depth soft fade.
 */
import {
  Mesh,
  IcosahedronGeometry,
  ShaderMaterial,
  AdditiveBlending,
  Color,
  Group,
  DoubleSide,
} from '../../vendor/three/three.module.js';

export const BurstMode = Object.freeze({
  FIRE: 0,
  FROST: 4,
  STORM: 5,
});

const NOISE = /* glsl */ `
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
float fbm4(vec3 p){float v=0.0;float a=0.5;for(int i=0;i<4;i++){v+=a*snoise(p);p=p*2.03+vec3(17.3,5.1,9.7);a*=0.5;}return v;}
float ridged(vec3 p){float v=0.0;float a=0.5;for(int i=0;i<4;i++){v+=a*(1.0-abs(snoise(p)));p*=2.06;a*=0.5;}return v;}
vec2 hash21(float p){vec3 p3=fract(vec3(p)*vec3(0.1031,0.1030,0.0973));p3+=dot(p3,p3.yzx+33.33);return fract((p3.xx+p3.yz)*p3.zy);}
float hash11(float p){p=fract(p*0.1031);p*=p+33.33;p*=p+p;return fract(p);}
vec2 voronoi2(vec2 p){vec2 n=floor(p);vec2 f=fract(p);float minDist=8.0;float id=0.0;
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 g=vec2(float(i),float(j));vec2 o=hash21(dot(n+g,vec2(7.13,113.17)));vec2 r=g+o-f;float d=dot(r,r);if(d<minDist){minDist=d;id=hash11(dot(n+g,vec2(31.7,57.1)));}}
  return vec2(sqrt(minDist),id);}
`;

const BURST_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uAge;
uniform float uDisplace;
uniform float uSeed;
uniform float uTurbulence;
varying vec3 vNormalW;
varying vec3 vViewDir;
varying float vDisp;
${NOISE}
void main() {
  vec3 np = normal * (1.6 + uAge * 1.4) + vec3(uSeed * 13.0) - vec3(0.0, uTime * 0.6, 0.0);
  float n = fbm4(np) * 0.6 + ridged(np * 1.3) * 0.4;
  vDisp = n;
  float amount = uDisplace * (0.35 + uAge * 0.9) * uTurbulence;
  vec3 pos = position + normal * n * amount;
  vec4 world = modelMatrix * vec4(pos, 1.0);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vViewDir = cameraPosition - world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const BURST_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uAge;
uniform float uSeed;
uniform float uIntensity;
uniform float uFresnel;
uniform float uOpacity;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
varying vec3 vNormalW;
varying vec3 vViewDir;
varying float vDisp;
${NOISE}
vec3 gradient4(vec3 c0, vec3 c1, vec3 c2, vec3 c3, float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 a = mix(c0, c1, smoothstep(0.0, 0.34, t));
  vec3 b = mix(a, c2, smoothstep(0.30, 0.68, t));
  return mix(b, c3, smoothstep(0.64, 1.0, t));
}
void main() {
  float ndv = abs(dot(normalize(vViewDir), normalize(vNormalW)));
  float fres = clamp(uFresnel * pow(1.0 - ndv, 2.2), 0.0, 4.0);
  float heat = clamp(vDisp * 0.5 + 0.5, 0.0, 1.0);
  float threshold = uAge * 1.15 - 0.15;
  float mask = step(threshold, heat);
  float edge = smoothstep(threshold, threshold + 0.3, heat) - mask;
  float alpha = uOpacity;
  vec3 color;

#if BURST_MODE == 0
  color = gradient4(uColorA, uColorB, uColorC, uColorC * 0.15, 1.0 - heat);
  color += edge * uColorA * 3.0;
  alpha *= (1.0 - uAge) * (0.55 + fres * 0.8) * mask;
#elif BURST_MODE == 4
  float plates = smoothstep(0.42, 0.95, heat);
  float rime = smoothstep(0.55, 0.05, voronoi2(vNormalW.xy * 9.0 + vNormalW.z * 3.0 + uSeed).x);
  color = mix(uColorA, uColorB, heat * 0.9);
  color = mix(color, uColorC * (0.7 + 0.6 * rime), plates);
  color += uColorC * fres * 1.3;
  alpha *= (1.0 - uAge) * (0.16 + fres * 0.95 + plates * 0.7) * mask;
#else
  float fil = ridged(vNormalW * (5.0 + uAge * 7.0) + vec3(uSeed * 9.0) + vec3(0.0, uTime * 3.4, 0.0));
  float arcs = smoothstep(0.80, 0.97, fil) * (1.0 - uAge * 0.6);
  float rim = pow(fres, 1.6);
  color = mix(uColorA, uColorB, heat * 0.5);
  color = mix(color, uColorC, arcs);
  color += uColorC * rim * 1.2 + uColorC * arcs * 2.4;
  alpha *= (1.0 - uAge) * (rim * 0.55 + arcs * 0.9) * mask;
#endif

  alpha = clamp(alpha, 0.0, 1.0);
  if (alpha < 0.004) discard;
  color *= uIntensity;
  gl_FragColor = vec4(color, alpha);
}
`;

function toColor(value, fallback) {
  if (value == null) return new Color(fallback);
  return value instanceof Color ? value : new Color(value);
}

export function createBurstSystem(parent) {
  const group = new Group();
  group.name = 'Bursts';
  parent.add(group);
  const geometry = new IcosahedronGeometry(1, 3);
  const pools = new Map();
  const active = [];

  function createBurst(mode) {
    const material = new ShaderMaterial({
      defines: { BURST_MODE: mode },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: AdditiveBlending,
      side: DoubleSide,
      toneMapped: false,
      uniforms: {
        uTime: { value: 0 },
        uAge: { value: 0 },
        uSeed: { value: Math.random() },
        uDisplace: { value: 0.45 },
        uTurbulence: { value: 1 },
        uIntensity: { value: 1 },
        uFresnel: { value: 1 },
        uOpacity: { value: 1 },
        uColorA: { value: new Color(1, 0.9, 0.6) },
        uColorB: { value: new Color(1, 0.45, 0.1) },
        uColorC: { value: new Color(0.4, 0.08, 0.03) },
      },
      vertexShader: BURST_VERTEX,
      fragmentShader: BURST_FRAGMENT,
    });
    const mesh = new Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 15;
    mesh.visible = false;
    return { mesh, material, mode, age: 0, life: 1, radius: 1, endRadius: 2, squash: 1 };
  }

  function poolFor(mode) {
    let pool = pools.get(mode);
    if (!pool) {
      pool = [];
      pools.set(mode, pool);
    }
    return pool;
  }

  function spawn(mode, x, y, z, options = {}) {
    const burst = poolFor(mode).pop() || createBurst(mode);
    const u = burst.material.uniforms;
    burst.age = 0;
    burst.life = Math.max(0.05, options.life ?? 0.9);
    burst.radius = options.radius ?? 0.4;
    burst.endRadius = options.endRadius ?? 3;
    burst.squash = options.squash ?? 1;
    u.uAge.value = 0;
    u.uTime.value = 0;
    u.uSeed.value = Math.random() * 10;
    u.uIntensity.value = options.intensity ?? 1;
    u.uOpacity.value = options.opacity ?? 1;
    u.uFresnel.value = options.fresnel ?? 1;
    u.uDisplace.value = options.displace ?? 0.45;
    u.uTurbulence.value = options.turbulence ?? 1;
    u.uColorA.value.copy(toColor(options.colorA, 0xffe6a0));
    u.uColorB.value.copy(toColor(options.colorB, 0xff6a18));
    u.uColorC.value.copy(toColor(options.colorC, 0x661408));
    burst.mesh.position.set(x, y, z);
    burst.mesh.scale.setScalar(burst.radius);
    burst.mesh.visible = true;
    group.add(burst.mesh);
    active.push(burst);
    return burst;
  }

  function update(dt) {
    for (let i = active.length - 1; i >= 0; i--) {
      const burst = active[i];
      burst.age += dt;
      const t = Math.min(1, burst.age / burst.life);
      burst.material.uniforms.uAge.value = t;
      burst.material.uniforms.uTime.value = burst.age;
      const ease = 1 - (1 - t) ** 5;
      const scale = burst.radius + (burst.endRadius - burst.radius) * ease;
      burst.mesh.scale.set(scale, scale * burst.squash, scale);
      if (t >= 1) {
        burst.mesh.visible = false;
        group.remove(burst.mesh);
        active.splice(i, 1);
        poolFor(burst.mode).push(burst);
      }
    }
  }

  function clear() {
    for (const burst of active) {
      burst.mesh.visible = false;
      group.remove(burst.mesh);
      poolFor(burst.mode).push(burst);
    }
    active.length = 0;
  }

  function dispose() {
    clear();
    geometry.dispose();
    for (const pool of pools.values()) {
      for (const burst of pool) burst.material.dispose();
    }
    pools.clear();
    group.parent?.remove(group);
  }

  return { spawn, update, clear, dispose, group };
}
