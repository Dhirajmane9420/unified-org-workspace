import express from 'express';
import { verifyToken } from '../middlewares/auth.js';
import { tenantGuard } from '../middlewares/tenantGuard.js';
import { authorizeRoles } from '../middlewares/rbacGuard.js';
import { requestConnection, approveConnection, revokeConnection } from '../controllers/connections.js';

const router = express.Router();

router.use(verifyToken);
router.use(tenantGuard);

// Only Workspace Admins can modify organizational connection channels
router.use(authorizeRoles(['ORG_ADMIN']));

router.post('/request', requestConnection);
router.post('/:id/approve', approveConnection);
router.delete('/:id/revoke', revokeConnection);

export default router;