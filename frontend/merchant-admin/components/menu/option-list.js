// Option list component for merchant admin system

import './option-editor.js';

class OptionList extends HTMLElement {
  constructor() {
    super();
    this._option_list = [];
  }

  // --- Data setters/getters ---
  set option_list(data) {
    this._option_list = data || [];
    this.renderOptionTable();
  }
  get option_list() { return this._option_list || []; }

  // --- Lifecycle methods ---
  /**
   * Called when the element is added to the DOM.
   * Renders initial UI and sets up event listeners.
   */
  async connectedCallback() {
    this.render();
    this.renderOptionTable();
    // Bind resize event to re-render table on window size change
    this._resizeHandler = () => this.renderOptionTable();
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
   * Renders the main option list panel and table container.
   * Also binds the Add button click handler.
   */
  render() {
    this.innerHTML = this.getHTML();
    // Bind add option button event
    const addBtn = this.querySelector('#addOptionBtn');
    if (addBtn) addBtn.onclick = () => this.openOptionEditor();
  }

  /**
   * Renders the option table with current option_list data.
   * If no data, shows empty message.
   */
  renderOptionTable() {
    const tableContainer = this.querySelector('#option-table');
    if (!tableContainer) return;
    if (!this.option_list || this.option_list.length === 0) {
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
      btn.onclick = () => this.openOptionEditor(btn.dataset.id);
    });

    // Mobile: bind card click for editing
    if (window.innerWidth <= 768) {
      tableContainer.querySelectorAll('.product-card').forEach(card => {
        card.onclick = () => this.openOptionEditor(card.dataset.id);
      });
    }
  }

  // --- Event handlers ---
  /**
   * Opens the option editor modal for creating or editing an option.
   * @param {string|number} optionId
   */
  openOptionEditor(optionId) {
    // Find option data if editing, or use template for new option
    const option = this.option_list.find(opt => String(opt.option_id) === String(optionId)) || {
      option_id: null,
      option_name: '',
      price_delta: 0,
      is_active: true
    };
    // Create modal
    const modal = document.createElement('option-editor');
    modal.option = JSON.parse(JSON.stringify(option)); // Deep copy to avoid mutation
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
   * Returns HTML for the main option list panel.
   * @return {string}
   */
  getHTML() {
    return `
      <link rel="stylesheet" href="./components/menu/option-editor.css" />
      <div class="product-list-header">
        <h2>Option List</h2>
        <button id="addOptionBtn" class="add-btn"><span>Add Option</span></button>
      </div>
      <div id="option-table"></div>
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
        No options found.<br>
        Please click <a href="javascript:void(0)" id="addOptionBtn">Add Option</a> to create one!
      </div>
    `;
  }

  /**
   * Returns HTML for the desktop option table.
   * @return {string}
   */
  getDesktopTableHTML() {
    return `
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Price Delta</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${this.option_list.map(opt => `
            <tr>
              <td>${opt.option_id}</td>
              <td>${opt.option_name}</td>
              <td>$${opt.price_delta}</td>
              <td>${opt.is_active ? '<span class="active-label">Active</span>' : '<span class="inactive-label">Inactive</span>'}</td>
              <td>
                <button class="action-btn editBtn" data-id="${opt.option_id}">Edit</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Returns HTML for the mobile option table (card layout).
   * @return {string}
   */
  getMobileTableHTML() {
    return `
      <tbody>
        ${this.option_list.map(opt => `
          <tr>
            <td colspan="5" style="padding:0;">
              <div class="product-card" data-id="${opt.option_id}">
                <div class="product-card-info mobile-option-info">
                  <div class="mobile-option-row">
                    <div class="mobile-option-title-id-status">
                      <span class="product-card-title">
                        ${opt.option_name}
                        <span class="option-id-mobile">#${opt.option_id}</span>
                      </span>
                      <span class="option-status-mobile">
                        ${opt.is_active ? '<span class="active-label">Active</span>' : '<span class="inactive-label">Inactive</span>'}
                      </span>
                    </div>
                    <div class="product-card-price">$${opt.price_delta}</div>
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

customElements.define('option-list', OptionList);