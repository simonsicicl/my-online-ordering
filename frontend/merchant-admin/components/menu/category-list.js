// Category list component for merchant admin system

import './category-editor.js';

class CategoryList extends HTMLElement {
  // --- Data setters/getters ---
  set categories(data) {
    this._categories = data || [];
    this.renderCategoryTable();
  }
  get categories() { return this._categories || []; }

  // --- Lifecycle methods ---
  /**
   * Called when the element is added to the DOM.
   * Renders initial UI and sets up event listeners.
   */
  async connectedCallback() {
    this.render();
    this.renderCategoryTable();
    // Bind resize event to re-render table on window size change
    this._resizeHandler = () => this.renderCategoryTable();
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
   * Renders the main category list panel and table container.
   * Also binds the Add button click handler.
   */
  render() {
    this.innerHTML = this.getHTML();
    // Bind add category button event
    const addBtn = this.querySelector('#addCategoryBtn');
    if (addBtn) addBtn.onclick = () => this.openCategoryEditor();
  }

  /**
   * Renders the category table with current categories data.
   * If no data, shows empty message.
   */
  renderCategoryTable() {
    const tableContainer = this.querySelector('#category-table');
    if (!tableContainer) return;
    if (!this.categories || this.categories.length === 0) {
      tableContainer.innerHTML = this.getEmptyTableHTML();
      return;
    }
    // Responsive: table for desktop, card for mobile
    if (window.innerWidth <= 768)
      tableContainer.innerHTML = this.getMobileTableHTML();
    else
      tableContainer.innerHTML = this.getDesktopTableHTML();

    // Bind edit buttons (desktop only)
    tableContainer.querySelectorAll('.editBtn').forEach(btn => {
      btn.onclick = () => this.openCategoryEditor(btn.dataset.id);
    });

    // Mobile: bind card click for editing
    if (window.innerWidth <= 768) {
      tableContainer.querySelectorAll('.product-card').forEach(card => {
        card.onclick = () => this.openCategoryEditor(card.dataset.id);
      });
    }
  }

  // --- Event handlers ---
  /**
   * Opens the category editor modal for creating or editing a category.
   * @param {string|number} categoryId
   */
  openCategoryEditor(categoryId) {
    // Find category data if editing, or use template for new category
    const category = this.categories.find(c => String(c.category_id) === String(categoryId)) || {
      category_id: null,
      category_name: '',
      is_active: true
    };
    // Create modal
    const modal = document.createElement('category-editor');
    modal.category = { ...category };
    modal.addEventListener('close', () => modal.remove());
    modal.addEventListener('save', (e) => {
      // Save logic here
      modal.remove();
      // Optionally, refresh list
      this.dispatchEvent(new CustomEvent('refresh'));
    });
    // Append modal to this component (could also use document.body if needed)
    this.appendChild(modal);
  }

  // --- HTML generators ---
  /**
   * Returns HTML for the main category list panel.
   * @return {string}
   */
  getHTML() {
    return `
      <link rel="stylesheet" href="./components/menu/category-editor.css" />
      <div class="product-list-header">
        <h2>Category List</h2>
        <button id="addCategoryBtn" class="add-btn"><span>Add Category</span></button>
      </div>
      <div id="category-table"></div>
    `;
  }

  /**
   * Returns HTML for empty table message.
   * @return {string}
   */
  getEmptyTableHTML() {
    return `
      <div class="empty-table-message">
        <span class="empty-icon">🧩</span>
        No categories found.<br>
        Please click <a href="javascript:void(0)" id="addCategoryBtn">Add Category</a> to create one!
      </div>
    `;
  }

  /**
   * Returns HTML for the desktop category table.
   * @return {string}
   */
  getDesktopTableHTML() {
    return `
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${this.categories.map(cat => `
            <tr>
              <td>${cat.category_id}</td>
              <td>${cat.name}</td>
              <td>${cat.is_active ? '<span class="active-label">Active</span>' : '<span class="inactive-label">Inactive</span>'}</td>
              <td>
                <button class="action-btn editBtn" data-id="${cat.category_id}">Edit</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Returns HTML for the mobile category table (card layout).
   * @return {string}
   */
  getMobileTableHTML() {
    return `
      <tbody>
        ${this.categories.map(cat => `
          <tr>
            <td colspan="4" style="padding:0;">
              <div class="product-card" data-id="${cat.category_id}">
                <div class="product-card-info mobile-category-info">
                  <div class="mobile-category-row">
                    <div class="mobile-category-title-id-status">
                      <span class="product-card-title">${cat.name}</span>
                      <span class="category-id-mobile">#${cat.category_id}</span>
                      <span class="category-status-mobile">
                        ${cat.is_active ? '<span class="active-label">Active</span>' : '<span class="inactive-label">Inactive</span>'}
                      </span>
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
}

customElements.define('category-list', CategoryList);