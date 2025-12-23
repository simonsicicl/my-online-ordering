/**
 * Inventory Item
 * Ingredient-level inventory tracking
 */
export interface InventoryItem {
  id: string;
  storeId: string; // Multi-tenant isolation
  name: string;
  description?: string;
  unit: InventoryUnit;
  currentStock: number;
  minimumStock: number;
  maximumStock?: number;
  costPerUnit: number; // In cents
  supplierName?: string;
  supplierSKU?: string;
  lastRestockDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum InventoryUnit {
  GRAM = 'GRAM', // g - for solids (coffee beans, sugar)
  KILOGRAM = 'KILOGRAM', // kg - for bulk solids
  MILLILITER = 'MILLILITER', // ml - for liquids (milk, syrups)
  LITER = 'LITER', // L - for bulk liquids
  PIECE = 'PIECE', // For countable items (cups, lids, straws)
}

/**
 * Variant - Fully Isolated Store-Scoped Architecture
 * Centralized registry of all selectable options (size, flavor, temperature, etc.)
 * Used for recipe condition matching
 */
export interface Variant {
  id: string;
  storeId: string; // Multi-tenant isolation
  name: string; // Human-readable name (e.g., "Large", "Extra Shot", "Hot")
  category: string; // Grouping (e.g., "Size", "Add-On", "Temperature")
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Recipe - Effect Definition (What Inventory to Deduct)
 * Defines how much inventory to deduct when a menu item is ordered
 * Scoped by menuItemId (NULL = global recipe)
 */
export interface Recipe {
  id: string;
  storeId: string; // Multi-tenant isolation
  menuItemId?: string; // Nullable: NULL=global recipe, SET=scoped to menu item
  inventoryItemId: string; // Which ingredient to deduct
  quantityRequired: number; // How much to deduct
  unit: InventoryUnit; // Unit of measurement
  description?: string; // Human-readable description (e.g., "Large size uses 500ml milk")
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Recipe Condition - Cause Definition (When to Trigger Recipe)
 * Defines which variants must be selected to trigger a recipe
 * Multiple conditions = AND logic
 */
export interface RecipeCondition {
  id: string;
  recipeId: string; // FK to Recipe
  variantId: string; // FK to Variant - must be selected to trigger recipe
  createdAt: Date;
}

/**
 * Inventory Log
 * Audit trail for inventory changes
 */
export interface InventoryLog {
  id: string;
  inventoryItemId: string;
  storeId: string; // Multi-tenant isolation
  changeType: InventoryChangeType;
  quantityBefore: number;
  quantityChanged: number;
  quantityAfter: number;
  orderId?: string; // Reference to order if change was due to order
  userId?: string; // User who made the change
  reason?: string;
  createdAt: Date;
}

export enum InventoryChangeType {
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT', // Manual stock adjustment by staff
  ORDER_DEDUCTION = 'ORDER_DEDUCTION', // Automatic deduction from order
  ORDER_CANCELLATION = 'ORDER_CANCELLATION', // Stock returned from cancelled order
  RESTOCK = 'RESTOCK', // New stock added
  WASTAGE = 'WASTAGE', // Stock lost due to spoilage/damage
  RETURN = 'RETURN', // Stock returned from supplier
}

/**
 * Inventory Reservation
 * Temporary reservation of inventory for pending orders
 */
export interface InventoryReservation {
  reservationId: string;
  orderId: string;
  items: ReservedItem[];
  expiresAt: Date;
}

export interface ReservedItem {
  inventoryItemId: string;
  quantity: number;
  reserved: boolean;
}

/**
 * Recipe Execution Context
 * Context for determining which recipes to apply
 */
export interface RecipeExecutionContext {
  menuItemId: string;
  quantity: number;
  variantIds: Set<string>; // Collected from selected customization options (FK to variants table)
}

/**
 * Compiled Recipe Result
 * Result of recipe compilation for an order item
 */
export interface CompiledRecipe {
  inventoryItemId: string;
  inventoryItemName: string;
  totalQuantity: number;
  unit: InventoryUnit;
  recipes: AppliedRecipe[];
}

export interface AppliedRecipe {
  recipeId: string;
  quantityRequired: number;
  description?: string;
  requiredVariants?: string[]; // Array of variantIds that triggered this recipe (for display)
}
