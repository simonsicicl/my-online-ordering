// Product editor component for merchant admin system

class MenuEditor extends HTMLElement {
  set menu(data) { this._menu = data || []; }
  set categories(data) { this._categories = data || []; }
  set tags(data) { this._tags = data || []; }

  get menu() { return this._menu || []; }
  get categories() { return this._categories || []; }
  get tags() { return this._tags || []; }

    /**
   * Lifecycle method called when the element is added to the DOM
   */
  connectedCallback() {
    this.renderEditor();
  }
  /**
   * Render the product editor UI based on the current item_id
   * If item_id is "0", it creates a new product template.
   * Otherwise, it fetches the product data by item_id.
   */
  renderEditor() {
    const itemId = this.getAttribute('id');
    let product = itemId === "0" ? this.getNewProductTemplate() : this.getProductById(itemId);
    if (!product) {
      this.innerHTML = `<h2>Product Editor</h2><p>Product not found.</p>`;
      return;
    }
    this.innerHTML = this.getHTML(product);
    // Set the title based on whether it's a new product or editing existing
    const title = itemId === "0" ? 'New Product' : `Editing: ${product.name}`;
    this.querySelector('h2').textContent = title;
    // Bind form submit and cancel button
    const form = this.querySelector('#editorForm');
    if (form) form.onsubmit = (e) => this.saveEventHandler(e, product);

    const cancelBtn = this.querySelector('#cancelBtn');
    if (cancelBtn) cancelBtn.onclick = (e) => this.cancelEventHandler(e);
  }

  /**
   * Handle form submission to save product data
   * @param {Event} e - The submit event
   * @param {Object} product - The current product data being edited
   * * This method gathers form input values, updates the product object,
   * and dispatches a custom 'save' event with the updated product data.
   */
  saveEventHandler(e, product) {
    e.preventDefault();
    const now = new Date().toISOString();
    const updated = {
      ...product,
      name: this.querySelector('#name').value,
      price: Number(this.querySelector('#price').value),
      category_id: Number(this.querySelector('#category').value),
      description: this.querySelector('#description').value,
      is_available: this.querySelector('#is_available').checked,
      tags: Array.from(this.querySelectorAll('input[type="checkbox"][value]'))
        .filter(cb => cb.checked)
        .map(cb => Number(cb.value)),
      updated_at: now,
      created_at: product.created_at || now
    };
    this.dispatchEvent(new CustomEvent('save', { detail: updated }));
  }
  /**
   * Handle cancel button click: navigate back to menu list
   * @param {Event} e - The click event
   * This method changes the window location hash to navigate back to the menu list.
   */
  cancelEventHandler(e) {
    window.location.hash = '/menu/list';
  }
  /**
   * Get a new product template with default values
   * @return {Object} The new product template object
   * This method returns a product object with default values for creating a new product.
   * It includes fields like item_id, name, price, category_id, availability status, and timestamps.
   */
  getNewProductTemplate() {
    const now = new Date().toISOString();
    return {
      item_id: 0,
      name: '',
      price: 0,
      category_id: 0,
      is_available: true,
      image_url: '',
      tags: [],
      description: '',
      is_combo: false,
      is_optional: false,
      created_at: now,
      updated_at: now,
      option_groups: []
    };
  }
  /**
   * Get product by item_id from the menu
   * @param {number} id - The item_id of the product to retrieve
   * @return {Object|null} The product object or null if not found
   * This method searches the menu for a product with the specified item_id.
   * If found, it returns the product object; otherwise, it returns null.
   */
  getProductById(id) {
    return this._menu.find(p => String(p.item_id) === String(id));
  }


  /**
   * Generate HTML for the product editor form
   * @param {Object} product - The product data
   * @returns {string} The HTML string for the form
   */
  getHTML(product) {
    // Format date for display
    const formatDate = (dateStr) => {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      return isNaN(d) ? '-' : d.toLocaleString();
    };

    return `
      <link rel="stylesheet" href="./components/menu/menu-editor.css" />
      <div class="editor-container">
        <h2>Product Editor</h2>
        <form id="editorForm">
          <div class="editor-sections">
            <section class="editor-section">
              <div style="margin-bottom:16px;">
                <div><strong>Created At:</strong> ${formatDate(product.created_at)}</div>
                <div><strong>Last Modified:</strong> ${formatDate(product.updated_at)}</div>
              </div>
              <label>
                Name:
                <input type="text" id="name" value="${product.name}" required>
              </label>
              <label>
                Price:
                <input type="number" id="price" value="${product.price}" required>
              </label>
              <label>
                Category:
                <select id="category">
                  ${this._categories.map(cat =>
                    `<option value="${cat.category_id}" ${cat.category_id === product.category_id ? 'selected' : ''}>${cat.name}</option>`
                  ).join('')}
                </select>
              </label>
              <label>
                Description:
                <textarea id="description">${product.description}</textarea>
              </label>
            </section>
            <section class="editor-section">
              <label>
                Available:
                <input type="checkbox" id="is_available" ${product.is_available ? 'checked' : ''}>
              </label>
              <label class="tag-list">
                Tags:<br>
                ${this._tags.map(tag =>
                  `<label>
                    <input type="checkbox" value="${tag.tag_id}" ${product.tags.includes(tag.tag_id) ? 'checked' : ''}>
                    <span class="tag-badge" style="background:${tag.color};">${tag.name}</span>
                  </label>`
                ).join('')}
              </label>
              <div class="form-actions">
                <button type="submit" class="save-btn">Save</button>
                <button type="button" id="cancelBtn" class="cancel-btn">Cancel</button>
              </div>
            </section>
          </div>
        </form>
      </div>
    `;
  }
}



customElements.define('menu-editor', MenuEditor);