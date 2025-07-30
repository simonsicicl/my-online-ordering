// Loading spinner component for merchant admin system

class LoadingSpinner extends HTMLElement {
  connectedCallback() {
    // Render a loading spinner
    this.innerHTML = `<div class="spinner">Loading...</div>`;
  }
}

customElements.define('loading-spinner', LoadingSpinner);