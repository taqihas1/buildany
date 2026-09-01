/**
 * Build Progress Watcher — Monitors dsh file generation and updates chat
 * 
 * Flow:
 * 1. dsh starts generating files
 * 2. Watcher detects file creation events
 * 3. After quiet period (no new files for 10s), marks build as complete
 * 4. Updates chat: "✅ Code generation complete! N files created."
 * 5. Updates project status: draft → generated
 */

import { watch, existsSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import { db } from "@/lib/db";
import { conversations, projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

interface BuildWatcherState {
  projectId: string;
  projectDir: string;
  fileCount: number;
  lastFileTime: number;
  watcher?: any;
  quietTimer?: NodeJS.Timeout;
  checkInterval?: NodeJS.Timeout;
}

const activeWatchers = new Map<string, BuildWatcherState>();
const QUIET_PERIOD_MS = 10000; // 10 seconds of no new files = done
const POLL_INTERVAL_MS = 3000; // Check every 3 seconds

/**
 * Start watching a project directory for file generation progress
 */
export function startBuildWatcher(projectId: string, projectDir: string): void {
  // Stop existing watcher
  stopBuildWatcher(projectId);

  console.log(`[BuildWatcher] Starting watcher for ${projectId}`);

  const state: BuildWatcherState = {
    projectId,
    projectDir,
    fileCount: countFiles(projectDir),
    lastFileTime: Date.now(),
  };

  activeWatchers.set(projectId, state);

  // Initial status
  addChatMessage(projectId, "system", "🚀 **Build started!** Monitoring file generation...");

  // Start polling for file count changes
  state.checkInterval = setInterval(() => {
    checkBuildProgress(state);
  }, POLL_INTERVAL_MS);

  // Also set up filesystem watcher if directory exists
  if (existsSync(projectDir)) {
    try {
      state.watcher = watch(projectDir, { recursive: true }, (eventType, filename) => {
        if (filename && (filename.endsWith('.ts') || filename.endsWith('.tsx') || filename.endsWith('.js') || filename.endsWith('.json') || filename.endsWith('.css'))) {
          state.lastFileTime = Date.now();
          state.fileCount = countFiles(projectDir);
        }
      });
    } catch (err) {
      console.log(`[BuildWatcher] File watcher failed for ${projectId}, using polling only`);
    }
  }
}

/**
 * Check build progress and detect completion
 */
function checkBuildProgress(state: BuildWatcherState): void {
  const { projectId, projectDir, lastFileTime } = state;

  // Count current files
  const currentCount = countFiles(projectDir);
  const timeSinceLastFile = Date.now() - lastFileTime;

  // Update file count if changed
  if (currentCount !== state.fileCount) {
    state.fileCount = currentCount;
    state.lastFileTime = Date.now();

    // Milestone messages
    if (currentCount === 5) {
      addChatMessage(projectId, "system", `📁 **Files appearing...** (${currentCount} files created)`);
    } else if (currentCount === 10) {
      addChatMessage(projectId, "system", `📁 **Good progress!** ${currentCount} files created`);
    } else if (currentCount === 15) {
      addChatMessage(projectId, "system", `📁 **Almost there!** ${currentCount} files created`);
    }
  }

  // Detect completion: no new files for QUIET_PERIOD and at least some files exist
  if (timeSinceLastFile > QUIET_PERIOD_MS && currentCount > 0) {
    handleBuildComplete(state);
  }
}

/**
 * Build is complete — update status and chat
 */
async function handleBuildComplete(state: BuildWatcherState): Promise<void> {
  const { projectId, projectDir, fileCount } = state;

  // Stop watching
  stopBuildWatcher(projectId);

  // Update project status
  try {
    await db.update(projects)
      .set({ status: "generated" })
      .where(eq(projects.id, projectId));
  } catch (err) {
    console.error("[BuildWatcher] Failed to update project status:", err);
  }

  // Count files by type
  const fileTypes = countFileTypes(projectDir);

  // Final status message
  const message = `✅ **Code generation complete!**\n\n` +
    `📊 **Stats:**\n` +
    `- Total files: ${fileCount}\n` +
    `- TypeScript/TSX: ${fileTypes.typescript || 0}\n` +
    `- Components: ${fileTypes.components || 0}\n` +
    `- Configuration: ${fileTypes.config || 0}\n\n` +
    `💡 **Next steps:**\n` +
    `- Click **Deploy** to push to GitHub + Cloudflare\n` +
    `- Or ask me to make changes (e.g., "make the header blue")`;

  await addChatMessage(projectId, "assistant", message);

  console.log(`[BuildWatcher] ✅ Project ${projectId} complete: ${fileCount} files`);
}

/**
 * Stop watching a project
 */
export function stopBuildWatcher(projectId: string): void {
  const state = activeWatchers.get(projectId);
  if (!state) return;

  if (state.watcher) {
    try { state.watcher.close(); } catch (e) {}
  }
  if (state.checkInterval) {
    clearInterval(state.checkInterval);
  }
  if (state.quietTimer) {
    clearTimeout(state.quietTimer);
  }

  activeWatchers.delete(projectId);
  console.log(`[BuildWatcher] Stopped watcher for ${projectId}`);
}

/**
 * Count all relevant files in project directory
 */
function countFiles(dir: string): number {
  if (!existsSync(dir)) return 0;

  let count = 0;
  const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.html', '.md']);

  function walk(currentDir: string) {
    try {
      const entries = readdirSync(currentDir);
      for (const entry of entries) {
        const fullPath = join(currentDir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
          walk(fullPath);
        } else if (stat.isFile() && extensions.has(extname(entry))) {
          count++;
        }
      }
    } catch (err) {
      // Ignore permission errors
    }
  }

  walk(dir);
  return count;
}

/**
 * Count files by category
 */
function countFileTypes(dir: string): Record<string, number> {
  const types: Record<string, number> = {
    typescript: 0,
    components: 0,
    config: 0,
    styles: 0,
    other: 0,
  };

  if (!existsSync(dir)) return types;

  function walk(currentDir: string) {
    try {
      const entries = readdirSync(currentDir);
      for (const entry of entries) {
        const fullPath = join(currentDir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
          walk(fullPath);
        } else if (stat.isFile()) {
          const ext = extname(entry);
          const path = fullPath.toLowerCase();

          if (ext === '.ts' || ext === '.tsx') {
            types.typescript++;
            if (path.includes('/components/') || path.includes('/ui/')) {
              types.components++;
            }
          } else if (['.json', '.js', '.mjs'].includes(ext)) {
            types.config++;
          } else if (ext === '.css') {
            types.styles++;
          } else {
            types.other++;
          }
        }
      }
    } catch (err) {}
  }

  walk(dir);
  return types;
}

/**
 * Add a message to project chat
 */
async function addChatMessage(
  projectId: string,
  role: "user" | "assistant" | "system",
  content: string
): Promise<void> {
  try {
    await db.insert(conversations).values({
      id: randomUUID(),
      projectId,
      role,
      content,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("[BuildWatcher] Failed to add chat message:", err);
  }
}

/**
 * Check if a project is being watched
 */
export function isWatchingBuild(projectId: string): boolean {
  return activeWatchers.has(projectId);
}
