// src/schema/orders.ts
// Orders and order items

import { pgTable, uuid, varchar, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { orderSource, orderType, orderStatus, orderItemType } from './enums.js';
import { stores } from './stores.js';
import { users } from './users.js';
import { menuItems } from './menus.js';

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderNumber: varchar('orderNumber', { length: 50 }).notNull().unique(),
  storeId: uuid('storeId').references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('userId').references(() => users.id, { onDelete: 'set null' }),
  source: orderSource('source').notNull(),
  type: orderType('type').notNull(),
  status: orderStatus('status').default('PENDING').notNull(),
  subtotal: integer('subtotal').notNull(), // In cents
  tax: integer('tax').default(0).notNull(),
  discount: integer('discount').default(0).notNull(),
  deliveryFee: integer('deliveryFee').default(0).notNull(),
  total: integer('total').notNull(), // In cents
  customerName: varchar('customerName', { length: 255 }),
  customerPhone: varchar('customerPhone', { length: 50 }),
  customerEmail: varchar('customerEmail', { length: 255 }),
  deliveryAddress: jsonb('deliveryAddress'), // { street, city, postalCode, coordinates }
  specialInstructions: text('specialInstructions'),
  scheduledFor: timestamp('scheduledFor', { withTimezone: true }),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userDateIdx: index('idx_orders_user_date').on(table.userId, table.createdAt),
  storeStatusDateIdx: index('idx_orders_store_status_date').on(table.storeId, table.status, table.createdAt),
  statusDateIdx: index('idx_orders_status_date').on(table.status, table.createdAt)
}));

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('orderId').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  menuItemId: uuid('menuItemId').references(() => menuItems.id, { onDelete: 'set null' }),
  parentOrderItemId: uuid('parentOrderItemId').references((): any => orderItems.id, { onDelete: 'cascade' }), // Self-reference
  itemType: orderItemType('itemType').default('REGULAR').notNull(),
  name: varchar('name', { length: 255 }).notNull(), // Snapshot of item name
  price: integer('price').notNull(), // Price in cents (snapshot at order time)
  quantity: integer('quantity').default(1).notNull(),
  subtotal: integer('subtotal').notNull(), // price * quantity
  customizations: jsonb('customizations'), // Snapshot of selected customizations
  selectedVariantIds: jsonb('selectedVariantIds'), // Array of variant IDs for recipe matching
  specialInstructions: text('specialInstructions'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  orderIdx: index('idx_order_items_order').on(table.orderId),
  parentIdx: index('idx_order_items_parent').on(table.parentOrderItemId),
  typeIdx: index('idx_order_items_type').on(table.itemType)
}));
