// Notifications panel component for merchant admin system

class NotificationsPanel extends HTMLElement {
  connectedCallback() {
    // Render the notifications panel
    this.innerHTML = `<h2>Notifications</h2><p>No notifications yet!</p>`;
  }
}
customElements.define('notifications-panel', NotificationsPanel);