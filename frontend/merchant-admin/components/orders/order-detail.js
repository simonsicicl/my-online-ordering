// Order detail component for merchant admin system


class OrderDetail extends HTMLElement {
  constructor() {
    super();
    this._order = null;
  }

  // --- Data setter/getter ---
  set order(data) {
    this._order = data;
    this.render();
  }

  get order() { return this._order; }

  // --- Lifecycle methods ---
  /**
   * Called when the element is inserted into the DOM.
   * Renders the component and binds events.
   */
  connectedCallback() {
    this.render();
  }

  /**
   * Called when the element is inserted into the DOM.
   * Renders the component and binds events.
   */
  render() {
    const order = this._order;
    this.innerHTML = this.getHTML(order);
    // Bind back button click event
    this.querySelector('.order-back-btn').onclick = () => this.handleBackClick();
  }
  
  // --- Event handlers ---
  /**
   * Handle back button click event.
   */
  handleBackClick() {
    window.location.hash = '#/orders';
  }

  // --- Render methods ---
  /**
   * Generate the HTML structure for the order detail view.
   * @param {Object} order
   * @returns {string}
   */
  getHTML(order) {
    return`
      <link rel="stylesheet" href="./components/orders/order-detail.css" />
      <div class="order-detail-panel">
        <button class="order-back-btn action-btn" type="button">&larr; Back</button>
        <h2>Order Detail</h2>
        ${!order ? `
          <div class="order-detail-empty">Order not found.</div>
        ` : `
          <div class="order-meta">
            <div><strong>Order #:</strong> ${order.order_number}</div>
            <div><strong>Status:</strong> <span class="order-status ${order.status}">${order.status}</span></div>
            <div><strong>Time:</strong> ${order.order_time.replace('T', ' ').slice(0, 16)}</div>
            <div><strong>Source:</strong> ${order.source}</div>
            <div><strong>Total:</strong> $${order.total_amount.toFixed(2)}</div>
          </div>
          <h3>Items</h3>
          <ul class="order-item-list">
            ${order.order_items.map(item => this.getOrderItemListHTML(item)).join('')}
          </ul>
        `}
      </div>
    `;
  }

  /**
   * Generate HTML for a single order item (including options and combos).
   * @param {Object} item
   * @returns {string}
   */
  getOrderItemListHTML(item) {
    return `<li>
      <span class="item-id">#${item.order_item_id}</span>
      <span class="item-name">ID:${item.item_id}</span>
      <span class="item-qty">x${item.quantity}</span>
      <span class="item-price">$${item.price}</span>
      ${ item.is_combo ? `
        <ul class="combo-item-list"> 
          ${item.combo_items.map(sub => this.getOrderItemListHTML(sub)).join('')} 
        </ul>
      ` : `
        <ul class="order-option-list">
          ${item.order_item_options.map(opt => `
            <li>
              <span class="option-id">#${opt.order_item_option_id}</span>
              <span class="option-name">${opt.option_name}</span>
              <span class="option-delta">(${opt.price_delta >= 0 ? '+' : ''}${opt.price_delta})</span>
            </li>`).join('')}
        </ul>
      `}
    </li>`;
  }
}

customElements.define('order-detail', OrderDetail);