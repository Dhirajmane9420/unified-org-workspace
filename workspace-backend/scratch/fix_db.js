import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('⏳ Checking database for connection records with empty string IDs...');
  
  const badConnections = await prisma.connection.findMany({
    where: { id: "" }
  });

  if (badConnections.length === 0) {
    console.log('✅ No connections with empty string IDs found.');
    await pool.end();
    return;
  }

  console.log(`⚠️ Found ${badConnections.length} bad connections. Re-creating with UUIDs...`);

  for (const conn of badConnections) {
    await prisma.$transaction(async (tx) => {
      // 1. Delete the bad record
      await tx.connection.delete({
        where: { id: "" }
      });
      // 2. Re-create it with standard auto-generated UUID
      const newConn = await tx.connection.create({
        data: {
          initiatorOrgId: conn.initiatorOrgId,
          targetOrgId: conn.targetOrgId,
          status: conn.status,
          createdAt: conn.createdAt
        }
      });
      console.log(`✅ Recreated connection between ${conn.initiatorOrgId} and ${conn.targetOrgId} with new ID: ${newConn.id}`);
    });
  }

  await pool.end();
}

main().catch(err => {
  console.error('❌ Failed to fix connections:', err);
  pool.end();
});
