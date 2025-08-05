// Sidebar navigation menu component for merchant admin system

class NavMenu extends HTMLElement {
  constructor() {
    super();
    // Attach shadow DOM for style encapsulation
    this.attachShadow({ mode: 'open' });
  }

  /**
   * Called when the element is added to the DOM.
   * Renders the menu and sets up navigation event listeners.
   */
  connectedCallback() {
    this.render();
    // Listen for navigation link clicks
    this.shadowRoot.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-href]');
      if (link) {
        // Update hash for SPA navigation
        window.location.hash = link.getAttribute('data-href');
        e.preventDefault();
      }
    });
    // Re-render menu on hash change to update active state
    window.addEventListener('hashchange', () => this.render());
  }

  /**
   * Renders the sidebar menu with navigation links.
   */
  render() {
    const isMobile = this.hasAttribute('data-mobile');
    // Render sidebar menu HTML and styles
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="./components/layout/nav-menu.css" />
      <nav>
        ${!isMobile ? `<div class="logo">Merchant Admin</div>` : ''}
        <a data-href="/" class="${this.isActive('/')}"><span class="icon">🏠</span>Dashboard</a>
        <a data-href="/menu" class="${this.isActive('/menu')}"><span class="icon">🍽️</span>Menu Management</a>
        <a data-href="/inventory" class="${this.isActive('/inventory')}"><span class="icon">📦</span>Inventory Management</a>
        <a data-href="/orders" class="${this.isActive('/orders')}"><span class="icon">🧾</span>Order Management</a>
        <div class="divider"></div>
        <a data-href="/analysis" class="${this.isActive('/analysis')}"><span class="icon">📊</span>Analytics</a>
        <a data-href="/settings" class="${this.isActive('/settings')}"><span class="icon">⚙️</span>Merchant Settings</a>
        <a data-href="/devices" class="${this.isActive('/devices')}"><span class="icon">🖥️</span>Device Management</a>
        <div class="divider"></div>
        <a data-href="/notifications" class="${this.isActive('/notifications')}"><span class="icon">🔔</span>Notifications</a>
        <a data-href="/help" class="${this.isActive('/help')}"><span class="icon">❓</span>Help</a>
        <a data-href="/account" class="${this.isActive('/account')}"><span class="icon">👤</span>User Account</a>
        <a data-href="/logout" class="${this.isActive('/logout')}"><span class="icon">🚪</span>Logout</a>
      </nav>
    `;
  }

  /**
   * Returns 'active' if the route matches the current hash.
   * @param {string} route - The route to check.
   * @return {string} CSS class name for active state.
   */
  isActive(route) {
    // Compare current hash with route to determine active state
    return window.location.hash.replace('#', '') === route ? 'active' : '';
  }
}

// Register the sidebar navigation menu custom element
customElements.define('nav-menu', NavMenu);