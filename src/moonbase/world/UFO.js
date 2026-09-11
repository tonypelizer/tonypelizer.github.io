import * as THREE from 'three';

const FLYBY_MIN = 100; // seconds between random flybys
const FLYBY_MAX = 200;

export class UFO {
  constructor(scene) {
    this._scene  = scene;
    this._group  = new THREE.Group();
    this._group.visible = false;
    this._state  = 'idle';
    this._t      = 0;
    this._flybyTimer = FLYBY_MIN + Math.random() * (FLYBY_MAX - FLYBY_MIN);
    this._fromPos = new THREE.Vector3();
    this._toPos   = new THREE.Vector3();
    this._flybyDuration = 12;
    this.onAbductionMidpoint = null; // fired when screen should flash + rover teleport

    this._build();
    scene.add(this._group);
  }

  _build() {
    // Main disc
    const discGeo = new THREE.CylinderGeometry(3.5, 4.5, 1.0, 32);
    const discMat = new THREE.MeshStandardMaterial({ color: 0x99aabb, metalness: 0.85, roughness: 0.15 });
    this._group.add(new THREE.Mesh(discGeo, discMat));

    // Dome
    const domeGeo = new THREE.SphereGeometry(2.2, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0x1a2a3a, metalness: 0.4, roughness: 0.1,
      emissive: 0x112233, emissiveIntensity: 0.8,
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = 0.7;
    this._group.add(dome);

    // Rim glow ring
    const rimGeo = new THREE.TorusGeometry(4.2, 0.22, 8, 48);
    this._rimMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xffee66, emissiveIntensity: 1.2,
    });
    const rim = new THREE.Mesh(rimGeo, this._rimMat);
    rim.rotation.x = Math.PI / 2;
    this._group.add(rim);

    // Coloured blink lights
    this._blinkLights = [];
    const cols = [0xff4444, 0x44ff88, 0x4488ff, 0xffff44, 0xff44ff, 0x44ffff];
    for (let i = 0; i < 6; i++) {
      const a   = (i / 6) * Math.PI * 2;
      const geo = new THREE.SphereGeometry(0.2, 8, 8);
      const mat = new THREE.MeshStandardMaterial({
        color: cols[i], emissive: new THREE.Color(cols[i]), emissiveIntensity: 2,
      });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(Math.cos(a) * 4.2, -0.25, Math.sin(a) * 4.2);
      this._group.add(m);
      this._blinkLights.push({ mat, phase: (i / 6) * Math.PI * 2 });
    }

    // Tractor beam — open inverted cone
    const beamGeo = new THREE.ConeGeometry(5.5, 22, 16, 1, true);
    this._beamMat = new THREE.MeshBasicMaterial({
      color: 0x88ddff, transparent: true, opacity: 0,
      side: THREE.DoubleSide, depthWrite: false,
    });
    this._beam = new THREE.Mesh(beamGeo, this._beamMat);
    this._beam.rotation.x = Math.PI; // flip: wide end up, tip down
    this._beam.position.y = -11;     // hang below disc center
    this._group.add(this._beam);

    // Point light inside beam
    this._beamLight = new THREE.PointLight(0x88ddff, 0, 35);
    this._beamLight.position.y = -6;
    this._group.add(this._beamLight);
  }

  // ── Public start methods ──────────────────────────────────────────────────

  startFlyby() {
    const side = Math.random() > 0.5 ? 1 : -1;
    const alt  = 52 + Math.random() * 18;
    this._fromPos.set(-side * 220, alt, (Math.random() - 0.5) * 180);
    this._toPos.set(  side * 220, alt + (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 180);
    this._group.position.copy(this._fromPos);
    this._flybyDuration = 10 + Math.random() * 5;
    this._t = 0;
    this._state = 'flyby';
    this._group.visible = true;
  }

  startIdleVisit() {
    if (this._state !== 'idle' && this._state !== 'flyby') return;
    this._group.position.set((Math.random() - 0.5) * 10, 80, (Math.random() - 0.5) * 10);
    this._beamMat.opacity  = 0;
    this._beamLight.intensity = 0;
    this._t = 0;
    this._state = 'idle_descend';
    this._group.visible = true;
  }

  startAbduction(roverPhysics, onMidpoint) {
    this.onAbductionMidpoint = onMidpoint;
    this._group.position.set(roverPhysics.position.x, roverPhysics.position.y + 65, roverPhysics.position.z);
    this._beamMat.opacity  = 0;
    this._beamLight.intensity = 0;
    this._t = 0;
    this._state = 'abduct_descend';
    this._group.visible = true;
  }

  get isActive()       { return this._state !== 'idle'; }
  get isAbducting()    { return this._state.startsWith('abduct'); }
  get shouldLiftRover(){ return this._state === 'abduct_lift'; }

  // ── Update ────────────────────────────────────────────────────────────────

  update(dt, time, roverPhysics) {
    // Passive flyby timer (only when truly idle)
    if (this._state === 'idle') {
      this._flybyTimer -= dt;
      if (this._flybyTimer <= 0) {
        this.startFlyby();
        this._flybyTimer = FLYBY_MIN + Math.random() * (FLYBY_MAX - FLYBY_MIN);
      }
      return;
    }

    this._t += dt;

    // Animate blink lights + rim
    const spinRate = this._state === 'idle_hover' || this._state.startsWith('abduct') ? 10 : 3;
    this._blinkLights.forEach(l => {
      l.mat.emissiveIntensity = 1.5 + Math.sin(time * spinRate + l.phase) * 1.5;
    });
    this._rimMat.emissiveIntensity = 0.8 + Math.sin(time * 5) * 0.5;

    switch (this._state) {
      // ── Passive flyby ───────────────────────────────────────────────────
      case 'flyby': {
        const p = Math.min(this._t / this._flybyDuration, 1);
        this._group.position.lerpVectors(this._fromPos, this._toPos, p);
        this._group.position.y += Math.sin(this._t * 1.5) * 0.3;
        if (p >= 1) { this._group.visible = false; this._state = 'idle'; }
        break;
      }

      // ── Idle visit ──────────────────────────────────────────────────────
      case 'idle_descend': {
        const p = Math.min(this._t / 7, 1);
        this._group.position.y = THREE.MathUtils.lerp(80, 18, this._ease(p));
        this._group.position.x += Math.sin(time * 0.7) * 0.02;
        if (p >= 1) { this._t = 0; this._state = 'idle_hover'; }
        break;
      }
      case 'idle_hover': {
        this._group.position.y = 18 + Math.sin(time * 1.1) * 0.6;
        const pulse = 0.12 + Math.sin(time * 4) * 0.04;
        this._beamMat.opacity = pulse;
        this._beamLight.intensity = 3 + Math.sin(time * 4) * 1;
        if (this._t >= 10) { this._t = 0; this._state = 'idle_ascend'; }
        break;
      }
      case 'idle_ascend': {
        const p = Math.min(this._t / 5, 1);
        this._group.position.y = THREE.MathUtils.lerp(18, 90, p);
        this._group.position.x += dt * 10 * p;
        this._beamMat.opacity = THREE.MathUtils.lerp(0.12, 0, p);
        this._beamLight.intensity = THREE.MathUtils.lerp(3, 0, p);
        if (p >= 1) { this._group.visible = false; this._beamMat.opacity = 0; this._beamLight.intensity = 0; this._state = 'idle'; }
        break;
      }

      // ── Abduction ───────────────────────────────────────────────────────
      case 'abduct_descend': {
        // Track rover while descending
        this._group.position.x = roverPhysics.position.x;
        this._group.position.z = roverPhysics.position.z;
        const targetY = roverPhysics.position.y + 22;
        const p = Math.min(this._t / 3.5, 1);
        this._group.position.y = THREE.MathUtils.lerp(roverPhysics.position.y + 65, targetY, this._ease(p));
        if (p >= 1) { this._t = 0; this._state = 'abduct_beam'; }
        break;
      }
      case 'abduct_beam': {
        this._group.position.x = roverPhysics.position.x;
        this._group.position.z = roverPhysics.position.z;
        const p = Math.min(this._t / 2, 1);
        this._beamMat.opacity = p * 0.35;
        this._beamLight.intensity = p * 8;
        if (p >= 1) { this._t = 0; this._state = 'abduct_lift'; }
        break;
      }
      case 'abduct_lift': {
        this._group.position.x = roverPhysics.position.x;
        this._group.position.z = roverPhysics.position.z;
        this._group.position.y = roverPhysics.position.y + 22;
        this._beamMat.opacity = 0.35 + Math.sin(time * 10) * 0.06;
        this._beamLight.intensity = 8 + Math.sin(time * 10) * 2;
        if (this._t >= 3) {
          this._t = 0;
          this._state = 'abduct_flash';
          if (this.onAbductionMidpoint) this.onAbductionMidpoint();
        }
        break;
      }
      case 'abduct_flash': {
        this._beamMat.opacity = Math.max(0, 0.35 - this._t * 0.6);
        this._beamLight.intensity = Math.max(0, 8 - this._t * 14);
        this._group.position.y += dt * 30;
        this._group.position.x += dt * 20;
        if (this._t >= 2) {
          this._group.visible = false;
          this._beamMat.opacity = 0;
          this._beamLight.intensity = 0;
          this._state = 'idle';
          this._flybyTimer = FLYBY_MIN + Math.random() * (FLYBY_MAX - FLYBY_MIN);
        }
        break;
      }
    }
  }

  _ease(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
}
