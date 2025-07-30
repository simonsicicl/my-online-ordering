// Logout panel component for merchant admin system

class LogoutPanel extends HTMLElement {
  connectedCallback() {
    // Render the logout panel
    this.innerHTML = `<h2>Logout</h2><p>Don't leave yet!</p>`;
  }
}

customElements.define('logout-panel', LogoutPanel);