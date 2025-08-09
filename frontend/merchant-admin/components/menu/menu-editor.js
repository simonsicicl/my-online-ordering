// Modal-style Product Editor for merchant admin system
// Uses a shared product object reference across MenuEditor, ComboGroupEditor, and OptionGroupSelector.
// Child components mutate product in-place; no change events are required for data sync.

import './combo-group-editor.js';
import './option-group-selector.js';

import {
  createMenuItemURL,
  updateMenuItemURL,
  deleteMenuItemURL
} from '../../../api.js';

class MenuEditor extends HTMLElement {
  // --- Data setters/getters ---
  /**
   * Full menu list, used by combo editor to populate item dropdowns.
   * @param {Array<Object>} data
   */
  set menu(data) { this._menu = data || []; }
  get menu() { return this._menu || []; }

  /**
   * Available categories for products.
   * @param {Array<{category_id:number,name:string}>} data
   */
  set categories(data) { this._categories = data || []; }
  get categories() { return this._categories || []; }

  /**
   * Available tags for products.
   * @param {Array<{tag_id:number,name:string,color:string}>} data
   */
  set tags(data) { this._tags = data || []; }
  get tags() { return this._tags || []; }

  /**
   * Option group definitions (group metadata).
   * @param {Array<Object>} data
   */
  set option_groups(data) { this._option_groups = data || []; }
  get option_groups() { return this._option_groups || []; }

  /**
   * Flat option list used to display option names per group.
   * @param {Array<Object>} data
   */
  set option_list(data) { this._option_list = data || []; }
  get option_list() { return this._option_list || []; }

  /**
   * The product being edited. Falls back to a new product template if not provided.
   * @param {Object} data
   */
  set product(data) { this._product = data || this.getNewProductTemplate(); }
  get product() { return this._product || this.getNewProductTemplate(); }

  /**
   * Current item id (string) used to decide create vs update.
   * Use "0" for new product.
   * @param {string} id
   */
  set itemId(id) { this._itemId = id || "0"; }
  get itemId() { return this._itemId || "0"; }

  // --- Lifecycle methods ---
  /**
   * Called when the element is added to the DOM.
   * - Renders modal shell
   * - Loads product data (clone existing or create new template)
   * - Renders the editor form
   */
  async connectedCallback() {
    this.renderModal();

    // Load product for edit or create new
    this._itemId = this._itemId || "0";
    if (this._itemId !== "0") {
      // Deep clone to avoid mutating original menu collection while editing
      this.product = JSON.parse(JSON.stringify(
        this.menu.find(item => item.item_id === Number(this._itemId))
      ));
    } else {
      this.product = this.getNewProductTemplate();
    }

    // Handle missing product gracefully
    if (!this.product) {
      this.querySelector('.modal-content').innerHTML = `<h2>Product Editor</h2><p>Product not found.</p>`;
      return;
    }

    this.renderEditor();
  }

  // --- Render methods ---
  /**
   * Renders modal backdrop and content container and binds backdrop close.
   */
  renderModal() {
    this.innerHTML = this.getHTML();
    this.querySelector('.modal-backdrop').onclick = () => this.close();
  }

  /**
   * Renders the product editor form and binds all UI events.
   * - Binds header/close/cancel
   * - Updates image preview on input
   * - Binds form submit/delete
   * - Sets up tag dropdown
   * - Mounts either ComboGroupEditor or OptionGroupSelector with shared product reference
   */
  renderEditor() {
    const product = this.product;
    const isNew = product.item_id === 0;

    // Inject form HTML
    this.querySelector('.modal-content').innerHTML = this.getEditorHTML(isNew, product);

    // Close (X) button
    this.querySelector('#closeBtn').onclick = () => this.close();

    // Cancel button
    const cancelBtn = this.querySelector('#cancelBtn');
    if (cancelBtn) cancelBtn.onclick = (e) => {
      e.preventDefault();
      this.close();
    };

    // Image preview live update
    const imgInput = this.querySelector('#image_url');
    if (imgInput) {
      imgInput.oninput = () => {
        this.querySelector('#imgPreview').src = imgInput.value;
      };
    }

    // Form submit
    const form = this.querySelector('#editorForm');
    if (form) form.onsubmit = (e) => this.saveEventHandler(e, product);

    // Delete (only for existing products)
    const deleteBtn = this.querySelector('#deleteBtn');
    if (deleteBtn) deleteBtn.onclick = (e) => this.deleteEventHandler(e, product);

    // Tag dropdown behavior
    const tagDropdown = this.querySelector('.tag-dropdown');
    if (tagDropdown) {
      const btn = tagDropdown.querySelector('.tag-dropdown-btn');
      const content = tagDropdown.querySelector('.tag-dropdown-content');
      btn.onclick = (e) => this.handleTagDropdownButtonClick(e);
      content.onclick = e => e.stopPropagation(); // keep dropdown open while interacting inside
    }

    // Detail section: mount option or combo editor
    const detailSection = this.querySelector('#editor-detail-section');
    if (detailSection) {
      detailSection.innerHTML = '';
      if (product.is_combo) {
        // Combo editor uses menu list and the same product reference
        const comboEditor = document.createElement('combo-group-editor');
        comboEditor.menu = this.menu;
        comboEditor.product = product;
        detailSection.appendChild(comboEditor);
      } else {
        // Option selector uses option groups/list and the same product reference
        const optionSelector = document.createElement('option-group-selector');
        optionSelector.optionGroups = this.option_groups;
        optionSelector.optionList = this.option_list;
        optionSelector.product = product;
        detailSection.appendChild(optionSelector);
      }
    }
  }

  // --- Event handlers ---
  /**
   * Handles product deletion:
   * - Confirms with user
   * - Sends DELETE to server
   * - Emits 'delete' event with item_id
   * - Closes the modal
   * @param {Event} e
   * @param {Object} product
   */
  async deleteEventHandler(e, product) {
    e.preventDefault();
    if (!product.item_id) return;
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const res = await fetch(deleteMenuItemURL(product.item_id), {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete product');
      const result = await res.json();
      console.log('Product deleted successfully!', result); // debug/log
    } catch (err) {
      alert('Failed to delete product!');
      console.error('Error deleting product:', err);
    }

    // Notify parent even if server failed; adjust if you prefer stricter behavior
    this.dispatchEvent(new CustomEvent('delete', { detail: product.item_id }));
    this.close();
  }

  /**
   * Handles form submission:
   * - Merges form data into product clone
   * - Normalizes booleans and numbers
   * - Preserves is_combo when the checkbox is disabled (existing products)
   * - Sends to server (POST for create, PUT for update)
   * - Emits 'save' event with response payload
   * - Closes the modal
   * @param {Event} e
   * @param {Object} product
   */
  async saveEventHandler(e, product) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const dto = Object.fromEntries(formData);

    // Merge form data into a product-shaped object (do not mutate the original directly)
    const updatedProduct = { ...product, ...dto };

    // Normalize booleans and numbers
    // is_available: present only when checked; treat missing as false
    updatedProduct.is_available = !!formData.get('is_available');

    // is_combo: checkbox is disabled for existing products; when disabled it won't be in formData
    updatedProduct.is_combo = formData.has('is_combo')
      ? !!formData.get('is_combo')
      : product.is_combo;

    updatedProduct.price = Number(formData.get('price')) || 0;
    updatedProduct.category_id = Number(formData.get('category_id')) || 0;

    // Tags: read from visible tag checkbox list
    updatedProduct.tags = Array.from(
      this.querySelectorAll('.tag-list input[type="checkbox"]:checked')
    ).map(cb => Number(cb.value));

    // Option/Combo groups: rely on child editors mutating the shared product reference
    if (product.is_combo) {
      updatedProduct.combo_item_groups = product.combo_item_groups || [];
    } else {
      updatedProduct.option_groups = product.option_groups || [];
    }

    // Decide endpoint/method
    let url, method, saved;
    if (this.itemId === "0" || updatedProduct.item_id === 0) {
      url = createMenuItemURL();
      method = 'POST';
    } else {
      url = updateMenuItemURL(updatedProduct.item_id);
      method = 'PUT';
    }

    // Send to server
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProduct)
      });
      if (!res.ok) throw new Error('Failed to save product');
      saved = await res.json();
      console.log(`Product ${(this.itemId === "0" || updatedProduct.item_id === 0) ? 'created' : 'updated'} successfully!`, saved); // debug/log
    } catch (err) {
      alert('Failed to save product!');
      console.error('Error saving product:', err);
    }

    // Emit save event and close
    this.dispatchEvent(new CustomEvent('save', { detail: saved }));
    this.close();
  }

  /**
   * Toggles the tag dropdown visibility; clicking inside should not close it.
   * @param {Event} e
   */
  handleTagDropdownButtonClick(e) {
    e.stopPropagation();
    const content = this.querySelector('.tag-dropdown-content');

    // Simple toggle; global outside-click handler can be added if desired
    if (content.style.display === 'block') {
      content.style.display = 'none';
    } else {
      content.style.display = 'block';
    }
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
   * Formats a date string for display or returns '-' if invalid/empty.
   * @param {string} dateStr
   * @return {string}
   */
  formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return isNaN(d) ? '-' : d.toLocaleString();
  }

  /**
   * Closes the modal and emits a 'close' event.
   */
  close() {
    this.remove();
    this.dispatchEvent(new CustomEvent('close'));
  }

  // --- HTML generators ---
  /**
   * Returns modal container HTML.
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
   * @param {boolean} isNew Whether this is a new product (no item_id yet)
   * @param {Object} product Product data to edit
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
                <div class="custom-dropdown tag-dropdown">
                  <button class="custom-dropdown-btn tag-dropdown-btn" type="button">Select Tags</button>
                  <div class="custom-dropdown-content tag-dropdown-content" style="display:none;">
                    ${this.tags.map(tag =>
                      `<label>
                        <input type="checkbox" value="${tag.tag_id}" ${product.tags.includes(tag.tag_id) ? 'checked' : ''}>
                        <span class="tag-badge" style="background:${tag.color};">${tag.name}</span>
                      </label>`
                    ).join('')}
                  </div>
                </div>
              </label>
            </section>
            <section class="editor-section">
              <!-- Option group / combo group editor mounts here -->
              <div id="editor-detail-section"></div>
            </section>
          </div>
          <div class="form-actions">
            ${!isNew ? `<button type="button" id="deleteBtn" class="delete-btn">Delete</button>` : ''}
            <button type="button" id="cancelBtn" class="cancel-btn">Cancel</button>
            <button type="submit" class="save-btn">Save</button>
          </div>
        </form>
      </div>
    `;
  }
}

customElements.define('menu-editor', MenuEditor);

