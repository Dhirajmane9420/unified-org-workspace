import express from 'express';
import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { verifyToken } from '../middlewares/auth.js';
import { tenantGuard } from '../middlewares/tenantGuard.js';

const router = express.Router();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Enforce authentication and tenant validation universally across all PR endpoints
router.use(verifyToken);
router.use(tenantGuard);

// -----------------------------------------------------------------------------
// GET /api/v1/pull-requests (Fetch isolated workspace PRs)
// -----------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  const currentOrgId = req.activeOrgId;

  try {
    const pullRequests = await prisma.pullRequest.findMany({
      where: { organizationId: currentOrgId },
      include: {
        author: { select: { email: true } },
        reviewers: { include: { reviewer: { select: { email: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(pullRequests);
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// POST /api/v1/pull-requests (Create PR + Generate Initial Version Data Stack)
// -----------------------------------------------------------------------------
router.post('/', async (req, res, next) => {
  const { title, description, rawDiff, reviewerUserIds } = req.body;
  const currentOrgId = req.activeOrgId;
  const currentUserId = req.user.id;

  if (!title || !description || !rawDiff) {
    return res.status(400).json({ error: 'Missing title, description, or rawDiff codebase parameters' });
  }

  try {
    const newPR = await prisma.$transaction(async (tx) => {
      // 1. Create the base Pull Request model bound to the active tenant
      const pr = await tx.pullRequest.create({
        data: {
          organizationId: currentOrgId,
          authorId: currentUserId,
          title,
          description,
          status: 'IN_REVIEW',
          currentVersion: 1
        }
      });

      // 2. Generate the initial immutable snapshot version for the code audit trail
      await tx.prVersion.create({
        data: {
          pullRequestId: pr.id,
          versionNumber: 1,
          title,
          description,
          rawDiff
        }
      });

      // 3. Map out explicit target reviewers if provided in payload execution hooks
      if (reviewerUserIds && Array.isArray(reviewerUserIds)) {
        const reviewerData = reviewerUserIds.map(id => ({
          pullRequestId: pr.id,
          reviewerId: id
        }));

        await tx.prReviewer.createMany({ data: reviewerData });
      }

      // 4. Record entry update to the append-only logging tables
      await tx.auditLog.create({
        data: {
          organizationId: currentOrgId,
          userId: currentUserId,
          actionType: 'PR_CREATE',
          metadata: { pullRequestId: pr.id, title: pr.title }
        }
      });

      return pr;
    });

    res.status(201).json(newPR);
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// PUT /api/v1/pull-requests/:id (Update PR / Push New Code Version)
// -----------------------------------------------------------------------------
router.put('/:id', async (req, res, next) => {
  const { id } = req.params;
  const { title, description, rawDiff } = req.body;
  const currentOrgId = req.activeOrgId;
  const currentUserId = req.user.id;

  try {
    // 1. Fetch current PR and verify BOLA ownership
    const pr = await prisma.pullRequest.findUnique({
      where: { id }
    });

    if (!pr || pr.organizationId !== currentOrgId) {
      return res.status(403).json({ error: 'Access unauthorized for this pull request resource' });
    }

    if (pr.status === 'MERGED') {
      return res.status(400).json({ error: 'Cannot update a merged pull request' });
    }

    const nextVersionNumber = pr.currentVersion + 1;

    // 2. Transactionally update PR details and push new immutable version snapshot
    const updatedPR = await prisma.$transaction(async (tx) => {
      // Update PR current version and optional metadata
      const prUpdate = await tx.pullRequest.update({
        where: { id },
        data: {
          title: title || pr.title,
          description: description || pr.description,
          currentVersion: nextVersionNumber
        }
      });

      // Create new PrVersion snapshot
      await tx.prVersion.create({
        data: {
          pullRequestId: id,
          versionNumber: nextVersionNumber,
          title: title || pr.title,
          description: description || pr.description,
          rawDiff: rawDiff || ''
        }
      });

      // Write action to Audit Log
      await tx.auditLog.create({
        data: {
          organizationId: currentOrgId,
          userId: currentUserId,
          actionType: 'PR_VERSION_UPDATE',
          metadata: { pullRequestId: id, versionNumber: nextVersionNumber }
        }
      });

      return prUpdate;
    });

    res.status(200).json({
      message: `Successfully pushed code update version #${nextVersionNumber}`,
      updatedPR
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// POST /api/v1/pull-requests/:id/review (Submit Approvals / Request Changes)
// -----------------------------------------------------------------------------
router.post('/:id/review', async (req, res, next) => {
  const { id } = req.params;
  const { approve, requestChanges } = req.body;
  const currentOrgId = req.activeOrgId;
  const currentUserId = req.user.id;

  try {
    // Verify the PR belongs to this organization to block BOLA manipulation attacks
    const pr = await prisma.pullRequest.findUnique({ where: { id } });
    if (!pr || pr.organizationId !== currentOrgId) {
      return res.status(403).json({ error: 'Unauthorized access operation context on target resource' });
    }

    // Update or verify the reviewer status mapping entry
    const reviewRecord = await prisma.prReviewer.upsert({
      where: {
        pullRequestId_reviewerId: {
          pullRequestId: id,
          reviewerId: currentUserId
        }
      },
      update: {
        hasApproved: !!approve,
        changesReq: !!requestChanges
      },
      create: {
        pullRequestId: id,
        reviewerId: currentUserId,
        hasApproved: !!approve,
        changesReq: !!requestChanges
      }
    });

    // Write action snapshot to append-only logging trail
    await prisma.auditLog.create({
      data: {
        organizationId: currentOrgId,
        userId: currentUserId,
        actionType: approve ? 'PR_APPROVE' : 'PR_CHANGES_REQUESTED',
        metadata: { pullRequestId: id }
      }
    });

    res.status(200).json({ message: 'Review validation state registered successfully', reviewRecord });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// POST /api/v1/pull-requests/:id/merge (N-Approval Secure Check Execution Gate)
// -----------------------------------------------------------------------------
router.post('/:id/merge', async (req, res, next) => {
  const { id } = req.params;
  const currentOrgId = req.activeOrgId;
  const currentUserId = req.user.id;

  try {
    // 1. Structural BOLA defense check query
    const pr = await prisma.pullRequest.findUnique({
      where: { id },
      include: { reviewers: true }
    });

    if (!pr || pr.organizationId !== currentOrgId) {
      return res.status(403).json({ error: 'Access unauthorized for this pull request resource' });
    }

    if (pr.status === 'MERGED') {
      return res.status(400).json({ error: 'Pull request asset has already been merged' });
    }

    // 2. N-Approval Verification Gate Policy
    const totalReviewersCount = pr.reviewers.length;
    const approvalCount = pr.reviewers.filter(r => r.hasApproved).length;
    const executionBlockedByChanges = pr.reviewers.some(r => r.changesReq);

    if (executionBlockedByChanges) {
      return res.status(400).json({ error: 'Merge operation blocked: Active outstanding changes requested by reviewers' });
    }

    if (totalReviewersCount > 0 && approvalCount < totalReviewersCount) {
      return res.status(400).json({ 
        error: `Merge operation blocked: Requires full N-Approval status clearance (${approvalCount}/${totalReviewersCount} approved)` 
      });
    }

    // 3. Process the merge state change transactionally and commit the audit record
    const mergedPR = await prisma.$transaction(async (tx) => {
      const updatedPR = await tx.pullRequest.update({
        where: { id },
        data: { status: 'MERGED' }
      });

      await tx.auditLog.create({
        data: {
          organizationId: currentOrgId,
          userId: currentUserId,
          actionType: 'PR_MERGE',
          metadata: { pullRequestId: id }
        }
      });

      return updatedPR;
    });

    res.status(200).json({ message: 'Code changes merged successfully into current pipeline workspace', mergedPR });
  } catch (err) {
    next(err);
  }
});

export default router;