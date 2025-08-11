# Inventory Service backend

This document specifies the backend design for Inventory Service that powers Merchant Admin App "Inventory Management" and integrates with the Menu Service (recipes/BOM). It covers architecture, data model, API endpoints (mapped to serverless.yml), request/response JSON specs, workflows, and operational concerns.

## 1. Architecture overview
- Service: AWS Lambda (Python 3.11) behind API Gateway, defined via Serverless Framework.
- Storage: Relational DB (e.g., PostgreSQL/MySQL) recommended. A future DynamoDB variant is possible; schemas below use relational terms.
- Integration:
  - Menu Service provides item recipes (BOM) used to deduct materials on orders.
    - GET /menu/{item_id}/recipe
    - GET /menu/recipes (sync/align dashboard)
  - Order Service can either:
    - call POST /inventory/consume (synchronous), or
    - emit an async event in the future (SNS/SQS/EventBridge) for consumption.
- Identity/Auth: JWT (merchant scoped). All endpoints expect Authorization: Bearer <token>.
- Time: ISO8601 UTC timestamps.

## 2. Data model (logical)
- material
  - material_id (PK), merchant_id (FK scope)
  - name, sku?, barcode?
  - unit (g|ml|pcs|bag|box|l|kg etc), unit_precision (int), unit_conversion? (optional)
  - stock_quantity (DECIMAL), min_stock_alert (DECIMAL), reorder_point?, reorder_qty?, safety_stock?
  - lot_tracking (bool), expiry_tracking (bool)
  - is_active (bool)
  - lead_time_days? (int)
  - created_at, updated_at
- inventory_movement
  - movement_id (PK), merchant_id, material_id (FK)
  - movement_type (PURCHASE_RECEIPT|CONSUME|WASTE|ADJUST_UP|ADJUST_DOWN|RETURN|TRANSFER_IN|TRANSFER_OUT)
  - quantity (DECIMAL, positive; sign is derived from type)
  - unit_cost? (DECIMAL), value? (computed)
  - reference_type? (ORDER|PO|ADJUSTMENT|RETURN|TRANSFER), reference_id?
  - batch_no?, expiry_date?
  - note?, created_by?, created_at
- purchase_order
  - purchase_id (PK), merchant_id, supplier_id? (FK) | supplier_name
  - status (DRAFT|SENT|PARTIAL|RECEIVED|CANCELLED)
  - expected_date?, currency?, totals (subtotal,tax,shipping,discount,total)
  - created_at, updated_at
- purchase_order_item
  - id (PK), purchase_id (FK), material_id (FK)
  - ordered_qty (DECIMAL), received_qty (DECIMAL), price (DECIMAL)
  - batch_no?, expiry_date?
- supplier
  - supplier_id (PK), merchant_id
  - name, contact_name?, phone?, email?, address?, lead_time_days?, is_active
  - created_at, updated_at
- alert (derived/virtual)
  - LOW_STOCK|OUT_OF_STOCK|EXPIRY_SOON from current stock vs thresholds and lots.

Menu coupling (BOM held in Menu Service):
- recipe
  - item_id, version
  - materials: [ { material_id, quantity, unit, waste_factor? } ]
  - option_overrides?: [ { option_id, materials: [ … ] } ]

## 3. API surface (serverless.yml mapping)
All routes have CORS enabled. Merchant scoping via auth. Unless noted, responses wrap data with a consistent envelope.

Envelope:
- Success: { "success": true, "data": <payload>, "request_id": "..." }
- Error: { "success": false, "error": { "code": "...", "message": "...", "details": {} }, "request_id": "..." }

### 3.1 Materials
- GET /inventory/materials → listMaterials
  - Query: page?, page_size?, q?, is_active?, sku?, ordering?(name|-name|updated_at|-updated_at)
  - 200 data: { "items": [Material], "page": 1, "page_size": 50, "total": 123 }
- GET /inventory/materials/{material_id} → getMaterial
  - 200 data: Material
  - 404 error.code: MATERIAL_NOT_FOUND
- POST /inventory/materials → createMaterial
  - Body: CreateMaterialInput
  - Headers: Idempotency-Key? (recommended)
  - 201 data: Material
  - 409 error.code: MATERIAL_DUPLICATE (by name/sku)
- PUT /inventory/materials/{material_id} → updateMaterial
  - Body: UpdateMaterialInput
  - 200 data: Material
- DELETE /inventory/materials/{material_id} → deleteMaterial
  - 204 empty or 200 data: { "deleted": true }

Material schema:
- Material
  {
    "merchant_id": 1,
    "material_id": 101,
    "name": "紅茶茶葉",
    "sku": "TEA-RED-001",
    "unit": "g",
    "unit_precision": 2,
    "stock_quantity": 5000.00,
    "min_stock_alert": 500.00,
    "reorder_point": 800.00,
    "reorder_qty": 3000.00,
    "lot_tracking": false,
    "expiry_tracking": false,
    "lead_time_days": 3,
    "is_active": true,
    "created_at": "2025-07-01T08:00:00Z",
    "updated_at": "2025-08-01T10:00:00Z"
  }
- CreateMaterialInput (subset of Material without ids/timestamps)
- UpdateMaterialInput (any updatable fields)

### 3.2 Movements
- GET /inventory/movements → listMovements
  - Query: page?, page_size?, material_id?, type?, from?, to?, reference_type?, reference_id?
  - 200 data: { "items": [Movement], "page": 1, "page_size": 50, "total": 999 }
- GET /inventory/movements/{movement_id} → getMovement
  - 200 data: Movement; 404 if not found
- POST /inventory/movements → createMovement
  - Body: CreateMovementInput
  - Headers: Idempotency-Key? (recommended)
  - 201 data: Movement; updates stock atomically

Movement schema:
- Movement
  {
    "merchant_id": 1,
    "movement_id": 1,
    "material_id": 101,
    "movement_type": "PURCHASE_RECEIPT",
    "quantity": 5000.00,
    "unit_cost": 80.00,
    "reference_type": "PO",
    "reference_id": "1",
    "batch_no": null,
    "expiry_date": null,
    "note": "首次進貨",
    "created_by": "user_123",
    "created_at": "2025-07-01T08:00:00Z"
  }
- CreateMovementInput
  {
    "material_id": 101,
    "movement_type": "ADJUST_DOWN",
    "quantity": 10.0,
    "note": "盤點損耗",
    "batch_no": null,
    "expiry_date": null
  }

### 3.3 Purchase Orders
- GET /inventory/purchase-orders → listPurchaseOrders
  - Query: page?, page_size?, status?, supplier_id?, from?, to?
  - 200 data: { "items": [PurchaseOrder], "page": 1, "page_size": 50, "total": 10 }
- GET /inventory/purchase-orders/{purchase_id} → getPurchaseOrder
  - 200 data: PurchaseOrder (with items)
- POST /inventory/purchase-orders → createPurchaseOrder
  - Body: CreatePurchaseOrderInput
  - 201 data: PurchaseOrder
- PUT /inventory/purchase-orders/{purchase_id} → updatePurchaseOrder
  - Body: UpdatePurchaseOrderInput
  - 200 data: PurchaseOrder
- POST /inventory/purchase-orders/{purchase_id}/receive → receivePurchaseOrder
  - Body: ReceivePurchaseOrderInput (received quantities per item)
  - Headers: Idempotency-Key? (per PO receipt operation)
  - 200 data: { "purchase_order": PurchaseOrder, "movements": [Movement] }

PurchaseOrder schema:
- PurchaseOrder
  {
    "merchant_id": 1,
    "purchase_id": 1,
    "supplier_id": 5,
    "supplier_name": "台灣茶葉公司",
    "status": "RECEIVED",
    "expected_date": "2025-07-02",
    "currency": "TWD",
    "totals": { "subtotal": 400000, "tax": 0, "shipping": 0, "discount": 0, "total": 400000 },
    "items": [
      { "material_id": 101, "ordered_qty": 5000.0, "received_qty": 5000.0, "price": 80.0 }
    ],
    "created_at": "2025-07-01T08:00:00Z",
    "updated_at": "2025-07-01T09:00:00Z"
  }
- CreatePurchaseOrderInput
  {
    "supplier_id": 5,
    "expected_date": "2025-07-02",
    "currency": "TWD",
    "items": [ { "material_id": 101, "ordered_qty": 5000.0, "price": 80.0 } ]
  }
- UpdatePurchaseOrderInput: status, expected_date, items (add/update/remove) for non-received qty
- ReceivePurchaseOrderInput
  {
    "items": [ { "material_id": 101, "received_qty": 5000.0, "batch_no": null, "expiry_date": null } ]
  }

### 3.4 Suppliers
- GET /inventory/suppliers → listSuppliers
  - Query: page?, page_size?, q?, is_active?
  - 200 data: { "items": [Supplier], "page": 1, "page_size": 50, "total": 3 }
- GET /inventory/suppliers/{supplier_id} → getSupplier → 200 data: Supplier
- POST /inventory/suppliers → createSupplier → 201 data: Supplier
- PUT /inventory/suppliers/{supplier_id} → updateSupplier → 200 data: Supplier
- DELETE /inventory/suppliers/{supplier_id} → deleteSupplier → 204 empty or 200 { "deleted": true }

Supplier schema:
{
  "supplier_id": 5,
  "merchant_id": 1,
  "name": "台灣茶葉公司",
  "contact_name": "王小明",
  "phone": "+886-2-1234-5678",
  "email": "sales@example.com",
  "address": "台北市…",
  "lead_time_days": 3,
  "is_active": true,
  "created_at": "2025-07-01T08:00:00Z",
  "updated_at": "2025-07-15T12:00:00Z"
}

### 3.5 Alerts & Summary
- GET /inventory/alerts → listAlerts
  - Computes low-stock/out-of-stock/expiry-soon from current stock and thresholds.
  - Query: type? (LOW_STOCK|OUT_OF_STOCK|EXPIRY_SOON)
  - 200 data: { "items": [Alert] }
- GET /inventory/summary → getSummary
  - 200 data: {
      "materials_low_stock_count": 2,
      "total_skus": 45,
      "total_stock_value": 1234567.89,
      "movements_last_7d": 321
    }

Alert schema:
{
  "alert_id": "LOW-101",
  "material_id": 101,
  "type": "LOW_STOCK",
  "severity": "WARN",
  "threshold": 500.0,
  "current_value": 480.0,
  "message": "紅茶茶葉低於安全庫存",
  "created_at": "2025-08-01T10:00:00Z"
}

### 3.6 Consumption by Order (sync path)
- POST /inventory/consume → consumeByOrder
  - Purpose: Deduct materials for a placed order by looking up BOM in Menu Service.
  - Body:
    {
      "order_id": "ORD-20250810-0001",
      "merchant_id": 1,
      "items": [
        { "order_item_id": "oi-1", "item_id": 2001, "quantity": 2, "options": [123,124] }
      ]
    }
  - Behavior:
    - For each item: GET /menu/{item_id}/recipe from Menu Service.
    - Compute required materials × quantity, apply option_overrides if provided.
    - Validate stock; if insufficient, include shortages but still allow partial behavior per flag allow_partial? (future).
    - Create Movement rows of type CONSUME; update stock atomically.
  - 200 data:
    {
      "order_id": "ORD-20250810-0001",
      "movements": [Movement],
      "shortages": [ { "material_id": 102, "required": 300.0, "available": 200.0 } ]
    }
  - 422 if insufficient and policy is block; error.code: INSUFFICIENT_STOCK

Expected Menu Service recipe payload
- GET /menu/{item_id}/recipe → 200 data:
  {
    "item_id": 2001,
    "version": 3,
    "materials": [ { "material_id": 101, "quantity": 5.0, "unit": "g", "waste_factor": 0.02 } ],
    "option_overrides": [ { "option_id": 123, "materials": [ { "material_id": 102, "quantity": 50.0, "unit": "ml" } ] } ]
  }

## 4. Behavior and workflows
- Purchase receiving
  1) createPurchaseOrder (DRAFT) → updatePurchaseOrder (SENT) → receivePurchaseOrder (RECEIVED)
  2) receivePurchaseOrder creates PURCHASE_RECEIPT movements and adjusts stock; partial receipts set status PARTIAL.
- Manual adjustments
  - createMovement with ADJUST_UP/DOWN for cycle counts and corrections.
- Order consumption
  - consumeByOrder calculates BOM totals from Menu Service and creates CONSUME movements. Future: event-driven via Order Service events.
- Alerts
  - listAlerts calculates LOW_STOCK etc. on read; a future background job could precompute.

## 5. Validation, transactions, and idempotency
- All stock updates must be within a DB transaction: insert movement → update material stock → commit.
- Idempotency-Key header supported for createMovement and receivePurchaseOrder to avoid duplicates on retries (store key hash + request fingerprint).
- Concurrency: use SELECT … FOR UPDATE (or equivalent) on affected material rows.

## 6. Pagination and filtering
- List endpoints accept page (1-based) and page_size (<=100). Response includes page, page_size, total and items.
- For very large datasets, a future cursor-based variant can be added with next_cursor.

## 7. Errors and status codes
- 200/201/204 on success; 400 validation, 401 unauthorized, 403 forbidden, 404 not found, 409 conflict, 422 business rule (e.g., INSUFFICIENT_STOCK), 500 internal.
- Error body uses the common envelope.

## 8. Security
- Require Authorization: Bearer JWT. Extract merchant_id from token claims; reject cross-merchant access.
- CORS is enabled for browser apps.

## 9. Environment configuration
- DB connection secrets via environment variables or AWS Secrets Manager.
- Feature flags (e.g., allow_partial_consume) via env.

## 10. serverless.yml function map (current)
- Materials: listMaterials, getMaterial, createMaterial, updateMaterial, deleteMaterial
- Movements: listMovements, getMovement, createMovement
- Purchase Orders: listPurchaseOrders, getPurchaseOrder, createPurchaseOrder, updatePurchaseOrder, receivePurchaseOrder
- Suppliers: listSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier
- Alerts & Summary: listAlerts, getSummary
- Consumption: consumeByOrder

## 11. Notes and future work
- Lot/expiry tracking: add material_lot and lot-aware stock logic.
- Unit conversions: support purchase in one unit and consume in another with conversion factors.
- Event-driven consumption: replace POST /inventory/consume with async consumer.
- OpenAPI spec generation: automate using tooling to keep docs in sync.
