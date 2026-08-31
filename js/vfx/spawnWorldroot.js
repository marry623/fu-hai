/**
 * Worldroot Bloom — seed arc, trunk/roots/branches, leaf crown, pollen.
 */
import * as THREE from '../../vendor/three/three.module.js';
import { DecalType } from './groundDecals.js?v=29u';
import { BurstMode } from './burstSphere.js?v=29u';

const Y = 1.15;
const TAU = Math.PI * 2;
const ROOT_N = 18;
const B_N = 36;
const L_N = 110;

function makeSapMat() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: { uTime: { value: 0 }, uFade: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUV;
      void main() {
        vUV = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uFade;
      varying vec2 vUV;
      void main(){
        float pulse = exp(-24.0 * abs(fract(vUV.y * 2.0 - uTime * 0.35) - 0.5));
        vec3 bark = vec3(0.16, 0.08, 0.03);
        vec3 sap = mix(vec3(0.08, 0.78, 0.16), vec3(0.86, 0.96, 0.12), pulse);
        vec3 col = mix(bark, sap, 0.28 + pulse * 0.6);
        float a = clamp(min(vUV.y, 1.0 - vUV.y) * 5.5, 0.0, 1.0) * uFade;
        gl_FragColor = vec4(col * (1.15 + pulse * 0.9), a * 0.88);
      }
    `,
  });
}

function makeGroundMat() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: { uTime: { value: 0 }, uFade: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUV;
      void main() { vUV = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uFade;
      varying vec2 vUV;
      void main(){
        vec2 d = vUV - 0.5; float r = length(d) * 2.0;
        if(r > 1.0) discard;
        float ring = exp(-abs(r - 0.55) * 9.0);
        float ang = atan(d.y, d.x), sp = 0.0;
        for(int i=0;i<8;i++){
          float da = mod(ang - float(i)*0.7854 + uTime*0.4, 6.28318) - 3.14159;
          sp += exp(-da*da*4.2) * (1.0 - r);
        }
        vec3 col = mix(vec3(0.08,0.88,0.18), vec3(0.92,1.0,0.12), ring);
        float a = clamp(ring*0.8 + sp*0.32, 0.0, 1.0) * uFade;
        gl_FragColor = vec4(col, a * 0.6);
      }
    `,
  });
}

export function spawnWorldroot(scene, target, opts = {}) {
  const fx = opts.fx;
  const cx = target.x, cz = target.z;
  const orig = opts.origin;
  const ox = orig ? orig.x : cx - 4;
  const oy = orig ? orig.y : 2.0;
  const oz = orig ? orig.z : cz - 2;
  const RADIUS = opts.radius ?? 4.2;

  const flyT = 0.48, growT = 1.25, holdT = 1.7, fadeT = 0.6;
  const life = flyT + holdT + fadeT;

  const seedGeo = new THREE.SphereGeometry(0.24, 8, 6);
  const seedMat = new THREE.MeshBasicMaterial({
    color: 0xaaff22, transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const seed = new THREE.Mesh(seedGeo, seedMat);
  seed.position.set(ox, oy, oz);
  scene.add(seed);

  const brGeo = new THREE.CylinderGeometry(0.032, 0.08, 1, 7);
  brGeo.translate(0, 0.5, 0);
  const brMat = makeSapMat();
  const roots = new THREE.InstancedMesh(brGeo, brMat, ROOT_N);
  const branches = new THREE.InstancedMesh(brGeo, brMat, B_N);
  roots.frustumCulled = false;
  branches.frustumCulled = false;
  roots.visible = false;
  branches.visible = false;
  scene.add(roots, branches);

  const trunkGeo = new THREE.CylinderGeometry(0.07, 0.16, 1, 8);
  trunkGeo.translate(0, 0.5, 0);
  const trunk = new THREE.Mesh(trunkGeo, brMat);
  trunk.visible = false;
  scene.add(trunk);

  const lfGeo = new THREE.OctahedronGeometry(1.0, 0);
  const lfMat = new THREE.MeshBasicMaterial({
    color: 0x77ff33, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const leaves = new THREE.InstancedMesh(lfGeo, lfMat, L_N);
  leaves.frustumCulled = false;
  leaves.visible = false;
  scene.add(leaves);

  const glGeo = new THREE.PlaneGeometry(RADIUS * 2.5, RADIUS * 2.5);
  const glMat = makeGroundMat();
  const glow = new THREE.Mesh(glGeo, glMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(cx, Y + 0.05, cz);
  glow.visible = false;
  scene.add(glow);

  const light = new THREE.PointLight(0x55ff33, 0, RADIUS * 3);
  light.position.set(cx, Y + 2.2, cz);
  scene.add(light);

  const _up = new THREE.Vector3(0, 1, 0);
  const _q = new THREE.Quaternion();
  const _dm = new THREE.Object3D();

  const rootData = Array.from({ length: ROOT_N }, (_, i) => {
    const a = (i / ROOT_N) * TAU + Math.random() * 0.2;
    const tilt = 1.15 + Math.random() * 0.25;
    const h = RADIUS * (0.55 + Math.random() * 0.5);
    const dir = new THREE.Vector3(Math.cos(a) * Math.sin(tilt), Math.cos(tilt) * 0.15, Math.sin(a) * Math.sin(tilt)).normalize();
    return { h, del: Math.random() * 0.35, dir };
  });

  const bData = Array.from({ length: B_N }, () => {
    const a = Math.random() * TAU;
    const tilt = 0.22 + Math.random() * 0.5;
    const h = 1.15 + Math.random() * 2.6;
    const dir = new THREE.Vector3(
      Math.cos(a) * Math.sin(tilt),
      Math.cos(tilt),
      Math.sin(a) * Math.sin(tilt),
    ).normalize();
    return { h, del: Math.random() * 0.5, dir };
  });

  const lData = Array.from({ length: L_N }, () => {
    const bd = bData[Math.floor(Math.random() * B_N)];
    return { bd, s: 0.1 + Math.random() * 0.22, hf: 0.55 + Math.random() * 0.48, sp: Math.random() * TAU };
  });

  let age = 0, impacted = false, bloomFired = false, polAcc = 0;

  function update(dt) {
    age += dt;
    if (age < flyT) {
      const tt = age / flyT, e = tt * tt * (3 - 2 * tt);
      seed.position.set(
        ox + (cx - ox) * e,
        oy * (1 - e) + Y + Math.sin(tt * Math.PI) * 3.6,
        oz + (cz - oz) * e,
      );
      seed.rotation.y += dt * 7;
      return true;
    }

    if (!impacted) {
      impacted = true;
      opts.onImpact?.();
      seed.visible = false;
      roots.visible = branches.visible = trunk.visible = glow.visible = true;
      if (fx) {
        fx.bursts.spawn(BurstMode.AIR, cx, Y + 0.5, cz, {
          radius: 0.3, endRadius: RADIUS * 0.85, life: 0.62, squash: 0.35,
          intensity: 0.92, opacity: 0.75,
          colorA: 0x88ff44, colorB: 0x22bb00, colorC: 0x004400,
        });
        fx.decals.spawn(DecalType.SHOCKWAVE, cx, cz, {
          radius: RADIUS * 0.95, life: 0.68, width: 0.05, intensity: 0.82,
          colorA: 0xaaffaa, colorB: 0x228800,
        });
        fx.decals.spawn(DecalType.SCORCH, cx, cz, {
          radius: RADIUS * 0.6, life: 3.3, width: 0.4, intensity: 0.55,
          colorA: 0x0d2600, colorB: 0x1a4400,
        });
        fx.sparks.emit(22, {
          x: cx, y: Y + 0.4, z: cz, radius: 0.45,
          speed: 3.6, spread: 1, life: 0.58, size: 6, color: 0x88ff22, gravity: 0.45, vy: 1.6,
        });
      }
    }

    const aT = age - flyT;
    const gF = Math.min(1.0, aT / growT);
    const fd = aT > holdT ? Math.max(0, 1 - (aT - holdT) / fadeT) : 1;

    if (gF >= 1 && !bloomFired) {
      bloomFired = true;
      if (fx) {
        fx.bursts.spawn(BurstMode.AIR, cx, Y + 2.4, cz, {
          radius: RADIUS * 0.32, endRadius: RADIUS * 1.55, life: 0.85, squash: 0.52,
          intensity: 1.05, opacity: 0.78,
          colorA: 0xccff88, colorB: 0x55dd00, colorC: 0x003300,
        });
        fx.sparks.emit(30, {
          x: cx, y: Y + 2.1, z: cz, radius: RADIUS * 0.55,
          speed: 5.2, spread: 1.2, life: 0.74, size: 5, color: 0xaaffaa, gravity: 0.22, vy: 1.05,
        });
      }
    }

    brMat.uniforms.uTime.value = age;
    brMat.uniforms.uFade.value = fd;
    glMat.uniforms.uTime.value = age;
    glMat.uniforms.uFade.value = fd;
    const leafFrac = gF > 0.52 ? Math.min(1, (gF - 0.52) / 0.48) : 0;
    lfMat.opacity = leafFrac * fd * 0.78;
    if (leafFrac > 0 && !leaves.visible) leaves.visible = true;
    light.intensity = gF * fd * 6.2;

    const trunkH = (1.6 + RADIUS * 0.35) * Math.min(1, gF * 1.35) * fd;
    trunk.position.set(cx, Y, cz);
    trunk.scale.set(1.15, trunkH, 1.15);

    for (let i = 0; i < ROOT_N; i++) {
      const rd = rootData[i];
      const loc = Math.max(0, (gF - rd.del * 0.4) / Math.max(1e-4, 1 - rd.del * 0.4));
      const grow = Math.min(1, loc * 1.5);
      _q.setFromUnitVectors(_up, rd.dir);
      _dm.position.set(cx, Y, cz);
      _dm.quaternion.copy(_q);
      _dm.scale.set(1.1, rd.h * grow, 1.1);
      _dm.updateMatrix();
      roots.setMatrixAt(i, _dm.matrix);
    }
    roots.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < B_N; i++) {
      const bd = bData[i];
      const loc = Math.max(0, (gF - bd.del * 0.5) / Math.max(1e-4, 1 - bd.del * 0.5));
      const grow = Math.min(1, loc * 1.4) * gF;
      _q.setFromUnitVectors(_up, bd.dir);
      _dm.position.set(cx, Y + trunkH * 0.45, cz);
      _dm.quaternion.copy(_q);
      _dm.scale.set(1, bd.h * grow, 1);
      _dm.updateMatrix();
      branches.setMatrixAt(i, _dm.matrix);
    }
    branches.instanceMatrix.needsUpdate = true;

    if (leafFrac > 0) {
      for (let i = 0; i < L_N; i++) {
        const ld = lData[i], bd = ld.bd;
        const loc = Math.max(0, (gF - bd.del * 0.5) / Math.max(1e-4, 1 - bd.del * 0.5));
        const grow = Math.min(1, loc * 1.4) * gF;
        _dm.position.set(
          cx + bd.dir.x * bd.h * grow * ld.hf,
          Y + trunkH * 0.45 + bd.dir.y * bd.h * grow * ld.hf,
          cz + bd.dir.z * bd.h * grow * ld.hf,
        );
        _dm.rotation.set(age * 0.4 + ld.sp, age * 0.25 + i * 0.63, 0);
        _dm.scale.setScalar(ld.s * leafFrac * fd);
        _dm.updateMatrix();
        leaves.setMatrixAt(i, _dm.matrix);
      }
      leaves.instanceMatrix.needsUpdate = true;
    }

    polAcc += dt * 18 * leafFrac * fd;
    const pn = Math.floor(polAcc); polAcc -= pn;
    if (pn > 0 && fx) {
      fx.sparks.emit(pn, {
        x: cx, y: Y + trunkH * 0.85, z: cz, radius: RADIUS * 0.4,
        speed: 0.8, spread: 1, life: 1.1, size: 3, color: 0xddff88, gravity: -0.08, vy: 0.35,
      });
    }

    if (age >= life) { dispose(); return false; }
    return true;
  }

  function dispose() {
    scene.remove(seed, roots, branches, trunk, leaves, glow, light);
    seedGeo.dispose(); seedMat.dispose();
    brGeo.dispose(); brMat.dispose();
    trunkGeo.dispose();
    lfGeo.dispose(); lfMat.dispose();
    glGeo.dispose(); glMat.dispose();
  }

  return { update, dispose };
}
