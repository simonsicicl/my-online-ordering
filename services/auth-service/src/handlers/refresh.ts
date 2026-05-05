import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  NotAuthorizedException,
} from '@aws-sdk/client-cognito-identity-provider';
import { config } from '../lib/config';
import { successResponse, errorResponse } from '../lib/response';
import { validateBody } from '../lib/validation';
import { AppError } from '../lib/errors';
import { refreshRequestSchema } from '@myordering/shared-types';

const cognito = new CognitoIdentityProviderClient({ region: config.cognitoRegion });

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = validateBody(event.body, refreshRequestSchema);

    let authResult;
    try {
      const result = await cognito.send(new InitiateAuthCommand({
        AuthFlow:       'REFRESH_TOKEN_AUTH',
        ClientId:       config.cognitoClientId,
        AuthParameters: {
          REFRESH_TOKEN: body.refreshToken,
        },
      }));
      authResult = result.AuthenticationResult;
    } catch (err) {
      if (err instanceof NotAuthorizedException) {
        throw new AppError('UNAUTHORIZED', 'Invalid or expired refresh token', 401);
      }
      throw err;
    }

    if (!authResult?.AccessToken || !authResult.IdToken) {
      throw new AppError('INTERNAL_ERROR', 'Token refresh failed', 500);
    }

    return successResponse({
      accessToken: authResult.AccessToken,
      idToken:     authResult.IdToken,
      expiresIn:   authResult.ExpiresIn ?? 3600,
      tokenType:   authResult.TokenType ?? 'Bearer',
    });

  } catch (error) {
    return errorResponse(error);
  }
};
