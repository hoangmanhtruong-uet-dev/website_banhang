import { Product } from '@/types/product';
import { Order } from '@/types/order';

export const mockProducts: Product[] = [
  {
    id: '1', name: 'Áo Khoác Denim Premium', price: 1290000, originalPrice: 1890000,
    description: 'Áo khoác denim cao cấp với thiết kế hiện đại, chất liệu vải denim Nhật Bản dày dặn, form regular fit thoải mái. Phù hợp cho cả nam và nữ, dễ phối đồ cho mọi dịp.',
    category: 'Thời trang', rating: 4.8, reviews: 124, inStock: true, badge: 'Bán chạy',
    emoji: '🧥', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    id: '2', name: 'Tai Nghe Bluetooth Pro', price: 2490000, originalPrice: 3290000,
    description: 'Tai nghe không dây chống ồn chủ động ANC, âm thanh Hi-Res, pin 40 giờ. Kết nối Bluetooth 5.3 ổn định, thiết kế over-ear êm ái.',
    category: 'Công nghệ', rating: 4.9, reviews: 256, inStock: true, badge: 'Hot',
    emoji: '🎧', gradient: 'linear-gradient(135deg, #0c3483 0%, #a2b6df 100%)',
  },
  {
    id: '3', name: 'Serum Vitamin C 20%', price: 450000, originalPrice: 650000,
    description: 'Serum dưỡng sáng da chuyên sâu với Vitamin C nguyên chất 20%, Hyaluronic Acid và Niacinamide. Giúp da sáng mịn, đều màu sau 2 tuần sử dụng.',
    category: 'Làm đẹp', rating: 4.7, reviews: 89, inStock: true, badge: 'Mới',
    emoji: '✨', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    id: '4', name: 'Bàn Làm Việc Gỗ Sồi', price: 4590000,
    description: 'Bàn làm việc gỗ sồi tự nhiên nguyên khối, thiết kế Scandinavian tối giản. Mặt bàn rộng 120x60cm, chân thép sơn tĩnh điện chống gỉ.',
    category: 'Gia dụng', rating: 4.6, reviews: 67, inStock: true,
    emoji: '🪑', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
  {
    id: '5', name: 'Giày Sneaker Urban', price: 1890000, originalPrice: 2490000,
    description: 'Giày sneaker phong cách đường phố, đế boost siêu nhẹ, upper knit thoáng khí. Thiết kế unisex, phù hợp vận động và dạo phố.',
    category: 'Thời trang', rating: 4.5, reviews: 198, inStock: true, badge: 'Sale',
    emoji: '👟', gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  },
  {
    id: '6', name: 'Laptop Gaming RTX 4060', price: 25990000, originalPrice: 29990000,
    description: 'Laptop gaming mạnh mẽ với RTX 4060, CPU i7 Gen 13, RAM 16GB DDR5, SSD 512GB NVMe. Màn hình 15.6" IPS 144Hz, tản nhiệt kép hiệu quả.',
    category: 'Công nghệ', rating: 4.9, reviews: 312, inStock: true, badge: 'Hot',
    emoji: '💻', gradient: 'linear-gradient(135deg, #13547a 0%, #80d0c7 100%)',
  },
  {
    id: '7', name: 'Nước Hoa Unisex EDP', price: 1650000,
    description: 'Nước hoa Eau de Parfum unisex với hương gỗ trầm ấm, tầng hương đầu cam bergamot tươi mát. Lưu hương 8-10 tiếng, toả hương vừa phải.',
    category: 'Làm đẹp', rating: 4.4, reviews: 45, inStock: true,
    emoji: '🌸', gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  },
  {
    id: '8', name: 'Đèn Bàn LED Thông Minh', price: 890000,
    description: 'Đèn bàn LED điều khiển qua app, 5 chế độ ánh sáng, điều chỉnh nhiệt độ màu 2700K-6500K. Thiết kế tối giản, cổng sạc USB tích hợp.',
    category: 'Gia dụng', rating: 4.3, reviews: 78, inStock: true, badge: 'Mới',
    emoji: '💡', gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  },
  {
    id: '9', name: 'Đồng Hồ Thông Minh V5', price: 3290000, originalPrice: 4190000,
    description: 'Smartwatch cao cấp với màn hình AMOLED 1.4", đo SpO2, nhịp tim, GPS tích hợp. Chống nước 5ATM, pin 14 ngày. 100+ mặt đồng hồ.',
    category: 'Công nghệ', rating: 4.7, reviews: 167, inStock: true, badge: 'Bán chạy',
    emoji: '⌚', gradient: 'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)',
  },
  {
    id: '10', name: 'Áo Thun Cotton Organic', price: 390000,
    description: 'Áo thun cotton hữu cơ 100%, mềm mịn thân thiện với da. Form regular fit, nhiều màu sắc. Sản xuất bền vững, không hoá chất độc hại.',
    category: 'Thời trang', rating: 4.6, reviews: 234, inStock: true,
    emoji: '👕', gradient: 'linear-gradient(135deg, #c3cfe2 0%, #f5f7fa 100%)',
  },
  {
    id: '11', name: 'Máy Pha Cà Phê Espresso', price: 6890000,
    description: 'Máy pha cà phê espresso bán tự động, áp suất 15 bar, hệ thống đánh sữa tạo bọt. Bình nước 1.5L, khay chứa bã tự động. Thiết kế inox sang trọng.',
    category: 'Gia dụng', rating: 4.8, reviews: 92, inStock: true, badge: 'Premium',
    emoji: '☕', gradient: 'linear-gradient(135deg, #3c1053 0%, #ad5389 100%)',
  },
  {
    id: '12', name: 'Balo Du Lịch Chống Nước', price: 790000, originalPrice: 1190000,
    description: 'Balo du lịch 40L chống nước IPX4, ngăn laptop 15.6", dây đeo ergonomic giảm áp lực. Nhiều ngăn tiện dụng, khoá chống trộm TSA.',
    category: 'Thời trang', rating: 4.5, reviews: 156, inStock: true, badge: 'Sale',
    emoji: '🎒', gradient: 'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)',
  },
];

export const mockOrders: Order[] = [
  {
    id: 'ORD-001', items: [{ product: mockProducts[0], quantity: 1 }, { product: mockProducts[1], quantity: 1 }],
    total: 3780000, status: 'delivered', paymentStatus: 'paid', customerName: 'Nguyễn Văn An', customerEmail: 'an.nguyen@email.com',
    customerPhone: '0901234567', shippingAddress: '123 Nguyễn Huệ, Q.1, TP.HCM', shippingFee: 30000,
    paymentMethod: 'COD', createdAt: '2026-05-10T08:30:00Z',
  },
  {
    id: 'ORD-002', items: [{ product: mockProducts[5], quantity: 1 }],
    total: 25990000, status: 'processing', paymentStatus: 'paid', customerName: 'Trần Thị Bình', customerEmail: 'binh.tran@email.com',
    customerPhone: '0912345678', shippingAddress: '456 Lê Lợi, Q.3, TP.HCM', shippingFee: 0,
    paymentMethod: 'Banking', createdAt: '2026-05-11T14:20:00Z',
  },
  {
    id: 'ORD-003', items: [{ product: mockProducts[2], quantity: 2 }, { product: mockProducts[6], quantity: 1 }],
    total: 2550000, status: 'shipped', paymentStatus: 'paid', customerName: 'Lê Minh Cường', customerEmail: 'cuong.le@email.com',
    customerPhone: '0923456789', shippingAddress: '789 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội', shippingFee: 40000,
    paymentMethod: 'MoMo', createdAt: '2026-05-12T09:15:00Z',
  },
  {
    id: 'ORD-004', items: [{ product: mockProducts[8], quantity: 1 }],
    total: 3290000, status: 'pending', paymentStatus: 'unpaid', customerName: 'Phạm Thu Dung', customerEmail: 'dung.pham@email.com',
    customerPhone: '0934567890', shippingAddress: '321 Hai Bà Trưng, Q.1, TP.HCM', shippingFee: 30000,
    paymentMethod: 'Banking', createdAt: '2026-05-13T06:00:00Z',
  },
];

export const categories = ['Tất cả', 'Thời trang', 'Công nghệ', 'Làm đẹp', 'Gia dụng'];
