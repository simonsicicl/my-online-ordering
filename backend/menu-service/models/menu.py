MENU = {
    "categories": [
        {"category_id": 101, "name": "飲料", "sort_order": 1, "is_active": True},
        {"category_id": 102, "name": "甜點", "sort_order": 2, "is_active": True}
    ],
    "tags": [
        {"tag_id": 1, "name": "熱賣", "color": "#FF0000"},
        {"tag_id": 2, "name": "新品", "color": "#00FF00"},
        {"tag_id": 3, "name": "限時", "color": "#0000FF"},
        {"tag_id": 4, "name": "人氣", "color": "#FFA500"}
    ],
    "option_groups": [
        {
            "option_group_id": 201,
            "is_universal": True,
            "group_name": "甜度",
            "is_multiple": False,
            "universal_name": "通用甜度群組",
            "default_option_id": 301,
            "is_visible_on_order": True,
            "options": [
                {"option_id": 301, "option_name": "正常糖", "price_delta": 0, "is_active": True},
                {"option_id": 302, "option_name": "半糖", "price_delta": 0, "is_active": True},
                {"option_id": 303, "option_name": "無糖", "price_delta": 0, "is_active": True}
            ]
        },
        {
            "option_group_id": 202,
            "is_universal": True,
            "group_name": "加料",
            "is_multiple": True,
            "universal_name": "通用加料群組",
            "default_option_id": None,
            "is_visible_on_order": True,
            "options": [
                {"option_id": 304, "option_name": "加珍珠", "price_delta": 10, "is_active": True},
                {"option_id": 305, "option_name": "加椰果", "price_delta": 10, "is_active": True}
            ]
        },
        {
            "option_group_id": 203,
            "is_universal": False,
            "group_name": "甜度",
            "is_multiple": False,
            "default_option_id": 306,
            "is_visible_on_order": True,
            "options": [
                {"option_id": 306, "option_name": "正常糖", "price_delta": 0, "is_active": True},
                {"option_id": 307, "option_name": "半糖", "price_delta": 0, "is_active": True},
                {"option_id": 308, "option_name": "無糖", "price_delta": 0, "is_active": True}
            ]
        }
    ],
    "menu": [
        {
            "item_id": 1001,
            "name": "珍珠奶茶",
            "description": "經典台灣飲品",
            "price": 60.0,
            "category_id": 101,
            "is_available": True,
            "is_combo": False,
            "is_optional": True,
            "image_url": "https://simoncfcu-test-bucket.s3.ap-northeast-3.amazonaws.com/my-online-ordering/sample-images/myBoba.jpg",
            "created_at": "2025-07-01T00:00:00Z",
            "updated_at": "2025-07-15T00:00:00Z",
            "tags": [1, 2],
            "option_groups": [201, 202]
        },
        {
            "item_id": 1002,
            "name": "下午茶套餐",
            "description": "含飲料與甜點的組合",
            "price": 110.0,
            "category_id": 102,
            "is_available": True,
            "is_combo": True,
            "is_optional": False,
            "image_url": "https://simoncfcu-test-bucket.s3.ap-northeast-3.amazonaws.com/my-online-ordering/sample-images/myAfterNoonTea.jpg",
            "created_at": "2025-07-10T00:00:00Z",
            "updated_at": "2025-07-20T00:00:00Z",
            "tags": [],
            "combo_item_groups": [
                {
                    "item_group_id": 501,
                    "group_name": "飲料",
                    "quantity": 1,
                    "items": [
                        {"item_id": 1001, "price_delta": 10},
                        {"item_id": 1004, "price_delta": 0}
                    ]
                },
                {
                    "item_group_id": 502,
                    "group_name": "甜點",
                    "quantity": 1,
                    "items": [
                        {"item_id": 1003, "price_delta": 0},
                        {"item_id": 1005, "price_delta": 5}
                    ]
                }
            ]
        },
        {
            "item_id": 1003,
            "name": "奶酪",
            "description": "香濃滑順的手工奶酪",
            "price": 50.0,
            "category_id": 102,
            "is_available": True,
            "is_combo": False,
            "is_optional": False,
            "image_url": "https://simoncfcu-test-bucket.s3.ap-northeast-3.amazonaws.com/my-online-ordering/sample-images/myCheese.jpg",
            "created_at": "2025-07-05T00:00:00Z",
            "updated_at": "2025-07-20T00:00:00Z",
            "tags": [3],
            "option_groups": []
        },
        {
            "item_id": 1004,
            "name": "紅茶",
            "description": "經典原味紅茶，無糖也好喝",
            "price": 50.0,
            "category_id": 101,
            "is_available": True,
            "is_combo": False,
            "is_optional": True,
            "image_url": "https://simoncfcu-test-bucket.s3.ap-northeast-3.amazonaws.com/my-online-ordering/sample-images/myBlackTea.jpg",
            "created_at": "2025-07-08T00:00:00Z",
            "updated_at": "2025-07-20T00:00:00Z",
            "tags": [],
            "option_groups": [203]
        },
        {
            "item_id": 1005,
            "name": "蛋糕",
            "description": "香草口味海綿蛋糕，口感綿密",
            "price": 55.0,
            "category_id": 102,
            "is_available": True,
            "is_combo": False,
            "is_optional": False,
            "image_url": "https://simoncfcu-test-bucket.s3.ap-northeast-3.amazonaws.com/my-online-ordering/sample-images/myCake.jpg",
            "created_at": "2025-07-09T00:00:00Z",
            "updated_at": "2025-07-20T00:00:00Z",
            "tags": [1],
            "option_groups": []
        }
    ]
}