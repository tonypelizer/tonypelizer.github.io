import * as THREE from 'three';

export function createScene() {
  const scene = new THREE.Scene();
  // Horizon fog — dark blue-grey matching the void
  scene.fog = new THREE.Fog(0x050810, 180, 500);
  scene.background = new THREE.Color(0x000005);
  return scene;
}
