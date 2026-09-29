import { NextResponse } from 'next/server';
import { OutboxDispatcher } from '@/lib/services/outbox/outbox-dispatcher';
import { env } from '@/config/env';
import os from 'os';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  // Simple cron security check
  const authHeader = request.headers.get('authorization');
  if (
    env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const dispatcher = new OutboxDispatcher(undefined, undefined, {
      workerId: `vercel-cron-${os.hostname()}`,
    });
    const result = await dispatcher.dispatchOnce();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Outbox cron error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
