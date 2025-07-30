// Category management component for merchant admin system

class CategoryManager extends HTMLElement {
  connectedCallback() {
    // Render the category management panel
    this.innerHTML = `<h2>Category Management</h2><p>Manage your product categories here.</p>`;
  }
}

customElements.define('category-manager', CategoryManager);