import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const getPullRequests = async (req, res, next) => {
  const currentOrgId = req.activeOrgId;
  try {
    const pullRequests = await prisma.pullRequest.findMany({
      where: {
        OR: [
          { organizationId: currentOrgId },
          { sharedWith: { some: { sharedWithId: currentOrgId } } }
        ]
      },
      include: {
        author: { select: { email: true } },
        reviewers: { include: { reviewer: { select: { email: true } } } },
        sharedWith: { select: { sharedWithId: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(pullRequests);
  } catch (err) {
    next(err);
  }
};

export const createPullRequest = async (req, res, next) => {
  const { title, description, rawDiff, reviewerUserIds } = req.body;
  const currentOrgId = req.activeOrgId;
  const currentUserId = req.user.id;

  if (!title || !description || !rawDiff) {
    return res.status(400).json({ error: 'Missing title, description, or rawDiff codebase parameters' });
  }

  try {
    const newPR = await prisma.$transaction(async (tx) => {
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

      await tx.prVersion.create({
        data: { pullRequestId: pr.id, versionNumber: 1, title, description, rawDiff }
      });

      if (reviewerUserIds && Array.isArray(reviewerUserIds)) {
        const reviewerData = reviewerUserIds.map(id => ({ pullRequestId: pr.id, reviewerId: id }));
        await tx.prReviewer.createMany({ data: reviewerData });
      }

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
};

export const reviewPullRequest = async (req, res, next) => {
  const { id } = req.params;
  const { approve, requestChanges } = req.body;
  const currentOrgId = req.activeOrgId;
  const currentUserId = req.user.id;

  try {
    const pr = await prisma.pullRequest.findFirst({
      where: {
        id,
        OR: [
          { organizationId: currentOrgId },
          { sharedWith: { some: { sharedWithId: currentOrgId } } }
        ]
      }
    });
    if (!pr) {
      return res.status(403).json({ error: 'Unauthorized access operation context on target resource' });
    }

    const reviewRecord = await prisma.prReviewer.upsert({
      where: { pullRequestId_reviewerId: { pullRequestId: id, reviewerId: currentUserId } },
      update: { hasApproved: !!approve, changesReq: !!requestChanges },
      create: { pullRequestId: id, reviewerId: currentUserId, hasApproved: !!approve, changesReq: !!requestChanges }
    });

    await prisma.auditLog.create({
      data: { organizationId: currentOrgId, userId: currentUserId, actionType: approve ? 'PR_APPROVE' : 'PR_CHANGES_REQUESTED', metadata: { pullRequestId: id } }
    });

    res.status(200).json({ message: 'Review validation state registered successfully', reviewRecord });
  } catch (err) {
    next(err);
  }
};

export const mergePullRequest = async (req, res, next) => {
  const { id } = req.params;
  const currentOrgId = req.activeOrgId;
  const currentUserId = req.user.id;

  try {
    const pr = await prisma.pullRequest.findFirst({
      where: {
        id,
        OR: [
          { organizationId: currentOrgId },
          { sharedWith: { some: { sharedWithId: currentOrgId } } }
        ]
      },
      include: { reviewers: true }
    });

    if (!pr) {
      return res.status(403).json({ error: 'Access unauthorized for this pull request resource' });
    }

    if (pr.status === 'MERGED') {
      return res.status(400).json({ error: 'Pull request asset has already been merged' });
    }

    const totalReviewersCount = pr.reviewers.length;
    const approvalCount = pr.reviewers.filter(r => r.hasApproved).length;
    const executionBlockedByChanges = pr.reviewers.some(r => r.changesReq);

    if (executionBlockedByChanges) {
      return res.status(400).json({ error: 'Merge operation blocked: Active outstanding changes requested by reviewers' });
    }

    if (totalReviewersCount > 0 && approvalCount < totalReviewersCount) {
      return res.status(400).json({ error: `Merge operation blocked: Requires full N-Approval status clearance (${approvalCount}/${totalReviewersCount} approved)` });
    }

    const mergedPR = await prisma.$transaction(async (tx) => {
      const updatedPR = await tx.pullRequest.update({ where: { id }, data: { status: 'MERGED' } });
      await tx.auditLog.create({ data: { organizationId: currentOrgId, userId: currentUserId, actionType: 'PR_MERGE', metadata: { pullRequestId: id } } });
      return updatedPR;
    });

    res.status(200).json({ message: 'Code changes merged successfully into current pipeline workspace', mergedPR });
  } catch (err) {
    next(err);
  }
};

export const updatePullRequest = async (req, res, next) => {
  const { id } = req.params;
  const { title, description, rawDiff } = req.body;
  const currentOrgId = req.activeOrgId;
  const currentUserId = req.user.id;

  try {
    const pr = await prisma.pullRequest.findUnique({ where: { id } });

    if (!pr || pr.organizationId !== currentOrgId) {
      return res.status(403).json({ error: 'Access unauthorized for this pull request resource' });
    }

    if (pr.status === 'MERGED') {
      return res.status(400).json({ error: 'Cannot update a merged pull request' });
    }

    const nextVersionNumber = pr.currentVersion + 1;

    const updatedPR = await prisma.$transaction(async (tx) => {
      const prUpdate = await tx.pullRequest.update({
        where: { id },
        data: {
          title: title || pr.title,
          description: description || pr.description,
          currentVersion: nextVersionNumber
        }
      });

      await tx.prVersion.create({
        data: {
          pullRequestId: id,
          versionNumber: nextVersionNumber,
          title: title || pr.title,
          description: description || pr.description,
          rawDiff: rawDiff || ''
        }
      });

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
};


// Append this method to your existing src/controllers/pullRequests.js file

export const getPullRequestDiff = async (req, res, next) => {
  const { id } = req.params;
  const { targetVersion } = req.query; // targetVersion indicates the version number to check
  const currentOrgId = req.activeOrgId;

  if (!targetVersion) {
    return res.status(400).json({ error: 'Missing targetVersion query parameter string' });
  }

  try {
    // 1. Defend authorization boundary using primary BOLA filter
    const pr = await prisma.pullRequest.findFirst({
      where: {
        id,
        OR: [
          { organizationId: currentOrgId },
          { sharedWith: { some: { sharedWithId: currentOrgId } } }
        ]
      }
    });
    if (!pr) {
      return res.status(403).json({ error: 'Access unauthorized for this pull request resource' });
    }

    const versionNum = parseInt(targetVersion, 10);

    // 2. Fetch target snapshot alongside its mathematical predecessor
    const versions = await prisma.prVersion.findMany({
      where: {
        pullRequestId: id,
        versionNumber: { in: [versionNum, versionNum - 1] }
      },
      orderBy: { versionNumber: 'asc' }
    });

    const currentSnapshot = versions.find(v => v.versionNumber === versionNum);
    const previousSnapshot = versions.find(v => v.versionNumber === versionNum - 1);

    if (!currentSnapshot) {
      return res.status(404).json({ error: 'Requested version snapshot record not found' });
    }

    res.status(200).json({
      pullRequestId: id,
      comparingVersion: versionNum,
      baseVersion: previousSnapshot ? versionNum - 1 : 'INITIAL_COMMIT',
      diffView: {
        currentDiffText: currentSnapshot.rawDiff,
        previousDiffText: previousSnapshot ? previousSnapshot.rawDiff : ''
      }
    });
  } catch (err) {
    next(err);
  }
};

export const sharePullRequest = async (req, res, next) => {
  const { id } = req.params;
  const { targetOrgId, targetOrganizationId } = req.body;
  const finalTargetOrgId = targetOrgId || targetOrganizationId;
  const currentOrgId = req.activeOrgId;
  const currentUserId = req.user.id;

  if (!finalTargetOrgId) {
    return res.status(400).json({ error: 'Missing target organization ID context parameters' });
  }

  try {
    // 1. Check if PR exists and belongs to current organization
    const pr = await prisma.pullRequest.findUnique({
      where: { id }
    });

    if (!pr || pr.organizationId !== currentOrgId) {
      return res.status(403).json({ error: 'Unauthorized to share this pull request resource' });
    }

    // 2. Verify approved connection exists between organizations
    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { initiatorOrgId: currentOrgId, targetOrgId: finalTargetOrgId, status: 'APPROVED' },
          { initiatorOrgId: finalTargetOrgId, targetOrgId: currentOrgId, status: 'APPROVED' }
        ]
      }
    });

    if (!connection) {
      return res.status(400).json({ error: 'No active approved relationship connection exists with the target organization' });
    }

    // 3. Create SharedPR entry
    const sharedPR = await prisma.sharedPR.upsert({
      where: {
        pullRequestId_sharedWithId: {
          pullRequestId: id,
          sharedWithId: finalTargetOrgId
        }
      },
      update: {},
      create: {
        pullRequestId: id,
        sharedWithId: finalTargetOrgId
      }
    });

    // 4. Create Audit Logs for both organizations so it appears in both timelines
    await prisma.auditLog.create({
      data: {
        organizationId: currentOrgId,
        userId: currentUserId,
        actionType: 'PR_SHARE',
        metadata: { pullRequestId: id, sharedWithId: finalTargetOrgId }
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: finalTargetOrgId,
        userId: currentUserId,
        actionType: 'PR_SHARE',
        metadata: { pullRequestId: id, sharedWithId: finalTargetOrgId, inbound: true }
      }
    });

    res.status(200).json({
      message: 'Pull request successfully shared cross-organization',
      sharedPR
    });
  } catch (err) {
    next(err);
  }
};