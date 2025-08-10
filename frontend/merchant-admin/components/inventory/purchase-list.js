// Purchase order list component for merchant admin system

class PurchaseList extends HTMLElement {
  set purchase_orders(data) { this._purchase_orders = data || []; }
  set purchase_items(data) { this._purchase_items = data || []; }
  get purchase_orders() { return this._purchase_orders || []; }
  get purchase_items() { return this._purchase_items || []; }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = this.getHTML();
  }

  getHTML() {
    return `
      <h2>Purchase Orders</h2>
      <div class="table-responsive">
        <table class="simple-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Supplier</th>
              <th>Status</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            ${(this.purchase_orders || []).map(order => this.getTableRowHTML(order)).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  getTableRowHTML(order) {
    return `
      <tr>
        <td data-label="ID">${order.purchase_id}</td>
        <td data-label="Supplier">${order.supplier}</td>
        <td data-label="Status">${order.status}</td>
        <td data-label="Created At">${new Date(order.created_at).toLocaleString()}</td>
      </tr>
    `;
  }
}

customElements.define('purchase-list', PurchaseList);
