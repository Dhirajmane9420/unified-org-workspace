import express from 'express';
import { verifyToken } from '../middlewares/auth.js';
import { tenantGuard } from '../middlewares/tenantGuard.js';
import { getAuditLogs, getAiDigest } from '../controllers/audit.js';

const router = express.Router();

router.use(verifyToken);
router.use(tenantGuard);

router.get('/', getAuditLogs);
router.get('/ai-digest', getAiDigest);

export default router;