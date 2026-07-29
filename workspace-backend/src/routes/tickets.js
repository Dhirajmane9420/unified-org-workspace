import express from 'express';
import { verifyToken } from '../middlewares/auth.js';
import { tenantGuard } from '../middlewares/tenantGuard.js';
import { getTickets, getTicketById, createTicket } from '../controllers/tickets.js';

const router = express.Router();

// Enforce security middleware globally across this router context
router.use(verifyToken);
router.use(tenantGuard);

// Map paths directly to cleanly isolated controllers
router.get('/', getTickets);
router.get('/:id', getTicketById);
router.post('/', createTicket);

export default router;