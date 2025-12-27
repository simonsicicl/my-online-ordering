/**
 * Cognito Pre-Signup Trigger
 * Validates user registration and creates user record in PostgreSQL
 * 
 * Environment Variables:
 * - DATABASE_URL: PostgreSQL connection string
 * - VPC_SUBNET_IDS: VPC subnet IDs (for Lambda VPC configuration)
 * - VPC_SECURITY_GROUP_IDS: VPC security group IDs
 */

import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';

const ssmClient = new SSMClient({ region: 'us-west-2' });

// Cache database connection
let sql;
let db;

/**
 * Get database URL from SSM Parameter Store
 */
async function getDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  try {
    const response = await ssmClient.send(
      new GetParameterCommand({
        Name: '/myordering/dev/database-url',
        WithDecryption: true
      })
    );
    return response.Parameter.Value;
  } catch (error) {
    console.error('Failed to get database URL from SSM:', error);
    throw error;
  }
}

/**
 * Initialize database connection
 */
async function getDatabase() {
  if (db) return db;
  
  const dbUrl = await getDatabaseUrl();
  sql = postgres(dbUrl, {
    max: 1, // Lambda: use minimal connections
    idle_timeout: 20,
    connect_timeout: 10
  });
  
  db = drizzle(sql);
  return db;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if user already exists with this email
 */
async function checkExistingUser(email) {
  const database = await getDatabase();
  
  // Query users table for existing email
  const result = await sql`
    SELECT id, email, "cognitoSubId" 
    FROM users 
    WHERE email = ${email.toLowerCase()} 
    LIMIT 1
  `;
  
  return result.length > 0 ? result[0] : null;
}

/**
 * Create user record in PostgreSQL
 */
async function createUserRecord(cognitoSubId, email, name) {
  const database = await getDatabase();
  
  try {
    const result = await sql`
      INSERT INTO users (
        "cognitoSubId",
        email,
        name,
        "globalRole",
        "isActive",
        "createdAt",
        "updatedAt"
      ) VALUES (
        ${cognitoSubId},
        ${email.toLowerCase()},
        ${name || email.split('@')[0]},
        'USER',
        false,
        NOW(),
        NOW()
      )
      RETURNING id, "cognitoSubId", email, name, "globalRole"
    `;
    
    console.log('User record created:', result[0]);
    return result[0];
  } catch (error) {
    console.error('Failed to create user record:', error);
    throw error;
  }
}

/**
 * Lambda handler
 */
export async function handler(event) {
  console.log('Pre-signup event:', JSON.stringify(event, null, 2));

  try {
    const { userPoolId, triggerSource, request } = event;
    const { userAttributes } = request;
    
    // Extract user information
    const email = userAttributes.email;
    const name = userAttributes.name || userAttributes.given_name || '';
    const cognitoSubId = event.userName; // This is the Cognito user UUID

    // Validate email format
    if (!email || !isValidEmail(email)) {
      console.error('Invalid email format:', email);
      throw new Error('Invalid email format');
    }

    // Check for existing user
    const existingUser = await checkExistingUser(email);
    
    if (existingUser) {
      // If user exists but doesn't have Cognito sub ID, update it
      if (!existingUser.cognitoSubId) {
        console.log('Updating existing user with Cognito sub ID:', existingUser.id);
        await sql`
          UPDATE users 
          SET "cognitoSubId" = ${cognitoSubId}, 
              "updatedAt" = NOW()
          WHERE id = ${existingUser.id}
        `;
      } else if (existingUser.cognitoSubId !== cognitoSubId) {
        // Email already registered with different Cognito account
        console.error('Email already registered:', email);
        throw new Error('An account with this email already exists');
      }
      // Else: user exists with same Cognito sub ID (re-registration), allow
    } else {
      // Create new user record
      await createUserRecord(cognitoSubId, email, name);
    }

    // Auto-confirm user (skip email verification if needed)
    // Uncomment below to auto-confirm users
    // event.response.autoConfirmUser = true;
    // event.response.autoVerifyEmail = true;

    console.log('Pre-signup validation successful');
    return event;

  } catch (error) {
    console.error('Pre-signup trigger failed:', error);
    throw error; // This will prevent user signup
  }
}
