import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authData = await auth();
    const userId = authData.userId;
    
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    
    const projectTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId));
    
    return Response.json({ 
      success: true, 
      tasks: projectTasks || [] 
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return Response.json({ 
      success: false, 
      error: String(error),
      tasks: [] 
    }, { status: 500 });
  }
}
