#!/usr/bin/env python3
import re

with open('src/app/api/hermes-chat/route.ts', 'r') as f:
    c = f.read()

# Add imports at top (after existing imports)
import_block = '''import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";'''

if 'import { db }' not in c:
    c = c.replace('import { NextRequest }', import_block + '\nimport { NextRequest }')

# Replace the createProject function
old_func = '''async function createProject(prompt: string, platform: string, name?: string) {
  const res = await fetch("http://localhost:3000/api/project", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, platform, name })
  });
  return res.json();
}'''

new_func = '''async function createProject(prompt: string, platform: string, name?: string) {
  const projectId = crypto.randomUUID();
  const projectName = name || prompt.substring(0, 30).replace(/[^a-zA-Z0-9 ]/g, "") || "New Project";
  await db.insert(projects).values({
    id: projectId,
    userId: "hermes-agent",
    name: projectName.trim(),
    description: prompt,
    type: platform as "web" | "mobile" | "both",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return { success: true, id: projectId, name: projectName };
}'''

if old_func in c:
    c = c.replace(old_func, new_func)
    print("✅ Function replaced")
else:
    print("⚠️ Old function not found, trying regex...")
    # Fallback: replace everything between "async function createProject" and the next "}"
    pattern = r'async function createProject\(prompt: string, platform: string, name\?: string\) \{[^}]+\}[^}]+\}'
    c = re.sub(pattern, new_func, c)
    print("✅ Function replaced via regex")

with open('src/app/api/hermes-chat/route.ts', 'w') as f:
    f.write(c)

print("Done!")
