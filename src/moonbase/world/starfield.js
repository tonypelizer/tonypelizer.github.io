import * as THREE from 'three';

export function createStarfield(scene) {
  const COUNT = 3500;
  const positions = new Float32Array(COUNT * 3);
  const sizes     = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++) {
    // Distribute on a large sphere
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = 800 + Math.random() * 200;

    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 20; // keep above horizon
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    sizes[i] = 0.5 + Math.random() * 2.5;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    sizeAttenuation: true,
    size: 1.2,
    transparent: true,
    opacity: 0.85,
    fog: false, // stars must not be swallowed by horizon fog
  });

  const stars = new THREE.Points(geo, mat);
  scene.add(stars);
  return stars;
}
