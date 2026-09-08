# Chính sách bảo mật (Security Policy)

## 1. Authentication và Session Security
- **JWT Authentication Model**: Sử dụng mô hình Access Token (ngắn hạn, 15 phút) và Refresh Token (dài hạn, 7 ngày) được lưu trữ hoàn toàn dưới dạng HTTPOnly, Secure, SameSite=Lax cookie.
- **Revocation**: Refresh token lưu hash trong database và được rotate liên tục sau mỗi lần refresh. Logout thực hiện xoá cookie và revoke session trong database.
- **Password Hashing**: Toàn bộ thao tác hash password sử dụng `bcryptjs` với salt round là 12, thực thi trên môi trường Node.js runtime.

## 2. Rate Limiting và Chống Abuse
- Rate limiting được tích hợp trên các route nhạy cảm (Login, Register, Forgot Password, Reset Password, Refresh Token, Upload file) sử dụng in-memory/IP-based bucket logic.
- Trả về mã lỗi HTTP `429 Too Many Requests` khi quá hạn ngạch request.

## 3. Storage & File Upload Security
- Kiểm tra magic bytes / file signature phía server để ngăn chặn việc giả mạo định dạng.
- Giới hạn kích thước tối đa 5MB cho mỗi file và chỉ chấp nhận định dạng ảnh hợp lệ (`image/jpeg`, `image/png`, `image/gif`, `image/webp`).
- Tên file được sinh ngẫu nhiên qua UUID. Không sử dụng tên file do client cung cấp để chống path traversal.

## 4. Input Validation & Sanitization
- Toàn bộ tham số đầu vào qua API được validate chặt chẽ bằng thư viện `Zod`.
- Không lưu trữ hoặc render HTML trực tiếp mà không có sanitization thích hợp để chống Stored XSS.