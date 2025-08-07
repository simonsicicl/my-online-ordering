import { matchRoute } from './router.js';
import './components/layout/app-shell.js';
import './components/layout/nav-menu.js';
import {
  getMenuURL,
  getCategoriesURL,
  getTagsURL,
  getOptionGroupsURL,
  getOptionListURL,
  getOrdersURL
} from '../api.js'; // Centralized API helpers

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

  async fetchMenuData() {
    // Fetch menu-related data from menu-service using centralized API helpers
    const [menu, categories, tags, option_groups, option_list] = await Promise.all([
      fetch(getMenuURL()).then(r => r.json()),
      fetch(getCategoriesURL()).then(r => r.json()),
      fetch(getTagsURL()).then(r => r.json()),
      fetch(getOptionGroupsURL()).then(r => r.json()),
      fetch(getOptionListURL()).then(r => r.json())
    ]);
    return { menu, categories, tags, option_groups, option_list };
  }

  async fetchOrderData() {
    // Fetch order list from order-service using centralized API helper
    const orders = await fetch(getOrdersURL()).then(r => r.json());
    return orders;
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
   * passes route params and menu/order data, and renders the component.
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

    // Menu-related pages
    if (componentName.startsWith('menu-')) {
      window._menuData = await this.fetchMenuData();
      el.categories = window._menuData?.categories || [];
      el.tags = window._menuData?.tags || [];
      el.menu = window._menuData?.menu || [];
      el.option_groups = window._menuData?.option_groups || [];
      el.option_list = window._menuData?.option_list || [];
    }

    // Option group list/editor
    if (componentName === 'option-group-list' || componentName === 'option-group-editor') {
      window._menuData = await this.fetchMenuData();
      el.option_groups = window._menuData?.option_groups || [];
      el.option_list = window._menuData?.option_list || [];
    }

    // Orders
    if (componentName === 'order-list') {
      window._orderData = await this.fetchOrderData();
      el.orders = window._orderData || [];
    }

    if (componentName === 'order-detail') {
      window._orderData = await this.fetchOrderData();
      let orderId = null;
      if (match.params && match.params.id) {
        orderId = Number(match.params.id);
      } else if (el.hasAttribute('id')) {
        orderId = Number(el.getAttribute('id'));
      }
      if (orderId && window._orderData) {
        const order = window._orderData.find(o => o.order_id === orderId);
        if (order) el.order = order;
      }
    }

    // Render the component inside the shell layout
    this.shell.setContent(el);
  }
}

// Register the main merchant app custom element
customElements.define('merchant-app', MerchantApp);
