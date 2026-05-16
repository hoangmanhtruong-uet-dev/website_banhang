import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Tạo tên file độc nhất
    const fileName = `${Date.now()}-${file.name.replace(/\s/g, '-')}`;
    const path = join(process.cwd(), 'public/uploads', fileName);

    await writeFile(path, buffer);
    const url = `/uploads/${fileName}`;

    console.log(`[UPLOAD] File saved at ${path}`);

    return NextResponse.json({ url });
  } catch (error) {
    console.error('[UPLOAD ERROR]', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
