import { CRATERS } from '../data/projects.js';

const VISIBLE_CRATERS = CRATERS.filter(c => !c.hidden);
const RING_RADIUS = 58; // px — just outside the joystick ring (zone is 140px, center at 70px)
const DOT_RADIUS  = 5;
const FADE_DIST   = 30; // world units — dot fades when this close to crater

export class RadarOverlay {
  constructor() {
    this._active = false;

    const zone = document.getElementById('joystick-zone');
    this._canvas = document.createElement('canvas');
    this._canvas.width  = 140;
    this._canvas.height = 140;
    Object.assign(this._canvas.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      borderRadius: '50%',
    });
    zone.appendChild(this._canvas);
    this._ctx = this._canvas.getContext('2d');

    // Blink timer
    this._blink = 0;
  }

  toggle() {
    this._active = !this._active;
    if (!this._active) this._ctx.clearRect(0, 0, 140, 140);
    return this._active;
  }

  get active() { return this._active; }

  update(dt, roverPos, heading) {
    if (!this._active) return;

    this._blink += dt;
    const blinkOn = (this._blink % 1.0) < 0.55; // on 55% of the time

    const ctx = this._ctx;
    ctx.clearRect(0, 0, 140, 140);

    const cx = 70, cy = 70;

    VISIBLE_CRATERS.forEach((crater, i) => {
      const dx = crater.x - roverPos.x;
      const dz = crater.z - roverPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      // Fade out when close
      const alpha = Math.min(1, (dist - crater.radius) / FADE_DIST);
      if (alpha <= 0) return;

      // World angle to crater, adjusted for rover heading
      const worldAngle = Math.atan2(dx, dz); // atan2(x,z) because we want forward=up
      const localAngle = worldAngle - heading;

      const dotX = cx + Math.sin(localAngle) * RING_RADIUS;
      const dotY = cy - Math.cos(localAngle) * RING_RADIUS;

      // Outer glow pulse (always on, slower)
      const pulse = 0.5 + 0.5 * Math.sin(this._blink * 3 + i * 1.2);
      ctx.beginPath();
      ctx.arc(dotX, dotY, DOT_RADIUS + 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 60, 60, ${alpha * 0.25 * pulse})`;
      ctx.fill();

      // Core dot — blinks
      if (blinkOn) {
        ctx.beginPath();
        ctx.arc(dotX, dotY, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 60, 60, ${alpha * 0.9})`;
        ctx.fill();

        // Bright center
        ctx.beginPath();
        ctx.arc(dotX, dotY, DOT_RADIUS * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 180, 180, ${alpha})`;
        ctx.fill();
      }
    });
  }
}
