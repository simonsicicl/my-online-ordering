// Option group list component for merchant admin system

import './option-group-editor.js';

class OptionGroupList extends HTMLElement {
  // --- Data setters/getters ---
  set option_groups(data) {
    this._option_groups = data || [];
    this.renderOptionGroupTable();
  }

  set option_list(data) {
    this._option_list = data || [];
    this.renderOptionGroupTable();
  }

  get option_groups() { return this._option_groups || []; }
  get option_list() { return this._option_list || []; }

  // --- Lifecycle methods ---
  /**
   * Called when the element is added to the DOM.
   * Renders initial UI and sets up event listeners.
   */
  async connectedCallback() {
    this.render();
    this.renderOptionGroupTable();
    // Bind resize event to re-render table on window size change
    this._resizeHandler = () => this.renderOptionGroupTable();
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
   * Renders the main option group list panel and table container.
   * Also binds the Add button click handler.
   */
  render() {
    this.innerHTML = this.getHTML();
    // Bind add option group button event
    const addBtn = this.querySelector('#addOptionGroupBtn');
    if (addBtn) addBtn.onclick = () => this.openOptionGroupEditor();
  }

  /**
   * Renders the option group table with current option_groups data.
   * If no data, shows empty message.
   */
  renderOptionGroupTable() {
    const tableContainer = this.querySelector('#option-group-table');
    if (!tableContainer) return;
    if (!this.option_groups || this.option_groups.length === 0) {
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
      btn.onclick = () => this.openOptionGroupEditor(btn.dataset.id);
    });

    // Mobile: bind card click for editing
    if (window.innerWidth <= 768) {
      tableContainer.querySelectorAll('.product-card').forEach(card => {
        card.onclick = () => this.openOptionGroupEditor(card.dataset.id);
      });
    }
  }

  // --- Event handlers ---
  /**
   * Opens the option group editor modal for creating or editing an option group.
   * @param {string|number} groupId
   */
  openOptionGroupEditor(groupId) {
    // Find group data if editing, or use template for new group
    const group = this.option_groups.find(g => String(g.option_group_id) === String(groupId)) || {
      option_group_id: null,
      group_name: '',
      universal_name: '',
      is_multiple: false,
      option_ids: []
    };
    // Create modal
    const modal = document.createElement('option-group-editor');
    modal.group = JSON.parse(JSON.stringify(group));
    modal.option_list = this.option_list;
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
   * Returns HTML for the main option group list panel.
   * @return {string}
   */
  getHTML() {
    return `
      <link rel="stylesheet" href="./components/menu/option-group-editor.css" />
      <div class="product-list-header">
        <h2>Option Group List</h2>
        <button id="addOptionGroupBtn" class="add-btn"><span>Add Option Group</span></button>
      </div>
      <div id="option-group-table"></div>
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
        No option groups found.<br>
        Please click <a href="javascript:void(0)" id="addOptionGroupBtn">Add Option Group</a> to create one!
      </div>
    `;
  }

  /**
   * Returns HTML for the desktop option group table.
   * @return {string}
   */
  getDesktopTableHTML() {
    return `
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Universal Name</th>
            <th>Group Name</th>
            <th>Multiple</th>
            <th>Options</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${this.option_groups.map(group => `
            <tr>
              <td>${group.option_group_id}</td>
              <td>${group.universal_name || '-'}</td>
              <td>${group.group_name || ''}</td>
              <td>
                ${group.is_multiple
                  ? '<span class="multiple-label">Multiple</span>'
                  : '<span class="single-label">Single</span>'}
              </td>
              <td>
                ${this.getOptionListHTML(group.option_ids)}
              </td>
              <td>
                <button class="action-btn editBtn" data-id="${group.option_group_id}">Edit</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Returns HTML for the mobile option group table (card layout).
   * @return {string}
   */
  getMobileTableHTML() {
    return `
      <tbody>
        ${this.option_groups.map(group => `
          <tr>
            <td colspan="6" style="padding:0;">
              <div class="product-card" data-id="${group.option_group_id}">
                <div class="product-card-info">
                  <div class="product-card-title">
                    ${group.universal_name || '-'}
                    <span style="font-size:0.90em;color:#888;">#${group.option_group_id}</span>
                  </div>
                  ${group.group_name ? `<div class="group-name-mobile">${group.group_name}</div>` : ''}
                  <div class="option-list-mobile">
                    ${this.getOptionListHTML(group.option_ids)}
                  </div>
                </div>
                <div class="mobile-multiple-status">
                  ${group.is_multiple
                    ? '<span class="multiple-label">Multiple</span>'
                    : '<span class="single-label">Single</span>'}
                </div>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    `;
  }

  /**
   * Returns HTML for the option list display in a group.
   * @param {Array<number>} option_ids
   * @return {string}
   */
  getOptionListHTML(option_ids) {
    if (!option_ids || option_ids.length === 0) return '<span style="color:#888;">None</span>';
    return option_ids.map(id => {
      const opt = this.option_list.find(o => o.option_id === id);
      return opt ? `<span title="#${opt.option_id}">${opt.option_name}</span>` : `<span style="color:#aaa;">#${id}</span>`;
    }).join(', ');
  }
}

customElements.define('option-group-list', OptionGroupList);