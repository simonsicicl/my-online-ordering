// src/schema/payments.ts
// Payments and refunds

import { pgTable, uuid, varchar, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { paymentMethod, paymentStatus, refundStatus } from './enums.js';
import { orders } from './orders.js';

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('orderId').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  amount: integer('amount').notNull(), // In cents
  method: paymentMethod('method').notNull(),
  status: paymentStatus('status').default('PENDING').notNull(),
  transactionId: varchar('transactionId', { length: 255 }), // External payment gateway ID
  paymentIntentId: varchar('paymentIntentId', { length: 255 }), // Stripe payment intent ID
  metadata: jsonb('metadata'), // Additional payment gateway data
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  orderIdx: index('idx_payments_order').on(table.orderId),
  statusDateIdx: index('idx_payments_status_date').on(table.status, table.createdAt),
  createdAtIdx: index('idx_payments_created_at').on(table.createdAt)
}));

export const refunds = pgTable('refunds', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('paymentId').references(() => payments.id, { onDelete: 'cascade' }).notNull(),
  amount: integer('amount').notNull(), // In cents
  reason: text('reason'),
  status: refundStatus('status').default('PENDING').notNull(),
  refundTransactionId: varchar('refundTransactionId', { length: 255 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  paymentIdx: index('idx_refunds_payment').on(table.paymentId),
  statusIdx: index('idx_refunds_status').on(table.status)
}));
