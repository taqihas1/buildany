import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, projectFiles, conversations } from "@/lib/db/schema";
import { generateShortName } from "@/lib/project-name-generator";
import { eq } from "drizzle-orm";
import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || "";
const PROJECTS_DIR = "/data/projects";

function sanitizeGeneratedFiles(projectDir: string) {
  try {
    const nodeFs = require("fs");
    const nodePath = require("path");
    
    function walkDir(dir: string, callback: (fp: string) => void) {
      if (!nodeFs.existsSync(dir)) return;
      const entries = nodeFs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = nodePath.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".git") {
          walkDir(fullPath, callback);
        } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
          callback(fullPath);
        }
      }
    }
    
    const srcDir = nodePath.join(projectDir, "src");
    walkDir(srcDir, (fp: string) => {
      if (fp.includes("_document")) return;
      
      let code = nodeFs.readFileSync(fp, "utf8");
      if (!code.includes("next/document")) return;
      
      console.log("[Sanitize] Fixing: " + fp);
      
      code = code.replace(/import\s*\{[^}]*\}\s*from\s*['"]next\/document['"];?\s*\n?/gi, "");
      code = code.replace(/import\s+\w+\s+from\s*['"]next\/document['"];?\s*\n?/gi, "");
      code = code.replace(/<Html([^>]*)>/gi, "<div$1>");
      code = code.replace(/<\/Html>/gi, "</div>");
      code = code.replace(/<Main([^>]*)>/gi, "<main$1>");
      code = code.replace(/<\/Main>/gi, "</main>");
      code = code.replace(/<NextScript\s*\/>/gi, "");
      
      nodeFs.writeFileSync(fp, code);
    });
  } catch (e) {
    console.error("[Sanitize] Error:", e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, type = "web", appType, userId, projectId: existingProjectId } = body;
    const projectType = appType || type;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    let projectId: string;
    let projectDir: string;
    let shortName: string;

    if (existingProjectId) {
      projectId = existingProjectId;
      const existing = await db.select().from(projects).where(eq(projects.id, projectId)).get();
      if (!existing) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      shortName = existing.name;
      projectDir = path.join(PROJECTS_DIR, projectId);
      
      await db.update(projects)
        .set({ status: "creating", updatedAt: new Date() })
        .where(eq(projects.id, projectId));
    } else {
      projectId = crypto.randomUUID();
      shortName = generateShortName(prompt);

      await db.insert(projects).values({
        id: projectId,
        userId: userId || "guest-" + crypto.randomUUID(),
        name: shortName,
        description: prompt,
        type: projectType as "web" | "mobile" | "dashboard",
        status: "creating",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      projectDir = path.join(PROJECTS_DIR, projectId);
      await fs.mkdir(projectDir, { recursive: true });
      await fs.mkdir(path.join(projectDir, "src", "app"), { recursive: true });
      await fs.mkdir(path.join(projectDir, "src", "components"), { recursive: true });
      await fs.mkdir(path.join(projectDir, "src", "lib"), { recursive: true });

      try {
        execSync("git init", { cwd: projectDir, stdio: "ignore" });
        execSync('git config user.email "morgan@buildany.local"', { cwd: projectDir, stdio: "ignore" });
        execSync('git config user.name "Morgan"', { cwd: projectDir, stdio: "ignore" });
      } catch {
        // git optional
      }

      await db.insert(conversations).values({
        id: crypto.randomUUID(),
        projectId,
        role: "user",
        content: prompt,
        model: "user",
        createdAt: new Date(),
      });
    }

    const projectTypeForPrompt = projectType === "mobile" ? "React Native + Expo" : "Next.js 14 + App Router";

    const morganPrompt = `Build this app: "${prompt}"

Tech: ${projectTypeForPrompt}, TypeScript, Tailwind CSS, Lucide React icons.

DESIGN REQUIREMENTS (MANDATORY):
- MODERN and COLORFUL — use vibrant gradients, rich color palettes, NOT boring gray/white
- Use rounded corners (rounded-xl, rounded-2xl), soft shadows (shadow-lg, shadow-xl)
- Include hover effects, transitions, and smooth animations
- Use a cohesive color theme: primary color + accent color + neutral backgrounds
- Cards, pills, badges, and modern UI patterns everywhere
- Proper spacing with padding and gap utilities
- Demo data MUST be included — real-looking content, not "Item 1", "Item 2" placeholders
- Use Lucide icons (import from 'lucide-react') for visual polish
- Responsive design: stack on mobile, grid on desktop
- If showing data, use charts or visual representations (progress bars, stat cards, etc.)

FILE STRUCTURE — Generate these files:
1. src/app/page.tsx (main page — can import components from ../components/)
2. src/app/layout.tsx (root layout with proper fonts, metadata)
3. src/app/globals.css (Tailwind directives + custom theme colors + animations)
4. src/components/*.tsx (as MANY components as needed — cards, headers, stats, lists, charts, etc.)
5. src/lib/data.ts (demo data — realistic mock data with proper names, values, images)
6. src/lib/utils.ts (cn() utility — already provided)
7. next.config.js
8. package.json
9. tsconfig.json
10. tailwind.config.js (with custom colors, animations, and theme extensions)

RULES:
- Use the App Router (src/app).
- Export default page components.
- Use client components ONLY when needed ('use client').
- Keep server components async when possible.
- Use Next.js built-in features: Image, Link.
- CRITICAL: NEVER import <Html>, <Head>, <Main>, or <NextScript> from 'next/document' in any page.
- CRITICAL: NEVER create pages/_error.js or pages/_document.js or pages/500.js or pages/404.js
- Do NOT use <img>; always use next/image <Image> with unoptimized={true}.
- CRITICAL: NEVER put <link rel="stylesheet" /> in JSX.
- CRITICAL: NEVER call hooks like useState() directly in JSX return (always inside components).
- The cn() utility is available at @/lib/utils — it supports clsx syntax: cn("base", condition && "class", "other")
- Return ONLY the file paths and code blocks, no extra commentary.
- Make the app feel REAL and COMPLETE — not a template or placeholder.`;

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-v4-pro",
        messages: [{ role: "user", content: morganPrompt }],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content || "";

    const fileRegex = /```(?:tsx?|jsx?|css|json|md|env)?\s*\n?(?:\/\/\s*)?(.+?)\n([\s\S]*?)```/g;
    const files: Record<string, string> = {};
    let match;
    while ((match = fileRegex.exec(generatedText)) !== null) {
      let filePath = match[1].trim();
      // Strip leading // comment markers
      filePath = filePath.replace(/^\/\/\s*/, "");
      // Strip leading /* comment markers
      filePath = filePath.replace(/^\/\*\s*/, "");
      // Strip trailing */ comment markers
      filePath = filePath.replace(/\s*\*\/$/, "");
      filePath = filePath.trim();
      const fileContent = match[2].trim();
      if (filePath && fileContent) {
        files[filePath] = fileContent;
      }
    }

    const writtenFiles: string[] = [];
    for (const [relativePath, content] of Object.entries(files)) {
      const safePath = path.join(projectDir, relativePath.replace(/^\//, ""));
      await fs.mkdir(path.dirname(safePath), { recursive: true });
      const finalContent = relativePath.endsWith(".tsx") || relativePath.endsWith(".ts")
        ? "// @ts-nocheck\n" + content
        : content;
      await fs.writeFile(safePath, finalContent);
      writtenFiles.push(relativePath);
    }

    if (writtenFiles.length === 0) {
      const fallbackPage = path.join(projectDir, "src", "app", "page.tsx");
      await fs.writeFile(fallbackPage, `// @ts-nocheck\nexport default function Home() { return <div>Hello from ${shortName}</div>; }`);
      writtenFiles.push("src/app/page.tsx");
    }

    await writePackageJson(projectDir, projectType);
    await writeNextConfig(projectDir);
    await writeTsConfig(projectDir);
    await writeTailwindConfig(projectDir);
    await writeUtilsFile(projectDir);

    sanitizeGeneratedFiles(projectDir);
    
    // Ensure utils.ts is always correct (overwrites any AI-generated broken version)
    await writeUtilsFile(projectDir);

    try {
      execSync("git add -A", { cwd: projectDir, stdio: "ignore" });
      execSync('git commit -m "Initial generation"', { cwd: projectDir, stdio: "ignore" });
    } catch {
      // git optional
    }

    await db.update(projects)
      .set({ status: "ready", updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    for (const filePath of writtenFiles) {
      await db.insert(projectFiles).values({
        id: crypto.randomUUID(),
        projectId,
        path: filePath,
        content: files[filePath] || "",
      });
    }

    return NextResponse.json({
      success: true,
      projectId,
      projectName: shortName,
      files: writtenFiles,
    });

  } catch (error: any) {
    console.error("[Morgan Generate] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function writePackageJson(projectDir: string, type: string) {
  const isMobile = type === "mobile";
  const pkg = {
    name: "generated-app",
    version: "1.0.0",
    private: true,
    scripts: {
      dev: isMobile ? "expo start" : "next dev",
      build: isMobile ? "expo export:web" : "next build",
      start: isMobile ? "expo start" : "next start",
    },
    dependencies: isMobile
      ? { react: "^18", "react-native": "^0.73", expo: "~50.0.0" }
      : { next: "^15.0.0", react: "^19.0.0", "react-dom": "^19.0.0", tailwindcss: "^3.4.0", autoprefixer: "^10.4.0", postcss: "^8.4.0", clsx: "^2.1.0", "tailwind-merge": "^2.2.0", "lucide-react": "^0.400.0" },
    devDependencies: isMobile
      ? { "@types/react": "^18", typescript: "^5.3" }
      : { "@types/node": "^20", "@types/react": "^19", "@types/react-dom": "^19", typescript: "^5.3" },
  };
  await fs.writeFile(path.join(projectDir, "package.json"), JSON.stringify(pkg, null, 2));
}

async function writeNextConfig(projectDir: string) {
  const config = `
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};
module.exports = nextConfig;
`;
  await fs.writeFile(path.join(projectDir, "next.config.js"), config.trim());
}

async function writeTsConfig(projectDir: string) {
  const config = {
    compilerOptions: {
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      strict: false,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "preserve",
      incremental: true,
      plugins: [{ name: "next" }],
      paths: { "@/*": ["./src/*"] },
    },
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    exclude: ["node_modules"],
  };
  await fs.writeFile(path.join(projectDir, "tsconfig.json"), JSON.stringify(config, null, 2));
}

async function writeTailwindConfig(projectDir: string) {
  const config = `
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
          400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
          800: '#1e40af', 900: '#1e3a8a',
        },
        accent: {
          50: '#fdf4ff', 100: '#fae8ff', 200: '#f5d0fe', 300: '#f0abfc',
          400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf',
          800: '#86198f', 900: '#701a75',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'bounce-slow': 'bounce 2s infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
};
`;
  await fs.writeFile(path.join(projectDir, "tailwind.config.js"), config.trim());
  await fs.writeFile(path.join(projectDir, "postcss.config.js"), `module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };`);
}

async function writeUtilsFile(projectDir: string) {
  const utilsContent = `import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;
  const libDir = path.join(projectDir, "src", "lib");
  await fs.mkdir(libDir, { recursive: true });
  await fs.writeFile(path.join(libDir, "utils.ts"), utilsContent.trim());
}
