/**
 * OptionGroupEditor - A custom HTML element for managing product option groups
 * Supports both universal (predefined) and custom option groups
 */
class OptionGroupEditor extends HTMLElement {
  // Setter for product data - triggers re-render when data changes
  set value(data) { this._data = data; this.render(); }
  
  // Setter for available option groups from the database
  set optionGroups(data) { this._optionGroups = data; }
  
  // Getter for current product data
  get value() { return this._data; }

  // Legacy setter for product data (for backward compatibility)
  set product(data) { this._product = data; this.render(); }

  // Called when element is added to the DOM
  connectedCallback() { 
    this.render(); 
  }

  /**
   * Main render method - builds the UI for option group management
   */
  render() {
    // Don't render if required data is not available
    if (!this._data ||  !this._optionGroups) {
      this.innerHTML = `<div>Loading...</div>`;
      return;
    }
    const product = this._data;
    const optionGroups = this._optionGroups || [];
    if (!product) {
      this.innerHTML = `<div>No product data</div>`;
      return;
    }
    
    // Safety check: ensure option_groups is an array
    if (!Array.isArray(product.option_groups)) {
      product.option_groups = [];
    }
    
    // Build the HTML structure
    this.innerHTML = this.getHTML();

    // Bind event handlers for all interactive elements
    this.bindEventHandlers();
  }

  /**
   * Binds all event handlers to interactive elements in the component
   */
  bindEventHandlers() {
    // Universal option group dropdown changes
    this.querySelectorAll('.option-group-select').forEach(sel => {
      sel.onchange = this.handleOptionGroupSelectChange.bind(this);
    });
    
    // Remove group buttons
    this.querySelectorAll('.remove-group-btn').forEach(btn => {
      btn.onclick = this.handleRemoveGroup.bind(this);
    });
    
    // Add universal/custom group buttons
    const addUniversalBtn = this.querySelector('#addUniversalOptionGroupBtn');
    if (addUniversalBtn) addUniversalBtn.onclick = this.handleAddUniversalGroup.bind(this);
    const addCustomBtn = this.querySelector('#addCustomOptionGroupBtn');
    if (addCustomBtn) addCustomBtn.onclick = this.handleAddCustomGroup.bind(this);
    
    // Custom group name inputs
    this.querySelectorAll('.custom-group-name').forEach(input => {
      input.oninput = this.handleCustomGroupNameChange.bind(this);
    });
    
    // Custom group selection type dropdowns
    this.querySelectorAll('.custom-selection-type').forEach(sel => {
      sel.onchange = this.handleCustomSelectionTypeChange.bind(this);
    });
    
    // Custom option name and price inputs
    this.querySelectorAll('.custom-option-name').forEach(input => {
      input.oninput = this.handleCustomOptionNameChange.bind(this);
    });
    this.querySelectorAll('.custom-option-price').forEach(input => {
      input.oninput = this.handleCustomOptionPriceChange.bind(this);
    });
    
    // Custom option management buttons
    this.querySelectorAll('.remove-custom-option-btn').forEach(btn => {
      btn.onclick = this.handleRemoveCustomOption.bind(this);
    });
    this.querySelectorAll('.add-custom-option-btn').forEach(btn => {
      btn.onclick = this.handleAddCustomOption.bind(this);
    });
    
    // Default option selection for single-choice custom groups
    this.querySelectorAll('.custom-default-option-select').forEach(sel => {
      sel.onchange = this.handleCustomDefaultOptionChange.bind(this);
    });
  }

  /**
   * Handles changes to universal option group selection
   */

  /**
   * Handles changes to universal option group selection
   * Updates the product data and triggers a re-render
   */
  handleOptionGroupSelectChange(e) {
    const idx = Number(e.target.dataset.idx);
    const val = e.target.value;
    this._data.option_groups[idx] = Number(val);
    this.dispatchEvent(new CustomEvent('change', { detail: { option_groups: this._data.option_groups } }));
    this.render();
  }

  /**
   * Handles removal of an option group from the product
   */
  handleRemoveGroup(e) {
    const idx = Number(e.target.dataset.idx);
    this._data.option_groups.splice(idx, 1);
    this.dispatchEvent(new CustomEvent('change', { detail: { option_groups: this._data.option_groups } }));
    this.render();
  }

  /**
   * Adds a new universal option group to the product
   * Only adds if there are available universal groups not already in use
   */
  handleAddUniversalGroup() {
    const usedIds = this._data.option_groups.filter(g => typeof g === 'number');
    const available = (this._optionGroups || []).filter(
      og => og.is_universal && !usedIds.includes(og.option_group_id)
    );
    if (available.length > 0) {
      this._data.option_groups.push(available[0].option_group_id);
      this.render();
      this.dispatchEvent(new CustomEvent('change', { detail: { option_groups: this._data.option_groups } }));
    }
  }

  /**
   * Adds a new custom option group to the product
   * Creates a new group with default values
   */
  handleAddCustomGroup() {
    this._data.option_groups.push({
      group_name: '',
      is_required: true,
      is_multiple: false,
      options: [{ option_name: '', price_delta: 0 }],
      default_option_id: 0
    });
    this.render();
    this.dispatchEvent(new CustomEvent('change', { detail: { option_groups: this._data.option_groups } }));
  }

  /**
   * Handles changes to custom group name
   */
  handleCustomGroupNameChange(e) {
    const idx = Number(e.target.dataset.groupIdx);
    this._data.option_groups[idx].group_name = e.target.value;
    this.dispatchEvent(new CustomEvent('change', { detail: { option_groups: this._data.option_groups } }));
  }

  /**
   * Handles changes to custom group selection type (single/multiple)
   */
  handleCustomSelectionTypeChange(e) {
    const idx = Number(e.target.dataset.groupIdx);
    const val = e.target.value;
    if (val === 'single') {
      this._data.option_groups[idx].is_multiple = false;
      this._data.option_groups[idx].is_required = true;
    } else {
      this._data.option_groups[idx].is_multiple = true;
      this._data.option_groups[idx].is_required = false;
    }
    this.dispatchEvent(new CustomEvent('change', { detail: { option_groups: this._data.option_groups } }));
    this.render();
  }

  /**
   * Handles changes to custom option names
   */
  handleCustomOptionNameChange(e) {
    const groupIdx = Number(e.target.dataset.groupIdx);
    const optIdx = Number(e.target.dataset.optIdx);
    this._data.option_groups[groupIdx].options[optIdx].option_name = e.target.value;
    this.dispatchEvent(new CustomEvent('change', { detail: { option_groups: this._data.option_groups } }));
  }

  /**
   * Handles changes to custom option price deltas
   */
  handleCustomOptionPriceChange(e) {
    const groupIdx = Number(e.target.dataset.groupIdx);
    const optIdx = Number(e.target.dataset.optIdx);
    this._data.option_groups[groupIdx].options[optIdx].price_delta = Number(e.target.value);
    this.dispatchEvent(new CustomEvent('change', { detail: { option_groups: this._data.option_groups } }));
  }

  /**
   * Handles removal of custom options from a group
   * Prevents removal if it would leave the group with no options
   */
  handleRemoveCustomOption(e) {
    const groupIdx = Number(e.target.dataset.groupIdx);
    const optIdx = Number(e.target.dataset.optIdx);
    if (this._data.option_groups[groupIdx].options.length <= 1) {
      alert('At least one option must remain in the group.');
      return;
    }
    this._data.option_groups[groupIdx].options.splice(optIdx, 1);
    this.dispatchEvent(new CustomEvent('change', { detail: { option_groups: this._data.option_groups } }));
    this.render();
  }

  /**
   * Adds a new custom option to a group
   */
  handleAddCustomOption(e) {
    const groupIdx = Number(e.target.dataset.groupIdx);
    this._data.option_groups[groupIdx].options.push({ option_name: '', price_delta: 0 });
    this.dispatchEvent(new CustomEvent('change', { detail: { option_groups: this._data.option_groups } }));
    this.render();
  }

  /**
   * Handles changes to the default option for single-choice custom groups
   */
  handleCustomDefaultOptionChange(e) {
    const groupIdx = Number(e.target.dataset.groupIdx);
    this._data.option_groups[groupIdx].default_option_id = Number(e.target.value);
    this.dispatchEvent(new CustomEvent('change', { detail: { option_groups: this._data.option_groups } }));
  }

  /**
   * Generates the main HTML structure for the component
   * @returns {string} The HTML string for the option group editor
   */
  getHTML() {
    const product = this._data;
    const optionGroups = this._optionGroups || [];
    return `
      <div class="option-section editor-block">
        <h3>Product Option Groups</h3>
        ${product.option_groups?.map((groupRef, idx) => {
          const group = optionGroups.find(g => g.option_group_id === groupRef);
          // Check if this is a universal (predefined) option group
          if (group && group.is_universal) {
            return this.getUniversalOptionGroupCardHTML(group, optionGroups, idx, groupRef);
          } else {
            // This is a custom option group
            const group = groupRef;
            const showDefault = !group.is_multiple;
            return this.getCustomOptionGroupCardHTML(group, idx, showDefault);
          }
        }).join('')}
        <div style="display:flex; gap:12px; margin-top:12px;">
          <button type="button" id="addUniversalOptionGroupBtn" class="btn-primary">Add Universal Group</button>
          <button type="button" id="addCustomOptionGroupBtn" class="btn-secondary">Add Custom Group</button>
        </div>
      </div>
    `;
  }

  /**
   * Generates HTML for universal (predefined) option group cards
   * @param {Object} group - The universal option group data
   * @param {Array} optionGroups - All available option groups
   * @param {number} idx - Index of the current group
   * @param {number} groupRef - Reference ID of the group
   * @returns {string} HTML string for the universal option group card
   */
  getUniversalOptionGroupCardHTML(group, optionGroups, idx, groupRef) {
    return `
      <div class="option-group editor-subblock">
        <div class="option-group-header">
          <label>
            Option Group:
            <select class="option-group-select" data-idx="${idx}">
              ${optionGroups
                .filter(og => og.is_universal)
                .map(og =>
                  `<option value="${og.option_group_id}" ${og.option_group_id === groupRef ? 'selected' : ''}>${og.universal_name}</option>`
                ).join('')}
            </select>
          </label>
          <button type="button" class="remove-group-btn btn-danger" data-idx="${idx}">Remove Group</button>
        </div>
        <div>
          <strong>Selection Type:</strong> ${group && group.is_multiple ? 'Multiple (Optional)' : 'Single (Required)'}
        </div>
        <div>
          <strong>Options:</strong>
          <ul>
            ${group && group.options ? group.options.map(opt => `<li>${opt.option_name} (${opt.price_delta > 0 ? '+' + opt.price_delta : '0'})</li>`).join('') : ''}
          </ul>
        </div>
      </div>
    `;
  }

  /**
   * Generates HTML for custom option group cards
   * @param {Object} group - The custom option group data
   * @param {number} idx - Index of the current group
   * @param {boolean} showDefault - Whether to show default option selector (for single-choice groups)
   * @returns {string} HTML string for the custom option group card
   */
  getCustomOptionGroupCardHTML(group, idx, showDefault) {
    return `
      <div class="option-group editor-subblock">
        <div class="option-group-header">
          <label>
            Option Group:
            <span class="custom-group-label">Custom Group</span>
          </label>
          <button type="button" class="remove-group-btn btn-danger" data-idx="${idx}">Remove Group</button>
        </div>
        <div class="custom-option-group-editor" style="margin-top:12px;">
          <label>
            Group Name:
            <input type="text" class="custom-group-name" data-group-idx="${idx}" value="${group.group_name || ''}">
          </label>
          <label>
            Selection Type:
            <select class="custom-selection-type" data-group-idx="${idx}">
              <option value="single" ${(group.is_required !== false && !group.is_multiple) ? 'selected' : ''}>Single (Required)</option>
              <option value="multiple" ${(!group.is_required && group.is_multiple) ? 'selected' : ''}>Multiple (Optional)</option>
            </select>
          </label>
          <div>
            <strong>Options:</strong>
            <ul>
              ${(group.options || []).map((opt, optIdx) => `
                <li>
                  <input type="text" class="custom-option-name" data-group-idx="${idx}" data-opt-idx="${optIdx}" value="${opt.option_name || ''}" placeholder="Option Name">
                  <input type="number" class="custom-option-price" data-group-idx="${idx}" data-opt-idx="${optIdx}" value="${opt.price_delta || 0}" style="width:50px;" placeholder="Price Delta">
                  <button type="button" class="remove-custom-option-btn btn-danger" data-group-idx="${idx}" data-opt-idx="${optIdx}" ${group.options.length === 1 ? 'disabled' : ''}>🗑️</button>
                </li>
              `).join('')}
            </ul>
            <button type="button" class="add-custom-option-btn btn-secondary" data-group-idx="${idx}">Add Option</button>
          </div>
          ${
            showDefault
              ? `<div style="margin-top:10px;">
                  <label>
                    Default Option:
                    <select class="custom-default-option-select" data-group-idx="${idx}">
                      ${group.options.map((opt, optIdx) =>
                        `<option value="${optIdx}" ${group.default_option_id === optIdx ? 'selected' : ''}>${opt.option_name || '(Unnamed)'}</option>`
                      ).join('')}
                    </select>
                  </label>
                </div>`
              : ''
          }
        </div>
      </div>
    `;
  }
}
customElements.define('option-group-editor', OptionGroupEditor);