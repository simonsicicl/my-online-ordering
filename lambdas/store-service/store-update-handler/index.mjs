/**
 * Store Update Handler
 * PATCH /api/v1/stores/:id
 * 
 * Updates store information (MANAGER+ role required)
 * Invalidates Redis cache on update
 * 
 * Environment Variables:
 * - DATABASE_URL: PostgreSQL connection string
 * - REDIS_URL: Redis connection string
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
 * Check authorization
 */
function checkAuthorization(event) {
  const authorizer = event.requestContext?.authorizer;
  
  if (!authorizer || !authorizer.principalId) {
    return { authorized: false, error: 'Unauthorized - No authentication' };
  }
  
  const globalRole = authorizer.globalRole;
  
  // MANAGER, MERCHANT, and ADMIN can update stores
  if (!['MANAGER', 'MERCHANT', 'ADMIN'].includes(globalRole)) {
    return { 
      authorized: false, 
      error: `Forbidden - Requires MANAGER+ role, got ${globalRole}` 
    };
  }
  
  return { 
    authorized: true, 
    userId: authorizer.principalId,
    globalRole 
  };
}

/**
 * Build UPDATE query dynamically based on provided fields
 */
function buildUpdateQuery(storeId, updates) {
  const setStatements = [];
  const values = [];
  
  // Allowed fields to update
  const allowedFields = {
    name: 'text',
    description: 'text',
    logoUrl: 'text',
    bannerUrl: 'text',
    address: 'jsonb',
    phone: 'text',
    email: 'text',
    businessHours: 'jsonb',
    deliveryZones: 'jsonb',
    isOpen: 'boolean',
    acceptingOrders: 'boolean'
  };
  
  let paramIndex = 1;
  
  for (const [field, type] of Object.entries(allowedFields)) {
    if (updates.hasOwnProperty(field)) {
      const dbField = `"${field}"`;
      
      if (type === 'jsonb') {
        setStatements.push(`${dbField} = $${paramIndex}::jsonb`);
        values.push(JSON.stringify(updates[field]));
      } else if (type === 'boolean') {
        setStatements.push(`${dbField} = $${paramIndex}::boolean`);
        values.push(updates[field]);
      } else {
        setStatements.push(`${dbField} = $${paramIndex}`);
        values.push(updates[field]);
      }
      
      paramIndex++;
    }
  }
  
  if (setStatements.length === 0) {
    return null; // No valid fields to update
  }
  
  // Always update updatedAt
  setStatements.push(`"updatedAt" = NOW()`);
  
  return {
    setStatements,
    values,
    paramIndex
  };
}

/**
 * Update store in database
 */
async function updateStore(storeId, updates) {
  const db = getDatabase();
  
  const queryParts = buildUpdateQuery(storeId, updates);
  
  if (!queryParts) {
    throw new Error('No valid fields to update');
  }
  
  const { setStatements, values } = queryParts;
  
  // Build the SQL query
  const query = `
    UPDATE stores 
    SET ${setStatements.join(', ')}
    WHERE id = $${values.length + 1}::uuid
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
  
  const result = await sql.unsafe(query, [...values, storeId]);
  
  if (result.length === 0) {
    return null; // Store not found
  }
  
  return result[0];
}

/**
 * Invalidate cache
 */
async function invalidateCache(storeId) {
  try {
    const cache = getRedis();
    if (cache) {
      await cache.del(`${CACHE_PREFIX}${storeId}`);
      console.log('Cache invalidated for store:', storeId);
    }
  } catch (error) {
    console.error('Failed to invalidate cache (non-critical):', error.message);
  }
}

/**
 * Publish Store.Updated event
 */
async function publishStoreUpdatedEvent(store, userId, updatedFields) {
  const eventBusName = process.env.EVENT_BUS_NAME || 'myordering-event-bus';
  
  const event = {
    Time: new Date(),
    Source: 'myordering.store',
    DetailType: 'Store.Updated',
    Detail: JSON.stringify({
      storeId: store.id,
      name: store.name,
      slug: store.slug,
      updatedBy: userId,
      updatedFields: Object.keys(updatedFields),
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
      console.error('Failed to publish Store.Updated event:', response.Entries);
    } else {
      console.log('Store.Updated event published successfully');
    }
  } catch (error) {
    console.error('EventBridge error (non-critical):', error.message);
  }
}

/**
 * Lambda handler
 */
export const handler = async (event) => {
  console.log('Store Update Handler - Event:', JSON.stringify(event, null, 2));
  
  try {
    // Extract store ID from path parameters
    const storeId = event.pathParameters?.id;
    
    if (!storeId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Store ID is required'
        })
      };
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(storeId)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Invalid store ID format'
        })
      };
    }
    
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
    let updates;
    try {
      updates = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
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
    
    // Validate that updates object is not empty
    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Request body cannot be empty'
        })
      };
    }
    
    // Update store
    const store = await updateStore(storeId, updates);
    
    if (!store) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Store not found'
        })
      };
    }
    
    console.log('Store updated:', store.id);
    
    // Invalidate cache
    await invalidateCache(storeId);
    
    // Publish event (non-blocking)
    publishStoreUpdatedEvent(store, authCheck.userId, updates).catch(err => 
      console.error('Failed to publish event:', err)
    );
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(store)
    };
    
  } catch (error) {
    console.error('Store Update Handler Error:', error);
    
    // Handle specific errors
    if (error.message === 'No valid fields to update') {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'No valid fields to update',
          message: 'Request body must contain at least one valid field to update'
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
