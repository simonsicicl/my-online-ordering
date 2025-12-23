DO $$ BEGIN
 CREATE TYPE "CustomizationType" AS ENUM('SINGLE_CHOICE', 'MULTIPLE_CHOICE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "InventoryUnit" AS ENUM('GRAM', 'MILLILITER', 'PIECE', 'KILOGRAM', 'LITER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "InventoryChangeType" AS ENUM('MANUAL_ADJUSTMENT', 'ORDER_DEDUCTION', 'RESERVATION', 'RELEASE', 'RESTOCK', 'EXPIRATION', 'RETURN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "StaffRole" AS ENUM('CASHIER', 'LEAD', 'MANAGER', 'MERCHANT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "UserRole" AS ENUM('USER', 'CASHIER', 'LEAD', 'MANAGER', 'MERCHANT', 'ADMIN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "OrderSource" AS ENUM('USER_CLIENT', 'KIOSK', 'POS');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "OrderType" AS ENUM('DINE_IN', 'TAKEOUT', 'DELIVERY');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "OrderStatus" AS ENUM('PENDING', 'PAID', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED', 'REJECTED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "OrderItemType" AS ENUM('REGULAR', 'COMBO_PARENT', 'COMBO_CHILD');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "PaymentMethod" AS ENUM('CARD', 'CASH', 'LINEPAY', 'APPLE_PAY', 'GOOGLE_PAY');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "PaymentStatus" AS ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "RefundStatus" AS ENUM('PENDING', 'REFUNDED', 'FAILED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "DeviceType" AS ENUM('RECEIPT_PRINTER', 'KITCHEN_LABEL_PRINTER', 'CARD_READER', 'CASH_DRAWER', 'QR_SCANNER', 'KDS_DISPLAY');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "DeviceStatus" AS ENUM('ONLINE', 'OFFLINE', 'ERROR');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "PrintJobType" AS ENUM('RECEIPT', 'KITCHEN_LABEL', 'REPORT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "PrintJobStatus" AS ENUM('QUEUED', 'PRINTING', 'COMPLETED', 'FAILED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "NotificationChannel" AS ENUM('EMAIL', 'SMS', 'PUSH', 'WEBSOCKET');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "NotificationStatus" AS ENUM('PENDING', 'SENT', 'FAILED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storeId" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "DeviceType" NOT NULL,
	"status" "DeviceStatus" DEFAULT 'OFFLINE' NOT NULL,
	"ipAddress" varchar(45),
	"macAddress" varchar(17),
	"serialNumber" varchar(100),
	"firmwareVersion" varchar(50),
	"configuration" jsonb,
	"lastSeen" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "print_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deviceId" uuid NOT NULL,
	"type" "PrintJobType" NOT NULL,
	"status" "PrintJobStatus" DEFAULT 'QUEUED' NOT NULL,
	"content" jsonb NOT NULL,
	"orderId" uuid,
	"priority" varchar(20) DEFAULT 'NORMAL' NOT NULL,
	"queuedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"startedAt" timestamp with time zone,
	"completedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"logoUrl" text,
	"bannerUrl" text,
	"address" jsonb NOT NULL,
	"phone" varchar(50) NOT NULL,
	"email" varchar(255),
	"businessHours" jsonb NOT NULL,
	"deliveryZones" jsonb,
	"isOpen" boolean DEFAULT true NOT NULL,
	"acceptingOrders" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stores_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"phoneNumber" varchar(50),
	"profileImageUrl" text,
	"globalRole" "UserRole" DEFAULT 'USER' NOT NULL,
	"permissions" jsonb,
	"isActive" boolean DEFAULT true NOT NULL,
	"lastLoginAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_profiles" (
	"userId" uuid PRIMARY KEY NOT NULL,
	"dateOfBirth" timestamp with time zone,
	"address" jsonb,
	"preferences" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "store_staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storeId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"role" "StaffRole" NOT NULL,
	"permissions" jsonb,
	"pinCode" varchar(6),
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "menu_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storeId" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"isAvailable" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storeId" uuid NOT NULL,
	"categoryId" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"imageUrl" text,
	"isAvailable" boolean DEFAULT true NOT NULL,
	"isCombo" boolean DEFAULT false NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"tags" jsonb,
	"nutritionInfo" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "menu_item_customizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menuItemId" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "CustomizationType" NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"minSelections" integer DEFAULT 0 NOT NULL,
	"maxSelections" integer DEFAULT 1 NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "combo_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menuItemId" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"required" boolean DEFAULT true NOT NULL,
	"minSelections" integer DEFAULT 1 NOT NULL,
	"maxSelections" integer DEFAULT 1 NOT NULL,
	"allowRepeatedItems" boolean DEFAULT false NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "combo_group_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comboGroupId" uuid NOT NULL,
	"menuItemId" uuid NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"priceDelta" integer DEFAULT 0 NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storeId" uuid NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"description" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customization_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customizationId" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"priceDelta" integer DEFAULT 0 NOT NULL,
	"variantId" uuid,
	"isDefault" boolean DEFAULT false NOT NULL,
	"isAvailable" boolean DEFAULT true NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storeId" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"sku" varchar(100) NOT NULL,
	"unit" "InventoryUnit" NOT NULL,
	"currentStock" integer DEFAULT 0 NOT NULL,
	"reservedStock" integer DEFAULT 0 NOT NULL,
	"minStock" integer DEFAULT 0 NOT NULL,
	"maxStock" integer,
	"costPerUnit" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storeId" uuid NOT NULL,
	"menuItemId" uuid,
	"inventoryItemId" uuid NOT NULL,
	"quantityRequired" integer NOT NULL,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recipe_conditions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipeId" uuid NOT NULL,
	"variantId" uuid NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventoryItemId" uuid NOT NULL,
	"changeType" "InventoryChangeType" NOT NULL,
	"quantityChanged" integer NOT NULL,
	"previousStock" integer NOT NULL,
	"newStock" integer NOT NULL,
	"reason" text,
	"performedBy" uuid,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orderNumber" varchar(50) NOT NULL,
	"storeId" uuid NOT NULL,
	"userId" uuid,
	"source" "OrderSource" NOT NULL,
	"type" "OrderType" NOT NULL,
	"status" "OrderStatus" DEFAULT 'PENDING' NOT NULL,
	"subtotal" integer NOT NULL,
	"tax" integer DEFAULT 0 NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"deliveryFee" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"customerName" varchar(255),
	"customerPhone" varchar(50),
	"customerEmail" varchar(255),
	"deliveryAddress" jsonb,
	"specialInstructions" text,
	"scheduledFor" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_orderNumber_unique" UNIQUE("orderNumber")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orderId" uuid NOT NULL,
	"menuItemId" uuid,
	"parentOrderItemId" uuid,
	"itemType" "OrderItemType" DEFAULT 'REGULAR' NOT NULL,
	"name" varchar(255) NOT NULL,
	"price" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"subtotal" integer NOT NULL,
	"customizations" jsonb,
	"selectedVariantIds" jsonb,
	"specialInstructions" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orderId" uuid NOT NULL,
	"amount" integer NOT NULL,
	"method" "PaymentMethod" NOT NULL,
	"status" "PaymentStatus" DEFAULT 'PENDING' NOT NULL,
	"transactionId" varchar(255),
	"paymentIntentId" varchar(255),
	"metadata" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paymentId" uuid NOT NULL,
	"amount" integer NOT NULL,
	"reason" text,
	"status" "RefundStatus" DEFAULT 'PENDING' NOT NULL,
	"refundTransactionId" varchar(255),
	"metadata" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"type" varchar(100) NOT NULL,
	"channel" "NotificationChannel" NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"data" jsonb,
	"status" "NotificationStatus" DEFAULT 'PENDING' NOT NULL,
	"sentAt" timestamp with time zone,
	"readAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_devices_store_type" ON "devices" ("storeId","type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_devices_status" ON "devices" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_devices_last_seen" ON "devices" ("lastSeen");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_print_jobs_device_status" ON "print_jobs" ("deviceId","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_print_jobs_status" ON "print_jobs" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_print_jobs_queued_at" ON "print_jobs" ("queuedAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stores_status" ON "stores" ("isOpen","acceptingOrders");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_global_role" ON "users" ("globalRole");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_store_staff_user" ON "store_staff" ("storeId","userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_store_staff_role" ON "store_staff" ("storeId","role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_store_staff_active" ON "store_staff" ("isActive");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_menu_categories_store_order" ON "menu_categories" ("storeId","displayOrder");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_menu_items_store_category" ON "menu_items" ("storeId","categoryId","isAvailable");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_menu_items_availability" ON "menu_items" ("isAvailable");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_menu_items_store_combo" ON "menu_items" ("storeId","isCombo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_customizations_item_order" ON "menu_item_customizations" ("menuItemId","displayOrder");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_combo_groups_item_order" ON "combo_groups" ("menuItemId","displayOrder");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_combo_group_item" ON "combo_group_items" ("comboGroupId","menuItemId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_combo_group_items_order" ON "combo_group_items" ("comboGroupId","displayOrder");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_combo_group_items_menu_item" ON "combo_group_items" ("menuItemId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_variants_store_code" ON "variants" ("storeId","code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_variants_category" ON "variants" ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_customization_options_order" ON "customization_options" ("customizationId","displayOrder");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_customization_options_available" ON "customization_options" ("isAvailable");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_customization_options_variant" ON "customization_options" ("variantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_inventory_items_stock" ON "inventory_items" ("currentStock");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_inventory_items_low_stock" ON "inventory_items" ("storeId","currentStock");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_store_sku" ON "inventory_items" ("storeId","sku");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_recipes_store_menu" ON "recipes" ("storeId","menuItemId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_recipes_menu_item" ON "recipes" ("menuItemId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_recipes_inventory_item" ON "recipes" ("inventoryItemId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_recipe_conditions_recipe" ON "recipe_conditions" ("recipeId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_recipe_conditions_variant" ON "recipe_conditions" ("variantId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_recipe_condition" ON "recipe_conditions" ("recipeId","variantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_inventory_logs_item_date" ON "inventory_logs" ("inventoryItemId","createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_inventory_logs_type" ON "inventory_logs" ("changeType");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_user_date" ON "orders" ("userId","createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_store_status_date" ON "orders" ("storeId","status","createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_status_date" ON "orders" ("status","createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_items_order" ON "order_items" ("orderId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_items_parent" ON "order_items" ("parentOrderItemId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_items_type" ON "order_items" ("itemType");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_order" ON "payments" ("orderId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_status_date" ON "payments" ("status","createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_created_at" ON "payments" ("createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_refunds_payment" ON "refunds" ("paymentId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_refunds_status" ON "refunds" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_user_type" ON "notifications" ("userId","type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_status" ON "notifications" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON "notifications" ("createdAt");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "devices" ADD CONSTRAINT "devices_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_deviceId_devices_id_fk" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "store_staff" ADD CONSTRAINT "store_staff_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "store_staff" ADD CONSTRAINT "store_staff_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_categoryId_menu_categories_id_fk" FOREIGN KEY ("categoryId") REFERENCES "menu_categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "menu_item_customizations" ADD CONSTRAINT "menu_item_customizations_menuItemId_menu_items_id_fk" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "combo_groups" ADD CONSTRAINT "combo_groups_menuItemId_menu_items_id_fk" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "combo_group_items" ADD CONSTRAINT "combo_group_items_comboGroupId_combo_groups_id_fk" FOREIGN KEY ("comboGroupId") REFERENCES "combo_groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "combo_group_items" ADD CONSTRAINT "combo_group_items_menuItemId_menu_items_id_fk" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "variants" ADD CONSTRAINT "variants_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customization_options" ADD CONSTRAINT "customization_options_customizationId_menu_item_customizations_id_fk" FOREIGN KEY ("customizationId") REFERENCES "menu_item_customizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customization_options" ADD CONSTRAINT "customization_options_variantId_variants_id_fk" FOREIGN KEY ("variantId") REFERENCES "variants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recipes" ADD CONSTRAINT "recipes_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recipes" ADD CONSTRAINT "recipes_menuItemId_menu_items_id_fk" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recipes" ADD CONSTRAINT "recipes_inventoryItemId_inventory_items_id_fk" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recipe_conditions" ADD CONSTRAINT "recipe_conditions_recipeId_recipes_id_fk" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recipe_conditions" ADD CONSTRAINT "recipe_conditions_variantId_variants_id_fk" FOREIGN KEY ("variantId") REFERENCES "variants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_inventoryItemId_inventory_items_id_fk" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menuItemId_menu_items_id_fk" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_items" ADD CONSTRAINT "order_items_parentOrderItemId_order_items_id_fk" FOREIGN KEY ("parentOrderItemId") REFERENCES "order_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "refunds" ADD CONSTRAINT "refunds_paymentId_payments_id_fk" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
