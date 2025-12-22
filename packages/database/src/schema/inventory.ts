// src/schema/inventory.ts
// Inventory items, variants, recipes, and logs

import { pgTable, uuid, varchar, text, integer, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { inventoryUnit, inventoryChangeType } from './enums.js';
import { stores } from './stores.js';
import { menuItems, menuItemCustomizations } from './menus.js';

// Variants table - store-scoped variant registry
export const variants = pgTable('variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('storeId').references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  code: varchar('code', { length: 100 }).notNull(), // Auto-generated code (e.g., "size_large", "temp_hot")
  name: varchar('name', { length: 255 }).notNull(), // User-facing name (e.g., "Large", "Hot")
  category: varchar('category', { length: 100 }).notNull(), // e.g., "SIZE", "TEMPERATURE", "SWEETNESS"
  description: text('description'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  uniqueStoreCode: uniqueIndex('unique_variants_store_code').on(table.storeId, table.code),
  categoryIdx: index('idx_variants_category').on(table.category)
}));

export const customizationOptions = pgTable('customization_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  customizationId: uuid('customizationId').references(() => menuItemCustomizations.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(), // e.g., "Small", "Large"
  priceDelta: integer('priceDelta').default(0).notNull(), // Price adjustment in cents
  variantId: uuid('variantId').references(() => variants.id, { onDelete: 'set null' }), // FK to variants table
  isDefault: boolean('isDefault').default(false).notNull(),
  isAvailable: boolean('isAvailable').default(true).notNull(),
  displayOrder: integer('displayOrder').default(0).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  orderIdx: index('idx_customization_options_order').on(table.customizationId, table.displayOrder),
  availableIdx: index('idx_customization_options_available').on(table.isAvailable),
  variantIdx: index('idx_customization_options_variant').on(table.variantId)
}));

export const inventoryItems = pgTable('inventory_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('storeId').references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 100 }).notNull(),
  unit: inventoryUnit('unit').notNull(),
  currentStock: integer('currentStock').default(0).notNull(),
  reservedStock: integer('reservedStock').default(0).notNull(),
  minStock: integer('minStock').default(0).notNull(),
  maxStock: integer('maxStock'),
  costPerUnit: integer('costPerUnit').default(0).notNull(), // Cost in cents
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  stockIdx: index('idx_inventory_items_stock').on(table.currentStock),
  lowStockIdx: index('idx_inventory_items_low_stock').on(table.storeId, table.currentStock),
  uniqueStoreSku: uniqueIndex('unique_store_sku').on(table.storeId, table.sku)
}));

// Recipes table - defines WHAT inventory to deduct (Effect)
export const recipes = pgTable('recipes', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('storeId').references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  menuItemId: uuid('menuItemId').references(() => menuItems.id, { onDelete: 'cascade' }), // NULL = global recipe
  inventoryItemId: uuid('inventoryItemId').references(() => inventoryItems.id, { onDelete: 'cascade' }).notNull(),
  quantityRequired: integer('quantityRequired').notNull(), // Amount to deduct
  notes: text('notes'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  storeMenuIdx: index('idx_recipes_store_menu').on(table.storeId, table.menuItemId),
  menuItemIdx: index('idx_recipes_menu_item').on(table.menuItemId),
  inventoryItemIdx: index('idx_recipes_inventory_item').on(table.inventoryItemId)
}));

// Recipe Conditions table - defines WHEN to trigger recipe (Cause)
export const recipeConditions = pgTable('recipe_conditions', {
  id: uuid('id').primaryKey().defaultRandom(),
  recipeId: uuid('recipeId').references(() => recipes.id, { onDelete: 'cascade' }).notNull(),
  variantId: uuid('variantId').references(() => variants.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  recipeIdx: index('idx_recipe_conditions_recipe').on(table.recipeId),
  variantIdx: index('idx_recipe_conditions_variant').on(table.variantId),
  uniqueRecipeVariant: uniqueIndex('unique_recipe_condition').on(table.recipeId, table.variantId)
}));

export const inventoryLogs = pgTable('inventory_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  inventoryItemId: uuid('inventoryItemId').references(() => inventoryItems.id, { onDelete: 'cascade' }).notNull(),
  changeType: inventoryChangeType('changeType').notNull(),
  quantityChanged: integer('quantityChanged').notNull(),
  previousStock: integer('previousStock').notNull(),
  newStock: integer('newStock').notNull(),
  reason: text('reason'),
  performedBy: uuid('performedBy'), // User ID who performed the action
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  itemDateIdx: index('idx_inventory_logs_item_date').on(table.inventoryItemId, table.createdAt),
  typeIdx: index('idx_inventory_logs_type').on(table.changeType)
}));
