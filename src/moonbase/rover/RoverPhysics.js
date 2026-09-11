import * as THREE from 'three';
import { TERRAIN_SIZE } from '../world/terrain.js';

// ── Tuning constants ─────────────────────────────────────────────────────────
const MAX_SPEED     = 28;    // m/s forward — high enough to catch air on crater rims
const MAX_REV       = 8;     // m/s reverse
const ACCEL         = 18;    // m/s² throttle acceleration
const BRAKE_FORCE   = 30;    // m/s² when pressing opposite direction
const DRAG_60       = 0.83;  // speed multiplier per frame at 60 fps (no input)
const STEER_SMOOTH  = 10;    // how fast steer input smooths (higher = snappier)
const TURN_LOW      = 1.8;   // rad/s turn rate at low speed
const TURN_HIGH_F   = 0.38;  // fraction of TURN_LOW at max speed
const BODY_LEAN_MAX = 0.065; // max roll lean from turning (rad)
const WHEEL_RADIUS  = 0.65;

const GRAVITY       = 1.6;   // real moon gravity (1.62 m/s²)
const RIDE_HEIGHT   = 0.72;  // rover center above terrain surface
const BOUND         = TERRAIN_SIZE / 2 - 12;

const _rayOrigin = new THREE.Vector3();
const _rayDown   = new THREE.Vector3(0, -1, 0);
const _raycaster = new THREE.Raycaster(_rayOrigin, _rayDown);
const _smoothNorm = new THREE.Vector3(0, 1, 0);

export class RoverPhysics {
  constructor() {
    this.position   = new THREE.Vector3(0, 2, 55);
    this.heading    = Math.PI; // face toward -Z (toward base)

    this.speed          = 0;       // signed m/s
    this.steerInput     = 0;       // smoothed -1..1 (left = -1, right = 1)
    this.steerAngle     = 0;       // front-wheel visual yaw (rad)
    this.bodyLean       = 0;       // extra roll from turning
    this.wheelSpin      = 0;       // accumulated wheel rotation (rad)
    this.verticalVelocity = 0;     // m/s up/down for air physics
    this.airborne       = false;
    this.landingImpact  = 0;       // set to impact speed on touchdown, cleared next frame
    this.terrainY       = 0;       // terrain surface Y at rover position (updated each frame)

    this.pitch = 0;
    this.roll  = 0;

    this._terrainMesh = null;
    this._smoothNorm  = new THREE.Vector3(0, 1, 0);
    this._hitResult   = { y: 0, normal: new THREE.Vector3(0, 1, 0) };
  }

  setTerrain(mesh) {
    this._terrainMesh = mesh;
  }

  // Cast a single downward ray, return true and populate result if hit
  _raycast(x, z, result) {
    if (!this._terrainMesh) return false;
    _rayOrigin.set(x, this.position.y + 25, z);
    _raycaster.set(_rayOrigin, _rayDown);
    _raycaster.near = 0;
    _raycaster.far  = 60;
    const hits = _raycaster.intersectObject(this._terrainMesh, false);
    if (hits.length > 0) {
      result.y = hits[0].point.y;
      result.normal = hits[0].face.normal.clone()
        .transformDirection(this._terrainMesh.matrixWorld)
        .normalize();
      return true;
    }
    return false;
  }

  update(dt, controls) {
    dt = Math.min(dt, 0.05);
    this.landingImpact = 0; // cleared each frame; set below on touchdown

    const { forward, backward, left, right } = controls;

    // ── Throttle / drag ────────────────────────────────────────────────
    if (forward && !backward) {
      this.speed = Math.min(this.speed + ACCEL * dt, MAX_SPEED);
    } else if (backward && !forward) {
      if (this.speed > 0.5) {
        // Braking from forward motion
        this.speed = Math.max(this.speed - BRAKE_FORCE * dt, 0);
      } else {
        // Reverse
        this.speed = Math.max(this.speed - (ACCEL * 0.65) * dt, -MAX_REV);
      }
    } else {
      // Friction drag — frame-rate independent
      this.speed *= Math.pow(DRAG_60, dt * 60);
      if (Math.abs(this.speed) < 0.015) this.speed = 0;
    }

    // ── Steering ────────────────────────────────────────────────────────
    const rawSteer = (right ? 1 : 0) - (left ? 1 : 0);
    // Smooth steer input so tap-turning feels planted, not twitchy
    this.steerInput += (rawSteer - this.steerInput) * Math.min(1, STEER_SMOOTH * dt);

    // Turn rate narrows as speed increases (wider radius at speed)
    const speedFrac = Math.min(Math.abs(this.speed) / MAX_SPEED, 1);
    const turnRate  = TURN_LOW * THREE.MathUtils.lerp(1, TURN_HIGH_F, speedFrac);

    if (Math.abs(this.speed) > 0.05) {
      const dir = this.speed >= 0 ? 1 : -1;
      this.heading -= this.steerInput * turnRate * dt * dir;
    }

    // Front-wheel visual steer angle — snappier than heading change
    this.steerAngle = THREE.MathUtils.lerp(
      this.steerAngle,
      this.steerInput * 0.52,
      Math.min(1, dt * 12)
    );

    // Body lean into turns (roll toward outside)
    const targetLean = -this.steerInput * speedFrac * BODY_LEAN_MAX;
    this.bodyLean = THREE.MathUtils.lerp(this.bodyLean, targetLean, Math.min(1, dt * 7));

    // Wheel spin — driven by actual speed, coasting looks right
    this.wheelSpin += (this.speed * dt) / WHEEL_RADIUS;

    // ── Position update ────────────────────────────────────────────────
    this.position.x += Math.sin(this.heading) * this.speed * dt;
    this.position.z += Math.cos(this.heading) * this.speed * dt;

    // Boundary clamp
    this.position.x = Math.max(-BOUND, Math.min(BOUND, this.position.x));
    this.position.z = Math.max(-BOUND, Math.min(BOUND, this.position.z));

    // ── Vertical / air physics ────────────────────────────────────────
    this.verticalVelocity -= GRAVITY * dt;
    this.position.y       += this.verticalVelocity * dt;

    // ── Raycast terrain check ─────────────────────────────────────────
    const h = this._hitResult;
    if (this._raycast(this.position.x, this.position.z, h)) {
      this.terrainY = h.y;
      const groundY = h.y + RIDE_HEIGHT;
      if (this.position.y <= groundY) {
        // Landed (or on ground)
        this.landingImpact = this.airborne ? Math.abs(this.verticalVelocity) : 0;
        this.position.y    = groundY;
        this.airborne      = false;
        this._smoothNorm.lerp(h.normal, Math.min(1, dt * 12)).normalize();

            // Carry slope velocity so the rover catches air off crater rims.
        // Dampen significantly so small terrain bumps don't constantly launch it.
        const n    = this._smoothNorm;
        const sinH = Math.sin(this.heading);
        const cosH = Math.cos(this.heading);
        const fwdSlopeComp = n.x * sinH + n.z * cosH; // negative when going uphill
        const rawSlopeVV = (-fwdSlopeComp / Math.max(n.y, 0.15)) * this.speed * 0.45;
        // Only launch if slope is steep enough (>1.5 m/s upward) to avoid micro-airtime on bumpy terrain
        this.verticalVelocity = rawSlopeVV > 1.5 ? rawSlopeVV : 0;
      } else {
        // Airborne — rover is above terrain
        this.airborne = true;
      }
    }

    // ── Slope tilt from surface normal ────────────────────────────────
    const n = this._smoothNorm;
    const sinH = Math.sin(this.heading);
    const cosH = Math.cos(this.heading);

    const fwdComp   =  n.x * sinH + n.z * cosH;
    const rightComp =  n.x * cosH - n.z * sinH;

    // When airborne, slowly level out
    const tiltStrength = this.airborne ? 0.3 : 0.85;
    const targetPitch  = Math.atan2(-fwdComp, n.y) * tiltStrength;
    const targetRoll   = Math.atan2(rightComp, n.y) * tiltStrength + this.bodyLean;

    this.pitch = THREE.MathUtils.lerp(this.pitch, targetPitch, Math.min(1, dt * 10));
    this.roll  = THREE.MathUtils.lerp(this.roll,  targetRoll,  Math.min(1, dt * 10));
  }

  /** Convert a rover-local (right, forward) offset to world XZ */
  worldOffset(localRight, localFwd, localUp = 0) {
    const sinH = Math.sin(this.heading);
    const cosH = Math.cos(this.heading);
    return new THREE.Vector3(
      this.position.x + localRight * cosH + localFwd  * sinH,
      this.position.y + localUp,
      this.position.z - localRight * sinH + localFwd  * cosH,
    );
  }

  get isMoving()  { return Math.abs(this.speed) > 0.35; }
  get speedAbs()  { return Math.abs(this.speed); }
}
