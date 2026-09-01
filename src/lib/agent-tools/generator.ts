/**
 * Agent Tool Generator — Uses LLM to create new tools on demand
 */

import { callModel } from "@/lib/ai-client";
import { registerTool, getTool, listTools, toolExists } from "./registry";
import { executeTool } from "./sandbox";
import type { AgentTool } from "./registry";

interface ToolGenerationRequest {
  need: string;           // What capability is needed
  context?: string;       // Additional context about the task
  existingTools?: string[]; // Names of existing tools to avoid duplicating
}

interface ToolGenerationResult {
  success: boolean;
  tool?: AgentTool;
  error?: string;
  executionResult?: any;
}

/**
 * Check if a needed capability already exists as a tool
 */
export function findExistingTool(need: string): AgentTool | undefined {
  const tools = listTools();
  const needLower = need.toLowerCase();
  
  // Simple keyword matching
  return tools.find((t) => {
    const desc = (t.description + " " + t.name).toLowerCase();
    return desc.includes(needLower) || needLower.includes(t.name.toLowerCase());
  });
}

/**
 * Generate a new tool using LLM
 */
export async function generateTool(request: ToolGenerationRequest): Promise<ToolGenerationResult> {
  const { need, context = "", existingTools = [] } = request;

  // Check if tool already exists
  const existing = findExistingTool(need);
  if (existing) {
    return {
      success: true,
      tool: existing,
      executionResult: { message: `Tool "${existing.name}" already exists for this need.` },
    };
  }

  // Generate tool name
  const toolName = generateToolName(need);
  if (toolExists(toolName)) {
    return {
      success: false,
      error: `Tool "${toolName}" already exists. Try a different need description.`,
    };
  }

  // Build the generation prompt
  const prompt = buildGenerationPrompt(need, context, existingTools);

  try {
    // Call LLM to generate tool code
    const response = await callModel(prompt, { temperature: 0.2 });
    const parsed = parseToolResponse(response, toolName);

    if (!parsed.success) {
      return { success: false, error: parsed.error };
    }

    // Register the tool
    const tool = registerTool({
      name: toolName,
      description: parsed.description,
      parameters: parsed.parameters,
      code: parsed.code,
    });

    // Test the tool with default parameters
    const testResult = await executeTool(parsed.code, parsed.testParameters || {});

    return {
      success: true,
      tool,
      executionResult: testResult,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Failed to generate tool: ${err.message}`,
    };
  }
}

/**
 * Execute an existing tool by name
 */
export async function runTool(name: string, parameters: Record<string, any>): Promise<any> {
  const tool = getTool(name);
  if (!tool) {
    throw new Error(`Tool "${name}" not found`);
  }

  const result = await executeTool(tool.code, parameters);
  return result;
}

/**
 * Generate a snake_case tool name from a description
 */
function generateToolName(need: string): string {
  // Extract key words and convert to snake_case
  const words = need
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !["the", "and", "for", "with", "check", "get", "a", "an"].includes(w))
    .slice(0, 4);

  if (words.length === 0) {
    return `tool_${Date.now()}`;
  }

  return words.join("_");
}

/**
 * Build the LLM prompt for tool generation
 */
function buildGenerationPrompt(need: string, context: string, existingTools: string[]): string {
  return `You are a code generation assistant. Create a JavaScript tool function that solves the following need:

NEED: ${need}
CONTEXT: ${context}
${existingTools.length > 0 ? `EXISTING TOOLS (do not duplicate): ${existingTools.join(", ")}` : ""}

Requirements:
1. Write ONLY a single async function named ".tool" that takes one parameter object
2. The function should be self-contained (no external imports needed — fetch, console, JSON are available)
3. Include JSDoc-style comments explaining parameters
4. Return a clean result object (not raw HTML or unformatted text)
5. Handle errors gracefully with try/catch
6. Keep it under 100 lines

Output format (STRICT JSON):
{
  "description": "One-line description of what this tool does",
  "parameters": {
    "paramName": { "type": "string|number|boolean", "description": "What this param does", "required": true }
  },
  "code": "async function tool(params) { ... }",
  "testParameters": { "example": "value" }
}

Generate the tool now.`;
}

/**
 * Parse LLM response into structured tool data
 */
function parseToolResponse(response: string, toolName: string): {
  success: boolean;
  description?: string;
  parameters?: Record<string, any>;
  code?: string;
  testParameters?: Record<string, any>;
  error?: string;
} {
  // Try to extract JSON from response
  let jsonStr = response;

  // Handle markdown code blocks
  const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);

    if (!parsed.code || !parsed.description) {
      return { success: false, error: "Missing required fields (code, description)" };
    }

    // Validate code has a tool function
    if (!parsed.code.includes("async function tool(")) {
      // Try to wrap it
      parsed.code = `async function tool(params) {\n${parsed.code}\n}`;
    }

    return {
      success: true,
      description: parsed.description,
      parameters: parsed.parameters || {},
      code: parsed.code,
      testParameters: parsed.testParameters || {},
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Failed to parse generated tool: ${err.message}`,
    };
  }
}
