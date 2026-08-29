import path from "path";
import fs from "fs/promises";
import { spawn } from "child_process";
import { db } from "@/lib/db";
import { projects, projectFiles, conversations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const PROJECTS_DIR = "/data/projects";
const HARNESS_LOGS_DIR = "/data/projects/.harness-logs";

/**
 * DeepSeek Harness Orchestrator — Replaces Kelly/Hermes
 * 
 * Harness handles the full loop: plan → generate → build → deploy
 * BuildAny just starts the session and reads results.
 */

export interface HarnessSession {
  sessionId: string;
  projectId: string;
  prompt: string;
  status: 'starting' | 'planning' | 'coding' | 'building' | 'completed' | 'failed';
  pid?: number;
  logPath: string;
  startedAt: number;
}

// Active sessions in memory (could use Redis for multi-instance)
const activeSessions = new Map<string, HarnessSession>();

/**
 * Start a new Harness session for a project
 */
export async function startHarnessSession(
  projectId: string,
  prompt: string,
  platform: 'web' | 'mobile' | 'backend' = 'web'
): Promise<HarnessSession> {
  const sessionId = crypto.randomUUID();
  const projectDir = path.join(PROJECTS_DIR, projectId);
  const logPath = path.join(HARNESS_LOGS_DIR, `${sessionId}.log`);
  
  // Ensure directories exist
  await fs.mkdir(projectDir, { recursive: true });
  await fs.mkdir(HARNESS_LOGS_DIR, { recursive: true });

  // Build the harness prompt — tell it exactly what we want
  const harnessPrompt = buildHarnessPrompt(prompt, platform, projectDir);

  // Spawn dsh in headless mode (CLI, no web UI)
  const dshArgs = [
    '--profile', 'headless',
    harnessPrompt,
  ];

  console.log(`[Harness] Starting session ${sessionId} for project ${projectId}`);
  console.log(`[Harness] Command: dsh ${dshArgs.join(' ')}`);

  const dshProcess = spawn('dsh', dshArgs, {
    cwd: projectDir,
    env: {
      ...process.env,
      DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',
      DSH_HOME: '/root/.config/dsh',
    },
  });

  const session: HarnessSession = {
    sessionId,
    projectId,
    prompt,
    status: 'starting',
    pid: dshProcess.pid,
    logPath,
    startedAt: Date.now(),
  };

  activeSessions.set(sessionId, session);

  // Pipe output to log file
  const logStream = await fs.open(logPath, 'w');
  dshProcess.stdout.pipe(logStream.createWriteStream());
  dshProcess.stderr.pipe(logStream.createWriteStream());

  // Handle completion
  dshProcess.on('exit', async (code) => {
    console.log(`[Harness] Session ${sessionId} exited with code ${code}`);
    session.status = code === 0 ? 'completed' : 'failed';
    
    // Sync files from disk to DB
    await syncFilesToDB(projectId, projectDir);
    
    // Update project status
    await db.update(projects)
      .set({ 
        status: code === 0 ? 'completed' : 'failed',
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    await logStream.close();
  });

  // Update project status
  await db.update(projects)
    .set({ status: 'generating', updatedAt: new Date() })
    .where(eq(projects.id, projectId));

  return session;
}

/**
 * Get session status and latest logs
 */
export async function getSessionStatus(sessionId: string): Promise<HarnessSession | null> {
  const session = activeSessions.get(sessionId);
  if (!session) return null;

  // Read latest log lines
  try {
    const logContent = await fs.readFile(session.logPath, 'utf-8');
    const lines = logContent.split('\n');
    const lastLines = lines.slice(-50).join('\n');
    
    // Infer status from log content
    if (lastLines.includes('planning') || lastLines.includes('Plan:')) {
      session.status = 'planning';
    } else if (lastLines.includes('generating') || lastLines.includes('Create file')) {
      session.status = 'coding';
    } else if (lastLines.includes('build') || lastLines.includes('npm run')) {
      session.status = 'building';
    } else if (lastLines.includes('success') || lastLines.includes('completed')) {
      session.status = 'completed';
    } else if (lastLines.includes('error') || lastLines.includes('failed')) {
      session.status = 'failed';
    }
  } catch {
    // Log not ready yet
  }

  return session;
}

/**
 * Build the prompt we send to Harness
 * This tells Harness exactly what BuildAny expects
 */
function buildHarnessPrompt(userPrompt: string, platform: string, projectDir: string): string {
  const isMobile = platform === 'mobile';
  
  return `You are an expert software developer. Build a complete, production-ready ${isMobile ? 'Expo SDK 54 React Native' : 'Next.js 15'} app based on this request:

"""${userPrompt}"""

## Rules
1. Create ALL necessary files in: ${projectDir}
2. Use TypeScript throughout
3. ${isMobile ? 'Use Expo Router file-based routing (app/ directory)' : 'Use Next.js App Router (src/app/ directory)'}
4. ${isMobile ? 'Style with NativeWind/Tailwind' : 'Style with Tailwind CSS + shadcn/ui'}
5. Include demo data — NO empty states or placeholders
6. Make it visually stunning with gradients, animations, and modern UI
7. Ensure all imports resolve correctly

## File Structure
${isMobile ? `
- app/_layout.tsx — Root layout with providers
- app/index.tsx — Main screen
- app/(tabs)/_layout.tsx — Tab navigation
- app/(tabs)/home.tsx — Home screen
- app/(tabs)/profile.tsx — Profile screen
- components/ui/ — Reusable UI components
- lib/utils.ts — Utilities
` : `
- src/app/layout.tsx — Root layout
- src/app/page.tsx — Main page
- src/app/globals.css — Tailwind directives + theme
- src/components/ui/ — shadcn components
- src/lib/utils.ts — cn() utility
- tailwind.config.js — Tailwind config
- next.config.js — Next.js config
`}

## Process
1. Plan the architecture and file structure
2. Create each file with complete, working code
3. Verify all imports are correct
4. Run ${isMobile ? 'expo prebuild' : 'npm install && npm run build'}
5. Report success or any errors

Start building now!`;
}

/**
 * Sync files from disk back to the database
 * Called after Harness completes
 */
async function syncFilesToDB(projectId: string, projectDir: string): Promise<number> {
  console.log(`[Harness] Syncing files from ${projectDir} to DB`);
  
  let fileCount = 0;
  
  async function scanDir(dir: string, basePath: string = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const relativePath = path.join(basePath, entry.name);
      const fullPath = path.join(dir, entry.name);
      
      // Skip build artifacts and deps
      if (entry.name === 'node_modules' || entry.name === '.next' || 
          entry.name === 'out' || entry.name === '.git' ||
          entry.name === '.harness-logs') {
        continue;
      }
      
      if (entry.isDirectory()) {
        await scanDir(fullPath, relativePath);
      } else {
        // Read file content
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          const ext = path.extname(entry.name).slice(1);
          
          // Upsert into DB
          const existing = await db.select()
            .from(projectFiles)
            .where(eq(projectFiles.projectId, projectId))
            .where(eq(projectFiles.path, relativePath))
            .get();
          
          if (existing) {
            await db.update(projectFiles)
              .set({ content, language: ext, updatedAt: new Date() })
              .where(eq(projectFiles.id, existing.id));
          } else {
            await db.insert(projectFiles).values({
              id: crypto.randomUUID(),
              projectId,
              path: relativePath,
              content,
              language: ext,
              isGenerated: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
          
          fileCount++;
        } catch (err) {
          console.error(`[Harness] Failed to sync ${relativePath}:`, err);
        }
      }
    }
  }
  
  try {
    await scanDir(projectDir);
  } catch (err) {
    console.error('[Harness] Sync failed:', err);
  }
  
  console.log(`[Harness] Synced ${fileCount} files to DB`);
  return fileCount;
}

/**
 * Kill a running Harness session
 */
export async function killHarnessSession(sessionId: string): Promise<boolean> {
  const session = activeSessions.get(sessionId);
  if (!session || !session.pid) return false;
  
  try {
    process.kill(session.pid, 'SIGTERM');
    activeSessions.delete(sessionId);
    return true;
  } catch {
    return false;
  }
}

/**
 * List active Harness sessions
 */
export function listHarnessSessions(): HarnessSession[] {
  return Array.from(activeSessions.values());
}
