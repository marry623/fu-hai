/**
 * Dual-oar canoe steering (力矩转向):
 *
 * | 按键    | 船桨     | 船头转向 |
 * | A       | 左桨划水 | 向左转   |
 * | D       | 右桨划水 | 向右转   |
 * | A+D 同时 | 双桨     | 直线前进 |
 *
 * Alternating strokes within a timing window = rhythm boost.
 */

export function createPaddleController() {
  const st = {
    leftDown: false,
    rightDown: false,
    lastSide: 0, // -1 left, 1 right
    lastStrokeAt: 0,
    combo: 0,
    leftPhase: 0,
    rightPhase: 0,
    leftCycle: 0,
    rightCycle: 0,
    speed: 0,
    yaw: 0,
    x: 0,
    z: 0,
    anchored: false,
  };

  const BASE_PUSH = 22;
  const BOOST_PUSH = 36;
  const DRIFT_DRAG = 3.5;
  /** Positive yaw = bow turns toward +X (screen-right when facing +Z) = 右转 */
  const TURN_RATE = 1.85;
  const RHYTHM_MIN = 0.18;
  const RHYTHM_MAX = 0.55;
  /** Held-oar stroke loops per second (fore–aft, not freeze at end) */
  const STROKE_HZ = 1.35;

  /** When true, A/D (and arrows) are swapped — spore scramble */
  let scramble = false;
  /** 'left' | 'right' | null — blade crab locks one oar */
  let lockedOar = null;

  function setScramble(on) { scramble = !!on; }
  function setLockedOar(side) {
    lockedOar = side === 'left' || side === 'right' ? side : null;
  }

  function setKey(code, down) {
    let left = code === 'KeyA' || code === 'ArrowLeft';
    let right = code === 'KeyD' || code === 'ArrowRight';
    if (!left && !right) return;
    if (scramble) {
      const t = left;
      left = right;
      right = t;
    }
    if (left) st.leftDown = lockedOar === 'left' ? false : down;
    if (right) st.rightDown = lockedOar === 'right' ? false : down;
  }

  function onStroke(side, now) {
    const dt = now - st.lastStrokeAt;
    if (st.lastSide === -side && dt >= RHYTHM_MIN && dt <= RHYTHM_MAX) {
      st.combo = Math.min(8, st.combo + 1);
    } else if (dt < RHYTHM_MIN && st.lastSide !== 0) {
      st.combo = Math.max(0, st.combo - 2);
    } else if (dt > RHYTHM_MAX) {
      st.combo = Math.max(0, st.combo - 1);
    }
    st.lastSide = side;
    st.lastStrokeAt = now;
  }

  let prevL = false;
  let prevR = false;

  function update(dt, now, opts = {}) {
    const thrustMul = opts.thrustMul ?? 1;
    const turnMul = opts.turnMul ?? 1;
    const autoThrust = opts.autoThrust ?? 0;

    let autoWeigh = false;
    if (st.anchored) {
      if (st.leftDown || st.rightDown) {
        st.anchored = false;
        autoWeigh = true;
      } else {
        // 锚阻力：比普通漂移大约 3.5 倍，约 1.5–2 秒减到极低速
        const ANCHOR_DRAG = 12;
        // 锚定时允许的最大残余漂速（模拟水流轻推）
        const ANCHOR_DRIFT = 0.75;
        st.speed = Math.max(0, st.speed - ANCHOR_DRAG * dt);
        // 完全停止后保留轻微水波漂动感
        if (st.speed < ANCHOR_DRIFT) {
          st.speed = Math.min(ANCHOR_DRIFT, Math.max(0,
            st.speed + Math.sin(now * 0.7) * 0.06 * dt));
        }
        st.x += Math.sin(st.yaw) * st.speed * dt;
        st.z += Math.cos(st.yaw) * st.speed * dt;
        return { x: st.x, z: st.z, yaw: st.yaw, speed: st.speed,
                 drifting: true, sailing: false, combo: st.combo,
                 leftPhase: 0, rightPhase: 0, autoWeigh: false };
      }
    }

    if (lockedOar === 'left') st.leftDown = false;
    if (lockedOar === 'right') st.rightDown = false;

    if (st.leftDown && !prevL) onStroke(-1, now);
    if (st.rightDown && !prevR) onStroke(1, now);
    prevL = st.leftDown;
    prevR = st.rightDown;

    if (st.leftDown) {
      st.leftCycle += dt * STROKE_HZ;
      st.leftPhase = 0.5 - 0.5 * Math.cos(st.leftCycle * Math.PI * 2);
    } else {
      st.leftCycle = 0;
      st.leftPhase = Math.max(0, st.leftPhase - dt * 3);
    }
    if (st.rightDown) {
      st.rightCycle += dt * STROKE_HZ;
      st.rightPhase = 0.5 - 0.5 * Math.cos(st.rightCycle * Math.PI * 2);
    } else {
      st.rightCycle = 0;
      st.rightPhase = Math.max(0, st.rightPhase - dt * 3);
    }

    const both = st.leftDown && st.rightDown;
    const leftOnly = st.leftDown && !st.rightDown;   // A：左桨 → 左转
    const rightOnly = st.rightDown && !st.leftDown;  // D：右桨 → 右转
    const none = !st.leftDown && !st.rightDown;

    const rhythmBoost = 1 + st.combo * 0.08;
    let push = 0;
    if (both) {
      // 双桨：全力前进，不转向
      push = (BASE_PUSH + (st.combo > 1 ? BOOST_PUSH - BASE_PUSH : 0)) * rhythmBoost;
    } else if (leftOnly || rightOnly) {
      // 单桨：边推边转
      push = BASE_PUSH * 0.55 * rhythmBoost;
    }

    push *= thrustMul;
    push += autoThrust;

    if (none && autoThrust <= 0) {
      st.speed = Math.max(0, st.speed - DRIFT_DRAG * dt);
      st.speed += Math.sin(now * 0.7) * 0.15 * dt;
    } else {
      st.speed += push * dt;
      st.speed *= 1 - 1.2 * dt;
    }

    const maxSp = 22 * thrustMul;
    if (st.speed > maxSp) st.speed = maxSp;

    // A 左桨 → 左转；D 右桨 → 右转；A+D 不改 yaw
    if (leftOnly) st.yaw -= TURN_RATE * turnMul * dt;
    if (rightOnly) st.yaw += TURN_RATE * turnMul * dt;

    st.x += Math.sin(st.yaw) * st.speed * dt;
    st.z += Math.cos(st.yaw) * st.speed * dt;

    return {
      x: st.x,
      z: st.z,
      yaw: st.yaw,
      speed: st.speed,
      drifting: none && autoThrust <= 0,
      sailing: st.speed > 1.5 || !none || autoThrust > 0,
      combo: st.combo,
      leftPhase: st.leftPhase,
      rightPhase: st.rightPhase,
      autoWeigh,
    };
  }

  function reset(x = 0, z = 0) {
    st.x = x;
    st.z = z;
    st.yaw = 0;
    st.speed = 0;
    st.combo = 0;
    st.leftPhase = 0;
    st.rightPhase = 0;
    st.leftCycle = 0;
    st.rightCycle = 0;
    st.anchored = false;
  }

  return {
    setKey,
    setScramble,
    setLockedOar,
    setAnchored(on) { st.anchored = !!on; },
    update,
    reset,
    get state() { return st; },
    get scramble() { return scramble; },
    get lockedOar() { return lockedOar; },
    get anchored() { return st.anchored; },
  };
}
