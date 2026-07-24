import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Money } from '@/lib/utils/money';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { balance: true, currency: true } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ balance: Money.serialize(user.balance), currency: user.currency });
  } catch (error) {
    console.error('[GET /api/user/balance]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH() {
  return NextResponse.json({ error: 'Direct wallet mutation is disabled; use an authorized admin adjustment' }, { status: 405 });
}
