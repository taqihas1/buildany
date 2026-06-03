import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversations } from "@/lib/db/schema";
import { generateCode } from "@/lib/llm-router";
import { randomUUID } from "crypto";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authData = await auth();
    const userId = authData.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { message } = body;

    // Save user message
    await db.insert(conversations).values({
      id: randomUUID(),
      projectId: id,
      role: "user",
      content: message,
    });

    // Get context from previous messages
    const history = await db.select().from(conversations).where(eq(conversations.projectId, id));
    const context = history.map(h => `${h.role}: ${h.content}`).join("\n");

    // Generate response
    const response = await generateCode(id, `${context}\n\nUser: ${message}\n\nModify the app based on this request.`, "web");

    return NextResponse.json({
      response: response.description || "Changes applied successfully",
      model: response.model || "default",
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
