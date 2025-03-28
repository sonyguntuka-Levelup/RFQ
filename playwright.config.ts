// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src/tests',
  timeout: 30000,
  reporter: [['list'], ['html', { outputFolder: 'test-results' }]],
  use: { baseURL: 'https://camsapi-dev.aquanow.io' },
});
