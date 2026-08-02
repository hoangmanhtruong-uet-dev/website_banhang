import { Prisma } from '@prisma/client';
import { type NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { canAccessSeller, getSession } from '@/lib/auth';
import { createHandler } from '@/lib/api-handler';
import { AuthorizationError, ValidationError } from '@/lib/errors';
import { Money } from '@/lib/utils/money';

const REVENUE_STATUSES = ['cancelled', 'returned', 'refunded'];
const VALID_PERIODS = new Set([7, 30, 90]);

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  return createHandler(async request => {
    const session = await getSession();
    if (!canAccessSeller(session)) throw new AuthorizationError('Seller access required');
    if (!session.isSeller) throw new AuthorizationError('Tài khoản admin cần bật quyền Seller để xem doanh thu shop');

    const rawDays = Number(new URL(request.url).searchParams.get('days') ?? '30');
    if (!VALID_PERIODS.has(rawDays)) throw new ValidationError('Khoảng thời gian chỉ nhận 7, 30 hoặc 90 ngày');

    const now = new Date();
    const periodStart = startOfDay(new Date(now.getTime() - (rawDays - 1) * 86_400_000));
    const previousStart = startOfDay(new Date(periodStart.getTime() - rawDays * 86_400_000));

    const [fulfillments, productStats] = await Promise.all([
      prisma.sellerFulfillment.findMany({
        where: { sellerId: session.userId },
        select: {
          id: true, status: true, total: true, deliveredAt: true, createdAt: true,
          order: { select: { status: true } },
          orderItems: { select: { quantity: true, lineTotal: true, product: { select: { id: true, name: true, categoryRef: { select: { name: true } } } } } },
        },
      }),
      prisma.product.aggregate({
        where: { sellerId: session.userId, deletedAt: null },
        _count: { _all: true },
        _avg: { rating: true },
      }),
    ]);

    const revenueRows = fulfillments.filter(item => item.status === 'delivered' && !REVENUE_STATUSES.includes(item.order.status));
    const totalRevenue = Money.sum(revenueRows.map(item => item.total));
    const currentRows = revenueRows.filter(item => (item.deliveredAt ?? item.createdAt) >= periodStart);
    const previousRows = revenueRows.filter(item => {
      const date = item.deliveredAt ?? item.createdAt;
      return date >= previousStart && date < periodStart;
    });
    const periodRevenue = Money.sum(currentRows.map(item => item.total));
    const previousRevenue = Money.sum(previousRows.map(item => item.total));
    const trend = Money.isZero(previousRevenue)
      ? (Money.isZero(periodRevenue) ? 0 : 100)
      : Number(Money.divide(Money.multiply(Money.subtract(periodRevenue, previousRevenue), '100'), previousRevenue).toDecimalPlaces(1).toString());

    const daily = new Map<string, Prisma.Decimal>();
    for (let index = 0; index < rawDays; index += 1) {
      const day = new Date(periodStart.getTime() + index * 86_400_000);
      daily.set(dateKey(day), new Prisma.Decimal(0));
    }
    for (const item of currentRows) {
      const key = dateKey(item.deliveredAt ?? item.createdAt);
      daily.set(key, Money.add(daily.get(key) ?? '0', item.total));
    }

    const productMap = new Map<string, { id: string; name: string; quantity: number; revenue: Prisma.Decimal }>();
    const categoryMap = new Map<string, Prisma.Decimal>();
    for (const fulfillment of currentRows) {
      for (const item of fulfillment.orderItems) {
        const current = productMap.get(item.product.id) ?? { id: item.product.id, name: item.product.name, quantity: 0, revenue: new Prisma.Decimal(0) };
        current.quantity += item.quantity;
        current.revenue = Money.add(current.revenue, item.lineTotal);
        productMap.set(item.product.id, current);
        const category = item.product.categoryRef?.name ?? 'Chưa phân loại';
        categoryMap.set(category, Money.add(categoryMap.get(category) ?? '0', item.lineTotal));
      }
    }

    const pendingOrders = fulfillments.filter(item => !['delivered', 'cancelled', 'returned', 'refunded'].includes(item.status)).length;
    const lowStock = await prisma.product.count({ where: { sellerId: session.userId, deletedAt: null, stockQuantity: { lte: 5 } } });

    return {
      days: rawDays,
      totalRevenue,
      periodRevenue,
      previousRevenue,
      revenueTrend: trend,
      totalOrders: fulfillments.length,
      deliveredOrders: revenueRows.length,
      pendingOrders,
      products: productStats._count._all,
      lowStock,
      rating: productStats._avg.rating ?? 0,
      dailyRevenue: Array.from(daily, ([date, revenue]) => ({ date, revenue })),
      topProducts: Array.from(productMap.values()).sort((a, b) => Money.compare(b.revenue, a.revenue)).slice(0, 10),
      categoryRevenue: Array.from(categoryMap, ([category, revenue]) => ({ category, revenue })).sort((a, b) => Money.compare(b.revenue, a.revenue)),
    };
  })(req);
}