import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { generateWorkspaceDigest } from './digestTracker.js';
import redisClient from '../services/session.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Iterates through all users in the system to calculate and cache
 * personalized multi-dashboard operational digests via background processing hooks.
 */
export async function runDigestGenerationCycle() {
  console.log('⏳ Starting background scheduled task: Processing personalized AI digests...');

  let hasLock = false;
  try {
    // 1. Acquire distributed lock using Redis to prevent double execution on scaled instances
    try {
      const lockAcquired = await redisClient.set('lock:digest-generation', 'true', {
        NX: true,
        EX: 600 // Lock automatically expires in 10 minutes to prevent deadlocks
      });
      hasLock = (lockAcquired === 'OK');
    } catch (lockError) {
      console.warn('⚠️ Redis distributed lock lookup failed, defaulting to local fallback run:', lockError.message);
      hasLock = true; // Fallback to run locally if Redis experiences downtime
    }

    if (!hasLock) {
      console.log('⏭️ Another worker instance holds the active generation lock. Skipping execution cycle.');
      return;
    }

    // 2. Fetch all system users along with their workspace tenant memberships
    const users = await prisma.user.findMany({
      include: {
        memberships: true
      }
    });

    const orgDigestCache = new Map();

    for (const user of users) {
      // Skip users without an assigned active workspace
      if (!user.memberships || user.memberships.length === 0) continue;

      for (const membership of user.memberships) {
        const orgId = membership.organizationId;

        try {
          let generatedText;
          if (orgDigestCache.has(orgId)) {
            generatedText = orgDigestCache.get(orgId);
          } else {
            // Generate the isolated, BOLA-compliant context summary
            generatedText = await generateWorkspaceDigest(orgId);
            orgDigestCache.set(orgId, generatedText);
            // Throttling delay to respect free-tier TPM/RPM quotas
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

          // 3. Persist the compiled snapshot to an In-App Notification tracking table
          await prisma.auditLog.create({
            data: {
              organizationId: orgId,
              userId: user.id,
              actionType: 'SYSTEM_AI_DIGEST_CRON',
              metadata: {
                recipientEmail: user.email,
                digestSnapshot: generatedText,
                deliveryChannel: 'IN_APP_NOTIFICATION_BELL'
              }
            }
          });

          console.log(`✅ Cached background AI digest for user: ${user.email} in Org: ${orgId}`);
        } catch (itemError) {
          console.error(`❌ Skipped digest slice computation for user ${user.id}:`, itemError.message);
        }
      }
    }
    console.log('🏁 Background scheduled cron digest execution sequence finished successfully.');
  } catch (error) {
    console.error('❌ Critical system failure during background scheduled task lifecycle:', error.message);
  } finally {
    // 4. Release the distributed lock cleanly
    if (hasLock) {
      try {
        await redisClient.del('lock:digest-generation');
      } catch (unlockError) {
        console.error('❌ Failed to release Redis distributed lock:', unlockError.message);
      }
    }
  }
}

/**
 * Initializes the background scheduler.
 */
export function initializeScheduler() {
  if (process.env.DISABLE_INLINE_SCHEDULER === 'true') {
    console.log('⚙️ Inline cron worker scheduler disabled by environment config.');
    return;
  }

  const intervalExpression = process.env.DIGEST_CRON_INTERVAL || '0 * * * *';

  console.log(`⚙️ Background Worker Task engine initialized using cadence expression: "${intervalExpression}"`);

  cron.schedule(intervalExpression, async () => {
    await runDigestGenerationCycle();
  });
}

// Enable running this file directly as a standalone worker process
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('cronJob.js')) {
  console.log('🚀 Starting standalone background cron worker process...');
  // Force running scheduler inline in this process
  process.env.DISABLE_INLINE_SCHEDULER = 'false';
  initializeScheduler();
}