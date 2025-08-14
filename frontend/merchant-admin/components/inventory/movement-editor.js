// Modal to create a manual inventory movement (adjust up/down, waste, etc.)

import { createMovementURL } from '../../../api.js';

class MovementEditor extends HTMLElement {
  constructor() {
    super();
  }

  // --- Lifecycle methods ---
  /**
   * Called when the element is added to the DOM.
   * Sets up the modal and renders the editor.
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
    this.querySelector('.modal-backdrop').onclick = () => this.handleClose();
  }

  /**
   * Renders the editor form inside the modal.
   */
  renderEditor() {
    this.querySelector('.modal-content').innerHTML = this.getEditorHTML();

    this.querySelector('.modal-close-btn').onclick = () => this.handleClose();
    this.querySelector('.cancel-btn').onclick = () => this.handleClose();

    this.querySelector('.movement-form').onsubmit = async (e) => this.handleSave(e);
  }

  // --- Event handlers ---
  /**
   * Handles the form submission for saving a movement.
   * Sends a POST request to create the movement.
   * @param {Event} e - The submit event.
   */
  async handleSave(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const payload = {
      material_id: Number(form.material_id.value),
      movement_type: form.movement_type.value,
      quantity: Number(form.quantity.value),
      note: form.note.value || null
    };
    try {
      const res = await fetch(createMovementURL(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      window.dispatchEvent(new CustomEvent('inventory:refresh'));
      this.handleClose();
    } catch (err) {
      console.error('Create movement failed', err);
      alert('Failed to create movement');
    }
  }

  /**
   * Closes the modal and removes it from the DOM.
   */
  handleClose() {
    document.body.classList.remove('modal-open');
    this.remove();
  }

  // --- HTML templates ---
  /**
   * Returns the HTML structure for the editor form.
   * Contains fields for material ID, movement type, quantity, and note.
   * @returns {string} HTML string for the editor form.
   */
  getEditorHTML() {
    return `
      <button type="button" class="modal-close-btn" aria-label="Close">×</button>
      <div class="editor-container">
        <div class="editor-header">
          <h2>New Movement</h2>
        </div>
        <form class="movement-form">
          <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:12px;">
            <label>Material ID
              <input name="material_id" type="number" required>
            </label>
            <label>Type
              <select name="movement_type">
                <option value="ADJUST_UP">ADJUST_UP</option>
                <option value="ADJUST_DOWN">ADJUST_DOWN</option>
                <option value="WASTE">WASTE</option>
                <option value="RETURN">RETURN</option>
              </select>
            </label>
            <label>Quantity
              <input name="quantity" type="number" step="0.01" required>
            </label>
            <label>Note
              <input name="note" type="text" placeholder="Optional">
            </label>
          </div>
          <div class="form-actions">
            <button type="button" class="cancel-btn">Cancel</button>
            <button type="submit" class="save-btn">Save</button>
          </div>
        </form>
      </div>
    `;
  }
}

customElements.define('movement-editor', MovementEditor);
