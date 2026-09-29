import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { env } from '@/config/env';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (
    env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const now = new Date();
    
    // Deactivate expired flash sales
    const result = await prisma.flashSaleEvent.updateMany({
      where: {
        isActive: true,
        endTime: { lte: now }
      },
      data: {
        isActive: false
      }
    });

    return NextResponse.json({ success: true, deactivated: result.count });
  } catch (error) {
    console.error('Flash sale cron error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
