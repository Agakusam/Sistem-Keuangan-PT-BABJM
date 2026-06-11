import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not logged in' }, { status: 401 });
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: session.id,
        telegramId: session.telegramId,
        role: session.role,
        name: session.name || 'User'
      } 
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
