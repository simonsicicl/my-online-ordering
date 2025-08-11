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
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "*",
        },
        "body": json.dumps(body, ensure_ascii=False),
    }

# === Category CRUD ===

def get_categories(event, context):
    return response(MENU.get("categories", []))


def get_category(event, context):
    category_id = int(event["pathParameters"]["category_id"])  # type: ignore
    category = next((c for c in MENU.get("categories", []) if c.get("category_id") == category_id), None)
    if category:
        return response(category)
    return response({"error": "Category not found"}, status=404)


def create_category(event, context):
    body = json.loads(event.get("body") or "{}")
    cats = MENU.setdefault("categories", [])
    new_id = max((c.get("category_id", 0) for c in cats), default=100) + 1
    category = {"category_id": new_id, **body}
    cats.append(category)
    return response(category, status=201)


def update_category(event, context):
    category_id = int(event["pathParameters"]["category_id"])  # type: ignore
    body = json.loads(event.get("body") or "{}")
    for idx, c in enumerate(MENU.get("categories", [])):
        if c.get("category_id") == category_id:
            c.update(body)
            MENU["categories"][idx] = c
            return response(c)
    return response({"error": "Category not found"}, status=404)


def delete_category(event, context):
    category_id = int(event["pathParameters"]["category_id"])  # type: ignore
    before = len(MENU.get("categories", []))
    MENU["categories"] = [c for c in MENU.get("categories", []) if c.get("category_id") != category_id]
    if len(MENU.get("categories", [])) < before:
        return response({"deleted": True})
    return response({"error": "Category not found"}, status=404)

# === Tag CRUD ===

def get_tags(event, context):
    return response(MENU.get("tags", []))


def get_tag(event, context):
    tag_id = int(event["pathParameters"]["tag_id"])  # type: ignore
    tag = next((t for t in MENU.get("tags", []) if t.get("tag_id") == tag_id), None)
    if tag:
        return response(tag)
    return response({"error": "Tag not found"}, status=404)


def create_tag(event, context):
    body = json.loads(event.get("body") or "{}")
    tags = MENU.setdefault("tags", [])
    new_id = max((t.get("tag_id", 0) for t in tags), default=0) + 1
    tag = {"tag_id": new_id, **body}
    tags.append(tag)
    return response(tag, status=201)


def update_tag(event, context):
    tag_id = int(event["pathParameters"]["tag_id"])  # type: ignore
    body = json.loads(event.get("body") or "{}")
    for idx, t in enumerate(MENU.get("tags", [])):
        if t.get("tag_id") == tag_id:
            t.update(body)
            MENU["tags"][idx] = t
            return response(t)
    return response({"error": "Tag not found"}, status=404)


def delete_tag(event, context):
    tag_id = int(event["pathParameters"]["tag_id"])  # type: ignore
    before = len(MENU.get("tags", []))
    MENU["tags"] = [t for t in MENU.get("tags", []) if t.get("tag_id") != tag_id]
    if len(MENU.get("tags", [])) < before:
        return response({"deleted": True})
    return response({"error": "Tag not found"}, status=404)

# === Option Group CRUD ===

def get_option_groups(event, context):
    return response(MENU.get("option_groups", []))


def get_option_group(event, context):
    option_group_id = int(event["pathParameters"]["option_group_id"])  # type: ignore
    og = next((g for g in MENU.get("option_groups", []) if g.get("option_group_id") == option_group_id), None)
    if og:
        return response(og)
    return response({"error": "Option group not found"}, status=404)


def create_option_group(event, context):
    body = json.loads(event.get("body") or "{}")
    groups = MENU.setdefault("option_groups", [])
    new_id = max((g.get("option_group_id", 0) for g in groups), default=0) + 1
    grp = {"option_group_id": new_id, **body}
    groups.append(grp)
    return response(grp, status=201)


def update_option_group(event, context):
    option_group_id = int(event["pathParameters"]["option_group_id"])  # type: ignore
    body = json.loads(event.get("body") or "{}")
    for idx, g in enumerate(MENU.get("option_groups", [])):
        if g.get("option_group_id") == option_group_id:
            g.update(body)
            MENU["option_groups"][idx] = g
            return response(g)
    return response({"error": "Option group not found"}, status=404)


def delete_option_group(event, context):
    option_group_id = int(event["pathParameters"]["option_group_id"])  # type: ignore
    before = len(MENU.get("option_groups", []))
    MENU["option_groups"] = [g for g in MENU.get("option_groups", []) if g.get("option_group_id") != option_group_id]
    if len(MENU.get("option_groups", [])) < before:
        return response({"deleted": True})
    return response({"error": "Option group not found"}, status=404)

# === Option CRUD ===

def get_option_list(event, context):
    return response(MENU.get("option_list", []))


def get_option(event, context):
    option_id = int(event["pathParameters"]["option_id"])  # type: ignore
    opt = next((o for o in MENU.get("option_list", []) if o.get("option_id") == option_id), None)
    if opt:
        return response(opt)
    return response({"error": "Option not found"}, status=404)


def create_option(event, context):
    body = json.loads(event.get("body") or "{}")
    options = MENU.setdefault("option_list", [])
    new_id = max((o.get("option_id", 0) for o in options), default=0) + 1
    opt = {"option_id": new_id, **body}
    options.append(opt)
    return response(opt, status=201)


def update_option(event, context):
    option_id = int(event["pathParameters"]["option_id"])  # type: ignore
    body = json.loads(event.get("body") or "{}")
    for idx, o in enumerate(MENU.get("option_list", [])):
        if o.get("option_id") == option_id:
            o.update(body)
            MENU["option_list"][idx] = o
            return response(o)
    return response({"error": "Option not found"}, status=404)


def delete_option(event, context):
    option_id = int(event["pathParameters"]["option_id"])  # type: ignore
    before = len(MENU.get("option_list", []))
    MENU["option_list"] = [o for o in MENU.get("option_list", []) if o.get("option_id") != option_id]
    if len(MENU.get("option_list", [])) < before:
        return response({"deleted": True})
    return response({"error": "Option not found"}, status=404)

# === Menu Item CRUD ===

def get_menu(event, context):
    return response(MENU.get("items", []))


def get_menu_item(event, context):
    item_id = int(event["pathParameters"]["item_id"])  # type: ignore
    item = next((i for i in MENU.get("items", []) if i.get("item_id") == item_id), None)
    if item:
        return response(item)
    return response({"error": "Item not found"}, status=404)


def create_menu_item(event, context):
    body = json.loads(event.get("body") or "{}")
    items = MENU.setdefault("items", [])
    new_id = max((i.get("item_id", 0) for i in items), default=0) + 1
    item = {"item_id": new_id, **body}
    items.append(item)
    return response(item, status=201)


def update_menu_item(event, context):
    item_id = int(event["pathParameters"]["item_id"])  # type: ignore
    body = json.loads(event.get("body") or "{}")
    for idx, i in enumerate(MENU.get("items", [])):
        if i.get("item_id") == item_id:
            i.update(body)
            MENU["items"][idx] = i
            return response(i)
    return response({"error": "Item not found"}, status=404)


def delete_menu_item(event, context):
    item_id = int(event["pathParameters"]["item_id"])  # type: ignore
    before = len(MENU.get("items", []))
    MENU["items"] = [i for i in MENU.get("items", []) if i.get("item_id") != item_id]
    if len(MENU.get("items", [])) < before:
        return response({"deleted": True})
    return response({"error": "Item not found"}, status=404)

# === Recipes (BOM) ===

def get_item_recipe(event, context):
    item_id = int(event["pathParameters"]["item_id"])  # type: ignore
    recipes = MENU.setdefault("recipes", {})
    rec = recipes.get(str(item_id))
    if not rec:
        return response({"error": "Recipe not found"}, status=404)
    return response(rec)


def upsert_item_recipe(event, context):
    item_id = int(event["pathParameters"]["item_id"])  # type: ignore
    body = json.loads(event.get("body") or "{}")
    recipes = MENU.setdefault("recipes", {})
    body.setdefault("item_id", item_id)
    body.setdefault("version", (recipes.get(str(item_id), {}).get("version", 0) + 1))
    recipes[str(item_id)] = body
    return response(body)


def list_recipes(event, context):
    recipes = MENU.get("recipes", {})
    data = [v for _, v in recipes.items()]
    return response({"items": data})