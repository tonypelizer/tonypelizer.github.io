import * as THREE from 'three';
import { fbm } from '../core/noise.js';

export const TERRAIN_SIZE = 600;
const SEGMENTS = 220;
const HEIGHT_SCALE = 10;
const NOISE_FREQ = 3.5;

// Reusable function — also used by rover physics
export function getTerrainHeight(worldX, worldZ, craters = []) {
  const nx = (worldX / TERRAIN_SIZE) * NOISE_FREQ;
  const nz = (worldZ / TERRAIN_SIZE) * NOISE_FREQ;
  let h = fbm(nx, nz) * HEIGHT_SCALE;

  // Small surface pebbles
  h += fbm(nx * 6, nz * 6) * 0.5;

  // Flatten slightly near habitat spawn so rover doesn't spawn inside rock
  const spawnDist = Math.sqrt(worldX * worldX + worldZ * worldZ);
  if (spawnDist < 30) {
    h *= spawnDist / 30;
  }

  // Apply crater depressions
  for (const crater of craters) {
    const dx = worldX - crater.x;
    const dz = worldZ - crater.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const r = crater.radius;

    if (dist < r * 1.4) {
      const t = dist / r;
      if (t <= 0.85) {
        // Bowl interior — smooth gaussian depression
        const bowl = 1 - (t / 0.85) ** 2;
        h -= crater.depth * bowl;
      } else if (t <= 1.2) {
        // Raised rim
        const rimT = (t - 0.85) / 0.35;
        const rim = Math.sin(rimT * Math.PI);
        h += crater.depth * 0.3 * rim;
      }
    }
  }

  return h;
}

export function createTerrain(scene, craters = []) {
  const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, SEGMENTS, SEGMENTS);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    positions.setY(i, getTerrainHeight(x, z, craters));
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();

  const moonTex = new THREE.TextureLoader().load('/textures/moon.jpg');
  moonTex.colorSpace = THREE.SRGBColorSpace;
  moonTex.wrapS = moonTex.wrapT = THREE.RepeatWrapping;
  moonTex.repeat.set(12, 12); // tile across the terrain

  const material = new THREE.MeshStandardMaterial({
    map:       moonTex,
    roughness: 0.97,
    metalness: 0.0,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  scene.add(mesh);

  return mesh;
}
