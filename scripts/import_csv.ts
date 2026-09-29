import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-') + '-' + crypto.randomBytes(4).toString('hex');
}

async function main() {
  console.log('Reading CSV...');
  const csvFilePath = path.join(process.cwd(), 'danh_sach_2000_san_pham.csv');
  const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
  
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  });

  console.log(`Found ${records.length} records. Creating Sellers...`);

  const sellers = [];
  for (let i = 1; i <= 5; i++) {
    const email = `seller${i}@techstore.vn`;
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          code: `SELLER${String(i).padStart(3, '0')}`,
          name: `Tech Seller ${i}`,
          email,
          password: 'password123',
          role: 'sale',
          isSeller: true,
          sellerProfile: {
            create: {
              status: 'APPROVED',
              businessName: `Tech Store ${i} VN`,
              businessAddress: 'Hanoi, VN',
            }
          }
        }
      });
    }
    sellers.push(user);
  }

  console.log('Created 5 sellers. Creating categories...');

  // Extract unique categories from CSV
  const categoryNames = [...new Set(records.map((r: any) => r.category_sub))];
  const categoryMap = new Map<string, string>();
  
  for (const name of categoryNames) {
    let cat = await prisma.category.findFirst({ where: { name: name as string } });
    if (!cat) {
      cat = await prisma.category.create({
        data: {
          name: name as string,
          slug: slugify(name as string),
          approved: true,
        }
      });
    }
    categoryMap.set(name as string, cat.id);
  }

  console.log('Categories ready. Inserting products...');

  let successCount = 0;
  
  // Batch insert products to avoid memory issues and speed up
  for (let i = 0; i < records.length; i++) {
    const row: any = records[i];
    const seller = sellers[i % sellers.length];
    const categoryId = categoryMap.get(row.category_sub);
    
    // Parse attributes for description
    const attrs = row.attributes ? row.attributes.split(';').map((a: string) => a.trim()).join('\n') : '';
    const description = `Sản phẩm chính hãng, bảo hành 12 tháng.\n\nThông số kỹ thuật:\n${attrs}`;

    try {
      const code = `PR-CSV-${row.product_id}`;
      await prisma.product.upsert({
        where: { code },
        update: {
          name: row.product_name,
          price: parseInt(row.price_vnd),
          originalPrice: parseInt(row.price_vnd) * 1.2,
          description,
          image: row.image_url,
          categoryId,
          sellerId: seller.id,
          inStock: true,
          stockQuantity: 100,
        },
        create: {
          code,
          sku: row.product_id,
          slug: slugify(row.product_name),
          name: row.product_name,
          price: parseInt(row.price_vnd),
          originalPrice: parseInt(row.price_vnd) * 1.2,
          currency: 'VND',
          description,
          image: row.image_url,
          categoryId,
          sellerId: seller.id,
          inStock: true,
          stockQuantity: 100,
        }
      });
      successCount++;
      if (successCount % 100 === 0) {
        console.log(`Inserted/Updated ${successCount} products...`);
      }
    } catch (e) {
      console.error(`Error on product ${i} (ID: ${row.product_id}):`, e);
      process.exit(1);
    }
  }

  console.log(`Done! Successfully inserted ${successCount} products.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
