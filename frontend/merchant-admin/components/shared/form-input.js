// Form input component for merchant admin system

class FormInput extends HTMLElement {
  connectedCallback() {
    // Render a basic text input field
    this.innerHTML = `<input type="text" />`;
  }
}

customElements.define('form-input', FormInput);