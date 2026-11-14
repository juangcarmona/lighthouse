import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const baseUrl = process.env.PUBLIC_SITE_URL || 'http://127.0.0.1:4174';
const output = resolve(process.env.PUBLIC_SITE_SCREENSHOT_DIR || 'test-results/public-site');
const portals = [
  { name: 'landing', path: '/' },
  { name: 'flow-gallery', path: '/#diagrams', gallery: true },
  { name: 'product-model', path: '/model/index.html', explorer: true },
  { name: 'architecture', path: '/architecture/index.html' },
  { name: 'runtime', path: '/architecture/index.html#/section/06', interactive: true },
  { name: 'product-flow', path: '/architecture/index.html#/section/06/product-definition-as-code', interactive: true },
  { name: 'refine-flow', path: '/architecture/index.html#/section/06/refine', interactive: true },
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
      const explorerErrors = [];
      if (portal.explorer) {
        page.on('pageerror', error => explorerErrors.push(error.message));
        page.on('requestfailed', request => explorerErrors.push(`${request.url()}: ${request.failure()?.errorText}`));
        page.on('response', response => { if (response.status() >= 400) explorerErrors.push(`${response.status()}: ${response.url()}`); });
      }
      const response = await page.goto(new URL(portal.path, baseUrl).toString(), { waitUntil: 'networkidle' });
      if (!response || !response.ok()) {
        throw new Error(`Portal returned ${response?.status() ?? 'no response'}: ${portal.path}`);
      }
      if (portal.interactive) {
        await page.locator('#content iframe[data-native-frame]').first().scrollIntoViewIfNeeded();
        await page.locator('#content iframe[data-native-frame][data-ready]').first().waitFor();
        const diagramUrl = await page.locator('#content a.native-open').first().getAttribute('href');
        const diagram = await page.request.get(new URL(diagramUrl, page.url()).toString());
        if (!diagram.ok()) throw new Error(`Interactive diagram returned ${diagram.status()}: ${diagramUrl}`);
      }
      if (portal.gallery) {
        await page.locator('#diagrams').scrollIntoViewIfNeeded();
        await page.locator('.diagram-card img').first().evaluate(image => image.decode());
      }
      await page.screenshot({
        path: resolve(output, `${portal.name}-${viewport.name}.png`),
        fullPage: !portal.gallery,
      });
      if (portal.explorer) {
        assert.match(await page.title(), /(?:^| · )Lighthouse’s Product Explorer$/u);
        await page.goto(new URL('#/artifacts', page.url()).toString(), { waitUntil: 'networkidle' });
        const group = page.locator('#artifact-list button[data-group]').first();
        if (await group.getAttribute('aria-expanded') === 'false') await group.click();
        await page.locator('#artifact-list a').first().click();
        await page.locator('#detail h3').first().waitFor();
        assert.deepEqual(explorerErrors, [], `Product Explorer failed at ${viewport.name}`);
      }
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(`Captured ${portals.length * viewports.length} Lighthouse portal screenshots in ${output}.`);
