import express from 'express';
import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { verifyToken } from '../middlewares/auth.js';
import { tenantGuard } from '../middlewares/tenantGuard.js';

const router = express.Router();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Enforce both authentication and organization membership universally across all ticketing endpoints
router.use(verifyToken);
router.use(tenantGuard);

// -----------------------------------------------------------------------------
// GET /api/v1/tickets (Fetch isolated tenant tickets + explicitly shared items)
// -----------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  const currentOrgId = req.activeOrgId;

  try {
    // Query 1: Fetch all tickets owned natively by this workspace
    const nativeTickets = await prisma.ticket.findMany({
      where: { organizationId: currentOrgId },
      orderBy: { createdAt: 'desc' }
    });

    // Query 2: Fetch tickets owned by external partners that were explicitly shared with this org
    const sharedItemMappings = await prisma.sharedItem.findMany({
      where: { 
        sharedWithId: currentOrgId,
        ticketId: { not: null } 
      },
      include: {
        ticket: true
      }
    });

    const sharedTickets = sharedItemMappings
      .map(mapping => mapping.ticket)
      .filter(ticket => ticket !== null);

    res.status(200).json({
      nativeTickets,
      sharedTickets
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET /api/v1/tickets/:id (BOLA Defended Single Resource Read)
// -----------------------------------------------------------------------------
router.get('/:id', async (req, res, next) => {
  const { id } = req.params;
  const currentOrgId = req.activeOrgId;

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { 
        sharedAccess: true,
        comments: {
          include: {
            author: { select: { email: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket resource not found' });
    }

    // Guard 1: Direct Ownership Check (Primary BOLA Protection)
    if (ticket.organizationId === currentOrgId) {
      return res.status(200).json(ticket);
    }

    // Guard 2: Cross-Org Single Item Conditional Pass-Through Exception
    const hasSharedAccess = ticket.sharedAccess.some(
      (share) => share.sharedWithId === currentOrgId
    );

    if (hasSharedAccess) {
      return res.status(200).json(ticket);
    }

    // If both guards fail, deny visibility even if the raw ID is valid globally
    return res.status(403).json({ error: 'Access to requested ticket ID is unauthorized' });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// POST /api/v1/tickets (Create native ticket within active tenant context)
// -----------------------------------------------------------------------------
router.post('/', async (req, res, next) => {
  const { title, description } = req.body;
  const currentOrgId = req.activeOrgId;
  const currentUserId = req.user.id;

  if (!title || !description) {
    return res.status(400).json({ error: 'Missing title or description parameters' });
  }

  try {
    const newTicket = await prisma.$transaction(async (tx) => {
      // 1. Persist the operational ticket bound to the organization
      const ticket = await tx.ticket.create({
        data: {
          organizationId: currentOrgId,
          title,
          description,
          status: 'OPEN'
        }
      });

      // 2. Write the record modification to the append-only AuditLog table
      await tx.auditLog.create({
        data: {
          organizationId: currentOrgId,
          userId: currentUserId,
          actionType: 'TICKET_CREATE',
          metadata: { ticketId: ticket.id, title: ticket.title }
        }
      });

      return ticket;
    });

    res.status(201).json(newTicket);
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// POST /api/v1/tickets/:id/share (Grant cross-org single-item access)
// -----------------------------------------------------------------------------
router.post('/:id/share', async (req, res, next) => {
  const { id } = req.params;
  const { targetOrgId } = req.body;
  const currentOrgId = req.activeOrgId;
  const currentUserId = req.user.id;

  if (!targetOrgId) {
    return res.status(400).json({ error: 'Missing target organization parameter' });
  }

  try {
    // 1. Confirm ticket ownership to prevent arbitrary cross-tenant sharing manipulation
    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket || ticket.organizationId !== currentOrgId) {
      return res.status(403).json({ error: 'Unauthorized operation on this resource asset' });
    }

    // 2. Verify that an approved connection contract exists between the two workspaces
    const establishedConnection = await prisma.connection.findFirst({
      where: {
        OR: [
          { initiatorOrgId: currentOrgId, targetOrgId: targetOrgId, status: 'APPROVED' },
          { initiatorOrgId: targetOrgId, targetOrgId: currentOrgId, status: 'APPROVED' }
        ]
      }
    });

    if (!establishedConnection) {
      return res.status(400).json({ error: 'No approved workspace alignment channel exists with target organization' });
    }

    // 3. Register the pass-through permission and log the security boundary mutation
    await prisma.$transaction(async (tx) => {
      await tx.sharedItem.create({
        data: {
          ticketId: id,
          sharedWithId: targetOrgId
        }
      });

      await tx.auditLog.create({
        data: {
          organizationId: currentOrgId,
          userId: currentUserId,
          actionType: 'CROSS_ORG_SHARE',
          metadata: { targetOrgId, resourceType: 'Ticket', resourceId: id }
        }
      });
    });

    res.status(200).json({ message: 'Ticket shared across tenant workspace successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;