import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider';
import { config } from '../lib/config';
import { successResponse, errorResponse } from '../lib/response';
import { validateBody } from '../lib/validation';
import { AppError } from '../lib/errors';
import { registerRequestSchema, type RegisterResponse } from '@myordering/shared-types';

const cognito = new CognitoIdentityProviderClient({ region: config.cognitoRegion });

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = validateBody(event.body, registerRequestSchema);

    try {
      const result = await cognito.send(new SignUpCommand({
        ClientId: config.cognitoClientId,
        Username: body.email,
        Password: body.password,
        UserAttributes: [
          { Name: 'email', Value: body.email },
          { Name: 'name',  Value: body.name },
          ...(body.phone ? [{ Name: 'phone_number', Value: body.phone }] : []),
        ],
      }));

      const response: RegisterResponse = {
        userId:        result.UserSub ?? '',
        email:         body.email,
        name:          body.name,
        emailVerified: result.UserConfirmed ?? false,
      };

      console.log(JSON.stringify({ level: 'info', message: 'user registered', email: body.email }));
      return successResponse(response, 201);

    } catch (err) {
      if (err instanceof UsernameExistsException) {
        throw new AppError('CONFLICT', 'An account with this email already exists', 409);
      }
      throw err;
    }
  } catch (error) {
    return errorResponse(error);
  }
};
