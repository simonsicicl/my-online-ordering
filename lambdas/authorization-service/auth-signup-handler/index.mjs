/**
 * Auth Signup Handler
 * Handles user registration via AWS Cognito
 */

import { CognitoIdentityProviderClient, SignUpCommand } from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-west-2' });

const CLIENT_ID = process.env.COGNITO_CLIENT_ID;

/**
 * Main Lambda handler
 * POST /api/v1/auth/signup
 */
export const handler = async (event) => {
  console.log('Auth Signup Handler - Event:', JSON.stringify(event, null, 2));

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { email, password, name, phone } = body;

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

    // Validate password strength (basic check)
    if (password.length < 8) {
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
            message: 'Password must be at least 8 characters long',
          },
          timestamp: new Date().toISOString(),
        }),
      };
    }

    // Prepare user attributes
    const userAttributes = [
      { Name: 'email', Value: email },
    ];

    if (name) {
      userAttributes.push({ Name: 'name', Value: name });
    }

    if (phone) {
      userAttributes.push({ Name: 'phone_number', Value: phone });
    }

    // Set default role (USER)
    userAttributes.push({ Name: 'custom:globalRole', Value: 'USER' });

    // Sign up user in Cognito
    const signUpCommand = new SignUpCommand({
      ClientId: CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: userAttributes,
    });

    const signUpResult = await cognitoClient.send(signUpCommand);

    console.log('User signed up successfully:', signUpResult.UserSub);

    // Return success response
    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: {
          userId: signUpResult.UserSub,
          email,
          name: name || null,
          phone: phone || null,
          emailVerified: false,
          message: 'User registered successfully. Please check your email for verification code.',
        },
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Signup error:', error);

    // Handle specific Cognito errors
    if (error.name === 'UsernameExistsException') {
      return {
        statusCode: 409,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'User with this email already exists',
          },
          timestamp: new Date().toISOString(),
        }),
      };
    }

    if (error.name === 'InvalidPasswordException') {
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
            message: 'Password does not meet requirements',
            details: error.message,
          },
          timestamp: new Date().toISOString(),
        }),
      };
    }

    if (error.name === 'InvalidParameterException') {
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
            message: 'Invalid parameter',
            details: error.message,
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
          message: 'Failed to register user',
          details: error.message,
        },
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
