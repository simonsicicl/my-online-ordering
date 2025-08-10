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
  option_groups: [
    {
      option_group_id: 201,
      is_universal: true,
      group_name: "甜度",
      is_multiple: false,
      universal_name: "通用甜度群組",
      default_option_id: 301,
      is_visible_on_order: true,
      option_ids: [301, 302, 303]
    },
    {
      option_group_id: 202,
      is_universal: true,
      group_name: "加料",
      is_multiple: true,
      universal_name: "通用加料群組",
      default_option_id: null,
      is_visible_on_order: true,
      option_ids: [304, 305]
    },
    {
      option_group_id: 203,
      is_universal: false,
      group_name: "甜度",
      is_multiple: false,
      default_option_id: 301,
      is_visible_on_order: true,
      option_ids: [301, 302, 303]
    }
  ],
  optionList: [
    { option_id: 301, option_name: "正常糖", price_delta: 0, is_active: true },
    { option_id: 302, option_name: "半糖", price_delta: 0, is_active: true },
    { option_id: 303, option_name: "無糖", price_delta: 0, is_active: true },
    {
      option_id: 304,
      option_name: "加珍珠",
      price_delta: 10,
      is_active: true,
      material_list: [
        { material_id: 103, quantity_needed: 20.00 }
      ]
    },
    {
      option_id: 305,
      option_name: "加椰果",
      price_delta: 10,
      is_active: true,
      material_list: [
        { material_id: 104, quantity_needed: 20.00 }
      ]
    }
  ],
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
      image_url: "https://simoncfcu-test-bucket.s3.ap-northeast-3.amazonaws.com/my-online-ordering/sample-images/myBoba.jpg",
      created_at: "2025-07-01T00:00:00Z",
      updated_at: "2025-07-15T00:00:00Z",
      tags: [1, 2],
      option_groups: [201, 202],
      material_list: [
        { material_id: 101, quantity_needed: 10.00 },
        { material_id: 102, quantity_needed: 200.00 },
        { material_id: 103, quantity_needed: 30.00 }
      ]
    },
    {
      item_id: 1002,
      name: "下午茶套餐",
      description: "含飲料與甜點的組合",
      price: 110.0,
      category_id: 102,
      is_available: true,
      is_combo: true,
      is_optional: false,
      image_url: "https://simoncfcu-test-bucket.s3.ap-northeast-3.amazonaws.com/my-online-ordering/sample-images/myAfterNoonTea.jpg",
      created_at: "2025-07-10T00:00:00Z",
      updated_at: "2025-07-20T00:00:00Z",
      tags: [],
      combo_item_groups: [
        {
          item_group_id: 501,
          group_name: "飲料",
          quantity: 1,
          items: [
            {
              item_id: 1001,
              price_delta: 10
            },
            {
              item_id: 1004,
              price_delta: 0
            }
          ]
        },
        {
          item_group_id: 502,
          group_name: "甜點",
          quantity: 1,
          items: [
            {
              item_id: 1003,
              price_delta: 0
            },
            {
              item_id: 1005,
              price_delta: 5
            }
          ]
        }
      ],
      material_list: []
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
      image_url: "https://simoncfcu-test-bucket.s3.ap-northeast-3.amazonaws.com/my-online-ordering/sample-images/myCheese.jpg",
      created_at: "2025-07-05T00:00:00Z",
      updated_at: "2025-07-20T00:00:00Z",
      tags: [3],
      option_groups: [],
      material_list: [
        { material_id: 102, quantity_needed: 50.00 }
      ]
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
      image_url: "https://simoncfcu-test-bucket.s3.ap-northeast-3.amazonaws.com/my-online-ordering/sample-images/myBlackTea.jpg",
      created_at: "2025-07-08T00:00:00Z",
      updated_at: "2025-07-20T00:00:00Z",
      tags: [],
      option_groups: [203],
      material_list: [
        { material_id: 101, quantity_needed: 10.00 }
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
      image_url: "https://simoncfcu-test-bucket.s3.ap-northeast-3.amazonaws.com/my-online-ordering/sample-images/myCake.jpg",
      created_at: "2025-07-09T00:00:00Z",
      updated_at: "2025-07-20T00:00:00Z",
      tags: [1],
      option_groups: [],
      material_list: [
        { material_id: 105, quantity_needed: 80.00 },
        { material_id: 106, quantity_needed: 5.00 },
        { material_id: 107, quantity_needed: 100.00 }
      ]
    }                    
  ] 
};

export const inventoryDataExample = {
  material: [
    {
      merchant_id: 1,
      material_id: 101,
      name: "紅茶茶葉",
      unit: "g",
      stock_quantity: 5000.00,
      min_stock_alert: 500.00,
      is_active: true,
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-08-01T10:00:00Z"
    },
    {
      merchant_id: 1,
      material_id: 102,
      name: "牛奶",
      unit: "ml",
      stock_quantity: 20000.00,
      min_stock_alert: 2000.00,
      is_active: true,
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-08-01T10:00:00Z"
    },
    {
      merchant_id: 1,
      material_id: 103,
      name: "珍珠",
      unit: "g",
      stock_quantity: 3000.00,
      min_stock_alert: 300.00,
      is_active: true,
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-08-01T10:00:00Z"
    },
    {
      merchant_id: 1,
      material_id: 104,
      name: "椰果",
      unit: "g",
      stock_quantity: 1500.00,
      min_stock_alert: 200.00,
      is_active: true,
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-08-01T10:00:00Z"
    },
    {
      merchant_id: 1,
      material_id: 105,
      name: "蛋糕粉",
      unit: "g",
      stock_quantity: 1000.00,
      min_stock_alert: 100.00,
      is_active: true,
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-08-01T10:00:00Z"
    },
    {
      merchant_id: 1,
      material_id: 106,
      name: "抹茶粉",
      unit: "g",
      stock_quantity: 800.00,
      min_stock_alert: 80.00,
      is_active: true,
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-08-01T10:00:00Z"
    },
    {
      merchant_id: 1,
      material_id: 107,
      name: "鮮奶油",
      unit: "ml",
      stock_quantity: 3000.00,
      min_stock_alert: 300.00,
      is_active: true,
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-08-01T10:00:00Z"
    },
    {
      merchant_id: 1,
      material_id: 108,
      name: "巧克力醬",
      unit: "g",
      stock_quantity: 1200.00,
      min_stock_alert: 120.00,
      is_active: false,
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-08-01T10:00:00Z"
    }
  ],
  inventory_movement: [
    // 每個 material 先從 0 開始，然後有一筆進貨紀錄
    {
      merchant_id: 1,
      movement_id: 1,
      material_id: 101,
      movement_type: "進貨",
      quantity: 5000.00,
      note: "首次進貨",
      created_at: "2025-07-01T08:00:00Z"
    },
    {
      merchant_id: 1,
      movement_id: 2,
      material_id: 102,
      movement_type: "進貨",
      quantity: 20000.00,
      note: "首次進貨",
      created_at: "2025-07-01T08:00:00Z"
    },
    {
      merchant_id: 1,
      movement_id: 3,
      material_id: 103,
      movement_type: "進貨",
      quantity: 3000.00,
      note: "首次進貨",
      created_at: "2025-07-01T08:00:00Z"
    },
    {
      merchant_id: 1,
      movement_id: 4,
      material_id: 104,
      movement_type: "進貨",
      quantity: 1500.00,
      note: "首次進貨",
      created_at: "2025-07-01T08:00:00Z"
    },
    {
      merchant_id: 1,
      movement_id: 5,
      material_id: 105,
      movement_type: "進貨",
      quantity: 1000.00,
      note: "首次進貨",
      created_at: "2025-07-01T08:00:00Z"
    },
    {
      merchant_id: 1,
      movement_id: 6,
      material_id: 106,
      movement_type: "進貨",
      quantity: 800.00,
      note: "首次進貨",
      created_at: "2025-07-01T08:00:00Z"
    },
    {
      merchant_id: 1,
      movement_id: 7,
      material_id: 107,
      movement_type: "進貨",
      quantity: 3000.00,
      note: "首次進貨",
      created_at: "2025-07-01T08:00:00Z"
    },
    {
      merchant_id: 1,
      movement_id: 8,
      material_id: 108,
      movement_type: "進貨",
      quantity: 1200.00,
      note: "首次進貨",
      created_at: "2025-07-01T08:00:00Z"
    }
  ],
  purchase_order: [
    {
      merchant_id: 1,
      purchase_id: 1,
      supplier: "台灣茶葉公司",
      status: "COMPLETED",
      created_at: "2025-07-01T08:00:00Z"
    },
    {
      merchant_id: 1,
      purchase_id: 2,
      supplier: "牛奶大王",
      status: "COMPLETED",
      created_at: "2025-07-01T08:00:00Z"
    },
    {
      merchant_id: 1,
      purchase_id: 3,
      supplier: "珍珠工坊",
      status: "COMPLETED",
      created_at: "2025-07-01T08:00:00Z"
    },
    {
      merchant_id: 1,
      purchase_id: 4,
      supplier: "椰果供應商",
      status: "COMPLETED",
      created_at: "2025-07-01T08:00:00Z"
    },
    {
      merchant_id: 1,
      purchase_id: 5,
      supplier: "蛋糕原料商",
      status: "COMPLETED",
      created_at: "2025-07-01T08:00:00Z"
    },
    {
      merchant_id: 1,
      purchase_id: 6,
      supplier: "抹茶進口商",
      status: "COMPLETED",
      created_at: "2025-07-01T08:00:00Z"
    },
    {
      merchant_id: 1,
      purchase_id: 7,
      supplier: "鮮奶油供應商",
      status: "COMPLETED",
      created_at: "2025-07-01T08:00:00Z"
    },
    {
      merchant_id: 1,
      purchase_id: 8,
      supplier: "巧克力工廠",
      status: "COMPLETED",
      created_at: "2025-07-01T08:00:00Z"
    }
  ],
  purchase_order_item: [
    {
      merchant_id: 1,
      purchase_id: 1,
      material_id: 101,
      movement_id: 1,
      quantity: 5000.00,
      price: 80.00
    },
    {
      merchant_id: 1,
      purchase_id: 2,
      material_id: 102,
      movement_id: 2,
      quantity: 20000.00,
      price: 30.00
    },
    {
      merchant_id: 1,
      purchase_id: 3,
      material_id: 103,
      movement_id: 3,
      quantity: 3000.00,
      price: 50.00
    },
    {
      merchant_id: 1,
      purchase_id: 4,
      material_id: 104,
      movement_id: 4,
      quantity: 1500.00,
      price: 40.00
    },
    {
      merchant_id: 1,
      purchase_id: 5,
      material_id: 105,
      movement_id: 5,
      quantity: 1000.00,
      price: 60.00
    },
    {
      merchant_id: 1,
      purchase_id: 6,
      material_id: 106,
      movement_id: 6,
      quantity: 800.00,
      price: 70.00
    },
    {
      merchant_id: 1,
      purchase_id: 7,
      material_id: 107,
      movement_id: 7,
      quantity: 3000.00,
      price: 90.00
    },
    {
      merchant_id: 1,
      purchase_id: 8,
      material_id: 108,
      movement_id: 8,
      quantity: 1200.00,
      price: 100.00
    }
  ]
};

export const orderDataExample = [
  {
    merchant_id: 1,
    order_id: 1001,
    user_id: 501,
    order_number: 23,
    order_time: "2025-08-03T14:30:00Z",
    status: "PAID",
    total_amount: 130.0,
    source: "kiosk",
    order_items: [
      {
        order_item_id: 1,
        item_id: 1001, // 珍珠奶茶
        quantity: 1,
        price: 60.0,
        is_combo: false,
        parent_order_item_id: null,
        order_item_options: [
          { order_item_option_id: 1, option_id: 301, option_name: "正常糖", price_delta: 0 }, // 甜度
          { order_item_option_id: 2, option_id: 304, option_name: "加珍珠", price_delta: 10 } // 加料
        ]
      },
      {
        order_item_id: 2,
        item_id: 1003, // 奶酪
        quantity: 1,
        price: 50.0,
        is_combo: false,
        parent_order_item_id: null,
        order_item_options: []
      }
    ]
  },
  {
    merchant_id: 1,
    order_id: 1002,
    user_id: null,
    order_number: 24,
    order_time: "2025-08-03T15:00:00Z",
    status: "PENDING",
    total_amount: 110.0,
    source: "mobile",
    order_items: [
      {
        order_item_id: 3,
        item_id: 1002, // 下午茶套餐 (combo)
        quantity: 1,
        price: 110.0,
        is_combo: true,
        parent_order_item_id: null,
        order_item_options: [],
        combo_items: [
          {
            order_item_id: 4,
            item_id: 1001, // 珍珠奶茶
            quantity: 1,
            price: 0.0,
            is_combo: false,
            parent_order_item_id: 3,
            order_item_options: [
              { order_item_option_id: 3, option_id: 302, option_name: "半糖", price_delta: 0 }
            ]
          },
          {
            order_item_id: 5,
            item_id: 1003, // 奶酪
            quantity: 1,
            price: 0.0,
            is_combo: false,
            parent_order_item_id: 3,
            order_item_options: []
          }
        ]
      }
    ]
  },
  {
    merchant_id: 1,
    order_id: 1003,
    user_id: 502,
    order_number: 25,
    order_time: "2025-08-03T15:30:00Z",
    status: "CANCELLED",
    total_amount: 0.0,
    source: "web",
    order_items: []
  },
  {
    merchant_id: 1,
    order_id: 1004,
    user_id: 503,
    order_number: 26,
    order_time: "2025-08-03T16:00:00Z",
    status: "PAID",
    total_amount: 105.0,
    source: "pos",
    order_items: [
      {
        order_item_id: 6,
        item_id: 1004, // 紅茶
        quantity: 1,
        price: 50.0,
        is_combo: false,
        parent_order_item_id: null,
        order_item_options: [
          { order_item_option_id: 4, option_id: 306, option_name: "正常糖", price_delta: 0 }
        ]
      },
      {
        order_item_id: 7,
        item_id: 1005, // 蛋糕
        quantity: 1,
        price: 55.0,
        is_combo: false,
        parent_order_item_id: null,
        order_item_options: []
      }
    ]
  },
  {
    merchant_id: 1,
    order_id: 1005,
    user_id: 504,
    order_number: 27,
    order_time: "2025-08-03T16:30:00Z",
    status: "PAID",
    total_amount: 70.0,
    source: "kiosk",
    order_items: [
      {
        order_item_id: 8,
        item_id: 1001, // 珍珠奶茶
        quantity: 1,
        price: 60.0,
        is_combo: false,
        parent_order_item_id: null,
        order_item_options: [
          { order_item_option_id: 5, option_id: 303, option_name: "無糖", price_delta: 0 }
        ]
      },
      {
        order_item_id: 9,
        item_id: 1004, // 紅茶
        quantity: 1,
        price: 50.0,
        is_combo: false,
        parent_order_item_id: null,
        order_item_options: []
      }
    ]
  }
];