import express from 'express';
import { verifyToken } from '../middlewares/auth.js';
import { tenantGuard } from '../middlewares/tenantGuard.js';
import { getAuditLogs, getAiDigest, exportAuditLogsToCsv } from '../controllers/audit.js';
import { authorizeRoles } from '../middlewares/rbacGuard.js';

const router = express.Router();

router.use(verifyToken);
router.use(tenantGuard);

router.get('/', getAuditLogs);
router.get('/ai-digest', getAiDigest);
// Add this route right below your existing routes in src/routes/audit.js
router.get('/export', authorizeRoles(['ORG_ADMIN', 'REVIEWER']), exportAuditLogsToCsv);

export default router;