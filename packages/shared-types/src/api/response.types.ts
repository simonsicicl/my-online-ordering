/**
 * Standard API Success Response
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: string; // ISO 8601
}

/**
 * Standard API Error Response
 */
export interface ApiErrorResponse {
  success: false;
  error: ApiError;
  timestamp: string; // ISO 8601
}

export interface ApiError {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationInfo;
  timestamp: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Type Guards
 */
export function isApiSuccessResponse<T>(
  response: ApiSuccessResponse<T> | ApiErrorResponse
): response is ApiSuccessResponse<T> {
  return response.success === true;
}

export function isApiErrorResponse(
  response: ApiSuccessResponse | ApiErrorResponse
): response is ApiErrorResponse {
  return response.success === false;
}
