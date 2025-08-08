import json
from datetime import datetime
from models.menu import MENU  # Import in-memory menu data

# === Response Helper ===
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

# === Category CRUD ===
def get_categories(event, context):
    """
    GET /categories
    Returns the list of all categories.
    """
    return response(MENU["categories"])

def get_category(event, context):
    """
    GET /categories/{category_id}
    Returns a single category by category_id.
    """
    category_id = int(event["pathParameters"]["category_id"])
    category = next((c for c in MENU["categories"] if c["category_id"] == category_id), None)
    if category:
        return response(category)
    else:
        return response({"error": "Category not found"}, status=404)

def create_category(event, context):
    """
    POST /categories
    Creates a new category.
    """
    body = json.loads(event["body"])
    new_id = max((c["category_id"] for c in MENU["categories"]), default=100) + 1
    category = {"category_id": new_id, **body}
    MENU["categories"].append(category)
    return response(category, status=201)

def update_category(event, context):
    """
    PUT /categories/{category_id}
    Updates an existing category.
    """
    category_id = int(event["pathParameters"]["category_id"])
    body = json.loads(event["body"])
    for idx, c in enumerate(MENU["categories"]):
        if c["category_id"] == category_id:
            MENU["categories"][idx].update(body)
            return response(MENU["categories"][idx])
    return response({"error": "Category not found"}, status=404)

def delete_category(event, context):
    """
    DELETE /categories/{category_id}
    Deletes a category by category_id.
    """
    category_id = int(event["pathParameters"]["category_id"])
    before = len(MENU["categories"])
    MENU["categories"] = [c for c in MENU["categories"] if c["category_id"] != category_id]
    if len(MENU["categories"]) < before:
        return response({"success": True})
    else:
        return response({"error": "Category not found"}, status=404)

# === Tag CRUD ===
def get_tags(event, context):
    """
    GET /tags
    Returns the list of all tags.
    """
    return response(MENU["tags"])

def get_tag(event, context):
    """
    GET /tags/{tag_id}
    Returns a single tag by tag_id.
    """
    tag_id = int(event["pathParameters"]["tag_id"])
    tag = next((t for t in MENU["tags"] if t["tag_id"] == tag_id), None)
    if tag:
        return response(tag)
    else:
        return response({"error": "Tag not found"}, status=404)

def create_tag(event, context):
    """
    POST /tags
    Creates a new tag.
    """
    body = json.loads(event["body"])
    new_id = max((t["tag_id"] for t in MENU["tags"]), default=0) + 1
    tag = {"tag_id": new_id, **body}
    MENU["tags"].append(tag)
    return response(tag, status=201)

def update_tag(event, context):
    """
    PUT /tags/{tag_id}
    Updates an existing tag.
    """
    tag_id = int(event["pathParameters"]["tag_id"])
    body = json.loads(event["body"])
    for idx, t in enumerate(MENU["tags"]):
        if t["tag_id"] == tag_id:
            MENU["tags"][idx].update(body)
            return response(MENU["tags"][idx])
    return response({"error": "Tag not found"}, status=404)

def delete_tag(event, context):
    """
    DELETE /tags/{tag_id}
    Deletes a tag by tag_id.
    """
    tag_id = int(event["pathParameters"]["tag_id"])
    before = len(MENU["tags"])
    MENU["tags"] = [t for t in MENU["tags"] if t["tag_id"] != tag_id]
    if len(MENU["tags"]) < before:
        return response({"success": True})
    else:
        return response({"error": "Tag not found"}, status=404)

# === Option Group CRUD ===
def get_option_groups(event, context):
    """
    GET /option-groups
    Returns the list of all option groups.
    """
    return response(MENU["option_groups"])

def get_option_group(event, context):
    """
    GET /option-groups/{option_group_id}
    Returns a single option group by option_group_id.
    """
    option_group_id = int(event["pathParameters"]["option_group_id"])
    group = next((g for g in MENU["option_groups"] if g["option_group_id"] == option_group_id), None)
    if group:
        return response(group)
    else:
        return response({"error": "Option group not found"}, status=404)

def create_option_group(event, context):
    """
    POST /option-groups
    Creates a new option group.
    """
    body = json.loads(event["body"])
    new_id = max((g["option_group_id"] for g in MENU["option_groups"]), default=200) + 1
    group = {"option_group_id": new_id, **body}
    MENU["option_groups"].append(group)
    return response(group, status=201)

def update_option_group(event, context):
    """
    PUT /option-groups/{option_group_id}
    Updates an existing option group.
    """
    option_group_id = int(event["pathParameters"]["option_group_id"])
    body = json.loads(event["body"])
    for idx, g in enumerate(MENU["option_groups"]):
        if g["option_group_id"] == option_group_id:
            MENU["option_groups"][idx].update(body)
            return response(MENU["option_groups"][idx])
    return response({"error": "Option group not found"}, status=404)

def delete_option_group(event, context):
    """
    DELETE /option-groups/{option_group_id}
    Deletes an option group by option_group_id.
    """
    option_group_id = int(event["pathParameters"]["option_group_id"])
    before = len(MENU["option_groups"])
    MENU["option_groups"] = [g for g in MENU["option_groups"] if g["option_group_id"] != option_group_id]
    if len(MENU["option_groups"]) < before:
        return response({"success": True})
    else:
        return response({"error": "Option group not found"}, status=404)

# === Option CRUD ===
def get_option_list(event, context):
    """
    GET /option-list
    Returns the list of all options.
    """
    return response(MENU["optionList"])

def get_option(event, context):
    """
    GET /option-list/{option_id}
    Returns a single option by option_id.
    """
    option_id = int(event["pathParameters"]["option_id"])
    option = next((o for o in MENU["optionList"] if o["option_id"] == option_id), None)
    if option:
        return response(option)
    else:
        return response({"error": "Option not found"}, status=404)

def create_option(event, context):
    """
    POST /option-list
    Creates a new option.
    """
    body = json.loads(event["body"])
    new_id = max((o["option_id"] for o in MENU["optionList"]), default=300) + 1
    option = {"option_id": new_id, **body}
    MENU["optionList"].append(option)
    return response(option, status=201)

def update_option(event, context):
    """
    PUT /option-list/{option_id}
    Updates an existing option.
    """
    option_id = int(event["pathParameters"]["option_id"])
    body = json.loads(event["body"])
    for idx, o in enumerate(MENU["optionList"]):
        if o["option_id"] == option_id:
            MENU["optionList"][idx].update(body)
            return response(MENU["optionList"][idx])
    return response({"error": "Option not found"}, status=404)

def delete_option(event, context):
    """
    DELETE /option-list/{option_id}
    Deletes an option by option_id.
    """
    option_id = int(event["pathParameters"]["option_id"])
    before = len(MENU["optionList"])
    MENU["optionList"] = [o for o in MENU["optionList"] if o["option_id"] != option_id]
    if len(MENU["optionList"]) < before:
        return response({"success": True})
    else:
        return response({"error": "Option not found"}, status=404)

# === Menu Item CRUD ===
def get_menu(event, context):
    """
    GET /menu
    Returns the list of all menu items.
    """
    return response(MENU["menu"])

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