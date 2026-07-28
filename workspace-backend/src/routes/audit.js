import express from 'express';
import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { verifyToken } from '../middlewares/auth.js';
import { tenantGuard } from '../middlewares/tenantGuard.js';
import { generateWorkspaceDigest } from '../workers/digestTracker.js';

const router = express.Router();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Enforce authentication and tenant membership universally across all audit trail endpoints
router.use(verifyToken);
router.use(tenantGuard);

// -----------------------------------------------------------------------------
// GET /api/v1/audit-logs (Fetch isolated workspace historical timeline events)
// -----------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  const currentOrgId = req.activeOrgId;
  const { actionType, limit = 50, page = 1 } = req.query;

  try {
    // 1. Parse pagination metrics safely
    const parsedLimit = parseInt(limit, 10);
    const parsedPage = parseInt(page, 10);
    const skip = (parsedPage - 1) * parsedLimit;

    // 2. Construct dynamic filter object locked strictly to the active tenant ID (BOLA defense)
    const filterConditions = {
      organizationId: currentOrgId
    };

    // Filter by specific action profiles if explicitly provided in query strings
    if (actionType) {
      filterConditions.actionType = String(actionType);
    }

    // 3. Execute database query and fetch count records transactionally
    const [logs, totalCount] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where: filterConditions,
        include: {
          user: {
            select: { email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: parsedLimit,
        skip: skip
      }),
      prisma.auditLog.count({ where: filterConditions })
    ]);

    res.status(200).json({
      timelineEvents: logs,
      pagination: {
        totalRecords: totalCount,
        totalPages: Math.ceil(totalCount / parsedLimit),
        currentPage: parsedPage,
        limit: parsedLimit
      }
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET /api/v1/audit-logs/ai-digest (Trigger Dynamic Multi-Dashboard Analysis)
// -----------------------------------------------------------------------------
router.get('/ai-digest', async (req, res, next) => {
  const currentOrgId = req.activeOrgId;

  try {
    const healthDigest = await generateWorkspaceDigest(currentOrgId);
    
    res.status(200).json({
      organizationId: currentOrgId,
      calculatedAt: new Date(),
      digestSummary: healthDigest
    });
  } catch (err) {
    next(err);
  }
});

export default router;