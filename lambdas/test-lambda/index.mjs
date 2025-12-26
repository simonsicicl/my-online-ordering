import postgres from 'postgres';
import Redis from 'ioredis';

export const handler = async (event) => {
  const results = {
    message: 'Hello from Lambda!',
    timestamp: new Date().toISOString(),
    environment: {
      dbUrl: process.env.DATABASE_URL ? 'present' : 'missing',
      redisUrl: process.env.REDIS_URL ? 'present' : 'missing'
    },
    tests: {}
  };

  try {
    // Test 1: RDS PostgreSQL Connection
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable not set');
    }
    
    const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 10 });
    
    const dbResult = await sql`SELECT current_database(), current_user, version()`;
    results.tests.postgres = {
      status: 'success',
      database: dbResult[0].current_database,
      user: dbResult[0].current_user,
      version: dbResult[0].version.split(' ')[1]
    };
    await sql.end();

  } catch (error) {
    results.tests.postgres = {
      status: 'failed',
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    };
  }

  try {
    // Test 2: Redis Connection
    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL environment variable not set');
    }
    
    const redis = new Redis(process.env.REDIS_URL, { connectTimeout: 10000 });
    
    await redis.set('test:lambda', 'Hello Redis', 'EX', 60);
    const value = await redis.get('test:lambda');
    
    results.tests.redis = {
      status: 'success',
      pingResult: await redis.ping(),
      testValue: value
    };
    await redis.quit();

  } catch (error) {
    results.tests.redis = {
      status: 'failed',
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(results, null, 2)
  };
};
