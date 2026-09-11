import * as THREE from 'three';
import { LANDMARK_DEFS } from '../data/landmarkDefs.js';
import { CRATERS } from '../data/projects.js';

const el = document.getElementById('proximity-label');
const _v3 = new THREE.Vector3();

// Collect all things with labels
const ALL_LABELS = [
  ...LANDMARK_DEFS.map(l => ({ id: l.id, x: l.x, z: l.z, label: l.label, radius: l.proximityRadius })),
  ...CRATERS.map(c => ({ id: c.id, x: c.x, z: c.z, label: `◈ ${c.project.name.toUpperCase()}`, radius: c.radius * 0.9 })),
];

export class ProximityLabel {
  constructor(camera) {
    this._camera = camera;
    this._current = null;
  }

  update(roverPos, landmarkGroups) {
    let closest = null;
    let closestDist = Infinity;

    ALL_LABELS.forEach(item => {
      const dx = roverPos.x - item.x;
      const dz = roverPos.z - item.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < item.radius && dist < closestDist) {
        closestDist = dist;
        closest = item;
      }
    });

    if (closest) {
      // Find world-space Y of the group
      let labelY = 12;
      if (landmarkGroups && landmarkGroups[closest.id]) {
        labelY = landmarkGroups[closest.id].position.y + 18;
      }

      _v3.set(closest.x, labelY, closest.z);
      _v3.project(this._camera);

      const x = (_v3.x *  0.5 + 0.5) * window.innerWidth;
      const y = (_v3.y * -0.5 + 0.5) * window.innerHeight;

      // Only show if in front of camera
      if (_v3.z < 1) {
        el.style.left = `${x}px`;
        el.style.top  = `${y}px`;
        el.textContent = closest.label;
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    } else {
      el.classList.add('hidden');
    }
  }
}
