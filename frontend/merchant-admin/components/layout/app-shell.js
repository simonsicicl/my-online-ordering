// Main shell layout component for merchant admin system

class AppShell extends HTMLElement {
  constructor() {
    super();
    // Attach shadow DOM for encapsulation
    this.attachShadow({ mode: 'open' });
    this.menuOpen = false;
    // Track last mobile/desktop state to optimize rendering on resize
    this._lastIsMobile = window.innerWidth <= 768;
  }

  // --- Lifecycle methods ---
  /**
   * Called when the element is added to the DOM.
   * Triggers initial render and event binding.
   */
  connectedCallback() {
    this.render();
    this.bindEvents();
    // Listen for window resize to handle responsive layout
    window.addEventListener('resize', () => this.handleResize());
  }

  // --- Event binding ---
  /**
   * Bind UI events for hamburger menu and nav-menu.
   * Handles menu open/close and mobile navigation.
   */
  bindEvents() {
    const hamburgerBtn = this.shadowRoot.getElementById('hamburgerBtn');
    if (hamburgerBtn) {
      hamburgerBtn.onclick = () => {
        // Toggle menu open state
        this.menuOpen = !this.menuOpen;
        this.updateMenuDisplay();
      };
    }
    const navMenu = this.shadowRoot.querySelector('nav-menu');
    if (navMenu) {
      navMenu.addEventListener('click', () => {
        // On mobile, close menu after clicking any link
        if (window.innerWidth <= 768) {
          this.menuOpen = false;
          this.updateMenuDisplay();
        }
      });
    }
  }

  // --- Responsive handling ---
  /**
   * Handle window resize: re-render only if switching between mobile/desktop
   * and preserve main content during re-render.
   */
  handleResize() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile !== this._lastIsMobile) {
      this._lastIsMobile = isMobile;
      this.bindEvents();
      this.updateMenuDisplay();
    }
  }

  // --- Rendering ---
  /**
   * Render the shell layout: header, nav-menu, and main content area.
   * Responsive: header and hamburger menu for mobile, sidebar for desktop.
   */
  render() {
    const isMobile = window.innerWidth <= 768;
    this.shadowRoot.innerHTML = this.getHTML();
  }

  /**
   * Update nav-menu and header display based on current mode and menu state.
   * Also passes data-mobile attribute to nav-menu for mobile rendering.
   */
  updateMenuDisplay() {
    const isMobile = window.innerWidth <= 768;
    const navMenu = this.shadowRoot.querySelector('nav-menu');
    const hamburgerBtn = this.shadowRoot.getElementById('hamburgerBtn');
    const header = this.shadowRoot.querySelector('header');
    if (navMenu) {
      navMenu.style.display = isMobile ? (this.menuOpen ? 'block' : 'none') : 'block';
      navMenu.style.width = isMobile ? '100vw' : '250px';
      navMenu.style.height = isMobile ? 'auto' : '100vh';
      navMenu.style.position = isMobile ? 'fixed' : 'static';
      navMenu.style.left = '0';
      navMenu.style.right = isMobile ? '0' : 'auto';
      navMenu.style.top = isMobile ? '56px' : '0';
      // Pass data-mobile attribute to nav-menu for mobile rendering
      if (isMobile) {
        navMenu.setAttribute('data-mobile', 'true');
      } else {
        navMenu.removeAttribute('data-mobile');
      }
      // Force re-render for logo visibility
      if (typeof navMenu.render === 'function') navMenu.render();
    }
    if (hamburgerBtn) {
      hamburgerBtn.style.display = isMobile ? 'block' : 'none';
    }
    if (header) {
      header.style.display = isMobile ? 'flex' : 'none';
    }
  }

  // --- Main content setter ---
  /**
   * Set the main content area to the given element.
   * @param {HTMLElement} element - The page/component to display.
   * @return {void}
   */
  setContent(element) {
    const main = this.shadowRoot.querySelector('#main');
    main.innerHTML = '';
    if (element) main.appendChild(element);
  }

  // --- HTML generator ---
  /**
   * Get the HTML template for the app shell.
   * This is used to render the initial layout.
   * @return {string} The HTML string for the app shell.
   */
  getHTML() {
    return `
      <link rel="stylesheet" href="./components/layout/app-shell.css" />
      <header>
        <span class="header-title">Merchant Admin</span>
        <button id="hamburgerBtn" aria-label="Open menu">☰</button>
      </header>
      <nav-menu style="display:'block'"></nav-menu>
      <main id="main"></main>
    `;
  }
}

// Register the main shell custom element
customElements.define('app-shell', AppShell);
