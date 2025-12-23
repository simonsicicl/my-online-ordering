/**
 * Payment
 * Payment transaction record
 */
export interface Payment {
  id: string;
  orderId: string;
  amount: number; // In cents
  currency: string; // ISO 4217 (e.g., "USD", "TWD")
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string; // External payment gateway transaction ID
  metadata?: PaymentMetadata;
  refunds?: Refund[];
  createdAt: Date;
  updatedAt: Date;
}

export enum PaymentMethod {
  CARD = 'CARD',
  CASH = 'CASH',
  LINE_PAY = 'LINE_PAY',
  APPLE_PAY = 'APPLE_PAY',
  GOOGLE_PAY = 'GOOGLE_PAY',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
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
 * Refund transaction record
 */
export interface Refund {
  id: string;
  paymentId: string;
  amount: number; // In cents
  reason?: string;
  status: RefundStatus;
  refundedBy?: string;
  transactionId?: string;
  createdAt: Date;
}

export enum RefundStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}
