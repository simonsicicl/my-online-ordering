// Product editor component for merchant admin system

class MenuEditor extends HTMLElement {
  connectedCallback() {
    // Get the product ID from attribute
    const itemId = this.getAttribute('item-id') || '';
    // Render the product editor panel
    this.innerHTML = `<h2>Product Editor</h2><p>Edit product ID: ${itemId}</p>`;
  }
}

customElements.define('menu-editor', MenuEditor);