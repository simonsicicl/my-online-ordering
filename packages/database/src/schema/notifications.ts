// src/schema/notifications.ts
// Notification system

import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { notificationChannel, notificationStatus } from './enums.js';
import { users } from './users.js';

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('userId').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 100 }).notNull(), // e.g., "ORDER_CONFIRMED", "ORDER_READY"
  channel: notificationChannel('channel').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  data: jsonb('data'), // Additional structured data
  status: notificationStatus('status').default('PENDING').notNull(),
  sentAt: timestamp('sentAt', { withTimezone: true }),
  readAt: timestamp('readAt', { withTimezone: true }),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userTypeIdx: index('idx_notifications_user_type').on(table.userId, table.type),
  statusIdx: index('idx_notifications_status').on(table.status),
  createdAtIdx: index('idx_notifications_created_at').on(table.createdAt)
}));
