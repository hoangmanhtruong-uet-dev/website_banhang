import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { email: true, phone: true } });
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const recipients = [user.email, user.phone].filter((value): value is string => Boolean(value));
    const notifications = await prisma.notificationDelivery.findMany({
      where: { recipient: { in: recipients } },
      select: { id: true, template: true, status: true, channel: true, sentAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json(notifications);
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
