/**
 * API Gateway Lambda Authorizer
 * Validates Cognito JWT tokens and returns IAM policy for API Gateway
 * 
 * Environment Variables:
 * - COGNITO_USER_POOL_ID: Cognito User Pool ID
 * - DATABASE_URL: PostgreSQL connection string (optional, for role-based permissions)
 */

import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

// Initialize JWKS client for Cognito JWT verification
let jwksClientInstance;
let cognitoPoolId;

const ssmClient = new SSMClient({ region: 'us-west-2' });

/**
 * Get Cognito User Pool ID from SSM Parameter Store
 */
async function getCognitoPoolId() {
  if (cognitoPoolId) return cognitoPoolId;
  
  try {
    const response = await ssmClient.send(
      new GetParameterCommand({
        Name: '/myordering/dev/cognito-user-pool-id',
        WithDecryption: false
      })
    );
    cognitoPoolId = response.Parameter.Value;
    return cognitoPoolId;
  } catch (error) {
    console.error('Failed to get Cognito Pool ID from SSM:', error);
    throw error;
  }
}

/**
 * Initialize JWKS client for token verification
 */
async function getJwksClient() {
  if (jwksClientInstance) return jwksClientInstance;
  
  const poolId = await getCognitoPoolId();
  const region = poolId.split('_')[0]; // Extract region from pool ID
  
  jwksClientInstance = jwksClient({
    jwksUri: `https://cognito-idp.${region}.amazonaws.com/${poolId}/.well-known/jwks.json`,
    cache: true,
    cacheMaxAge: 600000, // 10 minutes
    rateLimit: true,
    jwksRequestsPerMinute: 10
  });
  
  return jwksClientInstance;
}

/**
 * Get signing key for JWT verification
 */
function getKey(header, callback) {
  getJwksClient().then(client => {
    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        callback(err);
        return;
      }
      const signingKey = key.publicKey || key.rsaPublicKey;
      callback(null, signingKey);
    });
  }).catch(callback);
}

/**
 * Verify JWT token
 */
async function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      algorithms: ['RS256']
    }, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });
}

/**
 * Generate IAM policy for API Gateway
 */
function generatePolicy(principalId, effect, resource, context = {}) {
  const authResponse = {
    principalId
  };

  if (effect && resource) {
    authResponse.policyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource
        }
      ]
    };
  }

  // Add user context to be available in downstream Lambda functions
  if (Object.keys(context).length > 0) {
    authResponse.context = context;
  }

  return authResponse;
}

/**
 * Lambda handler
 */
export async function handler(event) {
  console.log('Auth event:', JSON.stringify(event, null, 2));

  try {
    // Extract token from Authorization header
    const token = event.authorizationToken?.replace('Bearer ', '');
    
    if (!token) {
      console.error('No token provided');
      throw new Error('Unauthorized');
    }

    // Verify JWT token
    const decoded = await verifyToken(token);
    console.log('Token decoded:', JSON.stringify(decoded, null, 2));

    // Extract user information
    const userId = decoded.sub; // Cognito user ID (cognito_sub_id)
    const email = decoded.email;
    const groups = decoded['cognito:groups'] || [];
    
    // Determine global role (highest precedence)
    let globalRole = 'USER';
    const rolePrecedence = ['ADMIN', 'MERCHANT', 'MANAGER', 'LEAD', 'CASHIER', 'USER'];
    for (const role of rolePrecedence) {
      if (groups.includes(role)) {
        globalRole = role;
        break;
      }
    }

    // Generate Allow policy with user context
    const policy = generatePolicy(
      userId,
      'Allow',
      event.methodArn,
      {
        userId,
        email,
        globalRole,
        groups: groups.join(',')
      }
    );

    console.log('Generated policy:', JSON.stringify(policy, null, 2));
    return policy;

  } catch (error) {
    console.error('Authorization failed:', error);
    
    // Return Deny policy (API Gateway will return 403)
    throw new Error('Unauthorized');
  }
}
