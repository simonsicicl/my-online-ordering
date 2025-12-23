// Forward declaration for Payment (to avoid circular dependency)
import type { Payment } from './payment.types';

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
  discountReason?: string; // Reason for discount (e.g., "Manager override", "Loyalty reward"). Extensibility: Can store coupon code in future
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
  priceAtOrder: number; // Price snapshot at time of order (in cents)
  costAtOrder: number; // Cost snapshot at time of order (in cents)
  customizations?: SelectedCustomization[];
  specialInstructions?: string;
  comboGroupId?: string; // For COMBO_CHILD: which ComboGroup this belongs to
  comboGroupName?: string; // For COMBO_CHILD: denormalized group name
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
 * Track status changes over time
 */
export interface OrderStatusHistoryEntry {
  id?: string;
  orderId: string;
  status: OrderStatus;
  timestamp: Date;
  changedBy?: string;
}

/**
 * Address
 * Delivery or pickup address
 */
export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  coordinates?: Coordinates;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

