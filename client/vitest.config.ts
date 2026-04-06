import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/renderer/src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@renderer': '/src/renderer/src',
    },
  },
});
