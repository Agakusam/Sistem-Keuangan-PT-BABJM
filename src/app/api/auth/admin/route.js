import { NextResponse } from 'next/server';
import { signToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    const expectedPassword = process.env.ADMIN_PASSWORD || 'adminBABJM123!';

    if (username === 'admin' && password === expectedPassword) {
      // Upsert system admin in the database
      const user = await prisma.user.upsert({
        where: { telegramId: 'admin' },
        update: {},
        create: {
          telegramId: 'admin',
          username: 'admin',
          firstName: 'System Administrator',
          role: 'ADMIN'
        }
      });

      // Create session token for admin
      const token = await signToken({
        id: user.id,
        telegramId: user.telegramId,
        role: user.role,
        name: user.firstName || user.username
      });

      cookies().set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      });

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: 'Username atau password admin salah' }, { status: 401 });
    }
  } catch (error) {
    console.error('Admin Auth Error:', error);
    return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 500 });
  }
}
