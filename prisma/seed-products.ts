import { PrismaClient } from '@prisma/client';
import { catalogProducts } from './catalog-products';

const prisma = new PrismaClient();

async function main() {
  const names = [...new Set(catalogProducts.map(product => product.category))];
  const categoryIds = new Map<string, string>();
  const seller = await prisma.user.findFirst({
    where: { role: 'admin', isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!seller) throw new Error('Catalog seed requires an active admin seller');
  await prisma.user.update({ where: { id: seller.id }, data: { isSeller: true } });

  for (const name of names) {
    const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\u0111/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const category = await prisma.category.upsert({
      where: { name },
      update: { slug, approved: true },
      create: { name, slug, approved: true },
    });
    categoryIds.set(name, category.id);
  }

  for (const product of catalogProducts) {
    const { category, ...data } = product;
    const categoryId = categoryIds.get(category);
    if (!categoryId) throw new Error('Kh\u00f4ng t\u00ecm th\u1ea5y danh m\u1ee5c: ' + category);
    await prisma.product.upsert({
      where: { code: data.code },
      update: { ...data, categoryId, sellerId: seller.id },
      create: { ...data, categoryId, sellerId: seller.id },
    });
  }

  const stock = catalogProducts.reduce((sum, product) => sum + product.stockQuantity, 0);
  console.log('\u0110\u00e3 t\u1ea1o/c\u1eadp nh\u1eadt ' + catalogProducts.length + ' s\u1ea3n ph\u1ea9m');
  console.log('T\u1ed5ng t\u1ed3n kho: ' + stock + ' s\u1ea3n ph\u1ea9m');
  console.log('Danh m\u1ee5c: ' + names.join(', '));
}

main().catch((error) => {
  console.error('Kh\u00f4ng th\u1ec3 seed catalog s\u1ea3n ph\u1ea9m:', error);
  process.exit(1);
}).finally(async () => prisma.$disconnect());
