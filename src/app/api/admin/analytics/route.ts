import { Prisma } from '@prisma/client';
import { type NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { createHandler } from '@/lib/api-handler';
import { ValidationError } from '@/lib/errors';
import { Money } from '@/lib/utils/money';

const VALID_DAYS = new Set([7, 30, 90]);
const DAY_MS = 86_400_000;
const keyOf = (date: Date) => date.toISOString().slice(0, 10);

export const dynamic = 'force-dynamic';

export const GET = createHandler(async (request: NextRequest) => {
  await requireAdmin();
  const days = Number(new URL(request.url).searchParams.get('days') ?? 30);
  if (!VALID_DAYS.has(days)) throw new ValidationError('Khoảng thời gian chỉ nhận 7, 30 hoặc 90 ngày');

  const now = new Date();
  const start = new Date(now.getTime() - (days - 1) * DAY_MS);
  start.setHours(0, 0, 0, 0);
  const previousStart = new Date(start.getTime() - days * DAY_MS);

  const [orders, previousOrders, settlements, usersByRole, sellerCount, products] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: start } },
      select: {
        id: true, status: true, paymentStatus: true, paymentMethod: true, total: true, createdAt: true,
        fulfillments: { select: { status: true, deliveredAt: true } },
        orderItems: { select: { quantity: true, lineTotal: true, product: { select: { id: true, name: true, sellerId: true } } } },
      },
    }),
    prisma.order.findMany({ where: { createdAt: { gte: previousStart, lt: start } }, select: { total: true, status: true } }),
    prisma.sellerSettlement.findMany({ where: { createdAt: { gte: start } }, select: { grossAmount: true, commissionAmount: true, netAmount: true, status: true } }),
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.user.count({ where: { isSeller: true } }),
    prisma.product.count({ where: { deletedAt: null } }),
  ]);

  const paid = orders.filter((order) => order.paymentStatus === 'paid');
  const delivered = orders.filter((order) => order.status === 'delivered');
  const refunded = orders.filter((order) => ['returned', 'refunded'].includes(order.status));
  const cancelled = orders.filter((order) => order.status === 'cancelled');
  const gmv = Money.sum(delivered.map((order) => order.total));
  const placedValue = Money.sum(orders.map((order) => order.total));
  const previousGmv = Money.sum(previousOrders.filter((order) => order.status === 'delivered').map((order) => order.total));
  const revenueTrend = Money.isZero(previousGmv)
    ? (Money.isZero(gmv) ? 0 : 100)
    : Number(Money.divide(Money.multiply(Money.subtract(gmv, previousGmv), '100'), previousGmv).toDecimalPlaces(1).toString());

  const daily = new Map<string, { orders: number; gmv: Prisma.Decimal; delivered: number }>();
  for (let index = 0; index < days; index += 1) {
    daily.set(keyOf(new Date(start.getTime() + index * DAY_MS)), { orders: 0, gmv: new Prisma.Decimal(0), delivered: 0 });
  }
  const productMap = new Map<string, { id: string; name: string; quantity: number; revenue: Prisma.Decimal }>();
  const paymentMethods = new Map<string, number>();
  for (const order of orders) {
    const key = keyOf(order.createdAt);
    const point = daily.get(key);
    if (point) {
      point.orders += 1;
      if (order.status === 'delivered') { point.delivered += 1; point.gmv = Money.add(point.gmv, order.total); }
    }
    paymentMethods.set(order.paymentMethod, (paymentMethods.get(order.paymentMethod) ?? 0) + 1);
    if (order.status !== 'delivered') continue;
    for (const item of order.orderItems) {
      const row = productMap.get(item.product.id) ?? { id: item.product.id, name: item.product.name, quantity: 0, revenue: new Prisma.Decimal(0) };
      row.quantity += item.quantity;
      row.revenue = Money.add(row.revenue, item.lineTotal);
      productMap.set(item.product.id, row);
    }
  }

  const platformRevenue = Money.sum(settlements.map((item) => item.commissionAmount));
  const sellerNet = Money.sum(settlements.map((item) => item.netAmount));
  const userCounts = Object.fromEntries(usersByRole.map((row) => [row.role, row._count._all]));
  const conversion = (value: number) => orders.length === 0 ? 0 : Number(((value / orders.length) * 100).toFixed(1));

  return {
    days,
    kpis: {
      orders: orders.length,
      placedValue,
      paidOrders: paid.length,
      deliveredOrders: delivered.length,
      gmv,
      platformRevenue,
      sellerNet,
      averageOrderValue: orders.length ? Money.divide(placedValue, String(orders.length)) : new Prisma.Decimal(0),
      cancelledOrders: cancelled.length,
      returnedOrRefundedOrders: refunded.length,
      revenueTrend,
      products,
      sellers: sellerCount,
      users: Object.values(userCounts).reduce((sum, value) => sum + value, 0),
    },
    funnel: [
      { stage: 'Đặt hàng', value: orders.length, rate: 100 },
      { stage: 'Đã thanh toán', value: paid.length, rate: conversion(paid.length) },
      { stage: 'Seller xác nhận', value: orders.filter((order) => order.fulfillments.some((item) => ['confirmed', 'packing', 'shipping', 'delivered'].includes(item.status))).length, rate: conversion(orders.filter((order) => order.fulfillments.some((item) => ['confirmed', 'packing', 'shipping', 'delivered'].includes(item.status))).length) },
      { stage: 'Đang giao', value: orders.filter((order) => order.fulfillments.some((item) => ['shipping', 'delivered'].includes(item.status))).length, rate: conversion(orders.filter((order) => order.fulfillments.some((item) => ['shipping', 'delivered'].includes(item.status))).length) },
      { stage: 'Đã giao', value: delivered.length, rate: conversion(delivered.length) },
    ],
    daily: Array.from(daily, ([date, value]) => ({ date, ...value })),
    topProducts: Array.from(productMap.values()).sort((a, b) => Money.compare(b.revenue, a.revenue)).slice(0, 8),
    paymentMethods: Array.from(paymentMethods, ([method, count]) => ({ method, count })),
    usersByRole: { ...userCounts, sellers: sellerCount },
  };
});
