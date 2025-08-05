// Purchase order list component for merchant admin system

class PurchaseList extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <h2>Purchase Orders</h2>
      <p>View and filter all purchase orders related to inventory replenishment, including supplier and date information.</p>
    `;
  }
}

customElements.define('purchase-list', PurchaseList);
