import { defineConfig } from 'vitest/config';

// Benchmarks run in Node.js only, apart from the test projects of the root config.
export default defineConfig({
  test: {
    benchmark: { include: ['bench/**/*.bench.ts'] },
  },
});
