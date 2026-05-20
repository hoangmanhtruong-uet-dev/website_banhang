import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper function to generate slug from Vietnamese text
function generateSlug(text: string, index?: number): string {
  let slug = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim()
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

  if (index !== undefined) {
    slug = `${slug}-${index}`;
  }
  return slug;
}

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

// Function to generate 200 products
function generateProducts() {
  const categories = ['Thời trang', 'Công nghệ', 'Làm đẹp', 'Gia dụng'];
  const emojis = ['👔', '👗', '👠', '🧢', '💄', '💅', '🎮', '📱', '🖥️', '⌨️', '🖱️', '🎧', '📷', '🔊', '🌟', '✨', '💎', '⚡', '🔥', '❄️'];
  const badges = ['Hot', 'Sale', 'Mới', 'Bán chạy', 'Premium', null];
  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  ];

  const productNames = [
    'Quần Jeans Slim Fit', 'Áo Sơ Mi Oxford', 'Váy Xòe Lưới', 'Chân Váy Midi', 'Quần Short Kaki',
    'Áo Polo Cotton', 'Áo Sweater Nỉ', 'Áo Cardigan Len', 'Áo Croptop Bé Gái', 'Quần Jogger Thể Thao',
    'Điện Thoại Xiaomi 14', 'Máy Tính Bảng iPad Pro', 'Camera Sony A6700', 'Loa Bluetooth JBL', 'Ốp Lưng Innostyle',
    'Sạc Nhanh USB-C', 'Cáp Lightning Chính Hãng', 'Pin Dự Phòng 20000mAh', 'Ốp Lưng Kính Cường Lực', 'Bao Da Điện Thoại',
    'Kem Chống Nắng SPF 50', 'Mặt Nạ Giấy Dưỡng Ẩm', 'Toner Cân Bằng Da', 'Sữa Rửa Mặt Tạo Bọt', 'Kem Dưỡng Ẩm Ban Đêm',
    'Mascara Waterproof', 'Phấn Mắt Shimmer', 'Son Lì Môi Đỏ', 'Kem Má Hồng Đất', 'Tẩy Trang Tinh Dầu',
    'Chăn Mềm Mại', 'Gối Cao Su Non', 'Nệm Memory Foam', 'Drap Giường Cotton', 'Vỏ Gối Lụa',
    'Bàn Phím Cơ RGB', 'Chuột Gaming Wireless', 'Màn Hình Cong 144Hz', 'Ghế Gaming DXRacer', 'Đế Tản Nhiệt Laptop',
    'Mũ Thể Thao Adidas', 'Dép Quai Ngang Comfy', 'Tất Socks Cotton', 'Khăn Ăn Vải Premium', 'Thắt Lưng Da Bò',
    'Túi Xách Công Sở', 'Ví Da Nam Cao Cấp', 'Dây Chuyền Bạc Sterling', 'Vòng Tay Đá Tự Nhiên', 'Nhẫn Bạc Khắc',
  ];

  const descriptions = [
    'Sản phẩm chất lượng cao với thiết kế hiện đại, đáp ứng nhu cầu hàng ngày.',
    'Được làm từ chất liệu tốt nhất, thoải mái và bền durable.',
    'Thiết kế xu hướng mới nhất, phù hợp cho mọi lứa tuổi.',
    'Sản phẩm bán chạy hàng đầu với nhiều đánh giá tích cực.',
    'Chất lượng premium với giá cả hợp lý, đáng để mua.',
    'Được yêu thích bởi hàng ngàn khách hàng trên toàn quốc.',
    'Thiết kế độc quyền, không bị lặp ở nơi khác.',
    'Sản phẩm thân thiện với môi trường, bền vững lâu dài.',
  ];

  const newProducts = [];
  for (let i = 0; i < 200; i++) {
    const nameIndex = i % productNames.length;
    const categoryIndex = i % categories.length;
    const price = Math.floor(Math.random() * (30000000 - 100000) + 100000) * 1000;
    const hasDiscount = Math.random() > 0.4;
    
    newProducts.push({
      name: `${productNames[nameIndex]} ${i + 1}`,
      price: price,
      originalPrice: hasDiscount ? price + Math.floor(Math.random() * 10000000 * 100) / 100 : null,
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      category: categories[categoryIndex],
      rating: parseFloat((Math.random() * 2 + 3).toFixed(1)), // 3.0 - 5.0
      reviews: Math.floor(Math.random() * 500),
      inStock: Math.random() > 0.1,
      badge: badges[Math.floor(Math.random() * badges.length)],
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      gradient: gradients[Math.floor(Math.random() * gradients.length)],
    });
  }
  return newProducts;
}

const generatedProducts = generateProducts();
const allProducts = [...products, ...generatedProducts];

async function main() {
  console.log('🌱 Bắt đầu seed database...');

  // Xóa data cũ
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  let userCount = 0;
  let adminCount = 0;
  let productCount = 0;

  // Tạo admin user
  const adminPassword = await bcrypt.hash('123456', 12);
  adminCount++;
  const admin = await prisma.user.create({
    data: {
      code: `AD${String(adminCount).padStart(3, '0')}`,
      name: 'Admin',
      email: 'truongcri0101@gmail.com',
      password: adminPassword,
      role: 'admin',
      phone: '0868544769',
      gender: 'male',
      birthday: new Date('2007-01-01'),
    },
  });
  console.log(`✅ Tạo admin: ${admin.email} (${admin.code}) / 123456`);

  // Tạo test user
  const userPassword = await bcrypt.hash('User@123456', 12);
  userCount++;
  const user = await prisma.user.create({
    data: {
      code: `US${String(userCount).padStart(3, '0')}`,
      name: 'Test User',
      email: 'user@mtruong.store',
      password: userPassword,
      role: 'user',
      phone: '0123456789',
      gender: 'female',
      birthday: new Date('1990-05-15'),
    },
  });
  console.log(`✅ Tạo user: ${user.email} (${user.code}) / User@123456`);

  // Tạo categories
  const categoriesData = ['Thời trang', 'Công nghệ', 'Làm đẹp', 'Gia dụng'];
  const categoryMap: Record<string, string> = {};
  for (const catName of categoriesData) {
    const cat = await prisma.category.create({
      data: {
        name: catName,
        slug: catName.toLowerCase().replace(/ /g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
      }
    });
    categoryMap[catName] = cat.id;
  }
  console.log(`✅ Tạo ${categoriesData.length} danh mục`);

  // Tạo products
  for (const product of allProducts) {
    const { category, ...rest } = product;
    productCount++;
    await prisma.product.create({ 
      data: {
        ...rest,
        code: `PR${String(productCount).padStart(3, '0')}`,
        slug: generateSlug(product.name),
        categoryId: categoryMap[category],
      } 
    });
  }
  console.log(`✅ Tạo ${allProducts.length} sản phẩm`);

  console.log('\n🎉 Seed hoàn thành!');
  console.log('📧 Admin:  truongcri0101@gmail.com (AD001) / 123456');
  console.log('📧 User:   user@mtruong.store (US001) / User@123456');
  console.log(`📦 Tổng sản phẩm: ${allProducts.length} (PR001 - PR${String(allProducts.length).padStart(3, '0')})`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
