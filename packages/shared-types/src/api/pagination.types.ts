import { OrderStatus, OrderSource } from '../domain';

/**
 * Pagination Query Parameters
 */
export interface PaginationParams {
  page?: number; // Default: 1
  limit?: number; // Default: 20
  sortBy?: string; // Field to sort by
  sortOrder?: SortOrder; // ASC or DESC
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * List Orders Query Parameters
 */
export interface ListOrdersParams extends PaginationParams {
  storeId?: string;
  status?: OrderStatus;
  source?: OrderSource;
  userId?: string;
  startDate?: string; // ISO 8601
  endDate?: string; // ISO 8601
}

/**
 * List Menu Items Query Parameters
 */
export interface ListMenuItemsParams extends PaginationParams {
  storeId: string;
  categoryId?: string;
  includeUnavailable?: boolean;
}
