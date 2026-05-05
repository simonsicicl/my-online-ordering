import { z } from 'zod';
import type { UUID, ISODateString } from './common.types';

// ── Enums ──────────────────────────────────────────────────────────────────────

export enum DayOfWeek {
  MONDAY    = 'monday',
  TUESDAY   = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY  = 'thursday',
  FRIDAY    = 'friday',
  SATURDAY  = 'saturday',
  SUNDAY    = 'sunday',
}

// ── Domain Types ───────────────────────────────────────────────────────────────

export interface BusinessHour {
  day:    DayOfWeek;
  open:   string; // "HH:MM"
  close:  string; // "HH:MM"
  isOpen: boolean;
}

export interface Store {
  id:              UUID;
  name:            string;
  description:     string | null;
  address:         string;
  phone:           string;
  email:           string;
  businessHours:   BusinessHour[];
  isOpen:          boolean;
  acceptingOrders: boolean;
  imageUrl:        string | null;
  rating:          number;
  totalReviews:    number;
  createdAt:       ISODateString;
  updatedAt:       ISODateString;
}

export interface StoreStaff {
  id:        UUID;
  storeId:   UUID;
  userId:    UUID;
  role:      import('./user.types').StaffRole;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// ── Request Schemas ────────────────────────────────────────────────────────────

export const businessHourSchema = z.object({
  day:    z.nativeEnum(DayOfWeek),
  open:   z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:MM'),
  close:  z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:MM'),
  isOpen: z.boolean(),
});

export const createStoreRequestSchema = z.object({
  name:          z.string().min(1).max(255),
  description:   z.string().max(1000).optional(),
  address:       z.string().min(1),
  phone:         z.string().max(50),
  email:         z.string().email(),
  businessHours: z.array(businessHourSchema).length(7),
});
export type CreateStoreRequest = z.infer<typeof createStoreRequestSchema>;

export const updateStoreRequestSchema = createStoreRequestSchema.partial().extend({
  imageUrl: z.string().url().optional(),
});
export type UpdateStoreRequest = z.infer<typeof updateStoreRequestSchema>;

export const updateStoreStatusRequestSchema = z.object({
  acceptingOrders: z.boolean(),
  reason:          z.string().max(500).optional(),
});
export type UpdateStoreStatusRequest = z.infer<typeof updateStoreStatusRequestSchema>;
