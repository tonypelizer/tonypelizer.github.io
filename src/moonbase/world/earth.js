import * as THREE from 'three';

const loader = new THREE.TextureLoader();

export function createEarth(scene) {
  const dayMap    = loader.load('/textures/earth_daymap.jpg');
  const cloudMap  = loader.load('/textures/earth_clouds.jpg');

  // Set texture color space
  dayMap.colorSpace   = THREE.SRGBColorSpace;
  cloudMap.colorSpace = THREE.SRGBColorSpace;

  const geo = new THREE.SphereGeometry(10, 64, 64);

  const mat = new THREE.MeshStandardMaterial({
    map:              dayMap,
    roughness:        0.6,
    metalness:        0.0,
    emissive:         new THREE.Color(0x1a3a6a),
    emissiveIntensity: 1.4,
    fog:              false,
  });

  const earth = new THREE.Mesh(geo, mat);
  earth.position.set(200, 28, -420);
  scene.add(earth);

  // Dedicated light so the sun always catches Earth regardless of angle
  const earthLight = new THREE.PointLight(0xffffff, 6, 0);
  earthLight.position.set(200, 28, -420);
  scene.add(earthLight);

  // Cloud layer
  const cloudGeo = new THREE.SphereGeometry(10.4, 64, 64);
  const cloudMat = new THREE.MeshStandardMaterial({
    map:              cloudMap,
    transparent:      true,
    opacity:          0.5,
    roughness:        1,
    metalness:        0,
    emissive:         new THREE.Color(0x223344),
    emissiveIntensity: 0.8,
    depthWrite:       false,
    fog:              false,
  });
  const clouds = new THREE.Mesh(cloudGeo, cloudMat);
  earth.add(clouds);

  function animate() {
    earth.rotation.y  += 0.0003;
    clouds.rotation.y += 0.00045; // clouds drift slightly faster
  }

  return { earth, animate };
}
