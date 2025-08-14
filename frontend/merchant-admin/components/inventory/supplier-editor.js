// Supplier Editor modal with material selector for mapping preferred SKUs

class SupplierEditor extends HTMLElement {
  constructor() {
    super();
    this._supplier = this.getNewSupplierTemplate();
    this._materials = [];
  }

  // --- Getters and Setters ---
  set supplier(data) { this._supplier = data || this.getNewSupplierTemplate(); }
  get supplier() { return this._supplier || this.getNewSupplierTemplate(); }
  
  set materials(data) { this._materials = data || []; }
  get materials() { return this._materials || []; }

  // --- Lifecycle methods ---
  /**
   * Called when the element is added to the DOM.
   */
  connectedCallback() {
    document.body.classList.add('modal-open');
    this.renderModal();
    this.renderEditor();
  }

  // --- Render methods ---
  /**
   * Renders the modal structure.
   * Contains a backdrop and content area.
   */
  renderModal() {
    this.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content"></div>
    `;
    this.querySelector('.modal-backdrop').onclick = () => this.close();
  }

  /**
   * Renders the editor content.
   */
  renderEditor() {
    this.querySelector('.modal-content').innerHTML = this.getEditorHTML();

    const close = () => this.close();
    this.querySelector('.modal-close-btn').onclick = close;
    this.querySelector('.cancel-btn').onclick = close;

    const catalog = this.querySelector('.catalog-list');
    this.querySelector('.add-catalog-row').onclick = () => {
      const div = document.createElement('div');
      div.innerHTML = this.getCatalogRowsHTML([]);
      const node = div.firstElementChild;
      node.dataset.idx = String(catalog.children.length);
      catalog.appendChild(node);
    };
    catalog.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-row')) {
        const row = e.target.closest('.catalog-row');
        if (row) row.remove();
      }
    });

    this.addEventListener('submit', (e) => this.handleSave(e));
    const del = this.querySelector('.delete-btn');
    if (del) del.onclick = (e) => this.handleDelete(e);
  }

  /**
   * Handles the saving of the supplier.
   * @param {Event} e - The submit event.
   */
  async handleSave(e) {
    e.preventDefault();
    this.dispatchEvent(new CustomEvent('refresh', { bubbles: true }));
    document.body.classList.remove('modal-open');
    this.remove();
  }

  /**
   * Handles the deletion of the supplier.
   */
  async handleDelete(e) {
    this.dispatchEvent(new CustomEvent('refresh', { bubbles: true }));
    document.body.classList.remove('modal-open');
    this.remove();
  }

  /**
   * Closes the modal and removes it from the DOM.
   */
  close() {
    document.body.classList.remove('modal-open');
    this.remove();
  }

  // --- Utility methods ---
  /**
   * Returns a new supplier template with default values.
   * @return {Object} New supplier object.
   */
  getNewSupplierTemplate() {
    return {
      supplier_id: null,
      name: '',
      contact_name: '',
      phone: '',
      email: '',
      address: '',
      lead_time_days: 0,
      is_active: true,
      material_catalog: []
    };
  }
  /**
   * Reads form values and constructs a supplier object.
   * @return {Object} Supplier object with form values.
   */
  readFormValues() {
    const form = this.querySelector('.supplier-form');
    const supplier = {
      supplier_id: this.supplier.supplier_id,
      name: form.name.value.trim(),
      contact_name: form.contact_name.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      address: form.address.value.trim(),
      lead_time_days: Number(form.lead_time_days.value || 0),
      is_active: form.is_active.value !== 'false',
      material_catalog: Array.from(this.querySelectorAll('.catalog-row')).map(row => ({
        material_id: Number(row.querySelector('select[name="material_id"]').value || 0) || null,
        sku: row.querySelector('input[name="sku"]').value.trim() || null,
        price: Number(row.querySelector('input[name="price"]').value || 0) || null,
        note: row.querySelector('input[name="note"]').value.trim() || null
      })).filter(r => r.material_id)
    };
    return supplier;
  }

  // --- HTML generation methods ---
  /**
   * Generates the HTML for the editor form.
   * @return {string} HTML string for the editor form.
   */
  getEditorHTML() {
    const s = this.supplier;
    const isNew = !s.supplier_id;
    return `
      <button type="button" class="modal-close-btn" aria-label="Close">×</button>
      <div class="editor-container">
        <div class="editor-header">
          <h2>${isNew ? 'New Supplier' : 'Edit Supplier'}</h2>
        </div>
        <form class="supplier-form">
          <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:12px;">
            <label>Name
              <input name="name" type="text" value="${s.name || ''}" required>
            </label>
            <label>Contact
              <input name="contact_name" type="text" value="${s.contact_name || ''}">
            </label>
            <label>Phone
              <input name="phone" type="number" value="${s.phone || ''}">
            </label>
            <label>Email
              <input name="email" type="email" value="${s.email || ''}">
            </label>
            <label style="grid-column:1/3;">Address
              <input name="address" type="text" value="${s.address || ''}">
            </label>
            <label>Lead Time (days)
              <input name="lead_time_days" type="number" min="0" value="${Number(s.lead_time_days || 0)}">
            </label>
            <label>Active
              <select name="is_active">
                <option value="true" ${s.is_active !== false ? 'selected' : ''}>Yes</option>
                <option value="false" ${s.is_active === false ? 'selected' : ''}>No</option>
              </select>
            </label>
          </div>

          <div style="margin-top:16px;">
            <h4 style="margin:12px 0 8px;">Material Catalog</h4>
            <div class="catalog-list">
              ${this.getCatalogRowsHTML(s.material_catalog)}
            </div>
            <button type="button" class="add-catalog-row" style="margin-top:8px;">+ Add Material</button>
          </div>

          <div class="form-actions">
            <button type="button" class="cancel-btn">Cancel</button>
            ${isNew ? '' : '<button type="button" class="delete-btn">Delete</button>'}
            <span style="flex:1 1 auto"></span>
            <button type="submit" class="save-btn">Save</button>
          </div>
        </form>
      </div>
    `;
  }

  /**
   * Generates the HTML for the material catalog rows.
   * @param {Array} list - The list of material catalog items.
   * @return {string} HTML string for the catalog rows.
   */
  getCatalogRowsHTML(list = []) {
    const materials = this.materials || [];
    const buildOptions = (selectedId) => materials.map(m => `<option value="${m.material_id}" ${Number(selectedId) === Number(m.material_id) ? 'selected' : ''}>${m.name} (#${m.material_id})</option>`).join('');
    if (!list || !list.length) {
      return `
        <div class="catalog-row" data-idx="0" style="display:grid;grid-template-columns:220px 1fr 120px 1fr auto;gap:8px;align-items:center;margin-bottom:8px;">
          <select name="material_id">${buildOptions(null)}</select>
          <input name="sku" type="text" placeholder="Supplier SKU">
          <input name="price" type="number" placeholder="Price" step="0.01">
          <input name="note" type="text" placeholder="Note">
          <button type="button" class="remove-row" title="Remove">×</button>
        </div>
      `;
    }
    return (list || []).map((row, idx) => `
      <div class="catalog-row" data-idx="${idx}" style="display:grid;grid-template-columns:220px 1fr 120px 1fr auto;gap:8px;align-items:center;margin-bottom:8px;">
        <select name="material_id">${buildOptions(row.material_id)}</select>
        <input name="sku" type="text" placeholder="Supplier SKU" value="${row.sku || ''}">
        <input name="price" type="number" placeholder="Price" step="0.01" value="${row.price ?? ''}">
        <input name="note" type="text" placeholder="Note" value="${row.note || ''}">
        <button type="button" class="remove-row" title="Remove">×</button>
      </div>
    `).join('');
  }
}

customElements.define('supplier-editor', SupplierEditor);
