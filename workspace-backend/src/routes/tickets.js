import express from 'express';
import { verifyToken } from '../middlewares/auth.js';
import { tenantGuard } from '../middlewares/tenantGuard.js';
import { authorizeRoles } from '../middlewares/rbacGuard.js';
import { 
  getTickets, 
  getTicketById, 
  createTicket, 
  updateTicket, 
  deleteTicket,
  createComment,
  addAttachment,
  shareTicket
} from '../controllers/tickets.js';

const router = express.Router();

router.use(verifyToken);
router.use(tenantGuard);

// Existing pathways
router.get('/', authorizeRoles(['ORG_ADMIN', 'SUPPORT_AGENT', 'REVIEWER']), getTickets);
router.get('/:id', authorizeRoles(['ORG_ADMIN', 'SUPPORT_AGENT', 'REVIEWER', 'GUEST']), getTicketById);
router.post('/', authorizeRoles(['ORG_ADMIN', 'SUPPORT_AGENT']), createTicket);

// New full CRUD compliance pathways
router.patch('/:id', authorizeRoles(['ORG_ADMIN', 'SUPPORT_AGENT']), updateTicket);
router.delete('/:id', authorizeRoles(['ORG_ADMIN']), deleteTicket);

// Comment & Attachment pathways
router.post('/:id/comments', authorizeRoles(['ORG_ADMIN', 'SUPPORT_AGENT', 'REVIEWER', 'GUEST']), createComment);
router.post('/:id/attachments', authorizeRoles(['ORG_ADMIN', 'SUPPORT_AGENT', 'REVIEWER']), addAttachment);
router.post('/:id/share', authorizeRoles(['ORG_ADMIN', 'SUPPORT_AGENT']), shareTicket);

export default router;