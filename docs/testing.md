# Hướng dẫn chạy Test (Testing Guide)

Dự án bao gồm bộ test cho các chức năng quan trọng: Authentication, Session Management, Reset Password, Order Service, Rate Limiting và File Upload.

## 1. Unit Tests
Kiểm tra các pure functions/business rules độc lập:
- Subtotal calculation
- Voucher discount logic (percentage/fixed discount, max discount, minimum order value)
- Expiry and usage limits of vouchers
- Stock reservation logic
- File validation (size & mime-types)

Chạy unit tests bằng lệnh:
```bash
npm run test:unit
# Hoặc nếu dự án chưa tích hợp sẵn jest:
# npx jest src/__tests__/unit
```

## 2. Integration Tests
Kiểm tra các luồng tích hợp có tương tác với database/môi trường:
- Đăng nhập thành công/thất bại và thiết lập Cookie
- Refresh Token Rotation & Session Revocation khi logout
- Reset password token dùng một lần và hết hạn token
- Đăng ký và ràng buộc dữ liệu đầu vào (Zod validations)
- Rate limiting cho các routes nhạy cảm
- Transaction tạo Order và kiểm soát race condition
- File Upload validation kiểm tra file hỏng hoặc giả mạo extension.

Chạy integration tests bằng lệnh:
```bash
npm run test:integration