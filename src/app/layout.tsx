import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ToastContainer from '@/components/ui/Toast'
import Analytics from '@/components/common/Analytics'

const inter = Inter({ subsets: ['latin', 'vietnamese'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://website-banhang-mzzl.onrender.com'),
  title: {
    default: 'MTRUONG-STORE - Sàn Thương Mại Điện Tử Đa Nhà Bán Cao Cấp',
    template: '%s | MTRUONG-STORE',
  },
  description: 'Khám phá hàng ngàn sản phẩm chính hãng 100% thuộc các ngành hàng Công nghệ, Thời trang, Gia dụng từ các nhà bán hàng uy tín trên MTRUONG-STORE.',
  keywords: ['MTRUONG-STORE', 'mua sắm trực tuyến', 'thương mại điện tử', 'hàng chính hãng', 'freeship', 'PayOS', 'VietQR'],
  openGraph: {
    title: 'MTRUONG-STORE - Sàn TMĐT Đa Nhà Bán Cao Cấp',
    description: 'Mua sắm an toàn, giao hàng hỏa tốc, thanh toán VietQR tự động qua PayOS.',
    url: 'https://website-banhang-mzzl.onrender.com',
    siteName: 'MTRUONG-STORE',
    locale: 'vi_VN',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        {children}
        <ToastContainer />
        <Analytics />
      </body>
    </html>
  )
}