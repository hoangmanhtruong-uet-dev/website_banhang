import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import prisma from '@/lib/db';
import { AuthService } from '@/lib/services/auth/auth.service';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  console.log('--- BẮT ĐẦU CALLBACK GOOGLE ---');
  console.log('Full URL:', requestUrl.toString());
  
  const code = requestUrl.searchParams.get('code');
  const error_desc = requestUrl.searchParams.get('error_description');
  console.log('Mã Code nhận được:', code ? 'CÓ CODE' : 'KHÔNG CÓ CODE', '| Error:', error_desc);
  
  const next = requestUrl.searchParams.get('next') ?? '/';

  if (code) {
    // 1. Trao đổi Auth Code lấy Session từ Supabase
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error || !data.session) {
      console.error('Lỗi khi exchange code Supabase:', error);
      return NextResponse.redirect(`${requestUrl.origin}/login?error=GoogleAuthFailed`);
    }

    const email = data.session.user.email;
    const name = data.session.user.user_metadata?.name || data.session.user.user_metadata?.full_name || 'Người dùng Google';
    
    if (!email) {
      return NextResponse.redirect(`${requestUrl.origin}/login?error=EmailRequired`);
    }

    try {
      // 2. Kiểm tra xem người dùng đã tồn tại trong DB Prisma chưa
      let user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        // Nếu chưa tồn tại, tạo mới
        // Vì đăng nhập bằng Google nên mật khẩu tạo ngẫu nhiên, không quan trọng (người dùng k dùng pass này)
        const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        const password = await bcrypt.hash(randomPassword, 10);
        const uniqueCode = `US-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        user = await prisma.user.create({
          data: {
            email,
            name,
            password,
            code: uniqueCode,
            role: 'user',
          },
        });
      }

      // 3. Khởi tạo Token cho hệ thống (Sử dụng kiến trúc hiện tại của dự án)
      const sellerProfile = await prisma.sellerProfile.findUnique({ where: { userId: user.id } });
      const isSeller = sellerProfile?.status === 'APPROVED';
      
      const accessToken = await AuthService.signAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        isSeller: !!isSeller,
        name: user.name,
      });

      // Tạo refresh token ngẫu nhiên (chỉ lưu trong cookie)
      const refreshToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // 4. Lưu JWT vào Cookie và chuyển hướng
      await AuthService.setAuthCookiesInStore(accessToken, refreshToken, refreshExpiresAt);

      return NextResponse.redirect(`${requestUrl.origin}${next}`);
    } catch (dbError) {
      console.error('Lỗi Database khi Google Login:', dbError);
      return NextResponse.redirect(`${requestUrl.origin}/login?error=ServerError`);
    }
  }

  console.log('KHÔNG THỂ XỬ LÝ: Chuyển hướng về login vì không có code');
  // Fallback nếu không có code
  return NextResponse.redirect(`${requestUrl.origin}/login`);
}
