import { defineConfig } from '@prisma/config'
import 'dotenv/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    // Tells Prisma to use standard Node to run your JS seed file
    seed: 'tsx ./prisma/seed.js',
  },
})