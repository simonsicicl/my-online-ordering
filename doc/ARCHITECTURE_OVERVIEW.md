# Architecture Overview

**Document Version**: 1.1
**Last Updated**: December 22, 2025  
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
- **Cloud Provider**: AWS (Primary: us-east-1, Single-AZ)
- **Compute Model**: AWS Lambda (Node.js 20.x)
- **Database**: Amazon RDS for PostgreSQL (db.t3.micro, 20GB storage)
- **Cache**: ElastiCache Redis
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
- RDS PostgreSQL for database
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
- **Note**: Single-AZ RDS means no automatic failover (acceptable for MVP)

### 6. Security by Design
- Authentication via AWS Cognito (JWT tokens)
- Authorization via RBAC (Role-Based Access Control)
- Encryption in transit (TLS 1.3) and at rest (AES-256)
- PCI DSS Level 1 compliance for payment processing
- Secrets management via SSM Parameter Store (Standard tier, SecureString encryption)
- Public RDS with Security Group restrictions (IP allowlisting)
- API Gateway throttling for rate limiting (no WAF/Shield required for MVP)

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
| **Menu Service** | Product catalog, pricing, images, availability | Lambda, Drizzle ORM, RDS PostgreSQL, Redis, S3 |
| **Order Service** | Order lifecycle, state machine, coordination | Lambda, Drizzle ORM, RDS PostgreSQL, Step Functions |
| **Inventory Service** | Stock tracking, reservation, alerts | Lambda, Drizzle ORM, RDS PostgreSQL, Redis |
| **Payment Service** | Payment processing, reconciliation | Lambda, Drizzle ORM, RDS PostgreSQL, Stripe SDK, SSM Parameter Store |

#### User & Access Management

| Service | Responsibility | Key Technologies |
|---------|---------------|-----------------|
| **Authorization Service** | Authentication, RBAC, session management | Cognito, Lambda, Drizzle ORM, RDS PostgreSQL, SSM Parameter Store |
| **User Profile Service** | Customer data, preferences, order history | Lambda, Drizzle ORM, RDS PostgreSQL, Redis |

#### Operational Services

| Service | Responsibility | Key Technologies |
|---------|---------------|-----------------|
| **Store Service** | Restaurant config, hours, delivery rules | Lambda, Drizzle ORM, RDS PostgreSQL, Redis |
| **Device Service** | Hardware registry, print jobs, health monitoring | Lambda, Drizzle ORM, RDS PostgreSQL, AWS IoT Core, SQS |
| **Notification Service** | Multi-channel messaging, real-time push | Lambda, Drizzle ORM, RDS PostgreSQL, Redis, WebSocket, SES, SNS |

#### Business Intelligence

**Status**: Out of scope for v0.2.0 (MVP + Inventory + POS)

**Future Services**:
- CRM Service (Loyalty, coupons, SQL-based recommendations)
- Report Service (Analytics via direct PostgreSQL queries, dashboards)

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
                    → Lambda Handler → PostgreSQL Connection (Drizzle ORM)
                                    → Response
```

**API Structure**:
- Base URL: `https://api.example.com`
- Version: `/api/v1/`
- Resources: `/stores`, `/menu`, `/orders`, etc.

**Connection Management**:
- Direct Lambda-to-RDS connections via Drizzle ORM
- Connection pooling handled at application level (Drizzle client)
- RDS max_connections: 87 (for db.t3.micro)
- Lambda concurrency limit: 50 (configurable to avoid connection exhaustion)

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
| **Secrets Management** | SSM Parameter Store (Standard, SecureString) | - | Free Tier credential storage |
| **Authentication** | AWS Cognito | - | User management and JWT |
| **Database** | Amazon RDS for PostgreSQL | 15.x | Primary data store (db.t3.micro, 20GB gp2, Single-AZ, Public Subnet) |
| **Cache** | ElastiCache Redis | 7.x | Caching and temporary data |
| **Event Bus** | EventBridge | - | Event-driven communication |
| **Message Queue** | SQS + SNS | - | Asynchronous processing |
| **State Machine** | Step Functions | - | Order workflow orchestration |
| **Object Storage** | S3 + CloudFront | - | Image storage and CDN |
| **Analytics** | PostgreSQL (Direct SQL queries) | - | Data lake and SQL analytics |

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
| **Secrets** | SSM Parameter Store (Standard, SecureString) | API keys and credentials (Free Tier) |
| **DNS** | Route 53 | Domain management |
| **Security** | Security Groups + API Gateway Throttling | Network firewall, rate limiting |

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
│               API Gateway (HTTP + WebSocket)                 │
│              - Lambda Authorizer (JWT)                       │
│              - Throttling (100 req/s per IP)                 │
│              - CORS Configuration                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Lambda Functions                           │
│         (9 Backend Services, 40+ Functions)                  │
│         ⚡ Direct DB connections (no VPC required)           │
└─────────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   EventBridge   │    │   SQS + SNS      │    │   S3 + CF       │
│   (Event Bus)   │    │ (Message Queue)  │    │ (Image Storage) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│  ⚡ Amazon RDS for PostgreSQL (Free Tier)                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Instance: db.t3.micro (2 vCPU, 1GB RAM)                    │
│  Storage: 20GB General Purpose SSD (gp2)                    │
│  Deployment: Single-AZ (us-east-1a)                         │
│  Network: PUBLIC SUBNET                                     │
│  Access: Security Group (IP Allowlist)                      │
│  Connection: Direct from Lambda (no RDS Proxy)              │
│  Backup: 7 days automated backups                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  REMOVED: RDS Proxy (cost savings)                          │
│  REMOVED: Multi-AZ failover (cost savings)                  │
│  REMOVED: Private subnet + NAT Gateway (cost savings)       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│         ElastiCache Redis (Cache Tier)                       │
│              - Caching (menu, store, user profiles)          │
│              - WebSocket connections                         │
│              - Idempotency keys                              │
│              - Inventory locks                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 AWS IoT Core (MQTT)                          │
│              - Receipt printers                              │
│              - Kitchen label printers                        │
│              - Card readers                                  │
└─────────────────────────────────────────────────────────────┘
```

### Network Architecture

```
┌──────────────────── VPC (10.0.0.0/16) ────────────────────┐
│                                                            │
│  ┌─────────────── Public Subnet (10.0.1.0/24) ─────────┐ │
│  │                                                       │ │
│  │  ┌─────────────────────────────────────────────┐    │ │
│  │  │  ⚡ RDS PostgreSQL (db.t3.micro)           │    │ │
│  │  │  - Publicly Accessible = TRUE               │    │ │
│  │  │  - Security Group:                          │    │ │
│  │  │    * Inbound: Port 5432 from Lambda        │    │ │
│  │  │    * Inbound: Port 5432 from Dev IPs       │    │ │
│  │  │    * Outbound: All (for AWS services)      │    │ │
│  │  └─────────────────────────────────────────────┘    │ │
│  │                                                       │ │
│  │  ⚡ NO NAT GATEWAY (Cost Savings)                   │ │
│  │  ⚡ Direct Internet Gateway for outbound traffic    │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                            │
│  Lambda Functions:                                         │
│  - NOT in VPC (access RDS via public endpoint)            │
│  - OR in VPC with Internet Gateway (no NAT cost)          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Key Security Measures**:
1. **Security Group Allowlisting**: Only Lambda security group + specific dev IPs
2. **SSL/TLS Required**: All connections use TLS 1.3
3. **IAM Authentication**: Optional RDS IAM auth for enhanced security
4. **SSM Parameter Store**: Database credentials stored securely (Standard tier, SecureString)
5. **CloudWatch Alarms**: Monitor failed connection attempts

### Multi-Region Architecture

**Current Deployment**: Single region only (us-east-1)  
**Future Production Considerations**:
- Primary Region: us-east-1  
- DR Region: us-west-2  
- Route 53 health checks  
- RDS read replicas (cross-region)  
- S3 cross-region replication  

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
- **PostgreSQL SSL connections required** ⚡

**Encryption at Rest**:
- RDS: AWS KMS encryption
- S3: AES-256 server-side encryption
- ElastiCache: Encryption at rest enabled

**PCI DSS Compliance**:
- Payment Service uses Stripe (PCI DSS Level 1 certified)
- No credit card data stored in our database
- Tokenization for saved payment methods

**Network Security**:
- Security Group: Restrictive inbound rules (only Lambda + dev IPs)
- Public RDS: SSL required for all connections
- Security groups provide primary protection

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
   ↓ Create order record (PostgreSQL connection via Drizzle ORM)
   ↓ Publish event: Order.Created
   
4. EventBridge
   ↓ Route event to multiple targets
   
5a. Notification Service
    ↓ Send confirmation email (SES)
    ↓ Push WebSocket message to user
    
5b. Inventory Service
    ↓ Commit reserved stock (PostgreSQL via Drizzle ORM)
    
6. Payment Service (async)
   ↓ Process payment via Stripe
   ↓ Publish event: Payment.Success
   
7. Order Service
   ↓ Update order status: PENDING → PAID (PostgreSQL)
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
   ↓ Update PostgreSQL record (connection via Drizzle ORM)
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
| API Response Time (p95) | < 300ms | CloudWatch |
| API Response Time (p99) | < 800ms | CloudWatch |
| Database Query Time (p95) | < 100ms | PostgreSQL logs |
| Cache Hit Rate | > 70% | Redis metrics |
| Lambda Cold Start | < 1.5s | X-Ray |

### System Capacity

| Metric | Target |
|--------|--------|
| Concurrent Users | 100+ |
| Orders per Hour | 200+ |
| WebSocket Connections | 1,000+ |
| System Uptime | 99.0% (Single-AZ) |

### Scalability

- **Lambda**: Auto-scales to 1,000 concurrent executions per region
- **RDS**: Manual vertical scaling (upgrade instance type as needed)
- **Redis**: Single-node ElastiCache
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
| **1.1** | **2025-12-22** | **Simon Chou** | **Updated database architecture: Aurora Serverless v2 → RDS PostgreSQL (db.t3.micro, Single-AZ, Public Subnet), Connection model: RDS Proxy → Direct Lambda connections** |

---

## Contact

**Architecture Owner**: Simon Chou  
**Questions**: Refer to inline comments or contact via project repository
