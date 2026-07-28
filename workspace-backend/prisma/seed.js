import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import crypto from 'crypto';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Helper to hash passwords consistently for test users
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('🔄 Starting data seeding execution...');

  // Clean up any existing data to ensure a fresh evaluation state
  await prisma.sharedItem.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.prReviewer.deleteMany();
  await prisma.prVersion.deleteMany();
  await prisma.pullRequest.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.userOrgMembership.deleteMany();
  await prisma.connection.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  // -----------------------------------------------------------------------------
  // 1. CREATE ORGANIZATIONS
  // -----------------------------------------------------------------------------
  const orgA = await prisma.organization.create({
    data: { name: 'Acme Corp' }
  });

  const orgB = await prisma.organization.create({
    data: { name: 'Stark Industries' }
  });

  console.log(`🏢 Created Organizations: ${orgA.name} & ${orgB.name}`);

  // -----------------------------------------------------------------------------
  // 2. CREATE TEST USERS WITH HASHED PASSWORDS
  // -----------------------------------------------------------------------------
  const adminUser = await prisma.user.create({
    data: { email: 'admin@acme.com', passwordHash: hashPassword('admin123') }
  });

  const agentUser = await prisma.user.create({
    data: { email: 'agent@acme.com', passwordHash: hashPassword('agent123') }
  });

  const reviewerUser = await prisma.user.create({
    data: { email: 'reviewer@stark.com', passwordHash: hashPassword('review123') }
  });

  console.log('👤 Created Users: admin@acme.com, agent@acme.com, reviewer@stark.com');

  // -----------------------------------------------------------------------------
  // 3. MAP MEMBERSHIPS AND ASSIGN ROLES (RBAC)
  // -----------------------------------------------------------------------------
  await prisma.userOrgMembership.createMany({
    data: [
      { userId: adminUser.id, organizationId: orgA.id, role: 'ORG_ADMIN' },       // Full control Acme
      { userId: agentUser.id, organizationId: orgA.id, role: 'SUPPORT_AGENT' },   // Support Hub only Acme[cite: 1]
      { userId: reviewerUser.id, organizationId: orgB.id, role: 'REVIEWER' }      // PR & Ticket Reviewer Stark[cite: 1]
    ]
  });

  console.log('🛡️ Assigned Organization Membership Roles.');

  // -----------------------------------------------------------------------------
  // 4. ESTABLISH A CROSS-ORG PARTNER CONNECTION
  // -----------------------------------------------------------------------------
  const connection = await prisma.connection.create({
    data: {
      initiatorOrgId: orgA.id,
      targetOrgId: orgB.id,
      status: 'APPROVED' // Pre-approved connection for instant cross-org sharing tests[cite: 1]
    }
  });

  console.log('🔗 Established APPROVED Cross-Org Connection between Acme and Stark[cite: 1]');

  // -----------------------------------------------------------------------------
  // 5. SEED TICKETS (DASHBOARD 1 - SUPPORT HUB)
  // -----------------------------------------------------------------------------
  const ticket1 = await prisma.ticket.create({
    data: {
      organizationId: orgA.id,
      title: 'Critical Database Latency Spike',
      description: 'Production PostgreSQL instance is experiencing severe query response drops under high load.',
      status: 'OPEN'
    }
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      organizationId: orgA.id,
      title: 'OAuth Integration Failure',
      description: 'Users cannot log in via third-party providers intermittently.',
      status: 'IN_PROGRESS'
    }
  });

  console.log('🎫 Seeded Dashboard 1 Tickets (Support Hub)[cite: 1]');

  // -----------------------------------------------------------------------------
  // 6. ENFORCE CROSS-ORG ISOLATION TEST ITEM (SHARE A TICKET)
  // -----------------------------------------------------------------------------
  // Sharing Ticket 2 explicitly with Stark Industries (Org B)[cite: 1]
  await prisma.sharedItem.create({
    data: {
      ticketId: ticket2.id,
      sharedWithId: orgB.id
    }
  });

  console.log(`🔓 Shared Ticket "${ticket2.title}" with ${orgB.name} for Guest Review[cite: 1]`);

  // -----------------------------------------------------------------------------
  // 7. SEED PULL REQUESTS (DASHBOARD 2 - REVIEW CONSOLE)
  // -----------------------------------------------------------------------------
  const pr = await prisma.pullRequest.create({
    data: {
      organizationId: orgB.id,
      authorId: reviewerUser.id,
      title: 'feat: Core Auth Token Revocation Blacklist',
      description: 'Integrates Redis caching layers to invalidate session access keys globally.',
      status: 'IN_REVIEW',
      currentVersion: 1
    }
  });

  // Attach explicit reviewer entry mapping rules[cite: 1]
  await prisma.prReviewer.create({
    data: {
      pullRequestId: pr.id,
      reviewerId: reviewerUser.id,
      hasApproved: false
    }
  });

  // Seed an immutable historical diff capture variant[cite: 1]
  await prisma.prVersion.create({
    data: {
      pullRequestId: pr.id,
      versionNumber: 1,
      title: pr.title,
      description: pr.description,
      rawDiff: '@@ -10,4 +10,9 @@ const verifyToken = async (req, res) => {\n+  const isRevoked = await redis.get(token);\n+  if (isRevoked) return res.status(401);'
    }
  });

  console.log('🚀 Seeded Dashboard 2 Pull Requests with Version History[cite: 1]');

  // -----------------------------------------------------------------------------
  // 8. WRITE APPEND-ONLY AUDIT ENTRY
  // -----------------------------------------------------------------------------
  await prisma.auditLog.create({
    data: {
      organizationId: orgA.id,
      userId: adminUser.id,
      actionType: 'CROSS_ORG_SHARE',
      metadata: { targetOrgId: orgB.id, targetResource: 'Ticket', resourceId: ticket2.id }
    }
  });

  console.log('📝 Logged Initial Shared Action to Append-Only Audit Trail[cite: 1]');
  console.log('✅ Seeding completed perfectly.');
}

main()
  .catch((e) => {
    console.error('❌ Error executing seeding script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });