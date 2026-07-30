import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { GoogleGenAI } from '@google/genai';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Initialize the modern Google Gen AI client wrapper
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Aggregates workspace data across both dashboards and generates an operational summary via Gemini API.
 * @param {string} organizationId - Target tenant workspace identifier
 */
export async function generateWorkspaceDigest(organizationId) {
  let contextMap = {
    openSupportTickets: 0,
    recentTicketTitles: [],
    pendingCodeReviews: 0,
    recentPullRequests: []
  };

  try {
    console.log(`🤖 Starting background AI analysis for organization context: ${organizationId}`);

    // 1. Gather context data across Dashboard 1 (Support Hub)
    const openTicketsCount = await prisma.ticket.count({
      where: {
        OR: [
          { organizationId },
          { sharedWith: { some: { sharedWithId: organizationId } } }
        ],
        status: 'OPEN'
      }
    });

    const recentTickets = await prisma.ticket.findMany({
      where: {
        OR: [
          { organizationId },
          { sharedWith: { some: { sharedWithId: organizationId } } }
        ]
      },
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
    contextMap = {
      openSupportTickets: openTicketsCount,
      recentTicketTitles: recentTickets.map(t => `[${t.status}] ${t.title}`),
      pendingCodeReviews: pendingPRsCount,
      recentPullRequests: recentPRs.map(p => `v${p.currentVersion} - ${p.title}`)
    };

    // 4. Validate API key operational state or switch to local engine fallback
    if (!process.env.GEMINI_API_KEY) {
      console.warn('⚠️ Missing valid GEMINI_API_KEY credentials. Falling back to local fallback digest builder.');
      return buildMockDigest(contextMap);
    }

    // 5. Query the production Gemini model using the modern generateContent paradigm
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: 'You are an elite operational dashboard manager. Synthesize the provided multi-tenant application health status map into a concise, professional 3-sentence summary digest report.',
        temperature: 0.3
      },
      contents: `Analyze this system context dashboard data map: ${JSON.stringify(contextMap)}`
    });

    if (!response.text) {
      throw new Error('LLM API Gateway returned an empty text response.');
    }

    const cleanDigestText = response.text.trim();
    console.log('✅ AI Analysis digest completed successfully via Gemini.');
    return cleanDigestText;

  } catch (error) {
    console.error('❌ Failed to execute AI workspace digest tracking sequence:', error.message);
    console.warn('⚠️ Falling back to local fallback digest builder.');
    return buildMockDigest(contextMap);
  }
}

// Fallback algorithm structure if external API tokens aren't immediately active
function buildMockDigest(data) {
  return `Workspace Status Report: There are currently ${data.openSupportTickets} active support tickets pending resolution within the system workspace queue. Code review velocity shows ${data.pendingCodeReviews} pull requests awaiting validation checks before production integration. Overall operations remain stable.`;
}