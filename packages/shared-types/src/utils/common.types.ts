/**
 * UUID String
 */
export type UUID = string;

/**
 * ISO 8601 Timestamp String
 */
export type ISODateTime = string;

/**
 * Amount in Cents
 */
export type AmountInCents = number;

/**
 * Nullable Type
 */
export type Nullable<T> = T | null;

/**
 * Partial Deep
 * Make all properties and nested properties optional
 */
export type PartialDeep<T> = {
  [P in keyof T]?: PartialDeep<T[P]>;
};

/**
 * Required Deep
 * Make all properties and nested properties required
 */
export type RequiredDeep<T> = {
  [P in keyof T]-?: RequiredDeep<T[P]>;
};

/**
 * Omit Multiple
 * Omit multiple properties from a type
 */
export type OmitMultiple<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

/**
 * Pick Multiple
 * Pick multiple properties from a type
 */
export type PickMultiple<T, K extends keyof T> = Pick<T, K>;

/**
 * JSON Value
 * Represents any valid JSON value
 */
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

/**
 * Deep Readonly
 * Make all properties and nested properties readonly
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};

/**
 * Function Type Guards
 */
export function isString(value: any): value is string {
  return typeof value === 'string';
}

export function isNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean';
}

export function isObject(value: any): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isArray<T>(value: any): value is T[] {
  return Array.isArray(value);
}

export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}
