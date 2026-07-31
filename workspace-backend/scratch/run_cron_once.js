import 'dotenv/config';
import { runDigestGenerationCycle } from '../src/workers/cronJob.js';

console.log('⏳ Running scheduled AI digest generation cycle once...');
runDigestGenerationCycle()
  .then(() => {
    console.log('✅ AI digest generation cycle completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Failed:', err);
    process.exit(1);
  });
