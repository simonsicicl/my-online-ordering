# Shared Types Specification

**Document Version**: 1.0  
**Last Updated**: December 21, 2025  
**Owner**: Simon Chou  
**Status**: Single Source of Truth (MVP + Inventory + POS Scope)

---

## Purpose

This document defines **ALL shared TypeScript type definitions** used across backend services and frontend applications. It serves as the authoritative contract for data structures and ensures type consistency throughout the system.

**Critical**: This is the **single source of truth** for TypeScript types. All implementations MUST import types from this shared library.

**Target Audience**: AI assistants implementing services, backend developers, frontend developers

---

## Table of Contents

1. [Package Structure](#package-structure)
2. [Domain Types](#domain-types)
3. [API Types](#api-types)
4. [Event Types](#event-types)
5. [Utility Types](#utility-types)
6. [Enums](#enums)

---

## Package Structure

### Shared Types Package

**Package Name**: `@myordering/shared-types`

**Directory Structure**:
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

### Installation & Usage

**Install in Backend Service**:
```bash
npm install @myordering/shared-types
```

**Import in Code**:
```typescript
import { MenuItem, Order, OrderStatus } from '@myordering/shared-types';
```

---

## Domain Types

### Menu Types (`domain/menu.types.ts`)

```typescript
/**
 * Menu Item
 * Represents a product in the restaurant menu (can be a regular item or combo)
 */
export interface MenuItem {
  id: string;
  storeId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number; // In cents (e.g., 1299 = $12.99)
  imageUrl?: string;
  isCombo: boolean; // true if this is a combo/meal set, false for regular item
  isAvailable: boolean;
  isDeleted: boolean;
  customizations?: MenuItemCustomization[]; // For regular items (isCombo=false)
  comboGroups?: ComboGroup[]; // For combos (isCombo=true)
  allergens?: string[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Menu Item Customization
 * A group of customization options (e.g., "Size", "Toppings")
 */
export interface MenuItemCustomization {
  id: string;
  menuItemId: string;
  name: string;
  type: CustomizationType;
  required: boolean;
  displayOrder: number;
  minSelections?: number; // For MULTIPLE_CHOICE type
  maxSelections?: number; // For MULTIPLE_CHOICE type
  options: CustomizationOption[];
  createdAt: Date;
  updatedAt: Date;
}

export enum CustomizationType {
  SINGLE_CHOICE = 'SINGLE_CHOICE',     // Radio button - select exactly one
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE', // Checkbox - select multiple
}

/**
 * Customization Option
 * Individual option within a customization group
 */
export interface CustomizationOption {
  id: string;
  customizationId: string;
  name: string;
  priceDelta: number; // In cents (can be negative for discounts)
  variantId?: string; // FK to Variant.id for strict type-safe variant matching (nullable for non-variant options)
  variant?: Variant; // Can be populated for display
  isDefault: boolean; // Is this the default option? (for removable modifiers)
  isAvailable: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Menu Category
 * Groups menu items into categories
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
 * Full Menu Response
 * Complete menu structure for a store
 */
export interface StoreMenu {
  storeId: string;
  storeName: string;
  categories: MenuCategory[];
}

/**
 * Combo Group
 * A group of items within a combo MenuItem (e.g., "Main Course", "Side Dish", "Drink")
 * Only applicable when MenuItem.isCombo = true
 */
export interface ComboGroup {
  id: string;
  menuItemId: string; // References the MenuItem where isCombo = true
  name: string;
  description?: string;
  required: boolean; // Must customer select from this group?
  allowRepeatedItems: boolean; // Can customer select same item multiple times?
  minSelections: number; // Minimum items to select (usually 1)
  maxSelections: number; // Maximum items to select (usually 1)
  displayOrder: number;
  items: ComboGroupItem[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Combo Group Item
 * An individual item option within a combo group
 */
export interface ComboGroupItem {
  id: string;
  comboGroupId: string;
  menuItemId: string;
  menuItem?: MenuItem; // Can be populated for display
  isDefault: boolean; // Is this the default selection?
  priceDelta: number; // Price adjustment in cents (can be positive for upgrade, negative for discount, 0 for no change)
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
```

---

### Order Types (`domain/order.types.ts`)

```typescript
/**
 * Order
 * Complete order entity
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
  subtotal: number; // Amount in cents (e.g., 15000 = $150.00)
  tax: number; // Amount in cents (e.g., 1550 = $15.50)
  deliveryFee: number; // Amount in cents (e.g., 500 = $5.00)
  discount: number; // Amount in cents (e.g., 1000 = $10.00) - Manual POS discount for v0.2.0, future: automated coupon calculation
  discountReason?: string; // Reason for discount (e.g., \"Manager override\", \"Loyalty reward\"). Extensibility: Can store coupon code in future
  total: number; // Amount in cents (e.g., 16050 = $160.50)
  deliveryAddress?: Address;
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
  // Extensibility: Third-party platforms (UBEREATS, FOODPANDA) can be added in future versions
}

export enum OrderType {
  DINE_IN = 'DINE_IN',
  TAKEOUT = 'TAKEOUT',
  DELIVERY = 'DELIVERY',
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
 * Order Item
 * Individual item in an order (supports self-referencing for combos)
 */
export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  itemName: string; // Denormalized for historical record
  itemType: OrderItemType; // REGULAR | COMBO_PARENT | COMBO_CHILD
  parentOrderItemId?: string; // Self-reference: links COMBO_CHILD to COMBO_PARENT (null for REGULAR and COMBO_PARENT)
  quantity: number;
  unitPrice: number; // Price per unit in cents (e.g., 15000 = $150.00, typically 0 for COMBO_CHILD unless upgrade)
  subtotal: number; // Total price in cents (e.g., 15000 = $150.00)
  // 🔴 SNAPSHOT COLUMNS for Financial Integrity
  priceAtOrder: number; // Snapshot: MenuItem.price + modifier deltas at order time in cents
  costAtOrder: number; // Snapshot: Calculated COGS from Recipe × InventoryItem.costPerUnit at order time in cents
  customizations?: SelectedCustomization[]; // 🔴 CRITICAL: Used by ALL item types (REGULAR, COMBO_PARENT has none, COMBO_CHILD can have)
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
  priceModifier: number; // In cents
}

/**
 * Order Status History
 * Tracks order status changes
 */
export interface OrderStatusHistoryEntry {
  id?: string;
  status: OrderStatus;
  timestamp: Date;
  notes?: string;
  changedBy?: string;
}

/**
 * Address
 * Delivery or billing address
 */
export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  phone?: string;
  coordinates?: Coordinates;
}

export interface Coordinates {
  lat: number;
  lng: number;
}
```

---

### Payment Types (`domain/payment.types.ts`)

```typescript
/**
 * Payment
 * Payment transaction for an order
 */
export interface Payment {
  id: string;
  orderId: string;
  amount: number; // In cents
  currency: string; // ISO 4217 (e.g., "TWD")
  method: PaymentMethod;
  status: PaymentStatus;
  providerTransactionId?: string; // Stripe payment intent ID, LinePay transaction ID, etc.
  metadata?: PaymentMetadata; // Provider-specific data
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
  cashReceived?: number; // For POS cash payments
  changeGiven?: number; // For POS cash payments
  terminalId?: string; // For card terminal payments
}

/**
 * Refund
 * Refund transaction for a payment
 */
export interface Refund {
  id: string;
  paymentId: string;
  amount: number; // Refund amount in cents
  currency: string; // ISO 4217 (e.g., "TWD", "USD")
  reason?: string;
  status: string; // PENDING, COMPLETED, FAILED
  providerRefundId?: string; // Stripe refund ID, LinePay refund ID
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

### User Types (`domain/user.types.ts`)

```typescript
/**
 * User
 * Customer or staff user account
 */
export interface User {
  id: string; // Cognito Sub ID (matches database primary key)
  email: string;
  name: string;
  phone?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  imageUrl?: string;
  globalRole: UserRole; // Global system role (e.g., ADMIN, USER). Store-specific roles are in StoreStaff
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
 * User Profile
 * Extended user information and preferences
 */
export interface UserProfile {
  userId: string;
  savedAddresses?: SavedAddress[]; // Stored as JSONB in database
  preferences?: UserPreferences; // Stored as JSONB in database
  createdAt: Date;
  updatedAt: Date;
}

export interface SavedAddress extends Address {
  id: string;
  label: string; // "Home", "Work", etc.
  isDefault: boolean;
}

export interface UserPreferences {
  notifications: NotificationPreferences;
  language: string; // ISO 639-1 (e.g., "en", "zh")
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
}

/**
 * Store Staff
 * Staff member assigned to a store
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
  CASHIER = 'CASHIER',   // Entry level: POS operations, view orders
  LEAD = 'LEAD',         // Shift Leader: + void orders, manage inventory, process refunds
  MANAGER = 'MANAGER',   // Store Manager: + menu management, staff management, reports
  MERCHANT = 'MERCHANT', // Owner: + store settings, banking, multi-store access
}

/**
 * User Permissions
 * Granular permissions for application-layer authorization logic.
 * These are mapped to StaffRole via RolePermissionMap at runtime.
 */
export enum UserPermission {
  // Dashboard & Analytics
  VIEW_DASHBOARD = 'VIEW_DASHBOARD',
  VIEW_FINANCIAL_REPORTS = 'VIEW_FINANCIAL_REPORTS',
  
  // Menu Management
  VIEW_MENU = 'VIEW_MENU',
  MANAGE_MENU = 'MANAGE_MENU',
  
  // Order Management
  VIEW_ORDERS = 'VIEW_ORDERS',
  MANAGE_ORDERS = 'MANAGE_ORDERS',
  PROCESS_REFUNDS = 'PROCESS_REFUNDS',
  VOID_ORDERS = 'VOID_ORDERS',
  
  // Inventory Management
  VIEW_INVENTORY = 'VIEW_INVENTORY',
  MANAGE_INVENTORY = 'MANAGE_INVENTORY',
  
  // Store Management
  MANAGE_STORE_SETTINGS = 'MANAGE_STORE_SETTINGS',
  MANAGE_STAFF = 'MANAGE_STAFF',
  MANAGE_DEVICES = 'MANAGE_DEVICES',
}

/**
 * Role Permission Mapping
 * Defines which permissions each staff role has access to.
 * This mapping should be implemented at the application layer (not database).
 */
export type RolePermissionMap = Record<StaffRole, UserPermission[]>;
```

---

### Store Types (`domain/store.types.ts`)

```typescript
/**
 * Store
 * Restaurant/merchant store
 */
export interface Store {
  id: string;
  name: string;
  description?: string;
  address: Address;
  phone: string;
  email: string;
  businessHours: BusinessHours[];
  deliveryZones: DeliveryZone[];
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
  open: string; // HH:MM format (e.g., "10:00")
  close: string; // HH:MM format (e.g., "22:00")
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

export interface DeliveryZone {
  id: string;
  name: string;
  radius: number; // In kilometers
  deliveryFee: number; // In cents
}
```

---

### Inventory Types (`domain/inventory.types.ts`)

```typescript
/**
 * Inventory Item
 * Raw ingredient/material used in recipes (decoupled from MenuItem)
 */
export interface InventoryItem {
  id: string;
  storeId: string; // 🔴 Multi-tenant isolation: Each store has its own inventory
  name: string; // "Arabica Coffee Beans", "Whole Milk", "Large Paper Cup"
  description?: string;
  sku?: string; // Stock Keeping Unit
  unit: InventoryUnit;
  currentStock: number; // Support fractional quantities (e.g., 150.5)
  reservedStock: number;
  minStock: number; // Minimum stock threshold for alerts
  availableStock: number; // currentStock - reservedStock (computed)
  isLowStock: boolean; // currentStock <= minStock (computed)
  costPerUnit?: number; // Cost per unit for cost tracking
  supplier?: string;
  lastRestocked?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum InventoryUnit {
  GRAM = 'GRAM',             // g - for solids (coffee beans, sugar)
  MILLILITER = 'MILLILITER', // ml - for liquids (milk, tea)
  PIECE = 'PIECE',           // pcs - for countable items (cups, lids, straws)
  KILOGRAM = 'KILOGRAM',     // kg - for bulk solids
  LITER = 'LITER',           // L - for bulk liquids
}

/**
 * Variant - Fully Isolated Store-Scoped Architecture
 * Master table for variant definitions (replaces magic string variantKey)
 * 
 * KEY DESIGN PRINCIPLES:
 * - Every variant record MUST belong to a specific store (storeId is required)
 * - NO global/shared variants - fully isolated per store
 * - Application-layer seeding: Backend seeds template variants when creating new stores
 * - code: Auto-generated by backend, HIDDEN from users (e.g., "size_large_a1b2c3")
 * - name: User-facing display name (e.g., "Large", "Hot", "50% Sugar")
 * 
 * BENEFITS:
 * - Type-safe FK relationships (no magic strings)
 * - Store independence (each store can customize variant names)
 * - Data integrity (invalid variant IDs rejected by database)
 * - Centralized management (update name once, reflects everywhere)
 */
export interface Variant {
  id: string;
  storeId: string; // NOT NULL - Every variant belongs to a specific store
  code: string; // Auto-generated by backend, hidden from users (e.g., "size_large_x7y9")
  name: string; // User-facing display name (e.g., "Large Size", "Hot")
  category?: string; // Optional grouping for UI (e.g., "SIZE", "TEMPERATURE")
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Recipe - Effect Definition (What Inventory to Deduct)
 * Separated from Cause (recipe_conditions table defines when to trigger)
 * 
 * ARCHITECTURE:
 * - This interface defines the "Effect": which inventory item is consumed and how much
 * - The "Cause" is defined in RecipeCondition interface (when to trigger)
 * - Base Recipe: Recipe with ZERO conditions (executes unconditionally)
 * - Conditional Recipe: Recipe with ONE+ conditions (ALL must be met - AND logic)
 * 
 * SCOPING:
 * - menuItemId NULL: Global recipe (e.g., "Add Pearl" modifier)
 * - menuItemId SET: Scoped to specific menu item
 */
export interface Recipe {
  id: string;
  storeId: string; // FK to Store (multi-tenant isolation)
  menuItemId?: string; // Nullable: NULL=global, SET=scoped to specific menu item
  inventoryItemId: string; // FK to InventoryItem (the raw ingredient consumed)
  quantityRequired: number; // Amount of ingredient required (with 3 decimal precision)
  notes?: string;
  conditions?: RecipeCondition[]; // Optional relation: conditions required to trigger this recipe
  inventoryItem?: InventoryItem; // Optional relation for display
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Recipe Condition - Cause Definition (When to Trigger Recipe)
 * Junction table linking recipes to variants with AND logic
 * 
 * EVALUATION RULES:
 * - ZERO conditions = Base Recipe (unconditional execution)
 * - ONE condition = Single variant requirement (e.g., "Large size only")
 * - MULTIPLE conditions = Composite requirement with AND logic (e.g., "Large AND Hot")
 * 
 * EXAMPLES:
 * - Base Recipe: Large Latte base (no conditions)
 * - Single Condition: Oat Milk option (variantId = "option_oat_milk")
 * - Composite AND: Large Hot Latte (variantId = "size_large" AND "temp_hot")
 */
export interface RecipeCondition {
  id: string;
  recipeId: string; // FK to Recipe
  variantId: string; // FK to Variant (the variant that must be present)
  variant?: Variant; // Optional relation for display
  createdAt: Date;
}

/**
 * Inventory Log
 * History of inventory changes
 */
export interface InventoryLog {
  id: string;
  inventoryItemId: string;
  inventoryItemName?: string; // Denormalized for convenience
  changeType: InventoryChangeType;
  quantityChange: number; // Can be negative for deductions
  stockBefore: number;
  stockAfter: number;
  reason?: string;
  userId?: string;
  orderId?: string;
  createdAt: Date;
}

export enum InventoryChangeType {
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT', // Manual stock adjustment by staff
  ORDER_DEDUCTION = 'ORDER_DEDUCTION',     // Stock consumed by order
  RESERVATION = 'RESERVATION',             // Stock reserved for pending order
  RELEASE = 'RELEASE',                     // Reserved stock released (order cancelled)
  RESTOCK = 'RESTOCK',                     // New stock added
  EXPIRATION = 'EXPIRATION',               // Stock expired/wasted
  RETURN = 'RETURN',                       // Stock returned from supplier
}

/**
 * Inventory Reservation
 * Temporary stock hold for pending orders
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
 * Recipe Execution Context
 * Context for variant matching during recipe execution
 */
export interface RecipeExecutionContext {
  menuItemId: string;
  quantity: number;
  variantIds: Set<string>; // Collected from selected customization options (FK to variants table)
}

/**
 * Compiled Recipe Result
 * Result of compiling all applicable recipes for an order item
 */
export interface CompiledRecipe {
  inventoryItemId: string;
  inventoryItemName: string;
  unit: InventoryUnit;
  totalQuantityRequired: number; // Sum of all applicable recipes
  recipes: AppliedRecipe[];
}

export interface AppliedRecipe {
  recipeId: string;
  sourceId: string; // menuItemId (recipes are scoped to menu items, not modifiers)
  sourceName: string;
  quantityRequired: number;
  requiredVariants?: string[]; // Array of variantIds that triggered this recipe (for display)
}
```

---

### Device Types (`domain/device.types.ts`)

```typescript
/**
 * Device
 * Hardware device (printer, card reader, etc.)
 */
export interface Device {
  id: string;
  storeId: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  ipAddress?: string; // IPv4 or IPv6
  macAddress?: string; // MAC address for device identification
  serialNumber?: string;
  firmwareVersion?: string;
  metadata?: DeviceMetadata; // Device-specific configuration
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
 * Print Job
 * Job queued for a printer device
 */
export interface PrintJob {
  id: string;
  deviceId: string;
  orderId?: string;
  type: PrintJobType;
  status: PrintJobStatus;
  content: PrintJobContent; // JSON print data
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
  // Additional print-specific fields
}
```

---

### Notification Types (`domain/notification.types.ts`)

```typescript
/**
 * Notification
 * Multi-channel notification
 */
export interface Notification {
  id: string;
  userId: string;
  type: string; // Notification type (e.g., ORDER_CONFIRMATION, ORDER_READY)
  channel: NotificationChannel;
  status: NotificationStatus;
  recipient: string; // Email address, phone number, device token, or WebSocket connectionId
  subject?: string;
  message: string;
  metadata?: NotificationData; // Additional context: { orderId?, storeId?, actionUrl? }
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
  [key: string]: any; // Template-specific data
}
```

---

### CRM Types (`domain/crm.types.ts`)

```typescript
// Out of scope for v0.2.0 (MVP + Inventory + POS)
// Future modules: Loyalty Points, Coupons, Customer Tiers, Referrals
// Extensibility: Order.discount and Order.discountReason fields serve as hooks for future coupon integration
```

---

### Platform Types (`domain/platform.types.ts`)

```typescript
// Out of scope for v0.2.0 (MVP + Inventory + POS)
// Future modules: UberEats/Foodpanda webhook integration, menu sync, order import
// Extensibility: OrderSource enum can be extended to include UBEREATS, FOODPANDA in future versions
```

---

## API Types

### Request Types (`api/request.types.ts`)

```typescript
/**
 * Create Order Request
 */
export interface CreateOrderRequest {
  storeId: string;
  orderSource: OrderSource;
  orderType: OrderType;
  items: CreateOrderItemRequest[];
  deliveryAddress?: Address;
  scheduledPickupTime?: string; // ISO 8601
  notes?: string;
}

export interface CreateOrderItemRequest {
  menuItemId: string;
  quantity: number;
  customizations?: SelectedCustomizationRequest[]; // For regular items
  comboSelections?: ComboSelectionRequest[]; // For combos
  specialInstructions?: string;
}

export interface SelectedCustomizationRequest {
  customizationId: string;
  selectedOptionIds: string[]; // Array of CustomizationOption IDs
}

/**
 * Combo Selection Request
 * Customer's selections for each combo group
 */
export interface ComboSelectionRequest {
  groupId: string;
  selectedItemIds: string[]; // Array of ComboGroupItem IDs
}

/**
 * Update Order Status Request
 */
export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  notes?: string;
}

/**
 * Create Payment Intent Request
 */
export interface CreatePaymentIntentRequest {
  orderId: string;
  amount: number; // In cents
  currency: string;
}

/**
 * Process Payment Request (POS)
 */
export interface ProcessPaymentRequest {
  orderId: string;
  amount: number; // In cents
  currency: string;
  paymentMethod: PaymentMethod;
  metadata?: PaymentMetadata;
}

/**
 * Refund Payment Request
 */
export interface RefundPaymentRequest {
  amount: number; // In cents
  reason?: string;
}

/**
 * Update Inventory Request
 */
export interface UpdateInventoryItemRequest {
  currentStock: number;
  minStock?: number;
  costPerUnit?: number;
  reason?: string;
}

/**
 * Bulk Deduct Inventory Request (for order processing)
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
 * Create Recipe Request
 */
export interface CreateRecipeRequest {
  menuItemId?: string; // Nullable: NULL=global recipe, SET=scoped to menu item
  inventoryItemId: string;
  quantityRequired: number;
  notes?: string;
  conditions?: CreateRecipeConditionRequest[]; // Optional: conditions required to trigger this recipe
}

/**
 * Create Recipe Condition Request
 */
export interface CreateRecipeConditionRequest {
  variantId: string; // FK to Variant table
}

/**
 * Compile Recipe Request (get all applicable recipes for an order item)
 */
export interface CompileRecipeRequest {
  menuItemId: string;
  quantity: number;
  selectedCustomizations?: SelectedCustomizationRequest[];
}

/**
 * Validate Coupon Request
 */
export interface ValidateCouponRequest {
  code: string;
  userId: string;
  orderTotal: number; // In cents
}
```

---

### Response Types (`api/response.types.ts`)

```typescript
/**
 * Standard API Success Response
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: string; // ISO 8601
}

/**
 * Standard API Error Response
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
 * Paginated Response
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
 * Type Guards
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

### Pagination Types (`api/pagination.types.ts`)

```typescript
/**
 * Pagination Query Parameters
 */
export interface PaginationParams {
  page?: number; // Default: 1
  limit?: number; // Default: 20, Max: 100
  sortBy?: string; // Column to sort by
  sortOrder?: SortOrder; // ASC or DESC
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * List Orders Query Parameters
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
 * List Menu Items Query Parameters
 */
export interface ListMenuItemsParams extends PaginationParams {
  storeId: string;
  categoryId?: string;
  includeUnavailable?: boolean;
}
```

---

## Event Types

### EventBridge Types (`events/eventbridge.types.ts`)

```typescript
/**
 * EventBridge Event Base
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
  source: string; // Lambda function name
}

/**
 * Order Event Data
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
  deliveryFee: number;
  total: number;
  deliveryAddress?: Address;
  scheduledPickupTime?: string;
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
 * Payment Event Data
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
 * Inventory Event Data
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

## Utility Types

### Common Types (`utils/common.types.ts`)

```typescript
/**
 * UUID String
 */
export type UUID = string;

/**
 * ISO 8601 Timestamp String
 */
export type ISODateTime = string;

/**
 * Amount in Cents
 */
export type AmountInCents = number;

/**
 * Nullable Type
 */
export type Nullable<T> = T | null;

/**
 * Partial Deep
 * Makes all properties optional recursively
 */
export type PartialDeep<T> = {
  [P in keyof T]?: PartialDeep<T[P]>;
};

/**
 * Required Deep
 * Makes all properties required recursively
 */
export type RequiredDeep<T> = {
  [P in keyof T]-?: RequiredDeep<T[P]>;
};

/**
 * Omit Multiple
 * Omit multiple keys from a type
 */
export type OmitMultiple<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

/**
 * Pick Multiple
 * Pick multiple keys from a type
 */
export type PickMultiple<T, K extends keyof T> = Pick<T, K>;

/**
 * JSON Value
 * Represents any valid JSON value
 */
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

/**
 * Deep Readonly
 * Makes all properties readonly recursively
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};

/**
 * Function Type Guards
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

## Enums

### Consolidated Enums

All enums are re-exported from domain types for convenience:

```typescript
// Re-exports from domain types
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

## Package Configuration

### `package.json`

```json
{
  "name": "@myordering/shared-types",
  "version": "1.0.0",
  "description": "Shared TypeScript types for My Online Ordering System",
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

## Usage Examples

### Backend Service Usage

```typescript
// Lambda function in Menu Service
import { MenuItem, MenuCategory, ApiSuccessResponse } from '@myordering/shared-types';
import { db } from './db'; // Drizzle instance
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

### Frontend Usage

```typescript
// React component in User Client
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

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-17 | Simon Chou | Initial shared types specification |
| 1.1 | 2025-12-18 | Simon Chou | Major refactor: Added Recipe types, InventoryItem types, variant matching support |
| 1.2 | 2025-12-18 | Simon Chou | Critical updates: Multi-tenant inventory (storeId), OrderItem snapshots (priceAtOrder, costAtOrder), Recipe mutual exclusivity constraint |
| 1.3 | 2025-12-18 | Simon Chou | Architectural refactor: Self-referencing combo structure (OrderItemType enum, parentOrderItemId), removed ComboSelection interfaces |
| 1.6 | 2025-12-20 | Simon Chou | Added Recipe.storeId for multi-tenant isolation, Added ComboGroup.allowRepeatedItems for configurable repeat selection |
| 1.7 | 2025-12-21 | Simon Chou | Extended StaffRole with LEAD (Shift Leader) role, Added UserPermission enum for granular permissions, Added RolePermissionMap type for role-permission mapping |
### General Guidelines

1. **Import from Shared Package**: Always import types from `@myordering/shared-types`
2. **Type Safety**: Use TypeScript strict mode for maximum type safety
3. **Type Guards**: Use provided type guard functions for runtime type checking
4. **Enums**: Use enums instead of string literals for type safety
5. **Currency**: All monetary values are in **cents** (e.g., 1299 = $12.99)
6. **Dates**: Use ISO 8601 format for date strings
7. **UUIDs**: Use UUID v4 for all IDs
8. **Nullability**: Use `?` for optional fields, not `| null`
9. **JSON Types**: Use `JSONValue` type for JSON columns
10. **Event Data**: Match event data types with EventBridge event schemas

### Inventory & Recipe System

11. **Multi-Tenant Inventory Isolation**: `InventoryItem.storeId` ensures each store maintains independent inventory. When querying or updating stock, ALWAYS filter by `storeId` to prevent cross-store contamination.

12. **Recipe-Driven Architecture**: MenuItem does NOT directly track inventory. All stock consumption is defined through `Recipe` objects.

13. **Recipe Scoping (V1.5)**:
    - `menuItemId` NULL: Global recipe (e.g., "Add Pearl" modifier applies to any item)
    - `menuItemId` SET: Scoped to specific menu item (e.g., "Latte" base recipe)
    - Recipe conditions are defined in separate `RecipeCondition` table (junction with variants)

14. **Variant Matching (V1.5)**: When processing orders, collect `variantId` values from selected `CustomizationOption` objects, then evaluate `RecipeCondition` objects with AND logic.

15. **Example Variant Usage (V1.5)**:
    ```typescript
    // Step 1: Build variant context from order customizations
    const variantContext = new Set<string>();
    orderItem.customizations?.forEach(customization => {
      customization.selectedOptions.forEach(option => {
        if (option.variantId) {
          variantContext.add(option.variantId); // FK to variants.id
        }
      });
    });

    // Step 2: Query recipes with their conditions
    const allRecipes = await db.query.recipes.findMany({
      where: or(
        eq(recipes.menuItemId, orderItem.menuItemId),
        isNull(recipes.menuItemId)
      ),
      with: { conditions: true }
    });

    // Step 3: Compile applicable recipes (AND logic for conditions)
    const applicableRecipes: Recipe[] = [];
    for (const recipe of allRecipes) {
      // Base recipe (no conditions) always applies
      if (!recipe.conditions || recipe.conditions.length === 0) {
        applicableRecipes.push(recipe);
        continue;
      }
      
      // Conditional recipe: ALL conditions must be met (AND logic)
      const allConditionsMet = recipe.conditions.every(condition => 
        variantContext.has(condition.variantId)
      );
      
      if (allConditionsMet) {
        applicableRecipes.push(recipe);
      }
    }

    // Step 4: Deduct inventory for each applicable recipe
    for (const recipe of applicableRecipes) {
      await inventoryService.deduct(
        recipe.inventoryItemId,
        recipe.quantityRequired * orderItem.quantity
      );
    }
    ```

16. **Inventory Units**: Always specify the unit when displaying quantities:
    - GRAM/KILOGRAM: "150.5g", "2.5kg"
    - MILLILITER/LITER: "700ml", "1.5L"
    - PIECE: "5 pcs"

17. **Default Modifiers**: Use `CustomizationOption.isDefault` to determine which options are pre-selected. Removable modifiers (e.g., "No Green Onion") should have `isDefault: false` and no associated recipes.

### Order Structure & Combo Handling

18. **Self-Referencing Order Items**: Combo orders use a parent-child relationship within `order_items`:
    - `REGULAR`: Standard single items (parentOrderItemId is null)
    - `COMBO_PARENT`: Container for combo total price (parentOrderItemId is null, does NOT consume inventory)
    - `COMBO_CHILD`: Actual components of combo (parentOrderItemId references COMBO_PARENT, DOES consume inventory)

19. **Inventory Deduction for Orders**: When processing inventory:
    ```typescript
    for (const item of orderItems) {
      // Skip virtual combo containers
      if (item.itemType === 'COMBO_PARENT') continue;
      
      // Process only REGULAR and COMBO_CHILD items
      if (item.itemType === 'REGULAR' || item.itemType === 'COMBO_CHILD') {
        const recipes = await compileRecipes(item.menuItemId, item.customizations);
        await deductInventory(recipes, item.quantity);
      }
    }
    ```

### Order Financial Integrity

20. **Snapshot Columns**: When creating an `OrderItem`, ALWAYS populate snapshot fields to preserve historical accuracy:
    ```typescript
    const orderItem: OrderItem = {
      // ... other fields
      priceAtOrder: calculateTotalPrice(menuItem, selectedModifiers), // Current price + modifiers
      costAtOrder: calculateCOGS(recipes, inventoryItems), // Current ingredient costs
      // These snapshots remain unchanged even if prices/costs change later
    };
    ```

21. **Price Calculation**: `priceAtOrder = MenuItem.price + sum(CustomizationOption.priceDelta for all selected options)`

22. **Cost Calculation**: `costAtOrder = sum(Recipe.quantityRequired × InventoryItem.costPerUnit for all applicable recipes)`

23. **Historical Reports**: Use `priceAtOrder` and `costAtOrder` for profit margin analysis, not current MenuItem/InventoryItem values, to ensure accuracy even after price changes.

10. **Event Data**: Match event data types with EventBridge event schemas

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|------|
| 1.0 | 2025-12-21 | Simon Chou | Initial Baseline (Scope: v0.2.0 MVP + Inventory + POS) |
