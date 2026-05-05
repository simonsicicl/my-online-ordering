import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  GlobalSignOutCommand,
  NotAuthorizedException,
} from '@aws-sdk/client-cognito-identity-provider';
import { config } from '../lib/config';
import { successResponse, errorResponse } from '../lib/response';
import { AppError } from '../lib/errors';

const cognito = new CognitoIdentityProviderClient({ region: config.cognitoRegion });

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const authHeader = event.headers?.['authorization'] ?? event.headers?.['Authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('UNAUTHORIZED', 'Missing or invalid Authorization header', 401);
    }

    const accessToken = authHeader.slice(7);

    try {
      await cognito.send(new GlobalSignOutCommand({ AccessToken: accessToken }));
    } catch (err) {
      if (err instanceof NotAuthorizedException) {
        throw new AppError('UNAUTHORIZED', 'Invalid or expired access token', 401);
      }
      throw err;
    }

    console.log(JSON.stringify({ level: 'info', message: 'user logged out' }));
    return successResponse({ message: 'Logged out successfully' });

  } catch (error) {
    return errorResponse(error);
  }
};
