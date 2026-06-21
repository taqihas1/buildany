#!/usr/bin/env node
const fs = require('fs');
const f = '/root/buildany/src/app/api/hermes-chat/route.ts';
let c = fs.readFileSync(f, 'utf8');

// Find and replace the insert block
const oldInsert = `    await db.insert(projects).values({
      id: projectId,
      name: projectName,
      description: prompt,
      platform: platform as "web" | "mobile" | "both",
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });`;

const newInsert = `    await db.insert(projects).values({
      id: projectId,
      userId: "system",
      name: projectName,
      description: prompt,
      type: platform as "web" | "mobile" | "both",
      status: "draft",
    });`;

if (c.includes(oldInsert)) {
  c = c.replace(oldInsert, newInsert);
  console.log('✅ Fixed insert statement');
} else {
  // Try broader match
  c = c.replace(
    /await db\.insert\(projects\)\.values\(\{[\s\S]*?\}\);/,
    `await db.insert(projects).values({
      id: projectId,
      userId: "system",
      name: projectName,
      description: prompt,
      type: platform as "web" | "mobile" | "both",
      status: "draft",
    });`
  );
  console.log('✅ Fixed insert statement (regex)');
}

fs.writeFileSync(f, c);
console.log('Done! Run: cd /root/buildany && npm run build && pm2 restart buildany');
