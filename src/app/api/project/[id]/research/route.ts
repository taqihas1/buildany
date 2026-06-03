import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { conversations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authData = await auth();
    const userId = authData.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Find research report conversation
    const researchMessages = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.projectId, projectId),
          eq(conversations.role, "system"),
        )
      )
      .orderBy(conversations.createdAt);

    const researchMessage = researchMessages.find(
      (msg) => msg.content?.startsWith("RESEARCH REPORT:")
    );

    if (!researchMessage) {
      return NextResponse.json({ hasResearch: false });
    }

    // Parse the research JSON from the content
    const content = researchMessage.content.replace("RESEARCH REPORT:\n", "");
    let research = null;
    try {
      research = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse research JSON:", e);
    }

    return NextResponse.json({
      hasResearch: true,
      research,
      model: researchMessage.model || "deepseek-research",
      createdAt: researchMessage.createdAt,
    });
  } catch (error) {
    console.error("Research fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch research" }, { status: 500 });
  }
}
