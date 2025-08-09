// Combo Group Editor
// Edits product.combo_item_groups in-place. No need to emit change events for data sync.

class ComboGroupEditor extends HTMLElement {
  // --- Data setters/getters ---
  /**
   * Sets available menu items used to populate item dropdowns.
   * @param {Array} data
   */
  set menu(data) { this._menu = data || []; }
  get menu() { return this._menu || []; }

  /**
   * Sets the product being edited. Ensures required structure exists.
   * @param {Object} data
   */
  set product(data) {
    this._product = data || {};
    if (!Array.isArray(this._product.combo_item_groups)) {
      this._product.combo_item_groups = [];
    }
  }
  get product() {
    if (!this._product || typeof this._product !== 'object') this._product = {};
    if (!Array.isArray(this._product.combo_item_groups)) this._product.combo_item_groups = [];
    return this._product;
  }

  // --- Lifecycle methods ---
  constructor() {
    super();
    this._menu = [];
    this._product = {};
  }

  /**
   * Called when the element is added to the DOM.
   * Renders the editor UI.
   */
  connectedCallback() {
    this.render();
  }

  // --- Render methods ---
  /**
   * Renders the combo group editor UI and binds UI events.
   */
  render() {
    this.innerHTML = this.getHTML();

    // Bind group name input
    this.querySelectorAll('.combo-group-name').forEach(input => {
      input.oninput = (e) => this.handleGroupNameInput(e);
    });

    // Bind group quantity input
    this.querySelectorAll('.combo-group-qty').forEach(input => {
      input.oninput = (e) => this.handleGroupQtyInput(e);
    });

    // Delete group buttons
    this.querySelectorAll('.combo-group-remove-btn').forEach(btn => {
      btn.onclick = (e) => this.handleRemoveGroup(e);
    });

    // Move up group buttons
    this.querySelectorAll('.move-up-group-btn').forEach(btn => {
      btn.onclick = (e) => this.handleMoveUpGroup(e);
    });

    // Move down group buttons
    this.querySelectorAll('.move-down-group-btn').forEach(btn => {
      btn.onclick = (e) => this.handleMoveDownGroup(e);
    });

    // Add group button
    const addGroupBtn = this.querySelector('.add-combo-group-btn');
    if (addGroupBtn) addGroupBtn.onclick = (e) => this.handleAddGroup(e);

    // Add item buttons
    this.querySelectorAll('.add-combo-item-btn').forEach(btn => {
      btn.onclick = (e) => this.handleAddItem(e);
    });

    // Delete item buttons
    this.querySelectorAll('.remove-combo-item-btn').forEach(btn => {
      btn.onclick = (e) => this.handleRemoveItem(e);
    });

    // Item select dropdowns
    this.querySelectorAll('.combo-item-select').forEach(sel => {
      sel.onchange = (e) => this.handleItemSelect(e);
    });

    // Price delta inputs
    this.querySelectorAll('.combo-item-price-delta').forEach(input => {
      input.oninput = (e) => this.handlePriceDeltaInput(e);
    });
  }

  // --- Event handlers ---
  /**
   * Moves a combo group up in the list.
   * @param {Event} e
   */
  handleMoveUpGroup(e) {
    const idx = Number(e.target.dataset.groupIdx);
    if (idx > 0) {
      const arr = this.product.combo_item_groups;
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      this.render();
    }
  }

  /**
   * Moves a combo group down in the list.
   * @param {Event} e
   */
  handleMoveDownGroup(e) {
    const idx = Number(e.target.dataset.groupIdx);
    const arr = this.product.combo_item_groups;
    if (idx < arr.length - 1) {
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      this.render();
    }
  }

  /**
   * Adds a new empty combo group.
   * @param {Event} e
   */
  handleAddGroup(e) {
    this.product.combo_item_groups.push({
      item_group_id: null,
      group_name: '',
      quantity: 1,
      items: []
    });
    this.render();
  }

  /**
   * Adds a new item row to a combo group.
   * @param {Event} e
   */
  handleAddItem(e) {
    const groupIdx = Number(e.target.dataset.groupIdx);
    const firstMenuId = this.menu[0]?.item_id || 0;
    this.product.combo_item_groups[groupIdx].items.push({
      item_id: firstMenuId,
      price_delta: 0
    });
    this.render();
  }

  /**
   * Updates a group's name on input.
   * @param {Event} e
   */
  handleGroupNameInput(e) {
    const idx = Number(e.target.dataset.groupIdx);
    this.product.combo_item_groups[idx].group_name = e.target.value;
  }

  /**
   * Updates a group's quantity on input.
   * @param {Event} e
   */
  handleGroupQtyInput(e) {
    const idx = Number(e.target.dataset.groupIdx);
    this.product.combo_item_groups[idx].quantity = Number(e.target.value) || 1;
  }

  /**
   * Removes a combo group.
   * @param {Event} e
   */
  handleRemoveGroup(e) {
    const idx = Number(e.target.dataset.groupIdx);
    this.product.combo_item_groups.splice(idx, 1);
    this.render();
  }

  /**
   * Removes an item from a combo group.
   * @param {Event} e
   */
  handleRemoveItem(e) {
    const groupIdx = Number(e.target.dataset.groupIdx);
    const itemIdx = Number(e.target.dataset.itemIdx);
    this.product.combo_item_groups[groupIdx].items.splice(itemIdx, 1);
    this.render();
  }

  /**
   * Updates selected item id for a combo item row.
   * @param {Event} e
   */
  handleItemSelect(e) {
    const groupIdx = Number(e.target.dataset.groupIdx);
    const itemIdx = Number(e.target.dataset.itemIdx);
    this.product.combo_item_groups[groupIdx].items[itemIdx].item_id = Number(e.target.value);
  }

  /**
   * Updates price delta for a combo item row.
   * @param {Event} e
   */
  handlePriceDeltaInput(e) {
    const groupIdx = Number(e.target.dataset.groupIdx);
    const itemIdx = Number(e.target.dataset.itemIdx);
    this.product.combo_item_groups[groupIdx].items[itemIdx].price_delta = Number(e.target.value) || 0;
  }

  // --- HTML generators ---
  /**
   * Returns the HTML for the combo group editor.
   * @return {string}
   */
  getHTML() {
    const comboGroups = this.product.combo_item_groups || [];
    return `
      <div class="combo-group-editor">
        <label><strong>Combo Groups</strong></label>
        <div>
          ${comboGroups.map((group, groupIdx) => this.getComboGroupHTML(group, groupIdx)).join('')}
        </div>
        <button type="button" class="add-combo-group-btn btn-primary" style="margin-top:8px;">Add Combo Group</button>
      </div>
    `;
  }

  /**
   * Returns the HTML for a single combo group card.
   * @param {Object} group
   * @param {number} groupIdx
   * @return {string}
   */
  getComboGroupHTML(group, groupIdx) {
    const comboGroups = this.product.combo_item_groups || [];
    return `
      <div class="combo-group-card">
        <div class="combo-group-card-header">
          <div style="flex:1;">
            <label style="margin-left:12px;">
              Group Name:
              <input type="text" class="combo-group-name" data-group-idx="${groupIdx}" value="${group.group_name || ''}" placeholder="Group Name">
            </label>
            <label style="margin-left:12px;">
              Quantity:
              <input type="number" class="combo-group-qty" data-group-idx="${groupIdx}" value="${group.quantity || 1}" min="1" style="width:60px;">
            </label>
          </div>
          <div class="combo-group-card-actions">
            <button type="button" class="move-up-group-btn btn-secondary" data-group-idx="${groupIdx}" title="Move Up" ${groupIdx === 0 ? 'disabled' : ''}>▲</button>
            <button type="button" class="move-down-group-btn btn-secondary" data-group-idx="${groupIdx}" title="Move Down" ${groupIdx === comboGroups.length - 1 ? 'disabled' : ''}>▼</button>
            <button type="button" class="combo-group-remove-btn" data-group-idx="${groupIdx}" title="Remove Group">✕</button>
          </div>
        </div>
        <div class="combo-group-card-body">
          <div><strong>Items</strong></div>
          ${Array.isArray(group.items) && group.items.length > 0
            ? group.items.map((item, itemIdx) => this.getComboItemRowHTML(item, itemIdx, groupIdx)).join('')
            : '<div style="color:#888;">No items. Please add.</div>'
          }
          <button type="button" class="add-combo-item-btn btn-secondary" data-group-idx="${groupIdx}" style="margin-top:4px;">Add Item</button>
        </div>
      </div>
    `;
  }

  /**
   * Returns the HTML for a single combo item row.
   * @param {Object} item
   * @param {number} itemIdx
   * @param {number} groupIdx
   * @return {string}
   */
  getComboItemRowHTML(item, itemIdx, groupIdx) {
    return `
      <div class="combo-item-row" style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <select class="combo-item-select" data-group-idx="${groupIdx}" data-item-idx="${itemIdx}" style="flex:1;">
          ${this.menu.map(menuItem =>
            `<option value="${menuItem.item_id}" ${menuItem.item_id === (item.item_id || item) ? 'selected' : ''}>${menuItem.name}</option>`
          ).join('')}
        </select>
        <input type="number" class="combo-item-price-delta" data-group-idx="${groupIdx}" data-item-idx="${itemIdx}" value="${item.price_delta || 0}" style="width:80px;" placeholder="Price Δ">
        <button type="button" class="remove-combo-item-btn btn-danger" data-group-idx="${groupIdx}" data-item-idx="${itemIdx}" title="Remove Item">🗑️</button>
      </div>
    `;
  }
}

customElements.define('combo-group-editor', ComboGroupEditor);