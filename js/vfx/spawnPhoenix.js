/**
 * Solar Phoenix VFX — adapted from ThreeJSVFX-Demo PhoenixAbility.
 * Charge orb → fire bird with flapping wings flies to target → sun-burst explosion.
 */
import * as THREE from 'three';
import { hash11, createPhoenixWingGeometry } from './geometry.js?v=29y';
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
float sn(vec3 v){
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
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm3(vec3 p){float v=0.0;float a=0.5;for(int i=0;i<3;i++){v+=a*sn(p);p*=2.02;a*=0.5;}return v;}
`;

/** FIREBIRD material — used for wings, body, and tail. */
function firebird(opts = {}) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    uniforms: {
      uTime:   { value: 0 },
      uAge:    { value: 0 },
      uFade:   { value: 1 },
      uFlap:   { value: opts.flap ?? 0 },    // 0=body, 1=wing
      uTail:   { value: opts.tail ?? 0 },    // 1=tail strip
      uSeed:   { value: opts.seed ?? 0 },
      uColorA: { value: new THREE.Color(opts.colorA ?? 0xfffbe8) },  // core
      uColorB: { value: new THREE.Color(opts.colorB ?? 0xffbe31) },  // wing
      uColorC: { value: new THREE.Color(opts.colorC ?? 0xff4b16) },  // edge/tip
    },
    vertexShader: /* glsl */ `
      uniform float uTime, uAge, uFlap, uTail, uSeed;
      varying vec2 vUv;
      varying float vFire;
      ${NOISE}
      void main(){
        vUv = uv;
        vec3 p = position;
        float flapAmt = uFlap * sin(uAge * 12.0) * 0.35 * (1.0 - uv.x * 0.6);
        if(uFlap > 0.5) p.y += flapAmt * (0.5 + uv.x);
        float flame = fbm3(p * 2.2 + vec3(uSeed * 7.0, -uAge * 2.8, 0.0));
        vFire = clamp(flame * 0.5 + 0.5, 0.0, 1.0);
        p.y += flame * 0.08 * (1.0 - uTail);
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uAge, uFade;
      uniform vec3 uColorA, uColorB, uColorC;
      varying vec2 vUv;
      varying float vFire;
      ${NOISE}
      void main(){
        float edge = 1.0 - smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.72, vUv.x)
                        * smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
        float heat = vFire + edge * 0.4;
        vec3 col = mix(uColorC, uColorB, heat);
        col = mix(col, uColorA, heat * heat);
        float alpha = (heat * 0.7 + (1.0 - edge) * 0.55) * uFade;
        if(alpha < 0.008) discard;
        gl_FragColor = vec4(col * 1.6, alpha);
      }
    `,
  });
}

function chargeMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: { uCharge: { value: 0 }, uTime: { value: 0 } },
    vertexShader: `
      uniform float uCharge, uTime;
      varying vec3 vN;
      void main(){ vN=normal; gl_Position=projectionMatrix*modelViewMatrix*vec4(position*(0.3+uCharge*0.7),1.0); }
    `,
    fragmentShader: `
      uniform float uCharge, uTime;
      varying vec3 vN;
      void main(){
        float ndv = abs(dot(normalize(vN), vec3(0.0,0.0,1.0)));
        float rim = pow(1.0-ndv, 2.2);
        float alpha = (rim * 1.1 + 0.15) * uCharge;
        if(alpha<0.006) discard;
        vec3 col = mix(vec3(1.0,0.82,0.12), vec3(1.0,0.45,0.06), rim);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}

export function spawnPhoenix(root, origin, dir, range, fx, hooks = {}) {
  const group = new THREE.Group();
  root.add(group);
  const ix = origin.x + dir.x * range, iz = origin.z + dir.z * range;
  const yaw = Math.atan2(dir.x, dir.z);

  // Charge orb at origin
  const orbGeo = new THREE.SphereGeometry(0.55, 16, 10);
  const orbMat = chargeMaterial();
  const orb = new THREE.Mesh(orbGeo, orbMat);
  orb.position.set(origin.x, Y + 1.1, origin.z);
  orb.renderOrder = 14;
  group.add(orb);

  // Bird pivot — flies from origin to impact
  const bird = new THREE.Group();
  group.add(bird);

  // Body — cone
  const bodyGeo = new THREE.ConeGeometry(0.4, 2.0, 10, 2);
  bodyGeo.rotateX(Math.PI / 2); // point forward
  const bodyMat = firebird({ colorA: 0xfff8e0, colorB: 0xff9c20, colorC: 0xff3d0a });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.renderOrder = 12;
  bird.add(body);

  // Head sphere
  const headGeo = new THREE.SphereGeometry(0.38, 12, 8);
  const headMat = firebird({ seed: 2.7, colorA: 0xffffff, colorB: 0xffcc40, colorC: 0xff6010 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.z = 1.15;
  head.renderOrder = 12;
  bird.add(head);

  // Wings (left & right) — use createPhoenixWingGeometry, flip left
  const wingGeo = createPhoenixWingGeometry();
  const wingMatR = firebird({ flap: 1, seed: 1.3, colorA: 0xfff0b0, colorB: 0xff9020, colorC: 0xff2a00 });
  const wingMatL = firebird({ flap: 1, seed: 4.1, colorA: 0xfff0b0, colorB: 0xff9020, colorC: 0xff2a00 });
  const wingR = new THREE.Mesh(wingGeo, wingMatR);
  wingR.rotation.y = Math.PI;    // face forward
  wingR.renderOrder = 11;
  bird.add(wingR);
  const wingL = new THREE.Mesh(wingGeo, wingMatL);
  wingL.scale.x = -1;            // mirror for left
  wingL.rotation.y = Math.PI;
  wingL.renderOrder = 11;
  bird.add(wingL);

  // Tail strips (5 planes stacked)
  const tailGeo = new THREE.PlaneGeometry(1.2, 0.22);
  const tailMats = [];
  for (let i = 0; i < 5; i++) {
    const m = firebird({ tail: 1, seed: i * 3.7, colorA: 0xffe080, colorB: 0xff6010, colorC: 0xcc1800 });
    tailMats.push(m);
    const t = new THREE.Mesh(tailGeo, m);
    t.position.set(0, (i - 2) * 0.14, -1.1 - i * 0.28);
    t.rotation.y = Math.PI;
    t.renderOrder = 11;
    bird.add(t);
  }

  bird.scale.setScalar(1.95);
  bird.visible = false;
  const light = new THREE.PointLight(0xff7820, 0, 28);
  group.add(light);

  let age = 0, emberAcc = 0;
  let impacted = false;
  const chargeT = 0.3;
  const flyT   = 0.55;
  const boomT  = 0.9;
  const life   = chargeT + flyT + boomT;

  function syncBird(mats) {
    for (const m of mats) {
      m.uniforms.uTime.value = age;
      m.uniforms.uAge.value  = age - chargeT;
    }
  }

  function update(dt) {
    age += dt;

    // Charge phase
    if (age < chargeT) {
      orbMat.uniforms.uCharge.value = age / chargeT;
      orbMat.uniforms.uTime.value   = age;
      light.position.copy(orb.position);
      light.intensity = (age / chargeT) * 4;
      return true;
    }

    // Flight phase
    orb.visible = false;
    bird.visible = true;
    const flyAge = age - chargeT;
    const u = Math.min(1, flyAge / flyT);
    const ease = u * u;
    bird.position.set(
      origin.x + (ix - origin.x) * ease,
      Y + 1.4 + Math.sin(u * Math.PI) * 3.5,
      origin.z + (iz - origin.z) * ease,
    );
    bird.rotation.y = yaw + Math.PI; // face toward target

    syncBird([bodyMat, headMat, wingMatR, wingMatL, ...tailMats]);
    wingMatR.uniforms.uFade.value = wingMatL.uniforms.uFade.value = 1;

    light.position.copy(bird.position);
    light.intensity = 6 + u * 4;

    emberAcc += dt * 20;
    const en = Math.floor(emberAcc); emberAcc -= en;
    if (en > 0) {
      fx.sparks.emit(en, {
        x: bird.position.x, y: bird.position.y, z: bird.position.z, radius: 0.3,
        vx: -dir.x, vy: -0.2, vz: -dir.z,
        speed: 3.5, spread: 0.9, life: 0.38, size: 6, color: 0xff8820, gravity: 0.5,
      });
    }

    // Impact
    if (u >= 1 && !impacted) {
      impacted = true;
      hooks.onImpact?.();
      bird.visible = false;
      fx.bursts.spawn(BurstMode.FIRE, ix, Y + 0.85, iz, {
        radius: 0.55, endRadius: 6.2, life: 0.95, squash: 0.5,
        intensity: 1.2, fresnel: 1.2, opacity: 0.92,
        colorA: 0xfffbe8, colorB: 0xff6010, colorC: 0x5a0a00,
      });
      fx.decals.spawn(DecalType.SCORCH, ix, iz, {
        radius: 5.5, life: 4.2, intensity: 0.95,
        colorA: 0x1a0600, colorB: 0xff6a22,
      });
      fx.decals.spawn(DecalType.SHOCKWAVE, ix, iz, {
        radius: 5.8, life: 0.8, width: 0.07, intensity: 0.9,
        colorA: 0xffee80, colorB: 0xff5500,
      });
      fx.sparks.emit(20, {
        x: ix, y: Y + 0.6, z: iz, radius: 0.6,
        speed: 5.5, spread: 1, life: 0.75, size: 7, color: 0xff8820, gravity: 0.5, vy: 1,
      });
      fx.sparks.emit(14, {
        x: ix, y: Y + 0.5, z: iz, radius: 0.55,
        speed: 7.0, spread: 1, life: 0.4, size: 4, color: 0xffee80, gravity: 0.25, vy: 1,
      });
    }

    const bFade = impacted ? Math.max(0, 1 - (flyAge - flyT) / boomT) : 1;
    light.intensity = impacted ? bFade * 8 : light.intensity;
    if (bFade <= 0) { dispose(); return false; }

    if (age >= life) { dispose(); return false; }
    return true;
  }

  function dispose() {
    root.remove(group);
    orbGeo.dispose(); orbMat.dispose();
    bodyGeo.dispose(); bodyMat.dispose();
    headGeo.dispose(); headMat.dispose();
    wingGeo.dispose(); wingMatR.dispose(); wingMatL.dispose();
    tailGeo.dispose(); tailMats.forEach(m => m.dispose());
  }
  return { update, dispose };
}