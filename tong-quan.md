🗂️ Tổng quan dịch vụ của Project mtruong-store
🏗️ Framework & Core
Dịch vụ	Mô tả
Next.js 16	Framework chính (App Router)
React 18	UI library
TypeScript 5	Ngôn ngữ lập trình
TailwindCSS 3	Styling
🗄️ Database
Dịch vụ	Mô tả
MySQL	Database chính (production/dev)
Prisma ORM	Database client & migration tool
SQLite (dev.db)	Database local dev hiện tại
☁️ Storage / Upload
Dịch vụ	Mô tả
Cloudinary	Lưu trữ file/ảnh cho production (STORAGE_PROVIDER=cloudinary)
Local storage	Lưu trữ file local cho dev (public/uploads)
🔐 Authentication & Security
Dịch vụ	Mô tả
JWT (via jose)	Access token + Refresh token
bcryptjs	Hash password
Rate limiting	Chống brute force (custom implementation)
CSRF / Origin check	Kiểm tra API_ALLOWED_ORIGINS
📦 Internal Services (src/lib/services/)
Service	Mô tả
Auth service	Quản lý đăng nhập/đăng xuất
Order service	Xử lý đơn hàng
Payment service	Xử lý thanh toán
Fulfillment service	Xử lý vận chuyển/giao hàng
Upload service	Upload file/ảnh
Notification service	Gửi email/SMS (default: log — không gửi ra ngoài)
Outbox service	Transactional Outbox pattern (đảm bảo reliable messaging)
Idempotency service	Chống duplicate request
Cache service	Caching layer
🔔 Notification
Provider	Mô tả
log (default)	Chỉ log ra console, không gửi PII ra ngoài
Webhook (optional)	Gửi email/SMS qua webhook HTTPS bên ngoài
🔄 Background Workers & Jobs
Worker/Job	Mô tả
Outbox Worker	Xử lý transactional outbox messages liên tục
Inventory jobs	Expire / reconcile / repair inventory reservations
Order state reconcile	Đồng bộ trạng thái đơn hàng
Outbox reconcile	Kiểm tra & repair outbox
Idempotency cleanup	Dọn dẹp idempotency keys hết hạn
🔑 Key Patterns
Transactional Outbox Pattern — đảm bảo at-least-once delivery cho events
Idempotency — mỗi request payment/order có idempotency key
Inventory Reservation — giữ hàng tạm 15 phút khi đặt đơn
Refresh Token Rotation — JWT access (15m) + refresh (7 ngày)
📌 Lưu ý: Notification provider hiện đang là log (không gửi email/SMS thật). Nếu muốn bật, cần cấu hình NOTIFICATION_EMAIL_WEBHOOK_URL trong 

.env
.