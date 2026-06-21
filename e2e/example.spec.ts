import { test, expect } from '@playwright/test';

/**
 * Example E2E Test for BuildAny
 * Tests basic homepage functionality.
 */

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
    
    // Fill in prompt
    const promptInput = page.locator('input[placeholder*="prompt"], textarea[placeholder*="prompt"]').first();
    await promptInput.fill('A simple todo app with dark mode');
    
    // Select web type if option exists
    const webOption = page.locator('text=Web, [value="web"], [data-type="web"]').first();
    if (await webOption.isVisible().catch(() => false)) {
      await webOption.click();
    }
    
    // Click generate
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Build")').first();
    await generateButton.click();
    
    // Wait for project creation (redirect or loading state)
    await page.waitForURL(/\/project\//, { timeout: 30000 });
    
    // Verify project page loaded
    const projectTitle = page.locator('h1, [data-testid="project-title"]').first();
    await expect(projectTitle).toBeVisible({ timeout: 10000 });
  });
});

test.describe('BuildAny Project Workspace', () => {
  test('workspace tabs are visible', async ({ page }) => {
    // Navigate to a project (use a test project ID or create one)
    await page.goto('/project/test-project-id');
    
    // Check for workspace tabs
    const tabs = ['AI', 'Preview', 'Code', 'Research', 'Swarm', 'Wiki'];
    for (const tabName of tabs) {
      const tab = page.locator(`text=${tabName}`).first();
      await expect(tab).toBeVisible();
    }
  });

  test('AI chat panel is visible', async ({ page }) => {
    await page.goto('/project/test-project-id');
    
    const chatPanel = page.locator('[data-testid="ai-chat-panel"], .ai-chat-panel').first();
    await expect(chatPanel).toBeVisible();
  });
});
