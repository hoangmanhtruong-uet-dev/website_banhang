import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let config = await prisma.siteConfig.findUnique({ where: { id: 'default' } });
    if (!config) {
      config = await prisma.siteConfig.create({ data: { id: 'default' } });
    }

    return NextResponse.json({
      siteName: config.siteName,
      hotline: config.hotline,
      contactEmail: config.contactEmail,
      address: config.address,
      codEnabled: config.codEnabled,
      momoEnabled: config.momoEnabled,
      bankingEnabled: config.bankingEnabled,
      vnpayEnabled: config.vnpayEnabled,
      maintenanceMode: config.maintenanceMode,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[SITE_CONFIG]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
