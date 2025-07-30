// Product list component for merchant admin system

class MenuList extends HTMLElement {
  connectedCallback() {
    // Render the product list panel
    this.innerHTML = `<h2>Product List</h2><p>All products are displayed here.</p>`;
  }
}

customElements.define('menu-list', MenuList);