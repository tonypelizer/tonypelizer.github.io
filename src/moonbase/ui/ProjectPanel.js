const panel    = document.getElementById('project-panel');
const title    = document.getElementById('panel-title');
const desc     = document.getElementById('panel-desc');
const techEl   = document.getElementById('panel-tech');
const siteBtn  = document.getElementById('panel-site');
const codeBtn  = document.getElementById('panel-code');
const closeBtn = document.getElementById('panel-close');

export class ProjectPanel {
  constructor() {
    this._visible = false;
    this._activeCrater = null;
    closeBtn.addEventListener('click', () => this.hide());
  }

  show(crater) {
    if (this._activeCrater === crater.id && this._visible) return;
    this._activeCrater = crater.id;
    this._visible = true;

    const p = crater.project;
    title.textContent = p.name;
    desc.textContent  = p.desc;

    techEl.innerHTML = p.tech
      .map(t => `<span class="tech-tag">${t}</span>`)
      .join('');

    siteBtn.href = p.site ?? '#';
    codeBtn.href = p.code ?? '#';
    siteBtn.style.display = p.site ? '' : 'none';
    codeBtn.style.display = p.code ? '' : 'none';

    panel.classList.remove('hidden');
  }

  hide() {
    this._visible = false;
    this._activeCrater = null;
    panel.classList.add('hidden');
  }

  get visible() { return this._visible; }
  get activeCrater() { return this._activeCrater; }
}
