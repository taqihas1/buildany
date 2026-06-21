#!/usr/bin/env node
/**
 * Fix: Replace HTTP API call with direct DB insert in hermes-chat route
 * This fixes the "Unauthorized" error when Kelly calls buildany_create_project
 */
const fs = require('fs');
const path = require('path');

const ROUTE_FILE = '/root/buildany/src/app/api/hermes-chat/route.ts';

if (!fs.existsSync(ROUTE_FILE)) {
  console.error('Route file not found:', ROUTE_FILE);
  process.exit(1);
}

let content = fs.readFileSync(ROUTE_FILE, 'utf8');

// Check if already patched
if (content.includes('import { db } from')) {
  console.log('Already patched with DB imports');
  process.exit(0);
}

// 1. Add DB imports at the top (after the last import)
const dbImports = `
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { v4 as uuidv4 } from "uuid";
`;

// Find a good insertion point (after existing imports)
const importLines = content.split('\n');
let lastImportIndex = 0;
for (let i = 0; i < importLines.length; i++) {
  if (importLines[i].startsWith('import ')) {
    lastImportIndex = i;
  }
}
importLines.splice(lastImportIndex + 1, 0, dbImports.trim());
content = importLines.join('\n');

// 2. Replace the createProject function
const oldFunction = `async function createProject(prompt: string, platform: string, name?: string) {
  const res = await fetch("http://localhost:3000/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, platform, name })
  });
  return res.json();
}`;

const newFunction = `async function createProject(prompt: string, platform: string, name?: string) {
  try {
    const projectId = uuidv4();
    const projectName = name || prompt.slice(0, 50);
    const now = new Date();
    
    await db.insert(projects).values({
      id: projectId,
      name: projectName,
      description: prompt,
      platform: platform as "web" | "mobile" | "both",
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
    
    return { id: projectId, name: projectName, status: "draft", success: true };
  } catch (err: any) {
    console.error('[Kelly] DB error creating project:', err.message);
    return { error: err.message, success: false };
  }
}`;

if (content.includes(oldFunction)) {
  content = content.replace(oldFunction, newFunction);
  console.log('✅ Replaced createProject function');
} else {
  console.log('⚠️ Old function pattern not found exactly, trying partial match...');
  // Try to find and replace by looking for the fetch line
  if (content.includes('http://localhost:3000/api/projects')) {
    content = content.replace(
      /async function createProject\(prompt: string, platform: string, name\?: string\) \{[\s\S]*?\n\}/,
      newFunction
    );
    console.log('✅ Replaced createProject function (regex match)');
  } else {
    console.log('❌ Could not find createProject function');
    process.exit(1);
  }
}

fs.writeFileSync(ROUTE_FILE, content);
console.log('✅ Patched hermes-chat route to use direct DB calls');
console.log('');
console.log('Next steps:');
console.log('  1. npm run build');
console.log('  2. pm2 restart buildany');
console.log('  3. Test: curl -X POST http://localhost:3000/api/hermes-chat ...');
