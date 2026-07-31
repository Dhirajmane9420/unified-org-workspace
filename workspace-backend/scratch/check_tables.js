import pg from 'pg';
import 'dotenv/config';

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public'
    `);
    console.log('Tables in database:', res.rows.map(r => r.table_name));
  } catch (err) {
    console.error('Query error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
