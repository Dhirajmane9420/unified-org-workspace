import express from 'express';
import { verifyToken } from '../middlewares/auth.js';
import { tenantGuard } from '../middlewares/tenantGuard.js';
import { getPullRequests, createPullRequest, reviewPullRequest, mergePullRequest, updatePullRequest } from '../controllers/pullRequests.js';

const router = express.Router();

router.use(verifyToken);
router.use(tenantGuard);

router.get('/', getPullRequests);
router.post('/', createPullRequest);
router.put('/:id', updatePullRequest);
router.post('/:id/review', reviewPullRequest);
router.post('/:id/merge', mergePullRequest);

export default router;