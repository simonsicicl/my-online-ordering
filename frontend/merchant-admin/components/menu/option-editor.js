// Modal-style Option Editor for merchant admin system

import { createOptionURL, updateOptionURL } from '../../../api.js';

class OptionEditor extends HTMLElement {
  // --- Data setters/getters ---
  set option(data) { this._option = data || this.getNewOptionTemplate(); }
  get option() { return this._option || this.getNewOptionTemplate(); }

  // --- Lifecycle methods ---
  /**
   * Called when the element is added to the DOM.
   * Renders modal and editor UI.
   */
  connectedCallback() {
    this.renderModal();
    this.renderEditor();
  }

  // --- Modal rendering ---
  /**
   * Renders the modal backdrop and content container.
   */
  renderModal() {
    this.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content"></div>
    `;
    this.querySelector('.modal-backdrop').onclick = () => this.close();
  }

  /**
   * Renders the option editor form inside the modal.
   * Binds close, cancel, and form submit events.
   */
  renderEditor() {
    const option = this.option;
    const isNew = !option.option_id;
    this.querySelector('.modal-content').innerHTML = this.getEditorHTML(isNew, option);

    // Bind close button
    this.querySelector('#closeBtn').onclick = () => this.close();

    // Bind cancel button
    const cancelBtn = this.querySelector('#cancelBtn');
    if (cancelBtn) cancelBtn.onclick = (e) => {
      e.preventDefault();
      this.close();
    };

    // Bind form submit event
    const form = this.querySelector('#editorForm');
    if (form) form.onsubmit = (e) => this.saveEventHandler(e, option);
  }

  // --- Event handlers ---
  /**
   * Handles form submission for saving option data.
   * Dispatches 'save' event with updated option object.
   * @param {Event} e
   * @param {Object} option
   */
  async saveEventHandler(e, option) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updatedOption = {
      ...option,
      option_name: formData.get('option_name') || '',
      price_delta: Number(formData.get('price_delta')) || 0,
      is_active: !!formData.get('is_active'),
    };
    let url;
    if (updatedOption.option_id) {
      // Update existing option
      url = updateOptionURL(updatedOption.option_id);
    } else {
      // Create new option
      url = createOptionURL();
    }
    try {
      const res = await fetch(url, {
        method: updatedOption.option_id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedOption)
      });
      if (!res.ok) throw new Error('Failed to save option');
      const saved = await res.json();
      console.log(`Option ${updatedOption.option_id ? 'updated' : 'created'} successfully!`, saved); // TEST
    } catch (err) {
      alert('Failed to save option!');
      console.error('Error saving option:', err);
    }
    // Dispatch 'save' event for parent to handle API or data update
    this.dispatchEvent(new CustomEvent('save'));
    this.close();
  }

  // --- Utility methods ---
  /**
   * Returns a template for a new option object.
   * @return {Object}
   */
  getNewOptionTemplate() {
    return {
      option_id: null,
      option_name: '',
      price_delta: 0,
      is_active: true
    };
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
   * Returns the HTML for the option editor modal.
   * @param {boolean} isNew
   * @param {Object} option
   * @return {string}
   */
  getEditorHTML(isNew, option) {
    return `
      <div class="editor-container">
        <div class="editor-header">
          <h2>${isNew ? 'New Option' : `Editing: ${option.option_name}`}</h2>
          <button class="modal-close-btn" id="closeBtn" title="Close">&times;</button>
        </div>
        <form id="editorForm">
          <div class="editor-sections">
            <label>
              Name:
              <input type="text" id="option_name" name="option_name" value="${option.option_name}" required>
            </label>
            <label>
              Price Delta:
              <input type="number" id="price_delta" name="price_delta" value="${option.price_delta}" required>
            </label>
            <label>
              Active:
              <input type="checkbox" id="is_active" name="is_active" ${option.is_active ? 'checked' : ''}>
            </label>
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

customElements.define('option-editor', OptionEditor);