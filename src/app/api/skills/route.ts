import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { skills } from "@/lib/db/schema";
import { eq, like, and } from "drizzle-orm";
import { randomUUID } from "crypto";

// Skill Persistence Layer — CRUD + Search + Versioning + Sharing
export async function POST(req: Request) {
  try {
    const authData = await auth();
    const userId = authData.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, skill } = body;

    switch (action) {
      case "create":
        return createSkill(skill);
      case "update":
        return updateSkill(skill);
      case "search":
        return searchSkills(body.query, body.category, body.agentId);
      case "activate":
        return activateSkill(body.skillId, body.context);
      case "fork":
        return forkSkill(body.skillId, body.agentId);
      case "merge":
        return mergeSkills(body.sourceId, body.targetId);
      case "vote":
        return voteSkill(body.skillId, body.success);
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Skill layer error:", error);
    return NextResponse.json({ error: "Skill operation failed" }, { status: 500 });
  }
}

async function createSkill(skill: any) {
  if (!skill.name || !skill.category) {
    return NextResponse.json({ error: "Name and category required" }, { status: 400 });
  }

  // Check for duplicates
  const existing = await db.select().from(skills).where(
    and(eq(skills.name, skill.name), eq(skills.agentId, skill.agentId || "null"))
  );

  if (existing.length > 0) {
    // Update instead
    await db.update(skills).set({
      description: skill.description || existing[0].description,
      code: skill.code || existing[0].code,
      triggerPatterns: JSON.stringify(skill.triggerPatterns || []),
      contextRequired: JSON.stringify(skill.contextRequired || []),
      updatedAt: new Date(),
      version: (existing[0].version || 1) + 1,
    }).where(eq(skills.id, existing[0].id));

    return NextResponse.json({ updated: true, skillId: existing[0].id, version: (existing[0].version || 1) + 1 });
  }

  const skillId = randomUUID();
  await db.insert(skills).values({
    id: skillId,
    agentId: skill.agentId || null,
    name: skill.name,
    description: skill.description || "",
    category: skill.category,
    code: skill.code || "",
    triggerPatterns: JSON.stringify(skill.triggerPatterns || []),
    successCount: 0,
    failureCount: 0,
    contextRequired: JSON.stringify(skill.contextRequired || []),
    isShared: skill.isShared ? true : false,
    version: 1,
  });

  return NextResponse.json({ created: true, skillId, version: 1 });
}

async function updateSkill(skill: any) {
  if (!skill.id) {
    return NextResponse.json({ error: "Skill ID required" }, { status: 400 });
  }

  const existing = await db.select().from(skills).where(eq(skills.id, skill.id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  await db.update(skills).set({
    name: skill.name || existing.name,
    description: skill.description || existing.description,
    code: skill.code || existing.code,
    triggerPatterns: skill.triggerPatterns ? JSON.stringify(skill.triggerPatterns) : existing.triggerPatterns,
    contextRequired: skill.contextRequired ? JSON.stringify(skill.contextRequired) : existing.contextRequired,
    isShared: skill.isShared !== undefined ? (skill.isShared ? true : false) : existing.isShared,
    updatedAt: new Date(),
    version: (existing.version || 1) + 1,
  }).where(eq(skills.id, skill.id));

  return NextResponse.json({ updated: true, skillId: skill.id, version: (existing.version || 1) + 1 });
}

async function searchSkills(query: string, category?: string, agentId?: string) {
  let results;

  if (query) {
    // Full-text-ish search on name + description + trigger patterns
    const nameMatches = await db.select().from(skills).where(like(skills.name, `%${query}%`));
    const descMatches = await db.select().from(skills).where(like(skills.description, `%${query}%`));
    const triggerMatches = await db.select().from(skills).where(like(skills.triggerPatterns, `%${query}%`));

    const all = [...nameMatches, ...descMatches, ...triggerMatches];
    const unique = Array.from(new Map(all.map(s => [s.id, s])).values());
    results = unique;
  } else {
    results = await db.select().from(skills);
  }

  if (category) {
    results = results.filter(s => s.category === category);
  }

  if (agentId) {
    results = results.filter(s => s.agentId === agentId || s.isShared);
  }

  // Sort by success rate (desc)
  results.sort((a, b) => {
    const aRate = (a.successCount || 0) / ((a.successCount || 0) + (a.failureCount || 0) || 1);
    const bRate = (b.successCount || 0) / ((b.successCount || 0) + (b.failureCount || 0) || 1);
    return bRate - aRate;
  });

  return NextResponse.json({
    skills: results.map(s => ({
      ...s,
      triggerPatterns: s.triggerPatterns ? JSON.parse(s.triggerPatterns) : [],
      contextRequired: s.contextRequired ? JSON.parse(s.contextRequired) : [],
      successRate: s.successCount && s.successCount + (s.failureCount || 0) > 0
        ? s.successCount / (s.successCount + (s.failureCount || 0))
        : 0,
    })),
    count: results.length,
  });
}

async function activateSkill(skillId: string, context: any) {
  const skill = await db.select().from(skills).where(eq(skills.id, skillId)).get();
  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  // Validate context requirements
  const required = skill.contextRequired ? JSON.parse(skill.contextRequired) : [];
  const missing = required.filter((r: string) => !context || context[r] === undefined);

  if (missing.length > 0) {
    return NextResponse.json({
      activated: false,
      reason: "Missing context",
      missing,
      skill: { id: skill.id, name: skill.name },
    });
  }

  return NextResponse.json({
    activated: true,
    skill: {
      id: skill.id,
      name: skill.name,
      category: skill.category,
      code: skill.code,
      description: skill.description,
    },
    contextApplied: Object.keys(context || {}),
  });
}

async function forkSkill(skillId: string, newAgentId: string) {
  const original = await db.select().from(skills).where(eq(skills.id, skillId)).get();
  if (!original) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  const forkId = randomUUID();
  await db.insert(skills).values({
    id: forkId,
    agentId: newAgentId,
    name: original.name + " (fork)",
    description: original.description + "\nForked from " + skillId,
    category: original.category,
    code: original.code,
    triggerPatterns: original.triggerPatterns,
    successCount: 0,
    failureCount: 0,
    contextRequired: original.contextRequired,
    isShared: false,
    version: 1,
  });

  return NextResponse.json({ forked: true, forkId, originalId: skillId });
}

async function mergeSkills(sourceId: string, targetId: string) {
  const source = await db.select().from(skills).where(eq(skills.id, sourceId)).get();
  const target = await db.select().from(skills).where(eq(skills.id, targetId)).get();

  if (!source || !target) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  // Merge: keep target's name, combine code, union triggers
  const mergedTriggers = Array.from(new Set([
    ...(JSON.parse(source.triggerPatterns || "[]")),
    ...(JSON.parse(target.triggerPatterns || "[]")),
  ]));

  await db.update(skills).set({
    code: target.code + "\n\n// Merged from " + source.name + "\n" + source.code,
    triggerPatterns: JSON.stringify(mergedTriggers),
    successCount: (target.successCount || 0) + (source.successCount || 0),
    failureCount: (target.failureCount || 0) + (source.failureCount || 0),
    description: target.description + "\nMerged with " + source.name + " (v" + (source.version || 1) + ")",
    updatedAt: new Date(),
    version: (target.version || 1) + 1,
  }).where(eq(skills.id, targetId));

  // Mark source as merged (soft delete by renaming)
  await db.update(skills).set({
    name: source.name + " [merged into " + target.name + "]",
    isShared: false,
  }).where(eq(skills.id, sourceId));

  return NextResponse.json({ merged: true, targetId, skillsCombined: mergedTriggers.length });
}

async function voteSkill(skillId: string, success: boolean) {
  const skill = await db.select().from(skills).where(eq(skills.id, skillId)).get();
  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  if (success) {
    await db.update(skills).set({
      successCount: (skill.successCount || 0) + 1,
      updatedAt: new Date(),
    }).where(eq(skills.id, skillId));
  } else {
    await db.update(skills).set({
      failureCount: (skill.failureCount || 0) + 1,
      updatedAt: new Date(),
    }).where(eq(skills.id, skillId));
  }

  const total = (skill.successCount || 0) + (skill.failureCount || 0) + 1;
  const newRate = success
    ? ((skill.successCount || 0) + 1) / total
    : (skill.successCount || 0) / total;

  return NextResponse.json({
    voted: true,
    skillId,
    newSuccessRate: newRate,
    totalUses: total,
  });
}

// GET: List skills with filters
export async function GET(req: Request) {
  try {
    const authData = await auth();
    const userId = authData.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const agentId = searchParams.get("agentId");
    const shared = searchParams.get("shared");

    let results = await db.select().from(skills);

    if (category) results = results.filter(s => s.category === category);
    if (agentId) results = results.filter(s => s.agentId === agentId);
    if (shared === "true") results = results.filter(s => s.isShared);
    if (shared === "false") results = results.filter(s => !s.isShared);

    // Sort by success rate
    results.sort((a, b) => {
      const aRate = (a.successCount || 0) / ((a.successCount || 0) + (a.failureCount || 0) || 1);
      const bRate = (b.successCount || 0) / ((b.successCount || 0) + (b.failureCount || 0) || 1);
      return bRate - aRate;
    });

    return NextResponse.json({
      skills: results.map(s => ({
        ...s,
        triggerPatterns: s.triggerPatterns ? JSON.parse(s.triggerPatterns) : [],
        successRate: s.successCount && s.successCount + (s.failureCount || 0) > 0
          ? s.successCount / (s.successCount + (s.failureCount || 0))
          : 0,
      })),
      count: results.length,
    });
  } catch (error) {
    console.error("List skills error:", error);
    return NextResponse.json({ error: "Failed to list skills" }, { status: 500 });
  }
}
