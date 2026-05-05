import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../lib/db';
import { getRedis } from '../lib/redis';
import { stores } from '../db/schema';
import { successResponse, errorResponse } from '../lib/response';
import { AppError } from '../lib/errors';

const CACHE_TTL_SECONDS = 600; // 10 minutes

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const storeId = event.pathParameters?.storeId;
    if (!storeId) {
      throw new AppError('VALIDATION_ERROR', 'Missing storeId', 400);
    }

    // 1. Check Redis cache
    const redis     = await getRedis();
    const cacheKey  = `store:${storeId}`;
    const cached    = await redis.get(cacheKey);
    if (cached) {
      return successResponse(JSON.parse(cached));
    }

    // 2. Fetch from DB
    const db = getDb();
    const [store] = await db
      .select()
      .from(stores)
      .where(and(eq(stores.id, storeId), eq(stores.isOpen, true)))
      .limit(1);

    if (!store) {
      throw new AppError('NOT_FOUND', 'Store not found', 404);
    }

    // 3. Populate cache
    await redis.setEx(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(store));

    console.log(JSON.stringify({ level: 'info', message: 'store fetched', storeId }));
    return successResponse(store);

  } catch (error) {
    return errorResponse(error);
  }
};
