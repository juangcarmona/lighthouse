import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const theme of ['light', 'dark']) {
  test(`${theme}: accessible semantics, contrast and viewport`, async ({ page }, info) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/gallery/');
    await page.getByLabel('Appearance', { exact: true }).selectOption(theme);
    await expect(page.locator('html')).toHaveAttribute('data-lh-theme', theme);
    const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(report.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const contrasts = await page.evaluate(() => {
      const probe = document.createElement('span');
      document.body.append(probe);
      const context = document.createElement('canvas').getContext('2d');
      const luminance = (token) => {
        probe.style.color = `var(${token})`;
        context.fillStyle = getComputedStyle(probe).color;
        context.fillRect(0, 0, 1, 1);
        const rgb = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map((n) => n / 255);
        const linear = rgb.map((c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
        return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
      };
      const pairs = [
        ['--lh-text', '--lh-canvas'], ['--lh-text-muted', '--lh-canvas'],
        ['--lh-on-action', '--lh-action'], ['--lh-positive', '--lh-positive-surface'],
        ['--lh-caution', '--lh-caution-surface'], ['--lh-negative', '--lh-negative-surface']
      ];
      const result = pairs.map(([a, b]) => { const x = luminance(a), y = luminance(b); return { a, b, ratio: (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }; });
      probe.remove();
      return result;
    });
    for (const pair of contrasts) expect(pair.ratio, `${pair.a} / ${pair.b}`).toBeGreaterThanOrEqual(4.5);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `test-results/visual/${info.project.name}-${theme}.png`, fullPage: true });
  });
}

test('native dialog works with keyboard and returns focus', async ({ page }) => {
  await page.goto('/gallery/');
  const opener = page.getByRole('button', { name: 'Open example' });
  await opener.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Item name')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('composition adds literal text, rejects whitespace and can reset', async ({ page }) => {
  await page.goto('/gallery/');
  await page.locator('#new-item').click();
  await page.getByLabel('Item name').fill('   ');
  await page.getByRole('dialog').getByRole('button', { name: 'Add item', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Item name').fill('<script>bad()</script>');
  await page.getByRole('dialog').getByRole('button', { name: 'Add item', exact: true }).click();
  await expect(page.locator('#review-items tr')).toHaveCount(4);
  await expect(page.locator('#review-items')).toContainText('<script>bad()</script>');
  await expect(page.locator('#review-items script')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reset example' }).click();
  await expect(page.locator('#review-items tr')).toHaveCount(3);
});

test('system appearance follows the browser and explicit choice persists', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/gallery/');
  const dark = await page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor);
  await page.emulateMedia({ colorScheme: 'light' });
  const light = await page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(light).not.toBe(dark);
  await page.getByLabel('Appearance', { exact: true }).selectOption('dark');
  await page.reload();
  await expect(page.getByLabel('Appearance', { exact: true })).toHaveValue('dark');
});
