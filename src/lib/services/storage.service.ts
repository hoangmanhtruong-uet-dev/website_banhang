import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '@/config/env';

export interface StorageAdapter {
  upload(file: Buffer, filename: string, mimeType: string): Promise<string>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}

class LocalStorageAdapter implements StorageAdapter {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), env.UPLOAD_DIR);
  }

  async upload(file: Buffer, filename: string, _mimeType: string): Promise<string> {
    await fs.mkdir(this.uploadDir, { recursive: true });
    const ext = path.extname(filename).toLowerCase();
    // Sanitize extension
    const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) ? ext : '.bin';
    const key = `${crypto.randomUUID()}${safeExt}`;
    const filePath = path.join(this.uploadDir, key);
    
    // Path traversal protection
    if (!filePath.startsWith(this.uploadDir)) {
      throw new Error('Invalid file path');
    }

    await fs.writeFile(filePath, file);
    return key;
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key);
    if (!filePath.startsWith(this.uploadDir)) return;
    
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Failed to delete file: ${key}`, error);
    }
  }

  getUrl(key: string): string {
    return `/uploads/${key}`;
  }
}

class S3StorageAdapter implements StorageAdapter {
  async upload(_file: Buffer, _filename: string, _mimeType: string): Promise<string> {
    // ponytail: Implement S3 upload when needed
    throw new Error('S3 Storage not implemented yet');
  }
  async delete(_key: string): Promise<void> {
    throw new Error('S3 Storage not implemented yet');
  }
  getUrl(_key: string): string {
    throw new Error('S3 Storage not implemented yet');
  }
}

class CloudinaryStorageAdapter implements StorageAdapter {
  constructor() {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary storage requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET');
    }
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  async upload(file: Buffer, _filename: string, _mimeType: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({
        folder: env.CLOUDINARY_FOLDER,
        resource_type: 'image',
        unique_filename: true,
        overwrite: false,
      }, (error, result) => {
        if (error || !result?.public_id) {
          reject(error ?? new Error('Cloudinary upload returned no public id'));
          return;
        }
        resolve(result.public_id);
      });
      stream.end(file);
    });
  }

  async delete(key: string): Promise<void> {
    await cloudinary.uploader.destroy(key, { resource_type: 'image', invalidate: true });
  }

  getUrl(key: string): string {
    return cloudinary.url(key, { secure: true, fetch_format: 'auto', quality: 'auto' });
  }
}

function createStorageAdapter(): StorageAdapter {
  if (env.STORAGE_PROVIDER === 'cloudinary') return new CloudinaryStorageAdapter();
  if (env.STORAGE_PROVIDER === 's3') return new S3StorageAdapter();
  return new LocalStorageAdapter();
}
export class StorageService {
  private static adapter: StorageAdapter = createStorageAdapter();

  static async upload(file: Buffer, filename: string, mimeType: string): Promise<string> {
    return this.adapter.upload(file, filename, mimeType);
  }

  static async delete(key: string): Promise<void> {
    return this.adapter.delete(key);
  }

  static getUrl(key: string): string {
    return this.adapter.getUrl(key);
  }

  static async validateFile(file: Buffer, mimeType: string): Promise<boolean> {
    const signatures: Record<string, string> = {
      'image/jpeg': 'ffd8ff',
      'image/png': '89504e47',
      'image/gif': '47494638',
      'image/webp': '52494646',
    };

    const signature = signatures[mimeType];
    if (!signature) return false;

    const header = file.subarray(0, 8).toString('hex');
    return header.startsWith(signature);
  }
}