# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: example.spec.ts >> BuildAny Homepage >> has prompt input
- Location: e2e/example.spec.ts:9:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('input[placeholder*="prompt"], textarea[placeholder*="prompt"]').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('input[placeholder*="prompt"], textarea[placeholder*="prompt"]').first()

```

```yaml
- main:
  - text: BuildAny Beta
  - button "DeepSeek V3"
  - button "Sign In"
  - button "Get Started"
  - heading "What would you build?" [level=1]
  - paragraph: AI-powered app builder. Web, mobile, backend — describe it, we build it.
  - text: ⚡ Instant preview 📱 Mobile + Web 🤖 Multi-LLM 🔗 GitHub export
  - button "Web"
  - button "Mobile"
  - button "Dashboard"
  - textbox "Describe your app... (e.g., 'A fitness tracker with workout plans, progress photos, and social sharing')"
  - button [disabled]
  - checkbox "Skip research (faster, less competitive)"
  - text: Skip research (faster, less competitive) Next.js 15 + Tailwind + shadcn/ui
  - button "A recipe app with high-protein meals and..."
  - button "A car dealership inventory tracker with ..."
  - button "A stock portfolio dashboard with sparkli..."
  - button "A task manager with team collaboration a..."
  - text: 🧠
  - heading "AI Research First" [level=3]
  - paragraph: Auto-researches top apps in your space before building. No more guessing.
  - text: 📱
  - heading "Mobile + Web" [level=3]
  - paragraph: Generate React Native apps or Next.js websites from the same prompt.
  - text: 🤖
  - heading "Multi-LLM Power" [level=3]
  - paragraph: Routes to the best AI model for the job — Kimi, DeepSeek, GPT-4o, Claude.
  - text: 🔧
  - heading "Auto-Test Agent" [level=3]
  - paragraph: AI tests every screen, finds bugs, fixes them before you see them.
  - text: 📚
  - heading "Living Wiki" [level=3]
  - paragraph: Auto-generated docs that update as your code changes. Never outdated.
  - text: 🧬
  - heading "Second Brain" [level=3]
  - paragraph: Remembers your preferences, suggests before you ask, learns your style.
  - paragraph: Built with Next.js 15 · React 19 · TypeScript · Tailwind · shadcn/ui · OpenClaw
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('BuildAny Homepage', () => {
  4  |   test('has correct title', async ({ page }) => {
  5  |     await page.goto('/');
  6  |     await expect(page).toHaveTitle(/BuildAny|AI App Builder/);
  7  |   });
  8  | 
  9  |   test('has prompt input', async ({ page }) => {
  10 |     await page.goto('/');
  11 |     const promptInput = page.locator('input[placeholder*="prompt"], textarea[placeholder*="prompt"]').first();
> 12 |     await expect(promptInput).toBeVisible();
     |                               ^ Error: expect(locator).toBeVisible() failed
  13 |   });
  14 | 
  15 |   test('has generate button', async ({ page }) => {
  16 |     await page.goto('/');
  17 |     const generateButton = page.locator('button:has-text("Generate"), button:has-text("Build")').first();
  18 |     await expect(generateButton).toBeVisible();
  19 |   });
  20 | });
  21 | 
  22 | test.describe('BuildAny Project Creation', () => {
  23 |   test('can create a web project', async ({ page }) => {
  24 |     await page.goto('/');
  25 |     const promptInput = page.locator('input[placeholder*="prompt"], textarea[placeholder*="prompt"]').first();
  26 |     await promptInput.fill('A simple todo app with dark mode');
  27 |     const generateButton = page.locator('button:has-text("Generate"), button:has-text("Build")').first();
  28 |     await generateButton.click();
  29 |     await page.waitForURL(/\/project\//, { timeout: 30000 });
  30 |     const projectTitle = page.locator('h1, [data-testid="project-title"]').first();
  31 |     await expect(projectTitle).toBeVisible({ timeout: 10000 });
  32 |   });
  33 | });
  34 | 
```