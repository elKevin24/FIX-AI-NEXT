// prisma/prisma.config.ts
import { defineConfig } from '@prisma/cli';

export default defineConfig({
  datasources: {
    db: {
      url: process.env.DATABASE_URL!, // Ensure DATABASE_URL is available in environment
    },
  },
  // We can add the migrate connection here if needed, but datasources.db.url should be enough for deploy
});
