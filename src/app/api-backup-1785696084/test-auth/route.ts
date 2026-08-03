import { NextResponse } from 'next/server';
// Auth disabled - Clerk issue
// import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const authData = { userId: "anonymous" };
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
