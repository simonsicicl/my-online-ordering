/**
 * Store Get Handler
 * GET /api/v1/stores/:id
 * 
 * Retrieves store information with Redis caching (10-minute TTL)
 * 
 * Environment Variables:
 * - DATABASE_URL: PostgreSQL connection string
 * - REDIS_URL: Redis connection string
 */

import postgres from 'postgres';
import Redis from 'ioredis';

// Cache connections for warm Lambda instances
let sql;
let redis;

const CACHE_TTL = 600; // 10 minutes
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
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is required');
    }
    redis = new Redis(redisUrl);
  }
  return redis;
}

/**
 * Get store from cache
 */
async function getStoreFromCache(storeId) {
  try {
    const cache = getRedis();
    const cached = await cache.get(`${CACHE_PREFIX}${storeId}`);
    
    if (cached) {
      console.log('Cache hit for store:', storeId);
      return JSON.parse(cached);
    }
    
    console.log('Cache miss for store:', storeId);
    return null;
  } catch (error) {
    console.error('Redis error (non-critical):', error.message);
    return null; // Fail gracefully, proceed to database query
  }
}

/**
 * Cache store data
 */
async function cacheStore(storeId, storeData) {
  try {
    const cache = getRedis();
    await cache.setex(
      `${CACHE_PREFIX}${storeId}`,
      CACHE_TTL,
      JSON.stringify(storeData)
    );
    console.log('Store cached:', storeId);
  } catch (error) {
    console.error('Failed to cache store (non-critical):', error.message);
  }
}

/**
 * Get store from database
 */
async function getStoreFromDatabase(storeId) {
  const db = getDatabase();
  
  const result = await sql`
    SELECT 
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
    FROM stores
    WHERE id = ${storeId}::uuid
    LIMIT 1
  `;
  
  if (result.length === 0) {
    return null;
  }
  
  return result[0];
}

/**
 * Lambda handler
 */
export const handler = async (event) => {
  console.log('Store Get Handler - Event:', JSON.stringify(event, null, 2));
  
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
    
    // Try cache first
    let store = await getStoreFromCache(storeId);
    
    // If not in cache, query database
    if (!store) {
      store = await getStoreFromDatabase(storeId);
      
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
      
      // Cache the result
      await cacheStore(storeId, store);
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300' // 5 minutes browser cache
      },
      body: JSON.stringify(store)
    };
    
  } catch (error) {
    console.error('Store Get Handler Error:', error);
    
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
