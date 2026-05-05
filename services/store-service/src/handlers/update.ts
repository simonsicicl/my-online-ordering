import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { eq } from 'drizzle-orm';
import { getDb } from '../lib/db';
import { getRedis } from '../lib/redis';
import { stores } from '../db/schema';
import { successResponse, errorResponse } from '../lib/response';
import { validateBody } from '../lib/validation';
import { AppError } from '../lib/errors';
import { publishEvent } from '../lib/eventbridge';
import { updateStoreRequestSchema } from '@myordering/shared-types';
import type { AuthTokenContext } from '@myordering/shared-types';
import { UserRole } from '@myordering/shared-types';

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthTokenContext> = async (event) => {
  try {
    const { role, userId } = event.requestContext.authorizer.lambda;

    if (role !== UserRole.MANAGER && role !== UserRole.MERCHANT && role !== UserRole.ADMIN) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions to update store', 403);
    }

    const storeId = event.pathParameters?.storeId;
    if (!storeId) {
      throw new AppError('VALIDATION_ERROR', 'Missing storeId', 400);
    }

    const body = validateBody(event.body, updateStoreRequestSchema);

    // Build only provided fields — never pass undefined to Drizzle
    const updates: Partial<typeof stores.$inferInsert> = { updatedAt: new Date() };
    if (body.name          !== undefined) updates.name          = body.name;
    if (body.description   !== undefined) updates.description   = body.description;
    if (body.address       !== undefined) updates.address       = body.address;
    if (body.phone         !== undefined) updates.phone         = body.phone;
    if (body.email         !== undefined) updates.email         = body.email;
    if (body.businessHours !== undefined) updates.businessHours = body.businessHours;
    if (body.imageUrl      !== undefined) updates.imageUrl      = body.imageUrl;

    const db = getDb();
    const [updated] = await db
      .update(stores)
      .set(updates)
      .where(eq(stores.id, storeId))
      .returning();

    if (!updated) {
      throw new AppError('NOT_FOUND', 'Store not found', 404);
    }

    // Invalidate Redis cache
    const redis = await getRedis();
    await redis.del(`store:${storeId}`);

    await publishEvent('Store.Updated', { storeId, updatedBy: userId });

    console.log(JSON.stringify({ level: 'info', message: 'store updated', storeId, userId }));
    return successResponse(updated);

  } catch (error) {
    return errorResponse(error);
  }
};
