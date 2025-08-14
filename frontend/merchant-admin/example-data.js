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
  materials: [
    {
      merchant_id: 1,
      material_id: 101,
      sku: "MAT-101",
      name: "紅茶茶葉",
      unit: "g",
      unit_precision: 2,
      stock_quantity: 5000.0,
      min_stock_alert: 500.0,
      reorder_point: 800.0,
      reorder_qty: 3000.0,
      lot_tracking: false,
      expiry_tracking: false,
      lead_time_days: 3,
      is_active: true,
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-08-01T10:00:00Z"
    },
    {
      merchant_id: 1,
      material_id: 102,
      sku: "MAT-102",
      name: "牛奶",
      unit: "ml",
      unit_precision: 0,
      stock_quantity: 20000.0,
      min_stock_alert: 2000.0,
      reorder_point: 3000.0,
      reorder_qty: 10000.0,
      lot_tracking: false,
      expiry_tracking: false,
      lead_time_days: 2,
      is_active: true,
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-08-01T10:00:00Z"
    },
    {
      merchant_id: 1,
      material_id: 103,
      sku: "MAT-103",
      name: "珍珠",
      unit: "g",
      unit_precision: 2,
      stock_quantity: 3000.0,
      min_stock_alert: 300.0,
      reorder_point: 500.0,
      reorder_qty: 2000.0,
      lot_tracking: false,
      expiry_tracking: false,
      lead_time_days: 5,
      is_active: true,
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-08-01T10:00:00Z"
    },
    {
      merchant_id: 1,
      material_id: 104,
      sku: "MAT-104",
      name: "椰果",
      unit: "g",
      unit_precision: 2,
      stock_quantity: 1500.0,
      min_stock_alert: 200.0,
      reorder_point: 300.0,
      reorder_qty: 1500.0,
      lot_tracking: false,
      expiry_tracking: false,
      lead_time_days: 4,
      is_active: true,
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-08-01T10:00:00Z"
    },
    {
      merchant_id: 1,
      material_id: 105,
      sku: "MAT-105",
      name: "蛋糕粉",
      unit: "g",
      unit_precision: 2,
      stock_quantity: 1000.0,
      min_stock_alert: 100.0,
      reorder_point: 200.0,
      reorder_qty: 1000.0,
      lot_tracking: false,
      expiry_tracking: false,
      lead_time_days: 7,
      is_active: true,
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-08-01T10:00:00Z"
    },
    {
      merchant_id: 1,
      material_id: 106,
      sku: "MAT-106",
      name: "抹茶粉",
      unit: "g",
      unit_precision: 2,
      stock_quantity: 800.0,
      min_stock_alert: 80.0,
      reorder_point: 150.0,
      reorder_qty: 600.0,
      lot_tracking: false,
      expiry_tracking: false,
      lead_time_days: 10,
      is_active: true,
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-08-01T10:00:00Z"
    },
    {
      merchant_id: 1,
      material_id: 107,
      sku: "MAT-107",
      name: "鮮奶油",
      unit: "ml",
      unit_precision: 0,
      stock_quantity: 3000.0,
      min_stock_alert: 300.0,
      reorder_point: 500.0,
      reorder_qty: 1500.0,
      lot_tracking: false,
      expiry_tracking: false,
      lead_time_days: 2,
      is_active: true,
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-08-01T10:00:00Z"
    },
    {
      merchant_id: 1,
      material_id: 108,
      sku: "MAT-108",
      name: "巧克力醬",
      unit: "g",
      unit_precision: 2,
      stock_quantity: 1200.0,
      min_stock_alert: 120.0,
      reorder_point: 200.0,
      reorder_qty: 800.0,
      lot_tracking: false,
      expiry_tracking: false,
      lead_time_days: 6,
      is_active: false,
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-08-01T10:00:00Z"
    }
  ],
  movements: [
    {
      merchant_id: 1,
      movement_id: 1,
      material_id: 101,
      movement_type: "PURCHASE_RECEIPT",
      quantity: 5000.0,
      unit_cost: 80.0,
      reference_type: "PO",
      reference_id: "1",
      batch_no: null,
      expiry_date: null,
      note: "首次進貨",
      created_by: "system",
      created_at: "2025-07-01T08:00:00Z"
    },
    {
      merchant_id: 1,
      movement_id: 2,
      material_id: 102,
      movement_type: "PURCHASE_RECEIPT",
      quantity: 20000.0,
      unit_cost: 30.0,
      reference_type: "PO",
      reference_id: "2",
      batch_no: null,
      expiry_date: null,
      note: "首次進貨",
      created_by: "system",
      created_at: "2025-07-01T08:00:00Z"
    },
    {
      merchant_id: 1,
      movement_id: 3,
      material_id: 103,
      movement_type: "PURCHASE_RECEIPT",
      quantity: 3000.0,
      unit_cost: 50.0,
      reference_type: "PO",
      reference_id: "3",
      batch_no: null,
      expiry_date: null,
      note: "首次進貨",
      created_by: "system",
      created_at: "2025-07-01T08:00:00Z"
    },
    {
      merchant_id: 1,
      movement_id: 4,
      material_id: 104,
      movement_type: "PURCHASE_RECEIPT",
      quantity: 1500.0,
      unit_cost: 40.0,
      reference_type: "PO",
      reference_id: "4",
      batch_no: null,
      expiry_date: null,
      note: "首次進貨",
      created_by: "system",
      created_at: "2025-07-01T08:00:00Z"
    },
    {
      merchant_id: 1,
      movement_id: 5,
      material_id: 105,
      movement_type: "PURCHASE_RECEIPT",
      quantity: 1000.0,
      unit_cost: 60.0,
      reference_type: "PO",
      reference_id: "5",
      batch_no: null,
      expiry_date: null,
      note: "首次進貨",
      created_by: "system",
      created_at: "2025-07-01T08:00:00Z"
    },
    {
      merchant_id: 1,
      movement_id: 6,
      material_id: 106,
      movement_type: "PURCHASE_RECEIPT",
      quantity: 800.0,
      unit_cost: 70.0,
      reference_type: "PO",
      reference_id: "6",
      batch_no: null,
      expiry_date: null,
      note: "首次進貨",
      created_by: "system",
      created_at: "2025-07-01T08:00:00Z"
    },
    {
      merchant_id: 1,
      movement_id: 7,
      material_id: 107,
      movement_type: "PURCHASE_RECEIPT",
      quantity: 3000.0,
      unit_cost: 90.0,
      reference_type: "PO",
      reference_id: "7",
      batch_no: null,
      expiry_date: null,
      note: "首次進貨",
      created_by: "system",
      created_at: "2025-07-01T08:00:00Z"
    },
    {
      merchant_id: 1,
      movement_id: 8,
      material_id: 108,
      movement_type: "PURCHASE_RECEIPT",
      quantity: 1200.0,
      unit_cost: 100.0,
      reference_type: "PO",
      reference_id: "8",
      batch_no: null,
      expiry_date: null,
      note: "首次進貨",
      created_by: "system",
      created_at: "2025-07-01T08:00:00Z"
    }
  ],
  purchase_orders: [
    {
      merchant_id: 1,
      purchase_id: 1,
      supplier_id: 1,
      supplier_name: "台灣茶葉公司",
      status: "RECEIVED",
      expected_date: "2025-07-02",
      currency: "TWD",
      totals: { subtotal: 400000, tax: 0, shipping: 0, discount: 0, total: 400000 },
      items: [ { material_id: 101, ordered_qty: 5000.0, received_qty: 5000.0, price: 80.0 } ],
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-07-01T09:00:00Z"
    },
    {
      merchant_id: 1,
      purchase_id: 2,
      supplier_id: 2,
      supplier_name: "牛奶大王",
      status: "RECEIVED",
      expected_date: "2025-07-02",
      currency: "TWD",
      totals: { subtotal: 600000, tax: 0, shipping: 0, discount: 0, total: 600000 },
      items: [ { material_id: 102, ordered_qty: 20000.0, received_qty: 20000.0, price: 30.0 } ],
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-07-01T09:00:00Z"
    },
    {
      merchant_id: 1,
      purchase_id: 3,
      supplier_id: 3,
      supplier_name: "珍珠工坊",
      status: "RECEIVED",
      expected_date: "2025-07-02",
      currency: "TWD",
      totals: { subtotal: 150000, tax: 0, shipping: 0, discount: 0, total: 150000 },
      items: [ { material_id: 103, ordered_qty: 3000.0, received_qty: 3000.0, price: 50.0 } ],
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-07-01T09:00:00Z"
    },
    {
      merchant_id: 1,
      purchase_id: 4,
      supplier_id: 4,
      supplier_name: "椰果供應商",
      status: "RECEIVED",
      expected_date: "2025-07-02",
      currency: "TWD",
      totals: { subtotal: 60000, tax: 0, shipping: 0, discount: 0, total: 60000 },
      items: [ { material_id: 104, ordered_qty: 1500.0, received_qty: 1500.0, price: 40.0 } ],
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-07-01T09:00:00Z"
    },
    {
      merchant_id: 1,
      purchase_id: 5,
      supplier_id: 5,
      supplier_name: "蛋糕原料商",
      status: "RECEIVED",
      expected_date: "2025-07-02",
      currency: "TWD",
      totals: { subtotal: 60000, tax: 0, shipping: 0, discount: 0, total: 60000 },
      items: [ { material_id: 105, ordered_qty: 1000.0, received_qty: 1000.0, price: 60.0 } ],
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-07-01T09:00:00Z"
    },
    {
      merchant_id: 1,
      purchase_id: 6,
      supplier_id: 6,
      supplier_name: "抹茶進口商",
      status: "RECEIVED",
      expected_date: "2025-07-02",
      currency: "TWD",
      totals: { subtotal: 56000, tax: 0, shipping: 0, discount: 0, total: 56000 },
      items: [ { material_id: 106, ordered_qty: 800.0, received_qty: 800.0, price: 70.0 } ],
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-07-01T09:00:00Z"
    },
    {
      merchant_id: 1,
      purchase_id: 7,
      supplier_id: 7,
      supplier_name: "鮮奶油供應商",
      status: "RECEIVED",
      expected_date: "2025-07-02",
      currency: "TWD",
      totals: { subtotal: 270000, tax: 0, shipping: 0, discount: 0, total: 270000 },
      items: [ { material_id: 107, ordered_qty: 3000.0, received_qty: 3000.0, price: 90.0 } ],
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-07-01T09:00:00Z"
    },
    {
      merchant_id: 1,
      purchase_id: 8,
      supplier_id: 8,
      supplier_name: "巧克力工廠",
      status: "RECEIVED",
      expected_date: "2025-07-02",
      currency: "TWD",
      totals: { subtotal: 120000, tax: 0, shipping: 0, discount: 0, total: 120000 },
      items: [ { material_id: 108, ordered_qty: 1200.0, received_qty: 1200.0, price: 100.0 } ],
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-07-01T09:00:00Z"
    }
  ],
  suppliers: [
    {
      supplier_id: 1,
      merchant_id: 1,
      name: "台灣茶葉公司",
      contact_name: "王小明",
      phone: "+886-2-1234-5678",
      email: "sales-tea@example.com",
      address: "台北市…",
      lead_time_days: 3,
      is_active: true,
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-07-15T12:00:00Z"
    },
    {
      supplier_id: 2,
      merchant_id: 1,
      name: "牛奶大王",
      contact_name: "李小牛",
      phone: "+886-3-222-0000",
      email: "milk@example.com",
      address: "新竹市…",
      lead_time_days: 2,
      is_active: true,
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-07-15T12:00:00Z"
    },
    {
      supplier_id: 3,
      merchant_id: 1,
      name: "珍珠工坊",
      contact_name: "陳阿珠",
      phone: "+886-4-456-7890",
      email: "boba@example.com",
      address: "台中市…",
      lead_time_days: 5,
      is_active: true,
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-07-15T12:00:00Z"
    },
    {
      supplier_id: 4,
      merchant_id: 1,
      name: "椰果供應商",
      contact_name: "張椰果",
      phone: "+886-7-000-1111",
      email: "nata@example.com",
      address: "高雄市…",
      lead_time_days: 4,
      is_active: true,
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-07-15T12:00:00Z"
    },
    {
      supplier_id: 5,
      merchant_id: 1,
      name: "蛋糕原料商",
      contact_name: "黃蛋糕",
      phone: "+886-2-333-4444",
      email: "cake@example.com",
      address: "台北市…",
      lead_time_days: 7,
      is_active: true,
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-07-15T12:00:00Z"
    },
    {
      supplier_id: 6,
      merchant_id: 1,
      name: "抹茶進口商",
      contact_name: "綠抹茶",
      phone: "+886-2-555-6666",
      email: "matcha@example.com",
      address: "台北市…",
      lead_time_days: 10,
      is_active: true,
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-07-15T12:00:00Z"
    },
    {
      supplier_id: 7,
      merchant_id: 1,
      name: "鮮奶油供應商",
      contact_name: "白奶油",
      phone: "+886-6-123-4567",
      email: "cream@example.com",
      address: "台南市…",
      lead_time_days: 2,
      is_active: true,
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-07-15T12:00:00Z"
    },
    {
      supplier_id: 8,
      merchant_id: 1,
      name: "巧克力工廠",
      contact_name: "黑可可",
      phone: "+886-8-999-8888",
      email: "choco@example.com",
      address: "屏東縣…",
      lead_time_days: 6,
      is_active: false,
      created_at: "2025-07-01T08:00:00Z",
      updated_at: "2025-07-15T12:00:00Z"
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