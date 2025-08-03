
/**
 * ComboGroupEditor - Custom element for managing combo item groups in a product
 * Allows adding, editing, and removing combo groups and their items
 */
class ComboGroupEditor extends HTMLElement {
  // Setter for product data; triggers re-render when data changes
  set value(data) { this._data = data; this.render(); }
  // Setter for menu data (list of available items)
  set menu(data) { this._menu = data; }
  // Getter for current product data
  get value() { return this._data; }

  // Called when element is added to the DOM
  connectedCallback() { this.render(); }

  /**
   * Main render method - builds the UI for combo group management
   */
  render() {
    const product = this._data;
    const menu = this._menu || [];
    if (!product) {
      this.innerHTML = `<div>No product data</div>`;
      return;
    }
    this.innerHTML = this.getHTML(product, menu);

    // Bind event handlers for all interactive elements
    // Group name input
    this.querySelectorAll('.combo-group-name').forEach(input => {
      input.oninput = this.handleGroupNameInput.bind(this);
    });
    // Quantity input
    this.querySelectorAll('.combo-quantity').forEach(input => {
      input.oninput = this.handleGroupQuantityInput.bind(this);
    });
    // Remove group button
    this.querySelectorAll('.remove-combo-group-btn').forEach(btn => {
      btn.onclick = this.handleRemoveGroup.bind(this);
    });
    // Add item button
    this.querySelectorAll('.add-combo-item-btn').forEach(btn => {
      btn.onclick = this.handleAddComboItem.bind(this);
    });
    // Remove item button
    this.querySelectorAll('.remove-combo-item-btn').forEach(btn => {
      btn.onclick = this.handleRemoveComboItem.bind(this);
    });
    // Item select dropdown
    this.querySelectorAll('.combo-item-select').forEach(sel => {
      sel.onchange = this.handleComboItemSelectChange.bind(this);
    });
    // Item price delta input
    this.querySelectorAll('.combo-item-price-delta').forEach(input => {
      input.oninput = this.handleComboItemPriceDeltaInput.bind(this);
    });
    // Add combo group button
    const addComboGroupBtn = this.querySelector('#addComboGroupBtn');
    if (addComboGroupBtn) addComboGroupBtn.onclick = this.handleAddComboGroup.bind(this);
  }


  /**
   * Handles input for group name changes
   */
  handleGroupNameInput(e) {
    const product = this._data;
    const idx = Number(e.target.dataset.groupIdx);
    product.combo_item_groups[idx].group_name = e.target.value;
    this.dispatchEvent(new CustomEvent('change', { detail: product }));
  }


  /**
   * Handles input for group quantity changes
   */
  handleGroupQuantityInput(e) {
    const product = this._data;
    const idx = Number(e.target.dataset.groupIdx);
    product.combo_item_groups[idx].quantity = Number(e.target.value);
    this.dispatchEvent(new CustomEvent('change', { detail: product }));
  }


  /**
   * Handles removal of a combo group
   */
  handleRemoveGroup(e) {
    const product = this._data;
    const idx = Number(e.target.dataset.idx);
    product.combo_item_groups.splice(idx, 1);
    this.render();
    this.dispatchEvent(new CustomEvent('change', { detail: product }));
  }


  /**
   * Handles adding a new item to a combo group
   */
  handleAddComboItem(e) {
    const product = this._data;
    const menu = this._menu || [];
    const groupIdx = Number(e.target.dataset.groupIdx);
    product.combo_item_groups[groupIdx].items.push({
      item_id: menu[0]?.item_id || 0,
      price_delta: 0
    });
    this.render();
    this.dispatchEvent(new CustomEvent('change', { detail: product }));
  }


  /**
   * Handles removal of an item from a combo group
   */
  handleRemoveComboItem(e) {
    const product = this._data;
    const groupIdx = Number(e.target.dataset.groupIdx);
    const itemIdx = Number(e.target.dataset.itemIdx);
    product.combo_item_groups[groupIdx].items.splice(itemIdx, 1);
    this.render();
    this.dispatchEvent(new CustomEvent('change', { detail: product }));
  }


  /**
   * Handles selection change for combo item dropdown
   */
  handleComboItemSelectChange(e) {
    const product = this._data;
    const groupIdx = Number(e.target.dataset.groupIdx);
    const itemIdx = Number(e.target.dataset.itemIdx);
    product.combo_item_groups[groupIdx].items[itemIdx].item_id = Number(e.target.value);
    this.dispatchEvent(new CustomEvent('change', { detail: product }));
  }


  /**
   * Handles input for price delta changes on combo items
   */
  handleComboItemPriceDeltaInput(e) {
    const product = this._data;
    const groupIdx = Number(e.target.dataset.groupIdx);
    const itemIdx = Number(e.target.dataset.itemIdx);
    product.combo_item_groups[groupIdx].items[itemIdx].price_delta = Number(e.target.value);
    this.dispatchEvent(new CustomEvent('change', { detail: product }));
  }


  /**
   * Handles adding a new combo group
   */
  handleAddComboGroup() {
    const product = this._data;
    product.combo_item_groups = product.combo_item_groups || [];
    product.combo_item_groups.push({
      item_group_id: Date.now() + Math.floor(Math.random() * 1000),
      group_name: '',
      quantity: 1,
      items: []
    });
    this.render();
    this.dispatchEvent(new CustomEvent('change', { detail: product }));
  }


  /**
   * Generates the main HTML structure for the combo group editor
   * @param {Object} product - The product data
   * @param {Array} menu - The menu items available for selection
   * @returns {string} The HTML string for the combo group editor
   */
  getHTML(product, menu) {
    return `
      <div class="combo-section editor-block">
        <h3>Combo Item Groups</h3>
        ${product.combo_item_groups?.map((group, groupIdx) => this.getGroupEditorHTML(group, groupIdx, menu)).join('')}
        <button type="button" id="addComboGroupBtn" class="btn-primary">Add Combo Group</button>
      </div>
    `;
  }


  /**
   * Generates the HTML for a single combo group editor card
   * @param {Object} group - The combo group data
   * @param {number} groupIdx - The index of the group
   * @param {Array} menu - The menu items available for selection
   * @returns {string} The HTML string for the combo group card
   */
  getGroupEditorHTML(group, groupIdx, menu) {
    return `
          <div class="combo-group editor-subblock" data-group-id="${group.item_group_id}">
            <div class="combo-group-header">
              <label>
                Group Name:
                <input type="text" class="combo-group-name" value="${group.group_name || ''}" data-group-idx="${groupIdx}">
              </label>
              <label>
                Quantity:
                <input type="number" class="combo-quantity" value="${group.quantity || 1}" data-group-idx="${groupIdx}">
              </label>
              <button type="button" class="remove-combo-group-btn btn-danger" data-idx="${groupIdx}">Remove Group</button>
            </div>
            <div class="combo-item-list">
              <h4>Items</h4>
              ${group.items.map((item, itemIdx) => this.getGroupItemHTML(item, itemIdx, groupIdx, menu)).join('')}
              <button type="button" class="add-combo-item-btn btn-secondary" data-group-idx="${groupIdx}">Add Item</button>
            </div>
          </div>
        `;
  }


  /**
   * Generates the HTML for a single combo item row
   * @param {Object} item - The combo item data
   * @param {number} itemIdx - The index of the item
   * @param {number} groupIdx - The index of the group
   * @param {Array} menu - The menu items available for selection
   * @returns {string} The HTML string for the combo item row
   */
  getGroupItemHTML(item, itemIdx, groupIdx, menu) {
    return `
          <div class="combo-item-row editor-row">
            <select class="combo-item-select" data-group-idx="${groupIdx}" data-item-idx="${itemIdx}">
              ${menu.map(menuItem =>
                `<option value="${menuItem.item_id}" ${menuItem.item_id === item.item_id ? 'selected' : ''}>${menuItem.name}</option>`
              ).join('')}
            </select>
            <span style="display:inline-flex;align-items:center;margin-left:8px;">
              <span style="margin-right:2px;">$</span>
              <input type="number" class="combo-item-price-delta" value="${item.price_delta || 0}" data-group-idx="${groupIdx}" data-item-idx="${itemIdx}" style="width:70px;" placeholder="Price Delta">
            </span>
            <!-- Remove item button with trashcan icon -->
            <button type="button" class="remove-combo-item-btn btn-danger" data-group-idx="${groupIdx}" data-item-idx="${itemIdx}" title="Remove Item">
              <!-- Trashcan icon for remove action -->
              🗑️
            </button>
          </div>
        `;
  }
}
customElements.define('combo-group-editor', ComboGroupEditor);