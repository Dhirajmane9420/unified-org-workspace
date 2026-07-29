import express from 'express';
import { verifyToken } from '../middlewares/auth.js';
import { tenantGuard } from '../middlewares/tenantGuard.js';
import { authorizeRoles } from '../middlewares/rbacGuard.js';
import { getPullRequests, createPullRequest, reviewPullRequest, mergePullRequest, getPullRequestDiff } from '../controllers/pullRequests.js';

const router = express.Router();

router.use(verifyToken);
router.use(tenantGuard);

// Block Support Agents out of the entire Dashboard 2 routing architecture entirely[cite: 1]
router.use(authorizeRoles(['ORG_ADMIN', 'REVIEWER']));

router.get('/', getPullRequests);
router.post('/', createPullRequest);
router.post('/:id/review', reviewPullRequest);
router.post('/:id/merge', mergePullRequest);
// Add this route right below your existing routes in src/routes/pullRequests.js
router.get('/:id/diff', getPullRequestDiff);

export default router;