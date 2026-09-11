export const LANDMARK_DEFS = [
  {
    id: 'habitat',
    x: 0, z: 0,
    type: 'habitat',
    label: '◈ MAIN HABITAT',
    proximityRadius: 35,
  },
  {
    id: 'comms',
    x: -55, z: 35,
    type: 'comms',
    label: '◈ COMMS TOWER',
    proximityRadius: 30,
    action: 'contact',
  },
  {
    id: 'solar',
    x: 55, z: -45,
    type: 'solar',
    label: '◈ SOLAR ARRAY',
    proximityRadius: 30,
  },
  {
    id: 'observatory',
    x: 40, z: 50,
    type: 'observatory',
    label: '◈ OBSERVATORY',
    proximityRadius: 25,
  },
  {
    id: 'landing',
    x: -45, z: -65,
    type: 'landing',
    label: '◈ LANDING PAD ALPHA',
    proximityRadius: 35,
  },
];
