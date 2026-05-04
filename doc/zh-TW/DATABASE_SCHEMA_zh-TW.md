# 資料庫架構規格說明書

**文件版本**: 1.0 

**最後更新**: 2026年2月1日

**負責人**: Simon Chou

**狀態**: 單一真實來源（MVP + 庫存 + POS 範圍）

---

## 目的

本文件定義了使用 Drizzle ORM 與 PostgreSQL 的 **My Online Ordering System 完整資料庫架構**。它作為所有資料模型和關聯的權威契約。

**關鍵**: 這是資料庫結構的**單一真實來源**。所有實作必須遵守此規格。

**目標受眾**: 實作服務的 AI 助理、後端開發人員、資料庫管理員

---

## 目錄

1. [資料庫概覽](#資料庫概覽)
2. [Drizzle 架構](#drizzle-架構)
3. [實體關係圖](#實體關係圖)
4. [索引策略](#索引策略)
5. [遷移指南](#遷移指南)
6. [Redis 快取模式](#redis-快取模式)
7. [資料保留政策](#資料保留政策)
8. [系統架構與設計規則](#系統架構與設計規則)

---

## 資料庫概覽

### 技術堆疊

**主要資料庫**: Amazon RDS for PostgreSQL  
**執行個體類型**: db.t3.micro (2 vCPU, 1GB RAM)  
**儲存空間**: 20GB 一般用途 SSD (gp2)  
**版本**: PostgreSQL 15.x  
**ORM**: Drizzle ORM 0.30.x  
**連線管理**: Lambda 直接連線至 RDS

### 資料庫設定

```
Host: myordering-db-dev.xxx.us-west-2.rds.amazonaws.com
Port: 5432
Database: myordering
SSL: Required (rds.force_ssl = 1)
Max Connections: 87 (db.t3.micro limit) ⚠️
Network: Public Subnet (Publicly Accessible = true)
Security: Security Group allowlisting (Lambda SG + specific dev IPs)
```

**執行個體限制**:
- **最大連線數**: 87 (1GB RAM 執行個體的 PostgreSQL 限制)
- **儲存限制**: 20GB
- **可用性**: 單一可用區部署
- **擴展**: 手動升級執行個體類型

**連線池管理**:
- **應用層連線池**: 透過 Drizzle ORM（每個 Lambda 執行個體最多 10 個連線）
- **Lambda 並行限制**: 50 個保留並行執行（防止連線耗盡）
- **連線逾時**: 10 秒（在 Drizzle 客戶端設定）
- **閒置逾時**: 20 秒（關閉閒置連線以釋放連線池）

### 架構管理

**工具**: Drizzle Kit  
**遷移檔案**: `drizzle/migrations/`  
**架構檔案**: `src/db/schema.ts`

### 命名慣例

**資料表**: `snake_case`，複數形式（例如：`menu_items`、`orders`、`order_items`）  
**欄位**: `snake_case`（例如：`created_at`、`user_id`、`order_number`）  
**索引**: `idx_{table}_{column}`（例如：`idx_orders_user_id`）  
**外鍵**: `fk_{table}_{ref_table}`（例如：`fk_orders_users`）  
**唯一約束**: `unique_{table}_{column}`（例如：`unique_users_email`）

---

## Drizzle 架構

### 完整架構檔案

**注意**: 下圖展示了所有 12 個微服務的**完整資料庫架構**。所有表格均使用 Drizzle ORM TypeScript 語法完整定義，並具備完善的多租戶隔離、外鍵約束和關鍵索引。

```typescript
// src/db/schema.ts

import { pgTable, uuid, varchar, text, decimal, boolean, integer, timestamp, jsonb, pgEnum, index, uniqueIndex, doublePrecision } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';

// 啟用 pg_trgm 擴充功能以支援全文搜尋
// 執行: CREATE EXTENSION IF NOT EXISTS pg_trgm;

// ==========================================
// 列舉型別 (ENUMS)
// ==========================================

export const customizationType = pgEnum('CustomizationType', ['SINGLE_CHOICE', 'MULTIPLE_CHOICE']);
export const inventoryUnit = pgEnum('InventoryUnit', ['GRAM', 'MILLILITER', 'PIECE', 'KILOGRAM', 'LITER']);
export const inventoryChangeType = pgEnum('InventoryChangeType', ['MANUAL_ADJUSTMENT', 'ORDER_DEDUCTION', 'RESERVATION', 'RELEASE', 'RESTOCK', 'EXPIRATION', 'RETURN']);
export const staffRole = pgEnum('StaffRole', ['CASHIER', 'LEAD', 'MANAGER', 'MERCHANT']);
export const orderSource = pgEnum('OrderSource', ['USER_CLIENT', 'KIOSK', 'POS']); // 擴展性：未來版本可新增第三方平台（UBEREATS、FOODPANDA）
export const orderType = pgEnum('OrderType', ['DINE_IN', 'TAKEOUT']);
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
// 核心實體 (CORE ENTITIES)
// ==========================================

export const stores = pgTable('stores', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  address: text('address').notNull(), 
  phone: varchar('phone', { length: 50 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  // 介面: [{ day: "monday", open: "10:00", close: "22:00", isOpen: true }]
  businessHours: jsonb('businessHours').notNull(),
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
// 使用者與身分實體 (USER & IDENTITY ENTITIES)
// ==========================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().notNull(), // Cognito Sub ID（由認證服務提供，非隨機生成）
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  emailVerified: boolean('emailVerified').default(false).notNull(),
  phoneVerified: boolean('phoneVerified').default(false).notNull(),
  imageUrl: varchar('imageUrl', { length: 500 }),
  // 全域系統角色（例如：ADMIN、USER）。店家特定角色位於 store_staff。
  globalRole: userRole('globalRole').notNull().default('USER'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  globalRoleIdx: index('idx_users_global_role').on(table.globalRole)
}));

export const userProfiles = pgTable('user_profiles', {
  userId: uuid('userId').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
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
  price: integer('price').notNull(), // 價格以分為單位
  imageUrl: varchar('imageUrl', { length: 500 }),
  isCombo: boolean('isCombo').default(false).notNull(), // true 如果這是一個套餐/組合
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
  name: varchar('name', { length: 255 }).notNull(), // "尺寸", "配料", "甜度"
  type: customizationType('type').notNull(),
  required: boolean('required').default(false).notNull(),
  displayOrder: integer('displayOrder').default(0).notNull(),
  minSelections: integer('minSelections'), // 用於 multiple_choice 類型
  maxSelections: integer('maxSelections'), // 用於 multiple_choice 類型
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  itemOrderIdx: index('idx_customizations_item_order').on(table.menuItemId, table.displayOrder)
}));

export const comboGroups = pgTable('combo_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  menuItemId: uuid('menuItemId').notNull().references(() => menuItems.id, { onDelete: 'cascade' }), // 連結到 isCombo = true 的 MenuItem
  name: varchar('name', { length: 255 }).notNull(), // "主餐", "配菜", "飲料"
  description: text('description'),
  required: boolean('required').default(true).notNull(), // 顧客是否必須從此群組中選擇？
  allowRepeatedItems: boolean('allowRepeatedItems').default(true).notNull(), // 新增: 可配置的重複選擇
  minSelections: integer('minSelections').default(1).notNull(), // 最少選擇數量
  maxSelections: integer('maxSelections').default(1).notNull(), // 最多選擇數量
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
  isDefault: boolean('isDefault').default(false).notNull(), // 這是否為此群組的預設選擇？
  priceDelta: integer('priceDelta').default(0).notNull(), // 升級/降級的價格調整（以分為單位）
  displayOrder: integer('displayOrder').default(0).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  uniqueComboGroupItem: uniqueIndex('unique_combo_group_item').on(table.comboGroupId, table.menuItemId),
  orderIdx: index('idx_combo_group_items_order').on(table.comboGroupId, table.displayOrder),
  menuItemIdx: index('idx_combo_group_items_menu_item').on(table.menuItemId)
}));

// ==========================================
// 變體 (VARIANTS) - 完全隔離的店家範圍架構
// ==========================================
// 此資料表定義抽象的變體概念（尺寸、溫度、甜度等級）
// 可被 CustomizationOptions 和 Recipes 參照。
//
// 關鍵設計原則：
// 1. 完全隔離：每個變體記錄必須屬於特定店家（storeId NOT NULL）
// 2. 無全域變體：沒有跨店家共用的「系統」變體
// 3. 應用層初始化：當建立新店家時，後端會為該店家範圍初始化常見變體（從範本）
// 4. 代碼自動生成：'code' 欄位由後端自動生成（例如：slug 化的名稱或隨機字串），
//    對使用者隱藏。僅用於內部系統邏輯。
// 5. 使用者可見名稱：'name' 欄位是使用者看到的（例如："大杯"、"熱"）
//
// 初始化流程範例：
// 建立店家 ABC 時：
// - 後端插入：{ storeId: 'abc-uuid', code: 'size_small', name: '小杯', category: 'SIZE' }
// - 後端插入：{ storeId: 'abc-uuid', code: 'size_large', name: '大杯', category: 'SIZE' }
// - 後端插入：{ storeId: 'abc-uuid', code: 'temp_hot', name: '熱', category: 'TEMPERATURE' }
// - 等等
//
// 優點：
// - 型別安全的外鍵關係（非魔術字串）
// - 店家獨立性（每個店家可自訂變體名稱）
// - 資料完整性（無效的變體 ID 會被資料庫拒絕）
// - 彈性（店家可新增自訂變體）

export const variants = pgTable('variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('storeId').notNull().references(() => stores.id, { onDelete: 'cascade' }), // NOT NULL - 每個變體都屬於一個店家
  code: varchar('code', { length: 100 }).notNull(), // 由後端自動生成，對使用者隱藏 (例如: "size_large_abc123")
  name: varchar('name', { length: 255 }).notNull(), // 使用者可見的顯示名稱 (例如: "大杯", "熱")
  category: varchar('category', { length: 100 }), // 用於 UI 組織的可選群組 (例如: "SIZE", "TEMPERATURE")
  displayOrder: integer('displayOrder').default(0).notNull(),
  isActive: boolean('isActive').default(true).notNull(), // 安全提示: 應用層在編譯食譜時必須過濾 isActive=true，以防止已軟刪除的變體觸發庫存扣除
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  uniqueStoreCode: uniqueIndex('unique_variants_store_code').on(table.storeId, table.code), // 店家範圍內的唯一代碼
  categoryIdx: index('idx_variants_category').on(table.category)
}));

export const customizationOptions = pgTable('customization_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  customizationId: uuid('customizationId').notNull().references(() => menuItemCustomizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(), // "小杯", "中杯", "大杯"
  priceDelta: integer('priceDelta').default(0).notNull(), // 價格調整以分為單位（可以是負數，表示折扣）
  variantId: uuid('variantId').references(() => variants.id, { onDelete: 'set null' }), // 嚴格型別的 variants 資料表外鍵（非變體選項可為空）
  isDefault: boolean('isDefault').default(false).notNull(), // 這是否為預設選項？（用於可移除的修飾選項）
  isAvailable: boolean('isAvailable').default(true).notNull(),
  displayOrder: integer('displayOrder').default(0).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  orderIdx: index('idx_customization_options_order').on(table.customizationId, table.displayOrder),
  variantIdx: index('idx_customization_options_variant').on(table.variantId)
}));

export const inventoryItems = pgTable('inventory_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('storeId').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(), // "阿拉比卡咖啡豆", "全脂牛奶", "大紙杯"
  description: text('description'),
  sku: varchar('sku', { length: 100 }), // 庫存單位 (每個店家唯一，非全域)
  unit: inventoryUnit('unit').notNull(), // 測量單位
  currentStock: decimal('currentStock', { precision: 10, scale: 3 }).default('0').notNull(), // 支援小數數量 (例如: 150.5g)
  reservedStock: decimal('reservedStock', { precision: 10, scale: 3 }).default('0').notNull(),
  minStock: decimal('minStock', { precision: 10, scale: 3 }).default('0').notNull(), // 用於警報的最低庫存門檻
  costPerUnit: decimal('costPerUnit', { precision: 10, scale: 4 }), // 每單位成本，用於成本追蹤
  supplier: varchar('supplier', { length: 255 }),
  lastRestocked: timestamp('lastRestocked', { withTimezone: true }),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  stockIdx: index('idx_inventory_items_stock').on(table.currentStock),
  skuIdx: index('idx_inventory_items_sku').on(table.sku),
  uniqueStoreSku: uniqueIndex('unique_store_sku').on(table.storeId, table.sku) // 多租戶 SKU 唯一性
}));

// ==========================================
// 食譜 (RECIPES) - 效果：要扣除哪些庫存
// ==========================================
// 此資料表定義食譜的「效果」：消耗哪個庫存項目及多少數量。
// 「原因」（何時觸發）定義在 recipe_conditions 資料表中。
//
// 關鍵概念：
// 1. 僅效果：此資料表回答「要扣除什麼」（inventoryItemId + quantity）
// 2. 原因在別處：recipe_conditions 資料表回答「何時觸發」（變體匹配）
// 3. 基礎食譜：如果食譜在 recipe_conditions 中有零個條件，則無條件執行
// 4. 條件食譜：如果食譜有條件，則必須全部滿足（AND 邏輯）
// 5. 菜單項目範圍：如果設定 menuItemId，食譜僅適用於該項目
//                   如果 menuItemId 為 NULL，食譜是全域的（例如：「加珍珠」調整選項）

export const recipes = pgTable('recipes', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('storeId').notNull().references(() => stores.id, { onDelete: 'cascade' }), // 新增 storeId
  menuItemId: uuid('menuItemId').references(() => menuItems.id, { onDelete: 'cascade' }), // 可為空: NULL = 全域食譜, SET = 限定於特定項目
  inventoryItemId: uuid('inventoryItemId').notNull().references(() => inventoryItems.id, { onDelete: 'cascade' }), // 消耗的原始原料
  quantityRequired: decimal('quantityRequired', { precision: 10, scale: 3 }).notNull(), // 所需原料數量
  notes: text('notes'), // 額外備註 (例如: "使用優質混合豆")
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  storeMenuIdx: index('idx_recipes_store_menu').on(table.storeId, table.menuItemId), // 新增高效的店家範圍索引
  menuItemIdx: index('idx_recipes_menu_item').on(table.menuItemId),
  inventoryItemIdx: index('idx_recipes_inventory_item').on(table.inventoryItemId)
}));

// ==========================================
// 食譜條件 (RECIPE CONDITIONS) - 原因：何時觸發
// ==========================================
// 此連接資料表定義觸發食譜所需的條件。
// 同一個 recipeId 的多個條件使用 AND 邏輯評估。
//
// 評估規則：
// 1. 零個條件 = 基礎食譜：食譜無條件執行（只要 menuItemId 匹配）
// 2. 一個或多個條件 = 條件食譜：所有變體必須出現在訂單中
//
// 範例：
// - 基礎食譜：大杯拿鐵總是使用 450ml 牛奶（無條件）
// - 單一條件：大杯拿鐵配燕麥奶使用 450ml 燕麥奶（variantId = "oat_milk"）
// - 複合 AND：大杯熱拿鐵使用特定食譜（variantId = "size_large" AND "temp_hot"）

export const recipeConditions = pgTable('recipe_conditions', {
  id: uuid('id').primaryKey().defaultRandom(),
  recipeId: uuid('recipeId').notNull().references(() => recipes.id, { onDelete: 'cascade' }), // 此條件所屬的食譜
  variantId: uuid('variantId').notNull().references(() => variants.id, { onDelete: 'restrict' }), // 安全: 如果變體在食譜中使用，則防止刪除
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  recipeIdx: index('idx_recipe_conditions_recipe').on(table.recipeId),
  variantIdx: index('idx_recipe_conditions_variant').on(table.variantId),
  uniqueRecipeVariant: uniqueIndex('unique_recipe_condition').on(table.recipeId, table.variantId) // 防止重複條件
}));

export const inventoryLogs = pgTable('inventory_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  inventoryItemId: uuid('inventoryItemId').notNull().references(() => inventoryItems.id, { onDelete: 'cascade' }),
  changeType: inventoryChangeType('changeType').notNull(),
  quantityChange: decimal('quantityChange', { precision: 10, scale: 3 }).notNull(), // 可以是負數（表示扣除）
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
  orderNumber: varchar('orderNumber', { length: 50 }).notNull().unique(), // 隨機雜湊字串 (例如 NanoID) 以避免碰撞
  storeId: uuid('storeId').notNull().references(() => stores.id, { onDelete: 'restrict' }),
  userId: uuid('userId').notNull(),
  orderSource: orderSource('orderSource').notNull(),
  orderType: orderType('orderType').notNull(),
  status: orderStatus('status').notNull().default('PENDING'),
  subtotal: integer('subtotal').notNull(), // 金額以分為單位
  tax: integer('tax').notNull(), // 金額以分為單位
  discount: integer('discount').notNull().default(0), // 金額以分為單位 (v0.2.0 手動 POS 折扣，未來：自動優惠券計算)
  discountReason: text('discountReason'), // 折扣原因 (例如 "經理授權", "忠誠獎勵")。擴展性：未來可儲存優惠券代碼
  total: integer('total').notNull(), // 金額以分為單位
  scheduledPickupTime: timestamp('scheduledPickupTime', { withTimezone: true }),
  notes: text('notes'),
  cancelReason: text('cancelReason'),
  cancelledAt: timestamp('cancelledAt', { withTimezone: true }),
  cancelledBy: uuid('cancelledBy'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userDateIdx: index('idx_orders_user_date').on(table.userId, table.createdAt),
  storeStatusDateIdx: index('idx_orders_store_status_date').on(table.storeId, table.status, table.createdAt)
}));

export const orderStatusHistory = pgTable('order_status_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('storeId').notNull().references(() => stores.id, { onDelete: 'cascade' }), // 新增用於高效的店家層級查詢
  orderId: uuid('orderId').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  status: orderStatus('status').notNull(),
  previousStatus: orderStatus('previousStatus'), // 初始狀態可為空
  changedBy: uuid('changedBy'), // 進行變更的使用者 ID（系統或員工）
  reason: text('reason'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  storeIdx: index('idx_order_status_history_store').on(table.storeId, table.createdAt),
  orderIdx: index('idx_order_status_history_order').on(table.orderId, table.createdAt),
  statusIdx: index('idx_order_status_history_status').on(table.status)
}));

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('orderId').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  menuItemId: uuid('menuItemId').notNull(),
  itemName: varchar('itemName', { length: 255 }).notNull(),
  itemType: orderItemType('itemType').notNull().default('REGULAR'), // REGULAR | COMBO_PARENT | COMBO_CHILD
  parentOrderItemId: uuid('parentOrderItemId').references(() => orderItems.id, { onDelete: 'cascade' }), // 自我參照：將 COMBO_CHILD 連結到 COMBO_PARENT
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unitPrice').notNull(), // 每單位價格以分為單位。對於 COMBO_CHILD：通常為 0，除非升級/推銷
  subtotal: integer('subtotal').notNull(), // 總價以分為單位
  // 🔴 財務完整性的快照欄位
  priceAtOrder: integer('priceAtOrder').notNull(), // 快照: MenuItem.price + 修飾項 deltas (分)
  costAtOrder: integer('costAtOrder').notNull(),  // 快照: 計算的 COGS (食譜 × InventoryItem.costPerUnit) (分)
  customizations: jsonb('customizations'), // 🔴 關鍵：所有項目類型 (REGULAR, COMBO_PARENT, COMBO_CHILD) 都使用
   /**
   * 介面: Array<{
   *   customizationId: string;
   *   name: string; // "Size"
   *   type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
   *   selectedOptions: Array<{
   *     id: string; // customization_option_id
   *     name: string; // "Large"
   *     priceDelta: number; // 50
   *     variantId?: string; // "var-l" (用於食譜執行的快照)
   *   }>
   * }>
   */
  specialInstructions: text('specialInstructions'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  orderIdx: index('idx_order_items_order').on(table.orderId),
  menuItemIdx: index('idx_order_items_menu_item').on(table.menuItemId),
  parentIdx: index('idx_order_items_parent').on(table.parentOrderItemId),
  typeIdx: index('idx_order_items_type').on(table.itemType)
}));

// ==========================================
// 支付實體 (PAYMENT ENTITIES)
// ==========================================

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('orderId').notNull().references(() => orders.id, { onDelete: 'restrict' }),
  amount: integer('amount').notNull(), // 支付金額以分為單位 (例如: 1299 = $12.99)
  currency: varchar('currency', { length: 3 }).notNull().default('TWD'), // ISO 4217 貨幣代碼
  method: paymentMethod('method').notNull(), // CARD, CASH, LINEPAY, APPLE_PAY, GOOGLE_PAY
  status: paymentStatus('status').notNull().default('PENDING'), // PENDING, PAID, FAILED, REFUNDED, PARTIALLY_REFUNDED
  providerTransactionId: varchar('providerTransactionId', { length: 255 }), // Stripe payment intent ID, LinePay transaction ID 等
  // 介面: { cashReceived?: number, changeGiven?: number, cardLast4?: string, cardBrand?: string, terminalId?: string }
  metadata: jsonb('metadata'), 
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
  amount: integer('amount').notNull(), // 退款金額以分為單位
  currency: varchar('currency', { length: 3 }).notNull().default('TWD'), // ISO 4217 貨幣代碼
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
// 設備與硬體實體 (DEVICE & HARDWARE ENTITIES)
// ==========================================

export const devices = pgTable('devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('storeId').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(), // 使用者友善名稱 (例如 "前台印表機")
  type: deviceType('type').notNull(), // RECEIPT_PRINTER, KITCHEN_LABEL_PRINTER, CARD_READER, CASH_DRAWER, QR_SCANNER, KDS_DISPLAY
  status: deviceStatus('status').notNull().default('OFFLINE'), // ONLINE, OFFLINE, ERROR
  ipAddress: varchar('ipAddress', { length: 45 }), // IPv4 或 IPv6
  macAddress: varchar('macAddress', { length: 17 }), // 用於設備識別的 MAC 位址
  serialNumber: varchar('serialNumber', { length: 100 }),
  firmwareVersion: varchar('firmwareVersion', { length: 50 }),
  // 介面: { model?: string, manufacturer?: string, capabilities?: string[], config?: Record<string, any> }
  metadata: jsonb('metadata'), 
  lastSeen: timestamp('lastSeen', { withTimezone: true }), // 最後心跳時間戳記
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
  orderId: uuid('orderId').references(() => orders.id, { onDelete: 'set null' }), // 可為空: 可能是非訂單列印工作 (報告等)
  type: printJobType('type').notNull(), // RECEIPT, KITCHEN_LABEL, REPORT
  status: printJobStatus('status').notNull().default('QUEUED'), // QUEUED, PRINTING, COMPLETED, FAILED
  content: jsonb('content').notNull(), // 列印資料: { orderNumber?, items?, totalAmount?, customerInfo?, template? }
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
// 通知實體 (NOTIFICATION ENTITIES)
// ==========================================

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('userId').notNull().references(() => users.id, { onDelete: 'cascade' }), // users 資料表 FK
  type: varchar('type', { length: 100 }).notNull(), // ORDER_CONFIRMATION, ORDER_READY, PAYMENT_SUCCESS 等
  channel: notificationChannel('channel').notNull(), // EMAIL, SMS, PUSH, WEBSOCKET
  status: notificationStatus('status').notNull().default('PENDING'), // PENDING, SENT, FAILED
  recipient: varchar('recipient', { length: 255 }).notNull(), // 電子郵件地址、電話號碼、設備 token 或 WebSocket connectionId
  subject: varchar('subject', { length: 255 }),
  message: text('message').notNull(),
  // 介面: { orderId?: string, storeId?: string, actionUrl?: string, priority?: 'high'|'normal', templateId?: string }
  metadata: jsonb('metadata'), 
  sentAt: timestamp('sentAt', { withTimezone: true }),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userTypeIdx: index('idx_notifications_user_type').on(table.userId, table.type),
  statusIdx: index('idx_notifications_status').on(table.status),
  createdAtIdx: index('idx_notifications_created_at').on(table.createdAt)
}));

// ==========================================
// CRM 與忠誠度實體 (CRM & LOYALTY ENTITIES)
// 預留給 v0.3.0 (未來模組)
// 注意: 這些資料表在目前的 MVP 範圍中被故意省略，以避免過度設計。
// 未來模組將包括：忠誠點數、優惠券、客戶等級、推薦系統。
// 擴展性掛鉤：Orders.discount 和 Orders.discountReason 欄位作為未來優惠券整合的佔位符。
// 擴展性: Orders.discount 和 Orders.discountReason 欄位作為未來優惠券整合的掛鉤

// ==========================================
// 店家員工實體 (STORE STAFF ENTITIES)
// ==========================================

export const storeStaff = pgTable('store_staff', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('storeId').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  userId: uuid('userId').notNull().references(() => users.id, { onDelete: 'cascade' }), // users 資料表 FK
  role: staffRole('role').notNull(), // CASHIER, LEAD, MANAGER, MERCHANT
  isActive: boolean('isActive').notNull().default(true),
  hiredAt: timestamp('hiredAt', { withTimezone: true }).defaultNow().notNull(),
  terminatedAt: timestamp('terminatedAt', { withTimezone: true }),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  storeUserIdx: uniqueIndex('unique_store_staff_user').on(table.storeId, table.userId), // 每個使用者在每家店家只有一筆員工記錄
  storeRoleIdx: index('idx_store_staff_store_role').on(table.storeId, table.role),
  userIdx: index('idx_store_staff_user').on(table.userId),
  activeIdx: index('idx_store_staff_active').on(table.isActive)
}));

// ==========================================
// 平台整合實體 (PLATFORM INTEGRATION ENTITIES)
// ==========================================
// v0.2.0 範圍外 (MVP + 庫存 + POS)
// 未來模組：UberEats/Foodpanda Webhook 整合、菜單同步、訂單匯入
// 擴展性：OrderSource 列舉可在未來版本擴展以包含 UBEREATS、FOODPANDA

```

---

## 實體關係圖

### 核心實體圖表

```
┌─────────────────┐
│     Store       │
│     店家        │
│─────────────────│
│ id (PK)         │
│ name            │
│ address (text)  │
│ businessHours   │
└────────┬────────┘
         │
         │ 1:N
         │
    ┌────┴──────────────────┐───────────────────┐
    │               │       │                   │
┌───▼────────┐  ┌───▼──────────────────┐   ┌────▼─────────┐
│  Category  │  │   MenuItem           │   │   Variant    │
│  分類      │  │   菜單項目           │   │   變體       │
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
     │  食譜            │   │                    │         
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
│菜單項目自訂          │    │  套餐群組               │
│──────────────────────│    │─────────────────────────│
│ id (PK)              │    │ id (PK)                 │
│ menuItemId (FK)      │    │ menuItemId (FK)         │
│ name ("尺寸")        │    │ name ("主餐", "配菜")   │
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
│ CustomizationOption     │ │ 套餐群組項目            │
│ 自訂選項                │ │─────────────────────────│
│─────────────────────────│ │ id (PK)                 │
│ id (PK)                 │ │ comboGroupId (FK)       │
│ customizationId (FK)    │ │ menuItemId (FK)         ┼─┐
│ name ("小杯","大杯")    │ │ isDefault               │ │ 參照
│ priceDelta              │ │ priceDelta              │ │ 任何 MenuItem
│ variantId (FK)────────┐ │ └─────────────────────────┘ │
│ isDefault             │ │                             │
│ isAvailable           │ │◄────────────────────────────┘
└───────────────────────┘ │
       │                  │
       │ variant FK       │
       └──────────────────┼───────────────────────┐
                          │                       │
┌─────────────────────────┐                       │
│ Recipe                  │                       │
│ 食譜                    │                       │
│─────────────────────────│                       │
│ id (PK)                 │                       │
│ storeId (FK)            │                       │
│ menuItemId (FK, NULL)   │  可為null: NULL=全域  │
│ inventoryItemId (FK)    │            SET=限定   │
│ quantityRequired        │                       │
│ notes                   │                       │
└──────┬──────────────────┘                       │
       │                                          │
       │ 1:N                                      │
       │                                          │
┌──────▼──────────────────────┐                   │
│ RecipeCondition             │                   │
│ 食譜條件                    │                   │
│─────────────────────────────│                   │
│ id (PK)                     │                   │
│ recipeId (FK)               │                   │
│ variantId (FK)──────────────┼───────────────────┘
└─────────────────────────────┘
       │ N:1
       │
┌──────▼──────────────────┐
│ InventoryItem           │
│ 庫存項目                │
│─────────────────────────│
│ id (PK)                 │
│ name ("牛奶", "茶")     │
│ sku                     │
│ unit (ENUM)             │
│ currentStock            │
│ reservedStock           │
│ minStock                │
│ costPerUnit             │
└─────────────────────────┘

新食譜邏輯 (V1.5):
- Recipe 定義效果（要扣除哪些庫存）
- RecipeCondition 定義原因（何時觸發）
- 零個條件 = 基礎食譜（無條件）
- 一個以上條件 = 條件式（AND 邏輯）
- 變體匹配：CustomizationOption.variantId → Variant.id
            RecipeCondition.variantId → Variant.id

食譜範圍：
- menuItemId NULL：全域食譜（適用於任何有匹配變體的訂單）
- menuItemId SET：項目限定食譜（僅適用於此特定菜單項目）

變體評估：
- 從選擇的 CustomizationOptions 收集 variantIds
- 食譜僅在其所有條件都在上下文中時執行（AND 邏輯）
- 範例：具有 2 個條件（size_large + temp_hot）的食譜僅在
  顧客同時選擇大杯和熱時觸發
```

### 訂單流程圖表

```
┌──────────────┐           ┌───────────────┐
│    User      │           │     Store     │
│    使用者    │           │     店家      │
│──────────────│           │───────────────│
│ id (PK)      │           │ id (PK)       │
│ email        │           │ name          │
└──────┬───────┘           └────┬──────────┘
       │                        │
       │ 1:N                    │ 1:N
       │                        │
   ┌───▼────────────────────────▼───┐
   │         Order                  │
   │         訂單                   │
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
   │  訂單項目      │   │   支付       │
   │────────────────│   │──────────────│
   │ id (PK)        │   │ id (PK)      │
   │ orderId (FK)   │   │ orderId (FK) │
   │ menuItemId FK  │   │ amount       │
   │ quantity       │   │ status       │
   │ subtotal       │   └──────────────┘
   └────────────────┘
```

### CRM 實體圖表

```
[v0.2.0 範圍外 - CRM 實體（忠誠度、優惠券、等級、推薦）將於未來版本新增]
```

---

## 索引策略

### 主鍵索引

所有資料表在 `id` 欄位上自動建立主鍵索引。

### 查詢優化索引

**高優先級索引**（立即建立）：

```sql
-- Orders - 依使用者和店家的頻繁查詢
CREATE INDEX idx_orders_user_date ON orders (user_id, created_at DESC);
CREATE INDEX idx_orders_store_status_date ON orders (store_id, status, created_at DESC);

-- Menu Items - 目錄瀏覽
CREATE INDEX idx_menu_items_store_category ON menu_items (store_id, category_id, is_available);
CREATE INDEX idx_menu_items_availability ON menu_items (is_available, is_deleted);

-- Menu Customizations - 選項查詢
CREATE INDEX idx_customizations_item_order ON menu_item_customizations (menu_item_id, display_order);
CREATE INDEX idx_customization_options_order ON customization_options (customization_id, display_order);
CREATE INDEX idx_customization_options_variant ON customization_options (variant_id);

-- Combo Groups - 套餐管理（用於 isCombo = true 的 MenuItem）
CREATE INDEX idx_combo_groups_item_order ON combo_groups (menu_item_id, display_order);
CREATE INDEX idx_combo_group_items_order ON combo_group_items (combo_group_id, display_order);
CREATE INDEX idx_combo_group_items_menu_item ON combo_group_items (menu_item_id);
CREATE UNIQUE INDEX unique_combo_group_item ON combo_group_items (combo_group_id, menu_item_id);

-- Menu Items - 套餐篩選
CREATE INDEX idx_menu_items_store_combo ON menu_items (store_id, is_combo);

-- Inventory Items - 庫存檢查和 SKU 查詢（多租戶範圍）
CREATE INDEX idx_inventory_items_stock ON inventory_items (current_stock);
CREATE INDEX idx_inventory_items_low_stock ON inventory_items (store_id, current_stock) WHERE current_stock <= min_stock;

-- Variants - 主變體查詢
CREATE INDEX idx_variants_category ON variants (category);
CREATE UNIQUE INDEX unique_variants_store_code ON variants (store_id, code);

-- Recipes - 原料消耗查詢
CREATE INDEX idx_recipes_store_menu ON recipes (store_id, menu_item_id); -- 高效店家範圍查詢的複合索引
CREATE INDEX idx_recipes_menu_item ON recipes (menu_item_id);
CREATE INDEX idx_recipes_inventory_item ON recipes (inventory_item_id);

-- Recipe Conditions - 條件食譜的變體匹配
CREATE INDEX idx_recipe_conditions_recipe ON recipe_conditions (recipe_id);
CREATE INDEX idx_recipe_conditions_variant ON recipe_conditions (variant_id);
CREATE UNIQUE INDEX unique_recipe_condition ON recipe_conditions (recipe_id, variant_id);

-- Inventory Logs - 歷史追蹤
CREATE INDEX idx_inventory_logs_item_date ON inventory_logs (inventory_item_id, created_at DESC);
CREATE INDEX idx_inventory_logs_type ON inventory_logs (change_type);

-- Payments - 財務查詢
CREATE INDEX idx_payments_status_date ON payments (status, created_at DESC);

-- Store Staff - 權限檢查
CREATE INDEX idx_store_staff_role ON store_staff (store_id, role);
```

**複合索引**用於常見查詢模式：

```sql
-- 店家狀態篩選
CREATE INDEX idx_stores_status ON stores (is_open, accepting_orders);

-- 菜單分類排序
CREATE INDEX idx_menu_categories_store_order ON menu_categories (store_id, display_order);

-- 訂單狀態歷史追蹤
CREATE INDEX idx_order_status_history ON order_status_history (order_id, created_at DESC);
```

**全文搜尋索引**（使用 pg_trgm 擴充功能）：

```sql
-- 菜單項目搜尋
CREATE INDEX idx_menu_items_name_search ON menu_items USING gin (name gin_trgm_ops);

-- 店家搜尋
CREATE INDEX idx_stores_name_search ON stores USING gin (name gin_trgm_ops);
```

### 部分索引

```sql
-- 低庫存項目
CREATE INDEX idx_inventory_items_low_stock ON inventory_items (id, current_stock) 
  WHERE current_stock <= min_stock;

-- 失敗支付以供重試
CREATE INDEX idx_payments_failed ON payments (id, created_at) WHERE status = 'FAILED';
```

---

## 遷移指南

### Drizzle Kit 命令

**生成遷移**：
```bash
npx drizzle-kit generate:pg --schema=./src/db/schema.ts
```

**應用遷移**（生產環境）：
```bash
npx drizzle-kit push:pg
# 或使用遷移檔案：
node src/db/migrate.ts
```

**刪除資料庫**（僅開發環境）：
```bash
npx drizzle-kit drop
```

**內省現有資料庫**：
```bash
npx drizzle-kit introspect:pg
```

### 遷移最佳實踐

1. **永不修改現有遷移**：始終建立新遷移
2. **先在測試環境測試**：在生產環境之前先將遷移應用於測試環境
3. **向後相容的變更**：確保遷移不會破壞現有程式碼
4. **資料遷移**：對複雜轉換使用獨立的資料遷移腳本
5. **回滾計畫**：始終為生產遷移準備回滾策略

### 遷移工作流程範例

**新增欄位**：
```typescript
// 1. 更新 src/db/schema.ts
export const menuItems = pgTable('menu_items', {
  // ... 現有欄位
  nutrition: jsonb('nutrition'), // 新欄位
});
```

```bash
# 2. 生成遷移
npx drizzle-kit generate:pg

# 3. 檢閱生成的遷移 SQL（在 drizzle/migrations/ 中）
# 4. 在開發環境測試
node src/db/migrate.ts

# 5. 應用到測試環境
node src/db/migrate.ts

# 6. 驗證測試環境
# 7. 應用到生產環境
node src/db/migrate.ts
```

---

## Redis 快取模式

雖然 PostgreSQL 是主要資料庫，但 Redis 用於快取和臨時資料：

### 快取鍵

| 鍵模式 | TTL | 說明 |
|--------|-----|------|
| `menu:{storeId}` | 5 分鐘 | 完整菜單快取 |
| `store:{storeId}` | 10 分鐘 | 店家設定 |
| `user:{userId}` | 15 分鐘 | 使用者設定檔 |
| `lock:inventory:{inventoryItemId}` | 10 分鐘 | 庫存預留鎖定 |
| `recipe:cache:{menuItemId}` | 30 分鐘 | 菜單項目的編譯食譜 |
| `coupon:{code}` | 直到過期 | 優惠券驗證快取 |
| `ws:connection:{userId}` | 活躍期間 | WebSocket 連線 ID |
| `idempotency:{key}` | 24 小時 | 冪等性追蹤 |
| `rate:{ip}:{endpoint}` | 1 分鐘 | 速率限制 |

### 快取失效

**菜單更新時**：
```typescript
// 使菜單快取失效
await redis.del(`menu:${storeId}`);
```

**店家設定更新時**：
```typescript
// 使店家快取失效
await redis.del(`store:${storeId}`);
```

**使用者資料更新時**：
```typescript
// 使使用者快取失效
await redis.del(`user:${userId}`);
```

---

## 資料保留政策

### 熱資料（PostgreSQL）

- **訂單**：保留 3 個月（若在 20GB 限制內則保留所有資料）
- **支付**：保留 1 年（法規要求）
- **庫存日誌**：保留 6 個月
- **通知**：保留 30 天

### 未來封存策略（若資料超過 20GB）

- **訂單（歷史）**：> 3 個月前 → 透過 Lambda 匯出至 S3
- **庫存日誌（歷史）**：> 6 個月前 → 匯出至 S3
- **通知（已封存）**：> 30 天前 → 匯出至 S3

### 手動匯出方法

**基於 Lambda 的匯出**（如有需要）：
```typescript
// Lambda 函式將舊訂單匯出至 S3
// 透過 EventBridge 排程每月觸發

-- 從 PostgreSQL 刪除
DELETE FROM orders
WHERE created_at < NOW() - INTERVAL '3 months';
```

---

## 系統架構與設計規則

1. **Drizzle ORM**：使用 `drizzle-orm` 進行型別安全的資料庫存取，開銷最小（~5KB vs Prisma 的 ~20MB）
2. **交易**：對多資料表操作使用 Drizzle 交易（`db.transaction()`）
3. **連線池**：應用層連線池透過 Drizzle ORM（每個 Lambda 執行個體最多 10 個連線），不需要 RDS Proxy
4. **遷移**：在部署 Lambda 函式之前始終執行遷移（使用 `drizzle-kit` 或遷移執行器）
5. **軟刪除**：對菜單項目使用 `isDeleted` 標記而非硬刪除
6. **冷啟動優化**：Drizzle 開銷最小，非常適合 Lambda 冷啟動

### 菜單項目與套餐管理

7. **套餐定義**：`isCombo: true` 的 MenuItem 代表套餐（例如：「漢堡套餐」）。它有 `comboGroups` 定義可選元件（例如：「選擇主餐」、「選擇配菜」、「選擇飲料」）。

8. **訂單項目類型**（自我參照模式）：
   - `REGULAR`：標準單品訂單（例如：「經典漢堡」）
   - `COMBO_PARENT`：套餐的虛擬容器 - 包含套餐的總價，但**不**消耗庫存
   - `COMBO_CHILD`：套餐的實際組成部分（例如：「漢堡套餐」中的「經典漢堡」）- 這個**會**消耗庫存
   
9. **套餐訂單結構範例**：
   ```typescript
   // "漢堡套餐" 的訂單 ($150.00) 包含經典漢堡 + 大薯 (升級 +$10.00) + 可樂
   [
     {
       id: "item-1",
       itemType: "COMBO_PARENT",
       menuItemId: "combo-001", // "漢堡套餐" MenuItem
       itemName: "漢堡套餐",
       quantity: 1,
       unitPrice: 150.00, // $150.00
       subtotal: 150.00,
       parentOrderItemId: null,
       customizations: null // COMBO_PARENT 沒有自訂選項
     },
     {
       id: "item-2",
       itemType: "COMBO_CHILD",
       menuItemId: "burger-001", // "經典漢堡" MenuItem
       itemName: "經典漢堡",
       quantity: 1,
       unitPrice: 0.00, // 不額外收費（包含在套餐中）
       subtotal: 0.00,
       parentOrderItemId: "item-1",
       customizations: [{name: "不加洋蔥", options: [...]}] // 漢堡的特定自訂選項
     },
     {
       id: "item-3",
       itemType: "COMBO_CHILD",
       menuItemId: "fries-002", // "大薯" MenuItem
       itemName: "大薯",
       quantity: 1,
       unitPrice: 10.00, // +$10.00 升級費用
       subtotal: 10.00,
       parentOrderItemId: "item-1",
       customizations: null
     },
     {
       id: "item-4",
       itemType: "COMBO_CHILD",
       menuItemId: "drink-001", // "可樂" MenuItem
       itemName: "可樂",
       quantity: 1,
       unitPrice: 0.00,
       subtotal: 0.00,
       parentOrderItemId: "item-1",
       customizations: [{name: "冰量", options: [{name: "去冰"}]}]
     }
   ]
   // 總訂單: $150.00 (COMBO_PARENT) + $10.00 (升級) = $160.00
   ```

10. **關聯查詢**：使用 Drizzle 查詢 MenuItem 時，使用連接或關聯查詢：
   ```typescript
   // 使用 Drizzle 關聯查詢
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

11. **庫存扣除邏輯**（關鍵）：
    ```typescript
    // 處理訂單時，迭代 order_items:
    for (const item of orderItems) {
      if (item.itemType === 'COMBO_PARENT') {
        continue; // 跳過 - 這只是一個價格容器，不消耗庫存
      }
      
      // 處理 REGULAR 和 COMBO_CHILD 項目的庫存
      if (item.itemType === 'REGULAR' || item.itemType === 'COMBO_CHILD') {
        const recipes = await compileRecipes(item.menuItemId, item.customizations);
        await deductInventory(recipes, item.quantity);
      }
    }
    ```

12. **套餐預設值**：每個 ComboGroup 必須恰好有一個項目的 `isDefault: true`

13. **套餐驗證**：驗證客戶選擇是否符合每個群組的 minSelections/maxSelections 限制

14. **價格變動**：`priceDelta` 欄位代表價格調整（正數表示升級，負數表示折扣，0 表示無變動）

15. **使用 JSONB 自訂選項進行分析**：使用 PostgreSQL 的 `jsonb_array_elements()` 分析配料/修飾項銷售：
    ```sql
    -- 範例：統計所有訂單中「不加洋蔥」的選擇次數
    SELECT 
      jsonb_array_elements(customizations)->>'name' AS customization_name,
      COUNT(*) AS selection_count
    FROM order_items
    WHERE customizations IS NOT NULL
    GROUP BY customization_name;
    ```

### 庫存與食譜系統 (食譜驅動架構)

16. **多租戶庫存隔離**：InventoryItem 必須包含 `storeId` 以按店家隔離庫存。更新「牛奶」庫存應僅影響特定店家的庫存，而不是全域影響所有店家。

17. **解耦哲學**：MenuItem **不**直接連結到庫存。所有庫存消耗皆透過 `Recipe` 模型定義。

18. **完全隔離的店家範圍變體架構**：
    - **設計理念**：每個變體記錄嚴格屬於特定店家（`storeId NOT NULL`）
    - **無全域變體**：資料庫中**沒有**共用的「系統」變體
    - **應用層初始化**：建立新店家時，後端會自動將常見變體（從範本）初始化到該店家範圍內的 `variants` 資料表
    - **代碼自動生成**：`code` 欄位由後端自動生成（例如：slug 化的名稱如 "size_large_a1b2c3" 或隨機字串），並**對使用者隱藏**。它僅用於內部系統邏輯和唯一性約束。
    - **使用者可見名稱**：`name` 欄位是使用者在 UI 中看到的（例如："大杯"、"熱"、"半糖"）
    - **店家獨立性**：每個店家可以自訂變體名稱（店家 A 的 "Grande" = 店家 B 的 "Large"）
    - **單一真實來源**：`variantId`（`variants.id` 的 FK）現在是選項和食譜之間的權威連結，取代了容易出錯的字串匹配
    - **初始化流程範例**：
      ```typescript
      // 當建立店家 ABC 時，後端初始化：
      await db.insert(variants).values([
        { storeId: 'abc-uuid', code: 'size_s_x7y9', name: '小杯', category: 'SIZE', displayOrder: 1 },
        { storeId: 'abc-uuid', code: 'size_l_k3m5', name: '大杯', category: 'SIZE', displayOrder: 2 },
        { storeId: 'abc-uuid', code: 'temp_hot_p2q4', name: '熱', category: 'TEMPERATURE', displayOrder: 1 },
        { storeId: 'abc-uuid', code: 'temp_iced_r6s8', name: '冰', category: 'TEMPERATURE', displayOrder: 2 },
        // ... 更多範本變體
      ]);
      ```
    - **優點**：
      - 型別安全的外鍵關係防止拼寫錯誤（資料庫拒絕無效的變體 ID）
      - 集中式變體管理（更新名稱一次，隨處反映）
      - 店家隔離（店家 A 的變更不會影響店家 B）
      - 參照完整性（刪除變體會正確級聯）

19. **食譜條件架構**（效果 vs 原因分離）：
    - **Recipe 資料表**：定義「效果」（扣除什麼庫存）
      - `menuItemId`：可為空。如果 NULL = 全域食譜，如果 SET = 限定於特定菜單項目
      - `inventoryItemId`：消耗哪個原始原料
      - `quantityRequired`：消耗多少
    - **RecipeCondition 資料表**：定義「原因」（何時觸發食譜）
      - 連結 `recipeId` 到 `variantId` 的關聯表
      - 同一食譜的多個條件 = AND 邏輯（必須全部滿足）
      - 零個條件 = 基礎食譜（無條件執行）
    
    **食譜類型**：
    - **基礎食譜**（零個條件）：
      - 範例：「美式咖啡總是使用 18g 咖啡豆」
      - 食譜在 recipe_conditions 資料表中沒有任何列
      - 只要 menuItemId 匹配，就會無條件執行
    
    - **單一條件食譜**（需要一個變體）：
      - 範例：「大杯拿鐵使用 450ml 牛奶」（條件：variantId = "size_large"）
      - 食譜在 recipe_conditions 中有一列
      - 當訂單中存在該特定變體時執行
    
    - **複合條件食譜**（需要多個變體 - AND 邏輯）：
      - 範例：「大杯熱拿鐵使用 450ml 牛奶」（條件："size_large" AND "temp_hot"）
      - 食譜在 recipe_conditions 中有多列
      - 僅當所有指定的變體都存在時執行
      - 支援現實世界的場景，如「加濃僅適用於大杯」（size_large AND option_extra_shot）
    
    - **全域食譜**（menuItemId = NULL）：
      - 範例：「加珍珠修飾項使用 30g 珍珠」
      - 可應用於任何菜單項目
      - 仍然遵守 recipe_conditions（可以是條件式或無條件）

20. **食譜評估邏輯**（具有 AND 邏輯的複合條件匹配）：
    - **問題**：現實世界的食譜需要複合條件（例如，「大杯熱拿鐵」需要的牛奶量與「大杯冰拿鐵」不同）
    - **解決方案**：將效果（recipes 資料表）與原因（recipe_conditions 資料表）分離，並支援 AND 邏輯
    - **執行流程**：
      ```typescript
      // 步驟 1: 從訂單收集變體上下文（來自所選選項的變體 ID）
      const variantContext = new Set<string>(); // 變體 ID 集合
      orderItem.customizations.forEach(customization => {
        customization.selectedOptions.forEach(option => {
          if (option.variantId) {
            variantContext.add(option.variantId); // variants.id 的 FK
          }
        });
      });

      // 步驟 2: 獲取食譜及其條件
      const recipes = await db.query.recipes.findMany({
        where: eq(recipes.menuItemId, orderItem.menuItemId),
        with: {
          conditions: true // 連接 recipe_conditions
        }
      });

      // 步驟 3: 尋找適用食譜（AND 邏輯評估）
      const applicableRecipes = recipes.filter(recipe => {
        // 基礎食譜（零個條件）- 總是適用
        if (recipe.conditions.length === 0) return true;
        
        // 條件食譜 - 必須滿足所有條件（AND 邏輯）
        const allConditionsMet = recipe.conditions.every(condition => 
          variantContext.has(condition.variantId)
        );
        
        return allConditionsMet;
      });

      // 步驟 4: 為每個適用食譜扣除庫存
      for (const recipe of applicableRecipes) {
        await deductInventory(recipe.inventoryItemId, recipe.quantityRequired);
      }
      ```
    
    - **關鍵規則**：食譜執行的充要條件是：
      1. 其 `menuItemId` 與訂單項目匹配（或對於全域食譜為 NULL）
      2. 並且所有連結的 `recipe_conditions` 都已滿足（即，所有需要的變體都存在於 variantContext 中）
      3. 注意：如果食譜沒有條件，它將被視為基礎食譜並自動執行

21. **變體代碼範例 (variants.code)**：
    - **重要**：這些代碼由**後端自動生成**並**對使用者隱藏**
    - **目的**：內部系統邏輯、店家範圍內的唯一性、除錯
    - **格式**：通常為 `category_name_randomstring`（例如：`"size_small_a1b2"`、`"temp_hot_x7y9"`）
    - **範例**：
      - 尺寸變體：`"size_s_k3m5"`、`"size_m_p2q4"`、`"size_l_r6s8"`
      - 溫度：`"temp_hot_t9u1"`、`"temp_iced_v3w5"`
      - 甜度：`"sweet_0_x7y9"`、`"sweet_50_z1a3"`、`"sweet_100_b5c7"`
    - **使用者看到**：僅 `name` 欄位（例如："小杯"、"熱"、"半糖"）
    - **店家隔離**：每個店家都有自己的一組具有唯一代碼的變體
    - **FK 關聯**：
      - CustomizationOption.variantId → Variant.id
      - RecipeCondition.variantId → Variant.id (V1.5 新增)
      - 型別安全的 FK 確保資料完整性，而非魔術字串匹配

22. **修飾項預設邏輯**：
    - `isDefault: true` 表示此選項預設被選中
    - 對於「可移除」的修飾項（例如「不加蔥」），預設選項有食譜，移除選項**沒有**食譜
    - 範例：
      ```
      自訂：「蔥」
      - 選項 1：「標準」（isDefault: true，有食譜：5g 蔥）
      - 選項 2：「不加蔥」（isDefault: false，**沒有**食譜）
      ```

23. **食譜範圍** (V1.5 架構)：
    - **可為空的 menuItemId**：`menuItemId` 欄位決定食譜範圍
      - **NULL**：全域食譜 - 可應用於任何菜單項目（例如：「加珍珠」修飾項）
      - **SET**：限定食譜 - 僅適用於指定的菜單項目
    - **無 modifierOptionId**：此欄位在 V1.5 中已移除
    - **條件定義觸發**：使用 `recipe_conditions` 關聯表定義何時執行食譜
      - 零個條件 = 基礎食譜（無條件）
      - 一個以上條件 = 條件食譜（必須全部滿足 - AND 邏輯）

24. **庫存單位**：使用 `InventoryUnit` 列舉（GRAM, MILLILITER, PIECE, KILOGRAM, LITER）進行精確的三位小數數量追蹤。

25. **使用食譜條件的庫存預留流程 (V1.5)**：
    ```typescript
    import { db } from './db'; // Drizzle 實例
    import { inventoryItems, recipes, recipeConditions } from './schema';
    import { eq, and, isNull, inArray, sql } from 'drizzle-orm';
    
    // ✅ 步驟 1: 使用食譜條件編譯所有適用食譜
    async function compileRecipes(
      storeId: string, // <--- 新增 storeId 參數
      menuItemId: string, 
      variantContext: Set<string> // 來自所選 CustomizationOptions 的變體 ID 集合
    ): Promise<{ inventoryItemId: string; totalQuantityRequired: number }[]> {
      
      // 獲取此 menuItemId 和店家的所有食譜
      const allRecipes = await db.query.recipes.findMany({
        where: and(
          eq(recipes.storeId, storeId), // <--- 關鍵：按店家過濾
          or(
            eq(recipes.menuItemId, menuItemId), // 限定食譜
            isNull(recipes.menuItemId) // 全域食譜
          )
        ),
        with: {
          conditions: true // 連接 recipe_conditions 資料表
        }
      });
      
      // 根據條件過濾食譜（AND 邏輯）
      const applicableRecipes = allRecipes.filter(recipe => {
        // 基礎食譜（零個條件）- 總是適用
        if (recipe.conditions.length === 0) return true;
        
        // 條件食譜 - 必須滿足所有條件（AND 邏輯）
        const allConditionsMet = recipe.conditions.every(condition => 
          variantContext.has(condition.variantId)
        );
        
        return allConditionsMet;
      });
      
      // ✅ 公式：按庫存項目加總數量
      const aggregated = applicableRecipes.reduce((acc, recipe) => {
        acc[recipe.inventoryItemId] = (acc[recipe.inventoryItemId] || 0) + recipe.quantityRequired;
        return acc;
      }, {} as Record<string, number>);
      
      return Object.entries(aggregated).map(([inventoryItemId, quantity]) => ({
        inventoryItemId,
        totalQuantityRequired: quantity
      }));
    }
    
    // ✅ 步驟 2: 在付款前預留庫存（原子更新）
    async function reserveStock(
      compiledRecipes: { inventoryItemId: string; totalQuantityRequired: number }[], 
      orderId: string
    ) {
      await db.transaction(async (tx) => {
        for (const item of compiledRecipes) {
          // 帶有驗證的原子遞減
          const result = await tx.update(inventoryItems)
            .set({ 
              currentStock: sql`${inventoryItems.currentStock} - ${item.totalQuantityRequired}`,
              reservedStock: sql`${inventoryItems.reservedStock} + ${item.totalQuantityRequired}`
            })
            .where(
              and(
                eq(inventoryItems.id, item.inventoryItemId),
                sql`${inventoryItems.currentStock} >= ${item.totalQuantityRequired}` // 防止負庫存
              )
            )
            .returning({ id: inventoryItems.id });
          
          if (result.length === 0) {
            throw new Error(`商品 ${item.inventoryItemId} 庫存不足`);
          }
        }
        
        // 將預留儲存在 Redis 中，並設定 TTL 以在付款失敗時回滾
        await redis.setex(
          `reservation:${orderId}`,
          600, // 10 分鐘 TTL
          JSON.stringify(compiledRecipes)
        );
      });
    }
    ```

26. **低庫存警報**：查詢 `inventoryItems` 其中 `currentStock <= minStock` AND `storeId = <current_store>` 以觸發特定店家的補貨通知。

27. **成本追蹤與財務快照**：
    - 使用 `InventoryItem.costPerUnit` 計算每筆訂單的 COGS（銷貨成本）。
    - **關鍵**：在 `order_items` 資料表中快照 `priceAtOrder` 和 `costAtOrder` 以保持財務準確性：
      - `priceAtOrder`：MenuItem.price + 訂單建立時所選修飾項 `priceDelta` 值的總和
      - `costAtOrder`：計算的 COGS = 訂單建立時 (Recipe.quantityRequired × InventoryItem.costPerUnit) 的總和
    - 這確保即使未來價格/成本變動，歷史報表仍然準確。

### 食譜驅動架構：驗證場景

**場景 1：基於尺寸的數量變化 (避免菜單組合爆炸)**

*問題*：「大杯需要 700ml 茶，中杯需要 500ml」，但不想建立分開的「大杯茶」和「中杯茶」菜單項目。

*解決方案*：使用 Variant 資料表 + RecipeCondition 關聯表進行條件食譜。

```sql
-- 庫存項目
InventoryItem { id: "tea-001", name: "阿薩姆紅茶", unit: MILLILITER }

-- 菜單項目 (單一項目，無重複)
MenuItem { id: "item-001", name: "阿薩姆奶茶", isCombo: false }

-- 變體 (店家範圍)
Variant { id: "var-m", storeId: "store-123", code: "size_m_x7y9", name: "中杯", category: "SIZE" }
Variant { id: "var-l", storeId: "store-123", code: "size_l_k3m5", name: "大杯", category: "SIZE" }

-- 尺寸自訂
MenuItemCustomization { 
  id: "cust-size", 
  menuItemId: "item-001", 
  name: "尺寸",
  type: SINGLE_CHOICE 
}

-- 具有變體 FK 的尺寸選項
CustomizationOption { 
  id: "opt-m", 
  customizationId: "cust-size",
  name: "中杯",
  variantId: "var-m",  ← Variant 資料表 FK
  priceDelta: 0
}

CustomizationOption { 
  id: "opt-l", 
  customizationId: "cust-size",
  name: "大杯",
  variantId: "var-l",  ← Variant 資料表 FK
  priceDelta: 50  // +$0.50
}

-- 食譜 (效果)
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

-- 食譜條件 (原因) - 定義何時執行食譜
RecipeCondition {
  id: "rc-1",
  recipeId: "recipe-m",
  variantId: "var-m"  ← 僅當選擇中杯時執行
}

RecipeCondition {
  id: "rc-2",
  recipeId: "recipe-l",
  variantId: "var-l"  ← 僅當選擇大杯時執行
}
```

*執行*：
- 顧客選擇「大杯」→ `variantContext = {"var-l"}`
- 系統評估食譜：
  - recipe-m 有條件 var-m（不在上下文中）→ 跳過
  - recipe-l 有條件 var-l（在上下文中）→ 執行
- 扣除：700ml 阿薩姆紅茶
- **結果**：無需建立分開的「大杯茶」和「中杯茶」項目！ ✅

---

**場景 2：可移除配料**

*問題*：預設包含蔥，但顧客可以移除。如果移除，不應扣除庫存。

*解決方案*：使用 `isDefault` 標記 + 預設選項的無條件基礎食譜。

```sql
-- 庫存項目
InventoryItem { id: "onion-001", name: "蔥", unit: GRAM }

-- 菜單項目
MenuItem { id: "item-noodle", name: "牛肉麵", isCombo: false }

-- 自訂
MenuItemCustomization { 
  id: "cust-onion", 
  menuItemId: "item-noodle", 
  name: "蔥",
  type: SINGLE_CHOICE 
}

-- 「有蔥」狀態的變體
Variant { id: "var-onion", storeId: "store-123", code: "onion_yes_a1b2", name: "有蔥", category: "INGREDIENT" }

-- 預設選項 (有蔥，有變體)
CustomizationOption { 
  id: "opt-standard", 
  customizationId: "cust-onion",
  name: "標準",
  variantId: "var-onion",  ← 變體 FK
  isDefault: true,  ← 預設選項
  priceDelta: 0
}

-- 移除選項 (無變體，無食譜觸發)
CustomizationOption { 
  id: "opt-no", 
  customizationId: "cust-onion",
  name: "不加蔥",
  variantId: null,  ← 無變體 = 無食譜觸發
  isDefault: false,
  priceDelta: 0
}

-- 食譜 (效果) - 總是綁定到菜單項目
Recipe {
  id: "recipe-onion",
  menuItemId: "item-noodle",
  inventoryItemId: "onion-001",
  quantityRequired: 5  // 5g
}

-- 食譜條件 (原因) - 僅當選擇「有蔥」時
RecipeCondition {
  id: "rc-onion",
  recipeId: "recipe-onion",
  variantId: "var-onion"  ← 僅當選擇標準時執行
}
```

*執行*：
- 顧客選擇「不加蔥」→ `variantContext = {}` (空，無變體)
- 系統評估 recipe-onion：
  - 有條件 var-onion（不在上下文中）→ 跳過
- 無庫存扣除
- **結果**：移除選項不消耗庫存！ ✅

---

**場景 3：具有複合 AND 條件的多維度變體**

*問題*：「大杯需要 700ml 茶，中杯需要 500ml；綠茶類型 = 綠茶庫存，紅茶類型 = 紅茶庫存」

*解決方案*：具有 AND 邏輯的複合 RecipeConditions。

```sql
-- 庫存項目 (不同茶類型)
InventoryItem { id: "green-tea", name: "綠茶", unit: MILLILITER }
InventoryItem { id: "black-tea", name: "紅茶", unit: MILLILITER }

-- 菜單項目
MenuItem { id: "item-tea", name: "奶茶", isCombo: false }

-- 變體
Variant { id: "var-m", storeId: "store-123", code: "size_m_x7y9", name: "中杯", category: "SIZE" }
Variant { id: "var-l", storeId: "store-123", code: "size_l_k3m5", name: "大杯", category: "SIZE" }
Variant { id: "var-green", storeId: "store-123", code: "tea_green_p2q4", name: "綠茶", category: "TEA_TYPE" }
Variant { id: "var-black", storeId: "store-123", code: "tea_black_r6s8", name: "紅茶", category: "TEA_TYPE" }

-- 維度 1：尺寸
MenuItemCustomization { 
  id: "cust-size", 
  menuItemId: "item-tea", 
  name: "尺寸",
  type: SINGLE_CHOICE 
}

CustomizationOption { id: "opt-m", customizationId: "cust-size", name: "中杯", variantId: "var-m", priceDelta: 0 }
CustomizationOption { id: "opt-l", customizationId: "cust-size", name: "大杯", variantId: "var-l", priceDelta: 50 }

-- 維度 2：茶類型
MenuItemCustomization { 
  id: "cust-tea", 
  menuItemId: "item-tea", 
  name: "茶類型",
  type: SINGLE_CHOICE 
}

CustomizationOption { id: "opt-green", customizationId: "cust-tea", name: "綠茶", variantId: "var-green", isDefault: true }
CustomizationOption { id: "opt-black", customizationId: "cust-tea", name: "紅茶", variantId: "var-black", priceDelta: 0 }

-- 食譜 (效果) - 4 個食譜對應 4 種組合
Recipe { id: "recipe-gm", menuItemId: "item-tea", inventoryItemId: "green-tea", quantityRequired: 500 }
Recipe { id: "recipe-gl", menuItemId: "item-tea", inventoryItemId: "green-tea", quantityRequired: 700 }
Recipe { id: "recipe-bm", menuItemId: "item-tea", inventoryItemId: "black-tea", quantityRequired: 500 }
Recipe { id: "recipe-bl", menuItemId: "item-tea", inventoryItemId: "black-tea", quantityRequired: 700 }

-- 食譜條件 (原因) - 複合 AND 邏輯
-- 綠茶中杯：需要 var-green AND var-m
RecipeCondition { id: "rc-gm-1", recipeId: "recipe-gm", variantId: "var-green" }
RecipeCondition { id: "rc-gm-2", recipeId: "recipe-gm", variantId: "var-m" }

-- 綠茶大杯：需要 var-green AND var-l
RecipeCondition { id: "rc-gl-1", recipeId: "recipe-gl", variantId: "var-green" }
RecipeCondition { id: "rc-gl-2", recipeId: "recipe-gl", variantId: "var-l" }

-- 紅茶中杯：需要 var-black AND var-m
RecipeCondition { id: "rc-bm-1", recipeId: "recipe-bm", variantId: "var-black" }
RecipeCondition { id: "rc-bm-2", recipeId: "recipe-bm", variantId: "var-m" }

-- 紅茶大杯：需要 var-black AND var-l
RecipeCondition { id: "rc-bl-1", recipeId: "recipe-bl", variantId: "var-black" }
RecipeCondition { id: "rc-bl-2", recipeId: "recipe-bl", variantId: "var-l" }
```

*執行範例 1*：
- 顧客選擇：中杯 + 綠茶
- `variantContext = {"var-m", "var-green"}`
- 系統評估所有 4 個食譜：
  - recipe-gm: 條件 {var-green, var-m} - 都在 → ✅ 執行
  - recipe-gl: 條件 {var-green, var-l} - var-l 不在 → ❌ 跳過
  - recipe-bm: 條件 {var-black, var-m} - var-black 不在 → ❌ 跳過
  - recipe-bl: 條件 {var-black, var-l} - var-black 不在 → ❌ 跳過
- 扣除：500ml 綠茶 ✅

*執行範例 2*：
- 顧客選擇：大杯 + 紅茶
- `variantContext = {"var-l", "var-black"}`
- 系統評估所有 4 個食譜：
  - recipe-gm: 條件 {var-green, var-m} - 都不在 → ❌ 跳過
  - recipe-gl: 條件 {var-green, var-l} - var-green 不在 → ❌ 跳過
  - recipe-bm: 條件 {var-black, var-m} - var-m 不在 → ❌ 跳過
  - recipe-bl: 條件 {var-black, var-l} - 都在 → ✅ 執行
- 扣除：700ml 紅茶 ✅

*關鍵見解*：
- 每個食譜有 **2 個條件**（複合 AND 邏輯）
- 必須滿足所有條件食譜才會執行
- **不需要 4 個分開的菜單項目**（綠茶中杯、綠茶大杯、紅茶中杯、紅茶大杯）！
- 所需食譜總數：**4**（2 維度 × 2 選項 = 2² 組合）
- 如果 3 維度：**8 食譜**（2³ 組合）

---

### 資料型別與精確度

28. **列舉 (Enums)**：透過 Drizzle 的 `pgEnum` 使用 PostgreSQL 列舉以確保型別安全（OrderStatus、PaymentMethod、CustomizationType、InventoryUnit、InventoryChangeType 等）
29. **時間戳記 (Timestamps)**：使用 `timestamp('column', { mode: 'string', withTimezone: true })` 取得具有時區感知的時間戳記
30. **UUIDs**：使用 `uuid('id').defaultRandom()` 在 PostgreSQL 中正確生成 UUID
31. **小數精確度**：
    - 貨幣價值：`integer('price')`（以分為單位儲存，例如 1299 = $12.99）- **已更改為整數以確保準確性**
    - 庫存數量：`decimal('quantity', { precision: 10, scale: 3 })`（例如 150.5g、700.25ml）
    - 每單位成本：`decimal('cost', { precision: 10, scale: 4 })`（用於精確的成本追蹤）

### 顯示與排序

32. **顯示順序**：在渲染時遵守 `displayOrder` 欄位：
    - Customizations (自訂項目)
    - CustomizationOptions (自訂選項)
    - ComboGroups (套餐群組)
    - ComboGroupItems (套餐群組項目)

---

## 版本歷史

| 版本 | 日期 | 作者 | 變更 |
|------|------|------|------|
| **1.0** | **2026-02-01** | **Simon Chou** | **初始基準 (範圍: v0.2.0 MVP + 庫存 + POS)。翻譯自英文版 1.0** |
