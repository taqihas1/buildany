# BuildAny E2E Testing with Playwright

## Installation

Run on your VPS:
```bash
cd /root/buildany
npm install --save-dev @playwright/test
npx playwright install
npx playwright install-deps
```

## Configuration Files

Copy these files to your project:
- `playwright.config.ts` → `/root/buildany/playwright.config.ts`
- `e2e/example.spec.ts` → `/root/buildany/e2e/example.spec.ts`
- `e2e/project-test.spec.ts` → `/root/buildany/e2e/project-test.spec.ts`

## Running Tests

```bash
# Run all tests
npx playwright test

# Run with UI mode (interactive)
npx playwright test --ui

# Run specific test file
npx playwright test e2e/project-test.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run on specific browser
npx playwright test --project=chromium

# Show HTML report
npx playwright show-report
```

## Test Structure

| Test File | What It Tests |
|-----------|---------------|
| `example.spec.ts` | Homepage, basic project creation, workspace tabs |
| `project-test.spec.ts` | Full project lifecycle, responsive design |

## CI/CD Integration

Add to GitHub Actions:
```yaml
- name: Run Playwright tests
  run: npx playwright test
  env:
    PLAYWRIGHT_TEST_BASE_URL: https://base66.cloud
```

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `PLAYWRIGHT_TEST_BASE_URL` | Base URL for tests | `http://localhost:3000` |
| `CI` | Enables CI mode (retries, no parallel) | - |
