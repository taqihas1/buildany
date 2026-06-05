import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { llmRouter, getSystemPromptForType } from "@/lib/llm-router";

export async function POST(req: NextRequest) {
  try {
    const authData = await auth();
    const userId = authData.userId;
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { projectId, prompt, type = "web", provider } = body;

    if (!projectId || !prompt) {
      return new Response("Missing projectId or prompt", { status: 400 });
    }

    const systemPrompt = getSystemPromptForType(type);

    const stream = await llmRouter.stream({
      prompt,
      systemPrompt,
      provider,
      temperature: 0.7,
      maxTokens: 4000,
      stream: true,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (chunk.error) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: chunk.error })}\n\n`)
            );
            controller.close();
            return;
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: chunk.content, done: chunk.done })}\n\n`)
          );

          if (chunk.done) {
            controller.close();
          }
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Stream error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
