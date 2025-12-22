# Architecture Overview

**Document Version**: 1.0  
**Last Updated**: December 21, 2025  
**Owner**: Simon Chou  
**Status**: Living Document (MVP + Inventory + POS Scope)

---

## Purpose

This document provides a high-level overview of the My Online Ordering System architecture. It serves as the entry point for understanding the system's structure, design principles, and component interactions.

**Target Audience**: Developers, AI assistants, architects, technical stakeholders

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [System Components](#system-components)
4. [Communication Patterns](#communication-patterns)
5. [Technology Stack](#technology-stack)
6. [Deployment Architecture](#deployment-architecture)
7. [Security Architecture](#security-architecture)
8. [Data Flow Diagrams](#data-flow-diagrams)

---

## System Overview

### High-Level Description

The My Online Ordering System is a **serverless, event-driven, microservices-based** platform that enables restaurants to manage multi-channel ordering operations (mobile web, kiosk, POS, third-party platforms).

### Key Characteristics

- **Architecture Style**: Serverless microservices with event-driven communication
- **Cloud Provider**: AWS (Primary: us-east-1, DR: us-west-2)
- **Compute Model**: AWS Lambda (Node.js 20.x)
- **Database**: Aurora Serverless v2 PostgreSQL (primary) + ElastiCache Redis (cache)
- **API Gateway**: AWS API Gateway (HTTP + WebSocket)
- **Event Bus**: AWS EventBridge
- **Message Queue**: SQS + SNS
- **Frontend**: React 18 + TypeScript + Vite (5 applications)

### System Boundaries

**In Scope (v0.2.0 - MVP + Inventory + POS)**:
- Order management (creation, tracking, fulfillment)
- Menu and inventory management
- Payment processing (Stripe integration)
- User authentication and authorization (AWS Cognito)
- Kitchen operations (KDS)
- POS and kiosk operations

**Out of Scope for v0.2.0** (Future versions):
- Multi-channel order aggregation (UberEats, Foodpanda)
- CRM and analytics
- Delivery logistics (handled by third-party platforms)
- Accounting and tax calculation (export data only)
- Supply chain management
- Human resources management

---

## Architecture Principles

### 1. Serverless-First
- Prefer managed services over self-managed infrastructure
- Lambda functions for compute (auto-scaling, pay-per-use)
- Aurora Serverless v2 for database (auto-scaling capacity)
- Minimize operational overhead

### 2. Event-Driven Architecture
- Loose coupling through EventBridge
- Asynchronous processing for non-blocking operations
- Event sourcing for audit trails
- Pub/Sub pattern for fan-out scenarios

### 3. API-First Design
- All services expose RESTful APIs
- OpenAPI specification as contract
- Versioned APIs (/api/v1/)
- Consistent request/response formats

### 4. Domain-Driven Design
- Microservices aligned with business domains
- Clear service boundaries
- Each service owns its data
- No direct database access between services

### 5. Resilience and Fault Tolerance
- Retry mechanisms with exponential backoff
- Dead Letter Queues (DLQ) for failed messages
- Circuit breakers for external dependencies
- Idempotent operations (using Redis idempotency keys)

### 6. Security by Design
- Authentication via AWS Cognito (JWT tokens)
- Authorization via RBAC (Role-Based Access Control)
- Encryption in transit (TLS 1.3) and at rest (AES-256)
- PCI DSS Level 1 compliance for payment processing
- Secrets management via AWS Secrets Manager

### 7. Observability
- Centralized logging (CloudWatch Logs)
- Distributed tracing (X-Ray)
- Metrics and monitoring (CloudWatch)
- Structured logging (JSON format)

---

## System Components

### Backend Microservices (9 Services)

#### Core Business Services

| Service | Responsibility | Key Technologies |
|---------|---------------|-----------------|
| **Menu Service** | Product catalog, pricing, images, availability | Lambda, Drizzle ORM, PostgreSQL, Redis, S3 |
| **Order Service** | Order lifecycle, state machine, coordination | Lambda, Drizzle ORM, PostgreSQL, Step Functions |
| **Inventory Service** | Stock tracking, reservation, alerts | Lambda, Drizzle ORM, PostgreSQL, Redis |
| **Payment Service** | Payment processing, reconciliation | Lambda, Drizzle ORM, PostgreSQL, Stripe SDK |

#### User & Access Management

| Service | Responsibility | Key Technologies |
|---------|---------------|-----------------|
| **Authorization Service** | Authentication, RBAC, session management | Cognito, Lambda, Drizzle ORM, PostgreSQL |
| **User Profile Service** | Customer data, preferences, order history | Lambda, Drizzle ORM, PostgreSQL, Redis |

#### Operational Services

| Service | Responsibility | Key Technologies |
|---------|---------------|-----------------|
| **Store Service** | Restaurant config, hours, delivery rules | Lambda, Drizzle ORM, PostgreSQL, Redis |
| **Device Service** | Hardware registry, print jobs, health monitoring | Lambda, Drizzle ORM, PostgreSQL, AWS IoT Core, SQS |
| **Notification Service** | Multi-channel messaging, real-time push | Lambda, Drizzle ORM, PostgreSQL, Redis, WebSocket, SES, SNS |

#### Business Intelligence

**Status**: Out of scope for v0.2.0 (MVP + Inventory + POS)

**Future Services**:
- CRM Service (Loyalty, coupons, customer segmentation)
- Report Service (Analytics, dashboards, anomaly detection)

**Extensibility**: Order schema includes discount/discountReason fields for future CRM integration.

#### Integration Layer

**Status**: Out of scope for v0.2.0 (MVP + Inventory + POS)

**Future Services**:
- Delivery Platform Webhooks (UberEats/Foodpanda integration, sync)

**Extensibility**: OrderSource enum can be extended to include UBEREATS/FOODPANDA in future versions.

### Frontend Applications (5 Applications)

| Application | Type | Purpose | Key Technologies |
|------------|------|---------|-----------------|
| **User Client** | PWA | Mobile-first web app for customer ordering | React 18, TypeScript, Vite, Redux Toolkit, SCSS |
| **Merchant Dashboard** | Web App | Restaurant management console | React 18, TypeScript, Vite, Redux Toolkit, Recharts |
| **Kiosk** | Electron | Self-service ordering terminal | Electron, React 18, TypeScript, Vite |
| **POS** | Electron | Point-of-sale for counter orders | Electron, React 18, TypeScript, Vite |
| **KDS** | Web App | Kitchen Display System for order preparation | React 18, TypeScript, Vite, WebSocket |

---

## Communication Patterns

### 1. Synchronous Communication (REST API)

**Pattern**: Request-Response  
**Technology**: API Gateway (HTTP API) → Lambda  
**Use Cases**: CRUD operations, queries, immediate responses

**Flow**:
```
Client → API Gateway → Lambda Authorizer (JWT validation)
                    → Lambda Handler → RDS Proxy → PostgreSQL
                                    → Response
```

**API Structure**:
- Base URL: `https://api.example.com`
- Version: `/api/v1/`
- Resources: `/stores`, `/menu`, `/orders`, etc.

### 2. Asynchronous Communication (Event-Driven)

**Pattern**: Pub/Sub  
**Technology**: EventBridge → Lambda/SQS/SNS  
**Use Cases**: Domain events, cross-service communication, fan-out

**Flow**:
```
Service A → EventBridge Event Bus → EventBridge Rules
                                  → Lambda Function (Service B)
                                  → SQS Queue (Service C)
                                  → SNS Topic → Multiple Subscribers
```

**Event Examples**:
- `Order.Created` → Notification Service + Inventory Service
- `Payment.Success` → Order Service
- `Stock.LowAlert` → Notification Service

### 3. Real-time Communication (WebSocket)

**Pattern**: Persistent Connection  
**Technology**: API Gateway WebSocket API  
**Use Cases**: Order tracking, KDS updates, live notifications

**Flow**:
```
Client → WebSocket Connection → API Gateway → Lambda ($connect)
                                            → Store connectionId in Redis
      ← WebSocket Message ← Lambda → API Gateway @connections
```

**Routes**:
- `$connect`: Authenticate and store connection ID
- `$disconnect`: Clean up connection ID
- `$default`: Handle incoming messages

### 4. Message Queue Pattern

**Pattern**: Work Queue  
**Technology**: SQS (Standard/FIFO)  
**Use Cases**: Print jobs, webhook retries, batch processing

**Flow**:
```
Producer → SQS Queue → Lambda Consumer (long polling)
                    → Dead Letter Queue (if failed after 3 retries)
```

---

## Technology Stack

### Backend Layer

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Runtime** | Node.js | 20.x | Lambda runtime environment |
| **Language** | TypeScript | 5.x | Type-safe backend development |
| **ORM** | Drizzle ORM | 0.30.x | Lightweight database access (~5KB, optimized for serverless) |
| **API Framework** | AWS Lambda | - | Serverless compute |
| **Authentication** | AWS Cognito | - | User management and JWT |
| **Database** | Aurora Serverless v2 PostgreSQL | 15.x | Primary data store |
| **Cache** | ElastiCache Redis | 7.x | Caching and temporary data |
| **Event Bus** | EventBridge | - | Event-driven communication |
| **Message Queue** | SQS + SNS | - | Asynchronous processing |
| **State Machine** | Step Functions | - | Order workflow orchestration |
| **Object Storage** | S3 + CloudFront | - | Image storage and CDN |
| **Analytics** | Glue + Athena | - | Data lake and SQL analytics |

### Frontend Layer

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | React | 18.x | UI library |
| **Language** | TypeScript | 5.x | Type-safe frontend development |
| **Build Tool** | Vite | 5.x | Fast dev server and bundler |
| **State Management** | Redux Toolkit | 2.x | Global state management |
| **Styling** | SCSS (Sass) | - | CSS with variables and nesting |
| **CSS Architecture** | CSS Modules + BEM | - | Component-scoped styles |
| **HTTP Client** | Axios | 1.x | API requests |
| **Desktop Runtime** | Electron | 28.x | Kiosk and POS applications |

### DevOps & Infrastructure

| Category | Technology | Purpose |
|----------|-----------|---------|
| **IaC** | AWS SAM / CDK | Infrastructure as Code |
| **CI/CD** | GitHub Actions | Automated testing and deployment |
| **Monitoring** | CloudWatch | Metrics, logs, alarms |
| **Tracing** | X-Ray | Distributed tracing |
| **Secrets** | Secrets Manager | API keys and credentials |
| **DNS** | Route 53 | Domain management |
| **Security** | WAF + Shield | DDoS protection |

---

## Deployment Architecture

### AWS Services Topology

```
┌─────────────────────────────────────────────────────────────┐
│                        CloudFront CDN                        │
│                  (Static Assets, Image Delivery)             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     Route 53 (DNS)                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  AWS WAF + Shield                            │
│                  (DDoS Protection, Rate Limiting)            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│               API Gateway (HTTP + WebSocket)                 │
│              - Lambda Authorizer (JWT)                       │
│              - Throttling (100 req/s per IP)                 │
│              - CORS Configuration                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Lambda Functions                           │
│         (12 Backend Services, 50+ Functions)                 │
└─────────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  RDS Proxy  │    │   EventBridge    │    │   SQS + SNS     │
│ (Connection │    │   (Event Bus)    │    │ (Message Queue) │
│   Pooling)  │    └──────────────────┘    └─────────────────┘
└─────────────┘              ↓
       ↓                     ↓
┌─────────────────────────────────────────────────────────────┐
│        Aurora Serverless v2 PostgreSQL (Multi-AZ)            │
│              - Auto-scaling capacity                         │
│              - ACID compliance                               │
│              - Point-in-time recovery                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│         ElastiCache Redis (Cluster Mode Enabled)             │
│              - Caching (menu, store, user profiles)          │
│              - WebSocket connections                         │
│              - Idempotency keys                              │
│              - Inventory locks                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    S3 + CloudFront                           │
│              - Image storage (menu photos)                   │
│              - Data lake (historical analytics)              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 AWS IoT Core (MQTT)                          │
│              - Receipt printers                              │
│              - Kitchen label printers                        │
│              - Card readers                                  │
└─────────────────────────────────────────────────────────────┘
```

### Multi-Region Architecture

**Primary Region**: us-east-1  
**DR Region**: us-west-2

**Failover Strategy**:
- Route 53 health checks
- Aurora Global Database (cross-region replication)
- S3 cross-region replication
- Lambda deployment in both regions (dormant in DR)
- RTO: 4 hours
- RPO: 1 hour

---

## Security Architecture

### Authentication Flow

```
User → Cognito User Pool → JWT Token (RS256)
                         → Lambda Authorizer (API Gateway)
                         → Verify JWT signature
                         → Check user permissions (PostgreSQL)
                         → Allow/Deny request
```

### Authorization Model (RBAC)

**Roles**:
- **User** (Customer): Browse menu, place orders, view order history
- **Merchant** (Owner): Full access to store management
- **Manager**: Order management, reports, staff management
- **Cashier**: POS operations, basic order management
- **Admin** (System): System-wide access (internal only)

**Permission Matrix**: See `API_CONTRACT.md` for endpoint-level permissions

### Data Protection

**Encryption in Transit**:
- TLS 1.3 for all HTTPS traffic
- WebSocket Secure (WSS)

**Encryption at Rest**:
- Aurora: AWS KMS encryption
- S3: AES-256 server-side encryption
- ElastiCache: Encryption at rest enabled

**PCI DSS Compliance**:
- Payment Service uses Stripe (PCI DSS Level 1 certified)
- No credit card data stored in our database
- Tokenization for saved payment methods

---

## Data Flow Diagrams

### Order Creation Flow (Happy Path)

```
1. User Client (PWA)
   ↓ POST /api/v1/orders
   
2. API Gateway
   ↓ Lambda Authorizer (verify JWT)
   
3. Order Service (order-create-handler)
   ↓ Validate order items against Menu Service (cache)
   ↓ Reserve inventory (Inventory Service via EventBridge)
   ↓ Create order record (PostgreSQL via Drizzle ORM)
   ↓ Publish event: Order.Created
   
4. EventBridge
   ↓ Route event to multiple targets
   
5a. Notification Service
    ↓ Send confirmation email (SES)
    ↓ Push WebSocket message to user
    
5b. Inventory Service
    ↓ Commit reserved stock
    
6. Payment Service (async)
   ↓ Process payment via Stripe
   ↓ Publish event: Payment.Success
   
7. Order Service
   ↓ Update order status: PENDING → PAID
   ↓ Publish event: Order.StatusChanged
   
8. KDS (Kitchen Display System)
   ↓ Receive WebSocket push
   ↓ Display order on kitchen screen
```

### Menu Update Flow

```
1. Merchant Dashboard
   ↓ PATCH /api/v1/menu/items/:id
   
2. API Gateway
   ↓ Lambda Authorizer (verify Merchant role)
   
3. Menu Service (menu-update-handler)
   ↓ Update PostgreSQL record
   ↓ Invalidate Redis cache: menu:{storeId}
   ↓ Publish event: Menu.Updated
   
4. EventBridge
   ↓ Route event
   
5. Notification Service
    ↓ Notify subscribed users (optional)
```

---

## Service Dependencies

### Dependency Graph

```
Authorization Service (Independent)
    ↓ (Provides JWT validation)
    ↓
Store Service (Independent)
    ↓
Menu Service
    ↓ (Depends on Store)
    ↓
Order Service ← Payment Service
    ↓              ↓
    ↓ (Depends on Menu, Inventory, Payment)
    ↓
Inventory Service
    ↓
Notification Service (Subscribes to all events)

User Profile Service (Depends on Authorization)

Device Service (Depends on Store)

// Out of scope for v0.2.0:
// CRM Service (Depends on User Profile, Order)
// Report Service (Depends on Order, User Profile, CRM)
// Delivery Platform Webhooks (Depends on Order, Menu, Inventory)
```

### Critical Path Services

**Tier 1 (Must be available for basic ordering)**:
- Authorization Service
- Store Service
- Menu Service
- Order Service
- Payment Service

**Tier 2 (Enhanced functionality)**:
- Inventory Service
- Notification Service
- User Profile Service
- Device Service

**Tier 3 (Future - Out of scope for v0.2.0)**:
- CRM Service
- Report Service
- Delivery Platform Webhooks Service

---

## Performance Targets

### API Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response Time (p95) | < 200ms | CloudWatch |
| API Response Time (p99) | < 500ms | CloudWatch |
| Database Query Time (p95) | < 50ms | PostgreSQL logs |
| Cache Hit Rate | > 80% | Redis metrics |
| Lambda Cold Start | < 1s | X-Ray |

### System Capacity

| Metric | Target |
|--------|--------|
| Concurrent Users | 500+ |
| Orders per Hour | 1000+ |
| WebSocket Connections | 10,000+ |
| System Uptime | 99.9% (monthly SLA) |

### Scalability

- **Lambda**: Auto-scales to 1,000 concurrent executions per region
- **Aurora**: Auto-scales from 0.5 ACU to 128 ACU
- **Redis**: Cluster mode with 5 shards, 1 replica per shard
- **API Gateway**: 10,000 requests per second (regional limit)

---

## Related Documents

- **[API_CONTRACT.md](./API_CONTRACT.md)**: Complete REST API specification (OpenAPI)
- **[EVENT_CONTRACT.md](./EVENT_CONTRACT.md)**: EventBridge event schemas
- **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)**: Complete Drizzle ORM schema and ER diagrams
- **[SHARED_TYPES.md](./SHARED_TYPES.md)**: TypeScript type definitions
- **[SOFTWARE_DEVELOPMENT_PLAN.md](./SOFTWARE_DEVELOPMENT_PLAN.md)**: Detailed development plan

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-21 | Simon Chou | Initial Baseline (Scope: v0.2.0 MVP + Inventory + POS) |

---

## Contact

**Architecture Owner**: Simon Chou  
**Questions**: Refer to inline comments or contact via project repository
