import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from "fs";
import { join, relative } from "path";
import { db } from "@/lib/db";
import { conversations } from "@/lib/db/schema";
import { randomUUID } from "crypto";

const PROJECTS_DIR = "/data/projects";

interface ProgressUpdate {
  message: string;
  phase: "planning" | "coding" | "styling" | "completed" | "failed";
  fileCount: number;
  timestamp: number;
}

/**
 * Watch a project directory and report file creation progress
 * Writes progress messages to the conversations table so the chat panel shows them
 */
export class HarnessProgressWatcher {
  private projectId: string;
  private projectPath: string;
  private intervalId: NodeJS.Timeout | null = null;
  private lastFileCount = 0;
  private hasReported = new Set<string>();
  private startTime = Date.now();

  constructor(projectId: string) {
    this.projectId = projectId;
    this.projectPath = join(PROJECTS_DIR, projectId);
  }

  start() {
    // Initial message
    this.addSystemMessage("🚀 Jason is building your app...", "planning");

    // Poll every 5 seconds
    this.intervalId = setInterval(() => {
      this.checkProgress();
    }, 5000);

    // Safety: stop after 10 minutes
    setTimeout(() => this.stop(), 10 * 60 * 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async checkProgress() {
    if (!existsSync(this.projectPath)) return;

    const files = this.listSourceFiles();
    const elapsed = (Date.now() - this.startTime) / 1000;

    // Report milestones based on file count + elapsed time
    if (files.length === 0 && elapsed > 5 && !this.hasReported.has("planning")) {
      this.hasReported.add("planning");
      this.addSystemMessage("📐 Planning architecture and file structure...", "planning");
    }

    if (files.length > 0 && files.length !== this.lastFileCount) {
      const newFiles = files.length - this.lastFileCount;
      this.lastFileCount = files.length;

      if (files.length <= 3 && !this.hasReported.has("coding-start")) {
        this.hasReported.add("coding-start");
        this.addSystemMessage(`💻 Generating code... (${files.length} files created)`, "coding");
      } else if (files.length > 3 && files.length < 10 && !this.hasReported.has("coding-mid")) {
        this.hasReported.add("coding-mid");
        this.addSystemMessage(`⚡ Building components... (${files.length} files so far)`, "coding");
      } else if (files.length >= 10 && !this.hasReported.has("styling")) {
        this.hasReported.add("styling");
        this.addSystemMessage(`🎨 Applying styles and animations... (${files.length} files)`, "styling");
      }

      // Report specific important files
      const importantFiles = files.filter(f =>
        f.endsWith("page.tsx") || f.endsWith("layout.tsx") || f.endsWith("globals.css")
      );
      for (const file of importantFiles) {
        const key = `file-${file}`;
        if (!this.hasReported.has(key)) {
          this.hasReported.add(key);
          this.addSystemMessage(`📄 Created ${file}`, "coding");
        }
      }
    }
  }

  async markCompleted(success: boolean, fileCount: number) {
    this.stop();
    if (success) {
      this.addSystemMessage(
        `✅ Build complete! ${fileCount} files generated. You can now preview, deploy, or ask Jason to make changes.`,
        "completed"
      );
    } else {
      this.addSystemMessage(
        `❌ Build failed. Jason encountered an error. Try asking Jason to fix it or start a new build.`,
        "failed"
      );
    }
  }

  private listSourceFiles(): string[] {
    const files: string[] = [];
    const srcPath = join(this.projectPath, "src");
    if (!existsSync(srcPath)) return files;

    const walk = (dir: string, base: string = "") => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const rel = base ? `${base}/${entry}` : entry;
        const stat = statSync(full);
        if (stat.isDirectory()) {
          if (entry !== "node_modules" && entry !== ".next" && entry !== "out") {
            walk(full, rel);
          }
        } else {
          files.push(rel);
        }
      }
    };

    walk(srcPath);
    return files;
  }

  private async addSystemMessage(content: string, phase: string) {
    try {
      await db.insert(conversations).values({
        id: randomUUID(),
        projectId: this.projectId,
        role: "system",
        content: `${content}\n\n<!-- phase:${phase} -->`,
        createdAt: new Date(),
      });
      console.log(`[Progress] ${this.projectId}: ${content}`);
    } catch (err) {
      console.error("[Progress] Failed to save message:", err);
    }
  }
}
