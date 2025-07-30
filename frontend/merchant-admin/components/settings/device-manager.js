// Device management component for merchant admin system

class DeviceManager extends HTMLElement {
  connectedCallback() {
    // Render the device management panel
    this.innerHTML = `<h2>Device Management</h2><p>Manage your devices here.</p>`;
  }
}

customElements.define('device-manager', DeviceManager);