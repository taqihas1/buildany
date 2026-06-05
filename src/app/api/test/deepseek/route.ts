import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { llmRouter } from "@/lib/llm-router";

export async function GET(req: NextRequest) {
  try {
    const authData = await auth();
    const userId = authData.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Test DeepSeek connectivity with a simple prompt
    const testPrompt = "Create a simple React component that displays 'Hello from BuildAny'. Return only the code in a markdown code block.";
    
    const result = await llmRouter.generate({
      prompt: testPrompt,
      systemPrompt: "You are a React expert. Generate only code, no explanations.",
      temperature: 0.3,
      maxTokens: 500,
    });

    if (!result.success) {
      return NextResponse.json({
        status: "error",
        provider: result.provider,
        error: result.error,
        message: "DeepSeek API is not responding. Check your API key in admin panel.",
      }, { status: 500 });
    }

    return NextResponse.json({
      status: "success",
      provider: result.provider,
      model: result.model,
      tokensUsed: result.tokensUsed,
      hasContent: !!result.content,
      contentPreview: result.content?.substring(0, 200) + "...",
      message: "DeepSeek API is working! ✅",
    });
  } catch (error: any) {
    console.error("Test error:", error);
    return NextResponse.json({
      status: "error",
      error: error.message,
      message: "Test failed. Check API key configuration.",
    }, { status: 500 });
  }
}
