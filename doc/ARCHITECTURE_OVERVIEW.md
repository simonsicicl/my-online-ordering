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
- **Cloud Provider**: AWS
- **Compute Model**: AWS Lambda (Node.js 20.x)
- **Database**: PostgreSQL (Amazon RDS)
- **Cache**: Redis (ElastiCache)
- **API Gateway**: AWS API Gateway (HTTP + WebSocket)
- **Event Bus**: AWS EventBridge
- **Message Queue**: SQS + SNS
- **Frontend**: React 18 + TypeScript + Vite (5 applications)

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
- **Identity First**: Centralized identity management for all users and services
- **Zero Trust**: Verify every request, encrypt everything in transit and at rest
- **Least Privilege**: Granular permission scopes for all roles and services
- **Defense in Depth**: Multiple layers of security controls (Network, App, Data)
- **Compliance**: Adherence to PCI DSS standards for payment data
- *(See [Security Architecture](#security-architecture) for implementation details)*

### 7. Observability
- Centralized logging (CloudWatch Logs)
- Distributed tracing (X-Ray)
- Metrics and monitoring (CloudWatch)
- Structured logging (JSON format)

---

## System Components

### Backend Microservices (9 Services)

> **Standard Stack**: All backend services use **AWS Lambda** for compute, **Drizzle ORM** for data access, and **PostgreSQL** as the primary data store. The table below lists additional service-specific technologies.

#### Core Business Services

| Service | Responsibility | Additional Technologies |
|---------|---------------|------------------------|
| **Menu Service** | Product catalog, pricing, images, availability | Redis, S3 |
| **Order Service** | Order lifecycle, state machine, coordination | Step Functions |
| **Inventory Service** | Stock tracking, reservation, alerts | Redis |
| **Payment Service** | Payment processing, reconciliation | Stripe SDK, SSM Parameter Store |

#### User & Access Management

| Service | Responsibility | Additional Technologies |
|---------|---------------|------------------------|
| **Authorization Service** | Authentication, RBAC, session management | AWS Cognito, SSM Parameter Store |
| **User Profile Service** | Customer data, preferences, order history | Redis |

#### Operational Services

| Service | Responsibility | Additional Technologies |
|---------|---------------|------------------------|
| **Store Service** | Restaurant config, hours, store settings | Redis |
| **Device Service** | Hardware registry, print jobs, health monitoring | AWS IoT Core, SQS |
| **Notification Service** | Multi-channel messaging, real-time push | Redis, WebSocket, SES, SNS |

### Frontend Applications (5 Applications)

| Application | Type | Purpose |
|------------|------|---------|
| **User Client** | PWA | Mobile-first web app for customer ordering |
| **Merchant Dashboard** | Web App | Restaurant management console |
| **Kiosk** | Electron | Self-service ordering terminal |
| **POS** | Electron | Point-of-sale for counter orders |
| **KDS** | Web App | Kitchen Display System for order preparation |

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
- RDS max_connections limited by instance size
- Lambda concurrency limited to avoid connection exhaustion

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
| **Database** | Amazon RDS for PostgreSQL | 15.x | Primary data store |
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
│                        CloudFront CDN                       │
│                  (Static Assets, Image Delivery)            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     Route 53 (DNS)                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│               API Gateway (HTTP + WebSocket)                │
│              - Lambda Authorizer (JWT)                      │
│              - Rate Limiting & Throttling                   │
│              - CORS Configuration                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Lambda Functions                       │
│            (9 Backend Services, 40+ Functions)              │
│           Direct DB connections (no VPC required)           │
└─────────────────────────────────────────────────────────────┘
         ↓                     ↓                     ↓
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   EventBridge   │   │   SQS + SNS     │   │   S3 + CF       │
│   (Event Bus)   │   │ (Message Queue) │   │ (Image Storage) │
└─────────────────┘   └─────────────────┘   └─────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│              Amazon RDS for PostgreSQL                      │
│                                                             │
│  - Deployment: Single-AZ                                    │
│  - Network: PUBLIC SUBNET                                   │
│  - Access: Security Group (IP Allowlist)                    │
│  - Connection: Direct from Lambda (no RDS Proxy)            │
│  - Backup: Automated backups                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│         ElastiCache Redis (Cache Tier)                      │
│              - Caching (menu, store, user profiles)         │
│              - WebSocket connections                        │
│              - Idempotency keys                             │
│              - Inventory locks                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 AWS IoT Core (MQTT)                         │
│              - Receipt printers                             │
│              - Kitchen label printers                       │
│              - Card readers                                 │
└─────────────────────────────────────────────────────────────┘
```

### Network Architecture

```
┌─────────────────────────── VPC ───────────────────────────┐
│                                                           │
│  ┌────────────────── Public Subnet ────────────────────┐  │
│  │                                                     │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │   RDS PostgreSQL Instance                   │    │  │
│  │  │  - Publicly Accessible                      │    │  │
│  │  │  - Security Group:                          │    │  │
│  │  │    * Inbound: Port 5432 from Lambda         │    │  │
│  │  │    * Inbound: Port 5432 from Dev IPs        │    │  │
│  │  │    * Outbound: All (for AWS services)       │    │  │
│  │  └─────────────────────────────────────────────┘    │  │
│  │                                                     │  │
│  │   Direct Internet Gateway for outbound traffic      │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  Lambda Functions:                                        │
│  - NOT in VPC (access RDS via public endpoint)            │
│  - OR in VPC with Internet Gateway                        │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**Note**: For detailed security controls (SSL/TLS, IAM, Security Groups), please refer to the [Security Architecture](#security-architecture) section.


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
- **PostgreSQL SSL connections required** 

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
