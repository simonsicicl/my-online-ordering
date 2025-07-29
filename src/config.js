//config.js
// This file contains the configuration for the restaurant API URL and example data
export const restaurantApiUrl = 'https://yqya5f6a21.execute-api.ap-northeast-3.amazonaws.com/Stage_1/menu';

export const restaurantDataExample = {
    merchant_id: 1,
    merchant_info: {
        name: "Amazing Cafe",
        description: "This is a sample restaurant description for Amazing Cafe.",
        address: "123 Main St, Anytown, USA",
        phone: "555-1234",
        created_at: "2025-07-28T00:00:00Z",
        is_active: true
    },
    categories: [
        {
            category_id: 101,
            name: "飲料",
            sort_order: 1,
            is_active: true
        },
        {
            category_id: 102,
            name: "甜點",
            sort_order: 2,
            is_active: true
        }
    ],
    tags: [
        {
            tag_id: 1,
            name: "熱賣",
            color: "#FF0000"
        },
        {
            tag_id: 2,
            name: "新品",
            color: "#00FF00"
        },
        {
            tag_id: 3,
            name: "限時",
            color: "#0000FF"
        },
        {
            tag_id: 4,
            name: "人氣",
            color: "#FFA500"
        }
    ],
    menu: [
        {
            item_id: 1001,
            name: "珍珠奶茶",
            description: "經典台灣飲品",
            price: 60.0,
            category_id: 101,
            is_available: true,
            is_combo: false,
            is_optional: true,
            image_url: "https://simoncfcu-test-bucket.s3.ap-northeast-3.amazonaws.com/my-online-ordering/image/myBoba.jpg",
            created_at: "2025-07-01T00:00:00Z",
            updated_at: "2025-07-15T00:00:00Z",
            tags: [1, 2],
            option_groups: [
                {
                    option_group_id: 201,
                    group_name: "甜度",
                    is_required: true,
                    is_multiple: false,
                    is_template: false,
                    template_name: "",
                    default_option_id: 301,
                    is_visible_on_order: true,
                    options: [
                        { option_id: 301, option_name: "正常糖", price_delta: 0, is_active: true },
                        { option_id: 302, option_name: "半糖", price_delta: 0, is_active: true },
                        { option_id: 303, option_name: "無糖", price_delta: 0, is_active: true }
                    ]
                },
                {
                    option_group_id: 202,
                    group_name: "加料",
                    is_required: false,
                    is_multiple: true,
                    is_template: false,
                    template_name: "",
                    default_option_id: null,
                    is_visible_on_order: true,
                    options: [
                        { option_id: 304, option_name: "加珍珠", price_delta: 10, is_active: true },
                        { option_id: 305, option_name: "加椰果", price_delta: 10, is_active: true }
                    ]
                }
            ]
        },
        {
            item_id: 1002,
            name: "下午茶套餐",
            description: "含飲料與甜點的組合",
            price: 100.0,
            category_id: 102,
            is_available: true,
            is_combo: true,
            is_optional: false,
            image_url: "https://simoncfcu-test-bucket.s3.ap-northeast-3.amazonaws.com/my-online-ordering/image/myAfterNoonTea.jpg",
            created_at: "2025-07-10T00:00:00Z",
            updated_at: "2025-07-20T00:00:00Z",                
            combo_item_groups: [
                {
                    item_group_id: 501,
                    group_name: "飲料",
                    quantity: 1,
                    items: [1001, 1004] // 只列出 item_id
                },
                {
                    item_group_id: 502,
                    group_name: "甜點",
                    quantity: 1,
                    items: [1003, 1005]
                }
            ]
        },
        {
            item_id: 1003,
            name: "奶酪",
            description: "香濃滑順的手工奶酪",
            price: 50.0,
            category_id: 102,
            is_available: true,
            is_combo: false,
            is_optional: false,
            image_url: "https://simoncfcu-test-bucket.s3.ap-northeast-3.amazonaws.com/my-online-ordering/image/myCheese.jpg",
            created_at: "2025-07-05T00:00:00Z",
            updated_at: "2025-07-20T00:00:00Z",
            tags: [3],
            option_groups: []
        },
        {
            item_id: 1004,
            name: "紅茶",
            description: "經典原味紅茶，無糖也好喝",
            price: 50.0,
            category_id: 101,
            is_available: true,
            is_combo: false,
            is_optional: true,
            image_url: "https://simoncfcu-test-bucket.s3.ap-northeast-3.amazonaws.com/my-online-ordering/image/myBlackTea.jpg",
            created_at: "2025-07-08T00:00:00Z",
            updated_at: "2025-07-20T00:00:00Z",
            tags: [],
            option_groups: [
                {
                    option_group_id: 203,
                    group_name: "甜度",
                    is_required: true,
                    is_multiple: false,
                    is_template: false,
                    template_name: "",
                    default_option_id: 306,
                    is_visible_on_order: true,
                    options: [
                        { option_id: 306, option_name: "正常糖", price_delta: 0, is_active: true },
                        { option_id: 307, option_name: "半糖", price_delta: 0, is_active: true },
                        { option_id: 308, option_name: "無糖", price_delta: 0, is_active: true }
                    ]
                }
            ]
        },
        {
            item_id: 1005,
            name: "蛋糕",
            description: "香草口味海綿蛋糕，口感綿密",
            price: 55.0,
            category_id: 102,
            is_available: true,
            is_combo: false,
            is_optional: false,
            image_url: "https://simoncfcu-test-bucket.s3.ap-northeast-3.amazonaws.com/my-online-ordering/image/myCake.jpg",
            created_at: "2025-07-09T00:00:00Z",
            updated_at: "2025-07-20T00:00:00Z",
            tags: [1],
            option_groups: []
        }                    
    ] 
};