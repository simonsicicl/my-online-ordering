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

  connectedCallback() {
    // Initial render and event binding
    this.render();
    this.bindEvents();
    // Listen for window resize to handle responsive layout
    window.addEventListener('resize', () => this.handleResize());
  }

  /**
   * Bind UI events for hamburger menu and nav-menu
   */
  bindEvents() {
    const hamburgerBtn = this.shadowRoot.getElementById('hamburgerBtn');
    if (hamburgerBtn) {
      hamburgerBtn.onclick = () => {
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

  /**
   * Handle window resize: re-render only if switching between mobile/desktop
   * and preserve main content during re-render
   */
  handleResize() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile !== this._lastIsMobile) {
      this._lastIsMobile = isMobile;
      // Save main content before re-render
      // const main = this.shadowRoot.querySelector('#main');
      // const saved = main ? main.innerHTML : '';
      // this.render();
      this.bindEvents();
      // Restore main content after re-render
      // const newMain = this.shadowRoot.querySelector('#main');
    //   if (newMain) newMain.innerHTML = saved;
    // } else {
      // Only update menu display if not switching layout mode
      this.updateMenuDisplay();
    }
  }

  /**
   * Render the shell layout: header, nav-menu, and main content area
   * Responsive: header and hamburger menu for mobile, sidebar for desktop
   */
  render() {
    const isMobile = window.innerWidth <= 768;
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: row;
          height: 100vh;
          font-family: sans-serif;
        }
        header {
          width: 100vw;
          height: 56px;
          background: #23272f;
          color: #fff;
          display: none;
          align-items: center;
          justify-content: space-between;
          padding: 0 1em;
          box-sizing: border-box;
          position: relative;
          z-index: 1002;
        }
        .header-title {
          font-size: 1.2em;
          font-weight: bold;
          letter-spacing: 2px;
        }
        #hamburgerBtn {
          display: none;
          background: none;
          border: none;
          color: #fff;
          font-size: 2em;
          cursor: pointer;
        }
        nav-menu {
          background: #333;
          position: static;
          top: 0;
          left: 0;
          width: 250px;
          height: 100vh;
          z-index: 1001;
          box-shadow: none;
          display: block;
        }
        main {
          flex: 1;
          padding: 1em;
          overflow-y: auto;
        }
        @media (max-width: 768px) {
          :host {
            flex-direction: column;
          }
          header {
            display: flex;
          }
          #hamburgerBtn {
            display: block;
          }
          nav-menu {
            position: fixed;
            top: 56px;
            left: 0;
            right: 0;
            width: 100vw;
            height: auto;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            display: none;
          }
          nav-menu[open] {
            display: block;
          }
          main {
            padding-top: 56px;
          }
        }

        /* Desktop styles */
        @media (min-width: 769px) {
          header {
            display: none;
          }
          nav-menu {
            position: static;
            width: 250px;
            height: 100vh;
            box-shadow: none;
            display: block;
          }
        }
      </style>
      <header>
        <span class="header-title">Merchant Admin</span>
        <button id="hamburgerBtn" aria-label="Open menu">☰</button>
      </header>
      <nav-menu style="display:'block'"></nav-menu>
      <main id="main"></main>
    `;
  }

  /**
   * Update nav-menu and header display based on current mode and menu state
   * Also passes data-mobile attribute to nav-menu for mobile rendering
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
      if (typeof navMenu.render === 'function') navMenu.render(); // Force re-render for logo visibility
    }
    if (hamburgerBtn) {
      hamburgerBtn.style.display = isMobile ? 'block' : 'none';
    }
    if (header) {
      header.style.display = isMobile ? 'flex' : 'none';
    }
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
