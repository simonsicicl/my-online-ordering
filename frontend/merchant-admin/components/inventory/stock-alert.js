// Inventory stock alert component for merchant admin system

class StockAlert extends HTMLElement {
  set materials(data) { this._materials = data || []; }
  get materials() { return this._materials || []; }

  connectedCallback() {
    this.render();
  }

  render() {
    const low = (this.materials || []).filter(m => Number(m.stock_quantity) <= Number(m.min_stock_alert));
    this.innerHTML = `
      <h2>Stock Alerts</h2>
      ${low.length ? this.getTableHTML(low) : '<p>No low stock items.</p>'}
    `;
  }

  getTableHTML(list) {
    const rows = list.map(m => `
      <tr>
        <td data-label="ID">${m.material_id}</td>
        <td data-label="Name">${m.name}</td>
        <td data-label="Unit">${m.unit}</td>
        <td class="text-right" data-label="Stock">${Number(m.stock_quantity).toLocaleString()}</td>
        <td class="text-right" data-label="Min Alert">${Number(m.min_stock_alert).toLocaleString()}</td>
      </tr>
    `).join('');

    return `
      <div class="table-responsive">
        <table class="simple-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Unit</th>
              <th>Stock</th>
              <th>Min Alert</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }
}

customElements.define('stock-alert', StockAlert);