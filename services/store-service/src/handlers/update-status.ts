import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../lib/db';
import { getRedis } from '../lib/redis';
import { stores, storeStaff } from '../db/schema';
import { successResponse, errorResponse } from '../lib/response';
import { validateBody } from '../lib/validation';
import { AppError } from '../lib/errors';
import { publishEvent } from '../lib/eventbridge';
import { updateStoreStatusRequestSchema } from '@myordering/shared-types';
import type { AuthTokenContext } from '@myordering/shared-types';
import { UserRole } from '@myordering/shared-types';

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthTokenContext> = async (event) => {
  try {
    const { role, userId } = event.requestContext.authorizer.lambda;

    if (role !== UserRole.MANAGER && role !== UserRole.MERCHANT && role !== UserRole.ADMIN) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions to update store status', 403);
    }

    const storeId = event.pathParameters?.storeId;
    if (!storeId) {
      throw new AppError('VALIDATION_ERROR', 'Missing storeId', 400);
    }

    // MANAGERs must be active staff of this store
    if (role === UserRole.MANAGER) {
      const db = getDb();
      const [staffRecord] = await db
        .select({ id: storeStaff.id })
        .from(storeStaff)
        .where(
          and(
            eq(storeStaff.storeId, storeId),
            eq(storeStaff.userId, userId),
            eq(storeStaff.isActive, true),
          ),
        )
        .limit(1);

      if (!staffRecord) {
        throw new AppError('FORBIDDEN', 'You do not have access to this store', 403);
      }
    }

    const body = validateBody(event.body, updateStoreStatusRequestSchema);

    const db = getDb();
    const [updated] = await db
      .update(stores)
      .set({ acceptingOrders: body.acceptingOrders, updatedAt: new Date() })
      .where(eq(stores.id, storeId))
      .returning({
        id:              stores.id,
        acceptingOrders: stores.acceptingOrders,
        updatedAt:       stores.updatedAt,
      });

    if (!updated) {
      throw new AppError('NOT_FOUND', 'Store not found', 404);
    }

    // Invalidate Redis cache
    const redis = await getRedis();
    await redis.del(`store:${storeId}`);

    await publishEvent('Store.StatusChanged', {
      storeId,
      acceptingOrders: body.acceptingOrders,
      reason:          body.reason ?? null,
      changedBy:       userId,
    });

    console.log(JSON.stringify({
      level:           'info',
      message:         'store status updated',
      storeId,
      acceptingOrders: body.acceptingOrders,
      userId,
    }));
    return successResponse(updated);

  } catch (error) {
    return errorResponse(error);
  }
};
