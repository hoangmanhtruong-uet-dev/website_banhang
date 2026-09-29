import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCategoryProductImage } from '@/lib/upload/product-image';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const now = new Date();
    
    // Find the currently active flash sale, or the next upcoming one
    let event = await prisma.flashSaleEvent.findFirst({
      where: {
        isActive: true,
        startTime: { lte: now },
        endTime: { gt: now },
      },
      include: {
        items: {
          include: {
            product: true,
          }
        }
      }
    });

    if (!event) {
      // Look for next upcoming event
      event = await prisma.flashSaleEvent.findFirst({
        where: {
          isActive: true,
          startTime: { gt: now },
        },
        orderBy: { startTime: 'asc' },
        include: {
          items: {
            include: {
              product: true,
            }
          }
        }
      });
    }

    if (!event) {
      return NextResponse.json({ active: false });
    }

    // Format products
    const items = event.items.map(item => {
      const product = item.product;
      const originalPrice = Number(product.price);
      const salePrice = originalPrice * (1 - item.discountPercent / 100);
      
      return {
        id: item.id,
        productId: product.id,
        name: product.name,
        slug: product.slug,
        image: product.image || getCategoryProductImage(null),
        originalPrice: originalPrice,
        price: salePrice,
        discountPercent: item.discountPercent,
        stockQuantity: item.stockQuantity,
        soldQuantity: item.soldQuantity,
        inStock: product.inStock && item.stockQuantity > item.soldQuantity,
        category: 'Flash Sale',
        rating: product.rating || 5,
        reviews: product.reviews || 0,
      };
    });

    return NextResponse.json({
      active: true,
      id: event.id,
      name: event.name,
      startTime: event.startTime,
      endTime: event.endTime,
      isUpcoming: event.startTime > now,
      items
    });
    
  } catch (error) {
    console.error('Error fetching flash sale:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
