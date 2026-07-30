import cron from 'node-cron';


import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { generateWorkspaceDigest } from './digestTracker.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Iterates through all users in the system to calculate and cache
 * personalized multi-dashboard operational digests via background processing hooks.
 */
export async function runDigestGenerationCycle() {
  console.log('⏳ Starting background scheduled task: Processing personalized AI digests...');

  try {
    // 1. Fetch all system users along with their workspace tenant memberships
    const users = await prisma.user.findMany({
      include: {
        memberships: true
      }
    });

    for (const user of users) {
      // Skip users without an assigned active workspace
      if (!user.memberships || user.memberships.length === 0) continue;

      for (const membership of user.memberships) {
        const orgId = membership.organizationId;

        try {
          // Generate the isolated, BOLA-compliant context summary
          const generatedText = await generateWorkspaceDigest(orgId);

          // 2. Persist the compiled snapshot to an In-App Notification tracking table
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
  }
}

/**
 * Initializes the background scheduler.
 */
export function initializeScheduler() {
  const intervalExpression = process.env.DIGEST_CRON_INTERVAL || '0 * * * *';

  console.log(`⚙️ Background Worker Task engine initialized using cadence expression: "${intervalExpression}"`);

  cron.schedule(intervalExpression, async () => {
    await runDigestGenerationCycle();
  });
}