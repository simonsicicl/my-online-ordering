# @myordering/shared-types

Shared TypeScript types for My Online Ordering System.

## Overview

This package contains all shared TypeScript type definitions used across backend services and frontend applications. It serves as the single source of truth for data structures and ensures type consistency throughout the system.

## Installation

```bash
npm install @myordering/shared-types
# or
pnpm add @myordering/shared-types
```

## Usage

```typescript
import { MenuItem, Order, OrderStatus, User } from '@myordering/shared-types';

// Use types in your code
const order: Order = {
  id: '123',
  orderNumber: 'ORD-001',
  // ... other properties
};
```

## Package Structure

```
src/
├── domain/          # Domain entity types
│   ├── menu.types.ts
│   ├── order.types.ts
│   ├── payment.types.ts
│   ├── user.types.ts
│   ├── store.types.ts
│   ├── inventory.types.ts
│   ├── device.types.ts
│   └── notification.types.ts
├── api/             # API request/response types
│   ├── request.types.ts
│   ├── response.types.ts
│   └── pagination.types.ts
├── events/          # EventBridge event types
│   └── eventbridge.types.ts
├── utils/           # Utility types
│   └── common.types.ts
└── index.ts         # Main export file
```

## Type Categories

### Domain Types
- **Menu Types**: MenuItem, MenuCategory, Customization, ComboGroup
- **Order Types**: Order, OrderItem, OrderStatus, OrderSource
- **Payment Types**: Payment, Refund, PaymentMethod
- **User Types**: User, UserProfile, StoreStaff, UserPermission
- **Store Types**: Store, BusinessHours, DeliveryZone
- **Inventory Types**: InventoryItem, Recipe, Variant, RecipeCondition
- **Device Types**: Device, PrintJob
- **Notification Types**: Notification, NotificationChannel

### API Types
- **Request Types**: Create/Update request interfaces
- **Response Types**: Standard API response wrappers
- **Pagination Types**: Pagination parameters and responses

### Event Types
- **EventBridge Types**: Event payloads for domain events

### Utility Types
- Common utility types and type guards

## Development

```bash
# Build the package
pnpm build

# Watch mode for development
pnpm dev

# Clean build artifacts
pnpm clean
```

## Important Notes

### Currency
All monetary values are stored in **cents** (e.g., 1299 = $12.99)

### Dates
All date strings use **ISO 8601** format

### IDs
All IDs use **UUID v4** format

### Multi-tenancy
All store-specific data includes `storeId` for isolation

## Version

Current version: 0.1.0

## License

MIT
