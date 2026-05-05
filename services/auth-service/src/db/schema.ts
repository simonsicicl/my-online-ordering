import {
  pgTable, uuid, varchar, boolean, timestamp, jsonb, index, pgEnum,
} from 'drizzle-orm/pg-core';

// ── Enums ──────────────────────────────────────────────────────────────────────

export const userRole = pgEnum('UserRole', [
  'USER', 'CASHIER', 'LEAD', 'MANAGER', 'MERCHANT', 'ADMIN',
]);

// ── Tables ─────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id:            uuid('id').primaryKey().notNull(), // Cognito Sub ID
  email:         varchar('email', { length: 255 }).notNull().unique(),
  name:          varchar('name', { length: 255 }).notNull(),
  phone:         varchar('phone', { length: 50 }),
  emailVerified: boolean('emailVerified').default(false).notNull(),
  phoneVerified: boolean('phoneVerified').default(false).notNull(),
  imageUrl:      varchar('imageUrl', { length: 500 }),
  globalRole:    userRole('globalRole').notNull().default('USER'),
  createdAt:     timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:     timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  globalRoleIdx: index('idx_users_global_role').on(table.globalRole),
}));

export const userProfiles = pgTable('user_profiles', {
  userId:      uuid('userId').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  // Interface: { notifications: { email: bool, sms: bool, push: bool }, language: 'en' }
  preferences: jsonb('preferences'),
  createdAt:   timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:   timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
});
