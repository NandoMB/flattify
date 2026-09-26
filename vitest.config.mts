import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // bench/ has its own config: `pnpm bench` and `pnpm claims`.
    include: ['src/**/*.spec.ts'],
    allowOnly: true,
    coverage: {
      provider: 'istanbul',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts'],
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      thresholds: { 100: true }
    },
    resolveSnapshotPath: (testPath, snapExtension) => testPath + snapExtension,
    projects: [
      {
        extends: true,
        test: { name: 'node' }
      },
      {
        extends: true,
        test: {
          name: 'browser',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }, { browser: 'firefox' }, { browser: 'webkit' }]
          }
        }
      }
    ]
  }
});
