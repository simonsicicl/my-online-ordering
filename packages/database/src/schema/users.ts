// src/schema/users.ts
// User, profile, and staff tables

import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { userRole, staffRole } from './enums.js';
import { stores } from './stores.js';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().notNull(), // Cognito Sub ID (provided by Auth service, not random)
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  phoneNumber: varchar('phoneNumber', { length: 50 }),
  profileImageUrl: text('profileImageUrl'),
  globalRole: userRole('globalRole').default('USER').notNull(), // Global role across system
  permissions: jsonb('permissions'), // Additional granular permissions
  isActive: boolean('isActive').default(true).notNull(),
  lastLoginAt: timestamp('lastLoginAt', { withTimezone: true }),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email),
  globalRoleIdx: index('idx_users_global_role').on(table.globalRole)
}));

export const userProfiles = pgTable('user_profiles', {
  userId: uuid('userId').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  dateOfBirth: timestamp('dateOfBirth', { withTimezone: true }),
  address: jsonb('address'), // { street, city, postalCode, country }
  preferences: jsonb('preferences'), // { language, notifications, etc. }
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
});

export const storeStaff = pgTable('store_staff', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('storeId').references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('userId').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: staffRole('role').notNull(),
  permissions: jsonb('permissions'), // Store-specific permissions
  pinCode: varchar('pinCode', { length: 6 }), // For POS login
  isActive: boolean('isActive').default(true).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  storeUserIdx: uniqueIndex('unique_store_staff_user').on(table.storeId, table.userId),
  roleIdx: index('idx_store_staff_role').on(table.storeId, table.role),
  activeIdx: index('idx_store_staff_active').on(table.isActive)
}));
