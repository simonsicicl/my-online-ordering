// Never hardcode values here — always read from process.env
export const config = {
  appEnv:           process.env.APP_ENV               ?? 'dev',
  dbHost:           process.env.DATABASE_HOST          ?? '',
  dbPort:           parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  dbName:           process.env.DATABASE_NAME          ?? '',
  dbUser:           process.env.DATABASE_USER          ?? '',
  dbPassword:       process.env.DATABASE_PASSWORD      ?? '',
  dbSsl:            process.env.DATABASE_SSL           === 'true',
  dbMaxConnections: parseInt(process.env.DB_MAX_CONNECTIONS ?? '10', 10),
  cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID  ?? '',
  cognitoClientId:   process.env.COGNITO_CLIENT_ID     ?? '',
  cognitoRegion:     process.env.COGNITO_REGION        ?? 'us-east-1',
} as const;
