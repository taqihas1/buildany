import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, conversations, projectFiles } from "@/lib/db/schema";
import { generateCode } from "@/lib/llm-router";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

// Auto-Research + Decomposition Pipeline
export async function POST(req: Request) {
  try {
    const authData = await auth();
    const userId = authData.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { prompt, type = "web", skipResearch = false } = body;

    // Create project immediately
    const projectId = randomUUID();
    await db.insert(projects).values({
      id: projectId,
      userId: userId,
      name: prompt.slice(0, 50),
      description: prompt,
      type,
      status: "researching", // New status
    });

    // Save user prompt
    await db.insert(conversations).values({
      id: randomUUID(),
      projectId,
      role: "user",
      content: prompt,
    });

    let researchData = null;
    let enrichedPrompt = prompt;

    // Step 1: Auto-Research (unless skipped)
    if (!skipResearch) {
      try {
        researchData = await runAutoResearch(prompt, type);
        
        // Save research as conversation context
        await db.insert(conversations).values({
          id: randomUUID(),
          projectId,
          role: "system",
          content: `RESEARCH REPORT:\n${JSON.stringify(researchData, null, 2)}`,
          model: "deepseek-research",
        });

        // Enrich prompt with research findings
        enrichedPrompt = buildEnrichedPrompt(prompt, researchData, type);
        
        // Update project with research insights
        await db.update(projects)
          .set({ 
            status: "decomposing",
            description: enrichedPrompt,
          })
          .where(eq(projects.id, projectId));
      } catch (err) {
        console.error("Research failed, continuing with raw prompt:", err);
        researchData = { error: "Research failed", raw: err };
      }
    }

    // Step 2: Generate initial code with enriched context
    const response = await generateCode(projectId, enrichedPrompt, type);

    // Step 3: Save generated files
    if (response.files && response.files.length > 0) {
      for (const file of response.files) {
        await db.insert(projectFiles).values({
          id: randomUUID(),
          projectId,
          path: file.path,
          content: file.content,
          language: file.language || "typescript",
          isGenerated: true,
        });
      }
    }

    // Step 4: Decompose into tasks (if not skipped)
    let taskPlan = null;
    try {
      const decomposeRes = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/decompose`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, prompt: enrichedPrompt, type }),
        }
      );
      if (decomposeRes.ok) {
        taskPlan = await decomposeRes.json();
      }
    } catch (err) {
      console.error("Decomposition failed:", err);
    }

    // Update project status
    await db.update(projects)
      .set({ 
        status: "ready",
        name: response.projectName || prompt.slice(0, 50),
      })
      .where(eq(projects.id, projectId));

    return NextResponse.json({
      projectId,
      projectName: response.projectName || prompt.slice(0, 50),
      filesGenerated: response.files?.length || 0,
      research: researchData ? {
        competitorCount: researchData.competitors?.length || 0,
        keyFeatures: researchData.keyFeatures?.slice(0, 5) || [],
        uxPatterns: researchData.uxPatterns?.slice(0, 3) || [],
        gaps: researchData.gaps?.slice(0, 3) || [],
      } : null,
      tasksCreated: taskPlan?.tasksCreated || 0,
      message: researchData 
        ? "Research complete. App generated with market-informed architecture."
        : "App generated.",
    });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json({ error: "Failed to generate app" }, { status: 500 });
  }
}

// Run auto-research using DeepSeek + web search
async function runAutoResearch(prompt: string, type: string) {
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  
  // Use DeepSeek for structured research
  const researchPrompt = `You are a market research analyst. Research the app category: "${prompt}"

Return a JSON object with this exact structure:
{
  "category": "app category name",
  "competitors": [
    { "name": "App Name", "url": "https://...", "keyFeatures": ["feature1", "feature2"], "rating": 4.5, "pricing": "free/freemium/paid" }
  ],
  "keyFeatures": ["feature that all top apps have", "another essential feature"],
  "uxPatterns": ["common UI pattern", "navigation pattern"],
  "userComplaints": ["common negative review theme", "pain point"],
  "gaps": ["missing feature users want", "market opportunity"],
  "targetAudience": "description of primary users",
  "monetization": "how apps in this space make money",
  "techStack": "common technologies used",
  "designTrends": ["current visual trend", "interaction pattern"]
}

Focus on ${type === "mobile" ? "mobile app" : "web app"} competitors. Be specific and actionable.`;

  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${deepseekKey || ""}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "You are a market research analyst. Always return valid JSON." },
        { role: "user", content: researchPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
  });

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error("No research content returned");
  }

  return JSON.parse(content);
}

// Build enriched prompt from research findings
function buildEnrichedPrompt(originalPrompt: string, research: any, type: string) {
  const parts = [originalPrompt];

  if (research.competitors?.length > 0) {
    parts.push(`\n\n## Top Competitors to Beat`);
    research.competitors.slice(0, 3).forEach((c: any) => {
      parts.push(`- ${c.name}: ${c.keyFeatures?.join(", ") || "N/A"}`);
    });
  }

  if (research.keyFeatures?.length > 0) {
    parts.push(`\n## Must-Have Features`);
    research.keyFeatures.forEach((f: string) => parts.push(`- ${f}`));
  }

  if (research.uxPatterns?.length > 0) {
    parts.push(`\n## UX Patterns to Use`);
    research.uxPatterns.forEach((p: string) => parts.push(`- ${p}`));
  }

  if (research.gaps?.length > 0) {
    parts.push(`\n## Market Gaps (Differentiators)`);
    research.gaps.forEach((g: string) => parts.push(`- ${g}`));
  }

  if (research.userComplaints?.length > 0) {
    parts.push(`\n## Avoid These Pain Points`);
    research.userComplaints.forEach((c: string) => parts.push(`- ${c}`));
  }

  parts.push(`\n\n## Build Requirements`);
  parts.push(`- App type: ${type}`);
  parts.push(`- Target: ${research.targetAudience || "general users"}`);
  parts.push(`- Style: Modern, clean, competitive with top apps`);
  parts.push(`- Performance: Fast, responsive, professional`);

  return parts.join("\n");
}
