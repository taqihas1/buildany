/**
 * Agent Tool Sandbox — Safe execution environment for dynamically generated tools
 * Uses Node.js vm module instead of subprocess (Turbopack-compatible)
 */

import { createContext, runInNewContext } from "vm";

interface SandboxResult {
  success: boolean;
  output: any;
  error?: string;
  executionTime: number;
}

/**
 * Execute tool code in a safe VM context
 */
export async function executeTool(
  code: string,
  parameters: Record<string, any>,
  projectContext: Record<string, any> = {},
  timeoutMs: number = 30000
): Promise<SandboxResult> {
  const startTime = Date.now();

  // Create a restricted context
  const sandbox = createSandbox(parameters, projectContext);
  const context = createContext(sandbox);

  // Wrap the code with async execution
  const wrappedCode = `
    (async () => {
      try {
        ${code}
        const result = await tool(__params);
        __result = { success: true, output: result };
      } catch (err) {
        __result = { success: false, error: err.message };
      }
    })();
  `;

  try {
    // Run with timeout using Promise.race
    const vmPromise = new Promise<void>((resolve) => {
      runInNewContext(wrappedCode, context, {
        timeout: timeoutMs,
        displayErrors: true,
      });
      // Give async code time to complete
      setTimeout(resolve, 100);
    });

    await Promise.race([
      vmPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Execution timed out")), timeoutMs)
      ),
    ]);

    const executionTime = Date.now() - startTime;

    if (context.__result) {
      return {
        success: context.__result.success ?? true,
        output: context.__result.output,
        error: context.__result.error,
        executionTime,
      };
    }

    return {
      success: false,
      output: null,
      error: "Tool did not return a result",
      executionTime,
    };
  } catch (err: any) {
    return {
      success: false,
      output: null,
      error: err.message,
      executionTime: Date.now() - startTime,
    };
  }
}

/**
 * Create a sandboxed context with restricted globals
 */
function createSandbox(parameters: Record<string, any>, projectContext: Record<string, any>): Record<string, any> {
  const logs: string[] = [];
  const errors: string[] = [];

  return {
    __params: parameters,
    __context: projectContext,   // Injected project context (tokens, URLs, IDs)
    __result: null,

    // Restricted console
    console: {
      log: (...args: any[]) => logs.push(args.map(String).join(" ")),
      error: (...args: any[]) => errors.push(args.map(String).join(" ")),
      warn: (...args: any[]) => logs.push("[WARN] " + args.map(String).join(" ")),
      info: (...args: any[]) => logs.push(args.map(String).join(" ")),
    },

    // Safe fetch with timeout
    fetch: async (url: string, options: any = {}) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeout);
        return response;
      } catch (err) {
        clearTimeout(timeout);
        throw err;
      }
    },

    // Safe JSON
    JSON,
    Math,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    Promise,
    Set,
    Map,
    URL,
    URLSearchParams,

    // Text encoding
    TextEncoder,
    TextDecoder,

    // Allow setTimeout for internal async
    setTimeout,
    clearTimeout,

    // Get logs
    __logs: logs,
    __errors: errors,
  };
}
