// Inventory movement records component for merchant admin system

import './movement-editor.js';

class MovementsList extends HTMLElement {
  constructor() {
    super();
    this._movements = [];
    this._materials = [];
    this._lastIsMobile = undefined;
  }
  
  // --- Getters and Setters ---
  set movements(data) { this._movements = data || []; this.renderTable(); }
  get movements() { return this._movements || []; }

  set materials(data) { this._materials = data || []; }
  get materials() { return this._materials || []; }

  // --- Lifecycle methods ---
  connectedCallback() {
    this.render();
    this.renderTable();
    window.addEventListener('resize', () => this.handleResize());
  }

  disconnectedCallback() {
    window.removeEventListener('resize', () => this.handleResize());
  }

  // --- Render ---
  render() {
    this.innerHTML = this.getHTML();

    const addBtn = this.querySelector('.new-btn');
    if (addBtn) addBtn.onclick = () => this.handleAddClick();
  }

  renderTable() {
    const container = this.querySelector('#table');
    if (!container) return;

    if (!this.movements || this.movements.length === 0) {
      container.innerHTML = '<p>No movements.</p>';
      return;
    }

    const table = document.createElement('table');
    table.innerHTML = this.getTableHTML();

    table.querySelectorAll('.edit-btn').forEach(btn => {
      btn.onclick = () => this.handleEditClick(btn);
    });

    this._lastIsMobile = window.innerWidth <= 768;
    if (this._lastIsMobile) {
      table.querySelectorAll('.card').forEach(card => {
        card.onclick = () => this.handleEditClick(card);
      });
    }

    container.innerHTML = '';
    container.appendChild(table);
  }

  // --- Event Handlers ---
  handleAddClick() {
    const modal = document.createElement('movement-editor');
    this.appendChild(modal);
  }

  handleEditClick(btn) {
    const movement_id = Number(btn.dataset.id);
    const modal = document.createElement('movement-editor');
    modal.materials = this.materials;
    modal.movement = this.movements.find(m => m.movement_id === movement_id);
    modal.movementId = movement_id;
    this.appendChild(modal);
  }

  handleResize() {
    const now = window.innerWidth <= 768;
    if (this._lastIsMobile !== now) this.renderTable();
  }

  // --- Utility Methods ---
  getMaterialName(id) {
    return this.materials.find(m => m.material_id === id)?.name || `#${id}`;
  }

  // --- HTML Templates ---
  getHTML() {
    return `
      <div class="list-header">
        <h2>Movements</h2>
        <div>
          <button type="button" class="new-btn"><span>New Movement</span></button>
        </div>
      </div>
      <div id="table"></div>
    `;
  }

  getTableHTML() {
    if (window.innerWidth <= 768) {
      return this.getMobileTableHTML();
    } else {
      return this.getDesktopTableHTML();
    }
  }

  getDesktopTableHTML() {
    const rows = (this.movements || []).map(m => this.getTableRowHTML(m)).join('');
    return `
      <thead>
        <tr>
          <th class="col-id">ID</th>
          <th class="col-material">Material</th>
          <th class="col-type">Type</th>
          <th class="col-qty text-right">Qty</th>
          <th class="col-note">Note</th>
          <th class="col-at">At</th>
          <th class="col-actions">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    `;
  }

  getMobileTableHTML() {
    const fmt = (n) => (n === null || n === undefined || isNaN(Number(n)) ? '-' : Number(n).toLocaleString());
    return `
      <tbody>
        ${(this.movements || []).map(movement => `
          <tr class="has-card">
            <td colspan="6" style="padding:0;">
              <div class="card" data-id="${movement.movement_id}">
                <div class="card-info">
                  <div class="card-title">${this.getMaterialName(movement.material_id)} <span style="color:#888;">(#${movement.material_id})</span></div>
                  <div class="card-row" style="display:flex; gap:10px;">
                    <div>Type: ${movement.movement_type || '-'}</div>
                    <div>Qty: ${fmt(movement.quantity)}</div>
                  </div>
                  <div class="card-meta">${movement.note ? 'Note: ' + movement.note : ''}</div>
                  <div class="card-meta">At: ${movement.created_at || ''}</div>
                </div>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    `;
  }

  getTableRowHTML(movement) {
    const fmt = (n) => (n === null || n === undefined || isNaN(Number(n)) ? '-' : Number(n).toLocaleString());
    return `
      <tr>
        <td class="col-id" data-label="ID">${movement.movement_id ?? '-'}</td>
        <td class="col-material" data-label="Material">${this.getMaterialName(movement.material_id)} <span style="color:#888;">(#${movement.material_id})</span></td>
        <td class="col-type" data-label="Type">${movement.movement_type || '-'}</td>
        <td class="col-qty text-right" data-label="Qty">${fmt(movement.quantity)}</td>
        <td class="col-note" data-label="Note">${movement.note || ''}</td>
        <td class="col-at" data-label="At">${movement.created_at || ''}</td>
        <td class="col-actions" data-label="Actions">
          <button data-id="${movement.movement_id}" type="button" class="action-btn edit-btn">Edit</button>
        </td>
      </tr>
    `;
  }
}

customElements.define('movements-list', MovementsList);