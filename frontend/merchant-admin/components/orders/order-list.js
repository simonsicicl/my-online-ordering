// Order list component for merchant admin system

class OrderList extends HTMLElement {
  constructor() {
    super();
    this._orders = [];
    this.state = { filter: '' };
    this.handleFilterInput = this.handleFilterInput.bind(this);
    this.handleDesktopDetailClick = this.handleDesktopDetailClick.bind(this);
    this.handleMobileCardClick = this.handleMobileCardClick.bind(this);
    this.handleMobileCardKeydown = this.handleMobileCardKeydown.bind(this);
  }

  // --- Data setter/getter ---
  /**
   * Set the orders data and re-render the table.
   * @param {Array} data - Array of order objects.
   */
  set orders(data) {
    this._orders = data || [];
    this.renderOrderTable();
  }

  get orders() { return this._orders || []; }

  // --- Lifecycle methods ---
  /**
   * Called when the element is inserted into the DOM.
   * Loads example data if no orders are set, renders the component.
   */
  connectedCallback() {
    this.render();
    this.renderOrderTable();
    // Bind resize event to re-render table on window size change
    this._resizeHandler = () => this.renderOrderTable();
    window.addEventListener('resize', this._resizeHandler);
  }

  /**
   * Called when the element is removed from the DOM.
   * Cleans up event listeners and other resources.
   */
  disconnectedCallback() {
    window.removeEventListener('resize', this._resizeHandler);
  }

  // --- Render methods ---
  /**
   * Render the main structure and filter bar.
   */
  render() {
    this.innerHTML = this.getHTML();
    this.querySelector('.order-filter-bar input').oninput = this.handleFilterInput;
  }

  /**
   * Render the order table or mobile card list based on screen size.
   * Also binds all necessary events after rendering.
   */
  renderOrderTable() {
    // Filter orders by search input
    const filter = this.state.filter.trim().toLowerCase();
    const filteredOrders = this.orders.filter(order => {
      if (!filter) return true;
      return (
        String(order.order_number).includes(filter) ||
        order.status.toLowerCase().includes(filter) ||
        order.source.toLowerCase().includes(filter)
      );
    });

    const listContainer = this.querySelector('.order-table');
    if (!listContainer) 
      return;

    // Show empty message if no orders
    if (!filteredOrders.length) {
      listContainer.innerHTML = this.getEmptyHTML();
      return;
    }

    // Render as cards on mobile, table on desktop
    if (window.innerWidth <= 700) {
      listContainer.innerHTML = this.getListHTML(filteredOrders);
      // Bind mobile card events here
      listContainer.querySelectorAll('.order-card').forEach(card => {
        card.onclick = this.handleMobileCardClick;
        card.tabIndex = 0;
        card.onkeydown = this.handleMobileCardKeydown;
      });
    } else {
      listContainer.innerHTML = this.getTableHTML(filteredOrders);
      // Bind desktop detail button events here
      listContainer.querySelectorAll('.detailBtn').forEach(btn => {
        btn.onclick = this.handleDesktopDetailClick;
      });
    }
  }

  // --- Event handlers ---
  /**
   * Handle filter input changes and re-render the table.
   * @param {Event} e
   */
  handleFilterInput(e) {
    this.state.filter = e.target.value;
    this.renderOrderTable();
  }

  /**
   * Handle click event for desktop detail buttons.
   * @param {MouseEvent} e
   */
  handleDesktopDetailClick(e) {
    const orderId = Number(e.currentTarget.getAttribute('data-order-id'));
    window.location.hash = `#/order-detail/${orderId}`;
  }

  /**
   * Handle click event for mobile order cards.
   * @param {MouseEvent} e
   */
  handleMobileCardClick(e) {
    const orderId = e.currentTarget.getAttribute('data-order-id');
    window.location.hash = `#/order-detail/${orderId}`;
  }

  /**
   * Handle keyboard event for mobile order cards (Enter/Space triggers click).
   * @param {KeyboardEvent} e
   */
  handleMobileCardKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      const orderId = e.currentTarget.getAttribute('data-order-id');
      window.location.hash = `#/order-detail/${orderId}`;
    }
  }

  // --- HTML generators ---

  /**
   * Generate the main HTML structure for the order list component.
   * @return {string}
   */
  getHTML() {
    return `
      <link rel="stylesheet" href="./components/orders/order-list.css" />
      <div class="order-list-header">
        <h2>Order List</h2>
        <div class="order-filter-bar">
          <input type="text" placeholder="Search by order #, status, or source..." value="${this.state.filter.replace(/"/g, '&quot;')}" />
        </div>
      </div>
      <div class="order-table"></div>
    `;
  }

  /**
   * Generate HTML for empty orders message.
   * @returns {string}
   */
  getEmptyHTML() {
    return `
      <div class="empty-table-message">
        <span class="empty-icon">📦</span>
        No orders found.<br>
        Try adjusting your filter or check back later.
      </div>
    `;
  }

  /**
   * Generate HTML for desktop table view.
   * @param {Array} orders
   * @returns {string}
   */
  getTableHTML(orders) {
    return `
      <table class="order-list-table">
        <thead>
          <tr>
            <th style="width:1%;">Order #</th>
            <th style="width:1%;">Status / Time</th>
            <th style="width:1%;">Total</th>
            <th style="width:auto;">Items</th>
            <th style="width:1%;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(order => this.getTableRowHTML(order)).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Generate HTML for mobile card view.
   * @param {Array} orders
   * @returns {string}
   */
  getTableRowHTML(order) {
    return `
      <tr>
        <td data-label="Order #">${order.order_number}</td>
        <td data-label="Status / Time">
          <span class="order-status ${order.status}">${order.status}</span><br>
          <span class="order-time">${order.order_time.replace('T', ' ').slice(0, 16)}</span>
        </td>
        <td data-label="Total">$${order.total_amount.toFixed(2)}</td>
        <td data-label="Items">
          <ul class="order-item-list">
            ${order.order_items.map(item => this.getOrderItemListHTML(item)).join('')}
          </ul>
        </td>
        <td data-label="Action">
          <button class="action-btn detailBtn" data-order-id="${order.order_id}">Detail</button>
        </td>
      </tr>
    `;
  }

  /**
   * Generate HTML for mobile card view.
   * @param {Array} orders
   * @returns {string}
   */
  getListHTML(orders) {
    return `
      <div class="order-list-mobile">
        ${orders.map(order => `
          <div class="order-card" data-order-id="${order.order_id}" tabindex="0">
            <div class="order-card-row">
              <span class="order-card-label">Order #</span>
              <span class="order-card-value">${order.order_number}</span>
            </div>
            <div class="order-card-row">
              <span class="order-card-label">Status</span>
              <span class="order-status ${order.status}">${order.status}</span>
            </div>
            <div class="order-card-row">
              <span class="order-card-label">Time</span>
              <span class="order-time">${order.order_time.replace('T', ' ').slice(0, 16)}</span>
            </div>
            <div class="order-card-row">
              <span class="order-card-label">Total</span>
              <span class="order-card-value">$${order.total_amount.toFixed(2)}</span>
            </div>
            <div class="order-card-row">
              <span class="order-card-label">Items</span>
              <ul class="order-item-list">
                ${order.order_items.map(item => this.getOrderItemListHTML(item)).join('')}
              </ul>
            </div>
          </div>
        `).join('')}
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

customElements.define('order-list', OrderList);