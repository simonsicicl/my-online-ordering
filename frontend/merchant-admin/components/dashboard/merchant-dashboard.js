// Merchant dashboard component for merchant admin system

class MerchantDashboard extends HTMLElement {
  connectedCallback() {
    // Render the merchant dashboard
    this.innerHTML = `<h2>Dashboard</h2><p>Welcome to the merchant admin panel!</p>`;
  }
}

customElements.define('merchant-dashboard', MerchantDashboard);