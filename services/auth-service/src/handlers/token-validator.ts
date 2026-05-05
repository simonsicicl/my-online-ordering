import type { APIGatewayRequestSimpleAuthorizerHandlerV2WithContext } from 'aws-lambda';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { config } from '../lib/config';
import { UserRole, type AuthTokenContext } from '@myordering/shared-types';

// Module-scope JWKS cache — refreshed only on cold start
const JWKS = createRemoteJWKSet(
  new URL(`https://cognito-idp.${config.cognitoRegion}.amazonaws.com/${config.cognitoUserPoolId}/.well-known/jwks.json`),
);

export const handler: APIGatewayRequestSimpleAuthorizerHandlerV2WithContext<AuthTokenContext> = async (event) => {
  const authHeader = event.headers?.authorization ?? event.headers?.Authorization ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return { isAuthorized: false, context: { userId: '', email: '', role: UserRole.USER } };
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer:   `https://cognito-idp.${config.cognitoRegion}.amazonaws.com/${config.cognitoUserPoolId}`,
      audience: config.cognitoClientId,
    });

    const userId    = payload.sub ?? '';
    const email     = (payload['email'] as string) ?? '';
    const roleStr   = (payload['custom:globalRole'] as string) ?? 'USER';
    const role      = Object.values(UserRole).includes(roleStr as UserRole)
      ? (roleStr as UserRole)
      : UserRole.USER;

    console.log(JSON.stringify({ level: 'info', message: 'token validated', userId, role }));

    return {
      isAuthorized: true,
      context:      { userId, email, role },
    };
  } catch (err) {
    console.log(JSON.stringify({ level: 'warn', message: 'token validation failed', error: String(err) }));
    return { isAuthorized: false, context: { userId: '', email: '', role: UserRole.USER } };
  }
};
