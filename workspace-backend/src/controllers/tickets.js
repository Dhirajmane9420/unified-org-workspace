import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 1. Fetch isolated tenant tickets + explicitly shared items
export const getTickets = async (req, res, next) => {
  const currentOrgId = req.activeOrgId;
  try {
    const nativeTickets = await prisma.ticket.findMany({
      where: { organizationId: currentOrgId },
      orderBy: { createdAt: 'desc' }
    });

    const sharedItemMappings = await prisma.sharedItem.findMany({
      where: { 
        sharedWithId: currentOrgId,
        ticketId: { not: null } 
      },
      include: { ticket: true }
    });

    const sharedTickets = sharedItemMappings
      .map(mapping => mapping.ticket)
      .filter(ticket => ticket !== null);

    res.status(200).json({ nativeTickets, sharedTickets });
  } catch (err) {
    next(err);
  }
};

// 2. BOLA Defended Single Resource Read
export const getTicketById = async (req, res, next) => {
  const { id } = req.params;
  const currentOrgId = req.activeOrgId;
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { 
        sharedAccess: true,
        comments: {
          include: { author: { select: { email: true } } },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket resource not found' });

    // Primary BOLA Protection Check
    if (ticket.organizationId === currentOrgId || ticket.sharedAccess.some(s => s.sharedWithId === currentOrgId)) {
      return res.status(200).json(ticket);
    }

    return res.status(403).json({ error: 'Access to requested ticket ID is unauthorized' });
  } catch (err) {
    next(err);
  }
};

// 3. Create native ticket within active tenant context
export const createTicket = async (req, res, next) => {
  const { title, description } = req.body;
  const currentOrgId = req.activeOrgId;
  const currentUserId = req.user.id;

  if (!title || !description) {
    return res.status(400).json({ error: 'Missing title or description parameters' });
  }

  try {
    const newTicket = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.create({
        data: { organizationId: currentOrgId, title, description, status: 'OPEN' }
      });

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
};