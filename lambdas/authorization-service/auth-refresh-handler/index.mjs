/**
 * Auth Refresh Handler
 * Handles JWT token refresh via AWS Cognito
 */

import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-west-2' });

const CLIENT_ID = process.env.COGNITO_CLIENT_ID;

/**
 * Main Lambda handler
 * POST /api/v1/auth/refresh
 */
export const handler = async (event) => {
  console.log('Auth Refresh Handler - Event:', JSON.stringify(event, null, 2));

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { refreshToken } = body;

    // Validate required field
    if (!refreshToken) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Refresh token is required',
          },
          timestamp: new Date().toISOString(),
        }),
      };
    }

    // Initiate refresh token auth flow
    const authCommand = new InitiateAuthCommand({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    });

    const authResult = await cognitoClient.send(authCommand);

    // Extract new tokens
    const tokens = authResult.AuthenticationResult;

    console.log('Token refreshed successfully');

    // Return success response with new access token
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: {
          accessToken: tokens.AccessToken,
          idToken: tokens.IdToken,
          expiresIn: tokens.ExpiresIn,
          tokenType: tokens.TokenType || 'Bearer',
        },
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Refresh token error:', error);

    // Handle specific Cognito errors
    if (error.name === 'NotAuthorizedException') {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired refresh token',
          },
          timestamp: new Date().toISOString(),
        }),
      };
    }

    if (error.name === 'TooManyRequestsException') {
      return {
        statusCode: 429,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Retry-After': '60',
        },
        body: JSON.stringify({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
          },
          timestamp: new Date().toISOString(),
        }),
      };
    }

    // Generic error
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to refresh token',
          details: error.message,
        },
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
