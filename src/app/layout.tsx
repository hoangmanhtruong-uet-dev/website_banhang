import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/common/Navbar'
import Footer from '@/components/common/Footer'
import ToastContainer from '@/components/ui/Toast'

const inter = Inter({ subsets: ['latin', 'vietnamese'] })

export const metadata: Metadata = {
  title: 'MTRUONG-STORE - Mua sắm cao cấp',
  description: 'Cửa hàng trực tuyến cao cấp với sản phẩm thời trang, công nghệ, làm đẹp và gia dụng chất lượng hàng đầu.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <Navbar />
        <main style={{ minHeight:'100vh' }}>{children}</main>
        <Footer />
        <ToastContainer />
      </body>
    </html>
  )
}