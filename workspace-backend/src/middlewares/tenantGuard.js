import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function tenantGuard(req, res, next) {
  if (!req.user || !req.activeOrgId) {
    return res.status(400).json({ error: 'Missing operational security context headers' });
  }

  // Confirm identity layer membership inside target context[cite: 1]
  const membership = await prisma.userOrgMembership.findUnique({
    where: {
      userId_organizationId: {
        userId: req.user.id,
        organizationId: req.activeOrgId
      }
    }
  });

  if (!membership) {
    return res.status(403).json({ error: 'Access unauthorized for this organization context' });
  }
  
  req.currentRole = membership.role;
  next();
}