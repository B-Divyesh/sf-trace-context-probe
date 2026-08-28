import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('loads without console errors and has the required document structure', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page).toHaveTitle(/Trace Context Probe/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.getByRole('img')).toHaveAttribute('alt', /trace thread/i);
  expect(errors).toEqual([]);
});

test('finds all five exact first broken boundaries', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Run five break tests' }).click();
  await expect(page.getByText('5 / 5 exact first boundaries')).toBeVisible();
  await expect(page.getByText('First break: callback.invoke')).toBeVisible();

  await page.locator('input[value="queue"]').check();
  await expect(page.getByText('First break: queue.consume')).toBeVisible();
  await expect(page.getByText(/then the first loss is reported exactly at queue.consume/)).toBeVisible();
});

test('skip link moves focus into main content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Copy install command' }).first()).toBeFocused();
});

test('supports keyboard navigation and local operation while offline', async ({ page, context }) => {
  await page.goto('/');
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(page.getByText(/Offline mode/)).toBeVisible();
  await page.getByRole('button', { name: 'Run five break tests' }).click();
  await expect(page.getByText('5 / 5 exact first boundaries')).toBeVisible();
});

test('has no serious or critical axe violations', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Run five break tests' }).click();
  await expect(page.getByText('5 / 5 exact first boundaries')).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
  expect(blocking).toEqual([]);
});
