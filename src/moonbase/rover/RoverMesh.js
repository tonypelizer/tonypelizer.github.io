import * as THREE from 'three';

const BODY_MAT  = new THREE.MeshStandardMaterial({ color: 0xc8a86b, roughness: 0.7, metalness: 0.3 });
const WHEEL_MAT = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.95, metalness: 0.1 });
const TREAD_MAT = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1.0,  metalness: 0.0 });
const METAL_MAT = new THREE.MeshStandardMaterial({ color: 0x88aacc, roughness: 0.3,  metalness: 0.8 });
const AMBER_MAT = new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xffaa00, emissiveIntensity: 1.2, roughness: 0.4 });
const SOLAR_MAT = new THREE.MeshStandardMaterial({ color: 0x1a2a55, roughness: 0.3,  metalness: 0.7 });
const LIGHT_MAT = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3 });

// Wheel layout: [right, forward] in rover-local space
// Front: fwd=+1.7, Rear: fwd=-1.7
const WHEEL_LAYOUT = [
  { r: -1.9, f:  1.7, front: true  }, // Front-Left
  { r:  1.9, f:  1.7, front: true  }, // Front-Right
  { r: -1.9, f: -1.7, front: false }, // Rear-Left
  { r:  1.9, f: -1.7, front: false }, // Rear-Right
];

export class RoverMesh {
  constructor(scene) {
    this.group = new THREE.Group();
    this.body  = new THREE.Group();

    this._wheels           = []; // {mesh, steerPivot, isFront}
    this._frontSteerPivots = []; // just the front pivots for steering

    this._buildBody();
    this._buildWheels();

    this.group.add(this.body);
    scene.add(this.group);
  }

  _buildBody() {
    // ── Chassis ────────────────────────────────────────────────────────
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.55, 5.2), BODY_MAT);
    chassis.position.y = 0.28;
    chassis.castShadow = true;
    this.body.add(chassis);

    // Side rails
    for (const sx of [-1.4, 1.4]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 5.4), METAL_MAT);
      rail.position.set(sx, 0.65, 0);
      rail.castShadow = true;
      this.body.add(rail);
    }

    // ── Upper instrument deck ──────────────────────────────────────────
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.2, 3.4), BODY_MAT);
    deck.position.set(0, 0.95, -0.3);
    deck.castShadow = true;
    this.body.add(deck);

    // ── Mast ──────────────────────────────────────────────────────────
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.2, 8), METAL_MAT);
    mast.position.set(0, 2.1, -0.3);
    mast.castShadow = true;
    this.body.add(mast);

    // Camera head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.38, 0.38), METAL_MAT);
    head.position.set(0, 3.25, -0.3);
    head.castShadow = true;
    this.body.add(head);

    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.18, 12), AMBER_MAT);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 3.25, -0.52);
    this.body.add(lens);

    // ── Solar panel arm ────────────────────────────────────────────────
    const armGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.9, 6);
    const arm = new THREE.Mesh(armGeo, METAL_MAT);
    arm.rotation.x = -0.3;
    arm.position.set(0, 1.15, -1.9);
    this.body.add(arm);

    const panel = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.05, 1.3), SOLAR_MAT);
    panel.position.set(0, 1.45, -2.55);
    panel.castShadow = true;
    this.body.add(panel);

    // ── Headlights ─────────────────────────────────────────────────────
    for (const lx of [-0.85, 0.85]) {
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), LIGHT_MAT);
      hl.position.set(lx, 0.45, 2.65);
      this.body.add(hl);
    }

    const spot = new THREE.SpotLight(0xfff8e0, 5, 35, 0.42, 0.55);
    spot.position.set(0, 0.5, 2.6);
    spot.target.position.set(0, -2, 12);
    spot.castShadow = false; // perf
    this.body.add(spot);
    this.body.add(spot.target);

    // Rear light strips (amber)
    const rearStrip = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 2 }));
    rearStrip.position.set(0, 0.35, -2.65);
    this.body.add(rearStrip);

    // Antenna stub
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 5), METAL_MAT);
    ant.position.set(0.9, 1.65, -0.3);
    this.body.add(ant);
  }

  _buildWheels() {
    const wheelGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.52, 18);
    // Tread ring slightly bigger
    const treadGeo = new THREE.TorusGeometry(0.65, 0.09, 6, 18);

    WHEEL_LAYOUT.forEach(({ r, f, front }) => {
      // Steering pivot — only front wheels rotate for steering
      const steerPivot = new THREE.Group();
      steerPivot.position.set(r, 0, f);
      this.body.add(steerPivot);
      if (front) this._frontSteerPivots.push(steerPivot);

      // Axle stub
      const axleLen = front ? 0.7 : 0.6;
      const axle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, axleLen, 8),
        METAL_MAT
      );
      axle.rotation.z = Math.PI / 2;
      steerPivot.add(axle);

      // Wheel drum (axis = local X → rotates on X)
      const drum = new THREE.Mesh(wheelGeo, WHEEL_MAT);
      drum.rotation.z = Math.PI / 2; // drum axis now aligns with world X (rover right)
      drum.castShadow = true;
      steerPivot.add(drum);

      // Tread ring
      const tread = new THREE.Mesh(treadGeo, TREAD_MAT);
      tread.rotation.y = Math.PI / 2;
      drum.add(tread); // child of drum so it spins with it

      // Hub cap dot
      for (const side of [-0.3, 0.3]) {
        const hub = new THREE.Mesh(new THREE.CircleGeometry(0.22, 10), METAL_MAT);
        hub.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
        hub.position.x = side;
        drum.add(hub);
      }

      this._wheels.push({ drum, steerPivot, isFront: front });
    });
  }

  /** Called each frame with current physics state */
  syncFromPhysics(phys, dt) {
    // Group position and heading
    this.group.position.copy(phys.position);
    this.group.rotation.y = phys.heading;

    // Body tilt (pitch & roll from terrain + lean)
    this.body.rotation.order = 'ZXY';
    this.body.rotation.x = -phys.pitch;
    this.body.rotation.z = -phys.roll;

    // Front-wheel steering
    const steer = phys.steerAngle;
    this._frontSteerPivots.forEach(pivot => {
      pivot.rotation.y = steer;
    });

    // Wheel spin — driven by actual velocity so coasting looks right
    const spinDelta = (phys.speed * dt) / 0.65; // arc / radius
    this._wheels.forEach(({ drum }) => {
      drum.rotation.x += spinDelta;
    });
  }
}
