const UNLOCKED = new Set();

const DEFS = {
  airborne:          { title: 'One Small Leap',      desc: '5 seconds airborne' },
  speed_demon:       { title: 'Speed Demon',          desc: 'Hit maximum speed' },
  explorer:          { title: 'Explorer',             desc: 'Found the secret crater' },
  commander:         { title: 'Commander',            desc: 'Welcome home' },
  homesick:          { title: 'Homesick',             desc: 'Left the rover idle for 60 seconds' },
  crater_hopper:     { title: 'Crater Hopper',        desc: 'Visited every project crater' },
  hard_landing:      { title: 'Hard Landing',         desc: 'Survived a rough touchdown' },
  circumnavigation:  { title: 'Circumnavigation',     desc: 'Drove 1,200m across the surface' },
  pale_blue_dot:     { title: 'Pale Blue Dot',        desc: 'Got as close to Earth as possible' },
  here_be_dragons:   { title: 'Here Be Dragons',      desc: 'Reached the edge of the known world' },
  flat_mooner:       { title: 'Flat Mooner',          desc: 'Touched all four edges of the map' },
  back_to_base:      { title: 'Back to Base',         desc: 'Ventured far and made it home' },
  liftoff:           { title: 'Liftoff',              desc: 'Caught 2+ seconds of air 10 times' },
  kickin_up_dust:    { title: 'Kickin\' Up Dust',     desc: 'Full speed for 20 consecutive seconds' },
  wrong_way:         { title: 'Wrong Way',            desc: 'Reversed for 5 seconds straight' },
  abducted:          { title: 'Take Me to Your Leader', desc: 'Survived an alien abduction' },
};

const container = document.createElement('div');
container.id = 'achievement-container';
document.body.appendChild(container);

export function unlock(id) {
  if (UNLOCKED.has(id)) return;
  UNLOCKED.add(id);
  const def = DEFS[id];
  if (!def) return;

  const toast = document.createElement('div');
  toast.className = 'achievement-toast';
  toast.innerHTML = `
    <div class="toast-tag">◈ ACHIEVEMENT UNLOCKED</div>
    <div class="toast-title">${def.title}</div>
    <div class="toast-desc">${def.desc}</div>
  `;
  container.appendChild(toast);

  // Trigger fade-out then remove
  setTimeout(() => toast.classList.add('toast-fade'), 3400);
  setTimeout(() => toast.remove(), 4000);
}
