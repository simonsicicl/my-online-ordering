import { createClient } from 'redis';
import { config } from './config';

// IMPORTANT: top-level await is NOT supported in Lambda CommonJS bundles.
// Always call getRedis() inside the handler function.
let redisClient: ReturnType<typeof createClient> | undefined;

export async function getRedis() {
  if (!redisClient) {
    redisClient = createClient({
      socket: { host: config.redisHost, port: config.redisPort },
    });
    await redisClient.connect();
  }
  return redisClient;
}
