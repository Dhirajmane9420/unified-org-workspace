import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const connections = await prisma.connection.findMany({
    include: {
      initiatorOrg: true,
      targetOrg: true,
    }
  });
  console.log('--- Current DB Connections ---');
  console.log(JSON.stringify(connections, null, 2));
  await pool.end();
}

main().catch(err => {
  console.error(err);
  pool.end();
});
