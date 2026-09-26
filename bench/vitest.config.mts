import { defineConfig } from 'vitest/config';

// Benchmarks and README claims run in Node.js only, apart from the test projects of the root config.
export default defineConfig({
  test: {
    include: ['bench/**/*.spec.ts'],
    benchmark: { include: ['bench/**/*.bench.ts'] },
    // Load the built package with Node.js itself, as the other libraries are loaded from node_modules.
    // Through Vitest's module runner, every import between its chunks would go through a getter.
    server: { deps: { external: [/\/dist\//] } },
  },
});
