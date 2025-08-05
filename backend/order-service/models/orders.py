ORDERS = [
    {
        "merchant_id": 1,
        "order_id": 1001,
        "user_id": 501,
        "order_number": 23,
        "order_time": "2025-08-03T14:30:00Z",
        "status": "PAID",
        "total_amount": 130.0,
        "source": "kiosk",
        "order_items": [
            {
                "order_item_id": 1,
                "item_id": 1001,
                "quantity": 1,
                "price": 60.0,
                "is_combo": False,
                "parent_order_item_id": None,
                "order_item_options": [
                    { "order_item_option_id": 1, "option_id": 301, "option_name": "正常糖", "price_delta": 0 },
                    { "order_item_option_id": 2, "option_id": 304, "option_name": "加珍珠", "price_delta": 10 }
                ]
            },
            {
                "order_item_id": 2,
                "item_id": 1003,
                "quantity": 1,
                "price": 50.0,
                "is_combo": False,
                "parent_order_item_id": None,
                "order_item_options": []
            }
        ]
    },
    {
        "merchant_id": 1,
        "order_id": 1002,
        "user_id": None,
        "order_number": 24,
        "order_time": "2025-08-03T15:00:00Z",
        "status": "PENDING",
        "total_amount": 110.0,
        "source": "mobile",
        "order_items": [
            {
                "order_item_id": 3,
                "item_id": 1002,
                "quantity": 1,
                "price": 110.0,
                "is_combo": True,
                "parent_order_item_id": None,
                "order_item_options": [],
                "combo_items": [
                    {
                        "order_item_id": 4,
                        "item_id": 1001,
                        "quantity": 1,
                        "price": 0.0,
                        "is_combo": False,
                        "parent_order_item_id": 3,
                        "order_item_options": [
                            { "order_item_option_id": 3, "option_id": 302, "option_name": "半糖", "price_delta": 0 }
                        ]
                    },
                    {
                        "order_item_id": 5,
                        "item_id": 1003,
                        "quantity": 1,
                        "price": 0.0,
                        "is_combo": False,
                        "parent_order_item_id": 3,
                        "order_item_options": []
                    }
                ]
            }
        ]
    },
    {
        "merchant_id": 1,
        "order_id": 1003,
        "user_id": 502,
        "order_number": 25,
        "order_time": "2025-08-03T15:30:00Z",
        "status": "CANCELLED",
        "total_amount": 0.0,
        "source": "web",
        "order_items": []
    },
    {
        "merchant_id": 1,
        "order_id": 1004,
        "user_id": 503,
        "order_number": 26,
        "order_time": "2025-08-03T16:00:00Z",
        "status": "PAID",
        "total_amount": 105.0,
        "source": "pos",
        "order_items": [
            {
                "order_item_id": 6,
                "item_id": 1004,
                "quantity": 1,
                "price": 50.0,
                "is_combo": False,
                "parent_order_item_id": None,
                "order_item_options": [
                    { "order_item_option_id": 4, "option_id": 306, "option_name": "正常糖", "price_delta": 0 }
                ]
            },
            {
                "order_item_id": 7,
                "item_id": 1005,
                "quantity": 1,
                "price": 55.0,
                "is_combo": False,
                "parent_order_item_id": None,
                "order_item_options": []
            }
        ]
    },
    {
        "merchant_id": 1,
        "order_id": 1005,
        "user_id": 504,
        "order_number": 27,
        "order_time": "2025-08-03T16:30:00Z",
        "status": "PAID",
        "total_amount": 70.0,
        "source": "kiosk",
        "order_items": [
            {
                "order_item_id": 8,
                "item_id": 1001,
                "quantity": 1,
                "price": 60.0,
                "is_combo": False,
                "parent_order_item_id": None,
                "order_item_options": [
                    { "order_item_option_id": 5, "option_id": 303, "option_name": "無糖", "price_delta": 0 }
                ]
            },
            {
                "order_item_id": 9,
                "item_id": 1004,
                "quantity": 1,
                "price": 50.0,
                "is_combo": False,
                "parent_order_item_id": None,
                "order_item_options": []
            }
        ]
    }
]