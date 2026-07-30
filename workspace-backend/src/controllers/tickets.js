import { PrismaClient } from '@prisma/client';
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
        sharedWithId: currentOrgId
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
        sharedWith: true,
        comments: {
          include: { author: { select: { email: true } } },
          orderBy: { createdAt: 'asc' }
        },
        attachments: true
      }
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket resource not found' });

    // Primary BOLA Protection Check
    if (ticket.organizationId === currentOrgId || ticket.sharedWith.some(s => s.sharedWithId === currentOrgId)) {
      return res.status(200).json(ticket);
    }

    return res.status(403).json({ error: 'Access to requested ticket ID is unauthorized' });
  } catch (err) {
    next(err);
  }
};

// 3. Create native ticket within active tenant context
export const createTicket = async (req, res, next) => {
  const { title, description, attachments } = req.body;
  const currentOrgId = req.activeOrgId;
  const currentUserId = req.user.id;

  if (!title || !description) {
    return res.status(400).json({ error: 'Missing title or description parameters' });
  }

  try {
    const newTicket = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.create({
        data: {
          organizationId: currentOrgId,
          title,
          description,
          status: 'OPEN',
          ...(attachments && Array.isArray(attachments) && attachments.length > 0 && {
            attachments: {
              create: attachments.map(att => ({
                filename: att.filename,
                url: att.url
              }))
            }
          })
        },
        include: { attachments: true }
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

// 4. Update an existing ticket's details or operational status
export const updateTicket = async (req, res, next) => {
  const { id } = req.params;
  const { title, description, status } = req.body;
  const currentOrgId = req.activeOrgId;
  const currentUserId = req.user.id;

  try {
    // Defend resource lookup boundary with a strict BOLA verification check
    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket || ticket.organizationId !== currentOrgId) {
      return res.status(403).json({ error: 'Unauthorized operational access context on target ticket' });
    }

    const updatedTicket = await prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(description && { description }),
          ...(status && { status })
        }
      });

      // Commit mutation event to the append-only logging engine
      await tx.auditLog.create({
        data: {
          organizationId: currentOrgId,
          userId: currentUserId,
          actionType: 'TICKET_UPDATE',
          metadata: { ticketId: id, updatedFields: Object.keys(req.body) }
        }
      });

      return updated;
    });

    res.status(200).json(updatedTicket);
  } catch (err) {
    next(err);
  }
};

// 5. Delete a ticket asset cleanly from the active workspace context
export const deleteTicket = async (req, res, next) => {
  const { id } = req.params;
  const currentOrgId = req.activeOrgId;
  const currentUserId = req.user.id;

  try {
    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket || ticket.organizationId !== currentOrgId) {
      return res.status(403).json({ error: 'Unauthorized operational access context on target ticket' });
    }

    await prisma.$transaction(async (tx) => {
      // Flush secondary references like shared access metrics first if applicable
      await tx.sharedItem.deleteMany({ where: { ticketId: id } });

      // Remove core record
      await tx.ticket.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          organizationId: currentOrgId,
          userId: currentUserId,
          actionType: 'TICKET_DELETE',
          metadata: { ticketId: id, deletedTitle: ticket.title }
        }
      });
    });

    res.status(200).json({ message: 'Ticket removed from workspace environment successfully' });
  } catch (err) {
    next(err);
  }
};

// 6. Create comment on ticket context
export const createComment = async (req, res, next) => {
  const { id } = req.params;
  const { content } = req.body;
  const currentOrgId = req.activeOrgId;
  const currentUserId = req.user.id;

  if (!content) {
    return res.status(400).json({ error: 'Missing comment content' });
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { sharedWith: true }
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    // Primary BOLA defense
    if (ticket.organizationId !== currentOrgId && !ticket.sharedWith.some(s => s.sharedWithId === currentOrgId)) {
      return res.status(403).json({ error: 'Access unauthorized for this ticket context' });
    }

    const newComment = await prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          ticketId: id,
          authorId: currentUserId,
          content
        },
        include: { author: { select: { email: true } } }
      });

      await tx.auditLog.create({
        data: {
          organizationId: currentOrgId,
          userId: currentUserId,
          actionType: 'TICKET_COMMENT_CREATE',
          metadata: { ticketId: id, commentId: comment.id }
        }
      });

      return comment;
    });

    res.status(201).json(newComment);
  } catch (err) {
    next(err);
  }
};

// 7. Add attachment to ticket
export const addAttachment = async (req, res, next) => {
  const { id } = req.params;
  const { filename, url } = req.body;
  const currentOrgId = req.activeOrgId;
  const currentUserId = req.user.id;

  if (!filename || !url) {
    return res.status(400).json({ error: 'Missing filename or url parameters' });
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { sharedWith: true }
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    // BOLA defense
    if (ticket.organizationId !== currentOrgId && !ticket.sharedWith.some(s => s.sharedWithId === currentOrgId)) {
      return res.status(403).json({ error: 'Access unauthorized for this ticket context' });
    }

    const attachment = await prisma.$transaction(async (tx) => {
      const att = await tx.attachment.create({
        data: {
          ticketId: id,
          filename,
          url
        }
      });

      await tx.auditLog.create({
        data: {
          organizationId: currentOrgId,
          userId: currentUserId,
          actionType: 'TICKET_ATTACHMENT_ADD',
          metadata: { ticketId: id, filename }
        }
      });

      return att;
    });

    res.status(201).json(attachment);
  } catch (err) {
    next(err);
  }
};
