import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { z } from "zod";

/**
 * Fetches the text content of a URL for recipe extraction.
 * Handles Instagram, TikTok, and generic recipe websites.
 */
async function fetchPageText(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // Strip HTML tags and collapse whitespace for cleaner LLM input
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000); // Limit to 8k chars to fit LLM context

    return text;
  } catch (err: any) {
    throw new Error(`Could not fetch URL: ${err.message}`);
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  recipe: router({
    /**
     * Import a recipe from any URL (Instagram, TikTok, food blogs, etc.)
     * Uses the built-in LLM to extract structured recipe data from page content.
     */
    importFromUrl: publicProcedure
      .input(z.object({ url: z.string().url() }))
      .mutation(async ({ input }) => {
        // Fetch the page content
        const pageText = await fetchPageText(input.url);

        const isInstagram = input.url.includes("instagram.com");
        const isTikTok = input.url.includes("tiktok.com");
        const isFacebook = input.url.includes("facebook.com") || input.url.includes("fb.com");
        const isYouTube = input.url.includes("youtube.com") || input.url.includes("youtu.be");
        const isPinterest = input.url.includes("pinterest.com") || input.url.includes("pin.it");
        const isSocial = isInstagram || isTikTok || isFacebook || isYouTube || isPinterest;

        let platformHint = "";
        if (isInstagram) platformHint = "This is an Instagram post — extract the recipe from the caption text.";
        else if (isTikTok) platformHint = "This is a TikTok video page — extract the recipe from the video description or caption.";
        else if (isFacebook) platformHint = "This is a Facebook post — extract the recipe from the post body or comments.";
        else if (isYouTube) platformHint = "This is a YouTube video page — extract the recipe from the video description. Recipes are often listed with ingredients and steps in the description below the video.";
        else if (isPinterest) platformHint = "This is a Pinterest pin — extract the recipe from the pin description or linked recipe content.";

        const systemPrompt = `You are a recipe extraction assistant. 
Extract recipe information from the provided web page content and return it as JSON.
If no recipe is found, return {"error": "No recipe found on this page"}.
${platformHint}
Be thorough: extract every ingredient with amounts and units, and every cooking step.
For YouTube, the recipe is usually in the video description — look for ingredient lists and numbered steps.`;

        const userPrompt = `Extract the recipe from this page content:\n\n${pageText}\n\nReturn JSON with this exact structure:
{
  "title": "Recipe name",
  "description": "Brief description",
  "servings": 4,
  "prepTimeMinutes": 15,
  "cookTimeMinutes": 30,
  "difficulty": "Easy|Medium|Hard",
  "mealType": ["breakfast"|"lunch"|"dinner"|"snack"|"dessert"],
  "dietTags": ["vegan"|"vegetarian"|"keto"|"gluten-free"|"dairy-free"|"high-protein"],
  "tasteTags": ["spicy"|"not-spicy"|"sweet"|"savory"],
  "ingredients": [
    { "name": "ingredient name", "amount": 1.5, "unit": "cups", "notes": "optional note" }
  ],
  "steps": [
    { "stepNumber": 1, "instruction": "Step description", "timerMinutes": 0 }
  ],
  "nutrition": {
    "calories": 350,
    "protein": 25,
    "carbs": 40,
    "fat": 12,
    "fiber": 5
  },
  "tips": ["Optional tip 1", "Optional tip 2"],
  "sourceUrl": "${input.url}"
}`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        });

        const content = response.choices[0]?.message?.content as string | undefined;
        if (!content) {
          throw new Error("No response from AI");
        }

        const parsed = JSON.parse(content);

        if (parsed.error) {
          throw new Error(parsed.error);
        }

        // Validate required fields
        if (!parsed.title || !parsed.ingredients || !parsed.steps) {
          throw new Error("Could not extract a complete recipe from this page");
        }

        return parsed as {
          title: string;
          description: string;
          servings: number;
          prepTimeMinutes: number;
          cookTimeMinutes: number;
          difficulty: string;
          mealType: string[];
          dietTags: string[];
          tasteTags: string[];
          ingredients: Array<{ name: string; amount: number; unit: string; notes?: string }>;
          steps: Array<{ stepNumber: number; instruction: string; timerMinutes: number }>;
          nutrition: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
          tips: string[];
          sourceUrl: string;
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
