// Supplier list and editor launcher

import './supplier-editor.js';

class SupplierList extends HTMLElement {
  constructor() {
    super();
    this._suppliers = [];
    this._materials = [];
    this._lastIsMobile = undefined;
    this._onResize = () => this.handleResize();
  }

  set suppliers(data) { this._suppliers = data || []; this.renderTable(); }
  set materials(data) { this._materials = data || []; }
  get suppliers() { return this._suppliers || []; }
  get materials() { return this._materials || []; }

  connectedCallback() {
    this.render();
    this.renderTable();
    window.addEventListener('resize', () => this.handleResize());
  }

  disconnectedCallback() {
    window.removeEventListener('resize', () => this.handleResize());
  }

  render() {
    this.innerHTML = this.getHTML();

    const addBtn = this.querySelector('.new-btn');
    if (addBtn) addBtn.onclick = () => this.handleAddClick();
  }

  renderTable() {
    const container = this.querySelector('#table');
    if (!container) return;

    if (!this.suppliers || this.suppliers.length === 0) {
      container.innerHTML = '<p>No suppliers.</p>';
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

  handleAddClick() {
    const modal = document.createElement('supplier-editor');
    this.appendChild(modal);
  }

  handleEditClick(btn) {
    const id = Number(btn.dataset.id);
    const modal = document.createElement('supplier-editor');
    modal.supplier = this.suppliers.find(s => Number(s.supplier_id) === id) || null;
    modal.materials = this.materials;
    this.appendChild(modal);
  }

  handleResize() {
    const now = window.innerWidth <= 768;
    if (this._lastIsMobile !== now) this.renderTable();
  }

  getHTML() {
    return `
      <div class="list-header">
        <h2>Suppliers</h2>
        <div>
          <button type="button" class="new-btn"><span>+ New Supplier</span></button>
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

  getMobileTableHTML() {
    const fmt = (v) => (v === undefined || v === null || v === '' ? '-' : v);
    return `
      ${(this.suppliers || []).map(s => `
        <tr class="has-card">
          <td colspan="8" style="padding:0;">
            <div class="card" data-id="${s.supplier_id}">
              <div class="card-info">
                <div class="card-title">
                  ${fmt(s.name)}
                  <span class="status ${s.is_active === false ? 'status-inactive' : 'status-active'}">${s.is_active === false ? 'Inactive' : 'Active'}</span>
                </div>
                <div>Contact: ${fmt(s.contact_name)}</div>
                <div>Phone: ${fmt(s.phone)}</div>
                <div>Email: ${fmt(s.email)}</div>
                <div>Lead Time: ${fmt(s.lead_time_days)} days</div>
              </div>
            </div>
          </td>
        </tr>
      `).join('')}
    `;
  }

  getDesktopTableHTML() {
    const rows = (this.suppliers || []).map(s => this.getTableRowHTML(s)).join('');
    return `
      <thead>
        <tr>
          <th class="col-id">ID</th>
          <th class="col-name">Name</th>
          <th class="col-contact">Contact</th>
          <th class="col-phone">Phone</th>
          <th class="col-email">Email</th>
          <th class="col-lead">Lead Time (days)</th>
          <th class="col-active">Active</th>
          <th class="col-actions">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    `;
  }

  getTableRowHTML(s) {
    return `
      <tr data-id="${s.supplier_id}">
        <td class="col-id" data-label="ID">${s.supplier_id ?? '-'}</td>
        <td class="col-name" data-label="Name">${s.name || '-'}</td>
        <td class="col-contact" data-label="Contact">${s.contact_name || '-'}</td>
        <td class="col-phone" data-label="Phone">${s.phone || '-'}</td>
        <td class="col-email" data-label="Email">${s.email || '-'}</td>
        <td class="col-lead" data-label="Lead Time">${s.lead_time_days ?? '-'}</td>
        <td class="col-active" data-label="Active">${s.is_active === false ? 'No' : 'Yes'}</td>
        <td class="col-actions" data-label="Actions">
          <button type="button" class="action-btn edit-btn">Edit</button>
        </td>
      </tr>
    `;
  }
}

customElements.define('supplier-list', SupplierList);
