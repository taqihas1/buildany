import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projectFiles, projects } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import JSZip from 'jszip';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await db.select().from(projects).where(eq(projects.id, id)).get();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const files = await db.select().from(projectFiles).where(eq(projectFiles.projectId, id)).all();

    const zip = new JSZip();
    const mobileFiles = files.filter(f => 
      f.path.startsWith('src/') || 
      f.path.endsWith('.json') || 
      f.path.endsWith('.tsx') || 
      f.path.endsWith('.ts')
    );

    if (mobileFiles.length === 0) {
      return NextResponse.json({ error: 'No mobile files found. Generate mobile project first.' }, { status: 404 });
    }

    mobileFiles.forEach(file => {
      zip.file(file.path, file.content || '');
    });

    const zipContent = await zip.generateAsync({ type: 'uint8array' });

    return new NextResponse(Buffer.from(zipContent), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${project.name}-mobile.zip"`,
      },
    });
  } catch (error: any) {
    console.error('Mobile download error:', error);
    return NextResponse.json({ error: 'Download failed', details: error.message }, { status: 500 });
  }
}
