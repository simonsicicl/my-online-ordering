// Inventory movement records component for merchant admin system

class MovementsList extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <h2>Inventory Movements</h2>
      <p>Track all inventory movements, including inbound, outbound, and adjustments, to monitor stock changes over time.</p>
    `;
  }
}

customElements.define('movements-list', MovementsList);