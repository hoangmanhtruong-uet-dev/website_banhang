import prisma from './db';

/**
 * Generates the next sequential User ID based on their role:
 * - Admin: IDAD01, IDAD02, ...
 * - Non-admin (User/Seller/etc): IDU01, IDU02, ...
 */
export async function generateNextUserId(role: string): Promise<string> {
  const prefix = role.toLowerCase() === 'admin' ? 'IDAD' : 'IDU';
  
  // Find all users with this prefix in their ID
  const users = await prisma.user.findMany({
    where: {
      id: {
        startsWith: prefix,
      },
    },
    select: {
      id: true,
    },
  });

  let maxNum = 0;
  
  // Extract number from IDs (e.g. IDU01 -> 1, IDAD12 -> 12)
  const regex = new RegExp(`^${prefix}(\\d+)$`);
  for (const user of users) {
    const match = user.id.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  // Pad with leading zeros to at least 2 digits
  const paddedNum = String(nextNum).padStart(2, '0');
  
  return `${prefix}${paddedNum}`;
}

/**
 * Generates the next sequential Product ID:
 * - PR01, PR02, ...
 */
export async function generateNextProductId(): Promise<string> {
  const prefix = 'PR';
  
  // Find all products with 'PR' prefix in their ID
  const products = await prisma.product.findMany({
    where: {
      id: {
        startsWith: prefix,
      },
    },
    select: {
      id: true,
    },
  });

  let maxNum = 0;
  
  // Extract number from IDs (e.g. PR01 -> 1, PR12 -> 12)
  const regex = new RegExp(`^${prefix}(\\d+)$`);
  for (const prod of products) {
    const match = prod.id.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  const paddedNum = String(nextNum).padStart(2, '0');
  
  return `${prefix}${paddedNum}`;
}
