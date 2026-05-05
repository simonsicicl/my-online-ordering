import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  NotAuthorizedException,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';
import { eq } from 'drizzle-orm';
import { config } from '../lib/config';
import { getDb } from '../lib/db';
import { users } from '../db/schema';
import { successResponse, errorResponse } from '../lib/response';
import { validateBody } from '../lib/validation';
import { AppError } from '../lib/errors';
import { loginRequestSchema, type LoginResponse, UserRole } from '@myordering/shared-types';

const cognito = new CognitoIdentityProviderClient({ region: config.cognitoRegion });

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = validateBody(event.body, loginRequestSchema);

    let authResult;
    try {
      const result = await cognito.send(new InitiateAuthCommand({
        AuthFlow:       'USER_PASSWORD_AUTH',
        ClientId:       config.cognitoClientId,
        AuthParameters: {
          USERNAME: body.email,
          PASSWORD: body.password,
        },
      }));
      authResult = result.AuthenticationResult;
    } catch (err) {
      if (err instanceof NotAuthorizedException || err instanceof UserNotFoundException) {
        throw new AppError('UNAUTHORIZED', 'Invalid email or password', 401);
      }
      throw err;
    }

    if (!authResult?.AccessToken || !authResult.IdToken || !authResult.RefreshToken) {
      throw new AppError('INTERNAL_ERROR', 'Authentication failed', 500);
    }

    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);

    if (!user) {
      throw new AppError('NOT_FOUND', 'User not found', 404);
    }

    const response: LoginResponse = {
      accessToken:  authResult.AccessToken,
      idToken:      authResult.IdToken,
      refreshToken: authResult.RefreshToken,
      expiresIn:    authResult.ExpiresIn ?? 3600,
      tokenType:    (authResult.TokenType ?? 'Bearer') as 'Bearer',
      user: {
        id:         user.id,
        email:      user.email,
        name:       user.name,
        globalRole: user.globalRole as UserRole,
      },
    };

    console.log(JSON.stringify({ level: 'info', message: 'user logged in', userId: user.id }));
    return successResponse(response);

  } catch (error) {
    return errorResponse(error);
  }
};
