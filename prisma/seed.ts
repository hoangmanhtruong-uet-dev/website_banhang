import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const products = [
  {
    name: 'Áo Khoác Denim Premium', price: 1290000, originalPrice: 1890000,
    description: 'Áo khoác denim cao cấp với thiết kế hiện đại, chất liệu vải denim Nhật Bản dày dặn, form regular fit thoải mái. Phù hợp cho cả nam và nữ, dễ phối đồ cho mọi dịp.',
    category: 'Thời trang', rating: 4.8, reviews: 124, inStock: true, badge: 'Bán chạy',
    emoji: '🧥', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    name: 'Tai Nghe Bluetooth Pro', price: 2490000, originalPrice: 3290000,
    description: 'Tai nghe không dây chống ồn chủ động ANC, âm thanh Hi-Res, pin 40 giờ. Kết nối Bluetooth 5.3 ổn định, thiết kế over-ear êm ái.',
    category: 'Công nghệ', rating: 4.9, reviews: 256, inStock: true, badge: 'Hot',
    emoji: '🎧', gradient: 'linear-gradient(135deg, #0c3483 0%, #a2b6df 100%)',
  },
  {
    name: 'Serum Vitamin C 20%', price: 450000, originalPrice: 650000,
    description: 'Serum dưỡng sáng da chuyên sâu với Vitamin C nguyên chất 20%, Hyaluronic Acid và Niacinamide. Giúp da sáng mịn, đều màu sau 2 tuần sử dụng.',
    category: 'Làm đẹp', rating: 4.7, reviews: 89, inStock: true, badge: 'Mới',
    emoji: '✨', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    name: 'Bàn Làm Việc Gỗ Sồi', price: 4590000, originalPrice: null,
    description: 'Bàn làm việc gỗ sồi tự nhiên nguyên khối, thiết kế Scandinavian tối giản. Mặt bàn rộng 120x60cm, chân thép sơn tĩnh điện chống gỉ.',
    category: 'Gia dụng', rating: 4.6, reviews: 67, inStock: true, badge: null,
    emoji: '🪑', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
  {
    name: 'Giày Sneaker Urban', price: 1890000, originalPrice: 2490000,
    description: 'Giày sneaker phong cách đường phố, đế boost siêu nhẹ, upper knit thoáng khí. Thiết kế unisex, phù hợp vận động và dạo phố.',
    category: 'Thời trang', rating: 4.5, reviews: 198, inStock: true, badge: 'Sale',
    emoji: '👟', gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  },
  {
    name: 'Laptop Gaming RTX 4060', price: 25990000, originalPrice: 29990000,
    description: 'Laptop gaming mạnh mẽ với RTX 4060, CPU i7 Gen 13, RAM 16GB DDR5, SSD 512GB NVMe. Màn hình 15.6" IPS 144Hz, tản nhiệt kép hiệu quả.',
    category: 'Công nghệ', rating: 4.9, reviews: 312, inStock: true, badge: 'Hot',
    emoji: '💻', gradient: 'linear-gradient(135deg, #13547a 0%, #80d0c7 100%)',
  },
  {
    name: 'Nước Hoa Unisex EDP', price: 1650000, originalPrice: null,
    description: 'Nước hoa Eau de Parfum unisex với hương gỗ trầm ấm, tầng hương đầu cam bergamot tươi mát. Lưu hương 8-10 tiếng, toả hương vừa phải.',
    category: 'Làm đẹp', rating: 4.4, reviews: 45, inStock: true, badge: null,
    emoji: '🌸', gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  },
  {
    name: 'Đèn Bàn LED Thông Minh', price: 890000, originalPrice: null,
    description: 'Đèn bàn LED điều khiển qua app, 5 chế độ ánh sáng, điều chỉnh nhiệt độ màu 2700K-6500K. Thiết kế tối giản, cổng sạc USB tích hợp.',
    category: 'Gia dụng', rating: 4.3, reviews: 78, inStock: true, badge: 'Mới',
    emoji: '💡', gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  },
  {
    name: 'Đồng Hồ Thông Minh V5', price: 3290000, originalPrice: 4190000,
    description: 'Smartwatch cao cấp với màn hình AMOLED 1.4", đo SpO2, nhịp tim, GPS tích hợp. Chống nước 5ATM, pin 14 ngày. 100+ mặt đồng hồ.',
    category: 'Công nghệ', rating: 4.7, reviews: 167, inStock: true, badge: 'Bán chạy',
    emoji: '⌚', gradient: 'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)',
  },
  {
    name: 'Áo Thun Cotton Organic', price: 390000, originalPrice: null,
    description: 'Áo thun cotton hữu cơ 100%, mềm mịn thân thiện với da. Form regular fit, nhiều màu sắc. Sản xuất bền vững, không hoá chất độc hại.',
    category: 'Thời trang', rating: 4.6, reviews: 234, inStock: true, badge: null,
    emoji: '👕', gradient: 'linear-gradient(135deg, #c3cfe2 0%, #f5f7fa 100%)',
  },
  {
    name: 'Máy Pha Cà Phê Espresso', price: 6890000, originalPrice: null,
    description: 'Máy pha cà phê espresso bán tự động, áp suất 15 bar, hệ thống đánh sữa tạo bọt. Bình nước 1.5L, khay chứa bã tự động. Thiết kế inox sang trọng.',
    category: 'Gia dụng', rating: 4.8, reviews: 92, inStock: true, badge: 'Premium',
    emoji: '☕', gradient: 'linear-gradient(135deg, #3c1053 0%, #ad5389 100%)',
  },
  {
    name: 'Balo Du Lịch Chống Nước', price: 790000, originalPrice: 1190000,
    description: 'Balo du lịch 40L chống nước IPX4, ngăn laptop 15.6", dây đeo ergonomic giảm áp lực. Nhiều ngăn tiện dụng, khoá chống trộm TSA.',
    category: 'Thời trang', rating: 4.5, reviews: 156, inStock: true, badge: 'Sale',
    emoji: '🎒', gradient: 'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)',
  },
];

async function main() {
  console.log('🌱 Bắt đầu seed database...');

  // Xóa data cũ
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  // Tạo admin user
  const adminPassword = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@mtruong.store',
      password: adminPassword,
      role: 'admin',
    },
  });
  console.log(`✅ Tạo admin: ${admin.email} / Admin@123456`);

  // Tạo test user
  const userPassword = await bcrypt.hash('User@123456', 12);
  const user = await prisma.user.create({
    data: {
      name: 'Test User',
      email: 'user@mtruong.store',
      password: userPassword,
      role: 'user',
    },
  });
  console.log(`✅ Tạo user: ${user.email} / User@123456`);

  // Tạo products
  for (const product of products) {
    await prisma.product.create({ data: product });
  }
  console.log(`✅ Tạo ${products.length} sản phẩm`);

  console.log('\n🎉 Seed hoàn thành!');
  console.log('📧 Admin:  admin@mtruong.store / Admin@123456');
  console.log('📧 User:   user@mtruong.store  / User@123456');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
