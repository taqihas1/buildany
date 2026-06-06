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
  web: `You are an expert frontend developer. Generate a plain HTML/CSS/JS website that runs directly in the browser.

Rules:
- Use vanilla HTML5, CSS3, and JavaScript (NO frameworks like React, Next.js, Vue, etc.)
- Use a single HTML file with embedded CSS and JS, OR separate .html, .css, and .js files
- Use Tailwind CSS via CDN if needed: <script src="https://cdn.tailwindcss.com"></script>
- Use Lucide icons via CDN: <script src="https://unpkg.com/lucide@latest"></script>
- Make it visually stunning with modern CSS (gradients, shadows, animations, transitions)
- Use semantic HTML5 tags (header, nav, main, section, footer)
- Ensure responsive design with CSS media queries or Tailwind classes
- All functionality must work with vanilla JS (DOM manipulation, fetch API, event listeners)
- NEVER use emojis in the UI — use Lucide icons or SVG instead
- Use modern CSS features: flexbox, grid, custom properties, transitions
- Add smooth animations and hover effects for a polished feel
- The code MUST run directly in a browser iframe without any build step or server

Output format: Return code as markdown code blocks with file paths:
\`\`\`html:index.html
<!-- code here -->
\`\`\`

IMPORTANT: Always provide COMPLETE, runnable files. Never use "..." or "// rest of code" placeholders.`,

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

Output format: Return code as markdown code blocks with file paths:
\`\`\`tsx:app/index.tsx
// code here
\`\`\`

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

Output format: Return code as markdown code blocks with file paths:
\`\`\`tsx:app/page.tsx
// code here
\`\`\`

IMPORTANT: Always provide COMPLETE, runnable files. Never use "..." or "// rest of code" placeholders.`,
};

// ─── LLM Router ───

export class LLMRouter {
  private configs: Map<LLMProvider, LLMConfig> = new Map();

  async loadConfigs() {
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

  getConfig(provider: LLMProvider): LLMConfig | undefined {
    return this.configs.get(provider);
  }

  selectProvider(prompt: string, preferred?: string): LLMProvider {
    // Map model IDs to provider names
    const modelToProvider: Record<string, LLMProvider> = {
      'deepseek-chat': 'deepseek',
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
      });

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
      });

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
  const files: ParsedFile[] = [];
  
  // Try format: ```language:path
  const formatWithPath = /```(?:(\w+):)?([^\n]+)\n([\s\S]*?)```/g;
  let match;
  while ((match = formatWithPath.exec(content)) !== null) {
    const language = match[1] || "html";
    const path = match[2].trim();
    const fileContent = match[3].trim();
    if (path && fileContent && !files.find(f => f.path === path)) {
      files.push({ path, content: fileContent, language });
    }
  }
  
  // If no files found, try format: // filepath or # filepath followed by ```language
  if (files.length === 0) {
    const lines = content.split('\n');
    let currentPath = '';
    let currentContent = '';
    let currentLang = 'html';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for file path markers
      const pathMatch = line.match(/^\s*(?:\/\/|#|\/\*|\*)\s*(\S+\.(?:html|css|js|tsx|jsx|ts|json|md))\s*$/i);
      if (pathMatch) {
        if (currentPath && currentContent) {
          files.push({ path: currentPath, content: currentContent.trim(), language: currentLang });
        }
        currentPath = pathMatch[1];
        currentContent = '';
        continue;
      }
      
      // Check for code block start
      const blockMatch = line.match(/^```(\w+)?/);
      if (blockMatch) {
        if (currentPath && currentContent) {
          files.push({ path: currentPath, content: currentContent.trim(), language: currentLang });
        }
        currentLang = blockMatch[1] || 'html';
        currentContent = '';
        continue;
      }
      
      // Check for code block end
      if (line.trim() === '```') {
        if (currentPath && currentContent) {
          files.push({ path: currentPath, content: currentContent.trim(), language: currentLang });
        }
        currentPath = '';
        currentContent = '';
        continue;
      }
      
      // If we have a path, accumulate content
      if (currentPath) {
        currentContent += line + '\n';
      }
    }
    
    // Don't forget the last file
    if (currentPath && currentContent) {
      files.push({ path: currentPath, content: currentContent.trim(), language: currentLang });
    }
  }
  
  // If still no files, assume it's a single HTML file
  if (files.length === 0 && content.includes('<!DOCTYPE html>') || content.includes('<html')) {
    files.push({ path: 'index.html', content, language: 'html' });
  }
  
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
