import { listTools, getTool, incrementUseCount } from "@/lib/agent-tools/registry";
import { findExistingTool, generateTool, runTool } from "@/lib/agent-tools/generator";
import { callModel } from "@/lib/ai-client";

interface ToolDetectionResult {
  shouldUseTool: boolean;
  toolName?: string;
  parameters?: Record<string, any>;
  generateNew?: boolean;
  need?: string;
}

export async function detectToolNeed(message: string): Promise<ToolDetectionResult> {
  const tools = listTools();
  
  for (const tool of tools) {
    if (message.toLowerCase().includes(tool.name.replace(/_/g, " "))) {
      return {
        shouldUseTool: true,
        toolName: tool.name,
        parameters: {},
      };
    }
  }

  const prompt = `Analyze this user request and determine if it requires a specialized tool or automation:

User request: "${message}"

Available tools: ${tools.map(t => t.name).join(", ") || "none"}

Respond with ONLY one of:
- "TOOL:tool_name" if an existing tool should be used
- "GENERATE:description" if a new tool should be created
- "CHAT" if this is a normal conversation question

Response:`;

  try {
    const response = await callModel(prompt, { temperature: 0.1, maxTokens: 100 });
    const trimmed = response.trim();

    if (trimmed.startsWith("TOOL:")) {
      const toolName = trimmed.replace("TOOL:", "").trim();
      return { shouldUseTool: true, toolName };
    }

    if (trimmed.startsWith("GENERATE:")) {
      const need = trimmed.replace("GENERATE:", "").trim();
      return { shouldUseTool: false, generateNew: true, need };
    }

    return { shouldUseTool: false };
  } catch {
    const toolKeywords = [
      { pattern: /check.*(build|deploy|status)/i, need: "check deployment status" },
      { pattern: /analyze.*code|review.*code/i, need: "analyze code quality" },
      { pattern: /test.*api|check.*endpoint/i, need: "test API endpoint" },
      { pattern: /optimize|improve.*performance/i, need: "optimize performance" },
      { pattern: /screenshot|preview|image/i, need: "generate screenshot preview" },
    ];

    for (const kw of toolKeywords) {
      if (kw.pattern.test(message)) {
        return { shouldUseTool: false, generateNew: true, need: kw.need };
      }
    }

    return { shouldUseTool: false };
  }
}

export async function extractToolParameters(
  toolName: string,
  message: string
): Promise<Record<string, any>> {
  const tool = getTool(toolName);
  if (!tool) return {};

  const prompt = `Extract parameters from this user request for the tool "${toolName}".

Tool description: ${tool.description}
Tool parameters: ${JSON.stringify(tool.parameters)}

User request: "${message}"

Respond with ONLY a JSON object of parameter values.

Parameters JSON:`;

  try {
    const response = await callModel(prompt, { temperature: 0.1, maxTokens: 500 });
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {}

  return {};
}

export async function executeToolForChat(
  toolName: string,
  parameters: Record<string, any>
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const result = await runTool(toolName, parameters);
    incrementUseCount(toolName);

    if (!result.success) {
      return {
        success: false,
        message: `Tool "${toolName}" failed: ${result.error || "Unknown error"}`,
      };
    }

    let message: string;
    if (typeof result.output === "string") {
      message = result.output;
    } else if (result.output && typeof result.output === "object") {
      message = JSON.stringify(result.output, null, 2);
    } else {
      message = `Tool executed successfully in ${result.executionTime}ms`;
    }

    return { success: true, message, data: result.output };
  } catch (err: any) {
    return { success: false, message: `Error executing "${toolName}": ${err.message}` };
  }
}

export async function generateAndExecuteTool(
  need: string,
  context?: string
): Promise<{ success: boolean; message: string; toolName?: string }> {
  try {
    const existing = findExistingTool(need);
    if (existing) {
      const result = await executeToolForChat(existing.name, {});
      return {
        success: result.success,
        message: `Used existing tool "${existing.name}": ${result.message}`,
        toolName: existing.name,
      };
    }

    const generation = await generateTool({ need, context });

    if (!generation.success || !generation.tool) {
      return { success: false, message: `Failed to create tool: ${generation.error}` };
    }

    const tool = generation.tool;
    const result = await executeToolForChat(tool.name, generation.executionResult?.output || {});

    return {
      success: result.success,
      message: `Created new tool "${tool.name}"!\n\n${result.message}\n\nThis tool is now available for future use.`,
      toolName: tool.name,
    };
  } catch (err: any) {
    return { success: false, message: `Error: ${err.message}` };
  }
}
