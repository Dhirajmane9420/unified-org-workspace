import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { generateWorkspaceDigest } from '../workers/digestTracker.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Helper to construct database queries based on request filters
const buildFilterConditions = (currentOrgId, query) => {
  const { actionType, userId, userEmail, startDate, endDate } = query;
  const filterConditions = { organizationId: currentOrgId };

  if (actionType) {
    filterConditions.actionType = String(actionType);
  }

  if (userId) {
    filterConditions.userId = String(userId);
  } else if (userEmail) {
    filterConditions.user = { email: String(userEmail) };
  }

  if (startDate || endDate) {
    filterConditions.createdAt = {};
    if (startDate) {
      filterConditions.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      filterConditions.createdAt.lte = new Date(endDate);
    }
  }

  return filterConditions;
};

export const getAuditLogs = async (req, res, next) => {
  const currentOrgId = req.activeOrgId;
  const { limit = 50, page = 1 } = req.query;

  try {
    const parsedLimit = parseInt(limit, 10);
    const parsedPage = parseInt(page, 10);
    const skip = (parsedPage - 1) * parsedLimit;

    const filterConditions = buildFilterConditions(currentOrgId, req.query);

    const [logs, totalCount] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where: filterConditions,
        include: { user: { select: { email: true } } },
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
};

export const getAiDigest = async (req, res, next) => {
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
};

export const exportAuditLogsToCsv = async (req, res, next) => {
  const currentOrgId = req.activeOrgId;

  try {
    const filterConditions = buildFilterConditions(currentOrgId, req.query);

    // 1. Fetch all historical event rows tied to this tenant context matching the filters
    const logs = await prisma.auditLog.findMany({
      where: filterConditions,
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Configure HTTP stream headers to prompt a file download on the dashboard client
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit_log_tenant_${currentOrgId}.csv`);

    // 3. Build CSV string structure manually with clean escaping
    const headers = ['ID', 'Timestamp', 'User Email', 'Action Type', 'Metadata Context\n'];
    res.write(headers.join(','));

    for (const log of logs) {
      const row = [
        `"${log.id}"`,
        `"${log.createdAt.toISOString()}"`,
        `"${log.user?.email || 'SYSTEM'}"`,
        `"${log.actionType}"`,
        `"${JSON.stringify(log.metadata).replace(/"/g, '""')}"\n`
      ];
      res.write(row.join(','));
    }

    res.end();
  } catch (err) {
    next(err);
  }
};
