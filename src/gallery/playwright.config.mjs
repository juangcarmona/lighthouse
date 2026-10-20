import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const galleryRoot = fileURLToPath(new URL('.', import.meta.url));
const repositoryRoot = resolve(galleryRoot, '../..');

export default defineConfig({
  testDir: resolve(galleryRoot, 'tests'),
  outputDir: resolve(repositoryRoot, 'test-results'),
  fullyParallel: true,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: resolve(repositoryRoot, 'playwright-report'), open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { browserName: 'chromium', viewport: { width: 390, height: 844 } } }
  ],
  webServer: { command: 'node serve.mjs', cwd: galleryRoot, url: 'http://127.0.0.1:4173/gallery/', reuseExistingServer: false }
});
