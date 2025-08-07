// Tag list component for merchant admin system

import './tag-editor.js';

class TagList extends HTMLElement {
  // --- Data setters/getters ---
  set tags(data) {
    this._tags = data || [];
    this.renderTagTable();
  }
  get tags() { return this._tags || []; }

  // --- Lifecycle methods ---
  /**
   * Called when the element is added to the DOM.
   * Renders initial UI and sets up event listeners.
   */
  async connectedCallback() {
    this.render();
    this.renderTagTable();
    // Bind resize event to re-render table on window size change
    this._resizeHandler = () => this.renderTagTable();
    window.addEventListener('resize', this._resizeHandler);
  }

  /**
   * Called when the element is removed from the DOM.
   * Cleans up event listeners to prevent memory leaks.
   */
  disconnectedCallback() {
    window.removeEventListener('resize', this._resizeHandler);
  }

  // --- Render methods ---
  /**
   * Renders the main tag list panel and table container.
   * Also binds the Add button click handler.
   */
  render() {
    this.innerHTML = this.getHTML();
    // Bind add tag button event
    const addBtn = this.querySelector('#addTagBtn');
    if (addBtn) addBtn.onclick = () => this.openTagEditor();
  }

  /**
   * Renders the tag table with current tags data.
   * If no data, shows empty message.
   */
  renderTagTable() {
    const tableContainer = this.querySelector('#tag-table');
    if (!tableContainer) return;
    if (!this.tags || this.tags.length === 0) {
      tableContainer.innerHTML = this.getEmptyTableHTML();
      return;
    }
    // Responsive: table for desktop, card for mobile
    if (window.innerWidth <= 768)
      tableContainer.innerHTML = this.getMobileTableHTML();
    else
      tableContainer.innerHTML = this.getDesktopTableHTML();

    // Bind edit buttons (desktop only)
    tableContainer.querySelectorAll('.editBtn').forEach(btn => {
      btn.onclick = () => this.openTagEditor(btn.dataset.id);
    });

    // Mobile: bind card click for editing
    if (window.innerWidth <= 768) {
      tableContainer.querySelectorAll('.product-card').forEach(card => {
        card.onclick = () => this.openTagEditor(card.dataset.id);
      });
    }
  }

  // --- Event handlers ---
  /**
   * Opens the tag editor modal for creating or editing a tag.
   * @param {string|number} tagId
   */
  openTagEditor(tagId) {
    // Find tag data if editing, or use template for new tag
    const tag = this.tags.find(t => String(t.tag_id) === String(tagId)) || {
      tag_id: null,
      tag_name: '',
      is_active: true
    };
    // Create modal
    const modal = document.createElement('tag-editor');
    modal.tag = { ...tag };
    modal.addEventListener('close', () => modal.remove());
    modal.addEventListener('save', (e) => {
      // Save logic here
      modal.remove();
      // Optionally, refresh list
      this.dispatchEvent(new CustomEvent('refresh'));
    });
    // Append modal to this component (could also use document.body if needed)
    this.appendChild(modal);
  }

  // --- HTML generators ---
  /**
   * Returns HTML for the main tag list panel.
   * @return {string}
   */
  getHTML() {
    return `
      <link rel="stylesheet" href="./components/menu/tag-editor.css" />
      <div class="product-list-header">
        <h2>Tag List</h2>
        <button id="addTagBtn" class="add-btn"><span>Add Tag</span></button>
      </div>
      <div id="tag-table"></div>
    `;
  }

  /**
   * Returns HTML for empty table message.
   * @return {string}
   */
  getEmptyTableHTML() {
    return `
      <div class="empty-table-message">
        <span class="empty-icon">🧩</span>
        No tags found.<br>
        Please click <a href="javascript:void(0)" id="addTagBtn">Add Tag</a> to create one!
      </div>
    `;
  }

  /**
   * Returns HTML for the desktop tag table.
   * @return {string}
   */
  getDesktopTableHTML() {
    return `
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Color</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${this.tags.map(tag => `
            <tr>
              <td>${tag.tag_id}</td>
              <td>${tag.name}</td>
              <td>
                <span 
                  class="tag-color-dot"
                  style="background:${tag.color || '#888'}"
                  title="${tag.color || 'No color'}"
                ></span>
                <span class="tag-color-text">${tag.color || '-'}</span>
              </td>
              <td>
                <button class="action-btn editBtn" data-id="${tag.tag_id}">Edit</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Returns HTML for the mobile tag table (card layout).
   * @return {string}
   */
  getMobileTableHTML() {
    return `
      <tbody>
        ${this.tags.map(tag => `
          <tr>
            <td colspan="4" style="padding:0;">
              <div class="product-card" data-id="${tag.tag_id}">
                <div class="product-card-info">
                  <div class="product-card-title">
                    ${tag.name}
                    <span class="option-id-mobile">#${tag.tag_id}</span>
                    <span 
                      class="tag-color-dot"
                      style="background:${tag.color || '#888'};margin-left:8px;"
                      title="${tag.color || 'No color'}"
                    ></span>
                    <span class="tag-color-text-mobile">${tag.color || '-'}</span>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    `;
  }
}

customElements.define('tag-list', TagList);