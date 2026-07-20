# Kiến trúc hệ thống (System Architecture)

Dự án sử dụng kiến trúc Next.js App Router (14.2.35) kết hợp Prisma ORM và MySQL.

## 1. Authentication & Session Management
- Sử dụng mô hình Access Token ngắn hạn (15 phút) và Refresh Token dài hạn (7 ngày).
- Token được phát hành dưới dạng Cookie có cờ `httpOnly`, `secure`, `sameSite=lax`.
- Phiên làm việc (Session) của Refresh Token được lưu trữ và băm (`sha256`) trong bảng `Session` để hỗ trợ cơ chế revoke từ phía máy chủ và Refresh Token Rotation (RTR).

## 2. Service Layer & Business Logic Separation
Để tăng khả năng bảo trì và test, các business logic phức tạp được tách khỏi Route Handlers vào Service Layer:
- `OrderService`: Xử lý giao dịch tạo đơn hàng, tính toán tổng tiền, kiểm tra tồn kho bằng Database Transaction.
- `SessionService`: Tạo, rotate, revoke session và quản lý token.
- `AuthService`: Xác thực đăng nhập, đăng ký, băm mật khẩu.
- `PasswordResetService`: Sinh token reset mật khẩu dùng một lần (One-time reset token) lưu trạng thái phía máy chủ.
- `StorageService`: Trừu tượng hóa việc lưu trữ tập tin hỗ trợ Local và Object Storage adapters.
- `EmailService`: Xử lý gửi email bất đồng bộ/timeout tránh nghẽn luồng xử lý chính.

## 3. Middleware & Security Layer
- `middleware.ts` đóng vai trò kiểm tra tính hợp lệ của token trước khi chuyển tiếp request vào route handler.
- Rate Limiter in-memory/IP-based kiểm soát các endpoint nhạy cảm chống DDoS và brute force.
- Input validation tập trung thông qua `Zod` schema.