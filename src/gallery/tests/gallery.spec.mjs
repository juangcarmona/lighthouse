import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

test.use({ launchOptions: process.env.PUPPETEER_EXECUTABLE_PATH ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH } : {} });

for (const appearance of [
  { theme: 'light', system: 'light', name: 'light' },
  { theme: 'dark', system: 'dark', name: 'dark' },
  { theme: 'system', system: 'light', name: 'system-light' },
  { theme: 'system', system: 'dark', name: 'system-dark' },
]) {
  const { theme, system, name } = appearance;
  test(`${name}: accessible semantics, contrast and viewport`, async ({ page }, info) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.emulateMedia({ colorScheme: system, reducedMotion: 'reduce' });
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
    const effective = await page.evaluate(() => {
      const probe = document.createElement('span');
      document.body.append(probe);
      const comparisons = [
        ['body', 'backgroundColor', '--lh-canvas'], ['body', 'color', '--lh-text'],
        ['.lh-card', 'backgroundColor', '--lh-surface'],
        ['.lh-input', 'borderTopColor', '--lh-border-strong'],
        ['.lh-button:not([data-variant])', 'backgroundColor', '--lh-action'],
        ['.lh-button:not([data-variant])', 'color', '--lh-on-action'],
        ['.lh-badge[data-tone="positive"]', 'color', '--lh-positive'],
      ].map(([selector, property, role]) => {
        probe.style[property] = `var(${role})`;
        return { selector, property, role, actual: getComputedStyle(document.querySelector(selector))[property], expected: getComputedStyle(probe)[property] };
      });
      const motion = { scroll: getComputedStyle(document.documentElement).scrollBehavior, duration: getComputedStyle(document.querySelector('.lh-button')).transitionDuration };
      probe.remove();
      return { comparisons, motion };
    });
    for (const item of effective.comparisons) expect(item.actual, `${item.selector} ${item.property} uses ${item.role}`).toBe(item.expected);
    expect(effective.motion.scroll).toBe('auto');
    expect(effective.motion.duration.split(',').every(duration => parseFloat(duration) === 0)).toBe(true);
    const opener = page.getByRole('button', { name: 'Open example' });
    await opener.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(opener).toBeFocused();
    const focus = await opener.evaluate(element => {
      const style = getComputedStyle(element), probe = document.createElement('span');
      probe.style.outlineColor = 'var(--lh-focus)'; element.append(probe);
      const result = { visible: element.matches(':focus-visible'), width: style.outlineWidth, style: style.outlineStyle, actual: style.outlineColor, expected: getComputedStyle(probe).outlineColor };
      probe.remove(); return result;
    });
    expect(focus.visible).toBe(true);
    expect(parseFloat(focus.width)).toBeGreaterThanOrEqual(2);
    expect(focus.style).toBe('solid');
    expect(focus.actual).toBe(focus.expected);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `test-results/visual/${info.project.name}-${name}.png`, fullPage: true });
    if (process.env.LIGHTHOUSE_VISUAL_EVIDENCE_DIR) {
      await mkdir(process.env.LIGHTHOUSE_VISUAL_EVIDENCE_DIR, { recursive: true });
      await page.screenshot({ path: join(process.env.LIGHTHOUSE_VISUAL_EVIDENCE_DIR, `${info.project.name}-${name}.png`), fullPage: false });
      await info.attach('semantic-style-and-contrast', { body: JSON.stringify({ appearance, viewport: page.viewportSize(), effective, contrasts, focus, errors }, null, 2), contentType: 'application/json' });
    }
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
