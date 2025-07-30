// Main shell layout component for merchant admin system

class AppShell extends HTMLElement {
  constructor() {
    super();
    // Attach shadow DOM for encapsulation
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    // Render the main shell layout with sidebar and main content area
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          height: 100vh;
          font-family: sans-serif;
        }
        nav-menu {
          width: 250px;
          height: 100vh;
          display: block;
          background: #333;
        }
        main {
          flex: 1;
          padding: 1em;
          overflow-y: auto;
        }
      </style>
      <nav-menu></nav-menu>
      <main id="main"></main>
    `;
  }

  /**
   * Set the main content area to the given element.
   * @param {HTMLElement} element - The page/component to display.
   */
  setContent(element) {
    const main = this.shadowRoot.querySelector('#main');
    main.innerHTML = '';
    if (element) main.appendChild(element);
  }
}

// Register the main shell custom element
customElements.define('app-shell', AppShell);
