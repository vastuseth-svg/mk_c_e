import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { products, categories, productImages } from '@/drizzle/schema';
import { eq, inArray, and, desc, asc } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('per_page') || '24', 10);
    const sort = searchParams.get('sort') || 'newest';

    const categoryResult = await db.select().from(categories).where(and(eq(categories.slug, slug), eq(categories.active, true))).limit(1);
    const category = categoryResult[0];

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const catTreeResult = await db.execute(sql`
      WITH RECURSIVE cat_tree AS (
        SELECT id FROM categories WHERE slug = ${slug} AND active = TRUE
        UNION ALL
        SELECT c.id FROM categories c
        JOIN cat_tree ct ON ct.id = c.parent_id
        WHERE c.active = TRUE
      )
      SELECT id FROM cat_tree
    `);
    
    const categoryIds = catTreeResult.rows?.map((row: any) => row.id) || catTreeResult.map((row: any) => row.id);

    if (categoryIds.length === 0) {
      return NextResponse.json({
        category: category,
        total: 0,
        page,
        per_page: perPage,
        products: []
      });
    }

    const offset = (page - 1) * perPage;
    let orderByClause;
    switch (sort) {
      case 'price_asc':
        orderByClause = asc(products.basePrice);
        break;
      case 'price_desc':
        orderByClause = desc(products.basePrice);
        break;
      case 'bestsellers':
      case 'newest':
      default:
        orderByClause = desc(products.createdAt);
        break;
    }

    const [productsResult, countResult] = await Promise.all([
      db.select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        basePrice: products.basePrice,
        salePrice: products.salePrice,
        gstRate: products.gstRate,
        primaryImage: productImages.url
      })
      .from(products)
      .leftJoin(productImages, and(eq(products.id, productImages.productId), eq(productImages.isPrimary, true)))
      .where(and(inArray(products.categoryId, categoryIds), eq(products.status, 'active')))
      .orderBy(orderByClause)
      .limit(perPage).offset(offset),
      
      db.select({ count: sql<number>`count(*)` }).from(products).where(
        and(inArray(products.categoryId, categoryIds), eq(products.status, 'active'))
      )
    ]);

    const total = Number(countResult[0].count);

    return NextResponse.json({
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
      },
      total,
      page,
      per_page: perPage,
      products: productsResult.map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        base_price: p.basePrice,
        sale_price: p.salePrice,
        gst_rate: p.gstRate,
        primary_image: p.primaryImage,
        on_sale: !!p.salePrice && Number(p.salePrice) < Number(p.basePrice)
      }))
    });
  } catch (error) {
    console.error('Error fetching category products:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
