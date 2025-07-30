// Help panel component for merchant admin system

class HelpPanel extends HTMLElement {
  connectedCallback() {
    // Render the help center
    this.innerHTML = `<h2>Help</h2><p>Hello, how can we assist you?</p>`;
  }
}
customElements.define('help-panel', HelpPanel);