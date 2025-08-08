// Modal-style Category Editor for merchant admin system

import { createCategoryURL, updateCategoryURL } from "../../../api.js";

class CategoryEditor extends HTMLElement {
  // --- Data setters/getters ---
  set category(data) { this._category = data || this.getNewCategoryTemplate(); }
  get category() { return this._category || this.getNewCategoryTemplate(); }

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
   * Renders the category editor form inside the modal.
   * Binds close, cancel, and form submit events.
   */
  renderEditor() {
    const category = this.category;
    const isNew = !category.category_id;
    this.querySelector('.modal-content').innerHTML = this.getEditorHTML(isNew, category);

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
    if (form) form.onsubmit = (e) => this.saveEventHandler(e, category);
  }

  // --- Event handlers ---
  /**
   * Handles form submission for saving category data.
   * Dispatches 'save' event with updated category object.
   * @param {Event} e
   * @param {Object} category
   */
  async saveEventHandler(e, category) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updatedCategory = {
      ...category,
      name: formData.get('name') || '',
      is_active: !!formData.get('is_active')
    };
    let url;
    if (updatedCategory.category_id) {
      url = updateCategoryURL(updatedCategory.category_id);
    } else {
      url = createCategoryURL();
    }
    try {
      const res = await fetch(url, {
        method: updatedCategory.category_id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedCategory)
      });
      if (!res.ok) throw new Error('Network response was not ok');
      const saved = await res.json();
      console.log(`Category ${updatedCategory.category_id ? 'updated' : 'created'} successfully`, saved);
    } catch (error) {
      alert('Failed to save category!');
      console.error('Error saving category:', error);
    }
    // Dispatch save event with updated category
    this.dispatchEvent(new CustomEvent('save', { detail: updatedCategory }));
    this.close();
  }

  // --- Utility methods ---
  /**
   * Returns a template for a new category object.
   * @return {Object}
   */
  getNewCategoryTemplate() {
    return {
      category_id: null,
      name: '',
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
   * Returns the HTML for the category editor modal.
   * @param {boolean} isNew
   * @param {Object} category
   * @return {string}
   */
  getEditorHTML(isNew, category) {
    return `
      <div class="editor-container">
        <div class="editor-header">
          <h2>${isNew ? 'New Category' : `Editing: ${category.name}`}</h2>
          <button class="modal-close-btn" id="closeBtn" title="Close">&times;</button>
        </div>
        <form id="editorForm">
          <div class="editor-sections">
            <label>
              Name:
              <input type="text" id="name" name="name" value="${category.name || ''}" required>
            </label>
            <label>
              Active:
              <input type="checkbox" id="is_active" name="is_active" ${category.is_active ? 'checked' : ''}>
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

customElements.define('category-editor', CategoryEditor);