import { z } from 'zod';
import type { UUID, ISODateString } from './common.types';

// ── Enums ──────────────────────────────────────────────────────────────────────

export enum UserRole {
  USER     = 'USER',
  CASHIER  = 'CASHIER',
  LEAD     = 'LEAD',
  MANAGER  = 'MANAGER',
  MERCHANT = 'MERCHANT',
  ADMIN    = 'ADMIN',
}

export enum StaffRole {
  CASHIER  = 'CASHIER',
  LEAD     = 'LEAD',
  MANAGER  = 'MANAGER',
  MERCHANT = 'MERCHANT',
}

// ── Domain Types ───────────────────────────────────────────────────────────────

export interface User {
  id:            UUID;
  email:         string;
  name:          string;
  phone:         string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  imageUrl:      string | null;
  globalRole:    UserRole;
  createdAt:     ISODateString;
  updatedAt:     ISODateString;
}

export interface UserProfile {
  userId:      UUID;
  preferences: UserPreferences | null;
  createdAt:   ISODateString;
  updatedAt:   ISODateString;
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    sms:   boolean;
    push:  boolean;
  };
  language: string;
}

export interface AuthTokenContext {
  userId: UUID;
  email:  string;
  role:   UserRole;
}

// ── Request Schemas ────────────────────────────────────────────────────────────

export const registerRequestSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8).max(128),
  name:     z.string().min(1).max(255),
  phone:    z.string().max(50).optional(),
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  email:    z.string().email(),
  password: z.string(),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;

// ── Response Types ─────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken:  string;
  refreshToken: string;
  idToken:      string;
  expiresIn:    number;
  tokenType:    'Bearer';
}

export interface LoginResponse extends AuthTokens {
  user: Pick<User, 'id' | 'email' | 'name' | 'globalRole'>;
}

export interface RegisterResponse {
  userId:        UUID;
  email:         string;
  name:          string;
  emailVerified: boolean;
}
