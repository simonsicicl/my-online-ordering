// Product list component for merchant admin system

import {updateMenuItemURL } from '../../../api.js';
import './menu-editor.js';

class MenuList extends HTMLElement {
  constructor() {
    super();
    this._menu = [];
    this._categories = [];
    this._tags = [];
  }
  
  // --- Data setters/getters ---
  set menu(data) { this._menu = data || []; }
  set categories(data) { this._categories = data || []; }
  set tags(data) { this._tags = data || []; }
  set option_groups(data) { this._option_groups = data || []; }
  set option_list(data) { this._option_list = data || []; }

  get menu() { return this._menu || []; }
  get categories() { return this._categories || []; }
  get tags() { return this._tags || []; }
  get option_groups() { return this._option_groups || []; }
  get option_list() { return this._option_list || []; }

  // --- Lifecycle methods ---
  /**
   * Called when the element is added to the DOM.
   * Renders initial UI and sets up event listeners.
   */
  connectedCallback() {
    this._isReady = false;
    this.render();
    this.renderProductTable();
    // Bind resize event to re-render table on window size change
    this._resizeHandler = () => this.handleResize();
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
    if (!this.menu) {
      tableContainer.innerHTML = '<div>Loading...</div>';
      return;
    }
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
    this._lastIsMobile = window.innerWidth <= 768;
    // 手機模式下，卡片點擊即編輯
    if (this._lastIsMobile) {
      table.querySelectorAll('.product-card').forEach(card => {
        card.onclick = () => this.handleEditClick({ dataset: { id: card.dataset.id } });
      });
    }
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
    const itemId = btn.dataset.id;
    const modal = document.createElement('menu-editor');
    modal.menu = this.menu;
    modal.categories = this.categories;
    modal.tags = this.tags;
    modal.option_groups = this.option_groups;
    modal.option_list = this.option_list;
    modal.itemId = itemId;
    modal.addEventListener('save', e => {
      this.dispatchEvent(new CustomEvent('refresh'));
      modal.close();
    });
    // document.body.appendChild(modal);
    this.appendChild(modal);
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
  async handleToggleClick(btn) {
    const idx = btn.getAttribute('data-idx');
    const product = this.menu[idx];
    // Toggle availability locally
    product.is_available = !product.is_available;
    this.renderProductTable();

    // Send update to backend
    try {
      const res = await fetch(
        updateMenuItemURL(product.item_id),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_available: product.is_available })
        }
      );
      if (!res.ok)
        throw new Error('Failed to update availability');
    } catch (err) {
      alert('Failed to update product availability!');
      // Revert UI if backend update fails
      product.is_available = !product.is_available;
      this.renderProductTable();
    }
  }

  handleResize () {
    // Re-render product table on window resize
    // if (this._lastIsMobile !== (window.innerWidth <= 768)) {
    //   console.log('Mobile mode changed:', window.innerWidth <= 768);
    //   this.renderProductTable();
    // }
  }

  // --- Utility methods ---
  /**
   * Gets category name by category_id.
   * @param {number} category_id
   * @return {string}
   */
  getCategoryName(category_id) {
    // Find category name by id
    const cat = this.categories.find(c => String(c.category_id) === String(category_id));
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
      <link rel="stylesheet" href="./components/menu/menu-editor.css" />
      <div class="product-list-header">
        <h2>Product List</h2>
        <button id="addBtn" class="add-btn"><span>Add Product</span></button>
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
              <div class="product-card" data-id="${item.item_id}">
                <img src="${item.image_url}" alt="${item.name}" class="product-card-img">
                <div class="product-card-info product-card-info-mobile">
                  <div class="product-card-row">
                    <div class="product-card-main">
                      <div class="product-card-title">
                        ${item.name}
                        ${!item.is_available ? `<span class="product-card-unavailable">Unavailable</span>` : ''}
                      </div>
                      <div class="product-card-category-tags">
                        <span class="product-card-category">${this.getCategoryName(item.category_id)}</span>
                        <span class="product-card-tags">
                          ${this.getTagNames(item.tags).map(tag => 
                            `<span class="tag-badge" style="color:${tag.color};">${tag.name}</span>`
                          ).join('')}
                        </span>
                      </div>
                    </div>
                    <div class="product-card-side">
                      <div class="product-card-price">$${item.price}</div>
                    </div>
                  </div>
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