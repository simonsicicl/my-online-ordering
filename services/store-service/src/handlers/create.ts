import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { getDb } from '../lib/db';
import { stores } from '../db/schema';
import { successResponse, errorResponse } from '../lib/response';
import { validateBody } from '../lib/validation';
import { AppError } from '../lib/errors';
import { publishEvent } from '../lib/eventbridge';
import { createStoreRequestSchema } from '@myordering/shared-types';
import type { AuthTokenContext } from '@myordering/shared-types';
import { UserRole } from '@myordering/shared-types';

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthTokenContext> = async (event) => {
  try {
    const { role, userId } = event.requestContext.authorizer.lambda;

    if (role !== UserRole.MERCHANT && role !== UserRole.ADMIN) {
      throw new AppError('FORBIDDEN', 'Only Merchant or Admin can create stores', 403);
    }

    const body = validateBody(event.body, createStoreRequestSchema);

    const db = getDb();
    const [store] = await db
      .insert(stores)
      .values({
        name:          body.name,
        description:   body.description ?? null,
        address:       body.address,
        phone:         body.phone,
        email:         body.email,
        businessHours: body.businessHours,
      })
      .returning({ id: stores.id, name: stores.name, createdAt: stores.createdAt });

    await publishEvent('Store.Created', { storeId: store.id, name: store.name, createdBy: userId });

    console.log(JSON.stringify({ level: 'info', message: 'store created', storeId: store.id, userId }));
    return successResponse(store, 201);

  } catch (error) {
    return errorResponse(error);
  }
};
