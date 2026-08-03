import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return NextResponse.json({ success: true, message: "POST works!", body });
}

export async function GET() {
  return NextResponse.json({ success: true, message: "GET works!" });
}
