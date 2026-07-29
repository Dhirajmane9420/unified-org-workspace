import express from 'express';
import { verifyToken } from '../middlewares/auth.js';
import { tenantGuard } from '../middlewares/tenantGuard.js';
import { authorizeRoles } from '../middlewares/rbacGuard.js';
import { getTickets, getTicketById, createTicket } from '../controllers/tickets.js';

const router = express.Router();

router.use(verifyToken);
router.use(tenantGuard);

// 1. Both Native Agents, Reviewers, and Org Admins can read the ticket queue
router.get('/', authorizeRoles(['ORG_ADMIN', 'SUPPORT_AGENT', 'REVIEWER']), getTickets);

// 2. Cross-Org Guests can fetch individual items if explicitly shared
router.get('/:id', authorizeRoles(['ORG_ADMIN', 'SUPPORT_AGENT', 'REVIEWER', 'GUEST']), getTicketById);

// 3. Only internal staff can generate new tickets
router.post('/', authorizeRoles(['ORG_ADMIN', 'SUPPORT_AGENT']), createTicket);

export default router;