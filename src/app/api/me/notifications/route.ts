import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth/auth';
import { AuthenticationError } from '@/lib/errors';
import { createHandler } from '@/lib/api-handler';

export const runtime = 'nodejs';

export const GET = createHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) throw new AuthenticationError();

  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get('unreadOnly') === 'true';

  const whereClause = {
    userId: session.userId,
    ...(unreadOnly ? { read: false } : {}),
  };

  const notifications = await prisma.notification.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: session.userId, read: false },
  });

  return NextResponse.json({ notifications, unreadCount });
});

export const PUT = createHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) throw new AuthenticationError();

  const body = await req.json().catch(() => ({}));

  if (body.notificationId) {
    // Đánh dấu 1 notification là đã đọc
    await prisma.notification.updateMany({
      where: {
        id: body.notificationId,
        userId: session.userId,
      },
      data: { read: true },
    });
  } else {
    // Đánh dấu TẤT CẢ là đã đọc
    await prisma.notification.updateMany({
      where: {
        userId: session.userId,
        read: false,
      },
      data: { read: true },
    });
  }

  return NextResponse.json({ success: true });
});
