import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { emails } from "@/lib/db/schema";
import { desc, eq, and, sql } from "drizzle-orm";

// GET /api/admin/emails - Get all emails (admin only)
export async function GET(req: NextRequest) {
  try {
    const authData = await auth();
    const userId = authData.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const direction = searchParams.get("direction");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let conditions = [];

    if (direction) {
      conditions.push(eq(emails.direction, direction as "inbound" | "outbound"));
    }

    if (status) {
      conditions.push(eq(emails.status, status as string));
    }

    const allEmails = conditions.length > 0
      ? await db.select().from(emails).where(and(...conditions)).orderBy(desc(emails.createdAt)).limit(limit).offset(offset)
      : await db.select().from(emails).orderBy(desc(emails.createdAt)).limit(limit).offset(offset);

    // Get stats
    const stats = await db
      .select({
        total: sql<number>`count(*)`,
        inbound: sql<number>`sum(case when direction = 'inbound' then 1 else 0 end)`,
        outbound: sql<number>`sum(case when direction = 'outbound' then 1 else 0 end)`,
        sent: sql<number>`sum(case when status = 'sent' then 1 else 0 end)`,
        failed: sql<number>`sum(case when status = 'failed' then 1 else 0 end)`,
        delivered: sql<number>`sum(case when status = 'delivered' then 1 else 0 end)`,
      })
      .from(emails);

    return NextResponse.json({
      success: true,
      emails: allEmails,
      stats: stats[0] || {
        total: 0,
        inbound: 0,
        outbound: 0,
        sent: 0,
        failed: 0,
        delivered: 0,
      },
    });
  } catch (error) {
    console.error("Admin emails error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
