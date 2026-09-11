import * as THREE from 'three';
import { LANDMARK_DEFS } from '../data/landmarkDefs.js';
import { getTerrainHeight } from './terrain.js';

const MAT = {
  grey:    new THREE.MeshStandardMaterial({ color: 0x9aabb5, roughness: 0.8, metalness: 0.1 }),
  metal:   new THREE.MeshStandardMaterial({ color: 0x7a8a94, roughness: 0.4, metalness: 0.6 }),
  glass:   new THREE.MeshStandardMaterial({ color: 0x88bbcc, roughness: 0.0, metalness: 0.1, transparent: true, opacity: 0.45 }),
  amber:   new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xffa020, emissiveIntensity: 1.2, roughness: 0.8 }),
  solar:   new THREE.MeshStandardMaterial({ color: 0x1a2a55, roughness: 0.3, metalness: 0.7, emissive: 0x050f22 }),
  white:   new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.6, metalness: 0.2 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.5, metalness: 0.7 }),
};

function placeOnTerrain(group, x, z, craters) {
  const y = getTerrainHeight(x, z, craters);
  group.position.set(x, y, z);
}

function buildHabitat(craters) {
  const group = new THREE.Group();

  // Main dome
  const dome = new THREE.Mesh(new THREE.SphereGeometry(8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), MAT.grey);
  dome.castShadow = true;
  dome.receiveShadow = true;
  group.add(dome);

  // Transparent dome cap
  const glassDome = new THREE.Mesh(new THREE.SphereGeometry(8.1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), MAT.glass);
  group.add(glassDome);

  // Interior glow point light (warm amber)
  const glow = new THREE.PointLight(0xffaa44, 3, 22);
  glow.position.set(0, 3, 0);
  group.add(glow);

  // Base cylinder
  const base = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, 2, 32), MAT.grey);
  base.position.y = -1;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Airlock tunnel
  const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 12, 16), MAT.grey);
  tunnel.rotation.z = Math.PI / 2;
  tunnel.position.set(10, 1, 3);
  tunnel.castShadow = true;
  group.add(tunnel);

  placeOnTerrain(group, 0, 0, craters);
  return group;
}

function buildCommsT(craters) {
  const def = LANDMARK_DEFS.find(l => l.id === 'comms');
  const group = new THREE.Group();

  // Main mast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 24, 8), MAT.metal);
  mast.position.y = 12;
  mast.castShadow = true;
  group.add(mast);

  // Dish
  const dish = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), MAT.white);
  dish.rotation.x = -Math.PI / 4;
  dish.position.set(0, 26, 0);
  dish.castShadow = true;
  group.add(dish);

  // Dish arm
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 6, 6), MAT.metal);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(3, 26, 0);
  group.add(arm);

  // Blinking signal light
  const signal = new THREE.PointLight(0x00ff88, 2, 12);
  signal.position.set(0, 28, 0);
  group.add(signal);
  group.userData.signalLight = signal;
  group.userData.signalTime = 0;

  // Guy wires (thin cylinders)
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 18, 4), MAT.darkMetal);
    wire.position.set(Math.cos(angle) * 8, 9, Math.sin(angle) * 8);
    wire.lookAt(0, 24, 0);
    group.add(wire);
  }

  placeOnTerrain(group, def.x, def.z, craters);
  return group;
}

function buildSolarArray(craters) {
  const def = LANDMARK_DEFS.find(l => l.id === 'solar');
  const group = new THREE.Group();

  const rows = 3, cols = 4;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(5, 0.15, 3), MAT.solar);
      panel.castShadow = true;
      panel.receiveShadow = true;
      // Tilt toward sun (positive X direction)
      panel.rotation.x = -0.4;
      panel.position.set((c - cols / 2 + 0.5) * 6, 2.5, (r - rows / 2 + 0.5) * 5);
      group.add(panel);

      // Support post
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.5, 6), MAT.metal);
      post.position.set((c - cols / 2 + 0.5) * 6, 1, (r - rows / 2 + 0.5) * 5);
      group.add(post);
    }
  }

  placeOnTerrain(group, def.x, def.z, craters);
  return group;
}

function buildObservatory(craters) {
  const def = LANDMARK_DEFS.find(l => l.id === 'observatory');
  const group = new THREE.Group();

  // Building base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.5, 4, 24), MAT.grey);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Dome top
  const dome = new THREE.Mesh(new THREE.SphereGeometry(5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), MAT.white);
  dome.position.y = 2;
  dome.castShadow = true;
  group.add(dome);

  // Telescope tube
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 8, 12), MAT.darkMetal);
  tube.rotation.z = Math.PI / 4;
  tube.position.set(2, 6, 0);
  tube.castShadow = true;
  group.add(tube);

  // Subtle inside glow
  const glow = new THREE.PointLight(0x4488ff, 1.5, 15);
  glow.position.set(0, 4, 0);
  group.add(glow);

  placeOnTerrain(group, def.x, def.z, craters);
  return group;
}

function buildLandingPad(craters) {
  const def = LANDMARK_DEFS.find(l => l.id === 'landing');
  const group = new THREE.Group();

  // Flat pad
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 0.4, 32), MAT.darkMetal);
  pad.receiveShadow = true;
  group.add(pad);

  // Pad markings (ring)
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(10, 0.3, 8, 64),
    new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff8800, emissiveIntensity: 0.8 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.3;
  group.add(ring);

  // Corner lights
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 2 })
    );
    light.position.set(Math.cos(angle) * 12, 0.5, Math.sin(angle) * 12);
    group.add(light);
  }

  // Rocket — stacked cylinders
  const rocket = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 14, 12), MAT.white);
  body.castShadow = true;
  rocket.add(body);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.5, 5, 12), MAT.white);
  nose.position.y = 9.5;
  nose.castShadow = true;
  rocket.add(nose);

  // Fins
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 4, 2.5),
      MAT.darkMetal
    );
    fin.position.set(Math.cos(angle) * 2.2, -4, Math.sin(angle) * 2.2);
    fin.rotation.y = angle;
    fin.castShadow = true;
    rocket.add(fin);
  }
  rocket.position.set(0, 8, 0);
  group.add(rocket);

  placeOnTerrain(group, def.x, def.z, craters);
  return group;
}

export function createLandmarks(scene, craters = []) {
  const groups = {
    habitat:     buildHabitat(craters),
    comms:       buildCommsT(craters),
    solar:       buildSolarArray(craters),
    observatory: buildObservatory(craters),
    landing:     buildLandingPad(craters),
  };

  Object.values(groups).forEach(g => scene.add(g));

  function animate(dt) {
    // Blink comms signal light
    const ct = groups.comms.userData;
    if (ct.signalLight) {
      ct.signalTime = (ct.signalTime || 0) + dt;
      ct.signalLight.intensity = ct.signalTime % 1.5 < 0.15 ? 4 : 0;
    }
  }

  return { groups, animate };
}
