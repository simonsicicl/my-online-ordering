import json
from datetime import datetime
from models.menu import MENU  # Import in-memory menu data

def response(body, status=200):
    """
    Standard HTTP response helper for AWS Lambda Proxy integration.
    Adds CORS headers for frontend access.
    """
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",  # Allow all origins
            "Access-Control-Allow-Headers": "*", # Allow all headers
            "Access-Control-Allow-Methods": "*"  # Allow all methods
        },
        "body": json.dumps(body, ensure_ascii=False)
    }

def get_menu(event, context):
    """
    GET /menu
    Returns the list of all menu items.
    """
    return response(MENU["menu"])

def get_categories(event, context):
    """
    GET /categories
    Returns the list of all categories.
    """
    return response(MENU["categories"])

def get_tags(event, context):
    """
    GET /tags
    Returns the list of all tags.
    """
    return response(MENU["tags"])

def get_option_groups(event, context):
    """
    GET /option-groups
    Returns the list of all option groups.
    """
    return response(MENU["option_groups"])

def get_option_list(event, context):
    """
    GET /option-list
    Returns the list of all options.
    """
    return response(MENU["optionList"])

def get_menu_item(event, context):
    """
    GET /menu/{item_id}
    Returns a single menu item by item_id.
    """
    item_id = int(event["pathParameters"]["item_id"])
    item = next((item for item in MENU["menu"] if item["item_id"] == item_id), None)
    if item:
        return response(item)
    else:
        return response({"error": "Menu item not found"}, status=404)

def create_menu_item(event, context):
    """
    POST /menu
    Creates a new menu item and adds it to MENU["menu"].
    """
    body = json.loads(event["body"])
    new_id = max(item["item_id"] for item in MENU["menu"]) + 1 if MENU["menu"] else 1001
    now = datetime.utcnow().isoformat() + "Z"
    item = {
        "item_id": new_id,
        "created_at": now,
        "updated_at": now,
        **body
    }
    MENU["menu"].append(item)
    return response(item, status=201)

def update_menu_item(event, context):
    """
    PUT /menu/{item_id}
    Updates an existing menu item by item_id.
    """
    item_id = int(event["pathParameters"]["item_id"])
    body = json.loads(event["body"])
    for idx, item in enumerate(MENU["menu"]):
        if item["item_id"] == item_id:
            MENU["menu"][idx].update(body)
            MENU["menu"][idx]["updated_at"] = datetime.utcnow().isoformat() + "Z"
            return response(MENU["menu"][idx])
    return response({"error": "Menu item not found"}, status=404)

def delete_menu_item(event, context):
    """
    DELETE /menu/{item_id}
    Deletes a menu item by item_id.
    """
    item_id = int(event["pathParameters"]["item_id"])
    before = len(MENU["menu"])
    MENU["menu"] = [item for item in MENU["menu"] if item["item_id"] != item_id]
    if len(MENU["menu"]) < before:
        return response({"success": True})
    else:
        return response({"error": "Menu item not found"}, status=404)