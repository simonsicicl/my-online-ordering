// Modal to create or edit a material

import { createMaterialURL, updateMaterialURL, deleteMaterialURL } from '../../../api.js';

class MaterialEditor extends HTMLElement {
  constructor() {
    super();
    this._material = this.getNewMaterialTemplate();
  }

  // --- Getters and Setters ---
  set material(data) { this._material = data || this.getNewMaterialTemplate(); }
  get material() { return this._material || this.getNewMaterialTemplate(); }

  // --- Lifecycle methods ---
  /**
   * Called when the element is added to the DOM.
   * Sets up the modal structure and renders the editor.
   */
  connectedCallback() {
    document.body.classList.add('modal-open');
    this.renderModal();
    this.renderEditor();
  }

  // --- Render methods ---
  /**
   * Renders the modal structure.
   */
  renderModal() {
    this.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content"></div>
    `;
    this.querySelector('.modal-backdrop').onclick = () => this.handleClose();
  }

  /**
   * Renders the editor form inside the modal.
   */
  renderEditor() {
    this.querySelector('.modal-content').innerHTML = this.getEditorHTML();

    this.querySelector('.modal-close-btn').onclick = () => this.handleClose();
    this.querySelector('.cancel-btn').onclick = () => this.handleClose();

    this.querySelector('.delete-btn').onclick = () => this.handleDelete();

    this.querySelector('.material-form').onsubmit = async (e) => this.handleSave(e);
  }

  // --- Event handlers ---
  /**
   * Handles the form submission to save the material.
   */
  async handleSave(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const payload = {
      name: form.name.value.trim(),
      unit: form.unit.value,
      stock_quantity: Number(form.stock_quantity.value || 0),
      min_stock_alert: Number(form.min_stock_alert.value || 0),
      is_active: !!form.is_active.checked
    };
    try {
      const isUpdate = !!this.material.material_id;
      const url = isUpdate ? updateMaterialURL(this.material.material_id) : createMaterialURL();
      const method = isUpdate ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      console.log('Material saved successfully, response:', res);
      window.dispatchEvent(new CustomEvent('inventory:refresh'));
      this.handleClose();
    } catch (err) {
      console.error('Save material failed', err);
      alert('Failed to save material');
    }
  }

  /**
   * Handles the deletion of the material.
   * Confirms with the user before proceeding.
   */
  async handleDelete() {
    try {
      const id = this.material?.material_id;
      if (!id) { this.handleClose(); return; }
      const ok = confirm('Delete this material? This cannot be undone.');
      if (!ok) return;
      const res = await fetch(deleteMaterialURL(id), { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      window.dispatchEvent(new CustomEvent('inventory:refresh'));
      this.handleClose();
    } catch (err) {
      console.error('Delete material failed', err);
      alert('Failed to delete material');
    }
  }

  /**
   * Closes the modal and removes it from the DOM.
   */
  handleClose() {
    document.body.classList.remove('modal-open');
    this.remove();
  }

  // --- Helper methods ---
  /**
   * Returns a new material template with default values.
   * @return {Object} New material object.
   */
  getNewMaterialTemplate() {
    return {
      name: '',
      unit: 'g',
      stock_quantity: 0,
      min_stock_alert: 0,
      is_active: true
    };
  }

  /**
   * Returns the HTML structure for the editor form.
   * @return {string} HTML string for the editor.
   */
  getEditorHTML() {
    const m = this.material;
    return `
    <div class="editor-container">
      <div class="editor-header">
        <h2>${m.material_id ? 'Edit' : 'New'} Material</h2>
        <button type="button" class="modal-close-btn" aria-label="Close">×</button>
      </div>
      <form class="material-form">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <label>Name
            <input name="name" type="text" value="${m.name || ''}" required>
          </label>
          <label>Unit
            <select name="unit">
              ${['g','ml','pcs','kg','l'].map(u=>`<option value="${u}" ${m.unit===u?'selected':''}>${u}</option>`).join('')}
            </select>
          </label>
          <label>Stock Quantity
            <input name="stock_quantity" type="number" step="0.01" value="${Number(m.stock_quantity||0)}">
          </label>
          <label>Min Stock Alert
            <input name="min_stock_alert" type="number" step="0.01" value="${Number(m.min_stock_alert||0)}">
          </label>
          <label style="grid-column:1 / -1;display:flex;align-items:center;gap:8px;">
            <input name="is_active" type="checkbox" ${m.is_active!==false?'checked':''}> Active
          </label>
        </div>
        <div class="form-actions">
          ${m.material_id ? '<button type="button" class="delete-btn">Delete</button>' : ''}
          <button type="button" class="cancel-btn">Cancel</button>
          <button type="submit" class="save-btn">Save</button>
        </div>
      </form>
    `;
  }
}

customElements.define('material-editor', MaterialEditor);
