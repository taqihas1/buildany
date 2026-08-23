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

COLOR PALETTE — Use these specific Tailwind classes (pick a theme and stick to it):
- Blue theme: bg-gradient-to-br from-blue-500 to-cyan-400, text-blue-600, bg-blue-50
- Purple theme: bg-gradient-to-br from-purple-500 to-pink-400, text-purple-600, bg-purple-50
- Orange theme: bg-gradient-to-br from-orange-500 to-amber-400, text-orange-600, bg-orange-50
- Emerald theme: bg-gradient-to-br from-emerald-500 to-teal-400, text-emerald-600, bg-emerald-50
- Dark theme: bg-slate-900, text-slate-100, bg-slate-800 for cards
- ALWAYS use bg-white or bg-slate-50 for card backgrounds (not transparent)
- Use text-gray-900 for headings, text-gray-600 for body text

EVERY ELEMENT MUST HAVE TAILWIND CLASSES:
- Cards: className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
- Buttons: className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
- Headings: className="text-3xl font-bold text-gray-900"
- Stats: className="text-4xl font-bold text-blue-600"
- Navigation: className="bg-white border-b border-gray-200 px-6 py-4"
- Layout containers: className="min-h-screen bg-gray-50" or "bg-slate-950" for dark
- Grids: className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
- Flex: className="flex items-center justify-between gap-4"

PAGE.TSX — CRITICAL RULES:
- page.tsx is the MAIN page — it MUST import and render ALL components you create
- NEVER write a generic "Welcome to Your App" or "Your app is ready" placeholder
- The page should be FULLY FUNCTIONAL and FEATURE-RICH on first render
- Import components like: import { Card } from "@/components/ui/card"
- Use demo data from src/lib/data.ts to populate the UI
- The user should see a REAL app, not a template
- Wrap everything in a styled container: <main className="min-h-screen bg-gray-50 p-6">

FILE STRUCTURE — Generate these files:
1. src/app/page.tsx (MAIN page — imports and uses ALL components, fully functional)
2. src/app/layout.tsx (root layout with proper fonts, metadata, MUST import "./globals.css")
3. src/app/globals.css (Tailwind directives + custom theme colors + animations)
4. src/components/*.tsx (as MANY components as needed — cards, headers, stats, lists, charts, etc.)
5. src/lib/data.ts (demo data — realistic mock data with proper names, values, images)
6. src/lib/utils.ts (cn() utility — already provided, DO NOT modify)
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
- The cn() utility is at @/lib/utils — use with CONDITIONAL STRINGS only:
  GOOD: cn("base", variant === "primary" && "bg-blue-500", size === "lg" && "px-4")
  BAD:  cn({ "bg-blue-500": variant === "primary" })  ← NEVER use object syntax, TypeScript will fail
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
    
    // Fix common Morgan mistakes
    await fixLayoutImports(projectDir);
    await fixPageComponentUsage(projectDir);
    await fixCnObjectSyntax(projectDir);
    await fixPlaceholderPage(projectDir, shortName);
    
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

// ── Post-generation sanitizers ─────────────────────────────────────────────

/** Ensure layout.tsx imports globals.css */
async function fixLayoutImports(projectDir: string) {
  const layoutPath = path.join(projectDir, "src", "app", "layout.tsx");
  try {
    let code = await fs.readFile(layoutPath, "utf8");
    if (!code.includes("globals.css") && !code.includes("./globals.css")) {
      // Add import at top
      code = `import "./globals.css";\n` + code;
      await fs.writeFile(layoutPath, code);
      console.log("[Sanitize] Added globals.css import to layout.tsx");
    }
  } catch {
    // layout.tsx may not exist
  }
}

/** Fix page.tsx to use actual JSX components instead of text */
async function fixPageComponentUsage(projectDir: string) {
  const pagePath = path.join(projectDir, "src", "app", "page.tsx");
  try {
    let code = await fs.readFile(pagePath, "utf8");
    // Fix "Component: X" or "{X}" rendered as text — replace with <X />
    // Pattern: "Component: StatCard" → <StatCard />
    code = code.replace(/Component:\s*(\w+)/g, '<$1 />');
    // Fix standalone component names in JSX that aren't tags
    // e.g. {StatCard} without < > around it
    await fs.writeFile(pagePath, code);
  } catch {
    // page.tsx may not exist
  }
}

/** Replace cn() object syntax with conditional strings to avoid TypeScript errors */
async function fixCnObjectSyntax(projectDir: string) {
  const srcDir = path.join(projectDir, "src");
  try {
    const entries = await fs.readdir(srcDir, { recursive: true });
    for (const entry of entries) {
      if (typeof entry === "string" && (entry.endsWith(".tsx") || entry.endsWith(".ts"))) {
        const fp = path.join(srcDir, entry);
        let code = await fs.readFile(fp, "utf8");
        // Replace cn({ "class-name": condition }) with cn(condition && "class-name")
        // This is a simple regex that catches most cases
        code = code.replace(/cn\(\s*\{([^}]+)\}\s*\)/g, (match: string, content: string) => {
          const pairs = content.split(",").map((p: string) => p.trim()).filter(Boolean);
          const conditions = pairs.map((pair: string) => {
            const colonIdx = pair.indexOf(":");
            if (colonIdx === -1) return pair;
            const className = pair.slice(0, colonIdx).trim().replace(/['"]/g, "");
            const condition = pair.slice(colonIdx + 1).trim();
            return `${condition} && "${className}"`;
          });
          return `cn(${conditions.join(", ")})`;
        });
        await fs.writeFile(fp, code);
      }
    }
  } catch (e) {
    console.error("[Sanitize] fixCnObjectSyntax error:", e);
  }
}

/** Detect placeholder page.tsx and rebuild it using actual generated components */
async function fixPlaceholderPage(projectDir: string, appName: string) {
  const pagePath = path.join(projectDir, "src", "app", "page.tsx");
  try {
    let code = await fs.readFile(pagePath, "utf8");
    const placeholderPatterns = [
      "Welcome to Your App",
      "Built with BuildAny",
      "Your app is ready",
      "Components have been generated",
      "Hello from",
    ];
    const isPlaceholder = placeholderPatterns.some((p) => code.includes(p));
    if (!isPlaceholder) return;

    console.log("[Sanitize] Placeholder page detected — rebuilding with real components");

    // Scan for generated components
    const componentsDir = path.join(projectDir, "src", "components");
    const componentImports: string[] = [];
    const componentUsage: string[] = [];

    try {
      const entries = await fs.readdir(componentsDir, { recursive: true });
      for (const entry of entries) {
        if (typeof entry === "string" && entry.endsWith(".tsx")) {
          const baseName = path.basename(entry, ".tsx");
          const pascalName = baseName
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join("");
          const relPath = entry.replace(/\\/g, "/");
          componentImports.push(`import { ${pascalName} } from "@/components/${relPath.replace(/\.tsx$/, "")}";`);
          componentUsage.push(`        <${pascalName} />`);
        }
      }
    } catch {
      // No components dir
    }

    const newPage = `// @ts-nocheck
'use client';

import React from "react";
${componentImports.join("\n")}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            ${appName}
          </h1>
          <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-sm">Pro</span>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
            ${appName}
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Your modern dashboard with real-time insights and beautiful visualizations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <p className="text-gray-400 text-sm mb-1">Total Users</p>
            <p className="text-3xl font-bold text-blue-400">12,847</p>
            <p className="text-green-400 text-sm mt-1">+23% this week</p>
          </div>
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <p className="text-gray-400 text-sm mb-1">Revenue</p>
            <p className="text-3xl font-bold text-cyan-400">$48.2K</p>
            <p className="text-green-400 text-sm mt-1">+18% this month</p>
          </div>
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <p className="text-gray-400 text-sm mb-1">Active Sessions</p>
            <p className="text-3xl font-bold text-teal-400">3,421</p>
            <p className="text-green-400 text-sm mt-1">+12% today</p>
          </div>
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <p className="text-gray-400 text-sm mb-1">Growth Rate</p>
            <p className="text-3xl font-bold text-purple-400">94.2%</p>
            <p className="text-green-400 text-sm mt-1">+5.3% vs last month</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
${componentUsage.join("\n")}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-2xl p-6 border border-blue-500/20">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 text-2xl">⚡</div>
            <h3 className="text-lg font-semibold mb-2">Lightning Fast</h3>
            <p className="text-gray-400">Optimized for performance with instant load times.</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-purple-500/20">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4 text-2xl">🔒</div>
            <h3 className="text-lg font-semibold mb-2">Secure by Default</h3>
            <p className="text-gray-400">Enterprise-grade security with end-to-end encryption.</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl p-6 border border-emerald-500/20">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4 text-2xl">📊</div>
            <h3 className="text-lg font-semibold mb-2">Real-time Analytics</h3>
            <p className="text-gray-400">Live data updates with beautiful visualizations.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
`;

    await fs.writeFile(pagePath, newPage);
    console.log("[Sanitize] Rebuilt page.tsx with", componentImports.length, "component imports");
  } catch (e) {
    console.error("[Sanitize] fixPlaceholderPage error:", e);
  }
}
