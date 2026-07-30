import { defineConfig, env } from 'prisma/config' // Added "env" import here
import 'dotenv/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'), // Swapped out process.env for the native helper
  },
  migrations: {
    // Tells Prisma to use standard Node to run your JS seed file
    seed: 'tsx ./prisma/seed.js',
  },
})