import { NextRequest, NextResponse } from "next/server";

/**
 * CLOUDFLARE TOOL
 *
 * Operations:
 * - deploy_pages(project_id, account_id) → Deploy to Cloudflare Pages
 * - get_deployment_status(project_name, deployment_id) → Check status
 * - purge_cache(zone_id, urls) → Purge CDN cache
 * - list_dns_records(zone_id) → List DNS records
 * - create_dns_record(zone_id, type, name, content) → Add DNS record
 * - get_analytics(zone_id, since, until) → Get traffic analytics
 */

const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";
const CF_API = "https://api.cloudflare.com/client/v4";

export async function POST(req: NextRequest) {
  try {
    const { action, ...params } = await req.json();

    if (!CF_TOKEN) {
      return NextResponse.json(
        { error: "CLOUDFLARE_API_TOKEN not configured" },
        { status: 500 }
      );
    }

    let result;
    switch (action) {
      case "deploy_pages":
        result = await deployPages(params);
        break;
      case "get_deployment_status":
        result = await getDeploymentStatus(params);
        break;
      case "purge_cache":
        result = await purgeCache(params);
        break;
      case "list_dns_records":
        result = await listDNSRecords(params);
        break;
      case "create_dns_record":
        result = await createDNSRecord(params);
        break;
      case "get_analytics":
        result = await getAnalytics(params);
        break;
      case "list_zones":
        result = await listZones();
        break;
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { error: "Cloudflare tool error", details: e.message },
      { status: 500 }
    );
  }
}

async function deployPages({ project_name, account_id, branch = "main" }: any) {
  // Trigger a new deployment via Cloudflare Pages
  // This uses the direct upload API or Git integration
  
  // For Git-connected projects, we can trigger a deployment
  const res = await fetch(
    `${CF_API}/accounts/${account_id}/pages/projects/${project_name}/deployments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ branch }),
    }
  );

  const data = await res.json();
  if (!data.success) throw new Error(data.errors?.[0]?.message || "Failed to deploy");

  return {
    success: true,
    deployment_id: data.result?.id,
    url: data.result?.url,
    status: data.result?.latest_stage?.name,
  };
}

async function getDeploymentStatus({ project_name, account_id, deployment_id }: any) {
  const res = await fetch(
    `${CF_API}/accounts/${account_id}/pages/projects/${project_name}/deployments/${deployment_id}`,
    {
      headers: { Authorization: `Bearer ${CF_TOKEN}` },
    }
  );

  const data = await res.json();
  if (!data.success) throw new Error(data.errors?.[0]?.message || "Failed to get status");

  return {
    id: data.result?.id,
    url: data.result?.url,
    environment: data.result?.environment,
    stages: data.result?.stages?.map((s: any) => ({
      name: s.name,
      status: s.status,
      started_on: s.started_on,
      ended_on: s.ended_on,
    })),
    is_success: data.result?.latest_stage?.status === "success",
  };
}

async function purgeCache({ zone_id, urls = [] }: any) {
  const body = urls.length > 0 ? { files: urls } : { purge_everything: true };

  const res = await fetch(`${CF_API}/zones/${zone_id}/purge_cache`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CF_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.errors?.[0]?.message || "Failed to purge cache");

  return { success: true, id: data.result?.id };
}

async function listDNSRecords({ zone_id }: any) {
  const res = await fetch(`${CF_API}/zones/${zone_id}/dns_records`, {
    headers: { Authorization: `Bearer ${CF_TOKEN}` },
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.errors?.[0]?.message || "Failed to list DNS");

  return {
    records: data.result?.map((r: any) => ({
      id: r.id,
      type: r.type,
      name: r.name,
      content: r.content,
      proxied: r.proxied,
      ttl: r.ttl,
    })) || [],
  };
}

async function createDNSRecord({ zone_id, type, name, content, proxied = true, ttl = 1 }: any) {
  const res = await fetch(`${CF_API}/zones/${zone_id}/dns_records`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CF_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type, name, content, proxied, ttl }),
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.errors?.[0]?.message || "Failed to create DNS");

  return { success: true, record: data.result };
}

async function getAnalytics({ zone_id, since, until }: any) {
  // Get zone analytics summary
  const res = await fetch(
    `${CF_API}/zones/${zone_id}/analytics/dashboard?since=${since}&until=${until}`,
    {
      headers: { Authorization: `Bearer ${CF_TOKEN}` },
    }
  );

  const data = await res.json();
  if (!data.success) throw new Error(data.errors?.[0]?.message || "Failed to get analytics");

  return {
    totals: data.result?.totals,
    timeseries: data.result?.timeseries,
  };
}

async function listZones() {
  const res = await fetch(`${CF_API}/zones`, {
    headers: { Authorization: `Bearer ${CF_TOKEN}` },
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.errors?.[0]?.message || "Failed to list zones");

  return {
    zones: data.result?.map((z: any) => ({
      id: z.id,
      name: z.name,
      status: z.status,
      plan: z.plan?.name,
    })) || [],
  };
}
