import { NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;

    // Fetch the product
    const [product] = await db
      .select()
      .from(schema.products)
      .where(
        and(
          eq(schema.products.slug, slug),
          eq(schema.products.status, 'active')
        )
      )
      .limit(1);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Fetch product images, sorted by displayOrder
    const images = await db
      .select()
      .from(schema.productImages)
      .where(eq(schema.productImages.productId, product.id))
      .orderBy(schema.productImages.displayOrder);

    // Fetch product variants
    const variants = await db
      .select()
      .from(schema.productVariants)
      .where(eq(schema.productVariants.productId, product.id));

    // Fetch product category
    let category = null;
    if (product.categoryId) {
      const [cat] = await db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.id, product.categoryId))
        .limit(1);
      if (cat) {
        category = {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
        };
      }
    }

    return NextResponse.json({
      id: product.id,
      name: product.name,
      slug: product.slug,
      category,
      short_description: product.shortDescription,
      full_description: product.fullDescription,
      base_price: product.basePrice,
      sale_price: product.salePrice,
      gst_rate: product.gstRate,
      images: images.map((img: any) => ({
        url: img.url,
        is_primary: img.isPrimary,
        display_order: img.displayOrder,
        variant_id: img.variantId,
      })),
      variants: variants.map((v: any) => {
        const variantImages = images
          .filter((img: any) => img.variantId === v.id)
          .map((img: any) => ({
            url: img.url,
            is_primary: img.isPrimary,
            display_order: img.displayOrder,
          }));

        return {
          id: v.id,
          sku: v.sku,
          size: v.size,
          color: v.color,
          material: v.material,
          price_override: v.priceOverride,
          effective_price: v.priceOverride !== null ? v.priceOverride : (product.salePrice !== null ? product.salePrice : product.basePrice),
          stock: v.stock,
          in_stock: v.stock > 0,
          images: variantImages,
        };
      }),
      meta_title: product.metaTitle,
      meta_description: product.metaDescription,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
