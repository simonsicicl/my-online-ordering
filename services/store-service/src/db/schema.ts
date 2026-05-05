import {
  pgTable, uuid, varchar, text, boolean, integer,
  timestamp, jsonb, pgEnum, index, uniqueIndex, doublePrecision,
} from 'drizzle-orm/pg-core';

// ── ENUMS ─────────────────────────────────────────────────────────────────────
// Only declare the enums this service owns / references.
// staffRole enum is shared and defined here for store_staff.

export const staffRole = pgEnum('StaffRole', ['CASHIER', 'LEAD', 'MANAGER', 'MERCHANT']);

// ── STORES ────────────────────────────────────────────────────────────────────

export const stores = pgTable('stores', {
  id:              uuid('id').primaryKey().defaultRandom(),
  name:            varchar('name', { length: 255 }).notNull(),
  description:     text('description'),
  address:         text('address').notNull(),
  phone:           varchar('phone', { length: 50 }).notNull(),
  email:           varchar('email', { length: 255 }).notNull(),
  // Interface: [{ day: "monday", open: "10:00", close: "22:00", isOpen: true }]
  businessHours:   jsonb('businessHours').notNull(),
  isOpen:          boolean('isOpen').default(true).notNull(),
  acceptingOrders: boolean('acceptingOrders').default(true).notNull(),
  imageUrl:        varchar('imageUrl', { length: 500 }),
  rating:          doublePrecision('rating').default(0),
  totalReviews:    integer('totalReviews').default(0).notNull(),
  createdAt:       timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:       timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  statusIdx: index('idx_stores_status').on(table.isOpen, table.acceptingOrders),
}));

// ── STORE STAFF ───────────────────────────────────────────────────────────────

export const storeStaff = pgTable('store_staff', {
  id:           uuid('id').primaryKey().defaultRandom(),
  storeId:      uuid('storeId').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  userId:       uuid('userId').notNull(),
  role:         staffRole('role').notNull(),
  isActive:     boolean('isActive').notNull().default(true),
  hiredAt:      timestamp('hiredAt', { withTimezone: true }).defaultNow().notNull(),
  terminatedAt: timestamp('terminatedAt', { withTimezone: true }),
  createdAt:    timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:    timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  storeUserIdx: uniqueIndex('unique_store_staff_user').on(table.storeId, table.userId),
  storeRoleIdx: index('idx_store_staff_store_role').on(table.storeId, table.role),
  userIdx:      index('idx_store_staff_user').on(table.userId),
  activeIdx:    index('idx_store_staff_active').on(table.isActive),
}));
