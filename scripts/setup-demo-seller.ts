import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const SELLER_EMAIL = process.env.DEMO_SELLER_EMAIL?.trim().toLowerCase() || 'seller01@mtruong.store';
const SELLER_PASSWORD = process.env.DEMO_SELLER_PASSWORD || 'Seller@123456';
const SELLER_NAME = process.env.DEMO_SELLER_NAME?.trim() || 'MTruong Seller 01';
const PRODUCT_TARGET = 20;

function nextUserCode(codes: string[]) {
  const max = codes.reduce((current, code) => {
    const match = code.match(/^(?:US|IDU)(\d+)$/i);
    return match ? Math.max(current, Number(match[1])) : current;
  }, 0);
  return `US${String(max + 1).padStart(3, '0')}`;
}

async function main() {
  const password = await bcrypt.hash(SELLER_PASSWORD, 12);
  const result = await prisma.$transaction(async tx => {
    const existing = await tx.user.findUnique({ where: { email: SELLER_EMAIL } });
    const seller = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: { name: SELLER_NAME, password, role: 'user', isSeller: true, isActive: true },
        })
      : await tx.user.create({
          data: {
            code: nextUserCode((await tx.user.findMany({ select: { code: true } })).map(user => user.code)),
            name: SELLER_NAME,
            email: SELLER_EMAIL,
            password,
            role: 'user',
            isSeller: true,
            isActive: true,
            phone: '0900000001',
          },
        });

    const currentCount = await tx.product.count({ where: { sellerId: seller.id } });
    const needed = Math.max(0, PRODUCT_TARGET - currentCount);
    const candidates = needed > 0 ? await tx.product.findMany({
      where: {
        OR: [
          { sellerId: null },
          { sellerId: { not: seller.id }, seller: { role: 'admin' } },
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: needed,
      select: { id: true },
    }) : [];

    if (candidates.length > 0) {
      await tx.product.updateMany({
        where: { id: { in: candidates.map(product => product.id) } },
        data: { sellerId: seller.id },
      });
    }

    const products = await tx.product.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: 'desc' },
      select: { code: true, name: true },
    });
    return { seller, products, assignedNow: candidates.length };
  });

  console.log(`Seller: ${result.seller.email} (${result.seller.code})`);
  console.log(`Da gan moi ${result.assignedNow} san pham; seller dang co ${result.products.length} san pham.`);
  console.table(result.products.map(product => ({ code: product.code, name: product.name })));
}

main().catch(error => {
  console.error('Khong the thiet lap seller demo:', error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());