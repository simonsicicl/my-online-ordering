// Inventory list and filter component for merchant admin system

class InventoryList extends HTMLElement {
  set materials(data) { this._materials = data || []; }
  get materials() { return this._materials || []; }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = this.getHTML();
  }

  getHTML() {
    return `
      <h2>Inventory List</h2>
      <div class="table-responsive">
        <table class="simple-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Unit</th>
              <th>Stock</th>
              <th>Min Alert</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${(this.materials || []).map(m => this.getTableRowHTML(m)).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  getTableRowHTML(material) {
    return `
      <tr>
        <td data-label="ID">${material.material_id}</td>
        <td data-label="Name">${material.name}</td>
        <td data-label="Unit">${material.unit}</td>
        <td class="text-right" data-label="Stock">${Number(material.stock_quantity).toLocaleString()}</td>
        <td class="text-right" data-label="Min Alert">${Number(material.min_stock_alert).toLocaleString()}</td>
        <td data-label="Status">${material.is_active ? '<span class="status status-active">Active</span>' : '<span class="status status-inactive">Inactive</span>'}</td>
      </tr>
    `;
  }
}

customElements.define('inventory-list', InventoryList);