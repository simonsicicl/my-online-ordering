import json
from datetime import datetime

# In-memory example data (replace with DB integration in production)
DATA = {
    "categories": [
        {"category_id": 101, "name": "Drinks", "sort_order": 1, "is_active": True},
        {"category_id": 102, "name": "Desserts", "sort_order": 2, "is_active": True}
    ],
    "tags": [
        {"tag_id": 1, "name": "Hot", "color": "#FF0000"},
        {"tag_id": 2, "name": "New", "color": "#00FF00"},
        {"tag_id": 3, "name": "Limited", "color": "#0000FF"},
        {"tag_id": 4, "name": "Popular", "color": "#FFA500"}
    ],
    "option_groups": [
        {
            "option_group_id": 201,
            "is_universal": True,
            "group_name": "Sweetness",
            "is_multiple": False,
            "universal_name": "Universal Sweetness Group",
            "default_option_id": 301,
            "is_visible_on_order": True,
            "options": [
                {"option_id": 301, "option_name": "Regular Sugar", "price_delta": 0, "is_active": True},
                {"option_id": 302, "option_name": "Half Sugar", "price_delta": 0, "is_active": True},
                {"option_id": 303, "option_name": "No Sugar", "price_delta": 0, "is_active": True}
            ]
        }
    ],
    "menu": [
        {
            "item_id": 1001,
            "name": "Bubble Milk Tea",
            "description": "Classic Taiwanese drink",
            "price": 60.0,
            "category_id": 101,
            "is_available": True,
            "is_combo": False,
            "is_optional": True,
            "image_url": "",
            "created_at": "2025-07-01T00:00:00Z",
            "updated_at": "2025-07-15T00:00:00Z",
            "tags": [1, 2],
            "option_groups": [201],
            "combo_item_groups": []
        }
    ]
}

def response(body, status=200):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body)
    }

def get_menu(event, context):
    return response(DATA["menu"])

def get_categories(event, context):
    return response(DATA["categories"])

def get_tags(event, context):
    return response(DATA["tags"])

def get_option_groups(event, context):
    return response(DATA["option_groups"])

def get_menu_item(event, context):
    item_id = int(event["pathParameters"]["item_id"])
    item = next((item for item in DATA["menu"] if item["item_id"] == item_id), None)
    if item:
        return response(item)
    else:
        return response({"error": "Menu item not found"}, status=404)

def create_menu_item(event, context):
    body = json.loads(event["body"])
    new_id = max(item["item_id"] for item in DATA["menu"]) + 1 if DATA["menu"] else 1001
    now = datetime.utcnow().isoformat() + "Z"
    item = {
        "item_id": new_id,
        "created_at": now,
        "updated_at": now,
        **body
    }
    DATA["menu"].append(item)
    return response(item, status=201)

def update_menu_item(event, context):
    item_id = int(event["pathParameters"]["item_id"])
    body = json.loads(event["body"])
    for idx, item in enumerate(DATA["menu"]):
        if item["item_id"] == item_id:
            DATA["menu"][idx].update(body)
            DATA["menu"][idx]["updated_at"] = datetime.utcnow().isoformat() + "Z"
            return response(DATA["menu"][idx])
    return response({"error": "Menu item not found"}, status=404)

def delete_menu_item(event, context):
    item_id = int(event["pathParameters"]["item_id"])
    before = len(DATA["menu"])
    DATA["menu"] = [item for item in DATA["menu"] if item["item_id"] != item_id]
    if len(DATA["menu"]) < before:
        return response({"success": True})
    else:
        return response({"error": "Menu item not found"}, status=404)