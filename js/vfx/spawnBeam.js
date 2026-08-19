/**
 * Nova Beam — layered volume tube + shock discs (ThreeJSVFX-Demo).
 */
import * as THREE from 'three';
import { createBeamTubeGeometry } from './geometry.js?v=29y';
import { DecalType } from './groundDecals.js?v=29u';
import { BurstMode } from './burstSphere.js?v=29u';

const Y = 1.15;
const RING_N = 10;
const TAU = Math.PI * 2;

function makeOrbMat() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: { uTime: { value: 0 }, uCharge: { value: 0 }, uFade: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vNormal; varying vec3 vViewDir;
      void main(){
        vec4 wPos = modelMatrix * vec4(position, 1.0);
        vNormal  = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - wPos.xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uCharge; uniform float uFade;
      varying vec3 vNormal; varying vec3 vViewDir;
      void main(){
        vec3 N = normalize(vNormal), V = normalize(vViewDir);
        float fr = pow(1.0 - max(0.0, dot(N, V)), 1.8);
        float ring = sin(uTime * 6.0 - fr * 12.0) * 0.5 + 0.5;
        vec3 col = mix(vec3(0.25, 0.5, 1.0), vec3(0.85, 0.95, 1.0), fr);
        float a = (fr * 0.7 + ring * 0.35 * uCharge) * uFade;
        gl_FragColor = vec4(col * (1.8 + uCharge), a);
      }
    `,
  });
}

function makeTubeMat(rimWeight, brightness, r, g, b, radius) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: {
      uTime: { value: 0 }, uFade: { value: 0 }, uProgress: { value: 0 },
      uOrigin: { value: new THREE.Vector3() },
      uEnd: { value: new THREE.Vector3() },
      uRadius: { value: radius },
    },
    vertexShader: /* glsl */ `
      uniform vec3 uOrigin; uniform vec3 uEnd; uniform float uRadius;
      varying vec2 vUV; varying vec3 vNormal; varying vec3 vViewDir;
      void main(){
        float t = position.x;
        float a = position.y * 6.28318530718;
        vec3 axis = uEnd - uOrigin;
        float len = max(length(axis), 0.001);
        vec3 dir = axis / len;
        vec3 up = abs(dir.y) > 0.9 ? vec3(1.0,0.0,0.0) : vec3(0.0,1.0,0.0);
        vec3 right = normalize(cross(dir, up));
        vec3 binorm = normalize(cross(dir, right));
        vec3 radial = right * cos(a) + binorm * sin(a);
        vec3 wPos = uOrigin + dir * (t * len) + radial * uRadius;
        vUV = vec2(a, t);
        vNormal = radial;
        vViewDir = normalize(cameraPosition - wPos);
        gl_Position = projectionMatrix * viewMatrix * vec4(wPos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uFade; uniform float uProgress;
      varying vec2 vUV; varying vec3 vNormal; varying vec3 vViewDir;
      void main(){
        if(vUV.y > uProgress + 0.02) discard;
        vec3 N = normalize(vNormal), V = normalize(vViewDir);
        float rim = 1.0 - abs(dot(N, V));
        float endFade = sin(clamp(vUV.y, 0.0, uProgress) / max(uProgress, 0.01) * 3.14159);
        float flicker = sin(vUV.y * 28.0 - uTime * 16.0) * 0.18 + 0.82;
        float bright = mix(1.0 - rim, rim * rim, ${rimWeight.toFixed(2)});
        vec3 col = vec3(${r.toFixed(2)}, ${g.toFixed(2)}, ${b.toFixed(2)});
        gl_FragColor = vec4(col * ${brightness.toFixed(2)}, bright * endFade * flicker * uFade);
      }
    `,
  });
}

function makeRingMat() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: { uTime: { value: 0 }, uFade: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUV;
      void main(){
        vUV = uv;
        gl_Position = projectionMatrix * viewMatrix * instanceMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uFade;
      varying vec2 vUV;
      void main(){
        vec2 d = vUV - 0.5; float r = length(d) * 2.0;
        if(r > 1.0) discard;
        float ring = exp(-abs(r - 0.78) * 9.0);
        float pulse = sin(atan(d.y, d.x) * 5.0 - uTime * 8.0) * 0.2 + 0.8;
        gl_FragColor = vec4(vec3(0.55, 0.8, 1.0) * 1.7, ring * pulse * uFade * 0.9);
      }
    `,
  });
}

export function spawnBeam(scene, target, opts = {}) {
  const fx = opts.fx;
  const cx = target.x, cz = target.z;
  const orig = opts.origin;
  const ox = orig ? orig.x : cx - 7;
  const oy = orig ? orig.y : 2.2;
  const oz = orig ? orig.z : cz;

  const bStart = new THREE.Vector3(ox, oy, oz);
  const bEnd = new THREE.Vector3(cx, Y, cz);
  const beamLen = Math.max(4, bStart.distanceTo(bEnd));
  const beamDir = new THREE.Vector3().subVectors(bEnd, bStart).normalize();

  const chargeT = 0.55, fireT = 0.28, burnT = 1.25, fadeT = 0.5;
  const life = chargeT + fireT + burnT + fadeT;

  const orbGeo = new THREE.IcosahedronGeometry(0.48, 2);
  const orbMat = makeOrbMat();
  const orb = new THREE.Mesh(orbGeo, orbMat);
  orb.position.copy(bStart);
  scene.add(orb);

  const tubeGeo = createBeamTubeGeometry(72, 24);
  const haloMat = makeTubeMat(0.05, 1.35, 0.18, 0.48, 1.0, 0.55);
  const shellMat = makeTubeMat(0.75, 1.85, 0.42, 0.72, 1.0, 0.22);
  const coreMat = makeTubeMat(1.0, 2.4, 0.85, 0.95, 1.0, 0.07);
  const halo = new THREE.Mesh(tubeGeo, haloMat);
  const shell = new THREE.Mesh(tubeGeo, shellMat);
  const core = new THREE.Mesh(tubeGeo, coreMat);
  for (const m of [halo, shell, core]) {
    m.frustumCulled = false;
    scene.add(m);
  }

  const ringGeo = new THREE.RingGeometry(0.28, 0.52, 28);
  const ringMat = makeRingMat();
  const rings = new THREE.InstancedMesh(ringGeo, ringMat, RING_N);
  rings.frustumCulled = false;
  scene.add(rings);

  const _zAxis = new THREE.Vector3(0, 0, 1);
  const ringQuat = new THREE.Quaternion().setFromUnitVectors(_zAxis, beamDir);
  const _dm = new THREE.Object3D();

  const light = new THREE.PointLight(0x66bbff, 0, beamLen * 0.7);
  light.position.copy(bEnd).lerp(bStart, 0.15);
  scene.add(light);

    let beamTicks = 0;

    function update(dt) {
    age += dt;
    const phase = age < chargeT ? 'charge'
      : age < chargeT + fireT ? 'fire'
        : age < life - fadeT ? 'burn' : 'fade';
    const gFade = phase === 'fade' ? Math.max(0, 1 - (age - (life - fadeT)) / fadeT) : 1;
    const charge = Math.min(1, age / chargeT);
    orbMat.uniforms.uTime.value = age;
    orbMat.uniforms.uCharge.value = charge;
    orbMat.uniforms.uFade.value = phase === 'burn' || phase === 'fade' ? gFade * 0.28 : gFade;
    orb.scale.setScalar(charge * 1.15 + Math.sin(age * 8) * 0.06 * charge);

    const progress = phase === 'charge' ? 0
      : phase === 'fire' ? Math.min(1, (age - chargeT) / fireT) : 1;
    const beamFade = phase === 'fade' ? gFade : (phase === 'charge' ? 0 : 1);

    for (const mat of [haloMat, shellMat, coreMat]) {
      mat.uniforms.uTime.value = age;
      mat.uniforms.uFade.value = beamFade;
      mat.uniforms.uProgress.value = progress;
      mat.uniforms.uOrigin.value.copy(bStart);
      mat.uniforms.uEnd.value.copy(bEnd);
    }

    ringMat.uniforms.uTime.value = age;
    ringMat.uniforms.uFade.value = beamFade;
    for (let i = 0; i < RING_N; i++) {
      const tt = ((i / RING_N) + age * 0.85) % 1.0;
      _dm.position.lerpVectors(bStart, bEnd, Math.min(tt, progress));
      _dm.quaternion.copy(ringQuat);
      _dm.scale.setScalar(0.85 + (i % 3) * 0.18);
      _dm.updateMatrix();
      rings.setMatrixAt(i, _dm.matrix);
    }
    rings.instanceMatrix.needsUpdate = true;
    light.intensity = beamFade * 9;

    if (phase === 'fire' && beamTicks < 1) {
      beamTicks = 1;
      opts.onImpact?.();
      if (fx) {
        fx.bursts.spawn(BurstMode.AIR, cx, Y + 0.55, cz, {
          radius: 0.35, endRadius: 4.2, life: 0.65, squash: 0.32,
          intensity: 1.2, opacity: 0.8,
          colorA: 0xcce8ff, colorB: 0x4488ff, colorC: 0x001144,
        });
        fx.decals.spawn(DecalType.SCORCH, cx, cz, {
          radius: 3.2, life: 3.6, width: 0.35, intensity: 0.75,
          colorA: 0x001122, colorB: 0x2244aa,
        });
        fx.decals.spawn(DecalType.SHOCKWAVE, cx, cz, {
          radius: 4.4, life: 0.6, width: 0.07, intensity: 0.95,
          colorA: 0xaad4ff, colorB: 0x2266cc,
        });
      }
    }

    if (phase === 'burn' && beamTicks === 1 && age >= chargeT + fireT + 0.18) {
      beamTicks = 2;
      opts.onImpact?.();
    }

    if ((phase === 'fire' || phase === 'burn') && fx && Math.random() < dt * 22) {
      const tt = Math.random() * progress;
      const p = bStart.clone().lerp(bEnd, tt);
      fx.sparks.emit(2, {
        x: p.x, y: p.y, z: p.z, radius: 0.25,
        speed: 2.2, spread: 0.85, life: 0.5, size: 5, color: 0x99d8ff, gravity: -0.04, vy: 0.6,
      });
    }

    if (age >= life) { dispose(); return false; }
    return true;
  }

  function dispose() {
    scene.remove(orb, halo, shell, core, rings, light);
    orbGeo.dispose(); orbMat.dispose();
    tubeGeo.dispose();
    haloMat.dispose(); shellMat.dispose(); coreMat.dispose();
    ringGeo.dispose(); ringMat.dispose();
  }

  return { update, dispose };
}
