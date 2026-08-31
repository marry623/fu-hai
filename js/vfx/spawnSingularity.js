/**
 * Gravity Singularity VFX — adapted from ThreeJSVFX-Demo SingularityAbility.
 * Projectile arcs to target → dark event horizon + two accretion discs + orbiting
 * debris → gravitational lensing glow → collapse explosion.
 */
import * as THREE from '../../vendor/three/three.module.js';
import { hash11 } from './geometry.js?v=29y';
import { DecalType } from './groundDecals.js?v=29u';
import { BurstMode } from './burstSphere.js?v=29u';

const Y = 1.15;
const TAU = Math.PI * 2;

const NOISE = /* glsl */ `
float h11(float p){p=fract(p*0.1031);p*=p+33.33;p*=p+p;return fract(p);}
vec3 m289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 m289v4(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 prm(vec4 x){return m289v4(((x*34.0)+1.0)*x);}
vec4 tis(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float sn3(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=m289(i);
  vec4 p=prm(prm(prm(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 nm=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=nm.x;p1*=nm.y;p2*=nm.z;p3*=nm.w;
  vec4 m2=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m2=m2*m2;
  return 42.0*dot(m2*m2,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm3(vec3 p){float v=0.0;float a=0.5;for(int i=0;i<3;i++){v+=a*sn3(p);p*=2.02;a*=0.5;}return v;}
float ridged(vec3 p){float v=0.0;float a=0.5;for(int i=0;i<4;i++){v+=a*(1.0-abs(sn3(p)));p*=2.06;a*=0.5;}return v;}
`;

function darkCoreMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: true, depthTest: true, side: THREE.FrontSide, toneMapped: false,
    uniforms: {
      uTime:    { value: 0 },
      uFade:    { value: 1 },
      uCollapse:{ value: 0 },
    },
    vertexShader: `
      varying vec3 vNormal; varying vec3 vViewDir;
      void main(){
        vec4 wPos = modelMatrix * vec4(position, 1.0);
        vNormal   = normalize(mat3(modelMatrix) * normal);
        vViewDir  = cameraPosition - wPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * wPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uFade, uCollapse;
      varying vec3 vNormal; varying vec3 vViewDir;
      ${NOISE}
      void main(){
        float ndv = clamp(dot(normalize(vViewDir), normalize(vNormal)), 0.0, 1.0);
        float rim = pow(1.0 - ndv, 3.5);
        float lensGlow = rim * (0.45 + 0.35 * uCollapse) * uFade;
        vec3 col = vec3(0.18, 0.0, 0.30) * rim * 1.4 + vec3(0.5, 0.0, 0.9) * uCollapse * rim;
        float alpha = lensGlow + 0.92 * (1.0 - rim);
        gl_FragColor = vec4(col * lensGlow, clamp(alpha, 0.0, 1.0));
      }
    `,
  });
}

function discMaterial(tiltAngle, speed) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    uniforms: {
      uTime:  { value: 0 },
      uFade:  { value: 1 },
      uSpeed: { value: speed },
      uTilt:  { value: tiltAngle },
      uColorA:{ value: new THREE.Color(0xf6d4ff) },
      uColorB:{ value: new THREE.Color(0x6610c8) },
    },
    vertexShader: `
      uniform float uTilt;
      varying vec2 vUv;
      void main(){
        vUv = uv;
        vec3 p = position;
        float c = cos(uTilt), s = sin(uTilt);
        p = vec3(p.x, p.y*c - p.z*s, p.y*s + p.z*c);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uFade, uSpeed;
      uniform vec3 uColorA, uColorB;
      varying vec2 vUv;
      ${NOISE}
      void main(){
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float angle = atan(p.y, p.x) + uTime * uSpeed;
        float bands = fbm3(vec3(r * 9.0, angle * 2.0, uTime * 0.4)) * 0.5 + 0.5;
        float rim = smoothstep(0.12, 0.45, r) * smoothstep(1.0, 0.72, r);
        float disk = (bands * 0.6 + 0.4) * rim;
        float alpha = disk * uFade;
        if(alpha < 0.005) discard;
        vec3 col = mix(uColorB, uColorA, bands);
        gl_FragColor = vec4(col * 2.2, alpha);
      }
    `,
  });
}

function groundRingMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    uniforms: { uTime: { value: 0 }, uFade: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uFade;
      varying vec2 vUv;
      ${NOISE}
      void main(){
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float ring = smoothstep(0.14, 0.0, abs(r - 0.78));
        float bands = fbm3(vec3(vUv * 4.0, uTime * 0.6)) * 0.5 + 0.5;
        float alpha = (ring * 0.9 + bands * ring * 0.4) * uFade;
        if(alpha < 0.006) discard;
        gl_FragColor = vec4(mix(vec3(0.4,0.0,0.8), vec3(0.8,0.2,1.0), ring), alpha);
      }
    `,
  });
}

const DEBRIS_N = 48;
const _dm = new THREE.Object3D();

export function spawnSingularity(root, origin, dir, range, fx, hooks = {}) {
  const group = new THREE.Group();
  root.add(group);
  const cx = origin.x + dir.x * range, cz = origin.z + dir.z * range;
  const RADIUS = 7.0;

  // Traveling projectile
  const projGeo = new THREE.SphereGeometry(0.42, 12, 8);
  const projMat = new THREE.MeshBasicMaterial({
    color: 0x8833ff, transparent: true, opacity: 0.9, depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const proj = new THREE.Mesh(projGeo, projMat);
  proj.renderOrder = 13;
  group.add(proj);

  // Dark core sphere (event horizon)
  const coreGeo = new THREE.SphereGeometry(1, 32, 20);
  const coreMat = darkCoreMaterial();
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.set(cx, Y + 1.6, cz);
  core.renderOrder = 10;
  core.visible = false;
  group.add(core);

  // Accretion disc A (tilted +0.22 rad, counter-clockwise)
  const discGeoA = new THREE.RingGeometry(0.15, 1, 96, 2);
  const discMatA = discMaterial(0.22, 1.4);
  const discA = new THREE.Mesh(discGeoA, discMatA);
  discA.position.set(cx, Y + 1.6, cz);
  discA.scale.setScalar(RADIUS * 0.58);
  discA.renderOrder = 11;
  discA.visible = false;
  group.add(discA);

  // Accretion disc B (tilted -0.22 rad, clockwise)
  const discGeoB = new THREE.RingGeometry(0.22, 1, 96, 2);
  const discMatB = discMaterial(-0.22, -1.1);
  discMatB.uniforms.uColorA.value.set(0xd4c0ff);
  discMatB.uniforms.uColorB.value.set(0x2200a0);
  const discB = new THREE.Mesh(discGeoB, discMatB);
  discB.position.set(cx, Y + 1.6, cz);
  discB.scale.setScalar(RADIUS * 0.5);
  discB.renderOrder = 11;
  discB.visible = false;
  group.add(discB);

  // Ground ring
  const gRingGeo = new THREE.RingGeometry(0.08, 1, 96, 8);
  const gRingMat = groundRingMaterial();
  const gRing = new THREE.Mesh(gRingGeo, gRingMat);
  gRing.rotation.x = -Math.PI / 2;
  gRing.position.set(cx, Y, cz);
  gRing.scale.setScalar(RADIUS * 1.1);
  gRing.renderOrder = 9;
  gRing.visible = false;
  group.add(gRing);

  // Orbiting debris
  const debrisGeo = new THREE.OctahedronGeometry(0.22, 0);
  const debrisMat = new THREE.MeshBasicMaterial({
    color: 0x9933ff, transparent: true, opacity: 0.85,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const debris = new THREE.InstancedMesh(debrisGeo, debrisMat, DEBRIS_N);
  debris.frustumCulled = false;
  debris.renderOrder = 12;
  debris.visible = false;
  group.add(debris);

  const dData = Array.from({ length: DEBRIS_N }, (_, i) => ({
    angle:  (i / DEBRIS_N) * TAU + hash11(i * 2.9) * 0.3,
    r:      RADIUS * (0.55 + hash11(i * 5.1) * 0.45),
    h:      Y + 0.4 + hash11(i * 7.3) * 2.8,
    speed:  (0.5 + hash11(i * 3.7) * 1.0) * (i % 2 ? 1 : -1),
    tilt:   (hash11(i * 9.1) - 0.5) * 0.6,
  }));

  const light = new THREE.PointLight(0x7722ff, 0, 30);
  light.position.set(cx, Y + 2, cz);
  group.add(light);

  let age = 0, swirAcc = 0;
  let impacted = false, collapsed = false;
  const flyT     = 0.5;
  const holdT    = 2.4;
  const collapseT= 0.35;
  const life     = flyT + holdT + collapseT + 0.3;

  function update(dt) {
    age += dt;

    // Traveling phase
    if (age < flyT) {
      const u = age / flyT;
      proj.position.set(
        origin.x + (cx - origin.x) * u,
        Y + 1.6 + Math.sin(u * Math.PI) * 5,
        origin.z + (cz - origin.z) * u,
      );
      proj.rotation.y += dt * 6;
      light.position.copy(proj.position);
      light.intensity = u * 5;
      return true;
    }

    if (!impacted) {
      impacted = true;
      hooks.onImpact?.();
      proj.visible = false;
      core.visible = true;
      discA.visible = discB.visible = true;
      gRing.visible = debris.visible = true;
      fx.decals.spawn(DecalType.SHOCKWAVE, cx, cz, {
        radius: RADIUS * 0.8, life: 0.7, width: 0.06, intensity: 0.85,
        colorA: 0xddaaff, colorB: 0x6600cc,
      });
      fx.sparks.emit(16, {
        x: cx, y: Y + 0.5, z: cz, radius: 0.5,
        speed: 4.5, spread: 1, life: 0.6, size: 5, color: 0xaa44ff, gravity: -0.1, vy: 1,
      });
    }

    const holdAge = age - flyT;
    const gFade = holdAge > holdT ? Math.max(0, 1 - (holdAge - holdT) / collapseT) : 1;
    const collapseAmt = holdAge > holdT ? Math.min(1, (holdAge - holdT) / collapseT) : 0;

    // Collapse
    if (collapseAmt > 0 && !collapsed) {
      collapsed = true;
      fx.bursts.spawn(BurstMode.STORM, cx, Y + 1, cz, {
        radius: 0.4, endRadius: RADIUS * 1.2, life: 0.72, squash: 0.5,
        intensity: 1.3, fresnel: 1.5, opacity: 0.9,
        colorA: 0xddaaff, colorB: 0x7700cc, colorC: 0x050010,
      });
      fx.decals.spawn(DecalType.SHOCKWAVE, cx, cz, {
        radius: RADIUS * 1.3, life: 0.85, width: 0.07, intensity: 1.0,
        colorA: 0xeeddff, colorB: 0x8800ff,
      });
    }

    // Scale toward collapse
    const coreScale = (1 + collapseAmt * 0.2) * gFade;
    core.scale.setScalar(coreScale * RADIUS * 0.18);
    coreMat.uniforms.uTime.value = age;
    coreMat.uniforms.uFade.value = gFade;
    coreMat.uniforms.uCollapse.value = collapseAmt;

    for (const [m, sc] of [[discMatA, RADIUS * 0.58], [discMatB, RADIUS * 0.5]]) {
      m.uniforms.uTime.value = age;
      m.uniforms.uFade.value = gFade;
    }
    discA.scale.setScalar(RADIUS * 0.58 * gFade);
    discB.scale.setScalar(RADIUS * 0.5 * gFade);

    gRingMat.uniforms.uTime.value = age;
    gRingMat.uniforms.uFade.value = gFade;

    // Orbit debris (pulled inward on collapse)
    for (let i = 0; i < DEBRIS_N; i++) {
      const d = dData[i];
      d.angle += d.speed * dt;
      const pullR = d.r * (1 - collapseAmt * 0.9);
      _dm.position.set(
        cx + Math.cos(d.angle) * pullR,
        d.h + collapseAmt * (Y + 1.6 - d.h),
        cz + Math.sin(d.angle) * pullR,
      );
      _dm.rotation.set(d.tilt, age * d.speed, 0);
      _dm.scale.setScalar(gFade * (0.8 + collapseAmt * 0.4));
      _dm.updateMatrix();
      debris.setMatrixAt(i, _dm.matrix);
    }
    debris.instanceMatrix.needsUpdate = true;
    debrisMat.opacity = 0.85 * gFade;

    // Swirling in-fall particles
    swirAcc += dt * 10 * (1 + holdAge * 0.3);
    const sn = Math.floor(swirAcc); swirAcc -= sn;
    if (sn > 0 && gFade > 0.2) {
      const a = Math.random() * TAU;
      const r = RADIUS * (0.4 + Math.random() * 0.55);
      fx.sparks.emit(sn, {
        x: cx + Math.cos(a) * r, y: Y + 0.5 + Math.random() * 2.0, z: cz + Math.sin(a) * r,
        vx: -Math.cos(a) * 0.6, vy: 0.4, vz: -Math.sin(a) * 0.6,
        speed: 1.8, spread: 0.4, life: 0.6, size: 4, color: 0x8833ff, gravity: -0.08,
      });
    }

    light.intensity = gFade * 8 * (1 + collapseAmt);

    if (age >= life) { dispose(); return false; }
    return true;
  }

  function dispose() {
    root.remove(group);
    projGeo.dispose(); projMat.dispose();
    coreGeo.dispose(); coreMat.dispose();
    discGeoA.dispose(); discMatA.dispose();
    discGeoB.dispose(); discMatB.dispose();
    gRingGeo.dispose(); gRingMat.dispose();
    debrisGeo.dispose(); debrisMat.dispose();
  }
  return { update, dispose };
}