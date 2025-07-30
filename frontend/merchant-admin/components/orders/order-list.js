// Order list component for merchant admin system

class OrderList extends HTMLElement {
  connectedCallback() {
    // Render the order list panel
    this.innerHTML = `<h2>Order List</h2><p>All orders are displayed here.</p>`;
  }
}

customElements.define('order-list', OrderList);