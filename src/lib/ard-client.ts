
/**
 * ARD Client - Kelly's internal tool for Agentic Resource Discovery
 * 
 * These endpoints are called internally (localhost) so they bypass
 * any Hostinger edge proxy/CDN issues.
 */

const BASE_URL = "http://localhost:3000";

export interface ARDCatalog {
  schema_version: string;
  name: string;
  description: string;
  domain: string;
  tools: ARDTool[];
  agents: ARDAgent[];
  infrastructure: ARDInfrastructure;
}

export interface ARDTool {
  name: string;
  type: string;
  endpoint: string;
  description: string;
  status: string;
  managed_by?: string;
}

export interface ARDAgent {
  name: string;
  type: string;
  description: string;
  gateway: string;
  model: string;
  system_prompt?: string;
}

export interface ARDInfrastructure {
  host: string;
  ip: string;
  provider: string;
  ssl: string;
  domain: string;
}

export interface CodeReviewResult {
  success: boolean;
  filePath: string;
  review: string;
  issues: CodeIssue[];
}

export interface CodeIssue {
  severity: string;
  issue: string;
  fix: string;
}

/**
 * Discover all services available on the VPS
 */
export async function discoverServices(): Promise<ARDTool[]> {
  try {
    const res = await fetch(`${BASE_URL}/ard/discover`);
    const data = await res.json();
    return data.catalog?.tools || [];
  } catch (err) {
    console.error("[ARD] discoverServices failed:", err);
    return [];
  }
}

/**
 * Get the full ARD catalog
 */
export async function getCatalog(): Promise<ARDCatalog | null> {
  try {
    const res = await fetch(`${BASE_URL}/.well-known/ai-catalog.json`);
    return await res.json();
  } catch (err) {
    console.error("[ARD] getCatalog failed:", err);
    return null;
  }
}

/**
 * Review a source file for issues
 */
export async function reviewFile(filePath: string): Promise<CodeReviewResult | null> {
  try {
    const res = await fetch(`${BASE_URL}/ard/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filePath }),
    });
    return await res.json();
  } catch (err) {
    console.error("[ARD] reviewFile failed:", err);
    return null;
  }
}

/**
 * Check if a specific service is available
 */
export async function isServiceAvailable(serviceName: string): Promise<boolean> {
  const services = await discoverServices();
  return services.some(s => s.name === serviceName && s.status === "active");
}

/**
 * Get Kelly's own configuration from ARD
 */
export async function getKellyConfig(): Promise<ARDAgent | null> {
  try {
    const catalog = await getCatalog();
    return catalog?.agents?.find(a => a.name === "Kelly") || null;
  } catch (err) {
    console.error("[ARD] getKellyConfig failed:", err);
    return null;
  }
}
