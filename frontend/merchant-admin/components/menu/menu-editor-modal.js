import './menu-editor.js';

class MenuEditorModal extends HTMLElement {
  set menu(data) { this._menu = data || []; }
  set categories(data) { this._categories = data || []; }
  set tags(data) { this._tags = data || []; }
  set option_groups(data) { this._option_groups = data || []; }
  set option_list(data) { this._option_list = data || []; }
  set product(data) { this._product = data || null; }
  set itemId(id) { this._itemId = id || "0"; }

  get menu() { return this._menu || []; }
  get categories() { return this._categories || []; }
  get tags() { return this._tags || []; }
  get option_groups() { return this._option_groups || []; }
  get option_list() { return this._option_list || []; }
  get product() { return this._product || null; }
  get itemId() { return this._itemId || "0"; }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <menu-editor id="${this.itemId}"></menu-editor>
        <button class="modal-close-btn" id="closeBtn" title="Close">&times;</button>
      </div>
      <style>
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.25);
          z-index: 9998;
        }
        .modal-content {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #fff;
          border-radius: 10px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
          z-index: 9999;
          max-width: 98vw;
          max-height: 98vh;
          overflow-y: auto;
          padding: 0;
        }
        .modal-close-btn {
          position: absolute;
          top: 12px;
          right: 18px;
          background: none;
          border: none;
          font-size: 2em;
          color: #888;
          cursor: pointer;
          z-index: 10000;
        }
        @media (max-width: 700px) {
          .modal-content {
            width: 100vw;
            height: 100vh;
            border-radius: 0;
            top: 0;
            left: 0;
            transform: none;
            max-width: 100vw;
            max-height: 100vh;
          }
        }
      </style>
    `;

    // 傳遞資料給 menu-editor
    const editor = this.querySelector('menu-editor');
    if (editor) {
      editor.menu = this.menu;
      editor.categories = this.categories;
      editor.tags = this.tags;
      editor.option_groups = this.option_groups;
      editor.option_list = this.option_list;
      if (this.product) editor.product = this.product;
      editor.setAttribute('id', this.itemId);
      editor.addEventListener('save', (e) => this.handleSave(e));
      editor.addEventListener('cancel', () => this.close());
    }

    // 關閉按鈕
    this.querySelector('#closeBtn').onclick = () => this.close();
    this.querySelector('.modal-backdrop').onclick = () => this.close();
  }

  handleSave(e) {
    this.dispatchEvent(new CustomEvent('save', { detail: e.detail }));
    this.close();
  }

  close() {
    this.remove();
    this.dispatchEvent(new CustomEvent('close'));
  }
}

customElements.define('menu-editor-modal', MenuEditorModal);