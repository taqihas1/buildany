import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type LLMProvider = "deepseek" | "kimi" | "openai" | "gemma";

interface LLMConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}

interface GenerateOptions {
  prompt: string;
  systemPrompt?: string;
  provider?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

interface GenerateResult {
  success: boolean;
  content?: string;
  error?: string;
  tokensUsed?: number;
  provider: string;
  model: string;
}

export interface StreamChunk {
  content: string;
  done: boolean;
  error?: string;
}

// ─── System Prompts ───

export const SYSTEM_PROMPTS = {
  web: `You are an expert Next.js 15 + React 19 + TypeScript developer.

MANDATORY FILE STRUCTURE — You MUST generate ALL of these files with EXACT paths:

1. src/app/layout.tsx — Root layout (MUST wrap children in <html> and <body>)
2. src/app/page.tsx — Main page component (this is what renders at /)
3. src/app/globals.css — Tailwind directives + custom styles
4. src/components/ui/ — Reusable UI components
5. src/lib/utils.ts — Utility functions
6. next.config.js — Export config (I will add this, you can skip)
7. package.json — Dependencies (I will add this, you can skip)

CRITICAL RULES:
- NEVER create files at the project root like app.tsx, index.html, layout.tsx
- ALWAYS put pages in src/app/ — page.tsx for the home page, layout.tsx for root layout
- ALWAYS use 'use client' at the top of client components (anything with useState, useEffect, onClick, etc.)
- Server components (async data fetching) do NOT need 'use client'
- Use Tailwind CSS utility classes for ALL styling (NO inline styles, NO CSS-in-JS)
- Use Lucide React icons: import { IconName } from "lucide-react"
- NEVER use emojis — only Lucide icons
- All buttons and interactive elements MUST work with real React state
- NEVER create placeholder functions — everything must work
- PAGE.TSX MUST implement the user's ACTUAL requirements — NEVER output generic placeholder content like "Welcome to Your App"
- If user asks for a fitness app, page.tsx MUST show workouts, progress, dashboard — NOT a generic welcome page
- NEVER use "..." or "// rest of code" — complete files only

EXAMPLE OUTPUT:
\`\`\`tsx:src/app/layout.tsx
export const metadata = {
  title: "My App",
  description: "Built with BuildAny",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900">{children}</body>
    </html>
  );
}
\`\`\`

\`\`\`tsx:src/app/page.tsx
'use client';
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const [count, setCount] = useState(0);
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">My App</h1>
      <p className="mt-4">Count: {count}</p>
      <Button onClick={() => setCount(c => c + 1)}>Increment</Button>
    </main>
  );
}
\`\`\`

OUTPUT FORMAT:
You MUST output files using markdown code blocks with EXACT file paths.
Format: \`\`\`tsx:src/app/page.tsx
Provide COMPLETE, runnable files. NEVER skip files. NEVER use placeholders.`,
  mobile: `You are an expert React Native + Expo SDK 54 developer. Generate production-ready mobile apps.

Rules:
- Use React Native with TypeScript
- Use Expo Router for navigation (file-based routing)
- Use NativeWind (Tailwind for RN) for styling
- Use Lucide React Native for icons (NEVER emojis in UI)
- Use functional components with hooks
- Follow mobile UX patterns (touch targets, safe areas, etc.)
- Add loading states and error handling
- Use Expo SDK 54 APIs (expo-camera, expo-location, etc. when needed)

Output format: Return code as markdown code blocks with file paths.
Use BACKTICKBACKTICKBACKTICKtsx:app/index.tsx format.
Replace BACKTICK with actual backtick character.
IMPORTANT: Always provide COMPLETE, runnable files. Never use "..." or "// rest of code" placeholders.`,

  dashboard: `You are an expert React + Tailwind CSS developer specializing in data visualization dashboards.

Rules:
- Use React with TypeScript
- Use Tailwind CSS for all styling
- Use Recharts for charts and graphs
- Use Lucide React for icons (NEVER emojis in UI)
- Use shadcn/ui patterns for cards, tables, and forms
- Make layouts responsive (grid, flex)
- Add loading states and empty states
- Use proper TypeScript types for data structures

Output format: Return code as markdown code blocks with file paths.
Use BACKTICKBACKTICKBACKTICKtsx:app/page.tsx format.
Replace BACKTICK with actual backtick character.
IMPORTANT: Always provide COMPLETE, runnable files. Never use "..." or "// rest of code" placeholders.`,
};

// ─── LLM Router ───

export class LLMRouter {
  private configs: Map<LLMProvider, LLMConfig> = new Map();

  async loadConfigs() {
    // ─── 1. Load from process.env FIRST (source of truth) ───
    if (process.env.DEEPSEEK_API_KEY) {
      this.configs.set("deepseek", {
        baseUrl: "https://api.deepseek.com/v1",
        model: "deepseek-chat",
        apiKey: process.env.DEEPSEEK_API_KEY,
      });
    }
    if (process.env.KIMI_API_KEY) {
      this.configs.set("kimi", {
        baseUrl: "https://api.moonshot.cn/v1",
        model: "moonshot-v1-8k",
        apiKey: process.env.KIMI_API_KEY,
      });
    }
    if (process.env.OPENAI_API_KEY) {
      this.configs.set("openai", {
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o",
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    if (process.env.GEMMA_API_KEY) {
      this.configs.set("gemma", {
        baseUrl: "http://localhost:1234/v1",
        model: "gemma-4-e2b",
        apiKey: process.env.GEMMA_API_KEY,
      });
    }

    // ─── 2. Only if .env is empty, fall back to DB ───
    if (this.configs.size === 0) {
      console.log('[LLM Router] No API keys in .env, falling back to database...');
      const keys = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.isActive, true));

      for (const key of keys) {
        const provider = key.provider as LLMProvider;
        if (provider === "deepseek") {
          this.configs.set(provider, {
            baseUrl: "https://api.deepseek.com/v1",
            model: "deepseek-chat",
            apiKey: key.keyValue,
          });
        } else if (provider === "kimi") {
          this.configs.set(provider, {
            baseUrl: "https://api.moonshot.cn/v1",
            model: "moonshot-v1-8k",
            apiKey: key.keyValue,
          });
        } else if (provider === "openai") {
          this.configs.set(provider, {
            baseUrl: "https://api.openai.com/v1",
            model: "gpt-4o",
            apiKey: key.keyValue,
          });
        } else if (provider === "gemma") {
          this.configs.set(provider, {
            baseUrl: "http://localhost:1234/v1",
            model: "gemma-4-e2b",
            apiKey: key.keyValue || "not-needed",
          });
        }
      }
    }
  }

  getConfig(provider: LLMProvider): LLMConfig | undefined {
    return this.configs.get(provider);
  }

  selectProvider(prompt: string, preferred?: string): LLMProvider {
    // Map model IDs to provider names
    const modelToProvider: Record<string, LLMProvider> = {
      'deepseek-v4-pro': 'deepseek',
      'kimi-k2p6': 'kimi',
      'gpt-4o': 'openai',
      'gemma-4': 'gemma',
      'kimi': 'kimi',
      'deepseek': 'deepseek',
      'openai': 'openai',
      'gemma': 'gemma',
    };
    
    const normalizedPreferred = preferred ? modelToProvider[preferred] || (preferred as LLMProvider) : undefined;

    // If preferred provider is available, use it
    if (normalizedPreferred && this.configs.has(normalizedPreferred)) {
      return normalizedPreferred;
    }

    // Check for Chinese language - prefer Kimi
    const hasChinese = /[\u4e00-\u9fa5]/.test(prompt);
    if (hasChinese && this.configs.has("kimi")) {
      return "kimi";
    }

    // Check for complex coding tasks - prefer DeepSeek
    const codingKeywords = ["algorithm", "database", "api", "backend", "complex", "advanced"];
    const isCoding = codingKeywords.some((kw) => prompt.toLowerCase().includes(kw));
    if (isCoding && this.configs.has("deepseek")) {
      return "deepseek";
    }

    // Default to available provider: Kimi first, then DeepSeek, then OpenAI
    if (this.configs.has("kimi")) return "kimi";
    if (this.configs.has("deepseek")) return "deepseek";
    if (this.configs.has("openai")) return "openai";

    throw new Error("No LLM providers configured. Add API keys in admin panel.");
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    await this.loadConfigs();

    const provider = this.selectProvider(options.prompt, options.provider);
    const config = this.configs.get(provider)!;

    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout

    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: "system",
              content: options.systemPrompt || SYSTEM_PROMPTS.web,
            },
            { role: "user", content: options.prompt },
          ],
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4000,
          stream: options.stream ?? false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `API error (${response.status}): ${error}`,
          provider,
          model: config.model,
        };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      const tokensUsed = data.usage?.total_tokens;

      return {
        success: true,
        content,
        tokensUsed,
        provider,
        model: config.model,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'LLM request timed out after 120 seconds. The API may be slow or unavailable.',
          provider,
          model: config.model,
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        provider,
        model: config.model,
      };
    }
  }

  async *stream(options: GenerateOptions): AsyncGenerator<StreamChunk> {
    await this.loadConfigs();

    const provider = this.selectProvider(options.prompt, options.provider);
    const config = this.configs.get(provider)!;

    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout

    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: "system",
              content: options.systemPrompt || SYSTEM_PROMPTS.web,
            },
            { role: "user", content: options.prompt },
          ],
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4000,
          stream: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        yield { content: "", done: true, error: `API error (${response.status}): ${error}` };
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        yield { content: "", done: true, error: "No response body" };
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() === "" || line.startsWith(":")) continue;
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              yield { content: "", done: true };
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || "";
              yield { content: delta, done: false };
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      yield { content: "", done: true };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        yield { content: "", done: true, error: 'LLM stream timed out after 120 seconds. The API may be slow or unavailable.' };
        return;
      }
      yield {
        content: "",
        done: true,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// ─── File Parser ───

export interface ParsedFile {
  path: string;
  content: string;
  language: string;
}

export function parseGeneratedCode(content: string): ParsedFile[] {
  console.log("[Parser] Input length:", content.length);
  console.log("[Parser] First 300 chars:", content.substring(0, 300).replace(/\n/g, " "));
  
  const files: ParsedFile[] = [];
  
  // ─── Strategy 0: JSON wrapper ───
  const trimmed = content.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        const inner = parsed.files || parsed.code || parsed.content || parsed.source || parsed.html;
        if (typeof inner === 'string') content = inner;
        else if (Array.isArray(parsed.files)) {
          for (const f of parsed.files) {
            if (f.path && f.content) {
              files.push({ path: f.path, content: f.content, language: f.language || f.path.split('.').pop() || 'html' });
            }
          }
          if (files.length > 0) {
            console.log("[Parser] Extracted", files.length, "files from JSON");
            return files;
          }
        }
      }
    } catch (e) { /* not JSON */ }
  }
  
  // ─── Strategy 1: Split by code blocks and parse each ───
  // Pattern: ```lang or ```lang:path followed by content ending with ```
  const blockRegex = /```(?:(\w+)(?::([^\n]+))?)?\n([\s\S]*?)(?:\n)?```/g;
  let match;
  let blockCount = 0;
  
  while ((match = blockRegex.exec(content)) !== null) {
    blockCount++;
    const lang = match[1] || 'text';
    const pathFromFence = match[2] ? match[2].trim() : null;
    let blockContent = match[3];
    
    // Skip bash/sh/shell blocks (setup commands)
    if (lang === 'bash' || lang === 'sh' || lang === 'shell') {
      console.log("[Parser] Skipping bash block #", blockCount);
      continue;
    }
    
    let path = pathFromFence;
    let codeStartLine = 0;
    
    // If no path in fence, look for path comment in first 3 lines
    if (!path) {
      const lines = blockContent.split('\n');
      for (let i = 0; i < Math.min(3, lines.length); i++) {
        const line = lines[i].trim();
        // Match: // app/page.tsx, // app/page.tsx (complete), # app/page.tsx, /* app/page.tsx */
        const commentMatch = line.match(/^(?:\/\/|#|\/\*)\s*([\w\/\-.]+\.(?:html|css|js|tsx|jsx|ts|json|md|py))(?:\s*\*\/)?(?:\s*\(complete\))?/i);
        if (commentMatch) {
          path = commentMatch[1];
          codeStartLine = i + 1;
          console.log("[Parser] Found path in comment:", path);
          break;
        }
      }
    }
    
    // Auto-assign path if still not found
    if (!path) {
      const code = blockContent.toLowerCase();
      if (code.includes('<!doctype html>') || code.includes('<html')) {
        path = 'index.html';
      } else if (lang === 'css') {
        path = 'styles.css';
      } else if (lang === 'js' || lang === 'javascript') {
        path = 'app.js';
      } else if (lang === 'tsx' || lang === 'ts') {
        path = 'app.tsx';
      } else if (lang === 'jsx') {
        path = 'app.jsx';
      } else {
        path = `file${blockCount}.${lang}`;
      }
      console.log("[Parser] Auto-assigned path:", path);
    }
    
    // Extract code (skip path comment lines if found)
    const allLines = blockContent.split('\n');
    const code = allLines.slice(codeStartLine).join('\n').trim();
    
    if (code && !files.find(f => f.path === path)) {
      files.push({ path, content: code, language: lang });
      console.log("[Parser] Added file:", path, "(" + code.length, "chars)");
    }
  }
  
  // ─── Strategy 2: Raw HTML (no code blocks) ───
  if (files.length === 0 && (content.includes('<!DOCTYPE html>') || content.includes('<html'))) {
    // Strip AI explanation preamble before storing
    let cleanContent = content;
    const doctypeIdx = content.indexOf('<!DOCTYPE html>');
    const htmlIdx = content.indexOf('<html');
    const startIdx = doctypeIdx >= 0 ? doctypeIdx : htmlIdx;
    if (startIdx > 0) {
      cleanContent = content.substring(startIdx);
      console.log("[Parser] Stripped preamble, kept from index:", startIdx);
    }
    files.push({ path: 'index.html', content: cleanContent, language: 'html' });
  }
  
  console.log("[Parser] Total files extracted:", files.length);
  return files;
}

export function getSystemPromptForType(type: string): string {
  switch (type) {
    case "mobile":
      return SYSTEM_PROMPTS.mobile;
    case "dashboard":
      return SYSTEM_PROMPTS.dashboard;
    case "web":
    default:
      return SYSTEM_PROMPTS.web;
  }
}

export const llmRouter = new LLMRouter();
