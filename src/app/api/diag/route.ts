import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const dbPath = process.env.DB_PATH || "/root/buildany/sqlite.db";
    const info: any = {
      cwd: process.cwd?.() || "N/A",
      dbPath,
      dbExists: fs.existsSync(dbPath),
      dbWritable: false,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
      },
      time: new Date().toISOString(),
    };
    
    // Test if db is writable
    try {
      fs.accessSync(dbPath, fs.constants.W_OK);
      info.dbWritable = true;
    } catch (e: any) {
      info.dbWritable = false;
      info.dbAccessError = e.message;
    }
    
    return NextResponse.json(info);
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    return NextResponse.json({ 
      received: body, 
      cwd: process.cwd?.() || "N/A",
      time: new Date().toISOString() 
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
