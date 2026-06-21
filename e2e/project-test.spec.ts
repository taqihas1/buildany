import { test, expect } from '@playwright/test';

/**
 * Project-Specific E2E Tests for BuildAny
 * Tests the full project lifecycle: create → generate → preview.
 */

test.describe('Project Lifecycle', () => {
  test('full web project generation flow', async ({ page }) => {
    // 1. Navigate to homepage
    await page.goto('/');
    
    // 2. Enter prompt
    const promptInput = page.locator('input[placeholder*="prompt"], textarea[placeholder*="prompt"]').first();
    await promptInput.fill('A weather dashboard with city search and 5-day forecast');
    
    // 3. Click generate
    const generateButton = page.locator('button:has-text("Generate")').first();
    await generateButton.click();
    
    // 4. Wait for project page (with timeout for generation)
    await page.waitForURL(/\/project\//, { timeout: 60000 });
    
    // 5. Verify AI chat shows status messages
    const chatPanel = page.locator('[data-testid="ai-chat-panel"], .ai-chat-panel').first();
    await expect(chatPanel).toBeVisible();
    
    // 6. Wait for generation to complete (check for completion message)
    await page.waitForSelector('text=complete, text=done, text=finished', { timeout: 120000 });
    
    // 7. Verify code tab has files
    const codeTab = page.locator('text=Code').first();
    await codeTab.click();
    const fileTree = page.locator('[data-testid="file-tree"], .file-tree').first();
    await expect(fileTree).toBeVisible();
    
    // 8. Verify preview tab works
    const previewTab = page.locator('text=Preview').first();
    await previewTab.click();
    const previewFrame = page.locator('iframe[data-testid="preview"], .preview-frame').first();
    await expect(previewFrame).toBeVisible();
  });
});

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
