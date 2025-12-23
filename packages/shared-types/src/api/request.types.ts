import {
  OrderType,
  OrderSource,
  Address,
  PaymentMethod,
  PaymentMetadata,
  OrderStatus,
} from '../domain';

/**
 * Create Order Request
 */
export interface CreateOrderRequest {
  storeId: string;
  orderType: OrderType;
  orderSource: OrderSource;
  items: CreateOrderItemRequest[];
  deliveryAddress?: Address;
  scheduledPickupTime?: Date;
  notes?: string;
}

export interface CreateOrderItemRequest {
  menuItemId: string;
  quantity: number;
  customizations?: SelectedCustomizationRequest[];
  comboSelections?: ComboSelectionRequest[];
  specialInstructions?: string;
}

export interface SelectedCustomizationRequest {
  customizationId: string;
  selectedOptionIds: string[]; // Array of CustomizationOption IDs
}

/**
 * Combo Selection Request
 * Used when ordering a combo item
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
  method: PaymentMethod;
  amount: number; // In cents
  currency: string;
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
  minimumStock?: number;
  maximumStock?: number;
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
  quantity: number;
  recipeId?: string;
}

/**
 * Create Recipe Request
 */
export interface CreateRecipeRequest {
  menuItemId?: string; // Nullable: NULL=global recipe, SET=scoped to menu item
  inventoryItemId: string;
  quantityRequired: number;
  unit: string;
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
