import 'dotenv/config';
import { PrismaClient } from './generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import jwt from 'jsonwebtoken';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-workspace-tenant-signing-key-2026';
const BACKEND_URL = 'http://localhost:5000';

// Helper to generate a valid test token
function generateToken(userId, email) {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '1h' });
}

async function runTests() {
  console.log('🛡️ Starting Automated Security Scoping & BOLA Isolation Verification Suite...\n');

  // 1. Resolve test users and organizations
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@acme.com' } });
  const agentUser = await prisma.user.findUnique({ where: { email: 'agent@acme.com' } });
  const reviewerUser = await prisma.user.findUnique({ where: { email: 'reviewer@stark.com' } });

  const orgAcme = await prisma.organization.findFirst({ where: { name: 'Acme Corp' } });
  const orgStark = await prisma.organization.findFirst({ where: { name: 'Stark Industries' } });

  if (!adminUser || !agentUser || !reviewerUser || !orgAcme || !orgStark) {
    console.error('❌ Error: Seed data is missing. Please run `npm run db:seed` first before running tests.');
    process.exit(1);
  }

  // Generate authorization tokens
  const adminToken = generateToken(adminUser.id, adminUser.email);
  const agentToken = generateToken(agentUser.id, agentUser.email);
  const reviewerToken = generateToken(reviewerUser.id, reviewerUser.email);

  // Find a ticket belonging to Acme
  const acmeTickets = await prisma.ticket.findMany({ where: { organizationId: orgAcme.id } });
  if (acmeTickets.length === 0) {
    console.error('❌ Error: No Acme tickets found to perform isolation checks.');
    process.exit(1);
  }

  // Set up a ticket shared with Stark and one unshared
  const sharedTicket = acmeTickets[0]; // will represent the shared ticket
  let unsharedTicket = acmeTickets.find(t => t.id !== sharedTicket.id);

  if (!unsharedTicket) {
    // Create an unshared one if only one exists
    unsharedTicket = await prisma.ticket.create({
      data: {
        organizationId: orgAcme.id,
        title: 'Confidential Internal Financial Audit Request',
        description: 'Sensitive records, do not share cross-org.',
        status: 'OPEN'
      }
    });
  }

  // Ensure sharing mappings are aligned
  await prisma.sharedItem.deleteMany({
    where: { ticketId: { in: [sharedTicket.id, unsharedTicket.id] } }
  });

  await prisma.sharedItem.create({
    data: {
      ticketId: sharedTicket.id,
      sharedWithId: orgStark.id
    }
  });

  console.log(`🎫 Test Setup:`);
  console.log(`   - Shared Ticket (Acme -> Stark): "${sharedTicket.title}" (${sharedTicket.id})`);
  console.log(`   - Unshared Ticket (Acme Internal): "${unsharedTicket.title}" (${unsharedTicket.id})`);
  console.log('');

  const testResults = [];

  async function checkCase(description, url, method, token, activeOrgId, expectedStatus, requestBody = null) {
    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'x-active-org-id': activeOrgId,
        'Content-Type': 'application/json'
      };

      const options = { method, headers };
      if (requestBody) {
        options.body = JSON.stringify(requestBody);
      }

      const res = await fetch(`${BACKEND_URL}${url}`, options);
      const passed = res.status === expectedStatus;

      testResults.push({
        description,
        status: res.status,
        expected: expectedStatus,
        passed
      });

      if (passed) {
        console.log(`✅ PASS: ${description}`);
      } else {
        const bodyText = await res.text();
        console.log(`❌ FAIL: ${description} (Expected ${expectedStatus}, Got ${res.status})`);
        console.log(`         Response body: ${bodyText}`);
      }
    } catch (err) {
      console.log(`❌ FAIL: ${description} (Request error: ${err.message})`);
      testResults.push({
        description,
        status: 'ERROR',
        expected: expectedStatus,
        passed: false
      });
    }
  }

  // --- TEST GROUP 1: BOLA Tenant Isolation ---
  console.log('--- TEST GROUP 1: BOLA & Cross-Org Isolation Verification ---');
  
  await checkCase(
    'Acme Admin retrieves owned ticket',
    `/api/v1/tickets/${unsharedTicket.id}`,
    'GET',
    adminToken,
    orgAcme.id,
    200
  );

  await checkCase(
    'Stark Reviewer attempts to retrieve unshared Acme ticket (BOLA check)',
    `/api/v1/tickets/${unsharedTicket.id}`,
    'GET',
    reviewerToken,
    orgStark.id,
    403
  );

  await checkCase(
    'Stark Reviewer retrieves shared Acme ticket (Cross-Org access check)',
    `/api/v1/tickets/${sharedTicket.id}`,
    'GET',
    reviewerToken,
    orgStark.id,
    200
  );

  // --- TEST GROUP 2: Role-Based Access Control (RBAC) ---
  console.log('\n--- TEST GROUP 2: RBAC Validation ---');
  
  await checkCase(
    'Support Agent attempts to load PR list (RBAC check - Dashboard 2 access blocked)',
    `/api/v1/pull-requests`,
    'GET',
    agentToken,
    orgAcme.id,
    403
  );

  await checkCase(
    'Stark Reviewer accesses PR review suite (RBAC check - authorized)',
    `/api/v1/pull-requests`,
    'GET',
    reviewerToken,
    orgStark.id,
    200
  );

  // --- TEST GROUP 3: Scoped AI Digests Data Leakage Prevention ---
  console.log('\n--- TEST GROUP 3: AI Digests Leakage check ---');
  
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/audit-logs/ai-digest`, {
      headers: {
        'Authorization': `Bearer ${reviewerToken}`,
        'x-active-org-id': orgStark.id
      }
    });

    if (res.status === 200) {
      const data = await res.json();
      const summary = data.digestSummary || '';
      
      const containsUnsharedKeyword = summary.toLowerCase().includes('latency') || summary.toLowerCase().includes('confidential');
      
      if (!containsUnsharedKeyword) {
        console.log('✅ PASS: Stark AI Digest context does not contain Acme unshared ticket keywords.');
        testResults.push({ description: 'Stark AI Digest context isolation', passed: true });
      } else {
        console.log('❌ FAIL: Stark AI Digest context leaked Acme private database titles.');
        testResults.push({ description: 'Stark AI Digest context isolation', passed: false });
      }
    } else {
      console.log(`❌ FAIL: Unable to fetch Stark AI Digest (Status ${res.status})`);
      testResults.push({ description: 'Stark AI Digest fetch check', passed: false });
    }
  } catch (err) {
    console.log(`❌ FAIL: AI Digest leakage verification error: ${err.message}`);
    testResults.push({ description: 'AI Digest check', passed: false });
  }

  // --- TEST GROUP 4: Session Revocation ---
  console.log('\n--- TEST GROUP 4: Session Revocation Verification ---');
  
  // Log out the agent token
  await fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${agentToken}` }
  });

  // Verify subsequent API call with the revoked token fails
  await checkCase(
    'Query using revoked token signature must fail authentication checks',
    `/api/v1/tickets`,
    'GET',
    agentToken,
    orgAcme.id,
    401
  );

  // Final Summary Report
  console.log('\n======================================');
  console.log('📊 SECURITY SUITE RUN COMPLETE SUMMARY:');
  const totalPassed = testResults.filter(r => r.passed).length;
  console.log(`   - Tests Run: ${testResults.length}`);
  console.log(`   - Passed: ${totalPassed}`);
  console.log(`   - Failed: ${testResults.length - totalPassed}`);
  console.log('======================================');

  await pool.end();
  process.exit(testResults.length === totalPassed ? 0 : 1);
}

runTests();
