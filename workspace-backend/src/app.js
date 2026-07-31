import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { verifyToken } from './middlewares/auth.js';
import { tenantGuard } from './middlewares/tenantGuard.js';
import authRoutes from './routes/auth.js';
import ticketRoutes from './routes/tickets.js';
import pullRequestRoutes from './routes/pullRequests.js';
import auditRoutes from './routes/audit.js';
import connectionRoutes from './routes/connections.js';
import webhookRoutes from './routes/webhook.js';
import organizationRoutes from './routes/organization.js';
import { initializeScheduler } from './workers/cronJob.js';
import { runDigestGenerationCycle } from './workers/cronJob.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = express();
const PORT = process.env.PORT || 5000;

// 1. GLOBAL MIDDLEWARES
app.use(express.json());

// Dynamic CORS configuration mapping to your dual-dashboard routes
const allowedOrigins = [
  process.env.FRONTEND_SUPPORT_URL || 'http://localhost:3000',
  process.env.FRONTEND_REVIEW_URL || 'http://localhost:3001'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or internal postman testing)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Blocked by Cross-Origin Resource Sharing Policy'));
    }
  },
  credentials: true
}));

// 2. HEALTH CHECK ROUTE
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});
app.post('/api/share', verifyToken, tenantGuard, async (req, res, next) => {
  const { targetOrgId, ticketId, pullRequestId } = req.body;
  const userEmail = req.user.email;
  const currentOrgId = req.activeOrgId;
  const currentUserId = req.user.id;
  const currentRole = req.currentRole;

  if (!targetOrgId) {
    return res.status(400).json({ error: 'Missing targetOrgId parameter context' });
  }

  try {
    // 1. Verify resource ownership and execute RBAC checks (BOLA Defense)
    if (ticketId) {
      if (currentRole !== 'ORG_ADMIN' && currentRole !== 'SUPPORT_AGENT') {
        return res.status(403).json({ error: 'Access unauthorized: support agent or admin role required to share tickets' });
      }

      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket || ticket.organizationId !== currentOrgId) {
        return res.status(403).json({ error: 'Access unauthorized: ticket does not belong to active organization context' });
      }
    }

    if (pullRequestId) {
      if (currentRole !== 'ORG_ADMIN' && currentRole !== 'REVIEWER') {
        return res.status(403).json({ error: 'Access unauthorized: reviewer or admin role required to share pull requests' });
      }

      const pr = await prisma.pullRequest.findUnique({ where: { id: pullRequestId } });
      if (!pr || pr.organizationId !== currentOrgId) {
        return res.status(403).json({ error: 'Access unauthorized: pull request does not belong to active organization context' });
      }
    }

    // 2. Verify approved connection exists between organizations
    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { initiatorOrgId: currentOrgId, targetOrgId: targetOrgId, status: 'APPROVED' },
          { initiatorOrgId: targetOrgId, targetOrgId: currentOrgId, status: 'APPROVED' }
        ]
      }
    });

    if (!connection) {
      return res.status(400).json({ error: 'No active approved connection exists with target organization' });
    }

    // 3. Prevent duplicate SharedItem records
    const existingSharedItem = await prisma.sharedItem.findFirst({
      where: {
        sharedWithId: targetOrgId,
        ticketId: ticketId || null,
        pullRequestId: pullRequestId || null
      }
    });

    if (existingSharedItem) {
      return res.status(200).json(existingSharedItem);
    }

    // 4. Create SharedItem using schema-compliant fields
    const sharedItem = await prisma.sharedItem.create({
      data: {
        sharedWithId: targetOrgId,
        ticketId: ticketId || null,
        pullRequestId: pullRequestId || null
      }
    });

    // 5. Log a detailed, audit-compliant event to both organizations' timelines
    await prisma.auditLog.create({
      data: {
        organizationId: currentOrgId,
        userId: currentUserId,
        actionType: "CROSS_ORG_SHARE",
        metadata: {
          operator: userEmail,
          action: "CROSS_ORG_SHARE",
          details: `Shared PR ${pullRequestId || ticketId} with organization ${targetOrgId}`
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: targetOrgId,
        userId: currentUserId,
        actionType: "CROSS_ORG_SHARE",
        metadata: {
          operator: userEmail,
          action: "CROSS_ORG_SHARE",
          details: `Shared PR ${pullRequestId || ticketId} with organization ${targetOrgId}`,
          inbound: true
        }
      }
    });

    return res.status(200).json(sharedItem);
  } catch (err) {
    next(err);
  }
});


app.use('/api/v1/auth', authRoutes);

app.use('/api/v1/tickets', ticketRoutes);

// Pull Request Module Service Routes (Dashboard 2)
app.use('/api/v1/pull-requests', pullRequestRoutes);

// Audit Log Historical Module Service Routes (Dashboard 2)
app.use('/api/v1/audit-logs', auditRoutes);

app.use('/api/v1/connections', connectionRoutes);

app.use('/api/webhooks', webhookRoutes);

app.use('/api/organizations', organizationRoutes);

// 3. SECURED SYSTEM TEST ROUTE
// Verifies that your single identity layer and tenant guards function seamlessly
app.get('/api/v1/protected-workspace', verifyToken, tenantGuard, (req, res) => {
  res.status(200).json({
    message: 'Access granted. Operational security context verified.',
    user: req.user,
    activeOrgId: req.activeOrgId,
    currentRole: req.currentRole
  });
});

// 4. GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error('❌ Server Error Context:', err);
  res.status(500).json({ error: 'Internal server operational error occurred' });
});



initializeScheduler();

// TEMP TEST HOOK: Remove this after verifying it runs smoothly!
// if (process.env.NODE_ENV !== 'production') {
//   console.log("🛠️ Dev Mode: Forcing an immediate background digest cycle test...");
//   runDigestGenerationCycle().catch(err => console.error("❌ Immediate test crashed:", err));
// }

// 5. BOOT ENGINE
app.listen(PORT, () => {
  console.log(`🚀 Unified Org Workspace backend spinning up on port ${PORT}`);
  console.log(`🔗 Scoped Origins: Support [${allowedOrigins[0]}], Review [${allowedOrigins[1]}]`);
});

export default app;
