// src/schema/enums.ts
// All PostgreSQL enums used across the database schema

import { pgEnum } from 'drizzle-orm/pg-core';

// Menu & Customization
export const customizationType = pgEnum('CustomizationType', ['SINGLE_CHOICE', 'MULTIPLE_CHOICE']);

// Inventory
export const inventoryUnit = pgEnum('InventoryUnit', ['GRAM', 'MILLILITER', 'PIECE', 'KILOGRAM', 'LITER']);
export const inventoryChangeType = pgEnum('InventoryChangeType', [
  'MANUAL_ADJUSTMENT',
  'ORDER_DEDUCTION',
  'RESERVATION',
  'RELEASE',
  'RESTOCK',
  'EXPIRATION',
  'RETURN'
]);

// User & Staff
export const staffRole = pgEnum('StaffRole', ['CASHIER', 'LEAD', 'MANAGER', 'MERCHANT']);
export const userRole = pgEnum('UserRole', ['USER', 'CASHIER', 'LEAD', 'MANAGER', 'MERCHANT', 'ADMIN']);

// Orders
export const orderSource = pgEnum('OrderSource', ['USER_CLIENT', 'KIOSK', 'POS']);
export const orderType = pgEnum('OrderType', ['DINE_IN', 'TAKEOUT', 'DELIVERY']);
export const orderStatus = pgEnum('OrderStatus', [
  'PENDING',
  'PAID',
  'PREPARING',
  'READY',
  'COMPLETED',
  'CANCELLED',
  'REJECTED'
]);
export const orderItemType = pgEnum('OrderItemType', ['REGULAR', 'COMBO_PARENT', 'COMBO_CHILD']);

// Payments
export const paymentMethod = pgEnum('PaymentMethod', ['CARD', 'CASH', 'LINEPAY', 'APPLE_PAY', 'GOOGLE_PAY']);
export const paymentStatus = pgEnum('PaymentStatus', ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED']);
export const refundStatus = pgEnum('RefundStatus', ['PENDING', 'REFUNDED', 'FAILED']);

// Devices
export const deviceType = pgEnum('DeviceType', [
  'RECEIPT_PRINTER',
  'KITCHEN_LABEL_PRINTER',
  'CARD_READER',
  'CASH_DRAWER',
  'QR_SCANNER',
  'KDS_DISPLAY'
]);
export const deviceStatus = pgEnum('DeviceStatus', ['ONLINE', 'OFFLINE', 'ERROR']);
export const printJobType = pgEnum('PrintJobType', ['RECEIPT', 'KITCHEN_LABEL', 'REPORT']);
export const printJobStatus = pgEnum('PrintJobStatus', ['QUEUED', 'PRINTING', 'COMPLETED', 'FAILED']);

// Notifications
export const notificationChannel = pgEnum('NotificationChannel', ['EMAIL', 'SMS', 'PUSH', 'WEBSOCKET']);
export const notificationStatus = pgEnum('NotificationStatus', ['PENDING', 'SENT', 'FAILED']);
