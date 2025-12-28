/**
 * Store Create Handler
 * POST /api/v1/stores
 * 
 * Creates a new store (MERCHANT role required)
 * 
 * Environment Variables:
 * - DATABASE_URL: PostgreSQL connection string
 * - REDIS_URL: Redis connection string (for cache invalidation)
 * - EVENT_BUS_NAME: EventBridge event bus name
 */

import postgres from 'postgres';
import Redis from 'ioredis';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

// Cache connections
let sql;
let redis;
const eventBridgeClient = new EventBridgeClient({ region: 'us-west-2' });

const CACHE_PREFIX = 'store:';

/**
 * Initialize database connection
 */
function getDatabase() {
  if (!sql) {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    sql = postgres(dbUrl, { 
      max: 1,
      ssl: 'require'
    });
  }
  return sql;
}

/**
 * Initialize Redis connection
 */
function getRedis() {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      redis = new Redis(redisUrl);
    }
  }
  return redis;
}

/**
 * Validate store data
 */
function validateStoreData(data) {
  const errors = [];
  
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Store name is required');
  }
  
  if (!data.slug || typeof data.slug !== 'string' || !/^[a-z0-9-]+$/.test(data.slug)) {
    errors.push('Valid slug is required (lowercase letters, numbers, hyphens only)');
  }
  
  if (!data.phone || typeof data.phone !== 'string') {
    errors.push('Phone number is required');
  }
  
  if (!data.address || typeof data.address !== 'object') {
    errors.push('Address is required');
  } else {
    if (!data.address.street || !data.address.city || !data.address.postalCode) {
      errors.push('Complete address (street, city, postalCode) is required');
    }
  }
  
  if (!data.businessHours || typeof data.businessHours !== 'object') {
    errors.push('Business hours are required');
  }
  
  return errors;
}

/**
 * Check authorization
 */
function checkAuthorization(event) {
  const authorizer = event.requestContext?.authorizer;
  
  if (!authorizer || !authorizer.principalId) {
    return { authorized: false, error: 'Unauthorized - No authentication' };
  }
  
  const globalRole = authorizer.globalRole;
  
  // Only MERCHANT and ADMIN can create stores
  if (!['MERCHANT', 'ADMIN'].includes(globalRole)) {
    return { 
      authorized: false, 
      error: `Forbidden - Requires MERCHANT or ADMIN role, got ${globalRole}` 
    };
  }
  
  return { 
    authorized: true, 
    userId: authorizer.principalId,
    globalRole 
  };
}

/**
 * Create store in database
 */
async function createStore(data, userId) {
  const db = getDatabase();
  
  const result = await sql`
    INSERT INTO stores (
      name,
      slug,
      description,
      "logoUrl",
      "bannerUrl",
      address,
      phone,
      email,
      "businessHours",
      "deliveryZones",
      "isOpen",
      "acceptingOrders",
      "createdAt",
      "updatedAt"
    ) VALUES (
      ${data.name},
      ${data.slug},
      ${data.description || null},
      ${data.logoUrl || null},
      ${data.bannerUrl || null},
      ${JSON.stringify(data.address)}::jsonb,
      ${data.phone},
      ${data.email || null},
      ${JSON.stringify(data.businessHours)}::jsonb,
      ${data.deliveryZones ? JSON.stringify(data.deliveryZones) : null}::jsonb,
      ${data.isOpen !== undefined ? data.isOpen : true},
      ${data.acceptingOrders !== undefined ? data.acceptingOrders : true},
      NOW(),
      NOW()
    )
    RETURNING 
      id,
      name,
      slug,
      description,
      "logoUrl",
      "bannerUrl",
      address,
      phone,
      email,
      "businessHours",
      "deliveryZones",
      "isOpen",
      "acceptingOrders",
      "createdAt",
      "updatedAt"
  `;
  
  return result[0];
}

/**
 * Publish Store.Created event
 */
async function publishStoreCreatedEvent(store, userId) {
  const eventBusName = process.env.EVENT_BUS_NAME || 'myordering-event-bus';
  
  const event = {
    Time: new Date(),
    Source: 'myordering.store',
    DetailType: 'Store.Created',
    Detail: JSON.stringify({
      storeId: store.id,
      name: store.name,
      slug: store.slug,
      createdBy: userId,
      timestamp: new Date().toISOString()
    }),
    EventBusName: eventBusName
  };
  
  try {
    const command = new PutEventsCommand({
      Entries: [event]
    });
    
    const response = await eventBridgeClient.send(command);
    
    if (response.FailedEntryCount > 0) {
      console.error('Failed to publish Store.Created event:', response.Entries);
    } else {
      console.log('Store.Created event published successfully');
    }
  } catch (error) {
    console.error('EventBridge error (non-critical):', error.message);
  }
}

/**
 * Lambda handler
 */
export const handler = async (event) => {
  console.log('Store Create Handler - Event:', JSON.stringify(event, null, 2));
  
  try {
    // Check authorization
    const authCheck = checkAuthorization(event);
    if (!authCheck.authorized) {
      return {
        statusCode: authCheck.error.startsWith('Forbidden') ? 403 : 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: authCheck.error
        })
      };
    }
    
    // Parse request body
    let data;
    try {
      data = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (error) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Invalid JSON in request body'
        })
      };
    }
    
    // Validate data
    const validationErrors = validateStoreData(data);
    if (validationErrors.length > 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Validation failed',
          details: validationErrors
        })
      };
    }
    
    // Create store
    const store = await createStore(data, authCheck.userId);
    
    console.log('Store created:', store.id);
    
    // Publish event (non-blocking)
    publishStoreCreatedEvent(store, authCheck.userId).catch(err => 
      console.error('Failed to publish event:', err)
    );
    
    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Location': `/api/v1/stores/${store.id}`
      },
      body: JSON.stringify(store)
    };
    
  } catch (error) {
    console.error('Store Create Handler Error:', error);
    
    // Handle unique constraint violation (duplicate slug)
    if (error.code === '23505') {
      return {
        statusCode: 409,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Store slug already exists',
          message: 'A store with this slug already exists. Please choose a different slug.'
        })
      };
    }
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
