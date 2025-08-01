// Product list component for merchant admin system

class MenuList extends HTMLElement {
  // Receive menu data from parent/app.js
  set menu(data) {
    this._menu = data || [];
    this.renderProductTable();
  }
  set categories(data) { this._categories = data || []; }
  set tags(data) { this._tags = data || []; }

  get menu() { return this._menu || []; }
  get categories() { return this._categories || []; }
  get tags() { return this._tags || []; }

  /**
   * Initialize component: attach shadow DOM and render initial state
   */
  connectedCallback() {
    // Only responsible for rendering, does not initialize data
    this.render();
    this.renderProductTable();
    // Monitor resize to re-render product table
    this._resizeHandler = () => this.renderProductTable();
    window.addEventListener('resize', this._resizeHandler);
  }

  disconnectedCallback() {
    // Remove resize event listener when component is removed
    window.removeEventListener('resize', this._resizeHandler);
  }

  /**
   * Render the main product list panel with header and table container
   */
  render() {
    // Render the product list panel and table container
    this.innerHTML = this.getHTML();
    // Add Add button click handler
    this.querySelector('#addBtn').onclick = () => this.handleAddClick();
  }

  /**
   * Render the product table with current menu data
   */
  renderProductTable() {
    const tableContainer = this.querySelector('#table');
    // If no table container found, do nothing
    if (!tableContainer) return;
    // If no menu data, show empty message
    if (!this.menu || this.menu.length === 0) {
      tableContainer.innerHTML = this.getEmptyTableHTML();
      return;
    }
    // Create table element and populate with product data
    const table = document.createElement('table');
    // Render table header and body
    table.innerHTML = this.getTableHTML();
    // Add event listeners for edit, delete, and toggle buttons
    table.querySelectorAll('.editBtn').forEach(btn => {
      btn.onclick = () => this.handleEditClick(btn);
    });
    table.querySelectorAll('.deleteBtn').forEach(btn => {
      btn.onclick = () => this.handleDeleteClick(btn);
    });
    table.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.onclick = () => this.handleToggleClick(btn);
    });
    // Clear previous content and append new table
    tableContainer.innerHTML = '';
    tableContainer.appendChild(table);
  }

  /**
   * Handle Add button click: navigate to product editor for new product
   */
  handleAddClick() {
    window.location.hash = `/menu/edit/0`;
  }
  /**
   * Handle Edit button click: navigate to product editor with item_id
   */
  handleEditClick(btn) {
    window.location.hash = `/menu/edit/${btn.dataset.id}`;
  }
  /**
   * Handle Delete button click: confirm and delete product
   */
  handleDeleteClick(btn) {
    this.deleteProduct(btn.dataset.id);
  }
  /**
   * Handle toggle button click: toggle product availability
   */
  handleToggleClick(btn) {
    const idx = btn.getAttribute('data-idx');
    this.menu[idx].is_available = !this.menu[idx].is_available;
    this.renderProductTable();
  }

  /**
   * Get category name by category_id
   */
  getCategoryName(category_id) {
    const cat = this.categories.find(c => c.category_id === category_id);
    return cat ? cat.name : '';
  }

  /**
   * Get tag names by tag_ids
   */
  getTagNames(tagIds = []) {
    return tagIds.map(id => {
      const tag = this.tags.find(t => t.tag_id === id);
      if (tag) 
        return { tag_id: tag.tag_id, name: tag.name, color: tag.color };
      else {
        console.error(`Tag with id ${id} not found`);
        return { tag_id: null, name: '', color: '#ccc' }; // Default for missing tags
      }
      
    });
  }
  
  /**
   * Delete a product by item_id after confirmation
   * @param {number} id - The item_id of the product to delete
   */
  deleteProduct(id) {
    if (confirm('Delete this product?')) {
      this.menu = this.menu.filter(p => p.item_id != id);
      this.renderProductTable();
    }
  }

  /**
   * Generate HTML for the empty menu table
   * Displays a message when no products are available
   */
  getEmptyTableHTML() {
    return `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 220px;
        color: #888;
        font-size: 1.3em;
        font-weight: bold;
        background: #f9fafb;
        border-radius: 30px;
        border: 2px dashed #e5e7eb;
        margin: 24px 0;
      ">
        <span style="font-size:2.5em; margin-bottom: 12px;">📦</span>
        No products found.
        Please click <a style="color:#2563eb;" href="#/menu/edit/0">Add Product</a> to create one!
      </div>
    `;
  }

  /**
   * Generate HTML for the product list panel
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
   * Generate HTML for the product table
   * Uses template literals for better readability
   */
  getTableHTML() {
    if (window.innerWidth <= 768) {
      // Mobile: actions fixed right
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