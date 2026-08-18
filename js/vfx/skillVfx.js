/**
 * Skill VFX + mouse aim preview.
 * Shaders / crystal / bolt / meteor geometry adapted (MIT) from
 * chirovisuals / achrefelouafi LinearAbiltyCastingThreeJS (ThreeJSVFX-Demo).
 */
import * as THREE from 'three';
import { createCrystalGeometry, createAsteroidGeometry, createBoltRibbonGeometry, hash11 } from './geometry.js?v=29y';
import { createDecalSystem, DecalType } from './groundDecals.js?v=29u';
import { createGpuSparks } from './gpuSparks.js?v=29u';
import { createBurstSystem, BurstMode } from './burstSphere.js?v=29u';
import { spawnVoid } from './spawnVoid.js?v=30a';
import { spawnPhoenix } from './spawnPhoenix.js?v=30a';
import { spawnSingularity } from './spawnSingularity.js?v=30a';
import { spawnWorldroot } from './spawnWorldroot.js?v=30a';
import { spawnBeam } from './spawnBeam.js?v=30a';
import { spawnSnare } from './spawnSnare.js?v=30a';
import { spawnGlacier } from './spawnGlacier.js?v=30a';

/** Sit above opaque waving water (crests ~0.8–1.1m). */
const Y_WATER = 1.15;
const MAX_CASTS = 4;
const ICE_COUNT = 56;
const STRANDS = 10;
const NODES = 64;

const NOISE = /* glsl */ `
float hash11(float p){p=fract(p*0.1031);p*=p+33.33;p*=p+p;return fract(p);}
vec2 hash21(float p){vec3 p3=fract(vec3(p)*vec3(0.1031,0.1030,0.0973));p3+=dot(p3,p3.yzx+33.33);return fract((p3.xx+p3.yz)*p3.zy);}
float hash13(vec3 p3){p3=fract(p3*0.1031);p3+=dot(p3,p3.zyx+31.32);return fract((p3.x+p3.y)*p3.z);}
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
float fbm3(vec3 p){float v=0.0;float a=0.5;for(int i=0;i<3;i++){v+=a*snoise(p);p*=2.02;a*=0.5;}return v;}
float ridged(vec3 p){float v=0.0;float a=0.5;for(int i=0;i<4;i++){v+=a*(1.0-abs(snoise(p)));p*=2.06;a*=0.5;}return v;}
vec2 voronoi2(vec2 p){vec2 n=floor(p);vec2 f=fract(p);float minDist=8.0;float id=0.0;
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 g=vec2(float(i),float(j));vec2 o=hash21(dot(n+g,vec2(7.13,113.17)));vec2 r=g+o-f;float d=dot(r,r);if(d<minDist){minDist=d;id=hash11(dot(n+g,vec2(31.7,57.1)));}}
  return vec2(sqrt(minDist),id);}
`;

const _dummy = new THREE.Object3D();
const _side = new THREE.Vector3();

function iceMaterial() {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.18,
    metalness: 0,
    flatShading: true,
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide,
    depthWrite: true,
    envMapIntensity: 0,
  });
  const uniforms = {
    uTime: { value: 0 },
    uColorDeep: { value: new THREE.Color(0x1e5a68) },
    uColorIce: { value: new THREE.Color(0x4fb4d8) },
    uColorRim: { value: new THREE.Color(0xc8e8f8) },
    uColorCore: { value: new THREE.Color(0x5ec8e8) },
  };
  material.userData.uniforms = uniforms;
  material.customProgramCacheKey = () => 'fuHaiIceVfx';
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute float aSeed;
attribute float aBirth;
varying vec3 vIceLocal;
varying vec3 vIceWorld;
varying float vIceSeed;
varying float vIceBirth;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vIceLocal = transformed;
vIceSeed = aSeed;
vIceBirth = aBirth;
#ifdef USE_INSTANCING
vIceWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
#else
vIceWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
#endif`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uTime;
uniform vec3 uColorDeep;
uniform vec3 uColorIce;
uniform vec3 uColorRim;
uniform vec3 uColorCore;
varying vec3 vIceLocal;
varying vec3 vIceWorld;
varying float vIceSeed;
varying float vIceBirth;
${NOISE}`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
{
  vec3 N = normalize(normal);
  float ndv = clamp(dot(N, normalize(vViewPosition)), 0.0, 1.0);
  float thickness = clamp(ndv * 1.15, 0.0, 1.0);
  float fres = pow(1.0 - ndv, 2.4) * 2.3;
  vec3 fp = vIceWorld * 6.5 + vIceSeed * 37.0;
  float cracks = smoothstep(0.55, 0.98, ridged(fp));
  float veins = fbm3(vIceLocal * 12.8 + vIceSeed * 11.0) * 0.5 + 0.5;
  veins = smoothstep(0.45, 0.92, veins);
  vec3 body = mix(uColorIce, uColorDeep, thickness);
  body = mix(body, uColorRim, veins * 0.22);
  body = mix(body, uColorRim, cracks * 0.22);
  float rime = smoothstep(0.55, 0.0, vIceLocal.y) * (0.5 + 0.5 * fbm3(vIceLocal * 9.0 + vIceSeed * 5.0));
  body = mix(body, uColorRim, clamp(rime, 0.0, 1.0) * 0.4);
  body *= mix(1.0, 0.55 + 0.9 * ndv, 0.68);
  float sp = snoise(vIceWorld * 34.0 + vec3(0.0, uTime * 0.7, 0.0) + vIceSeed * 23.0);
  sp = pow(clamp(sp, 0.0, 1.0), 14.0) * smoothstep(0.0, 0.7, fres + 0.3);
  float rimAmount = pow(1.0 - ndv, 2.4);
  vec3 glow = uColorRim * rimAmount * 1.0;
  glow += uColorCore * (cracks * 0.45 + veins * 0.14) * 0.75;
  glow += uColorRim * sp * 0.85;
  glow += uColorCore * vIceBirth * 1.2;
  glow *= 0.45;
  glow /= 1.0 + glow * 0.45;
  diffuseColor.rgb *= body;
  totalEmissiveRadiance += glow;
  diffuseColor.a = clamp(diffuseColor.a * (0.62 + 0.5 * fres) + cracks * 0.12, 0.0, 1.0);
}`,
      );
  };
  return material;
}

function boltMaterial(glow) {
  return new THREE.ShaderMaterial({
    defines: glow ? { BOLT_GLOW: '' } : {},
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    uniforms: {
      uTime: { value: 0 },
      uOrigin: { value: new THREE.Vector3() },
      uTarget: { value: new THREE.Vector3() },
      uSide: { value: new THREE.Vector3(1, 0, 0) },
      uSeed: { value: 0 },
      uProgress: { value: 0 },
      uFade: { value: 1 },
      uStrands: { value: STRANDS },
    },
    vertexShader: /* glsl */ `
      #define PI 3.14159265
      #define TAU 6.2831853
      uniform float uTime;
      uniform vec3 uOrigin;
      uniform vec3 uTarget;
      uniform vec3 uSide;
      uniform float uSeed;
      uniform float uStrands;
      uniform float uFade;
      attribute float aStrand;
      varying float vT;
      varying float vSide;
      varying float vStrand;
      varying float vFlash;
      ${NOISE}
      float vnoise(float x, float seed){
        float i=floor(x);float f=x-i;
        return mix(hash11(i+seed), hash11(i+1.0+seed), f)*2.0-1.0;
      }
      vec2 kink(float t, float seed, float span){
        vec2 o=vec2(0.0);float amp=1.0;float freq=max(0.85,0.01)*span;float scroll=uTime*3.2;
        for(int i=0;i<4;i++){
          o.x+=amp*vnoise(t*freq+scroll, seed+13.0*float(i));
          o.y+=amp*vnoise(t*freq+scroll*1.17, seed+71.3+13.0*float(i));
          amp*=0.55;freq*=2.0;scroll*=1.63;
        }
        return o;
      }
      vec3 boltPoint(float t, float seed, float radial, vec3 n1, vec3 n2, float span){
        vec3 axis=mix(uOrigin,uTarget,t);
        axis.y+=0.22*sin(t*PI);
        float pinch=0.14;
        float ends=smoothstep(0.0,pinch,t)*mix(1.0,smoothstep(0.0,pinch,1.0-t),0.8);
        vec2 offset=kink(t,seed,span)*0.42*ends;
        float angle=seed*TAU+(t*0.45+uTime*0.8)*TAU;
        float reach=mix(0.05,0.85,pow(clamp(t,0.0,1.0),1.6));
        offset+=vec2(cos(angle),sin(angle))*reach*radial;
        return axis+n1*offset.x+n2*offset.y;
      }
      void main(){
        float t=position.x; float side=position.y;
        vT=t; vSide=side;
        vec3 delta=uTarget-uOrigin;
        float span=max(length(delta),0.01);
        vec3 dir=delta/span;
        vec3 n1=uSide-dir*dot(uSide,dir);
        n1=length(n1)>1e-4?normalize(n1):normalize(cross(dir,vec3(0.0,1.0,0.0)));
        vec3 n2=normalize(cross(dir,n1));
        float strike=floor(uTime*24.0);
        float seed=hash11(aStrand*7.13+uSeed+strike*3.77)*97.0;
        float radial=uStrands<=1.0?0.0:aStrand/(uStrands-1.0);
        vStrand=radial;
        vec3 here=boltPoint(t,seed,radial,n1,n2,span);
        float step_=0.02; float ahead=t+step_; float flip=1.0;
        if(ahead>1.0){ahead=t-step_;flip=-1.0;}
        vec3 next=boltPoint(ahead,seed,radial,n1,n2,span);
        vec3 tangent=(next-here)*flip;
        tangent=length(tangent)>1e-5?normalize(tangent):dir;
        vec3 toCamera=normalize(cameraPosition-here);
        vec3 binormal=cross(tangent,toCamera);
        float bl=length(binormal);
        binormal=bl>1e-4?binormal/bl:n1;
        float flash=mix(1.0, hash11(floor(uTime*34.0)+aStrand*3.7+uSeed), 0.5);
        vFlash=flash;
        float halfWidth=0.055 ${glow ? '* 4.0' : ''};
        halfWidth*=mix(1.0,0.5,pow(clamp(t,0.0,1.0),1.0));
        halfWidth*=mix(2.1,1.0,radial);
        halfWidth*=flash*uFade;
        vec4 mv=viewMatrix*vec4(here+binormal*side*halfWidth,1.0);
        gl_Position=projectionMatrix*mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uSeed;
      uniform float uProgress;
      uniform float uFade;
      varying float vT;
      varying float vSide;
      varying float vStrand;
      varying float vFlash;
      ${NOISE}
      void main(){
        float drawn=smoothstep(uProgress, uProgress-0.08, vT);
        if(drawn<=0.002) discard;
        float v=clamp(abs(vSide),0.0,1.0);
        #ifdef BOLT_GLOW
        float profile=pow(1.0-v,2.4);
        vec3 color=mix(vec3(0.04,0.24,0.78), vec3(0.22,0.62,1.0), profile);
        float alpha=profile*0.18;
        #else
        float profile=pow(1.0-v,3.4);
        vec3 color=mix(vec3(0.22,0.62,1.0), vec3(0.78,0.92,1.0), smoothstep(0.0,0.5,profile));
        color=mix(color, vec3(1.0), smoothstep(0.45,1.0,profile));
        float alpha=profile;
        #endif
        color+=vec3(1.0)*smoothstep(uProgress-0.16,uProgress,vT)*0.7;
        float flicker=1.0-0.3*hash11(floor(uTime*34.0)+uSeed);
        alpha*=drawn*flicker*vFlash*uFade*mix(1.0,0.72,vStrand);
        if(alpha<0.003) discard;
        gl_FragColor=vec4(color, alpha);
      }
    `,
  });
}

function meteorMaterial() {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.94,
    metalness: 0,
    flatShading: true,
    envMapIntensity: 0,
  });
  const uniforms = {
    uTime: { value: 0 },
    uCharge: { value: 0 },
    uHeading: { value: new THREE.Vector3(0, -1, 0) },
    uColorRock: { value: new THREE.Color(0x2a1c16) },
    uColorChar: { value: new THREE.Color(0x0c0806) },
    uColorCrack: { value: new THREE.Color(0xff4a10) },
    uColorHot: { value: new THREE.Color(0xffc060) },
  };
  material.userData.uniforms = uniforms;
  material.customProgramCacheKey = () => 'fuHaiMeteorVfx';
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vRockLocal;
varying vec3 vRockNormalW;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vRockLocal = transformed;
vRockNormalW = normalize(mat3(modelMatrix) * objectNormal);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uTime;
uniform float uCharge;
uniform vec3 uHeading;
uniform vec3 uColorRock;
uniform vec3 uColorChar;
uniform vec3 uColorCrack;
uniform vec3 uColorHot;
varying vec3 vRockLocal;
varying vec3 vRockNormalW;
${NOISE}`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
{
  vec3 N = normalize(normal);
  float ndv = clamp(dot(N, normalize(vViewPosition)), 0.0, 1.0);
  float rim = pow(1.0 - ndv, 2.2);
  vec3 p = vRockLocal * 2.4;
  float f1 = fbm3(p);
  float f2 = fbm3(p * 2.7 + 11.3);
  float width = max(0.004, 0.1 * (1.0 + uCharge * 0.8));
  float distance = min(abs(f1), abs(f2) / 0.65);
  float fissure = 1.0 - smoothstep(width * 0.35, width, distance);
  float lip = 1.0 - smoothstep(width, width * 2.0, distance);
  float core = 1.0 - smoothstep(0.0, width * 0.45, distance);
  float pulse = snoise(vRockLocal * 4.0 + vec3(0.0, uTime * 0.9, 0.0));
  float flow = mix(1.0, 0.45 + 0.75 * (pulse * 0.5 + 0.5), 0.7);
  vec3 rock = mix(uColorRock, uColorChar, smoothstep(0.3, 0.85, fbm3(vRockLocal * 3.4) * 0.5 + 0.5));
  vec3 faceN = normalize(cross(dFdx(vRockLocal), dFdy(vRockLocal)));
  float facet = hash13(faceN * 37.0 + 0.5);
  rock *= 1.0 + (facet - 0.5) * 0.35;
  rock = mix(rock, uColorChar, lip * 0.8);
  rock *= 1.0 - fissure * 0.92;
  rock *= mix(0.55, 1.15, ndv);
  diffuseColor.rgb *= rock;
  float heat = fissure * flow;
  vec3 glow = mix(uColorCrack, uColorHot, core * core) * heat * 2.4;
  float charge2 = uCharge * uCharge;
  glow += uColorCrack * rim * 0.7 * charge2;
  float lead = pow(clamp(dot(normalize(vRockNormalW), uHeading), 0.0, 1.0), 2.6);
  glow += uColorHot * lead * 1.1 * charge2;
  glow /= 1.0 + glow * 0.45;
  totalEmissiveRadiance += glow;
}`,
      );
  };
  return material;
}

function aimMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    uniforms: {
      uTime: { value: 0 },
      uQuadLength: { value: 10 },
      uQuadWidth: { value: 6 },
      uQuadBack: { value: 1 },
      uLength: { value: 8 },
      uReveal: { value: 1 },
      uInvalid: { value: 0 },
      uFill: { value: 0.3 },
      uColorCore: { value: new THREE.Color(0.92, 0.98, 1) },
      uColorEdge: { value: new THREE.Color(0.24, 0.7, 1) },
      uColorInvalid: { value: new THREE.Color(1.0, 0.12, 0.08) },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uQuadLength;
      uniform float uQuadWidth;
      uniform float uQuadBack;
      uniform float uLength;
      uniform float uReveal;
      uniform float uInvalid;
      uniform float uFill;
      uniform vec3 uColorCore;
      uniform vec3 uColorEdge;
      uniform vec3 uColorInvalid;
      varying vec2 vUv;
      ${NOISE}
      #define TAU 6.2831853
      float sdBox(vec2 p, vec2 b){ vec2 d=abs(p)-b; return length(max(d,0.0))+min(max(d.x,d.y),0.0); }
      float sdTriangle(vec2 p, vec2 p0, vec2 p1, vec2 p2){
        vec2 e0=p1-p0,e1=p2-p1,e2=p0-p2;
        vec2 v0=p-p0,v1=p-p1,v2=p-p2;
        vec2 pq0=v0-e0*clamp(dot(v0,e0)/dot(e0,e0),0.0,1.0);
        vec2 pq1=v1-e1*clamp(dot(v1,e1)/dot(e1,e1),0.0,1.0);
        vec2 pq2=v2-e2*clamp(dot(v2,e2)/dot(e2,e2),0.0,1.0);
        float s=sign(e0.x*e2.y-e0.y*e2.x);
        vec2 d=min(min(vec2(dot(pq0,pq0),s*(v0.x*e0.y-v0.y*e0.x)),
          vec2(dot(pq1,pq1),s*(v1.x*e1.y-v1.y*e1.x))),
          vec2(dot(pq2,pq2),s*(v2.x*e2.y-v2.y*e2.x)));
        return -sqrt(d.x)*sign(d.y);
      }
      void main(){
        vec2 p=vec2((vUv.x-0.5)*uQuadWidth,(1.0-vUv.y)*uQuadLength-uQuadBack);
        float length_=max(uLength,0.95);
        float headLen=min(2.6,length_-0.9);
        float headBase=length_-headLen;
        float shaft=sdBox(p-vec2(0.0,(0.9+headBase)*0.5), vec2(0.42,max(0.001,(headBase-0.9)*0.5)));
        float head=sdTriangle(p, vec2(-1.35,headBase), vec2(1.35,headBase), vec2(0.0,length_));
        float d=min(shaft,head)-0.12;
        float aa=fwidth(d)+0.06;
        float body=1.0-smoothstep(-aa,aa,d);
        float outline=1.0-smoothstep(0.09,0.09+aa,abs(d));
        float depth=clamp(-d/0.42,0.0,1.0);
        float interior=pow(1.0-depth,1.1);
        float phase=(p.y-abs(p.x)*0.55-uTime*2.4)*0.55;
        float band=pow(0.5+0.5*cos(phase*TAU), mix(1.0,9.0,0.62));
        float frost=fbm3(vec3(p*1.6,uTime*0.35))*0.5+0.5;
        vec2 cell=voronoi2(p*2.4+13.7);
        float plates=smoothstep(0.32,0.0,cell.x);
        float wash=interior*mix(1.0,band,0.55)*mix(1.0,frost,0.45)+plates*0.19*interior;
        wash*=1.0+0.28*sin(uTime*2.2*TAU);
        float radius=length(p);
        float ring=smoothstep(0.06,0.0,abs(radius-0.62));
        float arc=smoothstep(0.05,0.0,abs(radius-length_))*smoothstep(2.97,1.48,abs(p.x))*0.55;
        vec2 q=p-vec2(0.0,length_);
        float qr=length(q);
        float qa=atan(q.y,q.x)+uTime*0.45*TAU;
        float spokes=smoothstep(0.86,1.0,abs(cos(qa*3.0)))*smoothstep(1.15,0.0,qr);
        float glyph=max(spokes, smoothstep(0.045,0.0,abs(qr-0.575)))*0.9;
        float front=uReveal*(length_+1.15);
        float sweep=smoothstep(front+0.25,front-0.15,p.y);
        float fill=body*wash*uFill;
        float lines=outline*2.6+ring+arc+glyph;
        float alpha=clamp(fill+lines,0.0,1.0)*sweep;
        if(alpha<0.004) discard;
        vec3 color=uColorEdge*fill+uColorCore*(lines);
        color=mix(color, uColorInvalid*(fill+lines*1.35), uInvalid);
        gl_FragColor=vec4(color, alpha);
      }
    `,
  });
}

function decalOpts() {
  return {
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  };
}

function frostStripMaterial() {
  return new THREE.ShaderMaterial({
    ...decalOpts(),
    uniforms: {
      uTime: { value: 0 },
      uFade: { value: 1 },
      uProgress: { value: 0 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uFade;
      uniform float uProgress;
      varying vec2 vUv;
      ${NOISE}
      void main(){
        if(vUv.y > uProgress) discard;
        vec2 p = vec2((vUv.x-0.5)*2.0, vUv.y);
        float edge = 1.0 - smoothstep(0.55, 1.0, abs(p.x));
        float frost = fbm3(vec3(p*6.0, uTime*0.4))*0.5+0.5;
        float plates = 1.0 - smoothstep(0.12, 0.38, voronoi2(p*vec2(3.5,8.0)).x);
        float alpha = edge * (0.18 + frost*0.22 + plates*0.2) * uFade;
        if(alpha < 0.02) discard;
        vec3 col = mix(vec3(0.35,0.68,0.88), vec3(0.72,0.90,1.0), plates);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}

function burnDiscMaterial(colorA, colorB) {
  return new THREE.ShaderMaterial({
    ...decalOpts(),
    uniforms: {
      uTime: { value: 0 },
      uFade: { value: 1 },
      uRadius: { value: 4 },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uFade;
      uniform float uRadius;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      varying vec2 vUv;
      ${NOISE}
      void main(){
        vec2 p = (vUv-0.5)*2.0;
        float r = length(p);
        if(r > 1.0) discard;
        float ring = smoothstep(0.22, 0.0, abs(r-0.72));
        float core = pow(1.0-r, 1.6);
        float veins = 1.0 - smoothstep(0.04, 0.18, abs(fbm3(vec3(p*5.0, uTime))));
        float alpha = (core*0.45 + ring*0.9 + veins*0.35*(1.0-r)) * uFade;
        if(alpha < 0.02) discard;
        vec3 col = mix(uColorA, uColorB, ring + veins*0.4);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}

function makeSplash(group, x, z, color, count = 10) {
  const geo = new THREE.ConeGeometry(0.18, 1.1, 4);
  geo.translate(0, 0.55, 0);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const parts = [];
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(geo, mat);
    const a = (i / count) * Math.PI * 2 + hash11(i * 2.1) * 0.4;
    m.userData.vx = Math.cos(a) * (2.4 + hash11(i * 5.3) * 2.2);
    m.userData.vz = Math.sin(a) * (2.4 + hash11(i * 7.1) * 2.2);
    m.userData.vy = 4.5 + hash11(i * 3.7) * 3.5;
    m.position.set(x, Y_WATER, z);
    m.visible = false;
    m.rotation.z = Math.cos(a) * 0.7;
    m.rotation.x = Math.sin(a) * 0.7;
    group.add(m);
    parts.push(m);
  }
  return {
    parts,
    geo,
    mat,
    update(dt, age) {
      const fade = Math.max(0, 1 - age / 0.7);
      mat.opacity = 0.55 * fade;
      for (const m of parts) {
        m.visible = true;
        m.userData.vy -= 14 * dt;
        m.position.x += m.userData.vx * dt;
        m.position.y += m.userData.vy * dt;
        m.position.z += m.userData.vz * dt;
        m.scale.setScalar(0.55 + age * 0.85);
      }
      return fade > 0;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}

function placeStrip(mesh, origin, dir, range) {
  const yaw = Math.atan2(dir.x, dir.z);
  mesh.position.set(origin.x, Y_WATER, origin.z);
  mesh.rotation.set(0, yaw, 0);
  mesh.scale.set(3.6, 1, range);
}

function zoneMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    uniforms: {
      uTime: { value: 0 },
      uRadius: { value: 8 },
      uInvalid: { value: 0 },
      uFill: { value: 0.18 },
      uColor: { value: new THREE.Color(1.0, 0.45, 0.12) },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uRadius;
      uniform float uInvalid;
      uniform float uFill;
      uniform vec3 uColor;
      varying vec2 vUv;
      ${NOISE}
      void main(){
        vec2 p=(vUv-0.5)*2.0;
        float r=length(p);
        float ring=smoothstep(0.07,0.0,abs(r-0.98));
        float fill=smoothstep(1.0,0.12,r)*uFill;
        float pulse=0.75+0.25*sin(uTime*6.0);
        float frost=fbm3(vec3(p*4.0, uTime*0.4))*0.5+0.5;
        float alpha=(ring*1.4+fill)*pulse*(0.7+0.3*frost);
        if(alpha<0.01) discard;
        vec3 col=mix(uColor, vec3(1.0,0.12,0.06), uInvalid);
        gl_FragColor=vec4(col, alpha);
      }
    `,
  });
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,170,70,0.75)');
  grd.addColorStop(1, 'rgba(255,40,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

let _glowTex = null;
function getGlowTexture() {
  if (!_glowTex) _glowTex = glowTexture();
  return _glowTex;
}

function spawnIce(root, origin, dir, range, fx, hooks = {}) {
  const group = new THREE.Group();
  root.add(group);
  const geo = createCrystalGeometry({ seed: 7.3, sides: 6, taper: 0.13, roughness: 0.28, bend: 0.22 });
  const seeds = new THREE.InstancedBufferAttribute(new Float32Array(ICE_COUNT), 1);
  const births = new THREE.InstancedBufferAttribute(new Float32Array(ICE_COUNT), 1);
  for (let i = 0; i < ICE_COUNT; i++) seeds.array[i] = Math.random() * 10;
  geo.setAttribute('aSeed', seeds);
  geo.setAttribute('aBirth', births);
  const mat = iceMaterial();
  const mesh = new THREE.InstancedMesh(geo, mat, ICE_COUNT);
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.renderOrder = 10;
  group.add(mesh);

  const stripMat = frostStripMaterial();
  const stripGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5);
  const strip = new THREE.Mesh(stripGeo, stripMat);
  strip.renderOrder = 8;
  placeStrip(strip, origin, dir, range);
  group.add(strip);

  const frostDisc = new THREE.Mesh(new THREE.CircleGeometry(1, 40), burnDiscMaterial(0x7ad8ff, 0xf4ffff));
  frostDisc.rotation.x = -Math.PI / 2;
  frostDisc.position.set(origin.x + dir.x * range, Y_WATER, origin.z + dir.z * range);
  frostDisc.scale.setScalar(3.2);
  frostDisc.renderOrder = 9;
  frostDisc.visible = false;
  group.add(frostDisc);

  const splash = makeSplash(group, origin.x + dir.x * range, origin.z + dir.z * range, 0xd8f4ff, 4);
  const light = new THREE.PointLight(0x9ad8ff, 0, 22);
  group.add(light);
  const recs = [];
  for (let i = 0; i < ICE_COUNT; i++) {
    const along = (i / (ICE_COUNT - 1)) ** 0.82;
    const halfW = 0.55 + along * 2.4;
    const lateral = (hash11(i * 3.17) - 0.5) * 2 * halfW * 0.9;
    const rubble = hash11(i * 8.3) < 0.42;
    const flank = Math.min(1, Math.abs(lateral) / Math.max(0.25, halfW));
    let h = rubble
      ? 0.28 + hash11(i * 9.1) * 0.32
      : 0.6 + along * 2.0 + hash11(i * 9.1) * 0.4;
    h *= 1 - flank * 0.45;
    recs.push({
      along,
      lateral,
      h,
      r: 0.22 + along * 0.28 + hash11(i * 5.3) * 0.08,
      yaw: hash11(i * 2.7) * Math.PI * 2,
      lean: (hash11(i * 4.1) - 0.5) * 0.4,
      erupt: -1,
    });
  }
  let age = 0;
  let front = 0;
  let frostMark = 0;
  let mistAcc = 0;
  let glitterAcc = 0;
  let impacted = false;
  const frostStep = 2.2;
  const speed = 28;
  const life = range / speed + 1.6;

  function update(dt) {
    age += dt;
    front = Math.min(range, front + speed * dt);
    const uFront = front / range;
    mat.userData.uniforms.uTime.value = age;
    stripMat.uniforms.uTime.value = age;
    stripMat.uniforms.uProgress.value = uFront;
    stripMat.uniforms.uFade.value = age > life - 0.7 ? Math.max(0, (life - age) / 0.7) : 1;
    light.position.set(origin.x + dir.x * front, Y_WATER + 1.4, origin.z + dir.z * front);

    while (front - frostMark >= frostStep) {
      frostMark += frostStep;
      const s = frostMark / range;
      const lat = (hash11(frostMark * 3.1 + age) - 0.5) * (0.9 + s * 2.4);
      const px = origin.x + dir.x * frostMark + (-dir.z) * lat;
      const pz = origin.z + dir.z * frostMark + dir.x * lat;
      fx.decals.spawn(DecalType.FROST, px, pz, {
        radius: 1.5 + s * 1.6,
        life: 2.4,
        width: 1.4,
        intensity: 0.7,
        colorA: 0xd8eef8,
        colorB: 0x3e88b8,
      });
      fx.sparks.emit(2, {
        x: px, y: Y_WATER + 0.35, z: pz,
        speed: 1.1, spread: 1, life: 0.7, size: 8, color: 0x8ad0e8, gravity: 0.35, vy: 1,
      });
      fx.sparks.emit(3, {
        x: px, y: Y_WATER + 0.55, z: pz,
        speed: 1.8, spread: 0.85, life: 0.5, size: 3.5, color: 0xd8f4ff, gravity: 0.85, vy: 1,
      });
    }

    mistAcc += dt * 8;
    const mistN = Math.floor(mistAcc);
    mistAcc -= mistN;
    if (mistN > 0) {
      fx.sparks.emit(mistN, {
        x: origin.x + dir.x * front, y: Y_WATER + 0.4, z: origin.z + dir.z * front,
        radius: 0.55, speed: 0.9, spread: 1, life: 0.7, size: 8, color: 0x8ad0e8, gravity: 0.25, vy: 1,
      });
    }
    glitterAcc += dt * 10;
    const glN = Math.floor(glitterAcc);
    glitterAcc -= glN;
    if (glN > 0) {
      fx.sparks.emit(glN, {
        x: origin.x + dir.x * front, y: Y_WATER + 0.55, z: origin.z + dir.z * front,
        radius: 0.7, speed: 1.4, spread: 0.9, life: 0.45, size: 3.5, color: 0xd0eef8, gravity: 0.9, vy: 1,
      });
    }
    hooks.onSweep?.(front);

    if (uFront >= 0.98) {
      frostDisc.visible = true;
      frostDisc.material.uniforms.uTime.value = age;
      frostDisc.material.uniforms.uFade.value = stripMat.uniforms.uFade.value;
      splash.update(dt, Math.max(0, age - range / speed));
      if (!impacted) {
        impacted = true;
        const ix = origin.x + dir.x * range;
        const iz = origin.z + dir.z * range;
        fx.bursts.spawn(BurstMode.FROST, ix, Y_WATER + 0.7, iz, {
          radius: 0.5, endRadius: 3.4, life: 0.95, squash: 0.72, intensity: 1.15,
          fresnel: 1.3, displace: 0.55, opacity: 0.85,
          colorA: 0x7ad8ff, colorB: 0xc8eeff, colorC: 0xf4ffff,
        });
        fx.decals.spawn(DecalType.SHOCKWAVE, ix, iz, {
          radius: 4.2, life: 0.75, width: 0.07, intensity: 0.95,
          colorA: 0xe8f8ff, colorB: 0x88d0ff,
        });
        fx.decals.spawn(DecalType.FROST, ix, iz, {
          radius: 3.6, life: 2.8, width: 1.6, intensity: 1.15,
          colorA: 0xf2fbff, colorB: 0x4f9ad8,
        });
        fx.sparks.emit(12, {
          x: ix, y: Y_WATER + 0.5, z: iz, radius: 0.8,
          speed: 3.2, spread: 1, life: 0.85, size: 8, color: 0x8ad0e8, gravity: 0.3, vy: 1,
        });
        fx.sparks.emit(16, {
          x: ix, y: Y_WATER + 0.6, z: iz, radius: 0.7,
          speed: 4.0, spread: 0.9, life: 0.65, size: 3.5, color: 0xd8f4ff, gravity: 0.85, vy: 1,
        });
      }
    }
    light.intensity = 1.4 * (1 - age / life);
    for (let i = 0; i < ICE_COUNT; i++) {
      const rec = recs[i];
      const erupted = uFront >= rec.along - 0.02;
      if (erupted && rec.erupt < 0) rec.erupt = age;
      const grow = erupted ? Math.min(1, (age - rec.erupt) / 0.18) : 0;
      const birth = erupted ? Math.max(0, 1 - (age - rec.erupt) / 0.35) : 0;
      births.array[i] = birth;
      const fade = age > life - 0.7 ? Math.max(0, (life - age) / 0.7) : 1;
      const s = rec.r * grow * fade;
      _dummy.position.set(
        origin.x + dir.x * rec.along * range + (-dir.z) * rec.lateral,
        Y_WATER,
        origin.z + dir.z * rec.along * range + dir.x * rec.lateral,
      );
      _dummy.rotation.set(rec.lean, rec.yaw, rec.lean * 0.35);
      _dummy.scale.set(s, rec.h * grow * fade, s);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    }
    births.needsUpdate = true;
    mesh.instanceMatrix.needsUpdate = true;
    if (age >= life) {
      dispose();
      return false;
    }
    return true;
  }
  function dispose() {
    root.remove(group);
    geo.dispose();
    mat.dispose();
    strip.geometry.dispose();
    stripMat.dispose();
    frostDisc.geometry.dispose();
    frostDisc.material.dispose();
    splash.dispose();
  }
  return { update, dispose };
}

function spawnThunder(root, origin, dir, range, fx, hooks = {}) {
  const group = new THREE.Group();
  root.add(group);
  const ox = origin.x;
  const oz = origin.z;
  const tx = origin.x + dir.x * range;
  const tz = origin.z + dir.z * range;
  const geo = createBoltRibbonGeometry(NODES, STRANDS);
  const glow = boltMaterial(true);
  const core = boltMaterial(false);
  const glowMesh = new THREE.Mesh(geo, glow);
  const coreMesh = new THREE.Mesh(geo, core);
  glowMesh.frustumCulled = false;
  coreMesh.frustumCulled = false;
  glowMesh.renderOrder = 11;
  coreMesh.renderOrder = 13;
  group.add(glowMesh, coreMesh);
  const burn = new THREE.Mesh(new THREE.CircleGeometry(1, 40), burnDiscMaterial(0x4aa8ff, 0xe8f4ff));
  burn.rotation.x = -Math.PI / 2;
  burn.position.set(tx, Y_WATER, tz);
  burn.scale.setScalar(4.2);
  burn.renderOrder = 9;
  burn.visible = false;
  group.add(burn);
  const splash = makeSplash(group, tx, tz, 0xa8e8ff, 5);
  const light = new THREE.PointLight(0x88d8ff, 0, 26);
  group.add(light);
  const hand = new THREE.Vector3(ox, Y_WATER + 0.85, oz);
  const impact = new THREE.Vector3(tx, Y_WATER, tz);
  _side.set(-dir.z, 0, dir.x);
  const seed = Math.random() * 100;
  let age = 0;
  let sparkAcc = 0;
  let impacted = false;
  const travel = 0.2;
  const hold = 0.42;
  const fadeT = 0.4;
  const life = travel + hold + fadeT;

  function sync(progress, fade) {
    for (const m of [glow, core]) {
      m.uniforms.uTime.value = age;
      m.uniforms.uOrigin.value.copy(hand);
      m.uniforms.uTarget.value.copy(impact);
      m.uniforms.uSide.value.copy(_side);
      m.uniforms.uSeed.value = seed;
      m.uniforms.uProgress.value = progress;
      m.uniforms.uFade.value = fade;
    }
  }

  function update(dt) {
    age += dt;
    const progress = Math.min(1, age / travel);
    const fading = age > travel + hold ? (age - travel - hold) / fadeT : 0;
    const vis = Math.max(0, 1 - fading);
    sync(progress, vis);
    light.position.lerpVectors(hand, impact, progress);
    light.intensity = (progress < 1 ? 5 : 8) * vis;

    sparkAcc += dt * 22;
    const sn = Math.floor(sparkAcc);
    sparkAcc -= sn;
    if (sn > 0 && vis > 0.05) {
      const px = hand.x + (impact.x - hand.x) * progress;
      const py = hand.y + (impact.y - hand.y) * progress;
      const pz = hand.z + (impact.z - hand.z) * progress;
      fx.sparks.emit(sn, {
        x: px, y: py, z: pz, radius: 0.28,
        speed: 2.6, spread: 0.95, life: 0.22, size: 3.5, color: 0xb8dcff, gravity: 0.15,
        vx: -dir.z, vy: 0.4, vz: dir.x,
      });
    }

    if (progress >= 1) {
      burn.visible = true;
      burn.material.uniforms.uTime.value = age;
      burn.material.uniforms.uFade.value = vis;
      splash.update(dt, age - travel);
      if (!impacted) {
        impacted = true;
        hooks.onImpact?.();
        fx.bursts.spawn(BurstMode.STORM, tx, Y_WATER + 0.65, tz, {
          radius: 0.35, endRadius: 3.1, life: 0.72, squash: 0.82, intensity: 1.2,
          fresnel: 1.4, displace: 0.35, opacity: 0.9,
          colorA: 0x4aa8ff, colorB: 0xc8e8ff, colorC: 0xffffff,
        });
        fx.decals.spawn(DecalType.SHOCKWAVE, tx, tz, {
          radius: 3.8, life: 0.65, width: 0.06, intensity: 1,
          colorA: 0xffffff, colorB: 0x88d0ff,
        });
        fx.decals.spawn(DecalType.ARC, tx, tz, {
          radius: 3.2, life: 1.8, width: 0.9, intensity: 1.15,
          colorA: 0x081018, colorB: 0x7ad0ff,
        });
        fx.decals.spawn(DecalType.SCORCH, tx, tz, {
          radius: 2.4, life: 2.2, intensity: 0.85,
          colorA: 0x101820, colorB: 0x6ab8ff,
        });
        fx.sparks.emit(16, {
          x: tx, y: Y_WATER + 0.55, z: tz, radius: 0.45,
          speed: 5.0, spread: 1, life: 0.35, size: 4, color: 0xc8e0ff, gravity: 0.2, vy: 1,
        });
        fx.sparks.emit(8, {
          x: tx, y: Y_WATER + 0.4, z: tz, radius: 0.55,
          speed: 1.8, spread: 0.9, life: 0.7, size: 8, color: 0x6ab8ff, gravity: 0.15, vy: 1,
        });
      }
    }
    if (age >= life) {
      dispose();
      return false;
    }
    return true;
  }
  function dispose() {
    root.remove(group);
    geo.dispose();
    glow.dispose();
    core.dispose();
    burn.geometry.dispose();
    burn.material.dispose();
    splash.dispose();
  }
  return { update, dispose };
}

function spawnMeteor(root, origin, dir, range, fx, hooks = {}) {
  const group = new THREE.Group();
  root.add(group);
  const blastR = Math.max(1.5, hooks.radius || 5.5);
  const target = { x: origin.x + dir.x * range, z: origin.z + dir.z * range };
  const rockGeo = createAsteroidGeometry({ seed: 4.2, detail: 2 });
  const mat = meteorMaterial();
  const rock = new THREE.Mesh(rockGeo, mat);
  group.add(rock);
  const heading = new THREE.Vector3(dir.x, -0.6, dir.z).normalize();
  const light = new THREE.PointLight(0xff6020, 0, 24);
  group.add(light);
  const ring = new THREE.Mesh(new THREE.CircleGeometry(1, 40), zoneMaterial());
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(target.x, Y_WATER, target.z);
  ring.scale.setScalar(blastR);
  ring.material.uniforms.uRadius.value = blastR;
  ring.visible = false;
  ring.renderOrder = 9;
  group.add(ring);
  const crater = new THREE.Mesh(new THREE.CircleGeometry(1, 40), burnDiscMaterial(0xff4a10, 0xffc060));
  crater.rotation.x = -Math.PI / 2;
  crater.position.set(target.x, Y_WATER, target.z);
  crater.scale.setScalar(blastR);
  crater.renderOrder = 8;
  crater.visible = false;
  group.add(crater);
  const splash = makeSplash(group, target.x, target.z, 0xffe0a0, 6);
  const trailMat = new THREE.SpriteMaterial({
    map: getGlowTexture(),
    color: 0xff6a18,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const trails = [];
  for (let i = 0; i < 4; i++) {
    const sm = trailMat.clone();
    sm.opacity = 0.4 * (1 - i * 0.16);
    const s = new THREE.Sprite(sm);
    s.scale.set(0.85 + i * 0.22, 0.85 + i * 0.22, 1);
    s.renderOrder = 12;
    group.add(s);
    trails.push(s);
  }
  let age = 0;
  const fly = 0.62;
  const boom = 1.05;
  const life = fly + boom;
  let impacted = false;
  let emberAcc = 0;
  let sparkAcc = 0;
  const peak = 10;

  function update(dt) {
    age += dt;
    const mu = mat.userData.uniforms;
    mu.uTime.value = age;
    mu.uHeading.value.copy(heading);
    if (age < fly) {
      const u = age / fly;
      const ease = u * u;
      rock.position.set(
        origin.x + (target.x - origin.x) * ease,
        Y_WATER + 1.4 + Math.sin(u * Math.PI) * peak,
        origin.z + (target.z - origin.z) * ease,
      );
      rock.rotation.x += dt * 5;
      rock.rotation.z += dt * 3.2;
      rock.scale.setScalar(1.35 + u * 0.4);
      mu.uCharge.value = u;
      light.position.copy(rock.position);
      light.intensity = 2 + u * 3;
      for (let i = 0; i < trails.length; i++) {
        const t = trails[i];
        t.visible = true;
        t.position.set(
          rock.position.x - heading.x * (0.7 + i * 0.85),
          rock.position.y - heading.y * (0.7 + i * 0.85),
          rock.position.z - heading.z * (0.7 + i * 0.85),
        );
        const sc = (0.75 + i * 0.28) * (0.7 + u);
        t.scale.set(sc, sc * 1.15, 1);
      }
      emberAcc += dt * 22;
      const en = Math.floor(emberAcc);
      emberAcc -= en;
      if (en > 0) {
        fx.sparks.emit(en, {
          x: rock.position.x, y: rock.position.y, z: rock.position.z, radius: 0.35,
          vx: -heading.x, vy: -heading.y + 0.25, vz: -heading.z,
          speed: 2.4, spread: 0.85, life: 0.45, size: 5, color: 0xff8a28, gravity: 0.4,
        });
      }
      sparkAcc += dt * 16;
      const sp = Math.floor(sparkAcc);
      sparkAcc -= sp;
      if (sp > 0) {
        fx.sparks.emit(sp, {
          x: rock.position.x, y: rock.position.y, z: rock.position.z, radius: 0.22,
          vx: -heading.x, vy: -heading.y, vz: -heading.z,
          speed: 4.2, spread: 0.95, life: 0.28, size: 3.5, color: 0xffe090, gravity: 0.2,
        });
      }
    } else {
      if (!impacted) {
        impacted = true;
        hooks.onImpact?.();
        rock.visible = false;
        ring.visible = true;
        crater.visible = true;
        for (const t of trails) t.visible = false;
        fx.bursts.spawn(BurstMode.FIRE, target.x, Y_WATER + 0.75, target.z, {
          radius: 0.45, endRadius: blastR * 0.65, life: 0.85, squash: 0.78, intensity: 0.95,
          fresnel: 1.1, displace: 0.5, opacity: 0.8,
          colorA: 0xffe6a0, colorB: 0xff6a18, colorC: 0x661408,
        });
        fx.decals.spawn(DecalType.SHOCKWAVE, target.x, target.z, {
          radius: blastR * 1.18, life: 0.8, width: 0.07, intensity: 0.85,
          colorA: 0xffe0a0, colorB: 0xff6a18,
        });
        fx.decals.spawn(DecalType.SCORCH, target.x, target.z, {
          radius: blastR * 0.95, life: 2.6, intensity: 0.95,
          colorA: 0x1a100c, colorB: 0xff6a22,
        });
        fx.sparks.emit(18, {
          x: target.x, y: Y_WATER + 0.55, z: target.z, radius: 0.7,
          speed: 5.5, spread: 1, life: 0.7, size: 6, color: 0xff8a28, gravity: 0.55, vy: 1,
        });
        fx.sparks.emit(12, {
          x: target.x, y: Y_WATER + 0.6, z: target.z, radius: 0.55,
          speed: 6.5, spread: 1, life: 0.35, size: 3.5, color: 0xffe090, gravity: 0.25, vy: 1,
        });
        fx.sparks.emit(8, {
          x: target.x, y: Y_WATER + 0.45, z: target.z, radius: 0.9,
          speed: 1.8, spread: 0.85, life: 0.9, size: 10, color: 0xff7030, gravity: 0.2, vy: 1,
        });
      }
      const b = (age - fly) / boom;
      ring.scale.setScalar(blastR * (1 + b * 0.35));
      ring.material.uniforms.uTime.value = age;
      ring.material.uniforms.uRadius.value = blastR;
      crater.material.uniforms.uTime.value = age;
      crater.material.uniforms.uFade.value = 1 - b;
      splash.update(dt, age - fly);
      light.position.set(target.x, Y_WATER + 1.2, target.z);
      light.intensity = 6 * (1 - b);
    }
    if (age >= life) {
      dispose();
      return false;
    }
    return true;
  }
  function dispose() {
    root.remove(group);
    rockGeo.dispose();
    mat.dispose();
    ring.geometry.dispose();
    ring.material.dispose();
    crater.geometry.dispose();
    crater.material.dispose();
    splash.dispose();
    for (const t of trails) t.material.dispose();
    trailMat.dispose();
  }
  return { update, dispose };
}

function createAimRig(scene) {
  const arrowGeo = new THREE.PlaneGeometry(1, 1, 1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5);
  const arrowMat = aimMaterial();
  const arrow = new THREE.Mesh(arrowGeo, arrowMat);
  arrow.frustumCulled = false;
  arrow.renderOrder = 6;
  arrow.visible = false;
  scene.add(arrow);

  const zoneGeo = new THREE.CircleGeometry(1, 48);
  const zoneMat = zoneMaterial();
  const zone = new THREE.Mesh(zoneGeo, zoneMat);
  zone.rotation.x = -Math.PI / 2;
  zone.frustumCulled = false;
  zone.renderOrder = 6;
  zone.visible = false;
  scene.add(zone);

  let reveal = 0;
  const zoneColor = {
    meteor: 0xff6a18,
    singularity: 0xaa44ff,
    worldroot: 0x44cc33,
    snare: 0x44ddee,
    glacier: 0x88d8ff,
  };

  function setAim(origin, target, kind, maxRange, radius, dt) {
    const dx = target.x - origin.x;
    const dz = target.z - origin.z;
    const dist = Math.hypot(dx, dz);
    const yaw = Math.atan2(dx, dz);
    const tooClose = dist < 2.2;
    const tooFar = dist > maxRange + 0.05;
    const valid = !tooClose && !tooFar;
    reveal = Math.min(1, reveal + dt * 4);
    const zoneR = radius > 0 ? radius : 0;

    if (zoneR > 0) {
      arrow.visible = false;
      zone.visible = true;
      const clamped = Math.min(dist, maxRange);
      const ux = dist > 0.001 ? dx / dist : 0;
      const uz = dist > 0.001 ? dz / dist : 1;
      zone.position.set(origin.x + ux * clamped, Y_WATER, origin.z + uz * clamped);
      zone.scale.setScalar(zoneR);
      zoneMat.uniforms.uTime.value = performance.now() * 0.001;
      zoneMat.uniforms.uRadius.value = zoneR;
      zoneMat.uniforms.uInvalid.value = valid ? 0 : 1;
      zoneMat.uniforms.uFill.value = valid ? 0.18 : 0.42;
      zoneMat.uniforms.uColor.value.set(valid ? (zoneColor[kind] || 0xff6a18) : 0xff2210);
      return { valid, dist: clamped, yaw, dir: { x: ux, z: uz } };
    }

    zone.visible = false;
    arrow.visible = true;
    const length = Math.min(maxRange, Math.max(2.5, dist));
    const back = 1.05;
    const forward = length + 1.6;
    const halfW = 2.2;
    const quadLength = back + forward;
    const quadWidth = halfW * 2;
    arrowMat.uniforms.uTime.value = performance.now() * 0.001;
    arrowMat.uniforms.uQuadLength.value = quadLength;
    arrowMat.uniforms.uQuadWidth.value = quadWidth;
    arrowMat.uniforms.uQuadBack.value = back;
    arrowMat.uniforms.uLength.value = length;
    arrowMat.uniforms.uReveal.value = reveal;
    arrowMat.uniforms.uInvalid.value = valid ? 0 : 1;
    arrowMat.uniforms.uFill.value = valid ? 0.3 : 0.58;
    if (!valid) {
      arrowMat.uniforms.uColorCore.value.setRGB(1.0, 0.22, 0.12);
      arrowMat.uniforms.uColorEdge.value.setRGB(1.0, 0.08, 0.04);
    } else if (kind === 'thunder') {
      arrowMat.uniforms.uColorCore.value.setRGB(0.95, 0.98, 1);
      arrowMat.uniforms.uColorEdge.value.setRGB(0.22, 0.55, 1);
    } else {
      arrowMat.uniforms.uColorCore.value.setRGB(0.92, 0.98, 1);
      arrowMat.uniforms.uColorEdge.value.setRGB(0.35, 0.82, 1);
    }
    arrow.position.set(origin.x - Math.sin(yaw) * back, Y_WATER, origin.z - Math.cos(yaw) * back);
    arrow.rotation.set(0, yaw, 0);
    arrow.scale.set(quadWidth, 1, quadLength);
    const ux = Math.sin(yaw);
    const uz = Math.cos(yaw);
    return { valid, dist: length, yaw, dir: { x: ux, z: uz } };
  }

  function hide() {
    arrow.visible = false;
    zone.visible = false;
    reveal = 0;
  }

  return { setAim, hide, arrow, zone };
}

export function createSkillVfx({ scene }) {
  const root = new THREE.Group();
  root.name = 'skillVfxRoot';
  scene.add(root);
  const active = [];
  const aim = createAimRig(root);
  const decals = createDecalSystem(root, { height: Y_WATER });
  const sparks = createGpuSparks(root);
  const bursts = createBurstSystem(root);
  const fx = { decals, sparks, bursts };

  function cast(kind, origin, dir, range, hooks = {}) {
    while (active.length >= MAX_CASTS) active.shift().dispose?.();
    const o = { x: origin.x, z: origin.z };
    const d = { x: dir.x, z: dir.z };
    const len = Math.hypot(d.x, d.z) || 1;
    d.x /= len;
    d.z /= len;
    const dist = Math.max(4, range);
    const target = { x: o.x + d.x * dist, z: o.z + d.z * dist };
    const orig3 = { x: o.x, y: 2.0, z: o.z };
    const card = SKILL_CARDS.find((c) => c.id === kind);
    const cardRadius = card?.radius || 5;
    const hook = { ...hooks, radius: cardRadius };
    let inst;
    if (kind === 'thunder') inst = spawnThunder(root, o, d, dist, fx, hook);
    else if (kind === 'meteor') inst = spawnMeteor(root, o, d, dist, fx, hook);
    else if (kind === 'void') inst = spawnVoid(root, o, d, dist, fx, hook);
    else if (kind === 'phoenix') inst = spawnPhoenix(root, o, d, dist, fx, hook);
    else if (kind === 'singularity') inst = spawnSingularity(root, o, d, dist, fx, hook);
    else if (kind === 'worldroot') inst = spawnWorldroot(root, target, { fx, origin: orig3, radius: cardRadius, onImpact: hook.onImpact });
    else if (kind === 'beam') inst = spawnBeam(root, target, { fx, origin: orig3, onImpact: hook.onImpact });
    else if (kind === 'snare') inst = spawnSnare(root, target, { fx, radius: cardRadius, onImpact: hook.onImpact });
    else if (kind === 'glacier') inst = spawnGlacier(root, target, { fx, radius: cardRadius, onImpact: hook.onImpact });
    else inst = spawnIce(root, o, d, dist, fx, hook);
    active.push(inst);
    return inst;
  }

  function update(dt) {
    for (let i = active.length - 1; i >= 0; i--) {
      if (!active[i].update(dt)) active.splice(i, 1);
    }
    decals.update(dt);
    sparks.update(dt);
    bursts.update(dt);
  }

  function clear() {
    for (const a of active) a.dispose?.();
    active.length = 0;
    aim.hide();
    decals.clear();
    sparks.clear();
    bursts.clear();
  }

  return { cast, update, clear, setAim: aim.setAim, hideAim: aim.hide, root };
}

export const SKILL_CARDS = [
  { id: 'ice',         name: '霜矛',     cd: 1.2, range: 24, radius: 0 },
  { id: 'thunder',     name: '雷矛',     cd: 1.5, range: 26, radius: 0 },
  { id: 'meteor',      name: '陨石',     cd: 3.5, range: 16, radius: 5.5 },
  { id: 'void',        name: '虚空裂缝', cd: 2.8, range: 22, radius: 0 },
  { id: 'phoenix',     name: '炎凤',     cd: 3.2, range: 26, radius: 0 },
  { id: 'singularity', name: '引力奇点', cd: 5.0, range: 20, radius: 5 },
  { id: 'worldroot',   name: '根茎绽放', cd: 4.2, range: 20, radius: 4 },
  { id: 'beam',        name: '光束炮',   cd: 4.5, range: 28, radius: 0 },
  { id: 'snare',       name: '电磁陷阱', cd: 3.8, range: 18, radius: 4 },
  { id: 'glacier',     name: '冰封王冠', cd: 5.5, range: 18, radius: 5 },
];
