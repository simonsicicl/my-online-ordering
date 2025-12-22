// src/schema/menus.ts
// Menu items, categories, customizations, and combo groups

import { pgTable, uuid, varchar, text, integer, boolean, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { customizationType } from './enums.js';
import { stores } from './stores.js';

export const menuCategories = pgTable('menu_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('storeId').references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  displayOrder: integer('displayOrder').default(0).notNull(),
  isAvailable: boolean('isAvailable').default(true).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  storeOrderIdx: index('idx_menu_categories_store_order').on(table.storeId, table.displayOrder)
}));

export const menuItems = pgTable('menu_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('storeId').references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  categoryId: uuid('categoryId').references(() => menuCategories.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: integer('price').notNull(), // Price in cents
  imageUrl: text('imageUrl'),
  isAvailable: boolean('isAvailable').default(true).notNull(),
  isCombo: boolean('isCombo').default(false).notNull(),
  displayOrder: integer('displayOrder').default(0).notNull(),
  tags: jsonb('tags'), // Array of tags: ["vegetarian", "spicy", etc.]
  nutritionInfo: jsonb('nutritionInfo'), // { calories, protein, carbs, fat }
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  storeCategoryIdx: index('idx_menu_items_store_category').on(table.storeId, table.categoryId, table.isAvailable),
  availabilityIdx: index('idx_menu_items_availability').on(table.isAvailable),
  storeComboIdx: index('idx_menu_items_store_combo').on(table.storeId, table.isCombo)
}));

export const menuItemCustomizations = pgTable('menu_item_customizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  menuItemId: uuid('menuItemId').references(() => menuItems.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(), // e.g., "Size", "Temperature"
  type: customizationType('type').notNull(),
  required: boolean('required').default(false).notNull(),
  minSelections: integer('minSelections').default(0).notNull(),
  maxSelections: integer('maxSelections').default(1).notNull(),
  displayOrder: integer('displayOrder').default(0).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  itemOrderIdx: index('idx_customizations_item_order').on(table.menuItemId, table.displayOrder)
}));

export const comboGroups = pgTable('combo_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  menuItemId: uuid('menuItemId').references(() => menuItems.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(), // e.g., "Main", "Side", "Drink"
  description: text('description'),
  required: boolean('required').default(true).notNull(),
  minSelections: integer('minSelections').default(1).notNull(),
  maxSelections: integer('maxSelections').default(1).notNull(),
  allowRepeatedItems: boolean('allowRepeatedItems').default(false).notNull(),
  displayOrder: integer('displayOrder').default(0).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  itemOrderIdx: index('idx_combo_groups_item_order').on(table.menuItemId, table.displayOrder)
}));

export const comboGroupItems = pgTable('combo_group_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  comboGroupId: uuid('comboGroupId').references(() => comboGroups.id, { onDelete: 'cascade' }).notNull(),
  menuItemId: uuid('menuItemId').references(() => menuItems.id, { onDelete: 'cascade' }).notNull(),
  isDefault: boolean('isDefault').default(false).notNull(),
  priceDelta: integer('priceDelta').default(0).notNull(), // Price adjustment in cents
  displayOrder: integer('displayOrder').default(0).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  uniqueComboGroupItem: uniqueIndex('unique_combo_group_item').on(table.comboGroupId, table.menuItemId),
  orderIdx: index('idx_combo_group_items_order').on(table.comboGroupId, table.displayOrder),
  menuItemIdx: index('idx_combo_group_items_menu_item').on(table.menuItemId)
}));
