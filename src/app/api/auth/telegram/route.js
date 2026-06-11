import { NextResponse } from 'next/server';
import { verifyTelegramWebAppData, signToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const data = await request.json();
    
    // Get bot token from config in DB, or env fallback
    let botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      const configToken = await prisma.config.findUnique({ where: { key: 'TELEGRAM_BOT_TOKEN' } });
      if (configToken) botToken = configToken.value;
    }

    if (!botToken) {
      return NextResponse.json({ success: false, error: 'Telegram Bot Token not configured' }, { status: 500 });
    }

    // Verify data integrity
    const isValid = verifyTelegramWebAppData(data, botToken);
    
    // Check auth_date to prevent old session reuse (e.g. > 24 hours)
    const authDate = parseInt(data.auth_date, 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) {
      return NextResponse.json({ success: false, error: 'Login expired' }, { status: 401 });
    }

    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid Telegram data' }, { status: 401 });
    }

    // Check or Create User
    const telegramId = String(data.id);
    let user = await prisma.user.findUnique({
      where: { telegramId }
    });

    if (!user) {
      // Check if this is the first user
      const count = await prisma.user.count();
      const role = count === 0 ? 'ADMIN' : 'STAFF';

      user = await prisma.user.create({
        data: {
          telegramId,
          username: data.username || null,
          firstName: data.first_name || null,
          photoUrl: data.photo_url || null,
          role
        }
      });
    }

    // Set Session
    const token = await signToken({
      id: user.id,
      telegramId: user.telegramId,
      role: user.role,
      name: user.firstName || user.username
    });

    const cookieStore = await cookies();
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return NextResponse.json({ success: true, user });

  } catch (error) {
    console.error('Telegram Auth Error:', error);
    return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 500 });
  }
}
