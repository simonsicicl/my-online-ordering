// Inventory Management (ERP) container component for merchant admin system
// Hosts tabs for: Material List, Purchase Orders, Movements, Stock Alerts.
// Loads data from API and passes it to child components.

import * as api from '../../../api.js';
import './material-list.js';
import './purchase-list.js';
import './movements-list.js';
import './stock-alert.js';
import './supplier-list.js';

class InventoryManagement extends HTMLElement {
  constructor() {
    super();
    this._data = null;
    this._materials = [];
    this._movements = [];
    this._purchase_orders = [];
    this._suppliers = [];
    this._lastIsMobile = null;
    this._activeTab = 'list';
    this._loading = false;
  }

  // --- Getters and Setters ---
  set materials(data) { this._materials = data || []; }
  get materials() { return this._materials || []; }

  set movements(data) { this._movements = data || []; }
  get movements() { return this._movements || []; }

  set purchase_orders(data) { this._purchase_orders = data || []; }
  get purchase_orders() { return this._purchase_orders || []; }

  set suppliers(data) { this._suppliers = data || []; }
  get suppliers() { return this._suppliers || []; }

  // --- Lifecycle methods ---
  async connectedCallback() {
    // Load data from API
    this._loading = true;
    this.render();
    await this.fetchAllData();
    this._loading = false;

    // Initial render
    this.render();
    this.renderTabContent();

    this._lastIsMobile = window.innerWidth <= 768;

    // Bind and register event handlers (ensure correct `this` and removal later)
    this._onResize = this.handleResize.bind(this);
    this._onRefresh = this.handleRefresh.bind(this);
    window.addEventListener('resize', this._onResize);
    window.addEventListener('inventory:refresh', this._onRefresh);
  }

  disconnectedCallback() {
    // Remove using the same bound references
    if (this._onResize) window.removeEventListener('resize', this._onResize);
    if (this._onRefresh) window.removeEventListener('inventory:refresh', this._onRefresh);
  }

  // --- Data helpers ---
  normalizeItems(json) {
    if (!json) return [];
    if (Array.isArray(json)) return json;
    if (json.items && Array.isArray(json.items)) return json.items;
    if (json.data && Array.isArray(json.data.items)) return json.data.items;
    return [];
  }

  async fetchMaterials(params) {
    const res = await fetch(api.getMaterialsURL(params));
    if (!res.ok) throw new Error('materials fetch failed');
    const json = await res.json();
    return this.normalizeItems(json);
  }

  async fetchMovements(params) {
    const res = await fetch(api.getMovementsURL(params));
    if (!res.ok) throw new Error('movements fetch failed');
    const json = await res.json();
    return this.normalizeItems(json);
  }

  async fetchPurchaseOrders(params) {
    const res = await fetch(api.getPurchaseOrdersURL(params));
    if (!res.ok) throw new Error('purchase orders fetch failed');
    const json = await res.json();
    return this.normalizeItems(json);
  }

  async fetchSuppliers(params) {
    const res = await fetch(api.getSuppliersURL(params));
    if (!res.ok) throw new Error('suppliers fetch failed');
    const json = await res.json();
    return this.normalizeItems(json);
  }

  async fetchAllData() {
    console.log('Fetching inventory data...');
    try {
      const [materials, movements, purchase_orders, suppliers] = await Promise.all([
        this.fetchMaterials(),
        this.fetchMovements({ page_size: 200 }),
        this.fetchPurchaseOrders({ page_size: 200 }),
        this.fetchSuppliers({ page_size: 200 })
      ]);
      this.materials = materials;
      this.movements = movements;
      this.purchase_orders = purchase_orders;
      this.suppliers = suppliers;
    } catch (e) {
      console.error('Failed to load all inventory data:', e);
    }
  }

  // --- Render methods ---
  render() {
    if (this._loading && !this.innerHTML) {
      this.innerHTML = this.getLoadingHTML();
      return;
    }

    this.innerHTML = this.getHTML();
  }

  renderTabContent() {
    this.querySelector('.management-root').innerHTML = this.getRootHTML();

    // Render selected sub component
    this.querySelectorAll('material-list, purchase-list, movements-list, stock-alert, supplier-list').forEach(el => {
      if (el.materials) el.materials = this.materials;
      if (el.movements) el.movements = this.movements;
      if (el.purchase_orders) el.purchase_orders = this.purchase_orders;
      if (el.suppliers) el.suppliers = this.suppliers;
      el.renderTable();
    });

    // Bind tab buttons (desktop)
    this.querySelectorAll('.management-tabs button[data-tab]').forEach(btn => {
      btn.onclick = () => this.switchTab(btn.dataset.tab);
    });

    // Bind selector (mobile)
    const select = this.querySelector('#inventoryTabSelect');
    if (select) select.onchange = (e) => this.switchTab(e.target.value);

    // Reflect active tab on fresh markup
    this.updateActiveTab(this._activeTab);
  }

  // --- Event handlers ---
  handleResize() {
    const isMobile = window.innerWidth <= 768;
    if (this._lastIsMobile !== isMobile) {
      this._lastIsMobile = isMobile;
      this.render();
      this.renderTabContent();
    }
  }

  async handleRefresh() {
    try {
      this._loading = true;
      this.renderTabContent();
      await this.fetchAllData();
    } catch (e) {
      console.error('Inventory refresh failed', e);
    } finally {
      this._loading = false;
      this.renderTabContent();
    }
  }

  // --- Tab helpers (no router) ---
  switchTab(sub) {
    if (!sub) return;
    if (this._activeTab === sub) return;
    this._activeTab = sub;

    this.updateActiveTab(sub);
    this.renderTabContent();
  }

  updateActiveTab(sub) {
    // Desktop buttons
    this.querySelectorAll('.management-tabs button[data-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === sub);
    });
    // Mobile select
    const select = this.querySelector('#inventoryTabSelect');
    if (select) select.value = sub;
  }

  // --- HTML generators ---
  getHTML() {
    return `
      <link rel="stylesheet" href="./components/inventory/inventory-management.css" />
      <link rel="stylesheet" href="./components/inventory/list-base.css" />
      <link rel="stylesheet" href="./components/inventory/editor-base.css" />
      <link rel="stylesheet" href="./components/inventory/material-list.css" />
      <div class="management-root">
        ${this.getRootHTML()}
      </div>
    `;
  }

  getRootHTML() {
    return `
      ${window.innerWidth <= 768 ? 
      this.getMobileTabsHTML() : 
      this.getDesktopTabsHTML()}
      <div class="management-content">${this.getTabContentHTML()}</div>
    `;
  }

  getDesktopTabsHTML() {
    return `
      <div class="management-tabs">
        <button type="button" data-tab="list">Material List</button>
        <button type="button" data-tab="purchase">Purchase Orders</button>
        <button type="button" data-tab="movements">Movements</button>
        <button type="button" data-tab="alerts">Stock Alerts</button>
        <button type="button" data-tab="suppliers">Suppliers</button>
      </div>
    `;
  }

  getMobileTabsHTML() {
    return `
      <div class="management-selectbar">
        <select id="inventoryTabSelect">
          <option value="list">Material List</option>
          <option value="purchase">Purchase Orders</option>
          <option value="movements">Movements</option>
          <option value="alerts">Stock Alerts</option>
          <option value="suppliers">Suppliers</option>
        </select>
      </div>
    `;
  }

  getLoadingHTML() {
    return `
      <div class="management-root">
        <div class="management-content">
          <p>Loading inventory…</p>
        </div>
      </div>
    `;
  }

  getTabContentHTML() {
    return `
      ${this._loading ? '<div>Loading...</div>' : `
        ${this._activeTab === 'list' ? '<material-list></material-list>' : ''}
        ${this._activeTab === 'purchase' ? '<purchase-list></purchase-list>' : ''}
        ${this._activeTab === 'movements' ? '<movements-list></movements-list>' : ''}
        ${this._activeTab === 'alerts' ? '<stock-alert></stock-alert>' : ''}
        ${this._activeTab === 'suppliers' ? '<supplier-list></supplier-list>' : ''}
      `}
    `;
  }
}

customElements.define('inventory-management', InventoryManagement);
