import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PREFIXES = ['SALE', 'VIP', 'TET', 'HE', 'BLACK', 'FLASH', 'NEW', 'GOLD', 'MEGA', 'SUPER'];
const DESCRIPTIONS = [
  'Giảm giá đơn hàng',
  'Ưu đãi thành viên',
  'Khuyến mãi cuối tuần',
  'Voucher sinh nhật',
  'Flash sale 24h',
  'Giảm phí vận chuyển logic',
  'Combo mua sắm',
  'Ưu đãi người mới',
  'Tri ân khách hàng',
  'Chương trình loyalty',
];

function randomCode(index: number): string {
  const prefix = PREFIXES[index % PREFIXES.length];
  const suffix = String(1000 + index).slice(-4);
  return `${prefix}${suffix}`;
}

export async function seedVouchers(sellerId: string, count = 100) {
  const existing = await prisma.voucher.count();
  if (existing >= count) {
    console.log(`⏭️  Đã có ${existing} voucher, bỏ qua seed voucher.`);
    return existing;
  }

  await prisma.voucher.deleteMany();

  const now = new Date();
  const vouchers = [];

  for (let i = 0; i < count; i++) {
    const isPercent = i % 3 !== 0;
    const discountType = isPercent ? 'percentage' : 'fixed';
    const discountValue = isPercent
      ? [5, 10, 15, 20, 25, 30, 40, 50][i % 8]
      : [10000, 20000, 30000, 50000, 75000, 100000, 150000, 200000, 500000][i % 9];

    const minOrderValue = isPercent
      ? [0, 100000, 200000, 300000, 500000][i % 5]
      : [150000, 300000, 500000, 1000000][i % 4];

    const maxDiscount = isPercent
      ? [50000, 100000, 200000, 500000, null][i % 5]
      : null;

    const daysValid = 30 + (i % 12) * 15;
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + daysValid);

    const startOffset = i % 10;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - startOffset);

    vouchers.push({
      code: randomCode(i),
      description: `${DESCRIPTIONS[i % DESCRIPTIONS.length]} #${i + 1}`,
      discountType,
      discountValue,
      minOrderValue,
      maxDiscount,
      startDate,
      endDate,
      usageLimit: 50 + (i % 20) * 10,
      usedCount: i % 17,
      sellerId,
    });
  }

  await prisma.voucher.createMany({ data: vouchers });
  console.log(`✅ Đã tạo ${count} voucher (%, cố định, nhiều mức HSD).`);
  return count;
}

async function runCli() {
  const admin = await prisma.user.findFirst({
    where: { role: 'admin' },
    select: { id: true, email: true },
  });

  if (!admin) {
    console.error('❌ Chưa có tài khoản admin. Chạy npm run db:seed trước.');
    process.exit(1);
  }

  console.log(`🎟️  Seed voucher cho admin: ${admin.email}`);
  await seedVouchers(admin.id, 100);
}

if (process.argv[1]?.replace(/\\/g, '/').includes('seed-vouchers')) {
  runCli()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
}
