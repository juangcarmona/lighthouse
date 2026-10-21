import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const baseUrl = process.env.PUBLIC_SITE_URL || 'http://127.0.0.1:4174';
const output = resolve(process.env.PUBLIC_SITE_SCREENSHOT_DIR || 'test-results/public-site');
const portals = [
  { name: 'landing', path: '/' },
  { name: 'product-model', path: '/model/index.html' },
  { name: 'architecture', path: '/architecture/index.html' },
];
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
];

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    for (const portal of portals) {
      const page = await context.newPage();
      const response = await page.goto(new URL(portal.path, baseUrl).toString(), { waitUntil: 'networkidle' });
      if (!response || !response.ok()) {
        throw new Error(`Portal returned ${response?.status() ?? 'no response'}: ${portal.path}`);
      }
      await page.screenshot({
        path: resolve(output, `${portal.name}-${viewport.name}.png`),
        fullPage: true,
      });
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(`Captured ${portals.length * viewports.length} Lighthouse portal screenshots in ${output}.`);
