// Sidebar navigation menu component for merchant admin system

class NavMenu extends HTMLElement {
  constructor() {
    super();
    // Attach shadow DOM for style encapsulation
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    // Initial render and event listeners for navigation
    this.render();
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

  render() {
    // Render sidebar menu with navigation links
    const isMobile = this.hasAttribute('data-mobile');
    this.shadowRoot.innerHTML = `
      <style>
        nav {
          display: flex;
          flex-direction: column;
          background: #23272f;
          padding: 20px 0;
          min-width: 250px;
          height: 100%;
          box-sizing: border-box;
        }
        .logo {
          font-size: 1.4em;
          font-weight: bold;
          color: #fff;
          text-align: center;
          margin-bottom: 24px;
          letter-spacing: 2px;
        }
        a {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #d1d5db;
          text-decoration: none;
          padding: 12px 24px;
          font-size: 14px;
          border-radius: 6px;
          margin: 2px 8px;
          transition: background 0.2s, color 0.2s;
        }
        a.active {
          background: #374151;
          color: #fff;
          font-weight: bold;
        }
        a:hover {
          background: #2d3340;
          color: #fff;
        }
        .divider {
          height: 1px;
          background: #444;
          margin: 10px 0;
        }
        .icon {
          font-size: 1.1em;
          width: 22px;
          text-align: center;
        }
      </style>
      <nav>
        ${!isMobile ? `<div class="logo">Merchant Admin</div>` : ''}
        <a data-href="/" class="${this.isActive('/')}"><span class="icon">🏠</span>Dashboard</a>
        <a data-href="/menu" class="${this.isActive('/menu')}"><span class="icon">📦</span>Product Management</a>
        <a data-href="/categories" class="${this.isActive('/categories')}"><span class="icon">🗂️</span>Category Management</a>
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
   * @returns {string} CSS class name for active state.
   */
  isActive(route) {
    return window.location.hash.replace('#', '') === route ? 'active' : '';
  }
}

// Register the sidebar navigation menu custom element
customElements.define('nav-menu', NavMenu);