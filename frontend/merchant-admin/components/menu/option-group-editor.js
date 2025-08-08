// Modal-style Option Group Editor for merchant admin system

import { createOptionGroupURL, updateOptionGroupURL } from "../../../api.js";

class OptionGroupEditor extends HTMLElement {
  // --- Data setters/getters ---
  set group(data) { this._group = data || this.getNewGroupTemplate(); }
  get group() { return this._group || this.getNewGroupTemplate(); }

  set option_list(data) { this._option_list = data || []; }
  get option_list() { return this._option_list || []; }

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
   * Renders the option group editor form inside the modal.
   * Binds close, cancel, and form submit events.
   */
  renderEditor() {
    const group = this.group;
    const isNew = !group.option_group_id;
    this.querySelector('.modal-content').innerHTML = this.getEditorHTML(isNew, group);

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
    if (form) form.onsubmit = (e) => this.saveEventHandler(e, group);
  }

  // --- Event handlers ---
  /**
   * Handles form submission for saving option group data.
   * Dispatches 'save' event with updated group object.
   * @param {Event} e
   * @param {Object} group
   */
  async saveEventHandler(e, group) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const selectedOptions = Array.from(this.querySelectorAll('input[name="option_ids"]:checked')).map(cb => Number(cb.value));
    const updatedGroup = {
      ...group,
      group_name: formData.get('group_name') || '',
      universal_name: formData.get('universal_name') || '',
      is_multiple: !!formData.get('is_multiple'),
      option_ids: selectedOptions
    };
    let url;
    if (group.option_group_id) {
      url = updateOptionGroupURL(group.option_group_id);
    } else {
      url = createOptionGroupURL();
    }
    try {
      const response = await fetch(url, {
        method: group.option_group_id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedGroup)
      });
      if (!response.ok) throw new Error('Failed to save option group');
      const saved = await response.json();
      console.log(`Option group ${group.option_group_id ? 'updated' : 'created'} successfully`, saved);
    } catch (error) {
      alert('Failed to save option group!');
      console.error('Error saving option group:', error);
    }
    // Dispatch save event with updated group
    this.dispatchEvent(new CustomEvent('save'));
    this.close();
  }

  // --- Utility methods ---
  /**
   * Returns a template for a new option group object.
   * @return {Object}
   */
  getNewGroupTemplate() {
    return {
      option_group_id: null,
      group_name: '',
      universal_name: '',
      is_multiple: false,
      option_ids: []
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
   * Returns the HTML for the option group editor modal.
   * @param {boolean} isNew
   * @param {Object} group
   * @return {string}
   */
  getEditorHTML(isNew, group) {
    return `
      <div class="editor-container">
        <div class="editor-header">
          <h2>${isNew ? 'New Option Group' : `Editing: ${group.group_name || group.universal_name}`}</h2>
          <button class="modal-close-btn" id="closeBtn" title="Close">&times;</button>
        </div>
        <form id="editorForm">
          <div class="editor-sections">
            <label>
              Universal Name:
              <input type="text" id="universal_name" name="universal_name" value="${group.universal_name || ''}">
            </label>
            <label>
              Group Name:
              <input type="text" id="group_name" name="group_name" value="${group.group_name || ''}" required>
            </label>
            <label>
              Multiple Selection:
              <input type="checkbox" id="is_multiple" name="is_multiple" ${group.is_multiple ? 'checked' : ''}>
            </label>
            <label>
              Options:
              <div style="max-height:160px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:6px;padding:10px 8px;background:#f9fafb;">
                ${this.option_list && this.option_list.length > 0
                  ? this.option_list.map(opt => `
                    <label style="display:inline-block;margin:0 12px 8px 0;">
                      <input type="checkbox" name="option_ids" value="${opt.option_id}" ${group.option_ids && group.option_ids.includes(opt.option_id) ? 'checked' : ''}>
                      ${opt.option_name}
                    </label>
                  `).join('')
                  : '<span style="color:#888;">No options available</span>'
                }
              </div>
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

customElements.define('option-group-editor', OptionGroupEditor);