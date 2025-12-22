// Forward declaration for Variant (to avoid circular dependency)
import type { Variant } from './inventory.types';

/**
 * Menu Item
 * Represents a product in the restaurant menu (can be a regular item or combo)
 */
export interface MenuItem {
  id: string;
  storeId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number; // In cents (e.g., 1299 = $12.99)
  imageUrl?: string;
  isCombo: boolean; // true if this is a combo/meal set, false for regular item
  isAvailable: boolean;
  isDeleted: boolean;
  customizations?: MenuItemCustomization[]; // For regular items (isCombo=false)
  comboGroups?: ComboGroup[]; // For combos (isCombo=true)
  allergens?: string[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Menu Item Customization
 * A group of customization options (e.g., "Size", "Toppings")
 */
export interface MenuItemCustomization {
  id: string;
  menuItemId: string;
  name: string;
  type: CustomizationType;
  required: boolean;
  displayOrder: number;
  minSelections?: number; // For MULTIPLE_CHOICE type
  maxSelections?: number; // For MULTIPLE_CHOICE type
  options: CustomizationOption[];
  createdAt: Date;
  updatedAt: Date;
}

export enum CustomizationType {
  SINGLE_CHOICE = 'SINGLE_CHOICE', // Radio button - select exactly one
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE', // Checkbox - select multiple
}

/**
 * Customization Option
 * Individual option within a customization group
 */
export interface CustomizationOption {
  id: string;
  customizationId: string;
  name: string;
  priceDelta: number; // In cents (can be negative for discounts)
  variantId?: string; // FK to Variant.id for strict type-safe variant matching (nullable for non-variant options)
  variant?: Variant; // Can be populated for display
  isDefault: boolean; // Is this the default option? (for removable modifiers)
  isAvailable: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Menu Category
 * Groups menu items into categories
 */
export interface MenuCategory {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  items?: MenuItem[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Full Menu Response
 * Complete menu structure for a store
 */
export interface StoreMenu {
  storeId: string;
  storeName: string;
  categories: MenuCategory[];
}

/**
 * Combo Group
 * A group of items within a combo MenuItem (e.g., "Main Course", "Side Dish", "Drink")
 * Only applicable when MenuItem.isCombo = true
 */
export interface ComboGroup {
  id: string;
  menuItemId: string; // References the MenuItem where isCombo = true
  name: string;
  description?: string;
  required: boolean; // Must customer select from this group?
  allowRepeatedItems: boolean; // Can customer select same item multiple times?
  minSelections: number; // Minimum items to select (usually 1)
  maxSelections: number; // Maximum items to select (usually 1)
  displayOrder: number;
  items: ComboGroupItem[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Combo Group Item
 * An individual item option within a combo group
 */
export interface ComboGroupItem {
  id: string;
  comboGroupId: string;
  menuItemId: string;
  menuItem?: MenuItem; // Can be populated for display
  isDefault: boolean; // Is this the default selection?
  priceDelta: number; // Price adjustment in cents (can be positive for upgrade, negative for discount, 0 for no change)
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

