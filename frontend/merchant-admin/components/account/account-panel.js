// User account panel component for merchant admin system

class AccountPanel extends HTMLElement {
  connectedCallback() {
    // Render the user account center
    this.innerHTML = `<h2>User Account</h2><p>Welcome to your account center!</p>`;
  }
}

customElements.define('account-panel', AccountPanel);