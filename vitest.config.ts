import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      // All tests use an in-memory DB by default.
      // persistence.test.ts overrides this with a temp file.
      CHRONICLE_DB_PATH: ':memory:',
    },
  },
});
