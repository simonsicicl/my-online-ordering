import { matchRoute } from './router.js';
import './components/layout/app-shell.js';
import './components/layout/nav-menu.js';

// Main application entry point for merchant admin SPA
class MerchantApp extends HTMLElement {
  constructor() {
    super();
    // Create and attach the main shell layout
    this.shell = document.createElement('app-shell');
    this.appendChild(this.shell);
    // Listen for hash changes to handle routing
    window.addEventListener('hashchange', () => this.route());
  }

  connectedCallback() {
    // Initial route rendering when component is attached
    this.route();
  }

  async route() {
    // Match the current hash to a route
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

    // Render the component inside the shell layout
    this.shell.setContent(el);
  }
}

// Register the main merchant app custom element
customElements.define('merchant-app', MerchantApp);
