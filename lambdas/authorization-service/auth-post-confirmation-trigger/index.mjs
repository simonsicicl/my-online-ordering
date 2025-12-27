/**
 * Cognito Post-Confirmation Trigger
 * Activates user account and publishes User.Registered event to EventBridge
 * 
 * Environment Variables:
 * - DATABASE_URL: PostgreSQL connection string
 * - EVENT_BUS_NAME: EventBridge event bus name (default: myordering-event-bus)
 */

import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

const ssmClient = new SSMClient({ region: 'us-west-2' });
const eventBridgeClient = new EventBridgeClient({ region: 'us-west-2' });

// Cache connections
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
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10
  });
  
  db = drizzle(sql);
  return db;
}

/**
 * Activate user in database
 */
async function activateUser(cognitoSubId, email) {
  await getDatabase();
  
  try {
    const result = await sql`
      UPDATE users 
      SET 
        is_active = true,
        email_verified = true,
        updated_at = NOW()
      WHERE cognito_sub_id = ${cognitoSubId}
      RETURNING id, cognito_sub_id, email, name, global_role, is_active
    `;
    
    if (result.length === 0) {
      console.error('User not found for activation:', cognitoSubId);
      throw new Error('User not found');
    }
    
    console.log('User activated:', result[0]);
    return result[0];
  } catch (error) {
    console.error('Failed to activate user:', error);
    throw error;
  }
}

/**
 * Publish User.Registered event to EventBridge
 */
async function publishUserRegisteredEvent(user) {
  const eventBusName = process.env.EVENT_BUS_NAME || 'myordering-event-bus';
  
  const event = {
    Time: new Date(),
    Source: 'myordering.auth',
    DetailType: 'User.Registered',
    Detail: JSON.stringify({
      userId: user.id,
      cognitoSubId: user.cognito_sub_id,
      email: user.email,
      name: user.name,
      globalRole: user.global_role,
      timestamp: new Date().toISOString()
    }),
    EventBusName: eventBusName
  };
  
  try {
    const command = new PutEventsCommand({
      Entries: [event]
    });
    
    const response = await eventBridgeClient.send(command);
    
    if (response.FailedEntryCount > 0) {
      console.error('Failed to publish event:', response.Entries);
      throw new Error('Event publishing failed');
    }
    
    console.log('User.Registered event published:', response.Entries[0].EventId);
  } catch (error) {
    console.error('Failed to publish event to EventBridge:', error);
    // Don't throw - user is already activated, event publishing is non-critical
    console.warn('Continuing despite event publishing failure');
  }
}

/**
 * Lambda handler
 */
export async function handler(event) {
  console.log('Post-confirmation event:', JSON.stringify(event, null, 2));

  try {
    const { request } = event;
    const { userAttributes } = request;
    
    // Extract user information
    const cognitoSubId = event.userName;
    const email = userAttributes.email;
    
    console.log(`Activating user: ${email} (${cognitoSubId})`);
    
    // Activate user in database
    const user = await activateUser(cognitoSubId, email);
    
    // Publish User.Registered event to EventBridge
    await publishUserRegisteredEvent(user);
    
    console.log('Post-confirmation completed successfully');
    return event;

  } catch (error) {
    console.error('Post-confirmation trigger failed:', error);
    // Return event anyway - user is already confirmed in Cognito
    // We don't want to prevent login if database update fails
    return event;
  }
}
