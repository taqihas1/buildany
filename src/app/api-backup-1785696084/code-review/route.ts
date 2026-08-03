import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";

const PROJECTS_DIR = "/data/projects";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

interface FileEntry {
  path: string;
  content: string;
}

async function getAllFiles(dir: string, base = ""): Promise<FileEntry[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: FileEntry[] = [];
  for (const entry of entries) {
    const relativePath = base ? `${base}/${entry.name}` : entry.name;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "dist" || entry.name === "out") continue;
      files.push(...await getAllFiles(fullPath, relativePath));
    } else {
      const content = await fs.readFile(fullPath, "utf-8");
      files.push({ path: relativePath, content });
    }
  }
  return files;
}

async function callDeepSeek(messages: any[]) {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "deepseek-chat", messages, temperature: 0.3 }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json();
    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    const projectDir = path.join(PROJECTS_DIR, projectId);
    const files = await getAllFiles(projectDir);

    // Build review prompt
    const fileList = files.map(f => `--- ${f.path} ---\n${f.content.slice(0, 2000)}`).join("\n\n");

    const reviewPrompt = `You are a lazy senior developer doing a code review. Review the following codebase for over-engineering, bloat, and unnecessary complexity.

PONYTAIL REVIEW RULES:
1. Does this need to exist at all? (YAGNI)
2. Stdlib does it? Use it instead.
3. Native platform feature covers it? Use that instead of a library.
4. Already-installed dependency solves it? Never add a new one.
5. Can it be one line? Make it one line.
6. No unrequested abstractions: no interface with one implementation, no factory for one product.
7. Deletion over addition. Boring over clever.
8. Fewest files possible. Shortest working diff wins.

Review format - one finding per line:

demo.tsx:L12: stdlib: 27-line validator. "@" in email, 1 line, real validation is the confirmation mail.
demo.tsx:L4: native: moment.js for one format call. Intl.DateTimeFormat, 0 deps.
demo.tsx:L88: yagni: AbstractRepository with one implementation. Inline it until a second one exists.
demo.tsx:L52: delete: retry wrapper around idempotent local call. Nothing replaces it.
demo.tsx:L30: shrink: manual loop builds dict. dict(zip(keys, values)), 1 line.

End with: net: -N lines possible
If nothing to cut, say: Lean already. Ship.

FILES:
${fileList}

REVIEW FINDINGS:`;

    const review = await callDeepSeek([
      { role: "system", content: "You are a lazy senior developer doing minimalist code reviews." },
      { role: "user", content: reviewPrompt },
    ]);

    // Store review in DB for later fix
    await db.update(projects)
      .set({ 
        reviewData: JSON.stringify({ review, timestamp: Date.now() }),
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    return NextResponse.json({
      success: true,
      review,
      fileCount: files.length,
    });
  } catch (error: any) {
    console.error("[CodeReview] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
