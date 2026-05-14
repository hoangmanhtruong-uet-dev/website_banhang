# TODO - Phát triển full end-to-end (shop + cart + checkout + admin + auth)

## Step 1: Chuẩn hoá nền tảng DB
- [ ] Cập nhật `src/lib/db.ts` để export `prisma` client.
- [ ] Kiểm tra `prisma/schema.prisma` và chuẩn hoá model nếu cần.

## Step 2: Implement API routes
- [ ] `api/products/*`: GET list, POST create, PUT/PATCH update, DELETE.
- [ ] `api/orders/*`: POST create order, GET list (admin), PATCH update status.
- [ ] `api/webhook/*`: stub/hoặc implement flow webhook theo cấu hình bạn cung cấp.

## Step 3: Implement validations
- [ ] Tạo Zod schemas trong `src/lib/validations/index.ts` cho Product/Order/Auth.

## Step 4: Implement auth + middleware
- [ ] `src/lib/auth.ts`: cấu hình auth (JWT hoặc session theo hướng mình sẽ triển khai).
- [ ] Tạo `src/app/(auth)/login/page.tsx` và `register/page.tsx` (file đang chưa thấy implement).
- [ ] `src/middleware.ts`: bảo vệ `/admin/:path*`.

## Step 5: Shop UI end-to-end
- [ ] `src/app/(shop)/products/page.tsx`: list sản phẩm.
- [ ] Tạo trang chi tiết sản phẩm `/src/app/(shop)/products/[id]/page.tsx`.
- [ ] Tạo trang giỏ hàng `/src/app/(shop)/cart/page.tsx`.
- [ ] Tạo trang checkout `/src/app/(shop)/checkout/page.tsx`.

## Step 6: Cart/Checkout logic
- [ ] `src/store/cartStore.ts`: add/remove/update quantity.
- [ ] `src/hooks/useCart.ts` wrap cartStore.
- [ ] Checkout: call API tạo order và chuyển trạng thái UI.

## Step 7: Admin UI end-to-end
- [ ] `/src/app/admin/dashboard/page.tsx`: summary stats.
- [ ] `/src/app/admin/products/page.tsx`: CRUD.
- [ ] `/src/app/admin/orders/page.tsx`: list đơn + cập nhật status.

## Step 8: Styling + điều hướng
- [ ] Cập nhật `src/app/layout.tsx` thêm navbar/footer.
- [ ] Đồng bộ Tailwind UI components.

## Step 9: Build & run
- [ ] Chạy `npm run dev` và test luồng user.
- [ ] Chạy `npm run build` để đảm bảo compile OK.

