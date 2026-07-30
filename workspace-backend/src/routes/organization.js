import express from 'express';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { verifyToken } from '../middlewares/auth.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const router = express.Router();

// POST /api/organizations/create
// The verifyToken middleware ensures we know exactly WHO the logged-in user is via req.user
router.post('/create', verifyToken, async (req, res, next) => {
  const { orgName, subdomain } = req.body;
  const userId = req.user.id; // Extracted from the login session token

  if (!orgName) {
    return res.status(400).json({ error: 'Organization name is required' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the brand new workspace/organization record
      const newOrg = await tx.organization.create({
        data: {
          name: orgName,
        },
      });

      // 2. Map the existing logged-in user to this new organization via your membership bridge table
      await tx.userOrgMembership.create({
        data: {
          userId: userId,
          organizationId: newOrg.id,
          role: 'ORG_ADMIN', // Give them admin rights over their new workspace context
        },
      });

      // 3. Log the action to the append-only Audit Log
      await tx.auditLog.create({
        data: {
          organizationId: newOrg.id,
          userId: userId,
          actionType: 'WORKSPACE_CREATE',
          metadata: {
            orgName: newOrg.name,
            subdomain: subdomain || '' // Subdomain is not in DB Organization, stored in log metadata for reference
          }
        }
      });

      return newOrg;
    });

    res.status(201).json({ success: true, organization: result });
  } catch (error) {
    console.error('Failed to initialize workspace:', error);
    res.status(500).json({ error: 'Failed to initialize workspace context' });
  }
});

export default router;
