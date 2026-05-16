# 🛒 MTRUONG-STORE — Nền tảng Thương mại điện tử Full-Stack

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma" />
  <img src="https://img.shields.io/badge/MySQL-8-orange?style=for-the-badge&logo=mysql" />
  <img src="https://img.shields.io/badge/Status-Active-green?style=for-the-badge" />
</div>

---

## ✨ Giới thiệu

**MTRUONG-STORE** là một nền tảng thương mại điện tử hoàn chỉnh được xây dựng bằng **Next.js 14 (App Router)**, hỗ trợ hệ thống đa vai trò: **Khách hàng**, **Người bán** và **Quản trị viên**.

## 🚀 Tính năng nổi bật

### 🛍️ Dành cho Khách hàng
- Duyệt sản phẩm theo danh mục, tìm kiếm & lọc
- Giỏ hàng, đặt hàng và theo dõi đơn hàng
- Quản lý hồ sơ: Ảnh đại diện, SĐT, Giới tính, Ngày sinh
- Quản lý địa chỉ giao hàng & thông tin ngân hàng
- Kho Voucher cá nhân

### 🏪 Dành cho Người bán (Seller Center)
- Đăng ký trở thành người bán chỉ 1 click
- Dashboard thống kê: Doanh thu, Đơn hàng, Đánh giá
- Quản lý sản phẩm: Thêm, sửa, xóa sản phẩm
- Quản lý đơn hàng của gian hàng
- Tạo chương trình khuyến mãi (Voucher)
- Hồ sơ shop tùy chỉnh

### ⚙️ Dành cho Quản trị viên (Admin Panel)
- Dashboard thống kê toàn hệ thống (dữ liệu thực từ DB)
- Quản lý người dùng & Phân quyền (RBAC): Admin, Editor, Sale, Warehouse
- Quản lý sản phẩm toàn sàn (kiểm duyệt, gỡ bỏ)
- Quản lý kho hàng với cảnh báo hàng sắp hết
- Quản lý đơn hàng: Đổi trạng thái toàn bộ vòng đời đơn
- Marketing: Phát hành mã Voucher toàn sàn
- Báo cáo doanh thu & Phân tích dữ liệu
- Cấu hình hệ thống: Cổng thanh toán, Bảo mật, Sao lưu

---

## 🛠️ Công nghệ sử dụng

| Layer | Công nghệ |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), React, TypeScript |
| **Styling** | Vanilla CSS (Glassmorphism, Dark Mode) |
| **Backend** | Next.js API Routes (REST API) |
| **Database** | MySQL + Prisma ORM |
| **Auth** | JWT (jose) + bcryptjs |
| **State** | Zustand |

---

## ⚡ Cài đặt & Chạy dự án

### 1. Clone repository
```bash
git clone https://github.com/YOUR_USERNAME/mtruong-store.git
cd mtruong-store
```

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Cấu hình biến môi trường
```bash
cp .env.example .env
```
Mở file `.env` và điền thông tin database MySQL của bạn.

### 4. Đồng bộ database
```bash
npx prisma db push
npx prisma db seed
```

### 5. Khởi động server
```bash
npm run dev
```

Truy cập: `http://localhost:3000`

---

## 🗂️ Cấu trúc thư mục

```
src/
├── app/
│   ├── (admin)/admin/       # Khu vực quản trị Admin
│   ├── (seller)/seller/     # Kênh người bán
│   ├── (shop)/              # Trang mua sắm
│   └── api/                 # REST API endpoints
├── components/
│   ├── admin/               # Components cho Admin
│   ├── seller/              # Components cho Seller
│   ├── profile/             # Components hồ sơ
│   └── ui/                  # Components dùng chung
├── lib/                     # Utilities (auth, db, validations)
├── store/                   # Zustand state management
└── styles/                  # Global CSS
```

---

## 👤 Tài khoản mặc định (sau khi seed)

| Vai trò | Email | Mật khẩu |
|---------|-------|-----------|
| Admin | admin@mtruong.store | admin123 |
| User | user@mtruong.store | user123 |

---

## 📄 License

MIT License © 2026 MTRUONG-STORE