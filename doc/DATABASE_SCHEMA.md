# Database Schema Specification

**Document Version**: 1.0  
**Last Updated**: December 21, 2025  
**Owner**: Simon Chou  
**Status**: Single Source of Truth (MVP + Inventory + POS Scope)

---

## Purpose

This document defines the **complete database schema** for the My Online Ordering System using Drizzle ORM with PostgreSQL. It serves as the authoritative contract for all data models and relationships.

**Critical**: This is the **single source of truth** for database structure. All implementations MUST comply with this specification.

**Target Audience**: AI assistants implementing services, backend developers, database administrators

---

## Table of Contents

1. [Database Overview](#database-overview)
2. [Drizzle Schema](#drizzle-schema)
3. [Entity Relationship Diagrams](#entity-relationship-diagrams)
4. [Index Strategies](#index-strategies)
5. [Migration Guidelines](#migration-guidelines)

---

## Database Overview

### Technology Stack

**Primary Database**: Aurora Serverless v2 PostgreSQL  
**Version**: PostgreSQL 15.x  
**ORM**: Drizzle ORM 0.30.x  
**Connection Pooling**: AWS RDS Proxy

### Database Configuration

```
Host: myordering-cluster.cluster-xxx.us-east-1.rds.amazonaws.com
Port: 5432
Database: myordering
SSL: Required (TLS 1.3)
Max Connections: Auto-scaling (RDS Proxy handles pooling)
```

### Schema Management

**Tool**: Drizzle Kit  
**Migration Files**: `drizzle/migrations/`  
**Schema File**: `src/db/schema.ts`

### Naming Conventions

**Tables**: `snake_case`, plural (e.g., `menu_items`, `orders`, `order_items`)  
**Columns**: `snake_case` (e.g., `created_at`, `user_id`, `order_number`)  
**Indexes**: `idx_{table}_{column}` (e.g., `idx_orders_user_id`)  
**Foreign Keys**: `fk_{table}_{ref_table}` (e.g., `fk_orders_users`)  
**Unique Constraints**: `unique_{table}_{column}` (e.g., `unique_users_email`)

---

## Drizzle Schema

### Complete Schema File

**Note**: The schema below shows the **complete database schema** for all 12 microservices. All tables are fully defined in Drizzle ORM TypeScript syntax with proper multi-tenant isolation, foreign key constraints, and strategic indexes.

```typescript
// src/db/schema.ts

import { pgTable, uuid, varchar, text, decimal, boolean, integer, timestamp, jsonb, pgEnum, index, uniqueIndex, doublePrecision } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';

// Enable pg_trgm extension for full-text search
// Run: CREATE EXTENSION IF NOT EXISTS pg_trgm;

// ==========================================
// ENUMS
// ==========================================

export const customizationType = pgEnum('CustomizationType', ['SINGLE_CHOICE', 'MULTIPLE_CHOICE']);
export const inventoryUnit = pgEnum('InventoryUnit', ['GRAM', 'MILLILITER', 'PIECE', 'KILOGRAM', 'LITER']);
export const inventoryChangeType = pgEnum('InventoryChangeType', ['MANUAL_ADJUSTMENT', 'ORDER_DEDUCTION', 'RESERVATION', 'RELEASE', 'RESTOCK', 'EXPIRATION', 'RETURN']);
export const staffRole = pgEnum('StaffRole', ['CASHIER', 'LEAD', 'MANAGER', 'MERCHANT']);
export const orderSource = pgEnum('OrderSource', ['USER_CLIENT', 'KIOSK', 'POS']); // Extensibility: Third-party platforms (UBEREATS, FOODPANDA) can be added in future versions
export const orderType = pgEnum('OrderType', ['DINE_IN', 'TAKEOUT', 'DELIVERY']);
export const orderStatus = pgEnum('OrderStatus', ['PENDING', 'PAID', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED', 'REJECTED']);
export const orderItemType = pgEnum('OrderItemType', ['REGULAR', 'COMBO_PARENT', 'COMBO_CHILD']);
export const paymentMethod = pgEnum('PaymentMethod', ['CARD', 'CASH', 'LINEPAY', 'APPLE_PAY', 'GOOGLE_PAY']);
export const paymentStatus = pgEnum('PaymentStatus', ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED']);
export const deviceType = pgEnum('DeviceType', ['RECEIPT_PRINTER', 'KITCHEN_LABEL_PRINTER', 'CARD_READER', 'CASH_DRAWER', 'QR_SCANNER', 'KDS_DISPLAY']);
export const deviceStatus = pgEnum('DeviceStatus', ['ONLINE', 'OFFLINE', 'ERROR']);
export const printJobType = pgEnum('PrintJobType', ['RECEIPT', 'KITCHEN_LABEL', 'REPORT']);
export const printJobStatus = pgEnum('PrintJobStatus', ['QUEUED', 'PRINTING', 'COMPLETED', 'FAILED']);
export const notificationChannel = pgEnum('NotificationChannel', ['EMAIL', 'SMS', 'PUSH', 'WEBSOCKET']);
export const notificationStatus = pgEnum('NotificationStatus', ['PENDING', 'SENT', 'FAILED']);
export const refundStatus = pgEnum('RefundStatus', ['PENDING', 'REFUNDED', 'FAILED']);
export const userRole = pgEnum('UserRole', ['USER', 'CASHIER', 'LEAD', 'MANAGER', 'MERCHANT', 'ADMIN']);

// ==========================================
// CORE ENTITIES
// ==========================================

export const stores = pgTable('stores', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  address: jsonb('address').notNull(), // { street, city, state, zipCode, coordinates: { lat, lng } }
  phone: varchar('phone', { length: 50 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  businessHours: jsonb('businessHours').notNull(), // [{ day: "monday", open: "10:00", close: "22:00", isOpen: true }]
  deliveryZones: jsonb('deliveryZones').notNull(), // [{ id, name, radius, deliveryFee }]
  isOpen: boolean('isOpen').default(true).notNull(),
  acceptingOrders: boolean('acceptingOrders').default(true).notNull(),
  imageUrl: varchar('imageUrl', { length: 500 }),
  rating: doublePrecision('rating').default(0),
  totalReviews: integer('totalReviews').default(0).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  statusIdx: index('idx_stores_status').on(table.isOpen, table.acceptingOrders)
}));

// ==========================================
// USER & IDENTITY ENTITIES
// ==========================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().notNull(), // Cognito Sub ID (provided by Auth service, not random)
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  emailVerified: boolean('emailVerified').default(false).notNull(),
  phoneVerified: boolean('phoneVerified').default(false).notNull(),
  imageUrl: varchar('imageUrl', { length: 500 }),
  // Global system role (e.g., ADMIN, USER). Store-specific roles are in store_staff.
  globalRole: userRole('globalRole').notNull().default('USER'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email),
  globalRoleIdx: index('idx_users_global_role').on(table.globalRole)
}));

export const userProfiles = pgTable('user_profiles', {
  userId: uuid('userId').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  savedAddresses: jsonb('savedAddresses'), // Array of { id, label, street, city, state, postalCode, country, isDefault }
  preferences: jsonb('preferences'), // { notifications: { email: bool, sms: bool, push: bool }, language: 'en' }
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
});

export const menuCategories = pgTable('menu_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('storeId').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  displayOrder: integer('displayOrder').default(0).notNull(),
  isActive: boolean('isActive').default(true).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  storeOrderIdx: index('idx_menu_categories_store_order').on(table.storeId, table.displayOrder)
}));

export const menuItems = pgTable('menu_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('storeId').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  categoryId: uuid('categoryId').notNull().references(() => menuCategories.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: integer('price').notNull(), // Price in cents
  imageUrl: varchar('imageUrl', { length: 500 }),
  isCombo: boolean('isCombo').default(false).notNull(), // true if this is a combo/meal set
  isAvailable: boolean('isAvailable').default(true).notNull(),
  isDeleted: boolean('isDeleted').default(false).notNull(),
  allergens: varchar('allergens', { length: 255 }).array(), // ["gluten", "dairy", "nuts"]
  tags: varchar('tags', { length: 100 }).array(), // ["vegetarian", "popular", "spicy"]
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  storeCategoryIdx: index('idx_menu_items_store_category').on(table.storeId, table.categoryId, table.isAvailable),
  availabilityIdx: index('idx_menu_items_availability').on(table.isAvailable, table.isDeleted),
  storeComboIdx: index('idx_menu_items_store_combo').on(table.storeId, table.isCombo)
}));

export const menuItemCustomizations = pgTable('menu_item_customizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  menuItemId: uuid('menuItemId').notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(), // "Size", "Toppings", "Sugar Level"
  type: customizationType('type').notNull(),
  required: boolean('required').default(false).notNull(),
  displayOrder: integer('displayOrder').default(0).notNull(),
  minSelections: integer('minSelections'), // For multiple_choice type
  maxSelections: integer('maxSelections'), // For multiple_choice type
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  itemOrderIdx: index('idx_customizations_item_order').on(table.menuItemId, table.displayOrder)
}));

export const comboGroups = pgTable('combo_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  menuItemId: uuid('menuItemId').notNull().references(() => menuItems.id, { onDelete: 'cascade' }), // Links to MenuItem where isCombo = true
  name: varchar('name', { length: 255 }).notNull(), // "Main Course", "Side", "Drink"
  description: text('description'),
  required: boolean('required').default(true).notNull(), // Must customer select from this group?
  allowRepeatedItems: boolean('allowRepeatedItems').default(true).notNull(), // Added: Configurable repeat selection
  minSelections: integer('minSelections').default(1).notNull(), // Minimum items to select
  maxSelections: integer('maxSelections').default(1).notNull(), // Maximum items to select
  displayOrder: integer('displayOrder').default(0).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  itemOrderIdx: index('idx_combo_groups_item_order').on(table.menuItemId, table.displayOrder)
}));

export const comboGroupItems = pgTable('combo_group_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  comboGroupId: uuid('comboGroupId').notNull().references(() => comboGroups.id, { onDelete: 'cascade' }),
  menuItemId: uuid('menuItemId').notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
  isDefault: boolean('isDefault').default(false).notNull(), // Is this the default selection for this group?
  priceDelta: integer('priceDelta').default(0).notNull(), // Price adjustment in cents for upgrade/downgrade
  displayOrder: integer('displayOrder').default(0).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  uniqueComboGroupItem: uniqueIndex('unique_combo_group_item').on(table.comboGroupId, table.menuItemId),
  orderIdx: index('idx_combo_group_items_order').on(table.comboGroupId, table.displayOrder),
  menuItemIdx: index('idx_combo_group_items_menu_item').on(table.menuItemId)
}));

// ==========================================
// VARIANTS (Fully Isolated Store-Scoped Architecture)
// ==========================================
// This table defines abstract variant concepts (size, temperature, sweetness levels)
// that can be referenced by both CustomizationOptions and Recipes.
//
// KEY DESIGN PRINCIPLES:
// 1. FULLY ISOLATED: Every variant record MUST belong to a specific store (storeId NOT NULL)
// 2. NO GLOBAL VARIANTS: There are no "system" or shared variants across stores
// 3. APPLICATION-LAYER SEEDING: When a new store is created, the backend seeds common
//    variants (from templates) into this table for that store's scope
// 4. CODE AUTO-GENERATION: The 'code' field is auto-generated by backend (e.g., slugified
//    name or random string) and is HIDDEN from users. It's only for internal system logic.
// 5. USER-FACING NAME: The 'name' field is what users see (e.g., "Large", "Hot")
//
// EXAMPLE SEEDING FLOW:
// When creating Store ABC:
// - Backend inserts: { storeId: 'abc-uuid', code: 'size_small', name: 'Small', category: 'SIZE' }
// - Backend inserts: { storeId: 'abc-uuid', code: 'size_large', name: 'Large', category: 'SIZE' }
// - Backend inserts: { storeId: 'abc-uuid', code: 'temp_hot', name: 'Hot', category: 'TEMPERATURE' }
// - etc.
//
// BENEFITS:
// - Type-safe FK relationships (no magic strings)
// - Store independence (each store can customize variant names)
// - Data integrity (invalid variant IDs rejected by database)
// - Flexibility (stores can add custom variants)

export const variants = pgTable('variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('storeId').notNull().references(() => stores.id, { onDelete: 'cascade' }), // NOT NULL - Every variant belongs to a store
  code: varchar('code', { length: 100 }).notNull(), // Auto-generated by backend, HIDDEN from users (e.g., "size_large_abc123")
  name: varchar('name', { length: 255 }).notNull(), // User-facing display name (e.g., "Large Size", "Hot")
  category: varchar('category', { length: 100 }), // Optional grouping for UI organization (e.g., "SIZE", "TEMPERATURE")
  displayOrder: integer('displayOrder').default(0).notNull(),
  isActive: boolean('isActive').default(true).notNull(), // SAFETY NOTE: Application layer MUST filter by isActive=true when compiling recipes to prevent soft-deleted variants from triggering inventory deductions
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  uniqueStoreCode: uniqueIndex('unique_variants_store_code').on(table.storeId, table.code), // Unique code within store scope
  categoryIdx: index('idx_variants_category').on(table.category)
}));

export const customizationOptions = pgTable('customization_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  customizationId: uuid('customizationId').notNull().references(() => menuItemCustomizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(), // "Small", "Medium", "Large"
  priceDelta: integer('priceDelta').default(0).notNull(), // Price adjustment in cents (can be negative for discounts)
  variantId: uuid('variantId').references(() => variants.id, { onDelete: 'set null' }), // FK to variants table for strict typing (nullable for non-variant options)
  isDefault: boolean('isDefault').default(false).notNull(), // Is this the default option? (for removable modifiers)
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
  name: varchar('name', { length: 255 }).notNull(), // "Arabica Coffee Beans", "Whole Milk", "Large Paper Cup"
  description: text('description'),
  sku: varchar('sku', { length: 100 }), // Stock Keeping Unit (unique per store, not globally)
  unit: inventoryUnit('unit').notNull(), // Unit of measurement
  currentStock: decimal('currentStock', { precision: 10, scale: 3 }).default('0').notNull(), // Support fractional quantities (e.g., 150.5g)
  reservedStock: decimal('reservedStock', { precision: 10, scale: 3 }).default('0').notNull(),
  minStock: decimal('minStock', { precision: 10, scale: 3 }).default('0').notNull(), // Minimum stock threshold for alerts
  costPerUnit: decimal('costPerUnit', { precision: 10, scale: 4 }), // Cost per unit for cost tracking
  supplier: varchar('supplier', { length: 255 }),
  lastRestocked: timestamp('lastRestocked', { withTimezone: true }),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  stockIdx: index('idx_inventory_items_stock').on(table.currentStock),
  skuIdx: index('idx_inventory_items_sku').on(table.sku),
  uniqueStoreSku: uniqueIndex('unique_store_sku').on(table.storeId, table.sku) // Multi-tenant SKU uniqueness
}));

// ==========================================
// RECIPES (Effect: What Inventory to Deduct)
// ==========================================
// This table defines the "Effect" of a recipe: which inventory item is consumed and how much.
// The "Cause" (when to trigger) is defined in the recipe_conditions table.
//
// KEY CONCEPTS:
// 1. EFFECT ONLY: This table answers "WHAT to deduct" (inventoryItemId + quantity)
// 2. CAUSE ELSEWHERE: The recipe_conditions table answers "WHEN to trigger" (variant matching)
// 3. BASE RECIPE: If a recipe has ZERO conditions in recipe_conditions, it executes unconditionally
// 4. CONDITIONAL RECIPE: If a recipe has conditions, ALL must be met (AND logic)
// 5. MENU ITEM SCOPING: If menuItemId is set, recipe only applies to that item
//                       If menuItemId is NULL, recipe is global (e.g., "Add Pearl" modifier)

export const recipes = pgTable('recipes', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('storeId').notNull().references(() => stores.id, { onDelete: 'cascade' }), // Added storeId
  menuItemId: uuid('menuItemId').references(() => menuItems.id, { onDelete: 'cascade' }), // Nullable: NULL = global recipe, SET = scoped to specific item
  inventoryItemId: uuid('inventoryItemId').notNull().references(() => inventoryItems.id, { onDelete: 'cascade' }), // The raw ingredient consumed
  quantityRequired: decimal('quantityRequired', { precision: 10, scale: 3 }).notNull(), // Amount of ingredient required
  notes: text('notes'), // Additional notes (e.g., "Use organic beans for premium blend")
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  storeMenuIdx: index('idx_recipes_store_menu').on(table.storeId, table.menuItemId), // Added efficient store-scoped index
  menuItemIdx: index('idx_recipes_menu_item').on(table.menuItemId),
  inventoryItemIdx: index('idx_recipes_inventory_item').on(table.inventoryItemId)
}));

// ==========================================
// RECIPE CONDITIONS (Cause: When to Trigger)
// ==========================================
// This junction table defines the conditions required to trigger a recipe.
// Multiple conditions for the same recipeId are evaluated with AND logic.
//
// EVALUATION RULES:
// 1. ZERO CONDITIONS = BASE RECIPE: Recipe executes unconditionally (as long as menuItemId matches)
// 2. ONE OR MORE CONDITIONS = CONDITIONAL RECIPE: ALL variants must be present in the order
//
// EXAMPLES:
// - Base Recipe: Large Latte always uses 450ml milk (no conditions)
// - Single Condition: Large Latte with Oat Milk uses 450ml oat milk (variantId = "oat_milk")
// - Composite AND: Large Hot Latte uses specific recipe (variantId = "size_large" AND "temp_hot")

export const recipeConditions = pgTable('recipe_conditions', {
  id: uuid('id').primaryKey().defaultRandom(),
  recipeId: uuid('recipeId').notNull().references(() => recipes.id, { onDelete: 'cascade' }), // The recipe this condition belongs to
  variantId: uuid('variantId').notNull().references(() => variants.id, { onDelete: 'restrict' }), // SAFETY: Prevent variant deletion if used in recipes
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  recipeIdx: index('idx_recipe_conditions_recipe').on(table.recipeId),
  variantIdx: index('idx_recipe_conditions_variant').on(table.variantId),
  uniqueRecipeVariant: uniqueIndex('unique_recipe_condition').on(table.recipeId, table.variantId) // Prevent duplicate conditions
}));

export const inventoryLogs = pgTable('inventory_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  inventoryItemId: uuid('inventoryItemId').notNull().references(() => inventoryItems.id, { onDelete: 'cascade' }),
  changeType: inventoryChangeType('changeType').notNull(),
  quantityChange: decimal('quantityChange', { precision: 10, scale: 3 }).notNull(), // Can be negative for deductions
  stockBefore: decimal('stockBefore', { precision: 10, scale: 3 }).notNull(),
  stockAfter: decimal('stockAfter', { precision: 10, scale: 3 }).notNull(),
  reason: text('reason'),
  userId: uuid('userId'),
  orderId: uuid('orderId'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  itemDateIdx: index('idx_inventory_logs_item_date').on(table.inventoryItemId, table.createdAt),
  typeIdx: index('idx_inventory_logs_type').on(table.changeType)
}));

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderNumber: varchar('orderNumber', { length: 50 }).notNull().unique(),
  storeId: uuid('storeId').notNull().references(() => stores.id, { onDelete: 'restrict' }),
  userId: uuid('userId').notNull(),
  orderSource: orderSource('orderSource').notNull(),
  orderType: orderType('orderType').notNull(),
  status: orderStatus('status').notNull().default('PENDING'),
  subtotal: integer('subtotal').notNull(), // Amount in cents
  tax: integer('tax').notNull(), // Amount in cents
  deliveryFee: integer('deliveryFee').notNull().default(0), // Amount in cents
  discount: integer('discount').notNull().default(0), // Amount in cents (Manual POS discount for v0.2.0, future: automated coupon calculation)
  discountReason: text('discountReason'), // Reason for discount (e.g., "Manager override", "Loyalty reward"). Extensibility: Can store coupon code in future
  total: integer('total').notNull(), // Amount in cents
  deliveryAddress: jsonb('deliveryAddress'),
  scheduledPickupTime: timestamp('scheduledPickupTime', { withTimezone: true }),
  notes: text('notes'),
  cancelReason: text('cancelReason'),
  cancelledAt: timestamp('cancelledAt', { withTimezone: true }),
  cancelledBy: uuid('cancelledBy'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userDateIdx: index('idx_orders_user_date').on(table.userId, table.createdAt),
  storeStatusDateIdx: index('idx_orders_store_status_date').on(table.storeId, table.status, table.createdAt),
  statusDateIdx: index('idx_orders_status_date').on(table.status, table.createdAt)
}));

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('orderId').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  menuItemId: uuid('menuItemId').notNull(),
  itemName: varchar('itemName', { length: 255 }).notNull(),
  itemType: orderItemType('itemType').notNull().default('REGULAR'), // REGULAR | COMBO_PARENT | COMBO_CHILD
  parentOrderItemId: uuid('parentOrderItemId').references(() => orderItems.id, { onDelete: 'cascade' }), // Self-reference: links COMBO_CHILD to COMBO_PARENT
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unitPrice').notNull(), // Price per unit in cents. For COMBO_CHILD: typically 0 unless upgrade/upsell
  subtotal: integer('subtotal').notNull(), // Total price in cents
  // 🔴 SNAPSHOT COLUMNS for Financial Integrity
  priceAtOrder: integer('priceAtOrder').notNull(), // Snapshot: MenuItem.price + modifier deltas in cents
  costAtOrder: integer('costAtOrder').notNull(),  // Snapshot: Calculated COGS from Recipe × InventoryItem.costPerUnit in cents
  customizations: jsonb('customizations'), // 🔴 CRITICAL: Used by ALL item types (REGULAR, COMBO_PARENT, COMBO_CHILD)
  specialInstructions: text('specialInstructions'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  orderIdx: index('idx_order_items_order').on(table.orderId),
  menuItemIdx: index('idx_order_items_menu_item').on(table.menuItemId),
  parentIdx: index('idx_order_items_parent').on(table.parentOrderItemId),
  typeIdx: index('idx_order_items_type').on(table.itemType)
}));

// ==========================================
// PAYMENT ENTITIES
// ==========================================

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('orderId').notNull().references(() => orders.id, { onDelete: 'restrict' }),
  amount: integer('amount').notNull(), // Payment amount in cents (e.g., 1299 = $12.99)
  currency: varchar('currency', { length: 3 }).notNull().default('TWD'), // ISO 4217 currency code
  method: paymentMethod('method').notNull(), // CARD, CASH, LINEPAY, APPLE_PAY, GOOGLE_PAY
  status: paymentStatus('status').notNull().default('PENDING'), // PENDING, PAID, FAILED, REFUNDED, PARTIALLY_REFUNDED
  providerTransactionId: varchar('providerTransactionId', { length: 255 }), // Stripe payment intent ID, LinePay transaction ID, etc.
  metadata: jsonb('metadata'), // Provider-specific data: { cashReceived?, changeGiven?, cardLast4?, terminalId? }
  paidAt: timestamp('paidAt', { withTimezone: true }),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  orderIdx: index('idx_payments_order').on(table.orderId),
  statusIdx: index('idx_payments_status').on(table.status),
  providerIdx: index('idx_payments_provider').on(table.providerTransactionId),
  createdAtIdx: index('idx_payments_created_at').on(table.createdAt)
}));

export const refunds = pgTable('refunds', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('paymentId').notNull().references(() => payments.id, { onDelete: 'restrict' }),
  amount: integer('amount').notNull(), // Refund amount in cents
  currency: varchar('currency', { length: 3 }).notNull().default('TWD'), // ISO 4217 currency code
  reason: text('reason'),
  status: refundStatus('status').notNull().default('PENDING'), // PENDING, REFUNDED, FAILED
  providerRefundId: varchar('providerRefundId', { length: 255 }), // Stripe refund ID, LinePay refund ID
  processedAt: timestamp('processedAt', { withTimezone: true }),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  paymentIdx: index('idx_refunds_payment').on(table.paymentId),
  statusIdx: index('idx_refunds_status').on(table.status)
}));

// ==========================================
// DEVICE & HARDWARE ENTITIES
// ==========================================

export const devices = pgTable('devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('storeId').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(), // User-friendly name (e.g., "Front Counter Printer")
  type: deviceType('type').notNull(), // RECEIPT_PRINTER, KITCHEN_LABEL_PRINTER, CARD_READER, CASH_DRAWER, QR_SCANNER, KDS_DISPLAY
  status: deviceStatus('status').notNull().default('OFFLINE'), // ONLINE, OFFLINE, ERROR
  ipAddress: varchar('ipAddress', { length: 45 }), // IPv4 or IPv6
  macAddress: varchar('macAddress', { length: 17 }), // MAC address for device identification
  serialNumber: varchar('serialNumber', { length: 100 }),
  firmwareVersion: varchar('firmwareVersion', { length: 50 }),
  metadata: jsonb('metadata'), // Device-specific configuration: { model?, manufacturer?, capabilities? }
  lastSeen: timestamp('lastSeen', { withTimezone: true }), // Last heartbeat timestamp
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  storeTypeIdx: index('idx_devices_store_type').on(table.storeId, table.type),
  statusIdx: index('idx_devices_status').on(table.status),
  lastSeenIdx: index('idx_devices_last_seen').on(table.lastSeen)
}));

export const printJobs = pgTable('print_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: uuid('deviceId').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  orderId: uuid('orderId').references(() => orders.id, { onDelete: 'set null' }), // Nullable: may be non-order print jobs (reports, etc.)
  type: printJobType('type').notNull(), // RECEIPT, KITCHEN_LABEL, REPORT
  status: printJobStatus('status').notNull().default('QUEUED'), // QUEUED, PRINTING, COMPLETED, FAILED
  content: jsonb('content').notNull(), // Print data: { orderNumber?, items?, totalAmount?, customerInfo?, template? }
  retryCount: integer('retryCount').notNull().default(0),
  errorMessage: text('errorMessage'),
  queuedAt: timestamp('queuedAt', { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp('startedAt', { withTimezone: true }),
  completedAt: timestamp('completedAt', { withTimezone: true })
}, (table) => ({
  deviceStatusIdx: index('idx_print_jobs_device_status').on(table.deviceId, table.status),
  orderIdx: index('idx_print_jobs_order').on(table.orderId),
  queuedAtIdx: index('idx_print_jobs_queued_at').on(table.queuedAt)
}));

// ==========================================
// NOTIFICATION ENTITIES
// ==========================================

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('userId').notNull().references(() => users.id, { onDelete: 'cascade' }), // FK to users table
  type: varchar('type', { length: 100 }).notNull(), // ORDER_CONFIRMATION, ORDER_READY, PAYMENT_SUCCESS, etc.
  channel: notificationChannel('channel').notNull(), // EMAIL, SMS, PUSH, WEBSOCKET
  status: notificationStatus('status').notNull().default('PENDING'), // PENDING, SENT, FAILED
  recipient: varchar('recipient', { length: 255 }).notNull(), // Email address, phone number, device token, or WebSocket connectionId
  subject: varchar('subject', { length: 255 }),
  message: text('message').notNull(),
  metadata: jsonb('metadata'), // Additional context: { orderId?, storeId?, actionUrl? }
  sentAt: timestamp('sentAt', { withTimezone: true }),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userTypeIdx: index('idx_notifications_user_type').on(table.userId, table.type),
  statusIdx: index('idx_notifications_status').on(table.status),
  createdAtIdx: index('idx_notifications_created_at').on(table.createdAt)
}));

// ==========================================
// CRM & LOYALTY ENTITIES
// ==========================================
// Out of scope for v0.2.0 (MVP + Inventory + POS)
// Future modules: Loyalty Points, Coupons, Customer Tiers, Referrals
// Extensibility: Orders.discount and Orders.discountReason fields serve as hooks for future coupon integration

// ==========================================
// STORE STAFF ENTITIES
// ==========================================

export const storeStaff = pgTable('store_staff', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('storeId').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  userId: uuid('userId').notNull().references(() => users.id, { onDelete: 'cascade' }), // FK to users table
  role: staffRole('role').notNull(), // CASHIER, LEAD, MANAGER, MERCHANT
  isActive: boolean('isActive').notNull().default(true),
  hiredAt: timestamp('hiredAt', { withTimezone: true }).defaultNow().notNull(),
  terminatedAt: timestamp('terminatedAt', { withTimezone: true }),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  storeUserIdx: uniqueIndex('unique_store_staff_user').on(table.storeId, table.userId), // One staff record per user per store
  storeRoleIdx: index('idx_store_staff_store_role').on(table.storeId, table.role),
  userIdx: index('idx_store_staff_user').on(table.userId),
  activeIdx: index('idx_store_staff_active').on(table.isActive)
}));

// ==========================================
// PLATFORM INTEGRATION ENTITIES
// ==========================================
// Out of scope for v0.2.0 (MVP + Inventory + POS)
// Future modules: UberEats/Foodpanda webhook integration, menu sync, order import
// Extensibility: OrderSource enum can be extended to include UBEREATS, FOODPANDA in future versions

```

---

## Entity Relationship Diagrams

### Core Entities Diagram

```
┌─────────────────┐
│     Store       │
│─────────────────│
│ id (PK)         │
│ name            │
│ address (JSON)  │
│ businessHours   │
└────────┬────────┘
         │
         │ 1:N
         │
    ┌────┴──────────────────┐───────────────────┐
    │               │       │                   │
┌───▼────────┐  ┌───▼──────────────────┐   ┌────▼─────────┐
│  Category  │  │   MenuItem           │   │   Variant    │
│────────────│  │──────────────────────│   │──────────────│
│ id (PK)    │  │ id (PK)              │   │ id (PK)      │
│ storeId FK │  │ storeId FK           │   │ storeId FK   │
│ name       │  │ categoryId FK        │   │ code         │
└────┬───────┘  │ name                 │   │ name         │
     │          │ price                │   │ category     │
     │ 1:N      │ isAvailable          │   └──────────────┘
     └─────────►│ isCombo (BOOLEAN)    │◄────────┐         
                └──┬────────┬──────────┘         │         
                   │        │                    │         
                   │ 1:N    │ 1:N                │         
                   │        │                    │        
     ┌──────────────────┐   │                    │         
     │  Recipe          │   │                    │         
     │──────────────────│   │                    │         
     │ id (PK)          │   │                    │         
     │ storeId (FK)     │   │                    │         
     │ menuItemId FK    │   │                    │         
     │ inventoryItemId FK   │                    │         
     │ quantityRequired │   │                    │         
     │ notes            │   │                    │         
     └──────┬───────────┘   │                    │         
            │               │                    │        
            │ N:1           │                    │       
            │               │                    │     
            │               │                    │
        ┌───▼───────────────┴──────┐             │
        │                          │             │
        │ If isCombo = false       │ If isCombo = true
        │                          │             │
┌───────▼──────────────┐    ┌──────▼──────────────────┐
│MenuItemCustomization │    │  ComboGroup             │
│──────────────────────│    │─────────────────────────│
│ id (PK)              │    │ id (PK)                 │
│ menuItemId (FK)      │    │ menuItemId (FK)         │
│ name ("Size")        │    │ name ("Main", "Side")   │
│ type (ENUM)          │    │ required                │
│ required             │    │ allowRepeatedItems      │
│ minSelections        │    │ minSelections           │
│ maxSelections        │    │ maxSelections           │
└──────┬───────────────┘    └──────┬──────────────────┘
       │                           │
       │                           │ 1:N
       │ 1:N                       │
       │                    ┌──────▼──────────────────┐
┌──────▼──────────────────┐ │ ComboGroupItem          │
│ CustomizationOption     │ │─────────────────────────│
│─────────────────────────│ │ id (PK)                 │
│ id (PK)                 │ │ comboGroupId (FK)       │
│ customizationId (FK)    │ │ menuItemId (FK)         ┼─┐
│ name ("Small","Large")  │ │ isDefault               │ │ Reference
│ priceDelta              │ │ priceDelta              │ │ any MenuItem
│ variantId (FK)────────┐ │ └─────────────────────────┘ │
│ isDefault             │ │                             │
│ isAvailable           │ │◄────────────────────────────┘
└───────────────────────┘ │
       │                  │
       │ FK to Variant    │
       └──────────────────┼───────────────────────┐
                          │                       │
┌─────────────────────────┐                       │
│ Recipe                  │                       │
│─────────────────────────│                       │
│ id (PK)                 │                       │
│ storeId (FK)            │                       │
│ menuItemId (FK, NULL)   │  Nullable: NULL=global│
│ inventoryItemId (FK)    │            SET=scoped │
│ quantityRequired        │                       │
│ notes                   │                       │
└──────┬──────────────────┘                       │
       │                                          │
       │ 1:N                                      │
       │                                          │
┌──────▼──────────────────────┐                   │
│ RecipeCondition             │                   │
│─────────────────────────────│                   │
│ id (PK)                     │                   │
│ recipeId (FK)               │                   │
│ variantId (FK)──────────────┼───────────────────┘
└─────────────────────────────┘
       │ N:1
       │
┌──────▼──────────────────┐
│ InventoryItem           │
│─────────────────────────│
│ id (PK)                 │
│ name ("Milk", "Tea")    │
│ sku                     │
│ unit (ENUM)             │
│ currentStock            │
│ reservedStock           │
│ minStock                │
│ costPerUnit             │
└─────────────────────────┘

NEW RECIPE LOGIC (V1.5):
- Recipe defines EFFECT (what inventory to deduct)
- RecipeCondition defines CAUSE (when to trigger)
- ZERO conditions = Base Recipe (unconditional)
- ONE+ conditions = Conditional (AND logic)
- Variant matching: CustomizationOption.variantId → Variant.id
                    RecipeCondition.variantId → Variant.id

RECIPE SCOPING:
- menuItemId NULL: Global recipe (applies to any order with matching variants)
- menuItemId SET: Item-scoped recipe (only applies to this specific menu item)

VARIANT EVALUATION:
- Collect variantIds from selected CustomizationOptions
- Recipe executes ONLY if ALL its conditions are in context (AND logic)
- Example: Recipe with 2 conditions (size_large + temp_hot) only triggers
  when customer selects BOTH Large AND Hot
```

### Order Flow Diagram

```
┌──────────────┐           ┌───────────────┐
│    User      │           │     Store     │
│──────────────│           │───────────────│
│ id (PK)      │           │ id (PK)       │
│ email        │           │ name          │
└──────┬───────┘           └────┬──────────┘
       │                        │
       │ 1:N                    │ 1:N
       │                        │
   ┌───▼────────────────────────▼───┐
   │         Order                  │
   │────────────────────────────────│
   │ id (PK)                        │
   │ userId (FK)                    │
   │ storeId (FK)                   │
   │ orderNumber                    │
   │ status (ENUM)                  │
   │ total                          │
   └──────┬─────────────────┬───────┘
          │                 │
          │ 1:N             │ 1:N
          │                 │
   ┌──────▼─────────┐   ┌───▼──────────┐
   │  OrderItem     │   │   Payment    │
   │────────────────│   │──────────────│
   │ id (PK)        │   │ id (PK)      │
   │ orderId (FK)   │   │ orderId (FK) │
   │ menuItemId FK  │   │ amount       │
   │ quantity       │   │ status       │
   │ subtotal       │   └──────────────┘
   └────────────────┘
```

### CRM Entities Diagram

```
[Out of scope for v0.2.0 - CRM entities (Loyalty, Coupons, Tiers, Referrals) will be added in future versions]
```

---

## Index Strategies

### Primary Indexes

All tables have primary key indexes automatically created on `id` columns.

### Query Optimization Indexes

**High-Priority Indexes** (created immediately):

```sql
-- Orders - frequent queries by user and store
CREATE INDEX idx_orders_user_date ON orders (user_id, created_at DESC);
CREATE INDEX idx_orders_store_status_date ON orders (store_id, status, created_at DESC);
CREATE INDEX idx_orders_status_date ON orders (status, created_at DESC);

-- Menu Items - catalog browsing
CREATE INDEX idx_menu_items_store_category ON menu_items (store_id, category_id, is_available);
CREATE INDEX idx_menu_items_availability ON menu_items (is_available, is_deleted);

-- Menu Customizations - options lookup
CREATE INDEX idx_customizations_item_order ON menu_item_customizations (menu_item_id, display_order);
CREATE INDEX idx_customization_options_order ON customization_options (customization_id, display_order);
CREATE INDEX idx_customization_options_available ON customization_options (is_available);
CREATE INDEX idx_customization_options_variant ON customization_options (variant_id);

-- Combo Groups - combo management (for MenuItem where isCombo = true)
CREATE INDEX idx_combo_groups_item_order ON combo_groups (menu_item_id, display_order);
CREATE INDEX idx_combo_group_items_order ON combo_group_items (combo_group_id, display_order);
CREATE INDEX idx_combo_group_items_menu_item ON combo_group_items (menu_item_id);
CREATE UNIQUE INDEX unique_combo_group_item ON combo_group_items (combo_group_id, menu_item_id);

-- Menu Items - combo filtering
CREATE INDEX idx_menu_items_store_combo ON menu_items (store_id, is_combo);

-- Inventory Items - stock checks and SKU lookup (multi-tenant scope)
CREATE INDEX idx_inventory_items_stock ON inventory_items (current_stock);
CREATE INDEX idx_inventory_items_low_stock ON inventory_items (store_id, current_stock) WHERE current_stock <= min_stock;

-- Variants - master variant lookup
CREATE INDEX idx_variants_category ON variants (category);
CREATE UNIQUE INDEX unique_variants_store_code ON variants (store_id, code);

-- Recipes - ingredient consumption lookup
CREATE INDEX idx_recipes_store_menu ON recipes (store_id, menu_item_id); -- Composite index for efficient store-scoped queries
CREATE INDEX idx_recipes_menu_item ON recipes (menu_item_id);
CREATE INDEX idx_recipes_inventory_item ON recipes (inventory_item_id);

-- Recipe Conditions - variant matching for conditional recipes
CREATE INDEX idx_recipe_conditions_recipe ON recipe_conditions (recipe_id);
CREATE INDEX idx_recipe_conditions_variant ON recipe_conditions (variant_id);
CREATE UNIQUE INDEX unique_recipe_condition ON recipe_conditions (recipe_id, variant_id);

-- Inventory Logs - history tracking
CREATE INDEX idx_inventory_logs_item_date ON inventory_logs (inventory_item_id, created_at DESC);
CREATE INDEX idx_inventory_logs_type ON inventory_logs (change_type);

-- Payments - financial queries
CREATE INDEX idx_payments_status_date ON payments (status, created_at DESC);

-- Store Staff - permission checks
CREATE INDEX idx_store_staff_role ON store_staff (store_id, role);
```

**Composite Indexes** for common query patterns:

```sql
-- Store status filtering
CREATE INDEX idx_stores_status ON stores (is_open, accepting_orders);

-- Menu category ordering
CREATE INDEX idx_menu_categories_store_order ON menu_categories (store_id, display_order);

-- Order status history tracking
CREATE INDEX idx_order_status_history ON order_status_history (order_id, created_at DESC);
```

**Full-Text Search Indexes** (using pg_trgm extension):

```sql
-- Menu item search
CREATE INDEX idx_menu_items_name_search ON menu_items USING gin (name gin_trgm_ops);

-- Store search
CREATE INDEX idx_stores_name_search ON stores USING gin (name gin_trgm_ops);
```

### Partial Indexes

```sql
-- Low stock inventory items
CREATE INDEX idx_inventory_items_low_stock ON inventory_items (id, current_stock) 
  WHERE current_stock <= min_stock;

-- Failed payments for retry
CREATE INDEX idx_payments_failed ON payments (id, created_at) WHERE status = 'FAILED';
```

---

## Migration Guidelines

### Drizzle Kit Commands

**Generate Migration**:
```bash
npx drizzle-kit generate:pg --schema=./src/db/schema.ts
```

**Apply Migrations** (production):
```bash
npx drizzle-kit push:pg
# Or use migration files:
node src/db/migrate.ts
```

**Drop Database** (development only):
```bash
npx drizzle-kit drop
```

**Introspect Existing Database**:
```bash
npx drizzle-kit introspect:pg
```

### Migration Best Practices

1. **Never Modify Existing Migrations**: Always create new migrations
2. **Test in Staging First**: Apply migrations to staging environment before production
3. **Backward Compatible Changes**: Ensure migrations don't break existing code
4. **Data Migration**: Use separate data migration scripts for complex transformations
5. **Rollback Plan**: Always have a rollback strategy for production migrations

### Example Migration Workflow

**Add New Column**:
```typescript
// 1. Update src/db/schema.ts
export const menuItems = pgTable('menu_items', {
  // ... existing fields
  nutrition: jsonb('nutrition'), // NEW FIELD
});
```

```bash
# 2. Generate migration
npx drizzle-kit generate:pg

# 3. Review generated migration SQL in drizzle/migrations/
# 4. Test in development
node src/db/migrate.ts

# 5. Apply to staging
node src/db/migrate.ts

# 6. Verify staging
# 7. Apply to production
node src/db/migrate.ts
```

---

## Redis Cache Patterns

While PostgreSQL is the primary database, Redis is used for caching and temporary data:

### Cache Keys

| Key Pattern | TTL | Description |
|-------------|-----|-------------|
| `menu:{storeId}` | 5 min | Full menu cache |
| `store:{storeId}` | 10 min | Store configuration |
| `user:{userId}` | 15 min | User profile |
| `lock:inventory:{inventoryItemId}` | 10 min | Inventory reservation lock |
| `recipe:cache:{menuItemId}` | 30 min | Compiled recipe for menu item |
| `coupon:{code}` | Until expiry | Coupon validation cache |
| `ws:connection:{userId}` | Active | WebSocket connection ID |
| `idempotency:{key}` | 24 hours | Idempotency tracking |
| `rate:{ip}:{endpoint}` | 1 min | Rate limiting |

### Cache Invalidation

**On Menu Update**:
```typescript
// Invalidate menu cache
await redis.del(`menu:${storeId}`);
```

**On Store Config Update**:
```typescript
// Invalidate store cache
await redis.del(`store:${storeId}`);
```

**On User Profile Update**:
```typescript
// Invalidate user cache
await redis.del(`user:${userId}`);
```

---

## Data Retention Policies

### Hot Data (PostgreSQL)

- **Orders**: Keep for 3 months
- **Payments**: Keep for 1 year (regulatory requirement)
- **Inventory Logs**: Keep for 6 months
- **Notifications**: Keep for 30 days

### Cold Data (S3 via Glue Export)

- **Orders (historical)**: > 3 months old → S3 (queryable via Athena)
- **Inventory Logs (historical)**: > 6 months old → S3
- **Notifications (archived)**: > 30 days old → S3

### Archive Strategy

**Daily Glue Job**:
```sql
-- Export orders older than 3 months to S3
INSERT INTO s3_orders
SELECT * FROM orders
WHERE created_at < NOW() - INTERVAL '3 months';

-- Delete from PostgreSQL
DELETE FROM orders
WHERE created_at < NOW() - INTERVAL '3 months';
```

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-21 | Simon Chou | Initial Baseline (Scope: v0.2.0 MVP + Inventory + POS) |

### General Guidelines

1. **Drizzle ORM**: Use `drizzle-orm` for type-safe database access with minimal overhead (~5KB vs Prisma's ~20MB)
2. **Transactions**: Use Drizzle transactions (`db.transaction()`) for multi-table operations
3. **Connection Pooling**: RDS Proxy handles connection pooling, Drizzle's lightweight client minimizes connection overhead
4. **Migrations**: Always run migrations before deploying Lambda functions (use `drizzle-kit` or migration runner)
5. **Soft Deletes**: Use `isDeleted` flag instead of hard deletes for menu items
6. **Cold Start Optimization**: Drizzle has minimal overhead, ideal for Lambda cold starts

### Menu Item & Combo Management

6. **Combo Definition**: MenuItem with `isCombo: true` represents a Set Meal (e.g., "Burger Combo"). It has `comboGroups` that define selectable components (e.g., "Choose Main", "Choose Side", "Choose Drink").

7. **Order Item Types** (Self-Referencing Pattern):
   - `REGULAR`: Standard single item order (e.g., "Classic Burger")
   - `COMBO_PARENT`: Virtual container for a combo order - holds the combo's total price but does NOT consume inventory
   - `COMBO_CHILD`: Actual component of a combo (e.g., "Classic Burger" inside "Burger Combo") - THIS consumes inventory
   
8. **Combo Order Structure Example**:
   ```typescript
   // Order for "Burger Combo" ($150.00) with Classic Burger + Large Fries (upgrade +$10.00) + Coke
   [
     {
       id: "item-1",
       itemType: "COMBO_PARENT",
       menuItemId: "combo-001", // The "Burger Combo" MenuItem
       itemName: "Burger Combo",
       quantity: 1,
       unitPrice: 150.00, // $150.00
       subtotal: 150.00,
       parentOrderItemId: null,
       customizations: null // COMBO_PARENT has no customizations
     },
     {
       id: "item-2",
       itemType: "COMBO_CHILD",
       menuItemId: "burger-001", // The "Classic Burger" MenuItem
       itemName: "Classic Burger",
       quantity: 1,
       unitPrice: 0.00, // No additional charge (included in combo)
       subtotal: 0.00,
       parentOrderItemId: "item-1",
       customizations: [{name: "No Onion", options: [...]}] // Burger-specific customizations
     },
     {
       id: "item-3",
       itemType: "COMBO_CHILD",
       menuItemId: "fries-002", // The "Large Fries" MenuItem
       itemName: "Large Fries",
       quantity: 1,
       unitPrice: 10.00, // +$10.00 upgrade charge
       subtotal: 10.00,
       parentOrderItemId: "item-1",
       customizations: null
     },
     {
       id: "item-4",
       itemType: "COMBO_CHILD",
       menuItemId: "drink-001", // The "Coke" MenuItem
       itemName: "Coke",
       quantity: 1,
       unitPrice: 0.00,
       subtotal: 0.00,
       parentOrderItemId: "item-1",
       customizations: [{name: "Ice Level", options: [{name: "No Ice"}]}]
     }
   ]
   // Total Order: $150.00 (COMBO_PARENT) + $10.00 (upgrade) = $160.00
   ```

9. **Query with Relations**: When querying MenuItem with Drizzle, use joins or relational queries:
   ```typescript
   // Using Drizzle relational queries
   const item = await db.query.menuItems.findFirst({
     where: eq(menuItems.id, itemId),
     with: {
       customizations: {
         with: { options: true }
       },
       comboGroups: {
         with: { items: { with: { menuItem: true } } }
       }
     }
   });
   ```

10. **Inventory Deduction Logic** (CRITICAL):
    ```typescript
    // When processing an order, iterate through order_items:
    for (const item of orderItems) {
      if (item.itemType === 'COMBO_PARENT') {
        continue; // SKIP - This is just a price container, doesn't consume inventory
      }
      
      // Process inventory for REGULAR and COMBO_CHILD items
      if (item.itemType === 'REGULAR' || item.itemType === 'COMBO_CHILD') {
        const recipes = await compileRecipes(item.menuItemId, item.customizations);
        await deductInventory(recipes, item.quantity);
      }
    }
    ```

11. **Combo Defaults**: Each ComboGroup must have exactly one item with `isDefault: true`

12. **Combo Validation**: Validate that customer selections meet minSelections/maxSelections constraints for each group

13. **Price Delta**: `priceDelta` field represents price adjustment (positive for upgrade, negative for discount, 0 for no change)

14. **Analytics with JSONB Customizations**: Use PostgreSQL's `jsonb_array_elements()` to analyze topping/modifier sales:
    ```sql
    -- Example: Count "No Onion" selections across all orders
    SELECT 
      jsonb_array_elements(customizations)->>'name' AS customization_name,
      COUNT(*) AS selection_count
    FROM order_items
    WHERE customizations IS NOT NULL
    GROUP BY customization_name;
    ```

### Inventory & Recipe System (Recipe-Driven Architecture)

15. **Multi-Tenant Inventory Isolation**: InventoryItem MUST include `storeId` to isolate inventory per store. Updating "Milk" stock should only affect the specific store's inventory, not globally across all stores.

16. **Decoupling Philosophy**: MenuItem does NOT directly link to inventory. All stock consumption is defined through the `Recipe` model.

16.5. **Fully Isolated Store-Scoped Variant Architecture**:
    - **Design Philosophy**: Every variant record strictly belongs to a specific store (`storeId NOT NULL`)
    - **No Global Variants**: There are NO shared "system" variants in the database
    - **Application-Layer Seeding**: When a new store is created, the backend automatically seeds common variants (from templates) into the `variants` table within that store's scope
    - **Code Auto-Generation**: The `code` field is auto-generated by backend (e.g., slugified name like "size_large_a1b2c3" or random string) and is **HIDDEN from users**. It's only for internal system logic and uniqueness constraints.
    - **User-Facing Name**: The `name` field is what users see in the UI (e.g., "Large", "Hot", "50% Sugar")
    - **Store Independence**: Each store can customize variant names (Store A's "Grande" = Store B's "Large")
    - **Single Source of Truth**: `variantId` (FK to `variants.id`) is now the authoritative link between options and recipes, replacing error-prone string matching
    - **Example Seeding Flow**:
      ```typescript
      // When Store ABC is created, backend seeds:
      await db.insert(variants).values([
        { storeId: 'abc-uuid', code: 'size_s_x7y9', name: 'Small', category: 'SIZE', displayOrder: 1 },
        { storeId: 'abc-uuid', code: 'size_l_k3m5', name: 'Large', category: 'SIZE', displayOrder: 2 },
        { storeId: 'abc-uuid', code: 'temp_hot_p2q4', name: 'Hot', category: 'TEMPERATURE', displayOrder: 1 },
        { storeId: 'abc-uuid', code: 'temp_iced_r6s8', name: 'Iced', category: 'TEMPERATURE', displayOrder: 2 },
        // ... more template variants
      ]);
      ```
    - **Benefits**:
      - Type-safe FK relationships prevent typos (database rejects invalid variant IDs)
      - Centralized variant management (update name once, reflects everywhere)
      - Store isolation (Store A's changes don't affect Store B)
      - Referential integrity (deleting a variant cascades properly)

17. **Recipe Conditions Architecture** (Effect vs. Cause Separation):
    - **Recipe Table**: Defines the "Effect" (WHAT inventory to deduct)
      - `menuItemId`: Nullable. If NULL = global recipe, if SET = scoped to specific menu item
      - `inventoryItemId`: Which raw ingredient is consumed
      - `quantityRequired`: How much is consumed
    - **RecipeCondition Table**: Defines the "Cause" (WHEN to trigger the recipe)
      - Junction table linking `recipeId` to `variantId`
      - Multiple conditions for same recipe = AND logic (ALL must be met)
      - Zero conditions = Base Recipe (unconditional execution)
    
    **Recipe Types**:
    - **Base Recipe** (Zero Conditions):
      - Example: "Americano always uses 18g coffee beans"
      - Recipe has NO rows in recipe_conditions table
      - Executes unconditionally as long as menuItemId matches
    
    - **Single-Condition Recipe** (One Variant Required):
      - Example: "Large Latte uses 450ml milk" (condition: variantId = "size_large")
      - Recipe has ONE row in recipe_conditions
      - Executes when that specific variant is present in order
    
    - **Composite-Condition Recipe** (Multiple Variants Required - AND Logic):
      - Example: "Large Hot Latte uses 450ml milk" (conditions: "size_large" AND "temp_hot")
      - Recipe has MULTIPLE rows in recipe_conditions
      - Executes ONLY when ALL specified variants are present
      - Supports real-world scenarios like "Extra shot only available for Large size" (size_large AND option_extra_shot)
    
    - **Global Recipe** (menuItemId = NULL):
      - Example: "Add Pearl modifier uses 30g tapioca pearls"
      - Can be applied to any menu item
      - Still respects recipe_conditions (can be conditional or unconditional)

18. **Recipe Evaluation Logic** (Composite Condition Matching with AND Logic):
    - **Problem**: Real-world recipes require composite conditions (e.g., "Large Hot Latte" needs different milk amount than "Large Iced Latte")
    - **Solution**: Separate Effect (recipes table) from Cause (recipe_conditions table) with AND logic support
    - **Execution Flow**:
      ```typescript
      // Step 1: Collect variant context from order (variant IDs from selected options)
      const variantContext = new Set<string>(); // Set of variant IDs
      orderItem.customizations.forEach(customization => {
        customization.selectedOptions.forEach(option => {
          if (option.variantId) {
            variantContext.add(option.variantId); // FK to variants.id
          }
        });
      });

      // Step 2: Fetch recipes with their conditions
      const recipes = await db.query.recipes.findMany({
        where: eq(recipes.menuItemId, orderItem.menuItemId),
        with: {
          conditions: true // Join recipe_conditions
        }
      });

      // Step 3: Find applicable recipes (AND logic evaluation)
      const applicableRecipes = recipes.filter(recipe => {
        // Base Recipe (zero conditions) - always applies
        if (recipe.conditions.length === 0) return true;
        
        // Conditional Recipe - ALL conditions must be met (AND logic)
        const allConditionsMet = recipe.conditions.every(condition => 
          variantContext.has(condition.variantId)
        );
        
        return allConditionsMet;
      });

      // Step 4: Deduct inventory for each applicable recipe
      for (const recipe of applicableRecipes) {
        await deductInventory(recipe.inventoryItemId, recipe.quantityRequired);
      }
      ```
    
    - **Critical Rule**: A recipe executes if and only if:
      1. Its `menuItemId` matches the order item (or is NULL for global recipes)
      2. AND ALL linked `recipe_conditions` are satisfied (i.e., all required variants are present in variantContext)
      3. Note: If a recipe has NO conditions, it is treated as a Base Recipe and executes automatically

19. **Variant Code Examples (variants.code)**:
    - **IMPORTANT**: These codes are **auto-generated by backend** and **hidden from users**
    - **Purpose**: Internal system logic, uniqueness within store scope, debugging
    - **Format**: Typically `category_name_randomstring` (e.g., `"size_small_a1b2"`, `"temp_hot_x7y9"`)
    - **Examples**:
      - Size variants: `"size_s_k3m5"`, `"size_m_p2q4"`, `"size_l_r6s8"`
      - Temperature: `"temp_hot_t9u1"`, `"temp_iced_v3w5"`
      - Sweetness: `"sweet_0_x7y9"`, `"sweet_50_z1a3"`, `"sweet_100_b5c7"`
    - **User Sees**: Only the `name` field (e.g., "Small", "Hot", "50% Sugar")
    - **Store Isolation**: Each store has its own set of variants with unique codes
    - **FK Relationships**: 
      - CustomizationOption.variantId → Variant.id
      - RecipeCondition.variantId → Variant.id (NEW in V1.5)
      - Type-safe FKs ensure data integrity, NOT magic string matching

20. **Modifier Option Default Logic**:
    - `isDefault: true` means this option is selected by default
    - For "removable" modifiers (e.g., "No Green Onion"), the default option has a recipe, the removal option has NO recipe
    - Example:
      ```
      Customization: "Green Onion"
      - Option 1: "Standard" (isDefault: true, has Recipe: 5g green onion)
      - Option 2: "No Green Onion" (isDefault: false, NO recipe)
      ```

21. **Recipe Scoping** (V1.5 Architecture):
    - **Nullable menuItemId**: The `menuItemId` field determines recipe scope
      - **NULL**: Global Recipe - can be applied to any menu item (e.g., "Add Pearl" modifier)
      - **SET**: Scoped Recipe - applies only to the specified menu item
    - **No modifierOptionId**: This column was removed in V1.5
    - **Conditions Define Trigger**: Use the `recipe_conditions` junction table to define when a recipe executes
      - Zero conditions = Base Recipe (unconditional)
      - One+ conditions = Conditional Recipe (ALL must be met - AND logic)

22. **Inventory Units**: Use the `InventoryUnit` enum (GRAM, MILLILITER, PIECE, KILOGRAM, LITER) for precise quantity tracking with 3 decimal places.

23. **Stock Reservation Flow with Recipe Conditions (V1.5)**:
    ```typescript
    import { db } from './db'; // Drizzle instance
    import { inventoryItems, recipes, recipeConditions } from './schema';
    import { eq, and, isNull, inArray, sql } from 'drizzle-orm';
    
    // ✅ STEP 1: Compile all applicable recipes using Recipe Conditions
    async function compileRecipes(
      storeId: string, // <--- ADDED storeId param
      menuItemId: string, 
      variantContext: Set<string> // Set of variant IDs from selected CustomizationOptions
    ): Promise<{ inventoryItemId: string; totalQuantityRequired: number }[]> {
      
      // Fetch ALL recipes for this menuItemId AND Store
      const allRecipes = await db.query.recipes.findMany({
        where: and(
          eq(recipes.storeId, storeId), // <--- CRITICAL: Filter by store
          or(
            eq(recipes.menuItemId, menuItemId), // Scoped recipes
            isNull(recipes.menuItemId) // Global recipes
          )
        ),
        with: {
          conditions: true // Join recipe_conditions table
        }
      });
      
      // Filter recipes based on their conditions (AND logic)
      const applicableRecipes = allRecipes.filter(recipe => {
        // Base Recipe (zero conditions) - always applies
        if (recipe.conditions.length === 0) return true;
        
        // Conditional Recipe - ALL conditions must be met (AND logic)
        const allConditionsMet = recipe.conditions.every(condition => 
          variantContext.has(condition.variantId)
        );
        
        return allConditionsMet;
      });
      
      // ✅ FORMULA: Aggregate quantities by inventory item
      const aggregated = applicableRecipes.reduce((acc, recipe) => {
        acc[recipe.inventoryItemId] = (acc[recipe.inventoryItemId] || 0) + recipe.quantityRequired;
        return acc;
      }, {} as Record<string, number>);
      
      return Object.entries(aggregated).map(([inventoryItemId, quantity]) => ({
        inventoryItemId,
        totalQuantityRequired: quantity
      }));
    }
    
    // ✅ STEP 2: Reserve stock before payment (atomic update)
    async function reserveStock(
      compiledRecipes: { inventoryItemId: string; totalQuantityRequired: number }[], 
      orderId: string
    ) {
      await db.transaction(async (tx) => {
        for (const item of compiledRecipes) {
          // Atomic decrement with validation
          const result = await tx.update(inventoryItems)
            .set({ 
              currentStock: sql`${inventoryItems.currentStock} - ${item.totalQuantityRequired}`,
              reservedStock: sql`${inventoryItems.reservedStock} + ${item.totalQuantityRequired}`
            })
            .where(
              and(
                eq(inventoryItems.id, item.inventoryItemId),
                sql`${inventoryItems.currentStock} >= ${item.totalQuantityRequired}` // Prevent negative stock
              )
            )
            .returning({ id: inventoryItems.id });
          
          if (result.length === 0) {
            throw new Error(`Insufficient stock for item ${item.inventoryItemId}`);
          }
        }
        
        // Store reservation in Redis with TTL for rollback if payment fails
        await redis.setex(
          `reservation:${orderId}`,
          600, // 10 minutes TTL
          JSON.stringify(compiledRecipes)
        );
      });
    }
    ```

24. **Low Stock Alerts**: Query `inventoryItems` where `currentStock <= minStock` AND `storeId = <current_store>` to trigger store-specific restocking notifications.

25. **Cost Tracking & Financial Snapshots**: 
    - Use `InventoryItem.costPerUnit` to calculate COGS (Cost of Goods Sold) for each order.
    - **CRITICAL**: Snapshot both `priceAtOrder` and `costAtOrder` in the `order_items` table to preserve financial accuracy:
      - `priceAtOrder`: MenuItem.price + sum of selected modifier `priceDelta` values at order creation time
      - `costAtOrder`: Calculated COGS = sum of (Recipe.quantityRequired × InventoryItem.costPerUnit) at order creation time
    - This ensures historical reports remain accurate even if prices/costs change in the future.

### Recipe-Driven Architecture: Validation Scenarios

**Scenario 1: Size-Based Quantity Variation (避免菜单组合爆炸)**

*Problem*: "Large cup needs 700ml tea, Medium needs 500ml" without creating separate "Large Tea" and "Medium Tea" menu items.

*Solution*: Use Variant table + RecipeCondition junction table for conditional recipes.

```sql
-- Inventory Item
InventoryItem { id: "tea-001", name: "Assam Tea", unit: MILLILITER }

-- MenuItem (single item, no duplication)
MenuItem { id: "item-001", name: "Assam Milk Tea", isCombo: false }

-- Variants (Store-Scoped)
Variant { id: "var-m", storeId: "store-123", code: "size_m_x7y9", name: "Medium", category: "SIZE" }
Variant { id: "var-l", storeId: "store-123", code: "size_l_k3m5", name: "Large", category: "SIZE" }

-- Size Customization
MenuItemCustomization { 
  id: "cust-size", 
  menuItemId: "item-001", 
  name: "Size",
  type: SINGLE_CHOICE 
}

-- Size Options with Variant FKs
CustomizationOption { 
  id: "opt-m", 
  customizationId: "cust-size",
  name: "Medium",
  variantId: "var-m",  ← FK to Variant table
  priceDelta: 0
}

CustomizationOption { 
  id: "opt-l", 
  customizationId: "cust-size",
  name: "Large",
  variantId: "var-l",  ← FK to Variant table
  priceDelta: 50  // +$0.50
}

-- Recipes (Effect)
Recipe {
  id: "recipe-m",
  menuItemId: "item-001",
  inventoryItemId: "tea-001",
  quantityRequired: 500
}

Recipe {
  id: "recipe-l",
  menuItemId: "item-001",
  inventoryItemId: "tea-001",
  quantityRequired: 700
}

-- Recipe Conditions (Cause) - Defines WHEN recipes execute
RecipeCondition {
  id: "rc-1",
  recipeId: "recipe-m",
  variantId: "var-m"  ← Only executes when Medium is selected
}

RecipeCondition {
  id: "rc-2",
  recipeId: "recipe-l",
  variantId: "var-l"  ← Only executes when Large is selected
}
```

*Execution*:
- Customer selects "Large" → `variantContext = {"var-l"}`
- System evaluates recipes:
  - recipe-m has condition var-m (not in context) → Skip
  - recipe-l has condition var-l (in context) → Execute
- Deduct: 700ml Assam Tea
- **Result**: No need to create separate "Large Tea" and "Medium Tea" items! ✅

---

**Scenario 2: Removable Ingredients (可移除配料)**

*Problem*: Default includes green onion, but customer can remove it. Should not deduct inventory if removed.

*Solution*: Use `isDefault` flag + Base Recipe with NO conditions for default option.

```sql
-- Inventory Item
InventoryItem { id: "onion-001", name: "Green Onion", unit: GRAM }

-- MenuItem
MenuItem { id: "item-noodle", name: "Beef Noodles", isCombo: false }

-- Customization
MenuItemCustomization { 
  id: "cust-onion", 
  menuItemId: "item-noodle",
  name: "Green Onion",
  type: SINGLE_CHOICE 
}

-- Variant for "with onion" state
Variant { id: "var-onion", storeId: "store-123", code: "onion_yes_a1b2", name: "With Onion", category: "INGREDIENT" }

-- Default Option (with onion, has variant)
CustomizationOption { 
  id: "opt-standard", 
  customizationId: "cust-onion",
  name: "Standard",
  variantId: "var-onion",  ← FK to variant
  isDefault: true,  ← Default option
  priceDelta: 0
}

-- Removal Option (no variant, no recipe)
CustomizationOption { 
  id: "opt-no", 
  customizationId: "cust-onion",
  name: "No Green Onion",
  variantId: null,  ← No variant = no recipe triggers
  isDefault: false,
  priceDelta: 0
}

-- Recipe (Effect) - always tied to the menu item
Recipe {
  id: "recipe-onion",
  menuItemId: "item-noodle",
  inventoryItemId: "onion-001",
  quantityRequired: 5  // 5g
}

-- Recipe Condition (Cause) - only when "with onion" is selected
RecipeCondition {
  id: "rc-onion",
  recipeId: "recipe-onion",
  variantId: "var-onion"  ← Only executes when Standard is selected
}
```

*Execution*:
- Customer selects "No Green Onion" → `variantContext = {}` (empty, no variant)
- System evaluates recipe-onion:
  - Has condition var-onion (not in context) → Skip
- No inventory deduction
- **Result**: Removal options don't consume inventory! ✅

---

**Scenario 3: Multi-Dimensional Variants with Composite AND Conditions (多维度变体组合)**

*Problem*: "Size L needs 700ml tea, Size M needs 500ml; Tea Type Green = green tea inventory, Tea Type Black = black tea inventory"

*Solution*: Composite RecipeConditions with AND logic.

```sql
-- Inventory Items (different tea types)
InventoryItem { id: "green-tea", name: "Green Tea", unit: MILLILITER }
InventoryItem { id: "black-tea", name: "Black Tea", unit: MILLILITER }

-- MenuItem
MenuItem { id: "item-tea", name: "Milk Tea", isCombo: false }

-- Variants
Variant { id: "var-m", storeId: "store-123", code: "size_m_x7y9", name: "Medium", category: "SIZE" }
Variant { id: "var-l", storeId: "store-123", code: "size_l_k3m5", name: "Large", category: "SIZE" }
Variant { id: "var-green", storeId: "store-123", code: "tea_green_p2q4", name: "Green Tea", category: "TEA_TYPE" }
Variant { id: "var-black", storeId: "store-123", code: "tea_black_r6s8", name: "Black Tea", category: "TEA_TYPE" }

-- Dimension 1: Size
MenuItemCustomization { 
  id: "cust-size", 
  menuItemId: "item-tea",
  name: "Size",
  type: SINGLE_CHOICE 
}

CustomizationOption { id: "opt-m", customizationId: "cust-size", name: "Medium", variantId: "var-m", priceDelta: 0 }
CustomizationOption { id: "opt-l", customizationId: "cust-size", name: "Large", variantId: "var-l", priceDelta: 50 }

-- Dimension 2: Tea Type
MenuItemCustomization { 
  id: "cust-tea", 
  menuItemId: "item-tea",
  name: "Tea Type",
  type: SINGLE_CHOICE 
}

CustomizationOption { id: "opt-green", customizationId: "cust-tea", name: "Green Tea", variantId: "var-green", isDefault: true }
CustomizationOption { id: "opt-black", customizationId: "cust-tea", name: "Black Tea", variantId: "var-black", priceDelta: 0 }

-- Recipes (Effect) - 4 recipes for 4 combinations
Recipe { id: "recipe-gm", menuItemId: "item-tea", inventoryItemId: "green-tea", quantityRequired: 500 }
Recipe { id: "recipe-gl", menuItemId: "item-tea", inventoryItemId: "green-tea", quantityRequired: 700 }
Recipe { id: "recipe-bm", menuItemId: "item-tea", inventoryItemId: "black-tea", quantityRequired: 500 }
Recipe { id: "recipe-bl", menuItemId: "item-tea", inventoryItemId: "black-tea", quantityRequired: 700 }

-- Recipe Conditions (Cause) - Composite AND logic
-- Green Medium: Requires BOTH var-green AND var-m
RecipeCondition { id: "rc-gm-1", recipeId: "recipe-gm", variantId: "var-green" }
RecipeCondition { id: "rc-gm-2", recipeId: "recipe-gm", variantId: "var-m" }

-- Green Large: Requires BOTH var-green AND var-l
RecipeCondition { id: "rc-gl-1", recipeId: "recipe-gl", variantId: "var-green" }
RecipeCondition { id: "rc-gl-2", recipeId: "recipe-gl", variantId: "var-l" }

-- Black Medium: Requires BOTH var-black AND var-m
RecipeCondition { id: "rc-bm-1", recipeId: "recipe-bm", variantId: "var-black" }
RecipeCondition { id: "rc-bm-2", recipeId: "recipe-bm", variantId: "var-m" }

-- Black Large: Requires BOTH var-black AND var-l
RecipeCondition { id: "rc-bl-1", recipeId: "recipe-bl", variantId: "var-black" }
RecipeCondition { id: "rc-bl-2", recipeId: "recipe-bl", variantId: "var-l" }
```

*Execution Example 1*:
- Customer selects: Medium + Green Tea
- `variantContext = {"var-m", "var-green"}`
- System evaluates all 4 recipes:
  - recipe-gm: conditions {var-green, var-m} - ALL in context → ✅ Execute
  - recipe-gl: conditions {var-green, var-l} - var-l NOT in context → ❌ Skip
  - recipe-bm: conditions {var-black, var-m} - var-black NOT in context → ❌ Skip
  - recipe-bl: conditions {var-black, var-l} - var-black NOT in context → ❌ Skip
- Deduct: 500ml Green Tea ✅

*Execution Example 2*:
- Customer selects: Large + Black Tea
- `variantContext = {"var-l", "var-black"}`
- System evaluates all 4 recipes:
  - recipe-gm: conditions {var-green, var-m} - NEITHER in context → ❌ Skip
  - recipe-gl: conditions {var-green, var-l} - var-green NOT in context → ❌ Skip
  - recipe-bm: conditions {var-black, var-m} - var-m NOT in context → ❌ Skip
  - recipe-bl: conditions {var-black, var-l} - ALL in context → ✅ Execute
- Deduct: 700ml Black Tea ✅

*Key Insight*:
- Each recipe has **2 conditions** (composite AND logic)
- ALL conditions must be met for recipe to execute
- **No need for 4 separate menu items** (Medium Green, Large Green, Medium Black, Large Black)!
- Total recipes needed: **4** (2 dimensions × 2 options = 2² combinations)
- If 3 dimensions: **8 recipes** (2³ combinations)

---

### Data Types & Precision

21. **Enums**: Use PostgreSQL enums via Drizzle's `pgEnum` for type safety (OrderStatus, PaymentMethod, CustomizationType, InventoryUnit, InventoryChangeType, etc.)
22. **Timestamps**: Use `timestamp('column', { mode: 'string', withTimezone: true })` for timezone-aware timestamps
23. **UUIDs**: Use `uuid('id').defaultRandom()` for proper UUID generation in PostgreSQL
24. **Decimal Precision**: 
    - Monetary values: `decimal('price', { precision: 10, scale: 2 })` (e.g., $12.99)
    - Inventory quantities: `decimal('quantity', { precision: 10, scale: 3 })` (e.g., 150.5g, 700.25ml)
    - Cost per unit: `decimal('cost', { precision: 10, scale: 4 })` (for precise cost tracking)

### Display & Ordering

25. **Display Order**: Respect `displayOrder` fields when rendering:
    - Customizations
    - CustomizationOptions
    - ComboGroups
    - ComboGroupItems

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|------|
| 1.0 | 2025-12-21 | Simon Chou | Initial Baseline (Scope: v0.2.0 MVP + Inventory + POS) |

### Version 1.3 (December 20, 2025)
- **Major Refactoring**: Replaced magic string `variantKey`/`requiredVariant` with strict Foreign Key relationships
- Added `variants` master table for centralized variant definitions
- Modified `customization_options`: Removed `variantKey` (varchar), added `variantId` (UUID FK)
- Modified `recipes`: Removed `requiredVariant` (varchar), added `requiredVariantId` (UUID FK)
- Updated indexes to use new ID columns
- Enhanced data integrity with referential constraints (prevents typos and invalid variant references)
- Updated Entity Relationship Diagram to reflect new Variant entity

### Version 1.2 (December 18, 2025)
- Added multi-tenant inventory isolation (`storeId` on `inventory_items`)
- Added financial snapshots (`priceAtOrder`, `costAtOrder` on `order_items`)
- Added Recipe CHECK constraint (mutual exclusivity: menuItemId XOR modifierOptionId)
- Refactored combo structure to self-referencing pattern (added `OrderItemType` enum, `parentOrderItemId`)
- Updated AI Implementation Notes with Variable Base Recipe support

### Version 1.1 (December 17, 2025)
- Initial Prisma → Drizzle ORM migration
- Established recipe-driven inventory architecture
- Added variant matching logic (context-based recipe execution)

### Version 1.0 (December 16, 2025)
- Initial database schema specification
