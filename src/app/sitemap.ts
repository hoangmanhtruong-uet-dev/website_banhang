import { MetadataRoute } from 'next';
import prisma from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Lấy danh sách danh mục
  const categories = await prisma.category.findMany();
  
  // Lấy danh sách sản phẩm public
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: { slug: true, updatedAt: true }
  });

  const categoryRoutes = categories.map((cat) => ({
    url: `${baseUrl}/products?category=${encodeURIComponent(cat.name)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const productRoutes = products.map((product) => ({
    url: `${baseUrl}/products/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }));

  const staticRoutes = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/flash-sale`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    }
  ];

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
