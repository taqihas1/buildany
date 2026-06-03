import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const authData = await auth();
    const userId = authData.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { prompt } = body;

    // Research top apps in the space
    const researchPrompt = `Research the top apps in this space: "${prompt}"

Find and analyze:
1. Top 5 apps in this category (names, URLs)
2. Key features they all have
3. UI/UX patterns they use
4. Common user complaints from reviews
5. What makes each one unique
6. Market gaps / opportunities

Return a structured JSON report.`;

    // Use DeepSeek for research (cheap + fast)
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY || ""}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "You are a market research analyst. Research apps thoroughly and return structured data." },
          { role: "user", content: researchPrompt },
        ],
        temperature: 0.5,
      }),
    });

    const data = await res.json();
    const research = data.choices?.[0]?.message?.content || "{}";

    // Also search web for real data
    const searchResults = await fetch(`https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(prompt + " best apps")}&key=${process.env.GOOGLE_API_KEY}&cx=${process.env.GOOGLE_CX}`);
    const searchData = await searchResults.json();

    return NextResponse.json({
      research,
      searchResults: searchData.items?.slice(0, 5) || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Research error:", error);
    return NextResponse.json({ error: "Research failed" }, { status: 500 });
  }
}