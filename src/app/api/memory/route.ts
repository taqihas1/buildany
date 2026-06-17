import { NextRequest, NextResponse } from 'next/server';
const MEM = process.env.MEMORY_SERVER_URL || 'http://localhost:3001';

export async function POST(req: NextRequest) {
  try {
    const { action, ...data } = await req.json();
    const paths: Record<string,string> = {
      write: '/tools/memory_write', search: '/tools/memory_search',
      read: '/tools/memory_read', context: '/context', status: '/tools/memory_status'
    };
    const path = paths[action];
    if (!path) return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    const r = await fetch(MEM+path, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
    return NextResponse.json(await r.json());
  } catch(e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function GET() {
  try {
    const r = await fetch(MEM+'/health');
    return NextResponse.json(await r.json());
  } catch(e) { return NextResponse.json({ status: 'down' }, { status: 503 }); }
}
