import { PayOS } from '@payos/node';

// Khởi tạo PayOS client (v2 SDK)
const payOS = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID || 'client-id',
  apiKey: process.env.PAYOS_API_KEY || 'api-key',
  checksumKey: process.env.PAYOS_CHECKSUM_KEY || 'checksum-key',
});

export default payOS;

