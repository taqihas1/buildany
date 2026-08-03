import { NextRequest, NextResponse } from "next/server";

const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || "";

async function cfApi(path: string, opts: RequestInit = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!data.success) throw new Error(JSON.stringify(data.errors || data.messages || ["CF API error"]));
  return data.result;
}

export async function POST(req: NextRequest) {
  try {
    const { action, ...args } = await req.json();
    let result: any;

    switch (action) {
      case "deploy_pages": {
        result = await cfApi(`/accounts/${CF_ACCOUNT_ID}/pages/projects/${args.projectName}/deployments`, {
          method: "POST",
          body: JSON.stringify({ branch: args.branch || "main" }),
        });
        break;
      }
      case "get_deployment_status": {
        result = await cfApi(`/accounts/${CF_ACCOUNT_ID}/pages/projects/${args.projectName}/deployments/${args.deploymentId}`);
        break;
      }
      case "purge_cache": {
        result = await cfApi(`/zones/${args.zoneId}/purge_cache`, { method: "POST", body: JSON.stringify({ purge_everything: true }) });
        break;
      }
      case "list_dns_records": {
        result = await cfApi(`/zones/${args.zoneId}/dns_records`);
        break;
      }
      case "create_dns_record": {
        result = await cfApi(`/zones/${args.zoneId}/dns_records`, {
          method: "POST",
          body: JSON.stringify({ type: args.type, name: args.name, content: args.content, ttl: args.ttl || 1 }),
        });
        break;
      }
      case "get_analytics": {
        result = await cfApi(`/zones/${args.zoneId}/analytics/dashboard`);
        break;
      }
      case "list_zones": {
        result = await cfApi("/zones");
        break;
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", connector: "cloudflare", actions: ["deploy_pages", "get_deployment_status", "purge_cache", "list_dns_records", "create_dns_record", "get_analytics", "list_zones"] });
}
