import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

const HERMES_URL = process.env.HERMES_URL || "http://127.0.0.1:8642/v1/chat/completions";
const HERMES_API_KEY = process.env.HERMES_API_KEY || "";

const KELLY_REVIEW_PROMPT = `You are Kelly, a senior code reviewer for BuildAny. Your job is to read source code files and report issues.

When reviewing code, check for:
1. Syntax errors or merge conflicts (<<<<<<< HEAD, =======, >>>>>>>)
2. TypeScript type errors
3. Missing imports or undefined variables
4. Logic errors or bugs
5. Best practices violations

Report findings in this format:
- SEVERITY: [CRITICAL/WARNING/INFO]
- FILE: <filename>
- LINE: <line number>
- ISSUE: <description>
- FIX: <suggested fix>

If the code looks good, say: "✅ No issues found. Code looks clean!"`;

interface ReviewRequest {
  filePath: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: ReviewRequest = await req.json();
    const { filePath } = body;

    if (!filePath) {
      return NextResponse.json({ error: "Missing filePath" }, { status: 400 });
    }

    // Security: only allow reading files within the project
    const safePath = filePath.replace(/\.{2,}/g, ''); // Remove ..
    const fullPath = join('/root/buildany', safePath);
    
    let fileContent: string;
    try {
      fileContent = readFileSync(fullPath, 'utf-8');
    } catch (err) {
      return NextResponse.json({ 
        error: `Cannot read file: ${filePath}`, 
        details: err instanceof Error ? err.message : 'Unknown error' 
      }, { status: 404 });
    }

    // Send to Kelly (Hermes) for review
    const response = await fetch(HERMES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + HERMES_API_KEY,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: KELLY_REVIEW_PROMPT },
          { role: "user", content: `Please review this file: ${filePath}\n\n\`\`\`\n${fileContent}\n\`\`\`` },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: "Hermes review failed: " + response.status + " " + errText },
        { status: 502 }
      );
    }

    const data = await response.json();
    const review = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({
      success: true,
      filePath,
      review,
      issues: extractIssues(review),
    });
  } catch (error) {
    console.error("ARD REVIEW ERROR:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

function extractIssues(review: string): Array<{
  severity: string;
  file: string;
  line: number;
  issue: string;
  fix: string;
}> {
  const issues: Array<{ severity: string; file: string; line: number; issue: string; fix: string }> = [];
  
  // Simple parsing for structured output
  const lines = review.split('\n');
  let currentIssue: any = {};
  
  for (const line of lines) {
    if (line.includes('SEVERITY:')) {
      currentIssue = { severity: line.split('SEVERITY:')[1]?.trim() || 'INFO' };
    } else if (line.includes('FILE:')) {
      currentIssue.file = line.split('FILE:')[1]?.trim() || '';
    } else if (line.includes('LINE:')) {
      currentIssue.line = parseInt(line.split('LINE:')[1]?.trim() || '0') || 0;
    } else if (line.includes('ISSUE:')) {
      currentIssue.issue = line.split('ISSUE:')[1]?.trim() || '';
    } else if (line.includes('FIX:')) {
      currentIssue.fix = line.split('FIX:')[1]?.trim() || '';
      if (currentIssue.issue) {
        issues.push({ ...currentIssue });
      }
      currentIssue = {};
    }
  }
  
  return issues;
}
