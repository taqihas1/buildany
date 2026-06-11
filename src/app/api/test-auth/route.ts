import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const authData = await auth();
    return NextResponse.json({ 
      userId: authData.userId,
      sessionId: authData.sessionId,
      success: true 
    });
  } catch (error: any) {
    console.error('Auth test error:', error);
    return NextResponse.json({ 
      error: error.message || String(error),
      stack: error.stack 
    }, { status: 500 });
  }
}
