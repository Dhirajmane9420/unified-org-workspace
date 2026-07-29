import { PrismaClient } from '../../generated/prisma/client.js';
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
  const { email, password, orgName } = req.body;

  if (!email || !password || !orgName) {
    return res.status(400).json({ error: 'Missing email, password, or organization name' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const newOrg = await tx.organization.create({ data: { name: orgName } });
      const newUser = await tx.user.create({
        data: { email, passwordHash: hashPassword(password) }
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
    await prisma.auditLog.create({
      data: {
        organizationId: req.activeOrgId || 'GLOBAL_CONTEXT_DETACH',
        userId: req.user.id,
        actionType: 'USER_LOGOUT',
        metadata: { clientExitStatus: 'SUCCESS' }
      }
    });
    res.status(200).json({ message: 'Global session clearance executed. Token signature invalidated.' });
  } catch (err) {
    next(err);
  }
};