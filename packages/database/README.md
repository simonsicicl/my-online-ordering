# @myordering/database

Database layer with Drizzle ORM for My Online Ordering System.

## Overview

This package provides a type-safe database layer using Drizzle ORM with PostgreSQL. It includes:

- Complete schema definitions for all entities
- Database connection management
- Migration utilities
- Type-safe query builder

## Installation

```bash
pnpm install @myordering/database
```

## Usage

### Basic Connection

```typescript
import { createDatabase, schema } from '@myordering/database';

// Create database instance
const db = createDatabase({
  connectionString: process.env.DATABASE_URL
});

// Query example
const stores = await db.select().from(schema.stores);
```

### Using Default Instance

```typescript
import { getDatabase, schema } from '@myordering/database';

const db = getDatabase();
const orders = await db.select().from(schema.orders).where(eq(schema.orders.status, 'PENDING'));
```

## Schema Structure

The database schema is organized into the following domains:

- **stores**: Store configuration and settings
- **users**: User accounts, profiles, and staff
- **menus**: Menu items, categories, customizations, combos
- **inventory**: Inventory items, variants, recipes, conditions
- **orders**: Orders and order items
- **payments**: Payments and refunds
- **devices**: Hardware devices and print jobs
- **notifications**: Notification system

## Migrations

### Generate Migration

```bash
pnpm db:generate
```

### Apply Migrations

```bash
pnpm db:migrate
```

### Push Schema (Development)

```bash
pnpm db:push
```

### Studio (Database Browser)

```bash
pnpm db:studio
```

## Environment Variables

```env
DATABASE_URL=postgresql://user:password@host:5432/database
```

## Recipe-Driven Inventory System

This schema implements a sophisticated recipe-driven inventory system:

1. **Variants**: Store-scoped variant registry (size, temperature, etc.)
2. **Recipes**: Define WHAT inventory to deduct (Effect)
3. **RecipeConditions**: Define WHEN to trigger recipes (Cause)
4. **Inventory Deduction**: Automatic ingredient tracking based on order variants

### Example Flow

```
Order: Large Hot Latte
├─ Selected Variants: [size_large, temp_hot]
├─ Recipe Matching: Find recipes where ALL conditions match
│  ├─ Recipe 1: No conditions → Base recipe (unconditional)
│  └─ Recipe 2: Conditions [size_large, temp_hot] → Match! ✓
└─ Inventory Deduction: Execute matched recipe's inventory deduction
```

## Multi-Tenancy

All tables are isolated by `storeId` to ensure data separation between stores.

## Type Safety

All database operations are fully type-safe thanks to Drizzle ORM and TypeScript.

```typescript
// Type-safe query
const result = await db.query.menuItems.findMany({
  where: eq(schema.menuItems.storeId, storeId),
  with: {
    category: true,
    customizations: {
      with: {
        options: true
      }
    }
  }
});
```

## License

MIT
