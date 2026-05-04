# Database Spec — My Online Ordering System
> Single source of truth for schema and DB rules. All implementations MUST comply.
> Full detail: [DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md)

---

## Infrastructure Constraints

- **DB**: PostgreSQL 15.x on RDS db.t3.micro, max 87 connections
- **ORM**: Drizzle ORM 0.30.x, schema file: `src/db/schema.ts`
- **Connection pool**: max 10 per Lambda instance
- **Lambda concurrency limit**: 50 reserved executions (prevents connection exhaustion)
- **Monetary values**: stored as **integer (cents)** — e.g., 1299 = $12.99
- **Inventory quantities**: `decimal(10,3)` — e.g., 150.5g
- **Soft delete**: use `isDeleted` flag, never hard delete menu items
- **Multi-tenant**: every table with store data MUST include `storeId`
- **Transactions**: use `db.transaction()` for multi-table operations

---

## Redis Cache Keys

| Key | TTL | Invalidate On |
|-----|-----|---------------|
| `menu:{storeId}` | 5 min | Menu item update/delete |
| `store:{storeId}` | 10 min | Store config update |
| `user:{userId}` | 15 min | User profile update |
| `lock:inventory:{inventoryItemId}` | 10 min | Reservation commit/release |
| `recipe:cache:{menuItemId}` | 30 min | Recipe change |
| `ws:connection:{userId}` | Active session | Disconnect |
| `idempotency:{key}` | 24 hours | — |
| `rate:{ip}:{endpoint}` | 1 min | — |

---

## Complete Drizzle Schema

```typescript
// src/db/schema.ts
// Run first: CREATE EXTENSION IF NOT EXISTS pg_trgm;

import {
  pgTable, uuid, varchar, text, decimal, boolean, integer,
  timestamp, jsonb, pgEnum, index, uniqueIndex, doublePrecision
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';

// ── ENUMS ─────────────────────────────────────────────────────────────────────

export const customizationType    = pgEnum('CustomizationType', ['SINGLE_CHOICE', 'MULTIPLE_CHOICE']);
export const inventoryUnit        = pgEnum('InventoryUnit', ['GRAM', 'MILLILITER', 'PIECE', 'KILOGRAM', 'LITER']);
export const inventoryChangeType  = pgEnum('InventoryChangeType', ['MANUAL_ADJUSTMENT', 'ORDER_DEDUCTION', 'RESERVATION', 'RELEASE', 'RESTOCK', 'EXPIRATION', 'RETURN']);
export const staffRole            = pgEnum('StaffRole', ['CASHIER', 'LEAD', 'MANAGER', 'MERCHANT']);
export const orderSource          = pgEnum('OrderSource', ['USER_CLIENT', 'KIOSK', 'POS']);
export const orderType            = pgEnum('OrderType', ['DINE_IN', 'TAKEOUT']);
export const orderStatus          = pgEnum('OrderStatus', ['PENDING', 'PAID', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED', 'REJECTED']);
export const orderItemType        = pgEnum('OrderItemType', ['REGULAR', 'COMBO_PARENT', 'COMBO_CHILD']);
export const paymentMethod        = pgEnum('PaymentMethod', ['CARD', 'CASH', 'LINEPAY', 'APPLE_PAY', 'GOOGLE_PAY']);
export const paymentStatus        = pgEnum('PaymentStatus', ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED']);
export const deviceType           = pgEnum('DeviceType', ['RECEIPT_PRINTER', 'KITCHEN_LABEL_PRINTER', 'CARD_READER', 'CASH_DRAWER', 'QR_SCANNER', 'KDS_DISPLAY']);
export const deviceStatus         = pgEnum('DeviceStatus', ['ONLINE', 'OFFLINE', 'ERROR']);
export const printJobType         = pgEnum('PrintJobType', ['RECEIPT', 'KITCHEN_LABEL', 'REPORT']);
export const printJobStatus       = pgEnum('PrintJobStatus', ['QUEUED', 'PRINTING', 'COMPLETED', 'FAILED']);
export const notificationChannel  = pgEnum('NotificationChannel', ['EMAIL', 'SMS', 'PUSH', 'WEBSOCKET']);
export const notificationStatus   = pgEnum('NotificationStatus', ['PENDING', 'SENT', 'FAILED']);
export const refundStatus         = pgEnum('RefundStatus', ['PENDING', 'REFUNDED', 'FAILED']);
export const userRole             = pgEnum('UserRole', ['USER', 'CASHIER', 'LEAD', 'MANAGER', 'MERCHANT', 'ADMIN']);

// ── STORES ────────────────────────────────────────────────────────────────────

export const stores = pgTable('stores', {
  id:              uuid('id').primaryKey().defaultRandom(),
  name:            varchar('name', { length: 255 }).notNull(),
  description:     text('description'),
  address:         text('address').notNull(),
  phone:           varchar('phone', { length: 50 }).notNull(),
  email:           varchar('email', { length: 255 }).notNull(),
  // Interface: [{ day: "monday", open: "10:00", close: "22:00", isOpen: true }]
  businessHours:   jsonb('businessHours').notNull(),
  isOpen:          boolean('isOpen').default(true).notNull(),
  acceptingOrders: boolean('acceptingOrders').default(true).notNull(),
  imageUrl:        varchar('imageUrl', { length: 500 }),
  rating:          doublePrecision('rating').default(0),
  totalReviews:    integer('totalReviews').default(0).notNull(),
  createdAt:       timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:       timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  statusIdx: index('idx_stores_status').on(table.isOpen, table.acceptingOrders)
}));

// ── USERS ─────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id:            uuid('id').primaryKey().notNull(), // Cognito Sub ID
  email:         varchar('email', { length: 255 }).notNull().unique(),
  name:          varchar('name', { length: 255 }).notNull(),
  phone:         varchar('phone', { length: 50 }),
  emailVerified: boolean('emailVerified').default(false).notNull(),
  phoneVerified: boolean('phoneVerified').default(false).notNull(),
  imageUrl:      varchar('imageUrl', { length: 500 }),
  // Global role. Store-specific roles are in store_staff.
  globalRole:    userRole('globalRole').notNull().default('USER'),
  createdAt:     timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:     timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  globalRoleIdx: index('idx_users_global_role').on(table.globalRole)
}));

export const userProfiles = pgTable('user_profiles', {
  userId:      uuid('userId').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  // Interface: { notifications: { email: bool, sms: bool, push: bool }, language: 'en' }
  preferences: jsonb('preferences'),
  createdAt:   timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:   timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
});

// ── MENU ──────────────────────────────────────────────────────────────────────

export const menuCategories = pgTable('menu_categories', {
  id:           uuid('id').primaryKey().defaultRandom(),
  storeId:      uuid('storeId').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  name:         varchar('name', { length: 255 }).notNull(),
  description:  text('description'),
  displayOrder: integer('displayOrder').default(0).notNull(),
  isActive:     boolean('isActive').default(true).notNull(),
  createdAt:    timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:    timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  storeOrderIdx: index('idx_menu_categories_store_order').on(table.storeId, table.displayOrder)
}));

export const menuItems = pgTable('menu_items', {
  id:           uuid('id').primaryKey().defaultRandom(),
  storeId:      uuid('storeId').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  categoryId:   uuid('categoryId').notNull().references(() => menuCategories.id, { onDelete: 'cascade' }),
  name:         varchar('name', { length: 255 }).notNull(),
  description:  text('description'),
  price:        integer('price').notNull(), // cents
  imageUrl:     varchar('imageUrl', { length: 500 }),
  isCombo:      boolean('isCombo').default(false).notNull(),
  isAvailable:  boolean('isAvailable').default(true).notNull(),
  isDeleted:    boolean('isDeleted').default(false).notNull(),
  allergens:    varchar('allergens', { length: 255 }).array(),
  tags:         varchar('tags', { length: 100 }).array(),
  createdAt:    timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:    timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  storeCategoryIdx: index('idx_menu_items_store_category').on(table.storeId, table.categoryId, table.isAvailable),
  availabilityIdx:  index('idx_menu_items_availability').on(table.isAvailable, table.isDeleted),
  storeComboIdx:    index('idx_menu_items_store_combo').on(table.storeId, table.isCombo)
}));

export const menuItemCustomizations = pgTable('menu_item_customizations', {
  id:            uuid('id').primaryKey().defaultRandom(),
  menuItemId:    uuid('menuItemId').notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
  name:          varchar('name', { length: 255 }).notNull(),
  type:          customizationType('type').notNull(),
  required:      boolean('required').default(false).notNull(),
  displayOrder:  integer('displayOrder').default(0).notNull(),
  minSelections: integer('minSelections'),
  maxSelections: integer('maxSelections'),
  createdAt:     timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:     timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  itemOrderIdx: index('idx_customizations_item_order').on(table.menuItemId, table.displayOrder)
}));

export const comboGroups = pgTable('combo_groups', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  menuItemId:          uuid('menuItemId').notNull().references(() => menuItems.id, { onDelete: 'cascade' }), // isCombo=true
  name:                varchar('name', { length: 255 }).notNull(),
  description:         text('description'),
  required:            boolean('required').default(true).notNull(),
  allowRepeatedItems:  boolean('allowRepeatedItems').default(true).notNull(),
  minSelections:       integer('minSelections').default(1).notNull(),
  maxSelections:       integer('maxSelections').default(1).notNull(),
  displayOrder:        integer('displayOrder').default(0).notNull(),
  createdAt:           timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:           timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  itemOrderIdx: index('idx_combo_groups_item_order').on(table.menuItemId, table.displayOrder)
}));

export const comboGroupItems = pgTable('combo_group_items', {
  id:           uuid('id').primaryKey().defaultRandom(),
  comboGroupId: uuid('comboGroupId').notNull().references(() => comboGroups.id, { onDelete: 'cascade' }),
  menuItemId:   uuid('menuItemId').notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
  isDefault:    boolean('isDefault').default(false).notNull(),
  priceDelta:   integer('priceDelta').default(0).notNull(), // cents, upgrade/downgrade
  displayOrder: integer('displayOrder').default(0).notNull(),
  createdAt:    timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:    timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  uniqueComboGroupItem: uniqueIndex('unique_combo_group_item').on(table.comboGroupId, table.menuItemId),
  orderIdx:             index('idx_combo_group_items_order').on(table.comboGroupId, table.displayOrder),
  menuItemIdx:          index('idx_combo_group_items_menu_item').on(table.menuItemId)
}));

// ── VARIANTS (Store-Scoped) ───────────────────────────────────────────────────
// RULES:
// - Every variant MUST belong to a store (storeId NOT NULL, no global variants)
// - `code` is auto-generated by backend, hidden from users (e.g. "size_large_abc123")
// - `name` is the user-facing display name
// - Seeded when a new store is created from templates
// - isActive=false variants MUST NOT trigger inventory deductions

export const variants = pgTable('variants', {
  id:           uuid('id').primaryKey().defaultRandom(),
  storeId:      uuid('storeId').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  code:         varchar('code', { length: 100 }).notNull(),
  name:         varchar('name', { length: 255 }).notNull(),
  category:     varchar('category', { length: 100 }),
  displayOrder: integer('displayOrder').default(0).notNull(),
  isActive:     boolean('isActive').default(true).notNull(),
  createdAt:    timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:    timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  uniqueStoreCode: uniqueIndex('unique_variants_store_code').on(table.storeId, table.code),
  categoryIdx:     index('idx_variants_category').on(table.category)
}));

export const customizationOptions = pgTable('customization_options', {
  id:               uuid('id').primaryKey().defaultRandom(),
  customizationId:  uuid('customizationId').notNull().references(() => menuItemCustomizations.id, { onDelete: 'cascade' }),
  name:             varchar('name', { length: 255 }).notNull(),
  priceDelta:       integer('priceDelta').default(0).notNull(), // cents
  variantId:        uuid('variantId').references(() => variants.id, { onDelete: 'set null' }), // nullable
  isDefault:        boolean('isDefault').default(false).notNull(),
  isAvailable:      boolean('isAvailable').default(true).notNull(),
  displayOrder:     integer('displayOrder').default(0).notNull(),
  createdAt:        timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:        timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  orderIdx:   index('idx_customization_options_order').on(table.customizationId, table.displayOrder),
  variantIdx: index('idx_customization_options_variant').on(table.variantId)
}));

// ── INVENTORY ─────────────────────────────────────────────────────────────────

export const inventoryItems = pgTable('inventory_items', {
  id:            uuid('id').primaryKey().defaultRandom(),
  storeId:       uuid('storeId').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  name:          varchar('name', { length: 255 }).notNull(),
  description:   text('description'),
  sku:           varchar('sku', { length: 100 }),
  unit:          inventoryUnit('unit').notNull(),
  currentStock:  decimal('currentStock', { precision: 10, scale: 3 }).default('0').notNull(),
  reservedStock: decimal('reservedStock', { precision: 10, scale: 3 }).default('0').notNull(),
  minStock:      decimal('minStock', { precision: 10, scale: 3 }).default('0').notNull(),
  costPerUnit:   decimal('costPerUnit', { precision: 10, scale: 4 }),
  supplier:      varchar('supplier', { length: 255 }),
  lastRestocked: timestamp('lastRestocked', { withTimezone: true }),
  createdAt:     timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:     timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  stockIdx:       index('idx_inventory_items_stock').on(table.currentStock),
  skuIdx:         index('idx_inventory_items_sku').on(table.sku),
  uniqueStoreSku: uniqueIndex('unique_store_sku').on(table.storeId, table.sku)
}));

// ── RECIPES ───────────────────────────────────────────────────────────────────
// recipes = EFFECT (what to deduct)
// recipe_conditions = CAUSE (when to trigger)
//
// RULES:
// - menuItemId NULL  → global recipe (any item with matching conditions)
// - menuItemId SET   → scoped to that menu item only
// - 0 conditions     → Base Recipe (always executes)
// - 1+ conditions    → Conditional Recipe (ALL must match — AND logic)
// - Variant matching: variantId from selected CustomizationOption → RecipeCondition.variantId

export const recipes = pgTable('recipes', {
  id:                uuid('id').primaryKey().defaultRandom(),
  storeId:           uuid('storeId').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  menuItemId:        uuid('menuItemId').references(() => menuItems.id, { onDelete: 'cascade' }),
  inventoryItemId:   uuid('inventoryItemId').notNull().references(() => inventoryItems.id, { onDelete: 'cascade' }),
  quantityRequired:  decimal('quantityRequired', { precision: 10, scale: 3 }).notNull(),
  notes:             text('notes'),
  createdAt:         timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:         timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  storeMenuIdx:      index('idx_recipes_store_menu').on(table.storeId, table.menuItemId),
  menuItemIdx:       index('idx_recipes_menu_item').on(table.menuItemId),
  inventoryItemIdx:  index('idx_recipes_inventory_item').on(table.inventoryItemId)
}));

export const recipeConditions = pgTable('recipe_conditions', {
  id:        uuid('id').primaryKey().defaultRandom(),
  recipeId:  uuid('recipeId').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  variantId: uuid('variantId').notNull().references(() => variants.id, { onDelete: 'restrict' }), // RESTRICT prevents variant deletion if used
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  recipeIdx:           index('idx_recipe_conditions_recipe').on(table.recipeId),
  variantIdx:          index('idx_recipe_conditions_variant').on(table.variantId),
  uniqueRecipeVariant: uniqueIndex('unique_recipe_condition').on(table.recipeId, table.variantId)
}));

export const inventoryLogs = pgTable('inventory_logs', {
  id:               uuid('id').primaryKey().defaultRandom(),
  inventoryItemId:  uuid('inventoryItemId').notNull().references(() => inventoryItems.id, { onDelete: 'cascade' }),
  changeType:       inventoryChangeType('changeType').notNull(),
  quantityChange:   decimal('quantityChange', { precision: 10, scale: 3 }).notNull(), // negative for deductions
  stockBefore:      decimal('stockBefore', { precision: 10, scale: 3 }).notNull(),
  stockAfter:       decimal('stockAfter', { precision: 10, scale: 3 }).notNull(),
  reason:           text('reason'),
  userId:           uuid('userId'),
  orderId:          uuid('orderId'),
  createdAt:        timestamp('createdAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  itemDateIdx: index('idx_inventory_logs_item_date').on(table.inventoryItemId, table.createdAt),
  typeIdx:     index('idx_inventory_logs_type').on(table.changeType)
}));

// ── ORDERS ────────────────────────────────────────────────────────────────────

export const orders = pgTable('orders', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  orderNumber:         varchar('orderNumber', { length: 50 }).notNull().unique(), // NanoID hash
  storeId:             uuid('storeId').notNull().references(() => stores.id, { onDelete: 'restrict' }),
  userId:              uuid('userId').notNull(),
  orderSource:         orderSource('orderSource').notNull(),
  orderType:           orderType('orderType').notNull(),
  status:              orderStatus('status').notNull().default('PENDING'),
  subtotal:            integer('subtotal').notNull(), // cents
  tax:                 integer('tax').notNull(), // cents
  discount:            integer('discount').notNull().default(0), // cents (manual POS override for v0.2.0)
  discountReason:      text('discountReason'),
  total:               integer('total').notNull(), // cents
  scheduledPickupTime: timestamp('scheduledPickupTime', { withTimezone: true }),
  notes:               text('notes'),
  cancelReason:        text('cancelReason'),
  cancelledAt:         timestamp('cancelledAt', { withTimezone: true }),
  cancelledBy:         uuid('cancelledBy'),
  createdAt:           timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:           timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userDateIdx:          index('idx_orders_user_date').on(table.userId, table.createdAt),
  storeStatusDateIdx:   index('idx_orders_store_status_date').on(table.storeId, table.status, table.createdAt)
}));

export const orderStatusHistory = pgTable('order_status_history', {
  id:             uuid('id').primaryKey().defaultRandom(),
  storeId:        uuid('storeId').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  orderId:        uuid('orderId').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  status:         orderStatus('status').notNull(),
  previousStatus: orderStatus('previousStatus'),
  changedBy:      uuid('changedBy'),
  reason:         text('reason'),
  createdAt:      timestamp('createdAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  storeIdx:  index('idx_order_status_history_store').on(table.storeId, table.createdAt),
  orderIdx:  index('idx_order_status_history_order').on(table.orderId, table.createdAt),
  statusIdx: index('idx_order_status_history_status').on(table.status)
}));

export const orderItems = pgTable('order_items', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  orderId:             uuid('orderId').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  menuItemId:          uuid('menuItemId').notNull(),
  itemName:            varchar('itemName', { length: 255 }).notNull(),
  itemType:            orderItemType('itemType').notNull().default('REGULAR'),
  parentOrderItemId:   uuid('parentOrderItemId').references(() => orderItems.id, { onDelete: 'cascade' }),
  quantity:            integer('quantity').notNull(),
  unitPrice:           integer('unitPrice').notNull(), // cents
  subtotal:            integer('subtotal').notNull(), // cents
  priceAtOrder:        integer('priceAtOrder').notNull(), // SNAPSHOT: price + modifier deltas at order time
  costAtOrder:         integer('costAtOrder').notNull(),  // SNAPSHOT: COGS from Recipe × costPerUnit at order time
  // Interface: Array<{ customizationId, name, type, selectedOptions: [{ id, name, priceDelta, variantId? }] }>
  customizations:      jsonb('customizations'),
  specialInstructions: text('specialInstructions'),
  createdAt:           timestamp('createdAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  orderIdx:    index('idx_order_items_order').on(table.orderId),
  menuItemIdx: index('idx_order_items_menu_item').on(table.menuItemId),
  parentIdx:   index('idx_order_items_parent').on(table.parentOrderItemId),
  typeIdx:     index('idx_order_items_type').on(table.itemType)
}));

// ── PAYMENTS ──────────────────────────────────────────────────────────────────

export const payments = pgTable('payments', {
  id:                    uuid('id').primaryKey().defaultRandom(),
  orderId:               uuid('orderId').notNull().references(() => orders.id, { onDelete: 'restrict' }),
  amount:                integer('amount').notNull(), // cents
  currency:              varchar('currency', { length: 3 }).notNull().default('TWD'),
  method:                paymentMethod('method').notNull(),
  status:                paymentStatus('status').notNull().default('PENDING'),
  providerTransactionId: varchar('providerTransactionId', { length: 255 }),
  // Interface: { cashReceived?, changeGiven?, cardLast4?, cardBrand?, terminalId? }
  metadata:              jsonb('metadata'),
  paidAt:                timestamp('paidAt', { withTimezone: true }),
  createdAt:             timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:             timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  orderIdx:    index('idx_payments_order').on(table.orderId),
  statusIdx:   index('idx_payments_status').on(table.status),
  providerIdx: index('idx_payments_provider').on(table.providerTransactionId),
  createdAtIdx: index('idx_payments_created_at').on(table.createdAt)
}));

export const refunds = pgTable('refunds', {
  id:               uuid('id').primaryKey().defaultRandom(),
  paymentId:        uuid('paymentId').notNull().references(() => payments.id, { onDelete: 'restrict' }),
  amount:           integer('amount').notNull(), // cents
  currency:         varchar('currency', { length: 3 }).notNull().default('TWD'),
  reason:           text('reason'),
  status:           refundStatus('status').notNull().default('PENDING'),
  providerRefundId: varchar('providerRefundId', { length: 255 }),
  processedAt:      timestamp('processedAt', { withTimezone: true }),
  createdAt:        timestamp('createdAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  paymentIdx: index('idx_refunds_payment').on(table.paymentId),
  statusIdx:  index('idx_refunds_status').on(table.status)
}));

// ── DEVICES ───────────────────────────────────────────────────────────────────

export const devices = pgTable('devices', {
  id:              uuid('id').primaryKey().defaultRandom(),
  storeId:         uuid('storeId').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  name:            varchar('name', { length: 255 }).notNull(),
  type:            deviceType('type').notNull(),
  status:          deviceStatus('status').notNull().default('OFFLINE'),
  ipAddress:       varchar('ipAddress', { length: 45 }),
  macAddress:      varchar('macAddress', { length: 17 }),
  serialNumber:    varchar('serialNumber', { length: 100 }),
  firmwareVersion: varchar('firmwareVersion', { length: 50 }),
  // Interface: { model?, manufacturer?, capabilities?: string[], config?: Record<string, any> }
  metadata:        jsonb('metadata'),
  lastSeen:        timestamp('lastSeen', { withTimezone: true }),
  createdAt:       timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:       timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  storeTypeIdx: index('idx_devices_store_type').on(table.storeId, table.type),
  statusIdx:    index('idx_devices_status').on(table.status),
  lastSeenIdx:  index('idx_devices_last_seen').on(table.lastSeen)
}));

export const printJobs = pgTable('print_jobs', {
  id:           uuid('id').primaryKey().defaultRandom(),
  deviceId:     uuid('deviceId').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  orderId:      uuid('orderId').references(() => orders.id, { onDelete: 'set null' }),
  type:         printJobType('type').notNull(),
  status:       printJobStatus('status').notNull().default('QUEUED'),
  // Interface: { orderNumber?, items?, totalAmount?, customerInfo?, template? }
  content:      jsonb('content').notNull(),
  retryCount:   integer('retryCount').notNull().default(0),
  errorMessage: text('errorMessage'),
  queuedAt:     timestamp('queuedAt', { withTimezone: true }).defaultNow().notNull(),
  startedAt:    timestamp('startedAt', { withTimezone: true }),
  completedAt:  timestamp('completedAt', { withTimezone: true })
}, (table) => ({
  deviceStatusIdx: index('idx_print_jobs_device_status').on(table.deviceId, table.status),
  orderIdx:        index('idx_print_jobs_order').on(table.orderId),
  queuedAtIdx:     index('idx_print_jobs_queued_at').on(table.queuedAt)
}));

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────

export const notifications = pgTable('notifications', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:      varchar('type', { length: 100 }).notNull(), // ORDER_CONFIRMATION, ORDER_READY, etc.
  channel:   notificationChannel('channel').notNull(),
  status:    notificationStatus('status').notNull().default('PENDING'),
  recipient: varchar('recipient', { length: 255 }).notNull(), // email/phone/token/connectionId
  subject:   varchar('subject', { length: 255 }),
  message:   text('message').notNull(),
  // Interface: { orderId?, storeId?, actionUrl?, priority?: 'high'|'normal', templateId? }
  metadata:  jsonb('metadata'),
  sentAt:    timestamp('sentAt', { withTimezone: true }),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userTypeIdx:  index('idx_notifications_user_type').on(table.userId, table.type),
  statusIdx:    index('idx_notifications_status').on(table.status),
  createdAtIdx: index('idx_notifications_created_at').on(table.createdAt)
}));

// ── STORE STAFF ───────────────────────────────────────────────────────────────

export const storeStaff = pgTable('store_staff', {
  id:           uuid('id').primaryKey().defaultRandom(),
  storeId:      uuid('storeId').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  userId:       uuid('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role:         staffRole('role').notNull(),
  isActive:     boolean('isActive').notNull().default(true),
  hiredAt:      timestamp('hiredAt', { withTimezone: true }).defaultNow().notNull(),
  terminatedAt: timestamp('terminatedAt', { withTimezone: true }),
  createdAt:    timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:    timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  storeUserIdx: uniqueIndex('unique_store_staff_user').on(table.storeId, table.userId),
  storeRoleIdx: index('idx_store_staff_store_role').on(table.storeId, table.role),
  userIdx:      index('idx_store_staff_user').on(table.userId),
  activeIdx:    index('idx_store_staff_active').on(table.isActive)
}));

// CRM tables (loyalty, coupons, tiers): OUT OF SCOPE for v0.2.0
// Extensibility: orders.discount / orders.discountReason are hooks for future coupon integration
// Platform integration (UberEats, Foodpanda): OUT OF SCOPE for v0.2.0
// Extensibility: orderSource enum can be extended
```

---

## Critical Business Logic

### Combo Order Structure
- `COMBO_PARENT`: Price container — does **NOT** consume inventory
- `COMBO_CHILD`: Actual component — **DOES** consume inventory (linked via `parentOrderItemId`)
- Each `ComboGroup` MUST have exactly one item with `isDefault: true`

```typescript
// Inventory deduction loop — SKIP COMBO_PARENT
for (const item of orderItems) {
  if (item.itemType === 'COMBO_PARENT') continue;
  const recipes = await compileRecipes(storeId, item.menuItemId, variantContext);
  await deductInventory(recipes, item.quantity);
}
```

### Recipe Evaluation (AND Logic)
```typescript
async function compileRecipes(storeId: string, menuItemId: string, variantContext: Set<string>) {
  const allRecipes = await db.query.recipes.findMany({
    where: and(
      eq(recipes.storeId, storeId),
      or(eq(recipes.menuItemId, menuItemId), isNull(recipes.menuItemId))
    ),
    with: { conditions: true }
  });

  return allRecipes.filter(recipe => {
    if (recipe.conditions.length === 0) return true; // Base Recipe: always executes
    return recipe.conditions.every(c => variantContext.has(c.variantId)); // AND logic
  });
}
```

### Financial Snapshots (CRITICAL)
- `orderItems.priceAtOrder` = `menuItem.price` + sum of selected `priceDelta` values — snapshot at order creation
- `orderItems.costAtOrder` = sum of `(recipe.quantityRequired × inventoryItem.costPerUnit)` — snapshot at order creation
- Never recalculate from current prices — historical reports must stay accurate

### Stock Reservation (Atomic)
```typescript
// Prevent negative stock with atomic conditional update
await tx.update(inventoryItems)
  .set({
    currentStock:  sql`${inventoryItems.currentStock} - ${qty}`,
    reservedStock: sql`${inventoryItems.reservedStock} + ${qty}`
  })
  .where(and(
    eq(inventoryItems.id, itemId),
    sql`${inventoryItems.currentStock} >= ${qty}`
  ))
  .returning({ id: inventoryItems.id });
// If result.length === 0 → throw OUT_OF_STOCK
```

### Display Order
Always sort by `displayOrder` when rendering: categories, customizations, options, comboGroups, comboGroupItems.

---

## Migration Workflow

**Tool**: `drizzle-kit` — always run from the **service directory** (e.g. `services/menu-service/`).

### `drizzle.config.ts` (place in every service root)

```typescript
// services/<service-name>/drizzle.config.ts
import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export default {
  schema:    './src/db/schema.ts',
  out:       './src/db/migrations',
  dialect:   'postgresql',
  dbCredentials: {
    host:     process.env.DATABASE_HOST!,
    port:     parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    database: process.env.DATABASE_NAME!,
    user:     process.env.DATABASE_USER!,
    password: process.env.DATABASE_PASSWORD!,
    ssl:      process.env.DATABASE_SSL === 'true',
  },
} satisfies Config;
```

### `package.json` scripts (add to every service)

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate":  "drizzle-kit migrate",
    "db:push":     "drizzle-kit push",
    "db:studio":   "drizzle-kit studio"
  }
}
```

### Commands

```bash
# 1. After changing src/db/schema.ts, generate a migration file:
npm run db:generate
# → creates src/db/migrations/<timestamp>_<name>.sql

# 2. Apply pending migrations to the target DB:
npm run db:migrate

# 3. (Dev only) Push schema directly without generating migration files:
npm run db:push

# 4. (Dev only) Open Drizzle Studio to browse/edit DB:
npm run db:studio
```

### File Layout

```text
services/<service-name>/
  drizzle.config.ts          # drizzle-kit config (reads .env.local)
  src/db/
    schema.ts                # Drizzle schema — edit this
    migrations/              # Generated SQL files — commit these, never edit manually
      0000_initial.sql
      0001_add_column.sql
      meta/
        _journal.json        # drizzle-kit internal — commit, never edit
```

**Rules**:

- Never edit generated migration files manually.
- Migration files live in `src/db/migrations/` (committed to git).
- `db:push` is for local dev only — never use on staging/prod.
- All schema changes in CI/CD: `db:generate` → commit → `db:migrate` on deploy.
