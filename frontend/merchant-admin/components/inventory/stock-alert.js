// Inventory stock alert component for merchant admin system

class StockAlert extends HTMLElement {
  constructor() {
    super();
    this._materials = [];
    this._lastIsMobile = undefined;
  }

  set materials(data) { this._materials = data || []; this.renderTable(); }
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
  }

  renderTable() {
    const low = (this.materials || []).filter(m => Number(m.stock_quantity) <= Number(m.min_stock_alert));
    const container = this.querySelector('#table');
    if (!container) return;

    if (!low.length) {
      container.innerHTML = '<p>No low stock items.</p>';
      return;
    }

    const table = document.createElement('table');
    table.innerHTML = this.getTableHTML(low);

    this._lastIsMobile = this.window.innerWidth <= 768;
    container.innerHTML = '';
    container.appendChild(table);
  }

  handleResize() {
    const now = window.innerWidth <= 768;
    if (this._lastIsMobile !== now) this.renderTable();
  }

  getHTML() {
    return `
      <div class="list-header"><h2>Stock Alerts</h2></div>
      <div id="table"></div>
    `;
  }

  getTableHTML(list) {
    if (this._lastIsMobile) {
      return this.getMobileTableHTML(list);
    } else {
      return this.getDesktopTableHTML(list);
    }
  }

  getMobileTableHTML(list) {
    const fmt = (n) => (n === null || n === undefined || isNaN(Number(n)) ? '-' : Number(n).toLocaleString());
    return `
      ${list.map(m => `
        <tr class="has-card">
          <td colspan="5" style="padding:0;">
            <div class="card" data-id="${m.material_id}">
              <div class="card-info">
                <div class="card-title">${m.name}</div>
                <div class="card-meta">Unit: ${m.unit}</div>
                <div class="card-row" style="margin-top:6px; display:flex; gap:10px;">
                  <div class="card-stock">Stock: ${fmt(m.stock_quantity)} ${m.unit || ''}</div>
                  <div class="card-min">Min: ${fmt(m.min_stock_alert)}</div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      `).join('')}
    `;
  }

  getDesktopTableHTML(list) {
    return `
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Unit</th>
          <th class="text-right">Stock</th>
          <th class="text-right">Min Alert</th>
        </tr>
      </thead>
      <tbody>${list.map(m => this.getDesktopTableRowHTML(m)).join('')}</tbody>
    `;
  }

  getTableRowHTML(m) {
    const fmt = (n) => (n === null || n === undefined || isNaN(Number(n)) ? '-' : Number(n).toLocaleString());
    return `
      <tr>
        <td data-label="ID">${m.material_id}</td>
        <td data-label="Name">${m.name}</td>
        <td data-label="Unit">${m.unit}</td>
        <td class="text-right" data-label="Stock">${fmt(m.stock_quantity)}</td>
        <td class="text-right" data-label="Min Alert">${fmt(m.min_stock_alert)}</td>
      </tr>
    `;
  }
}

customElements.define('stock-alert', StockAlert);