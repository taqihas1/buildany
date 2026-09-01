/**
 * Simple LLM client wrapper for agent tools
 * Uses the existing LLMRouter
 */

import { llmRouter } from "./llm-router";

export async function callModel(
  prompt: string,
  options: { temperature?: number; maxTokens?: number; systemPrompt?: string } = {}
): Promise<string> {
  const result = await llmRouter.generate({
    prompt,
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens ?? 4000,
    systemPrompt: options.systemPrompt,
  });

  if (!result.success || !result.content) {
    throw new Error(result.error || "LLM call failed");
  }

  return result.content;
}
