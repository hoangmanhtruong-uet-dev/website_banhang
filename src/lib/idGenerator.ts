import prisma from './db';

/**
 * Generates the next sequential User Code based on their role:
 * - Admin: AD001, AD002, ...
 * - Shipper: SH001, SH002, ...
 * - User: US001, US002, ...
 */
export async function generateNextUserId(role: string): Promise<string> {
  const isAdmin = role.toLowerCase() === 'admin';
  const isShipper = role.toLowerCase() === 'shipper';
  const primaryPrefix = isAdmin ? 'AD' : isShipper ? 'SH' : 'US';
  const legacyPrefix = isAdmin ? 'IDAD' : 'IDU';
  
  const users = await prisma.user.findMany({
    select: {
      code: true,
    },
  });

  let maxNum = 0;
  
  for (const user of users) {
    if (user.code) {
      const regex = new RegExp(`^(?:${primaryPrefix}|${legacyPrefix})(\\d+)$`, 'i');
      const match = user.code.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  const nextNum = maxNum + 1;
  const paddedNum = String(nextNum).padStart(3, '0');
  
  return `${primaryPrefix}${paddedNum}`;
}

/**
 * Generates the next sequential Product Code:
 * - PR001, PR002, ...
 */
export async function generateNextProductId(): Promise<string> {
  const prefix = 'PR';
  
  const products = await prisma.product.findMany({
    select: {
      code: true,
    },
  });

  let maxNum = 0;
  
  for (const prod of products) {
    if (prod.code) {
      const regex = new RegExp(`^${prefix}(\\d+)$`, 'i');
      const match = prod.code.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  const nextNum = maxNum + 1;
  const paddedNum = String(nextNum).padStart(3, '0');
  
  return `${prefix}${paddedNum}`;
}

