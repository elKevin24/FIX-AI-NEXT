// prisma/prisma.config.ts
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  // This file lives in /prisma, so keep paths relative to it
  schema: './schema.prisma',
  migrations: {
    path: './migrations',
  },
  datasource: {
    // Prisma 7 expects datasource.url to live in prisma.config.ts (not schema.prisma)
    url: env('DATABASE_URL'),
  },
});
