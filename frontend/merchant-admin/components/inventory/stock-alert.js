// Inventory stock alert component for merchant admin system

class StockAlert extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <h2>Stock Alerts</h2>
      <p>See items that are low in stock or require attention, helping you prevent shortages and maintain optimal inventory levels.</p>
    `;
  }
}

customElements.define('stock-alert', StockAlert);