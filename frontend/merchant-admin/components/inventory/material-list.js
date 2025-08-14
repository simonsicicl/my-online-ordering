// Material list and filter component for merchant admin system

import './material-editor.js';

class MaterialList extends HTMLElement {
  constructor() {
    super();
    this._materials = [];
    this._lastIsMobile = undefined;
  }

  // --- Getters and Setters ---
  set materials(data) { this._materials = data || []; }
  get materials() { return this._materials || []; }

  // --- Lifecycle methods ---
  /**
   * Called when the element is added to the DOM.
   */
  connectedCallback() {
    this.render();
    this.renderTable();
    window.addEventListener('resize', this.handleResize());
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this.handleResize());
  }

  // --- Render root ---
  render() {
    this.innerHTML = this.getHTML();
    const addBtn = this.querySelector('.new-btn');
    if (addBtn) addBtn.onclick = () => this.handleAddClick();
  }

  // --- Render table/content area ---
  renderTable() {
    const container = this.querySelector('#table');
    if (!container) return;

    if (!this.materials || this.materials.length === 0) {
      container.innerHTML = '<p>No materials found.</p>';
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
        card.onclick = () => this.handleEditClick({ dataset: { id: card.dataset.id } });
      });
    }

    container.innerHTML = '';
    container.appendChild(table);
  }

  // --- Events ---
  handleAddClick() {
    const modal = document.createElement('material-editor');
    this.appendChild(modal);
  }

  handleEditClick(btn) {
    const material_id = Number(btn.dataset.id);
    const m = this.materials.find(x => Number(x.material_id) === material_id);
    const modal = document.createElement('material-editor');
    modal.material = m || {};
    this.appendChild(modal);
  }

  handleResize() {
    if (this._lastIsMobile !== (window.innerWidth <= 768)) {
      this.renderTable();
    }
  }

  // --- HTML builders ---
  getHTML() {
    return `
      <div class="list-header">
        <h2>Material List</h2>
        <div>
          <button type="button" class="new-btn"><span>+ New Material</span></button>
        </div>
      </div>
      <div id="table"></div>
    `;
  }

  getTableHTML() {
    if (window.innerWidth <= 768) 
      return this.getMobileTableHTML();
    else
      return this.getDesktopTableHTML();
  }

  getDesktopTableHTML() {
    return `
      <thead>
        <tr>
          <th class="col-id">ID</th>
          <th class="col-name">Name</th>
          <th class="col-unit">Unit</th>
          <th class="col-stock text-right">Stock</th>
          <th class="col-min-alert text-right">Min Alert</th>
          <th class="col-status">Status</th>
          <th class="col-actions">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${(this.materials || []).map(m => this.getDesktopRowHTML(m)).join('')}
      </tbody>
    `;
  }

  getDesktopRowHTML(m) {
    const fmt = (n) => (n === null || n === undefined || isNaN(Number(n)) ? '-' : Number(n).toLocaleString());
    return `
      <tr data-id="${m.material_id}">
        <td class="col-id" data-label="ID">${m.material_id ?? '-'}</td>
        <td class="col-name" data-label="Name">${m.name || ''}</td>
        <td class="col-unit" data-label="Unit">${m.unit || ''}</td>
        <td class="col-stock text-right" data-label="Stock">${fmt(m.stock_quantity)}</td>
        <td class="col-min-alert text-right" data-label="Min Alert">${fmt(m.min_stock_alert)}</td>
        <td class="col-status" data-label="Status"><span class="status ${m.is_active!==false?'status-active':'status-inactive'}">${m.is_active!==false?'Active':'Inactive'}</span></td>
        <td class="col-actions" data-label="Actions">
          <button data-id="${m.material_id}" type="button" class="action-btn edit-btn">Edit</button>
        </td>
      </tr>
    `;
  }

  // Mobile card layout similar to menu-list product cards
  getMobileTableHTML() {
    const fmt = (n) => (n === null || n === undefined || isNaN(Number(n)) ? '-' : Number(n).toLocaleString());
    return `
      <tbody>
        ${(this.materials || []).map(m => `
          <tr class="has-card">
            <td colspan="7" style="padding:0;">
              <div class="card" data-id="${m.material_id}">
                <div class="card-info">
                  <div class="card-row">
                    <div class="card-main">
                      <div class="card-title">
                        ${m.name || ''}
                        <span class="status ${m.is_active!==false?'status-active':'status-inactive'}">${m.is_active!==false?'Active':'Inactive'}</span>
                      </div>
                      <div class="card-meta">
                        <span class="card-unit">Unit: ${m.unit || '-'}</span>
                      </div>
                    </div>
                    <div class="card-side">
                      <div class="card-stock">${fmt(m.stock_quantity)} ${m.unit || ''}</div>
                      <div class="card-min">Min: ${fmt(m.min_stock_alert)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    `;
  }
}

customElements.define('material-list', MaterialList);