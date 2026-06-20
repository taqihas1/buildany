import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import fs from "fs";

export async function GET() {
  try {
    const dbPath = require("path").resolve(process.cwd(), "sqlite.db");
    const info: any = {
      cwd: process.cwd(),
      dbPath,
      dbExists: fs.existsSync(dbPath),
      dbStats: fs.statSync(dbPath),
      time: new Date().toISOString(),
    };
    
    // Try to read from db
    try {
      const all = db.select().from(projects).limit(1).all();
      info.readOk = true;
      info.projectsCount = all.length;
    } catch (e: any) {
      info.readOk = false;
      info.readError = e.message;
    }
    
    // Try to write to db
    try {
      const testId = "test-" + Date.now();
      db.insert(projects).values({
        id: testId,
        userId: "test-user",
        name: "TestProject",
        description: "test",
        type: "web" as const,
        status: "generating",
        createdAt: new Date(),
        updatedAt: new Date(),
      }).run();
      info.writeOk = true;
      info.testId = testId;
    } catch (e: any) {
      info.writeOk = false;
      info.writeError = e.message;
    }
    
    return NextResponse.json(info);
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}
