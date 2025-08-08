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
export const getCategoryURL = (categoryId) => `${MENU_SERVICE_API_BASE}/categories/${categoryId}`;
export const createCategoryURL = () => `${MENU_SERVICE_API_BASE}/categories`;
export const updateCategoryURL = (categoryId) => `${MENU_SERVICE_API_BASE}/categories/${categoryId}`;
export const deleteCategoryURL = (categoryId) => `${MENU_SERVICE_API_BASE}/categories/${categoryId}`;
export const getTagsURL = () => `${MENU_SERVICE_API_BASE}/tags`;
export const getTagURL = (tagId) => `${MENU_SERVICE_API_BASE}/tags/${tagId}`;
export const createTagURL = () => `${MENU_SERVICE_API_BASE}/tags`;
export const updateTagURL = (tagId) => `${MENU_SERVICE_API_BASE}/tags/${tagId}`;
export const deleteTagURL = (tagId) => `${MENU_SERVICE_API_BASE}/tags/${tagId}`;
export const getOptionGroupsURL = () => `${MENU_SERVICE_API_BASE}/option-groups`;
export const getOptionGroupURL = (optionGroupId) => `${MENU_SERVICE_API_BASE}/option-groups/${optionGroupId}`;
export const createOptionGroupURL = () => `${MENU_SERVICE_API_BASE}/option-groups`;
export const updateOptionGroupURL = (optionGroupId) => `${MENU_SERVICE_API_BASE}/option-groups/${optionGroupId}`;
export const deleteOptionGroupURL = (optionGroupId) => `${MENU_SERVICE_API_BASE}/option-groups/${optionGroupId}`;
export const getOptionListURL = () => `${MENU_SERVICE_API_BASE}/option-list`;
export const getOptionURL = (optionId) => `${MENU_SERVICE_API_BASE}/option-list/${optionId}`;
export const createOptionURL = () => `${MENU_SERVICE_API_BASE}/option-list`;
export const updateOptionURL = (optionId) => `${MENU_SERVICE_API_BASE}/option-list/${optionId}`;
export const deleteOptionURL = (optionId) => `${MENU_SERVICE_API_BASE}/option-list/${optionId}`;

// Order API helpers
export const getOrdersURL = () => `${ORDER_SERVICE_API_BASE}/orders`;
export const getOrderURL = (orderId) => `${ORDER_SERVICE_API_BASE}/orders/${orderId}`;
export const createOrderURL = () => `${ORDER_SERVICE_API_BASE}/orders`;
export const updateOrderURL = (orderId) => `${ORDER_SERVICE_API_BASE}/orders/${orderId}`;
export const deleteOrderURL = (orderId) => `${ORDER_SERVICE_API_BASE}/orders/${orderId}`;