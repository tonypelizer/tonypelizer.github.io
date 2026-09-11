import * as THREE from 'three';

export function createLights(scene) {
  // Ambient — deep space, barely there
  const ambient = new THREE.AmbientLight(0x111827, 0.4);
  scene.add(ambient);

  // Sun — directional, harsh, casting shadows
  const sun = new THREE.DirectionalLight(0xfff5e0, 3.5);
  sun.position.set(120, 200, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 600;
  sun.shadow.camera.left   = -250;
  sun.shadow.camera.right  =  250;
  sun.shadow.camera.top    =  250;
  sun.shadow.camera.bottom = -250;
  sun.shadow.bias = -0.001;
  scene.add(sun);

  // Subtle fill from opposite side (moonlight bounce)
  const fill = new THREE.DirectionalLight(0x223355, 0.3);
  fill.position.set(-80, 40, -100);
  scene.add(fill);

  return { sun, ambient, fill };
}
