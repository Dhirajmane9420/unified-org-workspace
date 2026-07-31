import express from 'express';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const router = express.Router();

// POST /api/webhooks/github
router.post('/github', async (req, res) => {
  try {
    const githubEvent = req.headers['x-github-event'];
    const payload = req.body;

    if (githubEvent === 'pull_request') {
      const action = payload.action; 
      const prData = payload.pull_request;
      
      // 1. BYPASS THE NAME MATCH FILTER: Read dynamically from query params, or fallback to the seed ID
      const targetOrganizationId = req.query.orgId || req.query.organizationId || "605b0b36-0434-44d6-b449-3278dab2c880"; 

      // 2. Fetch the organization to verify it exists in the system
      const organization = await prisma.organization.findUnique({
        where: { id: targetOrganizationId }
      });


      if (organization) {
        // Find an operational user context to prevent foreign key constraint violations
        let user = await prisma.user.findFirst({
          where: {
            email: {
              startsWith: prData.user.login,
              mode: 'insensitive'
            }
          }
        });

        if (!user) {
          const membership = await prisma.userOrgMembership.findFirst({
            where: { organizationId: organization.id },
            include: { user: true }
          });
          if (membership) {
            user = membership.user;
          }
        }

        if (!user) {
          user = await prisma.user.findFirst();
        }

        if (user) {
          // 3. Append the real live GitHub PR straight to your active organization context
          await prisma.auditLog.create({
            data: {
              actionType: `PR_${action.toUpperCase()}`,
              metadata: {
                prTitle: prData.title,
                prUrl: prData.html_url,
                user: prData.user.login,
                branch: `${prData.head.ref} → ${prData.base.ref}`,
                state: prData.state 
              },
              organizationId: organization.id,
              userId: user.id
            }
          });
          console.log(`Successfully logged PR action: PR_${action.toUpperCase()}`);

          // 4. Synchronize the actual PullRequest and PrVersion records in the database
          if (action === 'opened') {
            await prisma.$transaction(async (tx) => {
              const pr = await tx.pullRequest.create({
                data: {
                  organizationId: organization.id,
                  authorId: user.id,
                  title: prData.title,
                  description: prData.body || 'No description provided.',
                  status: 'IN_REVIEW',
                  currentVersion: 1
                }
              });

              await tx.prVersion.create({
                data: {
                  pullRequestId: pr.id,
                  versionNumber: 1,
                  title: prData.title,
                  description: prData.body || 'No description provided.',
                  rawDiff: `Branch: ${prData.head.ref} -> ${prData.base.ref}\nGitHub URL: ${prData.html_url}`
                }
              });
            });
            console.log(`Successfully synced PR creation: ${prData.title}`);
          } else if (action === 'synchronize') {
            const existingPR = await prisma.pullRequest.findFirst({
              where: {
                organizationId: organization.id,
                title: prData.title
              }
            });

            if (existingPR) {
              const nextVersion = existingPR.currentVersion + 1;
              await prisma.$transaction(async (tx) => {
                await tx.pullRequest.update({
                  where: { id: existingPR.id },
                  data: { currentVersion: nextVersion }
                });

                await tx.prVersion.create({
                  data: {
                    pullRequestId: existingPR.id,
                    versionNumber: nextVersion,
                    title: prData.title,
                    description: prData.body || 'No description provided.',
                    rawDiff: `Synchronized branch: ${prData.head.ref} -> ${prData.base.ref}\nGitHub URL: ${prData.html_url}\nTimestamp: ${new Date().toISOString()}`
                  }
                });
              });
              console.log(`Successfully synchronized PR version to #${nextVersion}: ${prData.title}`);
            }
          } else if (action === 'closed') {
            const existingPR = await prisma.pullRequest.findFirst({
              where: {
                organizationId: organization.id,
                title: prData.title
              }
            });

            if (existingPR) {
              const isMerged = prData.merged || false;
              const newStatus = isMerged ? 'MERGED' : 'CLOSED';
              await prisma.pullRequest.update({
                where: { id: existingPR.id },
                data: { status: newStatus }
              });
              console.log(`Successfully updated PR status to ${newStatus}: ${prData.title}`);
            }
          }
        } else {
          console.error("Pipeline failure: No operational user found in DB to link the audit row.");
        }
      } else {
        console.error(`Pipeline failure: Organization ID ${targetOrganizationId} not found in database.`);
      }
    }

    res.status(200).send('Webhook processed successfully');
  } catch (error) {
    console.error('Webhook processing failure:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;