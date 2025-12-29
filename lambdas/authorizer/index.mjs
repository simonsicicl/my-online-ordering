/**
 * Lambda Authorizer for API Gateway
 * Validates JWT tokens from Cognito and returns IAM policy
 */

import { CognitoJwtVerifier } from 'aws-jwt-verify';

// Initialize Cognito JWT verifier
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  clientId: process.env.COGNITO_CLIENT_ID,
  tokenUse: 'access', // Verify access tokens
});

/**
 * Main Lambda authorizer handler
 * @param {Object} event - API Gateway authorizer event
 * @returns {Object} IAM policy document
 */
export const handler = async (event) => {
  console.log('Authorizer - Event:', JSON.stringify(event, null, 2));

  try {
    // Extract token from Authorization header
    const token = extractToken(event);
    if (!token) {
      console.error('No token provided');
      throw new Error('Unauthorized');
    }

    // Verify JWT token with Cognito
    const payload = await verifier.verify(token);
    console.log('Token verified for user:', payload.sub);

    // Extract user information from token
    const userId = payload.sub;
    const email = payload.email;
    const globalRole = payload['custom:globalRole'] || 'USER';

    // Generate allow policy
    const policy = generatePolicy(userId, 'Allow', event.routeArn, {
      principalId: userId,
      email,
      globalRole,
    });

    console.log('Authorization successful for user:', userId);
    return policy;
  } catch (error) {
    console.error('Authorization failed:', error.message);
    
    // Return deny policy on any error
    throw new Error('Unauthorized');
  }
};

/**
 * Extract JWT token from Authorization header
 * Supports "Bearer <token>" format
 */
function extractToken(event) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  
  if (!authHeader) {
    return null;
  }

  // Handle "Bearer <token>" format
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }

  // Handle raw token
  return authHeader;
}

/**
 * Generate IAM policy document
 * @param {string} principalId - User identifier
 * @param {string} effect - Allow or Deny
 * @param {string} resource - ARN of the API Gateway route
 * @param {Object} context - Additional context to pass to Lambda
 */
function generatePolicy(principalId, effect, resource, context = {}) {
  const policy = {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context: {
      // These will be available in Lambda as event.requestContext.authorizer
      principalId: context.principalId || principalId,
      email: context.email || '',
      globalRole: context.globalRole || 'USER',
    },
  };

  return policy;
}
