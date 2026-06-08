import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { codeReviews, projectFiles, conversations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const authData = await auth();
    if (!authData.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const review = await db.select().from(codeReviews).where(eq(codeReviews.projectId, projectId)).get();
    return NextResponse.json({ review: review || null });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const authData = await auth();
    if (!authData.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { action } = await req.json();
    if (action === 'start') return startReview(projectId);
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

async function startReview(projectId: string) {
  const existing = await db.select().from(codeReviews).where(eq(codeReviews.projectId, projectId)).get();
  if (existing && existing.status === 'running') return NextResponse.json({ success: false, error: "Review in progress" });
  const files = await db.select().from(projectFiles).where(eq(projectFiles.projectId, projectId));
  if (files.length === 0) return NextResponse.json({ success: false, error: "No files" });

  const reviewId = existing?.id || crypto.randomUUID();
  if (!existing) {
    await db.insert(codeReviews).values({ id: reviewId, projectId, status: 'running', createdAt: new Date(), updatedAt: new Date() });
  } else {
    await db.update(codeReviews).set({ status: 'running', updatedAt: new Date() }).where(eq(codeReviews.id, reviewId));
  }
  runOCRReview(projectId, reviewId, files);
  return NextResponse.json({ success: true, reviewId, status: 'running' });
}

async function runOCRReview(projectId: string, reviewId: string, files: any[]) {
  const fs = await import('fs');
  const path = await import('path');
  const os = await import('os');
  const child = await import('child_process');
  const tempDir = path.join(os.tmpdir(), 'buildany-ocr', projectId);

  try {
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true });
    fs.mkdirSync(tempDir, { recursive: true });

    for (const file of files) {
      if (!file.path || file.path === '__preview.html') continue;
      const fp = path.join(tempDir, file.path);
      fs.mkdirSync(path.dirname(fp), { recursive: true });
      fs.writeFileSync(fp, file.content || '', 'utf-8');
    }
    child.execSync('git init', { cwd: tempDir, stdio: 'pipe' });
    child.execSync('git add -A', { cwd: tempDir, stdio: 'pipe' });
    child.execSync('git commit -m "init" --no-verify', { cwd: tempDir, stdio: 'pipe' });

    try { child.execSync('ocr --version', { stdio: 'pipe' }); } catch {
      throw new Error('OCR not installed. Run: npm install -g @alibaba-group/open-code-review');
    }

    const output = child.execSync(`cd ${tempDir} && OCR_LLM_URL="https://api.deepseek.com/v1/chat/completions" OCR_LLM_TOKEN="${process.env.OCR_LLM_TOKEN || process.env.DEEPSEEK_API_KEY}" OCR_LLM_MODEL="deepseek-chat" ocr review --format json --audience agent`, {
      encoding: 'utf-8', timeout: 120000, maxBuffer: 10 * 1024 * 1024,
    env: {
      ...process.env,
      OCR_LLM_URL: 'https://api.deepseek.com/v1/chat/completions',
      OCR_LLM_TOKEN: process.env.DEEPSEEK_API_KEY,
      OCR_LLM_MODEL: 'deepseek-chat'
    }
    });

    let result: any = null;
    try {
      const lines = output.trim().split('\n');
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].trim().startsWith('{')) { result = JSON.parse(lines[i]); break; }
      }
      if (!result) result = JSON.parse(output);
    } catch { throw new Error('Failed to parse OCR output'); }

    const issues = result?.comments || result?.issues || [];
    const summary = {
      totalIssues: issues.length,
      critical: issues.filter((i: any) => i.severity === 'critical' || i.priority === 'high').length,
      warnings: issues.filter((i: any) => i.severity === 'warning' || i.priority === 'medium').length,
      suggestions: issues.filter((i: any) => i.severity === 'suggestion' || i.priority === 'low').length,
    };

    await db.update(codeReviews).set({
      status: 'completed',
      summary: JSON.stringify(summary),
      issues: JSON.stringify(issues.slice(0, 50)),
      updatedAt: new Date(),
    }).where(eq(codeReviews.id, reviewId));

    await db.insert(conversations).values({
      id: crypto.randomUUID(),
      projectId,
      role: 'assistant',
      content: `✅ Code review complete! ${summary.totalIssues} issues found (${summary.critical} critical, ${summary.warnings} warnings, ${summary.suggestions} suggestions).`,
      model: 'ocr-orchestrator',
      createdAt: new Date(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await db.update(codeReviews).set({ status: 'failed', errorMessage: msg.slice(0, 1000), updatedAt: new Date() }).where(eq(codeReviews.id, reviewId));
  } finally {
    try { if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true }); } catch {}
  }
}
