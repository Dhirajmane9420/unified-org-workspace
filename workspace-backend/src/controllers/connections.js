import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 1. Request a connection with a partner organization
export const requestConnection = async (req, res, next) => {
  const { targetOrgId } = req.body;
  const currentOrgId = req.activeOrgId;
  const currentUserId = req.user.id;

  if (!targetOrgId) {
    return res.status(400).json({ error: 'Missing target organization ID' });
  }

  if (targetOrgId === currentOrgId) {
    return res.status(400).json({ error: 'Cannot connect an organization to itself' });
  }

  try {
    // Check if a connection link already exists
    const existingConnection = await prisma.connection.findFirst({
      where: {
        OR: [
          { initiatorOrgId: currentOrgId, targetOrgId },
          { initiatorOrgId: targetOrgId, targetOrgId: currentOrgId }
        ]
      }
    });

    if (existingConnection) {
      return res.status(400).json({ error: 'A connection contract or request already exists between these organizations' });
    }

    const connection = await prisma.$transaction(async (tx) => {
      const conn = await tx.connection.create({
        data: {
          initiatorOrgId: currentOrgId,
          targetOrgId,
          status: 'PENDING'
        }
      });

      await tx.auditLog.create({
        data: {
          organizationId: currentOrgId,
          userId: currentUserId,
          actionType: 'CONNECTION_REQUEST',
          metadata: { targetOrgId, connectionId: conn.id }
        }
      });

      return conn;
    });

    res.status(201).json({ message: 'Cross-org connection request dispatched successfully', connection });
  } catch (err) {
    next(err);
  }
};

// 2. Approve a pending connection request
export const approveConnection = async (req, res, next) => {
  const { id } = req.params;
  const currentOrgId = req.activeOrgId;
  const currentUserId = req.user.id;

  try {
    const connection = await prisma.connection.findUnique({ where: { id } });

    if (!connection || connection.targetOrgId !== currentOrgId) {
      return res.status(403).json({ error: 'Unauthorized or invalid connection request context' });
    }

    if (connection.status !== 'PENDING') {
      return res.status(400).json({ error: 'Connection request is not in a pending state' });
    }

    const updatedConnection = await prisma.$transaction(async (tx) => {
      const conn = await tx.connection.update({
        where: { id },
        data: { status: 'APPROVED' }
      });

      await tx.auditLog.create({
        data: {
          organizationId: currentOrgId,
          userId: currentUserId,
          actionType: 'CONNECTION_APPROVE',
          metadata: { initiatorOrgId: connection.initiatorOrgId, connectionId: id }
        }
      });

      return conn;
    });

    res.status(200).json({ message: 'Cross-org partner alignment channel approved', connection: updatedConnection });
  } catch (err) {
    next(err);
  }
};

// 3. Revoke an active or pending connection contract from either side
export const revokeConnection = async (req, res, next) => {
  const { id } = req.params;
  const currentOrgId = req.activeOrgId;
  const currentUserId = req.user.id;

  try {
    const connection = await prisma.connection.findUnique({ where: { id } });

    if (!connection || (connection.initiatorOrgId !== currentOrgId && connection.targetOrgId !== currentOrgId)) {
      return res.status(403).json({ error: 'Unauthorized operation on this connection channel' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.connection.delete({ where: { id } });

      // Cascade delete shared items between these organizations to enforce clean severance
      const partnerOrgId = connection.initiatorOrgId === currentOrgId ? connection.targetOrgId : connection.initiatorOrgId;

      await tx.sharedItem.deleteMany({
        where: {
          sharedWithId: partnerOrgId,
          ticket: { organizationId: currentOrgId }
        }
      });

      await tx.auditLog.create({
        data: {
          organizationId: currentOrgId,
          userId: currentUserId,
          actionType: 'CONNECTION_REVOKE',
          metadata: { severedPartnerOrgId: partnerOrgId, connectionId: id }
        }
      });
    });

    res.status(200).json({ message: 'Cross-org workspace partnership successfully revoked and severed' });
  } catch (err) {
    next(err);
  }
};

// 4. Retrieve connection requests and contracts
export const getConnections = async (req, res, next) => {
  const currentOrgId = req.activeOrgId;
  try {
    const inboundPending = await prisma.connection.findMany({
      where: {
        targetOrgId: currentOrgId,
        status: 'PENDING'
      },
      include: {
        initiatorOrg: {
          select: { id: true, name: true }
        }
      }
    });

    const outboundPending = await prisma.connection.findMany({
      where: {
        initiatorOrgId: currentOrgId,
        status: 'PENDING'
      },
      include: {
        targetOrg: {
          select: { id: true, name: true }
        }
      }
    });

    const activeConnections = await prisma.connection.findMany({
      where: {
        status: 'APPROVED',
        OR: [
          { initiatorOrgId: currentOrgId },
          { targetOrgId: currentOrgId }
        ]
      },
      include: {
        initiatorOrg: { select: { id: true, name: true } },
        targetOrg: { select: { id: true, name: true } }
      }
    });

    res.status(200).json({ inboundPending, outboundPending, activeConnections });
  } catch (err) {
    next(err);
  }
};