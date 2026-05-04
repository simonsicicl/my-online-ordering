# My Online Ordering System - Software Development Plan

## Document Information
- **Version**: 1.5
- **Date**: December 22, 2025
- **Status**: Master Roadmap (Aligned with v1.1 Design Specs)
- **Owner**: Simon Chou
- **Related**: [CONCEPT.md](./CONCEPT.md), [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md)

---

## 1. Technical References

This plan is based on the technical specifications defined in the following master documents. Please refer to them for detailed definitions.

- **Architecture & Stack**: [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md)  
  *(Defines System Overview, Microservices Responsibilities, Communication Patterns, and Tech Stack)*

- **Database Schema**: [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)  
  *(Defines Tables, Columns, Relationships, Indexes, and Drizzle ORM Schema)*

- **API Contract**: [API_CONTRACT.md](./API_CONTRACT.md)  
  *(Defines Semantic REST API endpoints, Request/Response formats)*

- **Event Contract**: [EVENT_CONTRACT.md](./EVENT_CONTRACT.md)  
  *(Defines EventBridge patterns and Event Schemas)*

---

## 2. Development Phases (Solo Developer with AI Assistance)

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

**Goal**: Build foundational online ordering system that allows customers to order and merchants to manage

---

#### Phase 1: Foundation & Infrastructure (Weeks 1-4)

**Objectives**: AWS environment setup, database design, CI/CD pipeline

**Tasks**:
- AWS account setup (Lambda, API Gateway, RDS PostgreSQL, ElastiCache)
- **RDS Instance Creation**:
  - Instance type: **db.t3.micro** (2 vCPU, 1GB RAM) or **db.t4g.micro** (ARM)
  - Storage: **20GB General Purpose SSD (gp2)**
  - Network: **Public subnet** with **Security Group allowlisting** (Lambda SG + dev IPs)
  - Configuration: **Single-AZ**, **Publicly Accessible = true**, **SSL Required** (rds.force_ssl = 1)
  - Parameter Group: Custom parameter group with **max_connections = 87**
- GitHub repository initialization
- CI/CD pipeline setup (GitHub Actions)
  - Lint & test automation
  - Deploy to development environment
- Database schema design (Drizzle ORM)
  - Tables: stores, menu_items, categories, orders, order_items, payments, users
  - Indexes optimization
  - **Connection pooling configuration**: Application-level (Drizzle ORM, max 10 connections per Lambda instance)
- API Gateway configuration (HTTP + WebSocket)
- CloudWatch monitoring setup
  - **New Alarms**: Database connections > 70 (80% of max_connections), Free storage < 2GB, CPU > 80%
- SSM Parameter Store configuration (Standard tier, SecureString for database credentials, API keys)
- Lambda Concurrency Configuration: Set ReservedConcurrentExecutions = 50 for all DB-connected Lambdas

**Deliverables**:
- [ ] AWS infrastructure provisioned (RDS instance created and configured)
- [ ] Database schema finalized (Drizzle schema file)
- [ ] CI/CD pipeline functional
- [ ] Development environment ready
- [ ] Security Groups and connection pooling configured

**Milestones**:
- Week 2: AWS setup complete, RDS instance created (db.t3.micro, public subnet, SSL enabled)
- Week 4: CI/CD working, can deploy Lambda functions with direct RDS connections

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
  - Store status toggle (accepting orders)
  - Redis caching (10 min TTL)

**Lambda Functions**:
- `auth-pre-signup-trigger`, `auth-post-confirmation`, `auth-token-validator`
- `store-get-handler`, `store-update-handler`

**Deliverables**:
- [ ] User registration and login working
- [ ] JWT authentication flow complete
- [ ] Store management API ready
- [ ] Redis cache integration

**Milestones**:
- Week 6: Cognito setup, authentication endpoints working
- Week 8: Store service complete with caching

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
  - Order status state machine (PENDING → PAID → PREPARING → READY → COMPLETED | CANCELLED)
  - Order history query
  - EventBridge event publishing (Order.Created, Order.StatusChanged)

**Lambda Functions**:
- `menu-get-handler`, `menu-create-handler`, `menu-update-handler`, `menu-delete-handler`
- `order-create-handler`, `order-get-handler`, `order-update-status-handler`, `order-list-handler`

**Deliverables**:
- [ ] Menu management API complete
- [ ] Order creation and status updates working
- [ ] Event-driven architecture (EventBridge)
- [ ] Image storage (S3 + CloudFront CDN)

**Milestones**:
- Week 10: Menu service complete with image upload
- Week 12: Order service complete with state machine

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
- [ ] Stripe payment integration working
- [ ] Real-time WebSocket notifications
- [ ] User Client PWA (installable, responsive)
- [ ] Merchant Dashboard functional
- [ ] End-to-end order flow complete

**Milestones**:
- Week 14: Payment service complete, Stripe test mode working
- Week 15: User Client MVP complete
- Week 16: Merchant Dashboard complete, full system testing

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
- [ ] Recipe-driven inventory tracking with ingredient-level deduction
- [ ] Centralized Variant Registry (store-scoped)
- [ ] Low stock alerts (EventBridge ??Email)
- [ ] Inventory deduction on order confirmation via Recipes
- [ ] Inventory management UI in dashboard (ingredients + recipes)

**Milestones**:
- Week 18: Inventory service complete with recipe system
- Week 20: Low stock alerts working, dashboard UI integrated

---

#### Phase 2: User Profile & Device Service (Weeks 21-24)

**Objectives**: Customer profiles and device registry

**Services to Build**:
- **User Profile Service**
  - Customer profile CRUD
  - Order history (JOIN with orders table)
  - Notification preferences
  
- **Device Service (Software)**
  - Device registration (POS terminals, printers)
  - Device status tracking
  - Print job queue (SQS)
  - Basic job logging (no hardware integration yet)

**Database Schema Updates**:
- Table: `user_profiles` (userId, preferences)
- Table: `devices` (deviceId, storeId, deviceType, status)
- Table: `print_jobs` (jobId, deviceId, status, payload)

**Lambda Functions**:
- `profile-get-handler`, `profile-update-handler`, `profile-orders-handler`
- `device-register-handler`, `device-update-status-handler`, `device-print-job-handler`

**Deliverables**:
- [ ] Customer profiles with order history
- [ ] Device registration system
- [ ] Print job queue (software only)

**Milestones**:
- Week 22: User profile service complete
- Week 24: Device service software layer ready

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
- [ ] POS Electron app complete
- [ ] Cash payment support
- [ ] Manual discount functionality with reason tracking
- [ ] Staff authentication with RBAC (Cashier/Lead/Manager/Merchant roles)
- [ ] Quick order entry with keyboard shortcuts
- [ ] Order modification functionality

**Milestones**:
- Week 26: POS app basic structure complete
- Week 28: Full POS functionality with RBAC, staff training materials ready

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
  - Direct SQL queries on RDS (no Glue/Athena for MVP)

**Database Schema Updates**:
- Materialized views: `mv_daily_sales`, `mv_best_sellers`, `mv_staff_performance`
- Refresh via EventBridge scheduled Lambda (hourly)

**Lambda Functions**:
- `report-sales-handler`, `report-bestsellers-handler`, `report-anomalies-handler`
- `report-z-report-generator`, `report-anomaly-scanner`

**Deliverables**:
- [ ] Sales analytics API
- [ ] Automated daily Z-Report (PDF generation)
- [ ] Best sellers report
- [ ] Anomaly detection alerts
- [ ] Analytics dashboard (Recharts integration)

**Milestones**:
- Week 30: Report service complete with materialized views
- Week 32: Dashboard analytics UI complete

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
- [ ] Loyalty points earning and redemption
- [ ] Coupon system (discount codes)
- [ ] Customer segmentation
- [ ] Tiered membership with auto-upgrade
- [ ] CRM dashboard UI

**Milestones**:
- Week 34: CRM service complete with points and coupons
- Week 36: Dashboard CRM UI complete, customer segmentation working

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
  - Touch-optimized UI (large buttons, min 1920?1080)
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
- [ ] Kiosk app complete (software only)
- [ ] Touch-optimized interface
- [ ] Auto-reset functionality
- [ ] Multi-language support
- [ ] Offline queue with retry

**Milestones**:
- Week 38: Kiosk UI complete
- Week 40: Full kiosk flow tested (without hardware)

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
- [ ] Receipt printer functional
- [ ] Kitchen label printer working (order number, items, notes, pickup time)
- [ ] Card payment terminal integrated
- [ ] Cash drawer trigger working
- [ ] QR code scanner operational

**Hardware Procurement**:
- 1x Kiosk touchscreen (1920?1080 or higher)
- 1x Star TSP654II receipt printer
- 1x Kitchen label printer
- 1x PAX A920 card terminal
- 1x Cash drawer with RJ11
- 1x QR code scanner

**Milestones**:
- Week 42: Printer integration complete
- Week 44: Full hardware setup tested, pilot kiosk installed

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
- `kds-order-consumer` (EventBridge ??WebSocket push)
- `kds-bump-handler` (update order item status)

**Deliverables**:
- [ ] KDS application complete
- [ ] Real-time WebSocket integration
- [ ] Station filtering working
- [ ] Audio alerts functional
- [ ] Multi-screen support (2+ displays)

**Hardware**:
- 2x 43" TV displays
- Wall mounts for kitchen environment
- HDMI cables

**Milestones**:
- Week 46: KDS app complete with WebSocket
- Week 48: Kitchen hardware setup, staff training complete

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
- [ ] UberEats webhook endpoint working
- [ ] Orders auto-imported to system
- [ ] Bi-directional status sync
- [ ] Menu sync to UberEats
- [ ] Duplicate prevention (idempotency)
- [ ] Error handling with retry

**Milestones**:
- Week 50: UberEats webhook integration complete
- Week 52: Status sync and menu sync working, sandbox testing passed

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
- [ ] Foodpanda webhook endpoint working
- [ ] Orders auto-imported
- [ ] Bi-directional status sync
- [ ] Menu sync to Foodpanda
- [ ] Multi-platform order view in dashboard

**Milestones**:
- Week 54: Foodpanda integration complete
- Week 56: Multi-platform dashboard working

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
- [ ] Automated menu sync to UberEats and Foodpanda
- [ ] Inventory sync (unavailable items)
- [ ] Platform mapping UI in dashboard
- [ ] Platform analytics dashboard
- [ ] Unified order view (all channels)

**Milestones**:
- Week 58: Menu sync automation complete
- Week 60: Full multi-platform management working

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
- [ ] Load testing passed (500+ concurrent users)
- [ ] Security audit complete (no critical vulnerabilities)
- [ ] PCI DSS compliance validated
- [ ] UAT with pilot restaurant successful
- [ ] Production deployment complete
- [ ] Documentation published (API docs, user guides, runbooks)
- [ ] Monitoring dashboards active (CloudWatch, X-Ray)

**Testing Checklist**:
- [ ] Load test: 500 concurrent users, 1000+ orders/hour
- [ ] Stress test: 2x peak load, system remains stable
- [ ] Failover test: RDS instance recovery, Lambda scaling
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

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-17 | Simon Chou | Initial draft |
| 1.1 | 2025-12-22 | Simon Chou | Aligned technical concepts with v1.1 Design Specs: Recipe-Driven Inventory, Centralized Variant Registry, RBAC with LEAD role, Manual Discounts in v0.2.0, Delivery Platform Integration limited to UberEats & Foodpanda, Multi-tenancy emphasis |
| 1.2 | 2025-12-22 | Simon Chou | Database architecture update: RDS PostgreSQL (db.t3.micro), Connection model: Direct Lambda connections with application-level pooling |
| 1.3 | 2025-12-23 | Simon Chou | Optimized for readability: Removed redundant definitions of Architecture, Schema, and Tech Stack (moved to dedicated documents). Focus is now purely on Execution Roadmap. |
| 1.4 | 2025-12-23 | Simon Chou | Further Streamlining: Removed Development Standards (Section 5). Git workflow is covered in GIT_WORKFLOW.md. Other standards are implicit or in referencing documents. |
| **1.5** | **2025-12-23** | **Simon Chou** | **Removed Testing Strategy (Section 3) and Deployment Strategy (Section 4). Relevant technical metrics and standards are consolidated into ARCHITECTURE_OVERVIEW.md. SDP now focuses purely on delivery timelines and milestones.** |
