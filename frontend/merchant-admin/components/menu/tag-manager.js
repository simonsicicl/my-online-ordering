// Tag management component for merchant admin system

class TagManager extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <h2>Tag Management</h2>
      <p>Manage product tags to help categorize and organize your menu items for easier searching and filtering.</p>
    `;
  }
}

customElements.define('tag-manager', TagManager);