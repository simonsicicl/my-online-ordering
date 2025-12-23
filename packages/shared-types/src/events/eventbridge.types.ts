import { OrderStatus, OrderSource, OrderType, PaymentMethod } from '../domain';

/**
 * EventBridge Event Base
 */
export interface EventBridgeEvent<T = any> {
  version: string;
  id: string;
  'detail-type': string;
  source: string;
  account: string;
  time: string;
  region: string;
  resources: string[];
  detail: EventDetail<T>;
}

export interface EventDetail<T = any> {
  eventVersion: string;
  eventType: string;
  timestamp: string;
  correlationId?: string;
  data: T;
  metadata: EventMetadata;
}

export interface EventMetadata {
  userId?: string;
  storeId?: string;
  sessionId?: string;
  ipAddress?: string;
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
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  total: number;
  itemCount: number;
  notes?: string;
}

export interface OrderStatusChangedEventData {
  orderId: string;
  orderNumber: string;
  storeId: string;
  userId: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  changedBy?: string;
  timestamp: string;
  notes?: string;
}

/**
 * Payment Event Data
 */
export interface PaymentSuccessEventData {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  storeId: string;
  userId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  transactionId?: string;
  paidAt: string;
}

/**
 * Inventory Event Data
 */
export interface StockReservedEventData {
  reservationId: string;
  orderId: string;
  items: { inventoryItemId: string; quantity: number }[];
  expiresAt: string;
}

export interface StockLowAlertEventData {
  itemId: string;
  itemName: string;
  storeId: string;
  currentStock: number;
  minimumStock: number;
  recommendedRestock: number;
}
