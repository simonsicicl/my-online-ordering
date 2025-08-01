// Product list component for merchant admin system

class MenuList extends HTMLElement {
  constructor() {
    super();
    this._menu = [];
    this._categories = [];
    this._tags = [];
  }
  
  // --- Data setters/getters ---
  set menu(data) {
    this._menu = data || [];
    this.renderProductTable();
  }
  set categories(data) { this._categories = data || []; }
  set tags(data) { this._tags = data || []; }

  get menu() { return this._menu || []; }
  get categories() { return this._categories || []; }
  get tags() { return this._tags || []; }

  // --- Lifecycle methods ---
  /**
   * Called when the element is added to the DOM.
   * Renders initial UI and sets up event listeners.
   */
  connectedCallback() {
    this.render();
    this.renderProductTable();
    // Bind resize event to re-render table on window size change
    this._resizeHandler = () => this.renderProductTable();
    window.addEventListener('resize', this._resizeHandler);
  }

  /**
   * Called when the element is removed from the DOM.
   * Cleans up event listeners to prevent memory leaks.
   */
  disconnectedCallback() {
    window.removeEventListener('resize', this._resizeHandler);
  }

  // --- Render methods ---
  /**
   * Renders the main product list panel and table container.
   * Also binds the Add button click handler.
   */
  render() {
    this.innerHTML = this.getHTML();
    // Bind add product button event
    this.querySelector('#addBtn').onclick = () => this.handleAddClick();
  }

  /**
   * Renders the product table with current menu data.
   * If no menu data, shows empty message.
   */
  renderProductTable() {
    const tableContainer = this.querySelector('#table');
    // If table container not found, exit
    if (!tableContainer) return;
    // If menu is empty, show empty table message
    if (!this.menu || this.menu.length === 0) {
      tableContainer.innerHTML = this.getEmptyTableHTML();
      return;
    }
    // Create table element and fill with data
    const table = document.createElement('table');
    table.innerHTML = this.getTableHTML();
    // Bind edit button events
    table.querySelectorAll('.editBtn').forEach(btn => {
      btn.onclick = () => this.handleEditClick(btn);
    });
    // Bind delete button events
    table.querySelectorAll('.deleteBtn').forEach(btn => {
      btn.onclick = () => this.handleDeleteClick(btn);
    });
    // Bind toggle availability button events
    table.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.onclick = () => this.handleToggleClick(btn);
    });
    // Clear previous content and append new table
    tableContainer.innerHTML = '';
    tableContainer.appendChild(table);
  }

  // --- Event handlers ---
  /**
   * Navigates to product editor for creating a new product.
   * @param {Event} e
   */
  handleAddClick() {
    window.location.hash = `/menu/edit/0`;
  }

  /**
   * Navigates to product editor for the specified item.
   * @param {HTMLElement} btn
   */
  handleEditClick(btn) {
    window.location.hash = `/menu/edit/${btn.dataset.id}`;
  }

  /**
   * Confirms and deletes the product.
   * @param {HTMLElement} btn
   */
  handleDeleteClick(btn) {
    this.deleteProduct(btn.dataset.id);
  }

  /**
   * Toggles product availability.
   * @param {HTMLElement} btn
   */
  handleToggleClick(btn) {
    const idx = btn.getAttribute('data-idx');
    // Toggle product availability status
    this.menu[idx].is_available = !this.menu[idx].is_available;
    this.renderProductTable();
  }

  // --- Utility methods ---
  /**
   * Gets category name by category_id.
   * @param {number} category_id
   * @return {string}
   */
  getCategoryName(category_id) {
    // Find category name by id
    const cat = this.categories.find(c => c.category_id === category_id);
    return cat ? cat.name : '';
  }

  /**
   * Gets tag objects by tag_ids.
   * @param {Array} tagIds
   * @return {Array}
   */
  getTagNames(tagIds = []) {
    // Map tag ids to tag objects, return default if not found
    return tagIds.map(id => {
      const tag = this.tags.find(t => t.tag_id === id);
      if (tag)
        return { tag_id: tag.tag_id, name: tag.name, color: tag.color };
      else {
        console.error(`Tag with id ${id} not found`);
        return { tag_id: null, name: '', color: '#ccc' };
      }
    });
  }

  /**
   * Deletes a product by item_id after confirmation.
   * @param {number} id
   */
  deleteProduct(id) {
    // Confirm before deleting product
    if (confirm('Delete this product?')) {
      // Remove product with specified id
      this.menu = this.menu.filter(p => p.item_id != id);
      this.renderProductTable();
    }
  }

  // --- HTML generators ---
  /**
   * Returns HTML for empty table message.
   * @return {string}
   */
  getEmptyTableHTML() {
    return `
      <div class="empty-table-message">
        <span class="empty-icon">📦</span>
        No products found.
        Please click <a href="#/menu/edit/0">Add Product</a> to create one!
      </div>
    `;
  }

  /**
   * Returns HTML for the product list panel.
   * @return {string}
   */
  getHTML() {
    return `
      <link rel="stylesheet" href="./components/menu/menu-list.css" />
      <div class="product-list-header">
        <h2>Product List</h2>
        <button id="addBtn" class="add-btn">Add Product</button>
      </div>
      <div id="table"></div>
    `;
  }

  /**
   * Returns HTML for the product table (responsive).
   * @return {string}
   */
  getTableHTML() {
    // Switch between desktop and mobile table based on screen width
    if (window.innerWidth <= 768)
      return this.getMobileTableHTML();
    else
      return this.getDesktopTableHTML();
  }

  /**
   * Returns HTML for the mobile product table (card layout).
   * @return {string}
   */
  getMobileTableHTML() {
    return `
      <tbody>
        ${this.menu.map((item, idx) => `
          <tr>
            <td colspan="7" style="padding:0;">
              <div class="product-card">
                <img src="${item.image_url}" alt="${item.name}" class="product-card-img">
                <div class="product-card-info">
                  <div class="product-card-title">${item.name}</div>
                  <div class="product-card-price">$${item.price}</div>
                  ${!item.is_available ? `<div class="product-card-unavailable">Unavailable</div>` : ''}
                </div>
                <div class="product-card-actions">
                  <button class="action-btn editBtn" data-id="${item.item_id}" title="Edit">✏️</button>
                  <button class="action-btn deleteBtn" data-id="${item.item_id}" title="Delete">🗑️</button>
                </div>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    `;
  }

  /**
   * Returns HTML for the desktop product table (full table view).
   * @return {string}
   */
  getDesktopTableHTML() {
    return `
      <thead>
        <tr>
          <th>Image</th>
          <th>Name</th>
          <th>Category</th>
          <th>Price</th>
          <th>Tags</th>
          <th>Available</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${this.menu.map((item, idx) => `
          <tr>
            <td><img src="${item.image_url}" alt="${item.name}" style="width:48px;height:48px;border-radius:6px;"></td>
            <td>${item.name}</td>
            <td>${this.getCategoryName(item.category_id)}</td>
            <td>$${item.price}</td>
            <td>${this.getTagNames(item.tags).map(tag => `<span style="background:${tag.color};color:#fff;padding:2px 8px;border-radius:4px;margin-right:2px;">${tag.name}</span>`).join('')}</td>
            <td>
              <button class="toggle-btn${item.is_available ? ' active' : ''}" data-idx="${idx}" title="Toggle Available">
                <span class="toggle-knob"></span>
              </button>
            </td>
            <td>
              <button data-id="${item.item_id}" class="action-btn editBtn">Edit</button>
              <button data-id="${item.item_id}" class="action-btn deleteBtn">Delete</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    `;
  }
}

customElements.define('menu-list', MenuList);