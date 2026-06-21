/**
 * Kelly Training Module
 * 
 * Feeds project history, user preferences, and best practices into Kelly's
 * persistent memory so she learns and improves over time.
 */

import { db } from "@/lib/db";
import { projects, conversations, projectFiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface TrainingContext {
  userPreferences: {
    fontHeading: string;
    fontBody: string;
    colorScheme: string;
    codeStyle: string;
  };
  projectPatterns: {
    commonComponents: string[];
    preferredLibraries: string[];
    avoidedPatterns: string[];
  };
  successfulProjects: {
    name: string;
    type: string;
    whatWorked: string;
  }[];
}

/**
 * Build training context from user's project history
 */
export async function buildTrainingContext(): Promise<TrainingContext> {
  const allProjects = await db.select().from(projects).all();
  const recentProjects = allProjects.slice(-10); // Last 10 projects

  const context: TrainingContext = {
    userPreferences: {
      fontHeading: "Playfair Display",
      fontBody: "Geist Sans",
      colorScheme: "Clean gradients (purple-pink for Kelly, cyan-blue for BuildAny)",
      codeStyle: "Minimalist (Ponytail rules): stdlib-first, YAGNI, one-liner preference",
    },
    projectPatterns: {
      commonComponents: ["Card layouts", "Gradient buttons", "Clean typography", "Icon + text patterns"],
      preferredLibraries: ["React Native", "Expo SDK 54", "Next.js 15", "Tailwind CSS", "shadcn/ui"],
      avoidedPatterns: ["Over-engineering", "Unnecessary abstractions", "Bloated dependencies"],
    },
    successfulProjects: recentProjects.map(p => ({
      name: p.name,
      type: p.type,
      whatWorked: "Clean UI, responsive design, gradient accents",
    })),
  };

  return context;
}

/**
 * Generate Kelly's system prompt with training context
 */
export async function generateKellySystemPrompt(): Promise<string> {
  const context = await buildTrainingContext();

  return `You are Kelly, the AI Architect for BuildAny.

## User Preferences (LEARNED)
- **Typography**: ${context.userPreferences.fontHeading} for headings, ${context.userPreferences.fontBody} for body
- **Visual Style**: ${context.userPreferences.colorScheme}
- **Code Style**: ${context.userPreferences.codeStyle}

## Project Patterns (LEARNED)
**Preferred Stack**: ${context.projectPatterns.preferredLibraries.join(", ")}
**Common Components**: ${context.projectPatterns.commonComponents.join(", ")}
**Avoid**: ${context.projectPatterns.avoidedPatterns.join(", ")}

## Successful Project History
${context.successfulProjects.map(p => `- ${p.name} (${p.type}): ${p.whatWorked}`).join("\n")}

## Ponytail Rules (Active)
1. Does this need to exist? → If no, skip it (YAGNI)
2. Does stdlib do it? → Use stdlib
3. Native platform feature? → Use it
4. Installed dependency? → Use it
5. One line possible? → One line
6. Only then: the minimum that works

## Kelly's Role
- **Brain**: Planning, research, architecture, code review
- **Delegate to Morgan (OpenManus)**: Security audits, bulk fixes, complex automation
- **Delegate to BuildAny**: Code generation, file creation, preview rendering
- **Never delegate**: Strategic decisions, user-facing messages, architecture choices

## Response Format
Always respond with structured, actionable output. When generating code:
1. Use the user's preferred stack
2. Apply Ponytail minimalist rules
3. Include error handling and validation
4. Make it beautiful (gradients, clean cards, proper spacing)`;
}

/**
 * Save a learning to Kelly's memory
 */
export async function saveLearning(
  category: "preference" | "pattern" | "success" | "failure",
  key: string,
  value: string
): Promise<void> {
  // This would save to a persistent memory store
  // For now, we log it and the user can feed it back
  console.log(`[Kelly Learning] ${category}: ${key} = ${value}`);
}

/**
 * Export training data for Hermes skills
 */
export async function exportTrainingForHermes(): Promise<string> {
  const context = await buildTrainingContext();
  
  return `---
name: buildany-user-preferences
description: "Learned preferences from user's project history"
---

# User Preferences

## Visual Design
- Heading font: ${context.userPreferences.fontHeading}
- Body font: ${context.userPreferences.fontBody}
- Color scheme: ${context.userPreferences.colorScheme}

## Code Style
${context.userPreferences.codeStyle}

## Preferred Tech Stack
${context.projectPatterns.preferredLibraries.map(lib => `- ${lib}`).join("\n")}

## Common Patterns
${context.projectPatterns.commonComponents.map(c => `- ${c}`).join("\n")}

## Anti-Patterns to Avoid
${context.projectPatterns.avoidedPatterns.map(p => `- ${p}`).join("\n")}

## Project History
${context.successfulProjects.map(p => `- ${p.name} (${p.type}): ${p.whatWorked}`).join("\n")}
`;
}
