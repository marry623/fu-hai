/**
 * Voltaic Snare — bolt-ribbon cage (columns + rim + tendrils).
 */
import * as THREE from '../../vendor/three/three.module.js';
import { createBoltRibbonGeometry } from './geometry.js?v=29y';
import { DecalType } from './groundDecals.js?v=29u';
import { BurstMode } from './burstSphere.js?v=29u';

const Y = 1.15;
const TAU = Math.PI * 2;
const COL_N = 10;
const RIM_N = 8;
const TEND_N = 12;
const TOTAL = COL_N + RIM_N + TEND_N;

function bounceBump(t) {
  const base = 1 - Math.pow(1 - Math.min(t, 1), 3);
  return base + Math.sin(t * Math.PI) * 0.14;
}

function makeBoltMat(isCore) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: {
      uTime: { value: 0 }, uFade: { value: 1 },
      uCx: { value: 0 }, uCz: { value: 0 }, uY: { value: Y },
      uRadius: { value: 4 }, uRise: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aStrand;
      uniform float uTime, uCx, uCz, uY, uRadius, uRise;
      varying vec2 vUV; varying float vInst;
      void main(){
        float t = position.x;
        float side = position.y;
        float idx = aStrand;
        vUV = vec2(t, side * 0.5 + 0.5);
        vInst = idx;
        float colN = 10.0;
        float rimN = 8.0;
        vec3 p;
        if(idx < colN){
          float a = idx / colN * 6.28318530718;
          float h = uRadius * 1.35 * uRise;
          p = vec3(uCx + cos(a) * uRadius, uY + t * h, uCz + sin(a) * uRadius);
          float kink = sin(t * 18.0 + uTime * 22.0 + idx) * 0.12;
          p.x += cos(a + 1.57) * kink;
          p.z += sin(a + 1.57) * kink;
          vec3 across = vec3(-sin(a), 0.0, cos(a));
          p += across * side * mix(0.16, 0.045, ${isCore ? '1.0' : '0.0'});
        } else if(idx < colN + rimN){
          float a0 = (idx - colN) / rimN * 6.28318530718;
          float a = a0 + t * (6.28318530718 / rimN) * 1.15;
          float hop = sin(t * 3.14159) * 0.55 * uRise;
          p = vec3(uCx + cos(a) * uRadius, uY + hop + 0.08, uCz + sin(a) * uRadius);
          vec3 across = normalize(vec3(cos(a), 0.4, sin(a)));
          p += across * side * 0.07;
        } else {
          float k = idx - colN - rimN;
          float a = k / 12.0 * 6.28318530718 + sin(uTime * 3.0 + k) * 0.2;
          float r = uRadius * (0.15 + t * 0.85) * uRise;
          float veer = sin(t * 9.0 + k * 2.1) * 0.35;
          p = vec3(uCx + cos(a + veer) * r, uY + (0.15 + t * 0.55) * uRadius * uRise, uCz + sin(a + veer) * r);
          p += vec3(-sin(a), 0.0, cos(a)) * side * 0.06;
        }
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uFade;
      varying vec2 vUV; varying float vInst;
      float h11(float p){p=fract(p*0.1031);p*=p+33.33;p*=p+p;return fract(p);}
      void main(){
        float noise = h11(floor(vUV.x * 32.0 + vInst * 7.0) + floor(uTime * ${isCore ? '24.0' : '14.0'}) * 13.0);
        float bolt = 1.0 - abs(vUV.y - 0.5) * 2.0;
        bolt = pow(max(bolt, 0.0), ${isCore ? '2.8' : '1.2'}) * (noise > 0.28 ? 1.0 : 0.15);
        float endFade = sin(clamp(vUV.x, 0.0, 1.0) * 3.14159);
        vec3 col = ${isCore
          ? 'vec3(0.92, 0.96, 1.0)'
          : 'mix(vec3(0.32, 0.48, 1.0), vec3(0.72, 0.42, 1.0), h11(vInst * 0.37))'};
        gl_FragColor = vec4(col * ${isCore ? '2.4' : '1.55'}, bolt * endFade * uFade * ${isCore ? '0.95' : '0.55'});
      }
    `,
  });
}

function makeFieldMat() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: { uTime: { value: 0 }, uFade: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUV;
      void main(){ vUV = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uFade;
      varying vec2 vUV;
      float h11(float p){p=fract(p*0.1031);p*=p+33.33;p*=p+p;return fract(p);}
      void main(){
        vec2 d = vUV - 0.5; float r = length(d) * 2.0;
        if(r > 1.0) discard;
        float rim = exp(-abs(r - 0.9) * 11.0);
        float ang = atan(d.y, d.x);
        float bolt = 0.0;
        for(int i=0;i<8;i++){
          float da = mod(ang - float(i)*0.7854 + uTime*0.7, 6.28318) - 3.14159;
          bolt += exp(-da*da*5.5) * (1.0 - r * 0.75);
        }
        float flk = h11(floor(r * 14.0) * 17.0 + floor(ang * 10.0) * 131.0 + floor(uTime * 16.0) * 1013.0);
        bolt *= step(0.22, flk);
        vec3 col = mix(vec3(0.32, 0.48, 1.0), vec3(0.7, 0.42, 1.0), rim);
        float a = clamp(rim*0.8 + bolt*0.45, 0.0, 1.0) * uFade;
        gl_FragColor = vec4(col * 1.7, a * 0.68);
      }
    `,
  });
}

export function spawnSnare(scene, target, opts = {}) {
  const fx = opts.fx;
  const cx = target.x, cz = target.z;
  const RADIUS = opts.radius ?? 4.0;

  const landT = 0.12, riseT = 0.58, holdT = 1.45, fadeT = 0.55;
  const life = landT + riseT + holdT + fadeT;

  const geo = createBoltRibbonGeometry(48, TOTAL);
  const glowMat = makeBoltMat(false);
  const coreMat = makeBoltMat(true);
  const glow = new THREE.Mesh(geo, glowMat);
  const core = new THREE.Mesh(geo, coreMat);
  glow.frustumCulled = false;
  core.frustumCulled = false;
  scene.add(glow, core);

  const fieldSz = RADIUS * 2.6;
  const fieldGeo = new THREE.PlaneGeometry(fieldSz, fieldSz);
  const fieldMat = makeFieldMat();
  const field = new THREE.Mesh(fieldGeo, fieldMat);
  field.rotation.x = -Math.PI / 2;
  field.position.set(cx, Y + 0.05, cz);
  scene.add(field);

  const light = new THREE.PointLight(0x7788ff, 0, RADIUS * 3.2);
  light.position.set(cx, Y + RADIUS * 0.7, cz);
  scene.add(light);

  let age = 0, landed = false, sparkAcc = 0;

  function syncMats(rise, fade) {
    for (const m of [glowMat, coreMat]) {
      m.uniforms.uTime.value = age;
      m.uniforms.uFade.value = fade;
      m.uniforms.uCx.value = cx;
      m.uniforms.uCz.value = cz;
      m.uniforms.uY.value = Y;
      m.uniforms.uRadius.value = RADIUS;
      m.uniforms.uRise.value = rise;
    }
    fieldMat.uniforms.uTime.value = age;
    fieldMat.uniforms.uFade.value = fade;
    field.scale.setScalar(rise);
  }

  function update(dt) {
    age += dt;
    if (!landed) {
      landed = true;
      opts.onImpact?.();
      if (fx) {
        fx.bursts.spawn(BurstMode.STORM, cx, Y + 0.45, cz, {
          radius: 0.25, endRadius: RADIUS * 1.05, life: 0.58, squash: 0.3,
          intensity: 1.15, opacity: 0.82,
          colorA: 0xaabbff, colorB: 0x5555ff, colorC: 0x000033,
        });
        fx.decals.spawn(DecalType.SHOCKWAVE, cx, cz, {
          radius: RADIUS * 1.0, life: 0.62, width: 0.05, intensity: 0.9,
          colorA: 0xbbccff, colorB: 0x4444cc,
        });
        for (let i = 0; i < 4; i++) {
          const a = i * (Math.PI / 2);
          fx.decals.spawn(DecalType.ARC, cx + Math.cos(a) * RADIUS * 0.85, cz + Math.sin(a) * RADIUS * 0.85, {
            radius: RADIUS * 0.5, life: 1.9, width: 0.8, intensity: 0.92,
            colorA: 0x0a0020, colorB: 0x5544dd,
          });
        }
        fx.decals.spawn(DecalType.SCORCH, cx, cz, {
          radius: RADIUS * 0.55, life: 3.1, width: 0.5, intensity: 0.58,
          colorA: 0x05000f, colorB: 0x110028,
        });
      }
    }

    const aT = age - landT;
    const gFade = aT > riseT + holdT ? Math.max(0, 1 - (aT - riseT - holdT) / fadeT) : 1;
    const rise = aT < riseT ? bounceBump(aT / riseT) : 1.0;
    syncMats(rise, gFade);
    light.intensity = rise * gFade * 8;

    sparkAcc += dt * 18 * rise * gFade;
    const sn = Math.floor(sparkAcc); sparkAcc -= sn;
    if (sn > 0 && fx) {
      for (let k = 0; k < sn; k++) {
        const a = Math.random() * TAU, r2 = RADIUS * (0.45 + Math.random() * 0.55);
        fx.sparks.emit(1, {
          x: cx + Math.cos(a) * r2, y: Y + 0.25 + Math.random() * RADIUS * 0.7, z: cz + Math.sin(a) * r2,
          vx: -Math.cos(a) * 0.45, vy: 2.0, vz: -Math.sin(a) * 0.45,
          speed: 2.4, spread: 0.5, life: 0.48, size: 4, color: 0x99aaff, gravity: 0.15,
        });
      }
    }

    if (age >= life) { dispose(); return false; }
    return true;
  }

  function dispose() {
    scene.remove(glow, core, field, light);
    geo.dispose(); glowMat.dispose(); coreMat.dispose();
    fieldGeo.dispose(); fieldMat.dispose();
  }

  return { update, dispose };
}
