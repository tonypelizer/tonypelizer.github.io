import * as THREE from 'three';

const MAX_PARTICLES = 600;
const MIN_SPEED     = 0.3;

function makeSoftCircleTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0,   'rgba(180,170,155,1)');
  grad.addColorStop(0.4, 'rgba(160,150,135,0.7)');
  grad.addColorStop(1,   'rgba(140,130,118,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export class DustParticles {
  constructor(scene) {
    this._pos  = new Float32Array(MAX_PARTICLES * 3);
    this._vel  = [];
    this._life = new Float32Array(MAX_PARTICLES);
    this._maxL = new Float32Array(MAX_PARTICLES);
    this._used = new Uint8Array(MAX_PARTICLES);
    this._next = 0;
    this._emitTimer = 0;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this._vel.push(new THREE.Vector3());
      this._pos[i * 3 + 1] = -9999;
    }

    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(this._pos, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posAttr);

    this._mat = new THREE.PointsMaterial({
      map:             makeSoftCircleTexture(),
      color:           0xffffff,
      size:            2.8,
      sizeAttenuation: true,
      transparent:     true,
      alphaTest:       0.01,
      opacity:         0,
      depthWrite:      false,
      blending:        THREE.NormalBlending,
      fog:             true,
    });

    this._points = new THREE.Points(geo, this._mat);
    this._points.frustumCulled = false; // bounding sphere would be wrong (inactive slots at y=-9999)
    scene.add(this._points);

    // Separate burst opacity target so landing clouds pop instantly
    this._trailOpacity = 0;
    this._burstOpacity = 0;
  }

  _spawn(x, y, z, vx, vy, vz, life) {
    const i = this._next % MAX_PARTICLES;
    this._next++;
    this._used[i] = 1;
    this._pos[i * 3]     = x;
    this._pos[i * 3 + 1] = y;
    this._pos[i * 3 + 2] = z;
    this._vel[i].set(vx, vy, vz);
    this._life[i] = life;
    this._maxL[i] = life;
  }

  /** Radial burst on hard landing */
  burst(x, y, z, power) {
    const count = Math.floor(THREE.MathUtils.clamp(power * 8, 20, 180));
    for (let b = 0; b < count; b++) {
      const angle  = Math.random() * Math.PI * 2;
      const radius = Math.random() * 3.5;
      const spread = (0.6 + Math.random() * 1.2) * power * 0.32;
      const up     = (0.5 + Math.random() * 1.1) * power * 0.38;
      this._spawn(
        x + Math.cos(angle) * radius,
        y - 0.5,
        z + Math.sin(angle) * radius,
        Math.cos(angle) * spread,
        up,
        Math.sin(angle) * spread,
        2.2 + Math.random() * 2.0,
      );
    }
    this._burstOpacity = Math.min(0.98, 0.65 + power * 0.04);
  }

  update(dt, physics) {
    const abs           = physics.speedAbs;
    const heightAbove   = physics.position.y - physics.terrainY;
    const nearGround    = heightAbove < 2.5;  // emit even on small bumps
    const moving        = abs > MIN_SPEED && nearGround;

    // ── Emission ──────────────────────────────────────────────────────
    if (moving) {
      this._emitTimer += dt;
      // Rate scales with speed — aggressively, so even slow driving shows dust
      const rate     = Math.pow(Math.min(abs / 8, 1), 0.5);
      const interval = Math.max(0.008, 0.04 / rate);

      while (this._emitTimer >= interval) {
        this._emitTimer -= interval;

        const sinH = Math.sin(physics.heading);
        const cosH = Math.cos(physics.heading);

        // Two trails — one per rear wheel
        for (const side of [-1, 1]) {
          const jitter = (Math.random() - 0.5) * 1.2;
          const wx = physics.position.x - sinH * 2.0 + cosH * (side * 1.9 + jitter);
          const wz = physics.position.z - cosH * 2.0 - sinH * (side * 1.9 + jitter);

          const kickBack = abs * 0.08;
          this._spawn(
            wx, physics.terrainY + 0.1, wz,
            (Math.random() - 0.5) * abs * 0.15 - sinH * kickBack,
            (0.3 + Math.random() * 0.9) * rate * 1.8,
            (Math.random() - 0.5) * abs * 0.15 - cosH * kickBack,
            1.4 + Math.random() * 1.2,
          );
        }
      }
    } else {
      this._emitTimer = 0;
    }

    // ── Simulate ──────────────────────────────────────────────────────
    let anyActive = false;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (!this._used[i]) continue;

      this._life[i] -= dt;
      if (this._life[i] <= 0) {
        this._used[i] = 0;
        this._pos[i * 3 + 1] = -9999;
        continue;
      }

      anyActive = true;
      const v = this._vel[i];
      this._pos[i * 3]     += v.x * dt;
      this._pos[i * 3 + 1] += v.y * dt;
      this._pos[i * 3 + 2] += v.z * dt;

      // Moon gravity + drag
      v.y -= 1.6 * dt;
      const drag = 1 - dt * 1.2;
      v.x *= drag;
      v.z *= drag;
    }

    this._points.geometry.attributes.position.needsUpdate = true;

    // ── Opacity: trail fades in/out, burst snaps then decays ─────────
    const trailTarget = moving ? 0.88 : (anyActive ? 0.5 : 0);
    // Snap up fast, fade down slower
    const trailLerpRate = trailTarget > this._trailOpacity ? 18 : 4;
    this._trailOpacity += (trailTarget - this._trailOpacity) * Math.min(1, dt * trailLerpRate);
    this._burstOpacity  = Math.max(0, this._burstOpacity - dt * 0.9);

    this._mat.opacity = Math.max(this._trailOpacity, this._burstOpacity);
  }
}
