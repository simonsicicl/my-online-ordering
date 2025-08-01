// router.js
// Simple hash-based router for merchant admin SPA

if (!location.hash) location.hash = '/';

// Route table: maps hash paths to component file paths
export const routes = {
  '/': 'dashboard/merchant-dashboard',
  '/menu': 'menu/menu-list',
  '/menu/list': 'menu/menu-list',
  '/menu/edit/:id': 'menu/menu-editor',
  '/categories': 'menu/category-manager',
  '/orders': 'orders/order-list',
  '/orders/:id': 'orders/order-detail',
  '/settings': 'settings/merchant-settings',
  '/devices': 'settings/device-manager',
  '/analysis': 'analysis/analysis-view',
  '/notifications': 'notifications/notifications-panel',
  '/help': 'help/help-panel',
  '/account': 'account/account-panel',
  '/logout': 'logout/logout-panel',
  '/nav-menu': 'layout/nav-menu'
};

// Match route and extract params from dynamic segments
export function matchRoute(path) {
  for (const pattern in routes) {
    const paramNames = [];
    // Convert route pattern to regex, extract param names
    const regexPattern = pattern.replace(/:([^/]+)/g, (_, key) => {
      paramNames.push(key);
      return '([^/]+)';
    });
    const regex = new RegExp('^' + regexPattern + '$');
    const match = path.match(regex);
    if (match) {
      const params = {};
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

