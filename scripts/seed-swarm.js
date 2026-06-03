const Database = require("better-sqlite3");

const sqlite = new Database("./sqlite.db");

// Seed initial shared skills for the swarm
const seedSkills = [
  {
    id: "skill-expo-54-preflight",
    agent_id: null,
    name: "Expo SDK 54 Pre-flight Check",
    description: "Validates Expo SDK 54 project before build: checks React version, React Native version, Metro config, tsconfig paths, and circular imports.",
    category: "expo",
    code: `function preflight(projectDir) {
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync(projectDir + '/package.json'));
  const errors = [];
  if (pkg.dependencies.expo?.startsWith('54') === false) errors.push('Expo SDK must be 54.x');
  if (pkg.dependencies.react !== '19.1.0') errors.push('React must be 19.1.0');
  if (pkg.dependencies['react-native'] !== '0.81.5') errors.push('React Native must be 0.81.5');
  return { valid: errors.length === 0, errors };
}`,
    trigger_patterns: '["expo","sdk 54","react native","preflight","validate"]',
    context_required: '["projectDir"]',
    is_shared: 1,
    version: 1,
  },
  {
    id: "skill-expo-cicd-github",
    agent_id: null,
    name: "Expo EAS + GitHub Actions CI/CD",
    description: "Generates GitHub Actions workflow for Expo EAS Build with auto-retry, issue creation on failure, and EAS submit for iOS/Android.",
    category: "deployment",
    code: `# .github/workflows/eas-build.yml template
name: EAS Build
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: \${{ secrets.EXPO_TOKEN }}
      - run: eas build --platform all --non-interactive`,
    trigger_patterns: '["ci/cd","github actions","eas","deploy","workflow","build"]',
    context_required: '["projectType","expoAccount"]',
    is_shared: 1,
    version: 1,
  },
  {
    id: "skill-nextjs-shadcn-setup",
    agent_id: null,
    name: "Next.js 15 + shadcn/ui Scaffold",
    description: "Scaffolds a Next.js 15 project with Tailwind CSS, shadcn/ui components, and common Radix UI primitives. Excludes invalid packages like @radix-ui/react-badge.",
    category: "react",
    code: `// shadcn/ui setup for Next.js 15
// 1. npx shadcn@latest init --yes --template next --base-color slate
// 2. Install verified Radix packages:
//    - @radix-ui/react-avatar, dialog, dropdown-menu, label, progress, scroll-area, select, separator, slot, tabs, toast, tooltip
// 3. Exclude: @radix-ui/react-badge (doesn't exist), @radix-ui/react-card (doesn't exist)
// 4. Add components: npx shadcn add button card input textarea`,
    trigger_patterns: '["nextjs","next.js","shadcn","web app","scaffold","setup"]',
    context_required: '["projectName","baseColor"]',
    is_shared: 1,
    version: 1,
  },
  {
    id: "skill-clerk-v5-auth",
    agent_id: null,
    name: "Clerk v5 Authentication Pattern",
    description: "Correct Clerk v5 imports and patterns: auth() returns Promise, must await. Use @clerk/nextjs/server for middleware. UserButton no longer accepts afterSignOutUrl.",
    category: "react",
    code: `// Clerk v5 CORRECT patterns
import { auth } from "@clerk/nextjs/server";

// Server Component
const authData = await auth();
const userId = authData.userId;

// Middleware
import { clerkMiddleware } from "@clerk/nextjs/server";
export default clerkMiddleware();

// WRONG (v4 syntax)
// import { currentUser } from "@clerk/nextjs"  // Removed in v5
// const user = await currentUser()  // Use auth() instead`,
    trigger_patterns: '["clerk","auth","authentication","login","middleware","v5"]',
    context_required: '["framework"]',
    is_shared: 1,
    version: 1,
  },
  {
    id: "skill-sqlite-drizzle-orm",
    agent_id: null,
    name: "SQLite + Drizzle ORM Pattern",
    description: "SQLite file-based database with Drizzle ORM for Next.js. Use better-sqlite3 driver. Schema uses sqliteTable from drizzle-orm/sqlite-core.",
    category: "testing",
    code: `// db/index.ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const sqlite = new Database("./sqlite.db");
export const db = drizzle(sqlite, { schema });

// drizzle.config.ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: { url: "./sqlite.db" },
});`,
    trigger_patterns: '["sqlite","drizzle","database","orm","db","schema"]',
    context_required: '["projectDir"]',
    is_shared: 1,
    version: 1,
  },
  {
    id: "skill-llm-router-deepspeek",
    agent_id: null,
    name: "DeepSeek API Integration",
    description: "DeepSeek V3 API integration pattern with JSON response format enforcement. Use deepseek-chat model for coding tasks.",
    category: "testing",
    code: `const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: \`Bearer \${process.env.DEEPSEEK_API_KEY}\`,
  },
  body: JSON.stringify({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: "You are a code generator. Return ONLY valid JSON." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  }),
});`,
    trigger_patterns: '["deepseek","llm","api","generate","code generation","ai"]',
    context_required: '["apiKey","prompt"]',
    is_shared: 1,
    version: 1,
  },
];

for (const skill of seedSkills) {
  try {
    const stmt = sqlite.prepare(`
      INSERT OR IGNORE INTO skills (
        id, agent_id, name, description, category, code,
        trigger_patterns, context_required, is_shared, version,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    stmt.run(
      skill.id,
      skill.agent_id,
      skill.name,
      skill.description,
      skill.category,
      skill.code,
      skill.trigger_patterns,
      skill.context_required,
      skill.is_shared,
      skill.version,
    );
    console.log(`✅ Seeded: ${skill.name}`);
  } catch (err) {
    console.error(`❌ Failed to seed ${skill.name}:`, err.message);
  }
}

// Seed a default Hermes agent
const stmt = sqlite.prepare(`
  INSERT OR IGNORE INTO agents (id, name, type, status, capabilities, metadata, created_at)
  VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
`);
stmt.run(
  "agent-hermes-001",
  "Hermes-001",
  "hermes",
  "idle",
  '["code", "test", "debug", "expo", "react", "nextjs"]',
  '{"model": "deepseek-chat", "maxTokens": 4000, "temperature": 0.3}',
);
console.log("✅ Seeded: Hermes-001 agent");

console.log("\n🚀 Swarm seed complete! 6 skills + 1 agent ready.");
