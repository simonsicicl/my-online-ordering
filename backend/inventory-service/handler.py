from datetime import datetime, timezone
from typing import Any, Dict, List
import json
import os
from urllib import request as _urlreq
from urllib.error import URLError, HTTPError

from models.inventory import exampleInventoryData

# === Helpers ===

def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def response(body, status=200):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "*",
        },
        "body": json.dumps(body, ensure_ascii=False),
    }


def ok(data: Any, status: int = 200):
    return response({"success": True, "data": data, "request_id": None}, status=status)


def error(code: str, message: str, status: int = 400, details: Dict[str, Any] | None = None):
    return response(
        {
            "success": False,
            "error": {"code": code, "message": message, "details": details or {}},
            "request_id": None,
        },
        status=status,
    )


def get_path_param(event: Dict[str, Any], key: str, default: Any = None):
    return (event.get("pathParameters") or {}).get(key, default)


def get_query(event: Dict[str, Any], key: str, default: Any = None):
    return (event.get("queryStringParameters") or {}).get(key, default)


def parse_body(event: Dict[str, Any]) -> Dict[str, Any]:
    try:
        body = event.get("body") or {}
        if isinstance(body, str):
            return json.loads(body) if body else {}
        return body
    except Exception:
        return {}


def paginate(items: List[Dict[str, Any]], page: int, page_size: int):
    total = len(items)
    start = max((page - 1) * page_size, 0)
    end = start + page_size
    return {
        "items": items[start:end],
        "page": page,
        "page_size": page_size,
        "total": total,
    }


def next_id(items: List[Dict[str, Any]], field: str, start_from: int = 1) -> int:
    return (max([it.get(field, 0) for it in items], default=start_from - 1) + 1) if items else start_from


# === Compatibility endpoint (debug) ===
def get_inventory(event, context):
    """
    GET /inventory (not wired by default)
    Returns entire inventory dataset from models.inventory.exampleInventoryData for demo.
    """
    return ok(exampleInventoryData)


# === Materials ===

def list_materials(event, context):
    page = int(get_query(event, "page", 1) or 1)
    page_size = int(get_query(event, "page_size", 50) or 50)
    data = paginate(exampleInventoryData.get("materials", []), page, page_size)
    return ok(data)


def get_material(event, context):
    material_id = int(get_path_param(event, "material_id"))
    m = next((x for x in exampleInventoryData.get("materials", []) if x["material_id"] == material_id), None)
    if not m:
        return error("MATERIAL_NOT_FOUND", "Material not found", status=404)
    return ok(m)


def create_material(event, context):
    body = parse_body(event)
    materials = exampleInventoryData.setdefault("materials", [])
    new_id = next_id(materials, "material_id", start_from=1)
    item = {
        "merchant_id": body.get("merchant_id", 1),
        "material_id": new_id,
        "sku": body.get("sku"),
        "name": body.get("name", f"material-{new_id}"),
        "unit": body.get("unit", "pcs"),
        "unit_precision": int(body.get("unit_precision", 0)),
        "stock_quantity": float(body.get("stock_quantity", 0)),
        "min_stock_alert": float(body.get("min_stock_alert", 0)),
        "reorder_point": body.get("reorder_point"),
        "reorder_qty": body.get("reorder_qty"),
        "lot_tracking": bool(body.get("lot_tracking", False)),
        "expiry_tracking": bool(body.get("expiry_tracking", False)),
        "lead_time_days": body.get("lead_time_days"),
        "is_active": bool(body.get("is_active", True)),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    materials.append(item)
    return ok(item, status=201)


def update_material(event, context):
    material_id = int(get_path_param(event, "material_id"))
    body = parse_body(event)
    for idx, x in enumerate(exampleInventoryData.get("materials", [])):
        if x["material_id"] == material_id:
            x.update({k: v for k, v in body.items() if k in {
                "sku","name","unit","unit_precision","stock_quantity","min_stock_alert","reorder_point","reorder_qty","lot_tracking","expiry_tracking","lead_time_days","is_active"
            }})
            x["updated_at"] = now_iso()
            exampleInventoryData["materials"][idx] = x
            return ok(x)
    return error("MATERIAL_NOT_FOUND", "Material not found", status=404)


def delete_material(event, context):
    material_id = int(get_path_param(event, "material_id"))
    before = len(exampleInventoryData.get("materials", []))
    exampleInventoryData["materials"] = [x for x in exampleInventoryData.get("materials", []) if x["material_id"] != material_id]
    after = len(exampleInventoryData.get("materials", []))
    if after < before:
        return ok({"deleted": True})
    return error("MATERIAL_NOT_FOUND", "Material not found", status=404)


# === Movements ===

POSITIVE_TYPES = {"PURCHASE_RECEIPT", "ADJUST_UP", "TRANSFER_IN"}
NEGATIVE_TYPES = {"CONSUME", "WASTE", "ADJUST_DOWN", "RETURN", "TRANSFER_OUT"}


def list_movements(event, context):
    page = int(get_query(event, "page", 1) or 1)
    page_size = int(get_query(event, "page_size", 50) or 50)
    data = paginate(exampleInventoryData.get("movements", []), page, page_size)
    return ok(data)


def get_movement(event, context):
    movement_id = int(get_path_param(event, "movement_id"))
    mv = next((x for x in exampleInventoryData.get("movements", []) if x["movement_id"] == movement_id), None)
    if not mv:
        return error("MOVEMENT_NOT_FOUND", "Movement not found", status=404)
    return ok(mv)


def create_movement(event, context):
    body = parse_body(event)
    movements = exampleInventoryData.setdefault("movements", [])
    new_id = next_id(movements, "movement_id", start_from=1)
    mv_type = body.get("movement_type", "ADJUST_UP")
    qty = float(body.get("quantity", 0))
    mv = {
        "merchant_id": body.get("merchant_id", 1),
        "movement_id": new_id,
        "material_id": int(body.get("material_id")),
        "movement_type": mv_type,
        "quantity": qty,
        "unit_cost": body.get("unit_cost"),
        "reference_type": body.get("reference_type"),
        "reference_id": body.get("reference_id"),
        "batch_no": body.get("batch_no"),
        "expiry_date": body.get("expiry_date"),
        "note": body.get("note"),
        "created_by": body.get("created_by"),
        "created_at": now_iso(),
    }
    movements.append(mv)
    # Adjust stock (demo only, no tx)
    mat = next((x for x in exampleInventoryData.get("materials", []) if x["material_id"] == mv["material_id"]), None)
    if mat:
        if mv_type in POSITIVE_TYPES:
            mat["stock_quantity"] = float(mat.get("stock_quantity", 0)) + qty
        elif mv_type in NEGATIVE_TYPES:
            mat["stock_quantity"] = float(mat.get("stock_quantity", 0)) - qty
        mat["updated_at"] = now_iso()
    return ok(mv, status=201)


# === Purchase Orders ===


def _po_with_items(purchase_id: int):
    po = next((p for p in exampleInventoryData.get("purchase_orders", []) if p["purchase_id"] == purchase_id), None)
    if not po:
        return None
    return po


def list_purchase_orders(event, context):
    page = int(get_query(event, "page", 1) or 1)
    page_size = int(get_query(event, "page_size", 50) or 50)
    base = exampleInventoryData.get("purchase_orders", [])
    data = paginate(base, page, page_size)
    for it in data["items"]:
        it["items_count"] = len(it.get("items", []))
    return ok(data)


def get_purchase_order(event, context):
    purchase_id = int(get_path_param(event, "purchase_id"))
    result = _po_with_items(purchase_id)
    if not result:
        return error("PURCHASE_NOT_FOUND", "Purchase order not found", status=404)
    return ok(result)


def create_purchase_order(event, context):
    body = parse_body(event)
    pos = exampleInventoryData.setdefault("purchase_orders", [])
    new_id = next_id(pos, "purchase_id", start_from=1)
    items_in = body.get("items", []) or []
    items = []
    for it in items_in:
        items.append({
            "material_id": int(it["material_id"]),
            "ordered_qty": float(it.get("ordered_qty", 0)),
            "received_qty": float(it.get("received_qty", 0) or 0),
            "price": float(it.get("price", 0)),
        })
    subtotal = sum((i["ordered_qty"] * i["price"] for i in items))
    totals = body.get("totals") or {"subtotal": subtotal, "tax": 0, "shipping": 0, "discount": 0, "total": subtotal}
    po = {
        "merchant_id": body.get("merchant_id", 1),
        "purchase_id": new_id,
        "supplier_id": body.get("supplier_id"),
        "supplier_name": body.get("supplier_name"),
        "status": body.get("status", "DRAFT"),
        "expected_date": body.get("expected_date"),
        "currency": body.get("currency", "TWD"),
        "totals": totals,
        "items": items,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    pos.append(po)
    return ok(po, status=201)


def update_purchase_order(event, context):
    purchase_id = int(get_path_param(event, "purchase_id"))
    body = parse_body(event)
    pos = exampleInventoryData.setdefault("purchase_orders", [])
    for idx, po in enumerate(pos):
        if po["purchase_id"] == purchase_id:
            # Update top-level fields
            for k in ["supplier_id", "supplier_name", "status", "expected_date", "currency", "totals"]:
                if k in body:
                    po[k] = body[k]
            # Update items if provided
            if "items" in body and isinstance(body["items"], list):
                new_items = []
                for it in body["items"]:
                    new_items.append({
                        "material_id": int(it["material_id"]),
                        "ordered_qty": float(it.get("ordered_qty", 0)),
                        "received_qty": float(it.get("received_qty", 0) or 0),
                        "price": float(it.get("price", 0)),
                    })
                po["items"] = new_items
            po["updated_at"] = now_iso()
            pos[idx] = po
            return ok(po)
    return error("PURCHASE_NOT_FOUND", "Purchase order not found", status=404)


def receive_purchase_order(event, context):
    purchase_id = int(get_path_param(event, "purchase_id"))
    body = parse_body(event)
    items_map = {int(it["material_id"]): it for it in (body.get("items", []) or [])}
    po = next((p for p in exampleInventoryData.get("purchase_orders", []) if p["purchase_id"] == purchase_id), None)
    if not po:
        return error("PURCHASE_NOT_FOUND", "Purchase order not found", status=404)

    movements_created = []
    # For each item in PO, update received qty and create movement
    for it in po.get("items", []):
        mid = int(it["material_id"])
        delta = float((items_map.get(mid) or {}).get("received_qty", 0) or 0)
        if delta <= 0:
            continue
        it["received_qty"] = float(it.get("received_qty", 0)) + delta
        # Create movement
        movements = exampleInventoryData.setdefault("movements", [])
        new_mv_id = next_id(movements, "movement_id", start_from=1)
        mv = {
            "merchant_id": po.get("merchant_id", 1),
            "movement_id": new_mv_id,
            "material_id": mid,
            "movement_type": "PURCHASE_RECEIPT",
            "quantity": delta,
            "unit_cost": it.get("price"),
            "reference_type": "PO",
            "reference_id": str(purchase_id),
            "batch_no": (items_map.get(mid) or {}).get("batch_no"),
            "expiry_date": (items_map.get(mid) or {}).get("expiry_date"),
            "note": (items_map.get(mid) or {}).get("note"),
            "created_by": (body or {}).get("received_by"),
            "created_at": now_iso(),
        }
        movements.append(mv)
        movements_created.append(mv)
        # Update stock
        mat = next((x for x in exampleInventoryData.get("materials", []) if x["material_id"] == mid), None)
        if mat:
            mat["stock_quantity"] = float(mat.get("stock_quantity", 0)) + delta
            mat["updated_at"] = now_iso()

    # Update PO status
    all_received = all((float(i.get("received_qty", 0)) >= float(i.get("ordered_qty", 0)) for i in po.get("items", [])))
    po["status"] = "RECEIVED" if all_received else "PARTIAL"
    po["updated_at"] = now_iso()

    return ok({"purchase_order": po, "movements": movements_created})


# === Suppliers ===

def list_suppliers(event, context):
    page = int(get_query(event, "page", 1) or 1)
    page_size = int(get_query(event, "page_size", 50) or 50)
    data = paginate(exampleInventoryData.get("suppliers", []), page, page_size)
    return ok(data)


def get_supplier(event, context):
    supplier_id = int(get_path_param(event, "supplier_id"))
    sp = next((x for x in exampleInventoryData.get("suppliers", []) if x["supplier_id"] == supplier_id), None)
    if not sp:
        return error("SUPPLIER_NOT_FOUND", "Supplier not found", status=404)
    return ok(sp)


def create_supplier(event, context):
    body = parse_body(event)
    suppliers = exampleInventoryData.setdefault("suppliers", [])
    new_id = next_id(suppliers, "supplier_id", start_from=1)
    sp = {
        "supplier_id": new_id,
        "merchant_id": body.get("merchant_id", 1),
        "name": body.get("name", f"supplier-{new_id}"),
        "contact_name": body.get("contact_name"),
        "phone": body.get("phone"),
        "email": body.get("email"),
        "address": body.get("address"),
        "lead_time_days": body.get("lead_time_days"),
        "is_active": bool(body.get("is_active", True)),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    suppliers.append(sp)
    return ok(sp, status=201)


def update_supplier(event, context):
    supplier_id = int(get_path_param(event, "supplier_id"))
    body = parse_body(event)
    for idx, sp in enumerate(exampleInventoryData.get("suppliers", [])):
        if sp["supplier_id"] == supplier_id:
            sp.update({k: v for k, v in body.items() if k in {
                "name","contact_name","phone","email","address","lead_time_days","is_active"
            }})
            sp["updated_at"] = now_iso()
            exampleInventoryData["suppliers"][idx] = sp
            return ok(sp)
    return error("SUPPLIER_NOT_FOUND", "Supplier not found", status=404)


def delete_supplier(event, context):
    supplier_id = int(get_path_param(event, "supplier_id"))
    before = len(exampleInventoryData.get("suppliers", []))
    exampleInventoryData["suppliers"] = [x for x in exampleInventoryData.get("suppliers", []) if x["supplier_id"] != supplier_id]
    after = len(exampleInventoryData.get("suppliers", []))
    if after < before:
        return ok({"deleted": True})
    return error("SUPPLIER_NOT_FOUND", "Supplier not found", status=404)


# === Alerts & Summary ===

def list_alerts(event, context):
    alerts = []
    for m in exampleInventoryData.get("materials", []):
        thresh = float(m.get("min_stock_alert", 0) or 0)
        curr = float(m.get("stock_quantity", 0) or 0)
        if thresh and curr < thresh:
            alerts.append({
                "alert_id": f"LOW-{m['material_id']}",
                "material_id": m["material_id"],
                "type": "LOW_STOCK",
                "severity": "WARN",
                "threshold": thresh,
                "current_value": curr,
                "message": f"{m.get('name')}低於安全庫存",
                "created_at": now_iso(),
            })
    return ok({"items": alerts})


def get_summary(event, context):
    materials = exampleInventoryData.get("materials", [])
    low = sum(1 for m in materials if (m.get("min_stock_alert") or 0) and (m.get("stock_quantity") or 0) < (m.get("min_stock_alert") or 0))
    total_skus = len(materials)
    movements_last_7d = len(exampleInventoryData.get("movements", []))
    return ok({
        "materials_low_stock_count": low,
        "total_skus": total_skus,
        "total_stock_value": 0,
        "movements_last_7d": movements_last_7d,
    })


# === Consumption by Order ===

def _get_menu_base_url() -> str | None:
    # Expect env var set at deploy. Example: https://abc.execute-api.ap-northeast-3.amazonaws.com/dev
    return os.environ.get("MENU_SERVICE_BASE_URL")


def _fetch_recipe(item_id: int) -> Dict[str, Any] | None:
    base = _get_menu_base_url()
    if not base:
        return None
    url = f"{base}/menu/{item_id}/recipe"
    try:
        req = _urlreq.Request(url, headers={"Accept": "application/json"})
        with _urlreq.urlopen(req, timeout=10) as resp:
            data = resp.read().decode("utf-8")
            return json.loads(data) if data else None
    except (URLError, HTTPError):
        return None


def _accumulate_requirement(agg: Dict[int, float], materials: List[Dict[str, Any]], factor: float = 1.0):
    for m in (materials or []):
        mid = int(m.get("material_id"))
        qty = float(m.get("quantity", 0) or 0)
        wf = float(m.get("waste_factor", 0) or 0)
        need = qty * factor * (1.0 + wf)
        agg[mid] = float(agg.get(mid, 0)) + need


def consume_by_order(event, context):
    body = parse_body(event)
    order_id = body.get("order_id") or ""
    items = body.get("items", []) or []
    allow_partial = bool(body.get("allow_partial", True))
    created_by = body.get("created_by")

    if not items:
        return error("EMPTY_ITEMS", "No items to consume", status=400)

    # Calculate total required per material across order
    required: Dict[int, float] = {}
    missing_recipes: List[int] = []

    for it in items:
        item_id = int(it.get("item_id"))
        qty = float(it.get("quantity", 1) or 1)
        options = it.get("options") or []
        recipe = _fetch_recipe(item_id)
        if not recipe:
            missing_recipes.append(item_id)
            continue
        # base materials
        _accumulate_requirement(required, recipe.get("materials", []), factor=qty)
        # option overrides
        ov = recipe.get("option_overrides", []) or []
        if options and ov:
            selected = {int(o) for o in options}
            for ovr in ov:
                if int(ovr.get("option_id", -1)) in selected:
                    _accumulate_requirement(required, ovr.get("materials", []), factor=qty)

    if missing_recipes:
        return error("RECIPE_NOT_FOUND", f"Missing recipe for items: {missing_recipes}", status=400)

    # Evaluate stock and build shortages
    shortages: List[Dict[str, Any]] = []
    materials_idx = {int(m["material_id"]): m for m in exampleInventoryData.get("materials", [])}
    for mid, req_qty in required.items():
        mat = materials_idx.get(mid)
        available = float(mat.get("stock_quantity", 0) if mat else 0)
        if available < req_qty:
            shortages.append({
                "material_id": mid,
                "required": round(req_qty, 6),
                "available": round(available, 6),
            })

    if shortages and not allow_partial:
        return error("INSUFFICIENT_STOCK", "Stock is insufficient for one or more materials", status=422, details={"shortages": shortages})

    # Create movements and deduct stock
    movements = exampleInventoryData.setdefault("movements", [])
    created: List[Dict[str, Any]] = []
    for mid, req_qty in required.items():
        mat = materials_idx.get(mid)
        if not mat:
            # Material missing from catalog; skip but record shortage
            shortages.append({"material_id": mid, "required": req_qty, "available": 0.0})
            continue
        available = float(mat.get("stock_quantity", 0) or 0)
        consume_qty = req_qty if available >= req_qty else (req_qty if not shortages else min(req_qty, available))
        # If allow_partial, consume available; else this path not reached because we returned earlier
        if allow_partial and available < req_qty:
            consume_qty = available
        if consume_qty <= 0:
            continue
        new_id = next_id(movements, "movement_id", start_from=1)
        mv = {
            "merchant_id": mat.get("merchant_id", 1),
            "movement_id": new_id,
            "material_id": mid,
            "movement_type": "CONSUME",
            "quantity": float(round(consume_qty, 6)),
            "unit_cost": None,
            "reference_type": "ORDER",
            "reference_id": str(order_id) if order_id else None,
            "batch_no": None,
            "expiry_date": None,
            "note": "consume_by_order",
            "created_by": created_by,
            "created_at": now_iso(),
        }
        movements.append(mv)
        created.append(mv)
        # Deduct stock
        mat["stock_quantity"] = float(round((mat.get("stock_quantity", 0) or 0) - consume_qty, 6))
        mat["updated_at"] = now_iso()

    return ok({
        "order_id": order_id,
        "movements": created,
        "shortages": shortages,
    })
