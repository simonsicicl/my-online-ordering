// Modal-style Tag Editor for merchant admin system

import { createTagURL, updateTagURL, deleteTagURL } from '../../../api.js';

class TagEditor extends HTMLElement {
  // --- Data setters/getters ---
  set tag(data) { this._tag = data || this.getNewTagTemplate(); }
  get tag() { return this._tag || this.getNewTagTemplate(); }

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
   * Renders the tag editor form inside the modal.
   * Binds close, cancel, and form submit events.
   */
  renderEditor() {
    const tag = this.tag;
    const isNew = !tag.tag_id;
    this.querySelector('.modal-content').innerHTML = this.getEditorHTML(isNew, tag);

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
    if (form) form.onsubmit = (e) => this.saveEventHandler(e, tag);

    // Bind delete button event (only for existing tags)
    const deleteBtn = this.querySelector('#deleteBtn');
    if (deleteBtn) deleteBtn.onclick = (e) => this.deleteEventHandler(e, tag);
  }

  /**
   * Handles tag deletion, sends DELETE request to server.
   * Dispatches 'delete' event on success.
   * @param {Event} e
   * @param {Object} tag
   */
  async deleteEventHandler(e, tag) {
    e.preventDefault();
    if (!tag.tag_id) return;
    if (!confirm('Are you sure you want to delete this tag?')) return;
    try {
      const res = await fetch(deleteTagURL(tag.tag_id), {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete tag');
      const result = await res.json();
      console.log('Tag deleted successfully!', result); // TEST
      this.dispatchEvent(new CustomEvent('delete', { detail: tag.tag_id }));
      this.close();
    } catch (err) {
      alert('Failed to delete tag!');
      console.error('Error deleting tag:', err);
    }
  }

  // --- Event handlers ---
  /**
   * Handles form submission for saving tag data.
   * Dispatches 'save' event with updated tag object.
   * @param {Event} e
   * @param {Object} tag
   */
  async saveEventHandler(e, tag) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updatedTag = {
      ...tag,
      name: formData.get('name') || '',
      color: formData.get('color') || '#888',
      is_active: !!formData.get('is_active')
    };
    let url, method, saved;
    if (updatedTag.tag_id) {
      url = updateTagURL(updatedTag.tag_id);
      method = 'PUT';
    } else {
      url = createTagURL();
      method = 'POST';
    }
    try {
      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedTag)
      });
      if (!res.ok) throw new Error('Network response was not ok');
      saved = await res.json();
      console.log(`Tag ${updatedTag.tag_id ? 'created' : 'updated'} successfully:`, saved);
    } catch (error) {
      alert('Failed to save tag!');
      console.error('Error saving tag:', error);
    }
    // Dispatch save event with updated tag
    this.dispatchEvent(new CustomEvent('save', { detail: saved }));
    this.close();
  }

  // --- Utility methods ---
  /**
   * Returns a template for a new tag object.
   * @return {Object}
   */
  getNewTagTemplate() {
    return {
      tag_id: null,
      name: '',
      color: '#888',
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
   * Returns the HTML for the tag editor modal.
   * @param {boolean} isNew
   * @param {Object} tag
   * @return {string}
   */
  getEditorHTML(isNew, tag) {
    return `
      <div class="editor-container">
        <div class="editor-header">
          <h2>${isNew ? 'New Tag' : `Editing: ${tag.name}`}</h2>
          <button class="modal-close-btn" id="closeBtn" title="Close">&times;</button>
        </div>
        <form id="editorForm">
          <div class="editor-sections">
            <label>
              Name:
              <input type="text" id="name" name="name" value="${tag.name || ''}" required>
            </label>
            <label>
              Color:
              <input type="color" id="color" name="color" value="${tag.color || '#FFFFFF'}" style="width:48px;height:32px;vertical-align:middle;">
              <span class="color-value">${tag.color || '#FFFFFF'}</span>
            </label>
            <label>
              Active:
              <input type="checkbox" id="is_active" name="is_active" ${tag.is_active ? 'checked' : ''}>
            </label>
          </div>
          <div class="form-actions">
            ${!isNew ? `<button type="button" id="deleteBtn" class="delete-btn">Delete</button>` : ''}
            <button type="button" id="cancelBtn" class="cancel-btn">Cancel</button>
            <button type="submit" class="save-btn">Save</button>
          </div>
        </form>
      </div>
      <script>
        // Show color hex value beside color input
        const colorInput = document.getElementById('color');
        const colorValue = document.querySelector('.color-value');
        if(colorInput && colorValue) {
          colorInput.addEventListener('input', function() {
            colorValue.textContent = colorInput.value;
          });
        }
      </script>
    `;
  }
}

customElements.define('tag-editor', TagEditor);