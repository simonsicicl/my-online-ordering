// Inventory list and filter component for merchant admin system

class InventoryList extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <h2>Inventory List</h2>
      <p>Displays all inventory items with search and filter options to help you quickly find products and check stock levels.</p>
    `;
  }
}

customElements.define('inventory-list', InventoryList);