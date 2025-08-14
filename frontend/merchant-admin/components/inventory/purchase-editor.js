// Modal to create or edit a purchase order, and receive items

import { createPurchaseOrderURL, updatePurchaseOrderURL, receivePurchaseOrderURL } from '../../../api.js';

class PurchaseEditor extends HTMLElement {
  constructor() {
    super();
    this._po = this.getNewPOTemplate();
  }

  // --- Getters and Setters ---
  set purchase_order(data) { this._po = data || this.getNewPOTemplate(); }
  get purchase_order() { return this._po || this.getNewPOTemplate(); }

  // --- Lifecycle methods ---
  /**
   * Called when the element is added to the DOM.
   */
  connectedCallback() {
    document.body.classList.add('modal-open');
    this.renderModal();
    this.renderEditor();
  }

  // --- Render methods ---
  /**
   * Renders the modal structure.
   * Contains a backdrop and content area.
   */
  renderModal() {
    this.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content"></div>
    `;
    this.querySelector('.modal-backdrop').onclick = () => this.handleClose();
  }

  /**
   * Renders the editor form inside the modal.
   */
  renderEditor() {
    this.querySelector('.modal-content').innerHTML = this.getEditorHTML();

    this.querySelector('.modal-close-btn').onclick = () => this.handleClose();
    this.querySelector('.cancel-btn').onclick = () => this.handleClose();

    this.querySelector('.add-btn').onclick = () => this.handleAddItem();

    this.querySelectorAll('.remove-btn').forEach(btn => {
      btn.onclick = (e) => this.handleRemoveItem(e);
    });

    this.querySelector('.po-form').onsubmit = async (e) => this.handleSave(e);

    this.querySelector('.receive-btn').onclick = async () => this.handleReceive();
  }

  // --- Event handlers ---
  /**
   * Handles the form submission for saving a purchase order.
   * Sends a POST or PUT request based on whether it's a new or existing order.
   */
  async handleSave(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const items = Array.from(this.querySelectorAll('.po-items tr')).map(tr => ({
      material_id: Number(tr.querySelector('input[name="material_id"]').value),
      ordered_qty: Number(tr.querySelector('input[name="ordered_qty"]').value),
      price: Number(tr.querySelector('input[name="price"]').value || 0)
    })).filter(it => it.material_id && it.ordered_qty > 0);

    const payload = {
      supplier_name: form.supplier_name.value.trim(),
      expected_date: form.expected_date.value,
      currency: form.currency.value,
      items
    };
    try {
      const isUpdate = !!this.purchase_order.purchase_id;
      const url = isUpdate ? updatePurchaseOrderURL(this.purchase_order.purchase_id) : createPurchaseOrderURL();
      const method = isUpdate ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      window.dispatchEvent(new CustomEvent('inventory:refresh'));
      this.handleClose();
    } catch (err) {
      console.error('Save purchase order failed', err);
      alert('Failed to save purchase order');
    }
  }

  /**
   * Handles receiving items for the purchase order.
   */
  async handleReceive() {
    try {
      const po = this.purchase_order;
      const items = (po.items||[]).map(it => ({ material_id: it.material_id, received_qty: it.ordered_qty }));
      const res = await fetch(receivePurchaseOrderURL(po.purchase_id), {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ items })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      window.dispatchEvent(new CustomEvent('inventory:refresh'));
      this.handleClose();
    } catch (err) {
      console.error('Receive PO failed', err);
      alert('Failed to receive purchase order');
    }
  }
  
  /**
   * Closes the modal and removes it from the DOM.
   */
  handleClose() {
    document.body.classList.remove('modal-open');
    this.remove();
  }

  /**
   * Handles adding a new item row to the purchase order form.
   */
  handleAddItem() {
    const tbody = this.querySelector('.po-items');
    const newRow = document.createElement('tr');
    newRow.innerHTML = this.itemRowHTML({}, tbody.children.length);
    newRow.querySelector('.remove-btn').onclick = (e) => this.handleRemoveItem(e);
    tbody.appendChild(newRow);
  }

  /**
   * Handles removing an item row from the purchase order form.
   */
  handleRemoveItem(e) {
    const tr = e.target.closest('tr');
    tr.remove();
  }

  // --- Utility methods ---
  /**
   * Returns a new purchase order template.
   * Used for initializing new purchase orders.
   */
  getNewPOTemplate() {
    return {
      supplier_id: null,
      supplier_name: '',
      expected_date: new Date().toISOString().slice(0,10),
      currency: 'TWD',
      items: []
    };
  }

  // --- HTML templates ---
  /**
   * Returns the HTML for the purchase order editor.
   * Contains form fields and item rows.
   * @return {string} HTML string for the editor.
   */
  getEditorHTML() {
    const po = this.purchase_order;
    return `
      <button type="button" class="modal-close-btn" aria-label="Close">×</button>
      <div class="editor-container">
        <div class="editor-header">
          <h2>${po.purchase_id ? 'Edit' : 'New'} Purchase Order</h2>
        </div>
        <form class="po-form">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <label>Supplier Name
              <input name="supplier_name" type="text" value="${po.supplier_name||''}">
            </label>
            <label>Expected Date
              <input name="expected_date" type="date" value="${po.expected_date||''}">
            </label>
            <label>Currency
              <select name="currency">
                ${['TWD','USD','JPY'].map(c=>`<option value="${c}" ${po.currency===c?'selected':''}>${c}</option>`).join('')}
              </select>
            </label>
          </div>
          <div style="margin-top:12px;">
            <table class="table">
              <thead><tr><th>Material ID</th><th>Ordered Qty</th><th>Price</th><th></th></tr></thead>
              <tbody class="po-items">
                ${(po.items||[]).map((it,idx)=>this.itemRowHTML(it, idx)).join('')}
              </tbody>
            </table>
            <button type="button" class="add-btn">+ Add Item</button>
          </div>
          <div class="form-actions">
            ${po.purchase_id ? '<button type="button" class="receive-btn">Receive</button>' : ''}
            ${po.purchase_id ? '<button type="button" class="delete-btn">Delete</button>' : ''}
            <button type="button" class="cancel-btn">Cancel</button>
            <button type="submit" class="save-btn">Save</button>
          </div>
        </form>
      </div>
    `;
  }

  /**
   * Returns the HTML for an item row in the purchase order form.
   * @param {Object} it - Item data.
   * @param {number} idx - Index of the item in the list.
   * @return {string} HTML string for the item row.
   */
  itemRowHTML(it = {}, idx) {
    return `
      <tr data-idx="${idx}">
        <td><input name="material_id" type="number" value="${it.material_id||''}" required style="width:120px"></td>
        <td><input name="ordered_qty" type="number" step="0.01" value="${Number(it.ordered_qty||0)}" required style="width:120px"></td>
        <td><input name="price" type="number" step="0.01" value="${Number(it.price||0)}" style="width:120px"></td>
        <td><button type="button" class="remove-btn">Remove</button></td>
      </tr>
    `;
  }
}

customElements.define('purchase-editor', PurchaseEditor);
