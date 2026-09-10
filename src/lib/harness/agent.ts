import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const PROJECTS_DIR = "/data/projects";

export interface FileChange {
  path: string;
  original: string;
  modified: string;
  diff: string;
}

export class HarnessAgent {
  private projectId: string;
  private projectPath: string;

  constructor(projectId: string) {
    this.projectId = projectId;
    this.projectPath = join(PROJECTS_DIR, projectId);
  }

  /** Read a file from the project */
  readFile(filePath: string): string | null {
    const fullPath = join(this.projectPath, filePath);
    if (!existsSync(fullPath)) return null;
    try {
      return readFileSync(fullPath, "utf-8");
    } catch {
      return null;
    }
  }

  /** Write a file to the project */
  writeFile(filePath: string, content: string): boolean {
    const fullPath = join(this.projectPath, filePath);
    try {
      writeFileSync(fullPath, content, "utf-8");
      return true;
    } catch {
      return false;
    }
  }

  /** Get all source files in the project */
  getSourceFiles(): string[] {
    const files: string[] = [];
    const srcPath = join(this.projectPath, "src");
    if (!existsSync(srcPath)) return files;
    
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const stat = statSync(full);
        if (stat.isDirectory()) {
          walk(full);
        } else if (/\.(tsx?|jsx?|css|json)$/.test(entry)) {
          files.push(relative(this.projectPath, full));
        }
      }
    };
    walk(srcPath);
    return files;
  }

  /** Read all source files for context */
  readAllFiles(): Record<string, string> {
    const files = this.getSourceFiles();
    const result: Record<string, string> = {};
    for (const file of files.slice(0, 20)) { // Limit to 20 files
      const content = this.readFile(file);
      if (content) result[file] = content;
    }
    return result;
  }

  /** Build a prompt for the LLM with file context */
  buildEditPrompt(userRequest: string, filePath: string, currentContent: string): string {
    return `You are Harness, an expert React/Next.js developer. The user wants to modify their app.

CURRENT FILE: ${filePath}

${"=".repeat(60)}
CURRENT CONTENT:
${"=".repeat(60)}
${currentContent}

USER REQUEST: ${userRequest}

INSTRUCTIONS:
1. Return ONLY the complete new file content
2. Make minimal changes — only what's needed for the request
3. Preserve all existing functionality
4. Use TypeScript, React, Next.js App Router, Tailwind CSS
5. Wrap the full file in a code block: \`\`\`tsx ... \`\`\`

Return the complete modified file:`;
  }

  /** Extract code block from LLM response — robust version */
  extractCode(response: string): string | null {
    if (!response) return null;

    // Pattern 1: Standard fenced code block with language tag
    // ```tsx\n...code...\n```
    const standardMatch = response.match(/```(?:tsx?|jsx?|css|typescript|javascript)?\s*\n?([\s\S]*?)```/);
    if (standardMatch) {
      const extracted = standardMatch[1].trim();
      // Sanity check: if extracted content still starts with backticks, something went wrong
      if (!extracted.startsWith('```')) {
        return extracted;
      }
    }

    // Pattern 2: Code block without language tag
    const plainMatch = response.match(/```\s*\n?([\s\S]*?)```/);
    if (plainMatch) {
      return plainMatch[1].trim();
    }

    // Pattern 3: Response starts with backticks on first line (common DeepSeek mistake)
    if (response.trim().startsWith('```')) {
      const lines = response.split('\n');
      // Remove first line ( ```tsx ) and last line ( ``` ) if present
      if (lines.length >= 2) {
        const endIdx = lines.length - 1;
        const startIdx = 0;
        // Check if last line is just backticks
        if (lines[endIdx].trim() === '```') {
          return lines.slice(startIdx + 1, endIdx).join('\n').trim();
        }
      }
    }

    // Fallback: return whole response stripped of any stray backtick lines
    return response
      .split('\n')
      .filter(line => !line.trim().match(/^```/))
      .join('\n')
      .trim();
  }

  /** Create a simple diff */
  createDiff(original: string, modified: string): string {
    const origLines = original.split("\n");
    const modLines = modified.split("\n");
    const diff: string[] = [];
    
    let i = 0, j = 0;
    while (i < origLines.length || j < modLines.length) {
      if (i < origLines.length && j < modLines.length && origLines[i] === modLines[j]) {
        diff.push(` ${origLines[i]}`);
        i++; j++;
      } else if (j < modLines.length) {
        diff.push(`+${modLines[j]}`);
        j++;
      } else if (i < origLines.length) {
        diff.push(`-${origLines[i]}`);
        i++;
      }
    }
    return diff.join("\n");
  }
}
