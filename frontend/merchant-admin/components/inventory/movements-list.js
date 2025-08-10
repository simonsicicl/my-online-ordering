// Inventory movement records component for merchant admin system

class MovementsList extends HTMLElement {
  set movements(data) { this._movements = data || []; }
  set materials(data) { this._materials = data || []; }
  get movements() { return this._movements || []; }
  get materials() { return this._materials || []; }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = this.getHTML();
  }

  getMaterialName(id) {
    return this.materials.find(m => m.material_id === id)?.name || `#${id}`;
  }

  getHTML() {
    return `
      <h2>Inventory Movements</h2>
      <div class="table-responsive">
        <table class="simple-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Material</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Note</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            ${(this.movements || []).map(m => this.getTableRowHTML(m)).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  getTableRowHTML(movement) {
    return `
      <tr>
        <td data-label="ID">${movement.movement_id}</td>
        <td data-label="Material">${this.getMaterialName(movement.material_id)}</td>
        <td data-label="Type">${movement.movement_type}</td>
        <td class="text-right" data-label="Quantity">${Number(movement.quantity).toLocaleString()}</td>
        <td data-label="Note">${movement.note || '-'}</td>
        <td data-label="Created At">${new Date(movement.created_at).toLocaleString()}</td>
      </tr>
    `;
  }
}

customElements.define('movements-list', MovementsList);