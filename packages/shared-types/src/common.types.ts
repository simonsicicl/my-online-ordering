import { z } from 'zod';

export type UUID = string;
export type ISODateString = string;

export const uuidSchema = z.string().uuid();
export const isoDateSchema = z.string().datetime();

export interface PaginationQuery {
  page?:      number;
  limit?:     number;
  sortBy?:    string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
  page:        number;
  limit:       number;
  total:       number;
  totalPages:  number;
  hasNext:     boolean;
  hasPrevious: boolean;
}

export const paginationQuerySchema = z.object({
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(100).default(20),
  sortBy:    z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type PaginationQueryInput = z.infer<typeof paginationQuerySchema>;
