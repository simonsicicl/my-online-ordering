// Modal-style Product Editor for merchant admin system

import {
  createMenuItemURL,
  updateMenuItemURL
} from '../../../api.js';

class MenuEditor extends HTMLElement {
  // --- Data setters/getters ---
  set menu(data) { this._menu = data || []; }
  set categories(data) { this._categories = data || []; }
  set tags(data) { this._tags = data || []; }
  set option_groups(data) { this._option_groups = data || []; }
  set option_list(data) { this._option_list = data || []; }
  set product(data) { this._product = data || this.getNewProductTemplate(); }
  set itemId(id) { this._itemId = id || "0"; }

  get menu() { return this._menu || []; }
  get categories() { return this._categories || []; }
  get tags() { return this._tags || []; }
  get option_groups() { return this._option_groups || []; }
  get option_list() { return this._option_list || []; }
  get product() { return this._product || this.getNewProductTemplate(); }
  get itemId() { return this._itemId || "0"; }

  // --- Lifecycle methods ---
  /**
   * Called when the element is added to the DOM.
   * Renders modal and loads product data for editing or new product.
   */
  async connectedCallback() {
    this.renderModal();
    // Load product data for editing, or use template for new product
    this._itemId = this.getAttribute('id') || this._itemId || "0";
    if (this._itemId !== "0") {
      // Deep clone to avoid mutating original menu data
      this.product = JSON.parse(JSON.stringify(this.menu.find(item => item.item_id === Number(this._itemId))));
    } else {
      this.product = this.getNewProductTemplate();
    }
    // If product not found, show error
    if (!this.product) {
      this.querySelector('.modal-content').innerHTML = `<h2>Product Editor</h2><p>Product not found.</p>`;
      return;
    }
    this.renderEditor();
  }

  /**
   * Renders modal backdrop and content container.
   * Binds backdrop click to close modal.
   */
  renderModal() {
    this.innerHTML = this.getHTML();
    this.querySelector('.modal-backdrop').onclick = () => this.close();
  }

  /**
   * Renders the product editor form and binds all UI events.
   */
  renderEditor() {
    const product = this.product;
    const isNew = product.item_id === 0;
    this.querySelector('.modal-content').innerHTML = this.getEditorHTML(isNew, product);

    // Bind close button event
    this.querySelector('#closeBtn').onclick = () => this.close();

    // Bind cancel button event
    const cancelBtn = this.querySelector('#cancelBtn');
    if (cancelBtn) cancelBtn.onclick = (e) => {
      e.preventDefault();
      this.close();
    };

    // Bind image preview update on input
    const imgInput = this.querySelector('#image_url');
    if (imgInput) {
      imgInput.oninput = () => {
        this.querySelector('#imgPreview').src = imgInput.value;
      };
    }

    // Bind form submit event
    const form = this.querySelector('#editorForm');
    if (form) form.onsubmit = (e) => this.saveEventHandler(e, product);
  }

  // --- Event handlers ---
  /**
   * Handles form submission, prepares data, and sends to server.
   * Dispatches 'save' event on success.
   * @param {Event} e
   * @param {Object} product
   */
  async saveEventHandler(e, product) {
    e.preventDefault();
    const formData = new FormData(e.target);
    // Merge form data into product object
    const updatedProduct = { ...product, ...Object.fromEntries(formData) };
    updatedProduct.is_available = !!formData.get('is_available');
    updatedProduct.is_combo = !!formData.get('is_combo');
    updatedProduct.price = Number(formData.get('price')) || 0;
    updatedProduct.category_id = Number(formData.get('category_id')) || 0;
    updatedProduct.tags = Array.from(this.querySelectorAll('.tag-list input[type="checkbox"]:checked')).map(cb => Number(cb.value));

    // Determine API endpoint and HTTP method
    let url, method;
    if (this.itemId === "0" || updatedProduct.item_id === 0) {
      url = createMenuItemURL();
      method = 'POST';
    } else {
      url = updateMenuItemURL(updatedProduct.item_id);
      method = 'PUT';
    }

    // Send data to server and handle response
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProduct)
      });
      if (!res.ok) throw new Error('Failed to save product');
      const saved = await res.json();
      console.log(`Product ${(this.itemId === "0" || updatedProduct.item_id === 0) ? 'created' : 'updated'} successfully!`, saved); // TEST
    } catch (err) {
      alert('Failed to save product!');
      console.error('Error saving product:', err);
    }
      // Dispatch save event with saved product data
    this.dispatchEvent(new CustomEvent('save'));
    this.close();
  }

  // --- Utility methods ---
  /**
   * Returns a template object for a new product.
   * @return {Object}
   */
  getNewProductTemplate() {
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
      is_optional: true,
      option_groups: [],
      combo_item_groups: []
    };
  }

  /**
   * Formats a date string for display.
   * @param {string} dateStr
   * @return {string}
   */
  formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return isNaN(d) ? '-' : d.toLocaleString();
  }

  /**
   * Closes the modal and dispatches a 'close' event.
   */
  close() {
    this.remove();
    this.dispatchEvent(new CustomEvent('close'));
  }

  // --- HTML generators ---
  /**
   * Returns modal HTML structure.
   * @return {string}
   */
  getHTML() {
    return `
      <div class="modal-backdrop"></div>
      <div class="modal-content"></div>
    `;
  }

  /**
   * Returns the editor form HTML.
   * @param {boolean} isNew
   * @param {Object} product
   * @return {string}
   */
  getEditorHTML(isNew, product) {
    return `
      <div class="editor-container">
        <div class="editor-header">
          <h2>${isNew ? 'New Product' : `Editing: ${product.name}`}</h2>
          <button class="modal-close-btn" id="closeBtn" title="Close">&times;</button>
        </div>
        <form id="editorForm">
          <div class="editor-sections">
            <section class="editor-section">
              <div style="margin-bottom:16px;">
                <div><strong>Created At:</strong> ${this.formatDate(product.created_at)}</div>
                <div><strong>Last Modified:</strong> ${this.formatDate(product.updated_at)}</div>
              </div>
              <label>
                Name:
                <input type="text" id="name" name="name" value="${product.name}" required>
              </label>
              <label>
                Price:
                <input type="number" id="price" name="price" value="${product.price}" required>
              </label>
              <label>
                Category:
                <select id="category" name="category_id">
                  ${this.categories.map(cat =>
                    `<option value="${cat.category_id}" ${cat.category_id === product.category_id ? 'selected' : ''}>${cat.name}</option>`
                  ).join('')}
                </select>
              </label>
              <label>
                Image URL:
                <div class="image-url-row">
                  <textarea id="image_url" name="image_url" rows="3" style="resize:vertical;">${product.image_url}</textarea>
                  <img id="imgPreview" src="${product.image_url}" alt="Preview">
                </div>
              </label>
              <label>
                Description:
                <textarea id="description" name="description">${product.description}</textarea>
              </label>
              ${isNew ? `
              <label>
                <input type="checkbox" id="is_combo" name="is_combo" ${product.is_combo ? 'checked' : ''}>
                Combo (Check for combo, uncheck for single product)
              </label>
              ` : `
              <label>
                <input type="checkbox" id="is_combo" name="is_combo" ${product.is_combo ? 'checked' : ''} disabled>
                Combo (Available only for new products)
              </label>
              `}
              <label>
                Available:
                <input type="checkbox" id="is_available" name="is_available" ${product.is_available ? 'checked' : ''}>
              </label>
              <label class="tag-list">
                Tags:<br>
                ${this.tags.map(tag =>
                  `<label>
                    <input type="checkbox" value="${tag.tag_id}" ${product.tags.includes(tag.tag_id) ? 'checked' : ''}>
                    <span class="tag-badge" style="background:${tag.color};">${tag.name}</span>
                  </label>`
                ).join('')}
              </label>
            </section>
            <section class="editor-section">
              <!-- Option group/combo group editor can be expanded here -->
              <div id="editor-detail-section"></div>
            </section>
          </div>
          <div class="form-actions">
            <button type="button" id="cancelBtn" class="cancel-btn">Cancel</button>
            <button type="submit" class="save-btn">Save</button>
          </div>
        </form>
      </div>
    `;
  }
}

customElements.define('menu-editor', MenuEditor);