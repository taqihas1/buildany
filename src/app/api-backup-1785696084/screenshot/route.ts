import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { tmpdir } from "os";
import { db } from "@/lib/db";
import { projectFiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Device frame configurations for screenshots
const DEVICE_FRAMES = {
  "iphone-14": { width: 390, height: 844, scale: 3, name: "iPhone 14" },
  "iphone-14-pro": { width: 393, height: 852, scale: 3, name: "iPhone 14 Pro" },
  "iphone-se": { width: 375, height: 667, scale: 2, name: "iPhone SE" },
  "pixel-7": { width: 412, height: 915, scale: 2.625, name: "Pixel 7" },
  "ipad": { width: 768, height: 1024, scale: 2, name: "iPad" },
};

interface ScreenshotRequest {
  projectId: string;
  device?: string; // e.g., "iphone-14"
  screens?: string[]; // e.g., ["home", "search", "profile"]
}

// Helper to get project files from DB or request body
async function getProjectFiles(projectId: string, filesFromBody?: any[]) {
  if (filesFromBody && filesFromBody.length > 0) {
    return filesFromBody;
  }
  
  const dbFiles = await db.select().from(projectFiles).where(eq(projectFiles.projectId, projectId));
  return dbFiles.map((f: any) => ({ path: f.path, content: f.content }));
}

export async function POST(req: NextRequest) {
  try {
    const body: ScreenshotRequest = await req.json();
    const { projectId, device = "iphone-14", screens = ["home"] } = body;

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const deviceFrame = DEVICE_FRAMES[device as keyof typeof DEVICE_FRAMES] || DEVICE_FRAMES["iphone-14"];

    // Create temp directory
    const tmpDir = join(tmpdir(), `buildany-screenshot-${projectId}-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });

    // Get project files
    const files = await getProjectFiles(projectId, (body as any).files);
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files found for project" }, { status: 404 });
    }

    // Write files to temp directory
    for (const file of files) {
      const filePath = join(tmpDir, file.path);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, file.content, "utf-8");
    }

    // Create a minimal web entry point for preview
    const webEntry = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
`;
    writeFileSync(join(tmpDir, "web-entry.js"), webEntry);

    // Create HTML shell
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=${deviceFrame.width}, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>BuildAny Preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      width: ${deviceFrame.width}px; 
      height: ${deviceFrame.height}px; 
      overflow: hidden;
      background: #000;
    }
    #root { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="./web-entry.js"></script>
</body>
</html>
`;
    writeFileSync(join(tmpDir, "index.html"), html);

    // Check if puppeteer is available
    let screenshots: any[] = [];
    try {
      // Use puppeteer with system chromium
      const puppeteerScript = `

(async () => {
  const browser = // Puppeteer removed - screenshot disabled({
    headless: 'new',
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  const page = await browser.newPage();
  await page.setViewport({
    width: ${deviceFrame.width},
    height: ${deviceFrame.height},
    deviceScaleFactor: ${deviceFrame.scale}
  });
  
  await page.goto('file://${tmpDir}/index.html', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  const screenshotPath = '${tmpDir}/screenshot-${device}.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  
  console.log(JSON.stringify({ path: screenshotPath, device: '${device}' }));
  await browser.close();
})();
`;
      writeFileSync(join(tmpDir, "screenshot.js"), puppeteerScript);
      
      const result = execSync(`cd ${tmpDir} && node screenshot.js`, { encoding: "utf-8", timeout: 60000 });
      const screenshotResult = JSON.parse(result.trim().split('\n').pop() || '{}');
      
      if (screenshotResult.path && existsSync(screenshotResult.path)) {
        const imageBuffer = readFileSync(screenshotResult.path);
        const base64 = imageBuffer.toString('base64');
        screenshots.push({
          device: device,
          screen: screens[0] || "home",
          base64: base64,
          width: deviceFrame.width,
          height: deviceFrame.height,
        });
      }
    } catch (err: any) {
      console.log("[Screenshot] Puppeteer error:", err.message);
      
      // Fallback: Return device frame info without actual screenshot
      screenshots.push({
        device: device,
        screen: screens[0] || "home",
        width: deviceFrame.width,
        height: deviceFrame.height,
        note: "Screenshot capture failed. Check chromium installation.",
      });
    }

    // Cleanup
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {}

    return NextResponse.json({
      success: true,
      screenshots,
      device: deviceFrame,
      screens,
    });

  } catch (error: any) {
    console.error("[Screenshot API] Error:", error);
    return NextResponse.json(
      { error: "Screenshot generation failed", message: error.message },
      { status: 500 }
    );
  }
}

// GET - List available devices
export async function GET() {
  return NextResponse.json({
    devices: Object.entries(DEVICE_FRAMES).map(([id, config]) => ({
      id,
      name: config.name,
      width: config.width,
      height: config.height,
      scale: config.scale,
    })),
  });
}
