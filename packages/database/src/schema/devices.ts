// src/schema/devices.ts
// Device registry and print jobs

import { pgTable, uuid, varchar, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { deviceType, deviceStatus, printJobType, printJobStatus } from './enums.js';
import { stores } from './stores.js';

export const devices = pgTable('devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('storeId').references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: deviceType('type').notNull(),
  status: deviceStatus('status').default('OFFLINE').notNull(),
  ipAddress: varchar('ipAddress', { length: 45 }),
  macAddress: varchar('macAddress', { length: 17 }),
  serialNumber: varchar('serialNumber', { length: 100 }),
  firmwareVersion: varchar('firmwareVersion', { length: 50 }),
  configuration: jsonb('configuration'), // Device-specific settings
  lastSeen: timestamp('lastSeen', { withTimezone: true }),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  storeTypeIdx: index('idx_devices_store_type').on(table.storeId, table.type),
  statusIdx: index('idx_devices_status').on(table.status),
  lastSeenIdx: index('idx_devices_last_seen').on(table.lastSeen)
}));

export const printJobs = pgTable('print_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: uuid('deviceId').references(() => devices.id, { onDelete: 'cascade' }).notNull(),
  type: printJobType('type').notNull(),
  status: printJobStatus('status').default('QUEUED').notNull(),
  content: jsonb('content').notNull(), // Print data (receipt, label, etc.)
  orderId: uuid('orderId'), // Reference to order if applicable
  priority: varchar('priority', { length: 20 }).default('NORMAL').notNull(),
  queuedAt: timestamp('queuedAt', { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp('startedAt', { withTimezone: true }),
  completedAt: timestamp('completedAt', { withTimezone: true })
}, (table) => ({
  deviceStatusIdx: index('idx_print_jobs_device_status').on(table.deviceId, table.status),
  statusIdx: index('idx_print_jobs_status').on(table.status),
  queuedAtIdx: index('idx_print_jobs_queued_at').on(table.queuedAt)
}));
