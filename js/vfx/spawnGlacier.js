/**
 * Glacial Crown — open crystal ring + frost veil + falling snow.
 */
import * as THREE from '../../vendor/three/three.module.js';
import { createCrystalGeometry, hash11 } from './geometry.js?v=29y';
import { DecalType } from './groundDecals.js?v=29u';
import { BurstMode } from './burstSphere.js?v=29u';

const Y = 1.15;
const TAU = Math.PI * 2;
const RING_N = 28;
const SKIRT_N = 36;

function makeIceMat() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: true, side: THREE.DoubleSide, toneMapped: false,
    uniforms: { uTime: { value: 0 }, uFade: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute mat4 instanceMatrix;
      varying vec3 vNormal; varying vec3 vViewDir; varying float vY;
      void main(){
        vec4 wPos = instanceMatrix * vec4(position, 1.0);
        vNormal = normalize(mat3(instanceMatrix) * normal);
        vViewDir = normalize(cameraPosition - wPos.xyz);
        vY = position.y;
        gl_Position = projectionMatrix * viewMatrix * wPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uFade;
      varying vec3 vNormal; varying vec3 vViewDir; varying float vY;
      float h11(float p){p=fract(p*0.1031);p*=p+33.33;p*=p+p;return fract(p);}
      void main(){
        vec3 N = normalize(vNormal), V = normalize(vViewDir);
        float fr = pow(1.0 - max(0.0, dot(N, V)), 2.1);
        float facet = h11(floor(N.x*5.0)*0.1 + floor(N.y*5.0)*3.1 + floor(N.z*5.0)*11.7);
        float shimmer = sin(uTime * 3.6 + facet * 6.28) * 0.14 + 0.86;
        vec3 col = mix(vec3(0.22, 0.52, 0.82), vec3(0.86, 0.96, 1.0), fr + vY * 0.4);
        float alpha = (0.52 + fr * 0.48) * shimmer * uFade;
        gl_FragColor = vec4(col * shimmer, alpha);
      }
    `,
  });
}

function makeFrostFieldMat() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: { uTime: { value: 0 }, uFade: { value: 1 }, uFrost: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUV;
      void main(){ vUV = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uFade; uniform float uFrost;
      varying vec2 vUV;
      float h11(float p){p=fract(p*0.1031);p*=p+33.33;p*=p+p;return fract(p);}
      void main(){
        vec2 d = vUV - 0.5; float r = length(d) * 2.0;
        if(r > 1.0) discard;
        float frostMask = smoothstep(uFrost * 1.05, uFrost * 0.86, r);
        float ang = atan(d.y, d.x);
        float cr = 0.0;
        for(int i=0;i<10;i++){
          float da = mod(ang - float(i)*0.6283 + uTime*0.08, 6.28318) - 3.14159;
          cr += exp(-abs(da)*4.2) * (1.0 - r*0.65);
        }
        float noise = h11(floor(r*12.0)*17.0 + floor(ang*14.0)*131.0);
        cr *= step(0.32, noise);
        vec3 col = mix(vec3(0.32, 0.62, 0.92), vec3(0.9, 0.98, 1.0), cr);
        float a = clamp(cr*0.7 + frostMask*0.3, 0.0, 1.0) * uFade;
        gl_FragColor = vec4(col, a * 0.62);
      }
    `,
  });
}

function makeFrostVeilMat() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.NormalBlending, toneMapped: false,
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
        float billow = h11(floor(vUV.x * 22.0 + uTime * 0.55) * 31.0 + floor(vUV.y * 18.0) * 7.0);
        float wisps = sin(vUV.x * 14.0 - uTime * 0.5) * 0.5 + 0.5;
        float endFade = sin(vUV.y * 3.14159);
        vec3 col = mix(vec3(0.62, 0.86, 1.0), vec3(0.94, 0.98, 1.0), wisps);
        float a = (billow * 0.4 + 0.16) * endFade * uFade;
        gl_FragColor = vec4(col, a * 0.32);
      }
    `,
  });
}

export function spawnGlacier(scene, target, opts = {}) {
  const fx = opts.fx;
  const cx = target.x, cz = target.z;
  const RADIUS = opts.radius ?? 5.0;

  const waveT = 0.7, holdT = 1.65, thawT = 0.7;
  const life = waveT + holdT + thawT;

  const ringGeo = createCrystalGeometry({ seed: 3.1, sides: 6, taper: 0.11, roughness: 0.32, bend: 0.18 });
  const skirtGeo = createCrystalGeometry({ seed: 8.7, sides: 5, taper: 0.2, roughness: 0.5, bend: 0.3 });
  const ringMat = makeIceMat();
  const skirtMat = makeIceMat();
  const ringMesh = new THREE.InstancedMesh(ringGeo, ringMat, RING_N);
  const skirtMesh = new THREE.InstancedMesh(skirtGeo, skirtMat, SKIRT_N);
  ringMesh.frustumCulled = false;
  skirtMesh.frustumCulled = false;
  scene.add(ringMesh, skirtMesh);

  const fieldGeo = new THREE.PlaneGeometry(RADIUS * 2.5, RADIUS * 2.5);
  const fieldMat = makeFrostFieldMat();
  const field = new THREE.Mesh(fieldGeo, fieldMat);
  field.rotation.x = -Math.PI / 2;
  field.position.set(cx, Y + 0.04, cz);
  scene.add(field);

  const veilGeo = new THREE.CylinderGeometry(RADIUS * 0.92, RADIUS * 1.12, RADIUS * 1.05, 48, 6, true);
  const veilMat = makeFrostVeilMat();
  const veil = new THREE.Mesh(veilGeo, veilMat);
  veil.position.set(cx, Y + RADIUS * 0.52, cz);
  veil.visible = false;
  scene.add(veil);

  const light = new THREE.PointLight(0x88ddff, 0, RADIUS * 3.2);
  light.position.set(cx, Y + RADIUS * 0.7, cz);
  scene.add(light);

  const _dm = new THREE.Object3D();
  const ringData = Array.from({ length: RING_N }, (_, i) => {
    const a = (i / RING_N) * TAU + (hash11(i * 2.1) - 0.5) * 0.18;
    const r = RADIUS * (0.78 + hash11(i * 4.4) * 0.18);
    const h = RADIUS * (0.7 + hash11(i * 7.2) * 0.55);
    return { a, r, h, tilt: 0.12 + hash11(i * 3.3) * 0.22, delay: i / RING_N };
  });
  const skirtData = Array.from({ length: SKIRT_N }, (_, i) => {
    const a = hash11(i * 1.7) * TAU;
    const r = RADIUS * (0.55 + hash11(i * 5.5) * 0.38);
    const h = RADIUS * (0.18 + hash11(i * 9.1) * 0.28);
    return { a, r, h, tilt: hash11(i * 2.8) * 0.45, delay: hash11(i * 6.6) };
  });

  const _upV = new THREE.Vector3(0, 1, 0);
  const _quat = new THREE.Quaternion();
  let age = 0, burstFired = false, snowAcc = 0;

  function updateSpikes(mesh, data, growFrac, shadMat, thawFrac) {
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const waveAt = d.delay * 0.55 + d.r / RADIUS * 0.45;
      const local = Math.max(0, (growFrac - waveAt) / Math.max(1e-4, 1 - waveAt));
      const scaleY = Math.min(1, local * 1.55) * (1 - thawFrac * thawFrac);
      const tipDir = new THREE.Vector3(
        Math.cos(d.a) * Math.sin(d.tilt),
        Math.cos(d.tilt),
        Math.sin(d.a) * Math.sin(d.tilt),
      ).normalize();
      _quat.setFromUnitVectors(_upV, tipDir);
      _dm.position.set(cx + Math.cos(d.a) * d.r, Y, cz + Math.sin(d.a) * d.r);
      _dm.quaternion.copy(_quat);
      _dm.scale.set(d.h * 0.38, d.h * scaleY, d.h * 0.38);
      _dm.updateMatrix();
      mesh.setMatrixAt(i, _dm.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    shadMat.uniforms.uTime.value = age;
    shadMat.uniforms.uFade.value = Math.max(0, 1 - thawFrac);
  }

  function update(dt) {
    age += dt;
    const growFrac = Math.min(1, age / waveT);
    const thawFrac = age > waveT + holdT ? Math.min(1, (age - waveT - holdT) / thawT) : 0;
    const gFade = 1 - thawFrac;

    if (!burstFired) {
      burstFired = true;
      opts.onImpact?.();
      if (fx) {
        fx.bursts.spawn(BurstMode.FROST, cx, Y + 0.45, cz, {
          radius: 0.3, endRadius: RADIUS * 1.05, life: 0.75, squash: 0.38,
          intensity: 1.1, opacity: 0.85,
          colorA: 0xc8e8ff, colorB: 0x4499cc, colorC: 0x001122,
        });
        fx.decals.spawn(DecalType.FROST, cx, cz, {
          radius: RADIUS * 1.15, life: life + 0.6, width: 0.6, intensity: 0.85,
          colorA: 0x99bbdd, colorB: 0x224466,
        });
        fx.decals.spawn(DecalType.SHOCKWAVE, cx, cz, {
          radius: RADIUS * 1.05, life: 0.62, width: 0.05, intensity: 0.9,
          colorA: 0xcceeFF, colorB: 0x3399cc,
        });
        fx.sparks.emit(24, {
          x: cx, y: Y + 0.5, z: cz, radius: RADIUS * 0.35,
          speed: 3.8, spread: 1, life: 0.65, size: 5, color: 0xaaddff, gravity: 0.35, vy: 1.3,
        });
      }
    }

    fieldMat.uniforms.uTime.value = age;
    fieldMat.uniforms.uFade.value = gFade;
    fieldMat.uniforms.uFrost.value = growFrac;
    if (growFrac > 0.38 && !veil.visible) veil.visible = true;
    veilMat.uniforms.uTime.value = age;
    veilMat.uniforms.uFade.value = Math.min(1, (growFrac - 0.38) / 0.4) * gFade;
    light.intensity = growFrac * gFade * 7;

    updateSpikes(ringMesh, ringData, growFrac, ringMat, thawFrac);
    updateSpikes(skirtMesh, skirtData, growFrac, skirtMat, thawFrac);

    snowAcc += dt * 16 * growFrac * gFade;
    const sn = Math.floor(snowAcc); snowAcc -= sn;
    if (sn > 0 && fx) {
      for (let k = 0; k < sn; k++) {
        const a = Math.random() * TAU, r2 = Math.random() * RADIUS * 0.92;
        fx.sparks.emit(1, {
          x: cx + Math.cos(a) * r2, y: Y + RADIUS * 0.85 + Math.random() * RADIUS * 0.45,
          z: cz + Math.sin(a) * r2,
          vx: (Math.random() - 0.5) * 0.35, vy: -0.9, vz: (Math.random() - 0.5) * 0.35,
          speed: 0.45, spread: 0.2, life: 1.3, size: 3, color: 0xcceeFF, gravity: -0.22,
        });
      }
    }

    if (age >= life) { dispose(); return false; }
    return true;
  }

  function dispose() {
    scene.remove(ringMesh, skirtMesh, field, veil, light);
    ringGeo.dispose(); ringMat.dispose();
    skirtGeo.dispose(); skirtMat.dispose();
    fieldGeo.dispose(); fieldMat.dispose();
    veilGeo.dispose(); veilMat.dispose();
  }

  return { update, dispose };
}
