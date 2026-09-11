const overlay  = document.getElementById('contact-overlay');
const closeBtn = document.getElementById('contact-close');
const form     = document.getElementById('contact-form');

export class ContactOverlay {
  constructor() {
    this._visible = false;
    this._dismissed = false;
    closeBtn.addEventListener('click', () => { this._dismissed = true; this.hide(); });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const data = new FormData(form);

      btn.textContent = '… TRANSMITTING';
      btn.disabled = true;

      try {
        const res = await fetch('https://formspree.io/f/xrevveng', {
          method: 'POST',
          body: data,
          headers: { Accept: 'application/json' },
        });
        if (res.ok) {
          btn.textContent = '✓ TRANSMITTED';
          btn.style.background = '#00ff88';
          form.reset();
          setTimeout(() => {
            btn.textContent = '⬆ TRANSMIT';
            btn.style.background = '';
            btn.disabled = false;
            this._dismissed = true;
            this.hide();
          }, 2000);
        } else {
          throw new Error('rejected');
        }
      } catch {
        btn.textContent = '✕ TRANSMISSION FAILED';
        btn.style.color = '#ff4444';
        setTimeout(() => {
          btn.textContent = '⬆ TRANSMIT';
          btn.style.color = '';
          btn.disabled = false;
        }, 2500);
      }
    });
  }

  show() {
    if (this._visible || this._dismissed) return;
    this._visible = true;
    overlay.classList.remove('hidden');
  }

  hide() {
    this._visible = false;
    overlay.classList.add('hidden');
  }

  // Called when player drives away — allow re-opening on next approach
  resetDismiss() { this._dismissed = false; }

  get visible() { return this._visible; }
}
