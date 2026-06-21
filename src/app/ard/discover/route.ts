import { NextRequest, NextResponse } from 'next/server';

const HERMES_URL = process.env.HERMES_URL || "http://127.0.0.1:8642/v1/chat/completions";
const HERMES_API_KEY = process.env.HERMES_API_KEY || "";

const KELLY_ARD_PROMPT = `You are Kelly, the AI architect for BuildAny. You have access to the Agentic Resource Discovery (ARD) catalog that describes all services on this VPS.

Your capabilities:
1. Read the ARD catalog to discover available tools and services
2. Read source code files to identify issues
3. Report problems and suggest fixes
4. Help users understand the infrastructure

When asked to review code, you will be given a file path. You should read it and report:
- Merge conflicts (<<<<<<< HEAD, =======, >>>>>>>)
- Syntax errors
- Type issues
- Logic errors
- Missing functionality

Always respond with specific line numbers and clear fix instructions.`;

export async function GET(req: NextRequest) {
  try {
    // Fetch the ARD catalog from our own endpoint
    const catalogRes = await fetch('http://localhost:3000/.well-known/ai-catalog.json');
    const catalog = await catalogRes.json();

    // Ask Kelly to analyze the catalog
    const response = await fetch(HERMES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + HERMES_API_KEY,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: KELLY_ARD_PROMPT },
          { role: "user", content: `I have this ARD catalog for my VPS. Please summarize what services are available and their status:\n\n${JSON.stringify(catalog, null, 2)}` },
        ],
      }),
    });

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({
      success: true,
      catalog,
      kellySummary: summary,
      services: catalog.tools?.length || 0,
      agents: catalog.agents?.length || 0,
    });
  } catch (error) {
    console.error("ARD DISCOVERY ERROR:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filePath } = body;

    // Forward to the review endpoint
    const reviewRes = await fetch('http://localhost:3000/api/ard-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath }),
    });

    const reviewData = await reviewRes.json();
    return NextResponse.json(reviewData);
  } catch (error) {
    console.error("ARD POST ERROR:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
