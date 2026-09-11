import * as THREE from 'three';

import { createScene } from './core/scene.js';
import { createRenderer } from './core/renderer.js';
import { createLights } from './core/lights.js';

import { createTerrain, getTerrainHeight } from './world/terrain.js';
import { createStarfield } from './world/starfield.js';
import { createEarth } from './world/earth.js';
import { createLandmarks } from './world/landmarks.js';
import { createCraterMarkers } from './world/craters.js';
import { UFO } from './world/UFO.js';

import { CRATERS } from './data/projects.js';
import { LANDMARK_DEFS } from './data/landmarkDefs.js';

import { RoverMesh } from './rover/RoverMesh.js';
import { RoverControls } from './rover/RoverControls.js';
import { RoverPhysics } from './rover/RoverPhysics.js';
import { DustParticles } from './rover/DustParticles.js';
import { RoverAudio } from './rover/RoverAudio.js';

import { ProximityLabel } from './ui/ProximityLabel.js';
import { ProjectPanel } from './ui/ProjectPanel.js';
import { ContactOverlay } from './ui/ContactOverlay.js';
import { unlock } from './ui/Achievements.js';
import { RadarOverlay } from './ui/RadarOverlay.js';

// ─── Loading screen ───────────────────────────────────────────────────────────
const loadingScreen = document.getElementById('loading-screen');
const loadingFill = document.getElementById('loading-fill');
const loadingStatus = document.getElementById('loading-status');

// Swap hint text on touch devices
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
  const hint = document.getElementById('loading-hint');
  if (hint) hint.textContent = 'Use the joystick to drive';
}

function setProgress(pct, msg) {
  loadingFill.style.width = `${pct}%`;
  if (msg) loadingStatus.textContent = msg;
}

// ─── Core ────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('canvas');
const scene = createScene();
const renderer = createRenderer(canvas);
createLights(scene);

// ─── Camera ──────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(0, 14, 71);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ─── Camera raycaster ─────────────────────────────────────────────────────────
const _camRay = new THREE.Raycaster();
const _camRayDir = new THREE.Vector3(0, -1, 0);
const _camRayOri = new THREE.Vector3();

// ─── Camera lerp state ───────────────────────────────────────────────────────
const _camTarget = new THREE.Vector3();
const _camLookAtCur = new THREE.Vector3();
const _camLookAtTgt = new THREE.Vector3();
let _idleTime = 0;
let _camZoom = 1; // multiplied onto dist/height for crater zoom-out

// ─── World ───────────────────────────────────────────────────────────────────
setProgress(10, 'Mapping lunar surface...');
const terrain = createTerrain(scene, CRATERS);

setProgress(35, 'Populating starfield...');
createStarfield(scene);

setProgress(50, 'Positioning Earth...');
const earthObj = createEarth(scene);

setProgress(65, 'Constructing base...');
const { groups: landmarkGroups, animate: animateLandmarks } = createLandmarks(
  scene,
  CRATERS,
);

setProgress(80, 'Marking impact craters...');
const craterMarkers = createCraterMarkers(scene, CRATERS);

// ─── Rover ───────────────────────────────────────────────────────────────────
setProgress(90, 'Deploying rover...');
const controls = new RoverControls();
const physics = new RoverPhysics();
const roverMesh = new RoverMesh(scene);
const dust = new DustParticles(scene);
const audio = new RoverAudio();
const ufo = new UFO(scene);
const radar = new RadarOverlay();

// Give physics the terrain mesh so it can raycast
physics.setTerrain(terrain);

// ─── UI ──────────────────────────────────────────────────────────────────────
const labelUI = new ProximityLabel(camera);
const panelUI = new ProjectPanel();
const contactUI = new ContactOverlay();

// ─── HUD ─────────────────────────────────────────────────────────────────────
const hudSpeed = document.getElementById('hud-speed-val');
const hudX = document.getElementById('hud-x');
const hudZ = document.getElementById('hud-z');
const muteBtn = document.getElementById('mute-btn');

function toggleMute() {
  const muted = audio.toggleMute();
  if (muted === undefined) return; // audio not init yet
  muteBtn.classList.toggle('muted', muted);
  muteBtn.textContent = muted ? '♪ MUTED' : '♪ AUDIO';
}
muteBtn.addEventListener('click', toggleMute);
window.addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') toggleMute();
});

const radarBtn = document.getElementById('radar-btn');
radarBtn.addEventListener('click', () => {
  const on = radar.toggle();
  radarBtn.textContent = on ? '◈ HIDE PROJECTS' : '◈ VIEW PROJECTS';
  radarBtn.classList.toggle('active', on);
});

// ─── Interaction state ───────────────────────────────────────────────────────
let activeCrater = null;

// ─── Achievement tracking state ───────────────────────────────────────────────
let _airtimeAccum = 0;
let _idleAccum = 0;
let _odometer = 0;
let _reverseAccum = 0;
let _fullSpeedAccum = 0;
let _airborneCount = 0;
let _wasAirborne = false;
let _maxDistFromBase = 0;
const _visitedCraters = new Set();
const _visitedEdges = new Set(); // 'north','south','east','west'

// ─── Crater check ────────────────────────────────────────────────────────────
function checkCraters(pos) {
  for (const marker of craterMarkers) {
    const { crater, rimMat, markerMat } = marker;
    const dx = pos.x - crater.x;
    const dz = pos.z - crater.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Rim glow peaks at the rim radius (hidden craters have no materials)
    if (rimMat && markerMat) {
      const tRim = Math.max(0, 1 - Math.abs(dist / crater.radius - 1) / 0.45);
      rimMat.emissiveIntensity = tRim * 1.8;
      rimMat.opacity = tRim * 0.75;
      markerMat.opacity = tRim * 0.5;
    }

    // Crater interior — project panel
    if (dist < crater.radius * 0.72) {
      if (activeCrater !== crater.id) {
        activeCrater = crater.id;
        _camZoom = 0.7;
        panelUI.show(crater);
        if (crater.hidden) {
          unlock('explorer');
        } else {
          _visitedCraters.add(crater.id);
          if (_visitedCraters.size >= 4) unlock('crater_hopper');
        }
      }
    } else if (activeCrater === crater.id) {
      activeCrater = null;
      _camZoom = 1;
      panelUI.hide();
    }
  }
}

// ─── Landmark check ───────────────────────────────────────────────────────────
function checkLandmarks(pos) {
  for (const def of LANDMARK_DEFS) {
    if (def.action !== 'contact') continue;
    const dx = pos.x - def.x;
    const dz = pos.z - def.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 18 && !contactUI.visible) contactUI.show();
    if (dist >= 18) {
      if (contactUI.visible) contactUI.hide();
      contactUI.resetDismiss();
    }
  }
}

// ─── Camera update ───────────────────────────────────────────────────────────
const CAM_DIST_NORMAL = 16;
const CAM_DIST_IDLE = 25;
const CAM_H_NORMAL = 8;
const CAM_H_IDLE = 13;

function updateCamera(dt, phys, terrainMesh) {
  // Track how long the rover has been still
  if (phys.isMoving) {
    _idleTime = 0;
  } else {
    _idleTime = Math.min(_idleTime + dt, 4);
  }
  const idleFrac = _idleTime / 3.5;

  // Zoom multiplier from crater entry
  const zoomTarget = _camZoom;
  const dist =
    THREE.MathUtils.lerp(CAM_DIST_NORMAL, CAM_DIST_IDLE, idleFrac) / zoomTarget;
  const height =
    THREE.MathUtils.lerp(CAM_H_NORMAL, CAM_H_IDLE, idleFrac) / zoomTarget;

  // Camera trails behind rover heading
  _camTarget.set(
    phys.position.x - Math.sin(phys.heading) * dist,
    phys.position.y + height,
    phys.position.z - Math.cos(phys.heading) * dist,
  );

  // Terrain clip prevention — push camera above any ground it would penetrate
  _camRayOri.set(_camTarget.x, _camTarget.y + 8, _camTarget.z);
  _camRay.set(_camRayOri, _camRayDir);
  _camRay.far = 20;
  const camGroundHits = _camRay.intersectObject(terrainMesh, false);
  if (camGroundHits.length > 0) {
    const minY = camGroundHits[0].point.y + 2.5;
    if (_camTarget.y < minY) _camTarget.y = minY;
  }

  // Smooth follow — looser lag when fast, snappier when idle
  const lag = THREE.MathUtils.lerp(4.5, 2.0, idleFrac);
  camera.position.lerp(_camTarget, Math.min(1, dt * lag));

  // Look-at — slight look-ahead while moving
  const lookAhead = phys.speedAbs * 0.28;
  _camLookAtTgt.set(
    phys.position.x + Math.sin(phys.heading) * lookAhead,
    phys.position.y + 1.6,
    phys.position.z + Math.cos(phys.heading) * lookAhead,
  );
  _camLookAtCur.lerp(_camLookAtTgt, Math.min(1, dt * 6));
  camera.lookAt(_camLookAtCur);
}

// ─── Main loop ───────────────────────────────────────────────────────────────
let lastTime = performance.now();

function tick(timestamp) {
  requestAnimationFrame(tick);

  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  // Lift rover during abduction before physics runs
  if (ufo.shouldLiftRover) physics.verticalVelocity = 10;

  // Physics
  physics.update(dt, controls);

  // Sync mesh
  roverMesh.syncFromPhysics(physics, dt);

  // ── Achievement tracking ──────────────────────────────────────────────────
  // Airborne time — accumulates while in air, checked on landing
  if (physics.airborne) {
    _airtimeAccum += dt;
    if (_airtimeAccum >= 5) unlock('airborne');
  } else {
    if (_wasAirborne && _airtimeAccum >= 2) {
      _airborneCount++;
      if (_airborneCount >= 10) unlock('liftoff');
    }
    _airtimeAccum = 0;
  }
  _wasAirborne = physics.airborne;
  // Speed demon + Kickin' Up Dust
  if (physics.speedAbs >= 27.5) {
    unlock('speed_demon');
    _fullSpeedAccum += dt;
    if (_fullSpeedAccum >= 20) unlock('kickin_up_dust');
  } else {
    _fullSpeedAccum = 0;
  }
  // Hard landing
  if (physics.landingImpact > 1.5) unlock('hard_landing');
  // Idle
  if (!physics.isMoving) {
    _idleAccum += dt;
    _ufoIdleTimer += dt;
    if (_idleAccum >= 60) unlock('homesick');
    if (_ufoIdleTimer >= 120 && !_ufoVisitDone && !ufo.isActive) {
      _ufoVisitDone = true;
      ufo.startIdleVisit();
    }
  } else {
    _idleAccum = 0;
    _ufoIdleTimer = 0;
  }
  // Odometer
  _odometer += physics.speedAbs * dt;
  if (_odometer >= 1200) unlock('circumnavigation');

  // Wrong Way — reverse for 5 consecutive seconds
  if (physics.speed < -0.5) {
    _reverseAccum += dt;
    if (_reverseAccum >= 5) unlock('wrong_way');
  } else {
    _reverseAccum = 0;
  }

  // Flat Mooner — touch all four edges (within 30 of boundary)
  const px = physics.position.x,
    pz = physics.position.z;
  if (px > 258) _visitedEdges.add('east');
  if (px < -258) _visitedEdges.add('west');
  if (pz > 258) _visitedEdges.add('north');
  if (pz < -258) _visitedEdges.add('south');
  if (_visitedEdges.size === 4) unlock('flat_mooner');

  // Back to Base — venture 500m out then return within 10 of origin
  const _distFromBase = Math.sqrt(px * px + pz * pz);
  if (_distFromBase > _maxDistFromBase) _maxDistFromBase = _distFromBase;
  if (_maxDistFromBase >= 500 && _distFromBase < 10) unlock('back_to_base');

  // Pale Blue Dot — closest point on the map to Earth (200, -420)
  const _dx = physics.position.x - 200;
  const _dz = physics.position.z - -288;
  if (Math.sqrt(_dx * _dx + _dz * _dz) < 40) unlock('pale_blue_dot');

  // Here Be Dragons — any corner where both axes exceed 260
  if (Math.abs(physics.position.x) > 260 && Math.abs(physics.position.z) > 260)
    unlock('here_be_dragons');

  // Particles & audio
  dust.update(dt, physics);
  if (physics.landingImpact > 1.5) {
    dust.burst(
      physics.position.x,
      physics.position.y,
      physics.position.z,
      physics.landingImpact,
    );
  }
  audio.update(physics.speed);

  // Camera
  updateCamera(dt, physics, terrain);

  // World animations
  animateLandmarks(dt);
  earthObj.animate();
  ufo.update(dt, timestamp / 1000, physics);
  radar.update(dt, physics.position, physics.heading);

  // Interaction
  checkCraters(physics.position);
  checkLandmarks(physics.position);
  labelUI.update(physics.position, landmarkGroups);

  // HUD
  hudSpeed.textContent = physics.speedAbs.toFixed(1);
  hudX.textContent = Math.round(physics.position.x);
  hudZ.textContent = Math.round(physics.position.z);

  renderer.render(scene, camera);
}

// ─── Abduction flash element ──────────────────────────────────────────────────
const abductionFlash = document.getElementById('abduction-flash');
function triggerFlash() {
  abductionFlash.classList.add('active');
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      abductionFlash.classList.remove('active');
    }),
  );
}

// ─── UFO idle visit tracker ───────────────────────────────────────────────────
let _ufoIdleTimer = 0;
let _ufoVisitDone = false; // only visit once per page load so it stays special

// ─── Konami code → abduction ──────────────────────────────────────────────────
const KONAMI = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
];
let _konamiBuffer = [];
window.addEventListener('keydown', (e) => {
  _konamiBuffer.push(e.key);
  if (_konamiBuffer.length > KONAMI.length) _konamiBuffer.shift();
  if (_konamiBuffer.join() === KONAMI.join() && !ufo.isAbducting) {
    _konamiBuffer = [];
    ufo.startAbduction(physics, () => {
      // Midpoint: flash + teleport + achievement
      triggerFlash();
      unlock('abducted');
      setTimeout(() => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * 150;
        physics.position.set(
          Math.cos(angle) * dist,
          40,
          Math.sin(angle) * dist,
        );
        physics.speed = 0;
        physics.verticalVelocity = 0;
      }, 120);
    });
  }
});

// ─── Easter egg: type "TONY" ─────────────────────────────────────────────────
const commanderMsg = document.getElementById('commander-msg');
const _FIREWORK_COLORS = [
  0xff4444, 0x44ff88, 0xffcc33, 0xff66ff, 0x33ddff, 0xffffff,
];

function launchFireworks() {
  const habitatY = getTerrainHeight(0, 0, CRATERS) + 9;
  const COUNT = 160;
  const positions = new Float32Array(COUNT * 3);
  const colorArr = new Float32Array(COUNT * 3);
  const vels = [];

  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = 0;
    positions[i * 3 + 1] = habitatY;
    positions[i * 3 + 2] = 0;

    const angle = Math.random() * Math.PI * 2;
    const elev = ((0.25 + Math.random() * 0.75) * Math.PI) / 2;
    const spd = 5 + Math.random() * 14;
    vels.push({
      x: Math.cos(angle) * Math.cos(elev) * spd,
      y: Math.sin(elev) * spd,
      z: Math.sin(angle) * Math.cos(elev) * spd,
    });

    const c = new THREE.Color(_FIREWORK_COLORS[i % _FIREWORK_COLORS.length]);
    colorArr[i * 3] = c.r;
    colorArr[i * 3 + 1] = c.g;
    colorArr[i * 3 + 2] = c.b;
  }

  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr);
  geo.setAttribute('color', new THREE.BufferAttribute(colorArr, 3));

  const mat = new THREE.PointsMaterial({
    size: 2.2,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    sizeAttenuation: true,
    fog: false,
    blending: THREE.AdditiveBlending,
  });

  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  scene.add(pts);

  const DURATION = 4;
  let elapsed = 0,
    last = performance.now();

  (function step(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    elapsed += dt;
    if (elapsed > DURATION) {
      scene.remove(pts);
      geo.dispose();
      mat.dispose();
      return;
    }

    mat.opacity = Math.pow(1 - elapsed / DURATION, 1.5);
    for (let i = 0; i < COUNT; i++) {
      vels[i].y -= 1.6 * dt;
      positions[i * 3] += vels[i].x * dt;
      positions[i * 3 + 1] += vels[i].y * dt;
      positions[i * 3 + 2] += vels[i].z * dt;
    }
    posAttr.needsUpdate = true;
    requestAnimationFrame(step);
  })(performance.now());

  unlock('commander');

  // HUD message
  commanderMsg.textContent = '◈ WELCOME HOME, COMMANDER PELIZER ◈';
  commanderMsg.classList.remove('hidden');
  setTimeout(() => commanderMsg.classList.add('hidden'), 3500);
}

// Key-sequence detector — listens for T-O-N-Y
let _keyBuffer = '';
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  _keyBuffer = (_keyBuffer + e.key.toUpperCase()).slice(-4);
  if (_keyBuffer === 'TONY') {
    _keyBuffer = '';
    launchFireworks();
  }
});

// ─── Init ────────────────────────────────────────────────────────────────────
async function init() {
  const steps = [
    [95, 'Calibrating instruments...'],
    [100, 'Touchdown confirmed.'],
  ];
  for (const [pct, msg] of steps) {
    setProgress(pct, msg);
    await new Promise((r) => setTimeout(r, 380));
  }
  await new Promise((r) => setTimeout(r, 550));

  loadingScreen.classList.add('fade-out');
  setTimeout(() => {
    loadingScreen.style.display = 'none';
  }, 900);

  requestAnimationFrame(tick);
}

init();
