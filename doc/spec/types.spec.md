# Shared Types Spec — My Online Ordering System
> Source of truth for TypeScript types. Import from `@myordering/shared-types`.
> Full detail: [SHARED_TYPES.md](../SHARED_TYPES.md)

**Package**: `@myordering/shared-types`  
**Path**: `packages/shared-types/src/`

---

## Package Structure

```
packages/shared-types/src/
  order.types.ts        # TypeScript interfaces + Zod schemas for orders
  menu.types.ts         # TypeScript interfaces + Zod schemas for menu
  payment.types.ts      # TypeScript interfaces + Zod schemas for payments
  inventory.types.ts    # TypeScript interfaces + Zod schemas for inventory
  store.types.ts        # TypeScript interfaces + Zod schemas for stores
  user.types.ts         # TypeScript interfaces + Zod schemas for users
  device.types.ts       # TypeScript interfaces + Zod schemas for devices
  notification.types.ts # TypeScript interfaces + Zod schemas for notifications
  common.types.ts       # UUID, ISODateString, etc.
  index.ts              # Re-exports everything
```

**Rule**: Each `*.types.ts` file exports BOTH the TypeScript interface AND the corresponding Zod schema.  
Zod schema name = interface name + `Schema` suffix, e.g. `CreateOrderRequest` → `createOrderRequestSchema`.

```typescript
// order.types.ts — pattern to follow in every types file
import { z } from 'zod';

// 1. Define Zod schema first
export const createOrderRequestSchema = z.object({
  storeId:             z.string().uuid(),
  orderSource:         z.nativeEnum(OrderSource),
  orderType:           z.nativeEnum(OrderType),
  items:               z.array(orderItemInputSchema).min(1),
  scheduledPickupTime: z.string().datetime().optional(),
  notes:               z.string().max(500).optional(),
  discount:            z.number().int().min(0).default(0),
  discountReason:      z.string().optional().nullable(),
});

// 2. Derive TypeScript type from schema (for Request types)
export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;

// 3. For domain model types (DB rows), define interface directly — no Zod needed
export interface Order { /* ... */ }
```

**Import in Lambda handlers**:
```typescript
import { CreateOrderRequest, createOrderRequestSchema } from '@myordering/shared-types';
// then in handler:
const body = validateBody<CreateOrderRequest>(event.body, createOrderRequestSchema);
```

---

## Enums

```typescript
// order.types.ts
export enum OrderSource   { USER_CLIENT = 'USER_CLIENT', KIOSK = 'KIOSK', POS = 'POS' }
export enum OrderType     { DINE_IN = 'DINE_IN', TAKEOUT = 'TAKEOUT' }
export enum OrderStatus   { PENDING = 'PENDING', PAID = 'PAID', PREPARING = 'PREPARING', READY = 'READY', COMPLETED = 'COMPLETED', CANCELLED = 'CANCELLED', REJECTED = 'REJECTED' }
export enum OrderItemType { REGULAR = 'REGULAR', COMBO_PARENT = 'COMBO_PARENT', COMBO_CHILD = 'COMBO_CHILD' }

// payment.types.ts
export enum PaymentMethod  { CARD = 'CARD', CASH = 'CASH', LINEPAY = 'LINEPAY', APPLE_PAY = 'APPLE_PAY', GOOGLE_PAY = 'GOOGLE_PAY' }
export enum PaymentStatus  { PENDING = 'PENDING', PAID = 'PAID', FAILED = 'FAILED', REFUNDED = 'REFUNDED', PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED' }
export enum RefundStatus   { PENDING = 'PENDING', REFUNDED = 'REFUNDED', FAILED = 'FAILED' }

// user.types.ts
export enum UserRole  { USER = 'USER', CASHIER = 'CASHIER', LEAD = 'LEAD', MANAGER = 'MANAGER', MERCHANT = 'MERCHANT', ADMIN = 'ADMIN' }
export enum StaffRole { CASHIER = 'CASHIER', LEAD = 'LEAD', MANAGER = 'MANAGER', MERCHANT = 'MERCHANT' }

// store.types.ts
export enum DayOfWeek { MONDAY = 'monday', TUESDAY = 'tuesday', WEDNESDAY = 'wednesday', THURSDAY = 'thursday', FRIDAY = 'friday', SATURDAY = 'saturday', SUNDAY = 'sunday' }

// inventory.types.ts
export enum InventoryUnit       { GRAM = 'GRAM', MILLILITER = 'MILLILITER', PIECE = 'PIECE', KILOGRAM = 'KILOGRAM', LITER = 'LITER' }
export enum InventoryChangeType { MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT', ORDER_DEDUCTION = 'ORDER_DEDUCTION', RESERVATION = 'RESERVATION', RELEASE = 'RELEASE', RESTOCK = 'RESTOCK', EXPIRATION = 'EXPIRATION', RETURN = 'RETURN' }

// menu.types.ts
export enum CustomizationType { SINGLE_CHOICE = 'SINGLE_CHOICE', MULTIPLE_CHOICE = 'MULTIPLE_CHOICE' }

// device.types.ts
export enum DeviceType     { RECEIPT_PRINTER = 'RECEIPT_PRINTER', KITCHEN_LABEL_PRINTER = 'KITCHEN_LABEL_PRINTER', CARD_READER = 'CARD_READER', CASH_DRAWER = 'CASH_DRAWER', QR_SCANNER = 'QR_SCANNER', KDS_DISPLAY = 'KDS_DISPLAY' }
export enum DeviceStatus   { ONLINE = 'ONLINE', OFFLINE = 'OFFLINE', ERROR = 'ERROR' }
export enum PrintJobType   { RECEIPT = 'RECEIPT', KITCHEN_LABEL = 'KITCHEN_LABEL', REPORT = 'REPORT' }
export enum PrintJobStatus { QUEUED = 'QUEUED', PRINTING = 'PRINTING', COMPLETED = 'COMPLETED', FAILED = 'FAILED' }

// notification.types.ts
export enum NotificationChannel { EMAIL = 'EMAIL', SMS = 'SMS', PUSH = 'PUSH', WEBSOCKET = 'WEBSOCKET' }
export enum NotificationStatus  { PENDING = 'PENDING', SENT = 'SENT', FAILED = 'FAILED' }
```

---

## Domain Types

```typescript
// ── menu.types.ts ─────────────────────────────────────────────────────────────

export interface MenuCategory {
  id: string; storeId: string; name: string; description?: string | null;
  displayOrder: number; isActive: boolean; createdAt: string; updatedAt: string;
}

export interface MenuItem {
  id: string; storeId: string; categoryId: string; name: string;
  description?: string | null;
  price: number;       // cents
  imageUrl?: string | null; isCombo: boolean; isAvailable: boolean; isDeleted: boolean;
  allergens?: string[] | null; tags?: string[] | null; createdAt: string; updatedAt: string;
}

// Variants: store-scoped. code = auto-generated (hidden). name = user-facing.
export interface Variant {
  id: string; storeId: string;
  code: string;        // auto-generated by backend, hidden from users
  name: string;        // user-facing (e.g. "Large")
  category?: string | null; displayOrder: number; isActive: boolean;
  createdAt: string; updatedAt: string;
}

export interface MenuItemCustomization {
  id: string; menuItemId: string; name: string; type: CustomizationType;
  required: boolean; displayOrder: number;
  minSelections?: number | null; maxSelections?: number | null;
  createdAt: string; updatedAt: string;
}

export interface CustomizationOption {
  id: string; customizationId: string; name: string;
  priceDelta: number;  // cents
  variantId?: string | null;  // links to Variant for recipe logic
  isDefault: boolean; isAvailable: boolean; displayOrder: number;
  createdAt: string; updatedAt: string;
}

export interface ComboGroup {
  id: string; menuItemId: string; name: string; description?: string | null;
  required: boolean; allowRepeatedItems: boolean;
  minSelections: number; maxSelections: number; displayOrder: number;
  createdAt: string; updatedAt: string;
}

export interface ComboGroupItem {
  id: string; comboGroupId: string; menuItemId: string;
  isDefault: boolean; priceDelta: number; displayOrder: number;
  createdAt: string; updatedAt: string;
}

// Aggregated response types
export interface StoreMenu { storeId: string; categories: MenuCategoryWithItems[]; }
export interface MenuCategoryWithItems extends MenuCategory { items: MenuItemWithDetails[]; }
export interface MenuItemWithDetails extends MenuItem {
  customizations: MenuItemCustomizationWithOptions[];
  comboGroups?: ComboGroupWithItems[];
}
export interface MenuItemCustomizationWithOptions extends MenuItemCustomization { options: CustomizationOption[]; }
export interface ComboGroupWithItems extends ComboGroup { items: ComboGroupItem[]; }


// ── order.types.ts ────────────────────────────────────────────────────────────

export interface Order {
  id: string; orderNumber: string; storeId: string; userId: string;
  orderSource: OrderSource; orderType: OrderType; status: OrderStatus;
  subtotal: number; tax: number; discount: number;  // all cents
  discountReason?: string | null; total: number;
  scheduledPickupTime?: string | null; notes?: string | null;
  cancelReason?: string | null; cancelledAt?: string | null; cancelledBy?: string | null;
  createdAt: string; updatedAt: string;
}

export interface OrderItem {
  id: string; orderId: string; menuItemId: string; itemName: string;
  itemType: OrderItemType; parentOrderItemId?: string | null;
  quantity: number; unitPrice: number; subtotal: number;  // cents
  priceAtOrder: number;   // SNAPSHOT: price + modifier deltas at order time (cents)
  costAtOrder: number;    // SNAPSHOT: COGS at order time (cents)
  customizations?: OrderItemCustomization[] | null;
  specialInstructions?: string | null; createdAt: string;
}

export interface OrderItemCustomization {
  customizationId: string; name: string; type: CustomizationType;
  selectedOptions: OrderItemSelectedOption[];
}

export interface OrderItemSelectedOption {
  id: string;           // customization_option_id
  name: string; priceDelta: number;
  variantId?: string;   // snapshot for recipe execution
}

export interface OrderStatusHistoryEntry {
  id: string; storeId: string; orderId: string; status: OrderStatus;
  previousStatus?: OrderStatus | null; changedBy?: string | null;
  reason?: string | null; createdAt: string;
}


// ── payment.types.ts ──────────────────────────────────────────────────────────

export interface Payment {
  id: string; orderId: string;
  amount: number; currency: string;  // cents, e.g. "TWD"
  method: PaymentMethod; status: PaymentStatus;
  providerTransactionId?: string | null;
  metadata?: PaymentMetadata | null; paidAt?: string | null;
  createdAt: string; updatedAt: string;
}

export interface PaymentMetadata {
  cashReceived?: number; changeGiven?: number;
  cardLast4?: string; cardBrand?: string; terminalId?: string;
  [key: string]: any;
}

export interface Refund {
  id: string; paymentId: string;
  amount: number; currency: string;
  reason?: string | null; status: RefundStatus;
  providerRefundId?: string | null; processedAt?: string | null;
  createdAt: string;
}


// ── user.types.ts ─────────────────────────────────────────────────────────────

export interface User {
  id: string;  // Cognito Sub ID
  email: string; name: string; phone?: string | null;
  emailVerified: boolean; phoneVerified: boolean; imageUrl?: string | null;
  globalRole: UserRole; createdAt: string; updatedAt: string;
}

export interface UserProfile {
  userId: string; preferences?: UserPreferences | null;
  createdAt: string; updatedAt: string;
}

export interface UserPreferences {
  notifications: NotificationPreferences; language: string;
}

export interface NotificationPreferences { email: boolean; sms: boolean; push: boolean; }


// ── store.types.ts ────────────────────────────────────────────────────────────

export interface Store {
  id: string; name: string; description?: string | null;
  address: string; phone: string; email: string;
  businessHours: BusinessHour[];
  isOpen: boolean; acceptingOrders: boolean; imageUrl?: string | null;
  rating: number; totalReviews: number; createdAt: string; updatedAt: string;
}

export interface BusinessHour {
  day: DayOfWeek; open: string; close: string; isOpen: boolean;
}


// ── inventory.types.ts ────────────────────────────────────────────────────────

export interface InventoryItem {
  id: string; storeId: string; name: string; description?: string | null;
  sku?: string | null; unit: InventoryUnit;
  currentStock: number; reservedStock: number; minStock: number;
  costPerUnit?: number | null; supplier?: string | null; lastRestocked?: string | null;
  createdAt: string; updatedAt: string;
}

export interface Recipe {
  id: string; storeId: string;
  menuItemId?: string | null;  // null = global recipe
  inventoryItemId: string; quantityRequired: number;
  notes?: string | null; createdAt: string; updatedAt: string;
  conditions?: RecipeCondition[];
}

export interface RecipeCondition {
  id: string; recipeId: string; variantId: string; createdAt: string;
}

export interface InventoryLog {
  id: string; inventoryItemId: string; changeType: InventoryChangeType;
  quantityChange: number; stockBefore: number; stockAfter: number;
  reason?: string | null; userId?: string | null; orderId?: string | null;
  createdAt: string;
}


// ── device.types.ts ───────────────────────────────────────────────────────────

export interface Device {
  id: string; storeId: string; name: string; type: DeviceType; status: DeviceStatus;
  ipAddress?: string | null; macAddress?: string | null;
  serialNumber?: string | null; firmwareVersion?: string | null;
  metadata?: DeviceMetadata | null; lastSeen?: string | null;
  createdAt: string; updatedAt: string;
}

export interface DeviceMetadata {
  model?: string; manufacturer?: string;
  capabilities?: string[]; config?: Record<string, any>;
}

export interface PrintJob {
  id: string; deviceId: string; orderId?: string | null;
  type: PrintJobType; status: PrintJobStatus;
  content: PrintJobContent; retryCount: number; errorMessage?: string | null;
  queuedAt: string; startedAt?: string | null; completedAt?: string | null;
}

export interface PrintJobContent {
  orderNumber?: string; items?: any[]; totalAmount?: number;
  customerInfo?: any; template?: string; [key: string]: any;
}


// ── notification.types.ts ─────────────────────────────────────────────────────

export interface Notification {
  id: string; userId: string; type: string;
  channel: NotificationChannel; status: NotificationStatus;
  recipient: string; subject?: string | null; message: string;
  metadata?: NotificationMetadata | null; sentAt?: string | null;
  createdAt: string;
}

export interface NotificationMetadata {
  orderId?: string; storeId?: string; actionUrl?: string;
  priority?: 'high' | 'normal' | 'low'; templateId?: string;
  [key: string]: any;
}
```

---

## API Request/Response Types

```typescript
// ── request.types.ts ──────────────────────────────────────────────────────────

export interface CreateOrderRequest {
  storeId: string;
  items: CreateOrderItemRequest[];
  orderType: OrderType;
  notes?: string;
  discount?: number;        // cents — POS manual override
  discountReason?: string;
  orderSource?: OrderSource;  // default USER_CLIENT
}

export interface CreateOrderItemRequest {
  menuItemId: string; quantity: number;
  customizations?: SelectedCustomizationRequest[];
  specialInstructions?: string;
  childItems?: CreateComboChildItemRequest[];
}

export interface CreateComboChildItemRequest {
  menuItemId: string; quantity: number;
  customizations?: SelectedCustomizationRequest[];
}

export interface SelectedCustomizationRequest {
  customizationId: string; selectedOptionIds: string[];
}

export interface UpdateOrderStatusRequest { status: OrderStatus; reason?: string; }

export interface ProcessPaymentRequest {
  orderId: string; amount: number; method: PaymentMethod;
  providerTransactionId?: string; metadata?: PaymentMetadata;
}

export interface CreateRecipeRequest {
  menuItemId?: string;          // optional: scopes to specific menu item
  inventoryItemId: string; quantityRequired: number; notes?: string;
  conditionVariantIds?: string[];  // variant IDs that trigger this recipe
}

export interface UpdateInventoryRequest {
  currentStock: number; reason: string; changeType: InventoryChangeType;
  lowStockThreshold?: number;
}


// ── response.types.ts ─────────────────────────────────────────────────────────

export interface ApiSuccessResponse<T = any> { success: true; data: T; timestamp: string; }
export interface ApiErrorResponse { success: false; error: ApiError; timestamp: string; }
export interface ApiError { code: string; message: string; details?: ApiErrorDetail[]; }
export interface ApiErrorDetail { field?: string; message: string; }

export interface PaginatedResponse<T> {
  success: true; data: T[]; pagination: PaginationInfo; timestamp: string;
}
export interface PaginationInfo {
  page: number; limit: number; total: number; totalPages: number;
  hasNext: boolean; hasPrevious: boolean;
}


// ── eventbridge.types.ts ──────────────────────────────────────────────────────

export interface EventBridgeEvent<T = any> {
  version: string; id: string; 'detail-type': string; source: string;
  account: string; time: string; region: string; resources: string[]; detail: T;
}

export interface OrderCreatedEvent {
  orderId: string; storeId: string; userId: string;
  total: number; items: OrderItem[];
}

export interface OrderStatusChangedEvent {
  orderId: string; storeId: string;
  previousStatus: OrderStatus; newStatus: OrderStatus; updatedBy?: string;
}

export interface InventoryLowStockEvent {
  storeId: string; inventoryItemId: string; itemName: string;
  currentStock: number; lowStockThreshold: number;
}


// ── common.types.ts ───────────────────────────────────────────────────────────

export type UUID = string;
export type ISODateString = string;  // "2023-12-25T00:00:00.000Z"
```
