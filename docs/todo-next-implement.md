# TODO_NEXT_IMPLEMENT - Kế hoạch hiện thực E2E theo TODO.md

## Step 0: Khởi tạo checklist & xác định hiện trạng
- [ ] Rà soát API route hiện có trong `api/` và file handler thật trong Next (route.ts/route.*)
- [ ] Rà soát UI hiện có trong `src/app/(shop)`, `src/app/(auth)`, `src/app/admin`
- [ ] Rà soát các types (`src/types/*`) và state store (`src/store/*`)

## Step 1: Chuẩn hoá DB + Prisma
- [ ] Implement `src/lib/db.ts` export singleton `prisma`
- [ ] Đảm bảo schema `prisma/schema.prisma` khớp với UI + Order/Product flow

## Step 2: Implement validations
- [ ] Tạo Zod schemas trong `src/lib/validations/index.ts`
- [ ] Chốt contract request/response cho Product/Order/Auth

## Step 3: Implement API
- [ ] `api/products/*`: GET list/detail, admin CRUD
- [ ] `api/orders/*`: tạo order từ checkout, admin list + PATCH status
- [ ] `api/webhook/*`: stub 200 (hoặc triển khai luồng nếu có spec)

## Step 4: Auth + Middleware
- [ ] Implement `src/lib/auth.ts` (JWT + cookie HttpOnly)
- [ ] Implement `src/app/(auth)/login/page.tsx` và `register/page.tsx`
- [ ] Implement `src/middleware.ts` bảo vệ `/admin/:path*`

## Step 5: Shop UI
- [ ] Products list page gọi API
- [ ] Products detail page `/products/[id]`
- [ ] Cart page: render + update qty/remove
- [ ] Checkout page: submit tạo order

## Step 6: Cart/Checkout logic
- [ ] Sửa `src/store/cartStore.ts` cho đúng type
- [ ] Implement `src/hooks/useCart.ts` wrap store
- [ ] Checkout dùng `useCart` + gọi API `/api/orders`

## Step 7: Admin UI
- [ ] Dashboard stats
- [ ] Products CRUD
- [ ] Orders list + cập nhật status

## Step 8: Styling + điều hướng
- [ ] Update `src/app/layout.tsx` navbar/footer cho shop/cart/admin/auth

## Step 9: Test build/run
- [ ] `npm run dev`
- [ ] `npm run build`

