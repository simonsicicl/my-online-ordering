// Option Group Selector (dropdown with checkboxes)
// Edits product.option_groups in-place. No need to emit change events for data sync.

class OptionGroupSelector extends HTMLElement {
  // --- Data setters/getters ---
  /**
   * Sets available option groups to pick from.
   * @param {Array} data
   */
  set optionGroups(data) { this._optionGroups = data || []; }
  get optionGroups() { return this._optionGroups || []; }

  /**
   * Sets flat option list used for displaying option names under groups.
   * @param {Array} data
   */
  set optionList(data) { this._optionList = data || []; }
  get optionList() { return this._optionList || []; }

  /**
   * Sets the product being edited and ensures required structure exists.
   * @param {Object} data
   */
  set product(data) {
    this._product = data || {};
    if (!Array.isArray(this._product.option_groups)) {
      this._product.option_groups = [];
    }
  }
  get product() {
    if (!this._product || typeof this._product !== 'object') this._product = {};
    if (!Array.isArray(this._product.option_groups)) this._product.option_groups = [];
    return this._product;
  }

  // --- Lifecycle methods ---
  constructor() {
    super();
    this._optionGroups = [];
    this._optionList = [];
    this._product = {};
  }

  /**
   * Called when the element is added to the DOM.
   * Renders the selector UI.
   */
  connectedCallback() {
    this.render();
  }

  // --- Render methods ---
  /**
   * Renders the option group selector UI and binds UI events.
   */
  render() {
    this.innerHTML = this.getHTML();

    const dropdownBtn = this.querySelector('.option-group-dropdown-btn');
    const dropdownContent = this.querySelector('.option-group-dropdown-content');

    // Fill dropdown checkbox list
    dropdownContent.innerHTML = this.getDropdownHTML();

    // Toggle dropdown visibility
    dropdownBtn.onclick = (e) => this.handleOptionGroupDropdownButtonClick(e);

    // Prevent closing the dropdown when clicking inside the content
    dropdownContent.onclick = (e) => e.stopPropagation();

    // Bind checkbox change events
    dropdownContent.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.onchange = (e) => this.handleCheckboxChange(e);
    });

    // Initial selected info rendering
    this.renderSelectedInfo();
  }

  /**
   * Renders the selected option group details below the dropdown.
   */
  renderSelectedInfo() {
    const selectedInfo = this.querySelector('.selected-info');
    if (!selectedInfo) return;

    const selectedIds = this.product?.option_groups || [];
    if (!selectedIds.length) {
      selectedInfo.innerHTML = '<em>No option group selected.</em>';
      return;
    }

    selectedInfo.innerHTML = selectedIds.map(id => {
      const group = this.optionGroups.find(g => g.option_group_id === id);
      if (!group) return '';
      const optionsText = this.optionList
        .filter(option => group.option_ids?.includes(option.option_id))
        .map(option => option.option_name)
        .join(', ') || '-';
      return `
        <div class="option-group-info">
          <strong>${group.group_name}</strong><br>
          <span>${group.is_multiple ? 'Multiple' : 'Single'}</span><br>
          <span>Options: ${optionsText}</span>
        </div>
      `;
    }).join('');
  }

  // --- Event handlers ---
  /**
   * Toggles the dropdown visibility.
   * @param {Event} e
   */
  handleOptionGroupDropdownButtonClick(e) {
    e.stopPropagation();
    const content = this.querySelector('.option-group-dropdown-content');
    content.style.display = content.style.display === 'block' ? 'none' : 'block';
  }

  /**
   * Applies checkbox changes to product.option_groups and updates the summary.
   * @param {Event} e
   */
  handleCheckboxChange(e) {
    const selectedIds = this.getCurrentSelectedIds();
    if (this.product) this.product.option_groups = selectedIds;
    this.renderSelectedInfo();
  }

  // --- Helpers ---
  /**
   * Returns the currently checked option group IDs from the dropdown.
   * @returns {number[]}
   */
  getCurrentSelectedIds() {
    const dropdownContent = this.querySelector('.option-group-dropdown-content');
    if (!dropdownContent) return [];
    return Array.from(dropdownContent.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => Number(cb.value));
  }

  // --- HTML generators ---
  /**
   * Returns the root HTML structure for the selector.
   * @returns {string}
   */
  getHTML() {
    return `
      <div class="option-group-selector">
        <label><strong>Option Groups</strong></label>
        <div class="custom-dropdown option-group-dropdown">
          <button class="custom-dropdown-btn option-group-dropdown-btn" type="button">Select Option Groups</button>
          <div class="custom-dropdown-content option-group-dropdown-content" style="display: none;"></div>
        </div>
        <div class="selected-info"></div>
      </div>
    `;
  }

  /**
   * Returns the HTML for the dropdown checkbox list.
   * @returns {string}
   */
  getDropdownHTML() {
    const selectedGroupIds = this.product?.option_groups || [];
    return this.optionGroups.map(group => {
      const checked = selectedGroupIds.includes(group.option_group_id) ? 'checked' : '';
      return `<label>
        <input type="checkbox" value="${group.option_group_id}" ${checked}> ${group.group_name}
      </label>`;
    }).join('');
  }

  // --- Compatibility (optional) ---
  // If needed in the future, a save() method can be reintroduced to emit change events.
  // save(product) {
  //   const selectedIds = this.getCurrentSelectedIds();
  //   if (product) product.option_groups = selectedIds;
  //   if (this.product) this.product.option_groups = selectedIds;
  //   this.dispatchEvent(new CustomEvent('change', { detail: { option_groups: selectedIds } }));
  //   return selectedIds;
  // }
}

customElements.define('option-group-selector', OptionGroupSelector);

