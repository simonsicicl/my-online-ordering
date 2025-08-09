// Option Group Editor (modal)
// Standalone modal for creating/updating an option group definition.
// UI follows the same structure and dropdown behavior as OptionGroupSelector.

import { createOptionGroupURL, updateOptionGroupURL, deleteOptionGroupURL } from "../../../api.js";

class OptionGroupEditor extends HTMLElement {
  // --- Data setters/getters ---
  /**
   * Option group model being edited; falls back to a new template if not provided.
   * @param {Object} data
   */
  set group(data) { this._group = data || this.getNewGroupTemplate(); }
  get group() { return this._group || this.getNewGroupTemplate(); }

  /**
   * Flat option list used to build the options checklist.
   * @param {Array<{option_id:number, option_name:string}>} data
   */
  set option_list(data) { this._option_list = data || []; }
  get option_list() { return this._option_list || []; }

  // --- Lifecycle methods ---
  constructor() {
    super();
    this._group = null;
    this._option_list = [];
  }

  /**
   * Called when the element is added to the DOM.
   * Renders modal shell and editor UI.
   */
  connectedCallback() {
    this.renderModal();
    this.renderEditor();
  }

  // --- Render methods ---
  /**
   * Renders the modal backdrop and content container and binds backdrop close.
   */
  renderModal() {
    this.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content"></div>
    `;
    this.querySelector('.modal-backdrop').onclick = () => this.close();
  }

  /**
   * Renders the option group editor form and binds UI events.
   * - Binds header close and cancel
   * - Sets up options dropdown (toggle/open, keep open when clicking inside)
   * - Binds form submit and delete
   */
  renderEditor() {
    const group = this.group;
    const isNew = !group.option_group_id;

    this.querySelector('.modal-content').innerHTML = this.getEditorHTML(isNew, group);

    // Close (X)
    this.querySelector('#closeBtn').onclick = () => this.close();

    // Cancel
    const cancelBtn = this.querySelector('#cancelBtn');
    if (cancelBtn) cancelBtn.onclick = (e) => {
      e.preventDefault();
      this.close();
    };

    // Options dropdown behavior (aligned with OptionGroupSelector)
    const optionDropdown = this.querySelector('.option-dropdown');
    if (optionDropdown) {
      const btn = optionDropdown.querySelector('.custom-dropdown-btn');
      const content = optionDropdown.querySelector('.custom-dropdown-content');
      if (btn) btn.onclick = (e) => this.handleOptionDropdownButtonClick(e);
      if (content) {
        content.onclick = (e) => e.stopPropagation(); // keep open while interacting
        // Bind checkbox changes to update the summary and in-memory group.option_ids
        content.querySelectorAll('input[name="option_ids"]').forEach(cb => {
          cb.onchange = (e) => this.handleOptionCheckboxChange(e);
        });
      }
    }

    // Initial selected options summary
    this.renderSelectedOptionsInfo();

    // Save
    const form = this.querySelector('#editorForm');
    if (form) form.onsubmit = (e) => this.saveEventHandler(e, group);

    // Delete (existing only)
    const deleteBtn = this.querySelector('#deleteBtn');
    if (deleteBtn) deleteBtn.onclick = (e) => this.deleteEventHandler(e, group);
  }

  // --- Event handlers ---
  /**
   * Saves the option group (POST for new, PUT for existing) and emits 'save'.
   * @param {Event} e
   * @param {Object} group
   */
  async saveEventHandler(e, group) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const updatedGroup = {
      ...group,
      group_name: formData.get('group_name') || '',
      universal_name: formData.get('universal_name') || '',
      is_multiple: !!formData.get('is_multiple'),
      option_ids: this.getCurrentSelectedOptionIds()
    };

    let url, method, saved;
    if (group.option_group_id) {
      url = updateOptionGroupURL(group.option_group_id);
      method = 'PUT';
    } else {
      url = createOptionGroupURL();
      method = 'POST';
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedGroup)
      });
      if (!res.ok) throw new Error('Failed to save option group');
      saved = await res.json();
      console.log(`Option group ${group.option_group_id ? 'updated' : 'created'} successfully`, saved);
    } catch (error) {
      alert('Failed to save option group!');
      console.error('Error saving option group:', error);
    }

    this.dispatchEvent(new CustomEvent('save', { detail: saved }));
    this.close();
  }

  /**
   * Deletes the option group (if existing) and emits 'delete'.
   * @param {Event} e
   * @param {Object} group
   */
  async deleteEventHandler(e, group) {
    e.preventDefault();
    if (!group.option_group_id) return;
    if (!confirm('Are you sure you want to delete this option group?')) return;

    try {
      const res = await fetch(deleteOptionGroupURL(group.option_group_id), { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete option group');
      const result = await res.json();
      console.log('Option group deleted successfully!', result);
      this.dispatchEvent(new CustomEvent('delete', { detail: group.option_group_id }));
      this.close();
    } catch (err) {
      alert('Failed to delete option group!');
      console.error('Error deleting option group:', err);
    }
  }

  /**
   * Toggles the options dropdown visibility (same behavior as OptionGroupSelector).
   * @param {Event} e
   */
  handleOptionDropdownButtonClick(e) {
    e.stopPropagation();
    const content = this.querySelector('.option-dropdown .custom-dropdown-content');
    if (!content) return;
    content.style.display = content.style.display === 'block' ? 'none' : 'block';
  }

  // --- Helpers ---
  /**
   * Handles checkbox changes inside the dropdown:
   * - Updates this.group.option_ids in-place
   * - Re-renders the selected options summary
   * @param {Event} e
   */
  handleOptionCheckboxChange(e) {
    this.group.option_ids = this.getCurrentSelectedOptionIds();
    this.renderSelectedOptionsInfo();
  }

  /**
   * Returns the currently checked option IDs from the dropdown.
   * @returns {number[]}
   */
  getCurrentSelectedOptionIds() {
    const dropdownContent = this.querySelector('.option-dropdown .custom-dropdown-content');
    if (!dropdownContent) return [];
    return Array.from(dropdownContent.querySelectorAll('input[name="option_ids"]:checked'))
      .map(cb => Number(cb.value));
  }

  /**
   * Renders a summary of selected options below the dropdown.
   * Uses this.group.option_ids to resolve names from this.option_list.
   */
  renderSelectedOptionsInfo() {
    const container = this.querySelector('.selected-options-info');
    if (!container) return;

    const ids = Array.isArray(this.group?.option_ids) ? this.group.option_ids : [];
    if (!ids.length) {
      container.innerHTML = '<em>No option selected.</em>';
      return;
    }

    const names = ids.map(id => this.option_list.find(o => o.option_id === id)?.option_name).filter(Boolean);

    if (!names.length) {
      container.innerHTML = '<em>No option selected.</em>';
      return;
    }

    container.innerHTML = names.map(n => `<span class="option-badge">${n}</span>`).join(' ');
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
   * Closes the modal and emits a 'close' event.
   */
  close() {
    this.remove();
    this.dispatchEvent(new CustomEvent('close'));
  }

  // --- HTML generators ---
  /**
   * Returns the HTML for the option group editor modal content.
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
              <div class="custom-dropdown option-dropdown">
                <button class="custom-dropdown-btn" type="button">Select Options</button>
                <div class="custom-dropdown-content" style="display:none;">
                  ${this.option_list && this.option_list.length > 0
                    ? this.option_list.map(opt => `
                      <label>
                        <input type="checkbox" name="option_ids" value="${opt.option_id}" ${group.option_ids && group.option_ids.includes(opt.option_id) ? 'checked' : ''}>
                        ${opt.option_name}
                      </label>
                    `).join('')
                    : '<span style="color:#888;">No options available</span>'
                  }
                </div>
              </div>
            </label>
            <div class="selected-options-info"></div>
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

customElements.define('option-group-editor', OptionGroupEditor);