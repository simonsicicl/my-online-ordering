// Purchase order list component for merchant admin system

import './purchase-editor.js';

class PurchaseList extends HTMLElement {
  constructor() {
    super();
    this._purchase_orders = [];
    this._purchase_items = [];
    this._lastIsMobile = undefined;
  }

  set purchase_orders(data) { this._purchase_orders = data || []; this.renderTable(); }
  get purchase_orders() { return this._purchase_orders || []; }

  set purchase_items(data) { this._purchase_items = data || []; }
  get purchase_items() { return this._purchase_items || []; }

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

    if (!this.purchase_orders || this.purchase_orders.length === 0) {
      container.innerHTML = '<p>No purchase orders.</p>';
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
    const modal = document.createElement('purchase-editor');
    this.appendChild(modal);
  }

  handleEditClick(btn) {
    const id = Number(btn.dataset.id);
    const modal = document.createElement('purchase-editor');
    modal.purchase_order = this.purchase_orders.find(po => Number(po.purchase_id) === id) || null;
    this.appendChild(modal);
  }

  handleResize() {
    const now = window.innerWidth <= 768;
    if (this._lastIsMobile !== now) this.renderTable();
  }

  getHTML() {
    return `
      <link rel="stylesheet" href="./components/inventory/purchase-editor.css">
      <div class="list-header">
        <h2>Purchase Orders</h2>
        <div>
          <button type="button" class="new-btn"><span>+ New Purchase</span></button>
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
      <tbody>
        ${(this.purchase_orders || []).map(order => `
          <tr class="has-card">
            <td colspan="5" style="padding:0;">
              <div class="card" data-id="${order.purchase_id}">
                <div class="card-info">
                  <div class="card-title">#${order.purchase_id} - ${fmt(order.supplier_name || order.supplier)}</div>
                  <div class="card-row" style="display:flex; gap:10px;">
                    <div>Status: ${fmt(order.status)}</div>
                    <div>Expected: ${fmt(order.expected_date)}</div>
                  </div>
                  <div class="card-meta">Created: ${fmt(order.created_at)}</div>
                </div>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    `;
  }

  getDesktopTableHTML() {
    const rows = (this.purchase_orders || []).map(order => this.getTableRowHTML(order)).join('');
    return `
      <thead>
        <tr>
          <th class="col-id">ID</th>
          <th class="col-supplier">Supplier</th>
          <th class="col-status">Status</th>
          <th class="col-expected">Expected</th>
          <th class="col-created">Created At</th>
          <th class="col-actions">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    `;
  }

  getTableRowHTML(order) {
    return `
      <tr data-id="${order.purchase_id}">
        <td class="col-id" data-label="ID">${order.purchase_id ?? '-'}</td>
        <td class="col-supplier" data-label="Supplier">${order.supplier_name || order.supplier || '-'}</td>
        <td class="col-status" data-label="Status">${order.status || '-'}</td>
        <td class="col-expected" data-label="Expected">${order.expected_date || '-'}</td>
        <td class="col-created" data-label="Created At">${order.created_at || '-'}</td>
        <td class="col-actions" data-label="Actions">
          <button data-id="${order.purchase_id}" type="button" class="action-btn edit-btn">Edit</button>
        </td>
      </tr>
    `;
  }
}

customElements.define('purchase-list', PurchaseList);
