const DEAD_ZONE  = 12; // px — ignore micro-drifts at rest
const MAX_RADIUS = 52; // px — half the ring diameter

export class RoverControls {
  constructor() {
    this.forward  = false;
    this.backward = false;
    this.left     = false;
    this.right    = false;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp   = this._onKeyUp.bind(this);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup',   this._onKeyUp);

    this._initJoystick();
  }

  _initJoystick() {
    const zone = document.getElementById('joystick-zone');
    const knob = document.getElementById('joystick-knob');
    if (!zone || !knob) return;

    zone.style.display = 'block';

    const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

    // Hide keyboard hint on touch devices
    if (isTouch) {
      const hint = document.getElementById('hud-controls');
      if (hint) hint.style.display = 'none';
    }

    let originX = 0, originY = 0;

    const setFromOffset = (dx, dy) => {
      const dist  = Math.sqrt(dx * dx + dy * dy);
      const clamp = Math.min(dist, MAX_RADIUS);
      const angle = Math.atan2(dy, dx);
      knob.style.transform = `translate(calc(-50% + ${Math.cos(angle) * clamp}px), calc(-50% + ${Math.sin(angle) * clamp}px))`;
      this.forward  = dy < -DEAD_ZONE;
      this.backward = dy >  DEAD_ZONE;
      this.left     = dx < -DEAD_ZONE;
      this.right    = dx >  DEAD_ZONE;
    };

    const reset = () => {
      knob.style.transform = 'translate(-50%, -50%)';
      zone.classList.remove('active');
      this.forward = this.backward = this.left = this.right = false;
    };

    const getCenter = () => {
      const rect = zone.getBoundingClientRect();
      originX = rect.left + rect.width  / 2;
      originY = rect.top  + rect.height / 2;
    };

    // ── Touch ──
    let activeTouchId = null;
    zone.addEventListener('touchstart', e => {
      e.preventDefault();
      if (activeTouchId !== null) return;
      const t = e.changedTouches[0];
      activeTouchId = t.identifier;
      getCenter();
      zone.classList.add('active');
      setFromOffset(t.clientX - originX, t.clientY - originY);
    }, { passive: false });

    zone.addEventListener('touchmove', e => {
      e.preventDefault();
      const t = [...e.changedTouches].find(t => t.identifier === activeTouchId);
      if (!t) return;
      setFromOffset(t.clientX - originX, t.clientY - originY);
    }, { passive: false });

    zone.addEventListener('touchend',    e => { if ([...e.changedTouches].some(t => t.identifier === activeTouchId)) { activeTouchId = null; reset(); } }, { passive: false });
    zone.addEventListener('touchcancel', e => { if ([...e.changedTouches].some(t => t.identifier === activeTouchId)) { activeTouchId = null; reset(); } }, { passive: false });

    // ── Mouse ──
    let mouseDown = false;
    zone.addEventListener('mousedown', e => {
      mouseDown = true;
      getCenter();
      zone.classList.add('active');
      setFromOffset(e.clientX - originX, e.clientY - originY);
    });
    window.addEventListener('mousemove', e => {
      if (!mouseDown) return;
      setFromOffset(e.clientX - originX, e.clientY - originY);
    });
    window.addEventListener('mouseup', () => {
      if (!mouseDown) return;
      mouseDown = false;
      reset();
    });
  }

  _onKeyDown(e) {
    // Prevent arrow keys scrolling the page
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
      e.preventDefault();
    }
    switch (e.key) {
      case 'w': case 'W': case 'ArrowUp':    this.forward  = true; break;
      case 's': case 'S': case 'ArrowDown':  this.backward = true; break;
      case 'a': case 'A': case 'ArrowLeft':  this.left     = true; break;
      case 'd': case 'D': case 'ArrowRight': this.right    = true; break;
    }
  }

  _onKeyUp(e) {
    switch (e.key) {
      case 'w': case 'W': case 'ArrowUp':    this.forward  = false; break;
      case 's': case 'S': case 'ArrowDown':  this.backward = false; break;
      case 'a': case 'A': case 'ArrowLeft':  this.left     = false; break;
      case 'd': case 'D': case 'ArrowRight': this.right    = false; break;
    }
  }

  get isMoving() {
    return this.forward || this.backward;
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup',   this._onKeyUp);
  }
}
