import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

// Cấu hình Cloudinary từ biến môi trường
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Nếu đã cấu hình Cloudinary -> Tải lên Cloudinary
    if (
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ) {
      const base64Data = buffer.toString('base64');
      const fileUri = `data:${file.type || 'image/jpeg'};base64,${base64Data}`;

      const uploadResponse = await cloudinary.uploader.upload(fileUri, {
        folder: 'mtruong-store',
      });

      console.log(`[CLOUDINARY UPLOAD] File uploaded at ${uploadResponse.secure_url}`);
      return NextResponse.json({ url: uploadResponse.secure_url });
    }

    // 2. Nếu chưa cấu hình Cloudinary -> Fallback lưu ổ đĩa local
    const fileName = `${Date.now()}-${file.name.replace(/\s/g, '-')}`;
    const uploadDir = join(process.cwd(), 'public/uploads');
    
    // Tự động tạo thư mục public/uploads nếu chưa có
    await mkdir(uploadDir, { recursive: true });
    
    const path = join(uploadDir, fileName);
    await writeFile(path, buffer);
    const url = `/uploads/${fileName}`;

    console.log(`[LOCAL UPLOAD] File saved at ${path}`);
    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('[UPLOAD ERROR]', error);
    return NextResponse.json(
      { error: 'Upload failed', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

