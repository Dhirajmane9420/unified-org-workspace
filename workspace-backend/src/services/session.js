import { createClient } from 'redis';

// Initialize the Redis Client pointing directly to your environmental cache container
const redisClient = createClient({ url: process.env.REDIS_URL });
let isRedisConnected = false;

redisClient.on('connect', () => {
  isRedisConnected = true;
  console.log('⚡ Connected to Redis Session Storage Successfully.');
});
redisClient.on('ready', () => {
  isRedisConnected = true;
});
redisClient.on('error', (err) => {
  isRedisConnected = false;
  if (err.code === 'ECONNREFUSED') {
    // Suppress heavy stack traces for local development environments lacking active Redis servers
  } else {
    console.error('❌ Redis Session Cache Client Error:', err.message);
  }
});
redisClient.on('end', () => {
  isRedisConnected = false;
});

// Self-invoking connection broker
(async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect().catch(() => {
      isRedisConnected = false;
    });
  }
})();

// Fallback in-memory structures
const memoryBlacklist = new Set();
const memoryWorkspaceContext = new Map();

/**
 * Global Session Invalidation Engine
 * Blacklists a JWT token until its expiration period completes to enforce immediate cross-app logouts.
 * @param {string} token - The raw incoming authorization header signature string
 * @param {number} expiresInSeconds - Remaining lifespan duration of the token payload
 */
export async function revokeTokenGlobally(token, expiresInSeconds = 86400) {
  memoryBlacklist.add(token);
  // Auto-remove from memory after expiration
  setTimeout(() => memoryBlacklist.delete(token), expiresInSeconds * 1000);

  if (isRedisConnected) {
    try {
      // Write token signature to the blacklist using a string key match with an auto-expiring TTL
      await redisClient.set(`revoked:${token}`, 'true', {
        EX: expiresInSeconds
      });
    } catch (err) {
      console.warn('⚠️ Failed to commit token revocation to Redis, using in-memory fallback:', err.message);
    }
  }
  return true;
}

/**
 * Check if a token has been revoked globally
 */
export async function isTokenRevoked(token) {
  if (memoryBlacklist.has(token)) {
    return true;
  }

  if (isRedisConnected) {
    try {
      const isRevoked = await redisClient.get(`revoked:${token}`);
      return !!isRevoked;
    } catch (err) {
      console.warn('⚠️ Failed to check token status from Redis, bypassing blacklist check.');
    }
  }

  return false;
}

/**
 * Live Context Switcher Cache
 * Tracks the current active organization context a user is manipulating to optimize cross-dashboard syncing.
 */
export async function setLiveUserWorkspaceContext(userId, orgId) {
  memoryWorkspaceContext.set(userId, orgId);

  if (isRedisConnected) {
    try {
      await redisClient.set(`active-context:${userId}`, orgId, {
        EX: 28800 // Automatically clears after 8 hours of inactivity
      });
    } catch (err) {
      console.error('Failed to update live user context cache:', err.message);
    }
  }
}

export default redisClient;