import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emails, projects, conversations } from "@/lib/db/schema";
import { analyzeProjectForDeployment } from "@/lib/deployment-orchestrator";
import { sendEmail } from "@/lib/email-sender";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

// POST /api/webhook/email - Receive emails from Postfix pipe
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { from, to, subject, text, html } = body;

    console.log("📧 Email received:", { from, to, subject });

    // Log inbound email
    const emailId = randomUUID();
    await db.insert(emails).values({
      id: emailId,
      direction: "inbound",
      channel: "email",
      fromAddress: from,
      toAddress: to,
      subject: subject,
      body: text,
      bodyHtml: html,
      status: "received",
      createdAt: new Date(),
    });

    // Validate it's for BuildAny
    if (!to?.includes("buildany") && !to?.includes("create@base66.cloud")) {
      await db.update(emails).set({ status: "failed", errorMessage: "Not a BuildAny address" }).where(eq(emails.id, emailId));
      return NextResponse.json({ error: "Not a BuildAny address" }, { status: 400 });
    }

    // Extract prompt from subject or body
    const prompt = subject || text?.split('\n')[0] || "Build an app";
    
    // Determine project type from email content
    const type = detectProjectType(text || subject);
    
    // Create project
    const projectId = randomUUID();
    const projectName = prompt.slice(0, 50).replace(/[^a-zA-Z0-9 ]/g, '');
    
    await db.insert(projects).values({
      id: projectId,
      userId: "email-user",
      name: projectName,
      description: prompt,
      type,
      status: "created",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Add initial conversation
    await db.insert(conversations).values({
      id: randomUUID(),
      projectId,
      role: "user",
      content: prompt,
      createdAt: new Date(),
    });

    // Get deployment recommendation
    const recommendation = await analyzeProjectForDeployment(projectId);

    // Send response email via Resend
    const projectUrl = `https://base66.cloud/project/${projectId}`;
    
    const replyText = `Hi there!\n\nYour project "${projectName}" is being created by our AI swarm.\n\n🔗 Project link: ${projectUrl}\n\n🤖 We're spawning agents to build your app. You'll receive updates as they progress.\n\n📊 Recommended deployment: ${recommendation.providerDisplay}\n   ${recommendation.reason}\n\n⏱️ Estimated time: 2-3 minutes\n\nYou'll get another email when it's ready!`;

    const replyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">✅ BuildAny: Your Project is Being Created!</h2>
        <p>Your project <strong>"${projectName}"</strong> is being built by our AI swarm.</p>
        <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; font-size: 18px;">🔗 <a href="${projectUrl}" style="color: #2563eb; text-decoration: none;">View Project</a></p>
        </div>
        <h3>🤖 Status: Agents Working</h3>
        <p>We're spawning specialized agents to build your app. You'll receive updates as they progress.</p>
        <h3>📊 Recommended Deployment</h3>
        <div style="background: #f0fdf4; padding: 12px; border-radius: 8px; border-left: 4px solid #22c55e;">
          <strong>${recommendation.providerDisplay}</strong><br>
          ${recommendation.reason}
        </div>
        <p><strong>⏱️ ETA:</strong> 2-3 minutes</p>
        <p style="color: #666; margin-top: 24px;">You'll get another email when your app is ready to preview!</p>
      </div>
    `;

    // Send via Resend
    const emailResult = await sendEmail({
      to: from,
      subject: `✅ BuildAny: "${projectName}" is being created!`,
      text: replyText,
      html: replyHtml,
    });

    // Log outbound email
    await db.insert(emails).values({
      id: randomUUID(),
      direction: "outbound",
      channel: "email",
      fromAddress: "create@base66.cloud",
      toAddress: from,
      subject: `✅ BuildAny: "${projectName}" is being created!`,
      body: replyText,
      bodyHtml: replyHtml,
      status: emailResult.success ? "sent" : "failed",
      projectId,
      errorMessage: emailResult.error || null,
      provider: emailResult.provider,
      providerMessageId: emailResult.messageId || null,
      sentAt: emailResult.success ? new Date() : null,
      createdAt: new Date(),
    });

    // Update inbound email with project link
    await db.update(emails).set({
      status: "delivered",
      projectId,
    }).where(eq(emails.id, emailId));

    return NextResponse.json({
      success: true,
      projectId,
      message: "Project created from email",
      projectUrl,
      emailSent: emailResult.success,
    });
  } catch (error) {
    console.error("Email webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

function detectProjectType(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('mobile') || t.includes('app') || t.includes('ios') || t.includes('android') || t.includes('react native')) {
    return 'mobile';
  }
  if (t.includes('web') || t.includes('website') || t.includes('site') || t.includes('landing')) {
    return 'web';
  }
  return 'web';
}

