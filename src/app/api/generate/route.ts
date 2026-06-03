import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, conversations } from "@/lib/db/schema";
import { generateCode } from "@/lib/llm-router";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const authData = await auth();
    const userId = authData.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create project
    const projectId = randomUUID();
    const body = await req.json();
    const { prompt, type = "web" } = body;

    await db.insert(projects).values({
      id: projectId,
      userId: userId,
      name: prompt.slice(0, 50),
      description: prompt,
      type,
      status: "generating",
    });

    // Save user prompt
    await db.insert(conversations).values({
      id: randomUUID(),
      projectId,
      role: "user",
      content: prompt,
    });

    // Start generation (async)
    generateCode(projectId, prompt, type).catch(console.error);

    return NextResponse.json({ projectId, status: "generating" });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
