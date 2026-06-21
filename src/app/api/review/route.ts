import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, unlinkSync } from "fs";
import { db } from "@/lib/db";
import { projectFiles, conversations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const execAsync = promisify(exec);

const HERMES_CONTAINER = "hermes-gateway";
const HERMES_HOME = "/opt/data";
const HOST_DATA_DIR = "/root/.hermes";

// Kelly's code review system prompt with ponytail rules
const KELLY_REVIEW_PROMPT = `You are Kelly, conducting a code review using your code-review-and-quality skill combined with ponytail minimalist principles.

REVIEW CRITERIA:
1. **Over-engineering** (ponytail): Is there unnecessary abstraction? Could this be simpler?
2. **Security**: Any vulnerabilities, injection risks, unsafe operations?
3. **Performance**: Inefficient algorithms, unnecessary re-renders, memory leaks?
4. **Maintainability**: Clear naming, proper error handling, test coverage?
5. **YAGNI**: Is there code that "might be needed later" but isn't needed now?

PONYTAIL RULES (Lazy Senior Dev):
- Does this need to exist? → If no, delete it
- Does stdlib do it? → Use stdlib
- One line possible? → One line
- Never cut: validation, error handling, security, accessibility

RESPOND WITH JSON:
{
  "summary": "Overall assessment",
  "score": "A|B|C|D|F",
  "issues": [
    {
      "severity": "critical|warning|suggestion|praise",
      "category": "security|performance|maintainability|over-engineering|yagni",
      "line": "approximate line or section",
      "message": "Description of issue",
      "fix": "Suggested fix or 'See suggestion'"
    }
  ],
  "ponytailOpportunities": [
    {
      "original": "Current code",
      "simplified": "Simpler version",
      "savings": "Estimated lines saved"
    }
  ]
}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, filePath, code, reviewType = "full" } = body;

    if (!code && !projectId) {
      return NextResponse.json({ error: "Code or projectId is required" }, { status: 400 });
    }

    // Get code from DB if projectId provided
    let codeToReview = code;
    if (!codeToReview && projectId) {
      const files = await db
        .select()
        .from(projectFiles)
        .where(eq(projectFiles.projectId, projectId));
      
      if (filePath) {
        const file = files.find(f => f.path === filePath);
        codeToReview = file?.content || "";
      } else {
        // Review all files
        codeToReview = files.map(f => `// File: ${f.path}\n${f.content}`).join("\n\n");
      }
    }

    if (!codeToReview?.trim()) {
      return NextResponse.json({ error: "No code to review" }, { status: 400 });
    }

    // Send to Kelly for review
    const reviewResult = await runKellyReview(codeToReview, reviewType);

    // Store review in conversations
    if (projectId) {
      await db.insert(conversations).values({
        id: crypto.randomUUID(),
        projectId,
        role: "system",
        content: `CODE REVIEW (${reviewType}):\n${JSON.stringify(reviewResult, null, 2)}`,
        model: "hermes/review",
        createdAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      review: reviewResult,
      message: `✅ Kelly reviewed ${reviewType === "full" ? "all files" : filePath || "code"}`,
    });

  } catch (error: any) {
    console.error("[Kelly Review] Error:", error);
    return NextResponse.json(
      { error: "Code review failed", message: error.message },
      { status: 500 }
    );
  }
}

async function runKellyReview(code: string, reviewType: string) {
  const tmpFileName = `kelly_review_${Date.now()}.txt`;
  const hostFilePath = `${HOST_DATA_DIR}/${tmpFileName}`;
  const containerFilePath = `${HERMES_HOME}/${tmpFileName}`;

  const prompt = `${KELLY_REVIEW_PROMPT}

REVIEW TYPE: ${reviewType}

CODE TO REVIEW:
\`\`\`
${code.slice(0, 50000)} // Limit to 50KB
\`\`\`

Provide your review as JSON only.`;

  writeFileSync(hostFilePath, prompt, "utf-8");

  try {
    const command = `docker exec -e HERMES_HOME=${HERMES_HOME} ${HERMES_CONTAINER} hermes chat -f "${containerFilePath}" -Q`;
    const { stdout } = await execAsync(command, {
      timeout: 120000,
      maxBuffer: 2 * 1024 * 1024,
    });

    return parseReviewResponse(stdout);
  } finally {
    try { unlinkSync(hostFilePath); } catch {}
  }
}

function parseReviewResponse(stdout: string): any {
  try {
    let content = stdout;

    const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      content = codeBlockMatch[1];
    } else {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }
    }

    content = content.trim();
    return JSON.parse(content);
  } catch (err) {
    console.error("[Kelly Review] Parse error:", err);
    return {
      summary: "Review completed but parsing failed. Raw output available.",
      score: "?",
      issues: [],
      raw: stdout.substring(0, 2000),
    };
  }
}
