/**
 * Rover engine hum using Web Audio API.
 * No audio files — pure oscillators layered with a lowpass filter.
 * AudioContext is deferred until first keypress (browser autoplay policy).
 */
export class RoverAudio {
  constructor() {
    this._ready = false;
    this._ctx   = null;
    this._osc1  = null; // fundamental — sawtooth
    this._osc2  = null; // octave up — square, adds texture
    this._osc3  = null; // sub rumble — sine
    this._filter = null;
    this._gain  = null;

    // Bootstrap on first user gesture (keydown on desktop, touchstart on mobile)
    const init = () => {
      this._init();
      window.removeEventListener('keydown',   init);
      window.removeEventListener('touchstart', init);
    };
    window.addEventListener('keydown',   init);
    window.addEventListener('touchstart', init, { passive: true });
  }

  _init() {
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return; // audio not supported
    }

    // iOS requires playing a silent buffer AND calling resume() inside the
    // user-gesture stack before any real audio will come through.
    const silentBuf = this._ctx.createBuffer(1, 1, 22050);
    const silentSrc = this._ctx.createBufferSource();
    silentSrc.buffer = silentBuf;
    silentSrc.connect(this._ctx.destination);
    silentSrc.start(0);
    this._ctx.resume();

    // Sub rumble — raised to be audible on phone speakers
    this._osc3 = this._ctx.createOscillator();
    this._osc3.type = 'sine';
    this._osc3.frequency.value = 80;

    // Fundamental hum
    this._osc1 = this._ctx.createOscillator();
    this._osc1.type = 'sawtooth';
    this._osc1.frequency.value = 140;

    // Harmonic texture
    this._osc2 = this._ctx.createOscillator();
    this._osc2.type = 'square';
    this._osc2.frequency.value = 280;

    // Lowpass — keeps it mechanical, not electronic
    this._filter = this._ctx.createBiquadFilter();
    this._filter.type = 'lowpass';
    this._filter.frequency.value = 700;
    this._filter.Q.value = 2.5;

    // Gain node
    this._gain = this._ctx.createGain();
    this._gain.gain.value = 0;

    // Routing: all osc → filter → gain → output
    this._osc1.connect(this._filter);
    this._osc2.connect(this._filter);
    this._osc3.connect(this._filter);
    this._filter.connect(this._gain);
    this._gain.connect(this._ctx.destination);

    this._osc1.start();
    this._osc2.start();
    this._osc3.start();
    this._ready = true;
  }

  update(speed) {
    if (!this._ready || this._muted) return;

    const abs = Math.abs(speed);
    const now = this._ctx.currentTime;

    // Volume: idle hum at rest, louder when moving
    const targetGain = abs > 0.3
      ? Math.min(0.05 + abs / 200, 0.09)
      : 0.018;
    this._gain.gain.setTargetAtTime(targetGain, now, 0.25);

    // Pitch rises quickly at low speed then plateaus — stays grumbly at high speed
    const pitchCurve = Math.log1p(abs * 0.7) * 40;
    const f1 = 140 + pitchCurve;
    const f2 = f1 * 2;
    const f3 = 80 + pitchCurve * 0.4;
    this._osc1.frequency.setTargetAtTime(f1, now, 0.5);
    this._osc2.frequency.setTargetAtTime(f2, now, 0.5);
    this._osc3.frequency.setTargetAtTime(f3, now, 0.7);

    // Filter opens with speed
    const fc = 500 + abs * 30;
    this._filter.frequency.setTargetAtTime(fc, now, 0.3);
  }

  toggleMute() {
    if (!this._ready) return;
    this._muted = !this._muted;
    const now = this._ctx.currentTime;
    this._gain.gain.setTargetAtTime(this._muted ? 0 : 0.018, now, 0.1);
    return this._muted;
  }
}
