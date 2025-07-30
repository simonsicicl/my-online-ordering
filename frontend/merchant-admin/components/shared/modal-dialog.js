// Modal dialog component for merchant admin system

class ModalDialog extends HTMLElement {
  connectedCallback() {
    // Render a modal dialog with slot content
    this.innerHTML = `<div class="modal"><slot></slot></div>`;
  }
}

customElements.define('modal-dialog', ModalDialog);