// Order detail component for merchant admin system

class OrderDetail extends HTMLElement {
  connectedCallback() {
    // Get the order ID from attribute
    const orderId = this.getAttribute('item-id') || '';
    // Render the order detail panel
    this.innerHTML = `<h2>Order Detail</h2><p>Order ID: ${orderId}</p>`;
  }
}
customElements.define('order-detail', OrderDetail);