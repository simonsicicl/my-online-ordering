/**
 * Auth Signin Handler
 * Handles user authentication via AWS Cognito
 */

import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-west-2' });

const CLIENT_ID = process.env.COGNITO_CLIENT_ID;

/**
 * Main Lambda handler
 * POST /api/v1/auth/signin
 */
export const handler = async (event) => {
  console.log('Auth Signin Handler - Event:', JSON.stringify(event, null, 2));

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
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
            message: 'Email and password are required',
          },
          timestamp: new Date().toISOString(),
        }),
      };
    }

    // Initiate auth flow with Cognito
    const authCommand = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const authResult = await cognitoClient.send(authCommand);

    // Check if challenge is required (e.g., MFA)
    if (authResult.ChallengeName) {
      console.log('Auth challenge required:', authResult.ChallengeName);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: true,
          data: {
            challengeName: authResult.ChallengeName,
            session: authResult.Session,
            challengeParameters: authResult.ChallengeParameters,
          },
          timestamp: new Date().toISOString(),
        }),
      };
    }

    // Extract tokens
    const tokens = authResult.AuthenticationResult;

    console.log('User signed in successfully');

    // Return success response with tokens
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
          refreshToken: tokens.RefreshToken,
          idToken: tokens.IdToken,
          expiresIn: tokens.ExpiresIn,
          tokenType: tokens.TokenType || 'Bearer',
        },
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Signin error:', error);

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
            message: 'Incorrect email or password',
          },
          timestamp: new Date().toISOString(),
        }),
      };
    }

    if (error.name === 'UserNotConfirmedException') {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'User email not verified. Please verify your email before signing in.',
          },
          timestamp: new Date().toISOString(),
        }),
      };
    }

    if (error.name === 'UserNotFoundException') {
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
            message: 'User not found',
          },
          timestamp: new Date().toISOString(),
        }),
      };
    }

    if (error.name === 'PasswordResetRequiredException') {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Password reset required',
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
            message: 'Too many failed login attempts. Please try again later.',
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
          message: 'Failed to sign in',
          details: error.message,
        },
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
