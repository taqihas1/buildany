import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const execAsync = promisify(exec);

interface PublishRequest {
  projectId: string;
  files: Array<{ path: string; content: string }>;
}

export async function POST(req: NextRequest) {
  try {
    const body: PublishRequest = await req.json();
    const { projectId, files } = body;

    if (!projectId || !files || files.length === 0) {
      return NextResponse.json(
        { error: "Project ID and files are required" },
        { status: 400 }
      );
    }

    // Create temp directory for the project
    const tmpDir = join(tmpdir(), `rn-preview-${projectId}-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });

    // Write files to temp directory
    for (const file of files) {
      const filePath = join(tmpDir, file.path);
      const dir = filePath.substring(0, filePath.lastIndexOf("/"));
      if (dir) mkdirSync(dir, { recursive: true });
      writeFileSync(filePath, file.content, "utf-8");
    }

    // Create package.json if not exists
    const packageJsonPath = join(tmpDir, "package.json");
    try {
      // Check if package.json exists
      await execAsync(`test -f ${packageJsonPath}`);
    } catch {
      // Create minimal package.json
      const packageJson = {
        name: `buildany-preview-${projectId.slice(0, 8)}`,
        version: "1.0.0",
        private: true,
        scripts: {
          start: "expo start",
          android: "expo start --android",
          ios: "expo start --ios",
          web: "expo start --web",
        },
        dependencies: {
          "expo": "~51.0.0",
          "expo-status-bar": "~1.12.0",
          "react": "18.2.0",
          "react-native": "0.74.0",
        },
        devDependencies: {
          "@babel/core": "^7.24.0",
        },
      };
      writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), "utf-8");
    }

    // Run rn-preview publish
    console.log("[RN Preview] Publishing from:", tmpDir);
    
    const { stdout, stderr } = await execAsync(
      `cd ${tmpDir} && npx rn-preview publish --json`,
      {
        timeout: 120000, // 2 minutes
        maxBuffer: 1024 * 1024,
      }
    );

    // Clean up temp directory
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {}

    // Parse response
    let result: any = null;
    try {
      // Try to find JSON in output
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fallback: extract URL from text
      const urlMatch = stdout.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        result = { url: urlMatch[1] };
      }
    }

    if (!result) {
      console.error("[RN Preview] Failed to parse output:", stdout, stderr);
      return NextResponse.json(
        { error: "Failed to publish preview", raw: stdout },
        { status: 500 }
      );
    }

    console.log("[RN Preview] Success:", result);

    return NextResponse.json({
      success: true,
      url: result.url || result.previewUrl,
      qrUrl: result.qrUrl || result.qr,
      id: result.id || result.previewId,
      expiresIn: result.expiresIn || "1 day",
    });

  } catch (error: any) {
    console.error("[RN Preview] Error:", error);
    return NextResponse.json(
      {
        error: "Preview publish failed",
        message: error.message,
        stderr: error.stderr,
      },
      { status: 500 }
    );
  }
}
