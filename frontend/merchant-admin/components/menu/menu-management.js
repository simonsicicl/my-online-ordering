import './menu-list.js';
import './option-group-list.js';
import './option-list.js';
import './category-list.js';
import './tag-list.js';

import {
  getMenuURL,
  getCategoriesURL,
  getTagsURL,
  getOptionGroupsURL,
  getOptionListURL
} from '../../../api.js';

/**
 * Main menu management component for merchant admin system.
 * Handles tab switching, data fetching, and data passing to child components.
 */
class MenuManagement extends HTMLElement {
  constructor() {
    super();
    this.activeTab = 'menu';
    this.menu = [];
    this.categories = [];
    this.tags = [];
    this.option_groups = [];
    this.option_list = [];
    this._dataLoaded = false;
  }

  // --- Lifecycle methods ---
  /**
   * Called when the element is added to the DOM.
   * Fetches all menu data and renders the UI.
   */
  async connectedCallback() {
    await this.fetchAllMenuData();
    this.render();
    window.addEventListener('resize', this._onResize = () => this.handleResize());
  }

  /**
   * Called when the element is removed from the DOM.
   * Cleans up event listeners to prevent memory leaks.
   */
  disconnectedCallback() {
    window.removeEventListener('resize', this._onResize);
  }

  // --- Render methods ---
  /**
   * Renders the main menu management panel and tab content.
   */
  render() {
    this.innerHTML = this.getHTML();
    this.renderTabContent();
  }

  /**
   * Renders the tab content and binds tab events.
   * Also passes data to child components and binds refresh events.
   */
  renderTabContent() {
    this.querySelector('.menu-management-root').innerHTML = this.getRootHTML();
    this.dataPassing();
    this._lastIsMobile = window.innerWidth <= 768;
    // Tab/Select event binding
    if (this._lastIsMobile) {
      this.querySelector('#menuTabSelect').onchange = (e) => {
        this.activeTab = e.target.value;
        this.renderTabContent();
      };
    } else {
      this.querySelectorAll('.menu-management-tabs button').forEach(btn => {
        btn.onclick = () => {
          this.activeTab = btn.dataset.tab;
          this.renderTabContent();
        };
      });
    }
    // Monitor refresh events from child components
    this.querySelectorAll('menu-list, option-group-list, option-list, category-list, tag-list').forEach(el => {
      el.addEventListener('refresh', async () => {
        await this.fetchAllMenuData();
        this.dataPassing();
      });
    });
  }

  /**
   * Handles window resize event to re-render tab content if layout changes.
   */
  handleResize() {
    // Re-render tab content on window resize
    if (this._lastIsMobile !== (window.innerWidth <= 768)) {
      this.renderTabContent();
      this.querySelectorAll('menu-list, option-group-list, option-list, category-list, tag-list').forEach(el => {
        if (el.handleResize) el.handleResize();
      });
    }
  }

  // --- Data fetching and passing ---
  /**
   * Fetches all menu-related data in parallel and updates component state.
   */
  async fetchAllMenuData() {
    // Fetch all menu-related data in parallel
    console.log('Fetching menu data...');
    const [menu, categories, tags, option_groups, option_list] = await Promise.all([
      fetch(getMenuURL()).then(r => r.json()),
      fetch(getCategoriesURL()).then(r => r.json()),
      fetch(getTagsURL()).then(r => r.json()),
      fetch(getOptionGroupsURL()).then(r => r.json()),
      fetch(getOptionListURL()).then(r => r.json())
    ]);
    this.menu = menu;
    this.categories = categories;
    this.tags = tags;
    this.option_groups = option_groups;
    this.option_list = option_list;
    this._dataLoaded = true;
  }

  /**
   * Passes fetched data to all child list/editor components.
   */
  dataPassing() {
    if (this._dataLoaded) {
      this.querySelectorAll('menu-list, option-group-list, option-list, category-list, tag-list').forEach(el => {
        console.log(`Passing data to ${el.tagName}`);
        el.menu = this.menu;
        el.categories = this.categories;
        el.tags = this.tags;
        el.option_groups = this.option_groups;
        el.option_list = this.option_list;
        if (el.renderProductTable) el.renderProductTable();
        if (el.renderOptionGroupTable) el.renderOptionGroupTable();
        if (el.renderOptionTable) el.renderOptionTable();
        if (el.renderCategoryTable) el.renderCategoryTable();
        if (el.renderTagTable) el.renderTagTable();
      });
    }
  }

  // --- HTML generators ---
  /**
   * Returns HTML for the main menu management panel and includes all list CSS.
   * @return {string}
   */
  getHTML() {
    return `
      <link rel="stylesheet" href="./components/menu/menu-management.css" />
      <link rel="stylesheet" href="./components/menu/menu-list.css" />
      <link rel="stylesheet" href="./components/menu/option-list.css" />
      <link rel="stylesheet" href="./components/menu/option-group-list.css" />
      <link rel="stylesheet" href="./components/menu/category-list.css" />
      <link rel="stylesheet" href="./components/menu/tag-list.css" />
      <div class="menu-management-root"></div>
    `;
  }

  /**
   * Returns HTML for the tab bar and current tab content.
   * @return {string}
   */
  getRootHTML() {
    return `
    ${window.innerWidth <= 768 ? `
    <div class="menu-management-selectbar">${this.getMobileTabsHTML()}</div>
    ` : `
    <div class="menu-management-tabs">${this.getDesktopTabsHTML()}</div>
    `}
    <div class="menu-management-content">${this.getManagementContentHTML()}</div>
    `;
  }

  /**
   * Returns HTML for the desktop tab bar.
   * @return {string}
   */
  getDesktopTabsHTML() {
    return `
      <button data-tab="menu" ${this.activeTab === 'menu' ? 'class="active"' : ''}>Products</button>
      <button data-tab="option-group" ${this.activeTab === 'option-group' ? 'class="active"' : ''}>Option Groups</button>
      <button data-tab="option" ${this.activeTab === 'option' ? 'class="active"' : ''}>Options</button>
      <button data-tab="category" ${this.activeTab === 'category' ? 'class="active"' : ''}>Categories</button>
      <button data-tab="tag" ${this.activeTab === 'tag' ? 'class="active"' : ''}>Tags</button>
    `;
  }

  /**
   * Returns HTML for the mobile tab select bar.
   * @return {string}
   */
  getMobileTabsHTML() {
    return `
      <select id="menuTabSelect">
        <option value="menu" ${this.activeTab === 'menu' ? 'selected' : ''}>Products</option>
        <option value="option-group" ${this.activeTab === 'option-group' ? 'selected' : ''}>Option Groups</option>
        <option value="option" ${this.activeTab === 'option' ? 'selected' : ''}>Options</option>
        <option value="category" ${this.activeTab === 'category' ? 'selected' : ''}>Categories</option>
        <option value="tag" ${this.activeTab === 'tag' ? 'selected' : ''}>Tags</option>
      </select>
    `;
  }

  /**
   * Returns HTML for the current management tab content.
   * @return {string}
   */
  getManagementContentHTML() {
    return `
      ${!this._dataLoaded ? '<div>Loading...</div>' : `
        ${this.activeTab === 'menu' ? '<menu-list></menu-list>' : ''}
        ${this.activeTab === 'option-group' ? '<option-group-list></option-group-list>' : ''}
        ${this.activeTab === 'option' ? '<option-list></option-list>' : ''}
        ${this.activeTab === 'category' ? '<category-list></category-list>' : ''}
        ${this.activeTab === 'tag' ? '<tag-list></tag-list>' : ''}
      `}
    `;
  }
}

customElements.define('menu-management', MenuManagement);