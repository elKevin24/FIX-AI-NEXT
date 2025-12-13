// prisma/prisma.config.ts
import { defineConfig } from '@prisma/cli';

export default defineConfig({
  datasources: {
    db: {
      url: process.env.DATABASE_URL!,
      // Add other datasource options here if needed, like 'schemas'
    },
  },
  // Add specific Migrate configuration for Prisma 7
  migrate: {
    connection: {
      url: process.env.DATABASE_URL!, // URL used by Prisma Migrate
    },
  },
});