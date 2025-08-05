// router.js
// Simple hash-based router for merchant admin SPA

// Ensure there is always a hash in the URL
if (!location.hash) location.hash = '/';

// Route table: maps hash paths to component file paths
export const routes = {
  '/': 'dashboard/merchant-dashboard',
  '/menu': 'menu/menu-list',
  '/menu/list': 'menu/menu-list',
  '/menu/edit/:id': 'menu/menu-editor',
  '/menu/categories': 'menu/category-manager',
  '/inventory': 'inventory/inventory-list',
  '/inventory/list': 'inventory/inventory-list',
  '/inventory/purchase': 'inventory/purchase-list',
  '/inventory/movements': 'inventory/movements-list',
  '/orders': 'orders/order-list',
  '/order-detail/:id': 'orders/order-detail',
  '/settings': 'settings/merchant-settings',
  '/devices': 'settings/device-manager',
  '/analysis': 'analysis/analysis-view',
  '/notifications': 'notifications/notifications-panel',
  '/help': 'help/help-panel',
  '/account': 'account/account-panel',
  '/logout': 'logout/logout-panel',
  '/nav-menu': 'layout/nav-menu'
};

/**
 * Matches a given path to a route pattern and extracts dynamic params.
 * Returns the matched component path and params if found, otherwise null.
 * @param {string} path - The hash path to match (e.g. '/menu/edit/123')
 * @return {Object|null} An object with { componentPath, params } or null if no match
 */
export function matchRoute(path) {
  for (const pattern in routes) {
    const paramNames = [];
    // Convert route pattern to regex, extract param names (e.g. :id)
    const regexPattern = pattern.replace(/:([^/]+)/g, (_, key) => {
      paramNames.push(key);
      return '([^/]+)';
    });
    const regex = new RegExp('^' + regexPattern + '$');
    const match = path.match(regex);
    if (match) {
      const params = {};
      // Map matched values to param names
      paramNames.forEach((key, i) => {
        params[key] = match[i + 1];
      });
      // Return matched component path and extracted params
      return {
        componentPath: routes[pattern],
        params
      };
    }
  }
  // No match found
  return null;
}

