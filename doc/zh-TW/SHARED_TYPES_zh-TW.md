# 共享型別規範

**文件版本**: 1.0  
**最後更新**: 2025 年 12 月 21 日  
**負責人**: Simon Chou  
**狀態**: 單一資料來源 (MVP + 庫存 + POS 範圍)

---

## 目的

本文件定義了後端服務和前端應用程式中使用的 **所有共享 TypeScript 型別定義**。它作為資料結構的權威契約，確保整個系統的型別一致性。

**重要**: 這是 TypeScript 型別的 **單一資料來源**。所有實作 **必須** 從此共享函式庫匯入型別。

**目標受眾**: 實作服務的 AI 助理、後端開發人員、前端開發人員

---

## 目錄

1. [套件結構](#套件結構)
2. [領域型別](#領域型別)
3. [API 型別](#api-型別)
4. [事件型別](#事件型別)
5. [工具型別](#工具型別)
6. [列舉](#列舉)

---

## 套件結構

### 共享型別套件

**套件名稱**: `@myordering/shared-types`

**目錄結構**:
```
packages/shared-types/
├── src/
│   ├── domain/
│   │   ├── menu.types.ts
│   │   ├── order.types.ts
│   │   ├── payment.types.ts
│   │   ├── user.types.ts
│   │   ├── store.types.ts
│   │   ├── inventory.types.ts
│   │   ├── device.types.ts
│   │   ├── notification.types.ts
│   │   └── crm.types.ts
│   ├── api/
│   │   ├── request.types.ts
│   │   ├── response.types.ts
│   │   └── pagination.types.ts
│   ├── events/
│   │   └── eventbridge.types.ts
│   ├── utils/
│   │   └── common.types.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

### 安裝與使用

**在後端服務中安裝**:
```bash
npm install @myordering/shared-types
```

**在程式碼中匯入**:
```typescript
import { MenuItem, Order, OrderStatus } from '@myordering/shared-types';
```

---

## 領域型別

### 菜單型別 (`domain/menu.types.ts`)

```typescript
/**
 * 菜單項目
 * 表示餐廳菜單中的產品（可以是一般項目或套餐）
 */
export interface MenuItem {
  id: string;
  storeId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number; // 以分為單位（例如 1299 = $12.99）
  imageUrl?: string;
  isCombo: boolean; // true 表示這是套餐/餐點組合，false 表示一般項目
  isAvailable: boolean;
  isDeleted: boolean;
  customizations?: MenuItemCustomization[]; // 用於一般項目（isCombo=false）
  comboGroups?: ComboGroup[]; // 用於套餐（isCombo=true）
  allergens?: string[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 菜單項目客製化
 * 一組客製化選項（例如「尺寸」、「配料」）
 */
export interface MenuItemCustomization {
  id: string;
  menuItemId: string;
  name: string;
  type: CustomizationType;
  required: boolean;
  displayOrder: number;
  minSelections?: number; // 用於 MULTIPLE_CHOICE 類型
  maxSelections?: number; // 用於 MULTIPLE_CHOICE 類型
  options: CustomizationOption[];
  createdAt: Date;
  updatedAt: Date;
}

export enum CustomizationType {
  SINGLE_CHOICE = 'SINGLE_CHOICE',     // 單選按鈕 - 選擇恰好一個
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE', // 複選框 - 選擇多個
}

/**
 * 客製化選項
 * 客製化群組中的個別選項
 */
export interface CustomizationOption {
  id: string;
  customizationId: string;
  name: string;
  priceDelta: number; // 以分為單位（可以是負數表示折扣）
  variantId?: string; // 指向 Variant.id 的外鍵，用於嚴格的型別安全變體匹配（非變體選項可為空）
  variant?: Variant; // 可以填充以供顯示
  isDefault: boolean; // 這是預設選項嗎？（用於可移除的修飾符）
  isAvailable: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 菜單類別
 * 將菜單項目分組到類別中
 */
export interface MenuCategory {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  items?: MenuItem[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 完整菜單回應
 * 店家的完整菜單結構
 */
export interface StoreMenu {
  storeId: string;
  storeName: string;
  categories: MenuCategory[];
}

/**
 * 套餐群組
 * 套餐 MenuItem 中的一組項目（例如「主菜」、「配菜」、「飲料」）
 * 僅在 MenuItem.isCombo = true 時適用
 */
export interface ComboGroup {
  id: string;
  menuItemId: string; // 引用 isCombo = true 的 MenuItem
  name: string;
  description?: string;
  required: boolean; // 顧客必須從此群組選擇嗎？
  allowRepeatedItems: boolean; // 顧客可以多次選擇相同項目嗎？
  minSelections: number; // 要選擇的最少項目數（通常為 1）
  maxSelections: number; // 要選擇的最多項目數（通常為 1）
  displayOrder: number;
  items: ComboGroupItem[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 套餐群組項目
 * 套餐群組中的個別項目選項
 */
export interface ComboGroupItem {
  id: string;
  comboGroupId: string;
  menuItemId: string;
  menuItem?: MenuItem; // 可以填充以供顯示
  isDefault: boolean; // 這是預設選擇嗎？
  priceDelta: number; // 以分為單位的價格調整（可以是正數表示升級，負數表示折扣，0 表示無變化）
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 訂單型別 (`domain/order.types.ts`)

```typescript
/**
 * 訂單
 * 完整訂單實體
 */
export interface Order {
  id: string;
  orderNumber: string;
  storeId: string;
  userId: string;
  orderSource: OrderSource;
  orderType: OrderType;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number; // 以分為單位的金額（例如 15000 = $150.00）
  tax: number; // 以分為單位的金額（例如 1550 = $15.50）
  discount: number; // 以分為單位的金額（例如 1000 = $10.00）- v0.2.0 的手動 POS 折扣，未來：自動化優惠券計算
  discountReason?: string; // 折扣原因（例如「經理覆蓋」、「忠誠度獎勵」）。擴充性：未來可以存儲優惠券代碼
  total: number; // 以分為單位的金額（例如 16050 = $160.50）
  scheduledPickupTime?: Date;
  notes?: string;
  payment?: Payment;
  statusHistory: OrderStatusHistoryEntry[];
  cancelReason?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum OrderSource {
  USER_CLIENT = 'USER_CLIENT',
  KIOSK = 'KIOSK',
  POS = 'POS',
  // 擴充性：第三方平台（UBEREATS、FOODPANDA）可以在未來版本中新增
}

export enum OrderType {
  DINE_IN = 'DINE_IN',
  TAKEOUT = 'TAKEOUT',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PREPARING = 'PREPARING',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

export enum OrderItemType {
  REGULAR = 'REGULAR',
  COMBO_PARENT = 'COMBO_PARENT',
  COMBO_CHILD = 'COMBO_CHILD',
}

/**
 * 訂單項目
 * 訂單中的個別項目（支援套餐的自我引用）
 */
export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  itemName: string; // 為歷史記錄反正規化
  itemType: OrderItemType; // REGULAR | COMBO_PARENT | COMBO_CHILD
  parentOrderItemId?: string; // 自我引用：將 COMBO_CHILD 連結到 COMBO_PARENT（REGULAR 和 COMBO_PARENT 為 null）
  quantity: number;
  unitPrice: number; // 以分為單位的單價（例如 15000 = $150.00，COMBO_CHILD 通常為 0，除非升級）
  subtotal: number; // 以分為單位的總價（例如 15000 = $150.00）
  // 🔴 財務完整性的快照欄位
  priceAtOrder: number; // 快照：訂購時的 MenuItem.price + 修飾符增量（以分為單位）
  costAtOrder: number; // 快照：訂購時從 Recipe × InventoryItem.costPerUnit 計算的 COGS（以分為單位）
  customizations?: SelectedCustomization[]; // 🔴 重要：供所有項目類型使用（REGULAR、COMBO_PARENT 無，COMBO_CHILD 可有）
  specialInstructions?: string;
  createdAt: Date;
}

export interface SelectedCustomization {
  customizationId: string;
  customizationName: string;
  selectedOptions: SelectedOption[];
}

export interface SelectedOption {
  optionId: string;
  optionName: string;
  priceModifier: number; // 以分為單位
}

/**
 * 訂單狀態歷史
 * 追蹤訂單狀態變更
 */
export interface OrderStatusHistoryEntry {
  id?: string;
  status: OrderStatus;
  timestamp: Date;
  notes?: string;
  changedBy?: string;
}
```

---

### 付款型別 (`domain/payment.types.ts`)

```typescript
/**
 * 付款
 * 訂單的付款交易
 */
export interface Payment {
  id: string;
  orderId: string;
  amount: number; // 以分為單位
  currency: string; // ISO 4217（例如「TWD」）
  method: PaymentMethod;
  status: PaymentStatus;
  providerTransactionId?: string; // Stripe 付款意圖 ID、LinePay 交易 ID 等
  metadata?: PaymentMetadata; // 供應商特定資料
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum PaymentMethod {
  CARD = 'CARD',
  CASH = 'CASH',
  LINEPAY = 'LINEPAY',
  APPLE_PAY = 'APPLE_PAY',
  GOOGLE_PAY = 'GOOGLE_PAY',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export interface PaymentMetadata {
  cashReceived?: number; // 用於 POS 現金付款
  changeGiven?: number; // 用於 POS 現金付款
  terminalId?: string; // 用於讀卡機付款
}

/**
 * 退款
 * 付款的退款交易
 */
export interface Refund {
  id: string;
  paymentId: string;
  amount: number; // 以分為單位的退款金額
  currency: string; // ISO 4217（例如「TWD」、「USD」）
  reason?: string;
  status: string; // PENDING、COMPLETED、FAILED
  providerRefundId?: string; // Stripe 退款 ID、LinePay 退款 ID
  processedAt?: Date;
  createdAt: Date;
}

export enum RefundStatus {
  PENDING = 'PENDING',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED',
}
```

---

### 使用者型別 (`domain/user.types.ts`)

```typescript
/**
 * 使用者
 * 顧客或員工使用者帳戶
 */
export interface User {
  id: string; // Cognito Sub ID（符合資料庫主鍵）
  email: string;
  name: string;
  phone?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  imageUrl?: string;
  globalRole: UserRole; // 全域系統角色（例如 ADMIN、USER）。店家特定角色在 StoreStaff 中
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  USER = 'USER',
  CASHIER = 'CASHIER',
  LEAD = 'LEAD',
  MANAGER = 'MANAGER',
  MERCHANT = 'MERCHANT',
  ADMIN = 'ADMIN',
}

/**
 * 使用者檔案
 * 延伸使用者資訊和偏好設定
 */
export interface UserProfile {
  userId: string;
  preferences?: UserPreferences; // 在資料庫中存儲為 JSONB
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  notifications: NotificationPreferences;
  language: string; // ISO 639-1（例如「en」、「zh」）
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
}

/**
 * 店家員工
 * 分配到店家的員工
 */
export interface StoreStaff {
  id: string;
  storeId: string;
  userId: string;
  role: StaffRole;
  isActive: boolean;
  hiredAt: Date;
  terminatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum StaffRole {
  CASHIER = 'CASHIER',   // 入門級：POS 操作、查看訂單
  LEAD = 'LEAD',         // 班次主管：+ 作廢訂單、管理庫存、處理退款
  MANAGER = 'MANAGER',   // 店家經理：+ 菜單管理、員工管理、報表
  MERCHANT = 'MERCHANT', // 擁有者：+ 店家設定、銀行業務、多店存取
}

/**
 * 使用者權限
 * 應用程式層授權邏輯的細粒度權限。
 * 這些權限在執行時透過 RolePermissionMap 映射到 StaffRole。
 */
export enum UserPermission {
  // 儀表板與分析
  VIEW_DASHBOARD = 'VIEW_DASHBOARD',
  VIEW_FINANCIAL_REPORTS = 'VIEW_FINANCIAL_REPORTS',
  
  // 菜單管理
  VIEW_MENU = 'VIEW_MENU',
  MANAGE_MENU = 'MANAGE_MENU',
  
  // 訂單管理
  VIEW_ORDERS = 'VIEW_ORDERS',
  MANAGE_ORDERS = 'MANAGE_ORDERS',
  PROCESS_REFUNDS = 'PROCESS_REFUNDS',
  VOID_ORDERS = 'VOID_ORDERS',
  
  // 庫存管理
  VIEW_INVENTORY = 'VIEW_INVENTORY',
  MANAGE_INVENTORY = 'MANAGE_INVENTORY',
  
  // 店家管理
  MANAGE_STORE_SETTINGS = 'MANAGE_STORE_SETTINGS',
  MANAGE_STAFF = 'MANAGE_STAFF',
  MANAGE_DEVICES = 'MANAGE_DEVICES',
}

/**
 * 角色權限映射
 * 定義每個員工角色可存取的權限。
 * 此映射應在應用程式層實作（非資料庫）。
 */
export type RolePermissionMap = Record<StaffRole, UserPermission[]>;
```

---

### 店家型別 (`domain/store.types.ts`)

```typescript
/**
 * 店家
 * 餐廳/商家店家
 */
export interface Store {
  id: string;
  name: string;
  description?: string;
  address: string;
  phone: string;
  email: string;
  businessHours: BusinessHours[];
  isOpen: boolean;
  acceptingOrders: boolean;
  imageUrl?: string;
  rating?: number;
  totalReviews: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessHours {
  day: DayOfWeek;
  open: string; // HH:MM 格式（例如「10:00」）
  close: string; // HH:MM 格式（例如「22:00」）
  isOpen: boolean;
}

export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

```

---

### 庫存型別 (`domain/inventory.types.ts`)

```typescript
/**
 * 庫存項目
 * 配方中使用的原料/材料（與 MenuItem 解耦）
 */
export interface InventoryItem {
  id: string;
  storeId: string; // 🔴 多租戶隔離：每個店家都有自己的庫存
  name: string; // 「阿拉比卡咖啡豆」、「全脂牛奶」、「大紙杯」
  description?: string;
  sku?: string; // 庫存單位
  unit: InventoryUnit;
  currentStock: number; // 支援分數數量（例如 150.5）
  reservedStock: number;
  minStock: number; // 警報的最低庫存閾值
  availableStock: number; // currentStock - reservedStock（計算得出）
  isLowStock: boolean; // currentStock <= minStock（計算得出）
  costPerUnit?: number; // 用於成本追蹤的單位成本
  supplier?: string;
  lastRestocked?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum InventoryUnit {
  GRAM = 'GRAM',             // g - 用於固體（咖啡豆、糖）
  MILLILITER = 'MILLILITER', // ml - 用於液體（牛奶、茶）
  PIECE = 'PIECE',           // pcs - 用於可計數項目（杯子、蓋子、吸管）
  KILOGRAM = 'KILOGRAM',     // kg - 用於散裝固體
  LITER = 'LITER',           // L - 用於散裝液體
}

/**
 * 變體 - 完全隔離的店家範圍架構
 * 變體定義的主表（取代魔術字串 variantKey）
 * 
 * 關鍵設計原則：
 * - 每個變體記錄 **必須** 屬於特定店家（storeId 為必填）
 * - 沒有全域/共享變體 - 每個店家完全隔離
 * - 應用程式層種子：後端在建立新店家時種子範本變體
 * - code：由後端自動生成，對使用者 **隱藏**（例如「size_large_a1b2c3」）
 * - name：面向使用者的顯示名稱（例如「大杯」、「熱」、「50% 糖」）
 * 
 * 優點：
 * - 型別安全的外鍵關係（無魔術字串）
 * - 店家獨立性（每個店家可以自訂變體名稱）
 * - 資料完整性（無效的變體 ID 被資料庫拒絕）
 * - 集中管理（更新名稱一次，處處反映）
 */
export interface Variant {
  id: string;
  storeId: string; // 非空 - 每個變體都屬於特定店家
  code: string; // 由後端自動生成，對使用者隱藏（例如「size_large_x7y9」）
  name: string; // 面向使用者的顯示名稱（例如「大杯」、「熱」）
  category?: string; // 用於 UI 的可選分組（例如「SIZE」、「TEMPERATURE」）
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 配方 - 效果定義（要扣除的庫存）
 * 與原因分離（recipe_conditions 表定義何時觸發）
 * 
 * 架構：
 * - 此介面定義「效果」：消耗哪個庫存項目以及多少
 * - 「原因」在 RecipeCondition 介面中定義（何時觸發）
 * - 基礎配方：具有零條件的配方（無條件執行）
 * - 條件配方：具有一個或多個條件的配方（必須全部滿足 - AND 邏輯）
 * 
 * 範圍：
 * - menuItemId NULL：全域配方（例如「加珍珠」修飾符）
 * - menuItemId SET：限定於特定菜單項目
 */
export interface Recipe {
  id: string;
  storeId: string; // 指向 Store 的外鍵（多租戶隔離）
  menuItemId?: string; // 可空：NULL=全域，SET=限定於特定菜單項目
  inventoryItemId: string; // 指向 InventoryItem 的外鍵（消耗的原料）
  quantityRequired: number; // 所需原料數量（3 位小數精度）
  notes?: string;
  conditions?: RecipeCondition[]; // 可選關係：觸發此配方所需的條件
  inventoryItem?: InventoryItem; // 用於顯示的可選關係
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 配方條件 - 原因定義（何時觸發配方）
 * 將配方連結到變體的連接表，使用 AND 邏輯
 * 
 * 評估規則：
 * - 零條件 = 基礎配方（無條件執行）
 * - 一個條件 = 單個變體需求（例如「僅大杯」）
 * - 多個條件 = 使用 AND 邏輯的複合需求（例如「大杯且熱」）
 * 
 * 範例：
 * - 基礎配方：大杯拿鐵基底（無條件）
 * - 單個條件：燕麥奶選項（variantId = "option_oat_milk"）
 * - 複合 AND：大杯熱拿鐵（variantId = "size_large" AND "temp_hot"）
 */
export interface RecipeCondition {
  id: string;
  recipeId: string; // 指向 Recipe 的外鍵
  variantId: string; // 指向 Variant 的外鍵（必須存在的變體）
  variant?: Variant; // 用於顯示的可選關係
  createdAt: Date;
}

/**
 * 庫存日誌
 * 庫存變更歷史
 */
export interface InventoryLog {
  id: string;
  inventoryItemId: string;
  inventoryItemName?: string; // 為方便而反正規化
  changeType: InventoryChangeType;
  quantityChange: number; // 可以是負數表示扣除
  stockBefore: number;
  stockAfter: number;
  reason?: string;
  userId?: string;
  orderId?: string;
  createdAt: Date;
}

export enum InventoryChangeType {
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT', // 員工的手動庫存調整
  ORDER_DEDUCTION = 'ORDER_DEDUCTION',     // 訂單消耗的庫存
  RESERVATION = 'RESERVATION',             // 為待處理訂單保留的庫存
  RELEASE = 'RELEASE',                     // 釋放的保留庫存（訂單取消）
  RESTOCK = 'RESTOCK',                     // 新增庫存
  EXPIRATION = 'EXPIRATION',               // 庫存過期/浪費
  RETURN = 'RETURN',                       // 從供應商退回的庫存
}

/**
 * 庫存保留
 * 待處理訂單的臨時庫存保留
 */
export interface InventoryReservation {
  reservationId: string;
  orderId: string;
  items: ReservedItem[];
  expiresAt: Date;
}

export interface ReservedItem {
  inventoryItemId: string;
  quantity: number;
  reserved: boolean;
}

/**
 * 配方執行上下文
 * 配方執行期間變體匹配的上下文
 */
export interface RecipeExecutionContext {
  menuItemId: string;
  quantity: number;
  variantIds: Set<string>; // 從選定的客製化選項收集（指向 variants 表的外鍵）
}

/**
 * 編譯配方結果
 * 編譯訂單項目的所有適用配方的結果
 */
export interface CompiledRecipe {
  inventoryItemId: string;
  inventoryItemName: string;
  unit: InventoryUnit;
  totalQuantityRequired: number; // 所有適用配方的總和
  recipes: AppliedRecipe[];
}

export interface AppliedRecipe {
  recipeId: string;
  sourceId: string; // menuItemId（配方限定於菜單項目，而非修飾符）
  sourceName: string;
  quantityRequired: number;
  requiredVariants?: string[]; // 觸發此配方的 variantId 陣列（用於顯示）
}
```

---

### 裝置型別 (`domain/device.types.ts`)

```typescript
/**
 * 裝置
 * 硬體裝置（印表機、讀卡機等）
 */
export interface Device {
  id: string;
  storeId: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  ipAddress?: string; // IPv4 或 IPv6
  macAddress?: string; // 用於裝置識別的 MAC 位址
  serialNumber?: string;
  firmwareVersion?: string;
  metadata?: DeviceMetadata; // 裝置特定配置
  lastSeen?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum DeviceType {
  RECEIPT_PRINTER = 'RECEIPT_PRINTER',
  KITCHEN_LABEL_PRINTER = 'KITCHEN_LABEL_PRINTER',
  CARD_READER = 'CARD_READER',
  CASH_DRAWER = 'CASH_DRAWER',
  QR_SCANNER = 'QR_SCANNER',
  KDS_DISPLAY = 'KDS_DISPLAY',
}

export enum DeviceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  ERROR = 'ERROR',
}

export interface DeviceMetadata {
  ipAddress?: string;
  macAddress?: string;
  model?: string;
  firmwareVersion?: string;
}

/**
 * 列印作業
 * 為印表機裝置排隊的作業
 */
export interface PrintJob {
  id: string;
  deviceId: string;
  orderId?: string;
  type: PrintJobType;
  status: PrintJobStatus;
  content: PrintJobContent; // JSON 列印資料
  retryCount: number;
  errorMessage?: string;
  queuedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export enum PrintJobType {
  RECEIPT = 'RECEIPT',
  KITCHEN_LABEL = 'KITCHEN_LABEL',
  REPORT = 'REPORT',
}

export enum PrintJobStatus {
  QUEUED = 'QUEUED',
  PRINTING = 'PRINTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface PrintJobContent {
  orderNumber?: string;
  items?: OrderItem[];
  pickupTime?: Date;
  orderSource?: OrderSource;
  customerName?: string;
  // 其他列印特定欄位
}
```

---

### 通知型別 (`domain/notification.types.ts`)

```typescript
/**
 * 通知
 * 多通道通知
 */
export interface Notification {
  id: string;
  userId: string;
  type: string; // 通知類型（例如 ORDER_CONFIRMATION、ORDER_READY）
  channel: NotificationChannel;
  status: NotificationStatus;
  recipient: string; // 電子郵件地址、電話號碼、裝置 token 或 WebSocket connectionId
  subject?: string;
  message: string;
  metadata?: NotificationData; // 其他上下文：{ orderId?、storeId?、actionUrl? }
  sentAt?: Date;
  createdAt: Date;
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  WEBSOCKET = 'WEBSOCKET',
}

export enum NotificationTemplate {
  ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',
  ORDER_STATUS_UPDATE = 'ORDER_STATUS_UPDATE',
  PAYMENT_CONFIRMATION = 'PAYMENT_CONFIRMATION',
  LOW_STOCK_ALERT = 'LOW_STOCK_ALERT',
  DEVICE_OFFLINE = 'DEVICE_OFFLINE',
  LOYALTY_POINTS_EARNED = 'LOYALTY_POINTS_EARNED',
  TIER_UPGRADED = 'TIER_UPGRADED',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export interface NotificationData {
  [key: string]: any; // 範本特定資料
}
```

---

### CRM 型別 (`domain/crm.types.ts`)

```typescript
// v0.2.0（MVP + 庫存 + POS）範圍外
// 未來模組：忠誠度點數、優惠券、顧客等級、推薦
// 擴充性：Order.discount 和 Order.discountReason 欄位作為未來優惠券整合的鉤子
```

---

### 平台型別 (`domain/platform.types.ts`)

```typescript
// v0.2.0（MVP + 庫存 + POS）範圍外
// 未來模組：UberEats/Foodpanda webhook 整合、菜單同步、訂單匯入
// 擴充性：OrderSource 列舉可以在未來版本中擴充以包含 UBEREATS、FOODPANDA
```

---

## API 型別

### 請求型別 (`api/request.types.ts`)

```typescript
/**
 * 建立訂單請求
 */
export interface CreateOrderRequest {
  storeId: string;
  orderSource: OrderSource;
  orderType: OrderType;
  items: CreateOrderItemRequest[];
  scheduledPickupTime?: string; // ISO 8601
  notes?: string;
}

export interface CreateOrderItemRequest {
  menuItemId: string;
  quantity: number;
  customizations?: SelectedCustomizationRequest[]; // 用於一般項目
  comboSelections?: ComboSelectionRequest[]; // 用於套餐
  specialInstructions?: string;
}

export interface SelectedCustomizationRequest {
  customizationId: string;
  selectedOptionIds: string[]; // CustomizationOption ID 陣列
}

/**
 * 套餐選擇請求
 * 顧客為每個套餐群組的選擇
 */
export interface ComboSelectionRequest {
  groupId: string;
  selectedItemIds: string[]; // ComboGroupItem ID 陣列
}

/**
 * 更新訂單狀態請求
 */
export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  notes?: string;
}

/**
 * 建立付款意圖請求
 */
export interface CreatePaymentIntentRequest {
  orderId: string;
  amount: number; // 以分為單位
  currency: string;
}

/**
 * 處理付款請求（POS）
 */
export interface ProcessPaymentRequest {
  orderId: string;
  amount: number; // 以分為單位
  currency: string;
  paymentMethod: PaymentMethod;
  metadata?: PaymentMetadata;
}

/**
 * 退款付款請求
 */
export interface RefundPaymentRequest {
  amount: number; // 以分為單位
  reason?: string;
}

/**
 * 更新庫存請求
 */
export interface UpdateInventoryItemRequest {
  currentStock: number;
  minStock?: number;
  costPerUnit?: number;
  reason?: string;
}

/**
 * 批次扣除庫存請求（用於訂單處理）
 */
export interface BulkDeductInventoryRequest {
  orderId: string;
  items: InventoryDeductionItem[];
}

export interface InventoryDeductionItem {
  inventoryItemId: string;
  quantityRequired: number;
  recipeId?: string;
}

/**
 * 建立配方請求
 */
export interface CreateRecipeRequest {
  menuItemId?: string; // 可空：NULL=全域配方，SET=限定於菜單項目
  inventoryItemId: string;
  quantityRequired: number;
  notes?: string;
  conditions?: CreateRecipeConditionRequest[]; // 可選：觸發此配方所需的條件
}

/**
 * 建立配方條件請求
 */
export interface CreateRecipeConditionRequest {
  variantId: string; // 指向 Variant 表的外鍵
}

/**
 * 編譯配方請求（取得訂單項目的所有適用配方）
 */
export interface CompileRecipeRequest {
  menuItemId: string;
  quantity: number;
  selectedCustomizations?: SelectedCustomizationRequest[];
}

/**
 * 驗證優惠券請求
 */
export interface ValidateCouponRequest {
  code: string;
  userId: string;
  orderTotal: number; // 以分為單位
}
```

---

### 回應型別 (`api/response.types.ts`)

```typescript
/**
 * 標準 API 成功回應
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: string; // ISO 8601
}

/**
 * 標準 API 錯誤回應
 */
export interface ApiErrorResponse {
  success: false;
  error: ApiError;
  timestamp: string; // ISO 8601
}

export interface ApiError {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

/**
 * 分頁回應
 */
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationInfo;
  timestamp: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * 型別守衛
 */
export function isApiSuccessResponse<T>(
  response: ApiSuccessResponse<T> | ApiErrorResponse
): response is ApiSuccessResponse<T> {
  return response.success === true;
}

export function isApiErrorResponse(
  response: ApiSuccessResponse | ApiErrorResponse
): response is ApiErrorResponse {
  return response.success === false;
}
```

---

### 分頁型別 (`api/pagination.types.ts`)

```typescript
/**
 * 分頁查詢參數
 */
export interface PaginationParams {
  page?: number; // 預設：1
  limit?: number; // 預設：20，最大：100
  sortBy?: string; // 要排序的欄位
  sortOrder?: SortOrder; // ASC 或 DESC
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * 列出訂單查詢參數
 */
export interface ListOrdersParams extends PaginationParams {
  storeId?: string;
  userId?: string;
  status?: OrderStatus;
  orderSource?: OrderSource;
  startDate?: string; // ISO 8601
  endDate?: string; // ISO 8601
}

/**
 * 列出菜單項目查詢參數
 */
export interface ListMenuItemsParams extends PaginationParams {
  storeId: string;
  categoryId?: string;
  includeUnavailable?: boolean;
}
```

---

## 事件型別

### EventBridge 型別 (`events/eventbridge.types.ts`)

```typescript
/**
 * EventBridge 事件基礎
 */
export interface EventBridgeEvent<T = any> {
  version: string;
  id: string;
  'detail-type': string;
  source: string;
  account: string;
  time: string; // ISO 8601
  region: string;
  resources: string[];
  detail: EventDetail<T>;
}

export interface EventDetail<T = any> {
  eventVersion: string;
  eventId: string;
  timestamp: string; // ISO 8601
  aggregateId: string;
  aggregateType: string;
  eventData: T;
  metadata: EventMetadata;
}

export interface EventMetadata {
  userId?: string;
  storeId?: string;
  correlationId?: string;
  causationId?: string;
  source: string; // Lambda 函式名稱
}

/**
 * 訂單事件資料
 */
export interface OrderCreatedEventData {
  id: string;
  orderNumber: string;
  storeId: string;
  userId: string;
  orderSource: OrderSource;
  orderType: OrderType;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}

export interface OrderStatusChangedEventData {
  orderId: string;
  orderNumber: string;
  storeId: string;
  userId: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  statusChangedAt: string;
  changedBy?: string;
  notes?: string;
}

/**
 * 付款事件資料
 */
export interface PaymentSuccessEventData {
  paymentId: string;
  orderId: string;
  storeId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  last4?: string;
  stripePaymentIntentId?: string;
  paidAt: string;
}

/**
 * 庫存事件資料
 */
export interface StockReservedEventData {
  reservationId: string;
  orderId: string;
  items: ReservedItem[];
  expiresAt: string;
}

export interface StockLowAlertEventData {
  itemId: string;
  itemName: string;
  storeId: string;
  currentStock: number;
  lowStockThreshold: number;
  recommendedRestock: number;
}
```

---

## 工具型別

### 通用型別 (`utils/common.types.ts`)

```typescript
/**
 * UUID 字串
 */
export type UUID = string;

/**
 * ISO 8601 時間戳字串
 */
export type ISODateTime = string;

/**
 * 以分為單位的金額
 */
export type AmountInCents = number;

/**
 * 可空型別
 */
export type Nullable<T> = T | null;

/**
 * 部分深度
 * 遞迴地使所有屬性可選
 */
export type PartialDeep<T> = {
  [P in keyof T]?: PartialDeep<T[P]>;
};

/**
 * 必填深度
 * 遞迴地使所有屬性必填
 */
export type RequiredDeep<T> = {
  [P in keyof T]-?: RequiredDeep<T[P]>;
};

/**
 * 省略多個
 * 從型別中省略多個鍵
 */
export type OmitMultiple<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

/**
 * 選擇多個
 * 從型別中選擇多個鍵
 */
export type PickMultiple<T, K extends keyof T> = Pick<T, K>;

/**
 * JSON 值
 * 表示任何有效的 JSON 值
 */
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

/**
 * 深度唯讀
 * 遞迴地使所有屬性唯讀
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};

/**
 * 函式型別守衛
 */
export function isString(value: any): value is string {
  return typeof value === 'string';
}

export function isNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean';
}

export function isObject(value: any): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isArray<T>(value: any): value is T[] {
  return Array.isArray(value);
}

export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}
```

---

## 列舉

### 合併列舉

所有列舉都從領域型別重新匯出以方便使用：

```typescript
// 從領域型別重新匯出
export {
  OrderSource,
  OrderType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  RefundStatus,
  UserRole,
  StaffRole,
  UserPermission,
  DayOfWeek,
  DeviceType,
  DeviceStatus,
  PrintJobType,
  PrintJobStatus,
  NotificationChannel,
  NotificationTemplate,
  NotificationStatus,
  InventoryUnit,
  InventoryChangeType,
  RecipeSource,
  LoyaltyPointType,
  TierLevel,
  DiscountType,
  CouponValidationError,
  CustomizationType,
  SortOrder,
} from './domain';
```

---

## 套件配置

### `package.json`

```json
{
  "name": "@myordering/shared-types",
  "version": "1.0.0",
  "description": "My Online Ordering System 的共享 TypeScript 型別",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch",
    "clean": "rm -rf dist",
    "prepublishOnly": "npm run clean && npm run build"
  },
  "keywords": [
    "typescript",
    "types",
    "shared"
  ],
  "author": "Simon Chou",
  "license": "MIT",
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 使用範例

### 後端服務使用

```typescript
// 菜單服務中的 Lambda 函式
import { MenuItem, MenuCategory, ApiSuccessResponse } from '@myordering/shared-types';
import { db } from './db'; // Drizzle 實例
import { menuItems, menuItemCustomizations, customizationOptions } from './schema';
import { eq, and, asc } from 'drizzle-orm';

export async function handler(event: any): Promise<ApiSuccessResponse<MenuItem[]>> {
  const storeId = event.pathParameters.storeId;
  
  const items = await db.query.menuItems.findMany({
    where: and(
      eq(menuItems.storeId, storeId),
      eq(menuItems.isAvailable, true),
      eq(menuItems.isDeleted, false)
    ),
    with: {
      customizations: {
        orderBy: asc(menuItemCustomizations.displayOrder),
        with: {
          options: {
            where: eq(customizationOptions.isAvailable, true),
            orderBy: asc(customizationOptions.displayOrder)
          }
        }
      }
    }
  });
  
  return {
    success: true,
    data: items as MenuItem[],
    timestamp: new Date().toISOString(),
  };
}
```

### 前端使用

```typescript
// 使用者客戶端中的 React 元件
import React, { useState, useEffect } from 'react';
import { StoreMenu, MenuItem, ApiSuccessResponse } from '@myordering/shared-types';
import axios from 'axios';

export const MenuPage: React.FC = () => {
  const [menu, setMenu] = useState<StoreMenu | null>(null);
  
  useEffect(() => {
    const fetchMenu = async () => {
      const response = await axios.get<ApiSuccessResponse<StoreMenu>>(
        '/api/v1/menu/store-123'
      );
      
      if (response.data.success) {
        setMenu(response.data.data);
      }
    };
    
    fetchMenu();
  }, []);
  
  return (
    <div>
      {menu?.categories.map((category) => (
        <div key={category.id}>
          <h2>{category.name}</h2>
          {category.items?.map((item) => (
            <MenuItem key={item.id} item={item} />
          ))}
        </div>
      ))}
    </div>
  );
};
```

---

## 一般指引

### 一般準則

1. **從共享套件匯入**：始終從 `@myordering/shared-types` 匯入型別
2. **型別安全**：使用 TypeScript 嚴格模式以獲得最大型別安全性
3. **型別守衛**：使用提供的型別守衛函式進行執行時型別檢查
4. **列舉**：使用列舉而非字串字面值以獲得型別安全性
5. **貨幣**：所有貨幣值以 **分** 為單位（例如 1299 = $12.99）
6. **日期**：對日期字串使用 ISO 8601 格式
7. **UUID**：對所有 ID 使用 UUID v4
8. **可空性**：對可選欄位使用 `?`，而非 `| null`
9. **JSON 型別**：對 JSON 欄位使用 `JSONValue` 型別
10. **事件資料**：將事件資料型別與 EventBridge 事件架構匹配

### 庫存與配方系統

11. **多租戶庫存隔離**：`InventoryItem.storeId` 確保每個店家維護獨立庫存。查詢或更新庫存時，**始終** 按 `storeId` 過濾以防止跨店污染。

12. **配方驅動架構**：MenuItem 不直接追蹤庫存。所有庫存消耗都透過 `Recipe` 物件定義。

13. **配方範圍（V1.5）**：
    - `menuItemId` NULL：全域配方（例如「加珍珠」修飾符適用於任何項目）
    - `menuItemId` SET：限定於特定菜單項目（例如「拿鐵」基礎配方）
    - 配方條件在單獨的 `RecipeCondition` 表中定義（與變體的連接）

14. **變體匹配（V1.5）**：處理訂單時，從選定的 `CustomizationOption` 物件收集 `variantId` 值，然後使用 AND 邏輯評估 `RecipeCondition` 物件。

15. **變體使用範例（V1.5）**：
    ```typescript
    // 步驟 1：從訂單客製化建立變體上下文
    const variantContext = new Set<string>();
    orderItem.customizations?.forEach(customization => {
      customization.selectedOptions.forEach(option => {
        if (option.variantId) {
          variantContext.add(option.variantId); // 指向 variants.id 的外鍵
        }
      });
    });

    // 步驟 2：查詢配方及其條件
    const allRecipes = await db.query.recipes.findMany({
      where: or(
        eq(recipes.menuItemId, orderItem.menuItemId),
        isNull(recipes.menuItemId)
      ),
      with: { conditions: true }
    });

    // 步驟 3：編譯適用的配方（條件的 AND 邏輯）
    const applicableRecipes: Recipe[] = [];
    for (const recipe of allRecipes) {
      // 基礎配方（無條件）始終適用
      if (!recipe.conditions || recipe.conditions.length === 0) {
        applicableRecipes.push(recipe);
        continue;
      }
      
      // 條件配方：必須滿足所有條件（AND 邏輯）
      const allConditionsMet = recipe.conditions.every(condition => 
        variantContext.has(condition.variantId)
      );
      
      if (allConditionsMet) {
        applicableRecipes.push(recipe);
      }
    }

    // 步驟 4：為每個適用的配方扣除庫存
    for (const recipe of applicableRecipes) {
      await inventoryService.deduct(
        recipe.inventoryItemId,
        recipe.quantityRequired * orderItem.quantity
      );
    }
    ```

16. **庫存單位**：顯示數量時始終指定單位：
    - GRAM/KILOGRAM：「150.5g」、「2.5kg」
    - MILLILITER/LITER：「700ml」、「1.5L」
    - PIECE：「5 pcs」

17. **預設修飾符**：使用 `CustomizationOption.isDefault` 來確定哪些選項已預先選擇。可移除的修飾符（例如「不加蔥」）應該有 `isDefault: false` 且沒有關聯的配方。

### 訂單結構與套餐處理

18. **自我引用訂單項目**：套餐訂單在 `order_items` 中使用父子關係：
    - `REGULAR`：標準單項（parentOrderItemId 為 null）
    - `COMBO_PARENT`：套餐總價的容器（parentOrderItemId 為 null，**不** 消耗庫存）
    - `COMBO_CHILD`：套餐的實際組成部分（parentOrderItemId 引用 COMBO_PARENT，**會** 消耗庫存）

19. **訂單的庫存扣除**：處理庫存時：
    ```typescript
    for (const item of orderItems) {
      // 跳過虛擬套餐容器
      if (item.itemType === 'COMBO_PARENT') continue;
      
      // 僅處理 REGULAR 和 COMBO_CHILD 項目
      if (item.itemType === 'REGULAR' || item.itemType === 'COMBO_CHILD') {
        const recipes = await compileRecipes(item.menuItemId, item.customizations);
        await deductInventory(recipes, item.quantity);
      }
    }
    ```

### 訂單財務完整性

20. **快照欄位**：建立 `OrderItem` 時，**始終** 填充快照欄位以保留歷史準確性：
    ```typescript
    const orderItem: OrderItem = {
      // ... 其他欄位
      priceAtOrder: calculateTotalPrice(menuItem, selectedModifiers), // 目前價格 + 修飾符
      costAtOrder: calculateCOGS(recipes, inventoryItems), // 目前原料成本
      // 即使價格/成本稍後更改，這些快照也保持不變
    };
    ```

21. **價格計算**：`priceAtOrder = MenuItem.price + sum(所有選定選項的 CustomizationOption.priceDelta)`

22. **成本計算**：`costAtOrder = sum(所有適用配方的 Recipe.quantityRequired × InventoryItem.costPerUnit)`

23. **歷史報表**：使用 `priceAtOrder` 和 `costAtOrder` 進行利潤率分析，而非目前的 MenuItem/InventoryItem 值，以確保即使價格變更後也能保持準確性。

---

## 版本歷史

| 版本 | 日期 | 作者 | 變更 |
|------|------|------|------|
| 1.0 | 2025-12-17 | Simon Chou | 初始共享型別規範 |
| 1.1 | 2025-12-18 | Simon Chou | 重大重構：新增 Recipe 型別、InventoryItem 型別、變體匹配支援 |
| 1.2 | 2025-12-18 | Simon Chou | 重要更新：多租戶庫存（storeId）、OrderItem 快照（priceAtOrder、costAtOrder）、Recipe 互斥約束 |
| 1.3 | 2025-12-18 | Simon Chou | 架構重構：自我引用套餐結構（OrderItemType 列舉、parentOrderItemId），移除 ComboSelection 介面 |
| 1.6 | 2025-12-20 | Simon Chou | 新增 Recipe.storeId 用於多租戶隔離，新增 ComboGroup.allowRepeatedItems 用於可配置的重複選擇 |
| 1.7 | 2025-12-21 | Simon Chou | 擴充 StaffRole 與 LEAD（班次主管）角色，新增 UserPermission 列舉用於細粒度權限，新增 RolePermissionMap 型別用於角色權限映射 |

---

## 聯絡方式

**型別規範負責人**: Simon Chou  
**問題**：請參閱內嵌註解或透過專案儲存庫聯絡
