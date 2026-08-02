import { PrismaClient } from '@prisma/client';
import { realisticOriginalPrice, realisticProductPrice } from '../prisma/product-pricing';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');
const OVERPRICED_THRESHOLD = 100_000_000;

async function main() {
  const products = await prisma.product.findMany({
    where: { price: { gte: OVERPRICED_THRESHOLD } },
    orderBy: { code: 'asc' },
    select: { id: true, code: true, name: true, price: true, originalPrice: true },
  });

  const changes = products.map((product, index) => {
    const fallback = Math.min(40_000_000, Math.max(100_000, Number(product.price) / 1000));
    const sequence = Math.max(0, Number(product.name.match(/(\\d+)$/)?.[1] ?? index + 1) - 1);
    const price = realisticProductPrice(product.name, sequence, fallback);
    const originalPrice = realisticOriginalPrice(price, product.originalPrice !== null, sequence);
    return { ...product, nextPrice: price, nextOriginalPrice: originalPrice };
  });

  console.table(changes.slice(0, 20).map(product => ({
    code: product.code,
    name: product.name,
    oldPrice: Number(product.price),
    newPrice: product.nextPrice,
    newOriginalPrice: product.nextOriginalPrice,
  })));
  console.log(`${changes.length} san pham co gia tu ${OVERPRICED_THRESHOLD.toLocaleString('vi-VN')} d tro len.`);

  if (!apply || changes.length === 0) {
    console.log(apply ? 'Khong co du lieu can sua.' : 'Day la che do xem truoc. Chay lai voi --apply de cap nhat.');
    return;
  }

  await prisma.$transaction(changes.map(product => prisma.product.update({
    where: { id: product.id },
    data: { price: product.nextPrice, originalPrice: product.nextOriginalPrice },
  })));
  console.log(`Da cap nhat gia cho ${changes.length} san pham.`);
}

main().catch(error => {
  console.error('Khong the reset gia san pham:', error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());