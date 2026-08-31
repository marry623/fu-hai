/**
 * Void Rift VFX — adapted from ThreeJSVFX-Demo VoidAbility / Rift Sever.
 * Tall dark seam with cyan-violet glowing edges, ground fault, spinning blade,
 * orbiting shards, debris sucked inward.
 */
import * as THREE from '../../vendor/three/three.module.js';
import { hash11 } from './geometry.js?v=29y';
import { DecalType } from './groundDecals.js?v=29u';
import { BurstMode } from './burstSphere.js?v=29u';

const Y = 1.15;

const NOISE = /* glsl */ `
float hash11v(float p){p=fract(p*0.1031);p*=p+33.33;p*=p+p;return fract(p);}
vec3 mod289v(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289v4(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 perm(vec4 x){return mod289v4(((x*34.0)+1.0)*x);}
vec4 tiSq(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289v(i);
  vec4 p=perm(perm(perm(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=tiSq(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm3(vec3 p){float v=0.0;float a=0.5;for(int i=0;i<3;i++){v+=a*snoise(p);p*=2.02;a*=0.5;}return v;}
`;

function voidSeamMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    uniforms: {
      uTime:  { value: 0 },
      uOpen:  { value: 0 },
      uFade:  { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uOpen, uFade;
      varying vec2 vUv;
      ${NOISE}
      void main(){
        float cx = abs(vUv.x - 0.5) * 2.0;
        float noise = fbm3(vec3(vUv * vec2(2.8, 5.5), uTime * 0.65)) * 0.5 + 0.5;
        float edgeW = 0.10 + 0.16 * uOpen + noise * 0.07;
        float inner = smoothstep(edgeW + 0.06, edgeW - 0.09, cx);
        float edgeMask = smoothstep(0.97, 0.68, cx) - inner;
        float vOpen = smoothstep(0.0, 0.25, uOpen) * smoothstep(1.0, 0.72, abs(vUv.y - 0.5) * 2.0);
        float pulse = 0.72 + 0.28 * sin(uTime * 7.0 + vUv.y * 9.0 + noise * 4.0);
        vec3 edge = vec3(0.0, 0.88, 1.0) * edgeMask * 2.8 * pulse;
        vec3 core = vec3(0.42, 0.06, 0.72) * inner * 1.6;
        float a = (edgeMask * 1.5 + inner * 0.85) * uFade * vOpen;
        if(a < 0.004) discard;
        gl_FragColor = vec4(edge + core, clamp(a, 0.0, 1.0));
      }
    `,
  });
}

function voidGroundMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    uniforms: { uTime: { value: 0 }, uFade: { value: 1 }, uProgress: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uFade, uProgress;
      varying vec2 vUv;
      ${NOISE}
      void main(){
        if(vUv.y > uProgress) discard;
        float cx = abs(vUv.x - 0.5) * 2.0;
        float n = fbm3(vec3(vUv * vec2(1.8, 7.0), uTime * 0.45)) * 0.5 + 0.5;
        float crack = 1.0 - smoothstep(0.0, 0.32 + n * 0.18, cx);
        float alpha = pow(crack, 1.8) * 0.72 * uFade;
        if(alpha < 0.008) discard;
        vec3 col = mix(vec3(0.30, 0.04, 0.52), vec3(0.0, 0.82, 0.98), crack * crack);
        gl_FragColor = vec4(col * 1.9, alpha);
      }
    `,
  });
}

const SHARD_N = 24;
const _dm = new THREE.Object3D();

export function spawnVoid(root, origin, dir, range, fx, hooks = {}) {
  const group = new THREE.Group();
  root.add(group);
  const ix = origin.x + dir.x * range;
  const iz = origin.z + dir.z * range;
  const yaw = Math.atan2(dir.x, dir.z);

  // Vertical seam at impact
  const seamH = 7.4;
  const seamGeo = new THREE.PlaneGeometry(1, 1, 32, 16);
  const seamMat = voidSeamMaterial();
  const seam = new THREE.Mesh(seamGeo, seamMat);
  seam.position.set(ix, Y + seamH * 0.5, iz);
  seam.rotation.y = yaw;
  seam.scale.set(5.0, seamH, 1);
  seam.renderOrder = 12;
  seam.frustumCulled = false;
  seam.visible = false;
  group.add(seam);

  // Ground fault strip along cast path
  const faultGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5);
  const faultMat = voidGroundMaterial();
  const fault = new THREE.Mesh(faultGeo, faultMat);
  fault.position.set(origin.x, Y, origin.z);
  fault.rotation.y = yaw;
  fault.scale.set(3.2, 1, range);
  fault.renderOrder = 8;
  group.add(fault);

  // Spinning blade at impact
  const bladeGeo = new THREE.OctahedronGeometry(1.2, 0);
  const bladeMat = new THREE.MeshBasicMaterial({
    color: 0x00d8f8, transparent: true, opacity: 0.85,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const blade = new THREE.Mesh(bladeGeo, bladeMat);
  blade.position.set(ix, Y + 1.9, iz);
  blade.renderOrder = 13;
  blade.visible = false;
  group.add(blade);

  // Orbiting debris shards
  const shardGeo = new THREE.TetrahedronGeometry(0.22, 0);
  const shardMat = new THREE.MeshBasicMaterial({
    color: 0x7711cc, transparent: true, opacity: 0.88,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const shards = new THREE.InstancedMesh(shardGeo, shardMat, SHARD_N);
  shards.frustumCulled = false;
  shards.renderOrder = 11;
  shards.visible = false;
  group.add(shards);

  const sData = Array.from({ length: SHARD_N }, (_, i) => ({
    angle: (i / SHARD_N) * Math.PI * 2 + hash11(i * 3.7) * 0.5,
    orbitR: 1.3 + hash11(i * 5.2) * 2.0,
    orbitH: (hash11(i * 7.4) - 0.28) * 3.2,
    speed: (0.55 + hash11(i * 3.1) * 0.9) * (hash11(i * 11.3) > 0.5 ? 1 : -1),
  }));

  const light = new THREE.PointLight(0x4400cc, 0, 24);
  light.position.set(ix, Y + 2.2, iz);
  group.add(light);

  let age = 0, sparkAcc = 0;
  let impacted = false;
  const travel = range / 28;
  const openT = 0.38;
  const hold = 1.15;
  const fadeT = 0.55;
  const life = travel + openT + hold + fadeT;

  function update(dt) {
    age += dt;
    const gFade = age > life - fadeT ? Math.max(0, (life - age) / fadeT) : 1;
    const afterT = Math.max(0, age - travel);
    const openAmt = Math.min(1, afterT / openT);

    faultMat.uniforms.uTime.value = age;
    faultMat.uniforms.uProgress.value = Math.min(1, age / Math.max(0.01, travel));
    faultMat.uniforms.uFade.value = gFade;

    if (age >= travel && !impacted) {
      impacted = true;
      hooks.onImpact?.();
      seam.visible = true;
      blade.visible = true;
      shards.visible = true;
      fx.bursts.spawn(BurstMode.AIR, ix, Y + 1.2, iz, {
        radius: 0.3, endRadius: 4.0, life: 0.65, squash: 0.42,
        intensity: 1.1, fresnel: 1.6, opacity: 0.75,
        colorA: 0x00e8ff, colorB: 0x6611cc, colorC: 0x050008,
      });
      fx.decals.spawn(DecalType.SHOCKWAVE, ix, iz, {
        radius: 4.8, life: 0.8, width: 0.06, intensity: 0.9,
        colorA: 0xaaffff, colorB: 0x7700cc,
      });
      fx.decals.spawn(DecalType.ARC, ix, iz, {
        radius: 3.8, life: 2.2, width: 1.0, intensity: 1.0,
        colorA: 0x06001a, colorB: 0x6600cc,
      });
      fx.sparks.emit(14, {
        x: ix, y: Y + 0.5, z: iz, radius: 0.4,
        speed: 4.2, spread: 1.0, life: 0.55, size: 5, color: 0x00d8ff, gravity: 0.12, vy: 1,
      });
    }

    if (impacted) {
      seamMat.uniforms.uTime.value = age;
      seamMat.uniforms.uOpen.value = openAmt;
      seamMat.uniforms.uFade.value = gFade;

      blade.rotation.y += dt * 3.5;
      blade.rotation.x += dt * 2.0;
      blade.scale.setScalar(openAmt * gFade);
      bladeMat.opacity = openAmt * gFade * 0.88;

      for (let i = 0; i < SHARD_N; i++) {
        const s = sData[i];
        s.angle += s.speed * dt;
        const pull = 1 - Math.max(0, afterT / (hold + fadeT)) * 0.65;
        _dm.position.set(
          ix + Math.cos(s.angle) * s.orbitR * pull,
          Y + 1.6 + s.orbitH * openAmt,
          iz + Math.sin(s.angle) * s.orbitR * pull,
        );
        _dm.rotation.set(s.angle * 1.8, age * s.speed, 0);
        _dm.scale.setScalar((0.7 + openAmt * 0.55) * gFade);
        _dm.updateMatrix();
        shards.setMatrixAt(i, _dm.matrix);
      }
      shards.instanceMatrix.needsUpdate = true;
      shardMat.opacity = openAmt * gFade * 0.88;
    }

    // Particles sucked inward toward the seam
    sparkAcc += dt * 14 * openAmt;
    const sn = Math.floor(sparkAcc); sparkAcc -= sn;
    if (sn > 0) {
      for (let i = 0; i < sn; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 1.8 + Math.random() * 3.2;
        fx.sparks.emit(1, {
          x: ix + Math.cos(a) * r, y: Y + 0.4 + Math.random() * 3.0, z: iz + Math.sin(a) * r,
          vx: -Math.cos(a), vy: 0.15, vz: -Math.sin(a),
          speed: 2.4, spread: 0.25, life: 0.48, size: 4, color: 0x6622cc, gravity: -0.05,
        });
      }
    }

    light.intensity = openAmt * gFade * 7;

    if (age >= life) { dispose(); return false; }
    return true;
  }

  function dispose() {
    root.remove(group);
    seamGeo.dispose(); seamMat.dispose();
    faultGeo.dispose(); faultMat.dispose();
    bladeGeo.dispose(); bladeMat.dispose();
    shardGeo.dispose(); shardMat.dispose();
  }
  return { update, dispose };
}