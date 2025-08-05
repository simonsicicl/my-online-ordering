import json
from datetime import datetime
from models.orders import ORDERS  # Import in-memory order data

def response(body, status=200):
    """
    Standard HTTP response helper for AWS Lambda Proxy integration.
    Adds CORS headers for frontend access.
    """
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "*"
        },
        "body": json.dumps(body, ensure_ascii=False)
    }

def get_orders(event, context):
    """
    GET /orders
    Returns all orders.
    """
    return response(ORDERS)

def get_order(event, context):
    """
    GET /orders/{order_id}
    Returns a single order by order_id.
    """
    order_id = int(event["pathParameters"]["order_id"])
    order = next((o for o in ORDERS if o["order_id"] == order_id), None)
    if order:
        return response(order)
    else:
        return response({"error": "Order not found"}, status=404)

def create_order(event, context):
    """
    POST /orders
    Creates a new order and adds it to ORDERS.
    """
    body = json.loads(event["body"])
    new_id = max(o["order_id"] for o in ORDERS) + 1 if ORDERS else 1001
    now = datetime.utcnow().isoformat() + "Z"
    order = {
        "order_id": new_id,
        "order_time": now,
        **body
    }
    ORDERS.append(order)
    return response(order, status=201)

def update_order(event, context):
    """
    PUT /orders/{order_id}
    Updates an existing order by order_id.
    """
    order_id = int(event["pathParameters"]["order_id"])
    body = json.loads(event["body"])
    for idx, o in enumerate(ORDERS):
        if o["order_id"] == order_id:
            ORDERS[idx].update(body)
            return response(ORDERS[idx])
    return response({"error": "Order not found"}, status=404)

def delete_order(event, context):
    """
    DELETE /orders/{order_id}
    Deletes an order by order_id.
    """
    order_id = int(event["pathParameters"]["order_id"])
    before = len(ORDERS)
    ORDERS[:] = [o for o in ORDERS if o["order_id"] != order_id]
    if len(ORDERS) < before:
        return response({"success": True})
    else:
        return response({"error": "Order not found"}, status=404)