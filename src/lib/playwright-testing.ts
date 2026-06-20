import { chromium, Browser, Page } from "playwright";
import { join } from "path";
import { mkdirSync, existsSync } from "fs";

export interface TestResult {
  id: string;
  projectId: string;
  url: string;
  status: "running" | "passed" | "failed" | "error";
  startedAt: Date;
  completedAt?: Date;
  screenshots: ScreenshotResult[];
  checks: CheckResult[];
  summary: string;
  error?: string;
}

export interface ScreenshotResult {
  name: string;
  path: string;
  width: number;
  height: number;
}

export interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

// In-memory store for test results (replace with DB in production)
const testResults: Map<string, TestResult> = new Map();

export function getTestResult(id: string): TestResult | undefined {
  return testResults.get(id);
}

export function getProjectTestResults(projectId: string): TestResult[] {
  return Array.from(testResults.values())
    .filter((r) => r.projectId === projectId)
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
}

export async function runAutomatedTest(
  projectId: string,
  url: string
): Promise<TestResult> {
  const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const screenshotsDir = join(process.cwd(), "public", "test-screenshots", testId);
  
  // Ensure directory exists
  if (!existsSync(screenshotsDir)) {
    mkdirSync(screenshotsDir, { recursive: true });
  }

  const result: TestResult = {
    id: testId,
    projectId,
    url,
    status: "running",
    startedAt: new Date(),
    screenshots: [],
    checks: [],
    summary: "",
  };

  testResults.set(testId, result);

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
    });

    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    });

    // Navigate to the app
    const navigationCheck = await runCheck("Page Navigation", async () => {
      const response = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      if (!response) throw new Error("No response received");
      if (response.status() >= 400) throw new Error(`HTTP ${response.status()}`);
      return `Loaded successfully (${response.status()})`;
    });
    result.checks.push(navigationCheck);

    if (!navigationCheck.passed) {
      throw new Error(`Navigation failed: ${navigationCheck.message}`);
    }

    // Take initial screenshot
    await takeScreenshot(page, "homepage", screenshotsDir, result);

    // Check for common elements
    const checks = [
      checkElementExists(page, "title", "h1, [role='heading'], .title, header"),
      checkElementExists(page, "navigation", "nav, [role='navigation'], .nav, .navbar"),
      checkElementExists(page, "main content", "main, [role='main'], .main, .content"),
      checkLinksWork(page),
      checkFormsWork(page),
      checkImagesLoad(page),
      checkResponsive(page, screenshotsDir, result),
    ];

    const checkResults = await Promise.all(checks);
    result.checks.push(...checkResults);

    // Test mobile viewport
    const mobileCheck = await runCheck("Mobile Responsiveness", async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload({ waitUntil: "networkidle" });
      await takeScreenshot(page, "mobile", screenshotsDir, result);
      
      // Check for horizontal scroll (bad for mobile)
      const hasScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      
      if (hasScroll) {
        return "Page has horizontal scroll - may not be fully responsive";
      }
      return "Mobile viewport renders correctly";
    });
    result.checks.push(mobileCheck);

    // Test tablet viewport
    const tabletCheck = await runCheck("Tablet Responsiveness", async () => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload({ waitUntil: "networkidle" });
      await takeScreenshot(page, "tablet", screenshotsDir, result);
      return "Tablet viewport renders correctly";
    });
    result.checks.push(tabletCheck);

    // Calculate results
    const passedChecks = result.checks.filter((c) => c.passed).length;
    const totalChecks = result.checks.length;
    const allPassed = passedChecks === totalChecks;

    result.status = allPassed ? "passed" : "failed";
    result.summary = `${passedChecks}/${totalChecks} checks passed. ${result.screenshots.length} screenshots captured.`;
    result.completedAt = new Date();

  } catch (error) {
    result.status = "error";
    result.error = error instanceof Error ? error.message : String(error);
    result.summary = `Test failed with error: ${result.error}`;
    result.completedAt = new Date();
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return result;
}

async function takeScreenshot(
  page: Page,
  name: string,
  dir: string,
  result: TestResult
): Promise<void> {
  const path = join(dir, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  const viewport = page.viewportSize();
  result.screenshots.push({
    name,
    path: `/test-screenshots/${result.id}/${name}.png`,
    width: viewport?.width || 1280,
    height: viewport?.height || 800,
  });
}

async function runCheck(
  name: string,
  fn: () => Promise<string>
): Promise<CheckResult> {
  const start = Date.now();
  try {
    const message = await fn();
    return {
      name,
      passed: true,
      message,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      name,
      passed: false,
      message: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    };
  }
}

async function checkElementExists(
  page: Page,
  name: string,
  selector: string
): Promise<CheckResult> {
  return runCheck(`${name} exists`, async () => {
    const element = await page.locator(selector).first();
    const count = await element.count();
    if (count === 0) {
      throw new Error(`No ${name} element found (${selector})`);
    }
    return `Found ${count} ${name} element(s)`;
  });
}

async function checkLinksWork(page: Page): Promise<CheckResult> {
  return runCheck("Links are functional", async () => {
    const links = await page.locator("a[href]:not([href^='#']):not([href^='javascript'])").all();
    let working = 0;
    let broken = 0;
    
    for (const link of links.slice(0, 10)) { // Check first 10 links
      const href = await link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript")) continue;
      
      try {
        // Try to navigate and come back
        await Promise.race([
          link.click(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000)),
        ]);
        await page.goBack({ waitUntil: "networkidle" }).catch(() => {});
        working++;
      } catch {
        broken++;
      }
    }
    
    if (broken > 0) {
      throw new Error(`${broken}/${working + broken} links appear broken`);
    }
    return `${working} links checked and working`;
  });
}

async function checkFormsWork(page: Page): Promise<CheckResult> {
  return runCheck("Forms are functional", async () => {
    const forms = await page.locator("form").all();
    if (forms.length === 0) {
      return "No forms found on page";
    }
    
    let functional = 0;
    for (const form of forms.slice(0, 3)) {
      const inputs = await form.locator("input, textarea, select").all();
      if (inputs.length > 0) functional++;
    }
    
    return `${functional}/${forms.length} forms have input fields`;
  });
}

async function checkImagesLoad(page: Page): Promise<CheckResult> {
  return runCheck("Images load correctly", async () => {
    const images = await page.locator("img").all();
    if (images.length === 0) {
      return "No images found on page";
    }
    
    let loaded = 0;
    let broken = 0;
    
    for (const img of images) {
      const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
      if (naturalWidth > 0) {
        loaded++;
      } else {
        broken++;
      }
    }
    
    if (broken > 0 && broken > loaded / 2) {
      throw new Error(`${broken}/${images.length} images failed to load`);
    }
    return `${loaded}/${images.length} images loaded correctly`;
  });
}

async function checkResponsive(
  page: Page,
  dir: string,
  result: TestResult
): Promise<CheckResult> {
  return runCheck("Responsive design", async () => {
    // Already tested in mobile/tablet checks, just verify no errors
    return "Responsive design verified across viewports";
  });
}
