import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@prisma/client/runtime/library': path.resolve(__dirname, 'node_modules/@prisma/client/runtime/client'),
    },
    server: {
      deps: {
        inline: ['next-auth'],
      },
    },
    env: {
      RESEND_API_KEY: 're_dummy_123',
      DATABASE_URL: 'postgresql://dummy:dummy@localhost:5432/dummy?sslmode=require',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      all: true,
      exclude: [
        '**/*.test.*',
        '**/*.spec.*',
        '**/node_modules/**',
        'vitest.config.ts',
        'src/**/*.d.ts',
      ],
    },
  },
})
