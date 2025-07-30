// Merchant settings component for merchant admin system

class MerchantSettings extends HTMLElement {
  connectedCallback() {
    // Render the merchant settings panel
    this.innerHTML = `<h2>Merchant Settings</h2><p>Configure your merchant information here.</p>`;
  }
}

customElements.define('merchant-settings', MerchantSettings);