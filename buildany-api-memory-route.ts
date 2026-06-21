import { NextRequest, NextResponse } from 'next/server';

const MEMORY_SERVER_URL = process.env.MEMORY_SERVER_URL || 'http://localhost:3001';

async function proxyToMemoryServer(path: string, body: any) {
  try {
    const response = await fetch(`${MEMORY_SERVER_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// POST /api/memory/write
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...data } = body;

    switch (action) {
      case 'write':
        return NextResponse.json(await proxyToMemoryServer('/tools/memory_write', data));
      case 'search':
        return NextResponse.json(await proxyToMemoryServer('/tools/memory_search', data));
      case 'read':
        return NextResponse.json(await proxyToMemoryServer('/tools/memory_read', data));
      case 'update_priority':
        return NextResponse.json(await proxyToMemoryServer('/tools/memory_update_priority', data));
      case 'delete':
        return NextResponse.json(await proxyToMemoryServer('/tools/memory_delete', data));
      case 'status':
        return NextResponse.json(await proxyToMemoryServer('/tools/memory_status', {}));
      case 'consolidate':
        return NextResponse.json(await proxyToMemoryServer('/tools/memory_consolidate', {}));
      case 'context':
        return NextResponse.json(await proxyToMemoryServer('/context', data));
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// GET /api/memory/health
export async function GET() {
  try {
    const response = await fetch(`${MEMORY_SERVER_URL}/health`);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { status: 'down', error: String(error) },
      { status: 503 }
    );
  }
}
