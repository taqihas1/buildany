import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import QRCode from 'qrcode';

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

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'mobile';
    
    // Generate QR code URL based on type
    let qrData: string;
    if (type === 'mobile') {
      // For Expo Go: exp:// protocol with project URL
      qrData = `exp://base66.cloud/api/project/${id}/download/mobile`;
    } else {
      // For web preview
      qrData = `https://base66.cloud/project/${id}`;
    }

    const qrImage = await QRCode.toDataURL(qrData, {
      width: 400,
      margin: 2,
      color: {
        dark: '#6366f1',
        light: '#ffffff',
      },
    });

    // Remove data URL prefix and convert to buffer
    const base64Data = qrImage.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error: any) {
    console.error('QR generation error:', error);
    return NextResponse.json({ error: 'QR generation failed', details: error.message }, { status: 500 });
  }
}
