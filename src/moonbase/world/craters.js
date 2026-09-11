import * as THREE from 'three';
import { CRATERS } from '../data/projects.js';
import { getTerrainHeight } from './terrain.js';

export function createCraterMarkers(scene, craters) {
  const markers = [];

  craters.forEach(crater => {
    if (crater.hidden) {
      // No visual marker, but still trackable for panel trigger
      markers.push({ crater, rimMat: null, markerMat: null });
      return;
    }

    // Rim glow ring — using TorusGeometry
    const rimGeo = new THREE.TorusGeometry(crater.radius, 0.5, 8, 80);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0,
      transparent: true,
      opacity: 0,
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;

    const y = getTerrainHeight(crater.x, crater.z, craters) + crater.depth * 0.05 + 0.3;
    rim.position.set(crater.x, y, crater.z);
    scene.add(rim);

    // Project number label — small sphere at center
    const markerGeo = new THREE.SphereGeometry(0.6, 12, 12);
    const markerMat = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0,
    });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    const yCenter = getTerrainHeight(crater.x, crater.z, craters) + 1;
    marker.position.set(crater.x, yCenter, crater.z);
    scene.add(marker);

    markers.push({ crater, rim, rimMat, marker, markerMat });
  });

  return markers;
}

export { CRATERS };
