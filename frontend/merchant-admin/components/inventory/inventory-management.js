// Inventory Management (ERP) container component for merchant admin system
// Hosts tabs for: Inventory List, Purchase Orders, Movements, Stock Alerts.
// Loads example data and passes it to child components.

import { inventoryDataExample } from '../../example-data.js';
import './inventory-list.js';
import './purchase-list.js';
import './movements-list.js';
import './stock-alert.js';

class InventoryManagement extends HTMLElement {
  constructor() {
    super();
    this._data = null;
    this._lastIsMobile = null;
    // Use internal state for tab selection (no hash routing)
    this._currentTab = 'list';
  }

  // --- Lifecycle methods ---
  async connectedCallback() {
    // Load data (using example data for now; replace with API calls later)
    this._data = inventoryDataExample;

    // Initial render
    this.render();
    this.renderTabContent();

    // Handle layout changes only (no hashchange listener)
    this._lastIsMobile = window.innerWidth <= 768;
    window.addEventListener('resize', this._onResize = () => this.handleResize());
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this._onResize);
  }

  // --- Render methods ---
  render() {
    this.innerHTML = this.getHTML();

    // Bind tab buttons (desktop)
    this.querySelectorAll('.menu-management-tabs button[data-tab]').forEach(btn => {
      btn.onclick = () => this.switchTab(btn.dataset.tab);
    });

    // Bind selector (mobile)
    const select = this.querySelector('#inventoryTabSelect');
    if (select) select.onchange = (e) => this.switchTab(e.target.value);

    // Reflect active tab on fresh markup
    this.updateActiveTab(this._currentTab);
  }

  renderTabContent() {
    const container = this.querySelector('.inventory-tab-content');
    if (!container) return;

    // Determine current tab from internal state
    const sub = this._currentTab || 'list';

    // Render selected sub component
    let el;
    switch (sub) {
      case 'purchase':
        el = document.createElement('purchase-list');
        el.purchase_orders = this._data?.purchase_order || [];
        el.purchase_items = this._data?.purchase_order_item || [];
        break;
      case 'movements':
        el = document.createElement('movements-list');
        el.movements = this._data?.inventory_movement || [];
        el.materials = this._data?.material || [];
        break;
      case 'alerts':
        el = document.createElement('stock-alert');
        el.materials = this._data?.material || [];
        break; // prevent fall-through
      case 'list':
      default:
        el = document.createElement('inventory-list');
        el.materials = this._data?.material || [];
        break;
    }

    // Update active tab UI
    this.updateActiveTab(sub);

    // Mount
    container.innerHTML = '';
    container.appendChild(el);
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

  // --- Tab helpers (no router) ---
  switchTab(sub) {
    if (!sub) return;
    if (this._currentTab === sub) return;
    this._currentTab = sub;
    this.updateActiveTab(sub);
    this.renderTabContent();
  }

  updateActiveTab(sub) {
    // Desktop buttons
    this.querySelectorAll('.menu-management-tabs button[data-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === sub);
    });
    // Mobile select
    const select = this.querySelector('#inventoryTabSelect');
    if (select) select.value = sub;
  }

  // --- HTML generators ---
  getHTML() {
    return `
      <link rel="stylesheet" href="./components/inventory/inventory.css" />
      <div class="inventory-management-root">
        <div class="menu-management-tabs">
          <button type="button" data-tab="list">Inventory List</button>
          <button type="button" data-tab="purchase">Purchase Orders</button>
          <button type="button" data-tab="movements">Movements</button>
          <button type="button" data-tab="alerts">Stock Alerts</button>
        </div>
        <div class="menu-management-selectbar">
          <select id="inventoryTabSelect">
            <option value="list">Inventory List</option>
            <option value="purchase">Purchase Orders</option>
            <option value="movements">Movements</option>
            <option value="alerts">Stock Alerts</option>
          </select>
        </div>
        <div class="inventory-tab-content"></div>
      </div>
    `;
  }
}

customElements.define('inventory-management', InventoryManagement);
