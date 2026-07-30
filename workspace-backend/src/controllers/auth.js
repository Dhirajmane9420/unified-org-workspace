
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { revokeTokenGlobally } from '../services/session.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export const register = async (req, res, next) => {
  // 1. Debug exactly what the frontend is sending to the server
  console.log("📥 Registration Payload Received:", req.body);

  const { email, password, orgName } = req.body;

  if (!email || !password || !orgName) {
    return res.status(400).json({ error: 'Missing email, password, or organization name' });
  }

  try {
    // 2. FIXED: Use findFirst instead of findUnique to circumvent driver invocation strictness
    const existingUser = await prisma.user.findFirst({
      where: {
        email: email.trim().toLowerCase() // Normalize inputs to prevent indexing mismatches
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const newOrg = await tx.organization.create({ data: { name: orgName } });
      const newUser = await tx.user.create({
        data: {
          email: email.trim().toLowerCase(),
          passwordHash: hashPassword(password)
        }
      });
      await tx.userOrgMembership.create({
        data: { userId: newUser.id, organizationId: newOrg.id, role: 'ORG_ADMIN' }
      });
      return { user: newUser, org: newOrg };
    });

    res.status(201).json({
      message: 'User registration and workspace creation successful',
      userId: result.user.id,
      organizationId: result.org.id
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { memberships: { include: { organization: true } } }
    });

    if (!user || user.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Invalid email or password credentials' });
    }

    if (user.memberships.length === 0) {
      return res.status(403).json({ error: 'User is not associated with any organization workspace' });
    }

    const defaultMembership = user.memberships[0];
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(200).json({
      message: 'Authentication successful',
      token,
      user: { id: user.id, email: user.email },
      activeWorkspace: {
        organizationId: defaultMembership.organizationId,
        orgName: defaultMembership.organization.name,
        role: defaultMembership.role
      },
      availableWorkspaces: user.memberships.map(m => ({
        organizationId: m.organizationId,
        orgName: m.organization.name,
        role: m.role
      }))
    });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader.split(' ')[1];

  try {
    await revokeTokenGlobally(token, 86400);

    let orgId = req.activeOrgId;
    if (!orgId) {
      const membership = await prisma.userOrgMembership.findFirst({
        where: { userId: req.user.id }
      });
      if (membership) {
        orgId = membership.organizationId;
      }
    }

    if (orgId) {
      await prisma.auditLog.create({
        data: {
          organizationId: orgId,
          userId: req.user.id,
          actionType: 'USER_LOGOUT',
          metadata: { clientExitStatus: 'SUCCESS' }
        }
      });
    }

    res.status(200).json({ message: 'Global session clearance executed. Token signature invalidated.' });
  } catch (err) {
    next(err);
  }
};

// Fetch the structured feature flag configurations for the active tenant context
export const getFeatureFlags = async (req, res, next) => {
  const currentOrgId = req.activeOrgId;

  try {
    const org = await prisma.organization.findUnique({
      where: { id: currentOrgId },
      select: { featureFlags: true }
    });

    if (!org) {
      return res.status(404).json({ error: 'Organization workspace context not found.' });
    }

    // Returns the custom flags object (e.g., {"enableAiSummaries": true})
    res.status(200).json(org.featureFlags || {});
  } catch (err) {
    next(err);
  }
};