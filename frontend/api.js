// API base URLs
export const MENU_SERVICE_API_BASE = 'https://ncsmt66i1f.execute-api.ap-northeast-3.amazonaws.com/prod';
export const ORDER_SERVICE_API_BASE = 'https://ajoy6fgs5f.execute-api.ap-northeast-3.amazonaws.com/prod';

// Menu API helpers
export const getMenuURL = () => `${MENU_SERVICE_API_BASE}/menu`;
export const getMenuItemURL = (itemId) => `${MENU_SERVICE_API_BASE}/menu/${itemId}`;
export const createMenuItemURL = () => `${MENU_SERVICE_API_BASE}/menu`;
export const updateMenuItemURL = (itemId) => `${MENU_SERVICE_API_BASE}/menu/${itemId}`;
export const deleteMenuItemURL = (itemId) => `${MENU_SERVICE_API_BASE}/menu/${itemId}`;
export const getCategoriesURL = () => `${MENU_SERVICE_API_BASE}/categories`;
export const getTagsURL = () => `${MENU_SERVICE_API_BASE}/tags`;
export const getOptionGroupsURL = () => `${MENU_SERVICE_API_BASE}/option-groups`;
export const getOptionListURL = () => `${MENU_SERVICE_API_BASE}/option-list`; // 新增 option-list API

// Order API helpers
export const getOrdersURL = () => `${ORDER_SERVICE_API_BASE}/orders`;
export const getOrderURL = (orderId) => `${ORDER_SERVICE_API_BASE}/orders/${orderId}`;
export const createOrderURL = () => `${ORDER_SERVICE_API_BASE}/orders`;
export const updateOrderURL = (orderId) => `${ORDER_SERVICE_API_BASE}/orders/${orderId}`;
export const deleteOrderURL = (orderId) => `${ORDER_SERVICE_API_BASE}/orders/${orderId}`;