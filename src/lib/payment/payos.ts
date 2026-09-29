import PayOS from '@payos/node';
import { env } from '@/config/env';

// Khởi tạo PayOS client
// Đảm bảo bạn đã điền các biến môi trường này trong file .env
const payOS = new PayOS(
  process.env.PAYOS_CLIENT_ID || 'client-id',
  process.env.PAYOS_API_KEY || 'api-key',
  process.env.PAYOS_CHECKSUM_KEY || 'checksum-key'
);

export default payOS;
