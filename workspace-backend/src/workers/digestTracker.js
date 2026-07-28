import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Aggregates workspace data across both dashboards and generates an operational summary.
 * @param {string} organizationId - Target tenant workspace identifier
 */
export async function generateWorkspaceDigest(organizationId) {
  try {
    console.log(`🤖 Starting background AI analysis for organization context: ${organizationId}`);

    // 1. Gather context data across Dashboard 1 (Support Hub)
    const openTicketsCount = await prisma.ticket.count({
      where: { organizationId, status: 'OPEN' }
    });

    const recentTickets = await prisma.ticket.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { title: true, status: true }
    });

    // 2. Gather context data across Dashboard 2 (Review Console)
    const pendingPRsCount = await prisma.pullRequest.count({
      where: { organizationId, status: 'IN_REVIEW' }
    });

    const recentPRs = await prisma.pullRequest.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { title: true, currentVersion: true }
    });

    // 3. Compile structural context payload map
    const contextMap = {
      openSupportTickets: openTicketsCount,
      recentTicketTitles: recentTickets.map(t => `[${t.status}] ${t.title}`),
      pendingCodeReviews: pendingPRsCount,
      recentPullRequests: recentPRs.map(p => `v${p.currentVersion} - ${p.title}`)
    };

    // 4. Send telemetry map to the external LLM summarization gate
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.startsWith('sk-proj-placeholder')) {
      console.warn('⚠️ Missing valid OpenAI API Key credentials. Falling back to local fallback digest builder.');
      return buildMockDigest(contextMap);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an elite operational dashboard manager. Synthesize the provided multi-tenant application health status map into a concise, professional 3-sentence summary digest report.'
          },
          {
            role: 'user',
            content: `Analyze this system context dashboard data map: ${JSON.stringify(contextMap)}`
          }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`LLM API Gateway returned status code: ${response.status}`);
    }

    const result = await response.json();
    const cleanDigestText = result.choices[0].message.content.trim();

    console.log('✅ AI Analysis digest completed successfully.');
    return cleanDigestText;

  } catch (error) {
    console.error('❌ Failed to execute AI workspace digest tracking sequence:', error.message);
    throw error;
  }
}

// Fallback algorithm structure if external API tokens aren't immediately active
function buildMockDigest(data) {
  return `Workspace Status Report: There are currently ${data.openSupportTickets} active support tickets pending resolution within the system workspace queue. Code review velocity shows ${data.pendingCodeReviews} pull requests awaiting validation checks before production integration. Overall operations remain stable.`;
}