import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  test('mobile viewport renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    const promptInput = page.locator('input[placeholder*="prompt"], textarea[placeholder*="prompt"]').first();
    await expect(promptInput).toBeVisible();
  });

  test('tablet viewport renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    const promptInput = page.locator('input[placeholder*="prompt"], textarea[placeholder*="prompt"]').first();
    await expect(promptInput).toBeVisible();
  });
});
