import { NextResponse } from "next/server";

export async function POST(req: Request) {
  return NextResponse.json({ 
    success: true, 
    message: "No DB test works!",
    timestamp: new Date().toISOString()
  });
}

export async function GET() {
  return NextResponse.json({ 
    success: true, 
    message: "No DB GET works!",
    timestamp: new Date().toISOString()
  });
}
