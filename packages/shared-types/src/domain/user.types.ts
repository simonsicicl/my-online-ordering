// Forward declaration for Address (to avoid circular dependency)
import type { Address } from './order.types';

/**
 * User
 * Core user entity
 */
export interface User {
  id: string; // Cognito Sub ID (matches database primary key)
  email: string;
  phone?: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  USER = 'USER',
  CASHIER = 'CASHIER',
  LEAD = 'LEAD',
  MANAGER = 'MANAGER',
  MERCHANT = 'MERCHANT',
  ADMIN = 'ADMIN',
}

/**
 * User Profile
 * Extended user profile information
 */
export interface UserProfile {
  userId: string;
  avatarUrl?: string;
  preferences?: UserPreferences;
  savedAddresses?: SavedAddress[];
  updatedAt: Date;
}

export interface SavedAddress extends Address {
  id: string;
  label?: string; // "Home", "Work", etc.
  isDefault: boolean;
}

export interface UserPreferences {
  notifications: NotificationPreferences;
  language: string; // ISO 639-1 (e.g., "en", "zh")
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
}

/**
 * Store Staff
 * Staff member associated with a store
 */
export interface StoreStaff {
  id: string;
  userId: string;
  storeId: string;
  role: StaffRole;
  permissions: UserPermission[];
  isActive: boolean;
  hiredAt: Date;
  terminatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum StaffRole {
  CASHIER = 'CASHIER', // Entry level: POS operations, view orders
  LEAD = 'LEAD', // Shift Leader: + inventory management, shift reports
  MANAGER = 'MANAGER', // Store Manager: + menu editing, staff management, full reports
  MERCHANT = 'MERCHANT', // Owner: + store settings, banking, multi-store access
}

/**
 * User Permissions
 * Granular permission flags for fine-grained access control
 */
export enum UserPermission {
  // Dashboard & Analytics
  VIEW_DASHBOARD = 'VIEW_DASHBOARD',
  VIEW_REPORTS = 'VIEW_REPORTS',
  EXPORT_REPORTS = 'EXPORT_REPORTS',
  // Orders
  VIEW_ORDERS = 'VIEW_ORDERS',
  MANAGE_ORDERS = 'MANAGE_ORDERS',
  CANCEL_ORDERS = 'CANCEL_ORDERS',
  // Menu
  VIEW_MENU = 'VIEW_MENU',
  MANAGE_MENU = 'MANAGE_MENU',
  // Inventory
  VIEW_INVENTORY = 'VIEW_INVENTORY',
  MANAGE_INVENTORY = 'MANAGE_INVENTORY',
  // Staff
  VIEW_STAFF = 'VIEW_STAFF',
  MANAGE_STAFF = 'MANAGE_STAFF',
  // Store Settings
  VIEW_STORE_SETTINGS = 'VIEW_STORE_SETTINGS',
  MANAGE_STORE_SETTINGS = 'MANAGE_STORE_SETTINGS',
  // Devices
  VIEW_DEVICES = 'VIEW_DEVICES',
  MANAGE_DEVICES = 'MANAGE_DEVICES',
}

/**
 * Role Permission Mapping
 * Maps staff roles to their default permissions
 */
export type RolePermissionMap = Record<StaffRole, UserPermission[]>;

