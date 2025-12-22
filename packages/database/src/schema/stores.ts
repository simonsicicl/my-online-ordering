// src/schema/stores.ts
// Store entity and related tables

import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

export const stores = pgTable('stores', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  logoUrl: text('logoUrl'),
  bannerUrl: text('bannerUrl'),
  address: jsonb('address').notNull(), // { street, city, postalCode, country, coordinates: { lat, lng } }
  phone: varchar('phone', { length: 50 }).notNull(),
  email: varchar('email', { length: 255 }),
  businessHours: jsonb('businessHours').notNull(), // { [day]: { open, close, isClosed } }
  deliveryZones: jsonb('deliveryZones'), // [{ name, radius, minimumOrder, deliveryFee }]
  isOpen: boolean('isOpen').default(true).notNull(),
  acceptingOrders: boolean('acceptingOrders').default(true).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  statusIdx: index('idx_stores_status').on(table.isOpen, table.acceptingOrders)
}));
