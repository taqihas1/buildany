import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projectFiles, projects } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateMobileProject } from '@/lib/mobile-generator';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await db.select().from(projects).where(eq(projects.id, id)).get();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { platform = 'ios' } = await req.json();

    const result = await generateMobileProject({
      projectId: id,
      projectName: project.name,
      description: project.description || '',
      type: project.type || 'mobile',
      platform: platform as 'ios' | 'android' | 'both',
    });

    return NextResponse.json({
      success: true,
      downloadUrl: `/api/project/${id}/download/mobile`,
      buildId: result.buildId,
      platform,
      estimatedTime: '8-12 minutes',
    });
  } catch (error: any) {
    console.error('Mobile generation error:', error);
    return NextResponse.json({
      error: 'Mobile generation failed',
      details: error.message,
    }, { status: 500 });
  }
}
