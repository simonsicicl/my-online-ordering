import { matchRoute } from './router.js';
import './components/layout/app-shell.js';
import './components/layout/nav-menu.js';
import { restaurantDataExample } from './example-data.js';

// Initialize global menu data (can be replaced with API data in the future)
window._menuData = {
  menu: restaurantDataExample.menu,
  categories: restaurantDataExample.categories,
  tags: restaurantDataExample.tags,
  option_groups: restaurantDataExample.option_groups
};

/**
 * Main application entry point for merchant admin SPA.
 * Handles routing and component rendering.
 */
class MerchantApp extends HTMLElement {
  constructor() {
    super();
    // Create and attach the main shell layout
    this.shell = document.createElement('app-shell');
    this.appendChild(this.shell);
    // Listen for hash changes to handle routing
    window.addEventListener('hashchange', () => this.route());
  }

  /**
   * Called when the element is added to the DOM.
   * Triggers initial route rendering.
   */
  connectedCallback() {
    this.route();
  }

  /**
   * Matches the current hash to a route, loads the corresponding component,
   * passes route params and menu data, and renders the component.
   * @return {Promise<void>}
   */
  async route() {
    // Match the current hash to a route object
    const match = matchRoute(location.hash.slice(1));
    if (!match || !match.componentPath) return;

    // Dynamically import the matched component
    const importPath = `./components/${match.componentPath}.js`;
    try {
      await import(importPath);
    } catch (e) {
      console.error(`Failed to load component: ${importPath}`, e);
      return;
    }

    // Create the custom element for the matched route
    const componentName = match.componentPath.split('/').pop();
    const el = document.createElement(componentName);

    // Pass route parameters as attributes to the element
    if (match.params) {
      Object.entries(match.params).forEach(([key, value]) => {
        el.setAttribute(key, value);
      });
    }

    // Pass menu data to menu-list and menu-editor components
    if (componentName === 'menu-list' || componentName === 'menu-editor') {
      el.categories = window._menuData.categories;
      el.tags = window._menuData.tags;
      el.option_groups = window._menuData.option_groups;
      el.menu = window._menuData.menu;
    }

    // Listen for the save event from menu-editor and update menu data
    if (componentName === 'menu-editor') {
      el.addEventListener('save', (e) => {
        const updated = e.detail;
        // Find index of existing product by item_id
        const idx = window._menuData.menu.findIndex(p => p.item_id === updated.item_id);
        if (idx > -1) {
          window._menuData.menu[idx] = updated; // Update existing product
        } else {
          // Add new product (generate new item_id)
          updated.item_id = Date.now(); // You can use a better id generation method
          window._menuData.menu.push(updated);
        }
        // Switch back to the product list page
        window.location.hash = '/menu/list';
      });
    }

    // Render the component inside the shell layout
    this.shell.setContent(el);
  }
}

// Register the main merchant app custom element
customElements.define('merchant-app', MerchantApp);
