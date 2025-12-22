# My Online Ordering System - Software Development Plan

## Document Information
- **Version**: 1.1
- **Date**: December 22, 2025
- **Status**: Master Roadmap (Aligned with v1.0 Design Specs)
- **Owner**: Simon Chou
- **Related**: [CONCEPT.md](./CONCEPT.md)

---

## 1. Technical Architecture

### 1.1 System Overview

The system follows a **serverless architecture** on AWS, leveraging Lambda functions for compute, with event-driven communication and managed services for scalability and cost optimization.

**Architecture Principles:**
- Serverless-first approach (AWS Lambda)
- Function independence and loose coupling
- API-first design with API Gateway
- Event-driven communication (EventBridge, SQS, SNS)
- Managed database services (Aurora PostgreSQL, Redis)
- Auto-scaling and pay-per-use
- Fault tolerance with built-in retry mechanisms

### 1.2 Backend Microservices

#### Core Business Services

**1. Menu Service**
- **Responsibility**: Product catalog, pricing, images, customizations
- **Tech Stack**: TypeScript (Node.js 20.x Lambda Runtime) + Drizzle ORM
- **Database**: Aurora Serverless v2 PostgreSQL (relational data) + ElastiCache Redis (cache) + S3 (image storage)
- **Lambda Functions**:
  - `menu-get-handler` - GET /api/v1/menu/:storeId (cached in Redis, 5 min TTL)
  - `menu-create-handler` - POST /api/v1/menu/items
  - `menu-update-handler` - PUT /api/v1/menu/items/:id (invalidate cache)
  - `menu-availability-handler` - PATCH /api/v1/menu/items/:id/availability (invalidate cache)
- **Connection**: RDS Proxy (connection pooling for Lambda)
- **Events**: EventBridge events → `Menu.Updated`, `Item.SoldOut`, `Item.BackInStock`

**2. Order Service**
- **Responsibility**: Order lifecycle, state machine, transaction coordination
- **Tech Stack**: TypeScript (Node.js 20.x Lambda Runtime) + Drizzle ORM + Step Functions (state machine)
- **Database**: Aurora Serverless v2 PostgreSQL (ACID transactions for orders)
- **State Machine**: AWS Step Functions
  ```
  Pending → Paid → Confirmed → Preparing → Ready → Completed
           ↓                    ↓
        Cancelled           Rejected
  ```
- **Lambda Functions**:
  - `order-create-handler` - POST /api/v1/orders (transaction with inventory lock)
  - `order-get-handler` - GET /api/v1/orders/:id
  - `order-update-status-handler` - PATCH /api/v1/orders/:id/status
  - `order-cancel-handler` - POST /api/v1/orders/:id/cancel (rollback transaction)
- **Connection**: RDS Proxy (connection pooling)
- **Events**: EventBridge → `Order.Created`, `Order.Paid`, `Order.StatusChanged`, `Order.Cancelled`

**3. Inventory Service**
- **Responsibility**: Recipe-driven ingredient tracking, stock reservation, automatic alerts
- **Tech Stack**: TypeScript (Node.js 20.x Lambda Runtime) + Drizzle ORM
- **Database**: 
  - Aurora Serverless v2 PostgreSQL (ingredient inventory with recipe-based deduction)
  - ElastiCache Redis (temporary reservation locks, TTL)
- **Key Features**:
  - **Recipe-Driven Inventory**: Inventory deduction happens via Recipes (ingredient-level tracking)
  - **Centralized Variant Registry**: Master Variants + Contextual Overrides (size, temperature, sweetness)
  - Stock reservation locks in Redis (10-minute TTL)
  - PostgreSQL row-level locking for atomic updates
  - EventBridge scheduled rules for lock cleanup
  - Multi-tenancy: All inventory data isolated by `storeId`
- **Lambda Functions**:
  - `inventory-reserve-handler` - POST /api/v1/inventory/reserve (Redis lock + DB check)
  - `inventory-commit-handler` - POST /api/v1/inventory/commit (atomic decrement in PostgreSQL via recipes)
  - `inventory-release-handler` - POST /api/v1/inventory/release (remove Redis lock)
  - `inventory-check-handler` - GET /api/v1/inventory/:itemId (cached in Redis)
  - `inventory-cleanup-cron` - EventBridge trigger (every minute, clean expired locks)
- **Connection**: RDS Proxy
- **Events**: EventBridge → `Stock.Reserved`, `Stock.Committed`, `Stock.LowAlert`, `Stock.Depleted`

**4. Payment Service**
- **Responsibility**: Payment gateway abstraction, reconciliation
- **Tech Stack**: TypeScript (Node.js 20.x Lambda Runtime) + Drizzle ORM + AWS SDK v3
- **Database**: Aurora Serverless v2 PostgreSQL (payment records, ACID critical) + ElastiCache Redis (idempotency keys)
- **Integrations**: Stripe SDK, LinePay API, AWS Secrets Manager (credentials)
- **Lambda Functions**:
  - `payment-charge-handler` - POST /api/v1/payments/charge (transaction with order update)
  - `payment-refund-handler` - POST /api/v1/payments/refund (atomic refund record)
  - `payment-status-handler` - GET /api/v1/payments/:orderId/status
  - `payment-webhook-handler` - Stripe/LinePay webhooks (idempotent processing)
- **Security**: 
  - PCI DSS Level 1 compliance
  - Tokenization (no card storage)
  - Idempotency with Redis (24-hour TTL)
  - PostgreSQL transactions for payment consistency
  - Secrets Manager for API keys
- **Connection**: RDS Proxy
- **Events**: EventBridge → `Payment.Success`, `Payment.Failed`, `Payment.Refunded`

#### User & Access Management

**5. Authorization Service**
- **Responsibility**: Authentication, RBAC, session management
- **Tech Stack**: AWS Cognito (managed auth) + TypeScript Lambda (custom flows) + Drizzle ORM
- **Database**: Cognito User Pools (authentication) + Aurora Serverless v2 PostgreSQL (user metadata, permissions)
- **Roles**: User, Cashier, Lead (Shift Leader), Manager, Merchant, Admin (Cognito Groups + PostgreSQL roles table)
- **RBAC Model**: Role-Based Access Control with granular permissions aligned with design specs
- **Lambda Functions**:
  - `auth-pre-signup-trigger` - Cognito pre-signup validation, create user record in PostgreSQL
  - `auth-post-confirmation` - Post-signup actions, sync to database
  - `auth-custom-message` - Custom email templates
  - `auth-token-validator` - API Gateway authorizer (verify Cognito JWT + check PostgreSQL permissions)
- **Connection**: RDS Proxy
- **Security**: Cognito password policies, JWT (RS256), MFA support, token refresh

**6. User Profile Service**
- **Responsibility**: Customer data, preferences, saved payments
- **Tech Stack**: TypeScript (Node.js 20.x Lambda Runtime) + Drizzle ORM
- **Database**: Aurora Serverless v2 PostgreSQL (user profiles, relational data)
- **Lambda Functions**:
  - `profile-get-handler` - GET /api/v1/users/:id (cached in Redis)
  - `profile-update-handler` - PUT /api/v1/users/:id (invalidate cache)
  - `profile-payment-methods-handler` - POST /api/v1/users/:id/payment-methods (encrypted)
  - `profile-orders-handler` - GET /api/v1/users/:id/orders (JOIN with orders table)
- **Connection**: RDS Proxy

#### Operational Services

**7. Store Service**
- **Responsibility**: Restaurant config, hours, delivery rules
- **Tech Stack**: TypeScript (Node.js 20.x Lambda Runtime) + Drizzle ORM
- **Database**: Aurora Serverless v2 PostgreSQL (store configs) + ElastiCache Redis (cache) + CloudFront (edge caching)
- **Lambda Functions**:
  - `store-get-handler` - GET /api/v1/stores/:id (Redis cache, 10 min TTL)
  - `store-update-hours-handler` - PUT /api/v1/stores/:id/hours (invalidate cache)
  - `store-status-handler` - PATCH /api/v1/stores/:id/status (invalidate cache, notify WebSocket)
  - `store-delivery-zones-handler` - PUT /api/v1/stores/:id/delivery-zones (JSONB column)
- **Connection**: RDS Proxy
- **Events**: EventBridge → `Store.StatusChanged`, `Store.ConfigUpdated`

**8. Device Service**
- **Responsibility**: Hardware registry, print jobs, health monitoring
- **Tech Stack**: TypeScript (Node.js 20.x Lambda Runtime) + Drizzle ORM + AWS IoT Core (device communication)
- **Database**: Aurora Serverless v2 PostgreSQL (device registry, status logs) + SQS (job queue)
- **Supported Devices**:
  - Receipt Printers (ESC/POS, StarPRNT via IoT)
  - Card Readers (PAX, Verifone)
  - Cash Drawers (RJ11)
  - KDS Displays
- **Lambda Functions**:
  - `device-register-handler` - POST /api/v1/devices (store in PostgreSQL)
  - `device-print-job-handler` - POST /api/v1/devices/:id/print → SQS (job queue)
  - `device-status-handler` - GET /api/v1/devices/:id/status (real-time from IoT Core + historical from PostgreSQL)
  - `device-iot-consumer` - Process IoT Core messages, log to PostgreSQL
- **Connection**: RDS Proxy
- **Protocols**: AWS IoT Core (MQTT), Ethernet, Bluetooth
- **Events**: EventBridge → `Device.Registered`, `Device.Offline`, `PrintJob.Completed`

**9. Notification Service**
- **Responsibility**: Multi-channel messaging, real-time push
- **Tech Stack**: TypeScript (Node.js 20.x Lambda Runtime) + Drizzle ORM + API Gateway WebSocket API
- **Database**: Aurora Serverless v2 PostgreSQL (notification history) + ElastiCache Redis (WebSocket connection IDs)
- **Channels**: WebSocket (API Gateway), Email (SES), SMS (SNS), Push (SNS Mobile)
- **Lambda Functions**:
  - `notification-send-handler` - POST /api/v1/notifications/send (log to PostgreSQL)
  - `websocket-connect` - WebSocket $connect route (store connectionId in Redis)
  - `websocket-disconnect` - WebSocket $disconnect route (remove from Redis)
  - `notification-dispatcher` - EventBridge consumer → fan-out to channels
- **Connection**: RDS Proxy
- **Events Subscribed**: All domain events via EventBridge rules

#### Business Intelligence

**10. CRM Service**
- **Responsibility**: Loyalty, coupons, customer segmentation
- **Tech Stack**: TypeScript (Node.js 20.x Lambda Runtime) + Drizzle ORM + SageMaker (ML recommendations)
- **Database**: Aurora Serverless v2 PostgreSQL (points, coupons, transactions) + ElastiCache Redis (coupon validation cache)
- **Lambda Functions**:
  - `crm-points-handler` - GET /api/v1/crm/users/:id/points (cached in Redis)
  - `crm-coupon-create-handler` - POST /api/v1/crm/coupons (PostgreSQL with expiry dates)
  - `crm-coupon-validate-handler` - POST /api/v1/crm/coupons/:code/validate (check Redis cache first)
  - `crm-recommendation-handler` - SageMaker inference endpoint (query from PostgreSQL)
- **Features**: 
  - Tiered membership (PostgreSQL triggers for tier calculation)
  - Birthday rewards (EventBridge scheduled rule + PostgreSQL query)
  - Referral bonuses (relational tracking)
- **Connection**: RDS Proxy
- **Events**: EventBridge → `Points.Earned`, `Coupon.Applied`, `Tier.Upgraded`

**11. Report Service**
- **Responsibility**: Analytics, dashboards, anomaly detection
- **Tech Stack**: TypeScript (Node.js 20.x Lambda Runtime) + Drizzle ORM + AWS Glue (ETL) + Athena (SQL analytics)
- **Database**: 
  - Aurora Serverless v2 PostgreSQL (real-time queries, materialized views for reports)
  - S3 (historical data export from PostgreSQL via Glue)
  - Athena (query S3 for long-term analytics)
  - QuickSight (dashboards, connect to PostgreSQL + Athena)
- **Reports**:
  - Daily Z-Report (sales summary from PostgreSQL)
  - Best sellers by hour/day/week (PostgreSQL aggregations)
  - Staff performance (JOIN across orders, users tables)
  - Anomaly alerts (stuck orders, fraud patterns)
- **Lambda Functions**:
  - `report-sales-handler` - GET /api/v1/reports/sales/daily (PostgreSQL query, cached)
  - `report-bestsellers-handler` - GET /api/v1/reports/items/best-sellers (materialized view)
  - `report-anomalies-handler` - GET /api/v1/reports/anomalies (PostgreSQL query)
  - `report-z-report-generator` - EventBridge schedule (daily 2 AM, generate PDF)
  - `report-anomaly-scanner` - EventBridge schedule (every 5 min, check order status)
- **Connection**: RDS Proxy
- **ETL**: AWS Glue exports PostgreSQL data to S3 daily for long-term storage

#### Integration Layer

**12. Delivery Platform Webhooks**
- **Responsibility**: UberEats/Foodpanda integration, order import & menu sync
- **Tech Stack**: TypeScript (Node.js 20.x Lambda Runtime) + Drizzle ORM + axios/node-fetch
- **Database**: Aurora Serverless v2 PostgreSQL (order mapping, sync logs) + ElastiCache Redis (deduplication, 1-hour TTL)
- **Multi-tenancy**: All platform orders and sync data isolated by `storeId`
- **Platforms Supported**:
  - UberEats Webhook API
  - Foodpanda Partner API
- **Lambda Functions**:
  - `webhook-ubereats-handler` - POST /webhooks/ubereats/order (idempotent with Redis)
  - `webhook-foodpanda-handler` - POST /webhooks/foodpanda/order (idempotent with Redis)
  - `webhook-signature-validator` - HMAC-SHA256 verification
  - `platform-status-sync` - Outbound status updates (log to PostgreSQL)
  - `platform-menu-sync` - Menu/inventory sync (EventBridge schedule, read from PostgreSQL)
- **Connection**: RDS Proxy
- **Retry Logic**: SQS with exponential backoff, DLQ for failures
- **Events**: EventBridge → `ExternalOrder.Received`, `Platform.SyncFailed`

### 1.3 Frontend Applications

**Common Frontend Technology Stack**

All frontend applications are built with a unified technology stack for consistency and code reusability:

- **UI Framework**: React 18 + TypeScript
  - Component-based architecture
  - Type-safe props and state management
  - Shared component library across all apps
  
- **Development Environment**: Node.js 20.x + Vite
  - **Node.js**: Runtime environment for development tools (Vite, ESLint, build scripts)
  - **Vite**: Lightning-fast build tool and dev server
    - Hot Module Replacement (HMR) < 100ms
    - TypeScript compilation via esbuild
    - Development server startup < 2 seconds
    - Production bundling with Rollup (tree-shaking, code splitting, minification)
  
- **Language**: TypeScript (compiled to JavaScript)
  - All `.tsx` files for components
  - Strict mode enabled (`strict: true`)
  - Shared type definitions between frontend and backend
  
- **Styling**: SCSS (Sass) with CSS Modules
  - Component-scoped styles
  - Variables, mixins, and nesting
  - BEM naming convention for clarity

**Note**: While all apps use React + TypeScript, they are compiled to JavaScript and run in their respective environments:
- **Web apps** (User Client, Merchant Dashboard, KDS): Run in browser
- **Desktop apps** (Kiosk, POS): Run in Electron (Chromium + Node.js)

**Development Workflow**:
```bash
# All frontend apps follow this pattern
npm run dev      # Vite dev server (powered by Node.js)
npm run build    # Vite production build (TypeScript → JavaScript)
npm run preview  # Preview production build locally
```

---

**1. User Client (Mobile Web PWA)**
- **Framework**: React 18 + TypeScript + Vite
- **State Management**: Redux Toolkit
- **Styling**: SCSS (Sass) with CSS Modules
- **Key Features**:
  - Responsive design (mobile-first)
  - Offline support (Service Worker)
  - PWA installable
  - Image optimization (CloudFront + S3, lazy load)
  - Real-time order tracking (API Gateway WebSocket)
- **API Integration**: AWS Amplify / Axios (REST API + WebSocket)
- **Pages**:
  - `/` - Store selection
  - `/menu` - Browse menu
  - `/cart` - Shopping cart
  - `/checkout` - Payment
  - `/orders/:id` - Order tracking
  - `/profile` - User settings

**2. Merchant Dashboard**
- **Framework**: React 18 + TypeScript + Vite
- **State Management**: Redux Toolkit
- **Styling**: SCSS with component-based architecture
- **UI Components**: Custom components + Ant Design (optional)
- **Charts**: Recharts / Chart.js
- **API Integration**: AWS Amplify (auth + API) + Axios
- **Pages**:
  - `/dashboard` - Overview metrics (QuickSight embed)
  - `/orders` - Order management
  - `/menu` - Menu editor
  - `/inventory` - Stock management
  - `/staff` - User roles (Cognito integration)
  - `/reports` - Analytics
  - `/settings` - Store config
- **Real-time Updates**: API Gateway WebSocket for live order feed

**3. Kiosk (Self-Service)**
- **Framework**: Electron + React 18 + TypeScript + Vite
- **State Management**: Redux Toolkit
- **Styling**: SCSS (touch-optimized, large UI elements)
- **Display**: Touch-optimized (min 1920×1080)
- **Peripherals**:
  - Card reader SDK integration
  - Receipt printer (via AWS IoT Core)
  - QR code scanner
- **API Integration**: AWS SDK for JavaScript (API calls to Lambda)
- **Accessibility**: Large buttons, voice assistance, multi-language
- **Auto-reset**: Return to home after 60s inactivity
- **Offline Mode**: IndexedDB cache, SQS queue for retry

**4. POS (Point of Sale)**
- **Framework**: Electron + React 18 + TypeScript + Vite
- **State Management**: Redux Toolkit
- **Styling**: SCSS (desktop-optimized)
- **Peripherals**:
  - Cash drawer (RJ11 trigger)
  - Barcode scanner
  - Receipt printer (via AWS IoT Core)
  - Customer display (optional)
- **API Integration**: AWS SDK for JavaScript + Cognito (staff auth)
- **Features**:
  - Quick order entry (keyboard shortcuts)
  - Split payment
  - Order modification
  - Staff timeclock (PostgreSQL logging)
  - End-of-day report print
- **Security**: Cognito staff login, CloudWatch action logging

**5. KDS (Kitchen Display System)**
- **Framework**: React 18 + TypeScript + Vite (web-based, large screen TV)
- **State Management**: Redux Toolkit (minimal, mostly real-time WebSocket data)
- **Styling**: SCSS (large text, high contrast for kitchen environment)
- **Display**: 40"+ TV, auto-refresh every 2s (WebSocket updates)
- **API Integration**: API Gateway WebSocket (real-time order updates)
- **Layout**:
  - Order cards sorted by time
  - Color-coded priority (ASAP, scheduled, late)
  - Station filtering (Hot, Cold, Drinks)
- **Audio**: HTML5 Audio API for order arrival chime
- **Bump**: Touch/click to mark complete (Lambda update)
- **Multi-screen**: Support for multiple stations via URL params

### 1.4 Database Design

**Aurora Serverless v2 PostgreSQL (Primary Database)**

**Schema Design (Drizzle ORM)**
```typescript
// Core Tables (Example)
import { pgTable, uuid, text, decimal, boolean, timestamp, json, index } from 'drizzle-orm/pg-core';
import { pgEnum } from 'drizzle-orm/pg-core';

export const orderStatus = pgEnum('OrderStatus', ['PENDING', 'PAID', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED', 'REJECTED']);
export const orderSource = pgEnum('OrderSource', ['USER_CLIENT', 'KIOSK', 'POS', 'UBER_EATS', 'FOODPANDA']);

export const stores = pgTable('Store', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  businessHours: json('businessHours'), // JSONB column for flexible hours
  deliveryZones: json('deliveryZones'), // JSONB for geo-fence data
  acceptingOrders: boolean('acceptingOrders').default(true).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull()
});

export const menuItems = pgTable('MenuItem', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('storeId').notNull().references(() => stores.id),
  categoryId: uuid('categoryId').notNull(),
  name: text('name').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  imageUrl: text('imageUrl'),
  isAvailable: boolean('isAvailable').default(true).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull()
}, (table) => ({
  storeAvailableIdx: index('MenuItem_storeId_isAvailable_idx').on(table.storeId, table.isAvailable)
}));

export const inventory = pgTable('Inventory', {
  itemId: uuid('itemId').primaryKey().references(() => menuItems.id),
  stockCount: decimal('stockCount').default('0').notNull(),
  lowThreshold: decimal('lowThreshold').default('10').notNull(),
  lastUpdated: timestamp('lastUpdated').defaultNow().notNull()
});

export const orders = pgTable('Order', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('storeId').notNull().references(() => stores.id),
  userId: uuid('userId'),
  status: orderStatus('status').default('PENDING').notNull(),
  source: orderSource('source').default('USER_CLIENT').notNull(),
  totalAmount: decimal('totalAmount', { precision: 10, scale: 2 }).notNull(),
  scheduledPickup: timestamp('scheduledPickup'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull()
}, (table) => ({
  storeStatusCreatedIdx: index('Order_storeId_status_createdAt_idx').on(table.storeId, table.status, table.createdAt),
  userCreatedIdx: index('Order_userId_createdAt_idx').on(table.userId, table.createdAt)
}));
```

**Connection Management**
- **RDS Proxy**: Connection pooling for Lambda (solves cold start connection issue)
- **Max Connections**: Auto-scaling based on Lambda concurrency
- **Drizzle Client**: Lightweight instance per Lambda warm start (~5KB vs Prisma's ~20MB)

**ElastiCache Redis (Cache & Temporary Data)**
- **Menu Cache**: `menu:{storeId}` (TTL 5 min, invalidate on update)
- **Store Config Cache**: `store:{storeId}` (TTL 10 min)
- **User Profile Cache**: `user:{userId}` (TTL 15 min)
- **Inventory Locks**: `lock:inventory:{itemId}` (TTL 10 min)
- **Coupon Cache**: `coupon:{code}` (TTL until expiry)
- **WebSocket Connections**: `ws:connection:{userId}` (active connections)
- **Idempotency Keys**: `idempotency:{key}` (TTL 24 hours)
- **Rate Limiting**: `rate:{ip}:{endpoint}` (sliding window)

**S3 + Athena (Data Lake for Long-term Analytics)**
- **Daily Export**: AWS Glue job exports PostgreSQL data to S3 (Parquet format)
- **Partitioning**: `s3://bucket/year=2025/month=12/day=17/orders.parquet`
- **Athena Queries**: Historical analysis (> 3 months old data)
- **Cost Optimization**: Keep only 3 months in Aurora, rest in S3

**Key Design Patterns**
- **Drizzle Kit Migrations**: Version-controlled schema changes
- **JSONB Columns**: Flexible data (business hours, delivery zones)
- **Materialized Views**: Pre-computed reports (refresh hourly)
- **Row-Level Locking**: Inventory atomic updates (Drizzle supports raw SQL for `SELECT FOR UPDATE`)
- **PostgreSQL Triggers**: Auto-update `updatedAt`, inventory alerts
- **Indexing Strategy**: Composite indexes for common query patterns
- **Cache-Aside Pattern**: Check Redis → Miss → Query PostgreSQL → Update Redis

### 1.5 Communication Patterns

**Synchronous (REST API)**
- **API Gateway (HTTP API)**: Routes to Lambda functions
- **Authorizer**: Lambda authorizer (Cognito JWT validation)
- **Rate limiting**: API Gateway throttling (100 req/sec per IP)
- **CORS**: Configured per route

**Asynchronous (Event-Driven)**
- **EventBridge**: Event bus for domain events
  - Rules route events to targets (Lambda, SQS, SNS)
  - Example: `Order.Created` → [Notification Lambda, Inventory Lambda, CRM Lambda]
- **SQS**: Work queues for print jobs, webhook retries
  - Standard queues for high throughput
  - FIFO queues for order processing
  - Dead Letter Queues (DLQ) for failed messages
- **SNS**: Fan-out for multi-channel notifications
- **Retry Policy**: SQS exponential backoff (3 attempts)

**Real-time (WebSocket)**
- **API Gateway WebSocket API**: Persistent connections
- **Connection Management**: Redis (connectionId storage)
- **Routes**: 
  - `$connect` - Lambda stores connectionId in Redis
  - `$disconnect` - Lambda removes connectionId from Redis
  - `$default` - Lambda handles messages
- **Push**: Lambda calls `@connections` API to send messages
- **Authentication**: Cognito token in query string

---

## 2. Technology Stack Details

### 2.1 Backend Technologies

| Component | Technology | Justification |
|-----------|-----------|---------------|
| **Compute** | AWS Lambda (Node.js 20.x) | Serverless, auto-scaling, pay-per-use, async I/O performance |
| **Language** | TypeScript | Type safety, consistent with frontend, better DX, reduces runtime errors |
| **ORM** | Drizzle ORM | Type-safe queries, lightweight (~5KB vs Prisma's ~20MB), optimized for serverless cold starts |
| **API Gateway** | AWS API Gateway (HTTP + WebSocket) | Managed service, throttling, auth, WebSocket support |
| **Authentication** | AWS Cognito | Managed user pools, OAuth2, MFA, no custom auth code |
| **Database (Primary)** | Aurora Serverless v2 PostgreSQL | ACID compliance, relational data, auto-scaling, familiar SQL |
| **Connection Pool** | RDS Proxy | Manage Lambda connections, reduce cold start impact |
| **Cache** | ElastiCache Redis | In-memory speed, TTL, pub/sub, session storage |
| **Event Bus** | EventBridge | Event-driven architecture, rules engine, schema registry |
| **Message Queue** | SQS + SNS | Reliable, decoupling, DLQ, fan-out |
| **Workflow** | Step Functions | State machine orchestration, visual workflows |
| **Object Storage** | S3 + CloudFront | Image storage, CDN, low cost |
| **Data Lake** | S3 + Athena + Glue | Historical analytics, SQL on S3, export from PostgreSQL |
| **ML** | SageMaker | Managed ML, inference endpoints |

### 2.2 Frontend Technologies

| Component | Technology | Justification |
|-----------|-----------|---------------|
| **Web Framework** | React 18 | Component reusability, ecosystem, virtual DOM |
| **Mobile Framework** | React (PWA) | Code sharing, offline support, installable |
| **Desktop (Kiosk/POS)** | Electron + React | Hardware access, native feel, cross-platform |
| **State Management** | Redux Toolkit | Predictable state, DevTools, async handling |
| **Styling** | **SCSS (Sass)** | Variables, nesting, mixins, maintainable CSS |
| **CSS Architecture** | CSS Modules + BEM | Component isolation, naming conventions |
| **Build Tool** | Vite | Fast HMR, modern bundling, optimized builds |
| **TypeScript** | Yes | Type safety, better DX, catch errors early |
| **AWS Integration** | AWS Amplify | Auth, API, storage SDKs |
| **HTTP Client** | Axios | Promise-based, interceptors, error handling |

### 2.3 DevOps & Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Infrastructure as Code** | AWS SAM / Serverless Framework | Lambda deployment, API Gateway config |
| **Alternative IaC** | AWS CDK (TypeScript) | Type-safe infrastructure, same language as backend |
| **CI/CD** | GitHub Actions + AWS CodePipeline | Automated testing, deployment |
| **Monitoring** | CloudWatch | Metrics, logs, alarms, dashboards |
| **Logging** | CloudWatch Logs + Insights | Centralized logs, log queries |
| **Tracing** | X-Ray | Distributed tracing, service map |
| **Secret Management** | AWS Secrets Manager + Parameter Store | API keys, DB credentials |
| **CDN** | CloudFront | Asset delivery, DDoS protection, edge caching |
| **DNS** | Route 53 | Domain management, health checks |
| **Security** | WAF + Shield | DDoS protection, rate limiting |
| **Cost Management** | Cost Explorer + Budgets | Cost tracking, alerts |

### 2.4 Security Stack

| Layer | Implementation |
|-------|----------------|
| **Authentication** | JWT (RS256), OAuth2, bcrypt |
| **Authorization** | RBAC with policy engine |
| **API Security** | Rate limiting, CORS, CSRF tokens |
| **Data Encryption** | TLS 1.3, AES-256 at rest |
| **Payment Security** | PCI DSS Level 1, tokenization |
| **Secrets** | Vault, environment variables |
| **Vulnerability Scanning** | Snyk, OWASP ZAP |
| **Penetration Testing** | Annual third-party audit |

---

## 3. Development Phases (Solo Developer with AI Assistance)

**Overview**: This development plan is designed for a solo developer using AI assistance, with a total timeline of approximately 44-64 weeks (11-16 months). Each version can operate independently and provides complete value.

**Development Approach**:
- AI-assisted code generation for faster development
- Incremental delivery - each version is production-ready
- Focus on core features first, add complexity gradually
- Weekly progress milestones for tracking

**Version Numbering**:
- **v0.x.x**: Beta versions (development phase)
- **v1.0.0**: Production release (public launch)

---

### Version 0.1.0: MVP - Core Ordering System (Weeks 1-16)

### Version 0.1.0: MVP - Core Ordering System (Weeks 1-16)

**Goal**: Build foundational online ordering system that allows customers to order and merchants to manage

---

#### Phase 1: Foundation & Infrastructure (Weeks 1-4)

**Objectives**: AWS environment setup, database design, CI/CD pipeline

**Tasks**:
- AWS account setup (Lambda, API Gateway, Aurora, RDS Proxy, ElastiCache)
- GitHub repository initialization
- CI/CD pipeline setup (GitHub Actions)
  - Lint & test automation
  - Deploy to development environment
- Database schema design (Drizzle ORM)
  - Tables: stores, menu_items, categories, orders, order_items, payments, users
  - Indexes optimization
- API Gateway configuration (HTTP + WebSocket)
- CloudWatch monitoring setup
- Secrets Manager configuration (database credentials, API keys)

**Deliverables**:
- ✅ AWS infrastructure provisioned
- ✅ Database schema finalized (Drizzle schema file)
- ✅ CI/CD pipeline functional
- ✅ Development environment ready

**Milestones**:
- Week 2: AWS setup complete, database created
- Week 4: CI/CD working, can deploy Lambda functions

---

#### Phase 2: Authorization & Store Services (Weeks 5-8)

**Objectives**: User authentication and store management

**Services to Build**:
- **Authorization Service**
  - Cognito User Pool setup
  - JWT token validation (Lambda authorizer)
  - User registration/login endpoints
  - Password reset flow
  - Cognito Groups (User, Merchant, Cashier, Manager, Admin)
  
- **Store Service**
  - Store CRUD operations
  - Business hours management (JSONB)
  - Delivery zones configuration
  - Store status toggle (accepting orders)
  - Redis caching (10 min TTL)

**Lambda Functions**:
- `auth-pre-signup-trigger`, `auth-post-confirmation`, `auth-token-validator`
- `store-get-handler`, `store-update-handler`, `store-delivery-zones-handler`

**Deliverables**:
- ✅ User registration and login working
- ✅ JWT authentication flow complete
- ✅ Store management API ready
- ✅ Redis cache integration

**Milestones**:
- Week 6: Cognito setup, authentication endpoints working
- Week 8: Store service complete with caching

**Testing**: Unit tests for auth logic, JWT validation tests

---

#### Phase 3: Menu & Order Services (Weeks 9-12)

**Objectives**: Menu management and order processing

**Services to Build**:
- **Menu Service**
  - Menu items CRUD
  - Category management
  - Availability toggle
  - Image upload (S3 + CloudFront)
  - Redis caching (5 min TTL, invalidate on update)
  
- **Order Service**
  - Order creation with validation
  - Order status state machine (PENDING → PAID → CONFIRMED → PREPARING → READY → COMPLETED)
  - Order history query
  - EventBridge event publishing (Order.Created, Order.StatusChanged)

**Lambda Functions**:
- `menu-get-handler`, `menu-create-handler`, `menu-update-handler`, `menu-delete-handler`
- `order-create-handler`, `order-get-handler`, `order-update-status-handler`, `order-list-handler`

**Deliverables**:
- ✅ Menu management API complete
- ✅ Order creation and status updates working
- ✅ Event-driven architecture (EventBridge)
- ✅ Image storage (S3 + CloudFront CDN)

**Milestones**:
- Week 10: Menu service complete with image upload
- Week 12: Order service complete with state machine

**Testing**: Order state machine tests, event publishing validation

---

#### Phase 4: Payment, Notification & Frontend (Weeks 13-16)

**Objectives**: Payment integration and user-facing applications

**Services to Build**:
- **Payment Service**
  - Stripe integration (card payments)
  - Payment intent creation
  - Webhook handling (payment confirmation)
  - Refund processing
  
- **Notification Service**
  - WebSocket connection management (API Gateway WebSocket)
  - Redis connection ID storage
  - Real-time push notifications
  - Email notifications (SES)
  - EventBridge event subscriptions

**Frontend Applications**:
- **User Client (PWA - React 18 + TypeScript + Vite)**
  - Pages: Menu browsing, cart, checkout, order tracking
  - Redux Toolkit state management
  - PWA setup (Service Worker, manifest)
  - Responsive design (mobile-first)
  - WebSocket integration for real-time updates
  
- **Merchant Dashboard (React 18 + TypeScript + Vite)**
  - Pages: Order management, menu editor, basic settings
  - Real-time order feed (WebSocket)
  - Daily sales summary

**Lambda Functions**:
- `payment-create-intent`, `payment-webhook-handler`, `payment-refund-handler`
- `notification-websocket-connect`, `notification-websocket-disconnect`, `notification-send-handler`

**Deliverables**:
- ✅ Stripe payment integration working
- ✅ Real-time WebSocket notifications
- ✅ User Client PWA (installable, responsive)
- ✅ Merchant Dashboard functional
- ✅ End-to-end order flow complete

**Milestones**:
- Week 14: Payment service complete, Stripe test mode working
- Week 15: User Client MVP complete
- Week 16: Merchant Dashboard complete, full system testing

**Testing**: 
- Payment webhook testing (Stripe CLI)
- WebSocket connection stability
- End-to-end order flow: Browse → Cart → Checkout → Payment → Notification

**Version 0.1.0 Success Criteria**:
- Customer can browse menu, place order, pay with card
- Merchant can view orders in real-time, manage menu
- Basic daily sales report available
- System deployed to production (beta)

---

### Version 0.2.0: Inventory & POS System (Weeks 17-28)

**Goal**: Add inventory management and point-of-sale functionality for counter operations

---

#### Phase 1: Inventory Service (Weeks 17-20)

**Objectives**: Recipe-driven ingredient-level inventory tracking with real-time deduction

**Service to Build**:
- **Inventory Service**
  - **Recipe-Driven Inventory System**: 
    - Ingredient-level tracking (coffee beans, milk, sugar, etc.)
    - Recipe definitions: Map menu items + variants to ingredient deductions
    - Recipe Conditions: Trigger specific recipes based on customization options
    - Real-time deduction via Recipes when orders are placed
  - **Centralized Variant Registry**:
    - Store-scoped Variants (size, temperature, sweetness levels)
    - Application-layer seeding for new stores
    - Code auto-generation (internal use only)
  - Low stock alerts (EventBridge events)
  - Atomic inventory locks (PostgreSQL `SELECT FOR UPDATE`)
  - Bulk stock adjustment
  - Inventory history logging
  - Multi-tenancy: All inventory data isolated by `storeId`

**Database Schema Updates**:
- Tables: `inventory_items` (ingredients), `variants` (store-scoped), `recipes`, `recipe_conditions`, `inventory_logs`
- PostgreSQL triggers for auto-alerts
- Store isolation enforced at schema level

**Lambda Functions**:
- `inventory-get-handler`, `inventory-update-handler`, `inventory-deduct-handler` (recipe-based), `inventory-alert-handler`
- `recipe-create-handler`, `recipe-condition-handler`

**Deliverables**:
- ✅ Recipe-driven inventory tracking with ingredient-level deduction
- ✅ Centralized Variant Registry (store-scoped)
- ✅ Low stock alerts (EventBridge → Email)
- ✅ Inventory deduction on order confirmation via Recipes
- ✅ Inventory management UI in dashboard (ingredients + recipes)

**Milestones**:
- Week 18: Inventory service complete with recipe system
- Week 20: Low stock alerts working, dashboard UI integrated

**Testing**: 
- Recipe deduction accuracy tests
- Variant-based recipe triggering
- Concurrency tests (race conditions with 10+ simultaneous orders)
- Lock timeout scenarios

---

#### Phase 2: User Profile & Device Service (Weeks 21-24)

**Objectives**: Customer profiles and device registry

**Services to Build**:
- **User Profile Service**
  - Customer profile CRUD
  - Order history (JOIN with orders table)
  - Saved addresses (JSONB array)
  - Notification preferences
  
- **Device Service (Software)**
  - Device registration (POS terminals, printers)
  - Device status tracking
  - Print job queue (SQS)
  - Basic job logging (no hardware integration yet)

**Database Schema Updates**:
- Table: `user_profiles` (userId, addresses, preferences)
- Table: `devices` (deviceId, storeId, deviceType, status)
- Table: `print_jobs` (jobId, deviceId, status, payload)

**Lambda Functions**:
- `profile-get-handler`, `profile-update-handler`, `profile-orders-handler`
- `device-register-handler`, `device-update-status-handler`, `device-print-job-handler`

**Deliverables**:
- ✅ Customer profiles with order history
- ✅ Device registration system
- ✅ Print job queue (software only)
- ✅ Enhanced user client (saved addresses)

**Milestones**:
- Week 22: User profile service complete
- Week 24: Device service software layer ready

**Testing**: Profile data validation, device registration flow

---

#### Phase 3: POS Application (Weeks 25-28)

**Objectives**: Desktop POS application for counter orders with role-based access

**Frontend Application**:
- **POS Application (Electron + React 18 + TypeScript + Vite)**
  - Quick order entry (keyboard shortcuts)
  - Cash and card payment support
  - **Manual Discounts**: POS staff can apply manual discounts with reason codes
  - Order modification (add/remove items)
  - Split payment
  - **Staff Role Management**:
    - Staff login (Cognito with role validation)
    - Role-Based Access Control (RBAC): Cashier, Lead, Manager, Merchant
    - Permission-based UI rendering (Cashier: POS operations only, Lead: + shift reports, Manager: + menu edits, Merchant: + store settings)
  - End-of-day Z-Report print preview
  - Offline mode with local queue

**Features**:
- Barcode scanner support (future hardware integration)
- Customer display (optional, future)
- Receipt preview (print to PDF for now)
- Discount/discountReason fields stored in Orders table

**Database Schema Updates**:
- Orders table: `discount` (decimal), `discountReason` (text) fields already exist
- StoreStaff table: Maps users to stores with StaffRole enum

**Deliverables**:
- ✅ POS Electron app complete
- ✅ Cash payment support
- ✅ Manual discount functionality with reason tracking
- ✅ Staff authentication with RBAC (Cashier/Lead/Manager/Merchant roles)
- ✅ Quick order entry with keyboard shortcuts
- ✅ Order modification functionality

**Milestones**:
- Week 26: POS app basic structure complete
- Week 28: Full POS functionality with RBAC, staff training materials ready

**Testing**: 
- POS order flow testing
- Manual discount validation
- Staff role permission tests (ensure Cashier cannot access Manager functions)
- Offline queue testing

**Version 0.2.0 Success Criteria**:
- Recipe-driven real-time inventory tracking working
- POS system operational with Manual Discount support
- Staff can process counter orders with cash/card
- RBAC enforced (Cashier/Lead/Manager/Merchant roles)
- Low stock alerts notify merchant

---

### Version 0.3.0: Analytics & CRM (Weeks 29-36)

**Goal**: Business intelligence and customer relationship management

---

#### Phase 1: Report Service (Weeks 29-32)

**Objectives**: Comprehensive analytics and reporting

**Service to Build**:
- **Report Service**
  - Daily/weekly/monthly sales reports
  - Best sellers by time period
  - Staff performance metrics
  - Anomaly detection (stuck orders, fraud patterns)
  - Automated Z-Report generation (EventBridge schedule)
  - PostgreSQL materialized views (hourly refresh)
  - Athena integration for historical data (S3 export via Glue)

**Database Schema Updates**:
- Materialized views: `mv_daily_sales`, `mv_best_sellers`, `mv_staff_performance`
- AWS Glue job for daily PostgreSQL → S3 export
- Athena tables for long-term analytics

**Lambda Functions**:
- `report-sales-handler`, `report-bestsellers-handler`, `report-anomalies-handler`
- `report-z-report-generator`, `report-anomaly-scanner`

**Deliverables**:
- ✅ Sales analytics API
- ✅ Automated daily Z-Report (PDF generation)
- ✅ Best sellers report
- ✅ Anomaly detection alerts
- ✅ Analytics dashboard (Recharts integration)

**Milestones**:
- Week 30: Report service complete with materialized views
- Week 32: Dashboard analytics UI complete, Athena setup

**Testing**: Report accuracy validation, large dataset performance tests

---

#### Phase 2: CRM Service (Weeks 33-36)

**Objectives**: Customer loyalty and marketing

**Service to Build**:
- **CRM Service**
  - **Note**: This is where CRM tables (currently removed from v1.0 Schema) will be introduced
  - Link `Users` table to `LoyaltyPoints` and `Coupons` tables
  - Loyalty points system (earning rules, redemption)
  - Tiered membership (Bronze, Silver, Gold, Platinum)
  - Coupon management (creation, validation, redemption)
  - Customer segmentation (frequency, spend, RFM analysis)
  - Referral tracking and bonuses
  - Multi-tenancy: All CRM data isolated by `storeId`

**Database Schema Updates**:
- **New Tables**: `loyalty_points`, `coupons`, `coupon_redemptions`, `customer_tiers`, `referrals`
- PostgreSQL triggers for tier calculation
- Redis cache for coupon validation (fast lookup)
- Foreign keys: Link to `users` table via `userId`

**Lambda Functions**:
- `crm-points-handler`, `crm-coupon-create-handler`, `crm-coupon-validate-handler`
- `crm-tier-calculate-handler`, `crm-referral-handler`

**Deliverables**:
- ✅ Loyalty points earning and redemption
- ✅ Coupon system (discount codes)
- ✅ Customer segmentation
- ✅ Tiered membership with auto-upgrade
- ✅ CRM dashboard UI

**Milestones**:
- Week 34: CRM service complete with points and coupons
- Week 36: Dashboard CRM UI complete, customer segmentation working

**Testing**: Points calculation tests, coupon validation tests, tier upgrade logic

**Version 0.3.0 Success Criteria**:
- Comprehensive sales reports available
- Loyalty program operational (CRM tables now in production schema)
- Merchants can create and manage coupons
- Customer segmentation insights available

---

### Version 0.4.0: Kiosk & Hardware Integration (Weeks 37-44)

**Goal**: Self-service kiosk with physical hardware peripherals

---

#### Phase 1: Kiosk Application (Weeks 37-40)

**Objectives**: Touch-optimized self-service ordering

**Frontend Application**:
- **Kiosk Application (Electron + React 18 + TypeScript + Vite)**
  - Touch-optimized UI (large buttons, min 1920×1080)
  - Menu browsing with images
  - Cart and checkout flow
  - Card payment integration (software layer)
  - Auto-reset after 60s inactivity
  - Multi-language support (English, Chinese)
  - Accessibility features (voice assistance, high contrast)
  - Offline mode with IndexedDB cache

**Features**:
- QR code scanner support (loyalty lookup)
- Customer receipt preview
- Order confirmation screen

**Deliverables**:
- ✅ Kiosk app complete (software only)
- ✅ Touch-optimized interface
- ✅ Auto-reset functionality
- ✅ Multi-language support
- ✅ Offline queue with retry

**Milestones**:
- Week 38: Kiosk UI complete
- Week 40: Full kiosk flow tested (without hardware)

**Testing**: Touch interaction testing, auto-reset timer, offline mode

---

#### Phase 2: Hardware Integration (Weeks 41-44)

**Objectives**: Physical device integration

**Hardware Peripherals**:
- Receipt printer (Star TSP654II via AWS IoT Core)
- Kitchen label printer
- Card reader (PAX A920 SDK integration)
- Cash drawer (RJ11 trigger)
- QR code scanner

**Device Service Enhancement**:
- AWS IoT Core setup (MQTT communication)
- Printer SDK integration (ESC/POS commands)
- Card reader SDK integration
- Print job templates (receipt, kitchen label)
- Device health monitoring

**Lambda Functions**:
- `device-iot-consumer`, `device-health-monitor`, `device-print-job-processor`

**Deliverables**:
- ✅ Receipt printer functional
- ✅ Kitchen label printer working (order number, items, notes, pickup time)
- ✅ Card payment terminal integrated
- ✅ Cash drawer trigger working
- ✅ QR code scanner operational

**Hardware Procurement**:
- 1x Kiosk touchscreen (1920×1080 or higher)
- 1x Star TSP654II receipt printer
- 1x Kitchen label printer
- 1x PAX A920 card terminal
- 1x Cash drawer with RJ11
- 1x QR code scanner

**Milestones**:
- Week 42: Printer integration complete
- Week 44: Full hardware setup tested, pilot kiosk installed

**Testing**: 
- Hardware failure scenarios
- Print quality validation
- Payment terminal certification
- End-to-end kiosk flow with hardware

**Version 0.4.0 Success Criteria**:
- Kiosk operational with all hardware
- Customers can self-order and pay at kiosk
- Receipt and kitchen labels print correctly
- System recovers from hardware failures gracefully

---

### Version 0.5.0: Kitchen Display System (Weeks 45-48)

**Goal**: Digitize kitchen operations with real-time order display

---

#### Phase 1: Kitchen Display System (Weeks 45-48)

**Objectives**: Real-time kitchen order management

**Frontend Application**:
- **KDS Application (React 18 + TypeScript + Vite)**
  - Real-time order display (WebSocket)
  - Order cards sorted by time
  - Color-coded priority
    - Green: Normal
    - Yellow: Scheduled (shows pickup time)
    - Orange: Approaching late (>15 min)
    - Red: Late (>30 min)
  - Station filtering (Hot Kitchen, Cold Station, Drinks, Desserts)
  - Bump functionality (mark item complete)
  - Audio alerts (HTML5 Audio API)
  - Multi-screen support (URL params for station selection)
  - Auto-refresh every 2s

**Features**:
- Order details: Order number, items, quantities, special notes, order source
- Preparation time tracking
- Kitchen performance metrics
- Auto-bump for completed scheduled orders

**Lambda Functions**:
- `kds-order-consumer` (EventBridge → WebSocket push)
- `kds-bump-handler` (update order item status)

**Deliverables**:
- ✅ KDS application complete
- ✅ Real-time WebSocket integration
- ✅ Station filtering working
- ✅ Audio alerts functional
- ✅ Multi-screen support (2+ displays)

**Hardware**:
- 2x 43" TV displays
- Wall mounts for kitchen environment
- HDMI cables

**Milestones**:
- Week 46: KDS app complete with WebSocket
- Week 48: Kitchen hardware setup, staff training complete

**Testing**: 
- WebSocket connection stability (reconnection logic)
- Order flow: User Client → Payment → KDS display
- Kitchen staff user acceptance testing
- Multi-screen sync testing

**Version 0.5.0 Success Criteria**:
- Orders appear on KDS in real-time
- Kitchen staff can bump items to mark complete
- Multiple stations can operate independently
- Audio alerts notify kitchen of new orders

---

### Version 0.6.0: Delivery Platform Integration (Weeks 49-60)

**Goal**: Multi-channel order management from third-party delivery platforms (UberEats & Foodpanda)

---

#### Phase 1: UberEats Integration (Weeks 49-52)

**Objectives**: UberEats order import, menu sync, and bi-directional status updates

**Service to Build**:
- **Delivery Platform Webhooks Service (UberEats)**
  - Webhook endpoint for order notifications
  - HMAC-SHA256 signature validation
  - Order import to PostgreSQL
  - Idempotency handling (Redis, 24-hour TTL)
  - Status update API (confirmed, preparing, ready)
  - Menu sync to UberEats platform
  - Retry logic with SQS and DLQ
  - Multi-tenancy: Platform orders isolated by `storeId`

**Database Schema Updates**:
- **New Tables**: `platform_orders`, `platform_sync_logs`
- Redis: `platform:idempotency:{orderId}` cache
- OrderSource enum: Add `UBEREATS` value

**Lambda Functions**:
- `webhook-ubereats-handler`, `webhook-signature-validator`
- `platform-status-sync-ubereats`, `platform-order-mapper`
- `platform-menu-sync-ubereats`

**Deliverables**:
- ✅ UberEats webhook endpoint working
- ✅ Orders auto-imported to system
- ✅ Bi-directional status sync
- ✅ Menu sync to UberEats
- ✅ Duplicate prevention (idempotency)
- ✅ Error handling with retry

**Milestones**:
- Week 50: UberEats webhook integration complete
- Week 52: Status sync and menu sync working, sandbox testing passed

**Testing**: 
- Webhook signature validation
- Duplicate order prevention
- Retry logic with DLQ
- UberEats sandbox environment testing

---

#### Phase 2: Foodpanda Integration (Weeks 53-56)

**Objectives**: Foodpanda order import, menu sync, and bi-directional status updates

**Service Enhancement**:
- **Delivery Platform Webhooks Service (Foodpanda)**
  - Foodpanda webhook endpoint
  - Partner API integration
  - Order import with platform-specific mapping
  - Status sync for Foodpanda
  - Menu sync to Foodpanda platform
  - Multi-tenancy: Platform orders isolated by `storeId`

**Database Schema Updates**:
- OrderSource enum: Add `FOODPANDA` value
- Extend `platform_orders` and `platform_sync_logs` for Foodpanda

**Lambda Functions**:
- `webhook-foodpanda-handler`, `platform-status-sync-foodpanda`
- `platform-menu-sync-foodpanda`

**Deliverables**:
- ✅ Foodpanda webhook endpoint working
- ✅ Orders auto-imported
- ✅ Bi-directional status sync
- ✅ Menu sync to Foodpanda
- ✅ Multi-platform order view in dashboard

**Milestones**:
- Week 54: Foodpanda integration complete
- Week 56: Multi-platform dashboard working

**Testing**: 
- Foodpanda API testing
- Multi-platform order merging
- Platform-specific order sources (tags)

---

#### Phase 3: Menu Sync & Polish (Weeks 57-60)

**Objectives**: Automated menu synchronization and platform management

**Features to Build**:
- Automated menu sync to platforms (EventBridge schedule)
- Inventory sync to platforms (mark items unavailable)
- Platform-specific pricing rules
- Platform menu mapping UI
- Platform analytics (orders by source: USER_CLIENT, KIOSK, POS, UBEREATS, FOODPANDA)
- Menu sync conflict resolution
- Multi-tenancy: All platform configurations isolated by `storeId`

**Lambda Functions**:
- `platform-menu-sync`, `platform-inventory-sync`, `platform-analytics-handler`

**Dashboard Enhancement**:
- Platform order analytics (UberEats vs Foodpanda comparison)
- Menu mapping interface (map internal menu items to platform item IDs)
- Platform status monitoring
- Sync logs and error reporting

**Deliverables**:
- ✅ Automated menu sync to UberEats and Foodpanda
- ✅ Inventory sync (unavailable items)
- ✅ Platform mapping UI in dashboard
- ✅ Platform analytics dashboard
- ✅ Unified order view (all channels)

**Milestones**:
- Week 58: Menu sync automation complete
- Week 60: Full multi-platform management working

**Testing**: 
- Menu sync accuracy validation
- Inventory sync timing tests
- Platform analytics accuracy
- End-to-end multi-platform order flow (UberEats + Foodpanda + internal channels)

**Version 0.6.0 Success Criteria**:
- UberEats and Foodpanda orders auto-imported
- Status updates sync to both platforms
- Menu and inventory sync automatically
- Merchants can manage both platforms from one dashboard
- Platform-specific analytics available

---

### Version 1.0.0: Production Launch (Weeks 61-64)

**Goal**: Quality assurance, security validation, public production launch

---

#### Phase 1: Final Testing & Launch (Weeks 61-64)

**Objectives**: Comprehensive testing, security audit, production deployment

**Testing Activities**:

**Week 61: Load & Performance Testing**
- Load test with k6/JMeter
  - 500 concurrent users
  - 1000+ orders per hour
  - API response time < 200ms (p95)
- Stress test (2x normal load)
- Database query optimization
- Lambda cold start optimization
- CloudFront cache hit rate validation

**Week 62: Security Audit**
- OWASP Top 10 vulnerability scan (OWASP ZAP)
- Dependency vulnerability scan (Snyk)
- PCI DSS Level 1 compliance validation (Stripe)
- Penetration testing (third-party or self-audit)
- Security fixes deployment
- Secrets rotation validation

**Week 63: User Acceptance Testing (UAT)**
- Pilot launch with 1 restaurant (2 weeks beta)
- Staff training and onboarding
- Collect feedback and bug reports
- Performance monitoring (CloudWatch dashboards)
- Fix critical bugs
- User satisfaction survey

**Week 64: Production Launch**
- Production deployment
- DNS cutover (Route 53)
- Marketing campaign launch
- Customer support setup
- 24/7 monitoring activation
- Runbook documentation
- Backup and disaster recovery validation

**Deliverables**:
- ✅ Load testing passed (500+ concurrent users)
- ✅ Security audit complete (no critical vulnerabilities)
- ✅ PCI DSS compliance validated
- ✅ UAT with pilot restaurant successful
- ✅ Production deployment complete
- ✅ Documentation published (API docs, user guides, runbooks)
- ✅ Monitoring dashboards active (CloudWatch, X-Ray)

**Testing Checklist**:
- [ ] Load test: 500 concurrent users, 1000+ orders/hour
- [ ] Stress test: 2x peak load, system remains stable
- [ ] Failover test: Aurora failover, Lambda scaling
- [ ] Security scan: OWASP ZAP automated scan, no critical issues
- [ ] Dependency scan: Snyk, all vulnerabilities patched
- [ ] Payment security: PCI DSS validation, Stripe compliance
- [ ] UAT: 1 pilot restaurant, 2 weeks, user satisfaction > 4.5/5
- [ ] Penetration test: Third-party audit (optional) or self-audit
- [ ] Backup/restore: Database backup and restore tested
- [ ] Disaster recovery: Multi-region failover tested (optional)

**Performance Targets**:
- API response < 200ms (p95)
- 500 concurrent users supported
- 99.9% uptime (monthly SLA)
- Database query < 50ms (p95)
- Lambda cold start < 1s

**Success Metrics**:
- System stability: Zero critical outages in pilot period
- Order completion rate > 98%
- Customer satisfaction > 4.5/5
- Merchant adoption: 5+ restaurants onboarded in first month
- Payment success rate > 99%

**Launch Plan**:
- Week 63: Soft launch (1 pilot restaurant)
- Week 64: Public launch
  - Marketing campaign (social media, ads)
  - Onboarding support for new merchants
  - Customer support hours (email, chat)
  - Blog post and press release

**Post-Launch (Week 65+)**:
- Continuous monitoring (CloudWatch, X-Ray, error tracking)
- Bug fix priority queue
- Feature requests collection
- Monthly performance review
- Quarterly security audit
- Cost optimization review

**Version 1.0.0 Success Criteria**:
- Public production launch complete
- 5+ restaurants onboarded
- 99.9% uptime in first month
- Zero critical security vulnerabilities
- Positive user feedback (> 4.5/5)
- System handles peak load (500+ concurrent users)

---

## 4. Testing Strategy

### 4.1 Testing Pyramid

**Unit Tests (70%)**
- Every service function
- Mock external dependencies
- Tools: Jest, JUnit
- Target: 90% code coverage

**Integration Tests (20%)**
- Service-to-service communication
- Database interactions
- Tools: Supertest, Testcontainers
- Target: All critical paths covered

**E2E Tests (10%)**
- Full user journeys
- Tools: Playwright, Cypress
- Scenarios:
  - Mobile order → payment → kitchen → pickup
  - Kiosk order → print receipt
  - Platform order import → sync

### 4.2 Performance Testing

**Load Testing**
- Tool: k6, JMeter
- Scenarios:
  - Normal: 500 concurrent users
  - Peak: 1000 concurrent users
  - Spike: 2000 sudden surge
- Metrics: Response time, throughput, error rate

**Stress Testing**
- Find breaking point
- Test auto-scaling
- Database connection pool limits

**Endurance Testing**
- 24-hour sustained load
- Check for memory leaks
- Connection leaks

### 4.3 Security Testing

**Static Analysis**
- SonarQube for code quality
- Snyk for dependency vulnerabilities
- ESLint security rules

**Dynamic Testing**
- OWASP ZAP automated scans
- SQL injection, XSS, CSRF tests
- Authentication bypass attempts

**Penetration Testing**
- Annual third-party audit
- Payment flow security review
- PCI DSS compliance validation

### 4.4 User Acceptance Testing (UAT)

**Pilot Program (3 Restaurants)**
- Week 1: Training, onboarding
- Week 2: Live operation, feedback collection
- Metrics:
  - System stability (uptime)
  - Order accuracy
  - User satisfaction survey

**Beta Testing**
- 10 restaurants, 4 weeks
- Gather feature requests
- Identify edge cases

---

## 5. Deployment Strategy

### 5.1 Infrastructure Architecture

**Cloud Provider**: AWS (multi-region for DR)
- **Primary Region**: us-east-1
- **DR Region**: us-west-2

**Kubernetes Cluster (EKS)**
- **Node Groups**:
  - General (t3.large, 3-10 nodes, auto-scaling)
  - Memory-optimized (r5.xlarge for Redis)
  - Compute-optimized (c5.2xlarge for analytics)
- **Namespaces**: dev, staging, production

**Database Deployment**
- **RDS PostgreSQL**: Multi-AZ, automated backups
- **MongoDB Atlas**: Replica set (M10 tier)
- **ElastiCache Redis**: Cluster mode enabled

**Storage**
- **S3 Buckets**: 
  - `prod-images` (menu photos)
  - `prod-receipts` (PDF archives)
  - `prod-backups` (database dumps)

### 5.2 CI/CD Pipeline

**GitHub Actions Workflow**:
```yaml
Trigger: Push to main/develop
Steps:
1. Lint & Code Quality (ESLint, Prettier, SonarQube)
2. Unit Tests (Jest, coverage report)
3. Build Docker Images (tag: {commit-sha})
4. Push to ECR
5. Integration Tests (Testcontainers)
6. Deploy to Staging (Kubernetes)
7. E2E Tests (Playwright on staging)
8. Security Scan (Trivy)
9. Manual Approval (for production)
10. Deploy to Production (blue-green)
11. Smoke Tests
12. Rollback on failure
```

**Deployment Strategy**:
- **Staging**: Auto-deploy on merge to develop
- **Production**: Blue-green deployment with manual approval
- **Rollback**: One-click revert to previous version

### 5.3 Monitoring & Alerting

**Metrics (Prometheus + Grafana)**
- **Service Metrics**: Request rate, latency, error rate
- **Infrastructure**: CPU, memory, disk, network
- **Business Metrics**: Orders/min, revenue/hour, conversion rate

**Dashboards**:
- Overview (all services health)
- Order Service (state machine flow)
- Payment Service (success rate)
- Infrastructure (resource utilization)

**Alerts (PagerDuty)**
- **P1 (Critical)**: Service down, payment failure spike
- **P2 (High)**: High error rate, slow response
- **P3 (Medium)**: Low stock, device offline
- **P4 (Low)**: Anomaly detected

**Logging (ELK Stack)**
- Centralized logs from all services
- Structured logging (JSON)
- Log retention: 30 days hot, 1 year archive

**Distributed Tracing (Jaeger)**
- Trace requests across microservices
- Identify bottlenecks
- Debug complex failures

### 5.4 Disaster Recovery

**Backup Strategy**
- **Databases**: Daily snapshots, 30-day retention, point-in-time recovery
- **Configuration**: GitOps (all config in Git)
- **Images**: Multi-region replication (S3)

**RTO/RPO Targets**
- **Recovery Time Objective (RTO)**: 4 hours
- **Recovery Point Objective (RPO)**: 1 hour

**DR Procedure**:
1. Detect outage (automated health checks)
2. Notify on-call engineer (PagerDuty)
3. Attempt auto-recovery (Kubernetes restart)
4. If regional failure: Failover to DR region
5. Update DNS (Route53)
6. Validate functionality
7. Postmortem within 48 hours

---

## 6. Team Structure & Roles

### Development Team (Months 1-9)

**Engineering (6 FTE)**
- **Tech Lead** (1): Architecture, code review, mentoring
- **Backend Engineers** (3): Microservices development (Node.js, Java, Python)
- **Frontend Engineers** (2): React, Electron, UI/UX implementation

**Quality & Operations (2 FTE)**
- **DevOps Engineer** (1): Infrastructure, CI/CD, monitoring
- **QA Engineer** (1): Test automation, load testing

**Product & Design (2 FTE)**
- **Product Manager** (1): Requirements, backlog, stakeholder communication
- **UI/UX Designer** (1): Wireframes, visual design, user research

**Total**: 10 FTE

### Maintenance Team (Year 2+)

**Core Team (3 FTE)**
- **Full-Stack Engineer** (1): Feature development
- **DevOps/SRE** (1): Operations, performance
- **Support Engineer** (0.5): Customer support, bug fixes
- **Product Manager** (0.5): Roadmap, prioritization

---

## 7. Development Standards

### 7.1 Coding Standards

**TypeScript (Backend & Frontend)**
- **ESLint**: Airbnb TypeScript config + strict rules
- **Prettier**: Code formatting, consistent style
- **tsconfig.json**: Strict mode enabled
  - `strict: true`
  - `noImplicitAny: true`
  - `strictNullChecks: true`
- **Naming Conventions**:
  - Variables/Functions: camelCase
  - Classes/Interfaces: PascalCase
  - Constants: UPPER_SNAKE_CASE
  - Private members: prefix with underscore `_private`
- **Async/Await**: Prefer over callbacks and promises chains
- **Error Handling**: 
  - Always use try/catch for async operations
  - Custom error classes for domain errors
  - Explicit error types
- **Exports**: Named exports over default exports
- **Comments**: JSDoc for public APIs

### 7.2 API Design

**REST Principles**
- Versioning in URL: `/api/v1/`
- Resource naming: Plural nouns (`/orders`, `/items`)
- HTTP methods: GET (read), POST (create), PUT (replace), PATCH (update), DELETE
- Status codes: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 404 (Not Found), 500 (Server Error)

**Request/Response Format**
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2025-12-17T10:30:00Z"
}
```

**Pagination**
```
GET /api/v1/orders?page=1&limit=20
Response: { data: [...], pagination: { total, page, limit } }
```

**Authentication**: Bearer token in `Authorization` header

### 7.3 Database Standards

**Naming Conventions**
- Tables: snake_case, plural (`orders`, `order_items`)
- Columns: snake_case (`created_at`, `user_id`)
- Indexes: `idx_{table}_{column}`
- Foreign keys: `fk_{table}_{ref_table}`

**Migrations**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   
- Versioned with Flyway/Liquibase
- Never modify existing migrations
- Always backward compatible

**Query Optimization**
- Index all foreign keys
- Avoid SELECT *
- Use EXPLAIN for complex queries
- Limit result sets

### 7.4 Git Workflow

**Branching Strategy**
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/{ticket}-{description}` - Feature branches
- `hotfix/{issue}` - Emergency fixes

**Commit Messages**
```
<type>(<scope>): <subject>

<body>

<footer>
```
Types: feat, fix, docs, refactor, test, chore

**Pull Requests**
- Required: 2 approvals, passing CI
- Squash merge to main
- Delete branch after merge

---

## 8. Risk Mitigation

### Technical Risks

**Risk 1: Third-party API Downtime**
- **Mitigation**: Circuit breaker pattern, fallback queues, multiple provider support
- **Monitoring**: Alert on elevated error rates

**Risk 2: Database Bottleneck**
- **Mitigation**: Read replicas, caching (Redis), query optimization, connection pooling
- **Monitoring**: Query performance tracking, slow query log

**Risk 3: WebSocket Connection Issues**
- **Mitigation**: Auto-reconnect, heartbeat/ping-pong, fallback to polling
- **Monitoring**: Connection drop rate

**Risk 4: Payment Gateway Failures**
- **Mitigation**: Multiple gateway support, idempotent retry, detailed logging
- **Monitoring**: Payment success rate, reconciliation alerts

### Operational Risks

**Risk 5: Deployment Failures**
- **Mitigation**: Blue-green deployment, automated smoke tests, instant rollback
- **Monitoring**: Deployment success tracking, error spike detection

**Risk 6: Data Loss**
- **Mitigation**: Automated backups, point-in-time recovery, multi-region replication
- **Monitoring**: Backup success verification, integrity checks

**Risk 7: Security Breach**
- **Mitigation**: Regular security audits, dependency scanning, WAF, rate limiting
- **Monitoring**: Intrusion detection, anomalous access patterns

---

## 9. Success Criteria

### Technical KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response Time (p95) | < 300ms | Prometheus |
| System Uptime | > 99.5% | Uptime monitoring |
| Order Processing Success | > 99% | Application logs |
| Database Query Time (p95) | < 50ms | Database monitoring |
| Payment Success Rate | > 98% | Payment service metrics |
| WebSocket Connection Stability | > 95% | Connection tracking |

### Code Quality KPIs

| Metric | Target |
|--------|--------|
| Unit Test Coverage | > 85% |
| Code Review Turnaround | < 24 hours |
| Critical Bugs in Production | < 1 per sprint |
| Security Vulnerabilities (High/Critical) | 0 |

### Deployment KPIs

| Metric | Target |
|--------|--------|
| Deployment Frequency | Daily (staging), Weekly (production) |
| Deployment Success Rate | > 95% |
| Mean Time to Recovery (MTTR) | < 1 hour |
| Change Failure Rate | < 15% |

---

## 10. Documentation Requirements

### Technical Documentation
- [ ] API Documentation (OpenAPI/Swagger)
- [ ] Architecture Decision Records (ADRs)
- [ ] Database Schema Documentation
- [ ] Deployment Runbook
- [ ] Disaster Recovery Playbook
- [ ] Security & Compliance Guide

### User Documentation
- [ ] Merchant Onboarding Guide
- [ ] User Manual (Mobile/Kiosk/POS)
- [ ] Admin Dashboard Guide
- [ ] FAQ & Troubleshooting
- [ ] Video Tutorials

### Developer Documentation
- [ ] Setup & Installation Guide
- [ ] Contribution Guidelines
- [ ] Code Style Guide
- [ ] Testing Guide
- [ ] Release Process

---

## 11. Post-Launch Support

### Maintenance Plan

**Monthly**
- Security patches
- Dependency updates
- Performance review
- Cost optimization

**Quarterly**
- Feature releases
- Infrastructure review
- Capacity planning
- Security audit

**Annual**
- Major version upgrade
- Penetration testing
- Architecture review
- Tech debt cleanup

### Support Tiers

**Tier 1 (Customer Support)**
- Email/Chat support
- Basic troubleshooting
- FAQ & documentation

**Tier 2 (Technical Support)**
- Advanced troubleshooting
- Data analysis
- System configuration

**Tier 3 (Engineering)**
- Bug fixes
- Hot patches
- Root cause analysis

**SLA Targets**
- **Critical**: 1 hour response, 4 hour resolution
- **High**: 4 hour response, 24 hour resolution
- **Medium**: 24 hour response, 3 day resolution
- **Low**: 3 day response, 1 week resolution

---

## 12. Appendices

### A. Technology Decision Rationale

**Why TypeScript for All Backend Services?**
- **Type Safety**: Catch errors at compile time, not runtime
- **Frontend-Backend Consistency**: Same language reduces context switching, shared types between frontend and backend
- **Better IDE Support**: IntelliSense, auto-completion, refactoring tools
- **Maintainability**: Self-documenting code, easier team onboarding
- **AWS Lambda Performance**: Node.js has fast cold start times (~300ms)
- **Rich Ecosystem**: npm packages for every integration need
- **Async I/O**: Perfect for I/O-bound operations (API calls, DB queries)

**Why Serverless (AWS Lambda)?**
- **Cost Efficiency**: Pay only for actual execution time (vs. 24/7 server costs)
- **Auto-Scaling**: Handles traffic spikes automatically (0 → 1000 concurrent in seconds)
- **No Server Management**: Focus on business logic, not patching OS
- **Built-in HA**: Multi-AZ deployment by default, automatic failover
- **Fast Iteration**: Deploy individual functions without full system restart

**Why Aurora Serverless PostgreSQL as Primary Database?**
- **Developer Familiarity**: SQL is universal, less learning curve than NoSQL query languages
- **Relational Data**: Restaurant systems have natural relationships (orders ↔ items ↔ users)
- **ACID Transactions**: Critical for orders, payments, inventory (atomicity guarantees)
- **Flexible Queries**: Ad-hoc analytics without pre-designed access patterns
- **Drizzle ORM**: Lightweight (~5KB), type-safe queries, optimized for serverless cold starts
- **JSONB Support**: Best of both worlds (structured + flexible schema for config data)
- **Mature Ecosystem**: pgAdmin, DataGrip, countless tools and extensions
- **Cost-Effective**: Aurora Serverless v2 auto-pauses when idle, scales to zero

**Why Redis for Caching?**
- **Speed**: Sub-millisecond latency for hot data (menu, store config)
- **TTL Management**: Auto-expiry for cache invalidation
- **Versatility**: Cache, session storage, distributed locks, pub/sub
- **Lambda Compatible**: ElastiCache works seamlessly with VPC Lambda

**Why RDS Proxy?**
- **Connection Pooling**: Solves Lambda's connection limit problem (PostgreSQL max connections)
- **Reduced Cold Starts**: Reuses DB connections across Lambda invocations
- **Failover**: Automatic redirect on DB failure
- **IAM Authentication**: No hardcoded DB passwords

**When Would We Use DynamoDB?**
- **Extreme Scale**: If hitting 100K+ TPS (transactions per second)
- **Key-Value Only**: Data with simple access patterns (single-key lookups)
- **Global Tables**: Multi-region active-active (not needed for restaurant system)
- **Event Sourcing**: When DynamoDB Streams are critical to architecture

**For This Restaurant System**: Aurora PostgreSQL + Redis is the optimal choice for 99% of restaurants (even chains with 100+ locations).

### B. Third-Party Services

| Service | Provider | Purpose | Cost |
|---------|----------|---------|------|
| Payment | Stripe | Credit card processing | 2.9% + $0.30/txn |
| SMS | Twilio | Order notifications | $0.0075/msg |
| Email | SendGrid | Transactional emails | $0.0002/email |
| Push | Firebase Cloud Messaging | App push notifications | Free |
| Maps | Google Maps API | Store locator, delivery zones | $7/1000 requests |
| Monitoring | Datadog (alternative) | APM, logs, metrics | $15/host/month |

### C. Hardware Recommendations

**Recommended Devices**
- **Receipt Printer**: Star TSP654II ($400)
- **Card Terminal**: PAX A920 ($600)
- **Kiosk Screen**: Elo 22" Touchscreen ($1,200)
- **KDS Display**: Samsung 43" Commercial TV ($600)
- **Cash Drawer**: APG Vasario ($200)

### D. Compliance Checklist

- [ ] **PCI DSS Level 1**: Payment card industry data security
- [ ] **GDPR**: EU data protection (if serving EU customers)
- [ ] **PDPA**: Personal Data Protection Act (local regulations)
- [ ] **ADA**: Accessibility standards for Kiosk
- [ ] **SOC 2 Type II**: Security audit (for enterprise clients)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-17 | Technical Team | Initial draft |
| 1.1 | 2025-12-22 | Simon Chou | Aligned technical concepts with v1.0 Design Specs: Recipe-Driven Inventory (Ingredients & Variants), Centralized Variant Registry, RBAC with LEAD role, Manual Discounts in v0.2.0, Delivery Platform Integration limited to UberEats & Foodpanda (Deliveroo removed), Multi-tenancy emphasis |

---

**Next Steps**:
1. Review and approve by Tech Lead & CTO
2. Refine estimates based on team feedback
3. Begin infrastructure setup (Phase 1, Week 1)
4. Schedule bi-weekly architecture review meetings

**Contact**:
- **Tech Lead**: [Name, Email]
- **DevOps Lead**: [Name, Email]
- **Product Manager**: [Name, Email]
