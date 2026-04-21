import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000, // remote DB calls can be slow
    hookTimeout: 30000,
  },
});
