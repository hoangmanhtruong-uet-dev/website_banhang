# 🚀 MASTER PLAN GO-LIVE PRODUCTION: MTRUONG-STORE

> **Tài liệu Kế hoạch Triển khai Thực tế & Chuyển giao Vận hành**
>
> **Phiên bản:** 2.0 (Production-Ready)
>
> **Nền tảng:** Thương mại điện tử Đa nhà bán (Multi-Vendor Marketplace)
>
> **Tech Stack cốt lõi:** Next.js 14 App Router, Prisma ORM, MySQL (Aiven), Outbox Pattern Workers, Double-entry Ledger.

## 📌 1. TỔNG QUAN & MỤC TIÊU GO-LIVE (EXECUTIVE SUMMARY)

### 1.1. Hiện trạng nền tảng

* **Core:** Next.js 14 App Router phân vùng 4 luồng độc lập: `/(routes)` người dùng, `/(shop)` cửa hàng, `/(seller)` kênh người bán, `/(admin)` quản trị sàn.

* **Cơ sở dữ liệu:** \~40 Models trên MySQL (Aiven) quản lý qua Prisma ORM, phân rã rạch ròi giữa Dữ liệu Vận hành, Tài chính và Kho vận.

* **Xử lý bất đồng bộ:** Outbox Pattern (`OutboxEvent`) kết hợp cơ chế kiểm soát tiến trình `WorkerHeartbeat`.

* **Bảo mật & Toàn vẹn tài chính:** Double-entry Ledger (`WalletLedger`), Idempotency chống double charge, RBAC 6 roles, 2FA TOTP (`speakeasy`), Payment PIN hash độc lập.

* **Dữ liệu sẵn có:** 2.000 sản phẩm thật đã import từ CSV, gắn đầy đủ specs kỹ thuật dạng JSON và phân bổ cho 5 Seller mẫu.

### 1.2. Mục tiêu Go-Live

1. Đưa các module thanh toán, giao vận, email và thông báo từ dạng mock/nội bộ sang môi trường kết nối đối tác thực tế.

2. Thiết lập hạ tầng Production chịu tải tối thiểu **300 - 500 CCU** đồng thời trong các đợt flash sale/khóa hàng, loại trừ triệt để tình trạng race condition âm kho.

3. Tích hợp trọn vẹn bộ công cụ đo lường chuyển đổi (GA4, Meta Pixel, TikTok Pixel) và SEO phục vụ chiến dịch Marketing mở bán.

4. Đáp ứng 100% yêu cầu pháp lý cho sàn TMĐT theo quy định của Bộ Công Thương Việt Nam.

## 🗺️ 2. LỘ TRÌNH 4 TUẦN GO-LIVE (4-WEEK ROADMAP)

```
                            TIẾN ĐỘ THỰC HIỆN 4 TUẦN
┌───────────────────────────┬───────────────────────────┬───────────────────────────┬───────────────────────────┐
│          TUẦN 1           │          TUẦN 2           │          TUẦN 3           │          TUẦN 4           │
│   Hoàn thiện dịch vụ      │  Hạ tầng Production,      │  Kiểm thử chịu tải,       │  Pháp lý TMĐT,            │
│   thực tế (Payment,       │  Tracking (GA4/Pixel) &   │  Stress Test k6 &         │  D-Day Launch &           │
│   Shipping, Email)        │  Tối ưu Pooler/Worker     │  Dọn dẹp Data Test        │  Bàn giao Vận hành        │
└───────────────────────────┴───────────────────────────┴───────────────────────────┴───────────────────────────┘

```

### GIAI ĐOẠN 1 (TUẦN 1): HOÀN THIỆN CÁC MẮT XÍCH DỊCH VỤ THỰC TẾ

#### 1. Cổng thanh toán Thực tế (Payment Gateway & Webhook)

* **Lựa chọn giải pháp:**

  * **PayOS (VietQR Pro) / SePay (Ưu tiên số 1):** Tự động tạo mã VietQR động theo chuẩn Napas 247, khớp lệnh chuyển khoản ngân hàng trong 1-3 giây, đối soát tự động không mất phí duy trì cổng, hỗ trợ cả tài khoản cá nhân lẫn pháp nhân.

  * **VNPay / MoMo API:** Tích hợp phương thức thanh toán thẻ nội địa/quốc tế khi có giấy phép kinh doanh.

* **Xử lý kỹ thuật Webhook & Idempotency:**

  * Xây dựng endpoint nhận Webhook: `/api/payments/webhook`.

  * Xác thực chữ ký số payload bằng thuật toán băm bảo mật (**HMAC SHA256 / SHA512**) chống giả mạo request.

  * Ghi nhận `paymentTransactionId` vào bảng `IdempotencyRecord`. Nếu bên thanh toán retry webhook nhiều lần, hệ thống chặn xử lý trùng lặp.

  * Cập nhật trạng thái `Order` -> `PAID`, tự động ghi nhận biến động số dư bất biến vào bảng `WalletLedger`, và đẩy sự kiện vào `OutboxEvent`.

#### 2. Dịch vụ Vận chuyển & Chuẩn hóa Địa chỉ (Logistics & Shipping)

* **Chuẩn hóa danh mục địa chỉ hành chính Việt Nam:**

  * Thay thế các ô nhập tự do bằng Dropdown 3 cấp ràng buộc: **Tỉnh/Thành phố ➔ Quận/Huyện ➔ Phường/Xã**.

* **Tính phí vận chuyển động:**

  * Tích hợp API **Giao Hàng Nhanh (GHN Express)** hoặc **Giao Hàng Tiết Kiệm (GHTK)** để tính phí ship theo trọng lượng/thể tích thực tế và khoảng cách từ kho của `SellerProfile` đến địa chỉ khách hàng.

  * Tự động sinh vận đơn và mã tracking khi Shop xác nhận đơn.

  * Duy trì luồng Shipper nội bộ (`/(shipper)/orders`, `DeliveryAttempt`, `CodCollection`, chụp ảnh Proof of Delivery) làm kênh vận chuyển hỏa tốc nội đô.

#### 3. Dịch vụ Transactional Email & Notifications

* Đấu nối Worker xử lý Outbox với dịch vụ **Resend** (hoặc AWS SES):

  * Email kích hoạt tài khoản / Xác minh OTP / 2FA.

  * Email xác nhận đơn hàng kèm hóa đơn điện tử chi tiết (Invoice).

  * Email thông báo kết quả duyệt/từ chối hồ sơ Seller KYC.

  * Email cảnh báo bảo mật khi có yêu cầu Rút tiền (`PayoutRequest`) hoặc đổi Payment PIN.

### GIAI ĐOẠN 2 (TUẦN 2): HẠ TẦNG PRODUCTION, TRACKING MARKETING & TỐI ƯU HÓA

#### 1. Kiến trúc Triển khai (Deployment Topology)

```
                            MÔ HÌNH HẠ TẦNG GO-LIVE
                           
    [ Khách hàng ]             [ Quản trị / Seller ]
           │                               │
           ▼                               ▼
    ┌────────────────────────────────────────────────────────┐
    │              Vercel Edge Network (Next.js 14)          │
    │         - Web Pages & Server Actions                   │
    │         - Public APIs & Webhook Handlers               │
    └───────────────┬────────────────────────┬───────────────┘
                    │                        │
       (Prisma Accelerate / Read)       (Write / Mutations)
                    │                        │
                    ▼                        ▼
    ┌───────────────────────────┐    ┌───────────────────────┐
    │     Upstash Redis         │    │  Aiven MySQL (Prod)   │
    │  - Session / Cache        │    │  - 40 Models          │
    │  - Rate Limit Buckets     │    │  - Double-Entry Ledger│
    └───────────────────────────┘    └───────────▲───────────┘
                                                 │
                                         (Poll OutboxEvent)
                                                 │
                                     ┌───────────┴───────────┐
                                     │  Docker Worker Host   │
                                     │  (VPS / Railway)      │
                                     │  - Outbox Processor   │
                                     │  - Release 15m Locks  │
                                     └───────────────────────┘

```

* **Frontend & Web API:** Triển khai trên **Vercel Pro** (tận dụng Global Edge Network, CDN tối ưu ảnh tự động).

* **Database:** **Aiven MySQL** (Gói Production tối thiểu 2 vCPU, 4GB RAM). Kích hoạt tự động Daily Snapshot Backup.

* **Background Worker & Cron Jobs:**

  * Đóng gói Worker thành 1 Docker Container riêng biệt chạy trên VPS (DigitalOcean / Hetzner / Vietnix) hoặc Railway/Render để chạy liên tục 24/7, quét bảng `OutboxEvent` và nhả hàng hết hạn 15 phút.

  * Nếu dùng Serverless: Kích hoạt Route Handler `/api/cron/worker` qua **Upstash QStash** hoặc Vercel Cron.

#### 2. Tối ưu Connection Pooling cho MySQL

* **Xử lý bài toán Connection trên Serverless:**

  * Do MySQL không dùng PgBouncer (vốn là công cụ dành riêng cho PostgreSQL), hệ thống sẽ sử dụng một trong hai giải pháp tối ưu cho MySQL:

    * **Giải pháp 1 (Khuyên dùng):** Kích hoạt **Prisma Accelerate** để có sẵn Connection Pooling toàn cầu tối ưu riêng cho Serverless và Next.js App Router.

    * **Giải pháp 2:** Cài đặt **ProxySQL** làm Connection Pooler trung gian đứng trước cụm MySQL Aiven và cấu hình `connection_limit=5` trên chuỗi kết nối Prisma Client.

* **Database Indexing:** Đánh B-Tree Index cho các cột thường xuyên query:

  * `Order`: `[status, userId, createdAt]`

  * `InventoryReservation`: `[expiresAt, status]`

  * `OutboxEvent`: `[status, createdAt]`

  * `Product`: `[sellerId, status, categoryId]`

  * `IdempotencyRecord`: `[idempotencyKey]`

#### 3. Caching & Chống Brute-Force (Upstash Redis)

* Triển khai **Upstash Redis**:

  * Chuyển logic `RateLimitBucket` từ MySQL sang Redis In-Memory nhằm loại bỏ hoàn toàn tải I/O lên Database khi bị tấn công spam request hoặc brute-force mật khẩu.

  * Cache danh mục sản phẩm (`Category`), cấu hình sàn (`SiteConfig`), và dữ liệu trang chủ với cơ chế `revalidate` (ISR).

#### 4. Đo lường, Phễu Bán hàng & Tối ưu SEO (Tracking & SEO)

* **Google Analytics 4 (GA4):**

  * Tích hợp qua `@next/third-parties/google` hoặc Google Tag Manager (GTM).

  * Đo lường chi tiết toàn bộ phễu E-commerce: `view_item_list` ➔ `view_item` ➔ `add_to_cart` ➔ `begin_checkout` ➔ `purchase`.

* **Meta Pixel (Facebook Pixel) & TikTok Pixel:**

  * Cài đặt Pixel ID theo dõi sự kiện chuyển đổi mua hàng (`Purchase Event`) để sẵn sàng chạy quảng cáo tối ưu hóa chuyển đổi ngay khi ra mắt.

  * Cấu hình chống trùng lặp sự kiện (Event Deduplication) nếu có triển khai Conversions API.

* **Tối ưu SEO On-Page cho 2.000 sản phẩm:**

  * Sinh tự động `sitemap.xml` và `robots.txt` chứa đường dẫn toàn bộ 2.000 sản phẩm và ngành hàng.

  * Cấu hình Schema Markup JSON-LD (`Product`, `BreadcrumbList`, `Organization`) để hiển thị Rich Snippets (giá, xếp hạng sao, trạng thái tồn kho) trên Google Search.

  * Tự động sinh Open Graph và Twitter Card tags cho từng sản phẩm phục vụ chia sẻ link mạng xã hội.

#### 5. Giám sát & Báo lỗi (Observability)

* Tích hợp **Sentry** (Next.js SDK) theo dõi Exception và crash ở cả Client lẫn Server.

* Cấu hình **UptimeRobot** hoặc **BetterStack** ping endpoint `/api/health` mỗi 60 giây, cảnh báo trực tiếp về Telegram/Discord.

* Kích hoạt ghi log vào bảng `DomainAuditLog` cho toàn bộ hành động nhạy cảm của Admin.

### GIAI ĐOẠN 3 (TUẦN 3): STRESS TESTING, DATA CLEANSING & BẢO TOÀN DỮ LIỆU

#### 1. Kiểm thử Chịu tải (Stress Test / Load Test bằng k6)

* **Kịch bản 1: Giữ hàng đồng thời (Race Condition & Inventory Reservation):**

  * Giả lập 300 users đồng thời click mua 1 sản phẩm có tồn kho bằng 5.

  * *Tiêu chuẩn Pass:* Đúng 5 bản ghi `InventoryReservation` được tạo, 295 requests còn lại trả về thông báo hết hàng thân thiện. Bảng `InventoryMovement` đối soát chính xác, không âm kho.

* **Kịch bản 2: Spam nút Đặt hàng (Idempotency Test):**

  * Giả lập 50 requests gửi cùng 1 microsecond với cùng một `idempotencyKey`.

  * *Tiêu chuẩn Pass:* Chỉ sinh ra đúng 1 Order ID duy nhất, không trừ tiền ví nhiều lần.

* **Kịch bản 3: Tự động hoàn tồn kho sau 15 phút:**

  * Đặt 10 đơn hàng nhưng không thanh toán.

  * *Tiêu chuẩn Pass:* Đúng sau 15 phút, worker quét bảng `InventoryReservation`, đổi trạng thái sang `EXPIRED`, và cộng lại số lượng vào `Product`.

#### 2. Quy trình Dọn dẹp Dữ liệu Test (Data Cleansing Runbook)

> ⚠️ **LƯU Ý CỰC KỲ QUAN TRỌNG (DO NOT TOUCH):**
>
> * 🔒 **TUYỆT ĐỐI KHÔNG XÓA BẢNG `SiteConfig`:** Bảng này lưu toàn bộ cấu hình sống còn của hệ thống: Tên website, trạng thái cổng thanh toán (bật/tắt VNPAY/PayOS), cấu hình gửi mail SMTP, tỷ lệ hoa hồng mặc định của sàn. Nếu clear nhầm bảng này, toàn bộ server sẽ crash khi khởi động.
>
> * 🔒 **BẢO TOÀN DỮ LIỆU 2.000 SẢN PHẨM THẬT:** Giữ nguyên bảng `Product`, `Category`, `ProductVariant`, ảnh Cloudinary và cấu trúc JSON specs đã import từ CSV.
>
> * 🔒 **GIỮ NGUYÊN:** 5 tài khoản Seller mẫu và 2 tài khoản Super Admin (`developerhoangtruong`, `hoanghungcri0101`).

* **DỮ LIỆU CẦN LÀM SẠCH (PURGE TEST DATA):**

  * Truncate các bảng giao dịch thử nghiệm: `Order`, `OrderItem`, `SellerFulfillment`.

  * Truncate dữ liệu vận chuyển test: `DeliveryAttempt`, `CodCollection`.

  * Xóa dữ liệu tài chính test: `WalletLedger`, `SellerSettlement`, `PayoutRequest`.

  * Đặt lại số dư tất cả các ví (`Wallet`) về `0.00`.

  * Dọn dẹp các bản ghi test trong `OutboxEvent`, `RateLimitBucket`, `DomainAuditLog`.

### GIAI ĐOẠN 4 (TUẦN 4): CHÍNH SÁCH PHÁP LÝ & KỊCH BẢN D-DAY LAUNCH

#### 1. Pháp lý và Vận hành theo quy định TMĐT Việt Nam

* **Soạn thảo và đăng tải các văn bản pháp lý bắt buộc (truy cập công khai ở Footer):**

  * *Điều khoản Dịch vụ (Terms of Service):* Quy định quyền và trách nhiệm của Người mua, Người bán và Sàn MTRUONG-STORE.

  * *Chính sách Bảo mật Thông tin Cá nhân:* Tuân thủ nghiêm ngặt Nghị định 13/2023/NĐ-CP.

  * *Chính sách Kiểm hàng, Đổi trả & Hoàn tiền:* Quy trình shipper nhận lại hàng và thời gian hoàn tiền vào ví/tài khoản.

  * *Quy trình Giải quyết Khiếu nại & Tranh chấp:* Cơ chế phân xử giữa Khách hàng và Seller.

* **Thông tin hiển thị chân trang (Footer):**

  * Tên đơn vị chủ quản, Địa chỉ trụ sở, Số điện thoại hotline, Email hỗ trợ, Mã số doanh nghiệp / Hộ kinh doanh.

* **Thủ tục đăng ký Bộ Công Thương:**

  * Nộp hồ sơ thông báo website TMĐT bán hàng / cung cấp dịch vụ TMĐT tại cổng thông tin `online.gov.vn`.

#### 2. Kịch bản Giờ G (D-Day Launch Runbook)

| 

| **Mốc thời gian** | **Hạng mục thực hiện** | **Phụ trách** | **Trạng thái** | 
| **T - 24 giờ** | **Code Freeze:** Đóng băng toàn bộ nhánh `main`. Không merge bất kỳ tính năng mới nào. Tạo Snapshot Backup toàn bộ Database trên Aiven. | Toàn bộ Team / DevOps | 🔲 | 
| **T - 12 giờ** | **Domain & SSL:** Trỏ bản ghi DNS (CNAME, A record) của domain chính thức về Vercel. Kích hoạt chứng chỉ SSL/TLS (HTTPS). | DevOps | 🔲 | 
| **T - 6 giờ** | **Cấu hình Environment Variables:** Nạp biến môi trường Production (`.env.production`): Secret Keys PayOS/VNPay thật, Resend Production, Cloudinary Prod, GA4 ID, Pixel ID. | Lead Dev | 🔲 | 
| **T - 4 giờ** | **Chạy Script Data Cleansing:** Dọn sạch data test (Đảm bảo an toàn tuyệt đối cho `SiteConfig` và 2.000 sản phẩm). | Database Admin | 🔲 | 
| **T - 3 giờ** | **Khởi động Worker Host:** Deploy Worker lên host riêng, kiểm tra log `WorkerHeartbeat` cập nhật đều đặn mỗi 30s. | Backend Dev | 🔲 | 
| **T - 2 giờ** | **Sanity Check:** Chạy smoke test: Đăng ký tài khoản mới, Đăng nhập 2FA, Search sản phẩm, Upload ảnh KYC lên Cloudinary. | QA / Tester | 🔲 | 
| **T - 1 giờ** | **End-to-End Test với Tiền thật:** Đặt 1 đơn hàng thật trị giá nhỏ qua cổng QR thanh toán ➔ Kiểm tra Webhook cập nhật đơn ➔ Outbox bắn email hóa đơn ➔ Ledger ghi nhận biến động ➔ Hủy đơn và đối soát hoàn tiền. | Lead Dev + QA | 🔲 | 
| **T - 0 (LAUNCH)** | **Mở cổng Public:** Tắt trang bảo trì (Maintenance Mode), mở truy cập toàn cầu. Khởi chạy chiến dịch truyền thông! | Toàn đội ngũ | 🚀 | 
| **T + 1 đến 4 giờ** | **War Room (Trực ban hệ thống):** Giám sát biểu đồ CPU/RAM của Aiven MySQL, tỷ lệ lỗi trên Sentry, hàng đợi `OutboxEvent` và lưu lượng GA4 Realtime. | On-call Team | 🔲 | 

## ⚠️ 3. MA TRẬN RỦI RO & PHƯƠNG ÁN XỬ LÝ (RISK MATRIX)

| **Rủi ro kỹ thuật** | **Mức độ** | **Nguyên nhân tiềm ẩn** | **Giải pháp khắc phục tức thì** | 
| **Cạn kiệt Connection DB (`Too many connections`)** | 🔴 Cao | Prisma mở quá nhiều connection từ Serverless Functions tới MySQL Aiven | Kích hoạt **Prisma Accelerate** (hỗ trợ sẵn Connection Pooling cho Serverless) hoặc cấu hình **ProxySQL** làm pooler trung gian. Giảm `connection_limit=5` trong chuỗi kết nối Prisma. | 
| **Mất cấu hình hệ thống khi Dọn dẹp Data** | 🔴 Cao | Script dọn dẹp chạy lệnh truncate nhầm bảng `SiteConfig` | Đưa bảng `SiteConfig` vào danh sách cấm xóa trong script. Chuẩn bị sẵn file seed `SiteConfig` dự phòng để nạp lại ngay trong 1 giây nếu có sơ suất. | 
| **Cổng thanh toán không gửi Webhook IPN** | 🔴 Cao | Trục trặc mạng đối tác hoặc sai lệch chữ ký HMAC | Xây dựng nút "Kiểm tra thanh toán" tại giao diện đơn hàng để client chủ động gọi API Query Transaction Status sang cổng thanh toán. | 
| **Worker ngừng hoạt động (Chết tiến trình)** | 🟠 Trung bình | Memory leak hoặc unhandled exception làm crash tiến trình worker | Cấu hình Docker `restart: always` hoặc dùng **PM2** tự hồi sinh tiến trình; cài cảnh báo qua Telegram nếu `WorkerHeartbeat` ngưng quá 2 phút. | 
| **Lỗi giao diện bảng biểu trên Mobile** | 🟡 Thấp | Table quản trị Seller/Admin vỡ khung trên màn hình nhỏ | Bật class `overflow-x-auto` cho container của bảng dữ liệu và ẩn bớt các cột thông tin không quan trọng khi xem trên mobile. | 

## ✅ 4. BẢNG CHECKLIST NGHIỆM THU CUỐI CÙNG (GO-LIVE SIGN-OFF)

* \[ \] Toàn bộ 2.000 sản phẩm hiển thị đủ hình ảnh trên Cloudinary, đúng giá bán và cấu trúc specifications.

* \[ \] Bảng `SiteConfig` đã được kiểm tra tính nguyên vẹn và hoạt động bình thường.

* \[ \] Cổng thanh toán quét mã VietQR / PayOS nhận Webhook và xử lý Idempotency chuẩn xác.

* \[ \] Hệ thống Outbox Worker gửi email hóa đơn và tự động nhả kho sau 15 phút hoạt động ổn định.

* \[ \] Google Analytics 4, Meta Pixel và TikTok Pixel đã nhận sự kiện Purchase và phễu E-commerce.

* \[ \] Database MySQL Aiven đã cấu hình Prisma Accelerate / ProxySQL và đánh đủ index.

* \[ \] Toàn bộ chính sách pháp lý (Điều khoản, Bảo mật, Đổi trả) và thông tin doanh nghiệp đã hiển thị ở Footer.

* \[ \] Đã backup Snapshot Database sạch sẽ trước thời khắc mở cổng Public.