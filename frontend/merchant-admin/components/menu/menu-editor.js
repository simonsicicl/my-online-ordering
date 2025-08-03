// Product editor component for merchant admin system
// Supports universal (global) and custom (local) option groups per new data structure.

import './combo-group-editor.js';
import './option-group-editor.js';

class MenuEditor extends HTMLElement {
  // --- Data setters/getters ---
  set menu(data) { this._menu = data || []; }
  set categories(data) { this._categories = data || []; }
  set tags(data) { this._tags = data || []; }
  set option_groups(data) { this._option_groups = data || []; }

  get menu() { return this._menu || []; }
  get categories() { return this._categories || []; }
  get tags() { return this._tags || []; }
  get option_groups() { return this._option_groups || []; }

  // --- Lifecycle methods ---
  connectedCallback() {
    this.itemId = this.getAttribute('id');
    this.product = this.itemId === "0" ? this.getNewProductTemplate() : this.getProductCopyById(this.itemId);
    if (!this.product) {
      this.innerHTML = `<h2>Product Editor</h2><p>Product not found.</p>`;
      return;
    }
    this.render();
  }

  // --- Render methods ---
  render() {
    const product = this.product;
    const itemId = this.itemId;
    this.innerHTML = this.getHTML(product);
    const title = itemId === "0" ? 'New Product' : `Editing: ${product.name}`;
    this.querySelector('h2').textContent = title;

    // Bind form events
    const form = this.querySelector('#editorForm');
    if (form) form.onsubmit = (e) => this.saveEventHandler(e, product);

    const cancelBtn = this.querySelector('#cancelBtn');
    if (cancelBtn) cancelBtn.onclick = (e) => this.cancelEventHandler(e);

    // Dynamically insert option or combo editor based on product type
    const detailSection = this.querySelector('#editor-detail-section');
    if (product.is_combo) {
      const comboEditor = document.createElement('combo-group-editor');
      comboEditor.id = 'comboEditor';
      comboEditor.value = product;
      comboEditor.menu = this.menu;
      comboEditor.addEventListener('change', e => {
        product.combo_item_groups = e.combo_item_groups || product.combo_item_groups;
      });
      detailSection.innerHTML = ''; // Clear previous content
      detailSection.appendChild(comboEditor);
    } else {
      const optionEditor = document.createElement('option-group-editor');
      optionEditor.id = 'optionEditor';
      optionEditor.value = product;
      optionEditor.optionGroups = this.option_groups;
      optionEditor.addEventListener('change', e => {
        product.option_groups = e.option_groups || product.option_groups;
      });
      detailSection.innerHTML = ''; // Clear previous content
      detailSection.appendChild(optionEditor);
    }

    // Can switch between combo and single item only for new products
    const isComboCheckbox = this.querySelector('#is_combo');
    if (isComboCheckbox && product.item_id === 0) {
      isComboCheckbox.onchange = () => {
        product.is_combo = isComboCheckbox.checked;
        this.render();
      };
    }
  }

  // --- Utility methods ---
  formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return isNaN(d) ? '-' : d.toLocaleString();
  }

  // --- Event handlers ---
  saveEventHandler(e, product) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updatedProduct = { ...product, ...Object.fromEntries(formData) };
    this.dispatchEvent(new CustomEvent('save', { detail: updatedProduct }));
  }
  cancelEventHandler(e) {
    e.preventDefault();
    window.location.hash = '/menu';
  }

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
      is_optional: true,
      created_at: now,
      updated_at: now,
      option_groups: [],
      combo_item_groups: []
    };
  }

  getProductCopyById(id) {
    const original = this._menu.find(p => String(p.item_id) === String(id));
    return original ? JSON.parse(JSON.stringify(original)) : this.getNewProductTemplate();
  }

  // --- HTML template for the editor ---
  /**
   * Generates the HTML for the product editor.
   * @param {Object} product - The product data to edit.
   * @returns {string} The HTML string for the product editor.
   */ 
  getHTML(product) {
    const isNew = product.item_id === 0;
    return `
      <link rel="stylesheet" href="./components/menu/menu-editor.css">
      <div class="editor-container">
        <h2>Product Editor</h2>
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
                  ${this._categories.map(cat =>
                    `<option value="${cat.category_id}" ${cat.category_id === product.category_id ? 'selected' : ''}>${cat.name}</option>`
                  ).join('')}
                </select>
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
                ${this._tags.map(tag =>
                  `<label>
                    <input type="checkbox" value="${tag.tag_id}" ${product.tags.includes(tag.tag_id) ? 'checked' : ''}>
                    <span class="tag-badge" style="background:${tag.color};">${tag.name}</span>
                  </label>`
                ).join('')}
              </label>
            </section>
            <section class="editor-section">
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