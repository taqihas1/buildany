import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { skills } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  try {
    const authData = await auth();
    const userId = authData.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const agentId = searchParams.get("agentId");

    let allSkills;
    if (category) {
      allSkills = await db.select().from(skills).where(eq(skills.category, category));
    } else if (agentId) {
      allSkills = await db.select().from(skills).where(eq(skills.agentId, agentId));
    } else {
      allSkills = await db.select().from(skills).all();
    }

    return NextResponse.json({
      skills: allSkills.map(s => ({
        ...s,
        triggerPatterns: s.triggerPatterns ? JSON.parse(s.triggerPatterns) : [],
        contextRequired: s.contextRequired ? JSON.parse(s.contextRequired) : [],
      })),
    });
  } catch (error) {
    console.error("List skills error:", error);
    return NextResponse.json({ error: "Failed to list skills" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authData = await auth();
    const userId = authData.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, category, code, triggerPatterns, isShared } = body;

    const skillId = randomUUID();
    await db.insert(skills).values({
      id: skillId,
      name,
      description,
      category: category || "general",
      code: code || "",
      triggerPatterns: JSON.stringify(triggerPatterns || []),
      successCount: 0,
      failureCount: 0,
      contextRequired: JSON.stringify([]),
      isShared: isShared ? true : false,
      version: 1,
    });

    return NextResponse.json({ id: skillId, created: true });
  } catch (error) {
    console.error("Create skill error:", error);
    return NextResponse.json({ error: "Failed to create skill" }, { status: 500 });
  }
}
