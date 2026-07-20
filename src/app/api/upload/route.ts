import { NextResponse } from 'next/server';
import { StorageService } from '@/lib/services/storage.service';
import { rateLimit, getRateLimitResponse } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const limiter = await rateLimit(`upload:${ip}`, { windowMs: 60 * 1000, max: 5 });
    if (!limiter.success) {
      return getRateLimitResponse(limiter.reset);
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Không có file nào được tải lên' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File quá lớn (tối đa 5MB)' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Định dạng file không được hỗ trợ' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const isValid = await StorageService.validateFile(buffer, file.type);
    if (!isValid) {
      return NextResponse.json({ error: 'Nội dung file không hợp lệ' }, { status: 400 });
    }

    const key = await StorageService.upload(buffer, file.name, file.type);
    const url = StorageService.getUrl(key);

    return NextResponse.json({ url, key });
  } catch (error) {
    console.error('[UPLOAD ERROR]', error);
    return NextResponse.json({ error: 'Upload thất bại' }, { status: 500 });
  }
}