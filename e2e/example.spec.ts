import { test, expect } from '@playwright/test';

test.describe('BuildAny Homepage', () => {
  test('has correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/BuildAny|AI App Builder/);
  });

  test('has prompt input', async ({ page }) => {
    await page.goto('/');
    const promptInput = page.locator('input[placeholder*="prompt"], textarea[placeholder*="prompt"]').first();
    await expect(promptInput).toBeVisible();
  });

  test('has generate button', async ({ page }) => {
    await page.goto('/');
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Build")').first();
    await expect(generateButton).toBeVisible();
  });
});

test.describe('BuildAny Project Creation', () => {
  test('can create a web project', async ({ page }) => {
    await page.goto('/');
    const promptInput = page.locator('input[placeholder*="prompt"], textarea[placeholder*="prompt"]').first();
    await promptInput.fill('A simple todo app with dark mode');
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Build")').first();
    await generateButton.click();
    await page.waitForURL(/\/project\//, { timeout: 30000 });
    const projectTitle = page.locator('h1, [data-testid="project-title"]').first();
    await expect(projectTitle).toBeVisible({ timeout: 10000 });
  });
});
